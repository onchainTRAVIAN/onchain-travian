import { res, type Resources } from './resources.js';
import type { Requirement } from './buildings.js';

/** Tribes players can choose (classic Travian 3 tribes). */
export const TRIBE_IDS = ['romans', 'teutons', 'gauls'] as const;
export type PlayableTribeId = (typeof TRIBE_IDS)[number];
/** 'nature' = wild animals living in oases. */
export type TribeId = PlayableTribeId | 'nature';

export type UnitType = 'inf' | 'cav' | 'scout' | 'ram' | 'catapult' | 'chief' | 'settler';
export type TrainingBuilding = 'barracks' | 'stable' | 'workshop' | 'residence';

export interface UnitDef {
  id: string;
  name: string;
  /** Emoji fallback; the UI uses /static/img/units/<tribe>-<n>.svg. */
  icon: string;
  description: string;
  type: UnitType;
  attack: number;
  defInf: number;
  defCav: number;
  /** Fields per hour. */
  speed: number;
  carry: number;
  /** Crop eaten per hour. */
  upkeep: number;
  cost: Resources;
  /** Seconds at speed 1 with a level-1 training building. */
  trainTime: number;
  building: TrainingBuilding;
  requires: Requirement[];
}

export interface TribeDef {
  id: TribeId;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  strengths: string[];
  /** Defence bonus per wall level (0.03 = +3%), compounding. */
  wallPerLevel: number;
  wallName: string;
  /** Multiplier applied to this tribe's own cranny. */
  crannyMultiplier: number;
  /** When this tribe raids, the enemy cranny protects only this fraction. */
  enemyCrannyFactor: number;
  /** Romans can build a resource field and a village building at the same time. */
  parallelBuild: boolean;
  /** Ten units, always in the same slot order: 0-5 combat, 6 ram, 7 catapult, 8 chief, 9 settler. */
  units: UnitDef[];
  /** Resources one merchant carries, and merchant speed (fields/hour). */
  merchantCapacity: number;
  merchantSpeed: number;
  /** Loyalty knocked off per surviving chief: [min, max]. */
  chiefPower: [number, number];
}

export const UNIT_SLOTS = 10;
export type UnitCounts = number[];

export function emptyUnits(): UnitCounts {
  return new Array<number>(UNIT_SLOTS).fill(0);
}

type UnitInit = Omit<UnitDef, 'cost' | 'requires'> & { cost: [number, number, number, number]; requires?: [string, number][] };
const U = (u: UnitInit): UnitDef => ({
  ...u,
  cost: res(...u.cost),
  requires: (u.requires ?? []).map(([building, level]) => ({ building, level }) as Requirement),
});

/* Classic T3.6 unit data: attack, defence vs infantry/cavalry, speed, carry, upkeep, cost, training time. */

