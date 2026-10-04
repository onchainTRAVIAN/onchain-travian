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
  { key: 'population', label: 'Players', col: 'Population' },
  { key: 'attack', label: 'Attackers', col: 'Points' },
  { key: 'defense', label: 'Defenders', col: 'Points' },
  { key: 'raid', label: 'Robbers', col: 'Resources robbed' },
];

const extraTabs = (on: string) =>
  html`<a href="/stats/week" class="${on === 'week' ? 'on' : ''}">This week</a><a href="/endgame">Artifacts &amp; Wonders</a><a href="/stats/villages" class="${on === 'villages' ? 'on' : ''}">Villages</a><a href="/stats/heroes" class="${on === 'heroes' ? 'on' : ''}">Heroes</a><a href="/alliances">Alliances</a>`;

function statsTabs(on: string): SafeHtml {
  return html`<nav class="tabs" aria-label="Ranking type">${RANK_TABS.map((t) => html`<a href="/stats?k=${t.key}" class="${t.key === on ? 'on' : ''}">${t.label}</a>`)}${extraTabs(on)}</nav>`;
}

const MEDAL = ['gold', 'silver', 'bronze'] as const;

function medalImg(rank: number, size = 20): SafeHtml {
  const m = MEDAL[rank - 1] ?? 'bronze';
  return html`<img src="/static/img/medals/${m}.svg" width="${size}" height="${size}" alt="${m} medal" title="${m} medal">`;
}

export function weeklyView(d: {
  category: WeeklyCategory;
  rows: WeeklyRow[];
  weekStart: number;
  now: number;
  myId: number | null;
  winners: { weekStart: number; rows: { category: WeeklyCategory; rank: number; value: number; prize: number; userId: number; username: string }[] } | null;
}): SafeHtml {
  const end = d.weekStart + WEEK_MS;
  const lab = WEEKLY_LABEL[d.category];
  return html`<h1>Statistics</h1>${statsTabs('week')}
    <p class="tabs">${WEEKLY_CATEGORIES.map((c) => html`<a href="/stats/week?c=${c}" class="${c === d.category ? 'on' : ''}">${WEEKLY_LABEL[c].tab}</a>`)}</p>
    <p class="small">Week of ${new Date(d.weekStart).toISOString().slice(0, 10)} · ends in ${timer(end, d.now, false)} (Monday 00:00 UTC).
      The top 3 of every category win a medal and ${medalImg(1, 14)} ${WEEKLY_PRIZES[0]} / ${medalImg(2, 14)} ${WEEKLY_PRIZES[1]} / ${medalImg(3, 14)} ${WEEKLY_PRIZES[2]} Gold.</p>
    <div class="tblwrap"><table><thead><tr><th class="num">#</th><th>Player</th><th class="num">${lab.col}</th><th>Prize</th></tr></thead><tbody>
    ${d.rows.length === 0
      ? html`<tr><td colspan="4" class="none center">Nobody has scored this week yet. Be the first!</td></tr>`
      : d.rows.map(
          (r, i) => html`<tr class="${r.userId === d.myId ? 'me' : ''}"><td class="num">${i + 1}</td>
            <td><img class="avatar sm" src="${avatarUrl({ id: r.userId, tribe: r.tribe, avatarAt: r.avatarAt })}" width="20" height="20" alt=""> <a href="/player/${r.userId}">${r.username}</a></td>
            <td class="num">${fmtNum(r.value)}</td>
            <td>${i < 3 ? html`${medalImg(i + 1)} ${WEEKLY_PRIZES[i]} Gold` : ''}</td></tr>`,
        )}
    </tbody></table></div>
    ${d.winners
      ? html`<h2>Winners of the week of ${new Date(d.winners.weekStart).toISOString().slice(0, 10)}</h2>
        <div class="tblwrap"><table><thead><tr><th>Category</th><th>Winners</th></tr></thead><tbody>
        ${WEEKLY_CATEGORIES.map((c) => {
          const w = d.winners?.rows.filter((r) => r.category === c) ?? [];
          return html`<tr><td>${WEEKLY_LABEL[c].tab}</td><td>${w.length === 0
            ? html`<span class="none">-</span>`
            : w.map((r) => html`<span class="nowrap">${medalImg(r.rank)} <a href="/player/${r.userId}">${r.username}</a> <span class="small muted">(${fmtNum(r.value)})</span></span> `)}</td></tr>`;
        })}
        </tbody></table></div>`
      : ''}`;
}

