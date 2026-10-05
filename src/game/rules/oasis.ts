import type { OasisType } from './map.js';
import { TRIBES, emptyUnits, type UnitCounts } from './units.js';
import { mulberry32 } from './map.js';

/** Animal mix per oasis type: slot index (nature tribe) -> max count. */
const BASE: Record<OasisType, Partial<Record<number, number>>> = {
  wood: { 0: 10, 4: 8, 5: 6, 6: 3 },
  clay: { 0: 10, 1: 8, 2: 6, 6: 2 },
  iron: { 0: 8, 1: 8, 3: 6, 6: 2 },
  crop: { 0: 10, 2: 6, 7: 2, 9: 1 },
  wood_crop: { 0: 10, 4: 10, 5: 8, 6: 4, 8: 2 },
  clay_crop: { 0: 10, 1: 10, 2: 8, 7: 3, 8: 2 },
  iron_crop: { 0: 10, 3: 10, 6: 4, 7: 3, 9: 1 },
  crop2: { 0: 12, 2: 10, 7: 5, 8: 4, 9: 3 },
};

export function maxAnimals(type: OasisType): UnitCounts {
  const out = emptyUnits();
  for (const [slot, n] of Object.entries(BASE[type])) out[Number(slot)] = n ?? 0;
  return out;
}

/** Starting population: 50-100% of the max, deterministic per tile. */
export function initialAnimals(type: OasisType, x: number, y: number): UnitCounts {
  const rnd = mulberry32(((x + 1000) * 7919) ^ ((y + 1000) * 104729));
  return maxAnimals(type).map((n) => Math.round(n * (0.5 + rnd() * 0.5)));
}

/** Animal growth in a free oasis: this much power per real day, up to the cap. */
export const ANIMAL_POWER_PER_DAY = 350;
export const ANIMAL_POWER_CAP = 8000;

/** An animal's power: its average defence against infantry and cavalry. */
function animalPower(slot: number): number {
  const u = TRIBES.nature.units[slot];
  return u ? (u.defInf + u.defCav) / 2 : 0;
}

export function oasisAnimalPower(animals: UnitCounts): number {
  return animals.reduce((s, n, i) => s + n * animalPower(i), 0);
}

/**
 * Free oases slowly gain animals: up to ANIMAL_POWER_PER_DAY power per day, until the oasis holds
 * ANIMAL_POWER_CAP. Whole animals are added one by one, keeping the oasis's usual species mix
 * (by its typical head count); `used` is the power actually added, so the caller can carry the rest over.
 */
export function regrowAnimals(type: OasisType, current: UnitCounts, hours: number): { animals: UnitCounts; used: number } {
  const have = oasisAnimalPower(current);
  const budget = Math.min(Math.max(0, ANIMAL_POWER_CAP - have), (ANIMAL_POWER_PER_DAY * hours) / 24);
  const species = Object.entries(BASE[type]).map(([slot, w]) => ({ slot: Number(slot), w: w ?? 0, added: 0 })).filter((x) => x.w > 0 && animalPower(x.slot) > 0);
  const out = [...current];
  let used = 0;
  // Credit from earlier growth: animals already there count towards their species' share.
  for (const x of species) x.added = current[x.slot] ?? 0;
  for (;;) {
    // The species furthest behind its share gets the next animal; if it doesn't fit yet, growth
    // waits (the time carries over) instead of filling up with small animals.
    const next = [...species].sort((a, b) => a.added / a.w - b.added / b.w || animalPower(a.slot) - animalPower(b.slot))[0];
    if (!next) break;
    const pw = animalPower(next.slot);
    if (pw > budget - used + 1e-9) break;
    out[next.slot] = (out[next.slot] ?? 0) + 1;
    next.added++;
    used += pw;
  }
  return { animals: out, used };
}

/** Resources an unoccupied oasis gathers per hour for each 25% of bonus (before world speed). */
export const OASIS_RES_PER_25 = 40;
/** Storage per resource in an unoccupied oasis (before world speed), capped at a warehouse level 20. */
export const OASIS_RES_CAP = 1000;
export const OASIS_RES_CAP_MAX = 80_000;
