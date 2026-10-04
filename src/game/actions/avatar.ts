import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { config } from '../../config.js';
import { assertGame, GameError } from '../errors.js';

export const AVATAR_SIZE = 128;
export const AVATAR_MAX_UPLOAD = 5 * 1024 * 1024;
export const BIO_MAX = 500;

/** Avatars live next to the database (on Railway: the persistent volume). */
export function avatarDir(): string {
  const base = config.DATABASE_PATH === ':memory:' ? resolve('data/test-avatars') : dirname(resolve(config.DATABASE_PATH));
  return join(base, 'avatars');
}

export function avatarPath(userId: number): string {
  return join(avatarDir(), `${userId}.webp`);
}

/** Resize to a 128×128 centre crop and compress to WebP. Returns the stored size in bytes. */
export async function saveAvatar(db: DB, userId: number, input: Buffer, now: number): Promise<number> {
  assertGame(input.length > 0, 'Choose a picture to upload');
  assertGame(input.length <= AVATAR_MAX_UPLOAD, 'Pictures can be at most 5 MB');
  let out: Buffer;
  try {
    out = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch {
    throw new GameError('That file is not a picture we can read (use JPG, PNG, WebP or GIF)');
  }
  mkdirSync(avatarDir(), { recursive: true });
  writeFileSync(avatarPath(userId), out);
  db.update(users).set({ avatarAt: now }).where(eq(users.id, userId)).run();
  return out.length;
}

export function removeAvatar(db: DB, userId: number): void {
  rmSync(avatarPath(userId), { force: true });
  db.update(users).set({ avatarAt: 0 }).where(eq(users.id, userId)).run();
}

export function hasAvatar(userId: number): boolean {
  return existsSync(avatarPath(userId));
}

export function setBio(db: DB, userId: number, bio: string): void {
  const clean = bio.replace(/\r\n/g, '\n').trim();
  assertGame(clean.length <= BIO_MAX, `At most ${BIO_MAX} characters`);
  db.update(users).set({ bio: clean }).where(eq(users.id, userId)).run();
}

/** URL for a player's picture: uploaded one (cache-busted), else the tribe default. */
export function avatarUrl(u: { id: number; tribe: string; avatarAt: number }): string {
  return u.avatarAt > 0 ? `/avatar/${u.id}?v=${u.avatarAt}` : `/static/img/avatars/${u.tribe}.svg`;
}
