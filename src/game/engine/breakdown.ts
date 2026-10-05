import { and, eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { tiles } from '../../db/schema.js';
import { config } from '../../config.js';
import { BUILDINGS, bonusBuildingPct, type BuildingId } from '../rules/buildings.js';
import { fieldProduction } from '../rules/production.js';
import { RESOURCE_KEYS, type ResourceKey } from '../rules/resources.js';
import { OASIS_LABEL, oasisBonus, type OasisType } from '../rules/map.js';
import { PERK_CAPS, activePerks, type PerkKind } from '../modifiers.js';
import { PRODUCTS } from '../actions/credits.js';
import { economyOf, fedTroopUpkeep, heroUpkeep, levelOf, type VillageState } from './state.js';
import { heroProductionBonus } from './hero.js';

export interface BreakdownLine {
  label: string;
  /** Extra share of the base (0.25 = +25%); null for flat amounts. */
  pct: number | null;
  perHour: number;
  /** When a timed bonus ends. */
  endsAt?: number | null;
  note?: string;
}

export interface ResourceBreakdown {
  key: ResourceKey;
  fields: { name: string; level: number; count: number; perHour: number }[];
  base: number;
  bonuses: BreakdownLine[];
  gross: number;
  upkeep: BreakdownLine[];
  net: number;
}

/** Where every unit of production per hour comes from (matches `economyOf`). */
export function productionBreakdown(q: Q, state: VillageState, now: number): ResourceBreakdown[] {
  const speed = config.WORLD_SPEED;
  const eco = economyOf(q, state, now);
  const oases = q
    .select({ x: tiles.x, y: tiles.y, oasis: tiles.oasis })
    .from(tiles)
    .where(and(eq(tiles.villageId, state.village.id), eq(tiles.kind, 'oasis')))
    .all();
  const perkRows = activePerks(q, state.userId ?? -1, now);
  const flat = heroProductionBonus(q, state.village.id);
  const bonusBuildings: Record<ResourceKey, BuildingId[]> = { wood: ['sawmill'], clay: ['brickyard'], iron: ['ironfoundry'], crop: ['grainmill', 'bakery'] };

  return RESOURCE_KEYS.map((k) => {
    // Fields grouped by level.
    const groups = new Map<string, { name: string; level: number; count: number; perHour: number }>();
    for (const s of state.slots) {
      if (!s.building) continue;
      const def = BUILDINGS[s.building as BuildingId];
      if (def?.produces !== k) continue;
      const key = `${def.id}:${s.level}`;
      const g = groups.get(key) ?? { name: def.name, level: s.level, count: 0, perHour: 0 };
      g.count++;
      g.perHour += fieldProduction(s.level) * speed;
      groups.set(key, g);
    }
    const fields = [...groups.values()].sort((a, b) => b.level - a.level);
    const base = fields.reduce((a, f) => a + f.perHour, 0);
    const bonuses: BreakdownLine[] = [];
    for (const o of oases) {
      const pct = o.oasis ? (oasisBonus(o.oasis as OasisType)[k] ?? 0) : 0;
      if (pct > 0) bonuses.push({ label: `${OASIS_LABEL[o.oasis as OasisType]} (${o.x}|${o.y})`, pct, perHour: base * pct });
    }
    for (const b of bonusBuildings[k]) {
      const lvl = levelOf(state, b);
      const pct = bonusBuildingPct(lvl);
      if (pct > 0) bonuses.push({ label: `${BUILDINGS[b].name} level ${lvl}`, pct, perHour: base * pct });
    }
    // Perks (Gold boosts, token-holder tiers…), each kind capped like getModifiers does.
    for (const kind of ['production_all', `production_${k}`] as PerkKind[]) {
      const rows = perkRows.filter((r) => r.kind === kind);
      let sum = 0;
      for (const r of rows) {
        sum += r.value;
        bonuses.push({ label: perkLabel(r.source, kind === 'production_all'), pct: r.value, perHour: base * r.value, endsAt: r.expiresAt });
      }
      const cap = PERK_CAPS[kind];
      if (sum > cap) bonuses.push({ label: 'Over the bonus limit', pct: cap - sum, perHour: base * (cap - sum), note: `bonuses of this kind add at most +${Math.round(cap * 100)}%` });
    }
    if (flat > 0) bonuses.push({ label: 'Hero', pct: null, perHour: flat });
    const gross = eco.gross[k];
    const upkeep: BreakdownLine[] = [];
    if (k === 'crop') {
      upkeep.push({ label: 'Population (buildings)', pct: null, perHour: -state.village.pop });
      const troops = fedTroopUpkeep(q, state.village.id, state.tribe);
      if (troops > 0) upkeep.push({ label: 'Troops (at home, on the move and reinforcing)', pct: null, perHour: -troops });
      const hero = heroUpkeep(q, state.village.id);
      if (hero > 0) upkeep.push({ label: 'Hero', pct: null, perHour: -hero });
    }
    return { key: k, fields, base, bonuses, gross, upkeep, net: eco.net[k] };
  });
}

function perkLabel(source: string, all: boolean): string {
  if (source.startsWith('shop:')) {
    const p = PRODUCTS.find((x) => `shop:${x.id}` === source);
    return `Gold boost${p ? `: ${p.name}` : ''}`;
  }
  if (source.startsWith('holder:')) return `Token holder perk (${source.slice(7)})${all ? ', all resources' : ''}`;
  return `${source}${all ? ' (all resources)' : ''}`;
}
