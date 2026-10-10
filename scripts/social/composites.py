"""Art line-ups for the X posts (rendered by Chromium from the game's own SVGs, on parchment).

source ~/scraping-env/bin/activate && python scripts/social/composites.py <out_dir> [old_art_dir] [name ...]

old_art_dir holds earlier troop versions pulled from git (post 36):
  git show 0374c7a^:src/web/public/img/units/big/romans-1.webp > <old>/romans-1-painted.webp
  git show e458324^:src/web/public/img/units/big/romans-1.png  > <old>/romans-1-oldschool.png
Writes <name>.png for scripts/social/frame.py.
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

REPO = pathlib.Path(__file__).resolve().parents[2]
IMG = (REPO / 'src/web/public/img').as_uri()
OUT = pathlib.Path(sys.argv[1])
OLD = pathlib.Path(sys.argv[2]).resolve().as_uri() if len(sys.argv) > 2 else ''
ONLY = set(sys.argv[3:])

CSS = """
body { margin: 0; background: #f3e7c9; font: 15px Verdana, sans-serif; color: #4a3a22; }
.sheet { display: inline-block; padding: 28px 34px; background: radial-gradient(ellipse at center, #fbf3df 0%, #efe0bd 100%); }
.row { display: flex; align-items: flex-end; gap: 18px; justify-content: center; }
.row + .row { margin-top: 14px; }
.cell { text-align: center; }
.cell img { display: block; margin: 0 auto; }
.cap { margin-top: 6px; font-size: 14px; color: #6b5532; }
.tribe { width: 92px; text-align: right; font-weight: bold; font-size: 14px; color: #6b5532; align-self: center; }
.portrait { position: relative; width: 180px; height: 225px; }
.portrait img { position: absolute; left: 0; top: 0; width: 180px; }
.portrait .fig { top: 8px; height: 210px; }
"""


def cell(src: str, w: int, h: int, cap: str = '') -> str:
    c = f'<div class="cap">{cap}</div>' if cap else ''
    return f'<div class="cell"><img src="{src}" width="{w}" height="{h}" style="object-fit:contain">{c}</div>'


def troops() -> str:
    rows = []
    for t, label in (('romans', 'Romans'), ('teutons', 'Teutons'), ('gauls', 'Gauls'), ('nature', 'Animals')):
        cells = ''.join(cell(f'{IMG}/units/big/{t}-{i}.svg', 120, 140) for i in range(1, 11))
        rows.append(f'<div class="row"><div class="tribe">{label}</div>{cells}</div>')
    return ''.join(rows)


def heroes() -> str:
    cells = []
    for s, lv in zip(range(1, 6), ('level 0', 'level 5', 'level 10', 'level 15', 'level 20')):
        cells.append(f'<div class="cell"><div class="portrait"><img src="{IMG}/hero/backdrop-{s}.svg">'
                     f'<img class="fig" src="{IMG}/hero/romans-{s}.svg"><img src="{IMG}/hero/frame-{s}.svg"></div>'
                     f'<div class="cap">from {lv}</div></div>')
    return f'<div class="row">{"".join(cells)}</div>'


def villages() -> str:
    tiers = ((1, 'new'), (2, '250 pop'), (3, '500 pop'), (5, '1,000 pop'), (6, '1,500 pop'))
    return '<div class="row">' + ''.join(cell(f'{IMG}/map/village-{n}.svg', 300, 260, c) for n, c in tiers) + '</div>'


def walls() -> str:
    """The front of each level 20 wall (the SVG is the whole ring around the village centre, 540x448)."""
    ws = (('city', 'Romans'), ('earth', 'Teutons'), ('palisade', 'Gauls'))
    x0, y0, w, h = 110, 345, 320, 95
    k = 1100 / w
    return ''.join(f'<div class="row"><div class="tribe" style="width:110px;font-size:20px">{c}</div>'
                   f'<div style="width:1100px;height:{round(h * k)}px;overflow:hidden;position:relative">'
                   f'<img src="{IMG}/walls/{n}-5.svg" width="{round(540 * k)}" height="{round(448 * k)}" '
                   f'style="position:absolute;left:{-round(x0 * k)}px;top:{-round(y0 * k)}px"></div></div>'
                   for n, c in ws)


def stages() -> str:
    files = ('main.svg', 'main-2.svg', 'main-3.svg', 'main-4.svg', 'main-5.svg')
    caps = ('level 1', 'level 5', 'level 10', 'level 15', 'level 20')
    return '<div class="row">' + ''.join(cell(f'{IMG}/buildings/{f}', 200, 266, c) for f, c in zip(files, caps)) + '</div>'


def versions() -> str:
    rows = []
    for u in ('romans-1', 'gauls-4'):
        cells = [cell(f'{OLD}/{u}-painted.webp', 200, 233), cell(f'{OLD}/{u}-oldschool.png', 200, 233), cell(f'{IMG}/units/big/{u}.svg', 200, 233)]
        rows.append('<div class="row">' + ''.join(cells) + '</div>')
    head = '<div class="row">' + ''.join(f'<div class="cell" style="width:200px"><b>{t}</b></div>' for t in ('1. painted', '2. old-school', '3. final')) + '</div>'
    return head + ''.join(rows)


TEST_PICKS = ('combat.test.ts > classic T3.6 combat > catapult targets follow', 'combat.test.ts > classic T3.6 combat > rams lower the wall',
              'simulator.test.ts > combat simulator > gives the same result', 'simulator.test.ts > combat simulator vs real traps',
              'classic.test.ts > T3.6 reference numbers > woodcutter level 10', 'classic.test.ts > T3.6 reference numbers > cropland level 3',
              'audit.test.ts > loopholes closed > lowering a Gold-market', 'audit.test.ts > loopholes closed > Gold from tasks',
              'security.test.ts > anti-cheat fixes (audit) > cancelling a marketplace', 'rulesfix.test.ts > alliance treaties block attacks')


def tests() -> str:
    """A terminal with real lines of `npx vitest run --reporter=verbose` (ANSI stripped; log path in TEST_LOG)."""
    import html
    import os
    lines = pathlib.Path(os.environ['TEST_LOG']).read_text().splitlines()
    picked = [next(l for l in lines if k in l) for k in TEST_PICKS]
    summary = [l for l in lines if l.strip().startswith(('Test Files', 'Tests '))]
    body = '\n'.join(html.escape(l.replace(' > ', ' › ')) for l in picked)
    body = body.replace('✓', '<b style="color:#3fb950">✓</b>')
    total = '\n'.join(html.escape(l) for l in summary).replace('passed', '<b style="color:#3fb950">passed</b>')
    return ('<div style="background:#0d1117;border-radius:10px;width:1500px;padding:0 0 18px;font:19px/1.6 DejaVu Sans Mono,monospace;color:#c9d1d9">'
            '<div style="padding:10px 16px;color:#8b949e;border-bottom:1px solid #30363d">● ● ●&nbsp;&nbsp; onchain-travian</div>'
            f'<pre style="margin:14px 22px;white-space:pre-wrap">$ npm test\n\n{body}\n   ...\n\n{total}</pre></div>')


SHEETS = {'06-troops': troops, '07-hero': heroes, '12-villages': villages, '21-walls': walls, '22-stages': stages, '36-versions': versions, '18-tests': tests}


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1800, 'height': 1000}, device_scale_factor=2)
        for name, fn in SHEETS.items():
            if ONLY and name not in ONLY or (name == '36-versions' and not OLD) or (name == '18-tests' and 'TEST_LOG' not in __import__('os').environ):
                continue
            html = f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><div class="sheet">{fn()}</div>'
            f = OUT / f'_{name}.html'
            f.write_text(html)
            await pg.goto(f.as_uri())
            await pg.wait_for_load_state('networkidle')
            await pg.locator('.sheet').screenshot(path=str(OUT / f'{name}.png'))
            f.unlink()
            print('wrote', OUT / f'{name}.png')
        await b.close()


asyncio.run(main())
