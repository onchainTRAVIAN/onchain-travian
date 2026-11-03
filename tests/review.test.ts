// Regression tests for the pre-beta code review (2026-11-03): one test per bug class that was fixed.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { db } from '../src/db/index.js';
import { autoTrains, buildOrders, creditsLedger, marketListings, movements, perks, sessions, slots, trainOrders, users, villages } from '../src/db/schema.js';
import { config } from '../src/config.js';
import { clock } from '../src/clock.js';
import { createApp } from '../src/app.js';
import { createVillage, ensureWorld, findSpawnTile } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { catchUp, setResources } from '../src/game/engine/state.js';
import { processDue } from '../src/game/engine/events.js';
import { conquerVillage } from '../src/game/engine/expansion.js';
import { buildOption, buildableOnEmptyPlot } from '../src/game/actions/build.js';
import { isBuildingId } from '../src/game/rules/buildings.js';
import { isTrainingSite } from '../src/game/actions/train.js';
import { buyListing, listResources, listingSig } from '../src/game/actions/goldmarket.js';
import { grantCredits, transferableBalance } from '../src/game/actions/credits.js';
import { weeklyStandings } from '../src/game/actions/weekly.js';
import { listBackups } from '../src/db/backup.js';
import { searchFaq } from '../src/game/rules/faq.js';
import { rpcErrorText } from '../src/crypto/chain.js';
import { csrfFrom, walletPlayer, walletSignIn } from './walletAuth.js';

const H = 3_600_000;
const T0 = Date.UTC(2026, 10, 10, 12);
const app = createApp();
let n = 0;

async function player(tribe: 'romans' | 'teutons' | 'gauls' = 'romans') {
  const r = await registerPlayer(db, { username: `Rev${++n}`, password: 'password123', tribe }, clock.now());
  return r;
}

/** A village frozen at T0 with an empty store (so storage caps never interfere). */
function fresh(villageId: number, crop = 0) {
  setResources(db, villageId, { wood: 0, clay: 0, iron: 0, crop });
  db.update(villages).set({ resAt: T0 }).where(eq(villages.id, villageId)).run();
}

const stock = (villageId: number) => db.select().from(villages).where(eq(villages.id, villageId)).get()!;

beforeAll(() => {
  clock.freeze(T0);
  ensureWorld(db);
});

afterAll(() => clock.reset());

