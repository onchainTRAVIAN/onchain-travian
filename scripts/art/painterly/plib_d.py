"""Painterly SVG helpers for art set D (buildings_d.py, walls.py).

Original art. Warm daylight from the top-left, soft blurred cast shadows to the bottom-right,
every surface a lit->shade gradient plus light texture strokes, soft dark-brown outlines.
Only plain SVG shapes, gradients, blur filters, clipPaths and masks are emitted.
"""
import math
import random

OUT = '#3b2a17'
ROOT = '/home/suruja/work/crypto wapgame/src/web/public/img'

# oblique projection used by the buildings: depth recedes up and to the right
DX, DY = .5, -.36


def n(v):
    v = round(v, 1)
    if v == int(v):
        return str(int(v))
    s = f'{v:.1f}'
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return s


def pt(x, y):
    return f'{n(x)},{n(y)}'


def poly_d(pts, close=True):
    return 'M' + ' '.join(pt(x, y) for x, y in pts) + ('Z' if close else '')


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(a, b))


def dep(p, d):
    """point p pushed back by depth d"""
    return (p[0] + d * DX, p[1] + d * DY)


class Art:
    def __init__(self, pre, w=75, h=100, sw=.9, op=.7):
        self.pre = pre
        self.w, self.h = w, h
        self.sw, self.op = sw, op
        self.defs = []
        self.keys = {}
        self.out = []

    # ---- defs ----
    def _id(self, key, make):
        if key not in self.keys:
            i = f'{self.pre}_{len(self.keys):x}'
            self.keys[key] = i
            self.defs.append(make(i))
        return self.keys[key]

    @staticmethod
    def _stops(stops):
        o = ''
        for s in stops:
            off, col = s[0], s[1]
            op = f' stop-opacity="{n(s[2]) if s[2] >= .1 else round(s[2], 2)}"' if len(s) > 2 and s[2] < 1 else ''
            o += f'<stop offset="{n(off)}" stop-color="{col}"{op}/>'
        return o

    def lg(self, stops, x1=0, y1=0, x2=0, y2=1, user=False):
        key = ('lg', tuple(tuple(s) for s in stops), x1, y1, x2, y2, user)
        u = ' gradientUnits="userSpaceOnUse"' if user else ''
        i = self._id(key, lambda i: f'<linearGradient id="{i}" x1="{n(x1)}" y1="{n(y1)}" x2="{n(x2)}" y2="{n(y2)}"{u}>'
                     f'{self._stops(stops)}</linearGradient>')
        return f'url(#{i})'

    def rg(self, stops, cx=.5, cy=.5, r=.5, fx=None, fy=None, user=False):
        key = ('rg', tuple(tuple(s) for s in stops), cx, cy, r, fx, fy, user)
        u = ' gradientUnits="userSpaceOnUse"' if user else ''
        f = (f' fx="{n(fx)}"' if fx is not None else '') + (f' fy="{n(fy)}"' if fy is not None else '')
        i = self._id(key, lambda i: f'<radialGradient id="{i}" cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}"{f}{u}>'
                     f'{self._stops(stops)}</radialGradient>')
        return f'url(#{i})'

    def blur(self, sd, user=None):
        """gaussian blur filter; user=(x,y,w,h) for a fixed user-space region"""
        key = ('blur', sd, user)
        if user:
            reg = f' filterUnits="userSpaceOnUse" x="{user[0]}" y="{user[1]}" width="{user[2]}" height="{user[3]}"'
        else:
            reg = ' x="-50%" y="-50%" width="200%" height="200%"'
        i = self._id(key, lambda i: f'<filter id="{i}"{reg}><feGaussianBlur stdDeviation="{sd}"/></filter>')
        return f'url(#{i})'

    def clip(self, d):
        key = ('clip', d)
        i = self._id(key, lambda i: f'<clipPath id="{i}"><path d="{d}"/></clipPath>')
        return f'url(#{i})'

    # ---- elements ----
    def add(self, *s):
        self.out.extend(s)

    def _paint(self, fill, stroke, sw, op, extra):
        a = f' fill="{fill}"'
        if stroke is None or stroke is False:
            a += ' stroke="none"'
        elif stroke is not True:
            a += f' stroke="{stroke}"'
        if sw is not None:
            a += f' stroke-width="{n(sw) if sw >= .1 else round(sw, 2)}"'
        if op is not None and op < 1:
            a += f' opacity="{round(op, 2)}"'
        return a + extra

    def path(self, d, fill='none', stroke=True, sw=None, op=None, extra=''):
        if not d:
            return
        self.out.append(f'<path d="{d}"{self._paint(fill, stroke, sw, op, extra)}/>')

    def poly(self, pts, fill, stroke=True, sw=None, op=None, extra=''):
        self.path(poly_d(pts), fill, stroke, sw, op, extra)

    def ell(self, cx, cy, rx, ry, fill, stroke=True, sw=None, op=None, extra=''):
        self.out.append(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}"{self._paint(fill, stroke, sw, op, extra)}/>')

    def circ(self, cx, cy, r, fill, stroke=True, sw=None, op=None, extra=''):
        self.out.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}"{self._paint(fill, stroke, sw, op, extra)}/>')

    def line(self, d, color, w, op=None, extra=''):
        """texture / detail strokes (no fill)"""
        self.path(d, 'none', color, w, op, extra)

    def group(self, inner, extra):
        self.out.append(f'<g{extra}>')
        self.out.extend(inner)
        self.out.append('</g>')

    def svg(self):
        d = f'<defs>{"".join(self.defs)}</defs>' if self.defs else ''
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}">{d}'
                f'<g stroke="{OUT}" stroke-width="{n(self.sw)}" stroke-opacity="{self.op}" stroke-linejoin="round" '
                f'stroke-linecap="round">{"".join(self.out)}</g></svg>')


