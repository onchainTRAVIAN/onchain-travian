import { and, desc, eq, or, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { allianceDiplomacy, allianceInvites, allianceMembers, alliances, slots, users, villages } from '../../db/schema.js';
import { spend } from './credits.js';
import { assertGame } from '../errors.js';

export type AllianceRow = typeof alliances.$inferSelect;
export type Role = 'leader' | 'officer' | 'member';

export const MEMBERS_PER_EMBASSY_LEVEL = 3;

function bestEmbassy(q: Q, userId: number): number {
  return (
    q.select({ l: sql<number>`coalesce(max(${slots.level}), 0)` })
      .from(slots)
      .innerJoin(villages, eq(villages.id, slots.villageId))
      .where(and(eq(villages.userId, userId), eq(slots.building, 'embassy')))
      .get()?.l ?? 0
  );
}

export function membership(q: Q, userId: number) {
  return q
    .select({ m: allianceMembers, a: alliances })
    .from(allianceMembers)
    .innerJoin(alliances, eq(alliances.id, allianceMembers.allianceId))
    .where(eq(allianceMembers.userId, userId))
    .get();
}

function requireRole(q: Q, userId: number, roles: Role[]) {
  const m = membership(q, userId);
  assertGame(m, 'You are not in an alliance');
  assertGame(roles.includes(m.m.role), 'Only alliance leaders can do that');
  return m;
}

export function memberCount(q: Q, allianceId: number): number {
  return q.select({ n: sql<number>`count(*)` }).from(allianceMembers).where(eq(allianceMembers.allianceId, allianceId)).get()?.n ?? 0;
}

/** Max members = 3 per Embassy level of the leader (at least 3). */
export function allianceCapacity(q: Q, allianceId: number): number {
  const leader = q
    .select({ userId: allianceMembers.userId })
    .from(allianceMembers)
    .where(and(eq(allianceMembers.allianceId, allianceId), eq(allianceMembers.role, 'leader')))
    .get();
  return Math.max(MEMBERS_PER_EMBASSY_LEVEL, (leader ? bestEmbassy(q, leader.userId) : 0) * MEMBERS_PER_EMBASSY_LEVEL);
}

/** Gold price for founding an alliance. */
export const ALLIANCE_FOUND_PRICE = 280;

export function createAlliance(db: DB, userId: number, name: string, tag: string, now: number): AllianceRow {
  return db.transaction((tx) => {
    assertGame(!membership(tx, userId), 'Leave your current alliance first');
    assertGame(bestEmbassy(tx, userId) >= 3, 'You need an Embassy at level 3 to found an alliance');
    const taken = tx.select({ id: alliances.id }).from(alliances).where(eq(alliances.tagLower, tag.toLowerCase())).get();
    assertGame(!taken, 'That tag is already taken');
    spend(tx, userId, ALLIANCE_FOUND_PRICE, `Founded alliance [${tag}]`, now);
    const a = tx.insert(alliances).values({ name, tag, tagLower: tag.toLowerCase(), founderId: userId, createdAt: now }).returning().get();
    tx.insert(allianceMembers).values({ userId, allianceId: a.id, role: 'leader', joinedAt: now }).run();
    tx.delete(allianceInvites).where(eq(allianceInvites.userId, userId)).run();
    return a;
  });
}

export function invitePlayer(db: DB, userId: number, username: string, now: number): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    const target = tx.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).get();
    assertGame(target, `No player called "${username}"`);
    assertGame(!membership(tx, target.id), `${target.username} is already in an alliance`);
    tx.insert(allianceInvites).values({ allianceId: m.a.id, userId: target.id, invitedBy: userId, createdAt: now }).onConflictDoNothing().run();
  });
}

export function cancelInvite(db: DB, userId: number, targetUserId: number): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    tx.delete(allianceInvites).where(and(eq(allianceInvites.allianceId, m.a.id), eq(allianceInvites.userId, targetUserId))).run();
  });
}

export function invitesFor(q: Q, userId: number) {
  return q
    .select({ a: alliances, createdAt: allianceInvites.createdAt })
    .from(allianceInvites)
    .innerJoin(alliances, eq(alliances.id, allianceInvites.allianceId))
    .where(eq(allianceInvites.userId, userId))
    .all();
}

