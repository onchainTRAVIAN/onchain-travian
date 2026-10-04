import type { HeroRow } from '../../game/engine/hero.js';
import { HERO_BONUS_PER_POINT, HERO_SKILL_MAX, heroCombat, heroPoints, heroRegenPerDay, heroReviveCost, heroTrainCost, heroTrainTimeMs, xpForLevel } from '../../game/rules/hero.js';
import { config } from '../../config.js';
import { TRIBES, type TribeId, type UnitDef } from '../../game/rules/units.js';
import type { Resources } from '../../game/rules/resources.js';
import { fmtDuration, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, timer } from './layout.js';
import { unitIcon } from './parts.js';

const STATUS: Record<HeroRow['status'], string> = {
  home: 'At home',
  away: 'Reinforcing another village',
  moving: 'On the move',
  dead: 'Fallen',
  reviving: 'Being trained / revived',
};

/** Training a new hero from one of the village's units (Hero's Mansion). */
function trainPanel(d: {
  tribe: TribeId;
  mansion: number;
  villageName: string;
  candidates: { unit: UnitDef; slot: number; have: number }[];
  have: Resources;
  csrf: string;
}): SafeHtml {
  if (d.mansion < 1) return html`<p class="note">Build a Hero's Mansion in ${d.villageName} to train a hero from one of your soldiers.</p>`;
  if (d.candidates.length === 0) return html`<p class="note">Research a fighting unit first: any infantry or cavalry (no scouts, siege engines, chiefs or settlers) can become a hero.</p>`;
  return html`<h2>Train a hero in ${d.villageName}</h2>
    <p class="small">Choose the soldier who becomes your hero. The hero keeps that unit's strengths and speed; the soldier is used up.</p>
    <table class="tb"><thead><tr><th>Unit</th><th>Hero at level 0</th><th>Cost</th><th></th></tr></thead><tbody>
    ${d.candidates.map((c) => {
      const s = heroCombat(c.unit, 0, 0);
      return html`<tr><td>${unitIcon(d.tribe, c.slot)} ${c.unit.name}<br><span class="small muted">${fmtNum(c.have)} at home</span></td>
        <td class="small">attack ${fmtNum(s.off)}<br>defence ${fmtNum(s.defInf)} / ${fmtNum(s.defCav)}<br>speed ${c.unit.speed}</td>
        <td>${costLine(heroTrainCost(c.unit), d.have)}<span class="small muted">${fmtDuration(heroTrainTimeMs(c.unit, config.WORLD_SPEED))}</span></td>
        <td>${c.have > 0
          ? html`<form method="post" action="/hero/train">${csrfField(d.csrf)}<input type="hidden" name="slot" value="${c.slot}"><button type="submit" class="small">Train</button></form>`
          : html`<span class="none small">none at home</span>`}</td></tr>`;
    })}
    </tbody></table>`;
}

