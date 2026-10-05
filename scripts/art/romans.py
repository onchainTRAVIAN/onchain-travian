#!/usr/bin/env python3
"""Generates the Roman unit art (big 120x140 + 16x16 icons) as plain SVG.

Run:  python3 scripts/art/romans.py
Writes src/web/public/img/units/big/romans-{1..10}.svg, big/hero.svg and
src/web/public/img/units/romans-{1..10}.svg.  All art is original, drawn in a
flat 2-3 tone "painterly" style with a dark outline.
"""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2] / "src/web/public/img/units"

OUT = "#3a2a14"
SW = 1.4
RED, RED_D, RED_L = "#b3261e", "#8a1c15", "#d14a3a"
STEEL, STEEL_D, STEEL_L = "#c9ced4", "#8e969e", "#eef1f4"
GOLD, GOLD_D, GOLD_L = "#d9a63a", "#a87a22", "#f1cf74"
SKIN, SKIN_D = "#e8b98a", "#c58a5c"
LEA, LEA_D, LEA_L = "#8a5a2b", "#5e3c1a", "#a8753f"
WOOD, WOOD_D, WOOD_L = "#a57443", "#6e4a26", "#c49364"
HAIR = "#4a2e18"
PURPLE, PURPLE_D = "#5c2b7d", "#3c1a54"
WHITE, WHITE_D = "#f3eee2", "#cfc6b2"
BAY, BAY_D, BAY_L = "#7a4a28", "#53301a", "#9a6238"
CHEST, CHEST_D, CHEST_L = "#b8783c", "#8a5426", "#d19b5e"
BLACK, BLACK_L = "#2b2420", "#4a3f38"
SHADOW = "rgba(0,0,0,0.18)"
FIRE, FIRE_D, FIRE_L = "#f08a1e", "#c7381b", "#ffd84a"


def P(d: str, fill: str, sw: float = SW, stroke: str = OUT) -> str:
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def S(d: str, fill: str) -> str:
    """Shading/highlight shape, no outline."""
    return f'<path d="{d}" fill="{fill}" stroke="none"/>'


def L(d: str, stroke: str, w: float = 1) -> str:
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{w}"/>'


def tube(d: str, fill: str, w: float, shade: str | None = None) -> str:
    """Outlined limb: dark stroke under a coloured stroke (round caps)."""
    s = (f'<path d="{d}" fill="none" stroke="{OUT}" stroke-width="{w + 2.8}"/>'
         f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{w}"/>')
    if shade:
        s += f'<path d="{d}" fill="none" stroke="{shade}" stroke-width="{w * 0.38}" stroke-dasharray="none" transform="translate({w * 0.26},{w * 0.2})"/>'
    return s


def circ(cx: float, cy: float, r: float, fill: str, sw: float = SW, stroke: str = OUT) -> str:
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def ell(cx: float, cy: float, rx: float, ry: float, fill: str, sw: float = SW, stroke: str = OUT, rot: float = 0) -> str:
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{t}/>'


def shadow(cx: float = 60, rx: float = 36, ry: float = 6, cy: float = 128) -> str:
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{SHADOW}"/>'


def svg(body: list[str], size: str = "0 0 120 140", defs: str = "") -> str:
    d = f"<defs>{defs}</defs>" if defs else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{size}">{d}'
            f'<g stroke-linejoin="round" stroke-linecap="round">{"".join(body)}</g></svg>')


# ---------------------------------------------------------------- shared parts

def face(cx: float, cy: float, rx: float = 8.5, ry: float = 9.5, old: bool = False) -> list[str]:
    """Head in 3/4 view looking to the viewer's left."""
    o = [ell(cx, cy, rx, ry, SKIN)]
    # shadow on the near (right) side of the face
    o.append(S(f"M{cx+1.5},{cy-ry+1.2} Q{cx+rx-0.8},{cy} {cx+1.5},{cy+ry-1.2} Q{cx+rx*0.55},{cy} {cx+1.5},{cy-ry+1.2}Z", SKIN_D))
    # ear on the near side
    o.append(ell(cx + rx - 1.5, cy + 1, 1.8, 2.6, SKIN, 1))
    # eyes
    o.append(f'<ellipse cx="{cx-4.3}" cy="{cy-0.5}" rx="1" ry="1.4" fill="{OUT}"/>')
    o.append(f'<ellipse cx="{cx+1.3}" cy="{cy-0.5}" rx="1.1" ry="1.5" fill="{OUT}"/>')
    brow = "#d8d2c4" if old else HAIR
    o.append(L(f"M{cx-6},{cy-3.2} L{cx-2.8},{cy-3.6} M{cx-0.5},{cy-3.6} L{cx+3.3},{cy-3.2}", brow, 1.2))
    # nose + mouth
    o.append(L(f"M{cx-6.6},{cy} Q{cx-8.6},{cy+3} {cx-6.2},{cy+3.6}", SKIN_D, 1))
    o.append(L(f"M{cx-5.6},{cy+5.6} Q{cx-3},{cy+6.6} {cx-0.6},{cy+5.4}", "#8a4a30", 1))
    return o


def galea(cx: float, cy: float, crest: str | None = None, rx: float = 8.5) -> list[str]:
    """Imperial helmet on a head centred at cx,cy (head top = cy-9.5)."""
    t = cy - 9.5
    o = []
    # neck guard (flares behind, to the right)
    o.append(P(f"M{cx+5},{cy-2} L{cx+rx+6},{cy+2} L{cx+rx+4.5},{cy+5.5} L{cx+rx-2},{cy+3}Z", STEEL_D, 1.1))
    # bowl
    o.append(P(f"M{cx-rx-1},{cy-3} Q{cx-rx-1},{t-2.5} {cx},{t-2.5} Q{cx+rx+1.5},{t-2.5} {cx+rx+1.5},{cy-3} Q{cx},{cy-1} {cx-rx-1},{cy-3}Z", STEEL))
    o.append(S(f"M{cx-rx+0.5},{cy-4} Q{cx-rx+0.5},{t-0.6} {cx-1},{t-0.6} Q{cx-5},{t+1} {cx-rx+0.5},{cy-4}Z", STEEL_L))
    o.append(S(f"M{cx+3},{t-1.5} Q{cx+rx+1},{t+1} {cx+rx+1},{cy-3} Q{cx+5},{cy-2.6} {cx+3},{t-1.5}Z", STEEL_D))
    # brow band
    o.append(P(f"M{cx-rx-1.5},{cy-3.6} Q{cx},{cy-5.8} {cx+rx+1.5},{cy-3.6} L{cx+rx+1.2},{cy-1.4} Q{cx},{cy-3.6} {cx-rx-1.5},{cy-1.4}Z", GOLD, 1))
    # cheek guards (near one is big, far one peeks out)
    o.append(P(f"M{cx-rx-0.5},{cy-1.6} L{cx-rx+2.6},{cy-1.4} L{cx-rx+2.2},{cy+7} L{cx-rx-0.5},{cy+5}Z", STEEL, 1))
    o.append(P(f"M{cx+2.8},{cy-1.2} L{cx+rx+1.2},{cy-1.4} L{cx+rx-0.2},{cy+8} L{cx+2.4},{cy+9.4}Z", STEEL, 1))
    o.append(S(f"M{cx+5.5},{cy} L{cx+rx-0.4},{cy-0.4} L{cx+rx-1.2},{cy+6.6} L{cx+5},{cy+7.6}Z", STEEL_D))
    if crest == "plume":  # tall feathered plume (Imperian)
        o.append(P(f"M{cx-2.5},{t-2} L{cx+2.5},{t-2} L{cx+3},{t-5} L{cx-3},{t-5}Z", GOLD, 1))
        o.append(P(f"M{cx-2.8},{t-4.5} Q{cx-7},{t-13} {cx-1.5},{t-21} Q{cx+2},{t-25} {cx+3.5},{t-20} Q{cx+6},{t-11} {cx+3},{t-4.5}Z", RED))
        o.append(S(f"M{cx-1.2},{t-5.5} Q{cx-4.5},{t-12} {cx-0.5},{t-19} Q{cx+0.5},{t-12} {cx-1.2},{t-5.5}Z", RED_L))
    elif crest == "crest":  # front-to-back horsehair crest
        o.append(P(f"M{cx-rx},{cy-4} Q{cx-rx-1},{t-10} {cx-1},{t-11} Q{cx+rx+2},{t-10} {cx+rx+4},{cy-6} Q{cx+rx+3.5},{cy-1.5} {cx+rx},{cy-3} Q{cx+rx},{t-4} {cx},{t-5} Q{cx-rx+1},{t-4.5} {cx-rx+1},{cy-3.5}Z", RED))
        o.append(S(f"M{cx-rx+1},{cy-5} Q{cx-rx},{t-8} {cx-1},{t-9} Q{cx},{t-6} {cx-rx+2},{cy-5}Z", RED_L))
        o.append(S(f"M{cx+3},{t-9} Q{cx+rx+1},{t-9} {cx+rx+2.5},{cy-6} Q{cx+rx+1},{cy-5} {cx+rx-1},{t-3.5} Q{cx+2},{t-4.5} {cx+3},{t-9}Z", RED_D))
    elif crest == "white":  # hero plume
        o.append(P(f"M{cx-rx},{cy-4} Q{cx-rx-1},{t-10} {cx-1},{t-11} Q{cx+rx+2},{t-10} {cx+rx+4},{cy-6} Q{cx+rx+3.5},{cy-1.5} {cx+rx},{cy-3} Q{cx+rx},{t-4} {cx},{t-5} Q{cx-rx+1},{t-4.5} {cx-rx+1},{cy-3.5}Z", WHITE))
        o.append(S(f"M{cx+3},{t-9} Q{cx+rx+1},{t-9} {cx+rx+2.5},{cy-6} Q{cx+rx+1},{cy-5} {cx+rx-1},{t-3.5} Q{cx+2},{t-4.5} {cx+3},{t-9}Z", WHITE_D))
    return o


