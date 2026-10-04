import type { ResearchOption, ResearchOrderRow } from '../../game/actions/research.js';
import type { OfferView } from '../../game/actions/market.js';
import type { ExpansionCheck } from '../../game/engine/expansion.js';
import { OASIS_LABEL, type OasisType } from '../../game/rules/map.js';
import { RESOURCE_ICON, RESOURCE_KEYS, RESOURCE_LABEL, type Resources } from '../../game/rules/resources.js';
import { instantPrice } from '../../game/actions/credits.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, timer } from './layout.js';

function researchList(kind: 'academy' | 'smithy', opts: ResearchOption[], orders: ResearchOrderRow[], have: Resources, csrf: string, now: number): SafeHtml {
  const running = orders.find((o) => o.kind === kind);
  return html`
    ${running
      ? html`<div class="note">⏳ ${kind === 'academy' ? 'Researching' : 'Upgrading'} <b>${opts.find((o) => o.slot === running.unitSlot)?.unit.name ?? ''}</b>
          ${kind === 'smithy' ? html` to level ${running.toLevel}` : ''} — done in ${timer(running.finishAt, now)}
          <form method="post" action="/shop/finish/research" class="inline">${csrfField(csrf)}<input type="hidden" name="orderId" value="${running.id}">
          <button type="submit" class="small gold">⚡ ${instantPrice(running.finishAt - now)}</button></form></div>`
      : ''}
    ${opts.map(
      (o) => html`<div class="card">
        <div class="cardrow"><b>${o.unit.icon} ${o.unit.name}</b>${kind === 'smithy' ? html`<span class="small muted">level ${o.level}</span>` : o.done ? html`<span class="good small">✔ researched</span>` : ''}</div>
        ${o.done && kind === 'academy'
          ? ''
          : html`${costLine(o.cost, have)}<div class="small muted">⏱ ${fmtDuration(o.timeMs)}</div>
            ${o.available
              ? html`<form method="post" action="/research">${csrfField(csrf)}<input type="hidden" name="kind" value="${kind}"><input type="hidden" name="unit" value="${o.slot}">
                  <button type="submit" class="small">${kind === 'academy' ? 'Research' : `Upgrade to level ${o.level + 1}`}</button></form>`
              : html`<div class="small warn">${o.reason}</div>`}`}
      </div>`,
    )}`;
}

export function academyPanel(opts: ResearchOption[], orders: ResearchOrderRow[], have: Resources, csrf: string, now: number): SafeHtml {
  return html`<h2>📜 Research</h2><p class="small muted">Research a unit once to train it in every building of this village.</p>${researchList('academy', opts, orders, have, csrf, now)}`;
}

export function smithyPanel(opts: ResearchOption[], orders: ResearchOrderRow[], have: Resources, csrf: string, now: number): SafeHtml {
  return html`<h2>🔨 Upgrades</h2><p class="small muted">Each level gives that unit +1.5% attack and defence. Max level = Smithy level.</p>${researchList('smithy', opts, orders, have, csrf, now)}`;
}

