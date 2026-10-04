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

export const MAP_SIZES = [7, 11, 15, 21] as const;
export type MapSize = (typeof MAP_SIZES)[number];
export type MapStyle = 'diamond' | 'grid';

interface Placed {
  c: MapCell;
  /** Top-left of the 74×74 tile image. */
  x: number;
  y: number;
  /** Outline polygon/rect points for highlights. */
  shape: string;
}

/**
 * The map as one inline SVG (positions are SVG attributes, so any size works under the CSP)
 * that scales to the column width.
 */
export function mapView(d: {
  grid: MapCell[][];
  cx: number;
  cy: number;
  myId: number;
  homeX: number;
  homeY: number;
  size: MapSize;
  style: MapStyle;
}): SafeHtml {
  const n = d.size;
  const cells = d.grid.flat();
  const xs = [...new Set(cells.map((c) => c.x))];
  const ys = [...new Set(d.grid.map((row) => row[0]?.y ?? 0))].reverse(); // ascending y
  const step = Math.max(1, Math.floor(n / 2));
  const link = (x: number, y: number) => `/map?x=${x}&y=${y}`;
  const m = 46; // margin for labels and arrows
  let W: number;
  let H: number;
  const placed: Placed[] = [];
  const labels: SafeHtml[] = [];
  let arrows: { x: number; y: number; rot: number; href: string; title: string }[];

  if (d.style === 'diamond') {
    // Tile (i, j): centre = (37·(i+j), 20·(i−j)) — x grows down-right, y grows up-right (north).
    W = 74 * n + 2 * m;
    H = 40 * (n - 1) + 74 + 2 * m;
    const ox = m;
    const oy = m + 20 * (n - 1);
    for (const c of cells) {
      const i = xs.indexOf(c.x);
      const j = ys.indexOf(c.y);
      const cxp = ox + 37 + 37 * (i + j);
      const cyp = oy + 37 + 20 * (i - j);
      placed.push({ c, x: cxp - 37, y: cyp - 37, shape: `${cxp},${cyp - 20} ${cxp + 37},${cyp} ${cxp},${cyp + 20} ${cxp - 37},${cyp}` });
      if (j === 0) labels.push(html`<text x="${cxp - 26}" y="${cyp + 34}" class="lbl">${c.x}</text>`);
      if (i === n - 1) labels.push(html`<text x="${cxp + 26}" y="${cyp + 34}" class="lbl">${c.y}</text>`);
    }
    const left = { x: ox, y: oy + 37 };
    const top = { x: ox + 37 + 37 * (n - 1), y: oy + 37 - 20 * (n - 1) - 20 };
    const right = { x: ox + 74 * n, y: oy + 37 };
    const bottom = { x: ox + 37 + 37 * (n - 1), y: oy + 37 + 20 * (n - 1) + 20 };
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }, dx: number, dy: number) => ({ x: (a.x + b.x) / 2 + dx, y: (a.y + b.y) / 2 + dy });
    arrows = [
      { ...mid(top, right, 22, -14), rot: -30, href: link(d.cx, d.cy + step), title: 'North' },
      { ...mid(right, bottom, 22, 14), rot: 30, href: link(d.cx + step, d.cy), title: 'East' },
      { ...mid(bottom, left, -22, 14), rot: 150, href: link(d.cx, d.cy - step), title: 'South' },
      { ...mid(left, top, -22, -14), rot: 210, href: link(d.cx - step, d.cy), title: 'West' },
    ];
  } else {
    const t = 60;
    W = t * n + 2 * m;
    H = t * n + 2 * m;
    for (const c of cells) {
      const i = xs.indexOf(c.x);
      const j = ys.indexOf(c.y);
      const x = m + i * t;
      const y = m + (n - 1 - j) * t;
      placed.push({ c, x, y, shape: `${x},${y} ${x + t},${y} ${x + t},${y + t} ${x},${y + t}` });
      if (j === 0) labels.push(html`<text x="${x + t / 2}" y="${m + n * t + 16}" class="lbl">${c.x}</text>`);
      if (i === 0) labels.push(html`<text x="${m - 16}" y="${y + t / 2 + 4}" class="lbl">${c.y}</text>`);
    }
    arrows = [
      { x: W / 2, y: m / 2 - 4, rot: -90, href: link(d.cx, d.cy + step), title: 'North' },
      { x: W - m / 2 + 4, y: H / 2, rot: 0, href: link(d.cx + step, d.cy), title: 'East' },
      { x: W / 2, y: H - m / 2 + 4, rot: 90, href: link(d.cx, d.cy - step), title: 'South' },
      { x: m / 2 - 4, y: H / 2, rot: 180, href: link(d.cx - step, d.cy), title: 'West' },
    ];
  }

  // Draw back-to-front so taller tiles overlap correctly.
  placed.sort((a, b) => a.y - b.y || a.x - b.x);
  const tileSize = d.style === 'diamond' ? 74 : 60;
  const art = d.style === 'diamond' ? 'map' : 'map/flat';
  const tiles = placed.map((p) => {
    const c = p.c;
    const label = c.village
      ? `${c.village.name} (${c.x}|${c.y}) — ${c.village.owner}, population ${c.village.pop}`
      : c.kind === 'oasis'
        ? `Oasis (${c.x}|${c.y})`
        : `Abandoned valley (${c.x}|${c.y})`;
    const own = c.village?.userId === d.myId;
    const ctr = c.x === d.cx && c.y === d.cy;
    return html`<a href="/map/tile?x=${c.x}&amp;y=${c.y}" class="tile"><title>${label}</title>
      <image href="/static/img/${art}/${cellImage(c)}.svg" x="${p.x}" y="${p.y}" width="${tileSize}" height="${tileSize}"></image>
      ${c.village ? html`<polygon points="${p.shape}" class="${own ? 'own' : 'other'}"></polygon>` : ''}
      ${ctr ? html`<polygon points="${p.shape}" class="ctr"></polygon>` : ''}
      <polygon points="${p.shape}" class="${d.style === 'grid' ? 'hit gl' : 'hit'}"></polygon></a>`;
  });

  const center = cells.find((c) => c.x === d.cx && c.y === d.cy);
  const villages = cells.filter((c) => c.village);
  const opt = (sz: number, st: MapStyle, text: string, on: boolean) =>
    html`<a href="/map?x=${d.cx}&amp;y=${d.cy}&amp;size=${sz}&amp;view=${st}" class="${on ? 'on' : ''}">${text}</a>`;
  return html`<h1>Map <span class="lvl">(${d.cx}|${d.cy})</span></h1>
    <p class="tabs mapopts">Size: ${MAP_SIZES.map((sz) => opt(sz, d.style, `${sz}×${sz}`, sz === n))}
      <span class="sep">View:</span> ${opt(n, 'diamond', 'Classic', d.style === 'diamond')}${opt(n, 'grid', 'Flat', d.style === 'grid')}</p>
    <svg class="mapsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Map around ${d.cx}|${d.cy}">
      ${tiles}
      ${labels}
      ${arrows.map((a) => html`<a href="${a.href}" class="arrow"><title>${a.title}</title>
        <polygon points="-10,-9 10,0 -10,9" transform="translate(${a.x} ${a.y}) rotate(${a.rot})"></polygon></a>`)}
    </svg>
    <form id="map_coords" method="get" action="/map">
      <input type="hidden" name="size" value="${n}"><input type="hidden" name="view" value="${d.style}">
      <b>x</b> <input type="text" name="x" value="${d.cx}" class="w30" inputmode="numeric">
      <b>y</b> <input type="text" name="y" value="${d.cy}" class="w30" inputmode="numeric">
      <button type="submit" class="small">OK</button>
      <a href="${link(d.homeX, d.homeY)}" class="home">» back to my village</a>
    </form>
    <table id="map_info"><thead><tr><th colspan="2">Details (${d.cx}|${d.cy}):</th></tr></thead><tbody>
      ${center?.village
        ? html`<tr><th>Village</th><td>${center.village.name}</td></tr><tr><th>Player</th><td>${center.village.owner}</td></tr><tr><th>Population</th><td>${fmtNum(center.village.pop)}</td></tr>`
        : html`<tr><th>Field</th><td>${center?.kind === 'oasis' ? 'Oasis' : 'Abandoned valley'}</td></tr>`}
    </tbody></table>
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
