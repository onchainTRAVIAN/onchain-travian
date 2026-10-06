"""Shared materials and equipment (weapons, shields, helmets)."""
import math
from lib import *
from human import Frame, dvec

# ------------------------------------------------------------ materials ----
STEEL = Mat("#c4ccd4", sh="#8290a0", hl="#ffffff", line="#3f454c", metal=True)
IRON = Mat("#8d9298", sh="#5f646c", hl="#c9ced2", line="#33363c", metal=True)
DIRON = Mat("#6c7078", sh="#4a4d55", hl="#a6abb2", line="#25272c", metal=True)
GOLD = Mat("#f4c430", sh="#c98a14", hl="#fff0a0", line="#5e3c0c", metal=True)
BRONZE = Mat("#c08a3e", sh="#8d5b26", hl="#ecc27a", line="#4f3010", metal=True)
LEATHER = Mat("#9a5f2c", sh="#6a3c16", hl="#b88250", line="#3d2210")
DLEATHER = Mat("#5f3b20", sh="#432611", hl="#8b5f38", line="#26140a")
WOOD = Mat("#b8813e", sh="#7e5222", hl="#cf9d62", line="#432811")
DWOOD = Mat("#7b522c", sh="#58371b", hl="#a8794a", line="#33200d")
ROPE = Mat("#c9a96a", sh="#9a7a44", hl="#ead39b", line="#5b4520")
LINEN = Mat("#ece0c4", sh="#c4b08c", hl="#fffaf0", line="#6e5a3c")
WHITE = Mat("#f2ede0", sh="#c9c0ae", hl="#ffffff", line="#6c6455")
FUR = Mat("#8a6a4a", sh="#5e4630", hl="#b9976d", line="#3a2817")
FURL = Mat("#c8b394", sh="#9c8566", hl="#e9dcc2", line="#5a4630")

# tribe cloth
RRED = Mat("#d8302a", sh="#962018", hl="#f2705a", line="#4e1110")
RPURP = Mat("#7b3a7c", sh="#55225a", hl="#a8619e", line="#2e0f30")
TBLUE = Mat("#3a72c8", sh="#244c8e", hl="#78a8e8", line="#16264a")
TBLUE2 = Mat("#5c7fb0", sh="#3d5c8c", hl="#8eaedb", line="#1c2e52")
TBROWN = Mat("#7a5634", sh="#563a21", hl="#a47b52", line="#2e1d0e")
GGREEN = Mat("#3fa02e", sh="#26701c", hl="#80d066", line="#1b3612")
GGREEN2 = Mat("#6e9c43", sh="#4c742b", hl="#a2c874", line="#26400f")
GCHECK = Mat("#3f7d4f", sh="#2b5a38", hl="#6ba57a", line="#16331d")
NPURP = Mat("#7a3ea6", sh="#52267a", hl="#ac78d4", line="#22103a")
NPURP2 = Mat("#8a58b0", sh="#633b86", hl="#b98ad8", line="#2c1446")
BLACK = Mat("#3a3436", sh="#232023", hl="#5e5658", line="#140f10")

HAIR_BROWN = Mat("#6a4122", sh="#4a2a14", hl="#946238", line="#2a170a")
HAIR_DARK = Mat("#3c2a1e", sh="#271a12", hl="#5e4632", line="#140c06")
HAIR_BLOND = Mat("#d7a84e", sh="#a97a2c", hl="#f3d68c", line="#5c3d10")
HAIR_RED = Mat("#e0702a", sh="#a84a14", hl="#f8a860", line="#4a200a")
HAIR_GREY = Mat("#b6b0a6", sh="#8a8478", hl="#e2ddd2", line="#4a463e")


# ------------------------------------------------------------- weapons -----

