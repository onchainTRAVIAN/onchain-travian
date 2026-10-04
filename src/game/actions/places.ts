import { and, asc, eq } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { savedPlaces, villages } from '../../db/schema.js';
import { assertGame } from '../errors.js';

export const MAX_SAVED_PLACES = 30;

export type SavedPlace = typeof savedPlaces.$inferSelect;

/** Remember a destination (updates the name if it's already saved). */
export function savePlace(db: DB, userId: number, x: number, y: number, label: string, now: number): void {
  db.transaction((tx) => {
    const name = label.trim().slice(0, 30);
    const existing = tx.select().from(savedPlaces).where(and(eq(savedPlaces.userId, userId), eq(savedPlaces.x, x), eq(savedPlaces.y, y))).get();
    if (existing) {
      if (name) tx.update(savedPlaces).set({ label: name }).where(eq(savedPlaces.id, existing.id)).run();
      return;
    }
    const count = tx.select({ id: savedPlaces.id }).from(savedPlaces).where(eq(savedPlaces.userId, userId)).all().length;
    assertGame(count < MAX_SAVED_PLACES, `You can save at most ${MAX_SAVED_PLACES} places`);
    const v = tx.select({ name: villages.name }).from(villages).where(and(eq(villages.x, x), eq(villages.y, y))).get();
    tx.insert(savedPlaces).values({ userId, x, y, label: name || v?.name || `(${x}|${y})`, createdAt: now }).run();
  });
}

export function deletePlace(db: DB, userId: number, id: number): void {
  const r = db.delete(savedPlaces).where(and(eq(savedPlaces.id, id), eq(savedPlaces.userId, userId))).run();
  assertGame(r.changes > 0, 'Place not found');
}

export function placesOf(q: Q, userId: number): SavedPlace[] {
  return q.select().from(savedPlaces).where(eq(savedPlaces.userId, userId)).orderBy(asc(savedPlaces.label)).all();
}
