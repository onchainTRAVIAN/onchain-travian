"""Prompt table for the kie.ai art: every building (5 stages), every unit, every tribe hero (5 stages)."""

STYLE = (
    'Hand-painted 2D game art for a cosy medieval strategy browser game, rich painterly style: soft warm daylight from the top-left, '
    'gentle ambient occlusion, detailed textures (timber, stone, roof tiles, thatch, cloth, polished metal), vibrant but natural colours, '
    'crisp readable silhouette. Original artwork. Single subject centred, fully inside the frame with a margin, on a plain pure white '
    'background (#ffffff), no text, no letters, no logo, no frame, no border, no other objects.'
)
BUILDING = (
    'Isometric 3/4 view from above at about 35 degrees. The building stands directly on the ground with only a soft contact shadow '
    'and a few small stones or tufts of grass at its foot — no platform, no base, no disc, no ground tile. '
)
UNIT = 'Full-body character, dynamic 3/4 pose facing left, standing on a small soft shadow, the whole figure (and mount) visible. '
SAME = ('The reference image shows ONLY the art style to copy (camera angle, lighting, rendering, outline softness, palette, level of detail). '
        'Do NOT copy its subject, shape, roof, tower, flags or layout: draw the completely different subject described below. ')

# How each stage looks (levels 1-4, 5-9, 10-14, 15-19, 20).
STAGE = {
    1: 'Size 1 of 5 — tiny and humble: a single small one-storey hut of rough logs and planks with a thatched roof, no stone, no tower, no flags.',
    2: 'Size 2 of 5 — small: one storey of sawn timber with a wooden shingle roof, a small porch, one small pennant, no stone, no tower.',
    3: 'Size 3 of 5 — medium: a two-storey building with a stone ground floor and half-timbered upper floor, red clay tile roof, one banner.',
    4: 'Size 4 of 5 — large: a big stone building with an extra wing and one tower, slate or tile roofs, several banners.',
    5: 'Size 5 of 5 — grand: the largest and richest version of THIS SAME building type, in dressed stone with gold trim and flags. Its function must stay obvious at a glance (keep its characteristic features). No golden dome and no palace look.',
}

BUILDINGS = {
    'main': 'The village main building: the hall where the master builders work, with scaffolding poles and a builder\'s crane at the side.',
    'rally': 'A rally point: an open military camp with tents, a tall banner pole, weapon racks and training targets (no house).',
    'warehouse': 'A warehouse for wood, clay and iron: big double loading doors, a hoist beam with a hanging crate, stacked crates and logs outside.',
    'granary': 'A granary for crop: raised on stone stilts, grain sacks being hoisted into a loft door, sheaves of wheat outside.',
    'greatwarehouse': 'A great warehouse: a very large fortified storehouse with buttresses, several loading doors and heaps of crates and timber.',
    'greatgranary': 'A great granary: a very large grain store with several round silos and many grain sacks.',
    'cranny': 'A cranny: a hidden storage cellar dug into a small grassy mound with a wooden hatch door (low, mostly underground).',
    'embassy': 'An embassy: an elegant diplomatic house with a row of flags of many different colours in front.',
    'market': 'A marketplace: colourful striped market stalls with goods, barrels and sacks, later around an arcaded market hall.',
    'tradeoffice': 'A trade office: a merchants\' counting house with a hanging sign showing scales, carts and goods outside.',
    'barracks': 'Barracks: a soldiers\' hall with a drill yard, weapon racks and wooden training dummies.',
    'greatbarracks': 'Great barracks: a large walled fort with battlements, a keep and a drill yard.',
    'stable': 'A stable: a long horse stable with stall doors, horse heads looking out, hay bales and a horse outside.',
    'greatstable': 'A great stable: a very large stable complex with many stalls and horses.',
    'workshop': 'A siege workshop: an open workshop shed with a battering ram and a catapult frame being built, timber and tools.',
    'academy': 'An academy: a scholarly hall with columns, a dome and scrolls, a place of learning and research.',
    'blacksmith': 'A blacksmith: a forge with a glowing fire, an anvil, a tall chimney with smoke, weapons on the wall.',
    'armoury': 'An armoury: a building with shields and armour on display, armour stands outside.',
    'tournament': 'A tournament square: a round arena with wooden stands, pennants and a jousting barrier (no house).',
    'horsetrough': 'A horse drinking trough: a covered stone water trough with a water pump and horses drinking.',
    'residence': 'A residence: a noble\'s manor house.',
    'palace': 'A royal palace: the grandest building, with towers and domes.',
    'treasury': 'A treasury: a strong stone vault with heavy iron-bound doors and a glint of gold.',
    'townhall': 'A town hall: a civic hall with a columned portico and a bell tower, used for festivals.',
    'heromansion': 'A hero\'s mansion: a heroic hall with a statue of a hero and trophies.',
    'stonemason': 'A stonemason\'s lodge: a stone yard with cut blocks, chisels and a wooden crane.',
    'brewery': 'A brewery: a brewhouse with barrels, a copper brewing kettle and a chimney.',
    'trapper': 'A trapper\'s lodge: a hunters\' lodge with cages, nets, ropes and spiked traps around it.',
    'sawmill': 'A sawmill: a timber mill with a water wheel and stacks of logs and planks.',
    'brickyard': 'A brickyard: domed clay brick kilns with a glowing fire and stacks of bricks.',
    'ironfoundry': 'An iron foundry: a smelting furnace with glowing molten metal, ore heaps and iron bars.',
    'grainmill': 'A grain mill: a windmill with cloth sails and flour sacks.',
    'bakery': 'A bakery: a bakehouse with a domed bread oven, loaves on a counter and smoke from the chimney.',
    'wonder': 'A World Wonder: a colossal stepped monument temple; at stage 1 only foundations with scaffolding and a crane, rising stage by stage, finished at stage 5 as a magnificent gilded temple with a beacon.',
}
# Buildings whose stage 1-2 shouldn't be a wooden house (special shapes).
NO_HOUSE = {'rally', 'tournament', 'cranny', 'wonder', 'horsetrough', 'market'}

