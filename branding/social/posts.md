# onchainTRAVIAN - X post queue

Posted by hand from the X Premium account (long posts allowed), 2-3 a day.
Voice: a real indie developer writing about their game. Plain sentences, "we", concrete facts and numbers, varied length.
No emojis, no dash punctuation (ranges as "1 to 8"), no hashtags, no slogan endings, no token talk.
The game link goes in a reply (X shows link posts to fewer people).
Each post: heading `### n. Title - status`, then `Media: ...` (what the picture/video shows) or `Poll: a / b / c (24 h)`,
`File: <path>` once the media exists (several files comma-separated = one X post with several media), the post in the first code block, optional `Reply under it: `...``.
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
Reply under it: `You can play here: https://travian.forum`

### 2. Pick your tribe - posted
Media: picture, the three tribes with three of their troops each
File: branding/social/img/02-tribes.jpg
```
Which tribe are you starting with?

Romans can build in the fields and in the village at the same time, and their City Wall gives the highest defence bonus.

Teutons have the cheapest troops in the game and are built for raiding.

Gauls have the fastest cavalry, a Trapper that captures attackers, and a cranny that hides twice as much.

Tell us in the replies.
```

### 3. Combat simulator - posted
Media: video, troops typed into the simulator while the result changes live (10 to 15 s)
File: branding/social/img/03-simulator.mp4
```
We added a combat simulator.

You enter both armies with their upgrades, heroes, morale and bonuses, plus the wall, Residence, Stonemason, traps and up to two reinforcing armies. The result updates while you type: who wins, the losses on each side, what the rams and catapults destroy, how much the survivors can carry, and what the lost troops cost.

It calls the same battle code the server uses for real attacks, and a test compares the two after every change.
```

## Day 2

### 4. Auto training - ready
Media: screenshot, the auto training panel with troop shares and building load
File: branding/social/img/04-auto.jpg
```
Auto training is in.

You give each troop a share of your resources, for example 60% Legionnaires and 40% Imperians, and choose how long it should run, from 1 to 8 hours. Every minute it spends your current stock by those shares and queues whatever that buys.

Anything you don't assign stays in storage. When the time is up it stops on its own and leaves a note in your Info box.
```

### 5. Live map - ready
Media: video, dragging and zooming the live map, then jumping somewhere from the minimap (10 to 15 s)
File: branding/social/img/05-livemap.mp4
```
The world map is now a live map.

You can drag it with the mouse or a finger, zoom between 35% and 200%, and jump anywhere from a minimap of the whole world. Your villages, your alliance, other players, the Natars and the oases each have their own colour.

Your attacks, raids and reinforcements are marked on the map and refresh every 15 seconds. If you prefer the old diamond view, it's still there under Classic.
```

### 6. Hand-drawn troops - posted
Media: picture, all 30 troops and the oasis animals lined up on parchment
File: branding/social/img/06-troops.jpg
```
All 30 units and the oasis animals are drawn by hand in the old comic style: thick outlines, flat colours and slightly ridiculous faces.

None of it is taken from the original game. If you had to pick one for the front page, which would it be?
```

## Day 3

### 7. The hero - ready
Media: picture, the five hero portrait frames side by side, from wood to jewelled gold
File: branding/social/img/07-hero.jpg
```
How the hero works.

You train it from one of your own fighting units, and it keeps that unit's speed and base strength. Every level gives 5 skill points for attack, defence, the two army bonuses or regeneration.

The hero fights with its army, is needed to capture oases, and gains experience from every battle. Its portrait frame changes every 5 levels, from plain wood up to jewelled gold.
```

### 8. Closing loopholes - ready
Media: painting, a Roman scribe checking scrolls and a pair of scales by lamplight
File: branding/social/img/08-loopholes.jpg
```
Before more players arrived, we went through the rules looking for ways to cheat. A few of the things we closed:

The Gold market can no longer be used to hide goods from an incoming attack.
Gold from tasks and medals can't be sent to other accounts.
A running upgrade can't undo damage from rams or catapults.
Releasing an oasis no longer respawns its animals for free hero experience.
Names like Natars or Admin can't be registered.

If you find something we missed, please let us know.
```

