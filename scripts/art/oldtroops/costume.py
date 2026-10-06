"""Shared costume pieces (clothes, footwear, hands)."""
from lib import *
from human import *
from gear import *

SANDAL = LEATHER
WRAP = Mat("#e6d8b4", sh="#b8a47c", hl="#fff6dc", line="#18110c")
BOOT = LEATHER


def cape(cv, b, mat, pts_local, sh=2.0):
    cv.shape(b.T.pts(pts_local), mat, sh=sh, lw=.7)


def sandal(cv, b, side):
    cv.shape(b.foot_pts(side, "sandal"), SKIN, sh=.8, lw=.6)
    ank = b.ankF if side == 'F' else b.ankN
    fr = Frame(ank, b.footF if side == 'F' else b.footN, b.s * b.foot)
    ln = b.footF_len if side == 'F' else b.footN_len
    cv.shape(fr.pts([C(-10.7 * ln, 4.6), C(-10.4 * ln, 5.5), C(2.5, 5.5), C(2.8, 4.4)]), SANDAL, sh=.2, lw=.5)
    for t in (-1.0, -4.0 * ln, -7.0 * ln):
        cv.stroke(fr.pts([(t + .6, 1.0 if t < -1 else -.6), (t - 1.2, 4.4)]), SANDAL.sh, w=.7, detail=True)
    cv.stroke(fr.pts([(-2.6, -.4), (2.6, -.6)]), SANDAL.sh, w=.8, detail=True)
    # straps up the shin
    knee = b.kneeF if side == 'F' else b.kneeN
    for t in (.78, .9):
        p = lerp(knee, ank, t)
        cv.stroke([add(p, (-2.6, .6)), add(p, (2.8, -.4))], SANDAL.sh, w=.6, detail=True)


def skirt(cv, b, mat=RRED, hem=13.5, flare=1.0, waist=-6.0):
    T = b.T
    f = flare
    pts = [(-10.4, waist), (10.4, waist + .4), (11.6 * f, 6), C(12.6 * f, hem + .6), (8.0 * f, hem - .6),
           (4.0, hem + 1.2), (0, hem - .2), (-4.4, hem + .8), (-8.6 * f, hem - .6), C(-13.0 * f, hem), (-12.0 * f, 6)]
    cv.shape(b.tw(pts, b.shw ** .5), mat, sh=1.8, lw=.7)
    for x0, x1 in ((-6.0, -6.6), (-1.6, -1.8), (3.2, 3.6), (7.6, 8.2)):
        cv.stroke(T.pts([(x0, waist + 4), (x1, hem - .4)]), mat.sh, w=.7, detail=True)


def belt_apron(cv, b, metal=BRONZE, leather=DLEATHER, straps=4):
    T = b.T
    cv.shape(b.tw([C(-11.4, -4.6), (0, -3.6), C(11.0, -4.2), C(11.0, -1.4), (0, -.8), C(-11.6, -1.8)]),
             leather, sh=.4, lw=.55)
    for x in (-8.6, -5.0, -1.2, 2.8, 6.8):
        cv.shape(T.pts([C(x - 1.1, -4.0), C(x + 1.1, -3.9), C(x + 1.1, -1.4), C(x - 1.1, -1.5)]), metal, sh=.3,
                 lw=.35, detail=True)
    for i in range(straps):
        x = -7.6 + i * 2.6
        cv.shape(T.pts([C(x - .9, -1.4), C(x + .9, -1.3), C(x + 1.0, 11.0 - abs(i - 1.5)), C(x - .8, 11.0 - abs(i - 1.5))]),
                 leather, sh=.2, lw=.4)
        for t in range(3):
            cv.dot(T.p(x + .05, 1.6 + t * 3.0), .55, metal.base)


def fist(cv, b, side, mat=SKIN):
    cv.shape(b.fist_pts(side), mat, sh=.8, lw=.6)
    el, wr = (b.elF, b.wrF) if side == 'F' else (b.elN, b.wrN)
    d = norm(sub(wr, el)); n = perp(d); k = b.s * b.hand
    for t in (2.2, 3.6):
        a = add(add(wr, mul(d, t * k)), mul(n, -2.6 * k))
        cv.stroke([a, add(a, mul(n, 1.4 * k))], mat.line, w=.45, detail=True)


# ------------------------------------------------------------------ units --


