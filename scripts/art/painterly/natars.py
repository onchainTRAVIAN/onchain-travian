#!/usr/bin/env python3
"""Painterly Natar unit art: src/web/public/img/units/big/natars-N.svg (120x140).

Run: python3 scripts/art/painterly/natars.py [out_dir] [unit numbers...]
Same poses / identities as the flat set (scripts/art/natars.py), redrawn with real
anatomy (tapered muscular limbs, hands gripping weapons, faces, armour plates that
follow the body, horses with proper legs/necks/manes) and painted with nnpaint
(gradients, volume filter, metal sheen, cloth folds, soft shadow).
Natar colours: deep purple #5b2d8e + gold #d4a43a over blackened steel.
The 16x16 icons (units/natars-N.svg) stay with scripts/art/natars.py.  Original art.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nnpaint import (OUT, begin, svg, P, S, SG, SH, L, LS, V, circ, ell, dot, spec, rivet, clip, limb,  # noqa: E402
                     limb_hair, hair, scales, glint, eye, beady, shadow, blob, curve, poly_d, lt, dk, mix, n)

ROOT = Path(__file__).resolve().parents[3] / "src/web/public/img/units"

PU, PUD, PUL = "#5b2d8e", "#381a5c", "#9466c4"     # purple cloth
GO, GOD, GOL = "#d4a43a", "#9a6e1e", "#f6d985"     # gold
ST, STD, STL = "#6c7383", "#3e434f", "#c3cad6"     # blackened steel
SK, SKD, SKL = "#e2b38a", "#b07c56", "#f8dab8"     # skin
LE, LED = "#7a4e2a", "#4a2e16"                     # leather
WO, WOD, WOL = "#a57443", "#6a4523", "#d2a474"     # wood
HO, HOD, HOL = "#3a3036", "#1e181c", "#6e626a"     # dark horse
BEARD = "#3a2a22"
MODES = {GO: "metal", GOD: "metal", ST: "metal", STD: "metal", STL: "metal", PU: "satin", PUD: "satin", PUL: "satin",
         SK: "rad", HO: "rad"}


def start(k):
    begin(f"nat{k}-", MODES, seed=k)


# ------------------------------------------------------------------ figure parts

def face(cx, cy, r=8, beard=False, old=False):
    """head in 3/4 view looking to the viewer's left"""
    o = [V(ell(cx, cy, r * .88, r, SK),
           SH(f"M{n(cx + r * .2)},{n(cy - r * .9)} Q{n(cx + r * .95)},{n(cy)} {n(cx + r * .2)},{n(cy + r * .92)} "
              f"Q{n(cx + r * .6)},{n(cy)} {n(cx + r * .2)},{n(cy - r * .9)}Z", SKD, .7),
           ell(cx + r * .72, cy + r * .1, r * .18, r * .28, SK, .8))]
    o.append(spec(cx - r * .5, cy + r * .38, r * .28, r * .18, .35, 0, "#d26a4a"))
    ey = cy - r * .05
    o.append(f'<ellipse cx="{n(cx - r * .48)}" cy="{n(ey)}" rx="{n(r * .12)}" ry="{n(r * .17)}" fill="#24160c"/>')
    o.append(f'<ellipse cx="{n(cx + r * .14)}" cy="{n(ey)}" rx="{n(r * .13)}" ry="{n(r * .18)}" fill="#24160c"/>')
    o.append(dot(cx - r * .52, ey - r * .06, r * .045, "#fff", .9) + dot(cx + r * .1, ey - r * .06, r * .05, "#fff", .9))
    brow = "#cfc8bc" if old else "#3a2416"
    o.append(L(f"M{n(cx - r * .72)},{n(ey - r * .32)} L{n(cx - r * .3)},{n(ey - r * .38)} M{n(cx - r * .02)},{n(ey - r * .38)} "
               f"L{n(cx + r * .38)},{n(ey - r * .32)}", brow, r * .13, .95))
    o.append(L(f"M{n(cx - r * .72)},{n(cy)} Q{n(cx - r * 1.02)},{n(cy + r * .34)} {n(cx - r * .7)},{n(cy + r * .4)}", SKD, r * .11, .9))
    o.append(L(f"M{n(cx - r * .62)},{n(cy + r * .64)} Q{n(cx - r * .35)},{n(cy + r * .74)} {n(cx - r * .08)},{n(cy + r * .62)}",
               "#8a4a30", r * .1, .85))
    if beard:
        bc = "#d8d2c4" if old else BEARD
        bd = (f"M{n(cx - r * .9)},{n(cy + r * .2)} Q{n(cx - r * .95)},{n(cy + r * 1.5)} {n(cx - r * .1)},{n(cy + r * 1.7)} "
              f"Q{n(cx + r * .75)},{n(cy + r * 1.45)} {n(cx + r * .82)},{n(cy + r * .25)} Q{n(cx + r * .5)},{n(cy + r * .95)} "
              f"{n(cx)},{n(cy + r * .92)} Q{n(cx - r * .3)},{n(cy + r * .72)} {n(cx - r * .62)},{n(cy + r * .78)} Q{n(cx - r * .8)},{n(cy + r * .5)} "
              f"{n(cx - r * .9)},{n(cy + r * .2)}Z")
        o.append(V(P(bd, bc)))
        o.append(L(" ".join(f"M{n(cx + r * k)},{n(cy + r * .95)} Q{n(cx + r * (k - .05))},{n(cy + r * 1.3)} {n(cx + r * (k - .12))},{n(cy + r * 1.55)}"
                            for k in (-.6, -.35, -.1, .15, .4)), lt(bc, .35), .5, .7))
        o.append(P(f"M{n(cx - r * .74)},{n(cy + r * .62)} Q{n(cx - r * .4)},{n(cy + r * .42)} {n(cx - r * .05)},{n(cy + r * .6)} "
                   f"Q{n(cx - r * .4)},{n(cy + r * .74)} {n(cx - r * .74)},{n(cy + r * .62)}Z", bc, .7))
    return o


def helm(cx, cy, r=8, crest=True, spiked=False):
    """tall angular Natar helmet over a head centred at cx,cy"""
    top = cy - r * 2.7
    o = []
    bowl = (f"M{n(cx - r * 1.12)},{n(cy - r * .05)} L{n(cx - r * .95)},{n(cy - r * 1.1)} L{n(cx - r * .12)},{n(top)} "
            f"L{n(cx + r * .6)},{n(cy - r * 1.35)} L{n(cx + r * 1.15)},{n(cy - r * .1)} Q{n(cx)},{n(cy - r * .55)} "
            f"{n(cx - r * 1.12)},{n(cy - r * .05)}Z")
    o.append(V(P(bowl, ST)))
    o.append(SH(f"M{n(cx + r * .05)},{n(cy - r * 1.6)} L{n(cx + r * .6)},{n(cy - r * 1.35)} L{n(cx + r * 1.1)},{n(cy - r * .2)} "
                f"L{n(cx + r * .5)},{n(cy - r * .3)}Z", "#14161c", .55))
    o.append(L(f"M{n(cx - r * .85)},{n(cy - r * 1.05)} L{n(cx - r * .18)},{n(top + r * .35)}", "#ffffff", .7, .7))
    o.append(spec(cx - r * .6, cy - r * 1.3, r * .2, r * .5, .7, 25))
    # gold brow band + crest fin
    o.append(P(f"M{n(cx - r * 1.18)},{n(cy - r * .42)} Q{n(cx)},{n(cy - r * .85)} {n(cx + r * 1.2)},{n(cy - r * .5)} "
               f"L{n(cx + r * 1.2)},{n(cy - r * .2)} Q{n(cx)},{n(cy - r * .52)} {n(cx - r * 1.18)},{n(cy - r * .1)}Z", GO, .8))
    o.append(L(f"M{n(cx - r * 1.05)},{n(cy - r * .4)} Q{n(cx - r * .4)},{n(cy - r * .66)} {n(cx + r * .2)},{n(cy - r * .7)}", GOL, .5, .9))
    for k in (-.7, 0, .7):
        o.append(rivet(cx + r * k, cy - r * (.42 if k else .6) + (r * .06 if k > 0 else 0), r * .07))
    # nasal guard + cheek plates
    o.append(P(f"M{n(cx - r * .62)},{n(cy - r * .4)} L{n(cx - r * .42)},{n(cy - r * .4)} L{n(cx - r * .48)},{n(cy + r * .32)} "
               f"L{n(cx - r * .62)},{n(cy + r * .26)}Z", ST, .7))
    o.append(V(P(f"M{n(cx - r * 1.12)},{n(cy - r * .1)} L{n(cx - r * .78)},{n(cy - r * .12)} L{n(cx - r * .74)},{n(cy + r * .95)} "
                 f"L{n(cx - r * 1.05)},{n(cy + r * .8)}Z", ST, .8),
               P(f"M{n(cx + r * .62)},{n(cy - r * .2)} L{n(cx + r * 1.18)},{n(cy - r * .18)} L{n(cx + r * 1.1)},{n(cy + r * 1.05)} "
                 f"L{n(cx + r * .58)},{n(cy + r * 1.0)}Z", ST, .8)))
    o.append(rivet(cx + r * .88, cy + r * .4, r * .07))
    if crest:
        o.append(V(P(f"M{n(cx - r * .55)},{n(cy - r * 1.6)} L{n(cx - r * .12)},{n(top - r * .35)} L{n(cx + r * .35)},{n(cy - r * 1.62)} "
                     f"L{n(cx - r * .12)},{n(cy - r * 1.4)}Z", GO, .8)))
        o.append(glint(cx - r * .2, top + r * .3, r * .1))
    if spiked:
        for k in range(5):
            a = math.radians(200 + 35 * k)
            bx, by = cx + math.cos(a) * r * 1.0, cy - r * 1.2 + math.sin(a) * r * .9
            tx, ty = cx + math.cos(a) * r * 1.8, cy - r * 1.2 + math.sin(a) * r * 1.7
            px, py = -math.sin(a) * 1.8, math.cos(a) * 1.8
            o.append(P(f"M{n(bx + px)},{n(by + py)} L{n(tx)},{n(ty)} L{n(bx - px)},{n(by - py)}Z", STL, .7))
    return o


