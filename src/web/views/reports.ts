import { RESOURCE_ICON, RESOURCE_KEYS, sumRes } from '../../game/rules/resources.js';
import { TRIBES } from '../../game/rules/units.js';
import type { BattleReportData, ReportData, ReportSide } from '../../game/engine/reports.js';
import type { ReportFilter } from '../../game/queries.js';
import { fmtAgo, fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField } from './layout.js';
import { paginate, unitsTable } from './parts.js';

const KIND_ICON: Record<string, string> = {
  attack_won: '🟢⚔️',
  attack_lost: '🔴⚔️',
  defense_won: '🟢🛡️',
  defense_lost: '🔴🛡️',
  scout: '🔭',
  reinforce: '🛡️',
  return: '↩️',
};

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attacks', label: 'Attacks' },
  { key: 'defense', label: 'Defence' },
  { key: 'scouting', label: 'Scouting' },
  { key: 'other', label: 'Other' },
];

export function reportListView(d: {
  rows: { id: number; kind: string; title: string; isRead: boolean; createdAt: number }[];
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
      : html`<ul class="list">${d.rows.map(
          (r) => html`<li class="${r.isRead ? '' : 'unread'}"><span aria-hidden="true">${KIND_ICON[r.kind] ?? '📜'}</span>
            <span class="grow"><a href="/reports/${r.id}">${r.title}</a><span class="sub">${fmtAgo(r.createdAt, d.now)}</span></span></li>`,
        )}</ul>`}
    ${paginate(`/reports?f=${d.filter}`, d.page, d.hasMore)}
    ${d.rows.length > 0
      ? html`<form method="post" action="/reports/read-all" class="actions">${csrfField(d.csrf)}<button type="submit" class="small secondary">Mark all as read</button></form>`
      : ''}`;
}

function sideBlock(title: string, s: ReportSide, hideUnits = false): SafeHtml {
  return html`<h3>${title}: <a href="/map/tile?x=${s.x}&amp;y=${s.y}">${s.villageName}</a> <span class="muted small">${s.username} · ${TRIBES[s.tribe].name}</span></h3>
    ${hideUnits ? html`<p class="muted small">No information — none of your troops survived to tell.</p>` : unitsTable(s.tribe, s.units, s.losses, { label: 'Troops' })}`;
}

function battleView(r: BattleReportData, viewerId: number): SafeHtml {
  const isAttacker = r.attacker.userId === viewerId;
  const won = isAttacker ? r.attackerWon : !r.attackerWon;
  const headline =
    r.mode === 'scout'
      ? r.attackerWon
        ? 'Scouting successful'
        : 'Scouts were caught'
      : won
        ? isAttacker
          ? 'Victory!'
          : 'Your defence held!'
        : isAttacker
          ? 'Defeat'
          : 'The village was overrun';
  return html`<p class="${won ? 'good' : 'bad'}"><b>${headline}</b></p>
    ${sideBlock('Attacker', r.attacker)}
    ${r.mode !== 'scout'
      ? r.defenders.length === 0
        ? html`<h3>Defender</h3><p class="muted small">The village was undefended.</p>`
        : r.defenders.map((s, i) => sideBlock(i === 0 ? 'Defender' : 'Reinforcement', s, r.defendersHidden && isAttacker))
      : ''}
    ${r.mode !== 'scout' && sumRes(r.loot) > 0
      ? html`<h3>💰 Loot</h3><div class="cost">${RESOURCE_KEYS.map((k) => html`<span>${RESOURCE_ICON[k]} ${fmtNum(r.loot[k])}</span>`)}</div>
        <p class="small muted">${fmtNum(sumRes(r.loot))} / ${fmtNum(r.capacity)} carried</p>`
      : ''}
    ${r.wall ? html`<p>🧱 City Wall: level ${r.wall.from} → <b>${r.wall.to}</b></p>` : ''}
    ${r.building ? html`<p>☄️ ${r.building.name}: level ${r.building.from} → <b>${r.building.to}</b></p>` : ''}
    ${r.scout?.success && isAttacker
      ? html`<h3>🔭 Intelligence</h3>
        ${r.scout.resources ? html`<div class="cost">${RESOURCE_KEYS.map((k) => html`<span>${RESOURCE_ICON[k]} ${fmtNum(r.scout?.resources?.[k] ?? 0)}</span>`)}</div>` : ''}
        <p class="small">City Wall level ${r.scout.wallLevel ?? 0} · Cranny hides ${fmtNum(r.scout.crannyHides ?? 0)} of each</p>
        ${(r.scout.troops ?? []).length === 0 ? html`<p class="muted small">No troops in the village.</p>` : (r.scout.troops ?? []).map((t) => unitsTable(t.tribe, t.units))}`
      : ''}
    ${r.mode !== 'scout' ? html`<p class="small muted">Attack strength ${fmtNum(r.attackPower)} vs defence ${fmtNum(r.defensePower)}</p>` : ''}`;
}

export function reportView(d: { id: number; title: string; createdAt: number; data: ReportData | null; viewerId: number; csrf: string }): SafeHtml {
  let body: SafeHtml;
  const r = d.data;
  if (!r) body = html`<p class="muted">This report could not be read.</p>`;
  else if (r.type === 'battle') body = battleView(r, d.viewerId);
  else if (r.type === 'reinforce')
    body = html`<p><a href="/map/tile?x=${r.from.x}&amp;y=${r.from.y}">${r.from.villageName}</a> (${r.from.username}) reinforced
      <a href="/map/tile?x=${r.to.x}&amp;y=${r.to.y}">${r.to.villageName}</a> (${r.to.username}).</p>${unitsTable(r.from.tribe, r.units, undefined, { hideEmpty: true })}`;
  else body = html`<p>Troops returned to ${r.villageName}.</p>${unitsTable(r.tribe, r.units, undefined, { hideEmpty: true })}`;
  return html`<h1>${d.title}</h1>
    <p class="muted small">${fmtDateTime(d.createdAt)} UTC</p>
    ${body}
    <div class="actions">
      <a class="btn secondary" href="/reports">← All reports</a>
      <form method="post" action="/reports/${d.id}/delete">${csrfField(d.csrf)}<button type="submit" class="secondary">🗑 Delete</button></form>
    </div>`;
}
