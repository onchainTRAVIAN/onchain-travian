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

/** Classic statistics navigation: main tabs, plus the player sub-tabs. */
function statsTabs(main: 'players' | 'villages' | 'heroes' | 'week', sub?: RankKind): SafeHtml {
  const t = (href: string, on: boolean, label: string) => html`<a href="${href}" class="${on ? 'on' : ''}">${label}</a>`;
  return html`<p class="tabs">${t('/stats', main === 'players', 'Players')}${t('/alliances', false, 'Alliances')}${t('/stats/villages', main === 'villages', 'Villages')}${t('/stats/heroes', main === 'heroes', 'Heroes')}${t('/stats/week', main === 'week', 'Top 10')}${t('/endgame', false, 'Wonders')}</p>
    ${main === 'players' ? html`<p class="tabs subtabs">${RANK_TABS.map((r) => t(`/stats?k=${r.key}`, r.key === sub, r.label))}</p>` : ''}`;
}

/** "Rank / Name" search under a ranking, like the original. */
function rankSearch(action: string, kind?: string): SafeHtml {
  return html`<form method="get" action="${action}" class="ranksearch">${kind ? html`<input type="hidden" name="k" value="${kind}">` : ''}
    <label>Rank <input type="number" name="rank" min="1" class="w30" inputmode="numeric"></label>
    <label>Name <input type="text" name="name" maxlength="20" class="w120"></label>
    <button type="submit" class="small">OK</button></form>`;
}

function pager(base: string, page: number, hasMore: boolean): SafeHtml {
  if (page <= 1 && !hasMore) return html``;
  const sep = base.includes('?') ? '&' : '?';
  return html`<span class="pager">${page > 1 ? html`<a href="${base}${sep}page=${page - 1}">« back</a>` : html`<span class="none">« back</span>`} | ${hasMore ? html`<a href="${base}${sep}page=${page + 1}">forward »</a>` : html`<span class="none">forward »</span>`}</span>`;
}

function rankFoot(form: SafeHtml, pages: SafeHtml): SafeHtml {
  return html`<div class="rankfoot">${form}${pages}</div>`;
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
  const box = (c: WeeklyCategory, rows: WeeklyRow[]) => html`<table class="top10">
    <thead><tr><th colspan="3">${WEEKLY_LABEL[c].title}</th></tr><tr><td></td><td>Player</td><td>${WEEKLY_LABEL[c].col}</td></tr></thead><tbody>
    ${rows.length === 0
      ? html`<tr><td colspan="3" class="none center">nobody yet</td></tr>`
      : rows.map(
          (r, i) => html`<tr class="${r.userId === d.myId ? 'hl' : ''}"><td class="ra">${i < 3 ? medalImg(i + 1, 14) : `${i + 1}.`}</td>
            <td class="pla"><a href="/player/${r.userId}">${r.username}</a></td><td class="num">${fmtNum(r.value)}</td></tr>`,
        )}
    </tbody></table>`;
  return html`<h1>Statistics</h1>${statsTabs('week')}
    <p class="small">Week of ${new Date(d.weekStart).toISOString().slice(0, 10)}, ends in ${timer(end, d.now, false)} (Monday 00:00 UTC).
      The best three of each list get a medal and ${WEEKLY_PRIZES[0]} / ${WEEKLY_PRIZES[1]} / ${WEEKLY_PRIZES[2]} Gold.</p>
    <div class="top10grid">${d.standings.map((st) => box(st.category, st.rows))}</div>
    ${d.winners
      ? html`<table class="ranks"><thead><tr><th colspan="2">Medals of the week of ${new Date(d.winners.weekStart).toISOString().slice(0, 10)}</th></tr></thead><tbody>
        ${WEEKLY_CATEGORIES.map((c) => {
          const w = d.winners?.rows.filter((r) => r.category === c) ?? [];
          return html`<tr><td class="lbl">${WEEKLY_LABEL[c].title}</td><td>${w.length === 0
            ? html`<span class="none">-</span>`
            : w.map((r) => html`<span class="nowrap">${medalImg(r.rank, 14)} <a href="/player/${r.userId}">${r.username}</a> <span class="small muted">(${fmtNum(r.value)})</span></span> `)}</td></tr>`;
        })}
        </tbody></table>`
      : ''}`;
}

