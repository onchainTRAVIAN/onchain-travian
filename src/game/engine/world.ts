import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { meta, slots, tiles, troops, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { clock } from '../../clock.js';
import { generateTile, layoutFields, type FieldLayout } from '../rules/map.js';
import { MAIN_SLOT, RALLY_SLOT, TOWN_SLOT_FIRST, TOWN_SLOT_LAST, WALL_FOR, WALL_SLOT } from '../rules/buildings.js';
import { emptyUnits } from '../rules/units.js';
import { refreshPopulation } from './state.js';

export const START_RESOURCES = 750;

export function getMeta(q: Q, key: string): string | undefined {
  return q.select().from(meta).where(eq(meta.key, key)).get()?.value;
}

export function setMeta(q: Q, key: string, value: string): void {
  q.insert(meta).values({ key, value }).onConflictDoUpdate({ target: meta.key, set: { value } }).run();
}

/** Generate the map once. Safe to call on every boot. */
export function ensureWorld(db: DB): void {
  if (getMeta(db, 'world_seed')) return;
  const seed = Math.floor(Math.random() * 2 ** 31);
  const R = config.MAP_RADIUS;
  db.transaction((tx) => {
    for (let x = -R; x <= R; x++) {
      for (let y = -R; y <= R; y++) {
        const t = generateTile(x, y, seed);
        tx.insert(tiles).values({ x, y, kind: t.kind, layout: t.layout, oasis: t.oasis }).run();
      }
    }
    setMeta(tx, 'world_seed', String(seed));
    setMeta(tx, 'world_radius', String(R));
    setMeta(tx, 'world_started_at', String(clock.now()));
  });
}

/** Pick a free 4-4-4-6 tile, spreading new players outward as the world fills up. */
export function findSpawnTile(q: Q): { x: number; y: number } | undefined {
  const count = q.select({ n: sql<number>`count(*)` }).from(villages).get()?.n ?? 0;
  const R = config.MAP_RADIUS;
  let ring = Math.min(R, Math.max(3, Math.round(3 + Math.sqrt(count) * 1.6)));
  for (let attempt = 0; attempt < 8; attempt++) {
    const inner = Math.max(0, ring - 4);
    const outer = Math.min(R, ring + 4);
    const tile = q
      .select({ x: tiles.x, y: tiles.y })
      .from(tiles)
      .where(
        and(
          eq(tiles.kind, 'field'),
          eq(tiles.layout, '4-4-4-6'),
          isNull(tiles.villageId),
          sql`(${tiles.x} * ${tiles.x} + ${tiles.y} * ${tiles.y}) BETWEEN ${inner * inner} AND ${outer * outer}`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(1)
      .get();
    if (tile) return tile;
    ring = Math.min(R, ring + 6);
  }
  return q
    .select({ x: tiles.x, y: tiles.y })
    .from(tiles)
    .where(and(eq(tiles.kind, 'field'), isNull(tiles.villageId)))
    .orderBy(sql`random()`)
    .limit(1)
    .get();
}

export function createVillage(
  q: Q,
  opts: { userId: number; name: string; x: number; y: number; isCapital: boolean; now: number },
): number {
  const tile = q.select().from(tiles).where(and(eq(tiles.x, opts.x), eq(tiles.y, opts.y))).get();
  if (!tile || tile.kind !== 'field' || tile.villageId !== null) throw new Error('Tile not available');
  const layout = (tile.layout ?? '4-4-4-6') as FieldLayout;

  const v = q
    .insert(villages)
    .values({
      userId: opts.userId,
      name: opts.name,
      x: opts.x,
      y: opts.y,
      isCapital: opts.isCapital,
      wood: START_RESOURCES,
      clay: START_RESOURCES,
      iron: START_RESOURCES,
      crop: START_RESOURCES,
      resAt: opts.now,
      createdAt: opts.now,
    })
    .returning({ id: villages.id })
    .get();

  const fields = layoutFields(layout);
  const rows: (typeof slots.$inferInsert)[] = fields.map((building, i) => ({ villageId: v.id, slot: i + 1, building, level: 0 }));
  for (let s = TOWN_SLOT_FIRST; s <= TOWN_SLOT_LAST; s++) {
    rows.push({ villageId: v.id, slot: s, building: s === MAIN_SLOT ? 'main' : null, level: s === MAIN_SLOT ? 1 : 0 });
  }
  rows.push({ villageId: v.id, slot: RALLY_SLOT, building: 'rally', level: 0 });
  const tribe = q.select({ tribe: users.tribe }).from(users).where(eq(users.id, opts.userId)).get()?.tribe ?? 'romans';
  rows.push({ villageId: v.id, slot: WALL_SLOT, building: tribe === 'natars' ? null : WALL_FOR[tribe], level: 0 });
  q.insert(slots).values(rows).run();
  q.insert(troops).values({ villageId: v.id, ownerVillageId: v.id, units: JSON.stringify(emptyUnits()) }).run();
  q.update(tiles).set({ villageId: v.id }).where(and(eq(tiles.x, opts.x), eq(tiles.y, opts.y))).run();
  refreshPopulation(q, v.id);
  return v.id;
}
