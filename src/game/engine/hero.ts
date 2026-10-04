import { and, eq, lte } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { heroes, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import {
  HERO_BONUS_PER_POINT,
  HERO_PRODUCTION_PER_POINT,
  HERO_REGEN_PER_DAY,
  heroFightingStrength,
  levelForXp,
} from '../rules/hero.js';

export type HeroRow = typeof heroes.$inferSelect;

/** Every player has one hero; created on demand for accounts that predate heroes. */
export function ensureHero(q: Q, userId: number, now: number): HeroRow | undefined {
  const existing = q.select().from(heroes).where(eq(heroes.userId, userId)).get();
  if (existing) return existing;
  const user = q.select().from(users).where(eq(users.id, userId)).get();
  const home = q.select().from(villages).where(eq(villages.userId, userId)).orderBy(villages.id).limit(1).get();
  if (!user || !home) return undefined;
  return q
    .insert(heroes)
    .values({ userId, name: user.username, homeVillageId: home.id, locationId: home.id, status: 'home', healthAt: now, createdAt: now })
    .returning()
    .get();
}

export function heroOf(q: Q, userId: number | null): HeroRow | undefined {
  if (userId === null) return undefined;
  return q.select().from(heroes).where(eq(heroes.userId, userId)).get();
}

/** Lazy health regeneration (only while alive). */
export function catchUpHero(q: Q, hero: HeroRow, now: number): HeroRow {
  if (hero.status === 'dead' || hero.status === 'reviving' || now <= hero.healthAt) return hero;
  const health = Math.min(100, hero.health + ((now - hero.healthAt) / 86_400_000) * HERO_REGEN_PER_DAY * config.WORLD_SPEED);
  q.update(heroes).set({ health, healthAt: now }).where(eq(heroes.id, hero.id)).run();
  return { ...hero, health, healthAt: now };
}

export function isHeroAlive(h: HeroRow | undefined): h is HeroRow {
  return !!h && h.status !== 'dead' && h.status !== 'reviving' && h.health > 0;
}

/** Hero at home in a specific village and able to fight. */
export function heroAtHome(q: Q, userId: number | null, villageId: number, now: number): HeroRow | undefined {
  const h = heroOf(q, userId);
  if (!h || h.status !== 'home' || h.locationId !== villageId) return undefined;
  const fresh = catchUpHero(q, h, now);
  return fresh.health > 0 ? fresh : undefined;
}

/** Heroes of other players stationed in a village as reinforcement. */
export function heroesStationedIn(q: Q, villageId: number): HeroRow[] {
  return q.select().from(heroes).where(and(eq(heroes.locationId, villageId), eq(heroes.status, 'away'))).all();
}

export function heroStrength(h: HeroRow): number {
  return heroFightingStrength(h.strength);
}

export function heroOffMultiplier(h: HeroRow | undefined): number {
  return h ? 1 + h.offBonus * HERO_BONUS_PER_POINT : 1;
}

export function heroDefMultiplier(h: HeroRow | undefined): number {
  return h ? 1 + h.defBonus * HERO_BONUS_PER_POINT : 1;
}

/** Flat production bonus for the hero's home village (per resource, per hour). */
export function heroProductionBonus(q: Q, villageId: number): number {
  const h = q.select().from(heroes).where(eq(heroes.homeVillageId, villageId)).get();
  if (!h || h.status === 'dead' || h.status === 'reviving') return 0;
  return h.production * HERO_PRODUCTION_PER_POINT * config.WORLD_SPEED;
}

/** Apply battle damage and XP. Returns the updated hero (status 'dead' if health ran out). */
export function damageHero(q: Q, hero: HeroRow, lossRatio: number, xpGain: number, now: number): HeroRow {
  const h = catchUpHero(q, hero, now);
  const health = Math.max(0, h.health - Math.round(lossRatio * 100));
  const xp = h.xp + Math.max(0, Math.round(xpGain));
  const level = levelForXp(xp);
  const dead = health <= 0;
  const patch = {
    health,
    healthAt: now,
    xp,
    level,
    ...(dead ? { status: 'dead' as const, locationId: null } : {}),
  };
  q.update(heroes).set(patch).where(eq(heroes.id, h.id)).run();
  return { ...h, ...patch };
}

/** Finish hero revivals that are due. */
export function processHeroRevivals(q: Q, now: number): number {
  const due = q.select().from(heroes).where(and(eq(heroes.status, 'reviving'), lte(heroes.reviveAt, now))).all();
  for (const h of due) {
    q.update(heroes)
      .set({ status: 'home', locationId: h.homeVillageId, health: 100, healthAt: h.reviveAt ?? now, reviveAt: null })
      .where(eq(heroes.id, h.id))
      .run();
  }
  return due.length;
}
