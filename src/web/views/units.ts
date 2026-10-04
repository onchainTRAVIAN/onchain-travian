import { config } from '../../config.js';
import { needsResearch } from '../../game/actions/research.js';
import { BUILDINGS } from '../../game/rules/buildings.js';
import { RESOURCE_KEYS, type Resources } from '../../game/rules/resources.js';
import { TRIBES, researchCost, researchTimeMs, smithyCost, trainTimeMs, type TribeId, type UnitDef } from '../../game/rules/units.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon } from './layout.js';
import { unitIcon } from './parts.js';

const BUILDING_NAME: Record<UnitDef['building'], string> = {
  barracks: 'Barracks (and Great Barracks)',
  stable: 'Stable (and Great Stable)',
  workshop: 'Workshop',
  residence: 'Residence or Palace',
};

const TYPE_LABEL: Record<string, string> = {
  inf: 'Infantry',
  cav: 'Cavalry',
  scout: 'Scout',
  ram: 'Siege (ram)',
  catapult: 'Siege (catapult)',
  chief: 'Administrator',
  settler: 'Settler',
  animal: 'Animal',
};

function costRow(c: Resources): SafeHtml {
  return html`<span class="cost">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(c[k])}</span>`)}</span>`;
}

/** Troop information: big picture, combat stats, costs, times and requirements. */
export function unitInfoView(d: { tribe: TribeId; slot: number }): SafeHtml {
  const t = TRIBES[d.tribe];
  const u = t.units[d.slot] as UnitDef;
  const isNature = d.tribe === 'nature';
  const n = d.slot + 1;
  const train = trainTimeMs(u, 1, config.WORLD_SPEED);
  const research = !isNature && needsResearch(d.slot, u);
  const smithy = !isNature && u.type !== 'chief' && u.type !== 'settler';
  return html`<h1>${u.name} <span class="lvl">${t.name}</span></h1>
    <p class="tabs unittabs">${t.units.map(
      (x, i) => html`<a href="/unit/${d.tribe}/${i + 1}" class="${i === d.slot ? 'on' : ''}" title="${x.name}">${unitIcon(d.tribe, i, 16, false)}</a>`,
    )}</p>
    <div class="unitinfo">
      <img class="unitbig" src="/static/img/units/big/${d.tribe}-${n}.svg" width="120" height="140" alt="${u.name}">
      <div class="unitstats">
        <p>${u.description}</p>
        <table><tbody>
          <tr><th>Type</th><td>${TYPE_LABEL[u.type] ?? u.type}</td></tr>
          <tr><th>Attack</th><td>${icon('ui/attack', 'Attack', 16)} ${fmtNum(u.attack)}</td></tr>
          <tr><th>Defence vs infantry</th><td>${fmtNum(u.defInf)}</td></tr>
          <tr><th>Defence vs cavalry</th><td>${fmtNum(u.defCav)}</td></tr>
          <tr><th>Speed</th><td>${fmtNum(u.speed)} fields/hour${config.TROOP_SPEED !== 1 ? html` <span class="small muted">(${fmtNum(u.speed * config.TROOP_SPEED)} on this x${config.TROOP_SPEED} world)</span>` : ''}</td></tr>
          ${isNature ? '' : html`<tr><th>Can carry</th><td>${fmtNum(u.carry)} resources</td></tr>`}
          <tr><th>Crop upkeep</th><td>${icon('res/cropuse', 'Crop consumption', 18, 12)} ${u.upkeep} per hour</td></tr>
        </tbody></table>
      </div>
    </div>
    ${isNature
      ? html`<p class="small muted">Wild animals live in unoccupied oases. Clear them out to capture the oasis; your hero gains experience from every animal killed.</p>`
      : html`<h2>Training</h2>
        <table><tbody>
          <tr><th>Cost</th><td>${costRow(u.cost)}</td></tr>
          <tr><th>Training time</th><td>${icon('res/clock', 'Duration', 18, 12)} ${fmtDuration(train)} <span class="small muted">(level 1 building${config.WORLD_SPEED !== 1 ? `, x${config.WORLD_SPEED} world` : ''}; faster with higher levels)</span></td></tr>
          <tr><th>Trained in</th><td>${BUILDING_NAME[u.building]}</td></tr>
          <tr><th>Requirements</th><td>${u.requires.length === 0
            ? html`<span class="none">none${d.slot === 0 ? ' — available from the start' : ''}</span>`
            : u.requires.map((r, i) => html`${i > 0 ? ', ' : ''}<span class="nowrap">${BUILDINGS[r.building].name} level ${r.level}</span>`)}</td></tr>
          ${research
            ? html`<tr><th>Research (Academy)</th><td>${costRow(researchCost(u))} · ${fmtDuration(researchTimeMs(u, config.WORLD_SPEED))}</td></tr>`
            : ''}
          ${smithy ? html`<tr><th>First upgrade (Blacksmith / Armoury)</th><td>${costRow(smithyCost(u, 1))}</td></tr>` : ''}
        </tbody></table>`}
    <p><a href="/units?t=${d.tribe}">» All ${t.name} troops</a> | <a href="/units">» All tribes</a></p>`;
}

export function unitsIndexView(d: { tribe: TribeId | null }): SafeHtml {
  const tribes: TribeId[] = d.tribe ? [d.tribe] : ['romans', 'teutons', 'gauls', 'nature'];
  return html`<h1>Troops</h1>
    <p class="tabs">${(['romans', 'teutons', 'gauls', 'nature'] as TribeId[]).map(
      (t) => html`<a href="/units?t=${t}" class="${d.tribe === t ? 'on' : ''}">${TRIBES[t].name}</a>`,
    )}<a href="/units" class="${d.tribe === null ? 'on' : ''}">All</a></p>
    ${tribes.map(
      (t) => html`<h2>${TRIBES[t].name}</h2>
        <div class="tblwrap"><table><thead><tr><th>Troop</th><th class="num">Attack</th><th class="num">Def. inf.</th><th class="num">Def. cav.</th><th class="num">Speed</th><th class="num">Carry</th><th class="num">Upkeep</th></tr></thead><tbody>
        ${TRIBES[t].units.map(
          (u, i) => html`<tr><td>${unitIcon(t, i)} <a href="/unit/${t}/${i + 1}">${u.name}</a></td><td class="num">${u.attack}</td><td class="num">${u.defInf}</td><td class="num">${u.defCav}</td>
            <td class="num">${u.speed}</td><td class="num">${t === 'nature' ? '-' : u.carry}</td><td class="num">${u.upkeep}</td></tr>`,
        )}</tbody></table></div>`,
    )}`;
}
