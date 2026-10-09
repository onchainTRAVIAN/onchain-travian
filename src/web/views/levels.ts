import { config } from '../../config.js';
import {
  BUILDINGS,
  FIELD_IDS,
  TOWN_BUILDING_IDS,
  bonusBuildingPct,
  buildCost,
  buildTimeMs,
  buildingCulture,
  mainBuildingFactor,
  popAtLevel,
  trainingBuildingFactor,
  type BuildingDef,
  type BuildingId,
} from '../../game/rules/buildings.js';
import { crannyShare, fieldProduction, storageCapacity, trapCapacity } from '../../game/rules/production.js';
import { expansionSlots, oasisSlots } from '../../game/rules/expansion.js';
import { RESOURCE_KEYS } from '../../game/rules/resources.js';
import { TRIBES, type TribeId } from '../../game/rules/units.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon } from './layout.js';
import { buildingImg, effectAt, woodTabs } from './parts.js';
import { help } from './tips.js';

/**
 * The building's main benefit at a level as a number (with a short unit), so the table can show
 * how much each level adds. Null for buildings whose benefit isn't a single number.
 */
export function effectValue(def: BuildingDef, level: number, tribe: TribeId): { value: number; unit: string; pct?: boolean } | null {
  if (def.produces) return { value: fieldProduction(level) * config.WORLD_SPEED, unit: 'per hour' };
  switch (def.id) {
    case 'warehouse':
    case 'granary':
    case 'greatwarehouse':
    case 'greatgranary':
      return { value: storageCapacity(level) * (def.id.startsWith('great') ? 3 : 1), unit: 'capacity' };
    case 'cranny':
      return { value: Math.round(crannyShare(level, TRIBES[tribe].crannyMultiplier) * 1000) / 10, unit: 'hidden', pct: true };
    case 'main':
      return { value: Math.round(mainBuildingFactor(level) * 1000) / 10, unit: 'build time', pct: true };
    case 'barracks':
    case 'stable':
    case 'workshop':
    case 'greatbarracks':
    case 'greatstable':
      return { value: Math.round(trainingBuildingFactor(level) * 1000) / 10, unit: 'training time', pct: true };
    case 'citywall':
    case 'earthwall':
    case 'palisade':
      return { value: Math.round((Math.pow(1 + TRIBES[tribe].wallPerLevel, level) - 1) * 1000) / 10, unit: 'defence', pct: true };
    case 'market':
      return { value: level * config.MERCHANT_MULTIPLIER, unit: 'merchants' };
    case 'tradeoffice':
    case 'tournament':
    case 'stonemason':
      return { value: 100 + level * 10, unit: def.id === 'tradeoffice' ? 'merchant capacity' : def.id === 'tournament' ? 'speed beyond 30 fields' : 'stability', pct: true };
    case 'sawmill':
    case 'brickyard':
    case 'ironfoundry':
    case 'grainmill':
    case 'bakery':
      return { value: Math.round(bonusBuildingPct(level) * 100), unit: 'production', pct: true };
    case 'brewery':
      return { value: level, unit: 'attack', pct: true };
    case 'trapper':
      return { value: trapCapacity(level), unit: 'traps' };
    case 'horsetrough':
      return { value: 100 - level, unit: 'cavalry training time', pct: true };
    case 'heromansion':
      return { value: oasisSlots(level), unit: 'oases' };
    case 'residence':
      return { value: expansionSlots(level, 0), unit: 'expansion slots' };
    case 'palace':
      return { value: expansionSlots(0, level), unit: 'expansion slots' };
    case 'embassy':
      return { value: level >= 3 ? level * 3 : 0, unit: 'alliance members' };
    case 'blacksmith':
    case 'armoury':
      return { value: level, unit: 'max upgrade level' };
    case 'rally':
      return { value: level * 5, unit: 'troop movements' };
    case 'treasury':
      return { value: level >= 20 ? 2 : level >= 10 ? 1 : 0, unit: 'artifact size (1 small, 2 any)' };
    default:
      return null;
  }
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Every level of a building: cost, build time, population, culture, and what it gives (with the gain per level). */
export function levelTable(def: BuildingDef, o: { tribe: TribeId; mainLevel: number; current?: number; speed?: number }): SafeHtml {
  const speed = o.speed ?? config.WORLD_SPEED;
  const max = def.maxLevel;
  const rows = Array.from({ length: max }, (_, i) => i + 1);
  // Buildings whose benefit is not per level (Academy, …) get no "gives" column.
  const hasEffect = rows.some((l) => effectValue(def, l, o.tribe) !== null || effectAt(def, l, o.tribe) !== null);
  let popTotal = 0;
  return html`<div class="tblwrap"><table class="tb lvtable"><thead><tr><th>Lvl</th>${RESOURCE_KEYS.map((k) => html`<th>${resIcon(k)}</th>`)}
      <th>${icon('res/clock', 'Build time', 18, 12)}</th><th>${icon('res/pop', 'Population', 18, 12)}${help('levelPop')}</th><th>CP${help('levelCp')}</th>${hasEffect ? html`<th>${cap(effectValue(def, 1, o.tribe)?.unit ?? 'gives')}${help('levelEffect')}</th>` : ''}</tr></thead><tbody>
    ${rows.map((l) => {
      const cost = buildCost(def, l);
      popTotal += popAtLevel(def, l);
      const ev = effectValue(def, l, o.tribe);
      const prev = effectValue(def, l - 1, o.tribe);
      const gain = ev && prev ? ev.value - prev.value : null;
      const fmt = (v: number, pct?: boolean) => (pct ? `${Math.round(v * 10) / 10}%` : fmtNum(Math.round(v)));
      return html`<tr class="${l === o.current ? 'cur' : l <= (o.current ?? 0) ? 'done' : ''}"><td class="num"><b>${l}</b></td>
        ${RESOURCE_KEYS.map((k) => html`<td class="num">${fmtNum(cost[k])}</td>`)}
        <td class="num nowrap">${fmtDuration(buildTimeMs(def, l, o.mainLevel, speed))}</td>
        <td class="num">+${popAtLevel(def, l)}<span class="small muted"> (${popTotal})</span></td>
        <td class="num">${buildingCulture(def, l)}</td>
        ${hasEffect ? html`<td class="eff">${ev
          ? html`<b>${fmt(ev.value, ev.pct)}</b>${gain !== null && gain !== 0 ? html` <span class="small ${gain > 0 ? 'good' : 'bad'}">${gain > 0 ? '+' : ''}${fmt(gain, ev.pct)}</span>` : ''}`
          : html`<span class="small">${effectAt(def, l, o.tribe) ?? ''}</span>`}</td>` : ''}</tr>`;
    })}
  </tbody></table></div>
  <p class="small muted">Build times with a level ${o.mainLevel} Main Building on this x${speed} world (Gold boosts and artifacts shorten them further). Population in brackets is the building's total at that level.</p>`;
}

/** Game guide: every building, then one building's full level table. */
export function buildingsGuideView(d: { tribe: TribeId; id: BuildingId | null; mainLevel: number }): SafeHtml {
  const groups: { title: string; ids: readonly BuildingId[] }[] = [
    { title: 'Resource fields', ids: FIELD_IDS },
    { title: 'Village buildings', ids: TOWN_BUILDING_IDS.filter((b) => b !== 'wonder' && (!BUILDINGS[b].tribe || BUILDINGS[b].tribe === d.tribe)) },
  ];
  const tabs = woodTabs([{ href: '/help', label: 'Guide' }, { href: '/help/buildings', label: 'Buildings', on: true }, { href: '/units', label: 'Troops' }], 'Game guide');
  if (!d.id) {
    return html`<div class="vtitle"><h1>Buildings</h1><span class="vmeta">every level: cost, time and what it gives</span></div>${tabs}
      <div class="woodbody">${groups.map(
        (g) => html`<section class="spanel"><h3 class="sp-head">${g.title}<span>${g.ids.length}</span></h3><div class="bguide">${g.ids.map(
          (id) => html`<a class="bgcard" href="/help/buildings/${id}">${buildingImg(id)}<b>${BUILDINGS[id].name}</b><span class="small muted">max level ${BUILDINGS[id].maxLevel}</span></a>`,
        )}</div></section>`,
      )}</div>`;
  }
  const def = BUILDINGS[d.id];
  return html`<div class="vtitle"><h1>${def.name}</h1><span class="vmeta">max level ${def.maxLevel}</span></div>${tabs}
    <div class="woodbody">
    <div class="spanel bhead pad"><span class="bimg">${buildingImg(def.id)}</span><p class="bdesc">${def.description}</p></div>
    <form method="get" action="/help/buildings/${def.id}" class="small mbpick"><label for="mb">Build times with Main Building level</label>
      <select id="mb" name="mb">${Array.from({ length: 20 }, (_, i) => i + 1).map((l) => html`<option value="${l}"${l === d.mainLevel ? html` selected` : ''}>${l}</option>`)}</select>
      <button type="submit" class="small">Show</button> <a href="/help/buildings">« all buildings</a></form>
    <section class="spanel"><h3 class="sp-head">All levels ${help('levelTable')}<span>${TRIBES[d.tribe].name}</span></h3>${levelTable(def, { tribe: d.tribe, mainLevel: d.mainLevel })}</section>
    </div>`;
}
