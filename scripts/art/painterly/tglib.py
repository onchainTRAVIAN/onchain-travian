"""Painterly figure kit for the Teuton and Gaul unit art (120x140 big figures).

Same visual language as scripts/art/painterly/romans.py (the quality bar): warm light
from the top-left, every surface a lit->shade gradient, a per-part "volume" filter
(warm rim inside the top-left edge, soft core shadow inside the bottom-right edge),
blurred painted shading, soft brown outline, blurred ground shadow.

Limbs are tapered muscle profiles (thigh/upper-arm bulge -> knee/elbow -> calf/forearm
bulge -> thin ankle/wrist), horses have muscular upper legs, slim cannons, fetlocks and
hooves.  Faces have eyes with catchlights, brows, nose, mouth; beards and moustaches
are volumetric with strands.  Textures (mail, fur, checked cloth, wood grain) are clipped
to the part they belong to.

Usage:  from tglib import *;  begin("teu1-");  o = [...];  svg(o)
All art is original.
"""
from __future__ import annotations

import math
import random

OUT = "#3b2a17"
OUTO = ".75"
K = 0.75
SW = 1.4

# ---------------------------------------------------------------- palette (mid tones)
SKIN, SKIN_D, SKIN_L = "#e6b386", "#b9805a", "#f8dab8"
STEEL, STEEL_D, STEEL_L = "#b9c0c7", "#767f88", "#eef1f4"
DSTEEL = "#8d959d"
GOLD, GOLD_D, GOLD_L = "#d4a43a", "#9a6e1e", "#f6d985"
BRONZE, BRONZE_D, BRONZE_L = "#c58a3c", "#8a5a1e", "#f0c878"
LEA, LEA_D, LEA_L = "#8a5a2b", "#55361a", "#b0804e"
WOOD, WOOD_D, WOOD_L = "#9c6c3e", "#654121", "#cc9c6c"
FUR, FUR_D, FUR_L = "#7c5532", "#4c3119", "#a98059"
BLUE, BLUE_D, BLUE_L = "#2f4f7a", "#1d3352", "#5d80ae"          # Teuton blue
GREEN, GREEN_D, GREEN_L = "#3f7a32", "#264d1e", "#72a659"       # Gaul green
CHK, CHK_D, CHK_L = "#3a67a6", "#24467a", "#6d93c9"             # Gaul checked blue
CHKLINE = "#a9c6ea"
CREAM, CREAM_D = "#ece5d2", "#b9ae94"
WHITE, WHITE_D = "#efe8d8", "#c2b79e"
BLACK, BLACK_L = "#34373c", "#5d636b"                           # blackened plate
RED, RED_D, RED_L = "#a8322a", "#74201a", "#d0604f"
GINGER, BLOND, BROWN, GREYH = "#b45a2a", "#d6a54c", "#6b4423", "#d9d2c3"
HORN = "#e8dcc0"
STONE = "#8a847a"
ROPE = "#c9b07a"
SACK = "#c9a66c"
DRESS, DRESS_D = "#8e3a2a", "#5e2418"
OAK = "#4f7a2e"

# horse coats
GREYC, GREYC_D = "#d4cec2", "#9a9384"
IRONC, IRONC_D = "#585e67", "#2e3238"
DUN, DUN_D = "#c9a263", "#8e6c34"
WHITEC, WHITEC_D = "#eeeae0", "#b7b0a0"
BAY, BAY_D = "#7a4a28", "#4c2c16"
SORREL, SORREL_D = "#9a4a2a", "#62281a"
OX, OX_D = "#8a6a4a", "#56402a"

# ---------------------------------------------------------------- per-file registry
PFX = "x-"
USED: dict[str, str] = {}
RND = random.Random(1)


def begin(pfx: str) -> None:
    global PFX, USED, RND, _CID
    PFX = pfx
    USED = {}
    RND = random.Random(sum(map(ord, pfx)))
    _CID = 0


def _stops(stops):
    return "".join(f'<stop offset="{o}" stop-color="{c}"/>' for c, o in stops)


def lin(stops, x1=0.15, y1=0, x2=0.85, y2=1):
    return lambda i: f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{_stops(stops)}</linearGradient>'


def rad(stops, cx=0.35, cy=0.3, r=0.85):
    return lambda i: f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">{_stops(stops)}</radialGradient>'


def L3(a, b, c):
    return lin([(a, 0), (b, .5), (c, 1)])


GRADS = {
    "skin": rad([("#fbe0c0", 0), ("#e8b588", .5), ("#b67b52", 1)], .35, .3, .9),
    "steel": lin([("#fbfcfd", 0), ("#d0d6db", .25), ("#959ea7", .55), ("#59616a", .82), ("#959da4", 1)]),
    "steeld": lin([("#b0b8bf", 0), ("#7c858e", .5), ("#4b525a", 1)]),
    "steelr": rad([("#ffffff", 0), ("#d6dce1", .3), ("#8d959d", .75), ("#4b525a", 1)], .36, .3, .8),
    "gold": lin([("#fbe9a6", 0), ("#e0b04a", .35), ("#a97820", .75), ("#74500f", 1)]),
    "goldr": rad([("#fff2bf", 0), ("#e8bb52", .35), ("#a97820", .8), ("#6d4a0e", 1)], .38, .32, .75),
    "bronze": lin([("#fbe1a4", 0), ("#d7a050", .3), ("#9a6424", .72), ("#5e3a10", 1)]),
    "bronzer": rad([("#fff0c8", 0), ("#dca456", .35), ("#94601f", .8), ("#58360e", 1)], .36, .3, .8),
    "lea": L3("#b8854f", "#8a5a2b", "#4f3118"),
    "leal": L3("#d0a06a", "#ad7b45", "#6f4a25"),
    "lead": L3("#7a5230", "#55361a", "#34200e"),
    "wood": L3("#d1a06c", "#9c6c3e", "#5e3c1c"),
    "woodd": L3("#8e6440", "#654121", "#3c2610"),
    "woodl": L3("#ead0a8", "#c9996a", "#8a6038"),
    "fur": lin([("#b58a5e", 0), ("#7c5532", .5), ("#40280f", 1)]),
    "furd": L3("#6e4a2c", "#4c3119", "#2a1a0a"),
    "blue": L3("#5d80ae", "#2f4f7a", "#162843"),
    "blued": L3("#34537e", "#1d3352", "#0e1b2e"),
    "green": L3("#7cb062", "#3f7a32", "#1d3d16"),
    "greend": L3("#3e6a30", "#264d1e", "#12280c"),
    "chk": L3("#6d93c9", "#3a67a6", "#1c3866"),
    "cream": L3("#fffdf6", "#ece5d2", "#ada188"),
    "white": L3("#fffdf7", "#efe8d8", "#bfb398"),
    "black": lin([("#8a9098", 0), ("#4a4e55", .3), ("#2a2d32", .7), ("#4e535a", 1)]),
    "red": L3("#d9675a", "#a8322a", "#64180f"),
    "ginger": L3("#e08a50", "#b45a2a", "#6e2f12"),
    "blond": L3("#f6d690", "#d6a54c", "#8e6420"),
    "brown": L3("#9a6a42", "#6b4423", "#3a220e"),
    "greyh": L3("#ffffff", "#d9d2c3", "#958c7a"),
    "horn": lin([("#fffaf0", 0), ("#e8dcc0", .45), ("#a89470", 1)], 0, 0, 1, 0.3),
    "stone": rad([("#bab4aa", 0), ("#8a847a", .55), ("#4a4640", 1)], .35, .3, .85),
    "rope": L3("#efdcaa", "#c9b07a", "#8a7344"),
    "sack": L3("#ecd2a0", "#c9a66c", "#8a6a3a"),
    "dress": L3("#c06a52", "#8e3a2a", "#4e1a10"),
    "oak": L3("#8fc160", "#4f7a2e", "#2e5218"),
    "hoof": L3("#5a4c42", "#2b2420", "#15100d"),
    # horse coats (radial: barrel-like)
    "greyc": rad([("#ffffff", 0), ("#d4cec2", .5), ("#857e70", 1)], .4, .25, .85),
    "ironc": rad([("#8d949c", 0), ("#585e67", .5), ("#24282d", 1)], .4, .25, .85),
    "dun": rad([("#f0d098", 0), ("#c9a263", .5), ("#7a5a28", 1)], .4, .25, .85),
    "whitec": rad([("#ffffff", 0), ("#eeeae0", .45), ("#a39c8a", 1)], .4, .25, .85),
    "bay": rad([("#b07a48", 0), ("#7a4a28", .5), ("#3e2312", 1)], .4, .25, .85),
    "sorrel": rad([("#d0784c", 0), ("#9a4a2a", .5), ("#4e1e10", 1)], .4, .25, .85),
    "ox": rad([("#b8987a", 0), ("#8a6a4a", .5), ("#4a3622", 1)], .4, .25, .85),
    "greycd": L3("#b4ad9e", "#9a9384", "#6a6456"),
    "ironcd": L3("#454a52", "#2e3238", "#16191c"),
    "dund": L3("#ad8a50", "#8e6c34", "#5a4218"),
    "whitecd": L3("#d8d2c4", "#b7b0a0", "#857e6c"),
    "bayd": L3("#6a4026", "#4c2c16", "#2a170a"),
    "sorreld": L3("#844030", "#62281a", "#38140a"),
    "oxd": L3("#70543a", "#56402a", "#33251a"),
    "mane": lin([("#5a3a22", 0), ("#2a1a10", .6), ("#140c07", 1)]),
    "manel": lin([("#ffffff", 0), ("#c9c2b2", .55), ("#8a8274", 1)]),
    "maneg": lin([("#8a8478", 0), ("#5e5850", .55), ("#34302a", 1)]),
    "maneb": lin([("#a07048", 0), ("#6b4423", .55), ("#3a220e", 1)]),
}

