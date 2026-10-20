import type { Request } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { config } from '../config.js';

/**
 * The player's IP for rate limits. Railway's edge sets X-Real-IP itself (it overwrites one sent by the client, and takes it
 * from CF-Connecting-IP when Cloudflare's proxy sits in front), while the number of proxies in X-Forwarded-For varies.
 */
export function clientIp(req: Request): string {
  const real = config.NODE_ENV === 'production' ? req.get('x-real-ip')?.trim() : undefined;
  return ipKeyGenerator(real || req.ip || 'unknown');
}

/** A per-IP limit of `limit` requests per `windowMs` (effectively off in tests). */
export function limiter(windowMs: number, limit: number, handler: Options['handler']) {
  return rateLimit({ windowMs, limit: config.NODE_ENV === 'test' ? 10_000 : limit, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: clientIp, handler });
}
