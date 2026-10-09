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
import { help } from './tips.js';

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
  // One "?" per concept: on the first unit that shows it.
  const opts = d.groups.flatMap((g) => g.options);
  const firstOpt = opts[0];
  const firstCarry = opts.find((o) => o.unit.carry > 0);
  const firstAvail = opts.find((o) => o.available);
  const head = html`<div class="vtitle"><h1>Train troops</h1><span class="vmeta">all training buildings of this village in one place${d.auto && d.auto.rows.length ? html` · <a href="#auto">» Auto training${d.auto.plan?.active ? ' (running)' : ''}</a>` : ''}</span></div>`;
  if (d.groups.length === 0) {
    return html`${head}${panel('No training buildings yet', html`<p class="small">Build a <a href="/village"><b>Barracks</b></a> (Main Building 3, Rally Point 1) to start training soldiers. Stable, Workshop and the Great Barracks/Stable add more units.</p>`)}`;
  }
  return html`${head}
    <form method="post" action="/train/all" class="block">${csrfField(d.csrf)}
    ${d.groups.map(
      (g) => html`<section class="spanel tgroup"><h3 class="sp-head"><a href="/slot/${g.slot}">${BUILDINGS[g.building].name}</a><span>level ${g.level}</span></h3>
        ${g.options.length === 0
          ? html`<p class="pad small muted">No units researched for this building yet - research them in the ${d.academySlot ? html`<a href="/slot/${d.academySlot}">Academy</a>` : 'Academy'}.</p>`
          : html`<table class="build_details tall"><tbody>${g.options.map(
              (o) => html`<tr>
                <td class="desc">${unitIcon(d.tribe, o.slot)} <b>${o.unit.name}</b> <span class="avail" title="${fmtNum(d.home[o.slot] ?? 0)} at home now · ${fmtNum(d.owned[o.slot] ?? 0)} in total (incl. away and on the move)">(You have: ${fmtNum(d.owned[o.slot] ?? 0)})</span>
                  <span class="small muted" title="${UNIT_GUIDE[o.unit.id]?.use ?? ''}">${UNIT_GUIDE[o.unit.id]?.kind ?? ''}</span>
                  <div class="details">${costLine(o.cost, d.have, html`<span>${icon('res/cropuse', 'Crop consumption', 18, 12)}${o.unit.upkeep}</span><span title="per unit">${icon('res/clock', 'Duration', 18, 12)}${fmtUnitTime(o.timeMs)}</span>${o === firstOpt ? help('unitCost') : ''}${o.unit.carry > 0 ? html`<span class="carry">carries ${fmtNum(o.unit.carry)}</span>${o === firstCarry ? help('carry') : ''}` : ''}`)}
                  ${o.available ? '' : html`<span class="none">${o.reason}</span>`}</div></td>
                <td class="val">${o.available
                  ? html`<label class="sr" for="t_${g.building}_${o.slot}">How many ${o.unit.name}</label><input class="w30 tr-in" id="t_${g.building}_${o.slot}" type="number" name="t_${g.building}_${o.slot}" min="0" max="${o.maxAffordable}" inputmode="numeric" placeholder="0"
                      data-cost="${o.cost.wood},${o.cost.clay},${o.cost.iron},${o.cost.crop},${o.unit.upkeep},${o.timeMs},${o.unit.carry}">`
                  : html`<span class="none">-</span>`}</td>
                <td class="max">${o.available ? html`<a href="#t_${g.building}_${o.slot}" class="fill" data-fill="t_${g.building}_${o.slot}" data-value="${o.maxAffordable}">(${fmtNum(o.maxAffordable)})</a>${o === firstAvail ? help('trainMax') : ''}` : html`<span class="none">(0)</span>`}</td>
              </tr>`,
            )}</tbody></table>`}
      </section>`,
    )}
    ${any
      ? html`<div class="train-total sticky" id="train-total" data-have="${Math.floor(d.have.wood)},${Math.floor(d.have.clay)},${Math.floor(d.have.iron)},${Math.floor(d.have.crop)}">
          <b>Total:</b>${help('trainTotal')}
          <span id="tt-wood">${resIcon('wood')}0</span><span id="tt-clay">${resIcon('clay')}0</span><span id="tt-iron">${resIcon('iron')}0</span><span id="tt-crop">${resIcon('crop')}0</span>
          <span id="tt-upkeep">${icon('res/cropuse', 'Crop consumption', 18, 12)}0</span><span id="tt-time">${icon('res/clock', 'Duration', 18, 12)}0:00:00</span><span id="tt-carry" class="carry"><b>can carry</b> 0</span>
          <button type="submit" class="gbtn green">Train all</button>
        </div>
        <p class="small muted">Each building trains its own queue at the same time. The total cost counts everything you entered; if resources run out, the first rows are trained first.</p>`
      : ''}
    </form>
    ${d.auto && d.auto.rows.length ? autoTrainPanel(d.tribe, d.auto, d.csrf, d.now) : ''}
    ${d.groups.some((g) => g.queue.length)
      ? html`<section class="spanel" id="queue"><h3 class="sp-head">In training</h3><div class="pad">${d.groups
          .filter((g) => g.queue.length)
          .map((g) => html`<p class="small"><b>${BUILDINGS[g.building].name}</b></p>${trainingQueue(g.queue, d.tribe, d.now, d.csrf)}`)}</div></section>`
      : ''}`;
}

