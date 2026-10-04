import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { marketOffers, movements, users, villages, allianceMembers } from '../../db/schema.js';
import { config } from '../../config.js';
import { distance, travelTimeMs, wrapCoord } from '../rules/map.js';
import { RESOURCE_KEYS, canAfford, res, subRes, addRes, sumRes, type ResourceKey, type Resources } from '../rules/resources.js';
import { TRIBES, emptyUnits, type TribeId } from '../rules/units.js';
import { assertGame } from '../errors.js';
import { catchUp, levelOf, setResources, stockOf, type VillageState } from '../engine/state.js';
import { tileAt } from '../engine/oasis.js';
import { ownedVillage } from './build.js';

export type OfferRow = typeof marketOffers.$inferSelect;

export function merchantInfo(q: Q, state: VillageState): { total: number; busy: number; free: number; capacity: number; speed: number } {
  const total = levelOf(state, 'market');
  const moving =
    q.select({ n: sql<number>`coalesce(sum(${movements.merchants}), 0)` })
      .from(movements)
      .where(and(eq(movements.fromVillageId, state.village.id), inArray(movements.kind, ['trade', 'merchant_return'])))
      .get()?.n ?? 0;
  const reserved =
    q.select({ n: sql<number>`coalesce(sum(${marketOffers.merchants}), 0)` }).from(marketOffers).where(eq(marketOffers.villageId, state.village.id)).get()?.n ?? 0;
  const busy = moving + reserved;
  const t = TRIBES[state.tribe];
  // Trade Office: +10% capacity per level.
  const capacity = Math.round(t.merchantCapacity * (1 + 0.1 * levelOf(state, 'tradeoffice')));
  return { total, busy, free: Math.max(0, total - busy), capacity, speed: t.merchantSpeed };
}

function merchantsNeeded(amount: number, capacity: number): number {
  return Math.ceil(amount / capacity);
}

function dispatch(q: Q, from: VillageState, to: { id: number; x: number; y: number }, goods: Resources, merchants: number, now: number): number {
  const t = TRIBES[from.tribe];
  const dist = distance(from.village.x, from.village.y, to.x, to.y, config.MAP_RADIUS);
  const travel = travelTimeMs(dist, t.merchantSpeed, config.TROOP_SPEED);
  q.insert(movements)
    .values({
      kind: 'trade', fromVillageId: from.village.id, toVillageId: to.id, originX: from.village.x, originY: from.village.y,
      toX: to.x, toY: to.y, units: JSON.stringify(emptyUnits()), loot: JSON.stringify(goods), merchants, departAt: now, arriveAt: now + travel,
    })
    .run();
  return travel;
}

/** Send resources with merchants to any village (yours or another player's). */
export function sendResources(db: DB, userId: number, villageId: number, x: number, y: number, goods: Resources, now: number): number {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    const clean = res(...RESOURCE_KEYS.map((k) => Math.max(0, Math.floor(goods[k]))) as [number, number, number, number]);
    const total = sumRes(clean);
    assertGame(total > 0, 'Choose what to send');
    assertGame(canAfford(stockOf(state.village), clean), 'Not enough resources');
    const m = merchantInfo(tx, state);
    assertGame(m.total > 0, 'Build a Marketplace first');
    const need = merchantsNeeded(total, m.capacity);
    assertGame(need <= m.free, `You need ${need} merchants but only ${m.free} are free`);
    const tile = tileAt(tx, wrapCoord(x, config.MAP_RADIUS), wrapCoord(y, config.MAP_RADIUS));
    assertGame(tile?.villageId && tile.kind === 'field', 'There is no village at that location');
    assertGame(tile.villageId !== villageId, 'Choose another village');
    setResources(tx, villageId, subRes(stockOf(state.village), clean));
    return dispatch(tx, state, { id: tile.villageId, x: tile.x, y: tile.y }, clean, need, now);
  });
}

const ONE = (k: ResourceKey, n: number): Resources => ({ ...res(), [k]: n });

export function createOffer(db: DB, userId: number, villageId: number, offer: { res: ResourceKey; amount: number }, want: { res: ResourceKey; amount: number }, maxHours: number | null, now: number, allianceOnly = false): OfferRow {
  return db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const state = catchUp(tx, villageId, now);
    assertGame(state, 'Village not found');
    assertGame(offer.res !== want.res, 'Offer and request must be different resources');
    assertGame(offer.amount > 0 && want.amount > 0, 'Amounts must be positive');
    // Keep offers fair-ish so the market can't be used to move resources between multi-accounts.
    assertGame(want.amount <= offer.amount * 2 && offer.amount <= want.amount * 2, 'The exchange ratio must be between 1:2 and 2:1');
    const goods = ONE(offer.res, offer.amount);
    assertGame(canAfford(stockOf(state.village), goods), 'Not enough resources');
    const m = merchantInfo(tx, state);
    assertGame(m.total > 0, 'Build a Marketplace first');
    const need = merchantsNeeded(offer.amount, m.capacity);
    assertGame(need <= m.free, `You need ${need} merchants but only ${m.free} are free`);
    if (allianceOnly) assertGame(allianceOf(tx, userId) !== null, 'Join an alliance to make alliance-only offers');
    setResources(tx, villageId, subRes(stockOf(state.village), goods));
    return tx
      .insert(marketOffers)
      .values({ villageId, offerRes: offer.res, offerAmount: offer.amount, wantRes: want.res, wantAmount: want.amount, merchants: need, maxHours, allianceOnly, createdAt: now })
      .returning()
      .get();
  });
}