def gladius(x: float, y: float, ang: float, length: float = 26) -> list[str]:
    """Short sword with the grip at x,y pointing at angle `ang` (deg, 0=right)."""
    o = []
    g = f'<g transform="translate({x},{y}) rotate({ang})">'
    o.append(g)
    o.append(P("M-7,-1.6 L-7,1.6 L-2,1.6 L-2,-1.6Z", LEA_L, 1))          # grip
    o.append(P("M-1.6,-3.4 L1.2,-3.4 L1.2,3.4 L-1.6,3.4Z", GOLD, 1))     # guard
    o.append(P(f"M1.2,-2.4 L{length-5},-2.4 L{length},0 L{length-5},2.4 L1.2,2.4Z", STEEL, 1.1))
    o.append(S(f"M1.2,-2.4 L{length-5},-2.4 L{length-0.5},0 L{length-5},-0.2 L1.2,-0.2Z", STEEL_L))
    o.append(circ(-8, 0, 2.2, GOLD, 1))                                   # pommel
    o.append("</g>")
    return o


def pteruges(x0: float, x1: float, y0: float, y1: float, n: int = 6, shade: bool = True) -> list[str]:
    """Hanging leather strips between x0..x1."""
    o = []
    w = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * w
        b = a + w - 0.6
        o.append(P(f"M{a:.1f},{y0} L{b:.1f},{y0} L{b-0.3:.1f},{y1} L{a+0.3:.1f},{y1}Z", LEA, 1))
        o.append(f'<circle cx="{(a+b)/2:.1f}" cy="{y1-1.8}" r="1" fill="{GOLD}" stroke="none"/>')
    return o


def sandal(x: float, y: float, dir: int = -1, w: float = 15, shade: str = LEA_D) -> list[str]:
    """Foot with the toes pointing left (dir=-1) or right. x,y = ankle base."""
    tx = x + dir * w * 0.6
    hx = x - dir * w * 0.4
    o = [P(f"M{hx},{y-2} Q{hx+dir*2},{y-5} {x},{y-4.5} L{tx-dir*3},{y-3.5} Q{tx+dir*1.5},{y-1.5} {tx-dir*1},{y+2} L{hx},{y+2.5}Z", SKIN, 1.2)]
    o.append(P(f"M{hx+dir*0.5},{y+1} L{tx-dir*0.5},{y+0.6} L{tx-dir*1},{y+3} L{hx},{y+3.2}Z", LEA, 1))
    o.append(L(f"M{x-dir*2},{y-4} L{x-dir*1},{y+1} M{x+dir*3},{y-3.4} L{x+dir*2.5},{y+0.8}", shade, 1))
    return o


# ---------------------------------------------------------------- 1 Legionnaire

def legionnaire() -> str:
    o = [shadow(60, 34)]
    # far (right) leg, stretched back
    o.append(tube("M70,82 L82,120", SKIN, 9))
    o += sandal(84, 122)
    # tunic + strips
    o.append(P("M47,74 L76,74 L80,93 Q62,96 44,93Z", RED))
    o.append(S("M66,76 L76,76 L79,92 Q72,94 66,93Z", RED_D))
    o += pteruges(46, 79, 74, 89, 7)
    # near (left) leg forward
    o.append(tube("M56,84 L48,102 L41,120", SKIN, 10))
    o.append(S("M52,88 L45,104 L49,104 L55,90Z", SKIN_D))
    o += sandal(41, 122)
    # torso: lorica segmentata
    o.append(P("M46,41 L78,41 L80,60 L75,77 L50,77 L45,60Z", STEEL))
    for y in (47, 53, 59, 65, 71):
        o.append(L(f"M{45 + (y-41)*0.1},{y} Q62,{y+2} {79 - (y-41)*0.12},{y}", STEEL_D, 1))
    o.append(S("M66,42 L78,42 L79.5,60 L75,76 L66,76Z", "rgba(0,0,0,0.13)"))
    o.append(S("M47,43 L54,43 L52,66 L47,60Z", "rgba(255,255,255,0.35)"))
    # belt
    o.append(P("M50,72 L75,72 L76,78 L49,78Z", LEA, 1.1))
    o.append(P("M56,72.6 L60,72.6 L60,77.4 L56,77.4Z M64,72.6 L68,72.6 L68,77.4 L64,77.4Z", GOLD, 0.8))
    # shoulder plates
    o.append(P("M66,40 Q78,36 84,44 L82,50 Q74,45 66,46Z", STEEL, 1.2))
    o.append(P("M66,44 Q77,41 83,49 L81,54 Q74,49 66,50Z", STEEL, 1.2))
    o.append(P("M58,40 Q48,36 42,44 L44,50 Q50,45 58,46Z", STEEL, 1.2))
    # neck
    o.append(tube("M59,34 L60,42", SKIN, 8))
    # far arm: thrusting the gladius low under the shield
    o.append(tube("M48,48 L42,66", RED, 9))
    o.append(tube("M44,62 L30,74", SKIN, 8))
    o.append(circ(29, 75, 4, SKIN, 1.2))
    o += gladius(29, 75, 196, 28)
    # head
    o += face(58, 25)
    o += galea(58, 25)
    # near arm reaching across to the shield handle
    o.append(tube("M74,47 L70,58", RED, 9.5))
    o.append(tube("M72,56 L58,72", SKIN, 8.5))
    # scutum (curved rectangle, tilted)
    o.append('<g transform="rotate(-8 38 76)">')
    o.append(P("M22,48 Q38,45 54,48 L54,106 Q38,109 22,106Z", RED, 1.5))
    o.append(S("M43,48.5 Q50,47 54,48 L54,106 Q50,107 43,106Z", RED_D))
    o.append(S("M23,49 Q27,48 30,48 L30,105 Q27,105.6 23,105Z", RED_L))
    o.append(P("M25,51 Q38,48.5 51,51 L51,103 Q38,105.5 25,103Z", "none", 1.2, GOLD))
    # wings / lightning motif
    o.append(S("M34,64 Q29,58 28,54 Q33,59 35,66Z M34,88 Q29,94 28,98 Q33,93 35,86Z M42,64 Q47,58 48,54 Q43,59 41,66Z M42,88 Q47,94 48,98 Q43,93 41,86Z", GOLD))
    o.append(S("M37,54 L39,54 L39,98 L37,98Z", GOLD_D))
    o.append(circ(38, 76, 6, GOLD, 1.2))
    o.append(circ(38, 76, 2.5, GOLD_L, 0.8))
    o.append("</g>")
    return svg(o)


# ---------------------------------------------------------------- 2 Praetorian

