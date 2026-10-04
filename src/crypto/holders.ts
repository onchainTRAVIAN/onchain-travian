import { and, desc, eq, like } from 'drizzle-orm';
import { getAddress, type PublicClient } from 'viem';
import type { DB } from '../db/index.js';
import { holderSnapshots, perks, wallets } from '../db/schema.js';
import { config } from '../config.js';
import { testTokenAbi } from './testToken.js';
import { computeTiers, effectiveBalance, type Tier } from './tiers.js';

const erc20 = testTokenAbi;

/** Read balances of every linked wallet and store a snapshot row each. */
export async function takeSnapshot(db: DB, client: PublicClient, now: number, tokenAddress = config.TOKEN_ADDRESS): Promise<number> {
  if (!tokenAddress) return 0;
  const token = getAddress(tokenAddress);
  const linked = db.select().from(wallets).all();
  const totalSupply = await client.readContract({ address: token, abi: erc20, functionName: 'totalSupply' });
  let n = 0;
  for (let i = 0; i < linked.length; i += 25) {
    const batch = linked.slice(i, i + 25);
    const balances = await Promise.all(
      batch.map((w) => client.readContract({ address: token, abi: erc20, functionName: 'balanceOf', args: [getAddress(w.address)] })),
    );
    db.transaction((tx) => {
      batch.forEach((w, j) => {
        tx.insert(holderSnapshots)
          .values({ address: w.address, balance: (balances[j] ?? 0n).toString(), totalSupply: totalSupply.toString(), takenAt: now })
          .run();
        n++;
      });
    });
  }
  return n;
}

/** Recompute every linked player's tier and rewrite their holder perks. */
export function applyTiers(db: DB, now: number): Map<number, Tier> {
  const linked = db.select().from(wallets).all();
  const holders: { userId: number; balance: bigint }[] = [];
  let totalSupply = 0n;
  for (const w of linked) {
    const snaps = db
      .select()
      .from(holderSnapshots)
      .where(eq(holderSnapshots.address, w.address))
      .orderBy(desc(holderSnapshots.takenAt))
      .limit(config.HOLDER_MIN_SNAPSHOTS)
      .all();
    if (snaps[0]) totalSupply = BigInt(snaps[0].totalSupply);
    holders.push({ userId: w.userId, balance: effectiveBalance(snaps.map((s) => BigInt(s.balance)), config.HOLDER_MIN_SNAPSHOTS) });
  }
  const tiers = computeTiers(holders, totalSupply);
  // Perks last a little over two snapshot periods, so they lapse if snapshots stop.
  const expiresAt = now + config.HOLDER_SNAPSHOT_HOURS * 2.5 * 3_600_000;
  db.transaction((tx) => {
    tx.delete(perks).where(like(perks.source, 'holder:%')).run();
    for (const w of linked) {
      const tier = tiers.get(w.userId);
      tx.update(wallets).set({ tier: tier?.id ?? null }).where(eq(wallets.userId, w.userId)).run();
      if (!tier) continue;
      for (const [kind, value] of Object.entries(tier.perks)) {
        tx.insert(perks).values({ userId: w.userId, kind, value: value ?? 0, source: `holder:${tier.id}`, expiresAt, createdAt: now }).run();
      }
    }
  });
  return tiers;
}

export function latestSnapshots(db: DB, address: string, limit: number) {
  return db.select().from(holderSnapshots).where(and(eq(holderSnapshots.address, address.toLowerCase()))).orderBy(desc(holderSnapshots.takenAt)).limit(limit).all();
}
