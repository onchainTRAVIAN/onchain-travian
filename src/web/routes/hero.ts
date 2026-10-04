import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { villages } from '../../db/schema.js';
import { addSkillPoints, getHero, renameHero, reviveHero } from '../../game/actions/hero.js';
import { stockOf } from '../../game/engine/state.js';
import { authed, setFlash } from '../session.js';
import { heroView } from '../views/hero.js';
import { formAction, loadGamePage, sendPage } from './helpers.js';
import { fmtDuration } from '../format.js';

export const heroRouter = Router();

heroRouter.get('/hero', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const hero = getHero(db, ctx.user.id, ctx.now);
  const homeV = db.select().from(villages).where(eq(villages.id, hero.homeVillageId)).get();
  const loc = hero.locationId !== null ? db.select({ name: villages.name }).from(villages).where(eq(villages.id, hero.locationId)).get() : undefined;
  sendPage(
    req,
    res,
    'Hero',
    heroView({ hero, homeName: homeV?.name ?? '?', locationName: loc?.name ?? null, have: homeV ? stockOf(homeV) : stockOf(page.state.village), csrf: ctx.csrf, now: ctx.now }),
    { nav: 'hero', chrome: page.chrome },
  );
});

const pts = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(1000));

heroRouter.post(
  '/hero/skills',
  formAction(z.object({ strength: pts, offBonus: pts, defBonus: pts, production: pts }), (req, res, d) => {
    addSkillPoints(db, authed(req).user.id, d);
    setFlash(res, 'ok', 'Skill points added.');
    res.redirect(303, '/hero');
  }, '/hero'),
);

heroRouter.post(
  '/hero/rename',
  formAction(z.object({ name: z.string().trim().min(2, 'Name is too short').max(20, 'Name is too long') }), (req, res, d) => {
    renameHero(db, authed(req).user.id, d.name);
    setFlash(res, 'ok', 'Hero renamed.');
    res.redirect(303, '/hero');
  }, '/hero'),
);

heroRouter.post(
  '/hero/revive',
  formAction(z.object({}), (req, res) => {
    const ctx = authed(req);
    const h = reviveHero(db, ctx.user.id, ctx.now);
    setFlash(res, 'ok', `Your hero will be back in ${fmtDuration((h.reviveAt ?? ctx.now) - ctx.now)}.`);
    res.redirect(303, '/hero');
  }, '/hero'),
);
