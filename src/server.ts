import { config } from './config.js';
import { db } from './db/index.js';
import { clock } from './clock.js';
import { ensureWorld } from './game/engine/world.js';
import { processDue } from './game/engine/events.js';
import { createApp } from './app.js';
import { startCryptoWorkers } from './crypto/worker.js';

ensureWorld(db);

// The world keeps moving even when nobody is online: finish builds and resolve battles every second.
const worker = setInterval(() => {
  try {
    processDue(db, clock.now());
  } catch (err) {
    console.error('World tick failed:', err);
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
