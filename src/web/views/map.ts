import { config } from '../../config.js';
import { OASIS_LABEL, type OasisType } from '../../game/rules/map.js';
import { TRIBES } from '../../game/rules/units.js';
import type { MapCell } from '../../game/queries.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { timer } from './layout.js';
import { unitsTable } from './parts.js';

function cellIcon(c: MapCell, myId: number): string {
  if (c.village) {
    if (c.village.userId === myId) return '🏰';
    if (c.village.pop >= 300) return '🏯';
    if (c.village.pop >= 100) return '🏘️';
    return '🏠';
  }
  if (c.kind === 'oasis') {
    switch (c.oasis as OasisType) {
      case 'wood':
      case 'wood_crop':
        return '🌲';
      case 'clay':
      case 'clay_crop':
        return '🟫';
      case 'iron':
      case 'iron_crop':
        return '⛰️';
      default:
        return '💧';
    }
  }
  return c.layout === '1-1-1-15' || c.layout === '3-3-3-9' ? '🌻' : '·';
}

export function mapView(d: { grid: MapCell[][]; cx: number; cy: number; myId: number; homeX: number; homeY: number; step: number }): SafeHtml {
  const villages = d.grid.flat().filter((c) => c.village);
  const link = (x: number, y: number) => `/map?x=${x}&y=${y}`;
  return html`<h1>🗺️ World map <span class="muted small">centre (${d.cx}|${d.cy})</span></h1>
    <div class="tblwrap"><table class="map" aria-label="Map around ${d.cx}|${d.cy}">
      ${d.grid.map(
        (row) => html`<tr>${row.map((c) => {
          const cls = [c.kind === 'oasis' ? 'oasis' : '', c.village?.userId === d.myId ? 'mine' : c.village ? 'other' : '', c.x === d.cx && c.y === d.cy ? 'center' : ''].join(' ');
          const label = c.village ? `${c.village.name} (${c.x}|${c.y}) — ${c.village.owner}, ${c.village.pop} pop` : c.kind === 'oasis' ? `Oasis (${c.x}|${c.y})` : `Empty valley ${c.layout ?? ''} (${c.x}|${c.y})`;
          return html`<td class="${cls}"><a href="/map/tile?x=${c.x}&amp;y=${c.y}" title="${label}" aria-label="${label}">${cellIcon(c, d.myId)}</a></td>`;
        })}</tr>`,
      )}
    </table></div>
    <div class="mapnav">
      <span></span><a class="btn secondary small" href="${link(d.cx, d.cy + d.step)}">▲ North</a><span></span>
      <a class="btn secondary small" href="${link(d.cx - d.step, d.cy)}">◀ West</a>
      <a class="btn secondary small" href="${link(d.homeX, d.homeY)}">🏰 Home</a>
      <a class="btn secondary small" href="${link(d.cx + d.step, d.cy)}">East ▶</a>
      <span></span><a class="btn secondary small" href="${link(d.cx, d.cy - d.step)}">▼ South</a><span></span>
    </div>
    <p class="legend">🏰 yours · 🏠 🏘️ 🏯 other villages (by size) · 🌲 🟫 ⛰️ 💧 oases · 🌻 crop-rich valley · · empty valley</p>
    <form method="get" action="/map" class="row">
      <div><label for="mx">X</label><input id="mx" type="number" name="x" value="${d.cx}" inputmode="numeric"></div>
      <div><label for="my">Y</label><input id="my" type="number" name="y" value="${d.cy}" inputmode="numeric"></div>
      <div><label>&nbsp;</label><button type="submit" class="block">Go</button></div>
    </form>
    <h2>Villages in view</h2>
    ${villages.length === 0
      ? html`<p class="muted small">No villages nearby.</p>`
      : html`<ul class="list">${villages.map(
          (c) => html`<li><span class="grow"><a href="/map/tile?x=${c.x}&amp;y=${c.y}">${c.village?.name}</a> <span class="sub">${c.village?.owner} · ${TRIBES[c.village?.tribe ?? 'legion'].name} · ${fmtNum(c.village?.pop ?? 0)} pop</span></span><span class="small muted">(${c.x}|${c.y})</span></li>`,
        )}</ul>`}
    <p class="small muted">The world spans ${-config.MAP_RADIUS}…${config.MAP_RADIUS} and wraps around at the edges.</p>`;
}

