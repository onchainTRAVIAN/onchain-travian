import { describe, expect, it } from 'vitest';
import { BUILDINGS, buildCost, buildTimeMs, mainBuildingFactor } from '../src/game/rules/buildings.js';
import { FIELD_PRODUCTION, crannyCapacity, storageCapacity } from '../src/game/rules/production.js';
import { catapultDamage, computeLoot, ramDamage, resolveBattle, resolveScouting } from '../src/game/rules/battle.js';
import { distance, generateTile, layoutFields, travelTimeMs, wrapCoord, FIELD_LAYOUTS, type FieldLayout } from '../src/game/rules/map.js';
import { res } from '../src/game/rules/resources.js';
import { TRIBES, TRIBE_IDS, emptyUnits, slowestSpeed, trainTimeMs } from '../src/game/rules/units.js';
import { foldPerks } from '../src/game/modifiers.js';
import { accrue } from '../src/game/engine/state.js';

describe('buildings', () => {
  it('costs grow with level and are rounded to 5', () => {
    const main = BUILDINGS.main;
    const l1 = buildCost(main, 1);
    const l10 = buildCost(main, 10);
    expect(l1).toEqual(main.baseCost);
    expect(l10.wood).toBeGreaterThan(l1.wood * 5);
    for (const v of Object.values(l10)) expect(v % 5).toBe(0);
  });

  it('main building speeds up construction', () => {
    expect(mainBuildingFactor(1)).toBeCloseTo(1);
    expect(mainBuildingFactor(20)).toBeCloseTo(0.498, 2);
    const def = BUILDINGS.warehouse;
    expect(buildTimeMs(def, 5, 20, 1)).toBeLessThan(buildTimeMs(def, 5, 1, 1));
  });

  it('world speed divides build time', () => {
    const def = BUILDINGS.barracks;
    expect(buildTimeMs(def, 3, 5, 3)).toBeCloseTo(buildTimeMs(def, 3, 5, 1) / 3, -4);
  });

  it('every requirement refers to a real building', () => {
    for (const def of Object.values(BUILDINGS)) for (const r of def.requires) expect(BUILDINGS[r.building]).toBeDefined();
  });
});

describe('production & storage', () => {
  it('field production increases every level', () => {
    for (let i = 1; i < FIELD_PRODUCTION.length; i++) expect(FIELD_PRODUCTION[i]).toBeGreaterThan(FIELD_PRODUCTION[i - 1] ?? 0);
  });
  it('storage and cranny grow with level', () => {
    expect(storageCapacity(0)).toBe(800);
    expect(storageCapacity(1)).toBeGreaterThan(800);
    expect(storageCapacity(20)).toBeGreaterThan(50_000);
    expect(crannyCapacity(0)).toBe(0);
    expect(crannyCapacity(10)).toBeGreaterThan(crannyCapacity(1));
  });
  it('accrue caps production at capacity but keeps overflow and never goes negative', () => {
    const cap = res(1000, 1000, 1000, 1000);
    expect(accrue(res(900, 0, 0, 0), res(200, 0, 0, 0), cap, 1).wood).toBe(1000);
    expect(accrue(res(1500, 0, 0, 0), res(200, 0, 0, 0), cap, 1).wood).toBe(1500);
    expect(accrue(res(0, 0, 0, 100), res(0, 0, 0, -50), cap, 5).crop).toBe(0);
    expect(accrue(res(100, 0, 0, 0), res(60, 0, 0, 0), cap, 0.5).wood).toBeCloseTo(130);
  });
});

describe('tribes', () => {
  it('each tribe has 10 units with positive costs and speeds', () => {
    for (const id of TRIBE_IDS) {
      const t = TRIBES[id];
      expect(t.units).toHaveLength(10);
      for (const u of t.units) {
        expect(u.speed).toBeGreaterThan(0);
        expect(u.trainTime).toBeGreaterThan(0);
        expect(u.upkeep).toBeGreaterThan(0);
      }
      expect(t.units[6]?.type).toBe('ram');
      expect(t.units[7]?.type).toBe('catapult');
      expect(t.units[8]?.type).toBe('chief');
      expect(t.units[9]?.type).toBe('settler');
    }
  });
  it('slowest unit sets the pace', () => {
    const units = emptyUnits();
    units[0] = 10; // clubber speed 7
    units[6] = 1; // ram speed 4
    expect(slowestSpeed('teutons', units)).toBe(4);
  });
  it('higher training building level trains faster', () => {
    const u = TRIBES.romans.units[0];
    if (!u) throw new Error('missing unit');
    expect(trainTimeMs(u, 10, 1)).toBeLessThan(trainTimeMs(u, 1, 1));
  });
});

