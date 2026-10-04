import { and, asc, eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { researchOrders } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS } from '../rules/buildings.js';
import { canAfford, subRes, type Resources } from '../rules/resources.js';
import { SMITHY_MAX, TRIBES, researchCost, researchTimeMs, smithyCost, smithyTimeMs, type UnitDef } from '../rules/units.js';
import { getModifiers } from '../modifiers.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, levelOf, parseLevels, setResources, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';

export type ResearchOrderRow = typeof researchOrders.$inferSelect;

export interface ResearchOption {
  slot: number;
  unit: UnitDef;
  done: boolean;
  level: number;
  cost: Resources;
  timeMs: number;
  available: boolean;
  reason?: string;
}

/** Units that never need research: the basic soldier and settlers. */
export function needsResearch(slot: number, u: UnitDef): boolean {
  return slot !== 0 && u.type !== 'settler';
}

export function isResearched(state: VillageState, slot: number): boolean {
  const u = TRIBES[state.tribe].units[slot];
  if (!u) return false;
  if (!needsResearch(slot, u)) return true;
  return (parseLevels(state.village.research)[slot] ?? 0) > 0;
}

export function researchOrdersOf(q: Q, villageId: number): ResearchOrderRow[] {
  return q.select().from(researchOrders).where(eq(researchOrders.villageId, villageId)).orderBy(asc(researchOrders.finishAt)).all();
}

function speed(q: Q, state: VillageState, now: number): number {
  return config.WORLD_SPEED * getModifiers(q, state.userId, now).trainSpeed;
}

export function academyOptions(q: Q, state: VillageState, now: number): ResearchOption[] {
  const busy = researchOrdersOf(q, state.village.id).find((o) => o.kind === 'academy');
  const stock = stockOf(state.village);
  return TRIBES[state.tribe].units
    .map((unit, slot) => ({ unit, slot }))
    .filter(({ unit, slot }) => needsResearch(slot, unit))
    .map(({ unit, slot }) => {
      const done = isResearched(state, slot);
      const cost = researchCost(unit);
      let reason: string | undefined;
      if (done) reason = 'Researched';
      else if (busy) reason = busy.unitSlot === slot ? 'Researching now' : 'The Academy is busy';
      for (const req of unit.requires) {
        if (!reason && levelOf(state, req.building) < req.level) reason = `Requires ${BUILDINGS[req.building].name} level ${req.level}`;
      }
      if (!reason && levelOf(state, 'academy') < 1) reason = 'Requires Academy';
      if (!reason && !canAfford(stock, cost)) reason = 'Not enough resources';
      return { slot, unit, done, level: done ? 1 : 0, cost, timeMs: researchTimeMs(unit, speed(q, state, now), levelOf(state, 'academy')), available: !reason, reason };
    });
}

export type UpgradeKind = 'blacksmith' | 'armoury';
export type ResearchKind = 'academy' | UpgradeKind;

/** Blacksmith (attack) or Armoury (defence) upgrades; max level = that building's level. */
export function upgradeOptions(q: Q, state: VillageState, kind: UpgradeKind, now: number): ResearchOption[] {
  const levels = parseLevels(state.village[kind]);
  const buildingLevel = levelOf(state, kind);
  const busy = researchOrdersOf(q, state.village.id).find((o) => o.kind === kind);
  const stock = stockOf(state.village);
  const name = kind === 'blacksmith' ? 'Blacksmith' : 'Armoury';
  return TRIBES[state.tribe].units
    .map((unit, slot) => ({ unit, slot }))
    .filter(({ unit }) => unit.type !== 'settler' && unit.type !== 'chief')
    .map(({ unit, slot }) => {
      const level = levels[slot] ?? 0;
      const next = level + 1;
      const cost = smithyCost(unit, next);
      let reason: string | undefined;
      if (!isResearched(state, slot)) reason = 'Research this unit first';
      else if (level >= SMITHY_MAX) reason = 'Fully upgraded';
      else if (level >= buildingLevel) reason = `Upgrade the ${name} to level ${next}`;
      else if (busy) reason = busy.unitSlot === slot ? 'Upgrading now' : `The ${name} is busy`;
      else if (!canAfford(stock, cost)) reason = 'Not enough resources';
      return { slot, unit, done: false, level, cost, timeMs: smithyTimeMs(unit, next, speed(q, state, now), buildingLevel), available: !reason, reason };
    });
}

export function startResearch(db: DB, userId: number, villageId: number, kind: ResearchKind, slot: number, now: number): ResearchOrderRow {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const opts = kind === 'academy' ? academyOptions(tx, state, now) : upgradeOptions(tx, state, kind, now);
    const o = opts.find((x) => x.slot === slot);
    assertGame(o, 'Unknown unit');
    if (!o.available) throw new GameError(o.reason ?? 'Not possible right now');
    setResources(tx, villageId, subRes(stockOf(state.village), o.cost));
    const existing = tx.select().from(researchOrders).where(and(eq(researchOrders.villageId, villageId), eq(researchOrders.kind, kind))).get();
    assertGame(!existing, kind === 'academy' ? 'The Academy is busy' : kind === 'blacksmith' ? 'The Blacksmith is busy' : 'The Armoury is busy');
    return tx
      .insert(researchOrders)
      .values({ villageId, kind, unitSlot: slot, toLevel: kind === 'academy' ? 1 : o.level + 1, startAt: now, finishAt: now + o.timeMs })
      .returning()
      .get();
  });
}
