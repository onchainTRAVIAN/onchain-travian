import { and, asc, eq, ne } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { buildOrders, slots, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import {
  BUILDINGS,
  FIELD_MAX_NON_CAPITAL,
  FIELD_SLOTS,
  TOWN_BUILDING_IDS,
  TOWN_SLOT_FIRST,
  TOWN_SLOT_LAST,
  buildCost,
  buildTimeMs,
  isBuildingId,
  type BuildingDef,
  type BuildingId,
} from '../rules/buildings.js';
import { RESOURCE_KEYS, canAfford, subRes, addRes, type Resources } from '../rules/resources.js';
import { TRIBES } from '../rules/units.js';
import { getModifiers } from '../modifiers.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, economyOf, levelOf, setResources, stockOf, type VillageState } from '../engine/state.js';

export type BuildOrderRow = typeof buildOrders.$inferSelect;

export interface BuildOption {
  def: BuildingDef;
  slot: number;
  currentLevel: number;
  nextLevel: number;
  cost: Resources;
  timeMs: number;
  canBuild: boolean;
  reason?: string;
  /** ms until resources are available, when that is the only blocker. */
  waitMs?: number;
  maxed: boolean;
}

export function buildOrdersOf(q: Q, villageId: number): BuildOrderRow[] {
  return q.select().from(buildOrders).where(eq(buildOrders.villageId, villageId)).orderBy(asc(buildOrders.finishAt)).all();
}

/** Time until `cost` is affordable given net production; undefined if never. */
export function waitForResources(stock: Resources, net: Resources, capacity: Resources, cost: Resources): number | undefined {
  let worst = 0;
  for (const k of RESOURCE_KEYS) {
    const missing = cost[k] - stock[k];
    if (missing <= 0) continue;
    if (cost[k] > capacity[k] || net[k] <= 0) return undefined;
    worst = Math.max(worst, (missing / net[k]) * 3_600_000);
  }
  return Math.ceil(worst);
}

export function slotKind(slot: number): 'field' | 'town' | 'rally' | 'wall' {
  if (slot >= 1 && slot <= FIELD_SLOTS) return 'field';
  if (slot >= TOWN_SLOT_FIRST && slot <= TOWN_SLOT_LAST) return 'town';
  if (slot === 39) return 'rally';
  return 'wall';
}

export function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= 40;
}

/** Evaluate whether `buildingId` can be built / upgraded on `slot` right now. */
export function buildOption(q: Q, state: VillageState, slot: number, buildingId: BuildingId, now: number): BuildOption {
  const def = BUILDINGS[buildingId];
  const slotRow = state.slots.find((s) => s.slot === slot);
  const orders = buildOrdersOf(q, state.village.id);
  const pendingHere = orders.find((o) => o.slot === slot);
  const currentLevel = slotRow?.building === buildingId ? slotRow.level : 0;
  const nextLevel = currentLevel + 1;
  const mods = getModifiers(q, state.userId, now);
  const cost = buildCost(def, nextLevel);
  const timeMs = buildTimeMs(def, nextLevel, levelOf(state, 'main'), config.WORLD_SPEED * mods.buildSpeed);
  const maxLevel = def.kind === 'field' && !state.village.isCapital ? Math.min(def.maxLevel, FIELD_MAX_NON_CAPITAL) : def.maxLevel;
  const base = { def, slot, currentLevel, nextLevel, cost, timeMs, maxed: currentLevel >= maxLevel };
  const no = (reason: string, waitMs?: number): BuildOption => ({ ...base, canBuild: false, reason, waitMs });

  if (base.maxed) return no(`Fully upgraded (level ${maxLevel})`);
  if (pendingHere) return no('Already under construction');

  const kind = slotKind(slot);
  if (slotRow?.building && slotRow.building !== buildingId) return no('Another building stands here');
  if (kind === 'field' && def.kind !== 'field') return no('Only resource fields can be built here');
  if (kind !== 'field' && def.kind === 'field') return no('Resource fields belong outside the village');
  if (def.fixedSlot !== undefined && def.fixedSlot !== slot) return no('This building has its own place');
  if (def.fixedSlot === undefined && (kind === 'rally' || kind === 'wall')) return no('Reserved place');

  // Only checked when founding a new building on an empty plot.
  if (!slotRow?.building) {
    const others = state.slots.filter((s) => s.building === buildingId && s.slot !== slot);
    const pendingOthers = orders.filter((o) => o.building === buildingId && o.slot !== slot);
    if (!def.multiple && (others.some((s) => s.level > 0) || pendingOthers.length > 0)) return no('Already built in this village');
    if (def.multiple && (others.some((s) => s.level < def.maxLevel) || pendingOthers.length > 0)) {
      return no(`Upgrade your existing ${def.name} to level ${def.maxLevel} first`);
    }
    for (const ex of def.excludes ?? []) {
      if (levelOf(state, ex) > 0 || orders.some((o) => o.building === ex)) return no(`Cannot be built next to a ${BUILDINGS[ex].name}`);
    }
  }

  for (const req of def.requires) {
    if (levelOf(state, req.building) < req.level) return no(`Requires ${BUILDINGS[req.building].name} level ${req.level}`);
  }
  if (def.tribe && def.tribe !== state.tribe) return no(`Only the ${TRIBES[def.tribe].name} can build this`);
  if (def.capitalOnly && !state.village.isCapital) return no('Can only be built in your capital');
  if (def.nonCapital && state.village.isCapital) return no('Cannot be built in your capital');
  if (def.onePerAccount && !slotRow?.building && state.userId !== null && ownsElsewhere(q, state.userId, state.village.id, def.id)) {
    return no(`You already have a ${def.name} in another village`);
  }

  // Romans may build one resource field and one village building at the same time.
  const extra = mods.buildQueue - 1;
  if (TRIBES[state.tribe].parallelBuild) {
    const sameKind = orders.filter((o) => (o.slot <= FIELD_SLOTS) === (slot <= FIELD_SLOTS)).length;
    if (sameKind >= 1 + extra) return no('Your builders are busy');
  } else if (orders.length >= mods.buildQueue) {
    return no('Your builders are busy');
  }

  const stock = stockOf(state.village);
  if (!canAfford(stock, cost)) {
    const eco = economyOf(q, state, now);
    for (const k of RESOURCE_KEYS) {
      if (cost[k] > eco.capacity[k]) {
        return no(k === 'crop' ? 'Upgrade your Granary first' : 'Upgrade your Warehouse first');
      }
    }
    return no('Not enough resources', waitForResources(stock, eco.net, eco.capacity, cost));
  }
  return { ...base, canBuild: true };
}

