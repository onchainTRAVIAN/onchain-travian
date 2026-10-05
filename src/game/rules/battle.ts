import { TRIBES, unitDef, upgradedStat, type TribeId, type UnitCounts } from './units.js';
import { RESOURCE_KEYS, res, sumRes, type Resources } from './resources.js';

export type AttackMode = 'attack' | 'raid';

export interface ArmyGroup {
  tribe: TribeId;
  units: UnitCounts;
  /** Blacksmith (when attacking) or Armoury (when defending) level per unit slot. */
  upgrades?: number[];
  /** A hero fighting with this group (T3: values from the unit it was trained from). */
  hero?: { off: number; defInf: number; defCav: number; cav: boolean };
  /** Multiplier on this group's defence (its own hero's defence bonus). */
  defBonus?: number;
}

export interface BattleInput {
  mode: AttackMode;
  attacker: ArmyGroup;
  /** All troops in the defending village: owner's troops plus reinforcements. */
  defenders: ArmyGroup[];
  defenderTribe: TribeId | null;
  wallLevel: number;
  /** Multipliers from perks/upgrades (1 = none). */
  attackMultiplier?: number;
  defenseMultiplier?: number;
  /** Residence or Palace level of the defending village (adds 2·L² defence). */
  residenceLevel?: number;
  /** Account populations for morale (a big attacker hitting a small player is weakened). */
  attackerPop?: number;
  defenderPop?: number;
  /** Rams in a normal attack: they lower the wall before the fight. */
  rams?: { count: number; upgrade: number };
  /** Building sturdiness against siege (Stonemason: 1 + 10% per level). */
  siegeDurability?: number;
  /** How hard the defender's wall is to ram during the battle (Romans 1, Gauls 2, Teutons 5). */
  wallDurability?: number;
  /** Extra units counted for the battle size (heroes). */
  extraUnits?: number;
}

export interface BattleResult {
  attackerWon: boolean;
  /** Final attack / defence (used for catapult damage). */
  ratio: number;
  /** Wall level during the fight and after the battle (rams). */
  wallInBattle: number;
  wallAfter: number;
  attackPower: number;
  defensePower: number;
  attackerLosses: UnitCounts;
  defenderLosses: UnitCounts[];
  attackerLossRatio: number;
  defenderLossRatio: number;
}

/** Base defence every village has even when empty. */
export const VILLAGE_BASE_DEFENSE = 10;
const EXPONENT = 1.5;

/** T3.6 loss exponent: big battles are bloodier for the winner (1.5 for small fights, down to ~1.26). */
export function lossExponent(totalUnits: number): number {
  if (totalUnits <= 0) return EXPONENT;
  return Math.max(1.2578, Math.min(1.5, 2 * (1.8592 - Math.pow(totalUnits, 0.015))));
}

const round = (step: number) => (n: number) => Math.round(n / step) * step;

/**
 * T3.6 morale: a bigger attacker is weakened (multiplier on attack, 0.667–1). The effect fades
 * when the attack is weaker than the defence (`ptsRatio` = attack / defence). Defender population
 * counts as at least 3.
 */
export function moraleMalus(attackerPop: number | undefined, defenderPop: number | undefined, ptsRatio = 1): number {
  if (!attackerPop || defenderPop === undefined || attackerPop <= defenderPop) return 1;
  const popRatio = attackerPop / Math.max(defenderPop, 3);
  return Math.max(0.667, round(1e-3)(Math.pow(popRatio, -0.2 * Math.min(ptsRatio, 1))));
}

/** Kept for reports/older callers: the equivalent defence bonus (1 / malus). */
export function moraleBonus(attackerPop: number | undefined, defenderPop: number | undefined): number {
  return 1 / moraleMalus(attackerPop, defenderPop);
}

/** Catapult morale (T3): catapults of a much bigger attacker are weaker, (attPop/defPop)^-0.3 clamped to [1/3, 1]. */
export function cataMorale(attackerPop: number, defenderPop: number): number {
  if (attackerPop <= 0 || defenderPop <= 0) return 1;
  return Math.min(1, Math.max(0.3333, Math.pow(attackerPop / defenderPop, -0.3)));
}

