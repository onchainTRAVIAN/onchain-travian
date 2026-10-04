import { Router, type Request } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { slots, tiles, users } from '../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { buildOption, buildOrdersOf, buildableOnEmptyPlot, cancelBuild, isValidSlot, startBuild, ownedVillage } from '../../game/actions/build.js';
import { isTrainingSite, startTraining, trainOptions, trainOrdersOf } from '../../game/actions/train.js';
import { BUILDINGS, type BuildingId } from '../../game/rules/buildings.js';
import { TRIBES, type TrainingBuilding } from '../../game/rules/units.js';
import { stockOf, troopsAt } from '../../game/engine/state.js';
import { villageMovements } from '../../game/queries.js';
import { GameError } from '../../game/errors.js';
import { authed, setActiveVillage, setFlash } from '../session.js';
import { fieldsView, townView, type VillageViewData } from '../views/village.js';
import { slotView } from '../views/slot.js';
import { backUrl, formAction, intParam, loadGamePage, sendPage, type GamePage } from './helpers.js';
import type { SafeHtml } from '../html.js';
import { academyOptions, researchOrdersOf, upgradeOptions } from '../../game/actions/research.js';
import { listOffers, merchantInfo } from '../../game/actions/market.js';
import { canExpand } from '../../game/engine/expansion.js';
import { membership } from '../../game/actions/alliance.js';
import { oasesOwnedBy } from '../../game/engine/oasis.js';
import { oasisSlots } from '../../game/rules/expansion.js';
import { capacityFor, levelOf } from '../../game/engine/state.js';
import { npcPanel } from '../views/shop.js';
import { academyPanel, celebrationPanel, embassyPanel, expansionPanel, mansionPanel, marketPanel, smithyPanel } from '../views/buildings.js';
import { celebrationOptions, runningCelebration, startCelebration } from '../../game/actions/celebration.js';

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
  const tile = db.select({ layout: tiles.layout }).from(tiles).where(and(eq(tiles.x, page.state.village.x), eq(tiles.y, page.state.village.y))).get();
  const layout = tile?.layout ?? '4-4-4-6';
  sendPage(req, res, 'Village overview', fieldsView({ ...villageData(req, page, slots), layout }), { nav: 'fields', chrome: page.chrome });
});

villageRouter.get('/village', (req, res) => {
  const page = loadGamePage(req);
  const slots = Array.from({ length: 22 }, (_, i) => i + 19);
  sendPage(req, res, 'Village centre', townView(villageData(req, page, slots)), { nav: 'village', chrome: page.chrome });
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
  const isTraining = def && isTrainingSite(def.id);
  const hasTrainable = isTraining;
  const training =
    def && isTraining && hasTrainable
      ? {
          building: def.id,
          options: trainOptions(db, state, def.id, ctx.now),
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
      panels: def ? buildingPanels(req, page, def.id) : [],
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: def?.kind === 'field' ? 'fields' : 'village', chrome: page.chrome },
  );
});

function buildingPanels(req: Request, page: GamePage, id: BuildingId): SafeHtml[] {
  const ctx = authed(req);
  const { state } = page;
  const have = stockOf(state.village);
  switch (id) {
    case 'academy':
      return [academyPanel(state.tribe, academyOptions(db, state, ctx.now), researchOrdersOf(db, state.village.id), have, ctx.csrf, ctx.now)];
    case 'blacksmith':
    case 'armoury':
      return [smithyPanel(id, state.tribe, upgradeOptions(db, state, id, ctx.now), researchOrdersOf(db, state.village.id), have, ctx.csrf, ctx.now)];
    case 'townhall':
      return [celebrationPanel(celebrationOptions(db, state), runningCelebration(db, state.village.id), have, ctx.csrf, ctx.now)];
    case 'market':
      return [
        marketPanel({
          npc: npcPanel(have, capacityFor(state), page.chrome.credits, ctx.csrf),
          merchants: merchantInfo(db, state),
          mine: listOffers(db, state, true),
          others: listOffers(db, state, false),
          csrf: ctx.csrf,
          x: req.query.x !== undefined ? intParam(req.query.x, 0) : undefined,
          y: req.query.y !== undefined ? intParam(req.query.y, 0) : undefined,
        }),
      ];
    case 'residence':
    case 'palace':
      return [expansionPanel(canExpand(db, ctx.user.id, state.village.id, ctx.now), page.chrome.villages.length)];
    case 'embassy': {
      const m = membership(db, ctx.user.id);
      return [embassyPanel(m ? { id: m.a.id, name: m.a.name, tag: m.a.tag } : null)];
    }
    case 'heromansion':
      return [mansionPanel(oasesOwnedBy(db, state.village.id), oasisSlots(levelOf(state, 'heromansion')))];
    default:
      return [];
  }
}

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

const qty = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(100_000));
villageRouter.post(
  '/train',
  formAction(
    z.object({
      building: z.string().max(30).refine(isTrainingSite, 'Invalid building'),
      t0: qty, t1: qty, t2: qty, t3: qty, t4: qty, t5: qty, t6: qty, t7: qty, t8: qty, t9: qty,
    }),
    (req, res, data) => {
      const ctx = authed(req);
      const counts = [data.t0, data.t1, data.t2, data.t3, data.t4, data.t5, data.t6, data.t7, data.t8, data.t9];
      const trained: string[] = [];
      counts.forEach((n, slot) => {
        if (n <= 0) return;
        const order = startTraining(db, ctx.user.id, ctx.villageId, data.building as BuildingId, slot, n, ctx.now);
        trained.push(`${order.total} ${TRIBES[ctx.user.tribe].units[slot]?.name ?? ''}`);
      });
      if (trained.length === 0) throw new GameError('Enter how many units to train');
      setFlash(res, 'ok', `Training: ${trained.join(', ')}.`);
      const slot = db
        .select({ slot: slots.slot })
        .from(slots)
        .where(and(eq(slots.villageId, ctx.villageId), eq(slots.building, data.building)))
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

villageRouter.post(
  '/celebrate',
  formAction(z.object({ kind: z.enum(['small', 'great']) }), (req, res, data) => {
    const ctx = authed(req);
    startCelebration(db, ctx.user.id, ctx.villageId, data.kind, ctx.now);
    setFlash(res, 'ok', 'The celebration has begun!');
    res.redirect(303, backUrl(req, '/village'));
  }),
);