# ---------------------------------------------------------------------------------------------
# palette: (lit, mid, shade, dark)
STONE = ('#ece3cf', '#d6cab0', '#b0a184', '#857760')
STONE_G = ('#dcdad2', '#c3c0b5', '#9b978b', '#74706a')     # grey stone
MARBLE = ('#fbf7ee', '#ece4d2', '#cdbf9f', '#a8987a')
PLASTER = ('#f8efdb', '#ecdcb9', '#cdb78e', '#a8916a')
WOOD = ('#d6a46c', '#b98450', '#8d5f35', '#64412a')
WOOD_D = ('#b08058', '#91653f', '#6d4a2c', '#4e341f')
BRICK = ('#d68662', '#bb6a4b', '#94503a', '#6e3a2b')
CLAY = ('#d9a479', '#c18a60', '#9a6845', '#764e33')
TILE = ('#e08a5d', '#c86a45', '#9e4c31', '#773624')
SLATE = ('#a7b0b3', '#87929a', '#646f78', '#4b545c')
THATCH = ('#f0d58f', '#ddb867', '#b58d42', '#87652d')
GOLD = ('#fbe7a0', '#e6bb4c', '#b88a26', '#8a6519')
IRON = ('#d4d8dc', '#9aa1a8', '#6c737b', '#4b5157')
ORE = ('#9a6a52', '#7a4c3a', '#583528', '#3d241b')
LEAF = ('#a8c868', '#7fa448', '#5c8034', '#3f5e25')


