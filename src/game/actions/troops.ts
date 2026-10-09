import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { heroes, movements, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS, type BuildingId } from '../rules/buildings.js';
import { canAimTwice, catapultTargetAllowed } from '../rules/battle.js';
import { SETTLERS_PER_VILLAGE } from '../rules/expansion.js';
import { distance, travelTimeArenaMs, wrapCoord } from '../rules/map.js';
import { TRIBES, UNIT_SLOTS, subUnits, totalUnits, unitDef, type UnitCounts } from '../rules/units.js';
import { assertGame } from '../errors.js';
import { catchUp, levelOf, loadVillage, setTroopsAt, troopsAt } from '../engine/state.js';
import { groupSpeed, heroSpeedFor, sendTroopsHome } from '../engine/movement.js';
import { artifactValue } from '../engine/artifacts.js';
import { heroAtHome } from '../engine/hero.js';
import { canExpand } from '../engine/expansion.js';
import { oasisOwner, tileAt } from '../engine/oasis.js';
import { ownedVillage } from './build.js';
import { sendOasisTroopsHome } from '../engine/oasisTroops.js';
import { attackBlockedBy } from './alliance.js';

export type MissionKind = 'attack' | 'raid' | 'reinforce' | 'scout' | 'settle';
export type MovementRow = typeof movements.$inferSelect;

export interface SendInput {
  x: number;
  y: number;
  kind: MissionKind;
  units: UnitCounts;
  catapultTarget?: string | null;
  hero?: boolean;
}

export interface SendPreview {
  targetVillageId: number | null;
  targetName: string;
  targetOwner: string;
  targetKind: 'village' | 'oasis' | 'valley';
  /** An oasis held by another player (attacking it ends your own protection). */
  ownedOasis: boolean;
  distance: number;
  travelMs: number;
  x: number;
  y: number;
}

function cleanUnits(units: UnitCounts): UnitCounts {
  return units.slice(0, UNIT_SLOTS).map((n) => Math.max(0, Math.floor(n)));
}

