#!/usr/bin/env python3
"""Painterly building art, set A (Ancient Realms). ORIGINAL art.

Writes src/web/public/img/buildings/<id>.svg (levels 1-4) and <id>-2..5.svg (5-9, 10-14, 15-19, 20) for
main, rally, warehouse, granary, greatwarehouse, greatgranary, cranny, embassy, market, tradeoffice.

Style: warm daylight from the top-left, soft blurred cast shadow to the bottom-right, every surface a
gradient plus texture strokes, painted dark-brown outline. Oblique projection: depth runs up-right
(CX, -CY) per unit, so the front face is lit and the right side is in shade.
Canvas: 75x100 (rally point: 69x120), ground ellipse kept where the old art had it.

Usage: python3 scripts/art/painterly/buildings_a.py
"""
import math
import pathlib
import random

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / 'src/web/public/img/buildings'
CX, CY = 0.78, 0.53
INK = '#3b2a17'


# ---------------------------------------------------------------- numbers & colours
def n(v):
    v = round(v, 1)
    if v == 0:
        return '0'
    s = f'{v:.1f}'.rstrip('0').rstrip('.')
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return s


def xy(x, y):
    """Compact 'x,y' for path data (a minus sign doubles as the separator)."""
    sy = n(y)
    return f'{n(x)}{"" if sy.startswith("-") else ","}{sy}'


def P(pts):
    return ' '.join(f'{n(x)},{n(y)}' for x, y in pts)


def _rgb(c):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def mix(a, b, t):
    A, B = _rgb(a), _rgb(b)
    return '#' + ''.join(f'{round(A[i] + (B[i] - A[i]) * t):02x}' for i in range(3))


def dk(c, t=.2):
    return mix(c, '#1c1208', t)


def lt(c, t=.2):
    return mix(c, '#fff7e2', t)


# material: lit top, lit bottom, shade top, shade bottom, line colour
MAT = {
    'plaster': ('#f4e8cb', '#dcc9a0', '#c9b18a', '#a68e66', '#9a8058'),
    'wood': ('#d4a26a', '#a87846', '#986c40', '#72502c', '#5e3e20'),
    'darkwood': ('#8f6239', '#6a4426', '#5f3f23', '#45301a', '#3a2614'),
    'stone': ('#ddd4bf', '#b0a68f', '#a89e88', '#827865', '#6e6555'),
    'gstone': ('#e6dcc4', '#bfb399', '#b3a68b', '#8a7e66', '#7a6e58'),
    'thatch': ('#ead08a', '#c79e55', '#b88e4a', '#8d6a33', '#7a5826'),
    'shingle': ('#b8865a', '#8c603c', '#7e5834', '#5c3e22', '#462e18'),
    'tile': ('#d27654', '#a64f35', '#99503a', '#6f3324', '#6a2a1a'),
    'slate': ('#9ca3ab', '#737b87', '#6f7581', '#4f5562', '#3f4550'),
    'cloth': ('#f6eedb', '#ddd0ad', '#cbbb96', '#a69472', '#a0906c'),
    'gold': ('#f8e092', '#cc9c3c', '#c49438', '#946a22', '#8a6420'),
    'grass': ('#b4d27a', '#88ae4e', '#7fa348', '#5c7e34', '#4f7428'),
    'iron': ('#8a8886', '#5c5a58', '#5a5856', '#3c3a38', '#2c2a28'),
}

FLAGS = {'red': '#b8402e', 'gold': '#e2b040', 'blue': '#4e6f9e', 'green': '#5d8a48',
         'purple': '#7d5b8c', 'white': '#efe8d6', 'teal': '#3f8a86', 'orange': '#d07a34'}


class Plane:
    """A painted surface: screen point = O + u*A + v*B."""

    def __init__(self, O, A, B):
        self.O, self.A, self.B = O, A, B

    def m(self, u, v):
        O, A, B = self.O, self.A, self.B
        return (O[0] + u * A[0] + v * B[0], O[1] + u * A[1] + v * B[1])

    def inv(self, p):
        O, A, B = self.O, self.A, self.B
        det = A[0] * B[1] - A[1] * B[0]
        dx, dy = p[0] - O[0], p[1] - O[1]
        return ((dx * B[1] - dy * B[0]) / det, (A[0] * dy - A[1] * dx) / det)


def pt(x, y, z=0, up=0):
    """Screen point of world offset: z = depth (up-right), up = height."""
    return (x + CX * z, y - CY * z - up)


def unit(v):
    L = math.hypot(*v)
    return (v[0] / L, v[1] / L)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


# ---------------------------------------------------------------- textures (local coords)
DENS = [1.0]   # texture density; lowered automatically when a file would exceed the size budget


def T_planks_v(r, bb, c, sp=2.0):
    sp /= DENS[0] ** .5
    u0, v0, u1, v1 = bb
    dark, light = [], []
    u = u0 + sp * r.uniform(.4, .9)
    while u < u1:
        j = r.uniform(-.12, .12)
        dark.append(((u + j, v0), (u + j, v1)))
        light.append(((u + j + .45, v0), (u + j + .45, v1)))
        if r.random() < .3:
            vv = r.uniform(v0 + 1, v1 - 1)
            dark.append(((u + j, vv), (u + j + sp, vv)))
        u += sp * r.uniform(.85, 1.15)
    tone = [((u + sp / 2, v0), (u + sp / 2, v1)) for u in [d[0][0] for d in dark if d[0][1] == v0] if r.random() < .4]
    return [(tone, c[4], sp * .75, .12), (dark, c[4], .4, .6), (light, lt(c[0], .35), .35, .35)]


def T_planks_h(r, bb, c, sp=1.9):
    sp /= DENS[0] ** .5
    u0, v0, u1, v1 = bb
    dark, light = [], []
    v = v0 + sp * r.uniform(.4, .9)
    while v < v1:
        dark.append(((u0, v), (u1, v)))
        light.append(((u0, v + .45), (u1, v + .45)))
        if r.random() < .5:
            uu = r.uniform(u0, u1)
            dark.append(((uu, v), (uu, v + sp)))
        v += sp * r.uniform(.9, 1.1)
    tone = [((u0, v + sp / 2), (u1, v + sp / 2)) for v in [d[0][1] for d in dark if d[0][0] == u0] if r.random() < .4]
    return [(tone, c[4], sp * .75, .12), (dark, c[4], .4, .6), (light, lt(c[0], .35), .35, .35)]


def T_stone(r, bb, c, ch=2.3, bw=3.8):
    bw /= DENS[0]
    u0, v0, u1, v1 = bb
    dark, light = [], []
    v, k = v0 + ch, 0
    while v < v1 + ch:
        dark.append(((u0, v), (u1, v)))
        light.append(((u0, v + .4), (u1, v + .4)))
        u = u0 + (k % 2) * bw * .5 + r.uniform(0, .8)
        while u < u1:
            dark.append(((u, v - ch), (u, v)))
            u += bw * r.uniform(.75, 1.25)
        v += ch
        k += 1
    pd, pl = [], []
    for _ in range(int((u1 - u0) * (v1 - v0) * .03 * DENS[0])):
        u, v = r.uniform(u0, u1), v0 + ch * (int(r.uniform(0, (v1 - v0) / ch)) + .5)
        (pd if r.random() < .5 else pl).append(((u, v), (u + bw * .5, v)))
    return [(pd, c[4], ch * .7, .14), (pl, '#fffaf0', ch * .7, .2), (dark, c[4], .35, .55), (light, lt(c[0], .4), .3, .45)]


def T_thatch(r, bb, c, dens=.32):
    u0, v0, u1, v1 = bb
    dark, light = [], []
    cnt = int((u1 - u0) * (v1 - v0) * dens * DENS[0])
    for _ in range(cnt):
        u, v = r.uniform(u0, u1), r.uniform(v0, v1)
        L = r.uniform(1.4, 2.8)
        (dark if r.random() < .62 else light).append(((u, v), (u + r.uniform(-.35, .35), v + L)))
    layers = []
    v = v0 + 3.2
    while v < v1:
        layers.append(((u0, v), (u1, v + r.uniform(-.2, .2))))
        v += 3.2
    return [(dark, c[4], .35, .55), (light, lt(c[0], .45), .35, .6), (layers, c[4], .45, .35)]


def T_tiles(r, bb, c, rh=2.0, tw=2.0):
    tw /= DENS[0]
    u0, v0, u1, v1 = bb
    dark, light = [], []
    v, k = v0 + rh, 0
    while v < v1 + rh:
        dark.append(((u0, v), (u1, v)))
        light.append(((u0, v - .55), (u1, v - .55)))
        u = u0 + (k % 2) * tw * .5
        while u < u1:
            dark.append(((u, v - rh), (u, v - .1)))
            u += tw
        v += rh
        k += 1
    pd = []
    for _ in range(int((u1 - u0) * (v1 - v0) * .035 * DENS[0])):
        u, v = r.uniform(u0, u1), v0 + rh * (int(r.uniform(0, (v1 - v0) / rh)) + .5)
        pd.append(((u, v), (u + tw * .4, v)))
    return [(pd, lt(c[0], .3), rh * .6, .25), (dark, c[4], .35, .55), (light, lt(c[0], .3), .45, .45)]


def T_shingle(r, bb, c):
    u0, v0, u1, v1 = bb
    dark, light = [], []
    v, k = v0 + 1.8, 0
    while v < v1 + 1.8:
        dark.append(((u0, v), (u1, v)))
        light.append(((u0, v - .5), (u1, v - .5)))
        u = u0 + (k % 2) * 1.3 + r.uniform(0, .6)
        while u < u1:
            dark.append(((u, v - 1.8), (u + r.uniform(-.15, .15), v)))
            u += r.uniform(2.0, 3.2) / DENS[0]
        v += 1.8
        k += 1
    return [(dark, c[4], .35, .6), (light, lt(c[0], .3), .4, .4)]


def T_plaster(r, bb, c):
    u0, v0, u1, v1 = bb
    segs = []
    for _ in range(int((u1 - u0) * (v1 - v0) * .025) + 1):
        u, v = r.uniform(u0, u1), r.uniform(v0, v1)
        segs.append(((u, v), (u + r.uniform(-1.2, 1.2), v + r.uniform(-.4, .4))))
    return [(segs, c[4], .35, .3)]


def T_grass(r, bb, c, dens=.12):
    u0, v0, u1, v1 = bb
    dark, light = [], []
    for _ in range(int((u1 - u0) * (v1 - v0) * dens)):
        u, v = r.uniform(u0, u1), r.uniform(v0, v1)
        (dark if r.random() < .55 else light).append(((u, v), (u + r.uniform(-.4, .4), v - r.uniform(1, 1.8))))
    return [(dark, c[4], .4, .5), (light, lt(c[0], .4), .35, .6)]


TEX = {'planks_v': T_planks_v, 'planks_h': T_planks_h, 'stone': T_stone, 'thatch': T_thatch,
       'tiles': T_tiles, 'shingle': T_shingle, 'plaster': T_plaster, 'grass': T_grass}
ROOF_TEX = {'thatch': 'thatch', 'shingle': 'shingle', 'tile': 'tiles', 'slate': 'tiles', 'cloth': None,
            'gold': None}