def praetorian() -> str:
    o = [shadow(60, 38)]
    # purple cloak billowing behind to the right
    o.append(P("M70,44 Q96,56 104,96 Q92,100 78,92 Q86,78 72,66Z", PURPLE))
    o.append(S("M84,58 Q100,70 102,94 Q94,96 86,90 Q92,78 82,64Z", PURPLE_D))
    # far leg (right) bent, pushed back
    o.append(tube("M70,84 L82,100 L84,118", SKIN, 9.5))
    o += sandal(86, 122)
    # tunic
    o.append(P("M48,76 L76,76 L80,94 Q62,97 46,94Z", RED))
    o += pteruges(47, 79, 76, 91, 7)
    # near leg (left) forward, bent in a crouch
    o.append(tube("M54,86 L40,100 L36,120", SKIN, 10.5))
    o.append(S("M50,90 L39,101 L43,102 L53,92Z", SKIN_D))
    o += sandal(35, 122, w=16)
    # torso: steel muscle cuirass with gold trim
    o.append(P("M46,43 L78,43 L80,62 L74,80 L50,80 L44,62Z", STEEL))
    o.append(S("M48,45 L58,45 Q54,62 56,78 L50,78 L45.5,62Z", STEEL_L))
    o.append(S("M66,45 L78,45 L79.5,62 L73.5,78 L66,78Z", STEEL_D))
    o.append(L("M62,48 Q62,70 61,78 M52,54 Q62,52 72,54 M50,64 Q62,66 74,64", STEEL_D, 1))
    o.append(P("M46,43 L78,43 L77.5,48 L46.5,48Z", GOLD, 1))
    # shoulder straps
    o.append(P("M66,40 Q78,36 83,45 L80,50 Q73,45 66,46Z", GOLD, 1.1))
    o.append(P("M58,40 Q48,37 43,45 L46,50 Q51,45 58,46Z", GOLD, 1.1))
    # neck
    o.append(tube("M60,36 L61,44", SKIN, 8))
    # far arm thrusting the spear over the shield rim
    o.append(tube("M47,53 L40,62", RED, 9))
    o.append(tube("M42,60 L32,66", SKIN, 8))
    # head (lowered, braced)
    o += face(59, 28)
    o += galea(59, 28, "crest")
    # near arm holding the shield grip (mostly hidden)
    o.append(tube("M74,49 L66,60", RED, 9.5))
    # spear (behind-right to front-left)
    o.append(L("M100,36 L12,76", OUT, 4.6))
    o.append(L("M100,36 L12,76", WOOD, 2.2))
    o.append(P("M14,76 L4,80 L0.5,78.5 L10,70 L18,73Z", STEEL, 1.2))
    o.append(S("M10,71 L18,73 L13,76.5Z", STEEL_L))
    o.append(circ(32, 67, 4.2, SKIN, 1.2))
    # big scutum, held upright and square to the enemy
    o.append(P("M20,56 Q39,52 58,56 L58,116 Q39,120 20,116Z", RED, 1.5))
    o.append(S("M46,55 Q54,54 58,56 L58,116 Q54,117 46,115Z", RED_D))
    o.append(S("M21,57 Q27,55.5 30,55.5 L30,115 Q27,116 21,115Z", RED_L))
    o.append(P("M24,59 Q39,55.5 54,59 L54,113 Q39,116.5 24,113Z", "none", 1.2, GOLD))
    o.append(S("M36,62 L42,62 L42,110 L36,110Z", GOLD_D))
    o.append(S("M32,70 Q26,64 25,60 Q30,65 33,72Z M32,102 Q26,108 25,112 Q30,107 33,100Z M46,70 Q52,64 53,60 Q48,65 45,72Z M46,102 Q52,108 53,112 Q48,107 45,100Z", GOLD))
    o.append(circ(39, 86, 6.5, GOLD, 1.2))
    o.append(circ(39, 86, 2.6, GOLD_L, 0.8))
    return svg(o)


# ---------------------------------------------------------------- 3 Imperian

def imperian() -> str:
    o = [shadow(58, 44, 5.5)]
    # cloak streaming back to the right
    o.append(P("M70,42 Q98,46 112,70 Q104,78 96,74 Q92,84 86,86 Q84,64 70,56Z", RED))
    o.append(S("M86,52 Q104,58 110,70 Q104,74 97,72 Q95,80 88,83 Q90,66 82,58Z", RED_D))
    # far leg stretched way back
    o.append(tube("M68,80 L96,116", SKIN, 9.5))
    o += sandal(100, 120, w=15)
    # tunic
    o.append(P("M44,72 L72,72 L78,90 Q60,93 40,90Z", RED))
    o += pteruges(43, 77, 72, 87, 7)
    # near leg: deep forward lunge
    o.append(tube("M50,82 L30,96 L24,120", SKIN, 10.5))
    o.append(S("M45,87 L29,98 L32,101 L48,90Z", SKIN_D))
    o += sandal(22, 122, w=16)
    # torso: steel cuirass with gold trim
    o.append(P("M42,40 L74,40 L78,58 L72,76 L46,76 L40,58Z", STEEL))
    o.append(S("M44,42 L54,42 Q51,60 52,74 L46.5,74 L41.5,58Z", STEEL_L))
    o.append(S("M62,42 L74,42 L77.5,58 L71.5,74 L62,74Z", STEEL_D))
    o.append(L("M58,46 Q57,64 58,74 M48,52 Q58,50 70,52", STEEL_D, 1))
    o.append(P("M42,40 L74,40 L73.6,45 L42.4,45Z", GOLD, 1))
    o.append(P("M46,70 L72,70 L72.6,76 L45.4,76Z", GOLD, 1))
    # shoulder plates
    o.append(P("M62,38 Q74,33 80,42 L77,48 Q70,43 62,44Z", GOLD, 1.1))
    o.append(P("M54,38 Q44,34 38,42 L41,48 Q47,43 54,44Z", GOLD, 1.1))
    # neck
    o.append(tube("M57,33 L58,41", SKIN, 8))
    # near arm: small round shield pulled back at the hip
    o.append(tube("M72,46 L80,60", RED, 9))
    o.append(tube("M78,58 L76,72", SKIN, 8))
    o.append(ell(80, 76, 10, 11.5, STEEL, 1.4, OUT, -12))
    o.append(S("M73,70 Q78,66 84,68 Q78,70 74,76Z", STEEL_L))
    o.append(ell(80, 76, 7, 8.5, "none", 1, GOLD, -12))
    o.append(circ(80, 76, 2.6, GOLD, 1))
    # head, leaning into the lunge
    o += face(55, 22)
    o += galea(55, 22, "plume")
    # far arm thrusting the gladius straight forward
    o.append(tube("M44,46 L36,52", RED, 9))
    o.append(tube("M38,50 L28,53", SKIN, 8))
    o.append(circ(27, 53, 4, SKIN, 1.2))
    o += gladius(27, 53, 186, 24)
    return svg(o)


# ---------------------------------------------------------------- horses

def hoof(x: float, y: float) -> str:
    return P(f"M{x-4},{y-4.5} L{x+4},{y-4.5} L{x+4.6},{y+0.5} L{x-4.6},{y+0.5}Z", BLACK, 1.1)


def leg(pts: list[tuple[float, float]], col: str, wu: float = 9.5, wl: float = 6.5) -> list[str]:
    (ax, ay), (bx, by), (cx, cy) = pts
    o = [tube(f"M{ax},{ay} L{bx},{by}", col, wu), tube(f"M{bx},{by} L{cx},{cy}", col, wl), hoof(cx, cy)]
    return o


def horse_head(px: float, py: float, col: str, dark: str, light: str, drop: float = 1.0, armour: bool = False) -> list[str]:
    """Head hanging from the poll at px,py; `drop` 1 = stretched low, 0.5 = head carried high."""
    mx, my = px - 22, py + 18 * drop + 4
    o = []
    # ears
    o.append(P(f"M{px-4},{py+1} L{px-2},{py-8} L{px+2},{py+1}Z", col, 1.1))
    o.append(P(f"M{px+2},{py+1} L{px+6},{py-7} L{px+8},{py+2}Z", col, 1.1))
    # head wedge
    d = (f"M{px+2},{py} Q{px+8},{py+3} {px+6},{py+11} L{mx+10},{my-2} Q{mx+4},{my+5} {mx-2},{my+3} "
         f"Q{mx-6},{my} {mx-4},{my-5} L{px-10},{py+9} Q{px-6},{py-1} {px+2},{py}Z")
    o.append(P(d, col))
    o.append(S(f"M{px-2},{py+6} L{mx+8},{my-3} L{mx+2},{my+2} Q{px-1},{py+12} {px+1},{py+8}Z", dark))
    o.append(S(f"M{px-8},{py+8} L{mx-2},{my-4} L{mx},{my-1} L{px-6},{py+11}Z", light))
    if armour:  # chamfron
        o.append(P(f"M{px-1},{py+1} Q{px+5},{py+4} {px+3},{py+11} L{mx+9},{my-3} L{mx+4},{my-6} L{px-7},{py+6}Z", STEEL, 1.1))
        o.append(S(f"M{px-4},{py+5} L{mx+6},{my-5} L{mx+7},{my-3.5} L{px-2},{py+8}Z", STEEL_L))
        o.append(circ(px - 2, py + 8, 1.8, BLACK, 0.8))
    else:
        o.append(circ(px - 3, py + 7, 1.8, BLACK, 0.8))
        o.append(f'<circle cx="{px-3.6}" cy="{py+6.4}" r="0.6" fill="#fff" stroke="none"/>')
    # nostril + mouth
    o.append(f'<ellipse cx="{mx-1}" cy="{my-1}" rx="1.2" ry="1.6" fill="{dark}" stroke="none"/>')
    o.append(L(f"M{mx-3},{my+1.5} L{mx+3},{my+2}", OUT, 0.9))
    # bridle: noseband + cheek strap
    o.append(L(f"M{mx+3},{my-5} L{mx+5},{my+2} M{mx+4},{my-2} L{px-6},{py+9}", LEA_D, 1.4))
    return o


# ---------------------------------------------------------------- 4 Equites Legati

