#!/usr/bin/env python3
"""Generate Natar unit art: src/web/public/img/units/big/natars-N.svg (120x140)
and the 16x16 icons src/web/public/img/units/natars-N.svg.

Run: python3 scripts/art/natars.py
Original art in a classic T3 painterly-flat style. Every unit has its own
pose and body construction; only tiny helpers (outlined limb strokes) are shared.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "src/web/public/img/units"
OUT = "#3a2a14"

# palette
P, PD, PL = "#5b2d8e", "#3a1c5e", "#8456bb"      # purple
G, GD, GL = "#d9a63a", "#a07420", "#f3d27a"      # gold
S, SD, SL = "#5a6070", "#33363f", "#9aa2b0"      # dark steel
B, BD = "#b07a35", "#74491a"                     # bronze / wood
SK, SKD = "#e2b58d", "#b98860"                   # skin
H, HD, HL = "#2e262c", "#1a1518", "#574a52"      # dark horse
W, WD = "#9c6b3a", "#6a4522"                     # wood
SHADOW = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="rgba(0,0,0,0.18)" stroke="none"/>'


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def pts(p):
    return " ".join(f"{f(x)},{f(y)}" for x, y in p)


def poly(p, fill, extra=""):
    return f'<polygon points="{pts(p)}" fill="{fill}"{extra}/>'


def path(d, fill, extra=""):
    return f'<path d="{d}" fill="{fill}"{extra}/>'


def shade(d, fill):
    """shadow/highlight overlay without outline"""
    return f'<path d="{d}" fill="{fill}" stroke="none"/>'


def spoly(p, fill):
    return f'<polygon points="{pts(p)}" fill="{fill}" stroke="none"/>'


def circ(cx, cy, r, fill, extra=""):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{extra}/>'


def ell(cx, cy, rx, ry, fill, extra=""):
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{extra}/>'


def limb(p, w, fill, shd=None, pad=2.8):
    """outlined thick stroke along points p (a limb segment chain)"""
    d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in p)
    s = f'<path d="{d}" fill="none" stroke="{OUT}" stroke-width="{f(w + pad)}"/>'
    s += f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{f(w)}"/>'
    if shd:
        s += (f'<path d="{d}" fill="none" stroke="{shd}" stroke-width="{f(w * 0.38)}" '
              f'transform="translate({f(w * 0.22)},{f(w * 0.2)})"/>')
    return s


def stroke(d, w, col, extra=""):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{f(w)}"{extra}/>'


def line(a, b, w, col):
    return f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{col}" stroke-width="{f(w)}"/>'


def pole(a, b, w, fill):
    """outlined shaft"""
    return line(a, b, w + 2.8, OUT) + line(a, b, w, fill)


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">{defs}'
            f'<g stroke="{OUT}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'
            f'{body}</g></svg>')


def icon(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">{defs}'
            f'<g stroke="{OUT}" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round">'
            f'{body}</g></svg>')


def natar_head(cx, cy, r=8, helm="tall", crest=True):
    """head facing viewer's left with tall angular Natar helmet (neck included)."""
    s = poly([(cx - r * 0.45, cy + r * 0.6), (cx + r * 0.5, cy + r * 0.6), (cx + r * 0.6, cy + r * 2.4),
              (cx - r * 0.55, cy + r * 2.4)], SKD)
    s += circ(cx, cy, r, SK)
    s += shade(f"M{f(cx+r*0.2)},{f(cy-r*0.9)} A{f(r)},{f(r)} 0 0 1 {f(cx+r*0.2)},{f(cy+r*0.9)} "
               f"A{f(r*0.6)},{f(r)} 0 0 0 {f(cx+r*0.2)},{f(cy-r*0.9)}Z", SKD)
    # eye + brow (facing left)
    s += circ(cx - r * 0.45, cy + r * 0.05, 1.2, OUT, ' stroke="none"')
    # helmet: angular bowl with tall peak, cheek guards
    top = cy - r * 2.9
    s += poly([(cx - r * 1.15, cy - r * 0.1), (cx - r * 0.9, cy - r * 1.3), (cx - r * 0.2, top),
               (cx + r * 0.55, cy - r * 1.5), (cx + r * 1.15, cy - r * 0.2)], S)
    s += spoly([(cx + r * 0.1, cy - r * 1.6), (cx + r * 0.55, cy - r * 1.5), (cx + r * 1.15, cy - r * 0.2),
                (cx + r * 0.6, cy - r * 0.2)], SD)
    s += spoly([(cx - r * 0.9, cy - r * 1.2), (cx - r * 0.4, cy - r * 2.3), (cx - r * 0.2, cy - r * 1.6),
                (cx - r * 0.6, cy - r * 0.9)], SL)
    # cheek guards
    s += poly([(cx - r * 1.15, cy - r * 0.1), (cx - r * 1.1, cy + r * 1.0), (cx - r * 0.65, cy + r * 0.9),
               (cx - r * 0.7, cy + r * 0.1)], S)
    s += poly([(cx + r * 1.15, cy - r * 0.2), (cx + r * 1.2, cy + r * 1.05), (cx + r * 0.6, cy + r * 1.0),
               (cx + r * 0.65, cy + r * 0.0)], SD)
    if crest:
        s += poly([(cx - r * 0.55, cy - r * 1.75), (cx - r * 0.2, top + r * 0.3), (cx + r * 0.3, cy - r * 1.75),
                   (cx - r * 0.2, cy - r * 1.55)], G)
    return s


# ---------------------------------------------------------------- 1 Pikeman
def pikeman():
    b = SHADOW % (58, 128, 42, 7)
    # pike shaft points: from (86,128) to (18,6)
    # back leg (his right, viewer's right) straight back
    b += limb([(66, 80), (76, 100), (82, 120)], 11, PD, "#2a1446")
    b += poly([(74, 114), (90, 117), (92, 126), (72, 126)], SD)              # back boot
    b += shade("M74,114 L84,116 L83,120 L75,119Z", SL)
    # back arm (his right) reaching down the shaft
    b += limb([(76, 54), (88, 72), (70, 92)], 9, P, PD)
    # torso: angular cuirass
    b += poly([(44, 48), (74, 46), (80, 66), (72, 84), (50, 84), (40, 66)], P)
    b += spoly([(66, 47), (74, 46), (80, 66), (72, 84), (62, 84)], PD)
    b += spoly([(46, 50), (56, 49), (52, 70), (44, 66)], PL)
    b += path("M48,56 L60,74 L72,56", "none", f' stroke="{G}" stroke-width="2.2"')  # gold V trim
    b += poly([(54, 84), (68, 84), (70, 92), (52, 92)], G)                   # belt plate
    b += shade("M60,84 L68,84 L70,92 L62,92Z", GD)
    # pauldrons (angular)
    b += poly([(34, 52), (46, 42), (56, 50), (44, 60)], G)
    b += spoly([(46, 50), (56, 50), (44, 60)], GD)
    b += poly([(68, 42), (86, 50), (84, 60), (70, 54)], G)
    b += spoly([(78, 48), (86, 50), (84, 60), (76, 56)], GD)
    # front leg (his left) bent forward, braced
    b += limb([(54, 82), (44, 102), (38, 122)], 11, P, PD)
    b += poly([(28, 118), (46, 116), (48, 126), (28, 126)], SD)              # front boot
    b += shade("M30,118 L42,117 L42,121 L31,122Z", SL)
    b += natar_head(60, 30, 9)
    # pike
    b += pole((86, 128), (24, 16), 3.6, B)
    b += line((86, 128), (24, 16), 1.2, "#d7a564")
    b += poly([(26, 18), (20, 10), (14, 2), (12, 12), (16, 20)], S)          # leaf blade
    b += shade("M14,2 L20,10 L19,16 L16,20Z", SL)
    b += poly([(20, 22), (28, 16), (30, 20), (22, 26)], G)                   # collar
    # hands on the shaft (front arm, his left)
    b += limb([(42, 54), (30, 66), (46, 62)], 9, P, PD)
    b += circ(49, 59, 4.2, B)
    b += circ(69, 92, 4.2, B)
    # tower shield standing at his left side
    b += poly([(16, 62), (36, 58), (40, 64), (40, 120), (36, 126), (16, 126), (12, 120), (12, 68)], P)
    b += spoly([(30, 60), (36, 58), (40, 64), (40, 120), (36, 126), (30, 126)], PD)
    b += spoly([(16, 68), (20, 64), (22, 120), (16, 122)], PL)
    b += path("M18,66 L34,63 L36,120 L18,122Z", "none", f' stroke="{G}" stroke-width="1.6"')
    b += poly([(26, 78), (34, 92), (26, 106), (18, 92)], G)
    b += shade("M26,78 L34,92 L26,106 L26,92Z", GD)
    b += circ(26, 92, 2.4, PD, ' stroke="none"')
    return svg(b)


