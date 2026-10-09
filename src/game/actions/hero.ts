import { and, eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { heroes, tiles, users } from '../../db/schema.js';
import { config } from '../../config.js';
import {
  HERO_SKILL_MAX,
  canBecomeHero,
  heroPoints,
  heroReviveCost,
  heroReviveTimeMs,
  heroTrainCost,
  heroTrainTimeMs,
} from '../rules/hero.js';
import { canAfford, subRes } from '../rules/resources.js';
import { TRIBES, type TribeId } from '../rules/units.js';
import { assertGame } from '../errors.js';
import { catchUpHero, heroTribe, heroUnit, type HeroRow } from '../engine/hero.js';
import { catchUp, levelOf, setResources, setTroopsAt, stockOf, troopsAt } from '../engine/state.js';
import { isResearched } from './research.js';
import { ownedVillage } from './build.js';
import { clearOasisGarrison } from '../engine/oasisTroops.js';

export interface SkillInput {
  strength: number;
  defPoints: number;
  offBonus: number;
  defBonus: number;
  regen: number;
}

export const SKILL_KEYS = ['strength', 'defPoints', 'offBonus', 'defBonus', 'regen'] as const;

export function pointsUsed(h: Pick<HeroRow, 'strength' | 'defPoints' | 'offBonus' | 'defBonus' | 'regen'>): number {
  return h.strength + h.defPoints + h.offBonus + h.defBonus + h.regen;
}

/** The player's hero (with health regenerated), or undefined if none has been trained yet. */
export function getHero(db: DB, userId: number, now: number): HeroRow | undefined {
  return db.transaction((tx) => {
    const h = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    return h ? catchUpHero(tx, h, now) : undefined;
  });
}

/**
 * Train a hero in the Hero's Mansion from one researched fighting unit at home (T3.6). The unit is
 * used up; cost is twice the unit's, time 1.6× its training time. A fallen hero can be replaced.
 */
export function trainHero(db: DB, userId: number, villageId: number, unitSlot: number, now: number): HeroRow {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    assertGame(levelOf(state, 'heromansion') >= 1, "Build a Hero's Mansion first");
    const existing = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    assertGame(!existing || existing.status === 'dead', 'You already have a hero');
    const unit = TRIBES[state.tribe].units[unitSlot];
    assertGame(unit && canBecomeHero(unit), 'This unit cannot become a hero');
    assertGame(isResearched(state, unitSlot), 'Research this unit first');
    const home = troopsAt(tx, villageId, villageId);
    assertGame((home[unitSlot] ?? 0) >= 1, `You need a ${unit.name} at home in ${state.village.name}`);
    const cost = heroTrainCost(unit);
    assertGame(canAfford(stockOf(state.village), cost), 'Not enough resources');
    setResources(tx, villageId, subRes(stockOf(state.village), cost));
    setTroopsAt(tx, villageId, villageId, home.map((n, i) => (i === unitSlot ? n - 1 : n)));
    const readyAt = now + heroTrainTimeMs(unit, config.WORLD_SPEED);
    const user = tx.select({ name: users.username }).from(users).where(eq(users.id, userId)).get();
    const fresh = {
      homeVillageId: villageId,
      locationId: null,
      status: 'reviving' as const,
      reviveAt: readyAt,
      unitSlot,
      level: 0,
      xp: 0,
      health: 0,
      healthAt: now,
      strength: 0,
      defPoints: 0,
      offBonus: 0,
      defBonus: 0,
      regen: 0,
      production: 0,
    };
    if (existing) {
      // House rule (2026-10-06): a hero retrained from another unit keeps its level, experience and
      // skill points - only the unit it fights as (base stats, speed) changes.
      const keep = { ...fresh, level: existing.level, xp: existing.xp, strength: existing.strength, defPoints: existing.defPoints, offBonus: existing.offBonus, defBonus: existing.defBonus, regen: existing.regen };
      tx.update(heroes).set(keep).where(eq(heroes.id, existing.id)).run();
      return { ...existing, ...keep };
    }
    return tx
      .insert(heroes)
      .values({ userId, name: user?.name ?? 'Hero', createdAt: now, ...fresh })
      .returning()
      .get();
  });
}

/**
 * Spend skill points. At level 0 points can be redistributed freely (the form sets the totals);
 * later they can only be added.
 */
export function setSkills(db: DB, userId: number, target: SkillInput): void {
  db.transaction((tx) => {
    const h = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    assertGame(h, 'You have no hero');
    const values = SKILL_KEYS.map((k) => target[k]);
    assertGame(values.every((v) => Number.isInteger(v) && v >= 0 && v <= HERO_SKILL_MAX), `A skill can have 0–${HERO_SKILL_MAX} points`);
    const total = values.reduce((a, b) => a + b, 0);
    assertGame(total <= heroPoints(h.level), `Your hero has ${heroPoints(h.level)} points at level ${h.level}`);
    if (h.level > 0) {
      assertGame(SKILL_KEYS.every((k) => target[k] >= h[k]), 'Points can only be moved while your hero is level 0');
    }
    tx.update(heroes).set({ strength: target.strength, defPoints: target.defPoints, offBonus: target.offBonus, defBonus: target.defBonus, regen: target.regen }).where(eq(heroes.id, h.id)).run();
  });
}

export function renameHero(db: DB, userId: number, name: string): void {
  const r = db.update(heroes).set({ name }).where(eq(heroes.userId, userId)).run();
  assertGame(r.changes > 0, 'You have no hero');
}

/** Revive a fallen hero in its home village: like training it again at its level. */
export function reviveHero(db: DB, userId: number, now: number): HeroRow {
  return db.transaction((tx) => {
    const h = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    assertGame(h, 'You have no hero');
    assertGame(h.status === 'dead', 'Your hero is alive');
    const state = catchUp(tx, h.homeVillageId, now);
    assertGame(state, 'Home village not found');
    const unit = heroUnit(heroTribe(tx, h), h);
    const cost = heroReviveCost(unit, h.level);
    assertGame(canAfford(stockOf(state.village), cost), `Reviving needs resources in ${state.village.name}`);
    setResources(tx, h.homeVillageId, subRes(stockOf(state.village), cost));
    const patch = { status: 'reviving' as const, reviveAt: now + heroReviveTimeMs(unit, h.level, config.WORLD_SPEED), health: 0, healthAt: now };
    tx.update(heroes).set(patch).where(eq(heroes.id, h.id)).run();
    return { ...h, ...patch };
  });
}

/** Give up an oasis held by one of your villages (it becomes wild again). */
export function releaseOasis(db: DB, userId: number, villageId: number, x: number, y: number, now: number): void {
  db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const r = tx
      .update(tiles)
      // Animals keep their current number and regrow slowly from now (no instant respawn to farm).
      .set({ villageId: null, animalsAt: now, oasisLoyalty: 100, oasisLoyaltyAt: null })
      .where(and(eq(tiles.x, x), eq(tiles.y, y), eq(tiles.kind, 'oasis'), eq(tiles.villageId, villageId)))
      .run();
    assertGame(r.changes > 0, 'This oasis is not held by this village');
    clearOasisGarrison(tx, x, y, now);
  });
}

/** Units in this village that could become a hero (researched fighting units at home). */
export function heroCandidates(tribe: TribeId, home: number[], researched: (slot: number) => boolean) {
  return TRIBES[tribe].units
    .map((u, slot) => ({ unit: u, slot, have: home[slot] ?? 0 }))
    .filter((c) => canBecomeHero(c.unit) && researched(c.slot));
}
