import { and, asc, eq, lte } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { buildOrders, movements, slots, troops, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS, RALLY_SLOT, WALL_SLOT, type BuildingId } from '../rules/buildings.js';
import { catapultDamage, computeLoot, ramDamage, resolveBattle, resolveScouting, type ArmyGroup } from '../rules/battle.js';
import { distance, travelTimeMs } from '../rules/map.js';
import { RESOURCE_KEYS, addRes, res, sumRes, subRes, type Resources } from '../rules/resources.js';
import {
  carryOf,
  emptyUnits,
  slowestSpeed,
  subUnits,
  totalUnits,
  unitDef,
  upkeepOf,
  type TribeId,
  type UnitCounts,
} from '../rules/units.js';
import { getModifiers } from '../modifiers.js';
import {
  addTroopsAt,
  capacityFor,
  catchUp,
  hiddenByCranny,
  parseResources,
  parseUnits,
  refreshPopulation,
  setResources,
  setTroopsAt,
  stockOf,
  troopsAt,
  type VillageState,
} from './state.js';
import { addReport, type BattleReportData, type ReportSide } from './reports.js';

type MovementRow = typeof movements.$inferSelect;

interface VillageInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  userId: number | null;
  username: string;
  tribe: TribeId;
}

function villageInfo(q: Q, villageId: number): VillageInfo | undefined {
  const row = q
    .select({
      id: villages.id,
      name: villages.name,
      x: villages.x,
      y: villages.y,
      userId: villages.userId,
      username: users.username,
      tribe: users.tribe,
    })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.id, villageId))
    .get();
  if (!row) return undefined;
  return { ...row, username: row.username ?? 'Nature', tribe: row.tribe ?? 'legion' };
}

function side(v: VillageInfo, units: UnitCounts, losses: UnitCounts): ReportSide {
  return {
    userId: v.userId,
    username: v.username,
    villageId: v.id,
    villageName: v.name,
    x: v.x,
    y: v.y,
    tribe: v.tribe,
    units,
    losses,
  };
}

/** Send survivors home from (fromX, fromY), carrying loot. */
function scheduleReturn(q: Q, home: VillageInfo, fromX: number, fromY: number, units: UnitCounts, loot: Resources | null, t: number): void {
  if (totalUnits(units) <= 0) return;
  const speed = slowestSpeed(home.tribe, units);
  const dist = distance(fromX, fromY, home.x, home.y, config.MAP_RADIUS);
  const travel = travelTimeMs(dist, speed, config.TROOP_SPEED);
  q.insert(movements)
    .values({
      kind: 'return',
      fromVillageId: home.id,
      toVillageId: home.id,
      originX: fromX,
      originY: fromY,
      toX: home.x,
      toY: home.y,
      units: JSON.stringify(units),
      loot: loot && sumRes(loot) > 0 ? JSON.stringify(loot) : null,
      departAt: t,
      arriveAt: t + travel,
    })
    .run();
}

function upkeepValue(tribe: TribeId, losses: UnitCounts): number {
  return upkeepOf(tribe, losses);
}

function addPoints(q: Q, userId: number | null, field: 'offPoints' | 'defPoints', amount: number): void {
  if (userId === null || amount <= 0) return;
  const u = q.select({ off: users.offPoints, def: users.defPoints }).from(users).where(eq(users.id, userId)).get();
  if (!u) return;
  if (field === 'offPoints') q.update(users).set({ offPoints: u.off + amount }).where(eq(users.id, userId)).run();
  else q.update(users).set({ defPoints: u.def + amount }).where(eq(users.id, userId)).run();
}

function addLootTotal(q: Q, userId: number | null, amount: number): void {
  if (userId === null || amount <= 0) return;
  const u = q.select({ loot: users.lootTotal }).from(users).where(eq(users.id, userId)).get();
  if (u) q.update(users).set({ lootTotal: u.loot + amount }).where(eq(users.id, userId)).run();
}

function scoutCount(tribe: TribeId, units: UnitCounts): number {
  return units.reduce((s, n, i) => s + (unitDef(tribe, i).type === 'scout' ? n : 0), 0);
}

