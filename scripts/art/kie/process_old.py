"""Old-school buildings: cut out, fit to the old plot footprint (grows by stage), 64-colour PNG.
Usage: ~/art-env/bin/python scripts/art/kie/process_old.py <raw_dir>
Writes img/buildings/<id>-<stage>.png (150x200; rally 138x240), drawn at 2x for sharp screens.
"""
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from process import cutout  # noqa: E402

IMG = pathlib.Path(__file__).resolve().parents[3] / 'src/web/public/img/buildings'
RAW = pathlib.Path(sys.argv[1])
SCALE = {1: 0.68, 2: 0.78, 3: 0.88, 4: 0.95, 5: 1.0}


def fit(img, canvas, base_y, max_w, max_h):
    cw, ch = canvas
    s = min(max_w / img.width, max_h / img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    out.alpha_composite(img, ((cw - img.width) // 2, base_y - img.height))
    return out


for f in sorted(RAW.glob('*-[1-5].png')):
    bid, st = f.stem.rsplit('-', 1)
    dst = IMG / f'{bid}-{st}.png'
    if dst.exists() and dst.stat().st_mtime > f.stat().st_mtime:
        continue
    sc = SCALE[int(st)]
    if bid == 'rally':
        out = fit(cutout(str(f)), (138, 240), 230, 132 * sc, 200 * sc)
    else:
        out = fit(cutout(str(f)), (150, 200), 192, 146 * sc, 168 * sc)
    out.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)
    print('ok', dst.name, dst.stat().st_size, flush=True)
