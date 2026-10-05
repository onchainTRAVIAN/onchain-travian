import { and, eq, gt, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { artifacts, buildOrders, celebrations, heroes, marketOffers, movements, oasisTroops, researchOrders, slots, tiles, trainOrders, troops, users, villages } from '../../db/schema.js';
import { culturePointsRequired, expansionSlots } from '../rules/expansion.js';
import { catchUpCulture, levelOf, loadVillage, parseUnits, refreshPopulation } from './state.js';
import { config } from '../../config.js';
import { BUILDINGS, FIELD_MAX_NON_CAPITAL, WALL_FOR, WALL_SLOT, type BuildingId } from '../rules/buildings.js';
import { scheduleReturn, sendTroopsHome, villageInfo } from './movement.js';
import { emptyUnits } from '../rules/units.js';
import { clearOasisGarrison } from './oasisTroops.js';

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
  q.delete(oasisTroops).where(eq(oasisTroops.ownerVillageId, targetId)).run();
  // Other players' heroes standing here without troops walk home too.
  sendStationedHeroesHome(q, targetId, target.x, target.y, now);
  // A hero out on a mission from this village loses its army: it falls, and can be revived at the capital.
  killHeroesOnMissionsFrom(q, targetId);
  q.delete(movements).where(eq(movements.fromVillageId, targetId)).run();
  q.insert(troops).values({ villageId: targetId, ownerVillageId: targetId, units: JSON.stringify(new Array(10).fill(0)) }).run();
  // The Trapper falls with the village: prisoners go home; soldiers of this village held elsewhere are lost.
  releaseAllPrisoners(q, target, now);
  forgetPrisonersOf(q, targetId);
  q.delete(celebrations).where(eq(celebrations.villageId, targetId)).run();
  // Artifacts and construction plans in a conquered (Natar) village change hands like a captured one.
  q.update(artifacts)
    .set({ capturedAt: now, activeAt: now + Math.round(86_400_000 / config.WORLD_SPEED) })
    .where(and(eq(artifacts.villageId, targetId), isNull(artifacts.capturedAt)))
    .run();

  // Oases belong to the old owner's empire; they become wild again (garrisons walk home).
  for (const o of q.select({ x: tiles.x, y: tiles.y }).from(tiles).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, targetId))).all()) clearOasisGarrison(q, o.x, o.y, now);
  q.update(tiles).set({ villageId: null, animalsAt: now }).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, targetId))).run();

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
      blacksmith: '[0,0,0,0,0,0,0,0,0,0]',
      armoury: '[0,0,0,0,0,0,0,0,0,0]',
      expansions: 0,
      traps: 0,
      prisoners: '{}',
      resAt: now,
    })
    .where(eq(villages.id, targetId))
    .run();
  const home = q.select({ e: villages.expansions }).from(villages).where(eq(villages.id, fromVillageId)).get();
  q.update(villages).set({ expansions: (home?.e ?? 0) + 1 }).where(eq(villages.id, fromVillageId)).run();

  // T3.6: the wall is destroyed on conquest and the plot takes the new owner's wall type (level 0);
  // the old tribe's special buildings are lost only when a different tribe takes over.
  const newTribe = q.select({ t: users.tribe }).from(users).where(eq(users.id, newOwnerId)).get()?.t;
  const oldTribe = oldOwner === null ? null : q.select({ t: users.tribe }).from(users).where(eq(users.id, oldOwner)).get()?.t;
  for (const sl of q.select().from(slots).where(eq(slots.villageId, targetId)).all()) {
    const def = sl.building ? BUILDINGS[sl.building as BuildingId] : undefined;
    if (sl.slot === WALL_SLOT) {
      const wall = newTribe && newTribe !== 'natars' ? WALL_FOR[newTribe] : null;
      q.update(slots).set({ building: wall, level: 0 }).where(and(eq(slots.villageId, targetId), eq(slots.slot, sl.slot))).run();
    } else if (def?.tribe && def.tribe !== newTribe && newTribe !== oldTribe) {
      q.update(slots).set({ building: null, level: 0 }).where(and(eq(slots.villageId, targetId), eq(slots.slot, sl.slot))).run();
    }
  }
  refreshPopulation(q, targetId);
}

/**
 * A village whose population catapults brought to 0 disappears (never a capital or a player's
 * last village). Foreign troops go home, a hero based here moves to the capital, the land is freed.
 */
/** Heroes of other players stationed in a village walk home (they may be there without any troops). */
function sendStationedHeroesHome(q: Q, villageId: number, x: number, y: number, now: number): void {
  for (const h of q.select().from(heroes).where(and(eq(heroes.locationId, villageId), eq(heroes.status, 'away'))).all()) {
    const home = villageInfo(q, h.homeVillageId);
    if (!home || home.id === villageId) continue;
    q.update(heroes).set({ status: 'moving', locationId: null }).where(eq(heroes.id, h.id)).run();
    scheduleReturn(q, home, x, y, emptyUnits(), null, now, true);
  }
}

