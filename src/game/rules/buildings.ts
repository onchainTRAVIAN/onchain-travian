import { res, roundTo5, type ResourceKey, type Resources } from './resources.js';

export const FIELD_IDS = ['woodcutter', 'claypit', 'ironmine', 'cropland'] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export const TOWN_BUILDING_IDS = [
  'main',
  'warehouse',
  'granary',
  'cranny',
  'barracks',
  'stable',
  'workshop',
  'academy',
  'smithy',
  'market',
  'embassy',
  'residence',
  'palace',
  'rally',
  'wall',
] as const;
export type TownBuildingId = (typeof TOWN_BUILDING_IDS)[number];
export type BuildingId = FieldId | TownBuildingId;

export interface Requirement {
  building: BuildingId;
  level: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  icon: string;
  description: string;
  kind: 'field' | 'town';
  /** Max level; resource fields outside the capital are further capped by FIELD_MAX_NON_CAPITAL. */
  maxLevel: number;
  baseCost: Resources;
  costFactor: number;
  /** Seconds to build level 1 at speed 1 with a level-1 main building. */
  baseTime: number;
  timeFactor: number;
  /** Population added per level. */
  pop: number;
  /** Culture points produced per day per level. */
  culture: number;
  requires: Requirement[];
  /** Can more than one exist in a village (warehouse, granary, cranny)? */
  multiple: boolean;
  /** Fixed slot only (rally point / wall). */
  fixedSlot?: number;
  /** Buildings that cannot coexist with this one. */
  excludes?: BuildingId[];
  produces?: ResourceKey;
}

export const FIELD_MAX_NON_CAPITAL = 10;

/** Slots 1-18: resource fields. 19-38: town building plots. 39: rally point. 40: wall. */
export const FIELD_SLOTS = 18;
export const TOWN_SLOT_FIRST = 19;
export const TOWN_SLOT_LAST = 38;
export const RALLY_SLOT = 39;
export const WALL_SLOT = 40;
export const MAIN_SLOT = 19;

