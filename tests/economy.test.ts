import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { allianceMembers, alliances, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { createVillage, ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { cropUpkeep, loadVillage, setTroopsAt, troughDiscount } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { startBuild, startDemolish } from '../src/game/actions/build.js';
import { acceptOffer, createOffer, listOffers } from '../src/game/actions/market.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let r: P;
let t: P;

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function rich(id: number) {
  db.update(villages).set({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6, resAt: clock.now() }).where(eq(villages.id, id)).run();
}
function finish() {
  clock.advance(30 * 86_400_000);
  processDue(db, clock.now());
}
const levelAt = (v: number, slot: number) => loadVillage(db, v)?.slots.find((s) => s.slot === slot);

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 9, 1));
  ensureWorld(db);
  r = await registerPlayer(db, { username: 'Augustus', password: 'password123', tribe: 'romans' }, clock.now());
  t = await registerPlayer(db, { username: 'Odoacer', password: 'password123', tribe: 'teutons' }, clock.now());
  for (const p of [r, t]) {
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  }
});

describe('classic T3.6 buildings & economy', () => {
  it('a Palace can be built in any village and makes it the capital', () => {
    const spot = db.select().from(tiles).where(and(eq(tiles.kind, 'field'), isNull(tiles.villageId))).all()[3];
    if (!spot) throw new Error('no tile');
    const second = createVillage(db, { userId: r.userId, name: 'Second', x: spot.x, y: spot.y, isCapital: false, now: clock.now() });
    // Old capital: a capital-only Stonemason and a field above 10.
    setSlot(r.villageId, 27, 'stonemason', 5);
    setSlot(r.villageId, 1, levelAt(r.villageId, 1)?.building ?? 'woodcutter', 15);
    rich(second);
    setSlot(second, 26, 'main', 5);
    setSlot(second, 25, 'embassy', 1);
    startBuild(db, r.userId, second, 30, 'palace', clock.now());
    finish();
    expect(loadVillage(db, second)?.village.isCapital).toBe(true);
    expect(loadVillage(db, r.villageId)?.village.isCapital).toBe(false);
    expect(levelAt(r.villageId, 27)?.building).toBeNull();
    expect(levelAt(r.villageId, 1)?.level).toBe(10);
  });

  it('demolishes one level at a time from Main Building 10, without a builder', () => {
    setSlot(t.villageId, 26, 'main', 10);
    setSlot(t.villageId, 30, 'granary', 2);
    expect(() => startDemolish(db, t.userId, t.villageId, 31, clock.now())).toThrow(/nothing to demolish/);
    startDemolish(db, t.userId, t.villageId, 30, clock.now());
    expect(() => startDemolish(db, t.userId, t.villageId, 30, clock.now())).toThrow(/already being demolished/);
    startBuild(db, t.userId, t.villageId, 1, undefined, clock.now()); // builders stay free
    finish();
    expect(levelAt(t.villageId, 30)?.level).toBe(1);
    startDemolish(db, t.userId, t.villageId, 30, clock.now());
    finish();
    expect(levelAt(t.villageId, 30)?.building).toBeNull();
    setSlot(t.villageId, 26, 'main', 9);
    setSlot(t.villageId, 30, 'granary', 2);
    expect(() => startDemolish(db, t.userId, t.villageId, 30, clock.now())).toThrow(/level 10/);
  });

  it('the Horse Drinking Trough saves crop for Roman cavalry', () => {
    const cav = emptyUnits();
    cav[3] = 10;
    cav[4] = 10;
    cav[5] = 10;
    expect([troughDiscount(9, cav), troughDiscount(10, cav), troughDiscount(15, cav), troughDiscount(20, cav)]).toEqual([0, 10, 20, 30]);
    const v = loadVillage(db, r.villageId)!.village.id;
    setTroopsAt(db, v, v, cav);
    const before = cropUpkeep(db, loadVillage(db, v)!);
    setSlot(v, 33, 'horsetrough', 20);
    expect(cropUpkeep(db, loadVillage(db, v)!)).toBe(before - 30);
  });

  it('alliance-only offers are hidden from and refused to outsiders', () => {
    setSlot(t.villageId, 28, 'market', 10);
    setSlot(r.villageId, 28, 'market', 10);
    rich(t.villageId);
    rich(r.villageId);
    expect(() => createOffer(db, t.userId, t.villageId, { res: 'wood', amount: 100 }, { res: 'clay', amount: 100 }, null, clock.now(), true)).toThrow(/alliance/);
    const a = db.insert(alliances).values({ name: 'Goths', tag: 'GOT', tagLower: 'got', founderId: t.userId, createdAt: clock.now() }).returning().get();
    db.insert(allianceMembers).values({ userId: t.userId, allianceId: a.id, role: 'leader', joinedAt: clock.now() }).run();
    const offer = createOffer(db, t.userId, t.villageId, { res: 'wood', amount: 100 }, { res: 'clay', amount: 100 }, null, clock.now(), true);
    const view = loadVillage(db, r.villageId)!;
    expect(listOffers(db, view, false).some((o) => o.id === offer.id)).toBe(false);
    expect(() => acceptOffer(db, r.userId, r.villageId, offer.id, clock.now())).toThrow(/alliance/);
    db.insert(allianceMembers).values({ userId: r.userId, allianceId: a.id, role: 'member', joinedAt: clock.now() }).run();
    expect(listOffers(db, view, false).some((o) => o.id === offer.id)).toBe(true);
    acceptOffer(db, r.userId, r.villageId, offer.id, clock.now());
  });

  it('a Rally Point handles 5 troop movements per level', () => {
    setSlot(t.villageId, 39, 'rally', 1);
    const one = emptyUnits();
    one[0] = 1;
    setTroopsAt(db, t.villageId, t.villageId, (() => { const u = emptyUnits(); u[0] = 100; return u; })());
    const target = loadVillage(db, r.villageId)!.village;
    for (let i = 0; i < 5; i++) sendTroops(db, t.userId, t.villageId, { x: target.x, y: target.y, kind: 'reinforce', units: one }, clock.now());
    expect(() => sendTroops(db, t.userId, t.villageId, { x: target.x, y: target.y, kind: 'reinforce', units: one }, clock.now())).toThrow(/5 troop movements/);
  });
});
