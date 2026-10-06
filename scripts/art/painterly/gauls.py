#!/usr/bin/env python3
"""Painterly Gaul unit art (big 120x140 figures only).

Run:  python3 scripts/art/painterly/gauls.py [--out DIR] [unit numbers]
Writes src/web/public/img/units/big/gauls-{1..10}.svg.  The 16x16 icons stay with
scripts/art/gauls.py (do not run that one afterwards for the big figures).

Same poses and identities as the flat generator, redrawn with the painterly kit in
tglib.py.  Gaulish look: green wool, blue checked trousers, bronze helmets, gold torcs,
long hair and drooping moustaches.  All art is original.
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from tglib import *  # noqa: E402,F403

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "web", "public", "img", "units")


# ---------------------------------------------------------------- Gaulish parts

def bronze_helm(cx: float, cy: float, crest: bool = False, s: float = 1.0) -> list[str]:
    """Montefortino-style bronze cap: domed bowl, top knob, flared neck guard, cheek guard."""
    o = []
    if crest:
        cr = (f"M{n(cx-3)},{n(cy-15*s)} C{n(cx-6)},{n(cy-25*s)} {n(cx+9)},{n(cy-28*s)} {n(cx+15)},{n(cy-16*s)} "
              f"C{n(cx+12)},{n(cy-20*s)} {n(cx+6)},{n(cy-21*s)} {n(cx+2)},{n(cy-15*s)}Z")
        o.append(part(cr, RED, folds=f"M{n(cx-1)},{n(cy-17*s)} C{n(cx)},{n(cy-23*s)} {n(cx+7)},{n(cy-24*s)} {n(cx+12)},{n(cy-17*s)}",
                      fold_col="#3a0806"))
        o.append(L(f"M{n(cx-2)},{n(cy-18*s)} C{n(cx-2)},{n(cy-23*s)} {n(cx+6)},{n(cy-25*s)} {n(cx+11)},{n(cy-19*s)}", RED_L, .6, .7))
    ng = f"M{n(cx+6)},{n(cy-3)} L{n(cx+12.5*s)},{n(cy+1)} L{n(cx+11*s)},{n(cy+3.6)} L{n(cx+5)},{n(cy+1)}Z"
    o.append(V(P(ng, BRONZE, 1.1)))
    bowl = f"M{n(cx-10*s)},{n(cy-2)} C{n(cx-10.5*s)},{n(cy-16.5*s)} {n(cx+10.5*s)},{n(cy-16.5*s)} {n(cx+10.5*s)},{n(cy-2)} Q{n(cx)},{n(cy-5)} {n(cx-10*s)},{n(cy-2)}Z"
    o.append(V(P(bowl, BRONZE, 1.3)))
    o.append(clipped(bowl, SH(f"M{n(cx+3)},{n(cy-13*s)} Q{n(cx+10*s)},{n(cy-9*s)} {n(cx+10*s)},{n(cy-2)} L{n(cx+4)},{n(cy-3)}Z", "#3a1e04", .5),
                     L(f"M{n(cx-9*s)},{n(cy-6)} Q{n(cx)},{n(cy-9)} {n(cx+10*s)},{n(cy-6)}", "#6a4010", .7, .7)))
    o.append(spec(cx - 4.6 * s, cy - 10 * s, 2.6, 1.6, .9, -30))
    o.append(dot(cx - 5.2 * s, cy - 10.6 * s, .7, "#fff"))
    o.append(V(P(f"M{n(cx-10.6*s)},{n(cy-3)} Q{n(cx)},{n(cy-6)} {n(cx+11*s)},{n(cy-3)} L{n(cx+10.8*s)},{n(cy-.6)} Q{n(cx)},{n(cy-3.4)} {n(cx-10.6*s)},{n(cy-.6)}Z", BRONZE, 1.1)))
    o.append(L(f"M{n(cx-9.6*s)},{n(cy-1.8)} Q{n(cx)},{n(cy-4.8)} {n(cx+10*s)},{n(cy-1.8)}", "#6a4010", .6, .6).replace('fill="none"', 'fill="none" stroke-dasharray=".8 1.2"'))
    o.append(V(circ(cx, cy - 14.6 * s, 2.3, g("bronzer"), 1)))
    # cheek guard (far side, behind the ear)
    o.append(V(P(f"M{n(cx+3)},{n(cy-1.4)} L{n(cx+9.5)},{n(cy-1.6)} Q{n(cx+9.6)},{n(cy+5)} {n(cx+6)},{n(cy+8)} Q{n(cx+3)},{n(cy+5)} {n(cx+3)},{n(cy-1.4)}Z", BRONZE, 1)))
    o.append(rivet(cx + 6.2, cy + 2.4, .6))
    return o


def check_tube(d: str, w: float) -> str:
    return tube(d, CHK, w, tex="check")


def ox(x0: float, y0: float, s: float = 1.0) -> list[str]:
    """Draught ox walking left (local coords: body x 6..60, back y 8, hooves y 66)."""
    o = [f'<g transform="translate({n(x0)},{n(y0)}) scale({s})">']
    o.append(tube("M14,38 L10,52 L7,63", OX_D, 7.5, kind="horse"))
    o.append(hoof(7, 66))
    o.append(tube("M48,38 L54,52 L57,63", OX_D, 7.5, kind="horse"))
    o.append(hoof(57, 66))
    o.append(V(P("M58,18 Q64,24 63,36 Q61,46 58,52 L56,51 Q58,40 57,30Z", OX_D, 1.1)))
    o.append(L("M58,48 Q60,52 58,56", "#3a2818", 2, .9))
    body = "M8,22 C10,10 18,4 27,7 C38,5 50,8 58,16 C63,26 59,40 48,43 L15,43 C6,41 4,31 8,22Z"
    o += horse_body(body, OX, "M10,38 Q30,46 56,38 Q46,44 30,44 Q16,44 10,38Z", "M16,10 Q30,6 44,10 Q30,14 18,16Z",
                    "M18,22 Q24,30 20,40 M44,20 Q40,30 46,40", OX_D)
    o.append(tube("M19,38 L19,52 L17,63", OX, 8.5, kind="horse"))
    o.append(hoof(17, 66))
    o.append(tube("M43,38 L41,52 L45,63", OX, 8.5, kind="horse"))
    o.append(hoof(45, 66))
    hd = "M13,17 C5,15 -3,21 -6,31 C-8,40 -2,45 6,43 C11,41 13,35 15,30Z"
    o.append(V(P(hd, OX, 1.3)))
    o.append(V(P("M-2,34 C-8,36 -8,45 -2,45 C4,45 6,41 4,36Z", "#c9b8a0", 1)))
    o.append(dot(0, 39, 1.1, "#1a0e08"))
    o.append(circ(4, 26, 1.6, "#1a1410", 0.8) + dot(3.5, 25.4, .5, "#fff"))
    o.append(V(P("M11,20 C15,17 20,19 18,24 C16,24 13,23 11,22Z", OX, 1)))
    o.append(V(P("M2,19 C-2,10 -9,6 -13,10 C-11,12 -7,14 -2,21Z", HORN, 1)))
    o.append(V(P("M10,17 C12,8 18,3 23,7 C21,9 16,12 12,19Z", HORN, 1)))
    # yoke strap + bell
    o.append(L("M13,22 Q18,34 14,44", LEA_D, 2.2, 1))
    o.append(V(circ(15, 46, 2, g("bronzer"), .9)))
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 1 Phalanx

def phalanx() -> list[str]:
    o = [shadow(62, 36)]
    o.append(check_tube("M56,80 L40,96 L38,116", 11))
    o += boot(38, 123, -1, LEA, 13)
    o.append(check_tube("M68,80 L84,98 L91,116", 11))
    o += boot(91, 123, -1, LEA, 13)
    o.append(part("M46,43 C52,37 68,37 74,43 L78,68 L77,88 Q62,91 45,88 L44,68Z", GREEN,
                  lit="M48,46 L56,43 L52,74 L46,72Z", folds="M70,48 Q75,66 74,86 M52,76 Q50,82 51,88 M62,78 Q62,84 63,89"))
    o += belt(45, 76, 77, 75, 4.4, BRONZE)
    # near arm low on the spear shaft
    o.append(tube("M74,47 L90,62 L83,81", SKIN, 9.5))
    o.append(V(P("M85,57 L93,55 L94,61 L86,63Z", GOLD, 1)))
    o += spear(110, 104, 24.6, 37.8, 16, 3.2)
    o += fist(82.6, 82.4, 4, 215)
    # far arm + tall oval shield
    o.append(tube("M48,47 L37,59 L35,69", SKIN, 9))
    o += oval_shield(36, 72, 15.5, 25, GREEN, -6, motif_col=GOLD_L)
    o += long_hair(60, 30, BROWN, 16)
    o.append(tube("M60,37 L61,44", SKIN, 8))
    o += face(60, 30, grim=True)
    o += droop_moustache(60, 30, BROWN)
    o += torc(60, 43.6, 7)
    o += bronze_helm(60, 29)
    return o


# ---------------------------------------------------------------- 2 Swordsman

def swordsman() -> list[str]:
    o = [shadow(60, 38)]
    # far arm back with a small round shield
    o.append(tube("M46,46 L31,44 L23,53", SKIN, 9))
    o += round_shield(22, 56, 10.5, CHK, boss=BRONZE, motif="triskele", motif_col=GOLD_L)
    o.append(check_tube("M54,80 L36,92 L28,116", 11))
    o += boot(28, 123, -1, LEA, 13)
    o.append(check_tube("M68,80 L82,100 L91,116", 11))
    o += boot(91, 123, -1, LEA, 13)
    o.append(part("M44,43 C50,35 70,35 76,43 L80,66 L75,88 Q60,91 47,88 L42,66Z", GREEN,
                  lit="M46,46 L54,42 L50,74 L44,70Z", folds="M47,50 Q52,54 50,84 M70,46 Q75,60 72,86 M58,76 Q58,84 60,89"))
    o += belt(44, 79, 77, 78, 4.4, BRONZE)
    # near arm raised, longsword cutting down
    o.append(tube("M73,45 L90,42 L88,27", SKIN, 9.5))
    o.append(V(P("M83.4,39.6 L91.6,37.6 L92.6,43.6 L84.4,45.6Z", GOLD, 1)))
    o += longsword(88, 24, -48, 36)
    o += fist(88, 24.6, 4, 230)
    o.append(L("M108,11 C116,29 112,49 100,61", "#fff4d6", 2.2, .5).replace('fill="none"', 'fill="none" stroke-dasharray="4 3"'))
    o.append(L("M108,11 C116,29 112,49 100,61", "#a39c8c", .8, .6).replace('fill="none"', 'fill="none" stroke-dasharray="4 3"'))
    o += long_hair(56, 28, BLOND, 18)
    o.append(tube("M56,35 L57,42", SKIN, 8))
    o += face(56, 28, grim=True, brow="#8a6420")
    o += hair_cap(56, 28, BLOND)
    o += droop_moustache(56, 28, BLOND)
    o += torc(56, 42, 7)
    return o


# ---------------------------------------------------------------- 3 Pathfinder

def pathfinder() -> list[str]:
    o = [shadow(62, 52)]
    o.append('<g transform="translate(62,128) scale(.94) translate(-62,-128)">')
    h = horse(DUN, DUN_D, "#f8e0b0", "trot", "maneb", "#c09060", drop=.8)
    o += h["far"]
    # cloak streaming right behind the rider
    cl = "M52,42 C70,38 92,42 106,58 C108,68 102,76 97,80 L86,71 C81,65 71,61 56,61Z"
    o.append(part(cl, GREEN, lit="M56,44 Q74,40 92,46 Q74,48 58,52Z", folds="M62,50 C76,48 90,54 97,66 M70,56 Q84,58 92,72", fold_col="#0e2008"))
    o += h["body"]
    o.append(part("M44,64 L74,62 L76,82 L46,84Z", CHK, "check"))
    o.append(L("M46,84 L76,82", GOLD, 1, .9))
    o += h["near"]
    # spear slung along the pony's side
    o += spear(98, 90, 50, 104, 10, 2.4)
    # near leg
    o.append(L("M58,82 L57,96", LEA_D, 1.6, 1))
    o.append(check_tube("M60,66 L49,82 L47,97", 9.5))
    o += boot(46, 103, -1, LEA, 12)
    o.append(P("M40,102 L52,102 L51,105 L41,105Z", STEEL_D, .9))
    # torso, leather vest, twisted to look back
    o.append(part("M49,37 C55,33 70,33 75,39 L77,56 L73,70 L54,70 L48,54Z", LEA,
                  lit="M51,40 L58,38 L55,62 L50,58Z", folds="M60,40 Q59,54 61,68 M70,42 Q74,56 71,68"))
    o += belt(50, 64, 75, 64, 3.8, BRONZE)
    # far arm forward with the reins
    o.append(tube("M52,41 L41,50 L34,56", SKIN, 7.5))
    o += fist(33, 57, 3.2, 180)
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q24,58 31,57", LEA_D, 1.2, 1))
    # near arm back, hand on the croup
    o.append(tube("M72,41 L85,54 L92,66", SKIN, 7.5))
    o += fist(93, 68, 3.2, 60)
    o.append(V(P("M85,52 L91,57 L88,61 L82,56Z", GOLD, .9)))
    # head turned back over the shoulder
    o += face_r(64, 24, rx=8.2, ry=9, brow=BROWN)
    o.append(f'<g transform="translate(128,0) scale(-1,1)">')
    o += droop_moustache(64, 24, BROWN)
    o.append("</g>")
    o.append(V(P("M55,22 C55,13 73,13 74,22 Q71,18 64,18 Q58,18 55,22Z", BROWN, 1.1)))
    o.append(V(P("M71,20 Q76,26 74,34 Q72,28 70,24Z", BROWN, 1)))
    o += torc(64, 35.6, 6)
    o += h["neck"] + h["head"]
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 4 Theutates Thunder

def thunder() -> list[str]:
    o = [shadow(60, 54)]
    h = horse(WHITEC, WHITEC_D, "#ffffff", "gallop", "manel", "#ffffff", drop=.8)
    o += h["far"]
    # cloak streaming straight back
    cl = "M60,40 C76,30 100,32 118,44 C112,52 106,60 102,70 C96,60 82,54 64,56Z"
    o.append(part(cl, CHK, lit="M64,40 Q80,33 100,36 Q82,40 66,48Z", folds="M70,44 C86,40 102,44 110,50 M68,50 Q86,48 102,62", fold_col="#0a1830"))
    o += h["body"]
    o.append(part("M48,62 L78,60 L82,80 L52,82Z", GREEN, folds="M60,64 L61,80 M70,62 L72,80", fold_col="#0e2008"))
    o.append(L("M52,82 L82,80", GOLD, 1, .9))
    o += h["near"]
    # near leg tucked back
    o.append(check_tube("M62,62 L54,78 L58,93", 9.5))
    o += boot(59, 99, -1, LEA, 12)
    # torso leaning far forward over the neck
    o.append(part("M44,36 C50,28 64,26 70,30 L76,46 L70,62 L52,64 L44,50Z", GREEN,
                  lit="M46,36 Q52,30 60,30 Q52,36 48,46Z", folds="M50,40 Q49,50 52,60 M64,34 Q70,46 68,60", fold_col="#0e2008"))
    o += belt(50, 58, 72, 57, 3.6, BRONZE)
    # far arm down, gripping the mane
    o.append(tube("M48,37 L37,43 L35,51", SKIN, 7.5))
    o += fist(35, 52, 3.2, 100)
    # near arm cocked back, javelin about to fly
    o.append(tube("M67,33 L81,28 L84,16", SKIN, 7.5))
    o.append(V(P("M78,26 L84,25 L84.6,29.6 L78.6,30.6Z", GOLD, .9)))
    o += spear(112, 11.4, 41.9, 20.5, 12, 2.6, WOOD, 2.2)
    o += fist(84, 15.4, 3.3, 190)
    # head low, looking ahead
    o += long_hair(50, 20, GINGER, 12, 8.5)
    o += face(50, 20, rx=8, ry=8.5, grim=True, brow="#7a3010")
    o += droop_moustache(50, 20, GINGER)
    o += bronze_helm(50, 19, s=.92)
    o += h["neck"] + h["head"]
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q26,54 34,53", LEA_D, 1.2, 1))
    return o


# ---------------------------------------------------------------- 5 Druidrider

def druidrider() -> list[str]:
    o = [shadow(62, 52)]
    h = horse(BAY, BAY_D, "#b07a48", "stand", "mane", "#8a6a4a", drop=1.0)
    o += h["far"] + h["body"]
    o.append(part("M46,62 L76,60 L80,84 L50,86Z", GREEN))
    o.append(L("M50,82.6 L79.6,80.6", GOLD, 1.1, .9))
    o += h["near"]
    # long robe draping over the near side
    robe = "M50,35 C56,29 70,29 76,35 L80,67 C82,80 81,92 77,101 Q66,104 56,101 C54,88 52,76 50,67Z"
    o.append(part(robe, CREAM, lit="M52,40 L60,36 L58,90 L54,92Z",
                  folds="M56,44 C54,62 56,82 58,99 M66,48 C66,66 66,84 67,100 M76,46 C79,64 79,84 76,98", fold_col="#5a4a30"))
    o.append(L("M51,69 Q66,72 80,67", OUT, 3.6, .75) + L("M51,69 Q66,72 80,67", ROPE, 2.4, 1))
    o.append(L("M62,70.6 L60,80 M64,70.8 L65,79", ROPE, 1.4, 1))
    o.append(V(circ(57, 70, 2, g("goldr"), .8)))
    # far arm with the reins
    o.append(tube("M50,40 L41,50 L37,58", CREAM, 8.5))
    o += fist(36, 59, 3.2, 170)
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q26,62 34,59", LEA_D, 1.2, 1))
    # staff held upright in the near hand
    o += shaft(88, 113, 88, 9, 3)
    o.append(L("M86.6,30 C84,22 90,20 90,26", WOOD_L, 1.2, .8))
    o.append(tube("M74,40 L90,46 L88,36", CREAM, 8.5))
    o += fist(88, 36, 3.4, 270)
    # mistletoe sprig on the staff head
    for dx, dy, a in ((-6, -2, -1), (6, -3, 1), (-4, 5, -1), (5, 4, 1)):
        x, y = 90, 11
        o.append(P(f"M{x},{y} C{n(x+dx*.5)},{n(y+dy-3*a)} {n(x+dx)},{n(y+dy-2)} {n(x+dx*1.3)},{n(y+dy)} C{n(x+dx)},{n(y+dy+2)} {n(x+dx*.5)},{n(y+dy+2)} {x},{y}Z", OAK, .9))
    for x, y in ((88.5, 12), (92.5, 10), (90.5, 14.5)):
        o.append(circ(x, y, 1.9, "#f6f4ea", .8) + dot(x - .6, y - .6, .6, "#ffffff"))
    # hood back, face with long grey beard, hood rim
    o.append(part("M50,38 C46,20 54,7 64,7 C76,7 80,21 76,40 L70,42 L56,42Z", CREAM, folds="M70,14 Q76,24 74,38", fold_col="#5a4a30"))
    o += face(62, 26, rx=8, ry=9, brow="#a8a090")
    o += beard(62, 26, GREYH, 13, .95, 9)
    o.append(part("M52,31 C51,18 57,12 64,12 C71,12 75,19 73,32 C71,24 67,19.6 62,19.6 C57,19.6 54,24 52,31Z", CREAM,
                  lit="M54,24 C56,16 62,14 66,14 C60,16 57,20 56,26Z"))
    o += h["neck"] + h["head"]
    return o


# ---------------------------------------------------------------- 6 Haeduan

def haeduan() -> list[str]:
    o = [shadow(62, 54)]
    h = horse(SORREL, SORREL_D, "#d0784c", "canter", "mane", "#7a4a30", drop=.65)
    o += h["far"]
    cl = "M58,40 C78,34 100,40 112,56 C110,66 104,74 100,80 L86,70 C82,62 72,58 60,58Z"
    o.append(part(cl, GREEN, lit="M62,40 Q80,36 98,44 Q80,46 64,50Z", folds="M70,46 C86,44 100,50 106,60 M66,52 Q84,54 96,70", fold_col="#0e2008"))
    o += h["body"]
    o.append(part("M45,60 L79,58 L83,84 L49,86Z", CHK, "check"))
    o.append(L("M49,86 L83,84", GOLD, 1.1, .9))
    o.append(L("M50,86 l0,1.6 M54,86 l0,1.6 M58,86 l0,1.6 M62,85.8 l0,1.6 M66,85.6 l0,1.6 M70,85.4 l0,1.6 M74,85.2 l0,1.6 M78,85 l0,1.6", GOLD_D, .8, .9))
    o += h["near"]
    # near leg in mail chausses
    o.append(L("M57,82 L56,98", LEA_D, 1.6, 1))
    o.append(tube("M64,66 L51,83 L48,98", "#8d959d", 9.5, tex="mail"))
    o += boot(48, 104, -1, LEA, 12)
    o.append(P("M42,103 L54,103 L53,106 L43,106Z", STEEL_D, .9))
    # far arm (shield arm)
    o.append(tube("M56,38 L45,48 L39,56", "#8d959d", 9, tex="mail"))
    # mail shirt with bronze pectoral
    o.append(part("M51,33 C57,29 70,29 76,33 L80,53 L77,71 L55,71 L51,53Z", "#8d959d", "mail",
                  lit="M53,36 L60,34 L57,60 L52,58Z"))
    o.append(V(P("M57,37 L72,37 L74,50 Q65,53 56,50Z", BRONZE, 1.1)))
    o.append(clipped("M57,37 L72,37 L74,50 Q65,53 56,50Z", L("M60,40 Q65,46 70,40 M65,44 L65,50", "#6a4010", .8, .8)))
    o.append(spec(60, 40, 2, 1, .8))
    o += belt(53, 64, 79, 64, 4, BRONZE)
    # near arm couching the lance
    o.append(tube("M74,38 L84,50 L66,56", "#8d959d", 9, tex="mail"))
    o += spear(106, 76, 21.6, 36.4, 15, 3, WOOD, 3)
    o += fist(66, 56, 3.8, 200)
    o.append(tube("M62,29 L63,36", SKIN, 7.5))
    o += face(62, 22, grim=True)
    o += droop_moustache(62, 22, BROWN)
    o += bronze_helm(62, 21, crest=True)
    o += h["neck"] + h["head"]
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q30,60 40,58", LEA_D, 1.2, 1))
    o += round_shield(36, 60, 16, GREEN, boss=BRONZE, motif="triskele", motif_col=GOLD_L)
    return o


# ---------------------------------------------------------------- 7 Ram

def ram() -> list[str]:
    o = [shadow(58, 52)]
    o.append('<g transform="translate(4,128) scale(.88) translate(-4,-128)">')
    o += wheel(34, 110, 9.5, True)
    o += wheel(88, 110, 9.5, True)
    o.append(beam("M8,105 L108,105", 5))
    o += crewman(52, 82, .64, GREEN, CHK, BROWN, None, "check")
    # log + iron head
    log = "M18,80 C24,76 92,76 101,81 C103,87 103,92 101,97 C92,101 24,101 18,97Z"
    o.append(part(log, WOOD, "grain", lit="M22,80 C40,77 80,77 98,81 L98,85 C80,81 40,81 22,85Z",
                  folds="M24,96 C40,99 80,99 98,95"))
    o.append(V(ell(101, 89, 2.4, 8, WOOD_L, 1.1)))
    o.append(V(P("M21,77 L8,82 C3,86 3,93 8,97 L21,101Z", STEEL, 1.3)))
    o.append(clipped("M21,77 L8,82 C3,86 3,93 8,97 L21,101Z", SH("M12,92 L21,94 L21,101 L8,97Z", "#2a3036", .5)))
    o.append(spec(11, 84, 3.4, 1.2, .85, -15))
    o.append(V(P("M19,76 L24,76 L24,102 L19,102Z", DSTEEL, 1.1)))
    o.append(rivet(21.5, 80, .7, "steel") + rivet(21.5, 89, .7, "steel") + rivet(21.5, 98, .7, "steel"))
    # posts carrying the shed
    o.append(beam("M31,104 L32,70 M56,104 L56,70 M80,104 L80,70", 4.6))
    # wicker shed roof (arched), hide skirt along the bottom
    roof = "M23,71 C23,52 47,45 60,45 C73,45 99,52 99,71 L99,77 L23,77Z"
    o.append(part(roof, WOOD_L, lit="M28,66 C30,54 46,49 60,49 C52,52 40,56 32,68Z"))
    wick = ""
    for k in range(6):
        y = 50 + k * 4.2
        wick += f"M24,{n(y + 14)} C30,{n(y)} 90,{n(y)} 98,{n(y + 14)} "
    o.append(clipped(roof, L(wick, "#7a5230", 1.1, .75), L(wick, "#f0d8a8", .5, .6).replace('d="', 'transform="translate(0,-1)" d="'),
                     L("M36,50 L33,77 M48,46 L46,77 M60,45 L60,77 M72,46 L74,77 M85,50 L88,77", "#5a3a18", 1.4, .8),
                     SH("M70,48 Q96,52 98,72 L84,72 Q84,56 70,52Z", "#2a1406", .4)))
    o.append(V(P("M23,70 L99,70 L99,79 L23,79Z", LEA, 1.2)))
    o.append(f'<path d="M25,72.4 L97,72.4 M25,76.6 L97,76.6" fill="none" stroke="#e8c48c" stroke-width=".6" stroke-dasharray="1.4 1.6" stroke-opacity=".7"/>')
    for x in (32, 56, 80):
        o.append(iron_band(x, 74.6, 4.4, 9))
    o += wheel(40, 114, 11)
    o += wheel(94, 114, 11)
    o.append("</g>")
    o += crewman(88, 81, .76, GREEN, CHK, BLOND, None, "check")
    return o


# ---------------------------------------------------------------- 8 Trebuchet

def trebuchet() -> list[str]:
    o = [shadow(60, 54)]
    o.append(beam("M18,114 L98,114", 5.6))
    o.append(beam("M42,112 L59,44", 4.8, WOOD_D, False))
    o.append(beam("M30,112 L58,68", 3.6, WOOD_D, False))
    o.append(beam("M82,112 L65,44", 5.2))
    o.append(beam("M46,88 L78,88", 4.2))
    o.append(iron_band(62, 45, 8, 5))
    # long arm: long end up-left, short end down-right with the counterweight
    o.append(beam("M88,68 L62,46 L14,9", 5.4))
    o.append(V(circ(62, 46, 3.6, g("steelr"), 1)))
    o.append(L("M85,69 L89,79 M90,66 L94,79", OUT, 2.4, .75) + L("M85,69 L89,79 M90,66 L94,79", STEEL_D, 1.3, 1))
    cw = "M78,78 L104,78 L106,97 L76,97Z"
    o.append(part(cw, WOOD, "grain", lit="M79,79 L92,79 L90,85 L79,85Z"))
    o.append(L("M78,84 L105,84 M77,91 L105,91", STEEL_D, 1.6, .9))
    for x in (80, 90, 101):
        o.append(rivet(x, 84, .6, "steel") + rivet(x, 91, .6, "steel"))
    # sling with a stone
    o.append(L("M14,10 C10,20 8,30 10,40 M14,10 C16,20 18,30 16,42", OUT, 2.4, .75) + L("M14,10 C10,20 8,30 10,40 M14,10 C16,20 18,30 16,42", ROPE, 1.3, 1))
    o.append(V(P("M5,38 C4,49 21,49 21,38 Z", LEA_D, 1.1)))
    o.append(V(circ(13, 37.6, 5.4, STONE, 1.2)))
    o.append(spec(11, 35.4, 1.8, 1.1, .55))
    # stone pile
    for x, y, r in ((28, 111, 6), (39, 110, 5), (33, 103, 5)):
        o.append(V(circ(x, y, r, STONE, 1.2)) + spec(x - r * .35, y - r * .4, r * .3, r * .2, .5))
    # crew: hauling the trigger rope (right), loading a stone (left)
    o.append(L("M90,72 L108,93", OUT, 2.2, .75) + L("M90,72 L108,93", ROPE, 1.2, 1))
    o.append(check_tube("M109,100 L113,111 L114,122", 7))
    o += boot(115, 125, -1, LEA, 9)
    o.append(check_tube("M104,100 L103,111 L104,122", 7))
    o += boot(104, 125, -1, LEA, 9)
    o.append(part("M100,80 L111,80 L113,102 L100,102Z", GREEN, folds="M105,84 Q105,94 106,100", fold_col="#0e2008"))
    o.append(tube("M102,82 L104,90 L108,93", SKIN, 5.6))
    o += fist(108, 93.4, 2.8, 230)
    o += face(106, 73, rx=6, ry=6.8, grim=True)
    o += hair_cap(106, 73, BROWN, 6.8)
    o.append(f'<g transform="translate(106,73) scale(.72) translate(-106,-73)">')
    o += droop_moustache(106, 73, BROWN)
    o.append("</g>")
    o.append(check_tube("M6,100 L3,111 L4,122", 7))
    o += boot(4, 125, -1, LEA, 9)
    o.append(check_tube("M11,100 L13,111 L12,122", 7))
    o += boot(12, 125, -1, LEA, 9)
    o.append(part("M1,78 L13,78 L15,102 L1,102Z", GREEN, folds="M6,82 Q5,92 6,100", fold_col="#0e2008"))
    o.append(V(circ(6, 95, 6.4, STONE, 1.2)))
    o.append(spec(3.6, 92.6, 2, 1.2, .55))
    o.append(tube("M11,82 L13,92 L10,97", SKIN, 5.6))
    o += fist(10, 97, 2.8)
    o += face(8, 71, rx=6, ry=6.8, grim=True)
    o += hair_cap(8, 71, BLOND, 6.8)
    o.append(f'<g transform="translate(8,71) scale(.72) translate(-8,-71)">')
    o += droop_moustache(8, 71, BLOND)
    o.append("</g>")
    return o


# ---------------------------------------------------------------- 9 Chieftain

def chieftain() -> list[str]:
    o = [shadow(62, 40)]
    o += spear(26, 124, 26, 22, 16, 3.4, WOOD, 3)
    cl = "M44,47 C48,41 76,41 82,47 L104,99 C98,105 90,107 84,103 L80,112 L48,112Z"
    o.append(part(cl, GREEN, lit="M80,52 Q92,74 100,96 L96,98 Q88,76 78,56Z",
                  folds="M52,56 C54,80 52,96 50,110 M64,60 Q66,84 66,110 M86,62 Q92,82 96,100", fold_col="#0e2008"))
    o.append(check_tube("M52,84 L44,102 L42,118", 11.5))
    o += boot(42, 125, -1, LEA, 13)
    o.append(check_tube("M68,84 L78,102 L82,118", 11.5))
    o += boot(82, 125, -1, LEA, 13)
    tun = "M46,45 C52,39 68,39 74,45 L78,72 L76,91 Q61,94 46,91 L42,72Z"
    o.append(part(tun, CREAM, lit="M48,48 L56,45 L52,76 L46,72Z", folds="M66,48 Q68,66 68,80 M50,82 Q50,88 52,91", fold_col="#5a4a30"))
    o.append(clipped(tun, S("M40,82 L80,82 L80,96 L40,96Z", CHK), texture("check", (40, 82, 80, 96)), L("M40,82.6 L80,82.6", GOLD, 1.2, .95)))
    o += belt(43, 76, 79, 75, 4.6, GOLD)
    # far arm holding the spear
    o.append(tube("M46,49 L36,61 L29,65", SKIN, 9.5))
    o += fist(27, 65, 4, 180)
    # near arm raised, open palm
    o.append(tube("M74,49 L90,42 L92,27", SKIN, 9.5))
    o.append(V(P("M84.4,40.6 L92.6,38.6 L93.6,44.6 L85.4,46.6Z", GOLD, 1)))
    o += open_hand(94, 22, 1.25, up=True)
    o.append(V(circ(50, 49, 3.4, g("goldr"), 1)))
    o.append(spec(49, 48, .9, .7, .9))
    o += long_hair(58, 30, BLOND, 20)
    o.append(tube("M58,37 L59,44", SKIN, 8))
    o += face(58, 30, brow="#8a6420")
    o += droop_moustache(58, 30, BLOND)
    o += torc(58, 44, 7.5)
    # oak-leaf crown on a gold band
    o += hair_cap(58, 30, BLOND)
    o.append(V(P("M48,24 C50,19 66,19 68,24 L68,27 C58,24 48,27 48,27Z", GOLD, 1)))
    for x, y, a in ((50, 20, -1), (56, 17, -1), (62, 17, 1), (68, 20, 1)):
        o.append(V(P(f"M{x},{y+4} C{x-3*a},{y} {x-2*a},{y-6} {x+2*a},{y-5} C{x+5*a},{y-3} {x+3*a},{y+3} {x},{y+4}Z", OAK, 1)))
        o.append(L(f"M{x},{y+3} L{x+a},{y-3}", "#b8e090", .5, .7))
    o.append(V(circ(58, 22.6, 1.8, g("goldr"), .8)))
    return o


# ---------------------------------------------------------------- 10 Settler

def settler() -> list[str]:
    o = [shadow(62, 54)]
    o += ox(62, 58, .98)
    pack = "M78,66 C80,54 96,52 108,58 L112,72 L76,76Z"
    o.append(part(pack, SACK, lit="M80,64 Q84,56 94,55 Q86,60 84,68Z", folds="M88,58 L90,74 M100,56 L102,72"))
    o.append(L("M74,72 L114,70", OUT, 3.4, .75) + L("M74,72 L114,70", LEA_D, 2.2, 1))
    # woman walking with a basket
    o.append(part("M12,64 C14,60 26,60 28,64 L34,120 L6,120Z", CHK, "check", lit="M14,66 L18,64 L12,112 L8,112Z"))
    o.append(part("M14,66 L26,66 L28,80 L12,80Z", CREAM, folds="M20,67 L20,80", fold_col="#5a4a30"))
    o.append(V(P("M8,118 L34,118 L34,122 L8,122Z", LEA_D, 1)))
    o.append(tube("M26,66 L33,77 L30,87", SKIN, 6))
    bk = "M23,88 L41,88 L39,101 L25,101Z"
    o.append(part(bk, SACK, folds="M26,92 L38,92 M26,96 L38,96 M29,88 L29,101 M33,88 L33,101 M37,88 L36,101", fold_col="#5a3a18"))
    o.append(L("M25,88 C27,80 37,80 39,88", OUT, 2.6, .75) + L("M25,88 C27,80 37,80 39,88", WOOD, 1.6, 1))
    o += fist(31, 88, 2.8, 270)
    o += long_hair(20, 52, BROWN, 14, 8.5)
    o.append(tube("M20,58 L20,62", SKIN, 6))
    o += face(20, 52, rx=7.5, ry=8.5)
    o += hair_cap(20, 52, BROWN, 8.5)
    # man (front) with a staff and a bundle on a pole
    o.append(check_tube("M42,84 L31,100 L26,118", 9.5))
    o += boot(26, 124, -1, LEA, 12)
    o.append(check_tube("M54,84 L60,102 L58,120", 9.5))
    o += boot(58, 125, -1, LEA, 12)
    o.append(part("M37,51 C41,45 56,45 61,51 L65,72 L61,90 L37,90 L33,72Z", GREEN,
                  lit="M39,53 L46,50 L43,78 L38,76Z", folds="M43,56 Q41,74 43,88 M56,56 Q59,72 58,88", fold_col="#0e2008"))
    o += belt(35, 81, 63, 81, 3.8, BRONZE)
    o.append(tube("M40,55 L31,66 L29,77", SKIN, 7))
    o += shaft(30, 124, 30, 58, 2.8)
    o += fist(29, 77, 3.2, 180)
    o.append(tube("M58,55 L70,59 L66,49", SKIN, 7))
    o += shaft(62, 57, 77.6, 25.8, 2.6)
    bun = "M73,26 C68,30 68,40 76,42 C84,44 90,38 88,31 C87,26 82,25 78,27 Z"
    o.append(part(bun, SACK, lit="M71,32 Q72,28 76,28 Q73,32 73,38Z", folds="M76,30 C78,34 78,38 77,41 M83,29 C85,33 85,37 83,41", fold_col="#5a3a18"))
    o.append(V(P("M73,26 L71,21 L75,24 L78,20 L78,27Z", SACK, 1)))
    o.append(L("M72,27 Q76,29 79,27", LEA_D, 1.4, 1))
    o += fist(66, 49, 3.2, 300)
    o.append(tube("M47,45 L47,50", SKIN, 7))
    o += face(46, 38, rx=8, ry=9)
    o += hair_cap(46, 38, GINGER, 9)
    o += droop_moustache(46, 38, GINGER)
    return o


UNITS = {1: phalanx, 2: swordsman, 3: pathfinder, 4: thunder, 5: druidrider, 6: haeduan, 7: ram, 8: trebuchet,
         9: chieftain, 10: settler}


def build(num: int) -> str:
    begin(f"gau{num}-")
    return svg(UNITS[num]())


def write_all(only=None, out=None):
    big = out or os.path.join(ROOT, "big")
    for num in UNITS:
        if only and num not in only:
            continue
        s = build(num)
        with open(os.path.join(big, f"gauls-{num}.svg"), "w") as fh:
            fh.write(s)
        print(f"gauls-{num}.svg: {len(s)} bytes")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    ap.add_argument("only", nargs="*", type=int)
    a = ap.parse_args()
    write_all(a.only, a.out)
