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
}

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1])
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    jobs = [{'prompt': STYLE + d, 'out': out / f'{k}.png', 'ratio': '16:9'} for k, d in POSTS.items()
            if (only is None or k in only) and not (out / f'{k}.png').exists()]
    print(len(jobs), 'to generate', flush=True)
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)
