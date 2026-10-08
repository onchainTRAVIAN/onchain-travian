"""Cut the chosen kie.ai coin out of its white background and build the logo set.

~/art-env/bin/python scripts/art/brand/finish.py <raw_coin.png> [out_prefix]
Needs branding/wordmark.png (from logo.py + render.py). Writes to branding/:
  <prefix>-<size>.png (1024..32), lockup.png (coin + wordmark), stacked.png, _preview.png
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / 'branding'
SRC = pathlib.Path(sys.argv[1])
PREFIX = sys.argv[2] if len(sys.argv) > 2 else 'coin'
SIZES = (1024, 512, 256, 128, 64, 32)


def cut_coin(path: pathlib.Path) -> Image.Image:
    """Square RGBA crop of the round coin with an anti-aliased circular mask."""
    im = Image.open(path).convert('RGB')
    # non-white pixels (ignores the faint white-ish shadow)
    grey = im.convert('L').point(lambda v: 255 if v < 200 else 0)
    x0, y0, x1, y1 = grey.getbbox()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = min(x1 - x0, y1 - y0) / 2 - 1  # 1 px inside the outline: no white fringe
    side = int(r * 2) + 2
    left, top = round(cx - side / 2), round(cy - side / 2)
    coin = im.crop((left, top, left + side, top + side)).convert('RGBA')
    ss = 4
    mask = Image.new('L', (side * ss, side * ss), 0)
    c = side * ss / 2
    ImageDraw.Draw(mask).ellipse((c - r * ss, c - r * ss, c + r * ss, c + r * ss), fill=255)
    coin.putalpha(mask.resize((side, side), Image.LANCZOS))
    return coin


def sized(coin: Image.Image, s: int) -> Image.Image:
    out = coin.resize((s, s), Image.LANCZOS)
    if s <= 64:  # keep small icons crisp
        out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=1))
    return out


def lockup(coin: Image.Image, word: Image.Image) -> Image.Image:
    h = 440
    c = sized(coin, h)
    wh = int(h * 0.42)
    w = word.resize((int(word.width * wh / word.height), wh), Image.LANCZOS)
    gap = 40
    out = Image.new('RGBA', (h + gap + w.width + 20, h + 20), (0, 0, 0, 0))
    out.alpha_composite(c, (10, 10))
    out.alpha_composite(w, (10 + h + gap, 10 + (h - wh) // 2))
    return out


def stacked(coin: Image.Image, word: Image.Image) -> Image.Image:
    cs = 640
    c = sized(coin, cs)
    ww = 900
    w = word.resize((ww, int(word.height * ww / word.width)), Image.LANCZOS)
    W = max(ww, cs) + 40
    out = Image.new('RGBA', (W, cs + w.height + 60), (0, 0, 0, 0))
    out.alpha_composite(c, ((W - cs) // 2, 20))
    out.alpha_composite(w, ((W - ww) // 2, cs + 40))
    return out


def preview(coin: Image.Image, lock: Image.Image, stack: Image.Image) -> Image.Image:
    W = 1400
    sheet = Image.new('RGBA', (W, 1260), '#1b1d22')
    x = 30
    for s in (360, 256, 128, 64, 32):
        sheet.alpha_composite(sized(coin, s), (x, 30 + (360 - s) // 2))
        x += s + 40
    light = Image.new('RGBA', (W, 300), '#f3ead2')
    l2 = lock.resize((int(lock.width * 240 / lock.height), 240), Image.LANCZOS)
    light.alpha_composite(l2, (30, 30))
    sheet.alpha_composite(light, (0, 420))
    s2 = stack.resize((int(stack.width * 500 / stack.height), 500), Image.LANCZOS)
    sheet.alpha_composite(s2, (30, 740))
    x = 30 + s2.width + 60
    for s in (64, 32):  # in-context: favicon-ish on light/dark chips
        for bg in ('#ffffff', '#0e1116'):
            chip = Image.new('RGBA', (s + 24, s + 24), bg)
            chip.alpha_composite(sized(coin, s), (12, 12))
            sheet.alpha_composite(chip, (x, 800))
            x += s + 60
    return sheet


if __name__ == '__main__':
    coin = cut_coin(SRC)
    for s in SIZES:
        sized(coin, s).save(OUT / f'{PREFIX}-{s}.png', optimize=True)
    word = Image.open(OUT / 'wordmark.png').convert('RGBA')
    lock, stack = lockup(coin, word), stacked(coin, word)
    if PREFIX == 'coin':
        lock.save(OUT / 'lockup.png', optimize=True)
        stack.save(OUT / 'stacked.png', optimize=True)
    preview(coin, lock, stack).convert('RGB').save(OUT / f'_preview{"" if PREFIX == "coin" else "-" + PREFIX}.png')
    print('done', PREFIX)