function pickCatapultTarget(state: VillageState, requested: string | null): typeof state.slots[number] | undefined {
  const candidates = state.slots.filter(
    (s) => s.building && s.level > 0 && s.slot > 18 && s.slot !== WALL_SLOT && s.slot !== RALLY_SLOT,
  );
  if (requested) {
    const match = candidates.filter((s) => s.building === requested).sort((a, b) => b.level - a.level)[0];
    if (match) return match;
  }
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function handleCombat(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home) return;
  const attackerUnits = parseUnits(mv.units);

  const targetId = mv.toVillageId;
  const target = targetId !== null ? catchUp(q, targetId, t) : undefined;
  if (!target || targetId === null) {
    // Target no longer exists: troops come straight back.
    scheduleReturn(q, home, mv.toX, mv.toY, attackerUnits, null, t);
    return;
  }
  const targetInfo = villageInfo(q, targetId);
  if (!targetInfo) return;

  // Every army inside the village defends it.
  const stationed = q.select().from(troops).where(eq(troops.villageId, targetId)).all();
  const defenders = stationed.map((row) => {
    const owner = villageInfo(q, row.ownerVillageId);
    return { row, owner, group: { tribe: owner?.tribe ?? 'legion', units: parseUnits(row.units) } satisfies ArmyGroup };
  });

  const attackerMods = getModifiers(q, home.userId, t);
  const defenderMods = getModifiers(q, target.userId, t);
  const wallSlot = target.slots.find((s) => s.slot === WALL_SLOT);
  const wallLevel = wallSlot?.level ?? 0;

  // --- Scouting ---
  if (mv.kind === 'scout') {
    const defScouts = defenders.reduce((s, d) => s + scoutCount(d.group.tribe, d.group.units), 0);
    const atkScouts = scoutCount(home.tribe, attackerUnits);
    const outcome = resolveScouting(atkScouts, defScouts);
    const losses = emptyUnits();
    // Scout losses are spread over the scout slots.
    let remaining = outcome.scoutLosses;
    attackerUnits.forEach((n, i) => {
      if (remaining <= 0 || n <= 0 || unitDef(home.tribe, i).type !== 'scout') return;
      const l = Math.min(n, remaining);
      losses[i] = l;
      remaining -= l;
    });
    const survivors = subUnits(attackerUnits, losses);
    const data: BattleReportData = {
      type: 'battle',
      mode: 'scout',
      attacker: side(home, attackerUnits, losses),
      defenders: [],
      attackerWon: outcome.success,
      defendersHidden: !outcome.success,
      loot: res(),
      capacity: 0,
      attackPower: 0,
      defensePower: 0,
      scout: outcome.success
        ? {
            success: true,
            resources: stockOf(target.village),
            troops: defenders.map((d) => ({ tribe: d.group.tribe, units: d.group.units })),
            wallLevel,
            crannyHides: hiddenByCranny(target, home.tribe),
          }
        : { success: false },
    };
    addReport(q, home.userId, 'scout', `${home.name} scouts ${targetInfo.name}`, data, t);
    if (defScouts > 0) {
      const defData: BattleReportData = { ...data, scout: { success: outcome.success } };
      addReport(q, targetInfo.userId, outcome.success ? 'defense_lost' : 'defense_won', `${targetInfo.name} was scouted by ${home.name}`, defData, t);
    }
    scheduleReturn(q, home, targetInfo.x, targetInfo.y, survivors, null, t);
    return;
  }

  // --- Battle ---
  const mode = mv.kind === 'raid' ? 'raid' : 'attack';
  const result = resolveBattle({
    mode,
    attacker: { tribe: home.tribe, units: attackerUnits },
    defenders: defenders.map((d) => d.group),
    defenderTribe: target.userId !== null ? target.tribe : null,
    wallLevel,
    attackMultiplier: attackerMods.attack,
    defenseMultiplier: defenderMods.defense,
  });

  const survivors = subUnits(attackerUnits, result.attackerLosses);

  // Apply defender losses.
  defenders.forEach((d, idx) => {
    const losses = result.defenderLosses[idx] ?? emptyUnits();
    const left = subUnits(d.group.units, losses);
    setTroopsAt(q, d.row.villageId, d.row.ownerVillageId, left);
  });

  // Siege damage (full attacks only, and only if the attacker won).
  let wallChange: BattleReportData['wall'];
  let buildingChange: BattleReportData['building'];
  if (mode === 'attack' && result.attackerWon) {
    const rams = survivors.reduce((s, n, i) => s + (unitDef(home.tribe, i).type === 'ram' ? n : 0), 0);
    const wallDown = ramDamage(rams, wallLevel);
    if (wallSlot && rams > 0) {
      wallChange = { from: wallLevel, to: wallLevel - wallDown };
      if (wallDown > 0) {
        q.update(slots).set({ level: wallLevel - wallDown }).where(and(eq(slots.villageId, targetId), eq(slots.slot, WALL_SLOT))).run();
      }
    }
    const catas = survivors.reduce((s, n, i) => s + (unitDef(home.tribe, i).type === 'catapult' ? n : 0), 0);
    if (catas > 0) {
      const hit = pickCatapultTarget(target, mv.catapultTarget);
      if (hit?.building) {
        const down = catapultDamage(catas, hit.level);
        const to = hit.level - down;
        const def = BUILDINGS[hit.building as BuildingId];
        buildingChange = { name: def?.name ?? hit.building, from: hit.level, to };
        if (down > 0) {
          const keepType = hit.building === 'main' || to > 0;
          q.update(slots)
            .set({ level: to, building: keepType ? hit.building : null })
            .where(and(eq(slots.villageId, targetId), eq(slots.slot, hit.slot)))
            .run();
          // Any construction on a destroyed building is cancelled.
          if (!keepType) q.delete(buildOrders).where(and(eq(buildOrders.villageId, targetId), eq(buildOrders.slot, hit.slot))).run();
          refreshPopulation(q, targetId);
        }
      }
    }
  }

  // Loot.
  let loot = res();
  const capacity = carryOf(home.tribe, survivors, attackerMods.troopCarry);
  const canLoot = totalUnits(survivors) > 0 && (mode === 'raid' || result.attackerWon);
  if (canLoot && capacity > 0) {
    const fresh = loadStock(q, targetId);
    loot = computeLoot(fresh, hiddenByCranny(target, home.tribe), capacity);
    setResources(q, targetId, subRes(fresh, loot));
  }

  // Points: attacker earns the upkeep value of what they killed, defenders likewise.
  const defenderLossValue = defenders.reduce(
    (s, d, idx) => s + upkeepValue(d.group.tribe, result.defenderLosses[idx] ?? emptyUnits()),
    0,
  );
  addPoints(q, home.userId, 'offPoints', defenderLossValue);
  addLootTotal(q, home.userId, Math.floor(sumRes(loot)));
  const attackerLossValue = upkeepValue(home.tribe, result.attackerLosses);
  // Split defensive points by each defender's share of the troops.
  const defUnitTotal = defenders.reduce((s, d) => s + totalUnits(d.group.units), 0);
  for (const d of defenders) {
    const share = defUnitTotal > 0 ? totalUnits(d.group.units) / defUnitTotal : 0;
    addPoints(q, d.owner?.userId ?? null, 'defPoints', Math.round(attackerLossValue * share));
  }
  if (defenders.length === 0 || defUnitTotal === 0) addPoints(q, targetInfo.userId, 'defPoints', attackerLossValue);

  const attackerSide = side(home, attackerUnits, result.attackerLosses);
  const defenderSides = defenders.map((d, idx) =>
    side(d.owner ?? targetInfo, d.group.units, result.defenderLosses[idx] ?? emptyUnits()),
  );
  const allAttackersDead = totalUnits(survivors) === 0;
  const data: BattleReportData = {
    type: 'battle',
    mode,
    attacker: attackerSide,
    defenders: defenderSides,
    attackerWon: result.attackerWon,
    defendersHidden: false,
    loot,
    capacity,
    attackPower: result.attackPower,
    defensePower: result.defensePower,
    wall: wallChange,
    building: buildingChange,
  };
  const verb = mode === 'raid' ? 'raids' : 'attacks';
  const title = `${home.name} ${verb} ${targetInfo.name}`;
  addReport(
    q,
    home.userId,
    result.attackerWon ? 'attack_won' : 'attack_lost',
    title,
    allAttackersDead ? { ...data, defendersHidden: true } : data,
    t,
  );
  addReport(q, targetInfo.userId, result.attackerWon ? 'defense_lost' : 'defense_won', title, data, t);
  // Reinforcement owners get the report too.
  const notified = new Set<number | null>([home.userId, targetInfo.userId]);
  for (const d of defenders) {
    const uid = d.owner?.userId ?? null;
    if (notified.has(uid)) continue;
    notified.add(uid);
    addReport(q, uid, result.attackerWon ? 'defense_lost' : 'defense_won', title, data, t);
  }

  scheduleReturn(q, home, targetInfo.x, targetInfo.y, survivors, loot, t);
}

