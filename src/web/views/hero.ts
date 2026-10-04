import type { HeroRow } from '../../game/engine/hero.js';
import { HERO_BONUS_PER_POINT, HERO_PRODUCTION_PER_POINT, heroFightingStrength, heroPoints, heroReviveCost, xpForLevel } from '../../game/rules/hero.js';
import { config } from '../../config.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { costLine, csrfField, timer } from './layout.js';
import type { Resources } from '../../game/rules/resources.js';

const STATUS: Record<HeroRow['status'], string> = {
  home: '🏠 At home',
  away: '🛡️ Reinforcing another village',
  moving: '🏃 On the move',
  dead: '💀 Fallen',
  reviving: '✨ Reviving',
};

export function heroView(d: { hero: HeroRow; homeName: string; locationName: string | null; have: Resources; csrf: string; now: number }): SafeHtml {
  const h = d.hero;
  const used = h.strength + h.offBonus + h.defBonus + h.production;
  const free = heroPoints(h.level) - used;
  const curXp = xpForLevel(h.level);
  const nextXp = xpForLevel(h.level + 1);
  const xpPct = Math.round(((h.xp - curXp) / Math.max(1, nextXp - curXp)) * 20) * 5;
  const hp = Math.round(h.health / 5) * 5;
  const skills: { key: 'strength' | 'offBonus' | 'defBonus' | 'production'; label: string; value: number; effect: string }[] = [
    { key: 'strength', label: '💪 Fighting strength', value: h.strength, effect: `${fmtNum(heroFightingStrength(h.strength))} attack & defence` },
    { key: 'offBonus', label: '⚔️ Offence bonus', value: h.offBonus, effect: `+${(h.offBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}% army attack` },
    { key: 'defBonus', label: '🛡️ Defence bonus', value: h.defBonus, effect: `+${(h.defBonus * HERO_BONUS_PER_POINT * 100).toFixed(1)}% village defence` },
    { key: 'production', label: '🌾 Resources', value: h.production, effect: `+${fmtNum(h.production * HERO_PRODUCTION_PER_POINT * config.WORLD_SPEED)} of each per hour` },
  ];
  return html`<h1>🦸 ${h.name} <span class="muted small">level ${h.level}</span></h1>
    <ul class="list">
      <li><span class="grow">Status <span class="sub">${STATUS[h.status]}${d.locationName && h.status === 'away' ? ` in ${d.locationName}` : ''} · home: ${d.homeName}</span></span></li>
      <li><span class="grow">Health ${Math.round(h.health)}%<span class="hp" aria-hidden="true"><i class="w${hp}"></i></span></span></li>
      <li><span class="grow">Experience ${fmtNum(h.xp)} / ${fmtNum(nextXp)}<span class="bar" aria-hidden="true"><i class="w${Math.max(0, Math.min(100, xpPct))}"></i></span></span></li>
    </ul>
    ${h.status === 'dead'
      ? html`<div class="card"><h3>Revive your hero</h3>${costLine(heroReviveCost(h.level), d.have)}
          <form method="post" action="/hero/revive">${csrfField(d.csrf)}<button type="submit">✨ Revive in ${d.homeName}</button></form></div>`
      : ''}
    ${h.status === 'reviving' && h.reviveAt ? html`<div class="note">✨ Back in ${timer(h.reviveAt, d.now)}.</div>` : ''}
    <h2>Skills <span class="muted small">${free} free point${free === 1 ? '' : 's'}</span></h2>
    <form method="post" action="/hero/skills">
      ${csrfField(d.csrf)}
      ${skills.map(
        (s) => html`<div class="unitrow"><span class="uico" aria-hidden="true"></span>
          <label for="sk-${s.key}" class="small">${s.label} <b>${s.value}</b><br><span class="have">${s.effect}</span></label>
          <input id="sk-${s.key}" type="number" name="${s.key}" min="0" max="${free}" placeholder="+0" inputmode="numeric"${free === 0 ? html` disabled` : ''}></div>`,
      )}
      <div class="actions"><button type="submit"${free === 0 ? html` disabled` : ''}>Add points</button></div>
    </form>
    <p class="small muted">Your hero earns experience from every enemy (and wild animal) killed in battles it joins, and 4 skill points per level. Tick "Hero joins" when sending troops. Hunting oasis animals gives double experience.</p>
    <h2>Name</h2>
    <form method="post" action="/hero/rename" class="row">
      ${csrfField(d.csrf)}
      <div><label for="hn" class="sr">Hero name</label><input id="hn" type="text" name="name" value="${h.name}" required minlength="2" maxlength="20"></div>
      <div><button type="submit" class="block">Rename</button></div>
    </form>`;
}
