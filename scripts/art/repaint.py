"""Old-school repaint of the building pictures (no AI): more light and contrast, roof colour by building
type (classic T3 variety), a crisp dark outline so each building stands out from the village ground.

Usage: ~/art-env/bin/python scripts/art/repaint.py scripts/art/src/buildings src/web/public/img/buildings
The source folder keeps the un-repainted art (never repaint twice). Walls: scripts/art/src/walls/*.raw.png
(rendered from the SVG walls) go through brighten()+outline() into img/walls/<stem>-<stage>.png.
"""
import colorsys
import pathlib
import sys

from PIL import Image, ImageChops, ImageEnhance, ImageFilter

# Roof colour family per building (target hue in degrees, saturation factor, value factor).
ROOF = {
    'civic': (4, 1.05, 1.08),      # brick red: main, townhall, residence, palace, embassy, treasury, heromansion
    'military': (215, 0.28, 0.82),  # slate grey-blue
    'craft': (24, 0.72, 0.88),      # brown wooden shingles
    'trade': (30, 1.1, 1.12),       # orange tiles
    'farm': (40, 0.85, 1.12),       # golden thatch / straw
    'stone': (0, 0.08, 0.95),       # grey stone roofs
}
FAMILY = {
    **dict.fromkeys(['main', 'townhall', 'residence', 'palace', 'embassy', 'treasury', 'heromansion', 'academy'], 'civic'),
    **dict.fromkeys(['barracks', 'greatbarracks', 'stable', 'greatstable', 'workshop', 'armoury', 'blacksmith', 'tournament', 'rally'], 'military'),
    **dict.fromkeys(['sawmill', 'brickyard', 'ironfoundry', 'stonemason', 'trapper', 'brewery'], 'craft'),
    **dict.fromkeys(['market', 'tradeoffice'], 'trade'),
    **dict.fromkeys(['granary', 'greatgranary', 'grainmill', 'bakery', 'horsetrough', 'cranny'], 'farm'),
    **dict.fromkeys(['warehouse', 'greatwarehouse', 'wonder'], 'stone'),
}
OUTLINE = (52, 36, 20, 255)


def is_roof(r: int, g: int, b: int) -> bool:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (h < 0.048 or h > 0.97) and s > 0.5 and v > 0.25  # red roof tiles only (brick walls are orange-brown, 20-35 deg)


def recolour(img: Image.Image, fam: str) -> Image.Image:
    hue, sf, vf = ROOF[fam]
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a < 20 or not is_roof(r, g, b):
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hsv_to_rgb(hue / 360, min(1, s * sf), min(1, v * vf))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return img


def brighten(img: Image.Image) -> Image.Image:
    rgb, a = img.convert('RGB'), img.getchannel('A')
    rgb = ImageEnhance.Brightness(rgb).enhance(1.07)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.16)
    rgb = ImageEnhance.Color(rgb).enhance(0.88)  # calmer timber/brick, closer to T3's beige walls
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out


def outline(img: Image.Image, width: int = 2) -> Image.Image:
    a = img.getchannel('A').point(lambda v: 255 if v > 90 else 0)
    ring = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(width * 2 + 1)), a)
    base = Image.new('RGBA', img.size, (0, 0, 0, 0))
    base.paste(Image.new('RGBA', img.size, OUTLINE), mask=ring)
    base.alpha_composite(img)
    return base


def repaint(src: pathlib.Path, dst: pathlib.Path) -> None:
    bid = src.stem.rsplit('-', 1)[0]
    img = Image.open(src).convert('RGBA')
    img = recolour(brighten(img), FAMILY.get(bid, 'civic'))  # roofs coloured last so they stay vivid
    img = outline(img)
    img.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)


if __name__ == '__main__':
    src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(src.glob('*-[1-5].png')):
        repaint(f, out / f.name)
    print('repainted', len(list(out.glob('*.png'))))
