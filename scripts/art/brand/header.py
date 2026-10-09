"""Site header background from the painted map banner (kie.ai, ~/art-raw/logo/banner-map.png).

~/art-env/bin/python scripts/art/brand/header.py [top_y]
Writes src/web/public/img/ui/header-scene.webp (1960x200 = 2x the 980x100 header).
"""
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = pathlib.Path.home() / 'art-raw' / 'logo' / 'banner-map.png'
OUT = ROOT / 'src/web/public/img/ui/header-scene.webp'
W, H = 1960, 200
TOP = float(sys.argv[1]) if len(sys.argv) > 1 else 0.35  # band position (share of the free height)

im = Image.open(SRC).convert('RGB')
bh = im.width * H / W
y0 = round((im.height - bh) * TOP)
band = im.crop((0, y0, im.width, round(y0 + bh))).resize((W, H), Image.LANCZOS).convert('RGBA')

# darken toward the right (server time, like the banner) and a little behind the logo; fade the bottom into the white page
shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(shade)
for x in range(W):
    t = x / W
    a = 40 + (70 * max(0, t - 0.55) / 0.45) + (120 * max(0, 0.25 - t) / 0.25)
    d.line([(x, 0), (x, H)], fill=(14, 8, 3, int(a)))
band = Image.alpha_composite(band, shade)
fade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(fade)
for y in range(H - 34, H):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, int(255 * ((y - (H - 34)) / 34) ** 1.6)))
band = Image.alpha_composite(band, fade)
band.convert('RGB').save(OUT, quality=84, method=6)
print(OUT, OUT.stat().st_size)
