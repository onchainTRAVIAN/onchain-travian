import { and, asc, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { Q } from '../db/index.js';
import { allianceMembers, alliances, heroes, messages, movements, reports, tiles, troops, users, villages } from '../db/schema.js';
import { config } from '../config.js';
import { distance, wrapCoord } from './rules/map.js';
import type { TribeId, UnitCounts } from './rules/units.js';
import { parseResources, parseUnits } from './engine/state.js';
import type { Resources } from './rules/resources.js';

export function userVillages(q: Q, userId: number) {
  return q
    .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y, pop: villages.pop, isCapital: villages.isCapital })
    .from(villages)
    .where(eq(villages.userId, userId))
    .orderBy(desc(villages.isCapital), asc(villages.id))
    .all();
}

export interface MovementView {
  id: number;
  kind: (typeof movements.$inferSelect)['kind'];
  hero: boolean;
  merchants: number;
  direction: 'out' | 'in' | 'home';
  arriveAt: number;
  departAt: number;
  units: UnitCounts | null;
  tribe: TribeId;
  otherName: string;
  otherX: number;
  otherY: number;
  otherVillageId: number | null;
  ownerName: string;
  /** Resources carried (loot of returning troops, merchants' goods); null if hidden or empty. */
  loot: Resources | null;
}

/** Name of whatever is at a map field: village name, oasis or abandoned valley. */
export function tileLabel(q: Q, x: number, y: number): string {
  const t = q.select({ kind: tiles.kind, villageId: tiles.villageId }).from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
  if (!t) return `(${x}|${y})`;
  if (t.kind === 'oasis') return `Oasis (${x}|${y})`;
  if (t.villageId === null) return `Abandoned valley (${x}|${y})`;
  const v = q.select({ name: villages.name }).from(villages).where(eq(villages.id, t.villageId)).get();
  return `${v?.name ?? 'Village'} (${x}|${y})`;
}

/** Movements relevant to a village: outgoing missions, returns, and anything heading here. */
export function villageMovements(q: Q, villageId: number): MovementView[] {
  const rows = q
    .select()
    .from(movements)
    .where(or(eq(movements.fromVillageId, villageId), eq(movements.toVillageId, villageId)))
    .orderBy(asc(movements.arriveAt))
    .all();
  const ids = new Set<number>();
  for (const r of rows) {
    ids.add(r.fromVillageId);
    if (r.toVillageId !== null) ids.add(r.toVillageId);
  }
  const info = new Map<number, { name: string; x: number; y: number; tribe: TribeId; owner: string }>();
  if (ids.size > 0) {
    for (const v of q
      .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y, tribe: users.tribe, owner: users.username })
      .from(villages)
      .leftJoin(users, eq(users.id, villages.userId))
      .where(inArray(villages.id, [...ids]))
      .all()) {
      info.set(v.id, { name: v.name, x: v.x, y: v.y, tribe: v.tribe ?? 'romans', owner: v.owner ?? 'Nature' });
    }
  }
  const out: MovementView[] = [];
  for (const r of rows) {
    const from = info.get(r.fromVillageId);
    if (r.kind === 'return' || r.kind === 'merchant_return' || r.kind === 'delivery') {
      if (r.fromVillageId !== villageId) continue;
      out.push({
        id: r.id, kind: r.kind, hero: r.hero, merchants: r.merchants, direction: 'home', arriveAt: r.arriveAt, departAt: r.departAt,
        units: parseUnits(r.units), tribe: from?.tribe ?? 'romans',
        otherName: tileLabel(q, r.originX, r.originY), otherX: r.originX, otherY: r.originY, otherVillageId: null, ownerName: from?.owner ?? '',
        loot: r.loot ? parseResources(r.loot) : null,
      });
    } else if (r.fromVillageId === villageId) {
      const to = r.toVillageId !== null ? info.get(r.toVillageId) : undefined;
      out.push({
        id: r.id, kind: r.kind, hero: r.hero, merchants: r.merchants, direction: 'out', arriveAt: r.arriveAt, departAt: r.departAt,
        units: parseUnits(r.units), tribe: from?.tribe ?? 'romans',
        otherName: to?.name ?? (r.kind === 'settle' ? `new land (${r.toX}|${r.toY})` : `oasis (${r.toX}|${r.toY})`), otherX: r.toX, otherY: r.toY, otherVillageId: r.toVillageId, ownerName: to?.owner ?? '',
        loot: r.loot ? parseResources(r.loot) : null,
      });
    } else {
      // Incoming: hide hostile army composition (you only see that something is coming).
      out.push({
        id: r.id, kind: r.kind, hero: r.hero && r.kind === 'reinforce', merchants: r.merchants, direction: 'in', arriveAt: r.arriveAt, departAt: r.departAt,
        units: r.kind === 'reinforce' || r.kind === 'trade' ? parseUnits(r.units) : null, tribe: from?.tribe ?? 'romans',
        otherName: from?.name ?? '?', otherX: r.originX, otherY: r.originY, otherVillageId: r.fromVillageId, ownerName: from?.owner ?? '',
        loot: r.kind === 'trade' && r.loot ? parseResources(r.loot) : null,
      });
    }
  }
  return out;
}

