import { and, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { oasisTroops } from '../../db/schema.js';
import { addUnits, emptyUnits, totalUnits, type UnitCounts } from '../rules/units.js';
import { scheduleReturn, villageInfo, type VillageInfo } from './movement.js';
import { parseUnits } from './state.js';

export interface OasisGarrison {
  id: number;
  owner: VillageInfo;
  units: UnitCounts;
}

/** Every army standing in an oasis, with the village it came from. */
export function oasisGarrison(q: Q, x: number, y: number): OasisGarrison[] {
  const out: OasisGarrison[] = [];
  for (const row of q.select().from(oasisTroops).where(and(eq(oasisTroops.x, x), eq(oasisTroops.y, y))).all()) {
    const owner = villageInfo(q, row.ownerVillageId);
    const units = parseUnits(row.units);
    if (!owner || totalUnits(units) <= 0) {
      q.delete(oasisTroops).where(eq(oasisTroops.id, row.id)).run();
      continue;
    }
    out.push({ id: row.id, owner, units });
  }
  return out;
}

export function addOasisTroops(q: Q, x: number, y: number, ownerVillageId: number, add: UnitCounts): void {
  const row = q.select().from(oasisTroops).where(and(eq(oasisTroops.x, x), eq(oasisTroops.y, y), eq(oasisTroops.ownerVillageId, ownerVillageId))).get();
  const units = addUnits(row ? parseUnits(row.units) : emptyUnits(), add);
  if (row) q.update(oasisTroops).set({ units: JSON.stringify(units) }).where(eq(oasisTroops.id, row.id)).run();
  else q.insert(oasisTroops).values({ x, y, ownerVillageId, units: JSON.stringify(units) }).run();
}

export function setOasisTroops(q: Q, id: number, units: UnitCounts): void {
  if (totalUnits(units) <= 0) q.delete(oasisTroops).where(eq(oasisTroops.id, id)).run();
  else q.update(oasisTroops).set({ units: JSON.stringify(units) }).where(eq(oasisTroops.id, id)).run();
}

/** One village's troops leave an oasis for home. Returns false when it had none there. */
export function sendOasisTroopsHome(q: Q, x: number, y: number, ownerVillageId: number, now: number): boolean {
  const row = q.select().from(oasisTroops).where(and(eq(oasisTroops.x, x), eq(oasisTroops.y, y), eq(oasisTroops.ownerVillageId, ownerVillageId))).get();
  const home = villageInfo(q, ownerVillageId);
  if (!row || !home) return false;
  const units = parseUnits(row.units);
  q.delete(oasisTroops).where(eq(oasisTroops.id, row.id)).run();
  if (totalUnits(units) <= 0) return false;
  scheduleReturn(q, home, x, y, units, null, now);
  return true;
}

/** Everyone leaves an oasis (it was captured, released or went wild). */
export function clearOasisGarrison(q: Q, x: number, y: number, now: number, except?: number): void {
  for (const g of oasisGarrison(q, x, y)) if (g.owner.id !== except) sendOasisTroopsHome(q, x, y, g.owner.id, now);
}

/** Troops a village keeps in oases (they eat at home and count as its own). */
export function oasisTroopsOf(q: Q, ownerVillageId: number): { x: number; y: number; units: UnitCounts }[] {
  return q
    .select()
    .from(oasisTroops)
    .where(eq(oasisTroops.ownerVillageId, ownerVillageId))
    .all()
    .map((r) => ({ x: r.x, y: r.y, units: parseUnits(r.units) }));
}