/** σ from the T3 siege formula. */
export function sigma(x: number): number {
  return (x > 1 ? 2 - Math.pow(x, -1.5) : Math.pow(x, 1.5)) / 2;
}

/** Siege weapon upgrade factor 1.0205^level (rounded to 0.005). */
export function siegeUpgrade(level: number): number {
  return round(0.005)(Math.pow(1.0205, level));
}

/** Demolition points D = 4·σ(attack/defence)·⌊engines / durability⌋·morale·upgrade. */
export function demolishPoints(engines: number, upgradeLevel: number, durability: number, ptsRatio: number, morale = 1): number {
  const eff = Math.floor(engines / Math.max(1, durability)) * morale;
  return 4 * sigma(ptsRatio) * eff * siegeUpgrade(upgradeLevel);
}

/** Level left after `damage` demolition points (each level costs its own number, minus ½). */
export function demolish(level: number, damage: number): number {
  let d = damage - 0.5;
  let l = level;
  if (d < 0) return l;
  while (d >= l && l > 0) {
    d -= l;
    l--;
  }
  return l;
}

/** Early ram phase (before the fight): demolition points needed to bring wall `from` to level `to`. */
const EARLY_RAM: number[][] = [];
for (let lvl = 0; lvl <= 20; lvl++) {
  const row: number[] = [];
  let l = 0;
  for (; l <= lvl / 2; l++) row.push(-2 * l * l + (2 * lvl + 1) * l);
  const base = (lvl * (lvl + 1)) / 2 + 20;
  for (; l <= lvl; l++) {
    const dl = l - Math.floor(lvl / 2) - 1;
    row.push(1.25 * dl * dl + 49.75 * dl + base);
  }
  row.push(1e9);
  EARLY_RAM.push(row);
}

/** Tribe wall sturdiness against the rams' first strike (city wall 1, palisade 2, earth wall 5). */
export const WALL_DURABILITY: Record<string, number> = { romans: 1, gauls: 2, teutons: 5 };

/** Wall level that holds during the battle after the rams' first strike. */
export function wallDuringBattle(level: number, points: number, wallDurability = 1): number {
  const row = EARLY_RAM[Math.min(20, Math.max(0, level))] ?? [0, 1e9];
  let dem = 0;
  while (Math.floor(wallDurability * (row[dem + 1] ?? 1e9)) <= points) dem++;
  return level - dem;
}

function isInfantryLike(tribe: TribeId, slot: number): boolean {
  return unitDef(tribe, slot).type !== 'cav';
}

export function attackPower(group: ArmyGroup): { inf: number; cav: number } {
  let inf = group.hero && !group.hero.cav ? group.hero.off : 0;
  let cav = group.hero?.cav ? group.hero.off : 0;
  group.units.forEach((n, i) => {
    if (n <= 0) return;
    const u = unitDef(group.tribe, i);
    if (u.type === 'scout') return;
    const value = n * upgradedStat(u, u.attack, group.upgrades?.[i] ?? 0);
    if (isInfantryLike(group.tribe, i)) inf += value;
    else cav += value;
  });
  return { inf, cav };
}

export function defensePower(groups: ArmyGroup[], infShare: number): number {
  const cavShare = 1 - infShare;
  let total = 0;
  for (const g of groups) {
    let group = g.hero ? g.hero.defInf * infShare + g.hero.defCav * cavShare : 0;
    g.units.forEach((n, i) => {
      if (n <= 0) return;
      const u = unitDef(g.tribe, i);
      const lvl = g.upgrades?.[i] ?? 0;
      group += n * (upgradedStat(u, u.defInf, lvl) * infShare + upgradedStat(u, u.defCav, lvl) * cavShare);
    });
    total += group * (g.defBonus ?? 1);
  }
  return total;
}

function applyLoss(units: UnitCounts, ratio: number): UnitCounts {
  return units.map((n) => Math.min(n, Math.round(n * ratio)));
}