def arm(sh, el, wr, col=PU, w=8.4, armour=None):
    """two-segment muscular arm; armour = colour of a vambrace on the forearm"""
    o = [limb([sh, el, wr], [w, w * .78, w * .58], col, bulge=[w * .22, w * .14])]
    if armour:
        mx, my = el[0] + (wr[0] - el[0]) * .25, el[1] + (wr[1] - el[1]) * .25
        o.append(limb([(mx, my), (wr[0] + (el[0] - wr[0]) * .12, wr[1] + (el[1] - wr[1]) * .12)], [w * .86, w * .7], armour,
                      lit=STL))
    return o


def fist(x, y, r=3.6, ang=0, col=SK):
    """closed hand gripping (knuckles toward ang)"""
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    o = V(P(blob([(x - uy * r, y + ux * r), (x + ux * r * .9 - uy * r * .6, y + uy * r * .9 + ux * r * .6),
                  (x + ux * r * 1.05, y + uy * r * 1.05), (x + ux * r * .9 + uy * r * .7, y + uy * r * .9 - ux * r * .7),
                  (x + uy * r, y - ux * r), (x - ux * r * .8, y - uy * r * .8)], .9), col, .9))
    o += L(" ".join(f"M{n(x + ux * r * .45 + uy * r * k)},{n(y + uy * r * .45 - ux * r * k)} l{n(ux * r * .5)},{n(uy * r * .5)}"
                    for k in (-.45, 0, .45)), SKD if col == SK else dk(col, .5), .5, .7)
    return o


def leg(hip, knee, ankle, col=PU, w=10.5, greave=ST):
    o = [limb([hip, knee, ankle], [w, w * .76, w * .55], col, bulge=[w * .2, w * .16])]
    if greave:
        o.append(limb([(knee[0] + (ankle[0] - knee[0]) * .08, knee[1] + (ankle[1] - knee[1]) * .08), ankle],
                      [w * .84, w * .64], greave, lit=STL))
        o.append(V(circ(knee[0], knee[1], w * .42, greave, .8)))
        o.append(dot(knee[0] - w * .14, knee[1] - w * .14, w * .12, "#ffffff", .7))
    return o


def boot(x, y, d=-1, w=14, col=STD):
    """armoured sabaton: ankle at x,y-5, sole at y, toe toward d"""
    tx = x + d * w * .62
    hx = x - d * w * .38
    o = [V(P(f"M{n(hx)},{n(y - 6)} Q{n(x)},{n(y - 8)} {n(x + d * 2)},{n(y - 6.4)} L{n(tx - d * 2)},{n(y - 3.6)} "
             f"Q{n(tx + d * 1)},{n(y - 2)} {n(tx)},{n(y + .6)} L{n(hx)},{n(y + .6)}Z", col))]
    o.append(L(f"M{n(x + d * 1.6)},{n(y - 6)} L{n(x + d * 3.6)},{n(y)} M{n(x + d * 4.6)},{n(y - 5)} L{n(x + d * 6.4)},{n(y)}",
               "#14161c", .6, .7))
    o.append(L(f"M{n(hx + d * 1)},{n(y - 5.4)} Q{n(x)},{n(y - 7.2)} {n(x + d * 2.4)},{n(y - 5.8)}", STL, .6, .8))
    o.append(P(f"M{n(hx)},{n(y - .4)} L{n(tx)},{n(y - .2)} L{n(tx)},{n(y + 1.2)} L{n(hx)},{n(y + 1.2)}Z", "#1e1810", .6))
    return o


def plate(d, col=ST, lines=()):
    """armour plate with engraved lines + edge highlight"""
    o = [V(P(d, col))]
    if lines:
        o.append(clip(d, L(" ".join(lines), "#1a1c22", .9, .7)
                      + L(" ".join(ln.replace("M", "M") for ln in lines), STL, .5, .45).replace('d="', 'transform="translate(.5,.9)" d="')))
    return o


def folds(d, dark=PUD, light=PUL, dl="", w=1.1):
    s = LS(d, dk(dark, .3), w, .55)
    if dl:
        s += LS(dl, light, w * .7, .55)
    return s


def pauldron(x, y, sx=1, s=1.0, col=GO):
    """layered shoulder guard; sx=1 -> sits on the left shoulder pointing outwards left"""
    o = []
    for k in (2, 1, 0):
        yy = y + k * 3.4 * s
        d = (f"M{n(x + sx * 7 * s)},{n(yy - 3 * s)} Q{n(x - sx * 3 * s)},{n(yy - 6 * s)} {n(x - sx * 9 * s)},{n(yy + 1 * s)} "
             f"L{n(x - sx * 8 * s)},{n(yy + 4 * s)} Q{n(x - sx * 2 * s)},{n(yy - 1.6 * s)} {n(x + sx * 7 * s)},{n(yy + 1 * s)}Z")
        o.append(V(P(d, col if k == 0 else (GOD if col == GO else STD), .8)))
    o.append(L(f"M{n(x + sx * 5 * s)},{n(y - 3.6 * s)} Q{n(x - sx * 3 * s)},{n(y - 5.6 * s)} {n(x - sx * 7.6 * s)},{n(y)}",
               GOL if col == GO else STL, .6, .9))
    o.append(rivet(x, y - 1.6 * s, .7 * s))
    return o


def spikes(cx, cy, r, k, a0, span, ln, col=STL):
    o = ""
    for i in range(k):
        a = math.radians(a0 + span * i / max(k - 1, 1))
        ca, sa = math.cos(a), math.sin(a)
        o += P(f"M{n(cx + ca * r - sa * 2.2)},{n(cy + sa * r + ca * 2.2)} L{n(cx + ca * (r + ln))},{n(cy + sa * (r + ln))} "
               f"L{n(cx + ca * r + sa * 2.2)},{n(cy + sa * r - ca * 2.2)}Z", col, .7)
    return o


def shaft(a, b, w=3.2, col=WO):
    """wooden shaft with lit edge + grain"""
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy)
    nx, ny = -dy / ln, dx / ln
    if nx + ny * .6 > 0:
        nx, ny = -nx, -ny
    d = f"M{n(a[0])},{n(a[1])} L{n(b[0])},{n(b[1])}"
    return (L(d, OUT, w + 1.8, .75) + L(d, col, w, 1)
            + L(f"M{n(a[0] + nx * w * .25)},{n(a[1] + ny * w * .25)} L{n(b[0] + nx * w * .25)},{n(b[1] + ny * w * .25)}", lt(col, .5), w * .3, .8)
            + L(f"M{n(a[0] - nx * w * .28)},{n(a[1] - ny * w * .28)} L{n(b[0] - nx * w * .28)},{n(b[1] - ny * w * .28)}", dk(col, .4), w * .25, .7))


# ------------------------------------------------------------------ horses

def hoof(x, y, col="#221a16"):
    return (P(f"M{n(x - 3)},{n(y - 4.2)} L{n(x + 3)},{n(y - 4.2)} Q{n(x + 3.8)},{n(y - 2)} {n(x + 4.2)},{n(y + .5)} "
              f"L{n(x - 4.2)},{n(y + .5)} Q{n(x - 3.8)},{n(y - 2)} {n(x - 3)},{n(y - 4.2)}Z", col, .9)
            + L(f"M{n(x - 2.6)},{n(y - 3.4)} Q{n(x - 3.2)},{n(y - 1.6)} {n(x - 3.4)},{n(y)}", "#8a7c70", .6, .7))


def hleg(pts, col, w=10, feather=None):
    """horse leg: muscular forearm/gaskin, slim cannon, fetlock knob, hoof at the last point"""
    a, b, c = pts
    fx_, fy_ = b[0] + (c[0] - b[0]) * .78, b[1] + (c[1] - b[1]) * .78
    o = [limb([a, b, (fx_, fy_), (c[0], c[1] - 3)], [w, w * .52, w * .5, w * .42], col, bulge=[w * .3, 0, 0])]
    o.append(V(circ(fx_, fy_, w * .32, col, .8)))
    o.append(hoof(c[0], c[1] + 1))
    return o


def mane(d, strands, col="#1a1216", hi="#7a6a74"):
    return [V(P(d, col)), L(strands, hi, .5, .6)]


