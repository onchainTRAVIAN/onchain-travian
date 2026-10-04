import type { OasisType } from './map.js';
import { emptyUnits, type UnitCounts } from './units.js';
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

/** Animals regrow ~10% of max per day (per type), never above max. Only unoccupied oases regrow. */
export function regrowAnimals(type: OasisType, current: UnitCounts, hours: number): UnitCounts {
  const max = maxAnimals(type);
  return current.map((n, i) => {
    const cap = max[i] ?? 0;
    if (n >= cap) return n;
    return Math.min(cap, Math.floor(n + (cap * 0.1 * hours) / 24 + 1e-9));
  });
}
