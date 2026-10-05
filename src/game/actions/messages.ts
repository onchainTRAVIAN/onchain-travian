import { and, desc, eq, inArray, or } from 'drizzle-orm';
import type { DB } from '../../db/index.js';
import { messages, users } from '../../db/schema.js';
import { assertGame } from '../errors.js';

export function sendMessage(db: DB, fromUserId: number, toUsername: string, subject: string, body: string, now: number): number {
  const to = db.select({ id: users.id }).from(users).where(eq(users.usernameLower, toUsername.toLowerCase())).get();
  assertGame(to, `No player called "${toUsername}"`);
  assertGame(to.id !== fromUserId, 'You cannot write to yourself');
  return db
    .insert(messages)
    .values({ fromUserId, toUserId: to.id, subject, body, createdAt: now })
    .returning({ id: messages.id })
    .get().id;
}

export function inbox(db: DB, userId: number, limit = 50, offset = 0) {
  return db
    .select({ m: messages, from: users.username })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.fromUserId))
    .where(and(eq(messages.toUserId, userId), eq(messages.deletedByRecipient, false)))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit)
    .offset(offset)
    .all();
}

export function outbox(db: DB, userId: number, limit = 50, offset = 0) {
  return db
    .select({ m: messages, to: users.username })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.toUserId))
    .where(and(eq(messages.fromUserId, userId), eq(messages.deletedBySender, false)))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit)
    .offset(offset)
    .all();
}

/** Read a message the user sent or received; marks it read for the recipient. */
export function readMessage(db: DB, userId: number, id: number) {
  const row = db
    .select({ m: messages })
    .from(messages)
    .where(and(eq(messages.id, id), or(eq(messages.toUserId, userId), eq(messages.fromUserId, userId))))
    .get();
  assertGame(row, 'Message not found');
  const m = row.m;
  if (m.toUserId === userId && !m.isRead) db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).run();
  const from = m.fromUserId !== null ? db.select({ u: users.username }).from(users).where(eq(users.id, m.fromUserId)).get()?.u : undefined;
  const to = db.select({ u: users.username }).from(users).where(eq(users.id, m.toUserId)).get()?.u;
  return { ...m, fromName: from ?? 'System', toName: to ?? 'Unknown' };
}

export function deleteMessage(db: DB, userId: number, id: number): void {
  const m = db.select().from(messages).where(eq(messages.id, id)).get();
  assertGame(m && (m.toUserId === userId || m.fromUserId === userId), 'Message not found');
  if (m.toUserId === userId) db.update(messages).set({ deletedByRecipient: true }).where(eq(messages.id, id)).run();
  if (m.fromUserId === userId) db.update(messages).set({ deletedBySender: true }).where(eq(messages.id, id)).run();
}

/** Bulk actions on the mailbox; ids the player can't touch are skipped. */
export function deleteMessages(db: DB, userId: number, ids: number[]): number {
  let n = 0;
  db.transaction((tx) => {
    for (const id of ids) {
      const m = tx.select().from(messages).where(eq(messages.id, id)).get();
      if (!m || (m.toUserId !== userId && m.fromUserId !== userId)) continue;
      if (m.toUserId === userId) tx.update(messages).set({ deletedByRecipient: true }).where(eq(messages.id, id)).run();
      if (m.fromUserId === userId) tx.update(messages).set({ deletedBySender: true }).where(eq(messages.id, id)).run();
      n++;
    }
  });
  return n;
}

export function markMessagesRead(db: DB, userId: number, ids: number[] | 'all'): void {
  const mine = eq(messages.toUserId, userId);
  db.update(messages).set({ isRead: true }).where(ids === 'all' ? mine : and(mine, inArray(messages.id, ids.length ? ids : [-1]))).run();
}