const romans: TribeDef = {
  id: 'romans',
  name: 'Romans',
  icon: '🦅',
  tagline: 'Disciplined builders of an empire',
  description: 'Strong infantry, the best wall, and they can build a field and a building at the same time. Recommended for new players.',
  strengths: ['Build a resource field and a building at the same time', 'City Wall: +3% defence per level', 'Strong all-round infantry'],
  wallPerLevel: 0.03,
  wallName: 'City Wall',
  crannyMultiplier: 1,
  enemyCrannyFactor: 1,
  parallelBuild: true,
  merchantCapacity: 500,
  merchantSpeed: 16,
  chiefPower: [20, 30],
  units: [
    U({ id: 'legionnaire', name: 'Legionnaire', icon: '🛡️', type: 'inf', description: 'The simple and all-round infantry of the Roman empire.',
      attack: 40, defInf: 35, defCav: 50, speed: 6, carry: 50, upkeep: 1, cost: [120, 100, 150, 30], trainTime: 2000, building: 'barracks' }),
    U({ id: 'praetorian', name: 'Praetorian', icon: '🏰', type: 'inf', description: 'The emperor’s guard; excellent defenders against infantry.',
      attack: 30, defInf: 65, defCav: 35, speed: 5, carry: 20, upkeep: 1, cost: [100, 130, 160, 70], trainTime: 2200, building: 'barracks',
      requires: [['academy', 1], ['armoury', 1]] }),
    U({ id: 'imperian', name: 'Imperian', icon: '🗡️', type: 'inf', description: 'The ultimate attacker of the Roman infantry.',
      attack: 70, defInf: 40, defCav: 25, speed: 7, carry: 50, upkeep: 1, cost: [150, 160, 210, 80], trainTime: 2400, building: 'barracks',
      requires: [['academy', 5], ['blacksmith', 1]] }),
    U({ id: 'equites_legati', name: 'Equites Legati', icon: '🔭', type: 'scout', description: 'Roman reconnaissance riders that spy on enemy villages.',
      attack: 0, defInf: 20, defCav: 10, speed: 16, carry: 0, upkeep: 2, cost: [140, 160, 20, 40], trainTime: 1700, building: 'stable',
      requires: [['academy', 5], ['stable', 1]] }),
    U({ id: 'equites_imperatoris', name: 'Equites Imperatoris', icon: '🐎', type: 'cav', description: 'The standard Roman cavalry: fast and strong in attack.',
      attack: 120, defInf: 65, defCav: 50, speed: 14, carry: 100, upkeep: 3, cost: [550, 440, 320, 100], trainTime: 3300, building: 'stable',
      requires: [['academy', 5], ['stable', 5]] }),
    U({ id: 'equites_caesaris', name: 'Equites Caesaris', icon: '🏇', type: 'cav', description: 'Heavily armoured cavalry, strong in attack and defence.',
      attack: 180, defInf: 80, defCav: 105, speed: 10, carry: 70, upkeep: 4, cost: [550, 640, 800, 180], trainTime: 4400, building: 'stable',
      requires: [['academy', 5], ['stable', 10]] }),
    U({ id: 'battering_ram', name: 'Battering Ram', icon: '🪵', type: 'ram', description: 'Heavy support weapon that breaks down walls.',
      attack: 60, defInf: 30, defCav: 75, speed: 4, carry: 0, upkeep: 3, cost: [900, 360, 500, 70], trainTime: 4600, building: 'workshop',
      requires: [['academy', 10], ['workshop', 1]] }),
    U({ id: 'fire_catapult', name: 'Fire Catapult', icon: '☄️', type: 'catapult', description: 'Long-range weapon that destroys buildings.',
      attack: 75, defInf: 60, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: [950, 1350, 600, 90], trainTime: 9000, building: 'workshop',
      requires: [['academy', 15], ['workshop', 10]] }),
    U({ id: 'senator', name: 'Senator', icon: '🎖️', type: 'chief', description: 'Persuades other villages to join the empire.',
      attack: 50, defInf: 40, defCav: 30, speed: 4, carry: 0, upkeep: 5, cost: [30750, 27200, 45000, 37500], trainTime: 90700, building: 'residence',
      requires: [['academy', 20], ['rally', 10]] }),
    U({ id: 'roman_settler', name: 'Settler', icon: '🧺', type: 'settler', description: 'Brave colonists who found new villages.',
      attack: 0, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: [5800, 5300, 7200, 5500], trainTime: 26900, building: 'residence' }),
  ],
};