def pikeman_icon():
    b = circ(8, 8.5, 4.2, SK)
    b += poly([(3.4, 8), (4.4, 4.2), (7.6, 0.8), (10.8, 4), (12.6, 8)], S)
    b += poly([(7, 3.2), (7.8, 1.2), (9, 3.2)], G)
    b += poly([(3.4, 8), (3.6, 12), (6, 11.8), (5.8, 8)], S)
    b += poly([(12.6, 8), (12.8, 12.4), (10.2, 12.2), (10.2, 8)], SD)
    b += circ(6.3, 9, 0.7, OUT, ' stroke="none"')
    b += poly([(5, 13), (11, 13), (13, 16), (3, 16)], P)
    b += line((13.5, 15.5), (13.5, 4), 1.1, B)
    b += poly([(12.4, 4.2), (13.5, 0.5), (14.6, 4.2)], SL)
    return icon(b)


# ---------------------------------------------------------- 2 Thorned Warrior
def spikes(cx, cy, r, n, start, span, length, fill=SL):
    """ring of triangular spikes around (cx,cy)"""
    import math
    s = ""
    for i in range(n):
        a = math.radians(start + span * i / max(n - 1, 1))
        ca, sa = math.cos(a), math.sin(a)
        tip = (cx + ca * (r + length), cy + sa * (r + length))
        b1 = (cx + ca * r - sa * 2.4, cy + sa * r + ca * 2.4)
        b2 = (cx + ca * r + sa * 2.4, cy + sa * r - ca * 2.4)
        s += poly([tip, b1, b2], fill)
    return s


def thorned():
    b = SHADOW % (60, 128, 42, 7)
    # back leg kicking back for balance
    b += limb([(70, 84), (84, 100), (94, 118)], 11, SD, "#22242a")
    b += poly([(88, 112), (104, 118), (102, 126), (84, 124)], SD)
    b += shade("M90,113 L98,116 L97,120 L90,118Z", SL)
    # front leg planted forward
    b += limb([(52, 84), (36, 100), (30, 120)], 11, SD, "#22242a")
    b += poly([(18, 114), (38, 116), (38, 126), (18, 126)], SD)
    b += shade("M20,115 L34,117 L33,121 L20,120Z", SL)
    # torso twisted (leaning into the swing)
    b += poly([(40, 50), (76, 46), (84, 66), (72, 88), (48, 88), (38, 68)], S)
    b += spoly([(66, 47), (76, 46), (84, 66), (72, 88), (62, 88)], SD)
    b += spoly([(42, 52), (54, 50), (50, 72), (42, 66)], SL)
    b += poly([(52, 56), (66, 55), (64, 88), (52, 88)], P)                   # purple tabard
    b += shade("M60,56 L66,55 L64,88 L60,88Z", PD)
    b += poly([(46, 86), (74, 86), (76, 94), (44, 94)], G)
    b += shade("M62,86 L74,86 L76,94 L62,94Z", GD)
    # chest spikes
    b += spikes(60, 70, 4, 3, 190, 100, 6)
    # buckler arm (front) with spiked buckler
    b += limb([(44, 54), (28, 64), (30, 80)], 9, S, SD)
    b += circ(26, 84, 12, SD)
    b += spikes(26, 84, 12, 8, 0, 315, 6)
    b += circ(26, 84, 7, S)
    b += circ(26, 84, 2.5, G)
    # spiked pauldrons
    b += poly([(30, 54), (44, 44), (54, 52), (42, 62)], S)
    b += spikes(42, 52, 6, 3, 200, 90, 8)
    b += poly([(70, 42), (90, 50), (86, 62), (72, 54)], S)
    b += spoly([(80, 46), (90, 50), (86, 62), (78, 56)], SD)
    b += spikes(80, 50, 6, 3, 250, 90, 8)
    # head: spiked helm, visor slit
    b += poly([(54, 36), (62, 36), (64, 52), (54, 52)], SKD)
    b += circ(58, 32, 8, SK)
    b += shade("M60,24 A8,8 0 0 1 60,40 A5,8 0 0 0 60,24Z", SKD)
    b += circ(54, 33, 1.2, OUT, ' stroke="none"')
    b += poly([(48, 32), (50, 18), (58, 10), (66, 18), (68, 32)], S)
    b += spoly([(60, 12), (66, 18), (68, 32), (62, 32)], SD)
    b += poly([(48, 32), (47, 42), (53, 41), (53, 32)], S)
    b += poly([(68, 32), (69, 42), (63, 41), (63, 32)], SD)
    b += spikes(58, 20, 9, 5, 200, 140, 7)
    # flail arm raised high (back arm), swing in progress
    b += limb([(78, 50), (94, 38), (92, 20)], 9, S, SD)
    b += circ(92, 18, 4.4, B)
    b += pole((96, 26), (88, 6), 3.2, W)
    # chain arcing left to the spiked ball
    b += path("M88,6 C74,0 56,2 42,14", "none", f' stroke="{OUT}" stroke-width="4.4"')
    b += path("M88,6 C74,0 56,2 42,14", "none", f' stroke="{SL}" stroke-width="1.8" stroke-dasharray="3 2"')
    b += circ(36, 18, 9, SD)
    b += spikes(36, 18, 9, 8, -90, 315, 6)
    b += circ(36, 18, 9, S)
    b += shade("M36,9 A9,9 0 0 1 36,27 A5,9 0 0 0 36,9Z", SD)
    b += circ(33, 15, 2.6, SL, ' stroke="none"')
    return svg(b)


