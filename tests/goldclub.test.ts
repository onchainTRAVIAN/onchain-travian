import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { farmEntries, movements, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { createVillage, ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { setTroopsAt, troopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { creditBalance, grantCredits } from '../src/game/actions/credits.js';
import { sendTroops } from '../src/game/actions/troops.js';
import {
  GOLD_CLUB_PRICE,
  addFarmEntry,
  buyGoldClub,
  createFarmList,
  createTradeRoute,
  findCroppers,
  lastDueAt,
  lastRaidResult,
  processFarmLists,
  processTradeRoutes,
  raidFarmList,
  setEvasion,
  setFarmAuto,
} from '../src/game/actions/goldclub.js';
import { emptyUnits, totalUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let r: P;
let t: P;

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function rich(id: number) {
  db.update(villages).set({ wood: 1e5, clay: 1e5, iron: 1e5, crop: 1e5, resAt: clock.now() }).where(eq(villages.id, id)).run();
}
function units(slot: number, n: number) {
  const u = emptyUnits();
  u[slot] = n;
  return u;
}
function runUntilIdle() {
  for (let i = 0; i < 20; i++) {
    const next = db.select().from(movements).orderBy(movements.arriveAt).get();
    if (!next) return;
    clock.advance(Math.max(0, next.arriveAt - clock.now()) + 1);
    processDue(db, clock.now());
  }
}

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 2));
  ensureWorld(db);
  r = await registerPlayer(db, { username: 'Clubber', password: 'password123', tribe: 'romans' }, clock.now());
  t = await registerPlayer(db, { username: 'Farmed', password: 'password123', tribe: 'teutons' }, clock.now());
  for (const p of [r, t]) {
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    setSlot(p.villageId, 39, 'rally', 10);
    setSlot(p.villageId, 28, 'market', 10);
  }
});

describe('Gold Club', () => {
  it('needs the Gold Club, costs 500 Gold once', () => {
    expect(() => createFarmList(db, r.userId, r.villageId, 'Farms', clock.now())).toThrow(/Gold Club/);
    grantCredits(db, r.userId, 1000, 'test', 'gc-test', clock.now());
    const before = creditBalance(db, r.userId);
    buyGoldClub(db, r.userId, clock.now());
    expect(creditBalance(db, r.userId)).toBe(before - GOLD_CLUB_PRICE);
    expect(() => buyGoldClub(db, r.userId, clock.now())).toThrow(/already/);
  });

  it('raid all sends every target it has troops for and records the result', () => {
    const tv = db.select().from(villages).where(eq(villages.id, t.villageId)).get()!;
    const oasis = db.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId))).get()!;
    db.update(tiles).set({ animals: JSON.stringify(emptyUnits()) }).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).run();
    setTroopsAt(db, r.villageId, r.villageId, units(2, 60));
    const list = createFarmList(db, r.userId, r.villageId, 'Farms', clock.now());
    addFarmEntry(db, r.userId, list, tv.x, tv.y, units(2, 30));
    addFarmEntry(db, r.userId, list, oasis.x, oasis.y, units(2, 20));
    addFarmEntry(db, r.userId, list, oasis.x, oasis.y, units(2, 50)); // not enough left
    const out = raidFarmList(db, r.userId, list, clock.now());
    expect(out).toEqual({ sent: 2, skipped: 1 });
    expect(troopsAt(db, r.villageId, r.villageId)[2]).toBe(10);
    const skipped = db.select().from(farmEntries).where(eq(farmEntries.listId, list)).all().find((e) => e.lastNote);
    expect(skipped?.lastNote).toBeTruthy();
    runUntilIdle();
    const first = db.select().from(farmEntries).where(eq(farmEntries.listId, list)).all()[0]!;
    expect(lastRaidResult(db, r.userId, first)?.result).toMatch(/won|losses/);
  });

  it('auto-repeat raids again only after its interval', () => {
    const list = createFarmList(db, r.userId, r.villageId, 'Auto', clock.now());
    const oasis = db.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId))).get()!;
    addFarmEntry(db, r.userId, list, oasis.x, oasis.y, units(2, 5));
    setFarmAuto(db, r.userId, list, 15, clock.now());
    expect(() => setFarmAuto(db, r.userId, list, 7, clock.now())).toThrow();
    const count = () => db.select().from(movements).where(eq(movements.fromVillageId, r.villageId)).all().length;
    const before = count();
    processFarmLists(db, clock.now() + 60_000);
    expect(count()).toBe(before);
    processFarmLists(db, clock.now() + 16 * 60_000);
    expect(count()).toBeGreaterThan(before);
    setFarmAuto(db, r.userId, list, null, clock.now());
    runUntilIdle();
  });

  it('evasion moves the capital’s own troops out of an attack and brings them back', () => {
    db.update(users).set({ goldClub: true }).where(eq(users.id, t.userId)).run();
    setEvasion(db, t.userId, t.villageId, true);
    setTroopsAt(db, t.villageId, t.villageId, units(0, 100));
    setTroopsAt(db, r.villageId, r.villageId, units(2, 50));
    const mv = sendTroops(db, r.userId, r.villageId, { x: db.select().from(villages).where(eq(villages.id, t.villageId)).get()!.x, y: db.select().from(villages).where(eq(villages.id, t.villageId)).get()!.y, kind: 'raid', units: units(2, 50) }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    expect(totalUnits(troopsAt(db, t.villageId, t.villageId))).toBe(0);
    runUntilIdle();
    expect(troopsAt(db, t.villageId, t.villageId)[0]).toBe(100);
    setEvasion(db, t.userId, t.villageId, false);
  });

  it('trade routes deliver on their daily schedule', () => {
    const spot = db.select().from(tiles).where(and(eq(tiles.kind, 'field'), isNull(tiles.villageId))).all()[7]!;
    const second = createVillage(db, { userId: r.userId, name: 'Second', x: spot.x, y: spot.y, isCapital: false, now: clock.now() });
    rich(r.villageId);
    const hour = new Date(clock.now() + 3_600_000).getUTCHours();
    createTradeRoute(db, r.userId, r.villageId, second, { wood: 500, clay: 0, iron: 0, crop: 0 }, hour, 1, clock.now());
    expect(processTradeRoutes(db, clock.now())).toBe(0);
    clock.advance(3_600_000);
    expect(lastDueAt({ hour, perDay: 1 }, clock.now())).toBeLessThanOrEqual(clock.now());
    expect(processTradeRoutes(db, clock.now())).toBe(1);
    expect(processTradeRoutes(db, clock.now())).toBe(0);
    const trade = db.select().from(movements).where(and(eq(movements.kind, 'trade'), eq(movements.toVillageId, second))).get();
    expect(trade).toBeTruthy();
  });

  it('cropper finder lists only 9- and 15-croppers, nearest first', () => {
    const rows = findCroppers(db, 0, 0, 30);
    expect(rows.every((c) => c.layout === '3-3-3-9' || c.layout === '1-1-1-15')).toBe(true);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.distance).toBeGreaterThanOrEqual(rows[i - 1]!.distance);
  });
});

