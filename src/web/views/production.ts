import type { ResourceBreakdown } from '../../game/engine/breakdown.js';
import { RESOURCE_LABEL } from '../../game/rules/resources.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon, timer } from './layout.js';

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${fmtNum(Math.abs(Math.round(n)))}`;
const pctText = (p: number) => `${p >= 0 ? '+' : '−'}${Math.round(Math.abs(p) * 1000) / 10}%`;

export function productionView(d: { villageName: string; speed: number; rows: ResourceBreakdown[]; now: number }): SafeHtml {
  return html`<h1>Production <span class="lvl">${d.villageName}</span></h1>
    <p class="tabs">${d.rows.map((r) => html`<a href="#${r.key}">${resIcon(r.key)} ${RESOURCE_LABEL[r.key]}</a>`)}</p>
    <p class="small muted">Per hour, at world speed x${d.speed}. Bonuses are a share of the base production from your fields.</p>
    ${d.rows.map(
      (r) => html`<h2 id="${r.key}">${resIcon(r.key)} ${RESOURCE_LABEL[r.key]} <span class="small muted">${fmtNum(Math.round(r.net))} per hour</span></h2>
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
                (b) => html`<tr><td>${b.label}${b.endsAt ? html` <span class="small muted">(ends in ${timer(b.endsAt, d.now, false)})</span>` : ''}${b.note ? html` <span class="small muted">— ${b.note}</span>` : ''}</td>
                  <td class="small ${b.perHour < 0 ? 'bad' : 'good'}">${b.pct !== null ? pctText(b.pct) : ''}</td><td class="num ${b.perHour < 0 ? 'bad' : ''}">${signed(b.perHour)}</td></tr>`,
              )}
          <tr class="sum"><td><b>Production</b></td><td class="small">${r.base > 0 ? pctText(r.gross / r.base - 1) : ''}</td><td class="num"><b>${fmtNum(Math.round(r.gross))}</b></td></tr>
          ${r.upkeep.length
            ? html`<tr><th colspan="3">${icon('res/cropuse', 'Crop consumption', 18, 12)} Consumption</th></tr>
              ${r.upkeep.map((u) => html`<tr><td>${u.label}</td><td></td><td class="num bad">${signed(u.perHour)}</td></tr>`)}
              <tr class="sum"><td><b>Net crop</b></td><td></td><td class="num ${r.net < 0 ? 'bad' : ''}"><b>${signed(r.net)}</b></td></tr>`
            : ''}
        </tbody></table></div>`,
    )}`;
}
