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

export function addReport(q: Q, userId: number | null, kind: ReportKind, title: string, data: ReportData, now: number): void {
  if (userId === null) return;
  q.insert(reports).values({ userId, kind, title, data: JSON.stringify(data), createdAt: now }).run();
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
