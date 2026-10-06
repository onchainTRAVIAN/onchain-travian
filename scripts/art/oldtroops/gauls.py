"""Gaul units."""
import math
from lib import *
from human import *
from gear import *
from horse import *
from costume import *

CHECK = Mat("#4f9a3c", sh="#33702a", hl="#86c86a", line="#18110c")
CHECK2 = Mat("#c8a43a", sh="#94761e", hl="#f0d070", line="#18110c")
TUN = Mat("#3a8a44", sh="#246030", hl="#70bc76", line="#18110c")
TUN_RED = Mat("#c8443a", sh="#92281e", hl="#f07a68", line="#18110c")
CLOAK_B = Mat("#3a6ec0", sh="#244c8a", hl="#70a0e0", line="#18110c")
WING = Mat("#f8f8f4", sh="#c8c8c0", hl="#ffffff", line="#18110c")
TORC = GOLD


def checked_leg(cv, b, side, mat=CHECK, stripe=None, boot=LEATHER):
    st = stripe or mat.sh
    cv.shape(b.leg_pts(side, bulk=1.12), mat, sh=1.4)
    hip, knee, ank = (b.hipF, b.kneeF, b.ankF) if side == 'F' else (b.hipN, b.kneeN, b.ankN)
    for t in (.3, .7):
        p = lerp(hip, knee, t)
        cv.stroke([add(p, (-5.6, .6)), add(p, (5.6, -.4))], st, w=1.0, detail=True)
    for t in (.35, .7):
        p = lerp(knee, ank, t)
        cv.stroke([add(p, (-4.0, .4)), add(p, (4.4, -.3))], st, w=1.0, detail=True)
    cv.stroke([lerp(hip, knee, .05), lerp(knee, ank, .85)], st, w=.9, detail=True)
    cv.shape(b.foot_pts(side, "boot"), boot, sh=.8, lw=.6)
    cv.shape(b.shin_pts(side, frm=.8, grow=.8), boot, sh=.3, lw=.5)


def gaul_helmet(cv, b, mat=BRONZE, wings=None, knob=True, plume=None, horns=None):
    H = b.H
    if wings:
        for pts in ([(4.6, -9.6), (7.6, -16.0), (12.6, -21.0), (12.0, -16.4), (14.6, -15.4), (11.6, -12.6),
                     (13.0, -10.6), (8.0, -7.6)],
                    [(-3.0, -10.6), (-5.6, -17.0), (-9.6, -21.6), (-9.6, -17.0), (-12.0, -16.4), (-8.8, -13.0),
                     (-10.2, -11.0), (-4.8, -8.4)]):
            cv.shape(H.pts(pts), wings, sh=.6, lw=.6)
    if plume:
        cv.shape(H.pts([(-.6, -13.0), (-3.0, -19.0), (1.0, -23.6), (6.0, -21.6), (6.6, -16.6), (2.6, -12.6)]), plume,
                 sh=.8, lw=.55)
    if horns:
        for pts in ([(5.0, -9.0), (9.4, -12.0), (11.6, -17.6), C(11.0, -20.6), (8.6, -15.4), (4.4, -11.6)],):
            cv.shape(H.pts(pts), horns, sh=.6, lw=.6)
    cv.shape(H.pts([C(-7.8, -5.0), (-7.4, -9.0), (-4.0, -12.4), (1.0, -13.2), (6.0, -11.6), (8.8, -7.6),
                    C(9.2, -3.6), (2.0, -5.0)]), mat, sh=1.3, lw=.7)
    cv.shape(H.pts([C(-8.8, -5.6), (-1.0, -6.6), (5.0, -5.8), C(10.6, -3.6), C(10.4, -2.0), (5.0, -3.8),
                    (-1.0, -4.6), C(-8.6, -3.8)]), mat, sh=.4, lw=.55)
    if knob:
        cv.shape(ell_pts(H.p(1.0, -13.8), 1.8 * H.s / 1.45, 1.6 * H.s / 1.45, n=8), mat, sh=.3, lw=.5)
    cv.stroke(H.pts([(-5.0, -8.6), (-2.0, -10.6), (2.0, -11.2)]), mat.hl, w=.9, detail=True)


