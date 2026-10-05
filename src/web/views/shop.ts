import { config } from '../../config.js';
import { PROTECTION_PRICE, TRANSFER_MAX, NPC_TRADE_PRICE, PRODUCTS, TICKER_MAX_HOURS, TICKER_MAX_LENGTH } from '../../game/actions/credits.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, sumRes, type Resources } from '../../game/rules/resources.js';
import { fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, resIcon, timer } from './layout.js';
import { goldClubCard } from './goldclub.js';

export function shopView(d: {
  balance: number;
  boosts: { source: string; expiresAt: number | null }[];
  stock: Resources;
  capacity: Resources;
  history: { amount: number; reason: string; createdAt: number }[];
  sendTo: string;
  protection: { protectedUntil: number; canBuyAt: number };
  goldClub: boolean;
  csrf: string;
  now: number;
}): SafeHtml {
  const total = Math.floor(sumRes(d.stock));
  const even = Math.floor(total / 4);
  return html`<h1>Plus &amp; Gold</h1>
    <div class="card cardrow"><span>Your balance</span><span class="price">${fmtNum(d.balance)} Gold</span>
      <a class="btn gold" href="/shop/topup">Buy Gold</a></div>
    <p class="small">» <a href="/goldmarket">Gold market</a>: buy and sell resources and troops with other players for Gold.</p>
    ${goldClubCard({ member: d.goldClub, balance: d.balance, csrf: d.csrf })}
    <h2 id="protection">Protection</h2>
    <div class="card"><div class="cardrow"><b>🛡️ 24 hours of protection</b><span class="price">${PROTECTION_PRICE} Gold</span></div>
      <div class="small">Nobody can attack, raid or scout your villages for 24 hours. Attacking another player ends it early.
        After bought protection ends you can buy it again only after 8 hours.</div>
      ${d.protection.protectedUntil > d.now
        ? html`<div class="small good">You are protected for ${timer(d.protection.protectedUntil, d.now, false)}.</div>`
        : d.protection.canBuyAt > d.now
          ? html`<div class="small bad">You can buy protection again in ${timer(d.protection.canBuyAt, d.now, false)}.</div>`
          : html`<form method="post" action="/shop/protection">${csrfField(d.csrf)}<button type="submit" class="small${d.balance < PROTECTION_PRICE ? ' secondary' : ''}">Buy protection</button></form>`}
    </div>
    <h2 id="gold">Send Gold to a player</h2>
    <form method="post" action="/shop/transfer" class="block">${csrfField(d.csrf)}
      <table class="tb"><tbody>
        <tr><th><label for="gto">Player</label></th><td><input id="gto" type="text" name="to" value="${d.sendTo}" required maxlength="20" autocomplete="off" placeholder="Player name"></td></tr>
        <tr><th><label for="gamt">Amount</label></th><td><input id="gamt" type="number" name="amount" min="1" max="${Math.min(TRANSFER_MAX, Math.max(1, d.balance))}" required inputmode="numeric"> Gold <span class="small muted">(you have ${fmtNum(d.balance)})</span></td></tr>
        <tr><th><label for="gnote">Note</label></th><td><input id="gnote" type="text" name="note" maxlength="200" placeholder="optional"></td></tr>
      </tbody></table>
      <p><button type="submit">Send Gold</button> <span class="small muted">The player gets a message from you. Transfers can't be undone.</span></p>
    </form>
    <h2>Gold features</h2>
    ${PRODUCTS.map((p) => {
      const active = d.boosts.find((b) => b.source === `shop:${p.id}`);
      return html`<div class="card"><div class="cardrow"><b>${p.icon} ${p.name}</b><span class="price">${p.price} Gold</span></div>
        <div class="small">${p.description} <span class="muted">(${p.days} days)</span></div>
        ${active?.expiresAt ? html`<div class="small good">Active for ${timer(active.expiresAt, d.now, false)}</div>` : ''}
        <form method="post" action="/shop/boost">${csrfField(d.csrf)}<input type="hidden" name="product" value="${p.id}">
          <button type="submit" class="small${d.balance < p.price ? ' secondary' : ''}">${active ? 'Extend' : 'Activate'}</button></form></div>`;
    })}
    <h2>News ticker</h2>
    <div class="card"><p>Put your message on the scrolling news line at the top of every player's screen.
      <b>${config.TICKER_PRICE_PER_HOUR} Gold per hour.</b></p><a class="btn" href="/shop/ticker">Book a time slot</a></div>
    ${npcPanel(d.stock, d.capacity, d.balance, d.csrf)}
    <h2>Finish immediately</h2>
    <p class="small">Tap the <span class="btn gold small">⚡</span> button next to any construction, training or research to finish it now (2 Gold per hour left, at least 2).</p>
    <h2>Gold history</h2>
    ${d.history.length === 0
      ? html`<p class="muted small">No transactions yet.</p>`
      : html`<ul class="list">${d.history.map(
          (h) => html`<li><span class="grow">${h.reason}<span class="sub">${fmtDateTime(h.createdAt)}</span></span><b class="${h.amount > 0 ? 'good' : 'bad'}">${h.amount > 0 ? '+' : ''}${fmtNum(h.amount)}</b></li>`,
        )}</ul>`}`;
}

