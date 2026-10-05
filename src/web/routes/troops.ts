import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { previewSend, sendBackReinforcements, sendTroops, withdrawTroops, type SendInput } from '../../game/actions/troops.js';
import { levelOf, troopsAt } from '../../game/engine/state.js';
import { reinforcementsIn, tileLabel, troopsAway, villageMovements } from '../../game/queries.js';
import { eq } from 'drizzle-orm';
import { movements, users, villages } from '../../db/schema.js';
import { parseResources, parseUnits } from '../../game/engine/state.js';
import { movementVisible } from '../views/parts.js';
import { UNIT_SLOTS, carryOf } from '../../game/rules/units.js';
import { getModifiers } from '../../game/modifiers.js';
import { placesOf } from '../../game/actions/places.js';
import { GameError } from '../../game/errors.js';
import { authed, setFlash } from '../session.js';
import { confirmView, movementDetailView, sendView, troopsView } from '../views/troops.js';
import { formAction, intParam, loadGamePage, sendPage } from './helpers.js';
import { fmtDuration } from '../format.js';
import { heroAtHome } from '../../game/engine/hero.js';
import type { Request } from 'express';

function heroHome(req: Request): boolean {
  const ctx = authed(req);
  return !!heroAtHome(db, ctx.user.id, ctx.villageId, ctx.now);
}

export const troopsRouter = Router();

troopsRouter.get('/troops', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const v = page.state.village.id;
  const hero = heroAtHome(db, ctx.user.id, v, ctx.now);
  sendPage(
    req,
    res,
    'Rally Point',
    troopsView({
      movementTab: (['all', 'in', 'out', 'back'] as const).find((t) => t === req.query.tab) ?? 'all',
      tribe: page.state.tribe,
      hasRally: levelOf(page.state, 'rally') > 0,
      home: troopsAt(db, v, v),
      hero: hero ? { name: hero.name, health: Math.round(hero.health) } : null,
      reinforcements: reinforcementsIn(db, v),
      away: troopsAway(db, v),
      movements: villageMovements(db, v),
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'troops', chrome: page.chrome },
  );
});

const KIND = z.enum(['attack', 'raid', 'reinforce', 'scout', 'settle'], { message: 'Choose a mission' });
const count = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(10_000_000));
const SendSchema = z.object({
  x: z.coerce.number({ message: 'Enter the X coordinate' }).int().min(-1000).max(1000),
  y: z.coerce.number({ message: 'Enter the Y coordinate' }).int().min(-1000).max(1000),
  kind: KIND,
  u0: count, u1: count, u2: count, u3: count, u4: count, u5: count, u6: count, u7: count, u8: count, u9: count,
  catapultTarget: z.string().max(30).optional(),
  catapultTarget2: z.string().max(30).optional(),
  hero: z.preprocess((v) => v === '1' || v === 'on' || v === true, z.boolean()).optional(),
});
type SendForm = z.infer<typeof SendSchema>;

function toInput(d: SendForm): SendInput {
  const units = [d.u0, d.u1, d.u2, d.u3, d.u4, d.u5, d.u6, d.u7, d.u8, d.u9].slice(0, UNIT_SLOTS);
  const targets = [d.catapultTarget, d.catapultTarget2].filter((t): t is string => !!t);
  return { x: d.x, y: d.y, kind: d.kind, units, catapultTarget: targets.length ? targets.join(',') : null, hero: !!d.hero };
}

troopsRouter.get('/troops/movement/:id', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const id = intParam(req.params.id, 0);
  const mv = db.select().from(movements).where(eq(movements.id, id)).get();
  const vinfo = (vid: number | null) =>
    vid === null
      ? undefined
      : db.select({ name: villages.name, x: villages.x, y: villages.y, userId: villages.userId, tribe: users.tribe }).from(villages).leftJoin(users, eq(users.id, villages.userId)).where(eq(villages.id, vid)).get();
  const from = mv ? vinfo(mv.fromVillageId) : undefined;
  const to = mv ? vinfo(mv.toVillageId) : undefined;
  const mine = !!from && from.userId === ctx.user.id;
  const incomingFriendly = !!to && to.userId === ctx.user.id && mv !== undefined && movementVisible({ direction: 'in', kind: mv.kind });
  if (!mv || !from || (!mine && !incomingFriendly)) {
    setFlash(res, 'error', 'That movement is over or not yours to see.');
    res.redirect(303, '/troops');
    return;
  }
  const returning = mv.kind === 'return' || mv.kind === 'merchant_return' || mv.kind === 'delivery';
  const home = { name: `${from.name} (${from.x}|${from.y})`, x: from.x, y: from.y };
  const away = { name: tileLabel(db, returning ? mv.originX : mv.toX, returning ? mv.originY : mv.toY), x: returning ? mv.originX : mv.toX, y: returning ? mv.originY : mv.toY };
  const units = parseUnits(mv.units);
  const tribe = from.tribe ?? page.state.tribe;
  const troopMove = mv.kind === 'attack' || mv.kind === 'raid' || mv.kind === 'return' || mv.kind === 'reinforce';
  sendPage(
    req,
    res,
    'Troop movement',
    movementDetailView(
      {
        id: mv.id,
        kind: mv.kind,
        tribe,
        units,
        hero: mv.hero,
        merchants: mv.merchants,
        loot: mv.loot ? parseResources(mv.loot) : null,
        capacity: troopMove && from.userId !== null ? carryOf(tribe, units, getModifiers(db, from.userId, ctx.now).troopCarry) : null,
        from: returning ? away : home,
        to: returning ? home : away,
        returning,
        departAt: mv.departAt,
        arriveAt: mv.arriveAt,
      },
      ctx.now,
    ),
    { nav: 'troops', chrome: page.chrome },
  );
});

