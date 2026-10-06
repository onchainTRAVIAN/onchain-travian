#!/usr/bin/env python3
"""Painterly hero art for Ancient Realms (original artwork, Travian-Legends-like look).

Writes, per tribe, five gear stages (stage 1 = hero levels 0-4 ... stage 5 = 20+):
  src/web/public/img/hero/{romans,teutons,gauls}-{1..5}.svg   viewBox 0 0 120 140
and 16x16 bust icons (stage-3 hero):
  src/web/public/img/units/hero-{romans,teutons,gauls}.svg

Technique: every body part is a smooth closed outline (Catmull-Rom -> cubic Bezier).
A part is painted with a lit->shade gradient, then -- clipped to its own outline -- a
blurred "form shadow" (the part minus a copy shifted towards the light) and a blurred
rim light (the part minus a copy shifted away from the light).  Light comes from the
top-left, so shadows fall to the bottom-right.  Only absolute M/L/C/Z path commands are
emitted, which lets shift() move a path by rewriting its number pairs.

usage: python3 scripts/art/painterly/heroes.py [--preview DIR]
"""
import math
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
HERO_DIR = os.path.join(ROOT, "src/web/public/img/hero")
UNIT_DIR = os.path.join(ROOT, "src/web/public/img/units")

OUTL = "#3b2a17"
SHADE = "#2a1608"
LIGHT = "#fff4d6"


# ---------------------------------------------------------------- geometry helpers
def f(v):
    s = f"{v:.1f}"
    if s == "-0.0":
        s = "0.0"
    return s[:-2] if s.endswith(".0") else s


def P(x, y):
    return f"{f(x)},{f(y)}"


def smooth(pts, closed=True, sharp=(), k=1.0):
    """Catmull-Rom spline through pts as absolute cubic path data.
    Indices in `sharp` become corners."""
    n = len(pts)
    if n < 2:
        return ""
    d = "M" + P(*pts[0])
    segs = n if closed else n - 1
    for i in range(segs):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        if i in sharp:
            p0 = p1
        if ((i + 1) % n) in sharp:
            p3 = p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k)
        d += "C" + P(*c1) + " " + P(*c2) + " " + P(*p2)
    if closed:
        d += "Z"
    return d


def S(*pts, sharp=(), k=1.0):
    return smooth(list(pts), True, sharp, k)


def O(*pts, k=1.0):
    return smooth(list(pts), False, (), k)


def L(*pts, closed=True):
    d = "M" + " L".join(P(*p) for p in pts)
    return d + ("Z" if closed else "")


def ell(cx, cy, rx, ry, rot=0):
    """Ellipse as 4 cubic arcs (absolute, shift-able)."""
    kk = 0.5523
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)

    def t(x, y):
        return (cx + x * ca - y * sa, cy + x * sa + y * ca)

    q = [(rx, 0), (0, ry), (-rx, 0), (0, -ry)]
    d = "M" + P(*t(*q[0]))
    for i in range(4):
        x1, y1 = q[(i + 1) % 4]
        if i == 0:
            c1, c2 = (rx, ry * kk), (rx * kk, ry)
        elif i == 1:
            c1, c2 = (-rx * kk, ry), (-rx, ry * kk)
        elif i == 2:
            c1, c2 = (-rx, -ry * kk), (-rx * kk, -ry)
        else:
            c1, c2 = (rx * kk, -ry), (rx, -ry * kk)
        d += "C" + P(*t(*c1)) + " " + P(*t(*c2)) + " " + P(*t(x1, y1))
    return d + "Z"


_num = re.compile(r"-?\d+(?:\.\d+)?")


def shift(d, dx, dy):
    """Translate absolute path data made of number pairs."""
    i = [0]

    def rep(m):
        v = float(m.group(0))
        v += dx if i[0] % 2 == 0 else dy
        i[0] += 1
        return f(v)

    return _num.sub(rep, d)


def _n(v):
    s = f(v)
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def _join(vals):
    out = ""
    for v in vals:
        t = _n(v)
        if out and not t.startswith("-") and not (t.startswith(".") and "." in out.split(",")[-1].split("-")[-1] and False):
            out += ","
        out += t
    return out


def compact(d):
    """Absolute M/L/C/Z path data -> shorter relative path data (same geometry, rounded to 0.1)."""
    toks = re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d)
    out = []
    cx = cy = sx = sy = 0.0
    i = 0
    first = True
    while i < len(toks):
        c = toks[i]
        i += 1
        if c == "Z":
            out.append("z")
            cx, cy = sx, sy
            continue
        n = {"M": 2, "L": 2, "C": 6}[c]
        vals = [float(v) for v in toks[i:i + n]]
        i += n
        xs = vals[0::2]
        ys = vals[1::2]
        rel = []
        for x, y in zip(xs, ys):
            rel += [round(x - cx, 1), round(y - cy, 1)]
        # track the rounded position so errors do not accumulate
        ex, ey = cx + rel[-2], cy + rel[-1]
        if c == "M":
            if first:
                out.append("M" + _join([round(xs[0], 1), round(ys[0], 1)]))
                ex, ey = round(xs[0], 1), round(ys[0], 1)
            else:
                out.append("m" + _join(rel))
            sx, sy = ex, ey
            first = False
        else:
            out.append(c.lower() + _join(rel))
        cx, cy = ex, ey
    # drop repeated command letters (implicit repetition)
    res = ""
    prev = ""
    for o in out:
        if o[0] in "lc" and o[0] == prev:
            body = o[1:]
            res += body if body.startswith("-") else "," + body
        else:
            res += o
        prev = o[0]
    return res


def bbox(d):
    nums = [float(v) for v in _num.findall(d)]
    xs, ys = nums[0::2], nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def limb(a, b, wa, wb, bulge=0.0, bias=0.5):
    """Tapered limb outline from joint a (width wa) to joint b (width wb).
    bulge widens the middle (muscle), bias moves the bulge along the limb."""
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    ln = math.hypot(dx, dy) or 1
    nx, ny = -dy / ln, dx / ln
    m = lerp(a, b, bias)
    wm = (wa + wb) / 2 + bulge
    p = [
        (ax + nx * wa / 2, ay + ny * wa / 2),
        (m[0] + nx * wm / 2, m[1] + ny * wm / 2),
        (bx + nx * wb / 2, by + ny * wb / 2),
        (bx + dx / ln * wb * 0.45, by + dy / ln * wb * 0.45),
        (bx - nx * wb / 2, by - ny * wb / 2),
        (m[0] - nx * wm / 2, m[1] - ny * wm / 2),
        (ax - nx * wa / 2, ay - ny * wa / 2),
        (ax - dx / ln * wa * 0.45, ay - dy / ln * wa * 0.45),
    ]
    return smooth(p, True)


# ---------------------------------------------------------------- painter
class Art:
    def __init__(self, prefix):
        self.px = prefix
        self.defs = []
        self.body = []
        self.n = 0
        self.mats = {}
        self.scale = 1.0
        self.defs.append(
            f'<filter id="{prefix}b" x="-30%" y="-30%" width="160%" height="160%">'
            f'<feGaussianBlur stdDeviation="1.1"/></filter>'
            f'<filter id="{prefix}B" x="-50%" y="-50%" width="200%" height="200%">'
            f'<feGaussianBlur stdDeviation="2.4"/></filter>'
            f'<filter id="{prefix}s" x="-10%" y="-10%" width="120%" height="120%">'
            f'<feGaussianBlur stdDeviation="0.5"/></filter>'
        )

    def id(self):
        self.n += 1
        return f"{self.px}{self.n}"

    # gradients ---------------------------------------------------------
    def lin(self, stops, x1=0, y1=0, x2=1, y2=1, key=None):
        key = key or ("L", tuple(stops), x1, y1, x2, y2)
        if key in self.mats:
            return self.mats[key]
        gid = self.id()
        st = "".join(
            f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else "") + "/>"
            for o, c, a in [(s + (1,))[:3] for s in stops]
        )
        self.defs.append(f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{st}</linearGradient>')
        self.mats[key] = f"url(#{gid})"
        return self.mats[key]

    def rad(self, stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None, key=None):
        key = key or ("R", tuple(stops), cx, cy, r, fx, fy)
        if key in self.mats:
            return self.mats[key]
        gid = self.id()
        st = "".join(
            f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else "") + "/>"
            for o, c, a in [(s + (1,))[:3] for s in stops]
        )
        fo = (f' fx="{fx}"' if fx is not None else "") + (f' fy="{fy}"' if fy is not None else "")
        self.defs.append(f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="{r}"{fo}>{st}</radialGradient>')
        self.mats[key] = f"url(#{gid})"
        return self.mats[key]

    def mat(self, name):
        m = MATS[name]
        if m[0] == "r":
            return self.rad(m[1], *m[2:], key=name)
        return self.lin(m[1], *m[2:], key=name)

    # painting ----------------------------------------------------------
    def shader(self, off, shade, light, blur):
        """Filter that paints a soft form shadow (bottom-right) and rim light (top-left)
        inside the element's own alpha -- no extra copies of the geometry needed.
        Quantised to a handful of variants to keep the file small."""
        off = 3.0 if (blur == "B" or off >= 2.6) else (1.8 if off >= 1.3 else 1.0)
        light = 0.3 if light > 0 else 0
        shade = 0.45 if shade > 0 else 0
        key = ("F", off, shade, light)
        if key in self.mats:
            return self.mats[key]
        sd = {1.0: 0.6, 1.8: 1.1, 3.0: 2.0}[off]
        fid = self.id()
        fx = [f'<filter id="{fid}" filterUnits="userSpaceOnUse" x="-5" y="-5" width="130" height="150">']
        merge = '<feMergeNode in="SourceGraphic"/>'
        if light:  # keep the rim light off the outline: confine it to the alpha moved inwards
            fx.append('<feOffset in="SourceAlpha" dx="1" dy="1" result="k"/>')
        for nm, dx, dy, col, opv in (("s", -off, -off * 0.9, SHADE, shade), ("l", off * 0.8, off, LIGHT, light)):
            if not opv:
                continue
            fx.append(f'<feOffset in="SourceAlpha" dx="{_n(dx)}" dy="{_n(dy)}" result="{nm}0"/>'
                      f'<feComposite in="SourceAlpha" in2="{nm}0" operator="out"/>'
                      f'<feGaussianBlur stdDeviation="{_n(sd)}" result="{nm}1"/>'
                      f'<feFlood flood-color="{col}" flood-opacity="{_n(opv)}"/>'
                      f'<feComposite in2="{nm}1" operator="in"/>'
                      f'<feComposite in2="{"SourceAlpha" if nm == "s" else "k"}" operator="in" result="{nm}"/>')
            merge += f'<feMergeNode in="{nm}"/>'
        fx.append(f'<feMerge>{merge}</feMerge></filter>')
        self.defs.append("".join(fx))
        self.mats[key] = f"url(#{fid})"
        return self.mats[key]

    def part(self, d, mat, shade=0.42, light=0.3, off=2.0, sw=1.0, inner=(), outline=True, blur="b", op=None):
        """Paint a closed shape with gradient + soft form shading (filter based)."""
        fill = self.mat(mat) if mat in MATS else mat
        st = (f' stroke-width="{f(sw)}"' if sw != 1 else "") if outline else ' stroke="none"'
        o = f' opacity="{op}"' if op is not None else ""
        x0, y0, x1, y1 = bbox(d)
        area = (x1 - x0) * (y1 - y0)
        if area < 30:
            shade = light = 0
        flt = f' filter="{self.shader(off, shade, light, blur)}"' if (shade or light) else ""
        if not inner:
            self.body.append(f'<path d="{d}" fill="{fill}"{st}{o}{flt}/>')
            return
        cid = self.id()
        self.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
        self.body.append(f'<g{flt}{o}><path d="{d}" fill="{fill}"{st}/><g clip-path="url(#{cid})">{"".join(inner)}</g></g>')

    def flat(self, d, fill, sw=None, op=None, extra=""):
        fill = self.mat(fill) if fill in MATS else fill
        st = (f' stroke-width="{f(sw)}"' if sw != 1 else "") if sw else ' stroke="none"'
        o = f' opacity="{op}"' if op is not None else ""
        self.body.append(f'<path d="{d}" fill="{fill}"{st}{o}{extra}/>')

    def line(self, d, color, w, op=1, cap="round", blur=None):
        fl = f' filter="url(#{self.px}{blur})"' if blur else ""
        c = "" if cap == "round" else f' stroke-linecap="{cap}"'
        self.body.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(w) if w >= 0.1 else w}" stroke-opacity="{op}"{c}{fl}/>')

    def soft(self, d, color, op=0.5, blur="B"):
        self.body.append(f'<path d="{d}" fill="{color}" fill-opacity="{op}" stroke="none" filter="url(#{self.px}{blur})"/>')

    def raw(self, s):
        self.body.append(s)

    def glow(self, cx, cy, rx, ry, color, op=0.8, rot=0):
        g = self.rad([(0, color, op), (0.55, color, op * 0.45), (1, color, 0)], key=("glow", color, op))
        self.body.append(f'<path d="{ell(cx, cy, rx, ry, rot)}" fill="{g}" stroke="none" filter="url(#{self.px}B)"/>')

    def _tf(self):
        # stage 4-5 figures are drawn a touch smaller (anchored at the feet) so tall
        # crests / wings clear the crown ornament on the stage 4-5 portrait frames
        if self.scale == 1:
            return ""
        return f' transform="translate(60 128.6) scale({self.scale}) translate(-60 -128.6)"'

    def svg(self, vb="0 0 120 140"):
        out = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">'
               f'<defs>{"".join(self.defs)}</defs><g{self._tf()} stroke="{OUTL}" stroke-opacity=".75" stroke-linejoin="round" stroke-linecap="round">{"".join(self.body)}</g></svg>')
        return re.sub(r' d="([^"]*)"', lambda m: f' d="{compact(m.group(1))}"', out)


def T(x1, y1, x2, y2):
    return (x1, y1, x2, y2)


