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

## Day 7

### 19. Click exactly what you see - draft
🎬 moving the mouse over the village centre, each building glows under the cursor (8-10 s)
```
🖱️ Devlog: Click exactly what you see

In the village centre, the building under your mouse lights up - and a click opens exactly that one.

Every building and wall picture has a pixel outline, checked front to back, so a tower standing in front of the barracks never steals your click. Grass and roads do nothing.

Small thing. You notice it every day.
```

### 20. Raider or builder - draft
📊 poll: Raider / Builder / Defender / A bit of everything (24 h)
```
Be honest. ⚔️

When a new world starts, what's your plan?

🔥 Raider - farms first, questions later
🏗️ Builder - fields to 10, then we talk
🛡️ Defender - walls up, troops home, let them come
🎲 A bit of everything
```

### 21. Three tribes, three walls - draft
📸 the three level-20 walls side by side (marble, fieldstone fortress, sandstone with thatched towers)
```
🧱 Three tribes, three walls.

Every wall starts as wooden spikes and grows through four grander stages.

At level 20:
🔴 Romans - a white marble city wall, the strongest defence bonus
🔵 Teutons - a grey fieldstone fortress with timber towers, the hardest to break with rams
🟢 Gauls - a sandstone wall with round thatched towers and green-and-yellow banners
```

## Day 8

### 22. Buildings that grow - draft
📸 one building in its 5 stages (levels 1, 5, 10, 15, 20) in a row
```
🏗️ Your village grows up with you.

Every building has five pictures - levels 1, 5, 10, 15 and 20. Wood and thatch turn into stone, towers and gold trim as you upgrade.

Walk through your village centre and you can see how far you've come.
```

### 23. Alliances with teeth - draft
🎨 painting: three chieftains clasping hands over a war table, banners behind them
```
🤝 Alliances with teeth.

Same alliance, a confederacy or a non-aggression pact? Then you simply can't attack, raid or scout each other. The game blocks it.

Reinforcements and trade still work. War stays a public statement.

No more "sorry, my farm list hit you by mistake".
```

### 24. The cranny - draft
📸 the cranny building page with its "hides" table
```
🕳️ Know your cranny.

Each level hides 3.5% of your storage from raiders, up to 35% at level 10. Gauls hide twice as much, so they hit the 35% cap at level 5.

Anything hidden can't be stolen. Anything above it is fair game.

Build it before your neighbours find you.
```

## Day 9

### 25. Oases - draft
🎨 painting: a hero and riders charging wolves and boars at a palm oasis
```
🌴 Oases are worth the fight.

Free oases fill up with resources and are guarded by wild animals that grow back every day - up to a real army if nobody clears them.

Beat the animals and the loot is yours. Bring your hero with a Hero's Mansion at level 10 and the oasis itself becomes yours, adding a production bonus to your village.

Someone else holds it? Attack with your hero until its loyalty breaks.
```

### 26. Artifacts - draft
📸 the Artifacts & Wonders page (artifact list with holders)
```
🏺 22 artifacts, waiting in Natar treasuries.

- Architects' secret - buildings that shrug off catapults
- Boots of the mercenary - faster troops
- Eyes of the eagle - sharper scouts
- Diet control - armies that eat less
- Trainers' talent - faster training
- Storage master plan - giant warehouses
- Rivals' confusion - bigger crannies, enemy catapults hit at random
- Artifact of the fool - a new random effect every day

Smash the treasury with catapults, win with your hero, and carry one home.
```

### 27. Gold market - draft
📸 the Gold market list of offers
```
💰 Devlog: Gold market

Sell resources or troops to other players for Gold.

Goods are held safely until someone buys. Troops can only be bought by the same tribe, and they march to the buyer like any army.

And no tricks: listing your goods doesn't hide them from an incoming attack.
```

## Day 10

### 28. Conquest - draft
🎨 painting: a senator on horseback raising a banner over a captured village
```
👑 Take a village, don't just raid it.

Train chiefs - Senators, Chiefs or Chieftains - and every attack lowers the village's loyalty. At 0 the village is yours.

You need culture points and a free expansion slot first. Capitals can never be taken, and nobody can lose their last village.
```

### 29. Catapult targets - draft
📸 send troops form with the catapult target dropdown
```
🎯 Where do your catapults hit?

It depends on your Rally Point:
- below level 3 - a random building
- level 3 - you can aim at storage
- level 5 - fields and bonus buildings too
- level 10 - almost anything
- level 20 with 20+ catapults - two targets in one attack

Rams hit the wall before the battle starts, so the defence fights behind a weaker wall.
```

### 30. The Info box - draft
📸 the Info box with an incoming attack and hero notice
```
🔔 Never miss what matters.

The Info box under the menu tells you, without hunting through pages:
- incoming attacks
- how long your beginner protection lasts
- your hero needs reviving or has free skill points
- boosts that end soon
- new reports

Open the game, glance left, you're up to date.
```

## Day 11

### 31. Cropper finder - draft
📸 the cropper finder results (9- and 15-crop fields with oasis bonus)
```
🌾 Looking for the perfect cropper?

The cropper finder lists every 9-crop and 15-crop field within 10, 20 or 30 fields of your village, with the crop bonus of the oases around it.

The capital that feeds your hammer starts here. Part of the Gold Club.
```

### 32. Your hero keeps going - draft
📸 hero page: level, skill points, revive button
```
🦸 Lost your hero? Not your progress.

When your hero falls you can revive it - or train a new one from another unit. Either way it keeps its level, experience and skill points.

Only the unit it fights as changes. Years of fights don't vanish in one bad attack.
```

### 33. Gaul traps - draft
🎨 painting: Gaul trappers hauling netted Roman soldiers into a palisade
```
🪤 Gauls don't just defend. They catch.

The Trapper builds traps that capture attackers before the fight. Caught troops sit in your village as prisoners - their owner keeps feeding them.

Free them by attacking, or the trapper can let them go. Either way someone pays.
```

## Day 12

### 34. Battle maths - draft
📸 a battle report next to the simulator showing the same result
```
🧮 For the veterans: the battle maths.

Combat follows the classic T3 model:
- morale that softens attacks from much bigger players
- rams that hit the wall before the fight
- catapult damage by attack strength, building sturdiness and the Stonemason
- Gaul traps, hero bonuses, Blacksmith and Armoury upgrades

Our tests pin the formulas to known reference values. If you remember the numbers, they still add up.
```

### 35. A fast world - draft
🎨 painting: a village growing in fast-forward, sun and moon racing across the sky
```
⚡ A fast world.

The live world runs at high speed: production, building, training and marching all move many times faster than a classic server.

What used to take a month takes days. Crop upkeep stays normal, so big armies still need real farms behind them.
```

### 36. How the art was made - draft
📸 one troop in three versions: painted, old-school, final comic
```
🎨 Behind the scenes: we redrew the troops three times.

First a painted style. Then simple old-school figures. Neither felt like the game we remember.

The final version is hand-made in the classic comic look - bold lines, bright colours, funny faces. Sometimes the old way is the right way.
```
