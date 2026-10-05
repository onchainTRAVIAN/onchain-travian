import { BUILDINGS, FIELD_IDS, TOWN_BUILDING_IDS } from '../../game/rules/buildings.js';
import { catapultTargetAllowed } from '../../game/rules/battle.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { SendInput, SendPreview } from '../../game/actions/troops.js';
import type { MovementView, StationedView } from '../../game/queries.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon, timer } from './layout.js';
import { KIND_LABEL, movementList, unitIcon, unitsInline, unitsTable } from './parts.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, sumRes, type Resources } from '../../game/rules/resources.js';
import { fmtClock } from '../format.js';

export interface TroopsViewData {
  tribe: TribeId;
  hasRally: boolean;
  home: UnitCounts;
  reinforcements: StationedView[];
  away: StationedView[];
  movements: MovementView[];
  csrf: string;
  now: number;
}

export function troopsView(d: TroopsViewData): SafeHtml {
  return html`<h1>Rally Point</h1>
    ${d.hasRally ? '' : html`<div class="note">You need a <a href="/slot/39">Rally Point</a> before you can send troops anywhere.</div>`}
    <h2>Your troops at home</h2>
    ${unitsTable(d.tribe, d.home)}
    ${d.hasRally ? html`<div class="actions"><a class="btn block" href="/troops/send">⚔️ Send troops</a> <a class="btn secondary block" href="/troops/farmlist">Farm list</a></div>` : ''}
    <h2>Troop movements</h2>
    ${movementList(d.movements, d.now)}
    <h2>Reinforcements in this village</h2>
    ${d.reinforcements.length === 0
      ? html`<p class="muted small">No other armies are stationed here.</p>`
      : html`<ul class="list">${d.reinforcements.map(
          (r) => html`<li><span class="grow">${r.villageName} <span class="sub">${r.ownerName} · ${unitsInline(r.tribe, r.units)}</span></span>
            <form method="post" action="/troops/sendback">${csrfField(d.csrf)}<input type="hidden" name="ownerVillageId" value="${r.ownerVillageId}">
            <button type="submit" class="small secondary">Send home</button></form></li>`,
        )}</ul>`}
    <h2>Your troops in other villages</h2>
    ${d.away.length === 0
      ? html`<p class="muted small">None of your troops are stationed elsewhere.</p>`
      : html`<ul class="list">${d.away.map(
          (r) => html`<li><span class="grow"><a href="/map/tile?x=${r.x}&amp;y=${r.y}">${r.villageName}</a> <span class="sub">${r.ownerName} · ${unitsInline(d.tribe, r.units)}</span></span>
            <form method="post" action="/troops/withdraw">${csrfField(d.csrf)}<input type="hidden" name="locationId" value="${r.locationId}">
            <button type="submit" class="small secondary">Withdraw</button></form></li>`,
        )}</ul>`}`;
}

const MISSIONS: { kind: SendInput['kind']; label: string; help: string }[] = [
  { kind: 'reinforce', label: 'Reinforcement', help: 'Station troops to defend a village.' },
  { kind: 'attack', label: 'Attack: Normal', help: 'Fight to the end. Rams, catapults and chiefs only work here.' },
  { kind: 'raid', label: 'Attack: Raid', help: 'Grab resources and retreat; fewer losses.' },
  { kind: 'scout', label: 'Scouting', help: 'Spy on resources and troops (scouts only).' },
  { kind: 'settle', label: 'Found new village', help: '3 settlers to an abandoned valley.' },
];

const CATA_ORDER = [...FIELD_IDS, ...TOWN_BUILDING_IDS] as const;

/** Catapult target menus: what the Rally Point level allows (random below level 3); a second one at level 20. */
function catapultSelects(rally: number, chosen: string[]): SafeHtml {
  const options = CATA_ORDER.filter((b) => catapultTargetAllowed(b, rally));
  const sel = (name: string, current: string | undefined, label: string) =>
    html`<label>${label} <select name="${name}"><option value="">random</option>${options.map(
      (b) => html`<option value="${b}"${current === b ? html` selected` : ''}>${BUILDINGS[b].name}</option>`,
    )}</select></label>`;
  if (options.length === 0) return html`<p class="small muted">Catapults hit random buildings until your Rally Point reaches level 3.</p>`;
  return html`<p>${sel('catapultTarget', chosen[0], 'Catapult target:')}
    ${rally >= 20 ? html` ${sel('catapultTarget2', chosen[1], 'Second target:')} <span class="small muted">(needs at least 20 catapults; they split in half)</span>` : ''}</p>`;
}

