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
import { unitIcon } from './parts.js';

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
  const running = orders.find((o) => o.kind === kind);
  const list = kind === 'academy' ? opts.filter((o) => !o.done) : opts;
  const done = kind === 'academy' ? opts.filter((o) => o.done) : [];
  return html`<table class="tb train"><thead><tr><th>${KIND_TITLE[kind]}</th><th>Action</th></tr></thead><tbody>
    ${list.length === 0 ? html`<tr><td colspan="2" class="muted">There are no units left to research.</td></tr>` : ''}
    ${list.map(
      (o) => html`<tr><td><div class="tname">${unitIcon(tribe, o.slot)} <b>${o.unit.name}</b>${kind !== 'academy' ? html` <span class="small muted">(level ${o.level})</span>` : ''}</div>
        ${costLine(o.cost, have, html`<span>${icon('res/clock', 'Duration', 18, 12)}${fmtDuration(o.timeMs)}</span>`)}</td>
        <td class="center">${o.available
          ? html`<form method="post" action="/research">${csrfField(csrf)}<input type="hidden" name="kind" value="${kind}"><input type="hidden" name="unit" value="${o.slot}">
              <button type="submit" class="linkbtn">${kind === 'academy' ? 'Research' : 'Upgrade'}</button></form>`
          : html`<span class="small none">${o.reason}</span>`}</td></tr>`,
    )}
  </tbody></table>
  ${running
    ? html`<table class="tb"><thead><tr><th colspan="3">In progress</th></tr></thead><tbody><tr>
        <td>${unitIcon(tribe, running.unitSlot)} ${opts.find((o) => o.slot === running.unitSlot)?.unit.name ?? ''}${kind !== 'academy' ? html` (level ${running.toLevel})` : ''}</td>
        <td class="num">${timer(running.finishAt, now)}</td>
        <td><form method="post" action="/shop/finish/research">${csrfField(csrf)}<input type="hidden" name="orderId" value="${running.id}">
          <button type="submit" class="small gold">${icon('res/gold', 'Gold', 18, 12)} ${instantPrice(running.finishAt - now)}</button></form></td></tr></tbody></table>`
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
  merchants: { total: number; busy: number; free: number; capacity: number; speed: number };
  mine: OfferView[];
  others: OfferView[];
  csrf: string;
  x?: number;
  y?: number;
}): SafeHtml {
  const resOptions = (sel: string) => RESOURCE_KEYS.map((k) => html`<option value="${k}"${k === sel ? html` selected` : ''}>${RESOURCE_LABEL[k]}</option>`);
  const ri = (k: string) => resIcon(k as ResourceKey);
  return html`<p class="tabs"><a href="#send">Send resources</a><a href="#offer">Offer</a><a href="#buy">Buy</a><a href="#npc">NPC trade</a><a href="/goldmarket">Gold market</a></p>
    <h2 id="send">Send resources</h2>
    <p>Merchants ${d.merchants.free}/${d.merchants.total} · each merchant can carry <b>${fmtNum(d.merchants.capacity)}</b> resources.</p>
    <form method="post" action="/market/send">
      ${csrfField(d.csrf)}
      <table class="tb"><tbody>
        ${RESOURCE_KEYS.map((k) => html`<tr><td>${resIcon(k)} ${RESOURCE_LABEL[k]}:</td><td><input id="s${k}" type="number" name="${k}" min="0" placeholder="0" inputmode="numeric"></td></tr>`)}
        <tr><td>Village coordinates:</td><td>X <input type="number" name="x" value="${d.x ?? ''}" required inputmode="numeric"> Y <input type="number" name="y" value="${d.y ?? ''}" required inputmode="numeric"></td></tr>
      </tbody></table>
      <button type="submit">OK</button>
    </form>
    <h2 id="offer">Offer resources</h2>
    <form method="post" action="/market/offer">
      ${csrfField(d.csrf)}
      <table class="tb"><tbody>
        <tr><td>Offering:</td><td><input type="number" name="offerAmount" min="1" required inputmode="numeric"> <select name="offerRes">${resOptions('wood')}</select></td></tr>
        <tr><td>Searching:</td><td><input type="number" name="wantAmount" min="1" required inputmode="numeric"> <select name="wantRes">${resOptions('iron')}</select></td></tr>
        <tr><td>Max. time of transport:</td><td><input type="number" name="maxHours" min="1" max="96" inputmode="numeric"> hours</td></tr>
      </tbody></table>
      <button type="submit">OK</button>
    </form>
    ${d.mine.length
      ? html`<table class="tb"><thead><tr><th>Own offers</th><th>Searching</th><th></th></tr></thead><tbody>${d.mine.map(
          (o) => html`<tr><td>${ri(o.offerRes)} ${fmtNum(o.offerAmount)}</td><td>${ri(o.wantRes)} ${fmtNum(o.wantAmount)}</td>
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
    ${d.npc ?? ''}`;
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

export function mansionPanel(oases: { x: number; y: number; oasis: string | null }[], slots: number): SafeHtml {
  return html`<table class="tb"><thead><tr><th colspan="2">Oases (${oases.length}/${slots})</th></tr></thead><tbody>
    ${oases.length === 0
      ? html`<tr><td colspan="2" class="muted">No oases annexed. Clear an oasis within 3 fields with an attack that includes your hero.</td></tr>`
      : oases.map((o) => html`<tr><td><a href="/map/tile?x=${o.x}&amp;y=${o.y}">(${o.x}|${o.y})</a></td><td>${OASIS_LABEL[(o.oasis ?? 'wood') as OasisType]}</td></tr>`)}
  </tbody></table>
  <p><a href="/hero">» Your hero</a></p>`;
}
