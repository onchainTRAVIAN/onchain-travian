import { asc, eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { trainOrders } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS, type BuildingId } from '../rules/buildings.js';
import { RESOURCE_KEYS, res, roundTo5, scaleRes, subRes, type Resources } from '../rules/resources.js';
import { TRIBES, addUnits, trainTimeMs, type TrainingBuilding, type UnitDef } from '../rules/units.js';
import { SETTLERS_PER_VILLAGE, expansionSlots } from '../rules/expansion.js';
import { isResearched } from './research.js';
import { ownedTroopTotals } from '../engine/state.js';
import { artifactValue } from '../engine/artifacts.js';
import { getModifiers } from '../modifiers.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, levelOf, setResources, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';

export type TrainOrderRow = typeof trainOrders.$inferSelect;

export const MAX_TRAIN_BATCH = 100_000;

/** Buildings that train troops, and which unit group each one trains. Great buildings cost 3×. */
export const TRAINING_SITES: Partial<Record<BuildingId, { units: TrainingBuilding; costMult: number }>> = {
  barracks: { units: 'barracks', costMult: 1 },
  greatbarracks: { units: 'barracks', costMult: 3 },
  stable: { units: 'stable', costMult: 1 },
  greatstable: { units: 'stable', costMult: 3 },
  workshop: { units: 'workshop', costMult: 1 },
  residence: { units: 'residence', costMult: 1 },
  palace: { units: 'residence', costMult: 1 },
};

export function isTrainingSite(id: string): id is BuildingId {
  return id in TRAINING_SITES;
}

export interface TrainOption {
  slot: number;
  unit: UnitDef;
  cost: Resources;
  timeMs: number;
  available: boolean;
  reason?: string;
  maxAffordable: number;
}

export function trainOrdersOf(q: Q, villageId: number): TrainOrderRow[] {
  return q.select().from(trainOrders).where(eq(trainOrders.villageId, villageId)).orderBy(asc(trainOrders.startAt), asc(trainOrders.id)).all();
}

export function unitCost(u: UnitDef, troopCost: number): Resources {
  if (troopCost === 1) return { ...u.cost };
  return res(roundTo5(u.cost.wood * troopCost), roundTo5(u.cost.clay * troopCost), roundTo5(u.cost.iron * troopCost), roundTo5(u.cost.crop * troopCost));
}

export function maxAffordable(stock: Resources, cost: Resources): number {
  let max = Infinity;
  for (const k of RESOURCE_KEYS) if (cost[k] > 0) max = Math.min(max, Math.floor(stock[k] / cost[k]));
  return Number.isFinite(max) ? Math.max(0, Math.min(max, MAX_TRAIN_BATCH)) : 0;
}

export function trainOptions(q: Q, state: VillageState, building: BuildingId, now: number): TrainOption[] {
  const site = TRAINING_SITES[building];
  if (!site) return [];
  const mods = getModifiers(q, state.userId, now);
  const bLevel = levelOf(state, building);
  // Romans' Horse Drinking Trough: cavalry trains 1% faster per level (time × (1 − 0.01·L)).
  const trough = state.tribe === 'romans' && site.units === 'stable' ? 1 / (1 - 0.01 * levelOf(state, 'horsetrough')) : 1;
  const stock = stockOf(state.village);
  return TRIBES[state.tribe].units
    .map((unit, slot) => ({ unit, slot }))
    .filter(({ unit }) => unit.building === site.units)
    .map(({ unit, slot }) => {
      const cost = scaleRes(unitCost(unit, mods.troopCost), site.costMult);
      // Trainers' talent (artifact) shortens training.
      const timeMs = Math.round(trainTimeMs(unit, Math.max(1, bLevel), config.WORLD_SPEED * mods.trainSpeed * trough) * artifactValue(q, state.village.id, 'trainer', now));
      let reason: string | undefined;
      if (bLevel <= 0) reason = `Requires ${BUILDINGS[building].name}`;
      for (const req of unit.requires) {
        if (!reason && levelOf(state, req.building) < req.level) reason = `Requires ${BUILDINGS[req.building].name} level ${req.level}`;
      }
      if (!reason && !isResearched(state, slot)) reason = 'Research this unit in the Academy first';
      let limit = Infinity;
      if (!reason && (unit.type === 'settler' || unit.type === 'chief')) {
        limit = specialUnitRoom(q, state, slot, unit);
        if (limit <= 0) reason = 'No free expansion slot (Residence level 10/20, Palace 10/15/20)';
      }
      return {
        slot,
        unit,
        cost,
        timeMs,
        available: !reason,
        reason,
        maxAffordable: reason ? 0 : Math.min(limit, maxAffordable(stock, cost)),
      };
    });
}

