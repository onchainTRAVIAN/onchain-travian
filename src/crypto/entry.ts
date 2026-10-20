import { and, eq, isNull, sql } from 'drizzle-orm';
import { decodeEventLog, encodeFunctionData, getAddress, TransactionReceiptNotFoundError, type Hex, type PublicClient } from 'viem';
import type { DB, Tx } from '../db/index.js';
import { entryPayments } from '../db/schema.js';
import { config } from '../config.js';
import { getMeta, setMeta } from '../game/engine/world.js';
import { GameError } from '../game/errors.js';
import { gameEntryAbi } from './gameEntry.js';
import { ethUsd, formatUnitsShort, weiForUsd } from './pricing.js';

/** A payment may fall this far short of the fee: the ETH price moves while the player pays. */
const TOLERANCE = 0.05;
/** Payments under this share of the fee are not recorded (dust can't fill the table). */
const DUST = 0.01;
const META_KEY = 'entry_indexer_block';
/** Blocks per log request. Shrinks when the RPC refuses a range (provider plans limit it differently) and stays small. */
let chunk = 2000n;

/** New accounts pay the entry fee (needs the contract and an RPC to check payments). */
export function entryFeeOn(): boolean {
  return config.ENTRY_FEE_USD > 0 && !!config.ENTRY_ADDRESS && !!config.RPC_URL;
}

