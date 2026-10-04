import type { BuildOption } from '../../game/actions/build.js';
import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import type { BuildingDef } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId } from '../../game/rules/units.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField } from './layout.js';
import { effectAt } from './parts.js';
import { trainingQueue } from './village.js';

function buildButton(o: BuildOption, csrf: string, label: string, now: number, buildingId?: string): SafeHtml {
  if (o.canBuild) {
    return html`<form method="post" action="/build">${csrfField(csrf)}
      <input type="hidden" name="slot" value="${o.slot}">${buildingId ? html`<input type="hidden" name="building" value="${buildingId}">` : ''}
      <button type="submit" class="block">${label}</button></form>`;
  }
  return html`<p class="${o.reason === 'Not enough resources' ? 'warn' : 'muted'} small"><b>${o.reason ?? 'Not possible right now'}</b>${
    o.waitMs !== undefined ? html` — enough resources in <span data-ends="${now + o.waitMs}">${fmtDuration(o.waitMs)}</span>` : ''
  }</p>`;
}

function upgradeBox(o: BuildOption, have: Resources, csrf: string, tribe: TribeId, now: number): SafeHtml {
  if (o.maxed) return html`<div class="note">🏅 ${o.def.name} is fully upgraded.</div>`;
  const nowEffect = effectAt(o.def, o.currentLevel, tribe);
  const nextEffect = effectAt(o.def, o.nextLevel, tribe);
  return html`<h2>Upgrade to level ${o.nextLevel}</h2>
    ${nowEffect || nextEffect ? html`<p>${nowEffect ? html`Now: <b>${nowEffect}</b><br>` : ''}${nextEffect ? html`At level ${o.nextLevel}: <b class="good">${nextEffect}</b>` : ''}</p>` : ''}
    ${costLine(o.cost, have)}
    <p class="small muted">⏱ Build time ${fmtDuration(o.timeMs)}</p>
    ${buildButton(o, csrf, `Upgrade to level ${o.nextLevel}`, now)}`;
}

export interface SlotViewData {
  slot: number;
  def: BuildingDef | null;
  level: number;
  option: BuildOption | null;
  buildable: BuildOption[];
  have: Resources;
  tribe: TribeId;
  training: { building: string; options: TrainOption[]; queue: TrainOrderRow[] } | null;
  /** Building-specific panels (academy, market, residence...). */
  panels: SafeHtml[];
  csrf: string;
  now: number;
}

function trainingPanel(t: NonNullable<SlotViewData['training']>, tribe: TribeId, have: Resources, csrf: string, now: number): SafeHtml {
  return html`<h2>🎯 Train troops</h2>
    ${t.options.map(
      (o) => html`<div class="unitrow" id="u${o.slot}">
        <span class="uico" aria-hidden="true">${o.unit.icon}</span>
        <div><b>${o.unit.name}</b> <span class="muted small">${o.unit.description}</span>
          <div class="small muted">⚔️ ${o.unit.attack} · 🛡️ ${o.unit.defInf}/${o.unit.defCav} · 🏃 ${o.unit.speed}/h · 🎒 ${o.unit.carry} · 🌾 ${o.unit.upkeep}/h</div>
          ${costLine(o.cost, have)}
          <div class="small muted">⏱ ${fmtDuration(o.timeMs)} each</div>
          ${o.available ? '' : html`<div class="small warn"><b>${o.reason}</b></div>`}
        </div>
        <div>${o.available
          ? html`<form method="post" action="/train">${csrfField(csrf)}<input type="hidden" name="unit" value="${o.slot}"><input type="hidden" name="building" value="${t.building}">
              <label class="sr" for="n${o.slot}">How many ${o.unit.name}</label>
              <input id="n${o.slot}" type="number" name="count" min="1" max="${Math.max(1, o.maxAffordable)}" inputmode="numeric" placeholder="0">
              <a href="#u${o.slot}" class="fill small" data-fill="n${o.slot}" data-value="${o.maxAffordable}">max ${fmtNum(o.maxAffordable)}</a>
              <button type="submit" class="small block"${o.maxAffordable === 0 ? html` disabled` : ''}>Train</button></form>`
          : ''}</div>
      </div>`,
    )}
    ${t.queue.length > 0 ? html`<h3>In training</h3>${trainingQueue(t.queue, tribe, now, csrf)}` : ''}`;
}

export function slotView(d: SlotViewData): SafeHtml {
  // Empty plot: choose what to build.
  if (!d.def) {
    return html`<h1>➕ Build a new building</h1>
      <p class="muted small">Choose what to build on this plot. Buildings with unmet requirements are listed at the bottom.</p>
      ${d.buildable.length === 0 ? html`<p class="muted">There is nothing left to build here right now.</p>` : ''}
      ${d.buildable.map(
        (o) => html`<div class="note">
          <h3>${o.def.icon} ${o.def.name}</h3>
          <p class="small">${o.def.description}</p>
          ${costLine(o.cost, d.have)}
          <p class="small muted">⏱ ${fmtDuration(o.timeMs)}</p>
          ${buildButton(o, d.csrf, `Build ${o.def.name}`, d.now, o.def.id)}
        </div>`,
      )}
      <div class="actions"><a class="btn secondary" href="/village">← Village center</a></div>`;
  }

  const def = d.def;
  const back = def.kind === 'field' ? html`<a class="btn secondary" href="/fields">← Resource fields</a>` : html`<a class="btn secondary" href="/village">← Village center</a>`;
  const extra: SafeHtml[] = [];
  if (def.id === 'rally' && d.level > 0) {
    extra.push(html`<div class="actions"><a class="btn" href="/troops">🚩 Open Rally Point</a><a class="btn secondary" href="/troops/send">⚔️ Send troops</a></div>`);
  }
  if (d.level > 0) extra.push(...d.panels);
  if (d.training && d.level > 0) extra.push(trainingPanel(d.training, d.tribe, d.have, d.csrf, d.now));

  return html`<h1>${def.icon} ${def.name} <span class="muted small">${d.level > 0 ? `level ${d.level}` : 'not built yet'}</span></h1>
    <p>${def.description}</p>
    ${d.option ? upgradeBox(d.option, d.have, d.csrf, d.tribe, d.now) : ''}
    ${extra}
    <div class="actions">${back}</div>`;
}

