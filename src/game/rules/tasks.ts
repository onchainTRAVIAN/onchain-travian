/**
 * Beginner tasks: an ordered path through the game, each with a check, a how-to and a reward
 * (resources into the village, Gold for a few key steps). Checks read a TaskContext built from
 * the player's villages and account (src/game/actions/tasks.ts).
 */
import type { SlotRow } from '../engine/state.js';

export interface TaskContext {
  /** Every village of the player (slots with building and level). */
  villages: { id: number; name: string; isCapital: boolean; pop: number; slots: SlotRow[]; research: number[]; blacksmith: number[] }[];
  /** Soldiers the player owns in total (all villages, home and away). */
  troops: number;
  hero: { alive: boolean; level: number } | null;
  inAlliance: boolean;
  scouted: boolean;
  raidedOasis: boolean;
  sentResources: boolean;
  oases: number;
  defaultVillageName: boolean;
}

export interface TaskReward {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  gold?: number;
}

export interface TaskDef {
  id: string;
  chapter: number;
  title: string;
  /** What to do, in one or two short sentences. */
  how: string;
  /** Where to do it (filled per player by `taskLink`). */
  link: (ctx: TaskContext) => string;
  check: (ctx: TaskContext) => { done: boolean; have?: number; need?: number };
  reward: TaskReward;
  /** Game guide topic for "learn more". */
  guide?: string;
  /** Slot to highlight on the village overview / centre. */
  hint?: (ctx: TaskContext) => number | null;
}

export const TASK_CHAPTERS = ['First steps', 'Getting stronger', 'Into the world', 'Your hero', 'Growing your empire'];

const FIELD_IDS = ['woodcutter', 'claypit', 'ironmine', 'cropland'];
const r = (wood: number, clay: number, iron: number, crop: number, gold?: number): TaskReward => ({ wood, clay, iron, crop, ...(gold ? { gold } : {}) });
const capital = (c: TaskContext) => c.villages.find((v) => v.isCapital) ?? c.villages[0];
const level = (c: TaskContext, id: string) => Math.max(0, ...c.villages.flatMap((v) => v.slots.filter((s) => s.building === id).map((s) => s.level)));
const slotOf = (c: TaskContext, id: string) => capital(c)?.slots.find((s) => s.building === id)?.slot ?? null;
const emptySite = (c: TaskContext) => capital(c)?.slots.find((s) => s.slot >= 19 && s.slot <= 38 && !s.building)?.slot ?? null;
const fieldsAtLeast = (c: TaskContext, lvl: number) => {
  const f = (capital(c)?.slots ?? []).filter((s) => s.building && FIELD_IDS.includes(s.building));
  return { have: f.filter((s) => s.level >= lvl).length, need: f.length || 18 };
};
const lowestField = (c: TaskContext) => {
  const f = (capital(c)?.slots ?? []).filter((s) => s.building && FIELD_IDS.includes(s.building)).sort((a, b) => a.level - b.level || a.slot - b.slot);
  return f[0]?.slot ?? null;
};
const buildTask = (id: string, building: string, lvl: number, chapter: number, title: string, how: string, reward: TaskReward, guide?: string): TaskDef => ({
  id,
  chapter,
  title,
  how,
  link: (c) => {
    const s = slotOf(c, building) ?? emptySite(c);
    return s ? `/slot/${s}` : '/village';
  },
  check: (c) => ({ done: level(c, building) >= lvl, have: Math.min(level(c, building), lvl), need: lvl }),
  hint: (c) => slotOf(c, building) ?? emptySite(c),
  reward,
  guide,
});
const pop = (c: TaskContext) => c.villages.reduce((s, v) => s + v.pop, 0);

