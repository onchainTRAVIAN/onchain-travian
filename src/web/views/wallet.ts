import { config, cryptoEnabled, holderTiersEnabled } from '../../config.js';
import { PERK_LABEL, type PerkKind } from '../../game/modifiers.js';
import { TIERS, type Tier } from '../../crypto/tiers.js';
import { ETH_ASSET, formatUnitsShort, parseUnitsSafe } from '../../crypto/pricing.js';
import { fmtDateTime, fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField } from './layout.js';

function perkList(t: Tier): SafeHtml {
  return html`<ul class="perks">${Object.entries(t.perks).map(([k, v]) => html`<li>${PERK_LABEL[k as PerkKind]} <b>+${Math.round((v ?? 0) * 100)}%</b></li>`)}</ul>`;
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function walletView(d: {
  address: string | null;
  tier: Tier | undefined;
  snapshots: { balance: string; takenAt: number }[];
  csrf: string;
}): SafeHtml {
  return html`<h1>🦊 Wallet & token perks</h1>
    <div data-wallet data-csrf="${d.csrf}" data-chain="${config.CHAIN_ID}" data-chain-name="${config.CHAIN_NAME}">
    ${d.address
      ? html`<div class="card cardrow"><span>Linked wallet <b class="nowrap" title="${d.address}">${short(d.address)}</b></span>
          <form method="post" action="/wallet/unlink">${csrfField(d.csrf)}<button type="submit" class="small secondary">Unlink</button></form></div>`
      : html`<p>Link your crypto wallet to unlock <b>${config.TOKEN_SYMBOL} holder perks</b> and to log in with one tap. Signing is free — no transaction, no gas.</p>
          <button type="button" class="block" data-action="link">🦊 Connect & link wallet</button>`}
    <p class="small" data-status role="status"></p>
    </div>
    <h2>Your holder status</h2>
    ${!holderTiersEnabled()
      ? html`<p class="muted small">Token perks are not active on this server yet.</p>`
      : d.tier
        ? html`<div class="card tiercard"><b class="tiername">${d.tier.icon} ${d.tier.name}</b>${perkList(d.tier)}</div>`
        : html`<p class="muted small">${d.address ? `No tier yet. Perks start once you have held enough ${config.TOKEN_SYMBOL} for ${config.HOLDER_MIN_SNAPSHOTS} snapshots in a row (checked every ${config.HOLDER_SNAPSHOT_HOURS} h).` : 'Link a wallet to get started.'}</p>`}
    ${d.snapshots.length
      ? html`<h3>Recent balance checks</h3><ul class="list">${d.snapshots.map(
          (s) => html`<li><span class="grow">${formatUnitsShort(BigInt(s.balance), config.TOKEN_DECIMALS)} ${config.TOKEN_SYMBOL}</span><span class="small muted">${fmtDateTime(s.takenAt)}</span></li>`,
        )}</ul>`
      : ''}
    <h2>Holder tiers</h2>
    <p class="small muted">Your tier uses the <b>lowest</b> balance of your last ${config.HOLDER_MIN_SNAPSHOTS} checks, so buying for a day doesn't count. Top holders among linked players also qualify by rank.</p>
    ${TIERS.map(
      (t) => html`<div class="card tiercard"><div class="cardrow"><b class="tiername">${t.icon} ${t.name}</b>
        <span class="small muted">≥ ${(t.minShare * 100).toFixed(2)}% of supply${t.topRank ? ` or top ${t.topRank}` : ''}</span></div>
        ${perkList(t)}</div>`,
    )}
    <script src="/static/wallet.js" defer></script>`;
}

export function topupView(d: {
  accountId: number;
  balance: number;
  address: string | null;
  packages: { label: string; asset: 'eth' | 'token'; amount: string; credits: number }[];
  deposits: { id: string; asset: string; amount: string; credits: number; createdAt: number }[];
  csrf: string;
}): SafeHtml {
  if (!cryptoEnabled()) {
    return html`<h1>Buy Gold</h1>
      <div class="note">Crypto payments are not switched on for this server yet. Admins: set <code>RPC_URL</code>, <code>PAYMENTS_ADDRESS</code> and <code>TOKEN_ADDRESS</code> in <code>.env</code>.</div>
      <p class="small">Balance: ${fmtNum(d.balance)} Gold</p>`;
  }
  const units = (p: { asset: 'eth' | 'token'; amount: string }) =>
    parseUnitsSafe(p.amount, p.asset === 'eth' ? 18 : config.TOKEN_DECIMALS).toString();
  return html`<h1>Buy Gold</h1>
    <p>Pay with ETH or <b>${config.TOKEN_SYMBOL}</b> on ${config.CHAIN_NAME}. Paying with ${config.TOKEN_SYMBOL} gives <b class="good">+${Math.round(config.TOKEN_BONUS * 100)}% more Gold</b>.</p>
    <div class="card cardrow"><span>Balance</span><span class="price">${fmtNum(d.balance)} Gold</span></div>
    <div data-wallet data-csrf="${d.csrf}" data-chain="${config.CHAIN_ID}" data-chain-name="${config.CHAIN_NAME}"
      data-payments="${config.PAYMENTS_ADDRESS ?? ''}" data-token="${config.TOKEN_ADDRESS ?? ''}" data-account="${d.accountId}" data-decimals="${config.TOKEN_DECIMALS}">
      <h2>Packages</h2>
      <div class="grid four">${d.packages.map(
        (p) => html`<button type="button" class="${p.asset === 'token' ? 'gold' : ''}" data-pay="${p.asset}" data-units="${units(p)}">
          ${p.label}<br><small>${fmtNum(p.credits)} Gold</small></button>`,
      )}</div>
      <h2>Custom amount</h2>
      <div class="row">
        <div><label for="ca">Amount</label><input id="ca" type="text" inputmode="decimal" placeholder="0.02" data-custom-amount></div>
        <div><label for="cs">Currency</label><select id="cs" data-custom-asset><option value="eth">ETH</option>${config.TOKEN_ADDRESS ? html`<option value="token">${config.TOKEN_SYMBOL}</option>` : ''}</select></div>
        <div><label>&nbsp;</label><button type="button" class="block" data-pay-custom>Pay</button></div>
      </div>
      <p class="small" data-status role="status"></p>
    </div>
    <p class="small muted">Credits arrive automatically after ${config.CONFIRMATIONS} block confirmation${config.CONFIRMATIONS === 1 ? '' : 's'} and you get an in-game message. Your account number is <b>#${d.accountId}</b> — it's included in the payment so the game knows it's you.
      ${d.address ? '' : html` <a href="/wallet">Link your wallet</a> for holder perks.`}</p>
    <h2>Your payments</h2>
    ${d.deposits.length === 0
      ? html`<p class="muted small">None yet.</p>`
      : html`<ul class="list">${d.deposits.map(
          (x) => html`<li><span class="grow">${x.asset === ETH_ASSET ? `${formatUnitsShort(BigInt(x.amount), 18)} ETH` : `${formatUnitsShort(BigInt(x.amount), config.TOKEN_DECIMALS)} ${config.TOKEN_SYMBOL}`}
            <span class="sub">${fmtDateTime(x.createdAt)}</span></span><b class="good">+${fmtNum(x.credits)}</b></li>`,
        )}</ul>`}
    <script src="/static/wallet.js" defer></script>`;
}