export function resolveBattle(input: BattleInput): BattleResult {
  const { inf, cav } = attackPower(input.attacker);
  const baseAtk = (inf + cav) * (input.attackMultiplier ?? 1);
  const infShare = inf + cav > 0 ? inf / (inf + cav) : 1;
  const residence = input.residenceLevel ?? 0;
  const troopDef = defensePower(input.defenders, infShare);
  const wallPer = input.defenderTribe ? TRIBES[input.defenderTribe].wallPerLevel : 0;
  const defAt = (wall: number) =>
    (troopDef + VILLAGE_BASE_DEFENSE + 2 * residence * residence) * Math.pow(1 + wallPer, wall) * (input.defenseMultiplier ?? 1);
  const attackAt = (def: number) => baseAtk * moraleMalus(input.attackerPop, input.defenderPop, def > 0 ? baseAtk / def : 1);

  let wallInBattle = input.wallLevel;
  let def = defAt(wallInBattle);
  let atk = attackAt(def);
  let wallAfter = input.wallLevel;
  const rams = input.rams;
  const durability = input.siegeDurability ?? 1;
  if (input.mode === 'attack' && rams && rams.count > 0 && input.wallLevel > 0 && def > 0) {
    // Rams strike first; the battle is fought against the weakened wall, then the wall takes the rest.
    const early = demolishPoints(rams.count, rams.upgrade, durability, atk / def);
    wallInBattle = wallDuringBattle(input.wallLevel, early, input.wallDurability ?? 1);
    def = defAt(wallInBattle);
    atk = attackAt(def);
    wallAfter = demolish(input.wallLevel, demolishPoints(rams.count, rams.upgrade, durability, atk / def));
  }

  const unitsInBattle =
    input.attacker.units.reduce((a, b) => a + b, 0) +
    input.defenders.reduce((s, g) => s + g.units.reduce((a, b) => a + b, 0), 0) +
    (input.extraUnits ?? 0);
  const K = lossExponent(unitsInBattle);
  const attackerWon = atk > def;
  let attackerLossRatio: number;
  let defenderLossRatio: number;

  if (input.mode === 'attack') {
    if (attackerWon) {
      attackerLossRatio = Math.pow(def / atk, K);
      defenderLossRatio = 1;
    } else {
      attackerLossRatio = 1;
      defenderLossRatio = atk > 0 ? Math.pow(atk / def, K) : 0;
    }
  } else {
    // Raid: both sides retreat early, so the winner loses less and the loser does not die to the last man.
    const x = def > 0 ? Math.pow(atk / def, K) : Infinity;
    attackerLossRatio = Number.isFinite(x) ? 1 / (1 + x) : 0;
    defenderLossRatio = Number.isFinite(x) ? x / (1 + x) : 1;
    if (atk === 0) defenderLossRatio = 0;
  }

  return {
    attackerWon,
    ratio: def > 0 ? atk / def : Infinity,
    wallInBattle,
    wallAfter,
    attackPower: Math.round(atk),
    defensePower: Math.round(def),
    attackerLosses: applyLoss(input.attacker.units, attackerLossRatio),
    defenderLosses: input.defenders.map((g) => applyLoss(g.units, defenderLossRatio)),
    attackerLossRatio,
    defenderLossRatio,
  };
}

/**
 * Levels a building drops to under `catapults` (all catapults aimed at it), T3 formula.
 * `ratio` = attack / defence of the battle, `morale` = catapult morale, `durability` = Stonemason factor.
 */
export function catapultResult(level: number, catapults: number, upgrade: number, ratio: number, durability = 1, morale = 1): number {
  if (catapults <= 0 || level <= 0) return level;
  return demolish(level, demolishPoints(catapults, upgrade, durability, ratio, morale));
}

/**
 * Loot taken by raiders: proportional to what is unprotected, up to carry capacity.
 * `hidden` is how much of each resource the cranny protects (one number for all, or per resource).
 */
