import { describe, expect, it } from 'vitest';
import { reportView } from '../src/web/views/reports.js';
import type { BattleReportData } from '../src/game/engine/reports.js';
import { emptyUnits } from '../src/game/rules/units.js';

const side = (userId: number, name: string) => ({ userId, username: name, villageId: userId, villageName: `${name} village`, x: 1, y: 1, tribe: 'romans' as const, units: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0], losses: emptyUnits() });

describe('battle report heroes', () => {
  it('shows each hero in its own side\'s troop table, with casualty and health', () => {
    const data: BattleReportData = {
      type: 'battle', mode: 'attack', attacker: side(1, 'Att'), defenders: [side(2, 'Def'), side(3, 'Ally')], attackerWon: true, defendersHidden: false,
      loot: { wood: 0, clay: 0, iron: 0, crop: 0 }, capacity: 0, attackPower: 10, defensePower: 5,
      heroes: [
        { name: 'Brutus', side: 'attacker', health: 80, died: false, xp: 12, userId: 1 },
        { name: 'Ajax', side: 'defender', health: 0, died: true, xp: 4, userId: 3 },
      ],
    };
    const out = String(reportView({ id: 1, title: 't', createdAt: 0, data, viewerId: 1, csrf: 'x' }));
    const blocks = out.split('<table class="report">');
    expect(blocks[1]).toContain('Brutus');
    expect(blocks[1]).toContain('health 80%');
    expect(blocks[2]).not.toContain('Ajax');
    expect(blocks[3]).toContain('Ajax');
    expect(blocks[3]).toContain('fell in battle');
  });
});
