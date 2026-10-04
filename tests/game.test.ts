import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { movements, perks, reports, slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { catchUp, troopsAt, setTroopsAt, loadVillage } from '../src/game/engine/state.js';
import { registerPlayer, authenticate } from '../src/game/actions/account.js';
import { startBuild, cancelBuild, buildOrdersOf } from '../src/game/actions/build.js';
import { startTraining } from '../src/game/actions/train.js';
import { sendTroops, withdrawTroops } from '../src/game/actions/troops.js';
import { GameError } from '../src/game/errors.js';
import { emptyUnits } from '../src/game/rules/units.js';
import { getModifiers } from '../src/game/modifiers.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);

function setSlot(villageId: number, slot: number, building: string, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}

function village(id: number) {
  const v = db.select().from(villages).where(eq(villages.id, id)).get();
  if (!v) throw new Error('village missing');
  return v;
}

/** Troops at home after catching the village up (training completes lazily). */
function homeTroops(villageId: number) {
  db.transaction((tx) => catchUp(tx, villageId, clock.now()));
  return troopsAt(db, villageId, villageId);
}

function advance(ms: number) {
  clock.advance(ms);
  processDue(db, clock.now());
}

let a: { userId: number; villageId: number };
let b: { userId: number; villageId: number };

beforeAll(async () => {
  clock.freeze(T0);
  ensureWorld(db);
  a = await registerPlayer(db, { username: 'Attila', password: 'password123', tribe: 'teutons' }, clock.now());
  b = await registerPlayer(db, { username: 'Brutus', password: 'password123', tribe: 'romans' }, clock.now());
});

describe('registration', () => {
  it('creates a village with 18 fields, a main building and starting resources', () => {
    const state = loadVillage(db, a.villageId);
    expect(state?.slots).toHaveLength(40);
    expect(state?.slots.filter((s) => s.slot <= 18 && s.level === 0)).toHaveLength(18);
    expect(state?.slots.find((s) => s.slot === 26)).toMatchObject({ building: 'main', level: 1 });
    expect(state?.slots.find((s) => s.slot === 40)?.building).toBe('earthwall');
    expect(village(a.villageId).wood).toBe(750);
    expect(village(a.villageId).pop).toBeGreaterThan(0);
  });

  it('first player is admin, names are unique case-insensitively', async () => {
    expect(db.select().from(users).where(eq(users.id, a.userId)).get()?.role).toBe('admin');
    await expect(registerPlayer(db, { username: 'attila', password: 'password123', tribe: 'gauls' }, clock.now())).rejects.toBeInstanceOf(GameError);
  });

  it('authenticates with the right password only', async () => {
    expect(await authenticate(db, 'ATTILA', 'password123')).not.toBeNull();
    expect(await authenticate(db, 'Attila', 'wrong-password')).toBeNull();
    expect(await authenticate(db, 'nobody', 'password123')).toBeNull();
  });
});

describe('economy', () => {
  it('resources accrue over time', () => {
    const before = village(a.villageId).wood;
    clock.advance(HOUR);
    db.transaction((tx) => catchUp(tx, a.villageId, clock.now()));
    expect(village(a.villageId).wood).toBeGreaterThan(before);
  });

  it('builds a field, deducts resources and finishes on time', () => {
    const before = village(a.villageId);
    const order = startBuild(db, a.userId, a.villageId, 1, undefined, clock.now());
    expect(order.toLevel).toBe(1);
    expect(village(a.villageId).wood).toBeLessThan(before.wood);
    // Only one construction at a time without perks.
    expect(() => startBuild(db, a.userId, a.villageId, 2, undefined, clock.now())).toThrow('builders are busy');
    advance(order.finishAt - clock.now() + 1);
    expect(loadVillage(db, a.villageId)?.slots.find((s) => s.slot === 1)?.level).toBe(1);
    expect(buildOrdersOf(db, a.villageId)).toHaveLength(0);
  });

  it('cancelling refunds the full cost', () => {
    const before = village(a.villageId).clay;
    const order = startBuild(db, a.userId, a.villageId, 2, undefined, clock.now());
    expect(village(a.villageId).clay).toBeLessThan(before);
    cancelBuild(db, a.userId, order.id, clock.now());
    expect(village(a.villageId).clay).toBeCloseTo(before, 0);
  });

  it('enforces requirements for new buildings', () => {
    expect(() => startBuild(db, a.userId, a.villageId, 20, 'barracks', clock.now())).toThrow(/Requires/);
  });

  it('cannot touch another player’s village', () => {
    expect(() => startBuild(db, b.userId, a.villageId, 1, undefined, clock.now())).toThrow('Village not found');
  });

  it('a build-queue perk allows two constructions at once', () => {
    db.insert(perks).values({ userId: a.userId, kind: 'build_queue', value: 1, source: 'test', createdAt: clock.now() }).run();
    expect(getModifiers(db, a.userId, clock.now()).buildQueue).toBe(2);
    startBuild(db, a.userId, a.villageId, 3, undefined, clock.now());
    startBuild(db, a.userId, a.villageId, 4, undefined, clock.now());
    expect(buildOrdersOf(db, a.villageId)).toHaveLength(2);
    advance(24 * HOUR);
    expect(buildOrdersOf(db, a.villageId)).toHaveLength(0);
  });
});

describe('military', () => {
  beforeAll(() => {
    // Fast-forward the setup: give both players the buildings they need.
    for (const v of [a.villageId, b.villageId]) {
      setSlot(v, 26, 'main', 5);
      setSlot(v, 20, 'barracks', 5);
      setSlot(v, 21, 'warehouse', 10);
      setSlot(v, 22, 'granary', 10);
      setSlot(v, 39, 'rally', 1);
      db.update(villages).set({ wood: 20_000, clay: 20_000, iron: 20_000, crop: 20_000 }).where(eq(villages.id, v)).run();
    }
  });

  it('trains troops over time', () => {
    const order = startTraining(db, a.userId, a.villageId, 'barracks', 0, 5, clock.now());
    expect(order.total).toBe(5);
    advance(order.perUnitMs * 2 + 10);
    expect(homeTroops(a.villageId)[0]).toBe(2);
    advance(order.perUnitMs * 3);
    expect(homeTroops(a.villageId)[0]).toBe(5);
  });

  it('special units cannot be trained yet', () => {
    expect(() => startTraining(db, a.userId, a.villageId, 'barracks', 9, 1, clock.now())).toThrow();
  });

  it('beginner protection blocks attacks', () => {
    const target = village(b.villageId);
    const units = emptyUnits();
    units[0] = 1;
    expect(() => sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units }, clock.now())).toThrow(/protection/);
  });

  it('a raid fights, loots, and brings resources home with reports for both sides', () => {
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, b.userId)).run();
    homeTroops(a.villageId);
    const home = emptyUnits();
    home[0] = 200;
    setTroopsAt(db, a.villageId, a.villageId, home);
    const defenders = emptyUnits();
    defenders[0] = 3;
    setTroopsAt(db, b.villageId, b.villageId, defenders);

    const target = village(b.villageId);
    const send = emptyUnits();
    send[0] = 200;
    const mv = sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units: send }, clock.now());
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(0);
    // Attacking ends the attacker's own protection.
    expect(db.select().from(users).where(eq(users.id, a.userId)).get()?.protectedUntil).toBe(clock.now());

    // Leave room in the warehouse so the loot has somewhere to go.
    db.update(villages).set({ wood: 1000 }).where(eq(villages.id, a.villageId)).run();
    const woodBefore = village(a.villageId).wood;
    advance(mv.arriveAt - clock.now() + 1);
    const ret = db.select().from(movements).where(eq(movements.fromVillageId, a.villageId)).all();
    expect(ret).toHaveLength(1);
    expect(ret[0]?.kind).toBe('return');
    expect(troopsAt(db, b.villageId, b.villageId)[0]).toBeLessThan(3);

    const aReports = db.select().from(reports).where(eq(reports.userId, a.userId)).all();
    const bReports = db.select().from(reports).where(eq(reports.userId, b.userId)).all();
    expect(aReports.some((r) => r.kind === 'attack_won')).toBe(true);
    expect(bReports.some((r) => r.kind === 'defense_lost')).toBe(true);

    advance((ret[0]?.arriveAt ?? 0) - clock.now() + 1);
    expect(homeTroops(a.villageId)[0]).toBeGreaterThan(150);
    expect(village(a.villageId).wood).toBeGreaterThan(woodBefore);
    expect(db.select().from(users).where(eq(users.id, a.userId)).get()?.lootTotal).toBeGreaterThan(0);
  });

  it('reinforcements can be stationed and withdrawn', () => {
    const target = village(b.villageId);
    const send = emptyUnits();
    send[0] = 10;
    const mv = sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'reinforce', units: send }, clock.now());
    advance(mv.arriveAt - clock.now() + 1);
    expect(troopsAt(db, b.villageId, a.villageId)[0]).toBe(10);
    withdrawTroops(db, a.userId, a.villageId, b.villageId, clock.now());
    expect(troopsAt(db, b.villageId, a.villageId)[0]).toBe(0);
    advance(48 * HOUR);
    expect(homeTroops(a.villageId)[0]).toBeGreaterThan(150);
  });

  it('cannot send more troops than you have, or attack yourself', () => {
    const target = village(b.villageId);
    const send = emptyUnits();
    send[0] = 1_000_000;
    expect(() => sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'attack', units: send }, clock.now())).toThrow(/Not enough/);
    const me = village(a.villageId);
    send[0] = 1;
    expect(() => sendTroops(db, a.userId, a.villageId, { x: me.x, y: me.y, kind: 'attack', units: send }, clock.now())).toThrow();
  });
});
