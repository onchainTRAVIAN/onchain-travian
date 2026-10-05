import { config } from './config.js';
import { db } from './db/index.js';
import { clock } from './clock.js';
import { ensureWorld, getMeta, setMeta } from './game/engine/world.js';
import { processDue } from './game/engine/events.js';
import { processWeek } from './game/actions/weekly.js';
import { processEndgame } from './game/actions/endgame.js';
import { processNatarAttacks } from './game/actions/natars.js';
import { backfillReportOutcomes, backfillReportPlaces } from './game/engine/reports.js';
import { processFarmLists, processTradeRoutes } from './game/actions/goldclub.js';
import { processOasisRaiders } from './game/actions/raider.js';
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
    // Gold Club: automatic farm-list raids and trade-route deliveries.
    processFarmLists(db, clock.now());
    processOasisRaiders(db, clock.now());
    processTradeRoutes(db, clock.now());
  } catch (err) {
    console.error('Gold Club automation failed:', err);
  }
}, 1000);

const stopCrypto = startCryptoWorkers(db);

const server = createApp().listen(config.PORT, () => {
  console.log(`${config.WORLD_NAME} running on http://localhost:${config.PORT} (speed x${config.WORLD_SPEED})`);
});

function shutdown() {
  clearInterval(worker);
  stopCrypto();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
