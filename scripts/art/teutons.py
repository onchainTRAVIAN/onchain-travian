"""Generates src/web/public/img/units/big/teutons-N.svg and the 16px icons teutons-N.svg.

Run:  python3 scripts/art/teutons.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from figlib import (OUT, svg, icon, tube, head, hand, boot, poly, path, ellipse, circle,
                    stroke_line, grad, horse, M, f, ishoulders, ihead, ihorsehead,
                    SKIN, SKIN_SH, SKIN_HI, IRON, IRON_SH, IRON_HI, LEATH, LEATH_SH, LEATH_HI, BLUE, BLUE_SH, BLUE_HI, FUR, FUR_SH, FUR_HI, BLOND, BLOND_SH, RED, RED_SH, GREY, GREY_SH, WOOD, WOOD_SH, WOOD_HI, WHITE, WHITE_SH, BLACK, BLACK_SH, BLACK_HI, arm, leg, rings, spear, sword, round_shield, belt, great_helm, crewman)

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "web", "public", "img", "units")

# ====================================================================== units

def clubswinger():
    e = []
    hair_b, hair_f = head(50, 27, 10, SKIN, SKIN_SH, RED, RED_SH, beard=RED, style="long", tilt=0.05)
    # far arm: reaching forward, open hand
    e.append(arm((44, 50), (30, 62), (20, 68), SKIN, SKIN_SH, w=(10.5, 9, 7)))
    e.append(hand(18, 70, SKIN, 4, SKIN_SH))
    # far leg (forward lunge)
    e.append(leg((54, 82), (36, 100), (30, 118), SKIN, SKIN_SH, w=(15, 12, 9.5)))
    e.append(boot(31, 125, FUR, FUR_SH, fur=FUR_HI))
    # near leg (trailing)
    e.append(leg((68, 82), (86, 100), (98, 116), SKIN, SKIN_SH, w=(15, 12, 9.5)))
    e.append(boot(97, 123, FUR, FUR_SH, fur=FUR_HI))
    # torso (bare, barrel chest, leaning forward-left)
    e.append(path("M40,46 C48,36 70,36 78,46 L82,64 C84,74 78,82 72,84 L50,84 C44,78 40,70 40,62 Z", SKIN))
    e.append(path("M60,48 C64,54 64,62 60,68 M76,52 C80,62 78,72 74,80", stroke=SKIN_SH, sw=1.6))
    e.append(path("M46,52 C50,58 58,60 60,56", stroke=SKIN_SH, sw=1.3))
    e.append(stroke_line([(48, 52), (45, 64), (48, 76)], SKIN_HI, 2.2))
    # fur kilt
    e.append(path("M46,78 L76,78 L80,98 L74,94 L68,100 L62,94 L56,100 L50,94 L44,98 Z", FUR))
    e.append(stroke_line([(52, 82), (54, 94)], FUR_SH, 2) + stroke_line([(66, 82), (68, 94)], FUR_SH, 2))
    e.append(belt(44, 79, 78, LEATH_SH, "#9aa2aa"))
    # raised near arm with club
    e.append(arm((72, 48), (90, 38), (88, 22), SKIN, SKIN_SH, w=(11, 9.5, 8)))
    # club: thick tapered, studded, swung back over the shoulder
    e.append(path("M86,26 L96,16 C104,8 116,8 116,18 C116,26 106,28 100,24 L90,32 Z", WOOD))
    e.append(path("M100,14 C108,10 114,14 113,20", stroke=WOOD_HI, sw=1.8))
    e.append(stroke_line([(92, 28), (104, 22)], WOOD_SH, 1.8))
    e.append(circle(106, 13, 1.5, IRON, sw=0.8) + circle(112, 18, 1.5, IRON, sw=0.8) + circle(104, 22, 1.5, IRON, sw=0.8))
    e.append(hand(88, 26, SKIN, 4, SKIN_SH))
    e.append(path("M80,42 L88,34 L92,38 L84,46 Z", IRON, sw=1))  # arm ring
    e.append(hair_b + hair_f)
    return svg(e)


def spearman():
    e = []
    _, hf = head(61, 29, 9.5, SKIN, SKIN_SH, BLOND, BLOND_SH, beard=BLOND)
    # legs braced
    e.append(leg((56, 78), (40, 94), (38, 116), BLUE, BLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(boot(38, 123, LEATH, LEATH_SH))
    e.append(leg((68, 78), (82, 96), (88, 116), BLUE, BLUE_SH, w=(10.5, 8.5, 7.5)))
    e.append(boot(86, 123, LEATH, LEATH_SH))
    # mail shirt
    e.append(path("M48,42 C54,38 68,38 74,42 L78,70 L76,82 L46,82 L44,70 Z", IRON))
    e.append(rings(47, 44, 76, 80, 9))
    e.append(path("M70,44 L78,70 L76,82 L68,82 Z", IRON_SH, stroke="none", extra=' fill-opacity=".45"'))
    e.append(belt(45, 76, 77))
    # far arm with shield (arm behind shield)
    e.append(arm((48, 46), (38, 58), (36, 66), IRON, IRON_SH))
    e.append(round_shield(36, 64, 16, BLUE, LEATH_SH, stripes=GREY, sh=BLUE_SH))
    # near arm holding spear low, braced against the hip
    e.append(arm((74, 46), (88, 60), (80, 74), IRON, IRON_SH))
    e.append(spear((112, 88), (10, 44), tiplen=16, tipw=6))
    e.append(hand(80, 74, SKIN, 3.5, SKIN_SH))
    e.append(hf)
    # conical helm with nasal
    e.append(path("M51,27 L61,8 L71,27 Z", IRON))
    e.append(path("M51,27 Q61,23 71,27 L71,31 Q61,27 51,31 Z", IRON_SH, sw=1))
    e.append(stroke_line([(58, 14), (54, 25)], IRON_HI, 1.6))
    e.append(path("M55,28 L54,36", stroke=IRON_SH, sw=2.2))
    return svg(e)


def axeman():
    e = []
    hb, hf = head(58, 29, 10, SKIN, SKIN_SH, RED, RED_SH, beard=RED, style="long")
    # legs wide
    e.append(leg((54, 80), (42, 100), (38, 118), LEATH, LEATH_SH, w=(11, 9, 7.5)))
    e.append(boot(38, 125, LEATH_SH, FUR_SH))
    e.append(leg((68, 80), (80, 100), (86, 118), LEATH, LEATH_SH, w=(11, 9, 7.5)))
    e.append(boot(86, 125, LEATH_SH, FUR_SH))
    # far arm (lower hand on haft), behind torso
    e.append(arm((48, 46), (54, 32), (68, 28), SKIN, SKIN_SH, w=(8.5, 7.5, 6)))
    # torso: leather jerkin over blue tunic
    e.append(path("M46,44 C52,38 66,38 74,44 L78,66 L74,84 L48,84 L44,66 Z", BLUE))
    e.append(path("M50,44 L70,44 L74,66 L70,82 L52,82 L48,66 Z", LEATH))
    e.append(stroke_line([(56, 48), (54, 66), (56, 80)], LEATH_SH, 1.6))
    e.append(stroke_line([(68, 48), (70, 66), (68, 80)], LEATH_SH, 1.6))
    e.append(belt(46, 78, 76))
    e.append(path("M54,46 L66,46 L68,50 L52,50 Z", IRON_SH, sw=1))  # collar strap
    # near arm raised (upper hand)
    e.append(arm((72, 46), (88, 36), (88, 20), SKIN, SKIN_SH, w=(8.5, 7.5, 6)))
    e.append(path("M70,42 C76,38 82,38 88,40 L86,48 C80,46 74,46 70,48 Z", IRON))  # shoulder plate
    # axe haft + head
    e.append(tube([(62, 34), (98, 10)], 3, WOOD, cap=False))
    e.append(path("M93,2 C104,-2 112,8 106,20 C100,16 96,16 94,16 Z", IRON))
    e.append(path("M100,4 C108,6 110,12 106,18", stroke=IRON_HI, sw=1.6))
    e.append(path("M95,12 L98,6", stroke=IRON_SH, sw=1.4))
    e.append(hand(69, 29, SKIN, 3.5, SKIN_SH))
    e.append(hand(88, 18, SKIN, 3.5, SKIN_SH))
    e.append(hb + hf)
    # winged helmet
    e.append(path("M48,28 C50,16 66,16 68,28 Q58,24 48,28 Z", IRON))
    e.append(path("M48,28 Q58,24 68,28 L68,32 Q58,28 48,32 Z", IRON_SH, sw=1))
    e.append(path("M50,24 C44,22 40,14 42,8 C46,14 50,18 54,20 Z", GREY))
    e.append(path("M66,24 C72,22 76,14 74,8 C70,14 66,18 62,20 Z", GREY))
    e.append(stroke_line([(55, 18), (52, 24)], IRON_HI, 1.6))
    return svg(e)


def scout():
    e = []
    hb, hf = head(50, 50, 9, SKIN, SKIN_SH, LEATH_SH, None, beard=None, tilt=0.03)
    # cloak behind, flowing right
    e.append(path("M44,60 C40,80 44,104 56,118 L100,118 C94,100 84,90 80,74 L72,62 Z", BLUE_SH))
    e.append(path("M60,100 C70,106 84,110 96,116", stroke=BLUE, sw=2))
    # near leg kneeling: hip->knee on ground->foot back
    e.append(leg((66, 88), (84, 114), (102, 116), BLUE, BLUE_SH, w=(10, 8.5, 7)))
    e.append(boot(103, 122, LEATH, LEATH_SH, d=1))
    # far leg crouched
    e.append(leg((56, 88), (34, 94), (36, 118), BLUE, BLUE_SH, w=(10, 8.5, 7)))
    e.append(boot(36, 125, LEATH, LEATH_SH))
    # torso (leaning forward)
    e.append(path("M44,60 C50,56 66,54 72,60 L74,80 L70,92 L54,92 L46,80 Z", GREY))
    e.append(stroke_line([(50, 64), (50, 84)], GREY_SH, 2))
    e.append(belt(46, 84, 72, LEATH_SH, IRON_SH))
    e.append(path("M60,70 L66,70 L66,78 L60,78 Z", LEATH, sw=1))  # pouch
    # near arm with dagger down-low
    e.append(arm((70, 64), (82, 78), (74, 92), GREY, GREY_SH))
    e.append(hand(74, 93, SKIN, 3.2, SKIN_SH))
    e.append(poly([(76, 96), (70, 98), (60, 110), (62, 112)], IRON, sw=1.1))
    e.append(tube([(78, 92), (72, 100)], 3, LEATH_SH, cap=False, sw=1))
    # far arm shielding eyes
    e.append(arm((46, 62), (32, 54), (40, 44), GREY, GREY_SH))
    e.append(hand(43, 42, SKIN, 3.2, SKIN_SH))
    e.append(hb + hf)
    # hood
    e.append(path("M40,52 C38,38 50,32 60,36 C66,38 66,52 62,60 L58,58 C58,48 54,42 48,44 C44,46 44,52 44,56 Z", GREY))
    e.append(path("M42,44 C46,36 56,34 62,40", stroke=GREY_SH, sw=1.6))
    return svg(e)


def paladin():
    e = []
    h = horse(1, 12, GREY, GREY_SH, "#ece8dd", mane="#5e5850", pose="canter", scale=0.93)
    e.append(h["far"] + h["body"])
    # saddle cloth
    e.append(path("M48,62 L78,60 L82,82 L52,84 Z", BLUE))
    e.append(path("M50,80 L80,78", stroke=BLUE_HI, sw=1.6))
    e.append(h["near"])
    # rider: near leg hanging on the near side
    e.append(leg((64, 64), (50, 82), (50, 100), IRON, IRON_SH, w=(10, 8.5, 7.5)))
    e.append(boot(48, 106, LEATH_SH, FUR_SH))
    e.append(path("M44,100 L56,100 L55,104 L45,104 Z", IRON_SH, sw=1))  # stirrup
    # far arm (shield arm) behind body
    e.append(arm((58, 38), (46, 50), (38, 60), IRON, IRON_SH))
    # torso: mail + white surcoat
    e.append(path("M52,34 C58,30 70,30 74,34 L78,52 L76,68 L56,70 L52,52 Z", IRON))
    e.append(path("M55,36 L72,36 L76,52 L74,70 L58,72 L54,52 Z", WHITE))
    e.append(path("M60,46 L70,46 L70,50 L67,50 L67,64 L63,64 L63,50 L60,50 Z", BLUE, sw=1))
    e.append(stroke_line([(72, 40), (74, 56), (72, 68)], WHITE_SH, 2))
    e.append(belt(55, 66, 76))
    # near arm raised with sword
    e.append(arm((72, 38), (88, 32), (86, 18), IRON, IRON_SH))
    e.append(sword(86, 16, -0.42, length=30))
    e.append(hand(86, 18, SKIN, 3.4, SKIN_SH))
    # head + helmet
    _, hf = head(62, 22, 9, SKIN, SKIN_SH, BLOND, BLOND_SH, beard=None)
    e.append(hf)
    e.append(path("M53,20 C54,8 70,8 71,20 L70,25 L54,25 Z", IRON))
    e.append(path("M53,21 L52,34 L58,34 L58,24 Z", IRON_SH, sw=1))  # cheek guard
    e.append(stroke_line([(58, 12), (55, 20)], IRON_HI, 1.6))
    e.append(path("M56,25 L57,33", stroke=IRON_SH, sw=2))  # nasal
    e.append(h["head"])
    # reins
    e.append(stroke_line([(40, 56), (20, 50)], LEATH_SH, 1.2))
    e.append(round_shield(34, 62, 17, WHITE, LEATH_SH, stripes=None, sh=WHITE_SH))
    e.append(path("M30,50 L38,50 L38,58 L46,58 L46,66 L38,66 L38,74 L30,74 L30,66 L22,66 L22,58 L30,58 Z", BLUE, sw=1))
    e.append(circle(34, 62, 5, IRON))
    return svg(e, shadow=(62, 128, 44, 6))


def knight():
    e = []
    h = horse(1, 12, "#4a4f57", "#2c3036", "#6d737c", mane="#1c1e22", pose="gallop", scale=0.93)
    e.append(h["far"] + h["body"])
    # caparison (barding) over the barrel
    e.append(path("M40,62 C52,56 86,54 98,64 L102,92 L92,86 L84,96 L76,88 L68,98 L60,88 L52,96 L44,88 L40,94 Z", WHITE))
    e.append(path("M46,70 C60,66 84,66 96,72", stroke=WHITE_SH, sw=2))
    e.append(path("M72,72 L80,72 L80,76 L78,76 L78,86 L74,86 L74,76 L72,76 Z", BLACK, sw=1))
    e.append(h["near"])
    # rider near leg in black plate
    e.append(leg((64, 64), (52, 84), (54, 102), BLACK, BLACK_SH, BLACK_HI, w=(10, 8.5, 7.5)))
    e.append(boot(52, 108, BLACK_SH, BLACK_SH))
    # heater shield on far side (mostly hidden)
    e.append(path("M40,46 L58,46 L58,62 C58,70 50,76 48,78 C46,76 40,70 40,62 Z", WHITE))
    e.append(path("M46,52 L52,52 L52,56 L50,56 L50,66 L48,66 L48,56 L46,56 Z", BLACK, sw=1))
    # torso: black plate + white surcoat with black cross
    e.append(path("M52,34 C58,30 72,30 76,34 L80,54 L76,70 L56,70 L52,54 Z", BLACK))
    e.append(path("M55,36 L73,36 L76,52 L74,70 L58,72 L55,52 Z", WHITE))
    e.append(path("M60,46 L70,46 L70,50 L67,50 L67,64 L63,64 L63,50 L60,50 Z", BLACK, sw=1))
    e.append(stroke_line([(72, 40), (74, 56), (72, 68)], WHITE_SH, 2))
    e.append(path("M50,32 C56,28 72,28 78,34 L78,40 C70,36 58,36 50,38 Z", BLACK_HI, sw=1))  # pauldron line
    # near arm couching the lance
    e.append(arm((72, 38), (80, 52), (62, 54), BLACK, BLACK_SH, BLACK_HI))
    e.append(spear((108, 34), (2, 76), wood=LEATH, tip=IRON, w=3.2, tiplen=14, tipw=5))
    e.append(circle(96, 39, 4.5, BLACK, sw=1))  # vamplate
    e.append(circle(62, 54, 3.4, BLACK_HI))  # gauntlet
    # great helm
    e.append(great_helm(64, 20))
    e.append(h["head"])
    # chamfron (face armour) over the horse head
    e.append(path("M18,40 C24,38 30,42 30,46 L16,62 C10,64 6,60 6,56 Z", IRON, sw=1.1))
    e.append(circle(20, 46, 1.6, OUT, stroke="none"))
    e.append(path("M18,40 L20,44", stroke=IRON_SH, sw=1.2))
    return svg(e, shadow=(62, 128, 46, 6))


def ram():
    e = []
    # far wheels
    e.append(circle(34, 110, 9, WOOD_SH) + circle(88, 110, 9, WOOD_SH))
    # bed
    e.append(path("M8,104 L104,104 L106,110 L6,110 Z", WOOD))
    e.append(stroke_line([(10, 107), (102, 107)], WOOD_SH, 1.6))
    # posts
    for px in (28, 82):
        e.append(path(f"M{px},104 L{px+2},66 L{px+8},66 L{px+6},104 Z", WOOD))
        e.append(path(f"M{px-10},104 L{px+2},68 L{px+4},72 L{px-4},104 Z", WOOD_SH, sw=1.1))
    e.append(path("M22,64 L92,64 L92,70 L22,70 Z", WOOD))
    # ropes hanging the log
    e.append(stroke_line([(34, 70), (34, 80)], "#d8c28a", 1.6) + stroke_line([(84, 70), (84, 82)], "#d8c28a", 1.6))
    # far crewman pushing from behind the log (legs hidden by it)
    e.append(crewman(66, 100, 0.72, LEATH, LEATH_SH, BLOND, lean=0.25))
    # the log: heavy, tapering slightly toward the iron head on the left
    e.append(path("M18,78 C22,74 90,74 98,80 C100,86 100,90 98,94 C90,98 22,98 18,94 Z", WOOD))
    e.append(path("M24,82 C40,78 80,78 96,82", stroke=WOOD_HI, sw=2))
    e.append(path("M24,92 C40,96 80,96 96,92", stroke=WOOD_SH, sw=2.4))
    e.append(stroke_line([(60, 80), (62, 94)], WOOD_SH, 1.2) + stroke_line([(74, 80), (72, 94)], WOOD_SH, 1.2))
    # iron head
    e.append(path("M20,76 L8,80 C4,84 4,90 8,94 L20,96 Z", IRON))
    e.append(path("M18,76 L22,76 L22,96 L18,96 Z", IRON_SH, sw=1))
    e.append(stroke_line([(10, 82), (12, 92)], IRON_HI, 1.6))
    e.append(circle(16, 80, 1.3, IRON_SH, sw=0.7) + circle(16, 92, 1.3, IRON_SH, sw=0.7))
    # near wheels
    for wx in (38, 92):
        e.append(circle(wx, 114, 11, WOOD))
        e.append(circle(wx, 114, 11, "none", stroke=WOOD_SH, sw=2.4))
        e.append(circle(wx, 114, 11, "none"))
        e.append(path(f"M{wx-9},114 L{wx+9},114 M{wx},105 L{wx},123 M{wx-6.4},107.6 L{wx+6.4},120.4 M{wx+6.4},107.6 L{wx-6.4},120.4", stroke=WOOD_SH, sw=1.6))
        e.append(circle(wx, 114, 2.4, IRON, sw=1))
    # crew: far man behind the log (torso only) and near man pushing the rear
    e.append(crewman(104, 122, 0.78, BLUE, BLUE_SH, RED, lean=0.3, beard=RED))
    return svg(e, shadow=(60, 126, 52, 6))


def catapult():
    e = []
    # far wheel
    e.append(circle(90, 112, 8, WOOD_SH))
    # frame base
    e.append(path("M12,108 L100,108 L102,114 L10,114 Z", WOOD))
    e.append(stroke_line([(14, 111), (98, 111)], WOOD_SH, 1.6))
    # A-frame uprights (far + near) and cross beam
    e.append(path("M44,108 L58,56 L64,56 L54,108 Z", WOOD_SH, sw=1.1))
    e.append(path("M84,108 L70,56 L64,56 L72,108 Z", WOOD))
    e.append(path("M58,56 L70,56 L72,62 L56,62 Z", WOOD))
    e.append(path("M58,84 L74,84 L76,88 L56,88 Z", WOOD))
    # torsion skein (rope bundle) at the pivot
    e.append(path("M48,92 L78,92 L78,100 L48,100 Z", "#d8c28a"))
    e.append(path("M50,92 L52,100 M56,92 L58,100 M62,92 L64,100 M68,92 L70,100 M74,92 L76,100", stroke="#a08a50", sw=1))
    # throwing arm, swung up-left
    e.append(tube([(64, 96), (26, 40)], [7, 5], WOOD, WOOD_SH, side=-1))
    e.append(circle(64, 96, 3.2, IRON, sw=1))
    # cup with stone
    e.append(path("M18,38 C18,30 34,30 34,38 L32,46 L20,46 Z", WOOD_SH))
    e.append(circle(26, 34, 5.5, "#9a9588"))
    e.append(circle(24, 32, 2, "#c8c3b4", stroke="none"))
    # windlass + rope
    e.append(stroke_line([(60, 90), (96, 98)], "#d8c28a", 1.4))
    e.append(path("M94,92 L100,92 L100,104 L94,104 Z", WOOD))
    e.append(path("M100,96 L108,90", stroke=WOOD_SH, sw=2.6))
    # near wheels
    for wx in (26, 96):
        e.append(circle(wx, 116, 10, WOOD))
        e.append(circle(wx, 116, 10, "none", stroke=WOOD_SH, sw=2.2))
        e.append(circle(wx, 116, 10, "none"))
        e.append(path(f"M{wx-8},116 L{wx+8},116 M{wx},108 L{wx},124 M{wx-5.7},110.3 L{wx+5.7},121.7 M{wx+5.7},110.3 L{wx-5.7},121.7", stroke=WOOD_SH, sw=1.4))
        e.append(circle(wx, 116, 2.2, IRON, sw=1))
    # crew: man cranking windlass at the right, man carrying a stone at the left
    e.append(crewman(108, 124, 0.72, BLUE, BLUE_SH, BLOND, lean=0.15, arms="none"))
    e.append(arm((102, 94), (108, 86), (108, 90), BLUE, BLUE_SH, w=(4.5, 4, 3.5)))
    e.append(hand(108, 91, SKIN, 2.3))
    # stone carrier (far left) holding a rock at chest
    e.append(crewman(12, 124, 0.72, LEATH, LEATH_SH, RED, lean=0.0, arms="none", beard=RED))
    e.append(arm((10, 94), (0, 100), (6, 104), LEATH, LEATH_SH, w=(4.5, 4, 3.5)))
    e.append(circle(8, 98, 6.5, "#9a9588"))
    e.append(circle(6, 96, 2.2, "#c8c3b4", stroke="none"))
    e.append(hand(12, 101, SKIN, 2.3))
    e.append(path("M2,102 L14,102", stroke=OUT, sw=0.9))
    return svg(e, shadow=(60, 126, 54, 6))


def chief():
    e = []
    hb, hf = head(58, 30, 10, SKIN, SKIN_SH, "#d8d2c4", "#a39c8c", beard="#d8d2c4", style="long")
    # standard pole + banner (far side)
    e.append(tube([(22, 124), (22, 10)], 3, WOOD, cap=False))
    e.append(path("M22,12 L50,16 L46,24 L50,32 L22,36 Z", BLUE))
    e.append(path("M26,18 L44,20 L42,24 L44,28 L26,30 Z", GREY, sw=1))
    e.append(path("M30,22 L38,22 L38,26 L30,26 Z", RED, sw=0.8))
    e.append(poly([(18, 10), (22, 2), (26, 10)], IRON, sw=1))
    # legs apart, firm
    e.append(leg((52, 82), (44, 102), (42, 118), BLUE, BLUE_SH, w=(11, 9, 7.5)))
    e.append(boot(42, 125, FUR, FUR_SH, fur=FUR_HI))
    e.append(leg((68, 82), (80, 102), (84, 118), BLUE, BLUE_SH, w=(11, 9, 7.5)))
    e.append(boot(84, 125, FUR, FUR_SH, fur=FUR_HI))
    # tunic (mail under fur)
    e.append(path("M46,46 C52,40 68,40 74,46 L78,70 L74,86 L46,86 L42,70 Z", IRON))
    e.append(rings(45, 56, 76, 84, 8))
    e.append(belt(43, 80, 77, LEATH_SH, "#c48a3a"))
    # far arm holding the standard
    e.append(arm((46, 50), (34, 62), (24, 62), FUR, FUR_SH))
    e.append(hand(24, 62, SKIN, 3.5, SKIN_SH))
    # fur mantle over the shoulders
    e.append(path("M40,50 C44,40 76,40 80,50 L82,60 L76,56 L72,62 L66,56 L60,62 L54,56 L48,62 L42,56 L38,60 Z", FUR))
    e.append(path("M44,46 C52,42 68,42 76,46", stroke=FUR_HI, sw=2.2))
    e.append(circle(60, 52, 3.2, "#c48a3a", sw=1))  # brooch
    # near arm raised with axe
    e.append(arm((74, 50), (90, 44), (92, 28), FUR, FUR_SH))
    e.append(tube([(92, 30), (104, 10)], 2.8, WOOD, cap=False))
    e.append(path("M100,12 C96,4 106,-2 112,4 C114,10 112,18 106,20 C104,16 102,14 100,14 Z", IRON))
    e.append(path("M106,6 C110,8 111,14 108,18", stroke=IRON_HI, sw=1.6))
    e.append(hand(92, 30, SKIN, 3.5, SKIN_SH))
    e.append(hb + hf)
    # horned helmet with iron band
    e.append(path("M48,28 C50,14 66,14 68,28 Q58,24 48,28 Z", IRON))
    e.append(path("M47,28 Q58,23 69,28 L69,33 Q58,28 47,33 Z", "#c48a3a", sw=1))
    e.append(path("M50,24 C40,22 34,10 40,2 C40,12 46,18 52,20 Z", GREY))
    e.append(path("M66,24 C76,22 82,10 76,2 C76,12 70,18 64,20 Z", GREY))
    e.append(stroke_line([(44, 6), (42, 14)], "#f0ece2", 1.3) + stroke_line([(72, 6), (74, 14)], "#f0ece2", 1.3))
    e.append(stroke_line([(56, 18), (52, 25)], IRON_HI, 1.6))
    return svg(e)


def settler():
    e = []
    # --- hand cart (right), two big wheels, piled bundles
    e.append(circle(96, 112, 11, WOOD_SH))  # far wheel
    e.append(path("M62,86 L116,84 L114,104 L64,106 Z", WOOD))
    e.append(path("M66,90 L112,88 M66,98 L112,96", stroke=WOOD_SH, sw=1.4))
    e.append(path("M70,86 C70,70 84,66 92,70 C100,62 112,70 112,84 Z", "#c4a26a"))  # sacks
    e.append(path("M80,70 C82,76 82,82 80,86 M96,70 C98,76 98,82 96,86", stroke="#8c6a3a", sw=1.4))
    e.append(path("M74,72 L82,64 L92,70 Z", "#a85a38", sw=1))  # bundle / cloth roll
    e.append(circle(100, 114, 12, WOOD))
    e.append(circle(100, 114, 12, "none", stroke=WOOD_SH, sw=2.4) + circle(100, 114, 12, "none"))
    e.append(path("M90,114 L110,114 M100,104 L100,124 M93,107 L107,121 M107,107 L93,121", stroke=WOOD_SH, sw=1.5))
    e.append(circle(100, 114, 2.4, IRON, sw=1))
    # cart handles reaching forward to the man
    e.append(path("M64,96 L46,86 L44,89 L62,100 Z", WOOD, sw=1.1))
    # --- man pulling the cart (walking left, hands behind him on the handle)
    hb, hf = head(40, 40, 8.5, SKIN, SKIN_SH, BLOND, BLOND_SH, beard=BLOND)
    e.append(leg((38, 86), (26, 102), (22, 118), BLUE, BLUE_SH, w=(9, 7.5, 6.5)))
    e.append(boot(22, 124, LEATH, LEATH_SH, w=10))
    e.append(leg((48, 86), (54, 104), (52, 120), BLUE, BLUE_SH, w=(9, 7.5, 6.5)))
    e.append(boot(52, 125, LEATH, LEATH_SH, w=10))
    e.append(path("M32,54 C36,48 50,48 54,54 L58,72 L54,90 L34,90 L30,72 Z", LEATH))
    e.append(stroke_line([(36, 58), (34, 76), (36, 88)], LEATH_SH, 1.8))
    e.append(belt(31, 82, 57, LEATH_SH, IRON_SH, h=3.5))
    e.append(arm((52, 58), (58, 74), (48, 86), SKIN, SKIN_SH, w=(6.5, 6, 5)))
    e.append(hand(47, 87, SKIN, 3))
    e.append(arm((34, 58), (26, 70), (34, 80), SKIN, SKIN_SH, w=(6.5, 6, 5)))
    e.append(hand(35, 81, SKIN, 3))
    e.append(hb + hf)
    e.append(path("M31,38 C32,30 48,30 49,38 Q40,34 31,38 Z", FUR, sw=1))  # fur cap
    # --- woman walking ahead with a bundle on her head (far left)
    hb2, hf2 = head(14, 52, 7.5, SKIN, SKIN_SH, BLOND, BLOND_SH, style="long")
    e.append(path("M6,64 C8,60 20,60 22,64 L28,120 L0,120 Z", "#8a3a2a"))  # long dress
    e.append(stroke_line([(10, 70), (6, 112)], "#5e2418", 2))
    e.append(path("M8,66 L20,66 L22,80 L6,80 Z", "#d8c28a", sw=1))  # apron bodice
    e.append(arm((20, 66), (28, 76), (22, 86), "#8a3a2a", "#5e2418", w=(5.5, 5, 4.5)))
    e.append(hand(22, 87, SKIN, 2.6))
    e.append(hb2 + hf2)
    e.append(path("M4,44 C4,34 24,34 24,44 Z", "#c4a26a"))  # bundle on head
    e.append(path("M8,40 L20,40", stroke="#8c6a3a", sw=1.2))
    e.append(path("M18,118 L30,118 L30,122 L16,122 Z", LEATH_SH, sw=1))  # shoe peeking
    # --- small child trotting beside
    hb3, hf3 = head(30, 96, 5.5, SKIN, SKIN_SH, RED, RED_SH)
    e.append(path("M26,102 L34,102 L36,116 L24,116 Z", BLUE, sw=1.1))
    e.append(leg((28, 114), (24, 120), (22, 124), SKIN, w=(4.5, 4, 3.5)))
    e.append(leg((33, 114), (36, 120), (34, 124), SKIN, w=(4.5, 4, 3.5)))
    e.append(hb3 + hf3)
    return svg(e, shadow=(62, 128, 54, 6))


UNITS = {1: clubswinger, 2: spearman, 3: axeman, 4: scout, 5: paladin, 6: knight, 7: ram, 8: catapult, 9: chief, 10: settler}


# ====================================================================== 16px icons

def i_clubswinger():
    e = [tube([(9.5, 9), (14, 3)], 1.8, WOOD, cap=False, sw=0.6), circle(14, 3, 1.8, WOOD, sw=0.6),
         ishoulders(SKIN), path("M4,16 L4,12.5 L12,12.5 L12,16 Z", FUR, sw=0.5),
         ihead(7.5, 6, 3.4, SKIN, RED, RED)]
    return icon(e)


def i_spearman():
    e = [tube([(13.5, 15.5), (3, 2.5)], 1.2, WOOD, cap=False, sw=0.5), poly([(2.2, 1.5), (4.3, 2.8), (2.6, 4.6)], IRON, sw=0.5),
         ishoulders(IRON), ihead(8, 6.5, 3.2, SKIN, None, BLOND),
         poly([(4.8, 5.3), (8, 0.3), (11.2, 5.3)], IRON, sw=0.6), path("M4.6,5.3 L11.4,5.3 L11.4,6.6 L4.6,6.6 Z", IRON_SH, sw=0.5),
         circle(4, 11.5, 3.3, BLUE, sw=0.6), circle(4, 11.5, 1.1, IRON, sw=0.5)]
    return icon(e)


def i_axeman():
    e = [tube([(9, 10), (14, 3.5)], 1.2, WOOD, cap=False, sw=0.5), path("M12.5,2 C15,0.5 16.5,3 15.5,6 C14.5,5 13.5,5 13,5 Z", IRON, sw=0.6),
         ishoulders(LEATH), ihead(7, 7, 3.2, SKIN, None, RED),
         path("M3.9,6 C4,2.5 10,2.5 10.1,6 Q7,5 3.9,6 Z", IRON, sw=0.6),
         path("M4.4,5 C2.5,4.5 1.5,2.5 2,0.5 C3,2.5 4.5,3.3 5.5,3.8 Z", GREY, sw=0.5),
         path("M9.6,5 C11.5,4.5 12.5,2.5 12,0.5 C11,2.5 9.5,3.3 8.5,3.8 Z", GREY, sw=0.5)]
    return icon(e)


def i_scout():
    e = [path("M2,16 L1,8 C1,3 6,0.5 8,1 C11,1 15,3 15,8 L14,16 Z", GREY),
         ihead(7.5, 7.5, 3, SKIN, None, None), path("M4,8 C4,2.5 11,2.5 11,8 C10,6 9,5.3 7.5,5.3 C6,5.3 5,6 4,8 Z", GREY_SH, sw=0.5),
         path("M4,9.5 C6,14 9,14 11,9.5", stroke=GREY_SH, sw=0.6)]
    return icon(e)


def i_paladin():
    e = [ihorsehead(2, 6, GREY, "#5e5850", big=True),
         path("M8.5,16 L9,11 L15,11 L15.5,16 Z", WHITE), path("M11.5,12 L11.5,15.5 M10,13.3 L13.5,13.3", stroke=BLUE, sw=0.9),
         ihead(12, 7.5, 2.7, SKIN, None, None), path("M9.3,7.3 C9.4,3.5 14.6,3.5 14.7,7.3 Z", IRON, sw=0.6),
         path("M9.2,7.3 L14.8,7.3 L14.8,8.4 L9.2,8.4 Z", IRON_SH, sw=0.5)]
    return icon(e)


def i_knight():
    e = [ihorsehead(2, 6, "#4a4f57", "#1c1e22", big=True),
         path("M8.5,16 L9,11 L15,11 L15.5,16 Z", WHITE), path("M11.5,12 L11.5,15.5 M10,13.3 L13.5,13.3", stroke=BLACK, sw=0.9),
         path("M9.3,5 Q12,2.5 14.7,5 L14.5,10.5 L9.5,10.5 Z", BLACK, sw=0.6), path("M9.8,7.3 L14.2,7.3", stroke=WHITE, sw=0.9)]
    return icon(e)


def i_ram():
    e = [path("M2,13 L14,13 L14,14.5 L2,14.5 Z", WOOD_SH, sw=0.5), circle(4.5, 14, 2, WOOD) + circle(11.5, 14, 2, WOOD),
         path("M5,12 L5,5 M11,12 L11,5", stroke=WOOD, sw=1.2), path("M4,5 L12,5", stroke=WOOD, sw=1),
         path("M3,7 C6,6 12,6 15,7 L15,11 C12,12 6,12 3,11 Z", WOOD), path("M4,6.5 L1,7.5 L1,10.5 L4,11.5 Z", IRON, sw=0.6)]
    return icon(e)


def i_catapult():
    e = [path("M1,13 L15,13 L15,14.5 L1,14.5 Z", WOOD, sw=0.5), circle(3.5, 14, 1.8, WOOD) + circle(12.5, 14, 1.8, WOOD),
         path("M6,13 L8,6 L10,6 L12,13 Z", WOOD_SH, sw=0.5), path("M5,10.5 L13,10.5", stroke="#d8c28a", sw=1.4),
         tube([(9, 11), (3, 3.5)], 1.6, WOOD, cap=False, sw=0.5), circle(2.6, 2.8, 1.9, "#9a9588", sw=0.6)]
    return icon(e)


def i_chief():
    e = [tube([(2.5, 16), (2.5, 1)], 1, WOOD, cap=False, sw=0.5), path("M2.5,1.5 L7,2.5 L6.5,4 L7,5.5 L2.5,6.5 Z", BLUE, sw=0.5),
         ishoulders(IRON), path("M2,12 C3,9.5 13,9.5 14,12 L13,13.5 L11,12 L9,13.8 L7,12 L5,13.8 L3,12 Z", FUR, sw=0.5),
         ihead(8, 6.5, 3.2, SKIN, None, GREY),
         path("M4.9,5.8 C5,2.5 11,2.5 11.1,5.8 Q8,4.8 4.9,5.8 Z", IRON, sw=0.6),
         path("M5.4,4.8 C3,4.3 2,2 2.8,0.3 C3.5,2.5 5,3.3 6.3,3.6 Z", GREY, sw=0.5),
         path("M10.6,4.8 C13,4.3 14,2 13.2,0.3 C12.5,2.5 11,3.3 9.7,3.6 Z", GREY, sw=0.5)]
    return icon(e)


def i_settler():
    e = [circle(13, 13, 2.6, WOOD, sw=0.6), path("M9,9 L15.5,9 L15,11.5 L9.5,11.5 Z", WOOD, sw=0.5),
         path("M10,9 C10,5.5 15,5.5 15,9 Z", "#c4a26a", sw=0.5),
         ishoulders(LEATH), ihead(6.5, 6.5, 3.2, SKIN, None, BLOND), path("M3.4,5.8 C3.5,2.6 9.5,2.6 9.6,5.8 Q6.5,4.8 3.4,5.8 Z", FUR, sw=0.6)]
    return icon(e)


ICONS = {1: i_clubswinger, 2: i_spearman, 3: i_axeman, 4: i_scout, 5: i_paladin, 6: i_knight, 7: i_ram, 8: i_catapult, 9: i_chief, 10: i_settler}


def write_all():
    big = os.path.join(ROOT, "big")
    for n, fn in UNITS.items():
        p = os.path.join(big, f"teutons-{n}.svg")
        s = fn()
        with open(p, "w") as fh:
            fh.write(s)
        print(f"{p}: {len(s)} bytes")
    for n, fn in ICONS.items():
        p = os.path.join(ROOT, f"teutons-{n}.svg")
        with open(p, "w") as fh:
            fh.write(fn())


if __name__ == "__main__":
    write_all()
