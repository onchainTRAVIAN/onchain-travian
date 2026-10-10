"""Short screen recordings for the X posts, from the staged local world (scripts/social/stage.ts).

source ~/scraping-env/bin/activate && python scripts/social/videos.py <out_dir> [03-simulator 05-livemap 19-clicks]

Records a 960x540 page at 2x (1920x1080) through the CDP screencast (a drawn cursor is injected, headless Chromium has none), then
converts to H.264 MP4 for X with the ffmpeg from imageio-ffmpeg in ~/art-env.
"""
import asyncio
import base64
import pathlib
import shutil
import subprocess
import sys

from playwright.async_api import Page, async_playwright

B = 'http://localhost:8099'
OUT = pathlib.Path(sys.argv[1])
ONLY = set(sys.argv[2:])
SIZE = {'width': 960, 'height': 540}  # CSS px; recorded at 2x = 1920x1080
VIDEO = {'width': 1920, 'height': 1080}
FFMPEG = subprocess.run([str(pathlib.Path.home() / 'art-env/bin/python'), '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
                        capture_output=True, text=True, check=True).stdout.strip()

# An arrow cursor that follows the mouse (pointer-events: none so it never blocks a click).
CURSOR = """
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('img');
  c.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 13 17"><path d="M1 1v13l3.2-3 2.3 5 2.1-.9-2.2-5H11z" fill="#fff" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/></svg>');
  Object.assign(c.style, {position: 'fixed', left: '-40px', top: '-40px', width: '26px', height: '34px', zIndex: 2147483647, pointerEvents: 'none'});
  document.body.appendChild(c);
  addEventListener('pointermove', e => { c.style.left = e.clientX - 2 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
  addEventListener('mousemove', e => { c.style.left = e.clientX - 2 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
});
"""


async def login(pg: Page) -> None:
    await pg.goto(B + '/login')
    await pg.fill('#u', 'demo')
    await pg.fill('#p', 'demo12345')
    await pg.press('#p', 'Enter')
    await pg.wait_for_load_state('networkidle')


async def glide(pg: Page, x0: float, y0: float, x1: float, y1: float, steps: int = 25, down: bool = False) -> None:
    await pg.mouse.move(x0, y0)
    if down:
        await pg.mouse.down()
    for i in range(1, steps + 1):
        t = i / steps
        t = t * t * (3 - 2 * t)
        await pg.mouse.move(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
        await pg.wait_for_timeout(16)
    if down:
        await pg.mouse.up()


async def center(pg: Page, sel: str) -> tuple[float, float]:
    b = await pg.locator(sel).first.bounding_box()
    return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2


async def type_into(pg: Page, sel: str, text: str, at: list[float]) -> None:
    x, y = await center(pg, sel)
    await glide(pg, at[0], at[1], x, y, 18)
    at[:] = [x, y]
    await pg.click(sel)
    await pg.keyboard.press('Control+A')
    for ch in text:
        await pg.keyboard.type(ch)
        await pg.wait_for_timeout(120)
    await pg.wait_for_timeout(500)


async def simulator(pg: Page) -> None:
    await pg.goto(B + '/simulator?mode=attack&a_t=romans&d1_t=teutons&apop=973&dpop=400')
    await pg.wait_for_load_state('networkidle')
    await pg.evaluate("document.querySelector('input[name=a0]').scrollIntoView({block: 'start'}); scrollBy(0, -90)")
    await pg.wait_for_timeout(700)
    at = [480.0, 270.0]
    for sel, val in (('input[name=a0]', '400'), ('input[name=a2]', '250'), ('input[name=a5]', '60'), ('input[name=d10]', '300'),
                     ('input[name=d11]', '200'), ('input[name=wall]', '12'), ('input[name=a6]', '20')):
        await type_into(pg, sel, val, at)
    await pg.wait_for_timeout(600)
    # scroll down to the result
    for _ in range(24):
        await pg.mouse.wheel(0, 25)
        await pg.wait_for_timeout(30)
    await pg.wait_for_timeout(2600)


async def livemap(pg: Page) -> None:
    await pg.goto(B + '/map')
    await pg.wait_for_load_state('networkidle')
    await pg.evaluate("document.querySelector('#lm-view').scrollIntoView({block: 'center'})")
    await pg.wait_for_timeout(1200)
    v = await pg.locator('#lm-view').bounding_box()
    cx, cy = v['x'] + v['width'] / 2, v['y'] + v['height'] / 2
    await glide(pg, cx + 150, cy + 80, cx - 120, cy - 60, 40, down=True)
    await pg.wait_for_timeout(500)
    await glide(pg, cx - 120, cy - 60, cx + 60, cy + 120, 40, down=True)
    await pg.wait_for_timeout(500)
    for _ in range(6):  # zoom out
        await pg.mouse.wheel(0, 120)
        await pg.wait_for_timeout(260)
    await pg.wait_for_timeout(900)
    for _ in range(9):  # zoom in
        await pg.mouse.wheel(0, -120)
        await pg.wait_for_timeout(220)
    await pg.wait_for_timeout(900)
    m = await pg.locator('#lm-canvas').bounding_box()
    if m:
        await glide(pg, cx + 60, cy + 120, m['x'] + m['width'] * 0.3, m['y'] + m['height'] * 0.35, 30)
        await pg.mouse.down()
        await pg.mouse.up()
        await pg.wait_for_timeout(1300)
        await glide(pg, m['x'] + m['width'] * 0.3, m['y'] + m['height'] * 0.35, m['x'] + m['width'] * 0.5, m['y'] + m['height'] * 0.5, 30)
        await pg.mouse.down()
        await pg.mouse.up()
    await pg.wait_for_timeout(1800)


async def clicks(pg: Page) -> None:
    await pg.goto(B + '/village')
    await pg.wait_for_load_state('networkidle')
    await pg.evaluate('scrollTo(0, 120)')
    await pg.wait_for_timeout(800)
    # building centres (slightly below the middle of each 75x100 picture), visited in a loop around the centre
    pts = await pg.evaluate("""() => [...document.querySelectorAll('#vmap2 .bld')].map(e => {
      const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 0.62, e.className]; })""")
    order = ['b26', 'b22', 'b19', 'b21', 'b39', 'b31', 'b30', 'b25', 'b23', 'b32']
    by = {next(c for c in cls.split() if c.startswith('b') and c[1:].isdigit()): (x, y) for x, y, cls in pts}
    px, py = 900.0, 520.0
    for k in order:
        if k not in by:
            continue
        nx, ny = by[k]
        await glide(pg, px, py, nx, ny, 20)
        await pg.wait_for_timeout(550)
        px, py = nx, ny
    await pg.mouse.down()
    await pg.mouse.up()
    await pg.wait_for_load_state('networkidle')
    await pg.wait_for_timeout(1800)


SCENES = {'03-simulator': simulator, '05-livemap': livemap, '19-clicks': clicks}


async def main() -> None:
    raw = OUT / '_frames'
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, scene in SCENES.items():
            if ONLY and name not in ONLY:
                continue
            shutil.rmtree(raw, ignore_errors=True)
            raw.mkdir(parents=True)
            ctx = await b.new_context(viewport=SIZE, device_scale_factor=2)
            await ctx.add_init_script(CURSOR)
            pg = await ctx.new_page()
            await login(pg)
            # CDP screencast keeps device pixels (Playwright's own video records CSS pixels only)
            cdp = await ctx.new_cdp_session(pg)
            frames: list[tuple[float, pathlib.Path]] = []

            async def on_frame(ev: dict) -> None:
                f = raw / f'{len(frames):05d}.jpg'
                f.write_bytes(base64.b64decode(ev['data']))
                frames.append((ev['metadata']['timestamp'], f))
                await cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})

            cdp.on('Page.screencastFrame', lambda ev: asyncio.ensure_future(on_frame(ev)))
            await cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92, 'maxWidth': VIDEO['width'], 'maxHeight': VIDEO['height']})
            await scene(pg)
            await cdp.send('Page.stopScreencast')
            await pg.wait_for_timeout(300)
            await ctx.close()
            # concat list with each frame shown until the next one arrived
            lst = raw / 'list.txt'
            rows = []
            for i, (t, f) in enumerate(frames):
                dur = (frames[i + 1][0] - t) if i + 1 < len(frames) else 0.5
                rows.append(f"file '{f.name}'\nduration {max(dur, 0.001):.4f}")
            rows.append(f"file '{frames[-1][1].name}'")
            lst.write_text('\n'.join(rows) + '\n')
            out = OUT / f'{name}.mp4'
            subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst),
                            '-vf', f"fps=30,scale={VIDEO['width']}:{VIDEO['height']}:force_original_aspect_ratio=decrease,pad={VIDEO['width']}:{VIDEO['height']}:(ow-iw)/2:(oh-ih)/2:color=white",
                            '-ss', '1.5', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out)], check=True)
            print('wrote', out, len(frames), 'frames')
        await b.close()
    shutil.rmtree(raw, ignore_errors=True)


asyncio.run(main())
