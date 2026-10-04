import { eq } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { heroes } from '../../db/schema.js';
import { config } from '../../config.js';
import { HERO_SKILL_MAX, heroPoints, heroReviveCost, heroReviveTimeMs } from '../rules/hero.js';
import { canAfford, subRes } from '../rules/resources.js';
import { assertGame } from '../errors.js';
import { catchUpHero, ensureHero, type HeroRow } from '../engine/hero.js';
import { catchUp, setResources, stockOf } from '../engine/state.js';

export interface SkillInput {
  strength: number;
  offBonus: number;
  defBonus: number;
  production: number;
}

export function pointsUsed(h: Pick<HeroRow, 'strength' | 'offBonus' | 'defBonus' | 'production'>): number {
  return h.strength + h.offBonus + h.defBonus + h.production;
}

export function getHero(db: DB, userId: number, now: number): HeroRow {
  return db.transaction((tx) => {
    const h = ensureHero(tx, userId, now);
    assertGame(h, 'Hero not found');
    return catchUpHero(tx, h, now);
  });
}

/** Spend free skill points (points can only be added, not taken back). */
export function addSkillPoints(db: DB, userId: number, add: SkillInput): void {
  db.transaction((tx) => {
    const h = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    assertGame(h, 'Hero not found');
    const values = [add.strength, add.offBonus, add.defBonus, add.production];
    assertGame(values.every((v) => Number.isInteger(v) && v >= 0), 'Invalid points');
    const total = values.reduce((a, b) => a + b, 0);
    assertGame(total > 0, 'Choose where to put your points');
    const free = heroPoints(h.level) - pointsUsed(h);
    assertGame(total <= free, `You only have ${free} free points`);
    const next = {
      strength: h.strength + add.strength,
      offBonus: h.offBonus + add.offBonus,
      defBonus: h.defBonus + add.defBonus,
      production: h.production + add.production,
    };
    assertGame(Object.values(next).every((v) => v <= HERO_SKILL_MAX), `A skill can have at most ${HERO_SKILL_MAX} points`);
    tx.update(heroes).set(next).where(eq(heroes.id, h.id)).run();
  });
}

export function renameHero(db: DB, userId: number, name: string): void {
  const r = db.update(heroes).set({ name }).where(eq(heroes.userId, userId)).run();
  assertGame(r.changes > 0, 'Hero not found');
}

export function reviveHero(db: DB, userId: number, now: number): HeroRow {
  return db.transaction((tx) => {
    const h = tx.select().from(heroes).where(eq(heroes.userId, userId)).get();
    assertGame(h, 'Hero not found');
    assertGame(h.status === 'dead', 'Your hero is alive');
    const state = catchUp(tx, h.homeVillageId, now);
    assertGame(state, 'Home village not found');
    const cost = heroReviveCost(h.level);
    assertGame(canAfford(stockOf(state.village), cost), `Reviving needs resources in ${state.village.name}`);
    setResources(tx, h.homeVillageId, subRes(stockOf(state.village), cost));
    const patch = { status: 'reviving' as const, reviveAt: now + heroReviveTimeMs(h.level, config.WORLD_SPEED), health: 0, healthAt: now };
    tx.update(heroes).set(patch).where(eq(heroes.id, h.id)).run();
    return { ...h, ...patch };
  });
}
