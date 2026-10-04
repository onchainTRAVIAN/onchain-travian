import { and, asc, eq, lte, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { buildOrders, celebrations, heroes, movements, researchOrders, slots, tiles, troops, users, villages } from '../../db/schema.js';
import { finishCelebration } from '../actions/celebration.js';
import { config } from '../../config.js';
import { BUILDINGS, RALLY_SLOT, WALL_SLOT, type BuildingId } from '../rules/buildings.js';
import { catapultDamage, computeLoot, ramDamage, resolveBattle, resolveScouting, type ArmyGroup } from '../rules/battle.js';
import { distance, travelTimeMs } from '../rules/map.js';
import { OASIS_RANGE, oasisSlots } from '../rules/expansion.js';
import { RESOURCE_KEYS, addRes, res, sumRes, subRes, type Resources } from '../rules/resources.js';
import { addUnits, carryOf, emptyUnits, subUnits, totalUnits, unitDef, upkeepOf, TRIBES, type TribeId, type UnitCounts } from '../rules/units.js';
import { trapCapacity } from '../rules/production.js';
import { getModifiers } from '../modifiers.js';
import {
  addTroopsAt,
  capacityFor,
  catchUp,
  hiddenByCranny,
  levelOf,
  loadVillage,
  parseLevels,
  parseResources,
  parseUnits,
  refreshPopulation,
  setResources,
  setTroopsAt,
  stockOf,
  type VillageState,
} from './state.js';
import { addReport, type BattleReportData, type ReportSide } from './reports.js';
import { scheduleReturn, sendTroopsHome, villageInfo, type VillageInfo } from './movement.js';
import { canExpand, conquerVillage } from './expansion.js';
import { createVillage } from './world.js';
import {
  damageHero,
  heroAtHome,
  heroDefMultiplier,
  heroOf,
  heroOffMultiplier,
  heroStrength,
  heroesStationedIn,
  processHeroRevivals,
  type HeroRow,
} from './hero.js';
import { oasesOwnedBy, oasisAnimals, setOasisAnimals, tileAt } from './oasis.js';

type MovementRow = typeof movements.$inferSelect;

function side(v: VillageInfo, units: UnitCounts, losses: UnitCounts): ReportSide {
  return { userId: v.userId, username: v.username, villageId: v.id, villageName: v.name, x: v.x, y: v.y, tribe: v.tribe, units, losses };
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

function countType(tribe: TribeId, units: UnitCounts, type: string): number {
  return units.reduce((s, n, i) => s + (unitDef(tribe, i).type === type ? n : 0), 0);
}

function pickCatapultTarget(state: VillageState, requested: string | null): VillageState['slots'][number] | undefined {
  const candidates = state.slots.filter((s) => s.building && s.level > 0 && s.slot > 18 && s.slot !== WALL_SLOT && s.slot !== RALLY_SLOT);
  if (requested) {
    const match = candidates.filter((s) => s.building === requested).sort((a, b) => b.level - a.level)[0];
    if (match) return match;
  }
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function attackingHero(q: Q, home: VillageInfo, mv: MovementRow): HeroRow | undefined {
  if (!mv.hero) return undefined;
  const h = heroOf(q, home.userId);
  return h && h.status === 'moving' ? h : undefined;
}

/** Remove one unit of a given type from survivors (e.g. the chief who takes over a village). */
function consumeOne(tribe: TribeId, units: UnitCounts, type: string): UnitCounts {
  const out = [...units];
  const idx = out.findIndex((n, i) => n > 0 && unitDef(tribe, i).type === type);
  if (idx >= 0) out[idx] = (out[idx] ?? 0) - 1;
  return out;
}

function playerPop(q: Q, userId: number | null): number {
  if (userId === null) return 0;
  return q.select({ n: sql<number>`coalesce(sum(${villages.pop}), 0)` }).from(villages).where(eq(villages.userId, userId)).get()?.n ?? 0;
}

/** Teutons' Brewery (in the capital): +1% attack per level for all their troops. */
function breweryBonus(q: Q, home: VillageInfo): number {
  if (home.tribe !== 'teutons' || home.userId === null) return 1;
  const level =
    q.select({ l: sql<number>`coalesce(max(${slots.level}), 0)` })
      .from(slots)
      .innerJoin(villages, eq(villages.id, slots.villageId))
      .where(and(eq(villages.userId, home.userId), eq(slots.building, 'brewery')))
      .get()?.l ?? 0;
  return 1 + 0.01 * level;
}

function readPrisoners(v: { prisoners: string }): Record<string, UnitCounts> {
  try {
    const p: unknown = JSON.parse(v.prisoners);
    if (p && typeof p === 'object') {
      const out: Record<string, UnitCounts> = {};
      for (const [k, val] of Object.entries(p as Record<string, unknown>)) out[k] = parseUnits(JSON.stringify(val));
      return out;
    }
  } catch {
    // ignore
  }
  return {};
}

/** Put attackers into free Gaul traps (proportionally across unit types). */
function trapAttackers(q: Q, target: VillageState, home: VillageInfo, units: UnitCounts): UnitCounts {
  const caught = emptyUnits();
  if (target.tribe !== 'gauls' || target.userId === null) return caught;
  let capacity = 0;
  for (const s of target.slots) if (s.building === 'trapper') capacity += trapCapacity(s.level);
  if (capacity <= 0) return caught;
  const prisoners = readPrisoners(target.village);
  const held = Object.values(prisoners).reduce((sum, c) => sum + totalUnits(c), 0);
  let free = capacity - held;
  const total = totalUnits(units);
  if (free <= 0 || total <= 0) return caught;
  const share = Math.min(1, free / total);
  units.forEach((n, i) => {
    const t = Math.min(n, Math.floor(n * share), free);
    caught[i] = t;
    free -= t;
  });
  const key = String(home.id);
  prisoners[key] = addUnits(prisoners[key] ?? emptyUnits(), caught);
  q.update(villages).set({ prisoners: JSON.stringify(prisoners) }).where(eq(villages.id, target.village.id)).run();
  return caught;
}

function releasePrisoners(q: Q, villageId: number, ownerVillageId: number): UnitCounts {
  const v = q.select().from(villages).where(eq(villages.id, villageId)).get();
  if (!v) return emptyUnits();
  const prisoners = readPrisoners(v);
  const mine = prisoners[String(ownerVillageId)];
  if (!mine) return emptyUnits();
  delete prisoners[String(ownerVillageId)];
  q.update(villages).set({ prisoners: JSON.stringify(prisoners) }).where(eq(villages.id, villageId)).run();
  return mine;
}

/* ------------------------------------------------------------------ */
/* Villages                                                            */
/* ------------------------------------------------------------------ */

function handleCombat(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home) return;
  const attackerUnits = parseUnits(mv.units);
  const aHero = attackingHero(q, home, mv);

  const tile = tileAt(q, mv.toX, mv.toY);
  if (tile?.kind === 'oasis') {
    handleOasisCombat(q, mv, home, attackerUnits, aHero, t);
    return;
  }

  const targetId = mv.toVillageId;
  const target = targetId !== null ? catchUp(q, targetId, t) : undefined;
  const targetInfo = targetId !== null ? villageInfo(q, targetId) : undefined;
  if (!target || targetId === null || !targetInfo) {
    scheduleReturn(q, home, mv.toX, mv.toY, attackerUnits, null, t, !!aHero);
    return;
  }

  // Every army inside the village defends it, plus heroes at home or stationed there.
  const stationed = q.select().from(troops).where(eq(troops.villageId, targetId)).all();
  const defenders = stationed.map((row) => {
    const owner = villageInfo(q, row.ownerVillageId);
    const group: ArmyGroup = { tribe: owner?.tribe ?? 'romans', units: parseUnits(row.units), upgrades: owner?.defenseUpgrades };
    return { row, owner, group };
  });
  const ownerHero = heroAtHome(q, target.userId, targetId, t);
  const defHeroes = [...(ownerHero ? [ownerHero] : []), ...heroesStationedIn(q, targetId)];

  const attackerMods = getModifiers(q, home.userId, t);
  const defenderMods = getModifiers(q, target.userId, t);
  const wallSlot = target.slots.find((s) => s.slot === WALL_SLOT);
  const wallLevel = wallSlot?.level ?? 0;

  // --- Scouting ---
  if (mv.kind === 'scout') {
    const defScouts = defenders.reduce((s, d) => s + countType(d.group.tribe, d.group.units, 'scout'), 0);
    const outcome = resolveScouting(countType(home.tribe, attackerUnits, 'scout'), defScouts);
    const losses = emptyUnits();
    let remaining = outcome.scoutLosses;
    attackerUnits.forEach((n, i) => {
      if (remaining <= 0 || n <= 0 || unitDef(home.tribe, i).type !== 'scout') return;
      const l = Math.min(n, remaining);
      losses[i] = l;
      remaining -= l;
    });
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
      addReport(q, targetInfo.userId, outcome.success ? 'defense_lost' : 'defense_won', `${targetInfo.name} was scouted by ${home.name}`, { ...data, scout: { success: outcome.success } }, t);
    }
    scheduleReturn(q, home, targetInfo.x, targetInfo.y, subUnits(attackerUnits, losses), null, t);
    return;
  }

  // --- Battle ---
  const mode = mv.kind === 'raid' ? 'raid' : 'attack';
  const notes: string[] = [];

  // Gaul traps catch attackers before the fight.
  const trapped = trapAttackers(q, target, home, attackerUnits);
  const fighting = subUnits(attackerUnits, trapped);
  if (totalUnits(trapped) > 0) notes.push(`${totalUnits(trapped)} attacking soldiers were caught in traps.`);

  const heroGroups: ArmyGroup[] = defHeroes.map((h) => ({ tribe: 'romans', units: emptyUnits(), heroStrength: heroStrength(h) }));
  const result = resolveBattle({
    mode,
    attacker: { tribe: home.tribe, units: fighting, upgrades: home.attackUpgrades, heroStrength: aHero ? heroStrength(aHero) : 0 },
    defenders: [...defenders.map((d) => d.group), ...heroGroups],
    defenderTribe: target.userId !== null ? target.tribe : null,
    wallLevel,
    attackMultiplier: attackerMods.attack * heroOffMultiplier(aHero) * breweryBonus(q, home),
    defenseMultiplier: defenderMods.defense * heroDefMultiplier(ownerHero),
    residenceLevel: Math.max(levelOf(target, 'residence'), levelOf(target, 'palace')),
    attackerPop: playerPop(q, home.userId),
    defenderPop: playerPop(q, target.userId),
  });

  let survivors = subUnits(fighting, result.attackerLosses);
  // A victorious attack frees this village's soldiers held in the enemy's traps.
  if (result.attackerWon && mode === 'attack') {
    const freed = releasePrisoners(q, targetId, home.id);
    if (totalUnits(freed) > 0) {
      survivors = addUnits(survivors, freed);
      notes.push(`${totalUnits(freed)} of your trapped soldiers were freed.`);
    }
  }
  defenders.forEach((d, idx) => {
    setTroopsAt(q, d.row.villageId, d.row.ownerVillageId, subUnits(d.group.units, result.defenderLosses[idx] ?? emptyUnits()));
  });

  const defenderLossValue = defenders.reduce((s, d, idx) => s + upkeepOf(d.group.tribe, result.defenderLosses[idx] ?? emptyUnits()), 0);
  const attackerLossValue = upkeepOf(home.tribe, result.attackerLosses);

  // Heroes take damage in proportion to their side's losses and learn from the fight.
  const heroReports: NonNullable<BattleReportData['heroes']> = [];
  let attackerHeroAlive = false;
  if (aHero) {
    const after = damageHero(q, aHero, result.attackerLossRatio, defenderLossValue, t);
    attackerHeroAlive = after.status !== 'dead';
    heroReports.push({ name: after.name, side: 'attacker', health: Math.round(after.health), died: !attackerHeroAlive, xp: defenderLossValue });
  }
  for (const h of defHeroes) {
    const after = damageHero(q, h, result.defenderLossRatio, attackerLossValue, t);
    heroReports.push({ name: after.name, side: 'defender', health: Math.round(after.health), died: after.status === 'dead', xp: attackerLossValue });
  }

  let wallChange: BattleReportData['wall'];
  let buildingChange: BattleReportData['building'];
  let loyaltyChange: BattleReportData['loyalty'];
  let conquered = false;

  if (mode === 'attack' && result.attackerWon) {
    const rams = countType(home.tribe, survivors, 'ram');
    const wallDown = ramDamage(rams, wallLevel);
    if (wallSlot && rams > 0) {
      wallChange = { from: wallLevel, to: wallLevel - wallDown };
      if (wallDown > 0) q.update(slots).set({ level: wallLevel - wallDown }).where(and(eq(slots.villageId, targetId), eq(slots.slot, WALL_SLOT))).run();
    }
    const catas = countType(home.tribe, survivors, 'catapult');
    if (catas > 0) {
      const hit = pickCatapultTarget(target, mv.catapultTarget);
      if (hit?.building) {
        const durability = targetInfo.isCapital ? 1 + 0.1 * levelOf(target, 'stonemason') : 1;
        const down = catapultDamage(catas, hit.level, durability);
        const to = hit.level - down;
        buildingChange = { name: BUILDINGS[hit.building as BuildingId]?.name ?? hit.building, from: hit.level, to };
        if (down > 0) {
          const keepType = hit.building === 'main' || to > 0;
          q.update(slots).set({ level: to, building: keepType ? hit.building : null }).where(and(eq(slots.villageId, targetId), eq(slots.slot, hit.slot))).run();
          if (!keepType) q.delete(buildOrders).where(and(eq(buildOrders.villageId, targetId), eq(buildOrders.slot, hit.slot))).run();
          refreshPopulation(q, targetId);
        }
      }
    }

    // Chiefs lower loyalty; at zero the village changes hands.
    const chiefs = countType(home.tribe, survivors, 'chief');
    if (chiefs > 0 && target.userId !== null && home.userId !== null) {
      const fresh = loadVillage(q, targetId);
      const protectedBy = fresh && (levelOf(fresh, 'residence') > 0 || levelOf(fresh, 'palace') > 0);
      if (targetInfo.isCapital) notes.push('A capital cannot be conquered.');
      else if (protectedBy) notes.push('The Residence/Palace must be destroyed before loyalty can be lowered.');
      else {
        const [lo, hi] = TRIBES[home.tribe].chiefPower;
        let drop = 0;
        for (let i = 0; i < chiefs; i++) drop += lo + Math.floor(Math.random() * (hi - lo + 1));
        const from = target.village.loyalty;
        const to = Math.max(0, from - drop);
        loyaltyChange = { from: Math.round(from), to: Math.round(to) };
        q.update(villages).set({ loyalty: to }).where(eq(villages.id, targetId)).run();
        if (to <= 0) {
          const check = canExpand(q, home.userId, home.id, t);
          if (check.ok) {
            conquerVillage(q, targetId, home.userId, home.id, t);
            survivors = consumeOne(home.tribe, survivors, 'chief');
            conquered = true;
            notes.push(`${targetInfo.name} now belongs to ${home.username}!`);
          } else {
            notes.push(`Loyalty is gone, but the village could not be taken: ${check.reason ?? ''}`);
          }
        }
      }
    }
  }

  let loot = res();
  const capacity = carryOf(home.tribe, survivors, attackerMods.troopCarry);
  if (!conquered && totalUnits(survivors) > 0 && (mode === 'raid' || result.attackerWon) && capacity > 0) {
    const v = q.select().from(villages).where(eq(villages.id, targetId)).get();
    const fresh = v ? stockOf(v) : res();
    loot = computeLoot(fresh, hiddenByCranny(target, home.tribe), capacity);
    setResources(q, targetId, subRes(fresh, loot));
  }

  addPoints(q, home.userId, 'offPoints', defenderLossValue);
  addLootTotal(q, home.userId, Math.floor(sumRes(loot)));
  const defUnitTotal = defenders.reduce((s, d) => s + totalUnits(d.group.units), 0);
  for (const d of defenders) {
    const share = defUnitTotal > 0 ? totalUnits(d.group.units) / defUnitTotal : 0;
    addPoints(q, d.owner?.userId ?? null, 'defPoints', Math.round(attackerLossValue * share));
  }
  if (defUnitTotal === 0) addPoints(q, targetInfo.userId, 'defPoints', attackerLossValue);

  const data: BattleReportData = {
    type: 'battle',
    mode,
    attacker: side(home, attackerUnits, addUnits(result.attackerLosses, trapped)),
    defenders: defenders.map((d, idx) => side(d.owner ?? targetInfo, d.group.units, result.defenderLosses[idx] ?? emptyUnits())),
    attackerWon: result.attackerWon,
    defendersHidden: false,
    loot,
    capacity,
    attackPower: result.attackPower,
    defensePower: result.defensePower,
    wall: wallChange,
    building: buildingChange,
    heroes: heroReports.length ? heroReports : undefined,
    loyalty: loyaltyChange,
    conquered,
    notes: notes.length ? notes : undefined,
  };
  const title = `${home.name} ${mode === 'raid' ? 'raids' : 'attacks'} ${targetInfo.name}`;
  const allDead = totalUnits(survivors) === 0 && !attackerHeroAlive;
  addReport(q, home.userId, result.attackerWon ? 'attack_won' : 'attack_lost', title, allDead ? { ...data, defendersHidden: true } : data, t);
  addReport(q, targetInfo.userId, result.attackerWon ? 'defense_lost' : 'defense_won', title, data, t);
  const notified = new Set<number | null>([home.userId, targetInfo.userId]);
  for (const d of defenders) {
    const uid = d.owner?.userId ?? null;
    if (notified.has(uid)) continue;
    notified.add(uid);
    addReport(q, uid, result.attackerWon ? 'defense_lost' : 'defense_won', title, data, t);
  }

  scheduleReturn(q, home, targetInfo.x, targetInfo.y, survivors, loot, t, attackerHeroAlive);
}

/* ------------------------------------------------------------------ */
/* Oases                                                               */
/* ------------------------------------------------------------------ */

function handleOasisCombat(q: Q, mv: MovementRow, home: VillageInfo, attackerUnits: UnitCounts, aHero: HeroRow | undefined, t: number): void {
  const tile = tileAt(q, mv.toX, mv.toY);
  if (!tile) return;
  const animals = oasisAnimals(q, tile, t);
  const natureSide: ReportSide = {
    userId: null, username: 'Nature', villageId: 0, villageName: `Oasis (${tile.x}|${tile.y})`, x: tile.x, y: tile.y, tribe: 'nature', units: animals, losses: emptyUnits(),
  };

  if (mv.kind === 'scout') {
    const data: BattleReportData = {
      type: 'battle', mode: 'scout', attacker: side(home, attackerUnits, emptyUnits()), defenders: [], attackerWon: true, defendersHidden: false,
      loot: res(), capacity: 0, attackPower: 0, defensePower: 0,
      scout: { success: true, troops: [{ tribe: 'nature', units: animals }] },
      oasis: { x: tile.x, y: tile.y, captured: false },
    };
    addReport(q, home.userId, 'scout', `${home.name} scouts an oasis (${tile.x}|${tile.y})`, data, t);
    scheduleReturn(q, home, tile.x, tile.y, attackerUnits, null, t);
    return;
  }

  const mode = mv.kind === 'raid' ? 'raid' : 'attack';
  const attackerMods = getModifiers(q, home.userId, t);
  const result = resolveBattle({
    mode,
    attacker: { tribe: home.tribe, units: attackerUnits, upgrades: home.attackUpgrades, heroStrength: aHero ? heroStrength(aHero) : 0 },
    defenders: [{ tribe: 'nature', units: animals }],
    defenderTribe: null,
    wallLevel: 0,
    attackMultiplier: attackerMods.attack * heroOffMultiplier(aHero),
  });
  const animalLosses = result.defenderLosses[0] ?? emptyUnits();
  const animalsLeft = subUnits(animals, animalLosses);
  setOasisAnimals(q, tile.x, tile.y, animalsLeft, t);
  const survivors = subUnits(attackerUnits, result.attackerLosses);
  const killedValue = upkeepOf('nature', animalLosses);
  addPoints(q, home.userId, 'offPoints', killedValue);

  const heroReports: NonNullable<BattleReportData['heroes']> = [];
  let heroAlive = false;
  if (aHero) {
    // Hunting animals is how heroes gain most of their experience.
    const after = damageHero(q, aHero, result.attackerLossRatio, killedValue * 2, t);
    heroAlive = after.status !== 'dead';
    heroReports.push({ name: after.name, side: 'attacker', health: Math.round(after.health), died: !heroAlive, xp: killedValue * 2 });
  }

  const notes: string[] = [];
  let captured = false;
  if (mode === 'attack' && result.attackerWon && totalUnits(animalsLeft) === 0) {
    if (!heroAlive) notes.push('Send your hero with the attack to capture this oasis.');
    else {
      const homeState = loadVillage(q, home.id);
      const slotsFree = homeState ? oasisSlots(levelOf(homeState, 'heromansion')) - oasesOwnedBy(q, home.id).length : 0;
      const R = config.MAP_RADIUS;
      const size = R * 2 + 1;
      const dx = Math.min(Math.abs(tile.x - home.x), size - Math.abs(tile.x - home.x));
      const dy = Math.min(Math.abs(tile.y - home.y), size - Math.abs(tile.y - home.y));
      if (tile.villageId === home.id) notes.push('This oasis is already yours.');
      else if (dx > OASIS_RANGE || dy > OASIS_RANGE) notes.push(`Oases must be within ${OASIS_RANGE} fields of the village.`);
      else if (slotsFree <= 0) notes.push("Upgrade your Hero's Mansion (level 10/15/20) to hold more oases.");
      else {
        const previous = tile.villageId;
        q.update(tiles).set({ villageId: home.id }).where(and(eq(tiles.x, tile.x), eq(tiles.y, tile.y))).run();
        captured = true;
        notes.push('The oasis is now yours! Its bonus applies to your village.');
        if (previous !== null) {
          const prev = villageInfo(q, previous);
          if (prev) addReport(q, prev.userId, 'defense_lost', `Oasis (${tile.x}|${tile.y}) was taken by ${home.username}`, {
            type: 'settle', success: false, x: tile.x, y: tile.y, reason: `${home.username} captured your oasis.`,
          }, t);
        }
      }
    }
  }

  const data: BattleReportData = {
    type: 'battle', mode, attacker: side(home, attackerUnits, result.attackerLosses), defenders: [{ ...natureSide, losses: animalLosses }],
    attackerWon: result.attackerWon, defendersHidden: false, loot: res(), capacity: 0,
    attackPower: result.attackPower, defensePower: result.defensePower,
    heroes: heroReports.length ? heroReports : undefined,
    oasis: { x: tile.x, y: tile.y, captured },
    notes: notes.length ? notes : undefined,
  };
  addReport(q, home.userId, result.attackerWon ? 'attack_won' : 'attack_lost', `${home.name} ${mode === 'raid' ? 'raids' : 'attacks'} an oasis (${tile.x}|${tile.y})`, data, t);
  scheduleReturn(q, home, tile.x, tile.y, survivors, null, t, heroAlive);
}

/* ------------------------------------------------------------------ */
/* Other missions                                                      */
/* ------------------------------------------------------------------ */

function handleReinforce(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home) return;
  const units = parseUnits(mv.units);
  const target = mv.toVillageId !== null ? villageInfo(q, mv.toVillageId) : undefined;
  const hero = mv.hero ? heroOf(q, home.userId) : undefined;
  if (!target) {
    scheduleReturn(q, home, mv.toX, mv.toY, units, null, t, !!hero);
    return;
  }
  catchUp(q, target.id, t);
  if (totalUnits(units) > 0) addTroopsAt(q, target.id, home.id, units);
  if (hero) {
    // Reinforcing your own village moves the hero's home there.
    if (target.userId === home.userId) q.update(heroes).set({ status: 'home', locationId: target.id, homeVillageId: target.id }).where(eq(heroes.id, hero.id)).run();
    else q.update(heroes).set({ status: 'away', locationId: target.id }).where(eq(heroes.id, hero.id)).run();
  }
  const data = {
    type: 'reinforce' as const,
    from: { userId: home.userId, username: home.username, villageId: home.id, villageName: home.name, x: home.x, y: home.y, tribe: home.tribe, units },
    to: { userId: target.userId, username: target.username, villageId: target.id, villageName: target.name, x: target.x, y: target.y },
    units,
  };
  const title = `${home.name} reinforces ${target.name}${hero ? ' (with hero)' : ''}`;
  addReport(q, home.userId, 'reinforce', title, data, t);
  if (target.userId !== home.userId) addReport(q, target.userId, 'reinforce', title, data, t);
}

