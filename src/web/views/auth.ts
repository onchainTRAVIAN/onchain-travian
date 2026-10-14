import { panel } from './parts.js';
import { assetUrl, pic } from '../assets.js';
import { config } from '../../config.js';
import { TRIBES, TRIBE_IDS } from '../../game/rules/units.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon } from './layout.js';

export function landingView(stats: { players: number; online: number; villages: number }, csrf: string): SafeHtml {
  return html`<div class="hero">
    <h1 class="brand"><img src="${assetUrl('img/brand/coin-256.png')}" width="128" height="128" alt=""><img src="${assetUrl('img/brand/wordmark.svg')}" width="365" height="45" alt="${config.WORLD_NAME}"></h1>
    <p>Build your village, raise an army and conquer your neighbours in a classic strategy game for any phone or browser.</p>
  </div>
  <div class="stats">
    <div><b>${fmtNum(stats.players)}</b>players</div>
    <div><b>${fmtNum(stats.online)}</b>online now</div>
    <div><b>${fmtNum(stats.villages)}</b>villages</div>
  </div>
  ${connectPanel(csrf)}
  ${panel('How it works', html`<ul class="list howto">
    <li>${icon('res/crop', '', 18, 12)}<span class="grow">Upgrade your <b>resource fields</b> to produce wood, clay, iron and crop every hour, even while you're offline.</span></li>
    <li>${icon('menu/village', '', 18)}<span class="grow">Build up your <b>village</b>: storage, barracks, stable, walls and more.</span></li>
    <li>${icon('menu/train', '', 18)}<span class="grow"><b>Train troops</b> to defend yourself, raid your neighbours and grow your empire.</span></li>
    <li>${icon('ui/reinforce', '', 18)}<span class="grow">New players get <b>${config.PROTECTION_HOURS} hours of protection</b> to get started safely.</span></li>
  </ul>`, { pad: false })}
  <script src="${assetUrl('wallet.js')}" defer></script>`;
}

/** The one way in: connect any EVM wallet, sign a free message; new wallets go on to /register. */
function connectPanel(csrf: string): SafeHtml {
  return html`<section class="spanel connect" data-wallet data-csrf="${csrf}">
    <h3 class="sp-head">Play with your wallet</h3>
    <div class="pad center">
      <button type="button" class="gbtn green big" data-action="login">${icon('menu/wallet', '', 18)} Connect wallet</button>
      <p class="small muted">MetaMask, Rabby, Coinbase Wallet, OKX, Trust or any other EVM wallet. You only sign a message: free, no gas, no transaction.</p>
      <div class="wpick" data-picker hidden></div>
      <p class="small" data-status role="status"></p>
    </div>
  </section>`;
}

export function loginView(csrf: string): SafeHtml {
  return html`<h1>Log in</h1>
  ${connectPanel(csrf)}
  <p class="center small">New here? Connecting a wallet for the first time creates your account.</p>
  <script src="${assetUrl('wallet.js')}" defer></script>`;
}

export function registerView(csrf: string, address: string, values: { username?: string; tribe?: string } = {}): SafeHtml {
  const selected = values.tribe && (TRIBE_IDS as readonly string[]).includes(values.tribe) ? values.tribe : 'romans';
  return html`<h1>Join ${config.WORLD_NAME}</h1>
  <form method="post" action="/register" class="spanel pad stack">
    ${csrfField(csrf)}
    <p class="walletchip">${icon('menu/wallet', '', 16)} Wallet <b title="${address}">${address.slice(0, 6)}…${address.slice(-4)}</b> <span class="muted small">signed in, choose a name and a tribe</span></p>
    <label for="u">Player name</label>
    <input id="u" type="text" name="username" value="${values.username ?? ''}" autocomplete="nickname" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_ .\\-]{3,20}" aria-describedby="uhelp">
    <p id="uhelp" class="muted small">3 to 20 letters, numbers, spaces, dots, dashes or underscores.</p>
    <fieldset class="choices plain">
      <legend><b>Choose your tribe</b> <span class="muted small">(this cannot be changed later)</span></legend>
      ${TRIBE_IDS.map((id) => {
        const t = TRIBES[id];
        return html`<div class="choice tribepick"><label for="tribe-${id}"><img src="${pic(`img/units/big/${id}-1`)}" width="60" height="70" alt=""><input id="tribe-${id}" type="radio" name="tribe" value="${id}"${id === selected ? html` checked` : ''}>
          <strong>${t.name}</strong> <span class="muted small">- ${t.tagline}</span></label>
          <div class="small">${t.description}</div>
          <ul class="small">${t.strengths.map((s) => html`<li>${s}</li>`)}</ul>
        </div>`;
      })}
    </fieldset>
    <div class="actions"><button type="submit" class="gbtn green big">Found my village</button></div>
  </form>
  <p class="center small">Wrong wallet? <a href="/">Start again</a></p>`;
}
