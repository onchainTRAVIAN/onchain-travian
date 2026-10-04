/** Culture points needed to own `n` villages (classic formula: 2000, 8000, 20000, 39000, 65000…). */
export function culturePointsRequired(n: number): number {
  if (n <= 1) return 0;
  return Math.round(1.6 * Math.pow(n - 1, 2.3)) * 1000;
}

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
/** T3.6: loyalty regrows 1% per hour per Residence/Palace level (nothing without either). */
export function loyaltyRegenPerHour(residenceOrPalaceLevel: number): number {
  return Math.max(0, residenceOrPalaceLevel);
}

/** Settlers needed to found a village. */
export const SETTLERS_PER_VILLAGE = 3;

/** An oasis must be within this many tiles (each axis) of the village that captures it. */
export const OASIS_RANGE = 3;
