"""Promo trailer for the X posts: kie.ai Veo 3.1 animates our paintings, then the edit adds titles, real game shots and
the logo end card.

  ~/art-env/bin/python scripts/social/trailer.py gen   <raw_dir> [shot ...]   animate the paintings (resumable, 65 credits each)
  ~/art-env/bin/python scripts/social/trailer.py music <raw_dir>              instrumental trailer track (Suno via kie.ai)
  ~/art-env/bin/python scripts/social/trailer.py edit  <raw_dir> <shots_dir> <name.mp4>   writes <name>.video.mp4 (no sound)
  ~/art-env/bin/python scripts/social/trailer.py mux   <name.video.mp4> <music.mp3> <out.mp4> [music start s]

gen writes <raw_dir>/<shot>.mp4 (Veo 3.1 Fast, 1080p, 8 s). edit cuts them with the game screens named in TIMELINE
(ui-*.png in <shots_dir>: 1920x1080 or any size, they go on a card).
"""
from __future__ import annotations

import json
import pathlib
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'scripts/art/kie'))

STYLE = ('Keep the exact hand-painted oil-painting style, colours, lighting and composition of the image; it stays a painting '
         'in motion. No text, no letters, no logos, no people talking, no music.')

# shot -> (painting in branding/raw/social, motion prompt)
SHOTS: dict[str, tuple[str, str]] = {
    'build': ('what-empire', 'Slow cinematic aerial push-in over this fortified town. Builders carry timber, smoke drifts from the '
              'chimneys, people work the fields, cranes turn on the tall wonder tower under construction in the distance, clouds '
              'drift. Golden evening light. Sound: hammers, wind, a busy town.'),
    'raid': ('p25-oases', 'Fast tracking shot moving with the riders across the grassland. The red-caped cavalry gallop hard, dust '
             'and grass fly up, the wolves and the boar run for the lake. Dynamic action. Sound: thundering hooves, wind, animals.'),
    'conquer': ('p10-natars', 'Epic low push-in. The armoured war elephants and the massed army march toward the camera through the '
                'mist, banners whip in the wind, the fortress looms on the hill behind them, dust and mist swirl. Heavy, powerful '
                'movement. Sound: war drums, elephant trumpets, armour and marching feet.'),
    'speed': ('p35-fast', 'Very fast time-lapse with a locked camera. The sun sinks and the moon rises within seconds, clouds race '
              'across the sky, shadows sweep over the fields, carts and soldiers hurry along the road, lights flicker on in the '
              'town. Sound: a rising rush of wind.'),
    'end': ('what-hero', 'Slow majestic push-in toward the commander on the white horse at the cliff edge. His red cape and the '
            'banners below flutter, the horse shifts its weight, clouds drift past the golden wonder tower, light shimmers on the '
            'lake, birds cross the sky. Calm and epic. Sound: wind and a distant city.'),
}


def _find_mp4(x: object) -> str | None:
    if isinstance(x, str):
        return x if x.startswith('http') and '.mp4' in x else None
    if isinstance(x, dict):
        x = list(x.values())
    if isinstance(x, list):
        for v in x:
            u = _find_mp4(v)
            if u:
                return u
    return None


def animate(name: str, raw: pathlib.Path) -> str:
    import kie  # reads KIE_API_KEY from .env, never prints it
    out = raw / f'{name}.mp4'
    if out.exists():
        return f'{name}: kept'
    painting, motion = SHOTS[name]
    url = kie.upload(REPO / 'branding/raw/social' / f'{painting}.png')
    body = {'model': 'veo-3-1', 'input': {'prompt': f'{motion} {STYLE}', 'model': 'veo3_fast', 'image_urls': [url],
                                          'generation_type': 'FIRST_AND_LAST_FRAMES_2_VIDEO', 'aspect_ratio': '16:9',
                                          'resolution': '1080p', 'duration': 8}}
    task = kie._req('POST', f'{kie.API}/api/v1/jobs/createTask', body)['data']['taskId']
    t0 = time.time()
    while time.time() - t0 < 1200:
        d = kie._req('GET', f'{kie.API}/api/v1/jobs/recordInfo?taskId={task}')['data']
        if d['state'] == 'success':
            res = json.loads(d['resultJson']) if isinstance(d.get('resultJson'), str) else d.get('resultJson')
            link = _find_mp4(res)
            if not link:
                raise RuntimeError(f'{name}: no video in the result')
            with urllib.request.urlopen(link, timeout=300) as r:
                out.write_bytes(r.read())
            return f"{name}: {out.stat().st_size // 1024} KB, {d.get('creditsConsumed')} credits"
        if d['state'] == 'fail':
            raise RuntimeError(f"{name}: failed {d.get('failCode')} {d.get('failMsg')}")
        time.sleep(8)
    raise TimeoutError(name)