function loadStock(q: Q, villageId: number): Resources {
  const v = q.select().from(villages).where(eq(villages.id, villageId)).get();
  return v ? stockOf(v) : res();
}

function handleReinforce(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home) return;
  const units = parseUnits(mv.units);
  const target = mv.toVillageId !== null ? villageInfo(q, mv.toVillageId) : undefined;
  if (!target) {
    scheduleReturn(q, home, mv.toX, mv.toY, units, null, t);
    return;
  }
  catchUp(q, target.id, t);
  addTroopsAt(q, target.id, home.id, units);
  const data = {
    type: 'reinforce' as const,
    from: { userId: home.userId, username: home.username, villageId: home.id, villageName: home.name, x: home.x, y: home.y, tribe: home.tribe, units },
    to: { userId: target.userId, username: target.username, villageId: target.id, villageName: target.name, x: target.x, y: target.y },
    units,
  };
  const title = `${home.name} reinforces ${target.name}`;
  addReport(q, home.userId, 'reinforce', title, data, t);
  if (target.userId !== home.userId) addReport(q, target.userId, 'reinforce', title, data, t);
}

function handleReturn(q: Q, mv: MovementRow, t: number): void {
  const state = catchUp(q, mv.fromVillageId, t);
  if (!state) return;
  addTroopsAt(q, mv.fromVillageId, mv.fromVillageId, parseUnits(mv.units));
  const loot = parseResources(mv.loot);
  if (sumRes(loot) > 0) {
    // Loot fills storage; anything over capacity is lost.
    const cap = capacityFor(state);
    const stock = stockOf(state.village);
    const next = addRes(stock, loot);
    for (const k of RESOURCE_KEYS) next[k] = Math.max(stock[k], Math.min(next[k], cap[k]));
    setResources(q, mv.fromVillageId, next);
  }
}

