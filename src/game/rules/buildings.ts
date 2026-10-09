import { res, type ResourceKey, type Resources } from './resources.js';
import type { PlayableTribeId } from './units.js';

/*
 * Classic Travian 3.6 buildings. Costs, build times, population and culture points follow the
 * original formulas:
 *   cost(l)  = round5(base · k^(l-1))
 *   time(l)  = round10(a · K^(l-1) − b)      (seconds at speed 1, before the Main Building bonus)
 *   pop(l)   = l = 1 ? pop : round((5·pop + l − 1) / 10)   (added per level)
 *   cp(l)    = round(cp · 1.2^l)              (culture points per day at that level)
 */

export const FIELD_IDS = ['woodcutter', 'claypit', 'ironmine', 'cropland'] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export const TOWN_BUILDING_IDS = [
  'main',
  'rally',
  'warehouse',
  'granary',
  'cranny',
  'embassy',
  'market',
  'barracks',
  'stable',
  'workshop',
  'academy',
  'blacksmith',
  'armoury',
  'townhall',
  'residence',
  'palace',
  'treasury',
  'tradeoffice',
  'greatbarracks',
  'greatstable',
  'heromansion',
  'tournament',
  'stonemason',
  'sawmill',
  'brickyard',
  'ironfoundry',
  'grainmill',
  'bakery',
  'brewery',
  'trapper',
  'horsetrough',
  'greatwarehouse',
  'greatgranary',
  'wonder',
  'citywall',
  'earthwall',
  'palisade',
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
  /** Emoji fallback; the UI uses /static/img/buildings/<id>.svg. */
  icon: string;
  description: string;
  kind: 'field' | 'town';
  maxLevel: number;
  baseCost: Resources;
  costFactor: number;
  /** Build time formula parameters (see header). */
  time: { a: number; k: number; b: number };
  /** Exact per-level build times (seconds), used instead of the formula when present. */
  timeTable?: readonly number[];
  /** Population of level 1 (later levels follow the formula). */
  pop: number;
  /** Culture point base (see header). */
  cp: number;
  requires: Requirement[];
  /** Can more than one exist (only once the existing one is fully upgraded)? */
  multiple: boolean;
  fixedSlot?: number;
  excludes?: BuildingId[];
  produces?: ResourceKey;
  /**
   * Endgame buildings: Great Warehouse/Granary need a storage plan artifact (or a World Wonder
   * village); the World Wonder only stands in Natar World Wonder villages.
   */
  special?: 'greatStorage' | 'wonder';
  /** Only this tribe may build it. */
  tribe?: PlayableTribeId;
  capitalOnly?: boolean;
  nonCapital?: boolean;
  /** Only one in the whole account (Palace). */
  onePerAccount?: boolean;
}

export const FIELD_MAX_NON_CAPITAL = 10;

/** Slots 1-18: resource fields. 19-38: village building plots (26 = Main Building). 39: Rally Point. 40: wall. */
export const FIELD_SLOTS = 18;
export const TOWN_SLOT_FIRST = 19;
export const TOWN_SLOT_LAST = 38;
export const MAIN_SLOT = 26;
export const RALLY_SLOT = 39;
export const WALL_SLOT = 40;
/** World Wonder villages keep their Wonder on this plot. */
export const WONDER_SLOT = 25;
export const WONDER_MAX_LEVEL = 100;

type Init = Omit<BuildingDef, 'multiple' | 'baseCost' | 'requires' | 'time' | 'kind'> & {
  kind?: BuildingDef['kind'];
  cost: [number, number, number, number];
  /** Level-1 build time in seconds; ignored if `time` is given. */
  t1?: number;
  time?: BuildingDef['time'];
  requires?: [BuildingId, number][];
  multiple?: boolean;
};

const STD = 1875; // the standard time offset of the T3 formula
const B = (d: Init): BuildingDef => ({
  kind: 'town',
  multiple: false,
  ...d,
  baseCost: res(...d.cost),
  requires: (d.requires ?? []).map(([building, level]) => ({ building, level })),
  time: d.time ?? { a: (d.t1 ?? 2000) + STD, k: 1.16, b: STD },
});

const field = (id: FieldId, name: string, icon: string, produces: ResourceKey, cost: Init['cost'], a: number, pop: number, description: string) =>
  B({ id, name, icon, kind: 'field', produces, cost, costFactor: 1.67, maxLevel: 20, time: { a, k: 1.6, b: 1000 / 3 }, pop, cp: 1, description, multiple: true });

