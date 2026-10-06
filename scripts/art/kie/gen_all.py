"""Generate all game art with kie.ai (resumable: existing raw images are skipped).

Usage: python3 scripts/art/kie/gen_all.py <raw_dir> [buildings|units|heroes|all] [--only id1,id2]
Raw PNGs land in <raw_dir>/<kind>/<name>.png; process them with process_all.py.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kie import generate, generate_many, upload  # noqa: E402
from prompts import BUILDINGS, HEROES, STYLE, BUILDING, UNIT, UNITS, building_prompt, hero_prompt, unit_prompt  # noqa: E402

RAW = pathlib.Path(sys.argv[1])
WHAT = sys.argv[2] if len(sys.argv) > 2 else 'all'
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None


def anchor(name: str, prompt: str, ratio: str) -> str:
    p = RAW / 'anchors' / f'{name}.png'
    if not p.exists():
        print(generate(prompt, p, ratio=ratio), flush=True)
    return upload(p)


def run(jobs: list[dict]) -> int:
    todo = [j for j in jobs if not pathlib.Path(j['out']).exists()]
    print(f'{len(todo)} to generate ({len(jobs) - len(todo)} already done)', flush=True)
    credits = 0
    for i in range(0, len(todo), 24):
        for r in generate_many(todo[i : i + 24], workers=6):
            credits += r.get('credits', 0)
            if 'error' in r:
                print('FAILED', r, flush=True)
        print(f'  {min(i + 24, len(todo))}/{len(todo)} done, credits so far {credits}', flush=True)
    return credits


if __name__ == '__main__':
    total = 0
    if WHAT in ('buildings', 'all'):
        ref = anchor('building', f'{STYLE} {BUILDING}A sturdy two-storey village hall with a stone ground floor, half-timbered upper floor, red clay tile roof, a small bell turret and banners.', '3:4')
        jobs = [
            {'prompt': building_prompt(b, s), 'out': RAW / 'buildings' / f'{b}-{s}.png', 'refs': [ref], 'ratio': '9:16' if b == 'rally' else '3:4'}
            for b in BUILDINGS
            for s in range(1, 6)
            if ONLY is None or b in ONLY
        ]
        total += run(jobs)
    if WHAT in ('units', 'all'):
        ref = anchor('unit', f'{STYLE} {UNIT}A Roman legionnaire infantryman: segmented steel armour, red tunic, large red rectangular curved shield with a gold emblem, short sword held ready, iron helmet.', '4:5')
        jobs = [
            {'prompt': unit_prompt(t, n), 'out': RAW / 'units' / f'{t}-{n}.png', 'refs': [ref], 'ratio': '4:5'}
            for t in UNITS
            for n in range(1, 11)
            if ONLY is None or f'{t}-{n}' in ONLY or t in ONLY
        ]
        total += run(jobs)
    if WHAT in ('heroes', 'all'):
        ref = anchor('hero', f'{STYLE} {UNIT}A heroic Roman commander: polished muscle cuirass with gold trim, tall red crested helmet, long crimson cape, gleaming sword raised, confident heroic stance.', '4:5')
        jobs = [
            {'prompt': hero_prompt(t, s), 'out': RAW / 'heroes' / f'{t}-{s}.png', 'refs': [ref], 'ratio': '4:5'}
            for t in HEROES
            for s in range(1, 6)
            if ONLY is None or t in ONLY
        ]
        total += run(jobs)
    print('credits used this run:', total)