def thorned_icon():
    b = circ(8, 9, 4.2, SK)
    b += poly([(3.4, 8.5), (4.4, 4.4), (8, 1.8), (11.6, 4.4), (12.6, 8.5)], S)
    b += poly([(5, 4), (4.2, 0.8), (6.6, 2.8)], SL)
    b += poly([(8, 2), (8, -0.2), (9.6, 2.2)], SL)
    b += poly([(11, 4), (12.8, 1.2), (12.4, 4.6)], SL)
    b += poly([(3.4, 8.5), (3.6, 12.4), (6, 12.2), (5.8, 8.5)], S)
    b += poly([(12.6, 8.5), (12.8, 12.6), (10.2, 12.4), (10.2, 8.5)], SD)
    b += circ(6.4, 9.5, 0.7, OUT, ' stroke="none"')
    b += poly([(4.6, 13.2), (11.4, 13.2), (13.6, 16), (2.4, 16)], S)
    b += poly([(2, 15.5), (0.5, 13.5), (2.5, 14.2)], SL)
    b += poly([(14, 15.5), (15.5, 13.5), (13.5, 14.2)], SL)
    return icon(b)


# --------------------------------------------------------------- 3 Guardsman
def guardsman():
    b = SHADOW % (58, 128, 44, 7)
    # back leg straight, braced back
    b += limb([(70, 84), (84, 102), (92, 120)], 12, PD, "#2a1446")
    b += poly([(86, 114), (104, 118), (102, 126), (82, 126)], SD)
    b += shade("M88,115 L98,118 L97,122 L88,120Z", SL)
    # sword arm (back) raised behind, blade up-right
    b += limb([(78, 56), (96, 48), (90, 30)], 10, S, SD)
    b += pole((90, 30), (112, 0), 3.2, SL)
    b += line((93, 26), (110, 3), 1, "#e8ecf2")
    b += poly([(82, 30), (98, 30), (96, 36), (84, 36)], G)                   # crossguard
    b += circ(88, 40, 4, G)                                                  # pommel
    b += circ(90, 30, 4.6, B)                                                # fist
    # torso: heavy cuirass
    b += poly([(42, 50), (78, 48), (86, 70), (74, 90), (48, 90), (38, 70)], S)
    b += spoly([(68, 49), (78, 48), (86, 70), (74, 90), (64, 90)], SD)
    b += spoly([(44, 52), (56, 51), (52, 74), (44, 70)], SL)
    b += poly([(50, 58), (70, 56), (66, 86), (54, 86)], P)                   # purple surcoat
    b += shade("M62,57 L70,56 L66,86 L62,86Z", PD)
    b += poly([(54, 62), (66, 61), (60, 76)], G)                             # gold emblem
    b += poly([(46, 88), (76, 88), (78, 96), (44, 96)], G)
    b += shade("M64,88 L76,88 L78,96 L64,96Z", GD)
    b += poly([(40, 96), (80, 96), (84, 104), (36, 104)], PD)                # skirt plates
    # front leg bent forward (lunge)
    b += limb([(52, 86), (38, 104), (34, 122)], 12, P, PD)
    b += poly([(22, 116), (42, 118), (42, 126), (20, 126)], SD)
    b += shade("M24,117 L38,119 L37,123 L24,122Z", SL)
    # pauldrons
    b += poly([(68, 44), (90, 52), (88, 64), (72, 58)], G)
    b += spoly([(80, 50), (90, 52), (88, 64), (80, 60)], GD)
    b += natar_head(60, 32, 9)
    b += poly([(32, 54), (46, 44), (56, 52), (44, 64)], G)
    b += spoly([(48, 52), (56, 52), (44, 64), (42, 60)], GD)
    # shield arm, forward, then the big rectangular shield
    b += limb([(44, 56), (30, 66), (34, 80)], 10, S, SD)
    b += poly([(10, 46), (46, 42), (48, 118), (12, 122)], P)
    b += spoly([(38, 43), (46, 42), (48, 118), (40, 119)], PD)
    b += spoly([(14, 50), (22, 48), (22, 116), (14, 118)], PL)
    b += path("M15,50 L42,47 L43,114 L16,117Z", "none", f' stroke="{G}" stroke-width="2"')
    b += poly([(28, 60), (40, 82), (28, 104), (16, 82)], G)
    b += shade("M28,60 L40,82 L28,104 L28,82Z", GD)
    b += circ(28, 82, 3.5, PD, ' stroke="none"')
    b += circ(29, 81, 1.4, PL, ' stroke="none"')
    b += poly([(14, 62), (22, 60), (18, 70)], G)
    b += poly([(14, 100), (22, 102), (18, 94)], G)
    return svg(b)


def guardsman_icon():
    b = circ(9, 8.5, 4.2, SK)
    b += poly([(4.4, 8), (5.4, 4.2), (8.6, 0.8), (11.8, 4), (13.6, 8)], S)
    b += poly([(8, 3.2), (8.8, 1.2), (10, 3.2)], G)
    b += poly([(13.6, 8), (13.8, 12.4), (11.2, 12.2), (11.2, 8)], SD)
    b += circ(7.3, 9, 0.7, OUT, ' stroke="none"')
    b += poly([(6, 13), (12, 13), (14, 16), (4, 16)], S)
    b += poly([(0.6, 6), (7, 5.4), (7.4, 15.4), (1, 16)], P)
    b += poly([(4, 8), (6, 10.6), (4, 13.2), (2, 10.6)], G)
    b += line((14, 3), (14, 12), 1, SL)
    return icon(b)


