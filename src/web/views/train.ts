import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import { AUTO_GOALS, AUTO_TRAIN_MAX_HOURS, AUTO_TRAIN_MIN_HOURS, type AutoGoal, type AutoPlanSummary, type AutoTrainItem, type AutoTrainRow, type AutoUnitRow } from '../../game/actions/autotrain.js';
import { RESOURCE_KEYS } from '../../game/rules/resources.js';
import { BUILDINGS, type BuildingId } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId, UnitCounts } from '../../game/rules/units.js';
import { UNIT_GUIDE } from '../../game/rules/unitguide.js';
import { fmtDuration, fmtNum, fmtUnitTime } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon, resIcon, timer } from './layout.js';
import { panel, svgBar, unitIcon } from './parts.js';
import { trainingQueue } from './village.js';

export interface TrainGroup {
  building: BuildingId;
  slot: number;
  level: number;
  options: TrainOption[];
  queue: TrainOrderRow[];
}

/** Every unit this village can train, from all its training buildings, in one form. */
export interface AutoTrainData {
  rows: AutoUnitRow[];
  income: Resources;
  stock: Resources;
  hours: number;
  values: Record<string, number>;
  goal: AutoGoal | null;
  plan: (Omit<AutoTrainRow, 'items'> & { items: AutoTrainItem[] }) | null;
  summary: AutoPlanSummary;
}

