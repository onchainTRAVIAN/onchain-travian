"""Finish kie.ai social scenes: trim edge artifacts, 1600x900 JPG, coin + wordmark in a corner.

~/art-env/bin/python scripts/art/brand/finish_social.py <raw.png> <out.jpg> [left|right]
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[3] / 'branding'
W, H = 1600, 900


def shadow(bg: Image.Image, im: Image.Image, pos: tuple[int, int], blur: int, off: int) -> None:
    pad = blur * 3
    a = Image.new('L', (im.width + 2 * pad, im.height + 2 * pad), 0)
    a.paste(im.getchannel('A'), (pad, pad))
    s = Image.new('RGBA', a.size, (0, 0, 0, 255))
    s.putalpha(a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * 0.85)))
    bg.alpha_composite(s, (pos[0] + off - pad, pos[1] + off - pad))


def finish(raw: pathlib.Path, out: pathlib.Path, side: str = 'right') -> None:
    im = Image.open(raw).convert('RGB')
    trim = int(im.height * 0.06)  # kie sometimes leaves a line or stray letters along the bottom
    h = im.height - trim
    w = round(h * 16 / 9)
    x = (im.width - w) // 2
    bg = im.crop((x, 0, x + w, h)).resize((W, H), Image.LANCZOS).convert('RGBA')
    # soft dark corner so the logo reads on any painting
    m = Image.new('L', (W, H), 0)
    cx = W - 330 if side == 'right' else 330
    ImageDraw.Draw(m).ellipse((cx - 420, H - 200, cx + 420, H + 160), fill=200)
    bg.paste(Image.new('RGBA', (W, H), (12, 8, 4, 255)), (0, 0), m.filter(ImageFilter.GaussianBlur(70)))
    coin = Image.open(ROOT / 'coin-512.png').convert('RGBA').resize((96, 96), Image.LANCZOS)
    word = Image.open(ROOT / 'wordmark.png').convert('RGBA')
    ww = 360
    word = word.resize((ww, round(word.height * ww / word.width)), Image.LANCZOS)
    total = 96 + 16 + ww
    x0 = W - 48 - total if side == 'right' else 48
    cp, wp = (x0, H - 48 - 96), (x0 + 96 + 16, H - 48 - 48 - word.height // 2)
    shadow(bg, coin, cp, 8, 5)
    shadow(bg, word, wp, 5, 3)
    bg.alpha_composite(coin, cp)
    bg.alpha_composite(word, wp)
    bg.convert('RGB').save(out, quality=92)


if __name__ == '__main__':
    finish(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else 'right')
