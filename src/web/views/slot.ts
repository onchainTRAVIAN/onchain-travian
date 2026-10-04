import type { BuildOption } from '../../game/actions/build.js';
import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import { popAtLevel, type BuildingDef } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId } from '../../game/rules/units.js';
import { fmtClock, fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon } from './layout.js';
import { buildingImg, effectAt, unitIcon } from './parts.js';
import { trainingQueue } from './village.js';

function costWithTime(o: BuildOption, have: Resources): SafeHtml {
  return costLine(
    o.cost,
    have,
    html`<span>${icon('res/cropuse', 'Crop consumption')}${popAtLevel(o.def, o.nextLevel)}</span><span>${icon('res/clock', 'Duration')}${fmtDuration(o.timeMs)}</span>`,
  );
}

/** Classic "Upgrade to level N." link, or the reason it isn't possible. */
function buildAction(o: BuildOption, csrf: string, now: number, label: string, buildingId?: string): SafeHtml {
  if (o.canBuild) {
    return html`<form method="post" action="/build" class="inline">${csrfField(csrf)}
      <input type="hidden" name="slot" value="${o.slot}">${buildingId ? html`<input type="hidden" name="building" value="${buildingId}">` : ''}
      <button type="submit" class="linkbtn">${label}</button></form>`;
  }
  if (o.reason === 'Not enough resources' && o.waitMs !== undefined) {
    return html`<span class="none">Enough resources at ${fmtClock(now + o.waitMs).slice(0, 5)} (in <span data-ends="${now + o.waitMs}">${fmtDuration(o.waitMs)}</span>)</span>`;
  }
  const text = o.reason === 'Your builders are busy' ? 'The workers are already at work.' : o.reason ?? 'Not possible right now.';
  return html`<span class="none">${text}</span>`;
}

function upgradeBox(o: BuildOption, have: Resources, csrf: string, tribe: TribeId, now: number): SafeHtml {
  const nowEffect = effectAt(o.def, o.currentLevel, tribe);
  const nextEffect = effectAt(o.def, o.nextLevel, tribe);
  return html`
    ${nowEffect || nextEffect
      ? html`<table class="tb effect"><tbody>
          ${o.currentLevel > 0 && nowEffect ? html`<tr><th>Current:</th><td>${nowEffect}</td></tr>` : ''}
          ${!o.maxed && nextEffect ? html`<tr><th>At level ${o.nextLevel}:</th><td>${nextEffect}</td></tr>` : ''}
        </tbody></table>`
      : ''}
    ${o.maxed
      ? html`<p class="none">${o.def.name} is fully upgraded.</p>`
      : html`<p><b>Costs</b> for upgrading to level ${o.nextLevel}:</p>
        ${costWithTime(o, have)}
        <p>${buildAction(o, csrf, now, `Upgrade to level ${o.nextLevel}.`)}</p>`}`;
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
  if (t.options.length === 0) return html``;
  return html`<table class="tb train"><thead><tr><th>Name</th><th>Quantity</th><th>Max</th></tr></thead><tbody>
    ${t.options.map(
      (o) => html`<tr id="u${o.slot}">
        <td><div class="tname">${unitIcon(tribe, o.slot)} <b>${o.unit.name}</b> <span class="small muted">(${fmtNum(o.unit.attack)}/${fmtNum(o.unit.defInf)}/${fmtNum(o.unit.defCav)} · speed ${o.unit.speed})</span></div>
          ${costLine(o.cost, have, html`<span>${icon('res/cropuse', 'Crop consumption')}${o.unit.upkeep}</span><span>${icon('res/clock', 'Duration')}${fmtDuration(o.timeMs)}</span>`)}
          ${o.available ? '' : html`<div class="small none">${o.reason}</div>`}</td>
        <td class="center">${o.available
          ? html`<form method="post" action="/train" id="tf${o.slot}" class="inline">${csrfField(csrf)}<input type="hidden" name="unit" value="${o.slot}"><input type="hidden" name="building" value="${t.building}">
              <label class="sr" for="n${o.slot}">How many ${o.unit.name}</label>
              <input id="n${o.slot}" type="number" name="count" min="1" max="${Math.max(1, o.maxAffordable)}" inputmode="numeric" placeholder="0">
              <button type="submit" class="small"${o.maxAffordable === 0 ? html` disabled` : ''}>Train</button></form>`
          : '-'}</td>
        <td class="center">${o.available ? html`<a href="#u${o.slot}" class="fill" data-fill="n${o.slot}" data-value="${o.maxAffordable}">(${fmtNum(o.maxAffordable)})</a>` : ''}</td>
      </tr>`,
    )}
  </tbody></table>
  ${t.queue.length > 0 ? trainingQueue(t.queue, tribe, now, csrf) : ''}`;
}

export function slotView(d: SlotViewData): SafeHtml {
  // Empty building site: list what can be built.
  if (!d.def) {
    const ready = d.buildable.filter((o) => !o.reason?.startsWith('Requires'));
    const soon = d.buildable.filter((o) => o.reason?.startsWith('Requires'));
    return html`<h1>Construct new building</h1>
      ${ready.length === 0 ? html`<p class="muted">No buildings available for this site right now.</p>` : ''}
      ${ready.map(
        (o) => html`<div class="newbuild">
          <div class="nbimg">${buildingImg(o.def.id)}</div>
          <div><h2>${o.def.name}</h2><p class="desc">${o.def.description}</p>
            <p><b>Costs</b> for construction:</p>${costWithTime(o, d.have)}
            <p>${buildAction(o, d.csrf, d.now, 'Construct building.', o.def.id)}</p></div>
        </div>`,
      )}
      ${soon.length
        ? html`<h2 class="soonh">Soon available buildings</h2>${soon.map(
            (o) => html`<div class="newbuild soon"><div class="nbimg">${buildingImg(o.def.id)}</div>
              <div><h2>${o.def.name}</h2><p class="small">${o.def.description}</p><p class="small none">${o.reason}</p></div></div>`,
          )}`
        : ''}`;
  }

  const def = d.def;
  return html`<h1>${def.name} <span class="lvl">${d.level > 0 ? `level ${d.level}` : ''}</span></h1>
    <div class="bheader"><div class="bimg">${buildingImg(def.id)}</div><p class="desc">${def.description}</p></div>
    ${d.option ? upgradeBox(d.option, d.have, d.csrf, d.tribe, d.now) : ''}
    ${d.level > 0 && def.id === 'rally' ? html`<p><a href="/troops">» Troops overview</a> · <a href="/troops/send">» Send troops</a></p>` : ''}
    ${d.level > 0 ? d.panels : ''}
    ${d.training && d.level > 0 ? trainingPanel(d.training, d.tribe, d.have, d.csrf, d.now) : ''}`;
}