function handleReturn(q: Q, mv: MovementRow, t: number): void {
  const state = catchUp(q, mv.fromVillageId, t);
  if (!state) return;
  addTroopsAt(q, mv.fromVillageId, mv.fromVillageId, parseUnits(mv.units));
  if (mv.hero && state.userId !== null) {
    q.update(heroes).set({ status: 'home', locationId: mv.fromVillageId }).where(and(eq(heroes.userId, state.userId), eq(heroes.status, 'moving'))).run();
  }
  depositGoods(q, state, parseResources(mv.loot));
}

/** Add goods to a village; anything over storage capacity is lost. */
function depositGoods(q: Q, state: VillageState, goods: Resources): void {
  if (sumRes(goods) <= 0) return;
  const cap = capacityFor(state);
  const stock = stockOf(state.village);
  const next = addRes(stock, goods);
  for (const k of RESOURCE_KEYS) next[k] = Math.max(stock[k], Math.min(next[k], cap[k]));
  setResources(q, state.village.id, next);
}

function handleSettle(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home || home.userId === null) return;
  const units = parseUnits(mv.units);
  const tile = tileAt(q, mv.toX, mv.toY);
  let reason: string | undefined;
  if (!tile || tile.kind !== 'field' || tile.villageId !== null) reason = 'Someone else settled there first.';
  else {
    const check = canExpand(q, home.userId, home.id, t, mv.id);
    if (!check.ok) reason = check.reason;
  }
  if (reason || !tile) {
    addReport(q, home.userId, 'settle', `Settlers could not found a village at (${mv.toX}|${mv.toY})`, { type: 'settle', success: false, x: mv.toX, y: mv.toY, reason }, t);
    scheduleReturn(q, home, mv.toX, mv.toY, units, null, t);
    return;
  }
  const user = q.select({ username: users.username }).from(users).where(eq(users.id, home.userId)).get();
  const count = q.select({ id: villages.id }).from(villages).where(eq(villages.userId, home.userId)).all().length;
  const name = `${user?.username ?? 'New'}'s village ${count + 1}`;
  const newId = createVillage(q, { userId: home.userId, name, x: tile.x, y: tile.y, isCapital: false, now: t });
  // A fresh village starts with what the settlers carried, not the usual starting stock.
  q.update(villages).set({ wood: 800, clay: 800, iron: 800, crop: 800, parentId: home.id }).where(eq(villages.id, newId)).run();
  const e = q.select({ e: villages.expansions }).from(villages).where(eq(villages.id, home.id)).get();
  q.update(villages).set({ expansions: (e?.e ?? 0) + 1 }).where(eq(villages.id, home.id)).run();
  addReport(q, home.userId, 'settle', `New village founded at (${tile.x}|${tile.y})`, { type: 'settle', success: true, x: tile.x, y: tile.y, villageName: name }, t);
}