### 9. New and returning players - ready
Media: screenshot, the game guide search with a help bubble open
File: branding/social/img/09-guide.jpg
```
For new players, and for anyone coming back after a few years away.

The game has a built-in guide with more than 120 searchable topics, a list of 29 tasks with rewards that walks you through the first days, and a small help icon next to every stat that explains it in one sentence.

Every building and every troop also has a table with all of its levels.
```

## Day 4

### 10. The Natars - posted
Media: painting, a Natar army with war elephants outside a walled village at dawn
File: branding/social/img/10-natars.jpg
```
Once your account passes 300 population, the Natars start to notice you.

They attack at most once a day, at a random hour, with an army sized at 50 to 90% of your own strength, counting your troops, wall, Residence and population. Usually it's a raid. Sometimes they bring war elephants.

Players under 300 population are never targeted. If you want to see what's coming, the simulator can load your village and show a typical Natar army against it.
```

### 11. Oasis raider - ready
Media: screenshot, the oasis raider panel with the next planned raids
File: branding/social/img/11-raider.jpg
```
New in the Gold Club: an oasis raider.

Free oases collect resources over time. With the raider switched on, it checks the free oases within your chosen range every few minutes, skips the guarded ones unless you allow enough troops to beat the animals, and sends only as many troops as the loot needs, fastest units first. It never sends a second raid to an oasis that already has one on the way.

The Gold Club also includes farm lists, trade routes and troop evasion.
```

### 12. Villages on the map - posted
Media: picture, the five map village pictures in a row, from a few huts to a walled city
File: branding/social/img/12-villages.jpg
```
Villages on the map change as they grow. A new one is a handful of huts. At 250 and 500 population it becomes a proper village, at 1,000 a walled town, and at 1,500 a crowded walled city.

It makes it much easier to read a neighbourhood at a glance.
```

## Day 5

### 13. Battle reports - posted
Media: screenshot, a battle report with the result bar, losses and loot
File: branding/social/img/13-report.jpg
```
We redesigned the battle reports.

The report list is coloured by outcome: green when you lost nothing, yellow for some losses, red when nobody came back. Inside, a bar compares attack and defence, both sides' losses are listed along with your hero's health and experience, and the loot shows how full your troops were.

There's also an Attack again button that refills the same troops, hero and target.
```

### 14. On your phone - ready
Media: screenshot, three phone screens side by side (village, map, reports)
File: branding/social/img/14-phone.jpg
```
The game works on phones without an app.

On a small screen the menu folds behind a single button, so every page opens on its content. Tabs scroll sideways, the map pans with one finger and zooms with a pinch, and incoming attacks stay pinned at the top.
```

### 15. Weekly medals - ready
Media: screenshot, the weekly Top 10 page with medals
File: branding/social/img/15-week.jpg
```
Every Monday at midnight UTC we hand out the weekly medals.

The top three in five rankings (attackers, defenders, climbers, robbers and expansion) get a gold, silver or bronze medal on their profile, together with 300, 200 or 100 Gold. The rankings only count that week, so anyone has a shot.
```

## Day 6

### 16. Every building, every level - ready
Media: screenshot, a building page with its full level table
File: branding/social/img/16-levels.jpg
```
Each building page now has a table with every level: the cost in all four resources, the build time with your current Main Building, the population and culture points it adds, and what that level actually gives you.

The game guide has the same tables for every building, so you can plan ahead without a spreadsheet.
```

### 17. The endgame - ready
Media: painting, a golden World Wonder rising over a battlefield with alliance banners around it
File: branding/social/img/17-endgame.jpg
```
How a world ends.

There are 22 artifacts held in Natar treasuries. To take one you need catapults to destroy the treasury, a winning attack with your hero, and an empty treasury of your own to carry it home.

Later, the construction plans for the World Wonder are released. An alliance that holds a plan can build a Wonder, and the first one to reach level 100 wins the world.
```

