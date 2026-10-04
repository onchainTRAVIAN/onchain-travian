import { TRIBES, type TribeId } from '../../game/rules/units.js';
import { ALLIANCE_FOUND_PRICE, type AllianceRow, type Role } from '../../game/actions/alliance.js';
import { fmtAgo, fmtClock, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField } from './layout.js';
import { avatarUrl } from '../../game/actions/avatar.js';

/* ---------- Alliance ---------- */

interface MemberRow {
  userId: number;
  username: string;
  tribe: TribeId;
  role: Role;
  lastSeenAt: number;
  avatarAt: number;
  pop: number;
  villages: number;
}

interface DiploRow {
  id: number;
  kind: 'confed' | 'nap' | 'war';
  status: 'proposed' | 'active';
  otherId: number;
  otherTag: string;
  otherName: string;
  incoming: boolean;
}

const DIPLO_LABEL = { confed: '🤝 Confederacy', nap: '🕊️ Non-aggression pact', war: '⚔️ War' } as const;
const ROLE_LABEL: Record<Role, string> = { leader: '👑 Leader', officer: '⭐ Officer', member: 'Member' };

export function noAllianceView(d: {
  invites: { a: AllianceRow; createdAt: number }[];
  canFound: boolean;
  top: { id: number; name: string; tag: string; members: number; pop: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  return html`<h1>🤝 Alliance</h1>
    <p>Alliances let players defend each other, chat privately and plan wars together.</p>
    <h2>Invitations</h2>
    ${d.invites.length === 0
      ? html`<p class="muted small">No invitations yet. Ask an alliance leader to invite you (you need an Embassy to join).</p>`
      : html`<ul class="list">${d.invites.map(
          (i) => html`<li><span class="grow"><a href="/alliance/${i.a.id}">[${i.a.tag}] ${i.a.name}</a><span class="sub">${fmtAgo(i.createdAt, d.now)}</span></span>
            <form method="post" action="/alliance/accept" class="inline">${csrfField(d.csrf)}<input type="hidden" name="allianceId" value="${i.a.id}"><button type="submit" class="small">Join</button></form>
            <form method="post" action="/alliance/decline" class="inline">${csrfField(d.csrf)}<input type="hidden" name="allianceId" value="${i.a.id}"><button type="submit" class="small secondary">✕</button></form></li>`,
        )}</ul>`}
    <h2>Found an alliance</h2>
    ${d.canFound
      ? html`<form method="post" action="/alliance/create">
          ${csrfField(d.csrf)}
          <label for="an">Name</label><input id="an" type="text" name="name" required minlength="3" maxlength="40">
          <label for="at">Tag (short name)</label><input id="at" type="text" name="tag" required minlength="2" maxlength="8" pattern="[A-Za-z0-9_\\-]{2,8}">
          <div class="actions"><button type="submit">Found alliance (${ALLIANCE_FOUND_PRICE} Gold)</button></div>
          <p class="small muted">Founding an alliance costs ${ALLIANCE_FOUND_PRICE} Gold. <a href="/shop">Buy Gold »</a></p>
        </form>`
      : html`<p class="muted small">You need an Embassy at level 3 to found an alliance (price: ${ALLIANCE_FOUND_PRICE} Gold).</p>`}
    <h2>Top alliances</h2>
    ${allianceTable(d.top, 0)}`;
}

export function allianceTable(rows: { id: number; name: string; tag: string; members: number; pop: number }[], offset: number): SafeHtml {
  if (rows.length === 0) return html`<p class="muted small">No alliances yet. Be the first!</p>`;
  return html`<div class="tblwrap"><table>
    <tr><th class="num">#</th><th>Alliance</th><th class="num">Members</th><th class="num">Pop.</th></tr>
    ${rows.map(
      (r, i) => html`<tr><td class="num">${offset + i + 1}</td><td><a href="/alliance/${r.id}">[${r.tag}]</a> ${r.name}</td><td class="num">${r.members}</td><td class="num">${fmtNum(r.pop)}</td></tr>`,
    )}
  </table></div>`;
}

export function allianceView(d: {
  alliance: AllianceRow;
  members: MemberRow[];
  myRole: Role | null;
  capacity: number;
  diplomacy: DiploRow[];
  csrf: string;
  now: number;
}): SafeHtml {
  const a = d.alliance;
  const isMine = d.myRole !== null;
  const canManage = d.myRole === 'leader' || d.myRole === 'officer';
  const totalPop = d.members.reduce((s, m) => s + m.pop, 0);
  return html`<h1>[${a.tag}] ${a.name}</h1>
    <p class="muted small">${d.members.length}/${d.capacity} members · ${fmtNum(totalPop)} population</p>
    ${a.description ? html`<div class="note msgbody">${a.description}</div>` : ''}
    ${isMine ? html`<div class="actions"><a class="btn" href="/chat?c=alliance">💬 Alliance chat</a></div>` : ''}
    <h2>Members</h2>
    <ul class="list">${d.members.map(
      (m) => html`<li><img class="avatar sm" src="${avatarUrl({ id: m.userId, tribe: m.tribe, avatarAt: m.avatarAt })}" width="24" height="24" alt=""><span class="grow"><a href="/player/${m.userId}">${m.username}</a> <span class="small muted">${TRIBES[m.tribe].name}</span>
        <span class="sub">${ROLE_LABEL[m.role]} · ${fmtNum(m.pop)} pop · ${m.villages} village${m.villages === 1 ? '' : 's'}</span></span>
        ${canManage && m.role !== 'leader'
          ? html`<form method="post" action="/alliance/kick" class="inline">${csrfField(d.csrf)}<input type="hidden" name="userId" value="${m.userId}"><button type="submit" class="small secondary" aria-label="Remove ${m.username}">✕</button></form>`
          : ''}
        ${d.myRole === 'leader' && m.role !== 'leader'
          ? html`<form method="post" action="/alliance/role" class="inline">${csrfField(d.csrf)}<input type="hidden" name="userId" value="${m.userId}">
              <select name="role" aria-label="Role for ${m.username}"><option value="member"${m.role === 'member' ? html` selected` : ''}>Member</option><option value="officer"${m.role === 'officer' ? html` selected` : ''}>Officer</option><option value="leader">Make leader</option></select>
              <button type="submit" class="small secondary">Set</button></form>`
          : ''}</li>`,
    )}</ul>
    <h2>Diplomacy</h2>
    ${d.diplomacy.length === 0
      ? html`<p class="muted small">No treaties.</p>`
      : html`<ul class="list">${d.diplomacy.map(
          (t) => html`<li><span class="grow">${DIPLO_LABEL[t.kind]} with <a href="/alliance/${t.otherId}">[${t.otherTag}]</a>
            <span class="sub">${t.status === 'proposed' ? (t.incoming ? 'They propose — waiting for your answer' : 'Waiting for their answer') : 'Active'}</span></span>
            ${canManage && t.status === 'proposed' && t.incoming
              ? html`<form method="post" action="/alliance/diplomacy/answer" class="inline">${csrfField(d.csrf)}<input type="hidden" name="id" value="${t.id}"><input type="hidden" name="accept" value="1"><button type="submit" class="small">Accept</button></form>`
              : ''}
            ${canManage
              ? html`<form method="post" action="/alliance/diplomacy/answer" class="inline">${csrfField(d.csrf)}<input type="hidden" name="id" value="${t.id}"><input type="hidden" name="accept" value="0"><button type="submit" class="small secondary">${t.status === 'active' ? 'End' : 'Decline'}</button></form>`
              : ''}</li>`,
        )}</ul>`}
    ${canManage
      ? html`<h2>Manage</h2>
        <form method="post" action="/alliance/invite" class="row">${csrfField(d.csrf)}
          <div><label for="inv">Invite player</label><input id="inv" type="text" name="username" required maxlength="20" placeholder="Player name"></div>
          <div><label>&nbsp;</label><button type="submit" class="block">Invite</button></div>
        </form>
        <form method="post" action="/alliance/diplomacy" class="row">${csrfField(d.csrf)}
          <div><label for="dt">Alliance tag</label><input id="dt" type="text" name="tag" required maxlength="8"></div>
          <div><label for="dk">Treaty</label><select id="dk" name="kind"><option value="nap">Non-aggression pact</option><option value="confed">Confederacy</option><option value="war">Declare war</option></select></div>
          <div><label>&nbsp;</label><button type="submit" class="block">Propose</button></div>
        </form>
        <form method="post" action="/alliance/description">${csrfField(d.csrf)}
          <label for="ad">Description</label><textarea id="ad" name="description" maxlength="2000">${a.description}</textarea>
          <div class="actions"><button type="submit">Save description</button></div>
        </form>`
      : ''}
    ${isMine
      ? html`<form method="post" action="/alliance/leave" class="actions">${csrfField(d.csrf)}<button type="submit" class="danger small">Leave alliance</button></form>`
      : ''}`;
}

/* ---------- Chat ---------- */

export interface ChatLine {
  id: number;
  body: string;
  createdAt: number;
  userId: number;
  username: string;
  role: 'player' | 'admin';
}

export function chatLines(lines: ChatLine[], now: number, isAdmin: boolean, csrf: string): SafeHtml {
  if (lines.length === 0) return html`<li class="muted">No messages yet. Say hello!</li>`;
  return html`${lines.map(
    (l) => html`<li class="${l.role === 'admin' ? 'admin' : ''}"><a class="who" href="/player/${l.userId}">${l.role === 'admin' ? '🛡️ ' : ''}${l.username}</a><span class="when" title="${fmtAgo(l.createdAt, now)}">${fmtClock(l.createdAt).slice(0, 5)}</span>
      ${isAdmin ? html`<form method="post" action="/admin/chat/delete" class="inline">${csrfField(csrf)}<input type="hidden" name="id" value="${l.id}"><button type="submit" class="small secondary" aria-label="Delete message">🗑</button></form>` : ''}
      <br>${l.body}</li>`,
  )}`;
}

export function chatView(d: { channel: 'global' | 'alliance'; allianceTag: string | null; lines: ChatLine[]; isAdmin: boolean; csrf: string; now: number; muted: boolean }): SafeHtml {
  return html`<h1>💬 Chat</h1>
    <nav class="tabs" aria-label="Chat channel">
      <a href="/chat" class="${d.channel === 'global' ? 'on' : ''}">🌍 World</a>
      ${d.allianceTag ? html`<a href="/chat?c=alliance" class="${d.channel === 'alliance' ? 'on' : ''}">🤝 [${d.allianceTag}]</a>` : ''}
    </nav>
    ${d.muted
      ? html`<p class="warn small">You are muted in chat for now.</p>`
      : html`<form method="post" action="/chat" class="row" id="chatform">${csrfField(d.csrf)}
          <input type="hidden" name="c" value="${d.channel}">
          <div class="grow"><label for="cm" class="sr">Message</label><input id="cm" type="text" name="body" maxlength="300" required placeholder="Write a message…" autocomplete="off"></div>
          <div class="shrink"><button type="submit">Send</button></div>
        </form>`}
    <ul class="chatlog" id="chatlog" data-feed="/chat/feed?c=${d.channel}" aria-live="polite">${chatLines(d.lines, d.now, d.isAdmin, d.csrf)}</ul>
    <p class="small muted">Be nice. Newest messages first; the chat refreshes by itself.</p>`;
}