export function heroView(d: {
  hero: HeroRow | undefined;
  tribe: TribeId;
  homeName: string;
  locationName: string | null;
  have: Resources;
  homeHave: Resources;
  mansion: number;
  villageName: string;
  candidates: { unit: UnitDef; slot: number; have: number }[];
  csrf: string;
  now: number;
}): SafeHtml {
  const h = d.hero;
  const train = trainPanel({ tribe: d.tribe, mansion: d.mansion, villageName: d.villageName, candidates: d.candidates, have: d.have, csrf: d.csrf });
  if (!h) {
    return html`<h1>Hero</h1>
      <p>In classic Travian your hero is trained in the Hero's Mansion from one of your own soldiers. It fights with its army, gains experience from every enemy it helps defeat, captures oases and makes its army stronger.</p>
      ${train}`;
  }
  const unit = (TRIBES[d.tribe].units[h.unitSlot] ?? TRIBES[d.tribe].units[0]) as UnitDef;
  const stats = heroCombat(unit, h.strength, h.defPoints);
  const used = h.strength + h.defPoints + h.offBonus + h.defBonus + h.regen;
  const total = heroPoints(h.level);
  const free = total - used;
  const curXp = xpForLevel(h.level);
  const nextXp = xpForLevel(h.level + 1);
  const xpPct = Math.round(((h.xp - curXp) / Math.max(1, nextXp - curXp)) * 20) * 5;
  const hp = Math.round(h.health / 5) * 5;
  const redistribute = h.level === 0;
  const skills: { key: 'strength' | 'defPoints' | 'offBonus' | 'defBonus' | 'regen'; label: string; value: number; effect: string }[] = [
    { key: 'strength', label: 'Attack', value: h.strength, effect: `${fmtNum(stats.off)} attack` },
    { key: 'defPoints', label: 'Defence', value: h.defPoints, effect: `${fmtNum(stats.defInf)} vs infantry · ${fmtNum(stats.defCav)} vs cavalry` },
    { key: 'offBonus', label: 'Attack bonus', value: h.offBonus, effect: `+${(h.offBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}% attack for its army` },
    { key: 'defBonus', label: 'Defence bonus', value: h.defBonus, effect: `+${(h.defBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}% defence for its army` },
    { key: 'regen', label: 'Regeneration', value: h.regen, effect: `${heroRegenPerDay(h.regen)}% health per day${config.WORLD_SPEED !== 1 ? ` (×${config.WORLD_SPEED})` : ''}` },
  ];
  return html`<h1>${h.name} <span class="lvl">level ${h.level}</span></h1>
    <div class="unitinfo">
      <img class="unitbig" src="/static/img/units/big/${d.tribe}-${h.unitSlot + 1}.svg" width="120" height="140" alt="${unit.name}">
      <div class="unitstats"><table><tbody>
        <tr><th>Trained from</th><td>${unitIcon(d.tribe, h.unitSlot)} ${unit.name}</td></tr>
        <tr><th>Status</th><td>${STATUS[h.status]}${d.locationName && h.status === 'away' ? ` in ${d.locationName}` : ''}</td></tr>
        <tr><th>Home</th><td>${d.homeName}</td></tr>
        <tr><th>Health</th><td>${Math.round(h.health)}% <span class="hp" aria-hidden="true"><i class="w${hp}"></i></span></td></tr>
        <tr><th>Experience</th><td>${fmtNum(h.xp)} / ${fmtNum(nextXp)} <span class="bar" aria-hidden="true"><i class="w${Math.max(0, Math.min(100, xpPct))}"></i></span></td></tr>
        <tr><th>Speed</th><td>${unit.speed} fields/hour</td></tr>
      </tbody></table></div>
    </div>
    ${h.status === 'dead'
      ? html`<div class="card"><h3>Revive ${h.name} in ${d.homeName}</h3>${costLine(heroReviveCost(unit, h.level), d.homeHave)}
          <form method="post" action="/hero/revive">${csrfField(d.csrf)}<button type="submit">Revive</button></form></div>
        <p class="small muted">Or train a new hero instead:</p>${train}`
      : ''}
    ${h.status === 'reviving' && h.reviveAt ? html`<div class="note">Ready in ${timer(h.reviveAt, d.now)}.</div>` : ''}
    <h2>Skills <span class="small muted">${used} of ${total} points used${free > 0 ? html` · <b class="c1">${free} free</b>` : ''}</span></h2>
    <form method="post" action="/hero/skills">${csrfField(d.csrf)}
      <table class="tb"><tbody>
      ${skills.map(
        (s) => html`<tr><td><label for="sk-${s.key}">${s.label}</label><br><span class="small muted">${s.effect}</span></td>
          <td><input id="sk-${s.key}" type="number" name="${s.key}" value="${s.value}" min="${redistribute ? 0 : s.value}" max="${HERO_SKILL_MAX}" class="w30" inputmode="numeric"></td></tr>`,
      )}
      </tbody></table>
      <p><button type="submit">Save points</button> <span class="small muted">${redistribute
        ? 'At level 0 you can move points freely.'
        : '5 new points every level. Points can no longer be moved once your hero has gained a level.'}</span></p>
    </form>
    <p class="small muted">Your hero earns experience equal to the crop upkeep of every enemy killed in battles it joins (defending heroes share it). Tick "Hero" when sending troops. Send it with an attack to capture oases.</p>
    <h2>Name</h2>
    <form method="post" action="/hero/rename" class="row">${csrfField(d.csrf)}
      <div><label for="hn" class="sr">Hero name</label><input id="hn" type="text" name="name" value="${h.name}" required minlength="2" maxlength="20"></div>
      <div><button type="submit" class="block">Rename</button></div>
    </form>`;
}
