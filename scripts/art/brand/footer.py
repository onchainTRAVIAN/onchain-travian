"""Site footer background from the painted village banner (kie.ai, ~/art-raw/logo/banner-village.png).

~/art-env/bin/python scripts/art/brand/footer.py [top]
Writes src/web/public/img/ui/footer-scene.webp (1960x480 = 2x a 980x240 footer); the dark overlay is CSS.
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = pathlib.Path.home() / 'art-raw' / 'logo' / 'banner-village.png'
OUT = ROOT / 'src/web/public/img/ui/footer-scene.webp'
W, H = 1960, 480
TOP = float(sys.argv[1]) if len(sys.argv) > 1 else 0.55

im = Image.open(SRC).convert('RGB')
bh = im.width * H / W
y0 = round((im.height - bh) * TOP)
im.crop((0, y0, im.width, round(y0 + bh))).resize((W, H), Image.LANCZOS).save(OUT, quality=80, method=6)
print(OUT, OUT.stat().st_size)
