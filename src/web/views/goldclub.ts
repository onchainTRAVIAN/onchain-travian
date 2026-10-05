import { AUTO_MINUTES, FARM_RADIUS_MAX, GOLD_CLUB_PRICE, type Cropper, type FarmEntry, type FarmList, type TradeRoute } from '../../game/actions/goldclub.js';
import { parseResources, parseUnits } from '../../game/engine/state.js';
import { RESOURCE_KEYS, RESOURCE_LABEL } from '../../game/rules/resources.js';
import { TRIBES, carryOf, type TribeId } from '../../game/rules/units.js';
import { fmtAgo, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, resIcon } from './layout.js';
import { unitIcon, unitsInline } from './parts.js';

export function goldClubLocked(): SafeHtml {
  return html`<div class="card"><b>Gold Club</b>
    <p class="small">Farm lists (raid many targets with one click, optionally automatically), evasion, trade routes and the cropper finder are part of the Gold Club: ${GOLD_CLUB_PRICE} Gold, once for the whole world.</p>
    <a class="btn" href="/shop#goldclub">Join the Gold Club</a></div>`;
}

export function goldClubCard(d: { member: boolean; balance: number; csrf: string }): SafeHtml {
  return html`<h2 id="goldclub">Gold Club</h2>
    <div class="card"><div class="cardrow"><b>Gold Club — for the whole world</b><span class="price">${GOLD_CLUB_PRICE} Gold</span></div>
      <ul class="small">
        <li><b>Farm lists</b> at the Rally Point: saved raid targets (villages and oases), sent with one click — or automatically every 15–120 minutes.</li>
        <li><b>Evasion</b>: your capital's troops slip away when an attack arrives and come back afterwards.</li>
        <li><b>Trade routes</b>: merchants deliver resources between your villages on a daily schedule.</li>
        <li><b>Cropper finder</b>: search the map for 9- and 15-crop villages with oasis bonus.</li>
      </ul>
      ${d.member
        ? html`<div class="small good">You are a Gold Club member.</div>`
        : html`<form method="post" action="/shop/goldclub">${csrfField(d.csrf)}<button type="submit"${d.balance < GOLD_CLUB_PRICE ? html` class="secondary"` : ''}>Join the Gold Club</button></form>`}
    </div>`;
}

const RESULT: Record<string, { icon: string; label: string }> = {
  won: { icon: 'ui/win', label: 'won without losses' },
  losses: { icon: 'ui/raid', label: 'won with losses' },
  lost: { icon: 'ui/loss', label: 'lost' },
};