def gen(raw: pathlib.Path, only: list[str]) -> None:
    raw.mkdir(parents=True, exist_ok=True)
    names = only or list(SHOTS)
    with ThreadPoolExecutor(len(names)) as ex:
        for f in [ex.submit(animate, n, raw) for n in names]:
            try:
                print(f.result(), flush=True)
            except Exception as e:  # report every shot, keep the others going
                print('ERROR', e, flush=True)


MUSIC_STYLE = ('Epic cinematic orchestral trailer music, thunderous war drums and taiko, powerful low brass, staccato strings, '
               'choir hits, big impact from the very first second, no slow intro, rising tension, heroic ancient battle mood')


def music(raw: pathlib.Path) -> None:
    """Instrumental trailer track (Suno through kie.ai): <raw_dir>/music-1.mp3 and music-2.mp3."""
    import kie
    raw.mkdir(parents=True, exist_ok=True)
    body = {'model': 'ai-music-api/generate', 'input': {'custom_mode': True, 'instrumental': True, 'model': 'V6', 'title': 'Open beta',
                                                        'style': MUSIC_STYLE, 'negative_tags': 'vocals, singing, lyrics, slow intro, lo-fi',
                                                        'duration': 20}}
    task = kie._req('POST', f'{kie.API}/api/v1/jobs/createTask', body)['data']['taskId']
    t0 = time.time()
    while time.time() - t0 < 900:
        d = kie._req('GET', f'{kie.API}/api/v1/jobs/recordInfo?taskId={task}')['data']
        if d['state'] == 'success':
            res = json.loads(d['resultJson']) if isinstance(d.get('resultJson'), str) else (d.get('resultJson') or d.get('response') or d)
            urls: list[str] = []

            def walk(x: object) -> None:
                if isinstance(x, dict):
                    for k, v in x.items():
                        if k in ('audio_url', 'audioUrl') and isinstance(v, str) and v.startswith('http'):
                            urls.append(v)
                        walk(v)
                elif isinstance(x, list):
                    for v in x:
                        walk(v)
            walk(res)
            walk(d.get('response'))
            if not urls and isinstance(res, dict):
                urls = [u for u in res.get('resultUrls', []) if isinstance(u, str)]
            for i, u in enumerate(dict.fromkeys(urls)):
                out = raw / f'music-{i + 1}.mp3'
                with urllib.request.urlopen(u, timeout=300) as r:
                    out.write_bytes(r.read())
                print('wrote', out, flush=True)
            print('credits', d.get('creditsConsumed'), flush=True)
            return
        if d['state'] == 'fail':
            raise RuntimeError(f"music failed: {d.get('failCode')} {d.get('failMsg')}")
        time.sleep(8)
    raise TimeoutError('music')


# ---------------------------------------------------------------- edit

W, H, FPS = 1920, 1080, 30
BRAND = REPO / 'branding'
CINZEL = REPO / 'scripts/art/brand/Cinzel.ttf'
CORMORANT = REPO / 'scripts/art/brand/CormorantGaramond.ttf'
# (kind, source, seconds, options): 'shot' = a Veo clip with a title, 'game' = a real game screen on a card, 'end' = logo card
TIMELINE: list[tuple[str, str, float, dict]] = [
    ('shot', 'build', 2.1, {'from': 0.6, 'title': 'BUILD'}),
    ('game', 'ui-village.png', 0.5, {}),
    ('shot', 'raid', 1.8, {'from': 1.0, 'title': 'RAID'}),
    ('game', 'ui-countdown.png', 0.5, {}),
    ('shot', 'conquer', 1.8, {'from': 3.0, 'title': 'CONQUER'}),
    ('game', 'ui-report.png', 0.5, {}),
    ('shot', 'speed', 1.8, {'from': 0.3, 'speed': 3.5, 'title': 'SPEED x100'}),
    ('end', 'end', 3.0, {'from': 0.2}),
]


def _ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _font(path: pathlib.Path, size: int, bold: bool = True):
    from PIL import ImageFont
    f = ImageFont.truetype(str(path), size)
    if bold:
        try:
            f.set_variation_by_name('Bold')
        except (OSError, ValueError):
            pass
    return f