describe('battle', () => {
  const army = (tribe: 'romans' | 'gauls' | 'teutons', slot: number, n: number) => {
    const u = emptyUnits();
    u[slot] = n;
    return { tribe, units: u };
  };

  it('a strong attack wipes out a weak defence and takes some losses', () => {
    const r = resolveBattle({ mode: 'attack', attacker: army('teutons', 0, 100), defenders: [army('romans', 0, 10)], defenderTribe: 'romans', wallLevel: 0 });
    expect(r.attackerWon).toBe(true);
    expect(r.defenderLosses[0]?.[0]).toBe(10);
    expect(r.attackerLosses[0]).toBeGreaterThan(0);
    expect(r.attackerLosses[0]).toBeLessThan(50);
  });

  it('a weak attack dies entirely in a full attack', () => {
    const r = resolveBattle({ mode: 'attack', attacker: army('teutons', 0, 5), defenders: [army('gauls', 0, 100)], defenderTribe: 'gauls', wallLevel: 5 });
    expect(r.attackerWon).toBe(false);
    expect(r.attackerLosses[0]).toBe(5);
  });

  it('raids are less bloody than attacks for the winner and the loser', () => {
    const input = { attacker: army('teutons', 0, 50), defenders: [army('romans', 0, 20)], defenderTribe: 'romans' as const, wallLevel: 0 };
    const attack = resolveBattle({ ...input, mode: 'attack' });
    const raid = resolveBattle({ ...input, mode: 'raid' });
    expect(raid.defenderLossRatio).toBeLessThan(attack.defenderLossRatio);
  });

  it('walls make defence stronger', () => {
    const base = { mode: 'attack' as const, attacker: army('teutons', 0, 30), defenders: [army('romans', 1, 10)], defenderTribe: 'romans' as const };
    expect(resolveBattle({ ...base, wallLevel: 10 }).defensePower).toBeGreaterThan(resolveBattle({ ...base, wallLevel: 0 }).defensePower);
  });

  it('an empty village still has base defence', () => {
    const r = resolveBattle({ mode: 'raid', attacker: army('teutons', 0, 1), defenders: [], defenderTribe: 'romans', wallLevel: 0 });
    expect(r.attackerWon).toBe(true);
  });

  it('modifiers scale attack power', () => {
    const base = { mode: 'attack' as const, attacker: army('teutons', 0, 30), defenders: [], defenderTribe: null, wallLevel: 0 };
    expect(resolveBattle({ ...base, attackMultiplier: 1.2 }).attackPower).toBe(Math.round(30 * 40 * 1.2));
  });

  it('rams and catapults need more machines for higher levels', () => {
    expect(ramDamage(0, 5)).toBe(0);
    expect(ramDamage(100, 5)).toBe(5);
    expect(ramDamage(3, 5)).toBe(0);
    expect(catapultDamage(1000, 10)).toBe(10);
    expect(catapultDamage(1, 10)).toBe(0);
  });

  it('loot respects carry capacity and the cranny', () => {
    const stock = res(1000, 1000, 1000, 1000);
    const all = computeLoot(stock, 0, 10_000);
    expect(all).toEqual(stock);
    const capped = computeLoot(stock, 0, 400);
    expect(capped.wood + capped.clay + capped.iron + capped.crop).toBe(400);
    const hidden = computeLoot(stock, 900, 10_000);
    expect(hidden.wood).toBe(100);
  });

  it('scouts are caught by more defending scouts', () => {
    expect(resolveScouting(10, 0)).toEqual({ success: true, scoutLosses: 0 });
    expect(resolveScouting(10, 20).success).toBe(false);
    expect(resolveScouting(10, 5).success).toBe(true);
  });
});

describe('map', () => {
  it('every layout expands to 18 fields', () => {
    for (const l of Object.keys(FIELD_LAYOUTS) as FieldLayout[]) {
      const f = layoutFields(l);
      expect(f).toHaveLength(18);
      const [w, c, i, cr] = FIELD_LAYOUTS[l];
      expect(f.filter((x) => x === 'woodcutter')).toHaveLength(w);
      expect(f.filter((x) => x === 'claypit')).toHaveLength(c);
      expect(f.filter((x) => x === 'ironmine')).toHaveLength(i);
      expect(f.filter((x) => x === 'cropland')).toHaveLength(cr);
    }
  });
  it('generation is deterministic per seed', () => {
    expect(generateTile(3, -7, 42)).toEqual(generateTile(3, -7, 42));
  });
  it('coordinates and distance wrap around', () => {
    expect(wrapCoord(51, 50)).toBe(-50);
    expect(wrapCoord(-51, 50)).toBe(50);
    expect(distance(50, 0, -50, 0, 50)).toBe(1);
    expect(distance(0, 0, 3, 4, 50)).toBe(5);
  });
  it('travel time scales with distance and speed', () => {
    expect(travelTimeMs(10, 10, 1)).toBe(3_600_000);
    expect(travelTimeMs(10, 10, 2)).toBe(1_800_000);
  });
});

describe('perks', () => {
  it('stack and are capped', () => {
    const m = foldPerks([
      { kind: 'build_speed', value: 0.25 },
      { kind: 'build_speed', value: 0.25 },
      { kind: 'troop_cost', value: 0.9 },
      { kind: 'production_wood', value: 0.1 },
      { kind: 'production_all', value: 0.1 },
      { kind: 'nonsense', value: 5 },
    ]);
    expect(m.buildSpeed).toBeCloseTo(1.5);
    expect(m.troopCost).toBeCloseTo(0.7);
    expect(m.production.wood).toBeCloseTo(1.2);
    expect(m.production.clay).toBeCloseTo(1.1);
    expect(m.buildQueue).toBe(1);
  });
});
