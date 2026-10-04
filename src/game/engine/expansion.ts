import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import {
  buildOrders,
  heroes,
  marketOffers,
  movements,
  researchOrders,
  tiles,
  trainOrders,
  troops,
  villages,
} from '../../db/schema.js';
import { culturePointsRequired, expansionSlots } from '../rules/expansion.js';
import { catchUpCulture, levelOf, loadVillage } from './state.js';
import { sendTroopsHome } from './movement.js';

export interface ExpansionCheck {
  ok: boolean;
  reason?: string;
  culturePoints: number;
  required: number;
  slots: number;
  used: number;
}

/** Can this player found or conquer one more village from `homeId` right now? */
export function canExpand(q: Q, userId: number, homeId: number, now: number, excludeMovementId?: number): ExpansionCheck {
  const cp = catchUpCulture(q, userId, now);
  const owned = q.select({ n: sql<number>`count(*)` }).from(villages).where(eq(villages.userId, userId)).get()?.n ?? 0;
  const required = culturePointsRequired(owned + 1);
  const home = loadVillage(q, homeId);
  const slots = home ? expansionSlots(levelOf(home, 'residence'), levelOf(home, 'palace')) : 0;
  const inFlight =
    q.select({ n: sql<number>`count(*)` })
      .from(movements)
      .where(
        and(
          eq(movements.fromVillageId, homeId),
          eq(movements.kind, 'settle'),
          excludeMovementId !== undefined ? ne(movements.id, excludeMovementId) : undefined,
        ),
      )
      .get()?.n ?? 0;
  const used = (home?.village.expansions ?? 0) + inFlight;
  const base = { culturePoints: cp, required, slots, used };
  if (cp < required) return { ...base, ok: false, reason: `You need ${Math.ceil(required)} culture points (you have ${Math.floor(cp)})` };
  if (slots <= used) return { ...base, ok: false, reason: 'No free expansion slot: upgrade your Residence (level 10/20) or Palace (10/15/20)' };
  return { ...base, ok: true };
}

/** Hand a village to a new owner after its loyalty dropped to zero. */
export function conquerVillage(q: Q, targetId: number, newOwnerId: number, fromVillageId: number, now: number): void {
  const target = q.select().from(villages).where(eq(villages.id, targetId)).get();
  if (!target) return;
  const oldOwner = target.userId;

  q.delete(buildOrders).where(eq(buildOrders.villageId, targetId)).run();
  q.delete(trainOrders).where(eq(trainOrders.villageId, targetId)).run();
  q.delete(researchOrders).where(eq(researchOrders.villageId, targetId)).run();
  q.delete(marketOffers).where(eq(marketOffers.villageId, targetId)).run();

  // Foreign reinforcements go home; the village's own army scatters.
  for (const row of q.select().from(troops).where(and(eq(troops.villageId, targetId), ne(troops.ownerVillageId, targetId))).all()) {
    sendTroopsHome(q, targetId, row.ownerVillageId, now);
  }
  q.delete(troops).where(eq(troops.ownerVillageId, targetId)).run();
  q.delete(movements).where(eq(movements.fromVillageId, targetId)).run();
  q.insert(troops).values({ villageId: targetId, ownerVillageId: targetId, units: JSON.stringify(new Array(10).fill(0)) }).run();

  // Oases belong to the old owner's empire; they become wild again.
  q.update(tiles).set({ villageId: null, animals: null, animalsAt: null }).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, targetId))).run();

  // A hero based here falls and moves its home to the old owner's capital.
  if (oldOwner !== null) {
    const capital = q
      .select({ id: villages.id })
      .from(villages)
      .where(and(eq(villages.userId, oldOwner), ne(villages.id, targetId)))
      .orderBy(sql`${villages.isCapital} desc`, villages.id)
      .limit(1)
      .get();
    const hero = q.select().from(heroes).where(eq(heroes.homeVillageId, targetId)).get();
    if (hero && capital) {
      const killed = hero.locationId === targetId;
      q.update(heroes)
        .set({ homeVillageId: capital.id, ...(killed ? { status: 'dead' as const, locationId: null, health: 0 } : {}) })
        .where(eq(heroes.id, hero.id))
        .run();
    }
  }
  // Heroes of other players stationed here go home too (handled with their troops), so only clean dangling ones.
  q.update(heroes).set({ status: 'dead', locationId: null, health: 0 }).where(and(eq(heroes.locationId, targetId), eq(heroes.status, 'away'), inArray(heroes.userId, oldOwner === null ? [] : [oldOwner]))).run();

  q.update(villages)
    .set({
      userId: newOwnerId,
      loyalty: 0,
      isCapital: false,
      parentId: fromVillageId,
      research: '[1,0,0,0,0,0,0,0,0,0]',
      smithy: '[0,0,0,0,0,0,0,0,0,0]',
      expansions: 0,
      resAt: now,
    })
    .where(eq(villages.id, targetId))
    .run();
  const home = q.select({ e: villages.expansions }).from(villages).where(eq(villages.id, fromVillageId)).get();
  q.update(villages).set({ expansions: (home?.e ?? 0) + 1 }).where(eq(villages.id, fromVillageId)).run();
}
