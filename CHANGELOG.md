# Changelog

## 0.9.2 — 2026-10-05
- Wall: an unbuilt wall shows as an outline ring around the village; clicking anywhere along the ring opens it to build. Conquered villages get the conqueror's wall type (could not be rebuilt before).
- Cranny scales with world speed (classic table × speed), capped at a full level-20 warehouse (80,000 per resource).
- Training times are exact (milliseconds, no rounding to whole seconds or 1 s minimum); per-unit times under a minute show with a decimal (e.g. 2.7 s).
- Marketplace: "(max)" per resource (limited by stock and free merchants); save destinations and pick them (and your own villages) with one click; same quick pick on the send-troops form.
- Send troops: "Select all troops" / "clear".

## 0.9.1 — 2026-10-04 (anti-cheat fixes from the audit)
- Reserved names (Natars, Nature, Admin, System, …) can't be registered; the Natar NPC is found by its tribe, never by name (a player could otherwise have received every Natar village and artifact).
- Gold market is no vault: listed troops eat crop at home, cancelled goods walk back (≥ 10 min), listed resources per village are capped at its storage.
- Releasing/losing an oasis keeps its animals (no instant respawn to farm hero XP and weekly attack points).
- Refunds (cancelled offers/builds) can't overfill storage; a level costing more than the storage holds can't be built.
- Attacking starts the 8-hour wait before protection can be bought (no attack-then-hide while still protected).
- Redirects never leave the site; heroes stationed in a razed village walk home instead of getting stuck.

