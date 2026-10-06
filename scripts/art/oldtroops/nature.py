"""Nature (oasis animals) - comic style, facing left, absolute 120x140 coords."""
import math
from lib import *
from human import EYEW, EYE, MOUTH

INKC = "#18110c"
TOOTH = Mat("#fffaf0", sh="#d8d0c0", hl="#ffffff", line=INKC)
NOSE = Mat("#2a2020", sh="#151010", hl="#6a5a5a", line=INKC)
PINK = Mat("#f0a0a0", sh="#c87070", hl="#ffd0d0", line=INKC)


def darker(m, t=.22):
    return Mat(shade(m.base, t), sh=shade(m.sh, t), hl=m.base, line=m.line)


def leg(cv, chain, radii, mat, sh=1.0):
    cv.shape(limb(chain, radii, cap0=False), mat, sh=sh, lw=.65)


def paw(cv, c, w, h, mat, toes=3, ang=0):
    cv.shape(ell_pts(c, w, h, ang=ang, n=8), mat, sh=.5, lw=.6)
    for i in range(1, toes):
        x = c[0] - w + 2 * w * i / toes
        cv.stroke([(x, c[1] + h * .1), (x, c[1] + h * .95)], INKC, w=.5, detail=True)


def eye(cv, c, rx, ry, look=(-.4, .1), angry=0.0, lid=None):
    cv.shape(ell_pts(c, rx, ry, n=8), EYEW, sh=0, lw=.4)
    cv.dot((c[0] + look[0] * rx, c[1] + look[1] * ry), min(rx, ry) * .5, INKC, detail=False)
    if angry:
        cv.stroke([(c[0] - rx * 1.3, c[1] - ry * (1.0 + angry * .2)), (c[0] + rx * 1.2, c[1] - ry * (1.0 - angry * .6))],
                  INKC, w=1.1)
    if lid:
        cv.shape([(c[0] - rx * 1.1, c[1] - ry * .1), (c[0] - rx, c[1] - ry * 1.05), (c[0], c[1] - ry * 1.25),
                  (c[0] + rx, c[1] - ry * 1.05), (c[0] + rx * 1.1, c[1] - ry * .1), (c[0], c[1] - ry * .35)], lid,
                 sh=0, lw=.4)


def fur_marks(cv, pts_list, color, w=.6):
    for a, b in pts_list:
        cv.stroke([a, b], color, w=w, detail=True)


# ------------------------------------------------------------------ wolf ----
WOLF = Mat("#8f949c", sh="#5f646e", hl="#c4c8ce", line=INKC)
WOLFL = Mat("#d8d6d0", sh="#aeaaa2", hl="#f4f2ee", line=INKC)


