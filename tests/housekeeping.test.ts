import { beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { reports, sessions } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { config } from '../src/config.js';
import { ensureWorld, setMeta } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { processHousekeeping, pruneReports } from '../src/game/engine/housekeeping.js';

const DAY = 86_400_000;
let a: number;
let b: number;

const count = (userId: number) => db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.userId, userId)).get()?.n ?? 0;

function fill(userId: number, n: number, at: (i: number) => number) {
  const rows = Array.from({ length: n }, (_, i) => ({ userId, kind: 'attack_won', title: `r${i}`, data: '{}', outcome: '-', createdAt: at(i) }));
  for (let i = 0; i < rows.length; i += 500) db.insert(reports).values(rows.slice(i, i + 500)).run();
}

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 3));
  ensureWorld(db);
  a = (await registerPlayer(db, { username: 'Keeper', password: 'password123', tribe: 'romans' }, clock.now())).userId;
  b = (await registerPlayer(db, { username: 'Farmer', password: 'password123', tribe: 'teutons' }, clock.now())).userId;
});

describe('report clean-up', () => {
  it('deletes reports older than REPORT_DAYS and keeps the newer ones', () => {
    const now = clock.now();
    fill(a, 10, (i) => now - (config.REPORT_DAYS + 1) * DAY - i);
    fill(a, 5, (i) => now - DAY + i);
    expect(pruneReports(db, now)).toBe(10);
    expect(count(a)).toBe(5);
  });

  it('keeps only the newest REPORT_CAP per player', () => {
    const now = clock.now();
    fill(b, config.REPORT_CAP + 120, (i) => now - 60_000 * (config.REPORT_CAP + 120 - i));
    pruneReports(db, now);
    expect(count(b)).toBe(config.REPORT_CAP);
    // The oldest ones went: the first 120 titles are gone.
    const oldest = db.select({ title: reports.title }).from(reports).where(eq(reports.userId, b)).orderBy(reports.createdAt).limit(1).get();
    expect(oldest?.title).toBe('r120');
    expect(count(a)).toBe(5);
  });

  it('runs every 10 minutes from the tick and drops expired sessions', () => {
    const now = clock.now();
    db.insert(sessions).values({ id: 'old', userId: a, csrf: 'x', villageId: null, createdAt: now - 40 * DAY, expiresAt: now - DAY }).run();
    db.insert(sessions).values({ id: 'live', userId: a, csrf: 'y', villageId: null, createdAt: now, expiresAt: now + DAY }).run();
    setMeta(db, 'housekeeping_tick', '0');
    processHousekeeping(db, now);
    const ids = db.select({ id: sessions.id }).from(sessions).all().map((s) => s.id);
    expect(ids).toContain('live');
    expect(ids).not.toContain('old');
    // Within the 10 minutes nothing runs again.
    db.insert(sessions).values({ id: 'old2', userId: a, csrf: 'z', villageId: null, createdAt: now - 40 * DAY, expiresAt: now - DAY }).run();
    processHousekeeping(db, now + 60_000);
    expect(db.select({ id: sessions.id }).from(sessions).all().map((s) => s.id)).toContain('old2');
  });
});
