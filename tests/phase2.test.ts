import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { heroes, movements, reports, slots, tiles, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { catchUp, troopsAt, setTroopsAt, parseLevels, economyOf, loadVillage } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { startResearch, academyOptions } from '../src/game/actions/research.js';
import { startTraining } from '../src/game/actions/train.js';
import { sendTroops } from '../src/game/actions/troops.js';
import { getHero, reviveHero, setSkills, trainHero } from '../src/game/actions/hero.js';
import { heroCombat, heroPoints, heroReviveCost } from '../src/game/rules/hero.js';
import { oasisLoyaltyHit } from '../src/game/engine/oasis.js';
import { acceptOffer, createOffer, sendResources } from '../src/game/actions/market.js';
import {
  acceptInvite,
  createAlliance,
  invitePlayer,
  leaveAlliance,
  membership,
  proposeDiplomacy,
  answerDiplomacy,
  diplomacyOf,
} from '../src/game/actions/alliance.js';
import { channelFor, chatHistory, postChat } from '../src/game/actions/chat.js';
import {
  activeTicker,
  bookTicker,
  buyBoost,
  creditBalance,
  finishConstructionNow,
  grantCredits,
  npcTrade,
  transferGold,
  buyProtection,
  instantPrice,
  removeTicker,
  tickerAvailability,
} from '../src/game/actions/credits.js';
import { startBuild } from '../src/game/actions/build.js';
import { getModifiers } from '../src/game/modifiers.js';
import { TRIBES, emptyUnits } from '../src/game/rules/units.js';
import { res } from '../src/game/rules/resources.js';
import { config } from '../src/config.js';
import { oasisStock } from '../src/game/engine/oasis.js';
import { WEEK_MS, lastWinners, medalsOf, processWeek, weekStart, weeklyStandings } from '../src/game/actions/weekly.js';
import { CANCEL_RETURN_MS, buyListing, cancelListing, editListing, listResources, listTroops } from '../src/game/actions/goldmarket.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 2, 1);

type P = { userId: number; villageId: number };
let a: P;
let b: P;
let c: P;
let d: P;

function setSlot(villageId: number, slot: number, building: string, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}
function village(id: number) {
  const v = db.select().from(villages).where(eq(villages.id, id)).get();
  if (!v) throw new Error('village missing');
  return v;
}
function rich(id: number) {
  db.update(villages).set({ wood: 50_000, clay: 50_000, iron: 50_000, crop: 50_000, resAt: clock.now() }).where(eq(villages.id, id)).run();
}
function advance(ms: number) {
  clock.advance(ms);
  processDue(db, clock.now());
}
function home(id: number) {
  db.transaction((tx) => catchUp(tx, id, clock.now()));
  return troopsAt(db, id, id);
}
function finishAll() {
  advance(30 * 24 * HOUR);
}
/** Find a free tile of a kind near (x, y). */
function freeTileNear(x: number, y: number, kind: 'field' | 'oasis') {
  const all = db.select().from(tiles).where(eq(tiles.kind, kind)).all().filter((t) => t.villageId === null);
  all.sort((p, q) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) - Math.max(Math.abs(q.x - x), Math.abs(q.y - y)));
  const t = all.find((t) => !(t.x === x && t.y === y));
  if (!t) throw new Error('no free tile');
  return t;
}

beforeAll(async () => {
  clock.freeze(T0);
  ensureWorld(db);
  a = await registerPlayer(db, { username: 'Arthur', password: 'password123', tribe: 'romans' }, clock.now());
  b = await registerPlayer(db, { username: 'Bjorn', password: 'password123', tribe: 'teutons' }, clock.now());
  c = await registerPlayer(db, { username: 'Celt', password: 'password123', tribe: 'gauls' }, clock.now());
  d = await registerPlayer(db, { username: 'Dido', password: 'password123', tribe: 'gauls' }, clock.now());
  for (const p of [a, b, c]) {
    setSlot(p.villageId, 26, 'main', 10);
    setSlot(p.villageId, 20, 'warehouse', 20);
    setSlot(p.villageId, 21, 'granary', 20);
    setSlot(p.villageId, 22, 'barracks', 10);
    setSlot(p.villageId, 23, 'academy', 10);
    setSlot(p.villageId, 24, 'blacksmith', 10);
    setSlot(p.villageId, 30, 'armoury', 10);
    setSlot(p.villageId, 25, 'stable', 10);
    setSlot(p.villageId, 31, 'market', 10);
    setSlot(p.villageId, 27, 'embassy', 5);
    setSlot(p.villageId, 28, 'heromansion', 10);
    setSlot(p.villageId, 29, 'residence', 10);
    setSlot(p.villageId, 39, 'rally', 10);
    for (let s = 1; s <= 18; s++) db.update(slots).set({ level: 10 }).where(and(eq(slots.villageId, p.villageId), eq(slots.slot, s))).run();
    rich(p.villageId);
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
  }
});

