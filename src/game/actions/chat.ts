import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { chatMessages, users } from '../../db/schema.js';
import { assertGame } from '../errors.js';
import { membership } from './alliance.js';

export const CHAT_MAX_LENGTH = 300;
/** Minimum time between two messages from one player. */
/** Wait between two chat messages (admins are exempt so they can moderate). */
export const CHAT_COOLDOWN_MS = 30_000;

export type Channel = { kind: 'global' } | { kind: 'alliance'; allianceId: number };

function channelCond(c: Channel) {
  return c.kind === 'global' ? isNull(chatMessages.allianceId) : eq(chatMessages.allianceId, c.allianceId);
}

/** Resolve which channel a player may use ("alliance" only if they are in one). */
export function channelFor(q: Q, userId: number, requested: string | undefined): Channel {
  if (requested === 'alliance') {
    const m = membership(q, userId);
    assertGame(m, 'Join an alliance to use alliance chat');
    return { kind: 'alliance', allianceId: m.a.id };
  }
  return { kind: 'global' };
}

/** Milliseconds until this player may post again (0 = now). */
export function chatCooldownLeft(q: Q, userId: number, now: number): number {
  const last = q
    .select({ at: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), gt(chatMessages.createdAt, now - CHAT_COOLDOWN_MS)))
    .orderBy(desc(chatMessages.createdAt))
    .get();
  return last ? last.at + CHAT_COOLDOWN_MS - now : 0;
}

export function postChat(db: DB, userId: number, channel: Channel, body: string, now: number): void {
  db.transaction((tx) => {
    const u = tx.select().from(users).where(eq(users.id, userId)).get();
    assertGame(u, 'Player not found');
    assertGame(u.mutedUntil <= now, 'You are muted in chat for now');
    const text = body.replace(/\s+/g, ' ').trim();
    assertGame(text.length > 0, 'Write something first');
    assertGame(text.length <= CHAT_MAX_LENGTH, `Messages can be at most ${CHAT_MAX_LENGTH} characters`);
    const wait = u.role === 'admin' ? 0 : chatCooldownLeft(tx, userId, now);
    assertGame(wait <= 0, `Slow down a little - you can write again in ${Math.ceil(wait / 1000)} s`);
    tx.insert(chatMessages).values({ userId, allianceId: channel.kind === 'alliance' ? channel.allianceId : null, body: text, createdAt: now }).run();
  });
}

export function chatHistory(q: Q, channel: Channel, limit = 50, beforeId?: number) {
  return q
    .select({ id: chatMessages.id, body: chatMessages.body, createdAt: chatMessages.createdAt, userId: users.id, username: users.username, role: users.role })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .where(and(channelCond(channel), eq(chatMessages.deleted, false), beforeId ? lt(chatMessages.id, beforeId) : undefined))
    .orderBy(desc(chatMessages.id))
    .limit(limit)
    .all();
}

export function deleteChatMessage(db: DB, id: number): void {
  db.update(chatMessages).set({ deleted: true }).where(eq(chatMessages.id, id)).run();
}
