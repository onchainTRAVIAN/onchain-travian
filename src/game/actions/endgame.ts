import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { allianceMembers, alliances, artifacts, slots, tiles, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { WONDER_MAX_LEVEL, WONDER_SLOT } from '../rules/buildings.js';
import { emptyUnits } from '../rules/units.js';
import { createVillage, getMeta, setMeta } from '../engine/world.js';
import { refreshPopulation, setTroopsAt, type VillageState } from '../engine/state.js';
import { ARTIFACT_INFO, activeEffects, type ArtifactKind, type ArtifactSize } from '../engine/artifacts.js';

export { ARTIFACT_INFO, artifactValue } from '../engine/artifacts.js';
export type { ArtifactKind, ArtifactSize } from '../engine/artifacts.js';

type ArtifactRow = typeof artifacts.$inferSelect;

/** Treasury level needed to hold an artifact of this size. */
export function treasuryNeeded(size: ArtifactSize): number {
  return size === 'small' ? 10 : 20;
}

const NATAR_NAME = 'Natars';

/**
 * The Natar NPC account (created on first use; it can't log in). Found by its tribe - never by
 * name, so a player can't impersonate it (the name is also reserved at registration).
 */
export function natarUser(q: Q, now: number): number {
  const u = q.select({ id: users.id }).from(users).where(eq(users.tribe, 'natars')).get();
  if (u) return u.id;
  return q
    .insert(users)
    .values({ username: NATAR_NAME, usernameLower: NATAR_NAME.toLowerCase(), passwordHash: '!locked', tribe: 'natars', role: 'player', createdAt: now, lastSeenAt: now, protectedUntil: 0, cultureAt: now })
    .returning({ id: users.id })
    .get().id;
}

function freeSpot(q: Q, attempt: number): { x: number; y: number } | undefined {
  const R = config.MAP_RADIUS;
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(Math.random() * (2 * R + 1)) - R;
    const y = Math.floor(Math.random() * (2 * R + 1)) - R;
    const t = q.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
    // Keep Natar strongholds away from the very centre where new players start.
    if (t && t.kind === 'field' && t.villageId === null && Math.max(Math.abs(x), Math.abs(y)) > Math.min(R - 1, 6 + (attempt % 5))) return { x, y };
  }
  return undefined;
}

/** A Natar stronghold: Treasury, Main Building and a strong garrison scaled by `strength`. */
function natarVillage(q: Q, natars: number, name: string, strength: number, treasury: number, now: number, wonder = false): number | undefined {
  const spot = freeSpot(q, strength);
  if (!spot) return undefined;
  const id = createVillage(q, { userId: natars, name, x: spot.x, y: spot.y, isCapital: false, now });
  const set = (slot: number, building: string, level: number) =>
    q.update(slots).set({ building, level }).where(and(eq(slots.villageId, id), eq(slots.slot, slot))).run();
  set(26, 'main', 20);
  if (treasury > 0) set(27, 'treasury', treasury);
  set(28, 'warehouse', 20);
  set(29, 'granary', 20);
  if (wonder) {
    set(WONDER_SLOT, 'wonder', 0);
    for (const s of [30, 31, 32, 33]) set(s, 'greatwarehouse', 20);
    set(34, 'greatgranary', 20);
    q.update(villages).set({ wonder: true }).where(eq(villages.id, id)).run();
  }
  const garrison = emptyUnits();
  garrison[0] = Math.round(1500 * strength);
  garrison[1] = Math.round(800 * strength);
  garrison[2] = Math.round(1000 * strength);
  garrison[4] = Math.round(300 * strength);
  garrison[5] = Math.round(300 * strength);
  setTroopsAt(q, id, id, garrison);
  refreshPopulation(q, id);
  return id;
}

const RELEASE: { kind: ArtifactKind; size: ArtifactSize }[] = [
  ...(['architect', 'boots', 'eyes', 'diet', 'trainer', 'storage', 'confusion'] as const).flatMap((kind) => [
    { kind, size: 'small' as const },
    { kind, size: 'large' as const },
  ]),
  ...(['architect', 'boots', 'eyes', 'diet', 'trainer'] as const).map((kind) => ({ kind, size: 'unique' as const })),
  { kind: 'fool', size: 'small' },
  { kind: 'fool', size: 'small' },
  { kind: 'fool', size: 'unique' },
];

