"""Siege engine parts (comic style)."""
import math
from lib import *
from gear import WOOD, DWOOD, IRON, DIRON, ROPE, LEATHER, STEEL, BRONZE

FIRE = Mat("#ff9a1e", sh="#e2541a", hl="#fff07a", line="#18110c")
FIREY = Mat("#ffe04a", sh="#ffb020", hl="#fffbd0", line="#18110c")
STONE = Mat("#a8a49c", sh="#77736c", hl="#d8d5ce", line="#18110c")
HIDE = Mat("#a8683a", sh="#764420", hl="#d0945e", line="#18110c")
WICKER = Mat("#c49a52", sh="#8e6a30", hl="#e8c888", line="#18110c")


def wheel(cv, c, r, mat=WOOD, far=False, spokes=6, squash=.9):
    m = Mat(shade(mat.base, .25), sh=shade(mat.sh, .2), hl=mat.base, line=mat.line) if far else mat
    rx, ry = r * squash, r
    cv.shape(ell_pts(c, rx, ry, n=12), m, sh=1.0, lw=.75)
    cv.shape(ell_pts(c, rx * .74, ry * .74, n=12), Mat(m.sh, sh=shade(m.sh, .2), hl=m.sh, line=m.line), sh=0, lw=.5)
    for i in range(spokes):
        a = i * 180 / spokes * 2 + 15
        p = (c[0] + math.cos(math.radians(a)) * rx * .76, c[1] + math.sin(math.radians(a)) * ry * .76)
        cv.stroke([c, p], m.base, w=1.6)
    cv.shape(ell_pts(c, rx * .26, ry * .26, n=8), IRON, sh=.3, lw=.55)
    # iron tyre studs
    for i in range(8):
        a = i * 45 + 10
        cv.dot((c[0] + math.cos(math.radians(a)) * rx * .88, c[1] + math.sin(math.radians(a)) * ry * .88), .55,
               "#3a3a40")


def beam(cv, a, b, w, mat=WOOD, far=False, sh=.7):
    m = Mat(shade(mat.base, .25), sh=shade(mat.sh, .2), hl=mat.base, line=mat.line) if far else mat
    cv.rod(a, b, w, m, sh=sh)


def grain(cv, a, b, n=2, w=.5, color=None):
    """Wood-grain lines along a beam."""
    d = norm(sub(b, a)); nn = perp(d)
    for i in range(n):
        o = (i - (n - 1) / 2) * 1.2
        p0 = add(lerp(a, b, .15 + .1 * i), mul(nn, o))
        p1 = add(lerp(a, b, .55 + .1 * i), mul(nn, o))
        cv.stroke([p0, p1], color or WOOD.sh, w=w, detail=True)


def flame(cv, c, s=1.0):
    pts = [(c[0] - 6 * s, c[1] + 2 * s), (c[0] - 7 * s, c[1] - 5 * s), C(c[0] - 4 * s, c[1] - 9 * s),
           (c[0] - 3 * s, c[1] - 5 * s), C(c[0] - 1 * s, c[1] - 14 * s), (c[0] + 2 * s, c[1] - 7 * s),
           C(c[0] + 5 * s, c[1] - 11 * s), (c[0] + 6 * s, c[1] - 4 * s), (c[0] + 6 * s, c[1] + 2 * s),
           (c[0], c[1] + 5 * s)]
    cv.shape(pts, FIRE, sh=1.2, lw=.6)
    inner = [(c[0] - 3.4 * s, c[1] + 2 * s), (c[0] - 3.6 * s, c[1] - 3 * s), C(c[0] - 1.2 * s, c[1] - 8 * s),
             (c[0] + .6 * s, c[1] - 3 * s), C(c[0] + 3 * s, c[1] - 6 * s), (c[0] + 3.6 * s, c[1] + 1 * s),
             (c[0], c[1] + 3 * s)]
    cv.shape(inner, FIREY, sh=0, lw=0, noline=True)


def boulder(cv, c, r):
    pts = [(c[0] - r, c[1] - r * .1), (c[0] - r * .7, c[1] - r * .8), (c[0], c[1] - r), (c[0] + r * .8, c[1] - r * .7),
           (c[0] + r, c[1] + r * .1), (c[0] + r * .6, c[1] + r * .8), (c[0] - r * .3, c[1] + r * .95),
           (c[0] - r * .85, c[1] + r * .6)]
    cv.shape(pts, STONE, sh=1.2, lw=.7)
    cv.stroke([(c[0] - r * .3, c[1] - r * .3), (c[0] + r * .1, c[1] - r * .1)], STONE.sh, w=.6, detail=True)


def rope_coil(cv, a, b, turns=5, w=3.0):
    for i in range(turns):
        p = lerp(a, b, (i + .5) / turns)
        d = norm(sub(b, a)); n = perp(d)
        cv.stroke([add(p, mul(n, w)), add(add(p, mul(d, 1.2)), mul(n, -w))], ROPE.sh, w=1.0)
