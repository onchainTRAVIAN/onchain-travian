import { config } from '../../config.js';
import { TRIBES, TRIBE_IDS } from '../../game/rules/units.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField } from './layout.js';

export function landingView(stats: { players: number; online: number; villages: number }, csrf: string): SafeHtml {
  return html`<div class="hero">
    <h1>${config.WORLD_NAME}</h1>
    <p>Build your village, raise an army and conquer your neighbours in a classic strategy game for any phone or browser.</p>
  </div>
  <div class="stats">
    <div><b>${fmtNum(stats.players)}</b>players</div>
    <div><b>${fmtNum(stats.online)}</b>online now</div>
    <div><b>${fmtNum(stats.villages)}</b>villages</div>
  </div>
  <a class="btn block" href="/register">⚔️ Play now, it's free</a>
  <h2>Log in</h2>
  ${loginForm(csrf, '')}
  <h2>How it works</h2>
  <ul class="list">
    <li><span aria-hidden="true">🌾</span><span class="grow">Upgrade your <b>resource fields</b> to produce wood, clay, iron and crop every hour, even while you're offline.</span></li>
    <li><span aria-hidden="true">🏛️</span><span class="grow">Build up your <b>village</b>: storage, barracks, stable, walls and more.</span></li>
    <li><span aria-hidden="true">⚔️</span><span class="grow"><b>Train troops</b> to defend yourself, raid your neighbours and grow your empire.</span></li>
    <li><span aria-hidden="true">🛡️</span><span class="grow">New players get <b>${config.PROTECTION_HOURS} hours of protection</b> to get started safely.</span></li>
  </ul>`;
}

function loginForm(csrf: string, username: string): SafeHtml {
  return html`<form method="post" action="/login">
    ${csrfField(csrf)}
    <label for="u">Player name</label>
    <input id="u" type="text" name="username" value="${username}" autocomplete="username" required maxlength="20">
    <label for="p">Password</label>
    <input id="p" type="password" name="password" autocomplete="current-password" required maxlength="200">
    <div class="actions"><button type="submit" class="block">Log in</button></div>
  </form>`;
}

export function loginView(csrf: string, username = ''): SafeHtml {
  return html`<h1>Log in</h1>
  ${loginForm(csrf, username)}
  <div data-wallet data-csrf="${csrf}" class="actions">
    <button type="button" class="block secondary" data-action="login">🦊 Log in with wallet</button>
    <p class="small" data-status role="status"></p>
  </div>
  <script src="/static/wallet.js" defer></script>
  <p class="center small">New here? <a href="/register">Create a free account</a></p>`;
}

export function registerView(csrf: string, values: { username?: string; tribe?: string } = {}): SafeHtml {
  const selected = values.tribe && (TRIBE_IDS as readonly string[]).includes(values.tribe) ? values.tribe : 'romans';
  return html`<h1>Join ${config.WORLD_NAME}</h1>
  <form method="post" action="/register">
    ${csrfField(csrf)}
    <label for="u">Player name</label>
    <input id="u" type="text" name="username" value="${values.username ?? ''}" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_ .\\-]{3,20}" aria-describedby="uhelp">
    <p id="uhelp" class="muted small">3–20 letters, numbers, spaces, dots, dashes or underscores.</p>
    <label for="p">Password</label>
    <input id="p" type="password" name="password" autocomplete="new-password" required minlength="8" maxlength="200" aria-describedby="phelp">
    <p id="phelp" class="muted small">At least 8 characters.</p>
    <fieldset class="choices plain">
      <legend><b>Choose your tribe</b> <span class="muted small">(this cannot be changed later)</span></legend>
      ${TRIBE_IDS.map((id) => {
        const t = TRIBES[id];
        return html`<label class="choice tribepick"><img src="/static/img/units/${id}-1.svg" alt=""><input type="radio" name="tribe" value="${id}"${id === selected ? html` checked` : ''}>
          <strong>${t.name}</strong> <span class="muted small">— ${t.tagline}</span>
          <div class="small">${t.description}</div>
          <ul>${t.strengths.map((s) => html`<li>${s}</li>`)}</ul>
        </label>`;
      })}
    </fieldset>
    <div class="actions"><button type="submit" class="block">Found my village</button></div>
  </form>
  <p class="center small">Already playing? <a href="/login">Log in</a></p>`;
}