MAT = {
    SKIN: "skin", STEEL: "steel", STEEL_D: "steeld", DSTEEL: "steeld", GOLD: "gold", BRONZE: "bronze",
    LEA: "lea", LEA_L: "leal", LEA_D: "lead", WOOD: "wood", WOOD_D: "woodd", WOOD_L: "woodl",
    FUR: "fur", FUR_D: "furd", BLUE: "blue", BLUE_D: "blued", GREEN: "green", GREEN_D: "greend",
    CHK: "chk", CREAM: "cream", WHITE: "white", BLACK: "black", RED: "red",
    GINGER: "ginger", BLOND: "blond", BROWN: "brown", GREYH: "greyh", HORN: "horn", STONE: "stone",
    ROPE: "rope", SACK: "sack", DRESS: "dress", OAK: "oak",
    GREYC: "greyc", IRONC: "ironc", DUN: "dun", WHITEC: "whitec", BAY: "bay", SORREL: "sorrel", OX: "ox",
    GREYC_D: "greycd", IRONC_D: "ironcd", DUN_D: "dund", WHITEC_D: "whitecd", BAY_D: "bayd", SORREL_D: "sorreld",
    OX_D: "oxd",
}


def g(name: str) -> str:
    USED[name] = GRADS[name](PFX + name)
    return f"url(#{PFX}{name})"


def paint(fill: str) -> str:
    return g(MAT[fill]) if fill in MAT else fill


def fx(name: str) -> str:
    USED["f-" + name] = name
    return f'filter="url(#{PFX}{name})"'


FILTERS = {
    "soft": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440"><feGaussianBlur stdDeviation=".9"/></filter>',
    "soft2": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440"><feGaussianBlur stdDeviation="1.8"/></filter>',
    "shadow": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-30" y="80" width="180" height="80"><feGaussianBlur stdDeviation="2.4"/></filter>',
    "vol": ('<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440" color-interpolation-filters="sRGB">'
            '<feOffset in="SourceAlpha" dx="1" dy="1" result="a1"/>'
            '<feOffset in="SourceAlpha" dx="2.4" dy="2.4" result="a2"/>'
            '<feComposite in="a1" in2="SourceAlpha" operator="in" result="b1"/>'
            '<feComposite in="b1" in2="a2" operator="out" result="b2"/>'
            '<feGaussianBlur in="b2" stdDeviation=".6" result="b3"/>'
            '<feFlood flood-color="#fff0cc" flood-opacity=".55"/>'
            '<feComposite in2="b3" operator="in" result="lit"/>'
            '<feOffset in="SourceAlpha" dx="-.8" dy="-.8" result="d1"/>'
            '<feOffset in="SourceAlpha" dx="-3.6" dy="-3.6" result="d2"/>'
            '<feComposite in="d1" in2="SourceAlpha" operator="in" result="e1"/>'
            '<feComposite in="e1" in2="d2" operator="out" result="e2"/>'
            '<feGaussianBlur in="e2" stdDeviation="1.3" result="e3"/>'
            '<feFlood flood-color="#2a1406" flood-opacity=".38"/>'
            '<feComposite in2="e3" operator="in" result="dk"/>'
            '<feMerge result="m"><feMergeNode in="dk"/><feMergeNode in="lit"/></feMerge>'
            '<feComposite in="m" in2="SourceAlpha" operator="in" result="mc"/>'
            '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="mc"/></feMerge></filter>'),
}

_CID = 0


def clip(d: str) -> str:
    """Register a clipPath for path data d; returns the id."""
    global _CID
    _CID += 1
    cid = f"{PFX}c{_CID}"
    USED["c-" + cid] = f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
    return cid


def clipped(d: str, *items) -> str:
    body = "".join(i if isinstance(i, str) else "".join(i) for i in items)
    return f'<g clip-path="url(#{clip(d)})">{body}</g>'


def defs() -> str:
    out = []
    for k, v in USED.items():
        if k.startswith("f-"):
            out.append(FILTERS[v].format(i=PFX + v))
        else:
            out.append(v)
    return "".join(out)


# ---------------------------------------------------------------- primitives

def n(v: float) -> str:
    s = f"{v:.1f}"
    if s == "-0.0":
        s = "0"
    return s[:-2] if s.endswith(".0") else s


def _so(stroke: str) -> str:
    return f' stroke-opacity="{OUTO}"' if stroke == OUT else ""


def P(d: str, fill: str, sw: float = SW, stroke: str = OUT, extra: str = "") -> str:
    return f'<path d="{d}" fill="{paint(fill)}" stroke="{stroke}" stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}{extra}/>'


def S(d: str, fill: str, op: float | None = None) -> str:
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<path d="{d}" fill="{paint(fill)}" stroke="none"{o}/>'


def SH(d: str, fill: str, op: float = .55, f: str = "soft") -> str:
    return f'<path d="{d}" fill="{fill}" stroke="none" fill-opacity="{op}" {fx(f)}/>'


def L(d: str, stroke: str, w: float = 1, op: float | None = None) -> str:
    o = f' stroke-opacity="{op}"' if op is not None else (_so(stroke))
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}"{o}/>'


def LS(d: str, stroke: str, w: float = 1, op: float = .6, f: str = "soft") -> str:
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}" stroke-opacity="{op}" {fx(f)}/>'


def V(*items) -> str:
    body = "".join(i if isinstance(i, str) else "".join(i) for i in items)
    return f'<g {fx("vol")}>{body}</g>'


def circ(cx, cy, r, fill, sw=SW, stroke=OUT) -> str:
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{paint(fill)}" stroke="{stroke}" stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}/>'


def ell(cx, cy, rx, ry, fill, sw=SW, stroke=OUT, rot=0) -> str:
    t = f' transform="rotate({rot} {n(cx)} {n(cy)})"' if rot else ""
    return (f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{paint(fill)}" stroke="{stroke}" '
            f'stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}{t}/>')


def spec(cx, cy, rx, ry, op=.85, rot=0, col="#ffffff") -> str:
    t = f' transform="rotate({rot} {n(cx)} {n(cy)})"' if rot else ""
    return f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{col}" fill-opacity="{op}" stroke="none" {fx("soft")}{t}/>'


def dot(cx, cy, r, fill, op=None) -> str:
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{paint(fill)}" stroke="none"{o}/>'


def rivet(cx, cy, r=0.75, metal="gold") -> str:
    if metal == "steel":
        return dot(cx, cy, r, "#5d656e") + dot(cx - r * .3, cy - r * .3, r * .5, "#f4f6f8")
    return dot(cx, cy, r, GOLD_D) + dot(cx - r * .3, cy - r * .3, r * .5, GOLD_L)


def shadow(cx: float = 60, rx: float = 36, ry: float = 6, cy: float = 128) -> str:
    return (f'<ellipse cx="{n(cx + 3)}" cy="{cy}" rx="{n(rx)}" ry="{n(ry)}" fill="#2b1a0b" fill-opacity=".32" {fx("shadow")}/>'
            f'<ellipse cx="{n(cx + 1)}" cy="{cy}" rx="{n(rx * .55)}" ry="{n(ry * .5)}" fill="#2b1a0b" fill-opacity=".18" {fx("soft")}/>')


def svg(body: list[str]) -> str:
    content = "".join(body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><defs>{defs()}</defs>'
            f'<g stroke-linejoin="round" stroke-linecap="round">{content}</g></svg>')


def smooth(pts, closed=True) -> str:
    """Catmull-Rom spline through pts -> cubic path data."""
    m = len(pts)
    d = f"M{n(pts[0][0])},{n(pts[0][1])}"
    segs = m if closed else m - 1
    for i in range(segs):
        p0 = pts[(i - 1) % m] if (closed or i > 0) else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % m]
        p3 = pts[(i + 2) % m] if (closed or i + 2 < m) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{n(c1[0])},{n(c1[1])} {n(c2[0])},{n(c2[1])} {n(p2[0])},{n(p2[1])}"
    return d + ("Z" if closed else "")


