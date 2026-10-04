/** Total XP needed to reach `level` (level 0 = 0 XP). */
export function xpForLevel(level: number): number {
  return Math.round(50 * level * (level + 1));
}

export function levelForXp(xp: number): number {
  let level = 0;
  while (xpForLevel(level + 1) <= xp && level < 100) level++;
  return level;
}

/** Skill points available: 5 at the start + 4 per level. */
export function heroPoints(level: number): number {
  return 5 + level * 4;
}

export const HERO_SPEED = 7;
export const HERO_UPKEEP = 6;
export const HERO_BASE_STRENGTH = 100;
export const HERO_STRENGTH_PER_POINT = 80;
/** Army attack/defence bonus per point (0.2%). */
export const HERO_BONUS_PER_POINT = 0.002;
/** Resources per hour per production point (all four resources, before world speed). */
export const HERO_PRODUCTION_PER_POINT = 3;
/** Health regained per day (percentage points). */
export const HERO_REGEN_PER_DAY = 20;
/** Max points in one skill. */
export const HERO_SKILL_MAX = 100;

export function heroFightingStrength(strengthPoints: number): number {
  return HERO_BASE_STRENGTH + strengthPoints * HERO_STRENGTH_PER_POINT;
}

export function heroReviveCost(level: number): { wood: number; clay: number; iron: number; crop: number } {
  const k = 1 + level * 0.25;
  return { wood: Math.round(300 * k), clay: Math.round(300 * k), iron: Math.round(300 * k), crop: Math.round(150 * k) };
}

export function heroReviveTimeMs(level: number, speed: number): number {
  return Math.round(((3600 + level * 1800) * 1000) / speed);
}