describe('academy & smithy', () => {
  it('units need research before training; research completes over time', () => {
    expect(() => startTraining(db, a.userId, a.villageId, 'barracks', 2, 1, clock.now())).toThrow(/Research/);
    const order = startResearch(db, a.userId, a.villageId, 'academy', 2, clock.now());
    expect(() => startResearch(db, a.userId, a.villageId, 'academy', 1, clock.now())).toThrow(/busy/);
    advance(order.finishAt - clock.now() + 1);
    expect(parseLevels(village(a.villageId).research)[2]).toBe(1);
    rich(a.villageId);
    expect(startTraining(db, a.userId, a.villageId, 'barracks', 2, 1, clock.now()).total).toBe(1);
  });

  it('smithy upgrades raise a unit level, capped by smithy level', () => {
    const order = startResearch(db, a.userId, a.villageId, 'blacksmith', 0, clock.now());
    advance(order.finishAt - clock.now() + 1);
    expect(parseLevels(village(a.villageId).blacksmith)[0]).toBe(1);
  });

  it('lists research options with reasons', () => {
    const state = loadVillage(db, a.villageId);
    if (!state) throw new Error();
    const opts = academyOptions(db, state, clock.now());
    expect(opts.find((o) => o.slot === 2)?.reason).toBe('Researched');
  });
});

function trainHeroFor(p: P): void {
  rich(p.villageId);
  setSlot(p.villageId, 30, 'heromansion', 1);
  const units = troopsAtHome(p.villageId);
  units[0] = (units[0] ?? 0) + 1;
  setTroopsAt(db, p.villageId, p.villageId, units);
  const h = trainHero(db, p.userId, p.villageId, 0, clock.now());
  advance((h.reviveAt ?? 0) - clock.now() + 1);
}
function troopsAtHome(v: number) {
  return troopsAt(db, v, v);
}

describe('hero (classic T3.6)', () => {
  it('is trained in the Hero’s Mansion from a soldier and keeps that unit’s strengths', () => {
    expect(getHero(db, a.userId, clock.now())).toBeUndefined();
    db.update(slots).set({ building: null, level: 0 }).where(and(eq(slots.villageId, a.villageId), eq(slots.building, 'heromansion'))).run();
    expect(() => trainHero(db, a.userId, a.villageId, 0, clock.now())).toThrow(/Hero's Mansion/);
    trainHeroFor(a);
    const h = getHero(db, a.userId, clock.now());
    expect(h?.status).toBe('home');
    expect(h?.unitSlot).toBe(0);
    // Legionnaire (40/35/50) at 0 points: attack round5(5·40/4) = 50, defence 60 / 85.
    expect(heroCombat(TRIBES.romans.units[0]!, 0, 0)).toEqual({ off: 50, defInf: 60, defCav: 85 });
    expect(() => trainHero(db, a.userId, a.villageId, 0, clock.now())).toThrow(/already have a hero/);
    expect(() => trainHero(db, c.userId, c.villageId, 3, clock.now())).toThrow();
  });

  it('gets 5 points per level, movable freely at level 0', () => {
    setSkills(db, a.userId, { strength: 3, defPoints: 0, offBonus: 2, defBonus: 0, regen: 0 });
    setSkills(db, a.userId, { strength: 0, defPoints: 5, offBonus: 0, defBonus: 0, regen: 0 });
    expect(() => setSkills(db, a.userId, { strength: 6, defPoints: 0, offBonus: 0, defBonus: 0, regen: 0 })).toThrow(/5 points/);
    expect(heroPoints(3)).toBe(20);
    db.update(heroes).set({ level: 1, xp: 100 }).where(eq(heroes.userId, a.userId)).run();
    expect(() => setSkills(db, a.userId, { strength: 5, defPoints: 0, offBonus: 0, defBonus: 0, regen: 0 })).toThrow(/level 0/);
    setSkills(db, a.userId, { strength: 5, defPoints: 5, offBonus: 0, defBonus: 0, regen: 0 });
  });

  it('fights in a raid, gains XP and comes home at its unit’s speed', () => {
    rich(a.villageId);
    const units = emptyUnits();
    units[0] = 50;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const target = village(b.villageId);
    const mv = sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units, hero: true }, clock.now());
    expect(mv.hero).toBe(true);
    expect(getHero(db, a.userId, clock.now())?.status).toBe('moving');
    advance(mv.arriveAt - clock.now() + 1);
    const ret = db.select().from(movements).where(eq(movements.fromVillageId, a.villageId)).get();
    expect(ret?.hero).toBe(true);
    advance((ret?.arriveAt ?? 0) - clock.now() + 1);
    const h = getHero(db, a.userId, clock.now());
    expect(h?.status).toBe('home');
    expect(h?.locationId).toBe(a.villageId);
  });

  it('a fallen hero can be revived for resources based on its unit and level', () => {
    trainHeroFor(c);
    db.update(heroes).set({ status: 'dead', health: 0, locationId: null, level: 2 }).where(eq(heroes.userId, c.userId)).run();
    // Phalanx 100/130/55/30 at level 2: (2·cost + 30)·3^1.25
    expect(heroReviveCost(TRIBES.gauls.units[0]!, 2)).toEqual(res(908, 1145, 553, 355));
    const h = reviveHero(db, c.userId, clock.now());
    expect(h.status).toBe('reviving');
    advance((h.reviveAt ?? 0) - clock.now() + 1);
    expect(getHero(db, c.userId, clock.now())?.status).toBe('home');
  });

  it('owned oases lose 33 / 50 / 100 loyalty per hero attack depending on how many the owner holds', () => {
    expect([1, 2, 3].map(oasisLoyaltyHit)).toEqual([33, 50, 100]);
  });
});