const bonus = (id: BuildingId, name: string, icon: string, cost: Init['cost'], t1: number, pop: number, requires: Init['requires'], description: string) =>
  B({ id, name, icon, cost, costFactor: 1.8, maxLevel: 5, time: { a: t1 + 2400, k: 1.5, b: 2400 }, pop, cp: 0.9, requires, description });

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  woodcutter: field('woodcutter', 'Woodcutter', '🪵', 'wood', [40, 100, 50, 60], 1780 / 3, 2,
    'The woodcutter cuts down trees in order to produce lumber. The further you extend the woodcutter the more lumber is produced.'),
  claypit: field('claypit', 'Clay Pit', '🧱', 'clay', [80, 40, 80, 50], 1660 / 3, 2,
    'Clay is produced here. By increasing its level you increase its clay production.'),
  ironmine: field('ironmine', 'Iron Mine', '⛓️', 'iron', [100, 80, 30, 60], 2350 / 3, 3,
    'Here miners produce the precious resource iron. By increasing the mine’s level you increase its iron production.'),
  cropland: field('cropland', 'Cropland', '🌾', 'crop', [70, 90, 70, 20], 1450 / 3, 0,
    'Your population’s food is produced here. By increasing the farm’s level you increase its crop production.'),

  main: B({ id: 'main', name: 'Main Building', icon: '🏛️', cost: [70, 40, 60, 20], costFactor: 1.28, maxLevel: 20,
    time: { a: 5100, k: 1.113, b: 2434 }, pop: 2, cp: 2, fixedSlot: MAIN_SLOT,
    timeTable: [2620, 3220, 3880, 4610, 5410, 6300, 7280, 8380, 9590, 10940, 12440, 14120, 15980, 18050, 20370, 22950, 25830, 29040, 32630, 36640],
    description: 'The village’s master builders live here. The higher its level, the faster your master builders complete the construction of new buildings.' }),
  rally: B({ id: 'rally', name: 'Rally Point', icon: '🚩', cost: [110, 160, 90, 70], costFactor: 1.28, maxLevel: 20,
    t1: 2000, pop: 1, cp: 1, fixedSlot: RALLY_SLOT,
    description: 'Your village’s troops meet here. From here you can send them out to conquer, raid or reinforce other villages.' }),
  warehouse: B({ id: 'warehouse', name: 'Warehouse', icon: '🏚️', cost: [130, 160, 90, 40], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 1, cp: 1,
    requires: [['main', 1]], multiple: true,
    description: 'The resources wood, clay and iron are stored in your warehouse. By increasing its level you increase its capacity.' }),
  granary: B({ id: 'granary', name: 'Granary', icon: '🛖', cost: [80, 100, 70, 20], costFactor: 1.28, maxLevel: 20, t1: 1600, pop: 1, cp: 1,
    requires: [['main', 1]], multiple: true,
    description: 'Crop produced by your farms is stored in the granary. By increasing its level you increase the granary’s capacity.' }),
  cranny: B({ id: 'cranny', name: 'Cranny', icon: '🕳️', cost: [40, 50, 30, 10], costFactor: 1.28, maxLevel: 10, t1: 750, pop: 0, cp: 1,
    description: 'Hides part of your resources from raiders: 3.5% of your storage per level (35% at level 10; Gauls twice as much, up to 35%). One per village.' }),
  embassy: B({ id: 'embassy', name: 'Embassy', icon: '🏳️', cost: [180, 130, 150, 80], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 3, cp: 4,
    requires: [['main', 1]],
    description: 'The embassy is a place for diplomats. With level 1 you can join an alliance; with level 3 you can found one.' }),
  market: B({ id: 'market', name: 'Marketplace', icon: '⚖️', cost: [80, 70, 120, 70], costFactor: 1.28, maxLevel: 20, t1: 1800, pop: 4, cp: 3,
    requires: [['main', 3], ['warehouse', 1], ['granary', 1]],
    description: 'At the marketplace you can trade resources with other players. The higher its level, the more merchants are available.' }),
  barracks: B({ id: 'barracks', name: 'Barracks', icon: '⚔️', cost: [210, 140, 260, 120], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 4, cp: 1,
    requires: [['main', 3], ['rally', 1]],
    description: 'All foot soldiers are trained in the barracks. The higher its level, the faster the troops are trained.' }),
  stable: B({ id: 'stable', name: 'Stable', icon: '🐎', cost: [260, 140, 220, 100], costFactor: 1.28, maxLevel: 20, t1: 2200, pop: 5, cp: 2,
    requires: [['blacksmith', 3], ['academy', 5]],
    description: 'Cavalry is trained in the stable. The higher its level, the faster the troops are trained.' }),
  workshop: B({ id: 'workshop', name: 'Workshop', icon: '🛠️', cost: [460, 510, 600, 320], costFactor: 1.28, maxLevel: 20, t1: 3000, pop: 3, cp: 3,
    requires: [['main', 5], ['academy', 10]],
    description: 'Siege engines like catapults and rams are built in the workshop.' }),
  academy: B({ id: 'academy', name: 'Academy', icon: '📜', cost: [220, 160, 90, 40], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 4, cp: 4,
    requires: [['main', 3], ['barracks', 3]],
    description: 'New unit types are researched in the academy. By increasing its level you can research better units.' }),
  blacksmith: B({ id: 'blacksmith', name: 'Blacksmith', icon: '🔨', cost: [170, 200, 380, 130], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 4, cp: 2,
    requires: [['main', 3], ['academy', 3]],
    description: 'Weapons are improved in the blacksmith’s melting furnaces. Upgrades increase the attack value of your troops.' }),
  armoury: B({ id: 'armoury', name: 'Armoury', icon: '🛡️', cost: [130, 210, 410, 130], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 4, cp: 2,
    requires: [['main', 3], ['academy', 1]],
    description: 'Armour is improved in the armoury’s furnaces. Upgrades increase the defence value of your troops.' }),
  townhall: B({ id: 'townhall', name: 'Town Hall', icon: '🏟️', cost: [1250, 1110, 1260, 600], costFactor: 1.28, maxLevel: 20, t1: 12500, pop: 4, cp: 5,
    requires: [['main', 10], ['academy', 10]],
    description: 'You can hold celebrations here. Celebrations increase your culture points.' }),
  residence: B({ id: 'residence', name: 'Residence', icon: '🏠', cost: [580, 460, 350, 180], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 1, cp: 2,
    requires: [['main', 5]], excludes: ['palace'],
    description: 'The residence protects the village against enemies trying to conquer it. Settlers and chiefs are trained here (from level 10).' }),
  palace: B({ id: 'palace', name: 'Palace', icon: '👑', cost: [550, 800, 750, 250], costFactor: 1.28, maxLevel: 20, t1: 5000, pop: 1, cp: 5,
    requires: [['main', 5], ['embassy', 1]], excludes: ['residence'], onePerAccount: true,
    description: 'The king or queen of the empire lives in the palace. You can have only one; the village where it stands becomes your capital.' }),
  treasury: B({ id: 'treasury', name: 'Treasury', icon: '💰', cost: [2880, 2740, 2580, 990], costFactor: 1.26, maxLevel: 20, t1: 8000, pop: 4, cp: 6,
    requires: [['main', 10]],
    description: 'Holds artifacts. Destroy the Treasury of a Natar stronghold, then attack with your hero to capture its artifact; a level 10 Treasury holds a small artifact, level 20 a large or unique one.' }),
  tradeoffice: B({ id: 'tradeoffice', name: 'Trade Office', icon: '🐫', cost: [1400, 1330, 1200, 400], costFactor: 1.28, maxLevel: 20, t1: 3000, pop: 3, cp: 3,
    requires: [['market', 20], ['stable', 10]],
    description: 'Better carts and horses: each level increases your merchants’ capacity by 10%.' }),
  greatbarracks: B({ id: 'greatbarracks', name: 'Great Barracks', icon: '⚔️', cost: [630, 420, 780, 360], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 4, cp: 1,
    requires: [['barracks', 20]], nonCapital: true,
    description: 'Trains foot soldiers in addition to the barracks, at three times the cost.' }),
  greatstable: B({ id: 'greatstable', name: 'Great Stable', icon: '🐎', cost: [780, 420, 660, 300], costFactor: 1.28, maxLevel: 20, t1: 2200, pop: 5, cp: 2,
    requires: [['stable', 20]], nonCapital: true,
    description: 'Trains cavalry in addition to the stable, at three times the cost.' }),
  heromansion: B({ id: 'heromansion', name: 'Hero’s Mansion', icon: '🦸', cost: [700, 670, 700, 240], costFactor: 1.33, maxLevel: 20,
    time: { a: 2300, k: 1.16, b: 0 }, pop: 2, cp: 1, requires: [['main', 3], ['rally', 1]],
    description: 'The home of your hero. At levels 10, 15 and 20 your hero can annex one more oasis.' }),
  tournament: B({ id: 'tournament', name: 'Tournament Square', icon: '🏇', cost: [1750, 2250, 1530, 240], costFactor: 1.28, maxLevel: 20, t1: 3500, pop: 1, cp: 1,
    requires: [['rally', 15]],
    description: 'Your troops train their stamina here: each level makes them 10% faster beyond 30 fields.' }),
  stonemason: B({ id: 'stonemason', name: 'Stonemason’s Lodge', icon: '🗿', cost: [155, 130, 125, 70], costFactor: 1.28, maxLevel: 20,
    time: { a: 2200 + 3750, k: 1.16, b: 3750 }, pop: 2, cp: 1, requires: [['main', 5], ['palace', 3]], capitalOnly: true,
    description: 'Expert stonemasons make your capital’s buildings 10% sturdier per level against catapults.' }),
  sawmill: bonus('sawmill', 'Sawmill', '🪚', [520, 380, 290, 90], 3000, 4, [['woodcutter', 10], ['main', 5]],
    'Wood from your woodcutters is processed here: +5% wood production per level.'),
  brickyard: bonus('brickyard', 'Brickyard', '🧱', [440, 480, 320, 50], 2240, 3, [['claypit', 10], ['main', 5]],
    'Clay is turned into bricks here: +5% clay production per level.'),
  ironfoundry: bonus('ironfoundry', 'Iron Foundry', '🔥', [200, 450, 510, 120], 4080, 6, [['ironmine', 10], ['main', 5]],
    'Iron is smelted here: +5% iron production per level.'),
  grainmill: bonus('grainmill', 'Grain Mill', '🌬️', [500, 440, 380, 1240], 1840, 3, [['cropland', 5]],
    'Grain is ground into flour here: +5% crop production per level.'),
  bakery: bonus('bakery', 'Bakery', '🥖', [1200, 1480, 870, 1600], 3680, 4, [['cropland', 10], ['grainmill', 5], ['main', 5]],
    'Bread is baked here from the mill’s flour: another +5% crop production per level.'),
  brewery: B({ id: 'brewery', name: 'Brewery', icon: '🍺', cost: [1460, 930, 1250, 1740], costFactor: 1.4, maxLevel: 10,
    time: { a: 8000 + 3750, k: 1.16, b: 3750 }, pop: 6, cp: 4, requires: [['granary', 20], ['rally', 10]], tribe: 'teutons', capitalOnly: true,
    description: 'Tasty mead makes Teuton soldiers braver: +1% attack per level for all your troops - but drunk catapults aim at random and chiefs persuade only half as well.' }),
  trapper: B({ id: 'trapper', name: 'Trapper', icon: '🪤', cost: [100, 100, 100, 100], costFactor: 1.28, maxLevel: 20,
    time: { a: 2000, k: 1.16, b: 0 }, pop: 4, cp: 1, requires: [['rally', 1]], tribe: 'gauls', multiple: true,
    description: 'The Gauls dig well-hidden traps that capture attacking soldiers.' }),
  horsetrough: B({ id: 'horsetrough', name: 'Horse Drinking Trough', icon: '🐴', cost: [780, 420, 660, 540], costFactor: 1.28, maxLevel: 20,
    time: { a: 2200 + 3750, k: 1.16, b: 3750 }, pop: 5, cp: 3, requires: [['rally', 10], ['stable', 20]], tribe: 'romans',
    description: 'Roman horses drink here: cavalry trains 1% faster per level, and from level 10/15/20 Equites Legati/Imperatoris/Caesaris eat 1 crop less.' }),
  greatwarehouse: B({ id: 'greatwarehouse', name: 'Great Warehouse', icon: '🏚️', cost: [650, 800, 450, 200], costFactor: 1.28, maxLevel: 20, t1: 9000, pop: 1, cp: 1,
    requires: [['main', 10]], multiple: true, special: 'greatStorage',
    description: 'Stores three times as much wood, clay and iron as a warehouse. Can only be built with a storage plan artifact or in a World Wonder village.' }),
  greatgranary: B({ id: 'greatgranary', name: 'Great Granary', icon: '🛖', cost: [400, 500, 350, 100], costFactor: 1.28, maxLevel: 20, t1: 7000, pop: 1, cp: 1,
    requires: [['main', 10]], multiple: true, special: 'greatStorage',
    description: 'Stores three times as much crop as a granary. Can only be built with a storage plan artifact or in a World Wonder village.' }),
  wonder: B({ id: 'wonder', name: 'World Wonder', icon: '🏛️', cost: [66700, 69050, 72200, 13200], costFactor: 1.0275, maxLevel: WONDER_MAX_LEVEL,
    time: { a: 60857, k: 1.014, b: 42857 }, pop: 1, cp: 0, fixedSlot: WONDER_SLOT, special: 'wonder',
    description: 'The alliance that first completes a World Wonder to level 100 wins the world. Needs a construction plan held in your alliance (two from level 50).' }),
  citywall: B({ id: 'citywall', name: 'City Wall', icon: '🏯', cost: [70, 90, 170, 70], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 0, cp: 1,
    fixedSlot: WALL_SLOT, tribe: 'romans',
    description: 'The city wall protects your village: +3% defence per level for all troops inside.' }),
  earthwall: B({ id: 'earthwall', name: 'Earth Wall', icon: '⛰️', cost: [120, 200, 0, 80], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 0, cp: 1,
    fixedSlot: WALL_SLOT, tribe: 'teutons',
    description: 'The earth wall protects your village: +2% defence per level. It is very hard to destroy.' }),
  palisade: B({ id: 'palisade', name: 'Palisade', icon: '🪵', cost: [160, 100, 80, 60], costFactor: 1.28, maxLevel: 20, t1: 2000, pop: 0, cp: 1,
    fixedSlot: WALL_SLOT, tribe: 'gauls',
    description: 'The palisade protects your village: +2.5% defence per level for all troops inside.' }),
};