export function sendView(d: { tribe: TribeId; home: UnitCounts; values: Partial<SendInput>; csrf: string; heroHome: boolean; carryMult: number; rallyLevel: number; places: { x: number; y: number; label: string }[]; ownVillages: { name: string; x: number; y: number }[] }): SafeHtml {
  const units = TRIBES[d.tribe].units;
  const kind = d.values.kind ?? 'attack';
  // Classic layout: three columns of units (infantry | cavalry | siege & specials).
  const cols = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]];
  const cell = (i: number) => {
    const u = units[i];
    if (!u) return html`<td></td>`;
    const have = d.home[i] ?? 0;
    const v = d.values.units?.[i];
    return html`<td class="nowrap">${unitIcon(d.tribe, i)} <label class="sr" for="u${i}">${u.name}</label><input class="w30 su-in" title="${u.name}: carries ${fmtNum(Math.floor(u.carry * d.carryMult))} each" id="u${i}" type="number" name="u${i}" min="0" max="${have}" value="${v && v > 0 ? v : ''}" inputmode="numeric" data-carry="${Math.floor(u.carry * d.carryMult * 100) / 100}"${have === 0 ? html` disabled` : ''}>
      ${have > 0 ? html`<a href="#u${i}" class="fill" data-fill="u${i}" data-value="${have}">(${fmtNum(have)})</a>` : html`<span class="none">(0)</span>`}</td>`;
  };
  return html`<h1>Send troops</h1>
    <form method="post" action="/troops/send/preview" class="block">
      ${csrfField(d.csrf)}
      <table id="troops" class="a2b"><tbody>
        ${[0, 1, 2, 3].map((r) => html`<tr>${cols.map((c) => (c[r] !== undefined ? cell(c[r] as number) : html`<td></td>`))}</tr>`)}
        ${d.heroHome ? html`<tr><td colspan="3"><label>${unitIcon(d.tribe, 10, 16, false)} <input type="checkbox" name="hero" value="1"${d.values.hero ? html` checked` : ''}> Hero</label></td></tr>` : ''}
      </tbody></table>
      <p class="carryline"><a href="#troops" data-allunits="all">» Select all troops</a> · <a href="#troops" data-allunits="none">clear</a>
        · ${icon('res/wood', 'Resources', 18, 12)} Can carry: <b id="carry-total" data-carrytotal>0</b> resources</p>
      <table class="plain"><tbody><tr>
        <td>${MISSIONS.map((m) => html`<label class="block"><input type="radio" name="kind" value="${m.kind}"${m.kind === kind ? html` checked` : ''}> ${m.label}</label>`)}</td>
        <td><b>x</b> <input type="text" name="x" value="${d.values.x ?? ''}" class="w30" required inputmode="numeric">
          <b>y</b> <input type="text" name="y" value="${d.values.y ?? ''}" class="w30" required inputmode="numeric">
          ${d.ownVillages.length || d.places.length
            ? html`<div class="places small">${[...d.ownVillages.map((v) => ({ label: v.name, x: v.x, y: v.y })), ...d.places].map(
                (p) => html`<a href="#troops" class="place" data-x="${p.x}" data-y="${p.y}">${p.label}</a> `,
              )}</div>`
            : ''}</td>
      </tr></tbody></table>
      ${d.home.some((n, i) => n > 0 && units[i]?.type === 'catapult')
        ? catapultSelects(d.rallyLevel, (d.values.catapultTarget ?? '').split(','))
        : ''}
      <p><button type="submit">OK</button></p>
    </form>`;
}

