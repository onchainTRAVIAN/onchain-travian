"""Painterly building art, set B (military / training buildings).

Writes src/web/public/img/buildings/<id>.svg and <id>-2..5.svg for:
barracks, greatbarracks, stable, greatstable, workshop, academy, blacksmith,
armoury, tournament, horsetrough.

Style: Travian-Legends-like painterly look in a 75x100 viewBox. Warm daylight
from the top-left, soft blurred cast shadow to the bottom-right, every surface
a lit->shade gradient plus texture strokes, soft dark-brown outline.

Geometry uses a cabinet-oblique projection: world (x, d, z) where x runs right,
d runs "into" the picture (drawn up-right) and z is height.
    screen = (x + KX*d, G - z - KY*d)
Fronts face the viewer (lit), right-hand side faces are in shade.

Run:  python3 scripts/art/painterly/buildings_b.py
"""
import math
import pathlib
import random

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "src/web/public/img/buildings"

OL = "#3b2a17"
WARM = "#fff1cf"
DEEP = "#24160e"
KX, KY = 0.66, 0.46
VZ = 1.3


# ------------------------------------------------------------------ helpers

def f(v):
    s = f"{v:.1f}"
    s = s.rstrip("0").rstrip(".") if "." in s else s
    if s == "-0":
        s = "0"
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def _rgb(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def _hex(r):
    return "#" + "".join(f"{max(0, min(255, round(v))):02x}" for v in r)


def mix(a, b, t):
    ra, rb = _rgb(a), _rgb(b)
    return _hex([x + (y - x) * t for x, y in zip(ra, rb)])


def lt(c, t):
    return mix(c, WARM, t)


def dk(c, t):
    return mix(c, DEEP, t)


def lerp(p, q, t):
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


def dpts(pts, close=True):
    s = "M" + " ".join(f"{f(x)},{f(y)}" for x, y in pts).replace(",-", "-").replace(" -", "-")
    return s + ("Z" if close else "")


def segs(lst):
    out = []
    for a, b in lst:
        ax, ay = float(f(a[0])), float(f(a[1]))
        dx, dy = f(b[0] - ax), f(b[1] - ay)
        if dx == "0":
            out.append(f"M{f(ax)},{f(ay)}v{dy}")
        elif dy == "0":
            out.append(f"M{f(ax)},{f(ay)}h{dx}")
        else:
            out.append(f"M{f(ax)},{f(ay)}l{dx},{dy}")
    return "".join(out).replace(",-", "-").replace("l-", "l-")


# material base colours
C = {
    "wood": "#b07a46", "plank": "#a8743f", "darkwood": "#6b4424", "beam": "#5a3a1e",
    "plaster": "#eadcbb", "stone": "#cbbfa6", "ashlar": "#dcd2bc", "marble": "#ece6d8",
    "tile": "#c8603e", "thatch": "#d8b363", "shingle": "#8e6a48", "slate": "#7c8592",
    "gold": "#e0b040", "red": "#b8382a", "iron": "#9aa2aa", "water": "#6aaecc",
    "sand": "#e2cc94", "straw": "#dcc07a", "copper": "#c87a48",
}


class Doc:
    def __init__(self, prefix, G=91.0, seed=None):
        # VZ: vertical stretch of world heights (chunky, tall T3-style massing)
        self.p = prefix
        self.G = G
        self.VZ = VZ
        self.defs = []
        self.cache = {}
        self.out = []
        self.rnd = random.Random(seed or prefix)

    # ---- projection
    def P(self, x, d, z):
        return (x + KX * d, self.G - z * self.VZ - KY * d)

    def add(self, *s):
        self.out.extend(s)

    # ---- defs
    def _id(self, key, make):
        if key not in self.cache:
            i = f"{self.p}{len(self.cache)}"
            self.cache[key] = i
            self.defs.append(make(i))
        return self.cache[key]

    def grad(self, c, kind="face"):
        def make(i):
            def st(o, col, op=None):
                a = "" if op is None else f' stop-opacity="{op}"'
                return f'<stop offset="{o}" stop-color="{col}"{a}/>'
            if kind == "face":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="1" y2="1">'
                        + st(0, lt(c, .22)) + st(.55, c) + st(1, dk(c, .2)) + '</linearGradient>')
            if kind == "side":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2=".5" y2="1">'
                        + st(0, dk(c, .22)) + st(1, dk(c, .42)) + '</linearGradient>')
            if kind == "roof":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2=".45" y2="1">'
                        + st(0, lt(c, .28)) + st(.5, c) + st(1, dk(c, .22)) + '</linearGradient>')
            if kind == "roofside":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="1" y2="1">'
                        + st(0, dk(c, .25)) + st(1, dk(c, .48)) + '</linearGradient>')
            if kind == "cyl":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="1" y2="0">'
                        + st(0, dk(c, .08)) + st(.28, lt(c, .3)) + st(.62, c) + st(1, dk(c, .45))
                        + '</linearGradient>')
            if kind == "sphere":
                return (f'<radialGradient id="{i}" cx=".38" cy=".32" r=".8" fx=".3" fy=".22">'
                        + st(0, lt(c, .55)) + st(.4, c) + st(1, dk(c, .45)) + '</radialGradient>')
            if kind == "metal":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="1" y2=".8">'
                        + st(0, lt(c, .7)) + st(.3, lt(c, .15)) + st(.65, dk(c, .3)) + st(1, lt(c, .2))
                        + '</linearGradient>')
            if kind == "vert":
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="0" y2="1">'
                        + st(0, lt(c, .3)) + st(1, dk(c, .3)) + '</linearGradient>')
            if kind == "pad":
                return (f'<radialGradient id="{i}" cx=".46" cy=".42" r=".6">'
                        + st(0, lt(c, .25), .95) + st(.7, c, .85) + st(1, dk(c, .1), .25)
                        + '</radialGradient>')
            if kind == "glow":
                return (f'<radialGradient id="{i}" cx=".5" cy=".7" r=".6">'
                        + st(0, "#fff2b0") + st(.35, "#ffb340") + st(.75, "#d2501e") + st(1, "#3a1a0c")
                        + '</radialGradient>')
            if kind == "smoke":
                return (f'<radialGradient id="{i}" cx=".4" cy=".35" r=".6">'
                        + st(0, "#f4f1ea") + st(.6, "#c9c4bb") + st(1, "#9d978e", 0) + '</radialGradient>')
            if kind == "fadeup":   # dark at bottom, transparent at top (ambient occlusion)
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="0" y2="1">'
                        + st(0, DEEP, 0) + st(1, DEEP, .45) + '</linearGradient>')
            if kind == "fadedown":  # dark at top (eave shadow)
                return (f'<linearGradient id="{i}" x1="0" y1="0" x2="0" y2="1">'
                        + st(0, DEEP, .42) + st(1, DEEP, 0) + '</linearGradient>')
            raise ValueError(kind)
        return f"url(#{self._id(('g', c, kind), make)})"

    def blur(self, sd):
        return f"url(#{self._id(('b', sd), lambda i: f'<filter id=\"{i}\" x=\"-.5\" y=\"-.8\" width=\"2\" height=\"2.6\"><feGaussianBlur stdDeviation=\"{sd}\"/></filter>')})"

    # ---- primitives
    def poly(self, pts, fill, extra=""):
        self.add(f'<path d="{dpts(pts)}" fill="{fill}"{extra}/>')

    def lines(self, lst, col, w=.35, op=None):
        if not lst:
            return
        o = f' stroke-opacity="{op}"' if op is not None else ""
        self.add(f'<path d="{segs(lst)}" fill="none" stroke="{col}" stroke-width="{w}"{o}/>')

    def path(self, d, fill="none", extra=""):
        self.add(f'<path d="{d}" fill="{fill}"{extra}/>')

    def ell(self, cx, cy, rx, ry, fill, extra=""):
        self.add(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{extra}/>')

    def circ(self, cx, cy, r, fill, extra=""):
        self.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{extra}/>')

    def g(self, tx, ty, s=1.0, flip=False):
        sx = -s if flip else s
        self.add(f'<g transform="translate({f(tx)} {f(ty)}) scale({f(sx) if abs(sx) != 1 else int(sx)}'
                 f'{"" if sx == s else " " + f(s)})">')

    def end(self):
        self.add("</g>")

    def svg(self):
        body = "".join(self.out)
        defs = f"<defs>{''.join(self.defs)}</defs>" if self.defs else ""
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 100">' + defs +
                f'<g stroke="{OL}" stroke-width=".9" stroke-opacity=".7" stroke-linejoin="round" '
                f'stroke-linecap="round">{body}</g></svg>')


NS = ' stroke="none"'


# ------------------------------------------------------------------ ground / shadow

def ground(d, rx=33.0, ry=9.8, cy=87.0, yard=None):
    d.ell(37, cy + .4, rx + 1.2, ry + 1, d.grad("#b4cf86", "pad"), NS)
    d.ell(37, cy, rx, ry, d.grad("#c4da94", "pad"), NS)
    if yard:
        cx, cyy, yrx, yry = yard
        d.ell(cx, cyy, yrx, yry, d.grad(C["sand"], "pad"), NS)
    r = d.rnd
    tufts = []
    for _ in range(9):
        a = r.uniform(0, 2 * math.pi)
        x = 37 + math.cos(a) * rx * r.uniform(.78, .97)
        y = cy + math.sin(a) * ry * r.uniform(.78, .97)
        if y < cy - 2:
            continue
        tufts += [((x, y), (x - .5, y - 1.6)), ((x + .5, y), (x + .7, y - 1.9)), ((x + 1, y), (x + 1.7, y - 1.3))]
    d.lines(tufts, "#6f9440", .4, .8)


def cast(d, cx, cy, rx, ry, op=.3):
    d.ell(cx, cy, rx, ry, "#20280c", f' stroke="none" opacity="{op}" filter="{d.blur(1.6)}"')


# ------------------------------------------------------------------ walls

def walls(d, a, b, d0, d1, z0, z1, mat, side=True, front=True, ao=True, eave=True, tex=True):
    P = d.P
    F = [P(a, d0, z0), P(b, d0, z0), P(b, d0, z1), P(a, d0, z1)]
    S = [P(b, d0, z0), P(b, d1, z0), P(b, d1, z1), P(b, d0, z1)]
    c = C[mat]
    r = d.rnd
    tex_c = dk(c, .45)
    hi_c = lt(c, .45)
    if side:
        d.poly(S, d.grad(c, "side"))
    if front:
        d.poly(F, d.grad(c, "face"))
    fl, sl, hl = [], [], []
    if not tex:
        pass
    elif mat in ("wood",):   # horizontal planks / logs
        z = z0 + 1.5
        while z < z1 - .4:
            if front:
                fl.append((P(a, d0, z), P(b, d0, z)))
                hl.append((P(a + .3, d0, z + .35), P(b - .3, d0, z + .35)))
            if side:
                sl.append((P(b, d0, z), P(b, d1, z)))
            z += 1.5
    elif mat in ("plank",):  # vertical boards
        x = a + 1.7
        while x < b - .5:
            fl.append((P(x, d0, z0 + .2), P(x, d0, z1 - .2)))
            hl.append((P(x + .4, d0, z0 + .3), P(x + .4, d0, z1 - .3)))
            x += 1.7
        if side:
            dd = d0 + 1.7
            while dd < d1 - .4:
                sl.append((P(b, dd, z0 + .2), P(b, dd, z1 - .2)))
                dd += 1.7
    elif mat in ("stone", "ashlar", "marble"):
        step = 2.0 if mat == "stone" else 2.6
        jw = 3.2 if mat == "stone" else 4.4
        z = z0 + step
        k = 0
        rows = []
        zz = z0
        while zz < z1 - .3:
            rows.append(zz)
            zz += step
        for i, zr in enumerate(rows):
            top = min(zr + step, z1)
            if top < z1 - .2:
                if front:
                    fl.append((P(a, d0, top), P(b, d0, top)))
                    hl.append((P(a + .2, d0, top - .35), P(b - .2, d0, top - .35)))
                if side:
                    sl.append((P(b, d0, top), P(b, d1, top)))
            off = (jw / 2) * (i % 2) + r.uniform(-.4, .4)
            x = a + off + jw * .6
            while x < b - .6 and front:
                fl.append((P(x, d0, zr + .1), P(x, d0, top - .1)))
                x += jw * r.uniform(.8, 1.2)
            dd = d0 + off * .7 + jw * .5
            while dd < d1 - .5 and side:
                sl.append((P(b, dd, zr + .1), P(b, dd, top - .1)))
                dd += jw * .8 * r.uniform(.8, 1.2)
        # painterly stone variation
        if front:
            lite, dark = [], []
            for _ in range(int((b - a) * (z1 - z0) / 26)):
                x = r.uniform(a + .8, b - 2.5)
                z = r.uniform(z0 + .4, z1 - 1.6)
                (lite if r.random() < .5 else dark).append(
                    dpts([P(x, d0, z), P(x + 2.2, d0, z), P(x + 2.2, d0, z + 1.4), P(x, d0, z + 1.4)]))
            for lst, col in ((lite, lt(c, .35)), (dark, dk(c, .2))):
                if lst:
                    d.add(f'<path d="{"".join(lst)}" fill="{col}" stroke="none" opacity=".45"/>')
    elif mat == "plaster":
        if front:
            for _ in range(int((b - a) / 9) + 1):
                x = r.uniform(a + 1, b - 4)
                z = r.uniform(z0 + .5, z1 - 3)
                cx, cy = P(x, d0, z)
                d.ell(cx + 1.5, cy - 1, r.uniform(1.4, 2.6), r.uniform(.8, 1.4), dk(c, .12),
                      ' stroke="none" opacity=".35"')
    d.lines(sl, dk(c, .62), .3, .8)
    d.lines(fl, tex_c, .32, .85)
    d.lines(hl, hi_c, .28, .55)
    if ao and front:
        d.poly([P(a, d0, z0), P(b, d0, z0), P(b, d0, z0 + 2.2), P(a, d0, z0 + 2.2)], d.grad("x", "fadeup"), NS)
    if eave and front:
        d.poly([P(a, d0, z1 - 2.6), P(b, d0, z1 - 2.6), P(b, d0, z1), P(a, d0, z1)], d.grad("x", "fadedown"), NS)
    return F, S


def timber(d, a, b, d0, d1, z0, z1, posts=5.5, braces=True, side=True):
    """Half-timber frame drawn over plaster walls."""
    P = d.P
    bl = []
    bl += [(P(a, d0, z0 + .3), P(b, d0, z0 + .3)), (P(a, d0, z1 - .3), P(b, d0, z1 - .3))]
    n = max(2, round((b - a) / posts))
    xs = [a + (b - a) * i / n for i in range(n + 1)]
    xs[0] += .4
    xs[-1] -= .4
    for i, x in enumerate(xs):
        bl.append((P(x, d0, z0), P(x, d0, z1)))
        if braces and i < n and i % 2 == 0:
            bl.append((P(x, d0, z0 + .3), P(xs[i + 1], d0, z1 - .3)))
    if side:
        dm = (d0 + d1) / 2
        bl += [(P(b, d0, z1 - .3), P(b, d1, z1 - .3)), (P(b, d0, z0 + .3), P(b, d1, z0 + .3)),
               (P(b, dm, z0), P(b, dm, z1)), (P(b, d1 - .3, z0), P(b, d1 - .3, z1))]
        if braces:
            bl.append((P(b, d0, z0 + .3), P(b, dm, z1 - .3)))
    d.add(f'<path d="{segs(bl)}" fill="none" stroke="{C["beam"]}" stroke-width="1.05" stroke-opacity=".95"/>')
    d.add(f'<path d="{segs([(lerp(p, q, 0), lerp(p, q, 1)) for p, q in bl[:2]])}" fill="none" '
          f'stroke="#8a6038" stroke-width=".3" stroke-opacity=".7" transform="translate(-.2 -.3)"/>')