def lorica(cv, b, metal=STEEL, under=RRED):
    T = b.T
    cv.shape(b.tw([(-4.8, -30.6), (-10.6, -28.4), (-12.8, -24.0), (-12.4, -19.0), (-10.8, -12.6),
                    (-10.6, -7.6), C(-11.2, -3.6), (0, -2.8), C(10.8, -3.2), (10.4, -8.0), (11.8, -17.6),
                    (11.6, -25.6), (6.4, -30.8)]), metal, sh=2.2, lw=.75)
    for y in (-7.2, -10.6, -14.0, -17.4):
        cv.stroke(b.tw([(-11.0, y + .2), (-3.0, y + 1.5), (4.0, y + 1.2), (11.4, y - .4)]), metal.sh, w=.6,
                  detail=True)
    # chest plates and central closure
    cv.stroke(b.tw([(-12.0, -21.2), (-6.0, -20.0), (0.0, -21.2), (6.0, -22.6)]), metal.sh, w=.6, detail=True)
    cv.stroke(T.pts([(-4.2, -29.4), (-3.4, -21.6)]), metal.sh, w=.5, detail=True)
    for y in (-8.9, -12.3, -15.7):
        cv.dot(T.p(-3.6, y + 1.6), .45, BRONZE.base)
    cv.shape(T.pts([(-6.2, -31.4), (-2.0, -32.6), (3.6, -32.0), (6.0, -30.6), (1.0, -29.8), (-4.0, -29.4)]),
             under, sh=.4, lw=.5)  # scarf


def shoulder_plates(cv, b, side, metal=STEEL, n=3):
    sh, el = (b.shF, b.elF) if side == 'F' else (b.shN, b.elN)
    d = norm(sub(el, sh))
    nn = perp(d)
    for i in range(n - 1, -1, -1):
        c = add(sh, mul(d, (i * 2.6 - 1.4) * b.s))
        w = (5.6 - i * .3) * b.s
        pts = [C(*add(c, mul(nn, w))), add(add(c, mul(d, -2.6 * b.s)), mul(nn, w * .2)),
               add(add(c, mul(d, -2.4 * b.s)), mul(nn, -w * .7)), C(*add(c, mul(nn, -w))),
               add(c, mul(d, 1.4 * b.s))]
        cv.shape(pts, metal, sh=.7, lw=.6)


def trouser_leg(cv, b, side, mat=TBROWN, wraps=WRAP, boot=BOOT):
    cv.shape(b.leg_pts(side, bulk=1.1), mat, sh=1.4)
    if wraps:
        cv.shape(b.shin_pts(side, frm=.3, grow=.6), wraps, sh=.8, lw=.6)
        knee, ank = (b.kneeF, b.ankF) if side == 'F' else (b.kneeN, b.ankN)
        for t in (.42, .56, .7, .84):
            p = lerp(knee, ank, t)
            cv.stroke([add(p, (-3.0 * b.s, -.6)), add(p, (3.2 * b.s, 1.2))], wraps.sh, w=.6, detail=True)
    cv.shape(b.foot_pts(side, "boot"), boot, sh=.8, lw=.6)
    ank = b.ankF if side == 'F' else b.ankN
    fr = Frame(ank, b.footF if side == 'F' else b.footN, b.s * b.foot)
    cv.stroke(fr.pts([(-3.0, -1.0), (2.8, -1.2)]), boot.sh, w=.7, detail=True)


def tunic(cv, b, mat=TBLUE, hem=17.0, trim=None, belt=DLEATHER, buckle=BRONZE):
    T = b.T
    pts = [(-5.0, -31.0), (-11.6, -28.6), (-13.2, -23.0), (-12.4, -16.0), (-11.2, -8.0), (-12.8, 4.0),
           C(-14.6, hem), (-9.0, hem + 1.2), (-3.0, hem + .2), (3.0, hem + 1.4), (8.6, hem + .4), C(13.4, hem - .4),
           (11.6, 4.0), (10.6, -8.0), (12.2, -17.0), (12.4, -25.6), (6.6, -31.0)]
    cv.shape(b.tw(pts), mat, sh=2.2, lw=.75)
    for x0, x1 in ((-8.0, -9.4), (-2.6, -3.0), (3.4, 4.0), (8.6, 9.6)):
        cv.stroke(b.tw([(x0, 1.0), (x1, hem - .6)]), mat.sh, w=.7, detail=True)
    if trim:
        cv.stroke(b.tw([(-14.2, hem - 1.2), (-9.0, hem - .2), (-3.0, hem - 1.0), (3.0, hem + .2), (8.6, hem - .8),
                        (13.0, hem - 1.6)]), trim.base, w=1.4)
    cv.shape(b.tw([C(-11.8, -5.4), (0, -4.2), C(11.2, -5.0), C(11.2, -2.2), (0, -1.4), C(-11.8, -2.6)]),
             belt, sh=.3, lw=.55)
    cv.shape(b.tw([C(-6.2, -5.4), C(-2.6, -5.2), C(-2.6, -1.6), C(-6.2, -1.8)]), buckle, sh=.3, lw=.5)