def horse_head(px, py, col, dark, drop=1.0, armour=None):
    """head hanging from the poll at px,py, muzzle down-left; drop 1 = stretched low, .5 = carried high"""
    mx, my = px - 22, py + 18 * drop + 4
    o = [P(f"M{n(px - 4)},{n(py + 1)} L{n(px - 2)},{n(py - 8)} L{n(px + 2)},{n(py + 1)}Z", col, .9),
         P(f"M{n(px + 2)},{n(py + 1)} L{n(px + 6)},{n(py - 7)} L{n(px + 8)},{n(py + 2)}Z", col, .9)]
    d = (f"M{n(px + 2)},{n(py)} Q{n(px + 8)},{n(py + 3)} {n(px + 6)},{n(py + 11)} L{n(mx + 10)},{n(my - 2)} "
         f"Q{n(mx + 4)},{n(my + 5)} {n(mx - 2)},{n(my + 3)} Q{n(mx - 6)},{n(my)} {n(mx - 4)},{n(my - 5)} "
         f"L{n(px - 10)},{n(py + 9)} Q{n(px - 6)},{n(py - 1)} {n(px + 2)},{n(py)}Z")
    o.append(V(P(d, col)))
    o.append(SH(f"M{n(px - 2)},{n(py + 6)} L{n(mx + 8)},{n(my - 3)} L{n(mx + 2)},{n(my + 2)} Q{n(px - 1)},{n(py + 12)} {n(px + 1)},{n(py + 8)}Z", dark, .7))
    o.append(SH(f"M{n(px - 8)},{n(py + 8)} L{n(mx - 2)},{n(my - 4)} L{n(mx)},{n(my - 1)} L{n(px - 6)},{n(py + 11)}Z", "#fff0d8", .3))
    o.append(LS(f"M{n(px + 1)},{n(py + 5)} Q{n(px + 4)},{n(py + 9)} {n(px - 1)},{n(py + 12)}", "#0c0808", 1.1, .5))
    if armour:
        o.append(V(P(f"M{n(px - 1)},{n(py + 1)} Q{n(px + 5)},{n(py + 4)} {n(px + 3)},{n(py + 11)} L{n(mx + 9)},{n(my - 3)} "
                     f"L{n(mx + 4)},{n(my - 6)} L{n(px - 7)},{n(py + 6)}Z", armour, .9)))
        o.append(spec(px - 4, py + 6, 3.4, 1.4, .7, -35))
        o.append(L(f"M{n(px - 5)},{n(py + 5)} L{n(mx + 5)},{n(my - 5)}", GO, 1, .9))
        o.append(dot(px - 2, py + 8, 1.6, "#0c0808"))
        o.append(P(f"M{n(px - 4)},{n(py + 1)} L{n(px - 7)},{n(py - 10)} L{n(px)},{n(py + 1)}Z", GO, .7))
    else:
        o.append(dot(px - 3, py + 7, 1.7, "#0c0808") + dot(px - 3.6, py + 6.4, .55, "#fff", .9))
    o.append(f'<ellipse cx="{n(mx - 1)}" cy="{n(my - 1)}" rx="1.2" ry="1.6" fill="#0c0808" stroke="none"/>')
    o.append(L(f"M{n(mx - 3)},{n(my + 1.5)} L{n(mx + 3)},{n(my + 2)}", OUT, .9))
    o.append(L(f"M{n(mx + 3)},{n(my - 5)} L{n(mx + 5)},{n(my + 2)} M{n(mx + 4)},{n(my - 2)} L{n(px - 6)},{n(py + 9)}", "#2a1a0c", 1.4, 1))
    o.append(rivet(mx + 4.2, my - 2, .7) + rivet(px - 6, py + 9, .7))
    return o


def horse_body(d, col, shade_d, hi_d, muscles, dark):
    return [V(P(d, col), SH(shade_d, dark, .7), SH(hi_d, "#fff0d8", .3, "soft2"), LS(muscles, "#0c0808", 1.1, .45),
              clip(d, hair((20, 50, 112, 112), 10, 50, 4, [lt(col, .25)], seed=7, op=.35)))]


# ======================================================================== 1 Pikeman
def pikeman():
    start(1)
    o = [shadow(58, 40)]
    # back leg straight back + boot
    o += leg((66, 80), (75, 100), (81, 118), PUD, 10.5)
    o += boot(84, 125, 1, 14)
    # back arm reaching down the shaft
    o += arm((76, 54), (88, 72), (72, 90), PU, 8.6, armour=ST)
    # torso: breastplate following the chest over a purple gambeson
    o.append(V(P("M44,50 Q58,44 74,47 L80,66 Q78,78 72,86 L50,86 Q42,76 40,66Z", PU)))
    o.append(folds("M48,74 Q50,80 50,86 M70,74 Q70,80 72,86", dl="M46,72 Q47,80 47,86"))
    o += plate("M46,50 Q58,45 72,48 L76,62 Q70,76 60,78 Q50,76 44,62Z", ST,
               ["M60,49 Q61,62 60,77", "M47,62 Q60,66 75,62", "M50,70 Q60,73 70,70"])
    o.append(spec(52, 54, 3, 4.4, .55, 20) + glint(50, 52, .9))
    o.append(L("M46,50 Q58,45 72,48", GO, 1.6, 1) + L("M47,49.4 Q58,44.8 70,47.2", GOL, .5, .9))
    o.append(P("M50,84 L72,84 L73,91 L49,91Z", LE, .9))
    o.append(V(P("M57,83 L65,83 L66,92 L56,92Z", GO, .8)) + glint(58.6, 85, .6))
    o += pauldron(72, 46, -1, 1.0)
    # front leg braced forward
    o += leg((54, 84), (44, 102), (39, 118), PU, 11)
    o += boot(36, 125, -1, 15)
    # head
    o.append(limb([(60, 36), (61, 46)], [8, 8.4], SK))
    o.append(SH("M56,42 L65,42 L65,46 L56,46Z", "#2a1406", .4))
    o += face(59, 32, 8.4)
    o += helm(59, 32, 8.4)
    # pike
    o.append(shaft((86, 128), (24, 16), 3.4))
    o.append(V(P("M24,18 Q17,13 14,2 Q22,8 27,15Z M14,2 Q11,10 16,20 L20,22Z", ST, .9)))
    o.append(V(P("M13.4,1.6 L21,9 L27,16 L20,22 L15,20 Q11,10 13.4,1.6Z", ST, .9)))
    o.append(L("M14.4,3.6 L18,15", "#ffffff", .6, .8) + glint(15.4, 6, .9))
    o.append(V(P("M19,21 L27,15 L30,19.6 L22,25.4Z", GO, .8)))
    # front arm with pauldron, hand gripping the shaft
    o += pauldron(46, 49, 1, 1.0)
    o += arm((44, 56), (32, 66), (46, 61), PU, 8.6, armour=ST)
    o.append(fist(49, 59, 3.8, -60))
    o.append(fist(70, 92, 3.8, -60))
    # tower shield standing at his side
    sh = "M14,64 Q26,58 38,59 Q41,62 41,66 L41,118 Q40,124 36,126 L16,126 Q12,124 11,118 L11,70 Q11,66 14,64Z"
    o.append(V(P(sh, PU), SH("M30,61 L38,59 Q41,62 41,66 L41,118 Q40,124 36,126 L31,126Z", "#1a0a2a", .5, "soft2"),
               SH("M14,68 L19,64 L20,120 L14,122Z", "#c8a8ea", .45, "soft2")))
    o.append(P("M16,67 Q26,62 36,63 L37,120 L17,122Z", "none", 1.6, GO))
    o.append(L("M16.6,67.4 Q26,62.4 35,63.4", GOL, .5, .9))
    o.append(V(P("M26,77 L35,92 L26,107 L17,92Z", GO, .9)))
    o.append(S("M26,77 L26,107 L35,92Z", GOD, .5))
    o.append(V(circ(26, 92, 3, PUD, .8)) + dot(25, 91, .8, PUL))
    o.append(glint(22, 85, .8) + glint(15, 70, .6))
    for y in (68, 120):
        o.append(rivet(15, y, .8) + rivet(37, y - 2, .8))
    return svg(o)