export const TASKS: TaskDef[] = [
  // 1 — First steps
  {
    id: 'field-1', chapter: 0, title: 'Upgrade a resource field',
    how: 'Resource fields produce the materials for everything. Click a field on your village overview and upgrade it.',
    link: (c) => `/slot/${lowestField(c) ?? 1}`, hint: lowestField,
    check: (c) => ({ done: (capital(c)?.slots ?? []).some((s) => s.building && FIELD_IDS.includes(s.building) && s.level >= 1) }),
    reward: r(150, 150, 150, 100), guide: 'first-hour',
  },
  {
    id: 'fields-all-1', chapter: 0, title: 'Every field to level 1',
    how: 'Bring all 18 resource fields to level 1 — cheap upgrades, steady income.',
    link: (c) => `/slot/${lowestField(c) ?? 1}`, hint: lowestField,
    check: (c) => { const f = fieldsAtLeast(c, 1); return { done: f.have >= f.need, ...f }; },
    reward: r(300, 300, 300, 200), guide: 'production-fields',
  },
  buildTask('main-2', 'main', 2, 0, 'Main Building to level 2', 'The Main Building makes every construction faster. Upgrade it in your village centre.', r(250, 250, 250, 150), 'main-building'),
  {
    id: 'rename', chapter: 0, title: 'Name your village',
    how: 'Give your village its own name: click the name above your village and type a new one.',
    link: () => '/fields',
    check: (c) => ({ done: !c.defaultVillageName }),
    reward: r(100, 100, 100, 100), guide: 'rename-village',
  },
  buildTask('warehouse-1', 'warehouse', 1, 0, 'Build a Warehouse', 'Wood, clay and iron are stored in the Warehouse. Without it, production stops when storage is full.', r(300, 300, 300, 200), 'storage'),
  buildTask('granary-1', 'granary', 1, 0, 'Build a Granary', 'Crop is stored in the Granary. Build it so your crop doesn’t overflow.', r(300, 300, 300, 200), 'storage'),
  buildTask('cranny-1', 'cranny', 1, 0, 'Build a Cranny', 'The Cranny hides part of your resources from raiders. Build one before your protection ends.', r(250, 250, 250, 250), 'cranny'),

  // 2 — Getting stronger
  {
    id: 'fields-all-2', chapter: 1, title: 'Every field to level 2',
    how: 'Keep growing your income: all 18 fields to level 2.',
    link: (c) => `/slot/${lowestField(c) ?? 1}`, hint: lowestField,
    check: (c) => { const f = fieldsAtLeast(c, 2); return { done: f.have >= f.need, ...f }; },
    reward: r(600, 600, 600, 400), guide: 'production-fields',
  },
  buildTask('main-5', 'main', 5, 1, 'Main Building to level 5', 'A level 5 Main Building builds noticeably faster and unlocks more buildings.', r(700, 700, 700, 400), 'main-building'),
  buildTask('rally-1', 'rally', 1, 1, 'Build a Rally Point', 'The Rally Point is where your troops gather. You need it to send any troops.', r(400, 400, 400, 300), 'rally-point'),
  buildTask('barracks-1', 'barracks', 1, 1, 'Build Barracks', 'In the Barracks you train infantry — your first soldiers.', r(600, 600, 600, 400, 5), 'military-buildings'),
  {
    id: 'train-5', chapter: 1, title: 'Train 5 soldiers',
    how: 'Train at least 5 soldiers in the Barracks (or use Train troops in the menu).',
    link: () => '/troops/train',
    check: (c) => ({ done: c.troops >= 5, have: Math.min(5, c.troops), need: 5 }),
    reward: r(600, 600, 600, 600), guide: 'training',
  },
  {
    id: 'wall-1', chapter: 1, title: 'Build your wall',
    how: 'The wall gives all defenders a bonus. Click the wall ring around your village centre.',
    link: () => '/slot/40', hint: () => 40,
    check: (c) => ({ done: Math.max(level(c, 'citywall'), level(c, 'earthwall'), level(c, 'palisade')) >= 1 }),
    reward: r(500, 500, 500, 300), guide: 'walls',
  },

  // 3 — Into the world
  {
    id: 'scout', chapter: 2, title: 'Scout a neighbour',
    how: 'Train a scout unit and send it with "Scouting" to a village near you to see its resources and troops.',
    link: () => '/troops/send',
    check: (c) => ({ done: c.scouted }),
    reward: r(500, 500, 500, 500, 5), guide: 'scouting',
  },
  {
    id: 'raid-oasis', chapter: 2, title: 'Raid an oasis',
    how: 'Oases hold loot. Pick one on the map with few or no animals and send a Raid. Use the Simulator to check your odds.',
    link: () => '/map',
    check: (c) => ({ done: c.raidedOasis }),
    reward: r(800, 800, 800, 600, 10), guide: 'oasis-raiding',
  },
  buildTask('market-1', 'market', 1, 2, 'Build a Marketplace', 'Merchants trade and send resources between villages and players.', r(600, 600, 600, 400), 'send-resources'),
  {
    id: 'send-res', chapter: 2, title: 'Send resources with merchants',
    how: 'Use the Marketplace to send some resources to another village (yours or a friend’s).',
    link: (c) => (slotOf(c, 'market') ? `/slot/${slotOf(c, 'market')}` : '/village'),
    check: (c) => ({ done: c.sentResources }),
    reward: r(700, 700, 700, 500), guide: 'send-resources',
  },
  buildTask('embassy-1', 'embassy', 1, 2, 'Build an Embassy', 'With an Embassy you can join an alliance (level 3 to found your own).', r(500, 500, 500, 400), 'embassy'),
  {
    id: 'alliance', chapter: 2, title: 'Join or found an alliance',
    how: 'Players are stronger together. Accept an invitation or found an alliance on the Alliance page.',
    link: () => '/alliance',
    check: (c) => ({ done: c.inAlliance }),
    reward: r(800, 800, 800, 800, 10), guide: 'alliance-join',
  },

  // 4 — Your hero
  buildTask('mansion-1', 'heromansion', 1, 3, "Build a Hero's Mansion", "In the Hero's Mansion you turn one of your soldiers into a hero.", r(700, 700, 700, 500), 'heros-mansion'),
  {
    id: 'hero', chapter: 3, title: 'Train your hero',
    how: 'Open the Hero page and train a hero from one of your soldiers. Heroes fight, gain experience and capture oases.',
    link: () => '/hero',
    check: (c) => ({ done: !!c.hero?.alive }),
    reward: r(1000, 1000, 1000, 800, 10), guide: 'hero-train',
  },
  {
    id: 'hero-level', chapter: 3, title: 'Hero reaches level 1',
    how: 'Send your hero with troops (tick "Hero"); it gains experience from every enemy killed. Spend new points on the Hero page.',
    link: () => '/troops/send',
    check: (c) => ({ done: (c.hero?.level ?? 0) >= 1 }),
    reward: r(1200, 1200, 1200, 1000), guide: 'hero-skills',
  },

  // 5 — Growing your empire
  {
    id: 'research', chapter: 4, title: 'Research a new unit',
    how: 'Build an Academy and research a new unit type.',
    link: (c) => (slotOf(c, 'academy') ? `/slot/${slotOf(c, 'academy')}` : '/village'),
    check: (c) => ({ done: c.villages.some((v) => v.research.slice(1).some((x) => x > 0)) }),
    reward: r(1000, 1000, 1000, 800), guide: 'research',
  },
  {
    id: 'smithy', chapter: 4, title: 'Upgrade a unit in the Blacksmith',
    how: 'Build a Blacksmith and upgrade the attack of a unit you use.',
    link: (c) => (slotOf(c, 'blacksmith') ? `/slot/${slotOf(c, 'blacksmith')}` : '/village'),
    check: (c) => ({ done: c.villages.some((v) => v.blacksmith.some((x) => x > 0)) }),
    reward: r(1200, 1200, 1200, 1000), guide: 'upgrades',
  },
  {
    id: 'pop-500', chapter: 4, title: 'Reach 500 population',
    how: 'Every building and field level adds population. Keep building!',
    link: () => '/village',
    check: (c) => ({ done: pop(c) >= 500, have: Math.min(500, pop(c)), need: 500 }),
    reward: r(1500, 1500, 1500, 1200), guide: 'build-order',
  },
  {
    id: 'capture-oasis', chapter: 4, title: 'Capture an oasis',
    how: "With a Hero's Mansion at level 10, attack a free oasis within 3 fields with your hero and kill every animal.",
    link: () => '/map',
    check: (c) => ({ done: c.oases >= 1 }),
    reward: r(2000, 2000, 2000, 2000, 10), guide: 'capture-oasis',
  },
  {
    id: 'residence-10', chapter: 4, title: 'Residence or Palace to level 10',
    how: 'A level 10 Residence or Palace lets you train settlers for a new village.',
    link: (c) => `/slot/${slotOf(c, 'residence') ?? slotOf(c, 'palace') ?? emptySite(c) ?? 26}`,
    check: (c) => { const l = Math.max(level(c, 'residence'), level(c, 'palace')); return { done: l >= 10, have: Math.min(10, l), need: 10 }; },
    reward: r(2500, 2500, 2500, 2000), guide: 'settlers',
  },
  {
    id: 'second-village', chapter: 4, title: 'Found your second village',
    how: 'Train 3 settlers and send them to an empty valley (map → "Found a village here"). You also need enough culture points.',
    link: () => '/map',
    check: (c) => ({ done: c.villages.length >= 2, have: Math.min(2, c.villages.length), need: 2 }),
    reward: r(4000, 4000, 4000, 3000, 20), guide: 'settlers',
  },
  {
    id: 'pop-1000', chapter: 4, title: 'Reach 1,000 population',
    how: 'A growing empire: 1,000 population across your villages.',
    link: () => '/stats',
    check: (c) => ({ done: pop(c) >= 1000, have: Math.min(1000, pop(c)), need: 1000 }),
    reward: r(3000, 3000, 3000, 3000), guide: 'build-order',
  },
];

export function taskById(id: string): TaskDef | undefined {
  return TASKS.find((t) => t.id === id);
}
