import type { BuildOption } from '../../game/actions/build.js';
import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import { popAtLevel, type BuildingDef } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId } from '../../game/rules/units.js';
import { fmtClock, fmtDuration, fmtNum, fmtUnitTime } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon, resIcon, timer } from './layout.js';
import { buildingImg, effectAt, unitIcon } from './parts.js';
import { trainingQueue } from './village.js';
import { UNIT_GUIDE } from '../../game/rules/unitguide.js';

function costWithTime(o: BuildOption, have: Resources): SafeHtml {
  return costLine(
    o.cost,
    have,
    html`<span>${icon('res/cropuse', 'Crop consumption', 18, 12)}${popAtLevel(o.def, o.nextLevel)}</span><span>${icon('res/clock', 'Duration', 18, 12)}${fmtDuration(o.timeMs)}</span>`,
  );
}

/** Classic "Upgrade to level N." link, or the reason it isn't possible. */
function buildAction(o: BuildOption, csrf: string, now: number, label: string, buildingId?: string): SafeHtml {
  if (o.canBuild) {
    return html`<form method="post" action="/build">${csrfField(csrf)}
      <input type="hidden" name="slot" value="${o.slot}">${buildingId ? html`<input type="hidden" name="building" value="${buildingId}">` : ''}
      <button type="submit" class="linkbtn">${label}</button></form>`;
  }
  if (o.reason === 'Not enough resources' && o.waitMs !== undefined) {
    // The countdown reloads the page when it ends, so the build link appears by itself.
    return html`<span class="none">Enough resources in ${timer(now + o.waitMs, now)} (at ${fmtClock(now + o.waitMs).slice(0, 5)})</span>`;
  }
  if (o.reason === 'Not enough resources') return html`<span class="none">Not enough resources</span>`;
  const text = o.reason === 'Your builders are busy' ? 'The workers are already at work.' : o.reason ?? 'Not possible right now.';
  return html`<span class="none">${text}</span>`;
}