def oval_shield(cv, c, rx, ry, face=GGREEN, rim=BRONZE, deco=GOLD):
    cv.shape(ell_pts((c[0] - 2.4, c[1] + .4), rx, ry, n=12), DWOOD, sh=.4, lw=.6)
    cv.shape(ell_pts(c, rx, ry, n=12), face, sh=2.6, lw=.75)
    cv.stroke(ell_pts(c, rx - 1.8, ry - 1.8, n=12) + [ell_pts(c, rx - 1.8, ry - 1.8, n=12)[0]], rim.base, w=1.2)
    cv.shape(band([(c[0], c[1] - ry + 3), (c[0], c[1] + ry - 3)], 3.2), rim, sh=.3, lw=.5)
    cv.shape(ell_pts(c, rx * .36, ry * .2, n=8), rim, sh=.8, lw=.6)
    for sgn in (-1, 1):
        q = (c[0] - rx * .5, c[1] + sgn * ry * .45)
        r = (c[0] + rx * .5, c[1] + sgn * ry * .45)
        for p in (q, r):
            cv.shape(ell_pts(p, rx * .16, rx * .16, n=8), deco, sh=0, lw=.4, detail=True)


def torc(cv, b):
    cv.stroke(b.tw([(-6.0, -31.4), (-1.0, -28.8), (4.0, -31.4)], 1.0), TORC.base, w=1.9)
    cv.dot(b.T.p(-6.0, -31.2), 1.1, TORC.base)
    cv.dot(b.T.p(4.0, -31.2), 1.1, TORC.base)


def phalanx():
    cv = Canvas()
    ground(cv, tufts=((24, 1.0, False), (98, .9, True)))
    b = Body(pelvis=(60, 73), ground=128, lean=0, legF=(12, 4), legN=(-8, -6), footF=4, footN=-8, tilt=2,
             shw=1.2)
    sb, st = (22, 126), (42, 6)
    b.reach('F', lerp(sb, st, .52), bend=1)
    cape(cv, b, CLOAK_B, [(-12, -30), (13, -30), (18, -10), (20, 14), C(18, 22), (6, 19), (-8, 21), C(-15, 22),
                          (-15, 0)])
    for sd in 'FN':
        checked_leg(cv, b, sd)
    tunic(cv, b, TUN, hem=12.0, trim=GOLD, buckle=GOLD)
    torc(cv, b)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.hair_long(cv, HAIR_RED, 3)
    b.head(cv, tache=HAIR_RED, tache_size=1.5, helmet=gaul_helmet, look=-1.0)
    spear(cv, sb, st, mat=WOOD, head=BRONZE, w=2.0, head_len=12, head_w=4.4)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), TUN, sh=.8, lw=.6)
    fist(cv, b, 'F')
    oval_shield(cv, (78, 86), 13, 24)
    return cv, (16, 6, 100, 130)


def swordsman():
    cv = Canvas()
    ground(cv, 62, 36, ((24, 1.0, False), (102, .9, True)))
    b = Body(pelvis=(62, 74), ground=128, lean=10, legF=(30, 6), legN=(-20, -14), footF=-6, footN=-20,
             footN_len=.9, tilt=-6, shw=1.2)
    b.reach('F', (30, 72), bend=1)
    cape(cv, b, CLOAK_B, [(2, -31), (12, -30), (24, -22), (36, -10), C(44, -2), (32, -4), (26, 4), C(16, -2),
                          (10, -12)])
    for sd in 'FN':
        checked_leg(cv, b, sd, CHECK2)
    tunic(cv, b, TUN, hem=12.0, buckle=GOLD)
    torc(cv, b)
    b.hair_long(cv, HAIR_BLOND, 6)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    sd_ = norm((-.8, -.6))
    sword(cv, b.hand_c('F'), sd_, part="hilt", guard=BRONZE)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), TUN, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .5, .6), BRONZE, sh=.4, lw=.5)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=28, w=3.6, part="blade", guard=BRONZE)
    b.head(cv, tache=HAIR_BLOND, tache_size=1.7, helmet=lambda cv, b: gaul_helmet(cv, b, IRON, wings=WING),
           open_mouth=True, mouth=False, angry=True)

    def paint(cv, c, rx, ry):
        ring = ell_pts(c, rx * .62, ry * .62, n=12)
        cv.stroke(ring + [ring[0]], CHECK2.base, w=1.6)
        for a in range(0, 360, 45):
            cv.dot(polar(c, a, rx * .82), 1.1, CHECK2.base, detail=False)
    round_shield(cv, (80, 84), 14, 17, TUN_RED, rim=BRONZE, boss=BRONZE, paint=paint)
    return cv, (10, 10, 112, 130)


