import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField } from './layout.js';

export function adminView(d: {
  stats: { players: number; online: number; villages: number; creditsIssued: number; deposits: number; indexerBlock: string };
  announcement: string;
  players: { id: number; username: string; role: string; banned: boolean; mutedUntil: number; lastSeenAt: number; credits: number; villages: number }[];
  query: string;
  ticker: { t: { id: number; body: string; startsAt: number; endsAt: number; price: number }; username: string | null }[];
  csrf: string;
  now: number;
}): SafeHtml {
  return html`<h1>🛡️ Admin</h1>
    <div class="stats">
      <div><b>${fmtNum(d.stats.players)}</b>players</div>
      <div><b>${fmtNum(d.stats.online)}</b>online</div>
      <div><b>${fmtNum(d.stats.villages)}</b>villages</div>
      <div><b>${fmtNum(d.stats.creditsIssued)}</b>Gold issued</div>
      <div><b>${fmtNum(d.stats.deposits)}</b>deposits</div>
      <div><b>${d.stats.indexerBlock}</b>indexer block</div>
    </div>
    <h2>📣 Announcement</h2>
    <form method="post" action="/admin/announcement">${csrfField(d.csrf)}
      <label for="ann" class="sr">Announcement</label>
      <input id="ann" type="text" name="text" value="${d.announcement}" maxlength="200" placeholder="Shown on the news ticker for everyone (empty = off)">
      <div class="actions"><button type="submit">Publish</button></div>
    </form>
    <h2>👥 Players</h2>
    <form method="get" action="/admin" class="row"><div><label for="aq" class="sr">Search</label><input id="aq" type="text" name="q" value="${d.query}" placeholder="Search name"></div><div><button type="submit" class="block">Search</button></div></form>
    ${d.players.map(
      (p) => html`<div class="card">
        <div class="cardrow"><b><a href="/player/${p.id}">${p.username}</a>${p.role === 'admin' ? ' 🛡️' : ''}${p.banned ? html` <span class="bad">BANNED</span>` : ''}${p.mutedUntil > d.now ? html` <span class="warn">muted</span>` : ''}</b>
          <span class="small muted">${fmtNum(p.credits)} Gold · ${p.villages} v. · ${fmtAgo(p.lastSeenAt, d.now)}</span></div>
        <div class="actions">
          <form method="post" action="/admin/ban" class="inline">${csrfField(d.csrf)}<input type="hidden" name="userId" value="${p.id}"><input type="hidden" name="ban" value="${p.banned ? '0' : '1'}">
            <button type="submit" class="small ${p.banned ? 'secondary' : 'danger'}">${p.banned ? 'Unban' : 'Ban'}</button></form>
          <form method="post" action="/admin/mute" class="inline">${csrfField(d.csrf)}<input type="hidden" name="userId" value="${p.id}"><input type="hidden" name="hours" value="${p.mutedUntil > d.now ? 0 : 24}">
            <button type="submit" class="small secondary">${p.mutedUntil > d.now ? 'Unmute' : 'Mute 24h'}</button></form>
          <form method="post" action="/admin/credits" class="inline">${csrfField(d.csrf)}<input type="hidden" name="userId" value="${p.id}">
            <label class="sr" for="cr${p.id}">Gold for ${p.username}</label><input id="cr${p.id}" class="tiny" type="number" name="amount" placeholder="± Gold" inputmode="numeric">
            <button type="submit" class="small gold">Gold</button></form>
        </div></div>`,
    )}
    <h2>📯 Ticker queue</h2>
    ${d.ticker.length === 0
      ? html`<p class="muted small">No booked messages.</p>`
      : html`<ul class="list">${d.ticker.map(
          (t) => html`<li><span class="grow">“${t.t.body}” <span class="sub">${t.username ?? '?'} · ${fmtDateTime(t.t.startsAt)} → ${fmtDateTime(t.t.endsAt)} · ${t.t.price} Gold</span></span>
            <form method="post" action="/admin/ticker/remove">${csrfField(d.csrf)}<input type="hidden" name="id" value="${t.t.id}"><button type="submit" class="small danger">Remove</button></form></li>`,
        )}</ul>`}`;
}