def top_face(d, a, b, d0, d1, z, c, kind="face"):
    P = d.P
    pts = [P(a, d0, z), P(b, d0, z), P(b, d1, z), P(a, d1, z)]
    d.poly(pts, d.grad(c, kind))
    return pts


# ------------------------------------------------------------------ roofs

def _roof_tex(d, e0, e1, r1, r0, mat, rows=None, side=False):
    """Texture a roof face given eave edge e0->e1 and ridge edge r0->r1."""
    def Q(u, t):
        return lerp(lerp(e0, e1, u), lerp(r0, r1, u), t)
    c = C[mat]
    r = d.rnd
    eave_len = math.dist(e0, e1)
    slope_len = max(math.dist(e0, r0), math.dist(e1, r1))
    dark = dk(c, .5 if not side else .62)
    light = lt(c, .45)
    if mat == "thatch":
        n = int(eave_len * slope_len / 3.2)
        st_d, st_l = [], []
        for _ in range(n):
            u = r.uniform(.02, .98)
            t = r.uniform(0, .92)
            du = r.uniform(-.015, .015)
            seg = (Q(u, t), Q(u + du, t + r.uniform(.12, .2)))
            (st_l if r.random() < .45 else st_d).append(seg)
        d.lines(st_d, dark, .3, .7)
        d.lines(st_l, light, .28, .6)
        # layered courses
        cl = [(Q(0, t), Q(1, t)) for t in (.33, .66)]
        d.lines(cl, dk(c, .35), .45, .5)
        return
    step = {"tile": 2.0, "shingle": 1.8, "slate": 1.7}[mat]
    nrows = rows or max(2, round(slope_len / step))
    rl, hl, jl = [], [], []
    for k in range(nrows):
        t0 = k / nrows
        t1 = (k + 1) / nrows
        if k > 0:
            rl.append((Q(0, t0), Q(1, t0)))
        hl.append((Q(0, t0 + .32 / nrows), Q(1, t0 + .32 / nrows)))
        el = math.dist(Q(0, t0), Q(1, t0))
        nj = max(1, int(el / (1.9 if mat == "tile" else 2.3)))
        off = (k % 2) * .5
        for j in range(nj):
            u = (j + off + r.uniform(-.12, .12)) / nj
            if .02 < u < .98:
                jl.append((Q(u, t0), Q(u, t1)))
    d.lines(jl, dark, .28 if mat != "tile" else .32, .75)
    d.lines(rl, dark, .42, .85)
    d.lines(hl, light, .3, .5)


def gable(d, a, b, d0, d1, z1, rh, mat, o=1.4, gable_mat="plaster", trim=None, ridge_cap=True,
          gable_tex=None, gable_open=False):
    """Gable roof, ridge parallel to the front. Right gable end visible."""
    P = d.P
    c = C[mat]
    dm = (d0 + d1) / 2
    ze = z1 - .5
    zr = z1 + rh
    A, B, D0, D1 = a - o, b + o, d0 - o, d1 + o
    d.poly([P(A, dm, zr), P(B, dm, zr), P(B, D1, ze), P(A, D1, ze)], d.grad(c, "roofside"))
    if not gable_open:
        tri = [P(b, d0, z1), P(b, dm, zr - .3), P(b, d1, z1)]
        gc = C[gable_mat]
        d.poly(tri, d.grad(gc, "side"))
        if gable_tex == "plank" or gable_mat in ("plank", "wood"):
            ll = []
            for i in range(1, 6):
                dd = d0 + (d1 - d0) * i / 6
                h = (1 - abs(dd - dm) / (dm - d0)) * (zr - .3 - z1)
                ll.append((P(b, dd, z1), P(b, dd, z1 + h)))
            d.lines(ll, dk(gc, .6), .3, .8)
    else:
        d.lines([(P(b, d0, z1), P(b, dm, zr - .4)), (P(b, d1, z1), P(b, dm, zr - .4)),
                 (P(b, d0, z1), P(b, d1, z1))], C["beam"], 1.0, .95)
    # right verge board
    d.poly([P(B, D0, ze), P(B, dm, zr), P(B, D1, ze), P(B, D1, ze - .7), P(B, dm, zr - .8), P(B, D0, ze - .7)],
           dk(c, .45))
    e0, e1, r1, r0 = P(A, D0, ze), P(B, D0, ze), P(B, dm, zr), P(A, dm, zr)
    d.poly([e0, e1, r1, r0], d.grad(c, "roof"))
    _roof_tex(d, e0, e1, r1, r0, mat)
    # eave fascia + soft thickness
    d.poly([e0, e1, P(B, D0, ze - .8), P(A, D0, ze - .8)], dk(c, .38))
    if mat == "thatch":
        d.path(f"M{f(e0[0])},{f(e0[1])}L{f(e1[0])},{f(e1[1])}", extra=f' stroke="{lt(c, .35)}" stroke-width=".5"')
    if ridge_cap:
        rc = lt(c, .15) if mat != "thatch" else dk(c, .15)
        d.add(f'<path d="M{f(r0[0])},{f(r0[1])}L{f(r1[0])},{f(r1[1])}" stroke="{dk(c, .5)}" stroke-width="1.5"/>'
              f'<path d="M{f(r0[0])},{f(r0[1] - .2)}L{f(r1[0])},{f(r1[1] - .2)}" stroke="{rc}" stroke-width=".6" stroke-opacity="1"/>')
    if trim:
        tc = C["gold"]
        d.add(f'<path d="{dpts([e0, e1, P(B, dm, zr), P(B, D1, ze)], False)}" fill="none" stroke="#8a6418" stroke-width="1.1"/>'
              f'<path d="{dpts([e0, e1, P(B, dm, zr), P(B, D1, ze)], False)}" fill="none" stroke="{tc}" stroke-width=".55" stroke-opacity="1"/>'
              f'<path d="M{f(r0[0])},{f(r0[1] - .2)}L{f(r1[0])},{f(r1[1] - .2)}" stroke="{tc}" stroke-width=".55" stroke-opacity="1"/>')
        finial(d, *r0)
        finial(d, *r1)
    return r0, r1


def hip(d, a, b, d0, d1, z1, rh, mat, o=1.4, trim=None, inset=None):
    """Hip (or pyramid) roof."""
    P = d.P
    c = C[mat]
    dm = (d0 + d1) / 2
    ze = z1 - .5
    zr = z1 + rh
    A, B, D0, D1 = a - o, b + o, d0 - o, d1 + o
    h = inset if inset is not None else (d1 - d0) / 2 + o
    h = min(h, (B - A) / 2)
    ra, rb = A + h, B - h
    d.poly([P(ra, dm, zr), P(rb, dm, zr), P(B, D1, ze), P(A, D1, ze)], d.grad(c, "roofside"))
    rt = [P(B, D0, ze), P(B, D1, ze), P(rb, dm, zr)]
    d.poly(rt, d.grad(c, "roofside"))
    _roof_tex(d, rt[0], rt[1], rt[2], rt[2], mat, side=True)
    e0, e1, r1, r0 = P(A, D0, ze), P(B, D0, ze), P(rb, dm, zr), P(ra, dm, zr)
    d.poly([e0, e1, r1, r0], d.grad(c, "roof"))
    _roof_tex(d, e0, e1, r1, r0, mat)
    d.poly([e0, e1, P(B, D1, ze), P(B, D1, ze - .8), P(B, D0, ze - .8), P(A, D0, ze - .8)], dk(c, .38))
    if rb - ra > .3:
        d.add(f'<path d="M{f(r0[0])},{f(r0[1])}L{f(r1[0])},{f(r1[1])}" stroke="{dk(c, .5)}" stroke-width="1.3"/>')
    if trim:
        tc = C["gold"]
        d.add(f'<path d="{dpts([e0, e1, P(B, D1, ze)], False)}" fill="none" stroke="#8a6418" stroke-width="1.1"/>'
              f'<path d="{dpts([e0, e1, P(B, D1, ze)], False)}" fill="none" stroke="{tc}" stroke-width=".55" stroke-opacity="1"/>'
              f'<path d="{dpts([e1, r1, r0], False)}" fill="none" stroke="{tc}" stroke-width=".5" stroke-opacity="1"/>')
        finial(d, *r0)
        if rb - ra > .3:
            finial(d, *r1)
    return r0, r1


def front_gable(d, a, b, d0, d1, z1, rh, mat, o=1.2, tri_mat="marble", trim=None, tex=True):
    """Temple roof: ridge runs into the picture, pediment faces the viewer."""
    P = d.P
    c = C[mat]
    xm = (a + b) / 2
    ze = z1 - .4
    zr = z1 + rh
    A, B, D0, D1 = a - o, b + o, d0 - o, d1 + o
    left = [P(A, D0, ze), P(A, D1, ze), P(xm, D1, zr), P(xm, D0, zr)]
    right = [P(xm, D0, zr), P(xm, D1, zr), P(B, D1, ze), P(B, D0, ze)]
    d.poly(left, d.grad(c, "roof"))
    d.poly(right, d.grad(c, "roofside"))
    if tex:
        _roof_tex(d, left[0], left[1], left[2], left[3], mat)
        _roof_tex(d, right[3], right[2], right[1], right[0], mat, side=True)
    tri = [P(A, D0, ze), P(B, D0, ze), P(xm, D0, zr)]
    tc = C[tri_mat]
    d.poly([(x, y + .9) for x, y in tri], dk(tc, .3))
    d.poly(tri, d.grad(tc, "face"))
    inner = [P(A + 2.2, D0, ze + .7), P(B - 2.2, D0, ze + .7), P(xm, D0, zr - 1.3)]
    d.poly(inner, d.grad(dk(tc, .08), "side"), ' stroke-width=".5"')
    if trim:
        d.add(f'<path d="{dpts(tri)}" fill="none" stroke="{C["gold"]}" stroke-width=".55" stroke-opacity="1"/>')
        finial(d, *tri[2])
    return tri


def finial(d, x, y, s=1.0):
    d.add(f'<path d="M{f(x)},{f(y)}V{f(y - 2.2 * s)}" stroke="#7a5414" stroke-width=".7"/>')
    d.circ(x, y - 2.4 * s, .75 * s, d.grad(C["gold"], "sphere"), ' stroke-width=".4"')


def crenels(d, a, b, d0, d1, z, mat="stone", w=2.3, h=2.1, gap=1.5, front=True, side=True, back=True):
    """Merlons along the edges of a flat-topped block (top face drawn by caller).
    Each row is emitted as three merged paths (sides, fronts, tops) to keep files small."""
    P = d.P
    th = .9
    rows = []
    if back:
        r_ = []
        x = a
        while x + w <= b + .01:
            r_.append((x, x + w, d1 - th, d1))
            x += w + gap
        rows.append(r_)
    if side:
        r_ = []
        dd = d1 - th - gap
        while dd - w >= d0 - .01:
            r_.append((b - th, b, dd - w, dd))
            dd -= w + gap
        rows.append(r_)
    if front:
        r_ = []
        x = a
        while x + w <= b + .01:
            r_.append((x, x + w, d0, d0 + th))
            x += w + gap
        rows.append(r_)
    c = C[mat]
    for r_ in rows:
        if not r_:
            continue
        sides = "".join(dpts([P(x1, e0, z), P(x1, e1, z), P(x1, e1, z + h), P(x1, e0, z + h)]) for x0, x1, e0, e1 in r_)
        fronts = "".join(dpts([P(x0, e0, z), P(x1, e0, z), P(x1, e0, z + h), P(x0, e0, z + h)]) for x0, x1, e0, e1 in r_)
        tops = "".join(dpts([P(x0, e0, z + h), P(x1, e0, z + h), P(x1, e1, z + h), P(x0, e1, z + h)]) for x0, x1, e0, e1 in r_)
        d.add(f'<path d="{sides}" fill="{d.grad(c, "side")}" stroke-width=".55"/>'
              f'<path d="{fronts}" fill="{d.grad(c, "face")}" stroke-width=".55"/>'
              f'<path d="{tops}" fill="{lt(c, .3)}" stroke-width=".5"/>')


def round_tower(d, cx, cd, r, z0, z1, mat="stone", top=None, rh=9.0, roof="tile", o=1.2, trim=False,
                slits=True, flag=None):
    P = d.P
    sx, sy0 = P(cx, cd, z0)
    _, sy1 = P(cx, cd, z1)
    ry = r * .42
    c = C[mat]
    d.path(f"M{f(sx - r)},{f(sy1)}V{f(sy0)}A{f(r)},{f(ry)} 0 0 0 {f(sx + r)},{f(sy0)}V{f(sy1)}Z",
           d.grad(c, "cyl"))
    # courses + joints
    cl, jl = [], []
    y = sy0 - 2.0
    k = 0
    while y > sy1 + .6:
        cl.append(f"M{f(sx - r)},{f(y)}A{f(r)},{f(ry)} 0 0 0 {f(sx + r)},{f(y)}")
        for j in range(5):
            ang = -1.25 + (j + .5 * (k % 2)) * .55
            if -1.4 < ang < 1.4:
                x = sx + r * math.sin(ang)
                yy = y + ry * math.cos(ang)
                jl.append(((x, yy), (x, yy + 2.0)))
        y -= 2.0
        k += 1
    d.add(f'<path d="{"".join(cl)}" fill="none" stroke="{dk(c, .45)}" stroke-width=".3" stroke-opacity=".85"/>')
    d.lines(jl, dk(c, .45), .28, .75)
    d.path(f"M{f(sx - r)},{f(sy0 - 2.2)}V{f(sy0)}A{f(r)},{f(ry)} 0 0 0 {f(sx + r)},{f(sy0)}V{f(sy0 - 2.2)}"
           f"A{f(r)},{f(ry)} 0 0 1 {f(sx - r)},{f(sy0 - 2.2)}Z", d.grad("x", "fadeup"), NS)
    if slits:
        for zz in [z0 + (z1 - z0) * .35, z0 + (z1 - z0) * .7]:
            _, yy = P(cx, cd, zz)
            d.add(f'<rect x="{f(sx - r * .35 - .45)}" y="{f(yy - 1.6)}" width=".9" height="2.6" rx=".4" '
                  f'fill="#2a1d12" stroke-width=".4"/>')
    if top == "cone":
        R = r + o
        apex = sy1 - rh
        rc = C[roof]
        d.path(f"M{f(sx - R)},{f(sy1 + .3)}A{f(R)},{f(R * .42)} 0 0 0 {f(sx + R)},{f(sy1 + .3)}L{f(sx)},{f(apex)}Z",
               d.grad(rc, "cyl"))
        rl = []
        for t in (.25, .5, .75):
            yy = sy1 + .3 + (apex - sy1 - .3) * t
            RR = R * (1 - t)
            rl.append(f"M{f(sx - RR)},{f(yy)}A{f(RR)},{f(RR * .42)} 0 0 0 {f(sx + RR)},{f(yy)}")
        ll = []
        for j in range(-3, 4):
            ang = j * .4
            ll.append(((sx + R * math.sin(ang), sy1 + .3 + R * .42 * math.cos(ang)), (sx, apex + 1)))
        d.add(f'<path d="{"".join(rl)}" fill="none" stroke="{dk(rc, .5)}" stroke-width=".35"/>')
        d.lines(ll, dk(rc, .45), .28, .6)
        if trim:
            d.path(f"M{f(sx - R)},{f(sy1 + .3)}A{f(R)},{f(R * .42)} 0 0 0 {f(sx + R)},{f(sy1 + .3)}",
                   extra=f' stroke="{C["gold"]}" stroke-width=".6" stroke-opacity="1"')
            finial(d, sx, apex)
        if flag:
            pennant(d, sx, apex, 7 if not trim else 6, flag)
    elif top == "crenel":
        d.ell(sx, sy1, r, ry, d.grad(lt(c, .1), "face"))
        d.ell(sx, sy1, r - 1.2, ry - .6, dk(c, .3), ' stroke-width=".4"')
        for j in range(-3, 4):
            ang = j * .45
            x = sx + r * math.sin(ang)
            yy = sy1 + ry * math.cos(ang)
            wdt = 1.5 * math.cos(ang) + .3
            d.add(f'<path d="M{f(x - wdt / 2)},{f(yy)}v-2h{f(wdt)}v2Z" fill="{d.grad(c, "face") if ang < .3 else d.grad(c, "side")}" stroke-width=".5"/>')
        if flag:
            pennant(d, sx, sy1 - 1, 8, flag)
    return sx, sy1