### 18. Tests - ready
Media: picture, a run of the test suite in a terminal (real output, 208 passed)
File: branding/social/img/18-tests.jpg
```
Every change to the game goes through more than 200 automated tests before it reaches the live world. They check the battle formulas against known reference values, building costs and times, troop stats, production, the simulator against real fights, and security.

The source is public on GitHub if you'd like to look.
```
Reply under it: `https://github.com/onchainTRAVIAN/onchain-travian`

## Day 7

### 19. Precise clicks - posted
Media: video, the cursor moving over the village centre while each building highlights (8 to 10 s)
File: branding/social/img/19-clicks.mp4
```
A detail most people won't notice: in the village centre, the building under your cursor highlights, and a click opens exactly that building.

Each picture has a pixel outline that's checked from front to back, so a tower standing in front of the barracks doesn't swallow the click, and empty grass does nothing.
```

### 20. First move - ready
Poll: Raid / Build / Defend / A mix (24 h)
```
When a new world starts, what's the first thing you do?
```

### 21. Three walls - ready
Media: picture, the gates of the three level 20 walls side by side
File: branding/social/img/21-walls.jpg
```
Each tribe has its own wall. They all start as wooden stakes and change four times as they level up.

At level 20 the Romans have a white stone city wall with red roofed gate towers and the highest defence bonus. The Teutons have an earth rampart topped with a palisade and timber gate towers, the hardest wall to bring down with rams. The Gauls have a tall timber palisade with thatched gate towers.
```

## Day 8

### 22. Buildings that grow - ready
Media: picture, the Main Building in its five stages (levels 1, 5, 10, 15, 20)
File: branding/social/img/22-stages.jpg
```
Every building has five pictures, for levels 1, 5, 10, 15 and 20. Timber and thatch gradually turn into stone walls, red tile roofs and towers.

After a couple of weeks your village centre looks noticeably different from the one you started with.
```

### 23. Alliance treaties - posted
Media: painting, a Roman and a Teuton chieftain clasping hands over a war table
File: branding/social/img/23-treaties.jpg
```
Alliance treaties are enforced by the game.

Members of the same alliance, or of alliances in a confederacy or a non-aggression pact, can't attack, raid or scout each other. Reinforcing and trading still work, and declaring war is still public.

So no more accidental farm list hits on an ally.
```

### 24. The cranny - posted
Media: screenshot, the cranny page showing how much it hides
File: branding/social/img/24-cranny.jpg
```
A note on the cranny.

Each level hides 3.5% of your storage from raiders, up to 35% at level 10. A Gaul cranny hides twice as much, so Gauls reach the 35% cap at level 5. Whatever is hidden can't be taken. Everything above it can.
```

## Day 9

### 25. Oases - posted
Media: painting, a hero and riders charging wolves and boars at a palm oasis
File: branding/social/img/25-oases.jpg
```
Free oases collect resources and are guarded by wild animals, which grow back every day until a neglected oasis holds a sizeable force.

Beat the animals and you take the resources. With a Hero's Mansion at level 10 and your hero in the attack, you can take the oasis itself and add its production bonus to your village. If another player already holds it, each hero attack lowers its loyalty until it changes hands.
```

### 26. Artifacts - posted
Media: screenshot, the Artifacts and Wonders page
File: branding/social/img/26-artifacts.jpg
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

### 27. Gold market - posted
Media: screenshot, the Gold market offer list
File: branding/social/img/27-goldmarket.jpg
```
There's a Gold market where players sell resources or troops to each other for Gold.

Goods are held until the sale goes through. Troops can only be sold to players of the same tribe, and they march to the buyer like any other army.

It can't be used as a vault either. Cancelled or reduced offers walk back to the village instead of reappearing there instantly.
```

## Day 10

### 28. Conquest - posted
Media: painting, a senator on horseback raising a banner over a captured village
File: branding/social/img/28-conquest.jpg
```
To take a village rather than just raid it, you need chiefs: Senators for Romans, Chiefs for Teutons, Chieftains for Gauls. Each successful attack with them lowers the village's loyalty, and when it reaches zero the village is yours.

You also need enough culture points and a free expansion slot. Capitals can't be conquered, and no player can lose their last village.
```

