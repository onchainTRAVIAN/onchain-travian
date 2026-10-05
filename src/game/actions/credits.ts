import { and, asc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { buildOrders, creditsLedger, messages, perks, researchOrders, tickerMessages, trainOrders, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { RESOURCE_KEYS, sumRes, type Resources } from '../rules/resources.js';
import type { PerkKind } from '../modifiers.js';
import { GameError, assertGame } from '../errors.js';
import { catchUp, capacityFor, setResources, stockOf } from '../engine/state.js';
import { ownedVillage } from './build.js';

/* ---------- Ledger ---------- */

export function creditBalance(q: Q, userId: number): number {
  return q.select({ n: sql<number>`coalesce(sum(${creditsLedger.amount}), 0)` }).from(creditsLedger).where(eq(creditsLedger.userId, userId)).get()?.n ?? 0;
}

/** Add credits once per idempotency key. Returns false if the key was already used. */
export function grantCredits(q: Q, userId: number, amount: number, reason: string, idemKey: string, now: number): boolean {
  assertGame(Number.isInteger(amount) && amount !== 0, 'Invalid amount');
  const r = q.insert(creditsLedger).values({ userId, amount, reason, idemKey, createdAt: now }).onConflictDoNothing().run();
  return r.changes > 0;
}

export function spend(q: Q, userId: number, cost: number, reason: string, now: number): void {
  if (cost <= 0) return;
  const bal = creditBalance(q, userId);
  if (bal < cost) throw new GameError(`This costs ${cost} Gold, you have ${bal}. Buy Gold under Plus & Gold.`);
  q.insert(creditsLedger)
    .values({ userId, amount: -cost, reason, idemKey: `spend:${userId}:${now}:${Math.random().toString(36).slice(2)}`, createdAt: now })
    .run();
}

export function creditHistory(q: Q, userId: number, limit = 30) {
  return q.select().from(creditsLedger).where(eq(creditsLedger.userId, userId)).orderBy(sql`${creditsLedger.id} desc`).limit(limit).all();
}

/* ---------- Instant finish ---------- */

/** Finish-now price: see FINISH_X1_MINUTES_PER_GOLD (scaled by world speed), minimum 2. */
/**
 * "Finish now" price follows the world speed: it is based on how long the remaining work
 * would take on a normal-speed (x1) world — 1 Gold per 100 minutes at x1, at least 2.
 * (At x100 that is 1 Gold per real minute.)
 */
export const FINISH_X1_MINUTES_PER_GOLD = 100;

export function instantPrice(msLeft: number, worldSpeed: number = config.WORLD_SPEED): number {
  const x1Minutes = (Math.max(0, msLeft) * worldSpeed) / 60_000;
  return Math.max(2, Math.ceil(x1Minutes / FINISH_X1_MINUTES_PER_GOLD));
}

/**
 * Work still left on a queued job: a batch waiting behind another one is priced only for its own
 * duration, not for the time it spends waiting.
 */
export function workLeft(startAt: number, endAt: number, now: number): number {
  return Math.max(0, endAt - Math.max(now, startAt));
}

export function finishConstructionNow(db: DB, userId: number, orderId: number, now: number): number {
  return db.transaction((tx) => {
    const o = tx.select().from(buildOrders).where(eq(buildOrders.id, orderId)).get();
    assertGame(o, 'Construction not found');
    ownedVillage(tx, userId, o.villageId);
    assertGame(o.finishAt > now, 'Already finished');
    const price = instantPrice(workLeft(o.startAt, o.finishAt, now));
    spend(tx, userId, price, `Instant construction: ${o.building} level ${o.toLevel}`, now);
    tx.update(buildOrders).set({ finishAt: now }).where(eq(buildOrders.id, orderId)).run();
    return price;
  });
}

/**
 * Finish a training batch now — and every batch queued before it in the same building, since the
 * queue trains in order. The price is the time until this batch would be done (its Duration).
 */
export function finishTrainingNow(db: DB, userId: number, orderId: number, now: number): number {
  return db.transaction((tx) => {
    const o = tx.select().from(trainOrders).where(eq(trainOrders.id, orderId)).get();
    assertGame(o, 'Training not found');
    ownedVillage(tx, userId, o.villageId);
    catchUp(tx, o.villageId, now);
    const fresh = tx.select().from(trainOrders).where(eq(trainOrders.id, orderId)).get();
    assertGame(fresh, 'Already finished');
    const end = fresh.startAt + fresh.total * fresh.perUnitMs;
    const price = instantPrice(end - now);
    spend(tx, userId, price, 'Instant training', now);
    const queue = tx
      .select()
      .from(trainOrders)
      .where(and(eq(trainOrders.villageId, fresh.villageId), eq(trainOrders.building, fresh.building)))
      .orderBy(asc(trainOrders.startAt))
      .all();
    // This batch and everything ahead of it: pretend they started long enough ago to be done.
    for (const q of queue) {
      if (q.startAt > fresh.startAt) continue;
      tx.update(trainOrders).set({ startAt: now - q.total * q.perUnitMs }).where(eq(trainOrders.id, q.id)).run();
    }
    // Batches behind it move up by the time that was skipped.
    const shift = Math.max(0, end - now);
    for (const q of queue) {
      if (q.startAt <= fresh.startAt) continue;
      tx.update(trainOrders).set({ startAt: Math.max(now, q.startAt - shift) }).where(eq(trainOrders.id, q.id)).run();
    }
    catchUp(tx, o.villageId, now);
    return price;
  });
}

export function finishResearchNow(db: DB, userId: number, orderId: number, now: number): number {
  return db.transaction((tx) => {
    const o = tx.select().from(researchOrders).where(eq(researchOrders.id, orderId)).get();
    assertGame(o, 'Research not found');
    ownedVillage(tx, userId, o.villageId);
    const price = instantPrice(o.finishAt - now);
    spend(tx, userId, price, 'Instant research', now);
    tx.update(researchOrders).set({ finishAt: now }).where(eq(researchOrders.id, orderId)).run();
    return price;
  });
}

/* ---------- Boosts ---------- */

export interface Product {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  days: number;
  perk: PerkKind;
  value: number;
}

export const PRODUCTS: Product[] = [
  { id: 'prod_wood', name: '+25% Wood', icon: '🪵', description: 'All your villages produce 25% more wood.', price: 5, days: 7, perk: 'production_wood', value: 0.25 },
  { id: 'prod_clay', name: '+25% Clay', icon: '🧱', description: 'All your villages produce 25% more clay.', price: 5, days: 7, perk: 'production_clay', value: 0.25 },
  { id: 'prod_iron', name: '+25% Iron', icon: '⛓️', description: 'All your villages produce 25% more iron.', price: 5, days: 7, perk: 'production_iron', value: 0.25 },
  { id: 'prod_crop', name: '+25% Crop', icon: '🌾', description: 'All your villages produce 25% more crop.', price: 5, days: 7, perk: 'production_crop', value: 0.25 },
  { id: 'build_queue', name: 'Master Builder', icon: '🏗️', description: 'Build two things at once in every village.', price: 10, days: 7, perk: 'build_queue', value: 1 },
  { id: 'smithy_queue', name: 'Master Trainer', icon: '⚒️', description: 'Two upgrades at once in the Blacksmith and in the Armoury, in every village.', price: 10, days: 7, perk: 'smithy_queue', value: 1 },
  { id: 'train_speed', name: 'Drill Sergeant', icon: '🎯', description: 'Troops train and research 25% faster.', price: 10, days: 3, perk: 'train_speed', value: 0.25 },
  { id: 'attack', name: 'War Banner', icon: '🚩', description: '+10% attack strength for all your troops.', price: 15, days: 3, perk: 'attack', value: 0.1 },
  { id: 'defense', name: 'Stone Walls', icon: '🛡️', description: '+10% defence in all your villages.', price: 15, days: 3, perk: 'defense', value: 0.1 },
];

export function activeBoosts(q: Q, userId: number, now: number) {
  return q
    .select()
    .from(perks)
    .where(and(eq(perks.userId, userId), sql`${perks.source} like 'shop:%'`, gt(perks.expiresAt, now)))
    .all();
}

/** Buy or extend a boost. Buying again while active adds the duration on top. */
export function buyBoost(db: DB, userId: number, productId: string, now: number): Product {
  const p = PRODUCTS.find((x) => x.id === productId);
  assertGame(p, 'Unknown item');
  db.transaction((tx) => {
    spend(tx, userId, p.price, `Boost: ${p.name}`, now);
    const source = `shop:${p.id}`;
    const active = tx.select().from(perks).where(and(eq(perks.userId, userId), eq(perks.source, source), gt(perks.expiresAt, now))).get();
    const ms = p.days * 86_400_000;
    if (active) tx.update(perks).set({ expiresAt: (active.expiresAt ?? now) + ms }).where(eq(perks.id, active.id)).run();
    else tx.insert(perks).values({ userId, kind: p.perk, value: p.value, source, expiresAt: now + ms, createdAt: now }).run();
  });
  return p;
}

/* ---------- NPC merchant ---------- */

export const NPC_TRADE_PRICE = 3;

/**
 * Spread `rest` over the four resources in proportion to `target` (evenly if target is all zero),
 * never above capacity. Returns the new amounts, or null if storage can't hold it all.
 */
export function distributeRest(target: Resources, rest: number, cap: Resources): Resources | null {
  const out = { ...target };
  let left = Math.max(0, Math.floor(rest));
  for (let round = 0; left > 0 && round < 8; round++) {
    const open = RESOURCE_KEYS.filter((k) => out[k] < cap[k]);
    if (open.length === 0) break;
    const weightSum = open.reduce((s, k) => s + (target[k] > 0 ? target[k] : 0), 0);
    let given = 0;
    for (const k of open) {
      const share = weightSum > 0 ? (target[k] > 0 ? target[k] / weightSum : 0) : 1 / open.length;
      const add = Math.min(cap[k] - out[k], Math.floor(left * share));
      out[k] += add;
      given += add;
    }
    left -= given;
    if (given === 0) {
      // Rounding leftovers: one by one into any resource with room.
      for (const k of open) {
        if (left <= 0) break;
        const add = Math.min(cap[k] - out[k], left);
        out[k] += add;
        left -= add;
      }
      if (left > 0 && RESOURCE_KEYS.every((k) => out[k] >= cap[k])) break;
    }
  }
  return left > 0 ? null : out;
}

/**
 * NPC merchant: turn the village's resources into any mix, keeping the exact total, for a fee.
 * Whatever the player doesn't assign (including resources produced since the page was opened)
 * is spread over the requested mix, so nothing is ever lost.
 */
export function npcTrade(db: DB, userId: number, villageId: number, target: Resources, now: number): Resources {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const have = stockOf(state.village);
    const cap = capacityFor(state);
    const total = Math.floor(sumRes(have));
    const clean = { ...target };
    for (const k of RESOURCE_KEYS) {
      assertGame(Number.isFinite(clean[k]) && clean[k] >= 0, 'Invalid amounts');
      clean[k] = Math.floor(clean[k]);
      assertGame(clean[k] <= cap[k], `Your storage only holds ${cap[k]} ${k}`);
    }
    const asked = sumRes(clean);
    assertGame(asked <= total, `You only have ${total} resources to trade (you entered ${asked})`);
    const result = distributeRest(clean, total - asked, cap);
    assertGame(result, 'Not enough storage for all your resources');
    spend(tx, userId, NPC_TRADE_PRICE, 'NPC merchant', now);
    setResources(tx, villageId, result);
    return result;
  });
}

