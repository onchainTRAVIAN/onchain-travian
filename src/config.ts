import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  DATABASE_PATH: z.string().min(1).default('./data/game.db'),
  WORLD_NAME: z.string().min(1).default('Ancient Realms'),
  WORLD_SPEED: z.coerce.number().positive().max(1000).default(1),
  TROOP_SPEED: z.coerce.number().positive().max(1000).default(1),
  MAP_RADIUS: z.coerce.number().int().min(5).max(400).default(50),
  PROTECTION_HOURS: z.coerce.number().min(0).max(24 * 30).default(72),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;

if (config.NODE_ENV === 'production' && config.SESSION_SECRET.startsWith('dev-only')) {
  console.error('SESSION_SECRET must be set in production');
  process.exit(1);
}
