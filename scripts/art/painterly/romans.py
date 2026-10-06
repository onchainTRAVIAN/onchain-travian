#!/usr/bin/env python3
"""Painterly Roman unit art (big 120x140 figures only).

Run:  python3 scripts/art/painterly/romans.py
Writes src/web/public/img/units/big/romans-{1..10}.svg.  The 16x16 icons and the
hero stay with scripts/art/romans.py (do not run that one afterwards for the big
figures, it would overwrite these).

Same poses/composition as the flat generator, repainted in a soft painterly
style: every surface uses gradients (light from the top-left), a per-part
"volume" filter adds a warm lit rim on the top-left edge and a soft core shadow
on the bottom-right edge, and a soft brown outline replaces the cartoon line.
All art is original.
"""
from __future__ import annotations

import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3] / "src/web/public/img/units"

OUT = "#3b2a17"
OUTO = ".75"
K = 0.75          # outline width scale vs the flat generator (1.4 -> 1.05)
SW = 1.4

# ---------------------------------------------------------------- palette (mid tones)
RED, RED_D, RED_L = "#a8322a", "#74201a", "#d0604f"
STEEL, STEEL_D, STEEL_L = "#c3cad1", "#7f8891", "#f2f5f7"
GOLD, GOLD_D, GOLD_L = "#d4a43a", "#9a6e1e", "#f6d985"
SKIN, SKIN_D, SKIN_L = "#e6b386", "#b9805a", "#f8dab8"
LEA, LEA_D, LEA_L = "#8a5a2b", "#55361a", "#b0804e"
WOOD, WOOD_D, WOOD_L = "#a57443", "#6a4523", "#cfa070"
HAIR = "#4a2e18"
PURPLE, PURPLE_D = "#5c2b7d", "#35164c"
WHITE, WHITE_D = "#efe8d8", "#c2b79e"
BAY, BAY_D, BAY_L = "#7a4a28", "#4c2c16", "#a8703f"
CHEST, CHEST_D, CHEST_L = "#b0733a", "#7c4a20", "#d9a066"
BLACK, BLACK_L = "#2b2420", "#4a3f38"
FIRE, FIRE_D, FIRE_L = "#f08a1e", "#c7381b", "#ffe27a"
GREEN, GREEN_D = "#6d8f3a", "#465f22"
DRESS, DRESS_D = "#c06a34", "#86431c"
STONE = "#77716a"

# ---------------------------------------------------------------- per-file gradient registry
PFX = "rom0-"
USED: dict[str, str] = {}


def _stops(stops):
    return "".join(f'<stop offset="{o}" stop-color="{c}"/>' for c, o in stops)


def lin(stops, x1=0.15, y1=0, x2=0.85, y2=1):
    return lambda i: f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{_stops(stops)}</linearGradient>'


def rad(stops, cx=0.35, cy=0.3, r=0.85):
    return lambda i: f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">{_stops(stops)}</radialGradient>'


GRADS = {
    "red": lin([("#d9675a", 0), ("#a8322a", .5), ("#64180f", 1)]),
    "redd": lin([("#9c2d25", 0), ("#6e1d16", .55), ("#4a110c", 1)]),
    "scutum": lin([("#d66556", 0), ("#b13c30", .28), ("#8f271f", .7), ("#5a140f", 1)], 0, 0.1, 1, 0.25),
    "steel": lin([("#fbfcfd", 0), ("#d3d9de", .25), ("#9aa3ac", .55), ("#5d656e", .82), ("#9aa2a9", 1)]),
    "steeld": lin([("#b6bec5", 0), ("#7f8891", .5), ("#4e555c", 1)]),
    "gold": lin([("#fbe9a6", 0), ("#e0b04a", .35), ("#a97820", .75), ("#74500f", 1)]),
    "goldr": rad([("#fff2bf", 0), ("#e8bb52", .35), ("#a97820", .8), ("#6d4a0e", 1)], .38, .32, .75),
    "skin": rad([("#fbe0c0", 0), ("#e8b588", .5), ("#b67b52", 1)], .35, .3, .9),
    "lea": lin([("#b8854f", 0), ("#8a5a2b", .5), ("#4f3118", 1)]),
    "leal": lin([("#d0a06a", 0), ("#ad7b45", .5), ("#6f4a25", 1)]),
    "lead": lin([("#7a5230", 0), ("#55361a", .5), ("#34200e", 1)]),
    "wood": lin([("#d6a675", 0), ("#a57443", .5), ("#64401f", 1)]),
    "woodd": lin([("#946640", 0), ("#6a4523", .55), ("#3f2812", 1)]),
    "woodl": lin([("#ead0a8", 0), ("#c9996a", .5), ("#8a6038", 1)]),
    "purple": lin([("#9466ba", 0), ("#5c2b7d", .5), ("#2f1243", 1)]),
    "white": lin([("#fffdf7", 0), ("#efe8d8", .45), ("#bfb398", 1)]),
    "whited": lin([("#e6ddc8", 0), ("#c7bca2", .5), ("#958a70", 1)]),
    "hair": lin([("#7a5332", 0), ("#4a2e18", .5), ("#2a190c", 1)]),
    "grey": lin([("#fbf8f0", 0), ("#dcd5c6", .5), ("#a49b88", 1)]),
    "chest": rad([("#e6aa6c", 0), ("#b0733a", .5), ("#6e3f1a", 1)], .4, .25, .85),
    "bay": rad([("#b07a48", 0), ("#7a4a28", .5), ("#3e2312", 1)], .4, .25, .85),
    "black": rad([("#7a6c62", 0), ("#463b34", .5), ("#1d1714", 1)], .4, .25, .85),
    "mane": lin([("#5a3a22", 0), ("#2a1a10", .6), ("#140c07", 1)]),
    "fire": rad([("#fff6c8", 0), ("#ffd451", .3), ("#f08a1e", .65), ("#c7381b", 1)], .5, .62, .7),
    "stone": rad([("#a49e95", 0), ("#77716a", .55), ("#3f3b36", 1)], .35, .3, .85),
    "dress": lin([("#e08c55", 0), ("#c06a34", .5), ("#7a3a16", 1)]),
    "green": lin([("#94b35c", 0), ("#6d8f3a", .5), ("#3e561c", 1)]),
    "leaf": lin([("#8fc160", 0), ("#4f8a2e", .6), ("#2e5a18", 1)]),
    "rope": lin([("#e8d39c", 0), ("#c9b07a", .5), ("#8a7344", 1)]),
    "basket": lin([("#ead19a", 0), ("#c79c5e", .5), ("#87602e", 1)]),
    "cloth": lin([("#f1eadb", 0), ("#d4c9b0", .5), ("#9a8e72", 1)]),
    "hoof": lin([("#5a4c42", 0), ("#2b2420", .6), ("#15100d", 1)]),
}

MAT = {
    RED: "red", RED_D: "redd", STEEL: "steel", STEEL_D: "steeld", GOLD: "gold", SKIN: "skin",
    LEA: "lea", LEA_L: "leal", LEA_D: "lead", WOOD: "wood", WOOD_D: "woodd", WOOD_L: "woodl",
    PURPLE: "purple", WHITE: "white", WHITE_D: "whited", HAIR: "hair", CHEST: "chest", BAY: "bay",
    BLACK_L: "black", FIRE: "fire", STONE: "stone", DRESS: "dress", GREEN: "green",
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
    # soft edge for painted shading shapes
    "soft": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440"><feGaussianBlur stdDeviation=".9"/></filter>',
    "soft2": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440"><feGaussianBlur stdDeviation="1.8"/></filter>',
    "shadow": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-30" y="80" width="180" height="80"><feGaussianBlur stdDeviation="2.4"/></filter>',
    "glow": '<filter id="{i}" filterUnits="userSpaceOnUse" x="-150" y="-150" width="420" height="440"><feGaussianBlur stdDeviation="3.2"/></filter>',
    # volume: warm lit rim inside the top-left edge + soft core shadow inside the bottom-right edge
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
    return s[:-2] if s.endswith(".0") else s


def _so(stroke: str) -> str:
    return f' stroke-opacity="{OUTO}"' if stroke == OUT else ""


def P(d: str, fill: str, sw: float = SW, stroke: str = OUT, extra: str = "") -> str:
    return f'<path d="{d}" fill="{paint(fill)}" stroke="{stroke}" stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}{extra}/>'


def S(d: str, fill: str, op: float | None = None) -> str:
    """Crisp unoutlined detail shape."""
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<path d="{d}" fill="{paint(fill)}" stroke="none"{o}/>'


def SH(d: str, fill: str, op: float = .55, f: str = "soft") -> str:
    """Soft painted shading/highlight (blurred)."""
    return f'<path d="{d}" fill="{fill}" stroke="none" fill-opacity="{op}" {fx(f)}/>'


def L(d: str, stroke: str, w: float = 1, op: float | None = None) -> str:
    o = f' stroke-opacity="{op}"' if op is not None else (_so(stroke))
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}"{o}/>'


def LS(d: str, stroke: str, w: float = 1, op: float = .6, f: str = "soft") -> str:
    """Soft (blurred) stroke for painted highlights / muscle lines."""
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}" stroke-opacity="{op}" {fx(f)}/>'


def V(*items) -> str:
    """Group with the volume filter."""
    body = "".join(i if isinstance(i, str) else "".join(i) for i in items)
    return f'<g {fx("vol")}>{body}</g>'


TUBE_LIT = {SKIN: SKIN_L, RED: RED_L, WHITE: "#fffdf7", LEA_L: "#d0a06a", CHEST: CHEST_L, BAY: BAY_L,
            BLACK_L: "#7a6c62", CHEST_D: "#9c6332", BAY_D: "#6a4026", BLACK: "#4a3f38", WOOD: WOOD_L}


def _pts(d: str) -> list[tuple[float, float]]:
    return [tuple(float(v) for v in tok.split(",")) for tok in d.replace("M", " ").replace("L", " ").split()]


def _profile(npts: int, seg: int, t: float, length: float, kind: str = "") -> float:
    """Width factor along a limb.  seg = segment index, t = 0..1 inside it."""
    if kind == "horse":                   # muscular forearm/gaskin, slim cannon, fetlock knob
        if seg == 0:
            return 1.0 + 0.06 * math.sin(math.pi * t) - 0.4 * t
        return 0.6 - 0.1 * t + 0.14 * math.exp(-((t - 0.88) / 0.09) ** 2)
    if length < 11:                       # necks: uniform
        return 1.0
    if npts == 2:
        return 1.0 - 0.2 * t + 0.05 * math.sin(math.pi * t)
    if seg == 0:                          # thigh / upper arm: slight bulge, narrowing to the joint
        return 1.0 + 0.05 * math.sin(math.pi * t) - 0.2 * t
    # calf / forearm: muscle bulge high, then thin ankle / wrist
    return 0.8 + 0.12 * math.sin(math.pi * min(1.0, t * 1.6)) - 0.24 * t


