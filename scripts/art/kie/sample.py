"""Style sample: 6 images (Main Building stages 1/3/5, Legionnaire, Teutonic Knight, Roman hero).
Usage: python3 scripts/art/kie/sample.py <out_dir>
"""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kie import generate, generate_many, upload  # noqa: E402

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'kie-sample')

STYLE = (
    'Hand-painted 2D game art for a cosy medieval strategy browser game, in a rich painterly style: '
    'soft warm daylight from the top-left, gentle ambient occlusion, detailed textures (timber, stone, roof tiles, cloth, polished metal), '
    'vibrant but natural colours, crisp readable silhouette. Original artwork. '
    'Single subject centred, fully inside the frame with a margin, on a plain pure white background (#ffffff), '
    'no text, no logo, no frame, no border, no other objects.'
)
BUILDING = (
    'Isometric 3/4 view from above at about 35 degrees, the whole building standing on a small round patch of grass and dirt. '
)
UNIT = 'Full-body character in a dynamic 3/4 pose facing left, standing on a soft small shadow, whole figure visible. '

MAIN = {
    1: 'A small humble village hall made of timber and thatch, one storey, a wooden door, a little flag.',
    3: 'A sturdy two-storey village hall with a stone ground floor, half-timbered upper floor, red clay tile roof, a small bell turret and banners.',
    5: 'A grand town hall palace: stone and marble, two wings, a tall clock tower with a golden dome, gold trim, red banners and flags.',
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    # 1) the anchor sets the style for everything else
    if not (OUT / 'main-3.png').exists():
        anchor = generate(f'{STYLE} {BUILDING} {MAIN[3]}', OUT / 'main-3.png', ratio='3:4')
        print(anchor)
        total += anchor.get('credits', 0)
    ref = upload(OUT / 'main-3.png')
    same = 'Match the exact art style, lighting, outline softness, palette and level of detail of the reference image. '
    jobs = [
        {'prompt': f'{same}{STYLE} {BUILDING} {MAIN[1]}', 'out': OUT / 'main-1.png', 'refs': [ref], 'ratio': '3:4'},
        {'prompt': f'{same}{STYLE} {BUILDING} {MAIN[5]}', 'out': OUT / 'main-5.png', 'refs': [ref], 'ratio': '3:4'},
        {'prompt': f'{same}{STYLE} {UNIT} A Roman legionary infantryman: segmented steel armour, red tunic, large red rectangular curved shield with a gold emblem, short sword held ready, iron helmet.', 'out': OUT / 'legionnaire.png', 'refs': [ref], 'ratio': '4:5'},
        {'prompt': f'{same}{STYLE} {UNIT} A heavy medieval knight on a galloping armoured grey horse: black plate armour, closed great helm, white surcoat with a black cross, couched lance.', 'out': OUT / 'knight.png', 'refs': [ref], 'ratio': '4:5'},
        {'prompt': f'{same}{STYLE} {UNIT} A heroic Roman commander: polished muscle cuirass with gold trim, tall red crested helmet, long crimson cape, gleaming sword raised, confident heroic stance.', 'out': OUT / 'hero-romans.png', 'refs': [ref], 'ratio': '4:5'},
    ]
    for r in generate_many(jobs, workers=5):
        print(r)
        total += r.get('credits', 0)
    print('credits used:', total)