def pathfinder():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=54, coat=DUN, mane=Mat("#5a4030", sh="#3a281c", hl="#8a6a50", line="#18110c"),
               legs=Mat("#5a4030", sh="#3a281c", hl="#8a6a50", line="#18110c"), stride=1.0)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, CHECK, trim=CHECK2, long=False)
    b = seat(A, s=.72, lean=0, armN=(14, 72))
    horn_m = Mat("#f0e2c0", sh="#c4b088", hl="#ffffff", line="#18110c")
    mouth = b.H.p(-7.0, 5.0)
    b.reach('F', add(mouth, (2, 3)), bend=1)
    cape(cv, b, TUN, [(-8, -32), (8, -34), (20, -24), (30, -8), C(36, 6), (22, 2), C(12, 8), (8, -10)])
    checked_leg(cv, b, 'N', CHECK2)
    tunic(cv, b, TUN_RED, hem=6, buckle=GOLD)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, tache=HAIR_RED, tache_size=1.0, helmet=lambda cv, b: hood(cv, b, TUN), look=-1.0)
    # blowing a horn
    hc = mouth
    cv.shape([add(hc, (-.6, -1.6)), add(hc, (-8, -6)), add(hc, (-14, -14)), C(*add(hc, (-17, -10))),
              add(hc, (-11, -1)), add(hc, (-4, 2.4)), add(hc, (.4, 1.4))], horn_m, sh=.8, lw=.6)
    cv.shape(ell_pts(add(hc, (-15.6, -12.2)), 3.6, 2.2, ang=-55, n=8), BRONZE, sh=.3, lw=.5)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('F', .45, .6), TUN_RED, sh=.6, lw=.5)
    fist(cv, b, 'F')
    hz.bridle(cv, DLEATHER, BRONZE, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('N', .45, .6), TUN_RED, sh=.6, lw=.5)
    fist(cv, b, 'N')
    return cv, (4, 18, 116, 130)


def theutates():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=WHITEH, mane=Mat("#e8e0d0", sh="#b8b0a0", hl="#ffffff", line="#18110c"),
               legs=WHITEH, stride=1.0, head_up=.4)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, CLOAK_B, trim=GOLD)
    b = seat(A, s=.72, lean=-4, armN=(14, 72))
    b.reach('F', b.T.p(14, -48), bend=-1)
    cape(cv, b, CLOAK_B, [(-6, -31), (10, -32), (24, -30), (40, -26), (52, -16), C(56, -10), (42, -12),
                          (34, -6), C(22, -4), (10, -14)])
    checked_leg(cv, b, 'N', CHECK)
    tunic(cv, b, TUN, hem=6, buckle=GOLD)
    torc(cv, b)
    b.hair_long(cv, HAIR_BLOND, 6)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    # javelin about to be thrown (drawn before the head: arm cocked behind)
    h = b.hand_c('F')
    jd = norm((-1, -.28))
    spear(cv, sub(h, mul(jd, 18)), add(h, mul(jd, 22)), mat=WOOD, head=STEEL, w=1.6, head_len=8, head_w=3.2)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('F', .45, .6), TUN, sh=.6, lw=.5)
    fist(cv, b, 'F')
    b.head(cv, tache=HAIR_BLOND, tache_size=1.4, helmet=lambda cv, b: gaul_helmet(cv, b, BRONZE, wings=WING),
           angry=True, open_mouth=True, mouth=False)
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), SKIN, sh=.8)
    fist(cv, b, 'N')

    def bolt(cv, c, rx, ry):
        cv.shape([C(c[0] + 1, c[1] - ry * .85), C(c[0] - 3, c[1] + 1), C(c[0] + 1, c[1] + .4), C(c[0] - 2, c[1] + ry * .85),
                  C(c[0] + 4, c[1] - 2), C(c[0], c[1] - 1.4), C(c[0] + 4, c[1] - ry * .85)], GOLD, sh=0, lw=.4)
    round_shield(cv, b.T.p(9, -4), 9.5, 12, CLOAK_B, rim=BRONZE, boss=BRONZE, paint=bolt)
    return cv, (4, 6, 116, 130)


