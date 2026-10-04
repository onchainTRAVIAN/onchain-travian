import { and, eq, isNotNull, lte } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { artifacts, villages } from '../../db/schema.js';

/* ---------------- Artifact data (T3.6) ---------------- */

export type ArtifactKind = (typeof artifacts.$inferSelect)['kind'];
export type ArtifactSize = (typeof artifacts.$inferSelect)['size'];

export const ARTIFACT_INFO: Record<ArtifactKind, { name: string; effect: string; values: Record<ArtifactSize, number> }> = {
  architect: { name: "Architects' secret", effect: 'buildings and walls are sturdier against siege', values: { small: 4, large: 3, unique: 5 } },
  boots: { name: 'Boots of the mercenary', effect: 'troops move faster', values: { small: 2, large: 1.5, unique: 3 } },
  eyes: { name: 'Eyes of the eagle', effect: 'scouts are stronger', values: { small: 5, large: 3, unique: 10 } },
  diet: { name: 'Diet control', effect: 'troops eat less crop', values: { small: 0.5, large: 0.75, unique: 0.5 } },
  trainer: { name: "Trainers' talent", effect: 'troops train faster', values: { small: 0.5, large: 0.75, unique: 0.5 } },
  storage: { name: 'Storage master plan', effect: 'Great Warehouse and Great Granary can be built', values: { small: 1, large: 1, unique: 1 } },
  confusion: { name: "Rivals' confusion", effect: 'bigger crannies; enemy catapults hit at random', values: { small: 3, large: 2, unique: 6 } },
  fool: { name: 'Artifact of the fool', effect: 'a random effect that changes every day', values: { small: 1, large: 1, unique: 1 } },
  plan: { name: 'World Wonder construction plan', effect: 'lets its alliance build a World Wonder', values: { small: 1, large: 1, unique: 1 } },
};

/* ---------------- Effects ---------------- */

type ArtifactRow = typeof artifacts.$inferSelect;

/** The fool's effect today: a kind and a multiplier that may help or hurt. */
function foolToday(a: ArtifactRow, now: number): { kind: ArtifactKind; value: number } {
  const day = Math.floor(now / 86_400_000);
  const kinds: ArtifactKind[] = ['architect', 'boots', 'eyes', 'diet', 'trainer', 'confusion'];
  const kind = kinds[(day + a.id) % kinds.length] ?? 'boots';
  const good = (day * 7 + a.id) % 3 !== 0;
  const base = ARTIFACT_INFO[kind].values[a.size === 'unique' ? 'unique' : 'small'];
  // On a bad day the effect turns against its holder (e.g. troops slower, or eating twice as much).
  return { kind, value: good ? base : 1 / base };
}

/**
 * Active artifacts working for a village: small ones held in it, large/unique ones held anywhere
 * by its owner. Returns [kind, value] pairs (the fool resolved to today's effect).
 */
export function activeEffects(q: Q, villageId: number, now: number): { kind: ArtifactKind; value: number; scope: 'village' | 'account' }[] {
  const v = q.select({ userId: villages.userId }).from(villages).where(eq(villages.id, villageId)).get();
  if (!v || v.userId === null) return [];
  const rows = q
    .select({ a: artifacts })
    .from(artifacts)
    .innerJoin(villages, eq(villages.id, artifacts.villageId))
    .where(and(eq(villages.userId, v.userId), lte(artifacts.activeAt, now), isNotNull(artifacts.capturedAt)))
    .all()
    .map((r) => r.a)
    .filter((a) => a.size !== 'small' || a.villageId === villageId);
  return rows.map((a) => {
    const scope = a.size === 'small' ? ('village' as const) : ('account' as const);
    if (a.kind === 'fool') return { ...foolToday(a, now), scope };
    return { kind: a.kind, value: ARTIFACT_INFO[a.kind].values[a.size], scope };
  });
}

/** Strongest multiplier of one artifact kind for a village (1 = none). For diet/trainer lower is better. */
export function artifactValue(q: Q, villageId: number, kind: ArtifactKind, now: number): number {
  const vals = activeEffects(q, villageId, now).filter((e) => e.kind === kind).map((e) => e.value);
  if (vals.length === 0) return 1;
  return kind === 'diet' || kind === 'trainer' ? Math.min(...vals) : Math.max(...vals);
}