# ---------------------------------------------------------------- the canvas
class Art:
    def __init__(self, prefix, W=75, H=100):
        self.p, self.W, self.H = prefix, W, H
        self.defs, self.body, self.k, self.cache = [], [], 0, {}
        self.r = random.Random(prefix)
        self.k_scale, self.mark, self.origin = 1.0, 0, (37, 87)

    def zoom(self, k, origin=None):
        """Everything drawn after this call is scaled by k about the ground centre (ground stays put)."""
        self.k_scale, self.mark = k, len(self.body)
        if origin:
            self.origin = origin
        ox, oy = self.origin
        self.ymax = oy + (self.H - 2.6 - oy) / k
        self.xmin, self.xmax = ox - (ox - 1.5) / k, ox + (self.W - 1.5 - ox) / k

    def cl(self, y):
        """Keep props standing in front of a building inside the canvas."""
        return min(y, getattr(self, 'ymax', self.H - 2.6))

    def eave_shadow(self, x, y, w, d, front=True):
        """Soft shadow the roof overhang casts on the wall tops (drawn before the roof)."""
        b = self.blur(.7)
        if front:
            self.add(f'<polygon points="{P([(x, y - .5), (x + w, y - .5), (x + w, y + 2), (x, y + 2.6)])}" fill="#2a1a0a" '
                     f'stroke="none" opacity=".33" filter="{b}"/>')
        self.add(f'<polygon points="{P([pt(x + w, y, 0, .5), pt(x + w, y, d, .5), pt(x + w, y, d, -2.4), pt(x + w, y, 0, -2.4)])}" '
                 f'fill="#1c1006" stroke="none" opacity=".3" filter="{b}"/>')

    def nid(self):
        self.k += 1
        return f'{self.p}{self.k}'

    def _stops(self, stops):
        out = ''
        for s in stops:
            op = f' stop-opacity="{s[2]}"' if len(s) > 2 else ''
            out += f'<stop offset="{s[0]}" stop-color="{s[1]}"{op}/>'
        return out

    def lin(self, stops, p1=(0, 0), p2=(0, 1), bb=False):
        key = ('l', tuple(stops), tuple(map(n, p1)), tuple(map(n, p2)), bb)
        if key in self.cache:
            return self.cache[key]
        i = self.nid()
        units = '' if bb else ' gradientUnits="userSpaceOnUse"'
        self.defs.append(f'<linearGradient id="{i}"{units} x1="{n(p1[0])}" y1="{n(p1[1])}" x2="{n(p2[0])}" '
                         f'y2="{n(p2[1])}">{self._stops(stops)}</linearGradient>')
        self.cache[key] = f'url(#{i})'
        return self.cache[key]

    def rad(self, stops, cx=.4, cy=.35, r=.7):
        key = ('r', tuple(stops), cx, cy, r)
        if key in self.cache:
            return self.cache[key]
        i = self.nid()
        self.defs.append(f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">{self._stops(stops)}</radialGradient>')
        self.cache[key] = f'url(#{i})'
        return self.cache[key]

    def blur(self, sd=1.5):
        key = ('b', sd)
        if key not in self.cache:
            i = self.nid()
            self.defs.append(f'<filter id="{i}" x="-30%" y="-30%" width="160%" height="160%">'
                             f'<feGaussianBlur stdDeviation="{sd}"/></filter>')
            self.cache[key] = f'url(#{i})'
        return self.cache[key]

    def clip(self, pts):
        i = self.nid()
        self.defs.append(f'<clipPath id="{i}"><polygon points="{P(pts)}"/></clipPath>')
        return i

    def add(self, *els):
        self.body.extend(els)

    def svg(self):
        body = self.body
        if self.k_scale != 1.0:
            ox, oy = self.origin
            body = (body[:self.mark] + [f'<g transform="translate({ox} {oy}) scale({self.k_scale}) translate({-ox} {-oy})">']
                    + body[self.mark:] + ['</g>'])
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.W} {self.H}">'
                f'<defs>{"".join(self.defs)}</defs>'
                f'<g stroke="{INK}" stroke-opacity=".7" stroke-width=".9" stroke-linejoin="round" '
                f'stroke-linecap="round">{"".join(body)}</g></svg>')

    # ------------------------------------------------------------ primitives
    def segpath(self, segs, color, w, op, plane=None):
        if not segs:
            return ''
        d = []
        for a, b in segs:
            if plane:
                a, b = plane.m(*a), plane.m(*b)
            d.append(f'M{xy(a[0], a[1])}l{xy(b[0] - a[0], b[1] - a[1])}')
        return (f'<path d="{"".join(d)}" fill="none" stroke="{color}" stroke-width="{n(w) if w >= .1 else w}" '
                f'stroke-opacity="{op}"/>')

    def face(self, plane, poly, mat, part='F', tex=None, edge=True, ao=True, colors=None):
        loc = [plane.inv(p) for p in poly]
        us, vs = [u for u, _ in loc], [v for _, v in loc]
        u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
        c = MAT[mat] if colors is None else colors
        if part == 'F':
            top, bot = c[0], c[1]
        elif part == 'S':
            top, bot = c[2], c[3]
        elif part == 'M':
            top, bot = mix(c[0], c[2], .5), mix(c[1], c[3], .5)
        else:  # 'T' lit top surface
            top, bot = lt(c[0], .15), c[0]
        stops = [(0, top), (.8, bot), (1, dk(bot, .22))] if ao else [(0, top), (1, bot)]
        g = self.lin(stops, bb=True)
        out = [f'<polygon points="{P(poly)}" fill="{g}"{"" if edge else " stroke=\"none\""}/>']
        if tex:
            name, *args = tex if isinstance(tex, tuple) else (tex,)
            layers = TEX[name](self.r, (u0, v0, u1, v1), c, *args)
            cid = self.clip(poly)
            out.append(f'<g clip-path="url(#{cid})">')
            for segs, col, w, op in layers:
                out.append(self.segpath(segs, col, w, op, plane))
            out.append('</g>')
        self.add(*out)

    def poly(self, pts, fill, extra=''):
        self.add(f'<polygon points="{P(pts)}" fill="{fill}"{extra}/>')

    def line(self, pts, color, w=.9, op=1, extra=''):
        self.add(f'<polyline points="{P(pts)}" fill="none" stroke="{color}" stroke-width="{n(w)}" '
                 f'stroke-opacity="{op}"{extra}/>')

    # ------------------------------------------------------------ ground & light
    def ground(self, rx, ry, cx=37, cy=87, dirt=0, pave=0):
        self.add(f'<ellipse cx="{cx}" cy="{n(cy + .4)}" rx="{n(rx + .6)}" ry="{n(ry + .8)}" fill="#b9d08a" '
                 f'stroke="none" opacity=".5" filter="{self.blur(.6)}"/>')
        g = self.rad([(0, '#dbe9b3'), (.65, '#c8dc9a'), (1, '#b3cb82')], .42, .4, .62)
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx - .4}" ry="{ry - .6}" fill="{g}" stroke="none" opacity=".9"/>')
        if dirt:
            g = self.rad([(0, '#d8c393', .95), (.6, '#cdb582', .7), (1, '#c4ad7a', 0)], .5, .5, .5)
            self.add(f'<ellipse cx="{n(cx - 1)}" cy="{n(cy + ry * .38)}" rx="{n(rx * dirt)}" ry="{n(ry * .5 * dirt + 1)}" '
                     f'fill="{g}" stroke="none"/>')
        r = self.r
        tufts = []
        for _ in range(9):
            a = r.uniform(0, math.pi * 2)
            x, y = cx + math.cos(a) * rx * r.uniform(.75, .95), cy + math.sin(a) * ry * r.uniform(.6, .9)
            tufts.append(f'M{n(x)},{n(y)}l.5,-1.5l.4,1.4l.6,-1.7l.5,1.7')
        self.add(f'<path d="{"".join(tufts)}" fill="none" stroke="#7f9e4c" stroke-width=".45" stroke-opacity=".9"/>')
        stage = int(self.p.rstrip('-')[-1])
        self.zoom(ZOOM.get(self.p.rstrip('-0123456789'), 1.0) * (1.08, 1.06, 1.04, 1.0, 1.0)[stage - 1], (cx, cy))

    def shadow(self, cx, cy, rx, ry, op=.3):
        hi = getattr(self, 'xmax', self.W - 1.5) - 3
        if cx + rx > hi:  # keep the blurred shadow off the canvas edge
            over = cx + rx - hi
            cx, rx = cx - over / 2, rx - over / 2
        self.add(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="#1f2a0c" stroke="none" '
                 f'opacity="{op}" filter="{self.blur(1.6)}"/>')

    def bshadow(self, x, y, w, d, up=0, op=.3):
        """Soft cast shadow for a box footprint, pushed to the bottom-right."""
        c = pt(x + w / 2, y, d / 2)
        self.shadow(c[0] + 3 + up * .12, c[1] + 1.2, (w + CX * d) / 2 + 2.5 + up * .08, CY * d / 2 + 2.6, op)

    def smoke(self, x, y, k=3):
        b = self.blur(.9)
        for i in range(k):
            self.add(f'<circle cx="{n(x + i * 1.6)}" cy="{n(y - i * 3.2)}" r="{n(1.4 + i * .6)}" fill="#e8e4dc" '
                     f'stroke="none" opacity="{n(.55 - i * .12)}" filter="{b}"/>')

    # ------------------------------------------------------------ volumes
    def box(self, x, y, w, h, d, mat, ftex=None, stex=None, top=False, ttex=None, side=True, front=True,
            smat=None, tmat=None):
        """(x, y) = front-left bottom corner on screen."""
        fp = Plane((x, y - h), (1, 0), (0, 1))
        sp = Plane((x + w, y - h), (CX, -CY), (0, 1))
        if side and d > 0:
            self.face(sp, [pt(x + w, y, 0, h), pt(x + w, y, d, h), pt(x + w, y, d), (x + w, y)], smat or mat, 'S',
                      stex if stex is not None else ftex)
        if top and d > 0:
            tp = Plane((x, y - h), (1, 0), (CX, -CY))
            self.face(tp, [(x, y - h), (x + w, y - h), pt(x + w, y, d, h), pt(x, y, d, h)], tmat or mat, 'T', ttex,
                      ao=False)
        if front:
            self.face(fp, [(x, y - h), (x + w, y - h), (x + w, y), (x, y)], mat, 'F', ftex)
        return fp, sp

    def roof_x(self, x, y, w, d, rh, mat, o=1.4, gmat='wood', gtex='planks_v', trim=None, hip=False):
        """Gable roof, ridge parallel to the front. (x, y) = front-left wall top."""
        k = rh / (d / 2)
        oz = o * .8
        R0, R1 = pt(x - o, y, d / 2, rh), pt(x + w + o, y, d / 2, rh)
        F0, F1 = pt(x - o, y, -oz, -oz * k), pt(x + w + o, y, -oz, -oz * k)
        B0, B1 = pt(x - o, y, d + oz, -oz * k), pt(x + w + o, y, d + oz, -oz * k)
        c = MAT[mat]
        self.eave_shadow(x, y, w, d)
        tex = ROOF_TEX.get(mat)
        if hip:
            Rh0, Rh1 = pt(x + d / 2, y, d / 2, rh), pt(x + w - d / 2, y, d / 2, rh)
            self.poly([Rh0, Rh1, B1, B0], dk(c[3], .1))
            sp = Plane(Rh1, unit((CX, -CY)), unit(sub(pt(x + w + o, y, d / 2, -oz * k), Rh1)))
            self.face(sp, [F1, B1, Rh1], mat, 'S', tex)
            fp = Plane(Rh0, (1, 0), unit(sub(pt(x, y, -oz, -oz * k), pt(x, y, d / 2, rh))))
            self.face(fp, [Rh0, Rh1, F1, F0], mat, 'F', tex)
            R0, R1 = Rh0, Rh1
        else:
            self.poly([R0, R1, B1, B0], dk(c[3], .1))
            gp = Plane((x + w, y), (CX, -CY), (0, -1))
            self.face(gp, [(x + w, y), pt(x + w, y, d), pt(x + w, y, d / 2, rh)], gmat, 'S', gtex)
            self.line([R1, B1], dk(c[3], .25), 1.6, 1)
            fp = Plane(R0, (1, 0), unit(sub(F0, R0)))
            self.face(fp, [R0, R1, F1, F0], mat, 'F', tex)
            self.line([R1, F1], lt(c[1], .1), 1.1, 1)
        if mat == 'thatch':
            self.line([F0, F1], c[4], 1.5, .85)
            self.line([(F0[0], F0[1] - .7), (F1[0], F1[1] - .7)], lt(c[0], .3), .5, .7)
            self.line([R0, R1], dk(c[1], .15), 2.2, 1)
            self.line([(R0[0], R0[1] - .5), (R1[0], R1[1] - .5)], lt(c[0], .3), .7, .9)
        else:
            self.line([R0, R1], trim or dk(c[1], .25), 1.3, 1)
            self.line([(R0[0], R0[1] - .4), (R1[0], R1[1] - .4)], lt(trim or c[0], .4), .4, .9)
            if trim:
                self.line([F0, F1], trim, .7, 1)
        return dict(R0=R0, R1=R1, F0=F0, F1=F1, rh=rh)

    def roof_z(self, x, y, w, d, rh, mat, o=1.3, gmat='wood', gtex='planks_v', trim=None, gable=True, back=True):
        """Gable roof, ridge running front-to-back (gable faces the viewer). (x, y) = front-left wall top."""
        k = rh / (w / 2)
        oz = o * .9
        Af, Ab = pt(x + w / 2, y, -oz, rh), pt(x + w / 2, y, d + oz, rh)
        Lf, Lb = pt(x - o, y, -oz, -o * k), pt(x - o, y, d + oz, -o * k)
        Rf, Rb = pt(x + w + o, y, -oz, -o * k), pt(x + w + o, y, d + oz, -o * k)
        c = MAT[mat]
        tex = ROOF_TEX.get(mat)
        Dn = unit((CX, -CY))
        if gable:
            self.eave_shadow(x, y, w, d, front=False)
        if back:
            lp = Plane(Af, Dn, unit(sub(Lf, Af)))
            self.face(lp, [Af, Ab, Lb, Lf], mat, 'F', tex)
        rp = Plane(Af, Dn, unit(sub(Rf, Af)))
        self.face(rp, [Af, Ab, Rb, Rf], mat, 'M', tex)
        if gable:
            gp = Plane((x, y - rh), (1, 0), (0, 1))
            self.face(gp, [(x, y), (x + w, y), (x + w / 2, y - rh)], gmat, 'F', gtex)
        # front verge (thickness), drawn over the gable
        vb = lt(c[0], .1) if mat != 'thatch' else c[1]
        self.line([Lf, Af, Rf], dk(c[3], .1), 2.2, 1)
        self.line([Lf, Af, Rf], trim or vb, 1.1, 1)
        self.line([Af, Ab], trim or dk(c[1], .2), 1.1, 1)
        return dict(Af=Af, Ab=Ab, Lf=Lf, Rf=Rf, Rb=Rb, apex=(x + w / 2, y - rh))

    def roof_hip(self, x, y, w, d, rh, mat, o=1.2, trim=None, finial=None):
        """Hipped / pyramid roof. (x, y) = front-left wall top."""
        a = min(w, d) / 2
        drop = o * rh / max(a, .1) * .6
        FL, FR = pt(x - o, y, -o, -drop), pt(x + w + o, y, -o, -drop)
        BL, BR = pt(x - o, y, d + o, -drop), pt(x + w + o, y, d + o, -drop)
        RL, RR = pt(x + a, y, d / 2, rh), pt(x + w - a, y, d / 2, rh)
        c = MAT[mat]
        tex = ROOF_TEX.get(mat)
        self.eave_shadow(x, y, w, d)
        self.poly([BL, BR, RR, RL], dk(c[3], .1))
        rp = Plane(RR, unit((CX, -CY)), unit(sub(pt(x + w + o, y, d / 2, -drop), RR)))
        self.face(rp, [FR, BR, RR], mat, 'S', tex)
        fp = Plane(RL, (1, 0), unit(sub(pt(x + w / 2, y, -o, -drop), pt(x + w / 2, y, d / 2, rh))))
        self.face(fp, [FL, FR, RR, RL], mat, 'F', tex)
        self.line([FR, RR], trim or dk(c[3], .1), .9 if trim else 1.1, 1)
        if trim:
            self.line([FL, FR], trim, .6, 1)
        if RL != RR:
            self.line([RL, RR], trim or dk(c[1], .25), 1.2, 1)
        if finial:
            self.finial(RR[0] if RL == RR else (RL[0] + RR[0]) / 2, RR[1], finial)
        return dict(top=RR, FL=FL, FR=FR)

    def finial(self, x, y, h=3, col='gold'):
        c = MAT[col]
        self.line([(x, y), (x, y - h)], dk(c[1], .2), .7, 1)
        g = self.rad([(0, '#fff6d0'), (.5, c[0]), (1, c[1])], .35, .3, .7)
        self.add(f'<circle cx="{n(x)}" cy="{n(y - h)}" r=".9" fill="{g}" stroke-width=".5"/>')

    def cylinder(self, cx, y, r, h, mat, tex='staves', e=.36):
        c = MAT[mat]
        ry = r * e
        g = self.lin([(0, c[1]), (.28, c[0]), (.7, c[2]), (1, dk(c[3], .15))], (cx - r, 0), (cx + r, 0))
        d = (f'M{n(cx - r)},{n(y - h)}V{n(y)}A{n(r)},{n(ry)} 0 0 0 {n(cx + r)},{n(y)}V{n(y - h)}'
             f'A{n(r)},{n(ry)} 0 0 1 {n(cx - r)},{n(y - h)}Z')
        cid = self.nid()
        self.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
        out = [f'<path d="{d}" fill="{g}" stroke="none"/>', f'<g clip-path="url(#{cid})" fill="none">']
        dark, light = [], []
        if tex == 'staves':
            for i in range(1, 12):
                th = math.pi * i / 12
                xx = cx - r * math.cos(th)
                dark.append(((xx, y - h), (xx, y + ry * math.sin(th))))
                light.append(((xx + .35, y - h), (xx + .35, y + ry * math.sin(th))))
            arcs = [y - h * f for f in (.2, .75)] if h > 4 else [y - h * .5]
            hoop = ''.join(f'M{n(cx - r)},{n(yy)}A{n(r)},{n(ry)} 0 0 0 {n(cx + r)},{n(yy)}' for yy in arcs)
            out.append(f'<path d="{hoop}" stroke="#3c3632" stroke-width=".6" stroke-opacity=".8"/>')
        else:  # stone courses
            yy = y - 2.2
            while yy > y - h:
                out.append(f'<path d="M{n(cx - r)},{n(yy)}A{n(r)},{n(ry)} 0 0 0 {n(cx + r)},{n(yy)}" '
                           f'stroke="{c[4]}" stroke-width=".35" stroke-opacity=".55"/>')
                for i in range(1, 7):
                    th = math.pi * (i + (.5 if int(yy) % 2 else 0)) / 7
                    xx = cx - r * math.cos(th)
                    dark.append(((xx, yy + ry * math.sin(th)), (xx, yy + ry * math.sin(th) - 2.2)))
                yy -= 2.2
        out.append(self.segpath(dark, c[4], .35, .5))
        out.append(self.segpath(light, lt(c[0], .3), .3, .35))
        out.append('</g>')
        out.append(f'<path d="{d}" fill="none"/>')
        self.add(*out)

    def cone(self, cx, y, r, rh, mat, o=1.2, trim=None, finial=None, e=.36):
        c = MAT[mat]
        R = r + o
        ry = R * e
        g = self.lin([(0, c[1]), (.3, c[0]), (.68, c[2]), (1, dk(c[3], .2))], (cx - R, 0), (cx + R, 0))
        d = f'M{n(cx - R)},{n(y)}L{n(cx)},{n(y - rh)}L{n(cx + R)},{n(y)}A{n(R)},{n(ry)} 0 0 1 {n(cx - R)},{n(y)}Z'
        cid = self.nid()
        self.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
        out = [f'<path d="{d}" fill="{g}" stroke="none"/>', f'<g clip-path="url(#{cid})" fill="none">']
        segs, light = [], []
        for i in range(1, 14):
            th = math.pi * i / 14
            segs.append(((cx, y - rh), (cx - R * math.cos(th), y + ry * math.sin(th))))
        rows = ''
        for f in (.25, .45, .65, .82):
            rr, yy = R * f, y - rh * (1 - f)
            rows += f'M{n(cx - rr)},{n(yy)}A{n(rr)},{n(rr * e)} 0 0 0 {n(cx + rr)},{n(yy)}'
        dens = .5 if mat == 'thatch' else .45
        out.append(self.segpath(segs, c[4], .35, dens))
        out.append(f'<path d="{rows}" stroke="{c[4]}" stroke-width=".45" stroke-opacity=".5"/>')
        out.append('</g>')
        out.append(f'<path d="{d}" fill="none"/>')
        eave = f'M{n(cx - R)},{n(y)}A{n(R)},{n(ry)} 0 0 0 {n(cx + R)},{n(y)}'
        out.append(f'<path d="{eave}" fill="none" stroke="{trim or dk(c[3], .1)}" stroke-width="{1 if trim else 1.3}" '
                   f'stroke-opacity="1"/>')
        self.add(*out)
        if finial:
            self.finial(cx, y - rh, finial)

    def dome(self, cx, y, r, mat='gold', trim=None):
        c = MAT[mat]
        g = self.rad([(0, lt(c[0], .5)), (.35, c[0]), (.8, c[2]), (1, c[3])], .32, .28, .85)
        self.add(f'<path d="M{n(cx - r)},{n(y)}A{n(r)},{n(r * 1.05)} 0 0 1 {n(cx + r)},{n(y)}'
                 f'A{n(r)},{n(r * .3)} 0 0 1 {n(cx - r)},{n(y)}Z" fill="{g}"/>')
        rib = ''.join(f'M{n(cx + r * f)},{n(y + r * .3 * math.sqrt(max(0, 1 - f * f)))}Q{n(cx + r * f * .9)},{n(y - r * .8)} '
                      f'{n(cx)},{n(y - r * 1.05)}' for f in (-.5, 0, .5))
        self.add(f'<path d="{rib}" fill="none" stroke="{c[4]}" stroke-width=".4" stroke-opacity=".6"/>')
        self.add(f'<path d="M{n(cx - r)},{n(y)}A{n(r)},{n(r * .3)} 0 0 0 {n(cx + r)},{n(y)}" fill="none" '
                 f'stroke="{trim or dk(c[2], .2)}" stroke-width="1" stroke-opacity="1"/>')

    # ------------------------------------------------------------ details
    def door(self, x, yb, w, h, arch=False, frame='#d8c9a6', double=False, gold=False):
        fr = .7
        self.add(f'<path d="{self._arch(x - fr, yb, w + 2 * fr, h + fr, arch)}" fill="{frame}"/>')
        g = self.lin([(0, '#7e522c'), (1, '#4a2c16')], bb=True)
        d = self._arch(x, yb, w, h, arch)
        self.add(f'<path d="{d}" fill="{g}"/>')
        segs = []
        u = x + 1.1
        while u < x + w - .3:
            segs.append(((u, yb - h + (w / 2 if arch else 0) * .6), (u, yb)))
            u += 1.1
        self.add(self.segpath(segs, '#2e1a0c', .35, .6))
        band = '#3a3430' if not gold else '#d8aa48'
        self.add(self.segpath([((x + .2, yb - h * .3), (x + w - .2, yb - h * .3)),
                               ((x + .2, yb - h * .68), (x + w - .2, yb - h * .68))], band, .55, .9))
        if double:
            self.add(self.segpath([((x + w / 2, yb - h + (w / 2 if arch else 0)), (x + w / 2, yb))], '#26140a', .5, .9))
        self.add(f'<circle cx="{n(x + w * (.42 if double else .75))}" cy="{n(yb - h * .48)}" r=".35" fill="#e6c25c" '
                 f'stroke="none"/>')
        self.add(self.segpath([((x - fr, yb), (x + w + fr, yb))], '#efe6cc', .6, .8))

    def _arch(self, x, yb, w, h, arch):
        if not arch:
            return f'M{n(x)},{n(yb)}V{n(yb - h)}H{n(x + w)}V{n(yb)}Z'
        r = w / 2
        return f'M{n(x)},{n(yb)}V{n(yb - h + r)}A{n(r)},{n(r)} 0 0 1 {n(x + w)},{n(yb - h + r)}V{n(yb)}Z'

    def window(self, x, yt, w, h, arch=False, frame='#eadcb8', shutters=None, sill=True, lit=False):
        self.add(f'<path d="{self._arch(x - .55, yt + h + .4, w + 1.1, h + .95, arch)}" fill="{frame}" '
                 f'stroke-width=".6"/>')
        g = self.lin([(0, '#2a2018'), (1, '#6a4a28' if lit else '#4a3524')], bb=True)
        self.add(f'<path d="{self._arch(x, yt + h, w, h, arch)}" fill="{g}" stroke="none"/>')
        self.add(self.segpath([((x + w / 2, yt + (w / 2 if arch else 0) * .4), (x + w / 2, yt + h)),
                               ((x, yt + h * .5), (x + w, yt + h * .5))], frame, .4, 1))
        self.add(self.segpath([((x + .4, yt + h * .45), (x + w * .45, yt + .6))], '#c8d6dc', .45, .4))
        if sill:
            self.add(f'<rect x="{n(x - .9)}" y="{n(yt + h + .2)}" width="{n(w + 1.8)}" height=".9" fill="{lt(frame, .2)}" '
                     f'stroke-width=".5"/>')
        if shutters:
            for sx in (x - .6 - w * .45, x + w + .6):
                self.add(f'<rect x="{n(sx)}" y="{n(yt - .2)}" width="{n(w * .45)}" height="{n(h + .5)}" fill="{shutters}" '
                         f'stroke-width=".5"/>')

    def swindow(self, plane, u, v, w, h, frame='#cdbd98'):
        """Window on a side plane (local u along depth, v down from the plane origin)."""
        q = lambda a, b: plane.m(a, b)
        self.poly([q(u - .4, v - .5), q(u + w + .4, v - .5), q(u + w + .4, v + h + .4), q(u - .4, v + h + .4)], frame,
                  ' stroke-width=".5"')
        self.poly([q(u, v), q(u + w, v), q(u + w, v + h), q(u, v + h)], '#2c2119', ' stroke="none"')
        self.add(self.segpath([((u + w / 2, v), (u + w / 2, v + h))], frame, .35, 1, plane))

    def timber(self, plane, w, h, bays=3, rail=True, braces=True, col='#6e4a2a'):
        segs = [((0, .2), (w, .2)), ((0, h - .2), (w, h - .2)), ((.3, 0), (.3, h)), ((w - .3, 0), (w - .3, h))]
        for i in range(1, bays):
            segs.append(((w * i / bays, 0), (w * i / bays, h)))
        if rail:
            segs.append(((0, h * .5), (w, h * .5)))
        if braces:
            bw = w / bays
            segs += [((.3, h - .2), (bw * .6, h * .5 if rail else .2)), ((w - .3, h - .2), (w - bw * .6, h * .5 if rail else .2))]
        self.add(self.segpath(segs, col, 1.05, 1, plane))
        hl = [((a[0] - .3, a[1] - .3), (b[0] - .3, b[1] - .3)) for a, b in segs[:2]]
        self.add(self.segpath(hl, '#a07a50', .3, .5, plane))

    def quoins(self, plane, w, h, col='#efe6d0'):
        """Light corner stones on a plastered face."""
        out = []
        v = 0.0
        k = 0
        while v < h - .5:
            hh = min(1.6, h - v)
            for u0, ww in ((0, 2.2 if k % 2 == 0 else 1.4), (w - (2.2 if k % 2 == 0 else 1.4), 2.2 if k % 2 == 0 else 1.4)):
                out.append(f'<polygon points="{P([plane.m(u0, v), plane.m(u0 + ww, v), plane.m(u0 + ww, v + hh), plane.m(u0, v + hh)])}" '
                           f'fill="{col}" stroke-width=".35" stroke-opacity=".5"/>')
            v += hh
            k += 1
        self.add(*out)

    def flag(self, x, ytop, ph, col, fw=5.5, fh=3.6, dirn=1, tail=False, pole='#5a3a1e'):
        c = FLAGS.get(col, col)
        self.line([(x, ytop + ph), (x, ytop)], pole, .9, 1)
        self.line([(x - .25, ytop + ph), (x - .25, ytop)], '#b08a5a', .25, .8)
        y1 = ytop + .8
        fx = x + dirn * fw
        d = (f'M{n(x)},{n(y1)}C{n(x + dirn * fw * .35)},{n(y1 - 1.2)} {n(x + dirn * fw * .65)},{n(y1 + 1)} {n(fx)},{n(y1 + .3)}'
             + (f'L{n(fx - dirn * 1.4)},{n(y1 + .3 + fh / 2)}' if tail else '')
             + f'L{n(fx)},{n(y1 + .3 + fh)}C{n(x + dirn * fw * .65)},{n(y1 + fh + 1)} {n(x + dirn * fw * .35)},{n(y1 + fh - 1.2)} '
             f'{n(x)},{n(y1 + fh)}Z')
        g = self.lin([(0, lt(c, .25)), (.45, c), (.62, dk(c, .18)), (1, c)], (x, 0), (fx, 0))
        self.add(f'<path d="{d}" fill="{g}" stroke-width=".55"/>')
        self.add(f'<circle cx="{n(x)}" cy="{n(ytop - .3)}" r=".7" fill="#e8c460" stroke-width=".4"/>')

    def pennant(self, x, ytop, ph, col, fw=5, dirn=1):
        c = FLAGS.get(col, col)
        self.line([(x, ytop + ph), (x, ytop)], '#5a3a1e', .8, 1)
        d = f'M{n(x)},{n(ytop + .6)}Q{n(x + dirn * fw * .5)},{n(ytop + .4)} {n(x + dirn * fw)},{n(ytop + 1.8)}L{n(x)},{n(ytop + 3.2)}Z'
        g = self.lin([(0, lt(c, .2)), (1, dk(c, .2))], (x, 0), (x + dirn * fw, 0))
        self.add(f'<path d="{d}" fill="{g}" stroke-width=".5"/>')
        self.add(f'<circle cx="{n(x)}" cy="{n(ytop - .2)}" r=".6" fill="#e8c460" stroke-width=".4"/>')

    def banner(self, x, yt, w, h, col='red', emblem=True):
        c = FLAGS.get(col, col)
        g = self.lin([(0, lt(c, .2)), (.5, c), (1, dk(c, .25))], (x, 0), (x + w, 0))
        self.add(f'<path d="M{n(x)},{n(yt)}H{n(x + w)}V{n(yt + h)}L{n(x + w / 2)},{n(yt + h - w * .45)}L{n(x)},{n(yt + h)}Z" '
                 f'fill="{g}" stroke-width=".55"/>')
        self.add(f'<rect x="{n(x - .5)}" y="{n(yt - .6)}" width="{n(w + 1)}" height=".9" fill="#d8aa48" stroke-width=".4"/>')
        if emblem:
            cy = yt + (h - w * .45) * .45
            self.add(f'<path d="M{n(x + w / 2)},{n(cy - 1.1)}l1,1.1l-1,1.1l-1,-1.1Z" fill="#f0cc6a" stroke="#8a6420" '
                     f'stroke-width=".3"/>')

    def crate(self, x, y, s=3.2, mat='wood'):
        y = self.cl(y)
        fp, _ = self.box(x, y, s, s * .85, s * .7, mat)
        self.add(self.segpath([((x + .3, y - .3), (x + s - .3, y - s * .85 + .3)), ((x, y - s * .42), (x + s, y - s * .42))],
                              MAT[mat][4], .4, .8))
        tp = Plane((x, y - s * .85), (1, 0), (CX, -CY))
        self.face(tp, [(x, y - s * .85), (x + s, y - s * .85), pt(x + s, y, s * .7, s * .85), pt(x, y, s * .7, s * .85)],
                  mat, 'T', ao=False)

    def sack(self, x, y, s=2.6, col='#dccaa0'):
        y = self.cl(y)
        g = self.rad([(0, lt(col, .35)), (.6, col), (1, dk(col, .3))], .35, .3, .75)
        w = s
        d = (f'M{n(x - w * .5)},{n(y)}C{n(x - w * .75)},{n(y - s * .6)} {n(x - w * .45)},{n(y - s * 1.05)} {n(x - w * .12)},{n(y - s * 1.1)}'
             f'L{n(x - w * .25)},{n(y - s * 1.45)}L{n(x + w * .25)},{n(y - s * 1.45)}L{n(x + w * .12)},{n(y - s * 1.1)}'
             f'C{n(x + w * .45)},{n(y - s * 1.05)} {n(x + w * .75)},{n(y - s * .6)} {n(x + w * .5)},{n(y)}Z')
        self.add(f'<path d="{d}" fill="{g}" stroke-width=".6"/>')
        self.add(self.segpath([((x - w * .16, y - s * 1.12), (x + w * .16, y - s * 1.12))], '#6a4a26', .5, .9))

    def barrel(self, x, y, r=1.5, h=3.2):
        y = self.cl(y)
        self.cylinder(x, y, r, h, 'wood', 'staves', e=.4)
        g = self.rad([(0, '#c99a62'), (1, '#8a5e36')], .4, .4, .7)
        self.add(f'<ellipse cx="{n(x)}" cy="{n(y - h)}" rx="{n(r)}" ry="{n(r * .4)}" fill="{g}" stroke-width=".5"/>')

    def sheaf(self, x, y, h=4.5):
        y = self.cl(y)
        segs = []
        for i in range(7):
            dx = (i - 3) * .45
            segs.append(((x + dx * .35, y - h * .45), (x + dx, y)))
            segs.append(((x + dx * .35, y - h * .45), (x + dx * 1.3, y - h)))
        self.add(f'<path d="M{n(x - 1.6)},{n(y)}L{n(x - .6)},{n(y - h * .45)}L{n(x - 2.1)},{n(y - h)}H{n(x + 2.1)}'
                 f'L{n(x + .6)},{n(y - h * .45)}L{n(x + 1.6)},{n(y)}Z" fill="{self.lin([(0, "#f2d47e"), (1, "#c49a44")], bb=True)}" '
                 f'stroke-width=".55"/>')
        self.add(self.segpath(segs, '#9a7428', .3, .7))
        self.add(self.segpath([((x - .8, y - h * .45), (x + .8, y - h * .45))], '#7a5426', .7, 1))

    def bush(self, x, y, r=2.2):
        y = self.cl(y)
        g = self.rad([(0, '#b6d47a'), (.6, '#7fa848'), (1, '#577e30')], .35, .3, .75)
        for dx, dy, rr in ((-r * .6, 0, r * .8), (r * .6, .1, r * .75), (0, -r * .45, r)):
            self.add(f'<circle cx="{n(x + dx)}" cy="{n(y + dy - rr * .7)}" r="{n(rr)}" fill="{g}" stroke-width=".55"/>')

    def rocks(self, x, y, s=1.0):
        y = self.cl(y)
        g = self.rad([(0, '#e2dccb'), (1, '#9c9482')], .35, .3, .8)
        for dx, dy, rx in ((0, 0, 1.6), (2.2, .6, 1.2), (-1.8, .8, 1)):
            self.add(f'<ellipse cx="{n(x + dx * s)}" cy="{n(y + dy * s)}" rx="{n(rx * s)}" ry="{n(rx * s * .6)}" fill="{g}" '
                     f'stroke-width=".5"/>')

    def lantern(self, x, y, h=6):
        y = self.cl(y)
        self.line([(x, y), (x, y - h)], '#3c3430', .8, 1)
        g = self.rad([(0, '#fff2b8', .9), (.5, '#ffd36a', .45), (1, '#ffc040', 0)], .5, .5, .5)
        self.add(f'<circle cx="{n(x)}" cy="{n(y - h - .6)}" r="2.6" fill="{g}" stroke="none"/>')
        self.add(f'<rect x="{n(x - .7)}" y="{n(y - h - 1.5)}" width="1.4" height="1.8" fill="#ffd86e" stroke-width=".45"/>')

    def steps(self, x, y, w, k=2, mat='stone', dd=1.2):
        for i in range(k):
            self.box(x + i * .5, y - i * 1.0 - CY * i * dd * 0, w - i * 1.0, 1.0, dd, mat, top=True)
            y -= 0
        return

    def stall(self, x, y, w, col, goods):
        """Market stall: counter, posts and a striped sloping awning. (x, y) front-left on the ground."""
        d = 4.5
        c = FLAGS.get(col, col)
        # back posts
        for px in (x + .5, x + w - .5):
            p0, p1 = pt(px, y, d - .5), pt(px, y, d - .5, 9)
            self.line([p0, p1], '#5a3a1e', .9, 1)
        self.box(x, y, w, 3.2, d - 1.5, 'wood', 'planks_h')
        # goods on the counter
        gx = x + .9
        for i, gcol in enumerate(goods):
            gy = y - 3.2 - CY * 1.2
            gx2 = gx + CX * 1.2
            g = self.rad([(0, lt(gcol, .4)), (1, dk(gcol, .25))], .35, .3, .75)
            self.add(f'<circle cx="{n(gx2)}" cy="{n(gy - .6)}" r="1" fill="{g}" stroke-width=".45"/>')
            gx += (w - 1.8) / max(1, len(goods) - 1) if len(goods) > 1 else 0
        for px in (x + .4, x + w - .4):
            self.line([(px, y), (px, y - 7.5)], '#5a3a1e', .9, 1)
        # awning: from back-top to front, sloping down
        A0, A1 = pt(x - .8, y, d + .2, 9.4), pt(x + w + .8, y, d + .2, 9.4)
        F0, F1 = pt(x - .8, y, -1.4, 7.4), pt(x + w + .8, y, -1.4, 7.4)
        stripes = 5
        for i in range(stripes):
            t0, t1 = i / stripes, (i + 1) / stripes
            q = [add(A0, tuple((A1[j] - A0[j]) * t0 for j in (0, 1))), add(A0, tuple((A1[j] - A0[j]) * t1 for j in (0, 1))),
                 add(F0, tuple((F1[j] - F0[j]) * t1 for j in (0, 1))), add(F0, tuple((F1[j] - F0[j]) * t0 for j in (0, 1)))]
            fc = c if i % 2 == 0 else '#f3ead2'
            g = self.lin([(0, dk(fc, .12)), (1, lt(fc, .12))], q[0], (q[0][0], q[3][1]))
            self.poly(q, g, ' stroke="none"')
        self.poly([A0, A1, F1, F0], 'none')
        # scalloped valance
        vd = f'M{n(F0[0])},{n(F0[1])}'
        k = int(w + 1.6) // 2 + 1
        for i in range(k):
            xa = F0[0] + (F1[0] - F0[0]) * (i + 1) / k
            vd += f'Q{n(xa - (F1[0] - F0[0]) / k / 2)},{n(F0[1] + 2.2)} {n(xa)},{n(F0[1])}'
        g = self.lin([(0, c), (1, dk(c, .25))], bb=True)
        self.add(f'<path d="{vd}Z" fill="{g}" stroke-width=".55"/>')

    def cart(self, x, y, load='sacks', dirn=1):
        y = self.cl(y + 1.6) - 1.6
        self.box(x, y - 1.6, 7, 2, 3.5, 'wood', 'planks_h')
        if load == 'sacks':
            self.sack(x + 2, y - 3.6 - CY, 1.6, '#d8c49a')
            self.sack(x + 4.4, y - 3.4 - CY, 1.5, '#cdb68a')
        elif load == 'crates':
            self.crate(x + 1.2, y - 3.6, 2.4)
            self.crate(x + 3.8, y - 3.6, 2.2)
        self.line([(x + (7.5 if dirn > 0 else -.5), y - 2.4), (x + (11 if dirn > 0 else -4), y - .8)], '#5a3a1e', .8, 1)
        g = self.rad([(0, '#b08050'), (1, '#5a3a1e')], .4, .4, .7)
        for wx in (x + 1.8, x + 5.6):
            self.add(f'<ellipse cx="{n(wx)}" cy="{n(y - .3)}" rx="1.6" ry="1.7" fill="{g}" stroke-width=".6"/>')
            self.add(f'<circle cx="{n(wx)}" cy="{n(y - .3)}" r=".4" fill="#3a2614" stroke="none"/>')

    def scale_icon(self, cx, cy, s=1.0, col='#e8c050'):
        st = f' stroke="{dk(col, .35)}" stroke-width="{n(.45 * s) or ".2"}"'
        self.add(f'<path d="M{n(cx)},{n(cy - 2.4 * s)}V{n(cy + 2 * s)}M{n(cx - 1.4 * s)},{n(cy + 2 * s)}H{n(cx + 1.4 * s)}'
                 f'M{n(cx - 2.8 * s)},{n(cy - 1.8 * s)}H{n(cx + 2.8 * s)}M{n(cx - 2.6 * s)},{n(cy - 1.8 * s)}L{n(cx - 3.3 * s)},{n(cy)}'
                 f'M{n(cx - 2.6 * s)},{n(cy - 1.8 * s)}L{n(cx - 1.9 * s)},{n(cy)}M{n(cx + 2.6 * s)},{n(cy - 1.8 * s)}L{n(cx + 3.3 * s)},{n(cy)}'
                 f'M{n(cx + 2.6 * s)},{n(cy - 1.8 * s)}L{n(cx + 1.9 * s)},{n(cy)}" fill="none"{st}/>')
        for px in (cx - 2.6 * s, cx + 2.6 * s):
            self.add(f'<path d="M{n(px - .9 * s)},{n(cy)}A{n(.9 * s)},{n(.6 * s)} 0 0 0 {n(px + .9 * s)},{n(cy)}Z" fill="{col}"{st}/>')

    def sign(self, x, y, col='#e8c050'):
        """Hanging sign with a scale emblem on a bracket from the wall at (x, y)."""
        self.line([(x, y), (x + 5.2, y)], '#3c3430', .7, 1)
        self.line([(x + 1, y + .1), (x + 2.6, y - 1.3)], '#3c3430', .45, 1)
        g = self.lin([(0, '#a77a4a'), (1, '#6e4a28')], bb=True)
        self.add(f'<rect x="{n(x + 1.1)}" y="{n(y + .8)}" width="4.6" height="3.8" rx=".4" fill="{g}" stroke-width=".55"/>')
        self.add(self.segpath([((x + 2, y), (x + 2, y + .8)), ((x + 4.8, y), (x + 4.8, y + .8))], '#3c3430', .35, 1))
        self.scale_icon(x + 3.4, y + 2.8, .55, col)

    def palisade(self, cx, cy, rx, ry, a0, a1, k, h=6):
        for i in range(k):
            a = a0 + (a1 - a0) * i / (k - 1)
            x, y = cx + rx * math.cos(a), cy + ry * math.sin(a)
            g = self.lin([(0, '#b88a56'), (1, '#6e4a28')], bb=True)
            self.add(f'<path d="M{n(x - .9)},{n(y)}V{n(y - h)}L{n(x)},{n(y - h - 1.4)}L{n(x + .9)},{n(y - h)}V{n(y)}Z" '
                     f'fill="{g}" stroke-width=".55"/>')

    def crenels(self, x, y, w, d, mat='stone', size=1.6):
        """Merlons along the front and right edges of a flat top at (x, y)=front-left top corner."""
        k = max(2, int(w / (size * 1.8)))
        for i in range(k):
            mx = x + (w - size) * i / (k - 1)
            self.box(mx, y, size, size * 1.1, .9, mat, top=True)

    def tent(self, x, y, w, d, h, col='cloth', stripe=None, door=True):
        r = self.roof_z(x, y, w, d, h, col, o=.3, gmat=col, gtex=None)
        if door:
            ax = x + w / 2
            self.add(f'<path d="M{n(ax)},{n(y - h * .78)}L{n(ax - w * .2)},{n(y)}H{n(ax + w * .2)}Z" fill="#4a3424" '
                     f'stroke-width=".5"/>')
            self.add(f'<path d="M{n(ax)},{n(y - h * .78)}L{n(ax - w * .28)},{n(y)}L{n(ax - w * .14)},{n(y)}Z" fill="#e8dcbc" '
                     f'stroke-width=".4"/>')
        if stripe:
            c = FLAGS.get(stripe, stripe)
            self.line([r['Lf'], r['Af'], r['Rf']], c, .9, 1)
        return r


