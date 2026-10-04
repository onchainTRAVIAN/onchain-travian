import { config } from '../../config.js';
import { NPC_TRADE_PRICE, PRODUCTS, TICKER_MAX_HOURS, TICKER_MAX_LENGTH } from '../../game/actions/credits.js';
import { RESOURCE_ICON, RESOURCE_KEYS, sumRes, type Resources } from '../../game/rules/resources.js';
import { fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, timer } from './layout.js';

export function shopView(d: {
  balance: number;
  boosts: { source: string; expiresAt: number | null }[];
  stock: Resources;
  capacity: Resources;
  history: { amount: number; reason: string; createdAt: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  const total = Math.floor(sumRes(d.stock));
  const even = Math.floor(total / 4);
  return html`<h1>Plus &amp; Gold</h1>
    <div class="card cardrow"><span>Your balance</span><span class="price">${fmtNum(d.balance)} Gold</span>
      <a class="btn gold" href="/shop/topup">Buy Gold</a></div>
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
    <h2>NPC merchant <span class="muted small">${NPC_TRADE_PRICE} Gold</span></h2>
    <p class="small muted">Swap your resources into any mix instantly (same total: ${fmtNum(total)}).</p>
    <form method="post" action="/shop/npc">${csrfField(d.csrf)}
      <div class="row">${RESOURCE_KEYS.map(
        (k) => html`<div><label for="n${k}">${RESOURCE_ICON[k]} <span class="small muted">max ${fmtNum(d.capacity[k])}</span></label>
          <input id="n${k}" type="number" name="${k}" min="0" max="${d.capacity[k]}" value="${Math.min(even, d.capacity[k])}" inputmode="numeric"></div>`,
      )}</div>
      <div class="actions"><button type="submit">Exchange</button></div>
    </form>
    <h2>Finish immediately</h2>
    <p class="small">Tap the <span class="btn gold small">⚡</span> button next to any construction, training or research to finish it now (2 Gold per hour left, at least 2).</p>
    <h2>Gold history</h2>
    ${d.history.length === 0
      ? html`<p class="muted small">No transactions yet.</p>`
      : html`<ul class="list">${d.history.map(
          (h) => html`<li><span class="grow">${h.reason}<span class="sub">${fmtDateTime(h.createdAt)}</span></span><b class="${h.amount > 0 ? 'good' : 'bad'}">${h.amount > 0 ? '+' : ''}${fmtNum(h.amount)}</b></li>`,
        )}</ul>`}`;
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

