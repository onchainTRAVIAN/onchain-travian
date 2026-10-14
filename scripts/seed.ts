/**
 * Demo data: a ready-to-play account ("demo"), a rival, and neighbour villages.
 * Safe to run more than once; existing accounts are left alone.
 * Accounts are wallet-only: demo uses Anvil's public test account #0 (import its well-known dev key into your wallet to log in),
 * and a fresh session token is printed for scripts (cookie "sid").
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { refreshPopulation, setTroopsAt } from '../src/game/engine/state.js';
import { emptyUnits, TRIBE_IDS } from '../src/game/rules/units.js';
import { issueSession } from '../src/web/session.js';

/** Anvil / Hardhat test account #0: its private key is public, never use it for real funds. */
const ANVIL_0 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

ensureWorld(db);
const now = clock.now();

async function ensurePlayer(username: string, tribe: (typeof TRIBE_IDS)[number], wallet?: string) {
  const existing = db.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).get();
  if (existing) {
    const v = db.select().from(villages).where(eq(villages.userId, existing.id)).get();
    return { userId: existing.id, villageId: v?.id ?? 0, created: false };
  }
  const r = await registerPlayer(db, { username, tribe, wallet }, now);
  return { ...r, created: true };
}

function setSlot(villageId: number, slot: number, building: string, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}

function developVillage(villageId: number, fieldLevel: number) {
  for (let s = 1; s <= 18; s++) {
    db.update(slots).set({ level: fieldLevel }).where(and(eq(slots.villageId, villageId), eq(slots.slot, s))).run();
  }
}

const demo = await ensurePlayer('demo', 'romans', ANVIL_0);
if (demo.created) {
  developVillage(demo.villageId, 3);
  // Croplands a bit higher so the demo army doesn't starve.
  db.update(slots).set({ level: 7 }).where(and(eq(slots.villageId, demo.villageId), eq(slots.building, 'cropland'))).run();
  setSlot(demo.villageId, 26, 'main', 5);
  setSlot(demo.villageId, 19, 'warehouse', 6);
  setSlot(demo.villageId, 20, 'granary', 5);
  setSlot(demo.villageId, 22, 'barracks', 3);
  setSlot(demo.villageId, 23, 'academy', 2);
  setSlot(demo.villageId, 24, 'cranny', 4);
  setSlot(demo.villageId, 28, 'embassy', 1);
  setSlot(demo.villageId, 31, 'market', 1);
  setSlot(demo.villageId, 39, 'rally', 1);
  setSlot(demo.villageId, 40, 'citywall', 2);
  db.update(villages).set({ wood: 2400, clay: 2600, iron: 1900, crop: 2100, resAt: now }).where(eq(villages.id, demo.villageId)).run();
  const t = emptyUnits();
  t[0] = 40;
  setTroopsAt(db, demo.villageId, demo.villageId, t);
  db.update(users).set({ protectedUntil: now + 24 * 3_600_000 }).where(eq(users.id, demo.userId)).run();
}

const names = ['Brennus', 'Arminius', 'Boudica', 'Vercassivellaunus', 'Ragnar', 'Cassius', 'Ambiorix', 'Sigurd', 'Livia', 'Orgetorix', 'Freya', 'Marcus'];
for (const [i, name] of names.entries()) {
  const tribe = TRIBE_IDS[i % 3] ?? 'romans';
  const p = await ensurePlayer(name, tribe);
  if (!p.created) continue;
  developVillage(p.villageId, 1 + (i % 4));
  setSlot(p.villageId, 26, 'main', 2 + (i % 5));
  db.update(users).set({ protectedUntil: i % 2 === 0 ? 0 : now + 12 * 3_600_000 }).where(eq(users.id, p.userId)).run();
  const t = emptyUnits();
  t[0] = 5 + i * 3;
  setTroopsAt(db, p.villageId, p.villageId, t);
  refreshPopulation(db, p.villageId);
}

refreshPopulation(db, demo.villageId);

console.log(`Seed complete. "demo" logs in with wallet ${ANVIL_0} (Anvil test account #0). Session token for scripts (cookie "sid"): ${issueSession(demo.userId, demo.villageId)}`);
