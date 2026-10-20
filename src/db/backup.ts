import { createReadStream, createWriteStream, mkdirSync, readdirSync, renameSync, rmSync, statSync, statfsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { config } from '../config.js';
import { sqlite } from './index.js';

const MB = 1048576;

/** Free space on the disk that holds the database, or null (in-memory db, or the platform can't tell). */
export function diskSpace(): { freeMb: number; totalMb: number } | null {
  if (config.DATABASE_PATH === ':memory:') return null;
  try {
    const s = statfsSync(dirname(resolve(config.DATABASE_PATH)));
    return { freeMb: Math.round((s.bavail * s.bsize) / MB), totalMb: Math.round((s.blocks * s.bsize) / MB) };
  } catch {
    return null;
  }
}

/** Size of the database file (without its WAL), in MB. */
export function dbSizeMb(): number {
  if (config.DATABASE_PATH === ':memory:') return 0;
  try {
    return Math.round(statSync(config.DATABASE_PATH).size / MB);
  } catch {
    return 0;
  }
}

export const backupDir = () => join(dirname(resolve(config.DATABASE_PATH)), 'backups');

/** Snapshot files of this world, newest first. */
export function listBackups(): { name: string; bytes: number }[] {
  const prefix = `${basename(config.DATABASE_PATH, '.db')}-`;
  try {
    return readdirSync(backupDir())
      .filter((f) => f.startsWith(prefix) && f.endsWith('.db.gz'))
      .sort()
      .reverse()
      .map((name) => ({ name, bytes: statSync(join(backupDir(), name)).size }));
  } catch {
    return [];
  }
}

/**
 * Online snapshot (SQLite backup API, the game keeps running), gzipped into backups/ next to the database.
 * The raw copy goes to the container's temp disk, so the volume only ever holds the small .gz files.
 */
export async function backupNow(now: number): Promise<string | null> {
  if (config.DATABASE_PATH === ':memory:') return null;
  const disk = diskSpace();
  const dbBytes = statSync(config.DATABASE_PATH).size;
  // A gzipped world is far smaller than the db, but never squeeze the volume the game itself needs.
  if (disk && disk.freeMb * MB < dbBytes + 50 * MB) {
    console.error(`Backup skipped: ${disk.freeMb} MB free is too little for a ${Math.round(dbBytes / MB)} MB database`);
    return null;
  }
  mkdirSync(backupDir(), { recursive: true });
  const stamp = new Date(now).toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const name = `${basename(config.DATABASE_PATH, '.db')}-${stamp}.db.gz`;
  const raw = join(tmpdir(), `${name}.raw`);
  try {
    await sqlite.backup(raw);
    await pipeline(createReadStream(raw), createGzip({ level: 6 }), createWriteStream(join(backupDir(), `${name}.part`)));
    // Renamed only when complete, so a crash never leaves a half file that looks like a backup.
    renameSync(join(backupDir(), `${name}.part`), join(backupDir(), name));
  } finally {
    rmSync(raw, { force: true });
    rmSync(join(backupDir(), `${name}.part`), { force: true });
  }
  for (const old of listBackups().slice(config.BACKUP_KEEP)) rmSync(join(backupDir(), old.name), { force: true });
  return name;
}