def tube(d: str, fill: str, w: float, shade=None, vol: bool = True, kind: str = "") -> str:
    """Tapered limb polygon (thigh -> knee -> calf bulge -> ankle) with soft outline, lit stripe and volume filter."""
    pts = _pts(d)
    w *= 1.1
    total = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    samples = []  # (x, y, nx, ny, width)
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        ln = math.dist(pts[i], pts[i + 1]) or 1
        k = max(2, int(ln / 3))
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
        if nx * -1 + ny * -0.6 < 0:       # normal points to the lit (upper-left) side
            nx, ny = -nx, -ny
        out.append((x, y, nx, ny, w * _profile(len(pts), i, t, total, kind), dx / ln, dy / ln))
    lit_side = [(x + nx * wi / 2, y + ny * wi / 2) for x, y, nx, ny, wi, _, _ in out]
    dark_side = [(x - nx * wi / 2, y - ny * wi / 2) for x, y, nx, ny, wi, _, _ in out]

    def cap(p, sign):
        x, y, nx, ny, wi, ux, uy = p
        r = wi / 2
        return [(x + (nx * math.cos(a) + sign * ux * math.sin(a)) * r, y + (ny * math.cos(a) + sign * uy * math.sin(a)) * r)
                for a in (math.pi * k / 6 for k in range(1, 6))]
    # lit side forward, cap at the end, dark side backward, cap at the start
    ring = lit_side + cap(out[-1], 1)[:] + dark_side[::-1]
    c0 = cap(out[0], -1)
    ring += c0[::-1]
    dd = "M" + " L".join(f"{n(x)},{n(y)}" for x, y in ring) + "Z"
    s = f'<path d="{dd}" fill="{fill}" stroke="{OUT}" stroke-opacity="{OUTO}" stroke-width="{n(SW * K)}"/>'
    lit = TUBE_LIT.get(fill)
    if lit:
        st = [(x + nx * wi * .22, y + ny * wi * .22) for x, y, nx, ny, wi, _, _ in out[1:-1]]
        if len(st) >= 2:
            s += (f'<path d="M{" L".join(f"{n(x)},{n(y)}" for x, y in st)}" fill="none" stroke="{lit}" '
                  f'stroke-width="{n(w * .24)}" stroke-opacity=".55"/>')
    return f'<g {fx("vol")}>{s}</g>' if vol else s


def circ(cx, cy, r, fill, sw=SW, stroke=OUT) -> str:
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{paint(fill)}" stroke="{stroke}" stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}/>'


def ell(cx, cy, rx, ry, fill, sw=SW, stroke=OUT, rot=0) -> str:
    t = f' transform="rotate({rot} {n(cx)} {n(cy)})"' if rot else ""
    return (f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{paint(fill)}" stroke="{stroke}" '
            f'stroke-width="{n(sw * K) if stroke == OUT else sw}"{_so(stroke)}{t}/>')


def spec(cx, cy, rx, ry, op=.85, rot=0, col="#ffffff") -> str:
    """Specular highlight blob."""
    t = f' transform="rotate({rot} {n(cx)} {n(cy)})"' if rot else ""
    return f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{col}" fill-opacity="{op}" stroke="none" {fx("soft")}{t}/>'


def dot(cx, cy, r, fill, op=None) -> str:
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{paint(fill)}" stroke="none"{o}/>'


def rivet(cx, cy, r=0.75) -> str:
    return dot(cx, cy, r, GOLD_D) + dot(cx - r * .3, cy - r * .3, r * .5, GOLD_L)


def shadow(cx: float = 60, rx: float = 36, ry: float = 6, cy: float = 128) -> str:
    return (f'<ellipse cx="{n(cx + 3)}" cy="{cy}" rx="{n(rx)}" ry="{n(ry)}" fill="#2b1a0b" fill-opacity=".32" {fx("shadow")}/>'
            f'<ellipse cx="{n(cx + 1)}" cy="{cy}" rx="{n(rx * .55)}" ry="{n(ry * .5)}" fill="#2b1a0b" fill-opacity=".18" {fx("soft")}/>')


def svg(body: list[str]) -> str:
    content = "".join(body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><defs>{defs()}</defs>'
            f'<g stroke-linejoin="round" stroke-linecap="round">{content}</g></svg>')


# ---------------------------------------------------------------- shared parts

def face(cx: float, cy: float, rx: float = 8.5, ry: float = 9.5, old: bool = False) -> list[str]:
    """Head in 3/4 view looking to the viewer's left."""
    o = [V(ell(cx, cy, rx, ry, SKIN),
           SH(f"M{cx+1.5},{cy-ry+1.2} Q{cx+rx-0.8},{cy} {cx+1.5},{cy+ry-1.2} Q{cx+rx*0.55},{cy} {cx+1.5},{cy-ry+1.2}Z", SKIN_D, .7),
           ell(cx + rx - 1.5, cy + 1, 1.8, 2.6, SKIN, 1))]
    o.append(L(f"M{cx+rx-1.9},{cy-0.2} Q{cx+rx-0.8},{cy+1} {cx+rx-1.8},{cy+2.4}", SKIN_D, .7, .8))
    # cheek warmth + brow shadow
    o.append(spec(cx - 4.4, cy + 3, 2.4, 1.6, .35, 0, "#d26a4a"))
    o.append(spec(cx - 1.8, cy - 2.2, 4.5, 1.3, .25, 0, "#7a4a2a"))
    # eyes with catchlight
    o.append(f'<ellipse cx="{n(cx-4.3)}" cy="{n(cy-0.5)}" rx="1" ry="1.4" fill="{OUT}"/>')
    o.append(f'<ellipse cx="{n(cx+1.3)}" cy="{n(cy-0.5)}" rx="1.1" ry="1.5" fill="{OUT}"/>')
    o.append(dot(cx - 4.6, cy - 1, .35, "#fff", .9) + dot(cx + 1, cy - 1, .38, "#fff", .9))
    brow = "#d8d2c4" if old else HAIR
    o.append(L(f"M{cx-6},{cy-3.2} L{cx-2.8},{cy-3.6} M{cx-0.5},{cy-3.6} L{cx+3.3},{cy-3.2}", brow, 1.2, .95))
    # nose with lit bridge, mouth
    o.append(L(f"M{cx-6.6},{cy} Q{cx-8.6},{cy+3} {cx-6.2},{cy+3.6}", SKIN_D, 1.1, .9))
    o.append(L(f"M{cx-7},{cy+0.2} Q{cx-7.9},{cy+2} {cx-7.3},{cy+2.8}", SKIN_L, .6, .8))
    o.append(L(f"M{cx-5.6},{cy+5.6} Q{cx-3},{cy+6.6} {cx-0.6},{cy+5.4}", "#8a4a30", 1, .9))
    o.append(L(f"M{cx-4.6},{cy+7.2} Q{cx-3},{cy+7.7} {cx-1.6},{cy+7.2}", SKIN_D, .7, .6))
    return o


def crest_strands(cx: float, cy: float, t: float, rx: float, h: float) -> str:
    """Horsehair texture inside the crest (clipped to it)."""
    d = ""
    for k in range(7):
        f = 0.25 + k * 0.11
        d += (f"M{n(cx-rx+1)},{n(cy-4)} Q{n(cx-rx-1+k*.3)},{n(t-h*f)} {n(cx-1)},{n(t-h*(f+.05))} "
              f"Q{n(cx+rx+1)},{n(t-h*f)} {n(cx+rx+3)},{n(cy-5.5)} ")
    return (f'<g clip-path="url(#{PFX}crest)">' + L(d, RED_L, .5, .55)
            + L(d.replace(f"M{n(cx-rx+1)}", f"M{n(cx-rx+1.6)}"), "#4a0e0a", .4, .3).replace('d="', 'transform="translate(.5,.8)" d="')
            + "</g>")


def galea(cx: float, cy: float, crest: str | None = None, rx: float = 8.5, h: float = 11) -> list[str]:
    """Imperial helmet on a head centred at cx,cy (head top = cy-9.5)."""
    t = cy - 9.5
    o = []
    # neck guard (flares behind, to the right)
    o.append(P(f"M{cx+5},{cy-2} L{cx+rx+6},{cy+2} L{cx+rx+4.5},{cy+5.5} L{cx+rx-2},{cy+3}Z", STEEL_D, 1.1))
    o.append(L(f"M{cx+rx+5.2},{cy+2.6} L{cx+rx+4},{cy+5}", STEEL_L, .6, .6))
    # bowl
    bowl = [P(f"M{cx-rx-1},{cy-3} Q{cx-rx-1},{t-2.5} {cx},{t-2.5} Q{cx+rx+1.5},{t-2.5} {cx+rx+1.5},{cy-3} Q{cx},{cy-1} {cx-rx-1},{cy-3}Z", STEEL),
            SH(f"M{cx+3},{t-1.5} Q{cx+rx+1},{t+1} {cx+rx+1},{cy-3} Q{cx+5},{cy-2.6} {cx+3},{t-1.5}Z", "#3f464d", .45)]
    o.append(V(bowl))
    o.append(spec(cx - 3.6, t + 0.6, 3.2, 1.6, .9, -30))
    o.append(dot(cx - 4.2, t + 0.4, .9, "#fff"))
    o.append(L(f"M{cx-rx+1},{cy-4.6} Q{cx-rx+1.5},{t+2} {cx-3},{t-0.8}", "#fff", .6, .6))
    # brow band with rivets
    o.append(P(f"M{cx-rx-1.5},{cy-3.6} Q{cx},{cy-5.8} {cx+rx+1.5},{cy-3.6} L{cx+rx+1.2},{cy-1.4} Q{cx},{cy-3.6} {cx-rx-1.5},{cy-1.4}Z", GOLD, 1))
    o.append(L(f"M{cx-rx-0.5},{cy-3.4} Q{cx-2},{cy-5.2} {cx+2},{cy-5}", GOLD_L, .6, .8))
    # cheek guards (near one is big, far one peeks out)
    o.append(P(f"M{cx-rx-0.5},{cy-1.6} L{cx-rx+2.6},{cy-1.4} L{cx-rx+2.2},{cy+7} L{cx-rx-0.5},{cy+5}Z", STEEL, 1))
    o.append(V(P(f"M{cx+2.8},{cy-1.2} L{cx+rx+1.2},{cy-1.4} L{cx+rx-0.2},{cy+8} L{cx+2.4},{cy+9.4}Z", STEEL, 1)))
    o.append(rivet(cx + 4.6, cy + 0.6, .65) + rivet(cx + 4.4, cy + 6.8, .65))
    o.append(L(f"M{cx+3.4},{cy-0.4} L{cx+3.1},{cy+8.4}", STEEL_L, .6, .7))
    if crest == "plume":  # feathered plume swept back by the lunge
        o.append(P(f"M{cx-2.5},{t-2} L{cx+2.5},{t-2} L{cx+3},{t-5} L{cx-3},{t-5}Z", GOLD, 1))
        pl = (f"M{cx-2.8},{t-4.5} Q{cx-5},{t-9} {cx-1},{t-10.5} Q{cx+7},{t-12.5} {cx+16},{t-7} "
              f"Q{cx+11},{t-6.5} {cx+9},{t-4} Q{cx+6},{t-3.6} {cx+3},{t-4.5}Z")
        o.append(V(P(pl, RED)))
        d = "".join(f"M{n(cx - 1 + k * 1.9)},{n(t - 5 - (0.5 if k < 4 else 0))} Q{n(cx + k * 1.9)},{n(t - 9.5 + k * .1)} {n(cx + 2.5 + k * 2.1)},{n(t - 10.6 + k * .45)} " for k in range(7))
        o.append(f'<clipPath id="{PFX}crest"><path d="{pl}"/></clipPath>')
        o.append(f'<g clip-path="url(#{PFX}crest)">' + L(d, RED_L, .55, .75)
                 + L(d, "#4a0e0a", .45, .35).replace('d="', 'transform="translate(.9,.9)" d="') + "</g>")
        o.append(spec(cx - 1, t - 8.6, 2.6, 1, .45, -15, "#ffc8b8"))
    elif crest == "crest":  # front-to-back horsehair crest
        cr = (f"M{cx-rx},{cy-4} Q{cx-rx-1},{t-h+1} {cx-1},{t-h} Q{cx+rx+2},{t-h+1} {cx+rx+4},{cy-6} "
              f"Q{cx+rx+3.5},{cy-1.5} {cx+rx},{cy-3} Q{cx+rx},{t-4} {cx},{t-5} Q{cx-rx+1},{t-4.5} {cx-rx+1},{cy-3.5}Z")
        o.append(f'<clipPath id="{PFX}crest"><path d="{cr}"/></clipPath>')
        o.append(V(P(cr, RED)))
        o.append(crest_strands(cx, cy, t, rx, h))
        o.append(SH(f"M{cx-rx+1},{cy-5} Q{cx-rx},{t-h+3} {cx-1},{t-h+2} Q{cx},{t-6} {cx-rx+2},{cy-5}Z", "#ff9a80", .45))
    return o


