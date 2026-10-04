"""Generates src/web/public/masks.json: which parts of each village-centre picture are drawn
(not transparent), so clicks/hover in the village pick exactly the building under the cursor.

Each picture is rendered at the size it is shown on the page, then reduced to a grid of
CELL x CELL px cells (1 = drawn). Rows are hex strings (4 cells per character).
Usage: source ~/scraping-env/bin/activate && python3 scripts/gen-masks.py
"""
import base64, io, json, os, pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / 'src/web/public/img'
CELL = 2.5  # css px per mask cell
SCALE = 2   # render at 2x

jobs = []  # (key, file url, w, h)
for f in sorted((IMG / 'buildings').glob('*.svg')):
    jobs.append((f'buildings/{f.name}@75x100', f, 75, 100))
for name in ('rally.svg', 'construction.svg', 'empty.svg'):
    jobs.append((f'buildings/{name}@69x120', IMG / 'buildings' / name, 69, 120))
for f in sorted((IMG / 'walls').glob('*.svg')):
    jobs.append((f'walls/{f.name}@540x448', f, 540, 448))

out = {'cell': CELL, 'masks': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(device_scale_factor=SCALE, viewport={'width': 600, 'height': 500})
    for key, f, w, h in jobs:
        uri = 'data:image/svg+xml;base64,' + base64.b64encode(f.read_bytes()).decode()
        pg.set_content(f'<html><body style="margin:0;background:transparent"><img id="i" src="{uri}" width="{w}" height="{h}" style="display:block"></body></html>')
        pg.wait_for_function('document.getElementById("i").complete && document.getElementById("i").naturalWidth > 0')
        png = pg.locator('#i').screenshot(omit_background=True)
        im = Image.open(io.BytesIO(png)).convert('RGBA')
        a = im.getchannel('A')
        cols = int(round(w / CELL))
        rows = int(round(h / CELL))
        px = a.load()
        W, H = im.size
        hexrows = []
        for r in range(rows):
            bits = []
            y0, y1 = int(r * H / rows), int((r + 1) * H / rows)
            for c in range(cols):
                x0, x1 = int(c * W / cols), int((c + 1) * W / cols)
                drawn = 0
                for yy in range(y0, max(y0 + 1, y1)):
                    for xx in range(x0, max(x0 + 1, x1)):
                        if px[xx, yy] > 100:
                            drawn += 1
                # a cell counts if a fair part of it is drawn
                bits.append(1 if drawn * 3 >= max(1, (y1 - y0) * (x1 - x0)) else 0)
            while len(bits) % 4:
                bits.append(0)
            hexrows.append(''.join('%x' % (bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]) for i in range(0, len(bits), 4)))
        out['masks'][key] = {'cols': cols, 'rows': rows, 'data': hexrows}
    b.close()
(ROOT / 'src/web/public/masks.json').write_text(json.dumps(out, separators=(',', ':')))
print(len(out['masks']), 'masks,', os.path.getsize(ROOT / 'src/web/public/masks.json'), 'bytes')
