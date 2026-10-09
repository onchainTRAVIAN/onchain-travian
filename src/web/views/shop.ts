import { STORAGE_BOOST_PRICE, type Product } from '../../game/actions/credits.js';
import { config, cryptoEnabled } from '../../config.js';
import { PROTECTION_PRICE, TRANSFER_MAX, NPC_TRADE_PRICE, PRODUCTS, TICKER_MAX_HOURS, TICKER_MAX_LENGTH } from '../../game/actions/credits.js';
import { GOLD_CLUB_PRICE } from '../../game/actions/goldclub.js';
import { NAME_CHANGE_PRICE } from '../../game/actions/account.js';
import { ETH_ASSET, GOLD_PACKAGES, formatUnitsShort, weiForUsd } from '../../crypto/pricing.js';
import { assetUrl, hasAsset } from '../assets.js';
import { goldBtn } from './parts.js';
import { help, type TipKey } from './tips.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, sumRes, type Resources } from '../../game/rules/resources.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon, timer } from './layout.js';

export type ShopTab = 'buy' | 'adv' | 'specials' | 'history' | 'wallet';

const PRODUCT_ART: Record<string, string> = {
  prod_wood: 'wood',
  prod_clay: 'clay',
  prod_iron: 'iron',
  prod_crop: 'crop',
  build_queue: 'builder',
  smithy_queue: 'trainer',
  train_speed: 'drill',
  attack: 'banner',
  defense: 'walls',
};

/** Shop picture (64×48) with a plain fallback while the art is missing. */
function art(name: string, alt = ''): SafeHtml {
  return hasAsset(`img/shop/${name}.svg`)
    ? html`<img class="sart" src="/static/img/shop/${name}.svg" width="64" height="48" alt="${alt}">`
    : html`<img class="sart" src="/static/img/res/gold.svg" width="40" height="27" alt="${alt}">`;
}

const goldPrice = (price: number, enough: boolean, label: string): SafeHtml => goldBtn(label, price, enough);

export function shopTabs(tab: ShopTab): SafeHtml {
  const t = (id: ShopTab, label: string, href = `/shop?tab=${id}`) => html`<a href="${href}" class="${tab === id ? 'on' : ''}"${tab === id ? html` aria-current="page"` : ''}>${label}</a>`;
  return html`<nav class="woodtabs" aria-label="Shop">${t('buy', 'Buy Gold')}${t('adv', 'Advantages')}${t('specials', 'Specials')}${t('wallet', 'Wallet', '/wallet')}${t('history', 'History')}</nav>`;
}

export function shopView(d: {
  tab: ShopTab;
  balance: number;
  boosts: { source: string; expiresAt: number | null }[];
  stock: Resources;
  capacity: Resources;
  history: { amount: number; reason: string; createdAt: number }[];
  deposits: { id: string; asset: string; amount: string; credits: number; createdAt: number }[];
  sendTo: string;
  protection: { protectedUntil: number; canBuyAt: number };
  goldClub: boolean;
  storage: { id: number; name: string; boosted: boolean; current: number }[];
  accountId: number;
  ethUsd: number;
  ethUsdAt: number | null;
  csrf: string;
  now: number;
}): SafeHtml {
  const body = d.tab === 'buy' ? buyTab(d) : d.tab === 'adv' ? advTab(d) : d.tab === 'specials' ? specialsTab(d) : historyTab(d);
  return html`<div class="shophead"><h1>Plus &amp; Gold</h1><span class="shopbal">${icon('res/gold', 'Gold', 24, 16)} <b>${fmtNum(d.balance)}</b>${help('gold')}</span></div>
    ${shopTabs(d.tab)}
    <div class="woodbody">${body}</div>`;
}