const STRENGTH: Record<ArtifactSize, number> = { small: 1, large: 2, unique: 4 };

/** The Natars appear with the artifacts, each in its own guarded Treasury. */
export function releaseArtifacts(db: DB, now: number): number {
  return db.transaction((tx) => {
    if (getMeta(tx, 'artifacts_released_at')) return 0;
    const natars = natarUser(tx, now);
    let n = 0;
    for (const a of RELEASE) {
      const v = natarVillage(tx, natars, `${ARTIFACT_INFO[a.kind].name}`, STRENGTH[a.size], treasuryNeeded(a.size), now);
      if (v === undefined) continue;
      tx.insert(artifacts).values({ kind: a.kind, size: a.size, villageId: v, activeAt: now, createdAt: now }).run();
      n++;
    }
    setMeta(tx, 'artifacts_released_at', String(now));
    return n;
  });
}

/** World Wonder villages and construction plans appear (T3.6: some time after the artifacts). */
export function releaseWonders(db: DB, now: number, count = 4): number {
  return db.transaction((tx) => {
    if (getMeta(tx, 'wonders_released_at')) return 0;
    const natars = natarUser(tx, now);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const v = natarVillage(tx, natars, `World Wonder ${i + 1}`, 3, 0, now, true);
      if (v !== undefined) n++;
      const p = natarVillage(tx, natars, 'Construction plan', 3, 10, now);
      if (p !== undefined) tx.insert(artifacts).values({ kind: 'plan', size: 'large', villageId: p, activeAt: now, createdAt: now }).run();
    }
    setMeta(tx, 'wonders_released_at', String(now));
    return n;
  });
}

/** Release on schedule (ARTIFACT_DAY / WONDER_DAY days after the world started). Called every tick. */
export function processEndgame(db: DB, now: number): void {
  const started = Number(getMeta(db, 'world_started_at') ?? now);
  const day = (now - started) / 86_400_000;
  if (config.ARTIFACT_DAY > 0 && day >= config.ARTIFACT_DAY && !getMeta(db, 'artifacts_released_at')) releaseArtifacts(db, now);
  if (config.WONDER_DAY > 0 && day >= config.WONDER_DAY && !getMeta(db, 'wonders_released_at')) releaseWonders(db, now);
}

export function canBuildGreatStorage(q: Q, state: VillageState, now: number): boolean {
  return state.village.wonder || activeEffects(q, state.village.id, now).some((e) => e.kind === 'storage');
}

/* ---------------- Capturing ---------------- */

export function artifactsIn(q: Q, villageId: number): ArtifactRow[] {
  return q.select().from(artifacts).where(eq(artifacts.villageId, villageId)).all();
}

/**
 * After a won normal attack with a living hero: if the target's Treasury is destroyed, the hero
 * carries one artifact home - if the attacking village has a Treasury big enough and empty.
 * Returns a note for the report.
 */
export function tryCaptureArtifact(q: Q, attackerVillageId: number, targetVillageId: number, now: number): string | null {
  const held = artifactsIn(q, targetVillageId);
  if (held.length === 0) return null;
  const treasury = q.select({ level: slots.level }).from(slots).where(and(eq(slots.villageId, targetVillageId), eq(slots.building, 'treasury'))).get()?.level ?? 0;
  if (treasury > 0) return 'Destroy the Treasury first (catapults) to take the artifact.';
  const mine = q.select({ level: slots.level }).from(slots).where(and(eq(slots.villageId, attackerVillageId), eq(slots.building, 'treasury'))).get()?.level ?? 0;
  if (artifactsIn(q, attackerVillageId).length > 0) return 'Your Treasury already holds an artifact.';
  const a = held[0] as ArtifactRow;
  if (mine < treasuryNeeded(a.size)) return `You need a Treasury at level ${treasuryNeeded(a.size)} in this village to hold the ${ARTIFACT_INFO[a.kind].name}.`;
  q.update(artifacts)
    .set({ villageId: attackerVillageId, capturedAt: now, activeAt: now + Math.round(86_400_000 / config.WORLD_SPEED) })
    .where(eq(artifacts.id, a.id))
    .run();
  return `Your hero captured the ${ARTIFACT_INFO[a.kind].name} (${a.size})! It starts working in ${Math.round(24 / config.WORLD_SPEED * 60)} minutes.`;
}

