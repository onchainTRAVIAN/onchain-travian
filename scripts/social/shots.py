"""Raw screenshots for the X posts, taken from a staged local world (scripts/social/stage.ts).

source ~/scraping-env/bin/activate && DEMO_SESSION=<scratch>/demo-session.txt python scripts/social/shots.py <out_dir> [name ...]

Expects the staged server on http://localhost:8099 (logs in as demo with the session token stage.ts wrote). Writes <name>.png at 2x;
scripts/social/frame.py turns them into the 1600x900 post images.
"""
import asyncio
import os
import pathlib
import sys

from playwright.async_api import Page, async_playwright

B = 'http://localhost:8099'
OUT = sys.argv[1]
ONLY = set(sys.argv[2:])


async def login(pg: Page) -> None:
    """Accounts are wallet-only: use demo's session token written by stage.ts (path in DEMO_SESSION)."""
    token = pathlib.Path(os.environ['DEMO_SESSION']).read_text().strip()
    await pg.context.add_cookies([{'name': 'sid', 'value': token, 'url': B}])
    await pg.goto(B + '/village')
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

        if want('37-beta'):  # header (red Beta, speed x100) and the village centre
            await go(pg, '/village')
            await pg.screenshot(path=f'{OUT}/37-beta.png', clip={'x': 60, 'y': 0, 'width': 980, 'height': 646})

        # ---- posts 38 to 66 (2026-11-07) ----
        if want('38-wallet'):  # logged out: the front page on a desktop, then a phone without a wallet after tapping Connect wallet
            hide = "document.querySelector('#content .stats')?.remove()"  # the staged world's player counts aren't the live world's
            anon = await b.new_page(viewport={'width': 1100, 'height': 900}, device_scale_factor=2)
            await go(anon, '/')
            await anon.evaluate(hide)
            await content(anon, '38-wallet')
            await anon.close()
            ph = await b.new_page(**p.devices['iPhone 13'])  # a phone user agent, so wallet.js offers the wallet apps
            await go(ph, '/')
            await ph.evaluate(hide)
            await ph.click('[data-action="login"]')
            await ph.wait_for_timeout(600)
            box = await ph.evaluate("""() => { const a = document.querySelector('#content .hero').getBoundingClientRect();
              const c = document.querySelector('#content section.connect').getBoundingClientRect();
              return {x: 0, y: a.top + scrollY - 8, width: innerWidth, height: c.bottom - a.top + 16}; }""")
            await ph.screenshot(path=f'{OUT}/38-wallet-phone.png', clip=box, full_page=True)
            await ph.close()

        if want('43-production'):  # wood with the forest lake oasis, crop with what eats it
            await go(pg, '/production')
            secs = pg.locator('#content section.spanel')
            await secs.nth(0).screenshot(path=f'{OUT}/43-production-wood.png')
            await secs.nth(3).screenshot(path=f'{OUT}/43-production-crop.png')

        if want('52-merchants'):
            await go(pg, '/slot/31')
            await content(pg, '52-merchants', 470)

        if want('53-farmlists'):
            await go(pg, '/troops/farmlist')
            await pg.locator('section#list').screenshot(path=f'{OUT}/53-farmlists.png')

        if want('58-capital'):
            await go(pg, '/fields')
            await content(pg, '58-capital', 520)

        if want('61-alliance'):
            await go(pg, '/alliance')
            await content(pg, '61-alliance', 662)

        if want('62-upgrades'):  # the Legionnaire's card and its upgrade table at levels 0, 5, 10, 15 and 20 (training block hidden)
            await go(pg, '/unit/romans/1')
            await pg.evaluate("""() => {
              for (const h of document.querySelectorAll('#content h2')) if (h.textContent.trim().startsWith('Training')) {
                h.style.display = 'none'; if (h.nextElementSibling) h.nextElementSibling.style.display = 'none'; }
              document.querySelectorAll('table.upgtb tbody tr').forEach((tr, i) => { if (i % 5) tr.style.display = 'none'; }); }""")
            await content(pg, '62-upgrades')

        if want('64-profile'):
            await go(pg, '/player/1')
            await content(pg, '64-profile', 402)

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
