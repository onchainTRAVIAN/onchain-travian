import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { autoTrains, slots, trainOrders, users } from '../src/db/schema.js';
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

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 5));
  ensureWorld(db);
  p = await registerPlayer(db, { username: 'Autotrainer', password: 'password123', tribe: 'romans' }, clock.now());
  db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  db.update(slots).set({ building: 'barracks', level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 20))).run();
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
    expect(() => startAutoTrain(db, p.userId, p.villageId, 9, { barracks_0: 10 }, clock.now())).toThrow(GameError);
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, {}, clock.now())).toThrow(GameError);
    const cap = autoUnitRows(db, state(), clock.now()).find((r) => r.key === 'barracks_0')!.capPerHour;
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, { barracks_0: cap * 2 }, clock.now())).toThrow(/busy/);
    expect(() => startAutoTrain(db, p.userId, p.villageId, 2, { stable_3: 5 }, clock.now())).toThrow(GameError);
  });

  it('keeps a 30-minute batch in the queue like a player, as many as it can when short, then stops', () => {
    const cap = autoUnitRows(db, state(), clock.now()).find((r) => r.key === 'barracks_0')!.capPerHour;
    const perHour = Math.max(4, Math.floor(cap / 2));
    const batch = Math.ceil(perHour / 2);
    const waiting = () =>
      db
        .select()
        .from(trainOrders)
        .where(eq(trainOrders.villageId, p.villageId))
        .all()
        .reduce((a, o) => a + o.total - o.done, 0);
    const item = () => parseItems(autoTrainOf(db, p.villageId)!.items)[0]!;
    const minutes = (n: number) => {
      for (let i = 0; i < n; i++) {
        clock.advance(AUTO_TRAIN_STEP_MS);
        processAutoTrains(db, clock.now());
      }
    };
    // Starting fills the queue at once with a batch of half an hour.
    startAutoTrain(db, p.userId, p.villageId, 4, { barracks_0: perHour }, clock.now());
    expect(item().trained).toBe(batch);
    expect(waiting()).toBe(batch);
    // Topped up in chunks that keep the pace: at most perHour × (elapsed + 30 min).
    minutes(5);
    expect(item().trained).toBe(batch);
    minutes(25);
    expect(item().trained).toBeGreaterThan(batch);
    expect(item().trained).toBeLessThanOrEqual(perHour);
    expect(waiting()).toBeGreaterThanOrEqual(0);

    // Only enough for 1 Legionnaire at the next top-up: it queues that one.
    const leg = autoUnitRows(db, state(), clock.now()).find((r) => r.key === 'barracks_0')!.cost;
    setResources(db, p.villageId, { wood: 0, clay: 0, iron: 0, crop: 0 });
    minutes(90); // queue runs dry, nothing affordable: the run falls behind
    const before = item().trained;
    expect(item().short).toBeGreaterThan(0);
    setResources(db, p.villageId, { wood: leg.wood, clay: leg.clay, iron: leg.iron, crop: leg.crop });
    minutes(1);
    expect(item().trained).toBe(before + 1);

    // Never more than perHour × hours in total; the run ends and tells the player once.
    setResources(db, p.villageId, RICH);
    minutes(240);
    const row = autoTrainOf(db, p.villageId)!;
    expect(row.active).toBe(false);
    expect(item().trained).toBeLessThanOrEqual(perHour * 4);
    expect(finishedAutoTrains(db, p.userId).length).toBe(1);
    markAutoTrainSeen(db, p.villageId);
    expect(finishedAutoTrains(db, p.userId).length).toBe(0);
    const after = item().trained;
    minutes(10);
    expect(item().trained).toBe(after);
    expect(queued()).toBeGreaterThanOrEqual(0);
  });

  it('can be stopped and restarted with the same settings', () => {
    startAutoTrain(db, p.userId, p.villageId, 3, { barracks_0: 1 }, clock.now());
    expect(autoTrainOf(db, p.villageId)!.active).toBe(true);
    stopAutoTrain(db, p.userId, p.villageId, clock.now());
    const row = db.select().from(autoTrains).where(eq(autoTrains.villageId, p.villageId)).get()!;
    expect(row.active).toBe(false);
    expect(parseItems(row.items)[0]!.perHour).toBe(1);
    expect(() => stopAutoTrain(db, p.userId, p.villageId, clock.now())).toThrow(GameError);
  });

  it('quick setup stays within budget and building time; formulas add up', () => {
    const rows = autoUnitRows(db, state(), clock.now());
    const income = { wood: 2000, clay: 2000, iron: 2000, crop: 1500 };
    const stock = { wood: 0, clay: 0, iron: 0, crop: 0 };
    const v = autoPreset(rows, 'offence', income, stock, 4);
    const keys = Object.keys(v);
    expect(keys.length).toBe(1); // one building → one unit
    const s = summarizePlan(rows, v, income, stock, 4);
    for (const k of ['wood', 'clay', 'iron'] as const) expect(s.costPerHour[k]).toBeLessThanOrEqual(income[k]);
    expect(s.load.barracks ?? 0).toBeLessThanOrEqual(1);
    expect(s.totalUnits).toBe(s.unitsPerHour * 4);
    expect(s.stockLastsH).toBe(Infinity);
    // Twice the cost of income: stock (1 h of the gap) runs out after 1 hour.
    const leg = rows.find((r) => r.key === 'barracks_0')!;
    const s2 = summarizePlan(rows, { barracks_0: 10 }, { wood: leg.cost.wood * 5, clay: 1e9, iron: 1e9, crop: 1e9 }, { wood: leg.cost.wood * 5, clay: 0, iron: 0, crop: 0 }, 4);
    expect(s2.stockLastsH).toBeCloseTo(1);
    expect(s2.extraUpkeep).toBe(10 * leg.unit.upkeep * 4);
  });
});