def gladius(x: float, y: float, ang: float, length: float = 26) -> list[str]:
    """Short sword with the grip at x,y pointing at angle `ang` (deg, 0=right)."""
    o = [f'<g transform="translate({n(x)},{n(y)}) rotate({n(ang)})">']
    o.append(P("M-7,-1.6 L-7,1.6 L-2,1.6 L-2,-1.6Z", LEA_L, 1))
    o.append(L("M-6,-1.4 L-5,1.4 M-4.4,-1.4 L-3.4,1.4", LEA_D, .6, .8))
    o.append(P("M-1.6,-3.4 L1.2,-3.4 L1.2,3.4 L-1.6,3.4Z", GOLD, 1))
    o.append(P(f"M1.2,-2.4 L{length-5},-2.4 L{length},0 L{length-5},2.4 L1.2,2.4Z", STEEL, 1.1))
    o.append(S(f"M1.2,-2.4 L{length-5},-2.4 L{length-0.5},0 L{length-5},-0.3 L1.2,-0.3Z", "#ffffff", .55))
    o.append(L(f"M2.5,0.3 L{length-6},0.3", STEEL_D, .7, .8))
    o.append(circ(-8, 0, 2.2, g("goldr"), 1))
    o.append(dot(-8.7, -0.7, .6, "#fff6d0"))
    o.append("</g>")
    return o


def pteruges(x0: float, x1: float, y0: float, y1: float, nn: int = 6) -> list[str]:
    """Hanging leather strips between x0..x1."""
    o = []
    w = (x1 - x0) / nn
    for i in range(nn):
        a = x0 + i * w
        b = a + w - 0.6
        o.append(P(f"M{n(a)},{y0} L{n(b)},{y0} L{n(b-0.3)},{y1} L{n(a+0.3)},{y1}Z", LEA, 1))
        o.append(L(f"M{n(a+0.9)},{y0+1} L{n(a+1.1)},{y1-1}", LEA_L, .5, .7))
        o.append(rivet((a + b) / 2, y1 - 1.8, .95))
    o.append(SH(f"M{x0},{y0} L{x1},{y0} L{x1},{y0+3.5} L{x0},{y0+3.5}Z", "#2a1406", .45))
    return o


def sandal(x: float, y: float, dir: int = -1, w: float = 15) -> list[str]:
    """Foot with the toes pointing left (dir=-1) or right. x,y = ankle base."""
    tx = x + dir * w * 0.6
    hx = x - dir * w * 0.4
    o = [V(P(f"M{n(hx)},{n(y-2)} Q{n(hx+dir*2)},{n(y-5)} {n(x)},{n(y-4.5)} L{n(tx-dir*3)},{n(y-3.5)} Q{n(tx+dir*1.5)},{n(y-1.5)} {n(tx-dir*1)},{n(y+2)} L{n(hx)},{n(y+2.5)}Z", SKIN, 1.2))]
    o.append(P(f"M{n(hx+dir*0.5)},{n(y+1)} L{n(tx-dir*0.5)},{n(y+0.6)} L{n(tx-dir*1)},{n(y+3)} L{n(hx)},{n(y+3.2)}Z", LEA, 1))
    o.append(L(f"M{n(x-dir*2)},{n(y-4)} L{n(x-dir*1)},{n(y+1)} M{n(x+dir*3)},{n(y-3.4)} L{n(x+dir*2.5)},{n(y+0.8)} M{n(hx+dir*1)},{n(y-1.5)} L{n(x+dir*1)},{n(y-1)}", LEA_D, 1, .9))
    return o


def scutum(x0, x1, y0, y1, bow=3.0, boss=None, lw=1.5) -> list[str]:
    """Curved rectangular shield, front view. bow = vertical bulge of top/bottom edge."""
    mx = (x0 + x1) / 2
    w = x1 - x0
    by = boss if boss is not None else (y0 + y1) / 2
    o = [V(P(f"M{x0},{y0} Q{mx},{y0-bow} {x1},{y0} L{x1},{y1} Q{mx},{y1+bow} {x0},{y1}Z", g("scutum"), lw))]
    # curvature light: bright vertical sheen left of centre, soft dark on the right
    o.append(SH(f"M{n(x0+w*.12)},{y0+1} L{n(x0+w*.3)},{y0} L{n(x0+w*.3)},{y1} L{n(x0+w*.12)},{y1-1}Z", "#ff9a86", .32, "soft2"))
    o.append(SH(f"M{n(x1-w*.18)},{y0} L{x1},{y0+1} L{x1},{y1-1} L{n(x1-w*.18)},{y1}Z", "#3a0806", .35, "soft2"))
    # gold border
    i = 3
    o.append(P(f"M{x0+i},{y0+i} Q{mx},{y0-bow+i} {x1-i},{y0+i} L{x1-i},{y1-i} Q{mx},{y1+bow-i} {x0+i},{y1-i}Z", "none", 1.3, GOLD))
    o.append(P(f"M{x0+i},{y0+i} Q{mx},{y0-bow+i} {x1-i},{y0+i}", "none", .5, GOLD_L))
    # iron edging top + bottom
    o.append(L(f"M{x0},{y0} Q{mx},{y0-bow} {x1},{y0} M{x0},{y1} Q{mx},{y1+bow} {x1},{y1}", "#c3cad1", 1.1, .8))
    # vertical spine
    o.append(S(f"M{n(mx-1.5)},{y0+i+3} L{n(mx+1.5)},{y0+i+3} L{n(mx+1.5)},{y1-i-3} L{n(mx-1.5)},{y1-i-3}Z", GOLD))
    o.append(L(f"M{n(mx-1)},{y0+i+3} L{n(mx-1)},{y1-i-3}", GOLD_L, .5, .8))
    # wings / lightning motif
    a, b = x0 + 6, x1 - 6
    t1, t2 = by - 14, by + 14
    wing = (f"M{n(mx-3)},{n(by-6)} Q{n(a+1)},{n(t1+2)} {n(a)},{n(t1-4)} Q{n(a+5)},{n(t1+1)} {n(mx-2)},{n(by-8)}Z "
            f"M{n(mx-3)},{n(by+6)} Q{n(a+1)},{n(t2-2)} {n(a)},{n(t2+4)} Q{n(a+5)},{n(t2-1)} {n(mx-2)},{n(by+8)}Z "
            f"M{n(mx+3)},{n(by-6)} Q{n(b-1)},{n(t1+2)} {n(b)},{n(t1-4)} Q{n(b-5)},{n(t1+1)} {n(mx+2)},{n(by-8)}Z "
            f"M{n(mx+3)},{n(by+6)} Q{n(b-1)},{n(t2-2)} {n(b)},{n(t2+4)} Q{n(b-5)},{n(t2-1)} {n(mx+2)},{n(by+8)}Z")
    o.append(S(wing, GOLD))
    o.append(L(f"M{n(mx-5)},{n(by-4)} L{n(mx-1)},{n(by-1)} L{n(mx-4)},{n(by+1)} L{n(mx)},{n(by+5)}", GOLD_D, .9, .8))
    # boss
    o.append(V(circ(mx, by, 6.2, g("goldr"), 1.2)))
    o.append(circ(mx, by, 2.6, GOLD_L, .8))
    o.append(spec(mx - 2, by - 2.2, 1.6, 1, .9))
    for dx, dy in ((-4.6, -4.6), (4.6, -4.6), (-4.6, 4.6), (4.6, 4.6)):
        o.append(rivet(mx + dx * .7, by + dy * .7, .55))
    # scuffs
    o.append(L(f"M{n(x0+5)},{n(y1-12)} l3,-1.2 M{n(x1-8)},{n(y0+12)} l2.4,1.4", "#e8a090", .5, .45))
    return o


def round_shield(cx, cy, r, base=RED, rot=0) -> list[str]:
    o = [V(ell(cx, cy, r, r * 1.0 if rot == 0 else r * 1.15, base, 1.4, OUT, rot))]
    o.append(SH(f"M{n(cx-r*.75)},{n(cy-r*.1)} Q{n(cx-r*.6)},{n(cy-r*.75)} {n(cx+r*.1)},{n(cy-r*.85)} Q{n(cx-r*.45)},{n(cy-r*.5)} {n(cx-r*.6)},{n(cy+r*.2)}Z", "#fff2d8", .5))
    return o


def soft_folds(d: str, dark: str = "#2a1406", light: str | None = None, dl: str = "", w: float = 1.1) -> str:
    s = LS(d, dark, w, .45)
    if light and dl:
        s += LS(dl, light, w * .7, .5)
    return s


# ---------------------------------------------------------------- 1 Legionnaire