# ----------------------------------------------------------- 4 Birds of Prey
def eagle():
    F, FD, FL = "#5a3a1e", "#3b2412", "#8a5e32"
    b = SHADOW % (62, 131, 18, 4)
    # far (right) wing, sweeping up-right, primaries fanned along the trailing edge
    b += path("M66,62 C80,48 96,34 116,22 L112,36 L106,32 L102,48 L96,44 L92,60 L86,56 L82,70 L76,66 L74,78 L68,74 Z", F)
    b += shade("M70,62 C84,48 100,36 112,28 L106,40 L98,52 L90,62 L84,70 L76,74Z", FD)
    b += shade("M72,58 C86,44 100,34 112,26 L106,32 L92,42 L80,54Z", FL)
    # tail fan
    b += path("M64,92 L74,104 L80,118 L70,116 L66,122 L60,114 L52,118 L56,104 Z", F)
    b += shade("M64,96 L74,106 L72,114 L64,110 L58,114 L60,104Z", FD)
    # near (left) wing, larger, sweeping up-left
    b += path("M54,64 C40,50 24,36 4,24 L8,38 L14,34 L18,50 L24,46 L28,62 L34,58 L38,72 L44,68 L46,82 L52,76 L56,84 Z", F)
    b += shade("M50,66 C36,52 22,40 10,30 L14,42 L22,56 L30,68 L38,78 L48,82Z", FD)
    b += shade("M48,60 C36,46 24,36 8,26 L14,34 L26,44 L40,58Z", FL)
    b += path("M18,40 L26,50 M26,46 L32,56 M34,54 L40,64", "none", f' stroke="{FD}" stroke-width="1.2"')
    # body
    b += ell(60, 78, 14, 20, F)
    b += shade("M62,60 A14,20 0 0 1 72,88 A8,20 0 0 0 62,60Z", FD)
    b += shade("M50,70 A6,10 0 0 1 56,88 A10,10 0 0 1 50,70Z", FL)
    # breast feather marks
    b += path("M56,76 L60,80 L64,76 M54,86 L58,90 L62,86", "none", f' stroke="{FD}" stroke-width="1.2"')
    # legs and talons open, reaching down
    b += limb([(52, 94), (46, 106)], 5, "#d9a63a")
    b += limb([(62, 96), (64, 108)], 5, "#d9a63a")
    for x, y in ((46, 106), (64, 108)):
        b += path(f"M{x},{y} L{x-7},{y+5} M{x},{y} L{x-2},{y+8} M{x},{y} L{x+5},{y+6} M{x},{y} L{x+2},{y-4}",
                  "none", f' stroke="{OUT}" stroke-width="3.6"')
        b += path(f"M{x},{y} L{x-7},{y+5} M{x},{y} L{x-2},{y+8} M{x},{y} L{x+5},{y+6} M{x},{y} L{x+2},{y-4}",
                  "none", f' stroke="{G}" stroke-width="1.6"')
    # head (golden eagle: pale gold nape), hooked beak to the left
    b += path("M50,48 C42,50 40,60 46,66 L68,68 C76,62 74,48 64,46 Z", FL)
    b += shade("M60,46 C72,48 76,62 68,68 L60,68 C66,60 66,52 60,46Z", F)
    b += path("M46,54 L34,58 C30,62 32,68 38,68 L48,66 Z", G)
    b += shade("M34,62 C32,66 34,68 38,68 L48,66 L46,62Z", GD)
    b += shade("M36,58 L44,56 L46,60 L38,61Z", GL)
    b += circ(52, 56, 2.6, "#f5d26a", ' stroke="none"')
    b += circ(52.6, 56.4, 1.4, OUT, ' stroke="none"')
    b += path("M46,52 L56,53", "none", f' stroke="{FD}" stroke-width="2.2"')
    return svg(b)


def eagle_icon():
    F, FD, FL = "#5a3a1e", "#3b2412", "#8a5e32"
    b = poly([(8, 8), (11, 5), (15, 3), (15, 5), (13, 7), (14, 9), (11, 10), (9, 11)], F)
    b += poly([(8, 8), (5, 5), (1, 3), (1, 5), (3, 7), (2, 9), (5, 10), (7, 11)], F)
    b += poly([(4, 4.5), (1.5, 3.5), (2.5, 5.5)], FL)
    b += ell(8, 10, 2.6, 4, F)
    b += poly([(6.5, 13), (7.5, 15.5), (9.5, 15.5), (10, 13)], FD)
    b += circ(7.2, 6.2, 2.4, FL)
    b += poly([(5.2, 6), (3.4, 7), (5.6, 7.6)], G)
    b += circ(7.6, 5.8, 0.6, OUT, ' stroke="none"')
    return icon(b)


# ----------------------------------------------------------------- 5 Axerider
def horse_gallop(dark=True):
    """dark horse at full gallop to the left (used only by the axerider)."""
    b = ""
    # far legs (behind): fore reaching forward, hind stretched back
    b += limb([(40, 100), (26, 108), (14, 110)], 7, HD)
    b += limb([(88, 98), (104, 108), (112, 120)], 7, HD)
    # tail streaming
    b += path("M96,80 C106,74 114,82 116,94 C112,86 104,86 98,90 Z", HD)
    # body
    b += path("M30,84 C34,70 60,66 84,70 C100,72 104,82 98,96 C90,106 70,110 46,104 C34,100 28,94 30,84 Z", H)
    b += shade("M60,68 C86,68 104,78 98,96 C90,106 72,110 58,106 C78,102 92,94 92,84 C88,74 74,70 60,68Z", HD)
    b += shade("M36,82 C40,74 52,70 62,70 C50,74 42,80 42,92 C38,90 36,86 36,82Z", HL)
    # near legs: fore flung forward, hind stretched back
    b += limb([(44, 98), (28, 112), (10, 118)], 8, H, HD)
    b += poly([(4, 114), (12, 112), (14, 120), (6, 122)], SD)
    b += limb([(92, 96), (106, 112), (116, 126)], 8, H, HD)
    b += poly([(110, 122), (118, 120), (120, 128), (112, 130)], SD)
    # neck and head thrust forward-low
    b += path("M34,86 C26,74 22,62 24,52 L40,50 C44,64 46,74 50,84 Z", H)
    b += shade("M40,50 C44,64 46,74 50,84 L42,84 C38,72 36,62 34,52Z", HD)
    b += path("M24,52 C14,50 6,56 4,64 L12,70 C16,66 22,66 26,66 L30,58 Z", H)
    b += shade("M12,70 C16,66 22,66 26,66 L24,60 C18,60 12,64 12,70Z", HD)
    b += circ(18, 58, 1.6, OUT, ' stroke="none"')
    b += circ(8, 64, 1.4, OUT, ' stroke="none"')
    b += poly([(24, 50), (26, 42), (32, 50)], H)                             # ear
    b += path("M26,48 C32,44 40,44 44,50 C40,56 34,58 30,56Z", PD)         # mane
    b += path("M34,52 C40,54 44,58 46,70 L40,70 C38,60 36,56 34,52Z", PD)
    # reins
    b += path("M12,66 C30,70 50,70 62,70", "none", f' stroke="{BD}" stroke-width="1.4"')
    # saddle cloth
    b += path("M52,70 L84,70 L88,92 L58,96 Z", P)
    b += shade("M74,70 L84,70 L88,92 L76,94Z", PD)
    b += path("M54,74 L82,74 M56,92 L86,90", "none", f' stroke="{G}" stroke-width="1.6"')
    return b


def axerider():
    b = SHADOW % (62, 130, 50, 6)
    b += horse_gallop()
    # rider: near leg hanging, torso leaning forward, axe raised in back hand
    b += limb([(74, 54), (90, 44), (96, 24)], 9, P, PD)                      # back arm up
    b += circ(97, 22, 4.4, B)
    b += poly([(62, 56), (82, 52), (86, 76), (62, 80)], P)                   # torso
    b += shade("M74,53 L82,52 L86,76 L76,78Z", PD)
    b += shade("M64,58 L70,57 L68,76 L64,74Z", PL)
    b += poly([(60, 50), (76, 46), (84, 54), (68, 60)], G)                   # pauldron
    b += shade("M74,47 L84,54 L72,58Z", GD)
    b += poly([(62, 78), (86, 76), (88, 84), (62, 86)], G)
    b += natar_head(66, 36, 7.5)
    b += limb([(64, 60), (50, 66), (40, 70)], 8, P, PD)                      # front arm holding reins
    b += circ(38, 70, 3.6, B)
    b += limb([(70, 82), (62, 100), (54, 108)], 10, PD, "#2a1446")           # near leg
    b += poly([(46, 104), (58, 102), (60, 112), (48, 114)], SD)
    # double axe
    b += pole((98, 24), (82, 2), 3.2, W)
    b += path("M80,10 C70,6 68,16 72,22 L84,14 Z", S)
    b += path("M88,2 C100,0 104,8 100,14 L88,8 Z", S)
    b += shade("M72,22 L84,14 L78,12 C72,14 70,18 72,22Z", SD)
    b += shade("M100,14 L88,8 L92,4 C98,4 102,8 100,14Z", SD)
    return svg(b)