def legati() -> str:
    o = [shadow(60, 54)]
    g = '<g transform="translate(60,128) scale(1.06) translate(-60,-128)">'
    o.append(g)
    col, dark, light, hair = CHEST, CHEST_D, CHEST_L, "#5a3414"
    # tail streaming back
    o.append(P("M98,70 Q110,62 118,68 Q112,72 117,82 Q110,76 106,84 Q107,76 98,78Z", hair, 1.2))
    # far legs
    o += leg([(40, 84), (30, 100), (40, 112)], dark, 9, 6)
    o += leg([(92, 84), (100, 100), (92, 116)], dark, 9, 6)
    # body
    o.append(P("M30,72 Q24,80 30,92 Q42,102 64,100 Q86,100 98,92 Q106,84 100,72 Q94,64 82,66 Q62,70 46,66 Q34,64 30,72Z", col))
    o.append(S("M34,90 Q50,100 70,99 Q90,98 98,90 Q90,96 66,96 Q46,97 34,90Z", dark))
    o.append(S("M42,68 Q60,72 84,68 Q62,76 44,72Z", light))
    # near legs
    o += leg([(88, 86), (102, 104), (108, 122)], col)
    o += leg([(36, 86), (22, 103), (12, 122)], col)
    # neck + mane
    o.append(P("M48,66 Q38,54 26,40 L17,50 Q26,62 32,78Z", col))
    o.append(S("M46,66 Q38,56 29,45 L24,50 Q30,62 34,76Z", dark))
    o.append(P("M28,36 Q38,34 44,42 Q50,52 56,62 Q50,58 46,54 Q40,46 33,46 Q29,44 24,40Z", hair, 1.2))
    o += horse_head(26, 40, col, dark, light, 1.0)
    # reins
    o.append(L("M8,56 Q30,56 44,62", LEA_D, 1.3))
    # saddle cloth
    o.append(P("M48,66 L80,68 L82,84 L46,84Z", RED, 1.2))
    o.append(S("M48,80 L82,80 L82,84 L46,84Z", RED_D))
    o.append(L("M60,84 L60,98", LEA_D, 1.6))
    # rider: light scout, tunic, no armour
    o.append(tube("M62,70 L50,84 L46,98", SKIN, 8))
    o += sandal(45, 101, w=12)
    o.append(P("M52,44 L70,44 L72,68 L52,68Z", WHITE))
    o.append(S("M64,46 L70,46 L71,66 L64,66Z", WHITE_D))
    o.append(S("M60,44 L63,44 L63,68 L60,68Z", RED))
    o.append(P("M52,64 L72,64 L74,76 L50,76Z", WHITE, 1.2))
    o.append(S("M52,68 L60,68 L60,76 L50,76Z", WHITE_D))
    o.append(P("M52,61 L72,61 L72,65 L52,65Z", LEA, 1))
    # near arm holding reins
    o.append(tube("M70,48 L68,58", WHITE, 9))
    o.append(tube("M69,56 L48,64", SKIN, 7.5))
    o.append(circ(46, 64, 3.6, SKIN, 1.1))
    # neck + head (bare, short hair, looking ahead)
    o.append(tube("M59,36 L60,44", SKIN, 7.5))
    o += face(58, 27)
    o.append(P("M48.5,24 Q50,15 58,14.5 Q67,15 67.5,25 Q64,21 58,21 Q53,21 48.5,24Z", HAIR))
    # far arm shading the eyes
    o.append(tube("M52,48 L43,40", WHITE, 8.5))
    o.append(tube("M44,40 L48,28", SKIN, 7))
    o.append(P("M44,22 L56,21 L57,25 L46,27Z", SKIN, 1.1))
    o.append("</g>")
    return svg(o)


# ---------------------------------------------------------------- 5 Equites Imperatoris

def imperatoris() -> str:
    o = [shadow(62, 54)]
    o.append('<g transform="translate(60,128) scale(1.04) translate(-60,-128)">')
    col, dark, light, hair = BAY, BAY_D, BAY_L, "#2a1a10"
    # cloak streaming back
    o.append(P("M70,40 Q98,42 112,62 Q102,68 94,64 Q98,78 90,84 Q86,62 72,54Z", RED))
    o.append(S("M86,48 Q104,54 110,62 Q102,66 96,64 Q98,76 91,81 Q92,64 84,56Z", RED_D))
    o.append(P("M100,72 Q112,66 118,74 Q112,78 115,88 Q108,82 104,90 Q106,80 98,80Z", hair, 1.2))
    # far legs: front reaching, hind planted
    o += leg([(46, 80), (36, 96), (30, 108)], dark, 9, 6)
    o += leg([(88, 90), (88, 108), (80, 122)], dark, 9, 6)
    # body, tilted up at the chest
    o.append(P("M34,62 Q26,70 32,84 Q46,96 68,96 Q90,98 102,92 Q110,84 104,74 Q98,66 86,70 Q66,70 48,60 Q38,56 34,62Z", col))
    o.append(S("M36,84 Q50,95 70,95 Q92,96 102,88 Q92,92 68,92 Q48,92 36,84Z", dark))
    o.append(S("M48,62 Q66,70 86,70 Q68,76 50,68Z", light))
    # near legs
    o += leg([(94, 86), (106, 104), (108, 122)], col)
    o += leg([(40, 78), (26, 88), (14, 98)], col)
    # neck up
    o.append(P("M52,62 Q42,48 32,34 L22,42 Q32,58 38,72Z", col))
    o.append(S("M50,62 Q42,52 34,40 L29,44 Q34,58 40,70Z", dark))
    o.append(P("M34,30 Q44,30 48,40 Q52,50 58,58 Q52,56 48,52 Q44,44 38,42 Q34,40 30,36Z", hair, 1.2))
    o += horse_head(30, 34, col, dark, light, 0.55)
    o.append(L("M12,52 Q32,54 46,60", LEA_D, 1.3))
    # saddle cloth
    o.append(P("M50,62 L80,66 L84,84 L46,80Z", RED, 1.2))
    o.append(S("M48,76 L84,80 L84,84 L46,80Z", RED_D))
    o.append(P("M48,58 L82,62 L82,66 L48,64Z", GOLD, 1))
    # rider leg
    o.append(tube("M66,68 L56,84 L54,98", SKIN, 8))
    o += sandal(53, 101, w=12)
    o.append(P("M50,70 L78,70 L80,80 L48,80Z", RED, 1.2))
    o += pteruges(49, 79, 70, 80, 6)
    # torso: steel cuirass
    o.append(P("M52,42 L72,42 L76,60 L74,72 L50,72 L48,60Z", STEEL))
    o.append(S("M54,44 L60,44 L58,70 L50,70 L49.5,60Z", STEEL_L))
    o.append(S("M66,44 L72,44 L75.5,60 L73.5,70 L66,70Z", STEEL_D))
    o.append(P("M52,42 L72,42 L71.6,46.5 L52.4,46.5Z", GOLD, 1))
    o.append(P("M60,37 Q50,34 46,42 L49,48 Q54,44 60,44Z", GOLD, 1.1))
    o.append(P("M64,37 Q74,34 78,42 L75,48 Q70,44 64,44Z", GOLD, 1.1))
    o.append(tube("M61,34 L62,42", SKIN, 7.5))
    # far arm: spear
    o.append(tube("M54,46 L44,52", RED, 8.5))
    o.append(tube("M46,50 L34,56", SKIN, 7.5))
    # head
    o += face(60, 25)
    o += galea(60, 25, "crest")
    # spear
    o.append(L("M94,32 L14,68", OUT, 4.6))
    o.append(L("M94,32 L14,68", WOOD, 2.2))
    o.append(P("M16,68 L6,72 L3,70 L12,62 L20,65Z", STEEL, 1.2))
    o.append(S("M12,63 L20,65 L15,68.5Z", STEEL_L))
    o.append(circ(34, 57, 3.8, SKIN, 1.1))
    # near arm with round shield
    o.append(tube("M72,47 L78,58", RED, 8.5))
    o.append(circ(80, 66, 11.5, RED, 1.4))
    o.append(S("M71,62 Q74,56 82,55 Q76,58 72,66Z", RED_L))
    o.append(circ(80, 66, 8, "none", 1, GOLD))
    o.append(circ(80, 66, 3.2, GOLD, 1))
    o.append("</g>")
    return svg(o)


# ---------------------------------------------------------------- 6 Equites Caesaris