describe('oases', () => {
  it('animals defend an oasis; clearing it with the hero captures it', () => {
    const v = village(a.villageId);
    const oasis = freeTileNear(v.x, v.y, 'oasis');
    const near = Math.max(Math.abs(oasis.x - v.x), Math.abs(oasis.y - v.y)) <= 3;
    setSlot(a.villageId, 30, 'heromansion', 10); // one oasis slot
    rich(a.villageId);
    const units = emptyUnits();
    units[0] = 3000;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const mv = sendTroops(db, a.userId, a.villageId, { x: oasis.x, y: oasis.y, kind: 'attack', units, hero: true }, clock.now());
    expect(mv.toVillageId).toBeNull();
    advance(mv.arriveAt - clock.now() + 1);
    const after = db.select().from(tiles).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).get();
    expect(JSON.parse(after?.animals ?? '[]').every((n: number) => n === 0)).toBe(true);
    if (near) {
      expect(after?.villageId).toBe(a.villageId);
      const eco = economyOf(db, loadVillage(db, a.villageId)!, clock.now());
      expect(eco.gross.wood + eco.gross.clay + eco.gross.iron + eco.gross.crop).toBeGreaterThan(0);
    }
    const r = db.select().from(reports).where(eq(reports.userId, a.userId)).all().at(-1);
    expect(r?.title).toMatch(/oasis/);
    finishAll();
  });

  it('unoccupied oases gather resources that winning raids carry home', () => {
    const v = village(c.villageId);
    const oasis = freeTileNear(v.x, v.y, 'oasis');
    const tile = () => db.select().from(tiles).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).get()!;
    const first = db.transaction((tx) => oasisStock(tx, tile(), clock.now()));
    expect(first.wood + first.clay + first.iron + first.crop).toBeGreaterThan(0);
    clock.advance(10 * HOUR);
    const later = db.transaction((tx) => oasisStock(tx, tile(), clock.now()));
    expect(later.wood + later.clay + later.iron + later.crop).toBeGreaterThan(first.wood + first.clay + first.iron + first.crop);
    // Clear the animals so a small raid wins, then send it.
    db.update(tiles).set({ animals: JSON.stringify(emptyUnits()), animalsAt: clock.now() }).where(and(eq(tiles.x, oasis.x), eq(tiles.y, oasis.y))).run();
    db.update(villages).set({ wood: 0, clay: 0, iron: 0, crop: 1000, resAt: clock.now() }).where(eq(villages.id, c.villageId)).run();
    const units = emptyUnits();
    units[0] = 100;
    setTroopsAt(db, c.villageId, c.villageId, units);
    const before = db.transaction((tx) => oasisStock(tx, tile(), clock.now()));
    const mv = sendTroops(db, c.userId, c.villageId, { x: oasis.x, y: oasis.y, kind: 'raid', units }, clock.now());
    advance(mv.arriveAt - clock.now() + 1);
    const rep = db.select().from(reports).where(eq(reports.userId, c.userId)).all().at(-1);
    const data = JSON.parse(rep?.data ?? '{}') as { loot?: { wood: number; clay: number; iron: number; crop: number } };
    const got = (data.loot?.wood ?? 0) + (data.loot?.clay ?? 0) + (data.loot?.iron ?? 0) + (data.loot?.crop ?? 0);
    expect(got).toBeGreaterThan(0);
    const left = db.transaction((tx) => oasisStock(tx, tile(), clock.now()));
    expect(left.wood + left.clay + left.iron + left.crop).toBeLessThan(before.wood + before.clay + before.iron + before.crop);
    finishAll();
  });
});

