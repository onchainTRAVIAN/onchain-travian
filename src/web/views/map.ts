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
  if (c.layout === '1-1-1-15' || c.layout === '3-3-3-9') return 'valley-rich';
  return (c.x * 7 + c.y * 13) % 5 === 0 ? 'grass2' : 'grass';
}

export function mapView(d: { grid: MapCell[][]; cx: number; cy: number; myId: number; homeX: number; homeY: number; step: number }): SafeHtml {
  // grid rows are y descending (north first); columns x ascending.
  const cells = d.grid.flat();
  const xs = [...new Set(cells.map((c) => c.x))];
  const ys = [...new Set(d.grid.map((row) => row[0]?.y ?? 0))].reverse(); // ascending
  const link = (x: number, y: number) => `/map?x=${x}&y=${y}`;
  const center = cells.find((c) => c.x === d.cx && c.y === d.cy);
  const villages = cells.filter((c) => c.village);
  return html`<h1>Map <span class="lvl">(${d.cx}|${d.cy})</span></h1>
    <div id="mapc">
      ${d.grid.map((row) =>
        row.map((c) => {
          const ix = xs.indexOf(c.x);
          const iy = ys.indexOf(c.y);
          const cls = [`t t${ix}${iy}`, c.village?.userId === d.myId ? 'own' : c.village ? 'other' : '', c.x === d.cx && c.y === d.cy ? 'ctr' : ''].join(' ');
          const label = c.village
            ? `${c.village.name} (${c.x}|${c.y}) — Player: ${c.village.owner}, Population: ${c.village.pop}`
            : c.kind === 'oasis'
              ? `Unoccupied oasis (${c.x}|${c.y})`
              : `Abandoned valley (${c.x}|${c.y})`;
          return html`<a class="${cls}" href="/map/tile?x=${c.x}&amp;y=${c.y}" title="${label}"><img src="/static/img/map/${cellImage(c)}.svg" alt="${label}"></a>`;
        }),
      )}
      ${xs.map((x, k) => html`<div class="ruler mx${k}">${x}</div>`)}
      ${ys.map((y, k) => html`<div class="ruler my${k}">${y}</div>`)}
      <a class="ar ar-n" href="${link(d.cx, d.cy + d.step)}" title="North" aria-label="North"></a>
      <a class="ar ar-e" href="${link(d.cx + d.step, d.cy)}" title="East" aria-label="East"></a>
      <a class="ar ar-s" href="${link(d.cx, d.cy - d.step)}" title="South" aria-label="South"></a>
      <a class="ar ar-w" href="${link(d.cx - d.step, d.cy)}" title="West" aria-label="West"></a>
      <form id="map_coords" method="get" action="/map">
        <label for="mx">x</label> <input id="mx" type="text" name="x" value="${d.cx}" inputmode="numeric">
        <label for="my">y</label> <input id="my" type="text" name="y" value="${d.cy}" inputmode="numeric">
        <button type="submit" class="small">OK</button>
      </form>

    </div>
<table id="map_info"><thead><tr><th colspan="2">Details:</th></tr></thead><tbody>
        ${center?.village
          ? html`<tr><th>Village</th><td>${center.village.name}</td></tr><tr><th>Player</th><td>${center.village.owner}</td></tr><tr><th>Population</th><td>${fmtNum(center.village.pop)}</td></tr>`
          : html`<tr><th>Field</th><td>${center?.kind === 'oasis' ? 'Oasis' : 'Abandoned valley'}</td></tr>`}
      </tbody></table>
    <p class="small"><a href="${link(d.homeX, d.homeY)}">» Back to your village</a></p>
    <table><thead><tr><th>Village</th><th>Player</th><th>Population</th><th>Coordinates</th></tr></thead><tbody>
    ${villages.length === 0
      ? html`<tr><td colspan="4" class="none center">none</td></tr>`
      : villages.map(
          (c) => html`<tr><td><a href="/map/tile?x=${c.x}&amp;y=${c.y}">${c.village?.name}</a></td><td>${c.village?.owner}</td>
            <td class="num">${fmtNum(c.village?.pop ?? 0)}</td><td class="center">(${c.x}|${c.y})</td></tr>`,
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
