import type { SimArmy, SimInput, SimResult } from '../../game/rules/simulate.js';
import type { SimPageInput } from '../routes/simulator.js';
import { NATAR_FACTOR_MAX, NATAR_FACTOR_MIN, NATAR_MIN_POP } from '../../game/rules/natars.js';
import { RESOURCE_KEYS, res, sumRes, type Resources } from '../../game/rules/resources.js';
import { TRIBES, type TribeId, type UnitCounts } from '../../game/rules/units.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { icon, resIcon } from './layout.js';
import { rallyTabs } from './troops.js';
import { unitIcon } from './parts.js';

const TRIBE_CHOICES: { id: TribeId; label: string }[] = [
  { id: 'romans', label: 'Romans' },
  { id: 'teutons', label: 'Teutons' },
  { id: 'gauls', label: 'Gauls' },
  { id: 'nature', label: 'Nature (animals)' },
  { id: 'natars', label: 'Natars' },
];

function tribeSelect(name: string, value: TribeId, playable: boolean): SafeHtml {
  return html`<select name="${name}" class="simtribe" aria-label="Tribe">${TRIBE_CHOICES.filter((t) => !playable || t.id !== 'nature').map(
    (t) => html`<option value="${t.id}"${t.id === value ? html` selected` : ''}>${t.label}</option>`,
  )}</select>`;
}

const v = (n: number) => (n > 0 ? String(n) : '');

/** One army: unit icons, counts, upgrade levels and hero. */
function armyInputs(p: string, a: SimArmy, role: 'attacker' | 'defender', title: string, playable: boolean): SafeHtml {
  const units = TRIBES[a.tribe].units;
  const lvlLabel = role === 'attacker' ? 'Blacksmith' : 'Armoury';
  const lvlShort = 'Level';
  const canLevel = a.tribe !== 'nature' && a.tribe !== 'natars';
  return html`<div class="tblwrap simwrap"><table class="simarmy">
    <thead><tr><th colspan="11"><span class="simside ${role === 'attacker' ? 'att' : 'def'}">${title}</span> ${tribeSelect(`${p}_t`, a.tribe, playable)}</th></tr></thead>
    <tbody>
      <tr><td class="lbl"></td>${units.map((u, i) => html`<td>${unitIcon(a.tribe, i, 16, false)}<span class="sr">${u.name}</span></td>`)}</tr>
      <tr><th class="lbl">Troops</th>${units.map((u, i) => html`<td><input type="number" name="${p}${i}" value="${v(a.units[i] ?? 0)}" min="0" inputmode="numeric" placeholder="0" aria-label="${u.name}" title="${u.name}"></td>`)}</tr>
      ${canLevel
        ? html`<tr class="lvl"><th class="lbl" title="${lvlLabel} level per unit">${lvlShort}</th>${units.map((u, i) => html`<td><input type="number" name="${p}l${i}" value="${v(a.levels[i] ?? 0)}" min="0" max="20" inputmode="numeric" placeholder="0" aria-label="${u.name} ${lvlLabel} level" title="${u.name}: ${lvlLabel} level"></td>`)}</tr>`
        : ''}
      ${canLevel
        ? html`<tr class="herorow"><th class="lbl">${unitIcon(a.tribe, 10, 16, false)} Hero</th><td colspan="10">
          <select name="${p}h" aria-label="Hero"><option value="">no hero</option>${units.map((u, i) => (u.type === 'inf' || u.type === 'cav' ? html`<option value="${i}"${a.hero?.slot === i ? html` selected` : ''}>trained from ${u.name}</option>` : ''))}</select>
          <label>${role === 'attacker' ? 'attack' : 'defence'} points <input type="number" name="${p}hp" value="${v(a.hero?.points ?? 0)}" min="0" class="w30" inputmode="numeric"></label>
          <label>${role === 'attacker' ? 'off' : 'def'} bonus points <input type="number" name="${p}hb" value="${v(a.hero?.bonus ?? 0)}" min="0" max="100" class="w30" inputmode="numeric"></label></td></tr>`
        : ''}
    </tbody></table></div>`;
}

