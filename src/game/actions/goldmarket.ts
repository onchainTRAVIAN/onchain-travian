import { and, desc, eq, ne, or } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { creditsLedger, marketListings, messages, movements, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { RESOURCE_KEYS, res, sumRes, type Resources } from '../rules/resources.js';
import { emptyUnits, slowestSpeed, totalUnits, TRIBES, type TribeId, type UnitCounts } from '../rules/units.js';
import { distance, travelTimeMs } from '../rules/map.js';
import { catchUp, capacityFor, parseResources, parseUnits, setResources, setTroopsAt, stockOf, troopsAt, addTroopsAt } from '../engine/state.js';
import { addReport } from '../engine/reports.js';
import { assertGame } from '../errors.js';
import { ownedVillage } from './build.js';
import { creditBalance } from './credits.js';

export const LISTING_MAX_OPEN = 20;
/** Goods of a cancelled listing need this long (real time) to get back home. */
export const CANCEL_RETURN_MS = Math.max(10 * 60_000, Math.round((2 * 3_600_000) / config.WORLD_SPEED));
export const LISTING_MAX_PRICE = 1_000_000;
export const LISTING_MIN_RESOURCES = 100;
/** Settlers (slot 9) and chiefs (slot 8) can't be sold. */
export const SELLABLE_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type ListingRow = typeof marketListings.$inferSelect;

const fmtInt = (n: number) => Math.floor(n).toLocaleString('en-US');

/** Resources on sale from a village (open listings). */
export function listedResources(q: Q, villageId: number): Resources {
  const out = res();
  for (const l of q.select({ goods: marketListings.goods }).from(marketListings).where(and(eq(marketListings.villageId, villageId), eq(marketListings.status, 'open'), eq(marketListings.kind, 'resources'))).all()) {
    const g = parseResources(l.goods);
    for (const k of RESOURCE_KEYS) out[k] += g[k];
  }
  return out;
}

/** Troops on sale from a village: they still eat its crop. */
export function listedTroops(q: Q, villageId: number): UnitCounts {
  let out = emptyUnits();
  for (const l of q.select({ units: marketListings.units }).from(marketListings).where(and(eq(marketListings.villageId, villageId), eq(marketListings.status, 'open'), eq(marketListings.kind, 'troops'))).all()) {
    const u = parseUnits(l.units);
    out = out.map((n, i) => n + (u[i] ?? 0));
  }
  return out;
}

function assertPrice(price: number): void {
  assertGame(Number.isInteger(price) && price >= 1, 'Set a price of at least 1 Gold');
  assertGame(price <= LISTING_MAX_PRICE, `The price can be at most ${LISTING_MAX_PRICE.toLocaleString('en-US')} Gold`);
}

function assertListingRoom(q: Q, userId: number): void {
  const open = q.select({ id: marketListings.id }).from(marketListings).where(and(eq(marketListings.sellerId, userId), eq(marketListings.status, 'open'))).all().length;
  assertGame(open < LISTING_MAX_OPEN, `You can have at most ${LISTING_MAX_OPEN} open offers`);
}

/** Put resources up for sale. They leave the village right away (escrow). */
export function listResources(db: DB, userId: number, villageId: number, goods: Resources, price: number, now: number): number {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    assertPrice(price);
    assertListingRoom(tx, userId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const clean = res();
    for (const k of RESOURCE_KEYS) {
      const n = goods[k];
      assertGame(Number.isFinite(n) && n >= 0, 'Invalid amounts');
      clean[k] = Math.floor(n);
    }
    assertGame(sumRes(clean) >= LISTING_MIN_RESOURCES, `Offer at least ${LISTING_MIN_RESOURCES} resources`);
    const stock = stockOf(state.village);
    for (const k of RESOURCE_KEYS) assertGame(stock[k] >= clean[k], `Not enough ${k} in this village`);
    // The market isn't a vault: everything listed from a village must fit in its storage.
    const listed = listedResources(tx, villageId);
    const cap = capacityFor(state);
    assertGame(sumRes(listed) + sumRes(clean) <= sumRes(cap), `You can list at most ${fmtInt(sumRes(cap))} resources from this village (its storage)`);
    const next = res();
    for (const k of RESOURCE_KEYS) next[k] = stock[k] - clean[k];
    setResources(tx, villageId, next);
    const tribe = tx.select({ tribe: users.tribe }).from(users).where(eq(users.id, userId)).get()?.tribe ?? 'romans';
    return tx
      .insert(marketListings)
      .values({ sellerId: userId, villageId, kind: 'resources', tribe, goods: JSON.stringify(clean), units: JSON.stringify(emptyUnits()), price, createdAt: now })
      .returning({ id: marketListings.id })
      .get().id;
  });
}

