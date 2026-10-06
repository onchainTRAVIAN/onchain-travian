"""Cut out and fit every raw kie.ai image into the game's art folders as WebP (2x resolution).

Usage: ~/art-env/bin/python scripts/art/kie/process_all.py <raw_dir> [--force]
- buildings/<id>-<stage>.png -> img/buildings/<id>-<stage>.webp (150x200; rally 138x240),
  earlier stages drawn smaller so buildings visibly grow
- units/<tribe>-<n>.png      -> img/units/big/<tribe>-<n>.webp (240x280)
- heroes/<tribe>-<s>.png     -> img/hero/<tribe>-<s>.webp (240x280)
"""
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from process import cutout  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[3]
IMG = ROOT / 'src/web/public/img'
RAW = pathlib.Path(sys.argv[1])
FORCE = '--force' in sys.argv

# Share of the full box each building stage fills (stage 5 = full size).
STAGE_SCALE = {1: 0.62, 2: 0.72, 3: 0.84, 4: 0.93, 5: 1.0}
BUILDING = {'canvas': (150, 200), 'box': (4, 8, 146, 190)}  # bottom of box = where the building stands
RALLY = {'canvas': (138, 240), 'box': (4, 10, 134, 226)}
FIGURE = {'canvas': (240, 280), 'box': (8, 6, 232, 268)}


def place(img: Image.Image, spec: dict, scale: float = 1.0) -> Image.Image:
    cw, ch = spec['canvas']
    x0, y0, x1, y1 = spec['box']
    bw, bh = x1 - x0, y1 - y0
    s = min(bw / img.width, bh / img.height) * scale
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    out.alpha_composite(img, (x0 + (bw - img.width) // 2, y1 - img.height))
    return out


def run(src: pathlib.Path, dst: pathlib.Path, spec: dict, scale: float = 1.0) -> None:
    if dst.exists() and not FORCE and dst.stat().st_mtime > src.stat().st_mtime:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    place(cutout(str(src)), spec, scale).save(dst, 'WEBP', quality=88, method=6)
    print('ok', dst.relative_to(IMG), flush=True)


if __name__ == '__main__':
    for f in sorted((RAW / 'buildings').glob('*.png')):
        bid, stage = f.stem.rsplit('-', 1)
        run(f, IMG / 'buildings' / f'{bid}-{stage}.webp', RALLY if bid == 'rally' else BUILDING, STAGE_SCALE[int(stage)])
    for f in sorted((RAW / 'units').glob('*.png')):
        run(f, IMG / 'units/big' / f'{f.stem}.webp', FIGURE)
    for f in sorted((RAW / 'heroes').glob('*.png')):
        run(f, IMG / 'hero' / f'{f.stem}.webp', FIGURE)
