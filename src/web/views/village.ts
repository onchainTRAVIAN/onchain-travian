import { BUILDINGS, FIELD_SLOTS, RALLY_SLOT, TOWN_SLOT_FIRST, TOWN_SLOT_LAST, WALL_SLOT, type BuildingId } from '../../game/rules/buildings.js';
import { RESOURCE_ICON, RESOURCE_KEYS, RESOURCE_LABEL } from '../../game/rules/resources.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import type { BuildOrderRow } from '../../game/actions/build.js';
import type { TrainOrderRow } from '../../game/actions/train.js';
import type { Economy, VillageState } from '../../game/engine/state.js';
import type { MovementView } from '../../game/queries.js';
import { fmtNum, fmtSigned } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, timer } from './layout.js';
import { buildingLabel, movementList, unitsTable } from './parts.js';

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
  const hostile = moves.filter((m) => m.direction === 'in' && m.kind !== 'reinforce');
  if (hostile.length === 0) return html``;
  const first = hostile[0];
  return html`<div class="alert" role="alert">🔴 <b>${hostile.length} incoming attack${hostile.length === 1 ? '' : 's'}!</b>
    ${first ? html`First arrives in ${timer(first.arriveAt, now)}.` : ''} <a href="/troops">See troops →</a></div>`;
}

function protectionNote(until: number, now: number): SafeHtml {
  if (until <= now) return html``;
  return html`<div class="note">🛡️ Beginner protection: nobody can attack you for ${timer(until, now, false)}. Sending an attack ends it early.</div>`;
}

export function buildQueue(orders: BuildOrderRow[], now: number, csrf: string): SafeHtml {
  if (orders.length === 0) return html`<p class="muted small">Nothing is being built. Pick a field or building to upgrade.</p>`;
  return html`<ul class="list">${orders.map((o) => {
    const l = buildingLabel(o.building);
    const total = Math.max(1, o.finishAt - o.startAt);
    const done = Math.min(100, Math.max(0, Math.round(((now - o.startAt) / total) * 100)));
    return html`<li><span aria-hidden="true">${l.icon}</span>
      <span class="grow">${l.name} <b>→ level ${o.toLevel}</b>
        <span class="sub">Done in ${timer(o.finishAt, now)}</span>
        <span class="bar" aria-hidden="true"><i class="w${Math.round(done / 5) * 5}"></i></span></span>
      <form method="post" action="/build/cancel">${csrfField(csrf)}<input type="hidden" name="orderId" value="${o.id}">
        <button type="submit" class="small secondary" aria-label="Cancel ${l.name}">✕</button></form></li>`;
  })}</ul>`;
}

export function trainingQueue(orders: TrainOrderRow[], tribe: TribeId, now: number): SafeHtml {
  if (orders.length === 0) return html``;
  return html`<ul class="list">${orders.map((o) => {
    const u = TRIBES[tribe].units[o.unitSlot];
    const end = o.startAt + o.total * o.perUnitMs;
    const nextAt = o.startAt + (o.done + 1) * o.perUnitMs;
    return html`<li><span aria-hidden="true">${u?.icon ?? '❔'}</span>
      <span class="grow">${fmtNum(o.total - o.done)} × ${u?.name ?? '?'}
        <span class="sub">${o.startAt > now ? html`Starts in ${timer(o.startAt, now)}` : html`Next one in ${timer(nextAt, now)}`}</span></span>
      <span class="right small">all done in<br>${timer(end, now)}</span></li>`;
  })}</ul>`;
}

function productionTable(eco: Economy): SafeHtml {
  return html`<div class="tblwrap"><table>
    <tr><th>Resource</th><th class="num">Per hour</th><th class="num">Storage</th></tr>
    ${RESOURCE_KEYS.map(
      (k) => html`<tr><td>${RESOURCE_ICON[k]} ${RESOURCE_LABEL[k]}</td><td class="num ${eco.net[k] < 0 ? 'bad' : ''}">${fmtSigned(eco.net[k])}</td><td class="num">${fmtNum(eco.capacity[k])}</td></tr>`,
    )}
    <tr><td class="muted small" colspan="3">Your population and troops eat ${fmtNum(eco.upkeep)} 🌾 crop per hour (already included above).</td></tr>
  </table></div>
  ${eco.net.crop < 0 ? html`<p class="bad small"><b>Warning:</b> you produce less crop than you eat. Upgrade croplands or your granary will run empty.</p>` : ''}`;
}