export const WALL_FOR: Record<PlayableTribeId, BuildingId> = { romans: 'citywall', teutons: 'earthwall', gauls: 'palisade' };
export const WALL_IDS: BuildingId[] = ['citywall', 'earthwall', 'palisade'];

export function buildingDef(id: string): BuildingDef | undefined {
  return (BUILDINGS as Record<string, BuildingDef>)[id];
}

export function isBuildingId(id: string): id is BuildingId {
  return id in BUILDINGS;
}

export function fieldForResource(r: ResourceKey): FieldId {
  return ({ wood: 'woodcutter', clay: 'claypit', iron: 'ironmine', crop: 'cropland' } as const)[r];
}

function round5(n: number): number {
  return Math.floor(n / 5 + 0.5) * 5;
}

/** Cost to upgrade *to* `level`. */
export function buildCost(def: BuildingDef, level: number): Resources {
  // World Wonder (T3): each resource is capped at 1,000,000; the last level has its own price.
  if (def.id === 'wonder' && level >= WONDER_MAX_LEVEL) return res(1e6, 1e6, 1e6, 193_630);
  const cap = def.id === 'wonder' ? 1e6 : Infinity;
  const k = Math.pow(def.costFactor, Math.max(0, level - 1));
  const c = (n: number) => Math.min(cap, round5(n * k));
  return res(c(def.baseCost.wood), c(def.baseCost.clay), c(def.baseCost.iron), c(def.baseCost.crop));
}