# ---------------------------------------------------------------- limbs

TUBE_LIT = {SKIN: SKIN_L, RED: RED_L, WHITE: "#fffdf7", CREAM: "#fffdf6", LEA: LEA_L, LEA_L: "#d0a06a",
            BLUE: BLUE_L, CHK: CHK_L, GREEN: GREEN_L, FUR: FUR_L, STEEL: "#ffffff", BLACK: BLACK_L,
            WOOD: WOOD_L, GREYC: "#ffffff", IRONC: "#8d949c", DUN: "#f0d098", WHITEC: "#ffffff",
            BAY: "#b07a48", SORREL: "#d0784c", OX: "#b8987a", GREYC_D: "#c8c2b4", IRONC_D: "#5d636b",
            DUN_D: "#b8944c", WHITEC_D: "#d8d2c4", BAY_D: "#6a4026", SORREL_D: "#844030", OX_D: "#70543a"}


def _pts(d: str):
    return [tuple(float(v) for v in tok.split(",")) for tok in d.replace("M", " ").replace("L", " ").split()]


def _profile(npts: int, seg: int, t: float, length: float, kind: str = "") -> float:
    if kind == "horse":                   # muscular forearm/gaskin, slim cannon, fetlock knob
        if seg == 0:
            return 1.0 + 0.06 * math.sin(math.pi * t) - 0.4 * t
        return 0.6 - 0.1 * t + 0.14 * math.exp(-((t - 0.88) / 0.09) ** 2)
    if kind == "even":
        return 1.0
    if length < 11:
        return 1.0
    if npts == 2:
        return 1.0 - 0.2 * t + 0.05 * math.sin(math.pi * t)
    if seg == 0:
        return 1.0 + 0.07 * math.sin(math.pi * t) - 0.22 * t
    return 0.8 + 0.14 * math.sin(math.pi * min(1.0, t * 1.6)) - 0.26 * t