### 29. Catapult targets - ready
Media: screenshot, the send troops form with the catapult target list open
File: branding/social/img/29-catapult.jpg
```
Where your catapults hit depends on your Rally Point.

Below level 3 they pick a random building. At level 3 you can aim at storage, at level 5 at fields and bonus buildings, and at level 10 at nearly everything. At level 20, with at least 20 catapults, one attack can hit two targets.

Rams strike the wall before the battle, so the defenders fight behind whatever is left of it.
```

### 30. The Info box - ready
Media: screenshot, the Info box with an incoming attack and a hero notice
File: branding/social/img/30-infobox.jpg
```
The Info box under the menu lists what needs your attention: incoming attacks, how much beginner protection you have left, a hero waiting to be revived or with unspent points, boosts about to run out, and new reports.

It saves a lot of clicking around.
```

## Day 11

### 31. Cropper finder - ready
Media: screenshot, cropper finder results with oasis bonuses
File: branding/social/img/31-croppers.jpg
```
Gold Club members get a cropper finder. It lists every 9 and 15 crop field within 10, 20 or 30 fields of your village, along with the crop bonus from the oases around each one.

That's usually where the capital that feeds your army ends up.
```

### 32. Hero progress - ready
Media: screenshot, the hero page with level, skill points and the revive option
File: branding/social/img/32-hero.jpg
```
One rule we changed on purpose: if your hero dies and you train a new one, even from a different unit, it keeps its level, experience and skill points. Only the unit it fights as changes.

Losing your hero still costs you, but it doesn't wipe out everything it earned.
```

### 33. Gaul traps - posted
Media: painting, Gaul trappers dragging netted soldiers into a palisade
File: branding/social/img/33-traps.jpg
```
Gauls have the Trapper. Its traps catch attackers before the battle starts, and the captured troops stay in the village as prisoners, still eating their owner's crop.

The owner can try to free them with an attack. The Gaul can also let them go at any time.
```

## Day 12

### 34. Battle maths - posted
Media: screenshot, a battle report next to the simulator showing the same result
File: branding/social/img/34-maths.jpg
```
For the veterans: combat follows the classic T3 model.

Morale weakens attacks on much smaller players. Rams hit the wall before the fight. Catapult damage depends on attack strength, building sturdiness and the Stonemason. Traps, hero bonuses and smithy upgrades all count.

Our tests pin these formulas to known reference values, so the numbers you remember should still work.
```

### 35. A fast world - posted
Media: painting, a village growing in fast motion while the sun and moon cross the sky
File: branding/social/img/35-fast.jpg
```
The live world runs at high speed. Production, construction, training and marching are all many times faster than on a classic server, so what used to take a month takes days.

Crop upkeep isn't sped up, so a big army still needs real farmland behind it.
```

### 36. How the art was made - ready
Media: picture, two troops in their three versions (painted, old-school, final comic)
File: branding/social/img/36-versions.jpg
```
We redrew the troops three times. The first version was painted, the second was a set of simple old-school figures, and neither looked like the game we remembered.

The final set is drawn by hand in the old comic style.
```

## Day 13

### 37. Open beta - posted
Media: 12 s trailer (our paintings animated with Veo 3.1: BUILD, RAID, CONQUER, SPEED x100, real game screens, logo end card; music made with Suno) and a picture of the village centre with "Beta · speed x100" in the header. Both in one post, trailer first. The 9 s gameplay clip (37-beta.mp4: an attack from Send troops to the report) is spare for a later post.
File: branding/social/img/37-trailer.mp4, branding/social/img/37-beta.jpg
```
The onchainTRAVIAN open beta is live. The world runs at x100 speed.

Production, building, training and marching are all 100 times faster than on a classic server. Cavalry reaches the village next door in 3 seconds, a march that takes about 4 minutes at normal speed.

Joining is free during the beta: you sign in with a wallet like MetaMask, pick a name and a tribe, and start with one village. The world will start over for the full launch, so now is a good time to learn it and find bugs. If something looks wrong, reply here and we'll fix it.
```
Reply under it: `You can play here: https://travian.forum`

## Day 14