export function confirmView(d: { tribe: TribeId; input: SendInput; preview: SendPreview; csrf: string; now: number; carry: number }): SafeHtml {
  const m = MISSIONS.find((x) => x.kind === d.input.kind);
  const arrive = d.now + d.preview.travelMs;
  return html`<h1>Confirm: ${m?.label ?? d.input.kind}</h1>
    <ul class="list">
      <li><span class="grow">Target <span class="sub">${d.preview.targetName} (${d.input.x}|${d.input.y}) · ${d.preview.targetOwner}</span></span></li>
      <li><span class="grow">Distance <span class="sub">${d.preview.distance.toFixed(1)} fields</span></span></li>
      <li><span class="grow">Travel time <span class="sub">${fmtDuration(d.preview.travelMs)} — arrives in ${timer(arrive, d.now, false)}</span></span></li>
      ${d.input.kind !== 'scout' && d.input.kind !== 'reinforce' && d.input.kind !== 'settle'
        ? html`<li><span class="grow">Can carry <span class="sub">${fmtNum(d.carry)} resources</span></span></li>`
        : ''}
    </ul>
    <h2>Troops</h2>
    ${d.input.units.some((n) => n > 0) ? unitsTable(d.tribe, d.input.units, undefined, { hideEmpty: true }) : ''}
    ${d.input.hero ? html`<p>🦸 Your hero joins this mission.</p>` : ''}
    <form method="post" action="/troops/send">
      ${csrfField(d.csrf)}
      <input type="hidden" name="x" value="${d.input.x}"><input type="hidden" name="y" value="${d.input.y}">
      <input type="hidden" name="kind" value="${d.input.kind}">
      ${d.input.units.map((n, i) => html`<input type="hidden" name="u${i}" value="${n}">`)}
      ${d.input.catapultTarget ? html`<input type="hidden" name="catapultTarget" value="${d.input.catapultTarget}">` : ''}
      ${d.input.hero ? html`<input type="hidden" name="hero" value="1">` : ''}
      <div class="actions"><button type="submit" class="block">✅ Send troops</button></div>
    </form>
    <div class="actions"><a class="btn secondary" href="/troops/send?x=${d.input.x}&amp;y=${d.input.y}&amp;kind=${d.input.kind}">← Change</a></div>`;
}

export interface MovementDetail {
  id: number;
  kind: MovementView['kind'];
  tribe: TribeId;
  units: UnitCounts;
  hero: boolean;
  merchants: number;
  loot: Resources | null;
  /** Carry capacity of the troops (null for merchants/settlers). */
  capacity: number | null;
  from: { name: string; x: number; y: number };
  to: { name: string; x: number; y: number };
  returning: boolean;
  departAt: number;
  arriveAt: number;
}

export function movementDetailView(d: MovementDetail, now: number): SafeHtml {
  const place = (p: { name: string; x: number; y: number }) => html`<a href="/map/tile?x=${p.x}&amp;y=${p.y}">${p.name}</a>`;
  const title = d.returning ? html`Returning from ${place(d.from)}` : html`${KIND_LABEL[d.kind]} to ${place(d.to)}`;
  const haul = d.loot && sumRes(d.loot) > 0 ? d.loot : null;
  const total = haul ? Math.floor(sumRes(haul)) : 0;
  const hasUnits = d.units.some((n) => n > 0);
  return html`<h1>${title}</h1>
    <table class="tb movedetail"><tbody>
      <tr><th>From</th><td>${place(d.from)}</td></tr>
      <tr><th>To</th><td>${place(d.to)}</td></tr>
      <tr><th>Set out</th><td>${fmtClock(d.departAt)}</td></tr>
      <tr><th>Arrives</th><td>in ${timer(d.arriveAt, now)} at ${fmtClock(d.arriveAt)}</td></tr>
      ${d.merchants > 0 ? html`<tr><th>Merchants</th><td>${fmtNum(d.merchants)}</td></tr>` : ''}
    </tbody></table>
    ${hasUnits || d.hero
      ? html`<h2>Troops <span class="small muted">(${fmtNum(d.units.reduce((a, b) => a + b, 0))}${d.hero ? ' + hero' : ''})</span></h2>
        ${unitsTable(d.tribe, d.units, undefined, { hideEmpty: true, hero: d.hero })}
        <p class="small">${d.units
          .map((n, i) => (n > 0 ? `${fmtNum(n)} ${TRIBES[d.tribe].units[i]?.name ?? ''}` : ''))
          .filter(Boolean)
          .join(', ')}${d.hero ? ', hero' : ''}</p>`
      : ''}
    ${d.returning || haul || d.capacity !== null
      ? html`<h2>${d.merchants > 0 && !hasUnits ? 'Goods' : 'Haul'}</h2>
        ${haul
          ? html`<table class="tb"><tbody>${RESOURCE_KEYS.map(
              (k) => html`<tr><td>${resIcon(k)} ${RESOURCE_LABEL[k]}</td><td class="num">${fmtNum(Math.floor(haul[k]))}</td></tr>`,
            )}<tr><th>Total</th><th class="num">${fmtNum(total)}${d.capacity ? html` <span class="small muted">of ${fmtNum(d.capacity)} (${Math.round((total / d.capacity) * 100)}%)</span>` : ''}</th></tr></tbody></table>`
          : html`<p class="small muted">${d.returning ? 'Coming back empty-handed.' : d.capacity !== null ? `Can carry ${fmtNum(d.capacity)} resources.` : 'No resources.'}</p>`}`
      : ''}
    <p><a href="/troops">« Back to the Rally Point</a></p>`;
}
