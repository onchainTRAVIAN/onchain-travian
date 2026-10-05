import type { ResearchOption, ResearchOrderRow } from '../../game/actions/research.js';
import type { OfferView } from '../../game/actions/market.js';
import type { CelebrationOption, CelebrationRow } from '../../game/actions/celebration.js';
import type { ExpansionCheck } from '../../game/engine/expansion.js';
import { OASIS_LABEL, type OasisType } from '../../game/rules/map.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, type ResourceKey, type Resources } from '../../game/rules/resources.js';
import type { TribeId } from '../../game/rules/units.js';
import { instantPrice } from '../../game/actions/credits.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, icon, resIcon, timer } from './layout.js';
import { unitIcon, unitsInline } from './parts.js';
import { TRAP_COST } from '../../game/actions/traps.js';

const KIND_TITLE = { academy: 'Research', blacksmith: 'Blacksmith upgrades', armoury: 'Armoury upgrades' } as const;

function researchTable(
  kind: 'academy' | 'blacksmith' | 'armoury',
  tribe: TribeId,
  opts: ResearchOption[],
  orders: ResearchOrderRow[],
  have: Resources,
  csrf: string,
  now: number,
): SafeHtml {
  const runningAll = orders.filter((o) => o.kind === kind);
  const list = kind === 'academy' ? opts.filter((o) => !o.done) : opts;
  const done = kind === 'academy' ? opts.filter((o) => o.done) : [];
  return html`<table class="tb train"><thead><tr><th>${KIND_TITLE[kind]}</th><th>Action</th></tr></thead><tbody>
    ${list.length === 0 ? html`<tr><td colspan="2" class="muted">There are no units left to research.</td></tr>` : ''}
    ${list.map(
      (o) => html`<tr><td><div class="tname">${unitIcon(tribe, o.slot)} <b>${o.unit.name}</b>${kind !== 'academy' ? html` <span class="small muted">(level ${o.level})</span>` : ''}</div>
        ${costLine(o.cost, have, html`<span>${icon('res/clock', 'Duration', 18, 12)}${fmtDuration(o.timeMs)}</span>`)}</td>
        <td class="center">${o.available
          ? html`<form method="post" action="/research">${csrfField(csrf)}<input type="hidden" name="kind" value="${kind}"><input type="hidden" name="unit" value="${o.slot}">
              <button type="submit" class="btn small">${kind === 'academy' ? 'Research' : 'Upgrade'}</button></form>`
          : html`<span class="small none">${o.reason}</span>`}</td></tr>`,
    )}
  </tbody></table>
  ${runningAll.length
    ? html`<table class="tb"><thead><tr><th colspan="3">In progress</th></tr></thead><tbody>${runningAll.map(
        (running) => html`<tr>
        <td>${unitIcon(tribe, running.unitSlot)} ${opts.find((o) => o.slot === running.unitSlot)?.unit.name ?? ''}${kind !== 'academy' ? html` (level ${running.toLevel})` : ''}</td>
        <td class="num">${timer(running.finishAt, now)}</td>
        <td><form method="post" action="/shop/finish/research">${csrfField(csrf)}<input type="hidden" name="orderId" value="${running.id}">
          <button type="submit" class="small gold">${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(running.finishAt - now)}</button></form></td></tr>`,
      )}</tbody></table>`
    : ''}
  ${done.length ? html`<p class="small muted">Researched: ${done.map((o) => html`${unitIcon(tribe, o.slot)} `)}</p>` : ''}`;
}

export function academyPanel(tribe: TribeId, opts: ResearchOption[], orders: ResearchOrderRow[], have: Resources, csrf: string, now: number): SafeHtml {
  return researchTable('academy', tribe, opts, orders, have, csrf, now);
}

export function smithyPanel(kind: 'blacksmith' | 'armoury', tribe: TribeId, opts: ResearchOption[], orders: ResearchOrderRow[], have: Resources, csrf: string, now: number): SafeHtml {
  return researchTable(kind, tribe, opts, orders, have, csrf, now);
}