export function fieldsView(d: VillageViewData): SafeHtml {
  const busy = new Set(d.orders.map((o) => o.slot));
  const fields = d.state.slots.filter((s) => s.slot <= FIELD_SLOTS);
  const order: BuildId[] = ['woodcutter', 'claypit', 'ironmine', 'cropland'];
  fields.sort((a, b) => order.indexOf(a.building as BuildId) - order.indexOf(b.building as BuildId) || a.slot - b.slot);
  return html`
  ${incomingAlert(d.movements, d.now)}
  ${protectionNote(d.protectedUntil, d.now)}
  <h1>${d.state.village.name} <span class="muted small">(${d.state.village.x}|${d.state.village.y})</span></h1>
  <p class="muted small">Resource fields — tap one to upgrade it. <span class="good">Green line</span> = you can upgrade now.</p>
  <div class="grid">${fields.map((s) => {
    const def = BUILDINGS[s.building as BuildingId];
    const pending = d.orders.find((o) => o.slot === s.slot);
    const cls = ['tile', busy.has(s.slot) ? 'busy' : '', d.ready.has(s.slot) ? 'ready' : ''].join(' ');
    return html`<a class="${cls}" href="/slot/${s.slot}"><span class="ico" aria-hidden="true">${def?.icon ?? '❔'}</span>${def?.name ?? '?'}<br>
      <span class="lvl">Level ${s.level}${pending ? html` → ${pending.toLevel}` : ''}</span></a>`;
  })}</div>
  <h2>🔨 Construction</h2>
  ${buildQueue(d.orders, d.now, d.csrf)}
  <h2>📈 Production</h2>
  ${productionTable(d.eco)}
  <h2>⚔️ Troops at home</h2>
  ${unitsTable(d.state.tribe, d.homeTroops, undefined, { hideEmpty: true })}
  ${trainingQueue(d.training, d.state.tribe, d.now)}
  <h2>🚩 Troop movements</h2>
  ${movementList(d.movements, d.now)}
  <div class="actions"><a class="btn" href="/village">🏘️ Village center</a><a class="btn secondary" href="/troops/send">⚔️ Send troops</a></div>`;
}

type BuildId = 'woodcutter' | 'claypit' | 'ironmine' | 'cropland';

export function townView(d: VillageViewData): SafeHtml {
  const plots = d.state.slots.filter((s) => (s.slot >= TOWN_SLOT_FIRST && s.slot <= TOWN_SLOT_LAST) || s.slot === RALLY_SLOT || s.slot === WALL_SLOT);
  // Fixed places first so the Rally Point and Wall are easy to find.
  plots.sort((a, b) => rankSlot(a.slot) - rankSlot(b.slot));
  return html`
  ${incomingAlert(d.movements, d.now)}
  <h1>${d.state.village.name} <span class="muted small">(${d.state.village.x}|${d.state.village.y})</span></h1>
  <p class="muted small">Village center — tap a building to upgrade it, or an empty plot to build.</p>
  <div class="grid">${plots.map((s) => {
    const pending = d.orders.find((o) => o.slot === s.slot);
    const l = buildingLabel(pending && !s.building ? pending.building : s.building);
    const empty = !s.building && !pending;
    const notBuilt = s.building && s.level === 0 && !pending;
    const cls = ['tile', empty || notBuilt ? 'empty' : '', pending ? 'busy' : '', d.ready.has(s.slot) ? 'ready' : ''].join(' ');
    return html`<a class="${cls}" href="/slot/${s.slot}"><span class="ico" aria-hidden="true">${l.icon}</span>${l.name}<br>
      <span class="lvl">${empty ? 'Build' : notBuilt ? 'Not built' : html`Level ${s.level}${pending ? html` → ${pending.toLevel}` : ''}`}</span></a>`;
  })}</div>
  <h2>🔨 Construction</h2>
  ${buildQueue(d.orders, d.now, d.csrf)}
  ${d.training.length > 0 ? html`<h2>🎯 Training</h2>${trainingQueue(d.training, d.state.tribe, d.now)}` : ''}
  <div class="actions"><a class="btn" href="/fields">🌾 Resource fields</a></div>`;
}

function rankSlot(slot: number): number {
  if (slot === 19) return 0; // main building
  if (slot === RALLY_SLOT) return 1;
  if (slot === WALL_SLOT) return 2;
  return slot;
}