def axerider_icon():
    b = path("M2,13 C4,8 10,7 14,8 L15,15 L2,15 Z", H)
    b += poly([(4, 9), (2, 5), (6, 6), (6, 9)], H)
    b += circ(9, 5.5, 2.8, SK)
    b += poly([(6, 5), (6.8, 2.4), (9, 0.5), (11.4, 2.4), (12, 5)], S)
    b += poly([(8.4, 1.6), (9, 0), (9.8, 1.6)], G)
    b += circ(8, 5.8, 0.5, OUT, ' stroke="none"')
    b += poly([(6, 8), (12, 7.6), (12.5, 12), (6.5, 12)], P)
    b += line((13.5, 10), (13.5, 2), 0.9, W)
    b += poly([(13.5, 2), (11.5, 1.5), (11.5, 4.5)], SL)
    b += poly([(13.5, 2), (15.5, 1.5), (15.5, 4.5)], SL)
    return icon(b)


# ---------------------------------------------------------- 6 Natarian Knight
def knight():
    b = SHADOW % (62, 130, 50, 6)
    # far legs in canter
    b += limb([(44, 100), (36, 112), (30, 122)], 7, HD)
    b += limb([(88, 100), (100, 108), (108, 122)], 7, HD)
    # caparison covering the body (purple, gold hem), horse legs below
    b += path("M30,78 C40,64 64,62 86,66 C102,70 106,82 100,96 L98,108 L30,106 Z", P)
    b += shade("M70,64 C92,66 106,78 100,96 L98,108 L74,108 C84,98 90,84 84,74 C80,68 76,66 70,64Z", PD)
    b += shade("M34,80 C40,72 50,68 60,68 C50,74 44,82 42,96 L40,104 L34,104Z", PL)
    b += path("M32,104 L98,106", "none", f' stroke="{G}" stroke-width="3"')
    b += path("M34,98 L40,106 L46,98 L52,106 L58,98 L64,106 L70,98 L76,106 L82,98 L88,106 L94,98", "none",
              f' stroke="{G}" stroke-width="1.4"')
    b += poly([(60, 76), (70, 86), (60, 96), (50, 86)], G)
    b += shade("M60,76 L70,86 L60,96 L60,86Z", GD)
    # near legs
    b += limb([(46, 104), (34, 114), (22, 118)], 8, H, HD)
    b += poly([(16, 114), (24, 114), (26, 122), (16, 122)], SD)
    b += limb([(92, 104), (102, 116), (112, 128)], 8, H, HD)
    b += poly([(106, 124), (114, 122), (116, 130), (108, 132)], SD)
    # neck + armoured head (chanfron), head held high
    b += path("M36,82 C30,70 30,56 36,46 L52,44 C54,60 54,72 58,82 Z", H)
    b += shade("M52,44 C54,60 54,72 58,82 L50,82 C48,66 46,56 44,46Z", HD)
    b += path("M34,48 C24,46 14,54 12,64 L20,70 C24,66 30,64 34,62 L40,54 Z", H)
    b += poly([(36, 44), (38, 36), (44, 44)], H)
    b += path("M34,44 C40,40 48,40 52,46 L48,54 C42,52 38,50 34,50Z", PD)
    # chanfron: steel face plate with gold spike
    b += poly([(30, 50), (40, 48), (36, 70), (18, 68), (16, 60)], S)
    b += shade("M36,48 L40,48 L36,70 L30,70Z", SD)
    b += poly([(28, 50), (24, 36), (34, 48)], G)
    b += circ(26, 58, 1.6, OUT, ' stroke="none"')
    b += path("M16,66 C32,66 44,68 58,72", "none", f' stroke="{BD}" stroke-width="1.4"')
    # rider: armoured, couched lance leveled forward-left
    b += limb([(78, 58), (92, 60), (88, 72)], 9, S, SD)                     # back arm down (holds lance butt)
    b += poly([(62, 56), (84, 52), (88, 78), (62, 82)], S)                   # cuirass
    b += shade("M76,53 L84,52 L88,78 L78,80Z", SD)
    b += shade("M64,58 L70,57 L68,78 L64,76Z", SL)
    b += poly([(66, 60), (80, 58), (78, 78), (66, 80)], P)                   # purple surcoat
    b += shade("M74,59 L80,58 L78,78 L74,78Z", PD)
    b += poly([(68, 64), (78, 63), (73, 74)], G)
    b += poly([(60, 50), (78, 46), (86, 56), (68, 62)], G)
    b += shade("M76,47 L86,56 L74,60Z", GD)
    b += limb([(72, 84), (66, 100), (58, 108)], 10, S, SD)                   # near leg, greave
    b += poly([(50, 104), (62, 102), (64, 112), (52, 114)], SD)
    # great helm with tall gold crest, visor slit
    b += poly([(56, 44), (58, 22), (74, 20), (78, 44), (74, 52), (60, 52)], S)
    b += shade("M70,21 L74,20 L78,44 L74,52 L68,52Z", SD)
    b += shade("M60,24 L64,23 L63,44 L60,44Z", SL)
    b += path("M56,38 L78,38", "none", f' stroke="{OUT}" stroke-width="2"')
    b += poly([(60, 22), (62, 2), (70, 6), (72, 22)], G)
    b += shade("M66,6 L70,6 L72,22 L66,22Z", GD)
    # lance: couched under the arm, point forward-left and slightly down
    b += pole((96, 62), (4, 86), 3.4, W)
    b += circ(82, 66, 4.4, B)                                                # gauntlet on lance
    b += poly([(2, 86), (16, 80), (18, 86), (14, 90)], SL)
    b += poly([(14, 78), (30, 70), (32, 80), (20, 84)], P)                   # pennon
    b += shade("M22,74 L30,70 L32,80 L26,82Z", PD)
    return svg(b)


def knight_icon():
    b = path("M1.5,13 C3,8 9,7 14,8 L15,15.5 L1.5,15.5 Z", P)
    b += poly([(4, 9), (2, 4.5), (6, 6), (6, 9)], H)
    b += poly([(2.5, 5.5), (5.5, 5.5), (5, 8.5), (2.5, 8)], S)
    b += poly([(5.6, 7), (6.2, 1.2), (11, 0.8), (11.8, 7), (10.8, 9), (6.6, 9)], S)
    b += line((5.8, 5.6), (11.6, 5.6), 0.8, OUT)
    b += poly([(7.6, 1.4), (8.2, -0.5), (9.8, 1.4)], G)
    b += poly([(6, 9), (12, 8.5), (12.5, 12.5), (6.5, 12.5)], P)
    b += line((15, 9), (0.5, 12.5), 0.9, W)
    return icon(b)


