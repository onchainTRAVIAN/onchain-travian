import { assetUrl } from '../assets.js';
import { shopTabs } from './shop.js';
import { panel } from './parts.js';
import { config, cryptoEnabled, holderTiersEnabled } from '../../config.js';
import { PERK_LABEL, type PerkKind } from '../../game/modifiers.js';
import { TIERS, type Tier } from '../../crypto/tiers.js';
import { ETH_ASSET, formatUnitsShort, parseUnitsSafe } from '../../crypto/pricing.js';
import { fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon } from './layout.js';

function perkList(t: Tier): SafeHtml {
  return html`<ul class="perks">${Object.entries(t.perks).map(([k, v]) => html`<li>${PERK_LABEL[k as PerkKind]} <b>+${Math.round((v ?? 0) * 100)}%</b></li>`)}</ul>`;
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function walletView(d: {
  balance: number;
  address: string | null;
  tier: Tier | undefined;
  snapshots: { balance: string; takenAt: number }[];
  csrf: string;
}): SafeHtml {
  return html`<div class="shophead"><h1>Plus &amp; Gold</h1><span class="shopbal" title="Your Gold">${icon('res/gold', 'Gold', 24, 16)} <b>${fmtNum(d.balance)}</b></span></div>
    ${shopTabs('wallet')}
    <div class="woodbody">
    <section class="spanel"><h3 class="sp-head">Wallet<span>${config.CHAIN_NAME}</span></h3><div class="pad" data-wallet data-csrf="${d.csrf}" data-chain="${config.CHAIN_ID}" data-chain-name="${config.CHAIN_NAME}">
    ${d.address
      ? html`<p class="cardrow"><span>Linked wallet <b class="nowrap" title="${d.address}">${short(d.address)}</b></span>
          <form method="post" action="/wallet/unlink">${csrfField(d.csrf)}<button type="submit" class="small secondary">Unlink</button></form></p>`
      : html`<p class="small">Link your crypto wallet to unlock <b>${config.TOKEN_SYMBOL} holder perks</b> and to log in with one tap. Signing is free - no transaction, no gas.</p>
          <button type="button" class="gbtn" data-action="link">${icon('menu/wallet', '', 16)} Connect &amp; link wallet</button>`}
    <p class="small" data-status role="status"></p>
    </div></section>
    ${panel('Your holder status', !holderTiersEnabled()
      ? html`<p class="muted small">Token perks are not active on this server yet.</p>`
      : d.tier
        ? html`<div class="tiercard"><b class="tiername">${d.tier.name}</b>${perkList(d.tier)}</div>`
        : html`<p class="muted small">${d.address ? `No tier yet. Perks start once you have held enough ${config.TOKEN_SYMBOL} for ${config.HOLDER_MIN_SNAPSHOTS} snapshots in a row (checked every ${config.HOLDER_SNAPSHOT_HOURS} h).` : 'Link a wallet to get started.'}</p>`)}
    ${d.snapshots.length
      ? panel('Recent balance checks', html`<ul class="list">${d.snapshots.map(
          (s) => html`<li><span class="grow">${formatUnitsShort(BigInt(s.balance), config.TOKEN_DECIMALS)} ${config.TOKEN_SYMBOL}</span><span class="small muted">${fmtDateTime(s.takenAt)}</span></li>`,
        )}</ul>`, { pad: false })
      : ''}
    ${panel('Holder tiers', html`<p class="small muted">Your tier uses the <b>lowest</b> balance of your last ${config.HOLDER_MIN_SNAPSHOTS} checks, so buying for a day doesn't count. Top holders among linked players also qualify by rank.</p>
    <div class="advgrid two">${TIERS.map(
      (t) => html`<div class="tiercard"><div class="cardrow"><b class="tiername">${t.name}</b>
        <span class="small muted">≥ ${(t.minShare * 100).toFixed(2)}% of supply${t.topRank ? ` or top ${t.topRank}` : ''}</span></div>
        ${perkList(t)}</div>`,
    )}</div>`)}
    </div>
    <script src="${assetUrl('wallet.js')}" defer></script>`;
}