export function acceptInvite(db: DB, userId: number, allianceId: number, now: number): void {
  db.transaction((tx) => {
    const inv = tx.select().from(allianceInvites).where(and(eq(allianceInvites.allianceId, allianceId), eq(allianceInvites.userId, userId))).get();
    assertGame(inv, 'Invitation not found');
    assertGame(!membership(tx, userId), 'Leave your current alliance first');
    assertGame(bestEmbassy(tx, userId) >= 1, 'You need an Embassy to join an alliance');
    assertGame(memberCount(tx, allianceId) < allianceCapacity(tx, allianceId), 'The alliance is full');
    tx.insert(allianceMembers).values({ userId, allianceId, role: 'member', joinedAt: now }).run();
    tx.delete(allianceInvites).where(eq(allianceInvites.userId, userId)).run();
  });
}

export function declineInvite(db: DB, userId: number, allianceId: number): void {
  db.delete(allianceInvites).where(and(eq(allianceInvites.allianceId, allianceId), eq(allianceInvites.userId, userId))).run();
}

/** Leaving as the last member disbands the alliance; a leaving leader hands over to the oldest officer/member. */
export function leaveAlliance(db: DB, userId: number): void {
  db.transaction((tx) => {
    const m = membership(tx, userId);
    assertGame(m, 'You are not in an alliance');
    tx.delete(allianceMembers).where(eq(allianceMembers.userId, userId)).run();
    const rest = tx.select().from(allianceMembers).where(eq(allianceMembers.allianceId, m.a.id)).orderBy(allianceMembers.joinedAt).all();
    if (rest.length === 0) {
      tx.delete(alliances).where(eq(alliances.id, m.a.id)).run();
      return;
    }
    if (m.m.role === 'leader') {
      const next = rest.find((r) => r.role === 'officer') ?? rest[0];
      if (next) tx.update(allianceMembers).set({ role: 'leader' }).where(eq(allianceMembers.userId, next.userId)).run();
    }
  });
}

export function kickMember(db: DB, userId: number, targetUserId: number): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    const t = membership(tx, targetUserId);
    assertGame(t && t.a.id === m.a.id, 'Not a member of your alliance');
    assertGame(targetUserId !== userId, 'Use "Leave alliance" instead');
    assertGame(t.m.role !== 'leader', 'The leader cannot be removed');
    assertGame(m.m.role === 'leader' || t.m.role === 'member', 'Officers can only remove members');
    tx.delete(allianceMembers).where(eq(allianceMembers.userId, targetUserId)).run();
  });
}

export function setRole(db: DB, userId: number, targetUserId: number, role: Role): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader']);
    const t = membership(tx, targetUserId);
    assertGame(t && t.a.id === m.a.id, 'Not a member of your alliance');
    assertGame(targetUserId !== userId, 'Choose another member');
    if (role === 'leader') tx.update(allianceMembers).set({ role: 'officer' }).where(eq(allianceMembers.userId, userId)).run();
    tx.update(allianceMembers).set({ role }).where(eq(allianceMembers.userId, targetUserId)).run();
  });
}

export function updateDescription(db: DB, userId: number, description: string): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    tx.update(alliances).set({ description }).where(eq(alliances.id, m.a.id)).run();
  });
}

export function allianceMembersList(q: Q, allianceId: number) {
  const pop = sql<number>`coalesce((select sum(v.pop) from villages v where v.user_id = "users"."id"), 0)`;
  return q
    .select({
      userId: users.id,
      username: users.username,
      tribe: users.tribe,
      role: allianceMembers.role,
      lastSeenAt: users.lastSeenAt,
      avatarAt: users.avatarAt,
      pop,
      villages: sql<number>`(select count(*) from villages v where v.user_id = "users"."id")`,
    })
    .from(allianceMembers)
    .innerJoin(users, eq(users.id, allianceMembers.userId))
    .where(eq(allianceMembers.allianceId, allianceId))
    .orderBy(desc(pop))
    .all();
}