### 38. Your wallet is your account - ready
Media: picture, the front page with Connect wallet on a desktop, next to a phone without a wallet that offers the wallet apps
File: branding/social/img/38-wallet.jpg
```
You don't need a password or an email to play. Your wallet is your account.

Press Connect wallet and sign a short message. Signing only proves the wallet is yours: it costs no gas and sends nothing. The first time, you pick a name and a tribe and get your village. After that the same wallet logs you straight in.

It works with MetaMask, Rabby, Coinbase Wallet, OKX, Trust and other EVM wallets. On a phone without a wallet, the front page lists MetaMask, Trust Wallet, Coinbase Wallet, OKX Wallet and Phantom: tap yours and the game opens inside that app.
```
Reply under it: `You can play here: https://travian.forum`

### 39. Beginner protection - ready
Media: painting, a new hamlet under a faint golden dome while raiders wait on a ridge
File: branding/social/img/39-protection.jpg
```
New players get 24 hours of beginner protection. Nobody can attack, raid or scout your villages during that time.

The catch is that it ends the moment you attack, raid or scout another player. Raiding oases, sending reinforcements, trading and founding villages don't end it, so the first day is a good time to raid oases with your hero and grow.

Before it runs out, build a cranny and some defence, and don't sit on full storage.
```

### 40. When do you play - ready
Poll: Morning / Afternoon / Evening / Late night (24 h)
```
Attacks don't wait for you to log in. When do you usually play?
```

## Day 15

### 41. Scouting - ready
Media: painting, two hooded scouts in the grass at night counting the soldiers of a village below
File: branding/social/img/41-scouts.jpg
```
How scouting works.

You send only scouts. Each of yours has 35 scouting strength and each defending scout 20, upgrades raise both, and the defender's wall helps their scouts. Only scouts fight scouts, defending scouts never die, and the mission fails only if all of yours die.

If one gets back, you see the resources, the troops, the hero, the wall level and how much the cranny hides. The defender only gets a report if they have scouts at home. Every scout report also has a Simulate link that loads what you saw into the combat simulator.
```

### 42. The Natar army - ready
Media: picture, the ten Natar units drawn in the comic style, with attack, defence and speed
File: branding/social/img/42-natars.jpg
```
The Natars got their own drawings too: ten units in purple and gold, from the Pikeman to the War Elephant and the Natarian Emperor.

You meet them at their strongholds. A village holding a small artifact is guarded by 1,500 Pikemen, 800 Thorned Warriors, 1,000 Guardsmen, 300 Axeriders and 300 Natarian Knights. Large artifacts have twice that, unique ones four times, and World Wonder villages three times.
```

### 43. Where your production comes from - ready
Media: screenshot, the crop part of the Production page: fields by level, an oasis bonus, and what eats the crop
File: branding/social/img/43-production.jpg
```
Click any resource in the top bar and you get the Production page.

It lists your fields grouped by level with what each group makes per hour, then every bonus on top of that: oases, the Sawmill, Brickyard, Iron Foundry, Grain Mill and Bakery, and Gold boosts with their end time. For crop it also shows what eats it: buildings, troops at home and on the move, and the hero.

Handy when the number in the top bar doesn't add up.
```

## Day 16

### 44. Your first day - ready
Media: painting, the first morning of a new village: ploughing, a clay pit, woodcutters, a granary going up and recruits training
File: branding/social/img/44-firstday.jpg
```
A plan for your first day, taken from the game guide.

Start with all fields at level 2, then Warehouse and Granary to 3. Add a Rally Point, a Cranny at level 5 or more and Main Building 3, then take the fields to 4 or 5. Next come Barracks, a small raiding group and an Embassy so you can join an alliance. After that Main Building 5, a Marketplace, an Academy and a Residence at level 10 for your first settlers, plus a Grain Mill and a Hero's Mansion for a hero to raid oases with.

Get the Cranny to 10 before your protection ends. At x100 the limit is storage, not time, so raise the Warehouse and Granary along with your fields.
```
Reply under it: `You can play here: https://travian.forum`

