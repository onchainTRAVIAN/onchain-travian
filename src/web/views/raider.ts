import { RAIDER_INTERVALS, parseAllowed, raiderLog, type RaidPlan, type RaiderRow, type TargetStatus } from '../../game/actions/raider.js';
import { FARM_RADIUS_MAX } from '../../game/actions/goldclub.js';
import { parseUnits } from '../../game/engine/state.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import { fmtAgo, fmtClock, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, resIcon, timer } from './layout.js';
import { unitIcon, unitsInline } from './parts.js';

const STATUS: Record<TargetStatus, { text: string; cls: string }> = {
  ready: { text: 'raid next check', cls: 'good' },
  busy: { text: 'raid on the way', cls: '' },
  poor: { text: 'too little to loot', cls: 'muted' },
  guarded: { text: 'guarded by animals', cls: 'bad' },
  blocked: { text: 'never raid', cls: 'muted' },
  notroops: { text: 'not enough troops', cls: 'muted' },
};
const SKIP_TEXT: Record<string, string> = { busy: 'on the way', poor: 'too poor', guarded: 'guarded', blocked: 'blocked', notroops: 'no troops', error: 'refused' };

export interface RaiderPanelData {
  tribe: TribeId;
  raider: RaiderRow;
  plan: RaidPlan;
  home: UnitCounts;
  today: { raids: number; loot: number };
  csrf: string;
  now: number;
}

