import { eq } from 'drizzle-orm';
import { getAddress, type PublicClient } from 'viem';
import type { DB } from '../db/index.js';
import { deposits, messages, users } from '../db/schema.js';
import { config } from '../config.js';
import { getMeta, setMeta } from '../game/engine/world.js';
import { grantCredits } from '../game/actions/credits.js';
import { gamePaymentsAbi } from './gamePayments.js';
import { ETH_ASSET, creditsForDeposit, formatUnitsShort } from './pricing.js';

const CHUNK = 2000n;
const META_KEY = 'indexer_block';

export interface IndexResult {
  from: bigint;
  to: bigint;
  found: number;
  credited: number;
}

/**
 * Read new Deposit events (with N confirmations) and credit players exactly once per log.
 * Safe to run repeatedly and concurrently with game requests.
 */
export async function indexDeposits(db: DB, client: PublicClient, now: number, paymentsAddress = config.PAYMENTS_ADDRESS): Promise<IndexResult | null> {
  if (!paymentsAddress) return null;
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const safe = latest - BigInt(config.CONFIRMATIONS);
  const stored = getMeta(db, META_KEY);
  let from = stored !== undefined ? BigInt(stored) + 1n : BigInt(config.INDEXER_START_BLOCK);
  if (safe < from) return { from, to: safe, found: 0, credited: 0 };
  const start = from;
  let found = 0;
  let credited = 0;
  while (from <= safe) {
    const to = from + CHUNK - 1n < safe ? from + CHUNK - 1n : safe;
    const logs = await client.getContractEvents({
      address: getAddress(paymentsAddress),
      abi: gamePaymentsAbi,
      eventName: 'Deposit',
      fromBlock: from,
      toBlock: to,
    });
    db.transaction((tx) => {
      for (const log of logs) {
        const args = log.args as { accountId?: bigint; payer?: string; asset?: string; amount?: bigint };
        if (args.accountId === undefined || !args.payer || !args.asset || args.amount === undefined) continue;
        const id = `${log.transactionHash}:${log.logIndex}`;
        const accountId = args.accountId <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(args.accountId) : -1;
        const user = accountId > 0 ? tx.select({ id: users.id }).from(users).where(eq(users.id, accountId)).get() : undefined;
        const credits = creditsForDeposit(args.asset, args.amount);
        const inserted = tx
          .insert(deposits)
          .values({
            id,
            userId: user?.id ?? null,
            payer: args.payer.toLowerCase(),
            asset: args.asset.toLowerCase(),
            amount: args.amount.toString(),
            credits,
            blockNumber: Number(log.blockNumber ?? 0n),
            createdAt: now,
          })
          .onConflictDoNothing()
          .run();
        if (inserted.changes === 0) continue;
        found++;
        if (user && credits > 0 && grantCredits(tx, user.id, credits, depositLabel(args.asset, args.amount), `deposit:${id}`, now)) {
          credited++;
          tx.insert(messages)
            .values({
              fromUserId: null,
              toUserId: user.id,
              subject: `${credits} Gold added`,
              body: `Your payment of ${depositLabel(args.asset, args.amount)} has arrived. ${credits} Gold were added to your account. Thank you!\n\nTransaction: ${log.transactionHash}`,
              createdAt: now,
            })
            .run();
        }
      }
      setMeta(tx, META_KEY, to.toString());
    });
    from = to + 1n;
  }
  return { from: start, to: safe, found, credited };
}

function depositLabel(asset: string, amount: bigint): string {
  return asset.toLowerCase() === ETH_ASSET ? `${formatUnitsShort(amount, 18)} ETH` : `${formatUnitsShort(amount, config.TOKEN_DECIMALS)} ${config.TOKEN_SYMBOL}`;
}

export function userDeposits(db: DB, userId: number) {
  return db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(deposits.createdAt).all().reverse().slice(0, 20);
}

export { depositLabel };