# ------------------------------------------------------------------ openings

def door(d, x, w, h, z0=0.0, d0=0.0, arch=True, col=None, open_dark=False, hinges=True):
    P = d.P
    h *= d.VZ
    x0, y0 = P(x - w / 2, d0, z0)
    x1 = x0 + w
    yt = y0 - h
    c = col or C["darkwood"]
    if arch:
        dd = (f"M{f(x0)},{f(y0)}V{f(yt + w / 2)}A{f(w / 2)},{f(w / 2)} 0 0 1 {f(x1)},{f(yt + w / 2)}V{f(y0)}Z")
    else:
        dd = f"M{f(x0)},{f(y0)}V{f(yt)}H{f(x1)}V{f(y0)}Z"
    d.path(dd, "#2a1a10" if open_dark else d.grad(c, "face"))
    if not open_dark:
        ll = []
        n = max(2, int(w / 1.2))
        for i in range(1, n):
            xx = x0 + w * i / n
            ll.append(((xx, y0 - .2), (xx, yt + (w / 2 if arch else 0) * (1 - abs(2 * i / n - 1) ** 2) * 0 + .4)))
        d.lines(ll, dk(c, .5), .28, .8)
        if hinges:
            d.lines([((x0 + .2, y0 - h * .3), (x0 + w * .55, y0 - h * .3)),
                     ((x0 + .2, y0 - h * .7), (x0 + w * .55, y0 - h * .7))], "#2e2a26", .45, .9)
    # recess shade at top
    d.path(dd, d.grad("x", "fadedown"), NS)


def window(d, x, z, w, h, d0=0.0, shutters=True, arch=False, lit=False):
    P = d.P
    h *= d.VZ
    x0, y0 = P(x - w / 2, d0, z)
    yt = y0 - h
    d.add(f'<path d="M{f(x0 - .4)},{f(y0 + .5)}h{f(w + .8)}v-.6h-{f(w + .8)}Z" fill="{lt(C["stone"], .2)}" stroke-width=".4"/>')
    if arch:
        dd = f"M{f(x0)},{f(y0)}V{f(yt + w / 2)}A{f(w / 2)},{f(w / 2)} 0 0 1 {f(x0 + w)},{f(yt + w / 2)}V{f(y0)}Z"
    else:
        dd = f"M{f(x0)},{f(y0)}V{f(yt)}H{f(x0 + w)}V{f(y0)}Z"
    d.path(dd, "#e8a640" if lit else "#2b2016", ' stroke-width=".6"')
    if not lit:
        d.path(f"M{f(x0 + .3)},{f(yt + .4 + (w / 2 if arch else 0))}h{f(w * .35)}", extra=' stroke="#7a8a94" stroke-width=".35"')
    d.lines([((x0 + w / 2, y0), (x0 + w / 2, yt + (w / 2 if arch else 0) * .3))], "#5a3a1e", .35, .9)
    if shutters:
        sw_ = w * .45
        for sx_ in (x0 - sw_ - .1, x0 + w + .1):
            d.add(f'<path d="M{f(sx_)},{f(y0)}V{f(yt)}h{f(sw_)}V{f(y0)}Z" fill="{d.grad("#7a5230", "face")}" stroke-width=".5"/>')


def side_window(d, b, dc, z, w, h, d_unit=True):
    P = d.P
    pts = [P(b, dc - w / 2, z), P(b, dc + w / 2, z), P(b, dc + w / 2, z + h), P(b, dc - w / 2, z + h)]
    d.poly(pts, "#22180f", ' stroke-width=".5"')


def side_door(d, b, dc, w, h, z0=0.0):
    P = d.P
    pts = [P(b, dc - w / 2, z0), P(b, dc + w / 2, z0), P(b, dc + w / 2, z0 + h), P(b, dc - w / 2, z0 + h)]
    d.poly(pts, d.grad(dk(C["darkwood"], .2), "side"), ' stroke-width=".6"')


# ------------------------------------------------------------------ props

def post(d, x, y0, y1, w=.9, col=None):
    c = col or C["darkwood"]
    d.add(f'<path d="M{f(x - w / 2)},{f(y0)}V{f(y1)}h{f(w)}V{f(y0)}Z" fill="{d.grad(c, "cyl")}" stroke-width=".5"/>')


def pennant(d, x, y, h, col="red", long=False, left=False):
    """Flag pole whose foot is at (x, y), pennant waving to the right."""
    top = y - h
    d.add(f'<path d="M{f(x)},{f(y)}V{f(top)}" stroke="#3b2a17" stroke-width="1" stroke-opacity=".9"/>'
          f'<path d="M{f(x)},{f(y)}V{f(top)}" stroke="#a88050" stroke-width=".45" stroke-opacity="1"/>')
    c = C["red"] if col == "red" else (C["gold"] if col == "gold" else col)
    L = 6.5 if long else 4.8
    s = -1 if left else 1
    d.path(f"M{f(x)},{f(top + .3)}c{f(s * L * .35)},-1.2 {f(s * L * .6)},.9 {f(s * L)},.2"
           f"c{f(-s * L * .3)},1 {f(-s * L * .2)},.9 {f(-s * L * .05)},1.6"
           f"c{f(-s * L * .35)},.9 {f(-s * L * .62)},-.5 {f(-s * L * .95)},.9Z", d.grad(c, "face"), ' stroke-width=".55"')
    d.circ(x, top - .3, .6, d.grad(C["gold"], "sphere"), ' stroke-width=".35"')


def banner(d, x, y, w=3.0, h=6.0, col="red", emblem=True):
    """Hanging banner, top-left corner at (x, y)."""
    c = C["red"] if col == "red" else col
    d.add(f'<path d="M{f(x - .5)},{f(y)}h{f(w + 1)}" stroke="#6b4424" stroke-width=".8"/>')
    d.path(f"M{f(x)},{f(y)}h{f(w)}v{f(h)}l-{f(w / 2)},-1.4l-{f(w / 2)},1.4Z", d.grad(c, "face"), ' stroke-width=".5"')
    d.path(f"M{f(x + .35)},{f(y + .3)}v{f(h - .9)}", extra=' stroke="#f2d27a" stroke-width=".3" stroke-opacity=".9"')
    if emblem:
        d.circ(x + w / 2, y + h * .4, w * .22, d.grad(C["gold"], "sphere"), ' stroke-width=".3"')


def smoke(d, x, y, s=1.0, n=4):
    for i in range(n):
        r = (1.3 + i * .55) * s
        d.circ(x + i * 1.4 * s + (i % 2) * .5, y - i * 3.0 * s, r, d.grad("x", "smoke"),
               f' stroke="none" opacity="{f(.95 - i * .16)}"')


def shield(d, x, y, r=1.6, col="red", boss="gold"):
    c = C[col] if col in C else col
    d.circ(x, y, r, d.grad(c, "sphere"), ' stroke-width=".5"')
    d.circ(x, y, r - .35, "none", f' stroke="{lt("#c0a060", .2)}" stroke-width=".35" stroke-opacity="1"')
    d.circ(x, y, r * .3, d.grad(C[boss], "sphere"), ' stroke-width=".3"')


def kite(d, x, y, s=1.0, col="#3c5a86"):
    col = C.get(col, col)
    d.path(f"M{f(x - 1.5 * s)},{f(y - 2 * s)}h{f(3 * s)}c0,{f(2.2 * s)} -.5,{f(3.3 * s)} -{f(1.5 * s)},{f(4.3 * s)}"
           f"c-{f(1 * s)},-{f(1 * s)} -{f(1.5 * s)},-{f(2.1 * s)} -{f(1.5 * s)},-{f(4.3 * s)}Z", d.grad(col, "face"),
           ' stroke-width=".5"')
    d.path(f"M{f(x)},{f(y - 2 * s)}v{f(4.2 * s)}M{f(x - 1.5 * s)},{f(y - .7 * s)}h{f(3 * s)}",
           extra=f' stroke="{C["gold"]}" stroke-width=".4" stroke-opacity="1"')


def barrel(d, x, y, s=1.0):
    w, h = 2.6 * s, 3.4 * s
    d.path(f"M{f(x - w / 2)},{f(y - h)}c-.4,{f(h * .3)} -.4,{f(h * .7)} 0,{f(h)}a{f(w / 2)},{f(.6 * s)} 0 0 0 {f(w)},0"
           f"c.4,-{f(h * .3)} .4,-{f(h * .7)} 0,-{f(h)}Z", d.grad(C["wood"], "cyl"), ' stroke-width=".5"')
    d.ell(x, y - h, w / 2, .6 * s, d.grad(dk(C["wood"], .15), "face"), ' stroke-width=".45"')
    d.lines([((x - w / 2 - .25, y - h * .3), (x + w / 2 + .25, y - h * .3)),
             ((x - w / 2 - .25, y - h * .72), (x + w / 2 + .25, y - h * .72))], "#3a3430", .45, .9)


def hay(d, x, y, w=5.0, h=2.6):
    d.path(f"M{f(x - w / 2)},{f(y)}c-.3,-{f(h * .7)} .3,-{f(h)} {f(w * .2)},-{f(h)}h{f(w * .6)}"
           f"c{f(w * .2 - .1)},0 {f(w * .2 + .2)},{f(h * .3)} {f(w * .2)},{f(h)}Z", d.grad(C["straw"], "face"),
           ' stroke-width=".5"')
    r = d.rnd
    ll = []
    for _ in range(int(w * 2)):
        xx = r.uniform(x - w / 2 + .5, x + w / 2 - .5)
        yy = r.uniform(y - h + .5, y - .3)
        ll.append(((xx, yy), (xx + r.uniform(-.8, .8), yy - .7)))
    d.lines(ll, dk(C["straw"], .4), .25, .7)
    d.lines([((x - w * .2, y - h + .1), (x - w * .2, y)), ((x + w * .2, y - h + .1), (x + w * .2, y))], "#7a5a30", .35, .8)


def haystack(d, x, y, w=6.0, h=5.0):
    d.path(f"M{f(x - w / 2)},{f(y)}c0,-{f(h * .8)} {f(w * .25)},-{f(h)} {f(w / 2)},-{f(h)}"
           f"c{f(w * .25)},0 {f(w / 2)},{f(h * .2)} {f(w / 2)},{f(h)}Z", d.grad(C["straw"], "sphere"), ' stroke-width=".5"')
    r = d.rnd
    ll = []
    for _ in range(int(w * 2.5)):
        xx = r.uniform(x - w / 2 + .8, x + w / 2 - .8)
        yy = r.uniform(y - h + 1, y - .4)
        ll.append(((xx, yy), (xx + r.uniform(-.6, .6), yy - .9)))
    d.lines(ll, dk(C["straw"], .45), .25, .7)


def dummy(d, x, y, s=1.0):
    d.g(x, y, s)
    d.add(f'<path d="M0,0V-11" stroke="{OL}" stroke-width="1.3"/><path d="M0,0V-11" stroke="#8a6036" stroke-width=".6" stroke-opacity="1"/>')
    d.add(f'<path d="M-4,-7.6h8" stroke="{OL}" stroke-width="1.2"/><path d="M-4,-7.6h8" stroke="#a87a48" stroke-width=".55" stroke-opacity="1"/>')
    d.path("M-2.2,-8.6c-.3,2 -.3,4 .2,5.6h4c.5,-1.6 .5,-3.6 .2,-5.6Z", d.grad(C["straw"], "face"), ' stroke-width=".55"')
    d.lines([((-2.1, -6), (2.1, -6)), ((-2, -4.4), (2, -4.4))], "#7a5a30", .4, .9)
    d.circ(0, -10.3, 1.6, d.grad("#e6d29a", "sphere"), ' stroke-width=".5"')
    d.lines([((-1, -11.8), (-1.4, -12.6)), ((0, -12), (0, -12.9)), ((1, -11.8), (1.4, -12.6))], "#b89a50", .35)
    d.end()


def rack(d, x, y, w=6.0, s=1.0, shields=False):
    """Weapon rack: spears leaning on a crossbar."""
    d.g(x, y, s)
    hw = w / 2
    d.add(f'<path d="M{f(-hw)},0V-6M{f(hw)},0V-6M{f(-hw - .4)},-4.6H{f(hw + .4)}" stroke="{OL}" stroke-width="1.1"/>'
          f'<path d="M{f(-hw)},0V-6M{f(hw)},0V-6M{f(-hw - .4)},-4.6H{f(hw + .4)}" stroke="#8a6036" stroke-width=".5" stroke-opacity="1"/>')
    n = int(w / 1.3)
    for i in range(n):
        xx = -hw + .7 + i * (w - 1.4) / max(1, n - 1)
        d.add(f'<path d="M{f(xx)},0L{f(xx + .5)},-10" stroke="#8a6036" stroke-width=".55" stroke-opacity="1"/>')
        d.path(f"M{f(xx + .5)},-12.4l-.55,2.6h1.1Z", d.grad(C["iron"], "metal"), ' stroke-width=".35"')
    if shields:
        shield(d, -hw + 1, -2, 1.5, "red")
    d.end()


