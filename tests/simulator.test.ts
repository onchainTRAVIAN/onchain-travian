import { beforeAll, describe, expect, it } from 'vitest';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { reports, slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { setTroopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { sendTroops } from '../src/game/actions/troops.js';
import type { BattleReportData } from '../src/game/engine/reports.js';
import { simulate, type SimInput } from '../src/game/rules/simulate.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let rome: P;
let gaul: P;
const zeros = () => Array.from({ length: 10 }, () => 0);
const pop = (userId: number) => db.select({ p: villages.pop }).from(villages).where(eq(villages.userId, userId)).all().reduce((s, v) => s + v.p, 0);

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 5));
  ensureWorld(db);
  rome = await registerPlayer(db, { username: 'SimRome', password: 'password123', tribe: 'romans' }, clock.now());
  gaul = await registerPlayer(db, { username: 'SimGaul', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [rome, gaul]) db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  db.update(slots).set({ building: 'rally', level: 10 }).where(and(eq(slots.villageId, rome.villageId), eq(slots.slot, 39))).run();
  db.update(slots).set({ building: 'palisade', level: 8 }).where(and(eq(slots.villageId, gaul.villageId), eq(slots.slot, 40))).run();
  // Enough grain that nobody starves while the attack travels.
  for (const p of [rome, gaul]) {
    db.update(slots).set({ building: 'granary', level: 20 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 20))).run();
    db.update(villages).set({ crop: 80000, resAt: clock.now() }).where(eq(villages.id, p.villageId)).run();
  }
});

describe('combat simulator', () => {
  it('gives the same result as a real attack (losses and rammed wall)', () => {
    const atk = emptyUnits();
    atk[2] = 400; // Imperians
    atk[6] = 20; // Battering rams
    const def = emptyUnits();
    def[0] = 300; // Phalanx
    def[1] = 60; // Swordsmen
    setTroopsAt(db, rome.villageId, rome.villageId, atk);
    setTroopsAt(db, gaul.villageId, gaul.villageId, def);
    const input: SimInput = {
      mode: 'attack',
      attacker: { tribe: 'romans', units: [...atk], levels: zeros(), hero: null },
      attackerPop: pop(rome.userId),
      attackBonus: 0,
      defenders: [{ tribe: 'gauls', units: [...def], levels: zeros(), hero: null }],
      village: true,
      wall: 8,
      residence: 0,
      stonemason: 0,
      defenderPop: pop(gaul.userId),
      defenseBonus: 0,
      targetLevel: 0,
      traps: 0,
    };
    const sim = simulate(input);
    const target = db.select().from(villages).where(eq(villages.id, gaul.villageId)).get()!;
    const mv = sendTroops(db, rome.userId, rome.villageId, { x: target.x, y: target.y, kind: 'attack', units: atk }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    const rep = db.select().from(reports).where(eq(reports.userId, rome.userId)).orderBy(desc(reports.id)).get()!;
    const real = JSON.parse(rep.data) as BattleReportData;
    expect(sim.attackerWon).toBe(real.attackerWon);
    expect(sim.attackerLosses).toEqual(real.attacker.losses);
    expect(sim.defenderLosses[0]).toEqual(real.defenders[0]?.losses);
    expect(sim.wallAfter).toBe(real.wall?.to);
    expect(Math.round(sim.attackPower)).toBe(real.attackPower);
  });

  it('raids lose less than attacks, and a stronger attack is needed when losing', () => {
    const base: SimInput = {
      mode: 'attack',
      attacker: { tribe: 'teutons', units: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0], levels: zeros(), hero: null },
      attackerPop: 500, attackBonus: 0,
      defenders: [{ tribe: 'romans', units: [0, 100, 0, 0, 0, 0, 0, 0, 0, 0], levels: zeros(), hero: null }],
      village: true, wall: 5, residence: 0, stonemason: 0, defenderPop: 500, defenseBonus: 0, targetLevel: 0, traps: 0,
    };
    const attack = simulate(base);
    const raid = simulate({ ...base, mode: 'raid' });
    expect(attack.attackerWon).toBe(false);
    expect(raid.attackerLosses[0]).toBeLessThanOrEqual(attack.attackerLosses[0] ?? 0);
    expect(attack.winAt).toBeGreaterThan(1);
    const stronger = simulate({ ...base, attackBonus: (attack.winAt ?? 1) * 1.01 - 1 });
    expect(stronger.attackerWon).toBe(true);
  });
});