# ------------------------------------------------------------- 7 War Elephant
def war_elephant():
    E, ED, EL = "#8a8488", "#5c5660", "#b4aeb2"
    b = SHADOW % (62, 130, 54, 6)
    # far legs
    b += limb([(44, 104), (42, 126)], 11, ED)
    b += limb([(90, 104), (94, 126)], 11, ED)
    # tail
    b += path("M104,86 C112,92 112,104 108,112", "none", f' stroke="{OUT}" stroke-width="4"')
    b += path("M104,86 C112,92 112,104 108,112", "none", f' stroke="{ED}" stroke-width="1.8"')
    # body
    b += path("M30,86 C30,62 50,52 72,52 C96,52 108,66 106,92 C104,108 92,114 68,114 C44,114 30,104 30,86 Z", E)
    b += shade("M72,52 C96,52 108,66 106,92 C104,108 92,114 68,114 C88,110 98,98 98,84 C98,66 88,56 72,52Z", ED)
    # near legs (walking)
    b += limb([(56, 108), (52, 128)], 12, E, ED)
    b += limb([(82, 108), (86, 128)], 12, E, ED)
    for x in (48, 90):
        b += path(f"M{x-8},128 L{x+8},128", "none", f' stroke="{OUT}" stroke-width="3"')
    # howdah: crenellated wooden box with purple/gold cloth, on the back
    b += poly([(50, 62), (98, 60), (100, 44), (48, 46)], W)
    b += shade("M86,60 L98,60 L100,44 L88,45Z", WD)
    b += poly([(48, 46), (56, 46), (56, 40), (62, 40), (62, 46), (70, 46), (70, 40), (76, 40), (76, 46), (84, 46),
               (84, 40), (90, 40), (90, 44), (100, 44), (100, 36), (48, 36)], WD)
    b += poly([(50, 56), (98, 54), (98, 62), (50, 64)], P)
    b += shade("M84,54 L98,54 L98,62 L84,63Z", PD)
    b += path("M50,52 L98,50", "none", f' stroke="{G}" stroke-width="2"')
    # rider in the howdah with banner
    b += natar_head(74, 26, 6.5)
    b += poly([(64, 32), (84, 30), (86, 40), (62, 40)], P)
    b += limb([(84, 34), (92, 30), (98, 20)], 6, P)
    b += pole((100, 24), (104, 0), 2.6, W)
    b += poly([(104, 0), (118, 6), (104, 14)], G)
    # head: armoured face plate, ears, tusks, trunk raised
    b += path("M36,66 C30,60 22,62 18,70 L22,88 L34,90 Z", E)                 # near ear
    b += shade("M22,70 C24,66 28,66 30,70 L30,84 L24,86Z", ED)
    b += path("M36,54 C22,54 12,66 14,82 C16,92 24,98 36,96 C46,94 50,86 48,70 C46,60 42,54 36,54 Z", E)
    b += shade("M40,56 C48,62 50,74 46,88 C42,94 36,96 32,96 C40,92 42,82 42,70 C42,62 40,58 40,56Z", ED)
    # head armour plate (purple with gold edge and a spike)
    b += poly([(30, 54), (46, 58), (46, 72), (34, 78), (26, 72), (24, 60)], P)
    b += shade("M40,56 L46,58 L46,72 L38,76Z", PD)
    b += path("M28,58 L44,60 L44,70", "none", f' stroke="{G}" stroke-width="1.6"')
    b += poly([(34, 56), (36, 40), (40, 56)], G)
    b += circ(22, 76, 2, OUT, ' stroke="none"')
    # tusks
    b += path("M30,88 C22,96 10,96 6,88 C12,94 22,92 26,84 Z", "#f1e7c8")
    b += path("M38,92 C32,100 22,104 14,100 C22,100 30,96 34,88 Z", "#e3d6ae")
    # trunk raised: curls up to the upper-left
    b += path("M20,84 C10,90 4,80 6,66 C8,56 2,52 4,44 L12,44 C10,52 14,58 14,68 C14,78 16,82 22,80 Z", E)
    b += shade("M14,68 C14,78 16,82 22,80 L20,84 C14,86 10,80 10,70 C10,60 12,52 12,44 L10,44 C10,54 8,60 8,68 C8,76 12,80 14,76Z", ED)
    b += shade("M8,46 C10,50 12,50 13,46 L12,44 L9,44Z", EL)
    return svg(b)


def war_elephant_icon():
    E, ED = "#8a8488", "#5c5660"
    b = path("M3,14 C2,7 6,4 10,4 C14,4 16,8 15,15 Z", E)
    b += path("M2,11 C0.5,9 1,5 2.5,3 L4,4 C3,6 3,9 4,11 Z", E)
    b += circ(5.5, 9, 0.5, OUT, ' stroke="none"')
    b += path("M5,13 C3.5,15 2,15 1,14 C2.5,14 3.5,13.5 4.5,12 Z", "#f1e7c8")
    b += poly([(6, 6), (14, 5.5), (14, 1), (6, 1.5)], WD)
    b += poly([(6.5, 3.5), (13.5, 3.2), (13.5, 5.5), (6.5, 6)], P)
    b += poly([(7, 5), (12, 6), (12, 9), (7, 9.5)], PD)
    b += poly([(8, 7), (9.5, 4), (12, 7)], G)
    return icon(b)


# ------------------------------------------------------------------ 8 Ballista
def ballista():
    b = SHADOW % (60, 130, 52, 6)
    # crewman at the rear, cranking the windlass
    b += limb([(100, 96), (104, 112), (108, 124)], 9, PD)
    b += limb([(94, 96), (90, 112), (86, 124)], 9, PD, "#2a1446")
    b += poly([(82, 120), (94, 120), (94, 128), (80, 128)], SD)
    b += poly([(104, 120), (116, 120), (116, 128), (102, 128)], SD)
    b += poly([(86, 68), (108, 66), (110, 98), (86, 98)], P)
    b += shade("M100,67 L108,66 L110,98 L100,98Z", PD)
    b += poly([(88, 96), (110, 96), (110, 102), (88, 102)], G)
    b += natar_head(98, 52, 7, crest=False)
    b += limb([(90, 70), (76, 78), (74, 90)], 8, P, PD)
    b += circ(74, 92, 3.6, B)
    # wheels (far)
    b += circ(90, 116, 10, WD)
    # frame: stock beam angled up-left
    b += poly([(18, 48), (104, 92), (100, 102), (14, 58)], W)
    b += shade("M18,52 L102,96 L100,102 L16,58Z", WD)
    b += path("M24,56 L96,92", "none", f' stroke="#c99a5c" stroke-width="1.2"')
    # trestle / stand
    b += poly([(54, 72), (70, 80), (74, 122), (46, 122)], W)
    b += shade("M62,76 L70,80 L74,122 L62,122Z", WD)
    b += poly([(40, 118), (108, 118), (110, 124), (38, 124)], WD)
    # windlass at rear end
    b += circ(102, 96, 7, WD)
    b += circ(102, 96, 3, W)
    b += path("M102,96 L112,82", "none", f' stroke="{OUT}" stroke-width="4.4"')
    b += path("M102,96 L112,82", "none", f' stroke="{B}" stroke-width="2"')
    b += circ(112, 82, 3, B)
    # near wheel
    b += circ(42, 118, 11, WD)
    b += circ(42, 118, 6, W)
    b += path("M42,107 L42,129 M31,118 L53,118", "none", f' stroke="{OUT}" stroke-width="2"')
    b += circ(42, 118, 2, B)
    b += circ(90, 116, 2, B)
    # bow arms at the front (perpendicular to the stock) with twisted skeins
    b += poly([(8, 52), (26, 44), (30, 50), (16, 64)], S)                    # frame head
    b += shade("M20,46 L26,44 L30,50 L24,54Z", SD)
    b += path("M20,46 C8,30 4,16 10,6", "none", f' stroke="{OUT}" stroke-width="6"')
    b += path("M20,46 C8,30 4,16 10,6", "none", f' stroke="{W}" stroke-width="3.2"')
    b += path("M24,60 C20,80 26,92 40,100", "none", f' stroke="{OUT}" stroke-width="6"')
    b += path("M24,60 C20,80 26,92 40,100", "none", f' stroke="{W}" stroke-width="3.2"')
    b += path("M10,6 C36,30 48,56 40,100", "none", f' stroke="{OUT}" stroke-width="2.6"')
    b += path("M10,6 C36,30 48,56 40,100", "none", f' stroke="#e8d8b0" stroke-width="1.2"')
    b += ell(16, 50, 4, 6, G)                                               # skein bosses
    b += ell(24, 60, 4, 6, G)
    # bolt lying on the stock, head beyond the frame
    b += pole((8, 40), (60, 68), 3.4, "#c99a5c")
    b += poly([(10, 40), (0, 30), (2, 46)], S)
    b += poly([(54, 64), (64, 66), (62, 74)], P)                             # fletching
    # trigger / sight block
    b += poly([(60, 68), (72, 74), (70, 84), (58, 78)], S)
    b += shade("M66,71 L72,74 L70,84 L66,80Z", SD)
    return svg(b)


