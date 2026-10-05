import { NAME_CHANGE_PRICE } from '../../game/actions/account.js';
import type { AllianceRankKind } from '../../game/actions/alliance.js';
import { config } from '../../config.js';
import { TRIBES, type TribeId } from '../../game/rules/units.js';
import type { RankKind } from '../../game/queries.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, timer } from './layout.js';
import { avatarUrl } from '../../game/actions/avatar.js';
import { WEEK_MS, WEEKLY_CATEGORIES, WEEKLY_LABEL, WEEKLY_PRIZES, type MedalView, type WeeklyCategory, type WeeklyRow } from '../../game/actions/weekly.js';
import { paginate } from './parts.js';

/* ---------- Messages ---------- */

export function inboxView(d: {
  box: 'in' | 'out';
  rows: { id: number; subject: string; other: string; isRead: boolean; createdAt: number }[];
  page: number;
  hasMore: boolean;
  now: number;
  csrf: string;
}): SafeHtml {
  return html`<h1>✉️ Messages</h1>
    <nav class="tabs" aria-label="Mailbox">
      <a href="/messages" class="${d.box === 'in' ? 'on' : ''}">Inbox</a>
      <a href="/messages?box=out" class="${d.box === 'out' ? 'on' : ''}">Sent</a>
      <a href="/messages/new">✏️ Write</a>
    </nav>
    ${d.rows.length === 0
      ? html`<p class="muted">${d.box === 'in' ? 'Your inbox is empty.' : 'You have not sent any messages.'}</p>`
      : html`<form method="post" action="/messages/bulk" class="bulk">${csrfField(d.csrf)}<input type="hidden" name="box" value="${d.box}">
        <table class="tb"><thead><tr><th class="chk"><label class="sr" for="chkall">Select all</label><input type="checkbox" id="chkall" data-checkall title="Select all"></th><th>Subject</th><th>${d.box === 'in' ? 'From' : 'To'}</th><th>Sent</th></tr></thead><tbody>${d.rows.map(
          (m) => html`<tr class="${d.box === 'in' && !m.isRead ? 'unread' : ''}"><td class="chk"><label class="sr" for="m${m.id}">Select</label><input type="checkbox" id="m${m.id}" name="ids" value="${m.id}"></td>
            <td><a href="/messages/${m.id}">${m.subject}</a>${d.box === 'in' && !m.isRead ? html` <span class="small bad">(new)</span>` : ''}</td><td>${m.other}</td><td class="nowrap">${fmtAgo(m.createdAt, d.now)}</td></tr>`,
        )}</tbody></table>
        <p class="bulkbar"><button type="submit" name="act" value="delete" class="small">Delete selected</button>
          ${d.box === 'in'
            ? html`<button type="submit" name="act" value="read" class="small secondary">Mark selected as read</button>
              <span class="sep"></span><button type="submit" name="act" value="readall" class="small secondary">Mark all as read</button>`
            : ''}</p>
        </form>`}
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

const RANK_TABS: { key: RankKind; label: string; title: string; col: string }[] = [
  { key: 'population', label: 'Overview', title: 'The largest players', col: 'Population' },
  { key: 'attack', label: 'Attackers', title: 'The most successful attackers', col: 'Points' },
  { key: 'defense', label: 'Defenders', title: 'The most successful defenders', col: 'Points' },
  { key: 'raid', label: 'Robbers', title: 'The greatest robbers', col: 'Resources' },
];

/** Statistics navigation: folder tabs, plus the player sub-tabs underneath. */
function statsTabs(main: 'players' | 'alliances' | 'villages' | 'heroes' | 'week', sub?: string): SafeHtml {
  const t = (href: string, on: boolean, label: string) => html`<a href="${href}" class="${on ? 'on' : ''}"${on ? html` aria-current="page"` : ''}>${label}</a>`;
  const subNav =
    main === 'players'
      ? html`<nav class="fsub" aria-label="Ranking">${RANK_TABS.map((r) => t(`/stats?k=${r.key}`, r.key === sub, r.label))}</nav>`
      : main === 'alliances'
        ? html`<nav class="fsub" aria-label="Ranking">${ALLY_TABS.map((r) => t(`/alliances?k=${r.key}`, r.key === sub, r.label))}</nav>`
        : html`<div class="fsub empty"></div>`;
  return html`<nav class="ftabs" aria-label="Statistics">${t('/stats', main === 'players', 'Players')}${t('/alliances', main === 'alliances', 'Alliances')}${t('/stats/villages', main === 'villages', 'Villages')}${t('/stats/heroes', main === 'heroes', 'Heroes')}${t('/stats/week', main === 'week', 'Top 10')}${t('/endgame', false, 'Wonders')}</nav>
    ${subNav}`;
}

const ALLY_TABS: { key: AllianceRankKind; label: string; title: string; col: string }[] = [
  { key: 'population', label: 'Overview', title: 'The largest alliances', col: 'Population' },
  { key: 'attack', label: 'Attackers', title: 'The most successful attacking alliances', col: 'Points' },
  { key: 'defense', label: 'Defenders', title: 'The most successful defending alliances', col: 'Points' },
];

/** A small shield bearing the alliance tag (drawn inline, so no image file is needed). */
function allyShield(tag: string, rank: number, size: number): SafeHtml {
  const fill = rank === 1 ? '#c9a227' : rank === 2 ? '#9aa1ab' : rank === 3 ? '#b07a45' : '#71a83a';
  const t = tag.slice(0, 8);
  const fs = t.length <= 3 ? 11.5 : t.length <= 5 ? 9 : 7;
  return html`<svg class="ashield" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true">
    <path d="M20 2 L37 8 V22 C37 34 29 41 20 44 C11 41 3 34 3 22 V8 Z" fill="${fill}" stroke="#4a3b17" stroke-width="2"></path>
    <path d="M20 6 L33 10.5 V22 C33 31.5 27 37 20 39.6 C13 37 7 31.5 7 22 V10.5 Z" fill="#fbfaf5" opacity="0.92"></path>
    <text x="20" y="${24 + fs / 3}" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-weight="bold" font-size="${fs}" fill="#3a3010">${t}</text></svg>`;
}

export function allianceRankingView(d: {
  kind: AllianceRankKind;
  rows: { id: number; name: string; tag: string; members: number; pop: number; off: number; def: number }[];
  leaders: { id: number; name: string; tag: string; members: number; pop: number; off: number; def: number }[];
  offset: number;
  page: number;
  hasMore: boolean;
  mine: { id: number; rank: number; total: number; tag: string; value: number } | null;
  perPage: number;
}): SafeHtml {
  const tab = ALLY_TABS.find((x) => x.key === d.kind) ?? ALLY_TABS[0];
  const value = (r: (typeof d.rows)[number]) => (d.kind === 'attack' ? r.off : d.kind === 'defense' ? r.def : r.pop);
  const unit = d.kind === 'population' ? 'inhabitants' : 'points';
  const top = d.leaders[0] ? value(d.leaders[0]) : 0;
  const myPage = d.mine ? Math.ceil(d.mine.rank / d.perPage) : 1;
  const fame = d.leaders.slice(0, 3);
  return html`<h1>Statistics</h1>${statsTabs('alliances', d.kind)}
    ${fame.length
      ? html`<div class="fame">${[1, 0, 2].filter((i) => fame[i]).map((i) => {
          const r = fame[i] as (typeof d.rows)[number];
          return html`<a class="plaque r${i + 1}" href="/alliance/${r.id}"><span class="medal">${medalImg(i + 1, i === 0 ? 30 : 24)}</span>
            ${allyShield(r.tag, i + 1, i === 0 ? 50 : 42)}
            <b class="nm">${r.name}</b><span class="sb"><span class="atag">${r.tag}</span> · ${r.members} member${r.members === 1 ? '' : 's'}</span>
            <span class="vl"><b>${fmtNum(value(r))}</b> ${unit}</span></a>`;
        })}</div>`
      : ''}
    ${d.mine
      ? html`<div class="mebar spanel">${allyShield(d.mine.tag, d.mine.rank, 20)}<span>Your alliance <b>${d.mine.tag}</b> is <b>${fmtNum(d.mine.rank)}.</b> of ${fmtNum(d.mine.total)} with <b>${fmtNum(d.mine.value)}</b> ${unit}</span>
          ${d.page !== myPage ? html`<a href="/alliances?k=${d.kind}&amp;page=${myPage}#myally">show its place</a>` : ''}</div>`
      : ''}
    <table class="ranks"><thead><tr><th colspan="5">${tab?.title ?? ''}</th></tr>
      <tr><td></td><td>Alliance</td><td>Members</td><td>Ø per member</td><td>${tab?.col ?? ''}</td></tr></thead><tbody>
      ${d.rows.length === 0
        ? html`<tr><td colspan="5" class="none center">No alliances yet — found one at the Embassy (level 3).</td></tr>`
        : d.rows.map(
            (r, i) => html`<tr class="${r.id === d.mine?.id ? 'hl' : ''}"${r.id === d.mine?.id ? html` id="myally"` : ''}>${rankCell(d.offset + i + 1)}
              <td class="pla">${allyShield(r.tag, d.offset + i + 1, 16)} <a href="/alliance/${r.id}">${r.name}</a> <span class="atag">${r.tag}</span></td>
              <td class="num">${r.members}</td><td class="num">${fmtNum(r.members ? Math.round(value(r) / r.members) : 0)}</td>
              <td class="val">${fmtNum(value(r))}${vbar(value(r), top)}</td></tr>`,
          )}
    </tbody></table>
    ${rankFoot(html``, pager(`/alliances?k=${d.kind}`, d.page, d.hasMore))}`;
}

/** "Rank / Name" search under a ranking, like the original. */
function rankSearch(action: string, kind?: string): SafeHtml {
  return html`<form method="get" action="${action}" class="ranksearch">${kind ? html`<input type="hidden" name="k" value="${kind}">` : ''}
    <label>Rank <input type="number" name="rank" min="1" class="w30" inputmode="numeric"></label>
    <label>Name <input type="text" name="name" maxlength="20" class="w120"></label>
    <button type="submit" class="small">Find</button></form>`;
}

function pager(base: string, page: number, hasMore: boolean): SafeHtml {
  if (page <= 1 && !hasMore) return html``;
  const sep = base.includes('?') ? '&' : '?';
  return html`<span class="pager">${page > 1 ? html`<a href="${base}${sep}page=${page - 1}">« back</a>` : html`<span class="none">« back</span>`} | ${hasMore ? html`<a href="${base}${sep}page=${page + 1}">forward »</a>` : html`<span class="none">forward »</span>`}</span>`;
}

function rankFoot(form: SafeHtml, pages: SafeHtml): SafeHtml {
  return html`<div class="rankfoot">${form}${pages}</div>`;
}

/** Thin bar under a value, relative to the leader (SVG works under the CSP). */
function vbar(value: number, top: number): SafeHtml {
  if (top <= 0) return html``;
  const w = Math.max(1, Math.round((value / top) * 100));
  return html`<svg class="vbar" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="3" class="bg"></rect><rect width="${w}" height="3" class="fg"></rect></svg>`;
}

function rankCell(rank: number): SafeHtml {
  return rank <= 3 ? html`<td class="ra top">${medalImg(rank, 18)}</td>` : html`<td class="ra">${rank}.</td>`;
}

function tribeMark(tribe: TribeId): SafeHtml {
  return tribe === 'nature' ? html`` : html`<img src="/static/img/units/${tribe}-1.svg" width="14" height="14" alt="${TRIBES[tribe].name}" title="${TRIBES[tribe].name}" class="tmark">`;
}

interface Plaque { href: string; name: string; avatar: string; sub: SafeHtml; value: string; label: string }
/** The top three on plaques, second–first–third. */
function hallOfFame(entries: Plaque[]): SafeHtml {
  if (entries.length === 0) return html``;
  return html`<div class="fame">${[1, 0, 2].filter((i) => entries[i]).map((i) => {
    const e = entries[i] as Plaque;
    return html`<a class="plaque r${i + 1}" href="${e.href}"><span class="medal">${medalImg(i + 1, i === 0 ? 30 : 24)}</span>
      <img class="av" src="${e.avatar}" width="${i === 0 ? 54 : 44}" height="${i === 0 ? 54 : 44}" alt="">
      <b class="nm">${e.name}</b><span class="sb">${e.sub}</span><span class="vl"><b>${e.value}</b> ${e.label}</span></a>`;
  })}</div>`;
}

const MEDAL = ['gold', 'silver', 'bronze'] as const;

function medalImg(rank: number, size = 20): SafeHtml {
  const m = MEDAL[rank - 1] ?? 'bronze';
  return html`<img src="/static/img/medals/${m}.svg" width="${size}" height="${size}" alt="${m} medal" title="${m} medal">`;
}

export function weeklyView(d: {
  standings: { category: WeeklyCategory; rows: WeeklyRow[] }[];
  weekStart: number;
  now: number;
  myId: number | null;
  winners: { weekStart: number; rows: { category: WeeklyCategory; rank: number; value: number; prize: number; userId: number; username: string }[] } | null;
}): SafeHtml {
  const end = d.weekStart + WEEK_MS;
  const box = (c: WeeklyCategory, rows: WeeklyRow[]) => html`<section class="spanel topbox"><h3 class="sp-head">${WEEKLY_LABEL[c].title}<span>${WEEKLY_LABEL[c].col}</span></h3>
    ${rows.length === 0
      ? html`<p class="none small center">Nobody yet — be the first.</p>`
      : html`<ol class="toplist">${rows.map(
          (r, i) => html`<li class="${r.userId === d.myId ? 'me' : ''}"><span class="rk">${i < 3 ? medalImg(i + 1, 16) : `${i + 1}.`}</span>
            <img class="av" src="${avatarUrl({ id: r.userId, tribe: r.tribe, avatarAt: r.avatarAt })}" width="18" height="18" alt="">
            <a href="/player/${r.userId}">${r.username}</a><b>${fmtNum(r.value)}</b></li>`,
        )}</ol>`}</section>`;
  return html`<h1>Statistics</h1>${statsTabs('week')}
    <div class="weekbar spanel"><span>Week of <b>${new Date(d.weekStart).toISOString().slice(0, 10)}</b> · ends in <b>${timer(end, d.now, false)}</b> (Monday 00:00 UTC)</span>
      <span class="prizes">${medalImg(1, 16)} ${WEEKLY_PRIZES[0]} ${medalImg(2, 16)} ${WEEKLY_PRIZES[1]} ${medalImg(3, 16)} ${WEEKLY_PRIZES[2]} Gold</span></div>
    <div class="topgrid">${d.standings.map((st) => box(st.category, st.rows))}</div>
    ${d.winners
      ? html`<section class="spanel lastweek"><h3 class="sp-head">Medals of the week of ${new Date(d.winners.weekStart).toISOString().slice(0, 10)}</h3>
        <table class="plain"><tbody>${WEEKLY_CATEGORIES.map((c) => {
          const w = d.winners?.rows.filter((r) => r.category === c) ?? [];
          return html`<tr><th>${WEEKLY_LABEL[c].title}</th><td>${w.length === 0
            ? html`<span class="none">-</span>`
            : w.map((r) => html`<span class="nowrap">${medalImg(r.rank, 14)} <a href="/player/${r.userId}">${r.username}</a> <span class="small muted">(${fmtNum(r.value)})</span></span> `)}</td></tr>`;
        })}</tbody></table></section>`
      : ''}`;
}

export function villageRankingView(d: { rows: { id: number; name: string; x: number; y: number; pop: number; owner: string | null; ownerId: number | null }[]; offset: number; page: number; hasMore: boolean; myId?: number | null; top?: number }): SafeHtml {
  const top = d.top ?? (d.page === 1 ? d.rows[0]?.pop ?? 0 : 0);
  return html`<h1>Statistics</h1>${statsTabs('villages')}
    <table class="ranks"><thead><tr><th colspan="4">The largest villages</th></tr><tr><td></td><td>Village</td><td>Player</td><td>Population</td></tr></thead><tbody>
    ${d.rows.map(
      (r, i) => html`<tr class="${r.ownerId !== null && r.ownerId === d.myId ? 'hl' : ''}">${rankCell(d.offset + i + 1)}
        <td class="vil"><a href="/map/tile?x=${r.x}&amp;y=${r.y}">${r.name}</a> <span class="co">(${r.x}|${r.y})</span></td>
        <td class="pla">${r.ownerId ? html`<a href="/player/${r.ownerId}">${r.owner}</a>` : '-'}</td><td class="val">${fmtNum(r.pop)}${vbar(r.pop, top)}</td></tr>`,
    )}</tbody></table>
    ${rankFoot(html``, pager('/stats/villages', d.page, d.hasMore))}`;
}

export function heroRankingView(d: { rows: { name: string; level: number; xp: number; owner: string; ownerId: number; tribe: TribeId }[]; offset: number; page: number; hasMore: boolean; myId?: number | null }): SafeHtml {
  const top = d.page === 1 ? d.rows[0]?.xp ?? 0 : 0;
  return html`<h1>Statistics</h1>${statsTabs('heroes')}
    <table class="ranks"><thead><tr><th colspan="5">The most experienced heroes</th></tr><tr><td></td><td>Hero</td><td>Player</td><td>Level</td><td>Experience</td></tr></thead><tbody>
    ${d.rows.length === 0
      ? html`<tr><td colspan="5" class="none center">No heroes yet.</td></tr>`
      : d.rows.map(
          (r, i) => html`<tr class="${r.ownerId === d.myId ? 'hl' : ''}">${rankCell(d.offset + i + 1)}<td class="pla"><img src="/static/img/units/hero.svg" width="16" height="16" alt="" class="tmark"> ${r.name}</td>
            <td class="pla"><a href="/player/${r.ownerId}">${r.owner}</a> ${tribeMark(r.tribe)}</td><td class="num">${r.level}</td><td class="val">${fmtNum(r.xp)}${vbar(r.xp, top)}</td></tr>`,
        )}</tbody></table>
    ${rankFoot(html``, pager('/stats/heroes', d.page, d.hasMore))}`;
}

export function rankingView(d: {
  kind: RankKind;
  rows: { id: number; username: string; tribe: TribeId; pop: number; villages: number; off: number; def: number; loot: number; avatarAt: number; allianceId: number | null; allianceTag: string | null }[];
  offset: number;
  page: number;
  hasMore: boolean;
  myId: number | null;
  findId?: number | null;
  /** The top three (for the hall of fame) and the leader's value (for bars). */
  leaders: { id: number; username: string; tribe: TribeId; pop: number; villages: number; off: number; def: number; loot: number; avatarAt: number; allianceId: number | null; allianceTag: string | null }[];
  me: { rank: number; value: number; total: number; page: number; username: string; avatar: string } | null;
}): SafeHtml {
  const tab = RANK_TABS.find((t) => t.key === d.kind) ?? RANK_TABS[0];
  const value = (r: (typeof d.rows)[number]) => (d.kind === 'attack' ? r.off : d.kind === 'defense' ? r.def : d.kind === 'raid' ? r.loot : r.pop);
  const top = d.leaders[0] ? value(d.leaders[0]) : 0;
  const unit = d.kind === 'population' ? 'inhabitants' : d.kind === 'raid' ? 'resources' : 'points';
  const isPop = d.kind === 'population';
  return html`<h1>Statistics</h1>
    ${statsTabs('players', d.kind)}
    ${hallOfFame(d.leaders.slice(0, 3).map((r) => ({
      href: `/player/${r.id}`,
      name: r.username,
      avatar: avatarUrl({ id: r.id, tribe: r.tribe, avatarAt: r.avatarAt }),
      sub: html`${tribeMark(r.tribe)} ${TRIBES[r.tribe].name}${r.allianceTag ? html` · <span class="atag">${r.allianceTag}</span>` : ''}`,
      value: fmtNum(value(r)),
      label: unit,
    })))}
    ${d.me
      ? html`<div class="mebar spanel"><img class="av" src="${d.me.avatar}" width="22" height="22" alt=""><span>You are <b>${fmtNum(d.me.rank)}.</b> of ${fmtNum(d.me.total)} with <b>${fmtNum(d.me.value)}</b> ${unit}</span>
          ${d.page !== d.me.page || d.findId ? html`<a href="/stats?k=${d.kind}&amp;page=${d.me.page}#me">show my place</a>` : ''}</div>`
      : ''}
    <table class="ranks"><thead><tr><th colspan="5">${tab?.title ?? ''}</th></tr>
      <tr><td></td><td>Player</td><td>Alliance</td>${isPop ? html`<td>Population</td><td>Villages</td>` : html`<td>Population</td><td>${tab?.col ?? ''}</td>`}</tr></thead><tbody>
      ${d.rows.length === 0
        ? html`<tr><td colspan="5" class="none center">No players yet.</td></tr>`
        : d.rows.map(
            (r, i) => html`<tr class="${r.id === d.myId ? 'hl' : ''}${r.id === d.findId ? ' found' : ''}"${r.id === d.myId ? html` id="me"` : r.id === d.findId ? html` id="found"` : ''}>${rankCell(d.offset + i + 1)}
              <td class="pla"><img class="av" src="${avatarUrl({ id: r.id, tribe: r.tribe, avatarAt: r.avatarAt })}" width="20" height="20" alt=""> <a href="/player/${r.id}">${r.username}</a> ${tribeMark(r.tribe)}</td>
              <td class="al">${r.allianceId && r.allianceTag ? html`<a href="/alliance/${r.allianceId}" class="atag">${r.allianceTag}</a>` : html`<span class="none">-</span>`}</td>
              ${isPop
                ? html`<td class="val">${fmtNum(r.pop)}${vbar(r.pop, top)}</td><td class="num">${r.villages}</td>`
                : html`<td class="num">${fmtNum(r.pop)}</td><td class="val">${fmtNum(value(r))}${vbar(value(r), top)}</td>`}</tr>`,
          )}
    </tbody></table>
    ${rankFoot(rankSearch('/stats', d.kind), pager(`/stats?k=${d.kind}`, d.page, d.hasMore))}`;
}

export interface ProfileUser {
  id: number;
  username: string;
  tribe: TribeId;
  createdAt: number;
  lastSeenAt: number;
  offPoints: number;
  defPoints: number;
  lootTotal: number;
  protectedUntil: number;
  avatarAt: number;
  bio: string;
}

function avatarImg(u: { id: number; tribe: string; avatarAt: number }, size: number, cls = 'avatar'): SafeHtml {
  return html`<img class="${cls}" src="${avatarUrl(u)}" width="${size}" height="${size}" alt="">`;
}

export function playerView(d: {
  user: ProfileUser;
  villages: { id: number; name: string; x: number; y: number; pop: number; isCapital: boolean }[];
  rank: number;
  alliance: { id: number; tag: string; name: string } | null;
  heroLevel: number | null;
  medals: MedalView[];
  isMe: boolean;
  now: number;
}): SafeHtml {
  const t = TRIBES[d.user.tribe];
  const pop = d.villages.reduce((s, v) => s + v.pop, 0);
  const topPop = Math.max(1, ...d.villages.map((v) => v.pop));
  const tile = (label: string, value: string, sub?: string) => html`<div class="spanel tile"><span class="lbl">${label}</span><b>${value}</b>${sub ? html`<span class="sub">${sub}</span>` : ''}</div>`;
  const villages = [...d.villages].sort((a, b) => Number(b.isCapital) - Number(a.isCapital) || b.pop - a.pop);
  return html`<div class="spanel pcardx">
      <img class="pav" src="${avatarUrl(d.user)}" width="96" height="96" alt="">
      <div class="pmain">
        <div class="pnm">${d.user.username}${d.isMe ? html` <span class="pyou">you</span>` : ''}</div>
        <div class="psub"><img src="/static/img/units/${d.user.tribe}-1.svg" width="16" height="16" alt=""> ${t.name}
          ${d.alliance ? html` · <a href="/alliance/${d.alliance.id}" class="atag" title="${d.alliance.name}">${d.alliance.tag}</a> <span class="muted">${d.alliance.name}</span>` : html` · <span class="muted">no alliance</span>`}</div>
        <div class="pchips"><span class="chip">Rank <b>${d.rank}.</b></span><span class="chip">Playing since ${fmtDateTime(d.user.createdAt).slice(0, 10)}</span>
          ${d.user.protectedUntil > d.now ? html`<span class="chip prot">Protected ${timer(d.user.protectedUntil, d.now, false)}</span>` : ''}
          ${d.medals.length ? html`<span class="chip">${medalImg(Math.min(...d.medals.map((m) => m.rank)), 14)} ${d.medals.length} medal${d.medals.length === 1 ? '' : 's'}</span>` : ''}</div>
      </div>
      <div class="pacts">${d.isMe
        ? html`<a class="btn small secondary" href="/account">Edit profile</a>`
        : html`<a class="btn small" href="/messages/new?to=${encodeURIComponent(d.user.username)}">Message</a>
          <a class="btn small secondary" href="/shop?to=${encodeURIComponent(d.user.username)}#gold">Send Gold</a>`}</div>
    </div>
    <div class="pstats">
      ${tile('Population', fmtNum(pop))}
      ${tile('Villages', String(d.villages.length))}
      ${tile('Attack', fmtNum(d.user.offPoints))}
      ${tile('Defence', fmtNum(d.user.defPoints))}
      ${tile('Raided', fmtNum(d.user.lootTotal))}
      ${tile('Hero', d.heroLevel !== null ? `level ${d.heroLevel}` : '-')}
    </div>
    ${d.user.bio ? html`<section class="spanel pabout"><h3 class="sp-head">About ${d.user.username}</h3><div class="msgbody">${d.user.bio}</div></section>` : ''}
    ${d.medals.length
      ? html`<section class="spanel pmedals"><h3 class="sp-head">Medals<span>${d.medals.length}</span></h3><div class="medalgrid">
        ${d.medals.map(
          (m) => html`<div class="medal r${m.rank}">${medalImg(m.rank, 30)}<b>${WEEKLY_LABEL[m.category].title}</b>
            <span class="small muted">place ${m.rank} · week of ${new Date(m.weekStart).toISOString().slice(0, 10)}</span><span class="small">${fmtNum(m.value)}</span></div>`,
        )}</div></section>`
      : ''}
    <table class="ranks"><thead><tr><th colspan="3">Villages</th></tr><tr><td>Village</td><td>Population</td><td>Coordinates</td></tr></thead><tbody>
    ${villages.map(
      (v) => html`<tr><td class="pla"><a href="/map/tile?x=${v.x}&amp;y=${v.y}">${v.name}</a>${v.isCapital ? html` <span class="vcap">capital</span>` : ''}</td>
        <td class="val">${fmtNum(v.pop)}${vbar(v.pop, topPop)}</td><td class="center"><a href="/map?x=${v.x}&amp;y=${v.y}">(${v.x}|${v.y})</a></td></tr>`,
    )}</tbody></table>`;
}

/* ---------- Account & help ---------- */

export function accountView(d: {
  username: string;
  tribe: TribeId;
  village: { id: number; name: string };
  protectedUntil: number;
  isAdmin: boolean;
  userId: number;
  avatarAt: number;
  bio: string;
  csrf: string;
  now: number;
}): SafeHtml {
  const t = TRIBES[d.tribe];
  const me = { id: d.userId, tribe: d.tribe, avatarAt: d.avatarAt };
  return html`<h1>Profile</h1>
    <div class="profile">
      <div class="pcard">${avatarImg(me, 128, 'avatar big')}
        <div class="pname">${d.username}</div>
        <div class="ptribe"><img src="/static/img/units/${d.tribe}-1.svg" width="16" height="16" alt=""> ${t.name}</div></div>
      <div class="pedit">
        <h2>Profile picture</h2>
        <form method="post" action="/account/avatar?_csrf=${encodeURIComponent(d.csrf)}" enctype="multipart/form-data" class="block">
          <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp,image/gif" required>
          <button type="submit">Upload</button>
          <p class="small muted">JPG, PNG, WebP or GIF up to 5 MB. It is cropped to a square and compressed automatically.</p>
        </form>
        ${d.avatarAt > 0
          ? html`<form method="post" action="/account/avatar/remove">${csrfField(d.csrf)}<button type="submit" class="small secondary">Use my tribe picture instead</button></form>`
          : html`<p class="small muted">You are using the ${t.name} picture.</p>`}
      </div>
    </div>
    ${d.protectedUntil > d.now ? html`<p class="note">Beginner’s protection ends in ${timer(d.protectedUntil, d.now, false)}.</p>` : ''}
    <h2>About me</h2>
    <form method="post" action="/account/bio" class="block">${csrfField(d.csrf)}
      <textarea name="bio" maxlength="500" rows="5" aria-label="About me">${d.bio}</textarea>
      <p><button type="submit">Save</button> <span class="small muted">Shown on your public profile (max 500 characters).</span></p>
    </form>
    <h2>Change your player name</h2>
    <form method="post" action="/account/name" class="block">${csrfField(d.csrf)}
      <input type="text" name="name" value="${d.username}" required minlength="3" maxlength="20" aria-label="New player name">
      <button type="submit" class="gold" data-confirm="Change your name for ${NAME_CHANGE_PRICE} Gold?">Change for ${NAME_CHANGE_PRICE} Gold</button>
      <p class="small muted">Your new name shows everywhere (rankings, reports, chat). Letters, numbers, spaces, dots, dashes and underscores, 3–20 characters.</p>
    </form>
    <h2>Rename village</h2>
    <form method="post" action="/account/rename" class="block">${csrfField(d.csrf)}
      <input id="vn" type="text" name="name" value="${d.village.name}" required minlength="2" maxlength="30" aria-label="Village name">
      <button type="submit">Save</button>
    </form>
    <p><a href="/player/${d.userId}">» Public profile</a> | <a href="/wallet">» Wallet &amp; token perks</a>${d.isAdmin ? html` | <a href="/admin">» Admin</a>` : ''}</p>`;
}