const n0 = (n: number): string => fmtNum(Math.round(n));
const RES_LABEL = { wood: 'Wood', clay: 'Clay', iron: 'Iron', crop: 'Crop' } as const;
const hm = (h: number): string => (h >= 1 ? `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min` : `${Math.round(h * 60)} min`);

/** Auto training: % shares of the village's resources per troop, 1-8 hours, quick setups and live forecasts (app.js recalculates as you type). */
function autoTrainPanel(tribe: TribeId, a: AutoTrainData, csrf: string, now: number): SafeHtml {
  const p = a.plan;
  const sm = a.summary;
  const running = !!p?.active;
  const fc = new Map(sm.units.map((u) => [u.key, u]));
  const byBuilding = new Map<string, AutoUnitRow[]>();
  for (const r of a.rows) byBuilding.set(r.building, [...(byBuilding.get(r.building) ?? []), r]);
  const status = p
    ? html`<div class="at-status ${running ? 'on' : 'off'}">
        ${running
          ? html`<p><b class="ok">Running</b> · ends in ${timer(p.endsAt, now)} · started for ${p.hours} h</p>`
          : html`<p><b>Finished</b> ${fmtDuration(Math.max(0, now - p.endsAt))} ago (${p.hours} h run). Your settings are kept below - press <b>Start</b> to run it again.</p>`}
        <table class="build_details at-progress"><thead><tr><th>Unit</th><th>Share</th><th title="Units put into the training queues by this run">Queued so far</th></tr></thead><tbody>
        ${p.items.map((i) => html`<tr><td>${unitIcon(tribe, i.slot)} ${a.rows.find((r) => r.building === i.building && r.slot === i.slot)?.unit.name ?? ''} <span class="small muted">(${BUILDINGS[i.building].name})</span></td><td class="num">${i.share}%</td><td class="num"><b>${fmtNum(i.trained)}</b></td></tr>`)}
        </tbody></table>
        ${running ? html`<form method="post" action="/train/auto/stop" class="inl">${csrfField(csrf)}<button type="submit" class="gbtn secondary">Stop auto training</button></form>` : ''}
      </div>`
    : '';
  const firstB = a.rows[0]?.building;
  const firstShare = a.rows.find((r) => r.available)?.key;
  const goalLink = (goal: AutoGoal) => `/troops/train?auto=${goal}&hours=${a.hours}#auto`;
  // Foldable: closed by default; open after a quick-setup pick, on #auto links and when the player left it open (app.js).
  return html`<details class="spanel autotrain" id="auto"${a.goal ? html` open` : ''}>
    <summary class="sp-head"><span class="at-title">Auto training<small>Let the village train troops for you for 1-8 hours</small></span>
      <span class="at-state">${running && p ? html`<b class="ok">running</b> · ends in ${timer(p.endsAt, now)}` : p ? 'finished' : 'off'}</span>
      <span class="at-toggle" aria-hidden="true"><span class="o">Open</span><span class="c">Close</span></span></summary>
    <div class="pad">
      ${status}
      <p class="small">Give the troops you want a <b>share of your resources</b> (in %). Every minute auto training spends what the village has: each troop gets its share of your current stock and as many as that buys go into the queue (see <a href="#queue">In training</a>); what's left over is split again. Shares below 100% keep the rest in stock. It runs for the hours you choose, then stops - you start it again yourself.</p>
      <div class="at-quick"><b>Quick setup</b> <span class="small">best unit for each building, shares sized so all buildings stay about equally busy:</span>
        <span class="at-goals">${(Object.keys(AUTO_GOALS) as AutoGoal[]).map((g) => html`<a class="gbtn${a.goal === g ? '' : ' secondary'}" data-at-goal="${g}" href="${goalLink(g)}">${AUTO_GOALS[g]}</a>`)}<a class="small" href="/troops/train#auto" data-at-clear>clear</a></span></div>
      <form method="post" action="/train/auto" id="at-form" data-income="${RESOURCE_KEYS.map((k) => Math.round(a.income[k])).join(',')}" data-stock="${RESOURCE_KEYS.map((k) => Math.floor(a.stock[k])).join(',')}">${csrfField(csrf)}
        <fieldset class="at-hours"><legend>Run for${help('autoHours')}</legend>${Array.from({ length: AUTO_TRAIN_MAX_HOURS - AUTO_TRAIN_MIN_HOURS + 1 }, (_, i) => i + AUTO_TRAIN_MIN_HOURS).map(
          (h) => html`<label><input type="radio" name="hours" value="${h}"${h === a.hours ? html` checked` : ''}><span>${h} h</span></label>`,
        )}</fieldset>
        <div class="at-list">
        ${[...byBuilding].map(([b, rows]) => {
          const load = sm.load[b as keyof typeof sm.load] ?? 0;
          return html`<div class="at-bhead"><b>${BUILDINGS[b as keyof typeof BUILDINGS].name}</b><span class="at-load" data-load-b="${b}"${b === firstB ? '' : html` title="How busy your income keeps this building"`}>${svgBar(load * 100, load > 1 ? 'atbad' : 'atok')}<span>${Math.round(load * 100)}% busy</span>${b === firstB ? help('autoBusy') : ''}</span></div>
          ${rows.map((r) => {
            const f = fc.get(r.key);
            return html`<div class="at-unit${r.available ? '' : ' na'}">
            <div class="at-uinfo">${unitIcon(tribe, r.slot)} <b>${r.unit.name}</b>
              <div class="at-meta">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(r.cost[k])}</span>`)}<span title="crop eaten per hour">${icon('res/cropuse', 'Crop consumption', 18, 12)}${r.unit.upkeep}</span><span title="training time per unit">${icon('res/clock', 'Duration', 18, 12)}${fmtUnitTime(r.timeMs)}</span></div>
              <div class="at-fc small" data-fc="${r.key}">${f ? html`now <b>${fmtNum(f.now)}</b> · then <b>${fmtNum(f.perHour)}</b>/h${f.limitedBy ? html` <span class="muted">(${RES_LABEL[f.limitedBy].toLowerCase()} limits)</span>` : ''}` : ''}</div>
              ${r.available ? '' : html`<div class="none small">${r.reason}</div>`}</div>
            ${r.available
              ? html`<div class="at-uin"><label class="sr" for="a_${r.key}">${r.unit.name}: % of resources</label><input class="at-in" id="a_${r.key}" name="a_${r.key}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="0" value="${a.values[r.key] ? String(a.values[r.key]) : ''}"
                  data-key="${r.key}" data-b="${r.building}" data-cost="${RESOURCE_KEYS.map((k) => r.cost[k]).join(',')}" data-up="${r.unit.upkeep}" data-time="${r.timeMs}"><span class="at-pct">%</span>${r.key === firstShare ? help('autoShare') : ''}
                <button type="button" class="at-max" data-at-rest="${r.key}" title="Give this troop all the % not assigned yet">rest</button></div>`
              : ''}
          </div>`;
          })}`;
        })}
        </div>
        <div class="at-sum" id="at-sum">
          <p class="at-assigned"><span id="at-assigned">Assigned: <b>${sm.assigned}%</b>${sm.assigned < 100 ? html` · <span class="muted">${100 - sm.assigned}% stays in your stock</span>` : ''}${sm.assigned > 100 ? html` · <b class="bad">more than 100%</b>` : ''}</span>${help('autoAssigned')}</p>
          <div class="at-cards">${RESOURCE_KEYS.map((k) => html`<div class="at-card">
            <div class="at-chead">${resIcon(k)} ${RES_LABEL[k]}</div>
            <div class="at-line"><span>Stock${k === 'wood' ? help('autoStock') : ''}</span><b>${n0(a.stock[k])}</b></div>
            <div class="at-line"><span>Income</span><b>${n0(a.income[k])}/h</b></div>
            <div class="at-line"><span>Used</span><b data-at-used="${k}">${n0(sm.usedPerHour[k])}/h</b></div>
            <div class="at-cover" data-at-cover="${k}" title="Share of this resource's income the plan uses">${svgBar(a.income[k] > 0 ? (sm.usedPerHour[k] / a.income[k]) * 100 : 0, 'atok')}<span>${a.income[k] > 0 ? Math.round((sm.usedPerHour[k] / a.income[k]) * 100) : 0}%</span></div>
          </div>`)}</div>
          <ul class="at-facts">
            <li>Right away from your stock: <b id="at-now">${fmtNum(sm.units.reduce((x, u) => x + u.now, 0))}</b> units · then about <b id="at-uph">${fmtNum(sm.units.reduce((x, u) => x + u.perHour, 0))}</b> per hour from income</li>
            <li>In <b id="at-h">${a.hours}</b> h about <b id="at-units">${fmtNum(Math.round(sm.totalUnits))}</b> units (if the buildings keep up - see the busy bars)</li>
            <li id="at-crop">They eat <b>+${fmtNum(Math.round(sm.extraUpkeep))}</b> crop per hour (crop income then about <b>${fmtNum(Math.round(a.income.crop - sm.extraUpkeep))}</b>/h).</li>
          </ul>
          <p class="small muted">"Used" is what your income pays for at these shares. A troop is limited by its scarcest resource, so some of the others can stay unused - mix troops with different costs to use more of everything.</p>
        </div>
        <p><button type="submit" class="gbtn green">${running ? 'Restart with these settings' : 'Start auto training'}</button> <span class="small muted">Settlers and chiefs are never auto-trained. You can still train by hand at the same time.</span></p>
      </form>
    </div>
  </details>`;
}
