import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DB, Q } from '../../db/index.js';
import { autoTrains, villages } from '../../db/schema.js';
import { type BuildingId } from '../rules/buildings.js';
import { RESOURCE_KEYS, res, type Resources } from '../rules/resources.js';
import type { UnitDef } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, economyOf, levelOf, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';
import { TRAINING_SITES, isTrainingSite, startTraining, trainOptions, trainOrdersOf } from './train.js';

/*
 * Auto training: the player picks troops and gives each a % share of the village's resources.
 * Every minute the plan spends what the village has: each troop gets its share of the current
 * stock and queues as many as that buys; up to two more passes re-split what is left over, so
 * little stays idle. Unassigned % stays in stock. Queues are never filled past the end of the run
 * (1-8 h); then it stops and the player starts it again.
 */

/** How often a running plan spends the village's resources (real time). */
export const AUTO_TRAIN_STEP_MS = 60_000;
export const AUTO_TRAIN_MIN_HOURS = 1;
export const AUTO_TRAIN_MAX_HOURS = 8;
const PASSES = 3;
const HOUR = 3_600_000;

export interface AutoTrainItem {
  building: BuildingId;
  slot: number;
  /** % of the village's resources for this troop (0-100). */
  share: number;
  /** Units queued by this run so far. */
  trained: number;
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
  share: z.number().min(0).max(100).default(0),
  trained: z.number().int().min(0).default(0),
});

