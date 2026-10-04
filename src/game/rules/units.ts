import { res, type Resources } from './resources.js';
import type { Requirement } from './buildings.js';

/** Tribes players can choose. */
export const TRIBE_IDS = ['legion', 'clans', 'horde'] as const;
export type PlayableTribeId = (typeof TRIBE_IDS)[number];
/** 'nature' = wild animals living in oases. */
export type TribeId = PlayableTribeId | 'nature';

export type UnitType = 'inf' | 'cav' | 'scout' | 'ram' | 'catapult' | 'chief' | 'settler';
export type TrainingBuilding = 'barracks' | 'stable' | 'workshop' | 'residence';

export interface UnitDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: UnitType;
  attack: number;
  defInf: number;
  defCav: number;
  /** Tiles per hour. */
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
  /** Defence bonus per wall level (0.03 = +3%). */
  wallPerLevel: number;
  /** Multiplier applied to this tribe's own cranny. */
  crannyMultiplier: number;
  /** When this tribe raids, the enemy cranny protects only this fraction. */
  enemyCrannyFactor: number;
  /** Ten units, always in the same slot order: 0-5 combat, 6 ram, 7 catapult, 8 chief, 9 settler. */
  units: UnitDef[];
  /** Resources one merchant carries, and merchant speed (tiles/hour). */
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

const U = (u: UnitDef): UnitDef => u;