def druidrider():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=54, coat=GREYH, mane=Mat("#f0f0ec", sh="#c0c0b8", hl="#ffffff", line="#18110c"),
               legs=GREYH, stride=0.0)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, GGREEN, trim=GOLD)
    b = seat(A, s=.74, lean=-2, armN=(14, 72))
    staff_b, staff_t = b.T.p(-16, 24), b.T.p(-38, -74)
    b.reach('F', lerp(staff_b, staff_t, .45), bend=1)
    long_robe(cv, b, WHITE, hem=24, flare=1.2, trim=GOLD, belt=GOLD)
    cv.shape(b.foot_pts('N', "sandal"), SKIN, sh=.4, lw=.5)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.hair_long(cv, HAIR_GREY, 12)
    b.head(cv, beard=WHITE, long=10, tache=WHITE, tache_size=1.2, hair=HAIR_GREY, nose=1.25, smile=False,
           helmet=lambda cv, b: laurel(cv, b, Mat("#4caa3a", sh="#2e7a22", hl="#8adc70", line="#18110c")))
    # staff with mistletoe
    cv.rod(staff_b, staff_t, 2.4, DWOOD)
    for (dx, dy) in ((0, 0), (-3, 2), (3, 2), (0, 4)):
        p = add(staff_t, (dx, dy + 3))
        cv.shape(ell_pts(p, 2.4, 1.3, ang=dx * 15, n=6), Mat("#6ab83a", sh="#3e8a22", hl="#a8e070", line="#18110c"),
                 sh=0, lw=.4)
    for (dx, dy) in ((-1.4, 5), (1.6, 5.6), (0, 7.4)):
        cv.dot(add(staff_t, (dx, dy)), 1.0, "#ffffff", detail=False)
    cv.shape(b.arm_pts('F'), WHITE, sh=.8)
    fist(cv, b, 'F')
    # golden sickle at the belt hand
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), WHITE, sh=.8)
    fist(cv, b, 'N')
    return cv, (4, 8, 116, 130)


def haeduan():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=CHESTNUT, mane=Mat("#7a3a18", sh="#542410", hl="#a85a30", line="#18110c"),
               stride=.7)
    A = hz.draw(cv, cloth=lambda cv, h: h.caparison(cv, TUN, trim=GOLD, dots=None))
    hz.chanfron(cv, BRONZE)
    b = seat(A, s=.74, armN=(14, 72))
    lance_b, lance_t = b.T.p(22, 2), b.T.p(-74, -54)
    b.reach('F', lerp(lance_b, lance_t, .28), bend=1)
    cape(cv, b, TUN_RED, [(-6, -30), (10, -30), (22, -22), (34, -8), C(40, 4), (26, 2), C(14, 8), (8, -10)])
    checked_leg(cv, b, 'N', CHECK2)
    muscle_cuirass(cv, b, BRONZE, under=TUN)
    pteruges(cv, b, mat=TUN, trim=GOLD, n=5, length=8)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, tache=HAIR_RED, tache_size=1.4, helmet=lambda cv, b: gaul_helmet(cv, b, BRONZE, plume=TUN_RED,
                                                                                  knob=False), smile=False)
    spear(cv, lance_b, lance_t, mat=WOOD, head=BRONZE, w=2.0, head_len=11, head_w=4.0)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    cv.shape(b.fore_pts('F', .4, .6), BRONZE, sh=.4, lw=.5)
    fist(cv, b, 'F')
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    oval_shield(cv, b.T.p(8, -2), 9, 15, face=GGREEN)
    return cv, (4, 10, 116, 130)


