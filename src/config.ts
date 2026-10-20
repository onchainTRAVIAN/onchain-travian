import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /**
   * The address players use, e.g. https://onchaintravian.com. When set, other hosts (the *.up.railway.app name, www.)
   * redirect here, wallet sign-in messages name this domain, and link previews use it.
   */
  PUBLIC_URL: z
    .url({ protocol: /^https?$/ })
    .transform((u) => new URL(u).origin)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /** Proxy hops in front of the app, for the real client IP (Railway alone = 1; Cloudflare proxy + Railway = 2). */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  /** Wallets (comma-separated 0x addresses) that become admins when they join or log in. */
  ADMIN_WALLETS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^0x[0-9a-f]{40}$/, 'ADMIN_WALLETS must be comma-separated 0x addresses'))),
  /** Gzipped database snapshots in <db dir>/backups every this many hours (0 = off), keeping the newest BACKUP_KEEP. */
  BACKUP_HOURS: z.coerce.number().min(0).max(24 * 7).default(6),
  BACKUP_KEEP: z.coerce.number().int().min(1).max(100).default(8),
  SESSION_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  DATABASE_PATH: z.string().min(1).default('./data/game.db'),
  WORLD_NAME: z.string().min(1).default('onchainTRAVIAN'),
  WORLD_SPEED: z.coerce.number().positive().max(1000).default(1),
  TROOP_SPEED: z.coerce.number().positive().max(1000).default(1),
  /** Merchants per Marketplace level (1 in classic Travian; fast worlds can raise it). */
  MERCHANT_MULTIPLIER: z.coerce.number().int().min(1).max(100).default(1),
  MAP_RADIUS: z.coerce.number().int().min(5).max(400).default(50),
  /** Days after the world starts when the Natars release artifacts / World Wonders (0 = only by an admin). */
  ARTIFACT_DAY: z.coerce.number().min(0).max(1000).default(0),
  WONDER_DAY: z.coerce.number().min(0).max(1000).default(0),
  PROTECTION_HOURS: z.coerce.number().min(0).max(24 * 30).default(24),
  /** Reports are deleted after this many days, and only a player's newest REPORT_CAP are kept. */
  REPORT_DAYS: z.coerce.number().positive().max(365).default(14),
  REPORT_CAP: z.coerce.number().int().min(50).max(100_000).default(1000),

  // Premium / news ticker
  TICKER_PRICE_PER_HOUR: z.coerce.number().int().min(0).default(20),
  TICKER_MAX_PER_HOUR: z.coerce.number().int().min(1).max(20).default(3),
  STARTER_CREDITS: z.coerce.number().int().min(0).default(0),

  // Crypto (all optional: crypto features switch off when unset)
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  CHAIN_NAME: z.string().default('Local Anvil'),
  RPC_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  PAYMENTS_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().or(z.literal('').transform(() => undefined)),
  TOKEN_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().or(z.literal('').transform(() => undefined)),
  TOKEN_SYMBOL: z.string().default('REALM'),
  TOKEN_DECIMALS: z.coerce.number().int().min(0).max(36).default(18),
  /** ETH/USD used until the live price feed answers (and if it never does). */
  ETH_USD: z.coerce.number().positive().default(3000),
  /** Credits for 1 whole token, before the token bonus. */
  CREDITS_PER_TOKEN: z.coerce.number().positive().default(1),
  /** Extra credits when paying with the game token (0.2 = +20%). */
  TOKEN_BONUS: z.coerce.number().min(0).max(5).default(0.2),
  CONFIRMATIONS: z.coerce.number().int().min(0).max(100).default(2),
  INDEXER_START_BLOCK: z.coerce.number().int().min(0).default(0),
  INDEXER_INTERVAL_SECONDS: z.coerce.number().int().min(2).default(15),
  HOLDER_SNAPSHOT_HOURS: z.coerce.number().positive().default(6),
  /** Tier uses the lowest balance across this many recent snapshots (anti flash-buy). */
  HOLDER_MIN_SNAPSHOTS: z.coerce.number().int().min(1).max(50).default(4),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;

export function cryptoEnabled(): boolean {
  return !!(config.RPC_URL && config.PAYMENTS_ADDRESS);
}

export function holderTiersEnabled(): boolean {
  return !!(config.RPC_URL && config.TOKEN_ADDRESS);
}
export type Config = typeof config;

if (config.NODE_ENV === 'production' && config.SESSION_SECRET.startsWith('dev-only')) {
  console.error('SESSION_SECRET must be set in production');
  process.exit(1);
}
