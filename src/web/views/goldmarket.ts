import type { ListingView } from '../../game/actions/goldmarket.js';
import { LISTING_MAX_PRICE, SELLABLE_SLOTS, deliveryTimeMs } from '../../game/actions/goldmarket.js';
import { parseResources, parseUnits } from '../../game/engine/state.js';
import { RESOURCE_KEYS, RESOURCE_LABEL, sumRes, type Resources } from '../../game/rules/resources.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import { fmtAgo, fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon } from './layout.js';
import { unitIcon, unitsInline } from './parts.js';

export type GoldTab = 'resources' | 'troops' | 'sell' | 'mine';

function goodsCell(l: ListingView): SafeHtml {
  if (l.kind === 'troops') return unitsInline((l.tribe in TRIBES ? l.tribe : 'romans') as TribeId, parseUnits(l.units));
  const g = parseResources(l.goods);
  return html`${RESOURCE_KEYS.filter((k) => g[k] > 0).map((k) => html`<span class="nowrap">${resIcon(k)} ${fmtNum(g[k])}</span> `)}`;
}

function gold(n: number): SafeHtml {
  return html`<span class="nowrap">${icon('res/gold', 'Gold', 18, 12)} <b>${fmtNum(n)}</b></span>`;
}

export function goldMarketView(d: {
  tab: GoldTab;
  tribe: TribeId;
  balance: number;
  here: { x: number; y: number; name: string };
  stock: Resources;
  home: UnitCounts;
  listings: ListingView[];
  userId: number;
  csrf: string;
  now: number;
}): SafeHtml {
  const t = (id: GoldTab, label: string) => html`<a href="/goldmarket?tab=${id}" class="${d.tab === id ? 'on' : ''}">${label}</a>`;
  const tribeName = TRIBES[d.tribe].name;
  const head = html`<h1>Gold market</h1>
    <p class="small">Buy and sell resources and troops for Gold with other players. Your balance: ${gold(d.balance)}
      · deliveries go to <b>${d.here.name}</b> (${d.here.x}|${d.here.y}).</p>
    <p class="tabs">${t('resources', 'Buy resources')}${t('troops', `Buy ${tribeName} troops`)}${t('sell', 'Sell')}${t('mine', 'My offers')}</p>`;

  const time = (l: ListingView) =>
    l.fromX !== null && l.fromY !== null ? fmtDuration(deliveryTimeMs(l, { x: l.fromX, y: l.fromY }, d.here)) : '-';
  const buyBtn = (l: ListingView) =>
    html`<form method="post" action="/goldmarket/buy">${csrfField(d.csrf)}<input type="hidden" name="id" value="${l.id}">
      <button type="submit" class="small${d.balance < l.price ? ' secondary' : ''}">Buy</button></form>`;

  if (d.tab === 'resources' || d.tab === 'troops') {
    const isRes = d.tab === 'resources';
    return html`${head}
      ${isRes
        ? html`<p class="small muted">Cheapest first. Resources arrive by merchant; anything over your storage is lost, so make room first.</p>`
        : html`<p class="small muted">You can only buy troops of your own tribe (${tribeName}). They walk to your village and join your army.</p>`}
      <div class="tblwrap"><table><thead><tr><th>Offer</th>${isRes ? html`<th>Per 1,000</th>` : ''}<th>Price</th><th>Seller</th><th>Time</th><th></th></tr></thead><tbody>
      ${d.listings.length === 0
        ? html`<tr><td colspan="${isRes ? 6 : 5}" class="none center">No offers right now. <a href="/goldmarket?tab=sell">Sell something yourself »</a></td></tr>`
        : d.listings.map(
            (l) => html`<tr><td>${goodsCell(l)}</td>
              ${isRes ? html`<td class="num small">${(l.price / Math.max(1, sumRes(parseResources(l.goods)) / 1000)).toFixed(1)}</td>` : ''}
              <td class="num">${gold(l.price)}</td>
              <td><a href="/player/${l.sellerId}">${l.seller}</a></td><td class="num">${time(l)}</td>
              <td class="center">${buyBtn(l)}</td></tr>`,
          )}
      </tbody></table></div>`;
  }

  if (d.tab === 'sell') {
    const units = TRIBES[d.tribe].units;
    return html`${head}
      <h2>Sell resources</h2>
      <form method="post" action="/goldmarket/sell/resources" class="block">${csrfField(d.csrf)}
        <table class="tb"><tbody>
        ${RESOURCE_KEYS.map(
          (k) => html`<tr><td>${resIcon(k)} <label for="sr${k}">${RESOURCE_LABEL[k]}</label></td>
            <td><input id="sr${k}" type="number" name="${k}" min="0" max="${Math.floor(d.stock[k])}" value="0" inputmode="numeric"></td>
            <td class="small muted">you have ${fmtNum(Math.floor(d.stock[k]))}</td></tr>`,
        )}
        <tr><td><label for="srp">Price</label></td><td><input id="srp" type="number" name="price" min="1" max="${LISTING_MAX_PRICE}" required inputmode="numeric"> Gold</td><td></td></tr>
        </tbody></table>
        <p><button type="submit">Put on the market</button></p>
      </form>
      <h2>Sell troops</h2>
      <p class="small muted">Only troops at home in ${d.here.name}. Settlers and chiefs can't be sold. Only ${tribeName} players can buy them.</p>
      <form method="post" action="/goldmarket/sell/troops" class="block">${csrfField(d.csrf)}
        <table class="tb"><tbody>
        ${SELLABLE_SLOTS.map((i) => {
          const have = d.home[i] ?? 0;
          return html`<tr><td>${unitIcon(d.tribe, i)} <label for="st${i}">${units[i]?.name ?? ''}</label></td>
            <td>${have > 0 ? html`<input id="st${i}" type="number" name="t${i}" min="0" max="${have}" value="0" inputmode="numeric">` : html`<span class="none">-</span>`}</td>
            <td class="small muted">at home ${fmtNum(have)}</td></tr>`;
        })}
        <tr><td><label for="stp">Price</label></td><td><input id="stp" type="number" name="price" min="1" max="${LISTING_MAX_PRICE}" required inputmode="numeric"> Gold</td><td></td></tr>
        </tbody></table>
        <p><button type="submit">Put on the market</button></p>
      </form>
      <p class="small muted">Your goods are held by the market until someone buys them. Cancel any time under “My offers” to get them back.</p>`;
  }

  return html`${head}
    <div class="tblwrap"><table><thead><tr><th>Offer</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>
    ${d.listings.length === 0
      ? html`<tr><td colspan="4" class="none center">You have no offers or purchases yet.</td></tr>`
      : d.listings.map((l) => {
          const mine = l.sellerId === d.userId;
          const status =
            l.status === 'open'
              ? html`<span class="c1">on sale</span> <span class="small muted">${fmtAgo(l.createdAt, d.now)}</span>`
              : l.status === 'sold'
                ? mine
                  ? html`sold <span class="small muted">${fmtAgo(l.closedAt ?? l.createdAt, d.now)}</span>`
                  : html`bought from <a href="/player/${l.sellerId}">${l.seller}</a>`
                : html`<span class="none">cancelled</span>`;
          return html`<tr><td>${goodsCell(l)}</td><td class="num">${gold(l.price)}</td><td>${status}</td>
            <td class="center">${mine && l.status === 'open'
              ? html`<a href="/goldmarket/edit?id=${l.id}" class="btn small secondary">Edit</a>
                <form method="post" action="/goldmarket/cancel" class="inline">${csrfField(d.csrf)}<input type="hidden" name="id" value="${l.id}"><button type="submit" class="small secondary">Cancel</button></form>`
              : ''}</td></tr>`;
        })}
    </tbody></table></div>`;
}