export function villageRankingView(d: { rows: { id: number; name: string; x: number; y: number; pop: number; owner: string | null; ownerId: number | null }[]; offset: number; page: number; hasMore: boolean; myId?: number | null }): SafeHtml {
  return html`<h1>Statistics</h1>${statsTabs('villages')}
    <table class="ranks"><thead><tr><th colspan="4">The largest villages</th></tr><tr><td></td><td>Village</td><td>Player</td><td>Population</td></tr></thead><tbody>
    ${d.rows.map(
      (r, i) => html`<tr class="${r.ownerId !== null && r.ownerId === d.myId ? 'hl' : ''}"><td class="ra">${d.offset + i + 1}.</td>
        <td class="vil"><a href="/map/tile?x=${r.x}&amp;y=${r.y}">${r.name}</a> <span class="small muted">(${r.x}|${r.y})</span></td>
        <td class="pla">${r.ownerId ? html`<a href="/player/${r.ownerId}">${r.owner}</a>` : '-'}</td><td class="num">${fmtNum(r.pop)}</td></tr>`,
    )}</tbody></table>
    ${rankFoot(html``, pager('/stats/villages', d.page, d.hasMore))}`;
}

export function heroRankingView(d: { rows: { name: string; level: number; xp: number; owner: string; ownerId: number; tribe: TribeId }[]; offset: number; page: number; hasMore: boolean; myId?: number | null }): SafeHtml {
  return html`<h1>Statistics</h1>${statsTabs('heroes')}
    <table class="ranks"><thead><tr><th colspan="5">The most experienced heroes</th></tr><tr><td></td><td>Hero</td><td>Player</td><td>Level</td><td>Experience</td></tr></thead><tbody>
    ${d.rows.length === 0
      ? html`<tr><td colspan="5" class="none center">No heroes yet.</td></tr>`
      : d.rows.map(
          (r, i) => html`<tr class="${r.ownerId === d.myId ? 'hl' : ''}"><td class="ra">${d.offset + i + 1}.</td><td>${r.name}</td>
            <td class="pla"><a href="/player/${r.ownerId}">${r.owner}</a></td><td class="num">${r.level}</td><td class="num">${fmtNum(r.xp)}</td></tr>`,
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
  /** Row to mark, e.g. after a name/rank search. */
  findId?: number | null;
}): SafeHtml {
  const tab = RANK_TABS.find((t) => t.key === d.kind) ?? RANK_TABS[0];
  const value = (r: (typeof d.rows)[number]) => (d.kind === 'attack' ? r.off : d.kind === 'defense' ? r.def : d.kind === 'raid' ? r.loot : r.pop);
  const isPop = d.kind === 'population';
  return html`<h1>Statistics</h1>
    ${statsTabs('players', d.kind)}
    <table class="ranks"><thead><tr><th colspan="5">${tab?.title ?? ''}</th></tr>
      <tr><td></td><td>Player</td><td>Alliance</td>${isPop ? html`<td>Population</td><td>Villages</td>` : html`<td>Population</td><td>${tab?.col ?? ''}</td>`}</tr></thead><tbody>
      ${d.rows.length === 0
        ? html`<tr><td colspan="5" class="none center">No players yet.</td></tr>`
        : d.rows.map(
            (r, i) => html`<tr class="${r.id === d.myId ? 'hl' : ''}${r.id === d.findId ? ' found' : ''}"${r.id === d.findId ? html` id="found"` : ''}><td class="ra">${d.offset + i + 1}.</td>
              <td class="pla"><a href="/player/${r.id}">${r.username}</a></td>
              <td class="al">${r.allianceId && r.allianceTag ? html`<a href="/alliance/${r.allianceId}">${r.allianceTag}</a>` : '-'}</td>
              ${isPop ? html`<td class="num">${fmtNum(r.pop)}</td><td class="num">${r.villages}</td>` : html`<td class="num">${fmtNum(r.pop)}</td><td class="num">${fmtNum(value(r))}</td>`}</tr>`,
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
  return html`<h1>Player profile</h1>
    <div class="profile">
      <div class="pcard">
        ${avatarImg(d.user, 128, 'avatar big')}
        <div class="pname">${d.user.username}</div>
        <div class="ptribe"><img src="/static/img/units/${d.user.tribe}-1.svg" width="16" height="16" alt=""> ${t.name}</div>
      </div>
      <table class="pdetails"><thead><tr><th colspan="2">Details</th></tr></thead><tbody>
        <tr><th>Rank</th><td>${d.rank}.</td></tr>
        <tr><th>Tribe</th><td>${t.name}</td></tr>
        <tr><th>Alliance</th><td>${d.alliance ? html`<a href="/alliance/${d.alliance.id}">[${d.alliance.tag}] ${d.alliance.name}</a>` : html`<span class="none">-</span>`}</td></tr>
        <tr><th>Villages</th><td>${d.villages.length}</td></tr>
        <tr><th>Population</th><td>${fmtNum(pop)}</td></tr>
        <tr><th>Attack points</th><td>${fmtNum(d.user.offPoints)}</td></tr>
        <tr><th>Defence points</th><td>${fmtNum(d.user.defPoints)}</td></tr>
        <tr><th>Resources raided</th><td>${fmtNum(d.user.lootTotal)}</td></tr>
        ${d.heroLevel !== null ? html`<tr><th>Hero</th><td>level ${d.heroLevel}</td></tr>` : ''}
        <tr><th>Playing since</th><td>${fmtDateTime(d.user.createdAt).slice(0, 10)}</td></tr>
        ${d.user.protectedUntil > d.now ? html`<tr><th>Protection</th><td>${timer(d.user.protectedUntil, d.now, false)}</td></tr>` : ''}
      </tbody></table>
    </div>
    ${d.medals.length
      ? html`<h2>Medals</h2><div class="tblwrap"><table><thead><tr><th></th><th>Title</th><th>Week</th><th class="num">Score</th></tr></thead><tbody>
        ${d.medals.map(
          (m) => html`<tr><td>${medalImg(m.rank, 24)}</td><td>${WEEKLY_LABEL[m.category].title} <span class="small muted">(place ${m.rank})</span></td>
            <td>${new Date(m.weekStart).toISOString().slice(0, 10)}</td><td class="num">${fmtNum(m.value)}</td></tr>`,
        )}</tbody></table></div>`
      : ''}
    ${d.user.bio ? html`<div class="pbio"><b>About:</b><div class="msgbody">${d.user.bio}</div></div>` : ''}
    <table><thead><tr><th>Villages</th><th>Population</th><th>Coordinates</th></tr></thead><tbody>
    ${d.villages.map(
      (v) => html`<tr><td><a href="/map/tile?x=${v.x}&amp;y=${v.y}">${v.name}</a>${v.isCapital ? html` <span class="c2 small">(capital)</span>` : ''}</td>
        <td class="num">${fmtNum(v.pop)}</td><td class="center">(${v.x}|${v.y})</td></tr>`,
    )}</tbody></table>
    <p>${d.isMe ? html`<a href="/account">» Edit profile</a>` : html`<a href="/messages/new?to=${encodeURIComponent(d.user.username)}">» Write message</a> | <a href="/shop?to=${encodeURIComponent(d.user.username)}#gold">» Send Gold</a>`}</p>`;
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
    <h2>Rename village</h2>
    <form method="post" action="/account/rename" class="block">${csrfField(d.csrf)}
      <input id="vn" type="text" name="name" value="${d.village.name}" required minlength="2" maxlength="30" aria-label="Village name">
      <button type="submit">Save</button>
    </form>
    <p><a href="/player/${d.userId}">» Public profile</a> | <a href="/wallet">» Wallet &amp; token perks</a>${d.isAdmin ? html` | <a href="/admin">» Admin</a>` : ''}</p>`;
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
    <h2>Growing your empire</h2>
    <ul class="list">
      <li><span class="grow">🦸 <b>Hero</b>: joins your attacks, gains experience and skill points. Put points into strength, bonuses or resources.</span></li>
      <li><span class="grow">📜 <b>Academy &amp; Smithy</b>: research new units, then upgrade them for +1.5% per level.</span></li>
      <li><span class="grow">🌴 <b>Oases</b>: clear the animals with your hero to capture an oasis (Hero's Mansion level 10+) for bonus production.</span></li>
      <li><span class="grow">🧺 <b>New villages</b>: collect culture points, build a Residence to level 10, train 3 settlers and send them to an empty valley. Chiefs can take over enemy villages.</span></li>
      <li><span class="grow">🐫 <b>Marketplace</b>: send resources to friends or trade on the market.</span></li>
      <li><span class="grow">🤝 <b>Alliances</b>: join with an Embassy, found one at Embassy level 3, chat privately and sign treaties.</span></li>
      <li><span class="grow">💰 <b>Plus &amp; Gold</b>: Gold buys boosts, instant finishing and news-ticker messages. Holding the game token gives permanent perks.</span></li>
    </ul>
    <h2>This world</h2>
    <p>Speed x${config.WORLD_SPEED}. New players are protected for ${config.PROTECTION_HOURS} hours. The map wraps around at the edges.</p>`;
}