def anvil(d, x, y, s=1.0):
    d.g(x, y, s)
    d.path("M-1.2,0h2.4l-.4,-1.6h-1.6Z", d.grad("#5a3c24", "face"), ' stroke-width=".4"')
    d.path("M-2.6,-1.6h4.2c.6,0 1.8,-.3 2.4,-1h-1.4c-.2,0 -.4,-.2 -.4,-.5v-.4h-4.8Z", d.grad("#6a7078", "metal"),
           ' stroke-width=".5"')
    d.path("M-2.4,-3.4h4.4", extra=' stroke="#e8eef2" stroke-width=".35" stroke-opacity="1"')
    d.end()


def wheel(d, x, y, r=2.4):
    d.circ(x, y, r, "none", f' stroke="{OL}" stroke-width="1.2"')
    d.circ(x, y, r, "none", f' stroke="#8a6036" stroke-width=".55" stroke-opacity="1"')
    sp = [((x + r * math.cos(a) * .95, y + r * math.sin(a) * .95), (x - r * math.cos(a) * .95, y - r * math.sin(a) * .95))
          for a in (0.3, 1.35, 2.4)]
    d.lines(sp, "#6b4424", .4, 1)
    d.circ(x, y, .45, "#4a3a2a", ' stroke-width=".3"')


def ram(d, x, y, s=1.0, roofed=False):
    """Battering ram on a wheeled frame; (x, y) ground centre."""
    d.g(x, y, s)
    if roofed:
        d.path("M-8,-3.2L-5.6,-9.2h11.4L8.2,-3.2Z", d.grad(C["shingle"], "roof"), ' stroke-width=".6"')
        d.lines([((-7, -5.2), (7.2, -5.2)), ((-6.2, -7.2), (6.6, -7.2))], dk(C["shingle"], .5), .35)
        d.path("M-8,-3.2h16.2", extra=' stroke="#3b2a17" stroke-width=".7"')
    d.add('<path d="M-6,-1.8V-6.6M6,-1.8V-6.6M-6.6,-6.4H6.6" stroke="#3b2a17" stroke-width="1.2"/>'
          '<path d="M-6,-1.8V-6.6M6,-1.8V-6.6M-6.6,-6.4H6.6" stroke="#9a6a3a" stroke-width=".55" stroke-opacity="1"/>')
    d.path("M-7.6,-4.6h12.4v-1.6h-12.4Z", d.grad("#8a5a30", "cyl"), ' stroke-width=".5"')
    d.path("M4.8,-4.2l3.2,-.6v-1.6l-3.2,-.6Z", d.grad(C["iron"], "metal"), ' stroke-width=".5"')
    d.lines([((-3, -6.4), (-3, -5.6)), ((2.5, -6.4), (2.5, -5.6))], "#4a3a2a", .35)
    d.end()
    wheel(d, x - 4.4 * s, y - 1.5 * s, 1.5 * s)
    wheel(d, x + 4.4 * s, y - 1.5 * s, 1.5 * s)


def catapult(d, x, y, s=1.0):
    d.g(x, y, s)
    d.path("M-6,-1.4h12v-1.3h-12Z", d.grad("#8a5a30", "face"), ' stroke-width=".5"')
    d.add('<path d="M-2.4,-2.6L0,-8.2L2.4,-2.6M-1.2,-5.4h2.4" stroke="#3b2a17" stroke-width="1.2" fill="none"/>'
          '<path d="M-2.4,-2.6L0,-8.2L2.4,-2.6M-1.2,-5.4h2.4" stroke="#9a6a3a" stroke-width=".55" stroke-opacity="1" fill="none"/>'
          '<path d="M4,-2.6L-5.2,-11.4" stroke="#3b2a17" stroke-width="1.2"/>'
          '<path d="M4,-2.6L-5.2,-11.4" stroke="#b08050" stroke-width=".55" stroke-opacity="1"/>')
    d.path("M-6.6,-12.6c.2,-1.2 2.2,-1.2 2.6,.4c-.4,.8 -1.8,.9 -2.6,-.4Z", d.grad("#6a4a2a", "face"), ' stroke-width=".4"')
    d.circ(-5.2, -12.9, .9, d.grad("#a8a090", "sphere"), ' stroke-width=".3"')
    d.end()
    wheel(d, x - 4.2 * s, y - 1.3 * s, 1.3 * s)
    wheel(d, x + 4.2 * s, y - 1.3 * s, 1.3 * s)


def logs(d, x, y, n=3, s=1.0):
    d.g(x, y, s)
    pos = [(-2, -1.1), (0, -1.1), (2, -1.1), (-1, -2.9), (1, -2.9), (0, -4.7)][:n]
    for (px, py) in sorted(pos, key=lambda p: p[1]):
        d.path(f"M{f(px - .2)},{f(py - 1)}h-5.2a.9,1 0 0 0 0,2h5.2Z", d.grad("#a0703e", "vert"), ' stroke-width=".45"')
        d.ell(px, py, .9, 1, d.grad("#e0c08a", "sphere"), ' stroke-width=".45"')
        d.circ(px, py, .35, "none", ' stroke="#9a7040" stroke-width=".25"')
    d.end()


def horse(d, x, y, s=1.0, col="#8e5a30", drinking=False, flip=False, mane="#3a2414"):
    """Side-view horse facing left; (x, y) is ground contact centre."""
    d.g(x, y, s, flip)
    legd = dk(col, .35)
    d.add(f'<path d="M-3.4,-5L-3.7,0M3.4,-5L3.1,0" stroke="{OL}" stroke-width="1.35"/>'
          f'<path d="M-3.4,-5L-3.7,0M3.4,-5L3.1,0" stroke="{legd}" stroke-width=".65" stroke-opacity="1"/>')
    if drinking:
        body = ("M6,-8.6C6.5,-6 5.8,-5 4.5,-4.8L-3.4,-4.9C-4.8,-5.1 -5.6,-6 -6.2,-7.2L-8.4,-4.6"
                "C-8.8,-3.8 -9.6,-3.2 -10.2,-3.6C-10.6,-4.2 -10.4,-5 -10,-5.6L-8.2,-9.2L-8.4,-10.4L-7.4,-9.6"
                "C-6,-9.6 -4.6,-9.4 -3.2,-9.5C0,-9.4 3,-9.6 6,-8.6Z")
        mpath = "M-8.2,-9.4C-6.6,-9.8 -5,-9.8 -3.2,-9.6"
    else:
        body = ("M6,-8.6C6.5,-6 5.8,-5 4.5,-4.8L-3.5,-4.9C-5,-5.2 -5.6,-6.5 -6,-8L-8.8,-10.6"
                "C-9.6,-10.4 -10.6,-10.4 -10.8,-11.2C-10.9,-12 -10.2,-12.6 -9.4,-13L-7.6,-14.2L-7.2,-15.3"
                "L-6.6,-14.2C-5.4,-13 -4.4,-11 -3.2,-9.6C0,-9.4 3,-9.6 6,-8.6Z")
        mpath = "M-7.2,-14C-5.8,-12.6 -4.8,-11 -3.2,-9.7"
    d.add(f'<path d="M6,-8.4C8,-7 7.8,-4.4 7.4,-3" fill="none" stroke="{mane}" stroke-width="1.1" stroke-opacity="1"/>')
    d.path(body, d.grad(col, "face"), ' stroke-width=".55"')
    d.path("M-2.6,-8.8C0,-9 3,-9 5.4,-8.2", extra=f' stroke="{lt(col, .5)}" stroke-width=".45" stroke-opacity=".8"')
    d.path(mpath, extra=f' stroke="{mane}" stroke-width=".9" stroke-opacity="1"')
    d.add(f'<path d="M-2.4,-5L-2.2,0M4.6,-5L5,0" stroke="{OL}" stroke-width="1.35"/>'
          f'<path d="M-2.4,-5L-2.2,0M4.6,-5L5,0" stroke="{col}" stroke-width=".65" stroke-opacity="1"/>')
    if not drinking:
        d.circ(-8.6, -12.4, .28, "#1a120a", NS)
    d.end()


def horse_head(d, x, y, s=1.0, col="#8e5a30"):
    """Horse head looking out of a stall door, facing left; (x, y) neck base."""
    d.g(x, y, s)
    d.path("M1.4,0C1.2,-1.6 .9,-3 .3,-4L.6,-5.4L-.2,-4.6C-1,-4.6 -1.8,-4 -2.6,-3.2L-3.6,-2"
           "C-4,-1.4 -3.6,-.8 -3,-.9L-1.6,-1.2C-1.2,-.6 -1.2,0 -1.2,0Z", d.grad(col, "face"), ' stroke-width=".5"')
    d.path("M.4,-4.1C1,-3 1.4,-1.6 1.4,0", extra=' stroke="#2a1a0e" stroke-width=".6" stroke-opacity="1"')
    d.circ(-1.4, -3.3, .25, "#140c06", NS)
    d.end()


def stall(d, x, w, h, z0=0.0, head=None, s=1.0):
    """Dutch stall door on the front face, optional horse head."""
    P = d.P
    h *= d.VZ
    x0, y0 = P(x - w / 2, 0, z0)
    yt = y0 - h
    d.path(f"M{f(x0)},{f(y0)}V{f(yt)}H{f(x0 + w)}V{f(y0)}Z", "#22160c", ' stroke-width=".6"')
    if head:
        horse_head(d, x0 + w * .62, yt + h * .55, s * w / 3.2, head)
    hh = h * .5
    d.path(f"M{f(x0)},{f(y0)}V{f(y0 - hh)}H{f(x0 + w)}V{f(y0)}Z", d.grad(C["plank"], "face"), ' stroke-width=".55"')
    d.lines([((x0, y0), (x0 + w, y0 - hh)), ((x0, y0 - hh), (x0 + w, y0))], dk(C["plank"], .45), .35, .9)
    d.path(f"M{f(x0)},{f(yt)}H{f(x0 + w)}", extra=f' stroke="{C["beam"]}" stroke-width=".9"')


def fence(d, pts, h=2.4):
    """Rail fence through screen points (ground)."""
    ps = []
    for p, q in zip(pts, pts[1:]):
        n = max(1, int(math.dist(p, q) / 3.2))
        for i in range(n):
            ps.append(lerp(p, q, i / n))
    ps.append(pts[-1])
    rails = []
    for k in (.45, .85):
        rails.append(dpts([(x, y - h * k) for x, y in pts], False))
    d.add(f'<path d="{"".join(rails)}" fill="none" stroke="{OL}" stroke-width="1"/>'
          f'<path d="{"".join(rails)}" fill="none" stroke="#a87a48" stroke-width=".45" stroke-opacity="1"/>')
    for x, y in ps:
        post(d, x, y, y - h - .4, .8, "#8a6036")


def armour_stand(d, x, y, s=1.0, helm=True):
    d.g(x, y, s)
    d.add(f'<path d="M0,0V-9M-1.6,0h3.2" stroke="{OL}" stroke-width="1.1"/><path d="M0,0V-9" stroke="#8a6036" stroke-width=".5" stroke-opacity="1"/>')
    d.path("M-2.4,-8.4c.6,-.6 4.2,-.6 4.8,0l-.4,3.6c-.2,.8 -.8,1.2 -2,1.2s-1.8,-.4 -2,-1.2Z", d.grad(C["iron"], "metal"),
           ' stroke-width=".5"')
    d.path("M-2.6,-8.2c-.8,.2 -1.2,1 -1,1.8l1,-.2M2.6,-8.2c.8,.2 1.2,1 1,1.8l-1,-.2", d.grad(C["iron"], "metal"), ' stroke-width=".45"')
    d.path("M-1.8,-4h3.6l-.4,1.6h-2.8Z", d.grad(C["red"], "face"), ' stroke-width=".4"')
    if helm:
        d.path("M-1.3,-9c0,-1.9 2.6,-1.9 2.6,0v1.1h-2.6Z", d.grad(C["iron"], "metal"), ' stroke-width=".45"')
        d.path("M0,-11.2v-.9", extra=f' stroke="{C["red"]}" stroke-width=".7" stroke-opacity="1"')
    d.end()


def grindstone(d, x, y, s=1.0):
    d.g(x, y, s)
    d.add('<path d="M-2,0L-1.2,-3.2M2,0L1.2,-3.2" stroke="#3b2a17" stroke-width="1"/>')
    d.ell(0, -3.4, 1, 2.2, d.grad("#a8a090", "face"), ' stroke-width=".5"')
    d.end()


def torch(d, x, y, h=4.0):
    post(d, x, y, y - h, .6, "#6b4424")
    d.ell(x, y - h - .9, .8, 1.3, d.grad("x", "glow"), NS)


def bucket(d, x, y, s=1.0):
    d.path(f"M{f(x - 1.1 * s)},{f(y - 1.8 * s)}l.25,{f(1.8 * s)}h{f(1.7 * s)}l.25,-{f(1.8 * s)}Z",
           d.grad(C["wood"], "cyl"), ' stroke-width=".45"')
    d.ell(x, y - 1.8 * s, 1.1 * s, .35 * s, C["water"], ' stroke-width=".35"')


def scroll_lectern(d, x, y, s=1.0):
    d.g(x, y, s)
    d.add('<path d="M0,0V-4.6M-1.4,0h2.8" stroke="#3b2a17" stroke-width="1"/><path d="M0,0V-4.6" stroke="#8a6036" stroke-width=".45" stroke-opacity="1"/>')
    d.path("M-2.4,-4.4l4.4,-1.4l.4,1l-4.4,1.4Z", d.grad("#f2e6c4", "face"), ' stroke-width=".45"')
    d.circ(-2.4, -3.9, .5, d.grad("#e8d8ae", "sphere"), ' stroke-width=".3"')
    d.circ(2.4, -5.3, .5, d.grad("#e8d8ae", "sphere"), ' stroke-width=".3"')
    d.end()


def statue(d, x, y, s=1.0, gold=False):
    c = C["gold"] if gold else C["marble"]
    d.g(x, y, s)
    d.path("M-1.8,0h3.6v-2.4h-3.6Z", d.grad(C["ashlar"], "face"), ' stroke-width=".45"')
    d.path("M-.9,-2.4l.2,-4c-.6,-.3 -.6,-1.6 .7,-1.6s1.3,1.3 .7,1.6l.2,4Z", d.grad(c, "face"), ' stroke-width=".45"')
    d.path("M.6,-6.4l1.6,-1.8", extra=' stroke-width=".7"')
    d.end()


def column(d, x, y0, y1, w=1.6, mat="marble"):
    c = C[mat]
    d.add(f'<path d="M{f(x - w / 2)},{f(y0)}V{f(y1)}h{f(w)}V{f(y0)}Z" fill="{d.grad(c, "cyl")}" stroke-width=".5"/>')
    d.add(f'<path d="M{f(x - w / 2 - .4)},{f(y1)}h{f(w + .8)}v.8h-{f(w + .8)}Z" fill="{lt(c, .2)}" stroke-width=".45"/>'
          f'<path d="M{f(x - w / 2 - .3)},{f(y0)}h{f(w + .6)}v-.7h-{f(w + .6)}Z" fill="{lt(c, .2)}" stroke-width=".45"/>')


