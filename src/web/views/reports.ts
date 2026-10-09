import { simLink } from './map.js';
import { RESOURCE_KEYS, sumRes, type Resources } from '../../game/rules/resources.js';
import { TRIBES } from '../../game/rules/units.js';
import { battleOutcome, type BattleReportData, type ReportData, type ReportSide } from '../../game/engine/reports.js';
import type { ReportFilter } from '../../game/queries.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon } from './layout.js';
import { pager, unitIcon, unitsTable } from './parts.js';

const KIND_ICON: Record<string, [string, string]> = {
  attack_won: ['ui/win', 'Won as attacker'],
  attack_lost: ['ui/loss', 'Lost as attacker'],
  defense_won: ['ui/win', 'Won as defender'],
  defense_lost: ['ui/loss', 'Lost as defender'],
  scout: ['ui/scout', 'Scouting'],
  reinforce: ['ui/reinforce', 'Reinforcement'],
  return: ['ui/return', 'Return'],
  trade: ['ui/merchant', 'Trade'],
  settle: ['ui/outgoing', 'New village'],
  starvation: ['ui/loss', 'Starvation'],
};

function kindIcon(kind: string): SafeHtml {
  const [path, alt] = KIND_ICON[kind] ?? ['ui/report', 'Report'];
  return icon(path, alt, 16);
}

/** Same rule as the report list colours: own losses none / some / all. */
function battleOutcomeOf(r: BattleReportData, viewerId: number): 'none' | 'some' | 'all' | null {
  return battleOutcome(JSON.stringify(r), viewerId);
}

const OUTCOME: Record<'none' | 'some' | 'all', [string, string]> = {
  none: ['ui/rep-g', 'No losses'],
  some: ['ui/rep-y', 'Some troops lost'],
  all: ['ui/rep-r', 'All troops lost'],
};
/** "Attack again": the send form prefilled with the same target, mission, troops and hero (your own attacks only). */
export function againLink(r: ReportData | null, viewerId: number): string | null {
  if (!r || r.type !== 'battle' || r.attacker.userId !== viewerId) return null;
  const to = r.oasis ?? r.target ?? (r.defenders[0] ? { x: r.defenders[0].x, y: r.defenders[0].y } : null);
  if (!to) return null;
  const p = new URLSearchParams({ x: String(to.x), y: String(to.y), kind: r.mode });
  r.attacker.units.forEach((n, i) => {
    if (n > 0) p.set(`u${i}`, String(n));
  });
  if (r.heroes?.some((h) => h.side === 'attacker' && h.userId === viewerId)) p.set('hero', '1');
  return `/troops/send?${p.toString()}`;
}

/** Report list icon: loss colour for battles, else the kind's icon. */
export function reportIcon(kind: string, outcome: string | null): SafeHtml {
  return outcome === 'none' || outcome === 'some' || outcome === 'all' ? outcomeIcon(outcome) : kindIcon(kind);
}

function outcomeIcon(o: 'none' | 'some' | 'all'): SafeHtml {
  const [path, alt] = OUTCOME[o];
  return icon(path, alt, 16);
}

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attacks', label: 'Offensive' },
  { key: 'defense', label: 'Defensive' },
  { key: 'scouting', label: 'Scouting' },
  { key: 'trade', label: 'Trade' },
  { key: 'other', label: 'Other' },
];

