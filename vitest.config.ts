import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: { NODE_ENV: 'test', DATABASE_PATH: ':memory:' },
    // World generation + password hashing in parallel files can exceed 10 s on a busy machine.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