def _ease(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def _back(x: float) -> float:
    x = min(1.0, max(0.0, x))
    c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def _text(text: str, font, track: int, top=(255, 244, 214), bottom=(222, 170, 72), stroke: int = 4):
    """Gold title with a dark edge and a soft shadow, as RGBA."""
    from PIL import Image, ImageDraw, ImageFilter
    adv = [font.getlength(ch) for ch in text]
    w = int(sum(adv) + track * (len(text) - 1)) + 4 * stroke
    asc, desc = font.getmetrics()
    h = asc + desc + 4 * stroke
    pad = 40
    fill = Image.new('L', (w + 2 * pad, h + 2 * pad), 0)
    edge = Image.new('L', fill.size, 0)
    df, de = ImageDraw.Draw(fill), ImageDraw.Draw(edge)
    x = pad + 2 * stroke
    for ch, a in zip(text, adv):
        de.text((x, pad + stroke), ch, font=font, fill=255, stroke_width=stroke, stroke_fill=255)
        df.text((x, pad + stroke), ch, font=font, fill=255)
        x += a + track
    grad = Image.new('RGB', (1, fill.height))
    for y in range(fill.height):
        t = min(1.0, max(0.0, (y - pad) / max(1, h)))
        grad.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    grad = grad.resize(fill.size)
    out = Image.new('RGBA', fill.size, (0, 0, 0, 0))
    shadow = edge.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.75))
    out.paste((0, 0, 0, 255), (0, 10), shadow)
    out.paste((38, 20, 4, 255), (0, 0), edge)
    out.paste(grad, (0, 0), fill)
    return out


def _alpha(im, a: float):
    import numpy as np
    from PIL import Image
    arr = np.asarray(im).copy()
    arr[..., 3] = (arr[..., 3].astype(np.float32) * max(0.0, min(1.0, a))).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def _place(frame, im, scale: float, cx: float, cy: float, a: float) -> None:
    from PIL import Image
    if a <= 0.01:
        return
    w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    sm = im.resize((w, h), Image.LANCZOS) if (w, h) != im.size else im
    frame.alpha_composite(_alpha(sm, a), (round(cx - w / 2), round(cy - h / 2)))


def _clip_frames(path: pathlib.Path, start: float, dur: float, speed: float = 1.0):
    import subprocess
    from PIL import Image
    n = round(dur * FPS)
    cmd = [_ffmpeg(), '-loglevel', 'error', '-ss', f'{start}', '-i', str(path), '-t', f'{dur * speed + 0.5}', '-an',
           '-vf', f'setpts=PTS/{speed},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            if last is None:
                raise RuntimeError(f'no frames from {path.name}')
            buf = last
        last = buf
        yield Image.frombytes('RGB', (W, H), buf).convert('RGBA')
    p.kill()


def _vignette():
    import numpy as np
    from PIL import Image
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) / 1.414
    v = 1 - 0.55 * np.clip(d, 0, 1) ** 2.2
    a = ((1 - v) * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.zeros((H, W, 3), np.uint8), a]), 'RGBA')


