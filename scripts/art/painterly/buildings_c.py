#!/usr/bin/env python3
"""Painterly building art, set C (Ancient Realms, original art).

Buildings: residence, palace, treasury, townhall, heromansion, stonemason,
brewery, trapper, sawmill, brickyard - 5 growth stages each:
  <id>.svg (lv 1-4), <id>-2.svg (5-9), <id>-3.svg (10-14), <id>-4.svg (15-19), <id>-5.svg (20)

Style: warm top-left daylight, gradients on every material, soft blurred cast
shadow to the bottom-right, soft dark-brown outline.  viewBox 0 0 75 100, ground
patch centred (37, 87) like the previous art so the village layout still fits.

Projection (same oblique look as the old art): world x to the right, z into the
scene (recedes up-right), h up.  screen = (x + 0.62 z, 91 - h - 0.42 z).

Run:  python3 scripts/art/painterly/buildings_c.py
"""
import math
import pathlib
import sys

OUT_DIR = pathlib.Path(__file__).resolve().parents[3] / "src/web/public/img/buildings"
KX, KY, BY = 0.62, 0.42, 91.0
OL = "#3b2a17"


# ---------------------------------------------------------------- basics
def f(v):
    s = f"{v:.1f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def pts(ps):
    return " ".join(f"{f(x)},{f(y)}" for x, y in ps)


def P(x, z, h=0.0):
    return (x + KX * z, BY - h - KY * z)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def rnd(seed):
    """Tiny deterministic PRNG (so output is stable)."""
    state = [seed * 9301 + 49297]

    def r():
        state[0] = (state[0] * 9301 + 49297) % 233280
        return state[0] / 233280.0
    return r


class Face:
    """Parallelogram face: O + a*U + b*V, a,b in 0..1; W/H = world size."""

    def __init__(self, O, U, V, W, H):
        self.O, self.U, self.V, self.W, self.H = O, U, V, W, H

    def at(self, a, b):
        return (self.O[0] + a * self.U[0] + b * self.V[0], self.O[1] + a * self.U[1] + b * self.V[1])

    def w(self, u, v):
        return self.at(u / self.W, v / self.H)

    def quad(self, a0=0, b0=0, a1=1, b1=1):
        return [self.at(a0, b0), self.at(a1, b0), self.at(a1, b1), self.at(a0, b1)]

    def qw(self, u0, v0, u1, v1):
        return self.quad(u0 / self.W, v0 / self.H, u1 / self.W, v1 / self.H)

    @property
    def flat(self):
        return abs(self.U[1]) < 1e-6


# ---------------------------------------------------------------- palette
MATS = {
    # name: front (lit, shade), side (lit, shade), texture line colour
    "plaster": (("#fbf0d6", "#e4cfa6"), ("#cdb894", "#a38f72"), "#8a7350"),
    "marble": (("#fbf6ea", "#ddd3bf"), ("#c3bbb0", "#9a938c"), "#8d8474"),
    "stone": (("#e6dcc8", "#c2b498"), ("#a89f92", "#857d75"), "#5f5444"),
    "dstone": (("#c4b8a0", "#9d917a"), ("#8a8178", "#6b645e"), "#4d4336"),
    "wood": (("#c48a52", "#996331"), ("#8f5f36", "#6c4527"), "#5a3518"),
    "dwood": (("#a8713f", "#7c4f28"), ("#77502e", "#583820"), "#3f2512"),
    "log": (("#b07a45", "#86592f"), ("#7d5533", "#5e3f25"), "#4a2c14"),
    "brick": (("#d48a5c", "#ad5f3b"), ("#9c5a3c", "#7a432c"), "#6d3420"),
    "clay": (("#dc9c6c", "#b46c43"), ("#a7694a", "#7f4c34"), "#7a4026"),
    "roofred": (("#d9805a", "#ac5233"), ("#9e4f33", "#7a3a25"), "#6e2e19"),
    "roofblue": (("#7aa2d0", "#4a72a8"), ("#4b6896", "#344c74"), "#22385a"),
    "roofbrown": (("#a77649", "#7a5130"), ("#73502f", "#543822"), "#3c2512"),
    "slate": (("#97a0a6", "#6b747c"), ("#687078", "#4e555c"), "#363b40"),
    "thatch": (("#e2c47e", "#b58f4a"), ("#a98744", "#80652f"), "#6e5222"),
    "copper": (("#f0b27a", "#b8693a"), ("#a35d33", "#7a4224"), "#6a3418"),
    "gold": (("#fff2b0", "#d9a738"), ("#c99230", "#94661a"), "#7a5212"),
    "iron": (("#8b8d90", "#5c5f63"), ("#5a5c60", "#404246"), "#2a2c30"),
    "dirt": (("#d6c08f", "#b49c6c"), ("#a48e66", "#86734f"), "#7a6440"),
}
GOLD = "#e9c25a"


