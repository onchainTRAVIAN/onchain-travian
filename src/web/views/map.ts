import { config } from '../../config.js';
import { OASIS_LABEL, type OasisType } from '../../game/rules/map.js';
import { TRIBES } from '../../game/rules/units.js';
import type { MapCell } from '../../game/queries.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { timer } from './layout.js';
import { unitsTable } from './parts.js';

function cellImage(c: MapCell): string {
  if (c.village) {
    const p = c.village.pop;
    return `village-${p >= 500 ? 4 : p >= 250 ? 3 : p >= 100 ? 2 : 1}`;
  }
  if (c.kind === 'oasis') {
    const o = (c.oasis ?? 'wood') as OasisType;
    if (o.startsWith('wood')) return 'oasis-wood';
    if (o.startsWith('clay')) return 'oasis-clay';
    if (o.startsWith('iron')) return 'oasis-iron';
    return 'oasis-crop';
  }
  return c.layout === '1-1-1-15' || c.layout === '3-3-3-9' ? 'valley-rich' : 'valley';
}

export function mapView(d: { grid: MapCell[][]; cx: number; cy: number; myId: number; homeX: number; homeY: number; step: number }): SafeHtml {
  const villages = d.grid.flat().filter((c) => c.village);
  const link = (x: number, y: number) => `/map?x=${x}&y=${y}`;
  const xs = d.grid[0]?.map((c) => c.x) ?? [];
  const ys = d.grid.map((row) => row[0]?.y ?? 0);
  return html`<h1>Map <span class="muted">(${d.cx}|${d.cy})</span></h1>
    <div class="mapwrap">
      <div class="axis-y">${ys.map((y) => html`<span>${y}</span>`)}</div>
      <table class="map" aria-label="Map around ${d.cx}|${d.cy}">
        ${d.grid.map(
          (row) => html`<tr>${row.map((c) => {
            const cls = [c.village?.userId === d.myId ? 'mine' : c.village ? 'other' : '', c.x === d.cx && c.y === d.cy ? 'center' : ''].join(' ');
            const label = c.village
              ? `${c.village.name} (${c.x}|${c.y}) — Player: ${c.village.owner}, Population: ${c.village.pop}`
              : c.kind === 'oasis'
                ? `Unoccupied oasis (${c.x}|${c.y})`
                : `Abandoned valley (${c.x}|${c.y}) ${c.layout ?? ''}`;
            return html`<td class="${cls}"><a href="/map/tile?x=${c.x}&amp;y=${c.y}" title="${label}"><img src="/static/img/map/${cellImage(c)}.svg" alt="${label}"></a></td>`;
          })}</tr>`,
        )}
      </table>
      <div class="axis-x">${xs.map((x) => html`<span>${x}</span>`)}</div>
    </div>
    <div class="mapnav">
      <span></span><a class="btn secondary small" href="${link(d.cx, d.cy + d.step)}">▲ north</a><span></span>
      <a class="btn secondary small" href="${link(d.cx - d.step, d.cy)}">◀ west</a>
      <a class="btn secondary small" href="${link(d.homeX, d.homeY)}">home</a>
      <a class="btn secondary small" href="${link(d.cx + d.step, d.cy)}">east ▶</a>
      <span></span><a class="btn secondary small" href="${link(d.cx, d.cy - d.step)}">▼ south</a><span></span>
    </div>
    <form method="get" action="/map" class="actions center-actions">
      <label for="mx">x</label><input id="mx" type="number" name="x" value="${d.cx}" inputmode="numeric">
      <label for="my">y</label><input id="my" type="number" name="y" value="${d.cy}" inputmode="numeric">
      <button type="submit" class="small">OK</button>
    </form>
    <table class="tb"><thead><tr><th>Village</th><th>Player</th><th class="num">Population</th><th>Coordinates</th></tr></thead><tbody>
    ${villages.length === 0
      ? html`<tr><td colspan="4" class="muted">No villages in this area.</td></tr>`
      : villages.map(
          (c) => html`<tr><td><a href="/map/tile?x=${c.x}&amp;y=${c.y}">${c.village?.name}</a></td><td>${c.village?.owner} <span class="small muted">${TRIBES[c.village?.tribe ?? 'romans'].name}</span></td>
            <td class="num">${fmtNum(c.village?.pop ?? 0)}</td><td>(${c.x}|${c.y})</td></tr>`,
        )}
    </tbody></table>`;
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
