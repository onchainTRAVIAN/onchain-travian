import { and, asc, desc, eq, gt, isNull, or } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { reports } from '../../db/schema.js';
import type { Resources } from '../rules/resources.js';
import type { TribeId, UnitCounts } from '../rules/units.js';

export interface ReportSide {
  userId: number | null;
  username: string;
  villageId: number;
  villageName: string;
  x: number;
  y: number;
  tribe: TribeId;
  units: UnitCounts;
  losses: UnitCounts;
}

export interface BattleReportData {
  type: 'battle';
  mode: 'attack' | 'raid' | 'scout';
  attacker: ReportSide;
  defenders: ReportSide[];
  attackerWon: boolean;
  /** True when the attacker saw nothing (all their troops died). */
  defendersHidden: boolean;
  loot: Resources;
  capacity: number;
  attackPower: number;
  defensePower: number;
  wall?: { from: number; to: number };
  building?: { name: string; from: number; to: number };
  /** Heroes that took part. */
  heroes?: { name: string; side: 'attacker' | 'defender'; health: number; died: boolean; xp: number; userId?: number | null }[];
  loyalty?: { from: number; to: number };
  conquered?: boolean;
  oasis?: { x: number; y: number; captured: boolean };
  /** The scouted/attacked tile when no defender side is listed (scouting). */
  target?: { x: number; y: number };
  notes?: string[];
  scout?: {
    success: boolean;
    resources?: Resources;
    /** Armies seen in the village; `hero` = a hero stands with that owner's troops. */
    troops?: { tribe: TribeId; units: UnitCounts; hero?: boolean; owner?: string }[];
    wallLevel?: number;
    /** Per resource (older reports: one number for all). */
    crannyHides?: number | Resources;
  };
}

export interface ReinforceReportData {
  type: 'reinforce';
  from: Omit<ReportSide, 'losses'>;
  to: { userId: number | null; username: string; villageId: number; villageName: string; x: number; y: number };
  units: UnitCounts;
  /** The hero went along. */
  hero?: boolean;
}

export interface ReturnReportData {
  type: 'return';
  villageName: string;
  units: UnitCounts;
  tribe: TribeId;
  loot: Resources;
}

export interface TradeReportData {
  type: 'trade';
  fromName: string;
  fromX: number;
  fromY: number;
  toName: string;
  toX: number;
  toY: number;
  goods: Resources;
}

export interface SettleReportData {
  type: 'settle';
  success: boolean;
  x: number;
  y: number;
  villageName?: string;
  reason?: string;
}

export type ReportData = BattleReportData | ReinforceReportData | ReturnReportData | TradeReportData | SettleReportData;

export type ReportKind =
  | 'attack_won'
  | 'attack_lost'
  | 'defense_won'
  | 'defense_lost'
  | 'scout'
  | 'reinforce'
  | 'return'
  | 'trade'
  | 'settle'
  | 'starvation';

type XY = { x: number; y: number };

/** The sending village and the target tile of a report (either may be unknown). */
export function reportPlaces(d: ReportData | null): { from: XY | null; to: XY | null } {
  if (!d) return { from: null, to: null };
  switch (d.type) {
    case 'battle': {
      const def = d.defenders[0];
      return { from: { x: d.attacker.x, y: d.attacker.y }, to: d.oasis ?? d.target ?? (def ? { x: def.x, y: def.y } : null) };
    }
    case 'reinforce':
      return { from: { x: d.from.x, y: d.from.y }, to: { x: d.to.x, y: d.to.y } };
    case 'trade':
      return { from: { x: d.fromX, y: d.fromY }, to: { x: d.toX, y: d.toY } };
    case 'settle':
      return { from: null, to: { x: d.x, y: d.y } };
    default:
      return { from: null, to: null };
  }
}

function placeCols(d: ReportData | null) {
  const p = reportPlaces(d);
  return { fromX: p.from?.x ?? null, fromY: p.from?.y ?? null, toX: p.to?.x ?? null, toY: p.to?.y ?? null };
}

export function addReport(q: Q, userId: number | null, kind: ReportKind, title: string, data: ReportData, now: number): void {
  if (userId === null) return;
  const json = JSON.stringify(data);
  q.insert(reports).values({ userId, kind, title, data: json, outcome: battleOutcome(json, userId) ?? '-', ...placeCols(data), createdAt: now }).run();
}

/** Fill the place columns of reports written before they existed (once, in id order, a batch at a time). */
export function backfillReportPlaces(q: Q, afterId: number, batch = 2000): number {
  const rows = q.select({ id: reports.id, data: reports.data }).from(reports).where(gt(reports.id, afterId)).orderBy(asc(reports.id)).limit(batch).all();
  for (const r of rows) q.update(reports).set(placeCols(parseReport(r.data))).where(eq(reports.id, r.id)).run();
  return rows.length ? (rows[rows.length - 1]?.id ?? afterId) : -1;
}

/** The viewer's most recent reports about a tile: as sender, target, or attacked from there. */
export function reportsAt(q: Q, userId: number, x: number, y: number, limit = 10) {
  return q
    .select({ id: reports.id, kind: reports.kind, title: reports.title, isRead: reports.isRead, outcome: reports.outcome, data: reports.data, createdAt: reports.createdAt })
    .from(reports)
    .where(and(eq(reports.userId, userId), or(and(eq(reports.toX, x), eq(reports.toY, y)), and(eq(reports.fromX, x), eq(reports.fromY, y)))))
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(limit)
    .all();
}

/** Fill in `outcome` for reports written before it existed (a batch at a time). */
export function backfillReportOutcomes(q: Q, batch = 2000): number {
  const rows = q.select({ id: reports.id, userId: reports.userId, data: reports.data }).from(reports).where(isNull(reports.outcome)).limit(batch).all();
  for (const r of rows) q.update(reports).set({ outcome: battleOutcome(r.data, r.userId) ?? '-' }).where(eq(reports.id, r.id)).run();
  return rows.length;
}

export function parseReport(json: string): ReportData | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed as ReportData;
  } catch {
    // ignore
  }
  return null;
}

/**
 * How a battle went for the viewer's own troops: 'none' lost, 'some' lost, or 'all' lost
 * (null when the report isn't a battle or the viewer had no troops in it).
 */
export function battleOutcome(json: string, viewerId: number): 'none' | 'some' | 'all' | null {
  let d: ReportData | null = null;
  try {
    d = JSON.parse(json) as ReportData;
  } catch {
    return null;
  }
  if (!d || d.type !== 'battle') return null;
  const sides = d.attacker.userId === viewerId ? [d.attacker] : d.defenders.filter((s) => s.userId === viewerId);
  const sent = sides.reduce((a, s) => a + s.units.reduce((x, y) => x + y, 0), 0);
  const lost = sides.reduce((a, s) => a + s.losses.reduce((x, y) => x + y, 0), 0);
  const heroDied = (d.heroes ?? []).some((h) => h.userId === viewerId && h.died);
  if (sent === 0) return heroDied ? 'all' : null;
  if (lost <= 0 && !heroDied) return 'none';
  return lost >= sent ? 'all' : 'some';
}
