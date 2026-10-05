import { and, desc, eq, gte, inArray, isNotNull, isNull, like } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { farmEntries, farmLists, movements, reports, tiles, tradeRoutes, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { distance, oasisBonus, type OasisType } from '../rules/map.js';
import { RESOURCE_KEYS, res, sumRes, type Resources } from '../rules/resources.js';
import { emptyUnits, totalUnits, type UnitCounts } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { parseResources, parseUnits, troopsAt, setTroopsAt } from '../engine/state.js';
import { ownedVillage } from './build.js';
import { spend } from './credits.js';
import { sendResources } from './market.js';
import { sendTroops } from './troops.js';
import { oasisStock } from '../engine/oasis.js';

/** Gold Club: bought once per world. */
export const GOLD_CLUB_PRICE = 500;
export const FARM_LISTS_MAX = 10;
export const FARM_ENTRIES_MAX = 100;
/** Furthest distance for "Add all free oases". */
export const FARM_RADIUS_MAX = 35;
export const AUTO_MINUTES = [15, 30, 60, 120] as const;
export const TRADE_ROUTES_MAX = 20;

export function hasGoldClub(q: Q, userId: number): boolean {
  return !!q.select({ g: users.goldClub }).from(users).where(eq(users.id, userId)).get()?.g;
}

function requireClub(q: Q, userId: number): void {
  assertGame(hasGoldClub(q, userId), 'This needs the Gold Club (Plus & Gold)');
}

export function buyGoldClub(db: DB, userId: number, now: number): void {
  db.transaction((tx) => {
    assertGame(!hasGoldClub(tx, userId), 'You are already in the Gold Club');
    spend(tx, userId, GOLD_CLUB_PRICE, 'Gold Club', now);
    tx.update(users).set({ goldClub: true }).where(eq(users.id, userId)).run();
  });
}

/* ---------------- Farm lists ---------------- */

export type FarmList = typeof farmLists.$inferSelect;
export type FarmEntry = typeof farmEntries.$inferSelect;

function ownList(q: Q, userId: number, listId: number): FarmList {
  const l = q.select().from(farmLists).where(and(eq(farmLists.id, listId), eq(farmLists.userId, userId))).get();
  assertGame(l, 'Farm list not found');
  return l;
}

export function createFarmList(db: DB, userId: number, villageId: number, name: string, now: number): number {
  return db.transaction((tx) => {
    requireClub(tx, userId);
    ownedVillage(tx, userId, villageId);
    const n = tx.select({ id: farmLists.id }).from(farmLists).where(eq(farmLists.userId, userId)).all().length;
    assertGame(n < FARM_LISTS_MAX, `At most ${FARM_LISTS_MAX} farm lists`);
    return tx.insert(farmLists).values({ userId, villageId, name: name.trim().slice(0, 30) || 'Farm list', createdAt: now }).returning({ id: farmLists.id }).get().id;
  });
}

export function deleteFarmList(db: DB, userId: number, listId: number): void {
  ownList(db, userId, listId);
  db.delete(farmLists).where(eq(farmLists.id, listId)).run();
}

export function setFarmAuto(db: DB, userId: number, listId: number, minutes: number | null, now: number): void {
  requireClub(db, userId);
  ownList(db, userId, listId);
  assertGame(minutes === null || (AUTO_MINUTES as readonly number[]).includes(minutes), 'Choose 15, 30, 60 or 120 minutes');
  db.update(farmLists).set({ autoMinutes: minutes, lastRunAt: minutes === null ? null : now }).where(eq(farmLists.id, listId)).run();
}

export function addFarmEntry(db: DB, userId: number, listId: number, x: number, y: number, units: UnitCounts): void {
  db.transaction((tx) => {
    requireClub(tx, userId);
    ownList(tx, userId, listId);
    const clean = units.map((n) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));
    assertGame(totalUnits(clean) > 0, 'Choose the troops for this target');
    const tile = tx.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
    assertGame(tile, 'No such place on the map');
    assertGame(tile.kind === 'oasis' || tile.villageId !== null, 'There is no village or oasis there');
    const n = tx.select({ id: farmEntries.id }).from(farmEntries).where(eq(farmEntries.listId, listId)).all().length;
    assertGame(n < FARM_ENTRIES_MAX, `At most ${FARM_ENTRIES_MAX} targets per list`);
    tx.insert(farmEntries).values({ listId, x, y, units: JSON.stringify(clean) }).run();
  });
}