/** Put troops from the village (at home, own troops) up for sale. They leave the village right away. */
export function listTroops(db: DB, userId: number, villageId: number, units: UnitCounts, price: number, now: number): number {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    assertPrice(price);
    assertListingRoom(tx, userId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const home = troopsAt(tx, villageId, villageId);
    const clean = emptyUnits();
    units.forEach((n, i) => {
      assertGame(Number.isFinite(n) && n >= 0, 'Invalid amounts');
      const c = Math.floor(n);
      if (c > 0) assertGame((SELLABLE_SLOTS as readonly number[]).includes(i), 'Settlers and chiefs cannot be sold');
      assertGame((home[i] ?? 0) >= c, `Not enough ${TRIBES[state.tribe].units[i]?.name ?? 'units'} at home`);
      clean[i] = c;
    });
    assertGame(totalUnits(clean) > 0, 'Choose the troops you want to sell');
    setTroopsAt(tx, villageId, villageId, home.map((n, i) => n - (clean[i] ?? 0)));
    return tx
      .insert(marketListings)
      .values({ sellerId: userId, villageId, kind: 'troops', tribe: state.tribe, goods: JSON.stringify(res()), units: JSON.stringify(clean), price, createdAt: now })
      .returning({ id: marketListings.id })
      .get().id;
  });
}

/** Where escrow goes back to: the listing's village if still the seller's, else their capital (or any village). */
function returnVillage(q: Q, l: ListingRow): number | null {
  if (l.villageId !== null) {
    const v = q.select({ userId: villages.userId }).from(villages).where(eq(villages.id, l.villageId)).get();
    if (v?.userId === l.sellerId) return l.villageId;
  }
  const own = q.select({ id: villages.id, cap: villages.isCapital }).from(villages).where(eq(villages.userId, l.sellerId)).all();
  return (own.find((v) => v.cap) ?? own[0])?.id ?? null;
}

export function cancelListing(db: DB, userId: number, listingId: number, now: number): void {
  db.transaction((tx) => {
    const l = tx.select().from(marketListings).where(eq(marketListings.id, listingId)).get();
    assertGame(l && l.sellerId === userId, 'Offer not found');
    assertGame(l.status === 'open', 'This offer is already closed');
    // Cancelled goods walk back from the market (they can't be pulled back the instant an attack lands).
    const back = returnVillage(tx, l);
    if (back !== null) {
      const v = tx.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, back)).get();
      if (v) {
        tx.insert(movements)
          .values({
            kind: 'delivery', fromVillageId: back, toVillageId: back, originX: v.x, originY: v.y, toX: v.x, toY: v.y,
            units: l.kind === 'troops' ? l.units : JSON.stringify(emptyUnits()), loot: l.kind === 'resources' ? l.goods : null,
            departAt: now, arriveAt: now + CANCEL_RETURN_MS,
          })
          .run();
      }
    }
    tx.update(marketListings).set({ status: 'cancelled', closedAt: now }).where(eq(marketListings.id, l.id)).run();
  });
}

/**
 * Change an open offer's price and/or amounts. The difference in goods is settled with the
 * offer's village right away: more is taken from it, less is given back.
 */
