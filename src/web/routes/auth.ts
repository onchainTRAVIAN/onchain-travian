import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { registerPlayer } from '../../game/actions/account.js';
import { peekSignupTicket } from '../../crypto/wallet.js';
import { checkEntryTx, entryFeeOn, entryQuote, entryStatus } from '../../crypto/entry.js';
import { publicClient } from '../../crypto/chain.js';
import { onlineCount, playerCount } from '../../game/queries.js';
import { TRIBE_IDS } from '../../game/rules/units.js';
import { GameError } from '../../game/errors.js';
import { clearSignupCookie, createSession, destroySession, setFlash, signupToken } from '../session.js';
import { entryView, landingView, loginView, registerView } from '../views/auth.js';
import { sendPage } from './helpers.js';
import { limiter } from '../limits.js';

export const authRouter = Router();

const authLimiter = limiter(15 * 60_000, 30, (_req, res) => {
  setFlash(res, 'error', 'Too many attempts. Please wait a few minutes.');
  res.redirect(303, '/');
});

const registerLimiter = limiter(60 * 60_000, 5, (_req, res) => {
  setFlash(res, 'error', 'Too many new accounts from this connection. Please try again later.');
  res.redirect(303, '/register');
});

const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[A-Za-z0-9_ .-]+$/, 'Name can only use letters, numbers, spaces, dots, dashes and underscores')
    .refine((s) => !/\s{2,}/.test(s), 'Name cannot contain double spaces'),
  tribe: z.enum(TRIBE_IDS, { message: 'Choose a tribe' }),
});

authRouter.get('/', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  const stats = {
    players: playerCount(db),
    online: onlineCount(db, req.ctx.now),
    villages: db.select({ n: sql<number>`count(*)` }).from(villages).get()?.n ?? 0,
  };
  sendPage(req, res, 'Welcome', landingView(stats, req.ctx.csrf));
});

authRouter.get('/login', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  sendPage(req, res, 'Log in', loginView(req.ctx.csrf));
});

/** The verified wallet waiting for an account (signup cookie from /wallet/verify), or null. */
function pendingWallet(req: Request): { token: string; address: string } | null {
  const token = signupToken(req);
  const address = token ? peekSignupTicket(db, token, req.ctx.now) : null;
  return token && address ? { token, address } : null;
}

function connectFirst(res: Response): void {
  clearSignupCookie(res);
  setFlash(res, 'error', 'Connect your wallet first.');
  res.redirect(303, '/');
}

/** Joining: the entry fee step while this wallet has not paid it (worlds that charge one), then name + tribe. */
function joinPage(req: Request, res: Response, address: string, values: { username?: string; tribe?: string } = {}, status = 200): void {
  const fee = entryStatus(db, address);
  const view = fee.paid
    ? registerView(req.ctx.csrf, address, values, entryFeeOn() && fee.paidCents > 0)
    : entryView(req.ctx.csrf, address, fee, entryQuote(fee.dueUsd));
  sendPage(req, res, 'Join', view, { status });
}

authRouter.get('/register', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  const w = pendingWallet(req);
  if (!w) {
    connectFirst(res);
    return;
  }
  joinPage(req, res, w.address);
});

// The page polls every few seconds while the payment confirms.
const entryLimiter = limiter(60_000, 60, (_req, res) => {
  res.status(429).json({ ok: false, error: 'Too many checks. Please wait a minute.' });
});

const EntryTx = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });

/** The entry fee transaction the wallet just sent: recorded once it has enough confirmations. */
authRouter.post('/register/paid', entryLimiter, async (req, res) => {
  const w = pendingWallet(req);
  if (!w) {
    res.status(401).json({ ok: false, error: 'Your wallet sign-in expired. Connect your wallet again - your payment is kept.' });
    return;
  }
  const parsed = EntryTx.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid transaction' });
    return;
  }
  if (!entryFeeOn()) {
    res.json({ ok: true, state: 'paid' });
    return;
  }
  try {
    const r = await checkEntryTx(db, publicClient(), parsed.data.txHash as `0x${string}`, w.address, req.ctx.now);
    res.json({ ok: true, state: r.state, paidUsd: r.status.paidCents / 100, dueUsd: r.status.dueUsd });
  } catch (err) {
    console.error('Entry fee check failed:', err instanceof Error ? err.message : err);
    res.status(503).json({ ok: false, error: "Can't reach the network right now. Your payment is safe - this page keeps checking." });
  }
});

authRouter.post('/register', authLimiter, registerLimiter, async (req, res) => {
  const w = pendingWallet(req);
  if (!w) {
    connectFirst(res);
    return;
  }
  const parsed = RegisterSchema.safeParse(req.body);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const values = {
    username: typeof body.username === 'string' ? body.username.slice(0, 20) : '',
    tribe: typeof body.tribe === 'string' ? body.tribe : '',
  };
  if (!parsed.success) {
    req.ctx.flash = { type: 'error', text: parsed.error.issues[0]?.message ?? 'Please check the form.' };
    joinPage(req, res, w.address, values, 422);
    return;
  }
  try {
    const { userId, villageId } = await registerPlayer(db, { ...parsed.data, wallet: w.address, signupTicket: w.token }, req.ctx.now);
    clearSignupCookie(res);
    createSession(res, userId, villageId);
    setFlash(res, 'ok', `Welcome, ${parsed.data.username}! Your village has been founded. Start by upgrading your resource fields.`);
    res.redirect(303, '/fields');
  } catch (err) {
    if (err instanceof GameError) {
      req.ctx.flash = { type: 'error', text: err.message };
      joinPage(req, res, w.address, values, 409);
      return;
    }
    throw err;
  }
});

authRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.redirect(303, '/');
});
