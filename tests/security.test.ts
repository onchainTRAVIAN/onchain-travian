import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { marketOffers, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { capacityFor, cropUpkeep, loadVillage, setTroopsAt, stockOf } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { buyProtection, grantCredits } from '../src/game/actions/credits.js';
import { listResources, listTroops } from '../src/game/actions/goldmarket.js';
import { cancelOffer, createOffer } from '../src/game/actions/market.js';
import { releaseOasis } from '../src/game/actions/hero.js';
import { natarUser } from '../src/game/actions/endgame.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { buildOption } from '../src/game/actions/build.js';
import { emptyUnits } from '../src/game/rules/units.js';
import { res } from '../src/game/rules/resources.js';
import { createApp } from '../src/app.js';

type P = { userId: number; villageId: number };
let a: P;
let b: P;

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function stock(id: number, n: number) {
  db.update(villages).set({ wood: n, clay: n, iron: n, crop: n, resAt: clock.now() }).where(eq(villages.id, id)).run();
}

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 11, 1));
  ensureWorld(db);
  a = await registerPlayer(db, { username: 'Cheater', password: 'password123', tribe: 'romans' }, clock.now());
  b = await registerPlayer(db, { username: 'Honest', password: 'password123', tribe: 'teutons' }, clock.now());
});

describe('anti-cheat fixes (audit)', () => {
  it('nobody can register as the Natars (or other system names); the NPC is found by tribe', async () => {
    for (const n of ['Natars', 'NATARS', 'natars', 'Na.tars', 'Admin', 'System', 'Nature']) {
      await expect(registerPlayer(db, { username: n, password: 'password123', tribe: 'gauls' }, clock.now())).rejects.toThrow(/reserved/);
    }
    const id = natarUser(db, clock.now());
    expect(db.select().from(users).where(eq(users.id, id)).get()?.tribe).toBe('natars');
    expect(natarUser(db, clock.now())).toBe(id);
  });

  it('troops listed on the Gold market still eat crop, and listed resources are capped at storage', () => {
    const units = emptyUnits();
    units[0] = 500;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const before = cropUpkeep(db, loadVillage(db, a.villageId)!);
    listTroops(db, a.userId, a.villageId, units, 1_000_000, clock.now());
    expect(cropUpkeep(db, loadVillage(db, a.villageId)!)).toBe(before);
    // Listing, refilling and listing again would turn the market into extra storage.
    const cap = capacityFor(loadVillage(db, a.villageId)!);
    stock(a.villageId, cap.wood);
    listResources(db, a.userId, a.villageId, res(cap.wood, cap.clay, 0, 0), 1, clock.now());
    stock(a.villageId, cap.wood);
    expect(() => listResources(db, a.userId, a.villageId, res(cap.wood, cap.clay, cap.iron, 0), 1, clock.now())).toThrow(/at most/);
  });

  it('cancelling a marketplace offer cannot overfill the warehouse', () => {
    setSlot(a.villageId, 28, 'market', 10);
    stock(a.villageId, 800);
    const o = createOffer(db, a.userId, a.villageId, { res: 'wood', amount: 700 }, { res: 'clay', amount: 700 }, null, clock.now());
    stock(a.villageId, 800); // production refilled the warehouse meanwhile
    cancelOffer(db, a.userId, o.id, clock.now());
    const s = stockOf(loadVillage(db, a.villageId)!.village);
    expect(s.wood).toBeLessThanOrEqual(capacityFor(loadVillage(db, a.villageId)!).wood);
    expect(db.select().from(marketOffers).where(eq(marketOffers.id, o.id)).get()).toBeUndefined();
  });

  it('a level that costs more than the storage holds cannot be built, even with resources on hand', () => {
    setSlot(a.villageId, 26, 'main', 10);
    db.update(villages).set({ wood: 5000, clay: 5000, iron: 5000, crop: 5000, resAt: clock.now() }).where(eq(villages.id, a.villageId)).run();
    const opt = buildOption(db, loadVillage(db, a.villageId)!, 26, 'main', clock.now());
    expect(opt.canBuild).toBe(false);
    expect(opt.reason).toMatch(/Warehouse/);
  });

  it('attacking ends protection and starts the 8-hour wait before buying it again', () => {
    grantCredits(db, a.userId, 1000, 'test', 'sec-grant', clock.now());
    db.update(users).set({ protectedUntil: clock.now() + 20 * 3_600_000, boughtProtectionEnd: 0 }).where(eq(users.id, a.userId)).run();
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, b.userId)).run();
    const units = emptyUnits();
    units[0] = 5;
    setTroopsAt(db, a.villageId, a.villageId, units);
    setSlot(a.villageId, 39, 'rally', 1);
    const target = loadVillage(db, b.villageId)!.village;
    sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units }, clock.now());
    expect(() => buyProtection(db, a.userId, clock.now())).toThrow(/again in/);
  });

  it('releasing an oasis keeps its animals (no instant respawn to farm)', () => {
    const oasis = db.select().from(tiles).where(eq(tiles.kind, 'oasis')).get()!;
    db.update(tiles).set({ villageId: a.villageId, animals: JSON.stringify(emptyUnits()), animalsAt: clock.now() }).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).run();
    releaseOasis(db, a.userId, a.villageId, oasis.x, oasis.y, clock.now());
    const after = db.select().from(tiles).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).get()!;
    expect(JSON.parse(after.animals ?? '[]').every((n: number) => n === 0)).toBe(true);
  });

  it('redirects never leave the site', async () => {
    const app = createApp();
    const agent = request.agent(app);
    const page = await agent.get('/login');
    const token = /name="_csrf" value="([^"]+)"/.exec(page.text)?.[1] ?? '';
    const r = await agent.post('/logout').set('Referer', 'http://127.0.0.1//evil.example/x').type('form').send({ _csrf: token });
    expect(r.headers.location ?? '/').not.toMatch(/^\/\//);
  });
});
