import { Router, type Request } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { slots, users } from '../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { buildOption, buildOrdersOf, buildableOnEmptyPlot, cancelBuild, isValidSlot, startBuild, ownedVillage } from '../../game/actions/build.js';
import { startTraining, trainOptions, trainOrdersOf } from '../../game/actions/train.js';
import { BUILDINGS, type BuildingId } from '../../game/rules/buildings.js';
import { TRIBES, type TrainingBuilding } from '../../game/rules/units.js';
import { stockOf, troopsAt } from '../../game/engine/state.js';
import { villageMovements } from '../../game/queries.js';
import { GameError } from '../../game/errors.js';
import { authed, setActiveVillage, setFlash } from '../session.js';
import { fieldsView, townView, type VillageViewData } from '../views/village.js';
import { slotView } from '../views/slot.js';
import { formAction, loadGamePage, sendPage, type GamePage } from './helpers.js';

export const villageRouter = Router();

function villageData(req: Request, page: GamePage, slotsToCheck: number[]): VillageViewData {
  const ctx = authed(req);
  const { state } = page;
  const orders = buildOrdersOf(db, state.village.id);
  const ready = new Set<number>();
  for (const n of slotsToCheck) {
    const s = state.slots.find((x) => x.slot === n);
    if (!s?.building) continue;
    if (buildOption(db, state, n, s.building as BuildingId, ctx.now).canBuild) ready.add(n);
  }
  const user = db.select({ p: users.protectedUntil }).from(users).where(eq(users.id, ctx.user.id)).get();
  return {
    state,
    eco: page.chrome.eco,
    orders,
    training: trainOrdersOf(db, state.village.id),
    movements: villageMovements(db, state.village.id),
    homeTroops: troopsAt(db, state.village.id, state.village.id),
    ready,
    protectedUntil: user?.p ?? 0,
    now: ctx.now,
    csrf: ctx.csrf,
  };
}

villageRouter.get('/fields', (req, res) => {
  const page = loadGamePage(req);
  const slots = Array.from({ length: 18 }, (_, i) => i + 1);
  sendPage(req, res, 'Resource fields', fieldsView(villageData(req, page, slots)), { nav: 'fields', chrome: page.chrome });
});

villageRouter.get('/village', (req, res) => {
  const page = loadGamePage(req);
  const slots = Array.from({ length: 22 }, (_, i) => i + 19);
  sendPage(req, res, 'Village center', townView(villageData(req, page, slots)), { nav: 'village', chrome: page.chrome });
});

villageRouter.get('/slot/:n', (req, res) => {
  const ctx = authed(req);
  const n = Number.parseInt(req.params.n ?? '', 10);
  if (!isValidSlot(n)) {
    res.redirect(303, '/village');
    return;
  }
  const page = loadGamePage(req);
  const { state } = page;
  const slotRow = state.slots.find((s) => s.slot === n);
  const pending = buildOrdersOf(db, state.village.id).find((o) => o.slot === n);
  const buildingId = (slotRow?.building ?? pending?.building ?? null) as BuildingId | null;
  const def = buildingId ? BUILDINGS[buildingId] : null;
  const trainingBuildings: TrainingBuilding[] = ['barracks', 'stable', 'workshop', 'residence'];
  const isTraining = def && (trainingBuildings as string[]).includes(def.id);
  const hasTrainable = isTraining && TRIBES[state.tribe].units.some((u) => u.building === def.id && def.id !== 'residence');
  const training =
    def && isTraining && hasTrainable
      ? {
          options: trainOptions(db, state, def.id as TrainingBuilding, ctx.now),
          queue: trainOrdersOf(db, state.village.id).filter((o) => o.building === def.id),
        }
      : null;
  const title = def ? def.name : 'Build';
  sendPage(
    req,
    res,
    title,
    slotView({
      slot: n,
      def,
      level: slotRow?.building === buildingId ? (slotRow?.level ?? 0) : 0,
      option: def ? buildOption(db, state, n, def.id, ctx.now) : null,
      buildable: def ? [] : buildableOnEmptyPlot(db, state, n, ctx.now),
      have: stockOf(state.village),
      tribe: state.tribe,
      training,
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: def?.kind === 'field' ? 'fields' : 'village', chrome: page.chrome },
  );
});

const BuildSchema = z.object({
  slot: z.coerce.number().int().min(1).max(40),
  building: z.string().max(30).optional(),
});

villageRouter.post(
  '/build',
  formAction(BuildSchema, (req, res, data) => {
    const ctx = authed(req);
    const order = startBuild(db, ctx.user.id, ctx.villageId, data.slot, data.building, ctx.now);
    const def = BUILDINGS[order.building as BuildingId];
    setFlash(res, 'ok', `${def?.name ?? 'Building'} level ${order.toLevel} is under construction.`);
    res.redirect(303, def?.kind === 'field' ? '/fields' : '/village');
  }),
);

villageRouter.post(
  '/build/cancel',
  formAction(z.object({ orderId: z.coerce.number().int().positive() }), (req, res, data) => {
    const ctx = authed(req);
    cancelBuild(db, ctx.user.id, data.orderId, ctx.now);
    setFlash(res, 'ok', 'Construction cancelled. Your resources were refunded.');
    res.redirect(303, '/village');
  }),
);

villageRouter.post(
  '/train',
  formAction(
    z.object({
      unit: z.coerce.number().int().min(0).max(9),
      count: z.coerce.number({ message: 'Enter how many units to train' }).int('Enter a whole number').min(1, 'Enter how many units to train'),
    }),
    (req, res, data) => {
      const ctx = authed(req);
      const order = startTraining(db, ctx.user.id, ctx.villageId, data.unit, data.count, ctx.now);
      const u = TRIBES[ctx.user.tribe].units[order.unitSlot];
      setFlash(res, 'ok', `Training ${order.total} × ${u?.name ?? 'units'}.`);
      const slot = db
        .select({ slot: slots.slot })
        .from(slots)
        .where(and(eq(slots.villageId, ctx.villageId), eq(slots.building, order.building)))
        .get()?.slot;
      res.redirect(303, slot ? `/slot/${slot}` : '/village');
    },
  ),
);

villageRouter.post(
  '/village/switch',
  formAction(z.object({ villageId: z.coerce.number().int().positive() }), (req, res, data) => {
    const ctx = authed(req);
    try {
      ownedVillage(db, ctx.user.id, data.villageId);
    } catch {
      throw new GameError('Village not found');
    }
    setActiveVillage(req, data.villageId);
    res.redirect(303, '/fields');
  }),
);
