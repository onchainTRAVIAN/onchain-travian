"""Small unit/hero icons (shown at 16-20 px) cut from the painted big art, saved at 2x as WebP.

Usage: ~/art-env/bin/python scripts/art/kie/make_icons.py
- people (infantry, scouts, chiefs, settlers) and heroes: head-and-shoulders crop
- mounted units, siege engines, animals, the eagle: the whole figure
"""
import pathlib

from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[3]
IMG = ROOT / 'src/web/public/img'
SIZE = 32  # 2x of the 16 px display size

# Unit slots shown whole (cavalry 4-6, siege 7-8 in every playable tribe); 1-based numbers.
WHOLE = {
    'romans': {4, 5, 6, 7, 8, 10},
    'teutons': {5, 6, 7, 8, 10},
    'gauls': {3, 4, 5, 6, 7, 8, 10},
    'natars': {4, 5, 6, 7, 8, 10},
    'nature': set(range(1, 11)),
}


def bust(img: Image.Image) -> Image.Image:
    """Head and shoulders, ignoring thin things that stick out (spears, axes, banners)."""
    a = img.getchannel('A').point(lambda v: 255 if v > 60 else 0)
    x0, y0, x1, y1 = a.getbbox()
    px = a.load()
    # torso column: the thickest vertical band of the figure (weapons are thin)
    cols = [sum(1 for y in range(y0, y1) if px[x, y]) for x in range(img.width)]
    win = max(6, (x1 - x0) // 6)
    sm = [sum(cols[max(0, x - win): x + win]) for x in range(img.width)]
    cx = max(range(img.width), key=lambda x: sm[x])
    # head top: first row with a solid run of pixels near the torso column
    half = max(4, (x1 - x0) // 10)
    head = y0
    for y in range(y0, y1):
        if sum(1 for x in range(max(0, cx - half), min(img.width, cx + half)) if px[x, y]) > half * 0.8:
            head = y
            break
    h = y1 - head
    side = int(h * 0.46)
    left = int(max(0, min(img.width - side, cx - side / 2)))
    top = max(0, head - int(side * 0.06))
    return img.crop((left, top, left + side, top + side))


def whole(img: Image.Image) -> Image.Image:
    bbox = img.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    img = img.crop(bbox)
    side = max(img.width, img.height)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.alpha_composite(img, ((side - img.width) // 2, side - img.height))
    return sq


def finish(img: Image.Image) -> Image.Image:
    small = img.resize((SIZE, SIZE), Image.LANCZOS)
    # a touch of sharpening keeps details readable after the big downscale
    return small.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=1))


if __name__ == '__main__':
    n = 0
    for f in sorted((IMG / 'units/big').glob('*.webp')):
        tribe, num = f.stem.rsplit('-', 1)
        img = Image.open(f).convert('RGBA')
        icon = whole(img) if int(num) in WHOLE.get(tribe, set()) else bust(img)
        finish(icon).save(IMG / 'units' / f'{f.stem}.webp', 'WEBP', quality=92, method=6)
        n += 1
    for tribe in ('romans', 'teutons', 'gauls'):
        f = IMG / 'hero' / f'{tribe}-3.webp'
        if f.exists():
            finish(bust(Image.open(f).convert('RGBA'))).save(IMG / 'units' / f'hero-{tribe}.webp', 'WEBP', quality=92, method=6)
            n += 1
    print('icons', n)
