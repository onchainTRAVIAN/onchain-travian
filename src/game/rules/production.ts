/** Classic resource field output per hour at speed 1, indexed by field level (0..20). */
export const FIELD_PRODUCTION = [
  2, 5, 9, 15, 22, 33, 50, 70, 100, 145, 200, 280, 375, 495, 635, 800, 1000, 1300, 1600, 2000, 2450,
] as const;

export function fieldProduction(level: number): number {
  const clamped = Math.max(0, Math.min(level, FIELD_PRODUCTION.length - 1));
  return FIELD_PRODUCTION[clamped] ?? 0;
}

/** Warehouse/granary capacity (classic formula). Level 0 = no building = 800. */
export function storageCapacity(level: number): number {
  if (level <= 0) return 800;
  return Math.round((2120 * Math.pow(1.2, level) - 1320) / 100) * 100;
}

/** Cranny capacity per resource, levels 1..10. */
export const CRANNY_CAPACITY = [0, 100, 130, 170, 220, 280, 360, 460, 600, 770, 1000] as const;

export function crannyCapacity(level: number): number {
  return CRANNY_CAPACITY[Math.max(0, Math.min(10, level))] ?? 0;
}

/** Most a village's crannies can hide per resource: what a level-20 warehouse holds. */
export const CRANNY_MAX_HIDDEN = 80_000;

/**
 * Resources hidden per resource type. The classic cranny table (`crannyCapacity`) is for x1;
 * on faster worlds it grows with world speed like production does, capped at a full warehouse.
 */
export function crannyHidden(baseTotal: number, multiplier: number, worldSpeed: number): number {
  return Math.min(CRANNY_MAX_HIDDEN, Math.floor(baseTotal * multiplier * worldSpeed));
}

/** Gaul Trapper: number of traps per trapper level (1..20). */
export const TRAP_CAPACITY = [0, 10, 22, 35, 49, 64, 80, 97, 115, 134, 154, 175, 196, 218, 241, 265, 290, 316, 343, 371, 400] as const;

export function trapCapacity(level: number): number {
  return TRAP_CAPACITY[Math.max(0, Math.min(20, level))] ?? 0;
}