describe('catch-up while nobody looks at the village', () => {
  it('a Gold boost that runs out in between counts only until it ran out', async () => {
    const [once, steps, none] = [await player(), await player(), await player()];
    for (const p of [once, steps]) {
      db.insert(perks).values({ userId: p.userId, kind: 'production_wood', value: 0.25, source: 'test', expiresAt: T0 + 2 * H, createdAt: T0 - H }).run();
    }
    for (const p of [once, steps, none]) fresh(p.villageId);
    catchUp(db, once.villageId, T0 + 4 * H);
    catchUp(db, steps.villageId, T0 + 2 * H);
    catchUp(db, steps.villageId, T0 + 4 * H);
    catchUp(db, none.villageId, T0 + 4 * H);
    expect(stock(once.villageId).wood).toBeCloseTo(stock(steps.villageId).wood, 6);
    // 2 of the 4 hours at +25%: 12.5% more than without the boost.
    expect(stock(once.villageId).wood).toBeCloseTo(stock(none.villageId).wood * 1.125, 6);
  });

  it('a boost bought later does not count for the time before it was bought', async () => {
    const [late, none] = [await player(), await player()];
    db.insert(perks).values({ userId: late.userId, kind: 'production_wood', value: 0.25, source: 'test', expiresAt: T0 + 10 * H, createdAt: T0 + 3 * H }).run();
    fresh(late.villageId);
    fresh(none.villageId);
    catchUp(db, late.villageId, T0 + 4 * H);
    catchUp(db, none.villageId, T0 + 4 * H);
    // Only the last of the 4 hours is boosted.
    expect(stock(late.villageId).wood).toBeCloseTo(stock(none.villageId).wood * (1 + 0.25 / 4), 6);
  });

  it('troops that finish training start eating when they join, not at the next visit', async () => {
    const [once, steps, none] = [await player(), await player(), await player()];
    for (const p of [once, steps]) {
      // 100 Legionnaires (1 crop/h each), one every 72 s: all done after 2 h.
      db.insert(trainOrders).values({ villageId: p.villageId, building: 'barracks', unitSlot: 0, total: 100, done: 0, perUnitMs: 72_000, startAt: T0 }).run();
    }
    for (const p of [once, steps, none]) fresh(p.villageId, 500);
    catchUp(db, once.villageId, T0 + 4 * H);
    for (let t = T0 + 6 * 60_000; t <= T0 + 4 * H; t += 6 * 60_000) catchUp(db, steps.villageId, t);
    catchUp(db, none.villageId, T0 + 4 * H);
    const eatenOnce = stock(none.villageId).crop - stock(once.villageId).crop;
    const eatenSteps = stock(none.villageId).crop - stock(steps.villageId).crop;
    // Exact: 100 units × 4 h minus their 1 h average wait = 300 crop. Before the fix: 0.
    expect(eatenSteps).toBeGreaterThan(290);
    expect(eatenOnce).toBeGreaterThan(270);
    expect(Math.abs(eatenOnce - eatenSteps)).toBeLessThan(30);
  });

  it('troops on the march eat at home until they arrive', async () => {
    const [marching, none] = [await player(), await player()];
    fresh(marching.villageId, 500);
    fresh(none.villageId, 500);
    const v = stock(marching.villageId);
    db.insert(movements)
      .values({ kind: 'return', fromVillageId: v.id, toVillageId: v.id, originX: v.x + 5, originY: v.y, toX: v.x, toY: v.y, units: JSON.stringify([100, 0, 0, 0, 0, 0, 0, 0, 0, 0]), departAt: T0, arriveAt: T0 + 3 * H })
      .run();
    processDue(db, T0 + 3 * H);
    catchUp(db, marching.villageId, T0 + 3 * H);
    catchUp(db, none.villageId, T0 + 3 * H);
    expect(stock(none.villageId).crop - stock(marching.villageId).crop).toBeCloseTo(300, 6);
  });
});

describe('player input that used to crash a page', () => {
  it('names like "constructor" are not buildings, troops or filters', async () => {
    for (const k of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(isBuildingId(k)).toBe(false);
      expect(isTrainingSite(k)).toBe(false);
    }
    const { agent } = await walletPlayer(app, 'ProtoPoker');
    expect((await agent.get('/reports?f=constructor')).status).toBe(200);
    expect((await agent.get('/troops/train?auto=constructor')).status).toBe(200);
    const page = await agent.get('/village');
    const res = await agent.post('/build').type('form').send({ _csrf: csrfFrom(page.text), slot: 20, building: 'constructor' });
    expect(res.status).toBe(303);
    expect((await agent.get('/help/buildings/constructor')).status).not.toBe(500);
  });

  it('search terms with regex symbols, huge ranks, odd CSRF tokens and broken JSON', async () => {
    expect(() => searchFaq('c++ wood++')).not.toThrow();
    expect((await request(app).get('/help?q=c%2B%2B')).status).toBe(200);
    expect((await request(app).get('/stats?rank=100000000000000000000')).status).toBe(200);
    const login = await request(app).get('/login');
    const cookie = (login.headers['set-cookie'] ?? []) as unknown as string[];
    const odd = await request(app).post('/logout').set('Cookie', cookie).type('form').send({ _csrf: 'é' + 'a'.repeat(31) });
    expect(odd.status).toBe(303);
    const broken = await request(app).post('/wallet/challenge').set('Content-Type', 'application/json').send('{"address": ');
    expect(broken.status).toBe(400);
  });
});