def tube_d(d: str, w: float, kind: str = "") -> str:
    pts = _pts(d)
    w *= 1.1
    total = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    samples = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        ln = math.dist(pts[i], pts[i + 1]) or 1
        k = max(2, int(ln / 3.6))
        for j in range(k + (1 if i == len(pts) - 2 else 0)):
            t = j / k
            samples.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, i, t))
    out = []
    for idx, (x, y, i, t) in enumerate(samples):
        a = samples[max(0, idx - 1)]
        b = samples[min(len(samples) - 1, idx + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        if nx * -1 + ny * -0.6 < 0:
            nx, ny = -nx, -ny
        out.append((x, y, nx, ny, w * _profile(len(pts), i, t, total, kind), dx / ln, dy / ln))
    lit_side = [(x + nx * wi / 2, y + ny * wi / 2) for x, y, nx, ny, wi, _, _ in out]
    dark_side = [(x - nx * wi / 2, y - ny * wi / 2) for x, y, nx, ny, wi, _, _ in out]

    def cap(p, sign):
        x, y, nx, ny, wi, ux, uy = p
        r = wi / 2
        return [(x + (nx * math.cos(a) + sign * ux * math.sin(a)) * r, y + (ny * math.cos(a) + sign * uy * math.sin(a)) * r)
                for a in (math.pi * k / 6 for k in range(1, 6))]
    ring = lit_side + cap(out[-1], 1)[:] + dark_side[::-1]
    ring += cap(out[0], -1)[::-1]
    tube_d.last = out
    return "M" + " L".join(f"{n(x)},{n(y)}" for x, y in ring) + "Z"


def tube(d: str, fill: str, w: float, vol: bool = True, kind: str = "", tex: str = "", sw: float = SW) -> str:
    """Tapered limb (thigh -> knee -> calf bulge -> ankle).  tex: 'check' | 'fur' | 'mail' | 'wrap'."""
    dd = tube_d(d, w, kind)
    out = tube_d.last
    s = f'<path d="{dd}" fill="{paint(fill)}" stroke="{OUT}" stroke-opacity="{OUTO}" stroke-width="{n(sw * K)}"/>'
    lit = TUBE_LIT.get(fill)
    if lit:
        st = [(x + nx * wi * .22, y + ny * wi * .22) for x, y, nx, ny, wi, _, _ in out[1:-1]]
        if len(st) >= 2:
            s += (f'<path d="M{" L".join(f"{n(x)},{n(y)}" for x, y in st)}" fill="none" stroke="{lit}" '
                  f'stroke-width="{n(w * .24)}" stroke-opacity=".55"/>')
    if tex:
        xs = [p[0] for p in out]
        ys = [p[1] for p in out]
        bb = (min(xs) - w, min(ys) - w, max(xs) + w, max(ys) + w)
        s += clipped(dd, texture(tex, bb))
    return f'<g {fx("vol")}>{s}</g>' if vol else s


def texture(kind: str, bb) -> str:
    x0, y0, x1, y1 = bb
    if kind == "check":
        d = ""
        x = x0
        while x < x1:
            d += f"M{n(x)},{n(y0)} L{n(x + (y1 - y0) * .18)},{n(y1)} "
            x += 4.2
        y = y0
        while y < y1:
            d += f"M{n(x0)},{n(y)} L{n(x1)},{n(y - (x1 - x0) * .12)} "
            y += 4.2
        return L(d, CHKLINE, .75, .75) + L(d, "#14284a", .5, .35).replace('d="', 'transform="translate(.9,.9)" d="')
    if kind == "fur":
        return fur_tex(bb)
    if kind == "mail":
        return mail_tex(bb)
    if kind == "wrap":   # leg wrappings / puttees
        d = ""
        y = y0
        while y < y1:
            d += f"M{n(x0)},{n(y)} L{n(x1)},{n(y + 3)} "
            y += 3.2
        return L(d, "#2a1406", .6, .45)
    if kind == "grain":
        return grain_tex(bb)
    return ""


def fur_tex(bb, dark="#2e1c0c", light="#d8b58a") -> str:
    """Fur: staggered columns of short dashes (tufts), dark and light."""
    x0, y0, x1, y1 = bb
    cols = [[], [], []]
    x = x0
    k = 0
    while x < x1:
        cols[k % 3].append(f"M{n(x)},{n(y0)} L{n(x + (y1 - y0) * .12)},{n(y1)} ")
        x += 1.45
        k += 1
    out = ""
    for i, c in enumerate(cols):
        d = "".join(c)
        if not d:
            continue
        col, w, op = (dark, .8, .6) if i != 1 else (light, .65, .6)
        out += (f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-opacity="{op}" '
                f'stroke-dasharray="2.6 {1.2 + i * .4}" stroke-dashoffset="{n(i * 1.3)}" stroke-linecap="round"/>')
    return out


def mail_tex(bb) -> str:
    """Riveted mail: rows of tiny rings drawn as round-capped zero-length dashes."""
    x0, y0, x1, y1 = bb
    step = 2.0
    ev, od = "", ""
    y = y0
    r = 0
    while y < y1:
        seg = f"M{n(x0)},{n(y)} L{n(x1)},{n(y)} "
        if r % 2:
            od += seg
        else:
            ev += seg
        y += 1.7
        r += 1
    out = ""
    for d, off in ((ev, 0), (od, step / 2)):
        if not d:
            continue
        da = f' stroke-dasharray="0 {step}" stroke-dashoffset="{n(off)}" stroke-linecap="round"'
        out += f'<path d="{d}" fill="none" stroke="#2a3036" stroke-width="2.1" stroke-opacity=".55"{da}/>'
        out += f'<path d="{d}" fill="none" stroke="#c9d0d6" stroke-width="1.45" stroke-opacity=".8"{da}/>'
        out += f'<path d="{d}" fill="none" stroke="#4a525a" stroke-width=".6" stroke-opacity=".8"{da}/>'
    return out


def grain_tex(bb) -> str:
    x0, y0, x1, y1 = bb
    d = ""
    horiz = (x1 - x0) >= (y1 - y0)
    k = 2.8
    if horiz:
        y = y0 + 1
        while y < y1:
            a = RND.uniform(.3, .9)
            d += f"M{n(x0)},{n(y)} " + " ".join(f"Q{n(x0 + 11 * (j + .5))},{n(y + (a if j % 2 else -a))} {n(x0 + 11 * (j + 1))},{n(y)}" for j in range(int((x1 - x0) / 11) + 1)) + " "
            y += k
    else:
        x = x0 + 1
        while x < x1:
            a = RND.uniform(.3, .9)
            d += f"M{n(x)},{n(y0)} " + " ".join(f"Q{n(x + (a if j % 2 else -a))},{n(y0 + 11 * (j + .5))} {n(x)},{n(y0 + 11 * (j + 1))}" for j in range(int((y1 - y0) / 11) + 1)) + " "
            x += k
    return L(d, "#3a2210", .5, .45)


def soft_folds(d: str, dark: str = "#2a1406", light: str | None = None, dl: str = "", w: float = 1.1) -> str:
    s = LS(d, dark, w, .45)
    if light and dl:
        s += LS(dl, light, w * .7, .5)
    return s


def part(d: str, fill: str, tex: str = "", sw: float = SW, bb=None, folds: str = "", fold_col: str = "#2a1406",
         lit: str = "", lit_col: str = "#fff2d8") -> str:
    """Filled body part with optional clipped texture, painted folds and a soft lit area."""
    s = P(d, fill, sw)
    inner = ""
    if tex:
        if bb is None:
            nums = [float(v) for v in __import__("re").findall(r"-?\d+(?:\.\d+)?", d)]
            xs, ys = nums[0::2], nums[1::2]
            bb = (min(xs) - 2, min(ys) - 2, max(xs) + 2, max(ys) + 2)
        inner += texture(tex, bb)
    if lit:
        inner += SH(lit, lit_col, .45, "soft2")
    if folds:
        inner += LS(folds, fold_col, 1.2, .5)
    if inner:
        s += clipped(d, inner)
    return V(s)


# ---------------------------------------------------------------- heads

def face(cx: float, cy: float, rx: float = 8.5, ry: float = 9.5, brow: str = BROWN, mouth: bool = True,
         grim: bool = False) -> list[str]:
    """Head in 3/4 view looking to the viewer's left."""
    o = [V(ell(cx, cy, rx, ry, SKIN),
           SH(f"M{n(cx+1.5)},{n(cy-ry+1.2)} Q{n(cx+rx-0.8)},{n(cy)} {n(cx+1.5)},{n(cy+ry-1.2)} Q{n(cx+rx*0.55)},{n(cy)} {n(cx+1.5)},{n(cy-ry+1.2)}Z", SKIN_D, .7),
           ell(cx + rx - 1.5, cy + 1, 1.8, 2.6, SKIN, 1))]
    o.append(L(f"M{n(cx+rx-1.9)},{n(cy-0.2)} Q{n(cx+rx-0.8)},{n(cy+1)} {n(cx+rx-1.8)},{n(cy+2.4)}", SKIN_D, .7, .8))
    o.append(spec(cx - 4.4, cy + 3, 2.4, 1.6, .35, 0, "#d26a4a"))
    o.append(spec(cx - 1.8, cy - 2.2, 4.5, 1.3, .25, 0, "#7a4a2a"))
    o.append(f'<ellipse cx="{n(cx-4.3)}" cy="{n(cy-0.5)}" rx="1" ry="1.4" fill="{OUT}"/>')
    o.append(f'<ellipse cx="{n(cx+1.3)}" cy="{n(cy-0.5)}" rx="1.1" ry="1.5" fill="{OUT}"/>')
    o.append(dot(cx - 4.6, cy - 1, .35, "#fff", .9) + dot(cx + 1, cy - 1, .38, "#fff", .9))
    if grim:
        o.append(L(f"M{n(cx-6.2)},{n(cy-3.6)} L{n(cx-2.6)},{n(cy-2.8)} M{n(cx-0.6)},{n(cy-2.8)} L{n(cx+3.4)},{n(cy-3.8)}", brow, 1.3, .95))
    else:
        o.append(L(f"M{n(cx-6)},{n(cy-3.2)} L{n(cx-2.8)},{n(cy-3.6)} M{n(cx-0.5)},{n(cy-3.6)} L{n(cx+3.3)},{n(cy-3.2)}", brow, 1.2, .95))
    o.append(L(f"M{n(cx-6.6)},{n(cy)} Q{n(cx-8.6)},{n(cy+3)} {n(cx-6.2)},{n(cy+3.6)}", SKIN_D, 1.1, .9))
    o.append(L(f"M{n(cx-7)},{n(cy+0.2)} Q{n(cx-7.9)},{n(cy+2)} {n(cx-7.3)},{n(cy+2.8)}", SKIN_L, .6, .8))
    if mouth:
        o.append(L(f"M{n(cx-5.6)},{n(cy+5.6)} Q{n(cx-3)},{n(cy+6.6)} {n(cx-0.6)},{n(cy+5.4)}", "#8a4a30", 1, .9))
    return o


def face_r(cx: float, cy: float, **kw) -> list[str]:
    """Face looking to the viewer's right (mirrored)."""
    return [f'<g transform="translate({n(2*cx)},0) scale(-1,1)">'] + face(cx, cy, **kw) + ["</g>"]


def beard(cx: float, cy: float, col: str, length: float = 6, width: float = 1.0, ry: float = 9.5) -> list[str]:
    """Full beard covering jaw and chin with a moustache; `length` = how far below the chin."""
    w = width
    top = cy + 2
    chin = cy + ry + length
    d = (f"M{n(cx+7*w)},{n(cy-1.5)} Q{n(cx+9*w)},{n(cy+7)} {n(cx+3*w)},{n(chin-length*.3)} "
         f"Q{n(cx-1)},{n(chin+1)} {n(cx-3.5)},{n(chin)} Q{n(cx-9.5*w)},{n(chin-2)} {n(cx-8.8*w)},{n(top)} "
         f"Q{n(cx-7)},{n(cy+3.5)} {n(cx-5.6)},{n(cy+4.6)} Q{n(cx-3)},{n(cy+8.4)} {n(cx+0.2)},{n(cy+4.6)} "
         f"Q{n(cx+3)},{n(cy+2.4)} {n(cx+7*w)},{n(cy-1.5)}Z")
    o = [V(P(d, col, 1.2))]
    strands = ""
    for k in range(7):
        x = cx - 7.5 * w + k * 2.2 * w
        strands += f"M{n(x)},{n(cy+4 + abs(k-3)*.4)} Q{n(x+.8)},{n(cy+ry*.8)} {n(x + (k-3)*.35)},{n(chin - abs(k-3)*.9)} "
    light = {GINGER: "#f0a070", BLOND: "#fff0c0", BROWN: "#b08060", GREYH: "#ffffff"}.get(col, "#ffffff")
    dark = {GINGER: "#5a200a", BLOND: "#7a5418", BROWN: "#2a1608", GREYH: "#7a7262"}.get(col, "#2a1406")
    o.append(clipped(d, L(strands, dark, .55, .55), L(strands, light, .45, .55).replace('d="', 'transform="translate(-.7,-.2)" d="'),
                     SH(f"M{n(cx-8)},{n(top+1)} Q{n(cx-6)},{n(chin-3)} {n(cx-3)},{n(chin-1)} L{n(cx-5)},{n(top+3)}Z", light, .45)))
    # moustache over the mouth
    md = (f"M{n(cx-8)},{n(cy+6.6)} Q{n(cx-7.4)},{n(cy+3.6)} {n(cx-4.6)},{n(cy+3.6)} Q{n(cx-2.6)},{n(cy+3.4)} {n(cx-1.6)},{n(cy+4.4)} "
          f"Q{n(cx)},{n(cy+3.4)} {n(cx+1.8)},{n(cy+4.4)} Q{n(cx+1)},{n(cy+6.2)} {n(cx-1.4)},{n(cy+5.8)} "
          f"Q{n(cx-4.6)},{n(cy+5.4)} {n(cx-8)},{n(cy+6.6)}Z")
    o.append(P(md, col, 1))
    o.append(L(f"M{n(cx-7)},{n(cy+5)} Q{n(cx-4.6)},{n(cy+4)} {n(cx-2)},{n(cy+4.6)}", light, .5, .7))
    o.append(L(f"M{n(cx-5)},{n(cy+7.2)} Q{n(cx-3.4)},{n(cy+7.8)} {n(cx-2)},{n(cy+7.2)}", "#6a2a1a", .8, .8))
    return o


def droop_moustache(cx: float, cy: float, col: str) -> list[str]:
    """Gaulish long moustache with ends drooping below the chin."""
    d = (f"M{n(cx-9)},{n(cy+11)} Q{n(cx-9.4)},{n(cy+5)} {n(cx-5)},{n(cy+3.8)} Q{n(cx-2.6)},{n(cy+3.2)} {n(cx-1.2)},{n(cy+4.4)} "
         f"Q{n(cx+0.6)},{n(cy+3.4)} {n(cx+2.4)},{n(cy+4.6)} Q{n(cx+3.6)},{n(cy+7)} {n(cx+3)},{n(cy+10.6)} "
         f"Q{n(cx+1.4)},{n(cy+7.4)} {n(cx-1.2)},{n(cy+6.4)} Q{n(cx-5)},{n(cy+5.8)} {n(cx-6.4)},{n(cy+7.6)} "
         f"Q{n(cx-7.8)},{n(cy+9.4)} {n(cx-9)},{n(cy+11)}Z")
    light = {GINGER: "#f0a070", BLOND: "#fff0c0", BROWN: "#b08060", GREYH: "#ffffff"}.get(col, "#ffffff")
    return [V(P(d, col, 1)), L(f"M{n(cx-7.6)},{n(cy+8)} Q{n(cx-7)},{n(cy+5)} {n(cx-3.6)},{n(cy+4.4)} M{n(cx+0.6)},{n(cy+4.8)} Q{n(cx+2.4)},{n(cy+6)} {n(cx+2.4)},{n(cy+8.6)}", light, .55, .75)]


def hair_cap(cx: float, cy: float, col: str, ry: float = 9.5, fringe: bool = True) -> list[str]:
    """Hair on the crown, parted over the forehead."""
    t = cy - ry
    d = (f"M{n(cx-9)},{n(cy-1)} Q{n(cx-10)},{n(t-1.8)} {n(cx)},{n(t-1.6)} Q{n(cx+10.5)},{n(t-1.4)} {n(cx+9.4)},{n(cy+1)} "
         f"Q{n(cx+7)},{n(cy-4)} {n(cx+4)},{n(cy-4)} Q{n(cx-1)},{n(cy-6.4)} {n(cx-4)},{n(cy-4.2)} Q{n(cx-7)},{n(cy-4.6)} {n(cx-9)},{n(cy-1)}Z")
    light = {GINGER: "#f0a070", BLOND: "#fff0c0", BROWN: "#b08060", GREYH: "#ffffff"}.get(col, "#ffffff")
    return [V(P(d, col, 1.2)), L(f"M{n(cx-6)},{n(t+1.4)} Q{n(cx-1)},{n(t-1)} {n(cx+5)},{n(t+.6)} M{n(cx-4)},{n(t+3.2)} Q{n(cx+1)},{n(t+1)} {n(cx+7)},{n(t+3)}", light, .6, .7)]


def long_hair(cx: float, cy: float, col: str, length: float = 18, ry: float = 9.5) -> list[str]:
    """Hair falling behind the head to the shoulders (draw before the face)."""
    t = cy - ry
    d = (f"M{n(cx-8)},{n(cy-2)} Q{n(cx-9)},{n(t-2)} {n(cx+1)},{n(t-2)} Q{n(cx+12)},{n(t-1)} {n(cx+11)},{n(cy+4)} "
         f"Q{n(cx+12)},{n(cy+length*.7)} {n(cx+9)},{n(cy+length)} Q{n(cx+5)},{n(cy+length-2)} {n(cx+3)},{n(cy+length+1)} "
         f"Q{n(cx+1)},{n(cy+8)} {n(cx-2)},{n(cy+4)} Z")
    light = {GINGER: "#f0a070", BLOND: "#fff0c0", BROWN: "#b08060", GREYH: "#ffffff"}.get(col, "#ffffff")
    dark = {GINGER: "#5a200a", BLOND: "#7a5418", BROWN: "#2a1608", GREYH: "#7a7262"}.get(col, "#2a1406")
    st = "".join(f"M{n(cx+4+k*1.6)},{n(cy-2+k)} Q{n(cx+8+k*.8)},{n(cy+length*.5)} {n(cx+5+k*1.2)},{n(cy+length-1)} " for k in range(4))
    return [V(P(d, col, 1.2)), clipped(d, L(st, dark, .6, .6), L(st, light, .45, .5).replace('d="', 'transform="translate(-.8,0)" d="'))]


def fist(x: float, y: float, r: float = 3.6, ang: float = 0) -> list[str]:
    """Gripping hand (knuckles toward the viewer's left by default)."""
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    o = [V(ell(x, y, r * 1.05, r * .92, SKIN, 1.1, OUT, ang))]
    kd = ""
    for k in (-1, 0, 1):
        px, py = x - ux * r * .35 + (-uy) * k * r * .38, y - uy * r * .35 + ux * k * r * .38
        kd += f"M{n(px)},{n(py)} l{n(-ux * r * .5)},{n(-uy * r * .5)} "
    o.append(L(kd, SKIN_D, .6, .75))
    o.append(dot(x - r * .35, y - r * .4, r * .3, "#fff3dc", .5))
    return o


def boot(x: float, y: float, d: int = -1, col: str = LEA, w: float = 13, cuff: str = "", lace: bool = True) -> list[str]:
    """Leather boot; x,y = ankle base on the ground, toe pointing d (-1 left)."""
    tx, hx = x + d * w * .62, x - d * w * .38
    p = (f"M{n(hx)},{n(y-6.5)} L{n(x+d*2.8)},{n(y-6.5)} Q{n(x+d*3.2)},{n(y-3.6)} {n(tx-d*4)},{n(y-3.4)} "
         f"Q{n(tx+d*1.2)},{n(y-2.6)} {n(tx)},{n(y+0.6)} L{n(hx+d*0.3)},{n(y+1.2)} Q{n(hx-d*1.2)},{n(y-2)} {n(hx)},{n(y-6.5)}Z")
    o = [V(P(p, col, 1.2))]
    o.append(L(f"M{n(hx+d*0.4)},{n(y+0.6)} L{n(tx-d*0.4)},{n(y+0.1)}", "#24160a", 1.4, .8))
    o.append(spec(x + d * 3.6, y - 3.4, 2.4, .9, .45, 0, "#ffe8c8"))
    if lace:
        o.append(L(f"M{n(x+d*1.4)},{n(y-6)} l{n(d*1.6)},{n(1.2)} M{n(x+d*1.4)},{n(y-4.4)} l{n(d*1.8)},{n(1)}", "#2a1406", .6, .7))
    if cuff == "fur":
        c = (f"M{n(hx-d*0.8)},{n(y-5.6)} L{n(x+d*3.6)},{n(y-5.6)} L{n(x+d*3.4)},{n(y-9.6)} "
             f"L{n(x+d*2)},{n(y-8.4)} L{n(x+d*0.6)},{n(y-10)} L{n(x-d*1)},{n(y-8.4)} L{n(x-d*2.4)},{n(y-10)} L{n(hx-d*0.6)},{n(y-8.8)}Z")
        o.append(part(c, FUR, "fur"))
    return o


def belt(x0: float, y0: float, x1: float, y1: float, h: float = 4.4, buckle: str = BRONZE) -> list[str]:
    d = f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)} L{n(x1)},{n(y1+h)} L{n(x0)},{n(y0+h)}Z"
    o = [V(P(d, LEA_D, 1.1))]
    o.append(L(f"M{n(x0+.5)},{n(y0+1)} L{n(x1-.5)},{n(y1+1)}", "#9a6a3a", .5, .7))
    bx = x0 + (x1 - x0) * .38
    by = y0 + (y1 - y0) * .38
    o.append(V(P(f"M{n(bx-2.6)},{n(by-1)} L{n(bx+2.6)},{n(by-1)} L{n(bx+2.6)},{n(by+h+1)} L{n(bx-2.6)},{n(by+h+1)}Z", buckle, 1)))
    o.append(L(f"M{n(bx-1.2)},{n(by+.6)} L{n(bx+1.2)},{n(by+.6)} L{n(bx+1.2)},{n(by+h-.6)} L{n(bx-1.2)},{n(by+h-.6)}Z", "#5a3a10", .6, .8))
    o.append(dot(bx - 1.4, by, .55, "#fff4cc", .9))
    return o