def _card(path: pathlib.Path):
    """A real game screen on a gold-edged card with a shadow (RGBA, padded)."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.open(path).convert('RGB')
    s = min(1600 / im.width, 900 / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    pad = 60
    out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('L', out.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((pad, pad + 12, pad + im.width, pad + im.height + 12), 14, fill=200)
    out.paste((0, 0, 0, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(22)))
    ImageDraw.Draw(out).rounded_rectangle((pad - 5, pad - 5, pad + im.width + 4, pad + im.height + 4), 16, fill=(214, 178, 104, 255))
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 12, fill=255)
    out.paste(im, (pad, pad), m)
    return out


def edit(raw: pathlib.Path, shots: pathlib.Path, out_path: pathlib.Path) -> None:
    import subprocess
    from PIL import Image, ImageFilter
    tmp = out_path.with_suffix('.video.mp4')
    enc = subprocess.Popen([_ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(tmp)],
                           stdin=subprocess.PIPE)
    vig = _vignette()
    title_font = _font(CINZEL, 150)
    coin = Image.open(BRAND / 'coin-512.png').convert('RGBA').resize((300, 300), Image.LANCZOS)
    word = Image.open(BRAND / 'wordmark.png').convert('RGBA')
    word = word.resize((1000, round(word.height * 1000 / word.width)), Image.LANCZOS)
    line1 = _text('OPEN BETA  ·  LIVE NOW', _font(CINZEL, 64), 10, stroke=3)
    line2 = _text('travian.forum', _font(CORMORANT, 76), 2, top=(255, 255, 255), bottom=(236, 226, 200), stroke=3)
    glow = Image.new('RGBA', (520, 520), (0, 0, 0, 0))
    from PIL import ImageDraw
    ImageDraw.Draw(glow).ellipse((110, 110, 410, 410), fill=(255, 196, 90, 150))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    last = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    frames = 0
    for idx, (kind, src, dur, o) in enumerate(TIMELINE):
        n = round(dur * FPS)
        if kind == 'game':
            card = _card(shots / src)
            bg = Image.blend(last.convert('RGB').filter(ImageFilter.GaussianBlur(18)), Image.new('RGB', (W, H)), 0.55).convert('RGBA')
            seq = (bg.copy() for _ in range(n))
        else:
            seq = _clip_frames(raw / f'{src}.mp4', o.get('from', 0.0), dur, o.get('speed', 1.0))
        title = _text(o['title'], title_font, 22) if o.get('title') else None
        for i, fr in enumerate(seq):
            t = i / FPS
            if kind == 'game':
                s = 0.9 + 0.1 * _ease(t / 0.12) + 0.03 * (t / dur)
                _place(fr, card, s, W / 2, H / 2, 1.0)
            else:
                fr.alpha_composite(vig)
                if kind == 'shot' and title is not None:
                    a = _ease((t - 0.1) / 0.22) * (1.0 if t < dur - 0.16 else max(0.0, (dur - t) / 0.16))
                    s = 1.14 - 0.14 * _ease((t - 0.1) / 0.5) - 0.03 * (t / dur)
                    _place(fr, title, s, W / 2, H / 2 + 30, a)
                if kind == 'end':
                    dark = Image.new('RGBA', (W, H), (8, 5, 2, round(120 * _ease(t / 0.4))))
                    fr.alpha_composite(dark)
                    _place(fr, glow, 1.0 + 0.05 * (t % 1.6), W / 2, 330, 0.85 * _ease((t - 0.2) / 0.5))
                    _place(fr, coin, 0.55 + 0.45 * _back((t - 0.2) / 0.5), W / 2, 330, _ease((t - 0.2) / 0.3))
                    _place(fr, word, 1.0, W / 2, 575 + 24 * (1 - _ease((t - 0.5) / 0.45)), _ease((t - 0.5) / 0.35))
                    _place(fr, line1, 1.0, W / 2, 700, _ease((t - 0.9) / 0.35))
                    _place(fr, line2, 1.0, W / 2, 800, _ease((t - 1.2) / 0.35))
            if idx > 0 and i < 3:  # a short light flash on every cut
                fr.alpha_composite(Image.new('RGBA', (W, H), (255, 250, 235, round((200 if kind != 'game' else 140) * (1 - i / 3) ** 2))))
            if kind != 'game':
                last = fr
            enc.stdin.write(fr.convert('RGB').tobytes())
            frames += 1
    enc.stdin.close()
    enc.wait()
    print('video', tmp, frames, 'frames', f'{frames / FPS:.2f} s', flush=True)


def mux(video: pathlib.Path, track: pathlib.Path, out_path: pathlib.Path, start: float = 0.0) -> None:
    """Lay the music under the cut: starts at `start` s of the track, fades out over the last second."""
    import subprocess
    dur = sum(d for _, _, d, _ in TIMELINE)
    subprocess.run([_ffmpeg(), '-y', '-loglevel', 'error', '-i', str(video), '-ss', f'{start}', '-i', str(track), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-af', f'afade=t=in:d=0.05,afade=t=out:st={dur - 1.0}:d=1.0,loudnorm=I=-14:TP=-1.5:LRA=11',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', f'{dur}', '-movflags', '+faststart', str(out_path)], check=True)
    print('wrote', out_path, flush=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == 'gen':
        gen(pathlib.Path(a[1]), a[2:])
    elif len(a) == 2 and a[0] == 'music':
        music(pathlib.Path(a[1]))
    elif len(a) == 4 and a[0] == 'edit':
        edit(pathlib.Path(a[1]), pathlib.Path(a[2]), pathlib.Path(a[3]))
    elif len(a) in (4, 5) and a[0] == 'mux':
        mux(pathlib.Path(a[1]), pathlib.Path(a[2]), pathlib.Path(a[3]), float(a[4]) if len(a) == 5 else 0.0)
    else:
        sys.exit(__doc__)