/** Add every unoccupied oasis within `radius` fields of the list's village that isn't on the list yet. */
export function addNearbyOases(db: DB, userId: number, listId: number, radius: number, units: UnitCounts, minRes = 0, now = 0): number {
  return db.transaction((tx) => {
    requireClub(tx, userId);
    const list = ownList(tx, userId, listId);
    const home = tx.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, list.villageId)).get();
    assertGame(home, 'Village not found');
    assertGame(Number.isInteger(radius) && radius >= 1 && radius <= FARM_RADIUS_MAX, `Choose a distance from 1 to ${FARM_RADIUS_MAX} fields`);
    const clean = units.map((n) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));
    assertGame(totalUnits(clean) > 0, 'Choose the troops for each oasis');
    const have = new Set(tx.select({ x: farmEntries.x, y: farmEntries.y }).from(farmEntries).where(eq(farmEntries.listId, listId)).all().map((e) => `${e.x}|${e.y}`));
    const R = config.MAP_RADIUS;
    const free = tx
      .select()
      .from(tiles)
      .where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId)))
      .all()
      .map((o) => ({ ...o, d: distance(home.x, home.y, o.x, o.y, R) }))
      .filter((o) => o.d <= radius && !have.has(`${o.x}|${o.y}`))
      .filter((o) => minRes <= 0 || sumRes(oasisStock(tx, o, now)) >= minRes)
      .sort((a, b) => a.d - b.d)
      .slice(0, FARM_ENTRIES_MAX - have.size);
    for (const o of free) tx.insert(farmEntries).values({ listId, x: o.x, y: o.y, units: JSON.stringify(clean) }).run();
    return free.length;
  });
}

/** Drop every oasis target of a list that holds fewer than `minRes` resources right now. */
export function removeLowOases(db: DB, userId: number, listId: number, minRes: number, now: number): number {
  return db.transaction((tx) => {
    requireClub(tx, userId);
    ownList(tx, userId, listId);
    assertGame(Number.isFinite(minRes) && minRes > 0, 'Enter how many resources an oasis must have');
    let n = 0;
    for (const e of tx.select().from(farmEntries).where(eq(farmEntries.listId, listId)).all()) {
      const t = tx.select().from(tiles).where(and(eq(tiles.x, e.x), eq(tiles.y, e.y))).get();
      if (!t || t.kind !== 'oasis') continue;
      if (sumRes(oasisStock(tx, t, now)) < minRes) {
        tx.delete(farmEntries).where(eq(farmEntries.id, e.id)).run();
        n++;
      }
    }
    return n;
  });
}

export function removeFarmEntry(db: DB, userId: number, entryId: number): void {
  const e = db.select().from(farmEntries).where(eq(farmEntries.id, entryId)).get();
  assertGame(e, 'Target not found');
  ownList(db, userId, e.listId);
  db.delete(farmEntries).where(eq(farmEntries.id, entryId)).run();
}

/**
 * Raid every target of a list (or the chosen ones) from the list's village. Each raid goes through
 * the normal send rules (troops at home, protection, Rally Point limit…); targets that can't be
 * raided right now are skipped with the reason noted.
 */
export function raidFarmList(db: DB, userId: number, listId: number, now: number, only?: number[]): { sent: number; skipped: number } {
  requireClub(db, userId);
  const list = ownList(db, userId, listId);
  const entries = db.select().from(farmEntries).where(eq(farmEntries.listId, listId)).all().filter((e) => !only || only.includes(e.id));
  let sent = 0;
  let skipped = 0;
  for (const e of entries) {
    try {
      sendTroops(db, userId, list.villageId, { x: e.x, y: e.y, kind: 'raid', units: parseUnits(e.units) }, now);
      db.update(farmEntries).set({ lastSentAt: now, lastNote: null }).where(eq(farmEntries.id, e.id)).run();
      sent++;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      db.update(farmEntries).set({ lastNote: err.message }).where(eq(farmEntries.id, e.id)).run();
      skipped++;
    }
  }
  db.update(farmLists).set({ lastRunAt: now }).where(eq(farmLists.id, listId)).run();
  return { sent, skipped };
}

