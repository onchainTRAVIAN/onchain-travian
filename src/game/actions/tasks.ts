import { and, eq, inArray, like } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { reports, taskClaims, users, villages } from '../../db/schema.js';
import { GameError, assertGame } from '../errors.js';
import { heroOf } from '../engine/hero.js';
import { oasesOwnedBy } from '../engine/oasis.js';
import { catchUp, depositCapped, loadVillage, ownedTroopTotals, parseLevels } from '../engine/state.js';
import { totalUnits } from '../rules/units.js';
import { res } from '../rules/resources.js';
import { TASKS, taskById, type TaskContext, type TaskDef } from '../rules/tasks.js';
import { membership } from './alliance.js';
import { grantCredits } from './credits.js';
import { ownedVillage } from './build.js';

/** Everything the task checks look at, for one player. */
export function taskContext(q: Q, userId: number): TaskContext {
  const user = q.select({ username: users.username }).from(users).where(eq(users.id, userId)).get();
  const rows = q.select({ id: villages.id }).from(villages).where(eq(villages.userId, userId)).all();
  const vs = rows.map((r) => loadVillage(q, r.id)).filter((v): v is NonNullable<typeof v> => !!v);
  const hero = heroOf(q, userId);
  const coords = new Set(vs.map((v) => `${v.village.x}|${v.village.y}`));
  const sent = q
    .select({ data: reports.data })
    .from(reports)
    .where(and(eq(reports.userId, userId), eq(reports.kind, 'trade')))
    .all()
    .some((r) => {
      try {
        const d = JSON.parse(r.data) as { fromX?: number; fromY?: number };
        return coords.has(`${d.fromX}|${d.fromY}`);
      } catch {
        return false;
      }
    });
  const raidedOasis = !!q
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.userId, userId), inArray(reports.kind, ['attack_won', 'attack_lost']), like(reports.data, '%"oasis":{%')))
    .get();
  return {
    villages: vs.map((v) => ({
      id: v.village.id,
      name: v.village.name,
      isCapital: v.village.isCapital,
      pop: v.village.pop,
      slots: v.slots,
      research: parseLevels(v.village.research),
      blacksmith: parseLevels(v.village.blacksmith),
    })),
    troops: vs.reduce((s, v) => s + totalUnits(ownedTroopTotals(q, v.village.id)), 0),
    hero: hero ? { alive: hero.status === 'home' || hero.status === 'away' || hero.status === 'moving', level: hero.level } : null,
    inAlliance: !!membership(q, userId),
    scouted: !!q.select({ id: reports.id }).from(reports).where(and(eq(reports.userId, userId), eq(reports.kind, 'scout'))).get(),
    raidedOasis,
    sentResources: sent,
    oases: vs.reduce((s, v) => s + oasesOwnedBy(q, v.village.id).length, 0),
    defaultVillageName: vs.some((v) => v.village.isCapital && v.village.name === `${user?.username ?? ''}'s village`),
  };
}

export interface TaskStatus {
  task: TaskDef;
  done: boolean;
  claimed: boolean;
  have?: number;
  need?: number;
  link: string;
  hint: number | null;
}

/** All tasks with their state, and the current one (first not yet claimed). */
export function taskStatus(q: Q, userId: number): { list: TaskStatus[]; current: TaskStatus | null; claimable: number; hidden: boolean } {
  const ctx = taskContext(q, userId);
  const claimed = new Set(q.select({ id: taskClaims.taskId }).from(taskClaims).where(eq(taskClaims.userId, userId)).all().map((r) => r.id));
  const list = TASKS.map((t) => {
    const c = t.check(ctx);
    return { task: t, done: c.done, claimed: claimed.has(t.id), have: c.have, need: c.need, link: t.link(ctx), hint: t.hint ? t.hint(ctx) : null };
  });
  const hidden = !!q.select({ h: users.tasksHidden }).from(users).where(eq(users.id, userId)).get()?.h;
  // The current task: the first claimable one, else the first not done.
  const current = list.find((s) => s.done && !s.claimed) ?? list.find((s) => !s.done) ?? null;
  return { list, current, claimable: list.filter((s) => s.done && !s.claimed).length, hidden };
}

/** Collect a finished task's reward into the given village (storage-capped) and any Gold, once. */
export function claimTask(db: DB, userId: number, villageId: number, taskId: string, now: number): TaskDef {
  const t = taskById(taskId);
  assertGame(t, 'Unknown task');
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const already = tx.select().from(taskClaims).where(and(eq(taskClaims.userId, userId), eq(taskClaims.taskId, taskId))).get();
    assertGame(!already, 'You already collected this reward');
    if (!t.check(taskContext(tx, userId)).done) throw new GameError('Finish the task first');
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    depositCapped(tx, state, res(t.reward.wood, t.reward.clay, t.reward.iron, t.reward.crop));
    if (t.reward.gold) grantCredits(tx, userId, t.reward.gold, `Task: ${t.title}`, `task:${userId}:${t.id}`, now);
    tx.insert(taskClaims).values({ userId, taskId, claimedAt: now }).run();
    return t;
  });
}

export function setTasksHidden(db: DB, userId: number, hidden: boolean): void {
  db.update(users).set({ tasksHidden: hidden }).where(eq(users.id, userId)).run();
}
