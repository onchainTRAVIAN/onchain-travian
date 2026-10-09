import { levelTable } from './levels.js';
import type { BuildOption } from '../../game/actions/build.js';
import type { TrainOption, TrainOrderRow } from '../../game/actions/train.js';
import { popAtLevel, type BuildingDef } from '../../game/rules/buildings.js';
import type { Resources } from '../../game/rules/resources.js';
import type { TribeId, UnitCounts } from '../../game/rules/units.js';
import { fmtClock, fmtDuration, fmtNum, fmtUnitTime } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon, resIcon, timer } from './layout.js';
import { buildingInfoImg, effectAt, unitIcon } from './parts.js';
import { trainingQueue } from './village.js';
import { UNIT_GUIDE } from '../../game/rules/unitguide.js';
import { help } from './tips.js';

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
      <button type="submit" class="btn">${label}</button></form>`;
  }
  if (o.reason === 'Not enough resources' && o.waitMs !== undefined) {
    // The countdown reloads the page when it ends, so the build link appears by itself.
    return html`<span class="bwait">Enough resources in ${timer(now + o.waitMs, now)} (at ${fmtClock(now + o.waitMs).slice(0, 5)})</span>`;
  }
  if (o.reason === 'Not enough resources') return html`<span class="bwait">Not enough resources (storage too small or no production)</span>`;
  const text = o.reason === 'Your builders are busy' ? 'The workers are already at work.' : o.reason ?? 'Not possible right now.';
  return html`<span class="bwait">${text}</span>`;
}

function upgradeBox(o: BuildOption, have: Resources, csrf: string, now: number): SafeHtml {
  if (o.maxed) return html`<p class="bmax">${o.def.name} is fully upgraded.</p>`;
  return html`<section class="spanel bup"><h3 class="sp-head">${o.currentLevel === 0 ? 'Construction' : `Upgrade to level ${o.nextLevel}`} ${help('upgradeCost')}<span>costs</span></h3>
    <div class="pad">${costWithTime(o, have)}
      <div class="bact">${buildAction(o, csrf, now, `Upgrade to level ${o.nextLevel}`)}</div></div></section>`;
}

/** "Now → next level" effect tiles. */
function effectTiles(o: BuildOption | null, def: BuildingDef, level: number, tribe: TribeId): SafeHtml {
  const nowEffect = level > 0 ? effectAt(def, level, tribe) : null;
  const nextEffect = o && !o.maxed ? effectAt(def, o.nextLevel, tribe) : null;
  if (!nowEffect && !nextEffect) return html``;
  // The cranny's tile explains how hiding works (on the first tile shown).
  const tip = def.id === 'cranny' ? help('cranny') : '';
  return html`<div class="beff">
    ${nowEffect ? html`<div class="tile"><span class="lbl">Now (level ${level})${tip}</span><b>${nowEffect}</b></div>` : ''}
    ${nowEffect && nextEffect ? html`<span class="arrow" aria-hidden="true">→</span>` : ''}
    ${nextEffect ? html`<div class="tile next"><span class="lbl">Level ${o?.nextLevel}${nowEffect ? '' : tip}</span><b>${nextEffect}</b></div>` : ''}</div>`;
}

export interface SlotViewData {
  slot: number;
  def: BuildingDef | null;
  level: number;
  option: BuildOption | null;
  buildable: BuildOption[];
  have: Resources;
  tribe: TribeId;
  training: { building: string; options: TrainOption[]; queue: TrainOrderRow[]; home: UnitCounts; owned: UnitCounts } | null;
  /** Building-specific panels (academy, market, residence...). */
  panels: SafeHtml[];
  /** For the "All levels" table: Main Building level and the build speed (world speed × boosts). */
  mainLevel: number;
  buildSpeed: number;
  csrf: string;
  now: number;
}

/** Classic training table: one form, a quantity box per unit and a single Train button. */
function trainingPanel(t: NonNullable<SlotViewData['training']>, tribe: TribeId, have: Resources, csrf: string, now: number): SafeHtml {
  if (t.options.length === 0) return html``;
  const anyAvailable = t.options.some((o) => o.available);
  const carryTip = t.options.find((o) => o.unit.carry > 0)?.slot;
  return html`<form method="post" action="/train" class="block">${csrfField(csrf)}<input type="hidden" name="building" value="${t.building}">
    <section class="spanel tgroup"><h3 class="sp-head">Train troops<span><a href="/troops/train">all buildings »</a></span></h3>
    <table class="build_details"><thead><tr><th>Name ${help('unitCost')}</th><th>Quantity</th><th>Max ${help('trainMax')}</th></tr></thead><tbody>
    ${t.options.map(
      (o) => html`<tr id="u${o.slot}">
        <td class="desc">${unitIcon(tribe, o.slot)} <b>${o.unit.name}</b> <span class="avail" title="${fmtNum(t.home[o.slot] ?? 0)} at home now · ${fmtNum(t.owned[o.slot] ?? 0)} in total (incl. away and on the move)">(You have: ${fmtNum(t.owned[o.slot] ?? 0)})</span>

          <span class="small muted" title="${UNIT_GUIDE[o.unit.id]?.use ?? ''}">${UNIT_GUIDE[o.unit.id]?.kind ?? ''}</span>
          <div class="details">${costLine(o.cost, have, html`<span>${icon('res/cropuse', 'Crop consumption', 18, 12)}${o.unit.upkeep}</span><span title="per unit">${icon('res/clock', 'Duration', 18, 12)}${fmtUnitTime(o.timeMs)}</span>${o.unit.carry > 0 ? (o.slot === carryTip ? html`<span class="carry">carries ${fmtNum(o.unit.carry)}${help('carry')}</span>` : html`<span class="carry" title="Resources each one can carry home from a raid">carries ${fmtNum(o.unit.carry)}</span>`) : ''}`)}
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
          <b>Total:</b>${help('trainTotal')}
          <span id="tt-wood">${resIcon('wood')}0</span><span id="tt-clay">${resIcon('clay')}0</span><span id="tt-iron">${resIcon('iron')}0</span><span id="tt-crop">${resIcon('crop')}0</span>
          <span id="tt-upkeep">${icon('res/cropuse', 'Crop consumption', 18, 12)}0</span><span id="tt-time">${icon('res/clock', 'Duration', 18, 12)}0:00:00</span><span id="tt-carry" class="carry" title="Resources these troops can carry"><b>can carry</b> 0</span>
        </div>
        <p class="pad"><button type="submit" class="gbtn green">Train</button></p>`
      : ''}
    </section>
  </form>
  ${t.queue.length > 0 ? trainingQueue(t.queue, tribe, now, csrf) : ''}`;
}

export function slotView(d: SlotViewData): SafeHtml {
  // Empty building site: every building you could put here, as cards.
  if (!d.def) {
    const ready = d.buildable.filter((o) => !o.reason?.startsWith('Requires'));
    const soon = d.buildable.filter((o) => o.reason?.startsWith('Requires'));
    const card = (o: BuildOption, available: boolean) => html`<div class="spanel bcard${available ? '' : ' soon'}">
      <div class="bctop"><span class="bcimg">${buildingInfoImg(o.def.id)}</span>
        <div><b class="bcname">${o.def.name}</b><p class="small">${o.def.description}</p></div></div>
      ${available
        ? html`${costWithTime(o, d.have)}<div class="bact">${buildAction(o, d.csrf, d.now, 'Construct', o.def.id)}</div>`
        : html`<p class="small requ">${o.reason}</p>`}</div>`;
    return html`<div id="build" class="gid0"><div class="vtitle"><h1>Construct new building</h1><span class="vmeta">building site ${d.slot}</span></div>
      ${ready.length === 0 ? html`<p class="none">No buildings available for this building site right now.</p>` : html`<div class="bgrid">${ready.map((o) => card(o, true))}</div>`}
      ${soon.length ? html`<h2 class="bsoon">Available later</h2><div class="bgrid">${soon.map((o) => card(o, false))}</div>` : ''}</div>`;
  }

  const def = d.def;
  return html`<div id="build" class="gid-${def.id}">
    <div class="spanel bhead">
      <div class="bpic">${buildingInfoImg(def.id, def.name, d.level)}<span class="lvlbadge" title="Level">${d.level}</span></div>
      <div class="binfo"><h1 class="btitle">${def.name} <span class="lvl">level ${d.level}</span></h1>
        <p class="bdesc">${def.description}</p>
        ${effectTiles(d.option, def, d.level, d.tribe)}</div>
    </div>
    ${d.option ? upgradeBox(d.option, d.have, d.csrf, d.now) : ''}
    ${d.level > 0 && def.id === 'rally' ? html`<p class="actions"><a class="btn" href="/troops">Rally Point overview</a> <a class="btn secondary" href="/troops/send">Send troops</a> <a class="btn secondary" href="/simulator">Simulator</a></p>` : ''}
    ${d.level > 0 ? d.panels : ''}
    ${d.training && d.level > 0 ? trainingPanel(d.training, d.tribe, d.have, d.csrf, d.now) : ''}
    <details class="spanel lvdetails"${d.level === 0 ? html` open` : ''}><summary class="sp-head">All levels ${help('levelTable')}<span>cost, time and what each level gives</span></summary>
      ${levelTable(def, { tribe: d.tribe, mainLevel: d.mainLevel, current: d.level, speed: d.buildSpeed })}
      <p class="small pad"><a href="/help/buildings/${def.id}">» ${def.name} in the game guide</a></p></details>
  </div>`;
}
