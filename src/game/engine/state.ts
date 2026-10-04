import { and, asc, eq, sql } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { movements, slots, tiles, trainOrders, troops, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import {
  BUILDINGS,
  buildingCulture,
  buildingDef,
  buildingPopulation,
  bonusBuildingPct,
  type BuildingId,
} from '../rules/buildings.js';
import { fieldProduction, storageCapacity, crannyCapacity } from '../rules/production.js';
import { RESOURCE_KEYS, res, type Resources } from '../rules/resources.js';
import { addUnits, emptyUnits, TRIBES, upkeepOf, type TribeId, type UnitCounts } from '../rules/units.js';
import { oasisBonus, type OasisType } from '../rules/map.js';
import { getModifiers, type Modifiers } from '../modifiers.js';
import { loyaltyRegenPerHour } from '../rules/expansion.js';
import { HERO_UPKEEP } from '../rules/hero.js';
import { heroProductionBonus } from './hero.js';
import { heroes, reports } from '../../db/schema.js';

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
  return { village: row.village, userId: row.village.userId, tribe: row.tribe ?? 'romans', slots: s };
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
export function grossProduction(state: VillageState, mods: Modifiers, oasis: Resources = res(), flatBonus = 0): Resources {
  const out = res();
  for (const s of state.slots) {
    if (!s.building) continue;
    const def = BUILDINGS[s.building as BuildingId];
    if (!def?.produces) continue;
    out[def.produces] += fieldProduction(s.level);
  }
  // Sawmill, Brickyard, Iron Foundry, Grain Mill and Bakery: +5% per level.
  const bonus: Resources = res(
    bonusBuildingPct(levelOf(state, 'sawmill')),
    bonusBuildingPct(levelOf(state, 'brickyard')),
    bonusBuildingPct(levelOf(state, 'ironfoundry')),
    bonusBuildingPct(levelOf(state, 'grainmill')) + bonusBuildingPct(levelOf(state, 'bakery')),
  );
  for (const k of RESOURCE_KEYS) out[k] = out[k] * config.WORLD_SPEED * (mods.production[k] + oasis[k] + bonus[k]) + flatBonus;
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

/** Tribe of the player owning a village (troops keep their owner's tribe wherever they are). */
function tribeOfVillage(q: Q, villageId: number): TribeId {
  const r = q.select({ tribe: users.tribe }).from(villages).innerJoin(users, eq(users.id, villages.userId)).where(eq(villages.id, villageId)).get();
  return (r?.tribe ?? 'romans') as TribeId;
}

/**
 * Crop eaten by troops for which this village pays (T3.6): every army stationed here — its own
 * and reinforcements from others — plus its own troops on the move and its own soldiers held
 * in enemy traps. Its troops stationed in other villages are fed by those hosts.
 */
export function fedTroopUpkeep(q: Q, villageId: number, tribe: TribeId): number {
  let total = 0;
  for (const row of q.select({ owner: troops.ownerVillageId, units: troops.units }).from(troops).where(eq(troops.villageId, villageId)).all()) {
    total += upkeepOf(row.owner === villageId ? tribe : tribeOfVillage(q, row.owner), parseUnits(row.units));
  }
  let moving = emptyUnits();
  for (const m of q.select({ units: movements.units }).from(movements).where(eq(movements.fromVillageId, villageId)).all()) {
    moving = addUnits(moving, parseUnits(m.units));
  }
  total += upkeepOf(tribe, moving);
  const key = String(villageId);
  for (const v of q.select({ prisoners: villages.prisoners }).from(villages).where(sql`${villages.prisoners} like ${'%"' + key + '"%'}`).all()) {
    try {
      const p = JSON.parse(v.prisoners) as Record<string, unknown>;
      if (p[key]) total += upkeepOf(tribe, parseUnits(JSON.stringify(p[key])));
    } catch {
      // ignore malformed rows
    }
  }
  return total;
}

function heroUpkeep(q: Q, villageId: number): number {
  const h = q.select({ status: heroes.status }).from(heroes).where(eq(heroes.homeVillageId, villageId)).get();
  return h && h.status !== 'dead' && h.status !== 'reviving' ? HERO_UPKEEP : 0;
}

/**
 * Crop eaten per hour by the population, own troops and the hero. Like Travian speed servers,
 * consumption does NOT scale with world speed (only production, times and culture do).
 */
export function cropUpkeep(q: Q, state: VillageState): number {
  return state.village.pop + fedTroopUpkeep(q, state.village.id, state.tribe) + heroUpkeep(q, state.village.id);
}

export interface Economy {
  gross: Resources;
  upkeep: number;
  net: Resources;
  capacity: Resources;
}

export function economyOf(q: Q, state: VillageState, now: number): Economy {
  const mods = getModifiers(q, state.userId, now);
  const gross = grossProduction(state, mods, oasisBonuses(q, state.village.id), heroProductionBonus(q, state.village.id));
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
    const loyalty = Math.min(
      100,
      state.village.loyalty + hours * loyaltyRegenPerHour(Math.max(levelOf(state, 'residence'), levelOf(state, 'palace'))) * config.WORLD_SPEED,
    );
    q.update(villages).set({ ...next, loyalty, resAt: t }).where(eq(villages.id, villageId)).run();
    state.village = { ...state.village, ...next, loyalty, resAt: t };
    if (next.crop <= 0 && eco.net.crop < 0) starve(q, state, -eco.net.crop, t);
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

/**
 * The granary is empty and the village eats more than it grows: troops at home desert,
 * most crop-hungry first, until upkeep fits production again.
 */
function starve(q: Q, state: VillageState, deficitPerHour: number, t: number): void {
  // T3.6 order: reinforcements from other villages starve first, then the village's own army;
  // within each army the most crop-hungry units go first.
  let toCut = deficitPerHour;
  const rows = q.select().from(troops).where(eq(troops.villageId, state.village.id)).all();
  rows.sort((a, b) => Number(a.ownerVillageId === state.village.id) - Number(b.ownerVillageId === state.village.id));
  for (const row of rows) {
    if (toCut <= 0) break;
    const tribe = row.ownerVillageId === state.village.id ? state.tribe : tribeOfVillage(q, row.ownerVillageId);
    const units = parseUnits(row.units);
    const order = units
      .map((n, i) => ({ i, n, upkeep: TRIBES[tribe].units[i]?.upkeep ?? 1 }))
      .filter((u) => u.n > 0)
      .sort((a, b) => b.upkeep - a.upkeep);
    const lost = emptyUnits();
    for (const u of order) {
      if (toCut <= 0) break;
      const kill = Math.min(u.n, Math.ceil(toCut / u.upkeep));
      lost[u.i] = kill;
      toCut -= kill * u.upkeep;
    }
    if (lost.every((n) => n === 0)) continue;
    setTroopsAt(q, state.village.id, row.ownerVillageId, units.map((n, i) => n - (lost[i] ?? 0)));
    const ownerId = row.ownerVillageId === state.village.id ? state.userId : q.select({ u: villages.userId }).from(villages).where(eq(villages.id, row.ownerVillageId)).get()?.u ?? null;
    if (ownerId !== null) {
      q.insert(reports)
        .values({
          userId: ownerId,
          kind: 'starvation',
          title: `Troops starved in ${state.village.name}`,
          data: JSON.stringify({ type: 'return', villageName: state.village.name, units: lost, tribe, loot: res() }),
          createdAt: t,
        })
        .run();
    }
  }
}

export function parseLevels(json: string | null | undefined): number[] {
  return parseUnits(json);
}

/** Culture points per day for a player across all villages. */
export function culturePerDay(q: Q, userId: number): number {
  const rows = q
    .select({ building: slots.building, level: slots.level })
    .from(slots)
    .innerJoin(villages, eq(villages.id, slots.villageId))
    .where(eq(villages.userId, userId))
    .all();
  let total = 0;
  for (const r of rows) {
    const def = r.building ? buildingDef(r.building) : undefined;
    if (def) total += buildingCulture(def, r.level);
  }
  return total * config.WORLD_SPEED;
}

/** Accrue culture points up to `now`; returns the current total. */
export function catchUpCulture(q: Q, userId: number, now: number): number {
  const u = q.select({ cp: users.culturePoints, at: users.cultureAt }).from(users).where(eq(users.id, userId)).get();
  if (!u) return 0;
  if (now <= u.at) return u.cp;
  const cp = u.cp + (culturePerDay(q, userId) * (now - u.at)) / 86_400_000;
  q.update(users).set({ culturePoints: cp, cultureAt: now }).where(eq(users.id, userId)).run();
  return cp;
}

/** Highest level of a building in a village (reads the slots table directly). */
export function buildingLevelIn(q: Q, villageId: number, id: BuildingId): number {
  const rows = q.select({ level: slots.level }).from(slots).where(and(eq(slots.villageId, villageId), eq(slots.building, id))).all();
  return rows.reduce((m, r) => Math.max(m, r.level), 0);
}
