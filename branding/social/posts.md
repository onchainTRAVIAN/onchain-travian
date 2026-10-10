# onchainTRAVIAN - X post queue

Posted by hand from the X Premium account (long posts allowed), 2-3 a day.
Voice: a real indie developer writing about their game. Plain sentences, "we", concrete facts and numbers, varied length.
No emojis, no dash punctuation (ranges as "1 to 8"), no hashtags, no slogan endings, no token talk.
The game link goes in a reply (X shows link posts to fewer people).
Each post: heading `### n. Title - status`, then `Media: ...` (what the picture/video shows) or `Poll: a / b / c (24 h)`,
`File: <path>` once the media exists, the post in the first code block, optional `Reply under it: `...``.
Status (last word of each heading): draft → ready (text approved + media made, `File:` set) → posted / skipped.
Delivered by the Telegram bot @onchainTRAVIAN_bot (`scripts/social/tgbot.py`): Next sends the first ready post; Posted updates the heading here.

---

## Day 1

### 1. Launch - ready
Media: painting, a Roman commander on a cliff above his town, an oasis and the World Wonder
File: branding/social/what-hero.jpg
```
onchainTRAVIAN is live.

It's a remake of the classic browser strategy game, built on the original T3.6 rules: the same formulas, the same build times, the same battle maths.

You start with one village and 18 resource fields. From there it's 38 buildings, three tribes, heroes, oases, alliances and conquest, and at the end of the world, the race to finish a World Wonder.

All the art is drawn from scratch. It runs in the browser on desktop and phone, and it's free to play.
```
Reply under it: `You can play here: https://ancient-realms.up.railway.app`

### 2. Pick your tribe - draft
Poll: Romans / Teutons / Gauls (24 h)
```
Which tribe are you starting with?

Romans can build in the fields and in the village at the same time, and their City Wall gives the highest defence bonus.

Teutons have the cheapest troops in the game and are built for raiding.

Gauls have the fastest cavalry, a Trapper that captures attackers, and a cranny that hides twice as much.
```

### 3. Combat simulator - draft
Media: video, troops typed into the simulator while the result changes live (10 to 15 s)
```
We added a combat simulator.

You enter both armies with their upgrades, heroes, morale and bonuses, plus the wall, Residence, Stonemason, traps and up to two reinforcing armies. The result updates while you type: who wins, the losses on each side, what the rams and catapults destroy, how much the survivors can carry, and what the lost troops cost.

It calls the same battle code the server uses for real attacks, and a test compares the two after every change.
```

## Day 2

### 4. Auto training - draft
Media: screenshot, the auto training panel with troop shares and building load
```
Auto training is in.

You give each troop a share of your resources, for example 60% Legionnaires and 40% Imperians, and choose how long it should run, from 1 to 8 hours. Every minute it spends your current stock by those shares and queues whatever that buys.

Anything you don't assign stays in storage. When the time is up it stops on its own and leaves a note in your Info box.
```

### 5. Live map - draft
Media: video, dragging and zooming the live map, then jumping somewhere from the minimap (10 to 15 s)
```
The world map is now a live map.

You can drag it with the mouse or a finger, zoom between 35% and 200%, and jump anywhere from a minimap of the whole world. Your villages, your alliance, other players, the Natars and the oases each have their own colour.

Your attacks, raids and reinforcements are marked on the map and refresh every 15 seconds. If you prefer the old diamond view, it's still there under Classic.
```

### 6. Hand-drawn troops - draft
Media: screenshot, all 30 troops lined up on parchment
```
All 30 units and the oasis animals are drawn by hand in the old comic style: thick outlines, flat colours and slightly ridiculous faces.

None of it is taken from the original game. If you had to pick one for the front page, which would it be?
```

## Day 3

### 7. The hero - draft
Media: screenshot, the five hero portrait frames side by side, from wood to jewelled gold
```
How the hero works.

You train it from one of your own fighting units, and it keeps that unit's speed and base strength. Every level gives 5 skill points for attack, defence, the two army bonuses or regeneration.

The hero fights with its army, is needed to capture oases, and gains experience from every battle. Its portrait frame changes every 5 levels, from plain wood up to jewelled gold.
```

### 8. Closing loopholes - draft
Media: painting, a Roman scribe checking scrolls and a pair of scales by lamplight
```
Before more players arrived, we went through the rules looking for ways to cheat. A few of the things we closed:

The Gold market can no longer be used to hide goods from an incoming attack.
Gold from tasks and medals can't be sent to other accounts.
A running upgrade can't undo damage from rams or catapults.
Releasing an oasis no longer respawns its animals for free hero experience.
Names like Natars or Admin can't be registered.

If you find something we missed, please let us know.
```

### 9. New and returning players - draft
Media: screenshot, the game guide search with a help bubble open
```
For new players, and for anyone coming back after a few years away.

The game has a built-in guide with more than 120 searchable topics, a list of 29 tasks with rewards that walks you through the first days, and a small help icon next to every stat that explains it in one sentence.

Every building and every troop also has a table with all of its levels.
```