export function marketPanel(d: {
  npc?: SafeHtml;
  routes?: SafeHtml;
  stock: Resources;
  places: { id: number; x: number; y: number; label: string }[];
  ownVillages: { name: string; x: number; y: number }[];
  merchants: { total: number; busy: number; free: number; capacity: number; speed: number };
  mine: OfferView[];
  others: OfferView[];
  csrf: string;
  x?: number;
  y?: number;
}): SafeHtml {
  const resOptions = (sel: string) => RESOURCE_KEYS.map((k) => html`<option value="${k}"${k === sel ? html` selected` : ''}>${RESOURCE_LABEL[k]}</option>`);
  const ri = (k: string) => resIcon(k as ResourceKey);
  return html`<p class="tabs"><a href="#send">Send resources</a><a href="#offer">Offer</a><a href="#buy">Buy</a><a href="#npc-trade">NPC trade</a><a href="#routes">Trade routes</a><a href="/goldmarket">Gold market</a></p>
    <h2 id="send">Send resources</h2>
    <p>Merchants ${d.merchants.free}/${d.merchants.total} · each merchant can carry <b>${fmtNum(d.merchants.capacity)}</b> resources.</p>
    <form method="post" action="/market/send" id="sendform" data-cap="${d.merchants.capacity}" data-free="${d.merchants.free}">
      ${csrfField(d.csrf)}
      <table class="tb"><tbody>
        ${RESOURCE_KEYS.map((k) => {
          const max = Math.max(0, Math.min(Math.floor(d.stock[k]), d.merchants.free * d.merchants.capacity));
          return html`<tr><td>${resIcon(k)} ${RESOURCE_LABEL[k]}:</td><td><input id="s${k}" type="number" name="${k}" min="0" placeholder="0" inputmode="numeric">
            <a href="#s${k}" class="fill small" data-fill="s${k}" data-value="${max}" data-stock="${Math.floor(d.stock[k])}">(max ${fmtNum(max)})</a></td></tr>`;
        })}
        <tr><td>Merchants:</td><td><b id="merch-need">0</b> of ${d.merchants.free} free needed · <span id="merch-left">${fmtNum(d.merchants.free * d.merchants.capacity)}</span> more resources fit</td></tr>
        <tr><td>Village coordinates:</td><td>X <input type="number" name="x" value="${d.x ?? ''}" required inputmode="numeric" class="w30"> Y <input type="number" name="y" value="${d.y ?? ''}" required inputmode="numeric" class="w30"></td></tr>
        ${d.ownVillages.length || d.places.length
          ? html`<tr><td>Quick pick:</td><td class="places">${d.ownVillages.map(
              (v) => html`<a href="#sendform" class="place" data-x="${v.x}" data-y="${v.y}" title="Your village">${v.name}</a> `,
            )}${d.places.map(
              (p) => html`<span class="nowrap"><a href="#sendform" class="place" data-x="${p.x}" data-y="${p.y}">${p.label} (${p.x}|${p.y})</a>
                <button type="submit" form="delplace${p.id}" class="lnk small" title="Forget this place" aria-label="Forget ${p.label}">✕</button></span> `,
            )}</td></tr>`
          : ''}
        <tr><td></td><td><label><input type="checkbox" name="save" value="1"> Save this destination</label>
          <input type="text" name="label" maxlength="30" placeholder="name (optional)" class="w120"></td></tr>
      </tbody></table>
      <button type="submit">OK</button>
    </form>
    ${d.places.map((p) => html`<form id="delplace${p.id}" method="post" action="/places/delete" hidden>${csrfField(d.csrf)}<input type="hidden" name="id" value="${p.id}"></form>`)}
    <h2 id="offer">Offer resources</h2>
    <form method="post" action="/market/offer">
      ${csrfField(d.csrf)}
      <table class="tb"><tbody>
        <tr><td>Offering:</td><td><input type="number" name="offerAmount" min="1" required inputmode="numeric"> <select name="offerRes">${resOptions('wood')}</select></td></tr>
        <tr><td>Searching:</td><td><input type="number" name="wantAmount" min="1" required inputmode="numeric"> <select name="wantRes">${resOptions('iron')}</select></td></tr>
        <tr><td>Max. time of transport:</td><td><input type="number" name="maxHours" min="1" max="96" inputmode="numeric"> hours</td></tr>
        <tr><td>Own alliance only:</td><td><label><input type="checkbox" name="allianceOnly" value="1"> only members of my alliance may accept</label></td></tr>
      </tbody></table>
      <button type="submit">OK</button>
    </form>
    ${d.mine.length
      ? html`<table class="tb"><thead><tr><th>Own offers</th><th>Searching</th><th></th></tr></thead><tbody>${d.mine.map(
          (o) => html`<tr><td>${ri(o.offerRes)} ${fmtNum(o.offerAmount)}${o.allianceOnly ? html` <span class="small muted">(alliance)</span>` : ''}</td><td>${ri(o.wantRes)} ${fmtNum(o.wantAmount)}</td>
            <td><form method="post" action="/market/cancel">${csrfField(d.csrf)}<input type="hidden" name="offerId" value="${o.id}"><button type="submit" class="small secondary">cancel</button></form></td></tr>`,
        )}</tbody></table>`
      : ''}
    <h2 id="buy">Buy</h2>
    <table class="tb"><thead><tr><th>Offered</th><th>Searching</th><th>Player</th><th>Duration</th><th>Action</th></tr></thead><tbody>
    ${d.others.length === 0
      ? html`<tr><td colspan="5" class="muted">There are no offers at the marketplace.</td></tr>`
      : d.others.slice(0, 40).map(
          (o) => html`<tr><td>${ri(o.offerRes)} ${fmtNum(o.offerAmount)}</td><td>${ri(o.wantRes)} ${fmtNum(o.wantAmount)}</td>
            <td><a href="/map/tile?x=${o.x}&amp;y=${o.y}">${o.owner}</a></td><td class="num">${fmtDuration(o.hours * 3_600_000)}</td>
            <td><form method="post" action="/market/accept">${csrfField(d.csrf)}<input type="hidden" name="offerId" value="${o.id}"><button type="submit" class="linkbtn">Accept offer</button></form></td></tr>`,
        )}
    </tbody></table>
    ${d.npc ? html`<h2 id="npc-trade">NPC trade</h2>${d.npc}` : ''}
    ${d.routes ?? ''}`;
}