def dome(d, sx, sy, r, h, mat="copper", ribs=True, trim=False, lantern=True):
    c = C[mat]
    ry = r * .36
    d.path(f"M{f(sx - r)},{f(sy)}C{f(sx - r)},{f(sy - h * 1.05)} {f(sx + r)},{f(sy - h * 1.05)} {f(sx + r)},{f(sy)}"
           f"A{f(r)},{f(ry)} 0 0 1 {f(sx - r)},{f(sy)}Z", d.grad(c, "sphere"))
    if ribs:
        rl = []
        for k in (-2, -1, 0, 1, 2):
            a = k * .55
            bx = sx + r * math.sin(a)
            by = sy + ry * math.cos(a)
            rl.append(f"M{f(bx)},{f(by)}Q{f(sx + r * math.sin(a) * .9)},{f(sy - h * .7)} {f(sx)},{f(sy - h * .78)}")
        d.add(f'<path d="{"".join(rl)}" fill="none" stroke="{dk(c, .45)}" stroke-width=".35"/>')
        d.add(f'<path d="M{f(sx - r * .62)},{f(sy - h * .55)}Q{f(sx - r * .5)},{f(sy - h * .78)} {f(sx - r * .15)},{f(sy - h * .8)}" '
              f'fill="none" stroke="{lt(c, .7)}" stroke-width=".5" stroke-opacity=".8"/>')
    if trim:
        d.path(f"M{f(sx - r)},{f(sy)}A{f(r)},{f(ry)} 0 0 0 {f(sx + r)},{f(sy)}",
               extra=f' stroke="{C["gold"]}" stroke-width=".6" stroke-opacity="1"')
    if lantern:
        ty = sy - h * .78
        d.path(f"M{f(sx - .8)},{f(ty + .2)}v-1.6h1.6v1.6Z", d.grad(C["marble"], "cyl"), ' stroke-width=".4"')
        finial(d, sx, ty - 1.4, .8)


# ------------------------------------------------------------------ building helpers

def hall(d, a, b, d0, d1, z1, wall, roof, rh, plinth=0.0, upper=None, upper_z=None, trim=False, o=1.4,
         roof_kind="gable", gable_mat=None, frame=False, base=0.0):
    """Walls (optional stone plinth and different upper storey) + roof. Returns roof ridge points."""
    if plinth:
        walls(d, a, b, d0, d1, 0, plinth, "stone", eave=False)
        d.poly([d.P(a - .3, d0 - .3, plinth), d.P(b + .3, d0 - .3, plinth), d.P(b + .3, d0 - .3, plinth + .5),
                d.P(a - .3, d0 - .3, plinth + .5)], lt(C["stone"], .2), ' stroke-width=".5"')
    z0 = plinth or base
    if upper and upper_z:
        walls(d, a, b, d0, d1, z0, upper_z, wall, eave=False)
        walls(d, a, b, d0, d1, upper_z, z1, upper, ao=False)
        if upper == "plaster" and frame:
            timber(d, a, b, d0, d1, upper_z, z1)
        d.poly([d.P(a - .2, d0 - .2, upper_z - .3), d.P(b + .2, d0 - .2, upper_z - .3), d.P(b + .2, d0 - .2, upper_z + .5),
                d.P(a - .2, d0 - .2, upper_z + .5)], d.grad(C["beam"], "face"), ' stroke-width=".5"')
    else:
        walls(d, a, b, d0, d1, z0, z1, wall)
        if wall == "plaster" and frame:
            timber(d, a, b, d0, d1, z0, z1)
    gm = gable_mat or (upper or wall)
    if roof_kind == "gable":
        return gable(d, a, b, d0, d1, z1, rh, roof, o=o, gable_mat=gm, trim=trim)
    return hip(d, a, b, d0, d1, z1, rh, roof, o=o, trim=trim)


def square_tower(d, a, b, d0, d1, z1, mat, roof="tile", rh=8.0, trim=False, crenel=False, flag=None, win=True):
    walls(d, a, b, d0, d1, 0, z1, mat)
    P = d.P
    if win:
        for zz in (z1 * .45, z1 * .75):
            window(d, (a + b) / 2, zz, 1.1, 2.2, d0, shutters=False, arch=True)
    if crenel:
        top_face(d, a, b, d0, d1, z1, C[mat])
        crenels(d, a, b, d0, d1, z1, mat, w=1.3, gap=1.1, h=1.7)
        if flag:
            x, y = P((a + b) / 2, (d0 + d1) / 2, z1)
            pennant(d, x, y, 9, flag)
        return
    r0, r1 = hip(d, a, b, d0, d1, z1, rh, roof, o=1.0, trim=trim)
    if flag:
        pennant(d, r0[0], r0[1] - (3 if trim else 0), 7, flag)


def lean_to(d, a, b, d0, d1, z_low, z_high, mat, posts_mat="darkwood"):
    """Open shed: posts at front, mono-pitch roof sloping to the front."""
    P = d.P
    c = C[mat]
    for x in (a + .5, b - .5):
        x0, y0 = P(x, d0, 0)
        _, y1 = P(x, d0, z_low)
        post(d, x0, y0, y1, 1.0, C[posts_mat])
    e0, e1 = P(a - 1, d0 - 1.2, z_low - .4), P(b + 1, d0 - 1.2, z_low - .4)
    r0, r1 = P(a - 1, d1, z_high), P(b + 1, d1, z_high)
    side = [e1, r1, P(b + 1, d1, z_high - .8), P(b + 1, d0 - 1.2, z_low - 1.2)]
    d.poly(side, dk(c, .45))
    d.poly([e0, e1, r1, r0], d.grad(c, "roof"))
    _roof_tex(d, e0, e1, r1, r0, mat)
    d.poly([e0, e1, (e1[0], e1[1] + .8), (e0[0], e0[1] + .8)], dk(c, .38))


# ================================================================== buildings

def barracks(s, d):
    W = [32, 34, 35, 35, 36][s - 1]
    a = 6
    b = a + W
    D = [12, 13, 14, 14, 15][s - 1]
    d0 = 4
    ground(d, yard=(58, 87.5, 13, 5.2))
    cast(d, (a + b) / 2 + 9, 89.5, W / 2 + 10, 6)
    P = d.P
    # watch tower behind right (s4+)
    if s >= 4:
        ta, tb = b - 5, b + 3
        tz = 30 if s == 4 else 34
        square_tower(d, ta, tb, d0 + D - 2, d0 + D + 6, tz, "stone" if s == 5 else "plank" if False else "stone",
                     roof="tile", rh=8, trim=s == 5, flag="red" if s == 4 else "gold")
    wall = ["wood", "wood", "stone", "stone", "ashlar"][s - 1]
    roof = ["thatch", "shingle", "tile", "tile", "tile"][s - 1]
    z1 = [11, 12, 16, 17, 18][s - 1]
    rh = [10, 10, 10, 11, 11][s - 1]
    if s in (3, 4):
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", roof, rh, upper="plaster", upper_z=7, frame=True,
                      gable_mat="plaster")
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, wall, roof, rh, trim=s == 5, gable_mat="plank" if s < 3 else None)
    # door + windows
    xm = a + W * .5
    door(d, xm, 4.2 if s < 3 else 5, 6 if s < 3 else 7, d0=d0)
    for wx in (a + W * .2, a + W * .8):
        window(d, wx, 3.5 if s < 3 else 9.5, 2.0, 2.6, d0)
    if s >= 3:
        for wx in (a + W * .2, a + W * .8):
            window(d, wx, 3, 1.8, 2.2, d0, shutters=False, arch=True)
    side_window(d, b, d0 + D / 2, 4 if s < 3 else 9.5, 3, 2.6)
    # shields on wall
    if s >= 2:
        xs = [a + W * .35, a + W * .65] if s < 5 else [a + W * .33, a + W * .5, a + W * .67]
        zz = [7.8, 8.6, 13.4, 14, 15][s - 1]
        for i, x in enumerate(xs):
            sx, sy = P(x, d0, zz)
            if s == 5 and i == 1:
                continue
            shield(d, sx, sy, 1.5, "red" if i % 2 == 0 else "#3c5a86")
    if s >= 4:
        sx, sy = P(a + W * .5, d0, z1 - .2)
        banner(d, sx - 1.5, sy, 3, 6 if s == 4 else 7)
    if s == 5:
        sx, sy = P(a + W * .1, d0, z1 - .2)
        banner(d, sx - 1.2, sy, 2.6, 5.5)
        sx, sy = P(a + W * .9, d0, z1 - .2)
        banner(d, sx - 1.4, sy, 2.6, 5.5)
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    elif s >= 2:
        pennant(d, r1[0] - 1, r1[1], 6 if s < 4 else 7, "red")
    # yard props
    rack(d, 5, 95, 6, .9, shields=s >= 3)
    if s >= 3:
        rack(d, 70, 90.5, 5, .85)
    dummy(d, 58, 88, .85)
    if s >= 2:
        dummy(d, 64.5, 92, .8)
    if s >= 4:
        dummy(d, 52, 93, .8)
    if s >= 5:
        torch(d, P(a, d0, 0)[0] - 1, P(a, d0, 0)[1] + 1.5, 6)


def greatbarracks(s, d):
    P = d.P
    ground(d, rx=34, ry=10.2, yard=(37, 91, 14, 3.5))
    cast(d, 44, 89, 30, 7)
    # inner hall behind the wall
    ha, hb = 20, 52
    hz = [17, 19, 22, 24, 25][s - 1]
    if s >= 4:
        # keep tower in the back
        square_tower(d, 28, 37, 16, 24, [36, 36, 36, 39, 42][s - 1], "stone", roof="tile", rh=9, trim=s == 5,
                     flag="red" if s == 4 else "gold")
    hall(d, ha, hb, 9, 19, hz, "ashlar" if s >= 4 else "stone" if s == 3 else "plaster", "tile", 9,
         upper="plaster" if s < 3 else None, upper_z=hz - 7 if s < 3 else None, frame=s < 3, trim=s == 5,
         gable_mat="plaster" if s < 3 else "ashlar" if s >= 4 else "stone", base=[0, 0, 4, 5, 6][s - 1])
    for wx in (ha + 6, ha + 14, ha + 22):
        window(d, wx, hz - 5, 1.6, 2.6, 9, shutters=False, arch=True)
    side_window(d, hb, 14, hz - 5.5, 2.6, 2.6)
    # curtain wall front block
    fa, fb = 9, [47, 50, 52, 53, 54][s - 1]
    fz = [11, 12, 13, 14, 15][s - 1]
    if s >= 2:
        # left round tower behind the wall line
        round_tower(d, 8.5, 6, 4.6, 0, fz + (8 if s == 2 else 5), "stone", top="cone" if s >= 3 else "crenel", rh=8, roof="tile",
                    trim=s == 5, flag=("red" if s < 5 else "gold") if s >= 3 else None)
    walls(d, fa, fb, 0, 6, 0, fz, "stone", eave=False)
    top_face(d, fa, fb, 0, 6, fz, C["stone"])
    crenels(d, fa, fb, 0, 6, fz, "stone")
    # gate
    gx = (fa + fb) / 2
    door(d, gx, 6.5, 8.5, arch=True, col="#7a4e2a")
    gx0, gy0 = P(gx - 3.25, 0, 0)
    d.path(f"M{f(gx0 - .7)},{f(gy0)}V{f(gy0 - 5.5)}A{f(3.95)},{f(3.95)} 0 0 1 {f(gx0 + 7.2)},{f(gy0 - 5.5)}V{f(gy0)}",
           extra=f' stroke="{lt(C["stone"], .2)}" stroke-width=".9"')
    # banners on wall
    if s >= 2:
        for x in ([fa + 6, fb - 6] if s >= 3 else [fa + 6]):
            sx, sy = P(x, 0, fz - 1)
            banner(d, sx - 1.5, sy, 3, 5.5 if s < 4 else 6.5)
    for x in (fa + 13, fb - 13):
        window(d, x, fz - 5, .9, 2.4, 0, shutters=False, arch=True)
    if s >= 3:
        round_tower(d, fb + 2.5, 2, 4.4, 0, fz + 6, "stone", top="cone", rh=8.5, roof="tile", trim=s == 5,
                    flag="red" if s < 5 else "gold")
    if s == 1 or s == 2:
        pennant(d, P(fb, 3, fz)[0] - 1, P(fb, 3, fz)[1] - 1.5, 7, "red")
    if s >= 4:
        pennant(d, P(gx, 0, fz)[0], P(gx, 0, fz)[1] - 1.8, 7, "gold" if s == 5 else "red")
    rack(d, 4.5, 95, 5, .8, shields=True)
    if s >= 2:
        rack(d, 70.5, 93.5, 4.5, .75)
    if s >= 3:
        dummy(d, 61, 95.5, .7)
    if s == 5:
        torch(d, gx - 5.5, 91.8, 5)
        torch(d, gx + 5.5, 91.8, 5)


def stable(s, d):
    P = d.P
    a = [9, 8, 7, 12, 11][s - 1]
    W = [36, 38, 40, 38, 40][s - 1]
    b = a + W
    D = [11, 12, 13, 13, 14][s - 1]
    d0 = 3
    ground(d)
    cast(d, (a + b) / 2 + 8, 89, W / 2 + 9, 6)
    wall = ["plank", "plank", "stone", "stone", "ashlar"][s - 1]
    roof = ["thatch", "shingle", "tile", "tile", "tile"][s - 1]
    z1 = [9, 10, 13, 14, 15][s - 1]
    rh = [9, 9.5, 10, 10.5, 11][s - 1]
    if s >= 4:
        # annex on the left (lower)
        la = a - 9
        hall(d, la, a + 2, d0 + 2, d0 + D - 1, 8 if s == 4 else 9, "plank" if s == 4 else "stone",
             "shingle" if s == 4 else "tile", 6, trim=False)
        door(d, la + 4.5, 3.2, 5, d0=d0 + 2, arch=False, col="#8a5a30")
    if s in (3, 4):
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", roof, rh, upper="plaster", upper_z=6.5, frame=True)
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, wall, roof, rh, trim=s == 5, gable_mat="plank" if s < 3 else None)
    n = [3, 4, 4, 4, 4][s - 1]
    heads = ["#8e5a30", "#e6dccb", "#5a3a22", "#a8703e"]
    for i in range(n):
        x = a + W * (i + .5) / n
        d.g(0, -KY * d0 + 0)
        d.end()
        _stall_at(d, x, d0, 3.4, 5.2, heads[i % 4] if (i + s) % 2 == 0 or s >= 3 else None)
    # hay loft door on upper floor / gable
    if s >= 3:
        for i in range(2):
            x = a + W * (.3 + .4 * i)
            window(d, x, 8.6, 2.6, 3.2, d0, shutters=False)
    side_window(d, b, d0 + D / 2, 3, 2.6, 2.2)
    # cupola on ridge
    if s >= 4:
        cx = (r0[0] + r1[0]) / 2
        cy = r0[1]
        _cupola(d, cx, cy + 1.2, 2.6, gold=s == 5)
    if s >= 4:
        sx, sy = P(a + W * .5, d0, z1 - .2)
        banner(d, sx - 1.5, sy, 3, 5)
    if s == 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
        pennant(d, r1[0], r1[1] - 3, 6, "gold")
    elif s >= 2:
        pennant(d, r1[0], r1[1], 6, "red")
    # props
    haystack(d, 6.5 if s < 4 else 64.5, 92 if s < 4 else 85.5, 6 + s * .3, 4.5 + s * .3)
    if s >= 2:
        fence(d, [(54, 96.5), (63, 94), (70.5, 89)])
        horse(d, 63, 92.5, .78, "#8e5a30")
    if s >= 3:
        hay(d, 10 if s < 4 else 8, 95.5, 5, 2.4)
        bucket(d, 47, 95.3)
    if s == 5:
        horse(d, 22, 96.2, .7, "#e6dccb", flip=True)


