import { Router, type Request } from 'express';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { heroAtHome } from '../../game/engine/hero.js';
import { getModifiers } from '../../game/modifiers.js';
import { parseLevels, troopsAt } from '../../game/engine/state.js';
import { villages } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { playerProfile } from '../../game/queries.js';
import { simulate, type SimArmy, type SimInput } from '../../game/rules/simulate.js';
import { defenseSnapshot } from '../../game/engine/defense.js';
import { NATAR_TYPICAL, natarArmy } from '../../game/rules/natars.js';
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
export type SimPageInput = SimInput & {
  extra: number;
  villages: { id: number; name: string; pop: number }[];
  defv: number;
  natar: { strength: number; playerPop: number; name: string } | null;
};

function inputFrom(req: Request): SimPageInput {
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
    if (h) attacker.hero = { slot: h.unitSlot, points: h.strength, bonus: h.offBonus, health: h.health };
  }
  const village = str(q.oasis) !== '1';
  const ownerTribe: TribeId = village ? 'romans' : 'nature';
  const defenders = [armyFrom(q, 'd1', ownerTribe)];
  // Reinforcement armies only count when they have something in them.
  for (const p of ['d2', 'd3']) {
    const a = armyFrom(q, p, 'romans');
    if (a.units.some((n) => n > 0) || a.hero) defenders.push(a);
  }
  const myVillages = playerProfile(db, ctx.user.id)?.villages ?? [];
  const myPop = myVillages.reduce((s, v) => s + v.pop, 0) || 100;
  // "My village defends" / "Natars attack my village": fill the defence (and the Natar army) from a real village.
  const defv = num(q.defv, 0, Number.MAX_SAFE_INTEGER);
  const snap = (q.usedef === '1' || q.natar === '1') && myVillages.some((v) => v.id === defv) ? defenseSnapshot(db, defv, ctx.now) : undefined;
  if (snap) {
    defenders.length = 0;
    for (const a of snap.armies.slice(0, 3)) defenders.push({ tribe: a.tribe, units: a.units, levels: a.levels.concat(Array(10).fill(0)).slice(0, 10), hero: null });
    if (defenders[0] && snap.hero) defenders[0].hero = snap.hero;
    // A stationed hero fights with the reinforcing army of its tribe (one per army in the simulator).
    for (const sh of snap.stationedHeroes) {
      const army = defenders.find((d, i) => i > 0 && d.tribe === sh.tribe && !d.hero);
      if (army) army.hero = sh;
    }
    if (q.natar === '1') {
      attacker.tribe = 'natars';
      attacker.units = natarArmy(snap.strength, NATAR_TYPICAL, str(q.mode) === 'raid' ? 'raid' : 'attack');
      attacker.levels = Array(10).fill(0);
      attacker.hero = null;
    }
  }
  const natarRun = !!snap && q.natar === '1';
  return {
    mode: str(q.mode) === 'raid' ? 'raid' : 'attack',
    attacker,
    // Natar attacks don't suffer morale: they count as the same size as you.
    attackerPop: natarRun ? myPop : q.apop === undefined ? Math.max(1, myPop) : num(q.apop, 1, 10_000_000, Math.max(1, myPop)),
    attackBonus: num(q.abon, 0, 100) / 100,
    defenders,
    village: snap ? true : village,
    wall: snap ? snap.wall : num(q.wall, 0, 20),
    residence: snap ? snap.residence : num(q.res, 0, 20),
    stonemason: snap ? snap.stonemason : num(q.stone, 0, 20),
    defenderPop: snap ? Math.max(1, snap.playerPop) : num(q.dpop, 1, 10_000_000, Math.max(1, myPop)),
    defenseBonus: num(q.dbon, 0, 100) / 100,
    targetLevel: num(q.tl, 0, 20),
    traps: snap ? snap.freeTraps : num(q.traps, 0, 1_000_000),
    architect: snap ? snap.architect : 1,
    carryMult: fresh ? getModifiers(db, ctx.user.id, ctx.now).troopCarry : 1,
    extra: defenders.length,
    villages: myVillages.map((v) => ({ id: v.id, name: v.name, pop: v.pop })),
    defv: snap?.villageId ?? (defv || ctx.villageId),
    natar: natarRun ? { strength: snap.strength, playerPop: snap.playerPop, name: snap.name } : null,
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

