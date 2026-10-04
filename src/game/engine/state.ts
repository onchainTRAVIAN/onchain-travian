import { and, asc, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { movements, slots, tiles, trainOrders, troops, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import {
  BUILDINGS,
  buildingDef,
  buildingPopulation,
  type BuildingId,
} from '../rules/buildings.js';
import { fieldProduction, storageCapacity, crannyCapacity } from '../rules/production.js';
import { RESOURCE_KEYS, res, type Resources } from '../rules/resources.js';
import { addUnits, emptyUnits, TRIBES, upkeepOf, type TribeId, type UnitCounts } from '../rules/units.js';
import { oasisBonus, type OasisType } from '../rules/map.js';
import { getModifiers, type Modifiers } from '../modifiers.js';

export type VillageRow = typeof villages.$inferSelect;
export type SlotRow = typeof slots.$inferSelect;

export interface VillageState {
  village: VillageRow;
  userId: number | null;
  tribe: TribeId;
  slots: SlotRow[];
}

export function parseUnits(json: string | null | undefined): UnitCounts {
  if (!json) return emptyUnits();
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      const out = emptyUnits();
      parsed.forEach((v, i) => {
        if (i < out.length && typeof v === 'number' && Number.isFinite(v)) out[i] = Math.max(0, Math.floor(v));
      });
      return out;
    }
  } catch {
    // fall through
  }
  return emptyUnits();
}

export function parseResources(json: string | null | undefined): Resources {
  if (!json) return res();
  try {
    const p: unknown = JSON.parse(json);
    if (p && typeof p === 'object') {
      const o = p as Record<string, unknown>;
      const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
      return res(n(o.wood), n(o.clay), n(o.iron), n(o.crop));
    }
  } catch {
    // fall through
  }
  return res();
}

export function loadVillage(q: Q, villageId: number): VillageState | undefined {
  const row = q
    .select({ village: villages, tribe: users.tribe })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.id, villageId))
    .get();
  if (!row) return undefined;
  const s = q.select().from(slots).where(eq(slots.villageId, villageId)).orderBy(asc(slots.slot)).all();
  return { village: row.village, userId: row.village.userId, tribe: row.tribe ?? 'legion', slots: s };
}

export function levelOf(state: Pick<VillageState, 'slots'>, id: BuildingId): number {
  let max = 0;
  for (const s of state.slots) if (s.building === id && s.level > max) max = s.level;
  return max;
}

export function storageOf(state: Pick<VillageState, 'slots'>): { warehouse: number; granary: number } {
  let warehouse = 0;
  let granary = 0;
  let hasW = false;
  let hasG = false;
  for (const s of state.slots) {
    if (s.building === 'warehouse' && s.level > 0) {
      warehouse += storageCapacity(s.level);
      hasW = true;
    }
    if (s.building === 'granary' && s.level > 0) {
      granary += storageCapacity(s.level);
      hasG = true;
    }
  }
  return { warehouse: hasW ? warehouse : storageCapacity(0), granary: hasG ? granary : storageCapacity(0) };
}

export function capacityFor(state: Pick<VillageState, 'slots'>): Resources {
  const { warehouse, granary } = storageOf(state);
  return res(warehouse, warehouse, warehouse, granary);
}

/** Amount of each resource a cranny keeps safe from raiders. */
export function hiddenByCranny(state: VillageState, attackerTribe: TribeId): number {
  let total = 0;
  for (const s of state.slots) if (s.building === 'cranny') total += crannyCapacity(s.level);
  return Math.floor(total * TRIBES[state.tribe].crannyMultiplier * TRIBES[attackerTribe].enemyCrannyFactor);
}

export function populationOf(state: Pick<VillageState, 'slots'>): number {
  let pop = 0;
  for (const s of state.slots) {
    const def = s.building ? buildingDef(s.building) : undefined;
    if (def) pop += buildingPopulation(def, s.level);
  }
  return pop;
}

/** Oasis bonuses attached to this village (oases owned are linked via tiles.villageId on oasis tiles). */
export function oasisBonuses(q: Q, villageId: number): Resources {
  const owned = q
    .select({ oasis: tiles.oasis })
    .from(tiles)
    .where(and(eq(tiles.villageId, villageId), eq(tiles.kind, 'oasis')))
    .all();
  const total = res();
  for (const o of owned) {
    if (!o.oasis) continue;
    const b = oasisBonus(o.oasis as OasisType);
    for (const k of RESOURCE_KEYS) total[k] += b[k] ?? 0;
  }
  return total;
}

/** Gross production per hour (before crop upkeep), including world speed and modifiers. */
export function grossProduction(state: VillageState, mods: Modifiers, oasis: Resources = res()): Resources {
  const out = res();
  for (const s of state.slots) {
    if (!s.building) continue;
    const def = BUILDINGS[s.building as BuildingId];
    if (!def?.produces) continue;
    out[def.produces] += fieldProduction(s.level);
  }
  for (const k of RESOURCE_KEYS) out[k] = out[k] * config.WORLD_SPEED * (mods.production[k] + oasis[k]);
  return out;
}

/** All troops this village pays for: at home, reinforcing elsewhere, and on the move. */
export function ownedTroopTotals(q: Q, villageId: number): UnitCounts {
  let total = emptyUnits();
  for (const t of q.select({ units: troops.units }).from(troops).where(eq(troops.ownerVillageId, villageId)).all()) {
    total = addUnits(total, parseUnits(t.units));
  }
  for (const m of q.select({ units: movements.units }).from(movements).where(eq(movements.fromVillageId, villageId)).all()) {
    total = addUnits(total, parseUnits(m.units));
  }
  return total;
}

