import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { villages } from '../../db/schema.js';
import { getHero, heroCandidates, releaseOasis, renameHero, reviveHero, setSkills, trainHero } from '../../game/actions/hero.js';
import { isResearched } from '../../game/actions/research.js';
import { levelOf, stockOf, troopsAt } from '../../game/engine/state.js';
import { authed, setFlash } from '../session.js';
import { heroView } from '../views/hero.js';
import { backUrl, formAction, loadGamePage, sendPage } from './helpers.js';
import { fmtDuration } from '../format.js';

export const heroRouter = Router();

heroRouter.get('/hero', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const hero = getHero(db, ctx.user.id, ctx.now);
  const homeV = hero ? db.select().from(villages).where(eq(villages.id, hero.homeVillageId)).get() : undefined;
  const loc = hero?.locationId != null ? db.select({ name: villages.name }).from(villages).where(eq(villages.id, hero.locationId)).get() : undefined;
  const state = page.state;
  sendPage(
    req,
    res,
    'Hero',
    heroView({
      hero,
      tribe: state.tribe,
      homeName: homeV?.name ?? state.village.name,
      locationName: loc?.name ?? null,
      have: stockOf(state.village),
      homeHave: homeV ? stockOf(homeV) : stockOf(state.village),
      mansion: levelOf(state, 'heromansion'),
      villageName: state.village.name,
      candidates: heroCandidates(state.tribe, troopsAt(db, state.village.id, state.village.id), (slot) => isResearched(state, slot)),
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'hero', chrome: page.chrome },
  );
});

const pts = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(1000));

heroRouter.post(
  '/hero/skills',
  formAction(z.object({ strength: pts, defPoints: pts, offBonus: pts, defBonus: pts, regen: pts }), (req, res, d) => {
    setSkills(db, authed(req).user.id, d);
    setFlash(res, 'ok', 'Skill points saved.');
    res.redirect(303, '/hero');
  }, '/hero'),
);

heroRouter.post(
  '/hero/train',
  formAction(z.object({ slot: z.coerce.number().int().min(0).max(9) }), (req, res, d) => {
    const ctx = authed(req);
    const h = trainHero(db, ctx.user.id, ctx.villageId, d.slot, ctx.now);
    setFlash(res, 'ok', `Your new hero is ready in ${fmtDuration((h.reviveAt ?? ctx.now) - ctx.now)}.`);
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

heroRouter.post(
  '/oasis/release',
  formAction(z.object({ x: z.coerce.number().int(), y: z.coerce.number().int() }), (req, res, d) => {
    const ctx = authed(req);
    releaseOasis(db, ctx.user.id, ctx.villageId, d.x, d.y);
    setFlash(res, 'ok', 'The oasis is wild again.');
    res.redirect(303, backUrl(req, '/village'));
  }),
);