def ram_g():
    from siege import wheel, beam, grain, WICKER
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    wheel(cv, (44, 110), 10, far=True)
    wheel(cv, (94, 110), 10, far=True)
    log = [(8, 92), (100, 92)]
    cv.shape(limb(log, [5.6, 6]), DWOOD, sh=1.2, lw=.75)
    grain(cv, (20, 92), (96, 92), 2, color=DWOOD.sh)
    # bronze boar head on the log
    cv.shape([(18, 84), (10, 84), (4, 88), C(1, 92), (4, 97), (10, 100), (18, 100)], BRONZE, sh=1.0, lw=.7)
    cv.shape([(12, 85), (13, 79), (17, 84)], BRONZE, sh=0, lw=.5)
    cv.shape([(3, 95), (1, 99), (6, 97)], WHITE, sh=0, lw=.4)
    cv.dot((8.4, 89.4), 1.0, "#18110c")
    cv.shape(ell_pts((2.4, 92), 1.4, 2, n=6), BRONZE, sh=0, lw=.4)
    # wicker dome
    dome = [C(24, 82), (26, 64), (36, 48), (52, 40), (70, 39), (88, 45), (100, 60), C(104, 82)]
    cv.shape(dome, WICKER, sh=2.4, lw=.8)
    for k in range(5):
        y = 48 + k * 7
        cv.stroke([(28 + (5 - k) * 1.0, y + 4), (64, y - 2), (100 - (5 - k) * 1.2, y + 4)], WICKER.sh, w=.9,
                  detail=True)
    for x in (40, 56, 72, 88):
        cv.stroke([(x, 44 + abs(x - 64) * .2), (x + (x - 64) * .06, 80)], WICKER.sh, w=.7, detail=True)
    beam(cv, (20, 82), (108, 82), 4)
    beam(cv, (16, 106), (110, 106), 5.6)
    grain(cv, (20, 106), (106, 106), 1)
    beam(cv, (28, 106), (28, 84), 4.4)
    beam(cv, (100, 106), (100, 84), 4.4)
    wheel(cv, (36, 114), 12)
    wheel(cv, (90, 114), 12)
    return cv, (0, 36, 112, 127)


def trebuchet():
    from siege import wheel, beam, grain, boulder, rope_coil
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    piv = (58, 40)
    # far frame
    beam(cv, (40, 110), piv, 4, far=True)
    beam(cv, (78, 110), piv, 4, far=True)
    # beam: short arm up-left with counterweight, long arm down-right with sling
    sa, la = (32, 26), (104, 96)
    beam(cv, sa, la, 4.6, DWOOD)
    grain(cv, sa, la, 1, color=DWOOD.sh)
    # counterweight box hanging under the short end
    cv.stroke([sa, (28, 40)], "#3a3a40", w=1.2)
    cv.stroke([sa, (40, 40)], "#3a3a40", w=1.2)
    cv.shape([C(22, 40), C(46, 40), C(44, 58), C(24, 58)], WOOD, sh=1.4, lw=.75)
    for y in (46, 52):
        cv.stroke([(23, y), (45, y)], WOOD.sh, w=.8, detail=True)
    for p in ((27, 44), (36, 49), (30, 54), (40, 54)):
        boulder(cv, p, 2.6)
    # sling with stone on the trough
    cv.stroke([la, (98, 108), (108, 108)], ROPE.base, w=1.2)
    boulder(cv, (102, 106), 4.4)
    # near frame
    beam(cv, (34, 112), piv, 4.8)
    beam(cv, (84, 112), piv, 4.8)
    beam(cv, (44, 86), (74, 86), 3.4)
    cv.shape(ell_pts(piv, 3.6, 3.6, n=8), IRON, sh=.3, lw=.6)
    beam(cv, (10, 112), (112, 112), 6)
    grain(cv, (14, 112), (106, 112), 1)
    beam(cv, (78, 116), (112, 116), 4, DWOOD)
    return cv, (6, 18, 114, 127)


