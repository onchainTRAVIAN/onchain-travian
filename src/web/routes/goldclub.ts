import { Router } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { farmEntries, farmLists, tiles, villages } from '../../db/schema.js';
import {
  addFarmEntry,
  addNearbyOases,
  buyGoldClub,
  createFarmList,
  createTradeRoute,
  deleteFarmList,
  deleteTradeRoute,
  findCroppers,
  hasGoldClub,
  lastRaidResult,
  raidFarmList,
  removeFarmEntry,
  removeLowOases,
  setEvasion,
  setFarmAuto,
  GOLD_CLUB_PRICE,
  FARM_RADIUS_MAX,
} from '../../game/actions/goldclub.js';
import { placesOf } from '../../game/actions/places.js';
import { oasisLootToday, planOasisRaids, raiderFor, runRaiderNow, saveRaider, setRaiderEnabled, toggleBlock, userTribe } from '../../game/actions/raider.js';
import { raiderPanel } from '../views/raider.js';
import { troopsAt } from '../../game/engine/state.js';
import type { TribeId } from '../../game/rules/units.js';
import { oasisAnimals, oasisStock } from '../../game/engine/oasis.js';
import { sumRes } from '../../game/rules/resources.js';
import { getModifiers } from '../../game/modifiers.js';
import { OASIS_LABEL, type OasisType } from '../../game/rules/map.js';
import { res } from '../../game/rules/resources.js';
import { emptyUnits, totalUnits } from '../../game/rules/units.js';
import { authed, setFlash } from '../session.js';
import { cropperView, farmListView } from '../views/goldclub.js';
import { backUrl, formAction, intParam, loadGamePage, sendPage } from './helpers.js';

export const goldclubRouter = Router();