def fur_mantle(cv, b, mat=FUR, depth=1.0):
    k = depth
    pts = [(-6.0, -33.6), (-12.8, -31.0), (-15.0, -26.0), (-14.0, -21.0 * k), C(-12.0, -22.6 * k), (-10.4, -19.0 * k),
           C(-8.4, -21.6 * k), (-6.0, -18.4 * k), C(-3.4, -21.4 * k), (-.6, -18.6 * k), C(2.0, -21.8 * k),
           (4.6, -18.8 * k), C(7.0, -22.0 * k), (9.6, -19.0 * k), C(12.0, -22.4 * k), (14.6, -20.0 * k),
           (15.0, -27.0), (8.4, -33.0), (1.0, -34.0)]
    cv.shape(b.tw(pts), mat, sh=1.8, lw=.7)
    for x, y in ((-10, -27), (-5, -29), (0, -27), (5, -29), (10, -27), (-7, -24), (3, -24), (8, -23.5)):
        cv.stroke(b.tw([(x, y), (x - .8, y + 2.6)]), mat.sh, w=.6, detail=True)
        cv.stroke(b.tw([(x + 1.6, y - 1.2), (x + 1.0, y + 1.2)]), mat.hl, w=.5, detail=True, op=.7)


def round_shield_back(cv, b, face=TBLUE2, paint=None):
    c = b.T.p(9.0, -15.0)
    round_shield(cv, c, 14 * b.s, 16 * b.s, face, rim=IRON, boss=IRON, paint=paint, edge_side=1)


def open_hand(cv, b, side, mat=SKIN, mirror=False):
    cv.shape(b.open_hand_pts(side, mirror=mirror), mat, sh=.6, lw=.6)


def greave(cv, b, side, metal=STEEL):
    cv.shape(b.shin_pts(side, frm=.12, to=.8, grow=.7), metal, sh=.8, lw=.6)
    knee = b.kneeF if side == 'F' else b.kneeN
    cv.shape(ell_pts(knee, 3.6 * b.s * b.leg_bulk, 3.0 * b.s * b.leg_bulk, n=8), metal, sh=.4, lw=.55)


def muscle_cuirass(cv, b, metal=BRONZE, under=RRED):
    cv.shape(b.tw([(-4.8, -30.6), (-11.0, -28.6), (-13.0, -24.0), (-12.6, -19.0), (-10.8, -12.6), (-10.6, -7.6),
                   C(-11.6, -3.0), (0, -1.8), C(11.0, -2.6), (10.4, -8.0), (11.8, -17.6), (11.6, -25.6),
                   (6.4, -30.8)]), metal, sh=2.2, lw=.75)
    cv.stroke(b.tw([(-11.4, -19.6), (-8.0, -17.4), (-4.2, -18.8), (-1.6, -17.4), (2.4, -19.2)]), metal.sh, w=.8)
    cv.stroke(b.tw([(-4.6, -16.0), (-4.0, -9.0)]), metal.sh, w=.6, detail=True)
    cv.stroke(b.tw([(-9.0, -12.6), (-4.4, -11.4), (0.0, -12.6)]), metal.sh, w=.6, detail=True)
    cv.dot(b.T.p(-4.6, -6.4), .7, metal.sh)
    cv.shape(b.tw([(-6.2, -31.4), (-2.0, -32.6), (3.6, -32.0), (6.0, -30.6), (1.0, -29.8), (-4.0, -29.4)]),
             under, sh=.4, lw=.5)


def pteruges(cv, b, mat=DLEATHER, trim=None, n=6, length=10.0):
    for i in range(n):
        x = -11.0 + i * 22.0 / (n - 1)
        L = length - abs(i - (n - 1) / 2) * .4
        cv.shape(b.tw([C(x - 1.7, -3.0), C(x + 1.7, -2.9), C(x + 1.8, L), C(x - 1.6, L + .2)]), mat, sh=.3, lw=.5)
        if trim:
            cv.stroke(b.tw([(x - 1.2, L - .8), (x + 1.4, L - .8)]), trim.base, w=.9, detail=True)


