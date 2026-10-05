import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import { BUILDINGS, type BuildingId } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId, UnitCounts } from '../../game/rules/units.js';
import { UNIT_GUIDE } from '../../game/rules/unitguide.js';
import { fmtNum, fmtUnitTime } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon, resIcon } from './layout.js';
import { unitIcon } from './parts.js';
import { trainingQueue } from './village.js';

export interface TrainGroup {
  building: BuildingId;
  slot: number;
  level: number;
  options: TrainOption[];
  queue: TrainOrderRow[];
}

/** Every unit this village can train, from all its training buildings, in one form. */
export function trainAllView(d: { tribe: TribeId; groups: TrainGroup[]; have: Resources; home: UnitCounts; csrf: string; now: number }): SafeHtml {
  const any = d.groups.some((g) => g.options.some((o) => o.available));
  const head = html`<div class="vtitle"><h1>Train troops</h1><span class="vmeta">all training buildings of this village in one place</span></div>`;
  if (d.groups.length === 0) {
    return html`${head}<p class="note">Build a <b>Barracks</b> (Main Building 3, Rally Point 1) to start training soldiers. Stable, Workshop and the Great Barracks/Stable add more units.</p>`;
  }
  return html`${head}
    <form method="post" action="/train/all" class="block">${csrfField(d.csrf)}
    ${d.groups.map(
      (g) => html`<section class="spanel tgroup"><h3 class="sp-head"><a href="/slot/${g.slot}">${BUILDINGS[g.building].name}</a><span>level ${g.level}</span></h3>
        ${g.options.length === 0
          ? html`<p class="pad small muted">No units researched for this building yet — research them in the <a href="/build?b=academy">Academy</a>.</p>`
          : html`<table class="build_details tall"><tbody>${g.options.map(
              (o) => html`<tr>
                <td class="desc">${unitIcon(d.tribe, o.slot)} <b>${o.unit.name}</b> <span class="avail">(Available: ${fmtNum(d.home[o.slot] ?? 0)})</span>
                  <span class="small muted" title="${UNIT_GUIDE[o.unit.id]?.use ?? ''}">${UNIT_GUIDE[o.unit.id]?.kind ?? ''}</span>
                  <div class="details">${costLine(o.cost, d.have, html`<span>${icon('res/cropuse', 'Crop consumption', 18, 12)}${o.unit.upkeep}</span><span title="per unit">${icon('res/clock', 'Duration', 18, 12)}${fmtUnitTime(o.timeMs)}</span>${o.unit.carry > 0 ? html`<span class="carry">carries ${fmtNum(o.unit.carry)}</span>` : ''}`)}
                  ${o.available ? '' : html`<span class="none">${o.reason}</span>`}</div></td>
                <td class="val">${o.available
                  ? html`<label class="sr" for="t_${g.building}_${o.slot}">How many ${o.unit.name}</label><input class="w30 tr-in" id="t_${g.building}_${o.slot}" type="number" name="t_${g.building}_${o.slot}" min="0" max="${o.maxAffordable}" inputmode="numeric" placeholder="0"
                      data-cost="${o.cost.wood},${o.cost.clay},${o.cost.iron},${o.cost.crop},${o.unit.upkeep},${o.timeMs},${o.unit.carry}">`
                  : html`<span class="none">-</span>`}</td>
                <td class="max">${o.available ? html`<a href="#t_${g.building}_${o.slot}" class="fill" data-fill="t_${g.building}_${o.slot}" data-value="${o.maxAffordable}">(${fmtNum(o.maxAffordable)})</a>` : html`<span class="none">(0)</span>`}</td>
              </tr>`,
            )}</tbody></table>`}
      </section>`,
    )}
    ${any
      ? html`<div class="train-total sticky" id="train-total" data-have="${Math.floor(d.have.wood)},${Math.floor(d.have.clay)},${Math.floor(d.have.iron)},${Math.floor(d.have.crop)}">
          <b>Total:</b>
          <span id="tt-wood">${resIcon('wood')}0</span><span id="tt-clay">${resIcon('clay')}0</span><span id="tt-iron">${resIcon('iron')}0</span><span id="tt-crop">${resIcon('crop')}0</span>
          <span id="tt-upkeep">${icon('res/cropuse', 'Crop consumption', 18, 12)}0</span><span id="tt-time">${icon('res/clock', 'Duration', 18, 12)}0:00:00</span><span id="tt-carry" class="carry"><b>can carry</b> 0</span>
          <button type="submit">Train all</button>
        </div>
        <p class="small muted">Each building trains its own queue at the same time. The total cost counts everything you entered; if resources run out, the first rows are trained first.</p>`
      : ''}
    </form>
    ${d.groups.some((g) => g.queue.length)
      ? html`<section class="spanel"><h3 class="sp-head">In training</h3><div class="pad">${d.groups
          .filter((g) => g.queue.length)
          .map((g) => html`<p class="small"><b>${BUILDINGS[g.building].name}</b></p>${trainingQueue(g.queue, d.tribe, d.now, d.csrf)}`)}</div></section>`
      : ''}`;
}