### 45. Culture points and celebrations - ready
Media: painting, a night festival with lanterns and a bonfire on the square of a Roman town
File: branding/social/img/45-festival.jpg
```
Every building and field level produces culture points each day, and you need them for every new village: 2,000 for your second, 8,000 for the third and 20,000 for the fourth. Culture points are never spent, only counted.

The Town Hall speeds this up with celebrations. A small one gives you your daily culture production, up to 500 points. A great one gives up to 2,000 and also helps with conquest: each chief sent from that village lowers loyalty by 5 more, and enemy chiefs attacking it lower it by 5 less.

On this world a small celebration takes about 14 minutes at Town Hall level 1.
```

### 46. The oasis animals - ready
Media: picture, the ten oasis animals from rat to elephant with their defence values
File: branding/social/img/46-animals.jpg
```
Ten kinds of animals guard the free oases, from rats to elephants. They never attack, they only defend, and each oasis type has its own mix: forests have boars, wolves and bears, lakes have snakes, crocodiles and now and then an elephant.

Animals grow back on real time, not world speed: about 350 defence power a day, until an oasis holds 8,000. A cleared oasis is safe to raid for a while. One that nobody touches keeps getting stronger.
```

## Day 17

### 47. Your second village - ready
Media: painting, three settlers with an ox cart marking out a new village in an empty river valley
File: branding/social/img/47-settlers.jpg
```
How to found your second village.

Build a Residence or a Palace to level 10, which gives you a free expansion slot, and collect 2,000 culture points. Train 3 settlers there, pick an empty field on the map and send exactly those 3 settlers, nothing else.

The new village starts with 800 of each resource and a level 1 Main Building, so send it resources early. If someone settles the spot first, your settlers walk home. On this world a settler takes about 1.5 to 2 minutes to train at Residence level 10.
```

### 48. Village types - ready
Media: picture, the three field layouts side by side: 4-4-4-6, 9-cropper and 15-cropper
File: branding/social/img/48-types.jpg
```
Every spot on the map has a fixed mix of 18 resource fields. Everyone starts on a 4-4-4-6: four woodcutters, four clay pits, four iron mines and six croplands.

9-croppers (3-3-3-9) and 15-croppers (1-1-1-15) have far more crop. Only your capital can raise its fields above level 10, so the guide's advice is a cropper with crop oases within 3 fields for the capital that will feed your army.
```

### 49. Second village poll - ready
Poll: 15-cropper / 9-cropper / Right next door / Wherever is free (24 h)
```
Where does your second village go?
```

## Day 18

### 50. Romans - ready
Media: picture, the ten Roman units with attack, defence, speed and carry
File: branding/social/img/50-romans.jpg
```
A few notes for Roman players.

Romans can upgrade a field and a building at the same time, so keep both busy. Legionnaires raid and defend early on, later Imperians attack and Praetorians defend. Equites Imperatoris carry 100 and move 14 fields an hour, which makes them very good raiders.

The City Wall gives +81% defence at level 20, the most of the three walls. The Horse Drinking Trough cuts cavalry crop upkeep from level 10, and Senators lower loyalty by 20 to 30% per attack, more than any other chief.
```

### 51. When the crop runs out - ready
Media: painting, hungry legionaries and a quartermaster with an empty sack outside an empty granary
File: branding/social/img/51-starvation.jpg
```
What happens when your crop runs out.

Nothing, as long as there's crop in the granary. Once it's empty and your net crop is still below zero, troops start to starve until what they eat fits what you produce. Reinforcements from other villages go first, then your own army, and within each army the units that eat the most die first, so catapults go before infantry.

Crop upkeep isn't sped up on this world, so a big army needs real farmland or crop oases behind it. The owner of the starved troops gets a report.
```

### 52. Merchants - ready
Media: screenshot, the Marketplace with its tabs and the send form
File: branding/social/img/52-merchants.jpg
```
Merchants differ by tribe. A Roman merchant carries 500 resources, a Teuton 1,000 and a Gaul 750. Gauls are the fastest at 24 fields an hour, Romans do 16 and Teutons 12, and on this world it all runs 100 times faster.

Each Marketplace level gives you 10 merchants here, and every Trade Office level adds 10% to what they carry. You can save up to 30 destinations and trade with other players at a ratio between 1:2 and 2:1. With the Gold Club, trade routes ship goods between your own villages up to three times a day.
```