function handleTrade(q: Q, mv: MovementRow, t: number): void {
  const home = villageInfo(q, mv.fromVillageId);
  if (!home) return;
  const goods = parseResources(mv.loot);
  const target = mv.toVillageId !== null ? catchUp(q, mv.toVillageId, t) : undefined;
  const targetInfo = mv.toVillageId !== null ? villageInfo(q, mv.toVillageId) : undefined;
  if (target && targetInfo) {
    depositGoods(q, target, goods);
    const data = { type: 'trade' as const, fromName: home.name, fromX: home.x, fromY: home.y, toName: targetInfo.name, toX: targetInfo.x, toY: targetInfo.y, goods };
    const title = `${home.name} delivered resources to ${targetInfo.name}`;
    addReport(q, home.userId, 'trade', title, data, t);
    if (targetInfo.userId !== home.userId) addReport(q, targetInfo.userId, 'trade', title, data, t);
  }
  // Merchants walk home empty.
  const dist = distance(mv.toX, mv.toY, home.x, home.y, config.MAP_RADIUS);
  const travel = travelTimeMs(dist, TRIBES[home.tribe].merchantSpeed, config.TROOP_SPEED);
  q.insert(movements)
    .values({
      kind: 'merchant_return', fromVillageId: home.id, toVillageId: home.id, originX: mv.toX, originY: mv.toY, toX: home.x, toY: home.y,
      units: JSON.stringify(emptyUnits()), merchants: mv.merchants, departAt: t, arriveAt: t + travel,
    })
    .run();
}