def caesaris() -> str:
    o = [shadow(60, 54)]
    o.append('<g transform="translate(60,128) scale(1.05) translate(-60,-128)">')
    col, dark, light, hair = BLACK_L, BLACK, "#6a5c53", "#1c1612"
    # cloak
    o.append(P("M72,40 Q100,44 112,66 Q102,70 94,66 Q98,80 88,86 Q86,64 72,56Z", RED))
    o.append(S("M88,50 Q104,56 110,66 Q102,68 96,66 Q98,78 90,82 Q92,66 84,58Z", RED_D))
    o.append(P("M100,70 Q112,64 118,72 Q112,76 116,86 Q108,80 104,88 Q106,78 98,78Z", hair, 1.2))
    # far legs
    o += leg([(44, 86), (42, 106), (40, 122)], dark, 10, 7)
    o += leg([(88, 88), (86, 106), (82, 122)], dark, 10, 7)
    # body (heavy)
    o.append(P("M32,70 Q24,80 30,94 Q44,104 66,102 Q90,102 100,94 Q108,84 102,72 Q96,64 84,66 Q62,70 46,66 Q36,64 32,70Z", col))
    o.append(S("M36,92 Q50,102 70,100 Q92,100 100,92 Q92,98 66,98 Q48,98 36,92Z", dark))
    # scale barding over croup + chest
    o.append(P("M82,66 Q100,66 104,76 Q106,86 100,94 Q92,98 88,90 Q90,78 82,72Z", STEEL, 1.1))
    o.append(P("M30,72 Q24,84 32,94 Q40,92 40,80 Q42,70 36,66Z", STEEL, 1.1))
    for y in (74, 80, 86, 92):
        o.append(L(f"M86,{y} Q94,{y-2} 102,{y} M30,{y} Q35,{y-2} 40,{y}", STEEL_D, 1))
    # near legs: one front raised, hind driving
    o += leg([(92, 88), (104, 106), (106, 122)], col, 10.5, 7.5)
    o += leg([(40, 86), (28, 98), (32, 112)], col, 10.5, 7.5)
    # neck with scale cloth
    o.append(P("M50,66 Q40,52 30,38 L20,46 Q30,62 36,80Z", col))
    o.append(P("M48,68 Q40,56 32,44 L25,49 Q32,62 36,78Z", STEEL, 1.1))
    for i, (x, y) in enumerate(((30, 50), (33, 56), (36, 62), (39, 68))):
        o.append(L(f"M{x-4},{y} Q{x+2},{y-2} {x+8},{y+1}", STEEL_D, 1))
    o.append(P("M32,34 Q42,32 46,42 Q50,50 54,58 Q48,56 44,52 Q40,46 36,46 Q32,44 28,40Z", hair, 1.2))
    o += horse_head(30, 38, col, dark, light, 0.75, armour=True)
    # red crest on the chamfron
    o.append(P("M28,30 Q24,22 28,16 Q34,20 34,30Z", RED, 1.1))
    o.append(L("M14,58 Q32,58 46,64", LEA_D, 1.3))
    # saddle
    o.append(P("M48,66 L82,68 L84,86 L46,86Z", RED, 1.2))
    o.append(S("M48,80 L84,82 L84,86 L46,86Z", RED_D))
    o.append(P("M48,62 L82,64 L82,68 L48,66Z", GOLD, 1))
    # rider leg
    o.append(tube("M66,70 L56,86 L54,100", SKIN, 8))
    o += sandal(53, 103, w=12)
    o.append(P("M50,70 L78,70 L80,82 L48,82Z", RED, 1.2))
    o += pteruges(49, 79, 70, 82, 6)
    # torso: lorica segmentata
    o.append(P("M52,40 L74,40 L78,60 L74,72 L50,72 L48,60Z", STEEL))
    for y in (46, 52, 58, 64):
        o.append(L(f"M{49+(y-40)*0.1},{y} Q62,{y+2} {76+(y-40)*0.15},{y}", STEEL_D, 1))
    o.append(S("M66,42 L74,42 L77.5,60 L73.5,70 L66,70Z", "rgba(0,0,0,0.13)"))
    o.append(P("M60,36 Q50,32 46,40 L49,46 Q54,42 60,42Z", STEEL, 1.1))
    o.append(P("M64,36 Q74,32 78,40 L75,46 Q70,42 64,42Z", STEEL, 1.1))
    o.append(P("M52,40 L74,40 L73.6,44 L52.4,44Z", GOLD, 1))
    o.append(tube("M61,32 L62,40", SKIN, 7.5))
    # far arm holding the lance
    o.append(tube("M54,44 L44,50", RED, 8.5))
    o.append(tube("M46,48 L38,46", SKIN, 7.5))
    # head
    o += face(60, 22)
    o += galea(60, 22, "crest")
    # lance
    o.append(L("M110,16 L12,74", OUT, 4.4))
    o.append(L("M110,16 L12,74", WOOD, 2))
    o.append(P("M14,74 L5,78 L2,75 L10,68 L18,70Z", STEEL, 1.2))
    o.append(S("M10,68 L18,70 L13,74Z", STEEL_L))
    o.append(circ(38, 48, 3.8, SKIN, 1.1))
    # near arm with tall oval shield
    o.append(tube("M72,45 L80,56", RED, 8.5))
    o.append(ell(82, 68, 10, 14, RED, 1.4))
    o.append(S("M74,64 Q75,56 84,55 Q78,58 75,70Z", RED_L))
    o.append(ell(82, 68, 7, 10.5, "none", 1, GOLD))
    o.append(circ(82, 68, 3, GOLD, 1))
    o.append("</g>")
    return svg(o)


# ---------------------------------------------------------------- 7 Battering ram

def wheel(cx: float, cy: float, r: float, dark: bool = False) -> list[str]:
    rim, hub = (WOOD_D, WOOD) if dark else (WOOD, WOOD_L)
    o = [circ(cx, cy, r, rim)]
    o.append(circ(cx, cy, r - 3.2, "#d9c9a8" if not dark else "#b9a888", 1))
    for a in (0, 60, 120):
        import math
        dx, dy = math.cos(math.radians(a)) * (r - 3), math.sin(math.radians(a)) * (r - 3)
        o.append(L(f"M{cx-dx:.1f},{cy-dy:.1f} L{cx+dx:.1f},{cy+dy:.1f}", OUT, 1.6))
    o.append(circ(cx, cy, 2.4, hub, 1))
    return o


def crewman_pusher(x: float, y: float, scale: float = 1.0) -> list[str]:
    """Legionary leaning into a push; x,y = where the hands grip. Leans back-right."""
    o = [f'<g transform="translate({x},{y}) scale({scale})">']
    # legs stretched back
    o.append(tube("M18,22 L30,34 L36,54", SKIN, 8.5))
    o += sandal(38, 56, w=13)
    o.append(tube("M22,20 L24,40 L20,56", SKIN, 9))
    o += sandal(20, 58, w=13)
    # tunic (leaning torso)
    o.append(P("M6,-8 L26,2 L30,26 L16,30 L4,12Z", RED))
    o.append(S("M20,0 L26,2 L30,26 L20,28Z", RED_D))
    o.append(P("M12,16 L30,20 L30,26 L14,28Z", LEA, 1))
    # arms down to the grip
    o.append(tube("M10,-4 L2,6 L0,14", SKIN, 7.5))
    o.append(circ(0, 15, 3.6, SKIN, 1.1))
    o.append(tube("M14,2 L6,10 L4,18", SKIN, 7.5))
    o.append(circ(4, 19, 3.6, SKIN, 1.1))
    # head
    o.append(tube("M8,-14 L10,-6", SKIN, 7))
    o += face(6, -20)
    o += galea(6, -20)
    o.append("</g>")
    return o


def ram() -> str:
    o = [shadow(58, 54)]
    # far crewman, visible above the back of the roof
    o += crewman_pusher(72, 48, 0.82)
    o.append('<g transform="translate(0,128) scale(0.9) translate(0,-128)">')
    # far wheels
    o += wheel(26, 108, 9.5, True)
    o += wheel(80, 104, 9.5, True)
    # frame posts (far side)
    o.append(L("M30,82 L30,106 M62,80 L62,104 M88,76 L88,102", WOOD_D, 4))
    # ram log slung under the roof
    o.append(L("M10,90 L86,86", OUT, 12))
    o.append(L("M10,90 L86,86", WOOD, 9.2))
    o.append(L("M12,87 L84,83", WOOD_L, 1.8))
    o.append(L("M12,93 L84,89", WOOD_D, 1.8))
    # iron ram head
    o.append(P("M2,83 Q-1,90 2,97 L16,98 L18,91 L16,82Z", STEEL, 1.3))
    o.append(S("M4,84 L14,83 L15,88 L4,88Z", STEEL_L))
    o.append(S("M3,92 L15,92 L15,97 L4,96Z", STEEL_D))
    o.append(circ(10, 90, 2.4, STEEL_D, 1))
    o.append(L("M18,84 L18,97", OUT, 1.6))
    # ropes
    o.append(L("M28,78 L30,86 M50,77 L52,85 M72,76 L74,83", LEA_D, 1.4))
    # near frame posts + base beams
    o.append(L("M38,84 L38,108 M70,82 L70,106 M96,78 L96,104", OUT, 7.4))
    o.append(L("M38,84 L38,108 M70,82 L70,106 M96,78 L96,104", WOOD, 4.8))
    o.append(L("M30,110 L100,105", OUT, 6.2))
    o.append(L("M30,110 L100,105", WOOD, 3.8))
    # roof: gable front + near slope
    o.append(P("M8,80 L22,46 L38,82Z", WOOD_D, 1.4))
    o.append(S("M22,50 L34,80 L24,80Z", WOOD))
    o.append(P("M22,46 L94,40 L108,72 L38,82Z", LEA, 1.4))
    o.append(S("M22,46 L94,40 L98,48 L28,56Z", LEA_L))
    for t in (0.33, 0.66):
        x0, y0 = 22 + (38 - 22) * t, 46 + (82 - 46) * t
        x1, y1 = 94 + (108 - 94) * t, 40 + (72 - 40) * t
        o.append(L(f"M{x0:.1f},{y0:.1f} L{x1:.1f},{y1:.1f}", LEA_D, 1.2))
    for x in (40, 58, 76):
        y = 46 - (x - 22) * 6 / 72
        o.append(L(f"M{x},{y:.1f} L{x+14},{y+32:.1f}", LEA_D, 1))
    o.append(L("M22,46 L94,40", WOOD_D, 3))
    # near wheels
    o += wheel(40, 112, 11)
    o += wheel(98, 108, 11)
    o.append("</g>")
    # near crewman pushing at the back post
    o += crewman_pusher(84, 72, 0.9)
    return svg(o)


