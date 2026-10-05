import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { buildOrders, heroes, messages, movements, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { loadVillage, setTroopsAt, troopsAt } from '../src/game/engine/state.js';
import { conquerVillage } from '../src/game/engine/expansion.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { editListing, listResources } from '../src/game/actions/goldmarket.js';
import { finishConstructionNow, grantCredits, transferGold, transferableBalance } from '../src/game/actions/credits.js';
import { sendMessage } from '../src/game/actions/messages.js';
import { previewSend, sendTroops } from '../src/game/actions/troops.js';
import { trainOptions } from '../src/game/actions/train.js';
import { trainHero } from '../src/game/actions/hero.js';
import { oasisGarrison } from '../src/game/engine/oasisTroops.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let a: P;
let b: P;
const setSlot = (villageId: number, slot: number, building: string | null, level: number) =>
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
const rich = (id: number) => db.update(villages).set({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6, resAt: clock.now() }).where(eq(villages.id, id)).run();
const vil = (id: number) => db.select().from(villages).where(eq(villages.id, id)).get()!;
const units = (slot: number, n: number) => {
  const u = emptyUnits();
  u[slot] = n;
  return u;
};
const arrive = (mv: { arriveAt: number }) => {
  clock.advance(mv.arriveAt - clock.now() + 1);
  processDue(db, clock.now());
};

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 10));
  ensureWorld(db);
  a = await registerPlayer(db, { username: 'Auditor', password: 'password123', tribe: 'romans' }, clock.now());
  b = await registerPlayer(db, { username: 'Victim', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [a, b]) {
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    setSlot(p.villageId, 39, 'rally', 10);
    setSlot(p.villageId, 28, 'market', 10);
    setSlot(p.villageId, 29, 'warehouse', 20);
    setSlot(p.villageId, 30, 'granary', 20);
  }
});

describe('loopholes closed', () => {
  it('lowering a Gold-market offer walks the goods back instead of returning them instantly', () => {
    const before = vil(a.villageId);
    const id = listResources(db, a.userId, a.villageId, { wood: 10_000, clay: 0, iron: 0, crop: 0 }, 50, clock.now());
    expect(vil(a.villageId).wood).toBeLessThan(before.wood);
    editListing(db, a.userId, id, { price: 50, goods: { wood: 1000, clay: 0, iron: 0, crop: 0 } }, clock.now());
    expect(vil(a.villageId).wood).toBe(before.wood - 10_000); // nothing back yet
    const back = db.select().from(movements).where(and(eq(movements.kind, 'delivery'), eq(movements.toVillageId, a.villageId))).get()!;
    expect(JSON.parse(back.loot ?? '{}').wood).toBe(9000);
    expect(back.arriveAt).toBeGreaterThan(clock.now() + 60_000);
  });

  it('the World Wonder and demolitions cannot be finished with Gold', () => {
    grantCredits(db, a.userId, 500, 'test', `audit:${a.userId}`, clock.now());
    db.insert(buildOrders).values({ villageId: a.villageId, slot: 31, building: 'wonder', toLevel: 1, demolish: false, startAt: clock.now(), finishAt: clock.now() + 3_600_000 }).run();
    const o = db.select().from(buildOrders).where(eq(buildOrders.building, 'wonder')).get()!;
    expect(() => finishConstructionNow(db, a.userId, o.id, clock.now())).toThrow(/World Wonder/);
    db.delete(buildOrders).where(eq(buildOrders.id, o.id)).run();
  });

  it('Gold from tasks, medals and gifts cannot be passed to other accounts', () => {
    grantCredits(db, b.userId, 30, 'Task: test', `task:${b.userId}:x`, clock.now());
    grantCredits(db, b.userId, 100, 'Medal', `medal:1:attack:1`, clock.now());
    grantCredits(db, b.userId, 20, 'Bought', `deposit:test:${b.userId}`, clock.now());
    expect(transferableBalance(db, b.userId)).toBe(20);
    expect(() => transferGold(db, b.userId, 'Auditor', 50, '', clock.now())).toThrow(/stays on your account/);
    transferGold(db, b.userId, 'Auditor', 20, '', clock.now());
  });

  it('messages respect mutes and a cooldown', () => {
    sendMessage(db, a.userId, 'Victim', 'hi', 'one', clock.now());
    expect(() => sendMessage(db, a.userId, 'Victim', 'hi', 'two', clock.now() + 1000)).toThrow(/wait/);
    db.update(users).set({ mutedUntil: clock.now() + 3_600_000 }).where(eq(users.id, a.userId)).run();
    expect(() => sendMessage(db, a.userId, 'Victim', 'hi', 'three', clock.now() + 60_000)).toThrow(/muted/);
    db.update(users).set({ mutedUntil: 0 }).where(eq(users.id, a.userId)).run();
    expect(db.select().from(messages).where(eq(messages.fromUserId, a.userId)).all().length).toBeGreaterThanOrEqual(1);
  });
});