function handleMovement(q: Q, mv: MovementRow): void {
  const t = mv.arriveAt;
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
    case 'delivery':
      handleReturn(q, mv, t);
      break;
    case 'settle':
      handleSettle(q, mv, t);
      break;
    case 'trade':
      handleTrade(q, mv, t);
      break;
    case 'merchant_return':
      break;
  }
}

function handleBuildDone(q: Q, order: typeof buildOrders.$inferSelect): void {
  catchUp(q, order.villageId, order.finishAt);
  q.update(slots).set({ building: order.building, level: order.toLevel }).where(and(eq(slots.villageId, order.villageId), eq(slots.slot, order.slot))).run();
  q.delete(buildOrders).where(eq(buildOrders.id, order.id)).run();
  refreshPopulation(q, order.villageId);
}

function handleResearchDone(q: Q, order: typeof researchOrders.$inferSelect): void {
  const v = q.select().from(villages).where(eq(villages.id, order.villageId)).get();
  q.delete(researchOrders).where(eq(researchOrders.id, order.id)).run();
  if (!v) return;
  if (order.kind === 'academy') {
    const r = parseLevels(v.research);
    r[order.unitSlot] = 1;
    q.update(villages).set({ research: JSON.stringify(r) }).where(eq(villages.id, v.id)).run();
  } else {
    const kind = order.kind;
    const s = parseLevels(v[kind]);
    s[order.unitSlot] = Math.max(s[order.unitSlot] ?? 0, order.toLevel);
    q.update(villages).set({ [kind]: JSON.stringify(s) }).where(eq(villages.id, v.id)).run();
  }
}

