"""Render the 16x16 SVG troop/hero icons to 32x32 PNGs (sharp at 16 px, ~1 KB instead of 3-12 KB).
The game prefers .png over .svg (pic()). Usage: source ~/scraping-env/bin/activate && python3 scripts/art/oldtroops/icons_png.py
"""
import base64
import io
import pathlib

from PIL import Image
from playwright.sync_api import sync_playwright

UNITS = pathlib.Path(__file__).resolve().parents[3] / 'src/web/public/img/units'

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 64, 'height': 64}, device_scale_factor=2)
    n = 0
    for f in sorted(UNITS.glob('*.svg')):
        uri = 'data:image/svg+xml;base64,' + base64.b64encode(f.read_bytes()).decode()
        pg.set_content(f'<body style="margin:0;background:transparent"><img id="i" src="{uri}" width="16" height="16" style="display:block"></body>')
        pg.wait_for_function('document.getElementById("i").complete')
        png = pg.locator('#i').screenshot(omit_background=True)
        im = Image.open(io.BytesIO(png)).convert('RGBA')
        im.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f.with_suffix('.png'), optimize=True)
        n += 1
    b.close()
print('icons', n)