/** How many more settlers/chiefs this village may train, given its free expansion slots. */
function specialUnitRoom(q: Q, state: VillageState, slot: number, unit: UnitDef): number {
  const free = expansionSlots(levelOf(state, 'residence'), levelOf(state, 'palace')) - state.village.expansions;
  if (free <= 0) return 0;
  let existing = ownedTroopTotals(q, state.village.id);
  for (const o of trainOrdersOf(q, state.village.id)) {
    const add = new Array<number>(10).fill(0);
    add[o.unitSlot] = o.total - o.done;
    existing = addUnits(existing, add);
  }
  const have = existing[slot] ?? 0;
  const settlerSlot = TRIBES[state.tribe].units.findIndex((u) => u.type === 'settler');
  const chiefSlot = TRIBES[state.tribe].units.findIndex((u) => u.type === 'chief');
  // Each slot is used by either one chief or one group of settlers.
  const usedBySettlers = Math.ceil((existing[settlerSlot] ?? 0) / SETTLERS_PER_VILLAGE);
  const usedByChiefs = existing[chiefSlot] ?? 0;
  const remaining = free - usedBySettlers - usedByChiefs;
  if (unit.type === 'settler') {
    const partial = have % SETTLERS_PER_VILLAGE === 0 ? 0 : SETTLERS_PER_VILLAGE - (have % SETTLERS_PER_VILLAGE);
    return partial + Math.max(0, remaining) * SETTLERS_PER_VILLAGE;
  }
  return Math.max(0, remaining);
}

/** `merge`: add to the last order of this building when it is the same unit (auto training keeps one queue line). */
export function startTraining(db: DB, userId: number, villageId: number, building: BuildingId, unitSlot: number, count: number, now: number, merge = false): TrainOrderRow {
  assertGame(Number.isInteger(count) && count > 0, 'Enter how many units to train');
  assertGame(count <= MAX_TRAIN_BATCH, 'Too many units at once');
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const unit = TRIBES[state.tribe].units[unitSlot];
    assertGame(unit, 'Unknown unit');
    assertGame(isTrainingSite(building) && levelOf(state, building) > 0, 'This building cannot train troops');
    const option = trainOptions(tx, state, building, now).find((o) => o.slot === unitSlot);
    assertGame(option, 'Unknown unit');
    if (!option.available) throw new GameError(option.reason ?? 'Cannot train this unit');
    if (count > option.maxAffordable) throw new GameError(option.maxAffordable === 0 ? 'Not enough resources' : `You can train at most ${option.maxAffordable}`);

    // Units of the same building train one after another.
    const queue = trainOrdersOf(tx, villageId).filter((o) => o.building === building);
    const queueEnd = queue.reduce((end, o) => Math.max(end, o.startAt + o.total * o.perUnitMs), now);
    setResources(tx, villageId, subRes(stockOf(state.village), scaleRes(option.cost, count)));
    const tail = queue.reduce<TrainOrderRow | undefined>((t, o) => (!t || o.startAt + o.total * o.perUnitMs >= t.startAt + t.total * t.perUnitMs ? o : t), undefined);
    if (merge && tail && tail.unitSlot === unitSlot && tail.perUnitMs === option.timeMs && tail.startAt + tail.total * tail.perUnitMs === queueEnd) {
      return tx.update(trainOrders).set({ total: tail.total + count }).where(eq(trainOrders.id, tail.id)).returning().get();
    }
    return tx
      .insert(trainOrders)
      .values({ villageId, building, unitSlot, total: count, done: 0, perUnitMs: option.timeMs, startAt: queueEnd })
      .returning()
      .get();
  });
}