const B = (def: Omit<BuildingDef, 'multiple' | 'culture'> & Partial<Pick<BuildingDef, 'multiple' | 'culture'>>): BuildingDef => ({
  multiple: false,
  culture: 1,
  ...def,
});

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  woodcutter: B({
    id: 'woodcutter', name: 'Woodcutter', icon: '🪵', kind: 'field', produces: 'wood',
    description: 'Fells trees to produce wood. Higher levels mean more wood per hour.',
    maxLevel: 20, baseCost: res(40, 100, 50, 60), costFactor: 1.62, baseTime: 220, timeFactor: 1.55, pop: 1, requires: [], multiple: true, culture: 0,
  }),
  claypit: B({
    id: 'claypit', name: 'Clay Pit', icon: '🧱', kind: 'field', produces: 'clay',
    description: 'Digs clay used for almost every building.',
    maxLevel: 20, baseCost: res(80, 40, 80, 50), costFactor: 1.62, baseTime: 200, timeFactor: 1.55, pop: 1, requires: [], multiple: true, culture: 0,
  }),
  ironmine: B({
    id: 'ironmine', name: 'Iron Mine', icon: '⛓️', kind: 'field', produces: 'iron',
    description: 'Mines iron ore, essential for weapons and armour.',
    maxLevel: 20, baseCost: res(100, 80, 30, 60), costFactor: 1.62, baseTime: 260, timeFactor: 1.55, pop: 1, requires: [], multiple: true, culture: 0,
  }),
  cropland: B({
    id: 'cropland', name: 'Cropland', icon: '🌾', kind: 'field', produces: 'crop',
    description: 'Grows food for your people and your army. Each soldier and citizen eats crop every hour.',
    maxLevel: 20, baseCost: res(70, 90, 70, 20), costFactor: 1.62, baseTime: 180, timeFactor: 1.55, pop: 0, requires: [], multiple: true, culture: 0,
  }),

  main: B({
    id: 'main', name: 'Main Building', icon: '🏛️', kind: 'town',
    description: 'The heart of the village. Every level makes all construction faster.',
    maxLevel: 20, baseCost: res(70, 40, 60, 20), costFactor: 1.28, baseTime: 600, timeFactor: 1.3, pop: 1, culture: 2, requires: [],
  }),
  warehouse: B({
    id: 'warehouse', name: 'Warehouse', icon: '🏚️', kind: 'town', multiple: true,
    description: 'Stores wood, clay and iron. Production stops when it is full.',
    maxLevel: 20, baseCost: res(130, 160, 90, 40), costFactor: 1.28, baseTime: 700, timeFactor: 1.3, pop: 1, requires: [{ building: 'main', level: 1 }],
  }),
  granary: B({
    id: 'granary', name: 'Granary', icon: '🛖', kind: 'town', multiple: true,
    description: 'Stores crop. Keep it large enough or your harvest goes to waste.',
    maxLevel: 20, baseCost: res(80, 100, 70, 20), costFactor: 1.28, baseTime: 640, timeFactor: 1.3, pop: 1, requires: [{ building: 'main', level: 1 }],
  }),
  cranny: B({
    id: 'cranny', name: 'Cranny', icon: '🕳️', kind: 'town', multiple: true,
    description: 'Hides part of your resources so raiders cannot steal them.',
    maxLevel: 10, baseCost: res(40, 50, 30, 10), costFactor: 1.28, baseTime: 300, timeFactor: 1.3, pop: 0, requires: [],
  }),
  barracks: B({
    id: 'barracks', name: 'Barracks', icon: '⚔️', kind: 'town',
    description: 'Trains infantry. Higher levels train faster.',
    maxLevel: 20, baseCost: res(210, 140, 260, 120), costFactor: 1.28, baseTime: 1000, timeFactor: 1.3, pop: 1, culture: 1,
    requires: [{ building: 'main', level: 3 }, { building: 'rally', level: 1 }],
  }),
  stable: B({
    id: 'stable', name: 'Stable', icon: '🐎', kind: 'town',
    description: 'Trains cavalry and scouts. Higher levels train faster.',
    maxLevel: 20, baseCost: res(260, 140, 220, 100), costFactor: 1.28, baseTime: 1300, timeFactor: 1.3, pop: 2, culture: 2,
    requires: [{ building: 'barracks', level: 3 }, { building: 'academy', level: 5 }],
  }),
  workshop: B({
    id: 'workshop', name: 'Workshop', icon: '🛠️', kind: 'town',
    description: 'Builds siege engines: rams for walls and catapults for buildings.',
    maxLevel: 20, baseCost: res(460, 510, 600, 320), costFactor: 1.28, baseTime: 1600, timeFactor: 1.3, pop: 2, culture: 2,
    requires: [{ building: 'main', level: 5 }, { building: 'academy', level: 10 }],
  }),
  academy: B({
    id: 'academy', name: 'Academy', icon: '📜', kind: 'town',
    description: 'Scholars here unlock advanced units.',
    maxLevel: 20, baseCost: res(220, 160, 90, 40), costFactor: 1.28, baseTime: 1100, timeFactor: 1.3, pop: 1, culture: 4,
    requires: [{ building: 'main', level: 3 }, { building: 'barracks', level: 1 }],
  }),
  smithy: B({
    id: 'smithy', name: 'Smithy', icon: '🔨', kind: 'town',
    description: 'Forges better weapons and armour for your troops.',
    maxLevel: 20, baseCost: res(180, 250, 500, 160), costFactor: 1.28, baseTime: 1200, timeFactor: 1.3, pop: 1, culture: 2,
    requires: [{ building: 'main', level: 3 }, { building: 'academy', level: 1 }],
  }),
  market: B({
    id: 'market', name: 'Marketplace', icon: '⚖️', kind: 'town',
    description: 'Merchants carry resources to other villages and trade with other players.',
    maxLevel: 20, baseCost: res(80, 70, 120, 70), costFactor: 1.28, baseTime: 900, timeFactor: 1.3, pop: 1, culture: 3,
    requires: [{ building: 'main', level: 3 }, { building: 'warehouse', level: 1 }, { building: 'granary', level: 1 }],
  }),
  embassy: B({
    id: 'embassy', name: 'Embassy', icon: '🏳️', kind: 'town',
    description: 'Lets you join an alliance. At level 3 you can found your own.',
    maxLevel: 20, baseCost: res(180, 130, 150, 80), costFactor: 1.28, baseTime: 900, timeFactor: 1.3, pop: 1, culture: 4,
    requires: [{ building: 'main', level: 1 }],
  }),
  residence: B({
    id: 'residence', name: 'Residence', icon: '🏠', kind: 'town',
    description: 'Home of your governor. Trains settlers to found new villages.',
    maxLevel: 20, baseCost: res(580, 460, 350, 180), costFactor: 1.28, baseTime: 1500, timeFactor: 1.3, pop: 1, culture: 2,
    requires: [{ building: 'main', level: 5 }], excludes: ['palace'],
  }),
  palace: B({
    id: 'palace', name: 'Palace', icon: '👑', kind: 'town',
    description: 'Seat of your empire. Makes a village your capital.',
    maxLevel: 20, baseCost: res(550, 800, 750, 250), costFactor: 1.28, baseTime: 2200, timeFactor: 1.3, pop: 1, culture: 5,
    requires: [{ building: 'main', level: 5 }, { building: 'embassy', level: 1 }], excludes: ['residence'],
  }),
  rally: B({
    id: 'rally', name: 'Rally Point', icon: '🚩', kind: 'town', fixedSlot: RALLY_SLOT,
    description: 'Your troops gather here. Needed to send attacks, raids and reinforcements.',
    maxLevel: 20, baseCost: res(110, 160, 90, 70), costFactor: 1.28, baseTime: 500, timeFactor: 1.3, pop: 1, requires: [],
  }),
  wall: B({
    id: 'wall', name: 'City Wall', icon: '🏯', kind: 'town', fixedSlot: WALL_SLOT,
    description: 'Every level boosts the defence of all troops inside the village.',
    maxLevel: 20, baseCost: res(70, 90, 170, 70), costFactor: 1.28, baseTime: 800, timeFactor: 1.3, pop: 0, requires: [],
  }),
};

