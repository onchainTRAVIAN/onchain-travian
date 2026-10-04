import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { Q } from '../db/index.js';
import { perks } from '../db/schema.js';
import { RESOURCE_KEYS, type ResourceKey } from './rules/resources.js';

/**
 * Every bonus in the game flows through here: premium purchases, token-holder tiers,
 * alliance bonuses, events. Formulas take a `Modifiers` object, so adding a new bonus
 * source never requires touching game logic.
 */
export interface Modifiers {
  /** >1 = faster construction. */
  buildSpeed: number;
  /** >1 = faster troop training. */
  trainSpeed: number;
  /** Per-resource production multiplier. */
  production: Record<ResourceKey, number>;
  /** <1 = cheaper troops. */
  troopCost: number;
  /** >1 = troops carry more loot. */
  troopCarry: number;
  attack: number;
  defense: number;
  /** Buildings that can be under construction at the same time. */
  buildQueue: number;
}

export const PERK_KINDS = [
  'build_speed',
  'train_speed',
  'production_all',
  'production_wood',
  'production_clay',
  'production_iron',
  'production_crop',
  'troop_cost',
  'troop_carry',
  'attack',
  'defense',
  'build_queue',
] as const;
export type PerkKind = (typeof PERK_KINDS)[number];

export const PERK_LABEL: Record<PerkKind, string> = {
  build_speed: 'Faster construction',
  train_speed: 'Faster training',
  production_all: 'More production (all)',
  production_wood: 'More wood',
  production_clay: 'More clay',
  production_iron: 'More iron',
  production_crop: 'More crop',
  troop_cost: 'Cheaper troops',
  troop_carry: 'Bigger loot capacity',
  attack: 'Attack bonus',
  defense: 'Defence bonus',
  build_queue: 'Extra build slot',
};

/** Hard caps so stacked perks can never break the game (fractions, e.g. 0.5 = +50%). */
export const PERK_CAPS: Record<PerkKind, number> = {
  build_speed: 1,
  train_speed: 1,
  production_all: 0.5,
  production_wood: 0.5,
  production_clay: 0.5,
  production_iron: 0.5,
  production_crop: 0.5,
  troop_cost: 0.3,
  troop_carry: 0.5,
  attack: 0.2,
  defense: 0.2,
  build_queue: 2,
};

export function defaultModifiers(): Modifiers {
  return {
    buildSpeed: 1,
    trainSpeed: 1,
    production: { wood: 1, clay: 1, iron: 1, crop: 1 },
    troopCost: 1,
    troopCarry: 1,
    attack: 1,
    defense: 1,
    buildQueue: 1,
  };
}

export interface PerkRow {
  kind: string;
  value: number;
}

/** Pure: fold perk rows into modifiers. Exported for tests. */
export function foldPerks(rows: PerkRow[]): Modifiers {
  const sums = new Map<PerkKind, number>();
  for (const r of rows) {
    if (!(PERK_KINDS as readonly string[]).includes(r.kind)) continue;
    const k = r.kind as PerkKind;
    sums.set(k, (sums.get(k) ?? 0) + r.value);
  }
  const get = (k: PerkKind) => Math.max(0, Math.min(PERK_CAPS[k], sums.get(k) ?? 0));
  const m = defaultModifiers();
  m.buildSpeed = 1 + get('build_speed');
  m.trainSpeed = 1 + get('train_speed');
  for (const k of RESOURCE_KEYS) m.production[k] = 1 + get('production_all') + get(`production_${k}`);
  m.troopCost = 1 - get('troop_cost');
  m.troopCarry = 1 + get('troop_carry');
  m.attack = 1 + get('attack');
  m.defense = 1 + get('defense');
  m.buildQueue = 1 + Math.floor(get('build_queue'));
  return m;
}

export function activePerks(q: Q, userId: number, now: number) {
  return q
    .select()
    .from(perks)
    .where(and(eq(perks.userId, userId), or(isNull(perks.expiresAt), gt(perks.expiresAt, now))))
    .all();
}

export function getModifiers(q: Q, userId: number | null, now: number): Modifiers {
  if (userId === null) return defaultModifiers();
  return foldPerks(activePerks(q, userId, now));
}