## Day 4

### 10. The Natars - draft
Media: painting, a Natar army with war elephants outside a walled village at dawn
```
Once your account passes 300 population, the Natars start to notice you.

They attack at most once a day, at a random hour, with an army sized at 50 to 90% of your own strength, counting your troops, wall, Residence and population. Usually it's a raid. Sometimes they bring war elephants.

Players under 300 population are never targeted. If you want to see what's coming, the simulator can load your village and show a typical Natar army against it.
```

### 11. Oasis raider - draft
Media: screenshot, the oasis raider panel with the next planned raids
```
New in the Gold Club: an oasis raider.

Free oases collect resources over time. With the raider switched on, it checks the free oases within your chosen range every few minutes, skips the guarded ones unless you allow enough troops to beat the animals, and sends only as many troops as the loot needs, fastest units first. It never sends a second raid to an oasis that already has one on the way.

The Gold Club also includes farm lists, trade routes and troop evasion.
```

### 12. Villages on the map - draft
Media: screenshot, the five map village pictures in a row, from a few huts to a domed city
```
Villages on the map change as they grow. A new one is a handful of huts. At 250 and 500 population it becomes a proper village, at 1,000 a walled town, and at 1,500 a city with a domed palace.

It makes it much easier to read a neighbourhood at a glance.
```

## Day 5

### 13. Battle reports - draft
Media: screenshot, a battle report with the result bar, losses and loot
```
We redesigned the battle reports.

The report list is coloured by outcome: green when you lost nothing, yellow for some losses, red when nobody came back. Inside, a bar compares attack and defence, both sides' losses are listed along with your hero's health and experience, and the loot shows how full your troops were.

There's also an Attack again button that refills the same troops, hero and target.
```

### 14. On your phone - draft
Media: screenshot, three phone screens side by side (village, map, reports)
```
The game works on phones without an app.

On a small screen the menu folds behind a single button, so every page opens on its content. Tabs scroll sideways, the map pans with one finger and zooms with a pinch, and incoming attacks stay pinned at the top.
```

### 15. Weekly medals - draft
Media: screenshot, the weekly Top 10 page with medals
```
Every Monday at midnight UTC we hand out the weekly medals.

The top three in five rankings (attackers, defenders, climbers, robbers and expansion) get a gold, silver or bronze medal on their profile, together with 300, 200 or 100 Gold. The rankings only count that week, so anyone has a shot.
```

## Day 6

### 16. Every building, every level - draft
Media: screenshot, a building page with its full level table
```
Each building page now has a table with every level: the cost in all four resources, the build time with your current Main Building, the population and culture points it adds, and what that level actually gives you.

The game guide has the same tables for every building, so you can plan ahead without a spreadsheet.
```

### 17. The endgame - draft
Media: painting, a golden World Wonder rising over a battlefield with alliance banners around it
```
How a world ends.

There are 22 artifacts held in Natar treasuries. To take one you need catapults to destroy the treasury, a winning attack with your hero, and an empty treasury of your own to carry it home.

Later, the construction plans for the World Wonder are released. An alliance that holds a plan can build a Wonder, and the first one to reach level 100 wins the world.
```

### 18. Tests - draft
Media: screenshot, the GitHub page with the passing checks
```
Every change to the game goes through more than 200 automated tests before it reaches the live world. They check the battle formulas against known reference values, building costs and times, troop stats, production, the simulator against real fights, and security.

The source is public on GitHub if you'd like to look.
```
Reply under it: `https://github.com/onchainTRAVIAN/onchain-travian`

## Day 7

### 19. Precise clicks - draft
Media: video, the cursor moving over the village centre while each building highlights (8 to 10 s)
```
A detail most people won't notice: in the village centre, the building under your cursor highlights, and a click opens exactly that building.

Each picture has a pixel outline that's checked from front to back, so a tower standing in front of the barracks doesn't swallow the click, and empty grass does nothing.
```

### 20. First move - draft
Poll: Raid / Build / Defend / A mix (24 h)
```
When a new world starts, what's the first thing you do?
```

### 21. Three walls - draft
Media: screenshot, the three level 20 walls side by side
```
Each tribe has its own wall. They all start as wooden stakes and change four times as they level up.

At level 20 the Romans have a white marble city wall with the highest defence bonus. The Teutons have a stone fortress with timber towers, the hardest to bring down with rams. The Gauls have a sandstone wall with round thatched towers.
```

## Day 8

### 22. Buildings that grow - draft
Media: screenshot, one building in its five stages (levels 1, 5, 10, 15, 20)
```
Every building has five pictures, for levels 1, 5, 10, 15 and 20. Timber and thatch gradually turn into stone, towers and gold trim.

After a couple of weeks your village centre looks noticeably different from the one you started with.
```

### 23. Alliance treaties - draft
Media: painting, three chieftains clasping hands over a war table
```
Alliance treaties are enforced by the game.

Members of the same alliance, or of alliances in a confederacy or a non-aggression pact, can't attack, raid or scout each other. Reinforcing and trading still work, and declaring war is still public.

So no more accidental farm list hits on an ally.
```