UNITS = {
    'romans': [
        'A Roman legionnaire infantryman: segmented steel armour, red tunic, large red rectangular curved shield with a gold emblem, short sword held ready, iron helmet.',
        'A Roman praetorian guard: heavy defensive infantry bracing a big red shield, spear, crested helmet, purple cloak.',
        'A Roman imperian elite attacker lunging forward with a short sword, plumed helmet, gold-trimmed armour, red cape.',
        'A Roman scout horseman on a fast chestnut horse, light tunic, no armour, shading his eyes with his hand.',
        'A Roman cavalryman on a bay horse charging with a spear, crested helmet, round red shield, red cape.',
        'A Roman heavy cavalryman on an armoured black horse with scale barding, red-crested helmet, long lance, oval shield.',
        'A Roman battering ram: a roofed wooden siege ram on wheels with an iron head, two soldiers pushing it.',
        'A Roman fire catapult: a wooden onager throwing a burning projectile, a soldier cranking it.',
        'A Roman senator: an old man in a white toga with a purple stripe and a laurel wreath, raising one hand, holding a scroll.',
        'Roman settlers: a man with a big bundle on his back leading a child by the hand, a woman carrying a basket on her head.',
    ],
    'teutons': [
        'A Teuton clubswinger: a bare-chested bearded brute with fur boots swinging a huge wooden club.',
        'A Teuton spearman: chain shirt, round blue painted shield, spear braced low, conical iron helmet with nose guard, blond beard.',
        'A Teuton axeman: horned iron helmet, red beard, raising a two-handed bearded axe, leather and fur.',
        'A Teuton scout: a hooded light warrior crouching and peering ahead, a dagger in hand, dark cloak.',
        'A Teuton paladin: an armoured knight on a grey horse with a big round shield with a blue cross and a raised sword, white surcoat.',
        'A Teutonic knight: black plate armour and a closed great helm, white surcoat with a black cross, couched lance, on a galloping armoured horse.',
        'A Teuton battering ram: a crude heavy log ram with an iron head on a wheeled frame, warriors pushing it.',
        'A Teuton catapult: a wooden stone-throwing catapult with a stone in its cup, a warrior loading it.',
        'A Teuton chief: an old chieftain with a long white beard, horned helmet with gold, bear-fur mantle, axe raised, holding a war banner.',
        'Teuton settlers: a man in a fur cap pulling a two-wheeled hand cart with sacks, a woman with a bundle and a child.',
    ],
    'gauls': [
        'A Gaul phalanx spearman: green and blue checked clothes, big green oval shield with a bronze boss, spear braced, bronze helmet.',
        'A Gaul swordsman: long blond hair and moustache, gold torc, swinging a long sword, small round blue shield.',
        'A Gaul pathfinder: a scout on a dun pony looking back over his shoulder, green cloak, short spear.',
        'A Gaul Theutates Thunder rider: a fast cavalryman on a galloping white horse throwing a javelin, blue cloak streaming.',
        'A Gaul druid rider: a hooded druid in a white robe with a long beard on a brown horse, holding a staff with mistletoe.',
        'A Gaul Haeduan heavy cavalryman: chain mail, bronze helmet with a red crest, round green shield, levelled lance, on a chestnut horse.',
        'A Gaul battering ram: a ram under a wicker and leather shed on wheels, warriors pushing it.',
        'A Gaul trebuchet: a tall wooden trebuchet with a counterweight and a stone in its sling, a warrior pulling the rope.',
        'A Gaul chieftain: a noble with an oak-leaf crown, gold torc, green cloak with a brooch, holding a spear, raising his hand.',
        'Gaul settlers: a man with a staff and a bundle on a pole, a woman with a basket, and a laden ox.',
    ],
    'natars': [
        'A Natar pikeman of an ancient empire: ornate dark steel and deep purple armour with gold trim, tall pointed helmet, long pike, tall tower shield.',
        'A Natar thorned warrior: spiked dark steel armour with purple cloth, swinging a spiked flail, tall helmet.',
        'A Natar guardsman: heavy infantry with an ornate purple and gold rectangular shield and a sword, tall helmet.',
        'A great golden eagle in flight, wings spread wide, talons out (a war bird of prey).',
        'A Natar axe rider: a rider in purple and gold armour on a black horse charging with a double-bladed axe.',
        'A Natar knight: heavy armour, tall golden helm, lance, on a horse with a purple and gold caparison.',
        'A Natar war elephant: an armoured elephant with a purple and gold headplate and a howdah tower with a rider.',
        'A Natar ballista: a large wooden bolt-throwing ballista with gold fittings and a soldier in purple armour.',
        'A Natar emperor: a tall regal ruler in flowing purple robes with gold, a jewelled crown and a sceptre, commanding gesture.',
        'Natar settlers: two people in purple tunics with a small cart of sacks.',
    ],
    'nature': [
        'A single large grey rat scurrying on all four legs, whiskers and long pink tail (an animal only, no people).',
        'A large black spider with long hairy legs and a red mark on its back.',
        'A green snake rearing up with its tongue out, body coiled.',
        'A bat flying with its wings spread.',
        'A wild boar charging with tusks, bristly brown fur.',
        'A grey wolf lunging forward, snarling.',
        'A big brown bear rearing up on its hind legs, roaring, claws out.',
        'A crocodile with its jaws wide open, low to the ground.',
        'An orange striped tiger leaping forward.',
        'A grey elephant walking with its trunk raised.',
    ],
}

