import { dirname, resolve } from 'node:path';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { diskSpace } from '../../db/backup.js';
import { reports, sessions, users } from '../../db/schema.js';
import { config } from '../../config.js';
import { getMeta, setMeta } from './world.js';

const TICK_MS = 10 * 60_000;
const DAY = 86_400_000;
/** Rows removed per player per pass, so one pass never writes a huge transaction (WAL stays small). */
const BATCH = 5000;

/**
 * Old reports are deleted automatically: anything older than REPORT_DAYS, and everything past a player's newest
 * REPORT_CAP (auto-raids on a fast world write tens of thousands a day - without this the database fills the disk).
 */
export function pruneReports(db: DB, now: number): number {
  const cutoff = now - config.REPORT_DAYS * DAY;
  let removed = 0;
  for (const { id } of db.select({ id: users.id }).from(users).all()) {
    const old = db.select({ id: reports.id }).from(reports).where(and(eq(reports.userId, id), lt(reports.createdAt, cutoff))).limit(BATCH);
    removed += db.delete(reports).where(inArray(reports.id, old)).run().changes;
    const n = db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.userId, id)).get()?.n ?? 0;
    if (n <= config.REPORT_CAP) continue;
    const extra = db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.userId, id))
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(Math.min(BATCH, n - config.REPORT_CAP))
      .offset(config.REPORT_CAP);
    removed += db.delete(reports).where(inArray(reports.id, extra)).run().changes;
  }
  return removed;
}

/** Every 10 minutes: prune reports, drop expired sessions, warn loudly when the disk is nearly full. */
export function processHousekeeping(db: DB, now: number): void {
  const last = Number(getMeta(db, 'housekeeping_tick') ?? '0');
  if (now - last < TICK_MS) return;
  setMeta(db, 'housekeeping_tick', String(now));
  const removed = pruneReports(db, now);
  if (removed > 0) console.log(`Housekeeping: deleted ${removed} old report(s)`);
  db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
  const disk = diskSpace();
  if (disk && disk.freeMb < Math.max(50, disk.totalMb * 0.15)) {
    console.error(`DISK ALMOST FULL: ${disk.freeMb} MB free of ${disk.totalMb} MB at ${dirname(resolve(config.DATABASE_PATH))} - grow the volume`);
  }
}