def bare_torso(cv, b, skin=SKIN, hairy=None):
    cv.shape(b.tw([(-4.6, -30.8), (-11.0, -28.6), (-13.4, -24.0), (-12.8, -18.4), (-10.6, -12.0), (-9.8, -6.0),
                   C(-10.6, 0.0), (0, 1.0), C(10.4, .2), (9.8, -6.0), (11.6, -16.0), (12.0, -25.4), (6.4, -30.8)]),
             skin, sh=2.0, lw=.75)
    cv.stroke(b.tw([(-12.0, -21.0), (-9.0, -17.6), (-4.6, -18.4), (-1.6, -16.8), (2.6, -18.6)]), skin.line, w=.7)
    cv.stroke(b.tw([(-4.4, -15.0), (-4.0, -6.0)]), skin.sh, w=.6, detail=True)
    for y in (-12.4, -8.6):
        cv.stroke(b.tw([(-7.8, y), (-4.2, y + .6), (-.8, y)]), skin.sh, w=.6, detail=True)
    cv.dot(b.T.p(-8.6 * b.shw, -19.4), .6, skin.line)
    cv.dot(b.T.p(-1.0 * b.shw, -19.6), .6, skin.line)
    if hairy:
        for x, y in ((-6, -21), (-4, -19.6), (-7.4, -18.6), (-5.4, -17.2)):
            cv.stroke(b.tw([(x, y), (x - .8, y + 1.4)]), hairy.base, w=.6, detail=True)


def long_robe(cv, b, mat, hem=50.0, flare=1.0, trim=None, belt=None):
    """Robe from the shoulders to the ankles (toga / druid / emperor)."""
    f = flare
    pts = [(-5.0, -31.0), (-11.6, -28.8), (-13.4, -23.0), (-12.6, -15.0), (-12.0, -6.0), (-13.4 * f, 14.0),
           (-15.6 * f, 34.0), C(-17.0 * f, hem), (-10.0, hem + 1.6), (-3.0, hem + .6), (4.0, hem + 1.8),
           (10.0, hem + .8), C(15.4 * f, hem - .4), (13.6 * f, 30.0), (12.0, 10.0), (11.0, -8.0), (12.4, -17.0),
           (12.4, -25.6), (6.6, -31.0)]
    cv.shape(b.tw(pts), mat, sh=2.6, lw=.75)
    for x0, x1 in ((-9.0, -12.0), (-3.0, -4.6), (3.4, 4.6), (9.0, 11.4)):
        cv.stroke(b.tw([(x0, 4.0), (x1, hem - 1.0)]), mat.sh, w=.8, detail=True)
    if trim:
        cv.stroke(b.tw([(-16.4 * f, hem - 1.6), (-10.0, hem - .2), (-3.0, hem - 1.0), (4.0, hem + .2), (10.0, hem - .8),
                        (14.8 * f, hem - 1.8)]), trim.base, w=1.6)
    if belt:
        cv.shape(b.tw([C(-12.2, -6.4), (0, -5.2), C(11.4, -6.0), C(11.4, -3.2), (0, -2.4), C(-12.2, -3.6)]),
                 belt, sh=.3, lw=.55)


def laurel(cv, b, mat=None):
    from gear import GGREEN2
    m = mat or GGREEN2
    H = b.H
    cv.stroke(H.pts([(-7.0, -6.0), (-3.0, -8.4), (2.0, -8.8), (6.6, -6.6), (8.0, -3.0)]), m.sh, w=1.0)
    for (x, y, a) in ((-6.4, -6.8, -40), (-3.6, -8.6, -20), (-.6, -9.4, 0), (2.4, -9.4, 15), (5.0, -8.4, 35),
                      (7.0, -6.0, 60), (8.2, -3.4, 80)):
        cv.shape(ell_pts(H.p(x, y), 1.7 * H.s / 1.45, .8 * H.s / 1.45, ang=a, n=6), m, sh=0, lw=.4)


def petasos(cv, b, mat=None, band=None):
    m = mat or LEATHER
    H = b.H
    cv.shape(H.pts([(-11.4, -6.0), (-6.0, -8.8), (2.0, -9.6), (10.0, -8.4), (13.0, -6.6), (8.0, -5.0), (0, -4.8),
                    (-8.0, -4.8)]), m, sh=.6, lw=.6)
    cv.shape(H.pts([C(-6.6, -7.0), (-6.0, -11.0), (-2.0, -14.0), (3.0, -14.2), (7.0, -11.4), C(7.8, -7.4)]), m, sh=1.0,
             lw=.6)
    if band:
        cv.stroke(H.pts([(-6.4, -8.0), (0, -8.6), (7.6, -8.2)]), band.base, w=1.2)