describe('expansion', () => {
  it('settlers found a new village once culture points allow it', () => {
    db.update(users).set({ culturePoints: 100_000, cultureAt: clock.now() }).where(eq(users.id, b.userId)).run();
    rich(b.villageId);
    const t = startTraining(db, b.userId, b.villageId, 'residence', 9, 3, clock.now());
    advance(t.perUnitMs * 3 + 10);
    expect(home(b.villageId)[9]).toBe(3);
    // No more slots for settlers beyond the one group.
    rich(b.villageId);
    expect(() => startTraining(db, b.userId, b.villageId, 'residence', 9, 1, clock.now())).toThrow();
    const v = village(b.villageId);
    const spot = freeTileNear(v.x, v.y, 'field');
    const units = emptyUnits();
    units[9] = 3;
    const mv = sendTroops(db, b.userId, b.villageId, { x: spot.x, y: spot.y, kind: 'settle', units }, clock.now());
    advance(mv.arriveAt - clock.now() + 1);
    const owned = db.select().from(villages).where(eq(villages.userId, b.userId)).all();
    expect(owned).toHaveLength(2);
    expect(owned.find((x) => x.x === spot.x && x.y === spot.y)?.isCapital).toBe(false);
    expect(village(b.villageId).expansions).toBe(1);
  });

  it('chiefs lower loyalty and conquer a non-capital village', () => {
    const bNew = db.select().from(villages).where(and(eq(villages.userId, b.userId), eq(villages.isCapital, false))).get();
    if (!bNew) throw new Error('no second village');
    // Arthur gets chiefs, an expansion slot and culture points.
    db.update(users).set({ culturePoints: 100_000, cultureAt: clock.now() }).where(eq(users.id, a.userId)).run();
    rich(a.villageId);
    const units = emptyUnits();
    units[0] = 2000;
    units[8] = 5;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const mv = sendTroops(db, a.userId, a.villageId, { x: bNew.x, y: bNew.y, kind: 'attack', units }, clock.now());
    advance(mv.arriveAt - clock.now() + 1);
    const after = village(bNew.id);
    expect(after.userId).toBe(a.userId);
    expect(after.loyalty).toBeLessThan(5);
    const rep = db.select().from(reports).where(eq(reports.userId, b.userId)).all().at(-1);
    expect(rep?.data).toContain('"conquered":true');
    finishAll();
    // T3.6: loyalty regrows only with a Residence/Palace (1% per level per hour).
    home(bNew.id);
    expect(village(bNew.id).loyalty).toBeLessThan(5);
    setSlot(bNew.id, 25, 'residence', 10);
    clock.advance(5 * HOUR);
    expect(catchUp(db, bNew.id, clock.now())?.village.loyalty).toBeGreaterThan(45);
  });

  it('capitals cannot be conquered', () => {
    rich(a.villageId);
    const units = emptyUnits();
    units[0] = 3000;
    units[8] = 5;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const target = village(c.villageId);
    const mv = sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'attack', units }, clock.now());
    advance(mv.arriveAt - clock.now() + 1);
    expect(village(c.villageId).userId).toBe(c.userId);
    finishAll();
  });
});

describe('marketplace', () => {
  it('merchants deliver resources and walk home', () => {
    rich(a.villageId);
    db.update(villages).set({ wood: 0, resAt: clock.now() }).where(eq(villages.id, c.villageId)).run();
    const target = village(c.villageId);
    const ms = sendResources(db, a.userId, a.villageId, target.x, target.y, res(1000, 0, 0, 0), clock.now());
    advance(ms + 1);
    expect(village(c.villageId).wood).toBeGreaterThanOrEqual(1000);
    expect(db.select().from(movements).where(eq(movements.kind, 'merchant_return')).all().length).toBe(1);
    finishAll();
  });

  it('offers reserve resources and both sides get paid on accept', () => {
    rich(a.villageId);
    rich(c.villageId);
    const before = village(c.villageId).iron;
    const offer = createOffer(db, a.userId, a.villageId, { res: 'wood', amount: 500 }, { res: 'iron', amount: 400 }, null, clock.now());
    expect(() => createOffer(db, a.userId, a.villageId, { res: 'wood', amount: 100 }, { res: 'iron', amount: 1000 }, null, clock.now())).toThrow(/ratio/);
    acceptOffer(db, c.userId, c.villageId, offer.id, clock.now());
    expect(village(c.villageId).iron).toBeLessThan(before);
    finishAll();
    const trades = db.select().from(reports).where(eq(reports.kind, 'trade')).all();
    expect(trades.length).toBeGreaterThanOrEqual(3);
  });
});

