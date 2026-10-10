# onchainTRAVIAN - X post queue

Posted by hand from the X Premium account (long posts allowed), 2-3 a day.
Rules: the first 2-3 lines are the hook (X folds long posts behind "Show more" at about 280 characters);
plain "-" (never the long dash); no token talk; max 1-2 hashtags; the game link goes in a reply
(X shows link posts to fewer people).
Media key: 🎨 painted (kie.ai) · 📸 framed screenshot · 🎬 short screen video · 📊 poll (no media allowed).
Status (last word of each heading): draft → ready (text approved + media made, `File:` line set) → posted / skipped.
Delivered by the Telegram bot @onchainTRAVIAN_bot (`scripts/social/tgbot.py`): Next sends the first ready post; ✅ Posted updates the heading here.

---

## Day 1

### 1. Launch - ready
🎨 painted Roman commander over his town, oasis and Wonder
File: branding/social/what-hero.jpg
```
🏰 What is onchainTRAVIAN?

A faithful remake of the browser strategy classic, built on the original T3.6 rules - the same formulas, build times and battle maths veterans remember.

What you do:
- grow your village from 18 resource fields
- raise 38 buildings, each one grander every 5 levels
- train 10 units per tribe and lead a hero
- capture oases, forge alliances, conquer villages
- race for the World Wonder

Hand-drawn art. Plays in any browser, on PC and phone. Free.
```
Reply under it: `Play here: https://ancient-realms.up.railway.app`

### 2. Pick your tribe - draft
📊 poll: Romans / Teutons / Gauls (24 h)
```
Pick your side. ⚔️

🔴 Romans - strong all-rounders. They build a field and a building at the same time, and their City Wall gives the biggest defence bonus.
🔵 Teutons - cheap troops and brutal raiders. Their clubswingers clear a farm before breakfast.
🟢 Gauls - the fastest riders in the game, traps that capture attackers, and hiding spots twice as big.

Which tribe are you playing?
```

### 3. Combat simulator - draft
🎬 typing troops into the simulator, result changes live (10-15 s)
```
🛠️ Devlog: Combat simulator

Plan a fight before you send it. Results update as you type.

You can set:
- both armies, with Blacksmith and Armoury levels
- heroes, morale and attack/defence bonuses
- wall, Residence, Stonemason, Gaul traps
- up to two armies of reinforcements

It shows the winner, losses on both sides, what the rams and catapults break, how much loot the survivors carry, and what your dead soldiers cost.

It runs the exact same battle code as the server, and our tests check it against real fights.

#gamedev
```

## Day 2

### 4. Auto training - draft
📸 auto training panel with shares and busy bars
```
🛠️ Devlog: Auto training

Going to sleep? Let your village train for you.

Split your resources between troops - say 60% Legionnaires, 40% Imperians - and pick 1 to 8 hours. Every minute it spends what you have by those shares and keeps the barracks busy.

- quick setups: strongest attack, strongest defence, most loot
- a forecast per troop and how busy each building will be
- whatever you don't assign stays in your storage
- it stops by itself when the time is up and tells you
```

### 5. Live map - draft
🎬 dragging and zooming the live map, minimap jump (10-15 s)
```
🗺️ Devlog: Live map

The whole world in one smooth, draggable map.

- drag with mouse or finger, zoom from 35% to 200%
- a minimap of the entire world: you, your alliance, enemies, Natars and oases in their own colours
- hover any field for details, click to open it
- your attacks, raids and reinforcements show as markers, refreshed every 15 seconds

Prefer the old diamond view? It's still there under "Classic".

#browsergame
```

### 6. Hand-drawn troops - draft
📸 line-up of all 30 troops on parchment
```
🎨 Every troop is hand-drawn in the classic comic style.

Bold outlines, bright colours, funny faces and cartoon horses - 30 units across 3 tribes, plus the wild animals that guard the oases.

No stock art, no copied pictures: everything in the game is original.

Which one is your favourite?
```

## Day 3

### 7. The hero - draft
📸 the 5 hero portrait frames side by side (wood → jewelled gold)
```
🦸 Your hero

Every empire needs a face.

Train your hero from one of your own fighting units - it keeps that unit's speed and strength. Every level gives 5 skill points for attack, defence, army bonuses or regeneration.

The hero leads your army into battle, is the only one who can capture oases, and earns experience from every fight.

Its portrait frame grows with it: plain wood, bronze, silver, gold, and finally jewelled gold with a crown.
```