describe('combat simulator traps', () => {
  it('Gaul traps catch attackers before the fight, exactly like a real attack', async () => {
    const { trapCatch } = await import('../src/game/rules/battle.js');
    expect(trapCatch([100, 50, 0, 0, 0, 0, 0, 0, 0, 0], 30)).toEqual([20, 10, 0, 0, 0, 0, 0, 0, 0, 0]);
    const base: SimInput = {
      mode: 'raid',
      attacker: { tribe: 'teutons', units: [200, 0, 0, 0, 0, 0, 0, 0, 0, 0], levels: zeros(), hero: null },
      attackerPop: 500, attackBonus: 0,
      defenders: [{ tribe: 'gauls', units: zeros(), levels: zeros(), hero: null }],
      village: true, wall: 0, residence: 0, stonemason: 0, defenderPop: 500, defenseBonus: 0, targetLevel: 0, traps: 50,
    };
    const r = simulate(base);
    expect(r.trapped[0]).toBe(50);
    expect(r.attackerSurvivors[0]).toBe(150 - (r.attackerLosses[0] ?? 0));
    // Not a Gaul village: no traps.
    expect(simulate({ ...base, defenders: [{ ...base.defenders[0]!, tribe: 'romans' }] }).trapped[0]).toBe(0);
  });
});

describe('combat simulator vs real traps', () => {
  it('a real raid into a trapped Gaul village matches the simulator', () => {
    db.update(slots).set({ building: 'trapper', level: 10 }).where(and(eq(slots.villageId, gaul.villageId), eq(slots.slot, 21))).run();
    db.update(villages).set({ traps: 40, prisoners: '{}', crop: 80000, resAt: clock.now() }).where(eq(villages.id, gaul.villageId)).run();
    const def = emptyUnits();
    def[0] = 50;
    setTroopsAt(db, gaul.villageId, gaul.villageId, def);
    const atk = emptyUnits();
    atk[2] = 300;
    setTroopsAt(db, rome.villageId, rome.villageId, atk);
    const wall = db.select({ level: slots.level }).from(slots).where(and(eq(slots.villageId, gaul.villageId), eq(slots.slot, 40))).get()?.level ?? 0;
    const sim = simulate({
      mode: 'raid',
      attacker: { tribe: 'romans', units: [...atk], levels: zeros(), hero: null },
      attackerPop: pop(rome.userId), attackBonus: 0,
      defenders: [{ tribe: 'gauls', units: [...def], levels: zeros(), hero: null }],
      village: true, wall, residence: 0, stonemason: 0, defenderPop: pop(gaul.userId), defenseBonus: 0, targetLevel: 0, traps: 40,
    });
    const target = db.select().from(villages).where(eq(villages.id, gaul.villageId)).get()!;
    const mv = sendTroops(db, rome.userId, rome.villageId, { x: target.x, y: target.y, kind: 'raid', units: atk }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    const rep = db.select().from(reports).where(eq(reports.userId, rome.userId)).orderBy(desc(reports.id)).get()!;
    const real = JSON.parse(rep.data) as BattleReportData;
    expect(sim.trapped[2]).toBe(40);
    // Real reports count trapped soldiers as lost.
    expect(sim.attackerLosses.map((n, i) => n + (sim.trapped[i] ?? 0))).toEqual(real.attacker.losses);
    expect(sim.defenderLosses[0]).toEqual(real.defenders[0]?.losses);
  });
});
