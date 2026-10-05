import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { movements, oasisRaiders, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { setTroopsAt, troopsAt } from '../src/game/engine/state.js';
import { setOasisAnimals, setOasisStock } from '../src/game/engine/oasis.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { planOasisRaids, processOasisRaiders, raiderFor, raiderLog, runRaiderNow, saveRaider, setRaiderEnabled, settingsOf, toggleBlock } from '../src/game/actions/raider.js';
import { distance } from '../src/game/rules/map.js';
import { config } from '../src/config.js';
import { emptyUnits, totalUnits } from '../src/game/rules/units.js';

let p: { userId: number; villageId: number };
let home: { x: number; y: number };
const near: { x: number; y: number }[] = [];

function units(slot: number, n: number) {
  const u = emptyUnits();
  u[slot] = n;
  return u;
}
const plan = () => planOasisRaids(db, raiderFor(db, p.userId, p.villageId, 'teutons'), 'teutons', clock.now());

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 3));
  ensureWorld(db);
  p = await registerPlayer(db, { username: 'Raidbot', password: 'password123', tribe: 'teutons' }, clock.now());
  db.update(users).set({ protectedUntil: 0, goldClub: true }).where(eq(users.id, p.userId)).run();
  db.update(slots).set({ building: 'rally', level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 39))).run();
  home = db.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, p.villageId)).get()!;
  // Every free oasis: empty and no animals; then three close ones get loot.
  const oases = db.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId))).all();
  for (const o of oases) {
    setOasisStock(db, o.x, o.y, { wood: 0, clay: 0, iron: 0, crop: 0 }, clock.now());
    setOasisAnimals(db, o.x, o.y, emptyUnits(), clock.now());
  }
  oases.sort((a, b) => distance(home.x, home.y, a.x, a.y, config.MAP_RADIUS) - distance(home.x, home.y, b.x, b.y, config.MAP_RADIUS));
  for (const o of oases.slice(0, 3)) {
    setOasisStock(db, o.x, o.y, { wood: 1000, clay: 1000, iron: 0, crop: 0 }, clock.now());
    near.push({ x: o.x, y: o.y });
  }
  setTroopsAt(db, p.villageId, p.villageId, units(0, 1000)); // clubswingers carry 60
});

describe('Oasis Raider', () => {
  it('plans auto-sized raids only to rich, empty oases', () => {
    const pl = plan();
    expect(pl.raids.length).toBe(3);
    for (const r of pl.raids) {
      expect(r.carry ?? 0).toBeGreaterThanOrEqual(r.loot);
      expect(r.units?.[0]).toBe(Math.ceil(2000 / 60));
    }
    expect(pl.targets.filter((t) => t.status === 'poor').length).toBeGreaterThan(0);
  });

  it('skips guarded and blocked oases, respects the reserve and the raid cap', () => {
    setOasisAnimals(db, near[0]!.x, near[0]!.y, units(0, 5), clock.now());
    toggleBlock(db, p.userId, near[1]!.x, near[1]!.y);
    let pl = plan();
    expect(pl.raids.map((r) => `${r.x}|${r.y}`)).toEqual([`${near[2]!.x}|${near[2]!.y}`]);
    expect(pl.targets.find((t) => t.x === near[0]!.x && t.y === near[0]!.y)?.status).toBe('guarded');
    // Allow animals: it now sends enough attack to win safely.
    const s = settingsOf(raiderFor(db, p.userId, p.villageId, 'teutons'));
    saveRaider(db, p.userId, p.villageId, { ...s, maxAnimals: 10, reserve: units(0, 980) }, clock.now());
    pl = plan();
    expect(pl.available[0]).toBe(20);
    expect(pl.raids.reduce((a, r) => a + totalUnits(r.units ?? []), 0)).toBeLessThanOrEqual(20);
    saveRaider(db, p.userId, p.villageId, { ...s, maxAnimals: 10, reserve: emptyUnits(), maxRaids: 1 }, clock.now());
    expect(plan().raids.length).toBe(1);
    toggleBlock(db, p.userId, near[1]!.x, near[1]!.y);
    saveRaider(db, p.userId, p.villageId, { ...s, maxAnimals: 0, maxRaids: 20 }, clock.now());
  });

  it('runs: sends raids, never twice to an oasis with a raid on the way, and logs', () => {
    const e = runRaiderNow(db, p.userId, p.villageId, 'teutons', clock.now());
    expect(e.sent).toBe(2);
    expect(troopsAt(db, p.villageId, p.villageId)[0]).toBe(1000 - 2 * 34);
    const again = runRaiderNow(db, p.userId, p.villageId, 'teutons', clock.now());
    expect(again.sent).toBe(0);
    expect(again.skipped.busy).toBe(2);
    expect(raiderLog(db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, p.villageId)).get()!).length).toBe(2);
  });

  it('the server tick runs enabled raiders only after their interval', () => {
    db.delete(movements).where(eq(movements.fromVillageId, p.villageId)).run();
    setRaiderEnabled(db, p.userId, p.villageId, true, 'teutons', clock.now());
    expect(processOasisRaiders(db, clock.now())).toBe(1);
    expect(processOasisRaiders(db, clock.now() + 60_000)).toBe(0);
    expect(processOasisRaiders(db, clock.now() + 11 * 60_000)).toBe(1);
    db.update(users).set({ goldClub: false }).where(eq(users.id, p.userId)).run();
    expect(processOasisRaiders(db, clock.now() + 30 * 60_000)).toBe(0);
    expect(db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, p.villageId)).get()?.enabled).toBe(false);
  });
});