## 0.9.0 — 2026-10-04 (classic T3.6 rules, phase 4: endgame)
- Natars (NPC tribe with Kirilloid's T3 stats, original art) guard 22 artifacts in Treasuries: Architects' secret, Boots of the mercenary, Eyes of the eagle, Diet control, Trainers' talent, Storage master plan, Rivals' confusion (small = village, large/unique = account) and the Artifact of the fool (random effect each day).
- Capturing: destroy the Treasury with catapults, win a normal attack with your hero, and have an empty Treasury (level 10 small, 20 large/unique) in the attacking village; effects start 24 h / speed later. Artifact villages can't be razed.
- Great Warehouse / Great Granary (3× capacity) with a storage plan or in a World Wonder village.
- World Wonder villages and construction plans: Wonder levels 1–100 (66.7k/69k/72.2k/13.2k at level 1, ×1.0275, capped at 1M), plan held in the alliance, a second plan holder from level 51; level 100 wins the world (banner for everyone).
- Release by admin buttons, or automatically ARTIFACT_DAY / WONDER_DAY days after the world started. New page: Statistics → Artifacts & Wonders.

## 0.8.2 — 2026-10-04 (classic T3.6 rules, phase 3: buildings & economy)
- Palace can be built in any village (one per account); finishing it makes that village the capital — the old capital loses Stonemason/Brewery and its fields above 10 drop to 10.
- Demolition from Main Building 10: one level at a time, half the build time, no refund, doesn't use a builder.
- Horse Drinking Trough: Equites Legati/Imperatoris/Caesaris eat 1 crop less from level 10/15/20.
- Marketplace offers can be limited to your own alliance.
- Rally Point handles 5 outgoing troop movements per level.

## 0.8.1 — 2026-10-04 (classic T3.6 rules, phase 2: hero)
- Classic hero: trained in the Hero's Mansion from a researched fighting unit at home (2× unit cost, 1.6× its time); keeps the unit's stats and speed. Five skills (attack, defence, attack bonus, defence bonus, regeneration), 5 points per level, free redistribution at level 0. Attack round5((2a/3+27.5)·pts + 5a/4), defence with k = (di/dc)^0.2 (Kirilloid t3/hero). No production skill.
- Hero fights with its own army and its bonuses boost only that army; dies at > 90% damage or when its army is wiped out; regenerates (10 + 5·points)%/day; revive cost 2·cost(+30)·(level+1)^1.25, time 1.6·time·(level+1); XP = upkeep killed (hero 6), shared by defending heroes; animals ×1.
- Oases held by another player have loyalty: each hero attack takes ⌊100/min(3, 4 − owner's oases)⌋; it regrows by the owner's Hero's Mansion level per hour. Oases can be released.
- Existing heroes keep level and XP and get their points back to redistribute.

## 0.8.0 — 2026-10-04 (classic T3.6 rules, phase 1: combat)
- Siege uses the T3 formula (Kirilloid/TravianZ): demolition points 4·σ(att/def)·⌊engines/durability⌋·1.0205^upgrade, all engines sent count; rams strike the wall before the fight (battle recomputed at the lower wall) and damage it even in lost attacks; tribe wall sturdiness (Romans 1, Gauls 2, Teutons 5); Stonemason in the capital.
- Catapult targets by Rally Point level (random < 3, storage at 3, fields & bonus buildings at 5, all but cranny/stonemason/trapper/walls at 10), two targets at Rally Point 20 with ≥ 20 catapults; random hits can land on fields; catapult morale; Teuton Brewery makes catapults random and halves chief persuasion.
- Villages shot down to 0 population are razed (not capitals or a player's last village).
- Morale as in T3.6 (attack × max(0.667, popRatio^−0.2·min(1, att/def))), scouting with scout strength (35/20, wall, (def/att)^1.5 losses), smithy upgrades stat + (stat + 300·upkeep/7)(1.007^L − 1).
- Reinforcements are fed by the host village; prisoners are fed by their home; starvation hits reinforcements first.
- Gaul traps must be built (20/30/10/20 each) up to Trapper capacity; prisoners can be released by the trap owner; freed prisoners lose a quarter and only a third of traps are repaired.
- Conquest: no loyalty drop without culture points/expansion slot, last village protected, great celebrations ±5, morale; wall and tribe-only buildings destroyed on conquest; loyalty regrows 1%/h per Residence/Palace level only.

## 0.7.0 — 2026-10-04
- Map is one scalable SVG: sizes 7×7 / 11×11 / 15×15 / 21×21, Classic (diamond) or Flat (square tiles) view, remembered in a cookie.
- NPC trade keeps the exact total (unassigned rest spread over the chosen mix), live Rest counter + Distribute; also on the Marketplace.
- Player profiles: avatar upload (sharp → 128×128 WebP on the volume, `/avatar/:id`), tribe default portraits, About text, details card; avatars in rankings and alliance lists.
- Gold transfers between players (Plus page, profile link, message to receiver).
- Gold market (`/goldmarket`): sell resources or troops (no settlers/chiefs) for Gold; goods held in escrow; troops buyable only by the same tribe; delivery via `delivery` movement.
- Gold market offers can be edited (price and amounts; the difference is taken from / returned to the offer's village).
- Clean side menus (card panels, 16px line icons, active page highlight); layout zooms up on wide screens; phone overflow fixed.
- Map: clicks always hit the field under the cursor (tile art ignores the pointer), direction pad (diagonal in Classic view) + arrow keys, hover updates the details box.
- Fix: Gold "finish now" (and other actions) return to the page you came from — Referrer-Policy is now `same-origin` (was `no-referrer`, so every redirect fell back to the village centre); finished fields fall back to the overview.
- Village centre: pixel-exact picking — precomputed outline masks of every building/plot picture (`scripts/gen-masks.py` → `public/masks.json`) decide which building is under the cursor, front to back; the hovered building glows; grass/roads do nothing. The SVG Voronoi layer (`src/web/views/spots.ts`) remains for keyboard and no-JS use.
- Map: round arrow buttons on all four sides of the map (constant on-screen size at every map size); labels scale too.
- Oases hold resources: unoccupied oases gather their bonus resources (40/h per 25% × speed, cap 1000 × speed up to 80k, start half full); winning attacks/raids loot them; scouts and the oasis page show the stock. Held oases don't gather.
- Player activity is private: no "last seen"/online status on profiles or alliance member lists (admin panel only).
- Training table shows a live total (resources, upkeep, time) for everything entered; shortages in red.
- New troop art: all 30 tribe units, 10 animals and the hero redrawn as detailed classic-style 16px icons plus 120×140 portraits (`img/units/big/`), original art.
- Troop guide: every troop picture links to its information page (`/unit/<tribe>/<n>`: big picture, attack/defence/speed/carry/upkeep, cost, training time at this world's speed, requirements, research and first upgrade cost); `/units` lists all tribes and animals.
- Fix: crop consumption (population, troops, hero) no longer multiplied by world speed — like Travian speed servers only production, times and culture scale. Starvation uses the same unscaled figure.
- Rules checked against Kirilloid's T3 model and corrected: chief speeds (Senator 4, Chief 4, Chieftain 5), T3 training times for 18 units, Rally Point build time (2000 s at L1), Swordsman needs Academy 3, Horse Drinking Trough culture 3, Academy research cost (6/4/8/6×cost+100/100/200/160; chiefs 0.5/0.5/0.8/0.6×cost+500/200/400/160) and per-unit research times, Blacksmith/Armoury cost round5(L^0.8×(7×cost+base)/upkeep) and time; Academy/smithy levels speed research 3.6%/level.
- Weekly statistics (Statistics → This week): attackers, defenders, climbers (population), expansion (new villages), robbers — gains since Monday 00:00 UTC. Every Monday the top 3 per category get a gold/silver/bronze medal (shown on their profile) and 300/200/100 Gold, with a message; rollover is idempotent (`src/game/actions/weekly.ts`, run from the server tick).
- "Raiders" ranking renamed "Robbers" (resources robbed).
- Beginner protection lasts 24 h (was 72). Protection can be bought for 80 Gold (24 h): not while protected, and only 8 h after the last bought protection ended; attacking ends it early.
- "Finish now" price follows the world speed: 1 Gold per 100 minutes of the remaining work at x1 (min 2) — at x100 that's 1 Gold per real minute (`FINISH_X1_MINUTES_PER_GOLD`).
- Send-troops form shows the live carry capacity; the confirm page shows it too.
- Founding an alliance costs 280 Gold (`ALLIANCE_FOUND_PRICE`), on top of Embassy level 3.
- Live world speed x100 (`WORLD_SPEED`/`TROOP_SPEED` Railway variables).

## 0.6.0 — 2026-10-04
- Layout rebuilt to classic Travian 3 measurements: 980px page, round grey nav (split reports/messages), 18×12 resource bar, 130px side menu, villages list, grey-grid tables, Verdana 13px, #71D000 links.
- Village overview 300×264 per field layout with level markers and production/troops tables beside it; village centre 540×448 with 75×100 buildings on the classic spots and tribe wall overlays; diamond map of 74×74 tiles with rulers, arrows and coordinate box.
- All artwork redrawn (original) in classic style: 7 field-layout islands, village ground, walls, map tiles, 36 buildings, nav buttons, resource/unit/UI icons.
- Classic building page (Costs for upgrading…, Upgrade to level N.) and one-form training table; classic send-troops form.

## 0.5.0 — 2026-10-04
- Rebuilt as classic Travian 3.6: Romans/Teutons/Gauls, exact unit stats and building formulas (costs, times, population, culture points), Main Building on slot 26, tribe walls, Blacksmith + Armoury, Town Hall celebrations, Sawmill/Brickyard/Iron Foundry/Grain Mill/Bakery, Great Barracks/Stable, Trade Office, Tournament Square, Stonemason, Brewery, Trapper (traps capture attackers), Horse Drinking Trough, Roman dual build queue, morale bonus, Residence/Palace defence, T3.6 loss exponent.
- Classic layout and original artwork: resource-field oval, village centre with walls, round top navigation, map tiles, unit/resource icons, classic report tables. Credits renamed to Gold.

## 0.4.0 — 2026-10-04
- Railway deployment config (`railway.json`).
- Crypto: Sign-In with Ethereum (link wallet, wallet login), token-holder tiers (Bronze–Diamond) applied as perks, ETH/token top-ups via `GamePayments` contract with an idempotent deposit indexer (+20% credits for token payments).
- Fixes: rankings/admin per-player subqueries, hero health/XP bars, viem block-number cache in the indexer.

## 0.3.0 — 2026-10-04
- Credits shop: boosts, instant finish, NPC merchant. World chat with live refresh. Paid news ticker with hourly slots. Admin panel.

## 0.2.0 — 2026-10-04
- Academy research, Smithy upgrades, heroes, oases with animals, culture points, settlers, chiefs and conquest, marketplace, alliances with diplomacy, starvation.

## 0.1.0 — 2026-10-04
- Playable core: fields, buildings, three tribes, training, map, raids/attacks/scouting/reinforcements, reports, messages, rankings, beginner protection.