/** The Oasis Raider: set it up once, it picks oases and sizes every raid by itself. */
export function raiderPanel(d: RaiderPanelData): SafeHtml {
  const r = d.raider;
  const units = TRIBES[d.tribe].units;
  const allowed = parseAllowed(r.allowed);
  const reserve = parseUnits(r.reserve);
  const fixed = parseUnits(r.fixed);
  const next = r.lastRunAt === null ? d.now : r.lastRunAt + r.intervalMin * 60_000;
  const log = raiderLog(r);
  const usable = units.map((u, i) => ((u.type === 'inf' || u.type === 'cav') && u.carry > 0 ? i : -1)).filter((i) => i >= 0);
  const plannedTroops = d.plan.raids.reduce((s, t) => s + (t.units ?? []).reduce((a, b) => a + b, 0), 0);
  const plannedLoot = d.plan.raids.reduce((s, t) => s + Math.min(t.loot, t.carry ?? 0), 0);

  return html`<div class="raider spanel ${r.enabled ? 'on' : ''}">
    <div class="raider-head">
      <b class="raider-title">Oasis Raider</b>
      ${r.enabled
        ? html`<span class="pill on">ON</span> <span class="small">next check ${next <= d.now ? 'any moment' : html`in ${timer(next, d.now, false)}`} · every ${r.intervalMin} min</span>`
        : html`<span class="pill">OFF</span> <span class="small muted">Turn it on and it raids the best free oases around this village by itself.</span>`}
      <span class="grow"></span>
      <form method="post" action="/goldclub/raider/toggle" class="inline">${csrfField(d.csrf)}<input type="hidden" name="on" value="${r.enabled ? '0' : '1'}">
        <button type="submit" class="${r.enabled ? 'secondary' : ''}">${r.enabled ? 'Turn off' : 'Turn on'}</button></form>
      <form method="post" action="/goldclub/raider/run" class="inline">${csrfField(d.csrf)}<button type="submit" class="secondary">Raid now</button></form>
    </div>
    <p class="small raider-stats">Today: <b>${fmtNum(d.today.raids)}</b> oasis raids came back with <b>${resIcon('wood')}${fmtNum(d.today.loot)}</b> resources.
      In range: ${fmtNum(d.plan.targets.length)} free oases, ${fmtNum(d.plan.raids.length)} worth raiding now.</p>

    <h3>Next check would send ${d.plan.raids.length ? html`<span class="small muted">${fmtNum(d.plan.raids.length)} raids · ${fmtNum(plannedTroops)} troops · can bring ${fmtNum(plannedLoot)}</span>` : ''}</h3>
    ${d.plan.raids.length === 0
      ? html`<p class="small muted">Nothing right now - ${d.plan.targets.length === 0 ? 'no free oases in range (raise the range below)' : 'no oasis has enough loot and no animals, or your troops are out. It checks again automatically.'}</p>`
      : html`<div class="mvscroll short"><table class="tb"><thead><tr><th>Oasis</th><th class="num">Dist.</th><th class="num">Loot there</th><th>Troops</th><th class="num">Carry</th></tr></thead><tbody>${d.plan.raids.map(
          (t) => html`<tr><td class="oname"><a href="/map/tile?x=${t.x}&amp;y=${t.y}" title="${t.name} (${t.bonus})">${t.name}</a> <span class="small muted">(${t.x}|${t.y})</span>${t.animals ? html`<br><span class="small bad">${t.animals} animals</span>` : ''}</td>
            <td class="num">${t.distance.toFixed(1)}</td><td class="num">${fmtNum(t.loot)}</td><td class="small">${unitsInline(d.tribe, t.units ?? [])}</td><td class="num">${fmtNum(t.carry ?? 0)}</td></tr>`,
        )}</tbody></table></div>`}

    <details class="raider-settings"${r.id === 0 ? html` open` : ''}>
      <summary><b>Settings</b> <span class="small muted">range ${r.radius} · at least ${fmtNum(r.minRes)} loot · ${r.maxAnimals ? `up to ${r.maxAnimals} animals` : 'no animals'} · ${r.sizeMode === 'auto' ? 'troops spread over many oases' : r.sizeMode === 'max' ? 'richest oasis first' : 'fixed raids'} · max ${r.maxRaids} per check</span></summary>
      <form method="post" action="/goldclub/raider" class="block">${csrfField(d.csrf)}
        <table class="plain raider-form"><tbody>
          <tr><th>Range</th><td><input type="number" name="radius" min="1" max="${FARM_RADIUS_MAX}" value="${r.radius}" class="w30" inputmode="numeric"> fields around this village (1–${FARM_RADIUS_MAX})</td></tr>
          <tr><th>Only oases with</th><td>at least <input type="number" name="minRes" min="0" value="${r.minRes}" class="w60" inputmode="numeric"> resources to loot</td></tr>
          <tr><th>Animals</th><td>raid oases with up to <input type="number" name="maxAnimals" min="0" value="${r.maxAnimals}" class="w30" inputmode="numeric"> animals
            <span class="small muted">(0 = only empty oases; with animals it sends enough attack to win safely)</span></td></tr>
          <tr><th>Every</th><td><select name="intervalMin">${RAIDER_INTERVALS.map((m) => html`<option value="${m}"${m === r.intervalMin ? html` selected` : ''}>${m} minutes</option>`)}</select>
            · at most <input type="number" name="maxRaids" min="1" max="100" value="${r.maxRaids}" class="w30" inputmode="numeric"> raids per check</td></tr>
          <tr><th>Raid size</th><td>
            <label class="block"><input type="radio" name="sizeMode" value="auto"${r.sizeMode === 'auto' ? html` checked` : ''}> <b>Spread</b> (recommended) - share your free troops over many oases at once; each raid gets a fair share, never more than its loot needs</label>
            <label class="block"><input type="radio" name="sizeMode" value="max"${r.sizeMode === 'max' ? html` checked` : ''}> <b>Richest first</b> - the richest oasis gets all the troops its loot needs, then the next one</label>
            <label class="block"><input type="radio" name="sizeMode" value="fixed"${r.sizeMode === 'fixed' ? html` checked` : ''}> <b>Fixed</b> - the same group every raid (column "Fixed" below)</label>
            <label>Max troops per raid <input type="number" name="maxPerRaid" min="0" value="${r.maxPerRaid || ''}" placeholder="no limit" class="w60" inputmode="numeric"></label></td></tr>
        </tbody></table>
        <table class="tb raider-units"><thead><tr><th>Use</th><th>Troop</th><th class="num">At home</th><th>Keep at home</th><th>Fixed</th></tr></thead><tbody>
          ${usable.map((i) => {
            const u = units[i];
            return html`<tr><td class="chk"><input type="checkbox" id="ra${i}" name="a${i}" value="1"${allowed[i] ? html` checked` : ''}></td>
              <td><label for="ra${i}">${unitIcon(d.tribe, i, 16, false)} ${u?.name ?? ''}</label> <span class="small muted">carries ${u?.carry ?? 0}, speed ${u?.speed ?? 0}</span></td>
              <td class="num">${fmtNum(d.home[i] ?? 0)}</td>
              <td><input type="number" name="k${i}" min="0" value="${reserve[i] || ''}" placeholder="0" class="w60" inputmode="numeric" aria-label="Keep ${u?.name ?? ''} at home"></td>
              <td><input type="number" name="f${i}" min="0" value="${fixed[i] || ''}" placeholder="0" class="w60" inputmode="numeric" aria-label="Fixed ${u?.name ?? ''} per raid"></td></tr>`;
          })}
        </tbody></table>
        <p><button type="submit">Save settings</button></p>
      </form>
    </details>

    <details class="raider-targets">
      <summary><b>All oases in range</b> <span class="small muted">(${fmtNum(d.plan.targets.length)}) - status and "never raid"</span></summary>
      <div class="mvscroll"><table class="tb"><thead><tr><th>Oasis</th><th class="num">Dist.</th><th class="num">Loot</th><th class="num">Animals</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.plan.targets.map((t) => {
          const st = STATUS[t.status];
          return html`<tr><td class="oname"><a href="/map/tile?x=${t.x}&amp;y=${t.y}" title="${t.name} (${t.bonus})">${t.name}</a> <span class="small muted">(${t.x}|${t.y})</span></td><td class="num">${t.distance.toFixed(1)}</td>
            <td class="num">${fmtNum(t.loot)}</td><td class="num ${t.animals ? 'bad' : ''}">${t.animals || '-'}</td><td class="small ${st.cls}">${st.text}</td>
            <td class="nowrap"><form method="post" action="/goldclub/block" class="inline">${csrfField(d.csrf)}<input type="hidden" name="x" value="${t.x}"><input type="hidden" name="y" value="${t.y}">
              <button type="submit" class="lnk small">${t.status === 'blocked' ? 'allow' : 'never raid'}</button></form></td></tr>`;
        })}
      </tbody></table></div>
    </details>

    ${log.length
      ? html`<details class="raider-log"${r.enabled ? html` open` : ''}><summary><b>Activity</b> <span class="small muted">last ${log.length} checks</span></summary>
        <ul class="small raider-loglist">${log.map((e) => {
          const skips = Object.entries(e.skipped).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${SKIP_TEXT[k] ?? k}`).join(', ');
          return html`<li><span class="muted">${fmtClock(e.at).slice(0, 5)} (${fmtAgo(e.at, d.now)})</span> - ${e.sent ? html`<b>sent ${e.sent} raids</b> (${fmtNum(e.troops)} troops)` : 'nothing sent'}${skips ? html` · skipped: ${skips}` : ''}${e.note ? html` · <span class="bad">${e.note}</span>` : ''}</li>`;
        })}</ul></details>`
      : ''}
  </div>`;
}
