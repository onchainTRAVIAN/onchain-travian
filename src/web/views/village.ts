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
import { instantPrice } from '../../game/actions/credits.js';
import { fmtClock, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { TOWN_SPOTS } from './spots.js';
import { csrfField, icon, resIcon, timer } from './layout.js';
import { buildingImg, buildingLabel, movementList, unitIcon } from './parts.js';

export interface VillageViewData {
  state: VillageState;
  eco: Economy;
  orders: BuildOrderRow[];
  training: TrainOrderRow[];
  movements: MovementView[];
  homeTroops: UnitCounts;
  /** Slots whose next upgrade can start right now. */
  ready: Set<number>;
  protectedUntil: number;
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
  return html`<div class="note">🛡️ Beginner’s protection: ${timer(until, now, false)} left. Attacking another player ends it.</div>`;
}

/** Classic "Building:" construction list. */
export function buildQueue(orders: BuildOrderRow[], now: number, csrf: string): SafeHtml {
  if (orders.length === 0) return html``;
  return html`<table class="tb"><thead><tr><th colspan="4">Building:</th></tr></thead><tbody>${orders.map((o) => {
    const l = buildingLabel(o.building);
    return html`<tr>
      <td><form method="post" action="/build/cancel" class="inline">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small secondary" title="Cancel" aria-label="Cancel ${l.name}">${icon('ui/del', 'cancel', 12)}</button></form></td>
      <td>${l.name} (level ${o.toLevel})</td>
      <td class="num">in ${timer(o.finishAt, now)} h · done at ${fmtClock(o.finishAt).slice(0, 5)}</td>
      <td><form method="post" action="/shop/finish/build" class="inline">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small gold" title="Finish now">${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(o.finishAt - now)}</button></form></td>
    </tr>`;
  })}</tbody></table>`;
}

export function trainingQueue(orders: TrainOrderRow[], tribe: TribeId, now: number, csrf?: string): SafeHtml {
  if (orders.length === 0) return html``;
  return html`<table class="tb"><thead><tr><th>Training</th><th>Duration</th><th>Finished</th>${csrf ? html`<th></th>` : ''}</tr></thead><tbody>${orders.map((o) => {
    const u = TRIBES[tribe].units[o.unitSlot];
    const end = o.startAt + o.total * o.perUnitMs;
    return html`<tr><td>${unitIcon(tribe, o.unitSlot)} ${fmtNum(o.total - o.done)} ${u?.name ?? '?'}</td>
      <td class="num">${timer(end, now)}</td><td class="num">${fmtClock(end).slice(0, 5)}</td>
      ${csrf ? html`<td><form method="post" action="/shop/finish/train">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small gold" title="Finish now">${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(end - now)}</button></form></td>` : ''}</tr>`;
  })}</tbody></table>`;
}

function productionTable(eco: Economy): SafeHtml {
  return html`<table id="production"><thead><tr><th colspan="4">Production:</th></tr></thead><tbody>
    ${RESOURCE_KEYS.map(
      (k) => html`<tr><td class="ico">${resIcon(k)}</td><td>${RESOURCE_LABEL[k]}:</td><td class="val ${eco.net[k] < 0 ? 'bad' : ''}">${fmtNum(eco.net[k])}</td><td>per hour</td></tr>`,
    )}
  </tbody></table>`;
}

function troopsTable(tribe: TribeId, units: UnitCounts): SafeHtml {
  const rows = units.map((n, i) => ({ n, i })).filter((r) => r.n > 0);
  return html`<table id="troops"><thead><tr><th colspan="3">Troops:</th></tr></thead><tbody>
    ${rows.length === 0
      ? html`<tr><td colspan="3" class="none center">none</td></tr>`
      : rows.map((r) => html`<tr><td class="ico">${unitIcon(tribe, r.i)}</td><td class="val">${fmtNum(r.n)}</td><td>${TRIBES[tribe].units[r.i]?.name}</td></tr>`)}
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
  <h1>${d.state.village.name}</h1>
  <div id="vmap1">
    <img class="bg" src="/static/img/scene/dorf1-${d.layout}.svg" alt="">
    ${fields.map((s) => {
      const def = BUILDINGS[s.building as BuildingId];
      const pending = d.orders.find((o) => o.slot === s.slot);
      const label = `${def?.name ?? '?'} level ${s.level}${pending ? ` (upgrading to ${pending.toLevel})` : ''}`;
      return html`<a class="ra ra${s.slot}" href="/slot/${s.slot}" title="${label}" aria-label="${label}"></a><span class="rf rf${s.slot} ${badgeClass(d, s.slot, s.level, cap)}">${s.level}</span>`;
    })}
    <a class="vlink" href="/village" title="Village centre" aria-label="Village centre"></a>
  </div>
  <div id="map_details">
    ${d.movements.length ? movementList(d.movements, d.now) : ''}
    ${productionTable(d.eco)}
    ${troopsTable(d.state.tribe, d.homeTroops)}
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
    return html`<span class="bld b${s.slot}"><img src="/static/img/buildings/${src}.svg" alt=""></span>`;
  });
  labels.set(WALL_SLOT, `${TRIBES[tribe].wallName} level ${wall?.level ?? 0}`);
  if (wall && wall.level > 0) levels.push(html`<span class="lv l40 ${badgeClass(d, WALL_SLOT, wall.level, 20)}">${wall.level}</span>`);
  return html`
  ${incomingAlert(d.movements, d.now)}
  <div id="vmap2">
    <h1>${d.state.village.name}</h1>
    <img class="bg" src="/static/img/scene/dorf2.svg" alt="">
    ${wall && wall.level > 0 ? html`<img class="wall" src="/static/img/walls/${wallFile}.svg" alt="">` : ''}
    ${buildings}
    ${levels}
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
