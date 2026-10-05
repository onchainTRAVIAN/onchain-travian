import { eq } from 'drizzle-orm';
import type { Q } from '../../db/index.js';
import { troops, villages } from '../../db/schema.js';
import { WALL_SLOT } from '../rules/buildings.js';
import type { ArmyGroup } from '../rules/battle.js';
import { natarStrength } from '../rules/natars.js';
import { addUnits, type TribeId, type UnitCounts } from '../rules/units.js';
import { prisonersOf, trapCapacityOf } from '../actions/traps.js';
import { heroAtHome } from './hero.js';
import { villageInfo } from './movement.js';
import { catchUp, levelOf, parseUnits } from './state.js';

export interface DefenseArmy {
  tribe: TribeId;
  units: UnitCounts;
  levels: number[];
  owner: string;
}
/** Everything that defends a village right now (for the simulator and Natar attack sizing). */
export interface DefenseSnapshot {
  villageId: number;
  name: string;
  tribe: TribeId;
  /** The owner's own troops first, then other players' reinforcements merged by tribe. */
  armies: DefenseArmy[];
  hero: { slot: number; points: number; bonus: number } | null;
  wall: number;
  residence: number;
  stonemason: number;
  freeTraps: number;
  villagePop: number;
  playerPop: number;
  strength: number;
}

export function defenseSnapshot(q: Q, villageId: number, now: number): DefenseSnapshot | undefined {
  const state = catchUp(q, villageId, now);
  const info = villageInfo(q, villageId);
  if (!state || !info) return undefined;
  const own: DefenseArmy = { tribe: info.tribe, units: parseUnits(null), levels: info.defenseUpgrades, owner: info.username };
  const others = new Map<TribeId, DefenseArmy>();
  for (const row of q.select().from(troops).where(eq(troops.villageId, villageId)).all()) {
    const units = parseUnits(row.units);
    if (row.ownerVillageId === villageId) {
      own.units = addUnits(own.units, units);
      continue;
    }
    const o = villageInfo(q, row.ownerVillageId);
    const tribe = o?.tribe ?? 'romans';
    const cur = others.get(tribe);
    if (cur) cur.units = addUnits(cur.units, units);
    else others.set(tribe, { tribe, units, levels: o?.defenseUpgrades ?? [], owner: o?.username ?? '?' });
  }
  const h = heroAtHome(q, info.userId, villageId, now);
  const wall = state.slots.find((s) => s.slot === WALL_SLOT)?.level ?? 0;
  const residence = Math.max(levelOf(state, 'residence'), levelOf(state, 'palace'));
  const playerPop =
    info.userId === null
      ? state.village.pop
      : q.select({ pop: villages.pop }).from(villages).where(eq(villages.userId, info.userId)).all().reduce((s, v) => s + v.pop, 0);
  const armies = [own, ...others.values()];
  const groups: ArmyGroup[] = armies.map((a) => ({ tribe: a.tribe, units: a.units, upgrades: a.levels }));
  const held = prisonersOf(state.village).reduce((s, r) => s + r.units.reduce((a, b) => a + b, 0), 0);
  return {
    villageId,
    name: info.name,
    tribe: info.tribe,
    armies,
    hero: h ? { slot: h.unitSlot, points: h.defPoints, bonus: h.defBonus } : null,
    wall,
    residence,
    stonemason: levelOf(state, 'stonemason'),
    freeTraps: info.tribe === 'gauls' ? Math.max(0, Math.min(trapCapacityOf(state), state.village.traps) - held) : 0,
    villagePop: state.village.pop,
    playerPop,
    strength: natarStrength({ groups, tribe: info.tribe, wall, residence, playerPop }),
  };
}
