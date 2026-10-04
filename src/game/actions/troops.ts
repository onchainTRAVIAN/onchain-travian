import { and, eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { movements, tiles, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS, TOWN_BUILDING_IDS, type BuildingId } from '../rules/buildings.js';
import { distance, travelTimeMs, wrapCoord } from '../rules/map.js';
import { UNIT_SLOTS, isSpecialUnit, slowestSpeed, subUnits, totalUnits, unitDef, type UnitCounts } from '../rules/units.js';
import { assertGame } from '../errors.js';
import { catchUp, levelOf, setTroopsAt, troopsAt } from '../engine/state.js';
import { sendTroopsHome } from '../engine/events.js';
import { ownedVillage } from './build.js';

export type MissionKind = 'attack' | 'raid' | 'reinforce' | 'scout';
export type MovementRow = typeof movements.$inferSelect;

export interface SendInput {
  x: number;
  y: number;
  kind: MissionKind;
  units: UnitCounts;
  catapultTarget?: string | null;
}

export interface SendPreview {
  targetVillageId: number;
  targetName: string;
  targetOwner: string;
  distance: number;
  travelMs: number;
}

/** Validate a mission and compute its travel time without changing anything. */
export function previewSend(db: Q, userId: number, villageId: number, input: SendInput, now: number): SendPreview {
  const home = ownedVillage(db, userId, villageId);
  const me = db.select().from(users).where(eq(users.id, userId)).get();
  assertGame(me, 'Player not found');
  const state = catchUp(db, villageId, now);
  assertGame(state, 'Village not found');
  assertGame(levelOf(state, 'rally') >= 1, 'Build a Rally Point first');

  const x = wrapCoord(input.x, config.MAP_RADIUS);
  const y = wrapCoord(input.y, config.MAP_RADIUS);
  const tile = db.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
  assertGame(tile, 'No such place on the map');
  assertGame(tile.kind === 'field' && tile.villageId !== null, 'There is no village at that location');
  assertGame(tile.villageId !== villageId, 'Your troops are already there');
  const target = db
    .select({ id: villages.id, name: villages.name, userId: villages.userId, username: users.username, protectedUntil: users.protectedUntil })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.id, tile.villageId))
    .get();
  assertGame(target, 'There is no village at that location');

  const units = input.units.slice(0, UNIT_SLOTS).map((n) => Math.max(0, Math.floor(n)));
  assertGame(totalUnits(units) > 0, 'Select at least one unit');
  const home_ = troopsAt(db, villageId, villageId);
  units.forEach((n, i) => assertGame(n <= (home_[i] ?? 0), `Not enough ${unitDef(me.tribe, i).name}`));
  units.forEach((n, i) => assertGame(n === 0 || !isSpecialUnit(unitDef(me.tribe, i)), `${unitDef(me.tribe, i).name} cannot be sent yet`));

  if (input.kind !== 'reinforce') {
    assertGame(target.userId !== userId, 'You cannot attack your own village');
    assertGame(
      target.protectedUntil === null || target.protectedUntil <= now,
      `${target.username ?? 'This player'} is under beginner protection`,
    );
  }
  if (input.kind === 'scout') {
    units.forEach((n, i) => assertGame(n === 0 || unitDef(me.tribe, i).type === 'scout', 'Only scouts can be sent to spy'));
  }
  if (input.catapultTarget) {
    assertGame(
      (TOWN_BUILDING_IDS as readonly string[]).includes(input.catapultTarget),
      'Unknown catapult target',
    );
  }

  const dist = distance(home.x, home.y, x, y, config.MAP_RADIUS);
  const travelMs = travelTimeMs(dist, slowestSpeed(me.tribe, units), config.TROOP_SPEED);
  return {
    targetVillageId: target.id,
    targetName: target.name,
    targetOwner: target.username ?? 'Nature',
    distance: dist,
    travelMs,
  };
}

export function sendTroops(db: DB, userId: number, villageId: number, input: SendInput, now: number): MovementRow {
  return db.transaction((tx) => {
    const preview = previewSend(tx, userId, villageId, input, now);
    const home = ownedVillage(tx, userId, villageId);
    const units = input.units.slice(0, UNIT_SLOTS).map((n) => Math.max(0, Math.floor(n)));
    setTroopsAt(tx, villageId, villageId, subUnits(troopsAt(tx, villageId, villageId), units));

    // Attacking ends your own beginner protection.
    if (input.kind !== 'reinforce') {
      tx.update(users).set({ protectedUntil: now }).where(eq(users.id, userId)).run();
    }
    const target = tx.select().from(villages).where(eq(villages.id, preview.targetVillageId)).get();
    assertGame(target, 'Target not found');
    const catapultTarget =
      input.kind === 'attack' && input.catapultTarget && BUILDINGS[input.catapultTarget as BuildingId] ? input.catapultTarget : null;
    return tx
      .insert(movements)
      .values({
        kind: input.kind,
        fromVillageId: villageId,
        toVillageId: target.id,
        originX: home.x,
        originY: home.y,
        toX: target.x,
        toY: target.y,
        units: JSON.stringify(units),
        catapultTarget,
        departAt: now,
        arriveAt: now + preview.travelMs,
      })
      .returning()
      .get();
  });
}

/** Bring your troops back from a village they are reinforcing. */
export function withdrawTroops(db: DB, userId: number, ownerVillageId: number, locationId: number, now: number): void {
  db.transaction((tx) => {
    ownedVillage(tx, userId, ownerVillageId);
    assertGame(sendTroopsHome(tx, locationId, ownerVillageId, now), 'No troops to withdraw');
  });
}

/** Send reinforcements stationed in your village back to their owner. */
export function sendBackReinforcements(db: DB, userId: number, locationId: number, ownerVillageId: number, now: number): void {
  db.transaction((tx) => {
    ownedVillage(tx, userId, locationId);
    assertGame(sendTroopsHome(tx, locationId, ownerVillageId, now), 'No troops to send back');
  });
}