class Ctx:
    def __init__(self, pre):
        self.pre = pre
        self.defs = []
        self.ids = set()
        self.el = []

    def __call__(self, s):
        self.el.append(s)

    def id(self, k):
        return f"{self.pre}-{k}"

    def _stops(self, stops):
        out = []
        for st in stops:
            o, c = st[0], st[1]
            a = f' stop-opacity="{st[2]}"' if len(st) > 2 else ""
            out.append(f'<stop offset="{o}" stop-color="{c}"{a}/>')
        return "".join(out)

    def lg(self, k, stops, x1=0, y1=0, x2=0, y2=1):
        gid = self.id(k)
        if gid not in self.ids:
            self.ids.add(gid)
            self.defs.append(f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{self._stops(stops)}</linearGradient>')
        return f"url(#{gid})"

    def rg(self, k, stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None):
        gid = self.id(k)
        if gid not in self.ids:
            self.ids.add(gid)
            fxy = "" if fx is None else f' fx="{fx}" fy="{fy}"'
            self.defs.append(f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="{r}"{fxy}>{self._stops(stops)}</radialGradient>')
        return f"url(#{gid})"

    def blur(self, sd=1.6):
        k = f"bl{int(sd * 10)}"
        gid = self.id(k)
        if gid not in self.ids:
            self.ids.add(gid)
            self.defs.append(f'<filter id="{gid}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="{sd}"/></filter>')
        return f"url(#{gid})"

    # material gradients
    def mat(self, name, face="f"):
        fr, sd, _ = MATS[name]
        if face == "f":
            return self.lg(f"{name}f", [(0, fr[0]), (1, fr[1])], 0, 0, 0.55, 1)
        if face == "s":
            return self.lg(f"{name}s", [(0, sd[0]), (1, sd[1])], 0, 0, 1, 0.7)
        if face == "t":  # top / lit roof slope
            return self.lg(f"{name}t", [(0, fr[0]), (1, sd[0])], 0, 0, 1, 1)
        if face == "c":  # cylinder
            return self.lg(f"{name}c", [(0, fr[1]), (0.28, fr[0]), (0.7, sd[0]), (1, sd[1])], 0, 0, 1, 0)
        if face == "r":  # round radial (domes, kettles)
            return self.rg(f"{name}r", [(0, "#fffbe8"), (0.18, fr[0]), (0.6, fr[1]), (1, sd[1])], 0.35, 0.3, 0.75)
        raise ValueError(face)

    def tex(self, name):
        return MATS[name][2]

    # primitives
    def poly(self, ps, fill, extra=""):
        self(f'<polygon points="{pts(ps)}" fill="{fill}"{extra}/>')

    def path(self, d, fill="none", extra=""):
        self(f'<path d="{d}" fill="{fill}"{extra}/>')

    def lines(self, segs, color, w=0.3, op=0.4):
        if not segs:
            return
        d = "".join(f"M{f(a[0])},{f(a[1])}L{f(b[0])},{f(b[1])}" for a, b in segs)
        self(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" opacity="{op}"/>')

    def ell(self, cx, cy, rx, ry, fill, extra=""):
        self(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{extra}/>')

    def circ(self, cx, cy, r, fill, extra=""):
        self(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{extra}/>')

    def svg(self):
        body = "".join(self.el)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 100">'
                f'<defs>{"".join(self.defs)}</defs>'
                f'<g stroke="{OL}" stroke-opacity=".7" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>')


NS = ' stroke="none"'


# ---------------------------------------------------------------- textures
def tex_courses(c, face, rows, cols, color, op=0.35, hi=True):
    segs, light = [], []
    for k in range(1, rows):
        b = k / rows
        segs.append((face.at(0, b), face.at(1, b)))
        if hi:
            light.append((face.at(0.02, b - 0.35 / max(face.H, 1)), face.at(0.98, b - 0.35 / max(face.H, 1))))
    for k in range(rows):
        off = 0.5 if k % 2 else 0
        for j in range(cols + 1):
            a = (j + off) / cols
            if 0.02 < a < 0.98:
                segs.append((face.at(a, k / rows), face.at(a, (k + 1) / rows)))
    c.lines(segs, color, 0.3, op)
    if hi:
        c.lines(light, "#fff6dc", 0.3, 0.35)


def tex_planks(c, face, n, color, op=0.4, vertical=True):
    segs = []
    for j in range(1, n):
        t = j / n
        segs.append((face.at(t, 0), face.at(t, 1)) if vertical else (face.at(0, t), face.at(1, t)))
    c.lines(segs, color, 0.3, op)


def tex_tiles(c, face, rows, cols, color, op=0.45):
    """Roof tiles: rows parallel to U (eave), staggered ticks."""
    segs, light = [], []
    for k in range(1, rows):
        b = k / rows
        segs.append((face.at(0, b), face.at(1, b)))
        light.append((face.at(0, b + 0.3 / rows), face.at(1, b + 0.3 / rows)))
    for k in range(rows):
        off = 0.5 if k % 2 else 0
        for j in range(cols + 1):
            a = (j + off) / cols
            if 0.01 < a < 0.99:
                segs.append((face.at(a, k / rows), face.at(a, (k + 0.7) / rows)))
    c.lines(segs, color, 0.3, op)
    c.lines(light, "#fff0d0", 0.25, 0.25)


def tex_thatch(c, face, n, color, seed=1, op=0.45):
    r = rnd(seed)
    segs = []
    for j in range(n):
        a = (j + r() * 0.8) / n
        b0 = r() * 0.5
        segs.append((face.at(a, b0), face.at(a + (r() - 0.5) * 0.04, min(1, b0 + 0.35 + r() * 0.3))))
    c.lines(segs, color, 0.3, op)
    c.lines([(face.at(0, 0.02), face.at(1, 0.02))], "#5c4318", 0.6, 0.35)


def ao(c, face, frac=0.35, op=0.3):
    g = c.lg("ao", [(0, "#2a1c10", 0), (1, "#2a1c10", op)])
    c.poly(face.quad(0, frac, 1, 0), g, NS)


# ---------------------------------------------------------------- solids
def faces_of_box(x0, x1, z0, z1, h0, h1):
    front = Face(P(x0, z0, h0), (x1 - x0, 0), (0, -(h1 - h0)), x1 - x0, h1 - h0)
    side = Face(P(x1, z0, h0), sub(P(x1, z1, h0), P(x1, z0, h0)), (0, -(h1 - h0)), z1 - z0, h1 - h0)
    return front, side


def box(c, x0, x1, z0, z1, h0, h1, mat, tex=None, top=None, aof=0.35, texargs=None):
    front, side = faces_of_box(x0, x1, z0, z1, h0, h1)
    c.poly(side.quad(), c.mat(mat, "s"))
    c.poly(front.quad(), c.mat(mat, "f"))
    if top:
        c.poly([P(x0, z0, h1), P(x1, z0, h1), P(x1, z1, h1), P(x0, z1, h1)], c.mat(top, "t"))
    col = c.tex(mat)
    ta = texargs or {}
    if tex == "stone":
        r = ta.get("rows", max(2, round((h1 - h0) / 2.2)))
        tex_courses(c, front, r, ta.get("cols", max(2, round((x1 - x0) / 3.2))), col)
        tex_courses(c, side, r, max(2, round((z1 - z0) / 3.2)), col, 0.3, False)
    elif tex == "planks":
        tex_planks(c, front, max(2, round((x1 - x0) / 1.8)), col)
        tex_planks(c, side, max(2, round((z1 - z0) / 1.8)), col)
    elif tex == "logs":
        n = max(2, round((h1 - h0) / 1.5))
        tex_planks(c, front, n, col, 0.5, False)
        tex_planks(c, side, n, col, 0.5, False)
        hl = []
        for j in range(n):
            b = (j + 0.75) / n
            hl.append((front.at(0, b), front.at(1, b)))
        c.lines(hl, "#f2cf98", 0.3, 0.35)
    elif tex == "brick":
        r = max(2, round((h1 - h0) / 1.1))
        tex_courses(c, front, r, max(2, round((x1 - x0) / 1.8)), col, 0.4, False)
        tex_courses(c, side, r, max(2, round((z1 - z0) / 1.8)), col, 0.35, False)
    if aof:
        ao(c, front, aof)
        ao(c, side, aof, 0.25)
    return front, side


def gable_x(c, x0, x1, z0, z1, h, rise, mat, wall, o=1.2, rows=None, trim=None, wall_tex=None):
    """Ridge parallel to x (long eaves face the viewer); gable on the right."""
    zm = (z0 + z1) / 2
    eh = h - 0.6
    # back slope (mostly hidden)
    c.poly([P(x0 - o, zm, h + rise), P(x1 + o, zm, h + rise), P(x1 + o, z1 + o, eh), P(x0 - o, z1 + o, eh)], c.mat(mat, "s"))
    # gable triangle (wall)
    tri = [P(x1, z0, h), P(x1, z1, h), P(x1, zm, h + rise)]
    c.poly(tri, c.mat(wall, "s"))
    if wall_tex == "planks":
        segs = []
        n = 5
        for j in range(1, n):
            z = z0 + (z1 - z0) * j / n
            top = h + rise * (1 - abs(z - zm) / (zm - z0))
            segs.append((P(x1, z, h), P(x1, z, top)))
        c.lines(segs, c.tex(wall), 0.3, 0.4)
    c.poly([P(x1, zm, h + rise), P(x1, z1, h), P(x1, z0, h)], c.lg("gsh", [(0, "#2a1c10", 0.35), (1, "#2a1c10", 0)], 0, 0, 0, 1), NS)
    # front slope
    fs = Face(P(x0 - o, z0 - o, eh), (x1 - x0 + 2 * o, 0), sub(P(x0 - o, zm, h + rise), P(x0 - o, z0 - o, eh)),
              x1 - x0 + 2 * o, 1)
    c.poly(fs.quad(), c.mat(mat, "t"))
    rr = rows or max(3, round(rise / 1.6))
    if mat == "thatch":
        tex_thatch(c, fs, int((x1 - x0) * 1.3), c.tex(mat), seed=int(x0 * 7 + h))
    else:
        tex_tiles(c, fs, rr, max(3, round((x1 - x0) / 2.6)), c.tex(mat))
    # barge board on the right gable
    bb = [P(x1 + o, z0 - o, eh), P(x1 + o, zm, h + rise), P(x1 + o, z1 + o, eh)]
    c(f'<polyline points="{pts(bb)}" fill="none" stroke="{MATS[mat][1][1]}" stroke-width="1.3" stroke-opacity="1"/>')
    c(f'<polyline points="{pts(bb)}" fill="none" stroke-width=".5"/>')
    # eave shadow line on wall
    c.lines([(P(x0, z0, h - 0.3), P(x1, z0, h - 0.3))], "#2a1c10", 0.9, 0.25)
    if trim:
        c(f'<polyline points="{pts([fs.at(0, 0), fs.at(1, 0)])}" fill="none" stroke="{trim}" stroke-width=".7" stroke-opacity="1"/>')
        c(f'<polyline points="{pts([fs.at(0, 1), fs.at(1, 1), P(x1 + o, z0 - o, eh)])}" fill="none" stroke="{trim}" stroke-width=".6" stroke-opacity="1"/>')
    return fs


def gable_z(c, x0, x1, z0, z1, h, rise, mat, wall, o=1.0, trim=None, wall_tex=None, pediment=False):
    """Ridge along z: triangular gable faces the viewer; right slope visible."""
    xm = (x0 + x1) / 2
    eh = h - 0.5
    # left slope
    c.poly([P(x0 - o, z0 - o, eh), P(xm, z0 - o, h + rise), P(xm, z1 + o, h + rise), P(x0 - o, z1 + o, eh)], c.mat(mat, "t"))
    # right slope
    rs = Face(P(x1 + o, z0 - o, eh), sub(P(x1 + o, z1 + o, eh), P(x1 + o, z0 - o, eh)),
              sub(P(xm, z0 - o, h + rise), P(x1 + o, z0 - o, eh)), z1 - z0 + 2 * o, 1)
    c.poly(rs.quad(), c.mat(mat, "s"))
    if mat == "thatch":
        tex_thatch(c, rs, int((z1 - z0) * 1.5), c.tex(mat), seed=int(z1 * 5 + h))
    else:
        tex_tiles(c, rs, max(3, round(rise / 1.5)), max(3, round((z1 - z0) / 2.4)), c.tex(mat), 0.35)
    # front gable wall
    tri = [P(x0, z0, h), P(x1, z0, h), P(xm, z0, h + rise)]
    c.poly(tri, c.mat(wall, "f"))
    if wall_tex == "planks":
        segs = []
        for j in range(1, 7):
            x = x0 + (x1 - x0) * j / 7
            top = h + rise * (1 - abs(x - xm) / (xm - x0))
            segs.append((P(x, z0, h), P(x, z0, top)))
        c.lines(segs, c.tex(wall), 0.3, 0.4)
    if pediment:
        ins = 1.6
        c.poly([P(x0 + ins * 1.6, z0, h + 0.8), P(x1 - ins * 1.6, z0, h + 0.8), P(xm, z0, h + rise - ins)],
               c.lg("pedin", [(0, "#d9cdb6"), (1, "#bfb29a")]), ' stroke-width=".5"')
    # barge boards
    bb = [P(x0 - o, z0 - o, eh), P(xm, z0 - o, h + rise), P(x1 + o, z0 - o, eh)]
    c(f'<polyline points="{pts(bb)}" fill="none" stroke="{MATS[mat][0][1]}" stroke-width="1.3" stroke-opacity="1"/>')
    c(f'<polyline points="{pts(bb)}" fill="none" stroke-width=".5"/>')
    if trim:
        c(f'<polyline points="{pts(bb)}" fill="none" stroke="{trim}" stroke-width=".6" stroke-opacity="1"/>')
    return rs


def hip(c, x0, x1, z0, z1, h, rise, mat, o=1.0, inset=None, trim=None):
    zm = (z0 + z1) / 2
    ins = inset if inset is not None else (z1 - z0) / 2
    eh = h - 0.5
    A, B, C_, D = P(x0 - o, z0 - o, eh), P(x1 + o, z0 - o, eh), P(x1 + o, z1 + o, eh), P(x0 - o, z1 + o, eh)
    R1, R2 = P(x0 + ins, zm, h + rise), P(x1 - ins, zm, h + rise)
    c.poly([D, C_, R2, R1], c.mat(mat, "s"))          # back
    c.poly([A, D, R1], c.mat(mat, "t"))                # left
    rt = [B, C_, R2]
    c.poly(rt, c.mat(mat, "s"))                        # right
    fr = Face(A, sub(B, A), sub(R1, A), 1, 1)
    c.poly([A, B, R2, R1], c.mat(mat, "t"))            # front
    rows = max(3, round(rise / 1.6))
    segs, light = [], []
    for k in range(1, rows):
        t = k / rows
        a0, a1 = (lerp(A, R1, t), lerp(B, R2, t))
        segs.append((a0, a1))
        light.append(((a0[0], a0[1] + 0.35), (a1[0], a1[1] + 0.35)))
        segs.append((lerp(B, R2, t), lerp(C_, R2, t)))
    n = max(3, round((x1 - x0) / 2.6))
    for k in range(rows):
        for j in range(1, n):
            a = (j + (0.5 if k % 2 else 0)) / n
            p0 = lerp(lerp(A, B, a), lerp(R1, R2, a), k / rows)
            p1 = lerp(lerp(A, B, a), lerp(R1, R2, a), (k + 0.7) / rows)
            if k / rows < 0.98:
                segs.append((p0, p1))
    col = c.tex(mat)
    c.lines(segs, col, 0.3, 0.42)
    c.lines(light, "#fff0d0", 0.25, 0.25)
    c.lines([(R2, B)], "#fff0d0", 0.5, 0.35)
    if trim:
        c(f'<polyline points="{pts([A, B, C_])}" fill="none" stroke="{trim}" stroke-width=".7" stroke-opacity="1"/>')
        c(f'<polyline points="{pts([A, R1, R2, B])}" fill="none" stroke="{trim}" stroke-width=".5" stroke-opacity="1"/>')
    return fr


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def cyl(c, x, z, r, h0, h1, mat, tex=True, cap=None):
    cx, by = P(x, z, h0)
    ty = by - (h1 - h0)
    ry = r * 0.45
    c.path(f"M{f(cx - r)},{f(ty)}L{f(cx - r)},{f(by)}A{f(r)},{f(ry)} 0 0 0 {f(cx + r)},{f(by)}L{f(cx + r)},{f(ty)}Z", c.mat(mat, "c"))
    if tex:
        segs = []
        n = max(2, round((h1 - h0) / 2.4))
        d = ""
        for k in range(1, n):
            y = by - (h1 - h0) * k / n
            d += f"M{f(cx - r)},{f(y)}A{f(r)},{f(ry)} 0 0 0 {f(cx + r)},{f(y)}"
        c(f'<path d="{d}" fill="none" stroke="{c.tex(mat)}" stroke-width=".3" opacity=".35"/>')
    if cap:
        c.ell(cx, ty, r, ry, c.mat(cap, "t"))
    return cx, ty, by


def cone(c, cx, ty, r, rh, mat, o=0.9, trim=None, finial=True):
    R = r + o
    ry = R * 0.45
    c.path(f"M{f(cx - R)},{f(ty)}A{f(R)},{f(ry)} 0 0 0 {f(cx + R)},{f(ty)}L{f(cx)},{f(ty - rh)}Z", c.mat(mat, "c"))
    segs = []
    for j in range(1, 6):
        t = j / 6
        ang = math.pi * t
        px = cx - R * math.cos(ang)
        py = ty + ry * math.sin(ang)
        segs.append(((cx, ty - rh), (px, py)))
    c.lines(segs, c.tex(mat), 0.3, 0.35)
    if trim:
        c.path(f"M{f(cx - R)},{f(ty)}A{f(R)},{f(ry)} 0 0 0 {f(cx + R)},{f(ty)}", "none", f' stroke="{trim}" stroke-width=".7" stroke-opacity="1"')
    if finial:
        c.lines([((cx, ty - rh), (cx, ty - rh - 1.6))], OL, 0.5, 0.8)
        c.circ(cx, ty - rh - 1.7, 0.6, c.mat("gold", "r"), ' stroke-width=".3"')


def dome(c, cx, ty, r, rh, mat, finial=True, spire=1.8):
    ry = r * 0.42
    c.path(f"M{f(cx - r)},{f(ty)}A{f(r)},{f(rh)} 0 0 1 {f(cx + r)},{f(ty)}A{f(r)},{f(ry)} 0 0 1 {f(cx - r)},{f(ty)}Z", c.mat(mat, "r"))
    # ribs
    d = ""
    for t in (0.33, 0.66):
        x = cx - r + 2 * r * t
        d += f"M{f(x)},{f(ty + ry * 0.9 * math.sin(math.pi * t))}Q{f(cx + (x - cx) * 0.9)},{f(ty - rh * 0.8)} {f(cx)},{f(ty - rh)}"
    c(f'<path d="{d}" fill="none" stroke="{c.tex(mat)}" stroke-width=".3" opacity=".45"/>')
    c.path(f"M{f(cx - r * 0.55)},{f(ty - rh * 0.55)}Q{f(cx - r * 0.45)},{f(ty - rh * 0.9)} {f(cx - r * 0.05)},{f(ty - rh * 0.97)}", "none",
           ' stroke="#fffbe8" stroke-width=".6" stroke-opacity=".7"')
    if finial:
        c.lines([((cx, ty - rh), (cx, ty - rh - spire))], OL, 0.5, 0.8)
        c.circ(cx, ty - rh - spire - 0.2, 0.6, c.mat("gold", "r"), ' stroke-width=".3"')


def tower(c, x, z, r, h0, h1, mat="stone", roof="cone", rmat="roofblue", rh=None, trim=None, crenel=False, flag=None, wins=1):
    cx, ty, by = cyl(c, x, z, r, h0, h1, mat)
    # windows (slits)
    for k in range(wins):
        wy = ty + 3 + k * 5.5
        if wy + 2.6 < by - 1:
            c.path(f"M{f(cx - 0.9)},{f(wy + 2.6)}V{f(wy + 0.7)}A.9,.9 0 0 1 {f(cx + 0.9)},{f(wy + 0.7)}V{f(wy + 2.6)}Z",
                   c.lg("glass", [(0, "#4e5a66"), (1, "#22262c")]), ' stroke-width=".5"')
    c.path(f"M{f(cx - r)},{f(by)}A{f(r)},{f(r * 0.45)} 0 0 0 {f(cx + r)},{f(by)}V{f(by - 3)}A{f(r)},{f(r * 0.45)} 0 0 1 {f(cx - r)},{f(by - 3)}Z",
           c.lg("ao", [(0, "#2a1c10", 0), (1, "#2a1c10", 0.3)]), NS)
    top = ty
    if crenel:
        c.ell(cx, ty, r + 0.6, r * 0.45 + 0.3, c.mat(mat, "t"))
        for k in range(5):
            mx = cx - r + 0.2 + k * (2 * r - 0.4) / 4
            c(f'<rect x="{f(mx - 0.6)}" y="{f(ty - 1.6 + 0.4 * math.sin(math.pi * k / 4))}" width="1.2" height="1.8" fill="{c.mat(mat, "f")}" stroke-width=".4"/>')
        top = ty - 1.6
    if roof == "cone":
        cone(c, cx, ty, r, rh or r * 2.6, rmat, trim=trim)
        top = ty - (rh or r * 2.6)
    elif roof == "dome":
        dome(c, cx, ty, r + 0.5, rh or r * 1.2, rmat)
        top = ty - (rh or r * 1.2)
    if flag:
        flagpole(c, cx, top - 1.4, 7, flag)
    return cx, ty


# ---------------------------------------------------------------- details
def glass(c):
    return c.lg("glass", [(0, "#4e5a66"), (1, "#22262c")], 0, 0, 0.6, 1)


def window(c, face, u, v, w, h, arch=False, frame="#f3e7c8", sill=True, cross=True, shutters=None):
    q = face.qw(u, v, u + w, v + h)
    if arch and face.flat:
        x0, y0 = q[0]
        x1 = q[1][0]
        y1 = q[2][1]
        rr = (x1 - x0) / 2
        c.path(f"M{f(x0)},{f(y0)}V{f(y1 + rr)}A{f(rr)},{f(rr)} 0 0 1 {f(x1)},{f(y1 + rr)}V{f(y0)}Z", glass(c), ' stroke-width=".55"')
    else:
        c.poly(q, glass(c), ' stroke-width=".55"')
    if cross:
        mx = lerp(q[0], q[1], 0.5)
        mt = lerp(q[3], q[2], 0.5)
        my0 = lerp(q[0], q[3], 0.55)
        my1 = lerp(q[1], q[2], 0.55)
        c.lines([(mx, mt), (my0, my1)], frame, 0.35, 0.85)
    # glint
    g0 = lerp(lerp(q[0], q[3], 0.8), lerp(q[1], q[2], 0.8), 0.2)
    c.circ(g0[0], g0[1], 0.25, "#cfe3f0", ' stroke="none" opacity=".7"')
    if shutters:
        sw = w * 0.45
        for qq in (face.qw(u - sw, v, u, v + h), face.qw(u + w, v, u + w + sw, v + h)):
            c.poly(qq, c.mat(shutters, "f"), ' stroke-width=".4"')
    if sill:
        c.poly(face.qw(u - 0.4, v - 0.6, u + w + 0.4, v), c.lg("sill", [(0, "#f6efdc"), (1, "#c7b897")]), ' stroke-width=".4"')


def door(c, face, u, w, h, mat="dwood", arch=True, iron=True, v=0):
    q = face.qw(u, v, u + w, v + h)
    x0, y0 = q[0]
    x1 = q[1][0]
    y1 = q[2][1]
    fill = c.lg(f"door{mat}", [(0, MATS[mat][0][0]), (1, MATS[mat][1][1])], 0, 0, 1, 1)
    if arch and face.flat:
        rr = (x1 - x0) / 2
        c.path(f"M{f(x0 - 0.5)},{f(y0)}V{f(y1 + rr)}A{f(rr + 0.5)},{f(rr + 0.5)} 0 0 1 {f(x1 + 0.5)},{f(y1 + rr)}V{f(y0)}Z",
               c.lg("doorfr", [(0, "#efe4c8"), (1, "#b6a585")]), ' stroke-width=".5"')
        c.path(f"M{f(x0)},{f(y0)}V{f(y1 + rr)}A{f(rr)},{f(rr)} 0 0 1 {f(x1)},{f(y1 + rr)}V{f(y0)}Z", fill, ' stroke-width=".55"')
    else:
        c.poly(q, fill, ' stroke-width=".55"')
    n = max(2, round((x1 - x0) / 1.2))
    segs = [((x0 + (x1 - x0) * j / n, y0), (x0 + (x1 - x0) * j / n, y1 + (x1 - x0) / 2 * (0.4 if arch else 0))) for j in range(1, n)]
    c.lines(segs, "#3a2210", 0.3, 0.5)
    if iron:
        c.lines([((x0, y0 - (y0 - y1) * 0.3), (x1, y0 - (y0 - y1) * 0.3)), ((x0, y0 - (y0 - y1) * 0.68), (x1, y0 - (y0 - y1) * 0.68))], "#2c2a28", 0.45, 0.8)
        c.circ(x1 - (x1 - x0) * 0.28, y0 - (y0 - y1) * 0.45, 0.3, GOLD, ' stroke="none"')
    # step
    c.poly([(x0 - 1, y0 + 0.9), (x1 + 1, y0 + 0.9), (x1 + 1.2, y0), (x0 - 0.8, y0)], c.lg("step", [(0, "#ece3cf"), (1, "#b8ab90")]), ' stroke-width=".4"')


def flagpole(c, x, y, h, col="red", flip=False, big=1.0):
    top = y - h
    c.lines([((x, y), (x, top))], "#4a3520", 0.55, 1)
    s = -1 if flip else 1
    fw, fh = 5.2 * big * s, 3.2 * big
    d = (f"M{f(x)},{f(top + 0.3)}Q{f(x + fw * 0.5)},{f(top - 0.6)} {f(x + fw)},{f(top + 0.5)}"
         f"L{f(x + fw * 0.92)},{f(top + fh * 0.55)}L{f(x + fw)},{f(top + fh + 0.4)}"
         f"Q{f(x + fw * 0.5)},{f(top + fh - 0.4)} {f(x)},{f(top + fh)}Z")
    g = c.lg("flag" + col, FLAGC[col], 0, 0, 1, 1)
    c.path(d, g, ' stroke-width=".45"')
    c.path(f"M{f(x + fw * 0.2)},{f(top + 1)}Q{f(x + fw * 0.55)},{f(top + 0.2)} {f(x + fw * 0.8)},{f(top + 1.2)}", "none",
           ' stroke="#fff3d8" stroke-width=".4" stroke-opacity=".45"')
    c.circ(x, top - 0.4, 0.55, c.mat("gold", "r"), ' stroke-width=".3"')


FLAGC = {
    "red": [(0, "#dc6a4c"), (0.6, "#b53d27"), (1, "#7e2618")],
    "gold": [(0, "#ffe795"), (0.6, "#e0ac3a"), (1, "#a8741a")],
}


def banner(c, x, y, w, h, col="red", emblem=True):
    g = c.lg("ban" + col, FLAGC[col], 0, 0, 1, 1)
    c.path(f"M{f(x)},{f(y)}H{f(x + w)}V{f(y + h)}L{f(x + w / 2)},{f(y + h - w * 0.4)}L{f(x)},{f(y + h)}Z", g, ' stroke-width=".45"')
    c.lines([((x - 0.4, y), (x + w + 0.4, y))], "#5a3c1c", 0.6, 1)
    c.lines([((x + w * 0.3, y + 0.5), (x + w * 0.3, y + h - 0.8))], "#fff0d0", 0.35, 0.35)
    if emblem:
        cx, cy = x + w / 2, y + h * 0.42
        c.path(f"M{f(cx)},{f(cy - 1)}L{f(cx + 0.8)},{f(cy)}L{f(cx)},{f(cy + 1)}L{f(cx - 0.8)},{f(cy)}Z", GOLD, ' stroke="none"')


def chimney(c, x, z, h0, h1, mat="brick", smoke=False):
    box(c, x, x + 2, z, z + 2, h0, h1, mat, aof=0)
    c.poly([P(x - 0.3, z - 0.3, h1), P(x + 2.3, z - 0.3, h1), P(x + 2.3, z + 2.3, h1), P(x - 0.3, z + 2.3, h1)], c.mat("dstone", "t"), ' stroke-width=".5"')
    if smoke:
        sx, sy = P(x + 1, z + 1, h1)
        puff(c, sx, sy)


def puff(c, sx, sy, n=3):
    bl = c.blur(0.7)
    g = c.rg("smk", [(0, "#ffffff", 0.85), (1, "#d8d4cc", 0.0)])
    for k in range(n):
        c.circ(sx + 0.8 * k + 0.3, sy - 2 - 2.6 * k, 1.4 + 0.6 * k, g, f' stroke="none" filter="{bl}"')


def bush(c, x, y, r=2.2):
    g = c.rg("bush", [(0, "#b9d27a"), (0.55, "#7fa344"), (1, "#4f7428")], 0.35, 0.3, 0.75)
    c.circ(x - r * 0.6, y - r * 0.2, r * 0.75, g, ' stroke-width=".6"')
    c.circ(x + r * 0.6, y - r * 0.1, r * 0.7, g, ' stroke-width=".6"')
    c.circ(x, y - r * 0.6, r * 0.85, g, ' stroke-width=".6"')


def tufts(c, spots):
    d = ""
    for x, y in spots:
        d += f"M{f(x)},{f(y)}l.5,-1.3l.4,1.3l.6,-1.5l.5,1.5"
    c(f'<path d="{d}" fill="none" stroke="#6f9440" stroke-width=".4" stroke-opacity="1"/>')


def ground(c, rx=34, ry=10.5, dirt=None):
    g = c.rg("gr", [(0, "#dbe8b0", 0.95), (0.65, "#c3d892", 0.85), (1, "#b3cb80", 0)])
    c.ell(37, 87.2, rx, ry, g, NS)
    if dirt:
        dx, dy, drx, dry = dirt
        gd = c.rg("dirt", [(0, "#e3d1a3", 0.95), (0.7, "#d4be8c", 0.7), (1, "#cdb683", 0)])
        c.ell(dx, dy, drx, dry, gd, NS)


def shadow(c, cx, cy, rx, ry, op=0.32):
    c.ell(cx, cy, rx, ry, "#2b2410", f' stroke="none" opacity="{op}" filter="{c.blur(1.6)}"')


def contact(c, x0, x1, y):
    c.ell((x0 + x1) / 2, y, (x1 - x0) / 2 + 1.5, 1.4, "#2b2410", f' stroke="none" opacity=".3" filter="{c.blur(0.6)}"')


def trim_line(c, ps, w=0.7):
    c(f'<polyline points="{pts(ps)}" fill="none" stroke="{GOLD}" stroke-width="{w}" stroke-opacity="1"/>')


def glint(c, x, y, s=1.0):
    c.path(f"M{f(x)},{f(y - 1.4 * s)}L{f(x + 0.3 * s)},{f(y - 0.3 * s)}L{f(x + 1.4 * s)},{f(y)}L{f(x + 0.3 * s)},{f(y + 0.3 * s)}"
           f"L{f(x)},{f(y + 1.4 * s)}L{f(x - 0.3 * s)},{f(y + 0.3 * s)}L{f(x - 1.4 * s)},{f(y)}L{f(x - 0.3 * s)},{f(y - 0.3 * s)}Z",
           "#fffbe0", ' stroke="none" opacity=".95"')


def lantern(c, x, y, h=5):
    c.lines([((x, y), (x, y - h))], "#3a2c1e", 0.6, 1)
    c(f'<rect x="{f(x - 0.8)}" y="{f(y - h - 1.6)}" width="1.6" height="1.8" fill="{c.rg("lamp", [(0, "#fff6c0"), (1, "#e7a23a")])}" stroke-width=".4"/>')


def fence(c, x0, x1, y, n=None):
    n = n or max(2, int((x1 - x0) / 1.6))
    segs = [((x0, y - 1.3), (x1, y - 1.3)), ((x0, y - 0.5), (x1, y - 0.5))]
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        segs.append(((x, y), (x, y - 2)))
    c.lines(segs, "#6b4a2a", 0.5, 1)
    c.lines([((x0, y - 1.5), (x1, y - 1.5))], "#c9a274", 0.3, 0.8)


def barrel(c, x, y, r=1.6, h=3.2):
    g = c.mat("wood", "c")
    c.path(f"M{f(x - r)},{f(y - h)}Q{f(x - r - 0.35)},{f(y - h / 2)} {f(x - r)},{f(y)}A{f(r)},{f(r * 0.4)} 0 0 0 {f(x + r)},{f(y)}"
           f"Q{f(x + r + 0.35)},{f(y - h / 2)} {f(x + r)},{f(y - h)}Z", g, ' stroke-width=".55"')
    c.ell(x, y - h, r, r * 0.4, c.lg("btop", [(0, "#d9a46c"), (1, "#a5703f")]), ' stroke-width=".5"')
    d = f"M{f(x - r - 0.15)},{f(y - h * 0.25)}A{f(r)},{f(r * 0.4)} 0 0 0 {f(x + r + 0.15)},{f(y - h * 0.25)}M{f(x - r - 0.15)},{f(y - h * 0.75)}A{f(r)},{f(r * 0.4)} 0 0 0 {f(x + r + 0.15)},{f(y - h * 0.75)}"
    c(f'<path d="{d}" fill="none" stroke="#3d3a36" stroke-width=".45"/>')


def barrel_lying(c, x, y, r=1.5, l=3.2):
    """Barrel lying with its end facing the viewer-left."""
    c.path(f"M{f(x)},{f(y - 2 * r)}L{f(x + l)},{f(y - 2 * r - 0.2)}Q{f(x + l + r * 0.6)},{f(y - r)} {f(x + l)},{f(y + 0.2)}L{f(x)},{f(y)}Z",
           c.lg("blying", [(0, "#d39a62"), (0.5, "#a46b3a"), (1, "#6e4424")], 0, 0, 0, 1), ' stroke-width=".5"')
    c.ell(x, y - r, r * 0.55, r, c.rg("bend", [(0, "#e0b07c"), (1, "#a26c3a")]), ' stroke-width=".5"')
    c.lines([((x + l * 0.3, y - 2 * r), (x + l * 0.3, y)), ((x + l * 0.75, y - 2 * r - 0.1), (x + l * 0.75, y + 0.1))], "#3d3a36", 0.4, 0.9)


def logs(c, x, y, n_bottom=3, r=1.5, length=6, rows=None):
    """Pile of logs, ends facing the viewer, lengths receding up-right."""
    rows = rows or n_bottom
    end = c.rg("logend", [(0, "#f0d39c"), (0.55, "#d8ae6c"), (0.85, "#b07a42"), (1, "#7a4e26")])
    bark = c.lg("bark", [(0, "#9a6a3c"), (1, "#5e3c1e")], 0, 0, 0, 1)
    dx, dy = length * KX, -length * KY
    items = []
    for row in range(rows):
        cnt = n_bottom - row
        for k in range(cnt):
            cx = x + (k + row * 0.5) * 2 * r
            cy = y - row * 1.75 * r
            items.append((cx, cy))
    for cx, cy in items:  # bark (behind)
        c.poly([(cx, cy - r), (cx + dx, cy - r + dy), (cx + dx, cy + r + dy), (cx, cy + r)], bark, ' stroke-width=".5"')
    for cx, cy in items:
        c.circ(cx, cy, r, end, ' stroke-width=".5"')
        c.circ(cx, cy, r * 0.45, "none", ' stroke="#9a6a38" stroke-width=".25"')


def planks_stack(c, x, z, w=6, d=3, h=2.4, layers=4):
    """Stack of sawn boards: light wood, plank ends visible on the front."""
    fr, sd = box(c, x, x + w, z, z + d, 0, h, "wood", top="wood", aof=0)
    tex_planks(c, fr, layers, "#5a3518", 0.6, vertical=False)
    tex_planks(c, sd, layers, "#5a3518", 0.5, vertical=False)
    segs = []
    for k in range(layers):
        for j in range(1, 4):
            a = (j + (0.5 if k % 2 else 0)) / 4
            segs.append((fr.at(a, k / layers), fr.at(a, (k + 1) / layers)))
    c.lines(segs, "#5a3518", 0.3, 0.45)
    c.lines([(P(x, z, h - 0.15), P(x + w, z, h - 0.15))], "#f6dcae", 0.35, 0.8)


def sblock(c, x, z, s, h=None, mat="stone"):
    h = h or s * 0.8
    box(c, x, x + s, z, z + s, 0, h, mat, top=mat, aof=0.0)


def coins(c, x, y, r=2.0, n=3):
    g = c.mat("gold", "r")
    for k in range(n):
        c.ell(x, y - k * 0.7, r - k * 0.45, (r - k * 0.45) * 0.45, g, ' stroke-width=".45"')
    glint(c, x - r * 0.3, y - n * 0.7, 0.7)


def chest(c, x, z, w=4, gold=True):
    box(c, x, x + w, z, z + 2.4, 0, 2, "dwood", aof=0)
    fr, sd = faces_of_box(x, x + w, z, z + 2.4, 0, 2)
    c.lines([(fr.at(0.2, 0), fr.at(0.2, 1)), (fr.at(0.8, 0), fr.at(0.8, 1))], "#2c2a28", 0.45, 0.9)
    if gold:
        a, b = P(x, z + 0.4, 2), P(x + w, z + 0.4, 2)
        c.path(f"M{f(a[0])},{f(a[1])}Q{f((a[0] + b[0]) / 2)},{f(a[1] - 2.2)} {f(b[0])},{f(b[1])}Z", c.mat("gold", "r"), ' stroke-width=".4"')
        glint(c, (a[0] + b[0]) / 2 + 0.6, a[1] - 1.3, 0.8)


def statue(c, x, y, s=1.0, mat="stone", sword=True):
    """Hero on plinth; (x,y) = plinth front-bottom centre."""
    pw = 3.2 * s
    box(c, x - pw / 2, x + pw / 2, 0 + (BY - y) / KY * 0 - 0, 0, 0, 0, mat, aof=0) if False else None
    # plinth as screen-space box
    c.poly([(x - pw / 2, y), (x + pw / 2, y), (x + pw / 2, y - 2.6 * s), (x - pw / 2, y - 2.6 * s)], c.mat("stone", "f"), ' stroke-width=".5"')
    c.poly([(x + pw / 2, y), (x + pw / 2 + 1.2 * s, y - 0.8 * s), (x + pw / 2 + 1.2 * s, y - 3.4 * s), (x + pw / 2, y - 2.6 * s)], c.mat("stone", "s"), ' stroke-width=".5"')
    c.poly([(x - pw / 2, y - 2.6 * s), (x + pw / 2, y - 2.6 * s), (x + pw / 2 + 1.2 * s, y - 3.4 * s), (x - pw / 2 + 1.2 * s, y - 3.4 * s)], c.mat("stone", "t"), ' stroke-width=".4"')
    bx, by = x + 0.5 * s, y - 3 * s
    fill = c.lg("st" + mat, [(0, MATS[mat][0][0]), (0.5, MATS[mat][0][1]), (1, MATS[mat][1][1])], 0, 0, 1, 0.3)
    # legs + body + cloak
    d = (f"M{f(bx - 1.1 * s)},{f(by)}L{f(bx - 0.7 * s)},{f(by - 3 * s)}L{f(bx - 1.4 * s)},{f(by - 5.6 * s)}"
         f"Q{f(bx)},{f(by - 6.6 * s)} {f(bx + 1.3 * s)},{f(by - 5.6 * s)}L{f(bx + 0.8 * s)},{f(by - 3 * s)}L{f(bx + 1.1 * s)},{f(by)}"
         f"L{f(bx + 0.3 * s)},{f(by)}L{f(bx)},{f(by - 2.2 * s)}L{f(bx - 0.3 * s)},{f(by)}Z")
    c.path(d, fill, ' stroke-width=".5"')
    c.circ(bx, by - 7 * s, 0.95 * s, fill, ' stroke-width=".5"')
    if sword:
        c.lines([((bx + 1.2 * s, by - 5.3 * s), (bx + 2.4 * s, by - 9.6 * s))], "#3b2a17", 0.9 * s, 0.8)
        c.lines([((bx + 1.2 * s, by - 5.3 * s), (bx + 2.4 * s, by - 9.6 * s))], "#f4f0e6" if mat != "gold" else "#fff6c8", 0.45 * s, 1)
    # shield on left arm
    c.ell(bx - 1.5 * s, by - 4.3 * s, 1.0 * s, 1.3 * s, c.lg("shld", [(0, "#d76b4c"), (1, "#8a2c1d")]), ' stroke-width=".45"')


# ---------------------------------------------------------------- buildings
def bshadow(c, x0, x1, z1, op=0.32):
    cx = (x0 + x1) / 2 + 5 + KX * z1 * 0.5
    c.ell(cx, BY - 1.2 - KY * z1 * 0.3, (x1 - x0) / 2 + 5, 3.6 + KY * z1 * 0.35, "#2b2410",
          f' stroke="none" opacity="{op}" filter="{c.blur(1.7)}"')


def slope_h(z, z0, zm, H, rise, o=1.2):
    return H - 0.6 + (rise + 0.6) * (z - (z0 - o)) / (zm - (z0 - o))


def dormer(c, xl, xr, zd, z0, zm, H, rise, wall="plaster", roof="roofred", o=1.2, trim=None):
    k = (rise + 0.6) / (zm - z0 + o)
    hb = slope_h(zd, z0, zm, H, rise, o)
    ht = hb + 3.4
    zr = zd + 3.4 / k
    c.poly([P(xr, zd, hb), P(xr, zd, ht), P(xr, zr, ht)], c.mat(wall, "s"))
    fr = Face(P(xl, zd, hb), (xr - xl, 0), (0, -(ht - hb)), xr - xl, ht - hb)
    c.poly(fr.quad(), c.mat(wall, "f"))
    window(c, fr, 0.9, 0.6, xr - xl - 1.8, 2.3, sill=False)
    gable_z(c, xl, xr, zd, zr, ht, 2.2, roof, wall, o=0.5, trim=trim)


def portico(c, x0, x1, z, h, cols=2, mat="marble", roof="roofred", trim=None):
    """Small columned porch in front of a door at depth z (front of wall)."""
    zf = z - 3
    n = cols
    for k in range(n):
        x = x0 + 0.6 + (x1 - x0 - 1.2) * k / (n - 1)
        cyl(c, x, zf + 0.6, 0.55, 0.8, h, mat, tex=False)
    box(c, x0 - 0.4, x1 + 0.4, zf, z, h, h + 1.1, mat, aof=0)
    gable_z(c, x0 - 0.4, x1 + 0.4, zf, z, h + 1.1, 2.6, roof, mat, o=0.4, trim=trim, pediment=False)


# ------------------------------------------------------------- residence
def b_residence(c, s):
    ground(c, dirt=(30, 93, 8, 2.4))
    x0, x1 = {1: (18, 44), 2: (17, 45), 3: (16, 46), 4: (17, 46), 5: (16, 47)}[s]
    z0, z1 = 0, (13 if s == 1 else 15)
    H = {1: 14.5, 2: 21, 3: 23, 4: 23.5, 5: 24.5}[s]
    rise = {1: 9, 2: 10.5, 3: 11, 4: 11.5, 5: 12}[s]
    bshadow(c, x0 - (9 if s >= 4 else 0), x1, z1)
    trim = GOLD if s == 5 else None
    if s >= 4:  # left wing (behind-left)
        wx0 = 7.5
        box(c, wx0, x0, 3, 12, 0, 12, "plaster")
        hip(c, wx0, x0, 3, 12, 12, 6, "roofred", trim=trim)
        fw, _ = faces_of_box(wx0, x0, 3, 12, 0, 12)
        window(c, fw, 2.2, 6.5, 2.2, 3, arch=True)
        window(c, fw, 2.2, 1.4, 2.2, 3, arch=True)
    if s == 1:
        box(c, x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, 0, 1.4, "stone", tex="stone", top="stone", texargs={"rows": 1})
        hb = 1.4
    else:
        box(c, x0 - 0.7, x1 + 0.7, z0 - 0.7, z1 + 0.7, 0, 1.8, "dstone", tex="stone", top="stone", texargs={"rows": 1})
        hb = 1.8
    if s >= 3:
        split = 10.5
        fr, sd = box(c, x0, x1, z0, z1, hb, split, "stone", tex="stone")
        fu, su = box(c, x0, x1, z0, z1, split, H, "plaster", aof=0.15)
        c.lines([(P(x0, z0, split), P(x1, z0, split)), (P(x1, z0, split), P(x1, z1, split))], "#8a7350", 0.9, 0.6)
    else:
        fr, sd = box(c, x0, x1, z0, z1, hb, H, "plaster")
        fu, su = fr, sd
    # chimneys (behind ridge), roof, dormers
    zm = (z0 + z1) / 2
    chimney(c, x0 + 3, zm + 1.5, H, H + rise + 2.5, "brick", smoke=(s >= 3))
    if s >= 2:
        chimney(c, x1 - 5, zm + 1.5, H, H + rise + 2.5, "brick")
    gable_x(c, x0, x1, z0, z1, H, rise, "roofred", "plaster", trim=trim)
    if s >= 2:
        nd = 1 if s == 2 else 2
        xs = [(x0 + x1) / 2 - 2] if nd == 1 else ([x0 + 6, x1 - 10] if s == 3 else [x0 + 2.5, x1 - 6.5])
        for xd in xs:
            dormer(c, xd, xd + 4, z0 + 1.5, z0, zm, H, rise, trim=trim)
    W = x1 - x0
    # windows
    if s <= 2:
        n = 2 if s == 1 else 3
        rows = [(2.6, False)] if s == 1 else [(2.8, False), (11.6, False)]
        for vy, ar in rows:
            for k in range(n):
                u = 2.4 + k * (W - 7.6) / max(1, n - 1) if n > 1 else 2.4
                if s == 1:
                    u = [2.6, W - 5.4][k]
                if abs(u + 1.3 - W / 2) < 3.2 and vy < 5:
                    continue
                window(c, fr, u, vy, 2.6, 3.8, shutters="dwood" if s == 2 else None)
        window(c, sd, 3.2, 2.8 if s > 1 else 2.6, 2.6, 3.6)
        if s == 2:
            window(c, sd, 3.2, 11.6, 2.6, 3.6)
            window(c, fr, W / 2 - 1.3, 11.6, 2.6, 3.8, shutters="dwood")
        door(c, fr, W / 2 - 1.7, 3.4, 6)
    else:
        for k in range(4):
            u = 2.2 + k * (W - 7) / 3
            if 1 <= k <= 2:
                continue
            window(c, fr, u, 2, 2.6, 4.8, arch=True)
        for k in range(4):
            u = 2.2 + k * (W - 7) / 3
            window(c, fu, u, 3.2, 2.6, 4.6, shutters="dwood")
        window(c, sd, 3.4, 2, 2.6, 4.6)
        window(c, su, 3.4, 3.2, 2.6, 4.4)
        door(c, fr, W / 2 - 1.9, 3.8, 6.2)
    if s >= 4:  # projecting central bay with its own gable
        xa, xb = (x0 + x1) / 2 - 5, (x0 + x1) / 2 + 5
        rf, rsd = box(c, xa, xb, -1.6, 0, hb, 10.5, "stone", tex="stone")
        ru, rsu = box(c, xa, xb, -1.6, 0, 10.5, H, "plaster", aof=0.1)
        c.lines([(P(xa, -1.6, 10.5), P(xb, -1.6, 10.5))], "#8a7350", 0.9, 0.6)
        gable_z(c, xa, xb, -1.6, 3, H, 6, "roofred", "plaster", o=0.8, trim=trim)
        door(c, rf, 3.1, 3.8, 6.2)
        window(c, ru, 3.6, 3.2, 2.8, 5, arch=True)
        c.circ(*P((xa + xb) / 2, -1.6, H + 2.6), 1.1, glass(c), ' stroke-width=".5"')
        banner(c, ru.w(0.6, 0)[0], ru.w(0, 9.4)[1], 2.2, 5.6)
        banner(c, ru.w(7.2, 0)[0], ru.w(0, 9.4)[1], 2.2, 5.6)
    if s == 5:
        trim_line(c, [P(x0, z0, 10.5), P(x1, z0, 10.5), P(x1, z1, 10.5)], 0.6)
    if s == 5:  # corner tower at the front-right
        tower(c, x1 + 2.4, 0.6, 3.3, 0, H + 3.5, "plaster", "cone", "roofred", rh=8, trim=trim, flag="red", wins=4)
    if s == 5:
        flagpole(c, P(x0 + 2, zm, H + rise)[0], P(x0 + 2, zm, H + rise)[1] + 0.5, 7, "gold", flip=True)
        lantern(c, P(x0, -3)[0] + 4, P(x0, -3)[1])
        lantern(c, P(x1, -3)[0] - 6, P(x1, -3)[1])
    # garden
    if s >= 3:
        fence(c, 5, 15, 90.5)
    bush(c, x0 - 3.5 if s < 4 else 6, 92 if s < 4 else 91, 2.2)
    bush(c, x1 + 9, 87.5, 2.4)
    if s >= 2:
        bush(c, x1 + 5, 94, 1.8)
    tufts(c, [(12, 95), (50, 95.5), (64, 90.5), (8, 86)])


# ------------------------------------------------------------- palace
def b_palace(c, s):
    ground(c, dirt=(33, 94, 9, 2.4))
    trim = GOLD if s == 5 else None
    domem = "gold" if s == 5 else "roofblue"
    pl = 0 if s <= 2 else 2.6
    x0, x1 = {1: (22, 45), 2: (21, 46), 3: (20, 47), 4: (20, 47), 5: (19, 48)}[s]
    z0, z1 = (3, 16) if s <= 2 else (3, 17)
    H = {1: 15.5, 2: 20.5, 3: 23.5, 4: 24, 5: 25.5}[s]
    rise = {1: 8.5, 2: 9.5, 3: 10, 4: 10.5, 5: 11}[s]
    tr = {1: 3.3, 2: 3.7, 3: 3.9, 4: 4.1, 5: 4.3}[s]
    th = {1: 21.5, 2: 27.5, 3: 31, 4: 32, 5: 34.5}[s]
    bshadow(c, x0 - 4, x1 + 4, z1 + 2)
    if s >= 4:  # rear towers
        for x in (x0 + 1, x1 - 1):
            tower(c, x, z1 + 0.5, 3.3, 0, th - 2, "marble", "dome" if s == 5 else "cone", domem if s == 5 else "roofblue",
                  rh=(4.2 if s == 5 else 8), trim=trim, flag=("red" if s == 5 else None), wins=2)
    if s >= 3:  # central keep behind the roof ridge
        kz = (z0 + z1) / 2 + 1.5
        cx, ty = tower(c, (x0 + x1) / 2, kz, 5.2 if s >= 4 else 4.6, 0, pl + H + rise + (9 if s >= 4 else 6), "marble",
                       "dome", domem, rh=(7.5 if s == 5 else 6), wins=0)
        if s >= 4:
            for k in range(3):
                xx = cx - 3 + k * 3
                c.path(f"M{f(xx - 0.7)},{f(ty + 5.2)}V{f(ty + 3.2)}A.7,.7 0 0 1 {f(xx + 0.7)},{f(ty + 3.2)}V{f(ty + 5.2)}Z", glass(c), ' stroke-width=".45"')
        if s == 5:
            flagpole(c, cx, ty - 7.5 - 2.6, 6, "red", big=1.15)
    if pl:
        box(c, x0 - 4.5, x1 + 4, -1.5, z1 + 0.5, 0, pl, "stone", tex="stone", top="stone", texargs={"rows": 2})
    fr, sd = box(c, x0, x1, z0, z1, pl, pl + H, "marble")
    tex_courses(c, fr, max(3, round(H / 3)), 6, "#8d8474", 0.18, False)
    hip(c, x0, x1, z0, z1, pl + H, rise, "roofblue", inset=4, trim=trim)
    W = x1 - x0
    # windows: arched, two/three rows
    rows = {1: [2.4, 9.4], 2: [2.6, 11], 3: [2.6, 10.2, 16.8], 4: [2.6, 10.2, 17], 5: [2.6, 10.4, 17.8]}[s]
    for ri, vy in enumerate(rows):
        n = 4 if W < 25 else 5
        for k in range(n):
            u = 2.3 + k * (W - 6.6) / (n - 1)
            if ri == 0 and abs(u + 1 - W / 2) < 3:
                continue
            window(c, fr, u, vy, 2.2, 4.0, arch=True, cross=False)
        window(c, sd, 3.5, vy, 2.2, 3.8, cross=False)
        window(c, sd, 8.5, vy, 2.2, 3.8, cross=False)
    door(c, fr, W / 2 - 2.1, 4.2, 7 if s > 1 else 6.2)
    if s >= 2:  # balcony over the door
        by = fr.w(0, 8.4)[1]
        bx = fr.w(W / 2, 0)[0]
        c.poly([(bx - 4, by), (bx + 4, by), (bx + 4.6, by - 0.6), (bx - 3.4, by - 0.6)], c.mat("marble", "t"), ' stroke-width=".5"')
        c(f'<rect x="{f(bx - 4)}" y="{f(by)}" width="8" height="1" fill="{c.mat("marble", "f")}" stroke-width=".5"/>')
        c.lines([((bx - 4 + k, by - 2.2), (bx - 4 + k, by)) for k in range(0, 9)], OL, 0.35, 0.6)
        c.lines([((bx - 4, by - 2.2), (bx + 4, by - 2.2))], OL, 0.5, 0.7)
    if s >= 4:
        for u in (W * 0.22, W * 0.78):
            p = fr.w(u, rows[1] + 4.6)
            banner(c, p[0] - 1.4, p[1], 2.8, 5.4)
    if s == 5:
        trim_line(c, [P(x0, z0, pl + H - 0.8), P(x1, z0, pl + H - 0.8), P(x1, z1, pl + H - 0.8)], 0.6)
    if pl:  # steps
        cx = fr.w(W / 2, 0)[0]
        for k in range(3):
            y = BY - pl + 0.9 * k + 0.4 + 2.6 * KY * 0
            yy = P(0, -0.3 - 1.0 * k, pl - 0.9 * k)[1]
            c(f'<rect x="{f(cx - 3.6 - k)}" y="{f(yy)}" width="{f(7.2 + 2 * k)}" height="1" fill="{c.mat("stone", "f")}" stroke-width=".45"/>')
    # front towers
    for x, fl in ((x0 - 1.5, True), (x1 + 1.5, False)):
        tower(c, x, 1.2, tr, 0, th, "marble", "dome" if s == 5 else "cone", domem if s == 5 else "roofblue",
              rh=(tr * 1.4 if s == 5 else tr * 2.6), trim=trim, flag=("red" if s >= 2 else None), wins=3 if s >= 3 else 2)
    if s == 5:
        lantern(c, 13, 94)
        lantern(c, 60, 92)
    if s >= 3:
        bush(c, 9, 89, 2)
        bush(c, 66, 88, 2.2)
    else:
        bush(c, 12, 91, 2)
        bush(c, 62, 90, 2.2)
    tufts(c, [(10, 95), (52, 96), (66, 92.5), (6, 86)])


def crenel_top(c, x0, x1, z0, z1, h, mat="stone", m=1.3, mh=1.6, gap=2.6):
    c.poly([P(x0, z0, h), P(x1, z0, h), P(x1, z1, h), P(x0, z1, h)], c.lg("roofin", [(0, "#a39886"), (1, "#c9bea8")], 0, 0, 1, 1))
    nx = max(2, int((x1 - x0) / gap))
    nz = max(2, int((z1 - z0) / gap))
    xs = [x0 + (x1 - x0 - m) * k / nx for k in range(nx + 1)]
    zs = [z0 + (z1 - z0 - m) * k / nz for k in range(nz + 1)]
    c('<g stroke-width=".5">')
    for x in xs:  # back row
        box(c, x, x + m, z1 - m, z1, h, h + mh, mat, top=mat, aof=0)
    for z in reversed(zs[1:-1]):  # left column
        box(c, x0, x0 + m, z, z + m, h, h + mh, mat, top=mat, aof=0)
    for z in reversed(zs[1:-1]):  # right column
        box(c, x1 - m, x1, z, z + m, h, h + mh, mat, top=mat, aof=0)
    for x in xs:  # front row
        box(c, x, x + m, z0, z0 + m, h, h + mh, mat, top=mat, aof=0)
    c('</g>')


def vault_door(c, face, u, w, h, gold=False):
    q = face.qw(u - 0.9, 0, u + w + 0.9, h + 0.9)
    x0, y0 = q[0]
    x1 = q[1][0]
    y1 = q[2][1]
    rr = (x1 - x0) / 2
    c.path(f"M{f(x0)},{f(y0)}V{f(y1 + rr)}A{f(rr)},{f(rr)} 0 0 1 {f(x1)},{f(y1 + rr)}V{f(y0)}Z", c.mat("dstone", "f"), ' stroke-width=".6"')
    # voussoir lines
    segs = []
    for k in range(1, 6):
        a = math.pi * k / 6
        cx, cy = (x0 + x1) / 2, y1 + rr
        segs.append(((cx - math.cos(a) * (rr - 0.9), cy - math.sin(a) * (rr - 0.9)), (cx - math.cos(a) * rr, cy - math.sin(a) * rr)))
    c.lines(segs, "#4d4336", 0.3, 0.6)
    door(c, face, u, w, h, mat="dwood", arch=True, iron=True)
    q = face.qw(u, 0, u + w, h)
    dx0, dy0 = q[0]
    dx1 = q[1][0]
    mx = (dx0 + dx1) / 2
    c.lines([((mx, dy0), (mx, q[2][1] + (dx1 - dx0) / 2 * 0.2))], "#2c2a28", 0.5, 0.9)
    studs = []
    for k in range(3):
        for j in range(2):
            studs.append((dx0 + (dx1 - dx0) * (0.22 + 0.56 * j), dy0 - (dy0 - q[2][1]) * (0.2 + 0.25 * k)))
    for x, y in studs:
        c.circ(x, y, 0.28, "#d8cfb8", ' stroke="none"')
    ring = GOLD if gold else "#b9a77a"
    for x in (mx - 0.7, mx + 0.7):
        c.circ(x, dy0 - (dy0 - q[2][1]) * 0.5, 0.45, "none", f' stroke="{ring}" stroke-width=".35" stroke-opacity="1"')


# ------------------------------------------------------------- treasury
def b_treasury(c, s):
    ground(c, dirt=(32, 93.5, 8, 2.4))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (20, 44), 2: (19, 45), 3: (19, 45), 4: (20, 46), 5: (19, 46)}[s]
    z0, z1 = (2, 14) if s <= 2 else (2, 15)
    H = {1: 15.5, 2: 18, 3: 19, 4: 19.5, 5: 20.5}[s]
    pl = 0 if s <= 2 else 2
    bshadow(c, x0 - (8 if s >= 4 else 0), x1 + 2, z1 + 2)
    if s >= 3:  # tall vault tower behind right
        tower(c, x1 - 2, z1 + 1.2, 3.8, 0, H + pl + 9 + (2 if s >= 4 else 0), "stone", "cone", "slate", rh=8,
              trim=trim, flag="red", wins=3)
    if s >= 4:  # side strongroom (left)
        box(c, 9.5, x0, 4, 13, 0, 9.5, "stone", tex="stone")
        crenel_top(c, 9.5, x0, 4, 13, 9.5)
        fw, _ = faces_of_box(9.5, x0, 4, 13, 0, 9.5)
        c.path(f"M{f(fw.w(3.6, 3)[0])},{f(fw.w(0, 3)[1])}V{f(fw.w(0, 5.5)[1])}A1.1,1.1 0 0 1 {f(fw.w(5.8, 0)[0])},{f(fw.w(0, 5.5)[1])}V{f(fw.w(0, 3)[1])}Z", glass(c), ' stroke-width=".5"')
        c.lines([((fw.w(3.6 + 0.73 * k, 0)[0], fw.w(0, 3)[1]), (fw.w(3.6 + 0.73 * k, 0)[0], fw.w(0, 5.9)[1])) for k in range(1, 3)], "#2c2a28", 0.4, 0.9)
    if pl:
        box(c, x0 - 1.5, x1 + 1.5, z0 - 2.5, z1 + 1, 0, pl, "dstone", tex="stone", top="stone", texargs={"rows": 1})
    fr, sd = box(c, x0, x1, z0, z1, pl, pl + H, "stone", tex="stone")
    # buttress-like pilasters
    for u in (0, (x1 - x0) - 1.6):
        box(c, x0 + u, x0 + u + 1.6, z0 - 0.8, z0, pl, pl + H, "stone", aof=0.2)
    crenel_top(c, x0 - 0.3, x1 + 0.3, z0 - 0.8, z1 + 0.3, pl + H)
    if s >= 2:  # gilded dome on the roof
        r = {2: 3.6, 3: 4.2, 4: 4.6, 5: 5.4}[s]
        cx, cy = P((x0 + x1) / 2, (z0 + z1) / 2 + 1, pl + H + 1.2)
        c.ell(cx, cy + 0.4, r + 0.8, (r + 0.8) * 0.42, c.mat("stone", "f"), ' stroke-width=".6"')
        dome(c, cx, cy, r, r * 1.05, "gold", spire=2.6 if s == 5 else 1.8)
        glint(c, cx - r * 0.45, cy - r * 0.6, 0.9)
    W = x1 - x0
    vault_door(c, fr, W / 2 - 2.4, 4.8, 6.6 if s > 1 else 6, gold=(s >= 3))
    # barred windows
    for u in (3.2, W - 5.2):
        if s >= 2:
            q = fr.qw(u, 6.6, u + 2, 9.6)
            c.poly(q, glass(c), ' stroke-width=".5"')
            c.lines([((q[0][0] + 0.66 * k, q[0][1]), (q[0][0] + 0.66 * k, q[2][1])) for k in range(1, 3)], "#c9c2b2", 0.35, 0.9)
    q = sd.qw(4.5, 6.4 if s > 1 else 5, 6.2, 9.4 if s > 1 else 8)
    c.poly(q, glass(c), ' stroke-width=".5"')
    if s >= 3:
        c.poly(fr.qw(W / 2 - 3.5, 8.6, W / 2 + 3.5, 10.4), c.mat("gold", "f"), ' stroke-width=".45"')
        c.circ(*fr.w(W / 2, 12.1), 1.1, c.mat("gold", "r"), ' stroke-width=".45"')
    if s >= 4:
        for u in (W / 2 - 6.4, W / 2 + 4.0):
            p = fr.w(u, 9.6)
            banner(c, p[0], p[1], 2.4, 5.2, "red")
    if s == 5:
        trim_line(c, [P(x0 - 0.3, z0 - 0.8, pl + H), P(x1 + 0.3, z0 - 0.8, pl + H), P(x1 + 0.3, z1 + 0.3, pl + H)], 0.7)
        flagpole(c, *P(x0 + 1, z0, pl + H + 1.6), 7, "gold", flip=True)
        lantern(c, *P(x0 - 3, -2), 5)
        lantern(c, *P(x1 + 1, -2), 5)
    # treasure in front
    chest(c, x0 - 7 if s < 4 else 8, -3, 4)
    coins(c, P(x1 + 2, -1)[0] + 2, P(x1 + 2, -1)[1], 1.8, 2 + min(s, 3))
    if s >= 2:
        coins(c, P(x1 + 2, -4)[0] - 1, P(x1 + 2, -4)[1], 1.4, 2)
    if s >= 3:
        chest(c, x1 + 4, 3, 3.6)
    if s == 5:
        coins(c, 17, 95, 1.6, 3)
        glint(c, 61, 82, 1)
    tufts(c, [(10, 95), (55, 96), (66, 90), (6, 86)])


# ------------------------------------------------------------- townhall
def belfry(c, x, z, w, h0, h1, roof="roofred", trim=None, gold=False):
    box(c, x, x + w, z, z + w, h0, h1, "stone", tex="stone")
    fr, sd = faces_of_box(x, x + w, z, z + w, h0, h1)
    # open arch with bell
    u0, u1 = w * 0.22, w * 0.78
    q = fr.qw(u0, (h1 - h0) - 4.6, u1, (h1 - h0) - 0.8)
    x0_, y0_ = q[0]
    x1_ = q[1][0]
    rr = (x1_ - x0_) / 2
    c.path(f"M{f(x0_)},{f(y0_)}V{f(q[2][1] + rr)}A{f(rr)},{f(rr)} 0 0 1 {f(x1_)},{f(q[2][1] + rr)}V{f(y0_)}Z", "#2c2219", ' stroke-width=".5"')
    bx, by = (x0_ + x1_) / 2, q[2][1] + rr * 0.9
    c.path(f"M{f(bx - 1.2)},{f(by + 2.2)}Q{f(bx - 1.1)},{f(by)} {f(bx)},{f(by - 0.2)}Q{f(bx + 1.1)},{f(by)} {f(bx + 1.2)},{f(by + 2.2)}Z", c.mat("gold", "r"), ' stroke-width=".4"')
    c.circ(bx, by + 2.4, 0.35, "#5a4020", ' stroke="none"')
    q2 = sd.qw(w * 0.25, (h1 - h0) - 4.4, w * 0.75, (h1 - h0) - 1)
    c.poly(q2, "#2c2219", ' stroke-width=".5"')
    if gold:
        cx, cy = P(x + w / 2, z + w / 2, h1)
        c.ell(cx, cy, w * 0.62, w * 0.3, c.mat("stone", "t"), ' stroke-width=".5"')
        dome(c, cx, cy, w * 0.55, w * 0.6, "gold", spire=2.2)
    else:
        hip(c, x, x + w, z, z + w, h1, w * 0.95, roof, o=0.6, inset=w / 2, trim=trim)
    return fr


def b_townhall(c, s):
    ground(c, dirt=(32, 94, 9, 2.4))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (20, 44), 2: (19, 45), 3: (18, 46), 4: (18, 46), 5: (17, 47)}[s]
    z0, z1 = 0, {1: 14, 2: 15, 3: 16, 4: 16, 5: 17}[s]
    Hc = {1: 12, 2: 13.5, 3: 14.5, 4: 15, 5: 15.5}[s]
    pl = {1: 1.2, 2: 1.6, 3: 2.6, 4: 2.6, 5: 3}[s]
    ncol = {1: 4, 2: 6, 3: 6, 4: 6, 5: 8}[s]
    bshadow(c, x0 - (6 if s >= 4 else 0), x1 + 3, z1 + 2)
    if s >= 4:  # bell tower behind left
        belfry(c, 11, 11, 6, 0, pl + Hc + 10 + (2 if s == 5 else 0), trim=trim, gold=(s == 5))
        if s == 5:
            flagpole(c, *P(14, 14, pl + Hc + 12 + 6.6), 6, "red")
    # stylobate steps
    steps = 1 if s <= 2 else 3
    c('<g stroke-width=".5">')
    for k in range(steps):
        e = (steps - 1 - k) * 0.8
        box(c, x0 - 1.4 - e, x1 + 1.4 + e, z0 - 1.4 - e, z1 + 0.6, pl * k / steps, pl * (k + 1) / steps, "marble", top="marble", aof=0)
    c('</g>')
    # cella (wall behind the colonnade)
    zc = z0 + 3.6
    fw, sw = box(c, x0 + 0.8, x1 - 0.8, zc, z1, pl, pl + Hc, "plaster")
    W = x1 - x0 - 1.6
    door(c, fw, W / 2 - 2, 4, 6.5 if s > 1 else 6)
    for u in (W * 0.16, W * 0.72):
        window(c, fw, u, 2.2, 2.4, 4, arch=True, cross=False)
    window(c, sw, 4, 2.2, 2.4, 4, arch=True, cross=False)
    window(c, sw, 8.5, 2.2, 2.4, 4, arch=True, cross=False)
    # entablature + roof (ridge along z, pediment to the front)
    if s >= 3:  # bell cupola sits on the ridge, drawn before roof front so the roof hides its base
        pass
    # columns
    for k in range(ncol):
        x = x0 + 0.6 + (x1 - x0 - 1.2) * k / (ncol - 1)
        cyl(c, x, z0 + 0.4, 0.75, pl, pl + Hc, "marble", tex=False)
        cx, by = P(x, z0 + 0.4, pl)
        c.lines([((cx - 0.25, by - 0.6), (cx - 0.25, by - Hc + 0.6))], "#ffffff", 0.35, 0.6)
        c(f'<rect x="{f(cx - 1)}" y="{f(by - Hc - 0.2)}" width="2" height=".8" fill="{c.mat("marble", "f")}" stroke-width=".4"/>')
    if s >= 4:  # banners between front columns
        for k in (1, ncol - 3):
            xa = x0 + 0.6 + (x1 - x0 - 1.2) * (k + 0.5) / (ncol - 1)
            p = P(xa, z0 + 0.4, pl + Hc - 0.4)
            banner(c, p[0] - 1.1, p[1], 2.2, 5)
    box(c, x0 - 0.4, x1 + 0.4, z0 - 0.6, z1 + 0.4, pl + Hc, pl + Hc + 1.6, "marble", aof=0)
    ef, es = faces_of_box(x0 - 0.4, x1 + 0.4, z0 - 0.6, z1 + 0.4, pl + Hc, pl + Hc + 1.6)
    c.lines([(ef.at(0, 0.45), ef.at(1, 0.45)), (es.at(0, 0.45), es.at(1, 0.45))], "#8d8474", 0.3, 0.6)
    if trim:
        trim_line(c, [ef.at(0, 0.45), ef.at(1, 0.45), es.at(1, 0.45)], 0.6)
    rise = {1: 7.5, 2: 8, 3: 8.5, 4: 8.5, 5: 9}[s]
    Ht = pl + Hc + 1.6
    gable_z(c, x0 - 0.4, x1 + 0.4, z0 - 0.6, z1 + 0.4, Ht, rise, "roofred", "marble", o=0.8, trim=trim, pediment=True)
    # pediment emblem
    em = P((x0 + x1) / 2, z0 - 0.6, Ht + rise * 0.36)
    if s >= 2:
        c.circ(em[0], em[1], 1.3, c.mat("gold", "r") if s >= 3 else c.mat("marble", "f"), ' stroke-width=".45"')
    if s >= 3:  # small bell cupola on the ridge
        cx, cy = P((x0 + x1) / 2, z1 - 3, Ht + rise * 0.8)
        c(f'<rect x="{f(cx - 2)}" y="{f(cy - 4)}" width="4" height="4" fill="{c.mat("marble", "f")}" stroke-width=".5"/>')
        c(f'<rect x="{f(cx - 1)}" y="{f(cy - 3.4)}" width="2" height="2.6" rx="1" fill="#2c2219" stroke-width=".4"/>')
        c.path(f"M{f(cx - 0.7)},{f(cy - 1)}Q{f(cx)},{f(cy - 3.2)} {f(cx + 0.7)},{f(cy - 1)}Z", c.mat("gold", "r"), ' stroke-width=".3"')
        if s >= 4:
            dome(c, cx, cy - 4, 2.4, 2.6, "gold" if s == 5 else "roofred", spire=1.8)
        else:
            cone(c, cx, cy - 4, 1.9, 3.4, "roofred", o=0.4)
    for x in ((x0 - 3, x1 + 3) if s >= 2 else ()):
        flagpole(c, *P(x, -2.5), 11 if s < 5 else 13, "red" if s < 5 else "gold", flip=(x < 30))
    if s == 5:
        lantern(c, *P(x0 + 4, -4), 5)
        lantern(c, *P(x1 - 4, -4), 5)
    bush(c, 8, 90, 2)
    bush(c, 66, 88, 2.2)
    tufts(c, [(12, 95.5), (54, 96), (68, 92), (6, 85)])


# ------------------------------------------------------------- hero's mansion
def timber(c, face, nx, diag=True, col="#4a2e17"):
    segs = [(face.at(0, 0.02), face.at(1, 0.02)), (face.at(0, 0.98), face.at(1, 0.98)), (face.at(0, 0.5), face.at(1, 0.5))]
    for j in range(nx + 1):
        a = min(0.985, max(0.015, j / nx))
        segs.append((face.at(a, 0), face.at(a, 1)))
    if diag:
        for j in range(nx):
            if j % 2 == 0:
                segs.append((face.at(j / nx, 0.5), face.at((j + 1) / nx, 1)))
            else:
                segs.append((face.at(j / nx, 1), face.at((j + 1) / nx, 0.5)))
    c.lines(segs, col, 0.75, 0.95)


def trophy(c, x, y, s=1.0):
    """Round shield with crossed swords."""
    c.lines([((x - 2.4 * s, y + 2.2 * s), (x + 2.4 * s, y - 2.2 * s)), ((x + 2.4 * s, y + 2.2 * s), (x - 2.4 * s, y - 2.2 * s))], "#3b2a17", 0.9 * s, 0.8)
    c.lines([((x - 2.4 * s, y + 2.2 * s), (x + 2.4 * s, y - 2.2 * s)), ((x + 2.4 * s, y + 2.2 * s), (x - 2.4 * s, y - 2.2 * s))], "#e9e6dc", 0.45 * s, 1)
    c.circ(x, y, 1.5 * s, c.lg("shld", [(0, "#d76b4c"), (1, "#8a2c1d")]), ' stroke-width=".45"')
    c.circ(x, y, 0.5 * s, c.mat("gold", "r"), ' stroke-width=".3"')


def b_heromansion(c, s):
    ground(c, dirt=(36, 93.5, 8, 2.4))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (23, 43), 2: (22, 45), 3: (21, 46), 4: (21, 46), 5: (20, 47)}[s]
    z0, z1 = 2, {1: 13, 2: 14, 3: 15, 4: 15, 5: 16}[s]
    H = {1: 11, 2: 13, 3: 18, 4: 18.5, 5: 19.5}[s]
    rise = {1: 10, 2: 11, 3: 12.5, 4: 12.5, 5: 13.5}[s]
    bshadow(c, x0 - 4, x1 + 3, z1 + 1)
    if s >= 4:  # watchtower behind right
        tx0, tz = x1 - 4, z1 - 1
        box(c, tx0, tx0 + 5, tz, tz + 5, 0, H + rise + 2, "stone", tex="stone")
        ft, _ = faces_of_box(tx0, tx0 + 5, tz, tz + 5, 0, H + rise + 2)
        q = ft.qw(1.6, H + rise - 3, 3.4, H + rise)
        c.poly(q, glass(c), ' stroke-width=".5"')
        hip(c, tx0, tx0 + 5, tz, tz + 5, H + rise + 2, 6, "roofred", o=0.7, inset=2.5, trim=trim)
        flagpole(c, *P(tx0 + 2.5, tz + 2.5, H + rise + 8), 6, "red")
    hb = 0
    if s >= 3:
        hb = 6
        fs, ss = box(c, x0, x1, z0, z1, 0, hb, "stone", tex="stone")
    fr, sd = box(c, x0 - (0.6 if s >= 3 else 0), x1, z0 - (0.8 if s >= 3 else 0), z1, hb, H, "plaster", aof=0.2 if s < 3 else 0.1)
    timber(c, fr, 4 if s < 3 else 5)
    timber(c, sd, 3, diag=s >= 3)
    W = x1 - x0
    gable_z(c, x0 - (0.6 if s >= 3 else 0), x1, z0 - (0.8 if s >= 3 else 0), z1, H, rise, "roofred", "plaster", o=1.1, trim=trim)
    # gable timber
    zg = z0 - (0.8 if s >= 3 else 0)
    xa = x0 - (0.6 if s >= 3 else 0)
    xm = (xa + x1) / 2
    c.lines([(P(xa + 1, zg, H + 0.3), P(x1 - 1, zg, H + 0.3)), (P(xm, zg, H), P(xm, zg, H + rise - 0.6)),
             (P(xa + 3, zg, H + 0.2), P(xm, zg, H + rise * 0.6)), (P(x1 - 3, zg, H + 0.2), P(xm, zg, H + rise * 0.6))], "#4a2e17", 0.7, 0.9)
    tp = P(xm, zg, H + rise * 0.42)
    trophy(c, tp[0], tp[1] + 0.4, 0.9 if s < 3 else 1.1)
    if s >= 2:
        c.lines([(P(xm - 1.6, zg, H + rise - 1), P(xm, zg, H + rise + 2.2)), (P(xm + 1.6, zg, H + rise - 1), P(xm, zg, H + rise + 2.2))], "#e8dcc0", 0.7, 1)
    # door + windows
    if s >= 3:
        door(c, fs, W / 2 - 2, 4, 5.4)
        window(c, fs, 2.5, 1.6, 2.4, 3, arch=True, cross=False)
        window(c, fs, W - 4.9, 1.6, 2.4, 3, arch=True, cross=False)
        for u in (2.0, W / 2 - 1.3, W - 4.6):
            window(c, fr, u + 0.6, 1.8, 2.6, 3.4)
        window(c, ss, 4, 1.4, 2.2, 3, cross=False)
        window(c, sd, 4, 1.8, 2.4, 3.2)
        for u in (W * 0.2, W * 0.7):
            p = fr.w(u, (H - hb) - 0.6)
            banner(c, p[0], p[1], 2.3, 4.6, "red")
    else:
        door(c, fr, W / 2 - 1.8, 3.6, 5.6)
        window(c, fr, 2.4, 2.4, 2.6, 3.4)
        window(c, fr, W - 5, 2.4, 2.6, 3.4)
        window(c, sd, 4, 2.4, 2.4, 3.2)
    if s == 5:
        trim_line(c, [P(x0 - 0.6, z0 - 0.8, hb), P(x1, z0 - 0.8, hb), P(x1, z1, hb)], 0.6)
        lantern(c, *P(x1 + 2, -3), 5)
    # statue (left front) on a growing plinth
    sc = {1: 0.9, 2: 1.0, 3: 1.05, 4: 1.15, 5: 1.25}[s]
    statue(c, 13.5, 93.5, sc, "gold" if s == 5 else "stone")
    if s >= 3:  # weapon rack (right)
        rx, ry = 55, 92.5
        c.lines([((rx, ry), (rx, ry - 6)), ((rx + 5, ry - 1.5), (rx + 5, ry - 7.5)), ((rx - 0.3, ry - 4.5), (rx + 5.3, ry - 6))], "#6b4a2a", 0.8, 1)
        for k in range(3):
            xx = rx + 0.9 + k * 1.6
            c.lines([((xx, ry - 0.3 - k * 0.45), (xx + 0.3, ry - 9.5 - k * 0.45))], "#5a3c1c", 0.45, 1)
            c.path(f"M{f(xx + 0.3)},{f(ry - 9.5 - k * 0.45)}l-.5,1.2h1z", "#e9e6dc", ' stroke-width=".3"')
        if s >= 4:
            trophy(c, rx + 2.5, ry - 3.4, 0.8)
    if s == 5:
        flagpole(c, *P(x0 - 2, -2), 12, "gold", flip=True)
    bush(c, 63, 88, 2.1)
    tufts(c, [(8, 96), (50, 96.5), (67, 92), (7, 85)])


def beam(c, a, b, w=0.9, col="#a8743f", hi=True):
    seg = f'x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}"'
    c(f'<line {seg} stroke-width="{f(w + 0.8)}"/>')
    c(f'<line {seg} stroke="{col}" stroke-width="{f(w)}" stroke-opacity="1"/>')
    if hi and w >= 0.8:
        c(f'<line x1="{f(a[0] - 0.2)}" y1="{f(a[1])}" x2="{f(b[0] - 0.2)}" y2="{f(b[1])}" stroke="#f0cf98" stroke-width=".3" stroke-opacity=".7"/>')


def cyl_world(c, x, z, r, h0, h1, mat, tex=False):
    return cyl(c, x, z, r, h0, h1, mat, tex=tex)


# ------------------------------------------------------------- stonemason
def crane(c, bx, by, H, L, block=True, wheel=False, trim=None):
    ax = bx + 0.4
    ay = by - H
    if wheel:
        r = 3.6
        cx, cy = bx - 1.5, by - r - 0.3
        c.circ(cx, cy, r, "none", ' stroke-width="1.9"')
        c.circ(cx, cy, r, "none", ' stroke="#a8743f" stroke-width="1.1" stroke-opacity="1"')
        c.lines([((cx + r * math.cos(t), cy + r * math.sin(t)), (cx - r * math.cos(t), cy - r * math.sin(t))) for t in (0, 1.05, 2.1)], "#6b4a2a", 0.5, 1)
    beam(c, (bx - 3.6, by), (ax, ay), 1.0)
    beam(c, (bx + 3.2, by + 0.6), (ax, ay), 1.0)
    beam(c, (bx - 2.2, by - H * 0.4), (bx + 2.2, by - H * 0.4 + 0.4), 0.7)
    tip = (ax + L, ay + 1.5)
    beam(c, (ax - 2, ay + 0.6), tip, 0.9)
    beam(c, (ax + 0.2, ay + H * 0.35), (ax + L * 0.55, ay + 1.1), 0.6, hi=False)
    if trim:
        c.circ(ax, ay, 0.7, c.mat("gold", "r"), ' stroke-width=".3"')
    if block:
        hy = ay + H * 0.55
        c.lines([(tip, (tip[0], hy))], "#4a3a28", 0.4, 1)
        c.lines([((tip[0], hy), (tip[0] - 1.6, hy + 1.2)), ((tip[0], hy), (tip[0] + 1.6, hy + 1.2))], "#4a3a28", 0.35, 1)
        bw = 3.2
        x0 = tip[0] - bw / 2
        c.poly([(x0 + bw, hy + 1.2), (x0 + bw + 1.2, hy + 0.4), (x0 + bw + 1.2, hy + 3.2), (x0 + bw, hy + 4)], c.mat("stone", "s"), ' stroke-width=".5"')
        c.poly([(x0, hy + 1.2), (x0 + bw, hy + 1.2), (x0 + bw, hy + 4), (x0, hy + 4)], c.mat("stone", "f"), ' stroke-width=".5"')
        c.poly([(x0, hy + 1.2), (x0 + 1.2, hy + 0.4), (x0 + bw + 1.2, hy + 0.4), (x0 + bw, hy + 1.2)], c.mat("stone", "t"), ' stroke-width=".4"')


def b_stonemason(c, s):
    ground(c, dirt=(34, 92.5, 15, 3.4))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (27, 45), 2: (26, 46), 3: (25, 47), 4: (25, 47), 5: (24, 48)}[s]
    z0, z1 = 4, {1: 14, 2: 15, 3: 16, 4: 16, 5: 17}[s]
    H = {1: 11, 2: 13, 3: 18, 4: 18.5, 5: 19.5}[s]
    rise = {1: 8, 2: 9, 3: 9.5, 4: 10, 5: 10.5}[s]
    bshadow(c, x0 - 10, x1 + 2, z1)
    pl = 0 if s < 3 else 1.6
    if pl:
        box(c, x0 - 0.6, x1 + 0.6, z0 - 0.6, z1 + 0.6, 0, pl, "dstone", tex="stone", top="stone", texargs={"rows": 1})
    fr, sd = box(c, x0, x1, z0, z1, pl, H, "stone", tex="stone")
    zm = (z0 + z1) / 2
    chimney(c, x1 - 4, zm + 1, H, H + rise + 2, "stone", smoke=s >= 2)
    gable_x(c, x0, x1, z0, z1, H, rise, "roofbrown", "stone", trim=trim)
    W = x1 - x0
    door(c, fr, W / 2 - 1.8, 3.8, 5.6, arch=False, v=0)
    window(c, fr, 2.4, 2.4, 2.6, 3.2)
    window(c, fr, W - 5, 2.4, 2.6, 3.2)
    window(c, sd, 4, 2.4, 2.4, 3)
    if s >= 3:
        for u in (2.4, W / 2 - 1.3, W - 5):
            window(c, fr, u, 9 - pl + 0.4, 2.6, 3.2, shutters="wood")
        window(c, sd, 4, 8.8, 2.4, 3)
    if s >= 2:
        flagpole(c, *P(x0 + 1.5, zm, H + rise), 6, "red" if s < 5 else "gold", flip=True)
    if s == 5:
        flagpole(c, *P(x1 + 9.5, -2.8, 0), 14, "red")
    if s >= 4:  # open lean-to on the right with column drums
        lx0, lx1 = x1 + 0.2, x1 + 8.5
        for x, z in ((lx1, -1.5), (lx1, 5), (lx0, -1.5)):
            cx, by = P(x, z, 0)
            beam(c, (cx, by), (cx, by - 7), 0.8)
        a, b_, cc, d = P(lx0, -2.5, 8.3), P(lx1 + 0.8, -2.5, 6.7), P(lx1 + 0.8, 7, 6.7), P(lx0, 7, 8.3)
        c.poly([a, b_, cc, d], c.mat("roofbrown", "t"))
        fs = Face(a, sub(b_, a), sub(d, a), 1, 1)
        tex_tiles(c, fs, 4, 3, c.tex("roofbrown"))
        for k, (x, z) in enumerate(((lx0 + 2.5, 0.5), (lx0 + 5.5, 0))):
            cyl(c, x, z, 1.3, 0, 2.4 + k * 0.4, "marble", cap="marble")
    # stone blocks in front
    c('<g stroke-width=".55">')
    blocks = [(11, -2, 3.2), (14.4, -2.6, 3.4), (12.6, -5.5, 2.8)]
    if s >= 2:
        blocks += [(40, -5, 3), (43.2, -4.6, 2.6)]
    if s >= 3:
        blocks += [(17.6, -5.8, 2.6)]
    for x, z, sz in sorted(blocks, key=lambda b: -b[1]):
        sblock(c, x, z, sz, sz * 0.75)
    if s >= 3:
        sblock(c, 12.2, -2.2, 2.6, 2.2)
    if s >= 2:
        cyl(c, 47, -3, 1.3, 0, 2.2, "marble", cap="marble")
    c('</g>')
    if s == 5:  # statue being carved
        statue(c, 22, 95, 0.9, "marble")
    # crane (front-left)
    ch = {1: 21.5, 2: 26.5, 3: 31, 4: 32, 5: 34.5}[s]
    crane(c, 16, 89, ch, 10 + s, block=True, wheel=s >= 3, trim=trim)
    # chips / tools
    c.lines([((26, 94.5), (29, 93.8))], "#6b4a2a", 0.6, 1)
    c.path("M28.6,94.3l1.4-.9.6,1-1.3.6z", "#8b8d90", ' stroke-width=".3"')
    c.ell(37, 94.5, 2.5, 0.6, "#f2ecdf", ' stroke="none" opacity=".7"')
    tufts(c, [(8, 95), (55, 96.5), (66, 91), (6, 85)])
    bush(c, 66, 88, 1.9)


