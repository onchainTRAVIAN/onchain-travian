import { and, desc, eq, isNull, lt, ne, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { medals, messages, users, weekSnapshots, weeks } from '../../db/schema.js';
import type { TribeId } from '../rules/units.js';
import { grantCredits } from './credits.js';

export const WEEK_MS = 7 * 86_400_000;
/** Gold for places 1, 2 and 3 in every category. */
export const WEEKLY_PRIZES = [300, 200, 100] as const;

export const WEEKLY_CATEGORIES = ['attack', 'defense', 'population', 'expansion', 'raid'] as const;
export type WeeklyCategory = (typeof WEEKLY_CATEGORIES)[number];

export const WEEKLY_LABEL: Record<WeeklyCategory, { tab: string; title: string; col: string }> = {
  attack: { tab: 'Attackers', title: 'Attacker of the week', col: 'Attack points' },
  defense: { tab: 'Defenders', title: 'Defender of the week', col: 'Defence points' },
  population: { tab: 'Climbers', title: 'Climber of the week', col: 'Population gained' },
  expansion: { tab: 'Expansion', title: 'Expander of the week', col: 'New villages' },
  raid: { tab: 'Robbers', title: 'Robber of the week', col: 'Resources robbed' },
};

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStart(now: number): number {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - ((d.getUTCDay() + 6) % 7) * 86_400_000;
}

interface Totals {
  userId: number;
  username: string;
  tribe: TribeId;
  avatarAt: number;
  off: number;
  def: number;
  loot: number;
  pop: number;
  villages: number;
}

function totals(q: Q): Totals[] {
  return q
    .select({
      userId: users.id,
      username: users.username,
      tribe: users.tribe,
      avatarAt: users.avatarAt,
      off: users.offPoints,
      def: users.defPoints,
      loot: users.lootTotal,
      pop: sql<number>`coalesce((select sum(v.pop) from villages v where v.user_id = "users"."id"), 0)`,
      villages: sql<number>`(select count(*) from villages v where v.user_id = "users"."id")`,
    })
    .from(users)
    .where(and(eq(users.banned, false), ne(users.tribe, 'natars')))
    .all();
}

export interface WeeklyRow {
  userId: number;
  username: string;
  tribe: TribeId;
  avatarAt: number;
  value: number;
}

/** This week's gains in one category, best first (only players who gained something). */
export function weeklyStandings(q: Q, category: WeeklyCategory, ws: number, limit = 50): WeeklyRow[] {
  const base = new Map(q.select().from(weekSnapshots).where(eq(weekSnapshots.weekStart, ws)).all().map((s) => [s.userId, s]));
  const rows = totals(q).map((t) => {
    // Players who joined during the week count from a fresh start (one village, nothing else).
    const b = base.get(t.userId) ?? { off: 0, def: 0, loot: 0, pop: 0, villages: 1 };
    const gained = {
      attack: t.off - b.off,
      defense: t.def - b.def,
      population: t.pop - b.pop,
      expansion: t.villages - b.villages,
      raid: t.loot - b.loot,
    };
    return { userId: t.userId, username: t.username, tribe: t.tribe, avatarAt: t.avatarAt, value: Math.floor(gained[category]), tie: gained.population };
  });
  return rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || b.tie - a.tie || a.userId - b.userId)
    .slice(0, limit)
    .map(({ tie: _tie, ...r }) => r);
}

function takeSnapshot(q: Q, ws: number): void {
  for (const t of totals(q)) {
    q.insert(weekSnapshots)
      .values({ userId: t.userId, weekStart: ws, off: t.off, def: t.def, loot: Math.floor(t.loot), pop: t.pop, villages: t.villages })
      .onConflictDoNothing()
      .run();
  }
}

/**
 * Called every tick. When a new week has begun: award medals and Gold for the week that ended,
 * then snapshot everyone's totals for the new week. Safe to call any number of times.
 */
export function processWeek(db: DB, now: number): { awarded: number } {
  const ws = weekStart(now);
  return db.transaction((tx) => {
    if (tx.select({ w: weeks.weekStart }).from(weeks).where(eq(weeks.weekStart, ws)).get()) return { awarded: 0 };
    let awarded = 0;
    const prev = tx
      .select()
      .from(weeks)
      .where(and(lt(weeks.weekStart, ws), isNull(weeks.finalizedAt)))
      .orderBy(desc(weeks.weekStart))
      .get();
    if (prev) {
      for (const cat of WEEKLY_CATEGORIES) {
        const top = weeklyStandings(tx, cat, prev.weekStart, 3);
        top.forEach((w, i) => {
          const prize = WEEKLY_PRIZES[i] ?? 0;
          const rank = i + 1;
          const ins = tx
            .insert(medals)
            .values({ userId: w.userId, weekStart: prev.weekStart, category: cat, rank, value: w.value, prize })
            .onConflictDoNothing()
            .run();
          if (ins.changes === 0) return;
          grantCredits(tx, w.userId, prize, `${WEEKLY_LABEL[cat].title} (#${rank})`, `medal:${prev.weekStart}:${cat}:${rank}`, now);
          tx.insert(messages)
            .values({
              fromUserId: null,
              toUserId: w.userId,
              subject: `${['🥇', '🥈', '🥉'][i]} ${WEEKLY_LABEL[cat].title}: place ${rank}`,
              body: `Congratulations! You finished place ${rank} in "${WEEKLY_LABEL[cat].tab}" for the week of ${new Date(prev.weekStart).toISOString().slice(0, 10)} with ${w.value.toLocaleString('en-US')}.\n\nYour medal is on your profile and ${prize} Gold has been added to your account.`,
              createdAt: now,
            })
            .run();
          awarded++;
        });
      }
      // Older unfinished weeks (server was down for longer) are closed without prizes.
      tx.update(weeks).set({ finalizedAt: now }).where(and(lt(weeks.weekStart, ws), isNull(weeks.finalizedAt))).run();
    }
    tx.insert(weeks).values({ weekStart: ws, startedAt: now }).run();
    takeSnapshot(tx, ws);
    return { awarded };
  });
}

export interface MedalView {
  weekStart: number;
  category: WeeklyCategory;
  rank: number;
  value: number;
  prize: number;
}

export function medalsOf(q: Q, userId: number): MedalView[] {
  return q
    .select({ weekStart: medals.weekStart, category: medals.category, rank: medals.rank, value: medals.value, prize: medals.prize })
    .from(medals)
    .where(eq(medals.userId, userId))
    .orderBy(desc(medals.weekStart), medals.rank)
    .all();
}

/** Winners of the most recently finished week. */
export function lastWinners(q: Q): { weekStart: number; rows: (MedalView & { userId: number; username: string })[] } | null {
  const last = q.select({ w: medals.weekStart }).from(medals).orderBy(desc(medals.weekStart)).get();
  if (!last) return null;
  const rows = q
    .select({ weekStart: medals.weekStart, category: medals.category, rank: medals.rank, value: medals.value, prize: medals.prize, userId: medals.userId, username: users.username })
    .from(medals)
    .innerJoin(users, eq(users.id, medals.userId))
    .where(eq(medals.weekStart, last.w))
    .orderBy(medals.category, medals.rank)
    .all();
  return { weekStart: last.w, rows };
}
