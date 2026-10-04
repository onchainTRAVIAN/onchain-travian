import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { GameError } from '../../game/errors.js';
import { creditBalance } from '../../game/actions/credits.js';
import { prepareSiwe, verifySiwe, linkWallet, unlinkWallet, userByWallet, walletOf, type SiweRequest } from '../../crypto/wallet.js';
import { latestSnapshots } from '../../crypto/holders.js';
import { tierById } from '../../crypto/tiers.js';
import { packages } from '../../crypto/pricing.js';
import { userDeposits } from '../../crypto/indexer.js';
import { users, villages } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authed, createSession, requireAuth, setFlash } from '../session.js';
import { topupView, walletView } from '../views/wallet.js';
import { formAction, loadGamePage, sendPage } from './helpers.js';

export const walletRouter = Router();

function siweReq(req: Request): SiweRequest {
  const host = req.get('host') ?? 'localhost';
  return { domain: host, origin: `${req.protocol}://${host}` };
}

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
      address: w?.address ?? null,
      tier: tierById(w?.tier),
      snapshots: w ? latestSnapshots(db, w.address, Math.max(config.HOLDER_MIN_SNAPSHOTS, 3)) : [],
      csrf: ctx.csrf,
    }),
    { nav: 'account', chrome: page.chrome },
  );
});

const Challenge = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), purpose: z.enum(['link', 'login']) });

walletRouter.post('/wallet/challenge', (req, res) => {
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
    const message = prepareSiwe(db, siweReq(req), parsed.data.address, parsed.data.purpose, req.ctx.user?.id ?? null, req.ctx.now);
    res.json({ ok: true, message });
  } catch (err) {
    jsonError(res, err);
  }
});

const Verify = z.object({ message: z.string().max(2000), signature: z.string().max(1000), purpose: z.enum(['link', 'login']) });

walletRouter.post('/wallet/verify', async (req, res) => {
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
    if (!w) throw new GameError('No account is linked to this wallet yet. Log in with your password and link it in your profile.');
    const user = db.select().from(users).where(eq(users.id, w.userId)).get();
    if (!user || user.banned) throw new GameError('This account cannot log in');
    const village = db.select({ id: villages.id }).from(villages).where(eq(villages.userId, user.id)).get();
    createSession(res, user.id, village?.id ?? null);
    res.json({ ok: true, redirect: '/fields' });
  } catch (err) {
    jsonError(res, err);
  }
});

walletRouter.post(
  '/wallet/unlink',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    unlinkWallet(db, authed(req).user.id);
    setFlash(res, 'ok', 'Wallet unlinked. Holder perks stop at the next check.');
    res.redirect(303, '/wallet');
  }, '/wallet'),
);

walletRouter.get('/shop/topup', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  sendPage(
    req,
    res,
    'Buy Gold',
    topupView({
      accountId: ctx.user.id,
      balance: creditBalance(db, ctx.user.id),
      address: walletOf(db, ctx.user.id)?.address ?? null,
      packages: packages().filter((p) => p.credits > 0),
      deposits: userDeposits(db, ctx.user.id),
      csrf: ctx.csrf,
    }),
    { nav: 'shop', chrome: page.chrome },
  );
});