def _stall_at(d, x, d0, w, h, head):
    G0 = d.G
    d.G = G0 - KY * d0
    xoff = KX * d0
    stall(d, x + xoff - KX * 0, w, h, 0, head)
    d.G = G0


def _cupola(d, cx, cy, w, gold=False):
    """Small roofed cupola / louvre sitting on a ridge at screen (cx, cy)."""
    h = w * 1.2
    d.path(f"M{f(cx - w / 2)},{f(cy)}v-{f(h)}h{f(w)}v{f(h)}Z", d.grad(C["plank"], "face"), ' stroke-width=".5"')
    d.path(f"M{f(cx - w * .25)},{f(cy - h * .25)}v-{f(h * .5)}h{f(w * .5)}v{f(h * .5)}Z", "#2a1c10", ' stroke-width=".4"')
    rc = C["gold"] if gold else C["tile"]
    d.path(f"M{f(cx - w * .8)},{f(cy - h + .2)}L{f(cx)},{f(cy - h - w * .9)}L{f(cx + w * .8)},{f(cy - h + .2)}Z",
           d.grad(rc, "roof"), ' stroke-width=".5"')
    if gold:
        finial(d, cx, cy - h - w * .9, .8)
    else:
        d.path(f"M{f(cx)},{f(cy - h - w * .9)}v-1.4", extra=' stroke-width=".5"')


def greatstable(s, d):
    P = d.P
    a = [6, 5, 5, 8, 8][s - 1]
    W = [48, 50, 50, 48, 48][s - 1]
    b = a + W
    D = [12, 13, 13, 13, 14][s - 1]
    d0 = 3
    ground(d, rx=34, ry=10.2)
    cast(d, (a + b) / 2 + 7, 89.5, W / 2 + 8, 6.5)
    z1 = [11, 13, 15, 16, 17][s - 1]
    rh = [9.5, 10, 10.5, 11, 11.5][s - 1]
    if s >= 4:
        square_tower(d, b - 9, b - 1, d0 + D - 1, d0 + D + 7, [32, 32, 32, 34, 38][s - 1], "stone", roof="tile", rh=8,
                     trim=s == 5, flag="red" if s == 4 else "gold")
    if s <= 2:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "plaster", "tile", rh, frame=True, gable_mat="plaster")
    elif s <= 4:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", "tile", rh, upper="plaster", upper_z=7, frame=True)
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "ashlar", "tile", rh, upper="ashlar", upper_z=7.5, trim=True)
    n = 6 if s < 3 else 5
    heads = ["#8e5a30", "#e6dccb", "#5a3a22", "#a8703e", "#6a4428", "#d8c8a8"]
    gate_i = None if s < 3 else 2
    for i in range(n):
        x = a + W * (i + .5) / n
        if i == gate_i:
            continue
        _stall_at(d, x, d0, 3.4, 5.4, heads[i] if i % 2 == 0 or s >= 2 else None)
    # dormers / loft windows on roof
    if s >= 2:
        nd = 3 if s < 4 else 4
        for i in range(nd):
            x = a + W * (i + .5) / nd
            _dormer(d, x, d0, z1, gold=s == 5)
    if s >= 3:
        # projecting central gate pavilion with front gable
        gx = a + W * (gate_i + .5) / n
        ga, gb = gx - 5, gx + 5
        walls(d, ga, gb, d0 - 3, d0 + 1, 0, z1 + 2, "ashlar" if s == 5 else "stone")
        door(d, gx, 5, 7.5, d0=d0 - 3, col="#7a4e2a")
        window(d, gx, 10.5, 1.8, 2.8, d0 - 3, shutters=False, arch=True)
        front_gable(d, ga, gb, d0 - 3, d0 + 5, z1 + 2, 6, "tile", tri_mat="ashlar" if s == 5 else "plaster",
                    trim=s == 5)
        sx, sy = P(gx, d0 - 3, z1 + 8)
        if s >= 4:
            pennant(d, sx, sy - (2.4 if s == 5 else 0), 6, "red" if s == 4 else "gold")
    else:
        # cupola for the first stages
        cx = (r0[0] + r1[0]) / 2
        _cupola(d, cx, r0[1] + 1.2, 2.6)
        pennant(d, r1[0], r1[1], 6, "red")
    if s >= 4:
        for x in (a + 5, b - 5):
            sx, sy = P(x, d0, z1 - .3)
            banner(d, sx - 1.4, sy, 2.8, 5.5)
    if s >= 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    # props
    hay(d, 66 if s < 4 else 68, 95 if s < 4 else 93.5, 5, 2.4)
    horse(d, 13, 96, .72, "#8e5a30")
    if s >= 2:
        horse(d, 55, 97, .72, "#e6dccb", flip=True)
    if s >= 3:
        haystack(d, 4.5, 90.5, 5.4, 4.4)
    if s >= 4:
        fence(d, [(19, 97.5), (30, 98)])


def _dormer(d, x, d0, z1, gold=False):
    """Small dormer window sitting on the front roof slope."""
    P = d.P
    bx, by = P(x, d0 + 2.5, z1 + 1.2)
    w = 3.2
    d.path(f"M{f(bx - w / 2)},{f(by)}v-2.6h{f(w)}v2.6Z", d.grad(C["plaster"], "face"), ' stroke-width=".5"')
    d.path(f"M{f(bx - .7)},{f(by - .3)}v-1.8h1.4v1.8Z", "#2a1c10", ' stroke-width=".35"')
    d.path(f"M{f(bx - w / 2 - .6)},{f(by - 2.4)}L{f(bx)},{f(by - 4.6)}L{f(bx + w / 2 + .6)},{f(by - 2.4)}Z",
           d.grad(C["tile"], "roof"), ' stroke-width=".5"')
    if gold:
        d.path(f"M{f(bx - w / 2 - .6)},{f(by - 2.4)}L{f(bx)},{f(by - 4.6)}L{f(bx + w / 2 + .6)},{f(by - 2.4)}",
               extra=f' stroke="{C["gold"]}" stroke-width=".45" stroke-opacity="1"')


def workshop(s, d):
    P = d.P
    ground(d, yard=(44, 90, 16, 4.5))
    a = [8, 7, 6, 6, 5][s - 1]
    W = [24, 25, 26, 26, 27][s - 1]
    b = a + W
    D = [12, 13, 13, 14, 14][s - 1]
    d0 = 4
    cast(d, (a + b) / 2 + 14, 88.5, W / 2 + 15, 6)
    z1 = [10, 11, 15, 16, 17][s - 1]
    rh = [9, 9.5, 10, 10.5, 11][s - 1]
    # crane gantry behind (s3+)
    if s >= 3:
        cx0, cy0 = P(b + 8, d0 + D + 2, 0)
        top = cy0 - [0, 0, 30, 33, 36][s - 1]
        d.add(f'<path d="M{f(cx0 - 3)},{f(cy0)}L{f(cx0)},{f(top)}L{f(cx0 + 3)},{f(cy0)}M{f(cx0 - 1.5)},{f((cy0 + top) / 2)}h3" '
              f'stroke="{OL}" stroke-width="1.3" fill="none"/>'
              f'<path d="M{f(cx0 - 3)},{f(cy0)}L{f(cx0)},{f(top)}L{f(cx0 + 3)},{f(cy0)}M{f(cx0 - 1.5)},{f((cy0 + top) / 2)}h3" '
              f'stroke="#9a6a3a" stroke-width=".6" stroke-opacity="1" fill="none"/>'
              f'<path d="M{f(cx0 + 5)},{f(top + 3)}L{f(cx0 - 9)},{f(top - 2)}" stroke="{OL}" stroke-width="1.3"/>'
              f'<path d="M{f(cx0 + 5)},{f(top + 3)}L{f(cx0 - 9)},{f(top - 2)}" stroke="#b08050" stroke-width=".6" stroke-opacity="1"/>'
              f'<path d="M{f(cx0 - 8)},{f(top - 1.6)}V{f(top + 9)}" stroke="#5a4a3a" stroke-width=".4"/>')
        d.path(f"M{f(cx0 - 9)},{f(top + 9)}h2v2h-2Z", d.grad("#a8a090", "face"), ' stroke-width=".4"')
        if s >= 4:
            pennant(d, cx0, top, 5, "red" if s == 4 else "gold")
    # open shed on the right holding the ram
    sa = b + KX * D - 1.5
    sb = sa + [13, 14, 15, 15, 16][s - 1]
    sroof = ["thatch", "shingle", "tile", "tile", "tile"][s - 1]
    sw_ = [P(sb, d0 + 1, 0), P(sb, d0 + D - 1, 0), P(sb, d0 + D - 1, z1 + 4), P(sb, d0 + 1, z1)]
    d.poly(sw_, d.grad(C["plank"], "side"))
    d.lines([(lerp(sw_[0], sw_[1], t), lerp(sw_[3], sw_[2], t)) for t in (.2, .4, .6, .8)], dk(C["plank"], .6), .3, .8)
    # back wall of shed visible inside
    bw_ = [P(sa, d0 + D - 1, 0), P(sb, d0 + D - 1, 0), P(sb, d0 + D - 1, z1 + 2.5), P(sa, d0 + D - 1, z1 + 2.5)]
    d.poly(bw_, d.grad(dk(C["plank"], .12), "face"))
    d.lines([(lerp(bw_[0], bw_[1], t), lerp(bw_[3], bw_[2], t)) for t in (.2, .4, .6, .8)], dk(C["plank"], .5), .3, .8)
    d.poly(bw_, d.grad("x", "fadedown"), NS)
    d.poly(bw_, d.grad("x", "fadedown"), NS)
    d.poly([P(sa, d0 + 1, 0), P(sb, d0 + 1, 0), P(sb, d0 + D - 1, 0), P(sa, d0 + D - 1, 0)], dk(C["sand"], .3), NS)
    rx, ry = P((sa + sb) / 2, d0 + 2, 0)
    ram(d, rx + .5, ry, .7 if s == 1 else .78 + .03 * s)
    lean_to(d, sa, sb, d0 + 1, d0 + D - 1, z1 + .5, z1 + 4.5, sroof)
    # main workshop hall
    if s in (3, 4):
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", "tile", rh, upper="plaster", upper_z=6, frame=True)
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, ["plank", "plank", "", "", "stone"][s - 1],
                      ["thatch", "shingle", "", "", "tile"][s - 1], rh, trim=s == 5,
                      gable_mat="plank" if s < 3 else None)
    door(d, a + W * .38, 6.5, 6.8, d0=d0, arch=False, col="#8a5a30")
    window(d, a + W * .8, 3.5 if s < 3 else 9, 1.8, 2.4, d0)
    if s >= 3:
        window(d, a + W * .2, 9, 1.8, 2.4, d0)
    if s >= 4:
        sx, sy = P(a + W * .8, d0, z1 - .2)
        banner(d, sx - 1.4, sy, 2.8, 5.5)
    if s == 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    elif s <= 2:
        pennant(d, r1[0], r1[1], 5, "red") if s == 2 else None
    # yard props
    logs(d, 9, 95.5, [3, 3, 5, 6, 6][s - 1], .8)
    if s >= 2:
        catapult(d, [64, 64, 65, 64, 64][s - 1], 96.5, [.6, .65, .7, .78, .82][s - 1])
    if s == 5:
        ram(d, 33, 97.5, .7, roofed=True)
    elif s >= 3:
        wheel(d, 30, 94.5, 2.0)
        wheel(d, 33.5, 95.2, 2.0)


def academy(s, d):
    P = d.P
    ground(d)
    a = [12, 11, 11, 8, 8][s - 1]
    W = [32, 34, 34, 32, 34][s - 1]
    b = a + W
    D = [12, 13, 14, 14, 15][s - 1]
    d0 = 5
    cast(d, (a + b) / 2 + 8, 89, W / 2 + 9, 6)
    wall = ["plaster", "plaster", "ashlar", "ashlar", "marble"][s - 1]
    z1 = [11, 12, 16, 17, 18][s - 1]
    domec = "gold" if s == 5 else "copper"
    # side tower / observatory (s4+), at back right
    if s >= 4:
        tx, td = b + 1, d0 + D - 2
        tz = 28 if s == 4 else 31
        round_tower(d, tx, td, 4.2, 0, tz, wall, top=None, slits=False)
        sx, sy = P(tx, td, tz)
        d.ell(sx, sy, 4.6, 1.9, d.grad(lt(C[wall], .1), "face"), ' stroke-width=".5"')
        dome(d, sx, sy - .2, 4.2, 5.5, domec, trim=s == 5)
        for zz in (tz * .45, tz * .75):
            x, y = P(tx, td, zz)
            d.path(f"M{f(x - 2.2)},{f(y)}v-2.4a.7,.7 0 0 1 1.4,0v2.4Z", "#2b2016", ' stroke-width=".4"')
    walls(d, a, b, d0, d0 + D, 0, z1, wall)
    # roof: low hip roof, dome on drum in the middle
    hip(d, a, b, d0, d0 + D, z1, [5, 5.5, 6, 6, 6.5][s - 1], "tile", o=1.0, trim=s == 5)
    cx, cy = P((a + b) / 2, d0 + D / 2, z1 + 1.5)
    dr = [5.6, 6.4, 7, 7.2, 7.6][s - 1]
    if True:
        drum_h = [2.2, 2.8, 4.2, 4.2, 4.4][s - 1]
        d.path(f"M{f(cx - dr)},{f(cy)}v-{f(drum_h)}a{f(dr)},{f(dr * .36)} 0 0 0 {f(2 * dr)},0v{f(drum_h)}"
               f"a{f(dr)},{f(dr * .36)} 0 0 1 -{f(2 * dr)},0Z", d.grad(C[wall], "cyl"))
        for k in (-2, -1, 0, 1, 2):
            xx = cx + dr * math.sin(k * .5)
            wh = drum_h * .5
            d.path(f"M{f(xx - .45)},{f(cy - drum_h * .22 + dr * .36 * math.cos(k * .5))}v-{f(wh)}a.45,.45 0 0 1 .9,0v{f(wh)}Z", "#2b2016",
                   ' stroke-width=".35"')
        cy -= drum_h
    dome(d, cx, cy, dr, dr * [1.0, 1.0, 1.05, 1.05, 1.1][s - 1], domec, trim=s == 5)
    # facade
    xm = (a + b) / 2
    if s <= 2:
        door(d, xm, 3.6, 5.6, d0=d0)
        for wx in (a + W * .2, a + W * .8):
            window(d, wx, 4, 2.0, 3.2, d0, shutters=s == 1, arch=True)
        # small wooden portico columns
        if s == 2:
            for x in (xm - 4.5, xm + 4.5):
                sx, sy = P(x, d0 - 2, 0)
                column(d, sx, sy, sy - 8, 1.4, "plaster")
            sx0, sy0 = P(xm - 6.5, d0 - 2, 8)
            d.path(f"M{f(sx0)},{f(sy0)}h13v1.4h-13Z", d.grad(C["plaster"], "face"), ' stroke-width=".5"')
            d.path(f"M{f(sx0 - .5)},{f(sy0)}L{f(sx0 + 6.5)},{f(sy0 - 3.6)}L{f(sx0 + 13.5)},{f(sy0)}Z",
                   d.grad(C["tile"], "roof"), ' stroke-width=".55"')
    else:
        # classical portico with pediment
        for wx in (a + W * .14, a + W * .86):
            window(d, wx, 3, 2.0, 3.2, d0, shutters=False, arch=True)
            window(d, wx, 10, 2.0, 3.2, d0, shutters=False, arch=True)
        pa, pb = xm - 9, xm + 9
        pd = d0 - 3.5
        pz = z1 - 2
        door(d, xm, 4, 6.5, d0=d0)
        # steps
        for k in range(3):
            d.poly([P(pa - 1 - k * .7, pd - k * .9, 1 - k * .5), P(pb + 1 + k * .7, pd - k * .9, 1 - k * .5),
                    P(pb + 1 + k * .7, pd - k * .9, .5 - k * .5), P(pa - 1 - k * .7, pd - k * .9, .5 - k * .5)],
                   d.grad(C["marble"], "face"), ' stroke-width=".45"')
        ncol = 4 if s < 5 else 6
        for i in range(ncol):
            x = pa + .8 + (pb - pa - 1.6) * i / (ncol - 1)
            sx, sy = P(x, pd, 1)
            _, syt = P(x, pd, pz)
            column(d, sx, sy, syt, 1.5, "marble")
        sx0, sy0 = P(pa - .6, pd, pz)
        sx1, _ = P(pb + .6, pd, pz)
        d.path(f"M{f(sx0)},{f(sy0)}H{f(sx1)}v-1.8H{f(sx0)}Z", d.grad(C["marble"], "face"), ' stroke-width=".5"')
        if s == 5:
            d.path(f"M{f(sx0)},{f(sy0 - .9)}H{f(sx1)}", extra=f' stroke="{C["gold"]}" stroke-width=".45" stroke-opacity="1"')
        G0 = d.G
        front_gable(d, pa - .6, pb + .6, pd, d0, pz + 1.8, 5.2, "tile", tri_mat="marble", trim=s == 5)
        d.G = G0
        sx, sy = P(xm, pd, pz + 3.6)
        d.circ(sx, sy - .4, 1.1, d.grad(C["gold"] if s == 5 else C["copper"], "sphere"), ' stroke-width=".4"')
    if s >= 4:
        for x in ([a + W * .3, a + W * .7]):
            sx, sy = P(x, d0, z1 - .3)
            banner(d, sx - 1.3, sy, 2.6, 5.2, "#3c5a86" if s == 4 else "red")
    if s == 5:
        statue(d, 6, 95, .9, gold=True)
        statue(d, 68, 92.5, .9, gold=True)
        pennant(d, *P(a, d0, z1 + 5.6), 6, "red")
    # props
    scroll_lectern(d, [64, 64, 66, 6, 6][s - 1], [93, 93, 92, 95.5, 90][s - 1], .9)
    if s >= 2:
        d.g(8 if s < 4 else 64, 93.5 if s < 4 else 95, .9)
        _book_stack(d)
        d.end()
    if s >= 3:
        torch(d, P(xm - 11, d0 - 4, 0)[0], 92.5, 5)
        torch(d, P(xm + 11, d0 - 4, 0)[0], 92.5, 5)