export interface StationedView {
  ownerVillageId: number;
  locationId: number;
  villageName: string;
  ownerName: string;
  x: number;
  y: number;
  tribe: TribeId;
  units: UnitCounts;
}

/** Foreign troops stationed in this village. */
export function reinforcementsIn(q: Q, villageId: number): StationedView[] {
  return q
    .select({ t: troops, name: villages.name, x: villages.x, y: villages.y, owner: users.username, tribe: users.tribe })
    .from(troops)
    .innerJoin(villages, eq(villages.id, troops.ownerVillageId))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(and(eq(troops.villageId, villageId), ne(troops.ownerVillageId, villageId)))
    .all()
    .map((r) => ({
      ownerVillageId: r.t.ownerVillageId, locationId: villageId, villageName: r.name, ownerName: r.owner ?? 'Nature',
      x: r.x, y: r.y, tribe: r.tribe ?? 'romans', units: parseUnits(r.t.units),
    }));
}

/** This village's troops stationed elsewhere. */
export function troopsAway(q: Q, villageId: number): StationedView[] {
  return q
    .select({ t: troops, name: villages.name, x: villages.x, y: villages.y, owner: users.username })
    .from(troops)
    .innerJoin(villages, eq(villages.id, troops.villageId))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(and(eq(troops.ownerVillageId, villageId), ne(troops.villageId, villageId)))
    .all()
    .map((r) => ({
      ownerVillageId: villageId, locationId: r.t.villageId, villageName: r.name, ownerName: r.owner ?? 'Nature',
      x: r.x, y: r.y, tribe: 'romans' as TribeId, units: parseUnits(r.t.units),
    }));
}

export type RankKind = 'population' | 'attack' | 'defense' | 'raid';

export function rankings(q: Q, kind: RankKind, limit: number, offset: number) {
  const pop = sql<number>`coalesce((select sum(v.pop) from villages v where v.user_id = "users"."id"), 0)`;
  const vcount = sql<number>`(select count(*) from villages v where v.user_id = "users"."id")`;
  const orderCol =
    kind === 'attack' ? users.offPoints : kind === 'defense' ? users.defPoints : kind === 'raid' ? users.lootTotal : pop;
  return q
    .select({
      id: users.id,
      username: users.username,
      tribe: users.tribe,
      pop,
      villages: vcount,
      off: users.offPoints,
      def: users.defPoints,
      loot: users.lootTotal,
      avatarAt: users.avatarAt,
      allianceId: alliances.id,
      allianceTag: alliances.tag,
    })
    .from(users)
    .leftJoin(allianceMembers, eq(allianceMembers.userId, users.id))
    .leftJoin(alliances, eq(alliances.id, allianceMembers.allianceId))
    .where(eq(users.banned, false))
    .orderBy(desc(orderCol), asc(users.id))
    .limit(limit)
    .offset(offset)
    .all();
}

export function playerCount(q: Q): number {
  return q.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0;
}

export function onlineCount(q: Q, now: number): number {
  return q.select({ n: sql<number>`count(*)` }).from(users).where(sql`${users.lastSeenAt} > ${now - 15 * 60_000}`).get()?.n ?? 0;
}

/** A player's position in any ranking (same order as `rankings`). */
export function rankOf(q: Q, kind: RankKind, userId: number): { rank: number; value: number; total: number } {
  const valueSql =
    kind === 'attack' ? sql`u.off_points` : kind === 'defense' ? sql`u.def_points` : kind === 'raid' ? sql`u.loot_total` : sql`coalesce((select sum(v.pop) from villages v where v.user_id = u.id), 0)`;
  const me = q.get<{ v: number }>(sql`select ${valueSql} as v from users u where u.id = ${userId}`);
  const mine = me?.v ?? 0;
  const better = q.get<{ n: number }>(sql`select count(*) as n from users u where u.banned = 0 and ((${valueSql}) > ${mine} or ((${valueSql}) = ${mine} and u.id < ${userId}))`);
  const total = q.get<{ n: number }>(sql`select count(*) as n from users u where u.banned = 0`);
  return { rank: (better?.n ?? 0) + 1, value: mine, total: total?.n ?? 0 };
}

export function playerRank(q: Q, userId: number): number {
  const pop = sql<number>`coalesce((select sum(v.pop) from villages v where v.user_id = u.id), 0)`;
  const mine = q.select({ p: sql<number>`coalesce(sum(${villages.pop}), 0)` }).from(villages).where(eq(villages.userId, userId)).get()?.p ?? 0;
  const better = q.get<{ n: number }>(sql`select count(*) as n from users u where u.banned = 0 and (${pop} > ${mine} or (${pop} = ${mine} and u.id < ${userId}))`);
  return (better?.n ?? 0) + 1;
}

