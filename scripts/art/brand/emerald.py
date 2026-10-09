"""Recolour the hexagon gem of the alt-d coin to emerald green (everything else untouched).

~/art-env/bin/python scripts/art/brand/emerald.py <src.png> <out.png> [cx cy rx ry]
"""
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
cx, cy, rx, ry = (float(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else (513, 831, 35.5, 41)

im = Image.open(src).convert('RGB')
# pointy-top hexagon inside the dark outline
pts = [(cx, cy - ry), (cx + rx, cy - ry / 2), (cx + rx, cy + ry / 2), (cx, cy + ry), (cx - rx, cy + ry / 2), (cx - rx, cy - ry / 2)]
ss = 4
m = Image.new('L', (im.width * ss, im.height * ss), 0)
ImageDraw.Draw(m).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
mask = m.resize(im.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))

h, s, v = im.convert('HSV').split()
EMERALD = 100  # ~141 deg on PIL's 0-255 hue wheel
h2 = Image.new('L', im.size, EMERALD)
s2 = s.point(lambda x: min(255, int(x * 1.05 + 30)))
v2 = v.point(lambda x: int(255 * (x / 255) ** 1.4))  # a touch deeper, like a cut stone
green = Image.merge('HSV', (h2, s2, v2)).convert('RGB')
# keep the dark outline dark: only recolour pixels that are not near-black
lum = im.convert('L').point(lambda x: 0 if x < 70 else 255)
mask = ImageChops.multiply(mask, lum.filter(ImageFilter.GaussianBlur(0.5)))
Image.composite(green, im, mask).save(out)
print('wrote', out)