/** Outcome of the last raid on a target, read from the player's reports. */
export function lastRaidResult(q: Q, userId: number, e: FarmEntry): { result: 'won' | 'losses' | 'lost'; loot: number } | null {
  if (!e.lastSentAt) return null;
  const r = q
    .select({ data: reports.data, kind: reports.kind })
    .from(reports)
    .where(and(eq(reports.userId, userId), gte(reports.createdAt, e.lastSentAt), like(reports.data, `%"x":${e.x},"y":${e.y},%`), inArray(reports.kind, ['attack_won', 'attack_lost'])))
    .orderBy(desc(reports.createdAt))
    .get();
  if (!r) return null;
  try {
    const d = JSON.parse(r.data) as { attackerWon?: boolean; attacker?: { losses?: number[] }; loot?: Resources };
    const lost = (d.attacker?.losses ?? []).reduce((a, b) => a + b, 0);
    const loot = d.loot ? Math.floor(sumRes(d.loot)) : 0;
    return { result: !d.attackerWon ? 'lost' : lost > 0 ? 'losses' : 'won', loot };
  } catch {
    return null;
  }
}

/** Server tick: lists with auto-repeat whose interval has passed raid again. */
export function processFarmLists(db: DB, now: number): number {
  let runs = 0;
  const lists = db.select().from(farmLists).where(isNotNull(farmLists.autoMinutes)).all();
  for (const l of lists) {
    if (!l.autoMinutes || (l.lastRunAt !== null && now - l.lastRunAt < l.autoMinutes * 60_000)) continue;
    if (!hasGoldClub(db, l.userId)) continue;
    raidFarmList(db, l.userId, l.id, now);
    runs++;
  }
  return runs;
}

/* ---------------- Evasion ---------------- */

export function setEvasion(db: DB, userId: number, villageId: number, on: boolean): void {
  requireClub(db, userId);
  const v = ownedVillage(db, userId, villageId);
  assertGame(v.isCapital, 'Evasion works in your capital only');
  db.update(villages).set({ evade: on }).where(eq(villages.id, villageId)).run();
}

/** Real time evading troops stay away before walking back. */
export const EVADE_MS = Math.max(60_000, Math.round((30 * 60_000) / config.WORLD_SPEED));

/**
 * Called just before a hostile attack or raid lands on a village: with evasion on, the village's
 * own troops at home slip away and come back a little later (reinforcements and the hero stay).
 */
export function evadeBeforeAttack(q: Q, villageId: number, t: number): UnitCounts | null {
  const v = q.select({ evade: villages.evade, userId: villages.userId, isCapital: villages.isCapital, x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, villageId)).get();
  if (!v?.evade || !v.isCapital || v.userId === null || !hasGoldClub(q, v.userId)) return null;
  const home = troopsAt(q, villageId, villageId);
  if (totalUnits(home) <= 0) return null;
  setTroopsAt(q, villageId, villageId, emptyUnits());
  q.insert(movements)
    .values({ kind: 'return', fromVillageId: villageId, toVillageId: villageId, originX: v.x, originY: v.y, toX: v.x, toY: v.y, units: JSON.stringify(home), departAt: t, arriveAt: t + EVADE_MS })
    .run();
  return home;
}

/* ---------------- Trade routes ---------------- */

export type TradeRoute = typeof tradeRoutes.$inferSelect;

export function createTradeRoute(db: DB, userId: number, fromVillageId: number, toVillageId: number, goods: Resources, hour: number, perDay: number, now: number): void {
  db.transaction((tx) => {
    requireClub(tx, userId);
    ownedVillage(tx, userId, fromVillageId);
    ownedVillage(tx, userId, toVillageId);
    assertGame(fromVillageId !== toVillageId, 'Choose another of your villages');
    assertGame(Number.isInteger(hour) && hour >= 0 && hour <= 23, 'Choose an hour 0–23');
    assertGame([1, 2, 3].includes(perDay), 'Choose 1, 2 or 3 deliveries a day');
    const clean = res(...(RESOURCE_KEYS.map((k) => Math.max(0, Math.floor(goods[k] || 0))) as [number, number, number, number]));
    assertGame(sumRes(clean) > 0, 'Choose what to deliver');
    const n = tx.select({ id: tradeRoutes.id }).from(tradeRoutes).where(eq(tradeRoutes.userId, userId)).all().length;
    assertGame(n < TRADE_ROUTES_MAX, `At most ${TRADE_ROUTES_MAX} trade routes`);
    tx.insert(tradeRoutes).values({ userId, fromVillageId, toVillageId, goods: JSON.stringify(clean), hour, perDay, lastRunAt: now, createdAt: now }).run();
  });
}

