# Changelog

## 0.7.0 — 2026-10-04
- Map is one scalable SVG: sizes 7×7 / 11×11 / 15×15 / 21×21, Classic (diamond) or Flat (square tiles) view, remembered in a cookie.
- NPC trade keeps the exact total (unassigned rest spread over the chosen mix), live Rest counter + Distribute; also on the Marketplace.
- Player profiles: avatar upload (sharp → 128×128 WebP on the volume, `/avatar/:id`), tribe default portraits, About text, details card; avatars in rankings and alliance lists.
- Gold transfers between players (Plus page, profile link, message to receiver).
- Gold market (`/goldmarket`): sell resources or troops (no settlers/chiefs) for Gold; goods held in escrow; troops buyable only by the same tribe; delivery via `delivery` movement.
- Clean side menus (card panels, 16px line icons, active page highlight); layout zooms up on wide screens; phone overflow fixed.
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
