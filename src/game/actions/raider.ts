import { and, eq, gte, inArray, isNull } from 'drizzle-orm';
import type { DB, Q } from '../../db/index.js';
import { farmBlocks, movements, oasisRaiders, reports, tiles, users, villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { distance, OASIS_LABEL, type OasisType } from '../rules/map.js';
import { sumRes, type Resources } from '../rules/resources.js';
import { TRIBES, UNIT_SLOTS, emptyUnits, totalUnits, type TribeId, type UnitCounts } from '../rules/units.js';
import { GameError, assertGame } from '../errors.js';
import { getModifiers } from '../modifiers.js';
import { oasisAnimals, oasisStock } from '../engine/oasis.js';
import { parseUnits, troopsAt } from '../engine/state.js';
import { ownedVillage } from './build.js';
import { hasGoldClub, FARM_RADIUS_MAX } from './goldclub.js';
import { sendTroops } from './troops.js';

export const RAIDER_INTERVALS = [5, 10, 15, 30, 60] as const;
const LOG_KEEP = 20;
/** Attack must beat the animals' defence by this much before the raider risks a guarded oasis. */
const ANIMAL_MARGIN = 1.5;

export type RaiderRow = typeof oasisRaiders.$inferSelect;
export interface RaiderSettings {
  radius: number;
  minRes: number;
  maxAnimals: number;
  allowed: boolean[];
  reserve: UnitCounts;
  sizeMode: 'auto' | 'max' | 'fixed';
  fixed: UnitCounts;
  maxPerRaid: number;
  intervalMin: number;
  maxRaids: number;
}
export interface RaiderLogEntry {
  at: number;
  sent: number;
  troops: number;
  skipped: Record<string, number>;
  note?: string;
}

/** Unit types a raider uses by default: infantry and cavalry that can carry something. */
export function defaultAllowed(tribe: TribeId): boolean[] {
  return TRIBES[tribe].units.map((u) => (u.type === 'inf' || u.type === 'cav') && u.carry > 0);
}

/** The village's raider, or unsaved defaults. */
export function raiderFor(q: Q, userId: number, villageId: number, tribe: TribeId): RaiderRow {
  const row = q.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
  if (row && row.userId === userId) return row;
  return {
    id: 0, userId, villageId, enabled: false, radius: 10, minRes: 1000, maxAnimals: 0,
    allowed: JSON.stringify(defaultAllowed(tribe)), reserve: JSON.stringify(emptyUnits()), sizeMode: 'auto',
    fixed: JSON.stringify(emptyUnits()), maxPerRaid: 0, intervalMin: 10, maxRaids: 20, lastRunAt: null, dayKey: 0, dayRaids: 0, log: '[]',
  };
}

export function parseAllowed(json: string): boolean[] {
  try {
    const a = JSON.parse(json) as unknown;
    if (Array.isArray(a)) return Array.from({ length: UNIT_SLOTS }, (_, i) => a[i] === true);
  } catch {
    /* fall through */
  }
  return Array.from({ length: UNIT_SLOTS }, () => false);
}

export function raiderLog(r: Pick<RaiderRow, 'log'>): RaiderLogEntry[] {
  try {
    const l = JSON.parse(r.log) as unknown;
    return Array.isArray(l) ? (l as RaiderLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRaider(db: DB, userId: number, villageId: number, s: RaiderSettings, now: number): void {
  db.transaction((tx) => {
    assertGame(hasGoldClub(tx, userId), 'The Oasis Raider needs the Gold Club (Plus & Gold)');
    ownedVillage(tx, userId, villageId);
    const tribe = userTribe(tx, userId);
    assertGame(Number.isInteger(s.radius) && s.radius >= 1 && s.radius <= FARM_RADIUS_MAX, `Range must be 1 to ${FARM_RADIUS_MAX} fields`);
    assertGame((RAIDER_INTERVALS as readonly number[]).includes(s.intervalMin), 'Choose how often it checks');
    assertGame(s.maxRaids >= 1 && s.maxRaids <= 100, 'Raids per check: 1 to 100');
    // Only unit types that can carry loot (no scouts, siege, chiefs or settlers).
    const usable = defaultAllowed(tribe);
    const allowed = s.allowed.map((a, i) => a && usable[i] === true);
    assertGame(allowed.some(Boolean), 'Tick at least one troop type the raider may send');
    const fixed = s.fixed.map((n, i) => (allowed[i] ? Math.max(0, Math.floor(n)) : 0));
    if (s.sizeMode === 'fixed') assertGame(totalUnits(fixed) > 0, 'Enter the troops for each raid');
    const values = {
      radius: s.radius,
      minRes: Math.max(0, Math.floor(s.minRes)),
      maxAnimals: Math.max(0, Math.floor(s.maxAnimals)),
      allowed: JSON.stringify(allowed),
      reserve: JSON.stringify(s.reserve.map((n) => Math.max(0, Math.floor(n)))),
      sizeMode: s.sizeMode,
      fixed: JSON.stringify(fixed),
      maxPerRaid: Math.max(0, Math.floor(s.maxPerRaid)),
      intervalMin: s.intervalMin,
      maxRaids: Math.floor(s.maxRaids),
    };
    const row = tx.select({ id: oasisRaiders.id }).from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
    if (row) tx.update(oasisRaiders).set(values).where(eq(oasisRaiders.id, row.id)).run();
    else tx.insert(oasisRaiders).values({ userId, villageId, ...values, lastRunAt: null, dayKey: Math.floor(now / 86_400_000) }).run();
  });
}

export function setRaiderEnabled(db: DB, userId: number, villageId: number, on: boolean, tribe: TribeId, now: number): void {
  assertGame(hasGoldClub(db, userId), 'The Oasis Raider needs the Gold Club (Plus & Gold)');
  ownedVillage(db, userId, villageId);
  let row = db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
  if (!row) {
    const d = raiderFor(db, userId, villageId, tribe);
    saveRaider(db, userId, villageId, settingsOf(d), now);
    row = db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
  }
  // Turning it on checks right away on the next tick.
  if (row) db.update(oasisRaiders).set({ enabled: on, lastRunAt: on ? null : row.lastRunAt }).where(eq(oasisRaiders.id, row.id)).run();
}

export function settingsOf(r: RaiderRow): RaiderSettings {
  return {
    radius: r.radius, minRes: r.minRes, maxAnimals: r.maxAnimals, allowed: parseAllowed(r.allowed), reserve: parseUnits(r.reserve),
    sizeMode: r.sizeMode, fixed: parseUnits(r.fixed), maxPerRaid: r.maxPerRaid, intervalMin: r.intervalMin, maxRaids: r.maxRaids,
  };
}

export function toggleBlock(db: DB, userId: number, x: number, y: number): boolean {
  const b = db.select().from(farmBlocks).where(and(eq(farmBlocks.userId, userId), eq(farmBlocks.x, x), eq(farmBlocks.y, y))).get();
  if (b) {
    db.delete(farmBlocks).where(eq(farmBlocks.id, b.id)).run();
    return false;
  }
  const n = db.select({ id: farmBlocks.id }).from(farmBlocks).where(eq(farmBlocks.userId, userId)).all().length;
  assertGame(n < 200, 'At most 200 blocked oases');
  db.insert(farmBlocks).values({ userId, x, y }).run();
  return true;
}

/* ---------------- Planning ---------------- */

export type TargetStatus = 'ready' | 'busy' | 'poor' | 'guarded' | 'blocked' | 'notroops';
export interface OasisTarget {
  x: number;
  y: number;
  name: string;
  /** Oasis bonus, e.g. "+25% iron, +25% crop". */
  bonus: string;
  distance: number;
  loot: number;
  animals: number;
  status: TargetStatus;
  /** Troops planned for this raid (status ready only). */
  units?: UnitCounts;
  carry?: number;
}
export interface RaidPlan {
  targets: OasisTarget[];
  raids: OasisTarget[];
  available: UnitCounts;
}

/** Animal defence against a mixed attack (worst of infantry/cavalry defence). */
function animalDefence(animals: UnitCounts): number {
  return TRIBES.nature.units.reduce((s, u, i) => s + (animals[i] ?? 0) * Math.max(u.defInf, u.defCav), 0);
}

/**
 * What the raider would do now: every free oasis in range with its status, and the raids it would
 * send (richest per distance first), each sized from the troops at home minus the reserve.
 */
export function planOasisRaids(q: Q, r: RaiderRow, tribe: TribeId, now: number): RaidPlan {
  const home = q.select({ x: villages.x, y: villages.y }).from(villages).where(eq(villages.id, r.villageId)).get();
  if (!home) return { targets: [], raids: [], available: emptyUnits() };
  const s = settingsOf(r);
  const units = TRIBES[tribe].units;
  const carryMult = getModifiers(q, r.userId, now).troopCarry;
  const atHome = troopsAt(q, r.villageId, r.villageId);
  const pool = atHome.map((n, i) => (s.allowed[i] ? Math.max(0, n - (s.reserve[i] ?? 0)) : 0));
  const available = [...pool];
  const blocked = new Set(q.select({ x: farmBlocks.x, y: farmBlocks.y }).from(farmBlocks).where(eq(farmBlocks.userId, r.userId)).all().map((b) => `${b.x}|${b.y}`));
  const busy = new Set(
    q.select({ x: movements.toX, y: movements.toY }).from(movements)
      .where(and(eq(movements.fromVillageId, r.villageId), inArray(movements.kind, ['raid', 'attack']))).all().map((m) => `${m.x}|${m.y}`),
  );
  const R = config.MAP_RADIUS;
  const oases = q.select().from(tiles).where(and(eq(tiles.kind, 'oasis'), isNull(tiles.villageId))).all();
  const targets: OasisTarget[] = [];
  for (const t of oases) {
    const dist = distance(home.x, home.y, t.x, t.y, R);
    if (dist > s.radius) continue;
    const key = `${t.x}|${t.y}`;
    const loot = Math.floor(sumRes(oasisStock(q, t, now)));
    const animalUnits = oasisAnimals(q, t, now);
    const animals = totalUnits(animalUnits);
    const status: TargetStatus = blocked.has(key) ? 'blocked' : busy.has(key) ? 'busy' : loot < Math.max(1, s.minRes) ? 'poor' : animals > s.maxAnimals ? 'guarded' : 'ready';
    const label = OASIS_LABEL[(t.oasis ?? 'wood') as OasisType];
    targets.push({ x: t.x, y: t.y, name: label.replace(/\s*\(.*\)$/, ''), bonus: label.match(/\((.*)\)$/)?.[1] ?? '', distance: dist, loot, animals, status, ...(status === 'ready' ? { animalDef: animalDefence(animalUnits) } : {}) } as OasisTarget);
  }
  // Best loot per distance first.
  const ready = targets.filter((t) => t.status === 'ready').sort((a, b) => b.loot / Math.max(1, b.distance) - a.loot / Math.max(1, a.distance));
  // Fastest troops first so raids come back sooner.
  const order = units.map((u, i) => i).filter((i) => s.allowed[i]).sort((a, b) => (units[b]?.speed ?? 0) - (units[a]?.speed ?? 0));
  const raids: OasisTarget[] = [];
  for (const t of ready) {
    if (raids.length >= s.maxRaids) break;
    const send = emptyUnits();
    if (s.sizeMode === 'fixed') {
      if (s.fixed.some((n, i) => n > (pool[i] ?? 0))) {
        t.status = 'notroops';
        continue;
      }
      s.fixed.forEach((n, i) => (send[i] = n));
    } else {
      const needAtt = ((t as OasisTarget & { animalDef?: number }).animalDef ?? 0) * ANIMAL_MARGIN;
      // Spread: each raid gets at most a fair share of the troops still free, so many oases
      // are raided at once. Guarded oases may take more if their share can't win.
      const left = Math.min(s.maxRaids - raids.length, ready.length - ready.indexOf(t));
      const share = s.sizeMode === 'auto' ? Math.max(1, Math.ceil(pool.reduce((a, n) => a + n, 0) / Math.max(1, left))) : Infinity;
      const size = (cap: number) => {
        const out = emptyUnits();
        let carry = 0;
        let att = 0;
        let count = 0;
        for (const i of order) {
          const u = units[i];
          if (!u) continue;
          const per = u.carry * carryMult;
          const needCarry = Math.max(0, t.loot - carry);
          const needA = Math.max(0, needAtt - att);
          if (needCarry <= 0 && needA <= 0) break;
          let n = Math.max(per > 0 ? Math.ceil(needCarry / per) : 0, u.attack > 0 ? Math.ceil(needA / u.attack) : 0);
          n = Math.min(n, pool[i] ?? 0, cap - count);
          if (s.maxPerRaid > 0) n = Math.min(n, s.maxPerRaid - count);
          if (n <= 0) continue;
          out[i] = n;
          count += n;
          carry += n * per;
          att += n * u.attack;
        }
        return { out, att };
      };
      let sized = size(share);
      if (sized.att < needAtt && share !== Infinity) sized = size(Infinity);
      if (totalUnits(sized.out) === 0 || sized.att < needAtt) {
        t.status = 'notroops';
        continue;
      }
      sized.out.forEach((n, i) => (send[i] = n));
    }
    send.forEach((n, i) => (pool[i] = (pool[i] ?? 0) - n));
    t.units = send;
    t.carry = Math.floor(send.reduce((c, n, i) => c + n * (units[i]?.carry ?? 0), 0) * carryMult);
    raids.push(t);
  }
  targets.sort((a, b) => a.distance - b.distance);
  return { targets, raids, available };
}

/* ---------------- Running ---------------- */

export function runOasisRaider(db: DB, r: RaiderRow, tribe: TribeId, now: number): RaiderLogEntry {
  const plan = planOasisRaids(db, r, tribe, now);
  const skipped: Record<string, number> = {};
  for (const t of plan.targets) if (t.status !== 'ready') skipped[t.status] = (skipped[t.status] ?? 0) + 1;
  let sent = 0;
  let troopsSent = 0;
  let note: string | undefined;
  for (const raid of plan.raids) {
    try {
      sendTroops(db, r.userId, r.villageId, { x: raid.x, y: raid.y, kind: 'raid', units: raid.units ?? emptyUnits() }, now);
      sent++;
      troopsSent += totalUnits(raid.units ?? emptyUnits());
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      skipped.error = (skipped.error ?? 0) + 1;
      note = err.message;
    }
  }
  const entry: RaiderLogEntry = { at: now, sent, troops: troopsSent, skipped, ...(note ? { note } : {}) };
  const day = Math.floor(now / 86_400_000);
  const row = db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, r.villageId)).get();
  if (row) {
    db.update(oasisRaiders)
      .set({
        lastRunAt: now,
        dayKey: day,
        dayRaids: (row.dayKey === day ? row.dayRaids : 0) + sent,
        log: JSON.stringify([entry, ...raiderLog(row)].slice(0, LOG_KEEP)),
      })
      .where(eq(oasisRaiders.id, row.id))
      .run();
  }
  return entry;
}

export function runRaiderNow(db: DB, userId: number, villageId: number, tribe: TribeId, now: number): RaiderLogEntry {
  assertGame(hasGoldClub(db, userId), 'The Oasis Raider needs the Gold Club (Plus & Gold)');
  ownedVillage(db, userId, villageId);
  let row = db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
  if (!row) {
    saveRaider(db, userId, villageId, settingsOf(raiderFor(db, userId, villageId, tribe)), now);
    row = db.select().from(oasisRaiders).where(eq(oasisRaiders.villageId, villageId)).get();
  }
  assertGame(row, 'Raider not found');
  return runOasisRaider(db, row, tribe, now);
}

/** Server tick: enabled raiders whose interval has passed check again. */
export function processOasisRaiders(db: DB, now: number): number {
  let runs = 0;
  for (const r of db.select().from(oasisRaiders).where(eq(oasisRaiders.enabled, true)).all()) {
    if (r.lastRunAt !== null && now - r.lastRunAt < r.intervalMin * 60_000) continue;
    const v = db.select({ userId: villages.userId }).from(villages).where(eq(villages.id, r.villageId)).get();
    if (!v || v.userId !== r.userId || !hasGoldClub(db, r.userId)) {
      db.update(oasisRaiders).set({ enabled: false, lastRunAt: now, log: JSON.stringify([{ at: now, sent: 0, troops: 0, skipped: {}, note: 'Stopped: village lost or no Gold Club.' }, ...raiderLog(r)].slice(0, LOG_KEEP)) }).where(eq(oasisRaiders.id, r.id)).run();
      continue;
    }
    runOasisRaider(db, r, userTribe(db, r.userId), now);
    runs++;
  }
  return runs;
}

export function userTribe(q: Q, userId: number): TribeId {
  return (q.select({ t: users.tribe }).from(users).where(eq(users.id, userId)).get()?.t ?? 'romans') as TribeId;
}

/** Raids this village's raider and farm lists brought home today (from battle reports). */
export function oasisLootToday(q: Q, userId: number, villageId: number, now: number): { raids: number; loot: number } {
  const dayStart = Math.floor(now / 86_400_000) * 86_400_000;
  const rows = q
    .select({ data: reports.data })
    .from(reports)
    .where(and(eq(reports.userId, userId), gte(reports.createdAt, dayStart), inArray(reports.kind, ['attack_won', 'attack_lost'])))
    .all();
  let raids = 0;
  let loot = 0;
  for (const r of rows) {
    try {
      const d = JSON.parse(r.data) as { mode?: string; oasis?: unknown; attacker?: { villageId?: number }; loot?: Resources };
      if (d.mode !== 'raid' || !d.oasis || d.attacker?.villageId !== villageId) continue;
      raids++;
      loot += d.loot ? Math.floor(sumRes(d.loot)) : 0;
    } catch {
      /* skip */
    }
  }
  return { raids, loot };
}