# ---------------------------------------------------------------- 8 Fire catapult

def catapult() -> str:
    o = [shadow(58, 52)]
    # far wheels + far beam
    o += wheel(22, 112, 8.5, True)
    o += wheel(74, 106, 8.5, True)
    o.append(L("M10,102 L88,98", OUT, 6.8))
    o.append(L("M10,102 L88,98", WOOD_D, 4.4))
    # crewman behind, winding the windlass crank
    o.append(tube("M100,86 L110,100 L112,118", SKIN, 8.5))
    o += sandal(114, 121, w=12)
    o.append(tube("M96,88 L94,104 L96,118", SKIN, 9))
    o += sandal(96, 121, w=13)
    o.append(P("M88,58 L106,62 L108,88 L90,90Z", RED))
    o.append(S("M100,60 L106,62 L108,88 L100,88Z", RED_D))
    o.append(P("M90,82 L108,80 L108,86 L90,88Z", LEA, 1))
    o.append(tube("M96,54 L97,62", SKIN, 7))
    o += face(95, 47)
    o += galea(95, 47)
    o.append(tube("M92,66 L84,76 L84,88", SKIN, 7.5))
    o.append(tube("M102,68 L92,80 L90,90", SKIN, 7.5))
    # windlass drum + crank
    o.append(L("M72,96 L84,95", OUT, 9))
    o.append(L("M72,96 L84,95", WOOD, 6))
    o.append(L("M74,94 L82,93.5 M74,97.5 L82,97", WOOD_D, 1))
    o.append(L("M84,95 L88,88 L84,88", OUT, 4.2))
    o.append(L("M84,95 L88,88 L84,88", STEEL_D, 2))
    o.append(circ(84, 88, 3.6, SKIN, 1.1))
    o.append(circ(90, 90, 3.6, SKIN, 1.1))
    # rope from the drum to the arm
    o.append(L("M72,94 Q60,80 66,56", LEA_D, 1.5))
    # torsion frame: uprights + padded crossbar
    o.append(L("M30,62 L30,108 M54,60 L54,106", OUT, 7))
    o.append(L("M30,62 L30,108 M54,60 L54,106", WOOD, 4.6))
    o.append(L("M22,64 L62,60", OUT, 7.4))
    o.append(L("M22,64 L62,60", LEA, 5))
    o.append(L("M26,63.5 L58,60.5", LEA_L, 1.4))
    # torsion skein (rope bundle) across the pivot
    o.append(L("M26,96 L60,93", OUT, 10))
    o.append(L("M26,96 L60,93", "#c9b07a", 7))
    for x in range(28, 60, 5):
        o.append(L(f"M{x},92.5 L{x+2},99", LEA, 1))
    # throwing arm, cocked back
    o.append(L("M40,96 L82,40", OUT, 7.4))
    o.append(L("M40,96 L82,40", WOOD, 4.8))
    o.append(L("M43,93 L78,45", WOOD_L, 1.2))
    # cup holding the burning stone
    o.append(P("M74,38 L88,32 L92,40 L82,48Z", STEEL_D, 1.2))
    # stone + fire
    o.append(circ(83, 31, 7.5, "#6f6a62", 1.3))
    o.append(S("M78,27 Q82,24 87,27 Q84,29 80,33Z", "#8f8a80"))
    o.append(P("M70,31 Q68,17 78,13 Q76,19 82,15 Q80,9 90,7.5 Q88,15 94,13 Q98,21 92,27 Q100,25 98,33 Q90,37 83,33 Q76,37 70,31Z", FIRE, 1.2, "#8a2a10"))
    o.append(S("M76,27 Q76,19 82,17 Q80,23 86,19 Q88,15 91,21 Q92,27 86,31 Q80,33 76,27Z", FIRE_L))
    o.append(S("M72,31 Q70,23 74,19 Q74,27 78,29Z M94,17 Q98,23 94,29 Q92,23 94,17Z", FIRE_D))
    # near base beam + wheels
    o.append(L("M16,110 L92,106", OUT, 7))
    o.append(L("M16,110 L92,106", WOOD, 4.6))
    o.append(L("M28,108 L28,96 M66,106 L66,96", WOOD_D, 3))
    o += wheel(30, 116, 9.5)
    o += wheel(82, 112, 9.5)
    return svg(o)


# ---------------------------------------------------------------- 9 Senator

def senator() -> str:
    o = [shadow(60, 30)]
    # feet
    o += sandal(50, 122, w=14)
    o += sandal(70, 122, w=14)
    # toga body
    o.append(P("M44,42 L76,42 Q84,70 82,118 L40,118 Q36,70 44,42Z", WHITE))
    o.append(S("M68,44 L76,44 Q84,70 82,118 L70,118 Q76,80 68,44Z", WHITE_D))
    o.append(L("M52,60 Q50,90 52,118 M60,70 Q58,94 60,118", WHITE_D, 1.2))
    # sinus fold draped across the body
    o.append(P("M42,74 Q60,84 80,76 Q82,92 72,102 Q56,106 40,96Z", WHITE, 1.2))
    o.append(S("M44,90 Q58,100 72,98 Q60,104 42,96Z", WHITE_D))
    o.append(P("M40,96 Q56,106 72,102 Q74,106 70,106 Q54,110 40,100Z", PURPLE, 1))
    # purple border over the near shoulder
    o.append(P("M66,42 L74,42 Q70,60 66,76 L58,76 Q62,60 66,42Z", PURPLE, 1))
    o.append(S("M70,44 L74,44 Q70,60 66,74 L62,74Z", PURPLE_D))
    # near arm holding a scroll
    o.append(tube("M74,48 L80,62 L78,78", SKIN, 8.5))
    o.append(L("M70,82 L92,78", OUT, 10))
    o.append(L("M70,82 L92,78", WHITE, 7.2))
    o.append(circ(92, 78, 3.6, WHITE_D, 1))
    o.append(circ(70, 82, 3.6, WHITE_D, 1))
    o.append(circ(79, 79, 4, SKIN, 1.2))
    # far arm raised, open palm
    o.append(tube("M48,48 L36,44 L30,30", SKIN, 8.5))
    o.append(P("M24,30 L26,20 L29,21 L29,26 L31,17 L34,18 L33,26 L36,20 L39,22 L36,30 L36,34 L28,36Z", SKIN, 1.1))
    # neck + head (old, bearded, laurel wreath)
    o.append(tube("M58,34 L59,42", SKIN, 8))
    o += face(57, 23, old=True)
    o.append(L("M50,27 L54,27.5 M51,21 L53,21.5", SKIN_D, 0.9))
    o.append(P("M48,25 Q50,38 57,38 Q65,38 66,26 Q62,31 57,32 Q52,31 48,25Z", "#e4ded0"))
    o.append(S("M57,33 Q63,32 65,27 Q62,34 56,35Z", WHITE_D))
    o.append(P("M48,21 Q49,11 57,10.5 Q65,11 66,21 Q62,16 57,16 Q52,16 48,21Z", "#d9d3c4"))
    for i, (x, y, r) in enumerate(((48, 20, -70), (50, 15, -45), (54, 12, -20), (60, 12, 20), (64, 15, 45), (66, 20, 70))):
        o.append(ell(x, y, 3.2, 1.6, "#4f8a2e", 0.9, OUT, r))
    return svg(o)


# ---------------------------------------------------------------- 10 Settler