describe('Gold market', () => {
  it('refuses to buy an offer that changed after the buyer saw it', async () => {
    const seller = await player();
    const buyer = await player();
    grantCredits(db, buyer.userId, 100, 'test', `test:${buyer.userId}:paid`, clock.now());
    setResources(db, seller.villageId, { wood: 500, clay: 500, iron: 500, crop: 500 });
    const id = listResources(db, seller.userId, seller.villageId, { wood: 200, clay: 0, iron: 0, crop: 0 }, 10, clock.now());
    const seen = listingSig(db.select().from(marketListings).where(eq(marketListings.id, id)).get()!);
    db.update(marketListings).set({ price: 90 }).where(eq(marketListings.id, id)).run();
    expect(() => buyListing(db, buyer.userId, buyer.villageId, id, clock.now(), seen)).toThrow(/just changed/);
  });

  it('free Gold (tasks, medals) spent on the market stays non-transferable for the seller', async () => {
    const seller = await player();
    const alt = await player();
    grantCredits(db, alt.userId, 70, 'Task reward', `task:${alt.userId}:t1`, clock.now());
    expect(transferableBalance(db, alt.userId)).toBe(0);
    setResources(db, seller.villageId, { wood: 500, clay: 500, iron: 500, crop: 500 });
    const id = listResources(db, seller.userId, seller.villageId, { wood: 100, clay: 0, iron: 0, crop: 0 }, 70, clock.now());
    buyListing(db, alt.userId, alt.villageId, id, clock.now());
    const got = db.select().from(creditsLedger).where(eq(creditsLedger.userId, seller.userId)).all();
    expect(got.reduce((s, r) => s + r.amount, 0)).toBe(70);
    expect(transferableBalance(db, seller.userId)).toBe(0);
  });
});

describe('conquest', () => {
  it("closes the old owner's offers and automation in that village", async () => {
    const a = await player();
    const b = await player();
    const spot = findSpawnTile(db)!;
    const second = createVillage(db, { userId: a.userId, name: 'A2', x: spot.x, y: spot.y, isCapital: false, now: clock.now() });
    setResources(db, second, { wood: 500, clay: 500, iron: 500, crop: 500 });
    const id = listResources(db, a.userId, second, { wood: 300, clay: 0, iron: 0, crop: 0 }, 50, clock.now());
    db.insert(autoTrains).values({ villageId: second, userId: a.userId, items: '[]', hours: 2, startedAt: clock.now(), endsAt: clock.now() + 2 * H, lastRunAt: clock.now(), active: true }).run();
    db.transaction((tx) => conquerVillage(tx, second, b.userId, b.villageId, clock.now()));
    expect(db.select().from(marketListings).where(eq(marketListings.id, id)).get()?.status).toBe('cancelled');
    expect(db.select().from(autoTrains).where(eq(autoTrains.villageId, second)).get()).toBeUndefined();
    // The listed wood walks to A's capital.
    const back = db.select().from(movements).where(and(eq(movements.kind, 'delivery'), eq(movements.fromVillageId, a.villageId))).all();
    expect(back.some((m) => JSON.parse(m.loot ?? '{}').wood === 300)).toBe(true);
  });
});

describe('buildings', () => {
  it('a Rally Point destroyed to level 0 can be built again', async () => {
    const p = await player();
    db.update(slots).set({ building: null, level: 0 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 39))).run();
    const state = catchUp(db, p.villageId, clock.now())!;
    expect(buildableOnEmptyPlot(db, state, 39, clock.now()).map((o) => o.def.id)).toContain('rally');
  });

  it('a second Palace is refused while the first is still being built elsewhere', async () => {
    const p = await player();
    const spot = findSpawnTile(db)!;
    const other = createVillage(db, { userId: p.userId, name: 'P2', x: spot.x, y: spot.y, isCapital: false, now: clock.now() });
    db.insert(buildOrders).values({ villageId: other, slot: 30, building: 'palace', toLevel: 1, startAt: clock.now(), finishAt: clock.now() + H }).run();
    // Village 1 meets the Palace's requirements (Main Building 5, Embassy 1).
    db.update(slots).set({ level: 5 }).where(and(eq(slots.villageId, p.villageId), eq(slots.building, 'main'))).run();
    db.update(slots).set({ building: 'embassy', level: 1 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 21))).run();
    const state = catchUp(db, p.villageId, clock.now())!;
    expect(buildOption(db, state, 22, 'palace', clock.now()).reason).toMatch(/already have a Palace/);
  });
});