const teutons: TribeDef = {
  id: 'teutons',
  name: 'Teutons',
  icon: '🪓',
  tagline: 'Fearless raiders of the north',
  description: 'Cheap, fast-to-train troops that carry lots of loot. Enemy crannies hide less from them. For aggressive players.',
  strengths: ['Cheapest and fastest-trained troops', 'Enemy crannies hide only 80% against them', 'Merchants carry 1000'],
  wallPerLevel: 0.02,
  wallName: 'Earth Wall',
  crannyMultiplier: 1,
  enemyCrannyFactor: 0.8,
  parallelBuild: false,
  merchantCapacity: 1000,
  merchantSpeed: 12,
  chiefPower: [20, 25],
  units: [
    U({ id: 'clubswinger', name: 'Clubswinger', icon: '🏏', type: 'inf', description: 'The cheapest unit in the game; trains very fast.',
      attack: 40, defInf: 20, defCav: 5, speed: 7, carry: 60, upkeep: 1, cost: [95, 75, 40, 40], trainTime: 900, building: 'barracks' }),
    U({ id: 'spearman', name: 'Spearman', icon: '🔱', type: 'inf', description: 'Defensive infantry, excellent against cavalry.',
      attack: 10, defInf: 35, defCav: 60, speed: 7, carry: 40, upkeep: 1, cost: [145, 70, 85, 40], trainTime: 1400, building: 'barracks',
      requires: [['academy', 1], ['barracks', 3]] }),
    U({ id: 'axeman', name: 'Axeman', icon: '🪓', type: 'inf', description: 'The strongest Teutonic infantry.',
      attack: 60, defInf: 30, defCav: 30, speed: 6, carry: 50, upkeep: 1, cost: [130, 120, 170, 70], trainTime: 1500, building: 'barracks',
      requires: [['academy', 3], ['blacksmith', 1]] }),
    U({ id: 'scout', name: 'Scout', icon: '🔭', type: 'scout', description: 'Spies on enemy villages on foot.',
      attack: 0, defInf: 10, defCav: 5, speed: 9, carry: 0, upkeep: 1, cost: [160, 100, 50, 50], trainTime: 1400, building: 'barracks',
      requires: [['academy', 1], ['main', 5]] }),
    U({ id: 'paladin', name: 'Paladin', icon: '🛡️', type: 'cav', description: 'Heavily armoured defensive cavalry.',
      attack: 55, defInf: 100, defCav: 40, speed: 10, carry: 110, upkeep: 2, cost: [370, 270, 290, 75], trainTime: 3000, building: 'stable',
      requires: [['academy', 5], ['stable', 3]] }),
    U({ id: 'teutonic_knight', name: 'Teutonic Knight', icon: '🐻', type: 'cav', description: 'Devastating attacking cavalry.',
      attack: 150, defInf: 50, defCav: 75, speed: 9, carry: 80, upkeep: 3, cost: [450, 515, 480, 80], trainTime: 3700, building: 'stable',
      requires: [['academy', 15], ['stable', 10]] }),
    U({ id: 'ram', name: 'Ram', icon: '🪵', type: 'ram', description: 'Breaks down walls.',
      attack: 65, defInf: 30, defCav: 80, speed: 4, carry: 0, upkeep: 3, cost: [1000, 300, 350, 70], trainTime: 4200, building: 'workshop',
      requires: [['academy', 10], ['workshop', 1]] }),
    U({ id: 'catapult', name: 'Catapult', icon: '☄️', type: 'catapult', description: 'Destroys buildings.',
      attack: 50, defInf: 60, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: [900, 1200, 600, 60], trainTime: 9000, building: 'workshop',
      requires: [['academy', 15], ['workshop', 10]] }),
    U({ id: 'chief', name: 'Chief', icon: '🎖️', type: 'chief', description: 'Convinces villages to join your tribe.',
      attack: 40, defInf: 60, defCav: 40, speed: 4, carry: 0, upkeep: 4, cost: [35500, 26600, 25000, 27200], trainTime: 70500, building: 'residence',
      requires: [['academy', 20], ['rally', 5]] }),
    U({ id: 'teuton_settler', name: 'Settler', icon: '🧺', type: 'settler', description: 'Founds new villages.',
      attack: 10, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: [7200, 5500, 5800, 6500], trainTime: 31000, building: 'residence' }),
  ],
};

