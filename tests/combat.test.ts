import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld, createVillage } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { cropUpkeep, loadVillage, setTroopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let rome: P;
let gaul: P;

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function rich(id: number) {
  db.update(villages).set({ wood: 1e6, clay: 1e6, iron: 1e6, crop: 1e6, resAt: clock.now() }).where(eq(villages.id, id)).run();
}
function freeTile() {
  const t = db.select().from(tiles).where(and(eq(tiles.kind, 'field'), isNull(tiles.villageId))).all()[5];
  if (!t) throw new Error('no free tile');
  return t;
}
function arrive(mv: { arriveAt: number }) {
  clock.advance(mv.arriveAt - clock.now() + 1);
  processDue(db, clock.now());
}
const level = (v: number, slot: number) => loadVillage(db, v)?.slots.find((s) => s.slot === slot)?.level ?? 0;

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 8, 1));
  ensureWorld(db);
  rome = await registerPlayer(db, { username: 'Scipio', password: 'password123', tribe: 'romans' }, clock.now());
  gaul = await registerPlayer(db, { username: 'Ambiorix2', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [rome, gaul]) {
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  }
});

describe('classic T3.6 combat', () => {
  it('catapult targets follow the Rally Point level', () => {
    const g = loadVillage(db, gaul.villageId)!;
    const units = emptyUnits();
    units[7] = 10;
    setTroopsAt(db, rome.villageId, rome.villageId, units);
    setSlot(rome.villageId, 39, 'rally', 1);
    expect(() => sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'attack', units, catapultTarget: 'warehouse' }, clock.now())).toThrow(/Rally Point/);
    setSlot(rome.villageId, 39, 'rally', 3);
    expect(() => sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'attack', units, catapultTarget: 'main' }, clock.now())).toThrow(/Rally Point/);
    expect(() => sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'attack', units, catapultTarget: 'warehouse,granary' }, clock.now())).toThrow(/Two targets/);
  });

  it('aimed catapults of a winning attack knock a building down', () => {
    const g = loadVillage(db, gaul.villageId)!;
    setSlot(gaul.villageId, 25, 'warehouse', 10);
    setSlot(rome.villageId, 39, 'rally', 10);
    const units = emptyUnits();
    units[0] = 3000;
    units[7] = 100;
    setTroopsAt(db, rome.villageId, rome.villageId, units);
    arrive(sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'attack', units, catapultTarget: 'warehouse' }, clock.now()));
    expect(level(gaul.villageId, 25)).toBeLessThan(10);
  });

  it('rams lower the wall even when the attack is lost', () => {
    const g = loadVillage(db, gaul.villageId)!;
    setSlot(gaul.villageId, 40, 'palisade', 20);
    const def = emptyUnits();
    def[0] = 700; // the attack is lost, but not hopeless (a hopeless one barely scratches the wall)
    setTroopsAt(db, gaul.villageId, gaul.villageId, def);
    const units = emptyUnits();
    units[6] = 400; // battering rams
    setTroopsAt(db, rome.villageId, rome.villageId, units);
    arrive(sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'attack', units }, clock.now()));
    expect(level(gaul.villageId, 40)).toBeLessThan(20);
    expect(loadVillage(db, gaul.villageId)?.slots.length).toBeGreaterThan(0);
    setTroopsAt(db, gaul.villageId, gaul.villageId, emptyUnits());
  });

  it('catapults that bring a non-capital village to 0 population raze it', () => {
    const spot = freeTile();
    const id = createVillage(db, { userId: gaul.userId, name: 'Outpost', x: spot.x, y: spot.y, isCapital: false, now: clock.now() });
    for (const s of loadVillage(db, id)!.slots) if (s.level > 0) setSlot(id, s.slot, s.slot <= 18 ? s.building : null, 0);
    setSlot(id, 26, 'main', 1);
    db.update(villages).set({ pop: 2 }).where(eq(villages.id, id)).run();
    rich(rome.villageId);
    const units = emptyUnits();
    units[0] = 3000;
    units[7] = 50;
    setTroopsAt(db, rome.villageId, rome.villageId, units);
    arrive(sendTroops(db, rome.userId, rome.villageId, { x: spot.x, y: spot.y, kind: 'attack', units, catapultTarget: 'main' }, clock.now()));
    expect(db.select().from(villages).where(eq(villages.id, id)).get()).toBeUndefined();
    expect(db.select().from(tiles).where(and(eq(tiles.x, spot.x), eq(tiles.y, spot.y))).get()?.villageId).toBeNull();
  });

  it('reinforcements are fed by the village hosting them', () => {
    const g = loadVillage(db, gaul.villageId)!;
    setTroopsAt(db, rome.villageId, rome.villageId, emptyUnits());
    const before = { rome: cropUpkeep(db, loadVillage(db, rome.villageId)!), gaul: cropUpkeep(db, loadVillage(db, gaul.villageId)!) };
    const units = emptyUnits();
    units[0] = 100;
    setTroopsAt(db, rome.villageId, rome.villageId, units);
    arrive(sendTroops(db, rome.userId, rome.villageId, { x: g.village.x, y: g.village.y, kind: 'reinforce', units }, clock.now()));
    expect(cropUpkeep(db, loadVillage(db, rome.villageId)!)).toBe(before.rome);
    expect(cropUpkeep(db, loadVillage(db, gaul.villageId)!)).toBe(before.gaul + 100);
  });
});
