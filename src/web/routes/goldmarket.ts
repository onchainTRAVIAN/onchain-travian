import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { buyListing, cancelListing, listResources, listTroops, myListings, openListings } from '../../game/actions/goldmarket.js';
import { stockOf, troopsAt } from '../../game/engine/state.js';
import { res } from '../../game/rules/resources.js';
import { emptyUnits } from '../../game/rules/units.js';
import { fmtDuration } from '../format.js';
import { authed, setFlash } from '../session.js';
import { goldMarketView, type GoldTab } from '../views/goldmarket.js';
import { formAction, loadGamePage, sendPage } from './helpers.js';

export const goldmarketRouter = Router();

const TABS: GoldTab[] = ['resources', 'troops', 'sell', 'mine'];
const count = z.coerce.number().int().min(0).max(100_000_000).default(0);

goldmarketRouter.get('/goldmarket', (req, r) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const tab = TABS.find((t) => t === req.query.tab) ?? 'resources';
  const tribe = page.state.tribe;
  const listings =
    tab === 'resources'
      ? openListings(db, 'resources', { exceptUser: ctx.user.id })
      : tab === 'troops'
        ? openListings(db, 'troops', { tribe, exceptUser: ctx.user.id })
        : tab === 'mine'
          ? myListings(db, ctx.user.id)
          : [];
  const v = page.state.village;
  sendPage(
    req,
    r,
    'Gold market',
    goldMarketView({
      tab,
      tribe,
      balance: page.chrome.credits,
      here: { x: v.x, y: v.y, name: v.name },
      stock: stockOf(v),
      home: tab === 'sell' ? troopsAt(db, v.id, v.id) : emptyUnits(),
      listings,
      userId: ctx.user.id,
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { chrome: page.chrome },
  );
});

goldmarketRouter.post(
  '/goldmarket/sell/resources',
  formAction(
    z.object({ wood: count, clay: count, iron: count, crop: count, price: z.coerce.number().int() }),
    (req, r, d) => {
      const ctx = authed(req);
      listResources(db, ctx.user.id, ctx.villageId, res(d.wood, d.clay, d.iron, d.crop), d.price, ctx.now);
      setFlash(r, 'ok', `Your resources are on the market for ${d.price} Gold.`);
      r.redirect(303, '/goldmarket?tab=mine');
    },
    '/goldmarket?tab=sell',
  ),
);

goldmarketRouter.post(
  '/goldmarket/sell/troops',
  formAction(
    z.object({ t0: count, t1: count, t2: count, t3: count, t4: count, t5: count, t6: count, t7: count, price: z.coerce.number().int() }),
    (req, r, d) => {
      const ctx = authed(req);
      const units = emptyUnits();
      [d.t0, d.t1, d.t2, d.t3, d.t4, d.t5, d.t6, d.t7].forEach((n, i) => (units[i] = n));
      listTroops(db, ctx.user.id, ctx.villageId, units, d.price, ctx.now);
      setFlash(r, 'ok', `Your troops are on the market for ${d.price} Gold.`);
      r.redirect(303, '/goldmarket?tab=mine');
    },
    '/goldmarket?tab=sell',
  ),
);

goldmarketRouter.post(
  '/goldmarket/buy',
  formAction(z.object({ id: z.coerce.number().int().positive() }), (req, r, d) => {
    const ctx = authed(req);
    const { arriveAt } = buyListing(db, ctx.user.id, ctx.villageId, d.id, ctx.now);
    setFlash(r, 'ok', `Bought! The delivery arrives in ${fmtDuration(arriveAt - ctx.now)}.`);
    r.redirect(303, '/goldmarket?tab=mine');
  }, '/goldmarket'),
);

goldmarketRouter.post(
  '/goldmarket/cancel',
  formAction(z.object({ id: z.coerce.number().int().positive() }), (req, r, d) => {
    const ctx = authed(req);
    cancelListing(db, ctx.user.id, d.id, ctx.now);
    setFlash(r, 'ok', 'Offer cancelled. Your goods are back in your village.');
    r.redirect(303, '/goldmarket?tab=mine');
  }, '/goldmarket?tab=mine'),
);