# material: (kind, stops, x1, y1, x2, y2) — lit (top-left) -> shade (bottom-right)
MATS = {
    "skin": ("l", [(0, "#f6d2ab"), (0.55, "#e2a97d"), (1, "#b47a52")], 0, 0, 1, 1),
    "skin2": ("l", [(0, "#efc49b"), (0.6, "#d39a6f"), (1, "#a56d48")], 0, 0, 1, 1),
    "red": ("l", [(0, "#d4544a"), (0.5, "#a8302c"), (1, "#6e1a1c")], 0, 0, 1, 1),
    "redd": ("l", [(0, "#9c2a28"), (1, "#5a1416")], 0, 0, 1, 1),
    "crimson": ("l", [(0, "#e2504a"), (0.45, "#b42530"), (1, "#5e0c1a")], 0, 0, 1, 1),
    "steel": ("l", [(0, "#f6f8f6"), (0.35, "#c9d0d2"), (0.7, "#97a2a8"), (1, "#66727a")], 0, 0, 1, 1),
    "iron": ("l", [(0, "#b8bec0"), (0.45, "#7f888c"), (1, "#454c52")], 0, 0, 1, 1),
    "gold": ("l", [(0, "#fff3bf"), (0.35, "#f2c95a"), (0.75, "#c48a2a"), (1, "#8a5718")], 0, 0, 1, 1),
    "bronze": ("l", [(0, "#f6d39a"), (0.4, "#cf9550"), (0.8, "#99602c"), (1, "#6a3f1c")], 0, 0, 1, 1),
    "leather": ("l", [(0, "#bd8a58"), (0.55, "#8d5f36"), (1, "#5e3b1f")], 0, 0, 1, 1),
    "dleather": ("l", [(0, "#8a6040"), (1, "#3f2716")], 0, 0, 1, 1),
    "wool": ("l", [(0, "#d9c7a0"), (0.55, "#b39c74"), (1, "#7d6648")], 0, 0, 1, 1),
    "linen": ("l", [(0, "#f6efdc"), (0.6, "#d9ccae"), (1, "#a9977a")], 0, 0, 1, 1),
    "fur": ("l", [(0, "#b49268"), (0.5, "#86663f"), (1, "#4e3a24")], 0, 0, 1, 1),
    "bear": ("l", [(0, "#8a6a48"), (0.5, "#5c4229"), (1, "#2e2015")], 0, 0, 1, 1),
    "blue": ("l", [(0, "#7da2c4"), (0.5, "#4a6d94"), (1, "#26395a")], 0, 0, 1, 1),
    "blued": ("l", [(0, "#4d6a8c"), (1, "#1f2d46")], 0, 0, 1, 1),
    "green": ("l", [(0, "#8cbc6a"), (0.5, "#4f8a3e"), (1, "#244a22")], 0, 0, 1, 1),
    "greend": ("l", [(0, "#3f7034"), (1, "#173419")], 0, 0, 1, 1),
    "check": ("l", [(0, "#c9a85e"), (0.5, "#9a7a3a"), (1, "#5e4a22")], 0, 0, 1, 1),
    "wood": ("l", [(0, "#c99a5e"), (0.5, "#8f6235"), (1, "#5a3a1c")], 0, 0, 1, 0),
    "hairb": ("l", [(0, "#6a4a2c"), (1, "#2c1c10")], 0, 0, 1, 1),
    "hairr": ("l", [(0, "#d48a44"), (0.5, "#a85a24"), (1, "#5e2e12")], 0, 0, 1, 1),
    "hairy": ("l", [(0, "#f0d08a"), (0.5, "#c99a4c"), (1, "#7a5524")], 0, 0, 1, 1),
    "blade": ("l", [(0, "#ffffff"), (0.45, "#d6dde0"), (0.55, "#9aa6ae"), (1, "#6a7880")], 0, 0, 1, 0),
    "white": ("l", [(0, "#ffffff"), (1, "#c9c4b4")], 0, 0, 1, 1),
    "plume": ("l", [(0, "#e45a48"), (0.5, "#b82e2a"), (1, "#701618")], 0, 0, 1, 1),
    "feather": ("l", [(0, "#ffffff"), (0.6, "#e6e0d0"), (1, "#a9a090")], 0, 0, 1, 1),
    "horn": ("l", [(0, "#fbf0d4"), (0.5, "#d9c39a"), (1, "#8a6e46")], 0, 0, 1, 1),
    "laurel": ("l", [(0, "#c8d07a"), (0.5, "#6e9a3c"), (1, "#3a5a20")], 0, 0, 1, 1),
}


# ---------------------------------------------------------------- shared body bits
def tp(pts, cx, cy, s=1.0, flip=False):
    return [((-x if flip else x) * s + cx, y * s + cy) for x, y in pts]


FACE = [(0, -8.6), (5.8, -7), (8, -1), (7, 4.6), (4.2, 8.6), (-1.6, 10.2), (-4.4, 9.2), (-5.6, 6.8),
        (-6, 4.6), (-7.6, 3.2), (-7, 1.6), (-6.4, -0.8), (-6.6, -3), (-5.6, -6.6)]


def head(a, cx, cy, s=1.0, skin="skin", beard=None, beard_mat=None, brow=0.0, mouth="firm", ear=True,
         stubble=False, mustache=None):
    """3/4 face looking to the viewer's left. Returns local->global point mapper."""
    def g(x, y):
        return (cx + x * s, cy + y * s)

    face = S(*[g(*p) for p in FACE], sharp=(9,))
    a.part(face, skin, shade=0.38, light=0.35, off=1.6 * s)
    # cheek warmth + eye socket shadow
    a.soft(ell(*g(-1.6, 3.6), 2.6 * s, 1.8 * s), "#d0584a", 0.28, "b")
    a.soft(ell(*g(-3.6, -0.8), 3 * s, 1.3 * s), "#6a3a22", 0.35, "s")
    if ear:
        a.part(ell(*g(4.8, 1.2), 1.6 * s, 2.4 * s, 8), skin, shade=0.3, light=0, off=0.8, sw=0.7)
        a.line(O(g(4.6, 0), g(5.2, 1.2), g(4.6, 2.4)), "#8a4a30", 0.45, 0.7)
    if stubble:
        a.soft(S(g(-5.4, 5), g(-2, 6.2), g(3.6, 6.4), g(3.4, 8.8), g(-1.6, 10), g(-4.6, 8.8)), "#5a3a2a", 0.28, "s")
    # eyes (near + far), brows
    a.flat(ell(*g(-2.4, -0.4), 1.15 * s, 0.75 * s), "#fbf4e8")
    a.flat(ell(*g(-2.8, -0.35), 0.62 * s, 0.68 * s), "#2a1c12")
    a.flat(ell(*g(-5.55, -0.3), 0.55 * s, 0.6 * s, 10), "#2a1c12")
    a.line(O(g(-4, -1.1), g(-2.4, -1.4), g(-0.9, -0.7)), "#3a2414", 0.5 * s, 0.85)
    a.line(O(g(-0.6, -2.4 - brow), g(-2.4, -3.0 - brow), g(-4.2, -2.3)), "#3a2414", 0.95 * s, 0.9)
    a.line(O(g(-5.1, -2.2), g(-6.1, -2.5 - brow * 0.6)), "#3a2414", 0.75 * s, 0.85)
    # nose shading + nostril
    a.line(O(g(-5.3, -0.2), g(-5.6, 1.6), g(-6.0, 2.8)), "#9a5a3c", 0.55 * s, 0.6)
    a.line(O(g(-6.2, 3.4), g(-5.2, 3.6)), "#6a3622", 0.5 * s, 0.75)
    if mustache:
        a.part(S(g(-6.3, 3.9), g(-4, 3.6), g(-1.6, 4.4), g(-0.8, 6.2), g(-2.4, 5.4), g(-4.6, 5), g(-6.5, 6.2)),
               mustache, shade=0.3, light=0.2, off=0.6, sw=0.6)
    if mouth == "firm":
        a.line(O(g(-5.3, 5.6), g(-4, 5.75), g(-2.6, 5.5)), "#5a2a1c", 0.65 * s, 0.85)
    elif mouth == "shout":
        a.flat(S(g(-5.4, 5.2), g(-3, 5.0), g(-2.8, 6.6), g(-4.6, 7.2)), "#4a1a14", sw=0.5)
    if beard:
        a.part(S(*[g(*p) for p in beard]), beard_mat, shade=0.4, light=0.25, off=1.2, sw=0.9,
               inner=[f'<path d="{O(g(-3.6, 7), g(-3, 11), g(-2.2, 14))}{O(g(-0.4, 7.6), g(0.4, 11.6), g(0.6, 14))}{O(g(2.6, 7), g(3.4, 10))}" fill="none" stroke="#2a1a0c" stroke-opacity=".35" stroke-width=".5"/>'])
        if mustache is None:
            a.part(S(g(-6.3, 3.9), g(-4, 3.6), g(-1.4, 4.4), g(-0.4, 6.6), g(-2.4, 5.6), g(-4.6, 5.2), g(-6.6, 6.4)),
                   beard_mat, shade=0.3, light=0.2, off=0.6, sw=0.6)
            a.line(O(g(-5.2, 6.4), g(-3.8, 6.6), g(-2.8, 6.3)), "#5a2a1c", 0.55 * s, 0.7)
    return g


def shadow(a, cx=64, cy=128, rx=31, ry=4.6):
    a.soft(ell(cx, cy, rx, ry), "#2a1a0a", 0.32, "B")
    a.soft(ell(cx - 2, cy - 0.3, rx * 0.62, ry * 0.6), "#2a1a0a", 0.22, "b")


def leg(a, hip, knee, ankle, wt, wk, wa, mat, crease=True, inner=(), bulge=(2.4, 1.8)):
    """Calf first, thigh over it: the thigh's rounded end reads as the knee."""
    a.part(limb(knee, ankle, wk, wa, bulge[0], 0.28), mat, shade=0.45, light=0.28, off=1.6, inner=inner)
    a.part(limb(hip, knee, wt, wk, bulge[1], 0.3), mat, shade=0.45, light=0.28, off=1.8, inner=inner)
    if crease:
        kx, ky = knee
        a.line(O((kx - 1.6, ky + 1.6), (kx, ky + 2.6), (kx + 1.8, ky + 1.8)), "#9a5a3c", 0.5, 0.55)


def sandal(a, heel, toe, mat="leather", straps=3, boot=False, bmat="dleather", wrap=None):
    """Foot seen from the side-front, toe pointing to the left."""
    hx, hy = heel
    tx, ty = toe
    foot = S((tx - 0.4, ty - 0.6), (tx + 1.6, ty - 2.6), (tx + (hx - tx) * 0.5, ty - 3.9), (hx - 3.2, hy - 6.6),
             (hx + 0.8, hy - 6.6), (hx + 1.6, hy - 2.2), (hx + 0.4, hy + 0.2), (tx + 1.4, ty + 0.3))
    if boot:
        a.part(foot, bmat, shade=0.45, light=0.3, off=1.2)
        a.line(O((tx + 0.6, ty + 0.1), (hx + 0.6, hy + 0.1)), "#1e1208", 1.1, 0.85)
        if wrap:
            a.line(O((hx - 3, hy - 5.6), (hx + 1.2, hy - 4.2)) + O((tx + 4, ty - 3.2), (tx + 6, ty - 0.6)), wrap, 0.7, 0.9)
        return
    a.part(foot, "skin2", shade=0.4, light=0.3, off=1.1)
    a.line(O((tx + 0.2, ty + 0.2), (hx + 0.8, hy + 0.3)), "#4a2e18", 1.1, 0.95)
    a.line(O((tx + 0.6, ty - 1.4), (tx + 1.4, ty - 0.6)) + O((tx + 1.6, ty - 2.1), (tx + 2.6, ty - 1.0)), "#9a5a3c", 0.4, 0.8)
    d = ""
    for i in range(straps):
        t = (i + 1.2) / (straps + 1)
        x = tx + (hx - tx) * t
        y = ty + (hy - ty) * t
        d += O((x - 1.4, y), (x + 0.2, y - 2.6 - t * 2.2), (x + 1.2, y - 3.6 - t * 2.6))
    d += O((hx - 3.2, hy - 6.2), (hx - 1, hy - 5.2), (hx + 1.1, hy - 6))
    a.line(d, "#5a3418", 0.9, 0.95)


