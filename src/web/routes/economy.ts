import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { startResearch } from '../../game/actions/research.js';
import { acceptOffer, cancelOffer, createOffer, sendResources } from '../../game/actions/market.js';
import { RESOURCE_KEYS, res } from '../../game/rules/resources.js';
import { TRIBES } from '../../game/rules/units.js';
import { authed, setFlash } from '../session.js';
import { fmtDuration } from '../format.js';
import { backUrl, formAction } from './helpers.js';

export const economyRouter = Router();

const amount = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(100_000_000));
const RES = z.enum(RESOURCE_KEYS);

economyRouter.post(
  '/research',
  formAction(z.object({ kind: z.enum(['academy', 'blacksmith', 'armoury']), unit: z.coerce.number().int().min(0).max(9) }), (req, res, data) => {
    const ctx = authed(req);
    const o = startResearch(db, ctx.user.id, ctx.villageId, data.kind, data.unit, ctx.now);
    const u = TRIBES[ctx.user.tribe].units[o.unitSlot];
    setFlash(res, 'ok', `${data.kind === 'academy' ? 'Researching' : 'Upgrading'} ${u?.name ?? 'unit'}: ready in ${fmtDuration(o.finishAt - ctx.now)}.`);
    res.redirect(303, backUrl(req, '/village'));
  }),
);

economyRouter.post(
  '/market/send',
  formAction(
    z.object({ x: z.coerce.number().int(), y: z.coerce.number().int(), wood: amount, clay: amount, iron: amount, crop: amount }),
    (req, res, d) => {
      const ctx = authed(req);
      const ms = sendResources(db, ctx.user.id, ctx.villageId, d.x, d.y, res_(d), ctx.now);
      setFlash(res, 'ok', `Merchants are on their way. They arrive in ${fmtDuration(ms)}.`);
      res.redirect(303, backUrl(req, '/village'));
    },
  ),
);

function res_(d: { wood: number; clay: number; iron: number; crop: number }) {
  return res(d.wood, d.clay, d.iron, d.crop);
}

economyRouter.post(
  '/market/offer',
  formAction(
    z.object({
      offerRes: RES,
      offerAmount: z.coerce.number().int().min(1, 'Enter how much you offer').max(10_000_000),
      wantRes: RES,
      wantAmount: z.coerce.number().int().min(1, 'Enter how much you want').max(10_000_000),
      maxHours: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(96).optional()),
    }),
    (req, res, d) => {
      const ctx = authed(req);
      createOffer(db, ctx.user.id, ctx.villageId, { res: d.offerRes, amount: d.offerAmount }, { res: d.wantRes, amount: d.wantAmount }, d.maxHours ?? null, ctx.now);
      setFlash(res, 'ok', 'Your offer is on the market.');
      res.redirect(303, backUrl(req, '/village'));
    },
  ),
);

economyRouter.post(
  '/market/cancel',
  formAction(z.object({ offerId: z.coerce.number().int().positive() }), (req, res, d) => {
    const ctx = authed(req);
    cancelOffer(db, ctx.user.id, d.offerId, ctx.now);
    setFlash(res, 'ok', 'Offer cancelled; resources returned.');
    res.redirect(303, backUrl(req, '/village'));
  }),
);

economyRouter.post(
  '/market/accept',
  formAction(z.object({ offerId: z.coerce.number().int().positive() }), (req, res, d) => {
    const ctx = authed(req);
    acceptOffer(db, ctx.user.id, ctx.villageId, d.offerId, ctx.now);
    setFlash(res, 'ok', 'Trade accepted! Merchants from both sides are on their way.');
    res.redirect(303, backUrl(req, '/village'));
  }),
);