/* ---------- Protection for Gold ---------- */

export const PROTECTION_PRICE = 80;

/** Permanent +50% warehouse and granary for one village (once per village). */
export const STORAGE_BOOST_PRICE = 150;

export function buyStorageBoost(db: DB, userId: number, villageId: number, now: number): void {
  db.transaction((tx) => {
    const v = ownedVillage(tx, userId, villageId);
    assertGame(!v.storageBoost, 'This village already has the storage expansion');
    catchUp(tx, villageId, now);
    spend(tx, userId, STORAGE_BOOST_PRICE, `Storage expansion: ${v.name}`, now);
    tx.update(villages).set({ storageBoost: true }).where(eq(villages.id, villageId)).run();
  });
}
export const PROTECTION_BUY_MS = 24 * 3_600_000;
/** After bought protection ends you stay attackable at least this long before buying again. */
export const PROTECTION_COOLDOWN_MS = 8 * 3_600_000;

export function protectionStatus(q: Q, userId: number, now: number): { protectedUntil: number; canBuyAt: number } {
  const u = q.select({ p: users.protectedUntil, b: users.boughtProtectionEnd }).from(users).where(eq(users.id, userId)).get();
  const protectedUntil = u?.p ?? 0;
  const canBuyAt = Math.max(protectedUntil, (u?.b ?? 0) > 0 ? (u?.b ?? 0) + PROTECTION_COOLDOWN_MS : 0);
  return { protectedUntil, canBuyAt };
}

