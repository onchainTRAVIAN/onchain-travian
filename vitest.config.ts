import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pin the world settings so tests don't depend on a local .env (CI has none).
    env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:', WORLD_SPEED: '1', TROOP_SPEED: '1', MERCHANT_MULTIPLIER: '1', MAP_RADIUS: '50', PROTECTION_HOURS: '72', STARTER_CREDITS: '0' },
    // World generation + password hashing in parallel files can exceed 10 s on a busy machine.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
