import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import {
  BUILDINGS,
  baseBuildSeconds,
  buildCost,
  buildingCulture,
  popAtLevel,
} from '../src/game/rules/buildings.js';
import { crannyCapacity, fieldProduction, storageCapacity } from '../src/game/rules/production.js';
import { culturePointsRequired } from '../src/game/rules/expansion.js';
import { TRIBES, researchCost, researchTimeMs, smithyCost } from '../src/game/rules/units.js';
import { res } from '../src/game/rules/resources.js';
import { lossExponent, moraleBonus } from '../src/game/rules/battle.js';
import { travelTimeArenaMs, travelTimeMs } from '../src/game/rules/map.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { catchUp, loadVillage, setTroopsAt, troopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { buildOption, buildOrdersOf, buildableOnEmptyPlot, startBuild } from '../src/game/actions/build.js';
import { startTraining, trainOptions } from '../src/game/actions/train.js';
import { celebrationOptions, startCelebration } from '../src/game/actions/celebration.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { buildTraps } from '../src/game/actions/traps.js';
import { emptyUnits, totalUnits } from '../src/game/rules/units.js';

/* Reference values: classic Travian 3.6 at speed 1. */
describe('T3.6 reference numbers', () => {
  const cases: [keyof typeof BUILDINGS, number, [number, number, number, number], number, number, number][] = [
    // building, level, cost, seconds, pop added, culture points
    ['woodcutter', 1, [40, 100, 50, 60], 260, 2, 1],
    ['woodcutter', 5, [310, 780, 390, 465], 3560, 1, 2],
    ['woodcutter', 10, [4040, 10105, 5050, 6060], 40440, 2, 6],
    ['cropland', 3, [195, 250, 195, 55], 900, 0, 2],
    ['warehouse', 10, [1200, 1475, 830, 370], 12860, 1, 6],
    ['warehouse', 20, [14155, 17420, 9800, 4355], 63130, 2, 38],
    ['main', 1, [70, 40, 60, 20], 2620, 2, 2],
    ['main', 2, [90, 50, 75, 25], 3220, 1, 3],
    ['main', 10, [645, 370, 555, 185], 10940, 2, 12],
    ['barracks', 5, [565, 375, 700, 320], 5140, 2, 2],
    ['academy', 10, [2030, 1475, 830, 370], 12860, 3, 25],
    ['palace', 1, [550, 800, 750, 250], 5000, 1, 6],
    ['cranny', 10, [370, 460, 275, 90], 8110, 1, 6],
    ['heromansion', 5, [2190, 2095, 2190, 750], 4160, 1, 2],
    ['sawmill', 3, [1685, 1230, 940, 290], 9750, 2, 2],
  ];
  it.each(cases)('%s level %i', (id, level, cost, seconds, pop, cp) => {
    const def = BUILDINGS[id];
    const c = buildCost(def, level);
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual(cost);
    expect(baseBuildSeconds(def, level)).toBe(seconds);
    expect(popAtLevel(def, level)).toBe(pop);
    expect(buildingCulture(def, level)).toBe(cp);
  });

  it('production, storage, cranny and culture thresholds', () => {
    expect([0, 1, 5, 10, 20].map(fieldProduction)).toEqual([2, 5, 33, 200, 2450]);
    expect([1, 10, 20].map(storageCapacity)).toEqual([1200, 11800, 80000]);
    expect(crannyCapacity(10)).toBe(1000);
    expect([2, 3, 4, 5, 6].map(culturePointsRequired)).toEqual([2000, 8000, 20000, 39000, 65000]);
  });

  it('classic unit stats', () => {
    const leg = TRIBES.romans.units[0];
    expect(leg).toMatchObject({ name: 'Legionnaire', attack: 40, defInf: 35, defCav: 50, speed: 6, carry: 50, trainTime: 2000 });
    // T3 values checked against Kirilloid's T3 model (2026-10-04): chief speeds, research & upgrade formulas.
    expect([TRIBES.romans.units[8]?.speed, TRIBES.teutons.units[8]?.speed, TRIBES.gauls.units[8]?.speed]).toEqual([4, 4, 5]);
    expect(researchCost(TRIBES.romans.units[1]!)).toEqual(res(700, 620, 1480, 580));
    expect(researchCost(TRIBES.romans.units[8]!)).toEqual(res(15875, 13800, 36400, 22660));
    expect(smithyCost(TRIBES.gauls.units[1]!, 1)).toEqual(res(1080, 1150, 1495, 580));
    expect(researchTimeMs(TRIBES.romans.units[1]!, 1)).toBe(8400 * 1000);
    expect(TRIBES.gauls.units[1]?.requires).toContainEqual({ building: 'academy', level: 3 });
    expect(TRIBES.teutons.units[5]).toMatchObject({ name: 'Teutonic Knight', attack: 150, speed: 9 });
    expect(TRIBES.gauls.units[3]).toMatchObject({ name: 'Theutates Thunder', attack: 90, speed: 19, carry: 75 });
    expect(TRIBES.romans.wallName).toBe('City Wall');
    expect(TRIBES.teutons.merchantCapacity).toBe(1000);
    expect(TRIBES.gauls.crannyMultiplier).toBe(2);
  });

  it('battle helpers', () => {
    expect(lossExponent(10)).toBe(1.5);
    expect(lossExponent(1_000_000)).toBeLessThan(1.5);
    expect(moraleBonus(1000, 100)).toBeGreaterThan(1);
    expect(moraleBonus(100, 1000)).toBe(1);
    expect(travelTimeArenaMs(50, 10, 10, 1)).toBeLessThan(travelTimeMs(50, 10, 1));
    expect(travelTimeArenaMs(20, 10, 10, 1)).toBe(travelTimeMs(20, 10, 1));
  });
});