def _book_stack(d):
    for i, c in enumerate(["#7a2e22", "#2e4a6a", "#5a6a2a"]):
        y = -i * 1.1
        d.path(f"M-2,{f(y)}h4v-1.1h-4Z", d.grad(c, "face"), ' stroke-width=".4"')
        d.path(f"M1.6,{f(y - .2)}v-.7", extra=' stroke="#f2e6c4" stroke-width=".35" stroke-opacity="1"')
    d.path("M-1.6,-3.6l3,-.6", extra=' stroke="#e8d8ae" stroke-width="1"')


def blacksmith(s, d):
    P = d.P
    ground(d, yard=(25, 91, 14, 4))
    a = [12, 12, 11, 10, 10][s - 1]
    W = [29, 30, 31, 32, 33][s - 1]
    b = a + W
    D = [12, 13, 13, 14, 14][s - 1]
    d0 = 5
    cast(d, (a + b) / 2 + 9, 88.5, W / 2 + 10, 6)
    z1 = [9, 10, 14, 15, 16][s - 1]
    rh = [9, 9.5, 10, 10.5, 11][s - 1]
    # annex workshop wing at back right (s4+)
    if s >= 4:
        hall(d, b - 4, b + 7, d0 + 4, d0 + D + 2, 9, "stone" if s == 5 else "plank", "tile", 6)
    if s in (3, 4):
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", "tile", rh, upper="plaster", upper_z=6.5, frame=True)
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, ["plank", "wood", "", "", "ashlar"][s - 1],
                      ["thatch", "shingle", "", "", "tile"][s - 1], rh, trim=s == 5,
                      gable_mat="plank" if s < 3 else None)
    # chimneys rising from the ridge with smoke
    chims = [(.72,)] if s < 3 else [(.3,), (.72,)]
    for (t,) in chims:
        x = a + W * t
        cw = 3.2
        ztop = z1 + rh + [4, 5, 5, 6, 7][s - 1]
        walls(d, x, x + cw, d0 + D / 2 - 1.4, d0 + D / 2 + 1.4, z1 + rh * .3, ztop, "stone", eave=False, ao=False)
        top_face(d, x - .3, x + cw + .3, d0 + D / 2 - 1.7, d0 + D / 2 + 1.7, ztop, lt(C["stone"], .1))
        sx, sy = P(x + cw / 2, d0 + D / 2, ztop)
        d.ell(sx, sy, 1.2, .6, "#1a120c", ' stroke-width=".3"')
        smoke(d, sx + .5, sy - 2.5, .8 + s * .07, 3 + (s >= 3))
    # forge opening with glow
    fx = a + W * .62
    fw = [6, 7, 7.5, 8, 8.5][s - 1]
    fh = [5.5, 6, 6.2, 6.5, 6.8][s - 1]
    x0, y0 = P(fx - fw / 2, d0, 0)
    d.path(f"M{f(x0)},{f(y0)}V{f(y0 - fh + fw / 2)}A{f(fw / 2)},{f(fw / 2 * .8)} 0 0 1 {f(x0 + fw)},{f(y0 - fh + fw / 2)}V{f(y0)}Z",
           d.grad("x", "glow"), ' stroke-width=".7"')
    d.ell(x0 + fw / 2, y0 - 1.2, fw * .3, 1, "#fff0a8", ' stroke="none" opacity=".75"')
    d.ell(x0 + fw / 2, y0 - 2, fw * .9, fh * .8, "#ffb040", f' stroke="none" opacity=".25" filter="{d.blur(1.2)}"')
    door(d, a + W * .22, 3.6, 5.6, d0=d0, arch=False)
    if s >= 3:
        window(d, a + W * .22, 8.5, 1.8, 2.2, d0)
        window(d, a + W * .62, 8.5, 1.8, 2.2, d0)
    side_window(d, b, d0 + D / 2, 3, 2.6, 2.2)
    # lean-to canopy over the anvil on the left (s2+)
    if s >= 2:
        lean_to(d, a - 9, a, d0 - 1, d0 + 5, 6.5, 9, "shingle" if s < 5 else "tile")
    if s >= 4:
        sx, sy = P(a + W * .4, d0, z1 - .2)
        banner(d, sx - 1.3, sy, 2.6, 5)
    if s == 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    # props
    anvil(d, [26, 8, 8, 8, 8][s - 1], [93, 91.5, 91.5, 91.5, 91.5][s - 1], 1.0)
    barrel(d, [48, 52, 54, 55, 56][s - 1], 93.5, .9)
    if s >= 2:
        bucket(d, 14, 95)
    if s >= 3:
        grindstone(d, 62, 93, .9)
        # tool rack
        rack(d, 69, 89.5, 4, .8)
    if s >= 4:
        barrel(d, 59, 96, .85)
    if s >= 5:
        shield(d, 34, 95.5, 1.5, "red")
        kite(d, 38.5, 96, .9)


def armoury(s, d):
    P = d.P
    ground(d)
    a = [12, 11, 11, 9, 9][s - 1]
    W = [30, 31, 32, 33, 34][s - 1]
    b = a + W
    D = [12, 13, 13, 14, 14][s - 1]
    d0 = 5
    cast(d, (a + b) / 2 + 9, 88.5, W / 2 + 10, 6)
    z1 = [11, 12, 15, 16, 17][s - 1]
    rh = [9, 9.5, 10, 10.5, 11][s - 1]
    if s >= 4:
        square_tower(d, b - 4, b + 4, d0 + D - 3, d0 + D + 5, [31, 31, 31, 32, 36][s - 1],
                     "stone" if s == 4 else "ashlar", roof="slate", rh=8.5, trim=s == 5,
                     flag="red" if s == 4 else "gold")
    roof = ["thatch", "shingle", "slate", "slate", "slate"][s - 1]
    if s in (3, 4):
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, "stone", roof, rh, upper="plaster", upper_z=6.5, frame=True)
    else:
        r0, r1 = hall(d, a, b, d0, d0 + D, z1, ["plank", "wood", "", "", "ashlar"][s - 1], roof, rh,
                      trim=s == 5, gable_mat="plank" if s < 3 else None)
    xm = a + W * .5
    door(d, xm, 4.4, 6.4 if s < 3 else 6, d0=d0, col="#6a4426")
    for wx in (a + W * .15, a + W * .85):
        window(d, wx, 3.4 if s < 3 else 9, 1.8, 2.4, d0, shutters=True)
    side_window(d, b, d0 + D / 2, 3.5 if s < 3 else 9, 2.6, 2.4)
    # shields on the facade
    zz = [6.5, 7.2, 11.6, 12.4, 13][s - 1] if s >= 3 else 4.8
    cols = ["red", "#3c5a86", "#c8a040", "red", "#3c5a86"]
    n = [2, 4, 4, 4, 5][s - 1]
    xs = [a + W * (.3 + .4 * i / max(1, n - 1)) for i in range(n)] if n > 1 else [xm]
    for i, x in enumerate(xs):
        if abs(x - xm) < 2.6 and s < 3:
            continue
        sx, sy = P(x, d0, zz if s >= 3 else 7.6)
        if i % 2 and s >= 2:
            kite(d, sx, sy, .8, cols[i % len(cols)])
        else:
            shield(d, sx, sy, 1.45, cols[i % len(cols)])
    if s >= 3:
        for x in (a + W * .3, a + W * .7):
            window(d, x, 3, 1.6, 2.2, d0, shutters=False, arch=True)
    if s >= 4:
        sx, sy = P(xm, d0, z1 - .3)
        banner(d, sx - 1.4, sy, 2.8, 5)
    if s == 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    elif s >= 2:
        pennant(d, r1[0], r1[1], 6, "red")
    # props: armour stands, shield rack
    armour_stand(d, [55, 58, 60, 62, 62][s - 1], 93.5, .85)
    if s >= 2:
        armour_stand(d, 8 if s < 4 else 7, 93, .85)
    if s >= 3:
        rack(d, 68, 90, 4, .8, shields=True)
    if s >= 4:
        barrel(d, 48, 95.5, .8)
    if s == 5:
        armour_stand(d, 15, 96.5, .8)
        shield(d, 45, 96.6, 1.4, "#3c5a86")