def face_lg(a, c, kind='front'):
    """standard gradients: front faces lit (top-left -> bottom-right), side faces in shade"""
    lit, mid, sh, dk = c
    if kind == 'front':
        return a.lg([(0, lit), (.55, mid), (1, mix(mid, sh, .45))], 0, 0, 1, 1)
    if kind == 'side':
        return a.lg([(0, mix(mid, sh, .55)), (1, mix(sh, dk, .35))], 0, 0, 1, .4)
    if kind == 'top':
        return a.lg([(0, lit), (1, mid)], 0, 0, 1, 1)
    if kind == 'roof':        # slope facing the viewer, ridge at top
        return a.lg([(0, mix(lit, mid, .2)), (.6, mid), (1, mix(mid, sh, .5))], 0, 0, .3, 1)
    if kind == 'roofside':
        return a.lg([(0, mix(mid, sh, .5)), (1, sh)], 0, 0, 1, .6)
    if kind == 'cyl':
        return a.lg([(0, mix(mid, sh, .25)), (.28, lit), (.55, mid), (.85, sh), (1, mix(sh, dk, .5))], 0, 0, 1, 0)
    raise ValueError(kind)


# ---- ground ----------------------------------------------------------------------------------
def ground(a, cx=37, cy=87, rx=33, ry=10, dirt=False):
    """the pale building plot (same footprint as the village plots) with a soft rim"""
    a.ell(cx + .5, cy + .6, rx + 1.2, ry + 1.1, a.rg([(0, '#b9d08a', .0), (.75, '#b9d08a', .35), (1, '#b9d08a', 0)]), None)
    a.ell(cx, cy, rx, ry, a.rg([(0, '#e6eecb'), (.7, '#d6e4b0'), (1, '#c4d898', .6)], .45, .4, .6), None)
    if dirt:
        a.ell(cx + 1, cy - .5, rx * .72, ry * .62, a.rg([(0, '#d9c79c'), (.7, '#d2bf92', .8), (1, '#d2bf92', 0)]), None)


def shadow(a, cx, cy, rx, ry, op=.3, sd=1.6):
    a.ell(cx, cy, rx, ry, '#2a1d0e', None, None, op, f' filter="{a.blur(sd)}"')


def tufts(a, pts, col='#8fae5a', s=1.0):
    d = ''
    for x, y in pts:
        d += f'M{pt(x - 1.3 * s, y)}l{n(.5 * s)},{n(-1.5 * s)}l{n(.4 * s)},{n(1.5 * s)}l{n(.5 * s)},{n(-1.9 * s)}l{n(.4 * s)},{n(1.9 * s)}l{n(.4 * s)},{n(-1.3 * s)}l{n(.3 * s)},{n(1.3 * s)}'
    a.line(d, col, .55)


def pebbles(a, pts):
    for x, y, r in pts:
        a.ell(x, y, r, r * .6, a.rg([(0, '#f2eee4'), (1, '#b8b2a2')], .35, .3, .7), True, .4)


# ---- solids ----------------------------------------------------------------------------------
def box(a, x, y, w, h, d, c, top=False, sides=True, front_fill=None, side_fill=None, sw=None):
    """3/4 box: front face x..x+w bottom at y, height h, right side receding by depth d.
    Returns the corners dict for detailing."""
    F = [(x, y), (x + w, y), (x + w, y - h), (x, y - h)]
    br = dep((x + w, y), d)
    S = [(x + w, y), br, (br[0], br[1] - h), (x + w, y - h)]
    if sides and d > 0:
        a.poly(S, side_fill or face_lg(a, c, 'side'), True, sw)
    a.poly(F, front_fill or face_lg(a, c, 'front'), True, sw)
    if top:
        T = [(x, y - h), (x + w, y - h), dep((x + w, y - h), d), dep((x, y - h), d)]
        a.poly(T, face_lg(a, c, 'top'), True, sw)
    return {'F': F, 'S': S, 'x': x, 'y': y, 'w': w, 'h': h, 'd': d}


