import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { movements, reports, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { setTroopsAt, troopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { releaseArtifacts } from '../src/game/actions/endgame.js';
import { natarTargets, planNatarAttack, processNatarAttacks } from '../src/game/actions/natars.js';
import { attackPower } from '../src/game/rules/battle.js';
import { NATAR_FACTOR_MAX, NATAR_FACTOR_MIN, natarArmy, natarStrength } from '../src/game/rules/natars.js';
import { emptyUnits } from '../src/game/rules/units.js';

const power = (units: number[]): number => {
  const p = attackPower({ tribe: 'natars', units });
  return p.inf + p.cav;
};

describe('Natar army sizing', () => {
  it('grows with the target: troops, wall and population all count', () => {
    const weak = natarStrength({ groups: [], tribe: 'romans', wall: 0, residence: 0, playerPop: 300 });
    const walled = natarStrength({ groups: [], tribe: 'romans', wall: 20, residence: 0, playerPop: 300 });
    const army = emptyUnits();
    army[1] = 1000; // Praetorians
    const strong = natarStrength({ groups: [{ tribe: 'romans', units: army }], tribe: 'romans', wall: 20, residence: 10, playerPop: 1500 });
    expect(weak).toBeGreaterThan(2000);
    expect(walled).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(walled * 20);
  });

  it('sends an army of about factor × strength attack; attacks bring rams, raids do not', () => {
    for (const s of [3000, 50_000, 800_000]) {
      for (const f of [NATAR_FACTOR_MIN, NATAR_FACTOR_MAX]) {
        const a = natarArmy(s, f, 'raid');
        expect(power(a) / (s * f)).toBeGreaterThan(0.9);
        expect(power(a) / (s * f)).toBeLessThan(1.15);
        expect(a[6]).toBe(0);
      }
    }
    expect(natarArmy(50_000, 0.7, 'attack')[6]).toBeGreaterThan(0);
  });
});

describe('Natar attacks on players', () => {
  let small: { userId: number; villageId: number };
  let big: { userId: number; villageId: number };
  let bigger: { userId: number; villageId: number };
  const setPop = (id: number, pop: number) => db.update(villages).set({ pop }).where(eq(villages.id, id)).run();

  beforeAll(async () => {
    clock.freeze(Date.UTC(2026, 10, 3));
    ensureWorld(db);
    small = await registerPlayer(db, { username: 'Tiny', password: 'password123', tribe: 'romans' }, clock.now());
    big = await registerPlayer(db, { username: 'Bigga', password: 'password123', tribe: 'teutons' }, clock.now());
    bigger = await registerPlayer(db, { username: 'Biggest', password: 'password123', tribe: 'gauls' }, clock.now());
    for (const p of [small, big, bigger]) db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    releaseArtifacts(db, clock.now());
    setPop(small.villageId, 299);
    setPop(big.villageId, 400);
    setPop(bigger.villageId, 1500);
    const def = emptyUnits();
    def[1] = 2000; // Gaul Swordsmen... slot 1 = Swordsman
    setTroopsAt(db, bigger.villageId, bigger.villageId, def);
  });

  it('never target players under 300 population or under protection', () => {
    const ids = natarTargets(db, clock.now()).map((t) => t.userId);
    expect(ids).not.toContain(small.userId);
    expect(ids).toContain(big.userId);
    db.update(users).set({ protectedUntil: clock.now() + 3_600_000 }).where(eq(users.id, big.userId)).run();
    expect(natarTargets(db, clock.now()).map((t) => t.userId)).not.toContain(big.userId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, big.userId)).run();
  });

  it('send stronger armies against stronger players', () => {
    const mid = () => 0.5;
    const a = planNatarAttack(db, big.userId, clock.now(), mid)!;
    const b = planNatarAttack(db, bigger.userId, clock.now(), mid)!;
    expect(power(b.units)).toBeGreaterThan(power(a.units) * 5);
  });

  it('attack at most once a day; survivors and loot disband instead of joining the stronghold', () => {
    const always = () => 0; // every roll hits; 0 < ATTACK_SHARE → normal attack
    const sent = processNatarAttacks(db, clock.now(), always);
    expect(sent).toBe(2);
    // Nothing more for 24 hours, even when the dice say yes.
    clock.advance(11 * 60_000);
    expect(processNatarAttacks(db, clock.now(), always)).toBe(0);
    const mv = db.select().from(movements).where(eq(movements.toVillageId, big.villageId)).get()!;
    const home = mv.fromVillageId;
    const before = troopsAt(db, home, home);
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    expect(db.select().from(reports).where(eq(reports.userId, big.userId)).all().length).toBeGreaterThan(0);
    // Let every return finish: the Natar garrison stays as it was.
    clock.advance(24 * 3_600_000);
    processDue(db, clock.now());
    expect(troopsAt(db, home, home)).toEqual(before);
    clock.advance(11 * 60_000);
    expect(processNatarAttacks(db, clock.now(), always)).toBe(2);
  });
});