/** Edit an open offer: price and amounts (inputs allow up to what's in the offer plus what's in the village). */
export function goldEditView(d: {
  listing: ListingView;
  stock: Resources;
  home: UnitCounts;
  villageName: string | null;
  csrf: string;
}): SafeHtml {
  const l = d.listing;
  const tribe = (l.tribe in TRIBES ? l.tribe : 'romans') as TribeId;
  const canChange = d.villageName !== null;
  let rows: SafeHtml;
  if (l.kind === 'resources') {
    const g = parseResources(l.goods);
    rows = html`${RESOURCE_KEYS.map(
      (k) => html`<tr><td>${resIcon(k)} <label for="er${k}">${RESOURCE_LABEL[k]}</label></td>
        <td><input id="er${k}" type="number" name="${k}" min="0" max="${g[k] + Math.floor(d.stock[k])}" value="${g[k]}" inputmode="numeric"${canChange ? '' : html` readonly`}></td>
        <td class="small muted">in offer ${fmtNum(g[k])}${canChange ? html`, in village ${fmtNum(Math.floor(d.stock[k]))}` : ''}</td></tr>`,
    )}`;
  } else {
    const u = parseUnits(l.units);
    const units = TRIBES[tribe].units;
    rows = html`${SELLABLE_SLOTS.map((i) => {
      const inOffer = u[i] ?? 0;
      const atHome = d.home[i] ?? 0;
      if (inOffer === 0 && atHome === 0) return '';
      return html`<tr><td>${unitIcon(tribe, i)} <label for="et${i}">${units[i]?.name ?? ''}</label></td>
        <td><input id="et${i}" type="number" name="t${i}" min="0" max="${inOffer + atHome}" value="${inOffer}" inputmode="numeric"${canChange ? '' : html` readonly`}></td>
        <td class="small muted">in offer ${fmtNum(inOffer)}${canChange ? html`, at home ${fmtNum(atHome)}` : ''}</td></tr>`;
    })}`;
  }
  return html`<h1>Edit offer</h1>
    <p class="tabs"><a href="/goldmarket?tab=mine">« My offers</a></p>
    <p class="small">${canChange
      ? html`Raising an amount takes the extra from <b>${d.villageName}</b>; lowering it gives the difference back right away.`
      : html`The village of this offer is no longer yours, so only the price can change.`}</p>
    <form method="post" action="/goldmarket/edit" class="block">${csrfField(d.csrf)}<input type="hidden" name="id" value="${l.id}">
      <table class="tb"><tbody>
        ${rows}
        <tr><td><label for="ep">Price</label></td><td><input id="ep" type="number" name="price" min="1" max="${LISTING_MAX_PRICE}" value="${l.price}" required inputmode="numeric"> Gold</td><td></td></tr>
      </tbody></table>
      <p><button type="submit">Save changes</button> <a href="/goldmarket?tab=mine" class="small">cancel</a></p>
    </form>`;
}