/* ---------------- World Wonder ---------------- */

function allianceOf(q: Q, userId: number): number | null {
  return q.select({ a: allianceMembers.allianceId }).from(allianceMembers).where(eq(allianceMembers.userId, userId)).get()?.a ?? null;
}

/** Construction plans held (and active) by the player's alliance (or the player alone). */
export function plansHeld(q: Q, userId: number, now: number): { holders: number; plans: number } {
  const alliance = allianceOf(q, userId);
  const members = alliance === null ? [userId] : q.select({ u: allianceMembers.userId }).from(allianceMembers).where(eq(allianceMembers.allianceId, alliance)).all().map((r) => r.u);
  const rows = q
    .select({ owner: villages.userId })
    .from(artifacts)
    .innerJoin(villages, eq(villages.id, artifacts.villageId))
    .where(and(eq(artifacts.kind, 'plan'), inArray(villages.userId, members), lte(artifacts.activeAt, now), isNotNull(artifacts.capturedAt)))
    .all();
  return { holders: new Set(rows.map((r) => r.owner)).size, plans: rows.length };
}

/** Why the Wonder can't be raised to `level` (or undefined if it can). */
export function wonderBlocker(q: Q, state: VillageState, level: number, now: number): string | undefined {
  if (!state.village.wonder) return 'Only in a World Wonder village';
  if (state.userId === null) return 'No owner';
  const p = plansHeld(q, state.userId, now);
  if (p.plans < 1) return 'Your alliance needs a construction plan';
  if (level > 50 && p.holders < 2) return 'From level 51 a second player of your alliance must hold a construction plan';
  return undefined;
}

/** Called when a Wonder level finishes: level 100 wins the world for the builder's alliance. */
export function wonderLevelDone(q: Q, villageId: number, level: number, now: number): void {
  if (level < WONDER_MAX_LEVEL || getMeta(q, 'winner')) return;
  const v = q.select({ userId: villages.userId, name: villages.name }).from(villages).where(eq(villages.id, villageId)).get();
  if (!v || v.userId === null) return;
  const user = q.select({ name: users.username }).from(users).where(eq(users.id, v.userId)).get();
  const alliance = allianceOf(q, v.userId);
  const tag = alliance !== null ? q.select({ tag: alliances.tag, name: alliances.name }).from(alliances).where(eq(alliances.id, alliance)).get() : undefined;
  setMeta(q, 'winner', JSON.stringify({ userId: v.userId, user: user?.name ?? '?', alliance: tag ? `[${tag.tag}] ${tag.name}` : null, village: v.name, at: now }));
}

export function winner(q: Q): { user: string; alliance: string | null; village: string; at: number } | null {
  const w = getMeta(q, 'winner');
  return w ? (JSON.parse(w) as { user: string; alliance: string | null; village: string; at: number }) : null;
}

/** Overview for the endgame page. */
export function endgameOverview(q: Q) {
  const arts = q
    .select({ a: artifacts, village: villages.name, x: villages.x, y: villages.y, owner: users.username, tribe: users.tribe })
    .from(artifacts)
    .leftJoin(villages, eq(villages.id, artifacts.villageId))
    .leftJoin(users, eq(users.id, villages.userId))
    .all();
  const wonders = q
    .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y, owner: users.username, tribe: users.tribe, level: slots.level })
    .from(villages)
    .innerJoin(slots, and(eq(slots.villageId, villages.id), eq(slots.slot, WONDER_SLOT)))
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.wonder, true))
    .all()
    .sort((a, b) => b.level - a.level);
  return {
    artifactsReleasedAt: Number(getMeta(q, 'artifacts_released_at') ?? 0) || null,
    wondersReleasedAt: Number(getMeta(q, 'wonders_released_at') ?? 0) || null,
    artifacts: arts,
    wonders,
    winner: winner(q),
  };
}