def settler() -> str:
    o = [shadow(60, 48)]
    # --- woman, behind right, basket on her head
    o.append(tube("M96,96 L94,120", SKIN, 7))
    o += sandal(93, 122, w=11)
    o.append(P("M84,54 L108,54 L114,120 L82,120Z", "#c9743a"))
    o.append(S("M100,56 L108,56 L114,120 L100,120Z", "#9a5224"))
    o.append(L("M92,70 Q90,96 90,118 M98,76 Q98,98 100,118", "#9a5224", 1.1))
    o.append(P("M86,52 L106,52 L106,58 L86,58Z", LEA, 1))
    o.append(tube("M92,40 L93,52", SKIN, 7))
    o += face(93, 32, rx=7.5, ry=8.5)
    o.append(P("M85,30 Q86,20 93,19.5 Q101,20 101,30 Q97,26 93,26 Q89,26 85,30Z", HAIR))
    o.append(P("M100,30 Q104,40 100,50 Q98,40 100,30Z", HAIR, 1.1))
    # basket
    o.append(P("M80,14 L106,14 L103,24 L83,24Z", WOOD_L, 1.2))
    o.append(L("M82,18 L104,18 M84,21.5 L102,21.5", WOOD_D, 1))
    o.append(P("M82,10 Q93,6 104,10 L106,14 L80,14Z", "#c23a2a", 1.1))
    o.append(P("M84,9 Q92,4 100,9 Z", "#d9a63a", 1))
    # arms: one steadying the basket, one holding the child's hand
    o.append(tube("M104,56 L110,40 L104,22", SKIN, 7))
    o.append(circ(102, 20, 3.4, SKIN, 1))
    # --- man, centre, big bundle on his back
    o.append(ell(78, 50, 14, 17, WHITE_D, 1.4, OUT, -10))
    o.append(S("M68,40 Q78,34 88,42 Q84,36 72,36Z", WHITE))
    o.append(L("M66,56 Q78,60 90,52 M72,42 L74,66", LEA, 1.3))
    o.append(tube("M64,78 L72,100 L76,120", SKIN, 9))
    o += sandal(78, 122, w=14)
    o.append(P("M50,42 L72,42 L76,90 Q62,94 46,90Z", LEA_L))
    o.append(S("M64,44 L72,44 L76,88 L66,90Z", LEA))
    o.append(P("M50,70 L74,70 L74.5,76 L49.5,76Z", LEA_D, 1))
    o.append(tube("M56,80 L46,100 L40,120", SKIN, 9.5))
    o += sandal(39, 122, w=14)
    # strap over the shoulder
    o.append(L("M66,42 Q58,52 54,70", LEA, 3))
    # near arm gripping the strap
    o.append(tube("M70,48 L68,64 L58,66", SKIN, 8))
    o.append(circ(56, 66, 3.8, SKIN, 1.1))
    # far arm down to the child
    o.append(tube("M50,48 L42,62 L36,78", SKIN, 8))
    # head
    o.append(tube("M60,34 L61,42", SKIN, 7.5))
    o += face(60, 25)
    o.append(P("M50.5,22 Q52,13 60,12.5 Q69,13 69.5,23 Q66,19 60,19 Q55,19 50.5,22Z", HAIR))
    o.append(P("M46,22 Q50,14 60,13 Q72,14 74,22 L72,25 Q60,21 48,25Z", LEA_L, 1.1))
    # --- child in front, holding hand
    o.append(tube("M26,100 L22,120", SKIN, 6))
    o += sandal(21, 122, w=9)
    o.append(tube("M30,100 L34,120", SKIN, 6))
    o += sandal(35, 122, w=9)
    o.append(P("M22,82 L36,82 L38,104 L20,104Z", "#6d8f3a"))
    o.append(S("M31,84 L36,84 L38,104 L32,104Z", "#4c6a24"))
    o.append(tube("M35,86 L38,78", SKIN, 5.5))
    o.append(circ(37, 77, 3.4, SKIN, 1))
    o.append(tube("M22,86 L18,96", SKIN, 5.5))
    o.append(tube("M29,76 L29,82", SKIN, 6))
    o += face(28, 70, rx=6.5, ry=7)
    o.append(P("M21.5,68 Q22,61 28,60.5 Q35,61 35,69 Q31,66 28,66 Q25,66 21.5,68Z", HAIR))
    return svg(o)


# ---------------------------------------------------------------- Hero

def hero() -> str:
    o = [shadow(60, 36)]
    # crimson cloak billowing to the right
    o.append(P("M66,40 Q100,46 110,86 Q100,104 84,100 Q94,80 76,66Z", RED_D))
    o.append(S("M84,54 Q104,64 106,86 Q98,98 88,96 Q94,78 80,62Z", "#6e140f"))
    o.append(S("M68,42 Q80,44 88,54 Q78,52 68,50Z", RED))
    # far leg back
    o.append(tube("M68,82 L80,102 L84,120", SKIN, 10))
    o += sandal(86, 122, w=15)
    # tunic + strips
    o.append(P("M46,72 L76,72 L80,92 Q62,96 42,92Z", RED))
    o += pteruges(45, 79, 72, 89, 7)
    # near leg forward
    o.append(tube("M54,84 L44,100 L38,120", SKIN, 10.5))
    o.append(S("M50,88 L43,102 L47,103 L54,90Z", SKIN_D))
    o += sandal(37, 122, w=16)
    # muscle cuirass
    o.append(P("M44,40 L78,40 L82,60 L76,76 L48,76 L42,60Z", STEEL))
    o.append(S("M46,42 L57,42 Q54,60 56,74 L48,74 L43.5,60Z", STEEL_L))
    o.append(S("M66,42 L78,42 L81.5,60 L75.5,74 L66,74Z", STEEL_D))
    o.append(L("M62,46 Q61,66 61,74 M50,52 Q62,50 74,52 M48,62 Q62,65 76,62", STEEL_D, 1))
    o.append(P("M44,40 L78,40 L77.6,45 L44.4,45Z", GOLD, 1))
    o.append(P("M48,70 L76,70 L76.6,76 L47.4,76Z", GOLD, 1))
    o.append(P("M66,37 Q80,33 86,42 L83,48 Q74,43 66,44Z", GOLD, 1.1))
    o.append(P("M56,37 Q44,33 38,42 L41,48 Q49,43 56,44Z", GOLD, 1.1))
    # neck
    o.append(tube("M60,32 L61,40", SKIN, 8))
    # far arm raised straight up with the sword
    o.append(tube("M46,44 L37,34", RED, 9))
    o.append(tube("M39,36 L38,25", SKIN, 8))
    o.append(circ(38, 23, 4.2, SKIN, 1.2))
    o += gladius(38, 23, -90, 19)
    # head
    o += face(58, 24)
    o += galea(58, 24, "white")
    # near arm with round shield
    o.append(tube("M76,46 L84,60", RED, 9.5))
    o.append(tube("M82,58 L80,70", SKIN, 8.5))
    o.append(circ(84, 78, 14, RED, 1.5))
    o.append(S("M72,74 Q74,66 84,64 Q76,68 73,80Z", RED_L))
    o.append(circ(84, 78, 10, "none", 1.2, GOLD))
    o.append(S("M84,68 L86,76 L94,78 L86,80 L84,88 L82,80 L74,78 L82,76Z", GOLD))
    o.append(circ(84, 78, 3.2, GOLD_L, 1))
    return svg(o)


# ---------------------------------------------------------------- 16x16 icons

IW = 0.6


def I(d: str, fill: str, sw: float = IW, stroke: str = OUT) -> str:
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def ic(cx: float, cy: float, r: float, fill: str, sw: float = IW) -> str:
    return circ(cx, cy, r, fill, sw)


def isvg(body: list[str]) -> str:
    return svg(body, "0 0 16 16")


def i_bust(cx: float, cy: float, helm: str = "steel") -> list[str]:
    """Head + galea for icons; cx,cy = face centre."""
    o = [ic(cx, cy, 3.4, SKIN)]
    o.append(f'<circle cx="{cx-1.2}" cy="{cy+0.2}" r="0.55" fill="{OUT}"/>')
    o.append(I(f"M{cx-3.8},{cy-0.6} Q{cx-3.8},{cy-5.4} {cx},{cy-5.4} Q{cx+3.8},{cy-5.4} {cx+3.8},{cy-0.6} L{cx+5.2},{cy+1.4} L{cx+3.4},{cy+1.6}Z", STEEL))
    o.append(I(f"M{cx-3.9},{cy-1.2} Q{cx},{cy-2.4} {cx+3.9},{cy-1.2} L{cx+3.9},{cy-0.2} Q{cx},{cy-1.4} {cx-3.9},{cy-0.2}Z", GOLD, 0.4))
    o.append(I(f"M{cx+1.2},{cy-0.3} L{cx+3.8},{cy-0.4} L{cx+3.3},{cy+3.4} L{cx+1},{cy+3.8}Z", STEEL, 0.5))
    return o


def icon_legionnaire() -> str:
    o = i_bust(9.5, 7.2)
    o.append(I("M6.5,11 L14.5,11 L15,15.8 L6,15.8Z", STEEL))
    o.append(L("M6.6,12.6 L14.6,12.6 M6.5,14.2 L14.8,14.2", STEEL_D, 0.5))
    o.append(I("M1.2,5.2 Q4,4.6 6.8,5.2 L6.8,15.4 Q4,16 1.2,15.4Z", RED, 0.7))
    o.append(I("M2.2,6.3 Q4,5.9 5.8,6.3 L5.8,14.3 Q4,14.7 2.2,14.3Z", "none", 0.5, GOLD))
    o.append(ic(4, 10.3, 1.4, GOLD, 0.4))
    return isvg(o)


def icon_praetorian() -> str:
    o = [I("M10,8 Q15.5,9 15.5,15.8 L9,15.8 Q12,12 9.5,10Z", PURPLE, 0.6)]
    o.append(I("M5.5,10.6 L13.5,10.6 L14,15.8 L5,15.8Z", STEEL))
    o.append(I("M5.5,10.6 L13.5,10.6 L13.6,11.8 L5.4,11.8Z", GOLD, 0.4))
    o += i_bust(9.5, 7.2)
    o.append(I("M5.6,6.5 Q5.4,0.6 9.6,0.8 Q13.8,1 14.2,6 Q12.5,3.2 9.5,3 Q6.8,3 5.6,6.5Z", RED))
    o.append(L("M15.2,3.6 L1,11.6", WOOD, 1.1))
    o.append(I("M2.6,10.4 L0.6,12.4 L0.4,11.2 L1.8,9.8Z", STEEL, 0.4))
    o.append(I("M0.8,8 Q3.6,7.4 6.4,8 L6.4,15.6 Q3.6,16.2 0.8,15.6Z", RED, 0.7))
    o.append(ic(3.6, 11.8, 1.3, GOLD, 0.4))
    return isvg(o)