describe('rules fixed', () => {
  it('Horse Drinking Trough: 1% faster cavalry training per level', () => {
    setSlot(a.villageId, 32, 'stable', 5);
    const st0 = loadVillage(db, a.villageId)!;
    db.update(villages).set({ research: '[1,1,1,1,1,1,1,1,1,1]' }).where(eq(villages.id, a.villageId)).run();
    const t0 = trainOptions(db, loadVillage(db, a.villageId)!, 'stable', clock.now()).find((o) => o.slot === 3)!.timeMs;
    setSlot(a.villageId, 33, 'horsetrough', 20);
    const t20 = trainOptions(db, loadVillage(db, a.villageId)!, 'stable', clock.now()).find((o) => o.slot === 3)!.timeMs;
    expect(t20 / t0).toBeCloseTo(0.8, 2);
    expect(st0).toBeTruthy();
  });

  it('a running upgrade finishes one level above where the building stands now (siege is not undone)', () => {
    setSlot(a.villageId, 40, 'citywall', 5);
    db.insert(buildOrders).values({ villageId: a.villageId, slot: 40, building: 'citywall', toLevel: 6, demolish: false, startAt: clock.now(), finishAt: clock.now() + 1000 }).run();
    setSlot(a.villageId, 40, 'citywall', 2); // rams hit it meanwhile
    clock.advance(2000);
    processDue(db, clock.now());
    expect(db.select().from(slots).where(and(eq(slots.villageId, a.villageId), eq(slots.slot, 40))).get()!.level).toBe(3);
  });

  it('troops that arrive at a village you conquered meanwhile become reinforcements', () => {
    setTroopsAt(db, a.villageId, a.villageId, units(0, 200));
    const mv = sendTroops(db, a.userId, a.villageId, { x: vil(b.villageId).x, y: vil(b.villageId).y, kind: 'raid', units: units(0, 100) }, clock.now());
    conquerVillage(db, b.villageId, a.userId, a.villageId, clock.now());
    arrive(mv);
    expect(troopsAt(db, b.villageId, a.villageId)).toEqual(units(0, 100));
    expect(vil(b.villageId).userId).toBe(a.userId);
    // give it back for the next tests
    conquerVillage(db, b.villageId, b.userId, b.villageId, clock.now());
    db.update(villages).set({ isCapital: true, loyalty: 100 }).where(eq(villages.id, b.villageId)).run();
    rich(b.villageId);
    db.delete(movements).where(eq(movements.fromVillageId, a.villageId)).run();
    setTroopsAt(db, a.villageId, a.villageId, units(0, 200));
  });

  it("a hero out on a mission when its village falls dies (it can be revived) instead of getting stuck", () => {
    setSlot(b.villageId, 34, 'heromansion', 1);
    db.update(villages).set({ research: '[1,1,0,0,0,0,0,0,0,0]' }).where(eq(villages.id, b.villageId)).run();
    setTroopsAt(db, b.villageId, b.villageId, units(0, 50));
    trainHero(db, b.userId, b.villageId, 0, clock.now());
    db.update(heroes).set({ status: 'home', locationId: b.villageId, reviveAt: null, health: 100, healthAt: clock.now() }).where(eq(heroes.userId, b.userId)).run();
    const mv = sendTroops(db, b.userId, b.villageId, { x: vil(a.villageId).x, y: vil(a.villageId).y, kind: 'reinforce', units: units(0, 10), hero: true }, clock.now());
    expect(db.select().from(heroes).where(eq(heroes.userId, b.userId)).get()!.status).toBe('moving');
    conquerVillage(db, b.villageId, a.userId, a.villageId, clock.now());
    expect(db.select().from(movements).where(eq(movements.id, mv.id)).get()).toBeUndefined();
    expect(db.select().from(heroes).where(eq(heroes.userId, b.userId)).get()!.status).toBe('dead');
    conquerVillage(db, b.villageId, b.userId, b.villageId, clock.now());
    db.update(villages).set({ isCapital: true, loyalty: 100 }).where(eq(villages.id, b.villageId)).run();
    rich(b.villageId);
  });

  it('a protected player’s oasis cannot be attacked; a garrison defends a held oasis; raids loot the holder’s village', () => {
    const bv = vil(b.villageId);
    const oasis = db.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, b.villageId))).get()
      ?? db.select().from(tiles).where(eq(tiles.kind, 'oasis')).all().sort((p, q) => Math.hypot(p.x - bv.x, p.y - bv.y) - Math.hypot(q.x - bv.x, q.y - bv.y))[0]!;
    db.update(tiles).set({ villageId: b.villageId, oasisLoyalty: 100, oasisLoyaltyAt: clock.now(), animals: JSON.stringify(emptyUnits()) }).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).run();
    // protection covers the oasis
    db.update(users).set({ protectedUntil: clock.now() + 3_600_000 }).where(eq(users.id, b.userId)).run();
    expect(() => previewSend(db, a.userId, a.villageId, { x: oasis.x, y: oasis.y, kind: 'raid', units: units(0, 10) }, clock.now())).toThrow(/protection/);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, b.userId)).run();
    // the holder garrisons it
    setTroopsAt(db, b.villageId, b.villageId, units(0, 300));
    const re = sendTroops(db, b.userId, b.villageId, { x: oasis.x, y: oasis.y, kind: 'reinforce', units: units(0, 300) }, clock.now());
    arrive(re);
    expect(oasisGarrison(db, oasis.x, oasis.y)[0]?.units[0]).toBe(300);
    // a small raid loses against the garrison
    setTroopsAt(db, a.villageId, a.villageId, units(0, 20));
    const raid = sendTroops(db, a.userId, a.villageId, { x: oasis.x, y: oasis.y, kind: 'raid', units: units(0, 20) }, clock.now());
    const stockBefore = vil(b.villageId).wood;
    arrive(raid);
    expect(oasisGarrison(db, oasis.x, oasis.y)[0]?.units[0]).toBeGreaterThan(250);
    expect(vil(b.villageId).wood).toBe(stockBefore);
    // a big raid wins and loots the holder's village
    setTroopsAt(db, a.villageId, a.villageId, units(2, 2000));
    const big = sendTroops(db, a.userId, a.villageId, { x: oasis.x, y: oasis.y, kind: 'raid', units: units(2, 2000) }, clock.now());
    arrive(big);
    expect(vil(b.villageId).wood).toBeLessThan(stockBefore);
  });
});