export function buildingDef(id: string): BuildingDef | undefined {
  return (BUILDINGS as Record<string, BuildingDef>)[id];
}

export function isBuildingId(id: string): id is BuildingId {
  return id in BUILDINGS;
}

export function fieldForResource(r: ResourceKey): FieldId {
  return ({ wood: 'woodcutter', clay: 'claypit', iron: 'ironmine', crop: 'cropland' } as const)[r];
}

/** Cost to upgrade *to* `level`. */
export function buildCost(def: BuildingDef, level: number): Resources {
  const k = Math.pow(def.costFactor, Math.max(0, level - 1));
  return res(
    roundTo5(def.baseCost.wood * k),
    roundTo5(def.baseCost.clay * k),
    roundTo5(def.baseCost.iron * k),
    roundTo5(def.baseCost.crop * k),
  );
}

/** Main building speeds up all construction: level 20 builds ~3x faster than level 1. */
export function mainBuildingFactor(mainLevel: number): number {
  return 1.1 / (1 + 0.1 * Math.max(0, mainLevel));
}

/**
 * Build time in milliseconds to upgrade to `level`.
 * `speedMultiplier` combines world speed and perks (>1 = faster).
 */
export function buildTimeMs(def: BuildingDef, level: number, mainLevel: number, speedMultiplier: number): number {
  const base = def.baseTime * Math.pow(def.timeFactor, Math.max(0, level - 1));
  const seconds = (base * mainBuildingFactor(mainLevel)) / speedMultiplier;
  return Math.max(1000, Math.round(seconds) * 1000);
}

/** Total population contributed by a building at a level. */
export function buildingPopulation(def: BuildingDef, level: number): number {
  return def.pop * level;
}

export function buildingCulture(def: BuildingDef, level: number): number {
  return def.culture * level;
}

/** Defence multiplier per wall level, by tribe. */
export function wallBonus(level: number, perLevel: number): number {
  return Math.pow(1 + perLevel, level);
}

/** Training-time factor from barracks/stable/workshop level (level 1 = 1.0, level 20 ~ 0.15). */
export function trainingBuildingFactor(level: number): number {
  return Math.pow(0.9, Math.max(0, level - 1));
}
