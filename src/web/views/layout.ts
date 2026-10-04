import { config } from '../../config.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, type Resources } from '../../game/rules/resources.js';
import type { Economy, VillageRow } from '../../game/engine/state.js';
import type { UserRow } from '../../game/actions/account.js';
import type { Flash } from '../session.js';
import { fmtClock, fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';

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
export function icon(path: string, alt: string, size = 18): SafeHtml {
  return html`<img src="/static/img/${path}.svg" width="${size}" height="${size}" alt="${alt}" title="${alt}">`;
}

export function resIcon(k: keyof Resources, size = 18): SafeHtml {
  return icon(`res/${k}`, RESOURCE_LABEL[k], size);
}

function tickerBar(items: TickerItem[], announcement: string | null | undefined): SafeHtml {
  const all: SafeHtml[] = [];
  if (announcement) all.push(html`<span class="tk-item tk-sys">📣 ${announcement}</span>`);
  for (const t of items) all.push(html`<span class="tk-item">📯 <b>${t.username ?? 'Herald'}:</b> ${t.body}</span>`);
  if (all.length === 0) return html``;
  return html`<div class="ticker" role="marquee" aria-label="News">
    <div class="tk-track"><span class="tk-set">${all}</span><span class="tk-set tk-dup" aria-hidden="true">${all}</span></div>
    <a class="tk-buy" href="/shop/ticker" title="Post your own message">＋</a>
  </div>`;
}

function topNav(active: NavKey | undefined, c: Chrome | null | undefined): SafeHtml {
  if (!c) return html``;
  const items: { key: NavKey; href: string; img: string; label: string; badge?: number }[] = [
    { key: 'fields', href: '/fields', img: 'dorf1', label: 'Village overview' },
    { key: 'village', href: '/village', img: 'dorf2', label: 'Village centre' },
    { key: 'map', href: '/map', img: 'map', label: 'Map' },
    { key: 'stats', href: '/stats', img: 'stats', label: 'Statistics' },
    { key: 'reports', href: '/reports', img: 'reports', label: 'Reports', badge: c.unread.reports },
    { key: 'messages', href: '/messages', img: 'messages', label: 'Messages', badge: c.unread.messages },
    { key: 'shop', href: '/shop', img: 'plus', label: 'Plus & Gold' },
  ];
  return html`<nav id="mtop" aria-label="Main">${items.map(
    (i) => html`<a href="${i.href}" class="${i.key === active ? 'on' : ''}" title="${i.label}"${i.key === active ? html` aria-current="page"` : ''}>
      <img src="/static/img/nav/${i.img}.svg" alt="${i.label}">${i.badge ? html`<span class="badge">${i.badge}</span>` : ''}</a>`,
  )}</nav>`;
}

function resourceBar(v: VillageRow, eco: Economy, now: number, credits: number): SafeHtml {
  const stock: Resources = { wood: v.wood, clay: v.clay, iron: v.iron, crop: v.crop };
  return html`<div id="res" role="region" aria-label="Resources">
    ${RESOURCE_KEYS.map((k) => {
      const full = eco.net[k] >= 0 && stock[k] >= eco.capacity[k];
      return html`<span class="r${full ? ' full' : ''}" title="${RESOURCE_LABEL[k]}: ${fmtNum(eco.net[k])} per hour">${resIcon(k)}<b data-amount="${stock[k]}" data-rate="${eco.net[k]}" data-cap="${eco.capacity[k]}" data-at="${now}">${fmtNum(stock[k])}</b><span class="cap">/${fmtNum(eco.capacity[k])}</span></span>`;
    })}
    <span class="r${eco.net.crop < 0 ? ' neg' : ''}" title="Crop consumption / crop production per hour">${icon('res/cropuse', 'Crop consumption')}${fmtNum(eco.upkeep)}/${fmtNum(eco.gross.crop)}</span>
    <a class="r gold" href="/shop" title="Gold">${icon('res/gold', 'Gold')}<b>${fmtNum(credits)}</b></a>
  </div>`;
}

function leftMenu(c: Chrome | null | undefined, csrf: string): SafeHtml {
  if (!c) {
    return html`<aside id="lmenu" aria-label="Menu">
      <a href="/">Home</a><a href="/login">Login</a><a href="/register">Register</a><hr><a href="/stats">Statistics</a><a href="/help">Instructions</a>
    </aside>`;
  }
  return html`<aside id="lmenu" aria-label="Menu">
    <a href="/fields">Village overview</a>
    <a href="/village">Village centre</a>
    <a href="/troops">Rally Point</a>
    <a href="/hero">Hero${c.heroAlert ? html` <span class="bad">(!)</span>` : ''}</a>
    <hr>
    <a href="/account">Profile</a>
    <a href="/alliance">Alliance</a>
    <a href="/chat">Chat</a>
    <a href="/shop">Plus &amp; Gold</a>
    <a href="/wallet">Wallet</a>
    ${c.user.role === 'admin' ? html`<a href="/admin">Admin</a>` : ''}
    <hr>
    <a href="/help">Instructions</a>
    <form method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit" class="small secondary">Logout</button></form>
  </aside>`;
}

function rightSide(c: Chrome | null | undefined, csrf: string): SafeHtml {
  if (!c) return html`<aside id="rside"></aside>`;
  return html`<aside id="rside" aria-label="Villages">
    <h5>Villages:</h5>
    <ul>${c.villages.map(
      (v) => html`<li class="${v.id === c.village.id ? 'on' : ''}">
        <form method="post" action="/village/switch" class="inline"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="villageId" value="${v.id}">
          <button type="submit" class="vbtn">${v.id === c.village.id ? '• ' : ''}${v.name}</button></form>
        <span class="coords">(${v.x}|${v.y})</span></li>`,
    )}</ul>
    <h5>Links:</h5>
    <ul>
      <li><a href="/troops/send">Send troops</a></li>
      <li><a href="/alliance">Alliance</a></li>
      <li><a href="/shop/ticker">News ticker</a></li>
    </ul>
  </aside>`;
}

export function layout(o: PageOpts): SafeHtml {
  const c = o.chrome;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#6fa52e">
<title>${o.title} · ${config.WORLD_NAME}</title>
<link rel="stylesheet" href="/static/style.css">
<link rel="icon" href="/static/img/nav/dorf2.svg">
</head>
<body data-now="${o.now}">
<div id="page">
  <header id="hd">
    <a id="logo" href="${c ? '/fields' : '/'}">${config.WORLD_NAME}<small>${config.WORLD_SPEED !== 1 ? `SPEED x${config.WORLD_SPEED}` : 'CLASSIC WORLD'}</small></a>
    ${topNav(o.nav, c)}
  </header>
  ${c ? resourceBar(c.village, c.eco, o.now, c.credits) : html`<div id="res"></div>`}
  ${tickerBar(o.ticker ?? [], o.announcement)}
  <div id="cols">
    ${leftMenu(c, o.csrf)}
    <main id="content">
      ${o.flash ? html`<div class="flash ${o.flash.type}" role="${o.flash.type === 'error' ? 'alert' : 'status'}">${o.flash.text}</div>` : ''}
      ${o.body}
    </main>
    ${rightSide(c, o.csrf)}
  </div>
  <footer id="ft">Server time: ${fmtClock(o.now)} UTC · <a href="/help">Instructions</a> · <a href="/stats">Statistics</a> · ${config.WORLD_NAME}</footer>
</div>
<script src="/static/app.js" defer></script>
</body>
</html>`;
}

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