def chieftain():
    cv = Canvas()
    ground(cv, tufts=((24, 1.0, False), (98, .9, True)))
    b = Body(pelvis=(60, 75), ground=128, lean=-4, legF=(14, 2), legN=(-12, -6), footF=-2, footN=-10, tilt=-6,
             shw=1.3, arm_bulk=1.5)
    b.reach('N', b.T.p(12, -4), bend=-1)
    b.reach('F', (30, 30), bend=1)
    cape(cv, b, TUN_RED, [(-14, -32), (14, -32), (20, -10), (22, 14), C(20, 22), (6, 20), (-8, 22), C(-18, 22),
                          (-18, 0)])
    for sd in 'FN':
        checked_leg(cv, b, sd, CHECK)
    tunic(cv, b, TUN, hem=13.0, trim=GOLD, buckle=GOLD)
    torc(cv, b)
    b.hair_long(cv, HAIR_BLOND, 8)
    cv.shape(b.neck_pts(1.25), SKIN, sh=1.0, lw=.6)
    sd_ = norm((-.3, -.95))
    sword(cv, b.hand_c('F'), sd_, part="hilt", guard=GOLD)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .5, .8), TUN, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .5, .6), GOLD, sh=.4, lw=.5)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=26, w=3.8, part="blade", guard=GOLD)
    b.head(cv, tache=HAIR_BLOND, tache_size=2.0, nose=1.25, open_mouth=True, mouth=False,
           helmet=lambda cv, b: gaul_helmet(cv, b, GOLD, wings=WING))
    cv.shape(b.arm_pts('N'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('N', .5, .8), TUN, sh=.8, lw=.6)
    cv.shape(b.fore_pts('N', .5, .6), GOLD, sh=.4, lw=.5)
    fist(cv, b, 'N')
    return cv, (16, 4, 104, 130)


def settler_g():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 75), ground=128, lean=8, legF=(22, 6), legN=(-14, -12), footF=-4, footN=-16, tilt=-4,
             shw=1.15)
    hoe_b, hoe_t = b.T.p(-8, -14), b.T.p(26, -44)
    b.reach('F', b.T.p(-6, -16), bend=1)
    b.reach('N', b.T.p(8, -2), bend=-1)
    # hoe over the shoulder
    cv.rod(hoe_b, hoe_t, 2.2, WOOD)
    cv.shape([add(hoe_t, (-2, -1)), add(hoe_t, (3, 8)), add(hoe_t, (7, 9)), add(hoe_t, (2, -2))], IRON, sh=.4,
             lw=.6)
    for sd in 'FN':
        checked_leg(cv, b, sd, CHECK2)
    tunic(cv, b, Mat("#a87a48", sh="#7a5228", hl="#d0a272", line="#18110c"), hem=12.0, buckle=BRONZE)
    b.hair_long(cv, HAIR_RED, 3)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.head(cv, hair=HAIR_RED, tache=HAIR_RED, tache_size=1.3, look=-1.0)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    fist(cv, b, 'F')
    cv.shape(b.arm_pts('N'), SKIN, sh=1.2)
    fist(cv, b, 'N')
    # a goose under the near arm
    gc = b.T.p(17, -4)
    GOOSE = Mat("#f8f6f0", sh="#c8c4b8", hl="#ffffff", line="#18110c")
    BEAK = Mat("#f4a028", sh="#c87010", hl="#ffd070", line="#18110c")
    gk = 1.35
    cv.push(gk, tx=gc[0] * (1 - gk), ty=gc[1] * (1 - gk))
    cv.shape([add(gc, (-8, 0)), add(gc, (-4, -6)), add(gc, (6, -6)), add(gc, (12, -10)), add(gc, (11, -3)),
              add(gc, (8, 4)), add(gc, (-2, 6))], GOOSE, sh=1.4, lw=.7)
    neck = [add(gc, (-6, -2)), add(gc, (-10, -10)), add(gc, (-9, -18))]
    cv.shape(limb(neck, [2.6, 2.0, 2.2]), GOOSE, sh=.6, lw=.6)
    hc = add(gc, (-9.6, -19))
    cv.shape(ell_pts(hc, 3.4, 3.0, n=8), GOOSE, sh=.6, lw=.6)
    cv.shape([add(hc, (-2, -.6)), add(hc, (-8, 1.0)), add(hc, (-7.4, 2.4)), add(hc, (-2, 1.8))], BEAK, sh=0, lw=.5)
    cv.dot(add(hc, (-.6, -1.0)), .8, "#18110c", detail=False)
    cv.pop()
    return cv, (16, 16, 104, 130)


UNITS = {
    1: phalanx,
    2: swordsman,
    3: pathfinder,
    4: theutates,
    5: druidrider,
    6: haeduan,
    7: ram_g,
    8: trebuchet,
    9: chieftain,
    10: settler_g,
}