def sword(cv, hand, d, blade=22, w=3.0, mat=STEEL, guard=GOLD, grip=DLEATHER, s=1.0, part="all", point=True,
          glow=None):
    """Straight sword held in a fist at `hand`, blade pointing along d.
    part: 'hilt' (behind fist), 'blade' (in front), or 'all'."""
    d = norm(d)
    n = perp(d)
    if part in ("all", "hilt"):
        pom = sub(hand, mul(d, 4.6 * s))
        cv.rod(sub(hand, mul(d, 3.6 * s)), add(hand, mul(d, 3.4 * s)), 2.2 * s, grip)
        cv.shape(ell_pts(pom, 1.6 * s, 1.6 * s, n=6), guard, sh=.4, lw=.5)
    if part in ("all", "blade"):
        b0 = add(hand, mul(d, 3.6 * s))
        tip = add(b0, mul(d, blade * s))
        pts = [C(*add(b0, mul(n, w / 2 * s))), add(lerp(b0, tip, .7), mul(n, w / 2 * s * .95)),
               C(*tip), add(lerp(b0, tip, .7), mul(n, -w / 2 * s * .95)), C(*add(b0, mul(n, -w / 2 * s)))]
        if not point:
            pts[2] = C(*add(tip, mul(n, 0)))
        cv.shape(pts, mat, sh=.6, lw=.55, glow=glow)
        cv.stroke([lerp(b0, tip, .05), lerp(b0, tip, .82)], mat.hl, w=.5, detail=True, op=.9)
        g0, g1 = add(b0, mul(n, 3.2 * s)), add(b0, mul(n, -3.2 * s))
        cv.shape(band([g0, g1], 1.8 * s), guard, sh=.3, lw=.5)


def spear(cv, a, b, mat=WOOD, head=STEEL, w=1.7, head_len=9, head_w=3.4, s=1.0, butt=True):
    """Shaft from a (butt) to b (tip base), leaf head beyond b."""
    d = norm(sub(b, a))
    n = perp(d)
    cv.rod(a, b, w * s, mat)
    tip = add(b, mul(d, head_len * s))
    base = sub(b, mul(d, 1.5 * s))
    pts = [C(*base), add(lerp(base, tip, .38), mul(n, head_w / 2 * s)), C(*tip),
           add(lerp(base, tip, .38), mul(n, -head_w / 2 * s))]
    cv.shape(pts, head, sh=.5, lw=.5)
    cv.stroke([lerp(base, tip, .15), lerp(base, tip, .8)], head.sh, w=.35, detail=True)
    if butt:
        cv.shape(band([a, sub(a, mul(d, 2.0 * s))], (w + .5) * s), head, sh=.2, lw=.4, detail=True)


def axe_head(cv, top, d, mat=IRON, size=1.0, beard=True):
    """Axe blade fixed near `top` of a haft pointing along d (haft direction
    toward the head); blade swings to the left-normal side."""
    d = norm(d)
    n = perp(d)
    k = size
    def q(u, v):  # u along haft (toward top), v along blade side
        return add(add(top, mul(d, u * k)), mul(n, v * k))
    if beard:
        pts = [q(1.2, 1.2), q(3.0, 4.0), q(6.4, 8.6), C(*q(7.2, 11.6)), q(2.0, 10.6), q(-3.2, 11.4),
               C(*q(-5.2, 10.6)), q(-3.2, 7.6), q(-2.4, 3.0), q(-1.8, 1.2)]
    else:
        pts = [q(1.2, 1.2), q(3.4, 6.0), C(*q(5.4, 9.6)), q(0, 10.6), C(*q(-5.4, 9.4)), q(-3.4, 5.6),
               q(-1.6, 1.2)]
    cv.shape(pts, mat, sh=.8, lw=.6)
    cv.stroke([q(5.6, 10.0), q(1.2, 10.8 - .2), q(-4.4, 10.0)], mat.hl, w=.7, detail=True)


# ------------------------------------------------------------- shields -----

def round_shield(cv, c, rx, ry, face, rim=IRON, boss=IRON, ang=0, paint=None, edge_side=-1, thick=2.0):
    """Round shield seen at an angle: rim ellipse, face, boss; paint(cv, c, rx, ry)."""
    # visible thickness on the left
    cv.shape(ell_pts(add(c, (edge_side * thick, .3)), rx, ry, ang, n=12), DWOOD, sh=.5, lw=.6)
    cv.shape(ell_pts(c, rx, ry, ang, n=12), rim, sh=.8, lw=.7)
    cv.shape(ell_pts(c, rx - 1.6, ry - 1.6, ang, n=12), face, sh=1.8, lw=.5)
    if paint:
        paint(cv, c, rx - 1.6, ry - 1.6)
    cv.shape(ell_pts(c, rx * .22, ry * .22, ang, n=8), boss, sh=.9, lw=.6)
    cv.dot(add(c, (-rx * .07, -ry * .08)), rx * .06, boss.hl, detail=True)