def legionnaire() -> list[str]:
    o = [shadow(60, 34)]
    o.append(tube("M70,82 L82,120", SKIN, 9))
    o += sandal(84, 122)
    o.append(V(P("M47,74 L76,74 L80,93 Q62,96 44,93Z", RED)))
    o.append(soft_folds("M58,80 Q57,88 58,94 M68,80 Q69,88 70,93", dl="M55,80 Q54,88 55,94", light=RED_L))
    o += pteruges(46, 79, 74, 89, 7)
    o.append(tube("M56,84 L48,102 L41,120", SKIN, 10))
    o.append(LS("M50,92 L45,104", "#fff3dc", 1.4, .45))
    o.append(LS("M44,108 Q46,112 44,116", SKIN_D, 1.2, .5))
    o += sandal(41, 122)
    o += lorica(46, 41, 78, 77)
    o.append(P("M50,72 L75,72 L76,78 L49,78Z", LEA, 1.1))
    o.append(L("M51,73.6 L75,73.6", LEA_L, .5, .7))
    o.append(P("M56,72.6 L60,72.6 L60,77.4 L56,77.4Z M64,72.6 L68,72.6 L68,77.4 L64,77.4Z", GOLD, 0.8))
    o.append(dot(57.4, 74, .6, GOLD_L) + dot(65.4, 74, .6, GOLD_L))
    o += shoulders_seg(66, 58)
    o.append(tube("M59,34 L60,42", SKIN, 8))
    o.append(SH("M56,38 L64,38 L64,42 L56,42Z", "#2a1406", .4))
    o.append(tube("M48,48 L42,66", RED, 9))
    o.append(tube("M44,62 L30,74", SKIN, 8))
    o.append(V(circ(29, 75, 4, SKIN, 1.2)))
    o += gladius(29, 75, 196, 28)
    o += face(58, 25)
    o += galea(58, 25)
    o.append(tube("M74,47 L70,58", RED, 9.5))
    o.append(tube("M72,56 L58,72", SKIN, 8.5))
    o.append('<g transform="rotate(-8 38 76)">')
    o += scutum(22, 54, 48, 106, 3, 76)
    o.append("</g>")
    return o


def lorica(x0, y0, x1, y1, bands=(47, 53, 59, 65, 71)) -> list[str]:
    """Segmented plate cuirass on the trunk box x0..x1, y0..y1."""
    mid = (y0 + y1) / 2 - 1
    o = [V(P(f"M{x0},{y0} L{x1},{y0} L{x1+2},{mid} L{x1-3},{y1} L{x0+4},{y1} L{x0-1},{mid}Z", STEEL))]
    for y in bands:
        if y >= y1 - 2:
            continue
        o.append(L(f"M{n(x0 - 0.8 + (y-y0)*0.1)},{y} Q{(x0+x1)/2},{y+2} {n(x1 + 1 - (y-y0)*0.12)},{y}", "#4e555c", 1, .85))
        o.append(L(f"M{n(x0 + 0.5 + (y-y0)*0.1)},{y+1} Q{(x0+x1)/2-4},{y+2.8} {n(x1 - 8)},{y+2.4}", "#ffffff", .6, .6))
    o.append(SH(f"M{x0+2},{y0+2} L{x0+8},{y0+2} L{x0+6},{y1-12} L{x0+1},{mid}Z", "#ffffff", .45))
    o.append(spec(x0 + 6, y0 + 7, 2.2, 3.4, .75))
    # front closure rivets
    cx = (x0 + x1) / 2 + 1
    for y in bands:
        if y < y1 - 2:
            o.append(rivet(cx, y + 2.6, .6))
    return o


def shoulders_seg(r: float, l: float) -> list[str]:
    o = [V(P(f"M{r},40 Q{r+12},36 {r+18},44 L{r+16},50 Q{r+8},45 {r},46Z", STEEL, 1.2)),
         V(P(f"M{r},44 Q{r+11},41 {r+17},49 L{r+15},54 Q{r+8},49 {r},50Z", STEEL, 1.2)),
         V(P(f"M{l},40 Q{l-10},36 {l-16},44 L{l-14},50 Q{l-8},45 {l},46Z", STEEL, 1.2))]
    o.append(L(f"M{r+1},41.6 Q{r+10},38.6 {r+15},44", "#ffffff", .6, .7))
    o.append(L(f"M{l-1},41.6 Q{l-9},38.6 {l-13.6},43.6", "#ffffff", .7, .8))
    o.append(rivet(r + 3, 42.6, .6) + rivet(l - 3, 42.6, .6))
    return o


# ---------------------------------------------------------------- 2 Praetorian

def praetorian() -> list[str]:
    o = [shadow(60, 38)]
    o.append(V(P("M70,44 Q96,56 104,96 Q92,100 78,92 Q86,78 72,66Z", PURPLE)))
    o.append(soft_folds("M80,54 Q94,72 92,96 M76,62 Q86,74 82,92", dark="#1a0a26", light="#b48ad6", dl="M86,56 Q100,72 100,92"))
    o.append(tube("M70,84 L82,100 L84,118", SKIN, 9.5))
    o += sandal(86, 122)
    o.append(V(P("M48,76 L76,76 L80,94 Q62,97 46,94Z", RED)))
    o += pteruges(47, 79, 76, 91, 7)
    o.append(tube("M54,86 L40,100 L36,120", SKIN, 10.5))
    o.append(LS("M48,90 L40,99", "#fff3dc", 1.4, .45))
    o += sandal(35, 122, w=16)
    o += muscle_cuirass(46, 43, 78, 80)
    o.append(V(P("M66,40 Q78,36 83,45 L80,50 Q73,45 66,46Z", GOLD, 1.1)))
    o.append(V(P("M58,40 Q48,37 43,45 L46,50 Q51,45 58,46Z", GOLD, 1.1)))
    o.append(L("M57,41 Q49,39 45,44", GOLD_L, .7, .8))
    o.append(tube("M60,36 L61,44", SKIN, 8))
    o.append(tube("M47,53 L40,62", RED, 9))
    o.append(tube("M42,60 L32,66", SKIN, 8))
    o += face(59, 28)
    o += galea(59, 28, "crest")
    o.append(tube("M74,49 L66,60", RED, 9.5))
    o += spear(100, 36, 12, 76)
    o.append(V(circ(32, 67, 4.2, SKIN, 1.2)))
    o += scutum(20, 58, 56, 116, 4, 86)
    return o


def spear(x0, y0, x1, y1) -> list[str]:
    """Spear shaft from butt (x0,y0) to the socket (x1,y1); blade drawn beyond, pointing down-left."""
    o = [L(f"M{x0},{y0} L{x1},{y1}", OUT, 4.4, .75), L(f"M{x0},{y0} L{x1},{y1}", WOOD, 2.4, 1)]
    o.append(L(f"M{x0},{y0-0.6} L{x1},{y1-0.6}", WOOD_L, .7, .8))
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    px, py = -uy, ux
    tip = (x1 + ux * 15, y1 + uy * 15)
    a = (x1 + ux * 5 + px * 3, y1 + uy * 5 + py * 3)
    b = (x1 + ux * 5 - px * 3, y1 + uy * 5 - py * 3)
    o.append(P(f"M{n(x1-ux)},{n(y1-uy)} L{n(a[0])},{n(a[1])} L{n(tip[0])},{n(tip[1])} L{n(b[0])},{n(b[1])}Z", STEEL, 1.1))
    o.append(S(f"M{n(x1)},{n(y1)} L{n(b[0])},{n(b[1])} L{n(tip[0])},{n(tip[1])}Z", "#ffffff", .5))
    o.append(L(f"M{n(x1+ux*2)},{n(y1+uy*2)} L{n(tip[0]-ux*2)},{n(tip[1]-uy*2)}", STEEL_D, .6, .8))
    o.append(P(f"M{n(x1-ux*3+px*1.6)},{n(y1-uy*3+py*1.6)} L{n(x1+px*1.6)},{n(y1+py*1.6)} L{n(x1-px*1.6)},{n(y1-py*1.6)} L{n(x1-ux*3-px*1.6)},{n(y1-uy*3-py*1.6)}Z", STEEL_D, .9))
    return o


def muscle_cuirass(x0, y0, x1, y1, gold_bottom=False) -> list[str]:
    mid = (y0 + y1) / 2 - 1
    cx = (x0 + x1) / 2
    o = [V(P(f"M{x0},{y0} L{x1},{y0} L{x1+2},{mid} L{x1-4},{y1} L{x0+4},{y1} L{x0-2},{mid}Z", STEEL))]
    # sculpted pecs and abdomen
    o.append(SH(f"M{cx-12},{y0+4} Q{cx-5},{y0+3} {cx-1},{y0+6} Q{cx-2},{y0+12} {cx-8},{y0+13} Q{cx-12},{y0+11} {cx-12},{y0+4}Z", "#ffffff", .55))
    o.append(SH(f"M{cx+3},{y0+6} Q{cx+8},{y0+3} {cx+13},{y0+5} Q{cx+14},{y0+11} {cx+8},{y0+13} Q{cx+3},{y0+12} {cx+3},{y0+6}Z", "#ffffff", .25))
    o.append(L(f"M{cx},{y0+5} Q{cx},{y1-10} {cx-1},{y1-2} M{cx-10},{y0+13} Q{cx},{y0+16} {cx+12},{y0+13} M{cx-11},{y0+22} Q{cx},{y0+24} {cx+12},{y0+22}", "#4e555c", 1, .7))
    o.append(L(f"M{cx-10},{y0+14} Q{cx-2},{y0+16.6} {cx+2},{y0+16.4} M{cx-10},{y0+23} Q{cx-3},{y0+25} {cx+2},{y0+25}", "#ffffff", .6, .6))
    o.append(spec(cx - 8, y0 + 7, 2.4, 2, .9))
    o.append(P(f"M{x0},{y0} L{x1},{y0} L{x1-0.4},{y0+5} L{x0+0.4},{y0+5}Z", GOLD, 1))
    o.append(L(f"M{x0+1},{y0+1.4} L{x1-1},{y0+1.4}", GOLD_L, .6, .8))
    if gold_bottom:
        o.append(P(f"M{x0+4},{y1-6} L{x1-4},{y1-6} L{x1-3.4},{y1} L{x0+3.4},{y1}Z", GOLD, 1))
        o.append(L(f"M{x0+5},{y1-4.6} L{x1-5},{y1-4.6}", GOLD_L, .5, .8))
    return o


# ---------------------------------------------------------------- 3 Imperian

def imperian() -> list[str]:
    o = [shadow(58, 44, 5.5)]
    o.append(V(P("M70,42 Q98,46 112,70 Q104,78 96,74 Q92,84 86,86 Q84,64 70,56Z", RED)))
    o.append(soft_folds("M80,50 Q96,60 98,74 M76,56 Q86,66 88,82", dark="#2a0604", light=RED_L, dl="M84,48 Q102,54 108,66"))
    o.append(tube("M68,80 L96,116", SKIN, 9.5))
    o += sandal(100, 120, w=15)
    o.append(V(P("M44,72 L72,72 L78,90 Q60,93 40,90Z", RED)))
    o += pteruges(43, 77, 72, 87, 7)
    o.append(tube("M50,82 L30,96 L24,120", SKIN, 10.5))
    o.append(LS("M44,87 L31,96", "#fff3dc", 1.4, .45))
    o += sandal(22, 122, w=16)
    o += muscle_cuirass(42, 40, 74, 76, gold_bottom=True)
    o.append(V(P("M62,38 Q74,33 80,42 L77,48 Q70,43 62,44Z", GOLD, 1.1)))
    o.append(V(P("M54,38 Q44,34 38,42 L41,48 Q47,43 54,44Z", GOLD, 1.1)))
    o.append(L("M53,39 Q45,36 40,41.6", GOLD_L, .7, .8))
    o.append(tube("M57,33 L58,41", SKIN, 8))
    o.append(tube("M72,46 L80,60", RED, 9))
    o.append(tube("M78,58 L76,72", SKIN, 8))
    # small round steel shield at the hip
    o.append(V(ell(80, 76, 10, 11.5, STEEL, 1.4, OUT, -12)))
    o.append(ell(80, 76, 7, 8.5, "none", 1, GOLD, -12))
    o.append(spec(75.5, 70, 3, 1.6, .85, -40))
    o.append(V(circ(80, 76, 2.6, g("goldr"), 1)))
    o += face(55, 22)
    o += galea(55, 22, "plume")
    o.append(tube("M44,46 L36,52", RED, 9))
    o.append(tube("M38,50 L28,53", SKIN, 8))
    o.append(V(circ(27, 53, 4, SKIN, 1.2)))
    o += gladius(27, 53, 186, 24)
    return o