# ---------------------------------------------------------------- shared building bits
def centre(w, d, cx=37, cy=87):
    """Front-left ground corner that centres a w x d footprint on (cx, cy)."""
    return cx - (w + CX * d) / 2, cy + CY * d / 2


def plinth(a, x, y, w, d, h=2.2, mat='stone'):
    """Stone base slightly larger than the building; returns the raised front-left corner."""
    bx, by = pt(x - 1, y, -.9)
    a.box(bx, by, w + 2, h, d + 1.8, mat, 'stone', top=True)
    return x, y - h


# ---------------------------------------------------------------- main building (village hall)
def b_main(a, s):
    a.ground(34, 10.5, dirt=.5 if s < 3 else 0)
    W = [21, 24, 26, 27, 28][s - 1]
    D = [13, 14, 15, 15, 16][s - 1]
    x, y = centre(W, D)
    if s >= 4:
        x += 3.2
    a.bshadow(x - (6 if s >= 4 else 0), y, W + (6 if s >= 4 else 0), D, 14)
    if s >= 4:  # tower behind on the left
        tw, th = 8, [0, 0, 0, 27, 32][s - 1]
        tx, ty = pt(x - 8.5, y, D * .25)
        a.shadow(tx + 7, ty - 1, 6, 2.5, .25)
        a.box(tx, ty, tw, th, tw, 'stone', 'stone')
        for k in range(2):
            a.add(f'<rect x="{n(tx + 3.4)}" y="{n(ty - th + 4 + k * 7)}" width="1.2" height="3" fill="#2c2119" stroke-width=".5"/>')
        if s == 4:
            r = a.roof_hip(tx, ty - th, tw, tw, 9, 'tile', o=1, finial=2)
            a.flag(r['top'][0], r['top'][1] - 10, 8, 'red', 5, 3.2)
        else:
            a.crenels(tx - .4, ty - th, tw + .8, tw)
            r = a.roof_hip(tx + .8, ty - th - 1.6, tw - 1.6, tw - 1.6, 13, 'tile', o=.6, trim='#e0b450')
            a.flag(r['top'][0], r['top'][1] - 10, 9, 'red', 5.5, 3.4, tail=True)
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.4)
    if s <= 2:
        h = [11, 12][s - 1]
        fp, sp = a.box(x, base, W, h, D, 'plaster', 'plaster')
        a.timber(fp, W, h, 3 if s == 1 else 4)
        a.timber(sp, D, h, 2, braces=False)
        a.door(x + W / 2 - 2.2, base, 4.4, 7)
        for wx in ([x + 2.5, x + W - 5.5] if s == 1 else [x + 2.3, x + 7, x + W - 9.8, x + W - 5.1]):
            a.window(wx, base - 8.5, 2.6, 3)
        a.swindow(sp, 5, 3.6, 2.6, 3)
        if s == 2:
            a.box(*pt(x + W - 6, base, D * .55, h + 4), 2.6, 7, 2.6, 'stone', 'stone')  # chimney (drawn under roof edge)
        r = a.roof_x(x, base - h, W, D, 9 + s, 'thatch', 1.6, 'wood')
        if s == 2:
            cx_, cy_ = pt(x + W - 6, base, D * .55, h + 9.5)
            a.box(cx_, cy_ + 2, 2.6, 4, 2.2, 'stone', 'stone', top=True)
            a.smoke(cx_ + 1.8, cy_ - 4)
            # porch roof over the door
            a.roof_z(x + W / 2 - 3.6, base - 7.6, 7.2, 1.5, 3, 'thatch', .5, back=False, gable=False)
            a.line([(x + W / 2 - 3.2, base), (x + W / 2 - 3.2, base - 7.4)], '#5a3a1e', .8, 1)
            a.line([(x + W / 2 + 3.2, base), (x + W / 2 + 3.2, base - 7.4)], '#5a3a1e', .8, 1)
        a.barrel(x - 1.6, y + 2.5)
        a.crate(x + W + 1, y + 2.2, 3)
        if s == 1:
            a.smoke(r['R1'][0] - 6, r['R1'][1] - 3)
        return
    # two storeys
    h1, h2 = [0, 0, 9, 9.5, 10][s - 1], [0, 0, 8, 8.5, 9][s - 1]
    gmat = 'plaster' if s == 3 else 'stone' if s == 4 else 'gstone'
    fp, sp = a.box(x, base, W, h1, D, gmat, 'plaster' if s == 3 else 'stone')
    if s == 3:
        a.timber(fp, W, h1, 4, rail=False)
        a.timber(sp, D, h1, 2, rail=False, braces=False)
    ux, uy = pt(x, base - h1, -.8)
    fp2, sp2 = a.box(ux, uy, W, h2, D + .8, 'plaster', 'plaster')
    if s < 5:
        a.timber(fp2, W, h2, 4, rail=False)
        a.timber(sp2, D + .8, h2, 2, rail=False, braces=False)
    else:
        a.quoins(fp2, W, h2)
        a.add(a.segpath([((ux, uy + .2), (ux + W, uy + .2))], '#d8aa48', .8, 1))
    a.add(a.segpath([((ux - .2, uy), (ux + W + .2, uy))], '#5a3a1e', 1.1, 1))
    roofmat = 'shingle' if s == 3 else 'tile'
    trim = '#e0b450' if s == 5 else None
    if s == 3:  # chimney
        cxp = pt(x + 4, base, D * .55, h1 + h2 + 3)
        a.box(cxp[0], cxp[1] + 2, 2.6, 6, 2.2, 'stone', 'stone', top=True)
    r = a.roof_x(ux, uy - h2, W, D + .8, 10 + s, roofmat, 1.6, 'plaster', 'plaster', trim=trim)
    if s == 3:
        cxp = pt(x + 4, base, D * .55, h1 + h2 + 8)
        a.box(cxp[0], cxp[1], 2.6, 4, 2.2, 'stone', 'stone', top=True)
        a.smoke(cxp[0] + 2, cxp[1] - 6)
    # upper windows
    for i in range(4):
        wx = ux + 2 + i * (W - 6.6) / 3
        a.window(wx, uy - h2 + 2.4, 2.6, 3.2, arch=s == 5, shutters='#7a8a6a' if s == 3 else None)
    a.swindow(sp2, 3, 2.6, 2.4, 3.2)
    a.swindow(sp2, 9.5, 2.6, 2.4, 3.2)
    if s >= 4:  # projecting bay with a front gable
        bw, bx = 11, x + W / 2 - 5.5
        bxf, byf = pt(bx, base, -2.2)
        bp, bsp = a.box(bxf, byf, bw, h1 + h2, 2.2, 'stone' if s == 4 else 'gstone', 'stone')
        a.roof_z(bxf, byf - h1 - h2, bw, 2.2 + D * .45, 8, 'tile', 1.2, 'plaster', 'plaster', trim=trim, back=False)
        if s == 5:
            g = a.rad([(0, '#fff3c4'), (.6, '#e8c05a'), (1, '#a07020')], .35, .3, .75)
            a.add(f'<circle cx="{n(bxf + bw / 2)}" cy="{n(byf - h1 - h2 - 3)}" r="2" fill="{g}" stroke-width=".6"/>')
            a.add(f'<circle cx="{n(bxf + bw / 2)}" cy="{n(byf - h1 - h2 - 3)}" r="1.1" fill="#4a3524" stroke-width=".4"/>')
        else:
            a.window(bxf + bw / 2 - 1, byf - h1 - h2 - 4.4, 2, 2.6)
        a.window(bxf + bw / 2 - 1.6, byf - h1 - 6.4, 3.2, 4, arch=True)
        a.door(bxf + bw / 2 - 2.4, byf, 4.8, 7.6, arch=True, frame='#efe6cc', double=True, gold=s == 5)
        for k, wx in enumerate((x + 2.2, x + W - 5.0)):
            a.window(wx, base - h1 + 2.6, 2.8, 3.8, arch=True)
        a.banner(bxf - 2.6, byf - h1 - h2 + 1, 2.2, 8, 'red')
        a.banner(bxf + bw + .4, byf - h1 - h2 + 1, 2.2, 8, 'red')
        st = pt(bxf - .6, byf, -1.6)
        a.box(st[0], st[1] + 1.0, bw + 1.2, 1.0, 1.4, 'stone', top=True)
        if s == 5:
            a.lantern(x - 1, y + 3, 7)
            a.lantern(x + W + 3, y + 1.5, 7)
            a.flag(r['R1'][0] - 1.5, r['R1'][1] - 8.5, 8, 'gold', 4.5, 3, -1)
        else:
            a.barrel(x + W + 2.5, y + 2.5)
    else:
        a.door(x + W / 2 - 2.3, base, 4.6, 7.2, arch=True)
        for wx in (x + 2.4, x + 7, x + W - 9.6, x + W - 5):
            a.window(wx, base - h1 + 2.4, 2.6, 3.4)
        a.swindow(sp, 4.5, 2.4, 2.4, 3.2)
        a.banner(x + W / 2 - 5.3, base - h1 + 1.2, 2, 6, 'red')
        a.banner(x + W / 2 + 3.3, base - h1 + 1.2, 2, 6, 'red')
        st = pt(x + W / 2 - 3.2, y, -1.4)
        a.box(st[0], st[1] + .3, 6.4, 1.0, 1.6, 'stone', top=True)
        # annex at the right
        an = pt(x + W, base, D * .55)
        a.barrel(x - 1.5, y + 2.5)
        a.crate(x + W + 1.5, y + 2.4, 3)