def wolf():
    cv = Canvas()
    cv.ground(60, 127, 46, 5)
    W, WL, WD = WOLF, WOLFL, darker(WOLF)
    # tail
    cv.shape([(84, 80), (95, 82), (104, 90), (110, 102), C(112, 112), (104, 106), (96, 98), (88, 90)], W, sh=1.4)
    cv.shape([(104, 100), (110, 104), C(112, 112), (105, 107)], WL, sh=.4, lw=.5)
    # far legs
    leg(cv, [(80, 92), (76, 102), (82, 114), (80, 122)], [7, 4.4, 2.8, 2.6], WD)
    paw(cv, (77, 123.4), 4.4, 2.6, WD)
    leg(cv, [(37, 92), (39, 104), (44, 120)], [5.4, 3.4, 2.8], WD)
    paw(cv, (41, 122.4), 4.6, 2.8, WD)
    # body
    body = [(36, 70), (50, 74), (66, 74), (80, 74), (90, 80), (93, 90), (88, 99), (78, 101), (66, 98), (54, 100),
            (44, 103), (34, 101), (28, 92), (28, 80)]
    cv.shape(body, W, sh=2.6)
    cv.shape([(30, 90), (40, 99), (50, 99), (60, 96), (52, 102), (42, 104), (33, 101)], WL, sh=.4, lw=.5)
    fur_marks(cv, [((60, 77), (64, 81)), ((70, 77), (74, 81)), ((80, 78), (83, 82)), ((86, 86), (88, 91))], W.sh)
    # near legs
    leg(cv, [(84, 88), (82, 100), (91, 113), (89, 123)], [9, 5, 3, 2.7], W)
    paw(cv, (86, 124.4), 4.8, 2.8, W)
    leg(cv, [(44, 90), (40, 104), (37, 121)], [6.6, 3.8, 3.0], W)
    paw(cv, (34, 123.4), 5.0, 2.9, W)
    # neck ruff
    cv.shape([(48, 64), (52, 72), C(47, 74), (50, 80), C(44, 80), (46, 87), C(39, 85), (38, 92), C(33, 87),
              (28, 92), C(27, 84), (30, 70)], WD, sh=1.0, lw=.65)
    # head
    head = [(42, 64), (36, 60), (28, 61), (21, 66), (13, 69), (6, 72), C(3.6, 75), (6, 78.5), (14, 80), (20, 84),
            (28, 88), (36, 86), (43, 78)]
    ears = [[(38, 62), (40, 50), C(41, 46), (44, 52), (45, 62)], [(30, 61), (30, 49), C(31, 45), (35, 52), (37, 61)]]
    cv.shape(ears[0], WD, sh=.6, lw=.6)
    cv.shape(head, W, sh=1.8)
    cv.shape(ears[1], W, sh=.6, lw=.6)
    cv.shape([(31.5, 59), (31.6, 52), (34, 56), (34.6, 60)], PINK, sh=0, lw=.4, detail=True)
    # muzzle light + snarl
    cv.shape([(20, 75), (10, 77), (6, 78.5), (14, 81), (20, 84), (28, 88), (30, 82)], WL, sh=.5, lw=.5)
    cv.shape([(8, 79.5), (16, 79), (24, 80.5), (22, 85), (14, 83)], MOUTH, sh=0, lw=.55)
    for x in (10, 14, 18):
        cv.shape([(x - 1.2, 79.2), (x + 1.2, 79.2), C(x, 82.4)], TOOTH, sh=0, lw=.35)
    cv.shape(ell_pts((5.6, 74.6), 2.4, 1.9, n=6), NOSE, sh=.3, lw=.5)
    cv.stroke([(12, 70.6), (18, 69.6)], W.sh, w=.6, detail=True)
    eye(cv, (25, 68.6), 2.8, 2.4, look=(-.45, .15), angry=1.0)
    return cv, (2, 44, 114, 128)


def whiskers(cv, c, side=-1, n=3, L=9):
    for k in range(n):
        cv.stroke([c, (c[0] + side * L, c[1] - 2 + k * 2.2)], INKC, w=.45, detail=True)


# ------------------------------------------------------------------- rat ----
RAT = Mat("#9a9490", sh="#6c6662", hl="#c8c2bc", line=INKC)


def rat():
    cv = Canvas()
    cv.ground(58, 127, 36, 4.4)
    # tail
    cv.stroke([(84, 116), (98, 118), (108, 110), (110, 98), (104, 92)], PINK.line, w=3.6)
    cv.stroke([(84, 116), (98, 118), (108, 110), (110, 98), (104, 92)], PINK.base, w=2.0)
    # far legs
    paw(cv, (78, 125), 4.6, 2.4, darker(RAT), toes=3)
    paw(cv, (40, 125), 4.0, 2.2, PINK, toes=3)
    # body
    cv.shape([(36, 96), (48, 86), (66, 84), (82, 90), (90, 104), (86, 118), (72, 124), (52, 123), (40, 118),
              (34, 108)], RAT, sh=2.4)
    cv.shape([(40, 112), (52, 120), (66, 121), (54, 116)], light(RAT.base, .3) and Mat("#d8d2cc", sh="#b0a8a0",
                                                                                      hl="#f0ece8", line=INKC),
             sh=0, lw=.4, detail=True)
    # hind leg (near)
    cv.shape([(70, 106), (82, 104), (86, 114), (80, 122), (70, 120)], RAT, sh=1.2, lw=.6)
    paw(cv, (80, 125), 5.6, 2.6, PINK, toes=3)
    # head
    head = [(42, 86), (34, 84), (26, 88), (16, 96), C(10, 100), (16, 104), (28, 106), (40, 104), (46, 96)]
    cv.shape(head, RAT, sh=1.6)
    cv.shape(ell_pts((11, 99.6), 2.4, 2.0, n=6), PINK, sh=0, lw=.5)
    cv.shape([(18, 103), (22, 103), (21.6, 107.4), (18.4, 107.4)], TOOTH, sh=0, lw=.4)
    cv.stroke([(20, 103), (20, 107)], INKC, w=.35, detail=True)
    whiskers(cv, (15, 101), -1, 3, 9)
    # ears
    cv.shape(ell_pts((40, 82), 7, 8, n=10), RAT, sh=.6, lw=.6)
    cv.shape(ell_pts((40.6, 82.6), 4.6, 5.6, n=10), PINK, sh=0, lw=.4)
    eye(cv, (28, 92), 3.0, 3.4, look=(-.4, .1))
    # front paws
    cv.shape(limb([(42, 108), (40, 116), (36, 122)], [3.4, 2.6, 2.2]), RAT, sh=.6, lw=.6)
    paw(cv, (33, 124.4), 4.0, 2.2, PINK, toes=3)
    return cv, (6, 76, 112, 127)


