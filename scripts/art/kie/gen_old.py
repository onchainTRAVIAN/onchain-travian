"""Old-school (T3-style) buildings: all 39 x 5 stages, small and simple. Resumable.
Usage: python3 scripts/art/kie/gen_old.py <raw_dir> [early|late]
early = stages 1-3 (style ref only); late = stages 4-5 (style ref + the building's own stage 3).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kie import generate_many, upload  # noqa: E402
from oldschool import OLD, SAME  # noqa: E402
from prompts import BUILDINGS, NO_HOUSE  # noqa: E402

RAW = pathlib.Path(sys.argv[1])
PASS = sys.argv[2] if len(sys.argv) > 2 else 'early'
STAGE = {
    1: 'Level 1 of 5: tiny and humble, rough logs and a thatched roof, no stone, no tower, no flags.',
    2: 'Level 2 of 5: small, sawn timber walls and a wooden shingle roof, one small pennant.',
    3: 'Level 3 of 5: medium, stone ground floor and timber upper floor, red tiled roof.',
    4: 'Level 4 of 5: large, mostly stone, an extra wing or small tower, a few flags.',
    5: 'Level 5 of 5: the largest version of this same building, stone with red tiles, a tower or two and flags. Keep its function obvious. Still simple, no golden dome.',
}
SPECIAL = {1: 'Level 1 of 5: small and simple.', 2: 'Level 2 of 5: a little bigger.', 3: 'Level 3 of 5: medium size.', 4: 'Level 4 of 5: large, with flags.', 5: 'Level 5 of 5: the biggest, with flags.'}

style = upload(RAW.parent / 'oldschool' / 'main-3.png') if (RAW.parent / 'oldschool' / 'main-3.png').exists() else upload(RAW / 'anchor.png')
stages = (1, 2, 3) if PASS == 'early' else (4, 5)
jobs = []
for b, desc in BUILDINGS.items():
    own = upload(RAW / f'{b}-3.png') if PASS == 'late' else None
    for s in stages:
        out = RAW / f'{b}-{s}.png'
        if out.exists():
            continue
        lvl = SPECIAL[s] if b in NO_HOUSE else STAGE[s]
        extra = ' The second reference image is this same building at level 3: draw it bigger and richer, same building.' if own else ''
        jobs.append({'prompt': f'{SAME}{OLD} {desc} {lvl}{extra}', 'out': out, 'refs': [style] + ([own] if own else []), 'ratio': '9:16' if b == 'rally' else '3:4'})
print(len(jobs), 'to generate', flush=True)
cr = 0
for i in range(0, len(jobs), 24):
    for r in generate_many(jobs[i : i + 24], workers=6):
        cr += r.get('credits', 0)
        if 'error' in r:
            print('FAILED', r, flush=True)
    print(f'  {min(i + 24, len(jobs))}/{len(jobs)} credits {cr}', flush=True)
print('done credits', cr)