/** Classic NPC merchant: redistribute all resources (same total) for a small Gold fee. */
export function npcPanel(stock: Resources, capacity: Resources, balance: number, csrf: string): SafeHtml {
  const total = Math.floor(sumRes(stock));
  return html`<h2>NPC trade</h2>
    <p class="small">Trade your resources into any mix with the NPC merchant. The total stays the same: <b>${fmtNum(total)}</b>.
      Price: <b>${NPC_TRADE_PRICE} Gold</b> (you have ${fmtNum(balance)}).</p>
    <form method="post" action="/shop/npc" class="block" id="npc" data-total="${total}">${csrfField(csrf)}
      <table class="npc"><thead><tr><th></th><th>Now</th><th>New</th><th>Storage</th></tr></thead><tbody>
      ${RESOURCE_KEYS.map(
        (k) => html`<tr><td>${resIcon(k)} ${RESOURCE_LABEL[k]}</td><td class="num">${fmtNum(Math.floor(stock[k]))}</td>
          <td class="center"><label class="sr" for="n${k}">New ${RESOURCE_LABEL[k]}</label>
            <input class="npc-in" id="n${k}" type="number" name="${k}" min="0" max="${capacity[k]}" data-cap="${capacity[k]}" value="${Math.min(Math.floor(stock[k]), capacity[k])}" inputmode="numeric"></td>
          <td class="num">${fmtNum(capacity[k])}</td></tr>`,
      )}
      <tr><td><b>Rest</b></td><td class="num">${fmtNum(total)}</td><td class="center"><b id="npc-rest">0</b></td><td></td></tr>
      </tbody></table>
      <p><button type="button" id="npc-dist" class="secondary">Distribute remaining</button>
        <button type="submit">Trade (${NPC_TRADE_PRICE} Gold)</button></p>
      <p class="small muted">Anything you leave unassigned (and resources produced meanwhile) is spread over your chosen mix, so nothing is lost.</p>
    </form>`;
}

export function tickerView(d: {
  balance: number;
  slots: { start: number; used: number; free: number }[];
  mine: { id: number; body: string; startsAt: number; endsAt: number; status: string; price: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  const fmtSlot = (t: number) => {
    const iso = new Date(t).toISOString();
    return `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC`;
  };
  return html`<h1>📯 News ticker</h1>
    <p>Your message scrolls across the top of the game for <b>every player</b> during the hours you book.
      ${config.TICKER_MAX_PER_HOUR} messages can share an hour. ${config.TICKER_PRICE_PER_HOUR} credits per hour. No links.</p>
    <p class="small">Balance: ${fmtNum(d.balance)} Gold · <a href="/shop/topup">buy Gold</a></p>
    <form method="post" action="/shop/ticker">${csrfField(d.csrf)}
      <label for="tb">Message</label>
      <input id="tb" type="text" name="body" required minlength="3" maxlength="${TICKER_MAX_LENGTH}" placeholder="e.g. [RT] Round Table is recruiting!">
      <div class="row">
        <div><label for="th">Hours</label><select id="th" name="hours">${Array.from({ length: TICKER_MAX_HOURS }, (_, i) => i + 1).map(
          (h) => html`<option value="${h}">${h} h — ${h * config.TICKER_PRICE_PER_HOUR} Gold</option>`,
        )}</select></div>
      </div>
      <fieldset class="plain"><legend><b>Start time</b> <span class="small muted">(free places shown)</span></legend>
        <div class="slotgrid">${d.slots.map(
          (s, i) => html`<label class="${s.free === 0 ? 'full' : ''}"><input type="radio" name="start" value="${s.start}"${i === 0 && s.free > 0 ? html` checked` : ''}${s.free === 0 ? html` disabled` : ''}>
            ${i === 0 ? 'Now' : fmtSlot(s.start)}<br><span class="muted">${s.free} free</span></label>`,
        )}</div>
      </fieldset>
      <div class="actions"><button type="submit" class="gold">📯 Book and pay</button></div>
    </form>
    <h2>Your bookings</h2>
    ${d.mine.length === 0
      ? html`<p class="muted small">None yet.</p>`
      : html`<ul class="list">${d.mine.map(
          (m) => html`<li><span class="grow">“${m.body}”<span class="sub">${fmtSlot(m.startsAt)} → ${fmtSlot(m.endsAt)} · ${m.price} Gold
            ${m.status === 'removed' ? ' · removed by a moderator' : m.startsAt <= d.now && m.endsAt > d.now ? ' · 🔴 live now' : ''}</span></span></li>`,
        )}</ul>`}`;
}