# ---------------------------------------------------------------- spider ----
SPID = Mat("#3e3440", sh="#241c26", hl="#6a5a6c", line=INKC)


def spider():
    cv = Canvas()
    cv.ground(60, 126, 46, 5)
    # far legs (behind)
    for k, (kx, fx) in enumerate(((44, 18), (52, 34), (70, 84), (80, 104))):
        cv.shape(limb([(58 + (k - 1.5) * 4, 92), (kx, 66 + abs(k - 1.5) * 4), (fx, 116)], [2.6, 2.2, 1.4]),
                 darker(SPID, .1), sh=.6, lw=.6)
    # abdomen
    cv.shape(ell_pts((80, 84), 24, 20, ang=-10, n=12), SPID, sh=3.0)
    cv.shape([(78, 72), (86, 76), (82, 82), (90, 88), (80, 94), (74, 86), (78, 82), (72, 78)],
             Mat("#e83a2a", sh="#b02010", hl="#ff8a6a", line=INKC), sh=0, lw=.5)
    for (x, y) in ((66, 72), (94, 74), (70, 96), (98, 92)):
        cv.stroke([(x, y), (x + 3, y - 2)], SPID.hl, w=.7, detail=True)
    # head/thorax
    cv.shape(ell_pts((46, 96), 15, 13, n=12), SPID, sh=2.0)
    # near legs
    for k, (kx, ky, fx) in enumerate(((30, 72, 10), (40, 70, 24), (64, 70, 74), (74, 76, 98))):
        cv.shape(limb([(44 + k * 5, 100), (kx, ky), (fx, 124)], [3.0, 2.6, 1.6]), SPID, sh=.8, lw=.65)
        cv.dot((fx, 124), 1.4, INKC)
    # eyes: two big + small
    eye(cv, (40, 92), 3.6, 4.2, look=(-.3, .2), angry=1.0)
    eye(cv, (50, 91), 3.2, 3.8, look=(-.5, .2), angry=1.0)
    for (x, y) in ((36, 98), (45, 99), (53, 98)):
        cv.dot((x, y), 1.0, "#ff4a2a")
    # fangs
    for x in (40, 47):
        cv.shape([(x - 2, 104), (x + 2, 104), C(x - .6, 111)], TOOTH, sh=0, lw=.45)
    return cv, (6, 60, 112, 126)


# ----------------------------------------------------------------- snake ----
SNAKE = Mat("#5aa83a", sh="#3a7a22", hl="#9adc6a", line=INKC)
BELLY = Mat("#f0dc78", sh="#c8b040", hl="#fff4b8", line=INKC)


