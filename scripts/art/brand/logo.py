"""onchainTRAVIAN logo: coin (full + icon), wordmark, lockups.

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


# ---------------------------------------------------------------- emblem
INK = '#3d2507'


def leaf(x, y, ang, length, width):
    """Almond leaf with base at (x,y) pointing along ang (deg)."""
    L, W = length, width
    d = (f'M0 0 C{L * .25:.1f} {-W:.1f} {L * .75:.1f} {-W:.1f} {L:.1f} 0 '
         f'C{L * .75:.1f} {W:.1f} {L * .25:.1f} {W:.1f} 0 0Z')
    vein = f'M{L * .12:.1f} 0 L{L * .8:.1f} 0'
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.1f})">'
            f'<path d="{d}" fill="url(#leaf)"/>'
            f'<path d="{vein}" fill="none" stroke="#2f4d10" stroke-width="1.4" opacity=".55"/></g>')


def branch(side):
    """Laurel branch along a circle, from the bottom up one side. side=-1 left, +1 right."""
    R = 140
    a0, a1 = 100, 222  # degrees from +x, y down (90 = bottom); left side
    n = 11
    stem = []
    leaves = []
    for i in range(n + 1):
        t = i / n
        a = math.radians(a0 + (a1 - a0) * t)
        x, y = R * math.cos(a), R * math.sin(a)
        stem.append((x, y))
    # stem path
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in stem)
    for i in range(1, n + 1):
        t = i / n
        a = a0 + (a1 - a0) * t
        x, y = R * math.cos(math.radians(a)), R * math.sin(math.radians(a))
        tang = a + 90  # direction of travel (counter... increasing angle)
        size = 36 - 12 * t
        leaves.append(leaf(x, y, tang - 38, size, size * .4))  # outer
        leaves.append(leaf(x, y, tang + 38, size * .9, size * .36))  # inner
    tip_a = math.radians(a1 + 4)
    leaves.append(leaf(R * math.cos(math.radians(a1)), R * math.sin(math.radians(a1)),
                       a1 + 90, 22, 8))
    g = (f'<path d="{d}" fill="none" stroke="#3e5a14" stroke-width="5" stroke-linecap="round"/>'
         + ''.join(leaves))
    sx = 1 if side < 0 else -1
    return f'<g transform="scale({sx} 1)">{g}</g>'


def helmet():
    return f'''
<g stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  <!-- crest on its holder -->
  <path d="M-6 -84 L-4 -106 L18 -106 L18 -84 Z" fill="url(#band)"/>
  <path d="M-114 2 C-128 -100 -44 -160 40 -152 C94 -148 126 -114 138 -70
           L124 -62 C108 -86 74 -106 30 -106 C-30 -106 -74 -72 -84 -8 Z" fill="url(#crest)"/>
  <g fill="none" stroke="#6e130c" stroke-width="2.6" opacity=".75">
    <path d="M-104 -14 C-110 -96 -38 -140 40 -136 C86 -132 112 -104 124 -78"/>
    <path d="M-94 -20 C-96 -88 -34 -124 36 -122 C78 -120 102 -98 114 -80"/>
    <path d="M-110 -50 C-100 -108 -44 -140 -2 -142"/>
  </g>
  <path d="M-70 -116 C-30 -142 30 -146 76 -132" fill="none" stroke="#ffa486" stroke-width="3.5" opacity=".75"/>
  <!-- neck guard -->
  <path d="M-82 28 C-94 40 -106 52 -118 60 L-110 78 C-92 74 -74 66 -56 56 Z" fill="url(#steel)"/>
  <path d="M-106 64 C-94 60 -82 54 -72 46 M-102 72 C-88 68 -76 62 -64 54" fill="none" stroke-width="2.2" opacity=".7"/>
  <!-- lower skull + ear -->
  <path d="M-68 36 L30 24 C32 52 22 68 0 72 C-28 76 -54 66 -68 50 Z" fill="url(#steel)"/>
  <path d="M-34 44 C-34 32 -12 30 -10 44 C-10 56 -32 58 -34 44 Z" fill="#4e5866" stroke-width="3"/>
  <!-- dome -->
  <path d="M-84 32 C-96 -40 -46 -88 14 -88 C74 -88 106 -48 102 2 Z" fill="url(#steel)"/>
  <path d="M-58 -52 C-40 -72 -12 -78 12 -76" fill="none" stroke="#ffffff" stroke-width="6" opacity=".9"/>
  <path d="M-70 -10 C-72 -24 -68 -34 -62 -42" fill="none" stroke="#ffffff" stroke-width="3.5" opacity=".6"/>
  <!-- brow band + visor -->
  <path d="M-88 24 Q10 4 102 -4 L124 0 L120 14 L100 14 Q12 22 -82 42 Z" fill="url(#band)"/>
  <circle cx="-50" cy="28" r="3.4" fill="#fff4c4" stroke-width="2"/>
  <circle cx="10" cy="17" r="3.4" fill="#fff4c4" stroke-width="2"/>
  <circle cx="66" cy="9" r="3.4" fill="#fff4c4" stroke-width="2"/>
  <!-- cheek guard -->
  <path d="M26 22 C54 16 82 20 88 40 C94 66 84 96 62 110 C48 118 32 112 30 100
           C28 78 24 52 18 26 Z" fill="url(#steel)"/>
  <path d="M30 26 C54 22 76 26 82 40" fill="none" stroke="#c89a3a" stroke-width="5"/>
  <path d="M40 40 C56 36 70 40 72 54" fill="none" stroke="#ffffff" stroke-width="4" opacity=".85"/>
  <g fill="url(#band)" stroke-width="2"><circle cx="50" cy="66" r="5"/><circle cx="68" cy="62" r="5"/><circle cx="58" cy="84" r="5"/></g>
</g>'''


def chain():
    """Three links tying the wreath: flat - edge-on - flat."""
    def link(cx, w, h, sw):
        return (f'<rect x="{cx - w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{h / 2}" '
                f'fill="none" stroke="{INK}" stroke-width="{sw + 4}"/>'
                f'<rect x="{cx - w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{h / 2}" '
                f'fill="none" stroke="url(#link)" stroke-width="{sw}"/>')
    edge = (f'<rect x="-21" y="-5.5" width="42" height="11" rx="5.5" fill="url(#link)" '
            f'stroke="{INK}" stroke-width="2.6"/>')
    return (f'<g transform="translate(0 140)">{link(-34, 50, 30, 8)}{link(34, 50, 30, 8)}{edge}</g>')


def emblem():
    return (branch(-1) + branch(1) + chain()
            + f'<g transform="translate(6 -4)">{helmet()}</g>')


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


def beads(r, n, br):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        out.append(f'<circle cx="{256 + r * math.cos(a):.1f}" cy="{256 + r * math.sin(a):.1f}" r="{br}"/>')
    return f'<g fill="url(#rimIn)" stroke="{INK}" stroke-width="1.2">' + ''.join(out) + '</g>'


def engraved(svg_paths):
    """Struck lettering: light lip below, dark letter on top."""
    return (f'<g fill="#fff3c0" transform="translate(1.2 1.8)">{svg_paths}</g>'
            f'<g fill="{INK}">{svg_paths}</g>')


def coin(legend=True):
    parts = [DEFS,
             '<circle cx="256" cy="256" r="252" fill="#3d2507"/>',
             '<circle cx="256" cy="256" r="246" fill="url(#rim)"/>']
    if legend:
        parts += [
            '<circle cx="256" cy="256" r="234" fill="url(#rimIn)" stroke="#5a3a0c" stroke-width="2"/>',
            '<circle cx="256" cy="256" r="232" fill="none" stroke="#fff4c6" stroke-width="1.5" opacity=".6"/>',
            engraved(arc_text('ONCHAIN TRAVIAN', 38, 800, 198, 256, 256, top=True, track=3)),
            engraved(arc_text('MMXXVI', 30, 800, 222, 256, 256, top=False, track=6)),
        ]
        for a in (180 - 44, 44):  # stars between the legends
            x = 256 + 211 * math.cos(math.radians(a))
            y = 256 + 211 * math.sin(math.radians(a))
            parts.append(engraved(f'<path transform="translate({x:.1f} {y:.1f}) rotate({a - 90:.0f})" '
                                  f'd="M0 -9 L2.6 -2.6 9 0 2.6 2.6 0 9 -2.6 2.6 -9 0 -2.6 -2.6Z"/>'))
        parts += [beads(181, 64, 3.4),
                  '<circle cx="256" cy="256" r="172" fill="#5a3a0c"/>',
                  '<circle cx="256" cy="256" r="170" fill="url(#field)"/>',
                  f'<g transform="translate(256 266) scale(.84)">{emblem()}</g>']
    else:
        parts += [
            '<circle cx="256" cy="256" r="228" fill="#5a3a0c"/>',
            beads(218, 56, 4.2),
            '<circle cx="256" cy="256" r="208" fill="#5a3a0c"/>',
            '<circle cx="256" cy="256" r="205" fill="url(#field)"/>',
            f'<g transform="translate(256 266) scale(1.18)">{emblem()}</g>']
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">{"".join(parts)}</svg>'


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


def inner(svg):
    return svg[svg.index('>') + 1:svg.rindex('</svg>')]


def lockup():
    g, w, cap = wordmark_group(120)
    coinsz = 220
    gap = 36
    W = coinsz + gap + w + 40
    H = coinsz + 20
    ty = 10 + coinsz / 2 + cap / 2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">'
            f'<g transform="translate(10 10) scale({coinsz / 512})">{inner(coin(False))}</g>'
            f'<g transform="translate({10 + coinsz + gap} {ty:.1f})">{g}</g></svg>')


def stacked():
    g, w, cap = wordmark_group(96)
    coinsz = 340
    W = max(w, coinsz) + 60
    H = coinsz + 40 + cap + 50
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">'
            f'<g transform="translate({(W - coinsz) / 2:.1f} 10) scale({coinsz / 512})">{inner(coin(True))}</g>'
            f'<g transform="translate({(W - w) / 2:.1f} {coinsz + 40 + cap:.1f})">{g}</g></svg>')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    files = {
        'coin.svg': coin(True),
        'coin-icon.svg': coin(False),
        'wordmark.svg': wordmark(),
        'lockup.svg': lockup(),
        'stacked.svg': stacked(),
    }
    for name, svg in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(svg)
        print('wrote', name, len(svg))
