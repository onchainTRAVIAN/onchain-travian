"""Twitter/X images (JPG, no transparency): profile picture + header banner.

python scripts/art/brand/social.py   (scraping venv: playwright; needs branding/coin-1024.png, wordmark.svg)\nPainted banner variants use ~/art-raw/logo/banner-*.png (gen_logo.banners).
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

def banner(bg: pathlib.Path | None = None, coin: bool = True, text: bool = True) -> str:
    """Coin + wordmark + tagline; over a painted scene (kie.ai, gen_logo.banners) when bg is given.
    coin=False: text only (right side); text=False: the bare painting."""
    scene = (f'<img src="{bg.as_uri()}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
             '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,7,3,0) 25%,'
             'rgba(12,7,3,.55) 50%,rgba(12,7,3,.72) 100%),linear-gradient(0deg,rgba(12,7,3,.35),rgba(12,7,3,0) 40%)"></div>'
             ) if bg else ''
    if bg and not text:
        return BASE + f'<div style="width:1500px;height:500px;overflow:hidden"><img src="{bg.as_uri()}" style="width:100%;height:100%;object-fit:cover"></div>'
    left = (520 if coin else 480) if bg else 330
    return BASE + f'''<div class="{'' if bg else 'bg'}" style="--gx:30%;position:relative;overflow:hidden;width:1500px;height:500px">{scene}
{f'<img class="coin" src="{(OUT / "coin-1024.png").as_uri()}" style="left:{left}px;top:100px;width:300px;height:300px">' if coin else ''}
<div style="position:absolute;z-index:1;left:{left + 330}px;top:{160 if coin else 170}px">
  <img src="{(OUT / "wordmark.svg").as_uri()}" style="display:block;width:{560 if bg else 660}px;height:auto;filter:drop-shadow(0 3px 6px #000)">
  <div style="font:700 {24 if bg else 27}px Cinzel;color:#f6e2a8;letter-spacing:3px;margin:20px 0 0 6px;text-shadow:0 2px 5px #000,0 0 12px #000">
    Build &middot; Raid &middot; Conquer &middot; On-chain</div>
  <div style="font:400 {17 if bg else 20}px Cinzel;color:#e0c48a;letter-spacing:1.5px;white-space:nowrap;margin:10px 0 0 6px;text-shadow:0 2px 5px #000,0 0 12px #000">
    The classic browser strategy game, with its own coin</div>
</div></div>'''


RAW = pathlib.Path.home() / 'art-raw' / 'logo'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pages = [('twitter-avatar', AVATAR, 1000, 1000), ('twitter-banner', banner(), 1500, 500)]
        pages += [(f'twitter-{bg.stem}', banner(bg), 1500, 500) for bg in sorted(RAW.glob('banner-*.png'))]
        pages += [(f'twitter-{bg.stem}-text', banner(bg, coin=False), 1500, 500) for bg in sorted(RAW.glob('banner-*.png'))]
        pages += [(f'twitter-{bg.stem}-clean', banner(bg, text=False), 1500, 500) for bg in sorted(RAW.glob('banner-*.png'))]
        for name, body, w, h in pages:
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