export function farmListView(d: {
  tribe: TribeId;
  member: boolean;
  carryMult: number;
  villageName: string;
  isCapital: boolean;
  evade: boolean;
  lists: (FarmList & { villageName: string; entries: (FarmEntry & { target: string; result: { result: string; loot: number } | null; oasis: { stock: number; animals: number } | null })[] })[];
  places: { x: number; y: number; label: string }[];
  raider?: SafeHtml;
  csrf: string;
  now: number;
}): SafeHtml {
  const head = html`<h1>Rally Point</h1>
    <p class="tabs"><a href="/troops">Overview</a><a href="/troops/send">Send troops</a><a href="/troops/farmlist" class="on">Farm list</a></p>`;
  if (!d.member) return html`${head}${goldClubLocked()}`;
  const units = TRIBES[d.tribe].units;
  return html`${head}
    ${d.isCapital
      ? html`<form method="post" action="/goldclub/evade" class="block">${csrfField(d.csrf)}<input type="hidden" name="on" value="${d.evade ? '0' : '1'}">
          <p><b>Evasion</b> in ${d.villageName}: ${d.evade ? html`<span class="c1">on</span>` : html`<span class="none">off</span>`}
          <button type="submit" class="small secondary">${d.evade ? 'Turn off' : 'Turn on'}</button>
          <span class="small muted">Your capital's own troops leave when an attack or raid arrives and come back afterwards.</span></p></form>`
      : ''}
    ${d.raider ?? ''}
    <h2 class="customlists">Custom farm lists <span class="small muted">— your own targets (villages, chosen oases), sent with one click</span></h2>
    <form method="post" action="/goldclub/list" class="row">${csrfField(d.csrf)}
      <div><label for="fl" class="sr">New list</label><input id="fl" type="text" name="name" maxlength="30" placeholder="New farm list name"></div>
      <div><button type="submit" class="block">Create list (from ${d.villageName})</button></div>
    </form>
    ${d.lists.length === 0 ? html`<p class="none">No farm lists yet.</p>` : ''}
    ${d.lists.map(
      (l) => html`<details class="customlist"${l.entries.length <= 8 ? html` open` : ''}><summary><b>${l.name}</b> <span class="small muted">from ${l.villageName} · ${l.entries.length} targets${l.autoMinutes ? ` · auto every ${l.autoMinutes} min` : ''}</span></summary>
        <form method="post" action="/goldclub/raid">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
          <div class="mvscroll"><table class="tb"><thead><tr><th></th><th>Target</th><th>Troops</th><th>Last raid</th><th></th></tr></thead><tbody>
          ${l.entries.length === 0
            ? html`<tr><td colspan="5" class="none center">No targets yet — add some below.</td></tr>`
            : l.entries.map((e) => {
                const r = e.result ? RESULT[e.result.result] : undefined;
                return html`<tr><td><label class="sr" for="fe${e.id}">select</label><input id="fe${e.id}" type="checkbox" name="e${e.id}" value="1" checked></td>
                  <td><a href="/map/tile?x=${e.x}&amp;y=${e.y}">${e.target}</a> <span class="small muted">(${e.x}|${e.y})</span>
                    ${e.oasis ? html`<br><span class="small" title="Resources lying in the oasis now">${resIcon('wood')}${fmtNum(e.oasis.stock)} to loot</span>${e.oasis.animals > 0 ? html` <span class="small bad" title="Wild animals defend it">· ${fmtNum(e.oasis.animals)} animals</span>` : html` <span class="small good">· no animals</span>`}` : ''}</td>
                  <td class="small">${unitsInline(d.tribe, parseUnits(e.units))}<br><span class="muted">carries ${fmtNum(carryOf(d.tribe, parseUnits(e.units), d.carryMult))}</span></td>
                  <td class="small">${r && e.result
                    ? html`<img src="/static/img/${r.icon}.svg" width="16" height="16" alt="${r.label}" title="${r.label}"> ${fmtNum(e.result.loot)} loot`
                    : e.lastSentAt ? html`<span class="muted">on the way (${fmtAgo(e.lastSentAt, d.now)})</span>` : html`<span class="none">-</span>`}
                    ${e.lastNote ? html`<br><span class="bad">${e.lastNote}</span>` : ''}</td>
                  <td><button type="submit" form="del${e.id}" class="lnk small" aria-label="Remove target">✕</button></td></tr>`;
              })}
          </tbody></table></div>
          <p><button type="submit" name="all" value="1">Raid all</button> <button type="submit" class="secondary">Raid selected</button></p>
        </form>
        ${l.entries.map((e) => html`<form id="del${e.id}" method="post" action="/goldclub/entry/delete" hidden>${csrfField(d.csrf)}<input type="hidden" name="id" value="${e.id}"></form>`)}
        <form method="post" action="/goldclub/auto" class="block">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
          <label>Auto-repeat: <select name="minutes"><option value="">off</option>${AUTO_MINUTES.map(
            (m) => html`<option value="${m}"${l.autoMinutes === m ? html` selected` : ''}>every ${m} minutes</option>`,
          )}</select></label> <button type="submit" class="small secondary">Save</button>
          <span class="small muted">${l.autoMinutes ? `Raids are sent automatically every ${l.autoMinutes} minutes when the troops are home.` : 'Raids only go when you click.'}</span>
        </form>
        <form method="post" action="/goldclub/entry" class="block">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
          <p class="small"><b>Add target:</b> x <input type="number" name="x" class="w30" inputmode="numeric"> y <input type="number" name="y" class="w30" inputmode="numeric">
            ${d.places.length ? html`<span class="places">${d.places.map((p) => html`<a href="#" class="place" data-x="${p.x}" data-y="${p.y}">${p.label}</a> `)}</span>` : ''}</p>
          <p class="small">${units.slice(0, 8).map(
            (u, i) => html`<label class="nowrap">${unitIcon(d.tribe, i, 16, false)}<input type="number" name="t${i}" min="0" class="w30 su-in" inputmode="numeric" aria-label="${u.name}" title="${u.name}: carries ${Math.floor(u.carry * d.carryMult)} each" data-carry="${Math.floor(u.carry * d.carryMult * 100) / 100}"></label> `,
          )} <span class="small">Can carry: <b data-carrytotal>0</b></span> <button type="submit" class="small">Add</button>
          <button type="submit" formaction="/goldclub/oases" class="small secondary">Add all free oases</button>
          <label>within <input type="number" name="radius" min="1" max="${FARM_RADIUS_MAX}" value="10" class="w30" inputmode="numeric"> fields (up to ${FARM_RADIUS_MAX})</label>
          <label>with at least <input type="number" name="minRes" min="0" class="w60" inputmode="numeric" placeholder="0"> resources</label></p>
          <p class="small muted">Leave x and y empty for "Add all free oases": the troops above go to each of them.</p>
        </form>
        ${l.entries.some((e) => e.oasis)
          ? html`<form method="post" action="/goldclub/oases/prune" class="block">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
              <p class="small"><label>Remove oases with less than <input type="number" name="minRes" min="1" required class="w60" inputmode="numeric"> resources</label>
              <button type="submit" class="small secondary">Remove</button></p></form>`
          : ''}
        <form method="post" action="/goldclub/list/delete" class="inline">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}"><button type="submit" class="small secondary" data-confirm="Delete the list ${l.name}?">Delete this list</button></form></details>`,
    )}`;
}

export function tradeRoutesPanel(d: {
  member: boolean;
  routes: (TradeRoute & { fromName: string; toName: string })[];
  myVillages: { id: number; name: string }[];
  currentVillageId: number;
  csrf: string;
}): SafeHtml {
  if (!d.member) return html`<h2 id="routes">Trade routes</h2>${goldClubLocked()}`;
  const targets = d.myVillages.filter((v) => v.id !== d.currentVillageId);
  return html`<h2 id="routes">Trade routes</h2>
    ${d.routes.length
      ? html`<table class="tb"><thead><tr><th>From</th><th>To</th><th>Goods</th><th>When (UTC)</th><th></th></tr></thead><tbody>${d.routes.map((r) => {
          const g = parseResources(r.goods);
          const hours = Array.from({ length: r.perDay }, (_, k) => (r.hour + (k * 24) / r.perDay) % 24).map((h) => `${String(Math.floor(h)).padStart(2, '0')}:00`);
          return html`<tr><td>${r.fromName}</td><td>${r.toName}</td><td class="small">${RESOURCE_KEYS.filter((k) => g[k] > 0).map((k) => html`${resIcon(k)}${fmtNum(g[k])} `)}</td>
            <td class="small">${hours.join(', ')}${r.lastNote ? html`<br><span class="bad">${r.lastNote}</span>` : ''}</td>
            <td><form method="post" action="/goldclub/route/delete">${csrfField(d.csrf)}<input type="hidden" name="id" value="${r.id}"><button type="submit" class="lnk small" aria-label="Delete route">✕</button></form></td></tr>`;
        })}</tbody></table>`
      : html`<p class="small muted">No trade routes yet.</p>`}
    ${targets.length === 0
      ? html`<p class="small muted">Found or conquer a second village to set up routes between your villages.</p>`
      : html`<form method="post" action="/goldclub/route" class="block">${csrfField(d.csrf)}
          <p class="small">From this village to <select name="to">${targets.map((v) => html`<option value="${v.id}">${v.name}</option>`)}</select>
          at <select name="hour">${Array.from({ length: 24 }, (_, h) => html`<option value="${h}">${String(h).padStart(2, '0')}:00</option>`)}</select> UTC,
          <select name="perDay"><option value="1">once</option><option value="2">twice</option><option value="3">3 times</option></select> a day</p>
          <p class="small">${RESOURCE_KEYS.map((k) => html`<label class="nowrap">${resIcon(k)}<input type="number" name="${k}" min="0" class="w30" inputmode="numeric" aria-label="${RESOURCE_LABEL[k]}"></label> `)}
          <button type="submit" class="small">Create route</button></p>
        </form>`}`;
}

export function cropperView(d: { member: boolean; from: { x: number; y: number }; radius: number; rows: Cropper[] }): SafeHtml {
  const head = html`<h1>Cropper finder</h1>`;
  if (!d.member) return html`${head}${goldClubLocked()}`;
  return html`${head}
    <p class="tabs">${[10, 20, 30].map((r) => html`<a href="/map/croppers?r=${r}" class="${r === d.radius ? 'on' : ''}">within ${r} fields</a>`)}</p>
    <p class="small muted">9-crop (3-3-3-9) and 15-crop (1-1-1-15) villages around (${d.from.x}|${d.from.y}), with the best crop bonus from up to three oases within 3 fields.</p>
    <div class="tblwrap"><table><thead><tr><th>Field</th><th>Type</th><th class="num">Distance</th><th class="num">Oasis crop</th><th>Owner</th></tr></thead><tbody>
    ${d.rows.length === 0
      ? html`<tr><td colspan="5" class="none center">No croppers in range.</td></tr>`
      : d.rows.map(
          (c) => html`<tr><td><a href="/map/tile?x=${c.x}&amp;y=${c.y}">(${c.x}|${c.y})</a></td><td>${c.layout === '1-1-1-15' ? html`<b>15-crop</b>` : '9-crop'}</td>
            <td class="num">${c.distance.toFixed(1)}</td><td class="num">${c.oasisCrop > 0 ? `+${Math.round(c.oasisCrop * 100)}%` : '-'}</td>
            <td>${c.owner ?? html`<span class="c1">free</span>`}</td></tr>`,
        )}
    </tbody></table></div>`;
}