def snake():
    cv = Canvas()
    cv.ground(62, 126, 40, 5)
    # coils on the ground
    for (c, rx, ry) in (((70, 116), 30, 9), ((66, 106), 24, 8)):
        pts = ell_pts(c, rx, ry, n=12)
        cv.shape(limb(pts + [pts[0], pts[1]], [5.4] * (len(pts) + 2), cap0=False, cap1=False)[:0] or
                 ell_pts(c, rx + 5, ry + 5, n=12), SNAKE, sh=1.6)
        cv.shape(ell_pts((c[0], c[1] - 1.4), rx - 5, ry - 4.4, n=12), SNAKE.sh and darker(SNAKE, .3), sh=0, lw=.6)
    # raised neck
    neck = [(78, 104), (84, 92), (82, 78), (72, 66), (58, 60), (44, 60)]
    cv.shape(limb(neck, [6.4, 6.2, 5.8, 5.4, 5.0, 5.0], cap0=False), SNAKE, sh=1.6)
    cv.stroke([(80, 102), (86, 92), (84, 78), (74, 70), (60, 66)], BELLY.base, w=3.6)
    for (x, y) in ((80, 96), (86, 88), (84, 80), (78, 72), (68, 67)):
        cv.stroke([(x - 2, y - 1), (x + 2, y + 1)], BELLY.sh, w=.6, detail=True)
    for (x, y) in ((76, 112), (60, 118), (88, 120), (54, 108), (70, 101)):
        cv.shape(ell_pts((x, y), 2.4, 1.6, n=6), darker(SNAKE, .35), sh=0, lw=.4, detail=True)
    # head
    head = [(52, 54), (40, 52), (28, 54), C(20, 58), (24, 63), (34, 66), (46, 66), (54, 62)]
    cv.shape(head, SNAKE, sh=1.4)
    cv.stroke([(22, 60.6), (34, 62)], INKC, w=.7)
    # tongue
    cv.stroke([(21, 61), (12, 62), (8, 59)], "#e83a2a", w=1.3)
    cv.stroke([(12, 62), (8, 65)], "#e83a2a", w=1.3)
    eye(cv, (36, 56), 3.2, 3.0, look=(-.5, .2), lid=SNAKE)
    cv.dot((26, 57), .8, INKC)
    return cv, (6, 46, 108, 126)


# ------------------------------------------------------------------- bat ----
BAT = Mat("#6a4a3e", sh="#463026", hl="#9a7464", line=INKC)
WINGM = Mat("#8a5a4a", sh="#5e3a2e", hl="#b88a78", line=INKC)


def bat():
    cv = Canvas()
    cv.ground(60, 126, 18, 3)
    # far wing
    fw = [(66, 70), (76, 52), (92, 40), (108, 36), (114, 44), C(112, 58), (104, 56), C(100, 66), (92, 62),
          C(86, 72), (78, 68)]
    cv.shape(fw, darker(WINGM, .2), sh=1.0)
    # body
    cv.shape(ell_pts((60, 74), 10, 14, ang=-8, n=10), BAT, sh=1.8)
    # head
    cv.shape([(48, 56), (46, 44), C(48, 40), (54, 50), (62, 48), (68, 40), C(70, 44), (68, 56), (64, 64), (52, 64)],
             BAT, sh=1.2)
    cv.shape([(48.6, 52), (48, 46), (52, 51)], PINK, sh=0, lw=.4, detail=True)
    eye(cv, (54, 56), 2.6, 3.0, look=(-.3, .2), angry=.6)
    eye(cv, (62, 56), 2.4, 2.8, look=(-.5, .2), angry=.6)
    cv.shape([(54, 61), (62, 61), (60, 64), (56, 64)], MOUTH, sh=0, lw=.4)
    for x in (55.4, 60.4):
        cv.shape([(x - .9, 61), (x + .9, 61), C(x, 65)], TOOTH, sh=0, lw=.3)
    # near wing
    nw = [(54, 70), (44, 54), (28, 42), (10, 38), (4, 46), C(8, 60), (16, 56), C(20, 68), (30, 64), C(36, 76),
          (46, 74)]
    cv.shape(nw, WINGM, sh=1.6)
    for a in ((44, 56), (28, 44), (10, 40)):
        cv.stroke([(52, 68), a], BAT.sh, w=.9)
    for a, b_ in (((28, 44), (16, 56)), ((28, 44), (30, 64))):
        cv.stroke([a, b_], BAT.sh, w=.7, detail=True)
    # feet
    for x in (56, 64):
        cv.stroke([(x, 86), (x - 1, 92)], BAT.line, w=1.2)
    return cv, (2, 34, 116, 96)


# ------------------------------------------------------------------ boar ----
BOAR = Mat("#6a4a34", sh="#463020", hl="#94704e", line=INKC)