## Day 19

### 53. Farm lists - ready
Media: screenshot, a farm list with the result and loot of each target's last raid
File: branding/social/img/53-farmlists.jpg
```
Farm lists are part of the Gold Club. You save up to 100 targets per list, villages or oases, each with its own troops, and raid them all with one click or automatically every 15, 30, 60 or 120 minutes.

Every target shows how its last raid went (won without losses, won with losses, or lost) and how much it brought back. One button adds every free oasis within up to 35 fields, another removes the oases holding less than a set amount.

The normal rules still apply: troops have to be at home, and protected players are skipped.
```

### 54. Evasion - ready
Media: painting, a capital's army riding out of the back gate while an enemy army reaches the front
File: branding/social/img/54-evasion.jpg
```
Evasion, another Gold Club option, is for an army you can't afford to lose.

Turn it on in your capital, and when an attack or a raid arrives, the capital's own troops at home leave just before it lands and come back about a minute later on this world. They don't fight, so the attacker may still win against what's left and take loot.

Only the capital can evade, and only its own troops. Reinforcements and the hero stay where they are.
```

### 55. Teutons - ready
Media: picture, the ten Teuton units with attack, defence, speed and carry
File: branding/social/img/55-teutons.jpg
```
Some notes for Teuton players.

Clubswingers are the cheapest unit in the game: 9 seconds each at Barracks level 1 on this world, and they carry 60. Raid early and often. Enemy crannies hide only 80% of the usual amount from Teutons, Paladins carry 110 and defend well against infantry, and Spearmen are cheap defence against cavalry.

The Earth Wall gives the smallest bonus of the three walls but is the hardest to ram. The Brewery adds up to 10% attack, but while you have one your chiefs work at half strength. Teuton merchants carry 1,000.
```

## Day 20

### 56. Incoming attack - ready
Media: painting, a watchman blowing a horn on a tower as a line of torches comes up the valley at night
File: branding/social/img/56-alarm.jpg
```
You log in and there's a red incoming attack on your village. What can you do?

You see who sent it and when it lands, not what's coming, so scout the sender. Spend your resources on buildings or troops so there's little to take. Train defenders if there's time, or ask your alliance to reinforce you. If you can't hold, send your army away, for example as reinforcement to your other village, or use evasion in the capital.

Protection or a treaty made after the attack was sent won't stop it. That's the classic rule and we kept it.
```

### 57. One building per tribe - ready
Media: picture, the Horse Drinking Trough, the Brewery and the Trapper at level 20
File: branding/social/img/57-buildings.jpg
```
Each tribe has one building nobody else can build.

Romans have the Horse Drinking Trough. Their cavalry trains 1% faster per level, and at levels 10, 15 and 20 the three horsemen each eat one crop less.

Teutons have the Brewery in their capital, up to +10% attack for all their troops at level 10. While it stands their chiefs persuade at half strength, so it usually comes down before a conquest.

Gauls have the Trapper. Each trap catches one attacker before the fight, and the prisoners keep eating their owner's crop.
```

### 58. The capital - ready
Media: screenshot, a capital with its resource fields at levels 13 to 18
File: branding/social/img/58-capital.jpg
```
Your first village is your capital, and it plays by its own rules.

Only the capital can take its resource fields past level 10, all the way to 20. It can't be conquered and is never razed, even at 0 population, though catapults can still damage its buildings. The Stonemason's Lodge, the Brewery and evasion only work there, while the Great Barracks and Great Stable can't be built there.

You can move it by building a Palace in another village, but the old capital loses its Stonemason's Lodge and Brewery, and its fields above 10 drop back to 10.
```

## Day 21

### 59. Gauls - ready
Media: picture, the ten Gaul units with attack, defence, speed and carry
File: branding/social/img/59-gauls.jpg
```
Some notes for Gaul players.

The Phalanx is cheap defence against both infantry and cavalry, and a Trapper built early catches attackers before the fight. Your cranny hides twice as much, so it reaches the 35% maximum at level 5.

Theutates Thunders move 19 fields an hour and carry 75, the best long range raiders in the game. Druidriders are fast defenders against infantry, and Haeduans attack and also defend well against cavalry. Gaul merchants are the fastest at 24 fields an hour.
```