### 8. Fair play audit - draft
🎨 painting: a Roman scribe checking scrolls and scales by lamplight
```
🔒 Behind the scenes: we checked every rule for loopholes.

Before the world filled up, we went through the whole game looking for ways to cheat. Some we fixed:

- the Gold market can't hide goods from an incoming attack
- Gold from tasks and medals can't be farmed with extra accounts
- rams and catapults can't be undone by an upgrade already running
- releasing an oasis doesn't respawn its animals for easy hero XP
- reserved names like "Natars" or "Admin" can't be registered

Fair play first. Found something we missed? Tell us.
```

### 9. New or returning player - draft
📸 game guide search + a "?" help bubble open
```
📖 New to the game, or coming back after 15 years?

You won't need a wiki open in another tab.

- a game guide with 120+ topics and live search
- 29 tasks in 5 chapters that walk you through your first days, with rewards
- a small "?" next to every stat that explains it in one line
- full level tables for every building and every troop

Start slow, learn as you play.
```

## Day 4

### 10. The Natars - draft
🎨 painting: Natar army with war elephants at dawn outside a walled village
```
☠️ The Natars are coming.

Grow past 300 population and the NPC empire starts raiding you - at most once a day, at a random hour.

Their army is sized to 50-90% of your own strength: troops, wall, Residence and population. Mostly raids, sometimes a full attack with war elephants.

Small players are left alone. Big players never sleep easy.

Test your defence first: the simulator has a "Natars attack it" button.
```

### 11. Oasis raider - draft
📸 oasis raider panel with the next planned raids
```
🌴 Devlog: Oasis raider

Free oases fill up with resources over time. Collecting them by hand gets old fast.

Turn on the oasis raider and every few minutes it:
- scans the free oases within your range (up to 35 fields)
- skips the ones guarded by animals, or brings enough troops to beat them
- sends just enough troops to carry the loot home, fastest first
- never sends a second raid while one is on the way

Part of the Gold Club, together with farm lists, trade routes and troop evasion.
```

### 12. Villages grow on the map - draft
📸 the 5 map village stages in a row, hamlet → golden-domed city
```
🏘️ Watch your neighbours grow.

Every village on the map changes with its population:
- a few huts at the start
- a busy village at 250 and 500
- a walled town at 1,000
- a grand city with a golden-domed palace at 1,500

One look at the map tells you who's farming and who's ready for war.
```

## Day 5

### 13. Battle reports - draft
📸 a battle report (result banner, losses, loot bar, "Attack again")
```
📜 Devlog: Battle reports

Know what happened in two seconds.

- the list is colour-coded: green no losses, yellow some, red everything lost
- an attack vs defence bar shows how close it was
- losses on both sides, your hero's health and experience
- loot with a carry bar, so you know if you sent enough

And an "Attack again" button that refills the same troops, hero and target in one click.
```

### 14. On your phone - draft
📸 3 phone screens side by side (village, map, reports)
```
📱 The same game on your phone.

No app store, no download - open your browser and play.

The menu folds away behind one button, so pages start with what matters. Tabs swipe. The map moves with one finger and zooms with a pinch. Incoming attacks stay visible at the top.

Check your raids on the bus, plan your attacks on the PC.
```

### 15. Weekly medals - draft
📸 the weekly Top 10 page with medals
```
🏅 Every Monday at midnight, the medals are handed out.

The top 3 of the week in five rankings - attackers, defenders, climbers, robbers and expanders - get a gold, silver or bronze medal for their profile, plus 300, 200 or 100 Gold.

Rankings reset each week, so a new player can take one too.

Who's taking the first ones?
```

## Day 6

### 16. Every building, every level - draft
📸 a building page with its "All levels" table
```
🏗️ Every building, every level.

Each building page has an "All levels" table:
- cost in wood, clay, iron and crop
- build time with your own Main Building
- population and culture points it adds
- what each level gives - production, storage, merchants, defence - and the gain over the last level

The game guide has the same table for every building. Plan your village twenty levels ahead.
```

### 17. The endgame - draft
🎨 painting: a golden World Wonder rising over a battlefield, alliance banners around it
```
🏛️ How a world ends.

22 artifacts lie in Natar treasuries - faster troops, bigger storage, sharper scouts. Take one with catapults and your hero.

Then the Wonder building plans appear. An alliance that holds a plan can raise a World Wonder. The first to reach level 100 wins the world.

Every other alliance will try to stop them.
```

### 18. Built in the open - draft
📸 GitHub page + green tests badge
```
🧪 How we keep the game honest.

200+ automated tests run on every change before it reaches the live world:
- the battle formulas against known reference values
- building costs and times, troop stats, production
- the simulator against real fights
- security checks

The code is public on GitHub. Have a look.

#indiedev
```
Reply under it: `https://github.com/onchainTRAVIAN/onchain-travian`
