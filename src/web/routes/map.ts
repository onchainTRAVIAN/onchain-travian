import { Router } from 'express';
import { db } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { users, villages } from '../../db/schema.js';
import { oasisAnimals, type TileRow } from '../../game/engine/oasis.js';
import { config } from '../../config.js';
import { troopsAt } from '../../game/engine/state.js';
import { dist, mapWindow, tileInfo } from '../../game/queries.js';
import { travelTimeMs, wrapCoord } from '../../game/rules/map.js';
import { TRIBES } from '../../game/rules/units.js';
import { authed } from '../session.js';
import { mapView, tileView } from '../views/map.js';
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

const VIEW_RADIUS = 3;

mapRouter.get('/map', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const v = page.state.village;
  const cx = wrapCoord(intParam(req.query.x, v.x), config.MAP_RADIUS);
  const cy = wrapCoord(intParam(req.query.y, v.y), config.MAP_RADIUS);
  sendPage(
    req,
    res,
    'Map',
    mapView({ grid: mapWindow(db, cx, cy, VIEW_RADIUS), cx, cy, myId: ctx.user.id, homeX: v.x, homeY: v.y, step: VIEW_RADIUS * 2 + 1 }),
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
      oasisOwner: oasisOwnerInfo(t.tile),
      travel,
      now: ctx.now,
    }),
    { nav: 'map', chrome: page.chrome },
  );
});
