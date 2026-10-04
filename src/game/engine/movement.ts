import { and, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { heroes, movements, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { HERO_SPEED } from '../rules/hero.js';
import { distance, travelTimeMs } from '../rules/map.js';
import { sumRes, type Resources } from '../rules/resources.js';
import { emptyUnits, slowestSpeed, totalUnits, type TribeId, type UnitCounts } from '../rules/units.js';
import { catchUp, parseLevels, setTroopsAt, troopsAt } from './state.js';

export interface VillageInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  userId: number | null;
  username: string;
  tribe: TribeId;
  isCapital: boolean;
  smithy: number[];
}

export function villageInfo(q: Q, villageId: number): VillageInfo | undefined {
  const row = q
    .select({ v: villages, username: users.username, tribe: users.tribe })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.id, villageId))
    .get();
  if (!row) return undefined;
  return {
    id: row.v.id,
    name: row.v.name,
    x: row.v.x,
    y: row.v.y,
    userId: row.v.userId,
    username: row.username ?? 'Nature',
    tribe: row.tribe ?? 'legion',
    isCapital: row.v.isCapital,
    smithy: parseLevels(row.v.smithy),
  };
}

/** Group speed: slowest unit, and the hero if it rides along. */
export function groupSpeed(tribe: TribeId, units: UnitCounts, withHero: boolean): number {
  const unitSpeed = totalUnits(units) > 0 ? slowestSpeed(tribe, units) : Infinity;
  const speed = Math.min(unitSpeed, withHero ? HERO_SPEED : Infinity);
  return Number.isFinite(speed) ? speed : HERO_SPEED;
}

/** Send survivors (and the hero) home from (fromX, fromY), carrying loot. */
export function scheduleReturn(
  q: Q,
  home: VillageInfo,
  fromX: number,
  fromY: number,
  units: UnitCounts,
  loot: Resources | null,
  t: number,
  withHero = false,
): void {
  if (totalUnits(units) <= 0 && !withHero) return;
  const dist = distance(fromX, fromY, home.x, home.y, config.MAP_RADIUS);
  const travel = travelTimeMs(dist, groupSpeed(home.tribe, units, withHero), config.TROOP_SPEED);
  q.insert(movements)
    .values({
      kind: 'return',
      fromVillageId: home.id,
      toVillageId: home.id,
      originX: fromX,
      originY: fromY,
      toX: home.x,
      toY: home.y,
      units: JSON.stringify(units),
      loot: loot && sumRes(loot) > 0 ? JSON.stringify(loot) : null,
      hero: withHero,
      departAt: t,
      arriveAt: t + travel,
    })
    .run();
  if (withHero && home.userId !== null) {
    q.update(heroes).set({ status: 'moving', locationId: null }).where(eq(heroes.userId, home.userId)).run();
  }
}

/** Withdraw troops (and a hero) stationed in `locationId` back to their home village. */
export function sendTroopsHome(q: Q, locationId: number, ownerVillageId: number, now: number): boolean {
  if (locationId === ownerVillageId) return false;
  const units = troopsAt(q, locationId, ownerVillageId);
  const home = villageInfo(q, ownerVillageId);
  const loc = villageInfo(q, locationId);
  if (!home || !loc) return false;
  const hero =
    home.userId !== null
      ? q
          .select()
          .from(heroes)
          .where(and(eq(heroes.userId, home.userId), eq(heroes.locationId, locationId), eq(heroes.status, 'away')))
          .get()
      : undefined;
  if (totalUnits(units) === 0 && !hero) return false;
  catchUp(q, locationId, now);
  setTroopsAt(q, locationId, ownerVillageId, emptyUnits());
  scheduleReturn(q, home, loc.x, loc.y, units, null, now, !!hero);
  return true;
}