/** Buy 24 h of protection: only while unprotected, and not within 8 h after the last bought one ended. */
export function buyProtection(db: DB, userId: number, now: number): number {
  return db.transaction((tx) => {
    const st = protectionStatus(tx, userId, now);
    assertGame(st.protectedUntil <= now, 'You are already protected');
    if (st.canBuyAt > now) {
      const mins = Math.ceil((st.canBuyAt - now) / 60_000);
      throw new GameError(`You can buy protection again in ${Math.floor(mins / 60)} h ${mins % 60} min`);
    }
    spend(tx, userId, PROTECTION_PRICE, 'Protection (24 h)', now);
    const until = now + PROTECTION_BUY_MS;
    tx.update(users).set({ protectedUntil: until, boughtProtectionEnd: until }).where(eq(users.id, userId)).run();
    return until;
  });
}

/* ---------- Gold transfers between players ---------- */

export const TRANSFER_MAX = 1_000_000;

/**
 * Send Gold to another player. Both ledger rows are written in one transaction, and the
 * receiver gets an in-game message so they know who sent it.
 */
export function transferGold(
  db: DB,
  fromUserId: number,
  toUsername: string,
  amount: number,
  note: string,
  now: number,
): { toUserId: number; toName: string; balance: number } {
  return db.transaction((tx) => {
    assertGame(Number.isInteger(amount) && amount >= 1, 'Enter a whole amount of at least 1 Gold');
    assertGame(amount <= TRANSFER_MAX, `At most ${TRANSFER_MAX.toLocaleString('en-US')} Gold per transfer`);
    const from = tx.select({ username: users.username }).from(users).where(eq(users.id, fromUserId)).get();
    assertGame(from, 'Player not found');
    const to = tx
      .select({ id: users.id, username: users.username, banned: users.banned })
      .from(users)
      .where(eq(users.usernameLower, toUsername.trim().toLowerCase()))
      .get();
    assertGame(to, `No player called "${toUsername.trim()}"`);
    assertGame(to.id !== fromUserId, 'You cannot send Gold to yourself');
    assertGame(!to.banned, 'That player is banned');
    const bal = creditBalance(tx, fromUserId);
    assertGame(bal >= amount, `You only have ${bal} Gold`);
    const key = `transfer:${fromUserId}:${to.id}:${now}:${Math.random().toString(36).slice(2)}`;
    tx.insert(creditsLedger).values({ userId: fromUserId, amount: -amount, reason: `Sent to ${to.username}`, idemKey: `${key}:out`, createdAt: now }).run();
    tx.insert(creditsLedger).values({ userId: to.id, amount, reason: `From ${from.username}`, idemKey: `${key}:in`, createdAt: now }).run();
    const clean = note.trim().slice(0, 200);
    tx.insert(messages)
      .values({
        fromUserId,
        toUserId: to.id,
        subject: `You received ${amount} Gold`,
        body: `${from.username} sent you ${amount} Gold.${clean ? `\n\n${clean}` : ''}`,
        createdAt: now,
      })
      .run();
    return { toUserId: to.id, toName: to.username, balance: bal - amount };
  });
}

