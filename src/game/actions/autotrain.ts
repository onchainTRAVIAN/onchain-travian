import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DB, Q } from '../../db/index.js';
import { autoTrains, villages } from '../../db/schema.js';
import { BUILDINGS, type BuildingId } from '../rules/buildings.js';
import { RESOURCE_KEYS, res, type Resources } from '../rules/resources.js';
import type { UnitDef } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, economyOf, levelOf, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';
import { TRAINING_SITES, isTrainingSite, startTraining, trainOptions, trainOrdersOf } from './train.js';

/** How often a running plan queues what is due (real time). */
export const AUTO_TRAIN_STEP_MS = 60_000;
export const AUTO_TRAIN_MIN_HOURS = 1;
export const AUTO_TRAIN_MAX_HOURS = 8;
/** A building whose queue already reaches this far ahead gets nothing new this step. */
export const AUTO_TRAIN_BACKLOG_MS = 15 * 60_000;
/** Downtime longer than this (server restart) is not made up in one burst. */
const MAX_CATCH_UP_MS = 10 * 60_000;
const HOUR = 3_600_000;

export interface AutoTrainItem {
  building: BuildingId;
  slot: number;
  perHour: number;
  /** Fraction of a unit carried to the next step. */
  acc: number;
  trained: number;
  /** Units the plan wanted but the village could not afford at that moment. */
  short: number;
}

export type AutoTrainRow = typeof autoTrains.$inferSelect;

/** One unit that may be auto-trained in one training building of this village. */
export interface AutoUnitRow {
  key: string;
  building: BuildingId;
  slot: number;
  unit: UnitDef;
  cost: Resources;
  timeMs: number;
  /** Most units this building can finish per hour on its own. */
  capPerHour: number;
  available: boolean;
  reason?: string;
}

const itemSchema = z.object({
  building: z.string(),
  slot: z.number().int().min(0).max(9),
  perHour: z.number().int().min(0),
  acc: z.number().min(0).default(0),
  trained: z.number().int().min(0).default(0),
  short: z.number().int().min(0).default(0),
});

export function parseItems(json: string | null | undefined): AutoTrainItem[] {
  try {
    const out = z.array(itemSchema).parse(JSON.parse(json ?? '[]'));
    return out.filter((i): i is AutoTrainItem => isTrainingSite(i.building));
  } catch {
    return [];
  }
}

export const itemKey = (building: string, slot: number): string => `${building}_${slot}`;

export function autoTrainOf(q: Q, villageId: number): AutoTrainRow | undefined {
  return q.select().from(autoTrains).where(eq(autoTrains.villageId, villageId)).get();
}

/** Every unit the village's training buildings can train (settlers and chiefs are never automated). */
export function autoUnitRows(q: Q, state: VillageState, now: number): AutoUnitRow[] {
  const out: AutoUnitRow[] = [];
  const order = Object.keys(TRAINING_SITES) as BuildingId[];
  for (const building of order) {
    if (levelOf(state, building) <= 0) continue;
    for (const o of trainOptions(q, state, building, now)) {
      if (o.unit.type === 'settler' || o.unit.type === 'chief') continue;
      out.push({
        key: itemKey(building, o.slot),
        building,
        slot: o.slot,
        unit: o.unit,
        cost: o.cost,
        timeMs: o.timeMs,
        capPerHour: Math.max(1, Math.floor(HOUR / Math.max(1, o.timeMs))),
        available: o.available,
        reason: o.reason,
      });
    }
  }
  return out;
}

export interface AutoPlanSummary {
  costPerHour: Resources;
  /** Net production per hour now (crop after upkeep). */
  income: Resources;
  /** Share of each resource's cost per hour that income pays (1 = fully). */
  coverage: Resources;
  unitsPerHour: number;
  totalUnits: number;
  totalCost: Resources;
  /** Hours until the stock runs dry at this pace (Infinity = income pays it all). */
  stockLastsH: number;
  /** Extra crop the new troops eat per hour once the run is over. */
  extraUpkeep: number;
  /** Busy share of each training building (1 = full). */
  load: Partial<Record<BuildingId, number>>;
}