export function celebrationPanel(opts: CelebrationOption[], running: CelebrationRow | undefined, have: Resources, csrf: string, now: number): SafeHtml {
  return html`<table class="tb train"><thead><tr><th>Celebrations</th><th>Action</th></tr></thead><tbody>
    ${opts.map(
      (o) => html`<tr><td><b>${o.name}</b> <span class="small muted">(${fmtNum(o.culturePoints)} culture points)</span>
        ${costLine(o.cost, have, html`<span>${icon('res/clock', 'Duration', 18, 12)}${fmtDuration(o.timeMs)}</span>`)}</td>
        <td class="center">${o.available
          ? html`<form method="post" action="/celebrate">${csrfField(csrf)}<input type="hidden" name="kind" value="${o.kind}"><button type="submit" class="linkbtn">hold</button></form>`
          : html`<span class="small none">${o.reason}</span>`}</td></tr>`,
    )}
  </tbody></table>
  ${running ? html`<p>🎉 A ${running.kind} celebration is running: ${timer(running.finishAt, now)} left (+${fmtNum(running.culturePoints)} culture points).</p>` : ''}`;
}

export function expansionPanel(check: ExpansionCheck, villages: number): SafeHtml {
  return html`<table class="tb"><tbody>
      <tr><th>Culture points</th><td>${fmtNum(check.culturePoints)} of ${fmtNum(check.required)} needed for village ${villages + 1}</td></tr>
      <tr><th>Expansion slots</th><td>${check.used} used of ${check.slots}</td></tr>
    </tbody></table>
    <p class="small muted">Train 3 settlers to found a new village, or a chief to conquer one. Slots come at Residence level 10 and 20, Palace level 10, 15 and 20.</p>`;
}

export function embassyPanel(alliance: { id: number; name: string; tag: string } | null): SafeHtml {
  return alliance
    ? html`<p>Alliance: <a href="/alliance/${alliance.id}">[${alliance.tag}] ${alliance.name}</a></p>`
    : html`<p>You are not in an alliance. <a href="/alliance">» Alliance overview</a></p>`;
}