/* ---------- News ticker ---------- */

export const TICKER_MAX_LENGTH = 140;
export const TICKER_MAX_HOURS = 24;
const HOUR = 3_600_000;

export function hourStart(t: number): number {
  return Math.floor(t / HOUR) * HOUR;
}

export function cleanTickerText(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  assertGame(t.length >= 3, 'Write a message (at least 3 characters)');
  assertGame(t.length <= TICKER_MAX_LENGTH, `At most ${TICKER_MAX_LENGTH} characters`);
  assertGame(!/(https?:\/\/|www\.|\.(com|net|org|io|xyz|ru)\b)/i.test(t), 'Links are not allowed in the news ticker');
  return t;
}

/**
 * Post a message to the news ticker: it starts now and runs for the hours paid for. Any number of
 * messages can run at once — they take turns on the ticker.
 */
export function bookTicker(db: DB, userId: number, text: string, hours: number, now: number) {
  const body = cleanTickerText(text);
  assertGame(Number.isInteger(hours) && hours >= 1 && hours <= TICKER_MAX_HOURS, `Choose 1 to ${TICKER_MAX_HOURS} hours`);
  const price = config.TICKER_PRICE_PER_HOUR * hours;
  return db.transaction((tx) => {
    spend(tx, userId, price, `News ticker (${hours} h)`, now);
    return tx.insert(tickerMessages).values({ userId, body, startsAt: now, endsAt: now + hours * HOUR, price, createdAt: now }).returning().get();
  });
}

