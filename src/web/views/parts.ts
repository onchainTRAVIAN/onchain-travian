import { config } from '../../config.js';
import {
  BUILDINGS,
  bonusBuildingPct,
  mainBuildingFactor,
  trainingBuildingFactor,
  type BuildingDef,
} from '../../game/rules/buildings.js';
import { crannyCapacity, fieldProduction, storageCapacity, trapCapacity } from '../../game/rules/production.js';
import { oasisSlots, expansionSlots } from '../../game/rules/expansion.js';
import { TRIBES, emptyUnits, totalUnits, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { MovementView } from '../../game/queries.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon, timer } from './layout.js';

export function unitName(tribe: TribeId, slot: number): string {
  return TRIBES[tribe].units[slot]?.name ?? '?';
}

/** 16px unit icon (slot 10 = hero). */
export function unitIcon(tribe: TribeId, slot: number, size = 16): SafeHtml {
  if (slot === 10) return icon('units/hero', 'Hero', size);
  return icon(`units/${tribe}-${slot + 1}`, unitName(tribe, slot), size);
}

/** Classic troop table: unit icons across, then Troops and (optionally) Casualties rows. */
export function unitsTable(
  tribe: TribeId,
  counts: UnitCounts | null,
  losses?: UnitCounts,
  opts: { hideEmpty?: boolean; label?: string; hero?: boolean } = {},
): SafeHtml {
  const units = TRIBES[tribe].units;
  const show = units.map((_, i) => !opts.hideEmpty || (counts?.[i] ?? 0) > 0 || (losses?.[i] ?? 0) > 0);
  if (opts.hideEmpty && !show.some(Boolean) && !opts.hero) return html`<p class="muted small">none</p>`;
  const cell = (n: number | undefined) => html`<td class="${(n ?? 0) === 0 ? 'none' : ''}">${counts ? fmtNum(n ?? 0) : '?'}</td>`;
  return html`<div class="tblwrap"><table class="units">
    <tr><td class="lbl"></td>${units.map((_, i) => (show[i] ? html`<td>${unitIcon(tribe, i)}</td>` : ''))}${opts.hero ? html`<td>${unitIcon(tribe, 10)}</td>` : ''}</tr>
    <tr><th class="lbl">${opts.label ?? 'Troops'}</th>${units.map((_, i) => (show[i] ? cell(counts?.[i]) : ''))}${opts.hero ? html`<td>1</td>` : ''}</tr>
    ${losses
      ? html`<tr class="loss"><th class="lbl">Casualties</th>${units.map((_, i) => (show[i] ? html`<td class="${(losses[i] ?? 0) === 0 ? 'none' : ''}">${fmtNum(losses[i] ?? 0)}</td>` : ''))}${opts.hero ? html`<td>-</td>` : ''}</tr>`
      : ''}
  </table></div>`;
}

/** Compact troop summary with icons: "[icon] 12 [icon] 3". */
export function unitsInline(tribe: TribeId, counts: UnitCounts): SafeHtml {
  const parts: SafeHtml[] = [];
  counts.forEach((n, i) => {
    if (n > 0) parts.push(html`<span class="nowrap">${unitIcon(tribe, i)} ${fmtNum(n)}</span> `);
  });
  return parts.length ? html`${parts}` : html`<span class="muted">none</span>`;
}

const KIND_LABEL: Record<MovementView['kind'], string> = {
  attack: 'Attack',
  raid: 'Raid',
  reinforce: 'Reinforcement',
  scout: 'Scouting',
  return: 'Return',
  settle: 'Found new village',
  trade: 'Merchants',
  merchant_return: 'Merchants returning',
  delivery: 'Gold market delivery',
};

/** Classic "Troop movements" table. */
export function movementList(moves: MovementView[], now: number): SafeHtml {
  if (moves.length === 0) return html`<p class="muted small">No troop movements.</p>`;
  return html`<table class="tb"><thead><tr><th colspan="3">Troop movements</th></tr></thead><tbody>${moves.map((m) => {
    const link = html`<a href="/map/tile?x=${m.otherX}&amp;y=${m.otherY}">${m.otherName}</a>`;
    let ico: SafeHtml;
    let text: SafeHtml;
    if (m.direction === 'in') {
      const hostile = m.kind === 'attack' || m.kind === 'raid' || m.kind === 'scout';
      ico = icon(hostile ? 'ui/incoming' : m.kind === 'trade' ? 'ui/merchant' : 'ui/reinforce', hostile ? 'Incoming attack' : KIND_LABEL[m.kind], 16);
      text = hostile ? html`<b class="bad">Incoming ${m.kind === 'scout' ? 'scouts' : 'attack'}</b> from ${link}` : html`${KIND_LABEL[m.kind]} from ${link}`;
    } else if (m.direction === 'home') {
      ico = icon(m.kind === 'merchant_return' || (m.kind === 'delivery' && !hasTroops(m.units ?? emptyUnits())) ? 'ui/merchant' : 'ui/return', KIND_LABEL[m.kind], 16);
      text = html`${KIND_LABEL[m.kind]} from ${m.otherName}`;
    } else {
      const map: Record<string, string> = { reinforce: 'ui/reinforce', scout: 'ui/scout', trade: 'ui/merchant', raid: 'ui/raid', settle: 'ui/outgoing' };
      ico = icon(map[m.kind] ?? 'ui/attack', KIND_LABEL[m.kind], 16);
      text = html`${KIND_LABEL[m.kind]} to ${link}`;
    }
    const cargo = m.units && totalUnits(m.units) > 0 ? html`<br><span class="small">${unitsInline(m.tribe, m.units)}</span>` : '';
    return html`<tr><td>${ico}</td><td>${text}${m.hero ? html` ${unitIcon(m.tribe, 10)}` : ''}${cargo}</td><td class="num">in ${timer(m.arriveAt, now)}</td></tr>`;
  })}</tbody></table>`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Classic "current / next level" effect text for a building. */
export function effectAt(def: BuildingDef, level: number, tribe: TribeId): SafeHtml | null {
  if (def.produces) return html`${resIcon(def.produces)} ${fmtNum(fieldProduction(level) * config.WORLD_SPEED)} per hour`;
  switch (def.id) {
    case 'main':
      return html`Construction time: ${pct(mainBuildingFactor(level))}`;
    case 'warehouse':
      return html`Capacity: ${fmtNum(storageCapacity(level))} units per resource`;
    case 'granary':
      return html`Capacity: ${fmtNum(storageCapacity(level))} units of crop`;
    case 'cranny':
      return html`Hidden units per resource: ${fmtNum(Math.floor(crannyCapacity(level) * TRIBES[tribe].crannyMultiplier))}`;
    case 'barracks':
    case 'stable':
    case 'workshop':
    case 'greatbarracks':
    case 'greatstable':
      return level > 0 ? html`Training time: ${pct(trainingBuildingFactor(level))}` : null;
    case 'citywall':
    case 'earthwall':
    case 'palisade':
      return html`Defence bonus: ${Math.round((Math.pow(1 + TRIBES[tribe].wallPerLevel, level) - 1) * 100)}%`;
    case 'market':
      return html`Merchants: ${level}`;
    case 'tradeoffice':
      return html`Merchant capacity: ${100 + level * 10}%`;
    case 'tournament':
      return html`Troop speed beyond 30 fields: ${100 + level * 10}%`;
    case 'stonemason':
      return html`Building stability: ${100 + level * 10}%`;
    case 'sawmill':
    case 'brickyard':
    case 'ironfoundry':
    case 'grainmill':
    case 'bakery':
      return html`Production bonus: ${Math.round(bonusBuildingPct(level) * 100)}%`;
    case 'brewery':
      return html`Attack bonus: ${level}%`;
    case 'trapper':
      return html`Traps: ${fmtNum(trapCapacity(level))}`;
    case 'horsetrough':
      return html`Cavalry training: ${100 - level}%`;
    case 'embassy':
      return level >= 3 ? html`Alliance members: ${level * 3}` : html`You can join an alliance`;
    case 'heromansion':
      return html`Oases: ${oasisSlots(level)}`;
    case 'residence':
      return html`Expansion slots: ${expansionSlots(level, 0)}`;
    case 'palace':
      return html`Expansion slots: ${expansionSlots(0, level)}`;
    case 'townhall':
      return html`Celebration duration: ${pct(Math.pow(0.964, Math.max(1, level) - 1))}`;
    default:
      return null;
  }
}

export function buildingLabel(id: string | null): { name: string; icon: string } {
  if (!id) return { name: 'Building site', icon: '➕' };
  const def = BUILDINGS[id as keyof typeof BUILDINGS];
  return def ? { name: def.name, icon: def.icon } : { name: id, icon: '❔' };
}

const FIELD_ART: Record<string, string> = { woodcutter: 'wood', claypit: 'clay', ironmine: 'iron', cropland: 'crop' };
const WALL_ART: Record<string, string> = { citywall: 'city', earthwall: 'earth', palisade: 'palisade' };

/** 75×100 building picture (resource fields and walls use their own small art). */
export function buildingImg(id: string | null, alt?: string, floated = false): SafeHtml {
  const label = alt ?? buildingLabel(id).name;
  const cls = floated ? 'building' : '';
  if (id && FIELD_ART[id]) return html`<img class="${cls} fld" src="/static/img/fields/${FIELD_ART[id]}.svg" alt="${label}">`;
  if (id && WALL_ART[id]) return html`<img class="${cls}" src="/static/img/buildings/wall-${WALL_ART[id]}.svg" alt="${label}">`;
  return html`<img class="${cls}" src="/static/img/buildings/${id ?? 'empty'}.svg" alt="${label}">`;
}

export function hasTroops(c: UnitCounts): boolean {
  return totalUnits(c) > 0;
}

export function paginate(base: string, page: number, hasMore: boolean): SafeHtml {
  if (page <= 1 && !hasMore) return html``;
  const sep = base.includes('?') ? '&' : '?';
  return html`<div class="actions">
    ${page > 1 ? html`<a class="btn secondary small" href="${base}${sep}page=${page - 1}">« back</a>` : ''}
    ${hasMore ? html`<a class="btn secondary small" href="${base}${sep}page=${page + 1}">forward »</a>` : ''}
  </div>`;
}
