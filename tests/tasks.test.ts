import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { slots, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { claimTask, setTasksHidden, taskStatus } from '../src/game/actions/tasks.js';
import { creditBalance } from '../src/game/actions/credits.js';
import { TASKS } from '../src/game/rules/tasks.js';
import { faqTopic } from '../src/game/rules/faq.js';

let p: { userId: number; villageId: number };
const stock = () => db.select().from(villages).where(eq(villages.id, p.villageId)).get()!;

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 8));
  ensureWorld(db);
  p = await registerPlayer(db, { username: 'Newbie', password: 'password123', tribe: 'gauls' }, clock.now());
});

describe('beginner tasks', () => {
  it('start with upgrading a field, which cannot be claimed before it is done', () => {
    const st = taskStatus(db, p.userId);
    expect(st.current?.task.id).toBe('field-1');
    expect(st.current?.done).toBe(false);
    expect(st.current?.hint).toBeGreaterThan(0);
    expect(() => claimTask(db, p.userId, p.villageId, 'field-1', clock.now())).toThrow(/Finish/);
  });

  it('pays the reward once into the village, capped by storage', () => {
    db.update(slots).set({ level: 1 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 1))).run();
    db.update(villages).set({ wood: 0, clay: 0, iron: 0, crop: 0, resAt: clock.now() }).where(eq(villages.id, p.villageId)).run();
    expect(taskStatus(db, p.userId).current?.task.id).toBe('field-1');
    claimTask(db, p.userId, p.villageId, 'field-1', clock.now());
    expect(stock().wood).toBe(150);
    expect(() => claimTask(db, p.userId, p.villageId, 'field-1', clock.now())).toThrow(/already/);
    expect(taskStatus(db, p.userId).current?.task.id).toBe('fields-all-1');
  });

  it('key tasks also give Gold, exactly once', () => {
    db.update(slots).set({ building: 'barracks', level: 1 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, 22))).run();
    const before = creditBalance(db, p.userId);
    claimTask(db, p.userId, p.villageId, 'barracks-1', clock.now());
    expect(creditBalance(db, p.userId)).toBe(before + 5);
  });

  it('every task links to an existing guide topic and has a unique id', () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
    for (const t of TASKS) if (t.guide) expect(faqTopic(t.guide), `${t.id} → ${t.guide}`).toBeTruthy();
  });

  it('can be hidden and shown again', () => {
    setTasksHidden(db, p.userId, true);
    expect(taskStatus(db, p.userId).hidden).toBe(true);
    setTasksHidden(db, p.userId, false);
    expect(taskStatus(db, p.userId).hidden).toBe(false);
  });
});