const id = z.coerce.number().int().positive();
const coord = z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number({ message: 'Enter the x and y coordinates' }).int());
const count = z.preprocess((v) => (v === '' || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(1_000_000));

/** Current loot and animals at an oasis target (null for villages). */
function oasisInfo(x: number, y: number, now: number): { stock: number; animals: number } | null {
  const t = db.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
  if (!t || t.kind !== 'oasis') return null;
  return { stock: Math.floor(sumRes(oasisStock(db, t, now))), animals: t.villageId === null ? totalUnits(oasisAnimals(db, t, now)) : 0 };
}

function targetName(x: number, y: number): string {
  const t = db.select().from(tiles).where(and(eq(tiles.x, x), eq(tiles.y, y))).get();
  if (!t) return 'Unknown';
  if (t.kind === 'oasis') return OASIS_LABEL[(t.oasis ?? 'wood') as OasisType];
  if (t.villageId === null) return 'Abandoned valley';
  return db.select({ name: villages.name }).from(villages).where(eq(villages.id, t.villageId)).get()?.name ?? 'Village';
}

goldclubRouter.get('/troops/farmlist', (req, r) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const lists = db.select().from(farmLists).where(eq(farmLists.userId, ctx.user.id)).all();
  const entries = lists.length ? db.select().from(farmEntries).where(inArray(farmEntries.listId, lists.map((l) => l.id))).all() : [];
  const vname = (vid: number) => page.chrome.villages.find((v) => v.id === vid)?.name ?? '?';
  sendPage(
    req,
    r,
    'Farm list',
    farmListView({
      tribe: page.state.tribe,
      member: hasGoldClub(db, ctx.user.id),
      carryMult: getModifiers(db, ctx.user.id, ctx.now).troopCarry,
      villageName: page.state.village.name,
      isCapital: page.state.village.isCapital,
      evade: page.state.village.evade,
      lists: lists.map((l) => ({
        ...l,
        villageName: vname(l.villageId),
        entries: entries
          .filter((e) => e.listId === l.id)
          .map((e) => ({ ...e, target: targetName(e.x, e.y), result: lastRaidResult(db, ctx.user.id, e), oasis: oasisInfo(e.x, e.y, ctx.now) })),
      })),
      places: placesOf(db, ctx.user.id),
      openListId: intParam(req.query.list, 0) || null,
      raider: hasGoldClub(db, ctx.user.id) ? raiderSection(page.state.village.id, ctx.user.id, page.state.tribe, ctx.csrf, ctx.now) : undefined,
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'troops', chrome: page.chrome },
  );
});

function raiderSection(villageId: number, userId: number, tribe: TribeId, csrf: string, now: number) {
  const raider = raiderFor(db, userId, villageId, tribe);
  return raiderPanel({
    tribe,
    raider,
    plan: planOasisRaids(db, raider, tribe, now),
    home: troopsAt(db, villageId, villageId),
    today: oasisLootToday(db, userId, villageId, now),
    csrf,
    now,
  });
}

const flag = z.preprocess((v) => v === '1' || v === 'on', z.boolean());

goldclubRouter.post(
  '/goldclub/raider',
  formAction(
    z.object({
      radius: z.coerce.number({ message: 'Enter a range' }).int(),
      minRes: count,
      maxAnimals: count,
      intervalMin: z.coerce.number().int(),
      maxRaids: z.coerce.number({ message: 'Enter raids per check' }).int(),
      sizeMode: z.enum(['auto', 'max', 'fixed']).default('auto'),
      maxPerRaid: count,
    }).catchall(z.string()),
    (req, r, d) => {
      const ctx = authed(req);
      // Per-unit fields: a<i> (may use), k<i> (keep at home), f<i> (fixed group).
      const g = d as Record<string, unknown>;
      const pick = (p: string) => Array.from({ length: 10 }, (_, i) => count.safeParse(g[`${p}${i}`]).data ?? 0);
      saveRaider(
        db,
        ctx.user.id,
        ctx.villageId,
        {
          radius: d.radius,
          minRes: d.minRes,
          maxAnimals: d.maxAnimals,
          allowed: Array.from({ length: 10 }, (_, i) => flag.safeParse(g[`a${i}`]).data === true),
          reserve: pick('k'),
          sizeMode: d.sizeMode,
          fixed: pick('f'),
          maxPerRaid: d.maxPerRaid,
          intervalMin: d.intervalMin,
          maxRaids: d.maxRaids,
        },
        ctx.now,
      );
      setFlash(r, 'ok', 'Oasis Raider settings saved.');
      r.redirect(303, '/troops/farmlist');
    },
    '/troops/farmlist',
  ),
);

goldclubRouter.post(
  '/goldclub/raider/toggle',
  formAction(z.object({ on: z.enum(['0', '1']) }), (req, r, d) => {
    const ctx = authed(req);
    setRaiderEnabled(db, ctx.user.id, ctx.villageId, d.on === '1', userTribe(db, ctx.user.id), ctx.now);
    setFlash(r, 'ok', d.on === '1' ? 'Oasis Raider is on — it starts with the next check.' : 'Oasis Raider is off.');
    r.redirect(303, '/troops/farmlist');
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/raider/run',
  formAction(z.object({}), (req, r) => {
    const ctx = authed(req);
    const e = runRaiderNow(db, ctx.user.id, ctx.villageId, userTribe(db, ctx.user.id), ctx.now);
    const onWay = e.skipped.busy ?? 0;
    setFlash(
      r,
      e.sent || onWay ? 'ok' : 'error',
      e.sent
        ? `${e.sent} raids sent (${e.troops} troops).`
        : e.note
          ? `No raids sent: ${e.note}`
          : onWay
            ? `Nothing new to send — ${onWay} raids are already on the way.`
            : 'No raids sent — no oasis is worth raiding right now, or your troops are out.',
    );
    r.redirect(303, '/troops/farmlist');
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/block',
  formAction(z.object({ x: z.coerce.number().int(), y: z.coerce.number().int() }), (req, r, d) => {
    const ctx = authed(req);
    const blocked = toggleBlock(db, ctx.user.id, d.x, d.y);
    setFlash(r, 'ok', blocked ? `(${d.x}|${d.y}) will never be raided automatically.` : `(${d.x}|${d.y}) can be raided again.`);
    r.redirect(303, '/troops/farmlist');
  }, '/troops/farmlist'),
);

goldclubRouter.get('/map/croppers', (req, r) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const radius = [10, 20, 30].includes(intParam(req.query.r, 20)) ? intParam(req.query.r, 20) : 20;
  const v = page.state.village;
  const member = hasGoldClub(db, ctx.user.id);
  sendPage(req, r, 'Cropper finder', cropperView({ member, from: { x: v.x, y: v.y }, radius, rows: member ? findCroppers(db, v.x, v.y, radius) : [] }), {
    nav: 'map',
    chrome: page.chrome,
  });
});

goldclubRouter.post(
  '/shop/goldclub',
  formAction(z.object({}), (req, r) => {
    buyGoldClub(db, authed(req).user.id, authed(req).now);
    setFlash(r, 'ok', `Welcome to the Gold Club! (${GOLD_CLUB_PRICE} Gold)`);
    r.redirect(303, '/troops/farmlist');
  }, '/shop?tab=adv#goldclub'),
);

goldclubRouter.post(
  '/goldclub/list',
  formAction(z.object({ name: z.string().max(30).default('') }), (req, r, d) => {
    const ctx = authed(req);
    const listId = createFarmList(db, ctx.user.id, ctx.villageId, d.name, ctx.now);
    setFlash(r, 'ok', 'Farm list created — now add targets in step 2.');
    r.redirect(303, `/troops/farmlist?list=${listId}#list`);
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/list/delete',
  formAction(z.object({ listId: id }), (req, r, d) => {
    deleteFarmList(db, authed(req).user.id, d.listId);
    setFlash(r, 'ok', 'Farm list deleted.');
    r.redirect(303, '/troops/farmlist');
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/entry',
  formAction(
    z.object({ listId: id, x: coord, y: coord, t0: count, t1: count, t2: count, t3: count, t4: count, t5: count, t6: count, t7: count }),
    (req, r, d) => {
      const units = emptyUnits();
      [d.t0, d.t1, d.t2, d.t3, d.t4, d.t5, d.t6, d.t7].forEach((n, i) => (units[i] = n));
      addFarmEntry(db, authed(req).user.id, d.listId, d.x, d.y, units);
      setFlash(r, 'ok', `Target (${d.x}|${d.y}) added.`);
      r.redirect(303, `/troops/farmlist?list=${d.listId}#list`);
    },
    '/troops/farmlist',
  ),
);

goldclubRouter.post(
  '/goldclub/oases',
  formAction(
    z.object({ listId: id, minRes: count, radius: z.coerce.number({ message: 'Enter a distance' }).int().min(1, 'Distance must be at least 1 field').max(FARM_RADIUS_MAX, `At most ${FARM_RADIUS_MAX} fields`), t0: count, t1: count, t2: count, t3: count, t4: count, t5: count, t6: count, t7: count }),
    (req, r, d) => {
      const units = emptyUnits();
      [d.t0, d.t1, d.t2, d.t3, d.t4, d.t5, d.t6, d.t7].forEach((n, i) => (units[i] = n));
      const n = addNearbyOases(db, authed(req).user.id, d.listId, d.radius, units, d.minRes, authed(req).now);
      setFlash(r, 'ok', n ? `${n} free oases added.` : `No new free oases in range${d.minRes ? ` with at least ${d.minRes} resources` : ''}.`);
      r.redirect(303, `/troops/farmlist?list=${d.listId}#list`);
    },
    '/troops/farmlist',
  ),
);

goldclubRouter.post(
  '/goldclub/oases/prune',
  formAction(z.object({ listId: id, minRes: z.coerce.number({ message: 'Enter an amount' }).int().min(1, 'Enter an amount above 0').max(10_000_000) }), (req, r, d) => {
    const ctx = authed(req);
    const n = removeLowOases(db, ctx.user.id, d.listId, d.minRes, ctx.now);
    setFlash(r, 'ok', n ? `${n} oases with less than ${d.minRes} resources removed.` : `Every oasis on the list has at least ${d.minRes} resources.`);
    r.redirect(303, `/troops/farmlist?list=${d.listId}#list`);
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/entry/delete',
  formAction(z.object({ id }), (req, r, d) => {
    removeFarmEntry(db, authed(req).user.id, d.id);
    r.redirect(303, backUrl(req, '/troops/farmlist') + '#list');
  }, '/troops/farmlist'),
);

goldclubRouter.post('/goldclub/raid', (req, r, next) => {
  // Ticked targets come as "ids" (once or many times); "Raid all" ignores the selection.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const rawIds = body.ids === undefined ? [] : Array.isArray(body.ids) ? body.ids : [body.ids];
  const selected = rawIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return formAction(z.object({ listId: id, all: z.string().optional() }), (rq, rs, d) => {
    const ctx = authed(rq);
    const out = raidFarmList(db, ctx.user.id, d.listId, ctx.now, d.all ? undefined : selected);
    setFlash(rs, out.sent > 0 ? 'ok' : 'error', `${out.sent} raids sent${out.skipped ? `, ${out.skipped} skipped (see the list)` : ''}.`);
    rs.redirect(303, `/troops/farmlist?list=${d.listId}#list`);
  }, '/troops/farmlist')(req, r, next);
});

goldclubRouter.post(
  '/goldclub/auto',
  formAction(z.object({ listId: id, minutes: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().nullable()) }), (req, r, d) => {
    const ctx = authed(req);
    setFarmAuto(db, ctx.user.id, d.listId, d.minutes, ctx.now);
    setFlash(r, 'ok', d.minutes ? `Auto-raids every ${d.minutes} minutes.` : 'Auto-raids off.');
    r.redirect(303, `/troops/farmlist?list=${d.listId}#list`);
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/evade',
  formAction(z.object({ on: z.enum(['0', '1']) }), (req, r, d) => {
    const ctx = authed(req);
    setEvasion(db, ctx.user.id, ctx.villageId, d.on === '1');
    setFlash(r, 'ok', d.on === '1' ? 'Evasion is on.' : 'Evasion is off.');
    r.redirect(303, '/troops/farmlist');
  }, '/troops/farmlist'),
);

goldclubRouter.post(
  '/goldclub/route',
  formAction(
    z.object({ to: id, hour: z.coerce.number().int().min(0).max(23), perDay: z.coerce.number().int().min(1).max(3), wood: count, clay: count, iron: count, crop: count }),
    (req, r, d) => {
      const ctx = authed(req);
      createTradeRoute(db, ctx.user.id, ctx.villageId, d.to, res(d.wood, d.clay, d.iron, d.crop), d.hour, d.perDay, ctx.now);
      setFlash(r, 'ok', 'Trade route created.');
      r.redirect(303, backUrl(req, '/village'));
    },
  ),
);

goldclubRouter.post(
  '/goldclub/route/delete',
  formAction(z.object({ id }), (req, r, d) => {
    deleteTradeRoute(db, authed(req).user.id, d.id);
    setFlash(r, 'ok', 'Trade route deleted.');
    r.redirect(303, backUrl(req, '/village'));
  }),
);