export function cropUpkeep(q: Q, state: VillageState): number {
  return (state.village.pop + upkeepOf(state.tribe, ownedTroopTotals(q, state.village.id))) * config.WORLD_SPEED;
}

export interface Economy {
  gross: Resources;
  upkeep: number;
  net: Resources;
  capacity: Resources;
}

export function economyOf(q: Q, state: VillageState, now: number): Economy {
  const mods = getModifiers(q, state.userId, now);
  const gross = grossProduction(state, mods, oasisBonuses(q, state.village.id));
  const upkeep = cropUpkeep(q, state);
  const net = { ...gross, crop: gross.crop - upkeep };
  return { gross, upkeep, net, capacity: capacityFor(state) };
}

export function stockOf(v: VillageRow): Resources {
  return res(v.wood, v.clay, v.iron, v.crop);
}

/** Pure: resources after `hours` given net production and capacity. */
export function accrue(stock: Resources, net: Resources, capacity: Resources, hours: number): Resources {
  const out = res();
  for (const k of RESOURCE_KEYS) {
    if (net[k] >= 0) {
      // Production stops at capacity; anything already above it (e.g. loot) is kept.
      out[k] = stock[k] >= capacity[k] ? stock[k] : Math.min(capacity[k], stock[k] + net[k] * hours);
    } else {
      out[k] = Math.max(0, stock[k] + net[k] * hours);
    }
  }
  return out;
}

/** Add troops to a location row (creating it if needed). */
export function addTroopsAt(q: Q, locationId: number, ownerId: number, add: UnitCounts): void {
  const row = q
    .select()
    .from(troops)
    .where(and(eq(troops.villageId, locationId), eq(troops.ownerVillageId, ownerId)))
    .get();
  if (row) {
    const next = addUnits(parseUnits(row.units), add);
    q.update(troops).set({ units: JSON.stringify(next) }).where(eq(troops.id, row.id)).run();
  } else {
    q.insert(troops).values({ villageId: locationId, ownerVillageId: ownerId, units: JSON.stringify(add) }).run();
  }
}

/** Overwrite a troops row; removes it when empty (home rows are kept). */
export function setTroopsAt(q: Q, locationId: number, ownerId: number, units: UnitCounts): void {
  const row = q
    .select()
    .from(troops)
    .where(and(eq(troops.villageId, locationId), eq(troops.ownerVillageId, ownerId)))
    .get();
  const empty = units.every((n) => n <= 0);
  if (row) {
    if (empty && locationId !== ownerId) q.delete(troops).where(eq(troops.id, row.id)).run();
    else q.update(troops).set({ units: JSON.stringify(units) }).where(eq(troops.id, row.id)).run();
  } else if (!empty) {
    q.insert(troops).values({ villageId: locationId, ownerVillageId: ownerId, units: JSON.stringify(units) }).run();
  }
}

export function troopsAt(q: Q, locationId: number, ownerId: number): UnitCounts {
  const row = q
    .select({ units: troops.units })
    .from(troops)
    .where(and(eq(troops.villageId, locationId), eq(troops.ownerVillageId, ownerId)))
    .get();
  return parseUnits(row?.units);
}

/** Complete troop training up to time t. */
function catchUpTraining(q: Q, villageId: number, t: number): void {
  const orders = q
    .select()
    .from(trainOrders)
    .where(eq(trainOrders.villageId, villageId))
    .orderBy(asc(trainOrders.startAt), asc(trainOrders.id))
    .all();
  for (const o of orders) {
    if (t <= o.startAt) continue;
    const finished = Math.min(o.total, Math.floor((t - o.startAt) / o.perUnitMs));
    const delta = finished - o.done;
    if (delta <= 0) continue;
    const add = emptyUnits();
    add[o.unitSlot] = delta;
    addTroopsAt(q, villageId, villageId, add);
    if (finished >= o.total) q.delete(trainOrders).where(eq(trainOrders.id, o.id)).run();
    else q.update(trainOrders).set({ done: finished }).where(eq(trainOrders.id, o.id)).run();
  }
}

/**
 * Bring a village up to time `t`: accrue resources, finish trained troops.
 * Must run inside a transaction together with whatever changes the village next.
 */
export function catchUp(q: Q, villageId: number, t: number): VillageState | undefined {
  const state = loadVillage(q, villageId);
  if (!state) return undefined;
  if (t > state.village.resAt) {
    const eco = economyOf(q, state, t);
    const hours = (t - state.village.resAt) / 3_600_000;
    const next = accrue(stockOf(state.village), eco.net, eco.capacity, hours);
    q.update(villages).set({ ...next, resAt: t }).where(eq(villages.id, villageId)).run();
    state.village = { ...state.village, ...next, resAt: t };
  }
  catchUpTraining(q, villageId, t);
  return state;
}

export function setResources(q: Q, villageId: number, r: Resources): void {
  q.update(villages).set({ wood: r.wood, clay: r.clay, iron: r.iron, crop: r.crop }).where(eq(villages.id, villageId)).run();
}

export function refreshPopulation(q: Q, villageId: number): number {
  const s = q.select().from(slots).where(eq(slots.villageId, villageId)).all();
  const pop = populationOf({ slots: s });
  q.update(villages).set({ pop }).where(eq(villages.id, villageId)).run();
  return pop;
}
