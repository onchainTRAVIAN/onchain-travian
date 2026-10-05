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
  const meter = (pct: number, cls: string) => {
    const w = Math.max(0, Math.min(100, pct));
    return html`<svg class="meter ${cls}" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="8" rx="4" class="bg"></rect>${w > 0 ? html`<rect width="${w}" height="8" rx="4" class="fg"></rect>` : ''}</svg>`;
  };
  const healthCls = h.health >= 60 ? 'good' : h.health >= 25 ? 'mid' : 'low';
  const where = h.status === 'away' && d.locationName ? `in ${d.locationName}` : h.status === 'home' ? `in ${d.homeName}` : '';
  return html`<h1>Hero</h1>
    <div class="spanel herocard">
      <div class="portrait"><img src="/static/img/units/big/${d.tribe}-${h.unitSlot + 1}.svg" width="120" height="140" alt="${unit.name}"><span class="lvlbadge" title="Level">${h.level}</span></div>
      <div class="hinfo">
        <div class="hname"><b>${h.name}</b> <span class="muted">level ${h.level}</span></div>
        <div class="hsub">${unitIcon(d.tribe, h.unitSlot, 16, false)} trained from ${unit.name} · ${TRIBES[d.tribe].name}</div>
        <div class="hstatus st-${h.status}"><span class="dot"></span>${STATUS[h.status]} ${where}</div>
        <div class="hrow"><span class="k">Health</span>${meter(h.health, 'hp ' + healthCls)}<span class="v">${Math.round(h.health)}%</span></div>
        <div class="hrow"><span class="k">Experience</span>${meter(xpPct, 'xp')}<span class="v">${fmtNum(h.xp)} / ${fmtNum(nextXp)}</span></div>
        <div class="hfoot small muted">Home: ${d.homeName} · speed ${unit.speed} fields/hour · regenerates ${heroRegenPerDay(h.regen)}% a day${config.WORLD_SPEED !== 1 ? ` (×${config.WORLD_SPEED})` : ''}</div>
      </div>
    </div>
    <div class="hstats">
      <div class="spanel tile"><span class="lbl">Attack</span><b>${fmtNum(stats.off)}</b></div>
      <div class="spanel tile"><span class="lbl">Def. infantry</span><b>${fmtNum(stats.defInf)}</b></div>
      <div class="spanel tile"><span class="lbl">Def. cavalry</span><b>${fmtNum(stats.defCav)}</b></div>
      <div class="spanel tile"><span class="lbl">Army bonus</span><b>+${(h.offBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}% / +${(h.defBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}%</b></div>
    </div>
    ${h.status === 'dead'
      ? html`<div class="spanel heroact"><h3 class="sp-head">Revive ${h.name} in ${d.homeName}</h3><div class="pad">${costLine(heroReviveCost(unit, h.level), d.homeHave)}
          <form method="post" action="/hero/revive">${csrfField(d.csrf)}<button type="submit">Revive</button></form></div></div>
        <p class="small muted">Or train a new hero instead:</p>${train}`
      : ''}
    ${h.status === 'reviving' && h.reviveAt ? html`<div class="note">Ready in ${timer(h.reviveAt, d.now)}.</div>` : ''}
    ${h.status === 'home'
      ? html`<p class="heroactions"><a class="btn" href="/troops/send">Send with troops</a> <a class="btn secondary" href="/simulator">Simulate a battle</a> <a class="btn secondary" href="/map">Find oases to capture</a></p>`
      : ''}
    <form method="post" action="/hero/skills" class="spanel skills">${csrfField(d.csrf)}
      <h3 class="sp-head">Skills<span>${used} of ${total} points used${free > 0 ? html` · <b class="freept">${free} free</b>` : ''}</span></h3>
      ${skills.map(
        (sk) => html`<div class="skill"><label for="sk-${sk.key}"><b>${sk.label}</b><span class="small muted">${sk.effect}</span></label>
          ${meter((sk.value / HERO_SKILL_MAX) * 100, 'pts')}
          <input id="sk-${sk.key}" type="number" name="${sk.key}" value="${sk.value}" min="${redistribute ? 0 : sk.value}" max="${HERO_SKILL_MAX}" class="w30" inputmode="numeric" aria-label="${sk.label} points"></div>`,
      )}
      <div class="skillfoot"><button type="submit">Save points</button> <span class="small muted">${redistribute
        ? 'At level 0 you can move points freely.'
        : '5 new points every level, up to ' + HERO_SKILL_MAX + ' per skill. Points stay once your hero has gained a level.'}</span></div>
    </form>
    <details class="spanel herohelp"><summary class="sp-head">How heroes work</summary>
      <p class="small">Your hero earns experience equal to the crop upkeep of every enemy killed in battles it joins (defending heroes share it). Tick "Hero" when sending troops. Send it with an attack that clears an oasis to capture it (Hero's Mansion 10/15/20 for 1/2/3 oases). It dies when its army loses more than 90%; revive it in its home village.</p></details>
    <form method="post" action="/hero/rename" class="renamebar">${csrfField(d.csrf)}
      <label for="hn">Rename</label> <input id="hn" type="text" name="name" value="${h.name}" required minlength="2" maxlength="20"> <button type="submit" class="small secondary">Rename</button>
    </form>`;
}
