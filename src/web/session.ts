import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessions, users, villages } from '../db/schema.js';
import { config } from '../config.js';
import { clock } from '../clock.js';
import { processDue } from '../game/engine/events.js';
import type { UserRow } from '../game/actions/account.js';

export const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 30 * 24 * 3_600_000;
const FLASH_COOKIE = 'flash';

export interface Flash {
  type: 'ok' | 'error';
  text: string;
}

export interface Ctx {
  user: UserRow | null;
  sessionId: string | null;
  csrf: string;
  villageId: number | null;
  flash: Flash | null;
  now: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: Ctx;
    }
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/',
};

export function createSession(res: Response, userId: number, villageId: number | null): void {
  const token = randomBytes(32).toString('base64url');
  const now = clock.now();
  db.insert(sessions)
    .values({ id: sha256(token), userId, csrf: randomBytes(24).toString('base64url'), villageId, createdAt: now, expiresAt: now + SESSION_TTL_MS })
    .run();
  res.cookie(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_TTL_MS });
}

export function destroySession(req: Request, res: Response): void {
  if (req.ctx.sessionId) db.delete(sessions).where(eq(sessions.id, req.ctx.sessionId)).run();
  res.clearCookie(SESSION_COOKIE, cookieBase);
}

export function setFlash(res: Response, type: Flash['type'], text: string): void {
  res.cookie(FLASH_COOKIE, JSON.stringify({ type, text: text.slice(0, 300) }), { ...cookieBase, maxAge: 60_000 });
}

function readFlash(req: Request, res: Response): Flash | null {
  const raw: unknown = req.cookies?.[FLASH_COOKIE];
  if (typeof raw !== 'string') return null;
  res.clearCookie(FLASH_COOKIE, cookieBase);
  try {
    const p: unknown = JSON.parse(raw);
    if (p && typeof p === 'object' && 'type' in p && 'text' in p) {
      const { type, text } = p as { type: unknown; text: unknown };
      if ((type === 'ok' || type === 'error') && typeof text === 'string') return { type, text };
    }
  } catch {
    // ignore malformed flash
  }
  return null;
}

/** Anonymous visitors still get a CSRF token (for login/register forms), kept in a cookie. */
const ANON_CSRF_COOKIE = 'csrf';

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const now = clock.now();
  req.ctx = { user: null, sessionId: null, csrf: '', villageId: null, flash: readFlash(req, res), now };

  // Advance the world before anything reads it.
  processDue(db, now);

  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 0 && token.length < 200) {
    const id = sha256(token);
    const row = db.select({ s: sessions, u: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.id, id)).get();
    if (row && row.s.expiresAt > now && !row.u.banned) {
      req.ctx.user = row.u;
      req.ctx.sessionId = id;
      req.ctx.csrf = row.s.csrf;
      req.ctx.villageId = row.s.villageId;
      // Sliding expiry and "last seen", written at most once a minute.
      if (now - row.u.lastSeenAt > 60_000) db.update(users).set({ lastSeenAt: now }).where(eq(users.id, row.u.id)).run();
      if (row.s.expiresAt - now < SESSION_TTL_MS - 86_400_000) {
        db.update(sessions).set({ expiresAt: now + SESSION_TTL_MS }).where(eq(sessions.id, id)).run();
      }
    } else if (row) {
      db.delete(sessions).where(eq(sessions.id, id)).run();
      res.clearCookie(SESSION_COOKIE, cookieBase);
    }
  }

  if (!req.ctx.user) {
    const anon: unknown = req.cookies?.[ANON_CSRF_COOKIE];
    if (typeof anon === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(anon)) req.ctx.csrf = anon;
    else {
      req.ctx.csrf = randomBytes(24).toString('base64url');
      res.cookie(ANON_CSRF_COOKIE, req.ctx.csrf, { ...cookieBase, maxAge: 86_400_000 });
    }
  }

  // Resolve the active village: the session's choice if still owned, else the capital/first one.
  if (req.ctx.user) {
    const userId = req.ctx.user.id;
    let vid = req.ctx.villageId;
    if (vid !== null) {
      const owned = db.select({ id: villages.id }).from(villages).where(and(eq(villages.id, vid), eq(villages.userId, userId))).get();
      if (!owned) vid = null;
    }
    if (vid === null) {
      vid =
        db.select({ id: villages.id }).from(villages).where(eq(villages.userId, userId)).orderBy(villages.id).limit(1).get()?.id ?? null;
    }
    req.ctx.villageId = vid;
  }
  next();
}

export function setActiveVillage(req: Request, villageId: number): void {
  if (!req.ctx.sessionId) return;
  db.update(sessions).set({ villageId }).where(eq(sessions.id, req.ctx.sessionId)).run();
  req.ctx.villageId = villageId;
}

/** Reject state-changing requests without a matching CSRF token. */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const body: unknown = req.body;
  const sent = body && typeof body === 'object' && '_csrf' in body ? (body as { _csrf: unknown })._csrf : undefined;
  const expected = req.ctx.csrf;
  if (
    typeof sent !== 'string' ||
    sent.length !== expected.length ||
    expected.length === 0 ||
    !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
  ) {
    if (req.is('application/json')) {
      res.status(403).json({ ok: false, error: 'Your session expired. Please reload the page.' });
      return;
    }
    setFlash(res, 'error', 'Your session expired. Please try again.');
    res.redirect(303, req.get('referer') && sameOrigin(req) ? (req.get('referer') ?? '/') : '/');
    return;
  }
  next();
}

function sameOrigin(req: Request): boolean {
  const ref = req.get('referer');
  if (!ref) return false;
  try {
    return new URL(ref).host === req.get('host');
  } catch {
    return false;
  }
}

export interface AuthedCtx extends Ctx {
  user: UserRow;
  villageId: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.ctx.user || req.ctx.villageId === null) {
    res.redirect(303, '/login');
    return;
  }
  next();
}

export function authed(req: Request): AuthedCtx {
  const c = req.ctx;
  if (!c.user || c.villageId === null) throw new Error('requireAuth middleware missing');
  return c as AuthedCtx;
}