describe('alliances & chat', () => {
  it('found, invite, join, diplomacy and leave', () => {
    // Founding costs Gold: refused (and nothing created) without enough.
    expect(() => createAlliance(db, a.userId, 'Round Table', 'RT', clock.now())).toThrow(/280 Gold/);
    grantCredits(db, a.userId, 300, 'test', 'ally-grant-a', clock.now());
    grantCredits(db, b.userId, 280, 'test', 'ally-grant-b', clock.now());
    const before = creditBalance(db, a.userId);
    const al = createAlliance(db, a.userId, 'Round Table', 'RT', clock.now());
    expect(creditBalance(db, a.userId)).toBe(before - 280);
    expect(() => createAlliance(db, c.userId, 'Copy', 'rt', clock.now())).toThrow(/taken/);
    invitePlayer(db, a.userId, 'Celt', clock.now());
    acceptInvite(db, c.userId, al.id, clock.now());
    expect(membership(db, c.userId)?.a.id).toBe(al.id);
    const other = createAlliance(db, b.userId, 'Vikings', 'VIK', clock.now());
    proposeDiplomacy(db, a.userId, 'VIK', 'nap', clock.now());
    const pending = diplomacyOf(db, other.id)[0];
    expect(pending?.incoming).toBe(true);
    answerDiplomacy(db, b.userId, pending?.id ?? 0, true);
    expect(diplomacyOf(db, al.id)[0]?.status).toBe('active');
    leaveAlliance(db, c.userId);
    expect(membership(db, c.userId)).toBeUndefined();
  });

  it('global and alliance chat with a cooldown', () => {
    postChat(db, a.userId, channelFor(db, a.userId, 'global'), 'Hello world', clock.now());
    expect(() => postChat(db, a.userId, channelFor(db, a.userId, 'global'), 'again', clock.now())).toThrow(/Slow down/);
    clock.advance(5000);
    postChat(db, a.userId, channelFor(db, a.userId, 'alliance'), 'Secret plans', clock.now());
    expect(chatHistory(db, { kind: 'global' }).map((m) => m.body)).toContain('Hello world');
    expect(chatHistory(db, { kind: 'global' }).map((m) => m.body)).not.toContain('Secret plans');
    expect(() => channelFor(db, c.userId, 'alliance')).toThrow(/Join an alliance/);
    db.update(users).set({ mutedUntil: clock.now() + HOUR }).where(eq(users.id, c.userId)).run();
    expect(() => postChat(db, c.userId, { kind: 'global' }, 'hi', clock.now())).toThrow(/muted/);
  });
});