def boar():
    cv = Canvas()
    cv.ground(60, 127, 46, 5)
    BD = darker(BOAR)
    leg(cv, [(84, 96), (86, 110), (84, 122)], [6, 3.6, 3.0], BD)
    paw(cv, (83, 124), 3.6, 2.6, Mat("#3a2a20", sh="#241a14", hl="#5a4a40", line=INKC), toes=2)
    leg(cv, [(38, 98), (36, 110), (36, 122)], [5.6, 3.6, 3.0], BD)
    paw(cv, (35, 124), 3.6, 2.6, Mat("#3a2a20", sh="#241a14", hl="#5a4a40", line=INKC), toes=2)
    # tail
    cv.stroke([(96, 86), (102, 84), (104, 88), (100, 90)], BOAR.line, w=1.4)
    body = [(30, 80), (40, 66), (54, 60), (72, 62), (88, 68), (98, 80), (98, 96), (88, 106), (70, 108),
            (50, 108), (36, 104), (28, 94)]
    cv.shape(body, BOAR, sh=3.0)
    # bristly mane
    cv.shape([(36, 70), C(38, 60), (42, 66), C(46, 56), (50, 63), C(56, 54), (60, 62), C(66, 54), (70, 63),
              C(78, 58), (80, 66), (60, 68), (44, 74)], BD, sh=.6, lw=.6)
    for (x, y) in ((60, 78), (70, 82), (80, 78), (66, 92), (80, 94), (50, 90)):
        cv.stroke([(x, y), (x + 3, y + 4)], BOAR.sh, w=.7, detail=True)
    leg(cv, [(88, 94), (92, 108), (88, 122)], [7, 4, 3.2], BOAR)
    paw(cv, (87, 124), 4.0, 2.8, Mat("#3a2a20", sh="#241a14", hl="#5a4a40", line=INKC), toes=2)
    leg(cv, [(44, 98), (44, 110), (42, 122)], [6.6, 4, 3.2], BOAR)
    paw(cv, (41, 124), 4.0, 2.8, Mat("#3a2a20", sh="#241a14", hl="#5a4a40", line=INKC), toes=2)
    # head
    head = [(40, 70), (30, 70), (20, 76), (10, 84), C(6, 86), (6, 96), (14, 98), (24, 100), (36, 98), (44, 88)]
    cv.shape(head, BOAR, sh=1.8)
    cv.shape(ell_pts((7, 91), 3.6, 5.6, n=8), Mat("#c88a7a", sh="#9a5e50", hl="#f0b4a4", line=INKC), sh=.4,
             lw=.6)
    cv.dot((6.4, 89), .9, INKC)
    cv.dot((7.6, 93), .9, INKC)
    cv.shape([(14, 96), (10, 90), (8, 82), C(10, 80), (13, 88), (18, 94)], TOOTH, sh=.3, lw=.5)
    cv.shape([(36, 72), (38, 62), C(42, 60), (44, 70)], BD, sh=.4, lw=.55)
    eye(cv, (24, 82), 2.4, 2.4, look=(-.4, .2), angry=1.0)
    return cv, (2, 54, 108, 127)


# ------------------------------------------------------------------ bear ----
BEAR = Mat("#8a5a34", sh="#5e3a1e", hl="#b88454", line=INKC)
MUZ = Mat("#d0a87a", sh="#a07a50", hl="#f0d0a4", line=INKC)


def bear():
    cv = Canvas()
    cv.ground(62, 127, 34, 5)
    BD = darker(BEAR)
    # far arm raised
    cv.shape(limb([(54, 54), (42, 40), (34, 28)], [7, 6, 5.6]), BD, sh=1.0)
    for k in range(3):
        cv.shape([(30 + k * 3, 24), (29 + k * 3, 18), (31.4 + k * 3, 22)], TOOTH, sh=0, lw=.4)
    # legs
    leg(cv, [(56, 100), (52, 112), (52, 122)], [9, 7, 6], BD)
    cv.shape(ell_pts((50, 124), 8, 3.6, n=8), BD, sh=.6, lw=.6)
    # body
    body = [(52, 48), (66, 44), (80, 52), (86, 70), (86, 92), (80, 108), (64, 112), (50, 106), (44, 88),
            (44, 66)]
    cv.shape(body, BEAR, sh=3.0)
    cv.shape([(52, 64), (62, 60), (70, 66), (72, 86), (66, 100), (56, 100), (50, 84)], MUZ, sh=1.0, lw=.55)
    leg(cv, [(74, 100), (76, 112), (74, 122)], [10, 7.4, 6.4], BEAR)
    cv.shape(ell_pts((70, 124), 9, 4, n=8), BEAR, sh=.6, lw=.6)
    for k in range(3):
        cv.shape([(62 + k * 3, 122), (60 + k * 3, 126), (63 + k * 3, 124)], TOOTH, sh=0, lw=.35)
    # head roaring
    head = [(50, 46), (46, 34), (52, 24), (62, 20), (72, 24), (76, 34), (72, 44), (62, 50)]
    cv.shape(head, BEAR, sh=1.8)
    for c in ((52, 22), (72, 22)):
        cv.shape(ell_pts(c, 4.6, 4.6, n=8), BEAR, sh=.6, lw=.6)
        cv.shape(ell_pts(c, 2.4, 2.4, n=6), MUZ, sh=0, lw=.4)
    cv.shape([(46, 34), (38, 34), (32, 38), C(31, 42), (36, 46), (46, 48), (54, 44)], MUZ, sh=.8, lw=.6)
    cv.shape([(33, 41), (44, 41), (50, 46), (40, 49), (34, 46)], MOUTH, sh=0, lw=.5)
    for x in (36, 44):
        cv.shape([(x - 1.2, 41), (x + 1.2, 41), C(x, 44)], TOOTH, sh=0, lw=.35)
    cv.shape(ell_pts((33, 36), 2.6, 2.0, n=6), NOSE, sh=0, lw=.45)
    eye(cv, (50, 30), 2.6, 2.6, look=(-.4, .2), angry=1.0)
    eye(cv, (60, 29), 2.6, 2.6, look=(-.5, .2), angry=1.0)
    # near arm raised
    cv.shape(limb([(76, 56), (84, 40), (88, 26)], [8, 7, 6.4]), BEAR, sh=1.2)
    cv.shape(ell_pts((88, 22), 7, 6, n=8), BEAR, sh=.6, lw=.6)
    for k in range(4):
        cv.shape([(82 + k * 3.4, 18), (81 + k * 3.4, 11), (84 + k * 3.4, 16)], TOOTH, sh=0, lw=.4)
    return cv, (24, 8, 100, 127)


