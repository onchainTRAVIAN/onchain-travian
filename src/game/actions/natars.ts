import { and, eq, gt, inArray, lte, ne } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { movements, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { distance, travelTimeMs } from '../rules/map.js';
import { NATAR_COOLDOWN_HOURS, NATAR_FACTOR_MAX, NATAR_FACTOR_MIN, NATAR_MIN_POP, natarArmy } from '../rules/natars.js';
import { TRIBES, type UnitCounts } from '../rules/units.js';
import { defenseSnapshot } from '../engine/defense.js';
import { getMeta, setMeta } from '../engine/world.js';

/** How often the Natars look for targets. */
const TICK_MS = 10 * 60_000;
/** Chance per tick once a player is eligible: on average a few hours after the cooldown ends. */
const CHANCE_PER_TICK = TICK_MS / (6 * 3_600_000);
/** Share of Natar attacks that are normal attacks (with rams); the rest are raids. */
const ATTACK_SHARE = 0.2;
/** Natar armies never march longer than this (real time at troop speed 1). */
const MAX_MARCH_MS = 12 * 3_600_000;

export interface NatarPlan {
  userId: number;
  targetVillageId: number;
  fromVillageId: number;
  kind: 'attack' | 'raid';
  units: UnitCounts;
  arriveAt: number;
}

/** Players the Natars may attack now: 300+ population, not protected, no Natar attack for a day. */
export function natarTargets(q: Q, now: number): { userId: number; pop: number }[] {
  const rows = q
    .select({ id: users.id, pop: villages.pop })
    .from(users)
    .innerJoin(villages, eq(villages.userId, users.id))
    .where(and(ne(users.tribe, 'natars'), eq(users.banned, false), lte(users.protectedUntil, now), lte(users.natarAttackAt, now - NATAR_COOLDOWN_HOURS * 3_600_000)))
    .all();
  const pop = new Map<number, number>();
  for (const r of rows) pop.set(r.id, (pop.get(r.id) ?? 0) + r.pop);
  return [...pop].filter(([, p]) => p >= NATAR_MIN_POP).map(([userId, p]) => ({ userId, pop: p }));
}

/** Plan one Natar attack on a player: a village weighted by population, an army sized to its strength. */
export function planNatarAttack(q: Q, userId: number, now: number, rnd: () => number = Math.random): NatarPlan | null {
  const natarVillages = q
    .select({ id: villages.id, x: villages.x, y: villages.y })
    .from(villages)
    .innerJoin(users, eq(users.id, villages.userId))
    .where(eq(users.tribe, 'natars'))
    .all();
  if (natarVillages.length === 0) return null;
  const mine = q.select({ id: villages.id, x: villages.x, y: villages.y, pop: villages.pop }).from(villages).where(eq(villages.userId, userId)).all();
  const total = mine.reduce((s, v) => s + v.pop, 0);
  if (total < NATAR_MIN_POP) return null;
  let pick = rnd() * total;
  const target = mine.find((v) => (pick -= v.pop) < 0) ?? mine[mine.length - 1];
  if (!target) return null;
  const snap = defenseSnapshot(q, target.id, now);
  if (!snap) return null;
  const kind = rnd() < ATTACK_SHARE ? 'attack' : 'raid';
  const factor = NATAR_FACTOR_MIN + rnd() * (NATAR_FACTOR_MAX - NATAR_FACTOR_MIN);
  const units = natarArmy(snap.strength, factor, kind);
  const from = natarVillages
    .map((v) => ({ v, d: distance(v.x, v.y, target.x, target.y, config.MAP_RADIUS) }))
    .sort((a, b) => a.d - b.d)[0]!;
  const slowest = Math.min(...units.map((n, i) => (n > 0 ? TRIBES.natars.units[i]?.speed ?? 5 : Infinity)));
  const march = Math.min(travelTimeMs(from.d, slowest, config.TROOP_SPEED), MAX_MARCH_MS / config.TROOP_SPEED);
  return { userId, targetVillageId: target.id, fromVillageId: from.v.id, kind, units, arriveAt: now + Math.max(60_000, Math.round(march)) };
}

/** Send a planned Natar army on its way (the target sees it coming like any attack). */
export function launchNatarAttack(q: Q, plan: NatarPlan, now: number): void {
  const from = q.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, plan.fromVillageId)).get();
  const to = q.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, plan.targetVillageId)).get();
  if (!from || !to) return;
  q.insert(movements)
    .values({
      kind: plan.kind,
      fromVillageId: plan.fromVillageId,
      toVillageId: plan.targetVillageId,
      originX: from.x,
      originY: from.y,
      toX: to.x,
      toY: to.y,
      units: JSON.stringify(plan.units),
      departAt: now,
      arriveAt: plan.arriveAt,
    })
    .run();
  q.update(users).set({ natarAttackAt: now }).where(eq(users.id, plan.userId)).run();
}

/** Natar attacks on players, checked every 10 minutes from the world tick. */
export function processNatarAttacks(db: DB, now: number, rnd: () => number = Math.random): number {
  const last = Number(getMeta(db, 'natar_attack_tick') ?? '0');
  if (now - last < TICK_MS) return 0;
  setMeta(db, 'natar_attack_tick', String(now));
  let sent = 0;
  for (const t of natarTargets(db, now)) {
    if (rnd() >= CHANCE_PER_TICK) continue;
    db.transaction((tx) => {
      // One Natar army at a time per player.
      const mine = tx.select({ id: villages.id }).from(villages).where(eq(villages.userId, t.userId)).all().map((v) => v.id);
      const natarIds = tx.select({ id: villages.id }).from(villages).innerJoin(users, eq(users.id, villages.userId)).where(eq(users.tribe, 'natars')).all().map((v) => v.id);
      if (mine.length && natarIds.length) {
        const coming = tx
          .select({ id: movements.id })
          .from(movements)
          .where(and(inArray(movements.toVillageId, mine), inArray(movements.fromVillageId, natarIds), gt(movements.arriveAt, now)))
          .get();
        if (coming) return;
      }
      const plan = planNatarAttack(tx, t.userId, now, rnd);
      if (!plan) return;
      launchNatarAttack(tx, plan, now);
      sent++;
    });
  }
  return sent;
}