def roof_x(a, x, y, w, d, rise, c, over=1.4, kind='tile', ridge_cap=True):
    """gable roof with the ridge running left-right; y = eave height at the front wall.
    Draws the front slope and the right gable end; returns key points."""
    E1, E2 = (x - over, y + over * .35), (x + w + over, y + over * .35)
    R1, R2 = dep((x - over * .7, y - rise), d / 2), dep((x + w + over * .7, y - rise), d / 2)
    g1, g2, g3 = (x + w, y), dep((x + w, y), d), dep((x + w, y - rise), d / 2)
    # gable end (wall colour drawn by caller under it) - barge board
    a.poly([g1, g3, g2], face_lg(a, c.get('gable', PLASTER), 'side'), True)
    a.poly([E1, E2, R2, R1], face_lg(a, c['roof'], 'roof'), True)
    roof_texture(a, E1, E2, R2, R1, c['roof'], kind)
    # barge board on the gable end
    a.line(f'M{pt(*E2)}L{pt(*R2)}L{pt(*dep((x + w + over, y + over * .35), d))}', c['roof'][3], .9)
    a.line(f'M{pt(*E2)}L{pt(*R2)}', c['roof'][2], .5)
    if ridge_cap:
        a.line(f'M{pt(*R1)}L{pt(*R2)}', c['roof'][3], 1.2, .8)
        a.line(f'M{pt(R1[0] + .2, R1[1] - .3)}L{pt(R2[0] - .5, R2[1] - .3)}', c['roof'][0], .4, .8)
    return {'E1': E1, 'E2': E2, 'R1': R1, 'R2': R2, 'g1': g1, 'g2': g2, 'g3': g3}


def roof_d(a, x, y, w, d, rise, c, over=1.4, kind='tile', gable_fill=None):
    """gable roof with the gable facing the viewer (ridge running back). Draws the front gable
    triangle (wall), the right slope and the front roof edge boards."""
    T = [(x, y), (x + w, y), (x + w / 2, y - rise)]
    a.poly(T, gable_fill or face_lg(a, c.get('gable', PLASTER), 'front'), True)
    A = (x + w / 2, y - rise - over * .6)
    E = (x + w + over, y + over * .55)
    S = [A, E, dep(E, d), dep(A, d)]
    a.poly(S, face_lg(a, c['roof'], 'roofside'), True)
    roof_texture(a, E, dep(E, d), dep(A, d), A, c['roof'], kind, side=True)
    # left slope edge (only the thick front edge shows)
    L = (x - over, y + over * .55)
    a.poly([L, A, (A[0], A[1] + 1.6), (L[0] + 1.2, L[1])], c['roof'][1], True, .6)
    a.poly([A, E, (E[0] - 1.2, E[1]), (A[0], A[1] + 1.6)], c['roof'][2], True, .6)
    return {'A': A, 'E': E, 'L': L}


def roof_texture(a, E1, E2, R2, R1, c, kind, side=False, seed=3):
    """rows of tiles / thatch strands / slates across a slope quad E1-E2 (eave) R1-R2 (ridge)"""
    r = random.Random(seed + int(E1[0] * 7 + E1[1] * 3))
    lit, mid, sh, dk = c
    if kind in ('tile', 'slate', 'shingle'):
        rows = max(2, int(math.hypot(R1[0] - E1[0], R1[1] - E1[1]) / (2.0 if kind == 'tile' else 2.3)))
        dd = ''
        dl = ''
        for k in range(1, rows + 1):
            t = k / (rows + .3)
            p1, p2 = lerp(E1, R1, t), lerp(E2, R2, t)
            dd += f'M{pt(*p1)}L{pt(*p2)}'
            # little tile edges
            L = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            cols = int(L / (2.2 if kind == 'tile' else 3.0))
            q1, q2 = lerp(E1, R1, (k - 1) / (rows + .3) + .02), lerp(E2, R2, (k - 1) / (rows + .3) + .02)
            for j in range(1, cols):
                u = (j + (.5 if k % 2 else 0)) / cols
                if u >= 1:
                    continue
                aa, bb = lerp(p1, p2, u), lerp(q1, q2, u)
                dl += f'M{pt(*aa)}L{pt(*bb)}'
        a.line(dd, dk, .45 if kind == 'tile' else .4, .55)
        a.line(dl, sh, .35, .5)
        # light sheen on upper edges of rows
        a.line(dd, lit, .3, .35, f' transform="translate(0 -.5)"')
    elif kind == 'thatch':
        dd = ''
        cnt = int(math.hypot(E2[0] - E1[0], E2[1] - E1[1]) * 1.3)
        for _ in range(cnt):
            u = r.random()
            t0 = r.uniform(0, .75)
            t1 = min(1, t0 + r.uniform(.15, .35))
            p0 = lerp(lerp(E1, E2, u), lerp(R1, R2, u), t0)
            p1 = lerp(lerp(E1, E2, u), lerp(R1, R2, u), t1)
            dd += f'M{pt(*p0)}L{pt(*p1)}'
        a.line(dd, sh, .35, .6)
        # combed eave line
        a.line(f'M{pt(*lerp(E1, R1, .12))}L{pt(*lerp(E2, R2, .12))}', dk, .5, .4)
        a.line(f'M{pt(*lerp(E1, R1, .55))}L{pt(*lerp(E2, R2, .55))}', lit, .6, .5)


