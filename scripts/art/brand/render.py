"""Render branding/*.svg to PNGs (transparent) + a preview sheet.

python scripts/art/brand/render.py   (scraping venv: playwright)
"""
import asyncio
import os
import re
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'branding')

PNGS = [
    ('coin.svg', [1024, 512, 256]),
    ('coin-icon.svg', [1024, 512, 256, 128, 64, 32]),
    ('wordmark.svg', [1]),  # scale factors for non-square art
    ('lockup.svg', [1]),
    ('stacked.svg', [1]),
]


def size_of(svg):
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
    return float(m.group(1)), float(m.group(2))


async def shot(page, svg, w, h, path):
    body = re.sub(r'width="[\d.]+" height="[\d.]+"', f'width="{w}" height="{h}"', svg, count=1)
    await page.set_viewport_size({'width': int(w), 'height': int(h)})
    await page.set_content(f'<html><body style="margin:0;background:transparent">{body}</body></html>')
    await page.screenshot(path=path, omit_background=True)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        for name, sizes in PNGS:
            svg = open(os.path.join(OUT, name)).read()
            vw, vh = size_of(svg)
            for s in sizes:
                if vw == vh:
                    w = h = s
                    out = f'{name[:-4]}-{s}.png'
                else:
                    w, h = round(vw * 2), round(vh * 2)
                    out = f'{name[:-4]}.png'
                await shot(page, svg, w, h, os.path.join(OUT, out))
                print('png', out)
        # preview sheet on dark + light
        tiles = ''.join(
            f'<img src="coin-icon-{s}.png" width="{s}" height="{s}">' for s in (256, 128, 64, 32))
        sheet = f'''<html><body style="margin:0;font:13px Verdana">
<div style="background:#1b1d22;padding:24px;display:flex;gap:24px;align-items:center">
<img src="coin-512.png" width="360" height="360">{tiles}</div>
<div style="background:#f3ead2;padding:24px"><img src="lockup.png" style="width:900px"></div>
<div style="background:#0e1116;padding:24px;display:flex;gap:40px;align-items:center">
<img src="stacked.png" style="width:420px"><img src="wordmark.png" style="width:600px"></div>
</body></html>'''
        sp = os.path.join(OUT, '_preview.html')
        open(sp, 'w').write(sheet)
        await page.set_viewport_size({'width': 1400, 'height': 800})
        await page.goto('file://' + os.path.abspath(sp))
        await page.screenshot(path=os.path.join(OUT, '_preview.png'), full_page=True)
        await b.close()


asyncio.run(main())
