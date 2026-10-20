import { hash } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { users, villages, wallets } from '../../db/schema.js';
import { consumeSignupTicket } from '../../crypto/wallet.js';
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

/**
 * New player + capital. Real players join with a verified wallet (`wallet` + the `signupTicket` it got, used up here);
 * `password` is only for scripts and tests that create players directly (wallet-only accounts store an unusable hash).
 */
export async function registerPlayer(
  db: DB,
  input: { username: string; tribe: PlayableTribeId; wallet?: string; signupTicket?: string; password?: string },
  now: number,
): Promise<{ userId: number; villageId: number }> {
  const usernameLower = input.username.toLowerCase();
  if (isReservedName(input.username)) throw new GameError('That name is reserved');
  const taken = db.select({ id: users.id }).from(users).where(eq(users.usernameLower, usernameLower)).get();
  if (taken) throw new GameError('That name is already taken');
  const address = input.wallet?.toLowerCase();
  const passwordHash = input.password ? await hash(input.password, ARGON) : '!wallet';
  return db.transaction((tx) => {
    // Re-check inside the transaction: the hash above is async.
    const again = tx.select({ id: users.id }).from(users).where(eq(users.usernameLower, usernameLower)).get();
    if (again) throw new GameError('That name is already taken');
    if (address) {
      assertGame(!tx.select({ id: wallets.userId }).from(wallets).where(eq(wallets.address, address)).get(), 'This wallet already has an account');
      if (input.signupTicket) consumeSignupTicket(tx, input.signupTicket, now);
    }
    // Admins: wallets listed in ADMIN_WALLETS. Without that list, the very first account (local/dev worlds only).
    const listed = !!address && config.ADMIN_WALLETS.includes(address);
    const firstOnDev = config.ADMIN_WALLETS.length === 0 && config.NODE_ENV !== 'production' && !tx.select({ id: users.id }).from(users).limit(1).get();
    const isAdmin = listed || firstOnDev;
    const user = tx
      .insert(users)
      .values({
        username: input.username,
        usernameLower,
        passwordHash,
        tribe: input.tribe,
        role: isAdmin ? 'admin' : 'player',
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
    if (address) tx.insert(wallets).values({ userId: user.id, address, linkedAt: now }).run();
    ensureHero(tx, user.id, now);
    starterCredits(tx, user.id, now);
    return { userId: user.id, villageId };
  });
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