function lossTable(tribe: TribeId, title: string, role: 'att' | 'def', units: UnitCounts, losses: UnitCounts, hero: boolean, heroDied: boolean, trapped?: UnitCounts): SafeHtml {
  const anyTrapped = !!trapped && trapped.some((n) => n > 0);
  const all = TRIBES[tribe].units;
  const show = all.map((_, i) => (units[i] ?? 0) > 0);
  if (!show.some(Boolean) && !hero) return html`<table class="report simres"><thead><tr><th class="side ${role}">${title}</th></tr></thead><tbody><tr><td class="none">no troops</td></tr></tbody></table>`;
  const cell = (n: number, cls = '') => html`<td class="${n === 0 ? 'none' : cls}">${fmtNum(n)}</td>`;
  return html`<table class="report simres"><thead><tr><th class="side ${role}" colspan="${show.filter(Boolean).length + 1 + (hero ? 1 : 0)}">${title}</th></tr></thead><tbody>
    <tr><td class="lbl"></td>${all.map((_, i) => (show[i] ? html`<td>${unitIcon(tribe, i, 16, false)}</td>` : ''))}${hero ? html`<td>${unitIcon(tribe, 10, 16, false)}</td>` : ''}</tr>
    <tr><th class="lbl">Troops</th>${all.map((_, i) => (show[i] ? cell(units[i] ?? 0) : ''))}${hero ? html`<td>1</td>` : ''}</tr>
    ${anyTrapped ? html`<tr class="trap"><th class="lbl">Trapped</th>${all.map((_, i) => (show[i] ? cell(trapped?.[i] ?? 0, 'trapc') : ''))}${hero ? html`<td class="none">0</td>` : ''}</tr>` : ''}
    <tr class="loss"><th class="lbl">Casualties</th>${all.map((_, i) => (show[i] ? cell(losses[i] ?? 0, 'bad') : ''))}${hero ? html`<td class="${heroDied ? 'bad' : 'none'}">${heroDied ? 1 : 0}</td>` : ''}</tr>
    <tr><th class="lbl">Survivors</th>${all.map((_, i) => (show[i] ? cell((units[i] ?? 0) - (losses[i] ?? 0) - (trapped?.[i] ?? 0)) : ''))}${hero ? html`<td>${heroDied ? 0 : 1}</td>` : ''}</tr>
  </tbody></table>`;
}

/** What the fallen soldiers cost to train. */
function lossCost(tribe: TribeId, losses: UnitCounts): Resources {
  const out = res();
  TRIBES[tribe].units.forEach((u, i) => {
    const n = losses[i] ?? 0;
    for (const k of RESOURCE_KEYS) out[k] += u.cost[k] * n;
  });
  return out;
}

function costRow(label: SafeHtml | string, r: Resources, cls: string, note?: string): SafeHtml {
  const total = sumRes(r);
  return html`<tr class="${cls}"><th>${label}</th>${RESOURCE_KEYS.map((k) => html`<td class="num">${r[k] ? fmtNum(r[k]) : html`<span class="none">0</span>`}</td>`)}
    <td class="num"><b>${fmtNum(total)}</b>${note ? html` <span class="small muted">${note}</span>` : ''}</td></tr>`;
}

/** Losses of both sides in resources (training cost of the dead), and what a raid nets. */
function lossCostTable(input: SimInput, r: SimResult): SafeHtml {
  const att = lossCost(input.attacker.tribe, input.attacker.units.map((n, i) => Math.min(n, (r.attackerLosses[i] ?? 0) + (r.trapped[i] ?? 0))));
  const def = res();
  input.defenders.forEach((d, k) => {
    const c = lossCost(d.tribe, r.defenderLosses[k] ?? []);
    for (const key of RESOURCE_KEYS) def[key] += c[key];
  });
  const free = (t: TribeId) => t === 'natars' || t === 'nature';
  const attNote = free(input.attacker.tribe) ? '(Natars train for free)' : undefined;
  const defNote = input.defenders.every((d) => free(d.tribe)) ? '(animals cost nothing)' : undefined;
  const net = r.attackerWon ? r.carry - sumRes(att) : -sumRes(att);
  return html`<h3 class="simh">Losses in resources</h3>
    <div class="tblwrap"><table class="tb simcost"><thead><tr><th></th>${RESOURCE_KEYS.map((k) => html`<th>${resIcon(k)}</th>`)}<th>Total</th></tr></thead><tbody>
      ${costRow('Attacker lost', att, 'att', attNote)}
      ${costRow('Defender lost', def, 'def', defNote)}
    </tbody></table></div>
    ${!free(input.attacker.tribe) && r.attackerWon && r.carry > 0
      ? html`<p class="small">If every carry slot is filled, the attacker brings home up to <b>${fmtNum(r.carry)}</b> resources: <b class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${fmtNum(net)}</b> after its losses.</p>`
      : ''}`;
}

