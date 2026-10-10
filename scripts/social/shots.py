"""Raw screenshots for the X posts, taken from a staged local world (scripts/social/stage.ts).

source ~/scraping-env/bin/activate && python scripts/social/shots.py <out_dir> [name ...]

Expects the staged server on http://localhost:8099 (demo / demo12345). Writes <name>.png at 2x;
scripts/social/frame.py turns them into the 1600x900 post images.
"""
import asyncio
import sys

from playwright.async_api import Page, async_playwright

B = 'http://localhost:8099'
OUT = sys.argv[1]
ONLY = set(sys.argv[2:])


async def login(pg: Page) -> None:
    await pg.goto(B + '/login')
    await pg.fill('#u', 'demo')
    await pg.fill('#p', 'demo12345')
    await pg.press('#p', 'Enter')
    await pg.wait_for_load_state('networkidle')


async def go(pg: Page, url: str) -> None:
    await pg.goto(B + url)
    await pg.wait_for_load_state('networkidle')
    await pg.wait_for_timeout(400)


async def content(pg: Page, name: str, max_h: int = 0, pad: int = 6) -> None:
    box = await pg.evaluate("""() => { const r = document.querySelector('#content').getBoundingClientRect();
      return {x: r.x, y: r.y + scrollY, width: r.width, height: r.height}; }""")
    box = {'x': box['x'] - pad, 'y': box['y'] - pad, 'width': box['width'] + 2 * pad,
           'height': (min(box['height'], max_h) if max_h else box['height']) + 2 * pad}
    await pg.screenshot(path=f'{OUT}/{name}.png', clip=box, full_page=True)


def want(name: str) -> bool:
    return not ONLY or name in ONLY


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1100, 'height': 900}, device_scale_factor=2)
        await login(pg)

        if want('04-auto'):
            await go(pg, '/troops/train#auto')
            await pg.evaluate("document.querySelector('#auto').open = true")
            await pg.wait_for_timeout(300)
            await pg.locator('#auto').screenshot(path=f'{OUT}/04-auto.png')

        if want('09-guide'):
            await go(pg, '/help?q=cranny')
            await pg.hover('#res .qh')
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'{OUT}/09-guide.png', clip={'x': 64, 'y': 96, 'width': 720, 'height': 700})

        if want('11-raider'):
            await go(pg, '/troops/farmlist')
            await pg.evaluate("document.querySelectorAll('#content details').forEach(d => d.open = true)")
            await pg.locator('.raider.spanel').screenshot(path=f'{OUT}/11-raider.png')

        if want('13-report'):
            await go(pg, '/reports/37')
            await content(pg, '13-report')

        if want('15-week'):
            await go(pg, '/stats/week')
            await content(pg, '15-week')

        if want('16-levels'):
            await go(pg, '/slot/26')
            await pg.evaluate("document.querySelectorAll('#content details').forEach(d => d.open = true)")
            await content(pg, '16-levels', 860)

        if want('24-cranny'):
            await go(pg, '/slot/24')
            await pg.evaluate("document.querySelectorAll('#content details').forEach(d => d.open = true)")
            await content(pg, '24-cranny')

        if want('26-artifacts'):
            await go(pg, '/endgame')
            await content(pg, '26-artifacts', 900)

        if want('27-goldmarket'):
            await go(pg, '/goldmarket')
            await content(pg, '27-goldmarket')

        if want('29-catapult'):
            await go(pg, '/troops/send?x=12&y=10&u0=300&u2=200&u6=20&u7=24')
            await pg.evaluate("""() => { const s = document.querySelector('select[name=catapultTarget]');
              if (s) { s.size = Math.min(s.options.length, 14); s.style.height = 'auto'; } }""")
            await content(pg, '29-catapult')

        if want('30-infobox'):
            big = await b.new_page(viewport={'width': 1100, 'height': 900}, device_scale_factor=4)
            await login(big)
            await go(big, '/village')
            await big.locator('.infobox').screenshot(path=f'{OUT}/30-infobox.png')
            await big.close()

        if want('31-croppers'):
            await go(pg, '/map/croppers')
            await content(pg, '31-croppers', 640)

        if want('32-hero'):
            await go(pg, '/hero')
            await content(pg, '32-hero', 560)

        if want('34-sim'):
            await go(pg, '/simulator?mode=attack&a_t=romans&a0=300&a2=200&a5=40&a6=8&a7=6&al0=10&al1=6&al2=12&al4=10&al5=4'
                         '&d1_t=teutons&d10=73&d11=36&d13=6&d15=6&wall=10&tl=5&apop=973&dpop=116')
            await content(pg, '34-sim')

        if want('18-tests'):
            gh = await b.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=2, color_scheme='light')
            await gh.goto('https://github.com/onchainTRAVIAN/onchain-travian/actions')
            await gh.wait_for_load_state('networkidle')
            await gh.screenshot(path=f'{OUT}/18-tests.png', clip={'x': 0, 'y': 60, 'width': 1280, 'height': 700})
            await gh.close()

        m = await b.new_page(viewport={'width': 390, 'height': 760}, device_scale_factor=3, is_mobile=True, has_touch=True)
        await login(m)
        for n, u in (('14-phone-village', '/village'), ('14-phone-map', '/map'), ('14-phone-report', '/reports/37')):
            if want(n):
                await go(m, u)
                await m.wait_for_timeout(800)
                await m.screenshot(path=f'{OUT}/{n}.png')
        await b.close()


asyncio.run(main())