/* ------------------------------------------------------------------ */

function setSlot(villageId: number, slot: number, building: string, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function rich(id: number) {
  db.update(villages).set({ wood: 100_000, clay: 100_000, iron: 100_000, crop: 100_000, resAt: clock.now() }).where(eq(villages.id, id)).run();
}

describe('classic mechanics', () => {
  let roman: { userId: number; villageId: number };
  let teuton: { userId: number; villageId: number };
  let gaul: { userId: number; villageId: number };

  beforeAll(async () => {
    clock.freeze(Date.UTC(2026, 7, 1));
    ensureWorld(db);
    roman = await registerPlayer(db, { username: 'Caesar', password: 'password123', tribe: 'romans' }, clock.now());
    teuton = await registerPlayer(db, { username: 'Arminius', password: 'password123', tribe: 'teutons' }, clock.now());
    gaul = await registerPlayer(db, { username: 'Vercingetorix', password: 'password123', tribe: 'gauls' }, clock.now());
    for (const p of [roman, teuton, gaul]) {
      rich(p.villageId);
      db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    }
  });

  it('each tribe gets its own wall on slot 40', () => {
    const wall = (v: number) => loadVillage(db, v)?.slots.find((s) => s.slot === 40)?.building;
    expect([wall(roman.villageId), wall(teuton.villageId), wall(gaul.villageId)]).toEqual(['citywall', 'earthwall', 'palisade']);
  });

  it('Romans build a field and a building at the same time; others cannot', () => {
    startBuild(db, roman.userId, roman.villageId, 1, undefined, clock.now());
    startBuild(db, roman.userId, roman.villageId, 26, undefined, clock.now());
    expect(buildOrdersOf(db, roman.villageId)).toHaveLength(2);
    expect(() => startBuild(db, roman.userId, roman.villageId, 2, undefined, clock.now())).toThrow(/busy/);
    startBuild(db, teuton.userId, teuton.villageId, 1, undefined, clock.now());
    expect(() => startBuild(db, teuton.userId, teuton.villageId, 26, undefined, clock.now())).toThrow(/busy/);
    clock.advance(86_400_000);
    processDue(db, clock.now());
  });

  it('tribe-only buildings are offered only to their tribe', () => {
    for (const p of [roman, teuton, gaul]) {
      setSlot(p.villageId, 26, 'main', 20);
      setSlot(p.villageId, 39, 'rally', 20);
      setSlot(p.villageId, 21, 'granary', 20);
      setSlot(p.villageId, 22, 'stable', 20);
    }
    const names = (v: number) => {
      const state = loadVillage(db, v);
      if (!state) throw new Error('no village');
      return buildableOnEmptyPlot(db, state, 30, clock.now()).map((o) => o.def.id);
    };
    expect(names(gaul.villageId)).toContain('trapper');
    expect(names(roman.villageId)).not.toContain('trapper');
    expect(names(roman.villageId)).toContain('horsetrough');
    expect(names(teuton.villageId)).toContain('brewery');
    expect(names(gaul.villageId)).not.toContain('brewery');
    // Great Barracks is not allowed in the capital.
    const state = loadVillage(db, roman.villageId);
    if (!state) throw new Error();
    expect(buildOption(db, state, 30, 'greatbarracks', clock.now()).reason).toMatch(/capital|Requires/);
  });

  it('Great Barracks trains the same units at three times the cost', () => {
    setSlot(teuton.villageId, 23, 'barracks', 5);
    setSlot(teuton.villageId, 24, 'greatbarracks', 1);
    const state = loadVillage(db, teuton.villageId);
    if (!state) throw new Error();
    const normal = trainOptions(db, state, 'barracks', clock.now())[0];
    const great = trainOptions(db, state, 'greatbarracks', clock.now())[0];
    expect(great?.cost.wood).toBe((normal?.cost.wood ?? 0) * 3);
    rich(teuton.villageId);
    const a = startTraining(db, teuton.userId, teuton.villageId, 'barracks', 0, 2, clock.now());
    const b = startTraining(db, teuton.userId, teuton.villageId, 'greatbarracks', 0, 2, clock.now());
    // Separate queues: both start right away.
    expect(a.startAt).toBe(b.startAt);
  });

  it('Town Hall celebrations add culture points', () => {
    setSlot(roman.villageId, 27, 'townhall', 1);
    rich(roman.villageId);
    const state = loadVillage(db, roman.villageId);
    if (!state) throw new Error();
    expect(celebrationOptions(db, state).find((o) => o.kind === 'great')?.reason).toMatch(/Town Hall level 10/);
    const c = startCelebration(db, roman.userId, roman.villageId, 'small', clock.now());
    const before = db.select().from(users).where(eq(users.id, roman.userId)).get()?.culturePoints ?? 0;
    clock.advance(c.finishAt - clock.now() + 1);
    processDue(db, clock.now());
    const after = db.select().from(users).where(eq(users.id, roman.userId)).get()?.culturePoints ?? 0;
    expect(after - before).toBeGreaterThanOrEqual(c.culturePoints);
  });

  it('Gaul traps catch attackers; a winning attack frees them', () => {
    setSlot(gaul.villageId, 31, 'trapper', 1); // room for 10 traps
    // T3.6: traps must be built (20/30/10/20 each) before they catch anyone.
    rich(gaul.villageId);
    expect(buildTraps(db, gaul.userId, gaul.villageId, 10, clock.now())).toBe(10);
    expect(() => buildTraps(db, gaul.userId, gaul.villageId, 1, clock.now())).toThrow(/at most 10/);
    rich(teuton.villageId);
    setSlot(teuton.villageId, 39, 'rally', 1);
    const units = emptyUnits();
    units[0] = 5;
    setTroopsAt(db, teuton.villageId, teuton.villageId, units);
    const target = db.select().from(villages).where(eq(villages.id, gaul.villageId)).get();
    if (!target) throw new Error();
    let mv = sendTroops(db, teuton.userId, teuton.villageId, { x: target.x, y: target.y, kind: 'raid', units }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    const prisoners = JSON.parse(db.select().from(villages).where(eq(villages.id, gaul.villageId)).get()?.prisoners ?? '{}') as Record<string, number[]>;
    expect(totalUnits(prisoners[String(teuton.villageId)] ?? [])).toBe(5);
    // A big attack wins and frees them.
    rich(teuton.villageId);
    const army = emptyUnits();
    army[0] = 500;
    setTroopsAt(db, teuton.villageId, teuton.villageId, army);
    mv = sendTroops(db, teuton.userId, teuton.villageId, { x: target.x, y: target.y, kind: 'attack', units: army }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    clock.advance(48 * 3_600_000);
    processDue(db, clock.now());
    db.transaction((tx) => catchUp(tx, teuton.villageId, clock.now()));
    expect(troopsAt(db, teuton.villageId, teuton.villageId)[0]).toBeGreaterThan(5);
  });
});