export function parseItems(json: string | null | undefined): AutoTrainItem[] {
  try {
    return z
      .array(itemSchema)
      .parse(JSON.parse(json ?? '[]'))
      .filter((i): i is AutoTrainItem => isTrainingSite(i.building));
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
  for (const building of Object.keys(TRAINING_SITES) as BuildingId[]) {
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

/** How many units a budget buys (limited by its scarcest resource). */
export function unitsFor(budget: Resources, cost: Resources): number {
  let n = Infinity;
  for (const k of RESOURCE_KEYS) if (cost[k] > 0) n = Math.min(n, Math.floor(Math.max(0, budget[k]) / cost[k]));
  return Number.isFinite(n) ? n : 0;
}

const scale = (x: Resources, f: number): Resources => res(x.wood * f, x.clay * f, x.iron * f, x.crop * f);

export interface AutoUnitForecast {
  key: string;
  /** Units the current stock buys right away. */
  now: number;
  /** Units per hour the income buys (before building limits). */
  perHour: number;
  /** Resource that limits this troop. */
  limitedBy: keyof Resources | null;
}

export interface AutoPlanSummary {
  assigned: number;
  units: AutoUnitForecast[];
  /** Resources spent per hour from income by the plan. */
  usedPerHour: Resources;
  income: Resources;
  /** Busy share of each training building at the income pace (1 = full; above → resources pile up). */
  load: Partial<Record<BuildingId, number>>;
  /** Units over the whole run: stock now + income × hours (before building limits). */
  totalUnits: number;
  /** Extra crop eaten per hour by the troops of a whole run. */
  extraUpkeep: number;
}

/** Live numbers for a plan; mirrored in app.js for instant updates. */
export function summarizePlan(rows: AutoUnitRow[], shares: Record<string, number>, income: Resources, stock: Resources, hours: number): AutoPlanSummary {
  const usedPerHour = res();
  const load: Partial<Record<BuildingId, number>> = {};
  const units: AutoUnitForecast[] = [];
  let assigned = 0;
  let totalUnits = 0;
  let extraUpkeep = 0;
  for (const r of rows) {
    const share = Math.max(0, shares[r.key] ?? 0);
    if (share <= 0) continue;
    assigned += share;
    const now = unitsFor(scale(stock, share / 100), r.cost);
    const perHour = unitsFor(scale(income, share / 100), r.cost);
    let limitedBy: keyof Resources | null = null;
    let best = Infinity;
    for (const k of RESOURCE_KEYS) {
      if (r.cost[k] <= 0) continue;
      const v = (income[k] * share) / 100 / r.cost[k];
      if (v < best) [best, limitedBy] = [v, k];
    }
    units.push({ key: r.key, now, perHour, limitedBy });
    for (const k of RESOURCE_KEYS) usedPerHour[k] += perHour * r.cost[k];
    load[r.building] = (load[r.building] ?? 0) + (perHour * r.timeMs) / HOUR;
    const total = now + perHour * hours;
    totalUnits += total;
    extraUpkeep += total * r.unit.upkeep;
  }
  return { assigned, units, usedPerHour, income, load, totalUnits, extraUpkeep };
}

export type AutoGoal = 'offence' | 'defence' | 'raid';
export const AUTO_GOALS: Record<AutoGoal, string> = { offence: 'Strongest attack', defence: 'Strongest defence', raid: 'Most loot carried' };

const costSum = (c: Resources) => RESOURCE_KEYS.reduce((a, k) => a + c[k], 0);
function goalScore(u: UnitDef, goal: AutoGoal): number {
  if (u.type !== 'inf' && u.type !== 'cav') return 0;
  return goal === 'offence' ? u.attack : goal === 'defence' ? u.defInf + u.defCav : u.carry;
}

/** Split 100% into whole numbers proportional to the weights (largest remainders). */
export function splitPercent(weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights).filter((k) => (weights[k] ?? 0) > 0);
  const sum = keys.reduce((a, k) => a + (weights[k] ?? 0), 0);
  const out: Record<string, number> = {};
  if (sum <= 0) return out;
  const raw = keys.map((k) => ({ k, v: ((weights[k] ?? 0) * 100) / sum }));
  let left = 100;
  for (const r of raw) {
    out[r.k] = Math.floor(r.v);
    left -= out[r.k] ?? 0;
  }
  raw.sort((a, b) => (b.v % 1) - (a.v % 1));
  for (let i = 0; left > 0; i = (i + 1) % raw.length, left--) {
    const k = raw[i]?.k;
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Quick setup: for each training building the best unit for the goal (score per resource),
 * shares sized so every chosen building is about equally busy (share ∝ units per hour it can train × cost).
 */
export function autoPreset(rows: AutoUnitRow[], goal: AutoGoal): Record<string, number> {
  const best = new Map<BuildingId, AutoUnitRow>();
  for (const r of rows) {
    if (!r.available) continue;
    const s = goalScore(r.unit, goal) / Math.max(1, costSum(r.cost));
    if (s <= 0) continue;
    const cur = best.get(r.building);
    if (!cur || s > goalScore(cur.unit, goal) / Math.max(1, costSum(cur.cost))) best.set(r.building, r);
  }
  return splitPercent(Object.fromEntries([...best.values()].map((r) => [r.key, r.capPerHour * costSum(r.cost)])));
}

/** Start (or restart) the village's auto training: the plan runs for `hours`, then stops. */
export function startAutoTrain(db: DB, userId: number, villageId: number, hours: number, shares: Record<string, number>, now: number): AutoTrainRow {
  assertGame(Number.isInteger(hours) && hours >= AUTO_TRAIN_MIN_HOURS && hours <= AUTO_TRAIN_MAX_HOURS, `Choose between ${AUTO_TRAIN_MIN_HOURS} and ${AUTO_TRAIN_MAX_HOURS} hours`);
  db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const rows = autoUnitRows(tx, state, now);
    const items: AutoTrainItem[] = [];
    const total = Object.values(shares).reduce((x, v) => x + (v > 0 ? v : 0), 0);
    assertGame(total <= 100, `The shares add up to ${total}% - at most 100%`);
    for (const [key, share] of Object.entries(shares)) {
      if (!(share > 0)) continue;
      assertGame(Number.isInteger(share) && share <= 100, 'Shares are whole percentages from 0 to 100');
      const r = rows.find((x) => x.key === key);
      assertGame(r, 'This village cannot train one of the chosen units');
      if (!r.available) throw new GameError(`${r.unit.name}: ${r.reason ?? 'cannot be trained'}`);
      items.push({ building: r.building, slot: r.slot, share, trained: 0 });
    }
    assertGame(items.length > 0, 'Give at least one troop a share of your resources');
    const values = { userId, active: true, hours, startedAt: now, endsAt: now + hours * HOUR, lastRunAt: now, items: JSON.stringify(items), seen: true };
    tx.insert(autoTrains)
      .values({ villageId, ...values })
      .onConflictDoUpdate({ target: autoTrains.villageId, set: values })
      .run();
  });
  // Spend right away, like a player pressing "Train".
  const row = autoTrainOf(db, villageId);
  assertGame(row, 'Auto training could not be saved');
  runAutoTrain(db, row, now);
  return autoTrainOf(db, villageId) ?? row;
}

export function stopAutoTrain(db: DB, userId: number, villageId: number, now: number): void {
  const row = db.select().from(autoTrains).where(and(eq(autoTrains.villageId, villageId), eq(autoTrains.userId, userId))).get();
  assertGame(row?.active, 'Auto training is not running');
  db.update(autoTrains).set({ active: false, endsAt: Math.min(row.endsAt, now), seen: true }).where(eq(autoTrains.villageId, villageId)).run();
}

/** One step: spend the village's resources by the shares (up to PASSES passes), never queueing past the run's end. */
export function runAutoTrain(db: DB, row: AutoTrainRow, now: number): void {
  const items = parseItems(row.items);
  const sumShares = items.reduce((a, i) => a + i.share, 0);
  if (now < row.endsAt && sumShares > 0) {
    const start = db.transaction((tx) => {
      const state = catchUp(tx, row.villageId, now);
      if (!state) return null;
      const queueEnd = new Map<string, number>();
      for (const o of trainOrdersOf(tx, row.villageId)) queueEnd.set(o.building, Math.max(queueEnd.get(o.building) ?? now, o.startAt + o.total * o.perUnitMs));
      const options = new Map(items.map((it) => [itemKey(it.building, it.slot), trainOptions(tx, state, it.building, now).find((x) => x.slot === it.slot)]));
      return { stock: stockOf(state.village), queueEnd, options };
    });
    if (start) {
      // The assigned part of the stock; later passes re-split what the earlier ones couldn't use.
      let pool = scale(start.stock, sumShares / 100);
      for (let pass = 0; pass < PASSES; pass++) {
        const spent = res();
        let any = false;
        for (const it of items) {
          const opt = start.options.get(itemKey(it.building, it.slot));
          if (!opt?.available || it.share <= 0) continue;
          const qEnd = Math.max(now, start.queueEnd.get(it.building) ?? now);
          const timeRoom = Math.floor((row.endsAt - qEnd) / Math.max(1, opt.timeMs));
          let n = Math.min(unitsFor(scale(pool, it.share / sumShares), opt.cost), timeRoom);
          if (n <= 0) continue;
          try {
            startTraining(db, row.userId, row.villageId, it.building, it.slot, n, now, true);
          } catch (err) {
            if (!(err instanceof GameError)) throw err;
            n = 0;
          }
          if (n <= 0) continue;
          any = true;
          it.trained += n;
          start.queueEnd.set(it.building, qEnd + n * opt.timeMs);
          for (const k of RESOURCE_KEYS) spent[k] += n * opt.cost[k];
        }
        if (!any) break;
        pool = res(...(RESOURCE_KEYS.map((k) => Math.max(0, pool[k] - spent[k])) as [number, number, number, number]));
      }
    }
  }
  const done = now >= row.endsAt;
  db.update(autoTrains)
    .set({ items: JSON.stringify(items), lastRunAt: Math.min(now, row.endsAt), ...(done ? { active: false, seen: false } : {}) })
    .where(eq(autoTrains.villageId, row.villageId))
    .run();
}

/** World tick: run every active plan once a minute (and one last time when it ends). */
export function processAutoTrains(db: DB, now: number): number {
  let runs = 0;
  for (const row of db.select().from(autoTrains).where(eq(autoTrains.active, true)).all()) {
    if (now - row.lastRunAt < AUTO_TRAIN_STEP_MS && now < row.endsAt) continue;
    const owner = db.select({ userId: villages.userId }).from(villages).where(eq(villages.id, row.villageId)).get();
    const lost = !owner || owner.userId !== row.userId;
    // Plans from the earlier per-hour version have no shares: end them so the player sets them up again.
    if (lost || parseItems(row.items).every((i) => i.share <= 0)) {
      db.update(autoTrains).set({ active: false, seen: lost }).where(eq(autoTrains.villageId, row.villageId)).run();
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
