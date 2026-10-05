"""Generates src/web/public/img/units/big/gauls-N.svg and the 16px icons gauls-N.svg.

Run:  python3 scripts/art/gauls.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from figlib import (OUT, svg, icon, tube, head, hand, boot, poly, path, ellipse, circle,
                    stroke_line, horse, M, f, ishoulders, ihead, ihorsehead, tube_checks, grid, oval_shield,
                    SKIN, SKIN_SH, SKIN_HI, IRON, IRON_SH, IRON_HI, LEATH, LEATH_SH, LEATH_HI, BLOND, BLOND_SH,
                    RED, RED_SH, GREY, GREY_SH, WOOD, WOOD_SH, WOOD_HI, WHITE, WHITE_SH,
                    arm, leg, rings, spear, sword, round_shield, belt, crewman)

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "web", "public", "img", "units")

GREEN, GREEN_SH, GREEN_HI = "#4f8a3a", "#2f5a22", "#6ea851"
GBLUE, GBLUE_SH, GBLUE_HI = "#3b6fb4", "#27508a", "#5a8fd0"
BRONZE, BRONZE_SH, BRONZE_HI = "#c48a3a", "#8a5e22", "#e2b060"
CREAM, CREAM_SH = "#e8e2d0", "#b8b09c"
BROWN, BROWN_SH = "#6b4423", "#4a2d14"
CHECK = "#8fb6e0"  # light check lines on blue cloth
OAK = "#3f7a2c"


def bronze_helm(cx, cy, r=10, crest=False):
    """Round Montefortino-style bronze cap with a knob and a small neck guard."""
    s = path(f"M{f(cx-r)},{f(cy-1)} C{f(cx-r)},{f(cy-r*1.4)} {f(cx+r)},{f(cy-r*1.4)} {f(cx+r)},{f(cy-1)} "
             f"Q{f(cx)},{f(cy-5)} {f(cx-r)},{f(cy-1)} Z", BRONZE)
    s += path(f"M{f(cx-r-1)},{f(cy-1)} Q{f(cx)},{f(cy-5.5)} {f(cx+r+1)},{f(cy-1)} L{f(cx+r+2)},{f(cy+3)} Q{f(cx+r)},{f(cy+1)} {f(cx+r-1)},{f(cy+2)} "
              f"L{f(cx+r-2)},{f(cy)} Q{f(cx)},{f(cy-2)} {f(cx-r-1)},{f(cy+2)} Z", BRONZE_SH, sw=1)
    s += circle(cx, cy - r * 1.3, 2.4, BRONZE_HI, sw=1)
    s += stroke_line([(cx - r * 0.45, cy - r * 0.95), (cx - r * 0.75, cy - r * 0.35)], BRONZE_HI, 1.8)
    if crest:
        s += path(f"M{f(cx-3)},{f(cy-r*1.3)} C{f(cx-6)},{f(cy-r*2.1)} {f(cx+8)},{f(cy-r*2.2)} {f(cx+10)},{f(cy-r*1.1)} "
                  f"C{f(cx+6)},{f(cy-r*1.6)} {f(cx+1)},{f(cy-r*1.6)} {f(cx+2)},{f(cy-r*1.2)} Z", RED)
    return s


def torc(cx, cy, r=7):
    return path(f"M{f(cx-r)},{f(cy)} A{f(r)},{f(r*0.55)} 0 0 0 {f(cx+r)},{f(cy)}", stroke=BRONZE_HI, sw=2.6) + \
        path(f"M{f(cx-r)},{f(cy)} A{f(r)},{f(r*0.55)} 0 0 0 {f(cx+r)},{f(cy)}", stroke=OUT, sw=0.8) + \
        circle(cx - r, cy, 1.5, BRONZE_HI, sw=0.8) + circle(cx + r, cy, 1.5, BRONZE_HI, sw=0.8)


def mistletoe(x, y):
    s = ""
    for dx, dy, a in ((-6, -2, -1), (6, -3, 1), (-4, 5, -1), (5, 4, 1)):
        s += path(f"M{f(x)},{f(y)} C{f(x+dx*0.5)},{f(y+dy-3*a)} {f(x+dx)},{f(y+dy-2)} {f(x+dx*1.3)},{f(y+dy)} "
                  f"C{f(x+dx)},{f(y+dy+2)} {f(x+dx*0.5)},{f(y+dy+2)} {f(x)},{f(y)} Z", OAK, sw=1)
    s += circle(x - 1.5, y + 1, 2, WHITE, sw=0.9) + circle(x + 2.5, y - 1, 2, WHITE, sw=0.9) + circle(x + 0.5, y + 3.5, 1.8, WHITE, sw=0.9)
    return s


def cloak(pts_d, col, sh_pts=None, sh=None):
    s = path(pts_d, col)
    if sh_pts:
        s += stroke_line(sh_pts, sh, 2.4)
    return s


# ====================================================================== units

def phalanx():
    e = []
    hb, hf = head(60, 30, 9.5, SKIN, SKIN_SH, BROWN, BROWN_SH, style="long", mustache=BROWN)
    # legs: far forward bent, near back braced (blue check trousers)
    e.append(leg((56, 80), (40, 96), (38, 118), GBLUE, GBLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(tube_checks([(56, 80), (40, 96), (38, 118)], [10.5, 8.5, 7.5], CHECK))
    e.append(boot(38, 125, LEATH, LEATH_SH))
    e.append(leg((68, 80), (84, 98), (92, 116), GBLUE, GBLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(tube_checks([(68, 80), (84, 98), (92, 116)], [10.5, 8.5, 7.5], CHECK))
    e.append(boot(90, 123, LEATH, LEATH_SH))
    # tunic (green, leaning forward)
    e.append(path("M46,44 C52,38 68,38 74,44 L78,70 L76,84 L46,84 L44,70 Z", GREEN))
    e.append(stroke_line([(50, 48), (48, 66), (50, 82)], GREEN_SH, 2))
    e.append(stroke_line([(72, 48), (74, 66), (72, 82)], GREEN_SH, 2))
    e.append(belt(45, 78, 77, LEATH_SH, BRONZE))
    # near arm: overhand spear
    e.append(arm((74, 48), (90, 62), (82, 84), SKIN, SKIN_SH))
    e.append(spear((110, 104), (12, 28), tip=IRON, tiplen=16, tipw=6))
    e.append(hand(82, 84, SKIN, 3.5, SKIN_SH))
    e.append(path("M84,56 L92,54 L93,60 L85,62 Z", BRONZE, sw=1))  # arm ring
    # far arm + big oval shield
    e.append(arm((48, 48), (36, 60), (34, 70), SKIN, SKIN_SH))
    e.append(oval_shield(36, 70, 15, 25, GREEN, LEATH_SH, BRONZE, sh=GREEN_SH))
    e.append(hb + hf)
    e.append(torc(60, 43, 7))
    e.append(bronze_helm(60, 25, 10))
    return svg(e)


def swordsman():
    e = []
    hb, hf = head(56, 28, 10, SKIN, SKIN_SH, BLOND, BLOND_SH, style="long", mustache=BLOND)
    # far arm back with small shield
    e.append(arm((46, 46), (30, 44), (22, 54), SKIN, SKIN_SH))
    e.append(round_shield(22, 56, 10, GBLUE, LEATH_SH, BRONZE, sh=GBLUE_SH))
    # legs: big step forward
    e.append(leg((54, 80), (36, 92), (28, 116), GBLUE, GBLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(tube_checks([(54, 80), (36, 92), (28, 116)], [10.5, 8.5, 7.5], CHECK))
    e.append(boot(28, 123, LEATH, LEATH_SH))
    e.append(leg((68, 80), (82, 100), (92, 116), GBLUE, GBLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(tube_checks([(68, 80), (82, 100), (92, 116)], [10.5, 8.5, 7.5], CHECK))
    e.append(boot(90, 123, LEATH, LEATH_SH))
    # tunic twisted into the swing
    e.append(path("M44,44 C50,36 70,36 76,44 L80,68 L74,86 L48,86 L42,66 Z", GREEN))
    e.append(path("M46,50 L52,54 L50,84", stroke=GREEN_SH, sw=2))
    e.append(path("M70,46 C74,58 76,70 72,84", stroke=GREEN_HI, sw=2))
    e.append(belt(44, 80, 76, LEATH_SH, BRONZE))
    # near arm swinging the longsword across (down-left)
    e.append(arm((74, 46), (90, 42), (88, 26), SKIN, SKIN_SH))
    e.append(path("M84,40 L92,38 L93,44 L85,46 Z", BRONZE, sw=1))  # arm ring
    e.append(sword(88, 24, -0.8, length=36, col=IRON, hilt=BRONZE, bw=6))
    e.append(hand(88, 26, SKIN, 3.5, SKIN_SH))
    # motion arc of the cut coming down
    e.append(path("M108,12 C116,30 112,50 100,62", stroke=GREY, sw=1.2, extra=' stroke-dasharray="3 3" stroke-opacity=".6"'))
    e.append(hb + hf)
    e.append(torc(56, 42, 7))
    return svg(e)


def pathfinder():
    e = []
    h = horse(4, 22, "#c8a060", "#9a7438", "#e0c080", mane="#6b4423", pose="trot", scale=0.86)
    e.append(h["far"] + h["body"])
    # cloak streaming to the right behind the rider
    e.append(path("M52,44 C70,40 92,44 104,60 C106,70 100,78 96,82 L84,72 C80,66 70,62 56,62 Z", GREEN))
    e.append(path("M62,50 C76,48 90,54 96,66", stroke=GREEN_SH, sw=2))
    # saddle blanket
    e.append(path("M44,66 L72,64 L74,80 L46,82 Z", GBLUE))
    e.append(grid(46, 66, 72, 80, CHECK, 7))
    e.append(h["near"])
    # near leg
    e.append(leg((60, 66), (48, 82), (46, 98), GBLUE, GBLUE_SH, w=(9, 7.5, 6.5)))
    e.append(tube_checks([(60, 66), (48, 82), (46, 98)], [9, 7.5, 6.5], CHECK))
    e.append(boot(44, 104, LEATH, LEATH_SH, w=10))
    # torso (light leather vest), twisted to look back
    e.append(path("M50,38 C56,34 70,34 74,40 L76,56 L72,70 L54,70 L48,54 Z", LEATH))
    e.append(stroke_line([(54, 42), (52, 56), (54, 68)], LEATH_SH, 2))
    e.append(belt(50, 66, 74, LEATH_SH, BRONZE, h=3.5))
    # far arm forward holding the reins
    e.append(arm((52, 42), (40, 50), (34, 56), SKIN, SKIN_SH, w=(7, 6, 5)))
    e.append(hand(33, 57, SKIN, 3))
    e.append(stroke_line([(31, 56), (20, 50)], LEATH_SH, 1.2))
    # near arm back, hand resting on the pony's croup as he twists round
    e.append(arm((72, 42), (84, 54), (92, 66), SKIN, SKIN_SH, w=(7, 6, 5)))
    e.append(hand(93, 68, SKIN, 3))
    # head turned back (facing right)
    hb, hf = head(64, 24, 8.5, SKIN, SKIN_SH, BROWN, BROWN_SH, style="long", look=1, mustache=BROWN)
    e.append(hb + hf)
    e.append(path("M55,22 C56,14 72,14 73,22 Q64,19 55,22 Z", BROWN, sw=1))
    e.append(torc(64, 36, 6))
    e.append(h["head"])
    # short spear slung along the pony's side
    e.append(spear((96, 92), (40, 108), tiplen=10, tipw=4, w=2))
    return svg(e, shadow=(62, 128, 44, 6))


def thunder():
    e = []
    h = horse(1, 14, "#ece8dd", "#b8b2a4", "#fbfaf6", mane="#c9c2b2", pose="gallop", scale=0.93)
    e.append(h["far"])
    # cloak streaming straight back (fast!)
    e.append(path("M60,40 C76,30 100,32 118,44 C112,52 106,60 102,70 C96,60 82,54 64,56 Z", GBLUE))
    e.append(path("M70,44 C86,40 102,44 110,50", stroke=GBLUE_SH, sw=2.2))
    e.append(h["body"])
    e.append(path("M48,58 L76,56 L80,76 L52,78 Z", GREEN))  # saddle cloth
    e.append(h["near"])
    # near leg tucked back
    e.append(leg((62, 60), (54, 78), (58, 94), GBLUE, GBLUE_SH, w=(9, 7.5, 6.5)))
    e.append(tube_checks([(62, 60), (54, 78), (58, 94)], [9, 7.5, 6.5], CHECK))
    e.append(boot(56, 100, LEATH, LEATH_SH, w=10))
    # torso leaning far forward over the neck
    e.append(path("M44,36 C50,28 64,26 70,30 L76,46 L70,62 L52,64 L44,50 Z", GREEN))
    e.append(stroke_line([(48, 40), (48, 56)], GREEN_SH, 2))
    e.append(belt(50, 60, 72, LEATH_SH, BRONZE, h=3.5))
    # far arm gripping the mane
    e.append(arm((48, 36), (36, 42), (34, 50), SKIN, SKIN_SH, w=(7, 6, 5)))
    e.append(hand(34, 52, SKIN, 3))
    # near arm cocked back, javelin about to be thrown
    e.append(arm((68, 34), (82, 28), (84, 14), SKIN, SKIN_SH, w=(7, 6, 5)))
    e.append(spear((112, 6), (30, 20), tiplen=12, tipw=4.5, w=2.2))
    e.append(hand(84, 15, SKIN, 3.1))
    # head low, looking ahead
    hb, hf = head(50, 20, 8.5, SKIN, SKIN_SH, RED, RED_SH, style="long", mustache=RED)
    e.append(hb + hf)
    e.append(bronze_helm(50, 16, 9))
    e.append(h["head"])
    e.append(stroke_line([(32, 50), (16, 46)], LEATH_SH, 1.2))  # rein
    return svg(e, shadow=(60, 128, 48, 6))


def druidrider():
    e = []
    h = horse(2, 16, "#8a5a2b", "#5a3a1a", "#a8783f", mane="#3a2a14", pose="stand", scale=0.9)
    e.append(h["far"] + h["body"])
    e.append(path("M46,62 L74,60 L78,84 L50,86 Z", GREEN))  # saddle cloth
    e.append(path("M52,82 L76,80", stroke=GREEN_HI, sw=1.6))
    e.append(h["near"])
    # robe (long, draping over the near side of the horse)
    e.append(path("M50,36 C56,30 70,30 76,36 L80,68 C82,80 80,92 76,100 L56,100 C54,88 52,76 50,68 Z", CREAM))
    e.append(path("M55,42 C53,60 55,80 57,98", stroke=CREAM_SH, sw=2.4))
    e.append(path("M76,46 C79,64 79,84 76,98", stroke=CREAM_SH, sw=2))
    e.append(path("M51,70 L80,68", stroke=BRONZE, sw=2.6))  # rope belt
    # far arm: reins
    e.append(arm((50, 40), (40, 50), (36, 58), CREAM, CREAM_SH, w=(8, 7, 6)))
    e.append(hand(35, 60, SKIN, 3.1))
    # near arm raising the staff
    e.append(arm((74, 40), (90, 46), (88, 34), CREAM, CREAM_SH, w=(8, 7, 6)))
    e.append(tube([(88, 112), (88, 10)], 3, WOOD, cap=False))
    e.append(path("M86,30 C84,22 90,20 90,26", stroke=WOOD_HI, sw=1.2))
    e.append(hand(88, 36, SKIN, 3.2))
    e.append(mistletoe(90, 12))
    # hood (behind the face), then the bearded face, then the hood's front rim
    e.append(path("M50,38 C46,20 54,8 64,8 C76,8 80,22 76,40 L70,42 L56,42 Z", CREAM))
    hb, hf = head(62, 26, 8.5, SKIN, SKIN_SH, None, beard=GREY, style="none")
    e.append(hb + hf)
    e.append(path("M53,30 C52,18 58,13 64,13 C70,13 74,20 72,32 C70,24 66,20 62,20 C58,20 55,24 53,30 Z", CREAM))
    e.append(path("M55,22 C58,15 68,14 71,20", stroke=CREAM_SH, sw=1.6))
    e.append(h["head"])
    e.append(stroke_line([(34, 58), (18, 50)], LEATH_SH, 1.2))
    return svg(e, shadow=(62, 128, 44, 6))


def haeduan():
    e = []
    h = horse(1, 12, "#9a4a2a", "#6a2e18", "#b86a44", mane="#2a1a0c", pose="canter", scale=0.93)
    e.append(h["far"])
    e.append(path("M58,40 C78,34 100,40 112,56 C110,66 104,74 100,80 L86,70 C82,62 72,58 60,58 Z", GREEN))
    e.append(path("M70,46 C86,44 100,50 106,60", stroke=GREEN_SH, sw=2.2))
    e.append(h["body"])
    e.append(path("M46,60 L78,58 L82,82 L50,84 Z", GBLUE))
    e.append(grid(48, 61, 80, 82, CHECK, 8))
    e.append(h["near"])
    # near leg in mail chausses
    e.append(leg((64, 64), (50, 82), (50, 100), IRON, IRON_SH, w=(10, 8.5, 7.5)))
    e.append(boot(48, 106, LEATH, LEATH_SH))
    # far arm with the shield (shield rim peeks in front of the neck)
    e.append(arm((56, 38), (44, 48), (38, 56), IRON, IRON_SH))
    # torso: mail with bronze pectoral
    e.append(path("M52,34 C58,30 70,30 76,34 L80,54 L76,70 L56,70 L52,54 Z", IRON))
    e.append(rings(53, 38, 78, 68, 8))
    e.append(path("M58,38 L72,38 L74,50 L56,50 Z", BRONZE, sw=1))
    e.append(belt(54, 66, 78, LEATH_SH, BRONZE))
    # near arm: lance forward
    e.append(arm((74, 38), (84, 50), (66, 56), IRON, IRON_SH))
    e.append(spear((106, 76), (8, 30), tip=IRON, w=3, tiplen=15, tipw=5.5))
    e.append(hand(66, 56, SKIN, 3.4, SKIN_SH))
    hb, hf = head(62, 22, 9, SKIN, SKIN_SH, BROWN, BROWN_SH, mustache=BROWN)
    e.append(hb + hf)
    e.append(bronze_helm(62, 18, 9.5, crest=True))
    e.append(h["head"])
    e.append(round_shield(36, 60, 16, GREEN, LEATH_SH, BRONZE, sh=GREEN_SH))
    e.append(circle(36, 60, 16, "none", stroke=BRONZE, sw=1.2))
    return svg(e, shadow=(62, 128, 46, 6))


def ram():
    e = []
    e.append(circle(34, 110, 9, WOOD_SH) + circle(88, 110, 9, WOOD_SH))
    e.append(path("M8,104 L106,104 L108,110 L6,110 Z", WOOD))
    e.append(stroke_line([(10, 107), (104, 107)], WOOD_SH, 1.6))
    # far crew inside the shed
    e.append(crewman(64, 100, 0.68, GREEN, GREEN_SH, BROWN, lean=0.25, trousers=GBLUE))
    # log with iron head
    e.append(path("M18,80 C22,76 92,76 100,82 C102,88 102,92 100,96 C92,100 22,100 18,96 Z", WOOD))
    e.append(path("M24,84 C40,80 80,80 96,84", stroke=WOOD_HI, sw=2))
    e.append(path("M24,94 C40,98 80,98 96,94", stroke=WOOD_SH, sw=2.4))
    e.append(path("M20,78 L8,82 C4,86 4,92 8,96 L20,98 Z", IRON))
    e.append(path("M18,78 L22,78 L22,98 L18,98 Z", IRON_SH, sw=1))
    e.append(stroke_line([(10, 84), (12, 94)], IRON_HI, 1.6))
    # wicker/leather shed: arched roof with open sides on posts
    for px in (30, 54, 78):
        e.append(path(f"M{px},104 L{px+1},70 L{px+5},70 L{px+4},104 Z", WOOD))
    e.append(path("M24,70 C24,52 48,46 60,46 C72,46 98,52 98,70 L98,78 L24,78 Z", "#a06a3a"))
    e.append(path("M28,68 C30,56 46,51 60,51 C74,51 92,56 94,68", stroke="#7a4c24", sw=1.4))
    e.append(path("M28,74 L94,74 M40,50 L36,76 M52,47 L50,76 M68,47 L70,76 M82,50 L86,76", stroke="#7a4c24", sw=1.2))
    e.append(path("M26,62 C40,58 80,58 96,62", stroke="#c48a5a", sw=1.2))
    e.append(path("M24,70 L98,70 L98,78 L24,78 Z", "#8c5a2e"))
    e.append(path("M30,74 L36,74 M44,74 L50,74 M58,74 L64,74 M72,74 L78,74 M86,74 L92,74", stroke="#c48a5a", sw=1.4))
    # near wheels
    for wx in (38, 92):
        e.append(circle(wx, 114, 11, WOOD))
        e.append(circle(wx, 114, 11, "none", stroke=WOOD_SH, sw=2.4) + circle(wx, 114, 11, "none"))
        e.append(path(f"M{wx-9},114 L{wx+9},114 M{wx},105 L{wx},123 M{wx-6.4},107.6 L{wx+6.4},120.4 M{wx+6.4},107.6 L{wx-6.4},120.4", stroke=WOOD_SH, sw=1.6))
        e.append(circle(wx, 114, 2.4, IRON, sw=1))
    # near pusher
    e.append(crewman(106, 122, 0.78, GREEN, GREEN_SH, BLOND, lean=0.3, trousers=GBLUE, beard=None))
    return svg(e, shadow=(60, 126, 52, 6))


def trebuchet():
    e = []
    # base and uprights (tall A-frame)
    e.append(path("M18,112 L96,112 L98,118 L16,118 Z", WOOD))
    e.append(stroke_line([(20, 115), (94, 115)], WOOD_SH, 1.6))
    e.append(path("M40,112 L58,42 L64,42 L50,112 Z", WOOD_SH, sw=1.1))
    e.append(path("M84,112 L66,42 L60,42 L74,112 Z", WOOD))
    e.append(path("M46,86 L78,86 L80,90 L44,90 Z", WOOD))
    e.append(path("M28,112 L58,66 L62,70 L36,112 Z", WOOD_SH, sw=1.1))  # brace
    e.append(path("M58,44 L66,44 L66,52 L58,52 Z", WOOD_SH, sw=1))
    # the arm: long end up-left, short end with counterweight down-right
    e.append(tube([(86, 68), (62, 46), (14, 8)], [7, 6.5, 4.5], WOOD, WOOD_SH, side=1))
    e.append(circle(62, 46, 3.4, IRON, sw=1))
    # counterweight box hanging from the short end
    e.append(path("M84,68 L90,78", stroke=WOOD_SH, sw=1.8))
    e.append(path("M78,78 L102,78 L104,96 L76,96 Z", WOOD))
    e.append(path("M80,84 L100,84 M80,90 L100,90", stroke=WOOD_SH, sw=1.2))
    e.append(path("M82,80 L84,94 M96,80 L98,94", stroke=WOOD_HI, sw=1))
    # sling with stone
    e.append(path("M14,10 C10,20 8,30 10,40", stroke="#d8c28a", sw=1.4))
    e.append(path("M14,10 C16,20 18,30 16,42", stroke="#d8c28a", sw=1.4))
    e.append(path("M6,38 C4,48 20,48 20,38 Z", LEATH_SH))
    e.append(circle(13, 38, 5, "#9a9588"))
    e.append(circle(11.5, 36.5, 1.8, "#c8c3b4", stroke="none"))
    # stone pile
    e.append(circle(28, 112, 6, "#9a9588") + circle(38, 110, 5, "#8a8578") + circle(32, 104, 5, "#a8a396"))
    e.append(circle(30, 102, 1.6, "#c8c3b4", stroke="none"))
    # crew: man hauling the trigger rope (right), man loading a stone (left)
    e.append(stroke_line([(84, 70), (108, 96)], "#d8c28a", 1.3))
    e.append(crewman(110, 124, 0.72, GREEN, GREEN_SH, BROWN, lean=-0.1, arms="none", trousers=GBLUE))
    e.append(arm((104, 94), (112, 96), (108, 92), GREEN, GREEN_SH, w=(4.5, 4, 3.5)))
    e.append(hand(107, 94, SKIN, 2.3))
    e.append(crewman(8, 124, 0.7, GREEN, GREEN_SH, BLOND, lean=0.05, arms="none", trousers=GBLUE))
    e.append(arm((6, 94), (-2, 102), (4, 106), GREEN, GREEN_SH, w=(4.5, 4, 3.5)))
    e.append(circle(6, 100, 6, "#9a9588"))
    e.append(hand(10, 103, SKIN, 2.3))
    return svg(e, shadow=(60, 126, 54, 6))


def chieftain():
    e = []
    hb, hf = head(58, 30, 10, SKIN, SKIN_SH, BLOND, BLOND_SH, style="long", mustache=BLOND)
    # spear upright in far hand
    e.append(spear((26, 124), (26, 4), tip=IRON, tiplen=16, tipw=6, w=3))
    # cloak (green, swept to the right)
    e.append(path("M44,48 C48,42 76,42 82,48 L104,100 C98,106 90,108 84,104 L80,112 L48,112 Z", GREEN))
    e.append(path("M52,56 C54,80 52,96 50,110", stroke=GREEN_SH, sw=2.2))
    e.append(path("M80,56 C88,76 96,92 100,102", stroke=GREEN_HI, sw=2))
    # legs: proud, apart
    e.append(leg((52, 84), (44, 102), (42, 118), GBLUE, GBLUE_SH, w=(11, 9, 7.5)))
    e.append(tube_checks([(52, 84), (44, 102), (42, 118)], [11, 9, 7.5], CHECK))
    e.append(boot(42, 125, LEATH, LEATH_SH))
    e.append(leg((68, 84), (78, 102), (82, 118), GBLUE, GBLUE_SH, w=(11, 9, 7.5)))
    e.append(tube_checks([(68, 84), (78, 102), (82, 118)], [11, 9, 7.5], CHECK))
    e.append(boot(82, 125, LEATH, LEATH_SH))
    # tunic (cream with blue hem) and bronze belt
    e.append(path("M46,46 C52,40 68,40 74,46 L78,72 L76,90 L46,90 L42,72 Z", CREAM))
    e.append(path("M44,80 L78,80 L76,90 L46,90 Z", GBLUE, sw=1))
    e.append(stroke_line([(50, 50), (48, 70)], CREAM_SH, 2))
    e.append(belt(43, 76, 79, LEATH_SH, BRONZE_HI))
    # far arm holding the spear
    e.append(arm((46, 50), (36, 62), (28, 66), SKIN, SKIN_SH))
    e.append(hand(27, 66, SKIN, 3.5, SKIN_SH))
    # near arm raised, open palm
    e.append(arm((74, 50), (90, 42), (92, 24), SKIN, SKIN_SH))
    e.append(path("M88,24 L90,14 L93,13 L94,22 L97,12 L100,13 L98,24 L102,16 L104,18 L101,28 L94,32 L88,30 Z", SKIN, sw=1.2))
    e.append(path("M84,42 L92,40 L93,46 L85,48 Z", BRONZE, sw=1))
    # brooch on the cloak
    e.append(circle(50, 50, 3.4, BRONZE_HI, sw=1))
    e.append(hb + hf)
    e.append(torc(58, 44, 7.5))
    # oak-leaf crown on a gold band
    e.append(path("M48,24 C50,19 66,19 68,24 L68,27 C58,24 48,27 48,27 Z", BRONZE_HI, sw=1))
    for x, y, a in ((50, 20, -1), (56, 17, -1), (62, 17, 1), (68, 20, 1)):
        e.append(path(f"M{x},{y+4} C{x-3*a},{y} {x-2*a},{y-6} {x+2*a},{y-5} C{x+5*a},{y-3} {x+3*a},{y+3} {x},{y+4} Z", OAK, sw=1))
    e.append(circle(58, 22, 1.8, BRONZE_HI, sw=0.8))
    return svg(e)


def ox(x0, y0, s=1.0):
    """Draught ox walking left: barrel body, humped shoulder, broad head with lyre horns."""
    def P(a, b):
        return (x0 + a * s, y0 + b * s)
    def D(d):  # scale a path string written in ox-local coords
        out = ""
        for tok in d.split(" "):
            if "," in tok:
                cmd = tok[0] if tok[0].isalpha() else ""
                x, y = tok[len(cmd):].split(",")
                px, py = P(float(x), float(y))
                out += f"{cmd}{f(px)},{f(py)} "
            else:
                out += tok + " "
        return out.strip()
    col, sh, hi = "#8a6a4a", "#5e4530", "#a8886a"
    e = []
    e.append(tube([P(14, 38), P(10, 52), P(6, 62)], [7 * s, 6 * s, 5 * s], sh))
    e.append(tube([P(46, 38), P(52, 52), P(56, 62)], [7 * s, 6 * s, 5 * s], sh))
    e.append(path(D("M8,22 C10,12 16,6 24,8 C36,6 48,8 56,18 C60,28 56,40 46,42 L14,42 C6,40 4,30 8,22 Z"), col))
    e.append(stroke_line([P(14, 40), P(46, 40)], sh, 3 * s))
    e.append(stroke_line([P(18, 12), P(44, 12)], hi, 2.5 * s))
    e.append(path(D("M54,20 C62,24 62,42 58,52"), stroke=sh, sw=2.5 * s))
    e.append(tube([P(18, 38), P(18, 52), P(16, 62)], [8 * s, 6.5 * s, 5 * s], col, sh))
    e.append(tube([P(42, 38), P(40, 52), P(44, 62)], [8 * s, 6.5 * s, 5 * s], col, sh))
    for lx in (16, 44, 6, 56):
        e.append(path(D(f"M{lx-3.5},62 L{lx+3.5},62 L{lx+3.5},66 L{lx-3.5},66 Z"), OUT, sw=1))
    # head (broad, profile) with muzzle, eye, ear and horns
    e.append(path(D("M12,18 C4,16 -4,22 -6,32 C-8,40 -2,44 6,42 C10,40 12,34 14,30 Z"), col))
    e.append(path(D("M-2,34 C-8,36 -8,44 -2,44 C4,44 6,40 4,36 Z"), "#c9b8a0", sw=1))
    e.append(circle(*P(1, 38), 1.2 * s, OUT, stroke="none"))
    e.append(circle(*P(4, 26), 1.7 * s, OUT, stroke="none"))
    e.append(path(D("M10,20 C14,18 18,20 16,24 C14,24 12,22 10,22 Z"), col, sw=1))  # ear
    e.append(path(D("M2,18 C-2,10 -8,6 -12,10 C-10,12 -6,14 -2,20 Z"), "#e8e2d0"))
    e.append(path(D("M10,16 C12,8 18,4 22,8 C20,10 16,12 12,18 Z"), "#e8e2d0"))
    return "".join(e)


def settler():
    e = []
    # ox behind, loaded with a bundle
    e.append(ox(62, 58, 0.98))
    e.append(path("M78,66 C80,54 96,52 108,58 L112,72 L76,76 Z", "#c4a26a"))
    e.append(path("M86,58 L88,74 M100,56 L102,72", stroke="#8c6a3a", sw=1.4))
    e.append(path("M74,72 L114,70", stroke=LEATH_SH, sw=2))
    # woman (far-left), walking with a basket
    hb2, hf2 = head(20, 52, 7.5, SKIN, SKIN_SH, BROWN, BROWN_SH, style="long")
    e.append(path("M12,64 C14,60 26,60 28,64 L34,120 L6,120 Z", GBLUE))
    e.append(grid(10, 66, 32, 118, CHECK, 8, skew=2))
    e.append(path("M14,66 L26,66 L28,80 L12,80 Z", CREAM, sw=1))
    e.append(path("M8,118 L34,118 L34,122 L8,122 Z", LEATH_SH, sw=1))
    e.append(arm((26, 66), (34, 76), (30, 88), SKIN, SKIN_SH, w=(5.5, 5, 4.5)))
    e.append(path("M24,88 L40,88 L38,100 L26,100 Z", "#c4a26a"))
    e.append(path("M27,92 L37,92 M27,96 L37,96", stroke="#8c6a3a", sw=1))
    e.append(path("M26,88 C28,80 36,80 38,88", stroke=LEATH_SH, sw=1.6))
    e.append(hand(31, 88, SKIN, 2.6))
    e.append(hb2 + hf2)
    e.append(path("M12,50 C13,42 27,42 28,50 Q20,47 12,50 Z", BROWN, sw=1))
    # man (front), walking with a staff and a bundle on a pole over his shoulder
    hb, hf = head(46, 38, 8.5, SKIN, SKIN_SH, RED, RED_SH, mustache=RED)
    e.append(leg((42, 84), (30, 100), (26, 118), GBLUE, GBLUE_SH, w=(9, 7.5, 6.5)))
    e.append(tube_checks([(42, 84), (30, 100), (26, 118)], [9, 7.5, 6.5], CHECK))
    e.append(boot(26, 124, LEATH, LEATH_SH, w=10))
    e.append(leg((54, 84), (60, 102), (58, 120), GBLUE, GBLUE_SH, w=(9, 7.5, 6.5)))
    e.append(tube_checks([(54, 84), (60, 102), (58, 120)], [9, 7.5, 6.5], CHECK))
    e.append(boot(58, 125, LEATH, LEATH_SH, w=10))
    e.append(path("M38,52 C42,46 56,46 60,52 L64,72 L60,88 L38,88 L34,72 Z", GREEN))
    e.append(stroke_line([(42, 56), (40, 74), (42, 86)], GREEN_SH, 1.8))
    e.append(belt(35, 82, 63, LEATH_SH, BRONZE, h=3.5))
    e.append(arm((40, 56), (30, 66), (28, 78), SKIN, SKIN_SH, w=(6.5, 6, 5)))
    e.append(tube([(30, 124), (30, 60)], 2.6, WOOD, cap=False))
    e.append(hand(29, 78, SKIN, 3))
    e.append(arm((58, 56), (70, 60), (66, 50), SKIN, SKIN_SH, w=(6.5, 6, 5)))
    e.append(tube([(50, 40), (76, 28)], 2.6, WOOD, cap=False))
    e.append(hand(66, 50, SKIN, 3))
    e.append(path("M70,22 C74,16 86,18 86,28 C86,36 74,38 70,32 Z", "#a85a38"))  # bundle
    e.append(path("M74,24 L72,34", stroke="#7e3e22", sw=1.4))
    e.append(hb + hf)
    e.append(path("M38,36 C39,28 53,28 54,36 Q46,33 38,36 Z", RED, sw=1))
    return svg(e, shadow=(60, 128, 54, 6))


UNITS = {1: phalanx, 2: swordsman, 3: pathfinder, 4: thunder, 5: druidrider, 6: haeduan, 7: ram, 8: trebuchet, 9: chieftain, 10: settler}


# ====================================================================== 16px icons

def i_phalanx():
    e = [tube([(13.5, 15.5), (3.5, 2)], 1.2, WOOD, cap=False, sw=0.5), poly([(2.6, 1), (4.8, 2.3), (3.2, 4.2)], IRON, sw=0.5),
         ishoulders(GREEN), ihead(8.5, 6.5, 3.2, SKIN, BROWN, None),
         path("M5.4,5.8 C5.5,2.4 11.5,2.4 11.6,5.8 Q8.5,4.8 5.4,5.8 Z", BRONZE, sw=0.6), circle(8.5, 2.6, 0.8, BRONZE_HI, sw=0.4),
         ellipse(4, 11, 3, 4.2, GREEN, sw=0.6), ellipse(4, 11, 1.1, 0.8, BRONZE, sw=0.5)]
    return icon(e)


def i_swordsman():
    e = [tube([(11, 11), (15, 2)], 1.6, IRON, cap=False, sw=0.5), path("M9.5,10 L12,11.5", stroke=BRONZE, sw=1.2),
         ishoulders(GREEN), ihead(7.5, 6.5, 3.3, SKIN, BLOND, None), path("M5.2,8.3 Q7.5,7.2 9.8,8.3 Q7.5,9.2 5.2,8.3 Z", BLOND, sw=0.4),
         path("M5,10.5 A2.5,1.4 0 0 0 10,10.5", stroke=BRONZE_HI, sw=1)]
    return icon(e)


def i_pathfinder():
    e = [ihorsehead(2, 6, "#c8a060", "#6b4423", big=True), path("M8.5,16 L9,10.5 L15.5,10.5 L15.5,16 Z", GREEN),
         ihead(12.2, 7.3, 2.8, SKIN, BROWN, None)]
    return icon(e)


def i_thunder():
    e = [ihorsehead(2, 6, "#ece8dd", "#c9c2b2", big=True), tube([(8, 2.5), (15.5, 1)], 0.9, WOOD, cap=False, sw=0.4),
         path("M8.5,16 L9,10.5 L15.5,10.5 L15.5,16 Z", GBLUE), ihead(12.2, 7.5, 2.7, SKIN, None, None),
         path("M9.6,7 C9.7,3.6 14.7,3.6 14.8,7 Z", BRONZE, sw=0.6)]
    return icon(e)


def i_druidrider():
    e = [ihorsehead(2, 6, "#8a5a2b", "#3a2a14", big=True), tube([(15, 15.5), (15, 1)], 1, WOOD, cap=False, sw=0.5),
         circle(15, 1.8, 1.3, OAK, sw=0.4), path("M8.5,16 L9,9.5 L15,9.5 L15.5,16 Z", CREAM),
         ihead(12, 7, 2.6, SKIN, None, GREY), path("M9,8 C9,3 15,3 15,8 C14,6 13,5.5 12,5.5 C11,5.5 10,6 9,8 Z", CREAM, sw=0.5)]
    return icon(e)


def i_haeduan():
    e = [ihorsehead(2, 6, "#9a4a2a", "#2a1a0c", big=True), tube([(9.5, 15), (15.5, 2)], 1, WOOD, cap=False, sw=0.5),
         path("M8.5,16 L9,10.5 L15.5,10.5 L15.5,16 Z", IRON), ihead(12.2, 7.5, 2.7, SKIN, None, None),
         path("M9.6,7 C9.7,3.6 14.7,3.6 14.8,7 Z", BRONZE, sw=0.6), path("M11,3.6 C12,1.8 14.5,1.8 15.5,3.6", stroke=RED, sw=1.2),
         circle(9.5, 12.5, 2.6, GREEN, sw=0.6), circle(9.5, 12.5, 0.9, BRONZE, sw=0.4)]
    return icon(e)


def i_ram():
    e = [path("M2,13 L14,13 L14,14.5 L2,14.5 Z", WOOD_SH, sw=0.5), circle(4.5, 14, 2, WOOD) + circle(11.5, 14, 2, WOOD),
         path("M3,8 C3,3 13,3 13,8 L13,12 L3,12 Z", "#a06a3a"), path("M5,4.5 L5,12 M8,3.5 L8,12 M11,4.5 L11,12 M3,8 L13,8", stroke="#7a4c24", sw=0.6),
         path("M3,9 L13,9 L13,11.5 L3,11.5 Z", WOOD, sw=0.5), path("M3.5,8.5 L0.8,9.2 L0.8,11.6 L3.5,12.2 Z", IRON, sw=0.6)]
    return icon(e)


def i_trebuchet():
    e = [path("M1,14 L15,14 L15,15.5 L1,15.5 Z", WOOD, sw=0.5), path("M6,14 L8.5,5 L10.5,5 L10.5,14 Z", WOOD_SH, sw=0.5),
         tube([(13, 9), (2, 1)], 1.4, WOOD, cap=False, sw=0.5), path("M11.5,9.5 L15,9.5 L15,13 L11.5,13 Z", WOOD, sw=0.5),
         path("M2,1.5 C1.5,3 1,4 1.5,5.5", stroke="#d8c28a", sw=0.6), circle(2, 6, 1.5, "#9a9588", sw=0.5)]
    return icon(e)


def i_chieftain():
    e = [tube([(2, 16), (2, 0.5)], 1, WOOD, cap=False, sw=0.5), path("M3,16 C3,11 6,10 8.5,10 C11,10 15,11 15,16 Z", GREEN),
         ihead(8.5, 6.5, 3.3, SKIN, BLOND, None), path("M6.2,8.3 Q8.5,7.2 10.8,8.3 Q8.5,9.2 6.2,8.3 Z", BLOND, sw=0.4),
         path("M5.4,4 L11.6,4 L11.6,5.2 L5.4,5.2 Z", BRONZE_HI, sw=0.4),
         path("M6,4.2 C5,2.5 6.5,1.5 7.5,3 Z", OAK, sw=0.4), path("M11,4.2 C12,2.5 10.5,1.5 9.5,3 Z", OAK, sw=0.4),
         path("M5.5,10.3 A3,1.6 0 0 0 11.5,10.3", stroke=BRONZE_HI, sw=1)]
    return icon(e)


def i_settler():
    e = [path("M8,9 C8,5 15,5 15,9 L15.5,12 L7.5,12 Z", "#8a6a4a"), path("M9,12 L9,15 M14,12 L14,15", stroke="#5e4530", sw=1.4),
         path("M9,5.5 C7,3 10,2 10.5,4.5 Z", "#e8e2d0", sw=0.4), path("M14,5.5 C16,3 13,2 12.5,4.5 Z", "#e8e2d0", sw=0.4),
         tube([(3, 15.5), (3, 6)], 1, WOOD, cap=False, sw=0.5),
         ishoulders(GREEN, 12), ihead(6.5, 8.5, 2.9, SKIN, RED, None)]
    return icon(e)


ICONS = {1: i_phalanx, 2: i_swordsman, 3: i_pathfinder, 4: i_thunder, 5: i_druidrider, 6: i_haeduan, 7: i_ram, 8: i_trebuchet, 9: i_chieftain, 10: i_settler}


def write_all():
    big = os.path.join(ROOT, "big")
    for n, fn in UNITS.items():
        p = os.path.join(big, f"gauls-{n}.svg")
        s = fn()
        with open(p, "w") as fh:
            fh.write(s)
        print(f"{p}: {len(s)} bytes")
    for n, fn in ICONS.items():
        p = os.path.join(ROOT, f"gauls-{n}.svg")
        with open(p, "w") as fh:
            fh.write(fn())


if __name__ == "__main__":
    write_all()
