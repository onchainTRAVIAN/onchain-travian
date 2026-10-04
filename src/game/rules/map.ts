import type { FieldId } from './buildings.js';
import type { ResourceKey } from './resources.js';

/** Resource field layouts: how many of the 18 fields produce wood/clay/iron/crop. */
export const FIELD_LAYOUTS = {
  '4-4-4-6': [4, 4, 4, 6],
  '3-4-5-6': [3, 4, 5, 6],
  '4-5-3-6': [4, 5, 3, 6],
  '5-3-4-6': [5, 3, 4, 6],
  '3-3-3-9': [3, 3, 3, 9],
  '4-4-3-7': [4, 4, 3, 7],
  '1-1-1-15': [1, 1, 1, 15],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type FieldLayout = keyof typeof FIELD_LAYOUTS;

export const OASIS_TYPES = ['wood', 'clay', 'iron', 'crop', 'wood_crop', 'clay_crop', 'iron_crop', 'crop2'] as const;
export type OasisType = (typeof OASIS_TYPES)[number];

export const OASIS_LABEL: Record<OasisType, string> = {
  wood: 'Forest oasis (+25% wood)',
  clay: 'Clay oasis (+25% clay)',
  iron: 'Hill oasis (+25% iron)',
  crop: 'Lake oasis (+25% crop)',
  wood_crop: 'Forest lake oasis (+25% wood, +25% crop)',
  clay_crop: 'Clay lake oasis (+25% clay, +25% crop)',
  iron_crop: 'Hill lake oasis (+25% iron, +25% crop)',
  crop2: 'Fertile oasis (+50% crop)',
};

export type TileKind = 'field' | 'oasis';

export interface TileSpec {
  x: number;
  y: number;
  kind: TileKind;
  layout: FieldLayout | null;
  oasis: OasisType | null;
}

/** Small, fast deterministic PRNG so the same world seed always gives the same map. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoords(x: number, y: number, seed: number): number {
  let h = seed ^ 0x9e3779b9;
  h = Math.imul(h ^ (x + 0x7fff), 0x85ebca6b);
  h = Math.imul(h ^ (y + 0x7fff), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function generateTile(x: number, y: number, seed: number): TileSpec {
  const rnd = mulberry32(hashCoords(x, y, seed));
  const r = rnd();
  if (r < 0.09 && !(x === 0 && y === 0)) {
    const oasis = OASIS_TYPES[Math.floor(rnd() * OASIS_TYPES.length)] ?? 'wood';
    return { x, y, kind: 'oasis', layout: null, oasis };
  }
  const p = rnd();
  let layout: FieldLayout;
  if (p < 0.62) layout = '4-4-4-6';
  else if (p < 0.7) layout = '3-4-5-6';
  else if (p < 0.78) layout = '4-5-3-6';
  else if (p < 0.86) layout = '5-3-4-6';
  else if (p < 0.92) layout = '4-4-3-7';
  else if (p < 0.98) layout = '3-3-3-9';
  else layout = '1-1-1-15';
  return { x, y, kind: 'field', layout, oasis: null };
}

const FIELD_ORDER: FieldId[] = ['woodcutter', 'claypit', 'ironmine', 'cropland'];
const RES_ORDER: ResourceKey[] = ['wood', 'clay', 'iron', 'crop'];

/** Expand a layout into the 18 field types in slot order (interleaved so the list reads nicely). */
export function layoutFields(layout: FieldLayout): FieldId[] {
  const counts: number[] = [...FIELD_LAYOUTS[layout]];
  const out: FieldId[] = [];
  while (out.length < 18) {
    for (let i = 0; i < 4; i++) {
      if ((counts[i] ?? 0) > 0) {
        out.push(FIELD_ORDER[i] ?? 'cropland');
        counts[i] = (counts[i] ?? 0) - 1;
      }
    }
  }
  return out;
}

export function oasisBonus(o: OasisType): Partial<Record<ResourceKey, number>> {
  switch (o) {
    case 'crop2':
      return { crop: 0.5 };
    case 'wood_crop':
      return { wood: 0.25, crop: 0.25 };
    case 'clay_crop':
      return { clay: 0.25, crop: 0.25 };
    case 'iron_crop':
      return { iron: 0.25, crop: 0.25 };
    default:
      return { [o]: 0.25 };
  }
}

export { RES_ORDER };

/** Map size is (2R+1)^2 and wraps around at the edges. */
export function wrapCoord(v: number, radius: number): number {
  const size = radius * 2 + 1;
  return ((((v + radius) % size) + size) % size) - radius;
}

export function distance(ax: number, ay: number, bx: number, by: number, radius: number): number {
  const size = radius * 2 + 1;
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  dx = Math.min(dx, size - dx);
  dy = Math.min(dy, size - dy);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Travel time in ms for a given distance and speed (tiles/hour). */
export function travelTimeMs(dist: number, speedTilesPerHour: number, speedMultiplier: number): number {
  if (speedTilesPerHour <= 0) return Infinity;
  return Math.max(1000, Math.round(((dist / speedTilesPerHour) * 3600 * 1000) / speedMultiplier));
}

/** Tournament Square: beyond 30 fields troops move 10% faster per level. */
export const ARENA_FREE_DISTANCE = 30;

export function travelTimeArenaMs(dist: number, speedTilesPerHour: number, arenaLevel: number, speedMultiplier: number): number {
  if (arenaLevel <= 0 || dist <= ARENA_FREE_DISTANCE) return travelTimeMs(dist, speedTilesPerHour, speedMultiplier);
  if (speedTilesPerHour <= 0) return Infinity;
  const hours = ARENA_FREE_DISTANCE / speedTilesPerHour + (dist - ARENA_FREE_DISTANCE) / (speedTilesPerHour * (1 + 0.1 * arenaLevel));
  return Math.max(1000, Math.round((hours * 3600 * 1000) / speedMultiplier));
}