export function trainAllView(d: { tribe: TribeId; groups: TrainGroup[]; have: Resources; home: UnitCounts; owned: UnitCounts; academySlot: number | null; csrf: string; now: number; auto?: AutoTrainData }): SafeHtml {
  const any = d.groups.some((g) => g.options.some((o) => o.available));
  const head = html`<div class="vtitle"><h1>Train troops</h1><span class="vmeta">all training buildings of this village in one place${d.auto && d.auto.rows.length ? html` · <a href="#auto">» Auto training${d.auto.plan?.active ? ' (running)' : ''}</a>` : ''}</span></div>`;
  if (d.groups.length === 0) {
    return html`${head}${panel('No training buildings yet', html`<p class="small">Build a <a href="/village"><b>Barracks</b></a> (Main Building 3, Rally Point 1) to start training soldiers. Stable, Workshop and the Great Barracks/Stable add more units.</p>`)}`;
  }
  return html`${head}
    <form method="post" action="/train/all" class="block">${csrfField(d.csrf)}
    ${d.groups.map(
      (g) => html`<section class="spanel tgroup"><h3 class="sp-head"><a href="/slot/${g.slot}">${BUILDINGS[g.building].name}</a><span>level ${g.level}</span></h3>
        ${g.options.length === 0
          ? html`<p class="pad small muted">No units researched for this building yet — research them in the ${d.academySlot ? html`<a href="/slot/${d.academySlot}">Academy</a>` : 'Academy'}.</p>`
          : html`<table class="build_details tall"><tbody>${g.options.map(
              (o) => html`<tr>
                <td class="desc">${unitIcon(d.tribe, o.slot)} <b>${o.unit.name}</b> <span class="avail" title="${fmtNum(d.home[o.slot] ?? 0)} at home now · ${fmtNum(d.owned[o.slot] ?? 0)} in total (incl. away and on the move)">(You have: ${fmtNum(d.owned[o.slot] ?? 0)})</span>
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
          <button type="submit" class="gbtn green">Train all</button>
        </div>
        <p class="small muted">Each building trains its own queue at the same time. The total cost counts everything you entered; if resources run out, the first rows are trained first.</p>`
      : ''}
    </form>
    ${d.auto && d.auto.rows.length ? autoTrainPanel(d.tribe, d.auto, d.csrf, d.now) : ''}
    ${d.groups.some((g) => g.queue.length)
      ? html`<section class="spanel"><h3 class="sp-head">In training</h3><div class="pad">${d.groups
          .filter((g) => g.queue.length)
          .map((g) => html`<p class="small"><b>${BUILDINGS[g.building].name}</b></p>${trainingQueue(g.queue, d.tribe, d.now, d.csrf)}`)}</div></section>`
      : ''}`;
}

const n0 = (n: number): string => fmtNum(Math.round(n));
const hm = (h: number): string => (h >= 1 ? `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min` : `${Math.round(h * 60)} min`);

/** Auto training: units per hour for 1-8 hours, quick setups and live formulas (app.js recalculates as you type). */
function autoTrainPanel(tribe: TribeId, a: AutoTrainData, csrf: string, now: number): SafeHtml {
  const p = a.plan;
  const sm = a.summary;
  const running = !!p?.active;
  const byBuilding = new Map<string, AutoUnitRow[]>();
  for (const r of a.rows) byBuilding.set(r.building, [...(byBuilding.get(r.building) ?? []), r]);
  const status = p
    ? html`<div class="at-status ${running ? 'on' : 'off'}">
        ${running
          ? html`<p><b class="ok">Running</b> · ends in ${timer(p.endsAt, now)} · started for ${p.hours} h</p>`
          : html`<p><b>Finished</b> ${fmtDuration(Math.max(0, now - p.endsAt))} ago (${p.hours} h run). Your settings are kept below — press <b>Start</b> to run it again.</p>`}
        <table class="build_details at-progress"><thead><tr><th>Unit</th><th>Planned</th><th>Trained</th><th title="Units the plan wanted while the village couldn't pay for them">Short of resources</th></tr></thead><tbody>
        ${p.items.map((i) => html`<tr><td>${unitIcon(tribe, i.slot)} ${a.rows.find((r) => r.building === i.building && r.slot === i.slot)?.unit.name ?? ''} <span class="small muted">(${BUILDINGS[i.building].name})</span></td><td class="num">${fmtNum(i.perHour)}/h</td><td class="num"><b>${fmtNum(i.trained)}</b></td><td class="num${i.short ? ' bad' : ''}">${fmtNum(i.short)}</td></tr>`)}
        </tbody></table>
        ${running ? html`<form method="post" action="/train/auto/stop" class="inl">${csrfField(csrf)}<button type="submit" class="gbtn secondary">Stop auto training</button></form>` : ''}
      </div>`
    : '';
  const hoursLinks = (goal: AutoGoal) => `/troops/train?auto=${goal}&hours=${a.hours}#auto`;
  const resRow = (label: string, r: Resources, cls = '', id = '') =>
    html`<tr${id ? html` id="${id}"` : ''}><th>${label}</th>${RESOURCE_KEYS.map((k) => html`<td class="num ${cls}" data-k="${k}">${n0(r[k])}</td>`)}</tr>`;
  return html`<section class="spanel autotrain" id="auto">
    <h3 class="sp-head">Auto training<span>${running ? 'running' : 'off'}</span></h3>
    <div class="pad">
      ${status}
      <p class="small">Set how many units each building should train <b>per hour</b> and for how long (1–8 hours). Every minute the game queues what is due. If the village can't pay for it at that moment, it trains <b>as many as it can</b>. When the time is up it stops — you start it again yourself.</p>
      <div class="at-quick"><b>Quick setup</b> <span class="small muted">best unit for each building, all buildings equally busy, paid from your income plus your stock spread over the hours:</span>
        <span class="at-goals">${(Object.keys(AUTO_GOALS) as AutoGoal[]).map((g) => html`<a class="gbtn${a.goal === g ? '' : ' secondary'}" data-at-goal="${g}" href="${hoursLinks(g)}">${AUTO_GOALS[g]}</a>`)}<a class="small" href="/troops/train#auto" data-at-clear>clear</a></span></div>
      <form method="post" action="/train/auto" id="at-form" data-income="${RESOURCE_KEYS.map((k) => Math.round(a.income[k])).join(',')}" data-stock="${RESOURCE_KEYS.map((k) => Math.floor(a.stock[k])).join(',')}">${csrfField(csrf)}
        <fieldset class="at-hours"><legend>Run for</legend>${Array.from({ length: AUTO_TRAIN_MAX_HOURS - AUTO_TRAIN_MIN_HOURS + 1 }, (_, i) => i + AUTO_TRAIN_MIN_HOURS).map(
          (h) => html`<label><input type="radio" name="hours" value="${h}"${h === a.hours ? html` checked` : ''}><span>${h} h</span></label>`,
        )}</fieldset>
        <div class="tblwrap"><table class="build_details at-table"><thead><tr><th>Unit</th><th>Cost per unit</th><th title="Training time per unit in this building">Time</th><th title="Most this building can finish per hour">Max/h</th><th>Per hour</th><th></th></tr></thead>
        ${[...byBuilding].map(([b, rows]) => {
          const load = sm.load[b as keyof typeof sm.load] ?? 0;
          return html`<tbody><tr class="at-bhead"><th colspan="6">${BUILDINGS[b as keyof typeof BUILDINGS].name} <span class="at-load" data-load-b="${b}">${svgBar(load * 100, load > 1 ? 'atbad' : 'atok')}<span>${Math.round(load * 100)}% busy</span></span></th></tr>
          ${rows.map((r) => html`<tr class="${r.available ? '' : 'na'}">
            <td>${unitIcon(tribe, r.slot)} <b>${r.unit.name}</b>${r.available ? '' : html`<br><span class="none small">${r.reason}</span>`}</td>
            <td class="small at-cost">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(r.cost[k])}</span>`)}<span title="crop eaten per hour">${icon('res/cropuse', 'Crop consumption', 18, 12)}${r.unit.upkeep}</span></td>
            <td class="small nowrap">${fmtUnitTime(r.timeMs)}</td>
            <td class="num small">${fmtNum(r.capPerHour)}</td>
            <td>${r.available
              ? html`<label class="sr" for="a_${r.key}">${r.unit.name} per hour</label><input class="w30 at-in" id="a_${r.key}" name="a_${r.key}" type="number" min="0" max="${r.capPerHour}" inputmode="numeric" placeholder="0" value="${a.values[r.key] ? String(a.values[r.key]) : ''}"
                  data-key="${r.key}" data-b="${r.building}" data-cost="${RESOURCE_KEYS.map((k) => r.cost[k]).join(',')}" data-up="${r.unit.upkeep}" data-time="${r.timeMs}" data-cap="${r.capPerHour}">`
              : html`<span class="none">-</span>`}</td>
            <td>${r.available ? html`<button type="button" class="lnk small" data-at-max="${r.key}" title="As many per hour as your income + stock and this building's free time allow, next to the other rows">max</button>` : ''}</td>
          </tr>`)}</tbody>`;
        })}
        </table></div>
        <div class="at-sum" id="at-sum">
          <div class="tblwrap"><table class="build_details at-res"><thead><tr><th></th>${RESOURCE_KEYS.map((k) => html`<th>${resIcon(k)}</th>`)}</tr></thead><tbody>
            ${resRow('Income per hour', a.income, '', 'at-income')}
            ${resRow('Cost per hour', sm.costPerHour, '', 'at-cph')}
            <tr id="at-cover"><th title="Share of the cost per hour your production pays">Income covers</th>${RESOURCE_KEYS.map((k) => html`<td data-k="${k}">${svgBar(sm.coverage[k] * 100, sm.coverage[k] < 1 ? 'atbad' : 'atok')}<span>${Math.round(sm.coverage[k] * 100)}%</span></td>`)}</tr>
            ${resRow('Your stock now', a.stock, 'muted', 'at-stock')}
            ${resRow('Total for the run', sm.totalCost, '', 'at-total')}
          </tbody></table></div>
          <ul class="at-facts">
            <li>Units per hour: <b id="at-uph">${fmtNum(sm.unitsPerHour)}</b> · in <b id="at-h">${a.hours}</b> h: <b id="at-units">${fmtNum(Math.round(sm.totalUnits))}</b> units</li>
            <li id="at-lasts">${sm.costPerHour.wood + sm.costPerHour.clay + sm.costPerHour.iron + sm.costPerHour.crop === 0 ? 'Enter units per hour to see how long your resources last.' : Number.isFinite(sm.stockLastsH) ? html`Income doesn't cover it all: your stock pays the gap for about <b>${hm(sm.stockLastsH)}</b>${sm.stockLastsH < a.hours ? ' — after that it trains as many as income allows' : ' — enough for the whole run'}.` : html`<b class="ok">Your income pays for everything</b> — your stock is not touched.`}</li>
            <li id="at-crop">New troops eat <b>+${fmtNum(Math.round(sm.extraUpkeep))}</b> crop per hour after the run (crop income then about <b>${fmtNum(Math.round(a.income.crop - sm.extraUpkeep))}</b>/h).</li>
          </ul>
        </div>
        <p><button type="submit" class="gbtn green">${running ? 'Restart with these settings' : 'Start auto training'}</button> <span class="small muted">Settlers and chiefs are never auto-trained. You can still train by hand at the same time.</span></p>
      </form>
    </div>
  </section>`;
}
