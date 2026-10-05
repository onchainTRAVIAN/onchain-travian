import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { buyBoost, grantCredits } from '../src/game/actions/credits.js';
import { startResearch } from '../src/game/actions/research.js';

let p: { userId: number; villageId: number };

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 6));
  ensureWorld(db);
  p = await registerPlayer(db, { username: 'Smithy', password: 'password123', tribe: 'teutons' }, clock.now());
  db.update(slots).set({ building: 'blacksmith', level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 22))).run();
  db.update(slots).set({ building: 'warehouse', level: 20 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 20))).run();
  db.update(slots).set({ building: 'granary', level: 20 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 21))).run();
  // Units 1 and 2 researched (slot 0 needs no research).
  db.update(villages).set({ research: JSON.stringify([1, 1, 0, 0, 0, 0, 0, 0, 0, 0]), wood: 50000, clay: 50000, iron: 50000, crop: 50000, resAt: clock.now() }).where(eq(villages.id, p.villageId)).run();
});

describe('Master Trainer', () => {
  it('allows two Blacksmith upgrades at once only while active', () => {
    startResearch(db, p.userId, p.villageId, 'blacksmith', 0, clock.now());
    expect(() => startResearch(db, p.userId, p.villageId, 'blacksmith', 1, clock.now())).toThrow(/busy/);
    grantCredits(db, p.userId, 100, 'test', 'mt-test', clock.now());
    buyBoost(db, p.userId, 'smithy_queue', clock.now());
    startResearch(db, p.userId, p.villageId, 'blacksmith', 1, clock.now());
    expect(() => startResearch(db, p.userId, p.villageId, 'blacksmith', 0, clock.now())).toThrow();
  });
});