export function deleteTradeRoute(db: DB, userId: number, id: number): void {
  const r = db.delete(tradeRoutes).where(and(eq(tradeRoutes.id, id), eq(tradeRoutes.userId, userId))).run();
  assertGame(r.changes > 0, 'Trade route not found');
}

/** Latest scheduled delivery time at or before `now` (UTC hours, evenly spaced). */
export function lastDueAt(r: Pick<TradeRoute, 'hour' | 'perDay'>, now: number): number {
  const day = Math.floor(now / 86_400_000) * 86_400_000;
  let best = -Infinity;
  for (const d of [day - 86_400_000, day]) {
    for (let k = 0; k < r.perDay; k++) {
      const at = d + ((r.hour + (k * 24) / r.perDay) % 24) * 3_600_000;
      if (at <= now && at > best) best = at;
    }
  }
  return best;
}

/** Server tick: dispatch trade routes whose time has come. */
export function processTradeRoutes(db: DB, now: number): number {
  let runs = 0;
  for (const r of db.select().from(tradeRoutes).where(eq(tradeRoutes.active, true)).all()) {
    const due = lastDueAt(r, now);
    if (r.lastRunAt !== null && r.lastRunAt >= due) continue;
    let note: string | null = null;
    try {
      if (!hasGoldClub(db, r.userId)) throw new GameError('Gold Club needed');
      const to = db.select({ x: villages.x, y: villages.y, userId: villages.userId }).from(villages).where(eq(villages.id, r.toVillageId)).get();
      if (!to || to.userId !== r.userId) throw new GameError('The destination is no longer yours');
      sendResources(db, r.userId, r.fromVillageId, to.x, to.y, parseResources(r.goods), now);
      runs++;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      note = err.message;
    }
    db.update(tradeRoutes).set({ lastRunAt: now, lastNote: note }).where(eq(tradeRoutes.id, r.id)).run();
  }
  return runs;
}

/* ---------------- Cropper finder ---------------- */

export interface Cropper {
  x: number;
  y: number;
  layout: string;
  distance: number;
  /** Best crop bonus from up to three oases within 3 fields (e.g. 1.5 = +150%). */
  oasisCrop: number;
  owner: string | null;
}

export function findCroppers(q: Q, fromX: number, fromY: number, radius: number): Cropper[] {
  const R = config.MAP_RADIUS;
  const rows = q
    .select({ x: tiles.x, y: tiles.y, layout: tiles.layout, owner: users.username })
    .from(tiles)
    .leftJoin(villages, eq(villages.id, tiles.villageId))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(and(eq(tiles.kind, 'field'), inArray(tiles.layout, ['3-3-3-9', '1-1-1-15'])))
    .all();
  const oases = q.select({ x: tiles.x, y: tiles.y, oasis: tiles.oasis }).from(tiles).where(eq(tiles.kind, 'oasis')).all();
  const out: Cropper[] = [];
  for (const r of rows) {
    const dist = distance(fromX, fromY, r.x, r.y, R);
    if (dist > radius) continue;
    const near = oases
      .filter((o) => Math.abs(o.x - r.x) <= 3 && Math.abs(o.y - r.y) <= 3 && o.oasis)
      .map((o) => oasisBonus(o.oasis as OasisType).crop ?? 0)
      .sort((a, b) => b - a)
      .slice(0, 3);
    out.push({ x: r.x, y: r.y, layout: r.layout ?? '', distance: dist, oasisCrop: near.reduce((a, b) => a + b, 0), owner: r.owner });
  }
  return out.sort((a, b) => a.distance - b.distance).slice(0, 100);
}