def cyl(a, cx, y, r1, h, c, r2=None, e=.38, top=True, top_fill=None):
    """(tapered) cylinder standing at y; returns top centre"""
    r2 = r1 if r2 is None else r2
    ty = y - h
    d = (f'M{pt(cx - r1, y)}L{pt(cx - r2, ty)}A{n(r2)},{n(r2 * e)} 0 0 1 {pt(cx + r2, ty)}'
         f'L{pt(cx + r1, y)}A{n(r1)},{n(r1 * e)} 0 0 1 {pt(cx - r1, y)}Z')
    a.path(d, face_lg(a, c, 'cyl'))
    if top:
        a.ell(cx, ty, r2, r2 * e, top_fill or face_lg(a, c, 'top'))
    return (cx, ty)


def cone(a, cx, y, r, h, c, e=.38, kind='tile'):
    d = f'M{pt(cx - r, y)}L{pt(cx, y - h)}L{pt(cx + r, y)}A{n(r)},{n(r * e)} 0 0 1 {pt(cx - r, y)}Z'
    a.path(d, face_lg(a, c, 'cyl'))
    lit, mid, sh, dk = c
    if kind == 'tile':
        dd = ''
        for k in range(1, 4):
            t = k / 4
            rr = r * t
            yy = y - h * (1 - t)
            dd += f'M{pt(cx - rr, yy)}A{n(rr)},{n(rr * e)} 0 0 0 {pt(cx + rr, yy)}'
        a.line(dd, dk, .4, .5)
        dl = ''
        for k in range(-3, 4):
            ang = k / 4 * 1.2
            bx = cx + math.sin(ang) * r
            by = y + math.cos(ang) * r * e
            dl += f'M{pt(cx, y - h + .8)}L{pt(bx, by - .3)}'
        a.line(dl, sh, .3, .45)
    elif kind == 'thatch':
        dd = ''
        for k in range(-5, 6):
            ang = k / 6 * 1.3
            bx = cx + math.sin(ang) * r * .95
            by = y + math.cos(ang) * r * e - .3
            dd += f'M{pt(cx + (bx - cx) * .25, y - h + (by - y + h) * .25)}L{pt(bx, by)}'
        a.line(dd, sh, .35, .6)
    a.line(f'M{pt(cx - r * .45, y - h * .4)}L{pt(cx - r * .1, y - h * .85)}', '#ffffff', .6, .35)


def smoke(a, x, y, s=1.0, puffs=4, drift=1.0, seed=1, op=.75):
    r = random.Random(seed)
    for k in range(puffs):
        t = k / max(1, puffs - 1)
        rr = (1.4 + 2.2 * t) * s
        cx = x + (2.2 * t + r.uniform(-.6, .6)) * s * drift + t * t * 3 * s * drift
        cy = y - (k * 3.2 * s) - t * 2 * s
        a.circ(cx, cy, rr, a.rg([(0, '#ffffff'), (.6, '#e9e6e0'), (1, '#c9c4bb', .0)], .4, .4, .6), None, None,
               op * (1 - .45 * t), f' filter="{a.blur(.35)}"')


