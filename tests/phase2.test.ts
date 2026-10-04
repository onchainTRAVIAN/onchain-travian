import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
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
import { addSkillPoints, getHero, reviveHero } from '../src/game/actions/hero.js';
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
  removeTicker,
  tickerAvailability,
} from '../src/game/actions/credits.js';
import { startBuild } from '../src/game/actions/build.js';
import { getModifiers } from '../src/game/modifiers.js';
import { emptyUnits } from '../src/game/rules/units.js';
import { res } from '../src/game/rules/resources.js';
import { config } from '../src/config.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 2, 1);

type P = { userId: number; villageId: number };
let a: P;
let b: P;
let c: P;

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

describe('hero', () => {
  it('exists for every player and can spend skill points', () => {
    const h = getHero(db, a.userId, clock.now());
    expect(h.status).toBe('home');
    addSkillPoints(db, a.userId, { strength: 3, offBonus: 2, defBonus: 0, production: 0 });
    expect(() => addSkillPoints(db, a.userId, { strength: 1, offBonus: 0, defBonus: 0, production: 0 })).toThrow(/free points/);
  });

  it('production points add resources to the home village', () => {
    const state = loadVillage(db, b.villageId);
    if (!state) throw new Error();
    const before = economyOf(db, state, clock.now()).gross.wood;
    addSkillPoints(db, b.userId, { strength: 0, offBonus: 0, defBonus: 0, production: 5 });
    const after = economyOf(db, state, clock.now()).gross.wood;
    expect(after).toBeGreaterThan(before);
  });

  it('fights in a raid, gains XP and comes home', () => {
    rich(a.villageId);
    const units = emptyUnits();
    units[0] = 50;
    setTroopsAt(db, a.villageId, a.villageId, units);
    const target = village(b.villageId);
    const mv = sendTroops(db, a.userId, a.villageId, { x: target.x, y: target.y, kind: 'raid', units, hero: true }, clock.now());
    expect(mv.hero).toBe(true);
    expect(getHero(db, a.userId, clock.now()).status).toBe('moving');
    advance(mv.arriveAt - clock.now() + 1);
    const ret = db.select().from(movements).where(eq(movements.fromVillageId, a.villageId)).get();
    expect(ret?.hero).toBe(true);
    advance((ret?.arriveAt ?? 0) - clock.now() + 1);
    const h = getHero(db, a.userId, clock.now());
    expect(h.status).toBe('home');
    expect(h.locationId).toBe(a.villageId);
  });

  it('a dead hero can be revived for resources', () => {
    db.update(heroes).set({ status: 'dead', health: 0, locationId: null }).where(eq(heroes.userId, c.userId)).run();
    const h = reviveHero(db, c.userId, clock.now());
    expect(h.status).toBe('reviving');
    advance((h.reviveAt ?? 0) - clock.now() + 1);
    expect(getHero(db, c.userId, clock.now()).status).toBe('home');
  });
});

describe('oases', () => {
  it('animals defend an oasis; clearing it with the hero captures it', () => {
    const v = village(a.villageId);
    const oasis = freeTileNear(v.x, v.y, 'oasis');
    const near = Math.max(Math.abs(oasis.x - v.x), Math.abs(oasis.y - v.y)) <= 3;
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
    home(bNew.id);
    expect(village(bNew.id).loyalty).toBeGreaterThan(50);
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
    const al = createAlliance(db, a.userId, 'Round Table', 'RT', clock.now());
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
    expect(grantCredits(db, a.userId, 200, 'test', 'test-grant-1', clock.now())).toBe(true);
    expect(grantCredits(db, a.userId, 200, 'test', 'test-grant-1', clock.now())).toBe(false);
    expect(creditBalance(db, a.userId)).toBe(200);
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