describe('world settings', () => {
  it('MERCHANT_MULTIPLIER gives that many merchants per Marketplace level', async () => {
    const { config } = await import('../src/config.js');
    const { merchantInfo } = await import('../src/game/actions/market.js');
    const st = loadVillage(db, a.villageId)!;
    const base = merchantInfo(db, st).total;
    const old = config.MERCHANT_MULTIPLIER;
    (config as { MERCHANT_MULTIPLIER: number }).MERCHANT_MULTIPLIER = 10;
    expect(merchantInfo(db, st).total).toBe(base * 10);
    (config as { MERCHANT_MULTIPLIER: number }).MERCHANT_MULTIPLIER = old;
  });
});

describe('reports on a tile', () => {
  it('lists your reports about a village or oasis, for both attacker and defender', async () => {
    const { reportsAt, reportPlaces } = await import('../src/game/engine/reports.js');
    const av = vil(a.villageId);
    const bv = vil(b.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, b.userId)).run();
    setTroopsAt(db, a.villageId, a.villageId, units(0, 30));
    const mv = sendTroops(db, a.userId, a.villageId, { x: bv.x, y: bv.y, kind: 'raid', units: units(0, 30) }, clock.now());
    arrive(mv);
    // The attacker sees it on the target's tile, the defender on the attacker's tile.
    expect(reportsAt(db, a.userId, bv.x, bv.y).some((r) => r.kind.startsWith('attack'))).toBe(true);
    expect(reportsAt(db, b.userId, av.x, av.y).some((r) => r.kind.startsWith('defense'))).toBe(true);
    expect(reportsAt(db, a.userId, bv.x + 1, bv.y)).toEqual([]);
    expect(reportPlaces({ type: 'settle', success: true, x: 3, y: 4 }).to).toEqual({ x: 3, y: 4 });
  });
});