def glow(a, cx, cy, rx, ry, strength=1.0):
    a.ell(cx, cy, rx, ry, a.rg([(0, '#fff3b8', .95 * strength), (.35, '#ffb84a', .7 * strength), (1, '#ff7a1c', 0)]), None)


def window(a, x, y, w, h, frame='#6b4a2a', lit=False, arch=False, sw=.6):
    """window with frame; (x,y) = bottom-left"""
    fill = a.lg([(0, '#ffe39a'), (1, '#f0a84a')]) if lit else a.lg([(0, '#4a3a2e'), (1, '#2b2119')])
    if arch:
        d = f'M{pt(x, y)}V{n(y - h + w / 2)}A{n(w / 2)},{n(w / 2)} 0 0 1 {pt(x + w, y - h + w / 2)}V{n(y)}Z'
    else:
        d = poly_d([(x, y), (x + w, y), (x + w, y - h), (x, y - h)])
    a.path(d, fill, True, sw)
    if w > 2.2:
        a.line(f'M{pt(x + w / 2, y - .2)}V{n(y - h + .3)}M{pt(x + .2, y - h * .5)}H{n(x + w - .2)}', frame, .45)
    a.line(f'M{pt(x - .3, y + .3)}H{n(x + w + .3)}', '#f4ead2', .7, .9)


def door(a, x, y, w, h, c=WOOD_D, arch=True, open_glow=False):
    if arch:
        d = f'M{pt(x, y)}V{n(y - h + w / 2)}A{n(w / 2)},{n(w / 2)} 0 0 1 {pt(x + w, y - h + w / 2)}V{n(y)}Z'
    else:
        d = poly_d([(x, y), (x + w, y), (x + w, y - h), (x, y - h)])
    if open_glow:
        a.path(d, a.rg([(0, '#ffe7a0'), (.5, '#f39a3c'), (1, '#8a3a12')], .5, .85, .8))
        return
    a.path(d, a.lg([(0, c[1]), (1, c[3])], 0, 0, 1, 1))
    dd = ''
    k = 1.3
    while k < w - .4:
        dd += f'M{pt(x + k, y - .3)}V{n(y - h + (w / 2 if arch else 0) + .3 if arch else y - h + .3)}'
        k += 1.3
    a.line(dd, c[3], .35, .7)
    a.circ(x + w * .75, y - h * .45, .35, '#e6c46a', None)


def stone_courses(a, F, step=2.6, c=STONE, seed=0, joints=True, op=.5):
    """mortar courses on a front face F (rect: bl, br, tr, tl)"""
    r = random.Random(seed)
    (x0, y0), (x1, _), (_, y1), _ = F
    d = ''
    dj = ''
    yy = y0 - step
    row = 0
    while yy > y1 + .6:
        d += f'M{pt(x0 + .3, yy)}H{n(x1 - .3)}'
        row += 1
        if joints:
            xx = x0 + r.uniform(1, 3) + (1.6 if row % 2 else 0)
            while xx < x1 - .8:
                dj += f'M{pt(xx, yy)}v{n(step)}'
                xx += r.uniform(3.4, 5.2)
        yy -= step
    a.line(d, c[3], .35, op)
    a.line(dj, c[3], .35, op * .9)
    a.line(d.replace('M', 'M').replace('H', 'H'), c[0], .3, op * .6, ' transform="translate(.3 .55)"')


def side_courses(a, S, step=2.6, c=STONE, op=.45):
    """courses on a receding side face S (front-bottom, back-bottom, back-top, front-top)"""
    (fx, fy), (bx, by), _, (_, ty) = S
    h = fy - ty
    d = ''
    k = step
    while k < h - .6:
        d += f'M{pt(fx + .2, fy - k)}L{pt(bx - .2, by - k)}'
        k += step
    a.line(d, c[3], .35, op)