# ---------------------------------------------------------------- weapons

def spear(x0, y0, x1, y1, blade: float = 15, bw: float = 3, col=WOOD, w: float = 2.4) -> list[str]:
    """Shaft from butt (x0,y0) to the socket (x1,y1); blade beyond it."""
    o = [L(f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)}", OUT, w + 2, .75), L(f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)}", col, w, 1)]
    o.append(L(f"M{n(x0)},{n(y0-0.6)} L{n(x1)},{n(y1-0.6)}", WOOD_L, w * .3, .8))
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    px, py = -uy, ux
    tip = (x1 + ux * blade, y1 + uy * blade)
    a = (x1 + ux * blade * .33 + px * bw, y1 + uy * blade * .33 + py * bw)
    b = (x1 + ux * blade * .33 - px * bw, y1 + uy * blade * .33 - py * bw)
    o.append(P(f"M{n(x1-ux)},{n(y1-uy)} L{n(a[0])},{n(a[1])} L{n(tip[0])},{n(tip[1])} L{n(b[0])},{n(b[1])}Z", STEEL, 1.1))
    o.append(S(f"M{n(x1)},{n(y1)} L{n(b[0])},{n(b[1])} L{n(tip[0])},{n(tip[1])}Z", "#ffffff", .5))
    o.append(L(f"M{n(x1+ux*2)},{n(y1+uy*2)} L{n(tip[0]-ux*2)},{n(tip[1]-uy*2)}", STEEL_D, .6, .8))
    o.append(P(f"M{n(x1-ux*3+px*1.6)},{n(y1-uy*3+py*1.6)} L{n(x1+px*1.6)},{n(y1+py*1.6)} L{n(x1-px*1.6)},{n(y1-py*1.6)} L{n(x1-ux*3-px*1.6)},{n(y1-uy*3-py*1.6)}Z", STEEL_D, .9))
    return o