/** A village's outgoing movements are about to be deleted: heroes travelling with them fall (revivable). */
function killHeroesOnMissionsFrom(q: Q, villageId: number): void {
  const owner = q.select({ u: villages.userId }).from(villages).where(eq(villages.id, villageId)).get()?.u ?? null;
  if (owner === null) return;
  const heroMove = q.select({ id: movements.id }).from(movements).where(and(eq(movements.fromVillageId, villageId), eq(movements.hero, true))).get();
  if (!heroMove) return;
  q.update(heroes).set({ status: 'dead', locationId: null, health: 0 }).where(and(eq(heroes.userId, owner), eq(heroes.status, 'moving'))).run();
}

/** Free every prisoner held in a village's traps (they walk home). */
function releaseAllPrisoners(q: Q, v: { id: number; x: number; y: number; prisoners: string }, now: number): void {
  let held: Record<string, unknown> = {};
  try {
    held = JSON.parse(v.prisoners) as Record<string, unknown>;
  } catch {
    return;
  }
  for (const [key, units] of Object.entries(held)) {
    const home = villageInfo(q, Number(key));
    if (!home) continue;
    const counts = parseUnits(JSON.stringify(units));
    if (counts.some((n) => n > 0)) scheduleReturn(q, home, v.x, v.y, counts, null, now);
  }
  q.update(villages).set({ prisoners: '{}' }).where(eq(villages.id, v.id)).run();
}

/** Soldiers of this village held in other villages' traps are lost (the village changed tribe or vanished). */
function forgetPrisonersOf(q: Q, villageId: number): void {
  const key = String(villageId);
  for (const row of q.select({ id: villages.id, prisoners: villages.prisoners }).from(villages).where(sql`${villages.prisoners} like ${'%"' + key + '"%'}`).all()) {
    try {
      const p = JSON.parse(row.prisoners) as Record<string, unknown>;
      if (!(key in p)) continue;
      delete p[key];
      q.update(villages).set({ prisoners: JSON.stringify(p) }).where(eq(villages.id, row.id)).run();
    } catch {
      /* malformed: leave it */
    }
  }
}

export function destroyVillage(q: Q, villageId: number, now: number): void {
  const v = q.select().from(villages).where(eq(villages.id, villageId)).get();
  if (!v) return;
  for (const row of q.select().from(troops).where(and(eq(troops.villageId, villageId), ne(troops.ownerVillageId, villageId))).all()) {
    sendTroopsHome(q, villageId, row.ownerVillageId, now);
  }
  sendStationedHeroesHome(q, villageId, v.x, v.y, now);
  killHeroesOnMissionsFrom(q, villageId);
  releaseAllPrisoners(q, v, now);
  forgetPrisonersOf(q, villageId);
  if (v.userId !== null) {
    const capital = q
      .select({ id: villages.id })
      .from(villages)
      .where(and(eq(villages.userId, v.userId), ne(villages.id, villageId)))
      .orderBy(sql`${villages.isCapital} desc`, villages.id)
      .limit(1)
      .get();
    const hero = q.select().from(heroes).where(eq(heroes.homeVillageId, villageId)).get();
    if (hero && capital) {
      const here = hero.locationId === villageId;
      q.update(heroes)
        .set({ homeVillageId: capital.id, ...(here ? { status: 'dead' as const, locationId: null, health: 0 } : {}) })
        .where(eq(heroes.id, hero.id))
        .run();
    }
  }
  q.update(tiles).set({ villageId: null }).where(and(eq(tiles.kind, 'field'), eq(tiles.villageId, villageId))).run();
  q.update(tiles).set({ villageId: null, animalsAt: now }).where(and(eq(tiles.kind, 'oasis'), eq(tiles.villageId, villageId))).run();
  q.delete(villages).where(eq(villages.id, villageId)).run();
}

/**
 * Make `villageId` its owner's capital. The old capital loses capital-only buildings (Stonemason,
 * Brewery) and its resource fields above level 10 drop to 10.
 */
export function moveCapital(q: Q, villageId: number, _now: number): void {
  const v = q.select().from(villages).where(eq(villages.id, villageId)).get();
  if (!v || v.userId === null || v.isCapital) return;
  const old = q.select().from(villages).where(and(eq(villages.userId, v.userId), eq(villages.isCapital, true))).get();
  if (old) {
    q.update(villages).set({ isCapital: false }).where(eq(villages.id, old.id)).run();
    for (const sl of q.select().from(slots).where(eq(slots.villageId, old.id)).all()) {
      const def = sl.building ? BUILDINGS[sl.building as BuildingId] : undefined;
      if (def?.capitalOnly) q.update(slots).set({ building: null, level: 0 }).where(and(eq(slots.villageId, old.id), eq(slots.slot, sl.slot))).run();
      else if (def?.kind === 'field' && sl.level > FIELD_MAX_NON_CAPITAL) {
        q.update(slots).set({ level: FIELD_MAX_NON_CAPITAL }).where(and(eq(slots.villageId, old.id), eq(slots.slot, sl.slot))).run();
      }
    }
    q.delete(buildOrders).where(and(eq(buildOrders.villageId, old.id), inArray(buildOrders.building, ['stonemason', 'brewery']))).run();
    q.delete(buildOrders).where(and(eq(buildOrders.villageId, old.id), lte(buildOrders.slot, 18), gt(buildOrders.toLevel, FIELD_MAX_NON_CAPITAL))).run();
    refreshPopulation(q, old.id);
  }
  q.update(villages).set({ isCapital: true }).where(eq(villages.id, villageId)).run();
}