# ---------------------------------------------------------------- horses

def hoof(x: float, y: float) -> str:
    return (P(f"M{n(x-3.2)},{n(y-4.4)} L{n(x+3.2)},{n(y-4.4)} Q{n(x+4)},{n(y-2)} {n(x+4.4)},{n(y+0.5)} L{n(x-4.4)},{n(y+0.5)} Q{n(x-4)},{n(y-2)} {n(x-3.2)},{n(y-4.4)}Z", g("hoof"), 1.1)
            + L(f"M{n(x-2.8)},{n(y-3.4)} Q{n(x-3.4)},{n(y-1.6)} {n(x-3.6)},{n(y)}", "#9a8a7c", .6, .7))


def leg(pts, col: str, wu: float = 9.5, wl: float = 6.5) -> list[str]:
    (ax, ay), (bx, by), (cx, cy) = pts
    return [tube(f"M{ax},{ay} L{bx},{by} L{cx},{cy}", col, wu, kind="horse"), hoof(cx, cy)]


def horse_head(px: float, py: float, col: str, dark: str, light: str, drop: float = 1.0, armour: bool = False) -> list[str]:
    """Head hanging from the poll at px,py; `drop` 1 = stretched low, 0.5 = head carried high."""
    mx, my = px - 22, py + 18 * drop + 4
    o = []
    o.append(P(f"M{px-4},{py+1} L{px-2},{py-8} L{px+2},{py+1}Z", col, 1.1))
    o.append(S(f"M{px-2.6},{py} L{px-2},{py-5} L{px+0.4},{py}Z", "#1a0e08", .45))
    o.append(P(f"M{px+2},{py+1} L{px+6},{py-7} L{px+8},{py+2}Z", col, 1.1))
    d = (f"M{px+2},{py} Q{px+8},{py+3} {px+6},{py+11} L{mx+10},{my-2} Q{mx+4},{my+5} {mx-2},{my+3} "
         f"Q{mx-6},{my} {mx-4},{my-5} L{px-10},{py+9} Q{px-6},{py-1} {px+2},{py}Z")
    o.append(V(P(d, col)))
    o.append(SH(f"M{px-2},{py+6} L{mx+8},{my-3} L{mx+2},{my+2} Q{px-1},{py+12} {px+1},{py+8}Z", dark, .7))
    o.append(SH(f"M{px-8},{py+8} L{mx-2},{my-4} L{mx},{my-1} L{px-6},{py+11}Z", light, .8))
    # cheekbone + muzzle
    o.append(LS(f"M{px+1},{py+5} Q{px+4},{py+9} {px-1},{py+12}", "#1a0e08", 1.1, .5))
    o.append(spec(mx + 1, my - 1, 3, 2.4, .25, 0, "#2a1a10"))
    if armour:  # chamfron
        o.append(V(P(f"M{px-1},{py+1} Q{px+5},{py+4} {px+3},{py+11} L{mx+9},{my-3} L{mx+4},{my-6} L{px-7},{py+6}Z", STEEL, 1.1)))
        o.append(spec(px - 4, py + 6, 3.4, 1.4, .8, -35))
        o.append(rivet(px - 6, py + 9, .6) + rivet(mx + 7, my - 4, .6))
        o.append(circ(px - 2, py + 8, 1.8, BLACK, 0.8))
    else:
        o.append(circ(px - 3, py + 7, 1.8, BLACK, 0.8))
        o.append(dot(px - 3.6, py + 6.4, .6, "#fff"))
    o.append(f'<ellipse cx="{n(mx-1)}" cy="{n(my-1)}" rx="1.2" ry="1.6" fill="#1a0e08" stroke="none"/>')
    o.append(L(f"M{mx-3},{my+1.5} L{mx+3},{my+2}", OUT, 0.9))
    # bridle: noseband + cheek strap with gold studs
    o.append(L(f"M{mx+3},{my-5} L{mx+5},{my+2} M{mx+4},{my-2} L{px-6},{py+9}", LEA_D, 1.5, 1))
    o.append(rivet(mx + 4.2, my - 2, .7) + rivet(px - 6, py + 9, .7))
    return o


def horse_body(d: str, col: str, shade_d: str, hi_d: str, muscles: str, dark: str) -> list[str]:
    o = [V(P(d, col))]
    o.append(SH(shade_d, dark, .75))
    o.append(SH(hi_d, "#fff0d0", .35, "soft2"))
    o.append(LS(muscles, "#1a0e08", 1.2, .4))
    return o


def mane(d: str, strands: str) -> list[str]:
    return [V(P(d, g("mane"), 1.2)), L(strands, "#8a6a4a", .5, .55)]


# ---------------------------------------------------------------- 4 Equites Legati

def legati() -> list[str]:
    o = [shadow(60, 54)]
    o.append('<g transform="translate(61,128) scale(.96) translate(-60,-128)">')
    col, dark, light = CHEST, CHEST_D, CHEST_L
    o += mane("M98,70 Q110,62 118,68 Q112,72 117,82 Q110,76 106,84 Q107,76 98,78Z", "M102,71 Q110,66 115,69 M104,74 Q110,72 114,79 M103,76 Q107,78 107,82")
    o += leg([(40, 84), (30, 100), (40, 112)], dark, 9, 6)
    o += leg([(92, 84), (100, 100), (92, 116)], dark, 9, 6)
    o += horse_body("M30,72 Q24,80 30,92 Q42,102 64,100 Q86,100 98,92 Q106,84 100,72 Q94,64 82,66 Q62,70 46,66 Q34,64 30,72Z", col,
                    "M34,90 Q50,100 70,99 Q90,98 98,90 Q90,96 66,96 Q46,97 34,90Z",
                    "M42,68 Q60,72 84,68 Q62,76 44,72Z M86,70 Q98,68 100,76 Q94,74 88,76Z",
                    "M38,76 Q44,84 40,92 M86,74 Q82,84 88,92 M54,94 Q66,90 80,94", dark)
    o += leg([(88, 86), (102, 104), (108, 122)], col)
    o += leg([(36, 86), (22, 103), (12, 122)], col)
    o.append(V(P("M48,66 Q38,54 26,40 L17,50 Q26,62 32,78Z", col)))
    o.append(SH("M46,66 Q38,56 29,45 L24,50 Q30,62 34,76Z", dark, .6))
    o.append(LS("M22,50 Q28,60 30,70", "#fff0d0", 1.4, .35))
    o += mane("M28,36 Q38,34 44,42 Q50,52 56,62 Q50,58 46,54 Q40,46 33,46 Q29,44 24,40Z", "M32,38 Q40,40 44,48 M36,42 Q44,46 50,56 M40,44 Q46,50 52,58")
    o += horse_head(26, 40, col, dark, light, 1.0)
    o.append(L("M8,56 Q30,56 44,62", LEA_D, 1.4, 1))
    # saddle cloth with fringe
    o.append(V(P("M48,66 L80,68 L82,84 L46,84Z", RED, 1.2)))
    o.append(L("M49,81 L81.6,81", GOLD, 1, .9))
    o.append(L("M48,84 l0,1.6 M51,84 l0,1.6 M54,84 l0,1.6 M57,84 l0,1.6 M63,84 l0,1.6 M66,84 l0,1.6 M69,84 l0,1.6 M72,84 l0,1.6 M75,84 l0,1.6 M78,84 l0,1.6 M81,84 l0,1.6", GOLD_D, .8, .9))
    o.append(L("M60,84 L60,98", LEA_D, 1.6, 1))
    o.append(tube("M62,70 L50,84 L46,98", SKIN, 8))
    o += sandal(45, 101, w=12)
    # tunic (white wool, red clavus)
    o.append(V(P("M52,44 L70,44 L72,68 L52,68Z", WHITE)))
    o.append(S("M60,44 L63,44 L63,68 L60,68Z", RED))
    o.append(soft_folds("M56,48 Q55,58 56,66 M66,48 Q67,58 68,66", dark="#5a4a30"))
    o.append(V(P("M52,64 L72,64 L74,76 L50,76Z", WHITE, 1.2)))
    o.append(soft_folds("M56,66 L54,75 M64,66 L64,75 M70,66 L72,75", dark="#5a4a30"))
    o.append(P("M52,61 L72,61 L72,65 L52,65Z", LEA, 1))
    o.append(rivet(58, 63, .8))
    o.append(tube("M70,48 L68,58", WHITE, 9))
    o.append(tube("M69,56 L48,64", SKIN, 7.5))
    o.append(V(circ(46, 64, 3.6, SKIN, 1.1)))
    o.append(tube("M59,36 L60,44", SKIN, 7.5))
    o += face(58, 27)
    o.append(V(P("M48.5,24 Q50,15 58,14.5 Q67,15 67.5,25 Q64,21 58,21 Q53,21 48.5,24Z", HAIR)))
    o.append(L("M51,20 Q55,16.6 60,16.4 M54,19 Q58,17.6 63,18.6", "#8a6040", .6, .7))
    o.append(tube("M52,48 L43,40", WHITE, 8.5))
    o.append(tube("M44,40 L48,28", SKIN, 7))
    o.append(V(P("M44,22 L56,21 L57,25 L46,27Z", SKIN, 1.1)))
    o.append(L("M47,23.2 L55,22.4", SKIN_D, .6, .7))
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 5 Equites Imperatoris