export function cancelOffer(db: DB, userId: number, offerId: number, now: number): void {
  db.transaction((tx) => {
    const o = tx.select().from(marketOffers).where(eq(marketOffers.id, offerId)).get();
    assertGame(o, 'Offer not found');
    ownedVillage(tx, userId, o.villageId);
    const state = catchUp(tx, o.villageId, now);
    assertGame(state, 'Village not found');
    setResources(tx, o.villageId, addRes(stockOf(state.village), ONE(o.offerRes as ResourceKey, o.offerAmount)));
    tx.delete(marketOffers).where(eq(marketOffers.id, offerId)).run();
  });
}

export function acceptOffer(db: DB, userId: number, villageId: number, offerId: number, now: number): void {
  db.transaction((tx) => {
    ownedVillage(tx, userId, villageId);
    const o = tx.select().from(marketOffers).where(eq(marketOffers.id, offerId)).get();
    assertGame(o, 'This offer is no longer available');
    const seller = catchUp(tx, o.villageId, now);
    const buyer = catchUp(tx, villageId, now);
    assertGame(seller && buyer, 'Village not found');
    assertGame(seller.userId !== userId, 'You cannot accept your own offer');
    if (o.allianceOnly) {
      const mine = allianceOf(tx, userId);
      assertGame(mine !== null && seller.userId !== null && mine === allianceOf(tx, seller.userId), 'This offer is only for members of the seller’s alliance');
    }
    const pay = ONE(o.wantRes as ResourceKey, o.wantAmount);
    assertGame(canAfford(stockOf(buyer.village), pay), 'Not enough resources');
    const m = merchantInfo(tx, buyer);
    assertGame(m.total > 0, 'Build a Marketplace first');
    const need = merchantsNeeded(o.wantAmount, m.capacity);
    assertGame(need <= m.free, `You need ${need} merchants but only ${m.free} are free`);
    if (o.maxHours !== null) {
      const dist = distance(seller.village.x, seller.village.y, buyer.village.x, buyer.village.y, config.MAP_RADIUS);
      const hours = travelTimeMs(dist, TRIBES[seller.tribe].merchantSpeed, config.TROOP_SPEED) / 3_600_000;
      assertGame(hours <= o.maxHours, `The seller only trades within ${o.maxHours} hours of travel`);
    }
    // Release the seller's reserved merchants, then both sides ship.
    tx.delete(marketOffers).where(eq(marketOffers.id, offerId)).run();
    setResources(tx, villageId, subRes(stockOf(buyer.village), pay));
    dispatch(tx, buyer, { id: seller.village.id, x: seller.village.x, y: seller.village.y }, pay, need, now);
    dispatch(tx, seller, { id: buyer.village.id, x: buyer.village.x, y: buyer.village.y }, ONE(o.offerRes as ResourceKey, o.offerAmount), o.merchants, now);
  });
}

export interface OfferView extends OfferRow {
  villageName: string;
  owner: string;
  x: number;
  y: number;
  tribe: TribeId;
  hours: number;
}

function allianceOf(q: Q, userId: number): number | null {
  return q.select({ a: allianceMembers.allianceId }).from(allianceMembers).where(eq(allianceMembers.userId, userId)).get()?.a ?? null;
}

export function listOffers(q: Q, viewer: VillageState, mineOnly: boolean): OfferView[] {
  const rows = q
    .select({ o: marketOffers, name: villages.name, x: villages.x, y: villages.y, owner: users.username, tribe: users.tribe, userId: villages.userId })
    .from(marketOffers)
    .innerJoin(villages, eq(villages.id, marketOffers.villageId))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(mineOnly ? eq(marketOffers.villageId, viewer.village.id) : viewer.userId !== null ? ne(villages.userId, viewer.userId) : undefined)
    .orderBy(marketOffers.createdAt)
    .limit(100)
    .all();
  const myAlliance = viewer.userId !== null ? allianceOf(q, viewer.userId) : null;
  return rows
    .filter((r) => mineOnly || !r.o.allianceOnly || (myAlliance !== null && r.userId !== null && allianceOf(q, r.userId) === myAlliance))
    .map((r) => {
      const tribe = r.tribe ?? 'romans';
      const dist = distance(viewer.village.x, viewer.village.y, r.x, r.y, config.MAP_RADIUS);
      return {
        ...r.o, villageName: r.name, owner: r.owner ?? '?', x: r.x, y: r.y, tribe,
        hours: travelTimeMs(dist, TRIBES[tribe].merchantSpeed, config.TROOP_SPEED) / 3_600_000,
      };
    })
    .sort((a, b) => a.hours - b.hours);
}