export interface TileViewData {
  x: number;
  y: number;
  kind: 'field' | 'oasis';
  layout: string | null;
  oasis: string | null;
  village: { id: number; name: string; pop: number; isMine: boolean; owner: string; ownerId: number | null; tribe: string; protectedUntil: number | null } | null;
  distance: number;
  animals: number[] | null;
  oasisOwner: { name: string; userId: number | null; villageName: string } | null;
  /** Travel time for your slowest and fastest unit types at home, for orientation. */
  travel: { label: string; ms: number }[];
  now: number;
}

export function tileView(d: TileViewData): SafeHtml {
  const title = d.village ? d.village.name : d.kind === 'oasis' ? 'Oasis' : 'Abandoned valley';
  const v = d.village;
  const prot = v && v.protectedUntil !== null && v.protectedUntil > d.now;
  return html`<h1>${title} <span class="muted small">(${d.x}|${d.y})</span></h1>
    <ul class="list">
      ${v
        ? html`<li><span class="grow">Owner <span class="sub">${v.ownerId ? html`<a href="/player/${v.ownerId}">${v.owner}</a>` : v.owner} · ${v.tribe}</span></span></li>
          <li><span class="grow">Population <span class="sub">${fmtNum(v.pop)}</span></span></li>`
        : d.kind === 'oasis'
          ? html`<li><span class="grow">${OASIS_LABEL[(d.oasis ?? 'wood') as OasisType]}
              <span class="sub">${d.oasisOwner ? html`Held by ${d.oasisOwner.name} (${d.oasisOwner.villageName})` : 'Unoccupied — wild animals live here'}</span></span></li>`
          : html`<li><span class="grow">Fields <span class="sub">${d.layout ?? '4-4-4-6'} (wood-clay-iron-crop) · free to settle</span></span></li>`}
      <li><span class="grow">Distance <span class="sub">${d.distance.toFixed(1)} fields</span></span></li>
      ${d.travel.map((t) => html`<li><span class="grow">${t.label} <span class="sub">${fmtDuration(t.ms)} travel</span></span></li>`)}
    </ul>
    ${d.animals && d.animals.some((n) => n > 0) ? html`<h2>🐾 Animals</h2>${unitsTable('nature', d.animals, undefined, { hideEmpty: true })}` : ''}
    ${d.kind === 'oasis'
      ? html`<div class="actions">
          <a class="btn" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=attack">⚔️ Attack</a>
          <a class="btn" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=raid">💰 Raid</a>
          <a class="btn secondary" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=scout">🔭 Scout</a>
        </div><p class="small muted">Clear all animals with an attack that includes your hero to capture this oasis (needs a Hero's Mansion at level 10 and the oasis within 3 fields).</p>`
      : ''}
    ${d.kind === 'field' && !v ? html`<div class="actions"><a class="btn" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=settle">🧺 Found a village here</a></div>` : ''}
    ${prot ? html`<div class="note">🛡️ This player is under beginner protection for ${timer(v?.protectedUntil ?? d.now, d.now, false)}.</div>` : ''}
    ${v && !v.isMine
      ? html`<div class="actions">
          <a class="btn" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=raid">💰 Raid</a>
          <a class="btn" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=attack">⚔️ Attack</a>
          <a class="btn secondary" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=scout">🔭 Scout</a>
          <a class="btn secondary" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=reinforce">🛡️ Reinforce</a>
          ${v.ownerId ? html`<a class="btn secondary" href="/messages/new?to=${encodeURIComponent(v.owner)}">✉️ Message</a>` : ''}
        </div>`
      : ''}
    ${v?.isMine ? html`<div class="actions"><a class="btn secondary" href="/troops/send?x=${d.x}&amp;y=${d.y}&amp;kind=reinforce">🛡️ Send reinforcements</a></div>` : ''}
    <div class="actions"><a class="btn secondary" href="/map?x=${d.x}&amp;y=${d.y}">🗺️ Show on map</a></div>`;
}