export function editListing(
  db: DB,
  userId: number,
  listingId: number,
  change: { price: number; goods?: Resources; units?: UnitCounts },
  now: number,
): void {
  db.transaction((tx) => {
    const l = tx.select().from(marketListings).where(eq(marketListings.id, listingId)).get();
    assertGame(l && l.sellerId === userId, 'Offer not found');
    assertGame(l.status === 'open', 'This offer is already closed');
    assertPrice(change.price);
    const villageOk = l.villageId !== null && tx.select({ u: villages.userId }).from(villages).where(eq(villages.id, l.villageId)).get()?.u === userId;
    let goods = l.goods;
    let units = l.units;
    if (l.kind === 'resources' && change.goods) {
      const old = parseResources(l.goods);
      const next = res();
      for (const k of RESOURCE_KEYS) {
        const n = change.goods[k];
        assertGame(Number.isFinite(n) && n >= 0, 'Invalid amounts');
        next[k] = Math.floor(n);
      }
      assertGame(sumRes(next) >= LISTING_MIN_RESOURCES, `Offer at least ${LISTING_MIN_RESOURCES} resources`);
      const changed = RESOURCE_KEYS.some((k) => next[k] !== old[k]);
      if (changed) {
        assertGame(villageOk && l.villageId !== null, 'The village of this offer is no longer yours: only the price can change');
        const state = catchUp(tx, l.villageId, now);
        assertGame(state, 'Village not found');
        const stock = stockOf(state.village);
        const cap = capacityFor(state);
        const others = sumRes(listedResources(tx, l.villageId)) - sumRes(old);
        assertGame(others + sumRes(next) <= sumRes(cap), `You can list at most ${fmtInt(sumRes(cap))} resources from this village (its storage)`);
        const after = res();
        for (const k of RESOURCE_KEYS) {
          const delta = next[k] - old[k];
          if (delta > 0) assertGame(stock[k] >= delta, `Not enough ${k} in this village`);
          if (delta < 0) assertGame(stock[k] - delta <= cap[k], `Not enough storage to take back ${-delta} ${k}`);
          after[k] = stock[k] - delta;
        }
        setResources(tx, l.villageId, after);
      }
      goods = JSON.stringify(next);
    }
    if (l.kind === 'troops' && change.units) {
      const old = parseUnits(l.units);
      const next = emptyUnits();
      change.units.forEach((n, i) => {
        assertGame(Number.isFinite(n) && n >= 0, 'Invalid amounts');
        const c = Math.floor(n);
        if (c > 0) assertGame((SELLABLE_SLOTS as readonly number[]).includes(i), 'Settlers and chiefs cannot be sold');
        next[i] = c;
      });
      assertGame(totalUnits(next) > 0, 'Choose the troops you want to sell');
      if (next.some((n, i) => n !== (old[i] ?? 0))) {
        assertGame(villageOk && l.villageId !== null, 'The village of this offer is no longer yours: only the price can change');
        catchUp(tx, l.villageId, now);
        const home = troopsAt(tx, l.villageId, l.villageId);
        const tribe = (l.tribe in TRIBES ? l.tribe : 'romans') as TribeId;
        const after = home.map((h, i) => {
          const delta = (next[i] ?? 0) - (old[i] ?? 0);
          assertGame(delta <= 0 || h >= delta, `Not enough ${TRIBES[tribe].units[i]?.name ?? 'units'} at home`);
          return h - delta;
        });
        setTroopsAt(tx, l.villageId, l.villageId, after);
      }
      units = JSON.stringify(next);
    }
    tx.update(marketListings).set({ price: change.price, goods, units }).where(eq(marketListings.id, l.id)).run();
  });
}

export function ownListing(q: Q, userId: number, listingId: number): ListingRow | undefined {
  const l = q.select().from(marketListings).where(eq(marketListings.id, listingId)).get();
  return l && l.sellerId === userId ? l : undefined;
}

/** Travel time for a lot from the seller's village to (x, y). */
export function deliveryTimeMs(l: { kind: 'resources' | 'troops'; tribe: string; units: string }, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const tribe = (l.tribe in TRIBES ? l.tribe : 'romans') as TribeId;
  const speed = l.kind === 'troops' ? slowestSpeed(tribe, parseUnits(l.units)) : TRIBES[tribe].merchantSpeed;
  return travelTimeMs(distance(from.x, from.y, to.x, to.y, config.MAP_RADIUS), speed, config.TROOP_SPEED);
}

/**
 * Buy a whole lot for the active village. Gold moves buyer → seller now; the goods travel
 * from the seller's village and arrive like returning troops / merchants.
 */