export function marketPanel(d: {
  merchants: { total: number; busy: number; free: number; capacity: number; speed: number };
  mine: OfferView[];
  others: OfferView[];
  csrf: string;
  x?: number;
  y?: number;
}): SafeHtml {
  const resOptions = (sel: string) => RESOURCE_KEYS.map((k) => html`<option value="${k}"${k === sel ? html` selected` : ''}>${RESOURCE_ICON[k]} ${RESOURCE_LABEL[k]}</option>`);
  return html`<h2>🐫 Merchants</h2>
    <p>${d.merchants.free} of ${d.merchants.total} merchants free · each carries ${fmtNum(d.merchants.capacity)} · speed ${d.merchants.speed} fields/h</p>
    <h3>Send resources</h3>
    <form method="post" action="/market/send">
      ${csrfField(d.csrf)}
      <div class="row">
        <div><label for="mx">X</label><input id="mx" type="number" name="x" value="${d.x ?? ''}" required inputmode="numeric"></div>
        <div><label for="my">Y</label><input id="my" type="number" name="y" value="${d.y ?? ''}" required inputmode="numeric"></div>
      </div>
      <div class="row">${RESOURCE_KEYS.map(
        (k) => html`<div><label for="s${k}">${RESOURCE_ICON[k]}</label><input id="s${k}" type="number" name="${k}" min="0" placeholder="0" inputmode="numeric"></div>`,
      )}</div>
      <div class="actions"><button type="submit">Send merchants</button></div>
    </form>
    <h3>Your offers</h3>
    ${d.mine.length === 0
      ? html`<p class="muted small">No open offers.</p>`
      : html`<ul class="list">${d.mine.map(
          (o) => html`<li><span class="grow">Offer ${RESOURCE_ICON[o.offerRes as keyof typeof RESOURCE_ICON]} ${fmtNum(o.offerAmount)} for ${RESOURCE_ICON[o.wantRes as keyof typeof RESOURCE_ICON]} ${fmtNum(o.wantAmount)}
            <span class="sub">${o.merchants} merchant(s) reserved</span></span>
            <form method="post" action="/market/cancel">${csrfField(d.csrf)}<input type="hidden" name="offerId" value="${o.id}"><button type="submit" class="small secondary">Cancel</button></form></li>`,
        )}</ul>`}
    <h3>Create an offer</h3>
    <form method="post" action="/market/offer">
      ${csrfField(d.csrf)}
      <div class="row">
        <div><label for="or">I offer</label><select id="or" name="offerRes">${resOptions('wood')}</select></div>
        <div><label for="oa">Amount</label><input id="oa" type="number" name="offerAmount" min="1" required inputmode="numeric"></div>
      </div>
      <div class="row">
        <div><label for="wr">I want</label><select id="wr" name="wantRes">${resOptions('iron')}</select></div>
        <div><label for="wa">Amount</label><input id="wa" type="number" name="wantAmount" min="1" required inputmode="numeric"></div>
      </div>
      <label for="mh">Max travel time (hours, optional)</label>
      <input id="mh" type="number" name="maxHours" min="1" max="96" inputmode="numeric">
      <div class="actions"><button type="submit">Post offer</button></div>
    </form>
    <h3>Offers from other players</h3>
    ${d.others.length === 0
      ? html`<p class="muted small">Nobody is trading right now.</p>`
      : html`<ul class="list">${d.others.slice(0, 30).map(
          (o) => html`<li><span class="grow">${RESOURCE_ICON[o.offerRes as keyof typeof RESOURCE_ICON]} ${fmtNum(o.offerAmount)} → ${RESOURCE_ICON[o.wantRes as keyof typeof RESOURCE_ICON]} ${fmtNum(o.wantAmount)}
            <span class="sub">${o.owner} · ${o.villageName} · ${o.hours.toFixed(1)} h away</span></span>
            <form method="post" action="/market/accept">${csrfField(d.csrf)}<input type="hidden" name="offerId" value="${o.id}"><button type="submit" class="small">Accept</button></form></li>`,
        )}</ul>`}`;
}

export function expansionPanel(check: ExpansionCheck, villages: number): SafeHtml {
  return html`<h2>🧺 Expansion</h2>
    <ul class="list">
      <li><span class="grow">Culture points <span class="sub">${fmtNum(check.culturePoints)} / ${fmtNum(check.required)} needed for village ${villages + 1}</span></span></li>
      <li><span class="grow">Expansion slots <span class="sub">${check.used} used of ${check.slots}</span></span></li>
    </ul>
    <p class="small muted">Train 3 settlers to found a new village on an empty valley, or a chief to conquer a village (its Residence/Palace must be destroyed first; capitals can't be taken). Slots come at Residence level 10 and 20, or Palace level 10, 15 and 20.</p>`;
}

export function embassyPanel(alliance: { id: number; name: string; tag: string } | null): SafeHtml {
  return html`<h2>🤝 Alliance</h2>
    ${alliance
      ? html`<p>You are a member of <a href="/alliance/${alliance.id}">[${alliance.tag}] ${alliance.name}</a>.</p>`
      : html`<p>You are not in an alliance yet. With an Embassy you can accept invitations; at level 3 you can found your own.</p>`}
    <div class="actions"><a class="btn" href="/alliance">Open alliance</a></div>`;
}

export function mansionPanel(oases: { x: number; y: number; oasis: string | null }[], slots: number): SafeHtml {
  return html`<h2>🌴 Oases</h2>
    <p>You hold ${oases.length} of ${slots} oases (one more at level 10, 15 and 20).</p>
    ${oases.length
      ? html`<ul class="list">${oases.map(
          (o) => html`<li><span class="grow"><a href="/map/tile?x=${o.x}&amp;y=${o.y}">(${o.x}|${o.y})</a> <span class="sub">${OASIS_LABEL[(o.oasis ?? 'wood') as OasisType]}</span></span></li>`,
        )}</ul>`
      : html`<p class="small muted">Clear an oasis within 3 fields of this village with an attack that includes your hero to capture it.</p>`}
    <div class="actions"><a class="btn" href="/hero">🦸 Your hero</a></div>`;
}