# ---------------------------------------------------------------- rally point (69 x 120 canvas)
def b_rally(a, s):
    cx, cy = 34, 104
    a.ground(31, 11, cx, cy)
    g = a.rad([(0, '#e4d3a6', .95), (.7, '#d8c393', .8), (1, '#cdb582', 0)], .5, .5, .5)
    a.add(f'<ellipse cx="{cx + 1}" cy="{cy + 1}" rx="{n(15 + s * 1.6)}" ry="{n(5 + s * .5)}" fill="{g}" stroke="none"/>')
    a.shadow(cx + 4, cy + 1, 20 + s, 6 + s * .4, .22)
    if s >= 3:  # palisade arc behind
        a.palisade(cx, cy - 1, 23.5, 9, math.pi * 1.06, math.pi * 1.94, 16 + s, 6 + s * .4)
    if s >= 4:  # watchtower at the back right
        tx, ty = 50, 93
        th = 22 if s == 4 else 25
        a.shadow(tx + 4, ty + .5, 5, 1.8, .25)
        base = ty
        if s == 5:
            a.box(tx - 4.5, ty + 1, 9, 5, 4, 'stone', 'stone', top=True)
            base = ty - 4
        for lx, z in ((tx - 3, 3.5), (tx + 3, 3.5), (tx - 3, 0), (tx + 3, 0)):
            p0, p1 = pt(lx, base, z), pt(tx + (lx - tx) * .7, ty, z * .8, th)
            a.line([p0, p1], '#6a4626' if z else '#7e5632', 1.2, 1)
        a.line([pt(tx - 2.8, base, 0, 3), pt(tx + 2.4, base, 0, 10), pt(tx - 2.3, base, 0, 16)], '#8a6038', .6, 1)
        pf = (tx - 3.4, ty - th)
        a.box(pf[0], pf[1], 6.8, 2.6, 3.4, 'wood', 'planks_v', top=True)
        for ux in (.4, 6.4):
            a.line([(pf[0] + ux, pf[1] - 2.6), (pf[0] + ux, pf[1] - 7.4)], '#5a3a1e', .7, 1)
        a.line([(pf[0] + .4, pf[1] - 4.4), (pf[0] + 6.4, pf[1] - 4.4)], '#5a3a1e', .5, 1)
        r = a.roof_hip(pf[0], pf[1] - 7.4, 6.8, 3.4, 4.5, 'tile' if s == 5 else 'shingle', .8,
                       trim='#e0b450' if s == 5 else None)
        a.pennant(r['top'][0], r['top'][1] - 6, 6, 'gold' if s == 5 else 'red', 4)
    # tents
    tents = {1: [(10, 100, 11, 7, 9, None), (42, 98, 10, 7, 8, None)],
             2: [(10, 100, 11, 7, 9, None), (42, 98, 10, 7, 8, None), (20, 93, 9, 6, 7, None)],
             3: [(10, 101, 11, 8, 10, 'red'), (41, 99, 11, 7, 9, None), (20, 93, 9, 6, 7.5, None)],
             4: [(10, 102, 11, 8, 11, 'red'), (37, 100, 11, 7, 9.5, 'gold'), (19, 93, 9, 6, 7.5, None)],
             5: [(10, 103, 11, 8, 11, 'red'), (37, 101, 11, 7, 9.5, 'gold')]}[s]
    if s == 5:  # command pavilion, striped
        a.shadow(27, 94, 7, 2.2, .25)
        a.cylinder(23, 94, 5.4, 5, 'cloth', None)
        for i in range(5):
            xx = 23 - 5.4 * math.cos(math.pi * (i + .5) / 5)
            a.line([(xx, 89), (xx, 94 + 1.9 * math.sin(math.pi * (i + .5) / 5))], '#c03a2c', .9, .8)
        a.add('<path d="M21.8,95.6V90.4H24.4V95.6Z" fill="#4a3424" stroke-width=".5"/>')
        a.cone(23, 89, 5.4, 8.5, 'cloth', 1, trim='#c03a2c', finial=2.5)
        a.pennant(23, 75, 3.5, 'red', 4)
    for tx, ty, tw, td, th, st in sorted(tents, key=lambda t: t[1]):
        a.shadow(tx + tw / 2 + 4, ty - 1, tw / 2 + 2, 2.4, .25)
        a.tent(tx, ty, tw, td, th, 'cloth', st)
    # banner pole with a big hanging banner
    px, py = 31, 100
    ph = [36, 40, 44, 48, 52][s - 1]
    a.shadow(px + 4, py + .5, 3, 1.2, .3)
    a.line([(px, py), (px, py - ph)], '#5a3a1e', 1.3, 1)
    a.line([(px - .35, py), (px - .35, py - ph)], '#b08a5a', .35, .8)
    a.line([(px - .5, py - ph + 2), (px + 8.5, py - ph + 2)], '#5a3a1e', .9, 1)
    a.add(f'<circle cx="{px}" cy="{n(py - ph - .6)}" r="1" fill="#e8c460" stroke-width=".5"/>')
    a.banner(px + 1.2, py - ph + 2.6, [5.5, 6, 6.5, 7, 7.5][s - 1], [10, 11, 12, 13, 14][s - 1], 'red')
    a.rocks(px, py + .8, .8)
    side = [('blue', 13, 94), ('gold', 45, 93), ('green', 55, 103)][:max(0, s - 1)]
    for col, fx, fy in side:
        a.line([(fx, fy), (fx, fy - 16)], '#5a3a1e', .8, 1)
        a.banner(fx + .6, fy - 15.6, 3.4, 6, col)
        a.add(f'<circle cx="{fx}" cy="{n(fy - 16.4)}" r=".7" fill="#e8c460" stroke-width=".4"/>')
    # training gear: straw targets, dummy, weapon rack, campfire
    def target(x, y):
        g = a.rad([(0, '#f0dc9a'), (1, '#c9a052')], .4, .4, .7)
        a.line([(x - 1.2, y), (x, y - 3)], '#5a3a1e', .6, 1)
        a.line([(x + 1.2, y), (x, y - 3)], '#5a3a1e', .6, 1)
        a.add(f'<ellipse cx="{x}" cy="{n(y - 4)}" rx="2.4" ry="2.6" fill="{g}" stroke-width=".55"/>')
        a.add(f'<ellipse cx="{x}" cy="{n(y - 4)}" rx="1.4" ry="1.5" fill="#c84a34" stroke-width=".4"/>')
        a.add(f'<ellipse cx="{x}" cy="{n(y - 4)}" rx=".55" ry=".6" fill="#f3ead2" stroke="none"/>')

    def dummy(x, y):
        a.line([(x, y), (x, y - 7)], '#5a3a1e', .8, 1)
        a.line([(x - 2.4, y - 5), (x + 2.4, y - 5)], '#5a3a1e', .7, 1)
        a.sack(x, y - 2.2, 1.9, '#d8c49a')
        a.add(f'<circle cx="{x}" cy="{n(y - 7.4)}" r="1.2" fill="#e2cf9e" stroke-width=".5"/>')

    def rack(x, y):
        a.line([(x, y), (x + 5, y)], '#5a3a1e', .8, 1)
        for i in range(4):
            a.line([(x + .6 + i * 1.3, y + .3), (x + 1.2 + i * 1.3, y - 7)], '#6a4626', .45, 1)
            a.add(f'<path d="M{n(x + 1.2 + i * 1.3)},{n(y - 7)}l-.4,-1.4l.9,.1Z" fill="#c8ccd0" stroke-width=".3"/>')
        a.line([(x - .2, y - 3.5), (x + 5.2, y - 3.5)], '#5a3a1e', .7, 1)

    def fire(x, y):
        a.rocks(x, y, .6)
        g = a.rad([(0, '#fff2a8'), (.5, '#f0a030'), (1, '#c84a20')], .5, .7, .7)
        a.add(f'<path d="M{n(x - 1.4)},{n(y)}Q{n(x - 1.6)},{n(y - 2)} {n(x)},{n(y - 3.6)}Q{n(x + 1.6)},{n(y - 2)} {n(x + 1.4)},{n(y)}Z" '
              f'fill="{g}" stroke="#a03a18" stroke-width=".4"/>')
        a.smoke(x + .5, y - 6, 2)

    def shield(x, y, col):
        c = FLAGS[col]
        g = a.rad([(0, lt(c, .3)), (1, dk(c, .25))], .35, .3, .75)
        a.add(f'<circle cx="{n(x)}" cy="{n(y)}" r="1.6" fill="{g}" stroke-width=".55"/>')
        a.add(f'<circle cx="{n(x)}" cy="{n(y)}" r=".5" fill="#e8c460" stroke-width=".3"/>')

    fire(22 if s < 5 else 40, 108)
    target(53, 108)
    if s >= 2:
        dummy(15, 112)
        rack(51, 113 - (0 if s < 4 else 2))
    if s >= 3:
        target(44, 111)
        for i, col in enumerate(('blue', 'red', 'gold')):
            shield(30 + i * 3.6, 110.5, col)
    if s >= 4:
        a.crate(9, 113, 3)
        a.barrel(14, 114.5)
    if s == 4:
        dummy(21, 115)
    if s == 5:
        a.lantern(26, 116, 6)
        a.lantern(42, 115, 6)