HEROES = {
    'romans': (
        'A heroic Roman commander in a confident heroic stance with a sword.',
        [
            'Plain legionary armour, short red cape, simple helmet, simple shield.',
            'Better segmented armour, greaves, a small crest.',
            'Polished muscle cuirass, tall red crested helmet, red cape, gleaming sword.',
            'Ornate gold-trimmed armour with a chest medallion, long red cape, shining sword.',
            'Legendary general: gilded armour with an eagle emblem, laurel wreath, flowing crimson cape, sword glowing with soft golden light.',
        ],
    ),
    'teutons': (
        'A heroic Teuton warlord in a powerful stance with an axe raised.',
        [
            'Fur vest, simple iron helmet, plain axe and round shield.',
            'Studded leather armour, fur collar, helmet with a nose guard, painted shield.',
            'Chain shirt, horned helmet, blue cloak, heavy axe.',
            'Plate armour with gold trim, large horned helmet, long blue cloak, rune-carved axe.',
            'Legendary chieftain: golden winged and horned helmet, iron armour with gold knotwork, bear-fur mantle, axe with glowing blue runes.',
        ],
    ),
    'gauls': (
        'A heroic Gaul champion lunging forward with a sword and an oval shield.',
        [
            'Checked tunic and trousers, simple spear and shield.',
            'Leather armour, bronze helmet, green shield.',
            'Chain mail, bronze helmet, gold torc, green cloak, sword.',
            'Bronze armour with gold trim, small white wings on the helmet, long green cloak.',
            'Legendary hero: bronze and gold scale armour, golden winged helmet, large torc and brooch, flowing gold-hemmed green cloak, sword glowing with soft green light.',
        ],
    ),
}


def building_prompt(bid: str, stage: int) -> str:
    stage_txt = STAGE[stage] if bid not in NO_HOUSE else f'Stage {stage} of 5: {"small and simple" if stage <= 2 else "bigger and better built" if stage <= 3 else "large, rich and decorated with flags" if stage == 4 else "grand and magnificent, with gold trim and many flags"}.'
    return f'{SAME}{STYLE} {BUILDING}{BUILDINGS[bid]} {stage_txt}'


def unit_prompt(tribe: str, n: int) -> str:
    return f'{SAME}{STYLE} {UNIT}{UNITS[tribe][n - 1]}'


def hero_prompt(tribe: str, stage: int) -> str:
    base, stages = HEROES[tribe]
    return f'{SAME}{STYLE} {UNIT}{base} Gear level {stage} of 5: {stages[stage - 1]}'
