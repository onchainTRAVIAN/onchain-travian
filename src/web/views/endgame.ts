import { panel } from './parts.js';
import { statsTabs } from './social.js';
import { ARTIFACT_INFO, type ArtifactKind, type ArtifactSize } from '../../game/actions/endgame.js';
import type { endgameOverview } from '../../game/actions/endgame.js';
import { fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { timer } from './layout.js';

type Overview = ReturnType<typeof endgameOverview>;
const SIZE: Record<ArtifactSize, string> = { small: 'Small (village)', large: 'Large (account)', unique: 'Unique (account)' };

export function artifactLabel(kind: ArtifactKind, size: ArtifactSize): SafeHtml {
  return html`<b>${ARTIFACT_INFO[kind].name}</b> <span class="small muted">${kind === 'plan' ? '' : SIZE[size]}</span>`;
}

/** Public endgame overview: artifacts, World Wonders, the winner. */
export function endgameView(d: Overview & { now: number }): SafeHtml {
  return html`<h1>Statistics</h1>${statsTabs('wonders')}
    ${d.winner
      ? html`<div class="spanel pad"><b>The world has been won!</b> ${d.winner.alliance ?? d.winner.user} completed the World Wonder in ${d.winner.village} on ${fmtDateTime(d.winner.at)} UTC.</div>`
      : ''}
    <p class="small">The ancient Natars guard powerful artifacts in their Treasuries. Destroy a Treasury with catapults, then win an attack with your hero — your attacking village needs an empty Treasury (level 10 for small artifacts, 20 for large and unique ones). Later the Natars reveal World Wonder villages and construction plans: the first alliance to raise a World Wonder to level 100 wins.</p>
    ${panel('Artifacts', d.artifactsReleasedAt === null
      ? html`<p class="none pad">Not released yet.</p>`
      : html`<div class="tblwrap"><table class="tb"><thead><tr><th>Artifact</th><th>Effect</th><th>Holder</th><th>Village</th></tr></thead><tbody>
          ${d.artifacts.map(
            (r) => html`<tr><td>${artifactLabel(r.a.kind, r.a.size)}</td><td class="small">${ARTIFACT_INFO[r.a.kind].effect}</td>
              <td>${r.owner ?? '-'}</td><td>${r.x !== null ? html`<a href="/map/tile?x=${r.x}&amp;y=${r.y}">${r.village}</a>` : '-'}
              ${r.a.activeAt > d.now ? html`<br><span class="small muted">active in ${timer(r.a.activeAt, d.now, false)}</span>` : ''}</td></tr>`,
          )}</tbody></table></div>`, { pad: false })}
    ${panel('World Wonders', d.wondersReleasedAt === null
      ? html`<p class="none pad">Not released yet.</p>`
      : html`<div class="tblwrap"><table class="tb"><thead><tr><th>#</th><th>Village</th><th>Owner</th><th class="num">Level</th></tr></thead><tbody>
          ${d.wonders.map(
            (w, i) => html`<tr><td class="num">${i + 1}</td><td><a href="/map/tile?x=${w.x}&amp;y=${w.y}">${w.name}</a></td><td>${w.owner ?? '-'}</td><td class="num">${fmtNum(w.level)}</td></tr>`,
          )}</tbody></table></div>`, { pad: false })}
    </div>`;
}

/** Treasury building page: what it holds and what it can hold. */
export function treasuryPanel(d: { level: number; held: { kind: ArtifactKind; size: ArtifactSize; activeAt: number }[]; now: number }): SafeHtml {
  return panel('Treasury', html`${d.held.length
      ? d.held.map(
          (a) => html`<div class="spanel pad">${artifactLabel(a.kind, a.size)}<div class="small">${ARTIFACT_INFO[a.kind].effect}</div>
            ${a.activeAt > d.now ? html`<div class="small muted">Starts working in ${timer(a.activeAt, d.now, false)}.</div>` : html`<div class="small good">Active.</div>`}</div>`,
        )
      : html`<p class="small muted">This Treasury holds no artifact. ${d.level >= 20 ? 'It can hold any artifact.' : d.level >= 10 ? 'It can hold a small artifact (level 20 for large and unique ones).' : 'From level 10 it can hold a small artifact, from level 20 any artifact.'}</p>`}
    <p><a href="/endgame">» Artifacts &amp; World Wonders</a></p>`);
}
