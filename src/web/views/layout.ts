import { assetUrl } from '../assets.js';
import { config } from '../../config.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, type Resources } from '../../game/rules/resources.js';
import type { Economy, VillageRow } from '../../game/engine/state.js';
import type { UserRow } from '../../game/actions/account.js';
import type { Flash } from '../session.js';
import { fmtClock, fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { avatarUrl } from '../../game/actions/avatar.js';
import { TRIBES, type TribeId } from '../../game/rules/units.js';

export interface Chrome {
  user: UserRow;
  village: VillageRow;
  villages: { id: number; name: string; x: number; y: number }[];
  eco: Economy;
  unread: { reports: number; messages: number };
  credits: number;
  heroAlert: boolean;
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
  | 'hero'
  | 'reports'
  | 'messages'
  | 'chat'
  | 'alliance'
  | 'stats'
  | 'shop'
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
  return html`<img src="/static/img/${path}.svg" width="${w}" height="${h}" alt="${alt}" title="${alt}">`;
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
    <div class="tk-track"><span class="tk-set">${all}</span><span class="tk-set tk-dup" aria-hidden="true">${all}</span></div>
    <a class="tk-buy" href="/shop/ticker" title="Post your own message">+</a>
  </div>`;
}

function topNav(active: NavKey | undefined, c: Chrome | null | undefined): SafeHtml {
  if (!c) return html``;
  const n = (key: NavKey, href: string, img: string, label: string) =>
    html`<a class="n${key === active ? ' on' : ''}" href="${href}" title="${label}"${key === active ? html` aria-current="page"` : ''}><img src="/static/img/nav/${img}.svg" alt="${label}"></a>`;
  return html`<nav id="mtop" aria-label="Main">
    ${n('fields', '/fields', 'dorf1', 'Village overview')}
    ${n('village', '/village', 'dorf2', 'Village centre')}
    ${n('map', '/map', 'map', 'Map')}
    ${n('stats', '/stats', 'stats', 'Statistics')}
    <a class="half rep${active === 'reports' ? ' on' : ''}" href="/reports" title="Reports"><img src="/static/img/nav/reports.svg" alt="Reports">${c.unread.reports ? html`<span class="badge">${c.unread.reports}</span>` : ''}</a>
    <a class="half msg${active === 'messages' ? ' on' : ''}" href="/messages" title="Messages"><img src="/static/img/nav/messages.svg" alt="Messages">${c.unread.messages ? html`<span class="badge">${c.unread.messages}</span>` : ''}</a>
    <a class="n plus${active === 'shop' ? ' on' : ''}" href="/shop" title="Plus &amp; Gold"><img src="/static/img/nav/plus.svg" alt="Plus"></a>
  </nav>`;
}

function resourceBar(v: VillageRow, eco: Economy, now: number, credits: number): SafeHtml {
  const stock: Resources = { wood: v.wood, clay: v.clay, iron: v.iron, crop: v.crop };
  return html`<div id="res"><table><tr>
    ${RESOURCE_KEYS.map((k) => {
      const full = eco.net[k] >= 0 && stock[k] >= eco.capacity[k];
      return html`<td><a href="/production#${k}" class="resl" title="${RESOURCE_LABEL[k]}: where production comes from">${resIcon(k)}</a></td><td class="${full ? 'full' : ''}" title="${RESOURCE_LABEL[k]}: ${fmtNum(eco.net[k])} per hour"><span data-amount="${stock[k]}" data-rate="${eco.net[k]}" data-cap="${eco.capacity[k]}" data-at="${now}">${fmtNum(stock[k])}</span>/${fmtNum(eco.capacity[k])}</td>`;
    })}
    <td><a href="/production#crop" class="resl" title="Crop consumption: details">${icon('res/cropuse', 'Crop consumption', 18, 12)}</a></td><td class="${eco.net.crop < 0 ? 'neg' : ''}" title="Crop consumption / production">${fmtNum(eco.upkeep)}/${fmtNum(eco.gross.crop)}</td>
    <td>${icon('res/gold', 'Gold', 18, 12)}</td><td><a href="/shop">${fmtNum(credits)}</a></td>
  </tr></table></div>`;
}

function mi(href: string, ico: string, label: SafeHtml | string, on = false): SafeHtml {
  return html`<a href="${href}" class="${on ? 'on' : ''}"${on ? html` aria-current="page"` : ''}><img src="/static/img/menu/${ico}.svg" width="16" height="16" alt="">${label}</a>`;
}

function sideNavi(c: Chrome | null | undefined, csrf: string, nav: NavKey | undefined): SafeHtml {
  if (!c) {
    return html`<nav id="side_navi" class="sp" aria-label="Menu"><div class="sp-body">
      ${mi('/', 'home', 'Home')}${mi('/login', 'profile', 'Login')}${mi('/register', 'plus', 'Register')}
      <div class="sp-sep"></div>${mi('/stats', 'stats', 'Statistics')}${mi('/help', 'help', 'Instructions')}</div></nav>`;
  }
  const u = c.user;
  return html`<nav id="side_navi" class="sp" aria-label="Menu">
    <a class="sp-user" href="/account" title="Your profile"><img class="avatar" src="${avatarUrl(u)}" width="30" height="30" alt="">
      <span><b>${u.username}</b><small>${TRIBES[u.tribe as TribeId]?.name ?? ''}</small></span></a>
    <div class="sp-body">
      <div class="sp-label">Village</div>
      ${mi('/fields', 'home', 'Home', nav === 'fields' || nav === 'village')}
      ${mi('/troops', 'rally', 'Rally point', nav === 'troops')}
      ${mi('/hero', 'hero', html`Hero${c.heroAlert ? html` <span class="sp-badge">!</span>` : ''}`, nav === 'hero')}
      ${mi('/goldmarket', 'market', 'Gold market')}
      <div class="sp-label">Community</div>
      ${mi('/alliance', 'alliance', 'Alliance', nav === 'alliance')}
      ${mi('/chat', 'chat', 'Chat', nav === 'chat')}
      ${mi('/stats', 'stats', 'Statistics', nav === 'stats')}
      <div class="sp-label">Account</div>
      ${mi('/shop', 'gold', html`Plus &amp; Gold`, nav === 'shop')}
      ${mi('/wallet', 'wallet', 'Wallet')}
      ${mi('/account', 'profile', 'Profile', nav === 'account')}
      ${u.role === 'admin' ? mi('/admin', 'admin', 'Admin') : ''}
      ${mi('/help', 'help', 'Instructions')}
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
          <button type="submit" class="lnk"${v.id === c.village.id ? html` aria-current="true"` : ''}><span class="vn">${v.name}</span><span class="vc">(${v.x}|${v.y})</span></button></form></li>`,
      )}</ul></section>
    <section class="sp"><h3 class="sp-head">Links</h3>
      <div class="sp-body">${mi('/troops/send', 'send', 'Send troops')}${mi('/goldmarket', 'market', 'Gold market')}${mi('/units', 'hero', 'Troop guide')}${mi('/shop/ticker', 'news', 'News ticker')}</div></section>
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
<link rel="icon" href="/static/img/nav/dorf2.svg">
</head>
<body data-masks="${assetUrl('masks.json')}" data-now="${o.now}">
<div id="wrap">
  <div id="header">
    <a id="logo" href="${c ? '/fields' : '/'}">${config.WORLD_NAME}<small>${config.WORLD_SPEED !== 1 ? `speed x${config.WORLD_SPEED}` : 'classic world'}</small></a>
    ${topNav(o.nav, c)}
    <div id="ltime">Server time: <b>${fmtClock(o.now)}</b></div>
  </div>
  ${c ? resourceBar(c.village, c.eco, o.now, c.credits) : ''}
  ${tickerBar(o.ticker ?? [], o.announcement)}
  <div id="mid">
    ${sideNavi(c, o.csrf, o.nav)}
    <div id="content">
      ${o.flash ? html`<div class="flash ${o.flash.type}" role="${o.flash.type === 'error' ? 'alert' : 'status'}">${o.flash.text}</div>` : ''}
      ${o.body}
    </div>
    ${sideInfo(c, o.csrf)}
  </div>
  <div id="footer"><a href="/help">Instructions</a> | <a href="/stats">Statistics</a> | ${config.WORLD_NAME}</div>
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
