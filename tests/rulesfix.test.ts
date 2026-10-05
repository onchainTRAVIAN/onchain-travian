import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { allianceDiplomacy, alliances, slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { setTroopsAt } from '../src/game/engine/state.js';
import { OASIS_LOYALTY_REGEN_PER_LEVEL, oasisLoyaltyNow } from '../src/game/engine/oasis.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { attackBlockedBy, createAlliance } from '../src/game/actions/alliance.js';
import { grantCredits } from '../src/game/actions/credits.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let a: P;
let b: P;

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 7));
  ensureWorld(db);
  a = await registerPlayer(db, { username: 'Diplo1', password: 'password123', tribe: 'romans' }, clock.now());
  b = await registerPlayer(db, { username: 'Diplo2', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [a, b]) {
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    db.update(slots).set({ building: 'embassy', level: 3 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 25))).run();
    db.update(slots).set({ building: 'rally', level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 39))).run();
    grantCredits(db, p.userId, 1000, 'test', `diplo-${p.userId}`, clock.now());
  }
});

describe('alliance treaties block attacks', () => {
  it('a non-aggression pact stops attacks; without it they go through', () => {
    createAlliance(db, a.userId, 'First', 'ONE', clock.now());
    createAlliance(db, b.userId, 'Second', 'TWO', clock.now());
    expect(attackBlockedBy(db, a.userId, b.userId)).toBeNull();
    // Activate a pact directly (proposal + accept is covered by the alliance tests).
    const al = db.select().from(alliances).all();
    db.insert(allianceDiplomacy).values({ fromId: al[0]!.id, toId: al[1]!.id, kind: 'nap', status: 'active', createdAt: clock.now() }).run();
    expect(attackBlockedBy(db, a.userId, b.userId)).toMatch(/non-aggression/);
    const units = emptyUnits();
    units[0] = 5;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const target = db.select().from(villages).where(eq(villages.id, b.villageId)).get()!;
    expect(() => sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units }, clock.now())).toThrow(/non-aggression/);
    // Reinforcing is still fine.
    expect(() => sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'reinforce', units }, clock.now())).not.toThrow();
  });
});

describe('oasis loyalty', () => {
  it('regrows 2 per hour per Hero Mansion level, not by world speed', () => {
    expect(OASIS_LOYALTY_REGEN_PER_LEVEL).toBe(2);
    const fake = { villageId: a.villageId, oasisLoyalty: 0, oasisLoyaltyAt: clock.now() } as Parameters<typeof oasisLoyaltyNow>[1];
    db.update(slots).set({ building: 'heromansion', level: 10 }).where(and(eq(slots.villageId, a.villageId), eq(slots.slot, 30))).run();
    expect(oasisLoyaltyNow(db, fake, clock.now() + 3_600_000)).toBeCloseTo(20);
  });
});

describe('player name change', () => {
  it('costs 1000 Gold, keeps names unique and refuses reserved names', async () => {
    const { renamePlayer, NAME_CHANGE_PRICE } = await import('../src/game/actions/account.js');
    const { creditBalance } = await import('../src/game/actions/credits.js');
    grantCredits(db, a.userId, 2000, 'test', 'rename-test', clock.now());
    const bal = creditBalance(db, a.userId);
    expect(() => renamePlayer(db, a.userId, 'Diplo2', clock.now())).toThrow(/taken/);
    expect(() => renamePlayer(db, a.userId, 'Natars', clock.now())).toThrow(/reserved/);
    renamePlayer(db, a.userId, 'Caesar Prime', clock.now());
    expect(db.select().from(users).where(eq(users.id, a.userId)).get()?.username).toBe('Caesar Prime');
    expect(creditBalance(db, a.userId)).toBe(bal - NAME_CHANGE_PRICE);
  });
});
