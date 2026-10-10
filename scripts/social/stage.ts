/**
 * A lived-in demo world for X post screenshots and videos (never run against a real database).
 *
 *   DATABASE_PATH=<scratch>/game.db WORLD_SPEED=100 npx tsx scripts/social/stage.ts
 *
 * Plays ~10 days of game time (7 of fighting, then artifacts and market) with the game's own actions: a developed Roman capital ("demo" /
 * "demo12345", Gold Club, hero, big army), ~60 neighbours in alliances, raids and sieges both ways
 * (coloured reports), weekly medals, Gold market offers, released artifacts, oasis raider and auto
 * training. Then serve it with the same env and `npm run dev` / `node dist/server.js`.
 */
import { and, eq } from 'drizzle-orm';
import { clock } from '../../src/clock.js';
import { config } from '../../src/config.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const REAL = Date.now();
if (!config.DATABASE_PATH.includes('/tmp/') && !config.DATABASE_PATH.includes('scratch')) {
  throw new Error(`Refusing to stage into ${config.DATABASE_PATH} - point DATABASE_PATH at a scratch file`);
}
clock.freeze(REAL - 10 * DAY);

const { db } = await import('../../src/db/index.js');
const { slots, users, villages, heroes, alliances, allianceDiplomacy, movements } = await import('../../src/db/schema.js');
const { ensureWorld } = await import('../../src/game/engine/world.js');
const { registerPlayer } = await import('../../src/game/actions/account.js');
const { refreshPopulation, setTroopsAt } = await import('../../src/game/engine/state.js');
const { emptyUnits } = await import('../../src/game/rules/units.js');
const { processDue } = await import('../../src/game/engine/events.js');
const { processWeek } = await import('../../src/game/actions/weekly.js');
const { sendTroops } = await import('../../src/game/actions/troops.js');
const { trainHero } = await import('../../src/game/actions/hero.js');
const { grantCredits } = await import('../../src/game/actions/credits.js');
const { createAlliance, invitePlayer, acceptInvite } = await import('../../src/game/actions/alliance.js');
const { listResources, listTroops } = await import('../../src/game/actions/goldmarket.js');
const { releaseArtifacts, releaseWonders } = await import('../../src/game/actions/endgame.js');
const { saveRaider, runRaiderNow, defaultAllowed, setRaiderEnabled } = await import('../../src/game/actions/raider.js');
const { startAutoTrain, processAutoTrains } = await import('../../src/game/actions/autotrain.js');
const { processOasisRaiders } = await import('../../src/game/actions/raider.js');

type Tribe = 'romans' | 'teutons' | 'gauls';
ensureWorld(db);

/** Let game time pass, ticking like the server does (every 10 game minutes). */
function pass(ms: number) {
  const end = clock.now() + ms;
  while (clock.now() < end) {
    clock.advance(Math.min(10 * 60_000, end - clock.now()));
    const t = clock.now();
    processDue(db, t);
    processWeek(db, t);
    processAutoTrains(db, t);
    processOasisRaiders(db, t);
  }
}

function setSlot(villageId: number, slot: number, building: string | null, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}

function units(list: number[]) {
  const u = emptyUnits();
  list.forEach((n, i) => (u[i] = n));
  return u;
}

function rich(villageId: number) {
  db.update(villages).set({ wood: 60_000, clay: 60_000, iron: 60_000, crop: 60_000, resAt: clock.now() }).where(eq(villages.id, villageId)).run();
}

async function player(name: string, tribe: Tribe, fields: number, main: number, wall: number, army: number[]) {
  const r = await registerPlayer(db, { username: name, password: name === 'demo' ? 'demo12345' : `${name.toLowerCase()}-pass-123`, tribe }, clock.now());
  for (let s = 1; s <= 18; s++) db.update(slots).set({ level: Math.max(1, fields + ((s * 7) % 3) - 1) }).where(and(eq(slots.villageId, r.villageId), eq(slots.slot, s))).run();
  setSlot(r.villageId, 26, 'main', main);
  setSlot(r.villageId, 19, 'warehouse', Math.min(20, fields + 2));
  setSlot(r.villageId, 20, 'granary', Math.min(20, fields + 1));
  setSlot(r.villageId, 22, 'barracks', Math.max(1, fields - 1));
  setSlot(r.villageId, 39, 'rally', Math.max(1, fields - 2));
  setSlot(r.villageId, 28, 'embassy', 10);
  if (wall > 0) setSlot(r.villageId, 40, tribe === 'romans' ? 'citywall' : tribe === 'teutons' ? 'earthwall' : 'palisade', wall);
  setTroopsAt(db, r.villageId, r.villageId, units(army));
  db.update(villages).set({ wood: 900 * fields, clay: 900 * fields, iron: 800 * fields, crop: 700 * fields, resAt: clock.now() }).where(eq(villages.id, r.villageId)).run();
  db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, r.userId)).run();
  refreshPopulation(db, r.villageId);
  return r;
}

