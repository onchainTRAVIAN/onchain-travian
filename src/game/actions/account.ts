import { hash, verify } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import type { PlayableTribeId } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { createVillage, findSpawnTile } from '../engine/world.js';
import { ensureHero } from '../engine/hero.js';
import { spend, starterCredits } from './credits.js';

// Argon2id with OWASP-recommended parameters.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export type UserRow = typeof users.$inferSelect;

/** Names players can't take: NPC tribes and system roles (case-insensitive, ignoring spaces/dots/dashes). */
const RESERVED_NAMES = ['natars', 'natar', 'nature', 'system', 'admin', 'administrator', 'moderator', 'herald', 'ancientrealms', 'multihunter'];

export function isReservedName(name: string): boolean {
  const n = name.toLowerCase().replace(/[\s._-]/g, '');
  return RESERVED_NAMES.some((r) => n === r);
}

export async function registerPlayer(
  db: DB,
  input: { username: string; password: string; tribe: PlayableTribeId },
  now: number,
): Promise<{ userId: number; villageId: number }> {
  const usernameLower = input.username.toLowerCase();
  if (isReservedName(input.username)) throw new GameError('That name is reserved');
  const taken = db.select({ id: users.id }).from(users).where(eq(users.usernameLower, usernameLower)).get();
  if (taken) throw new GameError('That name is already taken');
  const passwordHash = await hash(input.password, ARGON);
  return db.transaction((tx) => {
    // Re-check inside the transaction: the hash above is async.
    const again = tx.select({ id: users.id }).from(users).where(eq(users.usernameLower, usernameLower)).get();
    if (again) throw new GameError('That name is already taken');
    const isFirst = !tx.select({ id: users.id }).from(users).limit(1).get();
    const user = tx
      .insert(users)
      .values({
        username: input.username,
        usernameLower,
        passwordHash,
        tribe: input.tribe,
        role: isFirst ? 'admin' : 'player',
        createdAt: now,
        lastSeenAt: now,
        protectedUntil: now + config.PROTECTION_HOURS * 3_600_000,
        cultureAt: now,
      })
      .returning({ id: users.id })
      .get();
    const spot = findSpawnTile(tx);
    assertGame(spot, 'The world is full. Please try again later.');
    const villageId = createVillage(tx, {
      userId: user.id,
      name: `${input.username}'s village`,
      x: spot.x,
      y: spot.y,
      isCapital: true,
      now,
    });
    ensureHero(tx, user.id, now);
    starterCredits(tx, user.id, now);
    return { userId: user.id, villageId };
  });
}

/** Constant-ish time login: always runs a verify to avoid leaking which usernames exist. */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hash('not-a-real-password', ARGON);
  return dummyHash;
}

export async function authenticate(db: DB, username: string, password: string): Promise<UserRow | null> {
  const user = db.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).get();
  let ok = false;
  try {
    ok = await verify(user?.passwordHash ?? (await getDummyHash()), password);
  } catch {
    ok = false;
  }
  if (!user || !ok) return null;
  if (user.banned) throw new GameError('This account has been banned');
  return user;
}

export function renameVillage(db: DB, userId: number, villageId: number, name: string): void {
  const res = db
    .update(villages)
    .set({ name })
    .where(and(eq(villages.id, villageId), eq(villages.userId, userId)))
    .run();
  assertGame(res.changes > 0, 'Village not found');
}

/** Changing the player name costs Gold (it's how everyone knows you). */
export const NAME_CHANGE_PRICE = 1000;

export function renamePlayer(db: DB, userId: number, newName: string, now: number): void {
  const name = newName.trim();
  if (name.length < 3 || name.length > 20) throw new GameError('Name must be 3 to 20 characters');
  if (!/^[A-Za-z0-9_ .-]+$/.test(name) || /\s{2,}/.test(name)) throw new GameError('Name can only use letters, numbers, spaces, dots, dashes and underscores');
  if (isReservedName(name)) throw new GameError('That name is reserved');
  db.transaction((tx) => {
    const me = tx.select().from(users).where(eq(users.id, userId)).get();
    if (!me) throw new GameError('Player not found');
    if (me.username === name) throw new GameError('That is already your name');
    const taken = tx.select({ id: users.id }).from(users).where(eq(users.usernameLower, name.toLowerCase())).get();
    if (taken && taken.id !== userId) throw new GameError('That name is already taken');
    spend(tx, userId, NAME_CHANGE_PRICE, `Name change: ${me.username} → ${name}`, now);
    tx.update(users).set({ username: name, usernameLower: name.toLowerCase() }).where(eq(users.id, userId)).run();
  });
}