# ---------------------------------------------------------------- ROMANS
def romans(st):
    a = Art(f"hr{st}")
    a.scale = {4: 0.97, 5: 0.95}.get(st, 1)
    gold_armour = st >= 5
    cape_mat = "crimson" if st >= 5 else "red"
    trim = "gold" if st >= 4 else "bronze"
    # --- standard pole (stage 5) behind everything
    shadow(a, 64, 128.5, 32 if st < 4 else 36)
    # --- cape, back part -------------------------------------------------
    if st == 1:
        cape = S((50, 35), (70, 33.4), (84, 37), (95, 43), (99, 50), (92, 56), (84, 62), (74, 66), (62, 66), (52, 60), sharp=(4,))
    elif st == 2:
        cape = S((50, 35), (70, 33.4), (86, 37), (98, 45), (103, 56), (96, 64), (88, 74), (76, 80), (64, 76), (52, 64), sharp=(4,))
    elif st == 3:
        cape = S((48, 35), (70, 33), (88, 40), (100, 52), (106, 72), (104, 94), (94, 92), (82, 98), (66, 90), (52, 70), sharp=(5,))
    elif st == 4:
        cape = S((46, 35), (70, 33), (86, 44), (97, 64), (105, 94), (108, 118), (98, 116), (88, 122), (74, 116), (60, 100), (48, 74), sharp=(5,))
    else:
        cape = S((44, 35), (70, 32), (90, 40), (102, 56), (109, 82), (112, 112), (106, 108), (101, 118), (92, 113), (82, 124), (66, 110), (52, 86), (44, 66), sharp=(5, 7))
    reach = {1: 0.35, 2: 0.55, 3: 0.75, 4: 1.0, 5: 1.08}[st]

    def fold(x0, y0, x1, y1, bend):
        return O((x0, y0), (x0 + (x1 - x0) * 0.5 + bend, y0 + (y1 - y0) * 0.5), (x1, y1))

    dark = "".join(fold(64 + i * 6, 40, 70 + i * 11, 40 + 80 * reach, 3) for i in range(4))
    lite = "".join(fold(67 + i * 6, 40, 75 + i * 11, 40 + 78 * reach, 3) for i in range(4))
    folds = [f'<path d="{dark}" fill="none" stroke="#3a0408" stroke-opacity=".4" stroke-width="2.2" filter="url(#{a.px}b)"/>',
             f'<path d="{lite}" fill="none" stroke="#ffc0a8" stroke-opacity=".28" stroke-width="1.4" filter="url(#{a.px}b)"/>']
    a.part(cape, cape_mat, shade=0.45, light=0.25, off=3, inner=folds)
    if st >= 4:  # gold hem
        hem = {4: O((108, 118), (98, 116), (88, 122), (74, 116)), 5: O((112, 112), (106, 108), (101, 118), (92, 113), (82, 124), (66, 110))}[st]
        a.line(hem, "#e9b84a", 1.3, 0.95)
    # --- legs (far = striding forward on the viewer's left) ---------------
    gm = "gold" if st >= 4 else ("bronze" if st == 3 else "steel")
    leg(a, (50.5, 70), (43, 97), (38.8, 121.5), 13, 8.2, 4.8, "skin2")
    if st >= 2:  # greave
        a.part(S((39.4, 99.2), (46.4, 100.2), (44.4, 112), (42.2, 119.4), (38.4, 119), (37.6, 108)), gm, shade=0.4, light=0.4, off=1.2, sw=0.8)
    sandal(a, (41.5, 126.6), (30, 127.4))
    leg(a, (63.5, 71), (66.5, 99), (70, 122.4), 13.6, 8.6, 5.0, "skin")
    if st >= 2:
        a.part(S((62.6, 100.4), (70, 100), (71.8, 110), (72, 120.4), (67.4, 120.8), (64.2, 110)), gm, shade=0.4, light=0.45, off=1.2, sw=0.8,
               inner=[f'<path d="{O((64.4, 102), (66.2, 112), (67.4, 119))}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>'])
        if st >= 4:
            a.line(O((62.8, 100.4), (66.4, 99.4), (69.8, 100)), "#fff0b0", 0.8, 0.9)
    sandal(a, (73, 127.6), (61, 128.6))
    # --- far arm: upper (behind torso) ------------------------------------
    a.part(limb((47, 40), (37, 52), 10, 7.6, 1.6), "skin2", shade=0.4, light=0.25, off=1.6)
    # --- tunic skirt -------------------------------------------------------
    a.part(S((47, 58), (68, 58), (71, 70), (74, 81), (66, 83.5), (58, 81.5), (50, 83.5), (43, 80), (45, 70), sharp=(0, 1)),
           "red", shade=0.45, light=0.25, off=2,
           inner=[f'<path d="{O((52, 66), (51, 82))}{O((60, 66), (59.5, 81))}{O((67, 66), (68.5, 82))}" fill="none" stroke="#4a0e10" stroke-opacity=".45" stroke-width="1"/>'])
    # --- pteruges (leather strips) -----------------------------------------
    if st >= 3:
        pm = "gold" if st >= 5 else "leather"
        xs = [47.5, 51.5, 55.5, 59.5, 63.5, 67.5]
        for i, x in enumerate(xs):
            d = S((x, 62), (x + 3.8, 62), (x + 4.0 + (i - 2.5) * 0.3, 73.5), (x + 0.2 + (i - 2.5) * 0.3, 73.5), sharp=(0, 1, 2, 3))
            a.part(d, pm, shade=0.3, light=0.25, off=1, sw=0.7)
            a.line(O((x + 0.3 + (i - 2.5) * 0.3, 72.2), (x + 3.7 + (i - 2.5) * 0.3, 72.2)), "#f2c95a" if st >= 4 else "#d9b07a", 0.8, 0.9)
    elif st == 2:
        for i, x in enumerate([50, 54.5, 59, 63.5]):
            a.part(L((x, 62), (x + 2.6, 62), (x + 2.8, 74), (x + 0.2, 74)), "leather", shade=0.25, light=0, sw=0.6)
            for y in (66, 70):
                a.flat(ell(x + 1.4, y, 0.8, 0.8), "bronze")
    # --- torso ---------------------------------------------------------------
    torso = S((50.5, 33.5), (45, 36.8), (44.6, 46), (46.6, 54), (47.6, 63.5), (68, 63.5), (69.8, 54), (71.4, 45), (69.6, 36.6), (60.5, 33.5), sharp=(4, 5))
    if st == 1:  # chain mail
        a.part(torso, "steel", shade=0.5, light=0.35, off=2.4,
               inner=[f'<path d="' + "".join(O((44, y), (58, y + 1.2), (72, y)) for y in range(38, 64, 2)) +
                      f'" fill="none" stroke="#4a5258" stroke-opacity=".45" stroke-width=".55" stroke-dasharray="1 .7"/>'])
        a.line(O((50.5, 33.8), (55.5, 37), (60.5, 33.8)), "#5a6268", 1.2, 0.8)
        a.part(S((44.4, 36.4), (51, 35.2), (52.6, 42), (46, 44.4), (43, 42)), "steel", shade=0.4, light=0.3, off=1.2, sw=0.8)
        a.part(S((62, 35.6), (70.4, 36.2), (72.6, 42.6), (68, 44.6), (61.8, 41.4)), "steel", shade=0.4, light=0.3, off=1.2, sw=0.8)
    elif st == 2:  # lorica segmentata
        a.part(torso, "steel", shade=0.5, light=0.4, off=2.4)
        for i, y in enumerate([46, 50.5, 55, 59.5]):
            a.part(S((45.4, y - 0.2), (58, y + 1.2), (70.6, y - 0.4), (70.2, y + 4.2), (58, y + 5.6), (46.4, y + 4.4), sharp=(0, 2, 3, 5)),
                   "steel", shade=0.35, light=0.45, off=1, sw=0.75)
        a.part(S((49.8, 37.6), (66, 37.6), (68.6, 46), (58, 47.4), (47, 46), sharp=(0, 1)), "steel", shade=0.3, light=0.45, off=1, sw=0.75)
        for x, y in ((52, 40.5), (64, 40.5), (58, 44)):
            a.flat(ell(x, y, 0.8, 0.8), "gold")
        # shoulder plates
        for dx, sx in ((0, 1), (1, -1)):
            pass
        a.part(S((43, 36), (51.5, 34.6), (53, 39.4), (46, 42.4), (42.6, 41)), "steel", shade=0.4, light=0.4, off=1, sw=0.8)
        a.part(S((44.2, 40.6), (51.6, 39), (52.4, 43), (46, 46), (43.4, 45)), "steel", shade=0.4, light=0.35, off=1, sw=0.8)
        a.part(S((61.6, 35.4), (70.4, 36), (72.8, 41.4), (67.2, 42.6), (61.2, 39.6)), "steel", shade=0.4, light=0.4, off=1, sw=0.8)
        a.part(S((63.4, 39.6), (71.2, 40.6), (73, 45.6), (68.4, 46.6), (62.8, 43.6)), "steel", shade=0.4, light=0.35, off=1, sw=0.8)
    else:  # muscle cuirass
        cm = "gold" if gold_armour else "steel"
        musc = (f'<path d="{O((47.6, 44.2), (52, 47.6), (56.4, 45.6))}{O((57.6, 45.6), (63.6, 47.8), (69.4, 44.4))}'
                f'{O((56.8, 37), (56.6, 47), (57.4, 61))}{O((50.6, 51.6), (53.6, 52.4), (56.4, 51.6))}{O((58, 51.6), (62.6, 52.6), (67, 51.4))}'
                f'{O((50.2, 56.6), (53.4, 57.4), (56.4, 56.6))}{O((58, 56.6), (62.6, 57.6), (67, 56.4))}" fill="none" stroke="{"#7a4a14" if gold_armour else "#56616a"}" stroke-opacity=".7" stroke-width=".8"/>'
                f'<path d="{O((48.6, 42), (52, 44.2), (55, 43.2))}{O((59, 43), (63.4, 44.6), (67, 42.4))}{O((51.6, 50.2), (54.6, 50.2))}{O((51.4, 55.2), (54.4, 55.4))}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".7"/>')
        a.part(torso, cm, shade=0.5, light=0.45, off=2.6, inner=[musc])
        if st >= 4:
            a.line(O((45, 36.8), (44.6, 46), (46.6, 54), (47.6, 63.2)), "#f6d27a", 1.0, 0.9)
            a.line(O((50.8, 33.9), (55.5, 36.4), (60.2, 33.9)), "#ffe7a0", 1.3, 0.95)
            a.line(L((47.8, 62.6), (67.8, 62.6), closed=False), "#e2b44a", 1.6)
            if st == 4:  # gorgon-style medallion
                a.part(ell(56.6, 41.4, 2.6, 2.6), "gold", shade=0.3, light=0.4, off=0.8, sw=0.7)
                a.flat(ell(56.6, 41.4, 1.1, 1.1), "#b8352e")
            else:  # eagle motif on chest
                eagle = S((56.6, 38.2), (58, 40.4), (63.8, 38.4), (61.6, 42.6), (58, 43.4), (57.6, 46.6), (55.6, 46.6), (55.2, 43.4), (51.6, 42.6), (49.4, 38.4), (55.2, 40.4), sharp=(2, 9))
                a.part(eagle, "#8a5718", shade=0, light=0.4, off=0.8, sw=0.5)
                a.line(O((52.4, 40.6), (54.6, 41.6)), "#fff3bf", 0.5)
                a.line(O((60.8, 40.6), (58.6, 41.6)), "#fff3bf", 0.5)
        # shoulder guards
        pm = "gold" if st >= 4 else "steel"
        a.part(S((42.4, 36.4), (51, 34.2), (53, 39.6), (47.4, 43.6), (42, 42)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
        a.part(S((61, 35), (70.6, 35.6), (73.6, 41.6), (68.4, 44), (61.6, 40)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
        if st == 3:
            a.line(O((42.8, 41.6), (47.4, 43.2), (52.6, 39.8)), "#c48a2a", 0.8)
            a.line(O((62, 40), (68.4, 43.6), (73.2, 41.4)), "#c48a2a", 0.8)
    # --- belt -------------------------------------------------------------------
    if st <= 2:
        a.part(L((46.8, 59.8), (69.4, 59.8), (69.4, 63.4), (46.8, 63.4)), "leather", shade=0.3, light=0.2, off=0.8, sw=0.8)
        for x in range(49, 69, 4):
            a.flat(L((x, 60.3), (x + 2.6, 60.3), (x + 2.6, 62.9), (x, 62.9)), "bronze" if st == 1 else "steel")
    elif st >= 4:  # sash (cinctorium)
        a.part(S((47, 59), (69, 58.6), (69.6, 62.4), (58, 63.2), (46.6, 62.6)), "crimson" if st >= 5 else "red", shade=0.3, light=0.3, off=0.8, sw=0.8)
        a.part(S((54.2, 60.6), (57, 60.4), (58.6, 64), (56.8, 69.6), (55, 69.4), (55.6, 64)), "crimson" if st >= 5 else "red", shade=0.3, light=0.2, off=0.7, sw=0.7)
    # --- neck + head ---------------------------------------------------------------
    a.part(limb((56.6, 28), (57, 35.4), 6.8, 7.4), "skin", shade=0.5, light=0.2, off=1.4)
    if st >= 3:  # focale (neck scarf)
        a.part(S((50.4, 33.6), (55.6, 32.6), (61, 33.4), (59.8, 36.4), (55.4, 37.2), (51, 36)), "linen", shade=0.35, light=0.3, off=0.8, sw=0.8)
    g = head(a, 55, 22.4, 0.95, "skin", stubble=st <= 2)
    # --- helmet (galea) ------------------------------------------------------------
    hm = "gold" if st >= 5 else ("steel" if st <= 3 else "steel")
    bowl = S(g(-6.8, -3.2), g(-6.4, -7.6), g(-1.6, -11.6), g(4.4, -11), g(8.8, -6.4), g(9.8, -1), g(8.8, 1.4), g(3.6, -2.2), g(-2.6, -3.4), sharp=(0, 6))
    a.part(bowl, hm, shade=0.5, light=0.55, off=1.8,
           inner=[f'<path d="{O(g(-4.4, -6.6), g(-1, -9.6), g(3.2, -9.8))}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1"/>'])
    # brim / brow band
    a.part(S(g(-7.6, -2.6), g(-2.4, -4.2), g(4, -3.4), g(9.6, -0.6), g(9.4, 0.8), g(4, -1.4), g(-2.2, -2.2), g(-7.6, -1.2), sharp=(0, 3, 4, 7)),
           trim if st >= 2 else "bronze", shade=0.3, light=0.4, off=0.6, sw=0.7)
    # neck guard
    a.part(S(g(7.6, 0.4), g(10.2, -0.8), g(12.4, 3.8), g(10.4, 4.6), g(7.8, 3.6)), hm, shade=0.4, light=0.3, off=0.8, sw=0.8)
    # cheek guard
    cg = "gold" if st >= 4 else ("bronze" if st == 3 else "steel")
    a.part(S(g(1.2, -2.4), g(4.8, -1.8), g(5, 4.4), g(2.8, 8.6), g(0.6, 7.2), g(0.8, 2)), cg, shade=0.4, light=0.4, off=0.8, sw=0.8)
    a.flat(ell(*g(3, 2), 0.6, 0.6), "#6a4a20")
    if st >= 5:  # laurel wreath around the helmet
        for i in range(6):
            t = i / 5
            x, y = g(-5.6 + t * 13.6, -3.6 + t * 1.6 - math.sin(t * math.pi) * 1.2)
            a.flat(ell(x, y - 0.9, 1.7, 0.75, -30 + i * 4), "laurel", sw=0.4)
            a.flat(ell(x + 0.6, y + 0.5, 1.6, 0.7, 25), "laurel", sw=0.4)
    # crest
    if st == 1:
        a.part(ell(*g(1.4, -11.8), 1.2, 1.0), "bronze", shade=0.3, light=0.3, off=0.5, sw=0.6)
    elif st == 2:
        a.part(S(g(-0.6, -11.6), g(0.6, -14.2), g(2.6, -14.6), g(3.6, -11.6)), "bronze", shade=0.3, light=0.3, off=0.5, sw=0.6)
        a.part(S(g(-1.6, -13.8), g(1, -18.2), g(5, -17.6), g(4.4, -13.6), g(1.6, -14.6)), "plume", shade=0.35, light=0.3, off=0.8, sw=0.7)
    else:
        big = st >= 4
        crest = S(g(-6.2, -10), g(-4.6, -17.6 - big * 2), g(2, -21.4 - big * 3), g(9.6, -19 - big * 2), g(14, -13 - big), g(13.4, -8.2),
                  g(9.4, -10.4), g(3.6, -13.2), g(-2, -12.2), sharp=(0, 5))
        tex = "".join(O(g(-4 + i * 3, -11.4 - (i < 3) * 1.2), g(-3.2 + i * 3.4, -17 - big * 2 + abs(i - 2) * 0.8)) for i in range(6))
        a.part(crest, "plume", shade=0.45, light=0.35, off=1.6,
               inner=[f'<path d="{tex}" fill="none" stroke="#5a0c0e" stroke-opacity=".45" stroke-width=".6"/>'])
        a.part(S(g(-3, -10.6), g(2, -12.6), g(8.4, -10.2), g(8.6, -8.8), g(2, -11), g(-2.8, -9.2), sharp=(0, 2, 3, 5)), trim, shade=0, light=0.4, off=0.5, sw=0.6)
    # --- sword (far hand) ---------------------------------------------------------
    hand = (26.4, 56.6)
    a.part(limb((37, 52), (27.6, 57.4), 7.6, 5.6, 1.4, 0.4), "skin2", shade=0.4, light=0.3, off=1.4)
    if st >= 3:  # leather bracer
        a.part(limb((33.4, 54.2), (29.2, 56.6), 6.0, 5.4), "leather" if st == 3 else "gold", shade=0.3, light=0.35, off=0.8, sw=0.7)
    ang = math.radians(-118)
    ux, uy = math.cos(ang), math.sin(ang)  # blade direction (up-left)
    nx, ny = -uy, ux

    def at(t, w=0.0):
        return (hand[0] + ux * t + nx * w, hand[1] + uy * t + ny * w)

    blen = 29 + (st >= 4) * 2
    if st >= 5:
        a.glow(*at(blen * 0.55), 6.5, 17, "#ffd76a", 0.85, rot=math.degrees(ang) + 90)
        a.glow(*at(blen * 0.55), 3.2, 13, "#fff3c4", 0.9, rot=math.degrees(ang) + 90)
    blade = S(at(3.6, -2.4), at(blen * 0.55, -2.1), at(blen - 6, -2.6), at(blen, 0), at(blen - 6, 2.6), at(blen * 0.55, 2.1), at(3.6, 2.4), sharp=(0, 3, 6))
    a.part(blade, "blade", shade=0.25, light=0, off=0.8, sw=0.8,
           inner=[f'<path d="{L(at(4, 0), at(blen - 3, 0), closed=False)}" fill="none" stroke="#7a8890" stroke-width=".5"/>'
                  f'<path d="{L(at(4.4, -1.1), at(blen - 5, -1.2), closed=False)}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width=".7"/>'])
    if st >= 4:  # gleam
        gx, gy = at(blen * 0.42, -0.9)
        a.raw(f'<path d="M{P(gx - 2.4, gy)}L{P(gx, gy - 0.4)}L{P(gx + 2.4, gy)}L{P(gx, gy + 0.4)}ZM{P(gx, gy - 2.4)}L{P(gx + 0.4, gy)}L{P(gx, gy + 2.4)}L{P(gx - 0.4, gy)}Z" fill="#fff" stroke="none"/>')
        a.flat(ell(gx, gy, 0.8, 0.8), "#fff")
    a.part(S(at(2, -4.2), at(3.8, -4), at(3.8, 4), at(2, 4.2), sharp=(0, 1, 2, 3)), trim if st >= 2 else "wood", shade=0.2, light=0.3, off=0.5, sw=0.7)
    a.part(S(*[hand[0] + v for v in ()]) if False else ell(*hand, 3.7, 3.3, 20), "skin2", shade=0.4, light=0.3, off=1.0, sw=0.9)
    a.line(O((hand[0] - 2, hand[1] - 1.2), (hand[0] - 0.4, hand[1] + 0.2), (hand[0] + 0.8, hand[1] + 2)), "#8a4a30", 0.5, 0.7)
    pom = at(-4)
    a.part(ell(*pom, 1.9, 1.9), "gold" if st >= 3 else "wood", shade=0.2, light=0.4, off=0.5, sw=0.7)
    # --- near arm + shield / standard / cape drape -------------------------------------
    if st <= 3:
        a.part(limb((69, 40), (77, 54.5), 10.4, 7.8, 1.6), "skin", shade=0.42, light=0.3, off=1.6)
        a.part(limb((77, 54.5), (80.5, 66), 7.8, 6, 1.2, 0.4), "skin", shade=0.42, light=0.3, off=1.4)
        a.part(ell(81, 67, 3, 2.8), "skin", shade=0.4, light=0.3, off=1)
        # scutum seen at an angle on the near side
        sh = S((74.4, 50), (90, 46.2), (95.6, 48.6), (95.6, 100.6), (90.6, 104), (75, 101.4), (72.6, 98.6), (72.6, 52.6), sharp=())
        deco = [f'<path d="{L((78.6, 52.8), (91.8, 50), (91.8, 99.6), (78.6, 98.6))}" fill="none" stroke="#f2c95a" stroke-opacity="{.9 if st >= 2 else 0}" stroke-width="1"/>']
        if st >= 2:
            deco.append(f'<path d="{O((80.6, 62), (85, 60.4), (90, 60.6))}{O((80.6, 88), (85, 86.6), (90, 87))}" fill="none" stroke="#f2c95a" stroke-width="1"/>')
        if st >= 3:  # lightning wings
            deco.append(f'<path d="M{P(85.2, 64)}L{P(83, 69)}L{P(86.4, 68.6)}L{P(84.4, 72.4)}M{P(85.2, 85)}L{P(83, 80)}L{P(86.4, 80.4)}L{P(84.4, 76.6)}" fill="none" stroke="#f2c95a" stroke-width=".9"/>')
        a.part(sh, "red", shade=0.45, light=0.3, off=2.4, inner=deco)
        a.line(O((74.4, 50), (90, 46.2), (95.6, 48.6)), "#e9b84a" if st >= 2 else "#b08850", 1.0)
        a.line(O((95.6, 48.6), (95.6, 100.6), (90.6, 104)), "#5a2a1a", 0.9, 0.6)
        a.part(ell(85, 74.4, 4.6, 5.4), "bronze" if st == 1 else "gold", shade=0.4, light=0.5, off=1.2, sw=0.8)
        a.flat(ell(83.8, 73, 1.4, 1.6), "#fff", op=0.75)
    else:
        a.part(limb((69, 40), (78, 53), 10.4, 7.8, 1.6), "skin", shade=0.42, light=0.3, off=1.6)
        a.part(limb((78, 53), (86 if st >= 5 else 72, 47 if st >= 5 else 62), 7.8, 6, 1.2, 0.4), "skin", shade=0.42, light=0.3, off=1.4)
        a.part(limb((76.6, 51.4), (79.8, 54.2), 6.0, 6.0), "gold", shade=0.2, light=0.4, off=0.6, sw=0.6)
        if st >= 5:
            # eagle standard (aquila) held in the near hand
            a.part(L((86.8, 18), (88.8, 18), (88, 127.6), (86.4, 127.6)), "wood", shade=0.25, light=0, sw=0.8)
            a.part(ell(87.4, 46.6, 3.4, 3.2), "skin", shade=0.4, light=0.3, off=1)
            a.line(O((85.4, 45.4), (87, 46.2), (89, 45.8)), "#8a4a30", 0.5, 0.7)
            a.part(L((84, 16), (91.4, 16), (91, 18.6), (84.4, 18.6)), "gold", shade=0.25, light=0.4, off=0.6, sw=0.7)
            wreath = ell(87.6, 25, 4.4, 4.4)
            a.line(wreath, "#6e9a3c", 2.2)
            a.line(wreath, "#c8d07a", 0.8, 0.8)
            eagle = S((87.6, 4.2), (89.6, 6.4), (96, 1.8), (102.6, 2.2), (97.6, 7.2), (95.8, 11.6), (91, 12.4), (89.6, 15.6), (85.6, 15.6), (84.2, 12.4), (79.4, 11.6), (77.6, 7.2), (72.6, 2.2), (79.2, 1.8), (85.6, 6.4), sharp=(3, 12))
            a.glow(87.6, 8, 15, 8, "#ffe28a", 0.7)
            a.part(eagle, "gold", shade=0.4, light=0.5, off=1.2, sw=0.8,
                   inner=[f'<path d="{O((80, 7), (84, 9.2))}{O((95.2, 7), (91.2, 9.2))}{O((78, 4.4), (83, 7.6))}{O((97.2, 4.4), (92.2, 7.6))}" fill="none" stroke="#8a5718" stroke-width=".55"/>'])
            a.part(S((86.2, 3.6), (88, 1.4), (90.4, 2.4), (89.4, 4.2), (88, 5.6)), "gold", shade=0.3, light=0.4, off=0.5, sw=0.6)
            a.flat(L((89.8, 2.6), (91.6, 3.4), (89.6, 3.8)), "#c48a2a")
        else:
            a.part(ell(71.6, 62.6, 3.0, 2.8), "skin", shade=0.4, light=0.3, off=1)
        # cape drape over the near shoulder and arm
        drape = S((62, 34.6), (72.6, 35.4), (78.6, 42), (80.6, 52), (77.4, 58), (74.6, 48.6), (68.6, 41.4), sharp=(4,))
        a.part(drape, cape_mat, shade=0.45, light=0.3, off=1.6)
        a.line(O((63, 35), (72.6, 35.6), (78.8, 42), (80.6, 52)), "#e9b84a", 0.9, 0.9)
    # fibula / brooch on the near shoulder
    a.part(ell(64.6, 36.6, 2.2 + (st >= 4) * 0.6, 2.2 + (st >= 4) * 0.6), "gold" if st >= 2 else "bronze", shade=0.3, light=0.5, off=0.6, sw=0.7)
    if st >= 4:
        a.flat(ell(64.6, 36.6, 1, 1), "#b8352e")
    return a.svg()


# ---------------------------------------------------------------- TEUTONS
def teutons(st):
    a = Art(f"ht{st}")
    a.scale = {4: 0.97, 5: 0.95}.get(st, 1)
    hair = "hairr"
    trim = "gold" if st >= 4 else "iron"
    shadow(a, 62, 128.6, 34 if st < 4 else 38)
    # --- cloak / mantle, back part ------------------------------------------
    if st == 3:
        cl = S((48, 36), (72, 34), (88, 42), (98, 60), (103, 84), (97, 96), (88, 92), (80, 100), (70, 88), (58, 70), (50, 56), sharp=(5,))
        a.part(cl, "blue", shade=0.45, light=0.25, off=3, blur="B",
               inner=[f'<path d="{O((76, 46), (86, 70), (90, 94))}{O((68, 52), (74, 72), (78, 92))}" fill="none" stroke="#14203a" stroke-opacity=".45" stroke-width="2" filter="url(#{a.px}b)"/>'])
    elif st >= 4:
        big = st >= 5
        top = [(44, 38), (70, 33), (90, 38), (101, 54), (108 + big * 1, 80), (110 + big * 1, 104)]
        if big:
            side = tufted([(110 + big * 1, 104), (104 + big * 1, 112 + big * 4)], 1.6, 2.6, 3)
            edge = tufted([(104 + big * 1, 112 + big * 4), (96, 116), (86, 121), (74, 119), (64, 110)], 1.8, 2.8, 7 + st)
            cl = S(*(top + side + edge + [(56, 92), (48, 66)]))
            tex = fur_strokes((70, 40, 114, 120), 110, 3.4, st, 100, 40)
            a.part(cl, "bear", shade=0.45, light=0.3, off=3.2, blur="B",
                   inner=[f'<path d="{tex}" fill="none" stroke="#1e140c" stroke-opacity=".5" stroke-width=".55"/>',
                          f'<path d="{fur_strokes((74, 42, 112, 112), 50, 3, st + 9, 95, 30)}" fill="none" stroke="#e8c898" stroke-opacity=".3" stroke-width=".5"/>'])
        else:
            cl = S(*(top + [(104, 114), (94, 112), (86, 120), (74, 116), (64, 108), (56, 92), (48, 66)]), sharp=(6, 8))
            a.part(cl, "blue", shade=0.45, light=0.3, off=3.2, blur="B",
                   inner=[f'<path d="{O((80, 44), (92, 76), (96, 112))}{O((72, 50), (80, 80), (84, 114))}" fill="none" stroke="#14203a" stroke-opacity=".5" stroke-width="2.2" filter="url(#{a.px}b)"/>',
                          f'<path d="{O((86, 44), (98, 76), (102, 108))}" fill="none" stroke="#c8dcf0" stroke-opacity=".3" stroke-width="1.6" filter="url(#{a.px}b)"/>'])
            a.line(O((110, 104), (104, 114), (94, 112), (86, 120), (74, 116), (64, 108)), "#e8b84a", 1.3)
    # --- legs (trousers + leg wraps + boots) -------------------------------------
    tm = "blue" if st >= 3 else "wool"
    for hip, knee, ankle, heel, toe, mat in (((51, 74), (41, 97), (35, 119.6), (38.4, 126.4), (26.6, 127.4), tm),
                                             ((65, 74), (72.6, 98), (78, 120.6), (81.4, 127.6), (70, 128.6), tm)):
        a.part(limb(knee, ankle, 10.4, 7.4, 2.0, 0.3), mat, shade=0.45, light=0.25, off=1.8)
        a.part(limb(hip, knee, 15.4, 10.6, 1.8, 0.3), mat, shade=0.45, light=0.25, off=2.0,
               inner=[f'<path d="{O((hip[0] - 2, hip[1] + 6), (knee[0] - 1, knee[1] - 4))}" fill="none" stroke="#1a2438" stroke-opacity=".3" stroke-width=".8"/>'])
        if st >= 2:  # cross-gartered leg wraps
            d = ""
            for i in range(5):
                t0 = 0.12 + i * 0.17
                p0 = lerp(knee, ankle, t0)
                p1 = lerp(knee, ankle, t0 + 0.13)
                d += O((p0[0] - 4.6, p0[1] - 1), (p1[0] + 3.6, p1[1] + 0.6))
                d += O((p0[0] + 4.4, p0[1] - 0.4), (p1[0] - 3.4, p1[1] + 1.2))
            a.line(d, "#d8c49a" if st < 4 else "#e8c060", 0.9, 0.9)
        sandal(a, heel, toe, boot=True, bmat="dleather")
        # fur boot cuff
        cx, cy = ankle
        cuff = S(*tufted([(cx - 5.2, cy - 0.6), (cx, cy - 1.8), (cx + 5.2, cy - 0.6)], 1.2, 1.6, int(cx)) + [(cx + 4.8, cy + 2.6), (cx, cy + 2.2), (cx - 4.8, cy + 2.8)])
        a.part(cuff, "fur", shade=0.4, light=0.3, off=1, sw=0.7)
    # --- far arm upper (behind torso) ---------------------------------------------
    a.part(limb((47, 42), (35.4, 38), 11, 8.2, 1.6), "skin", shade=0.4, light=0.3, off=1.6)
    # --- tunic skirt ---------------------------------------------------------------
    sk = "linen" if st <= 1 else ("wool" if st == 2 else "blued")
    a.part(S((45, 62), (71, 62), (74, 72), (76.6, 82), (66, 84.4), (58, 82.4), (50, 84.4), (42.6, 82), (44, 72), sharp=(0, 1)), sk, shade=0.45, light=0.25, off=2,
           inner=[f'<path d="{O((51, 70), (50, 83))}{O((59, 70), (58.4, 82))}{O((67, 70), (68.6, 83))}" fill="none" stroke="#2a1a0c" stroke-opacity=".35" stroke-width=".9"/>'])
    if st >= 3:  # mail skirt
        a.part(S((44, 64), (72, 64), (74.4, 74), (64, 76.4), (52, 76.4), (42.6, 74), sharp=(0, 1)), "iron", shade=0.45, light=0.35, off=1.6,
               inner=[f'<path d="' + "".join(O((42, y), (58, y + 1), (75, y)) for y in range(65, 77, 2)) + '" fill="none" stroke="#2c3236" stroke-opacity=".55" stroke-width=".55" stroke-dasharray="1 .6"/>'])
        if st >= 4:
            a.line(O((42.8, 74), (52, 76.4), (64, 76.4), (74.4, 74)), "#e8b84a", 1.1)
    # --- torso ------------------------------------------------------------------------
    torso = S((52, 35), (44.4, 38.6), (42.4, 50), (45, 60), (45.6, 68), (71.6, 68), (73.4, 58), (76, 48), (74.2, 38.6), (64.6, 35), sharp=(4, 5))
    if st == 1:
        a.part(torso, "linen", shade=0.45, light=0.3, off=2.4,
               inner=[f'<path d="{O((52, 44), (55, 56), (54, 66))}{O((60, 40), (62, 54), (63, 66))}" fill="none" stroke="#6a5a40" stroke-opacity=".35" stroke-width=".9"/>'])
        # fur vest (open at the front)
        vest_l = S(*tufted([(52.4, 35.4), (55, 46), (53.6, 58), (50.6, 67)], 1.0, 2.2, 5) + [(45.6, 67.6), (44.6, 58), (42.4, 50), (44.2, 38.6)])
        vest_r = S(*tufted([(63.8, 35.4), (62.6, 46), (64.6, 58), (66.6, 67.4)], 1.0, 2.2, 6) + [(71.6, 67.8), (73.4, 58), (76, 48), (74.4, 38.4)])
        for v, sd in ((vest_l, 1), (vest_r, 2)):
            a.part(v, "fur", shade=0.45, light=0.3, off=1.8,
                   inner=[f'<path d="{fur_strokes((42, 36, 76, 68), 46, 2.6, sd, 95, 40)}" fill="none" stroke="#3a2614" stroke-opacity=".5" stroke-width=".5"/>'])
    elif st == 2:
        a.part(torso, "leather", shade=0.5, light=0.35, off=2.4,
               inner=[f'<path d="{O((58.6, 36), (58.4, 50), (58.6, 67))}" fill="none" stroke="#3f2716" stroke-opacity=".6" stroke-width=".9"/>'])
        d = ""
        for y in range(42, 66, 5):
            for x in range(47, 74, 5):
                if 44 + (y - 40) * 0.05 < x < 74 - (y - 40) * 0.1:
                    d += ell(x + (y % 2) * 2.5, y, 0.75, 0.75)
        a.flat(d, "iron", sw=0.4)
    elif st == 3:
        a.part(torso, "iron", shade=0.5, light=0.4, off=2.4,
               inner=[f'<path d="' + "".join(O((42, y), (58, y + 1.4), (76, y)) for y in range(38, 69, 2)) + '" fill="none" stroke="#2c3236" stroke-opacity=".55" stroke-width=".55" stroke-dasharray="1 .6"/>',
                      f'<path d="{O((48, 42), (52, 46), (50, 56))}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" filter="url(#{a.px}b)"/>'])
    else:  # lamellar (4) / ornate iron plate with gold knotwork (5)
        if st == 4:
            rows = "".join(O((42, y), (58, y + 1.4), (76, y)) for y in range(41, 68, 3))
            cols = "".join(L((x, 40), (x + 0.4, 68), closed=False) for x in range(45, 75, 3))
            a.part(torso, "iron", shade=0.5, light=0.42, off=2.4,
                   inner=[f'<path d="{rows}" fill="none" stroke="#262c30" stroke-opacity=".6" stroke-width=".6"/>',
                          f'<path d="{cols}" fill="none" stroke="#262c30" stroke-opacity=".35" stroke-width=".45"/>',
                          f'<path d="{O((48, 42), (52, 46), (50, 56))}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" filter="url(#{a.px}b)"/>'])
        else:
            a.part(torso, "iron", shade=0.5, light=0.45, off=2.4,
                   inner=[f'<path d="{O((58.6, 37), (58.2, 52), (58.8, 67))}{O((45, 52), (52, 54.6), (58.4, 53.4), (66, 54.6), (73.4, 52))}" fill="none" stroke="#e8b84a" stroke-width="1.4"/>',
                          f'<path d="{O((47.6, 40), (51, 46), (49.4, 50))}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" filter="url(#{a.px}b)"/>'])
            # knotwork medallion
            a.part(ell(58.6, 45, 4.2, 4.6), "gold", shade=0.35, light=0.45, off=0.8, sw=0.8)
            a.line(O((55.6, 43), (58.6, 48), (61.6, 43), (58.6, 42.6), (55.6, 47)) + O((58.6, 41.4), (58.6, 48.6)), "#8a5718", 0.6)
            a.flat(ell(58.6, 45, 1.2, 1.2), "#3a8ad0")
        a.line(O((44.4, 38.6), (42.4, 50), (45, 60), (45.6, 67.4)), "#e8b84a", 1.0, 0.9)
    # belt
    a.part(L((44.6, 63.4), (72.2, 63.4), (72.4, 68), (44.4, 68)), "dleather", shade=0.3, light=0.2, off=0.8, sw=0.8)
    a.part(S((55, 62.8), (61, 62.8), (61, 68.6), (55, 68.6), sharp=(0, 1, 2, 3)), "gold" if st >= 4 else "iron", shade=0.3, light=0.4, off=0.6, sw=0.7)
    a.flat(L((56.4, 64.2), (59.6, 64.2), (59.6, 67.2), (56.4, 67.2)), "#3f2716")
    if st >= 3:
        a.line(O((63, 68), (64, 74)) + O((65.6, 68), (67.4, 73.6)), "#3f2716", 1.2)
    # --- near upper arm, then shoulder pieces / fur collar over it -----------------------
    a.part(limb((73.4, 42), (81, 56), 11, 8.4, 1.6), "skin", shade=0.42, light=0.3, off=1.6)
    if st == 2:
        col = S(*tufted([(42, 46), (40.6, 40), (46, 35.4), (58, 33.6), (70, 34.4), (77, 38.6), (78.4, 46)], 1.3, 2.2, 21) + [(74, 42), (64, 38.6), (52, 39), (44, 43)])
        a.part(col, "fur", shade=0.45, light=0.35, off=1.6,
               inner=[f'<path d="{fur_strokes((40, 33, 79, 46), 34, 2.4, 22, 90, 50)}" fill="none" stroke="#3a2614" stroke-opacity=".5" stroke-width=".5"/>'])
    if st >= 3:
        # pauldrons
        pm = "iron"
        a.part(S((41.2, 39), (50, 35.6), (52.4, 41), (47, 46.6), (40.6, 45)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
        a.part(S((66.6, 35.6), (75.6, 37.4), (78.6, 44), (73, 47.4), (66.6, 42)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
        if st >= 4:
            a.line(O((40.6, 45), (47, 46.6), (52.4, 41)) + O((66.6, 42), (73, 47.4), (78.6, 44)), "#e8b84a", 1.0)
            for x, y in ((44, 41), (47.6, 39.6), (71, 40), (74.6, 42)):
                a.flat(ell(x, y, 0.75, 0.75), "gold")
        fm = "bear" if st >= 5 else "fur"
        if st >= 5:
            col = S(*tufted([(41, 47), (41.4, 38), (48, 32.6), (58, 31), (68, 31.4), (77, 36), (80, 45)], 1.8, 2.2, 35) + [(76, 44), (70, 40.6), (62, 39.4), (54, 40), (46, 43.4)])
        else:
            col = S(*tufted([(44, 41.4), (46.6, 36), (56, 32.6), (66, 33), (74, 37.4)], 1.4, 2.0, 30 + st) + [(70, 39.6), (62, 37.6), (54, 38.2), (48, 41.6)])
        a.part(col, fm, shade=0.45, light=0.35, off=1.4,
               inner=[f'<path d="{fur_strokes((40, 30, 80, 47), 30 + (st >= 5) * 26, 2.2, 31, 90, 50)}" fill="none" stroke="#2a1a0c" stroke-opacity=".5" stroke-width=".5"/>',
                      f'<path d="{fur_strokes((40, 30, 80, 40), 10 + (st >= 5) * 14, 2, 32, 90, 50)}" fill="none" stroke="#f0d8b0" stroke-opacity=".35" stroke-width=".45"/>'])
    # --- neck, hair (behind), head ------------------------------------------------------
    a.part(limb((58.6, 30), (59, 36), 8, 8.6), "skin", shade=0.5, light=0.2, off=1.4)
    hx, hy, hs = 57.4, 24.6, 1.0
    hb = [(1.6, -7), (8, -5), (10.4, 2), (10.6, 9), (11.6, 14.6), (8.4, 15.4), (5.6, 11), (3.6, 4)]
    a.part(S(*[(hx + x * hs, hy + y * hs) for x, y in hb]), hair, shade=0.45, light=0.3, off=1.4,
           inner=[f'<path d="{O((hx + 6, hy - 3), (hx + 9, hy + 5), (hx + 9.6, hy + 13))}{O((hx + 4, hy), (hx + 6.4, hy + 7), (hx + 7.6, hy + 13))}" fill="none" stroke="#4a1e0a" stroke-opacity=".5" stroke-width=".6"/>'])
    blen = {1: 12.6, 2: 13.6, 3: 14.6, 4: 16, 5: 17}[st]
    beard = [(4.6, 1.2), (5, 6), (3, 9.6), (0.6, blen - 2), (-1.6, blen), (-3.8, blen - 1.6), (-5.4, 11), (-6.8, 6.6),
             (-5.2, 6.4), (-3.4, 7.6), (-1.6, 6.4), (1.6, 3.8)]
    g = head(a, hx, hy, hs, "skin", beard=beard, beard_mat=hair, brow=0.6, ear=False, mouth="none")
    if st >= 4:  # braided beard rings
        for t in (0.55, 0.8):
            x, y = g(-1.2, 7 + (blen - 7) * t)
            a.part(L((x - 2.2, y - 0.8), (x + 2.2, y - 0.8), (x + 2, y + 0.9), (x - 2, y + 0.9)), "gold", shade=0, light=0, sw=0.6)
    # --- helmet -----------------------------------------------------------------------
    hm = "iron"
    if st >= 5:  # feathered wings behind the helm
        for base, sgn in ((g(-4.2, -9), -1), (g(7.4, -8), 1)):
            for k in range(4):
                ang = math.radians(-90 + sgn * (18 + k * 14))
                ln = 17.5 - k * 2.8
                cx_, cy_ = base[0] + math.cos(ang) * ln * 0.5, base[1] + math.sin(ang) * ln * 0.5
                a.part(ell(cx_, cy_, ln * 0.5, 2.5, math.degrees(ang)), "feather", shade=0.4, light=0.2, off=0.8, sw=0.7)
            a.line(O(base, (base[0] + sgn * 2.4, base[1] - 7), (base[0] + sgn * 4, base[1] - 12)), "#9a9080", 0.5, 0.8)
    if st >= 3:  # horns
        hl = 1.0 + (st - 3) * 0.35
        for flip in (False, True):
            base = g(-4.6, -8.4) if not flip else g(7, -7)
            sgn = -1 if not flip else 1
            pts = [(0, 1.6), (sgn * 3.6 * hl, -0.4), (sgn * 6.2 * hl, -4 * hl), (sgn * 6.6 * hl, -8.8 * hl), (sgn * 4.6 * hl, -6 * hl), (sgn * 2.4 * hl, -3.4 * hl), (0, -2.4)]
            hn = S(*[(base[0] + x, base[1] + y) for x, y in pts], sharp=(3,))
            P_ = [(base[0] + x, base[1] + y) for x, y in pts]
            tipd = S(lerp(P_[2], P_[3], 0.3), P_[3], lerp(P_[4], P_[3], 0.4))
            a.part(hn, "horn", shade=0.45, light=0.3, off=1.0, sw=0.85,
                   inner=[f'<path d="{tipd}" fill="#5a4026" fill-opacity=".75" stroke="none" filter="url(#{a.px}s)"/>',
                          f'<path d="{O((base[0] + sgn * 1.6, base[1] + 1), (base[0] + sgn * 1.2, base[1] - 2.6))}{O((base[0] + sgn * 3.4 * hl, base[1] - 0.4), (base[0] + sgn * 2.8 * hl, base[1] - 3.6 * hl))}" fill="none" stroke="#6a4a24" stroke-opacity=".6" stroke-width=".6"/>'])
            if st >= 4:
                tip = (base[0] + sgn * 6.6 * hl, base[1] - 8.8 * hl)
                a.flat(ell(*lerp((base[0], base[1]), tip, 0.18), 1.6, 1.9, -sgn * 30), "gold", sw=0.6)
    bowl = S(g(-7.6, -2.6), g(-7.2, -7.4), g(-2.8, -12.2), g(3.4, -12.4), g(8.2, -8.4), g(9.6, -2.4), g(4, -3.6), g(-2, -4), sharp=(0, 5))
    tex = []
    if st >= 3:
        tex.append(f'<path d="{O(g(0.4, -12.4), g(0.2, -8), g(0.6, -3.6))}{O(g(-5.6, -9.8), g(-4.4, -6.4), g(-4.6, -3.4))}{O(g(6, -10.6), g(6.2, -6.6), g(6.6, -3))}" fill="none" stroke="{"#e8b84a" if st >= 4 else "#c8a050"}" stroke-width="1.3"/>')
    tex.append(f'<path d="{O(g(-5, -7), g(-2, -10.4), g(2, -11))}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>')
    a.part(bowl, "gold" if st >= 5 else hm, shade=0.5, light=0.5, off=1.8, inner=tex)
    if st >= 5:  # dark iron helm with gold: tint the bowl back to iron under the gold bands
        pass
    a.part(S(g(-8, -2.2), g(-2.2, -4.6), g(4, -3.8), g(10, -1.6), g(9.8, 0), g(4, -2), g(-2.2, -2.6), g(-8, -0.6), sharp=(0, 3, 4, 7)),
           "gold" if st >= 4 else ("bronze" if st == 3 else "iron"), shade=0.3, light=0.4, off=0.6, sw=0.7)
    if st >= 2:  # nasal / spectacle guard
        a.part(S(g(-7.8, -2), g(-6, -2.4), g(-6.2, 2.6), g(-7.4, 3), sharp=(0, 1, 2, 3)), "gold" if st >= 4 else "iron", shade=0.3, light=0.3, off=0.6, sw=0.7)
    if st >= 4:
        a.line(O(g(-6, -1.4), g(-4, -0.2), g(-1.6, -1.8), g(0.6, -2.6)), "#e8b84a", 1.0)
    if st >= 5:
        a.part(S(g(-1.6, -12), g(1.8, -16.4), g(5.6, -14.6), g(5.4, -11.4), sharp=(1,)), "gold", shade=0.3, light=0.4, off=0.6, sw=0.7)
    # --- far forearm + axe ---------------------------------------------------------------
    hand = (31.6, 25.4)
    a.part(limb((35.4, 38), (32.2, 27), 8.2, 6.4, 1.4, 0.4), "skin", shade=0.4, light=0.3, off=1.4)
    bm = {1: "leather", 2: "leather", 3: "iron", 4: "iron", 5: "gold"}[st]
    a.part(limb((34.6, 35.2), (32.8, 29), 7.8, 7.0), bm, shade=0.35, light=0.4, off=0.8, sw=0.8)
    if st == 4:
        a.line(O((30, 30.4), (35.2, 31.4)) + O((31.2, 34.6), (37.2, 35)), "#e8b84a", 0.8)
    ux, uy = -0.27, -0.963
    nx, ny = uy, -ux  # left of the haft

    def at(t, w=0.0):
        return (hand[0] + ux * t + nx * w, hand[1] + uy * t + ny * w)

    sc = {1: 0.8, 2: 0.88, 3: 0.96, 4: 1.06, 5: 1.18}[st]
    top = min(20 * sc + 2, 23.4 - 4.6 * sc)
    butt = -14 - (sc - 0.8) * 16
    if st >= 5:
        a.glow(*at(top - 5, 9), 12, 13, "#7fd8ff", 0.85)
    a.part(S(at(butt, -1.2), at(top, -1.2), at(top + 0.6, 0), at(top, 1.2), at(butt, 1.2), at(butt - 0.8, 0), sharp=(1, 3)), "wood", shade=0.3, light=0, off=0.6, sw=0.8)
    if st >= 3:
        a.line(L(at(butt + 4, -1.2), at(butt + 2, 1.2), closed=False) + L(at(butt + 7, -1.2), at(butt + 5, 1.2), closed=False), "#e8b84a" if st >= 4 else "#3f2716", 0.8)
    # axe head: socket + bearded blade facing forward (left)
    blade = [(top - 1.2, 1.2), (top + 0.4 * sc, 5.4 * sc), (top + 4.4 * sc, 11.6 * sc), (top + 0.6 * sc, 14.4 * sc), (top - 5 * sc, 15.2 * sc),
             (top - 10.6 * sc, 13.6 * sc), (top - 14.2 * sc, 10 * sc), (top - 9.4 * sc, 7 * sc), (top - 7.4 * sc, 2.6 * sc), (top - 7.2, 1.2)]
    bd = S(*[at(t, w) for t, w in blade], sharp=(2, 6))
    runes = ""
    if st >= 4:
        runes = (L(at(top - 1 * sc, 6 * sc), at(top - 6 * sc, 7 * sc), closed=False) + L(at(top - 1.6 * sc, 8.6 * sc), at(top - 3.6 * sc, 6.4 * sc), closed=False)
                 + L(at(top - 4 * sc, 9.8 * sc), at(top - 8.4 * sc, 10.6 * sc), closed=False) + L(at(top - 5 * sc, 12 * sc), at(top - 6.6 * sc, 9.4 * sc), at(top - 8 * sc, 12.4 * sc), closed=False))
    inner = [f'<path d="{O(at(top + 3.4 * sc, 11.6 * sc), at(top - 0.4 * sc, 13.8 * sc), at(top - 5 * sc, 14.4 * sc), at(top - 10.4 * sc, 12.8 * sc), at(top - 13 * sc, 10 * sc))}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.2"/>']
    a.part(bd, "steel" if st >= 4 else "iron", shade=0.45, light=0.4, off=1.4, inner=inner)
    if runes:
        if st >= 5:
            a.line(runes, "#7fd8ff", 2.2, 0.7, blur="b")
            a.line(runes, "#e6faff", 0.7)
        else:
            a.line(runes, "#c48a2a", 0.6)
    a.part(S(at(top - 8, -1.8), at(top, -1.9), at(top, 1.9), at(top - 8, 1.8), sharp=(0, 1, 2, 3)), "gold" if st >= 4 else "iron", shade=0.3, light=0.35, off=0.6, sw=0.75)
    if st >= 5:  # back spike
        a.part(S(at(top - 6, -1.8), at(top - 3.6, -6.4), at(top - 2, -1.8)), "steel", shade=0.3, light=0.3, off=0.6, sw=0.7)
    # fist round the haft
    a.part(ell(*hand, 3.8, 3.4, 15), "skin", shade=0.4, light=0.3, off=1.0, sw=0.9)
    a.line(O((hand[0] - 2.4, hand[1] - 1.4), (hand[0] - 0.4, hand[1] - 0.6), (hand[0] + 1.6, hand[1] - 1.4)) + O((hand[0] - 2.6, hand[1] + 0.6), (hand[0] - 0.4, hand[1] + 1.2)), "#8a4a30", 0.5, 0.7)
    # --- near arm + round shield ---------------------------------------------------------
    if st >= 3:
        a.part(limb((76.6, 47.6), (79.4, 52.6), 9.6, 8.6), "gold" if st >= 4 else "iron", shade=0.3, light=0.4, off=0.6, sw=0.7)
    sx, sy, rx, ry = 86, 72, 13.6, 18.4
    face_m = {1: "wood", 2: "blue", 3: "blue", 4: "blue", 5: "blued"}[st]
    sh = ell(sx, sy, rx, ry, 4)
    inner = []
    if st == 1:
        inner.append(f'<path d="{L((sx - 6, sy - 20), (sx - 6.6, sy + 20), closed=False)}{L((sx, sy - 20), (sx, sy + 20), closed=False)}{L((sx + 6, sy - 20), (sx + 6.6, sy + 20), closed=False)}" fill="none" stroke="#4a2e14" stroke-opacity=".55" stroke-width=".7"/>')
    else:
        # painted quarters / swirl
        col = "#e9dfc6" if st < 5 else "#e8b84a"
        if st == 2:
            inner.append(f'<path d="M{P(sx, sy)}L{P(sx - 2, sy - 20)}L{P(sx - 16, sy - 20)}L{P(sx - 16, sy)}ZM{P(sx, sy)}L{P(sx + 2, sy + 20)}L{P(sx + 16, sy + 20)}L{P(sx + 16, sy)}Z" fill="{col}" fill-opacity=".85" stroke="none"/>')
        else:
            sw_d = "".join(O((sx, sy), (sx + math.cos(math.radians(a0)) * 6, sy + math.sin(math.radians(a0)) * 8),
                             (sx + math.cos(math.radians(a0 + 60)) * 12, sy + math.sin(math.radians(a0 + 60)) * 16.6)) for a0 in (0, 120, 240))
            inner.append(f'<path d="{sw_d}" fill="none" stroke="{col}" stroke-width="2.4"/>')
    a.part(sh, face_m, shade=0.45, light=0.3, off=2.4, inner=inner)
    rim = "gold" if st >= 4 else ("iron" if st >= 2 else "leather")
    a.line(sh, {"gold": "#d9a640", "iron": "#7f888c", "leather": "#6e4a2a"}[rim], 1.8)
    a.line(ell(sx, sy, rx + 0.9, ry + 0.9, 4), OUTL, 0.7, 0.75)
    if st >= 3:
        d = "".join(ell(sx + math.cos(t) * rx, sy + math.sin(t) * ry, 0.7, 0.7) for t in [i * math.pi / 6 for i in range(12)])
        a.flat(d, "gold" if st >= 4 else "iron", sw=0.3)
    br = 3.6 + st * 0.3
    a.part(ell(sx - 0.6, sy, br, br * 1.2), "gold" if st >= 4 else "iron", shade=0.45, light=0.5, off=1.0, sw=0.8)
    a.flat(ell(sx - 1.6, sy - 1.6, br * 0.35, br * 0.42), "#fff", op=0.75)
    return a.svg()


# ---------------------------------------------------------------- GAULS
def gauls(st):
    a = Art(f"hg{st}")
    a.scale = {4: 0.97, 5: 0.95}.get(st, 1)
    hair = "hairy"
    gold = st >= 4
    shadow(a, 56, 128.6, 38)
    # --- weapon behind (sword raised behind the head / spear overhead) -------------------
    hand = (29.4, 29.6)
    if st <= 2:
        ux, uy = -0.84, 0.54  # spear points forward-down to the left
    else:
        ux, uy = -0.4, -0.917  # sword raised forward, ready to strike
    nx, ny = -uy, ux

    def at(t, w=0.0):
        return (hand[0] + ux * t + nx * w, hand[1] + uy * t + ny * w)

    # --- cloak (behind) ------------------------------------------------------------------
    if st >= 2:
        if st == 2:
            cl = S((44, 41), (60, 39), (72, 42), (82, 50), (86, 62), (80, 66), (72, 70), (62, 64), (50, 52), sharp=(4,))
        elif st == 3:
            cl = S((43, 41), (60, 38.6), (76, 42), (88, 54), (95, 74), (98, 92), (90, 90), (80, 96), (70, 84), (56, 62), sharp=(5,))
        elif st == 4:
            cl = S((42, 41), (60, 38), (78, 41), (93, 52), (102, 72), (106, 98), (108, 112), (100, 108), (92, 116), (80, 106), (66, 84), (52, 60), sharp=(6,))
        else:
            cl = S((41, 41), (60, 37.6), (80, 40), (96, 48), (106, 66), (110, 90), (112, 118), (104, 112), (98, 122), (88, 112), (74, 98), (60, 74), (48, 56), sharp=(6, 8))
        reach = {2: 0.35, 3: 0.6, 4: 0.85, 5: 1.0}[st]
        dk = "".join(O((60 + i * 6, 42), (68 + i * 9, 42 + 40 * reach), (72 + i * 11, 42 + 74 * reach)) for i in range(4))
        lt = "".join(O((63 + i * 6, 42), (72 + i * 9, 42 + 40 * reach), (77 + i * 11, 42 + 72 * reach)) for i in range(4))
        a.part(cl, "green", shade=0.45, light=0.3, off=3, blur="B",
               inner=[f'<path d="{dk}" fill="none" stroke="#0e2410" stroke-opacity=".45" stroke-width="2.2" filter="url(#{a.px}b)"/>',
                      f'<path d="{lt}" fill="none" stroke="#d8f0b0" stroke-opacity=".25" stroke-width="1.4" filter="url(#{a.px}b)"/>'])
        if st >= 4:
            hem = {4: O((108, 112), (100, 108), (92, 116), (80, 106)), 5: O((112, 118), (104, 112), (98, 122), (88, 112), (74, 98))}[st]
            a.line(hem, "#e8c060", 1.4, 0.95)
    if st <= 2:
        a.part(S(at(-34, -0.9), at(14, -0.9), at(14, 0.9), at(-34, 0.9), sharp=(0, 1, 2, 3)), "wood", shade=0.3, light=0, off=0.6, sw=0.8)
        tip = S(at(13, -1.4), at(17, -2.8), at(25, 0), at(17, 2.8), at(13, 1.4), sharp=(2,))
        a.part(tip, "iron" if st == 1 else "steel", shade=0.4, light=0.4, off=0.8, sw=0.8,
               inner=[f'<path d="{L(at(15, 0), at(23, 0), closed=False)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/>'])
        if st == 2:
            a.line(L(at(11, -1.2), at(11.6, 1.2), closed=False) + L(at(12.4, -1.2), at(13, 1.2), closed=False), "#cf9550", 0.8)
    # --- legs: far leg forward and bent, near leg stretched back ---------------------------
    plaid = [f'<path d="' + "".join(L((x, 76), (x - 14, 128), closed=False) for x in range(24, 104, 4)) + '" fill="none" stroke="#5a3a1a" stroke-opacity=".4" stroke-width=".7"/>'
             f'<path d="' + "".join(L((14, y), (100, y - 8), closed=False) for y in range(84, 140, 4)) + '" fill="none" stroke="#2f6a2a" stroke-opacity=".45" stroke-width=".8"/>']
    leg(a, (46, 79), (31.6, 97), (28, 120.6), 13.4, 9, 6.4, "check", crease=False, inner=plaid, bulge=(1.6, 1.2))
    sandal(a, (31.4, 126.6), (19.4, 127.6), boot=True, bmat="leather", wrap="#3f2716")
    leg(a, (60, 80), (73, 100), (85.6, 118.6), 13.8, 9.2, 6.2, "check", crease=False, inner=plaid, bulge=(1.6, 1.2))
    sandal(a, (90, 122), (79.6, 128.2), boot=True, bmat="leather", wrap="#3f2716")
    # --- far arm upper (raised; behind torso) ----------------------------------------------
    a.part(limb((42.4, 45.4), (30, 41), 10.4, 8, 1.6), "skin", shade=0.4, light=0.3, off=1.6)
    # --- tunic skirt ------------------------------------------------------------------------
    a.part(S((41, 68), (65, 68), (68, 78), (70.6, 86), (61, 84.4), (52, 86.6), (42, 86), (37.4, 84), (39, 77), sharp=(0, 1)), "green" if st <= 2 else "greend",
           shade=0.45, light=0.25, off=2,
           inner=[f'<path d="{O((47, 72), (45, 86))}{O((55, 72), (54.4, 85))}{O((62, 72), (64, 85))}" fill="none" stroke="#0e2410" stroke-opacity=".4" stroke-width=".9"/>'])
    if st >= 3:  # mail skirt
        a.part(S((40.4, 68), (65.4, 68), (67.6, 77.6), (54, 79.4), (38.6, 77.6), sharp=(0, 1)), "bronze" if st >= 5 else "iron", shade=0.45, light=0.35, off=1.6,
               inner=[f'<path d="' + "".join(O((38, y), (53, y + 1), (68, y)) for y in range(69, 79, 2)) + '" fill="none" stroke="#2c3236" stroke-opacity=".5" stroke-width=".55" stroke-dasharray="1 .6"/>'])
        if gold:
            a.line(O((38.6, 77.6), (54, 79.4), (67.6, 77.6)), "#e8c060", 1.1)
    # --- torso ------------------------------------------------------------------------------------
    torso = S((45.4, 40.4), (39, 44.2), (38.2, 54), (41, 62), (41.4, 70), (64.6, 70), (65.4, 62), (67.6, 53), (66.4, 43.6), (56, 40), sharp=(4, 5))
    if st == 1:
        a.part(torso, "check", shade=0.5, light=0.35, off=2.4,
               inner=[f'<path d="{O((44, 46), (44, 70))}{O((50, 44), (50.6, 70))}{O((56.6, 43), (57.4, 70))}{O((63, 44), (63.6, 70))}" fill="none" stroke="#5a3a1a" stroke-opacity=".55" stroke-width=".7"/>',
                      f'<path d="{O((38, 50), (53, 51.4), (68, 50))}{O((38, 58), (53, 59.4), (68, 58))}{O((38, 65), (53, 66.4), (68, 65))}" fill="none" stroke="#2f6a2a" stroke-opacity=".6" stroke-width=".9"/>'])
        a.line(O((46, 40.8), (51, 47), (55.6, 40.6)), "#5a3a1a", 1.0, 0.8)
    elif st == 2:
        a.part(torso, "check", shade=0.5, light=0.35, off=2.4)
        a.part(S((40, 46), (48, 43.4), (51, 47.6), (55, 43.4), (65, 45.6), (65.6, 62), (64.6, 70), (41.4, 70), (40.6, 60), sharp=(2,)), "leather", shade=0.5, light=0.35, off=2.2,
               inner=[f'<path d="{O((43, 56), (53, 57.6), (64, 56))}{O((43, 63), (53, 64.4), (64, 63))}" fill="none" stroke="#3f2716" stroke-opacity=".6" stroke-width=".8"/>'])
    elif st <= 4:
        a.part(torso, "iron", shade=0.5, light=0.42, off=2.4,
               inner=[f'<path d="' + "".join(O((37, y), (53, y + 1.4), (69, y)) for y in range(43, 71, 2)) + '" fill="none" stroke="#2c3236" stroke-opacity=".55" stroke-width=".55" stroke-dasharray="1 .6"/>',
                      f'<path d="{O((42, 47), (45, 52), (43.6, 60))}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" filter="url(#{a.px}b)"/>'])
    else:  # bronze-and-gold scale cuirass
        sc_ = "".join(O((x - 1.4, y), (x, y + 1.6), (x + 1.4, y)) for y in range(47, 69, 3) for x in [40 + i * 2.8 + (y % 2) * 1.4 for i in range(10)] if 39 < x < 66)
        a.part(torso, "bronze", shade=0.5, light=0.45, off=2.4,
               inner=[f'<path d="{sc_}" fill="none" stroke="#6a3f1c" stroke-opacity=".75" stroke-width=".55"/>',
                      f'<path d="{O((42, 47), (45, 52), (43.6, 60))}" fill="none" stroke="#fff6c8" stroke-opacity=".7" stroke-width="1.6" filter="url(#{a.px}b)"/>'])
        a.line(O((39, 44.2), (38.2, 54), (41, 62), (41.4, 69.4)) + O((45.4, 40.6), (51, 44), (56, 40.2)), "#ffe08a", 1.1)
    # shoulder doubling / pauldrons
    if st >= 3:
        pm = "gold" if st >= 5 else ("bronze" if st == 4 else "leather")
        a.part(S((37, 44), (45.6, 41), (48, 46.4), (42.6, 51.6), (36.4, 50)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
    # belt
    a.part(L((40.6, 66), (65.4, 66), (65.6, 70.4), (40.4, 70.4)), "dleather", shade=0.3, light=0.2, off=0.8, sw=0.8)
    a.part(ell(52, 68.2, 2.6, 2.6), "gold" if gold else "bronze", shade=0.3, light=0.45, off=0.6, sw=0.7)
    # --- neck, hair, head -----------------------------------------------------------------------------
    a.part(limb((51.4, 36), (51.6, 42), 7.6, 8.4), "skin", shade=0.5, light=0.2, off=1.4)
    hx, hy, hs = 49.6, 30.6, 1.0
    # long hair streaming back in the wind
    hb = [(-4, -8.8), (3, -10.6), (10, -8), (15, -4), (19.4, -1.4), (16.6, 1.6), (18.6, 5.4), (14.4, 6.4), (15.4, 10.6), (10, 9.6), (7, 11.6), (4, 4)]
    a.part(S(*[(hx + x * hs, hy + y * hs) for x, y in hb], sharp=(4, 6, 8, 10)), hair, shade=0.45, light=0.35, off=1.4,
           inner=[f'<path d="{O((hx + 2, hy - 7), (hx + 10, hy - 4), (hx + 17, hy - 1))}{O((hx + 4, hy - 3), (hx + 10, hy + 1), (hx + 15, hy + 5))}{O((hx + 4, hy + 2), (hx + 8, hy + 6), (hx + 12, hy + 9))}" fill="none" stroke="#7a5524" stroke-opacity=".6" stroke-width=".6"/>'])
    g = head(a, hx, hy, hs, "skin", brow=0.3, mustache=hair, ear=st <= 1, mouth="firm")
    # mustache droop
    a.part(S(g(-6.6, 4.2), g(-4.6, 3.8), g(-3, 5), g(-3.4, 9.4), g(-4.6, 9.8), g(-5.2, 6.6), g(-6.6, 6.6)), hair, shade=0.35, light=0.3, off=0.6, sw=0.6)
    if st == 1:  # bare head: front lock of hair
        a.part(S(g(-6.6, -4.4), g(-4.6, -9), g(1, -10.6), g(6, -8.6), g(3, -6.6), g(-1, -6.4), g(-4.4, -3.6)), hair, shade=0.4, light=0.35, off=0.8, sw=0.8)
    else:
        if st >= 4:  # wings
            big = st >= 5
            for base, sgn in ((g(-3.6, -9.6), -1), (g(6.4, -8.8), 1)):
                for k in range(4):
                    ang = math.radians(-90 + sgn * (14 + k * 15))
                    ln = (14 + big * 6) - k * (2.4 + big * 0.8)
                    cx_, cy_ = base[0] + math.cos(ang) * ln * 0.5, base[1] + math.sin(ang) * ln * 0.5
                    a.part(ell(cx_, cy_, ln * 0.5, 2.0 + big * 0.5, math.degrees(ang)), "gold" if big else "feather", shade=0.4, light=0.3, off=0.8, sw=0.7)
        bm = "gold" if st >= 5 else "bronze"
        bowl = S(g(-7.4, -2.8), g(-7, -7.6), g(-2.6, -12), g(3.6, -12), g(8.4, -8), g(9.6, -2.4), g(4, -3.6), g(-2, -4), sharp=(0, 5))
        a.part(bowl, bm, shade=0.5, light=0.5, off=1.8,
               inner=[f'<path d="{O(g(-5, -7), g(-2, -10.4), g(2, -11))}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>'])
        a.part(S(g(-8, -2.2), g(-2.2, -4.6), g(4, -3.8), g(10.4, -1.4), g(10.2, 0.4), g(4, -2), g(-2.2, -2.6), g(-8, -0.6), sharp=(0, 3, 4, 7)), "gold" if gold else "bronze",
               shade=0.3, light=0.4, off=0.6, sw=0.7)
        a.part(ell(*g(0.6, -12.6), 1.5, 1.3), "gold" if gold else "bronze", shade=0.3, light=0.4, off=0.5, sw=0.6)
        if st >= 3:  # cheek piece
            a.part(S(g(1.4, -2.6), g(5, -2), g(5, 4.4), g(2.6, 8), g(0.8, 6.6), g(0.8, 2)), "gold" if gold else "bronze", shade=0.4, light=0.4, off=0.8, sw=0.8)
            a.flat(ell(*g(3, 1.6), 0.9, 0.9), "#2f6a2a" if gold else "#6a4a20")
    # torc
    if st >= 3:
        tw = 1.6 if st >= 5 else 1.1
        a.line(O((46.2, 40.4), (51, 43), (56, 40.4)), "#6a3f1c", tw + 0.9)
        a.line(O((46.2, 40.4), (51, 43), (56, 40.4)), "#f2c95a" if gold else "#cf9550", tw)
        for x_, y_ in ((46.2, 40.4), (56, 40.4)):
            a.part(ell(x_, y_, 1.1 + (st >= 5) * 0.3, 1.1 + (st >= 5) * 0.3), "gold" if gold else "bronze", shade=0.3, light=0.4, off=0.5, sw=0.6)
    # --- far forearm + weapon ----------------------------------------------------------------------
    a.part(limb((30, 41), (29.6, 31), 8, 6.2, 1.2, 0.4), "skin", shade=0.4, light=0.3, off=1.4)
    if st >= 3:
        a.part(limb((29.8, 38.4), (29.6, 33.6), 7.4, 6.8), "gold" if gold else "bronze", shade=0.3, light=0.4, off=0.6, sw=0.7)
    if st <= 2:
        pass
    else:
        blen = 25.6 + (st - 3) * 1.6
        if st >= 5:
            a.glow(*at(blen * 0.58), 6.6, 13.6, "#8cff7a", 0.8, rot=math.degrees(math.atan2(uy, ux)) + 90)
            a.glow(*at(blen * 0.58), 3.2, 12.6, "#e6ffd8", 0.85, rot=math.degrees(math.atan2(uy, ux)) + 90)
        blade = S(at(3.4, -2.2), at(blen - 4, -2.0), at(blen, 0), at(blen - 4, 2.0), at(3.4, 2.2), sharp=(0, 2, 4))
        a.part(blade, "blade", shade=0.25, light=0, off=0.8, sw=0.8,
               inner=[f'<path d="{L(at(4, 0), at(blen - 2, 0), closed=False)}" fill="none" stroke="#7a8890" stroke-width=".5"/>'
                      f'<path d="{L(at(4.4, -1), at(blen - 4, -1), closed=False)}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width=".7"/>'])
        if st >= 5:
            a.line(L(at(6, 0.6), at(blen - 6, 0.6), closed=False), "#b6ff9a", 0.7, 0.9)
        a.part(S(at(2, -4.4), at(3.6, -4), at(3.6, 4), at(2, 4.4), sharp=(0, 1, 2, 3)), "gold" if gold else "bronze", shade=0.2, light=0.3, off=0.5, sw=0.7)
        pom = at(-4.4)
        a.part(ell(*pom, 2, 2), "gold" if gold else "bronze", shade=0.2, light=0.4, off=0.5, sw=0.7)
        if st >= 4:
            a.flat(ell(*pom, 0.8, 0.8), "#2f8a3a")
    a.part(ell(*hand, 3.7, 3.4, 30), "skin", shade=0.4, light=0.3, off=1.0, sw=0.9)
    a.line(O((hand[0] - 2.2, hand[1] - 1.6), (hand[0] - 0.2, hand[1] - 0.4), (hand[0] + 1.4, hand[1] + 1.6)), "#8a4a30", 0.5, 0.7)
    # --- near arm + oval shield held forward -----------------------------------------------------
    a.part(limb((64.6, 46), (61, 59.6), 10.6, 8, 1.6), "skin", shade=0.42, light=0.3, off=1.6)
    if st >= 3:
        pm = "gold" if st >= 5 else ("bronze" if st == 4 else "leather")
        a.part(S((60, 42.6), (68.6, 42.6), (70.6, 49), (64.6, 51.6), (59.4, 48)), pm, shade=0.45, light=0.45, off=1.2, sw=0.85)
    a.part(limb((61, 59.6), (49, 64.6), 8, 6.4, 1.2, 0.4), "skin", shade=0.42, light=0.3, off=1.4)
    if st >= 2:
        a.part(limb((56.6, 61.6), (51.6, 63.6), 7.4, 6.8), "gold" if gold else ("bronze" if st >= 3 else "leather"), shade=0.3, light=0.4, off=0.6, sw=0.7)
    sx, sy, rx, ry, rot = 40, 78, 12.6, 23, -8
    sh = ell(sx, sy, rx, ry, rot)
    face = {1: "wood", 2: "green", 3: "green", 4: "green", 5: "greend"}[st]
    inner = [f'<path d="{L((sx + 1.6, sy - 24), (sx - 1.6, sy + 24), closed=False)}" fill="none" stroke="#3f2716" stroke-opacity=".6" stroke-width="2.2"/>']
    if st == 1:
        inner.append(f'<path d="{L((sx - 6, sy - 22), (sx - 9, sy + 22), closed=False)}{L((sx + 6, sy - 22), (sx + 3, sy + 22), closed=False)}" fill="none" stroke="#4a2e14" stroke-opacity=".5" stroke-width=".7"/>')
    if st >= 3:  # triskele-ish curls
        col = "#f2c95a" if gold else "#cf9550"
        cur = (O((sx - 1, sy - 8), (sx - 6, sy - 12), (sx - 5, sy - 17), (sx - 1, sy - 16)) + O((sx + 0.4, sy + 8), (sx + 6, sy + 12), (sx + 4, sy + 17), (sx, sy + 16)))
        inner.append(f'<path d="{cur}" fill="none" stroke="{col}" stroke-width="1.6"/>')
    a.part(sh, face, shade=0.45, light=0.3, off=2.4, inner=inner)
    rim = "#e6b84a" if gold else ("#b07a3a" if st >= 3 else "#6e4a2a")
    a.line(sh, rim, 1.7)
    a.line(ell(sx, sy, rx + 0.85, ry + 0.85, rot), OUTL, 0.7, 0.75)
    # spindle boss
    a.part(S((sx - 1.4, sy - 9), (sx + 3.4, sy - 5), (sx + 3.6, sy + 5), (sx - 2.2, sy + 9), (sx - 4.4, sy + 4), (sx - 4.4, sy - 4)), "gold" if gold else ("bronze" if st >= 2 else "iron"),
           shade=0.45, light=0.5, off=1.0, sw=0.8)
    a.flat(ell(sx - 1.6, sy - 2.6, 1.2, 2.2, -8), "#fff", op=0.7)
    if st >= 4:
        d = "".join(ell(sx + math.cos(t) * rx * 0.99 + math.sin(math.radians(rot)) * 0, sy + math.sin(t) * ry, 0.7, 0.7) for t in [i * math.pi / 7 for i in range(14)])
        a.flat(d, "gold", sw=0.3)
    # --- cloak brooch on the near shoulder --------------------------------------------------------
    if st >= 2:
        r = 1.8 + (st >= 4) * 0.8 + (st >= 5) * 0.4
        a.part(ell(62.4, 42.4, r, r), "gold" if gold else "bronze", shade=0.3, light=0.5, off=0.6, sw=0.7)
        if st >= 4:
            a.flat(ell(62.4, 42.4, r * 0.45, r * 0.45), "#2f8a3a")
    return a.svg()


# ---------------------------------------------------------------- 16x16 bust icons (stage-3 hero)
def icon(tribe):
    """Small bust of the stage-3 hero: <= 15 shapes, outline 0.6, gradients only (no filters)."""
    px = {"romans": "ir", "teutons": "it", "gauls": "ig"}[tribe]
    defs = []
    body = []

    def gr(name, stops):
        gid = f"{px}{len(defs)}"
        st = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1">{st}</linearGradient>')
        return f"url(#{gid})"

    def sh(d, fill, sw=0.6, extra=""):
        st = f' stroke-width="{sw}"' if sw else ("" if "stroke=" in extra else ' stroke="none"')
        body.append(f'<path d="{compact(d)}" fill="{fill}"{st}{extra}/>')

    skin = gr("skin", [(0, "#f6d2ab"), (1, "#c98a5e")])
    cx, cy, hs = 7.4, 8.0, 0.39

    def g(x, y):
        return (cx + x * hs, cy + y * hs)

    face = S(*[g(*p) for p in FACE], sharp=(9,))
    eye = ell(*g(-2.9, -0.2), 0.5, 0.6)
    if tribe == "romans":
        sh(S((0.8, 16), (1.6, 13.1), (5, 11.5), (11, 11.5), (14.6, 13.3), (15.4, 16), sharp=(0, 5)), gr("red", [(0, "#d4544a"), (1, "#6e1a1c")]))
        sh(S((2.8, 16), (3.4, 13.5), (8, 12.1), (12.4, 13.5), (13, 16), sharp=(0, 4)), gr("st", [(0, "#f6f8f6"), (0.5, "#b4bec4"), (1, "#66727a")]))
        sh(L((6.4, 9.4), (9.4, 9.4), (9.6, 13), (6.2, 13)), skin)
        sh(face, skin)
        sh(eye, "#2a1c12", 0)
        sh(S(g(-0.6, -12.6), g(1.6, -18.4), g(8, -20), g(14.6, -15.6), g(15.6, -9.6), g(10.4, -11), g(5, -12.6), sharp=(0, 4)), gr("pl", [(0, "#e45a48"), (1, "#701618")]))
        sh(S(g(-7.4, -2.4), g(-6.6, -8.2), g(-1, -12.4), g(5.4, -11.6), g(9.6, -6.4), g(10.6, -0.6), g(4, -2.6), g(-2.4, -3.4), sharp=(0, 6)), gr("hm", [(0, "#ffffff"), (0.5, "#c0c8cc"), (1, "#5e6a72")]))
        sh(S(g(1.4, -3), g(5.4, -2.2), g(5.4, 4.6), g(3, 9.2), g(0.6, 7.6), g(0.8, 2)), gr("bz", [(0, "#f6d39a"), (1, "#8a5420")]))
        sh(O(g(-7, -3), g(-2.4, -4.2), g(4, -3.4), g(10, -1)), "none", 0, ' stroke="#c48a2a" stroke-width=".7"')
        sh(ell(12.2, 12.6, 1.1, 1.1), "#f2c95a", 0.45)
    elif tribe == "teutons":
        sh(S((0.6, 16), (1.4, 13.3), (5, 11.700000000000001), (11, 11.700000000000001), (14.8, 13.3), (15.4, 16), sharp=(0, 5)), gr("ir", [(0, "#b8bec0"), (0.5, "#7f888c"), (1, "#454c52")]))
        sh(L((6.6, 9.6), (9.6, 9.6), (9.8, 13), (6.4, 13)), skin)
        hair = gr("hr", [(0, "#d48a44"), (1, "#5e2e12")])
        sh(S(g(2, -6), g(9.4, -4), g(11.6, 4), g(12, 13.6), g(7.6, 14), g(4.4, 6)), hair)
        sh(face, skin)
        sh(eye, "#2a1c12", 0)
        sh(S(g(4.6, 1.2), g(4.8, 7), g(1, 14), g(-2.4, 17), g(-5, 13), g(-7, 6.4), g(-4.4, 6.6), g(-1, 6), g(1.8, 3.4)), hair)
        sh(S(*tufted([(9.4, 12.6), (11.6, 11.2), (14.4, 12.4)], 0.7, 1.1, 4) + [(15, 14.2), (12, 13.6)]),
           gr("fu", [(0, "#b49268"), (1, "#4e3a24")]), 0.5)
        horn = gr("hn", [(0, "#fbf0d4"), (1, "#8a6e46")])
        sh(S(g(-4.4, -6.8), g(-8.6, -8.4), g(-11.6, -13.4), g(-11, -19.4), g(-8.4, -14), g(-4.6, -11.6), sharp=(3,)), horn, 0.5)
        sh(S(g(7.4, -5.6), g(11.6, -7), g(14.6, -11.8), g(14.2, -18), g(11.4, -12.6), g(7.4, -10.4), sharp=(3,)), horn, 0.5)
        sh(S(g(-7.8, -2.4), g(-7.2, -8), g(-2.4, -12.6), g(4, -12.6), g(8.8, -8.4), g(10, -2.4), g(4, -3.4), g(-2.2, -3.8), sharp=(0, 5)),
           gr("hm", [(0, "#e6eaec"), (0.5, "#8a9498"), (1, "#3e464c")]))
        sh(O(g(0.6, -12.6), g(0.4, -3.8)) + O(g(-7.6, -2.6), g(-2.2, -4.2), g(4, -3.6), g(9.8, -1.6)), "none", 0, ' stroke="#c8a050" stroke-width=".7"')
        sh(L(g(-7.8, -2.4), g(-6, -2.6), g(-6.2, 2.8), g(-7.4, 3)), "#7f888c", 0.4)
    else:
        sh(S((1, 16), (1.4, 13.1), (5, 11.3), (11, 11.3), (14.8, 13.1), (15.4, 16), sharp=(0, 5)), gr("gn", [(0, "#8cbc6a"), (0.5, "#4f8a3e"), (1, "#244a22")]))
        sh(S((3, 16), (3.4, 13.700000000000001), (8, 12.3), (12, 13.5), (12.6, 16), sharp=(0, 4)), gr("ir", [(0, "#d8dcde"), (0.5, "#8a9498"), (1, "#4e565c")]))
        sh(L((6.4, 9.4), (9.4, 9.4), (9.6, 13), (6.2, 13)), skin)
        hair = gr("hr", [(0, "#f0d08a"), (1, "#7a5524")])
        sh(S(g(-2, -10), g(6, -9), g(13, -5), g(19, -2), g(15, 2), g(17, 7), g(11, 8), g(8, 12), g(4, 4), sharp=(3, 5, 7)), hair)
        sh(face, skin)
        sh(eye, "#2a1c12", 0)
        sh(S(g(-6.8, 3.8), g(-3, 3.6), g(-2.4, 5.6), g(-3.2, 10), g(-4.8, 10), g(-5.4, 6.6), g(-7, 6.6)), hair, 0.45)
        sh(S(g(-7.6, -2.6), g(-7, -7.8), g(-2.4, -12.2), g(4, -12.2), g(8.8, -8), g(10, -2.4), g(4, -3.4), g(-2.2, -3.8), sharp=(0, 5)),
           gr("bz", [(0, "#f6d39a"), (0.45, "#cf9550"), (1, "#6a3f1c")]))
        sh(S(g(1.4, -3), g(5.2, -2.2), g(5.2, 4.4), g(2.8, 8.4), g(0.8, 7), g(0.8, 2)), gr("bz2", [(0, "#f6d39a"), (1, "#8a5420")]), 0.45)
        sh(O((5.4, 11.6), (8, 12.8), (10.6, 11.6)), "none", 0, ' stroke="#f2c95a" stroke-width=".9"')
        sh(ell(*g(0.6, -12.8), 0.6, 0.55), "#cf9550", 0.4)
    n = len(body)
    assert n <= 15, (tribe, n)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><defs>{"".join(defs)}</defs>'
            f'<g stroke="{OUTL}" stroke-opacity=".85" stroke-linejoin="round" stroke-linecap="round">{"".join(body)}</g></svg>')


def main():
    os.makedirs(HERO_DIR, exist_ok=True)
    for st in range(1, 6):
        for tribe, fn in (("romans", romans), ("teutons", teutons), ("gauls", gauls)):
            with open(os.path.join(HERO_DIR, f"{tribe}-{st}.svg"), "w") as fh:
                fh.write(fn(st))
    for tribe in ("romans", "teutons", "gauls"):
        with open(os.path.join(UNIT_DIR, f"hero-{tribe}.svg"), "w") as fh:
            fh.write(icon(tribe))




def preview(outdir, tribes=("romans", "teutons", "gauls"), tag="paint-hero"):
    """Contact sheets: 1x, 2x, in frame+backdrop (120x150), icons 16/32 px."""
    import subprocess
    img = os.path.join(ROOT, "src/web/public/img")
    rows1 = rows2 = rows3 = ""
    for t in tribes:
        if not os.path.exists(os.path.join(HERO_DIR, f"{t}-1.svg")):
            continue
        r1 = r2 = r3 = ""
        for s in range(1, 6):
            src = f"file://{HERO_DIR}/{t}-{s}.svg"
            r1 += f'<img src="{src}" width="120" height="140" style="background:#e9e3cf;margin:4px">'
            r2 += f'<img src="{src}" width="240" height="280" style="background:#d9d0b8;margin:4px">'
            r3 += (f'<div style="position:relative;display:inline-block;width:120px;height:150px;margin:6px">'
                   f'<img src="file://{img}/hero/backdrop-{s}.svg" width="120" height="150" style="position:absolute;left:0;top:0">'
                   f'<img src="{src}" width="120" height="140" style="position:absolute;left:0;top:10px">'
                   f'<img src="file://{img}/hero/frame-{s}.svg" width="120" height="150" style="position:absolute;left:0;top:0"></div>')
        rows1 += f"<div>{r1}</div>"
        rows2 += f"<div>{r2}</div>"
        rows3 += f"<div>{r3}</div>"
    icons = ""
    for t in tribes:
        p = os.path.join(UNIT_DIR, f"hero-{t}.svg")
        if os.path.exists(p):
            icons += "".join(f'<img src="file://{p}" width="{z}" height="{z}" style="margin:6px;background:{bg}">' for z in (16, 20, 32, 64) for bg in ("#fff", "#f2efe4"))
    pages = {"1x": rows1, "2x": rows2, "frame": rows3, "icons": f"<div>{icons}</div>"}
    for name, body in pages.items():
        if not body.strip("<div></div>"):
            continue
        hp = os.path.join(outdir, f"{tag}-{name}.html")
        with open(hp, "w") as fh:
            fh.write(f'<body style="margin:6px;background:#fff">{body}</body>')
        subprocess.run([sys.executable, os.path.join(outdir, "hero", "render.py"), os.path.join(outdir, f"{tag}-{name}.png"), hp, "1300"], check=True)



# ---------------------------------------------------------------- shared extras
import random


def tufted(pts, amp=1.6, step=2.6, seed=1, closed=False):
    """Insert alternating fur tufts along a polyline; returns a new point list."""
    rnd = random.Random(seed)
    out = []
    n = len(pts)
    segs = n if closed else n - 1
    for i in range(segs):
        a0, a1 = pts[i], pts[(i + 1) % n]
        dx, dy = a1[0] - a0[0], a1[1] - a0[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = dy / ln, -dx / ln
        k = max(1, int(ln / step))
        for j in range(k):
            t = j / k
            x, y = a0[0] + dx * t, a0[1] + dy * t
            out.append((x, y))
            t2 = (j + 0.5) / k
            r = amp * (0.6 + rnd.random() * 0.7)
            out.append((a0[0] + dx * t2 + nx * r, a0[1] + dy * t2 + ny * r))
    if not closed:
        out.append(pts[-1])
    return out


def fur_strokes(region, n, length, seed, ang=100, spread=30):
    """Short curved hair strokes scattered inside a bbox (x0, y0, x1, y1)."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = region
    d = ""
    for _ in range(n):
        x = x0 + rnd.random() * (x1 - x0)
        y = y0 + rnd.random() * (y1 - y0)
        a = math.radians(ang + (rnd.random() - 0.5) * spread)
        l = length * (0.6 + rnd.random() * 0.6)
        ex, ey = x + math.cos(a) * l, y + math.sin(a) * l
        d += L((x, y), (ex, ey), closed=False)
    return d


if __name__ == "__main__":
    main()
    if "--preview" in sys.argv:
        preview(sys.argv[sys.argv.index("--preview") + 1])
