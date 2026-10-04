import { config } from '../../config.js';
import { BUILDINGS, mainBuildingFactor, trainingBuildingFactor, type BuildingDef } from '../../game/rules/buildings.js';
import { crannyCapacity, fieldProduction, storageCapacity } from '../../game/rules/production.js';
import { RESOURCE_ICON } from '../../game/rules/resources.js';
import { TRIBES, totalUnits, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { MovementView } from '../../game/queries.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { timer } from './layout.js';

export function unitName(tribe: TribeId, slot: number): string {
  return TRIBES[tribe].units[slot]?.name ?? '?';
}

/** Compact troop table: icons across, counts below (and optional losses row). */
export function unitsTable(tribe: TribeId, counts: UnitCounts | null, losses?: UnitCounts, opts: { hideEmpty?: boolean; label?: string } = {}): SafeHtml {
  const units = TRIBES[tribe].units;
  const show = units.map((_, i) => !opts.hideEmpty || (counts?.[i] ?? 0) > 0 || (losses?.[i] ?? 0) > 0);
  if (opts.hideEmpty && !show.some(Boolean)) return html`<p class="muted small">No troops.</p>`;
  return html`<div class="tblwrap"><table class="units">
    <tr>${opts.label !== undefined ? html`<th></th>` : ''}${units.map((u, i) => (show[i] ? html`<th title="${u.name}"><span class="uico" aria-hidden="true">${u.icon}</span><span class="sr">${u.name}</span></th>` : ''))}</tr>
    <tr>${opts.label !== undefined ? html`<th>${opts.label}</th>` : ''}${units.map((_, i) => (show[i] ? html`<td>${counts ? fmtNum(counts[i] ?? 0) : '?'}</td>` : ''))}</tr>
    ${losses
      ? html`<tr class="loss">${opts.label !== undefined ? html`<th>Lost</th>` : ''}${units.map((_, i) => (show[i] ? html`<td>${fmtNum(losses[i] ?? 0)}</td>` : ''))}</tr>`
      : ''}
  </table></div>`;
}

/** One-line troop summary, e.g. "🛡️ 12 Legionary, 🐎 3 Imperial Rider". */
export function unitsInline(tribe: TribeId, counts: UnitCounts): string {
  const parts: string[] = [];
  counts.forEach((n, i) => {
    if (n > 0) {
      const u = TRIBES[tribe].units[i];
      if (u) parts.push(`${u.icon} ${fmtNum(n)} ${u.name}`);
    }
  });
  return parts.length ? parts.join(', ') : 'none';
}

const KIND_LABEL: Record<MovementView['kind'], string> = {
  attack: 'Attack',
  raid: 'Raid',
  reinforce: 'Reinforcement',
  scout: 'Scouting',
  return: 'Returning',
};

export function movementList(moves: MovementView[], now: number): SafeHtml {
  if (moves.length === 0) return html`<p class="muted small">No troop movements.</p>`;
  return html`<ul class="list">${moves.map((m) => {
    let icon: string;
    let text: SafeHtml;
    if (m.direction === 'in') {
      const hostile = m.kind !== 'reinforce';
      icon = hostile ? '🔴' : '🛡️';
      text = hostile
        ? html`<span class="bad">Incoming ${m.kind === 'scout' ? 'scouts' : 'attack'}</span> from <a href="/map/tile?x=${m.otherX}&amp;y=${m.otherY}">${m.otherName}</a> <span class="sub">${m.ownerName}</span>`
        : html`Reinforcement from <a href="/map/tile?x=${m.otherX}&amp;y=${m.otherY}">${m.otherName}</a> <span class="sub">${m.units ? unitsInline(m.tribe, m.units) : ''}</span>`;
    } else if (m.direction === 'home') {
      icon = '↩️';
      text = html`Returning from ${m.otherName} <span class="sub">${m.units ? unitsInline(m.tribe, m.units) : ''}</span>`;
    } else {
      icon = m.kind === 'reinforce' ? '🛡️' : m.kind === 'scout' ? '🔭' : '⚔️';
      text = html`${KIND_LABEL[m.kind]} to <a href="/map/tile?x=${m.otherX}&amp;y=${m.otherY}">${m.otherName}</a> <span class="sub">${m.units ? unitsInline(m.tribe, m.units) : ''}</span>`;
    }
    return html`<li><span aria-hidden="true">${icon}</span><span class="grow">${text}</span><span class="right small">${timer(m.arriveAt, now)}</span></li>`;
  })}</ul>`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Human description of what a building does at a level. */
export function effectAt(def: BuildingDef, level: number, tribe: TribeId): string | null {
  if (def.produces) {
    return `${RESOURCE_ICON[def.produces]} ${fmtNum(fieldProduction(level) * config.WORLD_SPEED)} per hour`;
  }
  switch (def.id) {
    case 'main':
      return `Construction time ${pct(mainBuildingFactor(level))}`;
    case 'warehouse':
      return `Stores ${fmtNum(storageCapacity(level))} of each: wood, clay, iron`;
    case 'granary':
      return `Stores ${fmtNum(storageCapacity(level))} crop`;
    case 'cranny':
      return `Hides ${fmtNum(Math.floor(crannyCapacity(level) * TRIBES[tribe].crannyMultiplier))} of each resource`;
    case 'barracks':
    case 'stable':
    case 'workshop':
      return level > 0 ? `Training time ${pct(trainingBuildingFactor(level))}` : null;
    case 'wall':
      return `Defence bonus +${Math.round((Math.pow(1 + TRIBES[tribe].wallPerLevel, level) - 1) * 100)}%`;
    case 'market':
      return level > 0 ? `${level} merchant${level === 1 ? '' : 's'}` : null;
    default:
      return null;
  }
}

export function buildingLabel(id: string | null): { name: string; icon: string } {
  if (!id) return { name: 'Empty plot', icon: '➕' };
  const def = BUILDINGS[id as keyof typeof BUILDINGS];
  return def ? { name: def.name, icon: def.icon } : { name: id, icon: '❔' };
}

export function hasTroops(c: UnitCounts): boolean {
  return totalUnits(c) > 0;
}

export function paginate(base: string, page: number, hasMore: boolean): SafeHtml {
  if (page <= 1 && !hasMore) return html``;
  const sep = base.includes('?') ? '&' : '?';
  return html`<div class="actions">
    ${page > 1 ? html`<a class="btn secondary small" href="${base}${sep}page=${page - 1}">← Newer</a>` : ''}
    ${hasMore ? html`<a class="btn secondary small" href="${base}${sep}page=${page + 1}">Older →</a>` : ''}
  </div>`;
}
