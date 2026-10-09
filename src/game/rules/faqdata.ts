import { config } from '../../config.js';
import type { FaqTopic } from './faq.js';

/*
 * Game guide content. Every number here was checked against the rules code (src/game/rules,
 * src/game/engine, src/game/actions). The live world runs at speed x100: production, build,
 * training, research and travel times are 100 times faster than on a normal (x1) world, but
 * crop eaten by population and troops is NOT sped up. Real-time things (protection, boosts,
 * week end, auto-repeat timers) run on the normal clock.
 */
export const FAQ_TOPICS: FaqTopic[] = [
  /* ================================================================== */
  /* Getting started                                                     */
  /* ================================================================== */
  {
    id: 'what-is-game',
    category: 'start',
    title: 'What is onchainTRAVIAN?',
    keywords: ['game', 'about', 'travian', 'classic', 'browser game', 'how to play', 'rules', 'goal', 'win', 'new player', 'beginner', 'introduction'],
    summary: 'A browser strategy game that follows the classic Travian 3.6 rules: grow villages, train troops, trade, fight and join an alliance. The world ends when an alliance finishes a World Wonder at level 100.',
    body: [
      { p: 'You start with **one village**. Around it are 18 resource fields. In the village centre you put up buildings.' },
      { p: 'Your fields produce **wood, clay, iron and crop**. You spend them on buildings, troops and research.' },
      { p: 'Other players live on the same map. You can trade with them, help them, or attack them. Wild animals live in **oases**. They guard resources and give bonuses.' },
      { p: 'You choose one of three tribes: **Romans, Teutons or Gauls**. Each tribe has its own troops and strengths.' },
      { p: 'Late in the game the **Natars** appear. They guard artifacts and World Wonders. The first alliance that builds a World Wonder to **level 100** wins the world.' },
      { note: 'This world runs at **speed x100**. Building, training and walking are 100 times faster than on a normal Travian world. See [Server speed](/help/server-speed).' },
    ],
    related: ['first-hour', 'screens', 'tribes', 'server-speed'],
    links: [
      { href: '/fields', label: 'Village overview' },
      { href: '/help', label: 'All guide topics' },
    ],
  },
  {
    id: 'first-hour',
    category: 'start',
    title: 'What should I do in my first hour?',
    keywords: ['first steps', 'start', 'beginning', 'first hour', 'what to do', 'new', 'begin', 'tutorial', 'quick start', 'plan', 'opening'],
    summary: 'Upgrade all resource fields, build a Rally Point, Warehouse, Granary and Cranny, then raise the Main Building and start raiding oases. Use your 24 hours of beginner protection well.',
    body: [
      { p: 'You start with **750 of each resource**, a Main Building at level 1 and all fields at level 0. On this x100 world a level 1 field takes only 2 to 3 seconds to build.' },
      {
        steps: [
          'Upgrade **every resource field** to level 1, then to level 2 and 3. Click a field on the [Village overview](/fields).',
          'Build a **Warehouse** and a **Granary**. Without them you can store only 800 of each resource, and your fields fill that in minutes.',
          'Build the **Rally Point** (its place is fixed). You need it to send troops and to build Barracks.',
          'Build a **Cranny**. It hides part of your resources from raiders.',
          'Raise the **Main Building** to level 3, then build **Barracks** and an **Embassy** (to join an alliance).',
          'Train a few cheap soldiers and **raid empty oases** near you. Oasis raids do not end your protection.',
          'Keep upgrading fields, Warehouse and Granary. Always spend resources before storage is full.',
        ],
      },
      {
        tips: [
          'Spend often. On x100 your fields produce a lot, and anything above storage is lost.',
          'Join an alliance early. Members help you with defence and advice.',
          'Before your protection ends, have a Cranny and some defence, or keep resources low.',
        ],
      },
    ],
    related: ['build-order', 'beginner-protection', 'storage', 'oasis-raiding', 'screens'],
    links: [
      { href: '/fields', label: 'Village overview' },
      { href: '/village', label: 'Village centre' },
    ],
  },
  {
    id: 'screens',
    category: 'start',
    title: 'Which screens are there and how do I move around?',
    keywords: ['navigation', 'menu', 'screen', 'overview', 'village centre', 'center', 'dorf1', 'dorf2', 'resource bar', 'side menu', 'panel', 'layout', 'top bar'],
    summary: 'The top buttons open the Village overview (fields), Village centre (buildings), Map, Statistics, Reports, Messages and Plus. The side menu has the Rally Point, Hero, Alliance, Chat, Gold pages and your profile.',
    body: [
      {
        table: {
          head: ['Screen', 'What you see there'],
          rows: [
            ['[Village overview](/fields)', 'Your 18 resource fields, production per hour, troops at home, troop movements and the building queue.'],
            ['[Village centre](/village)', 'Your buildings. Click a building or an empty place to build.'],
            ['[Map](/map)', 'Villages, oases and free land. Click a tile for details, actions and your reports there. Villages look bigger at 250, 500, 1,000 and 1,500 population.'],
            ['[Statistics](/stats)', 'Rankings of players, alliances, villages and heroes, and the weekly Top 10.'],
            ['[Reports](/reports)', 'Results of battles, scouting, trade and reinforcements.'],
            ['[Messages](/messages)', 'Mail from and to other players.'],
            ['[Plus & Gold](/shop)', 'Gold services, boosts, protection and the Gold Club.'],
          ],
        },
      },
      { p: '**Resource bar** (top): each resource shows amount / storage. Click it to open the [Production](/production) page. The crop icon shows consumption / production. The last number is your Gold.' },
      { p: '**Side menu** (left): Home, Rally point, Hero, Gold market, Alliance, Chat, Statistics, Plus & Gold, Wallet, Profile and Instructions. Your villages are listed with their population. Click a village to switch to it.' },
      { note: 'A red bar at the top of the Village overview warns you about **incoming attacks**.' },
    ],
    related: ['what-is-game', 'production-page', 'incoming-attacks', 'troop-movements'],
    links: [
      { href: '/fields', label: 'Village overview' },
      { href: '/village', label: 'Village centre' },
      { href: '/map', label: 'Map' },
    ],
  },
  {
    id: 'beginner-protection',
    category: 'start',
    title: 'How does beginner protection work?',
    keywords: ['protection', 'beginner protection', 'newbie', 'safe', 'shield', 'cannot attack', 'protected', 'immune', 'peace', 'noob'],
    summary: 'New players are protected for 24 hours: nobody can attack, raid or scout their villages. Attacking, raiding or scouting another player ends your protection at once.',
    body: [
      { p: 'Your protection starts when you register and lasts **24 real hours**. The Village overview shows the time left.' },
      { p: 'While you are protected, other players **cannot attack, raid or scout** your villages.' },
      { p: 'Your protection **ends immediately** when you send an attack, raid or scouts to **another player\'s village**.' },
      { p: 'These do **not** end protection: raiding or attacking **oases**, sending reinforcements, trading, and founding villages.' },
      { p: 'You can buy 24 more hours of protection for **80 Gold**. See [Buying protection](/help/buy-protection).' },
      {
        tips: [
          'Raid oases while protected. You get resources and hero experience at no risk to your village.',
          'Prepare for the end: build a Cranny, some defence, and do not keep full storage.',
        ],
      },
    ],
    related: ['buy-protection', 'first-hour', 'oasis-raiding', 'cranny'],
    links: [{ href: '/shop', label: 'Plus & Gold (protection)' }],
  },
  {
    id: 'server-speed',
    category: 'start',
    title: 'What does server speed x100 mean?',
    keywords: ['speed', 'x100', 'fast', 'world speed', 'server speed', 'troop speed', 'time', 'how fast', 'speed server', 'multiplier'],
    summary: 'On this x100 world, production, building, training, research, celebrations, culture points and travel are 100 times faster than on a normal world. Crop eaten by population and troops is not faster.',
    body: [
      {
        table: {
          head: ['Thing', 'On this x100 world'],
          rows: [
            ['Resource production', '100 times more per hour'],
            ['Build, training, research, upgrade times', '100 times shorter'],
            ['Troop and merchant travel', '100 times faster'],
            ['Culture points, celebrations, loyalty and hero health regrowth', '100 times faster'],
            ['Crop eaten by population, troops and hero', '**Not** changed (normal amount)'],
            ['Beginner protection, Gold boosts, week end, farm-list timers', 'Real time (not changed)'],
            ['Wild animals growing in free oases', 'Real time: 350 power per day, up to 8,000'],
          ],
        },
      },
      { p: 'Battles are not changed by speed. The [combat simulator](/simulator) uses the same rules as real fights.' },
      {
        tips: [
          'Storage fills very fast. Upgrade Warehouse and Granary early.',
          'Crop is easy at the start because troops eat the normal amount. Big armies still need a lot of crop.',
        ],
      },
    ],
    related: ['what-is-game', 'storage', 'crop-upkeep', 'troop-speed'],
  },

  /* ================================================================== */
  /* Resources & fields                                                  */
  /* ================================================================== */
  {
    id: 'production-fields',
    category: 'resources',
    title: 'How do resource fields and production work?',
    keywords: ['production', 'fields', 'woodcutter', 'clay pit', 'iron mine', 'cropland', 'farm', 'resources', 'income', 'per hour', 'resource field', 'level', 'max level'],
    summary: 'Each of your 18 fields produces one resource; every level produces more. Fields go to level 10 in normal villages and level 20 in your capital.',
    body: [
      { p: 'Woodcutters make wood, Clay Pits make clay, Iron Mines make iron and Croplands make crop. Click a field on the [Village overview](/fields) to upgrade it.' },
      {
        table: {
          head: ['Field level', '0', '1', '2', '3', '5', '8', '10', '15', '20'],
          rows: [['Per hour (x100)', '200', '500', '900', '1,500', '3,300', '10,000', '20,000', '80,000', '245,000']],
        },
      },
      { p: 'Even a level 0 field produces a little. Bonuses come on top: oases, Sawmill and similar buildings, Gold boosts and token perks. The [Production](/production) page shows every part.' },
      { note: 'Only your **capital** can raise fields above level 10. If you move your capital, the old capital\'s fields above 10 drop back to 10.' },
      { p: 'High field levels cost a lot. A level costs more than your storage holds? Then you cannot build it. Upgrade the Warehouse or Granary first.' },
    ],
    related: ['storage', 'bonus-buildings', 'oasis-bonus', 'production-page', 'village-types', 'capital'],
    links: [
      { href: '/fields', label: 'Village overview' },
      { href: '/production', label: 'Production breakdown' },
    ],
  },
  {
    id: 'storage',
    category: 'resources',
    title: 'How much can I store? What happens when storage is full?',
    keywords: ['storage', 'warehouse', 'granary', 'capacity', 'full', 'overflow', 'lost resources', 'store', 'limit', 'max resources', 'silo'],
    summary: 'The Warehouse stores wood, clay and iron (each); the Granary stores crop. When storage is full, production stops and anything delivered above the limit is lost.',
    body: [
      {
        table: {
          head: ['Level', 'none', '1', '3', '5', '8', '10', '12', '15', '18', '20'],
          rows: [['Capacity per resource', '800', '1,200', '2,300', '4,000', '7,800', '11,800', '17,600', '31,300', '55,100', '80,000']],
        },
      },
      { p: 'The Warehouse number counts for **each** of wood, clay and iron. The Granary number is for crop.' },
      { p: 'When a Warehouse or Granary is at **level 20**, you can build a second one. Their capacities add up.' },
      { p: 'When storage is full, that resource stops growing. Loot, deliveries and Gold market goods above the limit are **lost**.' },
      { p: 'A building level that costs more than your storage can hold cannot be built. The page then says "Upgrade your Warehouse first" or "Upgrade your Granary first".' },
      {
        tips: [
          'On x100, storage fills in minutes. Keep Warehouse and Granary a little ahead of your fields.',
          'Make room before big deliveries or Gold market purchases arrive.',
          'Full storage also means more loot for raiders. Spend it.',
        ],
      },
    ],
    related: ['production-fields', 'great-storage', 'cranny', 'npc-trade'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'crop-upkeep',
    category: 'resources',
    title: 'Crop and upkeep: who eats my crop?',
    keywords: ['crop', 'upkeep', 'consumption', 'food', 'negative crop', 'minus crop', 'wheat', 'grain', 'eat', 'feed', 'crop usage', 'net crop'],
    summary: 'Every point of population eats 1 crop per hour, every soldier eats its upkeep, and the hero eats 6. Crop consumption is not sped up on this world.',
    body: [
      { p: 'Your **net crop** = crop production minus consumption. The resource bar shows consumption / production.' },
      {
        table: {
          head: ['Who eats', 'How much per hour'],
          rows: [
            ['Population (from buildings)', '1 crop per population point'],
            ['Each soldier', 'Its upkeep: 1 to 6 crop (see the troop guide)'],
            ['Hero', '6 crop'],
          ],
        },
      },
      { p: 'Your village pays for: its own troops at home, its troops on the move, troops it offers in the Gold market, and its soldiers held in enemy traps.' },
      { p: 'Your troops **reinforcing another village are fed by that village**. Reinforcements in your village are fed by you.' },
      { p: 'Roman Horse Drinking Trough and the Diet control artifact lower what troops eat.' },
      { note: 'If crop runs out while net crop is negative, troops start to **starve**. See [Starvation](/help/starvation).' },
    ],
    related: ['starvation', 'production-page', 'troop-upkeep', 'reinforcements'],
    links: [{ href: '/production#crop', label: 'Crop breakdown' }],
  },
  {
    id: 'starvation',
    category: 'resources',
    title: 'What happens when my crop runs out?',
    keywords: ['starvation', 'starve', 'troops die', 'no crop', 'negative crop', 'hunger', 'troops disappeared', 'lost troops', 'famine'],
    summary: 'When the granary is empty and net crop is negative, troops in the village die until consumption fits production. Reinforcements die first, then your own troops, the most crop-hungry first.',
    body: [
      { p: 'Starvation happens only when **both** are true: crop in the village is 0, and net crop per hour is below 0.' },
      {
        steps: [
          'Reinforcements from other villages starve first.',
          'Then the village\'s own troops.',
          'Inside each army, units with the highest upkeep die first (for example catapults before infantry).',
          'It stops as soon as consumption is no higher than production.',
        ],
      },
      { p: 'The owner of the starved troops gets a report "Troops starved in ...".' },
      {
        tips: [
          'Watch the crop number in the resource bar. Red means negative.',
          'Raise Croplands, build a Grain Mill and Bakery, or capture a crop oasis.',
          'Send big armies to reinforce a village with spare crop, or buy crop with the NPC trade.',
        ],
      },
    ],
    related: ['crop-upkeep', 'bonus-buildings', 'npc-trade', 'oasis-bonus'],
    links: [{ href: '/production#crop', label: 'Crop breakdown' }],
  },
  {
    id: 'production-page',
    category: 'resources',
    title: 'Where can I see exactly where my production comes from?',
    keywords: ['production page', 'breakdown', 'details', 'bonus', 'production details', 'per hour', 'why', 'calculation', 'income'],
    summary: 'Click a resource in the top bar or the Production table: the Production page lists base output per field level, every bonus, and crop consumption.',
    body: [
      { p: 'The [Production](/production) page has one section per resource:' },
      {
        steps: [
          '**Base production**: your fields grouped by level, with output per hour.',
          '**Bonuses on top**: oases, Sawmill / Brickyard / Iron Foundry / Grain Mill / Bakery, Gold boosts (with end time) and token holder perks.',
          'For crop: **consumption** by population, troops and hero.',
        ],
      },
      { note: 'Bonuses of one kind are capped: production boosts add at most +50% for each kind (Gold boosts and token perks together). The page shows a line "Over the bonus limit" when you reach the cap.' },
    ],
    related: ['production-fields', 'bonus-buildings', 'oasis-bonus', 'gold-boosts'],
    links: [{ href: '/production', label: 'Production' }],
  },
  {
    id: 'bonus-buildings',
    category: 'resources',
    title: 'Sawmill, Brickyard, Iron Foundry, Grain Mill, Bakery',
    keywords: ['sawmill', 'brickyard', 'iron foundry', 'grain mill', 'bakery', 'mill', 'bonus building', 'production bonus', 'resource bonus', '5%'],
    summary: 'These five buildings add +5% production per level (max level 5, so +25%). Crop can get +50% with both Grain Mill and Bakery.',
    body: [
      {
        table: {
          head: ['Building', 'Bonus', 'Needs'],
          rows: [
            ['Sawmill', '+5% wood per level', 'Woodcutter 10, Main Building 5'],
            ['Brickyard', '+5% clay per level', 'Clay Pit 10, Main Building 5'],
            ['Iron Foundry', '+5% iron per level', 'Iron Mine 10, Main Building 5'],
            ['Grain Mill', '+5% crop per level', 'Cropland 5'],
            ['Bakery', '+5% crop per level', 'Cropland 10, Grain Mill 5, Main Building 5'],
          ],
        },
      },
      { p: 'The bonus is a share of the **base production** of your fields in that village. "Woodcutter 10" means one Woodcutter at level 10 is enough.' },
      { tips: ['Build them once your fields of that type are high. +25% of a big number is a lot.', 'A Grain Mill is cheap and early: it only needs a level 5 Cropland.'] },
    ],
    related: ['production-fields', 'production-page', 'building-requirements'],
  },
  {
    id: 'oasis-bonus',
    category: 'resources',
    title: 'How much does an oasis add to production?',
    keywords: ['oasis bonus', 'oasis production', '25%', '50%', 'crop oasis', 'annex', 'owned oasis', 'bonus'],
    summary: 'A captured oasis adds +25% (or +50% crop for a fertile oasis) of the village\'s base production of that resource. A village can hold up to 3 oases.',
    body: [
      {
        table: {
          head: ['Oasis', 'Bonus'],
          rows: [
            ['Forest oasis', '+25% wood'],
            ['Clay oasis', '+25% clay'],
            ['Hill oasis', '+25% iron'],
            ['Lake oasis', '+25% crop'],
            ['Forest lake / Clay lake / Hill lake oasis', '+25% of that resource and +25% crop'],
            ['Fertile oasis', '+50% crop'],
          ],
        },
      },
      { p: 'Your Hero\'s Mansion decides how many oases one village can hold: 1 at level 10, 2 at level 15, 3 at level 20.' },
      { p: 'A held oasis does not gather resources for raiders any more.' },
    ],
    related: ['capture-oasis', 'heros-mansion', 'cropper-finder', 'production-page'],
    links: [{ href: '/map', label: 'Map' }],
  },
  {
    id: 'village-types',
    category: 'resources',
    title: 'Village types: 4-4-4-6, 9-croppers and 15-croppers',
    keywords: ['village type', 'field layout', '15c', '9c', 'cropper', '15 cropper', '9 cropper', '4446', 'layout', 'valley', 'distribution'],
    summary: 'Each piece of land has a fixed mix of 18 fields. Everyone starts on a 4-4-4-6; 9-croppers and 15-croppers have far more crop and are great for big armies.',
    body: [
      {
        table: {
          head: ['Type (wood-clay-iron-crop)', 'Good for'],
          rows: [
            ['4-4-4-6', 'Balanced. Every new player starts here.'],
            ['3-4-5-6, 4-5-3-6, 5-3-4-6, 4-4-3-7', 'Small changes in the mix.'],
            ['3-3-3-9 (9-cropper)', 'Lots of crop. Good capital or army village.'],
            ['1-1-1-15 (15-cropper)', 'The most crop. Best place to feed a huge army.'],
          ],
        },
      },
      { p: 'Click an empty field on the [Map](/map) to see its type. Gold Club members can search with the [Cropper finder](/map/croppers).' },
      { tips: ['A cropper with crop oases within 3 fields is the best spot for your capital (fields up to level 20).'] },
    ],
    related: ['cropper-finder', 'settlers', 'capital', 'oasis-bonus'],
    links: [{ href: '/map/croppers', label: 'Cropper finder' }],
  },

  /* ================================================================== */
  /* Buildings                                                           */
  /* ================================================================== */
  {
    id: 'main-building',
    category: 'buildings',
    title: 'Main Building',
    keywords: ['main building', 'mb', 'headquarters', 'build faster', 'construction time', 'builders', 'town hall', 'hq'],
    summary: 'The Main Building makes all construction faster: about 3.6% per level, so level 20 builds in half the time. It is needed for many other buildings.',
    body: [
      {
        table: {
          head: ['Main Building level', '1', '5', '10', '15', '20'],
          rows: [['Construction time', '100%', '86%', '72%', '60%', '50%']],
        },
      },
      { p: 'It stands on its own place in the village centre. Every village starts with level 1.' },
      { p: 'At **level 10** you can **demolish** buildings. See [Demolishing](/help/demolish).' },
      { p: 'Many buildings need it: level 3 for Barracks, Academy and Marketplace; level 5 for Residence, Palace and Workshop; level 10 for Town Hall and Treasury.' },
    ],
    related: ['building-queue', 'building-requirements', 'demolish'],
    links: [{ href: '/slot/26', label: 'Main Building' }],
  },
  {
    id: 'rally-point',
    category: 'buildings',
    title: 'Rally Point',
    keywords: ['rally point', 'rp', 'send troops', 'troop movements', 'movement limit', 'catapult targets', 'gathering point'],
    summary: 'You need a Rally Point to send troops. Each level allows 5 outgoing troop movements at once, and higher levels let catapults aim at more buildings.',
    body: [
      { p: 'Every village starts with the Rally Point at **level 0**. Build it early: Barracks and the Hero\'s Mansion need level 1.' },
      { p: '**Movement limit**: 5 outgoing movements per level (attacks, raids, reinforcements, scouts and settlers that are still on the way out). Level 10 allows 50.' },
      {
        table: {
          head: ['Rally Point level', 'Catapults can aim at'],
          rows: [
            ['below 3', 'Random building only'],
            ['3', 'Warehouse and Granary'],
            ['5', 'Also resource fields and Sawmill / Brickyard / Iron Foundry / Grain Mill / Bakery'],
            ['10', 'Every building except Cranny, Stonemason\'s Lodge, Trapper and walls'],
            ['20', 'Two targets in one attack (with at least 20 catapults)'],
          ],
        },
      },
      { p: 'Its pages: [Overview](/troops) (troops and movements), [Send troops](/troops/send), [Farm list](/troops/farmlist) and [Combat simulator](/simulator).' },
    ],
    related: ['send-troops', 'catapults', 'troop-movements', 'farm-lists'],
    links: [
      { href: '/troops', label: 'Rally Point' },
      { href: '/slot/39', label: 'Upgrade the Rally Point' },
    ],
  },
  {
    id: 'great-storage',
    category: 'buildings',
    title: 'Great Warehouse and Great Granary',
    keywords: ['great warehouse', 'great granary', 'big storage', 'storage plan', 'artifact storage', '3x storage'],
    summary: 'They store three times as much as a normal Warehouse or Granary, but you can only build them with a Storage master plan artifact or in a World Wonder village.',
    body: [
      { p: 'Requirements: Main Building level 10, **and** a Storage master plan artifact working for that village, **or** the village is a World Wonder village.' },
      { p: 'A small Storage plan works in the village where it is kept. A large one works in all your villages.' },
      { p: 'A Great Warehouse at level 20 holds 240,000 of each of wood, clay and iron.' },
    ],
    related: ['storage', 'artifacts', 'world-wonder'],
  },
  {
    id: 'embassy',
    category: 'buildings',
    title: 'Embassy',
    keywords: ['embassy', 'join alliance', 'found alliance', 'alliance size', 'members', 'diplomats'],
    summary: 'Embassy level 1 lets you join an alliance; level 3 lets you found one. The leader\'s Embassy level sets the alliance size: 3 members per level.',
    body: [
      { p: 'Needs Main Building level 1.' },
      { p: 'The alliance can have **3 members per Embassy level** of its leader (at least 3). A leader with Embassy 20 can lead 60 players.' },
      { p: 'Founding an alliance also costs **280 Gold**.' },
      { p: 'The Palace needs Embassy level 1.' },
    ],
    related: ['alliance-join', 'alliance-roles', 'residence-palace'],
    links: [{ href: '/alliance', label: 'Alliance' }],
  },
  {
    id: 'military-buildings',
    category: 'buildings',
    title: 'Barracks, Stable, Workshop and the Great Barracks / Stable',
    keywords: ['barracks', 'stable', 'workshop', 'great barracks', 'great stable', 'training building', 'train faster', 'siege workshop', 'infantry', 'cavalry'],
    summary: 'Barracks train infantry, the Stable cavalry and the Workshop rams and catapults. Each level trains 10% faster; Great Barracks and Great Stable train in parallel at 3 times the cost.',
    body: [
      {
        table: {
          head: ['Building', 'Trains', 'Needs'],
          rows: [
            ['Barracks', 'Infantry (and Teuton Scouts)', 'Main Building 3, Rally Point 1'],
            ['Stable', 'Cavalry and Roman/Gaul scouts', 'Blacksmith 3, Academy 5'],
            ['Workshop', 'Rams and catapults', 'Main Building 5, Academy 10'],
            ['Great Barracks', 'Infantry, cost x3', 'Barracks 20, not in the capital'],
            ['Great Stable', 'Cavalry, cost x3', 'Stable 20, not in the capital'],
          ],
        },
      },
      {
        table: {
          head: ['Building level', '1', '5', '10', '15', '20'],
          rows: [['Training time', '100%', '66%', '39%', '23%', '14%']],
        },
      },
      { p: 'Each building has its own queue, so Barracks, Stable and Workshop can all train at the same time.' },
    ],
    related: ['training', 'research', 'unit-roles'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'residence-palace',
    category: 'buildings',
    title: 'Residence and Palace',
    keywords: ['residence', 'palace', 'capital', 'settlers', 'chiefs', 'expansion slot', 'loyalty', 'defence bonus', 'senator', 'chieftain'],
    summary: 'Both train settlers and chiefs and give expansion slots. You can have only one Palace, and the village with it becomes your capital. A village has either a Residence or a Palace, never both.',
    body: [
      {
        table: {
          head: ['', 'Residence', 'Palace'],
          rows: [
            ['Needs', 'Main Building 5', 'Main Building 5, Embassy 1'],
            ['How many', 'One per village', 'One in your whole account'],
            ['Expansion slots', 'Level 10 and 20 (2 slots)', 'Level 10, 15 and 20 (3 slots)'],
            ['Special', '', 'Makes this village your capital'],
          ],
        },
      },
      { p: '**Loyalty**: the village\'s loyalty regrows 1% per hour per Residence/Palace level (x100 on this world). Without either, loyalty does not regrow.' },
      { p: '**Defence**: the village gets 2 x level x level extra base defence (level 10: +200, level 20: +800).' },
      { p: 'Enemy chiefs **cannot lower loyalty** while a Residence or Palace stands. Attackers must destroy it with catapults first.' },
      { p: 'Settlers and chiefs train 10% faster per level, like in the Barracks.' },
    ],
    related: ['expansion-slots', 'capital', 'settlers', 'conquer'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'treasury',
    category: 'buildings',
    title: 'Treasury',
    keywords: ['treasury', 'artifact', 'artefact', 'hold artifact', 'treasure'],
    summary: 'The Treasury holds an artifact. You need level 10 for a small artifact and level 20 for a large or unique one, and one Treasury holds only one artifact.',
    body: [
      { p: 'Needs Main Building level 10.' },
      { p: 'To capture an artifact, the **attacking village** must have a Treasury of the needed level that holds no artifact yet.' },
      { p: 'An enemy\'s Treasury must be destroyed by catapults before your hero can take its artifact. Aiming at a Treasury needs Rally Point level 10.' },
    ],
    related: ['artifacts', 'artifact-capture', 'catapults'],
  },
  {
    id: 'trade-office',
    category: 'buildings',
    title: 'Trade Office',
    keywords: ['trade office', 'merchant capacity', 'carry more', 'merchants'],
    summary: 'Each Trade Office level lets your merchants carry 10% more (level 20: twice as much).',
    body: [
      { p: 'Needs Marketplace 20 and Stable 10.' },
      { p: 'Example: a Roman merchant carries 500. With a level 10 Trade Office it carries 1,000.' },
    ],
    related: ['send-resources', 'trade-routes'],
  },
  {
    id: 'heros-mansion',
    category: 'buildings',
    title: "Hero's Mansion",
    keywords: ["hero's mansion", 'heros mansion', 'hero mansion', 'train hero', 'oasis slots', 'annex', 'mansion'],
    summary: "Train your hero here. At levels 10, 15 and 20 the village can hold one more oasis (3 at most).",
    body: [
      { p: 'Needs Main Building 3 and Rally Point 1.' },
      { p: 'Level 1 lets you train a hero from one of your soldiers. See [Training a hero](/help/hero-train).' },
      { p: 'Oasis slots: **1 at level 10, 2 at level 15, 3 at level 20**. The Mansion page lists your oases and has a **Release** button for each.' },
      { p: 'The level also makes your held oases harder to take: their loyalty regrows by 2 per hour per Mansion level (level 10: 20 per hour).' },
    ],
    related: ['hero-train', 'capture-oasis', 'oasis-bonus', 'release-oasis'],
    links: [{ href: '/hero', label: 'Hero' }],
  },
  {
    id: 'tournament-square',
    category: 'buildings',
    title: 'Tournament Square',
    keywords: ['tournament square', 'arena', 'long distance', 'troop speed', 'faster troops', '30 fields'],
    summary: 'Troops from this village move 10% faster per level, but only for the part of the trip beyond 30 fields.',
    body: [
      { p: 'Needs Rally Point 15.' },
      { p: 'The first 30 fields are walked at normal speed. After that the speed is +10% per level (level 20: three times as fast).' },
      { p: 'It works on the way out and on the way home. It does not help merchants.' },
    ],
    related: ['troop-speed', 'send-troops'],
  },
  {
    id: 'stonemason',
    category: 'buildings',
    title: "Stonemason's Lodge",
    keywords: ['stonemason', "stonemason's lodge", 'stone mason', 'sturdier', 'catapult protection', 'capital defence'],
    summary: 'Only in your capital: buildings and the wall are 10% sturdier against rams and catapults per level.',
    body: [
      { p: 'Needs Main Building 5 and Palace 3. Capital only.' },
      { p: 'Level 10 makes buildings twice as hard to destroy; level 20 three times.' },
      { p: 'If you move your capital, the old capital loses its Stonemason\'s Lodge.' },
      { p: 'Catapults can never aim at it.' },
    ],
    related: ['catapults', 'rams', 'capital'],
  },
  {
    id: 'brewery',
    category: 'buildings',
    title: 'Brewery (Teutons)',
    keywords: ['brewery', 'mead', 'teuton bonus', 'attack bonus', 'drunk', 'beer'],
    summary: 'Teutons only, in the capital: +1% attack per level for all your troops. While you have one, your chiefs lower loyalty only half as much.',
    body: [
      { p: 'Needs Granary 20 and Rally Point 10. Maximum level 10 (+10% attack).' },
      { p: 'The bonus works for attacks from all your villages.' },
      { note: 'Downside while the Brewery exists: **chiefs persuade at half strength**. Catapults aim normally.' },
      { tips: ['Demolish the Brewery before a conquest (needs Main Building 10).'] },
    ],
    related: ['teutons-tips', 'catapults', 'conquer', 'demolish'],
  },
  {
    id: 'horse-trough',
    category: 'buildings',
    title: 'Horse Drinking Trough (Romans)',
    keywords: ['horse drinking trough', 'horse trough', 'trough', 'roman cavalry', 'cavalry upkeep', 'crop saving'],
    summary: 'Romans only: cavalry trains 1% faster per level, and from levels 10, 15 and 20 Equites Legati, Imperatoris and Caesaris eat 1 crop less each.',
    body: [
      { p: 'Needs Rally Point 10 and Stable 20.' },
      {
        table: {
          head: ['Level', 'Effect'],
          rows: [
            ['each level', 'Stable trains 1% faster'],
            ['10', 'Equites Legati eat 1 crop less (2 → 1)'],
            ['15', 'Equites Imperatoris eat 1 crop less (3 → 2)'],
            ['20', 'Equites Caesaris eat 1 crop less (4 → 3)'],
          ],
        },
      },
    ],
    related: ['romans-tips', 'crop-upkeep', 'military-buildings'],
  },
  {
    id: 'building-queue',
    category: 'buildings',
    title: 'How many things can I build at once? (Master Builder)',
    keywords: ['build queue', 'queue', 'builders busy', 'master builder', 'two buildings', 'parallel', 'construction', 'at the same time', 'busy'],
    summary: 'Normally one construction at a time per village. Romans can build one field and one building at once. Master Builder (10 Gold, 7 days) adds one more builder.',
    body: [
      {
        table: {
          head: ['', 'Without Master Builder', 'With Master Builder'],
          rows: [
            ['Teutons, Gauls', '1 at a time', '2 at a time'],
            ['Romans', '1 field + 1 building', '2 fields + 2 buildings'],
          ],
        },
      },
      { p: 'There is no waiting list: when builders are busy, the page says "Your builders are busy". Come back when one finishes.' },
      { p: '**Cancel** a construction to get its full cost back (only as much as your storage can hold).' },
      { p: 'Demolitions do not use a builder.' },
      { p: 'Finish a construction at once with Gold. See [Finish now](/help/finish-now).' },
    ],
    related: ['master-builder-trainer', 'finish-now', 'main-building', 'demolish'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'demolish',
    category: 'buildings',
    title: 'How do I demolish a building?',
    keywords: ['demolish', 'destroy own building', 'remove building', 'tear down', 'downgrade', 'delete building'],
    summary: 'With Main Building level 10 you can demolish a village building one level at a time. It takes half the build time and gives nothing back.',
    body: [
      {
        steps: [
          'Raise your Main Building to level 10.',
          'Open the Main Building page and choose the building to demolish.',
          'One level is removed. At level 0 the place is empty again.',
        ],
      },
      { p: 'Only one demolition can run at a time per village. It does not block your builders.' },
      { p: 'Resource fields cannot be demolished.' },
    ],
    related: ['main-building', 'building-queue', 'brewery'],
    links: [{ href: '/slot/26', label: 'Main Building' }],
  },
  {
    id: 'building-pictures',
    category: 'buildings',
    title: 'Why do my buildings look different at higher levels?',
    keywords: ['picture', 'image', 'graphics', 'stage', 'look', 'art', 'wall picture', 'building image'],
    summary: 'Buildings get a grander picture at levels 5, 10, 15 and 20. Walls show wooden spikes at levels 1-4 and then the tribe\'s own wall in four stages.',
    body: [
      { p: 'The picture changes only how it looks. It has no effect on the game.' },
      { p: 'An unbuilt wall shows as an outline ring around the village. Click the ring to build it.' },
      { p: 'Click on a building in the [Village centre](/village) to open it. Without a mouse you can use the keyboard (Tab) to move between places.' },
    ],
    related: ['walls', 'screens'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'rename-village',
    category: 'buildings',
    title: 'How do I rename my village?',
    keywords: ['rename', 'village name', 'change name', 'name village'],
    summary: 'Click the village name (or the pencil) above the village picture, type a new name and press Save or Enter.',
    body: [
      { p: 'A village name must have 2 to 30 characters.' },
      { p: 'You can also rename the active village on your [Profile](/account) page.' },
      { p: 'Player names cannot be changed.' },
    ],
    related: ['profile', 'screens'],
    links: [{ href: '/account', label: 'Profile' }],
  },
  {
    id: 'building-requirements',
    category: 'buildings',
    title: 'Building requirements (what do I need first?)',
    keywords: ['requirements', 'requires', 'prerequisite', 'needed', 'unlock', 'how to build', 'tech tree', 'missing building', 'not available'],
    summary: 'Most buildings need other buildings first. This table lists every requirement; the empty-place page also shows what is "available later".',
    body: [
      {
        table: {
          head: ['Building', 'Needs', 'Notes'],
          rows: [
            ['Warehouse, Granary', 'Main Building 1', 'More than one after level 20'],
            ['Cranny', '-', 'One per village, max level 10'],
            ['Embassy', 'Main Building 1', ''],
            ['Marketplace', 'Main Building 3, Warehouse 1, Granary 1', ''],
            ['Barracks', 'Main Building 3, Rally Point 1', ''],
            ['Academy', 'Main Building 3, Barracks 3', ''],
            ['Armoury', 'Main Building 3, Academy 1', ''],
            ['Blacksmith', 'Main Building 3, Academy 3', ''],
            ["Hero's Mansion", 'Main Building 3, Rally Point 1', ''],
            ['Stable', 'Blacksmith 3, Academy 5', ''],
            ['Workshop', 'Main Building 5, Academy 10', ''],
            ['Residence', 'Main Building 5', 'Not with a Palace'],
            ['Palace', 'Main Building 5, Embassy 1', 'One per account'],
            ['Town Hall', 'Main Building 10, Academy 10', ''],
            ['Treasury', 'Main Building 10', ''],
            ['Tournament Square', 'Rally Point 15', ''],
            ['Trade Office', 'Marketplace 20, Stable 10', ''],
            ['Great Barracks / Great Stable', 'Barracks 20 / Stable 20', 'Not in the capital'],
            ["Stonemason's Lodge", 'Main Building 5, Palace 3', 'Capital only'],
            ['Sawmill / Brickyard / Iron Foundry', 'That field type 10, Main Building 5', 'Max level 5'],
            ['Grain Mill', 'Cropland 5', 'Max level 5'],
            ['Bakery', 'Cropland 10, Grain Mill 5, Main Building 5', 'Max level 5'],
            ['Brewery', 'Granary 20, Rally Point 10', 'Teutons, capital only'],
            ['Horse Drinking Trough', 'Rally Point 10, Stable 20', 'Romans'],
            ['Trapper', 'Rally Point 1', 'Gauls'],
            ['Great Warehouse / Granary', 'Main Building 10', 'Storage plan artifact or World Wonder village'],
          ],
        },
      },
      { p: 'The Main Building, Rally Point and wall have fixed places. The wall needs nothing.' },
    ],
    related: ['main-building', 'military-buildings', 'research', 'bonus-buildings'],
    links: [{ href: '/village', label: 'Village centre' }],
  },

  /* ================================================================== */
  /* Troops & training                                                   */
  /* ================================================================== */
  {
    id: 'tribes',
    category: 'troops',
    title: 'Romans, Teutons or Gauls: which tribe is best for me?',
    keywords: ['tribe', 'tribes', 'romans', 'teutons', 'gauls', 'nation', 'race', 'which tribe', 'choose tribe', 'roman', 'teuton', 'gaul', 'germans'],
    summary: 'Romans build faster and have strong infantry; Teutons have cheap troops that carry a lot and beat crannies; Gauls are the best defenders, the fastest, with a double cranny and traps.',
    body: [
      {
        table: {
          head: ['', 'Romans', 'Teutons', 'Gauls'],
          rows: [
            ['Style', 'All-round, good for new players', 'Aggressive raider', 'Defensive, fast'],
            ['Special', 'Build a field and a building at the same time', 'Enemy cranny hides only 80% against them', 'Own cranny hides twice as much; Trapper'],
            ['Wall', 'City Wall: +3% per level', 'Earth Wall: +2% per level, very hard to ram', 'Palisade: +2.5% per level'],
            ['Merchants', 'Carry 500, speed 16', 'Carry 1,000, speed 12', 'Carry 750, speed 24'],
            ['Chief lowers loyalty', '20-30% (Senator)', '20-25% (Chief)', '20-25% (Chieftain)'],
            ['Tribe building', 'Horse Drinking Trough', 'Brewery', 'Trapper'],
          ],
        },
      },
      { p: 'You choose the tribe when you register. It cannot be changed.' },
      { p: 'See the tips for [Romans](/help/romans-tips), [Teutons](/help/teutons-tips) and [Gauls](/help/gauls-tips).' },
    ],
    related: ['unit-roles', 'romans-tips', 'teutons-tips', 'gauls-tips'],
    links: [{ href: '/units', label: 'All troops' }],
  },
  {
    id: 'unit-roles',
    category: 'troops',
    title: 'Which troops attack, defend, scout or conquer?',
    keywords: ['units', 'troops', 'soldiers', 'army', 'attack unit', 'defence unit', 'defense unit', 'stats', 'unit list', 'legionnaire', 'clubswinger', 'phalanx', 'imperian', 'axeman', 'theutates thunder', 'praetorian', 'spearman'],
    summary: 'Each tribe has 10 units: fighting infantry and cavalry, a scout, a ram, a catapult, a chief and settlers. Use attack units to attack and raid, defence units to defend.',
    body: [
      { p: 'A = attack, DI = defence against infantry, DC = defence against cavalry, Speed in fields per hour (x1), Carry = loot, Crop = upkeep per hour.' },
      {
        table: {
          head: ['Romans', 'A', 'DI', 'DC', 'Speed', 'Carry', 'Crop', 'Role'],
          rows: [
            ['Legionnaire', '40', '35', '50', '6', '50', '1', 'All-round'],
            ['Praetorian', '30', '65', '35', '5', '20', '1', 'Defence vs infantry'],
            ['Imperian', '70', '40', '25', '7', '50', '1', 'Attack'],
            ['Equites Legati', '0', '20', '10', '16', '0', '2', 'Scout'],
            ['Equites Imperatoris', '120', '65', '50', '14', '100', '3', 'Attack, raid'],
            ['Equites Caesaris', '180', '80', '105', '10', '70', '4', 'Heavy attack, defence vs cavalry'],
          ],
        },
      },
      {
        table: {
          head: ['Teutons', 'A', 'DI', 'DC', 'Speed', 'Carry', 'Crop', 'Role'],
          rows: [
            ['Clubswinger', '40', '20', '5', '7', '60', '1', 'Cheap attack, raid'],
            ['Spearman', '10', '35', '60', '7', '40', '1', 'Defence vs cavalry'],
            ['Axeman', '60', '30', '30', '6', '50', '1', 'Attack'],
            ['Scout', '0', '10', '5', '9', '0', '1', 'Scout (Barracks)'],
            ['Paladin', '55', '100', '40', '10', '110', '2', 'Defence vs infantry'],
            ['Teutonic Knight', '150', '50', '75', '9', '80', '3', 'Attack, raid'],
          ],
        },
      },
      {
        table: {
          head: ['Gauls', 'A', 'DI', 'DC', 'Speed', 'Carry', 'Crop', 'Role'],
          rows: [
            ['Phalanx', '15', '40', '50', '7', '35', '1', 'Cheap defence'],
            ['Swordsman', '65', '35', '20', '6', '45', '1', 'Attack'],
            ['Pathfinder', '0', '20', '10', '17', '0', '2', 'Scout'],
            ['Theutates Thunder', '90', '25', '40', '19', '75', '2', 'Fastest raider'],
            ['Druidrider', '45', '115', '55', '16', '35', '2', 'Defence vs infantry'],
            ['Haeduan', '140', '50', '165', '13', '65', '3', 'Attack, defence vs cavalry'],
          ],
        },
      },
      { p: 'Every tribe also has a **ram** (breaks walls), a **catapult** (destroys buildings), a **chief** (conquers villages) and **settlers** (found villages).' },
      { p: 'Each troop has an info page with costs, training time and upgrade values: see [All troops](/units).' },
    ],
    related: ['tribes', 'troop-guide', 'research', 'battle-basics'],
    links: [{ href: '/units', label: 'All troops' }],
  },
  {
    id: 'research',
    category: 'troops',
    title: 'How do I unlock new troops? (Academy research)',
    keywords: ['research', 'academy', 'unlock', 'new unit', 'cannot train', 'research first', 'requirement', 'tech'],
    summary: 'Research a unit once in the Academy of a village; then that village can train it. Your first unit and settlers need no research.',
    body: [
      { p: 'The Academy needs Main Building 3 and Barracks 3. It researches **one unit at a time**.' },
      { p: 'Research is per village. Each village must research its own units.' },
      { p: 'Each Academy level makes research 3.6% faster.' },
      {
        table: {
          head: ['Unit', 'Romans', 'Teutons', 'Gauls'],
          rows: [
            ['2nd', 'Praetorian: Academy 1, Armoury 1', 'Spearman: Academy 1, Barracks 3', 'Swordsman: Academy 3, Blacksmith 1'],
            ['3rd', 'Imperian: Academy 5, Blacksmith 1', 'Axeman: Academy 3, Blacksmith 1', 'Pathfinder: Academy 5, Stable 1'],
            ['4th', 'Equites Legati: Academy 5, Stable 1', 'Scout: Academy 1, Main Building 5', 'Theutates Thunder: Academy 5, Stable 3'],
            ['5th', 'Equites Imperatoris: Academy 5, Stable 5', 'Paladin: Academy 5, Stable 3', 'Druidrider: Academy 5, Stable 5'],
            ['6th', 'Equites Caesaris: Academy 5, Stable 10', 'Teutonic Knight: Academy 15, Stable 10', 'Haeduan: Academy 15, Stable 10'],
            ['Ram', 'Academy 10, Workshop 1', 'Academy 10, Workshop 1', 'Academy 10, Workshop 1'],
            ['Catapult', 'Academy 15, Workshop 10', 'Academy 15, Workshop 10', 'Academy 15, Workshop 10'],
            ['Chief', 'Senator: Academy 20, Rally Point 10', 'Chief: Academy 20, Rally Point 5', 'Chieftain: Academy 20, Rally Point 10'],
          ],
        },
      },
      { p: 'The Drill Sergeant Gold boost makes research 25% faster too.' },
    ],
    related: ['upgrades', 'training', 'unit-roles', 'building-requirements'],
    links: [{ href: '/units', label: 'All troops' }],
  },
  {
    id: 'upgrades',
    category: 'troops',
    title: 'Blacksmith and Armoury upgrades (Master Trainer)',
    keywords: ['upgrade', 'blacksmith', 'armoury', 'armory', 'smithy', 'improve troops', 'attack upgrade', 'defence upgrade', 'master trainer', 'weapons', 'armor'],
    summary: 'The Blacksmith raises a unit\'s attack and the Armoury its defence, up to level 20. A unit\'s level cannot be higher than the building\'s level.',
    body: [
      { p: 'Blacksmith needs Main Building 3 and Academy 3. Armoury needs Main Building 3 and Academy 1.' },
      { p: 'Upgrades are **per village**: troops use the levels of the village they come from.' },
      { p: 'Example: a Legionnaire has 40 attack. At Blacksmith level 10 it has about 46, at level 20 about 52.' },
      { p: 'Each building runs **one upgrade at a time**. **Master Trainer** (10 Gold, 7 days) allows two at once in each Blacksmith and Armoury, in every village.' },
      { p: 'Chiefs and settlers cannot be upgraded. Rams and catapults upgraded in the Blacksmith also destroy more.' },
      { p: 'Every troop\'s info page shows its values at all levels 0-20 and the cost of each upgrade.' },
    ],
    related: ['research', 'master-builder-trainer', 'battle-basics', 'troop-guide'],
    links: [{ href: '/units', label: 'All troops' }],
  },
  {
    id: 'training',
    category: 'troops',
    title: 'How does training troops work?',
    keywords: ['train', 'training', 'recruit', 'build troops', 'make units', 'queue', 'training queue', 'batch', 'how long', 'training time'],
    summary: 'Enter how many units you want in the Barracks, Stable, Workshop or Residence and pay all at once. Units come out one after another; each building has its own queue.',
    body: [
      {
        steps: [
          'Open the training building in the [Village centre](/village).',
          'Type the number, or click the "max" number you can afford.',
          'Click Train. The cost is paid at once.',
          'Units appear one by one. The queue shows each batch, its duration and when it is finished.',
        ],
      },
      { p: 'New batches wait behind older ones in the same building.' },
      { p: 'Training is faster with: a higher building level (10% per level), the Drill Sergeant boost (+25%), the Trainers\' talent artifact, and for Roman cavalry the Horse Drinking Trough.' },
      { p: 'Example on this x100 world: a Clubswinger takes 9 seconds in Barracks level 1 and about 3.5 seconds at level 10.' },
      { p: 'To finish a batch with Gold, see [Finish now](/help/finish-now).' },
    ],
    related: ['military-buildings', 'research', 'finish-now', 'troop-upkeep'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'troop-upkeep',
    category: 'troops',
    title: 'How much crop do my troops eat?',
    keywords: ['troop upkeep', 'unit upkeep', 'crop per unit', 'army crop', 'feeding troops', 'food troops'],
    summary: 'Each unit eats its upkeep in crop every hour: 1 for most infantry, 2-4 for cavalry, 3 for rams, 6 for catapults, 4-5 for chiefs. This is not sped up on this world.',
    body: [
      { p: 'Upkeep is the "Crop" column in the troop tables and on each troop\'s info page.' },
      { p: 'Your village pays for its troops at home, on the move, on sale in the Gold market and held in traps. Troops reinforcing someone else are fed by the host.' },
      { p: 'Upkeep also counts for points: killing troops gives attack or defence points equal to their upkeep.' },
    ],
    related: ['crop-upkeep', 'starvation', 'unit-roles', 'attack-defence-points'],
  },
  {
    id: 'carry-capacity',
    category: 'troops',
    title: 'How much loot can my troops carry?',
    keywords: ['carry', 'capacity', 'loot', 'bounty', 'haul', 'how much loot', 'carry capacity', 'booty'],
    summary: 'Each unit carries a fixed amount of resources (for example Clubswinger 60, Equites Imperatoris 100). Only survivors carry; scouts, rams, catapults and chiefs carry nothing.',
    body: [
      { p: 'The total carry is shown when you train troops, on Send troops, and in the farm list.' },
      { p: 'Big carriers: Paladin 110, Equites Imperatoris 100, Teutonic Knight 80, Theutates Thunder 75. For the crop it eats, the Clubswinger (60 for 1 crop) carries the most.' },
      { p: 'Gold and Diamond token holders get +10% / +20% carry. The total of all carry bonuses is at most +50%.' },
      { p: 'Loot is shared evenly between the four resources. See [Loot](/help/loot).' },
    ],
    related: ['loot', 'raiding-economy', 'unit-roles'],
  },
  {
    id: 'troop-speed',
    category: 'troops',
    title: 'How fast do troops travel?',
    keywords: ['speed', 'travel time', 'distance', 'how long', 'arrival', 'fields per hour', 'walk', 'march', 'slowest unit'],
    summary: 'A group moves at the speed of its slowest unit. Travel time = distance / speed in hours, divided by the world\'s troop speed (x100 here).',
    body: [
      { p: 'Speed is in fields per hour on a normal (x1) world. On this world divide the time by 100.' },
      { p: 'Example: 10 fields with Clubswingers (speed 7) take 10 / 7 = 1.43 hours on x1, about 51 seconds here.' },
      { p: 'The hero moves at the speed of the unit it was trained from.' },
      { p: 'Faster with: Tournament Square (beyond 30 fields), Boots of the mercenary artifact.' },
      { p: 'The map wraps around at the edges, so the shortest way may go "over the edge".' },
      { p: 'Fastest units: Theutates Thunder 19, Pathfinder 17, Equites Legati 16, Druidrider 16. Slowest: catapults 3, rams 4.' },
    ],
    related: ['tournament-square', 'send-troops', 'troop-movements'],
  },
  {
    id: 'troop-guide',
    category: 'troops',
    title: 'Where can I see all troop details?',
    keywords: ['troop guide', 'unit info', 'unit page', 'troop list', 'stats', 'all units', 'animals list', 'info'],
    summary: 'The All troops page lists every unit of every tribe and the oasis animals. Click a troop for its stats, cost, training time, requirements and upgrade table.',
    body: [
      { p: 'Each troop page shows: attack, defence against infantry and cavalry, speed, carry, upkeep, cost, training time on this world, what it needs, research cost and all Blacksmith/Armoury levels.' },
      { p: 'Every troop picture in the game links to its page.' },
      { p: 'Examples: [Legionnaire](/unit/romans/0), [Clubswinger](/unit/teutons/0), [Phalanx](/unit/gauls/0).' },
    ],
    related: ['unit-roles', 'upgrades', 'research'],
    links: [{ href: '/units', label: 'All troops' }],
  },

  /* ================================================================== */
  /* Attacking & raiding                                                 */
  /* ================================================================== */
  {
    id: 'send-troops',
    category: 'combat',
    title: 'How do I send troops?',
    keywords: ['send troops', 'attack', 'how to attack', 'send army', 'go', 'march', 'rally point send', 'target', 'coordinates'],
    summary: 'Open Rally Point, Send troops, choose the units, type the target coordinates, pick the mission (reinforce, attack, raid, scout) and confirm.',
    body: [
      {
        steps: [
          'Open [Send troops](/troops/send), or click a village or oasis on the [Map](/map) and choose an action.',
          'Enter how many of each unit. "Select all troops" fills everything.',
          'Enter the target X and Y, or pick a saved place or one of your villages.',
          'Choose the mission: Reinforcement, Normal attack, Raid or Scout.',
          'Tick the hero box if your hero should go too (not for scouting or settling).',
          'Check the confirm page: target, arrival time and carry. Click OK.',
        ],
      },
      { p: 'You need a Rally Point. Each Rally Point level allows 5 outgoing movements.' },
      { note: 'Sent troops **cannot be called back**. Check the target before you confirm.' },
      { p: 'You cannot attack players under protection. Attacking, raiding or scouting a player ends your own protection.' },
    ],
    related: ['attack-vs-raid', 'rally-point', 'troop-movements', 'beginner-protection'],
    links: [
      { href: '/troops/send', label: 'Send troops' },
      { href: '/map', label: 'Map' },
    ],
  },
  {
    id: 'attack-vs-raid',
    category: 'combat',
    title: 'Normal attack, raid, reinforcement or scouting: which one?',
    keywords: ['attack', 'raid', 'normal attack', 'difference', 'reinforce', 'scout', 'mission', 'mode', 'attack type', 'raid vs attack'],
    summary: 'A raid steals resources and both sides lose only part of their troops. A normal attack fights to the end and is needed for rams, catapults, chiefs and capturing oases.',
    body: [
      {
        table: {
          head: ['', 'Raid', 'Normal attack'],
          rows: [
            ['Fight', 'Both sides lose a part', 'The loser loses everything'],
            ['Loot from villages', 'Yes, even if you lose (survivors carry)', 'Only if you win'],
            ['Rams and catapults', 'Do nothing', 'Work'],
            ['Chiefs (loyalty)', 'No', 'Yes, if you win'],
            ['Capture an oasis or artifact', 'No', 'Yes (with your hero)'],
            ['Free your trapped soldiers', 'No', 'Yes, if you win'],
          ],
        },
      },
      { p: '**Reinforcement**: your troops go to help a village and stay there until you call them back.' },
      { p: '**Scout**: only scouts go. They see resources and troops. See [Scouting](/help/scouting).' },
      { tips: ['Use raids for farming resources.', 'Use normal attacks to clear out an army, break walls or destroy buildings.'] },
    ],
    related: ['send-troops', 'battle-basics', 'loot', 'scouting', 'reinforcements'],
    links: [{ href: '/troops/send', label: 'Send troops' }],
  },
  {
    id: 'battle-basics',
    category: 'combat',
    title: 'How is a battle calculated?',
    keywords: ['battle', 'combat', 'fight', 'formula', 'how battle works', 'losses', 'casualties', 'win', 'lose', 'defence points', 'attack points', 'calculation'],
    summary: 'Total attack is compared with total defence. The stronger side wins; the weaker side\'s strength decides how many the winner loses.',
    body: [
      {
        steps: [
          '**Attack**: sum of the attackers\' attack values (with Blacksmith levels), times bonuses (hero, War Banner, Brewery) and times morale.',
          '**Defence**: every army in the village defends. Each unit counts its defence against infantry and against cavalry, mixed by how much of the attack is infantry or cavalry.',
          'Add a base defence of 10, plus 2 x level x level for a Residence or Palace. Multiply by the wall bonus and defence bonuses.',
          'If attack is higher than defence, the attacker wins.',
        ],
      },
      { p: '**Normal attack**: the loser loses all troops. The winner loses (weaker / stronger) to the power of about 1.5. Example: attack twice as strong as defence, the attacker loses about 35%.' },
      { p: '**Raid**: both sides lose a part. With attack twice the defence, the attacker loses about 26% and the defender about 74%.' },
      { p: 'Very big battles hurt the winner a bit more (the power falls from 1.5 to about 1.26).' },
      { p: 'Scouts add no attack in battles. Rams, catapults and chiefs count as infantry.' },
      { p: 'Test any fight first in the [Combat simulator](/simulator). It uses the same code as real battles.' },
    ],
    related: ['combat-simulator', 'morale', 'walls', 'attack-vs-raid', 'hero-battle'],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
  {
    id: 'morale',
    category: 'combat',
    title: 'What is morale? Why was my attack weaker?',
    keywords: ['morale', 'weaker attack', 'big player', 'small player', 'population difference', 'bonus small', 'penalty'],
    summary: 'When a bigger player (more population) attacks a smaller one, the attack is weakened by up to one third. Morale does not help the attacker.',
    body: [
      {
        table: {
          head: ['Attacker population vs defender', 'equal or smaller', '2 times', '4 times', 'about 8 times or more'],
          rows: [['Attack strength', '100%', 'about 87%', 'about 76%', '66.7% (lowest)']],
        },
      },
      { p: 'The effect is full when your attack is at least as strong as the defence. It gets smaller when your attack is weaker than the defence.' },
      { p: 'Morale also weakens catapults and chiefs of a much bigger attacker. Oases have no morale.' },
      { p: 'Population means the total of all villages of each player.' },
    ],
    related: ['battle-basics', 'catapults', 'conquer'],
  },
  {
    id: 'rams',
    category: 'combat',
    title: 'Rams and walls',
    keywords: ['ram', 'rams', 'battering ram', 'break wall', 'destroy wall', 'wall damage', 'siege'],
    summary: 'Rams lower the enemy wall in normal attacks. They strike before the fight, so the battle is fought against the weaker wall, and they damage the wall even if you lose.',
    body: [
      { p: 'Rams work only in **normal attacks**, not in raids.' },
      { p: 'How much they destroy depends on: number of rams, their Blacksmith level, and how strong your attack is compared with the defence.' },
      { p: 'Walls are not equally hard: Earth Wall (Teutons) is 5 times and Palisade (Gauls) 2 times as hard to ram as the City Wall (Romans).' },
      { p: 'A Stonemason\'s Lodge in the capital and the Architects\' secret artifact make walls sturdier.' },
      { p: 'The [Combat simulator](/simulator) shows the wall level after your rams.' },
    ],
    related: ['walls', 'catapults', 'combat-simulator', 'stonemason'],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
  {
    id: 'catapults',
    category: 'combat',
    title: 'Catapults: destroying buildings and choosing targets',
    keywords: ['catapult', 'catapults', 'trebuchet', 'fire catapult', 'destroy building', 'target', 'cata', 'siege', 'demolish enemy', 'random target'],
    summary: 'Catapults hit buildings after a won normal attack. What you can aim at depends on your Rally Point level; below level 3 they hit at random.',
    body: [
      { p: 'Catapults fire only in a **normal attack that you win**.' },
      {
        table: {
          head: ['Your Rally Point', 'You can aim at'],
          rows: [
            ['below 3', 'Random only'],
            ['3', 'Warehouse, Granary'],
            ['5', 'Also resource fields and production bonus buildings'],
            ['10', 'All buildings except Cranny, Stonemason\'s Lodge, Trapper and walls'],
            ['20', 'Two targets, if you send at least 20 catapults (each target gets half)'],
          ],
        },
      },
      { p: 'If the target building is not there, or you may not aim at it, the catapults hit a random building or field. Random hits never hit the wall.' },
      { p: 'Damage depends on the number of catapults, their Blacksmith level, how much stronger your attack was, and morale.' },
      { p: 'Catapults always hit random targets when the target holds a Rivals\' confusion artifact.' },
      { p: 'A village whose population drops to 0 is destroyed (not a capital, not a player\'s last village). See [Village destroyed](/help/village-destroyed).' },
    ],
    related: ['rally-point', 'rams', 'village-destroyed', 'conquer', 'artifact-capture'],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
  {
    id: 'scouting',
    category: 'combat',
    title: 'How does scouting work?',
    keywords: ['scout', 'scouting', 'spy', 'spying', 'pathfinder', 'equites legati', 'reconnaissance', 'scout report', 'intel', 'see troops'],
    summary: 'Send only scouts on a Scout mission. If at least one survives, you see the target\'s resources, troops, hero, wall level and how much the cranny hides.',
    body: [
      { p: 'Only scouts fight scouts. Each of your scouts has 35 scouting strength, each defending scout 20 (both with upgrades). The defender\'s wall helps his scouts.' },
      { p: 'Your scouts die in proportion to the defence. The mission fails only if **all** your scouts die.' },
      { p: 'Defending scouts never die.' },
      { p: 'The defender gets a report **only if he has scouts** in the village.' },
      { p: 'Scouting an oasis always works. You see the animals and the resources lying there.' },
      { p: 'Scout reports have a "Simulate" link that fills the [Combat simulator](/simulator) with what you saw.' },
      { tips: ['Scout before every big attack.', 'Keep some scouts at home: they stop enemy scouting and warn you.'] },
    ],
    related: ['attack-vs-raid', 'combat-simulator', 'reports'],
    links: [{ href: '/troops/send', label: 'Send troops' }],
  },
  {
    id: 'loot',
    category: 'combat',
    title: 'How much do I steal, and what does the cranny protect?',
    keywords: ['loot', 'steal', 'bounty', 'haul', 'resources stolen', 'plunder', 'how much loot', 'empty raid', 'resources taken'],
    summary: 'Survivors take what the target has above its cranny protection, up to their carry capacity, split evenly between the four resources.',
    body: [
      { p: 'From a **village**: raids always take loot if troops survive. Normal attacks take loot only if they win.' },
      { p: 'From an **oasis**: you must win the fight (raid or attack) to take loot.' },
      { p: 'The defender\'s cranny keeps a share of each resource hidden. Teuton attackers find more: the cranny hides only 80% against them.' },
      { p: 'Loot that does not fit into your storage when the troops get home is lost.' },
      { p: 'The movement list shows the haul of returning troops. Click the movement for details.' },
    ],
    related: ['cranny', 'carry-capacity', 'raiding-economy', 'attack-vs-raid'],
  },
  {
    id: 'reports',
    category: 'combat',
    title: 'How do I read reports?',
    keywords: ['reports', 'report', 'battle report', 'result', 'casualties', 'what happened', 'scout report', 'trade report', 'notification'],
    summary: 'Every battle, scouting, delivery, reinforcement and settling creates a report. It shows both armies, losses, loot, heroes, wall and building damage and notes.',
    body: [
      { p: 'Tabs: All, Attacks, Defence, Scouting, Trade, Other.' },
      { p: 'A battle report shows: troops sent, casualties, the hero (health and experience), loot and carry, wall and building changes, loyalty and special notes.' },
      { p: 'If none of your attackers came back, you do not see the defender\'s troops.' },
      { p: 'Owners of reinforcements in an attacked village also get the report.' },
      { p: 'Managing many reports: see [Deleting reports and messages](/help/reports-manage).' },
    ],
    related: ['reports-manage', 'battle-basics', 'scouting'],
    links: [{ href: '/reports', label: 'Reports' }],
  },
  {
    id: 'combat-simulator',
    category: 'combat',
    title: 'How do I use the combat simulator?',
    keywords: ['simulator', 'combat simulator', 'sim', 'calculate battle', 'test attack', 'battle calculator', 'warsim', 'how many troops'],
    summary: 'The simulator fights a battle with the real battle code without changing anything. Enter both armies and see the winner, losses, wall and building damage, and how much stronger you need to be.',
    body: [
      {
        steps: [
          'Open [Combat simulator](/simulator). It starts with your own troops.',
          'Choose normal attack or raid, and village or oasis.',
          'Enter the attacker: tribe, troops, Blacksmith levels, hero (unit, points, bonus), population and attack bonus %.',
          'Enter the defender: tribe, troops, Armoury levels, hero, wall, Residence/Palace, Stonemason, population, defence bonus % and free traps (Gauls). Add up to two reinforcement armies.',
          'For catapults, enter the target building\'s level.',
          'Results update as you type.',
        ],
      },
      { p: 'Results: winner, attack vs defence, casualties and survivors, hero death, wall after rams, building after catapults, how much the survivors can carry, and how much stronger (or weaker) the attack could be.' },
      { p: '"Simulate" links on map villages, oases and scout reports fill it with what you know.' },
      { note: 'Random catapult targets are not simulated. World speed does not change battles.' },
    ],
    related: ['battle-basics', 'scouting', 'traps', 'morale'],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
  {
    id: 'troop-movements',
    category: 'combat',
    title: 'Where are my troops? (troop movements)',
    keywords: ['movements', 'troop movements', 'outgoing', 'incoming', 'returning', 'where are my troops', 'arrival', 'haul', 'on the way'],
    summary: 'The Rally Point lists all movements with All, Incoming, Outgoing and Returning tabs. Click your own movement to see the exact troops and the haul.',
    body: [
      { p: 'The Village overview shows a short summary, for example "3 Outgoing, first in 0:20:37".' },
      { p: 'Your own movements open a detail page: troops, hero, from/to, departure, arrival and the haul with % of carry.' },
      { p: 'Incoming enemy attacks show only the sender and arrival time. You cannot see which troops are coming.' },
      { p: 'The map shows small markers on targets: red for attack/raid, green for reinforcement, blue for settlers, brown for returning troops.' },
    ],
    related: ['incoming-attacks', 'send-troops', 'rally-point'],
    links: [{ href: '/troops', label: 'Rally Point' }],
  },
  {
    id: 'auto-training',
    category: 'troops',
    title: 'Auto training',
    keywords: ['auto training', 'auto train', 'automatic training', 'train troops automatically', 'queue troops', 'resource share', 'percent', 'spend resources', 'training bot', 'mass training'],
    summary: 'On the Train troops page, give the troops you want a % share of your resources and run it for 1 to 8 hours. Every minute it spends what the village has by those shares and queues as many troops as that buys.',
    body: [
      {
        steps: [
          'Open [Train troops](/troops/train#auto) and scroll to **Auto training**.',
          'Pick how long it runs: 1 to 8 hours.',
          'Give troops a **share in %** - e.g. Praetorian 60%, Equites Imperatoris 40%. Or press a **Quick setup** (strongest attack, strongest defence, most loot), or **rest** on a row to give it all % not used yet.',
          'Check the forecast, then press **Start auto training**.',
        ],
      },
      { p: 'Right away and then every minute, each troop gets its share of your **current stock** and as many as that buys go into the queue (you see them under In training). Whatever is left over (troops are limited by their scarcest resource) is split again, up to three times, so little stays idle.' },
      { p: 'Shares below 100% keep the rest in stock - e.g. 80% in total keeps 20% for buildings.' },
      { p: 'Each row shows how many it trains **now** from your stock and **per hour** from your income, and which resource limits it. The cards show how much of each resource\'s income the plan uses. The busy bar shows whether a building can keep up; above 100% resources pile up.' },
      { p: 'Queues are never filled past the end of the run. Orders for the same troop are added to one queue line.' },
      { note: 'When the time is up auto training stops and the Info box tells you. Your settings are kept: open Train troops and press **Start** again. Settlers and chiefs are never auto-trained.' },
    ],
    related: ['send-troops', 'farm-lists'],
    links: [{ href: '/troops/train#auto', label: 'Train troops' }],
  },
  {
    id: 'farm-lists',
    category: 'combat',
    title: 'Farm lists (Gold Club)',
    keywords: ['farm list', 'farmlist', 'farming', 'raid list', 'auto raid', 'raid all', 'farms', 'auto farm list'],
    summary: 'With the Gold Club, save up to 100 raid targets per list (10 lists) and raid them all with one click, or automatically every 15, 30, 60 or 120 minutes.',
    body: [
      {
        steps: [
          'Join the Gold Club (200 Gold, once per world).',
          'Open [Farm list](/troops/farmlist) and create a list for a village.',
          'Add targets (villages or oases) with the troops for each.',
          'Or use **Add all free oases** within 1 to 35 fields, with a minimum of resources.',
          'Click **Raid all** or tick targets and **Raid selected**. Or choose auto-repeat.',
        ],
      },
      { p: 'Each raid follows the normal rules: troops must be at home, the target must not be protected, and the Rally Point limit applies. Targets that cannot be raided are skipped with a note.' },
      { p: 'Each target shows its last result (won without losses, won with losses, lost) and the loot. Oasis targets show resources and animals.' },
      { p: '**Remove oases with less than N resources** cleans a list.' },
    ],
    related: ['gold-club', 'oasis-raider', 'raiding-economy', 'oasis-raiding'],
    links: [{ href: '/troops/farmlist', label: 'Farm list' }],
  },
  {
    id: 'oasis-raider',
    category: 'combat',
    title: 'Oasis Raider: automatic oasis raids (Gold Club)',
    keywords: ['oasis raider', 'auto raider', 'automatic raid', 'bot', 'auto farm', 'oasis farming', 'raider settings', 'spread', 'richest first'],
    summary: 'A Gold Club tool: turn it on and it raids the best free oases around a village by itself, every 5 to 60 minutes, and sizes each raid to carry the loot.',
    body: [
      { p: 'Find it at Rally Point, [Farm list](/troops/farmlist). There is one raider per village.' },
      {
        table: {
          head: ['Setting', 'Meaning'],
          rows: [
            ['Range', '1 to 35 fields around the village'],
            ['Only oases with', 'Minimum resources lying in the oasis'],
            ['Animals', '0 = only empty oases. Higher = it brings 1.5 times the attack needed to beat that many animals'],
            ['Every', 'Check every 5, 10, 15, 30 or 60 minutes; max raids per check (1-100)'],
            ['Spread (recommended)', 'Shares free troops over many oases; each raid gets a fair share, never more than its loot needs'],
            ['Richest first', 'The richest oasis gets all troops it needs, then the next one'],
            ['Fixed', 'The same group every raid'],
            ['Use / Keep at home', 'Which troop types it may use, and how many must stay home'],
          ],
        },
      },
      { p: 'It never sends a second raid to an oasis while one is on the way. It uses the fastest troops first.' },
      { p: 'Click **never raid** next to an oasis to skip it. **Raid now** runs a check at once.' },
      { p: 'It stops by itself if you lose the village or the Gold Club.' },
      { tips: ['Start with Animals = 0 and Spread.', 'Keep some defenders at home with "Keep at home".'] },
    ],
    related: ['gold-club', 'farm-lists', 'oasis-raiding', 'oasis-animals'],
    links: [{ href: '/troops/farmlist', label: 'Farm list and Oasis Raider' }],
  },

  /* ================================================================== */
  /* Defence & protection                                                */
  /* ================================================================== */
  {
    id: 'walls',
    category: 'defence',
    title: 'Walls: City Wall, Earth Wall, Palisade',
    keywords: ['wall', 'walls', 'city wall', 'earth wall', 'palisade', 'defence bonus', 'defense bonus', 'fortification'],
    summary: 'The wall multiplies the defence of all troops in the village. Romans get +3% per level, Gauls +2.5%, Teutons +2%, and it grows on top of itself.',
    body: [
      {
        table: {
          head: ['Wall', 'Level 5', 'Level 10', 'Level 20', 'Against rams'],
          rows: [
            ['City Wall (Romans)', '+16%', '+34%', '+81%', 'Normal'],
            ['Palisade (Gauls)', '+13%', '+28%', '+64%', '2 times harder'],
            ['Earth Wall (Teutons)', '+10%', '+22%', '+49%', '5 times harder'],
          ],
        },
      },
      { p: 'The wall has its own place around the village and needs no other building. Click the ring around the village to build it.' },
      { p: 'The wall bonus also helps your scouts against enemy scouts.' },
      { p: 'Catapults cannot aim at walls; only rams lower them.' },
      { p: 'When a village is conquered, its wall is destroyed and the new owner\'s wall type can be built.' },
    ],
    related: ['rams', 'defensive-play', 'battle-basics'],
    links: [{ href: '/slot/40', label: 'Wall' }],
  },
  {
    id: 'cranny',
    category: 'defence',
    title: 'How does the cranny work?',
    keywords: ['cranny', 'hide', 'hidden resources', 'protect resources', 'safe', 'hideout', 'raid protection', 'cranny percent'],
    summary: 'The cranny hides 3.5% of your storage per level (35% at level 10) of each resource from raiders. Gauls hide twice as much, but never more than 35%.',
    body: [
      {
        table: {
          head: ['Cranny level', '1', '2', '5', '10'],
          rows: [
            ['Hidden share (Romans, Teutons)', '3.5%', '7%', '17.5%', '35%'],
            ['Hidden share (Gauls)', '7%', '14%', '35%', '35%'],
          ],
        },
      },
      { p: 'The share is of your **storage capacity**: Warehouse for wood, clay and iron, Granary for crop. Example: Warehouse holds 11,800 and the cranny is level 10, so 4,130 of each of wood, clay and iron is safe.' },
      { p: 'One cranny per village, maximum level 10. It is cheap and fast to build.' },
      { p: 'Against **Teuton** attackers the cranny hides only 80% of its amount.' },
      { p: 'The Rivals\' confusion artifact makes it hide more (still at most 35%).' },
      { tips: ['Build the cranny to level 10 before your protection ends.', 'Gauls need only level 5 to reach the 35% maximum.'] },
    ],
    related: ['loot', 'storage', 'defensive-play', 'beginner-protection'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'traps',
    category: 'defence',
    title: 'Gaul traps (Trapper)',
    keywords: ['trapper', 'traps', 'trap', 'prisoners', 'captured troops', 'gaul traps', 'free prisoners', 'release prisoners'],
    summary: 'Gauls build traps in the Trapper. Each free trap catches one attacker before the fight; prisoners stay until the Gaul frees them or their side wins an attack on that village.',
    body: [
      { p: 'Build the Trapper (needs Rally Point 1), then build traps on its page. Each trap costs 20 wood, 30 clay, 10 iron, 20 crop and is ready at once.' },
      {
        table: {
          head: ['Trapper level', '1', '5', '10', '15', '20'],
          rows: [['Traps', '10', '64', '154', '265', '400']],
        },
      },
      { p: 'You can build more than one Trapper after the first is level 20.' },
      { p: 'Traps catch attackers from attacks **and** raids (not scouts), taken evenly from every unit type. Caught units do not fight.' },
      { p: 'Prisoners are fed by their home village.' },
      { p: 'If the prisoners\' village wins a **normal attack** on the trap village, its prisoners are freed. A quarter die escaping, and only a third of the broken traps are repaired.' },
      { p: 'The Gaul can **Release all prisoners**. They walk home and all traps are ready again.' },
      { p: 'The [Combat simulator](/simulator) has a field for free traps.' },
    ],
    related: ['gauls-tips', 'defensive-play', 'combat-simulator'],
  },
  {
    id: 'reinforcements',
    category: 'defence',
    title: 'Reinforcements: helping other villages and getting help',
    keywords: ['reinforce', 'reinforcement', 'support', 'help', 'defend ally', 'send defence', 'deff', 'withdraw', 'send back', 'troops home', 'call back'],
    summary: 'Send troops as Reinforcement to defend another village. They fight there until you withdraw them, and the host village feeds them.',
    body: [
      { p: 'Send troops with the mission **Reinforcement**. They stay in the target village and defend it against every attack.' },
      { p: 'The **host feeds** the reinforcements. If the host runs out of crop, reinforcements starve first.' },
      { p: 'Reinforcing **your own** village with your hero moves the hero\'s home to that village.' },
      { p: 'The Rally Point shows "Your troops in other villages" with a button to **withdraw** them, and "Reinforcements in this village" with a button to **send them back**.' },
      { p: 'Each army uses the Armoury levels of its own home village.' },
      { tips: ['Defensive cavalry (Druidrider, Paladin) arrives fastest.', 'Mix defence against infantry and against cavalry.'] },
    ],
    related: ['defensive-play', 'crop-upkeep', 'incoming-attacks', 'hero-battle'],
    links: [{ href: '/troops', label: 'Rally Point' }],
  },
  {
    id: 'evasion',
    category: 'defence',
    title: 'Evasion: let your capital\'s troops escape (Gold Club)',
    keywords: ['evasion', 'evade', 'dodge', 'escape attack', 'save troops', 'hide troops', 'troops leave'],
    summary: 'With the Gold Club you can turn on evasion in your capital: when an attack or raid arrives, the capital\'s own troops at home leave and come back shortly after.',
    body: [
      { p: 'Turn it on at Rally Point, [Farm list](/troops/farmlist) while your capital is the active village.' },
      { p: 'Only the **capital** can evade, and only its **own troops at home**. Reinforcements and the hero stay.' },
      { p: 'The troops come back after a short time (about 1 minute on this world).' },
      { p: 'Evading troops do not defend, so the attacker may win against what is left and take loot.' },
      { tips: ['Use it for an offensive army you cannot afford to lose in defence.'] },
    ],
    related: ['gold-club', 'incoming-attacks', 'defensive-play'],
    links: [{ href: '/troops/farmlist', label: 'Farm list (evasion)' }],
  },
  {
    id: 'incoming-attacks',
    category: 'defence',
    title: 'I see an incoming attack. What can I do?',
    keywords: ['incoming attack', 'under attack', 'attacked', 'red warning', 'alert', 'enemy coming', 'attack coming', 'help'],
    summary: 'The Village overview shows a red alert with the time of the first attack. You can add defence, ask for help, spend or hide resources, or evade.',
    body: [
      { note: 'An attack already on its way is not stopped by protection bought, or an alliance or pact made, after it was sent (classic rule).' },
      { p: 'You see the sender and arrival time, but not the troops. Incoming scouts are shown as "Incoming scouts".' },
      {
        steps: [
          'Check the arrival time at the [Rally Point](/troops).',
          'Spend resources (build, train) so there is little to steal.',
          'Train defenders if there is time, or ask your alliance for reinforcements.',
          'Scout the attacker to guess what is coming.',
          'If you cannot hold, send your troops away (for example as reinforcement to your other village) so they survive, or use Gold Club evasion in the capital.',
        ],
      },
      { note: 'Protection (beginner or bought) only stops **new** attacks from being sent. Attacks that are already on the way still arrive.' },
    ],
    related: ['reinforcements', 'evasion', 'cranny', 'defensive-play', 'buy-protection'],
    links: [{ href: '/troops', label: 'Rally Point' }],
  },
  {
    id: 'defence-tips',
    category: 'defence',
    title: 'Simple defence rules',
    keywords: ['defence tips', 'defense tips', 'how to defend', 'stop raids', 'farmed', 'being raided', 'protect village', 'anti raid'],
    summary: 'Keep a cranny, a wall and some defensive troops, spend your resources, and don\'t be the easiest target near your neighbours.',
    body: [
      {
        tips: [
          'Cranny level 10 (Gauls 5) hides 35% of your storage.',
          'A few defensive units plus a wall make raids cost the raider more than they bring.',
          'Mix infantry and cavalry defence: attackers can bring either.',
          'Spend before you log out: build, train, or send resources to another village.',
          'Keep scouts at home. They block enemy scouting.',
          'Gauls: build traps; each one catches an attacker.',
          'Join an active alliance and reinforce each other.',
        ],
      },
    ],
    related: ['defensive-play', 'walls', 'cranny', 'traps', 'reinforcements'],
  },

  /* ================================================================== */
  /* Hero                                                                */
  /* ================================================================== */
  {
    id: 'hero-train',
    category: 'hero',
    title: 'How do I get a hero?',
    keywords: ['hero', 'train hero', 'get hero', 'make hero', 'create hero', 'new hero', 'heroes', 'hero mansion'],
    summary: 'Build a Hero\'s Mansion, then choose one researched infantry or cavalry soldier at home: it becomes your hero. It costs twice the unit\'s price and 1.6 times its training time.',
    body: [
      {
        steps: [
          "Build the Hero's Mansion (Main Building 3, Rally Point 1).",
          'Have at least one researched fighting unit at home (not a scout, ram, catapult, chief or settler).',
          'Open the [Hero](/hero) page and choose the unit. The soldier is used up.',
          'Pay twice the unit\'s cost. Training takes 1.6 times the unit\'s training time (Legionnaire: 32 seconds on this world).',
        ],
      },
      { p: 'The hero keeps the unit\'s strengths and **speed**. A cavalry hero fights as cavalry.' },
      { p: 'You can have one hero. Its home is the village where it was trained.' },
      { p: 'The hero eats 6 crop per hour.' },
      { tips: ['A fast cavalry unit makes a fast hero, good for raiding oases.', 'A defensive unit makes a better defending hero.'] },
    ],
    related: ['hero-skills', 'heros-mansion', 'hero-battle', 'hero-revive'],
    links: [{ href: '/hero', label: 'Hero' }],
  },
  {
    id: 'hero-skills',
    category: 'hero',
    title: 'Hero skills and points',
    keywords: ['hero skills', 'skill points', 'hero points', 'attack points', 'defence points', 'attack bonus', 'defence bonus', 'regeneration', 'build hero', 'distribute'],
    summary: 'Your hero gets 5 skill points at level 0 and 5 more per level. There are five skills: Attack, Defence, Attack bonus, Defence bonus and Regeneration, each up to 100 points.',
    body: [
      {
        table: {
          head: ['Skill', 'Effect'],
          rows: [
            ['Attack', 'The hero\'s own attack value grows with each point'],
            ['Defence', 'The hero\'s own defence against infantry and cavalry grows'],
            ['Attack bonus', '+0.2% attack per point for the army it attacks with (max +20%)'],
            ['Defence bonus', '+0.2% defence per point for its own army in defence (max +20%)'],
            ['Regeneration', 'Health regrows 10% + 5% per point per day (x100 here)'],
          ],
        },
      },
      { p: 'Example: a Legionnaire hero has 50 attack with 0 points and 590 with 10 attack points.' },
      { note: 'At **level 0** you can move points freely. After level 1, points can only be **added**, never moved.' },
      { tips: ['Raiding hero: Attack and some Regeneration.', 'Defensive hero: Defence and Defence bonus, kept at home.'] },
    ],
    related: ['hero-experience', 'hero-health', 'hero-battle'],
    links: [{ href: '/hero', label: 'Hero' }],
  },
  {
    id: 'hero-experience',
    category: 'hero',
    title: 'How does my hero gain experience and levels?',
    keywords: ['hero experience', 'xp', 'exp', 'hero level', 'level up', 'experience points', 'how to level hero'],
    summary: 'The hero gets experience equal to the upkeep of the enemies killed in its battles (a killed hero counts 6). Animals count too.',
    body: [
      {
        table: {
          head: ['Hero level', '1', '2', '3', '5', '10', '20'],
          rows: [['Total experience needed', '100', '300', '600', '1,500', '5,500', '21,000']],
        },
      },
      { p: 'Formula: level L needs 50 x L x (L+1) experience in total.' },
      { p: 'An attacking hero gets the upkeep of all defenders killed. Defending heroes share the upkeep of the attackers killed.' },
      { p: 'Example: killing 10 wolves (upkeep 2 each) gives 20 experience.' },
      { tips: ['Attack oases with animals together with your hero: cheap experience.'] },
    ],
    related: ['hero-skills', 'oasis-animals', 'hero-battle'],
    links: [{ href: '/hero', label: 'Hero' }],
  },
  {
    id: 'hero-health',
    category: 'hero',
    title: 'Hero health and regeneration',
    keywords: ['hero health', 'hp', 'regeneration', 'heal hero', 'hero damage', 'hurt', 'injured', 'health regen'],
    summary: 'In a battle the hero loses as much health (in %) as its army loses troops. Health regrows 10% per day plus 5% per Regeneration point, times 100 on this world.',
    body: [
      { p: 'Example: the hero\'s army loses 30% of its troops, so the hero loses 30 health.' },
      { p: 'On this x100 world the base regrowth is 1,000% per day: about 42% per hour, even with 0 Regeneration points.' },
      { p: 'Health regrows only while the hero is alive.' },
      { p: 'At 0 health the hero dies. See [Hero death and revival](/help/hero-revive).' },
    ],
    related: ['hero-revive', 'hero-skills', 'hero-battle'],
  },
  {
    id: 'hero-revive',
    category: 'hero',
    title: 'My hero died. How do I revive it?',
    keywords: ['hero died', 'dead hero', 'revive', 'revival', 'resurrect', 'hero dead', 'new hero', 'hero killed'],
    summary: 'Revive your hero on the Hero page in its home village. It keeps its level and points; cost and time grow with its level.',
    body: [
      { p: 'The hero dies when its army loses **more than 90%** in a battle, when its whole army is wiped out, or when its health reaches 0.' },
      { p: 'It also dies if its home village is conquered or destroyed while it is there.' },
      {
        steps: [
          'Open the [Hero](/hero) page.',
          'Click Revive. The resources are taken from the home village.',
          'Wait for the revival. The hero comes back with full health.',
        ],
      },
      { p: 'Cost: 2 x the unit\'s cost (+30 per resource after level 0), times (level + 1) to the power 1.25. Time: 1.6 x the unit\'s training time x (level + 1).' },
      { p: 'Example: a level 10 Legionnaire hero costs 5,409 wood, 4,608 clay, 6,611 iron, 1,803 crop and takes about 6 minutes on this world.' },
      { p: 'Instead of reviving, you can train a new level 0 hero from another unit.' },
    ],
    related: ['hero-health', 'hero-train', 'hero-battle'],
    links: [{ href: '/hero', label: 'Hero' }],
  },
  {
    id: 'hero-battle',
    category: 'hero',
    title: 'How does the hero fight?',
    keywords: ['hero in battle', 'hero attack', 'hero defend', 'send hero', 'hero alone', 'hero fight', 'hero with troops'],
    summary: 'The hero fights with the army it travels with, like a strong extra unit, and its bonus helps only that army. A hero at home defends with the village troops.',
    body: [
      { p: 'Tick the hero box on Send troops to take it along on an attack, raid or reinforcement. It cannot join scouting or settling.' },
      { p: 'The group moves at the speed of the slowest member, hero included.' },
      { p: 'A hero at home defends its village. A hero sent as reinforcement defends where it stands.' },
      { p: 'Only a hero that survives a won normal attack can **capture an oasis** or **carry off an artifact**.' },
      { note: 'Sending the hero alone is risky: if it loses a normal attack, its "army" is wiped out and it dies.' },
    ],
    related: ['hero-skills', 'hero-health', 'capture-oasis', 'artifact-capture'],
    links: [{ href: '/troops/send', label: 'Send troops' }],
  },
  {
    id: 'hero-oases',
    category: 'hero',
    title: 'Hero and oases',
    keywords: ['hero oasis', 'hero animals', 'hero xp oasis', 'annex with hero', 'hero capture'],
    summary: 'Your hero is needed to capture oases, and fighting oasis animals is a safe way to earn hero experience.',
    body: [
      { p: 'To **capture** an oasis, your hero must be in a won normal attack that kills every animal. See [Capture an oasis](/help/capture-oasis).' },
      { p: 'Each killed animal gives experience equal to its upkeep (Rat 1 up to Elephant 5).' },
      { p: 'Bring enough troops: the hero loses health equal to the army\'s losses.' },
    ],
    related: ['capture-oasis', 'oasis-animals', 'hero-experience'],
    links: [{ href: '/map', label: 'Map' }],
  },

  /* ================================================================== */
  /* Oases                                                               */
  /* ================================================================== */
  {
    id: 'oasis-animals',
    category: 'oases',
    title: 'Which animals live in oases?',
    keywords: ['animals', 'nature', 'oasis animals', 'rat', 'spider', 'snake', 'bat', 'wild boar', 'wolf', 'bear', 'crocodile', 'tiger', 'elephant', 'beasts'],
    summary: 'Free oases are guarded by animals that only defend. Each oasis type has its own mix; new animals appear while nobody holds the oasis - 350 defence power per real day, up to 8,000 power per oasis.',
    body: [
      {
        table: {
          head: ['Animal', 'Def. vs infantry', 'Def. vs cavalry', 'XP (upkeep)'],
          rows: [
            ['Rat', '25', '20', '1'],
            ['Spider', '35', '40', '1'],
            ['Snake', '40', '60', '1'],
            ['Bat', '66', '50', '1'],
            ['Wild Boar', '70', '33', '2'],
            ['Wolf', '80', '70', '2'],
            ['Bear', '140', '200', '3'],
            ['Crocodile', '380', '240', '3'],
            ['Tiger', '170', '250', '3'],
            ['Elephant', '440', '520', '5'],
          ],
        },
      },
      {
        table: {
          head: ['Oasis', 'Most animals possible'],
          rows: [
            ['Forest (+25% wood)', '10 rats, 8 boars, 6 wolves, 3 bears'],
            ['Clay', '10 rats, 8 spiders, 6 snakes, 2 bears'],
            ['Hill (+25% iron)', '8 rats, 8 spiders, 6 bats, 2 bears'],
            ['Lake (+25% crop)', '10 rats, 6 snakes, 2 crocodiles, 1 elephant'],
            ['Forest lake', '10 rats, 10 boars, 8 wolves, 4 bears, 2 tigers'],
            ['Clay lake', '10 rats, 10 spiders, 8 snakes, 3 crocodiles, 2 tigers'],
            ['Hill lake', '10 rats, 10 bats, 4 bears, 3 crocodiles, 1 elephant'],
            ['Fertile (+50% crop)', '12 rats, 10 snakes, 5 crocodiles, 4 tigers, 3 elephants'],
          ],
        },
      },
      { p: 'A new oasis starts with 50-100% of these numbers.' },
      { p: 'Animal growth uses real time, not world speed: about **350 power per day** (power = an animal\'s average defence), in the oasis\'s usual species mix, until the oasis holds **8,000 power**. A cleared oasis is safe to raid for a while; an untouched one keeps getting stronger.' },
      { p: 'Scout an oasis or click it on the [Map](/map) to see its animals.' },
    ],
    related: ['oasis-raiding', 'capture-oasis', 'hero-experience'],
    links: [{ href: '/units', label: 'All troops and animals' }],
  },
  {
    id: 'oasis-raiding',
    category: 'oases',
    title: 'Raiding oases for resources',
    keywords: ['raid oasis', 'oasis loot', 'oasis resources', 'farm oasis', 'oasis farming', 'free oasis', 'empty oasis'],
    summary: 'Free oases collect resources over time. On this world each +25% bonus gathers 4,000 per hour, up to 80,000 per resource. Win a raid or attack to take them.',
    body: [
      { p: 'Only **free** (not held) oases collect resources. They collect the resources of their bonus: a Forest oasis collects wood, a Fertile oasis collects crop twice as fast.' },
      { p: 'A fresh oasis starts half full (40,000 per resource on this world).' },
      { p: 'You must **win** the fight to take loot. Kill all animals first, or send enough troops to win.' },
      { p: 'Oasis raids never end your beginner protection.' },
      { p: 'Loot from oases counts for the **Robbers** weekly ranking. Killed animals count as **attack points**.' },
      {
        tips: [
          'Clear an oasis once with a strong attack (and your hero), then raid it with small groups.',
          'Scout first: the report shows animals and resources.',
          'Gold Club: farm lists and the Oasis Raider do this for you.',
        ],
      },
    ],
    related: ['oasis-animals', 'oasis-raider', 'farm-lists', 'raiding-economy', 'weekly-top10'],
    links: [{ href: '/map', label: 'Map' }],
  },
  {
    id: 'capture-oasis',
    category: 'oases',
    title: 'How do I capture an oasis?',
    keywords: ['oasis', 'capture', 'conquer oasis', 'take oasis', 'annex', 'occupy oasis', 'own oasis', 'claim oasis', 'oasis bonus', 'oaza'],
    summary: "Send a normal attack (not a raid) with your hero to a free oasis within 3 fields of your village, kill every animal, and have a Hero's Mansion at level 10 or more.",
    body: [
      { p: 'A held oasis can be defended: send reinforcements to it (you, your alliance and pact partners can). Those troops fight next to the animals, eat at home and come back with Withdraw on the Rally Point. Raiding a held oasis takes resources from the village that holds it (the cranny protects them). Beginner protection covers your oases too, and attacking someone\'s oasis ends your own protection.' },
      {
        steps: [
          "Build the **Hero's Mansion** to level 10. Level 15 and 20 let the village hold a 2nd and 3rd oasis.",
          'Pick an oasis **within 3 fields** of the village in both directions (a 7 x 7 square around it).',
          'Scout it and test your army in the [Combat simulator](/simulator) (choose "oasis").',
          'Send a **Normal attack** (not a raid) from that village, **with your hero**.',
          'Your attack must win and kill **every animal**, and your hero must survive.',
          'The oasis is now yours. Its bonus is added to that village\'s production.',
        ],
      },
      { p: 'If animals are left, attack again. Any normal attack with the hero that ends with 0 animals captures it.' },
      { p: '**Oasis held by another player**: each won normal attack with your hero lowers its loyalty (it starts at 100). At 0 the oasis is yours.' },
      {
        table: {
          head: ["Oases held by the owner's village", '1', '2', '3'],
          rows: [
            ['Loyalty lost per hero attack', '33', '50', '100'],
            ['Hero attacks needed (if none regrows)', '4', '2', '1'],
          ],
        },
      },
      { p: "Loyalty regrows by 2 per hour per level of the owner's Hero's Mansion (Mansion 10: 20 per hour, Mansion 20: 40 per hour). Send your hero attacks close together - on this fast world they arrive within minutes, so a few attacks in a row take the oasis." },
      { note: 'Raids, attacks without the hero, oases further than 3 fields, or no free oasis slot: the report explains what is missing.' },
      {
        tips: [
          'Choose oases with few animals, or clear them first with raids and a strong attack.',
          'Best bonus: a crop oasis next to a cropper village.',
          'When a village is conquered or destroyed, its oases become free again.',
        ],
      },
    ],
    related: ['heros-mansion', 'oasis-bonus', 'oasis-animals', 'hero-battle', 'release-oasis'],
    links: [
      { href: '/simulator', label: 'Combat simulator' },
      { href: '/hero', label: 'Hero' },
      { href: '/map', label: 'Map' },
    ],
  },
  {
    id: 'release-oasis',
    category: 'oases',
    title: 'How do I give up an oasis?',
    keywords: ['release oasis', 'abandon oasis', 'give up oasis', 'drop oasis', 'free oasis slot', 'swap oasis'],
    summary: "Open the Hero's Mansion and click Release next to the oasis. It becomes free again, and you can capture a better one.",
    body: [
      { p: 'A released oasis keeps the animals it had (usually none). They regrow slowly in real time.' },
      { p: 'It starts to collect resources again for raiders.' },
    ],
    related: ['capture-oasis', 'heros-mansion'],
  },
  {
    id: 'cropper-finder',
    category: 'oases',
    title: 'How do I find 9- and 15-croppers? (Cropper finder)',
    keywords: ['cropper finder', 'find cropper', '15c', '9c', 'crop village', 'search map', 'cropper', '15 crop'],
    summary: 'Gold Club members can list 9- and 15-crop fields within 10, 20 or 30 fields, with the best crop oasis bonus nearby and the owner if taken.',
    body: [
      { p: 'Open [Cropper finder](/map/croppers) from the Map. It shows up to 100 results, nearest first.' },
      { p: '"Oasis crop" adds the crop bonus of the best three oases within 3 fields of that spot (for example +150% with three Fertile oases).' },
      { p: 'Then send settlers there, or plan a conquest if it is taken.' },
    ],
    related: ['village-types', 'gold-club', 'settlers', 'capture-oasis'],
    links: [{ href: '/map/croppers', label: 'Cropper finder' }],
  },

  /* ================================================================== */
  /* New villages                                                        */
  /* ================================================================== */
  {
    id: 'culture-points',
    category: 'expansion',
    title: 'Culture points: how many do I need for a new village?',
    keywords: ['culture points', 'cp', 'culture', 'new village', 'second village', 'how many cp', 'expansion', 'kp'],
    summary: 'Every building level produces culture points each day. You need 2,000 for your 2nd village, 8,000 for the 3rd, 20,000 for the 4th and more after that.',
    body: [
      {
        table: {
          head: ['Village number', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
          rows: [['Culture points needed', '2,000', '8,000', '20,000', '39,000', '65,000', '99,000', '141,000', '191,000', '251,000']],
        },
      },
      { p: 'Points come from **all buildings and fields** of all your villages. Higher levels give more. On this world all culture is x100.' },
      { p: 'Example: Main Building level 10 gives 12 points per day on a normal world, 1,200 here.' },
      { p: 'Culture points are never spent. You need the total for founding **or** conquering a village.' },
      { p: 'Celebrations in the Town Hall give extra points.' },
    ],
    related: ['celebrations', 'settlers', 'expansion-slots', 'when-to-expand'],
  },
  {
    id: 'celebrations',
    category: 'expansion',
    title: 'Town Hall celebrations',
    keywords: ['celebration', 'party', 'town hall', 'small celebration', 'great celebration', 'festival', 'culture'],
    summary: 'The Town Hall holds celebrations that give culture points: a small one up to 500, a great one up to 2,000 (but never more than your daily culture production).',
    body: [
      { p: 'Town Hall needs Main Building 10 and Academy 10. One celebration at a time per village.' },
      {
        table: {
          head: ['', 'Small celebration', 'Great celebration'],
          rows: [
            ['Town Hall level', '1', '10'],
            ['Cost', '6,400 wood, 6,650 clay, 5,940 iron, 1,340 crop', '29,700 wood, 33,250 clay, 32,000 iron, 6,700 crop'],
            ['Culture points', 'Your daily production, at most 500', 'Your daily production, at most 2,000'],
            ['Time on this world', 'about 14 minutes at Town Hall 1', 'about 26 minutes at Town Hall 10'],
          ],
        },
      },
      { p: 'Each Town Hall level makes celebrations 3.6% shorter.' },
      { p: 'A **great** celebration also helps chiefs: in the attacking village each chief lowers loyalty by 5 more; in the defending village by 5 less.' },
    ],
    related: ['culture-points', 'conquer'],
  },
  {
    id: 'settlers',
    category: 'expansion',
    title: 'How do I found a new village with settlers?',
    keywords: ['settlers', 'settle', 'found village', 'new village', 'second village', 'expand', 'colonize', 'settler'],
    summary: 'Train 3 settlers in a Residence or Palace at level 10, have enough culture points, and send exactly 3 settlers to an empty field.',
    body: [
      {
        steps: [
          'Build a Residence or Palace to **level 10** (this gives a free expansion slot).',
          'Collect enough culture points (2,000 for your 2nd village).',
          'Train **3 settlers** in the Residence or Palace.',
          'Find an empty field on the [Map](/map) and choose "Found a village here".',
          'Send exactly 3 settlers and nothing else.',
        ],
      },
      { p: 'The new village starts with 800 of each resource and a Main Building at level 1.' },
      { p: 'If someone settles there first, or you lack culture points or a slot when they arrive, the settlers come home.' },
      { p: 'On this world one settler takes about 1.5 to 2 minutes at Residence level 10 (Gauls 88 s, Romans 104 s, Teutons 120 s), and less at higher levels.' },
    ],
    related: ['culture-points', 'expansion-slots', 'residence-palace', 'when-to-expand', 'village-types'],
    links: [{ href: '/map', label: 'Map' }],
  },
  {
    id: 'expansion-slots',
    category: 'expansion',
    title: 'Expansion slots: why can\'t I train settlers or chiefs?',
    keywords: ['expansion slot', 'slots', 'no free slot', 'cannot train settlers', 'cannot train chief', 'residence level 10', 'palace level'],
    summary: 'Each village gets expansion slots from its Residence (levels 10 and 20) or Palace (levels 10, 15 and 20). One slot = 3 settlers or 1 chief, and it stays used by the village founded or conquered.',
    body: [
      {
        table: {
          head: ['Building', 'Level 10', 'Level 15', 'Level 20'],
          rows: [
            ['Residence', '1 slot', '1 slot', '2 slots'],
            ['Palace', '1 slot', '2 slots', '3 slots'],
          ],
        },
      },
      { p: 'Settlers and chiefs you own (at home, travelling or in training) already count. The training page says "No free expansion slot" when they are used up.' },
      { p: 'Each founded or conquered village uses one slot of the village that sent the settlers or chief.' },
      { p: 'Culture points are a separate condition. You need both.' },
    ],
    related: ['residence-palace', 'settlers', 'conquer', 'culture-points'],
  },
  {
    id: 'conquer',
    category: 'expansion',
    title: 'How do I conquer a village with chiefs?',
    keywords: ['conquer', 'chief', 'senator', 'chieftain', 'loyalty', 'take over', 'capture village', 'chiefing', 'administrator', 'nobles'],
    summary: 'Win normal attacks with chiefs to lower the village\'s loyalty to 0. You need culture points and a free slot, and the village must have no Residence or Palace.',
    body: [
      {
        steps: [
          'Research the chief (Academy 20, Rally Point 10; Teuton Chief: Rally Point 5) and train it in a Residence or Palace with a free slot.',
          'Have enough culture points for one more village.',
          'Destroy the target\'s **Residence or Palace** with catapults first.',
          'Send a normal attack with chiefs. If you win, each surviving chief lowers loyalty: Senator 20-30%, Chief and Chieftain 20-25%.',
          'At loyalty 0 the village is yours. One chief is used up.',
        ],
      },
      { p: 'A **capital** and a player\'s **last village** cannot be conquered.' },
      { p: 'Less loyalty drop with: morale (much bigger attacker), a great celebration in the target, a Teuton Brewery. More with a great celebration in your village.' },
      { p: 'Loyalty regrows 1% per hour per Residence/Palace level (x100 here). Without a Residence or Palace it does not regrow, so later attacks can finish the job.' },
      { p: 'After conquest: queues, offers and the village\'s own troops are gone, reinforcements go home, oases become free, the wall and tribe-only buildings are destroyed, and research and upgrades start from zero.' },
    ],
    related: ['expansion-slots', 'catapults', 'culture-points', 'capital', 'celebrations'],
  },
  {
    id: 'capital',
    category: 'expansion',
    title: 'Capital: what is special and how do I move it?',
    keywords: ['capital', 'main village', 'move capital', 'change capital', 'palace', 'fields above 10'],
    summary: 'Your first village is your capital. Only the capital can raise fields above level 10, it cannot be conquered or destroyed, and some buildings exist only there. Building a Palace in another village moves the capital.',
    body: [
      {
        table: {
          head: ['Capital only', 'Not in the capital'],
          rows: [
            ["Fields up to level 20, Stonemason's Lodge, Brewery, Gold Club evasion", 'Great Barracks, Great Stable'],
          ],
        },
      },
      { p: 'A capital cannot be conquered and is never razed, even at 0 population. Catapults can still damage its buildings.' },
      { p: 'To move it: build a Palace in another village (only one Palace per account). When level 1 is finished, that village becomes the capital.' },
      { note: 'The old capital loses its Stonemason\'s Lodge and Brewery, and its fields above level 10 drop to 10.' },
    ],
    related: ['residence-palace', 'production-fields', 'village-types'],
  },
  {
    id: 'village-destroyed',
    category: 'expansion',
    title: 'Can a village be destroyed?',
    keywords: ['village destroyed', 'razed', 'raze', 'destroy village', 'population 0', 'zero population', 'village gone', 'deleted village'],
    summary: 'Yes: if catapults bring a village\'s population to 0, it is razed. A capital, a player\'s last village, an artifact village and a World Wonder village cannot be destroyed.',
    body: [
      { p: 'When it happens: reinforcements and visiting heroes walk home, held oases become free, and the land is empty again.' },
      { p: 'If the owner\'s hero was in the village, it dies and its home moves to the capital.' },
    ],
    related: ['catapults', 'capital'],
  },

  /* ================================================================== */
  /* Market & trade                                                      */
  /* ================================================================== */
  {
    id: 'send-resources',
    category: 'market',
    title: 'How do I send resources with merchants?',
    keywords: ['send resources', 'merchants', 'marketplace', 'market', 'transport', 'trade', 'deliver', 'merchant capacity', 'push'],
    summary: `Build a Marketplace (${config.MERCHANT_MULTIPLIER === 1 ? 'one merchant' : `${config.MERCHANT_MULTIPLIER} merchants`} per level on this world), enter the amounts and the target village, and click OK. Each merchant carries 500 (Romans), 1,000 (Teutons) or 750 (Gauls).`,
    body: [
      { p: 'Marketplace needs Main Building 3, Warehouse 1 and Granary 1.' },
      {
        steps: [
          'Open the Marketplace in the [Village centre](/village).',
          'Enter the amounts. Each "(max)" fills only what your free merchants can carry.',
          'Enter the target coordinates, or click one of your villages or a saved place.',
          'Tick "Save this destination" to keep it (up to 30 places).',
          'Click OK. Merchants deliver and walk home empty.',
        ],
      },
      { p: 'Merchant speed: Romans 16, Teutons 12, Gauls 24 fields per hour (x100 here).' },
      { p: 'Goods above the receiver\'s storage are lost.' },
      { p: 'A Trade Office adds +10% carry per level.' },
    ],
    related: ['market-offers', 'trade-routes', 'trade-office', 'npc-trade'],
    links: [{ href: '/village', label: 'Village centre' }],
  },
  {
    id: 'market-offers',
    category: 'market',
    title: 'Trading resources with other players (offers)',
    keywords: ['offer', 'offers', 'trade', 'exchange', 'buy resources', 'sell resources', 'marketplace offer', 'accept offer', 'ratio'],
    summary: 'Offer one resource for another at the Marketplace. The ratio must be between 1:2 and 2:1. When someone accepts, both sides send merchants.',
    body: [
      { p: 'Create an offer: amount and resource you give, amount and resource you want. Optional: maximum transport time (hours) and "own alliance only".' },
      { p: 'Your resources and merchants are reserved until the offer is taken or cancelled.' },
      { p: 'Under **Buy** you see others\' offers, nearest first. Accepting needs free merchants and the resources.' },
      { p: 'Cancelling returns the resources (only up to your storage).' },
    ],
    related: ['send-resources', 'npc-trade', 'gold-market'],
  },
  {
    id: 'npc-trade',
    category: 'market',
    title: 'NPC trade: change resources into any mix',
    keywords: ['npc', 'npc trade', 'npc merchant', 'exchange resources', 'convert', 'balance resources', 'swap', '3 gold'],
    summary: 'For 3 Gold the NPC merchant turns all resources in the village into any mix you want. The total stays the same.',
    body: [
      {
        steps: [
          'Open NPC trade on the [Plus & Gold](/shop) page or in the Marketplace.',
          'Type the amounts you want of each resource. The "Rest" counter shows what is left to assign.',
          '"Distribute" spreads the rest. Anything you do not assign is spread over your mix, so nothing is lost.',
          'Confirm. It costs 3 Gold.',
        ],
      },
      { p: 'No amount can be above your storage.' },
      { tips: ['Use it to finish an expensive building now instead of waiting for one resource.', 'Turn extra crop into iron for troops.'] },
    ],
    related: ['storage', 'what-is-gold', 'starvation'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'trade-routes',
    category: 'market',
    title: 'Trade routes (Gold Club)',
    keywords: ['trade route', 'trade routes', 'automatic delivery', 'auto send resources', 'schedule', 'feed village'],
    summary: 'With the Gold Club, merchants deliver fixed amounts between your own villages 1, 2 or 3 times a day at a chosen hour (UTC).',
    body: [
      { p: 'Set them up in the Marketplace under Trade routes. Up to 20 routes.' },
      { p: 'Choose: from village, to village, the goods, the start hour (0-23 UTC) and how many times per day (evenly spread).' },
      { p: 'If a delivery fails (not enough resources or merchants), the route shows the reason and tries again next time.' },
    ],
    related: ['gold-club', 'send-resources'],
  },
  {
    id: 'gold-market',
    category: 'market',
    title: 'Gold market: sell resources and troops for Gold',
    keywords: ['gold market', 'sell for gold', 'buy with gold', 'sell troops', 'buy troops', 'sell resources', 'marketplace gold', 'auction'],
    summary: 'Sell resources or troops to other players for Gold. Buyers pay Gold at once; goods travel from the seller\'s village. Troops can only be bought by players of the same tribe.',
    body: [
      { p: 'Open [Gold market](/goldmarket) from the side menu.' },
      {
        table: {
          head: ['Rule', 'Value'],
          rows: [
            ['Open offers per player', 'At most 20'],
            ['Resources per offer', 'At least 100; total listed from a village at most its storage'],
            ['Price', '1 to 1,000,000 Gold'],
            ['Troops', 'Not settlers or chiefs; same tribe only'],
          ],
        },
      },
      { p: 'Listed goods leave your village at once and wait at the market. Listed troops still eat crop at home.' },
      { p: 'You can change the price and amounts of an open offer. Cancelled goods walk back (about 10 minutes on this world).' },
      { p: 'When your offer sells, the Gold is on your account at once and you get a message.' },
      { p: 'Bought resources travel at merchant speed, bought troops at their speed. Anything above your storage is lost.' },
    ],
    related: ['what-is-gold', 'get-gold', 'market-offers'],
    links: [{ href: '/goldmarket', label: 'Gold market' }],
  },

  /* ================================================================== */
  /* Alliance                                                            */
  /* ================================================================== */
  {
    id: 'alliance-join',
    category: 'alliance',
    title: 'How do I join or found an alliance?',
    keywords: ['alliance', 'join alliance', 'found alliance', 'create alliance', 'clan', 'guild', 'team', 'invite', 'invitation', 'ally'],
    summary: 'To join, you need an Embassy (level 1) and an invitation. To found one, you need Embassy level 3 and 280 Gold.',
    body: [
      {
        steps: [
          'Build an Embassy.',
          'Ask a leader or officer to invite you (by your player name).',
          'Open [Alliance](/alliance) and accept the invitation.',
        ],
      },
      { p: '**Found** an alliance: Embassy level 3, then choose a name and a unique tag on the Alliance page. It costs 280 Gold.' },
      { p: 'The alliance is full at 3 members per Embassy level of the leader.' },
      { p: 'You can be in only one alliance. Leave first to join another.' },
    ],
    related: ['embassy', 'alliance-roles', 'diplomacy', 'alliance-chat'],
    links: [
      { href: '/alliance', label: 'Alliance' },
      { href: '/alliances', label: 'Alliance rankings' },
    ],
  },
  {
    id: 'alliance-roles',
    category: 'alliance',
    title: 'Alliance roles: leader, officer, member',
    keywords: ['leader', 'officer', 'member', 'roles', 'kick', 'remove member', 'promote', 'rights', 'leave alliance', 'disband'],
    summary: 'The leader controls everything; officers can invite, remove members, edit the description and handle diplomacy; members can play and chat.',
    body: [
      {
        table: {
          head: ['Action', 'Leader', 'Officer', 'Member'],
          rows: [
            ['Invite players', 'Yes', 'Yes', 'No'],
            ['Remove members', 'Yes (not the leader)', 'Only members', 'No'],
            ['Change roles, hand over leadership', 'Yes', 'No', 'No'],
            ['Edit description, diplomacy', 'Yes', 'Yes', 'No'],
          ],
        },
      },
      { p: 'If the leader leaves, the oldest officer (or the oldest member) becomes leader. If the last member leaves, the alliance is closed.' },
    ],
    related: ['alliance-join', 'diplomacy'],
    links: [{ href: '/alliance', label: 'Alliance' }],
  },
  {
    id: 'diplomacy',
    category: 'alliance',
    title: 'Alliance diplomacy: confederation, NAP, war',
    keywords: ['diplomacy', 'nap', 'non aggression', 'confederation', 'confed', 'war', 'treaty', 'pact'],
    summary: 'Leaders and officers can propose a confederation or a non-aggression pact (the other side must accept) or declare war (no acceptance needed).',
    body: [
      { p: 'Open the Alliance page, Diplomacy, and enter the other alliance\'s tag.' },
      { p: 'Pending proposals can be accepted by the other side or withdrawn. An active treaty can be ended.' },
      { p: '**Confederation** and **non-aggression pact**: while active, members of the two alliances **cannot attack, raid or scout each other** (villages and oases). Reinforcing and trading still work.' },
      { p: '**War** is a public statement; it does not change the rules. Members of the same alliance can never attack each other.' },
    ],
    related: ['alliance-roles', 'alliance-join'],
    links: [{ href: '/alliance', label: 'Alliance' }],
  },
  {
    id: 'alliance-chat',
    category: 'alliance',
    title: 'Alliance chat',
    keywords: ['alliance chat', 'team chat', 'private chat', 'chat channel'],
    summary: 'Members have their own alliance channel in the Chat, next to the world chat.',
    body: [
      { p: 'Open [Chat](/chat) and choose the alliance channel. Only members see it.' },
      { p: 'The same rules apply as in world chat: 300 characters, one message every 30 seconds.' },
    ],
    related: ['chat', 'alliance-join'],
    links: [{ href: '/chat', label: 'Chat' }],
  },
  {
    id: 'alliance-rankings',
    category: 'alliance',
    title: 'Alliance rankings',
    keywords: ['alliance ranking', 'top alliances', 'best alliance', 'alliance stats', 'alliance points'],
    summary: 'Alliances are ranked by their members\' total population, attack points or defence points.',
    body: [
      { p: 'Open [Alliances](/alliances) in Statistics. Tabs: Overview (population), Attackers, Defenders.' },
      { p: 'Each row shows members, the average per member and the value.' },
    ],
    related: ['rankings', 'attack-defence-points'],
    links: [{ href: '/alliances', label: 'Alliance rankings' }],
  },

  /* ================================================================== */
  /* Gold & services                                                     */
  /* ================================================================== */
  {
    id: 'what-is-gold',
    category: 'gold',
    title: 'What is Gold and what can I do with it?',
    keywords: ['gold', 'premium', 'currency', 'credits', 'plus', 'what is gold', 'gold uses', 'paid', 'shop'],
    summary: 'Gold is the premium currency. Use it for boosts, finishing tasks now, the NPC trade, protection, the Gold Club, founding an alliance and the news ticker, or trade it with players.',
    body: [
      {
        table: {
          head: ['Use', 'Price'],
          rows: [
            ['Production boost (+25% one resource)', '5 Gold, 7 days'],
            ['Master Builder / Master Trainer', '10 Gold, 7 days'],
            ['Drill Sergeant (+25% training and research speed)', '10 Gold, 3 days'],
            ['War Banner (+10% attack) / Stone Walls (+10% defence)', '15 Gold, 3 days'],
            ['Finish now', '1 Gold per real minute left on this world (min 2)'],
            ['NPC trade', '3 Gold'],
            ['24 h protection', '80 Gold'],
            ['Found an alliance', '280 Gold'],
            ['Gold Club (whole world)', '200 Gold, once'],
            ['News ticker', 'Price per hour shown on the page'],
          ],
        },
      },
      { p: 'Your balance is in the top bar and on [Plus & Gold](/shop), with your Gold history.' },
    ],
    related: ['get-gold', 'gold-boosts', 'finish-now', 'gold-club'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'get-gold',
    category: 'gold',
    title: 'How do I get Gold?',
    keywords: ['get gold', 'buy gold', 'free gold', 'earn gold', 'top up', 'topup', 'payment', 'eth', 'crypto', 'deposit'],
    summary: 'Win weekly prizes, sell resources or troops in the Gold market, receive Gold from other players, or buy Gold with crypto when payments are switched on.',
    body: [
      {
        table: {
          head: ['Way', 'How'],
          rows: [
            ['Weekly Top 10', 'Places 1, 2 and 3 in each of 5 categories win 300, 200 and 100 Gold'],
            ['Gold market', 'Sell resources or troops to other players'],
            ['Transfers', 'Other players can send you Gold'],
            ['Buy Gold', 'Pick a package on the Buy Gold page and pay with ETH (or the game token)'],
          ],
        },
      },
      {
        table: {
          head: ['Package', 'Price'],
          rows: [
            ['36 Gold', '$1.99'],
            ['114 Gold', '$4.99'],
            ['280 Gold', '$9.99'],
            ['680 Gold (best seller)', '$19.99'],
            ['1,815 Gold', '$49.99'],
            ['3,750 Gold (best value)', '$99.99'],
          ],
        },
      },
      { p: 'Prices are in US dollars; you pay the same value in ETH at the live ETH price, shown on each package. Paying a different amount gives Gold at the rate of the biggest package you reached. Paying with the game token gives extra Gold. Gold arrives after the payment is confirmed, and you get a message.' },
      { note: 'If the Buy Gold page says crypto payments are not switched on, buying is not possible yet. The other ways still work.' },
    ],
    related: ['what-is-gold', 'weekly-top10', 'gold-market', 'gold-transfer', 'wallet'],
    links: [
      { href: '/shop?tab=buy', label: 'Buy Gold' },
      { href: '/goldmarket', label: 'Gold market' },
    ],
  },
  {
    id: 'gold-boosts',
    category: 'gold',
    title: 'Gold boosts: production, speed, attack and defence',
    keywords: ['boost', 'boosts', 'bonus', 'plus account', '+25%', 'production bonus', 'war banner', 'stone walls', 'drill sergeant', 'premium features'],
    summary: 'Boosts work for all your villages for a fixed real time. Buying again while active adds the time on top.',
    body: [
      {
        table: {
          head: ['Boost', 'Effect', 'Price', 'Days'],
          rows: [
            ['+25% Wood / Clay / Iron / Crop', '+25% of that resource in all villages', '5', '7'],
            ['Master Builder', 'One more builder in every village', '10', '7'],
            ['Master Trainer', 'Two upgrades at once in Blacksmith and Armoury', '10', '7'],
            ['Drill Sergeant', 'Training, research and upgrades 25% faster', '10', '3'],
            ['War Banner', '+10% attack for all troops', '15', '3'],
            ['Stone Walls', '+10% defence in all villages', '15', '3'],
          ],
        },
      },
      { p: 'Bonuses stack with token holder perks, but each kind has a limit: production +50% per resource, attack +20%, defence +20%.' },
      { p: 'Active boosts show their time left on [Plus & Gold](/shop) and on the [Production](/production) page.' },
    ],
    related: ['what-is-gold', 'master-builder-trainer', 'production-page', 'token-tiers'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'finish-now',
    category: 'gold',
    title: 'Finish now: how much does it cost?',
    keywords: ['finish now', 'instant', 'complete now', 'speed up', 'finish immediately', 'skip', 'instant build', 'finish training', 'finish all'],
    summary: 'On this world finishing now costs 1 Gold per real minute of work left, at least 2 Gold. It works for construction, training and research.',
    body: [
      { p: 'Click the Gold button next to the job. The price is based on how long the work would take on a normal x1 world: 1 Gold per 100 minutes there, which is 1 Gold per minute here.' },
      { p: 'Example: 10 minutes left costs 10 Gold. 30 seconds left costs 2 Gold.' },
      { p: '**Training**: one **Finish all** button under each building\'s queue finishes every batch in it. The price is the time until the last batch is done (its Duration).' },
      { p: 'A job waiting in a queue is priced only for its own work, not for the waiting time.' },
    ],
    related: ['building-queue', 'training', 'what-is-gold'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'gold-club',
    category: 'gold',
    title: 'Gold Club: what do I get?',
    keywords: ['gold club', 'goldclub', 'club', 'farm list', 'evasion', 'trade routes', 'cropper finder', 'oasis raider', '200 gold'],
    summary: 'The Gold Club costs 200 Gold once and lasts the whole world. It gives farm lists, the Oasis Raider, evasion, trade routes and the cropper finder.',
    body: [
      {
        table: {
          head: ['Feature', 'Where'],
          rows: [
            ['[Farm lists](/help/farm-lists): raid many targets in one click or automatically', 'Rally Point, Farm list'],
            ['[Oasis Raider](/help/oasis-raider): automatic oasis raids', 'Rally Point, Farm list'],
            ['[Evasion](/help/evasion): capital troops avoid attacks', 'Rally Point, Farm list'],
            ['[Trade routes](/help/trade-routes): scheduled deliveries', 'Marketplace'],
            ['[Cropper finder](/help/cropper-finder): find 9c and 15c', 'Map'],
          ],
        },
      },
      { p: 'Join on the [Plus & Gold](/shop) page.' },
    ],
    related: ['farm-lists', 'oasis-raider', 'evasion', 'trade-routes', 'cropper-finder'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'master-builder-trainer',
    category: 'gold',
    title: 'Master Builder and Master Trainer',
    keywords: ['master builder', 'master trainer', 'two builds', 'double queue', 'extra builder', 'two upgrades', 'parallel upgrade'],
    summary: 'Master Builder (10 Gold, 7 days) gives one more builder in every village. Master Trainer (10 Gold, 7 days) allows two upgrades at once in each Blacksmith and Armoury.',
    body: [
      { p: '**Master Builder**: Teutons and Gauls build 2 things at once. Romans build 2 fields and 2 buildings at once.' },
      { p: '**Master Trainer**: two different units can be upgraded at the same time in each Blacksmith and in each Armoury.' },
      { p: 'Buying again while active adds 7 more days.' },
    ],
    related: ['building-queue', 'upgrades', 'gold-boosts'],
    links: [{ href: '/shop', label: 'Plus & Gold' }],
  },
  {
    id: 'buy-protection',
    category: 'gold',
    title: 'Buying protection',
    keywords: ['buy protection', 'protection', 'gold protection', 'shield', 'vacation', 'safe mode', '80 gold'],
    summary: 'Buy 24 hours of protection for 80 Gold. Only while you are not protected, and not within 8 hours after your last bought protection ended or after you attacked a player.',
    body: [
      { p: 'While protected, nobody can attack, raid or scout your villages.' },
      { p: 'Attacking, raiding or scouting a player ends it at once and starts the 8-hour wait.' },
      { note: 'Protection only stops **new** attacks from being sent. Attacks already on the way still arrive, so buy it in good time.' },
      { p: 'Find it on [Plus & Gold](/shop), under Protection. It shows when you can buy again.' },
    ],
    related: ['beginner-protection', 'what-is-gold'],
    links: [{ href: '/shop?tab=specials#protection', label: 'Protection' }],
  },
  {
    id: 'gold-transfer',
    category: 'gold',
    title: 'Sending Gold to another player',
    keywords: ['send gold', 'transfer gold', 'give gold', 'gift gold', 'gold transfer', 'pay player'],
    summary: 'On Plus & Gold, enter a player name and an amount (whole Gold, 1 to 1,000,000). The player gets a message with your optional note.',
    body: [
      { p: 'You can also start a transfer from a player\'s profile.' },
      { p: 'Transfers cannot be undone. Check the name.' },
    ],
    related: ['what-is-gold', 'get-gold'],
    links: [{ href: '/shop?tab=specials#gold', label: 'Send Gold' }],
  },
  {
    id: 'news-ticker',
    category: 'gold',
    title: 'News ticker: post a message for everyone',
    keywords: ['ticker', 'news ticker', 'announcement', 'advert', 'advertise', 'message everyone', 'banner'],
    summary: 'Book 1 to 6 hours on the scrolling news line at the top of every player\'s screen. The price per hour is shown on the page.',
    body: [
      { p: 'Open [Book a time slot](/shop/ticker). You can book up to 72 hours ahead. Each hour has a limited number of places.' },
      { p: 'Messages: 3 to 140 characters, no links.' },
      { p: 'Admins can remove a message that breaks the rules; unused hours are refunded.' },
    ],
    related: ['what-is-gold', 'chat'],
    links: [{ href: '/shop/ticker', label: 'News ticker' }],
  },

  /* ================================================================== */
  /* Endgame                                                             */
  /* ================================================================== */
  {
    id: 'natars',
    category: 'endgame',
    title: 'Who are the Natars?',
    keywords: ['natars', 'natar', 'npc', 'ancient empire', 'computer player', 'natarian'],
    summary: 'The Natars are a computer tribe that guards artifacts and World Wonder villages with very large armies. They also raid players with 300 or more population, at most once a day.',
    body: [
      { p: 'Natar strongholds have Treasuries (with artifacts), or World Wonder places, and big garrisons of Pikemen, Thorned Warriors, Guardsmen, Axeriders and Natarian Knights.' },
      { p: 'Artifact villages hold a garrison of 1,500 Pikemen, 800 Thorned Warriors, 1,000 Guardsmen, 300 Axeriders and 300 Knights for small artifacts; twice that for large and four times for unique ones. World Wonder and construction plan villages have three times the base garrison.' },
      { p: 'On this world the artifacts and World Wonders have already been released. See the [Artifacts & Wonders](/endgame) page.' },
      { tips: ['Scout first and use the simulator. Bring rams and catapults.', 'Work together with your alliance.'] },
    ],
    related: ['artifacts', 'artifact-capture', 'world-wonder', 'natar-attacks'],
    links: [{ href: '/endgame', label: 'Artifacts & Wonders' }],
  },
  {
    id: 'natar-attacks',
    category: 'endgame',
    title: 'Natar attacks on players',
    keywords: ['natar attack', 'natars attack', 'natar raid', 'npc attack', 'attacked by natars'],
    summary: 'Natars attack players with 300 or more population, at most once a day. Their army is sized to your strength, so small players get small raids and strong players get big attacks.',
    body: [
      {
        table: {
          head: ['Rule', 'Value'],
          rows: [
            ['Who', 'Players with 300+ population, not under protection'],
            ['How often', 'At most once every 24 hours, at a random time'],
            ['Army size', '50% to 90% of your strength (defence of the troops in the village, wall and residence, plus population)'],
            ['Type', 'Mostly raids; about one in five is a normal attack with War Elephants (rams)'],
            ['Target', 'One of your villages; bigger villages are picked more often'],
          ],
        },
      },
      { p: 'You see them coming like any attack, in the Info box and the Rally Point. The Natars never bring catapults or chiefs. Their survivors and loot disappear after the attack.' },
      { p: 'Try it in the [Combat simulator](/simulator): pick your village and press "Natars attack it" to see a typical Natar army against your current defence.' },
      { tips: ['A good wall and some defensive troops at home usually hold them off.', 'A cranny keeps part of your resources safe from raids.'] },
    ],
    related: ['natars', 'defence-tips', 'combat-simulator', 'cranny'],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
  {
    id: 'artifacts',
    category: 'endgame',
    title: 'What do the artifacts do?',
    keywords: ['artifact', 'artifacts', 'artefact', 'artefacts', 'boots', 'eyes of the eagle', 'diet control', 'trainers talent', 'architects secret', 'storage plan', 'rivals confusion', 'fool', 'unique artifact'],
    summary: 'Artifacts give strong bonuses. Small ones work in the village that holds them; large and unique ones work in all villages of the owner.',
    body: [
      {
        table: {
          head: ['Artifact', 'Effect', 'Small', 'Large', 'Unique'],
          rows: [
            ["Architects' secret", 'Buildings and walls sturdier against siege', 'x4', 'x3', 'x5'],
            ['Boots of the mercenary', 'Troops move faster', 'x2', 'x1.5', 'x3'],
            ['Eyes of the eagle', 'Scouts stronger', 'x5', 'x3', 'x10'],
            ['Diet control', 'Troops eat less crop', 'half', '75%', 'half'],
            ["Trainers' talent", 'Training time', 'half', '75%', 'half'],
            ['Storage master plan', 'Great Warehouse and Great Granary can be built', 'yes', 'yes', '-'],
            ["Rivals' confusion", 'Bigger cranny (max 35%), enemy catapults hit at random', 'x3', 'x2', '-'],
            ['Artifact of the fool', 'A random effect that changes every day, sometimes harmful', 'yes', '-', 'yes'],
          ],
        },
      },
      { p: 'There are 22 artifacts. If you hold two of the same kind, the strongest one counts.' },
      { p: 'A captured artifact starts working 24 hours / world speed later (about 14 minutes here).' },
      { p: 'World Wonder construction plans are special artifacts. See [World Wonder](/help/world-wonder).' },
    ],
    related: ['artifact-capture', 'treasury', 'natars', 'world-wonder'],
    links: [{ href: '/endgame', label: 'Artifacts & Wonders' }],
  },
  {
    id: 'artifact-capture',
    category: 'endgame',
    title: 'How do I capture an artifact?',
    keywords: ['capture artifact', 'steal artifact', 'take artifact', 'get artifact', 'artifact hero', 'treasury'],
    summary: 'Destroy the Treasury of the village that holds it, then win a normal attack with your hero alive. Your attacking village needs an empty Treasury of level 10 (small) or 20 (large/unique).',
    body: [
      {
        steps: [
          'Build a Treasury in the attacking village: level 10 for a small, level 20 for a large or unique artifact. It must not hold another artifact.',
          'Raise your Rally Point to level 10 so catapults can aim at the Treasury.',
          'Destroy the target\'s Treasury with catapults (can take several attacks).',
          'Win a **normal attack** with your **hero**, and the hero must survive. It carries the artifact home.',
        ],
      },
      { p: 'Catapults fire before the hero takes the artifact, so one strong attack with catapults and the hero can do both.' },
      { p: 'Artifacts can be taken from players the same way.' },
      { note: 'A village with an artifact cannot be razed.' },
    ],
    related: ['artifacts', 'treasury', 'catapults', 'hero-battle'],
    links: [{ href: '/endgame', label: 'Artifacts & Wonders' }],
  },
  {
    id: 'world-wonder',
    category: 'endgame',
    title: 'How do we win with a World Wonder?',
    keywords: ['world wonder', 'ww', 'wonder', 'win the game', 'end of game', 'construction plan', 'building plan', 'level 100', 'winner'],
    summary: 'Conquer a Natar World Wonder village, hold a construction plan in your alliance, and build the Wonder to level 100. The first alliance to do it wins the world.',
    body: [
      {
        steps: [
          'Conquer a World Wonder village from the Natars with chiefs (it has no Residence or Palace).',
          'A member of your alliance must capture a **construction plan** (a large artifact: Treasury level 20).',
          'Build the Wonder level by level. From level 51 a **second** alliance member must also hold a plan.',
          'Level 100 wins the world for your alliance.',
        ],
      },
      { p: 'Level 1 costs 66,700 wood, 69,050 clay, 72,200 iron, 13,200 crop. Each level costs 2.75% more, up to 1,000,000 per resource.' },
      { p: 'World Wonder villages have Great Warehouses and a Great Granary, and they cannot be destroyed by catapults.' },
      { tips: ['Defend the Wonder village with the whole alliance.', 'Many players must send resources all the time.'] },
    ],
    related: ['natars', 'artifacts', 'conquer', 'great-storage'],
    links: [{ href: '/endgame', label: 'Artifacts & Wonders' }],
  },

  /* ================================================================== */
  /* Statistics & medals                                                 */
  /* ================================================================== */
  {
    id: 'rankings',
    category: 'stats',
    title: 'Rankings and statistics',
    keywords: ['ranking', 'rankings', 'statistics', 'stats', 'top players', 'leaderboard', 'my rank', 'position', 'population ranking'],
    summary: 'Statistics ranks players by population, attack points, defence points and resources robbed, plus alliances, villages and heroes.',
    body: [
      {
        table: {
          head: ['Tab', 'Ranks by'],
          rows: [
            ['[Players](/stats)', 'Population (sub-tabs: Attackers, Defenders, Robbers)'],
            ['[Alliances](/alliances)', 'Members\' population, attack or defence points'],
            ['[Villages](/stats/villages)', 'Largest villages'],
            ['[Heroes](/stats/heroes)', 'Hero level and experience'],
            ['[Top 10](/stats/week)', 'This week\'s gains'],
            ['[Wonders](/endgame)', 'Artifacts and World Wonders'],
          ],
        },
      },
      { p: 'The page opens at your own place. Search by rank or name.' },
    ],
    related: ['attack-defence-points', 'weekly-top10', 'alliance-rankings', 'profile'],
    links: [{ href: '/stats', label: 'Statistics' }],
  },
  {
    id: 'attack-defence-points',
    category: 'stats',
    title: 'How are attack and defence points counted?',
    keywords: ['attack points', 'defence points', 'defense points', 'off points', 'def points', 'points', 'kills'],
    summary: 'You get attack points for enemy units (and animals) you kill when attacking, and defence points for attackers killed at your village; each unit counts its upkeep.',
    body: [
      { p: 'Example: killing 100 Clubswingers (upkeep 1) gives 100 points; killing 10 catapults (upkeep 6) gives 60.' },
      { p: 'When several armies defend a village, defence points are shared by their size.' },
      { p: 'Robbers ranking counts all resources you have stolen, from villages and oases.' },
    ],
    related: ['rankings', 'weekly-top10', 'troop-upkeep'],
    links: [{ href: '/stats?k=attack', label: 'Attackers ranking' }],
  },
  {
    id: 'weekly-top10',
    category: 'stats',
    title: 'Weekly Top 10, medals and Gold prizes',
    keywords: ['weekly', 'top 10', 'medal', 'medals', 'prize', 'gold prize', 'week', 'attacker of the week', 'climber', 'robber', 'reward'],
    summary: 'Each week runs from Monday 00:00 UTC. The top 3 in five categories get a medal and 300, 200 or 100 Gold.',
    body: [
      {
        table: {
          head: ['Category', 'What counts (gain this week)'],
          rows: [
            ['Attackers', 'Attack points'],
            ['Defenders', 'Defence points'],
            ['Climbers', 'Population gained'],
            ['Expansion', 'New villages'],
            ['Robbers', 'Resources robbed'],
          ],
        },
      },
      { p: 'Prizes: **1st 300 Gold, 2nd 200 Gold, 3rd 100 Gold** in every category. You also get a message, and the medal shows on your profile.' },
      { p: 'Players who join during the week count from their start.' },
      { tips: ['Oasis raids count for Robbers, and killed animals for Attackers.'] },
    ],
    related: ['rankings', 'get-gold', 'attack-defence-points', 'profile'],
    links: [{ href: '/stats/week', label: 'Top 10' }],
  },
  {
    id: 'profile',
    category: 'stats',
    title: 'Player profiles',
    keywords: ['profile', 'player page', 'player info', 'medals', 'about', 'villages list', 'other player'],
    summary: 'A profile shows the player\'s avatar, tribe, alliance, rank, medals, protection, "About" text and villages.',
    body: [
      { p: 'Click a player name anywhere to open the profile. From there you can write a message or send Gold.' },
      { p: 'Online status and last activity are private. Nobody can see when you were last online.' },
      { p: 'Edit your own on [Profile](/account). See [Profile and avatar](/help/profile-avatar).' },
    ],
    related: ['profile-avatar', 'rankings', 'weekly-top10'],
    links: [{ href: '/account', label: 'Your profile' }],
  },

  /* ================================================================== */
  /* Account & wallet                                                    */
  /* ================================================================== */
  {
    id: 'profile-avatar',
    category: 'account',
    title: 'How do I change my avatar and "About" text?',
    keywords: ['avatar', 'picture', 'photo', 'profile picture', 'bio', 'about me', 'description', 'upload'],
    summary: 'On your Profile page, upload a picture (JPG, PNG, WebP or GIF, up to 5 MB) and write an About text of up to 500 characters.',
    body: [
      { p: 'The picture is cut to a 128 x 128 square. Without a picture you get your tribe\'s default portrait.' },
      { p: 'You can remove the picture at any time.' },
      { p: 'Player names cannot be changed. Village names can: see [Rename village](/help/rename-village).' },
    ],
    related: ['profile', 'rename-village'],
    links: [{ href: '/account', label: 'Profile' }],
  },
  {
    id: 'wallet',
    category: 'account',
    title: 'Linking a crypto wallet',
    keywords: ['wallet', 'metamask', 'link wallet', 'crypto', 'ethereum', 'siwe', 'wallet login', 'web3'],
    summary: 'Link your wallet on the Wallet page by signing a message. It is free (no transaction). Then you can log in with the wallet and get token holder perks.',
    body: [
      { p: 'Signing proves you own the wallet. It does not cost gas and does not send anything.' },
      { p: 'A linked wallet is used for holder tiers and makes Gold purchases easier.' },
      { p: 'You can unlink it on the same page.' },
    ],
    related: ['token-tiers', 'get-gold'],
    links: [{ href: '/wallet', label: 'Wallet' }],
  },
  {
    id: 'token-tiers',
    category: 'account',
    title: 'Token holder tiers and perks',
    keywords: ['token', 'holder', 'tier', 'perks', 'bronze', 'silver', 'gold holder', 'diamond', 'token bonus', 'realm'],
    summary: 'Holding the game token in a linked wallet gives a tier with bonuses for build speed, production, troop cost and carry. Tiers use your lowest balance over recent checks.',
    body: [
      {
        table: {
          head: ['Tier', 'Needs (share of supply)', 'Perks'],
          rows: [
            ['Bronze', '0.01%', '+5% build speed, +5% production'],
            ['Silver', '0.1%', '+10% build speed, +10% production, -5% troop cost'],
            ['Gold', '0.5% or top 10 holder', '+15% build speed, +15% production, -10% troop cost, +10% carry'],
            ['Diamond', '1% or top 3 holder', '+20% build speed, +20% production, -15% troop cost, +20% carry'],
          ],
        },
      },
      { p: 'Your balance is checked regularly. The tier uses the **lowest** balance of your last few checks, so buying for one day does not count.' },
      { note: 'If the Wallet page says token perks are not active on this server yet, there are no tiers for now.' },
    ],
    related: ['wallet', 'gold-boosts', 'production-page'],
    links: [{ href: '/wallet', label: 'Wallet' }],
  },
  {
    id: 'chat',
    category: 'account',
    title: 'Chat rules and limits',
    keywords: ['chat', 'world chat', 'talk', 'cooldown', 'slow down', 'muted', 'spam', 'message limit', 'chat rules'],
    summary: 'You can post one chat message every 30 seconds, up to 300 characters. There is a world channel and an alliance channel.',
    body: [
      { p: 'The Send button counts down until you can write again.' },
      { p: 'Be polite. Admins can delete messages and mute players.' },
      { p: 'For private talk use [Messages](/messages).' },
    ],
    related: ['alliance-chat', 'messages'],
    links: [{ href: '/chat', label: 'Chat' }],
  },
  {
    id: 'messages',
    category: 'account',
    title: 'Messages: writing to players',
    keywords: ['messages', 'mail', 'igm', 'private message', 'write', 'inbox', 'outbox', 'send message', 'pm'],
    summary: 'Write to any player by name. Inbox and Sent are separate; you can delete or mark many messages at once.',
    body: [
      { p: 'Open [Messages](/messages), then [Write](/messages/new). Or click "Message" on a player\'s profile or village.' },
      { p: 'Tick messages and choose Delete selected or Mark selected as read. "Mark all as read" clears the counter.' },
      { p: 'System messages (weekly prizes, Gold market sales, Gold transfers) also arrive here.' },
    ],
    related: ['reports-manage', 'chat'],
    links: [{ href: '/messages', label: 'Messages' }],
  },
  {
    id: 'reports-manage',
    category: 'account',
    title: 'Deleting and marking reports and messages',
    keywords: ['delete reports', 'delete all', 'mark read', 'clean reports', 'bulk', 'select all', 'too many reports'],
    summary: 'In Reports and Messages, tick rows (or the box at the top to select all), then Delete selected or Mark selected as read. Reports also have Delete all per tab.',
    body: [
      { p: '"Delete all" in Reports deletes only the reports of the open tab, and asks first.' },
      { p: 'Deleting a message removes it only from your own box.' },
    ],
    related: ['reports', 'messages'],
    links: [{ href: '/reports', label: 'Reports' }],
  },

  /* ================================================================== */
  /* Strategy & tips                                                     */
  /* ================================================================== */
  {
    id: 'build-order',
    category: 'strategy',
    title: 'A good build order for the first day',
    keywords: ['build order', 'start strategy', 'what to build first', 'early game', 'opening', 'beginner guide', 'growth'],
    summary: 'Fields first, storage and cranny next, then Main Building, Barracks and Embassy; use the protection time to grow and raid oases.',
    body: [
      {
        steps: [
          'All fields to level 2, then Warehouse and Granary to 3.',
          'Rally Point 1, Cranny to 5 or more, Main Building to 3.',
          'Fields to 4-5 (cropland a little lower if crop is positive), Warehouse and Granary up as needed.',
          'Barracks, a small raiding group, Embassy (join an alliance).',
          'Main Building 5, Marketplace, Academy; Residence to 10 for your first settlers.',
          'Grain Mill (needs Cropland 5) and Hero\'s Mansion; train a hero and raid oases with it.',
          'Cranny to 10 before protection ends.',
        ],
      },
      {
        tips: [
          'On x100 the limit is storage, not time. Grow storage with your fields.',
          'Culture points come from every building level. A wide, balanced village helps your 2nd village come sooner.',
          'Romans: always run a field and a building at the same time.',
        ],
      },
    ],
    related: ['first-hour', 'storage', 'when-to-expand', 'raiding-economy'],
  },
  {
    id: 'raiding-economy',
    category: 'strategy',
    title: 'Raiding: how to make it pay',
    keywords: ['raiding', 'farming', 'farm', 'raid strategy', 'loot strategy', 'inactive', 'offense', 'how to raid'],
    summary: 'Raid targets with little defence and lots of resources: empty oases and inactive players. Send just enough troops to carry the loot, and scout before you risk an army.',
    body: [
      {
        tips: [
          'Use fast units with good carry: Theutates Thunder, Equites Imperatoris, Teutonic Knight, Paladin, Clubswinger.',
          'Raid, not attack, unless you want to destroy the defence.',
          'Free oases fill up again; inactive villages refill their storage.',
          'Check the last raid result: losses mean the target got defence. Remove it or scout it.',
          'Teutons: enemy crannies hide only 80% against you.',
          'Gold Club farm lists and the Oasis Raider save many clicks.',
          'Robbed resources count for the weekly Robbers prize.',
        ],
      },
    ],
    related: ['oasis-raiding', 'farm-lists', 'oasis-raider', 'carry-capacity', 'loot'],
  },
  {
    id: 'defensive-play',
    category: 'strategy',
    title: 'Playing defensively',
    keywords: ['defensive', 'turtle', 'defender', 'defence strategy', 'deff', 'safe play', 'peaceful'],
    summary: 'Make attacks on you unprofitable: high cranny, a good wall, mixed defensive troops, scouts at home, and an alliance that reinforces you.',
    body: [
      {
        tips: [
          'Wall and Residence/Palace both raise your base defence; the wall multiplies all troops.',
          'Mix defence against infantry (Praetorian, Phalanx, Paladin, Druidrider) and cavalry (Spearman, Phalanx, Haeduan, Equites Caesaris).',
          'Upgrade defence in the Armoury.',
          'Gauls: traps catch attackers before the fight.',
          'Stone Walls boost: +10% defence for 3 days, useful when a big attack is coming.',
          'Reinforce allies with fast defensive cavalry.',
          'Hero with Defence and Defence bonus points, kept at home.',
        ],
      },
    ],
    related: ['defence-tips', 'walls', 'reinforcements', 'traps', 'cranny'],
  },
  {
    id: 'romans-tips',
    category: 'strategy',
    title: 'Tips for Romans',
    keywords: ['romans', 'roman tips', 'roman strategy', 'legionnaire', 'imperian', 'praetorian', 'equites'],
    summary: 'Use the double build queue all the time, raid with Equites Imperatoris, attack with Imperians, and enjoy the strongest wall.',
    body: [
      {
        tips: [
          'Always keep one field and one building under construction.',
          'Early: Legionnaires can raid and defend. Later: Imperians attack, Praetorians defend.',
          'Equites Imperatoris carry 100 and move at 14: very good raiders.',
          'City Wall gives +81% at level 20.',
          'Horse Drinking Trough cuts cavalry crop from level 10.',
          'Senators lower loyalty 20-30%, the most of all chiefs.',
        ],
      },
    ],
    related: ['tribes', 'horse-trough', 'building-queue'],
    links: [{ href: '/unit/romans/2', label: 'Imperian' }],
  },
  {
    id: 'teutons-tips',
    category: 'strategy',
    title: 'Tips for Teutons',
    keywords: ['teutons', 'teuton tips', 'teuton strategy', 'clubswinger', 'axeman', 'germans', 'raider'],
    summary: 'Raid early and often with cheap Clubswingers, beat crannies, and build big hammers of Axemen and Teutonic Knights.',
    body: [
      {
        tips: [
          'Clubswingers are the cheapest unit (9 seconds each at Barracks level 1 here) and carry 60.',
          'Enemy crannies hide only 80% against you.',
          'Paladins carry 110 and defend well against infantry.',
          'Spearmen are cheap defence against cavalry.',
          'Earth Wall is the weakest bonus but very hard to ram.',
          'Brewery gives +10% attack at level 10, but halves chief power.',
          'Merchants carry 1,000.',
        ],
      },
    ],
    related: ['tribes', 'brewery', 'raiding-economy'],
    links: [{ href: '/unit/teutons/0', label: 'Clubswinger' }],
  },
  {
    id: 'gauls-tips',
    category: 'strategy',
    title: 'Tips for Gauls',
    keywords: ['gauls', 'gaul tips', 'gaul strategy', 'phalanx', 'theutates thunder', 'druidrider', 'haeduan', 'tt'],
    summary: 'Defend cheaply with Phalanx and traps, raid far with Theutates Thunders, and use your doubled cranny.',
    body: [
      {
        tips: [
          'Your cranny reaches the 35% maximum at level 5.',
          'Build a Trapper early: each trap catches an attacker.',
          'Phalanx is cheap defence against both infantry and cavalry.',
          'Theutates Thunder (speed 19, carry 75) is the best long-range raider.',
          'Druidriders are fast defenders against infantry; Haeduans attack and defend against cavalry.',
          'Merchants are the fastest (speed 24).',
        ],
      },
    ],
    related: ['tribes', 'traps', 'cranny'],
    links: [{ href: '/unit/gauls/3', label: 'Theutates Thunder' }],
  },
  {
    id: 'when-to-expand',
    category: 'strategy',
    title: 'When should I found my next village?',
    keywords: ['expand', 'expansion', 'when to settle', 'second village', 'more villages', 'growth', 'cp strategy'],
    summary: 'As soon as you have the culture points and a Residence at level 10. More villages mean more production, more culture points and more troops.',
    body: [
      {
        tips: [
          'Train the 3 settlers while the culture points are still coming, so they leave the moment you reach the number.',
          'Settle close to your first village so troops and merchants travel less.',
          'Look for a 9- or 15-cropper with crop oases nearby for a big army village.',
          'Remember: a new village starts with only 800 of each resource. Send it resources.',
          'Conquering can be cheaper than settling if a weak, well-built village is near.',
        ],
      },
    ],
    related: ['settlers', 'culture-points', 'conquer', 'village-types'],
  },
  {
    id: 'common-mistakes',
    category: 'strategy',
    title: 'Common beginner mistakes',
    keywords: ['mistakes', 'errors', 'common mistakes', 'avoid', 'what not to do', 'tips', 'newbie mistakes'],
    summary: 'Full storage, no cranny, attacking a player during protection, sending a hero alone, and too little crop are the most common mistakes.',
    body: [
      {
        tips: [
          'Letting storage fill up: production stops, and raiders love you.',
          'Ending your own protection by scouting or raiding a player too early.',
          'Forgetting the Rally Point: you cannot send troops or build Barracks without it.',
          'Sending the hero alone into a fight it can lose.',
          'Raiding (not attacking) an oasis with the hero and expecting to capture it.',
          'Big army, negative crop, empty granary: troops starve.',
          'Sending catapults without Rally Point level 10 and expecting to hit the Residence.',
          'Keeping a Teuton Brewery while trying to conquer.',
          'Spending Gold on "finish now" for long jobs: it costs 1 Gold per minute here.',
        ],
      },
    ],
    related: ['storage', 'beginner-protection', 'hero-battle', 'starvation', 'capture-oasis'],
  },
];
