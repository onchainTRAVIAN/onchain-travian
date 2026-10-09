import type { ResourceBreakdown } from '../../game/engine/breakdown.js';
import { RESOURCE_LABEL } from '../../game/rules/resources.js';
import { fmtNum, fmtSigned } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon, timer } from './layout.js';

const signed = (n: number) => fmtSigned(Math.round(n));
const pctText = (p: number) => `${p >= 0 ? '+' : '−'}${Math.round(Math.abs(p) * 1000) / 10}%`;

export function productionView(d: { villageName: string; speed: number; rows: ResourceBreakdown[]; now: number }): SafeHtml {
  return html`<div class="vtitle"><h1>Production</h1><span class="vmeta">${d.villageName} · per hour at world speed x${d.speed}</span></div>
    <nav class="pilltabs" aria-label="Resource">${d.rows.map((r) => html`<a href="#${r.key}">${resIcon(r.key)} ${RESOURCE_LABEL[r.key]}</a>`)}</nav>
    ${d.rows.map(
      (r) => html`<section class="spanel" id="${r.key}"><h3 class="sp-head"><span class="sph">${resIcon(r.key)} ${RESOURCE_LABEL[r.key]}</span><span>${fmtNum(Math.round(r.net))} per hour</span></h3>
        <div class="tblwrap"><table class="tb prodtb"><tbody>
          <tr><th colspan="3">Base production</th></tr>
          ${r.fields.length === 0
            ? html`<tr><td colspan="3" class="none">No fields producing ${RESOURCE_LABEL[r.key].toLowerCase()}.</td></tr>`
            : r.fields.map(
                (f) => html`<tr><td>${f.count} × ${f.name}</td><td class="small muted">level ${f.level}</td><td class="num">${fmtNum(Math.round(f.perHour))}</td></tr>`,
              )}
          <tr class="sum"><td><b>Base</b></td><td></td><td class="num"><b>${fmtNum(Math.round(r.base))}</b></td></tr>
          <tr><th colspan="3">Bonuses on top</th></tr>
          ${r.bonuses.length === 0
            ? html`<tr><td colspan="3" class="none">No bonuses. Oases, ${r.key === 'crop' ? 'Grain Mill, Bakery' : r.key === 'wood' ? 'Sawmill' : r.key === 'clay' ? 'Brickyard' : 'Iron Foundry'} and Gold boosts add more.</td></tr>`
            : r.bonuses.map(
                (b) => html`<tr><td>${b.label}${b.endsAt ? html` <span class="small muted">(ends in ${timer(b.endsAt, d.now, false)})</span>` : ''}${b.note ? html` <span class="small muted">- ${b.note}</span>` : ''}</td>
                  <td class="small ${b.perHour < 0 ? 'bad' : 'good'}">${b.pct !== null ? pctText(b.pct) : ''}</td><td class="num ${b.perHour < 0 ? 'bad' : ''}">${signed(b.perHour)}</td></tr>`,
              )}
          <tr class="sum"><td><b>Production</b></td><td class="small">${r.base > 0 ? pctText(r.gross / r.base - 1) : ''}</td><td class="num"><b>${fmtNum(Math.round(r.gross))}</b></td></tr>
          ${r.upkeep.length
            ? html`<tr><th colspan="3">${icon('res/cropuse', 'Crop consumption', 18, 12)} Consumption</th></tr>
              ${r.upkeep.map((u) => html`<tr><td>${u.label}</td><td></td><td class="num bad">${signed(u.perHour)}</td></tr>`)}
              <tr class="sum"><td><b>Net crop</b></td><td></td><td class="num ${r.net < 0 ? 'bad' : ''}"><b>${signed(r.net)}</b></td></tr>`
            : ''}
        </tbody></table></div></section>`,
    )}
    <p class="small muted">Bonuses are a share of the base production from your fields.</p>`;
}
