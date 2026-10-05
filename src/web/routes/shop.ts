import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { hasGoldClub } from '../../game/actions/goldclub.js';
import { db } from '../../db/index.js';
import { buildOrders } from '../../db/schema.js';
import {
  activeBoosts,
  bookTicker,
  buyBoost,
  creditBalance,
  creditHistory,
  finishConstructionNow,
  finishResearchNow,
  finishTrainingNow,
  myTickerBookings,
  npcTrade,
  transferGold,
  buyProtection,
  protectionStatus,
  tickerAvailability,
} from '../../game/actions/credits.js';
import { capacityFor, stockOf } from '../../game/engine/state.js';
import { res } from '../../game/rules/resources.js';
import { authed, setFlash } from '../session.js';
import { shopView, tickerView } from '../views/shop.js';
import { backUrl, formAction, loadGamePage, sendPage } from './helpers.js';

export const shopRouter = Router();

shopRouter.get('/shop', (req, res_) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  sendPage(
    req,
    res_,
    'Shop',
    shopView({
      balance: page.chrome.credits,
      boosts: activeBoosts(db, ctx.user.id, ctx.now),
      stock: stockOf(page.state.village),
      capacity: capacityFor(page.state),
      history: creditHistory(db, ctx.user.id, 20),
      sendTo: typeof req.query.to === 'string' ? req.query.to.slice(0, 20) : '',
      protection: protectionStatus(db, ctx.user.id, ctx.now),
      goldClub: hasGoldClub(db, ctx.user.id),
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'shop', chrome: page.chrome },
  );
});

shopRouter.post(
  '/shop/protection',
  formAction(z.object({}), (req, r) => {
    const ctx = authed(req);
    buyProtection(db, ctx.user.id, ctx.now);
    setFlash(r, 'ok', 'Your villages are protected for the next 24 hours.');
    r.redirect(303, '/shop#protection');
  }, '/shop#protection'),
);

shopRouter.post(
  '/shop/transfer',
  formAction(
    z.object({ to: z.string().trim().min(1).max(20), amount: z.coerce.number().int().min(1), note: z.string().max(200).default('') }),
    (req, r, d) => {
      const ctx = authed(req);
      const t = transferGold(db, ctx.user.id, d.to, d.amount, d.note, ctx.now);
      setFlash(r, 'ok', `Sent ${d.amount} Gold to ${t.toName}. Your balance: ${t.balance} Gold.`);
      r.redirect(303, '/shop#gold');
    },
    '/shop#gold',
  ),
);

shopRouter.post(
  '/shop/boost',
  formAction(z.object({ product: z.string().max(30) }), (req, r, d) => {
    const ctx = authed(req);
    const p = buyBoost(db, ctx.user.id, d.product, ctx.now);
    setFlash(r, 'ok', `${p.icon} ${p.name} is active!`);
    r.redirect(303, '/shop');
  }, '/shop'),
);

const orderId = z.object({ orderId: z.coerce.number().int().positive() });

shopRouter.post(
  '/shop/finish/build',
  formAction(orderId, (req, r, d) => {
    const ctx = authed(req);
    const slot = db.select({ slot: buildOrders.slot }).from(buildOrders).where(eq(buildOrders.id, d.orderId)).get()?.slot;
    const price = finishConstructionNow(db, ctx.user.id, d.orderId, ctx.now);
    setFlash(r, 'ok', `Construction finished for ${price} Gold.`);
    // Resource fields (slots 1–18) live on the village overview, buildings in the village centre.
    r.redirect(303, backUrl(req, slot !== undefined && slot <= 18 ? '/fields' : '/village'));
  }),
);

shopRouter.post(
  '/shop/finish/train',
  formAction(orderId, (req, r, d) => {
    const ctx = authed(req);
    const price = finishTrainingNow(db, ctx.user.id, d.orderId, ctx.now);
    setFlash(r, 'ok', `Training finished for ${price} Gold.`);
    r.redirect(303, backUrl(req, '/village'));
  }),
);

shopRouter.post(
  '/shop/finish/research',
  formAction(orderId, (req, r, d) => {
    const ctx = authed(req);
    const price = finishResearchNow(db, ctx.user.id, d.orderId, ctx.now);
    setFlash(r, 'ok', `Research finished for ${price} Gold.`);
    r.redirect(303, backUrl(req, '/village'));
  }),
);

const amount = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(1e9));

shopRouter.post(
  '/shop/npc',
  formAction(z.object({ wood: amount, clay: amount, iron: amount, crop: amount }), (req, r, d) => {
    const ctx = authed(req);
    const got = npcTrade(db, ctx.user.id, ctx.villageId, res(d.wood, d.clay, d.iron, d.crop), ctx.now);
    setFlash(r, 'ok', `Trade done. Wood ${got.wood}, clay ${got.clay}, iron ${got.iron}, crop ${got.crop}.`);
    r.redirect(303, backUrl(req, '/shop'));
  }, '/shop'),
);

shopRouter.get('/shop/ticker', (req, r) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  sendPage(
    req,
    r,
    'News ticker',
    tickerView({ balance: creditBalance(db, ctx.user.id), slots: tickerAvailability(db, ctx.now), mine: myTickerBookings(db, ctx.user.id, ctx.now), csrf: ctx.csrf, now: ctx.now }),
    { nav: 'shop', chrome: page.chrome },
  );
});

shopRouter.post(
  '/shop/ticker',
  formAction(
    z.object({
      body: z.string().max(500),
      start: z.coerce.number({ message: 'Pick a start time' }).int().positive(),
      hours: z.coerce.number().int().min(1).max(24),
    }),
    (req, r, d) => {
      const ctx = authed(req);
      bookTicker(db, ctx.user.id, d.body, d.start, d.hours, ctx.now);
      setFlash(r, 'ok', 'Booked! Your message will appear on the news ticker at that time.');
      r.redirect(303, '/shop/ticker');
    },
    '/shop/ticker',
  ),
);
