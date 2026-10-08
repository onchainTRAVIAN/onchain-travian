"""onchainTRAVIAN wordmark (the coin is kie.ai art: gen_logo.py + finish.py).

Run with the scraping venv (fontTools):  python scripts/art/brand/logo.py
Writes SVGs to branding/; text is converted to paths (no font needed to view).
Font: Cinzel (OFL, scripts/art/brand/OFL.txt).
"""
import math
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', '..', 'branding')

_fonts = {}


def font(weight):
    if weight not in _fonts:
        f = TTFont(os.path.join(HERE, 'Cinzel.ttf'))
        _fonts[weight] = instantiateVariableFont(f, {'wght': weight})
    return _fonts[weight]


def glyphs(text, weight):
    """[(path_d in font units, advance)] for each char."""
    f = font(weight)
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    out = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(pen)
        out.append((pen.getCommands(), gs[name].width))
    return out


def upem(weight):
    return font(weight)['head'].unitsPerEm


def text_paths(text, size, weight, track=0.0):
    """Straight text from (0, baseline 0). Returns (svg, width)."""
    s = size / upem(weight)
    x = 0.0
    parts = []
    for d, adv in glyphs(text, weight):
        if d:
            parts.append(f'<path transform="translate({x:.2f} 0) scale({s:.5f} {-s:.5f})" d="{d}"/>')
        x += adv * s + track
    return ''.join(parts), x - track


def arc_text(text, size, weight, r, cx, cy, top=True, track=0.0):
    s = size / upem(weight)
    gl = glyphs(text, weight)
    widths = [adv * s for _, adv in gl]
    total = sum(widths) + track * (len(gl) - 1)
    parts = []
    pos = 0.0
    for (d, adv), w in zip(gl, widths):
        mid = pos + w / 2 - total / 2
        if top:
            th = -90 + math.degrees(mid / r)
            rot = th + 90
        else:
            th = 90 - math.degrees(mid / r)
            rot = th - 90
        x = cx + r * math.cos(math.radians(th))
        y = cy + r * math.sin(math.radians(th))
        if d:
            parts.append(
                f'<path transform="translate({x:.2f} {y:.2f}) rotate({rot:.2f}) '
                f'translate({-w / 2:.2f} 0) scale({s:.5f} {-s:.5f})" d="{d}"/>')
        pos += w + track
    return ''.join(parts)


INK = '#3d2507'

DEFS = '''
<defs>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff3bd"/><stop offset=".3" stop-color="#f0c45a"/>
    <stop offset=".65" stop-color="#b9801f"/><stop offset="1" stop-color="#6a430f"/>
  </linearGradient>
  <linearGradient id="rimIn" x1="1" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#fff0b0"/><stop offset=".4" stop-color="#e3ad43"/>
    <stop offset="1" stop-color="#9a6618"/>
  </linearGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f7d675"/><stop offset=".55" stop-color="#d79c33"/>
    <stop offset="1" stop-color="#a66d18"/>
  </linearGradient>
  <radialGradient id="field" cx=".4" cy=".34" r=".75">
    <stop offset="0" stop-color="#fff0b4"/><stop offset=".45" stop-color="#eebd52"/>
    <stop offset="1" stop-color="#b57a1e"/>
  </radialGradient>
  <linearGradient id="steel" x1="0" y1="0" x2=".6" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d5dbe2"/>
    <stop offset=".75" stop-color="#8c97a5"/><stop offset="1" stop-color="#55606e"/>
  </linearGradient>
  <linearGradient id="crest" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e2452c"/><stop offset=".6" stop-color="#b3241a"/>
    <stop offset="1" stop-color="#7c140e"/>
  </linearGradient>
  <linearGradient id="leaf" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0" stop-color="#a6d54a"/><stop offset=".5" stop-color="#6aa328"/>
    <stop offset="1" stop-color="#3f6c16"/>
  </linearGradient>
  <linearGradient id="link" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fbfbf6"/><stop offset=".5" stop-color="#b8bec6"/>
    <stop offset="1" stop-color="#6b7480"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff4c2"/><stop offset=".45" stop-color="#f2c656"/>
    <stop offset=".55" stop-color="#d9a034"/><stop offset="1" stop-color="#9c6615"/>
  </linearGradient>
  <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c8f27a"/><stop offset=".5" stop-color="#71d000"/>
    <stop offset="1" stop-color="#3f7a06"/>
  </linearGradient>
  <filter id="drop" x="-10%" y="-10%" width="120%" height="125%">
    <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".35"/>
  </filter>
</defs>'''


def wordmark_group(size=120):
    """'onchain' (small caps, green) + 'TRAVIAN' (gold). Returns (svg, width, cap)."""
    a, wa = text_paths('onchain', size, 700, track=size * .02)
    b, wb = text_paths('TRAVIAN', size, 900, track=size * .04)
    gap = size * .12
    sw = size * .07
    def styled(p, fill):
        return (f'<g fill="none" stroke="{INK}" stroke-width="{sw * 1.5:.1f}" stroke-linejoin="round">{p}</g>'
                f'<g fill="{fill}" stroke="{INK}" stroke-width="{sw * .35:.1f}">{p}</g>')
    g = (f'<g filter="url(#drop)">{styled(a, "url(#green)")}'
         f'<g transform="translate({wa + gap:.1f} 0)">{styled(b, "url(#gold)")}</g></g>')
    return g, wa + gap + wb, size * .72


def wordmark():
    g, w, cap = wordmark_group(120)
    pad = 20
    W, H = w + pad * 2, cap + pad * 2 + 20
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">'
            f'{DEFS}<g transform="translate({pad} {pad + cap + 4:.1f})">{g}</g></svg>')


def wordmark_2line():
    """Header version: small 'onchain' over big 'TRAVIAN' (left aligned)."""
    def line(text, size, weight, fill, track):
        p, w = text_paths(text, size, weight, track=size * track)
        sw = size * .07
        return (f'<g fill="none" stroke="{INK}" stroke-width="{sw * 1.5:.1f}" stroke-linejoin="round">{p}</g>'
                f'<g fill="{fill}" stroke="{INK}" stroke-width="{sw * .35:.1f}">{p}</g>'), w
    a, wa = line('onchain', 84, 700, 'url(#green)', .06)
    b, wb = line('TRAVIAN', 120, 900, 'url(#gold)', .04)
    pad = 14
    W, H = max(wa, wb) + pad * 2, 84 * .72 + 120 * .72 + 24 + pad * 2 + 8
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">'
            f'{DEFS}<g filter="url(#drop)"><g transform="translate({pad + 4} {pad + 84 * .72:.1f})">{a}</g>'
            f'<g transform="translate({pad} {pad + 84 * .72 + 24 + 120 * .72:.1f})">{b}</g></g></svg>')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    files = {'wordmark.svg': wordmark(), 'wordmark-2line.svg': wordmark_2line()}
    for name, svg in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(svg)
        print('wrote', name, len(svg))