def tournament(s, d):
    P = d.P
    cx, cy = 37, 82.5
    rx = [27, 27, 26, 25.5, 25.5][s - 1]
    ry = [9.5, 9.8, 10, 10, 10][s - 1]
    ground(d, rx=34, ry=11.5, cy=85.5)
    cast(d, cx + 4, cy + 3, rx + 5, ry + 3, .22)
    # stands (back half): stepped tiers, outer = higher
    tiers = [2, 3, 3, 4, 4][s - 1]
    span = [.4, .6, 1.0, 1.0, 1.0][s - 1]   # fraction of the back half used by stands
    smat = ["plank", "plank", "stone", "stone", "ashlar"][s - 1]
    th = 2.4
    sx_, sy_ = 2.0, 1.25          # radial seat depth (x / y)
    a0 = math.pi * (1.5 - span / 2)
    a1 = math.pi * (1.5 + span / 2)
    N = 28
    R0x, R0y = rx + .6, ry + .5
    angs = [a0 + (a1 - a0) * i / N for i in range(N + 1)]

    def ring(Rx, Ry, z):
        return [(cx + Rx * math.cos(a), cy + Ry * math.sin(a) - z) for a in angs]
    zt = tiers * th
    Ox, Oy = R0x + tiers * sx_, R0y + tiers * sy_
    # towers at the back corners (s4+), behind the stands
    if s >= 4:
        for sgn in (-1, 1):
            a = math.pi * 1.5 + sgn * .62
            tx = cx + (Ox - 1.2) * math.cos(a)
            ty = cy + (Oy - .6) * math.sin(a)
            G0 = d.G
            d.G = ty
            round_tower(d, tx, 0, 3.4, 0, 24 if s == 4 else 27, "stone" if s == 4 else "ashlar", top="cone",
                        rh=7, roof="tile", trim=s == 5, flag="red" if s == 4 else "gold", slits=True)
            d.G = G0
    # back parapet on the outermost tier
    if s >= 3:
        outer = ring(Ox, Oy, zt)
        d.poly(outer + list(reversed([(x, y - 1.6) for x, y in outer])), d.grad(C[smat], "face"), ' stroke-width=".5"')
    rr = d.rnd
    for k in reversed(range(tiers)):
        z = (k + 1) * th
        inner = ring(R0x + k * sx_, R0y + k * sy_, z)
        outer = ring(R0x + (k + 1) * sx_, R0y + (k + 1) * sy_, z)
        d.poly(outer + list(reversed(inner)), d.grad(lt(C[smat], .12), "roof"), ' stroke-width=".45"')
        riser = [(x, y + th) for x, y in inner]
        d.poly(inner + list(reversed(riser)), d.grad(dk(C[smat], .05), "face"), ' stroke-width=".5"')
        if smat == "plank":
            d.lines([(inner[i], riser[i]) for i in range(1, N, 2)], dk(C[smat], .45), .3, .7)
        else:
            d.lines([(inner[i], riser[i]) for i in range(1 + k % 2, N, 3)], dk(C[smat], .45), .3, .7)
        if s >= 2:
            # spectators sitting on the seat behind the riser
            step = 2 if s >= 4 else 3
            for i in range(1 + k % 2, N, step):
                if rr.random() < (.55 + .1 * s):
                    x, y = lerp(inner[i], outer[i], .45)
                    col = rr.choice(["#b8382a", "#3c5a86", "#d8b040", "#e8dcc8", "#5a7a3a", "#8a5a30"])
                    d.add(f'<path d="M{f(x - .7)},{f(y + .2)}v-1.2a.7,.7 0 0 1 1.4,0v1.2Z" fill="{col}" stroke-width=".3"/>')
                    d.circ(x, y - 1.6, .5, "#e8c8a0", ' stroke-width=".25"')
    # stand ends (stepped profile) for partial stands
    if span < 1:
        for a, sgn in ((a0, -1), (a1, 1)):
            prof = []
            for k in range(tiers):
                pi_ = (cx + (R0x + k * sx_) * math.cos(a), cy + (R0y + k * sy_) * math.sin(a))
                po_ = (cx + (R0x + (k + 1) * sx_) * math.cos(a), cy + (R0y + (k + 1) * sy_) * math.sin(a))
                prof += [(pi_[0], pi_[1] - (k + 1) * th), (po_[0], po_[1] - (k + 1) * th)]
            last = prof[-1]
            first = (cx + R0x * math.cos(a), cy + R0y * math.sin(a))
            poly = [first] + prof + [(last[0], last[1] + zt)]
            d.poly(poly, d.grad(C[smat], "side" if sgn > 0 else "face"), ' stroke-width=".5"')
    # royal box with canopy at back centre (s2+)
    bx, by = cx, cy - (R0y + tiers * sy_) - zt + .6
    if s >= 2:
        bw = [0, 8, 9, 10, 11][s - 1]
        post(d, bx - bw / 2, by + 2, by - 6, .8, "#8a6036")
        post(d, bx + bw / 2, by + 2, by - 6, .8, "#8a6036")
        stripe = []
        n = 6
        for i in range(n):
            x0 = bx - bw / 2 - 1 + (bw + 2) * i / n
            col = C["red"] if i % 2 == 0 else "#f0e4c8"
            d.path(f"M{f(x0)},{f(by - 6)}h{f((bw + 2) / n)}l{f(-.2)},{f(1.8)}q-{f((bw + 2) / n / 2 - .2)},.8 -{f((bw + 2) / n - .4)},0Z",
                   d.grad(col, "face"), ' stroke-width=".4"')
        d.path(f"M{f(bx - bw / 2 - 1)},{f(by - 6)}L{f(bx)},{f(by - 9.5)}L{f(bx + bw / 2 + 1)},{f(by - 6)}Z",
               d.grad(C["red"], "roof"), ' stroke-width=".5"')
        if s == 5:
            d.path(f"M{f(bx - bw / 2 - 1)},{f(by - 6)}L{f(bx)},{f(by - 9.5)}L{f(bx + bw / 2 + 1)},{f(by - 6)}",
                   extra=f' stroke="{C["gold"]}" stroke-width=".55" stroke-opacity="1"')
        pennant(d, bx, by - 9.5, 4, "gold")
    # field
    d.ell(cx, cy, rx, ry, d.grad(C["sand"], "pad"), ' stroke-width=".6"')
    # raked lines
    rl = []
    for k in range(1, 4):
        rl.append(((cx - rx * .7 + k * 2, cy - ry * .3 + k * 1.6), (cx + rx * .5 + k * 2, cy - ry * .45 + k * 1.6)))
    d.lines(rl, dk(C["sand"], .25), .3, .5)
    # tilt barrier (s2+)
    if s >= 2:
        tl = [(cx - rx * .62, cy + 1.5), (cx + rx * .62, cy - 1.5)]
        for t in (0, .25, .5, .75, 1):
            p = lerp(tl[0], tl[1], t)
            post(d, p[0], p[1], p[1] - 2.6, .6, "#8a6036")
        d.add(f'<path d="M{f(tl[0][0])},{f(tl[0][1] - 2.2)}L{f(tl[1][0])},{f(tl[1][1] - 2.2)}" stroke="{OL}" stroke-width="1.2"/>'
              f'<path d="M{f(tl[0][0])},{f(tl[0][1] - 2.2)}L{f(tl[1][0])},{f(tl[1][1] - 2.2)}" stroke="#f0e4c8" stroke-width=".6" stroke-opacity="1"/>')
        dash = []
        for i in range(0, 10, 2):
            p, q = lerp(tl[0], tl[1], i / 10), lerp(tl[0], tl[1], (i + 1) / 10)
            dash.append(((p[0], p[1] - 2.2), (q[0], q[1] - 2.2)))
        d.lines(dash, C["red"], .6, 1)
    else:
        dummy(d, cx + 4, cy + 1.5, .7)
    # front fence / low wall (front half of the ellipse)
    fpts = []
    N = 22
    for i in range(N + 1):
        a = math.pi * i / N
        fpts.append((cx + (rx + .3) * math.cos(a), cy + (ry + .3) * math.sin(a)))
    fh = [2.2, 2.4, 2.6, 2.8, 3.0][s - 1]
    fmat = ["plank", "plank", "stone", "stone", "ashlar"][s - 1]
    top = [(x, y - fh) for x, y in fpts]
    d.poly(fpts + list(reversed(top)), d.grad(C[fmat], "face"), ' stroke-width=".6"')
    if fmat == "plank":
        ll = [(fpts[i], top[i]) for i in range(1, N, 1)]
        d.lines(ll, dk(C[fmat], .45), .3, .8)
    else:
        ll = [(fpts[i], top[i]) for i in range(1, N, 2)]
        d.lines(ll, dk(C[fmat], .45), .3, .8)
        d.path(dpts([(x, y + fh / 2) for x, y in top], False), extra=f' stroke="{dk(C[fmat], .4)}" stroke-width=".3"')
    d.path(dpts(top, False), extra=f' stroke="{lt(C[fmat], .4)}" stroke-width=".5" stroke-opacity=".9"')
    if s == 5:
        d.path(dpts([(x, y - .2) for x, y in top], False), extra=f' stroke="{C["gold"]}" stroke-width=".5" stroke-opacity="1"')
    # shields hanging on the front fence (s3+)
    if s >= 3:
        for i in (5, 9, 13, 17):
            x, y = fpts[i]
            shield(d, x, y - fh / 2, 1.1, "red" if i % 4 == 1 else "#3c5a86")
    # pennant poles around the field
    poles = {1: [(cx - rx - .5, cy), (cx + rx + .5, cy)],
             2: [(cx - rx - .5, cy), (cx + rx + .5, cy), (cx - rx * .55, cy + ry * .85)],
             3: [(cx - rx - .5, cy), (cx + rx + .5, cy), (cx - rx * .55, cy + ry * .85), (cx + rx * .55, cy + ry * .85)],
             4: [(cx - rx - .5, cy + 1), (cx + rx + .5, cy + 1), (cx - rx * .55, cy + ry * .85), (cx + rx * .55, cy + ry * .85)],
             5: [(cx - rx - .5, cy + 1), (cx + rx + .5, cy + 1), (cx - rx * .55, cy + ry * .85), (cx + rx * .55, cy + ry * .85),
                 (cx, cy + ry + .3)]}[s]
    cols = ["red", "gold", "#3c5a86", "red", "gold"]
    for i, (x, y) in enumerate(poles):
        pennant(d, x, y, [8, 9, 10, 10, 11][s - 1], cols[i % 5], left=x < cx - 5)
    if s >= 4:
        # string of small pennants between the two front poles
        p, q = (cx - rx * .55, cy + ry * .85 - 9.5), (cx + rx * .55, cy + ry * .85 - 9.5)
        mid = ((p[0] + q[0]) / 2, p[1] + 3)
        d.path(f"M{f(p[0])},{f(p[1])}Q{f(mid[0])},{f(mid[1] + 3)} {f(q[0])},{f(q[1])}",
               extra=' stroke="#5a4a3a" stroke-width=".35"')
        for i in range(1, 9):
            t = i / 9
            x = (1 - t) ** 2 * p[0] + 2 * (1 - t) * t * mid[0] + t * t * q[0]
            y = (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * (mid[1] + 3) + t * t * q[1]
            col = [C["red"], C["gold"], "#3c5a86"][i % 3]
            d.path(f"M{f(x - .8)},{f(y - .1)}h1.6l-.8,1.8Z", col, ' stroke-width=".3"')


def horsetrough(s, d):
    P = d.P
    ground(d)
    a = [14, 13, 12, 11, 11][s - 1]
    W = [27, 29, 31, 31, 32][s - 1]
    b = a + W
    d0, D = 4, [9, 10, 11, 11, 12][s - 1]
    cast(d, (a + b) / 2 + 7, 88.5, W / 2 + 8, 5.5)
    tmat = ["plank", "plank", "stone", "stone", "marble"][s - 1]
    roof = ["thatch", "shingle", "tile", "tile", "tile"][s - 1]
    pz = [12, 13, 15, 16, 17][s - 1]
    pmat = "darkwood" if s < 3 else "stone"
    # fountain (s4+) back-left
    if s >= 4:
        fx, fy = 11 if s == 4 else 10, 82
        _fountain(d, fx, fy, 4.6 if s == 4 else 5.2, marble=s == 5)
    # back posts
    for x in (a + .6, b - .6):
        x0, y0 = P(x, d0 + D - .6, 0)
        _, y1 = P(x, d0 + D - .6, pz)
        if s >= 3:
            column(d, x0, y0, y1, 1.4, "stone" if s < 5 else "marble")
        else:
            post(d, x0, y0, y1, 1.0, C[pmat])
    # trough
    ta, tb = a + 3, b - 3
    td0, td1 = d0 + 2.5, d0 + D - 3
    tz = 3.4 if s < 3 else 3.8
    walls(d, ta, tb, td0, td1, 0, tz, tmat, eave=False)
    top_face(d, ta, tb, td0, td1, tz, lt(C[tmat], .1))
    wpts = [P(ta + .8, td0 + .7, tz - .3), P(tb - .8, td0 + .7, tz - .3), P(tb - .8, td1 - .7, tz - .3), P(ta + .8, td1 - .7, tz - .3)]
    d.poly(wpts, d.grad(C["water"], "roof"), ' stroke-width=".4"')
    hl = [(lerp(wpts[0], wpts[1], .2), lerp(wpts[0], wpts[1], .45)), (lerp(wpts[3], wpts[2], .5), lerp(wpts[3], wpts[2], .8))]
    d.lines([((p[0] + .6, p[1] - .5), (q[0] + .6, q[1] - .5)) for p, q in hl], "#eaf6fb", .45, .9)
    # spout / pump at the left end
    if s >= 3:
        px, py = P(ta - .8, (td0 + td1) / 2, 0)
        d.path(f"M{f(px - 1.2)},{f(py)}v-8h2.4v8Z", d.grad(C["stone"] if s < 5 else C["marble"], "cyl"), ' stroke-width=".5"')
        d.path(f"M{f(px + 1)},{f(py - 6.4)}h2.2v.9h-2.2Z", d.grad(C["iron"], "metal"), ' stroke-width=".4"')
        d.path(f"M{f(px + 3.1)},{f(py - 5.5)}q.3,1.6 .1,3", extra=f' stroke="{lt(C["water"], .3)}" stroke-width=".7" stroke-opacity="1"')
        d.ell(px, py - 8.3, 1.5, .6, d.grad(C["stone"], "face"), ' stroke-width=".4"')
        if s == 5:
            d.circ(px, py - 9, .8, d.grad(C["gold"], "sphere"), ' stroke-width=".35"')
    else:
        bucket(d, P(ta - 1.5, td0, 0)[0], P(ta - 1.5, td0, 0)[1], 1.0)
    # front posts
    for x in (a + .6, b - .6):
        x0, y0 = P(x, d0 + .6, 0)
        _, y1 = P(x, d0 + .6, pz)
        if s >= 3:
            column(d, x0, y0, y1, 1.4, "stone" if s < 5 else "marble")
        else:
            post(d, x0, y0, y1, 1.0, C[pmat])
    # roof canopy
    r0, r1 = gable(d, a, b, d0, d0 + D, pz, [7, 7.5, 8, 8.5, 9][s - 1], roof, o=1.6, gable_open=True,
                   trim=s == 5)
    if s >= 2:
        pennant(d, r1[0], r1[1] - (3 if s == 5 else 0), 6, "red" if s < 5 else "gold")
    if s == 5:
        pennant(d, r0[0], r0[1] - 3, 6, "red")
    # horses
    horse(d, P(tb, td0, 0)[0] + 8.6, 89.6, .8, "#8e5a30", drinking=True)
    if s >= 2:
        hay(d, 10, 95.5, 5, 2.4) if s < 4 else hay(d, 18, 96.5, 5, 2.4)
    if s >= 4:
        horse(d, 28, 97.5, .72, "#e6dccb", drinking=False)
    if s >= 3:
        barrel(d, 67, 90, .8)
    if s == 5:
        torch(d, 6, 93, 5)


def _fountain(d, x, y, r, marble=False):
    m = C["marble"] if marble else C["stone"]
    ry = r * .42
    h = 2.6
    d.path(f"M{f(x - r)},{f(y - h)}V{f(y)}A{f(r)},{f(ry)} 0 0 0 {f(x + r)},{f(y)}V{f(y - h)}Z", d.grad(m, "cyl"))
    d.ell(x, y - h, r, ry, d.grad(lt(m, .2), "face"), ' stroke-width=".5"')
    d.ell(x, y - h + .2, r - .9, ry - .5, d.grad(C["water"], "roof"), ' stroke-width=".4"')
    # pedestal + upper bowl
    d.path(f"M{f(x - .7)},{f(y - h)}v-4h1.4v4Z", d.grad(m, "cyl"), ' stroke-width=".45"')
    d.path(f"M{f(x - 2.2)},{f(y - h - 4)}q2.2,1.6 4.4,0Z", d.grad(m, "face"), ' stroke-width=".45"')
    d.ell(x, y - h - 4, 2.2, .6, d.grad(C["water"], "face"), ' stroke-width=".35"')
    jet = lt(C["water"], .45)
    d.path(f"M{f(x)},{f(y - h - 4)}v-3.4M{f(x)},{f(y - h - 7.2)}q-1.8,.2 -2.2,3.4M{f(x)},{f(y - h - 7.2)}q1.8,.2 2.2,3.4",
           extra=f' stroke="{jet}" stroke-width=".55" stroke-opacity="1"')
    if marble:
        d.circ(x, y - h - 7.6, .6, d.grad(C["gold"], "sphere"), ' stroke-width=".3"')
    d.path(f"M{f(x - 1.6)},{f(y - h - 4)}q-1.2,1.4 -1.4,3.4M{f(x + 1.6)},{f(y - h - 4)}q1.2,1.4 1.4,3.4",
           extra=f' stroke="{jet}" stroke-width=".4" stroke-opacity=".9"')


BUILDINGS = {
    "barracks": (barracks, "brk"),
    "greatbarracks": (greatbarracks, "gbk"),
    "stable": (stable, "stb"),
    "greatstable": (greatstable, "gst"),
    "workshop": (workshop, "wks"),
    "academy": (academy, "acd"),
    "blacksmith": (blacksmith, "bsm"),
    "armoury": (armoury, "arm"),
    "tournament": (tournament, "tsq"),
    "horsetrough": (horsetrough, "htr"),
}


def main():
    import sys
    only = set(sys.argv[1:])
    for bid, (fn, pfx) in BUILDINGS.items():
        if only and bid not in only:
            continue
        for s in range(1, 6):
            d = Doc(f"{pfx}{s}-", seed=f"{bid}{s}")
            fn(s, d)
            name = f"{bid}.svg" if s == 1 else f"{bid}-{s}.svg"
            (OUT_DIR / name).write_text(d.svg())
    print("ok")


if __name__ == "__main__":
    main()
