import { asc, eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { trainOrders } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS } from '../rules/buildings.js';
import { RESOURCE_KEYS, res, roundTo5, scaleRes, subRes, type Resources } from '../rules/resources.js';
import { TRIBES, isSpecialUnit, trainTimeMs, type TrainingBuilding, type UnitDef } from '../rules/units.js';
import { getModifiers } from '../modifiers.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, levelOf, setResources, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';

export type TrainOrderRow = typeof trainOrders.$inferSelect;

export const MAX_TRAIN_BATCH = 100_000;

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

export function trainOptions(q: Q, state: VillageState, building: TrainingBuilding, now: number): TrainOption[] {
  const mods = getModifiers(q, state.userId, now);
  const bLevel = levelOf(state, building);
  const stock = stockOf(state.village);
  return TRIBES[state.tribe].units
    .map((unit, slot) => ({ unit, slot }))
    .filter(({ unit }) => unit.building === building)
    .map(({ unit, slot }) => {
      const cost = unitCost(unit, mods.troopCost);
      const timeMs = trainTimeMs(unit, Math.max(1, bLevel), config.WORLD_SPEED * mods.trainSpeed);
      let reason: string | undefined;
      if (bLevel <= 0) reason = `Requires ${BUILDINGS[building].name}`;
      for (const req of unit.requires) {
        if (!reason && levelOf(state, req.building) < req.level) reason = `Requires ${BUILDINGS[req.building].name} level ${req.level}`;
      }
      if (!reason && isSpecialUnit(unit)) reason = 'Founding and conquering villages arrives in the next update';
      return {
        slot,
        unit,
        cost,
        timeMs,
        available: !reason,
        reason,
        maxAffordable: reason ? 0 : maxAffordable(stock, cost),
      };
    });
}

export function startTraining(db: DB, userId: number, villageId: number, unitSlot: number, count: number, now: number): TrainOrderRow {
  assertGame(Number.isInteger(count) && count > 0, 'Enter how many units to train');
  assertGame(count <= MAX_TRAIN_BATCH, 'Too many units at once');
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const unit = TRIBES[state.tribe].units[unitSlot];
    assertGame(unit, 'Unknown unit');
    const option = trainOptions(tx, state, unit.building, now).find((o) => o.slot === unitSlot);
    assertGame(option, 'Unknown unit');
    if (!option.available) throw new GameError(option.reason ?? 'Cannot train this unit');
    if (count > option.maxAffordable) throw new GameError(option.maxAffordable === 0 ? 'Not enough resources' : `You can afford at most ${option.maxAffordable}`);

    // Units of the same building train one after another.
    const queue = trainOrdersOf(tx, villageId).filter((o) => o.building === unit.building);
    const queueEnd = queue.reduce((end, o) => Math.max(end, o.startAt + o.total * o.perUnitMs), now);
    setResources(tx, villageId, subRes(stockOf(state.village), scaleRes(option.cost, count)));
    return tx
      .insert(trainOrders)
      .values({ villageId, building: unit.building, unitSlot, total: count, done: 0, perUnitMs: option.timeMs, startAt: queueEnd })
      .returning()
      .get();
  });
}
