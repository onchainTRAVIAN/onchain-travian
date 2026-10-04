import type { PerkKind } from '../game/modifiers.js';

export interface Tier {
  id: string;
  name: string;
  icon: string;
  /** Minimum share of total supply (0.001 = 0.1%). */
  minShare: number;
  /** Top-N holders (among linked wallets) also reach this tier. */
  topRank: number;
  perks: Partial<Record<PerkKind, number>>;
}

/** Ordered from lowest to highest. Values are fractions (0.1 = +10%). */
export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze Holder', icon: '🥉', minShare: 0.0001, topRank: 0, perks: { build_speed: 0.05, production_all: 0.05 } },
  { id: 'silver', name: 'Silver Holder', icon: '🥈', minShare: 0.001, topRank: 0, perks: { build_speed: 0.1, production_all: 0.1, troop_cost: 0.05 } },
  { id: 'gold', name: 'Gold Holder', icon: '🥇', minShare: 0.005, topRank: 10, perks: { build_speed: 0.15, production_all: 0.15, troop_cost: 0.1, troop_carry: 0.1 } },
  { id: 'diamond', name: 'Diamond Holder', icon: '💠', minShare: 0.01, topRank: 3, perks: { build_speed: 0.2, production_all: 0.2, troop_cost: 0.15, troop_carry: 0.2 } },
];

export function tierById(id: string | null | undefined): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/**
 * Assign tiers from effective balances. A holder gets the best tier reached either by
 * share of total supply or by rank among linked wallets. Zero balances get nothing.
 */
export function computeTiers(holders: { userId: number; balance: bigint }[], totalSupply: bigint): Map<number, Tier> {
  const out = new Map<number, Tier>();
  const ranked = holders.filter((h) => h.balance > 0n).sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : a.userId - b.userId));
  ranked.forEach((h, idx) => {
    const rank = idx + 1;
    // share in parts-per-million to stay in integer math
    const ppm = totalSupply > 0n ? Number((h.balance * 1_000_000n) / totalSupply) : 0;
    let best: Tier | undefined;
    for (const t of TIERS) {
      const byShare = ppm >= Math.round(t.minShare * 1_000_000);
      const byRank = t.topRank > 0 && rank <= t.topRank;
      if (byShare || byRank) best = t;
    }
    if (best) out.set(h.userId, best);
  });
  return out;
}

/** Effective balance = the lowest balance over the last N snapshots (0 until N exist). */
export function effectiveBalance(snapshotBalances: bigint[], required: number): bigint {
  if (snapshotBalances.length < required) return 0n;
  return snapshotBalances.slice(0, required).reduce((min, b) => (b < min ? b : min));
}
