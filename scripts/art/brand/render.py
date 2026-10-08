"""Render branding/wordmark.svg to a transparent PNG (2x).

python scripts/art/brand/render.py   (scraping venv: playwright)
"""
import asyncio
import os
import re
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'branding')

PNGS = [
    ('wordmark.svg', [1]),
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
        await b.close()


asyncio.run(main())