# ======================================================================== 2 Thorned Warrior
def thorned():
    start(2)
    o = [shadow(60, 40)]
    o += leg((70, 84), (84, 100), (93, 116), STD, 11, greave=ST)
    o += boot(97, 124, 1, 15)
    o += leg((52, 84), (38, 100), (31, 116), STD, 11, greave=ST)
    o += boot(28, 124, -1, 15)
    # torso: heavy steel plates, purple tabard, chest spikes
    tp = "M40,52 Q58,46 76,48 L84,66 Q80,80 72,90 L48,90 Q40,80 38,68Z"
    o += plate(tp, ST, ["M40,72 Q60,76 84,70", "M42,80 Q60,84 80,79", "M46,60 Q58,62 66,58"])
    o.append(spec(46, 58, 2, 5, .55, 15))
    o.append(V(P("M52,58 Q59,56 66,57 L64,90 L52,90Z", PU)))
    o.append(folds("M56,62 Q55,76 56,90 M61,63 Q60,78 61,90", dl="M54,62 Q53,76 54,88"))
    o.append(P("M46,88 L74,88 L76,95 L44,95Z", GO, .9) + glint(50, 90, .6))
    o.append(spikes(59, 72, 3, 3, 190, 100, 5))
    # buckler arm (front) with spiked buckler
    o += arm((44, 56), (30, 66), (30, 80), ST, 9)
    o.append(V(circ(26, 84, 12, STD)))
    o.append(spikes(26, 84, 12, 8, 0, 315, 5))
    o.append(V(circ(26, 84, 7.6, ST)))
    o.append(L("M26,84 m-11,0 a11,11 0 0 1 22,0", STL, .6, .5))
    o.append(V(circ(26, 84, 2.8, GO, .8)) + glint(21.6, 79, .9))
    # spiked pauldrons
    o += pauldron(42, 52, 1, 1.0, ST)
    o.append(spikes(42, 49, 3, 3, 200, 90, 6))
    o += pauldron(80, 48, -1, 1.0, ST)
    o.append(spikes(80, 45, 3, 3, 250, 90, 6))
    # head: neck, face, spiked helm
    o.append(limb([(58, 40), (58, 50)], [8, 8.4], SK))
    o += face(57, 35, 8, beard=True)
    o += helm(57, 35, 8, crest=False, spiked=True)
    # flail arm raised high, swing in progress
    o += arm((78, 52), (94, 40), (92, 22), ST, 9)
    o.append(shaft((96, 28), (88, 6), 3))
    o.append(fist(92, 20, 4, -100, STD))
    # chain arcing to the spiked ball
    ch = "M88,6 C74,0 56,2 42,14"
    o.append(L(ch, OUT, 3.6, .7) + L(ch, ST, 2.2, 1) + L(ch, STL, 1.6, .9).replace('d=', 'stroke-dasharray="2.2 1.4" d='))
    o.append(V(circ(36, 18, 9, STD)))
    o.append(spikes(36, 18, 9, 8, -90, 315, 5))
    o.append(V(circ(36, 18, 8.4, ST)))
    o.append(spec(33, 14.6, 2.6, 1.8, .8, -30) + glint(32.4, 14.4, 1))
    return svg(o)


# ======================================================================== 3 Guardsman
def guardsman():
    start(3)
    o = [shadow(58, 42)]
    o += leg((70, 84), (84, 102), (92, 118), PUD, 11.5)
    o += boot(95, 125, 1, 15)
    # sword arm raised behind, blade up-right
    o += arm((78, 56), (96, 48), (91, 32), ST, 9.4)
    o.append(L("M90,30 L112,1", OUT, 5, .75) + L("M90,30 L112,1", ST, 3.6, 1) + L("M90.6,28.6 L111,2", "#f4f6fa", 1.1, .9))
    o.append(glint(104, 11, 1))
    o.append(V(P("M82,31 L98,29 L97,34 L83,36Z", GO, .8)))
    o.append(V(circ(88, 40, 3.4, GO)))
    o.append(fist(90, 31, 4.2, -55, STD))
    # torso
    tp = "M42,52 Q60,46 78,50 L86,70 Q82,82 74,92 L48,92 Q40,82 38,70Z"
    o += plate(tp, ST, ["M42,76 Q60,80 84,74"])
    o.append(spec(46, 60, 2, 5, .55, 10))
    o.append(V(P("M50,58 Q60,55 70,56 L66,90 L54,90Z", PU)))
    o.append(folds("M56,76 Q55,84 56,90 M64,76 Q64,84 63,90", dl="M54,64 Q54,74 55,84"))
    o.append(V(P("M54,62 L66,61 L60,77Z", GO, .8)) + glint(57, 64, .7))
    o.append(P("M46,90 L76,90 L78,97 L44,97Z", GO, .9))
    o.append(V(P("M40,97 L80,97 L84,105 L36,105Z", PUD)))
    o.append(L("M48,97.6 L46,104.6 M56,97.6 L55,104.6 M64,97.6 L64,104.6 M72,97.6 L73,104.6", "#120820", .8, .8))
    o += leg((52, 88), (39, 104), (34, 118), PU, 12)
    o += boot(31, 125, -1, 16)
    o += pauldron(80, 50, -1, 1.05)
    o.append(limb([(60, 38), (61, 48)], [8.4, 8.8], SK))
    o += face(59, 34, 8.6)
    o += helm(59, 34, 8.6)
    o += pauldron(44, 52, 1, 1.05)
    # shield arm, then the big rectangular shield
    o += arm((44, 58), (30, 68), (34, 80), ST, 9.4)
    sh = "M10,47 Q28,42 46,43 L48,118 Q30,120 12,122Z"
    o.append(V(P(sh, PU), SH("M38,44 L46,43 L48,118 L40,119Z", "#1a0a2a", .5, "soft2"),
               SH("M13,52 L21,50 L21,116 L13,118Z", "#c8a8ea", .45, "soft2")))
    o.append(P("M15,51 Q29,47 42,47.6 L43,114 L16,117Z", "none", 1.8, GO))
    o.append(L("M15.6,51.4 Q29,47.4 41,48", GOL, .5, .9))
    o.append(V(P("M28,60 L40,82 L28,104 L16,82Z", GO, .9)))
    o.append(S("M28,60 L28,104 L40,82Z", GOD, .5))
    o.append(V(circ(28, 82, 3.6, PUD, .8)) + dot(27, 81, 1, PUL))
    o.append(V(P("M14,62 L22,60 L18,70Z M14,100 L22,102 L18,94Z", GO, .7)))
    o.append(glint(24, 70, 1) + glint(16, 52, .6))
    for (x, y) in ((15, 51), (42, 48), (16, 116), (43, 113)):
        o.append(rivet(x, y, .8))
    return svg(o)


# ======================================================================== 4 Birds of Prey (eagle)
def eagle():
    start(4)
    F, FD, FL, GN = "#5e3e20", "#38220f", "#9a6c3a", "#d8b468"
    o = [shadow(62, 17, 3.6, 131, .25)]

    def feather(root, tip, w, col):
        dx, dy = tip[0] - root[0], tip[1] - root[1]
        ln = math.hypot(dx, dy)
        ux, uy = dx / ln, dy / ln
        px, py = -uy, ux
        pts = [(root[0] + px * w * .4, root[1] + py * w * .4), (root[0] + ux * ln * .55 + px * w * .55, root[1] + uy * ln * .55 + py * w * .55),
               (tip[0] - ux * 1.2 + px * w * .25, tip[1] - uy * 1.2 + py * w * .25), (tip[0], tip[1]),
               (tip[0] - ux * 1.6 - px * w * .3, tip[1] - uy * 1.6 - py * w * .3),
               (root[0] + ux * ln * .5 - px * w * .5, root[1] + uy * ln * .5 - py * w * .5), (root[0] - px * w * .4, root[1] - py * w * .4)]
        return (P(blob(pts, .8), col, .8)
                + L(f"M{n(root[0] + ux * 2)},{n(root[1] + uy * 2)} L{n(tip[0] - ux * 2)},{n(tip[1] - uy * 2)}", lt(col, .45), .5, .7)
                + L(f"M{n(root[0] + ux * ln * .3 - px * w * .25)},{n(root[1] + uy * ln * .3 - py * w * .25)} "
                    f"L{n(tip[0] - ux * 2 - px * w * .15)},{n(tip[1] - uy * 2 - py * w * .15)}", dk(col, .4), .6, .6))

    def wing(sx):
        X = lambda x: x if sx > 0 else 120 - x  # noqa: E731
        Pt = lambda p: (X(p[0]), p[1])  # noqa: E731
        fe = ""
        # secondaries along the forearm (back), trailing edge down toward the tail
        for i, (r, t) in enumerate((((26, 42), (16, 54)), ((32, 47), (24, 62)), ((38, 52), (32, 70)), ((44, 57), (40, 78)),
                                    ((50, 62), (48, 84)))):
            fe += feather(Pt(r), Pt(t), 7, F if i % 2 else FD)
        # primaries fanning from the wrist
        for i, t in enumerate(((14, 50), (8, 44), (3, 36), (1, 29), (3, 22))):
            fe += feather(Pt((22, 38)), Pt(t), 6, FD if i % 2 else F)
        o.append(V(fe))
        # coverts (wing shoulder) with scalloped feathers
        cov = blob([(X(56), 64), (X(46), 52), (X(32), 40), (X(18), 32), (X(10), 28), (X(16), 38), (X(28), 48), (X(40), 58), (X(52), 70)], .8)
        o.append(V(P(cov, F), clip(cov, scales((min(X(8), X(58)), 26, max(X(8), X(58)), 72), 5, FD, .6, .65)),
                   SH(f"M{n(X(50))},{n(66)} Q{n(X(36))},{n(54)} {n(X(20))},{n(38)} Q{n(X(34))},{n(48)} {n(X(48))},{n(60)}Z", "#fff0d0", .35)))
        o.append(LS(f"M{n(X(52))},{n(61)} Q{n(X(32))},{n(42)} {n(X(10))},{n(28)}", "#fff0d0", 1.1, .5))

    wing(-1)
    # tail fan
    for i, a in enumerate((-30, -15, 0, 15, 30)):
        r = math.radians(90 + a)
        x2, y2 = 64 + math.cos(r) * 26, 94 + math.sin(r) * 26
        d = blob([(62, 94), (66, 94), (x2 + 2.6, y2 - 1), (x2, y2 + 1.4), (x2 - 2.6, y2 - 1)], .7)
        o.append(V(P(d, F if i % 2 else FD, .8)))
        o.append(L(f"M64,96 L{n(x2)},{n(y2 - 1)}", FL, .5, .7))
    # body
    bd = blob([(60, 58), (70, 64), (74, 80), (70, 94), (62, 98), (52, 94), (48, 80), (50, 66)])
    o.append(V(P(bd, F), clip(bd, scales((46, 60, 76, 100), 4.2, FD, .55, .6)),
               SH("M66,62 Q74,76 70,92 Q66,96 62,96 Q72,80 66,62Z", FD, .6)))
    # legs (feathered trousers) + yellow feet with black talons
    for (x0, y0, x1, y1) in ((54, 90, 48, 104), (64, 92, 66, 106)):
        o.append(limb([(x0, y0), ((x0 + x1) / 2, (y0 + y1) / 2), (x1, y1)], [9, 7, 4.4], F, tex=lambda d, r: limb_hair(r, [FD, FL], ln=2.4, every=2)))
        o.append(limb([(x1, y1 - 2), (x1 - .6, y1 + 3)], [3.6, 3], GN))
        for (dx, dy) in ((-7, 5), (-2, 8), (5, 6), (2, -4)):
            tip = (x1 + dx, y1 + 3 + dy * .9)
            o.append(L(f"M{n(x1)},{n(y1 + 3)} L{n(tip[0])},{n(tip[1])}", OUT, 3.2, .8) + L(f"M{n(x1)},{n(y1 + 3)} L{n(tip[0])},{n(tip[1])}", GN, 1.8, 1))
            o.append(L(f"M{n(tip[0])},{n(tip[1])} q{n(dx * .2)},{n(1.6)} {n(dx * .05 - .6)},{n(2.6)}", "#1a1210", 1.2, 1))
    wing(1)
    # head: golden nape, hooked beak to the left, fierce brow
    hd = blob([(46, 52), (52, 46), (62, 45), (71, 50), (73, 60), (68, 67), (56, 68), (47, 62)], .9)
    o.append(V(P(hd, "#b88a4a"), clip(hd, hair((44, 44, 74, 70), 160, 40, 3, ["#7a5428", "#f0d090"], seed=4, op=.55)),
               SH("M64,47 Q74,54 70,64 Q66,67 62,67 Q70,58 64,47Z", "#5a3a18", .6)))
    o.append(V(P("M48,54 Q40,52 34,57 Q31,62 33,67 Q35,63 38,62 L48,62Z", "#e8c050", .9),
               P("M38,62 Q40,66 46,65 L48,61Z", "#c89a30", .8)))
    o.append(P("M33,67 Q32,62 35,59 Q34,63 35.6,66Z", "#2a1c10", .6))
    o.append(L("M37,58.4 L45,56.6", "#fff8d0", .6, .8))
    o.append(eye(52, 56, 2.4, "#f0c040"))
    o.append(P("M46,52.6 Q52,50 58,53 Q52,52.4 47,55Z", "#3a2410", .8))
    return svg(o)