export function mansionPanel(oases: { x: number; y: number; oasis: string | null }[], slots: number, csrf: string): SafeHtml {
  return html`<table class="tb"><thead><tr><th colspan="2">Oases (${oases.length}/${slots})</th></tr></thead><tbody>
    ${oases.length === 0
      ? html`<tr><td colspan="3" class="muted">No oases annexed. Clear an oasis within 3 fields with an attack that includes your hero. An oasis held by another player takes 1–4 such attacks (its loyalty must fall to 0; it regrows 2 per hour per Hero's Mansion level of the owner).</td></tr>`
      : oases.map((o) => html`<tr><td><a href="/map/tile?x=${o.x}&amp;y=${o.y}">(${o.x}|${o.y})</a></td><td>${OASIS_LABEL[(o.oasis ?? 'wood') as OasisType]}</td>
        <td><form method="post" action="/oasis/release">${csrfField(csrf)}<input type="hidden" name="x" value="${o.x}"><input type="hidden" name="y" value="${o.y}"><button type="submit" class="small secondary">Release</button></form></td></tr>`)}
  </tbody></table>
  <p><a href="/hero">» Your hero</a> (train a hero here from one of your soldiers)</p>`;
}

export function trapperPanel(d: {
  built: number;
  capacity: number;
  held: number;
  prisoners: { ownerVillageId: number; units: number[]; from: { name: string; x: number; y: number; tribe: TribeId; username: string } | undefined }[];
  have: Resources;
  csrf: string;
}): SafeHtml {
  const free = Math.max(0, d.built - d.held);
  const canBuild = Math.max(0, d.capacity - d.built);
  return html`<table class="tb"><tbody>
      <tr><th>Traps built</th><td>${fmtNum(d.built)} of ${fmtNum(d.capacity)}</td></tr>
      <tr><th>Ready</th><td>${fmtNum(free)}</td></tr>
      <tr><th>Holding prisoners</th><td>${fmtNum(d.held)}</td></tr>
    </tbody></table>
    ${canBuild > 0
      ? html`<form method="post" action="/traps/build" class="block">${csrfField(d.csrf)}
          <p>Build traps: ${costLine(TRAP_COST, d.have)} each
            <input type="number" name="count" min="1" max="${canBuild}" class="w30" inputmode="numeric" aria-label="Traps to build"> <button type="submit">Build</button></p>
        </form>`
      : html`<p class="small muted">All trap places are built. Upgrade the Trapper for more.</p>`}
    ${d.prisoners.length
      ? html`<h2>Prisoners</h2><table class="tb"><tbody>${d.prisoners.map(
          (p) => html`<tr><td>${p.from ? html`<a href="/map/tile?x=${p.from.x}&amp;y=${p.from.y}">${p.from.name}</a> (${p.from.username})` : 'unknown'}</td>
            <td>${p.from ? unitsInline(p.from.tribe, p.units) : fmtNum(p.units.reduce((a, b) => a + b, 0))}</td></tr>`,
        )}</tbody></table>
        <form method="post" action="/traps/free">${csrfField(d.csrf)}<button type="submit" class="secondary">Release all prisoners</button>
          <span class="small muted">They walk home and all your traps are ready again.</span></form>`
      : ''}
    <p class="small muted">Each trap catches one attacker before the battle. A successful attack by the prisoners' side frees them: a quarter die escaping and only a third of their broken traps can be repaired.</p>`;
}

/** Main Building: demolish one level of a building (from level 10). */
export function demolishPanel(d: { mainLevel: number; buildings: { slot: number; name: string; level: number }[]; busy: string | null; csrf: string }): SafeHtml {
  if (d.mainLevel < 10) return html`<p class="small muted">From level 10 you can demolish buildings here, one level at a time.</p>`;
  return html`<h2>Demolish a building</h2>
    ${d.busy
      ? html`<p class="small">Demolishing ${d.busy}. Only one building can be demolished at a time.</p>`
      : d.buildings.length === 0
        ? html`<p class="small muted">Nothing to demolish.</p>`
        : html`<form method="post" action="/build/demolish" class="block">${csrfField(d.csrf)}
            <select name="slot" aria-label="Building to demolish">${d.buildings.map((b) => html`<option value="${b.slot}">${b.name} (level ${b.level})</option>`)}</select>
            <button type="submit" class="secondary">Demolish one level</button>
            <p class="small muted">Takes half the time the level took to build; nothing is refunded.</p></form>`}`;
}
