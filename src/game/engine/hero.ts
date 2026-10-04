import { and, eq, lte } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { heroes, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { HERO_BONUS_PER_POINT, heroCombat, heroRegenPerDay, levelForXp } from '../rules/hero.js';
import { TRIBES, type TribeId, type UnitDef } from '../rules/units.js';

export type HeroRow = typeof heroes.$inferSelect;

/** The player's hero, if one was trained (T3: heroes come from the Hero's Mansion). */
export function ensureHero(q: Q, userId: number, _now: number): HeroRow | undefined {
  return q.select().from(heroes).where(eq(heroes.userId, userId)).get();
}

/** Tribe of the hero's owner. */
export function heroTribe(q: Q, h: Pick<HeroRow, 'userId'>): TribeId {
  return (q.select({ t: users.tribe }).from(users).where(eq(users.id, h.userId)).get()?.t ?? 'romans') as TribeId;
}

/** The unit the hero was trained from. */
export function heroUnit(tribe: TribeId, h: Pick<HeroRow, 'unitSlot'>): UnitDef {
  return (TRIBES[tribe].units[h.unitSlot] ?? TRIBES[tribe].units[0]) as UnitDef;
}

/** Hero fighting values: attack, defence vs infantry / cavalry, and whether it rides (cavalry). */
export function heroCombatOf(tribe: TribeId, h: HeroRow): { off: number; defInf: number; defCav: number; cav: boolean } {
  const u = heroUnit(tribe, h);
  return { ...heroCombat(u, h.strength, h.defPoints), cav: u.type === 'cav' };
}

export function heroSpeed(tribe: TribeId, h: Pick<HeroRow, 'unitSlot'>): number {
  return heroUnit(tribe, h).speed;
}

export function heroOf(q: Q, userId: number | null): HeroRow | undefined {
  if (userId === null) return undefined;
  return q.select().from(heroes).where(eq(heroes.userId, userId)).get();
}

/** Lazy health regeneration (only while alive). */
export function catchUpHero(q: Q, hero: HeroRow, now: number): HeroRow {
  if (hero.status === 'dead' || hero.status === 'reviving' || now <= hero.healthAt) return hero;
  const health = Math.min(100, hero.health + ((now - hero.healthAt) / 86_400_000) * heroRegenPerDay(hero.regen) * config.WORLD_SPEED);
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

export function heroOffMultiplier(h: HeroRow | undefined): number {
  return h ? 1 + h.offBonus * HERO_BONUS_PER_POINT : 1;
}

export function heroDefMultiplier(h: HeroRow | undefined): number {
  return h ? 1 + h.defBonus * HERO_BONUS_PER_POINT : 1;
}

/** T3 heroes don't produce resources (that came with T4); kept so production code stays simple. */
export function heroProductionBonus(_q: Q, _villageId: number): number {
  return 0;
}

/**
 * Apply battle damage and XP. The hero loses health equal to its army's loss percentage and dies
 * when that is over 90% or the army is wiped out, or its health runs out (T3.6).
 */
export function damageHero(q: Q, hero: HeroRow, lossRatio: number, xpGain: number, now: number): HeroRow {
  const h = catchUpHero(q, hero, now);
  const damage = Math.round(lossRatio * 100);
  const health = Math.max(0, h.health - damage);
  const xp = h.xp + Math.max(0, Math.round(xpGain));
  const level = levelForXp(xp);
  const dead = health <= 0 || damage > 90 || lossRatio >= 1;
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