describe('credits shop & news ticker', () => {
  it('ledger grants are idempotent and spending checks the balance', () => {
    const start = creditBalance(db, a.userId);
    expect(grantCredits(db, a.userId, 200, 'test', 'test-grant-1', clock.now())).toBe(true);
    expect(grantCredits(db, a.userId, 200, 'test', 'test-grant-1', clock.now())).toBe(false);
    expect(creditBalance(db, a.userId)).toBe(start + 200);
    expect(() => buyBoost(db, b.userId, 'build_queue', clock.now())).toThrow(/Gold/);
  });

  it('boosts apply through modifiers and extend when bought again', () => {
    buyBoost(db, a.userId, 'build_queue', clock.now());
    expect(getModifiers(db, a.userId, clock.now()).buildQueue).toBe(2);
    buyBoost(db, a.userId, 'build_queue', clock.now());
    clock.advance(10 * 86_400_000);
    expect(getModifiers(db, a.userId, clock.now()).buildQueue).toBe(2);
    clock.advance(5 * 86_400_000);
    expect(getModifiers(db, a.userId, clock.now()).buildQueue).toBe(1);
    processDue(db, clock.now());
  });

  it('instant finish completes construction', () => {
    rich(a.villageId);
    const order = startBuild(db, a.userId, a.villageId, 26, undefined, clock.now());
    const before = creditBalance(db, a.userId);
    finishConstructionNow(db, a.userId, order.id, clock.now());
    processDue(db, clock.now());
    expect(loadVillage(db, a.villageId)?.slots.find((s) => s.slot === 26)?.level).toBe(11);
    expect(creditBalance(db, a.userId)).toBeLessThan(before);
  });

  it('NPC merchant redistributes resources', () => {
    db.update(villages).set({ wood: 1000, clay: 1000, iron: 1000, crop: 1000, resAt: clock.now() }).where(eq(villages.id, a.villageId)).run();
    npcTrade(db, a.userId, a.villageId, res(4000, 0, 0, 0), clock.now());
    expect(village(a.villageId).wood).toBe(4000);
    expect(() => npcTrade(db, a.userId, a.villageId, res(9000, 0, 0, 0), clock.now())).toThrow();
  });

  it('NPC merchant never loses resources: the unassigned rest is spread over the chosen mix', () => {
    db.update(villages).set({ wood: 1000, clay: 1000, iron: 1000, crop: 1000, resAt: clock.now() }).where(eq(villages.id, a.villageId)).run();
    // Player asked for 3000 of 4000 (e.g. production since page load): the extra 1000 must not vanish.
    const got = npcTrade(db, a.userId, a.villageId, res(1500, 1500, 0, 0), clock.now());
    expect(got.wood + got.clay + got.iron + got.crop).toBe(4000);
    expect(got.iron).toBe(0);
    expect(got.crop).toBe(0);
    const v = village(a.villageId);
    expect(Math.floor(v.wood + v.clay + v.iron + v.crop)).toBe(4000);
    // All zeros → spread evenly.
    const even = npcTrade(db, a.userId, a.villageId, res(0, 0, 0, 0), clock.now());
    expect(even).toEqual(res(1000, 1000, 1000, 1000));
    // Over capacity for one resource is rejected, and no Gold is charged.
    const before = creditBalance(db, a.userId);
    expect(() => npcTrade(db, a.userId, a.villageId, res(10_000_000, 0, 0, 0), clock.now())).toThrow(/storage/);
    expect(creditBalance(db, a.userId)).toBe(before);
  });

  it('players can send Gold to each other', () => {
    grantCredits(db, a.userId, 500, 'test', 'test-transfer-grant', clock.now());
    const fromBefore = creditBalance(db, a.userId);
    const toBefore = creditBalance(db, b.userId);
    const r = transferGold(db, a.userId, 'bjorn', 120, 'for the wood', clock.now());
    expect(r.toName).toBe('Bjorn');
    expect(creditBalance(db, a.userId)).toBe(fromBefore - 120);
    expect(creditBalance(db, b.userId)).toBe(toBefore + 120);
    expect(() => transferGold(db, a.userId, 'Arthur', 1, '', clock.now())).toThrow(/yourself/);
    expect(() => transferGold(db, a.userId, 'Bjorn', 0, '', clock.now())).toThrow();
    expect(() => transferGold(db, a.userId, 'Bjorn', 1.5, '', clock.now())).toThrow();
    expect(() => transferGold(db, a.userId, 'nobody', 1, '', clock.now())).toThrow(/No player/);
    expect(() => transferGold(db, a.userId, 'Bjorn', fromBefore, '', clock.now())).toThrow(/only have/);
    expect(creditBalance(db, a.userId)).toBe(fromBefore - 120);
  });

  it('protection for Gold: 24 h, not while protected, and only 8 h after the last bought one ended', () => {
    const u = d;
    grantCredits(db, u.userId, 400, 'test', 'prot-grant', clock.now());
    db.update(users).set({ protectedUntil: clock.now() + HOUR }).where(eq(users.id, u.userId)).run();
    expect(() => buyProtection(db, u.userId, clock.now())).toThrow(/already protected/);
    clock.advance(HOUR + 1000);
    const bal = creditBalance(db, u.userId);
    const until = buyProtection(db, u.userId, clock.now());
    expect(until - clock.now()).toBe(24 * HOUR);
    expect(creditBalance(db, u.userId)).toBe(bal - 80);
    clock.advance(24 * HOUR + 1000);
    expect(() => buyProtection(db, u.userId, clock.now())).toThrow(/buy protection again in 8 h/);
    clock.advance(8 * HOUR);
    expect(buyProtection(db, u.userId, clock.now())).toBeGreaterThan(clock.now());
  });

  it('finish-now price grows with the time left and follows the world speed', () => {
    // x100: 1 Gold per real minute.
    expect(instantPrice(30_000, 100)).toBe(2);
    expect(instantPrice(45 * 60_000, 100)).toBe(45);
    // x20: a 30-minute job is 10 hours at x1 → 6 Gold; x1: 10 hours → 6 Gold.
    expect(instantPrice(30 * 60_000, 20)).toBe(6);
    expect(instantPrice(10 * HOUR, 1)).toBe(6);
  });

  it('players book ticker slots that show for everyone and can be removed with a refund', () => {
    const start = clock.now() + 2 * HOUR;
    const balance = creditBalance(db, a.userId);
    const m = bookTicker(db, a.userId, 'Round Table is recruiting!', start, 2, clock.now());
    expect(creditBalance(db, a.userId)).toBe(balance - 2 * config.TICKER_PRICE_PER_HOUR);
    expect(() => bookTicker(db, a.userId, 'visit www.scam.com', start, 1, clock.now())).toThrow(/Links/);
    expect(activeTicker(db, clock.now())).toHaveLength(0);
    clock.advance(2 * HOUR + 60_000);
    expect(activeTicker(db, clock.now()).map((x) => x.body)).toContain('Round Table is recruiting!');
    const slot = tickerAvailability(db, clock.now())[0];
    expect(slot?.used).toBe(1);
    removeTicker(db, m.id, clock.now());
    expect(activeTicker(db, clock.now())).toHaveLength(0);
    expect(creditBalance(db, a.userId)).toBeGreaterThan(balance - 2 * config.TICKER_PRICE_PER_HOUR);
  });

  it('fills up when an hour is fully booked', () => {
    grantCredits(db, a.userId, 1000, 'test', 'test-grant-2', clock.now());
    const start = clock.now() + 10 * HOUR;
    for (let i = 0; i < config.TICKER_MAX_PER_HOUR; i++) bookTicker(db, a.userId, `Message ${i}`, start, 1, clock.now());
    expect(() => bookTicker(db, a.userId, 'One too many', start, 1, clock.now())).toThrow(/fully booked/);
  });
});