export function reportListView(d: {
  rows: { id: number; kind: string; title: string; isRead: boolean; createdAt: number; outcome?: 'none' | 'some' | 'all' | null }[];
  filter: ReportFilter;
  outcome?: 'none' | 'some' | 'all' | null;
  oldest: boolean;
  page: number;
  pages: number;
  total: number;
  now: number;
  csrf: string;
}): SafeHtml {
  const q = (o: { f?: ReportFilter; o?: string | null; old?: boolean }) => {
    const p = new URLSearchParams();
    p.set('f', o.f ?? d.filter);
    const oc = o.o === undefined ? d.outcome : o.o;
    if (oc) p.set('o', oc);
    if (o.old ?? d.oldest) p.set('sort', 'old');
    return `/reports?${p.toString()}`;
  };
  const buttons = html`<div class="rbtns"><button type="submit" name="act" value="readall" class="gbtn green">Mark all as read</button>
    <button type="submit" name="act" value="deleteall" class="gbtn secondary" data-confirm="Delete all ${d.filter === 'all' ? '' : 'these '}reports? This can't be undone.">Delete all${d.filter === 'all' ? '' : ' in this tab'}</button></div>`;
  const selRow = (id: string) => html`<div class="rsel"><label><input type="checkbox" id="${id}" data-checkall> Select all</label>
    <span class="rselact"><button type="submit" name="act" value="read" class="small secondary">Mark as read</button> <button type="submit" name="act" value="delete" class="small secondary">Delete</button></span></div>`;
  return html`<h1>Reports</h1>
    <nav class="woodtabs" aria-label="Report folders">${FILTERS.map(
      (f) => html`<a href="${q({ f: f.key })}" class="${f.key === d.filter ? 'on' : ''}"${f.key === d.filter ? html` aria-current="page"` : ''}>${f.label}</a>`,
    )}</nav>
    <div class="woodbody">
    <form method="post" action="/reports/bulk" class="bulk">${csrfField(d.csrf)}<input type="hidden" name="f" value="${d.filter}">
      <div class="rtop">${buttons}
        <p class="routc small">Losses: ${[
          { key: null, label: 'any', ico: '' },
          { key: 'none', label: 'none', ico: 'ui/rep-g' },
          { key: 'some', label: 'some', ico: 'ui/rep-y' },
          { key: 'all', label: 'all', ico: 'ui/rep-r' },
        ].map((o) => html`<a href="${q({ o: o.key })}" class="${(d.outcome ?? null) === o.key ? 'on' : ''}">${o.ico ? icon(o.ico, '', 14) : ''} ${o.label}</a>`)}</p></div>
      ${selRow('chkall')}
      <table class="tb rlist"><thead><tr><th class="chk"></th><th class="rico"></th><th>Subject:</th>
        <th class="rrecv"><a href="${q({ old: !d.oldest })}" title="${d.oldest ? 'Oldest first - click for newest first' : 'Newest first - click for oldest first'}">Received ${d.oldest ? '▲' : '▼'}</a></th></tr></thead><tbody>
      ${d.rows.length === 0
        ? html`<tr><td colspan="4" class="rnone">${d.outcome ? 'No reports match this filter.' : 'There are no reports available.'}</td></tr>`
        : d.rows.map(
            (r) => html`<tr class="${r.isRead ? '' : 'unread'}"><td class="chk"><label class="sr" for="r${r.id}">Select</label><input type="checkbox" id="r${r.id}" name="ids" value="${r.id}"></td><td class="rico">${r.outcome ? outcomeIcon(r.outcome) : kindIcon(r.kind)}</td>
              <td><a href="/reports/${r.id}">${r.title}</a>${r.isRead ? '' : html` <span class="rnew">new</span>`}</td><td class="nowrap rrecv">${fmtAgo(r.createdAt, d.now)}</td></tr>`,
          )}
      </tbody></table>
      ${selRow('chkall2')}
      <div class="rbottom">${buttons}${pager(q({}), d.page, d.pages)}</div>
    </form>
    <p class="small muted rnote">${fmtNum(d.total)} report${d.total === 1 ? '' : 's'} in this folder. Unread reports are bold; the coloured dot shows your losses (green none, yellow some, red all).</p>
    </div>`;
}

type HeroLine = NonNullable<BattleReportData['heroes']>[number];

/** Simulator link with what the scouts saw (up to three armies, the wall) and your own troops. */
function scoutSimLink(r: BattleReportData): string {
  const p: Record<string, string> = { mode: 'attack' };
  if (r.oasis) {
    p.oasis = '1';
  }
  (r.scout?.troops ?? []).slice(0, 3).forEach((t, k) => {
    p[`d${k + 1}_t`] = t.tribe;
    t.units.forEach((n, i) => {
      if (n > 0) p[`d${k + 1}${i}`] = String(n);
    });
  });
  if (r.scout?.wallLevel) p.wall = String(r.scout.wallLevel);
  return simLink(p);
}


/** Bar comparing two strengths (or carried vs capacity); SVG so it works under the CSP. */
function splitBar(a: number, b: number, clsA: string, clsB: string): SafeHtml {
  const total = a + b;
  const w = total > 0 ? Math.max(1, Math.min(99, Math.round((a / total) * 100))) : 50;
  return html`<svg class="rbar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="8" class="${clsB}"></rect><rect width="${w}" height="8" class="${clsA}"></rect></svg>`;
}


