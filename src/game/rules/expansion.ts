/** Culture points needed to own `n` villages (n = 1 is free). */
export function culturePointsRequired(n: number): number {
  if (n <= 1) return 0;
  return 1000 * Math.pow(n - 1, 2);
}

/** Culture points per day a building level produces (before world speed). */
export const CULTURE_PER_LEVEL = 4;

/** Expansion slots a village gets from its residence or palace. */
export function expansionSlots(residenceLevel: number, palaceLevel: number): number {
  if (palaceLevel > 0) return (palaceLevel >= 10 ? 1 : 0) + (palaceLevel >= 15 ? 1 : 0) + (palaceLevel >= 20 ? 1 : 0);
  return (residenceLevel >= 10 ? 1 : 0) + (residenceLevel >= 20 ? 1 : 0);
}

/** Oases a village may hold, from its Hero's Mansion. */
export function oasisSlots(mansionLevel: number): number {
  return (mansionLevel >= 10 ? 1 : 0) + (mansionLevel >= 15 ? 1 : 0) + (mansionLevel >= 20 ? 1 : 0);
}

/** Loyalty regained per hour (before world speed). */
export function loyaltyRegenPerHour(residenceOrPalaceLevel: number): number {
  return 1 + residenceOrPalaceLevel * 0.25;
}

/** Settlers needed to found a village. */
export const SETTLERS_PER_VILLAGE = 3;

/** An oasis must be within this many tiles (each axis) of the village that captures it. */
export const OASIS_RANGE = 3;