# ======================================================================== 5 Axerider
def gallop_horse(col=HO, dark=HOD, cloth=True):
    o = []
    o += mane("M96,78 Q108,70 116,78 Q110,82 116,94 Q108,88 104,96 Q104,86 96,86Z",
              "M100,79 Q108,74 113,79 M101,82 Q108,82 110,90 M100,84 Q103,88 103,93")
    o += hleg([(42, 96), (30, 104), (16, 110)], dark, 9)
    o += hleg([(88, 96), (102, 108), (111, 120)], dark, 9)
    o += horse_body("M30,82 Q26,92 34,100 Q50,110 70,108 Q90,106 98,96 Q104,86 98,76 Q90,68 76,70 Q58,72 44,68 Q32,68 30,82Z", col,
                    "M34,98 Q50,108 70,106 Q90,104 98,94 Q88,102 68,102 Q48,102 34,98Z",
                    "M44,70 Q60,74 80,70 Q60,78 46,74Z M84,72 Q96,72 98,80 Q92,78 86,80Z",
                    "M38,80 Q44,88 40,98 M86,78 Q82,88 88,96 M54,102 Q66,98 80,102", dark)
    o += hleg([(92, 94), (106, 110), (116, 124)], col, 10)
    o += hleg([(44, 94), (28, 108), (10, 116)], col, 10)
    # arched neck thrust forward-low + flowing mane
    o.append(V(P("M50,72 Q40,62 30,50 L22,58 Q28,72 36,86Z", col)))
    o.append(SH("M48,72 Q40,64 32,55 L28,58 Q34,70 38,82Z", dark, .6))
    o.append(LS("M26,58 Q32,68 36,78", "#fff0d8", 1.3, .3))
    o += mane("M30,46 Q42,44 48,54 Q54,62 60,72 Q52,70 48,64 Q42,56 36,56 Q32,54 26,50Z",
              "M33,47 Q42,48 46,56 M36,52 Q44,56 50,64 M40,54 Q48,60 54,70", PUD, "#9a6ac8")
    o += horse_head(28, 48, col, dark, .9)
    o.append(L("M10,66 Q34,68 60,72", "#2a1a0c", 1.3, 1))
    if cloth:
        o.append(V(P("M52,70 L84,72 L88,94 L56,96Z", PU)))
        o.append(folds("M62,76 Q63,86 62,95 M74,76 Q76,86 76,94", dl="M58,76 Q59,86 58,94"))
        o.append(L("M54,74 L84,75.6 M56,93 L87,91", GO, 1.6, 1))
        o.append(L("M56,96 l0,1.8 M60,95.8 l0,1.8 M64,95.6 l0,1.8 M68,95.4 l0,1.8 M72,95.2 l0,1.8 M76,95 l0,1.8 M80,94.6 l0,1.8 M84,94.4 l0,1.8",
                   GOD, .8, .9))
    return o


def axerider():
    start(5)
    o = [shadow(62, 52, 6)]
    o += gallop_horse()
    # rider: back arm raised with the double axe
    o += arm((74, 56), (88, 44), (95, 26), PU, 8.4, armour=ST)
    o.append(shaft((98, 26), (82, 1), 3))
    for (dd, sp) in (("M81,9 C70,4 66,16 71,24 L84,15Z", (74, 12)), ("M88,1 C100,-2 106,8 101,15 L88,8Z", (97, 4))):
        o.append(V(P(dd, ST)))
        o.append(spec(sp[0], sp[1], 2.4, 1.4, .7, -30))
    o.append(L("M80,9.6 C72,6.4 68,14 71.6,21 M89,1.6 C99,-.4 104,6 101.6,12", "#ffffff", .6, .9))
    o.append(V(circ(85, 9, 2, GO, .7)))
    o.append(fist(95, 24, 3.8, -100))
    # near leg in the stirrup
    o += leg((70, 82), (62, 98), (56, 108), PUD, 10)
    o += boot(54, 113, -1, 12)
    # torso leaning forward: scale coat + purple
    tp = "M62,58 Q72,52 82,52 L86,76 L64,82Z"
    o.append(V(P(tp, PU)))
    o.append(clip(tp, scales((60, 52, 88, 84), 3.4, PUD, .55, .7, hi=PUL)))
    o.append(SH("M76,54 L82,52 L86,76 L77,78Z", "#1a0a2a", .5))
    o.append(V(P("M62,77 L86,75 L88,83 L62,85Z", GO, .9)) + glint(66, 79, .6))
    o += pauldron(70, 52, -1, .9)
    o.append(limb([(67, 42), (68, 50)], [7, 7.4], SK))
    o += face(66, 36, 7.4, beard=True)
    o += helm(66, 36, 7.4)
    # front arm holding the reins
    o += pauldron(62, 58, 1, .85)
    o += arm((63, 61), (50, 67), (40, 70), PU, 8, armour=ST)
    o.append(fist(38, 70, 3.4, 180))
    return svg(o)


