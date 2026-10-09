import type { TaskStatus } from '../../game/actions/tasks.js';
import { taskPanel } from './tasks.js';
import { assetUrl, hasAsset, pic } from '../assets.js';
import { config } from '../../config.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, type Resources } from '../../game/rules/resources.js';
import type { Economy, VillageRow } from '../../game/engine/state.js';
import type { UserRow } from '../../game/actions/account.js';
import type { Flash } from '../session.js';
import { fmtClock, fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { avatarUrl } from '../../game/actions/avatar.js';
import { TRIBES, type TribeId } from '../../game/rules/units.js';
import { help } from './tips.js';

export interface Chrome {
  user: UserRow;
  village: VillageRow;
  villages: { id: number; name: string; x: number; y: number; pop: number; isCapital?: boolean }[];
  eco: Economy;
  unread: { reports: number; messages: number };
  credits: number;
  heroAlert: boolean;
  /** Short notices for the Info box (protection, incoming attacks, hero, boosts…). */
  notices?: { kind: 'good' | 'warn' | 'bad' | 'info'; text: SafeHtml | string; href?: string }[];
  /** Beginner tasks: the current one and how many rewards wait (null when hidden). */
  tasks?: { current: TaskStatus | null; claimable: number; total: number; done: number } | null;
}

export interface TickerItem {
  body: string;
  username: string | null;
}

export type NavKey =
  | 'fields'
  | 'village'
  | 'map'
  | 'troops'
  | 'train'
  | 'hero'
  | 'reports'
  | 'messages'
  | 'chat'
  | 'alliance'
  | 'stats'
  | 'shop'
  | 'goldmarket'
  | 'wallet'
  | 'admin'
  | 'help'
  | 'account';

export interface PageOpts {
  title: string;
  body: SafeHtml;
  now: number;
  csrf: string;
  flash?: Flash | null;
  chrome?: Chrome | null;
  nav?: NavKey;
  ticker?: TickerItem[];
  announcement?: string | null;
}

/** <img> for one of the game's SVG icons. */
export function icon(path: string, alt: string, w = 16, h = w): SafeHtml {
  return html`<img src="${pic(`img/${path}`)}" width="${w}" height="${h}" alt="${alt}" title="${alt}">`;
}

/** Classic 18×12 resource icon. */
export function resIcon(k: keyof Resources): SafeHtml {
  return icon(`res/${k}`, RESOURCE_LABEL[k], 18, 12);
}

function tickerBar(items: TickerItem[], announcement: string | null | undefined): SafeHtml {
  const all: SafeHtml[] = [];
  if (announcement) all.push(html`<span class="tk-item tk-sys">${announcement}</span>`);
  for (const t of items) all.push(html`<span class="tk-item"><b>${t.username ?? 'Herald'}:</b> ${t.body}</span>`);
  if (all.length === 0) return html``;
  return html`<div class="ticker" role="marquee" aria-label="News">
    <span class="tk-label">${icon('menu/news', '', 14)} News</span>
    <div class="tk-view"><div class="tk-track"><span class="tk-set">${all}</span><span class="tk-set tk-dup" aria-hidden="true">${all}</span></div></div>
    <a class="tk-buy" href="/shop/ticker" title="Post your own message on the news ticker">+ Post</a>
  </div>`;
}

/** Grey button picture plus its colour version (shown on hover and for the open page), if drawn. */
function navImg(img: string, w: number, label: string): SafeHtml {
  const colour = hasAsset(`img/nav/${img}-c.svg`);
  return html`<img class="g" src="/static/img/nav/${img}.svg" width="${w}" height="67" alt="${label}">${colour ? html`<img class="c" src="/static/img/nav/${img}-c.svg" width="${w}" height="67" alt="">` : ''}`;
}

function topNav(active: NavKey | undefined, c: Chrome | null | undefined): SafeHtml {
  if (!c) return html``;
  const n = (key: NavKey, href: string, img: string, label: string) =>
    html`<a class="n${key === active ? ' on' : ''}" href="${href}" title="${label}"${key === active ? html` aria-current="page"` : ''}>${navImg(img, 70, label)}</a>`;
  return html`<nav id="mtop" aria-label="Main">
    ${n('fields', '/fields', 'dorf1', 'Village overview')}
    ${n('village', '/village', 'dorf2', 'Village centre')}
    ${n('map', '/map', 'map', 'Map')}
    ${n('stats', '/stats', 'stats', 'Statistics')}
    <a class="half rep${active === 'reports' ? ' on' : ''}" href="/reports" title="Reports">${navImg('reports', 35, 'Reports')}${c.unread.reports ? html`<span class="badge">${c.unread.reports}</span>` : ''}</a>
    <a class="half msg${active === 'messages' ? ' on' : ''}" href="/messages" title="Messages">${navImg('messages', 35, 'Messages')}${c.unread.messages ? html`<span class="badge">${c.unread.messages}</span>` : ''}</a>
    <a class="n plus${active === 'shop' ? ' on' : ''}" href="/shop" title="Plus &amp; Gold">${navImg('plus', 70, 'Plus')}</a>
  </nav>`;
}

function resourceBar(v: VillageRow, eco: Economy, now: number, credits: number): SafeHtml {
  const stock: Resources = { wood: v.wood, clay: v.clay, iron: v.iron, crop: v.crop };
  return html`<div id="res"><table><tr>
    ${RESOURCE_KEYS.map((k, i) => {
      const full = eco.net[k] >= 0 && stock[k] >= eco.capacity[k];
      return html`<td><a href="/production#${k}" class="resl" title="${RESOURCE_LABEL[k]}: where production comes from">${resIcon(k)}</a></td><td class="${full ? 'full' : ''}" title="${RESOURCE_LABEL[k]}: ${fmtNum(eco.net[k])} per hour"><a href="/production#${k}" class="plain"><span data-amount="${stock[k]}" data-rate="${eco.net[k]}" data-cap="${eco.capacity[k]}" data-at="${now}">${fmtNum(stock[k])}</span>/${fmtNum(eco.capacity[k])}</a>${i === 0 ? help('res') : ''}</td>`;
    })}
    <td><a href="/production#crop" class="resl" title="Crop consumption: details">${icon('res/cropuse', 'Crop consumption', 18, 12)}</a></td><td class="${eco.net.crop < 0 ? 'neg' : ''}" title="Crop consumption / production"><a href="/production#crop" class="plain">${fmtNum(eco.upkeep)}/${fmtNum(eco.gross.crop)}</a>${help('cropBalance')}</td>
    <td>${icon('res/gold', 'Gold', 18, 12)}</td><td><a href="/shop?tab=buy">${fmtNum(credits)}</a>${help('gold')}</td>
  </tr></table></div>`;
}

function mi(href: string, ico: string, label: SafeHtml | string, on = false): SafeHtml {
  return html`<a href="${href}" class="${on ? 'on' : ''}"${on ? html` aria-current="page"` : ''}><img src="/static/img/menu/${ico}.svg" width="16" height="16" alt="">${label}</a>`;
}

/** Menu icon if its picture exists, else a fallback (new icons can be added without breaking pages). */
function menuIcon(name: string, fallback: string): string {
  return hasAsset(`img/menu/${name}.svg`) ? name : fallback;
}

function tile(href: string, ico: string, label: string): SafeHtml {
  return html`<a href="${href}" class="sp-tile"><img src="/static/img/menu/${ico}.svg" width="20" height="20" alt=""><span>${label}</span></a>`;
}

/** Info box under the menu: what needs your attention right now. */
/** Phones only: a slim bar with the menu toggle and the urgent notices (the full menu folds away). */
function mobileBar(c: Chrome): SafeHtml {
  const n = c.notices ?? [];
  const urgent = n.filter((x) => x.kind === 'bad');
  return html`<div id="mobbar"><button type="button" class="mobmenu" data-mobmenu aria-expanded="false" aria-controls="side_left">☰ Menu${n.length ? html` <span class="mobcount">${n.length}</span>` : ''}</button>
    ${urgent.map((x) => html`<a class="mobalert" href="${x.href ?? '#'}">${x.text}</a>`)}</div>`;
}

function infoBox(c: Chrome): SafeHtml {
  const n = c.notices ?? [];
  if (n.length === 0) return html``;
  return html`<section class="sp infobox"><h3 class="sp-head">Info box<span>${n.length}</span></h3><ul>${n.map(
    (x) => html`<li class="${x.kind}">${x.href ? html`<a href="${x.href}">${x.text}</a>` : x.text}</li>`,
  )}</ul></section>`;
}

function sideNavi(c: Chrome | null | undefined, csrf: string, nav: NavKey | undefined): SafeHtml {
  if (!c) {
    return html`<nav id="side_navi" class="sp" aria-label="Menu"><div class="sp-body">
      ${mi('/', 'home', 'Home')}${mi('/login', 'profile', 'Login')}${mi('/register', 'plus', 'Register')}
      <div class="sp-sep"></div>${mi('/stats', 'stats', 'Statistics')}${mi('/help', 'help', 'Instructions')}</div></nav>`;
  }
  const u = c.user;
  return html`<nav id="side_navi" class="sp" aria-label="Menu">
    <a class="sp-user sp-card" href="/player/${u.id}" title="Your profile"><img class="avatar" src="${avatarUrl(u)}" width="44" height="44" alt="">
      <b>${u.username}</b><small>${TRIBES[u.tribe as TribeId]?.name ?? ''}</small>
      <span class="sp-chips"><span title="Population">${icon('res/pop', 'Population', 12, 12)} ${fmtNum(c.villages.reduce((a, v) => a + v.pop, 0))}${help('population')}</span><span title="Gold">${icon('res/gold', 'Gold', 14, 10)} ${fmtNum(c.credits)}</span></span></a>
    <div class="sp-body">
      <div class="sp-label">Village</div>
      ${mi('/fields', 'home', 'Overview', nav === 'fields')}
      ${mi('/village', menuIcon('village', 'home'), 'Village centre', nav === 'village')}
      ${mi('/troops/train', menuIcon('train', 'rally'), 'Train troops', nav === 'train')}
      ${mi('/troops', 'rally', 'Rally point', nav === 'troops')}
      ${mi('/hero', 'hero', html`Hero${c.heroAlert ? html` <span class="sp-badge">!</span>` : ''}`, nav === 'hero')}
      ${mi('/goldmarket', 'market', 'Gold market', nav === 'goldmarket')}
      <div class="sp-label">Community</div>
      ${mi('/alliance', 'alliance', 'Alliance', nav === 'alliance')}
      ${mi('/chat', 'chat', 'Chat', nav === 'chat')}
      ${mi('/stats', 'stats', 'Statistics', nav === 'stats')}
      <div class="sp-label">Account</div>
      ${mi('/shop', 'gold', html`Plus &amp; Gold`, nav === 'shop')}
      ${mi('/wallet', 'wallet', 'Wallet', nav === 'wallet')}
      ${mi('/account', 'profile', 'Profile', nav === 'account')}
      ${u.role === 'admin' ? mi('/admin', 'admin', 'Admin', nav === 'admin') : ''}
      ${mi('/help', menuIcon('guide', 'help'), 'Game guide', nav === 'help')}
      <form method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit" class="lnk"><img src="/static/img/menu/logout.svg" width="16" height="16" alt="">Log out</button></form>
    </div>
  </nav>`;
}

function sideInfo(c: Chrome | null | undefined, csrf: string): SafeHtml {
  if (!c) return html`<div id="side_info"></div>`;
  return html`<div id="side_info">
    <section class="sp"><h3 class="sp-head">Villages <span>${c.villages.length}</span></h3>
      <ul class="sp-villages">${c.villages.map(
        (v) => html`<li class="${v.id === c.village.id ? 'on' : ''}">
          <form method="post" action="/village/switch"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="villageId" value="${v.id}">
          <button type="submit" class="lnk"${v.id === c.village.id ? html` aria-current="true"` : ''}><span class="vn">${v.isCapital ? html`<img class="vcapm" src="${assetUrl('img/ui/capital.svg')}" width="13" height="13" alt="Capital" title="Capital">` : ''}${v.name}</span><span class="vp" title="Population">${fmtNum(v.pop)}</span><span class="vc">(${v.x}|${v.y})</span></button></form></li>`,
      )}</ul>
      ${c.villages.length > 1 ? html`<p class="sp-total small">Total population: <b>${fmtNum(c.villages.reduce((a, v) => a + v.pop, 0))}</b></p>` : ''}</section>
    ${c.tasks ? taskPanel({ tribe: c.user.tribe as TribeId, current: c.tasks.current, claimable: c.tasks.claimable, total: c.tasks.total, done: c.tasks.done, csrf }) : ''}
    <section class="sp"><h3 class="sp-head">Links</h3>
      <div class="sp-tiles">
        ${tile('/troops/send', 'send', 'Send troops')}${tile('/troops/farmlist', menuIcon('farm', 'rally'), 'Farm list')}
        ${tile('/simulator', menuIcon('simulator', 'send'), 'Simulator')}${tile('/production', 'stats', 'Production')}
        ${tile('/units', menuIcon('units', 'hero'), 'Troop guide')}${tile('/shop/ticker', 'news', 'News ticker')}
      </div></section>
  </div>`;
}

export function layout(o: PageOpts): SafeHtml {
  const c = o.chrome;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title} · ${config.WORLD_NAME}</title>
<link rel="stylesheet" href="${assetUrl('style.css')}">
<link rel="icon" type="image/png" sizes="32x32" href="${assetUrl('img/brand/coin-32.png')}">
<link rel="icon" type="image/png" sizes="192x192" href="${assetUrl('img/brand/coin-192.png')}">
<link rel="apple-touch-icon" href="${assetUrl('img/brand/coin-180.png')}">
</head>
<body data-masks="${assetUrl('masks.json')}" data-now="${o.now}">
<div id="wrap">
  <div id="header">
    <a id="logo" href="${c ? '/fields' : '/'}"><img class="coin" src="${assetUrl('img/brand/coin-128.png')}" width="60" height="60" alt=""><span><img src="${assetUrl('img/brand/wordmark-2line.svg')}" width="148" height="47" alt="${config.WORLD_NAME}"><small>${config.WORLD_SPEED !== 1 ? `speed x${config.WORLD_SPEED}` : 'classic world'}</small></span></a>
    ${topNav(o.nav, c)}
    <div id="ltime">Server time: <b>${fmtClock(o.now)}</b> UTC</div>
  </div>
  ${c ? resourceBar(c.village, c.eco, o.now, c.credits) : ''}
  ${tickerBar(o.ticker ?? [], o.announcement)}
  <div id="mid">
    ${c ? mobileBar(c) : ''}
    <div id="side_left">${sideNavi(c, o.csrf, o.nav)}${c ? infoBox(c) : ''}</div>
    <div id="content">
      ${o.flash ? html`<div class="flash ${o.flash.type}" role="${o.flash.type === 'error' ? 'alert' : 'status'}">${o.flash.text}</div>` : ''}
      ${o.body}
    </div>
    ${sideInfo(c, o.csrf)}
  </div>
  <footer id="footer">
    <div class="fhero">
      <a class="fbrand" href="${c ? '/fields' : '/'}"><img class="fcoin" src="${assetUrl('img/brand/coin-256.png')}" width="112" height="112" alt=""><img class="fword" src="${assetUrl('img/brand/wordmark.svg')}" width="360" height="44" alt="${config.WORLD_NAME}"></a>
      <p class="ftag">Build · Raid · Conquer</p>
    </div>
    <nav class="flinks" aria-label="Footer"><a href="/help">Game guide</a><a href="/units">Troop guide</a><a href="/stats">Statistics</a>${c
      ? html`<a href="/simulator">Simulator</a><a href="/shop">Plus &amp; Gold</a><a href="/wallet">Wallet</a>`
      : html`<a href="/register">Create account</a><a href="/">Log in</a>`}</nav>
    <div class="fbar">© ${new Date(o.now).getUTCFullYear()} ${config.WORLD_NAME} · ${config.WORLD_SPEED !== 1 ? `speed x${config.WORLD_SPEED}` : 'classic speed'} · server time ${fmtClock(o.now)} UTC</div>
  </footer>
</div>
<script src="${assetUrl('app.js')}" defer></script>
</body>
</html>`;
}

/** Classic cost line: "[wood] 120 | [clay] 100 | [iron] 150 | [crop] 30 | [crop use] 1 | [clock] 0:21:36". */
export function costLine(cost: Resources, have?: Resources, extra?: SafeHtml): SafeHtml {
  return html`<div class="cost">${RESOURCE_KEYS.map(
    (k) => html`<span class="${have && have[k] < cost[k] ? 'miss' : ''}">${resIcon(k)}${fmtNum(cost[k])}</span>`,
  )}${extra ?? ''}</div>`;
}

export function timer(endsAt: number, now: number, reload = true): SafeHtml {
  return html`<span class="nowrap" data-ends="${endsAt}"${reload ? html` data-reload` : ''}>${fmtDuration(endsAt - now)}</span>`;
}

export function csrfField(csrf: string): SafeHtml {
  return html`<input type="hidden" name="_csrf" value="${csrf}">`;
}