describe('starvation', () => {
  it('crop consumption does not scale with world speed (production does)', () => {
    const st = loadVillage(db, a.villageId)!;
    const cfg = config as { WORLD_SPEED: number };
    const was = cfg.WORLD_SPEED;
    try {
      cfg.WORLD_SPEED = 1;
      const e1 = economyOf(db, st, clock.now());
      cfg.WORLD_SPEED = 100;
      const e100 = economyOf(db, st, clock.now());
      expect(e100.upkeep).toBe(e1.upkeep);
      expect(e100.gross.wood).toBeCloseTo(e1.gross.wood * 100, 0);
    } finally {
      cfg.WORLD_SPEED = was;
    }
  });

  it('troops desert when the granary is empty and upkeep exceeds production', () => {
    const units = emptyUnits();
    units[0] = 100_000;
    setTroopsAt(db, c.villageId, c.villageId, units);
    db.update(villages).set({ crop: 0, resAt: clock.now() }).where(eq(villages.id, c.villageId)).run();
    clock.advance(HOUR);
    const left = home(c.villageId)[0] ?? 0;
    expect(left).toBeLessThan(100_000);
    expect(db.select().from(reports).where(and(eq(reports.userId, c.userId), eq(reports.kind, 'starvation'))).all()).toHaveLength(1);
  });
});

describe('gold market', () => {
  it('sells resources and troops for Gold with escrow, tribe rule and delivery', async () => {
    const r2 = await registerPlayer(db, { username: 'Romulus', password: 'password123', tribe: 'romans' }, clock.now());
    grantCredits(db, b.userId, 1000, 'test', 'gm-grant-b', clock.now());
    grantCredits(db, r2.userId, 1000, 'test', 'gm-grant-r2', clock.now());
    // Resources: escrowed on listing.
    db.update(villages).set({ wood: 3000, clay: 3000, iron: 3000, crop: 3000, resAt: clock.now() }).where(eq(villages.id, a.villageId)).run();
    const resId = listResources(db, a.userId, a.villageId, res(2000, 0, 0, 0), 50, clock.now());
    expect(Math.floor(village(a.villageId).wood)).toBe(1000);
    expect(() => listResources(db, a.userId, a.villageId, res(5000, 0, 0, 0), 50, clock.now())).toThrow(/Not enough wood/);
    expect(() => buyListing(db, a.userId, a.villageId, resId, clock.now())).toThrow(/own offer/);
    const sellerBefore = creditBalance(db, a.userId);
    db.update(villages).set({ wood: 0, resAt: clock.now() }).where(eq(villages.id, b.villageId)).run();
    const { arriveAt } = buyListing(db, b.userId, b.villageId, resId, clock.now());
    expect(creditBalance(db, a.userId)).toBe(sellerBefore + 50);
    expect(() => buyListing(db, r2.userId, r2.villageId, resId, clock.now())).toThrow(/faster/);
    clock.advance(arriveAt - clock.now() + 1000);
    processDue(db, clock.now());
    expect(village(b.villageId).wood).toBeGreaterThanOrEqual(2000);
    // Troops: only own tribe may buy; settlers/chiefs can't be sold.
    const units = emptyUnits();
    units[0] = 50;
    units[9] = 1;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const chief = emptyUnits();
    chief[9] = 1;
    expect(() => listTroops(db, a.userId, a.villageId, chief, 10, clock.now())).toThrow(/Settlers and chiefs/);
    const sell = emptyUnits();
    sell[0] = 30;
    const trId = listTroops(db, a.userId, a.villageId, sell, 100, clock.now());
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(20);
    expect(() => buyListing(db, b.userId, b.villageId, trId, clock.now())).toThrow(/Only Romans/);
    const del = buyListing(db, r2.userId, r2.villageId, trId, clock.now());
    clock.advance(del.arriveAt - clock.now() + 1000);
    processDue(db, clock.now());
    expect(troopsAt(db, r2.villageId, r2.villageId)[0]).toBe(30);
    // Not enough Gold → nothing changes; cancel returns escrow.
    const sell2 = emptyUnits();
    sell2[0] = 20;
    const expensive = listTroops(db, a.userId, a.villageId, sell2, 999_999, clock.now());
    const r2Gold = creditBalance(db, r2.userId);
    expect(() => buyListing(db, r2.userId, r2.villageId, expensive, clock.now())).toThrow(/This costs/);
    expect(creditBalance(db, r2.userId)).toBe(r2Gold);
    cancelListing(db, a.userId, expensive, clock.now());
    // Cancelled goods walk back from the market; they're not home instantly.
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(0);
    advance(CANCEL_RETURN_MS + 1000);
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(20);
    expect(() => cancelListing(db, a.userId, expensive, clock.now())).toThrow(/closed/);
    expect(() => editListing(db, a.userId, expensive, { price: 5 }, clock.now())).toThrow(/closed/);
  });

  it('edits an open offer: price, more goods taken from the village, fewer given back', () => {
    db.update(villages).set({ wood: 3000, clay: 3000, iron: 3000, crop: 3000, resAt: clock.now() }).where(eq(villages.id, a.villageId)).run();
    const id = listResources(db, a.userId, a.villageId, res(1000, 0, 0, 0), 30, clock.now());
    editListing(db, a.userId, id, { price: 45, goods: res(1500, 200, 0, 0) }, clock.now());
    expect(Math.floor(village(a.villageId).wood)).toBe(1500);
    expect(Math.floor(village(a.villageId).clay)).toBe(2800);
    editListing(db, a.userId, id, { price: 45, goods: res(500, 0, 0, 0) }, clock.now());
    expect(Math.floor(village(a.villageId).wood)).toBe(2500);
    expect(Math.floor(village(a.villageId).clay)).toBe(3000);
    expect(() => editListing(db, a.userId, id, { price: 45, goods: res(9000, 0, 0, 0) }, clock.now())).toThrow(/Not enough wood/);
    expect(() => editListing(db, b.userId, id, { price: 1 }, clock.now())).toThrow(/not found/);
    const units = emptyUnits();
    units[0] = 40;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const sell = emptyUnits();
    sell[0] = 10;
    const tid = listTroops(db, a.userId, a.villageId, sell, 50, clock.now());
    const more = emptyUnits();
    more[0] = 25;
    editListing(db, a.userId, tid, { price: 80, units: more }, clock.now());
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(15);
    const fewer = emptyUnits();
    fewer[0] = 5;
    editListing(db, a.userId, tid, { price: 20, units: fewer }, clock.now());
    expect(troopsAt(db, a.villageId, a.villageId)[0]).toBe(35);
    cancelListing(db, a.userId, tid, clock.now());
    cancelListing(db, a.userId, id, clock.now());
  });
});

