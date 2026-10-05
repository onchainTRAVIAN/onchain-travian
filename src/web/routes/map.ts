import { Router, type Request, type Response } from 'express';
import { db } from '../../db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { movements, users, villages } from '../../db/schema.js';
import { oasisAnimals, oasisStock, type TileRow } from '../../game/engine/oasis.js';
import { config } from '../../config.js';
import { troopsAt } from '../../game/engine/state.js';
import { dist, mapWindow, tileInfo } from '../../game/queries.js';
import { travelTimeMs, wrapCoord } from '../../game/rules/map.js';
import { TRIBES } from '../../game/rules/units.js';
import { authed } from '../session.js';
import { MAP_SIZES, mapView, tileView, type MapSize, type MapStyle, type MoveMark } from '../views/map.js';
import { intParam, loadGamePage, sendPage } from './helpers.js';

export const mapRouter = Router();

function oasisOwnerInfo(tile: TileRow): { name: string; userId: number | null; villageName: string } | null {
  if (tile.kind !== 'oasis' || tile.villageId === null) return null;
  const row = db
    .select({ vname: villages.name, uid: users.id, uname: users.username })
    .from(villages)
    .leftJoin(users, eq(users.id, villages.userId))
    .where(eq(villages.id, tile.villageId))
    .get();
  return row ? { name: row.uname ?? 'Nature', userId: row.uid, villageName: row.vname } : null;
}

const MAP_COOKIE = 'mapview2';

/** View size/style from the query (and remember it), else from the cookie, else flat 7×7. */
function mapPrefs(req: Request, res: Response): { size: MapSize; style: MapStyle } {
  const fromCookie = typeof req.cookies?.[MAP_COOKIE] === 'string' ? String(req.cookies[MAP_COOKIE]).split(',') : [];
  const qSize = Number(req.query.size);
  const qView = req.query.view;
  const size = (MAP_SIZES as readonly number[]).includes(qSize) ? (qSize as MapSize) : (MAP_SIZES as readonly number[]).includes(Number(fromCookie[0])) ? (Number(fromCookie[0]) as MapSize) : 7;
  // Flat view by default; the classic diamond only when chosen.
  const style: MapStyle = qView === 'grid' || qView === 'diamond' ? qView : fromCookie[1] === 'diamond' ? 'diamond' : 'grid';
  if (req.query.size !== undefined || req.query.view !== undefined) {
    res.cookie(MAP_COOKIE, `${size},${style}`, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 86_400_000, path: '/' });
  }
  return { size, style };
}

/** Tiles your own troops are heading to (by kind) or coming back from. */
function movementMarks(myVillageIds: number[]): Map<string, Set<MoveMark>> {
  const marks = new Map<string, Set<MoveMark>>();
  if (myVillageIds.length === 0) return marks;
  const add = (x: number, y: number, m: MoveMark) => {
    const k = `${x}|${y}`;
    const set = marks.get(k) ?? new Set<MoveMark>();
    set.add(m);
    marks.set(k, set);
  };
  const rows = db
    .select({ kind: movements.kind, toX: movements.toX, toY: movements.toY, originX: movements.originX, originY: movements.originY })
    .from(movements)
    .where(inArray(movements.fromVillageId, myVillageIds))
    .all();
  for (const r of rows) {
    if (r.kind === 'attack' || r.kind === 'raid' || r.kind === 'scout') add(r.toX, r.toY, 'attack');
    else if (r.kind === 'reinforce') add(r.toX, r.toY, 'support');
    else if (r.kind === 'settle') add(r.toX, r.toY, 'settle');
    else if (r.kind === 'return' && (r.originX !== r.toX || r.originY !== r.toY)) add(r.originX, r.originY, 'back');
  }
  return marks;
}

mapRouter.get('/map', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const v = page.state.village;
  const cx = wrapCoord(intParam(req.query.x, v.x), config.MAP_RADIUS);
  const cy = wrapCoord(intParam(req.query.y, v.y), config.MAP_RADIUS);
  const prefs = mapPrefs(req, res);
  sendPage(
    req,
    res,
    'Map',
    mapView({
      grid: mapWindow(db, cx, cy, (prefs.size - 1) / 2),
      cx,
      cy,
      myId: ctx.user.id,
      homeX: v.x,
      homeY: v.y,
      size: prefs.size,
      style: prefs.style,
      marks: movementMarks(page.chrome.villages.map((pv) => pv.id)),
    }),
    { nav: 'map', chrome: page.chrome },
  );
});

mapRouter.get('/map/tile', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const home = page.state.village;
  const x = wrapCoord(intParam(req.query.x, home.x), config.MAP_RADIUS);
  const y = wrapCoord(intParam(req.query.y, home.y), config.MAP_RADIUS);
  const t = tileInfo(db, x, y);
  if (!t) {
    res.redirect(303, '/map');
    return;
  }
  const d = dist(home.x, home.y, x, y);
  // Show travel times for the unit types you actually have at home.
  const have = troopsAt(db, home.id, home.id);
  const travel = TRIBES[page.state.tribe].units
    .filter((u, i) => (have[i] ?? 0) > 0)
    .map((u) => ({ label: `${u.icon} ${u.name}`, ms: travelTimeMs(d, u.speed, config.TROOP_SPEED) }));
  sendPage(
    req,
    res,
    t.v ? t.v.name : 'Map',
    tileView({
      x,
      y,
      kind: t.tile.kind,
      layout: t.tile.layout,
      oasis: t.tile.oasis,
      village:
        t.v && t.tile.kind === 'field'
          ? {
              id: t.v.id,
              name: t.v.name,
              pop: t.v.pop,
              isMine: t.v.userId === ctx.user.id,
              owner: t.owner ?? 'Nature',
              ownerId: t.ownerId,
              tribe: t.tribe ? TRIBES[t.tribe].name : '',
              protectedUntil: t.protectedUntil,
            }
          : null,
      distance: d,
      animals: t.tile.kind === 'oasis' ? db.transaction((tx) => oasisAnimals(tx, t.tile, ctx.now)) : null,
      oasisStock: t.tile.kind === 'oasis' && t.tile.villageId === null ? db.transaction((tx) => oasisStock(tx, t.tile, ctx.now)) : null,
      oasisOwner: oasisOwnerInfo(t.tile),
      travel,
      now: ctx.now,
    }),
    { nav: 'map', chrome: page.chrome },
  );
});
