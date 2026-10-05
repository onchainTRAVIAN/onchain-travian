import { VILLAGE_BASE_DEFENSE, defensePower, type ArmyGroup } from './battle.js';
import { TRIBES, emptyUnits, type TribeId, type UnitCounts } from './units.js';

/** Natars never attack players below this total population. */
export const NATAR_MIN_POP = 300;
/** Hours between two Natar attacks on the same player (at least). */
export const NATAR_COOLDOWN_HOURS = 24;
/** Natar armies are this share of the target's strength (random in between). */
export const NATAR_FACTOR_MIN = 0.5;
export const NATAR_FACTOR_MAX = 0.9;
/** The simulator shows a typical (middle) Natar army. */
export const NATAR_TYPICAL = (NATAR_FACTOR_MIN + NATAR_FACTOR_MAX) / 2;
/** Population counts as this much "strength", so a big empty village still gets a real attack. */
const POP_STRENGTH = 8;

/**
 * How strong a village is in the Natars' eyes: its full defence against a mixed army
 * (troops, wall, residence) plus its owner's population. Stronger targets draw stronger Natars.
 */
export function natarStrength(d: { groups: ArmyGroup[]; tribe: TribeId; wall: number; residence: number; playerPop: number }): number {
  const troops = defensePower(d.groups, 0.5);
  const wallMult = Math.pow(1 + TRIBES[d.tribe].wallPerLevel, d.wall);
  return Math.round((troops + VILLAGE_BASE_DEFENSE + 2 * d.residence * d.residence) * wallMult + d.playerPop * POP_STRENGTH);
}

/** Share of the attack power per Natar unit slot (infantry and cavalry mix). */
const MIX: [slot: number, share: number][] = [
  [1, 0.35], // Thorned Warrior
  [2, 0.15], // Guardsman
  [4, 0.3], // Axerider
  [5, 0.2], // Natarian Knight
];

/** A Natar army with about `factor` × `strength` attack. Normal attacks bring a few War Elephants (rams). */
export function natarArmy(strength: number, factor: number, mode: 'attack' | 'raid'): UnitCounts {
  const units = emptyUnits();
  const target = Math.max(0, strength * factor);
  const natar = TRIBES.natars.units;
  for (const [slot, share] of MIX) {
    const atk = natar[slot]?.attack ?? 1;
    units[slot] = Math.max(1, Math.round((target * share) / atk));
  }
  if (mode === 'attack') units[6] = Math.max(1, Math.round((units[1]! + units[2]! + units[4]! + units[5]!) * 0.03));
  return units;
}
