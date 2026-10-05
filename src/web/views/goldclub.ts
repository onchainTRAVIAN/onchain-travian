import { AUTO_MINUTES, FARM_RADIUS_MAX, GOLD_CLUB_PRICE, type Cropper, type FarmEntry, type FarmList, type TradeRoute } from '../../game/actions/goldclub.js';
import { parseResources, parseUnits } from '../../game/engine/state.js';
import { RESOURCE_KEYS, RESOURCE_LABEL } from '../../game/rules/resources.js';
import { TRIBES, carryOf, type TribeId } from '../../game/rules/units.js';
import { fmtAgo, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon } from './layout.js';
import { rallyTabs } from './troops.js';
import { panel, unitIcon, unitsInline } from './parts.js';

export function goldClubLocked(): SafeHtml {
  return panel('Gold Club', html`<p class="small">Farm lists (raid many targets with one click, optionally automatically), evasion, trade routes and the cropper finder are part of the Gold Club: ${GOLD_CLUB_PRICE} Gold, once for the whole world.</p>
    <a class="gbtn" href="/shop?tab=adv#goldclub">Join the Gold Club <span class="gcoin">${icon('res/gold', 'Gold', 15, 10)}${GOLD_CLUB_PRICE}</span></a>`);
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
  /** The list shown opened (from ?list=). */
  openListId?: number | null;
  csrf: string;
  now: number;
}): SafeHtml {
  const head = html`<h1>Rally Point</h1>${rallyTabs('farmlist')}`;
  if (!d.member) return html`${head}<div class="woodbody">${goldClubLocked()}</div>`;
  const units = TRIBES[d.tribe].units;
  return html`${head}
    <div class="woodbody">
    ${d.isCapital
      ? html`<form method="post" action="/goldclub/evade" class="spanel evade">${csrfField(d.csrf)}<input type="hidden" name="on" value="${d.evade ? '0' : '1'}">
          <p class="pad"><b>Evasion</b> in ${d.villageName}: ${d.evade ? html`<span class="c1">on</span>` : html`<span class="none">off</span>`}
          <button type="submit" class="small secondary">${d.evade ? 'Turn off' : 'Turn on'}</button>
          <span class="small muted">Your capital's own troops leave when an attack or raid arrives and come back afterwards.</span></p></form>`
      : ''}
    ${d.raider ?? ''}
    ${customLists(d)}
    </div>`;
}

type ListsData = Parameters<typeof farmListView>[0];

/** Custom farm lists: an overview of all lists and one opened list in three simple steps. */
function customLists(d: ListsData): SafeHtml {
  const units = TRIBES[d.tribe].units;
  const open = d.lists.find((l) => l.id === d.openListId) ?? (d.lists.length === 1 ? d.lists[0] : undefined);
  const lastRaid = (l: ListsData['lists'][number]) => {
    const t = Math.max(0, ...l.entries.map((e) => e.lastSentAt ?? 0));
    return t > 0 ? fmtAgo(t, d.now) : '-';
  };
  const createForm = html`<form method="post" action="/goldclub/list" class="fl-new">${csrfField(d.csrf)}
      <label for="fl" class="sr">New list name</label><input id="fl" type="text" name="name" maxlength="30" placeholder="Name, e.g. Oases north" required>
      <button type="submit" class="small">+ New list</button></form>`;
  const overview = html`<section class="spanel" id="lists"><h3 class="sp-head">Custom farm lists<span>your own targets, sent with one click</span></h3>
    ${d.lists.length === 0
      ? html`<div class="pad fl-empty"><p><b>No lists yet.</b> A farm list is a saved set of targets (enemy villages or oases) with the troops to send to each. Create one, add targets, then press <b>Raid all</b> whenever your troops are home — or let it repeat by itself.</p>${createForm}</div>`
      : html`<table class="tb fl-table"><thead><tr><th>List</th><th class="num">Targets</th><th>Auto</th><th>Last raid</th><th></th></tr></thead><tbody>
          ${d.lists.map(
            (l) => html`<tr class="${open?.id === l.id ? 'hl' : ''}"><td><a href="/troops/farmlist?list=${l.id}#list"><b>${l.name}</b></a><br><span class="small muted">from ${l.villageName}</span></td>
              <td class="num">${l.entries.length}</td>
              <td>${l.autoMinutes ? html`<span class="pill on">every ${l.autoMinutes} min</span>` : html`<span class="pill">off</span>`}</td>
              <td class="small">${lastRaid(l)}</td>
              <td class="nowrap"><form method="post" action="/goldclub/raid" class="inline">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}"><button type="submit" name="all" value="1" class="small"${l.entries.length === 0 ? html` disabled` : ''}>Raid all</button></form>
                <a class="btn small secondary" href="/troops/farmlist?list=${l.id}#list">${open?.id === l.id ? 'Opened' : 'Open'}</a></td></tr>`,
          )}</tbody></table>
          <div class="pad">${createForm}</div>`}
    </section>`;
  if (!open) return overview;
  const l = open;
  const troopPicker = html`<div class="fl-troops"><span class="lbl">Troops per raid</span>${units.slice(0, 8).map(
    (u, i) => html`<label class="fl-unit" title="${u.name}: carries ${Math.floor(u.carry * d.carryMult)} each">${unitIcon(d.tribe, i, 18, false)}<input type="number" name="t${i}" min="0" class="su-in" inputmode="numeric" placeholder="0" aria-label="${u.name}" data-carry="${Math.floor(u.carry * d.carryMult * 100) / 100}"></label>`,
  )}<span class="small fl-carry">carries <b data-carrytotal>0</b></span></div>`;
  return html`${overview}
    <section class="spanel fl-open" id="list"><h3 class="sp-head">${l.name}<span>from ${l.villageName} · ${l.entries.length} target${l.entries.length === 1 ? '' : 's'}</span></h3>
      <div class="pad">
      <h4 class="fl-step"><span>1</span> Targets</h4>
      ${l.entries.length === 0
        ? html`<p class="fl-empty small">This list is empty. Add targets in step 2 — one village or oasis by its coordinates, or all free oases near ${l.villageName} at once.</p>`
        : html`<form method="post" action="/goldclub/raid">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
          <div class="mvscroll"><table class="tb"><thead><tr><th class="chk"><input type="checkbox" data-checkall title="Select all" checked aria-label="Select all"></th><th>Target</th><th>Troops</th><th>Last raid</th><th></th></tr></thead><tbody>
          ${l.entries.map((e) => {
            const r = e.result ? RESULT[e.result.result] : undefined;
            return html`<tr><td class="chk"><label class="sr" for="fe${e.id}">select</label><input id="fe${e.id}" type="checkbox" name="ids" value="${e.id}" checked></td>
              <td><a href="/map/tile?x=${e.x}&amp;y=${e.y}">${e.target}</a> <span class="small muted">(${e.x}|${e.y})</span>
                ${e.oasis ? html`<br><span class="small">${resIcon('wood')}${fmtNum(e.oasis.stock)} to loot</span>${e.oasis.animals > 0 ? html` <span class="small bad">· ${fmtNum(e.oasis.animals)} animals</span>` : html` <span class="small good">· no animals</span>`}` : ''}</td>
              <td class="small">${unitsInline(d.tribe, parseUnits(e.units))}<br><span class="muted">carries ${fmtNum(carryOf(d.tribe, parseUnits(e.units), d.carryMult))}</span></td>
              <td class="small">${r && e.result
                ? html`<img src="/static/img/${r.icon}.svg" width="16" height="16" alt="${r.label}" title="${r.label}"> ${fmtNum(e.result.loot)} loot`
                : e.lastSentAt ? html`<span class="muted">on the way (${fmtAgo(e.lastSentAt, d.now)})</span>` : html`<span class="none">not raided yet</span>`}
                ${e.lastNote ? html`<br><span class="bad">${e.lastNote}</span>` : ''}</td>
              <td><button type="submit" form="del${e.id}" class="lnk small" aria-label="Remove target" title="Remove from list">✕</button></td></tr>`;
          })}
          </tbody></table></div>
          <p class="fl-actions"><button type="submit" name="all" value="1">Raid all</button> <button type="submit" class="secondary">Raid selected</button>
            <span class="small muted">Targets whose troops aren't home are skipped and marked.</span></p>
        </form>
        ${l.entries.map((e) => html`<form id="del${e.id}" method="post" action="/goldclub/entry/delete" hidden>${csrfField(d.csrf)}<input type="hidden" name="id" value="${e.id}"></form>`)}`}

      <h4 class="fl-step"><span>2</span> Add targets</h4>
      <form method="post" action="/goldclub/entry" class="block">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
        ${troopPicker}
        <div class="fl-ways">
          <div class="fl-way"><b>One target</b><p class="small muted">A village or an oasis by its coordinates.</p>
            <p>x <input type="number" name="x" class="w30" inputmode="numeric"> y <input type="number" name="y" class="w30" inputmode="numeric"> <button type="submit" class="small">Add target</button></p>
            ${d.places.length ? html`<p class="small places">Saved: ${d.places.map((p) => html`<a href="#" class="place" data-x="${p.x}" data-y="${p.y}">${p.label}</a> `)}</p>` : ''}</div>
          <div class="fl-way"><b>Free oases nearby</b><p class="small muted">Every free oasis around ${l.villageName} that isn't on the list yet.</p>
            <p>within <input type="number" name="radius" min="1" max="${FARM_RADIUS_MAX}" value="10" class="w30" inputmode="numeric"> fields, at least <input type="number" name="minRes" min="0" class="w60" inputmode="numeric" placeholder="0"> loot
            <button type="submit" formaction="/goldclub/oases" class="small">Add oases</button></p></div>
        </div>
      </form>

      <h4 class="fl-step"><span>3</span> Settings</h4>
      <div class="fl-settings">
        <form method="post" action="/goldclub/auto" class="inline">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
          <label>Raid automatically <select name="minutes"><option value="">never (only when I click)</option>${AUTO_MINUTES.map(
            (m) => html`<option value="${m}"${l.autoMinutes === m ? html` selected` : ''}>every ${m} minutes</option>`,
          )}</select></label> <button type="submit" class="small secondary">Save</button></form>
        ${l.entries.some((e) => e.oasis)
          ? html`<form method="post" action="/goldclub/oases/prune" class="inline">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}">
              <label>Remove oases with less than <input type="number" name="minRes" min="1" required class="w60" inputmode="numeric"> loot</label> <button type="submit" class="small secondary">Remove</button></form>`
          : ''}
        <form method="post" action="/goldclub/list/delete" class="inline fl-del">${csrfField(d.csrf)}<input type="hidden" name="listId" value="${l.id}"><button type="submit" class="small secondary" data-confirm="Delete the list ${l.name} and its ${l.entries.length} targets?">Delete this list</button></form>
      </div>
      </div>
    </section>`;
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
    <nav class="pilltabs" aria-label="Range">${[10, 20, 30].map((r) => html`<a href="/map/croppers?r=${r}" class="${r === d.radius ? 'on' : ''}"${r === d.radius ? html` aria-current="page"` : ''}>within ${r} fields</a>`)}</nav>
    <p class="small muted">9-crop (3-3-3-9) and 15-crop (1-1-1-15) villages around (${d.from.x}|${d.from.y}), with the best crop bonus from up to three oases within 3 fields.</p>
    <div class="tblwrap"><table class="tb"><thead><tr><th>Field</th><th>Type</th><th class="num">Distance</th><th class="num">Oasis crop</th><th>Owner</th></tr></thead><tbody>
    ${d.rows.length === 0
      ? html`<tr><td colspan="5" class="none center">No croppers in range.</td></tr>`
      : d.rows.map(
          (c) => html`<tr><td><a href="/map/tile?x=${c.x}&amp;y=${c.y}">(${c.x}|${c.y})</a></td><td>${c.layout === '1-1-1-15' ? html`<b>15-crop</b>` : '9-crop'}</td>
            <td class="num">${c.distance.toFixed(1)}</td><td class="num">${c.oasisCrop > 0 ? `+${Math.round(c.oasisCrop * 100)}%` : '-'}</td>
            <td>${c.owner ?? html`<span class="c1">free</span>`}</td></tr>`,
        )}
    </tbody></table></div>`;
}
