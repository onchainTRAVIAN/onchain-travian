import { eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { villages } from '../../db/schema.js';
import { res, sumRes, type Resources } from '../rules/resources.js';
import { trapCapacity } from '../rules/production.js';
import { totalUnits, type UnitCounts } from '../rules/units.js';
import { assertGame } from '../errors.js';
import { catchUp, parseUnits, setResources, stockOf, type VillageState } from '../engine/state.js';
import { scheduleReturn, villageInfo } from '../engine/movement.js';
import { ownedVillage } from './build.js';

/** Cost of one trap (T3.6, TravianZ). */
export const TRAP_COST: Resources = res(20, 30, 10, 20);

export function trapCapacityOf(state: VillageState): number {
  return state.slots.reduce((s, sl) => s + (sl.building === 'trapper' ? trapCapacity(sl.level) : 0), 0);
}

export function prisonersOf(v: { prisoners: string }): { ownerVillageId: number; units: UnitCounts }[] {
  try {
    const p = JSON.parse(v.prisoners) as Record<string, unknown>;
    return Object.entries(p)
      .map(([k, u]) => ({ ownerVillageId: Number(k), units: parseUnits(JSON.stringify(u)) }))
      .filter((r) => totalUnits(r.units) > 0);
  } catch {
    return [];
  }
}

export function trapInfo(state: VillageState): { built: number; capacity: number; held: number } {
  const held = prisonersOf(state.village).reduce((s, r) => s + totalUnits(r.units), 0);
  return { built: state.village.traps, capacity: trapCapacityOf(state), held };
}

/** Gauls build traps in the Trapper (instantly, for resources), up to its capacity. */
export function buildTraps(db: DB, userId: number, villageId: number, count: number, now: number): number {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    assertGame(state.tribe === 'gauls', 'Only Gauls build traps');
    const n = Math.floor(count);
    assertGame(n >= 1, 'Enter how many traps to build');
    const cap = trapCapacityOf(state);
    assertGame(cap > 0, 'Build a Trapper first');
    assertGame(state.village.traps + n <= cap, `Your Trapper holds at most ${cap} traps (${state.village.traps} built)`);
    const cost = res(TRAP_COST.wood * n, TRAP_COST.clay * n, TRAP_COST.iron * n, TRAP_COST.crop * n);
    const stock = stockOf(state.village);
    assertGame(stock.wood >= cost.wood && stock.clay >= cost.clay && stock.iron >= cost.iron && stock.crop >= cost.crop, `Not enough resources (${sumRes(cost)} needed)`);
    setResources(tx, villageId, res(stock.wood - cost.wood, stock.clay - cost.clay, stock.iron - cost.iron, stock.crop - cost.crop));
    tx.update(villages).set({ traps: state.village.traps + n }).where(eq(villages.id, villageId)).run();
    return n;
  });
}

/** The trap owner lets prisoners go: they walk home and every trap is ready again. */
export function freePrisoners(db: DB, userId: number, villageId: number, now: number): number {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const v = tx.select().from(villages).where(eq(villages.id, villageId)).get();
    assertGame(v, 'Village not found');
    const list = prisonersOf(v);
    assertGame(list.length > 0, 'There are no prisoners');
    let released = 0;
    for (const p of list) {
      const home = villageInfo(tx, p.ownerVillageId);
      if (home) scheduleReturn(tx, home, v.x, v.y, p.units, null, now);
      released += totalUnits(p.units);
    }
    tx.update(villages).set({ prisoners: '{}' }).where(eq(villages.id, villageId)).run();
    return released;
  });
}

export function trapPanelData(q: Q, state: VillageState) {
  return {
    ...trapInfo(state),
    prisoners: prisonersOf(state.village).map((p) => ({ ...p, from: villageInfo(q, p.ownerVillageId) })),
  };
}