def imperatoris() -> list[str]:
    o = [shadow(62, 54)]
    o.append('<g>')
    col, dark, light = BAY, BAY_D, BAY_L
    o.append(V(P("M70,40 Q98,42 112,62 Q102,68 94,64 Q98,78 90,84 Q86,62 72,54Z", RED)))
    o.append(soft_folds("M80,46 Q96,52 104,62 M78,52 Q88,62 90,80", dark="#2a0604", light=RED_L, dl="M84,44 Q100,48 108,58"))
    o += mane("M100,72 Q112,66 118,74 Q112,78 115,88 Q108,82 104,90 Q106,80 98,80Z", "M103,73 Q111,69 115,74 M104,76 Q110,77 112,85 M102,79 Q105,82 105,87")
    o += leg([(46, 80), (36, 96), (30, 108)], dark, 9, 6)
    o += leg([(88, 90), (88, 108), (80, 122)], dark, 9, 6)
    o += horse_body("M34,62 Q26,70 32,84 Q46,96 68,96 Q90,98 102,92 Q110,84 104,74 Q98,66 86,70 Q66,70 48,60 Q38,56 34,62Z", col,
                    "M36,84 Q50,95 70,95 Q92,96 102,88 Q92,92 68,92 Q48,92 36,84Z",
                    "M48,62 Q66,70 86,70 Q68,76 50,68Z M88,72 Q100,70 102,78 Q96,76 90,78Z",
                    "M40,68 Q46,76 42,86 M90,74 Q86,82 92,90 M56,90 Q68,86 82,90", dark)
    o += leg([(94, 86), (106, 104), (108, 122)], col)
    o += leg([(40, 78), (26, 88), (14, 98)], col)
    o.append(V(P("M52,62 Q42,48 32,34 L22,42 Q32,58 38,72Z", col)))
    o.append(SH("M50,62 Q42,52 34,40 L29,44 Q34,58 40,70Z", dark, .6))
    o.append(LS("M26,44 Q32,56 36,66", "#fff0d0", 1.4, .35))
    o += mane("M34,30 Q44,30 48,40 Q52,50 58,58 Q52,56 48,52 Q44,44 38,42 Q34,40 30,36Z", "M37,32 Q44,34 47,42 M40,38 Q47,44 52,52 M44,42 Q49,48 55,56")
    o += horse_head(30, 34, col, dark, light, 0.55)
    o.append(L("M12,52 Q32,54 46,60", LEA_D, 1.4, 1))
    o.append(V(P("M50,62 L80,66 L84,84 L46,80Z", RED, 1.2)))
    o.append(V(P("M48,58 L82,62 L82,66 L48,64Z", GOLD, 1)))
    o.append(L("M47,80 L84,84", GOLD, 1, .9))
    o.append(tube("M66,68 L56,84 L54,98", SKIN, 8))
    o += sandal(53, 101, w=12)
    o.append(V(P("M50,70 L78,70 L80,80 L48,80Z", RED, 1.2)))
    o += pteruges(49, 79, 70, 80, 6)
    o.append(V(P("M52,42 L72,42 L76,60 L74,72 L50,72 L48,60Z", STEEL)))
    o.append(SH("M53,45 L58,45 L56,64 L50,62Z", "#ffffff", .55))
    o.append(L("M62,46 Q62,62 61,72 M53,54 Q62,56 73,54", "#4e555c", .9, .7))
    o.append(spec(55, 50, 2, 3, .8))
    o.append(P("M52,42 L72,42 L71.6,46.5 L52.4,46.5Z", GOLD, 1))
    o.append(V(P("M60,37 Q50,34 46,42 L49,48 Q54,44 60,44Z", GOLD, 1.1)))
    o.append(V(P("M64,37 Q74,34 78,42 L75,48 Q70,44 64,44Z", GOLD, 1.1)))
    o.append(L("M59,38 Q51,36 47.6,41.6", GOLD_L, .7, .8))
    o.append(tube("M61,34 L62,42", SKIN, 7.5))
    o.append(tube("M54,46 L44,52", RED, 8.5))
    o.append(tube("M46,50 L34,56", SKIN, 7.5))
    o += face(60, 25)
    o += galea(60, 25, "crest", h=10.5)
    o += spear(94, 32, 16, 67)
    o.append(V(circ(34, 57, 3.8, SKIN, 1.1)))
    o.append(tube("M72,47 L78,58", RED, 8.5))
    o += round_shield(80, 66, 11.5)
    o.append(circ(80, 66, 8, "none", 1, GOLD))
    o.append(circ(80, 66, 8.6, "none", .5, GOLD_L))
    o.append(V(circ(80, 66, 3.2, g("goldr"), 1)))
    o.append(dot(79, 65, .7, "#fff6d0"))
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 6 Equites Caesaris

def scales(x0, y0, x1, y1, step=3.2, rows_off=0.0) -> str:
    """Scale-armour texture: little downward arcs."""
    d = ""
    r = 0
    y = y0
    while y < y1:
        x = x0 + (step / 2 if r % 2 else 0)
        while x < x1:
            d += f"M{n(x)},{n(y)} q{n(step/2)},{n(step*.7)} {n(step)},0 "
            x += step
        y += step * .7
        r += 1
    return d


def caesaris() -> list[str]:
    o = [shadow(60, 54)]
    o.append('<g>')
    col, dark, light = BLACK_L, BLACK, "#7a6c62"
    o.append(V(P("M72,40 Q100,44 112,66 Q102,70 94,66 Q98,80 88,86 Q86,64 72,56Z", RED)))
    o.append(soft_folds("M82,46 Q98,54 104,64 M78,54 Q88,64 88,82", dark="#2a0604", light=RED_L, dl="M86,44 Q102,50 108,60"))
    o += mane("M100,70 Q112,64 118,72 Q112,76 116,86 Q108,80 104,88 Q106,78 98,78Z", "M103,71 Q111,67 115,72 M104,74 Q110,75 113,83 M102,77 Q105,80 105,85")
    o += leg([(44, 86), (42, 106), (40, 122)], dark, 10, 7)
    o += leg([(88, 88), (86, 106), (82, 122)], dark, 10, 7)
    o += horse_body("M32,70 Q24,80 30,94 Q44,104 66,102 Q90,102 100,94 Q108,84 102,72 Q96,64 84,66 Q62,70 46,66 Q36,64 32,70Z", col,
                    "M36,92 Q50,102 70,100 Q92,100 100,92 Q92,98 66,98 Q48,98 36,92Z",
                    "M44,68 Q62,72 82,68 Q62,76 46,72Z",
                    "M56,96 Q68,92 80,96", dark)
    # scale barding over croup + chest
    o.append(V(P("M82,66 Q100,66 104,76 Q106,86 100,94 Q92,98 88,90 Q90,78 82,72Z", STEEL, 1.1)))
    o.append(V(P("M30,72 Q24,84 32,94 Q40,92 40,80 Q42,70 36,66Z", STEEL, 1.1)))
    o.append(f'<clipPath id="{PFX}cb"><path d="M82,66 Q100,66 104,76 Q106,86 100,94 Q92,98 88,90 Q90,78 82,72Z M30,72 Q24,84 32,94 Q40,92 40,80 Q42,70 36,66Z"/></clipPath>')
    o.append(f'<g clip-path="url(#{PFX}cb)">' + L(scales(82, 66, 106, 98, 3.6) + scales(24, 66, 42, 96, 3.6), "#4e555c", .6, .75)
             + L(scales(82.4, 66.7, 106, 98, 3.6) + scales(24.4, 66.7, 42, 96, 3.6), "#ffffff", .4, .45) + "</g>")
    o.append(spec(90, 72, 4, 2, .7, 20) + spec(32, 76, 1.8, 4, .7))
    o += leg([(92, 88), (104, 106), (106, 122)], col, 10.5, 7.5)
    o += leg([(40, 86), (28, 98), (32, 112)], col, 10.5, 7.5)
    o.append(V(P("M50,66 Q40,52 30,38 L20,46 Q30,62 36,80Z", col)))
    o.append(V(P("M48,68 Q40,56 32,44 L25,49 Q32,62 36,78Z", STEEL, 1.1)))
    o.append(f'<clipPath id="{PFX}cn"><path d="M48,68 Q40,56 32,44 L25,49 Q32,62 36,78Z"/></clipPath>')
    o.append(f'<g clip-path="url(#{PFX}cn)">' + L(scales(24, 43, 49, 79, 3.6), "#4e555c", .6, .75) + "</g>")
    o += mane("M32,34 Q42,32 46,42 Q50,50 54,58 Q48,56 44,52 Q40,46 36,46 Q32,44 28,40Z", "M35,35 Q42,36 45,44 M38,40 Q45,46 50,54")
    o += horse_head(30, 38, col, dark, light, 0.75, armour=True)
    o.append(V(P("M28,30 Q24,22 28,16 Q34,20 34,30Z", RED, 1.1)))
    o.append(L("M29,28 Q27,23 29,19 M31,28 Q30,23 31,20", RED_L, .5, .7))
    o.append(L("M14,58 Q32,58 46,64", LEA_D, 1.4, 1))
    o.append(V(P("M48,66 L82,68 L84,86 L46,86Z", RED, 1.2)))
    o.append(V(P("M48,62 L82,64 L82,68 L48,66Z", GOLD, 1)))
    o.append(L("M47,83 L84,83.6", GOLD, 1, .9))
    o.append(tube("M66,70 L56,86 L54,100", SKIN, 8))
    o += sandal(53, 103, w=12)
    o.append(V(P("M50,70 L78,70 L80,82 L48,82Z", RED, 1.2)))
    o += pteruges(49, 79, 70, 82, 6)
    o += lorica(50, 40, 76, 72, (46, 52, 58, 64))
    o.append(V(P("M60,36 Q50,32 46,40 L49,46 Q54,42 60,42Z", STEEL, 1.1)))
    o.append(V(P("M64,36 Q74,32 78,40 L75,46 Q70,42 64,42Z", STEEL, 1.1)))
    o.append(L("M59,37.4 Q51,34 47.6,39.6", "#ffffff", .7, .8))
    o.append(P("M52,40 L74,40 L73.6,44 L52.4,44Z", GOLD, 1))
    o.append(tube("M61,32 L62,40", SKIN, 7.5))
    o.append(tube("M54,44 L44,50", RED, 8.5))
    o.append(tube("M46,48 L38,46", SKIN, 7.5))
    o += face(60, 22)
    o += galea(60, 22, "crest", h=9)
    o += spear(110, 16, 14, 73)
    o.append(V(circ(38, 48, 3.8, SKIN, 1.1)))
    o.append(tube("M72,45 L80,56", RED, 8.5))
    o.append(V(ell(82, 68, 10, 14, RED, 1.4)))
    o.append(SH("M74,64 Q75,56 84,55 Q78,58 75,70Z", "#ffb0a0", .5))
    o.append(ell(82, 68, 7, 10.5, "none", 1, GOLD))
    o.append(V(circ(82, 68, 3, g("goldr"), 1)))
    o.append(dot(81, 67, .7, "#fff6d0"))
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 7 Battering ram

