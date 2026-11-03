import { config } from './config.js';
import { db, sqlite } from './db/index.js';
import { clock } from './clock.js';
import { ensureWorld, getMeta, setMeta } from './game/engine/world.js';
import { processDue } from './game/engine/events.js';
import { processWeek } from './game/actions/weekly.js';
import { processEndgame } from './game/actions/endgame.js';
import { processNatarAttacks } from './game/actions/natars.js';
import { backfillReportOutcomes, backfillReportPlaces } from './game/engine/reports.js';
import { processFarmLists, processTradeRoutes } from './game/actions/goldclub.js';
import { processOasisRaiders } from './game/actions/raider.js';
import { processAutoTrains } from './game/actions/autotrain.js';
import { processHousekeeping } from './game/engine/housekeeping.js';
import { backupNow, diskSpace, listBackups, removePartialBackups } from './db/backup.js';
import { createApp } from './app.js';
import { startCryptoWorkers } from './crypto/worker.js';

ensureWorld(db);
// Older reports get their loss outcome (for the report filters).
while (backfillReportOutcomes(db) > 0) {
  /* keep going */
}
// Older reports get their place columns (for "your reports on this tile"), once.
if (getMeta(db, 'report_places_done') !== '1') {
  let last = 0;
  while ((last = backfillReportPlaces(db, last)) >= 0) {
    /* keep going */
  }
  setMeta(db, 'report_places_done', '1');
}

// The world keeps moving even when nobody is online: finish builds and resolve battles every second.
const worker = setInterval(() => {
  try {
    processDue(db, clock.now());
  } catch (err) {
    console.error('World tick failed:', err);
  }
  try {
    // Monday 00:00 UTC: award last week's medals and Gold, snapshot totals for the new week.
    const r = processWeek(db, clock.now());
    if (r.awarded > 0) console.log(`Weekly medals awarded: ${r.awarded}`);
  } catch (err) {
    console.error('Weekly rollover failed:', err);
  }
  try {
    processEndgame(db, clock.now());
  } catch (err) {
    console.error('Endgame release failed:', err);
  }
  try {
    // Natars raid players with 300+ population, at most once a day, sized to their strength.
    const n = processNatarAttacks(db, clock.now());
    if (n > 0) console.log(`Natars launched ${n} attack(s)`);
  } catch (err) {
    console.error('Natar attacks failed:', err);
  }
  try {
    // Auto training (Train troops page): queue what each running plan is due, once a minute.
    processAutoTrains(db, clock.now());
  } catch (err) {
    console.error('Auto training failed:', err);
  }
  try {
    // Gold Club: automatic farm-list raids and trade-route deliveries.
    processFarmLists(db, clock.now());
    processOasisRaiders(db, clock.now());
    processTradeRoutes(db, clock.now());
  } catch (err) {
    console.error('Gold Club automation failed:', err);
  }
  try {
    // Every 10 minutes: delete old reports and expired sessions, warn when the disk is nearly full.
    processHousekeeping(db, clock.now());
  } catch (err) {
    console.error('Housekeeping failed:', err);
  }
}, 1000);

// Database snapshots every BACKUP_HOURS (the first one a minute after start, unless a recent one exists).
removePartialBackups();
let backup: Promise<void> | null = null;
const backups = setInterval(() => {
  if (config.BACKUP_HOURS <= 0 || backup) return;
  try {
    const now = clock.now();
    const last = Number(getMeta(db, 'backup_at') ?? '0');
    if (now - last < config.BACKUP_HOURS * 3_600_000) return;
    setMeta(db, 'backup_at', String(now));
    backup = backupNow(now)
      .then((name) => {
        if (name) console.log(`Backup written: ${name} (${listBackups().length} kept)`);
      })
      .catch((err: unknown) => console.error('Backup failed:', err))
      .finally(() => {
        backup = null;
      });
  } catch (err) {
    console.error('Backup check failed:', err);
  }
}, 60_000);

// A failed background promise is logged, not fatal: crashing would take the world down (and Railway stops
// restarting after a few crashes in a row).
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

const stopCrypto = startCryptoWorkers(db);

const server = createApp().listen(config.PORT, () => {
  const disk = diskSpace();
  console.log(`${config.WORLD_NAME} running on http://localhost:${config.PORT} (speed x${config.WORLD_SPEED})${disk ? `, disk ${disk.freeMb} MB free of ${disk.totalMb} MB` : ''}`);
});

function shutdown() {
  clearInterval(worker);
  clearInterval(backups);
  stopCrypto();
  // Let a running snapshot finish (at most 20 s), then close the database so the WAL is checkpointed into the file.
  const finish = () => {
    try {
      sqlite.close();
    } finally {
      process.exit(0);
    }
  };
  server.close(() => {
    if (!backup) return finish();
    void Promise.race([backup, new Promise((r) => setTimeout(r, 20_000))]).then(finish);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