const gauls: TribeDef = {
  id: 'gauls',
  name: 'Gauls',
  icon: '🍀',
  tagline: 'Peaceful defenders and swift riders',
  description: 'The best defenders and the fastest cavalry. Their crannies hide twice as much. Good for careful players.',
  strengths: ['Cranny hides twice as much', 'Fastest units and merchants', 'Strong defence; Trapper captures attackers'],
  wallPerLevel: 0.025,
  wallName: 'Palisade',
  crannyMultiplier: 2,
  enemyCrannyFactor: 1,
  parallelBuild: false,
  merchantCapacity: 750,
  merchantSpeed: 24,
  chiefPower: [20, 25],
  units: [
    U({ id: 'phalanx', name: 'Phalanx', icon: '🔱', type: 'inf', description: 'Cheap and strong defensive infantry.',
      attack: 15, defInf: 40, defCav: 50, speed: 7, carry: 35, upkeep: 1, cost: [100, 130, 55, 30], trainTime: 1300, building: 'barracks' }),
    U({ id: 'swordsman', name: 'Swordsman', icon: '⚔️', type: 'inf', description: 'Attacking infantry that can also defend.',
      attack: 65, defInf: 35, defCav: 20, speed: 6, carry: 45, upkeep: 1, cost: [140, 150, 185, 60], trainTime: 1800, building: 'barracks',
      requires: [['academy', 3], ['blacksmith', 1]] }),
    U({ id: 'pathfinder', name: 'Pathfinder', icon: '🔭', type: 'scout', description: 'The fastest scout in the game.',
      attack: 0, defInf: 20, defCav: 10, speed: 17, carry: 0, upkeep: 2, cost: [170, 150, 20, 40], trainTime: 1700, building: 'stable',
      requires: [['academy', 5], ['stable', 1]] }),
    U({ id: 'theutates_thunder', name: 'Theutates Thunder', icon: '⚡', type: 'cav', description: 'Lightning-fast cavalry, perfect for raiding.',
      attack: 90, defInf: 25, defCav: 40, speed: 19, carry: 75, upkeep: 2, cost: [350, 450, 230, 60], trainTime: 3100, building: 'stable',
      requires: [['academy', 5], ['stable', 3]] }),
    U({ id: 'druidrider', name: 'Druidrider', icon: '🌿', type: 'cav', description: 'Defensive cavalry, superb against infantry.',
      attack: 45, defInf: 115, defCav: 55, speed: 16, carry: 35, upkeep: 2, cost: [360, 330, 280, 120], trainTime: 3200, building: 'stable',
      requires: [['academy', 5], ['stable', 5]] }),
    U({ id: 'haeduan', name: 'Haeduan', icon: '🐗', type: 'cav', description: 'Heavy cavalry, strong in attack and against riders.',
      attack: 140, defInf: 50, defCav: 165, speed: 13, carry: 65, upkeep: 3, cost: [500, 620, 675, 170], trainTime: 3900, building: 'stable',
      requires: [['academy', 15], ['stable', 10]] }),
    U({ id: 'gaul_ram', name: 'Ram', icon: '🪵', type: 'ram', description: 'Breaks down walls.',
      attack: 50, defInf: 30, defCav: 105, speed: 4, carry: 0, upkeep: 3, cost: [950, 555, 330, 75], trainTime: 5000, building: 'workshop',
      requires: [['academy', 10], ['workshop', 1]] }),
    U({ id: 'trebuchet', name: 'Trebuchet', icon: '☄️', type: 'catapult', description: 'Destroys buildings.',
      attack: 70, defInf: 45, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: [960, 1450, 630, 90], trainTime: 9000, building: 'workshop',
      requires: [['academy', 15], ['workshop', 10]] }),
    U({ id: 'chieftain', name: 'Chieftain', icon: '🎖️', type: 'chief', description: 'Convinces villages to join your tribe.',
      attack: 40, defInf: 50, defCav: 50, speed: 5, carry: 0, upkeep: 4, cost: [30750, 45400, 31000, 37500], trainTime: 90700, building: 'residence',
      requires: [['academy', 20], ['rally', 10]] }),
    U({ id: 'gaul_settler', name: 'Settler', icon: '🧺', type: 'settler', description: 'Founds new villages.',
      attack: 0, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: [5500, 7000, 5300, 4900], trainTime: 22700, building: 'residence' }),
  ],
};

