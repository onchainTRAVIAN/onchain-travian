/** Resource field output per hour at speed 1, indexed by field level (0..20). */
export const FIELD_PRODUCTION = [
  5, 10, 16, 24, 35, 50, 70, 95, 125, 165, 215, 275, 350, 440, 550, 680, 830, 1000, 1200, 1450, 1750,
] as const;

export function fieldProduction(level: number): number {
  const clamped = Math.max(0, Math.min(level, FIELD_PRODUCTION.length - 1));
  return FIELD_PRODUCTION[clamped] ?? 0;
}

/** Storage capacity of a warehouse/granary at a given level. Level 0 = no building. */
export function storageCapacity(level: number): number {
  if (level <= 0) return 800;
  return Math.round((800 * Math.pow(1.27, level)) / 100) * 100;
}

/** Resources hidden from raiders by a cranny of the given level (per resource). */
export function crannyCapacity(level: number): number {
  return level <= 0 ? 0 : 100 + level * 150;
}
