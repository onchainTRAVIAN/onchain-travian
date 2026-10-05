import { config } from '../config.js';

export const ETH_ASSET = '0x0000000000000000000000000000000000000000';
const SCALE = 1_000_000n;

function toScaled(rate: number): bigint {
  return BigInt(Math.round(rate * Number(SCALE)));
}

/** Gold packages in US dollars (same amounts as the Legends shop). Bigger packages give more Gold per dollar. */
export const GOLD_PACKAGES: readonly { usd: number; gold: number; tag?: 'Best seller' | 'Best value' }[] = [
  { usd: 1.99, gold: 36 },
  { usd: 4.99, gold: 114 },
  { usd: 9.99, gold: 280 },
  { usd: 19.99, gold: 680, tag: 'Best seller' },
  { usd: 49.99, gold: 1815 },
  { usd: 99.99, gold: 3750, tag: 'Best value' },
];
/** A payment within this share of a package price counts as that package (the ETH price moves while you pay). */
const PACKAGE_TOLERANCE = 0.03;

let liveEthUsd: { usd: number; at: number } | null = null;

/** Current ETH/USD: the last live price, else the ETH_USD fallback. */
export function ethUsd(): number {
  return liveEthUsd?.usd ?? config.ETH_USD;
}
export function ethUsdUpdatedAt(): number | null {
  return liveEthUsd?.at ?? null;
}
export function setEthUsd(usd: number, at: number): void {
  if (Number.isFinite(usd) && usd > 1 && usd < 1_000_000) liveEthUsd = { usd, at };
}

/** Fetch the ETH/USD price from public feeds (CoinGecko, then Coinbase). Null if both fail. */
export async function fetchEthUsd(fetcher: typeof fetch = fetch): Promise<number | null> {
  const feeds: [string, (j: unknown) => unknown][] = [
    ['https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', (j) => (j as { ethereum?: { usd?: unknown } }).ethereum?.usd],
    ['https://api.coinbase.com/v2/prices/ETH-USD/spot', (j) => (j as { data?: { amount?: unknown } }).data?.amount],
  ];
  for (const [url, pick] of feeds) {
    try {
      const r = await fetcher(url, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
      if (!r.ok) continue;
      const v = Number(pick(await r.json()));
      if (Number.isFinite(v) && v > 1) return v;
    } catch {
      /* try the next feed */
    }
  }
  return null;
}

/** Gold for a dollar amount: exact package amounts near a package price, else the best reached package's rate. */
export function goldForUsd(usd: number): number {
  if (!(usd > 0)) return 0;
  const reached = [...GOLD_PACKAGES].reverse().find((p) => usd >= p.usd * (1 - PACKAGE_TOLERANCE)) ?? GOLD_PACKAGES[0]!;
  if (Math.abs(usd - reached.usd) <= reached.usd * PACKAGE_TOLERANCE) return reached.gold;
  return Math.floor(usd * (reached.gold / reached.usd));
}

/** ETH (in wei) for a package at the given price, rounded up to 6 decimals. */
export function weiForUsd(usd: number, price = ethUsd()): bigint {
  const micro = Math.ceil((usd / price) * 1e6);
  return BigInt(micro) * 10n ** 12n;
}

/**
 * Credits for an on-chain deposit. ETH is valued in dollars at the live price and follows the
 * Gold packages; the game token uses CREDITS_PER_TOKEN plus the TOKEN_BONUS (e.g. +20%). Always rounds down.
 */
export function creditsForDeposit(
  asset: string,
  amount: bigint,
  opts: { ethUsd?: number; creditsPerToken?: number; tokenBonus?: number; tokenDecimals?: number; tokenAddress?: string } = {},
): number {
  if (amount <= 0n) return 0;
  const isEth = asset.toLowerCase() === ETH_ASSET;
  if (isEth) {
    const usd = (Number(amount / 10n ** 9n) / 1e9) * (opts.ethUsd ?? ethUsd());
    return goldForUsd(usd);
  }
  const token = (opts.tokenAddress ?? config.TOKEN_ADDRESS ?? '').toLowerCase();
  if (!token || asset.toLowerCase() !== token) return 0;
  const rate = toScaled((opts.creditsPerToken ?? config.CREDITS_PER_TOKEN) * (1 + (opts.tokenBonus ?? config.TOKEN_BONUS)));
  const decimals = BigInt(opts.tokenDecimals ?? config.TOKEN_DECIMALS);
  return Number((amount * rate) / (10n ** decimals * SCALE));
}

/** Human amount ("0.05") to base units, without floating point errors. */
export function parseUnitsSafe(value: string, decimals: number): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) throw new Error('Invalid amount');
  const whole = m[1] ?? '0';
  const frac = (m[2] ?? '').slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac || '0');
}

export function formatUnitsShort(value: bigint, decimals: number, maxFrac = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  let frac = (value % base).toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '');
  if (frac) frac = '.' + frac;
  return `${whole.toLocaleString('en-US')}${frac}`;
}

/** Suggested top-up packages shown in the shop. */
export function packages(): { label: string; asset: 'eth' | 'token'; amount: string; credits: number }[] {
  const ethAmounts = GOLD_PACKAGES.map((p) => formatUnitsShort(weiForUsd(p.usd), 18, 6).replace(/,/g, ''));
  const tokenUnit = config.CREDITS_PER_TOKEN > 0 ? 100 / config.CREDITS_PER_TOKEN : 100;
  const tokenAmounts = [1, 5, 25, 50].map((k) => String(Math.round(k * tokenUnit)));
  return [
    ...ethAmounts.map((a) => ({ label: `${a} ETH`, asset: 'eth' as const, amount: a, credits: creditsForDeposit(ETH_ASSET, parseUnitsSafe(a, 18)) })),
    ...tokenAmounts.map((a) => ({
      label: `${a} ${config.TOKEN_SYMBOL}`,
      asset: 'token' as const,
      amount: a,
      credits: config.TOKEN_ADDRESS ? creditsForDeposit(config.TOKEN_ADDRESS, parseUnitsSafe(a, config.TOKEN_DECIMALS)) : 0,
    })),
  ];
}
