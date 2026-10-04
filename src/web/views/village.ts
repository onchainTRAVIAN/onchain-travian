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
        <button type="submit" class="small gold" title="Finish now">${icon('res/gold', 'Gold', 12)} ${instantPrice(o.finishAt - now)}</button></form></td>
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
        <button type="submit" class="small gold" title="Finish now">${icon('res/gold', 'Gold', 12)} ${instantPrice(end - now)}</button></form></td>` : ''}</tr>`;
  })}</tbody></table>`;
}

function productionTable(eco: Economy): SafeHtml {
  return html`<table class="tb"><thead><tr><th colspan="3">Production per hour:</th></tr></thead><tbody>
    ${RESOURCE_KEYS.map(
      (k) => html`<tr><td>${resIcon(k)}</td><td>${RESOURCE_LABEL[k]}:</td><td class="num ${eco.net[k] < 0 ? 'bad' : ''}"><b>${fmtNum(eco.net[k])}</b></td></tr>`,
    )}
  </tbody></table>
  ${eco.net.crop < 0 ? html`<p class="bad small">Your crop production is negative! Build croplands or your troops will starve.</p>` : ''}`;
}

function troopsTable(tribe: TribeId, units: UnitCounts): SafeHtml {
  const rows = units.map((n, i) => ({ n, i })).filter((r) => r.n > 0);
  return html`<table class="tb"><thead><tr><th colspan="3">Troops:</th></tr></thead><tbody>
    ${rows.length === 0
      ? html`<tr><td colspan="3" class="muted">none</td></tr>`
      : rows.map((r) => html`<tr><td>${unitIcon(tribe, r.i)}</td><td class="num"><b>${fmtNum(r.n)}</b></td><td>${TRIBES[tribe].units[r.i]?.name}</td></tr>`)}
  </tbody></table>`;
}

function badgeClass(d: VillageViewData, slot: number, level: number, maxLevel: number): string {
  if (d.orders.some((o) => o.slot === slot)) return 'lvlbadge busy';
  if (level >= maxLevel) return 'lvlbadge max';
  if (d.ready.has(slot)) return 'lvlbadge up';
  return 'lvlbadge';
}

const FIELD_FILE: Record<string, string> = { woodcutter: 'wood', claypit: 'clay', ironmine: 'iron', cropland: 'crop' };

/** Village overview: the resource fields around the village. */
export function fieldsView(d: VillageViewData): SafeHtml {
  const fields = d.state.slots.filter((s) => s.slot <= FIELD_SLOTS).sort((a, b) => a.slot - b.slot);
  const cap = d.state.village.isCapital ? 20 : 10;
  return html`
  ${incomingAlert(d.movements, d.now)}
  ${protectionNote(d.protectedUntil, d.now)}
  <h1>${d.state.village.name} <span class="muted">(${d.state.village.x}|${d.state.village.y})</span></h1>
  <div class="dorf1" role="group" aria-label="Resource fields">
    ${fields.map((s) => {
      const def = BUILDINGS[s.building as BuildingId];
      const pending = d.orders.find((o) => o.slot === s.slot);
      const label = `${def?.name ?? '?'} level ${s.level}${pending ? ` (upgrading to ${pending.toLevel})` : ''}`;
      return html`<a class="fld f${s.slot}" href="/slot/${s.slot}" title="${label}" aria-label="${label}">
        <img src="/static/img/fields/${FIELD_FILE[s.building ?? ''] ?? 'crop'}.svg" alt=""><span class="${badgeClass(d, s.slot, s.level, cap)}">${s.level}</span></a>`;
    })}
    <a class="village-link" href="/village" title="Village centre" aria-label="Village centre"></a>
  </div>
  ${buildQueue(d.orders, d.now, d.csrf)}
  <div class="twocol">
    <div>${productionTable(d.eco)}</div>
    <div>${troopsTable(d.state.tribe, d.homeTroops)}</div>
  </div>
  ${movementList(d.movements, d.now)}`;
}

/** Village centre: buildings on their spots inside the wall. */
export function townView(d: VillageViewData): SafeHtml {
  const tribe = d.state.tribe;
  const wall = d.state.slots.find((s) => s.slot === WALL_SLOT);
  const wallFile = wall?.building === 'earthwall' ? 'earth' : wall?.building === 'palisade' ? 'palisade' : 'city';
  const spots = d.state.slots.filter((s) => (s.slot >= TOWN_SLOT_FIRST && s.slot <= TOWN_SLOT_LAST) || s.slot === RALLY_SLOT);
  return html`
  ${incomingAlert(d.movements, d.now)}
  <h1>${d.state.village.name} <span class="muted">(${d.state.village.x}|${d.state.village.y})</span></h1>
  <div class="dorf2" role="group" aria-label="Village buildings">
    ${wall && wall.level > 0 ? html`<img class="wallring" src="/static/img/walls/${wallFile}.svg" alt="">` : ''}
    ${spots.map((s) => {
      const pending = d.orders.find((o) => o.slot === s.slot);
      const id = s.building ?? pending?.building ?? null;
      const def = id ? BUILDINGS[id as BuildingId] : undefined;
      const underConstruction = !!pending && s.level === 0;
      const empty = !id || (s.level === 0 && !pending);
      const img = underConstruction
        ? html`<img src="/static/img/buildings/construction.svg" alt="">`
        : empty
          ? html`<img src="/static/img/buildings/empty.svg" alt="">`
          : buildingImg(id);
      const label = empty && !id ? 'Building site' : `${def?.name ?? 'Building site'}${s.level > 0 ? ` level ${s.level}` : ''}${pending ? ` (upgrading to ${pending.toLevel})` : ''}`;
      return html`<a class="spot s${s.slot}${s.slot === MAIN_SLOT ? ' main' : ''}" href="/slot/${s.slot}" title="${label}" aria-label="${label}">
        ${img}${s.level > 0 || pending ? html`<span class="${badgeClass(d, s.slot, s.level, def?.maxLevel ?? 20)}">${s.level}</span>` : ''}</a>`;
    })}
    <a class="spot wall s40" href="/slot/40" title="${TRIBES[tribe].wallName} level ${wall?.level ?? 0}" aria-label="${TRIBES[tribe].wallName} level ${wall?.level ?? 0}">
      <span class="${badgeClass(d, WALL_SLOT, wall?.level ?? 0, 20)}">${wall?.level ?? 0}</span></a>
  </div>
  <p class="small muted center">Click a building to upgrade it, or an empty building site to construct a new building. ${TRIBES[tribe].wallName}: level ${wall?.level ?? 0}.</p>
  ${buildQueue(d.orders, d.now, d.csrf)}
  ${d.training.length > 0 ? trainingQueue(d.training, tribe, d.now, d.csrf) : ''}`;
}