def ballista_icon():
    b = circ(12.5, 14, 2, WD)
    b += poly([(2.5, 4), (13.5, 12.5), (14.8, 10.8), (4, 2.4)], W)
    b += circ(5.5, 13.5, 2.6, WD)
    b += circ(5.5, 13.5, 0.8, B, ' stroke="none"')
    b += stroke("M8,0.5 C4.5,1 2,3.5 1,7.5", 2.6, OUT)
    b += stroke("M8,0.5 C4.5,1 2,3.5 1,7.5", 1.3, W)
    b += line((8, 0.5), (1, 7.5), 0.6, "#e8d8b0")
    b += line((0.8, 1.6), (8, 7.5), 1.3, "#c99a5c")
    b += poly([(1.5, 2), (0, 0), (0, 3.5)], SL)
    b += circ(12, 6, 1.9, SK)
    b += poly([(9.8, 5.5), (12, 2.2), (14.2, 5.5)], S)
    b += poly([(9.5, 8), (14.5, 8), (15, 12), (10, 11.5)], P)
    return icon(b)


# ------------------------------------------------------------------ 9 Emperor
def emperor():
    b = SHADOW % (60, 128, 40, 7)
    # long cape flowing behind (right)
    b += path("M50,44 L76,40 C98,60 104,96 96,124 L64,122 Z", PD)
    b += shade("M76,40 C98,60 104,96 96,124 L84,124 C92,98 86,66 72,46Z", "#2a1446")
    b += path("M66,46 C78,70 82,96 80,122", "none", f' stroke="{P}" stroke-width="1.6"')
    # robe (tall, flowing)
    b += path("M46,48 L74,46 L80,80 L86,126 L32,126 L36,80 Z", P)
    b += shade("M66,47 L74,46 L80,80 L86,126 L66,126 L68,82Z", PD)
    b += shade("M42,56 L52,54 L48,90 L42,120 L36,120 L40,86Z", PL)
    b += path("M60,50 L60,124", "none", f' stroke="{PD}" stroke-width="1.4"')
    b += path("M36,118 L86,118", "none", f' stroke="{G}" stroke-width="3"')
    b += path("M40,110 L48,118 L56,110 L64,118 L72,110 L80,118", "none", f' stroke="{G}" stroke-width="1.4"')
    # gold collar / stole
    b += poly([(46, 48), (76, 46), (80, 58), (72, 60), (66, 68), (58, 68), (54, 60), (44, 58)], G)
    b += shade("M68,47 L76,46 L80,58 L72,60 L66,68 L62,68Z", GD)
    b += poly([(56, 70), (66, 70), (66, 86), (56, 86)], G)
    b += shade("M62,70 L66,70 L66,86 L62,86Z", GD)
    b += circ(61, 78, 2.6, "#8a2a3a", ' stroke="none"')
    # sceptre arm (his right, back) held upright
    b += limb([(76, 54), (90, 66), (90, 82)], 10, P, PD)
    b += circ(90, 84, 4.6, SK)
    b += pole((90, 96), (90, 22), 3.2, G)
    b += circ(90, 16, 7, G)
    b += circ(90, 16, 4, "#6c3fa0")
    b += shade("M88,13 A3,3 0 0 1 91,14 A2,2 0 0 0 88,13Z", "#c9a7ea")
    b += poly([(84, 10), (90, 2), (96, 10), (90, 8)], G)
    # commanding arm (his left, front), pointing forward-left
    b += limb([(44, 56), (30, 66), (14, 60)], 10, P, PD)
    b += path("M8,62 L18,56 L22,64 L14,68 Z", SK)
    b += path("M8,62 L0,56", "none", f' stroke="{OUT}' + f'" stroke-width="4.4"')
    b += path("M8,62 L0,56", "none", f' stroke="{SK}" stroke-width="2"')
    b += path("M46,54 L52,66 L46,70", "none", f' stroke="{G}" stroke-width="2.2"')  # cuff
    # head with beard, crown
    b += circ(60, 32, 9, SK)
    b += shade("M62,23 A9,9 0 0 1 69,38 A5,9 0 0 0 62,23Z", SKD)
    b += path("M52,36 C50,46 58,50 66,46 C70,42 70,38 68,34 C62,40 56,40 52,36 Z", "#4a3a3a")
    b += shade("M60,42 C64,42 68,40 68,34 C70,38 70,42 66,46 C64,47 62,46 60,42Z", "#2a1e1e")
    b += circ(56, 31, 1.3, OUT, ' stroke="none"')
    b += path("M52,28 L58,27", "none", f' stroke="{OUT}" stroke-width="1.6"')
    b += poly([(50, 26), (50, 12), (56, 18), (60, 6), (64, 18), (70, 12), (70, 26)], G)
    b += shade("M60,6 L64,18 L70,12 L70,26 L60,26Z", GD)
    b += circ(60, 20, 2.4, "#8a2a3a")
    b += circ(54, 22, 1.6, "#6c3fa0", ' stroke="none"')
    b += circ(66, 22, 1.6, "#6c3fa0", ' stroke="none"')
    return svg(b)


def emperor_icon():
    b = circ(7.5, 8, 4.2, SK)
    b += poly([(3.6, 6.2), (3.6, 2), (5.6, 3.6), (7.5, 0.5), (9.4, 3.6), (11.4, 2), (11.4, 6.2)], G)
    b += circ(7.5, 4.6, 0.9, "#8a2a3a", ' stroke="none"')
    b += circ(6, 8, 0.6, OUT, ' stroke="none"')
    b += path("M4.5,9.5 C4.6,13 7,13.6 9.5,12.5 C11,11.5 11,10 10.5,9.5 C9,11 6.5,11 4.5,9.5Z", "#4a3a3a")
    b += poly([(4, 13), (11, 13), (13.5, 16), (1.5, 16)], P)
    b += poly([(6, 13), (9, 13), (7.5, 16)], G)
    b += line((14, 15.5), (14, 5), 0.9, G)
    b += circ(14, 4, 1.5, "#6c3fa0")
    return icon(b)