function upgradeBox(o: BuildOption, have: Resources, csrf: string, tribe: TribeId, now: number): SafeHtml {
  const nowEffect = effectAt(o.def, o.currentLevel, tribe);
  const nextEffect = effectAt(o.def, o.nextLevel, tribe);
  return html`
    ${nowEffect || nextEffect
      ? html`<table id="build_value"><tbody>
          ${o.currentLevel > 0 && nowEffect ? html`<tr><th>Current:</th><td>${nowEffect}</td></tr>` : ''}
          ${!o.maxed && nextEffect ? html`<tr><th>Level ${o.nextLevel}:</th><td>${nextEffect}</td></tr>` : ''}
        </tbody></table>`
      : ''}
    ${o.maxed
      ? html`<p class="none">${o.def.name} is fully upgraded.</p>`
      : html`<p class="contract"><b>Costs</b> for upgrading to level ${o.nextLevel}:<br>${costWithTime(o, have)}</p>
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

/** Classic training table: one form, a quantity box per unit and a single Train button. */
function trainingPanel(t: NonNullable<SlotViewData['training']>, tribe: TribeId, have: Resources, csrf: string, now: number): SafeHtml {
  if (t.options.length === 0) return html``;
  const anyAvailable = t.options.some((o) => o.available);
  return html`<form method="post" action="/train" class="block">${csrfField(csrf)}<input type="hidden" name="building" value="${t.building}">
    <table class="build_details"><thead><tr><th>Name</th><th>Quantity</th><th>Max</th></tr></thead><tbody>
    ${t.options.map(
      (o) => html`<tr id="u${o.slot}">
        <td class="desc">${unitIcon(tribe, o.slot)} <b>${o.unit.name}</b> <span class="small muted" title="${UNIT_GUIDE[o.unit.id]?.use ?? ''}">${UNIT_GUIDE[o.unit.id]?.kind ?? ''}</span>
          <div class="details">${costLine(o.cost, have, html`<span>${icon('res/cropuse', 'Crop consumption', 18, 12)}${o.unit.upkeep}</span><span title="per unit">${icon('res/clock', 'Duration', 18, 12)}${fmtUnitTime(o.timeMs)}</span>${o.unit.carry > 0 ? html`<span class="carry" title="Resources each one can carry home from a raid">carries ${fmtNum(o.unit.carry)}</span>` : ''}`)}
          ${o.available ? '' : html`<span class="none">${o.reason}</span>`}</div></td>
        <td class="val">${o.available
          ? html`<label class="sr" for="t${o.slot}">How many ${o.unit.name}</label><input class="w30 tr-in" id="t${o.slot}" type="number" name="t${o.slot}" min="0" max="${o.maxAffordable}" inputmode="numeric" value="0"
              data-cost="${o.cost.wood},${o.cost.clay},${o.cost.iron},${o.cost.crop},${o.unit.upkeep},${o.timeMs},${o.unit.carry}">`
          : html`<span class="none">-</span>`}</td>
        <td class="max">${o.available ? html`<a href="#u${o.slot}" class="fill" data-fill="t${o.slot}" data-value="${o.maxAffordable}">(${fmtNum(o.maxAffordable)})</a>` : html`<span class="none">(0)</span>`}</td>
      </tr>`,
    )}
    </tbody></table>
    ${anyAvailable
      ? html`<div class="train-total" id="train-total" data-have="${Math.floor(have.wood)},${Math.floor(have.clay)},${Math.floor(have.iron)},${Math.floor(have.crop)}">
          <b>Total:</b>
          <span id="tt-wood">${resIcon('wood')}0</span><span id="tt-clay">${resIcon('clay')}0</span><span id="tt-iron">${resIcon('iron')}0</span><span id="tt-crop">${resIcon('crop')}0</span>
          <span id="tt-upkeep">${icon('res/cropuse', 'Crop consumption', 18, 12)}0</span><span id="tt-time">${icon('res/clock', 'Duration', 18, 12)}0:00:00</span><span id="tt-carry" class="carry" title="Resources these troops can carry"><b>can carry</b> 0</span>
        </div>
        <p><button type="submit">train</button></p>`
      : ''}
  </form>
  ${t.queue.length > 0 ? trainingQueue(t.queue, tribe, now, csrf) : ''}`;
}

export function slotView(d: SlotViewData): SafeHtml {
  // Empty building site: classic "Construct new building" list.
  if (!d.def) {
    const ready = d.buildable.filter((o) => !o.reason?.startsWith('Requires'));
    const soon = d.buildable.filter((o) => o.reason?.startsWith('Requires'));
    return html`<div id="build" class="gid0"><h1>Construct new building</h1>
      ${ready.length === 0 ? html`<p class="none">No buildings available for this building site right now.</p>` : ''}
      ${ready.map(
        (o) => html`<h2>${o.def.name}</h2><table class="new_building"><tbody><tr>
          <td class="desc">${o.def.description}<br><br><b>Costs</b> for construction:<br>${costWithTime(o, d.have)}<br>
            ${buildAction(o, d.csrf, d.now, 'Construct building.', o.def.id)}</td>
          <td class="bimg">${buildingImg(o.def.id)}</td></tr></tbody></table>`,
      )}
      ${soon.length
        ? html`<h2 class="none">Soon available buildings</h2>${soon.map(
            (o) => html`<h2>${o.def.name}</h2><table class="new_building"><tbody><tr>
              <td class="desc">${o.def.description}<br><span class="requ none">${o.reason}</span></td>
              <td class="bimg">${buildingImg(o.def.id)}</td></tr></tbody></table>`,
          )}`
        : ''}</div>`;
  }

  const def = d.def;
  return html`<div id="build" class="gid-${def.id}">
    <h1>${def.name} <span class="lvl">level ${d.level}</span></h1>
    <p class="build_desc">${buildingImg(def.id, def.name, true, d.level)}${def.description}</p>
    ${d.option ? upgradeBox(d.option, d.have, d.csrf, d.tribe, d.now) : ''}
    ${d.level > 0 && def.id === 'rally' ? html`<p><a href="/troops">» Overview</a> | <a href="/troops/send">» Send troops</a></p>` : ''}
    ${d.level > 0 ? d.panels : ''}
    ${d.training && d.level > 0 ? trainingPanel(d.training, d.tribe, d.have, d.csrf, d.now) : ''}
  </div>`;
}