def icon_imperian() -> str:
    o = [I("M10,8 Q15.8,9 15.8,15.8 L9.5,15.8 Q12,12 9.5,10Z", RED, 0.6)]
    o.append(I("M5,11.4 L13,11.4 L13.6,15.8 L4.4,15.8Z", STEEL))
    o.append(I("M5,11.4 L13,11.4 L13.1,12.6 L4.9,12.6Z", GOLD, 0.4))
    o.append(S("M5.6,13.2 L8.4,13.2 L8,15.4 L5.2,15.4Z", STEEL_L))
    o += i_bust(8.6, 8.4)
    o.append(I("M7.4,3.2 Q5.4,1.4 7.4,0.4 Q9.8,1 9.6,3.2Z", RED, 0.5))
    o.append(L("M1.2,13.4 L6.2,10.2", STEEL, 1.4))
    o.append(L("M1.2,13.4 L6.2,10.2", STEEL_L, 0.5))
    o.append(L("M6.6,10.6 L7.8,9.8", GOLD, 1.3))
    return isvg(o)


def i_horse_head(col: str, dark: str, armour: bool = False) -> list[str]:
    o = [I("M11.6,3.4 L13.4,0.6 L14.2,3.8Z", col, 0.5)]
    o.append(I("M8.6,4 L10.4,1.2 L11.6,4.6Z", col, 0.5))
    o.append(I("M8.6,4 Q13.6,2.6 15,6.2 L15.6,15.8 L9.4,15.8 L9.2,9.4 Q5.4,9.6 1.4,13 Q0.2,10.2 1.6,8.4 Q5,4.6 8.6,4Z", col))
    o.append(S("M10.4,9.6 L15.2,10 L15.6,15.8 L9.6,15.8Z", dark))
    if armour:
        o.append(I("M9,5 Q12.6,4.6 13.4,7.2 Q13.6,9.4 11.4,9.6 L5.2,10 Q3.6,9.6 4,8 Q6,5.4 9,5Z", STEEL, 0.5))
        o.append(I("M11.2,4.6 Q10.6,2.2 12,0.4 Q13.8,2.4 13.2,5Z", RED, 0.5))
    o.append(f'<circle cx="11.6" cy="6.3" r="0.85" fill="{OUT}"/>')
    o.append(f'<ellipse cx="2.6" cy="10.8" rx="0.5" ry="0.8" fill="{dark}"/>')
    o.append(L("M3.6,12.2 L4,8.6", LEA_D, 0.6))
    return o


def icon_legati() -> str:
    o = i_horse_head(CHEST, CHEST_D)
    o.append(I("M9,4.2 Q13,2.4 15.4,5.2 L15.6,8 Q13,5 10,6Z", "#5a3414", 0.5))
    return isvg(o)


def icon_imperatoris() -> str:
    o = i_horse_head(BAY, BAY_D)
    o.append(I("M9,4.2 Q13,2.4 15.4,5.2 L15.6,8 Q13,5 10,6Z", "#2a1a10", 0.5))
    o.append(L("M15.4,10.6 L2.4,15.4", WOOD, 1))
    o.append(I("M3.4,14.6 L1,16 L0.8,15 L2.4,13.6Z", STEEL, 0.4))
    return isvg(o)


def icon_caesaris() -> str:
    o = i_horse_head(BLACK_L, BLACK, armour=True)
    o.append(I("M9.4,11 L15.4,11 L15.6,15.8 L9.6,15.8Z", STEEL, 0.5))
    o.append(L("M9.6,12.6 L15.4,12.6 M9.6,14.2 L15.5,14.2", STEEL_D, 0.5))
    return isvg(o)


def icon_ram() -> str:
    o = [I("M1.4,10.6 L9.2,10.6 L9.6,12.6 L1.6,12.6Z", WOOD)]
    o.append(I("M0.6,9.6 L2.6,9.6 L2.8,13.4 L0.6,13.4Z", STEEL, 0.5))
    o.append(I("M2,9.2 L5,3 L8,9.2Z", WOOD_D))
    o.append(I("M5,3 L14,2.4 L15.6,8.6 L8,9.2Z", LEA))
    o.append(L("M6.2,5 L14.6,4.4 M7.2,7.2 L15.2,6.6", LEA_D, 0.5))
    o.append(ic(4.6, 13.4, 2.1, WOOD))
    o.append(ic(12.2, 12.8, 2.1, WOOD))
    o.append(ic(4.6, 13.4, 0.6, WOOD_D, 0.3))
    o.append(ic(12.2, 12.8, 0.6, WOOD_D, 0.3))
    return isvg(o)


def icon_catapult() -> str:
    o = [L("M1.4,12.4 L12.6,11.8", WOOD, 1.4)]
    o.append(L("M3,11.6 L3,7.2 M6.4,11.4 L6.4,7", WOOD, 1.2))
    o.append(L("M1.8,7.4 L7.6,7", LEA, 1.2))
    o.append(L("M4.6,11 L12,4", WOOD, 1.4))
    o.append(ic(4, 14, 1.8, WOOD))
    o.append(ic(11, 13.6, 1.8, WOOD))
    o.append(I("M9.4,5.2 Q8.4,1 11.4,0.4 Q11,2.4 13.4,1.4 Q15.6,3.6 14,6 Q11.6,7.2 9.4,5.2Z", FIRE, 0.5, "#8a2a10"))
    o.append(ic(12, 4.4, 1.9, "#6f6a62", 0.5))
    return isvg(o)


def icon_senator() -> str:
    o = [I("M2.6,15.8 Q3.2,10 8,9.6 Q12.8,10 13.4,15.8Z", WHITE)]
    o.append(I("M8.4,9.8 L10.2,10.2 Q9.2,13 9.6,15.8 L7.6,15.8 Q7.4,12.6 8.4,9.8Z", PURPLE, 0.4))
    o.append(ic(8, 5.6, 3.4, SKIN))
    o.append(f'<circle cx="6.8" cy="5.4" r="0.55" fill="{OUT}"/>')
    o.append(I("M4.6,6.4 Q5.4,10.4 8,10.4 Q10.8,10.4 11.4,6.4 Q9.6,8.2 8,8.2 Q6.4,8.2 4.6,6.4Z", "#e4ded0", 0.5))
    o.append(I("M4.6,4.6 Q4.8,1.4 8,1.4 Q11.2,1.4 11.4,4.6 Q9.6,3.2 8,3.2 Q6.4,3.2 4.6,4.6Z", "#d9d3c4", 0.5))
    o.append(L("M4.4,4.4 Q7.6,0.4 11.6,4.4", "#4f8a2e", 1.4))
    return isvg(o)


def icon_settler() -> str:
    o = [I("M9.4,8.6 L14.4,8.6 L15.4,15.8 L8.8,15.8Z", "#c9743a")]
    o.append(ic(12, 6, 2.6, SKIN))
    o.append(I("M9.4,5.8 Q9.6,3.2 12,3.2 Q14.4,3.2 14.6,5.8 Q13.4,4.8 12,4.8 Q10.6,4.8 9.4,5.8Z", HAIR, 0.5))
    o.append(I("M9.6,1 L14.4,1 L14,3.4 L10,3.4Z", WOOD_L, 0.5))
    o.append(ell(9.2, 8.6, 2.4, 3, WHITE_D, 0.6))
    o.append(I("M2.4,9.4 L8.4,9.4 L9,15.8 L1.8,15.8Z", LEA_L))
    o.append(ic(5.2, 6.2, 3, SKIN))
    o.append(f'<circle cx="4.2" cy="6.2" r="0.5" fill="{OUT}"/>')
    o.append(I("M2.2,5.6 Q2.4,2.6 5.2,2.6 Q8,2.6 8.2,5.6 Q6.6,4.4 5.2,4.4 Q3.8,4.4 2.2,5.6Z", HAIR, 0.5))
    o.append(I("M0.6,5.6 Q2.4,2 5.2,2 Q8.2,2 9.8,5.6 L9,6.2 Q5.2,4.4 1.4,6.2Z", LEA_L, 0.5))
    return isvg(o)


# ---------------------------------------------------------------- output

BIG = {
    1: legionnaire,
    2: praetorian,
    3: imperian,
    4: legati,
    5: imperatoris,
    6: caesaris,
    7: ram,
    8: catapult,
    9: senator,
    10: settler,
    'hero': hero,
}
ICONS: dict = {
    1: icon_legionnaire, 2: icon_praetorian, 3: icon_imperian, 4: icon_legati, 5: icon_imperatoris,
    6: icon_caesaris, 7: icon_ram, 8: icon_catapult, 9: icon_senator, 10: icon_settler,
}


def main() -> None:
    big = ROOT / "big"
    for n, fn in BIG.items():
        name = "hero.svg" if n == "hero" else f"romans-{n}.svg"
        (big / name).write_text(fn())
    for n, fn in ICONS.items():
        (ROOT / f"romans-{n}.svg").write_text(fn())


if __name__ == "__main__":
    main()