/** The outcome, swapped in live by app.js. */
export function simResultPanel(input: SimInput, r: SimResult): SafeHtml {
  const att = input.attacker;
  const hasAttack = att.units.some((n) => n > 0) || !!att.hero;
  if (!hasAttack) return html`<p class="none">Enter the attacking troops to see the result.</p>`;
  const ramSlot = TRIBES[att.tribe].units.findIndex((u) => u.type === 'ram');
  const rams = ramSlot >= 0 ? att.units[ramSlot] ?? 0 : 0;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return html`<h2 class="simh">Result</h2>
    <p class="simhead ${r.attackerWon ? 'att' : 'def'}"><b>${r.attackerWon ? (input.mode === 'raid' ? 'The raid succeeds' : 'The attacker wins') : 'The defender holds'}</b>
      <span class="small muted"> · attack ${fmtNum(Math.round(r.attackPower))} vs defence ${fmtNum(Math.round(r.defensePower))}${input.village && r.morale < 0.999 ? ` · morale ${pct(r.morale)}` : ''}</span></p>
    ${lossTable(att.tribe, 'Attacker', 'att', att.units, r.attackerLosses, !!att.hero, r.heroDied.attacker, r.trapped)}
    ${r.trapped.some((n) => n > 0) ? html`<p class="small">${fmtNum(r.trapped.reduce((a, b) => a + b, 0))} attackers are caught in traps before the fight - they are held prisoner until the Gaul frees them or an attack on this village wins.</p>` : ''}
    ${input.defenders.map((d, k) => lossTable(d.tribe, k === 0 ? (input.village ? 'Defender' : 'Animals') : `Reinforcement ${k}`, 'def', d.units, r.defenderLosses[k] ?? d.units.map(() => 0), !!d.hero, r.heroDied.defenders[k] ?? false))}
    <table class="simfacts"><tbody>
      ${input.village && input.mode === 'attack' && rams > 0 && input.wall > 0
        ? html`<tr><th>${icon('ui/attack', 'Rams', 16)} Wall</th><td>level ${input.wall} → <b>${r.wallAfter}</b>${r.wallInBattle !== input.wall ? html` <span class="small muted">(fought at level ${Math.round(r.wallInBattle * 10) / 10})</span>` : ''}</td></tr>`
        : ''}
      ${r.buildingAfter !== null ? html`<tr><th>Catapults</th><td>target level ${input.targetLevel} → <b>${r.buildingAfter}</b></td></tr>` : ''}
      ${r.attackerWon ? html`<tr><th>${icon('res/wood', 'Resources', 18, 12)} Can carry home</th><td>${fmtNum(r.carry)} resources</td></tr>` : ''}
      ${r.winAt !== null
        ? html`<tr><th>Margin</th><td>${r.attackerWon
            ? html`still wins with <b>${pct(r.winAt)}</b> of this attack`
            : html`needs <b>×${(Math.ceil(r.winAt * 100) / 100).toFixed(2)}</b> this attack to win (about ${fmtNum(Math.ceil((r.winAt - 1) * 100))}% more)`}</td></tr>`
        : ''}
    </tbody></table>
    ${lossCostTable(input, r)}`;
}