describe('accounts', () => {
  it('removing a wallet from ADMIN_WALLETS takes the Admin role away at its next request', async () => {
    const boss = privateKeyToAccount(generatePrivateKey());
    const saved = config.ADMIN_WALLETS;
    config.ADMIN_WALLETS = [boss.address.toLowerCase()];
    try {
      const { agent } = await walletPlayer(app, 'ExBoss', 'romans', boss);
      expect((await agent.get('/admin')).status).toBe(200);
      config.ADMIN_WALLETS = ['0x000000000000000000000000000000000000dead'];
      const after = await agent.get('/admin');
      expect(after.status).toBe(303);
      expect(db.select().from(users).where(eq(users.username, 'ExBoss')).get()?.role).toBe('player');
    } finally {
      config.ADMIN_WALLETS = saved;
    }
  });

  it('changing the wallet needs a fresh login and logs out other browsers', async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const { agent } = await walletPlayer(app, 'Mover', 'romans', owner);
    const second = request.agent(app);
    await walletSignIn(second, owner);
    const user = db.select().from(users).where(eq(users.username, 'Mover')).get()!;
    expect(db.select().from(sessions).where(eq(sessions.userId, user.id)).all().length).toBe(2);
    clock.advance(11 * 60_000);
    const page = await agent.get('/wallet');
    const stale = await agent.post('/wallet/challenge').set('Host', 'game.test').send({ _csrf: csrfFrom(page.text), address: privateKeyToAccount(generatePrivateKey()).address, purpose: 'link' });
    expect(stale.status).toBe(403);
    expect(stale.body.error).toMatch(/log in again/);
  });
});

describe('weekly medals', () => {
  it("an older account without a snapshot (e.g. unbanned mid-week) doesn't count its all-time totals", async () => {
    const ws = T0 + 30 * 24 * H;
    const old = await player();
    db.update(users).set({ offPoints: 99_999 }).where(eq(users.id, old.userId)).run();
    clock.freeze(ws + H);
    const newcomer = await player();
    db.update(users).set({ offPoints: 500 }).where(eq(users.id, newcomer.userId)).run();
    const ids = weeklyStandings(db, 'attack', ws).map((r) => r.userId);
    expect(ids).toContain(newcomer.userId);
    expect(ids).not.toContain(old.userId);
    clock.freeze(T0);
  });
});

describe('ops', () => {
  it("backups of different worlds in one folder never mix (game vs game-classic)", () => {
    const dir = mkdtempSync(join(tmpdir(), 'bk-'));
    mkdirSync(join(dir, 'backups'));
    for (const f of ['game-classic-20261101-1200.db.gz', 'game-20261102-1200.db.gz', 'game-20261102-1200.db.gz.part', 'game-x-20261102-1200.db.gz']) {
      writeFileSync(join(dir, 'backups', f), 'x');
    }
    const saved = config.DATABASE_PATH;
    config.DATABASE_PATH = join(dir, 'game.db');
    try {
      expect(listBackups().map((b) => b.name)).toEqual(['game-20261102-1200.db.gz']);
    } finally {
      config.DATABASE_PATH = saved;
      if (dir.startsWith(tmpdir())) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('RPC errors are logged without the keyed RPC address', () => {
    const saved = config.RPC_URL;
    config.RPC_URL = 'https://robinhood-mainnet.g.alchemy.com/v2/SECRETKEY123456';
    try {
      const err = Object.assign(new Error(`HTTP request failed.\n\nURL: ${config.RPC_URL}\nStatus: 429`), {});
      const text = rpcErrorText(err);
      expect(text).not.toContain('SECRETKEY123456');
      expect(rpcErrorText(new Error('URL: https://x.example/v2/ABCDEFGHIJKLMNOP failed'))).not.toContain('ABCDEFGHIJKLMNOP');
    } finally {
      config.RPC_URL = saved;
    }
  });
});
