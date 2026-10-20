import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { GameError } from '../../game/errors.js';
import { creditBalance } from '../../game/actions/credits.js';
import { createSignupTicket, prepareSiwe, verifySiwe, linkWallet, userByWallet, walletOf, SIGNUP_TTL_MS, type SiweRequest } from '../../crypto/wallet.js';
import { latestSnapshots } from '../../crypto/holders.js';
import { tierById } from '../../crypto/tiers.js';
import { users, villages } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authed, clearSignupCookie, createSession, requireAuth, setFlash, setSignupCookie } from '../session.js';
import { walletView } from '../views/wallet.js';
import { formAction, loadGamePage, sendPage } from './helpers.js';

export const walletRouter = Router();

/** The site the wallet signs in to: PUBLIC_URL when set (other hosts redirect there), else the host the request came to. */
function siweReq(req: Request): SiweRequest {
  if (config.PUBLIC_URL) {
    const u = new URL(config.PUBLIC_URL);
    return { domain: u.host, origin: u.origin };
  }
  const host = req.get('host') ?? 'localhost';
  return { domain: host, origin: `${req.protocol}://${host}` };
}

// A sign-in is one challenge + one verify; this leaves room for retries but stops nonce spam and signature floods.
const walletLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.NODE_ENV === 'test' ? 10_000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: 'Too many attempts. Please wait a minute and try again.' });
  },
});

function jsonError(res: Response, err: unknown): void {
  if (err instanceof GameError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'Something went wrong' });
}

walletRouter.get('/wallet', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const w = walletOf(db, ctx.user.id);
  sendPage(
    req,
    res,
    'Wallet',
    walletView({
      balance: creditBalance(db, ctx.user.id),
      address: w?.address ?? null,
      tier: tierById(w?.tier),
      snapshots: w ? latestSnapshots(db, w.address, Math.max(config.HOLDER_MIN_SNAPSHOTS, 3)) : [],
      csrf: ctx.csrf,
    }),
    { nav: 'wallet', chrome: page.chrome },
  );
});

const Challenge = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  purpose: z.enum(['link', 'login']),
  /** The chain the wallet is on (the message names it, so wallets don't ask to switch). */
  chainId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
});

walletRouter.post('/wallet/challenge', walletLimiter, (req, res) => {
  const parsed = Challenge.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid request' });
    return;
  }
  if (parsed.data.purpose === 'link' && !req.ctx.user) {
    res.status(401).json({ ok: false, error: 'Log in first' });
    return;
  }
  try {
    const message = prepareSiwe(db, siweReq(req), parsed.data.address, parsed.data.purpose, req.ctx.user?.id ?? null, req.ctx.now, parsed.data.chainId);
    res.json({ ok: true, message });
  } catch (err) {
    jsonError(res, err);
  }
});

const Verify = z.object({ message: z.string().max(2000), signature: z.string().max(1000), purpose: z.enum(['link', 'login']) });

walletRouter.post('/wallet/verify', walletLimiter, async (req, res) => {
  const parsed = Verify.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid request' });
    return;
  }
  const { message, signature, purpose } = parsed.data;
  try {
    if (purpose === 'link') {
      if (!req.ctx.user) throw new GameError('Log in first');
      const address = await verifySiwe(db, siweReq(req), message, signature, 'link', req.ctx.user.id, req.ctx.now);
      linkWallet(db, req.ctx.user.id, address, req.ctx.now);
      setFlash(res, 'ok', 'Wallet linked! Holder perks are checked regularly.');
      res.json({ ok: true, redirect: '/wallet' });
      return;
    }
    const address = await verifySiwe(db, siweReq(req), message, signature, 'login', null, req.ctx.now);
    const w = userByWallet(db, address);
    if (!w) {
      // A new player: the verified wallet may now create one account (name + tribe on /register).
      setSignupCookie(res, createSignupTicket(db, address, req.ctx.now), SIGNUP_TTL_MS);
      res.json({ ok: true, redirect: '/register' });
      return;
    }
    const user = db.select().from(users).where(eq(users.id, w.userId)).get();
    if (!user || user.banned) throw new GameError('This account cannot log in');
    if (config.ADMIN_WALLETS.includes(address) && user.role !== 'admin') {
      db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id)).run();
      console.log(`Admin role given to ${user.username} (wallet in ADMIN_WALLETS)`);
    }
    const village = db.select({ id: villages.id }).from(villages).where(eq(villages.userId, user.id)).get();
    clearSignupCookie(res);
    createSession(res, user.id, village?.id ?? null);
    res.json({ ok: true, redirect: '/fields' });
  } catch (err) {
    jsonError(res, err);
  }
});

walletRouter.get('/shop/topup', requireAuth, (_req, res) => res.redirect(302, '/shop?tab=buy'));
