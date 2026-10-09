import {
  BUILDINGS,
  FIELD_SLOTS,
  MAIN_SLOT,
  RALLY_SLOT,
  TOWN_SLOT_FIRST,
  TOWN_SLOT_LAST,
  WALL_SLOT,
  type BuildingId,
} from '../../game/rules/buildings.js';
import { RESOURCE_KEYS, RESOURCE_LABEL } from '../../game/rules/resources.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { BuildOrderRow } from '../../game/actions/build.js';
import type { TrainOrderRow } from '../../game/actions/train.js';
import type { Economy, VillageState } from '../../game/engine/state.js';
import type { MovementView } from '../../game/queries.js';
import { instantPrice, workLeft } from '../../game/actions/credits.js';
import { fmtClock, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { TOWN_SPOTS } from './spots.js';
import { levelStage, stagedImage, wallImage, assetUrl } from '../assets.js';
import { csrfField, icon, resIcon, timer } from './layout.js';
import { buildingImg, buildingLabel, movementSummary, unitIcon } from './parts.js';
import { help } from './tips.js';

export interface VillageViewData {
  state: VillageState;
  eco: Economy;
  orders: BuildOrderRow[];
  training: TrainOrderRow[];
  movements: MovementView[];
  homeTroops: UnitCounts;
  /** Name of your hero when it is at home here. */
  heroHome?: string | null;
  /** Slots whose next upgrade can start right now. */
  ready: Set<number>;
  protectedUntil: number;
  /** Beginner-task hint: this slot glows with a short bubble. */
  hint?: { slot: number; text: string } | null;
  now: number;
  csrf: string;
}

function incomingAlert(moves: MovementView[], now: number): SafeHtml {
  const hostile = moves.filter((m) => m.direction === 'in' && (m.kind === 'attack' || m.kind === 'raid' || m.kind === 'scout'));
  if (hostile.length === 0) return html``;
  const first = hostile[0];
  return html`<div class="alert" role="alert">${icon('ui/incoming', 'Incoming attack', 16)} <b>${hostile.length} incoming attack${hostile.length === 1 ? '' : 's'}!</b>
    ${first ? html`First arrives in ${timer(first.arriveAt, now)}.` : ''} <a href="/troops">Rally Point »</a></div>`;
}

function protectionNote(until: number, now: number): SafeHtml {
  if (until <= now) return html``;
  return html`<p class="small good protnote">${icon('ui/reinforce', '', 14)} Beginner’s protection: ${timer(until, now, false)} left. Attacking another player ends it.</p>`;
}

/** Classic "Building:" construction list. */
export function buildQueue(orders: BuildOrderRow[], now: number, csrf: string): SafeHtml {
  if (orders.length === 0) return html``;
  return html`<section class="spanel queue"><h3 class="sp-head">Building<span>${orders.length}</span></h3><table class="tb"><tbody>${orders.map((o) => {
    const l = buildingLabel(o.building);
    return html`<tr>
      <td><form method="post" action="/build/cancel" class="inline">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small secondary" title="Cancel" aria-label="Cancel ${l.name}">${icon('ui/del', 'cancel', 12)}</button></form></td>
      <td>${o.demolish ? html`Demolishing ${l.name} (to level ${o.toLevel})` : html`${l.name} (level ${o.toLevel})`}</td>
      <td class="num">in ${timer(o.finishAt, now)} h · done at ${fmtClock(o.finishAt).slice(0, 5)}</td>
      <td><form method="post" action="/shop/finish/build" class="inline">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small gold" title="Finish now">${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(workLeft(o.startAt, o.finishAt, now))}</button></form></td>
    </tr>`;
  })}</tbody></table></section>`;
}

export function trainingQueue(orders: TrainOrderRow[], tribe: TribeId, now: number, csrf?: string): SafeHtml {
  if (orders.length === 0) return html``;
  const endOf = (o: TrainOrderRow) => o.startAt + o.total * o.perUnitMs;
  const finish = (o: TrainOrderRow, label: SafeHtml | string, title: string) =>
    html`<form method="post" action="/shop/finish/train">${csrfField(csrf ?? '')}<input type="hidden" name="orderId" value="${o.id}">
      <button type="submit" class="small gold" title="${title}">${label}${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(endOf(o) - now)}</button></form>`;
  const last = orders[orders.length - 1] as TrainOrderRow;
  return html`<section class="spanel queue"><h3 class="sp-head">Training<span>${orders.length}</span></h3><table class="tb"><thead><tr><th>Unit</th><th>Duration</th><th>Finished</th></tr></thead><tbody>${orders.map((o) => {
    const u = TRIBES[tribe].units[o.unitSlot];
    const end = endOf(o);
    return html`<tr><td>${unitIcon(tribe, o.unitSlot)} ${fmtNum(o.total - o.done)} ${u?.name ?? '?'}</td>
      <td class="num">${timer(end, now)}</td><td class="num">${fmtClock(end)}</td></tr>`;
  })}
  </tbody></table>
  ${csrf ? html`<div class="qfinish pad">${finish(last, 'Finish all ', 'Finish the whole queue now')}<span class="small muted">Priced by the time until the last batch is done.</span></div>` : ''}</section>`;
}

const FIELD_KIND: Record<string, string> = { woodcutter: 'wood', claypit: 'clay', ironmine: 'iron', cropland: 'crop' };

/** Village name plaque above the village pictures: name, coordinates, population, capital. */
function villageTitle(d: VillageViewData): SafeHtml {
  const v = d.state.village;
  return html`<div class="vtitle"><h1 class="vname" data-rename tabindex="0" role="button" title="Click to rename this village">${v.name}</h1>
    <a class="vedit" href="/account" data-rename title="Rename this village" aria-label="Rename this village"><img src="/static/img/ui/edit.svg" width="14" height="14" alt=""></a>
    <form method="post" action="/account/rename" class="vrename" hidden>${csrfField(d.csrf)}
      <label for="vrn" class="sr">Village name</label><input id="vrn" type="text" name="name" value="${v.name}" minlength="2" maxlength="30" required>
      <button type="submit" class="small">Save</button> <button type="button" class="small secondary" data-rename-cancel>Cancel</button></form>
    <span class="vmeta"><a href="/map?x=${v.x}&amp;y=${v.y}" title="Show on the map">(${v.x}|${v.y})</a>
      <span class="vpop">${fmtNum(v.pop)}</span>${help('population')}${v.isCapital ? html`<span class="vcap">capital</span>${help('capital')}` : ''}</span></div>`;
}

function productionTable(eco: Economy): SafeHtml {
  // Each row opens the breakdown: base from fields and every bonus on top.
  return html`<table id="production"><thead><tr><th colspan="4"><a href="/production" title="Where your production comes from">Production:</a> ${help('production')}</th></tr></thead><tbody>
    ${RESOURCE_KEYS.map(
      (k) => html`<tr class="prodrow"><td class="ico"><a href="/production#${k}" title="${RESOURCE_LABEL[k]}: base and bonuses">${resIcon(k)}</a></td><td><a href="/production#${k}" class="plain">${RESOURCE_LABEL[k]}:</a></td><td class="val ${eco.net[k] < 0 ? 'bad' : ''}"><a href="/production#${k}" class="plain">${fmtNum(eco.net[k])}</a></td><td><a href="/production#${k}" class="plain">per hour</a></td></tr>`,
    )}
  </tbody></table>`;
}

function troopsTable(tribe: TribeId, units: UnitCounts, hero: string | null): SafeHtml {
  const rows = units.map((n, i) => ({ n, i })).filter((r) => r.n > 0);
  return html`<table id="troops"><thead><tr><th colspan="3">Troops: ${help('troopsHome')}</th></tr></thead><tbody>
    ${rows.length === 0 && !hero
      ? html`<tr><td colspan="3" class="none center">none</td></tr>`
      : rows.map((r) => html`<tr><td class="ico">${unitIcon(tribe, r.i)}</td><td class="val">${fmtNum(r.n)}</td><td>${TRIBES[tribe].units[r.i]?.name}</td></tr>`)}
    ${hero ? html`<tr><td class="ico">${unitIcon(tribe, 10)}</td><td class="val">1</td><td><a href="/hero">Hero</a></td></tr>` : ''}
  </tbody></table>`;
}

function badgeClass(d: VillageViewData, slot: number, level: number, maxLevel: number): string {
  if (d.orders.some((o) => o.slot === slot)) return 'busy';
  if (level >= maxLevel) return 'max';
  if (d.ready.has(slot)) return 'up';
  return '';
}

/** Village overview: the resource fields around the village (classic 300×264 picture). */
export function fieldsView(d: VillageViewData & { layout: string }): SafeHtml {
  const fields = d.state.slots.filter((s) => s.slot <= FIELD_SLOTS).sort((a, b) => a.slot - b.slot);
  const cap = d.state.village.isCapital ? 20 : 10;
  return html`
  ${incomingAlert(d.movements, d.now)}
  ${protectionNote(d.protectedUntil, d.now)}
  ${villageTitle(d)}
  <div id="vmap1">
    <img class="bg" src="/static/img/scene/dorf1-${d.layout}.svg" width="300" height="264" alt="">
    ${fields.map((s) => {
      const def = BUILDINGS[s.building as BuildingId];
      const pending = d.orders.find((o) => o.slot === s.slot);
      const label = `${def?.name ?? '?'} level ${s.level}${pending ? ` (upgrading to ${pending.toLevel})` : ''}`;
      // Fields look busier every 5 levels: a stage picture over the field (levels 5, 10, 15, 20).
      const stage = levelStage(s.level);
      const kind = FIELD_KIND[s.building ?? ''];
      const deco = stage >= 2 && kind ? html`<img class="fo ra${s.slot}" src="${assetUrl(`img/fields/stage/${kind}-${stage}.svg`)}" width="46" height="40" alt="">` : '';
      const hinted = d.hint?.slot === s.slot;
      return html`${deco}<a class="ra ra${s.slot}" href="/slot/${s.slot}" title="${label}" aria-label="${label}"></a><span class="rf rf${s.slot} ${badgeClass(d, s.slot, s.level, cap)}${hinted ? ' hint' : ''}">${s.level}</span>${hinted ? html`<span class="hintbub rf${s.slot}">${d.hint?.text} - click here</span>` : ''}`;
    })}
    <a class="vlink" href="/village" title="Village centre" aria-label="Village centre"></a>
  </div>
  <div id="map_details">
    ${movementSummary(d.movements, d.now)}
    ${productionTable(d.eco)}
    ${troopsTable(d.state.tribe, d.homeTroops, d.heroHome ?? null)}
  </div>
  <div class="clear"></div>
  ${buildQueue(d.orders, d.now, d.csrf)}`;
}

/** Village centre: buildings on their classic spots (540×448). */
export function townView(d: VillageViewData): SafeHtml {
  const tribe = d.state.tribe;
  const wall = d.state.slots.find((s) => s.slot === WALL_SLOT);
  const wallFile = wall?.building === 'earthwall' ? 'earth' : wall?.building === 'palisade' ? 'palisade' : 'city';
  const spots = d.state.slots.filter((s) => (s.slot >= TOWN_SLOT_FIRST && s.slot <= TOWN_SLOT_LAST) || s.slot === RALLY_SLOT);
  const levels: SafeHtml[] = [];
  const labels = new Map<number, string>();
  const buildings = spots.map((s) => {
    const pending = d.orders.find((o) => o.slot === s.slot);
    const id = s.building ?? pending?.building ?? null;
    const def = id ? BUILDINGS[id as BuildingId] : undefined;
    const built = s.level > 0;
    const file = built ? (id ?? 'empty') : pending ? 'construction' : s.slot === RALLY_SLOT ? 'construction' : 'empty';
    const label = !id ? 'Building site' : `${def?.name ?? ''}${built ? ` level ${s.level}` : ''}${pending ? ` (upgrading to ${pending.toLevel})` : ''}`;
    if (built || pending) levels.push(html`<span class="lv l${s.slot} ${badgeClass(d, s.slot, s.level, def?.maxLevel ?? 20)}">${s.level}</span>`);
    // An unbuilt rally point shows as an empty site.
    const src = s.slot === RALLY_SLOT && !built && !pending ? 'empty' : file;
    labels.set(s.slot, label);
    // Built buildings look grander every 5 levels (stage pictures), others show the plain picture.
    const img = built && src === id && id ? stagedImage('buildings', id, s.level) : assetUrl(`img/buildings/${src}.svg`);
    return html`<span class="bld b${s.slot}"><img src="${img}" width="75" height="100" alt=""></span>`;
  });
  labels.set(WALL_SLOT, wall && wall.level > 0 ? `${TRIBES[tribe].wallName} level ${wall.level}` : `Build a ${TRIBES[tribe].wallName}`);
  if (wall && wall.level > 0) levels.push(html`<span class="lv l40 ${badgeClass(d, WALL_SLOT, wall.level, 20)}">${wall.level}</span>`);
  return html`
  ${incomingAlert(d.movements, d.now)}
  ${villageTitle(d)}
  <div id="vmap2">
    <img class="bg" src="/static/img/scene/dorf2.svg" width="540" height="448" alt="">
    ${wall?.building
      ? html`<img class="wall${wall.level > 0 ? '' : ' ghost'}" width="540" height="448" src="${wall.level > 0 ? wallImage(wallFile, wall.level) : `/static/img/walls/${wallFile}.svg`}" alt="">`
      : ''}
    ${buildings}
    ${levels}
    ${d.hint && d.hint.slot >= 19 ? html`<span class="hintring l${d.hint.slot}"></span><span class="hintbub l${d.hint.slot}">${d.hint.text} - click here</span>` : ''}
    <svg class="hitmap" viewBox="0 0 540 448" aria-label="Buildings">
      ${TOWN_SPOTS.map((p) => {
        const label = labels.get(p.slot) ?? 'Building site';
        return html`<a href="/slot/${p.slot}" class="spot" aria-label="${label}"><title>${label}</title>
          <ellipse class="hl" cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}"></ellipse><polygon class="hit" points="${p.points}"></polygon></a>`;
      })}
    </svg>
  </div>
  ${buildQueue(d.orders, d.now, d.csrf)}
  ${d.training.length > 0 ? trainingQueue(d.training, tribe, d.now, d.csrf) : ''}`;
}