/** Live numbers for a plan; mirrored in app.js for instant updates. */
export function summarizePlan(rows: AutoUnitRow[], perHour: Record<string, number>, income: Resources, stock: Resources, hours: number): AutoPlanSummary {
  const costPerHour = res();
  const load: Partial<Record<BuildingId, number>> = {};
  let unitsPerHour = 0;
  let upkeepPerHour = 0;
  for (const r of rows) {
    const n = perHour[r.key] ?? 0;
    if (n <= 0) continue;
    unitsPerHour += n;
    upkeepPerHour += n * r.unit.upkeep;
    for (const k of RESOURCE_KEYS) costPerHour[k] += n * r.cost[k];
    load[r.building] = (load[r.building] ?? 0) + (n * r.timeMs) / HOUR;
  }
  const coverage = res();
  let stockLastsH = Infinity;
  for (const k of RESOURCE_KEYS) {
    coverage[k] = costPerHour[k] <= 0 ? 1 : Math.max(0, Math.min(1, income[k] / costPerHour[k]));
    const deficit = costPerHour[k] - income[k];
    if (deficit > 0) stockLastsH = Math.min(stockLastsH, Math.max(0, stock[k]) / deficit);
  }
  return {
    costPerHour,
    income,
    coverage,
    unitsPerHour,
    totalUnits: unitsPerHour * hours,
    totalCost: res(costPerHour.wood * hours, costPerHour.clay * hours, costPerHour.iron * hours, costPerHour.crop * hours),
    stockLastsH,
    extraUpkeep: upkeepPerHour * hours,
    load,
  };
}

export type AutoGoal = 'offence' | 'defence' | 'raid';
export const AUTO_GOALS: Record<AutoGoal, string> = { offence: 'Strongest attack', defence: 'Strongest defence', raid: 'Most loot carried' };

function goalScore(u: UnitDef, goal: AutoGoal): number {
  if (u.type !== 'inf' && u.type !== 'cav') return 0;
  return goal === 'offence' ? u.attack : goal === 'defence' ? u.defInf + u.defCav : u.carry;
}

/**
 * Quick setup: for each training building the best unit for the goal (score per resource spent),
 * then one shared pace so every chosen building is equally busy and the budget per hour
 * (income + stock spread over the run, crop minus what the new troops will eat) is not exceeded.
 */
export function autoPreset(rows: AutoUnitRow[], goal: AutoGoal, income: Resources, stock: Resources, hours: number): Record<string, number> {
  const best = new Map<BuildingId, AutoUnitRow>();
  for (const r of rows) {
    if (!r.available) continue;
    const s = goalScore(r.unit, goal) / Math.max(1, RESOURCE_KEYS.reduce((a, k) => a + r.cost[k], 0));
    if (s <= 0) continue;
    const cur = best.get(r.building);
    const curScore = cur ? goalScore(cur.unit, goal) / Math.max(1, RESOURCE_KEYS.reduce((a, k) => a + cur.cost[k], 0)) : -1;
    if (s > curScore) best.set(r.building, r);
  }
  const chosen = [...best.values()];
  const out: Record<string, number> = {};
  if (chosen.length === 0) return out;
  const budget = res();
  for (const k of RESOURCE_KEYS) budget[k] = Math.max(0, income[k] + Math.max(0, stock[k]) / hours);
  // Units trained early eat crop for the rest of the run: on average half the run.
  let t = 1;
  for (const k of RESOURCE_KEYS) {
    const need = chosen.reduce((a, r) => a + r.capPerHour * (r.cost[k] + (k === 'crop' ? (r.unit.upkeep * hours) / 2 : 0)), 0);
    if (need > 0) t = Math.min(t, budget[k] / need);
  }
  for (const r of chosen) {
    const n = Math.floor(t * r.capPerHour);
    if (n > 0) out[r.key] = n;
  }
  return out;
}

export const planSchema = z.object({
  hours: z.coerce.number().int().min(AUTO_TRAIN_MIN_HOURS).max(AUTO_TRAIN_MAX_HOURS),
  perHour: z.record(z.string(), z.number().int().min(0).max(1_000_000)),
});

/** Start (or restart) the village's auto training: the plan runs for `hours`, then stops. */
export function startAutoTrain(db: DB, userId: number, villageId: number, hours: number, perHour: Record<string, number>, now: number): AutoTrainRow {
  assertGame(Number.isInteger(hours) && hours >= AUTO_TRAIN_MIN_HOURS && hours <= AUTO_TRAIN_MAX_HOURS, `Choose between ${AUTO_TRAIN_MIN_HOURS} and ${AUTO_TRAIN_MAX_HOURS} hours`);
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const rows = autoUnitRows(tx, state, now);
    const items: AutoTrainItem[] = [];
    const load = new Map<BuildingId, number>();
    for (const r of rows) {
      const n = perHour[r.key] ?? 0;
      if (n <= 0) continue;
      if (!r.available) throw new GameError(`${r.unit.name}: ${r.reason ?? 'cannot be trained'}`);
      load.set(r.building, (load.get(r.building) ?? 0) + (n * r.timeMs) / HOUR);
      items.push({ building: r.building, slot: r.slot, perHour: n, acc: 0, trained: 0, short: 0 });
    }
    for (const key of Object.keys(perHour)) {
      if ((perHour[key] ?? 0) > 0 && !rows.some((r) => r.key === key)) throw new GameError('This village cannot train one of the chosen units');
    }
    assertGame(items.length > 0, 'Enter how many units per hour to train');
    for (const [b, l] of load) {
      if (l > 1.0001) throw new GameError(`The ${BUILDINGS[b].name} can't train that many per hour (${Math.round(l * 100)}% busy) — lower its numbers`);
    }
    const values = { userId, active: true, hours, startedAt: now, endsAt: now + hours * HOUR, lastRunAt: now, items: JSON.stringify(items), seen: true };
    return tx
      .insert(autoTrains)
      .values({ villageId, ...values })
      .onConflictDoUpdate({ target: autoTrains.villageId, set: values })
      .returning()
      .get();
  });
}