/** Seconds to build `level` at speed 1 with a level-1 Main Building. */
export function baseBuildSeconds(def: BuildingDef, level: number): number {
  const exact = def.timeTable?.[level - 1];
  if (exact !== undefined) return exact;
  const { a, k, b } = def.time;
  return Math.max(1, Math.floor((a * Math.pow(k, Math.max(0, level - 1)) - b) / 10 + 0.5) * 10);
}

/** Main Building: each level makes construction 3.6% faster (level 20 ≈ 50%). */
export function mainBuildingFactor(mainLevel: number): number {
  return Math.pow(0.964, Math.max(1, mainLevel) - 1);
}

/** Build time in ms; `speedMultiplier` combines world speed and perks (>1 = faster). */
export function buildTimeMs(def: BuildingDef, level: number, mainLevel: number, speedMultiplier: number): number {
  const seconds = (baseBuildSeconds(def, level) * mainBuildingFactor(mainLevel)) / speedMultiplier;
  return Math.max(1000, Math.round(seconds) * 1000);
}

/** Population added by level `level` alone. */
export function popAtLevel(def: BuildingDef, level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return def.pop;
  return Math.floor((5 * def.pop + level - 1) / 10 + 0.5);
}

/** Total population of a building at a level. */
export function buildingPopulation(def: BuildingDef, level: number): number {
  let total = 0;
  for (let l = 1; l <= level; l++) total += popAtLevel(def, l);
  return total;
}

/** Culture points per day produced by a building at a level. */
export function buildingCulture(def: BuildingDef, level: number): number {
  if (level <= 0) return 0;
  return Math.floor(def.cp * Math.pow(1.2, level) + 0.5);
}

export function wallBonus(level: number, perLevel: number): number {
  return Math.pow(1 + perLevel, level);
}

/** Barracks/Stable/Workshop/Residence: each level trains 10% faster (compounding). */
export function trainingBuildingFactor(level: number): number {
  return Math.pow(0.9, Math.max(0, level - 1));
}

/** Production bonus of Sawmill/Brickyard/Iron Foundry/Grain Mill/Bakery: +5% per level. */
export function bonusBuildingPct(level: number): number {
  return 0.05 * Math.max(0, Math.min(5, level));
}