function buyTab(d: { balance: number; accountId: number; ethUsd: number; ethUsdAt: number | null; csrf: string; now: number }): SafeHtml {
  const on = cryptoEnabled();
  const eth = (usd: number) => formatUnitsShort(weiForUsd(usd, d.ethUsd), 18, 6);
  const best = GOLD_PACKAGES.findIndex((p) => p.tag === 'Best seller');
  const sel = GOLD_PACKAGES[best] ?? GOLD_PACKAGES[0]!;
  return html`<ol class="steps"><li class="on">Select package</li><li>Connect wallet</li><li>Pay in ETH</li><li>Gold arrives</li></ol>
    <div data-wallet data-csrf="${d.csrf}" data-chain="${config.CHAIN_ID}" data-chain-name="${config.CHAIN_NAME}"
      data-payments="${config.PAYMENTS_ADDRESS ?? ''}" data-token="${config.TOKEN_ADDRESS ?? ''}" data-account="${d.accountId}" data-decimals="${config.TOKEN_DECIMALS}">
    <div class="gpacks" role="radiogroup" aria-label="Gold packages">${GOLD_PACKAGES.map((p, i) => {
      const id = `gp${i}`;
      return html`<input type="radio" name="pkg" id="${id}" class="gpin" value="${i}" data-gold="${p.gold}" data-usd="${p.usd.toFixed(2)}" data-eth="${eth(p.usd)}" data-units="${weiForUsd(p.usd, d.ethUsd).toString()}"${i === best ? html` checked` : ''}>
        <label for="${id}" class="gpack${p.tag ? ' hot' : ''}">${p.tag ? html`<span class="gtag${p.tag === 'Best value' ? ' val' : ''}">${p.tag}</span>` : ''}
          <span class="gamt">${icon('res/gold', 'Gold', 24, 16)} ${fmtNum(p.gold)}</span>
          ${hasAsset(`img/gold/pack-${i + 1}.svg`) ? html`<img src="/static/img/gold/pack-${i + 1}.svg" width="120" height="90" alt="">` : html`<span class="gpimg"></span>`}
          <span class="gprice"><b>$${p.usd.toFixed(2)}</b><span>${eth(p.usd)} ETH</span></span></label>`;
    })}</div>
    <div class="spanel paybox"><div class="pad">
      <p class="paysum">Selected: <b data-sel-gold>${fmtNum(sel.gold)}</b> Gold for <b>$<span data-sel-usd>${sel.usd.toFixed(2)}</span></b> = <b><span data-sel-eth>${eth(sel.usd)}</span> ETH</b></p>
      ${on
        ? html`<button type="button" class="gold paybtn" data-pay="eth" data-units="${weiForUsd(sel.usd, d.ethUsd).toString()}">Pay with wallet</button>
          <p class="small" data-status role="status"></p>`
        : html`<button type="button" class="paybtn secondary" disabled>Pay with wallet</button>
          <p class="small muted">Payments open soon - buying Gold isn't switched on on this server yet. You can still earn Gold in the weekly Top 10 and the Gold market.</p>`}
      <p class="small muted">1 ETH = $${fmtNum(Math.round(d.ethUsd))}${d.ethUsdAt ? ` · live price, updated ${fmtAgo(d.ethUsdAt, d.now)}` : ''}. Gold arrives after ${config.CONFIRMATIONS} confirmation${config.CONFIRMATIONS === 1 ? '' : 's'} on ${config.CHAIN_NAME}, with a message. Your account number #${d.accountId} is sent with the payment.</p>
      ${on
        ? html`<details class="small"><summary>Other amount${config.TOKEN_ADDRESS ? ` or pay with ${config.TOKEN_SYMBOL} (+${Math.round(config.TOKEN_BONUS * 100)}% Gold)` : ''}</summary>
          <div class="row">
            <div><label for="ca">Amount</label><input id="ca" type="text" inputmode="decimal" placeholder="0.02" data-custom-amount></div>
            <div><label for="cs">Currency</label><select id="cs" data-custom-asset><option value="eth">ETH</option>${config.TOKEN_ADDRESS ? html`<option value="token">${config.TOKEN_SYMBOL}</option>` : ''}</select></div>
            <div><label>&nbsp;</label><button type="button" class="block" data-pay-custom>Pay</button></div>
          </div>
          <p class="muted">Any ETH amount works: you get Gold at the rate of the biggest package you reached.</p></details>`
        : ''}
    </div></div>
    </div>
    ${on ? html`<script src="${assetUrl('wallet.js')}" defer></script>` : ''}`;
}

function advTab(d: { balance: number; boosts: { source: string; expiresAt: number | null }[]; goldClub: boolean; csrf: string; now: number }): SafeHtml {
  const act = (id: string) => d.boosts.find((b) => b.source === `shop:${id}`);
  const card = (p: Product, wide = false) => {
    const a = act(p.id);
    return html`<div class="spanel advcard${wide ? ' wide' : ''}${a ? ' active' : ''}">
      ${art(PRODUCT_ART[p.id] ?? 'gold', p.name)}
      <div class="advtxt"><b>${p.name}</b><span class="small">${p.description}</span></div>
      <div class="advfoot"><span class="advdur small">${a?.expiresAt ? html`<span class="good advleft"><b>Active</b> ${timer(a.expiresAt, d.now, false)} left</span>` : html`for <b>${p.days} days</b>`}</span>
        <form method="post" action="/shop/boost">${csrfField(d.csrf)}<input type="hidden" name="product" value="${p.id}">${goldPrice(p.price, d.balance >= p.price, a ? 'Extend' : 'Activate')}</form></div>
    </div>`;
  };
  const by = (id: string) => PRODUCTS.find((p) => p.id === id)!;
  return html`<div class="advgrid two">
      <div class="spanel advcard wide${d.goldClub ? ' active' : ''}" id="goldclub">${art('goldclub', 'Gold Club')}
        <div class="advtxt"><b>Gold Club ${help('goldClub')}</b><span class="small">Farm lists with automatic raids, the Oasis Raider, evasion, trade routes and the cropper finder.</span></div>
        <div class="advfoot"><span class="advdur small">Bonus duration: <b>whole world</b></span>
          ${d.goldClub ? html`<span class="good small">You are a member ✓</span>` : html`<form method="post" action="/shop/goldclub">${csrfField(d.csrf)}${goldPrice(GOLD_CLUB_PRICE, d.balance >= GOLD_CLUB_PRICE, 'Activate')}</form>`}</div></div>
      ${card(by('build_queue'), true)}
    </div>
    <h2 class="advh">Production ${help('shopProduction')}</h2>
    <div class="advgrid four">${(['prod_wood', 'prod_clay', 'prod_iron', 'prod_crop'] as const).map((id) => card(by(id)))}</div>
    <h2 class="advh">Army &amp; speed ${help('shopArmy')}</h2>
    <div class="advgrid four">${(['smithy_queue', 'train_speed', 'attack', 'defense'] as const).map((id) => card(by(id)))}</div>
    <p class="small muted">Buying again while active adds the time on top. <a href="/help/gold-boosts">How boosts work</a></p>`;
}

function specialsTab(d: {
  balance: number;
  stock: Resources;
  capacity: Resources;
  sendTo: string;
  protection: { protectedUntil: number; canBuyAt: number };
  storage: { id: number; name: string; boosted: boolean; current: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  const head = (id: string, pic: string, title: string, price: SafeHtml | string, tip: TipKey) =>
    html`<h3 class="sp-head" id="${id}"><span class="sph">${art(pic)}${title} ${help(tip)}</span><span>${price}</span></h3>`;
  return html`<section class="spanel special">${head('storage', 'storage', 'Storage expansion', `${STORAGE_BOOST_PRICE} Gold per village`, 'storageBoost')}
      <div class="pad"><p class="small">The chosen village stores <b>50% more</b> of every resource, forever (Great Warehouse and Great Granary included). Once per village.</p>
      ${d.storage.every((v) => v.boosted)
        ? html`<p class="small good">All your villages already have it.</p>`
        : html`<form method="post" action="/shop/storage" class="row">${csrfField(d.csrf)}
            <div><label for="sv" class="sr">Village</label><select id="sv" name="villageId">${d.storage.filter((v) => !v.boosted).map(
              (v) => html`<option value="${v.id}">${v.name} - ${fmtNum(v.current)} → ${fmtNum(Math.floor(v.current * 1.5))}</option>`,
            )}</select></div>
            <div>${goldPrice(STORAGE_BOOST_PRICE, d.balance >= STORAGE_BOOST_PRICE, 'Expand')}</div></form>`}
      ${d.storage.some((v) => v.boosted) ? html`<p class="small muted">Already expanded: ${d.storage.filter((v) => v.boosted).map((v) => v.name).join(', ')}</p>` : ''}</div></section>
    <section class="spanel special">${head('protection', 'protection', '24 hours of protection', `${PROTECTION_PRICE} Gold`, 'protection')}
      <div class="pad"><p class="small">Nobody can attack, raid or scout your villages for 24 hours. Attacking another player ends it early. After bought protection ends you can buy it again only after 8 hours.</p>
      ${d.protection.protectedUntil > d.now
        ? html`<p class="small good">You are protected for ${timer(d.protection.protectedUntil, d.now, false)}.</p>`
        : d.protection.canBuyAt > d.now
          ? html`<p class="small bad">You can buy protection again in ${timer(d.protection.canBuyAt, d.now, false)}.</p>`
          : html`<form method="post" action="/shop/protection">${csrfField(d.csrf)}${goldPrice(PROTECTION_PRICE, d.balance >= PROTECTION_PRICE, 'Buy protection')}</form>`}</div></section>
    <section class="spanel special">${head('npc-trade', 'npc', 'NPC merchant', `${NPC_TRADE_PRICE} Gold`, 'npcTrade')}<div class="pad">${npcPanel(d.stock, d.capacity, d.balance, d.csrf)}</div></section>
    <section class="spanel special">${head('gold', 'transfer', 'Send Gold to a player', 'free', 'sendGold')}
      <form method="post" action="/shop/transfer" class="pad block">${csrfField(d.csrf)}
        <table class="tb"><tbody>
          <tr><th><label for="gto">Player</label></th><td><input id="gto" type="text" name="to" value="${d.sendTo}" required maxlength="20" autocomplete="off" placeholder="Player name"></td></tr>
          <tr><th><label for="gamt">Amount</label></th><td><input id="gamt" type="number" name="amount" min="1" max="${Math.min(TRANSFER_MAX, Math.max(1, d.balance))}" required inputmode="numeric"> Gold <span class="small muted">(you have ${fmtNum(d.balance)})</span></td></tr>
          <tr><th><label for="gnote">Note</label></th><td><input id="gnote" type="text" name="note" maxlength="200" placeholder="optional"></td></tr>
        </tbody></table>
        <p><button type="submit">Send Gold</button> <span class="small muted">The player gets a message from you. Transfers can't be undone.</span></p>
      </form></section>
    <section class="spanel special">${head('ticker', 'ticker', 'News ticker', `${config.TICKER_PRICE_PER_HOUR} Gold per hour`, 'ticker')}
      <div class="pad"><p class="small">Put your message on the scrolling news line at the top of every player's screen.</p><a class="btn" href="/shop/ticker">Book a time slot</a></div></section>
    <section class="spanel special"><h3 class="sp-head"><b>Finish immediately ${help('finishNow')}</b></h3>
      <div class="pad"><p class="small">Tap the <b>finish now</b> button (with the Gold coin) next to any construction, training or research to finish it now. The price follows the time left: ${config.WORLD_SPEED !== 1 ? `on this x${config.WORLD_SPEED} world about 1 Gold per ${Math.max(1, Math.round(100 / config.WORLD_SPEED))} minute${Math.round(100 / config.WORLD_SPEED) === 1 ? '' : 's'} left` : '1 Gold per 100 minutes left'}, at least 2. In a training queue one <b>Finish all</b> button finishes the whole queue.</p>
      <p class="small">» <a href="/goldmarket">Gold market</a>: buy and sell resources and troops with other players for Gold. » <a href="/account">Change your player name</a> (${fmtNum(NAME_CHANGE_PRICE)} Gold).</p></div></section>`;
}

function historyTab(d: { history: { amount: number; reason: string; createdAt: number }[]; deposits: { id: string; asset: string; amount: string; credits: number; createdAt: number }[] }): SafeHtml {
  return html`<section class="spanel"><h3 class="sp-head">Gold history<span>last 20</span></h3>
    ${d.history.length === 0
      ? html`<p class="pad muted small">No transactions yet.</p>`
      : html`<table class="tb ghist"><tbody>${d.history.map(
          (h) => html`<tr><td>${h.reason}</td><td class="small muted nowrap">${fmtDateTime(h.createdAt)}</td><td class="num"><b class="${h.amount > 0 ? 'good' : 'bad'}">${h.amount > 0 ? '+' : ''}${fmtNum(h.amount)}</b></td></tr>`,
        )}</tbody></table>`}</section>
    <section class="spanel"><h3 class="sp-head">Your payments<span>${d.deposits.length}</span></h3>
    ${d.deposits.length === 0
      ? html`<p class="pad muted small">None yet.</p>`
      : html`<table class="tb ghist"><tbody>${d.deposits.map(
          (x) => html`<tr><td>${x.asset === ETH_ASSET ? `${formatUnitsShort(BigInt(x.amount), 18)} ETH` : `${formatUnitsShort(BigInt(x.amount), config.TOKEN_DECIMALS)} ${config.TOKEN_SYMBOL}`}</td>
            <td class="small muted nowrap">${fmtDateTime(x.createdAt)}</td><td class="num"><b class="good">+${fmtNum(x.credits)}</b></td></tr>`,
        )}</tbody></table>`}</section>`;
}

/** Classic NPC merchant: redistribute all resources (same total) for a small Gold fee. */
export function npcPanel(stock: Resources, capacity: Resources, balance: number, csrf: string): SafeHtml {
  const total = Math.floor(sumRes(stock));
  return html`<p class="small">Trade your resources into any mix with the NPC merchant. The total stays the same: <b>${fmtNum(total)}</b>.
      Price: <b>${NPC_TRADE_PRICE} Gold</b> (you have ${fmtNum(balance)}).</p>
    <form method="post" action="/shop/npc" class="block" id="npc" data-total="${total}">${csrfField(csrf)}
      <table class="npc"><thead><tr><th></th><th>Now</th><th>New</th><th>Storage</th></tr></thead><tbody>
      ${RESOURCE_KEYS.map(
        (k) => html`<tr><td>${resIcon(k)} ${RESOURCE_LABEL[k]}</td><td class="num">${fmtNum(Math.floor(stock[k]))}</td>
          <td class="center"><label class="sr" for="n${k}">New ${RESOURCE_LABEL[k]}</label>
            <input class="npc-in" id="n${k}" type="number" name="${k}" min="0" max="${capacity[k]}" data-cap="${capacity[k]}" value="${Math.min(Math.floor(stock[k]), capacity[k])}" inputmode="numeric"></td>
          <td class="num">${fmtNum(capacity[k])}</td></tr>`,
      )}
      <tr><td><b>Rest</b></td><td class="num">${fmtNum(total)}</td><td class="center"><b id="npc-rest">0</b></td><td></td></tr>
      </tbody></table>
      <p><button type="button" id="npc-dist" class="secondary">Distribute remaining</button>
        <button type="submit">Trade (${NPC_TRADE_PRICE} Gold)</button></p>
      <p class="small muted">Anything you leave unassigned (and resources produced meanwhile) is spread over your chosen mix, so nothing is lost.</p>
    </form>`;
}

export function tickerView(d: {
  balance: number;
  live: number;
  mine: { id: number; body: string; startsAt: number; endsAt: number; status: string; price: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  const fmtSlot = (t: number) => {
    const iso = new Date(t).toISOString();
    return `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC`;
  };
  return html`<div class="shophead"><h1>Plus &amp; Gold</h1><span class="shopbal">${icon('res/gold', 'Gold', 24, 16)} <b>${fmtNum(d.balance)}</b>${help('gold')}</span></div>
    ${shopTabs('specials')}
    <div class="woodbody">
    <section class="spanel"><h3 class="sp-head"><b>News ticker: post a message ${help('ticker')}</b><span>${config.TICKER_PRICE_PER_HOUR} Gold per hour · ${d.live} running now</span></h3>
      <form method="post" action="/shop/ticker" class="pad block">${csrfField(d.csrf)}
        <p class="small">Your message scrolls across the top of the game for <b>every player</b>, starting now. Post as many as you like - they take turns. No links. Balance: <b>${fmtNum(d.balance)} Gold</b> · <a href="/wallet">get Gold</a></p>
        <label for="tb" class="sr">Message</label>
        <input id="tb" type="text" name="body" required minlength="3" maxlength="${TICKER_MAX_LENGTH}" placeholder="e.g. [RT] Round Table is recruiting!" class="tickerin">
        <p><label for="th">Show it for</label> <select id="th" name="hours">${Array.from({ length: TICKER_MAX_HOURS }, (_, i) => i + 1).map(
          (h) => html`<option value="${h}">${h} hour${h === 1 ? '' : 's'} - ${h * config.TICKER_PRICE_PER_HOUR} Gold</option>`,
        )}</select> ${goldBtn('Post and pay', config.TICKER_PRICE_PER_HOUR, d.balance >= config.TICKER_PRICE_PER_HOUR)} <span class="small muted">× hours</span></p>
      </form></section>
    <section class="spanel"><h3 class="sp-head">Your messages<span>${d.mine.length}</span></h3>
    ${d.mine.length === 0
      ? html`<p class="pad muted small">None yet.</p>`
      : html`<ul class="flist">${d.mine.map(
          (m) => html`<li>“${m.body}”<span class="fsum">${fmtSlot(m.startsAt)} → ${fmtSlot(m.endsAt)} · ${m.price} Gold
            ${m.status === 'removed' ? ' · removed by a moderator' : m.startsAt <= d.now && m.endsAt > d.now ? ' · live now' : m.endsAt <= d.now ? ' · ended' : ''}</span></li>`,
        )}</ul>`}</section>
    </div>`;
}