export function stopAutoTrain(db: DB, userId: number, villageId: number, now: number): void {
  const row = db.select().from(autoTrains).where(and(eq(autoTrains.villageId, villageId), eq(autoTrains.userId, userId))).get();
  assertGame(row?.active, 'Auto training is not running');
  db.update(autoTrains).set({ active: false, endsAt: Math.min(row.endsAt, now), seen: true }).where(eq(autoTrains.villageId, villageId)).run();
}

/** One step of a running plan: queue what is due; if the village can't pay for it all, train as many as it can. */
export function runAutoTrain(db: DB, row: AutoTrainRow, now: number): void {
  const items = parseItems(row.items);
  const until = Math.min(now, row.endsAt);
  const elapsed = Math.max(0, Math.min(until - row.lastRunAt, MAX_CATCH_UP_MS));
  for (const it of items) {
    it.acc += (it.perHour * elapsed) / HOUR;
    const want = Math.floor(it.acc);
    if (want <= 0) continue;
    it.acc -= want;
    const opt = db.transaction((tx) => {
      const state = catchUp(tx, row.villageId, now);
      if (!state) return null;
      const o = trainOptions(tx, state, it.building, now).find((x) => x.slot === it.slot);
      const queueEnd = trainOrdersOf(tx, row.villageId)
        .filter((x) => x.building === it.building)
        .reduce((end, x) => Math.max(end, x.startAt + x.total * x.perUnitMs), now);
      return o ? { ...o, busy: queueEnd - now > AUTO_TRAIN_BACKLOG_MS } : null;
    });
    if (!opt || !opt.available) {
      it.short += want;
      continue;
    }
    if (opt.busy) continue; // the building is already full for a while (e.g. manual orders)
    const n = Math.min(want, opt.maxAffordable);
    if (n > 0) {
      try {
        startTraining(db, row.userId, row.villageId, it.building, it.slot, n, now);
        it.trained += n;
      } catch (err) {
        if (!(err instanceof GameError)) throw err;
        it.short += n;
      }
    }
    it.short += want - n;
  }
  const done = now >= row.endsAt;
  db.update(autoTrains)
    .set({ items: JSON.stringify(items), lastRunAt: until, ...(done ? { active: false, seen: false } : {}) })
    .where(eq(autoTrains.villageId, row.villageId))
    .run();
}

/** World tick: run every active plan once a minute (and one last time when it ends). */
export function processAutoTrains(db: DB, now: number): number {
  let runs = 0;
  for (const row of db.select().from(autoTrains).where(eq(autoTrains.active, true)).all()) {
    if (now - row.lastRunAt < AUTO_TRAIN_STEP_MS && now < row.endsAt) continue;
    const owner = db.select({ userId: villages.userId }).from(villages).where(eq(villages.id, row.villageId)).get();
    if (!owner || owner.userId !== row.userId) {
      db.update(autoTrains).set({ active: false, seen: true }).where(eq(autoTrains.villageId, row.villageId)).run();
      continue;
    }
    try {
      runAutoTrain(db, row, now);
      runs++;
    } catch (err) {
      console.error('Auto training failed for village', row.villageId, err);
      db.update(autoTrains).set({ lastRunAt: now }).where(eq(autoTrains.villageId, row.villageId)).run();
    }
  }
  return runs;
}

/** Finished plans the player hasn't looked at yet (Info box). */
export function finishedAutoTrains(q: Q, userId: number): { villageId: number; name: string }[] {
  return q
    .select({ villageId: autoTrains.villageId, name: villages.name })
    .from(autoTrains)
    .innerJoin(villages, eq(villages.id, autoTrains.villageId))
    .where(and(eq(autoTrains.userId, userId), eq(autoTrains.active, false), eq(autoTrains.seen, false)))
    .all();
}

export function markAutoTrainSeen(q: Q, villageId: number): void {
  q.update(autoTrains).set({ seen: true }).where(and(eq(autoTrains.villageId, villageId), eq(autoTrains.seen, false))).run();
}

/** Income and stock used for planning (net crop already includes current upkeep). */
export function planInputs(q: Q, state: VillageState, now: number): { income: Resources; stock: Resources } {
  const eco = economyOf(q, state, now);
  return { income: { ...eco.net }, stock: stockOf(state.village) };
}
