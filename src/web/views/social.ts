import { config } from '../../config.js';
import { TRIBES, type TribeId } from '../../game/rules/units.js';
import type { RankKind } from '../../game/queries.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, timer } from './layout.js';
import { paginate } from './parts.js';

/* ---------- Messages ---------- */

export function inboxView(d: {
  box: 'in' | 'out';
  rows: { id: number; subject: string; other: string; isRead: boolean; createdAt: number }[];
  page: number;
  hasMore: boolean;
  now: number;
}): SafeHtml {
  return html`<h1>✉️ Messages</h1>
    <nav class="tabs" aria-label="Mailbox">
      <a href="/messages" class="${d.box === 'in' ? 'on' : ''}">Inbox</a>
      <a href="/messages?box=out" class="${d.box === 'out' ? 'on' : ''}">Sent</a>
      <a href="/messages/new">✏️ Write</a>
    </nav>
    ${d.rows.length === 0
      ? html`<p class="muted">${d.box === 'in' ? 'Your inbox is empty.' : 'You have not sent any messages.'}</p>`
      : html`<ul class="list">${d.rows.map(
          (m) => html`<li class="${d.box === 'in' && !m.isRead ? 'unread' : ''}"><span class="grow"><a href="/messages/${m.id}">${m.subject}</a>
            <span class="sub">${d.box === 'in' ? 'from' : 'to'} ${m.other} · ${fmtAgo(m.createdAt, d.now)}</span></span></li>`,
        )}</ul>`}
    ${paginate(d.box === 'out' ? '/messages?box=out' : '/messages', d.page, d.hasMore)}`;
}

export function writeView(d: { to: string; subject: string; body: string; csrf: string }): SafeHtml {
  return html`<h1>✏️ New message</h1>
    <form method="post" action="/messages">
      ${csrfField(d.csrf)}
      <label for="to">To (player name)</label>
      <input id="to" type="text" name="to" value="${d.to}" required maxlength="20">
      <label for="subj">Subject</label>
      <input id="subj" type="text" name="subject" value="${d.subject}" required maxlength="80">
      <label for="body">Message</label>
      <textarea id="body" name="body" required maxlength="5000">${d.body}</textarea>
      <div class="actions"><button type="submit" class="block">Send</button></div>
    </form>
    <div class="actions"><a class="btn secondary" href="/messages">← Inbox</a></div>`;
}

export function messageView(d: {
  id: number;
  subject: string;
  body: string;
  fromName: string;
  fromId: number | null;
  toName: string;
  createdAt: number;
  canReply: boolean;
  csrf: string;
}): SafeHtml {
  const reSubject = d.subject.startsWith('Re: ') ? d.subject : `Re: ${d.subject}`;
  return html`<h1>${d.subject}</h1>
    <p class="muted small">From ${d.fromId ? html`<a href="/player/${d.fromId}">${d.fromName}</a>` : d.fromName} to ${d.toName} · ${fmtDateTime(d.createdAt)} UTC</p>
    <div class="note msgbody">${d.body}</div>
    <div class="actions">
      ${d.canReply ? html`<a class="btn" href="/messages/new?to=${encodeURIComponent(d.fromName)}&amp;subject=${encodeURIComponent(reSubject)}">↩️ Reply</a>` : ''}
      <a class="btn secondary" href="/messages">← Inbox</a>
      <form method="post" action="/messages/${d.id}/delete">${csrfField(d.csrf)}<button type="submit" class="secondary">🗑 Delete</button></form>
    </div>`;
}

/* ---------- Rankings ---------- */

const RANK_TABS: { key: RankKind; label: string; col: string }[] = [
  { key: 'population', label: 'Population', col: 'Pop.' },
  { key: 'attack', label: 'Attackers', col: 'Points' },
  { key: 'defense', label: 'Defenders', col: 'Points' },
  { key: 'raid', label: 'Raiders', col: 'Loot' },
];

export function rankingView(d: {
  kind: RankKind;
  rows: { id: number; username: string; tribe: TribeId; pop: number; villages: number; off: number; def: number; loot: number }[];
  offset: number;
  page: number;
  hasMore: boolean;
  myId: number | null;
}): SafeHtml {
  const tab = RANK_TABS.find((t) => t.key === d.kind) ?? RANK_TABS[0];
  const value = (r: (typeof d.rows)[number]) => (d.kind === 'attack' ? r.off : d.kind === 'defense' ? r.def : d.kind === 'raid' ? r.loot : r.pop);
  return html`<h1>🏆 Rankings</h1>
    <nav class="tabs" aria-label="Ranking type">${RANK_TABS.map((t) => html`<a href="/stats?k=${t.key}" class="${t.key === d.kind ? 'on' : ''}">${t.label}</a>`)}</nav>
    <div class="tblwrap"><table>
      <tr><th class="num">#</th><th>Player</th><th class="num">Villages</th><th class="num">${tab?.col ?? ''}</th></tr>
      ${d.rows.map(
        (r, i) => html`<tr class="${r.id === d.myId ? 'me' : ''}"><td class="num">${d.offset + i + 1}</td>
          <td><a href="/player/${r.id}">${r.username}</a> <span class="muted small">${TRIBES[r.tribe].icon}</span></td>
          <td class="num">${r.villages}</td><td class="num">${fmtNum(value(r))}</td></tr>`,
      )}
    </table></div>
    ${paginate(`/stats?k=${d.kind}`, d.page, d.hasMore)}`;
}

