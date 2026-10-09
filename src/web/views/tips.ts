import { config } from '../../config.js';
import { html, type SafeHtml } from '../html.js';
import { CRANNY_MAX_SHARE, CRANNY_PERCENT_PER_LEVEL } from '../../game/rules/production.js';
import { HERO_BONUS_PER_POINT, HERO_SKILL_MAX, HERO_UPKEEP } from '../../game/rules/hero.js';
import { OASIS_RANGE, SETTLERS_PER_VILLAGE } from '../../game/rules/expansion.js';
import { NPC_TRADE_PRICE, PROTECTION_PRICE, STORAGE_BOOST_PRICE } from '../../game/actions/credits.js';
import { GOLD_CLUB_PRICE } from '../../game/actions/goldclub.js';
import { MEMBERS_PER_EMBASSY_LEVEL } from '../../game/actions/alliance.js';

const pc = (x: number) => `${Math.round(x * 1000) / 10}%`;

/**
 * Short help texts for the "?" bubbles (`help(key)` in parts.ts). One or two plain sentences,
 * plain "-" (never the long dash); numbers come from the rules so they stay in sync.
 */
export const TIPS = {
  // resource bar
  res: 'Your stock / how much your Warehouse (wood, clay, iron) or Granary (crop) can hold. Production keeps running while you are offline; anything above the limit is lost. Click the icon for the full breakdown.',
  cropBalance: 'Crop left over each hour after your population and troops have eaten. If it goes below zero your granary empties, and with no crop left your troops start to starve.',
  gold: 'Gold is the premium currency: buy Plus features, finish building or training at once, trade on the Gold market. Click to get more.',
  // village
  production: 'Resources this village makes per hour from its fields, oases, bonus buildings and active Gold bonuses.',
  troopsHome: 'Your own troops currently in this village (not counting reinforcements from others).',
  population: 'Every building level adds population. Population counts for the rankings and eats crop; bigger players get a morale malus when they attack smaller ones.',
  capital: 'Your capital: resource fields can grow past level 10 and it can never be conquered. You choose it once with a Palace.',
  // building pages
  upgradeCost: 'Resources and time the next level needs. The Main Building makes all construction faster.',
  levelPop: 'Population this level adds (it also eats this much more crop per hour).',
  levelCp: 'Culture points per day this building gives at this level. You need culture points to found or conquer new villages.',
  levelEffect: 'What the building does at this level.',
  levelTable: 'Every level of this building with its cost, build time and effect. Your current level is highlighted.',
  // building panels
  merchants: `Merchants carry resources between villages. Each Marketplace level gives ${config.MERCHANT_MULTIPLIER} merchant${config.MERCHANT_MULTIPLIER === 1 ? '' : 's'}; a Trade Office lets each carry more.`,
  marketOffer: 'Put resources on the market for others to accept. Your merchants are reserved until the offer is taken or cancelled.',
  npcTrade: `NPC merchant: re-split all resources of this village between wood, clay, iron and crop at once for ${NPC_TRADE_PRICE} Gold.`,
  culturePoints: 'Culture points come every day from your buildings (more from celebrations). Each new village needs more culture points than the last one.',
  expansionSlots: `How many villages this village may found or conquer. Residence gives a slot at level 10 and 20, Palace at 10, 15 and 20. Founding one takes ${SETTLERS_PER_VILLAGE} settlers.`,
  celebration: 'A celebration in the Town Hall gives extra culture points when it finishes. Great celebrations give more and help chiefs.',
  oasisSlots: `Hero's Mansion levels 10, 15 and 20 each let this village hold one oasis within ${OASIS_RANGE} fields. Oases add a production bonus.`,
  traps: 'Gaul Trapper traps catch attackers before the fight. Caught troops stay prisoners until freed or released.',
  research: 'Research a unit once in the Academy before you can train it here.',
  smithy: 'Blacksmith upgrades raise a unit\'s attack, Armoury upgrades its defence. The level is capped by the building level.',
  // training
  unitCost: 'Cost to train one unit: wood, clay, iron, crop, crop it eats per hour, and training time.',
  carry: 'How many resources one unit can carry home from a raid.',
  trainMax: 'The most you can train right now with the resources in stock.',
  trainTotal: 'Everything you entered above together. Train all queues them in every building at once; if resources run out, the first rows are trained first.',
  autoShare: 'Share of your resources this troop gets. Every minute auto training spends your stock by these shares and queues as many as that buys.',
  autoBusy: 'How busy your income keeps this building. Over 100% means it cannot train as fast as you pay, so resources pile up.',
  autoHours: 'How long auto training runs. When it ends it stops by itself; start it again any time.',
  autoStock: 'Stock = what you have now; Income = what you make per hour; Used = what these shares spend per hour.',
  autoAssigned: 'Total share you gave out. What you leave below 100% stays in your stock.',
  // rally point
  rallyHome: 'Troops in this village right now: yours and reinforcements other players or your other villages sent.',
  reinforcements: 'Troops sent here by others. They defend this village but eat your crop.',
  elsewhere: 'Your troops away from this village: reinforcing someone, held in an oasis, or prisoners.',
  catapults: 'Pick the building catapults aim at. Below Rally Point level 3 they hit a random building; at level 20 they can aim at two.',
  heroJoin: 'Send your hero with the troops. The hero fights, gains experience, and is needed to capture oases.',
  haul: 'Resources these troops carry back, and how full their carrying capacity was.',
  // hero
  heroHealth: 'When health hits 0 the hero dies and must be revived. It regenerates every day.',
  heroXp: 'Experience from fights. Each level gives 5 skill points.',
  heroSpeed: 'Fields per hour the hero walks (or rides) on its own.',
  heroRegen: 'Health the hero regains per day. Raise it with the Regeneration skill.',
  heroAttack: 'Attack strength of the hero itself in a fight.',
  heroDefence: 'Defence of the hero against infantry / cavalry.',
  heroBonus: `Army bonus: each point in Attack bonus or Defence bonus adds ${pc(HERO_BONUS_PER_POINT)} to the whole army the hero fights with (max ${pc(HERO_BONUS_PER_POINT * HERO_SKILL_MAX)}).`,
  heroPoints: `Skill points to spend. You get 5 per level; a skill takes up to ${HERO_SKILL_MAX} points. The hero eats ${HERO_UPKEEP} crop per hour.`,
  // production page
  prodBase: 'What your resource fields produce per hour, field by field level.',
  prodBonus: 'Extra production from oases, bonus buildings (Sawmill, Brickyard, Iron Foundry, Grain Mill, Bakery) and Gold bonuses.',
  prodConsumption: 'Crop eaten per hour by your population and by every troop you feed (also troops away from home).',
  // simulator
  simMorale: 'Population of both sides. When the attacker is bigger, morale makes the attack weaker (down to about two thirds).',
  simWall: 'The wall adds a defence bonus to every defender and fights back against rams.',
  simResidence: 'Residence or Palace level adds a little base defence to the village.',
  simStonemason: 'The Stonemason makes buildings sturdier against catapults.',
  simTraps: 'Free Gaul traps: they catch attackers before the fight.',
  simMargin: 'How clear the win was. Close fights cost the winner many troops.',
  simBonus: 'Extra attack or defence % from Gold bonuses, artifacts or other perks.',
  // shop / plus
  shopProduction: 'Each bonus adds 25% production of one resource in all villages for a few days.',
  shopArmy: 'Short boosts for your army: faster training, more attack or more defence.',
  storageBoost: `Storage expansion: this village's Warehouse and Granary hold 50% more, for ${STORAGE_BOOST_PRICE} Gold.`,
  protection: `Extra beginner protection for ${PROTECTION_PRICE} Gold: nobody can attack you while it lasts. Attacking another player ends it.`,
  sendGold: 'Send Gold to another player. Gold from tasks, medals and the starter gift cannot be sent.',
  finishNow: 'Finish building, demolition or training right away. The price depends on the time left.',
  goldClub: `Gold Club (${GOLD_CLUB_PRICE} Gold, for the whole game): farm lists with automatic raids, trade routes, troop evasion and the cropper finder.`,
  ticker: 'Put your own message in the news ticker every player sees at the top of the page.',
  // statistics
  statPop: 'Total population of all the player\'s villages.',
  statAttack: 'Attack points: the defenders this player killed while attacking.',
  statDefence: 'Defence points: the attackers this player killed while defending.',
  statRobber: 'Resources this player stole in raids and attacks.',
  // reports
  bounty: 'Resources the attackers carried home.',
  loyalty: 'Village loyalty. Chiefs lower it; at 0 the village is conquered. It slowly comes back on its own.',
  cranny: `A cranny hides ${pc(CRANNY_PERCENT_PER_LEVEL)} of storage per level (max ${pc(CRANNY_MAX_SHARE)}, Gauls twice as much up to that cap). Raiders cannot take hidden resources.`,
  // map
  oasis: `Oases give a production bonus. To take one: Hero's Mansion level 10, your hero in the attack, oasis within ${OASIS_RANGE} fields.`,
  animals: 'Wild animals guard free oases and grow back over time. Beat them to raid the oasis.',
  beginnerProtection: `New players are protected for ${config.PROTECTION_HOURS} hours. They cannot be attacked, and attacking someone ends the protection.`,
  // alliance
  allianceCapacity: `Members the alliance can have: ${MEMBERS_PER_EMBASSY_LEVEL} per level of the leader's best Embassy.`,
} as const;

export type TipKey = keyof typeof TIPS;

/**
 * Small round "?" that shows the tip in a bubble on hover, keyboard focus or tap (CSS `.qh`, positioning + tap in app.js).
 * Kept here (not parts.ts) so layout.ts can use it without an import cycle.
 */
export function help(key: TipKey): SafeHtml {
  const t = TIPS[key];
  return html`<span class="qh" tabindex="0" role="button" aria-label="Help: ${t}" data-help="${t}">?</span>`;
}
