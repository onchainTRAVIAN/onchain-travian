#!/usr/bin/env python3
"""Painterly Nature (oasis animal) unit art: src/web/public/img/units/big/nature-N.svg (120x140).

Run: python3 scripts/art/painterly/nature.py [out_dir]
Same poses / identities as the flat set (scripts/art/nature.py), redrawn with real
anatomy (shoulders, haunches, jointed legs, paws/hooves/claws) and painted with
nnpaint (gradients, volume filter, fur / scale / feather textures, soft shadow).
The 16x16 icons (units/nature-N.svg) stay with scripts/art/nature.py.  Original art.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nnpaint import (OUT, begin, svg, P, S, SG, SH, L, LS, V, circ, ell, dot, spec, clip, limb, limb_hair,  # noqa: E402
                     hair, scales, glint, eye, beady, shadow, blob, curve, poly_d, lt, dk, mix, n, lgrad)

ROOT = Path(__file__).resolve().parents[3] / "src/web/public/img/units"
TOOTH, TOOTH_D = "#f6f0dc", "#c9bf9e"
MOUTH = "#6e1c2a"
CLAW = "#eadfc6"


def claws(pts_list, w=1.1):
    d = " ".join(curve(p, .8) for p in pts_list)
    return L(d, OUT, w + 1.3, .8) + L(d, CLAW, w, 1)


def paw(x, y, ang, size, col, toes=3, claw=True):
    """animal paw: x,y = sole contact point; ang = direction the toes point (deg, 180 = left)."""
    sz = size
    flip = 90 < (ang % 360) < 270
    rot = (ang - 180) if flip else ang
    dr = -1 if flip else 1
    X = lambda u: x + dr * u  # noqa: E731
    pts = [(X(-sz * .9), y - sz * .2), (X(-sz * .7), y - sz * 1.1), (X(sz * .2), y - sz * 1.25), (X(sz * 1.0), y - sz * .8),
           (X(sz * 1.25), y - sz * .1), (X(sz * .6), y + sz * .25), (X(-sz * .5), y + sz * .25)]
    s_ = P(blob(pts, .9), col, .9)
    d = "".join(f"M{n(X(sz * (.25 + .3 * k)))},{n(y - sz * (.95 - .18 * k))} l{n(dr * sz * .25)},{n(sz * .55)} " for k in range(toes - 1))
    s_ += L(d, dk(col, .55), .55, .75)
    s_ += L(f"M{n(X(-sz * .5))},{n(y - sz * .85)} Q{n(X(sz * .2))},{n(y - sz * 1.15)} {n(X(sz * .8))},{n(y - sz * .7)}",
            lt(col, .5), .6, .6)
    if claw:
        d = "".join(f"M{n(X(sz * (1.0 + .05 * k)))},{n(y - sz * (.55 - .3 * k))} q{n(dr * sz * .5)},{n(sz * .05)} {n(dr * sz * .6)},{n(sz * .45)} "
                    for k in range(toes))
        s_ += L(d, "#2a2018", .8, .9)
    return f'<g transform="rotate({n(rot)} {n(x)} {n(y)})">{s_}</g>'


def hoof2(x, y, w=6, h=4.5, col="#2b211a", split=True):
    """cloven hoof, ground at y"""
    d = (f"M{n(x - w / 2)},{n(y - h)} L{n(x + w / 2)},{n(y - h)} Q{n(x + w / 2 + 1)},{n(y - 1)} {n(x + w / 2 + 1.2)},{n(y + .4)} "
         f"L{n(x - w / 2 - 1.2)},{n(y + .4)} Q{n(x - w / 2 - 1)},{n(y - 1)} {n(x - w / 2)},{n(y - h)}Z")
    s = P(d, col)
    if split:
        s += L(f"M{n(x - 1)},{n(y - h + 1.6)} L{n(x - 1.4)},{n(y + .3)}", "#0d0806", .7, .8)
    return s + L(f"M{n(x - w / 2 + .6)},{n(y - h + 1)} Q{n(x - w / 2 - .2)},{n(y - 1.6)} {n(x - w / 2 - .4)},{n(y - .2)}",
                 "#9a8a7c", .5, .7)


# ======================================================================== 1 Rat
def rat():
    begin("nat-nature1-", seed=1)
    C, CD, CL, PK, PKD = "#8b847c", "#57504a", "#c3bab0", "#e0a49c", "#b06e66"
    o = [shadow(56, 46, 5.5)]
    # tail: long, tapering, curling up behind
    o.append(limb([(92, 106), (106, 101), (118, 108), (116, 122), (106, 128)], [5.4, 4.2, 3, 2, 1.1], PK, lit="#ffd8d0",
                  tex=lambda d, r: "".join(L(f"M{n(x + nx * w / 2)},{n(y + ny * w / 2)} L{n(x - nx * w / 2)},{n(y - ny * w / 2)}",
                                             PKD, .45, .55) for x, y, nx, ny, w, _, _ in r[::2])))
    # far legs
    o.append(limb([(42, 108), (48, 118), (54, 124)], [6, 4, 3], CD))
    o.append(P(blob([(51, 123), (57, 122), (60, 124.6), (52, 125.4)]), PKD))
    o.append(limb([(76, 108), (70, 118), (62, 123)], [7, 4.5, 3], CD))
    o.append(P(blob([(65, 122), (58, 122.4), (56, 124.8), (64, 125.2)]), PKD))
    # body: hunched, scurrying left
    body = blob([(9, 101), (16, 94), (26, 88), (40, 82), (56, 78), (74, 79), (89, 85), (98, 96), (97, 108), (88, 116),
                 (70, 119), (50, 118), (34, 114), (20, 111), (10, 107)], .9)
    o.append(V(P(body, C),
               SH("M60,112 Q84,114 94,104 Q98,96 92,88 Q96,104 76,112Z", CD, .7),
               SH("M28,90 Q44,82 64,80 Q46,88 32,96Z", "#fff6e6", .45, "soft2"),
               clip(body, hair((10, 80, 98, 100), 10, 120, 3.6, [lt(C, .55), CD], seed=11, op=.55)
                    + hair((20, 98, 98, 118), 16, 110, 3.4, [CD, dk(C, .55)], seed=12, op=.5)
                    + hair((6, 92, 30, 110), 195, 30, 2.4, [lt(C, .5), CD], seed=13, op=.5))))
    # haunch
    o.append(SH("M76,92 Q92,90 94,104 Q86,112 76,108 Q72,100 76,92Z", CD, .5))
    o.append(LS("M78,94 Q88,92 91,100", "#fff6e6", 1.1, .45))
    # pale belly fur
    o.append(SH("M30,112 Q50,118 70,117 Q52,114 34,108Z", "#e8e0d4", .55))
    # ear
    o.append(V(P(blob([(30, 86), (29, 78), (35, 74), (41, 77), (40, 85)]), C),
               SG(blob([(32, 84), (32, 79), (35, 76.6), (38.6, 78.6), (38, 84)]), PK)))
    o.append(LS("M33,82 Q34,78 37,78", PKD, .8, .5))
    # snout, nose, eye, whiskers, teeth
    o.append(V(ell(7, 103, 2.6, 2.2, PK)))
    o.append(dot(6.2, 102.2, .7, "#fff", .8))
    o.append(L("M10,107 Q13,109 16,108.6", CD, .7, .8))
    o.append(S("M11.4,107.4 L13.4,107.6 L12.6,110 Z", TOOTH))
    o.append(beady(20, 96, 2.1))
    o.append(LS("M17.5,93.6 Q20,92.6 22.4,94", "#fff6e6", .6, .6))
    o.append(L("M11,103 Q4,98 -1,97 M11,104 Q3,104 -1,106 M12,105 Q6,109 2,113 M12,102 Q7,96 4,93", "#3a2e24", .45, .75))
    # near legs: fore reaching forward, hind pushing off
    o.append(limb([(36, 102), (28, 112), (18, 118), (11, 120)], [10, 6, 3.6, 3.2], C, bulge=[2, 0, 0]))
    o.append(P(blob([(13, 118), (6, 119), (3, 121.6), (8, 122.6), (14, 121.6)]), PK))
    o.append(L("M4,121 L1.6,123 M6,121.8 L4.6,124.4 M8.6,122 L8,124.8", PKD, .7, .9))
    o.append(limb([(84, 100), (92, 112), (100, 118), (106, 121)], [16, 7, 4, 3.4], C, bulge=[3, 0, 0],
                  tex=lambda d, r: limb_hair(r, [lt(C, .5), CD], seed=4)))
    o.append(P(blob([(100, 120), (110, 120), (116, 122.6), (110, 124.6), (101, 124)]), PK))
    o.append(L("M113,121.6 L117,123 M112,123.4 L115,125.6 M109.6,124.4 L111.6,126.6", PKD, .7, .9))
    return svg(o)


# ======================================================================== 2 Spider
def spider():
    begin("nat-nature2-", seed=2)
    D, DM, DL, R = "#2a2024", "#45363e", "#7a6670", "#c8202a"
    o = [shadow(58, 50, 5.5)]

    def leg(pts, w0, col):
        """segmented leg: coxa -> femur (up) -> knee -> tibia -> metatarsus (down)"""
        ws = [w0, w0 * .9, w0 * .75, w0 * .5, w0 * .3][:len(pts)]
        s = ""
        for i in range(len(pts) - 1):
            s += limb([pts[i], pts[i + 1]], [ws[i], ws[i + 1]], col, vol=False, lit=lt(col, .4),
                      over=lambda d, r: hairs(r))
        for p, w in zip(pts[1:-1], ws[1:-1]):
            s += circ(p[0], p[1], w * .62, col, .8)
            s += dot(p[0] - w * .2, p[1] - w * .25, w * .2, lt(col, .5), .8)
        return V(s)

    def hairs(rows):
        d = ""
        for i, (x, y, nx, ny, w, ux, uy) in enumerate(rows[1:-1:2]):
            sg = 1 if i % 2 else -1
            d += f"M{n(x + nx * w * .45 * sg)},{n(y + ny * w * .45 * sg)} l{n(nx * 1.6 * sg + ux * 1.2)},{n(ny * 1.6 * sg + uy * 1.2)} "
        return L(d, "#9a8890", .45, .7)

    # far legs (behind body)
    o.append(leg([(46, 80), (34, 64), (22, 52), (12, 74), (6, 98)], 4, D))
    o.append(leg([(50, 76), (44, 58), (38, 44), (32, 66), (28, 90)], 4, D))
    o.append(leg([(56, 76), (66, 58), (78, 46), (94, 62), (104, 84)], 4, D))
    o.append(leg([(60, 82), (76, 70), (92, 60), (108, 78), (116, 100)], 4, D))
    # abdomen: big glossy, hairy, with red hourglass
    ab = blob([(56, 88), (60, 76), (72, 70), (88, 72), (98, 84), (97, 100), (86, 108), (70, 108), (60, 100)], .95)
    o.append(V(P(ab, DM),
               clip(ab, hair((54, 68, 100, 110), 70, 90, 2.6, ["#8a7680", "#140e10"], seed=21, op=.5, w=.5)),
               SH("M84,74 Q98,84 96,100 Q88,108 76,106 Q92,98 88,80Z", "#0e080a", .6)))
    o.append(spec(70, 79, 7, 3.4, .35, -20))
    o.append(spec(68, 78, 2.4, 1.2, .7, -20))
    hg = "M73,82 L83,82 Q78,86 78,90 Q78,94 83,98 L73,98 Q78,94 78,90 Q78,86 73,82Z"
    o.append(P(hg, R, .8))
    o.append(S("M74.6,83 L79.6,83 Q77,85 76.6,87.4Z", "#ff9a8a", .7))
    # cephalothorax
    ce = blob([(34, 86), (38, 78), (47, 74), (56, 78), (60, 88), (55, 97), (45, 99), (37, 94)])
    o.append(V(P(ce, DM), clip(ce, hair((32, 72, 62, 100), 40, 45, 2.4, ["#8a7680", "#140e10"], seed=22, op=.5, w=.5)),
               SH("M52,78 Q60,86 56,96 Q50,98 46,98 Q56,92 52,78Z", "#0e080a", .55)))
    o.append(spec(42, 80, 4, 1.8, .45, -25))
    # eye cluster and chelicerae with fangs
    for (x, y, r) in ((37, 84, 2.1), (41.4, 80.6, 1.6), (35.4, 88.8, 1.3), (39.6, 91, 1.2), (44.6, 79.4, 1.1)):
        o.append(circ(x, y, r, R, .5) + dot(x - r * .35, y - r * .35, r * .35, "#ffe6dc", .9))
    o.append(V(P(blob([(34, 94), (40, 93), (42, 100), (38, 104), (34, 101)]), DM),
               P(blob([(42, 96), (48, 96), (49, 102), (45, 106), (42, 102)]), DM)))
    o.append(P("M36,103 Q34,108 30,109 Q33,106 34,102Z", "#d8c8b0", .7))
    o.append(P("M44,105 Q43,110 40,112 Q42,108 42,104Z", "#d8c8b0", .7))
    # pedipalps
    o.append(limb([(36, 92), (30, 96), (27, 102)], [2.6, 2, 1.6], DM, vol=False))
    # near legs: spread wide down to the ground
    o.append(leg([(40, 90), (28, 78), (16, 72), (8, 98), (3, 124)], 4.8, DM))
    o.append(leg([(42, 94), (30, 90), (22, 88), (20, 108), (17, 126)], 4.8, DM))
    o.append(leg([(50, 98), (48, 106), (44, 110), (40, 118), (34, 126)], 4.8, DM))
    o.append(leg([(56, 96), (66, 104), (74, 108), (80, 116), (86, 126)], 4.8, DM))
    return svg(o)


# ======================================================================== 3 Snake
def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])


def snake():
    begin("nat-nature3-", seed=3)
    GR, GD, GL, BY, BYD = "#5f9a3a", "#355d1e", "#a6d277", "#e2d9a0", "#a89a5c"
    o = [shadow(62, 46, 6)]
    spine = [(46, 101), (62, 96.6), (86, 96.6), (103, 102), (108, 112), (97, 120.6), (73, 124), (49, 122.4), (32, 116),
             (24, 104), (19, 88), (21, 73), (30, 63), (46, 61), (62, 62), (73, 55), (71, 45), (60, 41), (46, 45)]
    m = len(spine)
    ws = [2.4, 6.4, 10, 12.6, 14, 14.8, 15, 15, 15, 15, 15, 14.8, 14.4, 13.6, 12.8, 12, 11.4, 11, 11]

    def scl(rows):
        d, dh = "", ""
        for i, (x, y, nx, ny, w, ux, uy) in enumerate(rows):
            if i % 2:
                continue
            for o_ in (-.3, -.04, .22):
                o2 = o_ + (.12 if (i // 2) % 2 else 0)
                cx, cy = x + nx * w * o2, y + ny * w * o2
                d += (f"M{n(cx - nx * 1.5 - ux * .8)},{n(cy - ny * 1.5 - uy * .8)} Q{n(cx + ux * 1.8)},{n(cy + uy * 1.8)} "
                      f"{n(cx + nx * 1.5 - ux * .8)},{n(cy + ny * 1.5 - uy * .8)} ")
                dh += f"M{n(cx - ux * .2)},{n(cy - uy * .2)} l{n(ux * .9)},{n(uy * .9)} "
        return L(d, dk(GR, .5), .5, .6) + L(dh, GL, .5, .45)

    def belly(rows):
        # creamy ventral band along the lower / outer edge with transverse plates
        side = [(1 if (ny > 0 or (abs(ny) < .2 and nx < 0)) else -1) for x, y, nx, ny, w, _, _ in rows]
        pts_l = [(x + nx * w * .5 * sg, y + ny * w * .5 * sg) for (x, y, nx, ny, w, _, _), sg in zip(rows, side)]
        pts_i = [(x + nx * w * .14 * sg, y + ny * w * .14 * sg) for (x, y, nx, ny, w, _, _), sg in zip(rows, side)]
        d = "M" + " L".join(f"{n(a)},{n(b)}" for a, b in pts_l + pts_i[::-1]) + "Z"
        s_ = S(d, BY, .92)
        s_ += L(" ".join(f"M{n(a[0])},{n(a[1])} L{n(b[0])},{n(b[1])}" for a, b in zip(pts_l[1::2], pts_i[1::2])), BYD, .5, .7)
        return s_

    o.append(limb(spine, ws, GR, lit=GL, cap1=False, tex=lambda d, r: belly(r[4:]) + scl(r)))
    o.append(SH("M44,108 Q70,104 96,108 Q100,114 92,116 Q70,112 46,116Z", "#1c3a0c", .35))
    # dorsal diamonds
    for (x, y) in ((82, 96), (104, 108), (80, 121), (54, 120), (30, 108), (22, 88), (26, 70), (40, 62), (58, 59), (69, 50)):
        if True:
            if True:
                x += .5
                y -= 1.5
                o.append(P(f"M{n(x)},{n(y - 4)} L{n(x + 3.6)},{n(y)} L{n(x)},{n(y + 4)} L{n(x - 3.6)},{n(y)}Z", GD, .6))
                o.append(S(f"M{n(x)},{n(y - 1.8)} L{n(x + 1.5)},{n(y)} L{n(x)},{n(y + 1.8)} L{n(x - 1.5)},{n(y)}Z", GL))
    # head: wedge viper head, jaws open, rearing to the left
    hd = blob([(50, 50), (46, 40), (36, 32), (24, 32), (14, 37), (13, 43), (24, 46), (38, 49)], .8)
    o.append(V(P(hd, GR), clip(hd, scales((12, 30, 52, 52), 3.2, dk(GR, .5), .5, .55, hi=GL)),
               SH("M40,46 Q48,46 49,40 Q50,48 44,50Z", GD, .6)))
    o.append(S("M18,37 Q28,32 40,36 Q30,36 20,40Z", GL, .5))
    # lower jaw dropped
    o.append(V(P(blob([(14, 46), (24, 49), (38, 52), (44, 54), (40, 57), (26, 58), (16, 53)], .8), BY)))
    o.append(S("M15,45 Q26,49 42,52 L40,54 Q26,54 17,50Z", MOUTH))
    o.append(P("M18,44 L20.6,51 L22,44.6Z", TOOTH, .6) + P("M31,47.6 L32.6,53.4 L34,48Z", TOOTH, .6))
    o.append(eye(32, 39, 3, "#e8c23a", slit=True))
    o.append(P("M27,36.6 Q32,33.4 37,36Z", GD, .6))
    o.append(dot(15.6, 39.4, .9, "#14200a"))
    # forked tongue
    o.append(L("M14,46 Q8,44 4,40 M8,43.4 Q4,44 1,46 M4,40 L1,36", OUT, 2.6, .7) + L("M14,46 Q8,44 4,40 M8,43.4 Q4,44 1,46 M4,40 L1,36", "#d8303a", 1.4, 1))
    return svg(o)


# ======================================================================== 4 Bat
def bat():
    begin("nat-nature4-", seed=4)
    M, MD, BD, BL, BN = "#5a4650", "#33262d", "#6b5262", "#a28696", "#3d2c34"
    o = [shadow(60, 15, 3.4, 131, .25)]

    def wing(sx):
        """sx=+1 left wing (viewer's left), -1 right wing (mirrored about x=60)"""
        X = lambda x: x if sx > 0 else 120 - x  # noqa: E731
        sh, el, wr = (52, 58), (40, 52), (30, 44)
        tips = [(4, 38), (8, 64), (22, 84), (40, 94)]
        mem = [(X(52), 62), (X(sh[0]), sh[1])] + [(X(el[0]), el[1]), (X(wr[0]), wr[1])]
        # membrane outline: wrist -> tip0 -> scallop -> tip1 -> ... -> body
        d = f"M{n(X(54))},{n(64)} L{n(X(wr[0]))},{n(wr[1] - 1)} L{n(X(tips[0][0]))},{n(tips[0][1])}"
        prev = tips[0]
        for tp in tips[1:]:
            mx, my = (prev[0] + tp[0]) / 2, (prev[1] + tp[1]) / 2
            ix, iy = mx + (wr[0] - mx) * .3, my + (wr[1] - my) * .3
            d += f" Q{n(X(ix))},{n(iy)} {n(X(tp[0]))},{n(tp[1])}"
            prev = tp
        d += f" Q{n(X(48))},{n(86)} {n(X(56))},{n(90)}Z"
        s = P(d, M)
        s += SH(f"M{n(X(30))},{n(48)} L{n(X(10))},{n(42)} Q{n(X(18))},{n(56)} {n(X(12))},{n(64)} Q{n(X(26))},{n(70)} {n(X(24))},{n(82)} "
                f"Q{n(X(36))},{n(80)} {n(X(40))},{n(90)} Q{n(X(48))},{n(84)} {n(X(54))},{n(86)} L{n(X(52))},{n(64)}Z", MD, .55)
        # translucent veins + wrinkles
        s += clip(d, L(" ".join(f"M{n(X(wr[0] + (t[0] - wr[0]) * .3))},{n(wr[1] + (t[1] - wr[1]) * .3)} "
                                f"Q{n(X(wr[0] + (t[0] - wr[0]) * .6 + 3))},{n(wr[1] + (t[1] - wr[1]) * .6 + 2)} "
                                f"{n(X(wr[0] + (t[0] - wr[0]) * .9 + 4))},{n(wr[1] + (t[1] - wr[1]) * .9 + 3)}" for t in tips),
                         lt(M, .35), .5, .45)
                    + L(f"M{n(X(36))},{n(60)} Q{n(X(44))},{n(66)} {n(X(46))},{n(78)} M{n(X(20))},{n(54)} Q{n(X(28))},{n(60)} {n(X(30))},{n(70)}",
                        MD, .6, .5))
        o.append(V(s))
        # arm bones: upper arm, forearm, fingers
        bones = limb([(X(54), 60), (X(el[0]), el[1]), (X(wr[0]), wr[1])], [4, 3, 2.6], BN, lit=lt(BN, .5), vol=False)
        for tp in tips:
            bones += limb([(X(wr[0]), wr[1]), (X((wr[0] + tp[0]) / 2), (wr[1] + tp[1]) / 2 - 1), (X(tp[0]), tp[1])],
                          [1.8, 1.2, .8], BN, lit=lt(BN, .5), vol=False)
        bones += circ(X(wr[0]), wr[1], 2, BN, .7)
        bones += claws([[(X(wr[0]), wr[1] - 1.6), (X(wr[0] + 1), wr[1] - 4), (X(wr[0] - 1), wr[1] - 5.6)]], .8)
        o.append(bones)
        o.append(rimlight(d, X))

    def rimlight(d, X):
        return LS(f"M{n(X(30))},{n(45)} L{n(X(6))},{n(39)}", "#fff0d0", .9, .5)

    wing(-1)
    wing(1)
    # body: furry torso
    bd = blob([(60, 54), (67, 58), (70, 70), (68, 82), (60, 88), (52, 82), (50, 70), (53, 58)])
    o.append(V(P(bd, BD), clip(bd, hair((48, 52, 72, 90), 95, 70, 3, [lt(BD, .5), dk(BD, .5)], seed=41, op=.6)),
               SH("M64,58 Q70,70 66,84 Q62,86 60,86 Q68,72 64,58Z", "#1a1014", .5)))
    # legs + feet hanging
    o.append(limb([(56, 84), (53, 92), (52, 97)], [3.6, 2.4, 2], BN))
    o.append(limb([(64, 84), (67, 92), (68, 97)], [3.6, 2.4, 2], BN))
    o.append(claws([[(52, 97), (49, 100), (48, 102)], [(52, 97), (52, 101), (51, 103)], [(68, 97), (71, 100), (72, 102)],
                    [(68, 97), (68, 101), (69, 103)]], .8))
    # head: big ears, snub nose leaf, fangs
    for sx in (1, -1):
        X = lambda x: x if sx > 0 else 120 - x  # noqa: E731
        ear = blob([(X(52), 44), (X(47), 32), (X(46), 22), (X(52), 26), (X(58), 36), (X(58), 42)], .7)
        o.append(V(P(ear, BD), SG(blob([(X(52), 41), (X(49), 32), (X(48.6), 26.6), (X(52.6), 30), (X(56), 38)], .7), "#b88a9c")))
        o.append(L(f"M{n(X(50.6))},{n(30)} Q{n(X(51.6))},{n(34)} {n(X(54))},{n(37)}", "#7a5464", .5, .6))
    hd = blob([(60, 37), (68, 40), (71, 48), (67, 56), (60, 59), (53, 56), (49, 48), (52, 40)])
    o.append(V(P(hd, BD), clip(hd, hair((48, 36, 72, 60), 90, 40, 2.4, [lt(BD, .5), dk(BD, .5)], seed=42, op=.55))))
    o.append(beady(55.6, 46.4, 1.9) + beady(64.4, 46.4, 1.9))
    o.append(P("M57,50 Q60,48.4 63,50 L61.4,53 L60,52.4 L58.6,53Z", "#3a222c", .6))
    o.append(dot(58.8, 51.4, .45, "#120a0c") + dot(61.2, 51.4, .45, "#120a0c"))
    o.append(P("M55,55 Q60,58 65,55 Q63,60 60,60 Q57,60 55,55Z", MOUTH, .7))
    o.append(S("M56.4,55.6 L57.6,59.4 L58.6,56.2Z", TOOTH) + S("M61.4,56.2 L62.4,59.4 L63.6,55.6Z", TOOTH))
    return svg(o)


# ======================================================================== 5 Wild Boar
def boar():
    begin("nat-nature5-", seed=5)
    C, CD, CL, BR, SN = "#604129", "#38230f", "#97714b", "#24170c", "#b07c6a"
    o = [shadow(60, 52, 6)]
    # far legs (galloping stretch)
    o.append(limb([(46, 102), (40, 114), (32, 120), (29, 122)], [9, 5.4, 4.2, 4], CD, bulge=[2, 0, 0]))
    o.append(hoof2(28, 125, 5.6, 4))
    o.append(limb([(84, 100), (94, 108), (104, 114), (108, 116)], [11, 5.6, 4.2, 4], CD, bulge=[3, 0, 0]))
    o.append(hoof2(109, 119, 5.6, 4))
    # tail
    o.append(L("M99,80 C106,72 112,78 108,86 L110,88", OUT, 3.4, .8) + L("M99,80 C106,72 112,78 108,86 L110,88", CD, 1.8, 1))
    # body: heavy shoulders, sloping back, lowered head
    body = blob([(30, 86), (38, 72), (52, 66), (70, 66), (88, 70), (100, 78), (104, 92), (98, 106), (84, 112), (64, 114),
                 (46, 112), (34, 104)], .95)
    o.append(V(P(body, C),
               SH("M84,72 Q104,80 102,98 Q96,110 74,112 Q92,102 94,88Z", CD, .7),
               SH("M38,78 Q50,68 68,68 Q52,74 42,86Z", "#fff0d6", .4, "soft2"),
               clip(body, hair((28, 62, 106, 92), 80, 200, 4.4, [lt(C, .4), BR, dk(C, .4)], seed=51, op=.6, w=.6)
                    + hair((28, 90, 106, 116), 85, 120, 4, [dk(C, .5), lt(C, .3)], seed=52, op=.55, w=.6))))
    # shoulder + ham muscle masses
    o.append(LS("M42,80 Q52,88 48,104 M86,80 Q96,90 92,104", "#1a0e06", 1.2, .45))
    o.append(LS("M44,76 Q52,80 52,90", "#fff0d6", 1, .35))
    # bristled crest along the spine: irregular dark tufts swept back
    import random as _r
    rr = _r.Random(55)
    crest, crest_l = "", ""
    for i in range(46):
        t = i / 45
        x = 36 + 64 * t + rr.uniform(-.8, .8)
        y = 70 - 6 * math.sin(math.pi * min(1, t * 1.3)) + (6 * t if t > .7 else 0) + rr.uniform(0, 1.5)
        h = (8 - 5 * t) * rr.uniform(.55, 1.1)
        seg = f"M{n(x - 2)},{n(y + 3)} Q{n(x - .6)},{n(y - h * .45)} {n(x + h * .45)},{n(y - h)} "
        if i % 3:
            crest += seg
        else:
            crest_l += seg
    o.append(L(crest + crest_l, OUT, 1.8, .55) + L(crest, BR, 1.1, 1) + L(crest_l, "#7a5a3e", .8, .9))
    # near legs: stocky, with dew claws and hooves
    o.append(limb([(40, 104), (30, 112), (18, 118), (12, 120)], [12, 6, 4.6, 4.4], C, bulge=[3, 0, 0],
                  tex=lambda d, r: limb_hair(r, [lt(C, .4), BR], seed=5)))
    o.append(hoof2(10, 123, 6, 4.4))
    o.append(limb([(88, 100), (100, 110), (108, 118), (112, 121)], [14, 6.4, 4.6, 4.4], C, bulge=[4, 0, 0],
                  tex=lambda d, r: limb_hair(r, [lt(C, .4), BR], seed=6)))
    o.append(hoof2(113, 125, 6, 4.4))
    # head: long wedge, lowered
    hd = blob([(38, 82), (30, 86), (18, 94), (8, 104), (6, 112), (14, 116), (26, 117), (36, 112), (42, 100)], .9)
    o.append(V(P(hd, C), clip(hd, hair((4, 80, 44, 118), 40, 70, 3.4, [lt(C, .4), BR], seed=53, op=.55, w=.6)),
               SH("M36,90 Q42,104 34,114 Q26,117 22,116 Q34,108 36,90Z", CD, .6),
               SH("M14,98 Q22,90 32,86 Q24,94 18,104Z", "#fff0d6", .4)))
    o.append(V(P(blob([(36, 84), (30, 72), (27, 70), (26, 80), (30, 88)], .7), C)))
    o.append(S(blob([(33, 82), (30, 75), (28.6, 74), (28.4, 80)], .7), "#c48e7a", .7))
    o.append(beady(24, 96, 1.9))
    o.append(LS("M20,93 Q24,91 28,93", "#140c06", 1, .6))
    # snout disc
    o.append(V(ell(9, 110, 5, 6, SN, 1, OUT, 15)))
    o.append(dot(7.6, 108.6, 1, "#3a1e14") + dot(10.6, 111.8, 1, "#3a1e14") + dot(7, 107.4, .5, "#fff", .6))
    # tusks
    o.append(P("M16,114 Q10,111 11,103 Q13,107 17,109Z", TOOTH, .8))
    o.append(L("M15.6,112 Q12,109 12.4,105", "#ffffff", .5, .9))
    o.append(P("M26,117 Q21,114 22,107 Q24,111 28,113Z", "#e8dcb8", .8))
    return svg(o)


# ======================================================================== 6 Wolf
def wolf():
    begin("nat-nature6-", seed=6)
    C, CD, CL, BL = "#8a8890", "#55535b", "#c8c5c2", "#ece8e0"
    o = [shadow(60, 52, 6)]
    # far legs
    o.append(limb([(50, 98), (42, 108), (32, 116), (24, 122)], [9, 5.6, 3.8, 3.4], CD, bulge=[2, 0, 0]))
    o.append(paw(22, 124, 180, 3.6, CD))
    o.append(limb([(84, 94), (92, 104), (102, 108), (108, 114)], [12, 6, 3.8, 3.4], CD, bulge=[3, 0, 0]))
    o.append(paw(110, 117, 20, 3.4, CD))
    # bushy tail
    tl = blob([(96, 82), (106, 74), (114, 76), (119, 86), (118, 98), (112, 92), (104, 90), (98, 90)], .9)
    o.append(V(P(tl, C), clip(tl, hair((94, 72, 120, 100), 30, 60, 4, [CL, CD, dk(C, .5)], seed=60, op=.65)),
               SH("M106,80 Q116,84 118,96 Q112,90 104,88Z", CD, .6)))
    # body: deep chest, tucked waist, strong haunch
    body = blob([(30, 86), (38, 76), (52, 72), (68, 74), (84, 74), (98, 80), (102, 92), (96, 102), (84, 104), (72, 100),
                 (58, 106), (42, 106), (32, 98)], .95)
    o.append(V(P(body, C),
               SH("M84,76 Q102,82 100,98 Q94,104 84,102 Q94,92 88,80Z", CD, .65),
               SH("M40,76 Q56,72 70,74 Q54,80 44,88Z", "#fffaf0", .45, "soft2"),
               SH("M40,102 Q56,110 72,102 Q60,106 44,104Z", BL, .7),
               clip(body, hair((28, 70, 104, 90), 14, 170, 4.2, [lt(C, .55), dk(C, .4), CL], seed=61, op=.55)
                    + hair((30, 88, 102, 108), 20, 110, 4, [CD, lt(C, .3)], seed=62, op=.5))))
    o.append(LS("M44,82 Q54,90 50,102 M84,82 Q94,88 92,100 M60,84 Q72,86 80,84", "#24222a", 1.1, .4))
    # neck ruff
    o.append(V(P(blob([(30, 76), (40, 70), (50, 74), (52, 88), (46, 98), (36, 100), (28, 92)], .9), C),
               clip(blob([(30, 76), (40, 70), (50, 74), (52, 88), (46, 98), (36, 100), (28, 92)], .9),
                    hair((26, 68, 54, 102), 30, 70, 4.4, [CL, CD], seed=64, op=.6))))
    # near legs: fore reaching forward, hind pushing off
    o.append(limb([(42, 96), (32, 104), (20, 110), (12, 114)], [12, 6.4, 4.2, 3.8], C, bulge=[3, 0, 0],
                  tex=lambda d, r: limb_hair(r, [lt(C, .5), CD], seed=7)))
    o.append(paw(9, 116, 190, 4, C))
    o.append(limb([(90, 92), (98, 106), (106, 114), (112, 121)], [15, 7, 4.2, 3.8], C, bulge=[4, 0, 0],
                  tex=lambda d, r: limb_hair(r, [lt(C, .5), CD], seed=8)))
    o.append(paw(115, 124, 30, 3.8, C))
    # head: broad skull, forehead stop, long muzzle, ears laid back, jaws open
    hd = blob([(44, 84), (40, 76), (32, 73), (24, 75), (18, 79), (8, 82), (4, 86), (6, 90), (16, 91), (28, 93), (38, 94)], .8)
    o.append(V(P(hd, C), clip(hd, hair((2, 70, 46, 96), 8, 60, 3, [lt(C, .55), CD], seed=63, op=.55)),
               SH("M38,92 Q46,88 42,78 Q48,90 40,95Z", CD, .6),
               SH("M10,82 Q20,78 30,75 Q24,80 14,85Z", "#fffaf0", .55),
               SH("M18,88 Q26,90 34,89 Q28,93 18,91Z", BL, .6)))
    o.append(V(P(blob([(34, 76), (44, 66), (48, 68), (43, 79)], .6), C), P(blob([(40, 78), (51, 70), (53, 73), (46, 82)], .6), CD)))
    o.append(S("M37,76 L44.6,68.6 L43,76Z", "#c49a9a", .6))
    # lower jaw dropped open
    o.append(V(P(blob([(8, 95), (18, 96), (30, 95), (32, 99), (22, 104), (11, 102)], .8), C)))
    o.append(S("M6,90 Q18,93 31,93 L31,96 Q20,97 9,95Z", MOUTH))
    o.append(S("M6.6,89.6 L8.6,94.4 L10,90Z M15,91 L16.2,94.6 L17.6,91.2Z M22,91.8 L23,94.8 L24.4,92Z", TOOTH))
    o.append(S("M10,96 L11,93.4 L12.4,96.4Z M17,96.8 L18,94 L19.4,97Z", TOOTH))
    o.append(dot(4.4, 85.6, 2.1, "#16100c") + dot(3.6, 84.8, .6, "#fff", .7))
    o.append(eye(23, 81, 2.3, "#e8b830"))
    o.append(LS("M19,78.4 Q23,77 27,79", "#1a1418", .9, .7))
    o.append(L("M10,86 Q6,84 1,83 M10,87.4 Q6,88.6 2,90.6", "#2a2228", .4, .6))
    return svg(o)


# ======================================================================== 7 Bear
def bear():
    begin("nat-nature7-", seed=7)
    C, CD, CL, MZ = "#6e4626", "#422810", "#a07448", "#b89064"
    o = [shadow(62, 40, 7)]

    def furry(d, box, ang, cnt, seed):
        return clip(d, hair(box, ang, cnt, 4.2, [lt(C, .45), dk(C, .5), CL], seed=seed, op=.55, w=.6))

    # far arm raised (viewer's right)
    o.append(limb([(80, 58), (94, 46), (100, 28)], [16, 12, 10], CD, bulge=[3, 1],
                  tex=lambda d, r: limb_hair(r, [lt(CD, .4), dk(CD, .5)], seed=9, ln=3.4)))
    o.append(V(P(blob([(94, 30), (96, 20), (104, 18), (110, 24), (108, 32), (100, 34)], .9), CD)))
    o.append(claws([[(97, 20), (95, 13), (94, 10)], [(102, 18), (102, 11), (100, 8)], [(107, 21), (110, 14), (110, 11)]], 1.2))
    # hind legs (short, standing)
    o.append(limb([(72, 100), (78, 112), (80, 120)], [18, 14, 12], CD))
    o.append(V(P(blob([(70, 122), (78, 118), (90, 119), (93, 124), (84, 127), (72, 126)], .9), CD)))
    o.append(limb([(50, 100), (46, 112), (44, 120)], [18, 14, 12], C,
                  tex=lambda d, r: limb_hair(r, [lt(C, .45), CD], seed=10, ln=3.4)))
    o.append(V(P(blob([(32, 126), (34, 120), (44, 117), (54, 120), (54, 126), (44, 128)], .9), C)))
    o.append(claws([[(35, 125), (31, 127), (30, 129)], [(40, 126.6), (37, 129), (36, 131)], [(46, 127.4), (44, 130), (44, 132)]], 1))
    # torso: massive, rearing, fur mass
    body = blob([(40, 70), (44, 54), (56, 44), (72, 44), (88, 54), (94, 72), (94, 94), (88, 112), (74, 120), (58, 121),
                 (44, 114), (38, 96)], .95)
    o.append(V(P(body, C),
               SH("M80,50 Q96,66 92,96 Q88,114 72,120 Q86,100 86,78 Q86,62 78,52Z", CD, .7),
               SH("M48,60 Q54,48 66,46 Q56,54 52,72Z", "#fff0d6", .45, "soft2"),
               furry(body, (36, 42, 96, 122), 95, 260, 71)))
    # chest / belly lighter fur
    belly = blob([(50, 84), (56, 74), (68, 74), (76, 86), (76, 104), (68, 114), (56, 114), (49, 102)], .95)
    o.append(SG(belly, MZ, .85))
    o.append(clip(belly, hair((48, 72, 78, 116), 92, 70, 3.6, [lt(MZ, .4), dk(MZ, .35)], seed=72, op=.55)))
    o.append(SH("M70,78 Q78,90 74,108 Q70,112 66,112 Q74,96 70,78Z", CD, .45))
    # near arm swiping (viewer's left), claws out
    o.append(limb([(46, 60), (30, 52), (16, 34)], [17, 13, 11], C, bulge=[3, 1],
                  tex=lambda d, r: limb_hair(r, [lt(C, .45), CD], seed=11, ln=3.4)))
    paw_d = blob([(8, 36), (6, 26), (12, 20), (20, 22), (22, 32), (16, 38)], .9)
    o.append(V(P(paw_d, C), clip(paw_d, hair((4, 18, 24, 40), 70, 18, 3, [lt(C, .45), CD], seed=73))))
    o.append(S(blob([(9, 31), (10, 26), (14, 24), (17, 27), (14, 32)], .9), "#4a3426", .7))
    o.append(claws([[(8, 26), (2, 22), (0, 20)], [(7, 30), (1, 30), (-1, 29)], [(9, 34), (4, 38), (2, 40)]], 1.2))
    # head: round, ears, muzzle, roaring
    o.append(V(circ(44, 22, 5.6, C), circ(62, 19, 5.6, C)))
    o.append(dot(44, 22.4, 2.8, "#7a5434", .9) + dot(62, 19.4, 2.8, "#7a5434", .9))
    hd = blob([(40, 30), (44, 22), (54, 19), (64, 23), (67, 33), (63, 44), (52, 48), (42, 44)], .95)
    o.append(V(P(hd, C), furry(hd, (38, 18, 68, 50), 60, 70, 74), SH("M60,24 Q68,32 64,42 Q58,46 54,46 Q64,38 60,24Z", CD, .6)))
    # muzzle
    mz = blob([(30, 38), (36, 33), (46, 34), (50, 40), (46, 46), (36, 47), (30, 44)], .9)
    o.append(V(P(mz, MZ), SH("M44,36 Q50,40 46,46 Q42,46 40,46 Q48,42 44,36Z", "#6a4a30", .5)))
    o.append(V(ell(31.6, 37.6, 3.4, 2.6, "#1e140e")))
    o.append(dot(30.6, 36.6, .8, "#fff", .7))
    o.append(P("M33,43 Q40,51 48,44 Q42,47 33,43Z", MOUTH, .8))
    o.append(S("M35,43.6 L36.4,47 L37.6,44.2Z M44.6,44.4 L45.6,47.4 L47,44Z", TOOTH))
    o.append(beady(45.6, 29.6, 2))
    o.append(LS("M42,27 Q46,25.4 50,27", "#1a0e06", 1, .6))
    return svg(o)


# ======================================================================== 8 Crocodile
def crocodile():
    begin("nat-nature8-", seed=8)
    GR, GD, GL, BY = "#5a7f35", "#34501c", "#8fb35e", "#d2c888"
    o = [shadow(60, 54, 5, 128)]

    def foot(x, y, sx=1, col=GD):
        s = P(blob([(x - 4 * sx, y - 2), (x + 3 * sx, y - 2.6), (x + 6 * sx, y), (x, y + 1.2), (x - 5 * sx, y + .8)], .8), col)
        return s + claws([[(x + 4 * sx, y - .6), (x + 7 * sx, y + .4)], [(x + 1 * sx, y + .4), (x + 3 * sx, y + 2.6)],
                          [(x - 3 * sx, y + .4), (x - 5 * sx, y + 2.4)]], .7)

    sc = lambda d, box: clip(d, scales(box, 4.4, dk(GR, .55), .55, .6))  # noqa: E731
    # far legs: splayed, bent elbows
    o.append(limb([(52, 104), (46, 100), (40, 110), (36, 116)], [8, 6, 4.6, 4], GD))
    o.append(foot(34, 118, -1))
    o.append(limb([(84, 104), (92, 100), (98, 110), (102, 114)], [8, 6, 4.6, 4], GD))
    o.append(foot(104, 116, 1))
    # tail sweeping back-right, with double crest
    tl = blob([(84, 96), (98, 92), (110, 96), (118, 108), (116, 118), (112, 108), (100, 104), (86, 108)], .9)
    o.append(V(P(tl, GR), sc(tl, (84, 90, 120, 120)), SH("M100,100 Q114,104 116,116 Q110,106 98,104Z", GD, .6)))
    for i in range(6):
        x = 90 + i * 4.4
        y = 94 + i * 1.4 + (i * i * .25)
        o.append(P(f"M{n(x - 2)},{n(y + 1)} L{n(x)},{n(y - 3.4)} L{n(x + 2)},{n(y + 1.2)}Z", GD, .6))
    # body: long, low, armoured
    body = blob([(30, 98), (36, 88), (50, 83), (70, 82), (86, 86), (92, 96), (90, 106), (78, 113), (56, 115), (40, 112), (32, 106)], .95)
    o.append(V(P(body, GR), sc(body, (28, 96, 94, 116)),
               SH("M70,84 Q90,88 90,104 Q84,112 66,114 Q84,104 82,92Z", GD, .65),
               SH("M36,106 Q52,114 76,112 Q56,116 38,110Z", BY, .8)))
    # scutes: rows of raised armour plates along the back
    for row, (y0, a) in enumerate(((86.5, 0), (91, 2))):
        for i in range(8):
            x = 40 + i * 6 + a
            if x > 88:
                continue
            yy = y0 + abs(x - 64) * .04
            o.append(P(blob([(x - 2.6, yy + 1.4), (x - 1.6, yy - 1.6), (x + 1.6, yy - 1.8), (x + 2.6, yy + 1.2), (x, yy + 2.4)], .7),
                       lt(GR, .1) if row else GD, .55))
            o.append(L(f"M{n(x - 1.2)},{n(yy - .8)} L{n(x + 1)},{n(yy - 1)}", GL, .5, .8))
    # near legs: upper leg out sideways, elbow bent, lower leg down
    o.append(limb([(44, 106), (34, 104), (26, 112), (20, 120)], [10, 7, 5.6, 4.8], GR, bulge=[2, 0, 0],
                  tex=lambda d, r: scales((14, 98, 48, 124), 3.8, dk(GR, .55), .45, .55)))
    o.append(foot(18, 122, -1, GR))
    o.append(limb([(82, 106), (94, 104), (102, 114), (106, 120)], [10, 7, 5.6, 4.8], GR, bulge=[2, 0, 0],
                  tex=lambda d, r: scales((78, 98, 112, 124), 3.8, dk(GR, .55), .45, .55)))
    o.append(foot(108, 122, 1, GR))
    # head: jaws gaping to the left
    o.append(V(P(blob([(44, 84), (36, 80), (32, 90), (36, 100), (42, 102)], .8), GR)))
    o.append(P("M42,92 L9,70 L5,99Z", MOUTH, .8))
    o.append(S("M40,92 L12,74 L9,96Z", "#3a0c18", .6))
    o.append(S("M36,94 Q22,92 10,92 L9,96 Q24,98 38,97Z", "#d06080", .6))
    uj = blob([(46, 82), (34, 76), (18, 67), (8, 61), (3, 64), (4, 70), (16, 78), (30, 88), (42, 96)], .7)
    o.append(V(P(uj, GR), sc(uj, (2, 58, 48, 98)), SH("M8,63 Q24,70 40,80 Q24,74 10,67Z", GL, .5)))
    for i, (x, y) in enumerate(((10, 70), (17, 74.6), (24, 79), (31, 84), (37, 88.6))):
        o.append(S(f"M{n(x - 1.2)},{n(y - .6)} L{n(x + 2.6)},{n(y + 1.4)} L{n(x + .4)},{n(y + 4.6 - i * .3)}Z", TOOTH))
    lj = blob([(42, 96), (30, 98), (14, 99), (3, 100), (4, 107), (16, 108), (30, 106), (42, 104)], .7)
    o.append(V(P(lj, GR), SH("M5,103 Q20,104 40,101 L40,104 Q22,108 6,107Z", BY, .8)))
    for x in (8, 15, 22, 29, 35):
        o.append(S(f"M{n(x - 1.6)},{n(99.6)} L{n(x + 1.6)},{n(99.4)} L{n(x)},{n(94.6)}Z", TOOTH))
    o.append(V(circ(40, 79, 4.6, GR)))
    o.append(eye(40, 79.6, 3, "#e8c23a", slit=True))
    o.append(P("M36,77 Q40,73.6 44.6,76.6Z", GD, .6))
    o.append(dot(6, 62, 1.2, "#14200a") + dot(9.6, 63.6, .9, "#14200a"))
    return svg(o)


# ======================================================================== 9 Tiger
def tiger():
    begin("nat-nature9-", seed=9)
    O, OD, OL, WH, BK = "#e0862c", "#a8561a", "#f8bc66", "#f6eedb", "#241a18"
    o = [shadow(64, 32, 4.6, 129, .26)]

    def stripes(d, rows, k=3, w=.55):
        """dark stripes wrapping across a limb"""
        s = ""
        for i in range(2, len(rows) - 2, k):
            x, y, nx, ny, wd, ux, uy = rows[i]
            a = (x + nx * wd * .55 + ux * .8, y + ny * wd * .55 + uy * .8)
            b = (x - nx * wd * .1, y - ny * wd * .1)
            c = (x - nx * wd * .55 + ux * 1.4, y - ny * wd * .55 + uy * 1.4)
            s += (f"M{n(a[0])},{n(a[1])} Q{n(b[0] - ux * 1.6)},{n(b[1] - uy * 1.6)} {n(c[0])},{n(c[1])} "
                  f"Q{n(b[0] + ux * wd * w)},{n(b[1] + uy * wd * w)} {n(a[0])},{n(a[1])}Z ")
        return S(s, BK, .9)

    # far legs: hind stretched back, fore reaching forward
    o.append(limb([(84, 90), (98, 96), (110, 104), (116, 110)], [13, 7, 4.6, 4], OD, bulge=[3, 0, 0],
                  tex=lambda d, r: stripes(d, r)))
    o.append(paw(117, 113, 30, 3.4, OD))
    o.append(limb([(42, 60), (30, 62), (16, 64), (8, 65)], [13, 7.6, 5.4, 4.8], OD, bulge=[2, 1, 0],
                  tex=lambda d, r: stripes(d, r)))
    o.append(paw(5, 67, 185, 3.4, OD))
    # tail curling up behind
    o.append(limb([(94, 82), (106, 78), (113, 66), (110, 54), (104, 48)], [6, 5, 4.4, 4, 3.6], O,
                  tex=lambda d, r: stripes(d, r, 4)))
    o.append(V(circ(104, 48, 2.8, BK, .8)))
    # body: stretched leap toward the upper-left, muscular
    body = blob([(22, 50), (32, 40), (48, 40), (66, 48), (84, 58), (98, 70), (102, 86), (96, 98), (84, 100), (68, 94),
                 (52, 84), (38, 76), (26, 66)], .95)
    st = ""
    for (x, y, a) in ((40, 44, 70), (50, 47, 62), (60, 51, 58), (70, 56, 52), (80, 62, 46), (89, 69, 40), (96, 78, 30)):
        ra = math.radians(a)
        ux, uy = math.cos(ra), math.sin(ra)
        L_ = 16
        st += (f"M{n(x - 2)},{n(y - 3)} Q{n(x + ux * L_ * .5 + 2.4)},{n(y + uy * L_ * .5 - 1)} {n(x + ux * L_)},{n(y + uy * L_)} "
               f"Q{n(x + ux * L_ * .5 - .6)},{n(y + uy * L_ * .5 + .4)} {n(x - 2)},{n(y - 3)}Z ")
        st += (f"M{n(x + 3)},{n(y - 2)} Q{n(x + ux * 6 + 4)},{n(y + uy * 6)} {n(x + ux * 8 + 2)},{n(y + uy * 8)} "
               f"Q{n(x + ux * 4 + 2.4)},{n(y + uy * 4)} {n(x + 3)},{n(y - 2)}Z ")
    o.append(V(P(body, O),
               SH("M84,60 Q102,74 100,92 Q94,100 82,98 Q96,86 90,72Z", OD, .7),
               SH("M32,44 Q50,40 68,50 Q50,48 36,56Z", "#fff4d8", .5, "soft2"),
               clip(body, S(st, BK, .9) + SH("M38,74 Q58,90 84,98 Q94,100 98,96 L100,104 L36,84Z", WH, .9)
                    + hair((20, 38, 104, 102), 30, 160, 3.4, [lt(O, .5), dk(O, .35)], seed=91, op=.45))))
    o.append(LS("M40,58 Q48,66 44,76 M84,70 Q92,80 90,92", "#5a2a0c", 1.2, .45))
    # near legs
    o.append(limb([(78, 90), (92, 100), (102, 112), (108, 121)], [15, 8, 5, 4.4], O, bulge=[4, 0, 0],
                  tex=lambda d, r: stripes(d, r)))
    o.append(paw(110, 124, 50, 3.8, O))
    o.append(limb([(36, 64), (26, 72), (14, 78), (6, 80)], [15, 8.4, 6, 5.2], O, bulge=[3, 1, 0],
                  tex=lambda d, r: stripes(d, r)))
    o.append(paw(3, 82, 190, 3.8, O))
    # head
    o.append(V(circ(20, 36, 4.8, O), circ(35, 33, 4.8, O)))
    o.append(dot(20, 36.4, 2.4, BK, .85) + dot(35, 33.4, 2.4, BK, .85) + dot(20, 36.6, 1.2, WH, .9) + dot(35, 33.6, 1.2, WH, .9))
    hd = blob([(16, 44), (20, 36), (30, 33), (40, 37), (43, 47), (38, 56), (28, 60), (18, 58), (13, 52)], .95)
    o.append(V(P(hd, O), clip(hd, S("M30,35 L34,37 L32,44 L29,42Z M36,42 L41,44 L39,52 L35,50Z M24,34 L28,34 L27,39 L24.6,38Z "
                                    "M40,49 L43,52 L40,56 L38,53Z", BK, .9)
                              + hair((12, 32, 44, 60), 40, 40, 2.6, [lt(O, .5), dk(O, .3)], seed=92, op=.45)),
               SH("M36,40 Q44,48 38,56 Q32,58 30,58 Q40,50 36,40Z", OD, .5)))
    # white muzzle, open jaws
    o.append(V(P(blob([(10, 50), (14, 45), (22, 46), (27, 52), (24, 58), (14, 59)], .9), WH)))
    o.append(P("M12,55 Q14,63 22,64 Q27,62 28,57 Q20,60 12,55Z", MOUTH, .8))
    o.append(S("M14,56 L15.2,60.4 L16.6,56.4Z M23,57.4 L24.2,61.4 L25.6,57.2Z", TOOTH))
    o.append(dot(10.6, 49.6, 2.2, "#2a1410") + dot(10, 49, .6, "#fff", .7))
    o.append(L("M14,53 Q8,52 2,50 M14,54.4 Q8,55 3,57", "#fffaf0", .45, .9))
    o.append(eye(22, 43.6, 2.4, "#e8c23a"))
    o.append(LS("M18.6,41 Q22,39.6 26,41.4", BK, .9, .7))
    return svg(o)


# ======================================================================== 10 Elephant
def elephant():
    begin("nat-nature10-", seed=10)
    E, ED, EL = "#8e8a8a", "#5d595b", "#bdb7b2"
    o = [shadow(64, 52, 6)]

    def wrinkle(box, seed, cnt=26):
        return hair(box, 0, cnt, 7, [dk(E, .4), lt(E, .4)], seed=seed, op=.32, w=.55, curl=.35)

    def colleg(top, bot, w, col):
        """columnar leg with toenails"""
        s = limb([top, ((top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2), bot], [w, w * .9, w * .95], col, cap1=False,
                 tex=lambda d, r: L(" ".join(f"M{n(x - nx * w * .4)},{n(y - ny * w * .4)} Q{n(x)},{n(y + 1)} {n(x + nx * w * .4)},{n(y + ny * w * .4)}"
                                             for x, y, nx, ny, w, _, _ in r[len(r) // 2::3]), dk(col, .4), .55, .6))
        x, y = bot
        s += P(f"M{n(x - w / 2 - .4)},{n(y - 2)} Q{n(x)},{n(y - 3.6)} {n(x + w / 2 + .4)},{n(y - 2)} L{n(x + w / 2 + 1)},{n(y + 1)} "
               f"L{n(x - w / 2 - 1)},{n(y + 1)}Z", col)
        for k in (-1, 0, 1):
            s += P(blob([(x + k * w * .3 - 1.6, y + .8), (x + k * w * .3 - 1.4, y - 1.4), (x + k * w * .3 + 1.4, y - 1.4),
                         (x + k * w * .3 + 1.6, y + .8)], .6), "#e4ddcc", .5)
        return s

    o.append(colleg((58, 102), (60, 126), 12, ED))
    o.append(colleg((94, 102), (99, 126), 12, ED))
    o.append(L("M108,86 C116,92 117,104 112,112", OUT, 3.6, .8) + L("M108,86 C116,92 117,104 112,112", ED, 2, 1))
    o.append(L("M112,112 l-2,5 M112,112 l1,5 M112,112 l3,4", "#2a2420", .8, .8))
    body = blob([(32, 86), (38, 62), (56, 50), (78, 48), (100, 54), (110, 70), (111, 90), (104, 106), (86, 112), (64, 113),
                 (44, 108), (34, 98)], .95)
    o.append(V(P(body, E),
               SH("M80,50 Q106,56 110,82 Q108,106 88,112 Q102,96 100,80 Q98,62 80,50Z", ED, .65),
               SH("M44,66 Q56,52 74,50 Q56,60 50,78Z", "#fffaf0", .45, "soft2"),
               clip(body, wrinkle((34, 50, 110, 112), 101, 34)
                    + L("M60,66 Q76,62 94,72 M84,94 Q96,98 104,92 M68,104 Q80,108 92,104 M50,96 Q56,104 66,106", dk(E, .35), .8, .55))))
    o.append(colleg((46, 104), (40, 126), 13.6, E))
    o.append(colleg((86, 104), (89, 126), 13.6, E))
    # head + forehead dome
    hd = blob([(40, 56), (28, 58), (18, 68), (15, 82), (20, 94), (32, 100), (44, 96), (50, 84), (50, 68)], .95)
    o.append(V(P(hd, E), clip(hd, wrinkle((14, 56, 52, 100), 102, 18)), SH("M44,60 Q52,72 48,90 Q42,98 34,100 Q46,88 44,60Z", ED, .55)))
    # ear flap with veins and frilled edge
    ear = blob([(46, 58), (58, 52), (66, 58), (68, 72), (64, 86), (56, 94), (46, 92), (42, 84), (46, 72)], .9)
    o.append(V(P(ear, E), SH("M50,62 Q62,58 64,72 Q62,86 52,92 Q60,80 58,70Z", ED, .55),
               clip(ear, L("M50,62 Q58,66 58,76 M48,70 Q54,76 52,86 M56,60 Q64,66 64,76", dk(E, .4), .55, .55)
                    + L("M58,54 Q66,58 67,70", lt(E, .5), 1, .5))))
    o.append(beady(25, 75, 1.9))
    o.append(L("M21.6,72 Q25,70.6 28.4,72.4 M22,79 Q25,80 28,79", ED, .6, .7))
    # tusks
    o.append(P("M30,94 C22,102 11,101 6,93 C12,98 21,97 26,89Z", "#f1e8cc", .9))
    o.append(L("M26,92.6 C20,98.6 13,98 9,95", "#ffffff", .6, .9))
    o.append(P("M36,98 C30,106 20,110 12,106 C20,106 28,102 32,94Z", "#e4d8b6", .9))
    # trunk raised high and curled, with rings
    tk = [(24, 88), (16, 84), (10, 72), (8, 58), (8, 46), (10, 38), (15, 33)]
    o.append(limb(tk, [12, 10, 8.4, 7.4, 6.6, 6, 5.6], E, cap0=False,
                  tex=lambda d, r: L(" ".join(f"M{n(x + nx * w * .5)},{n(y + ny * w * .5)} Q{n(x + ux * 1.2)},{n(y + uy * 1.2)} "
                                              f"{n(x - nx * w * .5)},{n(y - ny * w * .5)}" for x, y, nx, ny, w, ux, uy in r[2::3]),
                                     dk(E, .4), .6, .65)))
    o.append(V(P(blob([(13, 30), (17, 29), (20, 32), (17, 36), (13, 35)], .8), E)))
    o.append(S(blob([(15.6, 31.4), (18.4, 31.6), (17.4, 34)], .8), "#3a3030", .8))
    return svg(o)


UNITS = [(1, rat), (2, spider), (3, snake), (4, bat), (5, boar), (6, wolf), (7, bear), (8, crocodile), (9, tiger),
         (10, elephant)]

if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "big"
    only = {int(a) for a in sys.argv[2:]}
    for k, fn in UNITS:
        if only and k not in only:
            continue
        s = fn()
        (out / f"nature-{k}.svg").write_text(s)
        print(k, len(s))