describe('Gold Club farm targets', () => {
  it('adds free oases nearby in one go and refuses empty valleys', async () => {
    const { addNearbyOases } = await import('../src/game/actions/goldclub.js');
    const list = createFarmList(db, r.userId, r.villageId, 'Oases', clock.now());
    const n = addNearbyOases(db, r.userId, list, 15, units(2, 3));
    expect(n).toBeGreaterThan(0);
    expect(addNearbyOases(db, r.userId, list, 15, units(2, 3))).toBe(0);
    expect(addNearbyOases(db, r.userId, list, 35, units(2, 3))).toBeGreaterThanOrEqual(0);
    expect(() => addNearbyOases(db, r.userId, list, 36, units(2, 3))).toThrow(/1 to 35/);
    const empty = db.select().from(tiles).where(and(eq(tiles.kind, 'field'), isNull(tiles.villageId))).get()!;
    expect(() => addFarmEntry(db, r.userId, list, empty.x, empty.y, units(2, 3))).toThrow(/village or oasis/);
  });
});

describe('Gold Club oasis filters', () => {
  it('adds only oases holding enough resources and removes poor ones', async () => {
    const { addNearbyOases, removeLowOases } = await import('../src/game/actions/goldclub.js');
    const { oasisStock, setOasisStock } = await import('../src/game/engine/oasis.js');
    const list = createFarmList(db, r.userId, r.villageId, 'Rich', clock.now());
    const free = db.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId))).all().slice(0, 40);
    // Make one oasis rich and the rest empty.
    for (const o of free) setOasisStock(db, o.x, o.y, { wood: 0, clay: 0, iron: 0, crop: 0 }, clock.now());
    const rich = free[0]!;
    setOasisStock(db, rich.x, rich.y, { wood: 900, clay: 900, iron: 0, crop: 0 }, clock.now());
    const added = addNearbyOases(db, r.userId, list, 35, units(2, 3), 1500, clock.now());
    const entries = () => db.select().from(farmEntries).where(eq(farmEntries.listId, list)).all();
    expect(entries().every((e) => {
      const t = db.select().from(tiles).where(and(eq(tiles.x, e.x), eq(tiles.y, e.y))).get()!;
      return oasisStock(db, t, clock.now()).wood + oasisStock(db, t, clock.now()).clay + oasisStock(db, t, clock.now()).iron + oasisStock(db, t, clock.now()).crop >= 1500;
    })).toBe(true);
    expect(added).toBe(entries().length);
    addNearbyOases(db, r.userId, list, 35, units(2, 3), 0, clock.now());
    const before = entries().length;
    const removed = removeLowOases(db, r.userId, list, 1500, clock.now());
    expect(removed).toBeGreaterThan(0);
    expect(entries().length).toBe(before - removed);
  });
});

describe('Finish-now price for queued training', () => {
  it('a small batch queued behind a big one costs only its own time', async () => {
    const { startTraining } = await import('../src/game/actions/train.js');
    const { finishTrainingNow, instantPrice, workLeft } = await import('../src/game/actions/credits.js');
    setSlot(r.villageId, 19, 'barracks', 1);
    db.update(villages).set({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6, resAt: clock.now() }).where(eq(villages.id, r.villageId)).run();
    db.update(slots).set({ level: 20 }).where(and(eq(slots.villageId, r.villageId), eq(slots.building, 'warehouse'))).run();
    const big = startTraining(db, r.userId, r.villageId, 'barracks', 0, 74, clock.now());
    const small = startTraining(db, r.userId, r.villageId, 'barracks', 0, 2, clock.now());
    const bigPrice = instantPrice(workLeft(big.startAt, big.startAt + big.total * big.perUnitMs, clock.now()));
    const smallPrice = instantPrice(workLeft(small.startAt, small.startAt + small.total * small.perUnitMs, clock.now()));
    expect(smallPrice).toBeLessThanOrEqual(bigPrice);
    grantCredits(db, r.userId, 10_000, 'test', 'gc-train', clock.now());
    const before = creditBalance(db, r.userId);
    expect(finishTrainingNow(db, r.userId, small.id, clock.now())).toBe(smallPrice);
    expect(creditBalance(db, r.userId)).toBe(before - smallPrice);
  });
});