# ------------------------------------------------------------- brewery
def kettle(c, x, z, r, h, glints=False):
    cyl(c, x, z, r + 0.5, 0, 1.4, "brick", tex=False)
    cx, ty, by = cyl(c, x, z, r, 1.4, 1.4 + h, "copper", tex=False)
    c.path(f"M{f(cx - r)},{f(by - 0.6)}A{f(r)},{f(r * 0.45)} 0 0 0 {f(cx + r)},{f(by - 0.6)}", "none", ' stroke="#6a3418" stroke-width=".5"')
    d = "".join(f"M{f(cx - r + 2 * r * t)},{f(ty + 0.5)}V{f(by - 0.8)}" for t in (0.2, 0.5, 0.8))
    c(f'<path d="{d}" fill="none" stroke="#7a4224" stroke-width=".3" opacity=".5"/>')
    dome(c, cx, ty, r, r * 0.75, "copper", finial=False)
    c.lines([((cx, ty - r * 0.75), (cx, ty - r * 0.75 - 3)), ((cx, ty - r * 0.75 - 3), (cx - 3, ty - r * 0.75 - 4.5))], OL, 1.5, 0.7)
    c.lines([((cx, ty - r * 0.75), (cx, ty - r * 0.75 - 3)), ((cx, ty - r * 0.75 - 3), (cx - 3, ty - r * 0.75 - 4.5))], "#d48a52", 0.8, 1)
    c.lines([((cx - r * 0.5, by - h * 0.3), (cx - r * 0.5, by - h * 0.85))], "#ffe2c0", 0.5, 0.75)
    if glints:
        glint(c, cx - r * 0.4, ty - r * 0.4, 0.9)