// ---- the demo capital ----
const demo = await player('demo', 'romans', 10, 20, 20, []);
db.update(users).set({ role: 'player', goldClub: true }).where(eq(users.id, demo.userId)).run();
const V = demo.villageId;
db.update(villages).set({ name: 'Aquileia', isCapital: true, research: '[1,1,1,1,1,1,1,1,1,1]', blacksmith: '[10,6,12,0,10,4,0,0,0,0]', armoury: '[8,10,6,0,4,6,0,0,0,0]' }).where(eq(villages.id, V)).run();
for (const [slot, b, lvl] of [
  [19, 'warehouse', 20], [20, 'granary', 20], [21, 'stable', 20], [22, 'barracks', 20], [23, 'academy', 20], [24, 'cranny', 10],
  [25, 'workshop', 15], [27, 'blacksmith', 15], [28, 'embassy', 12], [29, 'armoury', 15], [30, 'heromansion', 10], [31, 'market', 20],
  [32, 'palace', 15], [33, 'townhall', 10], [34, 'treasury', 10], [35, 'tradeoffice', 10], [36, 'stonemason', 10], [37, 'tournament', 10],
  [38, 'horsetrough', 10], [39, 'rally', 20],
] as const) setSlot(V, slot, b, lvl);
setTroopsAt(db, V, V, units([1400, 700, 1600, 140, 900, 320, 60, 40, 3, 0]));
rich(V);
refreshPopulation(db, V);
grantCredits(db, demo.userId, 4200, 'Demo Gold', `stage:${demo.userId}`, clock.now());
trainHero(db, demo.userId, V, 4, clock.now()); // from an Equites Imperatoris

// ---- neighbours ----
const names: [string, Tribe][] = [
  ['Brennus', 'gauls'], ['Arminius', 'teutons'], ['Boudica', 'gauls'], ['Ragnar', 'teutons'], ['Cassius', 'romans'], ['Ambiorix', 'gauls'],
  ['Sigurd', 'teutons'], ['Livia', 'romans'], ['Orgetorix', 'gauls'], ['Freya', 'teutons'], ['Marcus', 'romans'], ['Vercingetorix', 'gauls'],
  ['Alaric', 'teutons'], ['Octavia', 'romans'], ['Dumnorix', 'gauls'], ['Gunnar', 'teutons'], ['Flavius', 'romans'], ['Cartimandua', 'gauls'],
  ['Hrolf', 'teutons'], ['Aurelia', 'romans'], ['Comm', 'gauls'], ['Theodoric', 'teutons'], ['Severus', 'romans'], ['Epona', 'gauls'],
  ['Ivar', 'teutons'], ['Lucilla', 'romans'], ['Cingeto', 'gauls'], ['Odoacer', 'teutons'], ['Quintus', 'romans'], ['Maelgwn', 'gauls'],
  ['Halfdan', 'teutons'], ['Valeria', 'romans'], ['Bodvoc', 'gauls'], ['Ulfr', 'teutons'], ['Titus', 'romans'], ['Rhiannon', 'gauls'],
  ['Gisela', 'teutons'], ['Drusus', 'romans'], ['Tasciovan', 'gauls'], ['Wulfric', 'teutons'], ['Claudia', 'romans'], ['Segovax', 'gauls'],
  ['Eirik', 'teutons'], ['Galba', 'romans'], ['Nantos', 'gauls'], ['Brunhild', 'teutons'], ['Petronius', 'romans'], ['Ariovist', 'gauls'],
];
const others: { name: string; tribe: Tribe; userId: number; villageId: number }[] = [];
for (const [i, [name, tribe]] of names.entries()) {
  const fields = 2 + (i * 5) % 8;
  const army = tribe === 'romans' ? [20 + i * 6, 15 + i * 4, 0, 4] : tribe === 'teutons' ? [40 + i * 8, 10 + i * 3, 0, 4] : [25 + i * 5, 10 + i * 2, 4];
  const r = await player(name, tribe, fields, 3 + (i % 12), i % 3 === 0 ? 5 + (i % 10) : 0, army);
  others.push({ name, tribe, ...r });
}
const byName = (n: string) => others.find((o) => o.name === n)!;