export function simulatorView(d: { input: SimPageInput; result: SimResult; worldSpeed: number }): SafeHtml {
  const i = d.input;
  const extra = [i.defenders[1], i.defenders[2]];
  const blank = (t: TribeId): SimArmy => ({ tribe: t, units: Array(10).fill(0), levels: Array(10).fill(0), hero: null });
  return html`<h1>Rally Point</h1>
    ${rallyTabs('simulator')}
    <div class="woodbody">
    <form method="get" action="/simulator" id="simform" class="simform">
      <div class="spanel simvil"><div class="pad"><label for="defv"><b>Your village:</b></label>
        <select id="defv" name="defv">${i.villages.map((v) => html`<option value="${v.id}"${v.id === i.defv ? html` selected` : ''}>${v.name} (${fmtNum(v.pop)})</option>`)}</select>
        <button type="submit" name="usedef" value="1" class="small">${icon('ui/reinforce', '', 14)} It defends</button>
        <button type="submit" name="natar" value="1" class="small secondary">${icon('tribe/natars', '', 14)} Natars attack it</button>
        <span class="small muted">Fills in the troops standing in that village (yours and reinforcements), your hero, wall, residence and traps.</span></div></div>
      ${i.natar
        ? html`<div class="spanel pad small">A typical Natar ${i.mode === 'raid' ? 'raid' : 'attack'} on <b>${i.natar.name}</b>: Natars size their army to your strength (${fmtNum(i.natar.strength)} - your defence plus population), between ${Math.round(NATAR_FACTOR_MIN * 100)}% and ${Math.round(NATAR_FACTOR_MAX * 100)}% of it; this shows the middle.
          ${i.natar.playerPop < NATAR_MIN_POP ? html` <b>You have ${fmtNum(i.natar.playerPop)} population - Natars only attack players with ${NATAR_MIN_POP} or more.</b>` : ''}</div>`
        : ''}
      <p class="simmode">
        <label><input type="radio" name="mode" value="attack"${i.mode === 'attack' ? html` checked` : ''}> Normal attack</label>
        <label><input type="radio" name="mode" value="raid"${i.mode === 'raid' ? html` checked` : ''}> Raid</label>
        <span class="sep">·</span>
        <label><input type="radio" name="oasis" value="0"${i.village ? html` checked` : ''}> Village</label>
        <label><input type="radio" name="oasis" value="1"${i.village ? '' : html` checked`}> Oasis</label>
      </p>
      ${armyInputs('a', i.attacker, 'attacker', 'Attacker', true)}
      <p class="simrow"><label>Population <input type="number" name="apop" value="${i.attackerPop}" min="1" class="w60" inputmode="numeric"></label>
        <label>Attack bonus <input type="number" name="abon" value="${v(Math.round(i.attackBonus * 100))}" min="0" max="100" class="w30" inputmode="numeric" placeholder="0">%</label>
        <span class="small muted">(Gold +10%, artifacts…)</span></p>
      ${armyInputs('d1', i.defenders[0] ?? blank(i.village ? 'romans' : 'nature'), 'defender', i.village ? 'Defender' : 'Oasis animals', false)}
      ${i.village
        ? html`<p class="simrow"><label>Wall <input type="number" name="wall" value="${v(i.wall)}" min="0" max="20" class="w30" inputmode="numeric" placeholder="0"></label>
            <label>Residence/Palace <input type="number" name="res" value="${v(i.residence)}" min="0" max="20" class="w30" inputmode="numeric" placeholder="0"></label>
            <label>Stonemason <input type="number" name="stone" value="${v(i.stonemason)}" min="0" max="20" class="w30" inputmode="numeric" placeholder="0"></label>
            <label>Population <input type="number" name="dpop" value="${i.defenderPop}" min="1" class="w60" inputmode="numeric"></label>
            <label>Defence bonus <input type="number" name="dbon" value="${v(Math.round(i.defenseBonus * 100))}" min="0" max="100" class="w30" inputmode="numeric" placeholder="0">%</label>
            <label>Catapult target level <input type="number" name="tl" value="${v(i.targetLevel)}" min="0" max="20" class="w30" inputmode="numeric" placeholder="0"></label>
            ${(i.defenders[0]?.tribe ?? 'romans') === 'gauls'
              ? html`<label title="Free traps (Trapper capacity minus prisoners already held)">Free traps <input type="number" name="traps" value="${v(i.traps)}" min="0" class="w60" inputmode="numeric" placeholder="0"></label>`
              : html`<span class="small muted">Traps: Gaul defenders only.</span>`}</p>
          ${extra.map((a, k) => html`<details class="simreinf"${a ? html` open` : ''}><summary>Reinforcement ${k + 1}</summary>${armyInputs(`d${k + 2}`, a ?? blank('romans'), 'defender', `Reinforcement ${k + 1}`, false)}</details>`)}`
        : html`<input type="hidden" name="wall" value="0">`}
      <p><button type="submit">Simulate</button> <a href="/simulator" class="small">reset to my troops</a></p>
      <p class="small muted">Uses the same battle rules as real fights (world speed x${d.worldSpeed} does not change fighting). Random catapult targets are not simulated.</p>
    </form>
    <div id="simresult" aria-live="polite">${simResultPanel(d.input, d.result)}</div>
    </div>`;
}