const A = (id: string, name: string, icon: string, attack: number, defInf: number, defCav: number, upkeep: number): UnitDef =>
  U({ id, name, icon, type: 'inf', description: 'Wild animal guarding an oasis.', attack, defInf, defCav, speed: 20, carry: 0, upkeep, cost: [0, 0, 0, 0], trainTime: 1, building: 'barracks' });

/** Wild animals that guard oases. Not playable. */
const nature: TribeDef = {
  id: 'nature',
  name: 'Nature',
  icon: '🐾',
  tagline: 'Wild animals',
  description: 'Animals defend unoccupied oases.',
  strengths: [],
  wallPerLevel: 0,
  wallName: 'Wall',
  crannyMultiplier: 1,
  enemyCrannyFactor: 1,
  parallelBuild: false,
  merchantCapacity: 0,
  merchantSpeed: 1,
  chiefPower: [0, 0],
  units: [
    A('rat', 'Rat', '🐀', 10, 25, 20, 1),
    A('spider', 'Spider', '🕷️', 20, 35, 40, 1),
    A('snake', 'Snake', '🐍', 60, 40, 60, 1),
    A('bat', 'Bat', '🦇', 80, 66, 50, 1),
    A('boar', 'Wild Boar', '🐗', 50, 70, 33, 2),
    A('wolf', 'Wolf', '🐺', 100, 80, 70, 2),
    A('bear', 'Bear', '🐻', 250, 140, 200, 3),
    A('crocodile', 'Crocodile', '🐊', 450, 380, 240, 3),
    A('tiger', 'Tiger', '🐅', 200, 170, 250, 3),
    A('elephant', 'Elephant', '🐘', 600, 440, 520, 5),
  ],
};

export const TRIBES: Record<TribeId, TribeDef> = { romans, teutons, gauls, nature };

export function isTribeId(id: string): id is PlayableTribeId {
  return (TRIBE_IDS as readonly string[]).includes(id);
}

export function tribe(id: TribeId): TribeDef {
  return TRIBES[id];
}

export function unitDef(tribeId: TribeId, slot: number): UnitDef {
  const u = TRIBES[tribeId].units[slot];
  if (!u) throw new Error(`No unit ${slot} for tribe ${tribeId}`);
  return u;
}

/** Units whose special missions (settle / conquer) arrive in a later update. */
export function isSpecialUnit(u: UnitDef): boolean {
  return u.type === 'chief' || u.type === 'settler';
}

export function totalUnits(c: UnitCounts): number {
  return c.reduce((a, b) => a + b, 0);
}

export function addUnits(a: UnitCounts, b: UnitCounts): UnitCounts {
  return a.map((v, i) => v + (b[i] ?? 0));
}

export function subUnits(a: UnitCounts, b: UnitCounts): UnitCounts {
  return a.map((v, i) => v - (b[i] ?? 0));
}

export function upkeepOf(tribeId: TribeId, c: UnitCounts): number {
  return c.reduce((sum, n, i) => sum + n * unitDef(tribeId, i).upkeep, 0);
}

export function carryOf(tribeId: TribeId, c: UnitCounts, carryMultiplier = 1): number {
  return Math.floor(c.reduce((sum, n, i) => sum + n * unitDef(tribeId, i).carry, 0) * carryMultiplier);
}

/** Slowest unit speed in a group (tiles/hour); 0 if empty. */
export function slowestSpeed(tribeId: TribeId, c: UnitCounts): number {
  let min = Infinity;
  c.forEach((n, i) => {
    if (n > 0) min = Math.min(min, unitDef(tribeId, i).speed);
  });
  return min === Infinity ? 0 : min;
}

/** Train time in ms for one unit. */
export function trainTimeMs(u: UnitDef, buildingLevel: number, speedMultiplier: number): number {
  const factor = Math.pow(0.9, Math.max(0, buildingLevel - 1));
  return Math.max(1000, Math.round((u.trainTime * factor) / speedMultiplier) * 1000);
}