export function computeLoot(stock: Resources, hidden: number | Resources, capacity: number): Resources {
  const h = typeof hidden === 'number' ? res(hidden, hidden, hidden, hidden) : hidden;
  const available = res(
    Math.max(0, Math.floor(stock.wood - h.wood)),
    Math.max(0, Math.floor(stock.clay - h.clay)),
    Math.max(0, Math.floor(stock.iron - h.iron)),
    Math.max(0, Math.floor(stock.crop - h.crop)),
  );
  const total = sumRes(available);
  if (total <= capacity) return available;
  const loot = res();
  let remaining = capacity;
  // Fair split: each resource gets an equal share; leftovers go to resources that still have stock.
  let keys = RESOURCE_KEYS.filter((k) => available[k] > 0);
  while (remaining > 0 && keys.length > 0) {
    const share = Math.floor(remaining / keys.length);
    if (share === 0) break;
    for (const k of keys) {
      const take = Math.min(share, available[k] - loot[k]);
      loot[k] += take;
      remaining -= take;
    }
    keys = keys.filter((k) => available[k] - loot[k] > 0);
  }
  return loot;
}

/**
 * Scouting (T3): only scouts fight. Attack = 35 per scout (upgraded) × morale, defence = 20 per
 * defending scout (upgraded) × wall bonus. Attacker losses = (def/att)^1.5; the mission fails only
 * when every scout dies. Defending scouts never die.
 */
export function resolveScouting(attackPoints: number, defensePoints: number): { success: boolean; lossRatio: number } {
  if (attackPoints <= 0) return { success: false, lossRatio: 1 };
  if (defensePoints <= 0) return { success: true, lossRatio: 0 };
  const lossRatio = Math.min(1, Math.pow(defensePoints / attackPoints, 1.5));
  return { success: lossRatio < 1, lossRatio };
}

/** Scouting strength of a group's scouts (35 attack / 20 defence per scout, upgraded). */
export function scoutPoints(group: ArmyGroup, role: 'attack' | 'defense'): number {
  let total = 0;
  group.units.forEach((n, i) => {
    if (n <= 0) return;
    const u = unitDef(group.tribe, i);
    if (u.type !== 'scout') return;
    total += n * upgradedStat(u, role === 'attack' ? 35 : 20, group.upgrades?.[i] ?? 0);
  });
  return total;
}

const STORAGE_TARGETS = new Set(['warehouse', 'granary']);
const FIELD_AND_BONUS_TARGETS = new Set(['woodcutter', 'claypit', 'ironmine', 'cropland', 'sawmill', 'brickyard', 'ironfoundry', 'grainmill', 'bakery']);
const NEVER_TARGET = new Set(['cranny', 'stonemason', 'trapper', 'citywall', 'earthwall', 'palisade']);

/**
 * Which buildings catapults may aim at, by the attacker's Rally Point level (T3.6):
 * below 3 random only; 3 storage; 5 also fields and bonus buildings; 10 everything except
 * cranny, stonemason, trapper and walls.
 */
export function catapultTargetAllowed(building: string, rallyLevel: number): boolean {
  if (NEVER_TARGET.has(building)) return false;
  if (rallyLevel >= 10) return true;
  if (rallyLevel >= 5) return STORAGE_TARGETS.has(building) || FIELD_AND_BONUS_TARGETS.has(building);
  if (rallyLevel >= 3) return STORAGE_TARGETS.has(building);
  return false;
}

/** A second catapult target needs Rally Point 20 and at least 20 catapults. */
export function canAimTwice(rallyLevel: number, catapults: number): boolean {
  return rallyLevel >= 20 && catapults >= 20;
}

/**
 * Gaul traps catch attackers before the fight: each free trap holds one soldier, taken evenly
 * from every unit type (rounded down, in slot order).
 */
export function trapCatch(units: UnitCounts, freeTraps: number): UnitCounts {
  const caught = units.map(() => 0);
  let free = Math.max(0, Math.floor(freeTraps));
  const total = units.reduce((a, b) => a + b, 0);
  if (free <= 0 || total <= 0) return caught;
  const share = Math.min(1, free / total);
  units.forEach((n, i) => {
    const t = Math.min(n, Math.floor(n * share), free);
    caught[i] = t;
    free -= t;
  });
  return caught;
}
