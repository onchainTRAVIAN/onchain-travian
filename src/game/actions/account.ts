import { hash, verify } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import type { TribeId } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { createVillage, findSpawnTile } from '../engine/world.js';

// Argon2id with OWASP-recommended parameters.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export type UserRow = typeof users.$inferSelect;

export async function registerPlayer(
  db: DB,
  input: { username: string; password: string; tribe: TribeId },
  now: number,
): Promise<{ userId: number; villageId: number }> {
  const usernameLower = input.username.toLowerCase();
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