# ======================================================================== 6 Natarian Knight
def knight():
    start(6)
    o = [shadow(62, 52, 6)]
    o += hleg([(44, 100), (36, 112), (30, 122)], HOD, 9)
    o += hleg([(88, 100), (100, 108), (108, 122)], HOD, 9)
    o += mane("M98,80 Q110,74 117,82 Q111,86 116,98 Q108,92 104,100 Q104,90 98,90Z",
              "M101,81 Q109,77 114,82 M102,85 Q108,86 110,94")
    # caparison over the body: purple, gold hem, heraldic lozenge, folds
    cp = "M30,78 Q40,64 64,62 Q86,62 100,74 Q106,84 100,96 L98,108 L30,106Z"
    o.append(V(P(cp, PU), SH("M72,64 Q96,66 104,80 Q104,96 98,108 L76,108 Q90,92 84,76Z", "#1a0a2a", .55, "soft2"),
               SH("M36,80 Q46,70 60,68 Q48,76 44,96 L40,104 L34,104Z", "#c8a8ea", .4, "soft2")))
    o.append(folds("M42,84 Q40,96 40,106 M52,76 Q50,92 50,106 M80,74 Q82,92 82,106 M90,78 Q92,94 92,106",
                   dl="M46,80 Q44,94 44,104 M84,76 Q86,92 86,104"))
    o.append(L("M31,104 L98,106", GO, 3, 1) + L("M31,103 L98,105", GOL, .6, .9))
    o.append(L("M34,98 L40,105 L46,98 L52,105 L58,98 L64,105 L70,98 L76,105 L82,98 L88,105 L94,98", GO, 1.2, .95))
    o.append(V(P("M62,76 L72,86 L62,96 L52,86Z", GO, .9)))
    o.append(S("M62,76 L62,96 L72,86Z", GOD, .5) + glint(58, 82, .8))
    o += hleg([(46, 104), (34, 114), (22, 120)], HO, 9.4)
    o += hleg([(92, 104), (102, 116), (112, 128)], HO, 9.4)
    # proud arched neck + armoured head held high
    o.append(V(P("M38,84 Q30,68 34,50 Q38,42 46,42 L54,46 Q54,64 60,80Z", HO)))
    o.append(SH("M50,46 Q52,62 58,80 L50,80 Q46,64 44,48Z", HOD, .6))
    o.append(LS("M36,56 Q36,68 40,78", "#fff0d8", 1.3, .3))
    o += mane("M40,40 Q50,38 56,46 Q58,56 62,66 Q56,62 52,56 Q48,48 44,48 Q40,46 36,44Z",
              "M42,41 Q50,42 54,48 M44,45 Q51,50 56,58", PUD, "#9a6ac8")
    o += horse_head(36, 44, HO, HOD, .55, armour=ST)
    o.append(L("M16,64 Q36,66 60,72", "#2a1a0c", 1.3, 1))
    # rider: back arm down holding the lance butt
    o += arm((78, 58), (92, 62), (88, 72), ST, 8.6)
    o += plate("M62,58 Q72,52 84,52 L88,78 L62,82Z", ST, ["M74,53 Q75,66 74,80"])
    o.append(V(P("M66,61 L80,59 L78,79 L66,81Z", PU)))
    o.append(folds("M70,66 Q70,74 70,80", dl="M68,64 Q68,72 68,79"))
    o.append(V(P("M68,64 L78,63 L73,74Z", GO, .8)))
    o += pauldron(70, 52, -1, 1.0)
    o += leg((72, 84), (66, 100), (58, 108), ST, 10, greave=None)
    o += boot(56, 113, -1, 12)
    # great helm with tall gold crest and visor slit
    hp = "M56,44 L58,22 Q66,18 74,20 L78,44 Q76,51 74,52 L60,52 Q57,50 56,44Z"
    o.append(V(P(hp, ST)))
    o.append(SH("M70,21 L74,20 L78,44 L74,52 L68,52Z", "#14161c", .55))
    o.append(spec(61, 30, 1.6, 6, .7, 4) + glint(61, 26, 1))
    o.append(L("M57,36 Q67,34.6 77.6,36", "#0c0a0e", 1.6, .95) + L("M57,37.6 Q67,36.2 77.6,37.6", STL, .5, .7))
    o.append(L("M60,42 L61,49 M63,42 L64,49 M66,42 L67,49", "#0c0a0e", .8, .8))
    o.append(L("M57,27 Q66,24 75,26", GO, 1.4, 1))
    o.append(V(P("M60,22 Q58,12 62,2 Q70,6 76,12 Q72,14 72,22Z", GO, .9)))
    o.append(L("M63,4 Q62,12 62,21", GOL, .6, .9) + glint(63, 9, .8))
    # couched lance with pennon
    o.append(shaft((96, 62), (6, 85), 3.2))
    o.append(V(P("M1,86 L16,80.6 L18,85 L15,89.4Z", ST, .9)) + L("M3,85.6 L15,81.4", "#ffffff", .5, .8))
    o.append(V(P("M16,78 Q24,72 32,70 Q30,76 33,80 Q26,82 20,84Z", PU, .9)))
    o.append(L("M18,79 Q25,75 30,73", PUL, .6, .7))
    o.append(fist(82, 66, 4, -80, STD))
    return svg(o)


