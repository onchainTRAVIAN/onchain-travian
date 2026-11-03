import { createPublicClient, defineChain, http, type PublicClient } from 'viem';
import { config } from '../config.js';

let client: PublicClient | undefined;

export function chain() {
  return defineChain({
    id: config.CHAIN_ID,
    name: config.CHAIN_NAME,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [config.RPC_URL ?? 'http://127.0.0.1:8545'] } },
  });
}

export function publicClient(): PublicClient {
  client ??= createPublicClient({ chain: chain(), transport: http(config.RPC_URL) }) as PublicClient;
  return client;
}

/** Test hook. */
export function setPublicClient(c: PublicClient | undefined): void {
  client = c;
}

/**
 * An RPC error for the log, without the RPC address: viem puts the full URL (a keyed RPC carries the API key in its
 * path) into its error messages.
 */
export function rpcErrorText(err: unknown): string {
  const e = err as { shortMessage?: unknown; message?: unknown };
  let text = typeof e?.shortMessage === 'string' ? e.shortMessage : typeof e?.message === 'string' ? e.message : String(err);
  if (config.RPC_URL) text = text.split(config.RPC_URL).join('<RPC_URL>');
  return text.replace(/(\/v\d+\/)[A-Za-z0-9_-]{8,}/g, '$1***');
}

/** A provider refusing a log query for its block range or result size (each provider words it differently). */
function isRangeError(err: unknown): boolean {
  const e = err as { shortMessage?: unknown; details?: unknown; message?: unknown };
  const text = [e?.shortMessage, e?.details, e?.message].filter((x) => typeof x === 'string').join(' ').toLowerCase();
  return /block range|range (is )?too (large|big|wide)|too many (blocks|results|logs)|more than \d+ results|limited to|response size|exceed/.test(text);
}

/**
 * Blocks per eth_getLogs request for one background reader. Starts at `max`, shrinks when the RPC says the range is
 * too large (free plans allow as little as 10 blocks), and grows back after a run of successes. Other errors (rate
 * limits, timeouts) are not about the range: they are thrown, and the reader tries again on its next run.
 */
export class LogRange {
  size: bigint;
  private ok = 0;
  constructor(
    private readonly max = 2000n,
    private readonly min = 10n,
  ) {
    this.size = max;
  }

  /** After a failed request: true = shrunk, retry with the smaller range; false = rethrow. */
  shrink(err: unknown): boolean {
    if (!isRangeError(err) || this.size <= this.min) return false;
    this.size = this.size > 50n ? this.size / 5n : this.min;
    this.ok = 0;
    return true;
  }

  succeeded(): void {
    if (++this.ok >= 20 && this.size < this.max) {
      this.size = this.size * 2n > this.max ? this.max : this.size * 2n;
      this.ok = 0;
    }
  }
}