### 24. The cranny - draft
Media: screenshot, the cranny page showing how much it hides
```
A note on the cranny.

Each level hides 3.5% of your storage from raiders, up to 35% at level 10. A Gaul cranny hides twice as much, so Gauls reach the 35% cap at level 5. Whatever is hidden can't be taken. Everything above it can.
```

## Day 9

### 25. Oases - draft
Media: painting, a hero and riders charging wolves and boars at a palm oasis
```
Free oases collect resources and are guarded by wild animals, which grow back every day until a neglected oasis holds a sizeable force.

Beat the animals and you take the resources. With a Hero's Mansion at level 10 and your hero in the attack, you can take the oasis itself and add its production bonus to your village. If another player already holds it, each hero attack lowers its loyalty until it changes hands.
```

### 26. Artifacts - draft
Media: screenshot, the Artifacts and Wonders page
```
The 22 artifacts and what they do.

Architects' secret makes buildings and walls sturdier against siege.
Boots of the mercenary make troops move faster.
Eyes of the eagle strengthen scouts.
Diet control cuts crop upkeep.
Trainers' talent speeds up training.
Storage master plan unlocks the Great Warehouse and Great Granary.
Rivals' confusion enlarges crannies and makes enemy catapults hit at random.
The Artifact of the fool picks a different effect every day.

Small artifacts work for one village, large and unique ones for the whole account.
```

### 27. Gold market - draft
Media: screenshot, the Gold market offer list
```
There's a Gold market where players sell resources or troops to each other for Gold.

Goods are held until the sale goes through. Troops can only be sold to players of the same tribe, and they march to the buyer like any other army.

It can't be used as a vault either. Cancelled or reduced offers walk back to the village instead of reappearing there instantly.
```

## Day 10

### 28. Conquest - draft
Media: painting, a senator on horseback raising a banner over a captured village
```
To take a village rather than just raid it, you need chiefs: Senators for Romans, Chiefs for Teutons, Chieftains for Gauls. Each successful attack with them lowers the village's loyalty, and when it reaches zero the village is yours.

You also need enough culture points and a free expansion slot. Capitals can't be conquered, and no player can lose their last village.
```

### 29. Catapult targets - draft
Media: screenshot, the send troops form with the catapult target list open
```
Where your catapults hit depends on your Rally Point.

Below level 3 they pick a random building. At level 3 you can aim at storage, at level 5 at fields and bonus buildings, and at level 10 at nearly everything. At level 20, with at least 20 catapults, one attack can hit two targets.

Rams strike the wall before the battle, so the defenders fight behind whatever is left of it.
```

### 30. The Info box - draft
Media: screenshot, the Info box with an incoming attack and a hero notice
```
The Info box under the menu lists what needs your attention: incoming attacks, how much beginner protection you have left, a hero waiting to be revived or with unspent points, boosts about to run out, and new reports.

It saves a lot of clicking around.
```

## Day 11

### 31. Cropper finder - draft
Media: screenshot, cropper finder results with oasis bonuses
```
Gold Club members get a cropper finder. It lists every 9 and 15 crop field within 10, 20 or 30 fields of your village, along with the crop bonus from the oases around each one.

That's usually where the capital that feeds your army ends up.
```

### 32. Hero progress - draft
Media: screenshot, the hero page with level, skill points and the revive option
```
One rule we changed on purpose: if your hero dies and you train a new one, even from a different unit, it keeps its level, experience and skill points. Only the unit it fights as changes.

Losing your hero still costs you, but it doesn't wipe out everything it earned.
```

### 33. Gaul traps - draft
Media: painting, Gaul trappers dragging netted soldiers into a palisade
```
Gauls have the Trapper. Its traps catch attackers before the battle starts, and the captured troops stay in the village as prisoners, still eating their owner's crop.

The owner can try to free them with an attack. The Gaul can also let them go at any time.
```

## Day 12

### 34. Battle maths - draft
Media: screenshot, a battle report next to the simulator showing the same result
```
For the veterans: combat follows the classic T3 model.

Morale weakens attacks on much smaller players. Rams hit the wall before the fight. Catapult damage depends on attack strength, building sturdiness and the Stonemason. Traps, hero bonuses and smithy upgrades all count.

Our tests pin these formulas to known reference values, so the numbers you remember should still work.
```

### 35. A fast world - draft
Media: painting, a village growing in fast motion while the sun and moon cross the sky
```
The live world runs at high speed. Production, construction, training and marching are all many times faster than on a classic server, so what used to take a month takes days.

Crop upkeep isn't sped up, so a big army still needs real farmland behind it.
```

### 36. How the art was made - draft
Media: screenshot, one troop in its three versions (painted, old-school, final comic)
```
We redrew the troops three times. The first version was painted, the second was a set of simple old-school figures, and neither looked like the game we remembered.

The final set is drawn by hand in the old comic style.
```
