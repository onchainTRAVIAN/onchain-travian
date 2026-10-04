import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { allianceMembers, alliances, artifacts, buildOrders, slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { cropUpkeep, loadVillage, setTroopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { buildOption } from '../src/game/actions/build.js';
import { trainHero } from '../src/game/actions/hero.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { artifactValue, plansHeld, releaseArtifacts, releaseWonders, winner, wonderBlocker } from '../src/game/actions/endgame.js';
import { buildCost, BUILDINGS } from '../src/game/rules/buildings.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let r: P;
let g: P;

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function rich(id: number) {
  db.update(villages).set({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6, resAt: clock.now() }).where(eq(villages.id, id)).run();
}
function arrive(mv: { arriveAt: number }) {
  clock.advance(mv.arriveAt - clock.now() + 1);
  processDue(db, clock.now());
}

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 1));
  ensureWorld(db);
  r = await registerPlayer(db, { username: 'Trajan', password: 'password123', tribe: 'romans' }, clock.now());
  g = await registerPlayer(db, { username: 'Brennus2', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [r, g]) {
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  }
});

describe('T3.6 endgame', () => {
  it('World Wonder costs follow the T3 table (capped at 1M per resource)', () => {
    const ww = BUILDINGS.wonder;
    expect(buildCost(ww, 1)).toEqual({ wood: 66700, clay: 69050, iron: 72200, crop: 13200 });
    expect(buildCost(ww, 100)).toEqual({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 193630 });
    expect(Math.max(...Object.values(buildCost(ww, 99)))).toBeLessThanOrEqual(1e6);
  });

  it('releases Natar strongholds with artifacts in their Treasuries, once', () => {
    const n = releaseArtifacts(db, clock.now());
    expect(n).toBeGreaterThan(15);
    expect(releaseArtifacts(db, clock.now())).toBe(0);
    const natars = db.select().from(users).where(eq(users.tribe, 'natars')).get();
    expect(natars?.username).toBe('Natars');
    expect(db.select().from(artifacts).all().every((a) => a.villageId !== null && a.capturedAt === null)).toBe(true);
  });

  it('a hero captures an artifact after the Treasury is destroyed, and it starts working after a delay', () => {
    const a = db.select().from(artifacts).where(and(eq(artifacts.kind, 'boots'), eq(artifacts.size, 'small'))).get()!;
    const target = loadVillage(db, a.villageId!)!.village;
    // Weaken the stronghold for the test and knock down its Treasury.
    setTroopsAt(db, target.id, target.id, emptyUnits());
    setSlot(target.id, 27, 'treasury', 0);
    // Attacker: Treasury 10, a hero, an army.
    setSlot(r.villageId, 30, 'heromansion', 1);
    setSlot(r.villageId, 31, 'treasury', 10);
    setSlot(r.villageId, 39, 'rally', 10);
    const one = emptyUnits();
    one[0] = 1;
    setTroopsAt(db, r.villageId, r.villageId, one);
    const h = trainHero(db, r.userId, r.villageId, 0, clock.now());
    clock.advance((h.reviveAt ?? 0) - clock.now() + 1);
    processDue(db, clock.now());
    const army = emptyUnits();
    army[0] = 500;
    setTroopsAt(db, r.villageId, r.villageId, army);
    arrive(sendTroops(db, r.userId, r.villageId, { x: target.x, y: target.y, kind: 'attack', units: army, hero: true }, clock.now()));
    const after = db.select().from(artifacts).where(eq(artifacts.id, a.id)).get()!;
    expect(after.villageId).toBe(r.villageId);
    expect(artifactValue(db, r.villageId, 'boots', clock.now())).toBe(1); // not active yet
    clock.advance(after.activeAt - clock.now() + 1);
    expect(artifactValue(db, r.villageId, 'boots', clock.now())).toBe(2);
  });

  it('diet control and storage plans work for their holder', () => {
    const diet = db.select().from(artifacts).where(and(eq(artifacts.kind, 'diet'), eq(artifacts.size, 'large'))).get()!;
    const units = emptyUnits();
    units[0] = 100;
    setTroopsAt(db, g.villageId, g.villageId, units);
    const before = cropUpkeep(db, loadVillage(db, g.villageId)!);
    db.update(artifacts).set({ villageId: g.villageId, capturedAt: clock.now(), activeAt: clock.now() }).where(eq(artifacts.id, diet.id)).run();
    expect(cropUpkeep(db, loadVillage(db, g.villageId)!)).toBe(before - 25);
    setSlot(g.villageId, 26, 'main', 10);
    rich(g.villageId);
    const state = loadVillage(db, g.villageId)!;
    expect(buildOption(db, state, 33, 'greatwarehouse', clock.now()).reason).toMatch(/storage master plan/);
    const plan = db.select().from(artifacts).where(and(eq(artifacts.kind, 'storage'), eq(artifacts.size, 'large'))).get()!;
    db.update(artifacts).set({ villageId: g.villageId, capturedAt: clock.now(), activeAt: clock.now() }).where(eq(artifacts.id, plan.id)).run();
    // An artifact needs a Treasury slot of its own in real play; here we only test the effect.
    expect(buildOption(db, loadVillage(db, g.villageId)!, 33, 'greatwarehouse', clock.now()).canBuild).toBe(true);
  });

  it('World Wonders need construction plans in the alliance and level 100 wins the world', () => {
    expect(releaseWonders(db, clock.now())).toBeGreaterThan(0);
    const ww = db.select().from(villages).where(eq(villages.wonder, true)).get()!;
    db.update(villages).set({ userId: r.userId }).where(eq(villages.id, ww.id)).run();
    const state = loadVillage(db, ww.id)!;
    expect(wonderBlocker(db, state, 1, clock.now())).toMatch(/construction plan/);
    const plans = db.select().from(artifacts).where(eq(artifacts.kind, 'plan')).all();
    const al = db.insert(alliances).values({ name: 'Rome', tag: 'SPQR', tagLower: 'spqr', founderId: r.userId, createdAt: clock.now() }).returning().get();
    db.insert(allianceMembers).values({ userId: r.userId, allianceId: al.id, role: 'leader', joinedAt: clock.now() }).run();
    db.update(artifacts).set({ villageId: r.villageId, capturedAt: clock.now(), activeAt: clock.now() }).where(eq(artifacts.id, plans[0]!.id)).run();
    expect(plansHeld(db, r.userId, clock.now())).toEqual({ holders: 1, plans: 1 });
    expect(wonderBlocker(db, state, 10, clock.now())).toBeUndefined();
    expect(wonderBlocker(db, state, 51, clock.now())).toMatch(/second player/);
    db.insert(allianceMembers).values({ userId: g.userId, allianceId: al.id, role: 'member', joinedAt: clock.now() }).run();
    db.update(artifacts).set({ villageId: g.villageId, capturedAt: clock.now(), activeAt: clock.now() }).where(eq(artifacts.id, plans[1]!.id)).run();
    expect(wonderBlocker(db, state, 51, clock.now())).toBeUndefined();
    // Finish level 100.
    setSlot(ww.id, 25, 'wonder', 99);
    db.insert(buildOrders).values({ villageId: ww.id, slot: 25, building: 'wonder', toLevel: 100, startAt: clock.now(), finishAt: clock.now() + 1000 }).run();
    clock.advance(2000);
    processDue(db, clock.now());
    expect(winner(db)?.alliance).toBe('[SPQR] Rome');
  });
});
