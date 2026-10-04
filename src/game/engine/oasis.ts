import { and, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { slots, tiles, villages } from '../../db/schema.js';
import type { OasisType } from '../rules/map.js';
import { initialAnimals, OASIS_RES_CAP, OASIS_RES_CAP_MAX, OASIS_RES_PER_25, regrowAnimals } from '../rules/oasis.js';
import { oasisBonus } from '../rules/map.js';
import { RESOURCE_KEYS, res, type Resources } from '../rules/resources.js';
import { config } from '../../config.js';
import type { UnitCounts } from '../rules/units.js';
import { parseResources, parseUnits } from './state.js';

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

/** Per-hour gain and storage cap of an unoccupied oasis, per resource. */
export function oasisRates(type: OasisType): { rate: Resources; cap: Resources } {
  const bonus = oasisBonus(type);
  const capOne = Math.min(OASIS_RES_CAP * config.WORLD_SPEED, OASIS_RES_CAP_MAX);
  const rate = res();
  const cap = res();
  for (const k of RESOURCE_KEYS) {
    const b = bonus[k] ?? 0;
    if (b > 0) {
      rate[k] = OASIS_RES_PER_25 * (b / 0.25) * config.WORLD_SPEED;
      cap[k] = capOne;
    }
  }
  return { rate, cap };
}

/**
 * Resources lying in an oasis. Unoccupied oases gather the resources of their bonus over time
 * (a fresh oasis starts half full); an oasis held by a village gathers nothing.
 */
export function oasisStock(q: Q, tile: TileRow, now: number): Resources {
  if (tile.kind !== 'oasis' || !tile.oasis) return res();
  const { rate, cap } = oasisRates(tile.oasis as OasisType);
  if (tile.oasisRes === null || tile.oasisResAt === null) {
    const start = res();
    for (const k of RESOURCE_KEYS) start[k] = Math.floor(cap[k] / 2);
    setOasisStock(q, tile.x, tile.y, start, now);
    return start;
  }
  const stock = parseResources(tile.oasisRes);
  if (now <= tile.oasisResAt) return stock;
  if (tile.villageId !== null) {
    // Held oases don't gather; just move the clock so nothing piles up while owned.
    setOasisStock(q, tile.x, tile.y, stock, now);
    return stock;
  }
  const hours = (now - tile.oasisResAt) / 3_600_000;
  const next = res();
  for (const k of RESOURCE_KEYS) next[k] = Math.min(cap[k], stock[k] + rate[k] * hours);
  setOasisStock(q, tile.x, tile.y, next, now);
  return next;
}

export function setOasisStock(q: Q, x: number, y: number, stock: Resources, now: number): void {
  q.update(tiles).set({ oasisRes: JSON.stringify(stock), oasisResAt: now }).where(and(eq(tiles.x, x), eq(tiles.y, y))).run();
}

/**
 * Loyalty of an owned oasis (T3.6): starts at 100 and regrows by the owner's Hero's Mansion level
 * per hour (× world speed).
 */
export function oasisLoyaltyNow(q: Q, tile: TileRow, now: number): number {
  if (tile.villageId === null) return 100;
  const at = tile.oasisLoyaltyAt ?? now;
  const mansion =
    q.select({ l: slots.level }).from(slots).where(and(eq(slots.villageId, tile.villageId), eq(slots.building, 'heromansion'))).get()?.l ?? 0;
  return Math.min(100, tile.oasisLoyalty + ((now - at) / 3_600_000) * mansion * config.WORLD_SPEED);
}

/** Loyalty lost per successful hero attack: ⌊100 / min(3, 4 − owner's oasis count)⌋. */
export function oasisLoyaltyHit(ownerOases: number): number {
  return Math.floor(100 / Math.max(1, Math.min(3, 4 - ownerOases)));
}

export function setOasisLoyalty(q: Q, x: number, y: number, loyalty: number, now: number): void {
  q.update(tiles).set({ oasisLoyalty: loyalty, oasisLoyaltyAt: now }).where(and(eq(tiles.x, x), eq(tiles.y, y))).run();
}
