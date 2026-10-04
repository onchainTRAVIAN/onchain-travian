import { eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { celebrations, users } from '../../db/schema.js';
import { config } from '../../config.js';
import { canAfford, res, subRes, type Resources } from '../rules/resources.js';
import { assertGame } from '../errors.js';
import { catchUp, catchUpCulture, culturePerDay, levelOf, setResources, stockOf, type VillageState } from '../engine/state.js';
import { ownedVillage } from './build.js';

export type CelebrationKind = 'small' | 'great';
export type CelebrationRow = typeof celebrations.$inferSelect;

export const CELEBRATIONS: Record<CelebrationKind, { name: string; cost: Resources; seconds: number; maxCp: number; townhall: number }> = {
  small: { name: 'Small celebration', cost: res(6400, 6650, 5940, 1340), seconds: 86_400, maxCp: 500, townhall: 1 },
  great: { name: 'Great celebration', cost: res(29700, 33250, 32000, 6700), seconds: 216_000, maxCp: 2000, townhall: 10 },
};

/** Town Hall levels make celebrations shorter (like the Main Building). */
export function celebrationMs(kind: CelebrationKind, townhallLevel: number): number {
  const factor = Math.pow(0.964, Math.max(1, townhallLevel) - 1);
  return Math.round((CELEBRATIONS[kind].seconds * factor * 1000) / config.WORLD_SPEED);
}

export function runningCelebration(q: Q, villageId: number): CelebrationRow | undefined {
  return q.select().from(celebrations).where(eq(celebrations.villageId, villageId)).get();
}

export interface CelebrationOption {
  kind: CelebrationKind;
  name: string;
  cost: Resources;
  timeMs: number;
  culturePoints: number;
  available: boolean;
  reason?: string;
}

export function celebrationOptions(q: Q, state: VillageState): CelebrationOption[] {
  const th = levelOf(state, 'townhall');
  const running = runningCelebration(q, state.village.id);
  const perDay = state.userId !== null ? culturePerDay(q, state.userId) : 0;
  return (Object.keys(CELEBRATIONS) as CelebrationKind[]).map((kind) => {
    const c = CELEBRATIONS[kind];
    let reason: string | undefined;
    if (th < c.townhall) reason = `Requires Town Hall level ${c.townhall}`;
    else if (running) reason = 'A celebration is already running';
    else if (!canAfford(stockOf(state.village), c.cost)) reason = 'Not enough resources';
    return {
      kind,
      name: c.name,
      cost: c.cost,
      timeMs: celebrationMs(kind, th),
      culturePoints: Math.max(1, Math.min(c.maxCp, Math.round(perDay))),
      available: !reason,
      reason,
    };
  });
}

export function startCelebration(db: DB, userId: number, villageId: number, kind: CelebrationKind, now: number): CelebrationRow {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const o = celebrationOptions(tx, state).find((x) => x.kind === kind);
    assertGame(o, 'Unknown celebration');
    assertGame(o.available, o.reason ?? 'Not possible right now');
    setResources(tx, villageId, subRes(stockOf(state.village), o.cost));
    return tx
      .insert(celebrations)
      .values({ villageId, kind, culturePoints: o.culturePoints, startAt: now, finishAt: now + o.timeMs })
      .returning()
      .get();
  });
}

/** Called by the event loop when a celebration ends: the culture points are added. */
export function finishCelebration(q: Q, c: CelebrationRow, ownerId: number | null): void {
  q.delete(celebrations).where(eq(celebrations.id, c.id)).run();
  if (ownerId === null) return;
  const cp = catchUpCulture(q, ownerId, c.finishAt);
  q.update(users).set({ culturePoints: cp + c.culturePoints }).where(eq(users.id, ownerId)).run();
}