export function buyListing(db: DB, buyerId: number, villageId: number, listingId: number, now: number): { arriveAt: number } {
  return db.transaction((tx) => {
    const dest = ownedVillage(tx, buyerId, villageId);
    const l = tx.select().from(marketListings).where(eq(marketListings.id, listingId)).get();
    assertGame(l, 'Offer not found');
    assertGame(l.status === 'open', 'Someone else was faster: this offer is gone');
    assertGame(l.sellerId !== buyerId, 'This is your own offer');
    const buyer = tx.select({ username: users.username, tribe: users.tribe }).from(users).where(eq(users.id, buyerId)).get();
    assertGame(buyer, 'Player not found');
    if (l.kind === 'troops') {
      assertGame(buyer.tribe === l.tribe, `Only ${TRIBES[l.tribe as TribeId]?.name ?? l.tribe} can buy these troops`);
    }
    const bal = creditBalance(tx, buyerId);
    assertGame(bal >= l.price, `This costs ${l.price} Gold, you have ${bal}`);
    const seller = tx.select({ username: users.username }).from(users).where(eq(users.id, l.sellerId)).get();
    const fromV = l.villageId !== null ? tx.select({ x: villages.x, y: villages.y, name: villages.name }).from(villages).where(eq(villages.id, l.villageId)).get() : undefined;
    const origin = fromV ?? { x: dest.x, y: dest.y, name: 'the market' };
    const arriveAt = now + deliveryTimeMs(l, origin, dest);
    const key = `market:${l.id}`;
    tx.insert(creditsLedger).values({ userId: buyerId, amount: -l.price, reason: `Gold market: bought from ${seller?.username ?? '?'}`, idemKey: `${key}:buy`, createdAt: now }).run();
    tx.insert(creditsLedger).values({ userId: l.sellerId, amount: l.price, reason: `Gold market: sold to ${buyer.username}`, idemKey: `${key}:sell`, createdAt: now }).run();
    tx.insert(movements)
      .values({
        kind: 'delivery', fromVillageId: villageId, toVillageId: villageId, originX: origin.x, originY: origin.y, toX: dest.x, toY: dest.y,
        units: l.kind === 'troops' ? l.units : JSON.stringify(emptyUnits()), loot: l.kind === 'resources' ? l.goods : null,
        departAt: now, arriveAt,
      })
      .run();
    tx.update(marketListings).set({ status: 'sold', buyerId, closedAt: now }).where(eq(marketListings.id, l.id)).run();
    const what = l.kind === 'troops' ? 'troops' : 'resources';
    tx.insert(messages)
      .values({
        fromUserId: buyerId, toUserId: l.sellerId, subject: `Gold market: your ${what} were sold`,
        body: `${buyer.username} bought your ${what} for ${l.price} Gold. The Gold is already on your account.`, createdAt: now,
      })
      .run();
    addReport(tx, buyerId, 'trade', `Gold market purchase from ${seller?.username ?? '?'} is on its way`, {
      type: 'trade', fromName: origin.name, fromX: origin.x, fromY: origin.y, toName: dest.name, toX: dest.x, toY: dest.y, goods: parseResources(l.goods),
    }, now);
    return { arriveAt };
  });
}

export interface ListingView extends ListingRow {
  seller: string;
  fromX: number | null;
  fromY: number | null;
}

/** Open offers of one kind, cheapest first (resources: per 1,000). Troops can be limited to one tribe. */
export function openListings(q: Q, kind: 'resources' | 'troops', opts: { tribe?: string; exceptUser?: number } = {}): ListingView[] {
  const rows = q
    .select({ l: marketListings, seller: users.username, fromX: villages.x, fromY: villages.y })
    .from(marketListings)
    .innerJoin(users, eq(users.id, marketListings.sellerId))
    .leftJoin(villages, eq(villages.id, marketListings.villageId))
    .where(
      and(
        eq(marketListings.status, 'open'),
        eq(marketListings.kind, kind),
        opts.tribe ? eq(marketListings.tribe, opts.tribe) : undefined,
        opts.exceptUser !== undefined ? ne(marketListings.sellerId, opts.exceptUser) : undefined,
      ),
    )
    .orderBy(desc(marketListings.createdAt))
    .limit(200)
    .all();
  const out = rows.map((r) => ({ ...r.l, seller: r.seller, fromX: r.fromX, fromY: r.fromY }));
  if (kind === 'resources') out.sort((a, b) => a.price / Math.max(1, sumRes(parseResources(a.goods))) - b.price / Math.max(1, sumRes(parseResources(b.goods))));
  return out;
}

/** The player's own offers (open first) and recent purchases. */
export function myListings(q: Q, userId: number): ListingView[] {
  return q
    .select({ l: marketListings, seller: users.username, fromX: villages.x, fromY: villages.y })
    .from(marketListings)
    .innerJoin(users, eq(users.id, marketListings.sellerId))
    .leftJoin(villages, eq(villages.id, marketListings.villageId))
    .where(or(eq(marketListings.sellerId, userId), eq(marketListings.buyerId, userId)))
    .orderBy(desc(marketListings.createdAt))
    .limit(60)
    .all()
    .map((r) => ({ ...r.l, seller: r.seller, fromX: r.fromX, fromY: r.fromY }));
}