def wheel(cx: float, cy: float, r: float, dark: bool = False) -> list[str]:
    rim = WOOD_D if dark else WOOD
    o = [V(circ(cx, cy, r, rim))]
    o.append(circ(cx, cy, r, "none", 1.3, "#4e555c" if dark else "#6d747b"))      # iron tyre
    o.append(f'<path d="M{n(cx-r*.7)},{n(cy-r*.7)} A{n(r)},{n(r)} 0 0 1 {n(cx+r*.4)},{n(cy-r*.92)}" fill="none" stroke="#e8edf2" stroke-width=".6" stroke-opacity=".6"/>')
    o.append(circ(cx, cy, r - 3.2, "#cbb894" if not dark else "#a8987a", 1))
    o.append(SH(f"M{n(cx+r*.15)},{n(cy-r+3.5)} A{n(r-3.5)},{n(r-3.5)} 0 0 1 {n(cx+r*.15)},{n(cy+r-3.5)} Z", "#2a1406", .35))
    sp = ""
    for a in (0, 60, 120):
        dx, dy = math.cos(math.radians(a)) * (r - 3), math.sin(math.radians(a)) * (r - 3)
        sp += f"M{n(cx-dx)},{n(cy-dy)} L{n(cx+dx)},{n(cy+dy)} "
    o.append(L(sp, OUT, 2.2, .75) + L(sp, WOOD_D if dark else WOOD, 1.2, 1))
    o.append(circ(cx, cy, 2.4, g("goldr"), 1))
    return o


def beam(d: str, w: float, col: str = WOOD, grain: bool = True) -> str:
    s = L(d, OUT, w + 2.2, .75) + L(d, col, w, 1)
    lit = {WOOD: WOOD_L, WOOD_D: "#946640", LEA: LEA_L}.get(col, WOOD_L)
    s += f'<path d="{d}" fill="none" stroke="{lit}" stroke-width="{n(w*.3)}" stroke-opacity=".7" transform="translate({n(-w*.18)},{n(-w*.18)})"/>'
    if grain:
        s += f'<path d="{d}" fill="none" stroke="#3a2210" stroke-width=".5" stroke-opacity=".5" stroke-dasharray="5 3" transform="translate({n(w*.12)},{n(w*.12)})"/>'
    return V(s)


def crewman_pusher(x: float, y: float, scale: float = 1.0) -> list[str]:
    """Legionary leaning into a push; x,y = where the hands grip."""
    o = [f'<g transform="translate({x},{y}) scale({scale})">']
    o.append(tube("M18,22 L30,34 L36,54", SKIN, 8.5))
    o += sandal(38, 56, w=13)
    o.append(tube("M22,20 L24,40 L20,56", SKIN, 9))
    o += sandal(20, 58, w=13)
    o.append(V(P("M6,-8 L26,2 L30,26 L16,30 L4,12Z", RED)))
    o.append(soft_folds("M14,0 Q18,14 18,28 M22,4 Q26,14 26,26", dark="#2a0604"))
    o.append(P("M12,16 L30,20 L30,26 L14,28Z", LEA, 1))
    o.append(rivet(20, 22.6, .8))
    o.append(tube("M10,-4 L2,6 L0,14", SKIN, 7.5))
    o.append(V(circ(0, 15, 3.6, SKIN, 1.1)))
    o.append(tube("M14,2 L6,10 L4,18", SKIN, 7.5))
    o.append(V(circ(4, 19, 3.6, SKIN, 1.1)))
    o.append(tube("M8,-14 L10,-6", SKIN, 7))
    o += face(6, -20)
    o += galea(6, -20)
    o.append("</g>")
    return o


def ram() -> list[str]:
    o = [shadow(58, 54)]
    o += crewman_pusher(72, 48, 0.82)
    o.append('<g transform="translate(0,128) scale(0.9) translate(0,-128)">')
    o += wheel(26, 108, 9.5, True)
    o += wheel(80, 104, 9.5, True)
    o.append(L("M30,82 L30,106 M62,80 L62,104 M88,76 L88,102", WOOD_D, 4, 1))
    # ram log slung under the roof
    o.append(beam("M10,90 L86,86", 9.2))
    o.append(L("M30,86.4 l0,7.6 M52,85.4 l0,7.6 M70,84.6 l0,7.6", "#3a2210", .6, .5))
    # iron ram head
    o.append(V(P("M2,83 Q-1,90 2,97 L16,98 L18,91 L16,82Z", STEEL, 1.3)))
    o.append(spec(7, 85.5, 4, 1.3, .8))
    o.append(V(circ(10, 90, 2.4, STEEL_D, 1)))
    o.append(rivet(5, 94.6, .7) + rivet(13, 94.6, .7) + rivet(5, 85.4, .7) + rivet(13, 85.2, .7))
    o.append(L("M18,84 L18,97", OUT, 1.8))
    o.append(L("M28,78 L30,86 M50,77 L52,85 M72,76 L74,83", "#c9b07a", 1.4, 1))
    o.append(L("M28.6,78 L30.6,86 M50.6,77 L52.6,85 M72.6,76 L74.6,83", "#6e5a30", .5, .8))
    o.append(beam("M38,84 L38,108 M70,82 L70,106 M96,78 L96,104", 4.8, grain=False))
    o.append(beam("M30,110 L100,105", 3.8))
    # roof: gable front + hide-covered near slope
    o.append(V(P("M8,80 L22,46 L38,82Z", WOOD_D, 1.4)))
    o.append(L("M14,74 L24,52 M20,78 L26,58 M28,80 L26,64", "#2a1608", .6, .5))
    o.append(V(P("M22,46 L94,40 L108,72 L38,82Z", LEA, 1.4)))
    o.append(SH("M22,46 L94,40 L98,48 L28,56Z", "#f0c890", .4))
    for t in (0.33, 0.66):
        x0, y0 = 22 + (38 - 22) * t, 46 + (82 - 46) * t
        x1, y1 = 94 + (108 - 94) * t, 40 + (72 - 40) * t
        o.append(L(f"M{n(x0)},{n(y0)} L{n(x1)},{n(y1)}", LEA_D, 1.2, .9))
        o.append(f'<path d="M{n(x0)},{n(y0+1.4)} L{n(x1)},{n(y1+1.4)}" fill="none" stroke="#e8c48c" stroke-width=".6" stroke-dasharray="1.4 1.6" stroke-opacity=".7"/>')
    for x in (40, 58, 76):
        y = 46 - (x - 22) * 6 / 72
        o.append(L(f"M{x},{n(y)} L{x+14},{n(y+32)}", LEA_D, 1, .9))
    o.append(L("M30,60 l6,-1 M48,70 l5,-0.6 M82,52 l5,-0.8 M62,58 l4,-0.4", "#3a2210", .6, .45))
    o.append(beam("M22,46 L94,40", 3, WOOD_D, False))
    o += wheel(40, 112, 11)
    o += wheel(98, 108, 11)
    o.append("</g>")
    o += crewman_pusher(82, 73, 0.86)
    return o


# ---------------------------------------------------------------- 8 Fire catapult

def catapult() -> list[str]:
    o = [shadow(58, 52)]
    o += wheel(22, 112, 8.5, True)
    o += wheel(74, 106, 8.5, True)
    o.append(beam("M10,102 L88,98", 4.4, WOOD_D))
    # crewman behind, winding the windlass crank
    o.append(tube("M100,86 L110,100 L112,118", SKIN, 8.5))
    o += sandal(114, 121, w=12)
    o.append(tube("M96,88 L94,104 L96,118", SKIN, 9))
    o += sandal(96, 121, w=13)
    o.append(V(P("M88,58 L106,62 L108,88 L90,90Z", RED)))
    o.append(soft_folds("M96,64 Q95,76 97,88 M102,64 Q103,76 104,86", dark="#2a0604"))
    o.append(P("M90,82 L108,80 L108,86 L90,88Z", LEA, 1))
    o.append(rivet(96, 84.6, .8))
    o.append(tube("M96,54 L97,62", SKIN, 7))
    o += face(95, 47)
    o += galea(95, 47)
    o.append(tube("M92,66 L84,76 L84,88", SKIN, 7.5))
    o.append(tube("M102,68 L92,80 L90,90", SKIN, 7.5))
    # windlass drum + crank
    o.append(beam("M72,96 L84,95", 6, grain=False))
    o.append(L("M74,94 L82,93.5 M74,97.5 L82,97", "#c9b07a", 1, .9))
    o.append(L("M84,95 L88,88 L84,88", OUT, 4.2, .75))
    o.append(L("M84,95 L88,88 L84,88", STEEL_D, 2, 1))
    o.append(V(circ(84, 88, 3.6, SKIN, 1.1)))
    o.append(V(circ(90, 90, 3.6, SKIN, 1.1)))
    o.append(L("M72,94 Q60,80 66,56", "#b89a5e", 1.5, 1))
    o.append(L("M72.4,94 Q60.4,80 66.4,56", "#5a4420", .5, .7))
    # torsion frame
    o.append(beam("M30,62 L30,108 M54,60 L54,106", 4.6))
    o.append(beam("M22,64 L62,60", 5, LEA, False))
    o.append(rivet(26, 63.6, .8) + rivet(58, 60.4, .8) + rivet(30, 66, .7) + rivet(54, 64, .7))
    # torsion skein
    o.append(V(L("M26,96 L60,93", OUT, 10, .75), L("M26,96 L60,93", "#c9b07a", 7, 1),
               L("M26,94.4 L60,91.4", "#efdcaa", 1.4, .8)))
    o.append(L("".join(f"M{x},92.5 L{x+2},99 " for x in range(28, 60, 4)), "#7a6034", .8, .8))
    # throwing arm
    o.append(beam("M40,96 L82,40", 4.8))
    o.append(L("M60,70 l3.6,2.6 M65,63.4 l3.6,2.6", "#c9b07a", 1.6, 1))
    # cup + glow + stone + fire
    o.append(f'<ellipse cx="84" cy="22" rx="18" ry="16" fill="#ff9a2e" fill-opacity=".45" {fx("glow")}/>')
    o.append(V(P("M74,38 L88,32 L92,40 L82,48Z", STEEL_D, 1.2)))
    o.append(V(circ(83, 31, 7.5, STONE, 1.3)))
    o.append(spec(80, 28, 2.4, 1.4, .5, -20, "#ffe0a0"))
    o.append(P("M70,31 Q68,17 78,13 Q76,19 82,15 Q80,9 90,7.5 Q88,15 94,13 Q98,21 92,27 Q100,25 98,33 Q90,37 83,33 Q76,37 70,31Z", FIRE, 1.1, "#8a2a10"))
    o.append(SH("M76,27 Q76,19 82,17 Q80,23 86,19 Q88,15 91,21 Q92,27 86,31 Q80,33 76,27Z", FIRE_L, .9))
    o.append(SH("M80,28 Q80,23 84,22 Q86,25 88,24 Q89,28 85,30 Q82,31 80,28Z", "#ffffff", .7))
    o.append(S("M72,31 Q70,23 74,19 Q74,27 78,29Z M94,17 Q98,23 94,29 Q92,23 94,17Z", FIRE_D, .8))
    o.append(dot(66, 18, .8, FIRE_L, .9) + dot(98, 10, .7, FIRE_L, .9) + dot(72, 8, .6, "#ffb040", .8))
    # near base beam + wheels
    o.append(beam("M16,110 L92,106", 4.6))
    o.append(L("M28,108 L28,96 M66,106 L66,96", WOOD_D, 3, 1))
    o += wheel(30, 116, 9.5)
    o += wheel(82, 112, 9.5)
    return o


# ---------------------------------------------------------------- 9 Senator

