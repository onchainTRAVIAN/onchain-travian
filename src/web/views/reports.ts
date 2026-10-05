import { RESOURCE_KEYS, sumRes, type Resources } from '../../game/rules/resources.js';
import { TRIBES } from '../../game/rules/units.js';
import { battleOutcome, type BattleReportData, type ReportData, type ReportSide } from '../../game/engine/reports.js';
import type { ReportFilter } from '../../game/queries.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon } from './layout.js';
import { paginate, unitIcon, unitsTable } from './parts.js';

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
function outcomeIcon(o: 'none' | 'some' | 'all'): SafeHtml {
  const [path, alt] = OUTCOME[o];
  return icon(path, alt, 16);
}

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attacks', label: 'Attacks' },
  { key: 'defense', label: 'Defence' },
  { key: 'scouting', label: 'Scouting' },
  { key: 'trade', label: 'Trade' },
  { key: 'other', label: 'Other' },
];

export function reportListView(d: {
  rows: { id: number; kind: string; title: string; isRead: boolean; createdAt: number; outcome?: 'none' | 'some' | 'all' | null }[];
  filter: ReportFilter;
  page: number;
  hasMore: boolean;
  now: number;
  csrf: string;
}): SafeHtml {
  return html`<h1>📜 Reports</h1>
    <nav class="tabs" aria-label="Report filter">${FILTERS.map(
      (f) => html`<a href="/reports?f=${f.key}" class="${f.key === d.filter ? 'on' : ''}">${f.label}</a>`,
    )}</nav>
    ${d.rows.length === 0
      ? html`<p class="muted">No reports yet. Battles, scouting and reinforcements show up here.</p>`
      : html`<form method="post" action="/reports/bulk" class="bulk">${csrfField(d.csrf)}<input type="hidden" name="f" value="${d.filter}">
        <table class="tb"><thead><tr><th class="chk"><label class="sr" for="chkall">Select all</label><input type="checkbox" id="chkall" data-checkall title="Select all"></th><th></th><th>Subject:</th><th>Sent:</th></tr></thead><tbody>${d.rows.map(
          (r) => html`<tr class="${r.isRead ? '' : 'unread'}"><td class="chk"><label class="sr" for="r${r.id}">Select</label><input type="checkbox" id="r${r.id}" name="ids" value="${r.id}"></td><td>${r.outcome ? outcomeIcon(r.outcome) : kindIcon(r.kind)}</td>
            <td><a href="/reports/${r.id}">${r.title}</a>${r.isRead ? '' : html` <span class="small bad">(new)</span>`}</td><td class="nowrap">${fmtAgo(r.createdAt, d.now)}</td></tr>`,
        )}</tbody></table>
        <p class="bulkbar"><button type="submit" name="act" value="delete" class="small">Delete selected</button>
          <button type="submit" name="act" value="read" class="small secondary">Mark selected as read</button>
          <span class="sep"></span>
          <button type="submit" name="act" value="readall" class="small secondary">Mark all as read</button>
          <button type="submit" name="act" value="deleteall" class="small secondary" data-confirm="Delete all ${d.filter === 'all' ? '' : 'these '}reports? This can't be undone.">Delete all${d.filter === 'all' ? '' : ' in this tab'}</button></p>
        </form>`}
    ${paginate(`/reports?f=${d.filter}`, d.page, d.hasMore)}`;
}

type HeroLine = NonNullable<BattleReportData['heroes']>[number];

/** Simulator link with what the scouts saw (up to three armies, the wall) and your own troops. */
function scoutSimLink(r: BattleReportData): string {
  const p: Record<string, string> = { mine: '1', mode: 'attack' };
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
  return `/simulator?${simParams(p)}`;
}

function simParams(p: Record<string, string>): string {
  return new URLSearchParams(p).toString();
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
      ? html`<p class="muted small">No information was gathered — none of your soldiers survived.</p>`
      : html`${unitsTable(s.tribe, s.units, s.losses, { hero: !!hero, heroLost: hero?.died })}
        <p class="rloss small">${sent > 0 ? html`Lost <b>${fmtNum(lost)}</b> of ${fmtNum(sent)} soldiers${lost === 0 ? ' — no losses' : lost >= sent ? ' — all troops lost' : ''}` : 'No soldiers'}</p>
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
      ? html`<p class="good">🧺 Your settlers founded <b>${r.villageName ?? 'a new village'}</b> at <a href="/map/tile?x=${r.x}&amp;y=${r.y}">(${r.x}|${r.y})</a>.</p>`
      : html`<p class="bad">${r.reason ?? 'It did not work out.'}</p>`;
  else
    body = d.title.startsWith('Troops starved')
      ? html`<p class="bad">Your granary ran empty and these troops deserted from ${r.villageName}:</p>${unitsTable(r.tribe, r.units, undefined, { hideEmpty: true })}`
      : html`<p>Troops returned to ${r.villageName}.</p>${unitsTable(r.tribe, r.units, undefined, { hideEmpty: true })}`;
  const outcome = r && r.type === 'battle' ? battleOutcomeOf(r, d.viewerId) : null;
  return html`<div class="spanel rephead">
      <span class="ricon">${outcome ? icon(`ui/rep-${outcome === 'none' ? 'g' : outcome === 'some' ? 'y' : 'r'}`, '', 28) : icon('ui/report', '', 28)}</span>
      <div class="rtitle"><h1>${d.title}</h1><span class="small muted">${fmtDateTime(d.createdAt)} UTC</span></div>
      <div class="racts"><a class="btn small secondary" href="/reports">All reports</a>
        <form method="post" action="/reports/${d.id}/delete" class="inline">${csrfField(d.csrf)}<button type="submit" class="small secondary">Delete</button></form></div>
    </div>
    ${body}`;
}