# ------------------------------------------------------------------ 10 Settler
def settlers():
    b = SHADOW % (60, 130, 54, 6)
    # --- rear settler (carrying a bundle on a pole), walking left
    b += limb([(78, 90), (84, 106), (90, 122)], 8, "#6e5a7a")
    b += poly([(86, 118), (98, 120), (98, 126), (84, 126)], SD)
    b += limb([(74, 90), (68, 106), (64, 122)], 8, "#8a6f9a", "#6e5a7a")
    b += poly([(56, 118), (68, 118), (68, 126), (54, 126)], SD)
    b += poly([(66, 60), (86, 58), (88, 92), (64, 92)], PL)
    b += shade("M78,59 L86,58 L88,92 L78,92Z", P)
    b += poly([(66, 76), (88, 76), (88, 82), (66, 82)], G)
    b += poly([(71, 50), (79, 50), (80, 62), (70, 62)], SKD)
    b += circ(75, 46, 7, SK)
    b += shade("M77,39 A7,7 0 0 1 82,50 A4,7 0 0 0 77,39Z", SKD)
    b += circ(72, 46, 1.1, OUT, ' stroke="none"')
    b += poly([(67, 44), (75, 30), (84, 44)], P)                             # conical cap
    b += shade("M75,30 L84,44 L77,44Z", PD)
    b += path("M67,44 L84,44", "none", f' stroke="{G}" stroke-width="2"')
    b += limb([(70, 64), (62, 74), (68, 82)], 7, PL, P)
    b += limb([(84, 62), (94, 54), (90, 44)], 7, PL, P)
    b += pole((94, 60), (102, 28), 2.6, W)
    b += circ(106, 22, 9, "#c9b48c")
    b += shade("M108,14 A9,9 0 0 1 112,28 A5,9 0 0 0 108,14Z", "#a08c66")
    b += path("M98,24 L114,22", "none", f' stroke="{BD}" stroke-width="1.6"')
    # --- cart: two wheels, box with sacks and banner, pulled by the front settler
    b += poly([(56, 86), (112, 84), (114, 108), (58, 110)], W)
    b += shade("M100,85 L112,84 L114,108 L102,108Z", WD)
    b += path("M60,92 L110,90 M60,100 L112,99", "none", f' stroke="{WD}" stroke-width="1.2"')
    b += ell(74, 84, 10, 8, "#c9b48c")
    b += ell(94, 82, 11, 9, "#b8a07a")
    b += shade("M96,73 A11,9 0 0 1 104,86 A6,9 0 0 0 96,73Z", "#8f7a56")
    b += path("M84,80 L92,74", "none", f' stroke="{BD}" stroke-width="1.8"')
    b += poly([(62, 72), (80, 70), (82, 86), (62, 86)], P)
    b += shade("M74,71 L80,70 L82,86 L74,86Z", PD)
    b += pole((108, 84), (110, 46), 2.6, W)
    b += poly([(110, 46), (120, 52), (110, 60)], G)
    b += shade("M110,52 L120,52 L110,60Z", GD)
    b += circ(100, 116, 12, WD)
    b += circ(100, 116, 7, W)
    b += path("M100,104 L100,128 M88,116 L112,116 M92,108 L108,124 M108,108 L92,124", "none",
              f' stroke="{OUT}" stroke-width="2"')
    b += circ(100, 116, 2.4, B)
    # shafts going forward to the puller's hands
    b += pole((58, 98), (30, 86), 3, W)
    # --- front settler pulling, leaning forward
    b += limb([(36, 92), (44, 108), (48, 124)], 9, PD, "#2a1446")
    b += poly([(44, 120), (56, 120), (56, 128), (42, 128)], SD)
    b += limb([(30, 92), (22, 108), (14, 122)], 9, P, PD)
    b += poly([(6, 118), (18, 118), (18, 126), (4, 126)], SD)
    b += poly([(22, 60), (46, 58), (46, 94), (24, 94)], P)
    b += shade("M38,59 L46,58 L46,94 L38,94Z", PD)
    b += shade("M24,62 L30,61 L28,90 L24,90Z", PL)
    b += poly([(22, 80), (46, 80), (46, 86), (22, 86)], G)
    b += poly([(28, 50), (36, 50), (37, 62), (27, 62)], SKD)
    b += circ(32, 46, 7.5, SK)
    b += shade("M34,38.5 A7.5,7.5 0 0 1 39,50 A4,7.5 0 0 0 34,38.5Z", SKD)
    b += circ(29, 46, 1.1, OUT, ' stroke="none"')
    b += path("M26,50 C26,56 32,58 38,54 C36,52 30,52 26,50Z", "#4a3a3a")    # beard
    b += poly([(23, 44), (32, 28), (42, 44)], P)
    b += shade("M32,28 L42,44 L34,44Z", PD)
    b += path("M23,44 L42,44", "none", f' stroke="{G}" stroke-width="2"')
    b += limb([(26, 64), (18, 76), (28, 86)], 8, P, PD)
    b += circ(30, 87, 3.8, SK)
    b += limb([(42, 64), (48, 76), (40, 86)], 8, P, PD)
    b += circ(40, 88, 3.8, SK)
    return svg(b)


def settlers_icon():
    b = poly([(3, 9), (10, 8.5), (10.5, 13), (3.5, 13.5)], W)
    b += circ(8, 14, 1.8, WD)
    b += ell(6.5, 8.5, 2.8, 2, "#c9b48c")
    b += line((10, 9), (10.5, 2.5), 0.8, W)
    b += poly([(10.5, 2.5), (14.5, 4.5), (10.5, 6.5)], G)
    b += circ(4.5, 5, 2.4, SK)
    b += poly([(2, 4.5), (4.5, 0.5), (7, 4.5)], P)
    b += circ(3.6, 5.2, 0.5, OUT, ' stroke="none"')
    b += poly([(2.5, 7.5), (6.5, 7.5), (6.5, 11), (2.5, 11)], P)
    b += poly([(1.5, 11), (3.5, 11), (3, 15.5), (1, 15.5)], PD)
    b += poly([(4.5, 11), (6.5, 11), (7, 15.5), (5, 15.5)], PD)
    return icon(b)


UNITS = [
    (1, pikeman, pikeman_icon), (2, thorned, thorned_icon), (3, guardsman, guardsman_icon),
    (4, eagle, eagle_icon), (5, axerider, axerider_icon), (6, knight, knight_icon),
    (7, war_elephant, war_elephant_icon), (8, ballista, ballista_icon),
    (9, emperor, emperor_icon), (10, settlers, settlers_icon),
]

if __name__ == "__main__":
    for n, big, small in UNITS:
        (ROOT / "big" / f"natars-{n}.svg").write_text(big())
        (ROOT / f"natars-{n}.svg").write_text(small())
        print(n, len(big()), len(small()))
