"""Twitter/X images (JPG, no transparency): profile picture + header banner.

python scripts/art/brand/social.py   (scraping venv: playwright; needs branding/coin-1024.png, wordmark.svg)
"""
import asyncio
import pathlib

from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parents[2] / 'branding'

BASE = f'''<style>
@font-face {{ font-family: Cinzel; src: url("{(HERE / "Cinzel.ttf").as_uri()}"); font-weight: 400 900; }}
html, body {{ margin: 0; }}
.bg {{ position: relative; overflow: hidden;
  background: radial-gradient(circle at var(--gx) 50%, #6b3f12 0, #3a220c 28%, #1c1108 62%, #0d0805 100%); }}
.bg::before {{ content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, rgba(255,214,120,.035) 0 2px, transparent 2px 22px),
              repeating-linear-gradient(-45deg, rgba(255,214,120,.035) 0 2px, transparent 2px 22px); }}
.bg::after {{ content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 160px rgba(0,0,0,.65); }}
.coin {{ position: absolute; z-index: 1; filter: drop-shadow(0 18px 30px rgba(0,0,0,.6)) drop-shadow(0 0 60px rgba(255,190,80,.25)); }}
</style>'''

AVATAR = BASE + f'''<div class="bg" style="--gx:50%;width:1000px;height:1000px">
<img class="coin" src="{(OUT / "coin-1024.png").as_uri()}" style="left:60px;top:60px;width:880px;height:880px"></div>'''

BANNER = BASE + f'''<div class="bg" style="--gx:30%;width:1500px;height:500px">
<img class="coin" src="{(OUT / "coin-1024.png").as_uri()}" style="left:330px;top:85px;width:330px;height:330px">
<div style="position:absolute;z-index:1;left:700px;top:150px">
  <img src="{(OUT / "wordmark.svg").as_uri()}" style="display:block;width:660px;height:auto">
  <div style="font:700 27px Cinzel;color:#f3dca0;letter-spacing:3px;margin:22px 0 0 8px;text-shadow:0 2px 4px #000">
    Build &middot; Raid &middot; Conquer &middot; On-chain</div>
  <div style="font:400 20px Cinzel;color:#c9a96a;letter-spacing:2px;margin:10px 0 0 8px;text-shadow:0 2px 4px #000">
    The classic browser strategy game, with its own coin</div>
</div></div>'''


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, body, w, h in (('twitter-avatar', AVATAR, 1000, 1000), ('twitter-banner', BANNER, 1500, 500)):
            pg = await b.new_page(viewport={'width': w, 'height': h})
            tmp = OUT / '_social.html'
            tmp.write_text(body)
            await pg.goto(tmp.as_uri())
            tmp.unlink()
            await pg.evaluate('document.fonts.ready')
            await pg.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=93)
            print('wrote', name)
        await b.close()


asyncio.run(main())