export interface MapCell {
  x: number;
  y: number;
  kind: 'field' | 'oasis';
  layout: string | null;
  oasis: string | null;
  village: { id: number; name: string; pop: number; userId: number | null; owner: string; tribe: TribeId } | null;
}

export function mapWindow(q: Q, cx: number, cy: number, radius: number): MapCell[][] {
  const R = config.MAP_RADIUS;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let d = -radius; d <= radius; d++) {
    xs.push(wrapCoord(cx + d, R));
    ys.push(wrapCoord(cy + d, R));
  }
  const rows = q
    .select({ tile: tiles, v: villages, owner: users.username, tribe: users.tribe })
    .from(tiles)
    .leftJoin(villages, and(eq(villages.id, tiles.villageId), eq(tiles.kind, 'field')))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(and(inArray(tiles.x, [...new Set(xs)]), inArray(tiles.y, [...new Set(ys)])))
    .all();
  const byKey = new Map(rows.map((r) => [`${r.tile.x}|${r.tile.y}`, r]));
  // Rows top to bottom = y descending (north at the top).
  return [...ys].reverse().map((y) =>
    xs.map((x) => {
      const r = byKey.get(`${x}|${y}`);
      return {
        x,
        y,
        kind: r?.tile.kind ?? 'field',
        layout: r?.tile.layout ?? null,
        oasis: r?.tile.oasis ?? null,
        village: r?.v
          ? { id: r.v.id, name: r.v.name, pop: r.v.pop, userId: r.v.userId, owner: r.owner ?? 'Nature', tribe: r.tribe ?? 'romans' }
          : null,
      };
    }),
  );
}

export function tileInfo(q: Q, x: number, y: number) {
  return q
    .select({ tile: tiles, v: villages, owner: users.username, ownerId: users.id, tribe: users.tribe, protectedUntil: users.protectedUntil })
    .from(tiles)
    .leftJoin(villages, and(eq(villages.id, tiles.villageId), eq(tiles.kind, 'field')))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(and(eq(tiles.x, x), eq(tiles.y, y)))
    .get();
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return distance(ax, ay, bx, by, config.MAP_RADIUS);
}

export function unreadCounts(q: Q, userId: number): { reports: number; messages: number } {
  const r = q.select({ n: sql<number>`count(*)` }).from(reports).where(and(eq(reports.userId, userId), eq(reports.isRead, false))).get()?.n ?? 0;
  const m =
    q.select({ n: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.toUserId, userId), eq(messages.isRead, false), eq(messages.deletedByRecipient, false)))
      .get()?.n ?? 0;
  return { reports: r, messages: m };
}

export const REPORT_FILTERS = {
  all: [] as string[],
  attacks: ['attack_won', 'attack_lost'],
  defense: ['defense_won', 'defense_lost'],
  scouting: ['scout'],
  trade: ['trade'],
  other: ['reinforce', 'return', 'settle', 'starvation'],
} as const;
export type ReportFilter = keyof typeof REPORT_FILTERS;

export type ReportOutcomeFilter = 'none' | 'some' | 'all';

export function reportList(q: Q, userId: number, filter: ReportFilter, limit: number, offset: number, outcome?: ReportOutcomeFilter | null) {
  const kinds = REPORT_FILTERS[filter];
  const cond = and(
    eq(reports.userId, userId),
    kinds.length > 0 ? inArray(reports.kind, [...kinds]) : undefined,
    outcome ? eq(reports.outcome, outcome) : undefined,
  );
  return q
    .select({ id: reports.id, kind: reports.kind, title: reports.title, isRead: reports.isRead, createdAt: reports.createdAt, data: reports.data })
    .from(reports)
    .where(cond)
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(limit)
    .offset(offset)
    .all();
}

export function playerProfile(q: Q, userId: number) {
  const user = q.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return undefined;
  return { user, villages: userVillages(q, userId) };
}

export function villageRankings(q: Q, limit: number, offset: number) {
  return q
    .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y, pop: villages.pop, owner: users.username, ownerId: users.id })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .orderBy(desc(villages.pop), asc(villages.id))
    .limit(limit)
    .offset(offset)
    .all();
}

export function heroRankings(q: Q, limit: number, offset: number) {
  return q
    .select({ name: heroes.name, level: heroes.level, xp: heroes.xp, owner: users.username, ownerId: users.id, tribe: users.tribe })
    .from(heroes)
    .innerJoin(users, eq(users.id, heroes.userId))
    .orderBy(desc(heroes.xp), asc(heroes.id))
    .limit(limit)
    .offset(offset)
    .all();
}
