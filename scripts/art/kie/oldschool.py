"""Old-school (T3-era) style: simple, clean, low-detail sprites. Usage: python3 scripts/art/kie/oldschool.py <out_dir>"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kie import generate, generate_many, upload  # noqa: E402

OUT = pathlib.Path(sys.argv[1])
OLD = (
    'Simple small 2D isometric game sprite in the classic style of 2008-era browser strategy games: clean and slightly cartoony, '
    'simple shapes, soft flat shading with one light and one shadow tone per surface, very few details, no textures, no realism, '
    'limited warm palette, thin dark brown outline, readable when shown tiny (75x100 pixels). Original artwork. '
    'Single subject centred with a margin on a plain pure white background, no text, no frame, no ground platform — '
    'only a small soft shadow under it.'
)
SAME = 'Copy only the drawing style of the reference image (simplicity, outline, shading, palette), not its subject. '
B = {
    'main-1': 'A tiny village hall: one-storey timber hut with a thatched roof and a small door.',
    'main-3': 'A village hall: two storeys, stone ground floor, timber upper floor, red tiled roof, a small bell turret.',
    'main-5': 'A large town hall of stone with a red tiled roof, a tall tower and two small flags.',
    'warehouse-3': 'A storage warehouse: a wide wooden barn with big double doors, a few crates and logs beside it.',
}
U = {'legionnaire': 'A Roman legionnaire soldier standing, red tunic, steel armour, big red rectangular shield, short sword, full body, facing left.'}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    first = generate(f'{OLD} {B["main-3"]}', OUT / 'main-3.png', ratio='3:4')
    print(first)
    ref = upload(OUT / 'main-3.png')
    jobs = [{'prompt': f'{SAME}{OLD} {d}', 'out': OUT / f'{k}.png', 'refs': [ref], 'ratio': '3:4'} for k, d in B.items() if k != 'main-3']
    jobs += [{'prompt': f'{SAME}{OLD} {d}', 'out': OUT / f'{k}.png', 'refs': [ref], 'ratio': '4:5'} for k, d in U.items()]
    for r in generate_many(jobs, workers=5):
        print(r)
