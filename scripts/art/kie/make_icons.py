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
    a = img.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    x0, y0, x1, y1 = a.getbbox()
    h = y1 - y0
    # head position: horizontal centre of the drawn pixels in the top 12% of the figure
    band = a.crop((x0, y0, x1, y0 + max(4, int(h * 0.12))))
    cols = [i for i in range(band.width) if any(band.getpixel((i, j)) for j in range(band.height))]
    cx = x0 + (sum(cols) / len(cols) if cols else band.width / 2)
    side = int(h * 0.42)
    left = int(max(0, min(img.width - side, cx - side / 2)))
    top = max(0, y0 - int(side * 0.04))
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
