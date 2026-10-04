import type { UnitDef } from './units.js';
import { res, type Resources } from './resources.js';

/**
 * Classic Travian 3.6 hero (Kirilloid's T3 model, TravianZ): trained in the Hero's Mansion from
 * one of your units, whose stats and speed it builds on. Five skills, 5 points per level.
 */

/** Total XP needed to reach `level` (level 0 = 0 XP). */
export function xpForLevel(level: number): number {
  return Math.round(50 * level * (level + 1));
}

export function levelForXp(xp: number): number {
  let level = 0;
  while (xpForLevel(level + 1) <= xp && level < 100) level++;
  return level;
}

/** Skill points available: 5 at level 0, +5 per level. */
export function heroPoints(level: number): number {
  return 5 + level * 5;
}

export const HERO_UPKEEP = 6;
/** Army attack/defence bonus per point (0.2%, max 20%). */
export const HERO_BONUS_PER_POINT = 0.002;
/** Max points in one skill. */
export const HERO_SKILL_MAX = 100;
/** XP an enemy hero is worth when killed (its upkeep). */
export const HERO_XP_VALUE = 6;

/** Units that can become heroes: fighting infantry and cavalry (no scouts, siege, chiefs or settlers). */
export function canBecomeHero(u: UnitDef): boolean {
  return u.type === 'inf' || u.type === 'cav';
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Hero combat values from its unit and skill points (Kirilloid t3/hero.ts). */
export function heroCombat(u: UnitDef, offPts: number, defPts: number): { off: number; defInf: number; defCav: number } {
  const a = u.attack;
  const di = u.defInf;
  const dc = u.defCav;
  const k = dc > 0 ? Math.pow(di / dc, 0.2) : 1;
  return {
    off: round5(((2 * a) / 3 + 27.5) * offPts + (5 * a) / 4),
    defInf: round5(((2 * di) / 3 + 27.5 * k) * defPts + (5 * di) / 3),
    defCav: round5(((2 * dc) / 3 + 27.5 / k) * defPts + (5 * dc) / 3),
  };
}

/** Health regained per day in % (10 + 5 per regeneration point), before world speed. */
export function heroRegenPerDay(regenPts: number): number {
  return 10 + 5 * regenPts;
}

/** Training a hero: twice the unit's cost, 1.6× its training time. */
export function heroTrainCost(u: UnitDef): Resources {
  return res(u.cost.wood * 2, u.cost.clay * 2, u.cost.iron * 2, u.cost.crop * 2);
}

export function heroTrainTimeMs(u: UnitDef, speed: number): number {
  return Math.round((u.trainTime * 1.6 * 1000) / speed);
}

/** Reviving: like training at the hero's level — 2 × cost (+30 after level 0) × (level+1)^1.25. */
export function heroReviveCost(u: UnitDef, level: number): Resources {
  const f = Math.pow(Math.min(60, level) + 1, 1.25);
  const add = level > 0 ? 30 : 0;
  const c = (n: number) => Math.round((2 * n + add) * f);
  return res(c(u.cost.wood), c(u.cost.clay), c(u.cost.iron), c(u.cost.crop));
}

export function heroReviveTimeMs(u: UnitDef, level: number, speed: number): number {
  return Math.round((u.trainTime * 1.6 * (Math.min(60, level) + 1) * 1000) / speed);
}
