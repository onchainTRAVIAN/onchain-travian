import { Router, type Request } from 'express';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { heroAtHome } from '../../game/engine/hero.js';
import { parseLevels, troopsAt } from '../../game/engine/state.js';
import { villages } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { playerProfile } from '../../game/queries.js';
import { simulate, type SimArmy, type SimInput } from '../../game/rules/simulate.js';
import type { TribeId } from '../../game/rules/units.js';
import { authed } from '../session.js';
import { simulatorView, simResultPanel } from '../views/simulator.js';
import { loadGamePage, sendPage } from './helpers.js';

export const simulatorRouter = Router();

const TRIBE_IDS: TribeId[] = ['romans', 'teutons', 'gauls', 'nature', 'natars'];
const num = (v: unknown, min: number, max: number, dflt = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');

function armyFrom(q: Request['query'], p: string, fallbackTribe: TribeId): SimArmy {
  const tribe = TRIBE_IDS.find((t) => t === q[`${p}_t`]) ?? fallbackTribe;
  const heroSlot = str(q[`${p}h`]) === '' ? -1 : num(q[`${p}h`], -1, 9, -1);
  return {
    tribe,
    units: Array.from({ length: 10 }, (_, i) => num(q[`${p}${i}`], 0, 10_000_000)),
    levels: Array.from({ length: 10 }, (_, i) => num(q[`${p}l${i}`], 0, 20)),
    hero: heroSlot >= 0 ? { slot: heroSlot, points: num(q[`${p}hp`], 0, 1000), bonus: num(q[`${p}hb`], 0, 100) } : null,
  };
}

/** The simulator's input from the query string; with no query, your own village's army. */
function inputFrom(req: Request): SimInput & { extra: number } {
  const ctx = authed(req);
  const q = req.query;
  const myTribe = (ctx.user.tribe as TribeId) ?? 'romans';
  // No query (or ?mine=1 from a report/map link): start from your own village's army.
  const fresh = Object.keys(q).filter((k) => k !== 'partial').length === 0 || q.mine === '1';
  const attacker = armyFrom(q, 'a', myTribe);
  if (fresh) {
    attacker.units = troopsAt(db, ctx.villageId, ctx.villageId);
    const v = db.select({ blacksmith: villages.blacksmith }).from(villages).where(eq(villages.id, ctx.villageId)).get();
    attacker.levels = parseLevels(v?.blacksmith).concat(Array(10).fill(0)).slice(0, 10);
    const h = heroAtHome(db, ctx.user.id, ctx.villageId, ctx.now);
    if (h) attacker.hero = { slot: h.unitSlot, points: h.strength, bonus: h.offBonus };
  }
  const village = str(q.oasis) !== '1';
  const ownerTribe: TribeId = village ? 'romans' : 'nature';
  const defenders = [armyFrom(q, 'd1', ownerTribe)];
  // Reinforcement armies only count when they have something in them.
  for (const p of ['d2', 'd3']) {
    const a = armyFrom(q, p, 'romans');
    if (a.units.some((n) => n > 0) || a.hero) defenders.push(a);
  }
  const myPop = playerProfile(db, ctx.user.id)?.villages.reduce((s, v) => s + v.pop, 0) ?? 100;
  return {
    mode: str(q.mode) === 'raid' ? 'raid' : 'attack',
    attacker,
    attackerPop: q.apop === undefined ? Math.max(1, myPop) : num(q.apop, 1, 10_000_000, Math.max(1, myPop)),
    attackBonus: num(q.abon, 0, 100) / 100,
    defenders,
    village,
    wall: num(q.wall, 0, 20),
    residence: num(q.res, 0, 20),
    stonemason: num(q.stone, 0, 20),
    defenderPop: num(q.dpop, 1, 10_000_000, Math.max(1, myPop)),
    defenseBonus: num(q.dbon, 0, 100) / 100,
    targetLevel: num(q.tl, 0, 20),
    traps: num(q.traps, 0, 1_000_000),
    extra: defenders.length,
  };
}

simulatorRouter.get('/simulator', (req, res) => {
  const input = inputFrom(req);
  const result = simulate(input);
  if (req.query.partial === '1') {
    res.type('html').send(String(simResultPanel(input, result)));
    return;
  }
  const page = loadGamePage(req);
  sendPage(req, res, 'Combat simulator', simulatorView({ input, result, worldSpeed: config.WORLD_SPEED }), { nav: 'troops', chrome: page.chrome });
});