export function playerView(d: {
  user: { id: number; username: string; tribe: TribeId; createdAt: number; offPoints: number; defPoints: number; lootTotal: number; protectedUntil: number };
  villages: { id: number; name: string; x: number; y: number; pop: number; isCapital: boolean }[];
  rank: number;
  isMe: boolean;
  now: number;
}): SafeHtml {
  const t = TRIBES[d.user.tribe];
  const pop = d.villages.reduce((s, v) => s + v.pop, 0);
  return html`<h1>${t.icon} ${d.user.username}</h1>
    <ul class="list">
      <li><span class="grow">Rank <span class="sub">#${d.rank} by population</span></span></li>
      <li><span class="grow">Tribe <span class="sub">${t.name}</span></span></li>
      <li><span class="grow">Population <span class="sub">${fmtNum(pop)} in ${d.villages.length} village${d.villages.length === 1 ? '' : 's'}</span></span></li>
      <li><span class="grow">Attack / defence points <span class="sub">${fmtNum(d.user.offPoints)} / ${fmtNum(d.user.defPoints)}</span></span></li>
      <li><span class="grow">Playing since <span class="sub">${fmtDateTime(d.user.createdAt).slice(0, 10)}</span></span></li>
      ${d.user.protectedUntil > d.now ? html`<li><span class="grow">🛡️ Beginner protection <span class="sub">${timer(d.user.protectedUntil, d.now, false)} left</span></span></li>` : ''}
    </ul>
    <h2>Villages</h2>
    <ul class="list">${d.villages.map(
      (v) => html`<li><span class="grow"><a href="/map/tile?x=${v.x}&amp;y=${v.y}">${v.name}</a>${v.isCapital ? html` <span class="small">👑</span>` : ''}
        <span class="sub">${fmtNum(v.pop)} pop</span></span><span class="small muted">(${v.x}|${v.y})</span></li>`,
    )}</ul>
    ${d.isMe ? '' : html`<div class="actions"><a class="btn" href="/messages/new?to=${encodeURIComponent(d.user.username)}">✉️ Send message</a></div>`}`;
}

/* ---------- Account & help ---------- */

export function accountView(d: {
  username: string;
  tribe: TribeId;
  village: { id: number; name: string };
  protectedUntil: number;
  isAdmin: boolean;
  userId: number;
  csrf: string;
  now: number;
}): SafeHtml {
  const t = TRIBES[d.tribe];
  return html`<h1>👤 ${d.username}</h1>
    <p>${t.icon} ${t.name} — ${t.tagline}</p>
    ${d.protectedUntil > d.now ? html`<div class="note">🛡️ Beginner protection ends in ${timer(d.protectedUntil, d.now, false)}.</div>` : ''}
    <h2>Rename village</h2>
    <form method="post" action="/account/rename">
      ${csrfField(d.csrf)}
      <label for="vn">Name of ${d.village.name}</label>
      <input id="vn" type="text" name="name" value="${d.village.name}" required minlength="2" maxlength="30">
      <div class="actions"><button type="submit">Save</button></div>
    </form>
    <h2>More</h2>
    <div class="actions">
      <a class="btn secondary" href="/player/${d.userId}">Public profile</a>
      <a class="btn secondary" href="/help">Game guide</a>
    </div>`;
}

export function helpView(): SafeHtml {
  return html`<h1>📖 Game guide</h1>
    <h2>The basics</h2>
    <p>Your village has <b>18 resource fields</b> (🪵 wood, 🧱 clay, ⛓️ iron, 🌾 crop) and a <b>village center</b> with room for buildings.
      Everything produces around the clock, even while you're logged out.</p>
    <h2>Good first steps</h2>
    <ul class="list">
      <li><span class="grow">1. Upgrade all resource fields to level 1–2, croplands too.</span></li>
      <li><span class="grow">2. Build a <b>Warehouse</b> and <b>Granary</b> so production doesn't stop when storage is full.</span></li>
      <li><span class="grow">3. Upgrade the <b>Main Building</b>; every level builds faster.</span></li>
      <li><span class="grow">4. Build a <b>Cranny</b> to hide resources from raiders before your protection ends.</span></li>
      <li><span class="grow">5. Build a <b>Rally Point</b> and <b>Barracks</b>, then train troops.</span></li>
    </ul>
    <h2>Crop and your army</h2>
    <p>Every citizen and every soldier eats crop each hour. If your crop production goes below zero, your granary slowly empties. Keep upgrading croplands as your army grows.</p>
    <h2>Fighting</h2>
    <ul class="list">
      <li><span class="grow"><b>Raid</b>: grab resources and retreat. Both sides lose fewer troops.</span></li>
      <li><span class="grow"><b>Attack</b>: fight to the end. Rams knock down walls, catapults damage buildings.</span></li>
      <li><span class="grow"><b>Scout</b>: send scouts to see resources and troops. Defending scouts can catch them.</span></li>
      <li><span class="grow"><b>Reinforce</b>: station your troops in a friend's village to defend it.</span></li>
    </ul>
    <p>Infantry and cavalry are defended against differently. Check each unit's 🛡️ numbers (vs infantry / vs cavalry) when choosing defenders.</p>
    <h2>This world</h2>
    <p>Speed x${config.WORLD_SPEED}. New players are protected for ${config.PROTECTION_HOURS} hours. The map wraps around at the edges.</p>`;
}

