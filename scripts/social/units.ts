/**
 * Unit stats for the post line-ups (scripts/social/composites.py reads them via UNITS_JSON).
 *
 *   npx tsx scripts/social/units.ts <out.json>
 */
import { writeFileSync } from 'node:fs';
import { TRIBES } from '../../src/game/rules/units.js';

const out: Record<string, unknown[]> = {};
for (const [id, t] of Object.entries(TRIBES)) {
  out[id] = t.units.map((u) => ({ name: u.name, type: u.type, attack: u.attack, defInf: u.defInf, defCav: u.defCav, speed: u.speed, carry: u.carry, upkeep: u.upkeep }));
}
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1));