// ---- alliances: demo leads LEG, confederacy with SPQR-ish neighbours, a NAP, a war ----
function alliance(leader: string, name: string, tag: string, members: string[]) {
  const lead = leader === 'demo' ? demo : byName(leader);
  grantCredits(db, lead.userId, 1000, 'Demo Gold', `stage:ally:${lead.userId}`, clock.now());
  const a = createAlliance(db, lead.userId, name, tag, clock.now());
  db.update(alliances).set({ description: 'Hold the river, feed the legions.' }).where(eq(alliances.id, a.id)).run();
  for (const m of members) {
    invitePlayer(db, lead.userId, m, clock.now());
    acceptInvite(db, byName(m).userId, a.id, clock.now());
  }
  return a;
}
const leg = alliance('demo', 'Legio Aquila', 'LEG', ['Livia', 'Marcus', 'Octavia', 'Flavius', 'Aurelia', 'Severus', 'Titus']);
const nor = alliance('Ragnar', 'Northmen', 'NORD', ['Sigurd', 'Freya', 'Alaric', 'Gunnar', 'Hrolf', 'Ivar', 'Halfdan', 'Ulfr', 'Eirik']);
const arv = alliance('Vercingetorix', 'Arverni', 'ARV', ['Brennus', 'Boudica', 'Ambiorix', 'Orgetorix', 'Dumnorix', 'Epona', 'Cingeto']);
const cohors = alliance('Claudia', 'Cohors II', 'COH', ['Drusus', 'Galba', 'Petronius', 'Lucilla', 'Valeria']);
db.insert(allianceDiplomacy).values([
  { fromId: leg.id, toId: cohors.id, kind: 'confed', status: 'active', createdAt: clock.now() },
  { fromId: leg.id, toId: arv.id, kind: 'nap', status: 'active', createdAt: clock.now() },
  { fromId: nor.id, toId: leg.id, kind: 'war', status: 'active', createdAt: clock.now() },
]).run();

// ---- a week and a half of fighting ----
const hours = (n: number) => n * HOUR;
function send(fromUser: number, fromVillage: number, to: string, kind: 'attack' | 'raid' | 'scout', u: number[], extra: { hero?: boolean; catapultTarget?: string } = {}) {
  const t = db.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, byName(to).villageId)).get()!;
  try {
    sendTroops(db, fromUser, fromVillage, { x: t.x, y: t.y, kind, units: units(u), ...extra }, clock.now());
  } catch (e) {
    console.log('skip send', to, (e as Error).message);
  }
}
processWeek(db, clock.now());
const teutons = others.filter((o) => o.tribe === 'teutons');
for (let day = 0; day < 7; day++) {
  rich(V);
  // demo farms the Northmen and Gauls, some clean, some costly
  const victims = ['Ragnar', 'Sigurd', 'Gunnar', 'Ivar', 'Ulfr', 'Hrolf', 'Brunhild', 'Wulfric', 'Gisela', 'Odoacer'];
  send(demo.userId, V, victims[day % victims.length]!, 'raid', [0, 0, 0, 0, 120 + day * 10, 0], { hero: day % 2 === 0 });
  send(demo.userId, V, victims[(day + 3) % victims.length]!, 'raid', [200, 0, 0, 0, 0, 0]);
  if (day % 3 === 1) send(demo.userId, V, victims[(day + 5) % victims.length]!, 'attack', [300, 0, 200, 0, 0, 40, 8, 6], { catapultTarget: 'warehouse' });
  if (day % 4 === 2) send(demo.userId, V, victims[(day + 1) % victims.length]!, 'scout', [0, 0, 0, 20]);
  // the Northmen hit back
  for (const [k, o] of teutons.entries()) {
    if ((k + day) % 4 !== 0) continue;
    setTroopsAt(db, o.villageId, o.villageId, units([300 + day * 40, 60, 0, 10, 0, 40]));
    send(o.userId, o.villageId, ['Livia', 'Marcus', 'Octavia', 'Brennus', 'Boudica', 'Epona'][(k + day) % 6]!, 'raid', [200 + day * 20, 0, 0, 0, 0, 30]);
  }
  // and the Gauls skirmish
  for (const [k, o] of others.filter((x) => x.tribe === 'gauls').entries()) {
    if ((k + day) % 5 !== 0) continue;
    setTroopsAt(db, o.villageId, o.villageId, units([200, 0, 0, 0, 120 + day * 10]));
    send(o.userId, o.villageId, teutons[(k + day) % teutons.length]!.name, 'raid', [100, 0, 0, 0, 80]);
  }
  pass(hours(11));
  // one costly loss for the demo: a careless raid into a stacked village
  if (day === 5) {
    setTroopsAt(db, byName('Gunnar').villageId, byName('Gunnar').villageId, units([600, 900, 0, 0, 0, 0]));
    send(demo.userId, V, 'Gunnar', 'raid', [40, 0, 0, 0, 0, 0]);
  }
  pass(hours(13));
}
// skill points: some spent, 5 left so the Info box shows them
const h = db.select().from(heroes).where(eq(heroes.userId, demo.userId)).get()!;
db.update(heroes).set({ name: 'Gaius', level: Math.max(h.level, 23), xp: Math.max(h.xp, 13_150), strength: 45, defPoints: 10, offBonus: 25, defBonus: 10, regen: 25, health: 82 }).where(eq(heroes.id, h.id)).run();