export type AllianceRankKind = 'population' | 'attack' | 'defense';

/** Alliances by members' total population, attack points or defence points. */
export function allianceRankings(q: Q, limit: number, offset: number, kind: AllianceRankKind = 'population') {
  const pop = sql<number>`coalesce((select sum(v.pop) from villages v join alliance_members am on am.user_id = v.user_id where am.alliance_id = "alliances"."id"), 0)`;
  const off = sql<number>`coalesce((select sum(u.off_points) from users u join alliance_members am on am.user_id = u.id where am.alliance_id = "alliances"."id"), 0)`;
  const def = sql<number>`coalesce((select sum(u.def_points) from users u join alliance_members am on am.user_id = u.id where am.alliance_id = "alliances"."id"), 0)`;
  return q
    .select({
      id: alliances.id,
      name: alliances.name,
      tag: alliances.tag,
      members: sql<number>`(select count(*) from alliance_members m where m.alliance_id = "alliances"."id")`,
      pop,
      off,
      def,
    })
    .from(alliances)
    .orderBy(desc(kind === 'attack' ? off : kind === 'defense' ? def : pop), alliances.id)
    .limit(limit)
    .offset(offset)
    .all();
}

export function allianceById(q: Q, id: number): AllianceRow | undefined {
  return q.select().from(alliances).where(eq(alliances.id, id)).get();
}

export function allianceTagOf(q: Q, userId: number): { id: number; tag: string } | undefined {
  const m = membership(q, userId);
  return m ? { id: m.a.id, tag: m.a.tag } : undefined;
}

/* ---------- Diplomacy ---------- */

export type DiplomacyKind = 'confed' | 'nap' | 'war';

export function proposeDiplomacy(db: DB, userId: number, targetTag: string, kind: DiplomacyKind, now: number): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    const other = tx.select().from(alliances).where(eq(alliances.tagLower, targetTag.toLowerCase())).get();
    assertGame(other, `No alliance with tag "${targetTag}"`);
    assertGame(other.id !== m.a.id, 'Choose another alliance');
    const existing = tx
      .select()
      .from(allianceDiplomacy)
      .where(or(and(eq(allianceDiplomacy.fromId, m.a.id), eq(allianceDiplomacy.toId, other.id)), and(eq(allianceDiplomacy.fromId, other.id), eq(allianceDiplomacy.toId, m.a.id))))
      .get();
    assertGame(!existing, 'There is already a treaty or proposal with this alliance');
    // War needs no agreement.
    tx.insert(allianceDiplomacy).values({ fromId: m.a.id, toId: other.id, kind, status: kind === 'war' ? 'active' : 'proposed', createdAt: now }).run();
  });
}

export function answerDiplomacy(db: DB, userId: number, id: number, accept: boolean): void {
  db.transaction((tx) => {
    const m = requireRole(tx, userId, ['leader', 'officer']);
    const d = tx.select().from(allianceDiplomacy).where(eq(allianceDiplomacy.id, id)).get();
    assertGame(d && (d.toId === m.a.id || d.fromId === m.a.id), 'Treaty not found');
    if (accept) {
      assertGame(d.toId === m.a.id && d.status === 'proposed', 'Only the other alliance can accept');
      tx.update(allianceDiplomacy).set({ status: 'active' }).where(eq(allianceDiplomacy.id, id)).run();
    } else {
      tx.delete(allianceDiplomacy).where(eq(allianceDiplomacy.id, id)).run();
    }
  });
}

export function diplomacyOf(q: Q, allianceId: number) {
  const rows = q
    .select()
    .from(allianceDiplomacy)
    .where(or(eq(allianceDiplomacy.fromId, allianceId), eq(allianceDiplomacy.toId, allianceId)))
    .orderBy(desc(allianceDiplomacy.createdAt))
    .all();
  return rows.map((d) => {
    const otherId = d.fromId === allianceId ? d.toId : d.fromId;
    const other = allianceById(q, otherId);
    return { ...d, otherId, otherTag: other?.tag ?? '?', otherName: other?.name ?? '?', incoming: d.toId === allianceId };
  });
}