def planks(a, F, step=2.0, c=WOOD, vertical=True, op=.55):
    (x0, y0), (x1, _), (_, y1), _ = F
    d = ''
    if vertical:
        k = x0 + step
        while k < x1 - .5:
            d += f'M{pt(k, y0 - .3)}V{n(y1 + .3)}'
            k += step
    else:
        k = y0 - step
        while k > y1 + .5:
            d += f'M{pt(x0 + .3, k)}H{n(x1 - .3)}'
            k -= step
    a.line(d, c[3], .35, op)


def side_planks(a, S, step=2.0, c=WOOD, op=.5):
    (fx, fy), (bx, by), _, (_, ty) = S
    h = fy - ty
    d = ''
    k = step
    while k < h - .5:
        d += f'M{pt(fx + .2, fy - k)}L{pt(bx - .2, by - k)}'
        k += step
    a.line(d, c[3], .35, op)


def sack(a, x, y, s=1.0, c=('#f1e4c2', '#ddc999', '#b8a070', '#8a7650')):
    """grain sack standing at (x, y)"""
    w, h = 3.2 * s, 4.4 * s
    d = (f'M{pt(x - w / 2, y)}C{pt(x - w * .62, y - h * .5)} {pt(x - w * .35, y - h * .9)} {pt(x - w * .2, y - h)}'
         f'L{pt(x + w * .2, y - h)}C{pt(x + w * .35, y - h * .9)} {pt(x + w * .62, y - h * .5)} {pt(x + w / 2, y)}Z')
    a.path(d, a.lg([(0, c[0]), (.6, c[1]), (1, c[2])], 0, 0, 1, .3), True, .6)
    a.line(f'M{pt(x - w * .25, y - h * .82)}Q{pt(x, y - h * .74)} {pt(x + w * .25, y - h * .82)}', c[3], .4)
    a.path(f'M{pt(x - w * .22, y - h)}l{n(w * .12)},{n(-1 * s)}l{n(w * .2)},{n(.2 * s)}l{n(w * .12)},{n(.8 * s)}Z', c[1], True, .5)


def logpile(a, x, y, cols=3, rows=2, r=1.2, c=WOOD):
    """stack of log ends (x,y = bottom-left)"""
    for j in range(rows):
        for i in range(cols - j):
            cx = x + r + i * 2 * r + j * r
            cy = y - r - j * 1.75 * r
            a.circ(cx, cy, r, a.rg([(0, '#f0d6a8'), (.6, '#d9b07a'), (1, c[2])], .45, .4, .6), True, .5)
            a.circ(cx, cy, r * .45, 'none', c[2], .3)


def flag(a, x, y, h, col, trim='#f3e3b0', w=6.5, pole='#5c4026'):
    a.line(f'M{pt(x, y)}V{n(y - h)}', pole, .9, 1)
    a.circ(x, y - h - .5, .6, GOLD[1], True, .3)
    fy = y - h + .6
    d = f'M{pt(x + .3, fy)}c{n(w * .4)},{n(-.8)} {n(w * .6)},{n(.6)} {n(w)},{n(-.2)}l{n(-1.6)},{n(2)} {n(1.6)},{n(2)}c{n(-w * .4)},{n(.8)} {n(-w * .6)},{n(-.6)} {n(-w)},{n(.2)}Z'
    a.path(d, a.lg([(0, mix(col, '#ffffff', .25)), (1, mix(col, '#000000', .25))], 0, 0, 1, 1), True, .5)
    a.line(f'M{pt(x + .6, fy + 3.3)}c{n(w * .4)},{n(-.7)} {n(w * .6)},{n(.5)} {n(w - 1.4)},{n(-.2)}', trim, .45, .8)


def save(a, path, limit):
    s = a.svg()
    with open(path, 'w') as f:
        f.write(s)
    assert len(s.encode()) <= limit, (path, len(s))
    return len(s.encode())