# ---------------------------------------------------------------- warehouse
def b_warehouse(a, s):
    a.ground(34, 10.5, dirt=.45)
    W = [20, 23, 25, 26, 27][s - 1]
    D = [15, 16, 17, 17, 18][s - 1]
    x, y = centre(W, D)
    if s >= 3:
        x += 1.6
    a.bshadow(x, y, W, D, 14)
    if s >= 3:  # side wing on the left
        lw, ld = 7.5, D - 5
        wx_, wy_ = pt(x - lw, y, 2.5)
        a.box(wx_, wy_, lw + 1, 7.5, ld, 'wood', 'planks_v', side=False)
        wr = a.roof_x(wx_, wy_ - 7.5, lw + 1, ld, 4.5, 'shingle' if s == 3 else 'tile', 1.0, 'wood', 'planks_v')
        a.door(wx_ + 1.6, wy_, 3.6, 5.2, double=True, frame='#a07a4a')
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.2)
    h = [11, 12, 13, 14, 15][s - 1]
    if s <= 2:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_v')
    else:
        lo = h * .45
        fp, sp = a.box(x, base, W, lo, D, 'stone' if s < 5 else 'gstone', 'stone')
        fp2, sp2 = a.box(x, base - lo, W, h - lo, D, 'wood', 'planks_v')
        a.add(a.segpath([((x, base - lo), (x + W, base - lo))], '#5a3a1e', 1.1, 1))
    roof = 'shingle' if s < 4 else 'tile'
    trim = '#e0b450' if s == 5 else None
    rh = [10, 11, 12, 13, 14][s - 1]
    r = a.roof_z(x, base - h, W, D, rh, roof, 1.5, 'wood', 'planks_v', trim=trim)
    # side windows / vents
    sp_ = sp if s <= 2 else sp2
    a.swindow(sp_, 4, 2.2 if s > 2 else 4, 2.6, 2.4)
    a.swindow(sp_, 10, 2.2 if s > 2 else 4, 2.6, 2.4)
    # big double loading door with braces
    dw, dh = W * .42, h * .62
    dx = x + W / 2 - dw / 2
    a.door(dx, base, dw, dh, double=True, frame='#a07a4a')
    a.add(a.segpath([((dx + .3, base - .3), (dx + dw / 2 - .3, base - dh + .3)), ((dx + dw - .3, base - .3), (dx + dw / 2 + .3, base - dh + .3))],
                    '#2e1a0c', .5, .8))
    # loft door + hoist beam
    lx, ly = x + W / 2 - 1.8, base - h - rh * .2
    a.add(f'<rect x="{n(lx - .5)}" y="{n(ly - 4.5)}" width="4.6" height="5.4" fill="#a07a4a"/>')
    a.add(f'<rect x="{n(lx)}" y="{n(ly - 4)}" width="3.6" height="4.6" fill="#3a2616" stroke-width=".5"/>')
    if s >= 2:  # hoist beam with a hanging crate
        ap = r['apex']
        a.line([(ap[0], ap[1] + 1.6), (ap[0] - 4.6, ap[1] + 4.6)], '#5a3a1e', 1.3, 1)
        a.line([(ap[0] - 4.2, ap[1] + 4.4), (ap[0] - 4.2, ly + 2.4)], '#c8b088', .4, 1)
        a.crate(ap[0] - 5.4, ly + 4.6, 2.4)
    # goods outside
    cy0 = a.cl(y + 3)
    a.crate(x - 3.5, cy0, 3.4)
    a.crate(x - 1.2, a.cl(y + 4.2), 3)
    a.sack(x + W + 2.4, y + 1.6, 2.4)
    if s >= 2:
        a.crate(x - 3.1, cy0 - 2.9, 3)
        a.barrel(x + W + 4.6, y + 2.6)
    if s >= 4:
        a.cart(x + W - 5, y + 5, 'crates')
        a.banner(x + .8, base - h + 1, 2.2, 7, 'red')
        a.banner(x + W - 3, base - h + 1, 2.2, 7, 'red')
    if s == 5:
        a.flag(r['Af'][0], r['Af'][1] - 9, 8.4, 'red', 5, 3.2, tail=True)
        a.flag(wr['R0'][0] + 1.5, wr['R0'][1] - 7, 7.2, 'gold', 4.2, 2.8, -1)
        a.sack(x + W + .6, y + 5, 2.4)