# ======================================================================== 7 War Elephant
def war_elephant():
    start(7)
    E, ED, EL = "#8a8488", "#5c5660", "#b8b0b2"
    o = [shadow(62, 54, 6)]

    def colleg(top, bot, w, col):
        s = limb([top, ((top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2), bot], [w, w * .9, w * .95], col, cap1=False,
                 tex=lambda d, r: L(" ".join(f"M{n(x - nx * w * .4)},{n(y - ny * w * .4)} Q{n(x)},{n(y + 1)} {n(x + nx * w * .4)},{n(y + ny * w * .4)}"
                                             for x, y, nx, ny, w, _, _ in r[len(r) // 2::3]), dk(col, .4), .55, .6))
        x, y = bot
        s += P(f"M{n(x - w / 2 - .4)},{n(y - 2)} Q{n(x)},{n(y - 3.6)} {n(x + w / 2 + .4)},{n(y - 2)} L{n(x + w / 2 + 1)},{n(y + 1)} "
               f"L{n(x - w / 2 - 1)},{n(y + 1)}Z", col)
        for k in (-1, 0, 1):
            s += P(blob([(x + k * w * .3 - 1.6, y + .8), (x + k * w * .3 - 1.4, y - 1.4), (x + k * w * .3 + 1.4, y - 1.4),
                         (x + k * w * .3 + 1.6, y + .8)], .6), "#e4ddcc", .5)
        # gold anklet
        s += L(f"M{n(x - w / 2)},{n(y - 7)} Q{n(x)},{n(y - 5.6)} {n(x + w / 2)},{n(y - 7)}", GO, 1.8, 1)
        return s

    o.append(colleg((46, 104), (43, 126), 12, ED))
    o.append(colleg((90, 104), (95, 126), 12, ED))
    o.append(L("M104,86 C112,92 112,104 108,112", OUT, 3.6, .8) + L("M104,86 C112,92 112,104 108,112", ED, 2, 1))
    o.append(L("M108,112 l-2,5 M108,112 l1,5 M108,112 l3,4", "#2a2420", .8, .8))
    body = blob([(30, 86), (36, 64), (54, 53), (76, 52), (98, 58), (107, 74), (106, 94), (96, 110), (70, 114), (46, 110), (32, 100)], .95)
    o.append(V(P(body, E),
               SH("M78,54 Q104,60 106,84 Q104,106 88,112 Q100,96 98,80 Q96,64 78,54Z", ED, .6),
               clip(body, hair((32, 52, 108, 114), 0, 24, 7, [dk(E, .4), lt(E, .4)], seed=71, op=.3, w=.55, curl=.35)
                    + L("M84,94 Q96,98 104,92 M66,104 Q80,108 92,104", dk(E, .35), .8, .55))))
    # caparison: purple blanket with gold fringe + medallions
    cap = "M46,58 L100,56 Q104,72 100,90 L94,96 L52,98 Q46,80 46,58Z"
    o.append(V(P(cap, PU), SH("M84,58 L100,56 Q104,72 100,90 L94,96 L86,96Z", "#1a0a2a", .5, "soft2")))
    o.append(folds("M58,62 Q56,80 58,97 M72,60 Q71,80 72,97 M86,60 Q88,78 87,96", dl="M54,62 Q52,80 54,96"))
    o.append(L("M52,97 L94,95.4", GO, 2.2, 1))
    o.append(L(" ".join(f"M{n(54 + 3.6 * k)},{n(97.4 - .14 * k)} l0,2.4" for k in range(12)), GOD, .9, .9))
    for x in (62, 80):
        o.append(V(circ(x, 78, 3.6, GO, .8)) + dot(x, 78, 1.4, "#8a2a3a") + glint(x - 1.4, 76.6, .6))
    o.append(colleg((56, 106), (52, 127), 13, E))
    o.append(colleg((82, 106), (86, 127), 13, E))
    # howdah: crenellated wooden tower with purple cloth band
    o.append(V(P("M50,62 L98,60 L100,44 L48,46Z", WO)))
    o.append(clip("M50,62 L98,60 L100,44 L48,46Z", L("M48,50 Q74,49 100,48 M48,55 Q74,54 99,53", WOD, .6, .7)))
    o.append(V(P("M48,46 L56,46 L56,39 L62,39 L62,46 L70,46 L70,39 L76,39 L76,46 L84,46 L84,39 L90,39 L90,44 L100,44 L100,36 L48,36Z", WOD)))
    o.append(V(P("M50,55 L98,53 L98,61 L50,63Z", PU)))
    o.append(L("M50,51 L98,49", GO, 2, 1) + L("M50,50.2 L98,48.2", GOL, .5, .9))
    for x in (56, 66, 76, 86, 94):
        o.append(rivet(x, 50.6 - (x - 50) * .04, .8))
    # rider in the howdah with a banner
    o.append(V(P("M64,32 Q74,28 84,30 L86,40 L62,40Z", PU)))
    o += face(74, 25, 6.6)
    o += helm(74, 25, 6.6)
    o += arm((82, 33), (90, 30), (98, 21), PU, 6.4)
    o.append(shaft((100, 26), (104, 0), 2.4))
    o.append(V(P("M104,1 Q112,2 119,6 Q112,9 104,14Z", GO, .9)) + L("M105,3 Q111,4 116,6", GOL, .6, .9))
    o.append(fist(99, 20, 3, -80))
    # head: ear flap, armoured face plate, tusks with gold caps, trunk raised
    ear = "M36,66 C30,58 20,60 18,70 L21,88 L34,90Z"
    o.append(V(P(ear, E), SH("M22,70 C24,66 28,66 30,70 L30,84 L24,86Z", ED, .5)))
    hd = blob([(36, 54), (24, 57), (15, 68), (14, 84), (22, 96), (36, 97), (46, 88), (48, 70), (44, 58)], .95)
    o.append(V(P(hd, E), SH("M42,58 Q50,72 46,88 Q40,96 32,97 Q44,86 42,58Z", ED, .55)))
    fp = "M30,53 L46,57 L47,72 L36,79 L26,73 L23,61Z"
    o.append(V(P(fp, PU), SH("M40,56 L46,57 L47,72 L38,77Z", "#1a0a2a", .5)))
    o.append(P("M28,57 L44,60 L45,70", "none", 1.6, GO))
    o.append(V(P("M33,56 L36,39 L40,56Z", GO, .8)) + glint(35.6, 47, .7))
    for (x, y) in ((28, 60), (36, 74), (44, 64)):
        o.append(rivet(x, y, .9))
    o.append(beady(22, 76, 1.8))
    o.append(P("M30,88 C22,96 10,96 6,88 C12,94 22,92 26,84Z", "#f1e8cc", .9))
    o.append(P("M38,92 C32,100 22,104 14,100 C22,100 30,96 34,88Z", "#e4d8b6", .9))
    o.append(V(P("M24,87 L29,85 L30,90 L25,92Z", GO, .7)))
    tk = [(22, 84), (14, 82), (8, 72), (6, 58), (5, 48), (7, 40), (12, 35)]
    o.append(limb(tk, [11, 9.4, 8, 7, 6.4, 6, 5.6], E, cap0=False,
                  tex=lambda d, r: L(" ".join(f"M{n(x + nx * w * .5)},{n(y + ny * w * .5)} Q{n(x + ux * 1.2)},{n(y + uy * 1.2)} "
                                              f"{n(x - nx * w * .5)},{n(y - ny * w * .5)}" for x, y, nx, ny, w, ux, uy in r[2::3]),
                                     dk(E, .4), .6, .65)))
    o.append(V(P(blob([(10, 32), (14, 31), (17, 34), (14, 38), (10, 37)], .8), E)))
    o.append(S(blob([(12.6, 33.4), (15.4, 33.6), (14.4, 36)], .8), "#3a3030", .8))
    return svg(o)


# ======================================================================== 8 Ballista
def wheel(cx, cy, r, col=WOD):
    o = [V(circ(cx, cy, r, col))]
    o.append(circ(cx, cy, r * .72, "none", r * .18, dk(col, .3)))
    sp = " ".join(f"M{n(cx)},{n(cy)} L{n(cx + math.cos(a) * r * .8)},{n(cy + math.sin(a) * r * .8)}"
                  for a in (k * math.pi / 4 for k in range(8)))
    o.append(L(sp, OUT, 2.2, .7) + L(sp, WO, 1.2, 1))
    o.append(V(circ(cx, cy, r * .22, GO, .7)))
    o.append(L(f"M{n(cx - r * .7)},{n(cy - r * .7)} A{n(r)},{n(r)} 0 0 1 {n(cx + r * .2)},{n(cy - r * .98)}", WOL, .8, .7))
    return o


def ballista():
    start(8)
    o = [shadow(60, 52, 6)]
    # crewman at the rear, cranking the windlass
    o += leg((100, 96), (104, 110), (108, 120), PUD, 9.6)
    o += boot(111, 126, 1, 12)
    o += leg((94, 96), (90, 110), (86, 120), PU, 9.6)
    o += boot(84, 126, -1, 12)
    o.append(V(P("M86,68 Q97,64 108,66 L110,98 L86,98Z", PU)))
    o.append(folds("M92,74 Q91,86 92,96 M104,74 Q106,86 106,96", dl="M89,74 Q88,86 89,96"))
    o.append(V(P("M86,94 L110,94 L110,100 L86,100Z", GO, .9)))
    o.append(limb([(98, 58), (98, 66)], [7, 7.4], SK))
    o += face(98, 52, 7, beard=True)
    o += helm(98, 52, 7, crest=False)
    o += arm((90, 70), (78, 78), (75, 90), PU, 8)
    o.append(fist(74, 92, 3.4, 120))
    o += wheel(90, 116, 10)
    # stock beam angled up-left (grain), trestle stand
    bm = "M18,48 L104,92 L100,102 L14,58Z"
    o.append(V(P(bm, WO), SH("M16,56 L102,98 L100,102 L14,58Z", WOD, .7)))
    o.append(clip(bm, L("M14,52 Q50,70 104,96 M20,54 Q60,74 102,95 M30,56 Q66,74 100,93", WOD, .55, .7)))
    o.append(L("M22,54 L98,92", "#e8c08a", .9, .8))
    o.append(V(P("M54,72 L70,80 L74,122 L46,122Z", WO)))
    o.append(clip("M54,72 L70,80 L74,122 L46,122Z", L("M54,80 L52,120 M58,78 Q58,100 57,120 M64,82 L66,120", WOD, .55, .7)))
    o.append(V(P("M40,118 L108,118 L110,124 L38,124Z", WOD)))
    for x in (50, 66, 98):
        o.append(rivet(x, 121, .9, "#3e434f", "#c3cad6"))
    # windlass with crank
    o.append(V(circ(102, 96, 7, WOD)))
    o.append(V(circ(102, 96, 3, ST, .8)))
    o.append(L("M102,96 L112,82", OUT, 4, .75) + L("M102,96 L112,82", ST, 2.4, 1))
    o.append(V(circ(112, 82, 2.6, WO, .8)))
    o += wheel(42, 118, 11)
    # bow arms at the front with twisted skeins
    o.append(V(P("M8,52 L26,44 L30,50 L16,64Z", ST)))
    for d in ("M20,46 C8,30 4,16 10,6", "M24,60 C20,80 26,92 40,100"):
        o.append(L(d, OUT, 6, .75) + L(d, WO, 4.2, 1) + L(d, WOL, 1.2, .8).replace("d=", 'transform="translate(-.8,-.6)" d='))
    bs = "M10,6 C36,30 48,56 40,100"
    o.append(L(bs, OUT, 2.4, .7) + L(bs, "#ecdcb4", 1.2, 1))
    for (cx, cy) in ((16, 50), (24, 60)):
        o.append(V(ell(cx, cy, 4, 6, GO)))
        o.append(L(f"M{n(cx - 3)},{n(cy - 3)} l6,2 M{n(cx - 3.4)},{n(cy)} l6.6,2 M{n(cx - 3)},{n(cy + 3)} l6,2", GOD, .6, .8))
        o.append(glint(cx - 1.4, cy - 3, .6))
    # bolt with steel head and purple fletching
    o.append(shaft((8, 40), (60, 68), 3, "#c9995c"))
    o.append(V(P("M10,40 L0,30 L2,46Z", ST, .9)) + L("M1.4,32 L8.6,40", "#ffffff", .5, .8))
    o.append(V(P("M54,64 L64,66 L62,74Z", PU, .8)))
    o.append(V(P("M60,68 L72,74 L70,84 L58,78Z", ST)))
    o.append(glint(62, 71, .6))
    return svg(o)


# ======================================================================== 9 Emperor
def emperor():
    start(9)
    o = [shadow(60, 40)]
    # long cape flowing behind
    cp = "M50,44 L76,40 C98,58 106,96 98,124 L64,122Z"
    o.append(V(P(cp, PUD), SH("M76,40 C98,58 106,96 98,124 L86,124 C94,98 88,66 72,46Z", "#12061e", .55, "soft2")))
    o.append(folds("M80,58 Q90,90 92,122 M74,64 Q80,96 78,122", dark="#12061e", dl="M84,58 Q94,90 96,120"))
    o.append(L("M98,124 Q82,126 64,122", GO, 1.6, 1))
    # robe draping in folds, gold hem
    rb = "M46,48 L74,46 L80,80 Q84,104 88,126 L30,126 Q34,104 36,80Z"
    o.append(V(P(rb, PU), SH("M66,47 L74,46 L80,80 Q84,104 88,126 L68,126 Q70,100 68,82Z", "#1a0a2a", .55, "soft2"),
               SH("M42,56 L52,54 L48,90 L42,120 L36,120 L40,86Z", "#c8a8ea", .4, "soft2")))
    o.append(folds("M48,84 Q42,104 40,126 M56,86 Q54,106 54,126 M66,86 Q70,106 72,126 M74,92 Q80,110 82,126",
                   dl="M50,86 Q45,106 43,124 M58,88 Q57,106 57,124", w=1.3))
    o.append(L("M31,121 Q60,124 87,121", GO, 3, 1) + L("M31,120 Q60,123 87,120", GOL, .6, .9))
    o.append(L("M36,116 L42,112 L48,116 L54,112 L60,116 L66,112 L72,116 L78,112 L84,116", GO, 1.1, .95))
    o.append(V(P("M57,70 L65,70 L66,121 L56,121Z", GO, .8)))
    o.append(L("M58,72 L58,120", GOL, .5, .9))
    for y in (82, 96, 110):
        o.append(V(circ(61, y, 2.2, "#8a2a3a", .6)) + dot(60.4, y - .6, .6, "#ffd0d0"))
    # gold collar / stole with jewel
    o.append(V(P("M44,48 Q60,44 76,46 L80,58 Q74,62 68,70 L56,70 Q50,62 42,58Z", GO)))
    o.append(L("M45,50 Q60,46 74,48", GOL, .6, .9) + glint(50, 51, .9))
    o.append(V(circ(62, 62, 3, "#8a2a3a", .8)) + dot(61, 61, .9, "#ffd0d0"))
    # sceptre arm (back), held upright: shaft with rings, orb, finial
    o += arm((76, 54), (90, 66), (90, 82), PU, 10)
    o.append(L("M90,98 L90,24", OUT, 4.4, .75) + L("M90,98 L90,24", GO, 3, 1) + L("M89.2,98 L89.2,24", GOL, .8, .9))
    for y in (40, 60, 92):
        o.append(V(P(f"M86.6,{y} L93.4,{y} L92.6,{y + 3} L87.4,{y + 3}Z", GO, .7)))
    o.append(V(circ(90, 17, 7, GO)))
    o.append(V(circ(90, 17, 4.2, "#6c3fa0")))
    o.append(spec(88.4, 15.4, 1.6, 1.2, .9))
    o.append(V(P("M84,11 L90,1 L96,11 L90,8.6Z", GO, .8)) + glint(90, 4, .8))
    o.append(fist(90, 85, 4.2, -90))
    # commanding arm (front) pointing forward-left with a ringed hand
    o += arm((44, 56), (30, 66), (16, 61), PU, 10)
    o.append(L("M44,56 Q40,62 46,70", GO, 2.2, 1))
    o.append(V(P(blob([(8, 61), (13, 57), (20, 57), (22, 63), (16, 67), (10, 66)], .9), SK)))
    o.append(limb([(10, 60.4), (3.6, 57.4)], [2.4, 1.9], SK, vol=False))
    o.append(L("M12,63 L8,64.6 M14,65 L10,66.6", SKD, .6, .7))
    o.append(dot(15, 59, 1, GO))
    # head: noble face, beard, jewelled crown
    o.append(limb([(60, 38), (61, 46)], [8, 8.4], SK))
    o += face(60, 31, 9, beard=True)
    o.append(V(P("M50,26 L50,12 L55,18 L60,5 L65,18 L70,12 L70,26 Q60,24 50,26Z", GO)))
    o.append(SH("M60,6 L65,18 L70,12 L70,26 L62,25Z", "#6a4a10", .45))
    o.append(L("M50,24 Q60,22 70,24", GOD, 1.2, .9))
    o.append(V(circ(60, 19, 2.4, "#8a2a3a", .7)) + dot(59.2, 18.2, .7, "#ffd0d0"))
    o.append(dot(54, 21.6, 1.4, "#6c3fa0") + dot(66, 21.6, 1.4, "#6c3fa0"))
    o.append(dot(50, 12, 1.2, GOL) + dot(60, 5, 1.2, GOL) + dot(70, 12, 1.2, GOL))
    o.append(glint(53, 15, .8))
    o.append(P("M51,26 Q50,30 52,33 M69,26 Q70,30 68,34", "none", 1.2, BEARD))
    return svg(o)


# ======================================================================== 10 Settlers
def settlers():
    start(10)
    o = [shadow(60, 54, 6)]
    TU, TUD = "#8a6f9a", "#5e4870"
    # --- rear settler carrying a bundle on a pole
    o += leg((78, 90), (84, 106), (89, 120), TUD, 8.6, greave=None)
    o += boot(92, 126, 1, 12, LE)
    o += leg((74, 90), (68, 106), (64, 120), TU, 8.6, greave=None)
    o += boot(62, 126, -1, 12, LE)
    o.append(V(P("M66,60 Q76,57 86,58 L88,92 L64,92Z", PUL)))
    o.append(folds("M70,66 Q69,80 70,92 M80,66 Q81,80 82,92", dark=PU, dl="M68,66 Q67,80 68,90"))
    o.append(V(P("M65,76 L88,76 L88,82 L65,82Z", GO, .8)))
    o.append(limb([(75, 50), (75, 58)], [6.4, 6.8], SK))
    o += face(75, 46, 7)
    o.append(V(P("M66,44 L75,29 L85,44 Q75,42 66,44Z", PU)))
    o.append(L("M66,44 Q75,42 85,44", GO, 1.8, 1))
    o += arm((70, 64), (62, 74), (67, 82), PUL, 7)
    o.append(fist(68, 83, 3, 0))
    o += arm((84, 62), (94, 54), (91, 44), PUL, 7)
    o.append(shaft((94, 60), (102, 28), 2.4))
    o.append(fist(92, 44, 3.2, -80))
    bun = blob([(98, 16), (106, 12), (114, 16), (116, 26), (110, 32), (100, 30), (96, 24)], .9)
    o.append(V(P(bun, "#c9b48c"), clip(bun, hair((94, 10, 118, 34), 60, 40, 3, ["#8f7a56", "#efe2c0"], seed=8, op=.5))))
    o.append(L("M97,22 Q106,20 116,21", "#5a3a1a", 1.6, 1))
    # --- cart with sacks and a pennant
    o += wheel(70, 114, 9, WOD)
    cart = "M56,86 L112,84 L114,108 L58,110Z"
    o.append(V(P(cart, WO), SH("M100,85 L112,84 L114,108 L102,108Z", WOD, .6)))
    o.append(clip(cart, L("M56,93 Q84,92 114,91 M56,101 Q84,100 114,99", WOD, .8, .8)
                  + L("M56,94 Q84,93 114,92 M56,102 Q84,101 114,100", WOL, .5, .5)))
    for (cx, cy, rx, ry, c) in ((74, 84, 10, 8, "#c9b48c"), (94, 82, 11, 9, "#b8a07a")):
        sk = blob([(cx - rx, cy + 2), (cx - rx * .7, cy - ry * .8), (cx, cy - ry), (cx + rx * .8, cy - ry * .7),
                   (cx + rx, cy + 2), (cx, cy + ry * .5)], .9)
        o.append(V(P(sk, c), clip(sk, hair((cx - rx, cy - ry, cx + rx, cy + ry), 60, 30, 3, [dk(c, .3), lt(c, .4)], seed=cx, op=.5))))
        o.append(L(f"M{n(cx - 2)},{n(cy - ry + 1)} Q{n(cx)},{n(cy - ry - 2)} {n(cx + 3)},{n(cy - ry)}", "#5a3a1a", 1.2, 1))
    o.append(V(P("M62,72 L80,70 L82,86 L62,86Z", PU)))
    o.append(folds("M67,74 Q66,80 67,86 M74,73 Q75,80 75,86"))
    o.append(shaft((108, 84), (110, 46), 2.4))
    o.append(V(P("M110,46 Q115,48 120,52 Q115,55 110,60Z", GO, .8)))
    o += wheel(100, 116, 12)
    # shafts going forward to the puller's hands
    o.append(shaft((58, 98), (30, 86), 2.8))
    # --- front settler pulling, leaning forward
    o += leg((36, 92), (44, 108), (48, 120), PUD, 9.4, greave=None)
    o += boot(51, 126, 1, 12, LE)
    o += leg((30, 92), (22, 108), (14, 120), PU, 9.4, greave=None)
    o += boot(12, 126, -1, 13, LE)
    o.append(V(P("M22,62 Q34,57 46,58 L46,94 L24,94Z", PU)))
    o.append(folds("M30,66 Q29,80 30,94 M38,66 Q39,80 40,94", dl="M26,66 Q25,80 26,92"))
    o.append(V(P("M22,80 L46,80 L46,86 L22,86Z", GO, .8)) + glint(26, 82, .6))
    o.append(limb([(32, 52), (32, 61)], [7, 7.4], SK))
    o += face(32, 46, 7.6, beard=True)
    o.append(V(P("M23,44 L32,27 L42,44 Q32,41.6 23,44Z", PU)))
    o.append(L("M23,44 Q32,41.6 42,44", GO, 1.8, 1))
    o += arm((26, 64), (18, 76), (28, 86), PU, 8)
    o.append(fist(30, 87, 3.4, 20))
    o += arm((42, 64), (48, 76), (40, 86), PU, 8)
    o.append(fist(40, 88, 3.4, 160))
    return svg(o)


UNITS = [(1, pikeman), (2, thorned), (3, guardsman), (4, eagle), (5, axerider), (6, knight),
         (7, war_elephant), (8, ballista), (9, emperor), (10, settlers)]

if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "big"
    only = {int(a) for a in sys.argv[2:]}
    for k, fn in UNITS:
        if only and k not in only:
            continue
        s = fn()
        (out / f"natars-{k}.svg").write_text(s)
        print(k, len(s))