def shaft(x0, y0, x1, y1, w: float = 2.6, col=WOOD) -> list[str]:
    return [L(f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)}", OUT, w + 2, .75), L(f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)}", col, w, 1),
            L(f"M{n(x0-.4)},{n(y0-0.5)} L{n(x1-.4)},{n(y1-0.5)}", WOOD_L, w * .3, .75)]


def longsword(x: float, y: float, ang: float, length: float = 34, hilt=BRONZE) -> list[str]:
    o = [f'<g transform="translate({n(x)},{n(y)}) rotate({n(ang)})">']
    o.append(P("M-8,-1.7 L-8,1.7 L-2,1.7 L-2,-1.7Z", LEA_D, 1))
    o.append(L("M-7,-1.5 L-6,1.5 M-5,-1.5 L-4,1.5", "#9a6a3a", .5, .8))
    o.append(P("M-1.8,-4.6 L1.2,-4.6 L1.2,4.6 L-1.8,4.6Z", hilt, 1))
    o.append(P(f"M1.2,-2.3 L{length-6},-2.1 L{length},0 L{length-6},2.1 L1.2,2.3Z", STEEL, 1.1))
    o.append(S(f"M1.2,-2.3 L{length-6},-2.1 L{length-0.5},0 L{length-6},-0.3 L1.2,-0.3Z", "#ffffff", .55))
    o.append(L(f"M3,0.2 L{length-8},0.2", STEEL_D, .7, .8))
    o.append(circ(-9.2, 0, 2.3, g("bronzer" if hilt == BRONZE else "goldr"), 1))
    o.append(dot(-9.8, -0.7, .6, "#fff6d0"))
    o.append("</g>")
    return o


def round_shield(cx, cy, r, base, rim=LEA_D, boss=STEEL, motif: str = "", motif_col: str = WHITE) -> list[str]:
    """Planked wooden round shield, slightly domed, rawhide rim with rivets and a steel boss."""
    sd = f"M{n(cx-r)},{n(cy)} A{n(r)},{n(r)} 0 1 1 {n(cx+r)},{n(cy)} A{n(r)},{n(r)} 0 1 1 {n(cx-r)},{n(cy)}Z"
    o = [V(P(sd, base, 1.4))]
    inner = ""
    seams = "".join(f"M{n(cx + k*r*.36)},{n(cy-r)} L{n(cx + k*r*.36)},{n(cy+r)} " for k in (-2, -1, 1, 2))
    inner += L(seams, "#1a0e06", .6, .45)
    if motif == "cross":
        a = r * .22
        inner += S(f"M{n(cx-a)},{n(cy-r)} L{n(cx+a)},{n(cy-r)} L{n(cx+a)},{n(cy-a)} L{n(cx+r)},{n(cy-a)} L{n(cx+r)},{n(cy+a)} L{n(cx+a)},{n(cy+a)} "
                   f"L{n(cx+a)},{n(cy+r)} L{n(cx-a)},{n(cy+r)} L{n(cx-a)},{n(cy+a)} L{n(cx-r)},{n(cy+a)} L{n(cx-r)},{n(cy-a)} L{n(cx-a)},{n(cy-a)}Z", motif_col)
    elif motif == "quarters":
        for k in range(4):
            a0 = math.radians(45 + k * 90 - 14)
            a1 = math.radians(45 + k * 90 + 14)
            inner += S(f"M{n(cx)},{n(cy)} L{n(cx+math.cos(a0)*r)},{n(cy+math.sin(a0)*r)} A{n(r)},{n(r)} 0 0 1 {n(cx+math.cos(a1)*r)},{n(cy+math.sin(a1)*r)}Z", motif_col)
    elif motif == "triskele":
        for k in range(3):
            a = math.radians(k * 120 - 90)
            ex, ey = cx + math.cos(a) * r * .75, cy + math.sin(a) * r * .75
            bx_, by_ = cx + math.cos(a + 1.2) * r * .55, cy + math.sin(a + 1.2) * r * .55
            inner += L(f"M{n(cx)},{n(cy)} Q{n(ex)},{n(ey)} {n(bx_)},{n(by_)}", motif_col, 1.6, .9)
    inner += SH(f"M{n(cx-r*.75)},{n(cy-r*.1)} Q{n(cx-r*.6)},{n(cy-r*.75)} {n(cx+r*.1)},{n(cy-r*.85)} Q{n(cx-r*.45)},{n(cy-r*.5)} {n(cx-r*.6)},{n(cy+r*.2)}Z", "#fff2d8", .5)
    inner += SH(f"M{n(cx+r*.2)},{n(cy+r*.95)} Q{n(cx+r*.9)},{n(cy+r*.5)} {n(cx+r*.95)},{n(cy-r*.2)} Q{n(cx+r*.7)},{n(cy+r*.5)} {n(cx+r*.1)},{n(cy+r*.8)}Z", "#1a0e06", .45)
    sc = "".join(f"M{n(cx + RND.uniform(-r*.6, r*.6))},{n(cy + RND.uniform(-r*.6, r*.6))} l{n(RND.uniform(-2.4, 2.4))},{n(RND.uniform(-1, 1))} " for _ in range(4))
    inner += L(sc, "#fff0d8", .5, .45)
    o.append(clipped(sd, inner))
    o.append(circ(cx, cy, r - 0.9, "none", 2.2, "#4a2e14"))
    o.append(circ(cx, cy, r - 0.9, "none", .5, "#9a6a3a"))
    for k in range(10):
        a = k * math.pi / 5 + .3
        o.append(rivet(cx + math.cos(a) * (r - .9), cy + math.sin(a) * (r - .9), .55, "steel"))
    o.append(V(circ(cx, cy, r * .3, g("steelr") if boss == STEEL else g("bronzer"), 1.2)))
    o.append(spec(cx - r * .1, cy - r * .12, r * .1, r * .07, .9))
    return o


# ---------------------------------------------------------------- horses

def hoof(x: float, y: float) -> str:
    return (P(f"M{n(x-3.2)},{n(y-4.4)} L{n(x+3.2)},{n(y-4.4)} Q{n(x+4)},{n(y-2)} {n(x+4.4)},{n(y+0.5)} L{n(x-4.4)},{n(y+0.5)} Q{n(x-4)},{n(y-2)} {n(x-3.2)},{n(y-4.4)}Z", g("hoof"), 1.1)
            + L(f"M{n(x-2.8)},{n(y-3.4)} Q{n(x-3.4)},{n(y-1.6)} {n(x-3.6)},{n(y)}", "#9a8a7c", .6, .7))


def hleg(pts, col: str, wu: float = 9.5, feather: str = "") -> list[str]:
    (ax, ay), (bx, by), (cx, cy) = pts
    o = [tube(f"M{ax},{ay} L{bx},{by} L{cx},{cy}", col, wu, kind="horse"), hoof(cx, cy)]
    if feather:   # white socks / fetlock hair
        o.append(SH(f"M{n(cx-3)},{n(cy-9)} L{n(cx+3)},{n(cy-9)} L{n(cx+3.6)},{n(cy-4)} L{n(cx-3.6)},{n(cy-4)}Z", feather, .7))
    return o


