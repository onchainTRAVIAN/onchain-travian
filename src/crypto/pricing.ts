import { config } from '../config.js';

export const ETH_ASSET = '0x0000000000000000000000000000000000000000';
const SCALE = 1_000_000n;

function toScaled(rate: number): bigint {
  return BigInt(Math.round(rate * Number(SCALE)));
}

/**
 * Credits for an on-chain deposit. ETH uses CREDITS_PER_ETH; the game token uses
 * CREDITS_PER_TOKEN plus the TOKEN_BONUS (e.g. +20%). Always rounds down.
 */
export function creditsForDeposit(
  asset: string,
  amount: bigint,
  opts: { creditsPerEth?: number; creditsPerToken?: number; tokenBonus?: number; tokenDecimals?: number; tokenAddress?: string } = {},
): number {
  if (amount <= 0n) return 0;
  const isEth = asset.toLowerCase() === ETH_ASSET;
  if (isEth) {
    const rate = toScaled(opts.creditsPerEth ?? config.CREDITS_PER_ETH);
    return Number((amount * rate) / (10n ** 18n * SCALE));
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
  const ethAmounts = ['0.005', '0.01', '0.05', '0.1'];
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
