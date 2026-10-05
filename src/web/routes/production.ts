import { Router } from 'express';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { productionBreakdown } from '../../game/engine/breakdown.js';
import { authed } from '../session.js';
import { productionView } from '../views/production.js';
import { loadGamePage, sendPage } from './helpers.js';

export const productionRouter = Router();

productionRouter.get('/production', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  sendPage(
    req,
    res,
    'Production',
    productionView({ villageName: page.state.village.name, speed: config.WORLD_SPEED, rows: productionBreakdown(db, page.state, ctx.now), now: ctx.now }),
    { nav: 'fields', chrome: page.chrome },
  );
});
