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
    'atmospheric depth, crisp readable shapes, high detail. Leave a calm, slightly darker band along the bottom edge for a small logo. '
    'No text, no letters, no numbers, no logo, no watermark, no frame, no UI. Original artwork. '
)

# Thread post 1 (2026-10-09): "What is onchainTRAVIAN?" - village growth, hero, oases, alliances, World Wonder.
POSTS = {
    'what-empire': 'Bird\'s-eye view of a thriving walled village on a green hill at golden hour: wheat, clay, timber and iron fields around it, a main building with red roofs, barracks and a marketplace; on the horizon a gleaming golden World Wonder tower under construction with scaffolding, glowing in the sunset.',
    'what-hero': 'A heroic Roman commander on a white horse on a ridge, red cape flowing, looking over a vast valley: his village below, a lush palm oasis with a lake, allied banners of three tribes (red, blue, green) on distant hills, and far away a colossal golden wonder tower catching the last sunlight.',
    'what-journey': 'One continuous panorama telling a story from left to right: a tiny hamlet with a few huts, then a growing town with stone walls and a busy market, then a mighty fortified city with a palace, and on the far right a towering golden World Wonder piercing glowing clouds. Warm sunrise light.',
    'what-council': 'Three tribal leaders - a Roman legate in red, a Teuton chieftain in blue furs, a Gaul druid-warrior in green - standing together on a cliff around a war table with a painted map, banners waving, their armies camped in the valley below and a golden World Wonder rising on the horizon at sunset.',
}

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1])
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    jobs = [{'prompt': STYLE + d, 'out': out / f'{k}.png', 'ratio': '16:9'} for k, d in POSTS.items()
            if (only is None or k in only) and not (out / f'{k}.png').exists()]
    print(len(jobs), 'to generate', flush=True)
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)