troopsRouter.get('/troops/send', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const kindParsed = KIND.safeParse(req.query.kind);
  const values: Partial<SendInput> = {
    x: req.query.x !== undefined ? intParam(req.query.x, 0) : undefined,
    y: req.query.y !== undefined ? intParam(req.query.y, 0) : undefined,
    kind: kindParsed.success ? kindParsed.data : undefined,
  };
  sendPage(req, res, 'Send troops', sendView({ tribe: page.state.tribe, home: troopsAt(db, page.state.village.id, page.state.village.id), values, csrf: ctx.csrf, heroHome: heroHome(req), carryMult: getModifiers(db, ctx.user.id, ctx.now).troopCarry, rallyLevel: levelOf(page.state, 'rally'), places: placesOf(db, ctx.user.id), ownVillages: page.chrome.villages.filter((v) => v.id !== page.state.village.id) }), {
    nav: 'troops',
    chrome: page.chrome,
  });
});

troopsRouter.post('/troops/send/preview', (req, res, next) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const parsed = SendSchema.safeParse(req.body);
  const home = troopsAt(db, page.state.village.id, page.state.village.id);
  const show = (message: string, values: Partial<SendInput>) => {
    req.ctx.flash = { type: 'error', text: message };
    sendPage(req, res, 'Send troops', sendView({ tribe: page.state.tribe, home, values, csrf: ctx.csrf, heroHome: heroHome(req), carryMult: getModifiers(db, ctx.user.id, ctx.now).troopCarry, rallyLevel: levelOf(page.state, 'rally'), places: placesOf(db, ctx.user.id), ownVillages: page.chrome.villages.filter((v) => v.id !== page.state.village.id) }), { nav: 'troops', chrome: page.chrome, status: 422 });
  };
  if (!parsed.success) {
    show(parsed.error.issues[0]?.message ?? 'Please check the form.', {});
    return;
  }
  const input = toInput(parsed.data);
  try {
    const preview = previewSend(db, ctx.user.id, ctx.villageId, input, ctx.now);
    sendPage(req, res, 'Confirm', confirmView({ tribe: page.state.tribe, input, preview, csrf: ctx.csrf, now: ctx.now, carry: carryOf(page.state.tribe, input.units, getModifiers(db, ctx.user.id, ctx.now).troopCarry) }), { nav: 'troops', chrome: page.chrome });
  } catch (err) {
    if (err instanceof GameError) {
      show(err.message, input);
      return;
    }
    next(err);
  }
});

troopsRouter.post(
  '/troops/send',
  formAction(
    SendSchema,
    (req, res, data) => {
      const ctx = authed(req);
      const mv = sendTroops(db, ctx.user.id, ctx.villageId, toInput(data), ctx.now);
      setFlash(res, 'ok', `Troops are on their way. They arrive in ${fmtDuration(mv.arriveAt - ctx.now)}.`);
      res.redirect(303, '/troops');
    },
    '/troops/send',
  ),
);

troopsRouter.post(
  '/troops/withdraw',
  formAction(z.object({ locationId: z.coerce.number().int().positive() }), (req, res, data) => {
    const ctx = authed(req);
    withdrawTroops(db, ctx.user.id, ctx.villageId, data.locationId, ctx.now);
    setFlash(res, 'ok', 'Your troops are heading home.');
    res.redirect(303, '/troops');
  }, '/troops'),
);

troopsRouter.post(
  '/troops/sendback',
  formAction(z.object({ ownerVillageId: z.coerce.number().int().positive() }), (req, res, data) => {
    const ctx = authed(req);
    sendBackReinforcements(db, ctx.user.id, ctx.villageId, data.ownerVillageId, ctx.now);
    setFlash(res, 'ok', 'The reinforcements were sent home.');
    res.redirect(303, '/troops');
  }, '/troops'),
);