// ---- endgame and markets ----
releaseArtifacts(db, clock.now());
releaseWonders(db, clock.now());
for (const [n, goods, price] of [['Livia', [2000, 2000, 0, 0], 90], ['Freya', [0, 0, 5000, 0], 110], ['Brennus', [0, 0, 0, 8000], 75], ['Claudia', [3000, 1000, 1000, 0], 95]] as const) {
  const o = byName(n);
  rich(o.villageId);
  setSlot(o.villageId, 31, 'market', 10);
  try {
    listResources(db, o.userId, o.villageId, { wood: goods[0], clay: goods[1], iron: goods[2], crop: goods[3] }, price, clock.now());
  } catch (e) {
    console.log('skip listing', n, (e as Error).message);
  }
}
for (const [n, u, price] of [['Marcus', [200, 0, 150], 240], ['Octavia', [0, 0, 0, 0, 80], 300], ['Severus', [0, 300], 180]] as const) {
  const o = byName(n);
  setTroopsAt(db, o.villageId, o.villageId, units([...u]));
  try {
    listTroops(db, o.userId, o.villageId, units([...u]), price, clock.now());
  } catch (e) {
    console.log('skip troop listing', n, (e as Error).message);
  }
}
pass(hours(70));

// ---- live automation the screenshots show ----
clock.reset();
rich(V);
setTroopsAt(db, V, V, units([1400, 700, 1600, 140, 900, 320, 60, 40, 3, 0]));
saveRaider(db, demo.userId, V, {
  radius: 12, minRes: 300, maxAnimals: 40, allowed: defaultAllowed('romans'), reserve: units([400, 700, 0, 0, 0, 0]),
  sizeMode: 'auto', fixed: emptyUnits(), maxPerRaid: 0, intervalMin: 15, maxRaids: 8,
}, Date.now());
setRaiderEnabled(db, demo.userId, V, true, 'romans', Date.now());
try {
  runRaiderNow(db, demo.userId, V, 'romans', Date.now());
} catch (e) {
  console.log('raider:', (e as Error).message);
}
startAutoTrain(db, demo.userId, V, 6, { barracks_0: 40, barracks_2: 35, stable_4: 25 }, Date.now());
db.update(users).set({ protectedUntil: 0, lastSeenAt: Date.now(), tasksHidden: true }).where(eq(users.id, demo.userId)).run();
for (const o of others) refreshPopulation(db, o.villageId);
refreshPopulation(db, V);
// an incoming Northmen attack for the Info box and the rally point (lands in ~3 hours)
const ragnar = byName('Ragnar');
setTroopsAt(db, ragnar.villageId, ragnar.villageId, units([900, 200, 0, 20, 0, 150, 30, 10]));
const home = db.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, V)).get()!;
const inc = sendTroops(db, ragnar.userId, ragnar.villageId, { x: home.x, y: home.y, kind: 'attack', units: units([900, 200, 0, 0, 0, 150, 30, 10]), catapultTarget: 'warehouse' }, Date.now());
db.update(movements).set({ arriveAt: Date.now() + 3 * HOUR + 17 * 60_000 }).where(eq(movements.id, inc.id)).run();
console.log('Staged. Log in as demo / demo12345.');
