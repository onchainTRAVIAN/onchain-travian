import { TRIBES, smithyFactor, unitDef, type TribeId, type UnitCounts } from './units.js';
import { RESOURCE_KEYS, res, sumRes, type Resources } from './resources.js';

export type AttackMode = 'attack' | 'raid';

export interface ArmyGroup {
  tribe: TribeId;
  units: UnitCounts;
  /** Smithy upgrade level per unit slot. */
  smithy?: number[];
  /** Fighting strength of a hero travelling with this group (0/undefined = no hero). */
  heroStrength?: number;
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
}

export interface BattleResult {
  attackerWon: boolean;
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

function isInfantryLike(tribe: TribeId, slot: number): boolean {
  return unitDef(tribe, slot).type !== 'cav';
}

export function attackPower(group: ArmyGroup): { inf: number; cav: number } {
  let inf = group.heroStrength ?? 0;
  let cav = 0;
  group.units.forEach((n, i) => {
    if (n <= 0) return;
    const u = unitDef(group.tribe, i);
    if (u.type === 'scout') return;
    const value = n * u.attack * smithyFactor(group.smithy?.[i] ?? 0);
    if (isInfantryLike(group.tribe, i)) inf += value;
    else cav += value;
  });
  return { inf, cav };
}

export function defensePower(groups: ArmyGroup[], infShare: number): number {
  const cavShare = 1 - infShare;
  let total = 0;
  for (const g of groups) {
    total += g.heroStrength ?? 0;
    g.units.forEach((n, i) => {
      if (n <= 0) return;
      const u = unitDef(g.tribe, i);
      total += n * (u.defInf * infShare + u.defCav * cavShare) * smithyFactor(g.smithy?.[i] ?? 0);
    });
  }
  return total;
}

function applyLoss(units: UnitCounts, ratio: number): UnitCounts {
  return units.map((n) => Math.min(n, Math.round(n * ratio)));
}

export function resolveBattle(input: BattleInput): BattleResult {
  const { inf, cav } = attackPower(input.attacker);
  const atk = (inf + cav) * (input.attackMultiplier ?? 1);
  const infShare = inf + cav > 0 ? inf / (inf + cav) : 1;
  const wallMult = input.defenderTribe
    ? Math.pow(1 + TRIBES[input.defenderTribe].wallPerLevel, input.wallLevel)
    : 1;
  const def =
    (defensePower(input.defenders, infShare) + VILLAGE_BASE_DEFENSE + input.wallLevel * 10) *
    wallMult *
    (input.defenseMultiplier ?? 1);

  const attackerWon = atk > def;
  let attackerLossRatio: number;
  let defenderLossRatio: number;

  if (input.mode === 'attack') {
    if (attackerWon) {
      attackerLossRatio = Math.pow(def / atk, EXPONENT);
      defenderLossRatio = 1;
    } else {
      attackerLossRatio = 1;
      defenderLossRatio = atk > 0 ? Math.pow(atk / def, EXPONENT) : 0;
    }
  } else {
    // Raid: both sides retreat early, so the winner loses less and the loser does not die to the last man.
    const winner = Math.max(atk, def);
    const loser = Math.min(atk, def);
    const x = winner > 0 ? Math.pow(loser / winner, EXPONENT) : 0;
    const winnerLoss = x / (1 + x);
    const loserLoss = 1 / (1 + x);
    attackerLossRatio = attackerWon ? winnerLoss : loserLoss;
    defenderLossRatio = attackerWon ? loserLoss : winnerLoss;
    if (atk === 0) defenderLossRatio = 0;
  }

  return {
    attackerWon,
    attackPower: Math.round(atk),
    defensePower: Math.round(def),
    attackerLosses: applyLoss(input.attacker.units, attackerLossRatio),
    defenderLosses: input.defenders.map((g) => applyLoss(g.units, defenderLossRatio)),
    attackerLossRatio,
    defenderLossRatio,
  };
}

/** Wall levels knocked down by surviving rams. */
export function ramDamage(survivingRams: number, wallLevel: number): number {
  if (survivingRams <= 0 || wallLevel <= 0) return 0;
  let level = wallLevel;
  let rams = survivingRams;
  while (level > 0) {
    const needed = 2 + level;
    if (rams < needed) break;
    rams -= needed;
    level -= 1;
  }
  return wallLevel - level;
}

/** Building levels knocked down by surviving catapults. */
export function catapultDamage(survivingCatapults: number, buildingLevel: number): number {
  if (survivingCatapults <= 0 || buildingLevel <= 0) return 0;
  let level = buildingLevel;
  let catas = survivingCatapults;
  while (level > 0) {
    const needed = 1 + Math.ceil(level * 1.5);
    if (catas < needed) break;
    catas -= needed;
    level -= 1;
  }
  return buildingLevel - level;
}

/**
 * Loot taken by raiders: proportional to what is unprotected, up to carry capacity.
 * `hidden` is how much of each resource the cranny protects.
 */
export function computeLoot(stock: Resources, hidden: number, capacity: number): Resources {
  const available = res(
    Math.max(0, Math.floor(stock.wood - hidden)),
    Math.max(0, Math.floor(stock.clay - hidden)),
    Math.max(0, Math.floor(stock.iron - hidden)),
    Math.max(0, Math.floor(stock.crop - hidden)),
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

/** Scouting: succeeds if the scouts are not wiped out by defending scouts. */
export function resolveScouting(
  attackerScouts: number,
  defenderScouts: number,
): { success: boolean; scoutLosses: number } {
  if (attackerScouts <= 0) return { success: false, scoutLosses: 0 };
  if (defenderScouts <= 0) return { success: true, scoutLosses: 0 };
  const ratio = defenderScouts / attackerScouts;
  if (ratio >= 1) return { success: false, scoutLosses: attackerScouts };
  const losses = Math.round(attackerScouts * Math.pow(ratio, EXPONENT));
  return { success: true, scoutLosses: losses };
}
