"""Old-school troop art (no AI): flat colours, few details, dark outline, consistent alignment.

Usage: ~/art-env/bin/python scripts/art/troops_old.py [names...]
Sources (never overwritten): scripts/art/src/units/<tribe>-<n>.webp, scripts/art/src/hero/<tribe>-<stage>.webp
Writes: img/units/big/<tribe>-<n>.png (240x280), img/hero/<tribe>-<stage>.png (240x280),
        img/units/<tribe>-<n>.png and img/units/hero-<tribe>.png (32x32 icons, shown at 16 px).
"""
import pathlib
import sys

from PIL import Image, ImageChops, ImageEnhance, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'scripts/art/src'
IMG = ROOT / 'src/web/public/img'
OUTLINE = (40, 28, 16, 255)


def flatten(img: Image.Image, colours: int = 12) -> Image.Image:
    """Cartoon look: heavy smoothing at 2x, brighter colours, a small flat palette."""
    a = img.getchannel('A')
    rgb = Image.new('RGB', img.size, (255, 255, 255))
    rgb.paste(img.convert('RGB'), mask=a)
    w, h = img.size
    rgb = rgb.resize((w * 2, h * 2), Image.LANCZOS)
    for m in (9, 9, 5):
        rgb = rgb.filter(ImageFilter.MedianFilter(m))
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)
    rgb = ImageEnhance.Color(rgb).enhance(1.25)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.1)
    rgb = rgb.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    rgb = rgb.filter(ImageFilter.ModeFilter(5)).resize((w, h), Image.LANCZOS)
    out = rgb.convert('RGBA')
    out.putalpha(a.point(lambda v: 255 if v > 110 else 0))
    return out


def outline(img: Image.Image, width: int) -> Image.Image:
    a = img.getchannel('A')
    ring = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(width * 2 + 1)), a)
    base = Image.new('RGBA', img.size, (0, 0, 0, 0))
    base.paste(Image.new('RGBA', img.size, OUTLINE), mask=ring)
    base.alpha_composite(img)
    return base


def fit(img: Image.Image, size: tuple[int, int], pad: int) -> Image.Image:
    """Crop to the figure, scale to fill the box, centre it, stand it on the bottom edge."""
    img = img.crop(img.getchannel('A').getbbox())
    w, h = size[0] - 2 * pad, size[1] - 2 * pad
    s = min(w / img.width, h / img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    out.alpha_composite(img, ((size[0] - img.width) // 2, size[1] - pad - img.height))
    return out


def save(img: Image.Image, path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def big(src: pathlib.Path, dst: pathlib.Path) -> Image.Image:
    img = flatten(fit(Image.open(src).convert('RGBA'), (240, 280), 10))
    img = outline(img, 2)
    save(img, dst)
    return img


def icon(img: Image.Image, dst: pathlib.Path) -> None:
    # every icon: the whole figure, same baseline, filling the 32x32 box (shown at 16 px)
    small = fit(img, (32, 32), 1)
    save(small.filter(ImageFilter.UnsharpMask(radius=0.5, percent=50, threshold=1)), dst)


if __name__ == '__main__':
    only = set(sys.argv[1:])
    for f in sorted((SRC / 'units').glob('*.webp')):
        if only and f.stem not in only:
            continue
        img = big(f, IMG / 'units/big' / f'{f.stem}.png')
        icon(img, IMG / 'units' / f'{f.stem}.png')
    for f in sorted((SRC / 'hero').glob('*.webp')):
        if only and f.stem not in only:
            continue
        img = big(f, IMG / 'hero' / f'{f.stem}.png')
        tribe, stage = f.stem.rsplit('-', 1)
        if stage == '3':
            icon(img, IMG / 'units' / f'hero-{tribe}.png')
    print('done')
