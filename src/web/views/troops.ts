import { BUILDINGS, TOWN_BUILDING_IDS } from '../../game/rules/buildings.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { SendInput, SendPreview } from '../../game/actions/troops.js';
import type { MovementView, StationedView } from '../../game/queries.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, timer } from './layout.js';
import { movementList, unitsInline, unitsTable } from './parts.js';

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
  return html`<h1>🚩 Rally Point</h1>
    ${d.hasRally ? '' : html`<div class="note">You need a <a href="/slot/39">Rally Point</a> before you can send troops anywhere.</div>`}
    <h2>Your troops at home</h2>
    ${unitsTable(d.tribe, d.home)}
    ${d.hasRally ? html`<div class="actions"><a class="btn block" href="/troops/send">⚔️ Send troops</a></div>` : ''}
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
  { kind: 'raid', label: '💰 Raid', help: 'Grab resources and retreat. Both sides lose fewer troops.' },
  { kind: 'attack', label: '⚔️ Attack', help: 'Fight to the end. Rams and catapults only work in an attack.' },
  { kind: 'reinforce', label: '🛡️ Reinforce', help: 'Station troops to defend a village.' },
  { kind: 'scout', label: '🔭 Scout', help: 'Spy on resources and troops (scouts only).' },
];

export function sendView(d: { tribe: TribeId; home: UnitCounts; values: Partial<SendInput>; csrf: string }): SafeHtml {
  const units = TRIBES[d.tribe].units;
  const kind = d.values.kind ?? 'raid';
  return html`<h1>⚔️ Send troops</h1>
    <form method="post" action="/troops/send/preview">
      ${csrfField(d.csrf)}
      <fieldset class="plain"><legend><b>Target</b></legend>
        <div class="row">
          <div><label for="x">X</label><input id="x" type="number" name="x" value="${d.values.x ?? ''}" required inputmode="numeric"></div>
          <div><label for="y">Y</label><input id="y" type="number" name="y" value="${d.values.y ?? ''}" required inputmode="numeric"></div>
        </div>
        <p class="small muted">Tip: open a village on the <a href="/map">map</a> and tap "Attack" or "Reinforce" to fill this in.</p>
      </fieldset>
      <fieldset class="plain"><legend><b>Mission</b></legend>
        <div class="choices inline-choices">${MISSIONS.map(
          (m) => html`<label class="choice"><input type="radio" name="kind" value="${m.kind}"${m.kind === kind ? html` checked` : ''}><strong>${m.label}</strong><div class="small muted">${m.help}</div></label>`,
        )}</div>
      </fieldset>
      <fieldset class="plain"><legend><b>Troops</b></legend>
        ${units.every((_, i) => (d.home[i] ?? 0) === 0)
          ? html`<p class="muted">You have no troops at home. Train some in the <a href="/village">Barracks</a> first.</p>`
          : units.map((u, i) => {
              const have = d.home[i] ?? 0;
              if (have === 0) return '';
              const v = d.values.units?.[i];
              return html`<div class="unitrow">
                <span class="uico" aria-hidden="true">${u.icon}</span>
                <label for="u${i}" class="small">${u.name}<br><span class="have"><a href="#u${i}" class="fill" data-fill="u${i}" data-value="${have}">all ${fmtNum(have)}</a></span></label>
                <input id="u${i}" type="number" name="u${i}" min="0" max="${have}" value="${v && v > 0 ? v : ''}" placeholder="0" inputmode="numeric">
              </div>`;
            })}
      </fieldset>
      ${d.home.some((n, i) => n > 0 && units[i]?.type === 'catapult')
        ? html`<label for="ct">Catapult target</label>
          <select id="ct" name="catapultTarget"><option value="">Random building</option>${TOWN_BUILDING_IDS.filter((b) => b !== 'wall' && b !== 'rally').map(
            (b) => html`<option value="${b}"${d.values.catapultTarget === b ? html` selected` : ''}>${BUILDINGS[b].name}</option>`,
          )}</select>`
        : ''}
      <div class="actions"><button type="submit" class="block">Continue →</button></div>
    </form>`;
}

export function confirmView(d: { tribe: TribeId; input: SendInput; preview: SendPreview; csrf: string; now: number }): SafeHtml {
  const m = MISSIONS.find((x) => x.kind === d.input.kind);
  const arrive = d.now + d.preview.travelMs;
  return html`<h1>Confirm: ${m?.label ?? d.input.kind}</h1>
    <ul class="list">
      <li><span class="grow">Target <span class="sub">${d.preview.targetName} (${d.input.x}|${d.input.y}) · ${d.preview.targetOwner}</span></span></li>
      <li><span class="grow">Distance <span class="sub">${d.preview.distance.toFixed(1)} fields</span></span></li>
      <li><span class="grow">Travel time <span class="sub">${fmtDuration(d.preview.travelMs)} — arrives in ${timer(arrive, d.now, false)}</span></span></li>
    </ul>
    <h2>Troops</h2>
    ${unitsTable(d.tribe, d.input.units, undefined, { hideEmpty: true })}
    <form method="post" action="/troops/send">
      ${csrfField(d.csrf)}
      <input type="hidden" name="x" value="${d.input.x}"><input type="hidden" name="y" value="${d.input.y}">
      <input type="hidden" name="kind" value="${d.input.kind}">
      ${d.input.units.map((n, i) => html`<input type="hidden" name="u${i}" value="${n}">`)}
      ${d.input.catapultTarget ? html`<input type="hidden" name="catapultTarget" value="${d.input.catapultTarget}">` : ''}
      <div class="actions"><button type="submit" class="block">✅ Send troops</button></div>
    </form>
    <div class="actions"><a class="btn secondary" href="/troops/send?x=${d.input.x}&amp;y=${d.input.y}&amp;kind=${d.input.kind}">← Change</a></div>`;
}