function ownsElsewhere(q: Q, userId: number, villageId: number, id: BuildingId): boolean {
  return !!q
    .select({ v: villages.id })
    .from(slots)
    .innerJoin(villages, eq(villages.id, slots.villageId))
    .where(and(eq(villages.userId, userId), eq(slots.building, id), ne(villages.id, villageId)))
    .get();
}

/** Reasons that mean "never show this building in the list" (tribe, capital rules). */
function hiddenReason(reason: string | undefined): boolean {
  return !!reason && /^(Only the|Can only be built in your capital|Cannot be built in your capital|You already have|Already built|Cannot be built next to|Upgrade your existing)/.test(reason);
}

/** Buildings that could go on an empty town plot, best options first. */
export function buildableOnEmptyPlot(q: Q, state: VillageState, slot: number, now: number): BuildOption[] {
  return TOWN_BUILDING_IDS.filter((id) => BUILDINGS[id].fixedSlot === undefined)
    .map((id) => buildOption(q, state, slot, id, now))
    .filter((o) => !hiddenReason(o.reason))
    .sort((a, b) => rank(a) - rank(b));
}

function rank(o: BuildOption): number {
  if (o.canBuild) return 0;
  return o.reason?.startsWith('Requires') ? 2 : 1;
}

export function ownedVillage(q: Q, userId: number, villageId: number) {
  const v = q.select().from(villages).where(and(eq(villages.id, villageId), eq(villages.userId, userId))).get();
  assertGame(v, 'Village not found');
  return v;
}

export function startBuild(db: DB, userId: number, villageId: number, slot: number, buildingId: string | undefined, now: number): BuildOrderRow {
  assertGame(isValidSlot(slot), 'Invalid building place');
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const slotRow = state.slots.find((s) => s.slot === slot);
    const id = slotRow?.building ?? buildingId;
    assertGame(id && isBuildingId(id), 'Choose a building');
    const opt = buildOption(tx, state, slot, id, now);
    if (!opt.canBuild) throw new GameError(opt.reason ?? 'Cannot build');
    setResources(tx, villageId, subRes(stockOf(state.village), opt.cost));
    return tx
      .insert(buildOrders)
      .values({ villageId, slot, building: id, toLevel: opt.nextLevel, startAt: now, finishAt: now + opt.timeMs })
      .returning()
      .get();
  });
}

export function cancelBuild(db: DB, userId: number, orderId: number, now: number): void {
  db.transaction((tx) => {
    const order = tx.select().from(buildOrders).where(eq(buildOrders.id, orderId)).get();
    assertGame(order, 'Construction not found');
    ownedVillage(tx, userId, order.villageId);
    const state = catchUp(tx, order.villageId, now);
    assertGame(state, 'Village not found');
    const def = BUILDINGS[order.building as BuildingId];
    assertGame(def, 'Unknown building');
    setResources(tx, order.villageId, addRes(stockOf(state.village), buildCost(def, order.toLevel)));
    tx.delete(buildOrders).where(eq(buildOrders.id, orderId)).run();
  });
}