# ---------------------------------------------------------------- granary
def silo(a, cx, y, r, h, s, roof=None):
    wall = 'wood' if s <= 2 else 'stone' if s < 5 else 'gstone'
    a.shadow(cx + 2.5, y + .5, r + 2, r * .5, .25)
    a.cylinder(cx, y, r, h, wall, 'staves' if s <= 2 else 'stone')
    roof = roof or ('thatch' if s <= 3 else 'tile')
    a.cone(cx, y - h, r, r * 1.5 + 2, roof, 1.0, trim='#e0b450' if s == 5 else None, finial=2 if s >= 4 else None)
    a.add(f'<rect x="{n(cx - 1)}" y="{n(y - h * .55)}" width="2" height="2.6" fill="#3a2616" stroke-width=".45"/>')


def b_granary(a, s):
    a.ground(33, 10.5, dirt=.35)
    W = [17, 19, 20, 20, 21][s - 1]
    D = [12, 13, 14, 14, 15][s - 1]
    x, y = centre(W, D)
    if s == 2:
        x -= 3
    a.bshadow(x, y, W, D, 12)
    if s >= 4:  # back silo on the left
        silo(a, x - 2.5, y - 6, 5, 15 + s, s)
    if s >= 2:
        silo(a, x + W + CX * D - 3, y - 3, 5 if s < 4 else 5.6, 12 + s * 2, s)
    base = y
    if s <= 2:  # on staddle stones
        for sx, sz in ((x + 1, 0), (x + W - 2, 0), (x + W - 2, D - 1), (x + 1, D - 1)):
            p = pt(sx, y, sz)
            a.add(f'<path d="M{n(p[0] - .5)},{n(p[1])}L{n(p[0])},{n(p[1] - 2.2)}H{n(p[0] + 1)}L{n(p[0] + 1.5)},{n(p[1])}Z" fill="#b0a68f" '
                  f'stroke-width=".5"/>')
            a.add(f'<ellipse cx="{n(p[0] + .5)}" cy="{n(p[1] - 2.4)}" rx="1.6" ry=".6" fill="#d6cdb9" stroke-width=".5"/>')
        base = y - 2.8
    else:
        x, base = plinth(a, x, y, W, D, 2.4)
    h = [10, 11, 13, 14, 15][s - 1]
    if s <= 2:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_h')
    elif s == 3:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_h')
        a.timber(fp, W, h, 3, braces=False, col='#6a4626')
    else:
        fp, sp = a.box(x, base, W, h, D, 'stone' if s == 4 else 'gstone', 'stone')
    roof = 'thatch' if s <= 3 else 'tile'
    trim = '#e0b450' if s == 5 else None
    r = a.roof_x(x, base - h, W, D, [8, 9, 10, 11, 12][s - 1], roof, 1.5, 'wood', 'planks_v', trim=trim)
    # loft dormer with a sack on the hoist
    dp = pt(x + W / 2 - 2.6, base - h, -.2)
    a.box(dp[0], dp[1] + .01, 5.2, 4.4, 2.6, 'wood', 'planks_v')
    dr = a.roof_z(dp[0], dp[1] - 4.4, 5.2, 3.6, 3.2, roof, .6, 'wood', 'planks_v', trim=trim, back=False)
    a.add(f'<rect x="{n(dp[0] + 1.3)}" y="{n(dp[1] - 3.8)}" width="2.6" height="3.4" fill="#3a2616" stroke-width=".5"/>')
    ap = dr['apex']
    a.line([(ap[0], ap[1] + 1.2), (ap[0] + 3.2, ap[1] + 3)], '#5a3a1e', 1, 1)
    a.line([(ap[0] + 2.9, ap[1] + 3), (ap[0] + 2.9, ap[1] + 6.2)], '#c8b088', .35, 1)
    a.sack(ap[0] + 2.9, ap[1] + 9, 1.6)
    dw = 5 if s < 3 else 5.6
    a.door(x + W / 2 - dw / 2, base, dw, h * .62, double=s >= 3, arch=s >= 4, frame='#a07a4a' if s < 4 else '#efe6cc')
    a.swindow(sp, 4, 3, 2.2, 2.2)
    a.swindow(sp, 8.5, 3, 2.2, 2.2)
    if s <= 2:
        a.add(f'<path d="M{n(x + W / 2 - 2)},{n(y + 1)}L{n(x + W / 2 - 2.6)},{n(base)}H{n(x + W / 2 + 2.6)}L{n(x + W / 2 + 2)},{n(y + 1)}Z" '
              f'fill="#a07a4a" stroke-width=".5"/>')
    if s >= 4:
        a.banner(x + 1, base - h + 1, 2.2, 7, 'gold')
        a.banner(x + W - 3.2, base - h + 1, 2.2, 7, 'gold')
    if s == 5:
        a.flag(r['R0'][0] + 1.5, r['R0'][1] - 8.5, 8.6, 'gold', 5, 3.2, -1, tail=True)
    # grain
    a.sheaf(x - 2.5, y + 4)
    a.sheaf(x + .4, y + 5.2)
    a.sack(x + W - 1, y + 4.5, 2.4)
    if s >= 2:
        a.sack(x + W + 1.8, y + 3.6, 2.2, '#d0bc8e')
    if s >= 3:
        a.sheaf(x - 5, y + 2.6)
        a.sack(x + W + 4.6, y + 4.8, 2.3)
    if s >= 4:
        a.cart(x + 3, y + 6, 'sacks')


# ---------------------------------------------------------------- great warehouse
def b_greatwarehouse(a, s):
    a.ground(36, 11, dirt=.4)
    W = [29, 33, 35, 36, 37][s - 1]
    D = [15, 17, 18, 18, 19][s - 1]
    x, y = centre(W, D)
    a.bshadow(x, y, W, D, 16)
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.4)
    h = [11, 13, 15, 16, 17][s - 1]
    if s <= 2:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_v')
        a.timber(fp, W, h, 4 if s == 1 else 5, rail=True, col='#5a3a1e')
    else:
        lo = h * .5
        fp, sp = a.box(x, base, W, lo, D, 'stone' if s < 5 else 'gstone', 'stone')
        fp2, sp2 = a.box(x, base - lo, W, h - lo, D, 'wood', 'planks_v')
        a.timber(fp2, W, h - lo, 5, rail=False, col='#5a3a1e')
        a.add(a.segpath([((x, base - lo), (x + W, base - lo))], '#5a3a1e', 1.1, 1))
    roof = 'shingle' if s < 4 else 'tile'
    trim = '#e0b450' if s == 5 else None
    r = a.roof_x(x, base - h, W, D, 11 + s, roof, 1.6, 'wood', 'planks_v', trim=trim)
    # dormers with hoists
    for dxf in (.25, .75):
        dx_ = x + W * dxf - 3
        dp = pt(dx_, base - h, -.2, 0)
        a.box(dp[0], dp[1] + 0.01, 6, 5.5, 3, 'wood', 'planks_v')
        rr = a.roof_z(dp[0], dp[1] - 5.5, 6, 4, 4, roof, .7, 'wood', 'planks_v', trim=trim, back=False)
        a.add(f'<rect x="{n(dp[0] + 1.6)}" y="{n(dp[1] - 4.6)}" width="2.8" height="4" fill="#3a2616" stroke-width=".5"/>')
        a.line([(rr['apex'][0], rr['apex'][1] + 1.4), (rr['apex'][0] - 2.4, rr['apex'][1] + 2.6)], '#5a3a1e', 1, 1)
        a.line([(rr['apex'][0] - 2.2, rr['apex'][1] + 2.6), (rr['apex'][0] - 2.2, base - h + 3)], '#c8b088', .35, 1)
    # three bays of doors
    for i, dxf in enumerate((.2, .5, .8)):
        dw = 5.4 if i != 1 else 6.4
        a.door(x + W * dxf - dw / 2, base, dw, h * (.55 if i != 1 else .62), double=True, arch=s >= 3,
               frame='#a07a4a' if s < 3 else '#efe6cc', gold=s == 5)
    a.swindow(sp if s <= 2 else sp2, 4, 2.5, 2.4, 2.6)
    a.swindow(sp if s <= 2 else sp2, 11, 2.5, 2.4, 2.6)
    if s >= 3:  # buttresses
        for bxp in (x - .6, x + W * .35 - 1, x + W * .65 - 1, x + W - 1.4):
            bp = pt(bxp, base, -1.2)
            a.box(bp[0], bp[1], 2, h * .5, 1.2, 'stone', 'stone', top=True)
    if s >= 4:  # corner towers
        th = h + (8 if s == 4 else 12)
        for tx_ in (x - 4, x + W - 3):
            tp = pt(tx_, y + .8, -2)
            a.shadow(tp[0] + 6, tp[1], 5, 2, .25)
            a.box(tp[0], tp[1], 7, th, 6, 'stone', 'stone')
            a.add(f'<rect x="{n(tp[0] + 2.9)}" y="{n(tp[1] - th + 4)}" width="1.2" height="3" fill="#2c2119" stroke-width=".5"/>')
            a.add(f'<rect x="{n(tp[0] + 2.9)}" y="{n(tp[1] - th + 11)}" width="1.2" height="3" fill="#2c2119" stroke-width=".5"/>')
            if s == 4:
                rr = a.roof_hip(tp[0], tp[1] - th, 7, 6, 7, 'tile', .9, finial=2)
                a.pennant(rr['top'][0], rr['top'][1] - 8, 6, 'red', 4)
            else:
                a.crenels(tp[0] - .3, tp[1] - th, 7.6, 6)
                rr = a.roof_hip(tp[0] + .7, tp[1] - th - 1.7, 5.6, 4.6, 8, 'tile', .5, trim='#e0b450')
                a.flag(rr['top'][0], rr['top'][1] - 9, 8, 'red', 4.6, 3, tail=True)
        a.banner(x + W * .5 - 1.3, base - h + .8, 2.6, 6.5, 'red')
    else:
        a.crate(x - 2, y + 3.5, 3.2)
        a.crate(x + W + 1, y + 1.5, 3.2)
        a.barrel(x + W + 6, y - .5)
    a.crate(x + 2, y + 5.4, 3)
    a.sack(x + 7.2, y + 5.6, 2.4)
    a.sack(x + W - 6, y + 5.6, 2.4, '#cdb68a')
    if s >= 2:
        a.crate(x + W - 3, y + 5.8, 3)
    if s == 2:
        a.cart(x + W * .5 - 2, y + 7, 'crates')
    if s == 5:
        a.flag(r['R0'][0] + W * .5, r['R0'][1] - 9, 8.4, 'gold', 5, 3.2)