describe('weekly statistics', () => {
  it('ranks weekly gains, awards top 3 medals + Gold at the rollover exactly once', async () => {
    expect(new Date(weekStart(Date.UTC(2026, 9, 7, 15))).toISOString()).toBe('2026-10-05T00:00:00.000Z'); // Wednesday → Monday
    processWeek(db, clock.now()); // snapshot for the current week
    const ws = weekStart(clock.now());
    const bump = (id: number, off: number) =>
      db.update(users).set({ offPoints: sql`${users.offPoints} + ${off}` }).where(eq(users.id, id)).run();
    bump(a.userId, 500);
    bump(b.userId, 300);
    bump(c.userId, 100);
    const late = await registerPlayer(db, { username: 'Latecomer', password: 'password123', tribe: 'romans' }, clock.now());
    bump(late.userId, 50);
    const top = weeklyStandings(db, 'attack', ws, 10);
    expect(top.slice(0, 3).map((r) => r.userId)).toEqual([a.userId, b.userId, c.userId]);
    expect(top.find((r) => r.userId === late.userId)?.value).toBe(50);
    const gold = [a, b, c].map((p) => creditBalance(db, p.userId));
    clock.advance(ws + WEEK_MS + 60_000 - clock.now());
    const r = processWeek(db, clock.now());
    expect(r.awarded).toBeGreaterThanOrEqual(3);
    expect(creditBalance(db, a.userId)).toBeGreaterThanOrEqual((gold[0] ?? 0) + 300);
    expect(medalsOf(db, a.userId).some((m) => m.category === 'attack' && m.rank === 1 && m.prize === 300)).toBe(true);
    expect(medalsOf(db, b.userId).some((m) => m.category === 'attack' && m.rank === 2 && m.prize === 200)).toBe(true);
    expect(medalsOf(db, c.userId).some((m) => m.category === 'attack' && m.rank === 3 && m.prize === 100)).toBe(true);
    // Running again (every tick) pays nothing more, and the new week starts from zero.
    const after = creditBalance(db, a.userId);
    expect(processWeek(db, clock.now()).awarded).toBe(0);
    expect(creditBalance(db, a.userId)).toBe(after);
    expect(weeklyStandings(db, 'attack', weekStart(clock.now()), 10)).toHaveLength(0);
    expect(lastWinners(db)?.rows.length).toBeGreaterThanOrEqual(3);
  });
});