function sideBlock(title: string, role: 'att' | 'def', s: ReportSide, hideUnits = false, extra?: SafeHtml, hero?: HeroLine): SafeHtml {
  const sent = s.units.reduce((x, y) => x + y, 0);
  const lost = s.losses.reduce((x, y) => x + y, 0);
  return html`<section class="spanel rside ${role}">
    <h3 class="sp-head"><span class="rrole">${title}</span>
      <span class="rwho"><img src="/static/img/units/${s.tribe}-1.svg" width="14" height="14" alt="${TRIBES[s.tribe].name}" class="tmark"> <a href="/player/${s.userId ?? 0}">${s.username}</a> · <a href="/map/tile?x=${s.x}&amp;y=${s.y}">${s.villageName}</a> <span class="co">(${s.x}|${s.y})</span></span></h3>
    <div class="pad">${hideUnits
      ? html`<p class="muted small">No information was gathered - none of your soldiers survived.</p>`
      : html`${unitsTable(s.tribe, s.units, s.losses, { hero: !!hero, heroLost: hero?.died })}
        <p class="rloss small">${sent > 0 ? html`Lost <b>${fmtNum(lost)}</b> of ${fmtNum(sent)} soldiers${lost === 0 ? ' - no losses' : lost >= sent ? ' - all troops lost' : ''}` : 'No soldiers'}</p>
        ${hero ? html`<p class="small herorow">${unitIcon(s.tribe, 10, 16, false)} <b>${hero.name}</b>: ${hero.died ? html`<b class="bad">fell in battle</b>` : html`health ${hero.health}%`} · +${fmtNum(hero.xp)} experience</p>` : ''}`}
      ${extra ?? ''}</div></section>`;
}

function battleView(r: BattleReportData, viewerId: number): SafeHtml {
  const isAttacker = r.attacker.userId === viewerId;
  // Heroes go into their side's troop table (older reports have no owner: first defender block).
  const attackerHero = r.heroes?.find((h) => h.side === 'attacker');
  const defHeroes = r.heroes?.filter((h) => h.side === 'defender') ?? [];
  const defenderHero = (s: ReportSide, i: number) =>
    defHeroes.find((h) => h.userId !== undefined && h.userId === s.userId) ?? (i === 0 ? defHeroes.find((h) => h.userId === undefined) : undefined);
  const won = isAttacker ? r.attackerWon : !r.attackerWon;
  const headline =
    r.mode === 'scout'
      ? r.attackerWon
        ? 'Scouting successful'
        : 'Scouts were caught'
      : won
        ? isAttacker
          ? 'Victory'
          : 'Your defence held'
        : isAttacker
          ? 'Defeat'
          : 'The village was overrun';
  const looted = sumRes(r.loot);
  const bounty =
    r.mode !== 'scout' && (looted > 0 || r.capacity > 0)
      ? html`<div class="rbounty"><b>Bounty</b><span class="cost">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(r.loot[k])}</span>`)}</span>
          <span class="rcarry">${splitBar(looted, Math.max(0, r.capacity - looted), 'fg', 'bg')}<span class="small muted">${fmtNum(looted)} of ${fmtNum(r.capacity)} carried${r.capacity > 0 ? ` (${Math.round((looted / r.capacity) * 100)}%)` : ''}</span></span></div>`
      : undefined;
  const events: SafeHtml[] = [];
  if (r.wall) events.push(html`<li><b>Wall</b> level ${r.wall.from} → <b>${r.wall.to}</b></li>`);
  if (r.building) events.push(html`<li><b>${r.building.name}</b> level ${r.building.from} → <b>${r.building.to}</b></li>`);
  if (r.loyalty) events.push(html`<li><b>Loyalty</b> ${r.loyalty.from}% → <b>${r.loyalty.to}%</b></li>`);
  if (r.conquered) events.push(html`<li class="good"><b>The village was conquered!</b></li>`);
  if (r.oasis?.captured) events.push(html`<li class="good"><b>Oasis captured!</b></li>`);
  for (const n of r.notes ?? []) events.push(html`<li class="small">${n}</li>`);
  return html`<div class="rbanner ${r.mode === 'scout' ? 'scout' : ''} ${won ? 'win' : 'loss'}">
      <b>${headline}</b>
      ${r.mode !== 'scout'
        ? html`<span class="rpow">${splitBar(r.attackPower, r.defensePower, 'att', 'def')}<span class="small"><span class="ca">attack ${fmtNum(r.attackPower)}</span> vs <span class="cd">defence ${fmtNum(r.defensePower)}</span></span></span>`
        : ''}
    </div>
    ${sideBlock('Attacker', 'att', r.attacker, false, bounty, attackerHero)}
    ${r.mode !== 'scout'
      ? r.defenders.length === 0
        ? html`<section class="spanel rside def"><h3 class="sp-head"><span class="rrole">Defender</span></h3><p class="pad muted small">The village was undefended.</p></section>`
        : r.defenders.map((s, i) => sideBlock(i === 0 ? 'Defender' : 'Reinforcement', 'def', s, r.defendersHidden && isAttacker, undefined, defenderHero(s, i)))
      : ''}
    ${events.length ? html`<section class="spanel"><h3 class="sp-head">Aftermath</h3><ul class="revents">${events}</ul></section>` : ''}
    ${r.scout?.success && isAttacker
      ? html`<section class="spanel"><h3 class="sp-head">Intelligence<span><a href="${scoutSimLink(r)}">simulate an attack »</a></span></h3><div class="pad">
        ${r.scout.resources ? html`<p><b>Resources</b> <span class="cost">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(r.scout?.resources?.[k] ?? 0)}</span>`)}</span></p>` : ''}
        <p class="small"><b>Wall</b> level ${r.scout.wallLevel ?? 0} · <b>Cranny hides</b> ${typeof r.scout.crannyHides === 'object'
          ? RESOURCE_KEYS.map((k) => html`${resIcon(k)}${fmtNum((r.scout?.crannyHides as Resources)[k])} `)
          : html`${fmtNum((r.scout.crannyHides as number | undefined) ?? 0)} of each`}</p>
        ${(r.scout.troops ?? []).every((t) => !t.hero && t.units.every((n) => n === 0)) ? html`<p class="muted small">No troops in the village.</p>` : (r.scout.troops ?? []).map((t) => unitsTable(t.tribe, t.units, undefined, { hero: !!t.hero, label: t.owner ?? 'Troops' }))}
        </div></section>`
      : ''}`;
}