export function activeTicker(q: Q, now: number) {
  return q
    .select({ id: tickerMessages.id, body: tickerMessages.body, username: users.username, endsAt: tickerMessages.endsAt })
    .from(tickerMessages)
    .leftJoin(users, eq(users.id, tickerMessages.userId))
    .where(and(eq(tickerMessages.status, 'scheduled'), lte(tickerMessages.startsAt, now), gt(tickerMessages.endsAt, now)))
    .orderBy(asc(tickerMessages.startsAt))
    .all();
}

export function myTickerBookings(q: Q, userId: number, now: number) {
  return q
    .select()
    .from(tickerMessages)
    .where(and(eq(tickerMessages.userId, userId), gt(tickerMessages.endsAt, now - 86_400_000)))
    .orderBy(asc(tickerMessages.startsAt))
    .all();
}

/** Admin: take a message down and refund the unused hours. */
export function removeTicker(db: DB, id: number, now: number): void {
  db.transaction((tx) => {
    const m = tx.select().from(tickerMessages).where(eq(tickerMessages.id, id)).get();
    assertGame(m && m.status === 'scheduled', 'Message not found');
    tx.update(tickerMessages).set({ status: 'removed' }).where(eq(tickerMessages.id, id)).run();
    if (m.userId !== null && m.endsAt > now) {
      const total = m.endsAt - m.startsAt;
      const unused = m.endsAt - Math.max(now, m.startsAt);
      const refund = Math.floor((m.price * unused) / Math.max(1, total));
      if (refund > 0) grantCredits(tx, m.userId, refund, 'Ticker message removed (refund)', `ticker-refund:${id}`, now);
    }
  });
}

export function upcomingTicker(q: Q, now: number) {
  return q
    .select({ t: tickerMessages, username: users.username })
    .from(tickerMessages)
    .leftJoin(users, eq(users.id, tickerMessages.userId))
    .where(and(inArray(tickerMessages.status, ['scheduled']), gt(tickerMessages.endsAt, now)))
    .orderBy(asc(tickerMessages.startsAt))
    .limit(100)
    .all();
}

export function starterCredits(q: Q, userId: number, now: number): void {
  if (config.STARTER_CREDITS > 0) grantCredits(q, userId, config.STARTER_CREDITS, 'Welcome gift', `starter:${userId}`, now);
}