/**
 * Process every construction, research and troop arrival due by `now`, strictly in time order,
 * one transaction per event. Returns the number of events processed.
 */
export function processDue(db: DB, now: number, limit = 1000): number {
  let processed = 0;
  db.transaction((tx) => processHeroRevivals(tx, now));
  while (processed < limit) {
    const nextBuild = db.select().from(buildOrders).where(lte(buildOrders.finishAt, now)).orderBy(asc(buildOrders.finishAt), asc(buildOrders.id)).limit(1).get();
    const nextMove = db.select().from(movements).where(lte(movements.arriveAt, now)).orderBy(asc(movements.arriveAt), asc(movements.id)).limit(1).get();
    const nextResearch = db.select().from(researchOrders).where(lte(researchOrders.finishAt, now)).orderBy(asc(researchOrders.finishAt), asc(researchOrders.id)).limit(1).get();
    const nextParty = db.select().from(celebrations).where(lte(celebrations.finishAt, now)).orderBy(asc(celebrations.finishAt)).limit(1).get();
    const candidates: { at: number; run: () => void }[] = [];
    if (nextBuild) candidates.push({ at: nextBuild.finishAt, run: () => db.transaction((tx) => handleBuildDone(tx, nextBuild)) });
    if (nextMove) candidates.push({ at: nextMove.arriveAt, run: () => db.transaction((tx) => handleMovement(tx, nextMove)) });
    if (nextResearch) candidates.push({ at: nextResearch.finishAt, run: () => db.transaction((tx) => handleResearchDone(tx, nextResearch)) });
    if (nextParty) {
      candidates.push({
        at: nextParty.finishAt,
        run: () =>
          db.transaction((tx) => {
            const owner = tx.select({ u: villages.userId }).from(villages).where(eq(villages.id, nextParty.villageId)).get();
            finishCelebration(tx, nextParty, owner?.u ?? null);
          }),
      });
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.at - b.at);
    candidates[0]?.run();
    processed++;
  }
  return processed;
}

export { sendTroopsHome };