export function villageRankingView(d: { rows: { id: number; name: string; x: number; y: number; pop: number; owner: string | null; ownerId: number | null }[]; offset: number; page: number; hasMore: boolean }): SafeHtml {
  return html`<h1>Statistics</h1>${statsTabs('villages')}
    <table class="tb"><thead><tr><th class="num">#</th><th>Village</th><th>Player</th><th class="num">Population</th><th>Coordinates</th></tr></thead><tbody>
    ${d.rows.map(
      (r, i) => html`<tr><td class="num">${d.offset + i + 1}.</td><td><a href="/map/tile?x=${r.x}&amp;y=${r.y}">${r.name}</a></td>
        <td>${r.ownerId ? html`<a href="/player/${r.ownerId}">${r.owner}</a>` : '-'}</td><td class="num">${fmtNum(r.pop)}</td><td>(${r.x}|${r.y})</td></tr>`,
    )}</tbody></table>${paginate('/stats/villages', d.page, d.hasMore)}`;
}

export function heroRankingView(d: { rows: { name: string; level: number; xp: number; owner: string; ownerId: number; tribe: TribeId }[]; offset: number; page: number; hasMore: boolean }): SafeHtml {
  return html`<h1>Statistics</h1>${statsTabs('heroes')}
    <table class="tb"><thead><tr><th class="num">#</th><th>Hero</th><th>Player</th><th class="num">Level</th><th class="num">Experience</th></tr></thead><tbody>
    ${d.rows.map(
      (r, i) => html`<tr><td class="num">${d.offset + i + 1}.</td><td>${r.name}</td><td><a href="/player/${r.ownerId}">${r.owner}</a></td>
        <td class="num">${r.level}</td><td class="num">${fmtNum(r.xp)}</td></tr>`,
    )}</tbody></table>${paginate('/stats/heroes', d.page, d.hasMore)}`;
}

export function rankingView(d: {
  kind: RankKind;
  rows: { id: number; username: string; tribe: TribeId; pop: number; villages: number; off: number; def: number; loot: number; avatarAt: number }[];
  offset: number;
  page: number;
  hasMore: boolean;
  myId: number | null;
}): SafeHtml {
  const tab = RANK_TABS.find((t) => t.key === d.kind) ?? RANK_TABS[0];
  const value = (r: (typeof d.rows)[number]) => (d.kind === 'attack' ? r.off : d.kind === 'defense' ? r.def : d.kind === 'raid' ? r.loot : r.pop);
  return html`<h1>Statistics</h1>
    ${statsTabs(d.kind)}
    ${d.kind === 'raid' ? html`<p class="small muted">Total resources each player has carried home from raids and attacks on villages and oases.</p>` : ''}
    <div class="tblwrap"><table>
      <tr><th class="num">#</th><th>Player</th><th class="num">Villages</th><th class="num">${tab?.col ?? ''}</th></tr>
      ${d.rows.map(
        (r, i) => html`<tr class="${r.id === d.myId ? 'me' : ''}"><td class="num">${d.offset + i + 1}</td>
          <td><img class="avatar sm" src="${avatarUrl({ id: r.id, tribe: r.tribe, avatarAt: r.avatarAt })}" width="20" height="20" alt=""> <a href="/player/${r.id}">${r.username}</a> <span class="muted small">${TRIBES[r.tribe].name}</span></td>
          <td class="num">${r.villages}</td><td class="num">${fmtNum(value(r))}</td></tr>`,
      )}
    </table></div>
    ${paginate(`/stats?k=${d.kind}`, d.page, d.hasMore)}`;
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

