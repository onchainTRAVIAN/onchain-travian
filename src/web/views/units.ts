import { assetUrl, pic } from '../assets.js';
import { config } from '../../config.js';
import { needsResearch } from '../../game/actions/research.js';
import { BUILDINGS } from '../../game/rules/buildings.js';
import { RESOURCE_KEYS, type Resources } from '../../game/rules/resources.js';
import { TRIBES, researchCost, researchTimeMs, smithyCost, smithyTimeMs, trainTimeMs, upgradedStat, type TribeId, type UnitDef } from '../../game/rules/units.js';
import { fmtDuration, fmtNum, fmtUnitTime } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon } from './layout.js';
import { tribeMark, unitIcon, woodTabs } from './parts.js';
import { UNIT_GUIDE } from '../../game/rules/unitguide.js';

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
  const isNature = d.tribe === 'nature' || d.tribe === 'natars';
  const n = d.slot + 1;
  const train = trainTimeMs(u, 1, config.WORLD_SPEED);
  const research = !isNature && needsResearch(d.slot, u);
  const smithy = !isNature && u.type !== 'chief' && u.type !== 'settler';
  return html`<h1>Troops</h1>
    ${woodTabs((['romans', 'teutons', 'gauls', 'nature', 'natars'] as TribeId[]).map((x) => ({ href: `/units?t=${x}`, label: TRIBES[x].name, on: x === d.tribe })), 'Tribe')}
    <div class="woodbody">
    <nav class="pilltabs unittabs" aria-label="Unit">${t.units.map(
      (x, i) => html`<a href="/unit/${d.tribe}/${i + 1}" class="${i === d.slot ? 'on' : ''}" title="${x.name}"${i === d.slot ? html` aria-current="page"` : ''}>${unitIcon(d.tribe, i, 24, false)}</a>`,
    )}</nav>
    <div class="unitinfo spanel pad"><h2 class="unitname">${u.name}</h2>
      <img class="unitbig" src="${pic(`img/units/big/${d.tribe}-${n}`)}" width="120" height="140" alt="${u.name}">
      <div class="unitstats">
        <p><b>${UNIT_GUIDE[u.id]?.kind ?? ''}</b> - ${UNIT_GUIDE[u.id]?.use ?? u.description}</p>
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
      ? d.tribe === 'natars'
        ? html`<p class="small muted">The Natars guard artifacts and World Wonders. They never attack and can't be trained. <a href="/endgame">» Artifacts &amp; World Wonders</a></p>`
        : html`<p class="small muted">Wild animals live in unoccupied oases. Clear them out to capture the oasis; your hero gains experience from every animal killed.</p>`
      : html`<h2>Training</h2>
        <table><tbody>
          <tr><th>Cost</th><td>${costRow(u.cost)}</td></tr>
          <tr><th>Training time</th><td>${icon('res/clock', 'Duration', 18, 12)} ${fmtUnitTime(train)} <span class="small muted">(level 1 building${config.WORLD_SPEED !== 1 ? `, x${config.WORLD_SPEED} world` : ''}; faster with higher levels)</span></td></tr>
          <tr><th>Trained in</th><td>${BUILDING_NAME[u.building]}</td></tr>
          <tr><th>Requirements</th><td>${u.requires.length === 0
            ? html`<span class="none">none${d.slot === 0 ? ' - available from the start' : ''}</span>`
            : u.requires.map((r, i) => html`${i > 0 ? ', ' : ''}<span class="nowrap">${BUILDINGS[r.building].name} level ${r.level}</span>`)}</td></tr>
          ${research
            ? html`<tr><th>Research (Academy)</th><td>${costRow(researchCost(u))} · ${fmtDuration(researchTimeMs(u, config.WORLD_SPEED))}</td></tr>`
            : ''}
          ${smithy ? html`<tr><th>Upgrades</th><td><a href="#upgrades">» stats at every Blacksmith / Armoury level</a></td></tr>` : ''}
        </tbody></table>`}
    ${smithy ? upgradeTable(u) : ''}
    <p><a href="/units?t=${d.tribe}">» All ${t.name} troops</a> | <a href="/units">» All tribes</a></p>
    </div>`;
}

/** Stats at every Blacksmith (attack) / Armoury (defence) level, with the cost and time of each step. */
function upgradeTable(u: UnitDef): SafeHtml {
  const fmt1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('en-US');
  const levels = Array.from({ length: 21 }, (_, l) => l);
  return html`<h2 id="upgrades">Upgrade levels</h2>
    <p class="small muted">Attack rises with the Blacksmith, defence with the Armoury (one step per building level, up to 20). Cost and time are for reaching that level, at a level 1 building${config.WORLD_SPEED !== 1 ? ` on this x${config.WORLD_SPEED} world` : ''}.</p>
    <div class="tblwrap"><table class="upgtb"><thead><tr><th>Level</th><th>${icon('ui/attack', 'Attack', 16)} Attack</th><th>Def. infantry</th><th>Def. cavalry</th><th>Upgrade cost</th><th>Time</th></tr></thead><tbody>
      ${levels.map(
        (l) => html`<tr class="${l === 0 ? 'base' : ''}"><td class="num">${l}</td>
          <td class="num">${fmt1(upgradedStat(u, u.attack, l))}${l > 0 && u.attack > 0 ? html` <span class="small good">+${pctUp(u, u.attack, l)}</span>` : ''}</td>
          <td class="num">${fmt1(upgradedStat(u, u.defInf, l))}</td>
          <td class="num">${fmt1(upgradedStat(u, u.defCav, l))}</td>
          <td class="small cost">${l === 0 ? html`<span class="none">base</span>` : costRow(smithyCost(u, l))}</td>
          <td class="num small">${l === 0 ? '' : fmtDuration(smithyTimeMs(u, l, config.WORLD_SPEED))}</td></tr>`,
      )}
    </tbody></table></div>`;
}

function pctUp(u: UnitDef, stat: number, level: number): string {
  return `${Math.round(((upgradedStat(u, stat, level) / stat) - 1) * 1000) / 10}%`;
}

export function unitsIndexView(d: { tribe: TribeId | null }): SafeHtml {
  const tribes: TribeId[] = d.tribe ? [d.tribe] : ['romans', 'teutons', 'gauls', 'nature', 'natars'];
  return html`<h1>Troops</h1>
    ${woodTabs([...(['romans', 'teutons', 'gauls', 'nature', 'natars'] as TribeId[]).map((t) => ({ href: `/units?t=${t}`, label: TRIBES[t].name, on: d.tribe === t })), { href: '/units', label: 'All', on: d.tribe === null }], 'Tribe')}
    <div class="woodbody">
    ${tribes.map(
      (t) => html`<section class="spanel"><h3 class="sp-head"><span class="sph">${tribeMark(t, 18)} ${TRIBES[t].name}</span></h3>
        <div class="tblwrap"><table class="tb"><thead><tr><th>Troop</th><th class="num">Attack</th><th class="num">Def. inf.</th><th class="num">Def. cav.</th><th class="num">Speed</th><th class="num">Carry</th><th class="num">Upkeep</th></tr></thead><tbody>
        ${TRIBES[t].units.map(
          (u, i) => html`<tr><td>${unitIcon(t, i)} <a href="/unit/${t}/${i + 1}">${u.name}</a><br><span class="small muted">${UNIT_GUIDE[u.id]?.kind ?? ''}</span></td><td class="num">${u.attack}</td><td class="num">${u.defInf}</td><td class="num">${u.defCav}</td>
            <td class="num">${u.speed}</td><td class="num">${t === 'nature' ? '-' : u.carry}</td><td class="num">${u.upkeep}</td></tr>`,
        )}</tbody></table></div></section>`,
    )}
    </div>`;
}
