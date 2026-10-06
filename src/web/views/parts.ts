import { config } from '../../config.js';
import {
  BUILDINGS,
  bonusBuildingPct,
  mainBuildingFactor,
  trainingBuildingFactor,
  type BuildingDef,
} from '../../game/rules/buildings.js';
import { crannyShare, fieldProduction, storageCapacity, trapCapacity } from '../../game/rules/production.js';
import { oasisSlots, expansionSlots } from '../../game/rules/expansion.js';
import { TRIBES, emptyUnits, totalUnits, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import { RESOURCE_KEYS, sumRes, type Resources } from '../../game/rules/resources.js';
import type { MovementView } from '../../game/queries.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon, timer } from './layout.js';
import { hasAsset, stagedImage } from '../assets.js';

export function unitName(tribe: TribeId, slot: number): string {
  return TRIBES[tribe].units[slot]?.name ?? '?';
}

/** The tribe's own small hero icon when drawn, else the generic one. */
export function heroIconPath(tribe: TribeId): string {
  return hasAsset(`img/units/hero-${tribe}.svg`) ? `units/hero-${tribe}` : 'units/hero';
}

/** 16px unit icon (slot 10 = hero), linking to the troop's information page unless `link` is false. */
export function unitIcon(tribe: TribeId, slot: number, size = 16, link = true): SafeHtml {
  const img = slot === 10 ? icon(heroIconPath(tribe), 'Hero', size) : icon(`units/${tribe}-${slot + 1}`, unitName(tribe, slot), size);
  if (!link) return img;
  const href = slot === 10 ? '/hero' : `/unit/${tribe}/${slot + 1}`;
  return html`<a href="${href}" class="uico" title="${slot === 10 ? 'Hero' : unitName(tribe, slot)}">${img}</a>`;
}

/** Classic troop table: unit icons across, then Troops and (optionally) Casualties rows. */
export function unitsTable(
  tribe: TribeId,
  counts: UnitCounts | null,
  losses?: UnitCounts,
  opts: { hideEmpty?: boolean; label?: string; hero?: boolean; heroLost?: boolean } = {},
): SafeHtml {
  const units = TRIBES[tribe].units;
  const show = units.map((_, i) => !opts.hideEmpty || (counts?.[i] ?? 0) > 0 || (losses?.[i] ?? 0) > 0);
  if (opts.hideEmpty && !show.some(Boolean) && !opts.hero) return html`<p class="muted small">none</p>`;
  const cell = (n: number | undefined) => html`<td class="${(n ?? 0) === 0 ? 'none' : ''}">${counts ? fmtNum(n ?? 0) : '?'}</td>`;
  return html`<div class="tblwrap"><table class="units">
    <tr><td class="lbl"></td>${units.map((_, i) => (show[i] ? html`<td>${unitIcon(tribe, i)}</td>` : ''))}${opts.hero ? html`<td>${unitIcon(tribe, 10)}</td>` : ''}</tr>
    <tr><th class="lbl">${opts.label ?? 'Troops'}</th>${units.map((_, i) => (show[i] ? cell(counts?.[i]) : ''))}${opts.hero ? html`<td>1</td>` : ''}</tr>
    ${losses
      ? html`<tr class="loss"><th class="lbl">Casualties</th>${units.map((_, i) => (show[i] ? html`<td class="${(losses[i] ?? 0) === 0 ? 'none' : ''}">${fmtNum(losses[i] ?? 0)}</td>` : ''))}${opts.hero ? html`<td class="${opts.heroLost ? '' : 'none'}">${opts.heroLost ? 1 : 0}</td>` : ''}</tr>`
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

export const KIND_LABEL: Record<MovementView['kind'], string> = {
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
/** Short "🪵 120 🧱 80 …" line for carried resources. */
export function haulInline(r: Resources): SafeHtml {
  return html`${RESOURCE_KEYS.filter((k) => r[k] > 0).map((k) => html`<span class="nowrap">${resIcon(k)}${fmtNum(Math.floor(r[k]))}</span> `)}`;
}

/** Hostile incoming movements stay secret; everything else opens a detail page. */
export function movementVisible(m: Pick<MovementView, 'direction' | 'kind'>): boolean {
  return !(m.direction === 'in' && (m.kind === 'attack' || m.kind === 'raid' || m.kind === 'scout'));
}

type MoveTab = 'in' | 'out' | 'back';
function moveTab(m: MovementView): MoveTab {
  return m.direction === 'in' ? 'in' : m.direction === 'home' ? 'back' : 'out';
}

/** Village overview: one classic line per kind of movement ("3 Returning — first in 0:05:12"). */
export function movementSummary(moves: MovementView[], now: number): SafeHtml {
  if (moves.length === 0) return html``;
  const groups: { key: string; tab: MoveTab; ico: string; label: string; cls?: string; list: MovementView[] }[] = [
    { key: 'inatt', tab: 'in', ico: 'ui/incoming', label: 'Incoming attack', cls: 'bad', list: [] },
    { key: 'in', tab: 'in', ico: 'ui/reinforce', label: 'Incoming', list: [] },
    { key: 'out', tab: 'out', ico: 'ui/attack', label: 'Outgoing', list: [] },
    { key: 'back', tab: 'back', ico: 'ui/return', label: 'Returning', list: [] },
  ];
  for (const m of moves) {
    const hostileIn = m.direction === 'in' && !movementVisible(m);
    const g = groups.find((x) => x.key === (hostileIn ? 'inatt' : moveTab(m)));
    g?.list.push(m);
  }
  return html`<table class="tb mvsum"><thead><tr><th colspan="3"><a href="/troops#movements">Troop movements</a></th></tr></thead><tbody>${groups
    .filter((g) => g.list.length > 0)
    .map((g) => {
      const first = Math.min(...g.list.map((m) => m.arriveAt));
      return html`<tr><td>${icon(g.ico, g.label, 16)}</td><td><a href="/troops?tab=${g.tab}#movements" class="${g.cls ?? ''}">${g.list.length} ${g.label}</a></td><td class="num small">${g.list.length > 1 ? 'first ' : ''}in ${timer(first, now)}</td></tr>`;
    })}</tbody></table>`;
}

/** Rally Point: every movement in a scrollable box with All / Incoming / Outgoing / Returning tabs. */
export function movementList(moves: MovementView[], now: number, tab: 'all' | MoveTab = 'all'): SafeHtml {
  if (moves.length === 0) return html`<p class="muted small">No troop movements.</p>`;
  const count = (t: MoveTab) => moves.filter((m) => moveTab(m) === t).length;
  const tabs: { key: 'all' | MoveTab; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: moves.length },
    { key: 'in', label: 'Incoming', n: count('in') },
    { key: 'out', label: 'Outgoing', n: count('out') },
    { key: 'back', label: 'Returning', n: count('back') },
  ];
  return html`<div class="mvbox" id="movements" data-mvtab="${tab}">
    <p class="tabs mvtabs">${tabs.map(
      (t) => html`<a href="/troops?tab=${t.key}#movements" data-tab="${t.key}" class="${t.key === tab ? 'on' : ''}${t.n === 0 && t.key !== 'all' ? ' empty' : ''}">${t.label} (${t.n})</a>`,
    )}</p>
    <div class="mvscroll"><table class="tb"><tbody>${moves.map((m) => {
    const link = html`<a href="/map/tile?x=${m.otherX}&amp;y=${m.otherY}">${m.otherName}</a>`;
    const detail = (t: SafeHtml) => (movementVisible(m) ? html`<a href="/troops/movement/${m.id}" class="mvlink" title="Show troops and haul">${t}</a>` : t);
    let ico: SafeHtml;
    let text: SafeHtml;
    if (m.direction === 'in') {
      const hostile = m.kind === 'attack' || m.kind === 'raid' || m.kind === 'scout';
      ico = icon(hostile ? 'ui/incoming' : m.kind === 'trade' ? 'ui/merchant' : 'ui/reinforce', hostile ? 'Incoming attack' : KIND_LABEL[m.kind], 16);
      text = hostile ? html`<b class="bad">Incoming ${m.kind === 'scout' ? 'scouts' : 'attack'}</b> from ${link}` : html`${detail(html`${KIND_LABEL[m.kind]}`)} from ${link}`;
    } else if (m.direction === 'home') {
      ico = icon(m.kind === 'merchant_return' || (m.kind === 'delivery' && !hasTroops(m.units ?? emptyUnits())) ? 'ui/merchant' : 'ui/return', KIND_LABEL[m.kind], 16);
      text = html`${detail(html`${KIND_LABEL[m.kind]}`)} from ${link}`;
    } else {
      const map: Record<string, string> = { reinforce: 'ui/reinforce', scout: 'ui/scout', trade: 'ui/merchant', raid: 'ui/raid', settle: 'ui/outgoing' };
      ico = icon(map[m.kind] ?? 'ui/attack', KIND_LABEL[m.kind], 16);
      text = html`${detail(html`${KIND_LABEL[m.kind]}`)} to ${link}`;
    }
    const cargo = m.units && totalUnits(m.units) > 0 ? html` <span class="small mvx">${unitsInline(m.tribe, m.units)}</span>` : '';
    const haul = m.loot && sumRes(m.loot) > 0 ? html` <span class="small mvx">${m.direction === 'home' && m.kind === 'return' ? 'Haul: ' : ''}${haulInline(m.loot)}</span>` : '';
    const t = moveTab(m);
    return html`<tr data-dir="${t}"${tab !== 'all' && tab !== t ? html` hidden` : ''}><td>${ico}</td><td>${text}${m.hero ? html` ${unitIcon(m.tribe, 10)}` : ''}${cargo}${haul}</td><td class="num">in ${timer(m.arriveAt, now)}</td></tr>`;
  })}</tbody></table></div></div>`;
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
      return html`Hides ${Math.round(crannyShare(level, TRIBES[tribe].crannyMultiplier) * 1000) / 10}% of your storage per resource`;
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
      return html`Merchants: ${level * config.MERCHANT_MULTIPLIER}`;
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

/** 75×100 building picture (resource fields and walls use their own small art); `level` picks the look stage. */
/** A building picture that opens the building's guide page (every level, cost, time and benefit). */
export function buildingInfoImg(id: string, alt?: string, level = 1): SafeHtml {
  const name = alt ?? buildingLabel(id).name;
  return html`<a class="binfo" href="/help/buildings/${id}" title="${name}: all levels and details">${buildingImg(id, name, false, level)}</a>`;
}

export function buildingImg(id: string | null, alt?: string, floated = false, level = 1): SafeHtml {
  const label = alt ?? buildingLabel(id).name;
  const cls = floated ? 'building' : '';
  if (id && FIELD_ART[id]) return html`<img class="${cls} fld" src="/static/img/fields/${FIELD_ART[id]}.svg" width="75" height="100" alt="${label}">`;
  if (id && WALL_ART[id]) return html`<img class="${cls}" src="/static/img/buildings/wall-${WALL_ART[id]}.svg" width="75" height="100" alt="${label}">`;
  return html`<img class="${cls}" src="${id ? stagedImage('buildings', id, level) : '/static/img/buildings/empty.svg'}" width="75" height="100" alt="${label}">`;
}

export function hasTroops(c: UnitCounts): boolean {
  return totalUnits(c) > 0;
}

/** Numbered pages like « ‹ 1 … 8 9 10 … 40 › ». `base` gets &page=N. */
export interface Tab { href: string; label: SafeHtml | string; on?: boolean }

/** Wooden folder tabs (shop, reports, statistics, rally point…); pair with `<div class="woodbody">`. */
export function woodTabs(tabs: Tab[], label: string): SafeHtml {
  return html`<nav class="woodtabs" aria-label="${label}">${tabs.map((t) => html`<a href="${t.href}" class="${t.on ? 'on' : ''}"${t.on ? html` aria-current="page"` : ''}>${t.label}</a>`)}</nav>`;
}

/** A parchment panel with a serif head: the standard section box. */
export function panel(title: SafeHtml | string, body: SafeHtml, o: { meta?: SafeHtml | string; id?: string; cls?: string; pad?: boolean } = {}): SafeHtml {
  return html`<section class="spanel${o.cls ? ` ${o.cls}` : ''}"${o.id ? html` id="${o.id}"` : ''}><h3 class="sp-head">${title}${o.meta !== undefined ? html`<span>${o.meta}</span>` : ''}</h3>${o.pad === false ? body : html`<div class="pad">${body}</div>`}</section>`;
}

/** Thin progress/comparison bar (SVG, so it works under the CSP). `cls` picks the colours (hp, xp, pts, tprog…). */
export function svgBar(pct: number, cls = '', h = 6): SafeHtml {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return html`<svg class="meter ${cls}" viewBox="0 0 100 ${h}" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="${h}" rx="${h / 2}" class="bg"></rect>${w > 0 ? html`<rect width="${w}" height="${h}" rx="${h / 2}" class="fg"></rect>` : ''}</svg>`;
}

/** Small tribe helmet (nature has none: shows its first animal). */
export function tribeMark(tribe: TribeId, size = 20): SafeHtml {
  const src = tribe === 'nature' ? '/static/img/units/nature-1.svg' : `/static/img/tribe/${tribe}.svg`;
  return html`<img src="${src}" width="${size}" height="${size}" alt="${TRIBES[tribe].name}" title="${TRIBES[tribe].name}" class="helm">`;
}

/** Gold-priced action button: label + coin + price; greyed when the player can't afford it. */
export function goldBtn(label: string, price: number, enough: boolean, attrs: SafeHtml | '' = ''): SafeHtml {
  return html`<button type="submit" class="gbtn${enough ? '' : ' secondary'}"${attrs}>${label} <span class="gcoin"><img src="/static/img/res/gold.svg" width="15" height="10" alt="Gold">${price.toLocaleString('en-US')}</span></button>`;
}

export function pager(base: string, page: number, pages: number): SafeHtml {
  if (pages <= 1) return html``;
  const sep = base.includes('?') ? '&' : '?';
  const href = (n: number) => `${base}${sep}page=${n}`;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const out: SafeHtml[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1]! > 1) out.push(html`<span class="pgap">…</span>`);
    out.push(n === page ? html`<b aria-current="page">${n}</b>` : html`<a href="${href(n)}">${n}</a>`);
  });
  return html`<nav class="pager" aria-label="Pages">${page > 1 ? html`<a href="${href(1)}" title="First page">«</a><a href="${href(page - 1)}" title="Previous page">‹</a>` : html`<span class="off">«</span><span class="off">‹</span>`}${out}${page < pages ? html`<a href="${href(page + 1)}" title="Next page">›</a><a href="${href(pages)}" title="Last page">»</a>` : html`<span class="off">›</span><span class="off">»</span>`}</nav>`;
}