function handleBuildDone(q: Q, order: typeof buildOrders.$inferSelect): void {
  catchUp(q, order.villageId, order.finishAt);
  q.update(slots)
    .set({ building: order.building, level: order.toLevel })
    .where(and(eq(slots.villageId, order.villageId), eq(slots.slot, order.slot)))
    .run();
  q.delete(buildOrders).where(eq(buildOrders.id, order.id)).run();
  refreshPopulation(q, order.villageId);
}

function handleMovement(q: Q, mv: MovementRow): void {
  const t = mv.arriveAt;
  // Remove first: the troops are no longer travelling once they arrive.
  q.delete(movements).where(eq(movements.id, mv.id)).run();
  switch (mv.kind) {
    case 'attack':
    case 'raid':
    case 'scout':
      handleCombat(q, mv, t);
      break;
    case 'reinforce':
      handleReinforce(q, mv, t);
      break;
    case 'return':
      handleReturn(q, mv, t);
      break;
  }
}

/**
 * Process every build completion and troop arrival due by `now`, strictly in time order,
 * one transaction per event. Returns the number of events processed.
 */
export function processDue(db: DB, now: number, limit = 1000): number {
  let processed = 0;
  while (processed < limit) {
    const nextBuild = db
      .select()
      .from(buildOrders)
      .where(lte(buildOrders.finishAt, now))
      .orderBy(asc(buildOrders.finishAt), asc(buildOrders.id))
      .limit(1)
      .get();
    const nextMove = db
      .select()
      .from(movements)
      .where(lte(movements.arriveAt, now))
      .orderBy(asc(movements.arriveAt), asc(movements.id))
      .limit(1)
      .get();
    if (!nextBuild && !nextMove) break;
    if (nextBuild && (!nextMove || nextBuild.finishAt <= nextMove.arriveAt)) {
      db.transaction((tx) => handleBuildDone(tx, nextBuild));
    } else if (nextMove) {
      db.transaction((tx) => handleMovement(tx, nextMove));
    }
    processed++;
  }
  return processed;
}

/** Withdraw your troops from another village, or send reinforcements home. */
export function sendTroopsHome(q: Q, locationId: number, ownerVillageId: number, now: number): boolean {
  if (locationId === ownerVillageId) return false;
  const units = troopsAt(q, locationId, ownerVillageId);
  if (totalUnits(units) === 0) return false;
  const loc = villageInfo(q, locationId);
  const home = villageInfo(q, ownerVillageId);
  if (!loc || !home) return false;
  catchUp(q, locationId, now);
  setTroopsAt(q, locationId, ownerVillageId, emptyUnits());
  scheduleReturn(q, home, loc.x, loc.y, units, null, now);
  return true;
}