def senator() -> list[str]:
    o = [shadow(60, 30)]
    o += sandal(50, 122, w=14)
    o += sandal(70, 122, w=14)
    # toga body
    o.append(V(P("M44,42 L76,42 Q84,70 82,118 L40,118 Q36,70 44,42Z", WHITE)))
    o.append(SH("M68,44 L76,44 Q84,70 82,118 L70,118 Q76,80 68,44Z", "#8a7c60", .5))
    o.append(soft_folds("M52,60 Q50,90 52,118 M60,70 Q58,94 60,118 M67,100 Q68,110 67,118 M45,104 Q44,112 45,118",
                        dark="#6a5a3e", light="#ffffff", dl="M54,62 Q52,90 54,116 M62,72 Q60,94 62,116", w=1.2))
    o.append(L("M41,116 Q46,118 50,116 Q55,118 60,116 Q66,118 71,116 Q76,118 81,116", "#9a8c70", .7, .6))
    # sinus fold draped across the body
    o.append(V(P("M42,74 Q60,84 80,76 Q82,92 72,102 Q56,106 40,96Z", WHITE, 1.2)))
    o.append(soft_folds("M46,82 Q60,92 78,84 M44,90 Q58,100 74,94", dark="#6a5a3e", light="#ffffff", dl="M46,79 Q60,88 78,80"))
    o.append(V(P("M40,96 Q56,106 72,102 Q74,106 70,106 Q54,110 40,100Z", PURPLE, 1)))
    o.append(L("M42,97.6 Q56,107 71,103.6", "#b48ad6", .6, .7))
    # purple border over the near shoulder
    o.append(V(P("M66,42 L74,42 Q70,60 66,76 L58,76 Q62,60 66,42Z", PURPLE, 1)))
    o.append(L("M66.4,43 Q62.6,60 59.4,75", "#b48ad6", .6, .7))
    # near arm holding a scroll
    o.append(tube("M74,48 L80,62 L78,78", SKIN, 8.5))
    o.append(V(L("M70,82 L92,78", OUT, 10, .75), L("M70,82 L92,78", "#f3ead2", 7.2, 1),
               L("M70,80.4 L92,76.4", "#ffffff", 1.6, .7)))
    o.append(L("M74,84 L90,81", "#a8987a", .6, .8))
    o.append(V(circ(92, 78, 3.6, g("woodl"), 1)))
    o.append(V(circ(70, 82, 3.6, g("woodl"), 1)))
    o.append(dot(92, 78, 1.1, WOOD_D) + dot(70, 82, 1.1, WOOD_D))
    o.append(V(circ(79, 79, 4, SKIN, 1.2)))
    # gold signet
    o.append(dot(76.6, 80.6, .9, GOLD))
    # far arm raised, open palm
    o.append(tube("M48,48 L36,44 L30,30", SKIN, 8.5))
    o.append(V(P("M24,30 L26,20 L29,21 L29,26 L31,17 L34,18 L33,26 L36,20 L39,22 L36,30 L36,34 L28,36Z", SKIN, 1.1)))
    o.append(L("M29,26 L29.4,30 M33,26 L32.6,30", SKIN_D, .6, .7))
    o.append(tube("M58,34 L59,42", SKIN, 8))
    o.append(SH("M55,38 L63,38 L63,42 L55,42Z", "#2a1406", .35))
    o += face(57, 23, old=True)
    o.append(L("M50,27 L54,27.5 M51,21 L53,21.5", SKIN_D, 0.9, .8))
    # white beard + hair
    o.append(V(P("M48,25 Q50,38 57,38 Q65,38 66,26 Q62,31 57,32 Q52,31 48,25Z", g("grey"))))
    o.append(L("M51,30 Q53,35 56,36.6 M54,32 Q57,35.6 60,36 M60,32 Q62,34 64,30", "#9a9284", .6, .7))
    o.append(V(P("M48,21 Q49,11 57,10.5 Q65,11 66,21 Q62,16 57,16 Q52,16 48,21Z", g("grey"))))
    o.append(L("M51,16 Q55,12.6 60,13 M53,17 Q58,14.6 63,16", "#9a9284", .6, .7))
    # laurel wreath with gold ribbon
    for x, y, r in ((48, 20, -70), (50, 15, -45), (54, 12, -20), (60, 12, 20), (64, 15, 45), (66, 20, 70)):
        o.append(ell(x, y, 3.2, 1.6, g("leaf"), 0.9, OUT, r))
        o.append(L(f"M{x-2.2},{y} L{x+2.2},{y}", "#b8e090", .4, .7).replace("/>", f' transform="rotate({r} {x} {y})"/>'))
    o.append(P("M66,21 Q69,25 68,29 L66.6,28 Q67.4,25 65,22Z", GOLD, .8))
    return o


# ---------------------------------------------------------------- 10 Settler

def settler() -> list[str]:
    o = [shadow(60, 48)]
    # --- woman, behind right, basket on her head
    o.append(tube("M96,96 L94,120", SKIN, 7))
    o += sandal(93, 122, w=11)
    o.append(V(P("M84,54 L108,54 L114,120 L82,120Z", DRESS)))
    o.append(soft_folds("M92,70 Q90,96 90,118 M98,76 Q98,98 100,118 M106,74 Q108,96 110,118", dark="#3a1606",
                        light="#f0a878", dl="M88,64 Q86,92 86,118", w=1.2))
    o.append(P("M86,52 L106,52 L106,58 L86,58Z", LEA, 1))
    o.append(rivet(95, 55, .8))
    o.append(tube("M92,40 L93,52", SKIN, 7))
    o += face(93, 32, rx=7.5, ry=8.5)
    o.append(V(P("M85,30 Q86,20 93,19.5 Q101,20 101,30 Q97,26 93,26 Q89,26 85,30Z", HAIR)))
    o.append(V(P("M100,30 Q104,40 100,50 Q98,40 100,30Z", HAIR, 1.1)))
    o.append(L("M88,25 Q92,21.6 97,22.6 M101.2,34 Q102.6,40 101,46", "#8a6040", .6, .7))
    # basket (woven)
    o.append(V(P("M80,14 L106,14 L103,24 L83,24Z", g("basket"), 1.2)))
    o.append(L("M81,17.4 L105,17.4 M82,20.8 L104,20.8", "#6e4a26", .8, .8))
    o.append(L("".join(f"M{x},14.4 l-0.4,3 M{x+1.8},17.8 l-0.4,3 M{x},21.2 l-0.3,2.6 " for x in range(83, 104, 4)), "#87602e", .6, .8))
    o.append(V(P("M82,10 Q93,6 104,10 L106,14 L80,14Z", RED, 1.1)))
    o.append(V(P("M84,9 Q92,4 100,9 Z", GOLD, 1)))
    o.append(dot(89, 7.6, .8, "#fff2bf", .9))
    o.append(tube("M104,56 L110,40 L104,22", SKIN, 7))
    o.append(V(circ(102, 20, 3.4, SKIN, 1)))
    # --- man, centre, big bundle on his back
    o.append(V(ell(78, 50, 14, 17, g("cloth"), 1.4, OUT, -10)))
    o.append(soft_folds("M70,40 Q76,48 74,62 M84,38 Q90,48 86,62", dark="#4a3e28"))
    o.append(L("M66,56 Q78,60 90,52 M72,42 L74,66", LEA, 1.6, 1))
    o.append(L("M66,55.2 Q78,59.2 90,51.2", LEA_L, .5, .7))
    o.append(tube("M64,78 L72,100 L76,120", SKIN, 9))
    o += sandal(78, 122, w=14)
    o.append(V(P("M50,42 L72,42 L76,90 Q62,94 46,90Z", LEA_L)))
    o.append(soft_folds("M56,50 Q54,70 54,90 M66,50 Q68,72 70,90", dark="#3a2210", light="#f0c890", dl="M52,48 Q50,70 50,88"))
    o.append(L("M47,88 Q62,92 75,88", "#6f4a25", .6, .7))
    o.append(P("M50,70 L74,70 L74.5,76 L49.5,76Z", LEA_D, 1))
    o.append(rivet(62, 73, .9))
    o.append(tube("M56,80 L46,100 L40,120", SKIN, 9.5))
    o += sandal(39, 122, w=14)
    o.append(L("M66,42 Q58,52 54,70", OUT, 4.2, .75) + L("M66,42 Q58,52 54,70", LEA, 3, 1))
    o.append(tube("M70,48 L68,64 L58,66", SKIN, 8))
    o.append(V(circ(56, 66, 3.8, SKIN, 1.1)))
    o.append(tube("M50,48 L42,62 L36,78", SKIN, 8))
    o.append(tube("M60,34 L61,42", SKIN, 7.5))
    o += face(60, 25)
    o.append(V(P("M50.5,22 Q52,13 60,12.5 Q69,13 69.5,23 Q66,19 60,19 Q55,19 50.5,22Z", HAIR)))
    # felt cap
    o.append(V(P("M46,22 Q50,14 60,13 Q72,14 74,22 L72,25 Q60,21 48,25Z", LEA_L, 1.1)))
    o.append(L("M48,22.6 Q60,19 72,22.6", "#6f4a25", .6, .8))
    o.append(spec(54, 17, 3, 1.2, .4, -15, "#ffe8c0"))
    # --- child in front, holding hand
    o.append(tube("M26,100 L22,120", SKIN, 6))
    o += sandal(21, 122, w=9)
    o.append(tube("M30,100 L34,120", SKIN, 6))
    o += sandal(35, 122, w=9)
    o.append(V(P("M22,82 L36,82 L38,104 L20,104Z", GREEN)))
    o.append(soft_folds("M26,86 Q25,96 25,104 M32,86 Q33,96 34,104", dark="#1e2a0a"))
    o.append(L("M22,90 L36.6,90", LEA, 1.4, 1))
    o.append(tube("M35,86 L38,78", SKIN, 5.5))
    o.append(V(circ(37, 77, 3.4, SKIN, 1)))
    o.append(tube("M22,86 L18,96", SKIN, 5.5))
    o.append(tube("M29,76 L29,82", SKIN, 6))
    o += face(28, 70, rx=6.5, ry=7)
    o.append(V(P("M21.5,68 Q22,61 28,60.5 Q35,61 35,69 Q31,66 28,66 Q25,66 21.5,68Z", HAIR)))
    o.append(L("M24,64 Q28,62 32,63.4", "#8a6040", .6, .7))
    return o


# ---------------------------------------------------------------- output

BIG = {1: legionnaire, 2: praetorian, 3: imperian, 4: legati, 5: imperatoris,
       6: caesaris, 7: ram, 8: catapult, 9: senator, 10: settler}


def build(num: int) -> str:
    global PFX, USED
    PFX = f"rom{num}-"
    USED = {}
    return svg(BIG[num]())


def main(out_dir: pathlib.Path | None = None) -> None:
    out = out_dir or (ROOT / "big")
    for num in BIG:
        (out / f"romans-{num}.svg").write_text(build(num))


if __name__ == "__main__":
    import sys
    main(pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None)
