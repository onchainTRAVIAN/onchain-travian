#!/usr/bin/env python3
"""Generate Nature (oasis animal) unit art: src/web/public/img/units/big/nature-N.svg
(120x140) and the 16x16 icons src/web/public/img/units/nature-N.svg.

Run: python3 scripts/art/nature.py
Original art, classic T3 painterly-flat style; every animal has its own body construction.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "src/web/public/img/units"
OUT = "#3a2a14"
SHADOW = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="rgba(0,0,0,0.18)" stroke="none"/>'


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def pts(p):
    return " ".join(f"{f(x)},{f(y)}" for x, y in p)


def poly(p, fill, extra=""):
    return f'<polygon points="{pts(p)}" fill="{fill}"{extra}/>'


def spoly(p, fill):
    return f'<polygon points="{pts(p)}" fill="{fill}" stroke="none"/>'


def path(d, fill, extra=""):
    return f'<path d="{d}" fill="{fill}"{extra}/>'


def shade(d, fill):
    return f'<path d="{d}" fill="{fill}" stroke="none"/>'


def circ(cx, cy, r, fill, extra=""):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{extra}/>'


def ell(cx, cy, rx, ry, fill, extra=""):
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{extra}/>'


def stroke(d, w, col, extra=""):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{f(w)}"{extra}/>'


def limb(p, w, fill, shd=None, pad=2.8):
    """outlined thick stroke along points p (leg / tail segment chain)"""
    d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in p)
    s = stroke(d, w + pad, OUT) + stroke(d, w, fill)
    if shd:
        s += stroke(d, w * 0.38, shd, f' transform="translate({f(w * 0.22)},{f(w * 0.2)})"')
    return s


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">{defs}'
            f'<g stroke="{OUT}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'
            f'{body}</g></svg>')


def icon(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">{defs}'
            f'<g stroke="{OUT}" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round">'
            f'{body}</g></svg>')


def eye(cx, cy, r, iris="#e8c23a", pupil=OUT, slit=False):
    s = circ(cx, cy, r, iris, ' stroke="none"')
    if slit:
        s += ell(cx, cy, r * 0.3, r * 0.85, pupil, ' stroke="none"')
    else:
        s += circ(cx, cy, r * 0.55, pupil, ' stroke="none"')
    return s


# ------------------------------------------------------------------- 1 Rat
def rat():
    C, CD, CL, PK = "#8c8c90", "#5f5f66", "#b9b9bd", "#d99a94"
    b = SHADOW % (60, 128, 52, 6)
    # tail: long, curling up behind
    b += stroke("M94,106 C112,100 122,112 108,128", 6.4, OUT)
    b += stroke("M94,106 C112,100 122,112 108,128", 3.6, PK)
    # far legs
    b += limb([(40, 110), (46, 122), (54, 126)], 5, CD)
    b += limb([(76, 112), (70, 124), (62, 126)], 5, CD)
    # body: low, hunched, scurrying left
    b += path("M20,100 C24,84 48,78 74,82 C92,84 100,94 96,108 C92,118 72,122 50,118 C34,116 18,112 20,100 Z", C)
    b += shade("M70,82 C92,84 100,94 96,108 C92,118 72,122 56,120 C78,116 88,106 86,96 C84,88 78,84 70,82Z", CD)
    b += shade("M28,92 C34,84 46,82 58,82 C44,86 36,92 32,100 C28,100 26,96 28,92Z", CL)
    # pointed head / snout
    b += path("M36,88 C24,84 10,92 6,102 C8,108 20,112 30,110 C36,104 40,96 36,88 Z", C)
    b += shade("M30,110 C36,104 40,96 36,88 C32,92 26,100 20,108Z", CD)
    b += shade("M14,96 C18,90 26,88 32,90 C24,92 18,96 14,102Z", CL)
    b += circ(36, 84, 6.5, C)
    b += circ(36, 84, 3.2, PK, ' stroke="none"')
    b += circ(20, 98, 2, OUT, ' stroke="none"')
    b += circ(6, 102, 2.4, PK)
    b += stroke("M10,104 L0,100 M10,105 L0,108 M14,106 L8,114", 1.2, OUT)
    # near legs mid-stride
    b += limb([(32, 110), (22, 118), (10, 122)], 5.5, C, CD)
    b += limb([(82, 110), (92, 120), (104, 122)], 5.5, C, CD)
    b += stroke("M10,122 L4,126 M10,122 L8,128 M104,122 L110,126 M104,122 L104,128", 2, PK)
    return svg(b)


def rat_icon():
    C, CD, PK = "#8c8c90", "#5f5f66", "#d99a94"
    b = stroke("M12,10 C15,8 16,11 14,14", 1.2, PK)
    b += path("M2,10 C3,6 8,5 11,6 C14,7 14,11 12,13 C9,14 4,14 2,10 Z", C)
    b += path("M5,8 C3,7 1,9 0.5,11 C2,12.5 4,12 5.5,11.5 Z", C)
    b += circ(5.5, 6.5, 1.8, C)
    b += circ(5.5, 6.5, 0.9, PK, ' stroke="none"')
    b += circ(3.2, 9.6, 0.6, OUT, ' stroke="none"')
    b += circ(0.8, 11, 0.7, PK, ' stroke="none"')
    b += limb([(4, 13), (2, 15)], 1.4, CD, pad=1.2)
    b += limb([(10, 13), (12.5, 15)], 1.4, CD, pad=1.2)
    return icon(b)


# ---------------------------------------------------------------- 2 Spider
def spider():
    D, DM, DL, R = "#2e2428", "#4a3a40", "#6e5a62", "#d0222c"
    b = SHADOW % (56, 128, 54, 6)
    # far legs (behind): rise up and out, feet further back
    b += limb([(44, 78), (22, 54), (6, 96)], 3.6, D)
    b += limb([(48, 74), (38, 44), (28, 90)], 3.6, D)
    b += limb([(54, 74), (76, 48), (104, 84)], 3.6, D)
    b += limb([(58, 80), (90, 62), (116, 100)], 3.6, D)
    # abdomen (behind, right) with red hourglass
    b += ell(76, 90, 23, 19, DM)
    b += shade("M82,72 A23,19 0 0 1 90,106 A14,19 0 0 0 82,72Z", D)
    b += shade("M60,80 A10,8 0 0 1 72,76 A14,8 0 0 0 62,88Z", DL)
    b += poly([(70, 82), (82, 82), (76, 90), (82, 98), (70, 98), (76, 90)], R)
    # cephalothorax
    b += circ(46, 86, 13, DM)
    b += shade("M52,74 A13,13 0 0 1 56,96 A8,13 0 0 0 52,74Z", D)
    b += shade("M38,78 A6,5 0 0 1 48,78 A10,5 0 0 0 40,84Z", DL)
    # eyes (front, lower-left) and fangs
    b += circ(37, 84, 2.2, R, ' stroke="none"')
    b += circ(41, 80, 1.5, R, ' stroke="none"')
    b += circ(35, 89, 1.3, R, ' stroke="none"')
    b += circ(39, 92, 1.3, R, ' stroke="none"')
    b += poly([(36, 94), (30, 104), (40, 98)], D)
    b += poly([(44, 97), (42, 106), (48, 100)], D)
    # near legs (front): spread wide, down to the ground
    b += limb([(40, 90), (14, 76), (4, 122)], 4.2, DM, D)
    b += limb([(42, 94), (24, 92), (18, 126)], 4.2, DM, D)
    b += limb([(50, 98), (48, 110), (36, 126)], 4.2, DM, D)
    b += limb([(56, 98), (72, 110), (84, 126)], 4.2, DM, D)
    return svg(b)


def spider_icon():
    D, DM, R = "#2e2428", "#4a3a40", "#d0222c"
    b = ""
    for p in ([(6, 8), (2, 3.5), (0.5, 9)], [(6, 9.5), (1.5, 9), (1, 15)], [(8, 11), (6, 14), (3.5, 16)],
              [(9, 11), (12, 14), (14, 16)], [(10, 7.5), (13, 3), (15.5, 8)], [(11, 9), (15, 9.5), (15.5, 14)]):
        b += limb(p, 0.9, DM, pad=0.9)
    b += ell(10.5, 9, 4.8, 4, DM)
    b += shade("M7,7 A4,3 0 0 1 11,6 A6,3 0 0 0 8,9Z", "#6e5a62")
    b += circ(5.5, 8, 3, DM)
    b += poly([(9, 7), (12, 7), (10.5, 9), (12, 11), (9, 11), (10.5, 9)], R, ' stroke="none"')
    b += circ(3.8, 7.4, 0.7, R, ' stroke="none"')
    b += circ(4.4, 9.4, 0.6, R, ' stroke="none"')
    return icon(b)


# ----------------------------------------------------------------- 3 Snake
def snake():
    GR, GD, GL, BY, RD = "#5f9a3a", "#3d6b22", "#9ac96a", "#d8d49a", "#d8303a"
    b = SHADOW % (60, 128, 48, 6)
    # bottom coil (back loop)
    b += stroke("M100,114 C112,104 92,96 64,98 C36,100 26,112 44,120 C60,126 90,126 100,114Z", 16.8, OUT)
    b += stroke("M100,114 C112,104 92,96 64,98 C36,100 26,112 44,120 C60,126 90,126 100,114Z", 14, GR)
    b += stroke("M50,122 C64,126 88,125 100,114", 4.4, BY)
    b += stroke("M60,98 C38,100 28,110 42,118", 3, GD)
    # rising body: S-curve from the coil up to the neck
    P0, P1, P2, P3 = (44, 106), (14, 98), (24, 60), (54, 62)
    Q0, Q1, Q2, Q3 = (54, 62), (82, 64), (70, 36), (46, 42)
    d = f"M{pts([P0])} C{pts([P1, P2, P3])} C{pts([Q1, Q2, Q3])}"
    b += stroke(d, 18.8, OUT)
    b += stroke(d, 16, GR)
    b += stroke(d, 6, BY, ' transform="translate(-3,2)"')
    b += stroke(d, 3, GD, ' transform="translate(5,-4)"')
    # diamond pattern along the back
    for (a, c, e, g) in ((P0, P1, P2, P3), (Q0, Q1, Q2, Q3)):
        for t in (0.18, 0.4, 0.62, 0.84):
            x, y = bez(a, c, e, g, t)
            x += 3; y -= 3
            b += spoly([(x, y - 4.5), (x + 4, y), (x, y + 4.5), (x - 4, y)], GD)
            b += spoly([(x, y - 2), (x + 1.6, y), (x, y + 2), (x - 1.6, y)], GL)
    # head rearing to the upper-left, mouth open, tongue out
    b += path("M48,52 C38,54 22,50 14,44 C12,36 22,30 36,30 C46,30 52,38 50,46 Z", GR)
    b += shade("M48,52 C44,50 40,50 34,48 C40,42 44,40 50,46Z", GD)
    b += shade("M26,34 C32,30 42,30 46,34 C38,34 30,36 24,40Z", GL)
    b += path("M14,44 C12,52 24,58 36,54 C40,52 42,50 42,48 C32,50 22,50 14,44 Z", BY)
    b += poly([(16, 45), (22, 48), (34, 50), (40, 48)], "#8a2a3a", ' stroke="none"')
    b += poly([(18, 46), (20, 52), (23, 47)], "#f6f0dc")
    b += poly([(30, 49), (32, 55), (35, 49)], "#f6f0dc")
    b += eye(34, 38, 3.2, slit=True)
    b += stroke("M14,44 L4,38 M8,40 L2,34 M8,40 L0,44", 2.2, RD)
    b += stroke("M12,42 L16,38 M10,44 L8,48", 1, GD)
    return svg(b)


def snake_icon():
    GR, GD, BY, RD = "#5f9a3a", "#3d6b22", "#d8d49a", "#d8303a"
    b = stroke("M13,13 C15,10 10,9 6,10 C2,11 3,15 8,15 C12,15 13,14 13,13Z", 2.8, GR)
    b += stroke("M6,13 C2,12 2,8 6,7 C10,6 9,3 6,3", 3.4, OUT)
    b += stroke("M6,13 C2,12 2,8 6,7 C10,6 9,3 6,3", 2.4, GR)
    b += path("M7,5 C4,5.4 2,4.6 1.5,3.4 C2,2 4,1.4 6,1.6 C8,2 8.4,4 7,5Z", GR)
    b += path("M1.5,3.6 C1.8,5.2 4,5.8 6.5,5", BY)
    b += circ(5.2, 3, 0.8, "#e8c23a", ' stroke="none"')
    b += circ(5.3, 3, 0.4, OUT, ' stroke="none"')
    b += stroke("M1.5,3.4 L0.2,2.6 M0.8,3 L0,4", 0.8, RD)
    b += poly([(6, 8), (7.5, 9.5), (6, 11), (4.5, 9.5)], GD, ' stroke="none"')
    return icon(b)


# ------------------------------------------------------------------- 4 Bat
def bat():
    M, MD, BD, BL = "#4e3c44", "#34272d", "#6b5460", "#8c7080"
    b = SHADOW % (60, 131, 16, 4)
    wrist_l, wrist_r = (30, 44), (90, 44)
    # left wing membrane: fingers from the wrist, concave scallops between tips
    b += path("M52,60 C44,48 38,44 30,44 L4,38 Q16,52 6,66 Q22,70 22,86 Q34,80 40,94 Q46,84 54,88 Z", M)
    b += shade("M30,46 L8,40 Q18,52 10,64 Q24,70 24,84 Q34,80 38,90 Q44,82 50,84 L48,62 C42,52 36,46 30,46Z", MD)
    b += shade("M30,46 C40,46 46,52 50,62 L46,56 C40,48 34,46 30,46Z", BL)
    for tip in ((4, 38), (6, 66), (22, 86), (40, 94)):
        b += stroke(f"M{pts([wrist_l])} L{pts([tip])}", 2.2, MD)
    # right wing (far side, slightly foreshortened)
    b += path("M68,60 C76,48 82,44 90,44 L116,38 Q104,52 114,66 Q98,70 98,86 Q86,80 80,94 Q74,84 66,88 Z", M)
    b += shade("M90,46 L112,40 Q102,52 110,64 Q96,70 96,84 Q86,80 82,90 Q76,82 70,84 L72,62 C78,52 84,46 90,46Z", MD)
    for tip in ((116, 38), (114, 66), (98, 86), (80, 94)):
        b += stroke(f"M{pts([wrist_r])} L{pts([tip])}", 2.2, MD)
    # body and feet
    b += ell(60, 70, 10, 16, BD)
    b += shade("M64,54 A10,16 0 0 1 68,84 A6,16 0 0 0 64,54Z", M)
    b += shade("M54,60 A4,8 0 0 1 58,76 A8,8 0 0 1 54,60Z", BL)
    b += limb([(56, 84), (52, 96)], 3, MD)
    b += limb([(64, 84), (68, 96)], 3, MD)
    b += stroke("M52,96 L48,100 M52,96 L54,101 M68,96 L72,100 M68,96 L66,101", 2, MD)
    # head with big ears, snub nose, fangs
    b += poly([(50, 46), (46, 22), (60, 40)], BD)
    b += poly([(70, 46), (76, 22), (60, 40)], BD)
    b += spoly([(51, 42), (49, 28), (57, 40)], BL)
    b += circ(60, 48, 11, BD)
    b += shade("M64,37 A11,11 0 0 1 70,56 A6,11 0 0 0 64,37Z", M)
    b += circ(56, 46, 2.2, OUT, ' stroke="none"')
    b += circ(64, 46, 2.2, OUT, ' stroke="none"')
    b += circ(55.4, 45.4, 0.8, "#f0e4e8", ' stroke="none"')
    b += circ(63.4, 45.4, 0.8, "#f0e4e8", ' stroke="none"')
    b += poly([(56, 50), (64, 50), (60, 54)], "#2a1a20", ' stroke="none"')
    b += poly([(55, 56), (65, 56), (63, 60), (57, 60)], "#8a2a3a")
    b += poly([(56, 56), (58, 61), (59, 56)], "#f6f0dc", ' stroke="none"')
    b += poly([(61, 56), (62, 61), (64, 56)], "#f6f0dc", ' stroke="none"')
    return svg(b)


def bat_icon():
    M, MD, BD = "#4e3c44", "#34272d", "#6b5460"
    b = path("M6.5,8 C5,6 3.5,5.5 0.5,5 Q2.5,8 0.8,10.5 Q3.5,10.5 4,13.5 Q5.5,11.5 7,13 Z", M)
    b += path("M9.5,8 C11,6 12.5,5.5 15.5,5 Q13.5,8 15.2,10.5 Q12.5,10.5 12,13.5 Q10.5,11.5 9,13 Z", M)
    b += stroke("M3.5,6 L0.8,10.3 M3.5,6 L4,13 M12.5,6 L15.2,10.3 M12.5,6 L12,13", 0.6, MD)
    b += ell(8, 9.5, 2, 4, BD)
    b += poly([(5.8, 6), (5, 1.5), (8, 4.5)], BD)
    b += poly([(10.2, 6), (11, 1.5), (8, 4.5)], BD)
    b += circ(8, 6, 2.6, BD)
    b += circ(7, 5.6, 0.6, OUT, ' stroke="none"')
    b += circ(9, 5.6, 0.6, OUT, ' stroke="none"')
    return icon(b)


# ------------------------------------------------------------- 5 Wild Boar
def boar():
    C, CD, CL, BR, SN = "#5c3e26", "#3b2614", "#8a6440", "#2b1b10", "#9a6a5a"
    b = SHADOW % (60, 128, 54, 6)
    # far legs: galloping stretch
    b += limb([(44, 106), (36, 118), (28, 126)], 6, CD)
    b += limb([(82, 104), (96, 110), (108, 118)], 6, CD)
    # tail
    b += stroke("M100,80 C108,72 112,80 108,88", 4.6, OUT)
    b += stroke("M100,80 C108,72 112,80 108,88", 2, CD)
    # bristle ridge along the back
    b += poly([(34, 84), (40, 68), (46, 78), (52, 64), (58, 74), (64, 62), (70, 72), (76, 62), (82, 70),
               (88, 64), (94, 74), (100, 76), (96, 86), (36, 90)], BR)
    # body: heavy, head down, charging left
    b += path("M28,96 C30,74 60,66 86,70 C104,74 108,92 100,106 C92,116 60,118 40,112 C30,108 26,104 28,96 Z", C)
    b += shade("M84,70 C104,74 108,92 100,106 C92,116 66,118 50,114 C74,114 92,104 92,90 C92,80 88,74 84,70Z", CD)
    b += shade("M36,84 C42,74 56,70 68,70 C54,74 44,80 40,92 C36,92 34,88 36,84Z", CL)
    # near legs
    b += limb([(38, 108), (24, 116), (10, 122)], 6.5, C, CD)
    b += limb([(88, 104), (102, 114), (114, 124)], 6.5, C, CD)
    for x, y in ((10, 122), (114, 124), (28, 126), (108, 118)):
        b += poly([(x - 4, y - 1), (x + 4, y - 1), (x + 4, y + 4), (x - 4, y + 4)], BR)
    # head: wedge lowered, ear, eye, snout, tusks
    b += path("M36,84 C22,84 8,96 8,108 C10,116 22,120 32,116 C40,110 42,96 36,84 Z", C)
    b += shade("M32,116 C40,110 42,96 36,84 C34,94 30,106 22,116Z", CD)
    b += shade("M16,96 C20,90 28,86 34,88 C26,92 20,98 18,106Z", CL)
    b += poly([(38, 82), (30, 70), (26, 84)], CD)
    b += circ(24, 96, 2.2, OUT, ' stroke="none"')
    b += circ(24.6, 95.4, 0.8, "#f0e4e8", ' stroke="none"')
    b += ell(10, 110, 6, 5, SN)
    b += circ(8, 109, 1.2, OUT, ' stroke="none"')
    b += circ(11, 111, 1.2, OUT, ' stroke="none"')
    b += path("M18,114 C12,110 12,102 18,98 C16,104 18,108 22,110 Z", "#f1e7c8")
    b += path("M28,118 C22,116 20,108 26,104 C24,110 26,114 30,115 Z", "#e3d6ae")
    return svg(b)


def boar_icon():
    C, CD, BR, SN = "#5c3e26", "#3b2614", "#2b1b10", "#9a6a5a"
    b = poly([(4, 8), (5.5, 4.5), (7.5, 6.5), (9.5, 4), (11.5, 6.5), (13, 5), (14, 8.5), (4, 9.5)], BR)
    b += path("M2,10 C2,6 6,5 10,5.5 C14,6 15,9 14,12 C11,13.5 5,13.5 2,10 Z", C)
    b += shade("M3.5,9 C4.5,6.5 7,6 9.5,6 C7,7 5.5,8.5 5,10.5Z", "#8a6440")
    b += path("M4,8.5 C2,8.5 0.5,11 0.5,13 C1,14.5 3.5,15 5,14 C6,12 6,10 4,8.5 Z", C)
    b += circ(3.5, 10.5, 0.6, OUT, ' stroke="none"')
    b += ell(1.4, 13.6, 1.3, 1, SN)
    b += path("M3,14 C2,13 2,11.5 3.5,11 C3,12 3.3,13 4,13.5Z", "#f1e7c8")
    b += limb([(5, 13), (3, 15.5)], 1.6, CD, pad=1.2)
    b += limb([(12, 13), (14.5, 15.5)], 1.6, CD, pad=1.2)
    return icon(b)


# -------------------------------------------------------------------- 6 Wolf
def wolf():
    C, CD, CL, BL = "#8d8d92", "#5c5c62", "#c4c4c8", "#e6e6e8"
    b = SHADOW % (60, 128, 54, 6)
    # far legs stretched in the lunge
    b += limb([(48, 100), (38, 112), (26, 124)], 6, CD)
    b += limb([(82, 98), (96, 106), (108, 116)], 6, CD)
    # bushy tail trailing behind
    b += path("M94,84 C106,74 118,80 118,96 C114,88 108,88 100,94 Z", C)
    b += shade("M104,80 C114,80 118,88 118,96 C114,90 110,88 104,88Z", CD)
    # body: stretched low, lunging left
    b += path("M30,88 C36,72 64,70 86,76 C100,80 104,94 96,104 C86,112 60,110 42,104 C32,100 26,94 30,88 Z", C)
    b += shade("M84,76 C100,80 104,94 96,104 C86,112 62,110 48,106 C70,104 86,100 88,90 C88,82 86,78 84,76Z", CD)
    b += shade("M38,82 C44,74 58,72 70,72 C54,76 44,80 40,90 C36,90 36,86 38,82Z", CL)
    b += shade("M44,102 C56,108 76,108 90,102 C80,110 60,110 44,104Z", BL)
    # near legs: forepaws reaching forward, hind pushing off
    b += limb([(42, 100), (26, 108), (10, 116)], 6.5, C, CD)
    b += limb([(90, 100), (102, 112), (112, 124)], 6.5, C, CD)
    b += stroke("M10,116 L4,120 M10,116 L8,122 M112,124 L118,126 M112,124 L112,130", 2.2, CD)
    # head thrust forward, ears flat back, jaws open
    b += path("M36,80 C24,76 10,82 6,92 C8,98 16,100 26,98 L36,96 C42,90 42,84 36,80 Z", C)
    b += shade("M36,96 C42,90 42,84 36,80 C34,86 30,92 24,98Z", CD)
    b += shade("M14,86 C20,80 28,78 34,80 C26,82 20,86 16,92Z", CL)
    b += poly([(36, 78), (48, 70), (46, 82)], C)
    b += poly([(42, 80), (52, 74), (50, 86)], CD)
    b += path("M10,96 C6,104 12,110 22,106 L28,98 Z", C)                  # lower jaw
    b += poly([(10, 96), (14, 103), (26, 100), (28, 98)], "#8a2a3a", ' stroke="none"')
    b += poly([(9, 95), (11, 101), (13, 95)], BL, ' stroke="none"')
    b += poly([(16, 96), (18, 102), (20, 96)], BL, ' stroke="none"')
    b += poly([(14, 104), (16, 99), (18, 104)], BL, ' stroke="none"')
    b += circ(6, 90, 2.4, OUT, ' stroke="none"')
    b += eye(22, 88, 2.6)
    return svg(b)


def wolf_icon():
    C, CD, BL = "#8d8d92", "#5c5c62", "#e6e6e8"
    b = poly([(5, 5.5), (4, 0.5), (8.5, 3.5)], C)
    b += poly([(9.5, 4), (11.5, 0.5), (12.5, 5.5)], C)
    b += circ(8.5, 8, 5, C)
    b += path("M5,6.5 C2.5,6.5 0.5,8.5 0.5,10.5 C2,11.5 4,11.5 5.5,10.5 Z", C)
    b += path("M1,11 C1,13 3,14 5.5,12.5 L5.5,10.5 Z", C)
    b += poly([(1.2, 11), (2, 12.6), (5.5, 12), (5.5, 10.6)], "#8a2a3a", ' stroke="none"')
    b += circ(1.3, 9.9, 0.8, OUT, ' stroke="none"')
    b += circ(5.2, 8.2, 0.9, "#e8c23a", ' stroke="none"')
    b += circ(5.3, 8.2, 0.45, OUT, ' stroke="none"')
    b += poly([(4, 12.5), (13, 12.5), (14.5, 16), (2.5, 16)], C)
    b += poly([(6, 13), (11, 13), (12, 16), (5, 16)], BL, ' stroke="none"')
    return icon(b)


# -------------------------------------------------------------------- 7 Bear
def bear():
    C, CD, CL, MZ = "#6b4423", "#4a2d14", "#8e6239", "#a8845c"
    b = SHADOW % (60, 128, 40, 7)
    # far arm raised (his left, viewer's right)
    b += limb([(82, 60), (96, 48), (100, 30)], 13, CD)
    b += circ(102, 26, 8, CD)
    b += stroke("M100,18 L98,12 M105,19 L106,12 M109,22 L113,16", 2.6, OUT)
    # hind legs (stubby, standing)
    b += limb([(72, 100), (80, 118)], 15, CD)
    b += ell(82, 124, 11, 5, CD)
    b += limb([(50, 100), (46, 118)], 15, C, CD)
    b += ell(44, 124, 11, 5, C)
    b += stroke("M36,126 L34,130 M42,127 L41,131 M48,127 L48,131", 2.2, OUT)
    # torso: big, rearing
    b += path("M40,72 C36,52 56,40 72,44 C90,48 96,70 92,98 C90,112 78,120 60,120 C44,120 36,110 40,72 Z", C)
    b += shade("M72,44 C90,48 96,70 92,98 C90,112 78,120 62,120 C78,116 84,100 84,84 C84,66 80,52 72,44Z", CD)
    b += shade("M46,70 C46,56 56,46 66,46 C56,52 50,62 50,80 C46,80 46,76 46,70Z", CL)
    b += ell(62, 92, 16, 20, MZ, ' stroke="none"')
    b += shade("M70,74 A16,20 0 0 1 72,110 A10,20 0 0 0 70,74Z", C)
    # near arm raised (his right, viewer's left) swiping, claws out
    b += limb([(44, 62), (24, 52), (14, 32)], 13, C, CD)
    b += circ(12, 28, 8.5, C)
    b += shade("M14,20 A8.5,8.5 0 0 1 18,34 A5,8.5 0 0 0 14,20Z", CD)
    b += stroke("M6,24 L0,20 M5,29 L0,30 M8,34 L4,40", 2.6, OUT)
    # head: round, ears, muzzle, open mouth roaring
    b += circ(46, 22, 6, C)
    b += circ(62, 20, 6, C)
    b += circ(46, 22, 2.8, MZ, ' stroke="none"')
    b += circ(52, 34, 14, C)
    b += shade("M58,21 A14,14 0 0 1 62,46 A8,14 0 0 0 58,21Z", CD)
    b += ell(40, 40, 10, 7.5, MZ)
    b += path("M34,44 C38,50 46,50 48,44 Z", "#8a2a3a")
    b += poly([(36, 44), (37, 48), (39, 44)], "#f6f0dc", ' stroke="none"')
    b += poly([(44, 44), (45, 48), (47, 44)], "#f6f0dc", ' stroke="none"')
    b += circ(32, 38, 3.2, OUT, ' stroke="none"')
    b += circ(46, 30, 2.2, OUT, ' stroke="none"')
    b += circ(46.6, 29.4, 0.8, "#f0e4e8", ' stroke="none"')
    return svg(b)


def bear_icon():
    C, CD, MZ = "#6b4423", "#4a2d14", "#a8845c"
    b = circ(4.5, 3.5, 2, C)
    b += circ(11.5, 3.5, 2, C)
    b += circ(8, 7, 5.5, C)
    b += ell(6, 9.5, 3.4, 2.4, MZ)
    b += circ(3.4, 9, 1.1, OUT, ' stroke="none"')
    b += circ(6.2, 6, 0.8, OUT, ' stroke="none"')
    b += circ(10, 6, 0.8, OUT, ' stroke="none"')
    b += path("M4,11 C5,12.5 7.5,12.5 8.5,11Z", "#8a2a3a", ' stroke="none"')
    b += poly([(3, 12.5), (13, 12.5), (14.5, 16), (1.5, 16)], C)
    return icon(b)


# --------------------------------------------------------------- 8 Crocodile
def crocodile():
    GR, GD, GL, BY = "#4f7a2f", "#35551c", "#7da350", "#c8c07a"
    b = SHADOW % (60, 129, 56, 5)
    # far legs splayed
    b += limb([(50, 104), (42, 112), (36, 118)], 7, GD)
    b += limb([(84, 104), (92, 110), (100, 116)], 7, GD)
    # tail sweeping back-right
    b += path("M86,96 C104,92 118,100 116,116 C112,108 100,106 86,110 Z", GR)
    b += shade("M100,94 C112,96 118,104 116,116 C112,108 106,104 100,102Z", GD)
    b += poly([(88, 96), (94, 90), (100, 96), (106, 92), (112, 100), (108, 104), (102, 98), (96, 102)], GD)
    # body: low and long, scutes along the back
    b += path("M30,98 C30,86 50,80 70,82 C86,84 92,92 90,106 C86,114 62,116 46,114 C34,112 28,106 30,98 Z", GR)
    b += shade("M70,82 C86,84 92,92 90,106 C86,114 64,116 50,114 C72,112 84,104 84,96 C84,88 78,84 70,82Z", GD)
    b += shade("M38,102 C46,110 70,112 86,106 C74,114 50,114 38,108Z", BY)
    b += poly([(38, 88), (44, 80), (50, 86), (56, 78), (62, 84), (68, 78), (74, 84), (80, 80), (86, 88), (84, 92), (40, 94)], GD)
    b += stroke("M42,96 L80,96 M44,102 L84,102", 1.2, GD)
    # near legs splayed wide
    b += limb([(44, 108), (28, 114), (18, 124)], 7.5, GR, GD)
    b += limb([(82, 108), (98, 114), (108, 124)], 7.5, GR, GD)
    b += stroke("M18,124 L10,126 M18,124 L14,130 M18,124 L22,130 M108,124 L114,128 M108,124 L108,130 M108,124 L102,130", 2.2, GD)
    # head: jaws open wide to the left
    b += path("M40,84 C34,78 30,90 36,100 L40,104 Z", GR)
    b += poly([(42, 92), (8, 70), (4, 100)], "#8a2a3a")                     # mouth interior
    b += path("M44,82 C34,78 16,68 6,62 L2,70 C14,78 28,88 40,96 Z", GR)    # upper jaw
    b += shade("M44,82 C34,78 16,68 6,62 L8,66 C18,72 30,80 42,88Z", GL)
    for x, y in ((10, 70), (18, 76), (26, 82), (34, 88)):
        b += poly([(x - 1, y - 1), (x + 4, y + 2), (x + 1, y + 5)], "#f6f0dc", ' stroke="none"')
    b += path("M42,96 C30,98 14,100 2,100 L4,108 C16,108 30,106 42,104 Z", GR)   # lower jaw
    b += shade("M6,101 C16,101 30,100 42,98 L42,104 C30,106 16,108 6,108Z", BY)
    for x in (8, 16, 24, 32):
        b += poly([(x - 2, 100), (x + 2, 100), (x, 95)], "#f6f0dc", ' stroke="none"')
    b += circ(40, 80, 4.5, GR)
    b += eye(40, 80, 3, slit=True)
    b += circ(8, 64, 1.4, OUT, ' stroke="none"')
    return svg(b)


def crocodile_icon():
    GR, GD, BY = "#4f7a2f", "#35551c", "#c8c07a"
    b = path("M11,9 C14,8 16,10 15.5,13 C14.5,11.5 12.5,11.5 11,12Z", GR)
    b += path("M4,10 C4,7 8,6 11,6.5 C13,7 13.5,10 12,12 C9,13 5,13 4,10 Z", GR)
    b += poly([(5, 7.5), (6.5, 5.5), (8, 7), (9.5, 5.5), (11, 7.5), (11, 8.5), (5, 8.5)], GD)
    b += poly([(6, 9.5), (0.5, 5), (0.5, 12)], "#8a2a3a")
    b += path("M7,8 C4.5,7 2,5.5 0.5,4.5 L0.2,6 C2,7 5,8.5 7,9.5Z", GR)
    b += path("M7,10.5 C4.5,11 2,11.5 0.5,11.5 L0.5,13 C2.5,13 5,12.5 7,12Z", BY)
    b += circ(6.5, 7.2, 0.9, "#e8c23a")
    b += limb([(5, 12.5), (2.5, 15)], 1.6, GD, pad=1.2)
    b += limb([(11, 12.5), (13.5, 15)], 1.6, GD, pad=1.2)
    return icon(b)


# ------------------------------------------------------------------- 9 Tiger
def tiger():
    O, OD, OL, WH, BK = "#e0862a", "#b8601a", "#f2a84a", "#f4ecd8", "#2a2020"
    b = SHADOW % (62, 130, 34, 5)
    # far legs: hind stretched back, fore reaching forward
    b += limb([(84, 92), (102, 98), (116, 112)], 7, OD)
    b += limb([(40, 60), (24, 62), (8, 66)], 7, OD)
    # tail curling up behind
    b += stroke("M94,82 C110,76 116,60 106,48", 7, OUT)
    b += stroke("M94,82 C110,76 116,60 106,48", 4.4, O)
    b += stroke("M100,78 L102,74 M107,70 L110,68 M110,60 L113,57", 2.4, BK)
    # body: diagonal, stretched in the leap toward the upper-left
    b += path("M22,50 C32,36 60,42 86,62 C102,74 104,92 94,100 C82,106 62,96 40,78 C28,70 16,62 22,50 Z", O)
    b += shade("M86,62 C102,74 104,92 94,100 C84,106 68,98 56,90 C78,96 90,90 90,80 C90,72 88,66 86,62Z", OD)
    b += shade("M30,46 C40,40 56,42 68,50 C54,46 42,48 34,56 C28,56 26,50 30,46Z", OL)
    b += shade("M40,78 C56,92 72,100 90,100 C74,106 56,96 40,82Z", WH)
    # stripes across the back
    for (x, y) in ((44, 44), (56, 48), (68, 54), (80, 62), (90, 74)):
        b += spoly([(x, y), (x + 6, y + 2), (x + 2, y + 14), (x - 4, y + 10)], BK)
    # near legs
    b += limb([(78, 94), (96, 106), (108, 122)], 7.5, O, OD)
    b += limb([(34, 66), (20, 76), (4, 82)], 7.5, O, OD)
    b += stroke("M4,82 L0,80 M4,82 L0,88 M108,122 L114,126 M108,122 L106,128", 2.4, OD)
    # head: round, muzzle, open jaws, ears, stripes
    b += circ(28, 46, 14, O)
    b += shade("M34,33 A14,14 0 0 1 38,58 A8,14 0 0 0 34,33Z", OD)
    b += circ(20, 36, 5, O)
    b += circ(36, 34, 5, O)
    b += circ(20, 36, 2.4, OD, ' stroke="none"')
    b += ell(18, 52, 9, 7, WH)
    b += path("M12,56 C14,62 22,64 28,58 Z", "#8a2a3a")
    b += poly([(14, 56), (15, 61), (17, 56)], WH, ' stroke="none"')
    b += poly([(24, 57), (25, 62), (27, 56)], WH, ' stroke="none"')
    b += circ(10, 50, 2.6, OUT, ' stroke="none"')
    b += eye(22, 44, 2.6)
    b += spoly([(30, 36), (34, 38), (32, 46), (28, 44)], BK)
    b += spoly([(36, 44), (40, 46), (38, 54), (34, 52)], BK)
    b += spoly([(26, 32), (30, 32), (29, 38), (26, 37)], BK)
    return svg(b)


def tiger_icon():
    O, OD, WH, BK = "#e0862a", "#b8601a", "#f4ecd8", "#2a2020"
    b = circ(3.5, 2.5, 1.8, O)
    b += circ(10, 2.5, 1.8, O)
    b += circ(7, 6, 5, O)
    b += ell(5.2, 8.2, 3.2, 2.4, WH)
    b += circ(2.8, 7.8, 1, OUT, ' stroke="none"')
    b += circ(5.5, 5, 0.8, OUT, ' stroke="none"')
    b += circ(9.5, 5, 0.8, OUT, ' stroke="none"')
    b += poly([(8, 2), (9.5, 2.5), (8.5, 5), (7.5, 4.5)], BK, ' stroke="none"')
    b += poly([(10.5, 5.5), (12, 6.5), (11, 9), (9.8, 8.5)], BK, ' stroke="none"')
    b += poly([(2.5, 11), (12, 11), (14.5, 16), (0.5, 16)], O)
    b += poly([(6, 11), (8, 11), (8.5, 14), (6.5, 14)], BK, ' stroke="none"')
    b += poly([(10, 11), (12, 11), (12.5, 14), (10.5, 14)], BK, ' stroke="none"')
    return icon(b)


# --------------------------------------------------------------- 10 Elephant
def elephant():
    E, ED, EL = "#8a8a90", "#5f5f66", "#b4b4ba"
    b = SHADOW % (62, 130, 54, 6)
    # far legs (walking: far fore back, far hind forward)
    b += limb([(56, 104), (60, 126)], 11, ED)
    b += limb([(94, 104), (100, 126)], 11, ED)
    # tail
    b += stroke("M108,88 C116,92 118,104 112,112", 4, OUT)
    b += stroke("M108,88 C116,92 118,104 112,112", 1.8, ED)
    b += stroke("M112,112 L110,118 M112,112 L116,116", 2.4, OUT)
    # body
    b += path("M32,88 C30,60 52,48 76,48 C100,48 112,66 110,92 C108,108 94,114 70,114 C46,114 32,106 32,88 Z", E)
    b += shade("M76,48 C100,48 112,66 110,92 C108,108 94,114 70,114 C92,110 100,98 100,84 C100,66 90,52 76,48Z", ED)
    b += shade("M40,80 C40,64 52,54 66,52 C52,58 46,68 46,82 C42,84 40,84 40,80Z", EL)
    b += stroke("M60,66 C70,62 86,64 94,72", 1.2, ED)
    # near legs (near fore stepping forward, near hind back)
    b += limb([(44, 108), (38, 128)], 12, E, ED)
    b += limb([(84, 108), (88, 128)], 12, E, ED)
    for x in (37, 89):
        b += stroke(f"M{x-7},129 L{x+7},129", 3, OUT)
        b += stroke(f"M{x-5},128 L{x-3},128 M{x-1},128 L{x+1},128 M{x+3},128 L{x+5},128", 2, EL)
    # head with flapping ear
    b += path("M40,56 C24,56 12,68 14,86 C16,96 26,102 38,100 C48,98 52,86 50,72 C48,62 44,56 40,56 Z", E)
    b += shade("M42,58 C50,64 52,76 48,90 C44,98 38,100 34,100 C42,96 44,86 44,72 C44,64 42,60 42,58Z", ED)
    b += path("M46,58 C64,50 70,70 62,86 C56,96 44,96 40,86 C46,80 48,70 46,58 Z", E)
    b += shade("M48,60 C62,56 66,70 60,84 C56,92 48,94 44,88 C52,84 54,72 50,62Z", ED)
    b += shade("M50,62 C58,60 62,68 60,76 C58,70 54,66 50,64Z", EL)
    b += circ(24, 76, 2.2, OUT, ' stroke="none"')
    b += circ(24.6, 75.4, 0.8, "#f0e4e8", ' stroke="none"')
    # tusks
    b += path("M30,94 C22,102 10,100 6,92 C12,98 22,96 26,88 Z", "#f1e7c8")
    b += path("M36,98 C30,106 20,110 12,106 C20,106 28,102 32,94 Z", "#e3d6ae")
    # trunk raised high and curled
    b += path("M20,90 C8,92 2,80 4,64 C6,54 2,48 6,38 L14,38 C12,48 14,56 14,66 C14,76 16,84 24,84 Z", E)
    b += shade("M14,66 C14,76 16,84 24,84 L20,90 C12,90 8,82 8,70 C8,60 10,52 10,40 L8,40 C6,50 6,58 6,66 C6,78 12,86 16,82Z", ED)
    b += shade("M8,40 C10,46 12,46 13,40 L12,38 L8,38Z", EL)
    b += stroke("M8,56 L13,56 M7,66 L13,66 M8,76 L15,76", 1.1, ED)
    return svg(b)


def elephant_icon():
    E, ED = "#8a8a90", "#5f5f66"
    b = path("M4,15 C3,8 7,4 11,4 C14.5,4 16,8 15.5,15 Z", E)
    b += path("M9,5 C13,3 14.5,8 12,11 C10,12.5 8,11 8,8 Z", E)
    b += path("M3,12 C1,10.5 1,6.5 2.5,3 L4,3 C3.2,6 3.5,9 4.5,11 Z", E)
    b += circ(5.5, 9, 0.5, OUT, ' stroke="none"')
    b += path("M5.5,13 C4,15 2,15 1,14 C2.5,14 3.5,13.5 4.5,12 Z", "#f1e7c8")
    b += limb([(6, 14), (6, 16)], 2, ED, pad=1.2)
    b += limb([(13, 14), (13, 16)], 2, ED, pad=1.2)
    return icon(b)


UNITS = [
    (1, rat, rat_icon), (2, spider, spider_icon), (3, snake, snake_icon), (4, bat, bat_icon),
    (5, boar, boar_icon), (6, wolf, wolf_icon), (7, bear, bear_icon), (8, crocodile, crocodile_icon),
    (9, tiger, tiger_icon), (10, elephant, elephant_icon),
]

if __name__ == "__main__":
    for n, big, small in UNITS:
        (ROOT / "big" / f"nature-{n}.svg").write_text(big())
        (ROOT / f"nature-{n}.svg").write_text(small())
        print(n, len(big()), len(small()))
