import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, trainOrders, users } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { catchUp, setResources } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import {
  AUTO_TRAIN_STEP_MS,
  autoPreset,
  autoTrainOf,
  autoUnitRows,
  finishedAutoTrains,
  markAutoTrainSeen,
  parseItems,
  processAutoTrains,
  startAutoTrain,
  stopAutoTrain,
  splitPercent,
  summarizePlan,
} from '../src/game/actions/autotrain.js';
import { GameError } from '../src/game/errors.js';

let p: { userId: number; villageId: number };
const RICH = { wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6 };
const queued = () =>
  db
    .select()
    .from(trainOrders)
    .where(eq(trainOrders.villageId, p.villageId))
    .all()
    .reduce((a, o) => a + o.total, 0);
const state = () => catchUp(db, p.villageId, clock.now())!;
const clearQueue = () => db.delete(trainOrders).where(eq(trainOrders.villageId, p.villageId)).run();

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 5));
  ensureWorld(db);
  p = await registerPlayer(db, { username: 'Autotrainer', password: 'password123', tribe: 'romans' }, clock.now());
  db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  db.update(slots).set({ building: 'barracks', level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 20))).run();
  db.update(slots).set({ building: 'warehouse', level: 20 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 21))).run();
  db.update(slots).set({ building: 'granary', level: 20 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 22))).run();
  setResources(db, p.villageId, RICH);
});

describe('Auto training', () => {
  it('lists trainable units and never settlers or chiefs', () => {
    const rows = autoUnitRows(db, state(), clock.now());
    expect(rows.some((r) => r.key === 'barracks_0' && r.available)).toBe(true);
    expect(rows.every((r) => r.unit.type !== 'settler' && r.unit.type !== 'chief')).toBe(true);
    expect(rows.find((r) => r.key === 'barracks_0')!.capPerHour).toBeGreaterThan(0);
  });

  it('rejects bad plans', () => {
    expect(() => startAutoTrain(db, p.userId, p.villageId, 9, { barracks_0: 50 }, clock.now())).toThrow(GameError);
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, {}, clock.now())).toThrow(GameError);
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, { barracks_0: 70, barracks_1: 40 }, clock.now())).toThrow(/110%/);
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, { stable_3: 5 }, clock.now())).toThrow(GameError);
  });

  it('spends the stock by the shares right away and keeps the rest; then spends new resources each minute', () => {
    const rows = autoUnitRows(db, state(), clock.now());
    const leg = rows.find((r) => r.key === 'barracks_0')!;
    clearQueue();
    // Stock for exactly 20 Legionnaires; 50% share → 10 right away, half the stock stays.
    const stock = { wood: leg.cost.wood * 20, clay: leg.cost.clay * 20, iron: leg.cost.iron * 20, crop: leg.cost.crop * 20 };
    setResources(db, p.villageId, stock);
    startAutoTrain(db, p.userId, p.villageId, 8, { barracks_0: 50 }, clock.now());
    const item = () => parseItems(autoTrainOf(db, p.villageId)!.items)[0]!;
    expect(item().trained).toBe(10);
    expect(Math.round(state().village.wood)).toBeGreaterThanOrEqual(Math.floor(stock.wood / 2) - leg.cost.wood);
    // Next minute: 50% of what is there now (the kept half + a minute of income).
    clock.advance(AUTO_TRAIN_STEP_MS);
    processAutoTrains(db, clock.now());
    expect(item().trained).toBeGreaterThanOrEqual(14);
    // Merged into one queue line instead of one order per minute.
    expect(db.select().from(trainOrders).where(eq(trainOrders.villageId, p.villageId)).all().length).toBe(1);
    stopAutoTrain(db, p.userId, p.villageId, clock.now());
  });

  it('with 100% it uses nearly everything, split between troops by share', () => {
    const rows = autoUnitRows(db, state(), clock.now());
    const leg = rows.find((r) => r.key === 'barracks_0')!;
    clearQueue();
    setResources(db, p.villageId, RICH);
    const before = queued();
    startAutoTrain(db, p.userId, p.villageId, 8, { barracks_0: 100 }, clock.now());
    const left = state().village;
    // Whatever stays is less than one more Legionnaire in its scarcest resource (or the run's time is full).
    const timeFull = queued() - before >= Math.floor((8 * 3_600_000) / leg.timeMs) - 1;
    expect(timeFull || ['wood', 'clay', 'iron', 'crop'].some((k) => (left as unknown as Record<string, number>)[k]! < (leg.cost as unknown as Record<string, number>)[k]!)).toBe(true);
    stopAutoTrain(db, p.userId, p.villageId, clock.now());
  });

  it('runs out after its hours, never queues past the end, and tells the player once', () => {
    clearQueue();
    setResources(db, p.villageId, RICH);
    startAutoTrain(db, p.userId, p.villageId, 1, { barracks_0: 100 }, clock.now());
    const end = autoTrainOf(db, p.villageId)!.endsAt;
    const lastEnd = () => db.select().from(trainOrders).where(eq(trainOrders.villageId, p.villageId)).all().reduce((m, o) => Math.max(m, o.startAt + o.total * o.perUnitMs), 0);
    expect(lastEnd()).toBeLessThanOrEqual(end);
    for (let i = 0; i < 70; i++) {
      clock.advance(AUTO_TRAIN_STEP_MS);
      processAutoTrains(db, clock.now());
    }
    expect(autoTrainOf(db, p.villageId)!.active).toBe(false);
    expect(finishedAutoTrains(db, p.userId).length).toBe(1);
    markAutoTrainSeen(db, p.villageId);
    expect(finishedAutoTrains(db, p.userId).length).toBe(0);
  });

  it('quick setup splits 100% across buildings; forecasts add up', () => {
    const rows = autoUnitRows(db, state(), clock.now());
    const v = autoPreset(rows, 'offence');
    expect(Object.values(v).reduce((a, b) => a + b, 0)).toBe(100);
    expect(splitPercent({ a: 1, b: 1, c: 1 })).toEqual({ a: 34, b: 33, c: 33 });
    const leg = rows.find((r) => r.key === 'barracks_0')!;
    const income = { wood: leg.cost.wood * 10, clay: 1e9, iron: 1e9, crop: 1e9 };
    const s = summarizePlan(rows, { barracks_0: 50 }, income, { wood: leg.cost.wood * 4, clay: 1e9, iron: 1e9, crop: 1e9 }, 3);
    expect(s.units[0]!.perHour).toBe(5);
    expect(s.units[0]!.now).toBe(2);
    expect(s.units[0]!.limitedBy).toBe('wood');
    expect(s.totalUnits).toBe(2 + 5 * 3);
    expect(s.assigned).toBe(50);
  });
});
