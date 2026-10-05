import { beforeAll, describe, expect, it } from 'vitest';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { reports, slots, users, villages } from '../src/db/schema.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { processDue } from '../src/game/engine/events.js';
import { setTroopsAt } from '../src/game/engine/state.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { trainHero } from '../src/game/actions/hero.js';
import { sendTroops } from '../src/game/actions/troops.js';
import type { BattleReportData } from '../src/game/engine/reports.js';
import { emptyUnits } from '../src/game/rules/units.js';

type P = { userId: number; villageId: number };
let spy: P;
let host: P;

function setSlot(villageId: number, slot: number, building: string, level: number) {
  db.update(slots).set({ building, level }).where(and(eq(slots.villageId, villageId), eq(slots.slot, slot))).run();
}

beforeAll(async () => {
  clock.freeze(Date.UTC(2026, 10, 4));
  ensureWorld(db);
  spy = await registerPlayer(db, { username: 'Spyer', password: 'password123', tribe: 'gauls' }, clock.now());
  host = await registerPlayer(db, { username: 'Heroic', password: 'password123', tribe: 'romans' }, clock.now());
  for (const p of [spy, host]) {
    db.update(users).set({ protectedUntil: 0 }).where(eq(users.id, p.userId)).run();
    db.update(villages).set({ wood: 1e5, clay: 1e5, iron: 1e5, crop: 1e5, resAt: clock.now() }).where(eq(villages.id, p.villageId)).run();
    setSlot(p.villageId, 39, 'rally', 10);
  }
  setSlot(host.villageId, 30, 'heromansion', 1);
  const one = emptyUnits();
  one[0] = 3;
  setTroopsAt(db, host.villageId, host.villageId, one);
  const h = trainHero(db, host.userId, host.villageId, 0, clock.now());
  clock.advance((h.reviveAt ?? 0) - clock.now() + 1);
  processDue(db, clock.now());
});

describe('scouting reports', () => {
  it('show the hero standing at home with its troops', () => {
    const scouts = emptyUnits();
    scouts[2] = 10; // Pathfinders
    setTroopsAt(db, spy.villageId, spy.villageId, scouts);
    const v = db.select().from(villages).where(eq(villages.id, host.villageId)).get()!;
    const mv = sendTroops(db, spy.userId, spy.villageId, { x: v.x, y: v.y, kind: 'scout', units: scouts }, clock.now());
    clock.advance(mv.arriveAt - clock.now() + 1);
    processDue(db, clock.now());
    const rep = db.select().from(reports).where(and(eq(reports.userId, spy.userId), eq(reports.kind, 'scout'))).orderBy(desc(reports.id)).get()!;
    const data = JSON.parse(rep.data) as BattleReportData;
    expect(data.scout?.success).toBe(true);
    const own = data.scout?.troops?.find((t) => t.owner === 'Heroic');
    expect(own?.hero).toBe(true);
  });
});