def horse_head(px: float, py: float, col: str, dark: str, light: str, drop: float = 1.0, armour: str = "",
               bridle: str = LEA_D, stud: str = "gold") -> list[str]:
    """Head hanging from the poll at px,py; `drop` 1 = stretched low, 0.5 = carried high."""
    mx, my = px - 22, py + 18 * drop + 4
    o = []
    o.append(P(f"M{n(px-4)},{n(py+1)} L{n(px-2)},{n(py-8)} L{n(px+2)},{n(py+1)}Z", col, 1.1))
    o.append(S(f"M{n(px-2.6)},{n(py)} L{n(px-2)},{n(py-5)} L{n(px+0.4)},{n(py)}Z", "#1a0e08", .45))
    o.append(P(f"M{n(px+2)},{n(py+1)} L{n(px+6)},{n(py-7)} L{n(px+8)},{n(py+2)}Z", col, 1.1))
    d = (f"M{n(px+2)},{n(py)} Q{n(px+8)},{n(py+3)} {n(px+6)},{n(py+11)} L{n(mx+10)},{n(my-2)} Q{n(mx+4)},{n(my+5)} {n(mx-2)},{n(my+3)} "
         f"Q{n(mx-6)},{n(my)} {n(mx-4)},{n(my-5)} L{n(px-10)},{n(py+9)} Q{n(px-6)},{n(py-1)} {n(px+2)},{n(py)}Z")
    o.append(V(P(d, col)))
    o.append(SH(f"M{n(px-2)},{n(py+6)} L{n(mx+8)},{n(my-3)} L{n(mx+2)},{n(my+2)} Q{n(px-1)},{n(py+12)} {n(px+1)},{n(py+8)}Z", dark, .7))
    o.append(SH(f"M{n(px-8)},{n(py+8)} L{n(mx-2)},{n(my-4)} L{n(mx)},{n(my-1)} L{n(px-6)},{n(py+11)}Z", light, .8))
    o.append(LS(f"M{n(px+1)},{n(py+5)} Q{n(px+4)},{n(py+9)} {n(px-1)},{n(py+12)}", "#1a0e08", 1.1, .5))
    o.append(spec(mx + 1, my - 1, 3, 2.4, .25, 0, "#2a1a10"))
    if armour == "chamfron":
        o.append(V(P(f"M{n(px-1)},{n(py+1)} Q{n(px+5)},{n(py+4)} {n(px+3)},{n(py+11)} L{n(mx+9)},{n(my-3)} L{n(mx+4)},{n(my-6)} L{n(px-7)},{n(py+6)}Z", STEEL, 1.1)))
        o.append(spec(px - 4, py + 6, 3.4, 1.4, .8, -35))
        o.append(rivet(px - 6, py + 9, .6, "steel") + rivet(mx + 7, my - 4, .6, "steel"))
        o.append(circ(px - 2, py + 8, 1.8, "#1a1410", 0.8))
    else:
        o.append(circ(px - 3, py + 7, 1.8, "#1a1410", 0.8))
        o.append(dot(px - 3.6, py + 6.4, .6, "#fff"))
    o.append(f'<ellipse cx="{n(mx-1)}" cy="{n(my-1)}" rx="1.2" ry="1.6" fill="#1a0e08" stroke="none"/>')
    o.append(L(f"M{n(mx-3)},{n(my+1.5)} L{n(mx+3)},{n(my+2)}", OUT, 0.9))
    o.append(L(f"M{n(mx+3)},{n(my-5)} L{n(mx+5)},{n(my+2)} M{n(mx+4)},{n(my-2)} L{n(px-6)},{n(py+9)} M{n(px-6)},{n(py+9)} L{n(px-1)},{n(py+1)}", bridle, 1.5, 1))
    o.append(rivet(mx + 4.2, my - 2, .7, stud) + rivet(px - 6, py + 9, .7, stud))
    horse_head.mouth = (mx + 4, my + 1)
    return o


def horse_body(d: str, col: str, shade_d: str, hi_d: str, muscles: str, dark: str) -> list[str]:
    o = [V(P(d, col))]
    o.append(clipped(d, SH(shade_d, dark, .75), SH(hi_d, "#fff0d0", .35, "soft2"), LS(muscles, "#1a0e08", 1.2, .4)))
    return o


def mane(d: str, strands: str, grad: str = "mane", light: str = "#8a6a4a") -> list[str]:
    return [V(P(d, g(grad), 1.2)), L(strands, light, .5, .55)]


def horse(col: str, dark: str, light: str, pose: str = "canter", mane_grad: str = "mane", mane_light: str = "#8a6a4a",
          drop: float = .75, armour: str = "", tail: bool = True) -> dict:
    """A horse facing left in one of four gaits; returns layers far / body / near / neck / head.
    Body spans x 30..104, back ~y66, belly ~y98, hooves on y 112..124."""
    legs = {
        "gallop": dict(ff=[(40, 82), (28, 92), (14, 98)], fh=[(90, 84), (104, 96), (116, 102)],
                       nf=[(44, 86), (34, 100), (24, 112)], nh=[(92, 88), (98, 106), (106, 122)]),
        "canter": dict(ff=[(42, 84), (36, 100), (30, 120)], fh=[(90, 86), (98, 102), (100, 122)],
                       nf=[(40, 80), (26, 90), (18, 100)], nh=[(94, 88), (104, 104), (108, 122)]),
        "trot": dict(ff=[(42, 84), (40, 102), (36, 122)], fh=[(90, 86), (98, 104), (104, 120)],
                     nf=[(42, 82), (32, 96), (30, 108)], nh=[(92, 88), (94, 106), (88, 122)]),
        "stand": dict(ff=[(44, 86), (42, 104), (40, 122)], fh=[(88, 88), (90, 106), (88, 122)],
                      nf=[(38, 86), (36, 104), (34, 122)], nh=[(94, 88), (98, 106), (96, 122)]),
    }[pose]
    lay = {}
    far = []
    if tail:
        far += mane("M100,70 Q112,64 118,72 Q112,76 116,88 Q108,82 104,92 Q106,80 98,78Z",
                    "M103,71 Q111,67 115,72 M104,74 Q110,75 113,85 M102,77 Q105,80 105,89", mane_grad, mane_light)
    far += hleg(legs["ff"], dark, 9)
    far += hleg(legs["fh"], dark, 9)
    lay["far"] = far
    lay["body"] = horse_body(
        "M32,70 Q24,80 30,94 Q44,104 66,102 Q90,102 100,94 Q108,84 102,72 Q96,64 84,66 Q62,70 46,66 Q36,64 32,70Z", col,
        "M36,92 Q50,102 70,100 Q92,100 100,92 Q92,98 66,98 Q48,98 36,92Z",
        "M44,68 Q62,72 82,68 Q62,76 46,72Z M86,70 Q98,68 100,76 Q94,74 88,76Z",
        "M40,74 Q46,82 42,92 M88,74 Q84,84 90,92 M56,96 Q68,92 80,96", dark)
    lay["near"] = hleg(legs["nh"], col, 10.5) + hleg(legs["nf"], col, 10)
    neck = [V(P("M50,66 Q40,52 30,38 L20,46 Q30,62 36,80Z", col))]
    neck.append(clipped("M50,66 Q40,52 30,38 L20,46 Q30,62 36,80Z", SH("M48,66 Q40,56 32,44 L28,47 Q34,60 38,76Z", dark, .6),
                        LS("M24,48 Q30,60 32,70", "#fff0d0", 1.4, .35)))
    neck += mane("M32,34 Q42,32 46,42 Q50,50 56,60 Q50,58 46,54 Q40,46 36,46 Q32,44 28,40Z",
                 "M35,35 Q42,36 45,44 M38,40 Q45,46 51,56 M42,43 Q47,48 53,57", mane_grad, mane_light)
    lay["neck"] = neck
    lay["head"] = horse_head(30, 38, col, dark, light, drop, armour)
    lay["mouth"] = horse_head.mouth
    return lay


def saddle_cloth(d: str, col: str, trim: str = GOLD, trim_d: str = "", tex: str = "") -> list[str]:
    o = [part(d, col, tex)]
    if trim_d:
        o.append(L(trim_d, trim, 1.1, .95))
    return o


# ---------------------------------------------------------------- siege

def wheel(cx: float, cy: float, r: float, dark: bool = False) -> list[str]:
    rim = WOOD_D if dark else WOOD
    o = [V(circ(cx, cy, r, rim))]
    o.append(circ(cx, cy, r, "none", 1.3, "#4e555c" if dark else "#6d747b"))
    o.append(f'<path d="M{n(cx-r*.7)},{n(cy-r*.7)} A{n(r)},{n(r)} 0 0 1 {n(cx+r*.4)},{n(cy-r*.92)}" fill="none" stroke="#e8edf2" stroke-width=".6" stroke-opacity=".6"/>')
    o.append(circ(cx, cy, r - 3.2, "#c4a87e" if not dark else "#9a8462", 1))
    o.append(SH(f"M{n(cx+r*.15)},{n(cy-r+3.5)} A{n(r-3.5)},{n(r-3.5)} 0 0 1 {n(cx+r*.15)},{n(cy+r-3.5)} Z", "#2a1406", .35))
    sp = ""
    for a in (0, 60, 120):
        dx, dy = math.cos(math.radians(a)) * (r - 3), math.sin(math.radians(a)) * (r - 3)
        sp += f"M{n(cx-dx)},{n(cy-dy)} L{n(cx+dx)},{n(cy+dy)} "
    o.append(L(sp, OUT, 2.2, .75) + L(sp, WOOD_D if dark else WOOD, 1.2, 1))
    o.append(circ(cx, cy, 2.4, g("steelr"), 1))
    for k in range(6):
        a = k * math.pi / 3 + .5
        o.append(dot(cx + math.cos(a) * (r - .6), cy + math.sin(a) * (r - .6), .5, "#2c3238"))
    return o


