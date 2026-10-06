"""Cut out generated art (rembg), trim, and fit it into the game's canvas as a WebP.

Usage (art venv): ~/art-env/bin/python scripts/art/kie/process.py <in.png> <out.webp> <kind>
kind: building (75x100 canvas, drawn at 2x = 150x200, base anchored low like the old art)
      unit (120x140 canvas at 2x = 240x280, feet on the ground line)
"""
import sys
from io import BytesIO

from PIL import Image
from rembg import new_session, remove

_session = None

CANVAS = {'building': (150, 200), 'unit': (240, 280)}
# Box the subject is fitted into (x0, y0, x1, y1) on the 2x canvas, and where its bottom sits.
BOX = {'building': (4, 6, 146, 194), 'unit': (8, 6, 232, 268)}


def cutout(src: str) -> Image.Image:
    global _session
    if _session is None:
        _session = new_session('isnet-general-use')
    data = open(src, 'rb').read()
    img = Image.open(BytesIO(remove(data, session=_session, alpha_matting=True))).convert('RGBA')
    bbox = img.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def fit(img: Image.Image, kind: str) -> Image.Image:
    cw, ch = CANVAS[kind]
    x0, y0, x1, y1 = BOX[kind]
    bw, bh = x1 - x0, y1 - y0
    s = min(bw / img.width, bh / img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    # centred horizontally, bottom-anchored (buildings stand on their plot, units on the ground line)
    out.alpha_composite(img, (x0 + (bw - img.width) // 2, y1 - img.height))
    return out


def process(src: str, dst: str, kind: str) -> None:
    fit(cutout(src), kind).save(dst, 'WEBP', quality=88, method=6)


if __name__ == '__main__':
    process(sys.argv[1], sys.argv[2], sys.argv[3])