def hood(cv, b, mat, open_face=True):
    H = b.H
    cv.shape(H.pts([(-7.6, -2.0), (-8.0, -7.0), (-5.0, -11.4), (1.0, -12.6), (7.0, -10.4), (10.0, -5.0), (10.6, 2.0),
                    (9.0, 8.0), (4.0, 9.6), (5.6, 4.0), (5.6, -1.0), (3.0, -6.0), (-2.0, -7.4), (-6.2, -5.8)]), mat,
             sh=1.2, lw=.7)


def sack_on_back(cv, b, mat=None, size=1.0):
    from gear import LINEN
    m = mat or Mat("#d8c08a", sh="#a88e5a", hl="#f0dcae", line="#18110c")
    c = b.T.p(15 * size, -22)
    k = size * b.s
    pts = [(c[0] - 7 * k, c[1] - 10 * k), (c[0] - 2 * k, c[1] - 15 * k), (c[0] + 6 * k, c[1] - 14 * k),
           (c[0] + 11 * k, c[1] - 6 * k), (c[0] + 12 * k, c[1] + 6 * k), (c[0] + 7 * k, c[1] + 13 * k),
           (c[0] - 3 * k, c[1] + 13 * k), (c[0] - 8 * k, c[1] + 4 * k)]
    cv.shape(pts, m, sh=2.4, lw=.75)
    cv.stroke([(c[0] - 4 * k, c[1] - 13 * k), (c[0] - 1 * k, c[1] - 11 * k), (c[0] + 3 * k, c[1] - 13 * k)], m.line,
              w=.8)
    cv.shape([(c[0] - 1 * k, c[1] - 15 * k), (c[0] - 4 * k, c[1] - 19 * k), (c[0] + 1 * k, c[1] - 18 * k),
              (c[0] + 4 * k, c[1] - 20 * k), (c[0] + 3 * k, c[1] - 14 * k)], m, sh=.4, lw=.5)
    for i in range(3):
        y = c[1] - 4 * k + i * 6 * k
        cv.stroke([(c[0] + 2 * k, y), (c[0] + 5 * k, y + 1.5 * k)], m.sh, w=.6, detail=True)


def ground(cv, x=60, rx=32, tufts=((28, 1.0, False), (94, .8, True)), stone=None):
    cv.ground(x, 128, rx, 4.6)
    if stone:
        rock(cv, *stone)
    for tx, ts, fl in tufts:
        tuft(cv, tx, 128.4, ts, fl)


def mail_rows(cv, b, color, y0=-28.0, y1=10.0, step=4.0, x0=-11.0, x1=11.0):
    y = y0
    while y <= y1:
        pts = []
        x = x0
        while x <= x1:
            pts += [(x, y), (x + 1.0, y + 1.0), (x + 2.0, y)]
            x += 2.0
        cv.stroke(b.tw(pts), color, w=.5, detail=True)
        y += step


def lashes(cv, b):
    H = b.H
    cv.stroke(H.pts([(-4.8, -4.4), (-5.8, -5.4)]), "#18110c", w=.7, detail=True)
    cv.stroke(H.pts([(-3.4, -4.8), (-3.8, -6.0)]), "#18110c", w=.7, detail=True)
    cv.stroke(H.pts([(-1.8, -4.6), (-1.6, -5.8)]), "#18110c", w=.7, detail=True)


def braid(cv, b, mat, side=1, length=16.0):
    H = b.H
    x0 = 6.0 if side > 0 else -1.0
    for i in range(int(length / 3.4)):
        c = H.p(x0 + .3 * i, 4.0 + i * 3.4)
        cv.shape(ell_pts(c, 2.0 * H.s / 1.45, 1.9 * H.s / 1.45, n=8), mat, sh=.5, lw=.5)
    cv.stroke([H.p(x0 + .3 * (length / 3.4), 4.0 + length), H.p(x0 + .3 * (length / 3.4), 6.5 + length)],
              mat.base, w=1.6)


def fur_boot(cv, b, side, mat=FUR):
    cv.shape(b.foot_pts(side, "boot"), mat, sh=.8, lw=.6)
    cv.shape(b.shin_pts(side, frm=.62, grow=1.2), mat, sh=.5, lw=.6)