def hops(c, x, y, h=9):
    c.lines([((x, y), (x, y - h))], "#6b4a2a", 0.6, 1)
    g = c.rg("hop", [(0, "#cde09a"), (0.6, "#88aa4c"), (1, "#557a2a")], 0.35, 0.3, 0.75)
    for k in range(5):
        yy = y - 1.5 - k * (h - 2) / 4
        c.circ(x + (0.9 if k % 2 else -0.9), yy, 0.95, g, ' stroke-width=".4"')


def b_brewery(c, s):
    ground(c, dirt=(33, 93, 11, 2.6))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (24, 44), 2: (22, 45), 3: (21, 46), 4: (22, 46), 5: (21, 47)}[s]
    z0, z1 = 3, {1: 14, 2: 15, 3: 16, 4: 16, 5: 17}[s]
    H = {1: 11.5, 2: 14, 3: 18, 4: 18.5, 5: 19.5}[s]
    rise = {1: 8.5, 2: 9.5, 3: 10, 4: 10.5, 5: 11}[s]
    bshadow(c, x0 - 6, x1 + 3, z1)
    if s >= 4:  # copper silo tower behind left
        sx, sz = x0 - 4.5, 7
        tower(c, sx, sz, 3.6, 0, H + 3 + (2 if s == 5 else 0), "copper", "cone", "copper", rh=5.5, trim=trim, wins=0)
        cx, _ = P(sx, sz, 0)
        c.lines([((cx - 3.6, P(0, sz, h)[1]), (cx + 3.6, P(0, sz, h)[1])) for h in (4, 9, 14)], "#6a3418", 0.5, 0.6)
    pl = 0
    if s >= 3:
        pl = 5
        fs, ss = box(c, x0, x1, z0, z1, 0, pl, "stone", tex="stone")
    fr, sd = box(c, x0, x1, z0, z1, pl, H, "wood", tex="logs", aof=0.25 if s < 3 else 0.1)
    zm = (z0 + z1) / 2
    chimney(c, x1 - 4.5, zm + 1, H, H + rise + 2.5, "brick", smoke=True)
    if s >= 3:
        chimney(c, x0 + 3, zm + 1, H, H + rise + 1.5, "brick", smoke=s >= 4)
    gable_x(c, x0, x1, z0, z1, H, rise, "roofred", "wood", trim=trim, wall_tex="planks")
    W = x1 - x0
    if s >= 3:
        door(c, fs, W / 2 - 2.2, 4.4, 4.6 if False else 4.8, arch=True)
        window(c, fs, 2.6, 1.4, 2.4, 2.6, arch=True, cross=False)
        window(c, fs, W - 5, 1.4, 2.4, 2.6, arch=True, cross=False)
        for u in (2.4, W / 2 - 1.3, W - 5):
            window(c, fr, u, 2.6, 2.6, 3.4)
        window(c, sd, 4, 2.6, 2.4, 3.2)
        # hanging sign with a tankard
        sp = fr.w(W / 2 - 4.5, 0)
        c.lines([((sp[0], P(0, z0, pl + 1)[1]), (sp[0] - 2.5, P(0, z0, pl + 1)[1]))], "#3b2a17", 0.5, 1)
        c(f'<rect x="{f(sp[0] - 3.4)}" y="{f(P(0, z0, pl + 0.8)[1])}" width="2.6" height="2.4" fill="{c.mat("wood", "f")}" stroke-width=".4"/>')
        c(f'<rect x="{f(sp[0] - 2.7)}" y="{f(P(0, z0, pl + 0.3)[1])}" width="1.2" height="1.4" fill="{GOLD}" stroke="none"/>')
    else:
        door(c, fr, W / 2 - 1.9, 3.8, 5.6, arch=False)
        window(c, fr, 2.6, 2.6, 2.6, 3)
        window(c, fr, W - 5.2, 2.6, 2.6, 3)
        window(c, sd, 4, 2.6, 2.4, 3)
    if s >= 4:
        flagpole(c, *P(x1 - 1, zm, H + rise), 6, "red")
    if s == 5:
        flagpole(c, *P(x0 + 6, zm, H + rise), 6, "gold", flip=True)
        trim_line(c, [P(x0, z0, pl), P(x1, z0, pl), P(x1, z1, pl)], 0.6)
        lantern(c, *P(x0 + 3, -3), 5)
    # kettle (right front)
    if s >= 2:
        kr = {2: 2.6, 3: 3.0, 4: 3.2, 5: 3.6}[s]
        kettle(c, x1 + 3, -1.5, kr, kr * 1.1, glints=s >= 4)
    if s >= 3:
        hops(c, 9, 89, 10)
    # barrels (left front)
    nb = {1: 2, 2: 3, 3: 3, 4: 4, 5: 4}[s]
    for k in range(nb):
        barrel(c, 11.5 + k * 3.6 - (k // 2) * 0.6, 93 - (k % 2) * 1.6, 1.5, 3.2)
    if s >= 2:
        barrel_lying(c, 23, 95.5, 1.3, 2.8)
    if s >= 3:  # stacked lying barrels by the wall
        for i, (bx, by) in enumerate(((50.5, 92.5), (53.5, 92.5), (52, 90))):
            barrel_lying(c, bx, by, 1.2, 2.2)
    tufts(c, [(8, 96), (40, 96.5), (66, 91), (6, 85)])
    bush(c, 67, 87, 1.9)


# ------------------------------------------------------------- trapper
def cage(c, x, z, w=4.5, d=3.5, h=3.5, eyes=True):
    A, B, C_, D = P(x, z, 0), P(x + w, z, 0), P(x + w, z + d, 0), P(x, z + d, 0)
    c.poly([A, B, C_, D], c.lg("cagefl", [(0, "#8a6a3e"), (1, "#5e4426")]), ' stroke-width=".4"')
    c.poly([D, C_, P(x + w, z + d, h), P(x, z + d, h)], "#3a2a18", ' stroke="none" opacity=".55"')
    if eyes:
        ex, ey = P(x + w * 0.45, z + d * 0.6, h * 0.35)
        c.ell(ex - 0.2, ey + 0.3, 1.6, 0.9, "#4a3524", ' stroke="none"')
        c.circ(ex - 0.6, ey - 0.1, 0.22, "#ffd25a", ' stroke="none"')
        c.circ(ex + 0.1, ey - 0.1, 0.22, "#ffd25a", ' stroke="none"')
    segs = []
    for k in range(6):
        t = k / 5
        segs.append((P(x + w * t, z, 0), P(x + w * t, z, h)))
    for k in range(1, 5):
        t = k / 4
        segs.append((P(x + w, z + d * t, 0), P(x + w, z + d * t, h)))
    c.lines(segs, "#4a2e17", 0.75, 0.95)
    c.lines(segs, "#b98a52", 0.35, 1)
    top = [P(x, z, h), P(x + w, z, h), P(x + w, z + d, h), P(x, z + d, h)]
    c.poly(top, "none", ' stroke="#8a5a30" stroke-width="1" stroke-opacity="1"')
    c.poly(top, "none", ' stroke-width=".35"')


def pit(c, cx, cy, rx, ry, stakes=5):
    c.ell(cx, cy, rx + 1.2, ry + 0.6, c.rg("pitrim", [(0, "#8a6e46"), (0.8, "#b39a6c"), (1, "#c8b283", 0)]), NS)
    c.ell(cx, cy, rx, ry, c.rg("pit", [(0, "#120c06"), (0.7, "#2c2014"), (1, "#5a4228")], 0.5, 0.35, 0.6), ' stroke-width=".6"')
    for k in range(stakes):
        t = (k + 0.5) / stakes
        sx = cx - rx * 0.75 + rx * 1.5 * t
        sy = cy + ry * 0.35 * math.sin(t * 6.3)
        c.path(f"M{f(sx - 0.45)},{f(sy + 0.8)}L{f(sx)},{f(sy - 1.4)}L{f(sx + 0.45)},{f(sy + 0.8)}Z", "#d9b47c", ' stroke-width=".35"')
    # branches half covering it
    c.lines([((cx - rx, cy - ry * 0.2), (cx - rx * 0.1, cy + ry * 0.7)), ((cx - rx * 0.8, cy + ry * 0.6), (cx - rx * 0.2, cy - ry * 0.7)),
             ((cx + rx * 0.4, cy - ry * 0.9), (cx + rx * 1.05, cy + ry * 0.3))], "#6b4a2a", 0.6, 1)


def net(c, x, y, w=6, h=5.5):
    beam(c, (x, y), (x, y - h - 1.5), 0.7)
    beam(c, (x + w, y - 0.8), (x + w, y - h - 2.3), 0.7)
    beam(c, (x - 0.4, y - h - 1.2), (x + w + 0.4, y - h - 2), 0.6, hi=False)
    fc = Face((x + 0.5, y - h - 1.2), (w - 1, -0.7), (0.4, h - 1.5), 1, 1)
    c.poly(fc.quad(), "#7a5a34", ' stroke="none" opacity=".18"')
    segs = []
    for k in range(7):
        t = k / 6
        segs.append((fc.at(t, 0), fc.at(t + 0.1 * math.sin(t * 3), 1)))
    for k in range(6):
        t = k / 5
        segs.append((fc.at(0, t), fc.at(1, t + 0.05)))
    c.lines(segs, "#4a3524", 0.3, 0.85)


def pelt(c, x, y, s=1.0):
    c.lines([((x, y), (x, y - 6 * s)), ((x + 4 * s, y), (x + 4 * s, y - 6 * s)), ((x - 0.3, y - 5.6 * s), (x + 4.3 * s, y - 5.6 * s))], "#6b4a2a", 0.6, 1)
    c.path(f"M{f(x + 0.5 * s)},{f(y - 5.2 * s)}Q{f(x + 2 * s)},{f(y - 4.6 * s)} {f(x + 3.5 * s)},{f(y - 5.2 * s)}L{f(x + 3.2 * s)},{f(y - 2.6 * s)}"
           f"L{f(x + 3.7 * s)},{f(y - 1 * s)}Q{f(x + 2 * s)},{f(y - 1.6 * s)} {f(x + 0.3 * s)},{f(y - 1 * s)}L{f(x + 0.8 * s)},{f(y - 2.8 * s)}Z",
           c.lg("pelt", [(0, "#b98858"), (1, "#7a5232")], 0, 0, 1, 1), ' stroke-width=".4"')


def b_trapper(c, s):
    ground(c, dirt=(28, 92, 14, 3.4))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (26, 44), 2: (25, 45), 3: (24, 46), 4: (25, 46), 5: (24, 47)}[s]
    z0, z1 = 4, {1: 14, 2: 15, 3: 16, 4: 16, 5: 17}[s]
    H = {1: 8, 2: 9, 3: 11, 4: 11, 5: 11.5}[s]
    rise = {1: 12.5, 2: 14, 3: 15, 4: 16, 5: 17}[s]
    bshadow(c, x0 - 8, x1 + 3, z1)
    if s >= 4:  # watchtower behind left
        tx, tz = 13, 13
        th = 19 if s == 4 else 21
        for dx, dz in ((0, 3.5), (3.5, 3.5), (0, 0), (3.5, 0)):
            a = P(tx + dx, tz + dz, 0)
            beam(c, a, (a[0], a[1] - th), 0.8)
        beam(c, P(tx, tz, 3), P(tx + 3.5, tz, th - 4), 0.5, hi=False)
        box(c, tx - 0.6, tx + 4.1, tz - 0.6, tz + 4.1, th, th + 1, "log", aof=0)
        c.lines([(P(tx - 0.6, tz - 0.6, th + 2.4), P(tx + 4.1, tz - 0.6, th + 2.4))], "#6b4a2a", 0.6, 1)
        cx, cy = P(tx + 1.75, tz + 1.75, th + 4)
        cone(c, cx, cy, 2.6, 5, "thatch", o=0.6, trim=trim, finial=False)
        flagpole(c, cx, cy - 4.6, 5, "red")
    pl = 0
    if s >= 3:
        pl = 1.5
        box(c, x0 - 0.6, x1 + 0.6, z0 - 0.6, z1 + 0.6, 0, pl, "dstone", tex="stone", top="stone", texargs={"rows": 1})
    fr, sd = box(c, x0, x1, z0, z1, pl, H, "log", tex="logs")
    gable_z(c, x0, x1, z0, z1, H, rise, "thatch", "log", o=1.6, trim=trim, wall_tex="planks")
    W = x1 - x0
    door(c, fr, W / 2 - 1.7, 3.4, H - pl - 0.6, arch=False, iron=False)
    window(c, sd, 3.5, 1.4, 2.2, 2.2, cross=False, sill=False)
    # antlers on the gable
    ax_, ay_ = P((x0 + x1) / 2, z0, H + rise * 0.45)
    c.path(f"M{f(ax_ - 0.6)},{f(ay_)}Q{f(ax_ - 3.4)},{f(ay_ - 0.6)} {f(ax_ - 3.2)},{f(ay_ - 3.4)}M{f(ax_ - 2.2)},{f(ay_ - 0.4)}l-.2,-1.6"
           f"M{f(ax_ + 0.6)},{f(ay_)}Q{f(ax_ + 3.4)},{f(ay_ - 0.6)} {f(ax_ + 3.2)},{f(ay_ - 3.4)}M{f(ax_ + 2.2)},{f(ay_ - 0.4)}l.2,-1.6",
           "none", ' stroke="#efe2c4" stroke-width=".7" stroke-opacity="1"')
    c.circ(ax_, ay_ + 0.2, 0.8, c.lg("skull", [(0, "#f6efdc"), (1, "#c8b896")]), ' stroke-width=".35"')
    if s == 5:
        flagpole(c, *P(x1 + 1, z0 - 1, 0), 15, "gold")
    # traps & cages in front
    pr = {1: 4.2, 2: 4.8, 3: 5.2, 4: 5.6, 5: 6.2}[s]
    pit(c, 15, 92.5, pr, pr * 0.36, stakes=3 + s)
    if s >= 3:
        pelt(c, 49.5, 89, 0.9)
    if s >= 2:
        net(c, 5.5, 89, 5.5, 5 + s * 0.3)
    c('<g stroke-width=".5">')
    cage(c, 36, -5.5, 5, 3.6, 3.8)
    if s >= 3:
        cage(c, 44, -2, 4, 3.2, 3.2)
    if s >= 4:
        cage(c, 24, -5.6, 3.6, 3, 2.8, eyes=False)
    c('</g>')
    if s == 5:
        for x in (20.5, 22.5):
            cx, by = P(x, -1)
            beam(c, (cx, by), (cx, by - 5), 0.9, "#a8743f")
            c.circ(cx, by - 5.5, 0.7, c.mat("gold", "r"), ' stroke-width=".3"')
    tufts(c, [(9, 96), (52, 96.5), (66, 91), (6, 85)])
    bush(c, 67, 87.5, 2)


# ------------------------------------------------------------- sawmill
def wheel(c, x, zc, hc, r, n=8):
    def pp(rr, t):
        return P(x, zc + rr * math.cos(t), hc + rr * math.sin(t))
    N = 28
    outer = [pp(r, 2 * math.pi * k / N) for k in range(N)]
    inner = [pp(r - 0.9, 2 * math.pi * k / N) for k in range(N)]
    # paddles
    segs = [(pp(r - 0.3, 2 * math.pi * k / n + 0.2), pp(r + 1.3, 2 * math.pi * k / n + 0.2)) for k in range(n)]
    c.lines(segs, OL, 1.9, 0.75)
    c.lines(segs, "#8f5f36", 1.1, 1)
    d = "M" + " ".join(f"{f(a)},{f(b)}" for a, b in outer) + "Z M" + " ".join(f"{f(a)},{f(b)}" for a, b in reversed(inner)) + "Z"
    c.path(d, c.lg("wheel", [(0, "#c48a52"), (1, "#6c4527")], 0, 0, 1, 1), ' fill-rule="evenodd" stroke-width=".55"')
    sp = [(pp(0, 0), pp(r - 0.9, 2 * math.pi * k / n)) for k in range(n)]
    c.lines(sp, "#4a2e17", 0.8, 0.95)
    c.lines(sp, "#b07a45", 0.4, 1)
    hx, hy = pp(0, 0)
    c.circ(hx, hy, 0.9, c.mat("iron", "r"), ' stroke-width=".4"')


def water(c, xa, xb, za, zb):
    q = [P(xa, za, 0), P(xb, za, 0), P(xb, zb, 0), P(xa, zb, 0)]
    c.poly([P(xa - 0.8, za, 0.1), P(xb + 0.8, za, 0.1), P(xb + 0.8, zb, 0.1), P(xa - 0.8, zb, 0.1)], c.mat("dstone", "t"), ' stroke-width=".5"')
    c.poly(q, c.lg("water", [(0, "#a9d4e6"), (0.5, "#5f9ec0"), (1, "#3b6f93")], 0, 0, 1, 1), ' stroke-width=".4"')
    segs = []
    for k in range(5):
        z = za + (zb - za) * (k + 0.5) / 5
        segs.append((P(xa + 0.6, z, 0), P(xa + (xb - xa) * 0.6, z + 0.8, 0)))
    c.lines(segs, "#eaf6fb", 0.35, 0.8)


def sawbench(c, x, z, w=8):
    box(c, x, x + w, z, z + 2, 0, 2.4, "wood", aof=0)
    logs(c, P(x, z + 0.5, 3.3)[0] + 0.6, P(x, z + 0.5, 3.3)[1] + 0.1, 1, 1.0, w - 1)
    bx, by = P(x + w * 0.5, z + 1, 2.4)
    c.circ(bx, by - 0.6, 1.6, c.mat("iron", "r"), ' stroke-width=".4"')
    c.circ(bx, by - 0.6, 0.4, "#2c2a28", ' stroke="none"')


def b_sawmill(c, s):
    ground(c, dirt=(28, 92.5, 13, 3))
    trim = GOLD if s == 5 else None
    x0, x1 = {1: (23, 41), 2: (22, 42), 3: (21, 42), 4: (21, 42), 5: (20, 43)}[s]
    z0, z1 = 3, {1: 13, 2: 14, 3: 15, 4: 15, 5: 16}[s]
    H = {1: 9.5, 2: 12, 3: 16, 4: 16.5, 5: 18}[s]
    rise = {1: 7.5, 2: 8.5, 3: 9.5, 4: 10, 5: 10.5}[s]
    bshadow(c, x0 - 8, x1 + 8, z1)
    zm = (z0 + z1) / 2
    if s >= 2:
        water(c, x1 + 1, x1 + 6, -6, z1 + 6)
    if s == 1:  # open shed on posts
        c.poly([P(x0, z1, 0), P(x1, z1, 0), P(x1, z1, H), P(x0, z1, H)], c.mat("dwood", "s"))
        tex_planks(c, Face(P(x0, z1, 0), (x1 - x0, 0), (0, -H), x1 - x0, H), 9, c.tex("dwood"))
        sawbench(c, x0 + 3, z0 + 3, 11)
        for x, z in ((x0, z0), (x1, z0), (x1, z1)):
            a = P(x, z, 0)
            beam(c, a, (a[0], a[1] - H), 1.0)
        fr = sd = None
    else:
        pl = 0 if s == 2 else 3
        if pl:
            box(c, x0, x1, z0, z1, 0, pl, "stone", tex="stone")
        fr, sd = box(c, x0, x1, z0, z1, pl, H, "wood", tex="planks")
    gable_x(c, x0, x1, z0, z1, H, rise, "roofbrown", "wood" if s > 1 else "dwood", trim=trim, wall_tex="planks")
    W = x1 - x0
    if fr is not None:
        pl = 0 if s == 2 else 3
        ff = Face(P(x0, z0, pl), (W, 0), (0, -(H - pl)), W, H - pl)
        # wide open saw bay
        q = ff.qw(W * 0.45, 0, W * 0.92, min(H - pl - 1.4, 6.5))
        c.poly(q, c.lg("bay", [(0, "#2a1d12"), (1, "#4a3420")]), ' stroke-width=".55"')
        bx, by = lerp(q[0], q[1], 0.5)
        c.circ(bx, by - 2.6, 1.7, c.mat("iron", "r"), ' stroke-width=".4"')
        c.lines([((q[0][0] + 0.5, by - 1.4), (q[1][0] - 0.5, by - 1.4))], "#c48a52", 1.2, 1)
        window(c, ff, 2.4, 2.4, 2.4, 3)
        if s >= 3:
            window(c, ff, 2.4, 6.4 + 1, 2.4, 3)
            window(c, ff, W * 0.6, 7.4, 2.4, 3)
            door(c, Face(P(x0, z0, 0), (W, 0), (0, -pl - 3), W, pl + 3), 1, 0.1, 0.1, arch=False, iron=False) if False else None
    # wheel on the right wall
    if s >= 2:
        r = {2: 4.2, 3: 5.6, 4: 6, 5: 6.5}[s]
        wheel(c, x1 + 2.8, zm, r - 1.2, r, 8 if s < 4 else 10)
        if s >= 3:  # flume feeding the wheel
            a, b = P(x1 + 2.8, z1 + 6, 2 * r - 0.4), P(x1 + 2.8, zm + 1.5, 2 * r - 1)
            beam(c, a, b, 1.6, "#7d5533", hi=False)
            c.lines([(a, b)], "#8fc3dc", 0.6, 1)
            beam(c, P(x1 + 2.8, z1 + 6, 0), a, 0.6)
        c.path(f"M{f(P(x1 + 2.8, zm, 0)[0] - 2)},{f(P(x1 + 2.8, zm - r, 0)[1])}q1,-1 2,0q1,-1 2,0", "none", ' stroke="#ffffff" stroke-width=".5" stroke-opacity=".9"')
    if s >= 4:  # lean-to with planks on the left
        a, b_ = P(x0 - 9, -1, 6), P(x0, -1, 7.5)
        for x in (x0 - 9, x0 - 1):
            p = P(x, -1, 0)
            beam(c, p, (p[0], p[1] - (6 if x < x0 - 5 else 7.5)), 0.8)
        cc, d = P(x0, 6, 7.5), P(x0 - 9, 6, 6)
        c.poly([a, b_, cc, d], c.mat("roofbrown", "t"))
        tex_tiles(c, Face(a, sub(b_, a), sub(d, a), 1, 1), 3, 4, c.tex("roofbrown"))
        planks_stack(c, x0 - 8, 0.5, 6, 3, 2.4, 4)
        flagpole(c, *P(x1 - 1, zm, H + rise), 6, "red")
    if s == 5:
        flagpole(c, *P(x0 + 1, zm, H + rise), 6, "gold", flip=True)
        trim_line(c, [P(x0, z0, 3), P(x1, z0, 3)], 0.6)
    # log pile + planks in front
    nb = {1: 3, 2: 3, 3: 4, 4: 4, 5: 5}[s]
    logs(c, 7.5 if s < 4 else 6, 94, nb, 1.35, 7)
    if s >= 2:
        c('<g stroke-width=".5">')
        planks_stack(c, x0 + 6, -6, 7, 2.6, 1.6 + 0.4 * s, 3 + s)
        c('</g>')
    c.ell(28, 95, 3, 0.7, "#f0d8a6", ' stroke="none" opacity=".8"')
    tufts(c, [(10, 97), (55, 96.5), (67, 90), (5, 85)])
    bush(c, 68, 86.5, 1.8)


# ------------------------------------------------------------- brickyard
def kiln(c, x, z, r, h, smoke=True, trim=None):
    cx, ty, by = cyl(c, x, z, r, 0, h * 0.35, "clay", tex=False)
    dome(c, cx, ty, r, h * 0.65, "clay", finial=False)
    # brick courses on the dome
    d = ""
    for k in (0.25, 0.5, 0.72):
        yy = ty - h * 0.65 * k
        rx = r * math.sqrt(1 - k * k)
        d += f"M{f(cx - rx)},{f(yy)}A{f(rx)},{f(rx * 0.42)} 0 0 0 {f(cx + rx)},{f(yy)}"
    c(f'<path d="{d}" fill="none" stroke="#7a4026" stroke-width=".3" opacity=".55"/>')
    # fire mouth
    mw = r * 0.42
    c.path(f"M{f(cx - mw)},{f(by + r * 0.3)}V{f(by - h * 0.22)}A{f(mw)},{f(mw)} 0 0 1 {f(cx + mw)},{f(by - h * 0.22)}V{f(by + r * 0.3)}Z",
           c.rg("fire", [(0, "#fff2a8"), (0.35, "#ffb340"), (0.75, "#c9471c"), (1, "#3a1608")], 0.5, 0.8, 0.7), ' stroke-width=".6"')
    c.path(f"M{f(cx - mw - 0.6)},{f(by + r * 0.3)}V{f(by - h * 0.22)}A{f(mw + 0.6)},{f(mw + 0.6)} 0 0 1 {f(cx + mw + 0.6)},{f(by - h * 0.22)}V{f(by + r * 0.3)}",
           "none", ' stroke="#8a4a2c" stroke-width=".9" stroke-opacity="1"')
    c.ell(cx, by + r * 0.45 + 0.6, mw * 1.8, 0.9, "#ffb340", f' stroke="none" opacity=".35" filter="{c.blur(0.7)}"')
    # chimney on top
    tx, tyy = cx + r * 0.1, ty - h * 0.6
    c(f'<rect x="{f(tx - 0.9)}" y="{f(tyy - 3)}" width="1.8" height="3.4" fill="{c.mat("brick", "c")}" stroke-width=".5"/>')
    if trim:
        c.lines([((tx - 1.1, tyy - 3), (tx + 1.1, tyy - 3))], trim, 0.7, 1)
    if smoke:
        puff(c, tx, tyy - 3)
    return cx, by


def brickstack(c, x, z, w=4, d=2.5, h=2.6):
    box(c, x, x + w, z, z + d, 0, h, "brick", tex="brick", top="brick", aof=0)


def shed(c, x0, x1, z0, z1, h, roof="thatch", trim=None):
    for x, z in ((x0, z1), (x1, z1)):
        a = P(x, z, 0)
        beam(c, a, (a[0], a[1] - h), 0.8)
    # drying racks with green bricks
    c('<g stroke-width=".45">')
    for k in range(3):
        hh = 0.6 + k * 1.9
        box(c, x0 + 0.6, x1 - 0.6, (z0 + z1) / 2 - 1, (z0 + z1) / 2 + 1, hh, hh + 1, "clay", tex="brick", top="clay", aof=0)
    c('</g>')
    for x, z in ((x0, z0), (x1, z0)):
        a = P(x, z, 0)
        beam(c, a, (a[0], a[1] - h), 0.8)
    gable_x(c, x0, x1, z0, z1, h, 3.5, roof, "wood", o=1, trim=trim)


def b_brickyard(c, s):
    ground(c, dirt=(34, 91.5, 22, 4.5))
    trim = GOLD if s == 5 else None
    bshadow(c, 16, 46, 10, 0.26)
    if s >= 3:  # second kiln behind left
        kiln(c, 14, 12, 4.6 + 0.3 * s, 10 + s, smoke=s >= 4)
    if s == 5:
        kiln(c, 52, 13, 4.4, 11, smoke=True)
    if s >= 2:  # drying shed (right)
        sx0 = 44 if s < 4 else 43
        shed(c, sx0, sx0 + (9 if s < 4 else 11), 2, 9, 7 + (s >= 4) * 1.5, "thatch" if s < 4 else "roofred", trim=trim)
        if s >= 4:
            flagpole(c, *P(sx0 + 5, 5.5, 13.4), 6, "red")
    r = {1: 8.4, 2: 9, 3: 9.4, 4: 9.8, 5: 10.2}[s]
    h = {1: 17, 2: 19, 3: 21.5, 4: 22, 5: 23}[s]
    kx = 29
    if s >= 3:  # stone ring base
        cyl(c, kx, 6, r + 1.2, 0, 1.4, "dstone", cap="stone")
        c.path(f"M{f(P(kx, 6)[0] - r - 1.2)},{f(P(kx, 6)[1] - 1.4)}A{f(r + 1.2)},{f((r + 1.2) * 0.45)} 0 0 0 {f(P(kx, 6)[0] + r + 1.2)},{f(P(kx, 6)[1] - 1.4)}",
               "none", ' stroke="#5f5444" stroke-width=".3" opacity=".5"')
    cx, by = kiln(c, kx, 6, r, h, smoke=True, trim=trim)
    if s >= 3:  # tall chimney
        cyl(c, kx + 6, 12, 1.4, 0, h + 6, "brick", tex=True, cap="dstone")
        puff(c, *P(kx + 6, 12, h + 6), 4)
        if trim:
            trim_line(c, [(P(kx + 6, 12)[0] - 1.4, P(kx + 6, 12, h + 6)[1]), (P(kx + 6, 12)[0] + 1.4, P(kx + 6, 12, h + 6)[1])], 0.8)
    if s == 5:
        flagpole(c, *P(kx - r + 1, 2, 8), 9, "gold", flip=True)
        lantern(c, *P(46, -4), 5)
    # brick stacks & clay pile in front
    c('<g stroke-width=".5">')
    stacks = [(8, -3, 4, 2.4, 2.6)]
    if s >= 2:
        stacks += [(42, -5.6, 4.4, 2.4, 2.4 + 0.3 * s)]
    if s >= 3:
        stacks += [(11, -6.6, 3.6, 2.2, 2)]
    if s >= 4:
        stacks += [(47, -3, 3.6, 2.2, 3)]
    for st in sorted(stacks, key=lambda t: -t[1]):
        brickstack(c, *st)
    c('</g>')
    c.path("M16,95.5Q18,90.5 21,90.8Q24,90.5 25.5,95.5Z", c.rg("claypile", [(0, "#d99a6c"), (0.7, "#a9643f"), (1, "#7a4026")], 0.4, 0.3, 0.8), ' stroke-width=".55"')
    tufts(c, [(5, 92), (56, 97), (68, 91), (6, 84)])
    if s < 5:
        bush(c, 64, 86.5, 1.8)



BUILDERS = {
    "residence": b_residence,
    "palace": b_palace,
    "treasury": b_treasury,
    "townhall": b_townhall,
    "heromansion": b_heromansion,
    "stonemason": b_stonemason,
    "brewery": b_brewery,
    "trapper": b_trapper,
    "sawmill": b_sawmill,
    "brickyard": b_brickyard,
}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for bid, fn in BUILDERS.items():
        if only and bid not in only:
            continue
        for s in range(1, 6):
            c = Ctx(f"c{bid[:4]}{s}")
            fn(c, s)
            name = f"{bid}.svg" if s == 1 else f"{bid}-{s}.svg"
            (OUT_DIR / name).write_text(c.svg())


if __name__ == "__main__":
    main()
