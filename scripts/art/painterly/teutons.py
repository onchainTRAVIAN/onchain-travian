#!/usr/bin/env python3
"""Painterly Teuton unit art (big 120x140 figures only).

Run:  python3 scripts/art/painterly/teutons.py [--out DIR] [unit numbers]
Writes src/web/public/img/units/big/teutons-{1..10}.svg.  The 16x16 icons stay with
scripts/art/teutons.py (do not run that one afterwards for the big figures).

Same poses and identities as the flat generator, redrawn with the painterly kit in
tglib.py (muscular tapered limbs, gripping hands, bearded faces, mail/fur textures,
anatomical horses, chunky siege timber).  All art is original.
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from tglib import *  # noqa: E402,F403
import tglib  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "web", "public", "img", "units")


# ---------------------------------------------------------------- Teuton helmets

def conical_helm(cx: float, cy: float) -> list[str]:
    """Spangenhelm: tall pointed iron bowl, brow band with rivets, nasal guard."""
    bowl = f"M{n(cx-10)},{n(cy-2.5)} Q{n(cx-9)},{n(cy-13)} {n(cx-.5)},{n(cy-22)} Q{n(cx+9.5)},{n(cy-13)} {n(cx+10.5)},{n(cy-2.5)} Q{n(cx)},{n(cy-5.5)} {n(cx-10)},{n(cy-2.5)}Z"
    o = [V(P(bowl, STEEL, 1.3))]
    o.append(clipped(bowl, L(f"M{n(cx-.5)},{n(cy-22)} L{n(cx-5)},{n(cy-3)} M{n(cx-.5)},{n(cy-22)} L{n(cx+5)},{n(cy-3)}", "#4b525a", 1.6, .8),
                     L(f"M{n(cx-1.3)},{n(cy-21)} L{n(cx-5.8)},{n(cy-3)}", "#ffffff", .6, .7),
                     SH(f"M{n(cx+2)},{n(cy-18)} Q{n(cx+9)},{n(cy-10)} {n(cx+10)},{n(cy-3)} L{n(cx+5)},{n(cy-4)}Z", "#2a3036", .5)))
    o.append(spec(cx - 4.4, cy - 11, 1.4, 4, .85, 20))
    for x in (cx - 5, cx + 5):
        o.append(rivet(x, cy - 9, .55, "steel") + rivet(x - (.6 if x < cx else -.6), cy - 14, .5, "steel"))
    band = f"M{n(cx-10.5)},{n(cy-3.6)} Q{n(cx)},{n(cy-6.6)} {n(cx+11)},{n(cy-3.6)} L{n(cx+10.8)},{n(cy-.8)} Q{n(cx)},{n(cy-3.8)} {n(cx-10.5)},{n(cy-.8)}Z"
    o.append(V(P(band, DSTEEL, 1.1)))
    for k in range(5):
        o.append(rivet(cx - 8 + k * 4.2, cy - 2.6 - (1.2 if 0 < k < 4 else .4), .5, "steel"))
    o.append(V(P(f"M{n(cx-6.6)},{n(cy-3)} L{n(cx-4.4)},{n(cy-3.2)} L{n(cx-4.8)},{n(cy+4.2)} L{n(cx-6.6)},{n(cy+3.6)}Z", STEEL, 1)))
    o.append(L(f"M{n(cx-6)},{n(cy-2.4)} L{n(cx-6)},{n(cy+3)}", "#ffffff", .5, .7))
    return o


def horned_helm(cx: float, cy: float, band: str = DSTEEL, big: bool = False) -> list[str]:
    """Rounded iron cap with a band and a pair of curved horns."""
    s = 1.12 if big else 1.0
    o = []
    # far horn (behind the bowl, to the right)
    fh = (f"M{n(cx+6)},{n(cy-9)} Q{n(cx+13*s)},{n(cy-10)} {n(cx+15*s)},{n(cy-17*s)} Q{n(cx+16*s)},{n(cy-22*s)} {n(cx+13*s)},{n(cy-26*s)} "
          f"Q{n(cx+12*s)},{n(cy-19*s)} {n(cx+9*s)},{n(cy-16*s)} Q{n(cx+7)},{n(cy-14)} {n(cx+4)},{n(cy-13)}Z")
    o.append(V(P(fh, HORN, 1.1)))
    o.append(L(f"M{n(cx+10*s)},{n(cy-11.5)} l2,-1.6 M{n(cx+13*s)},{n(cy-15*s)} l2.2,-.4 M{n(cx+14*s)},{n(cy-20*s)} l1.8,.6", "#8a7656", .7, .7))
    bowl = f"M{n(cx-10)},{n(cy-2.5)} C{n(cx-10.5)},{n(cy-17)} {n(cx+10.5)},{n(cy-17)} {n(cx+10.5)},{n(cy-2.5)} Q{n(cx)},{n(cy-5.5)} {n(cx-10)},{n(cy-2.5)}Z"
    o.append(V(P(bowl, STEEL, 1.3)))
    o.append(clipped(bowl, L(f"M{n(cx)},{n(cy-15)} L{n(cx-.6)},{n(cy-4)}", "#4b525a", 1.6, .8),
                     SH(f"M{n(cx+3)},{n(cy-14)} Q{n(cx+10)},{n(cy-10)} {n(cx+10)},{n(cy-3)} L{n(cx+4)},{n(cy-4)}Z", "#2a3036", .5)))
    o.append(spec(cx - 4.6, cy - 10.5, 2.6, 1.6, .85, -30))
    o.append(dot(cx - 5.2, cy - 11, .7, "#fff"))
    bd = f"M{n(cx-10.5)},{n(cy-3.8)} Q{n(cx)},{n(cy-6.8)} {n(cx+11)},{n(cy-3.8)} L{n(cx+10.8)},{n(cy-.6)} Q{n(cx)},{n(cy-3.8)} {n(cx-10.5)},{n(cy-.6)}Z"
    o.append(V(P(bd, band, 1.1)))
    rv = "gold" if band in (BRONZE, GOLD) else "steel"
    for k in range(5):
        o.append(rivet(cx - 8 + k * 4.2, cy - 2.6 - (1.2 if 0 < k < 4 else .4), .55, rv))
    # near horn (front, to the left)
    nh = (f"M{n(cx-6)},{n(cy-8)} Q{n(cx-14*s)},{n(cy-9)} {n(cx-17*s)},{n(cy-16*s)} Q{n(cx-19*s)},{n(cy-22*s)} {n(cx-15*s)},{n(cy-27*s)} "
          f"Q{n(cx-14*s)},{n(cy-20*s)} {n(cx-10*s)},{n(cy-16*s)} Q{n(cx-7)},{n(cy-13.5)} {n(cx-3)},{n(cy-12.5)}Z")
    o.append(V(P(nh, HORN, 1.1)))
    o.append(clipped(nh, SH(f"M{n(cx-8)},{n(cy-9)} Q{n(cx-15*s)},{n(cy-11)} {n(cx-17*s)},{n(cy-18*s)} L{n(cx-15*s)},{n(cy-18*s)} Q{n(cx-12*s)},{n(cy-12)} {n(cx-6)},{n(cy-11)}Z", "#7a6648", .5)))
    o.append(L(f"M{n(cx-10*s)},{n(cy-12)} l-1.6,-2.2 M{n(cx-14*s)},{n(cy-14.5*s)} l-2.4,-.8 M{n(cx-16*s)},{n(cy-19.5*s)} l-2.2,.2", "#8a7656", .7, .7))
    o.append(LS(f"M{n(cx-12*s)},{n(cy-12.6*s)} Q{n(cx-16*s)},{n(cy-17*s)} {n(cx-15.6*s)},{n(cy-23*s)}", "#ffffff", .9, .7))
    return o


def nasal_helm(cx: float, cy: float) -> list[str]:
    """Rounded iron helm with a nasal and a mail aventail over neck and cheeks (draw after the face)."""
    av = f"M{n(cx-6)},{n(cy+1)} Q{n(cx-6)},{n(cy+9)} {n(cx-2)},{n(cy+11)} L{n(cx+9)},{n(cy+11)} Q{n(cx+12)},{n(cy+4)} {n(cx+10)},{n(cy-3)} L{n(cx+2)},{n(cy-3)} Q{n(cx+2)},{n(cy+5)} {n(cx-2)},{n(cy+6)} Q{n(cx-5)},{n(cy+4)} {n(cx-6)},{n(cy+1)}Z"
    o = [part(av, DSTEEL, "mail")]
    bowl = f"M{n(cx-10)},{n(cy-2)} C{n(cx-10.5)},{n(cy-16.5)} {n(cx+10.5)},{n(cy-16.5)} {n(cx+10.5)},{n(cy-2)} Q{n(cx)},{n(cy-5)} {n(cx-10)},{n(cy-2)}Z"
    o.append(V(P(bowl, STEEL, 1.3)))
    o.append(clipped(bowl, SH(f"M{n(cx+3)},{n(cy-13)} Q{n(cx+10)},{n(cy-9)} {n(cx+10)},{n(cy-2)} L{n(cx+4)},{n(cy-3)}Z", "#2a3036", .5)))
    o.append(spec(cx - 4.6, cy - 10, 2.6, 1.6, .85, -30))
    o.append(dot(cx - 5.2, cy - 10.4, .7, "#fff"))
    o.append(V(P(f"M{n(cx-10.5)},{n(cy-3.4)} Q{n(cx)},{n(cy-6.4)} {n(cx+11)},{n(cy-3.4)} L{n(cx+10.8)},{n(cy-.6)} Q{n(cx)},{n(cy-3.6)} {n(cx-10.5)},{n(cy-.6)}Z", DSTEEL, 1.1)))
    o.append(V(P(f"M{n(cx-6.6)},{n(cy-3)} L{n(cx-4.4)},{n(cy-3.2)} L{n(cx-4.8)},{n(cy+4)} L{n(cx-6.6)},{n(cy+3.4)}Z", STEEL, 1)))
    o.append(rivet(cx - 2, cy - 3.6, .5, "steel") + rivet(cx + 3, cy - 3.8, .5, "steel") + rivet(cx + 8, cy - 3, .5, "steel"))
    return o


def great_helm(cx: float, cy: float) -> list[str]:
    """Flat-topped great helm, blackened steel with a brass cross over the eye slit."""
    d = (f"M{n(cx-9.5)},{n(cy-10)} Q{n(cx)},{n(cy-14)} {n(cx+10)},{n(cy-10)} L{n(cx+11)},{n(cy+8)} "
         f"Q{n(cx)},{n(cy+11)} {n(cx-10.5)},{n(cy+8)}Z")
    o = [V(P(d, BLACK, 1.3))]
    o.append(clipped(d, SH(f"M{n(cx+4)},{n(cy-11)} L{n(cx+11)},{n(cy-10)} L{n(cx+11)},{n(cy+9)} L{n(cx+5)},{n(cy+9)}Z", "#0a0b0d", .55),
                     SH(f"M{n(cx-8)},{n(cy-9)} L{n(cx-5)},{n(cy-9)} L{n(cx-5)},{n(cy+7)} L{n(cx-8.5)},{n(cy+6)}Z", "#c8d0d8", .5)))
    o.append(spec(cx - 6, cy - 9.6, 3, 1, .7))
    o.append(P(f"M{n(cx-10)},{n(cy-1.6)} L{n(cx+10.6)},{n(cy-1.6)} L{n(cx+10.6)},{n(cy+.6)} L{n(cx-10)},{n(cy+.6)}Z", "#0c0d10", .8))
    o.append(P(f"M{n(cx-3.6)},{n(cy-10.6)} L{n(cx-1.6)},{n(cy-10.8)} L{n(cx-1.6)},{n(cy+9.4)} L{n(cx-3.6)},{n(cy+9.2)}Z", GOLD, .9))
    o.append(P(f"M{n(cx-9.6)},{n(cy-4.2)} L{n(cx+10.4)},{n(cy-4.2)} L{n(cx+10.4)},{n(cy-2.6)} L{n(cx-9.6)},{n(cy-2.6)}Z", GOLD, .9))
    o.append(L(f"M{n(cx-3.2)},{n(cy-9.6)} L{n(cx-3.2)},{n(cy+8)} M{n(cx-9)},{n(cy-3.8)} L{n(cx+9.6)},{n(cy-3.8)}", GOLD_L, .5, .8))
    holes = "".join(f"M{n(cx+2 + (k % 3) * 2.2)},{n(cy + 3 + (k // 3) * 2)} l.1,0 " for k in range(6))
    o.append(L(holes, "#000000", 1, .9))
    return o


def mail_torso(d: str, lit: str = "", folds: str = "") -> str:
    return part(d, DSTEEL, "mail", lit=lit, folds=folds, fold_col="#1a1e22")


# ---------------------------------------------------------------- 1 Clubswinger

def clubswinger() -> list[str]:
    o = [shadow(62, 40)]
    # far arm reaching forward, open hand
    o.append(tube("M44,50 L30,62 L20,68", SKIN, 10))
    o += open_hand(17, 70, 1.05, up=False)
    o.append(LS("M36,56 Q30,60 26,64", "#fff3dc", 1.3, .4))
    # legs: far forward lunge, near trailing
    o.append(tube("M56,82 L38,100 L31,118", SKIN, 13))
    o.append(LS("M50,86 L40,98", "#fff3dc", 1.6, .4) + LS("M34,104 Q38,110 34,116", SKIN_D, 1.4, .5))
    o += boot(31, 124, -1, FUR_D, 13, cuff="fur", lace=False)
    o.append(tube("M68,82 L86,100 L97,116", SKIN, 13))
    o.append(LS("M88,104 Q92,108 94,114", SKIN_D, 1.4, .5))
    o += boot(98, 122, -1, FUR_D, 13, cuff="fur", lace=False)
    # bare barrel chest, leaning forward-left
    tor = "M39,50 C42,38 66,34 79,44 L84,60 C87,72 80,82 72,85 L50,85 C43,79 39,70 39,60Z"
    o.append(part(tor, SKIN, lit="M44,46 Q56,40 62,46 Q54,52 46,58Z",
                  folds="M48,58 Q56,62 61,57 M62,60 Q64,68 61,76 M50,66 Q56,68 60,66 M50,74 Q56,76 60,74 M76,52 Q81,64 76,78",
                  fold_col="#7a4026"))
    o.append(LS("M64,56 Q70,60 74,56", "#fff3dc", 1, .4))
    o.append(dot(52, 61, .6, "#7a4026", .7) + dot(68, 59, .6, "#7a4026", .7))
    # chest hair tufts
    o.append(L("M55,52 l-1,2 M57,53 l.4,2 M59,52 l1,2 M56,56 l-.6,1.8 M58,56 l.6,1.8", "#7a3a16", .6, .7))
    # fur kilt with ragged hem
    kilt = "M45,78 L77,77 L81,92 L77,98 L73,94 L69,101 L65,95 L60,102 L56,95 L51,100 L48,94 L43,98 Z"
    o.append(part(kilt, FUR, "fur", lit="M47,79 L60,79 L54,90Z"))
    o += belt(44, 76, 78, 75, 4.4, STEEL)
    # raised near arm, club swung back over the shoulder
    o.append(tube("M73,48 L90,38 L89,25", SKIN, 11))
    o.append(LS("M76,46 Q82,42 86,40", "#fff3dc", 1.6, .45))
    o.append(V(P("M80,42.6 L88,35 L91.6,39 L83.8,46.4Z", STEEL, 1)))
    o.append(L("M81.6,42.4 L88.4,36.4", "#ffffff", .6, .7))
    club = "M85,29 Q93,20 99,15 Q103,8 110,8 Q117,9 117,16 Q116,23 108,25 Q102,26 98,26 Q92,30 89,34Z"
    o.append(part(club, WOOD, "grain", lit="M100,11 Q108,8 112,12 Q106,13 101,17Z"))
    for x, y in ((106, 12), (112, 15), (110, 21), (103, 21), (98, 19)):
        o.append(V(circ(x, y, 1.4, g("steelr"), .7)))
    o += fist(88, 28, 4.2, -40)
    # head: long ginger hair behind, face, full beard
    o += long_hair(50, 27, GINGER, 18)
    o += face(50, 27, grim=True, brow="#7a3010")
    o += hair_cap(50, 27, GINGER)
    o += beard(50, 27, GINGER, 6, 1.05)
    return o


# ---------------------------------------------------------------- 2 Spearman

def spearman() -> list[str]:
    o = [shadow(62, 36)]
    o.append(tube("M56,78 L40,94 L38,116", BLUE, 11, tex="wrap"))
    o += boot(38, 123, -1, LEA, 13)
    o.append(tube("M68,78 L82,96 L87,116", BLUE, 11, tex="wrap"))
    o += boot(87, 123, -1, LEA, 13)
    # mail hauberk to mid-thigh
    o.append(mail_torso("M47,41 C54,37 68,37 75,41 L79,66 L81,86 Q62,90 43,86 L45,66Z",
                        lit="M49,44 L58,42 L54,70 L47,68Z", folds="M70,46 Q76,64 76,84 M52,76 Q50,82 50,86"))
    o.append(L("M44,85 Q62,89 80,85", "#e8edf2", .6, .6))
    o += belt(45, 71, 78, 70, 4.4, BRONZE)
    # far arm behind the shield
    o.append(tube("M48,46 L38,58 L36,66", DSTEEL, 9, tex="mail"))
    o += round_shield(35, 64, 16.5, BLUE, motif="quarters", motif_col="#d9d2c3")
    # near arm bracing the spear low against the hip
    o.append(tube("M74,45 L88,59 L81,73", DSTEEL, 9.5, tex="mail"))
    o += spear(112, 88, 23.8, 49.9, 16, 3.2)
    o += fist(80.6, 74, 4, 200)
    o.append(tube("M60,36 L61,43", SKIN, 8))
    o += face(61, 29, grim=True, brow="#8a6420")
    o += beard(61, 29, BLOND, 5)
    o += conical_helm(61, 29)
    return o


# ---------------------------------------------------------------- 3 Axeman

def axeman() -> list[str]:
    o = [shadow(62, 34)]
    o.append(tube("M54,80 L43,100 L38,118", LEA, 11.5))
    o.append(LS("M48,88 L42,100", "#d8a870", 1.4, .4))
    o += boot(38, 125, -1, LEA_D, 13)
    o.append(tube("M68,80 L80,100 L86,118", LEA, 11.5))
    o += boot(86, 125, -1, LEA_D, 13)
    # blue tunic + studded leather jerkin
    o.append(part("M45,44 C51,38 67,38 75,44 L79,66 L76,86 L47,86 L43,66Z", BLUE,
                  folds="M47,72 Q46,80 48,86 M76,70 Q78,78 76,86"))
    jer = "M50,43 L70,43 L74,64 L71,84 L52,84 L48,64Z"
    o.append(part(jer, LEA, lit="M51,45 L58,45 L55,70 L50,66Z", folds="M60,46 Q60,64 61,82"))
    o.append(f'<path d="M52,47 L50,65 L53,82 M68,47 L72,65 L69,82" fill="none" stroke="#e0b880" stroke-width=".6" stroke-dasharray="1.4 1.6" stroke-opacity=".75"/>')
    for x, y in ((55, 52), (65, 52), (54, 60), (66, 60), (55, 68), (66, 68), (56, 76), (65, 76)):
        o.append(rivet(x, y, .6, "steel"))
    o += belt(46, 78, 77, 77, 4.4, BRONZE)
    o.append(P("M53,45 L67,45 L69,50 L51,50Z", LEA_D, 1))
    # far arm across the chest to the lower grip
    o.append(tube("M50,48 L60,50 L70,36", SKIN, 9))
    # near arm raised to the upper grip
    o.append(tube("M72,46 L87,37 L88,22", SKIN, 9.5))
    o.append(V(P("M69,41 C76,36 84,37 89,40 L87,48 C81,45 75,46 70,48Z", STEEL, 1.1)))
    o.append(spec(74, 40, 3, 1, .8, -10))
    # axe haft + bearded axe head
    o += shaft(60, 42.6, 99, 12, 3)
    o.append('<g transform="translate(0,3)">')
    ax = "M93,4 Q100,-1 108,1 Q114,6 112,14 Q110,20 104,22 Q103,16 99,14 L96,12 Z"
    o.append(V(P(ax, STEEL, 1.2)))
    o.append(clipped(ax, SH("M104,3 Q112,6 111,14 Q108,18 104,20 Q108,12 103,5Z", "#2a3036", .45),
                     L("M101,3 Q109,5 110,13", "#ffffff", 1, .8)))
    o.append(L("M108,2 Q114,8 111,17 Q108,21 104,22", "#ffffff", .5, .7))
    o.append(V(P("M94,6 L99,4 L101,13 L96,14Z", DSTEEL, 1)))
    o.append("</g>")
    o += fist(70, 35, 3.8, 215)
    o += fist(88, 20.6, 3.8, 215)
    o += long_hair(58, 29, GINGER, 16)
    o += face(58, 29, grim=True, brow="#7a3010")
    o += beard(58, 29, GINGER, 7)
    o += horned_helm(58, 29)
    return o


# ---------------------------------------------------------------- 4 Scout

def scout() -> list[str]:
    o = [shadow(68, 38)]
    cloak = "M44,60 C38,80 44,104 56,118 L102,119 C95,101 85,90 80,74 L72,61Z"
    o.append(part(cloak, BLUE_D, lit="M50,70 Q48,92 58,112 L64,112 Q56,90 58,70Z",
                  folds="M60,76 Q64,96 72,114 M74,80 Q82,98 92,114 M66,90 Q70,104 80,116", fold_col="#05101e"))
    # near leg kneeling (knee on the ground), foot back
    o.append(tube("M66,88 L84,113 L101,115", BLUE, 10.5, tex="wrap"))
    o += boot(103, 122, 1, LEA, 12)
    # far leg crouched forward
    o.append(tube("M56,88 L35,94 L36,118", BLUE, 10.5, tex="wrap"))
    o += boot(36, 125, -1, LEA, 13)
    # grey wool tunic, leaning forward
    o.append(part("M44,59 C50,55 66,53 72,59 L75,80 L70,92 L53,92 L46,80Z", GREYH,
                  lit="M47,61 L56,58 L52,80 L47,78Z", folds="M56,62 Q55,76 57,90 M66,62 Q70,76 68,90"))
    o += belt(46, 82, 73, 82, 4, STEEL)
    o.append(part("M59,86 L66,86 L66,94 L59,94Z", LEA))
    o.append(rivet(62.5, 88.5, .6))
    # near arm low with the dagger
    o.append(tube("M70,63 L82,78 L75,91", GREYH, 9))
    o.append(V(P("M72,95 L66,97 L58,110 L60.6,111.4 L70.6,100Z", STEEL, 1)))
    o.append(L("M69,97.4 L60,109.6", "#ffffff", .5, .8))
    o.append(V(P("M71,93 L77,95 L76,97 L70,95Z", BRONZE, .8)))
    o += fist(76, 92, 3.6, 150)
    # far arm up, shading the eyes
    o.append(tube("M46,62 L32,54 L39,45", GREYH, 9))
    o += face(50, 50, brow="#5a3a1a")
    o.append(L("M44,45.6 Q46,47 48,46.6", SKIN_D, .7, .6))
    # hood (back + front rim)
    o.append(part("M40,53 C37,38 49,31 60,35 C67,38 67,52 62,60 L58,58 C58,48 54,43 48,44 C44,46 44,51 44,56Z", GREYH,
                  folds="M46,40 Q54,36 60,40 M60,44 Q63,50 60,56", lit="M42,46 Q43,38 50,36 Q45,42 44,50Z"))
    o.append(LS("M42,44 C46,36 56,34 62,40", "#ffffff", .8, .5))
    o += open_hand(43, 43, .8, up=False)
    return o


# ---------------------------------------------------------------- 5 Paladin

def paladin() -> list[str]:
    o = [shadow(62, 54)]
    h = horse(GREYC, GREYC_D, "#ffffff", "canter", "maneg", "#c8c2b4", drop=.6)
    o += h["far"] + h["body"]
    o += saddle_cloth("M46,64 L80,66 L83,86 L45,86Z", BLUE, GOLD, "M46,83 L83,83")
    o.append(L("M47,86 l0,1.6 M51,86 l0,1.6 M55,86 l0,1.6 M59,86 l0,1.6 M63,86 l0,1.6 M67,86 l0,1.6 M71,86 l0,1.6 M75,86 l0,1.6 M79,86 l0,1.6", GOLD_D, .8, .9))
    o += h["near"]
    # rider: near leg in mail chausses, stirrup
    o.append(L("M58,82 L57,98", LEA_D, 1.6, 1))
    o.append(tube("M63,68 L51,84 L48,98", DSTEEL, 9, tex="mail"))
    o += boot(48, 104, -1, LEA_D, 12)
    o.append(P("M42,103 L54,103 L53,106 L43,106Z", STEEL_D, .9))
    # torso: mail + white surcoat with a blue cross
    o.append(mail_torso("M51,38 C56,34 70,34 75,38 L78,56 L76,72 L52,72 L49,56Z"))
    sur = "M54,40 L73,40 L77,56 L75,74 Q63,77 52,74 L50,56Z"
    o.append(part(sur, WHITE, lit="M55,42 L62,42 L58,66 L53,64Z", folds="M58,58 Q57,66 58,74 M70,58 Q72,66 71,74", fold_col="#6a5a3e"))
    o.append(clipped(sur, S("M60,46 L67,46 L67,52 L72,52 L72,57 L67,57 L67,70 L60,70 L60,57 L55,57 L55,52 L60,52Z", BLUE)))
    o += belt(51, 66, 76, 66, 4, GOLD)
    # near arm raised with the sword
    o.append(tube("M72,42 L86,36 L86,23", DSTEEL, 9, tex="mail"))
    o += longsword(86, 21, -62, 30, GOLD)
    o += fist(86, 21, 3.8, 240)
    o.append(tube("M62,30 L63,38", SKIN, 7.5))
    o += face(62, 24, grim=True)
    o += beard(62, 24, BLOND, 2, .95)
    o += nasal_helm(62, 24)
    o += h["neck"] + h["head"]
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q30,58 44,58", LEA_D, 1.3, 1))
    o += round_shield(35, 61, 16.5, WHITE, motif="cross", motif_col=BLUE)
    return o


# ---------------------------------------------------------------- 6 Teutonic Knight

def knight() -> list[str]:
    o = [shadow(62, 56)]
    h = horse(IRONC, IRONC_D, "#8d949c", "gallop", "mane", "#7a6a5a", drop=.75, armour="chamfron")
    o += h["far"] + h["body"]
    # white caparison with dagged hem and a black cross
    cap = "M38,64 C52,58 86,56 100,64 L104,92 L96,86 L90,96 L82,88 L74,98 L66,89 L58,98 L50,89 L42,96 L37,88Z"
    o.append(part(cap, WHITE, lit="M42,66 Q60,62 74,64 Q58,70 44,74Z",
                  folds="M50,74 L49,92 M60,72 L62,92 M84,72 L83,92 M94,72 L98,88", fold_col="#6a5a3e"))
    o.append(clipped(cap, S("M76,70 L82,70 L82,76 L88,76 L88,81 L82,81 L82,92 L76,92 L76,81 L70,81 L70,76 L76,76Z", "#1c1d20")))
    o += h["near"]
    # rider near leg in black plate
    o.append(tube("M64,66 L53,84 L55,101", BLACK, 9.5))
    o.append(spec(56, 82, 1.4, 3, .5, 30))
    o += boot(55, 107, -1, "#2a2d32", 12, lace=False)
    o.append(part("M55,64 L74,64 L70,80 L60,86 L51,80Z", WHITE, folds="M60,66 L57,82 M67,66 L66,82", fold_col="#6a5a3e"))
    # heater shield on the far side
    hs = "M39,45 L58,45 L58,61 C58,70 50,76 48.5,78 C47,76 39,70 39,61Z"
    o.append(part(hs, WHITE, lit="M41,47 L48,47 L44,66Z"))
    o.append(clipped(hs, S("M46.4,47 L50.6,47 L50.6,54 L56,54 L56,58 L50.6,58 L50.6,74 L46.4,74 L46.4,58 L41,58 L41,54 L46.4,54Z", "#1c1d20")))
    # black plate + white surcoat with black cross
    o.append(V(P("M51,34 C57,30 72,30 77,34 L81,54 L77,70 L55,70 L51,54Z", BLACK)))
    sur = "M54,37 L74,37 L78,54 L76,72 Q64,75 56,72 L53,54Z"
    o.append(part(sur, WHITE, lit="M55,39 L62,39 L58,64 L54,62Z", folds="M60,58 Q59,66 60,72 M71,58 Q73,66 72,72", fold_col="#6a5a3e"))
    o.append(clipped(sur, S("M61,43 L68,43 L68,50 L74,50 L74,55 L68,55 L68,69 L61,69 L61,55 L55,55 L55,50 L61,50Z", "#1c1d20")))
    o += belt(53, 64, 77, 64, 3.6, GOLD)
    o.append(V(P("M49,32 C55,27 73,27 79,33 L79,40 C71,35 57,35 49,38Z", BLACK, 1.1)))
    o.append(spec(57, 31, 4, 1, .6))
    # near arm couching the lance
    o.append(tube("M73,38 L81,52 L64,55", BLACK, 9))
    o += spear(108, 33, 14, 72, 12, 2.6, WOOD, 3.4)
    o.append(V(P("M92,36 L100,44 L96,46 L89,39Z", STEEL, 1)))
    o.append(V(circ(97, 39, 4.6, BLACK, 1.1)))
    o.append(spec(95.6, 37.4, 1.4, .8, .7))
    o.append(V(ell(63, 55, 4, 3.4, BLACK, 1.1)))
    o.append(spec(62, 54, 1.2, .8, .7))
    o += great_helm(65, 21)
    o += h["neck"] + h["head"]
    mx, my = h["mouth"]
    o.append(L(f"M{n(mx)},{n(my)} Q34,62 46,62", LEA_D, 1.3, 1))
    return o


# ---------------------------------------------------------------- 7 Ram

def ram() -> list[str]:
    o = [shadow(58, 52)]
    o.append('<g transform="translate(4,128) scale(.88) translate(-4,-128)">')
    o += wheel(32, 109, 9.5, True)
    o += wheel(86, 109, 9.5, True)
    # bed + posts + cross beam
    o.append(beam("M8,105 L106,105", 5))
    o.append(beam("M30,104 L32,64 M84,104 L82,64", 5.4))
    o.append(beam("M18,104 L31,72 M98,104 L83,72", 3.4, WOOD_D, False))
    o.append(beam("M20,63 L96,63", 5.4))
    for x in (31.6, 82.6):
        o.append(iron_band(x, 63, 6.6, 3))
    # ropes
    o.append(L("M37,66 L37,78 M80,66 L80,79", OUT, 2.6, .75) + L("M37,66 L37,78 M80,66 L80,79", ROPE, 1.6, 1))
    o.append(L("M36.3,68 l1.4,1 M36.3,71 l1.4,1 M36.3,74 l1.4,1 M79.3,68 l1.4,1 M79.3,71 l1.4,1 M79.3,74 l1.4,1 M79.3,77 l1.4,1", "#7a6034", .6, .9))
    # far crewman (behind the log)
    o += crewman(52, 76, .68, LEA, BLUE, BLOND, BLOND)
    # the log
    log = "M18,78 C24,74 90,74 99,79 C101,85 101,90 99,95 C90,99 24,99 18,95Z"
    o.append(part(log, WOOD, "grain", lit="M22,78 C40,75 80,75 96,79 L96,83 C80,79 40,79 22,83Z",
                  folds="M24,94 C40,97 80,97 96,93", fold_col="#2a1406"))
    o.append(L("M40,78 l1,18 M63,77 l-1,19 M86,78 l1,18", "#3a2210", .7, .5))
    o.append(V(ell(99, 87, 2.4, 8, WOOD_L, 1.1)))
    o.append(L("M99,81.6 a1.2,5.4 0 0 1 0,10.8", "#8a6038", .6, .7))
    # iron ram head (ram's horns motif)
    o.append(V(P("M21,75 L8,80 C3,84 3,91 8,95 L21,99Z", STEEL, 1.3)))
    o.append(clipped("M21,75 L8,80 C3,84 3,91 8,95 L21,99Z", SH("M12,90 L21,92 L21,99 L8,95Z", "#2a3036", .5)))
    o.append(spec(11, 82, 3.4, 1.2, .85, -15))
    o.append(L("M9,86 Q5,88 9,90 Q12,91 12,88", STEEL_D, 1, .9))
    o.append(V(P("M19,74 L24,74 L24,100 L19,100Z", DSTEEL, 1.1)))
    o.append(rivet(21.5, 78, .7, "steel") + rivet(21.5, 87, .7, "steel") + rivet(21.5, 96, .7, "steel"))
    o += wheel(38, 114, 11)
    o += wheel(92, 114, 11)
    o.append("</g>")
    # near crewman pushing the rear
    o += crewman(88, 81, .76, BLUE, LEA, GINGER, GINGER)
    return o


# ---------------------------------------------------------------- 8 Catapult

def catapult() -> list[str]:
    o = [shadow(58, 54)]
    o += wheel(90, 112, 8, True)
    o.append(beam("M10,110 L102,110", 5))
    # A-frame uprights + braces
    o.append(beam("M48,108 L60,56", 4.6, WOOD_D, False))
    o.append(beam("M80,108 L67,56", 5))
    o.append(beam("M56,58 L72,58", 5))
    o.append(beam("M56,86 L76,86", 4))
    o.append(iron_band(63.5, 57.6, 5, 3.6))
    # torsion skein
    o.append(V(L("M48,96 L78,96", OUT, 10, .75), L("M48,96 L78,96", ROPE, 7.6, 1), L("M48,94.2 L78,94.2", "#efdcaa", 1.4, .8)))
    o.append(L("".join(f"M{x},92.6 L{x+2},99.4 " for x in range(50, 78, 3)), "#7a6034", .8, .8))
    # throwing arm swung up-left, with bucket and stone
    o.append(beam("M64,96 L27,42", 5.4))
    o.append(V(circ(64, 96, 3.4, g("steelr"), 1)))
    o.append(L("M44,64 l3.6,2.6 M49,71 l3.6,2.6", ROPE, 1.6, 1))
    o.append(V(P("M16,38 C16,29 35,29 35,38 L32,47 L19,47Z", WOOD_D, 1.2)))
    o.append(L("M17,40 L34,40", STEEL_D, 1.4, .9))
    o.append(V(circ(25.6, 34, 6, STONE, 1.2)))
    o.append(spec(23.4, 31.6, 2, 1.2, .55))
    # windlass + rope
    o.append(L("M62,90 Q80,96 96,98", OUT, 2.6, .75) + L("M62,90 Q80,96 96,98", ROPE, 1.4, 1))
    o.append(V(P("M93,91 L101,91 L101,105 L93,105Z", WOOD, 1.1)))
    o.append(V(circ(97, 98, 2.6, g("steelr"), .9)))
    o.append(L("M97,98 L104,91", OUT, 3.2, .75) + L("M97,98 L104,91", STEEL_D, 1.8, 1))
    o += wheel(26, 116, 10)
    o += wheel(96, 116, 10)
    # crewman cranking the windlass (right)
    o.append(tube("M107,98 L113,110 L114,122", BLUE, 7, tex="wrap"))
    o += boot(115, 125, -1, LEA, 9)
    o.append(tube("M103,98 L101,110 L103,122", BLUE, 7, tex="wrap"))
    o += boot(103, 125, -1, LEA, 9)
    o.append(part("M100,78 L110,78 L112,100 L100,100Z", LEA, folds="M104,82 Q104,92 105,98"))
    o.append(tube("M102,80 L101,88 L104,91", SKIN, 5.6))
    o += fist(104, 91, 2.8)
    o += face(106, 71, rx=6, ry=6.8, grim=True)
    o += hair_cap(106, 71, BLOND, 6.8)
    o += beard(106, 71, BLOND, 2, .75, 6.8)
    # stone carrier (left)
    o.append(tube("M10,100 L6,112 L7,122", LEA, 7))
    o += boot(7, 125, -1, LEA_D, 9)
    o.append(tube("M15,100 L17,111 L16,122", LEA, 7))
    o += boot(16, 125, -1, LEA_D, 9)
    o.append(part("M5,78 L17,78 L19,102 L5,102Z", BLUE, folds="M10,82 Q9,92 10,100"))
    o.append(V(circ(9, 95, 6.6, STONE, 1.2)))
    o.append(spec(6.6, 92.6, 2, 1.2, .55))
    o.append(tube("M15,82 L17,92 L13,97", SKIN, 5.6))
    o += fist(13, 97, 2.8)
    o += face(12, 71, rx=6, ry=6.8, grim=True)
    o += hair_cap(12, 71, GINGER, 6.8)
    o += beard(12, 71, GINGER, 3, .75, 6.8)
    return o


# ---------------------------------------------------------------- 9 Chief

def chief() -> list[str]:
    o = [shadow(60, 38)]
    # standard pole + banner (far side)
    o += shaft(22, 124, 22, 10, 3)
    o.append(V(P("M20,8 L22,1 L24,8 L22,10Z", GOLD, 1)))
    ban = "M23,12 Q36,10 50,15 L46,24 L50,33 Q36,34 23,36Z"
    o.append(part(ban, BLUE, lit="M24,13 Q30,12 34,13 L30,34 L24,34Z", folds="M34,13 Q36,24 34,34 M43,15 Q45,24 43,33", fold_col="#05101e"))
    o.append(V(P("M27,18 L42,19 L40,24 L42,29 L27,30Z", GREYH, 1)))
    o.append(V(P("M30,21.6 L37,21.6 L37,27 L30,27Z", RED, .8)))
    o.append(V(circ(22, 11, 2, g("goldr"), .9)))
    # legs
    o.append(tube("M52,82 L44,102 L42,118", BLUE, 11.5, tex="wrap"))
    o += boot(42, 125, -1, FUR_D, 13, cuff="fur", lace=False)
    o.append(tube("M68,82 L80,102 L84,118", BLUE, 11.5, tex="wrap"))
    o += boot(84, 125, -1, FUR_D, 13, cuff="fur", lace=False)
    # mail hauberk
    o.append(mail_torso("M45,46 C52,40 68,40 75,46 L79,70 L77,88 Q60,92 43,88 L41,70Z",
                        lit="M47,52 L55,50 L52,78 L45,76Z", folds="M72,52 Q78,70 76,86"))
    o += belt(43, 79, 77, 78, 4.6, GOLD)
    # far arm gripping the standard
    o.append(tube("M46,50 L34,62 L25,62", FUR, 10, tex="fur"))
    o += fist(23.6, 62, 4, 180)
    # fur mantle over the shoulders
    mant = "M38,52 C42,40 78,39 82,50 L84,62 L79,58 L75,64 L70,58 L65,64 L60,58 L55,64 L50,58 L45,64 L41,58 L37,62Z"
    o.append(part(mant, FUR, "fur", lit="M42,46 Q56,40 66,42 Q54,48 44,54Z"))
    o.append(V(circ(60, 52, 3.4, g("goldr"), 1)))
    o.append(spec(59, 51, .9, .7, .9))
    # near arm raised with the axe
    o.append(tube("M74,50 L90,44 L92,29", FUR, 10, tex="fur"))
    o += shaft(91, 33, 104, 9, 3)
    ax = "M99,11 C95,3 105,-3 112,3 C115,9 113,17 107,20 C105,15 103,13 100,14Z"
    o.append(V(P(ax, STEEL, 1.2)))
    o.append(clipped(ax, SH("M106,4 Q114,8 111,16 L107,18 Q110,10 104,6Z", "#2a3036", .45)))
    o.append(L("M106,4 C111,7 112,13 108,18", "#ffffff", .9, .8))
    o += fist(92, 30, 4, 230)
    # head: long grey hair, long beard, big horned helm
    o += long_hair(58, 30, GREYH, 20)
    o += face(58, 30, grim=True, brow="#a8a090")
    o += beard(58, 30, GREYH, 12, 1.05)
    o += horned_helm(58, 30, BRONZE, big=True)
    return o


# ---------------------------------------------------------------- 10 Settler

def settler() -> list[str]:
    o = [shadow(62, 54)]
    # --- hand cart (right) with sacks
    o += wheel(96, 112, 11, True)
    bx = "M62,86 L116,84 L114,104 L64,106Z"
    o.append(part(bx, WOOD, "grain", lit="M64,87 L114,85 L114,89 L64,91Z"))
    o.append(L("M66,92 L113,90 M66,99 L113,97", "#3a2210", 1, .6))
    o.append(iron_band(64, 96, 2.6, 20) + iron_band(114, 94, 2.6, 20))
    sacks = "M69,87 C67,72 80,65 90,70 C100,62 114,68 113,85Z"
    o.append(part(sacks, SACK, lit="M72,82 Q72,70 82,68 Q76,74 76,84Z", folds="M82,70 C84,76 84,82 82,86 M98,68 C100,76 100,82 98,86"))
    o.append(L("M80,70 L84,67 M98,66 L102,64", ROPE, 1.2, .9))
    o.append(V(P("M73,72 L82,63 L93,70 Z", RED, 1)))
    o += wheel(100, 114, 12)
    o.append(beam("M64,96 L45,86", 3.6))
    # --- man pulling the cart
    o.append(tube("M38,86 L27,102 L22,118", BLUE, 9.5, tex="wrap"))
    o += boot(22, 124, -1, LEA, 12)
    o.append(tube("M48,86 L54,104 L52,120", BLUE, 9.5, tex="wrap"))
    o += boot(52, 125, -1, LEA, 12)
    o.append(part("M31,53 C35,47 50,47 55,53 L59,72 L55,91 L33,91 L29,72Z", LEA_L,
                  lit="M33,55 L40,52 L37,78 L32,76Z", folds="M37,58 Q35,74 37,90 M50,58 Q53,74 51,90"))
    o += belt(30, 82, 58, 82, 3.8, STEEL)
    o.append(tube("M52,57 L58,73 L48,86", SKIN, 7))
    o += fist(46.6, 86.6, 3.2, 200)
    o.append(tube("M34,57 L26,70 L34,80", SKIN, 7))
    o += fist(35, 81, 3.2)
    o.append(tube("M41,44 L42,50", SKIN, 7))
    o += face(40, 40, rx=8, ry=9)
    o += beard(40, 40, BLOND, 3, .95, 9)
    o.append(V(P("M30,38 C31,29 49,29 50,38 Q40,34 30,38Z", FUR, 1.1)))
    o.append(clipped("M30,38 C31,29 49,29 50,38 Q40,34 30,38Z", fur_tex((29, 28, 51, 39))))
    # --- woman walking ahead with a bundle on her head
    o.append(part("M5,63 C7,59 20,59 22,63 L28,120 L0,120Z", DRESS,
                  lit="M7,64 L12,62 L8,110 L3,110Z", folds="M11,70 Q8,92 6,116 M18,72 Q21,94 22,116", fold_col="#2a0a04"))
    o.append(part("M8,65 L20,65 L22,80 L6,80Z", CREAM, folds="M14,66 L14,80"))
    o.append(tube("M20,66 L27,76 L22,86", DRESS, 6))
    o += fist(22, 87, 2.8)
    o.append(tube("M14,56 L14,61", SKIN, 6))
    o += long_hair(14, 52, BLOND, 12, 8.5)
    o += face(14, 52, rx=7.5, ry=8.5, brow="#8a6420")
    o += hair_cap(14, 52, BLOND, 8.5)
    o.append(part("M3,43 C3,33 25,33 25,43 Z", SACK, folds="M8,40 L20,40 M14,35 L14,43"))
    o.append(V(P("M17,118 L30,118 L30,122 L15,122Z", LEA_D, 1)))
    # --- small child trotting beside
    o.append(tube("M28,113 L24,120 L22,123", SKIN, 4.5))
    o.append(tube("M33,113 L36,119 L34,123", SKIN, 4.5))
    o.append(part("M25,102 L35,102 L37,116 L23,116Z", BLUE, folds="M30,104 L30,115"))
    o.append(tube("M34,104 L39,110", SKIN, 3.6))
    o += face(30, 96, rx=5.5, ry=6, brow="#7a3010")
    o += hair_cap(30, 96, GINGER, 6)
    return o


UNITS = {1: clubswinger, 2: spearman, 3: axeman, 4: scout, 5: paladin, 6: knight, 7: ram, 8: catapult, 9: chief, 10: settler}


def build(num: int) -> str:
    begin(f"teu{num}-")
    return svg(UNITS[num]())


def write_all(only=None, out=None):
    big = out or os.path.join(ROOT, "big")
    for num in UNITS:
        if only and num not in only:
            continue
        s = build(num)
        with open(os.path.join(big, f"teutons-{num}.svg"), "w") as fh:
            fh.write(s)
        print(f"teutons-{num}.svg: {len(s)} bytes")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    ap.add_argument("only", nargs="*", type=int)
    a = ap.parse_args()
    write_all(a.only, a.out)