### 60. Razing a village - ready
Media: painting, catapults on a ridge knocking down a burning village at sunset
File: branding/social/img/60-razing.jpg
```
A village can be wiped off the map. If catapults bring its population to 0, it's razed: reinforcements and visiting heroes walk home, its oases become free, and the land is empty again.

Some villages can't be destroyed: a capital, a player's last village, a village holding an artifact and a World Wonder village. If the owner's hero was at home when it fell, the hero dies and its home moves to the capital.
```

### 61. Alliances - ready
Media: screenshot, an alliance page with members, roles and treaties
File: branding/social/img/61-alliance.jpg
```
To join an alliance you need an Embassy and an invitation. To found one you need Embassy level 3 and 280 Gold.

The size depends on the leader's Embassy: 3 members per level, so a level 20 Embassy leads 60 players. Officers can invite and remove members, edit the description and handle diplomacy, and only the leader changes roles or hands over the lead. If the leader leaves, the oldest officer takes over.

Members also get their own channel in the chat, next to the world chat.
```

## Day 22

### 62. Blacksmith and Armoury - ready
Media: screenshot, the Legionnaire's page with its values at upgrade levels 0, 5, 10, 15 and 20
File: branding/social/img/62-upgrades.jpg
```
The Blacksmith raises a unit's attack and the Armoury its defence, up to level 20, and a unit can't be upgraded past the building's level.

A Legionnaire starts at 40 attack. At Blacksmith level 10 it has 46, at level 20 about 52. Rams and catapults upgraded in the Blacksmith also destroy more. Upgrades count per village, so troops fight with the levels of the village they come from.

Each troop's page in the game lists its values and the cost of every level from 0 to 20.
```

### 63. Common mistakes - ready
Media: painting, a storehouse bursting with grain, logs and bricks while raiders load their carts and the chief dozes in a hammock
File: branding/social/img/63-mistakes.jpg
```
The most common beginner mistakes, from our game guide:

Letting storage fill up. Production stops there, and raiders love you for it.
Ending your own protection early by scouting or raiding a player.
Sending the hero alone into a fight it can lose.
Raiding an oasis with the hero and expecting to capture it. That takes a normal attack.
Keeping a big army on negative crop with an empty granary.
Keeping a Teuton Brewery while trying to conquer.
Spending Gold to finish long jobs early. It costs 1 Gold per minute here.
```

### 64. Player profiles - ready
Media: screenshot, a player profile with tribe, alliance, rank, stats and medals
File: branding/social/img/64-profile.jpg
```
Player profiles show the avatar, tribe, alliance, rank, medals, an About text and the list of villages. You can upload your own picture, which is cut to a 128 by 128 square, and write up to 500 characters about yourself.

One thing a profile doesn't show is when you were last online. Online status and last activity are private, so nobody can tell from your profile that you're asleep.
```

## Day 23

### 65. While you are away - ready
Media: picture, the start of the catchUp function from the game's source code
File: branding/social/img/65-catchup.jpg
```
A note on how the game works under the hood.

Your village isn't updated every second while you're away. When you open a page, or an attack or a delivery reaches your village, the server works out everything that happened since the last update: production, full storage, finished training and starving troops.

It splits that time wherever something changed, like a bonus starting or ending or a batch of troops finishing, and runs each stretch with the economy of that moment. So a production boost that ran out in the middle of the night counts exactly up to the moment it ended.
```

### 66. Backups - ready
Media: painting, scribes copying a world map onto scrolls in a candle-lit archive
File: branding/social/img/66-backups.jpg
```
The whole beta world lives in a single SQLite database file. Every 6 hours the game saves a compressed copy and keeps the newest 8, so we can go back up to two days if something breaks.

Old battle reports are cleared after 14 days, and each player keeps at most their newest 1,000. That keeps the database small and the pages quick.
```