# ---------------------------------------------------------------- great granary
def b_greatgranary(a, s):
    a.ground(36, 11, dirt=.35)
    W = [24, 26, 27, 28, 28][s - 1]
    D = [15, 16, 16, 17, 17][s - 1]
    x, y = centre(W, D)
    a.bshadow(x, y, W, D, 14)
    sr = [5, 5.4, 5.6, 6, 6.2][s - 1]
    sh = [13, 15, 17, 20, 22][s - 1]
    # silos behind, left and right
    silo(a, x + 1, y - 11, sr, sh, s)
    silo(a, x + W + CX * D - 1, y - 6, sr, sh + 1, s)
    if s >= 2:
        silo(a, x + W * .5 + 3, y - 15, sr - .4, sh + 4, s)
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.4)
    h = [12, 12, 13, 14, 15][s - 1]
    if s <= 2:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_h')
    elif s == 3:
        fp, sp = a.box(x, base, W, h, D, 'wood', 'planks_h')
        a.timber(fp, W, h, 4, braces=False, col='#6a4626')
    else:
        fp, sp = a.box(x, base, W, h, D, 'stone' if s == 4 else 'gstone', 'stone')
    roof = 'thatch' if s <= 3 else 'tile'
    trim = '#e0b450' if s == 5 else None
    r = a.roof_x(x, base - h, W, D, 10 + s, roof, 1.6, 'wood', 'planks_v', trim=trim)
    for i, dxf in enumerate((.27, .73)):
        a.door(x + W * dxf - 2.6, base, 5.2, h * .6, double=True, arch=s >= 4, frame='#a07a4a' if s < 4 else '#efe6cc',
               gold=s == 5)
    a.add(f'<rect x="{n(x + W / 2 - 1.4)}" y="{n(base - h + 2.4)}" width="2.8" height="3" fill="#3a2616" stroke-width=".5"/>')
    a.swindow(sp, 4, 3, 2.2, 2.4)
    a.swindow(sp, 10, 3, 2.2, 2.4)
    if s >= 3:
        a.add(f'<path d="M{n(x + W * .5 - 4)},{n(base - h * .72)}H{n(x + W * .5 + 4)}L{n(x + W * .5 + 5)},{n(base - h * .55)}'
              f'H{n(x + W * .5 - 5)}Z" fill="{a.lin([(0, "#f3ead2"), (1, "#d6c69c")], bb=True)}" stroke-width=".55"/>')
        a.add(a.segpath([((x + W * .5 - 4 + i * 2, base - h * .72), (x + W * .5 - 5 + i * 2.5, base - h * .55)) for i in range(5)],
                        '#e2b040', .9, .9))
    if s >= 4:
        a.banner(x + 1, base - h + 1, 2.2, 7, 'gold')
        a.banner(x + W - 3.2, base - h + 1, 2.2, 7, 'gold')
    if s == 5:
        a.flag(r['R0'][0] + W * .5, r['R0'][1] - 9, 8.4, 'gold', 5, 3.2, tail=True)
    a.sheaf(x - 2, y + 4.4)
    a.sheaf(x + .8, y + 5.6)
    a.sack(x + W * .5, y + 5.4, 2.4)
    a.sack(x + W * .5 + 2.6, y + 5.8, 2.2, '#d0bc8e')
    if s >= 2:
        a.sheaf(x + W + 2, y + 2.4)
    if s >= 3:
        a.cart(x + W - 6, y + 7.4, 'sacks')


# ---------------------------------------------------------------- cranny
def b_cranny(a, s):
    a.ground(30, 9.5)
    cx, by = 37, 90
    rx = [17, 19, 21, 23, 25][s - 1]
    mh = [13, 15, 17, 19, 21][s - 1]
    a.shadow(cx + 4, by - 1, rx + 2, 4.5, .3)
    # mound
    d = (f'M{n(cx - rx)},{n(by)}C{n(cx - rx + 1)},{n(by - mh * .8)} {n(cx - rx * .45)},{n(by - mh)} {n(cx)},{n(by - mh)}'
         f'C{n(cx + rx * .45)},{n(by - mh)} {n(cx + rx - 1)},{n(by - mh * .8)} {n(cx + rx)},{n(by)}'
         f'C{n(cx + rx * .5)},{n(by + 3.4)} {n(cx - rx * .5)},{n(by + 3.4)} {n(cx - rx)},{n(by)}Z')
    g = a.rad([(0, '#c4de8c'), (.45, '#9cc262'), (.85, '#76a044'), (1, '#5e8834')], .36, .25, .8)
    a.add(f'<path d="{d}" fill="{g}"/>')
    cid = a.nid()
    a.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
    # shading on the right flank + grass strokes
    sh = a.lin([(0, '#3a5a1c', 0), (1, '#3a5a1c', .35)], (cx, 0), (cx + rx, 0))
    a.add(f'<g clip-path="url(#{cid})"><ellipse cx="{n(cx + rx * .7)}" cy="{n(by - mh * .3)}" rx="{n(rx * .6)}" ry="{n(mh)}" fill="{sh}" stroke="none"/>')
    r = a.r
    dark, light = [], []
    for _ in range(int(rx * mh * .35)):
        u, v = r.uniform(cx - rx, cx + rx), r.uniform(by - mh, by + 2)
        (dark if r.random() < .5 else light).append(((u, v), (u + r.uniform(-.4, .4), v - r.uniform(1, 1.8))))
    a.add(a.segpath(dark, '#4f7428', .4, .55), a.segpath(light, '#d4eaa0', .35, .6), '</g>')
    a.add(f'<path d="{d}" fill="none"/>')
    if s <= 2:  # wooden hatch set into the slope
        hw, hh = [9, 10][s - 1], [6, 6.6][s - 1]
        hx, hy = cx - hw / 2 - 1, by - 2
        if s == 2:  # stone rim
            for i in range(9):
                ang = math.pi * (1.05 + .9 * i / 8)
                sx, sy = cx - 1 + (hw * .72) * math.cos(ang), hy - hh * .45 + (hh * .85) * math.sin(ang) * .9
                a.add(f'<ellipse cx="{n(sx)}" cy="{n(sy)}" rx="1.5" ry="1" fill="{a.rad([(0, "#e2dccb"), (1, "#9c9482")], .35, .3, .8)}" '
                      f'stroke-width=".5"/>')
        a.poly([(hx, hy), (hx + 1.6, hy - hh), (hx + hw - 1.6, hy - hh), (hx + hw, hy)], '#2a1c10')
        hp = Plane((hx + 1.6, hy - hh), (1, 0), unit((-.3, 1)))
        lid = [(hx + 1.2, hy - hh * .2), (hx + 2.4, hy - hh - 2.4), (hx + hw - .6, hy - hh - 2.4), (hx + hw - 1.6, hy - hh * .2)]
        a.face(Plane(lid[1], (1, 0), unit(sub(lid[0], lid[1]))), lid, 'wood', 'F', ('planks_v', 1.6))
        a.add(a.segpath([((lid[0][0] + .6, lid[0][1] - 1.4), (lid[3][0] - .6, lid[3][1] - 1.4)),
                         ((lid[1][0] + .1, lid[1][1] + 1.4), (lid[2][0] - .3, lid[2][1] + 1.4))], '#3a3430', .6, 1))
        a.add(f'<circle cx="{n(cx - 1)}" cy="{n(hy - hh * .6)}" r=".6" fill="none" stroke="#3a3430" stroke-width=".5" stroke-opacity="1"/>')
        a.line([(lid[2][0] - .5, lid[2][1] + .3), (lid[2][0] + 1.6, lid[2][1] + 3.2)], '#5a3a1e', .6, 1)
    else:  # stone arch entrance with a door
        dw, dh = [0, 0, 9, 10, 11][s - 1], [0, 0, 10, 11, 12][s - 1]
        dx_ = cx - dw / 2 - 1
        sw = 'stone' if s < 5 else 'gstone'
        c = MAT[sw]
        g = a.lin([(0, c[0]), (1, c[1])], bb=True)
        a.add(f'<path d="{a._arch(dx_ - 2, by + .6, dw + 4, dh + 2, True)}" fill="{g}"/>')
        for i in range(9):  # voussoirs
            ang = math.pi * (1 + i / 8)
            rr = (dw + 4) / 2
            ccx, ccy = dx_ + dw / 2, by + .6 - dh - 2 + rr
            a.add(a.segpath([((ccx + (rr - 2) * math.cos(ang), ccy + (rr - 2) * math.sin(ang)),
                              (ccx + rr * math.cos(ang), ccy + rr * math.sin(ang)))], c[4], .4, .7))
        a.door(dx_, by + .6, dw, dh, arch=True, frame=dk(c[1], .1), gold=s == 5, double=s >= 4)
        if s == 5:
            a.add(f'<path d="{a._arch(dx_ - 2, by + .6, dw + 4, dh + 2, True)}" fill="none" stroke="#e0b450" stroke-width=".6" '
                  f'stroke-opacity="1"/>')
        for i in range(3 if s < 5 else 4):  # stepping stones
            a.add(f'<ellipse cx="{n(cx - 1 + (i - 1) * 2.4)}" cy="{n(a.cl(by + 2.6 + i * 1.4) - .8)}" rx="1.8" ry=".8" '
                  f'fill="{a.rad([(0, "#e2dccb"), (1, "#9c9482")], .35, .3, .8)}" stroke-width=".5"/>')
    if s >= 4:  # vent pipe + lanterns
        vx = cx + rx * .45
        a.cylinder(vx, by - mh * .78, 1.1, 3.6, 'stone', 'stone', .4)
        a.add(f'<ellipse cx="{n(vx)}" cy="{n(by - mh * .78 - 3.6)}" rx="1.1" ry=".45" fill="#2a1c10" stroke-width=".5"/>')
        a.lantern(cx - 9, by + 2, 6)
        a.lantern(cx + 7, by + 2, 6)
        a.barrel(cx + rx - 2, by + 3)
    if s == 5:
        a.flag(cx - 2, by - mh - 8, 9, 'red', 4.4, 3, tail=True)
        a.sack(cx + rx - 5.6, by + 4.4, 2)
    # bushes and stones
    a.bush(cx - rx + 2, by + 2.5, 2.4)
    a.bush(cx + rx - (6 if s >= 4 else 2), by + 3, 2)
    if s >= 2:
        a.bush(cx - rx * .55, by - mh * .7, 1.6)
    a.rocks(cx + 6, by + 5, .7)


# ---------------------------------------------------------------- embassy
EMB_FLAGS = ['red', 'blue', 'green', 'gold', 'purple', 'teal', 'orange']