export function reportView(d: { id: number; title: string; createdAt: number; data: ReportData | null; viewerId: number; csrf: string }): SafeHtml {
  let body: SafeHtml;
  const r = d.data;
  if (!r) body = html`<p class="muted">This report could not be read.</p>`;
  else if (r.type === 'battle') body = battleView(r, d.viewerId);
  else if (r.type === 'reinforce')
    body = html`<p><a href="/map/tile?x=${r.from.x}&amp;y=${r.from.y}">${r.from.villageName}</a> (${r.from.username}) reinforced
      <a href="/map/tile?x=${r.to.x}&amp;y=${r.to.y}">${r.to.villageName}</a> (${r.to.username}).</p>${unitsTable(r.from.tribe, r.units, undefined, { hideEmpty: true, hero: !!r.hero })}`;
  else if (r.type === 'trade')
    body = html`<p><a href="/map/tile?x=${r.fromX}&amp;y=${r.fromY}">${r.fromName}</a> → <a href="/map/tile?x=${r.toX}&amp;y=${r.toY}">${r.toName}</a></p>
      <div class="cost">${RESOURCE_KEYS.map((k) => html`<span>${resIcon(k)}${fmtNum(r.goods[k])}</span>`)}</div>`;
  else if (r.type === 'settle')
    body = r.success
      ? html`<p class="good">Your settlers founded <b>${r.villageName ?? 'a new village'}</b> at <a href="/map/tile?x=${r.x}&amp;y=${r.y}">(${r.x}|${r.y})</a>.</p>`
      : html`<p class="bad">${r.reason ?? 'It did not work out.'}</p>`;
  else
    body = d.title.startsWith('Troops starved')
      ? html`<p class="bad">Your granary ran empty and these troops deserted from ${r.villageName}:</p>${unitsTable(r.tribe, r.units, undefined, { hideEmpty: true })}`
      : html`<p>Troops returned to ${r.villageName}.</p>${unitsTable(r.tribe, r.units, undefined, { hideEmpty: true })}`;
  if (r && r.type !== 'battle') body = html`<section class="spanel"><div class="pad">${body}</div></section>`;
  const outcome = r && r.type === 'battle' ? battleOutcomeOf(r, d.viewerId) : null;
  return html`<div class="spanel rephead">
      <span class="ricon">${outcome ? icon(`ui/rep-${outcome === 'none' ? 'g' : outcome === 'some' ? 'y' : 'r'}`, '', 28) : icon('ui/report', '', 28)}</span>
      <div class="rtitle"><h1>${d.title}</h1><span class="small muted">${fmtDateTime(d.createdAt)} UTC</span></div>
      <div class="racts">${(() => {
        const again = againLink(r, d.viewerId);
        return again ? html`<a class="btn small" href="${again}">${r && r.type === 'battle' && r.mode === 'scout' ? 'Scout again' : 'Attack again'}</a> ` : '';
      })()}<a class="btn small secondary" href="/reports">All reports</a>
        <form method="post" action="/reports/${d.id}/delete" class="inline">${csrfField(d.csrf)}<button type="submit" class="small secondary">Delete</button></form></div>
    </div>
    ${body}`;
}
