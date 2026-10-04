import type { DB } from '../db/index.js';
import { config, cryptoEnabled, holderTiersEnabled } from '../config.js';
import { clock } from '../clock.js';
import { getMeta, setMeta } from '../game/engine/world.js';
import { publicClient } from './chain.js';
import { indexDeposits } from './indexer.js';
import { applyTiers, takeSnapshot } from './holders.js';

/** Background jobs for on-chain data. Each job never overlaps with itself. */
export function startCryptoWorkers(db: DB): () => void {
  const timers: NodeJS.Timeout[] = [];
  let indexing = false;
  let snapshotting = false;

  if (cryptoEnabled()) {
    const runIndexer = async () => {
      if (indexing) return;
      indexing = true;
      try {
        const r = await indexDeposits(db, publicClient(), clock.now());
        if (r && r.found > 0) console.log(`Indexer: ${r.found} deposit(s), ${r.credited} credited (blocks ${r.from}-${r.to})`);
      } catch (err) {
        console.error('Deposit indexer failed:', err instanceof Error ? err.message : err);
      } finally {
        indexing = false;
      }
    };
    timers.push(setInterval(() => void runIndexer(), config.INDEXER_INTERVAL_SECONDS * 1000));
    void runIndexer();
    console.log(`Deposit indexer on: ${config.PAYMENTS_ADDRESS} (chain ${config.CHAIN_ID})`);
  }

  if (holderTiersEnabled()) {
    const periodMs = config.HOLDER_SNAPSHOT_HOURS * 3_600_000;
    const runSnapshot = async () => {
      if (snapshotting) return;
      const last = Number(getMeta(db, 'holder_snapshot_at') ?? '0');
      const now = clock.now();
      if (now - last < periodMs) return;
      snapshotting = true;
      try {
        const n = await takeSnapshot(db, publicClient(), now);
        const tiers = applyTiers(db, now);
        setMeta(db, 'holder_snapshot_at', String(now));
        console.log(`Holder snapshot: ${n} wallet(s), ${tiers.size} with a tier`);
      } catch (err) {
        console.error('Holder snapshot failed:', err instanceof Error ? err.message : err);
      } finally {
        snapshotting = false;
      }
    };
    timers.push(setInterval(() => void runSnapshot(), 60_000));
    void runSnapshot();
  }

  return () => timers.forEach((t) => clearInterval(t));
}