def b_embassy(a, s):
    a.ground(34, 10.5, dirt=.35)
    W = [18, 21, 23, 24, 25][s - 1]
    D = [12, 13, 14, 14, 15][s - 1]
    x, y = centre(W, D)
    x += 1
    a.bshadow(x, y, W, D, 14)
    nflags = [2, 3, 4, 5, 6][s - 1]
    # flags behind on the left side
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.4)
    if s <= 2:
        h = 11 if s == 1 else 12
        fp, sp = a.box(x, base, W, h, D, 'plaster', 'plaster')
        a.timber(fp, W, h, 3, rail=False)
        a.timber(sp, D, h, 2, rail=False, braces=False)
        r = a.roof_x(x, base - h, W, D, 9 + s, 'thatch' if s == 1 else 'shingle', 1.5, 'plaster', 'plaster')
        a.door(x + W / 2 - 2, base, 4, 6.8)
        a.window(x + 2.2, base - 8.4, 2.6, 3.2, shutters='#6a7a8a')
        a.window(x + W - 4.8, base - 8.4, 2.6, 3.2, shutters='#6a7a8a')
        a.swindow(sp, 4.5, 3, 2.4, 3)
        if s == 2:
            a.banner(x + W / 2 - 4.4, base - h + 1.2, 1.8, 5.6, 'blue')
            a.banner(x + W / 2 + 2.6, base - h + 1.2, 1.8, 5.6, 'green')
    else:
        h1, h2 = 9, 8 + (s - 3) * .5
        wm = 'plaster' if s == 3 else 'stone' if s == 4 else 'gstone'
        fp, sp = a.box(x, base, W, h1, D, wm, 'plaster' if s == 3 else 'stone')
        fp2, sp2 = a.box(x, base - h1, W, h2, D, 'plaster', 'plaster')
        a.quoins(fp2, W, h2)
        if s == 3:
            a.quoins(fp, W, h1)
        a.add(a.segpath([((x - .3, base - h1), (x + W + .3, base - h1))], '#e0b450' if s == 5 else '#8a7a5e', .9, 1))
        roofm = 'slate' if s < 5 else 'tile'
        trim = '#e0b450' if s >= 4 else None
        r = a.roof_x(x, base - h1 - h2, W, D, 10 + s, roofm, 1.5, 'plaster', 'plaster', trim=trim, hip=s >= 4)
        for i in range(4):
            a.window(x + 2.2 + i * (W - 6.6) / 3, base - h1 - h2 + 2.4, 2.2, 3.4, arch=True)
        a.swindow(sp2, 3.5, 2.4, 2.2, 3)
        a.swindow(sp2, 8.5, 2.4, 2.2, 3)
        a.swindow(sp, 6, 2.6, 2.2, 3.2)
        if s >= 4:  # dome / cupola over the ridge
            top = ((r['R0'][0] + r['R1'][0]) / 2, r['R0'][1])
            dr = 4 if s == 4 else 4.8
            a.cylinder(top[0], top[1] + 1, dr - .6, 3, 'gstone', 'stone', .3)
            a.dome(top[0], top[1] - 2, dr, 'slate' if s == 4 else 'gold', trim='#e0b450')
            a.finial(top[0], top[1] - 2 - dr, 2.5)
        # columned portico
        pw = 11 if s < 5 else 13
        px_ = x + W / 2 - pw / 2
        pp = pt(px_, base, -2.4)
        a.door(x + W / 2 - 2.2, base, 4.4, 7, arch=True, frame='#efe6cc', double=True, gold=s == 5)
        ncol = 4
        for i in range(ncol):
            ccx = pp[0] + .9 + i * (pw - 1.8) / (ncol - 1)
            a.cylinder(ccx, pp[1], .75, h1 - .6, 'gstone', None, .4)
        pr = pt(px_ - .6, base, -2.9, h1 - .6)
        pdat = a.roof_z(pr[0], pr[1], pw + 1.2, 2.9, 3.6, 'gstone', .4, 'gstone', None, trim='#e0b450' if s == 5 else None, back=False)
        st = pt(px_ - .6, y, -3.2)
        a.box(st[0], st[1] + .2, pw + 1.2, 1, 3.2, 'stone', top=True)
        a.window(x + 2.2, base - h1 + 2.4, 2.2, 3.4, arch=True)
        a.window(x + W - 4.4, base - h1 + 2.4, 2.2, 3.4, arch=True)
    # flag row in front
    fy = y + 3.2
    span = [14, 22, 26, 34, 40][s - 1]
    for i in range(nflags):
        fx = 37 - span / 2 + span * i / max(1, nflags - 1) + (1 if s == 1 else 0)
        if nflags > 2 and 0 < i < nflags - 1 and s >= 3 and abs(fx - (x + W / 2)) < 9:
            continue
        a.flag(fx, fy - 18 - (i % 2), 18 + (i % 2), EMB_FLAGS[i % len(EMB_FLAGS)], 5, 3.4, -1 if fx < 37 else 1)
    if s == 3:
        for i, col in enumerate(EMB_FLAGS[:min(nflags, 5)]):
            if i < nflags:
                a.pennant(r['R0'][0] + (r['R1'][0] - r['R0'][0]) * (i + .5) / min(nflags, 5), r['R0'][1] - 5, 5, col, 3.4)
    if s == 5:
        a.lantern(x - 1, y + 3.4, 6)
        a.lantern(x + W + 2.5, y + 2.4, 6)


# ---------------------------------------------------------------- market
GOODS = ['#d8a03a', '#b8402e', '#7f9e4c', '#e8c060', '#8a5a9a', '#c8783a']


def b_market(a, s):
    a.ground(34, 10.5, pave=1)
    g = a.rad([(0, '#e4d3a6', .95), (.75, '#d8c393', .7), (1, '#cdb582', 0)], .5, .5, .5)
    a.add(f'<ellipse cx="37" cy="88" rx="{n(22 + s)}" ry="{n(7 + s * .3)}" fill="{g}" stroke="none"/>')
    if s >= 3:  # market hall behind
        W, D = [0, 0, 22, 26, 28][s - 1], [0, 0, 11, 12, 13][s - 1]
        hx, hy = 37 - (W + CX * D) / 2 + 2, 80.5
        a.bshadow(hx, hy, W, D, 12, .25)
        x, base = plinth(a, hx, hy, W, D, 1.8)
        h = [0, 0, 10, 11, 12][s - 1]
        wm = 'plaster' if s == 3 else 'stone' if s == 4 else 'gstone'
        fp, sp = a.box(x, base, W, h, D, wm, 'plaster' if s == 3 else 'stone')
        if s == 3:
            a.timber(fp, W, h, 4, rail=False)
        # arcade openings
        k = 3 if s == 3 else 4
        for i in range(k):
            ax_ = x + 1.6 + i * (W - 3.2) / k
            aw = (W - 3.2) / k - 1.4
            a.add(f'<path d="{a._arch(ax_ + .2, base, aw, h * .72, True)}" fill="{a.lin([(0, "#2a2018"), (1, "#5a4028")], bb=True)}"/>')
        roofm = 'shingle' if s == 3 else 'tile'
        trim = '#e0b450' if s == 5 else None
        r = a.roof_x(x, base - h, W, D, 9 + s, roofm, 1.5, wm, 'plaster', trim=trim, hip=s == 5)
        if s >= 4:
            top = ((r['R0'][0] + r['R1'][0]) / 2, r['R0'][1])
            a.box(top[0] - 2, top[1] + 1.5, 4, 4, 3, 'wood', 'planks_v')
            a.roof_hip(top[0] - 2, top[1] - 2.5, 4, 3, 4, roofm, .6, trim=trim, finial=2.4)
        if s == 5:
            a.flag(r['R0'][0] - .5, r['R0'][1] - 8, 8, 'red', 4.4, 3, -1)
            a.flag(r['R1'][0] + .5, r['R1'][1] - 8, 8, 'gold', 4.4, 3)
    if s == 2:  # open timber shelter behind the stalls
        sx_, sy_ = 22, 82
        a.bshadow(sx_, sy_, 16, 7, 8, .22)
        for px, z in ((sx_ + .5, 6.5), (sx_ + 15.5, 6.5)):
            a.line([pt(px, sy_, z), pt(px, sy_, z, 7)], '#5a3a1e', 1, 1)
        a.crate(sx_ + 3, sy_ - 2, 3)
        a.sack(sx_ + 9, sy_ - 2.4, 2.4)
        a.barrel(sx_ + 13, sy_ - 2.6)
        for px in (sx_ + .5, sx_ + 15.5):
            a.line([(px, sy_), (px, sy_ - 7)], '#6a4626', 1.1, 1)
        a.roof_x(sx_, sy_ - 7, 16, 7, 4.5, 'thatch', 1.2, 'wood', 'planks_v')
    # stalls in front
    st = {1: [(16, 90, 10, 'red', 0), (39, 87, 10, 'gold', 1)],
          2: [(10, 91, 9, 'red', 0), (27, 87, 9, 'gold', 1), (44, 91, 9, 'green', 2)],
          3: [(10.5, 93, 8.5, 'red', 0), (26, 95, 8.5, 'gold', 1), (41.5, 93, 8.5, 'green', 2)],
          4: [(9.5, 92, 8, 'red', 0), (23.5, 95, 8, 'gold', 1), (38, 95, 8, 'green', 2), (52, 91, 7.5, 'blue', 3)],
          5: [(9.5, 92, 8, 'red', 0), (23.5, 95, 8, 'gold', 1), (38, 95, 8, 'green', 2), (52, 91, 7.5, 'purple', 3)]}[s]
    for sx, sy, sw, col, k in sorted(st, key=lambda t: t[1]):
        a.shadow(sx + sw / 2 + 4, sy + .5, sw / 2 + 2.5, 2.2, .25)
        a.stall(sx, sy, sw, col, [GOODS[(k + j) % len(GOODS)] for j in range(3)])
    if s <= 2:
        a.crate(30, 95, 3)
        a.sack(36, 96, 2.2)
        a.barrel(55 if s == 1 else 60, 95)
    if s >= 4:
        a.cart(56, 99.5, 'crates', -1)
        a.sack(17, 98.5, 2.2)
    if s == 5:
        a.lantern(36, 99, 6)
        a.crate(12, 98.6, 2.6)


# ---------------------------------------------------------------- trade office
def b_tradeoffice(a, s):
    a.ground(34, 10.5, dirt=.4)
    W = [18, 21, 22, 23, 24][s - 1]
    D = [12, 13, 14, 14, 15][s - 1]
    x, y = centre(W, D)
    x += 2 if s < 4 else 3.6
    a.bshadow(x, y, W, D, 14)
    if s >= 4:  # side annex (store) on the left
        ax_, ay = pt(x - 9, y, 1.5)
        fpa, spa = a.box(ax_, ay, 10, 8, D - 5, 'wood', 'planks_v', side=False)
        a.roof_x(ax_, ay - 8, 10, D - 5, 5, 'tile' if s == 5 else 'shingle', 1.0, 'wood', 'planks_v')
        a.door(ax_ + 2, ay, 3.6, 5.4, double=True, frame='#a07a4a')
    base = y
    if s >= 3:
        x, base = plinth(a, x, y, W, D, 2.2)
    trim = '#e0b450' if s == 5 else None
    if s <= 2:
        h = 11 + s
        fp, sp = a.box(x, base, W, h, D, 'plaster', 'plaster')
        a.timber(fp, W, h, 3)
        a.timber(sp, D, h, 2, braces=False)
        r = a.roof_z(x, base - h, W, D, 9 + s, 'thatch' if s == 1 else 'shingle', 1.4, 'plaster', 'plaster')
        a.door(x + 2.4, base, 4, 6.8)
        a.window(x + W - 7, base - 8.4, 4.4, 3.4, shutters='#8a6a3a')
        a.swindow(sp, 4.5, 3, 2.4, 3)
        a.sign(x + W - .5, base - h + 1.6)
        top_h = h
    else:
        h1, h2 = 9, 8 + (s - 3) * .5
        wm = 'plaster' if s == 3 else 'stone' if s == 4 else 'gstone'
        fp, sp = a.box(x, base, W, h1, D, wm, 'plaster' if s == 3 else 'stone')
        if s == 3:
            a.timber(fp, W, h1, 3, rail=False)
        ux, uy = pt(x, base - h1, -.8)
        fp2, sp2 = a.box(ux, uy, W, h2, D + .8, 'plaster', 'plaster')
        if s < 5:
            a.timber(fp2, W, h2, 3, rail=False)
        else:
            a.quoins(fp2, W, h2)
        a.add(a.segpath([((ux - .2, uy), (ux + W + .2, uy))], trim or '#5a3a1e', 1.1, 1))
        r = a.roof_z(ux, uy - h2, W, D + .8, 11 + s, 'shingle' if s == 3 else 'tile', 1.5, 'plaster', 'plaster', trim=trim)
        ap = r['apex']
        if s == 5:  # gold scales medallion on the gable
            g = a.rad([(0, '#fff3c4'), (.6, '#e8c05a'), (1, '#a07020')], .35, .3, .75)
            a.add(f'<circle cx="{n(ap[0])}" cy="{n(ap[1] + 6.4)}" r="3.4" fill="{g}" stroke-width=".6"/>')
            a.scale_icon(ap[0], ap[1] + 6.6, .5, '#7a4e1a')
        else:
            a.window(ap[0] - 1.2, ap[1] + 4.6, 2.4, 3, arch=True)
        for i in range(3):
            a.window(ux + 2.4 + i * (W - 7.2) / 2, uy - h2 + 2.4, 2.4, 3.2, arch=s == 5, shutters='#8a6a3a' if s == 3 else None)
        a.swindow(sp2, 4, 2.4, 2.4, 3)
        a.swindow(sp2, 9.5, 2.4, 2.4, 3)
        a.door(x + W / 2 - 2.2, base, 4.4, 7, arch=True, frame='#efe6cc', gold=s == 5)
        # counting-room bay window
        a.window(x + 2, base - h1 + 2.6, 4.4, 3.6, arch=False)
        a.window(x + W - 6.4, base - h1 + 2.6, 4.4, 3.6, arch=False)
        a.swindow(sp, 5, 2.6, 2.4, 3)
        a.sign(x + W - .4, base - h1 - 1.2, '#f0cc60' if s == 5 else '#e8c050')
        st = pt(x + W / 2 - 3, y, -1.4)
        a.box(st[0], st[1] + .3, 6, 1, 1.6, 'stone', top=True)
        if s >= 4:
            a.banner(x + .8, uy - h2 + 1.2, 2, 6.5, 'gold' if s == 5 else 'red')
        if s == 5:
            a.flag(ap[0], ap[1] - 9, 8.6, 'gold', 5, 3.2, tail=True)
            a.lantern(x - 1.2, y + 2.6, 6.5)
    # carts and goods
    a.cart(x - 6.5 if s < 4 else x + W - 4, y + 5.2 if s < 4 else y + 6.4, 'sacks' if s % 2 else 'crates',
           1 if s < 4 else -1)
    a.crate(x + W + 1.4, y + 2.2, 3)
    if s >= 2:
        a.sack(x + W + 6, y + 2.2, 2.2)
    if s >= 3:
        a.barrel(x - 2, y + 2.4 if s < 4 else y + 4)


ZOOM = {'main': 1.24, 'rally': 1.18, 'warehouse': 1.3, 'granary': 1.35, 'greatwarehouse': 1.1, 'greatgranary': 1.24,
        'cranny': 1.25, 'embassy': 1.3, 'market': 1.15, 'tradeoffice': 1.3}

BUILDINGS = {
    'main': b_main, 'rally': b_rally, 'warehouse': b_warehouse, 'granary': b_granary,
    'greatwarehouse': b_greatwarehouse, 'greatgranary': b_greatgranary, 'cranny': b_cranny,
    'embassy': b_embassy, 'market': b_market, 'tradeoffice': b_tradeoffice,
}
PFX = {'main': 'mn', 'rally': 'rp', 'warehouse': 'wh', 'granary': 'gr', 'greatwarehouse': 'gw',
       'greatgranary': 'gg', 'cranny': 'cr', 'embassy': 'em', 'market': 'mk', 'tradeoffice': 'to'}


def render(bid, s, budget=39000):
    W, H = (69, 120) if bid == 'rally' else (75, 100)
    for dens in (1.0, .85, .7, .55, .45, .35, .25):
        DENS[0] = dens
        a = Art(f'{bid}{s}-', W, H)
        BUILDINGS[bid](a, s)
        out = a.svg()
        if len(out.encode()) <= budget:
            break
    DENS[0] = 1.0
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for bid in BUILDINGS:
        for s in range(1, 6):
            name = f'{bid}.svg' if s == 1 else f'{bid}-{s}.svg'
            (OUT / name).write_text(render(bid, s))


if __name__ == '__main__':
    main()