/** Smithy upgrades: +1.5% attack and defence per level, compounding. */
/**
 * A combat stat after Blacksmith/Armoury upgrades (T3.6):
 * stat + (stat + 300·upkeep/7)·(1.007^level − 1), rounded to 4 decimals.
 */
export function upgradedStat(u: UnitDef, stat: number, level: number): number {
  if (level <= 0) return stat;
  return Math.round((stat + (stat + (300 * u.upkeep) / 7) * (Math.pow(1.007, level) - 1)) * 1e4) / 1e4;
}

/** Academy research cost: about 3x the unit cost. */
/** T3 research / upgrade base times in seconds (Kirilloid's T3 model, `rt`). */
const RESEARCH_SECONDS: Record<string, number> = {
  legionnaire: 7800,
  praetorian: 8400,
  imperian: 9000,
  equites_legati: 6900,
  equites_imperatoris: 11700,
  equites_caesaris: 15000,
  battering_ram: 15600,
  fire_catapult: 28800,
  senator: 24475,
  clubswinger: 4500,
  spearman: 6000,
  axeman: 6300,
  scout: 6000,
  paladin: 10800,
  teutonic_knight: 12900,
  ram: 14400,
  catapult: 28800,
  chief: 19425,
  phalanx: 5700,
  swordsman: 7200,
  pathfinder: 6900,
  theutates_thunder: 11100,
  druidrider: 11400,
  haeduan: 13500,
  gaul_ram: 16800,
  trebuchet: 28800,
  chieftain: 24475,
};

const round5 = (n: number) => Math.round(n / 5) * 5;
const RES_BASE = [100, 100, 200, 160];
const costList = (u: UnitDef) => [u.cost.wood, u.cost.clay, u.cost.iron, u.cost.crop];

/** Academy research cost (T3): 6/4/8/6 × unit cost + 100/100/200/160; chiefs 0.5/0.5/0.8/0.6 × cost + 500/200/400/160. */
export function researchCost(u: UnitDef): Resources {
  const chief = u.type === 'chief';
  const k = chief ? [0.5, 0.5, 0.8, 0.6] : [6, 4, 8, 6];
  const b = chief ? [500, 200, 400, 160] : RES_BASE;
  const r = costList(u).map((v, i) => round5((k[i] ?? 0) * v + (b[i] ?? 0)));
  return res(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, r[3] ?? 0);
}

/** Academy research time: the unit's T3 research time, 3.6% faster per Academy level above 1. */
export function researchTimeMs(u: UnitDef, speedMultiplier: number, academyLevel = 1): number {
  const base = RESEARCH_SECONDS[u.id] ?? u.trainTime * 4;
  return Math.max(1000, Math.round((base * Math.pow(0.964, Math.max(1, academyLevel) - 1)) / speedMultiplier) * 1000);
}

/** Blacksmith/Armoury upgrade cost to reach `level` (T3): round5(level^0.8 × (7 × cost + base) / upkeep). */
export function smithyCost(u: UnitDef, level: number): Resources {
  const k = Math.pow(level, 0.8);
  const up = Math.max(1, u.upkeep);
  const r = costList(u).map((v, i) => round5((k * (v * 7 + (RES_BASE[i] ?? 0))) / up));
  return res(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, r[3] ?? 0);
}

/** Upgrade time to reach `level`: research time × level^0.8, 3.6% faster per smithy level above 1. */
export function smithyTimeMs(u: UnitDef, level: number, speedMultiplier: number, smithyLevel = 1): number {
  const base = RESEARCH_SECONDS[u.id] ?? u.trainTime * 2;
  return Math.max(1000, Math.round((base * Math.pow(level, 0.8) * Math.pow(0.964, Math.max(1, smithyLevel) - 1)) / speedMultiplier) * 1000);
}

export const SMITHY_MAX = 20;