def beam(d: str, w: float, col: str = WOOD, grain: bool = True) -> str:
    s = L(d, OUT, w + 2.2, .75) + L(d, col, w, 1)
    lit = {WOOD: WOOD_L, WOOD_D: "#946640", LEA: LEA_L}.get(col, WOOD_L)
    s += f'<path d="{d}" fill="none" stroke="{lit}" stroke-width="{n(w*.3)}" stroke-opacity=".7" transform="translate({n(-w*.18)},{n(-w*.18)})"/>'
    if grain:
        s += f'<path d="{d}" fill="none" stroke="#3a2210" stroke-width=".5" stroke-opacity=".5" stroke-dasharray="5 3" transform="translate({n(w*.12)},{n(w*.12)})"/>'
    return V(s)


def iron_band(x: float, y: float, w: float, h: float, rot: float = 0) -> str:
    t = f' transform="rotate({n(rot)} {n(x)} {n(y)})"' if rot else ""
    return (f'<g{t}>' + P(f"M{n(x-w/2)},{n(y-h/2)} L{n(x+w/2)},{n(y-h/2)} L{n(x+w/2)},{n(y+h/2)} L{n(x-w/2)},{n(y+h/2)}Z", STEEL_D, 1)
            + dot(x, y - h * .25, .55, "#e8edf2") + dot(x, y + h * .25, .55, "#2c3238") + "</g>")


def crewman(x: float, y: float, scale: float, tunic: str, legs_col: str, hair: str, beard_col: str | None = None,
            tex: str = "", pose: str = "push") -> list[str]:
    """Bareheaded crewman leaning into a push; x,y = where the hands grip (gripping to the left)."""
    o = [f'<g transform="translate({n(x)},{n(y)}) scale({scale})">']
    if pose == "push":
        o.append(tube("M18,22 L30,34 L36,54", legs_col, 8.5, tex=tex))
        o += boot(38, 57, -1, LEA, 13)
        o.append(tube("M22,20 L24,40 L20,56", legs_col, 9, tex=tex))
        o += boot(20, 59, -1, LEA, 13)
        o.append(part("M6,-8 L24,0 L30,24 L16,28 L4,12Z", tunic, folds="M14,0 Q18,14 18,26 M22,4 Q26,14 26,24"))
        o += belt(13, 16, 30, 20, 4)
        o.append(tube("M10,-4 L2,6 L0,14", SKIN, 7.5))
        o += fist(0, 15, 3.6)
        o.append(tube("M14,2 L6,10 L4,18", SKIN, 7.5))
        o += fist(4, 19, 3.6)
        o.append(tube("M8,-14 L10,-6", SKIN, 7))
        o += face(6, -20, grim=True)
        o += hair_cap(6, -20, hair)
        if beard_col:
            o += beard(6, -20, beard_col, 3)
    o.append("</g>")
    return o


def oval_shield(cx, cy, rx, ry, base, rot: float = 0, boss=BRONZE, spine: bool = True, motif_col: str = "") -> list[str]:
    """Tall Celtic oval shield, planked, with a wooden spine and a bronze boss."""
    sd = f"M{n(cx-rx)},{n(cy)} A{n(rx)},{n(ry)} 0 1 1 {n(cx+rx)},{n(cy)} A{n(rx)},{n(ry)} 0 1 1 {n(cx-rx)},{n(cy)}Z"
    o = [f'<g transform="rotate({n(rot)} {n(cx)} {n(cy)})">' if rot else "<g>", V(P(sd, base, 1.4))]
    inner = L("".join(f"M{n(cx + k*rx*.34)},{n(cy-ry)} L{n(cx + k*rx*.34)},{n(cy+ry)} " for k in (-2, -1, 1, 2)), "#0e1a06", .6, .45)
    if motif_col:
        inner += L(f"M{n(cx-rx*.6)},{n(cy-ry*.55)} Q{n(cx-rx*.1)},{n(cy-ry*.75)} {n(cx)},{n(cy-ry*.3)} "
                   f"M{n(cx+rx*.6)},{n(cy+ry*.55)} Q{n(cx+rx*.1)},{n(cy+ry*.75)} {n(cx)},{n(cy+ry*.3)}", motif_col, 1.5, .85)
    inner += SH(f"M{n(cx-rx*.8)},{n(cy+ry*.3)} Q{n(cx-rx*.8)},{n(cy-ry*.8)} {n(cx-rx*.1)},{n(cy-ry*.9)} Q{n(cx-rx*.55)},{n(cy-ry*.5)} {n(cx-rx*.55)},{n(cy+ry*.3)}Z", "#fff2d8", .45, "soft2")
    inner += SH(f"M{n(cx+rx*.35)},{n(cy+ry*.95)} Q{n(cx+rx)},{n(cy+ry*.3)} {n(cx+rx*.95)},{n(cy-ry*.4)} Q{n(cx+rx*.7)},{n(cy+ry*.4)} {n(cx+rx*.2)},{n(cy+ry*.85)}Z", "#0a1404", .5)
    o.append(clipped(sd, inner))
    o.append(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx-.9)}" ry="{n(ry-.9)}" fill="none" stroke="#4a2e14" stroke-width="2.2"/>')
    o.append(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx-.9)}" ry="{n(ry-.9)}" fill="none" stroke="{BRONZE_L}" stroke-width=".5" stroke-opacity=".6"/>')
    for k in range(12):
        a = k * math.pi / 6 + .26
        o.append(rivet(cx + math.cos(a) * (rx - .9), cy + math.sin(a) * (ry - .9), .55))
    if spine:
        o.append(V(P(f"M{n(cx-1.8)},{n(cy-ry*.86)} Q{n(cx)},{n(cy-ry*.9)} {n(cx+1.8)},{n(cy-ry*.86)} L{n(cx+1.8)},{n(cy+ry*.86)} Q{n(cx)},{n(cy+ry*.9)} {n(cx-1.8)},{n(cy+ry*.86)}Z", WOOD, 1)))
    o.append(V(ell(cx, cy, rx * .36, ry * .2, g("bronzer"), 1.2)))
    o.append(spec(cx - rx * .12, cy - ry * .07, rx * .1, ry * .05, .9))
    o.append("</g>")
    return o


def open_hand(x: float, y: float, s: float = 1.0, up: bool = True) -> list[str]:
    """Open palm, fingers up (up=True) or reaching forward-left (up=False)."""
    if up:
        d = (f"M{n(x-4*s)},{n(y+4*s)} L{n(x-4.6*s)},{n(y-3*s)} L{n(x-3.2*s)},{n(y-3.4*s)} L{n(x-2.4*s)},{n(y-1*s)} "
             f"L{n(x-2.2*s)},{n(y-6.6*s)} L{n(x-0.6*s)},{n(y-7*s)} L{n(x)},{n(y-2*s)} L{n(x+0.6*s)},{n(y-7.4*s)} L{n(x+2.2*s)},{n(y-7*s)} "
             f"L{n(x+2.2*s)},{n(y-1.6*s)} L{n(x+3.4*s)},{n(y-6*s)} L{n(x+4.8*s)},{n(y-5.4*s)} L{n(x+4.2*s)},{n(y+.6*s)} "
             f"L{n(x+6*s)},{n(y-1.6*s)} L{n(x+7*s)},{n(y-.4*s)} L{n(x+3.6*s)},{n(y+5*s)} Q{n(x)},{n(y+6.4*s)} {n(x-4*s)},{n(y+4*s)}Z")
    else:
        d = (f"M{n(x+3*s)},{n(y-3.4*s)} L{n(x-3*s)},{n(y-3.6*s)} L{n(x-7.4*s)},{n(y-2.6*s)} L{n(x-7.4*s)},{n(y-1.2*s)} L{n(x-3*s)},{n(y-1.4*s)} "
             f"L{n(x-7.8*s)},{n(y)} L{n(x-7.6*s)},{n(y+1.4*s)} L{n(x-3*s)},{n(y+.8*s)} L{n(x-7*s)},{n(y+2.6*s)} L{n(x-6.6*s)},{n(y+3.8*s)} "
             f"L{n(x-1.6*s)},{n(y+2.8*s)} L{n(x-3.6*s)},{n(y+5*s)} L{n(x-2.4*s)},{n(y+5.8*s)} L{n(x+3*s)},{n(y+3.4*s)}Z")
    return [V(P(d, SKIN, 1.1)), dot(x - 1, y - 1, 1.6 * s, "#fff3dc", .35)]


def torc(cx: float, cy: float, r: float = 7) -> list[str]:
    d = f"M{n(cx-r)},{n(cy)} A{n(r)},{n(r*.55)} 0 0 0 {n(cx+r)},{n(cy)}"
    return [L(d, OUT, 3.6, .75), L(d, GOLD, 2.4, 1), L(d, GOLD_L, .7, .9).replace('d="', 'transform="translate(-.3,-.5)" d="'),
            V(circ(cx - r, cy, 1.7, g("goldr"), .9)), V(circ(cx + r, cy, 1.7, g("goldr"), .9))]
