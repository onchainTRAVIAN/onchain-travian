import { WALL_DURABILITY, catapultResult, cataMorale, moraleMalus, resolveBattle, type ArmyGroup, type AttackMode, type BattleResult } from './battle.js';
import { HERO_BONUS_PER_POINT, heroCombat } from './hero.js';
import { TRIBES, carryOf, emptyUnits, type TribeId, type UnitCounts } from './units.js';

/** A hero in the simulator: the unit it was trained from and its points. */
export interface SimHero {
  slot: number;
  /** Attack points (attacker) or defence points (defender). */
  points: number;
  /** Off-bonus (attacker) or def-bonus (defender) points, 0.2% each. */
  bonus: number;
}
export interface SimArmy {
  tribe: TribeId;
  units: UnitCounts;
  /** Blacksmith (attacker) or Armoury (defender) level per slot. */
  levels: number[];
  hero?: SimHero | null;
}
export interface SimInput {
  mode: AttackMode;
  attacker: SimArmy;
  attackerPop: number;
  /** Extra attack, e.g. 0.1 for +10%. */
  attackBonus: number;
  /** First army is the village owner's (its tribe sets the wall); the rest are reinforcements. */
  defenders: SimArmy[];
  /** False for an oasis (no wall, no morale, nature animals). */
  village: boolean;
  wall: number;
  residence: number;
  stonemason: number;
  defenderPop: number;
  defenseBonus: number;
  /** Level of the building the catapults aim at (0 = none). */
  targetLevel: number;
}
export interface SimResult extends BattleResult {
  attackerSurvivors: UnitCounts;
  defenderSurvivors: UnitCounts[];
  heroDied: { attacker: boolean; defenders: boolean[] };
  wallFrom: number;
  buildingAfter: number | null;
  morale: number;
  carry: number;
  /** Smallest attack multiplier that would still win (null = can't tell / no attack). */
  winAt: number | null;
}

const slotOfType = (tribe: TribeId, type: string) => TRIBES[tribe].units.findIndex((u) => u.type === type);

function heroOf(army: SimArmy, role: 'attack' | 'defense') {
  const h = army.hero;
  if (!h) return undefined;
  const u = TRIBES[army.tribe].units[h.slot] ?? TRIBES[army.tribe].units[0];
  if (!u) return undefined;
  const pts = Math.max(0, h.points);
  const c = heroCombat(u, role === 'attack' ? pts : 0, role === 'defense' ? pts : 0);
  return { ...c, cav: u.type === 'cav' };
}

function battle(input: SimInput, multiplier: number): BattleResult {
  const a = input.attacker;
  const ramSlot = slotOfType(a.tribe, 'ram');
  const ownerTribe = input.defenders[0]?.tribe ?? 'romans';
  const defGroups: ArmyGroup[] = input.defenders.map((d) => ({
    tribe: d.tribe,
    units: d.units,
    upgrades: d.levels,
    hero: heroOf(d, 'defense'),
    defBonus: d.hero ? 1 + Math.max(0, d.hero.bonus) * HERO_BONUS_PER_POINT : undefined,
  }));
  const heroes = (a.hero ? 1 : 0) + input.defenders.filter((d) => d.hero).length;
  return resolveBattle({
    mode: input.mode,
    attacker: { tribe: a.tribe, units: a.units, upgrades: a.levels, hero: heroOf(a, 'attack') },
    defenders: defGroups,
    defenderTribe: input.village ? ownerTribe : null,
    wallLevel: input.village ? input.wall : 0,
    attackMultiplier: (1 + input.attackBonus) * (a.hero ? 1 + Math.max(0, a.hero.bonus) * HERO_BONUS_PER_POINT : 1) * multiplier,
    defenseMultiplier: 1 + input.defenseBonus,
    residenceLevel: input.village ? input.residence : 0,
    attackerPop: input.village ? input.attackerPop : undefined,
    defenderPop: input.village ? input.defenderPop : undefined,
    rams: ramSlot >= 0 ? { count: a.units[ramSlot] ?? 0, upgrade: a.levels[ramSlot] ?? 0 } : undefined,
    siegeDurability: 1 + 0.1 * input.stonemason,
    wallDurability: input.village ? WALL_DURABILITY[ownerTribe] ?? 1 : 1,
    extraUnits: heroes,
  });
}

/** The same battle the server would fight, without touching the world. */
export function simulate(input: SimInput): SimResult {
  const r = battle(input, 1);
  const a = input.attacker;
  const cataSlot = slotOfType(a.tribe, 'catapult');
  const catas = cataSlot >= 0 ? a.units[cataSlot] ?? 0 : 0;
  const buildingAfter =
    input.village && input.mode === 'attack' && r.attackerWon && catas > 0 && input.targetLevel > 0
      ? catapultResult(input.targetLevel, catas, a.levels[cataSlot] ?? 0, r.ratio, 1 + 0.1 * input.stonemason, cataMorale(input.attackerPop, input.defenderPop))
      : null;
  const attackerSurvivors = a.units.map((n, i) => n - (r.attackerLosses[i] ?? 0));
  const defenderSurvivors = input.defenders.map((d, k) => d.units.map((n, i) => n - (r.defenderLosses[k]?.[i] ?? 0)));
  // Heroes die when their side loses more than 90% (as in the real battle).
  const heroDied = {
    attacker: !!a.hero && r.attackerLossRatio > 0.9,
    defenders: input.defenders.map((d) => !!d.hero && r.defenderLossRatio > 0.9),
  };
  // How strong the attack must be to win: bisection on an attack multiplier.
  let winAt: number | null = null;
  if (a.units.some((n) => n > 0) || a.hero) {
    let lo = 0;
    let hi = 1;
    while (!battle(input, hi).attackerWon && hi < 1e6) hi *= 2;
    if (hi < 1e6) {
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (battle(input, mid).attackerWon) hi = mid;
        else lo = mid;
      }
      winAt = hi;
    }
  }
  return {
    ...r,
    attackerSurvivors,
    defenderSurvivors,
    heroDied,
    wallFrom: input.village ? input.wall : 0,
    buildingAfter,
    morale: input.village ? moraleMalus(input.attackerPop, input.defenderPop, r.defensePower > 0 ? r.attackPower / r.defensePower : 1) : 1,
    carry: carryOf(a.tribe, attackerSurvivors),
    winAt,
  };
}

export function emptyArmy(tribe: TribeId): SimArmy {
  return { tribe, units: emptyUnits(), levels: Array.from({ length: 10 }, () => 0), hero: null };
}