# ------------------------------------------------------------- crocodile ----
CROC = Mat("#5a8a3a", sh="#3a6224", hl="#8ab866", line=INKC)
CBELLY = Mat("#d8d08a", sh="#a8a05a", hl="#f0ecb8", line=INKC)


def crocodile():
    cv = Canvas()
    k = 1.0
    cv.push(1.0, 1.25, 0, 127 - 127 * 1.25)
    cv.ground(60, 127, 54, 5 / 1.25)
    CD = darker(CROC)
    # far legs
    leg(cv, [(80, 112), (84, 120), (80, 124)], [4.6, 3.6, 3.0], CD)
    leg(cv, [(42, 112), (40, 120), (36, 124)], [4.4, 3.4, 3.0], CD)
    # tail
    cv.shape([(84, 104), (100, 104), (114, 110), C(118, 118), (106, 118), (90, 120), (82, 116)], CROC, sh=1.2)
    # body
    cv.shape([(36, 104), (48, 98), (72, 98), (88, 104), (90, 116), (72, 122), (48, 122), (36, 118)], CROC, sh=2.0)
    cv.shape([(40, 118), (60, 121), (80, 120), (70, 123), (48, 123)], CBELLY, sh=0, lw=.4, detail=True)
    for x in range(44, 112, 7):
        y = 98 if x < 88 else 104 + (x - 88) * .3
        cv.shape([(x - 2.4, y + 1.6), (x, y - 2.4), (x + 2.4, y + 1.6)], CD, sh=0, lw=.45)
    for (x, y) in ((54, 108), (64, 106), (74, 108), (58, 114), (70, 114)):
        cv.shape(ell_pts((x, y), 2.6, 2.0, n=6), CROC.sh and CD, sh=0, lw=.35, detail=True)
    # head with open jaws
    upper = [(40, 100), (28, 96), (12, 94), (4, 94), C(2, 97), (8, 100), (24, 103), (38, 106)]
    lower = [(38, 108), (24, 110), (10, 112), (4, 113), C(4, 116), (10, 117), (26, 116), (40, 114)]
    cv.shape([(38, 104), (10, 99), (8, 112), (38, 110)], MOUTH, sh=0, lw=.5)
    for k in range(6):
        x = 9 + k * 4.6
        cv.shape([(x - 1.2, 99.6 + k * .5), (x + 1.2, 100.0 + k * .5), C(x, 103 + k * .5)], TOOTH, sh=0, lw=.35)
        cv.shape([(x - 1.2, 111.6 - k * .2), (x + 1.2, 111.4 - k * .2), C(x, 108.6 - k * .2)], TOOTH, sh=0, lw=.35)
    cv.shape(lower, CROC, sh=.8, lw=.65)
    cv.shape(upper, CROC, sh=1.0, lw=.65)
    cv.shape([(36, 94), (32, 90), (28, 92), (30, 97)], CROC, sh=.3, lw=.5)
    eye(cv, (31, 92.4), 2.6, 2.4, look=(-.4, .2), lid=CROC)
    cv.dot((5, 95.6), .7, INKC)
    # near legs
    leg(cv, [(78, 114), (84, 122), (78, 125)], [5.4, 4, 3.4], CROC)
    leg(cv, [(46, 114), (42, 122), (36, 125)], [5.2, 4, 3.4], CROC)
    cv.pop()
    return cv, (0, 76, 118, 127)


