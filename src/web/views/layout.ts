import { config } from '../../config.js';
import { RESOURCE_ICON, RESOURCE_KEYS, RESOURCE_LABEL, type Resources } from '../../game/rules/resources.js';
import type { Economy, VillageRow } from '../../game/engine/state.js';
import type { UserRow } from '../../game/actions/account.js';
import type { Flash } from '../session.js';
import { fmtClock, fmtDuration, fmtNum, fmtSigned } from '../format.js';
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

function resourceBar(v: VillageRow, eco: Economy, now: number): SafeHtml {
  const stock: Resources = { wood: v.wood, clay: v.clay, iron: v.iron, crop: v.crop };
  return html`<div class="resbar" role="region" aria-label="Resources">
    ${RESOURCE_KEYS.map((k) => {
      const full = eco.net[k] >= 0 && stock[k] >= eco.capacity[k];
      const neg = eco.net[k] < 0;
      return html`<div class="res${full ? ' full' : ''}${neg ? ' neg' : ''}" title="${RESOURCE_LABEL[k]}: ${fmtNum(stock[k])} / ${fmtNum(eco.capacity[k])}">
        <span aria-hidden="true">${RESOURCE_ICON[k]}</span><span class="sr">${RESOURCE_LABEL[k]}</span>
        <b data-amount="${stock[k]}" data-rate="${eco.net[k]}" data-cap="${eco.capacity[k]}" data-at="${now}">${fmtNum(stock[k])}</b>
        <span class="rate">${fmtSigned(eco.net[k])}/h</span>
      </div>`;
    })}
  </div>
  <div class="capline">Warehouse ${fmtNum(eco.capacity.wood)} · Granary ${fmtNum(eco.capacity.crop)}</div>`;
}

function nav(active: NavKey | undefined, c: Chrome): SafeHtml {
  const unread = c.unread;
  const items: { key: NavKey; href: string; ico: string; label: string; badge?: number | string }[] = [
    { key: 'fields', href: '/fields', ico: '🌾', label: 'Fields' },
    { key: 'village', href: '/village', ico: '🏘️', label: 'Village' },
    { key: 'map', href: '/map', ico: '🗺️', label: 'Map' },
    { key: 'troops', href: '/troops', ico: '⚔️', label: 'Troops' },
    { key: 'hero', href: '/hero', ico: '🦸', label: 'Hero', badge: c.heroAlert ? '!' : undefined },
    { key: 'reports', href: '/reports', ico: '📜', label: 'Reports', badge: unread.reports },
    { key: 'messages', href: '/messages', ico: '✉️', label: 'Messages', badge: unread.messages },
    { key: 'chat', href: '/chat', ico: '💬', label: 'Chat' },
    { key: 'alliance', href: '/alliance', ico: '🤝', label: 'Alliance' },
    { key: 'stats', href: '/stats', ico: '🏆', label: 'Rankings' },
    { key: 'shop', href: '/shop', ico: '💎', label: 'Shop' },
    { key: 'account', href: '/account', ico: '👤', label: 'Profile' },
  ];
  return html`<nav class="nav" aria-label="Main">
    ${items.map(
      (i) => html`<a href="${i.href}" class="${i.key === active ? 'on' : ''}"${i.key === active ? html` aria-current="page"` : ''}>
        <span class="ico" aria-hidden="true">${i.ico}</span>${i.label}${i.badge ? html`<span class="badge" aria-label="${i.badge} new">${i.badge}</span>` : ''}
      </a>`,
    )}
  </nav>`;
}

export function layout(o: PageOpts): SafeHtml {
  const c = o.chrome;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#3c5a26">
<title>${o.title} · ${config.WORLD_NAME}</title>
<link rel="stylesheet" href="/static/style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏰%3C/text%3E%3C/svg%3E">
</head>
<body data-now="${o.now}">
<div class="wrap">
  <header class="top">
    <a class="logo" href="${c ? '/village' : '/'}">🏰 ${config.WORLD_NAME}<small>${config.WORLD_SPEED !== 1 ? `x${config.WORLD_SPEED}` : ''}</small></a>
    ${c
      ? html`<div class="who"><a href="/account">${c.user.username}</a> · <a href="/shop" title="Credits">💎 ${fmtNum(c.credits)}</a><br><a href="/village">${c.village.name}</a> (${c.village.x}|${c.village.y})</div>`
      : html`<div class="who"><a href="/login">Log in</a> · <a href="/register">Play free</a></div>`}
  </header>
  ${tickerBar(o.ticker ?? [], o.announcement)}
  ${c ? resourceBar(c.village, c.eco, o.now) : ''}
  ${c ? nav(o.nav, c) : ''}
  ${o.flash ? html`<div class="flash ${o.flash.type}" role="${o.flash.type === 'error' ? 'alert' : 'status'}">${o.flash.text}</div>` : ''}
  <main id="main">
    ${o.body}
  </main>
  <footer>
    ${c && c.villages.length > 1
      ? html`<form method="post" action="/village/switch" class="switch"><input type="hidden" name="_csrf" value="${o.csrf}">
          <label for="vsw" class="small">Your villages</label>
          <div class="row"><select id="vsw" name="villageId">${c.villages.map((v) => html`<option value="${v.id}"${v.id === c.village.id ? html` selected` : ''}>${v.name} (${v.x}|${v.y})</option>`)}</select>
          <button type="submit" class="small">Go</button></div></form><br>`
      : ''}
    Server time ${fmtClock(o.now)} UTC · <a href="/help">Help</a> · <a href="/stats">Rankings</a>${c ? html` · <form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${o.csrf}"><button type="submit" class="small secondary">Log out</button></form>` : ''}
  </footer>
</div>
<script src="/static/app.js" defer></script>
</body>
</html>`;
}

export function costLine(cost: Resources, have?: Resources): SafeHtml {
  return html`<div class="cost">${RESOURCE_KEYS.map(
    (k) => html`<span class="${have && have[k] < cost[k] ? 'miss' : ''}" title="${RESOURCE_LABEL[k]}">${RESOURCE_ICON[k]} ${fmtNum(cost[k])}</span>`,
  )}</div>`;
}

export function timer(endsAt: number, now: number, reload = true): SafeHtml {
  return html`<span class="nowrap" data-ends="${endsAt}"${reload ? html` data-reload` : ''}>${fmtDuration(endsAt - now)}</span>`;
}

export function csrfField(csrf: string): SafeHtml {
  return html`<input type="hidden" name="_csrf" value="${csrf}">`;
}