const legion: TribeDef = {
  id: 'legion',
  name: 'Legion',
  icon: '🦅',
  tagline: 'Disciplined builders of an empire',
  description: 'Strong, well-rounded infantry and the best walls in the land. A good choice for new players.',
  strengths: ['Strongest city wall (+3% per level)', 'Versatile infantry', 'Balanced attack and defence'],
  wallPerLevel: 0.03,
  crannyMultiplier: 1,
  enemyCrannyFactor: 1,
  merchantCapacity: 500,
  merchantSpeed: 16,
  chiefPower: [20, 30],
  units: [
    U({ id: 'legionary', name: 'Legionary', icon: '🛡️', type: 'inf', description: 'Reliable all-round foot soldier.',
      attack: 40, defInf: 35, defCav: 45, speed: 6, carry: 50, upkeep: 1, cost: res(120, 100, 150, 30), trainTime: 1600, building: 'barracks', requires: [] }),
    U({ id: 'sentinel', name: 'Sentinel', icon: '🏰', type: 'inf', description: 'Heavily armoured defender.',
      attack: 30, defInf: 65, defCav: 35, speed: 5, carry: 20, upkeep: 1, cost: res(100, 130, 160, 70), trainTime: 1760, building: 'barracks', requires: [{ building: 'academy', level: 1 }, { building: 'smithy', level: 1 }] }),
    U({ id: 'gladiator', name: 'Gladiator', icon: '🗡️', type: 'inf', description: 'Elite attacking infantry.',
      attack: 70, defInf: 40, defCav: 25, speed: 7, carry: 50, upkeep: 1, cost: res(150, 160, 210, 80), trainTime: 1920, building: 'barracks', requires: [{ building: 'academy', level: 5 }, { building: 'smithy', level: 1 }] }),
    U({ id: 'outrider', name: 'Outrider', icon: '🔭', type: 'scout', description: 'Fast scout that spies on enemy villages.',
      attack: 0, defInf: 20, defCav: 10, speed: 16, carry: 0, upkeep: 2, cost: res(140, 160, 20, 40), trainTime: 1360, building: 'stable', requires: [{ building: 'stable', level: 1 }] }),
    U({ id: 'imperial_rider', name: 'Imperial Rider', icon: '🐎', type: 'cav', description: 'Swift attacking cavalry.',
      attack: 120, defInf: 65, defCav: 50, speed: 14, carry: 100, upkeep: 3, cost: res(550, 440, 320, 100), trainTime: 2640, building: 'stable', requires: [{ building: 'stable', level: 5 }] }),
    U({ id: 'praetor', name: 'Praetor', icon: '🏇', type: 'cav', description: 'Heavy cavalry, strong in attack and defence.',
      attack: 180, defInf: 80, defCav: 105, speed: 10, carry: 70, upkeep: 4, cost: res(550, 640, 800, 180), trainTime: 3520, building: 'stable', requires: [{ building: 'stable', level: 10 }, { building: 'smithy', level: 5 }] }),
    U({ id: 'legion_ram', name: 'Battering Ram', icon: '🪵', type: 'ram', description: 'Smashes enemy walls.',
      attack: 60, defInf: 30, defCav: 75, speed: 4, carry: 0, upkeep: 3, cost: res(900, 360, 500, 70), trainTime: 4600, building: 'workshop', requires: [{ building: 'workshop', level: 1 }] }),
    U({ id: 'fire_catapult', name: 'Fire Catapult', icon: '☄️', type: 'catapult', description: 'Destroys buildings.',
      attack: 75, defInf: 60, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: res(950, 1350, 600, 90), trainTime: 9000, building: 'workshop', requires: [{ building: 'workshop', level: 10 }] }),
    U({ id: 'consul', name: 'Consul', icon: '🎖️', type: 'chief', description: 'Persuades enemy villages to join you.',
      attack: 50, defInf: 40, defCav: 30, speed: 4, carry: 0, upkeep: 5, cost: res(30750, 27200, 45000, 37500), trainTime: 90700, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
    U({ id: 'legion_colonist', name: 'Colonist', icon: '🧺', type: 'settler', description: 'Founds new villages.',
      attack: 0, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: res(5800, 5300, 7200, 5500), trainTime: 26900, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
  ],
};

const clans: TribeDef = {
  id: 'clans',
  name: 'Clans',
  icon: '🐺',
  tagline: 'Fast riders of the forests',
  description: 'The best defenders and the fastest cavalry. Their crannies hide far more resources.',
  strengths: ['Cranny holds 1.5x more', 'Fastest cavalry for raiding', 'Excellent defence'],
  wallPerLevel: 0.025,
  crannyMultiplier: 1.5,
  enemyCrannyFactor: 1,
  merchantCapacity: 750,
  merchantSpeed: 24,
  chiefPower: [20, 25],
  units: [
    U({ id: 'spearguard', name: 'Spearguard', icon: '🔱', type: 'inf', description: 'Cheap, sturdy defensive infantry.',
      attack: 15, defInf: 40, defCav: 50, speed: 7, carry: 35, upkeep: 1, cost: res(100, 130, 55, 30), trainTime: 1300, building: 'barracks', requires: [] }),
    U({ id: 'swordsman', name: 'Swordsman', icon: '⚔️', type: 'inf', description: 'Attacking infantry with good defence.',
      attack: 65, defInf: 35, defCav: 20, speed: 6, carry: 45, upkeep: 1, cost: res(140, 150, 185, 60), trainTime: 1800, building: 'barracks', requires: [{ building: 'academy', level: 3 }, { building: 'smithy', level: 1 }] }),
    U({ id: 'pathfinder', name: 'Pathfinder', icon: '🔭', type: 'scout', description: 'Very fast scout.',
      attack: 0, defInf: 20, defCav: 10, speed: 17, carry: 0, upkeep: 2, cost: res(170, 150, 20, 40), trainTime: 1700, building: 'stable', requires: [{ building: 'stable', level: 1 }] }),
    U({ id: 'storm_rider', name: 'Storm Rider', icon: '⚡', type: 'cav', description: 'Lightning-fast raider.',
      attack: 90, defInf: 25, defCav: 40, speed: 19, carry: 75, upkeep: 2, cost: res(350, 450, 230, 60), trainTime: 3100, building: 'stable', requires: [{ building: 'stable', level: 3 }] }),
    U({ id: 'druid_knight', name: 'Druid Knight', icon: '🌿', type: 'cav', description: 'Defensive cavalry, superb against infantry.',
      attack: 45, defInf: 115, defCav: 55, speed: 16, carry: 35, upkeep: 2, cost: res(360, 330, 280, 120), trainTime: 3200, building: 'stable', requires: [{ building: 'stable', level: 5 }] }),
    U({ id: 'warlord', name: 'Warlord', icon: '🐗', type: 'cav', description: 'Heavy cavalry, unbreakable against riders.',
      attack: 140, defInf: 60, defCav: 165, speed: 13, carry: 65, upkeep: 3, cost: res(500, 620, 675, 170), trainTime: 3900, building: 'stable', requires: [{ building: 'stable', level: 10 }, { building: 'smithy', level: 5 }] }),
    U({ id: 'clans_ram', name: 'Ram', icon: '🪵', type: 'ram', description: 'Smashes enemy walls.',
      attack: 50, defInf: 30, defCav: 105, speed: 4, carry: 0, upkeep: 3, cost: res(950, 555, 330, 75), trainTime: 5000, building: 'workshop', requires: [{ building: 'workshop', level: 1 }] }),
    U({ id: 'trebuchet', name: 'Trebuchet', icon: '☄️', type: 'catapult', description: 'Destroys buildings.',
      attack: 70, defInf: 45, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: res(960, 1450, 630, 90), trainTime: 9000, building: 'workshop', requires: [{ building: 'workshop', level: 10 }] }),
    U({ id: 'chieftain', name: 'Chieftain', icon: '🎖️', type: 'chief', description: 'Persuades enemy villages to join you.',
      attack: 40, defInf: 50, defCav: 50, speed: 5, carry: 0, upkeep: 4, cost: res(30750, 45400, 31000, 37500), trainTime: 90700, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
    U({ id: 'clans_settler', name: 'Settler', icon: '🧺', type: 'settler', description: 'Founds new villages.',
      attack: 0, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: res(4400, 5600, 4200, 3900), trainTime: 22700, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
  ],
};

const horde: TribeDef = {
  id: 'horde',
  name: 'Horde',
  icon: '🐻',
  tagline: 'Fearless raiders of the north',
  description: 'Cheap, fast-to-train troops that carry lots of loot. Enemy crannies hide less from them. Best for aggressive players.',
  strengths: ['Cheapest and fastest-trained troops', 'Enemy cranny hides only 80%', 'Big loot capacity'],
  wallPerLevel: 0.02,
  crannyMultiplier: 1,
  enemyCrannyFactor: 0.8,
  merchantCapacity: 1000,
  merchantSpeed: 12,
  chiefPower: [20, 25],
  units: [
    U({ id: 'clubber', name: 'Clubber', icon: '🏏', type: 'inf', description: 'Cheap raider, trains very fast.',
      attack: 40, defInf: 20, defCav: 5, speed: 7, carry: 60, upkeep: 1, cost: res(95, 75, 40, 40), trainTime: 720, building: 'barracks', requires: [] }),
    U({ id: 'pikeman', name: 'Pikeman', icon: '🔱', type: 'inf', description: 'Defensive infantry, great against cavalry.',
      attack: 10, defInf: 35, defCav: 60, speed: 7, carry: 40, upkeep: 1, cost: res(145, 70, 85, 40), trainTime: 1120, building: 'barracks', requires: [{ building: 'academy', level: 1 }] }),
    U({ id: 'axeman', name: 'Axeman', icon: '🪓', type: 'inf', description: 'Strong attacking infantry.',
      attack: 60, defInf: 30, defCav: 30, speed: 6, carry: 50, upkeep: 1, cost: res(130, 120, 170, 70), trainTime: 1200, building: 'barracks', requires: [{ building: 'academy', level: 3 }, { building: 'smithy', level: 1 }] }),
    U({ id: 'lookout', name: 'Lookout', icon: '🔭', type: 'scout', description: 'Scout on foot.',
      attack: 0, defInf: 10, defCav: 5, speed: 9, carry: 0, upkeep: 1, cost: res(160, 100, 50, 50), trainTime: 1120, building: 'barracks', requires: [{ building: 'academy', level: 1 }, { building: 'main', level: 5 }] }),
    U({ id: 'shieldbearer', name: 'Shield Rider', icon: '🛡️', type: 'cav', description: 'Defensive cavalry.',
      attack: 55, defInf: 100, defCav: 40, speed: 10, carry: 110, upkeep: 2, cost: res(370, 270, 290, 75), trainTime: 2400, building: 'stable', requires: [{ building: 'stable', level: 3 }] }),
    U({ id: 'berserker', name: 'Berserker Rider', icon: '🐻', type: 'cav', description: 'Devastating attacking cavalry.',
      attack: 150, defInf: 50, defCav: 75, speed: 9, carry: 80, upkeep: 3, cost: res(450, 515, 480, 80), trainTime: 2960, building: 'stable', requires: [{ building: 'stable', level: 10 }, { building: 'smithy', level: 5 }] }),
    U({ id: 'horde_ram', name: 'Ram', icon: '🪵', type: 'ram', description: 'Smashes enemy walls.',
      attack: 65, defInf: 30, defCav: 80, speed: 4, carry: 0, upkeep: 3, cost: res(1000, 300, 350, 70), trainTime: 4200, building: 'workshop', requires: [{ building: 'workshop', level: 1 }] }),
    U({ id: 'horde_catapult', name: 'Catapult', icon: '☄️', type: 'catapult', description: 'Destroys buildings.',
      attack: 50, defInf: 60, defCav: 10, speed: 3, carry: 0, upkeep: 6, cost: res(900, 1200, 600, 60), trainTime: 9000, building: 'workshop', requires: [{ building: 'workshop', level: 10 }] }),
    U({ id: 'jarl', name: 'Jarl', icon: '🎖️', type: 'chief', description: 'Persuades enemy villages to join you.',
      attack: 40, defInf: 60, defCav: 40, speed: 4, carry: 0, upkeep: 4, cost: res(35500, 26600, 25000, 27200), trainTime: 70500, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
    U({ id: 'horde_settler', name: 'Settler', icon: '🧺', type: 'settler', description: 'Founds new villages.',
      attack: 10, defInf: 80, defCav: 80, speed: 5, carry: 3000, upkeep: 1, cost: res(5800, 4400, 4600, 5200), trainTime: 31000, building: 'residence', requires: [{ building: 'residence', level: 10 }] }),
  ],
};

const A = (id: string, name: string, icon: string, attack: number, defInf: number, defCav: number, upkeep: number): UnitDef =>
  U({ id, name, icon, type: 'inf', description: 'Wild animal guarding an oasis.', attack, defInf, defCav, speed: 20, carry: 0, upkeep,
    cost: res(0, 0, 0, 0), trainTime: 1, building: 'barracks', requires: [] });

/** Wild animals that guard oases. Not playable. */
const nature: TribeDef = {
  id: 'nature',
  name: 'Nature',
  icon: '🐾',
  tagline: 'Wild animals',
  description: 'Animals defend unoccupied oases.',
  strengths: [],
  wallPerLevel: 0,
  crannyMultiplier: 1,
  enemyCrannyFactor: 1,
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

export const TRIBES: Record<TribeId, TribeDef> = { legion, clans, horde, nature };

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
export function smithyFactor(level: number): number {
  return Math.pow(1.015, Math.max(0, level));
}

/** Academy research cost: about 3x the unit cost. */
export function researchCost(u: UnitDef): Resources {
  return res(u.cost.wood * 3, u.cost.clay * 3, u.cost.iron * 3, u.cost.crop * 3);
}

export function researchTimeMs(u: UnitDef, speedMultiplier: number): number {
  return Math.max(1000, Math.round((u.trainTime * 4) / speedMultiplier) * 1000);
}

/** Smithy upgrade cost to reach `level`. */
export function smithyCost(u: UnitDef, level: number): Resources {
  const k = 1.5 * Math.pow(1.22, level - 1);
  const r = (n: number) => Math.round((n * k) / 5) * 5;
  return res(r(u.cost.wood), r(u.cost.clay), r(u.cost.iron), r(u.cost.crop));
}

export function smithyTimeMs(u: UnitDef, level: number, speedMultiplier: number): number {
  return Math.max(1000, Math.round((u.trainTime * 2 * Math.pow(1.18, level - 1)) / speedMultiplier) * 1000);
}

export const SMITHY_MAX = 20;
