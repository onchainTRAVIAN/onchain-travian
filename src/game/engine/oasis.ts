import { and, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { tiles, villages } from '../../db/schema.js';
import type { OasisType } from '../rules/map.js';
import { initialAnimals, regrowAnimals } from '../rules/oasis.js';
import type { UnitCounts } from '../rules/units.js';
import { parseUnits } from './state.js';

export type TileRow = typeof tiles.$inferSelect;

export function tileAt(q: Q, x: number, y: number): TileRow | undefined {
  return q.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
}

/** Current wild animals in an oasis (initialised on first look, regrowing while unoccupied). */
export function oasisAnimals(q: Q, tile: TileRow, now: number): UnitCounts {
  if (tile.kind !== 'oasis' || !tile.oasis) return parseUnits(null);
  const type = tile.oasis as OasisType;
  if (tile.animals === null || tile.animalsAt === null) {
    const animals = initialAnimals(type, tile.x, tile.y);
    setOasisAnimals(q, tile.x, tile.y, animals, now);
    return animals;
  }
  let animals = parseUnits(tile.animals);
  if (tile.villageId === null && now > tile.animalsAt) {
    const hours = (now - tile.animalsAt) / 3_600_000;
    const grown = regrowAnimals(type, animals, hours);
    // Only move the clock forward once at least one animal has regrown, so slow regrowth isn't lost to rounding.
    if (grown.some((n, i) => n !== animals[i])) {
      animals = grown;
      setOasisAnimals(q, tile.x, tile.y, animals, now);
    }
  }
  return animals;
}

export function setOasisAnimals(q: Q, x: number, y: number, animals: UnitCounts, now: number): void {
  q.update(tiles).set({ animals: JSON.stringify(animals), animalsAt: now }).where(and(eq(tiles.x, x), eq(tiles.y, y))).run();
}

export function oasesOwnedBy(q: Q, villageId: number): TileRow[] {
  return q.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, villageId))).all();
}

export function oasisOwner(q: Q, tile: TileRow) {
  if (tile.villageId === null) return undefined;
  return q.select().from(villages).where(eq(villages.id, tile.villageId)).get();
}