/** "$1" / "$2.50" */
export function feeLabel(usd = config.ENTRY_FEE_USD): string {
  return `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
}

/** Admins (ADMIN_WALLETS) open the world, they never pay. */
function exempt(address: string): boolean {
  return config.ADMIN_WALLETS.includes(address.toLowerCase());
}

export interface EntryStatus {
  paid: boolean;
  /** Unused payments of this wallet, in cents. */
  paidCents: number;
  /** What still has to be sent now, in dollars (the full fee, or the rest after a short payment). */
  dueUsd: number;
}

export function entryStatus(db: DB | Tx, address: string): EntryStatus {
  if (!entryFeeOn() || exempt(address)) return { paid: true, paidCents: 0, dueUsd: 0 };
  const paidCents =
    db
      .select({ c: sql<number>`coalesce(sum(${entryPayments.usdCents}), 0)` })
      .from(entryPayments)
      .where(and(eq(entryPayments.payer, address.toLowerCase()), isNull(entryPayments.userId)))
      .get()?.c ?? 0;
  const feeCents = Math.round(config.ENTRY_FEE_USD * 100);
  const paid = paidCents >= Math.round(feeCents * (1 - TOLERANCE));
  return { paid, paidCents, dueUsd: paid ? 0 : (feeCents - paidCents) / 100 };
}

/** The transaction the player's wallet sends: to, value (wei) and call data for payEntry(). */
export function entryQuote(dueUsd: number): { to: string; wei: bigint; eth: string; data: Hex; ethUsd: number } {
  const wei = weiForUsd(dueUsd);
  return {
    to: getAddress(config.ENTRY_ADDRESS ?? '0x0000000000000000000000000000000000000000'),
    wei,
    eth: formatUnitsShort(wei, 18, 6),
    data: encodeFunctionData({ abi: gameEntryAbi, functionName: 'payEntry' }),
    ethUsd: ethUsd(),
  };
}

/** Inside the account-creating transaction: the wallet's payments now belong to `userId`. Throws if the fee is not paid. */
export function useEntry(tx: Tx, address: string, userId: number): void {
  if (!entryFeeOn() || exempt(address)) return;
  if (!entryStatus(tx, address).paid) throw new GameError(`Pay the ${feeLabel()} entry fee first.`);
  tx.update(entryPayments)
    .set({ userId })
    .where(and(eq(entryPayments.payer, address.toLowerCase()), isNull(entryPayments.userId)))
    .run();
}

export interface EntryLog {
  id: string;
  player: string;
  amount: bigint;
  blockNumber: bigint;
}

/** Store payments once each (valued at the current ETH price); returns how many were new. */
export function recordEntries(db: DB | Tx, logs: EntryLog[], now: number): number {
  let n = 0;
  for (const l of logs) {
    const usd = (Number(l.amount / 10n ** 9n) / 1e9) * ethUsd();
    if (usd < config.ENTRY_FEE_USD * DUST) continue;
    n += db
      .insert(entryPayments)
      .values({ id: l.id, payer: l.player.toLowerCase(), amount: l.amount.toString(), usdCents: Math.floor(usd * 100), blockNumber: Number(l.blockNumber), createdAt: now })
      .onConflictDoNothing()
      .run().changes;
  }
  return n;
}

function decode(log: { address: string; data: Hex; topics: [Hex, ...Hex[]] | []; transactionHash: Hex | null; logIndex: number | null; blockNumber: bigint | null }): EntryLog | null {
  if (!config.ENTRY_ADDRESS || log.address.toLowerCase() !== config.ENTRY_ADDRESS.toLowerCase()) return null;
  try {
    const ev = decodeEventLog({ abi: gameEntryAbi, data: log.data, topics: log.topics, eventName: 'EntryPaid' });
    return { id: `${log.transactionHash}:${log.logIndex}`, player: ev.args.player, amount: ev.args.amount, blockNumber: log.blockNumber ?? 0n };
  } catch {
    return null;
  }
}

/**
 * Fast path while the player waits: their browser sends the transaction hash. 'pending' until it has CONFIRMATIONS,
 * 'missing' when it holds no payment from this wallet; once recorded, 'paid' or 'short' (paid too little).
 */
export async function checkEntryTx(db: DB, client: PublicClient, hash: Hex, address: string, now: number): Promise<{ state: 'pending' | 'failed' | 'missing' | 'paid' | 'short'; status: EntryStatus }> {
  const status = () => entryStatus(db, address);
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch (err) {
    if (err instanceof TransactionReceiptNotFoundError) return { state: 'pending', status: status() };
    throw err;
  }
  if (receipt.status !== 'success') return { state: 'failed', status: status() };
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  if (latest - receipt.blockNumber < BigInt(config.CONFIRMATIONS)) return { state: 'pending', status: status() };
  const mine = receipt.logs.map(decode).filter((l): l is EntryLog => !!l && l.player.toLowerCase() === address.toLowerCase());
  if (mine.length === 0) return { state: 'missing', status: status() };
  recordEntries(db, mine, now);
  const s = status();
  return { state: s.paid ? 'paid' : 'short', status: s };
}

/** Background: read every EntryPaid event with CONFIRMATIONS (players who closed the page still get their account). */
export async function indexEntries(db: DB, client: PublicClient, now: number): Promise<{ from: bigint; to: bigint; found: number } | null> {
  if (!config.ENTRY_ADDRESS) return null;
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const safe = latest - BigInt(config.CONFIRMATIONS);
  const stored = getMeta(db, META_KEY);
  // Without ENTRY_START_BLOCK start near the head: the browser's fast path still records new payments.
  let from = stored !== undefined ? BigInt(stored) + 1n : config.ENTRY_START_BLOCK > 0 ? BigInt(config.ENTRY_START_BLOCK) : safe > 10_000n ? safe - 10_000n : 0n;
  if (safe < from) return { from, to: safe, found: 0 };
  const start = from;
  let found = 0;
  while (from <= safe) {
    const to = from + chunk - 1n < safe ? from + chunk - 1n : safe;
    let logs;
    try {
      logs = await client.getLogs({ address: getAddress(config.ENTRY_ADDRESS), fromBlock: from, toBlock: to });
    } catch (err) {
      if (chunk <= 10n) throw err;
      chunk = chunk > 50n ? chunk / 5n : 10n;
      continue;
    }
    db.transaction((tx) => {
      found += recordEntries(tx, logs.map(decode).filter((l): l is EntryLog => !!l), now);
      setMeta(tx, META_KEY, to.toString());
    });
    from = to + 1n;
  }
  return { from: start, to: safe, found };
}

/** Admin page: accounts that paid and the dollars received. */
export function entryTotals(db: DB): { accounts: number; usd: number } {
  const r = db
    .select({ accounts: sql<number>`count(distinct ${entryPayments.userId})`, cents: sql<number>`coalesce(sum(${entryPayments.usdCents}), 0)` })
    .from(entryPayments)
    .get();
  return { accounts: r?.accounts ?? 0, usd: (r?.cents ?? 0) / 100 };
}
