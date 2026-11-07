"""Social post images (kie.ai, Nano Banana), 16:9 painted scenes; logo added later. Resumable.

python3 scripts/art/brand/gen_social.py <out_dir> [--only id1,id2]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'kie'))
from kie import generate_many  # noqa: E402

STYLE = (
    'Wide 16:9 hand-painted key art for a cosy classic medieval / ancient Roman browser strategy game. '
    'Rich painterly 2D illustration like a polished strategy game loading screen: warm golden light, vibrant natural colours, '
    'atmospheric depth, crisp readable shapes, high detail. Full-bleed painting reaching every edge of the canvas: no border, no letterbox bars, no inner frame. '
    'No text, no letters, no numbers, no logo, no watermark, no frame, no UI. Original artwork. '
)

# Thread post 1 (2026-10-09): "What is onchainTRAVIAN?" - village growth, hero, oases, alliances, World Wonder.
POSTS = {
    'what-empire': 'Bird\'s-eye view of a thriving walled village on a green hill at golden hour: wheat, clay, timber and iron fields around it, a main building with red roofs, barracks and a marketplace; on the horizon a gleaming golden World Wonder tower under construction with scaffolding, glowing in the sunset.',
    'what-hero': 'A heroic Roman commander on a white horse on a ridge, red cape flowing, looking over a vast valley: his village below, a lush palm oasis with a lake, allied banners of three tribes (red, blue, green) on distant hills, and far away a colossal golden wonder tower catching the last sunlight.',
    'what-journey': 'One continuous panorama telling a story from left to right: a tiny hamlet with a few huts, then a growing town with stone walls and a busy market, then a mighty fortified city with a palace, and on the far right a towering golden World Wonder piercing glowing clouds. Warm sunrise light.',
    'what-council': 'Three tribal leaders - a Roman legate in red, a Teuton chieftain in blue furs, a Gaul druid-warrior in green - standing together on a cliff around a war table with a painted map, banners waving, their armies camped in the valley below and a golden World Wonder rising on the horizon at sunset.',
    # X post queue (branding/social/posts.md), one scene per post number
    'p08-loopholes': 'Interior of a Roman record office at night: an old scribe in a white toga at a wooden desk piled with scrolls and wax tablets, carefully weighing coins on a brass pair of scales by the light of an oil lamp, ledgers and a strongbox beside him, shelves of scroll cases fading into warm shadow.',
    'p10-natars': 'Dawn over a walled hilltop village: a huge foreign army in gold and black armour marches out of the morning mist toward it, war elephants with armoured howdahs in the front line, pikemen and horse archers behind, tall dark banners; the village defenders gather on the wooden walls, torches still burning.',
    'p17-endgame': 'A colossal golden World Wonder tower under construction with wooden scaffolding and cranes, rising from a plain at sunset; around its base the camps of several alliances with coloured banners (red, blue, green, purple), siege engines and marching armies converging on it, smoke and dust catching the golden light.',
    'p23-treaties': 'Inside a large campaign tent lit by braziers: three chieftains - a Roman legate in red, a Teuton warlord in blue furs, a Gaul chief in green - clasping hands above a war table with a painted map, wooden army markers and a sealed treaty scroll with wax seals, their banners hanging behind them.',
    'p25-oases': 'A lush palm oasis around a blue lake in golden grassland: a hero in a red cape on horseback leads a charge of riders against a pack of wolves and wild boars guarding the water, dust flying, a crocodile in the reeds, a small village visible on a distant hill.',
    'p28-conquest': 'A Roman senator in a white toga with a purple stripe rides a white horse through the open gate of a captured village, raising a red banner with a golden eagle; legionaries line the road, villagers watch from doorways, the old banner lies on the ground, warm afternoon light.',
    'p33-traps': 'A Gaul palisade village in a forest clearing: Gaul trappers in green and brown tunics drag heavy rope nets holding captured enemy soldiers toward wooden cages by the palisade, pit traps and snares in the grass, a druid watching from the gate, misty morning light.',
    'p35-fast': 'Close view of a busy Roman village on a green hillside, seen from slightly above: builders raising a new stone tower on scaffolding, carts of timber and clay arriving, a column of legionaries marching out of the gate, wheat fields being harvested; the sky shows the sun setting on the left and a bright moon rising on the right at the same time, as if a whole day passed in a moment.',
    # Posts 38 to 66 (2026-11-07)
    'p39-protection': 'A brand-new hamlet of a few thatched huts and freshly ploughed fields at sunrise, covered by a faint golden dome of shimmering light like a blessing; a young family and one sentry with a spear stand calmly inside it, while on a distant ridge outside the dome a band of raiders on horseback waits and watches.',
    'p41-scouts': 'Night: two scouts in dark hooded cloaks lie flat in the grass on a wooded hilltop above an enemy village lit by torches, one scratching notes on a wax tablet, the other counting the soldiers and the stacked resources in the courtyard below; a sentry on the palisade holds a lantern and looks the other way; moonlight and fireflies.',
    'p44-firstday': 'Early morning on the first day of a brand-new village: workers plough and sow the first wheat fields, dig a clay pit and fell trees at a woodcutter camp around a handful of thatched huts; a small wooden warehouse and granary rise on scaffolding next to a rally point with a flag on a pole, and a few young recruits practise with spears; soft sunrise light, hopeful and busy.',
    'p45-festival': 'A great night festival on the square of a Roman town: lanterns strung between red-roofed houses, musicians with drums and flutes, dancers, long tables with bread, fruit and roast meat, a big bonfire whose sparks rise into the starry sky, and a grand town hall with columns glowing behind the crowd.',
    'p47-settlers': 'Three settlers with an ox cart loaded with tools, sacks, timber and a small chest arrive in an empty green valley with a river at golden hour; one of them hammers a wooden stake with a small banner into the ground where the new village will stand; forests, hills and wheat-coloured meadows around, their home town small and far away on a hill behind them.',
    'p51-starvation': 'A Roman army camp at dusk next to a wooden granary whose big doors stand open on completely empty bins; hungry legionaries slump on crates and upturned helmets, a quartermaster holds up an empty sack, thin horses nibble at dry grass, grey storm clouds above, warm light only from one small campfire; gently humorous, not grim.',
    'p54-evasion': 'A walled Roman capital seen from above at dawn: an enemy army with ladders and banners reaches the front gate, while out of the back gate a long column of Roman cavalry and legionaries rides calmly away along a hidden forest road, safe from the battle; dust and long morning shadows.',
    'p56-alarm': 'Night: a watchman on top of a stone watchtower blows a long curved horn; in the valley below a long line of enemy torches winds toward the sleeping village; villagers wake with lamps, a commander in a red cape runs along the wall pointing, soldiers grab shields and spears; deep blue night lit by orange torch light.',
    'p60-razing': 'At sunset, wooden torsion catapults with long throwing arms and slings (ancient onagers, no cannons, no metal barrels, no gunpowder) on a ridge hurl boulders at a wooden village in the valley below: roofs collapsed into rubble, the last stone tower toppling, columns of smoke rising, an attacking army with banners watching from the ridge; dramatic and painterly, no people hurt in view.',
    'p63-mistakes': 'A comical scene in a small village: the warehouse and granary are so overfull that sacks of grain, logs and clay bricks burst out of their doors and roll down the street, while sneaky raiders behind the houses quietly load their carts from the pile; the village chief dozes in a hammock, unaware; bright cheerful daylight, playful mood. Plain buildings with no signs and no writing anywhere.',
    'p66-backups': 'A candle-lit archive room in a stone Roman building at night: scribes at slanted desks carefully copy a large hand-painted map of an imaginary land (green hills, rivers, forests, tiny villages and roads, not the real world) onto fresh scrolls; finished copies are rolled, sealed with red wax and stored in rows of clay jars on wooden shelves; the big master map hangs on the wall.',
}

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1])
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    jobs = [{'prompt': STYLE + d, 'out': out / f'{k}.png', 'ratio': '16:9'} for k, d in POSTS.items()
            if (only is None or k in only) and not (out / f'{k}.png').exists()]
    print(len(jobs), 'to generate', flush=True)
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)