# ----------------------------------------------------------------- tiger ----
TIGER = Mat("#f08a2a", sh="#c05e14", hl="#ffbc6a", line=INKC)
TWHITE = Mat("#fbf4e8", sh="#d8ccb8", hl="#ffffff", line=INKC)
STRIPE = "#2a1a12"


def tiger():
    cv = Canvas()
    cv.ground(60, 127, 48, 5)
    TD = darker(TIGER)
    # tail
    tail = [(90, 84), (102, 80), (110, 70), (112, 58), (108, 54)]
    cv.shape(limb(tail, [3.4, 3.2, 3.0, 2.8, 2.6]), TIGER, sh=.8, lw=.65)
    for t in (.3, .55, .8):
        p = lerp(tail[1], tail[3], t)
        cv.stroke([add(p, (-3, -1)), add(p, (3, 1))], STRIPE, w=1.4, detail=True)
    # far legs
    leg(cv, [(84, 94), (80, 106), (86, 116), (84, 122)], [7, 4.6, 3.4, 3.0], TD)
    paw(cv, (81, 124), 5, 2.8, TD)
    leg(cv, [(38, 96), (32, 110), (28, 122)], [6, 4.4, 3.6], TD)
    paw(cv, (25, 124), 5, 2.8, TD)
    body = [(34, 76), (48, 72), (66, 74), (84, 72), (94, 80), (96, 92), (88, 100), (70, 102), (54, 104), (40, 102),
            (30, 92)]
    cv.shape(body, TIGER, sh=2.6)
    cv.shape([(34, 94), (46, 100), (62, 100), (54, 104), (40, 103)], TWHITE, sh=0, lw=.4)
    for (x, y0, y1) in ((50, 73, 84), (58, 74, 88), (66, 75, 86), (74, 73, 88), (82, 74, 84), (90, 80, 90)):
        cv.shape([(x - 1.6, y0), (x + 1.6, y0), (x + .6, (y0 + y1) / 2), (x + .4, y1), C(x - .4, y1 + 1),
                  (x - .8, (y0 + y1) / 2)], Mat(STRIPE, sh=STRIPE, hl=STRIPE, line=STRIPE), sh=0, lw=.2)
    leg(cv, [(86, 92), (90, 104), (96, 114), (92, 122)], [8, 5.4, 3.8, 3.4], TIGER)
    paw(cv, (89, 124), 5.6, 3.0, TIGER)
    leg(cv, [(42, 94), (40, 108), (36, 121)], [7, 5, 4.2], TIGER)
    paw(cv, (33, 123.6), 6, 3.2, TIGER)
    for (p, q) in (((86, 100), (92, 102)), ((92, 108), (97, 109)), ((38, 104), (44, 105)), ((36, 112), (42, 113))):
        cv.stroke([p, q], STRIPE, w=1.3, detail=True)
    # head
    head = [(40, 62), (30, 58), (20, 62), (12, 70), C(8, 76), (12, 84), (22, 90), (34, 88), (42, 80)]
    cv.shape(head, TIGER, sh=1.8)
    for c in ((34, 58), (24, 59)):
        cv.shape(ell_pts(c, 4.4, 4.4, n=8), TIGER, sh=.5, lw=.6)
        cv.shape(ell_pts(c, 2.2, 2.2, n=6), TWHITE, sh=0, lw=.3)
    cv.shape([(18, 76), (10, 76), (9, 82), (14, 87), (24, 90), (28, 82)], TWHITE, sh=.6, lw=.5)
    cv.shape([(11, 79), (22, 80), (26, 86), (16, 87)], MOUTH, sh=0, lw=.45)
    for x in (13, 20):
        cv.shape([(x - 1.2, 79.6), (x + 1.2, 79.8), C(x, 83.6)], TOOTH, sh=0, lw=.35)
    cv.shape(ell_pts((9.6, 74.6), 2.2, 1.6, n=6), PINK, sh=0, lw=.4)
    for (p, q) in (((30, 62), (34, 68)), ((36, 66), (40, 70)), ((30, 82), (36, 80)), ((20, 64), (22, 68))):
        cv.stroke([p, q], STRIPE, w=1.3, detail=True)
    eye(cv, (20, 70), 2.6, 2.4, look=(-.4, .2), angry=1.0)
    whiskers(cv, (14, 80), -1, 3, 8)
    return cv, (4, 50, 114, 127)