/** Validate a mission and compute its travel time without changing anything. */
export function previewSend(q: Q, userId: number, villageId: number, input: SendInput, now: number): SendPreview {
  const home = ownedVillage(q, userId, villageId);
  const me = q.select().from(users).where(eq(users.id, userId)).get();
  assertGame(me, 'Player not found');
  const state = catchUp(q, villageId, now);
  assertGame(state, 'Village not found');
  assertGame(levelOf(state, 'rally') >= 1, 'Build a Rally Point first');
  // T3.6: a Rally Point handles 5 outgoing troop movements per level.
  const outgoing = q
    .select({ id: movements.id })
    .from(movements)
    .where(and(eq(movements.fromVillageId, villageId), inArray(movements.kind, ['attack', 'raid', 'reinforce', 'scout', 'settle'])))
    .all().length;
  const limit = 5 * levelOf(state, 'rally');
  assertGame(outgoing < limit, `Your Rally Point (level ${levelOf(state, 'rally')}) can handle ${limit} troop movements at a time`);

  const x = wrapCoord(input.x, config.MAP_RADIUS);
  const y = wrapCoord(input.y, config.MAP_RADIUS);
  const tile = tileAt(q, x, y);
  assertGame(tile, 'No such place on the map');
  assertGame(tile.villageId !== villageId || tile.kind === 'oasis', 'Your troops are already there');

  const units = cleanUnits(input.units);
  const atHome = troopsAt(q, villageId, villageId);
  units.forEach((n, i) => assertGame(n <= (atHome[i] ?? 0), `Not enough ${unitDef(me.tribe, i).name}`));

  const withHero = !!input.hero;
  if (withHero) {
    assertGame(input.kind !== 'scout' && input.kind !== 'settle', 'The hero cannot join this mission');
    assertGame(heroAtHome(q, userId, villageId, now), 'Your hero is not available in this village');
  }
  assertGame(totalUnits(units) > 0 || withHero, 'Select at least one unit');

  const settlers = units.reduce((s, n, i) => s + (unitDef(me.tribe, i).type === 'settler' ? n : 0), 0);
  if (input.kind === 'settle') {
    assertGame(tile.kind === 'field' && tile.villageId === null, 'Settlers need an empty valley');
    assertGame(settlers === SETTLERS_PER_VILLAGE && totalUnits(units) === settlers, `Send exactly ${SETTLERS_PER_VILLAGE} settlers and nothing else`);
    const check = canExpand(q, userId, villageId, now);
    assertGame(check.ok, check.reason ?? 'You cannot found another village yet');
  } else {
    assertGame(settlers === 0, 'Settlers can only be sent to found a village');
  }
  if (input.kind === 'scout') {
    units.forEach((n, i) => assertGame(n === 0 || unitDef(me.tribe, i).type === 'scout', 'Only scouts can be sent to spy'));
  }
  if (input.catapultTarget) {
    const homeState = loadVillage(q, villageId);
    const rally = homeState ? levelOf(homeState, 'rally') : 0;
    const wanted = input.catapultTarget.split(',').filter(Boolean);
    assertGame(wanted.length <= 2, 'At most two catapult targets');
    for (const w of wanted) {
      assertGame(w in BUILDINGS, 'Unknown catapult target');
      assertGame(catapultTargetAllowed(w, rally), `Your Rally Point (level ${rally}) cannot aim at ${BUILDINGS[w as BuildingId].name}`);
    }
    const cataSlot = TRIBES[me.tribe].units.findIndex((u) => u.type === 'catapult');
    if (wanted.length === 2) assertGame(canAimTwice(rally, units[cataSlot] ?? 0), 'Two targets need Rally Point level 20 and at least 20 catapults');
  }

  let targetVillageId: number | null = null;
  let ownedOasis = false;
  let targetName: string;
  let targetOwner: string;
  let targetKind: SendPreview['targetKind'];

  if (tile.kind === 'oasis') {
    assertGame(input.kind !== 'settle', 'You cannot settle in an oasis');
    const owner = oasisOwner(q, tile);
    const ownerUser = owner?.userId != null ? q.select({ u: users.username, p: users.protectedUntil }).from(users).where(eq(users.id, owner.userId)).get() : undefined;
    if (input.kind === 'reinforce') {
      // You can garrison an oasis you hold or one held by your alliance (or a pact partner).
      assertGame(owner && owner.userId !== null, 'Only a held oasis can be reinforced');
      assertGame(owner.userId === userId || attackBlockedBy(q, userId, owner.userId) !== null, 'You can only reinforce your own or your allies\' oases');
      assertGame(!input.hero, 'Your hero cannot stay in an oasis');
    } else {
      assertGame(!owner || owner.userId !== userId, 'This oasis is already yours');
      const oasisBlock = owner ? attackBlockedBy(q, userId, owner.userId) : null;
      assertGame(!oasisBlock, oasisBlock ?? '');
      assertGame(!ownerUser || ownerUser.p <= now, `${ownerUser?.u ?? 'This player'} is under beginner protection`);
    }
    ownedOasis = !!owner && owner.userId !== null && owner.userId !== userId;
    targetName = `Oasis (${x}|${y})`;
    targetOwner = owner ? (q.select({ u: users.username }).from(users).where(eq(users.id, owner.userId ?? 0)).get()?.u ?? 'Nature') : 'Nature';
    targetKind = 'oasis';
  } else if (tile.villageId === null) {
    assertGame(input.kind === 'settle', 'There is no village at that location');
    targetName = `Valley (${x}|${y})`;
    targetOwner = '-';
    targetKind = 'valley';
  } else {
    assertGame(input.kind !== 'settle', 'That land is already taken');
    const target = q
      .select({ id: villages.id, name: villages.name, userId: villages.userId, username: users.username, protectedUntil: users.protectedUntil })
      .from(villages)
      .leftJoin(users, eq(users.id, villages.userId))
      .where(eq(villages.id, tile.villageId))
      .get();
    assertGame(target, 'There is no village at that location');
    if (input.kind !== 'reinforce') {
      assertGame(target.userId !== userId, 'You cannot attack your own village');
      assertGame(target.protectedUntil === null || target.protectedUntil <= now, `${target.username ?? 'This player'} is under beginner protection`);
      // Alliance members and allies (confederacy, non-aggression pact) can't be attacked.
      const blocked = attackBlockedBy(q, userId, target.userId);
      assertGame(!blocked, blocked ?? '');
    }
    targetVillageId = target.id;
    targetName = target.name;
    targetOwner = target.username ?? 'Nature';
    targetKind = 'village';
  }

  const dist = distance(home.x, home.y, x, y, config.MAP_RADIUS);
  // Boots of the mercenary (artifact) make troops faster.
  const travelMs = Math.round(
    travelTimeArenaMs(dist, groupSpeed(me.tribe, units, heroSpeedFor(q, userId, withHero, me.tribe)), levelOf(state, 'tournament'), config.TROOP_SPEED) /
      artifactValue(q, villageId, 'boots', now),
  );
  return { targetVillageId, targetName, targetOwner, targetKind, ownedOasis, distance: dist, travelMs, x, y };
}

export function sendTroops(db: DB, userId: number, villageId: number, input: SendInput, now: number): MovementRow {
  return db.transaction((tx) => {
    const preview = previewSend(tx, userId, villageId, input, now);
    const home = ownedVillage(tx, userId, villageId);
    const units = cleanUnits(input.units);
    setTroopsAt(tx, villageId, villageId, subUnits(troopsAt(tx, villageId, villageId), units));
    if (input.kind !== 'reinforce' && input.kind !== 'settle' && (preview.targetKind === 'village' || preview.ownedOasis)) {
      // Attacking another player ends your own protection (beginner or bought); the 8 h wait
      // before buying protection again counts from now.
      tx.update(users)
        .set({ protectedUntil: sql`min(${users.protectedUntil}, ${now})`, boughtProtectionEnd: now })
        .where(eq(users.id, userId))
        .run();
    }
    if (input.hero) tx.update(heroes).set({ status: 'moving', locationId: null }).where(eq(heroes.userId, userId)).run();
    const catapultTarget = input.kind === 'attack' && input.catapultTarget ? input.catapultTarget : null;
    return tx
      .insert(movements)
      .values({
        kind: input.kind,
        fromVillageId: villageId,
        toVillageId: preview.targetVillageId,
        originX: home.x,
        originY: home.y,
        toX: preview.x,
        toY: preview.y,
        units: JSON.stringify(units),
        catapultTarget,
        hero: !!input.hero,
        departAt: now,
        arriveAt: now + preview.travelMs,
      })
      .returning()
      .get();
  });
}

/** Bring your troops back from a village they are reinforcing. */
/** Bring your troops home from an oasis. */
export function withdrawFromOasis(db: DB, userId: number, ownerVillageId: number, x: number, y: number, now: number): void {
  db.transaction((tx) => {
    ownedVillage(tx, userId, ownerVillageId);
    assertGame(sendOasisTroopsHome(tx, x, y, ownerVillageId, now), 'No troops to withdraw');
  });
}

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