describe('map village pictures', () => {
  it('change at 250, 500, 1,000 and 1,500 population', async () => {
    const { VILLAGE_TIERS, villageTier } = await import('../src/web/views/map.js');
    expect([...VILLAGE_TIERS]).toEqual([250, 500, 1000, 1500]);
    expect(villageTier(50)).toBe(1);
    expect(villageTier(249)).toBe(1);
    expect(villageTier(250)).toBe(2);
    expect(villageTier(500)).toBe(3);
    expect(villageTier(999)).toBe(3);
    expect(villageTier(1000)).toBe(5);
    expect(villageTier(1500)).toBe(6);
  });
});

describe('attack again', () => {
  it('links your own attack reports to the send form with the same troops, and finishes demolitions with Gold', async () => {
    const { againLink } = await import('../src/web/views/reports.js');
    const side = (userId: number) => ({ userId, username: 'x', villageId: 1, villageName: 'v', x: 1, y: 2, tribe: 'romans' as const, units: [5, 0, 7, 0, 0, 0, 0, 0, 0, 0], losses: emptyUnits() });
    const r = { type: 'battle' as const, mode: 'raid' as const, attacker: side(a.userId), defenders: [{ ...side(b.userId), x: 9, y: -4 }], attackerWon: true, defendersHidden: false, loot: { wood: 0, clay: 0, iron: 0, crop: 0 }, capacity: 0, attackPower: 1, defensePower: 1 };
    expect(againLink(r, a.userId)).toBe('/troops/send?x=9&y=-4&kind=raid&u0=5&u2=7');
    expect(againLink(r, b.userId)).toBeNull();
    // demolitions can be finished with Gold
    grantCredits(db, a.userId, 100, 'test', `audit-demo:${a.userId}`, clock.now());
    db.insert(buildOrders).values({ villageId: a.villageId, slot: 29, building: 'warehouse', toLevel: 19, demolish: true, startAt: clock.now(), finishAt: clock.now() + 3_600_000 }).run();
    const o = db.select().from(buildOrders).where(and(eq(buildOrders.villageId, a.villageId), eq(buildOrders.demolish, true))).get()!;
    expect(finishConstructionNow(db, a.userId, o.id, clock.now())).toBeGreaterThan(0);
  });
});