# -------------------------------------------------------------- elephant ----
ELE = Mat("#9aa0a8", sh="#6c727c", hl="#c8ccd2", line=INKC)


def elephant_body(cv, scale=1.0, dx=0.0):
    k = scale

    def T(pts):
        return [((x - 60) * k + 60 + dx, (y - 128) * k + 128) + tuple(q[2:]) for q in pts for x, y in [q[:2]]]
    ED = darker(ELE)
    # far legs
    cv.shape(T([(40, 92), (52, 92), (52, 124), C(50, 126), C(40, 126), (40, 110)]), ED, sh=1.0, lw=.7)
    cv.shape(T([(82, 92), (94, 92), (96, 124), C(94, 126), C(84, 126), (84, 110)]), ED, sh=1.0, lw=.7)
    # tail
    cv.stroke(T([(104, 76), (110, 90), (108, 100)]), ELE.line, w=1.2)
    # body
    body = [(36, 64), (48, 48), (70, 44), (92, 50), (106, 66), (106, 88), (96, 104), (70, 108), (48, 106),
            (36, 96)]
    cv.shape(T(body), ELE, sh=3.2)
    for (x, y) in ((70, 64), (82, 72), (90, 86), (76, 94)):
        cv.stroke(T([(x, y), (x + 4, y + 1)]), ELE.sh, w=.7, detail=True)
    # near legs
    cv.shape(T([(46, 96), (60, 96), (60, 124), C(58, 127), C(44, 127), (44, 112)]), ELE, sh=1.4, lw=.75)
    cv.shape(T([(88, 96), (102, 94), (102, 124), C(100, 127), C(88, 127), (88, 112)]), ELE, sh=1.4, lw=.75)
    for x in (46, 51, 56, 90, 95, 99):
        cv.shape(T([(x - 1.6, 126.6), (x - 1.2, 123.6), (x + 1.2, 123.6), (x + 1.6, 126.6)]), TOOTH, sh=0, lw=.35)
    # head + trunk raised
    head = [(46, 44), (34, 40), (24, 46), (20, 58), (22, 68), (28, 74), (40, 74), (48, 64)]
    cv.shape(T(head), ELE, sh=2.0)
    trunk = [(24, 66), (16, 70), (10, 62), (8, 48), (12, 38), (18, 34)]
    cv.shape(T(limb(trunk, [5.6, 5.0, 4.4, 3.6, 3.0, 2.8])), ELE, sh=1.2, lw=.7)
    for t in range(5):
        p = lerp(trunk[1], trunk[4], t / 4)
        cv.stroke(T([add(p, (-3, 0)), add(p, (3, .6))]), ELE.sh, w=.6, detail=True)
    # tusk
    cv.shape(T([(28, 72), (20, 78), (12, 76), (8, 72), (14, 74), (22, 70)]), TOOTH, sh=.4, lw=.6)
    # ear
    cv.shape(T([(42, 44), (56, 40), (64, 48), (64, 66), (56, 78), (46, 76), (42, 64)]), ELE, sh=1.6)
    cv.shape(T([(46, 48), (56, 46), (60, 54), (58, 68), (52, 72), (46, 66)]), Mat("#d8a8a8", sh="#b08080",
                                                                                  hl="#f0d0d0", line=INKC), sh=0,
             lw=.4, detail=True)
    eye(cv, T([(32, 54)])[0], 2.4 * k, 2.6 * k, look=(-.4, .2))
    cv.stroke(T([(28, 50), (34, 49), (37, 51)]), INKC, w=.9, detail=True)
    return {"back": T([(76, 44)])[0]}


def elephant():
    cv = Canvas()
    cv.ground(60, 127, 50, 5)
    elephant_body(cv)
    return cv, (4, 30, 112, 127)


UNITS = {
    1: rat,
    2: spider,
    3: snake,
    4: bat,
    5: boar,
    6: wolf,
    7: bear,
    8: crocodile,
    9: tiger,
    10: elephant,
}
