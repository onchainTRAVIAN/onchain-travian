"""Natar units (NPC tribe) - purple and gold."""
import math
from lib import *
from human import *
from gear import *
from horse import *
from costume import *

NP = NPURP
NP2 = NPURP2
DARKA = Mat("#4a4652", sh="#2c2a32", hl="#7a7684", line="#18110c", metal=True)
SPIKE = Mat("#c8ccd2", sh="#8a9098", hl="#ffffff", line="#18110c", metal=True)
EYEGLOW = "#ff4a2a"


def kettle_helm(cv, b, mat=GOLD, crest=None):
    H = b.H
    if crest:
        cv.shape(H.pts([(-3.0, -12.0), (-1.0, -17.6), (4.0, -19.4), (9.0, -16.6), (10.6, -11.0), (6.0, -12.6)]),
                 crest, sh=.8, lw=.55)
    cv.shape(H.pts([C(-7.4, -6.0), (-6.6, -10.4), (-2.4, -13.4), (2.6, -13.6), (7.0, -11.4), (8.8, -7.0),
                    C(8.8, -4.8)]), mat, sh=1.2, lw=.7)
    cv.shape(H.pts([C(-12.0, -5.4), (-6.0, -7.4), (2.0, -7.6), (9.0, -6.6), C(13.0, -4.4), (9.0, -3.6), (2.0, -4.4),
                    (-6.0, -4.2)]), mat, sh=.6, lw=.6)
    cv.stroke(H.pts([(-4.0, -10.4), (0, -12.2), (4.0, -12.0)]), mat.hl, w=.9, detail=True)


def closed_helm(cv, b, mat=DARKA, spikes=True, plume=None):
    H = b.H
    if plume:
        cv.shape(H.pts([(2.0, -10.0), (6.0, -17.0), (12.0, -19.0), (10.0, -14.0), (13.0, -10.0), (7.0, -8.0)]),
                 plume, sh=.8, lw=.55)
    if spikes:
        for (x, y, a) in ((-5.0, -10.0, -40), (0.0, -12.4, -5), (5.4, -11.0, 30), (8.6, -6.0, 60)):
            p = H.p(x, y)
            d = (math.sin(math.radians(a)), -math.cos(math.radians(a)))
            n = perp(d)
            k = H.s / 1.45
            cv.shape([add(p, mul(n, 2.2 * k)), add(p, mul(d, 6.0 * k)), add(p, mul(n, -2.2 * k))], SPIKE, sh=0,
                     lw=.5)
    cv.shape(H.pts([(1.0, -11.6), (6.4, -10.0), (9.0, -5.0), (9.0, 2.0), (6.6, 7.4), (1.0, 9.0), (-4.6, 8.4),
                    (-8.2, 5.4), (-9.0, 0.0), (-8.6, -6.0), (-5.4, -10.4)]), mat, sh=1.4, lw=.75)
    cv.shape(H.pts([C(-8.8, -3.6), (-2.0, -4.0), C(3.0, -3.4), C(3.0, -1.4), (-2.0, -1.8), C(-8.8, -1.4)]),
             Mat("#18110c", sh="#18110c", hl="#18110c", line="#18110c"), sh=0, lw=.3)
    cv.dot(H.p(-5.6, -2.6), .8 * H.s / 1.45, EYEGLOW)
    cv.dot(H.p(-1.6, -2.6), .8 * H.s / 1.45, EYEGLOW)
    for (x, y) in ((-6.6, 2.4), (-4.4, 3.0), (-6.0, 4.8), (-3.8, 5.2)):
        cv.dot(H.p(x, y), .45 * H.s / 1.45, "#18110c")
    cv.stroke(H.pts([(-1.0, -11.0), (-2.0, 7.8)]), mat.sh, w=.8, detail=True)


def sun_paint(cv, c, rx, ry):
    cv.shape(ell_pts(c, rx * .3, ry * .3, n=10), GOLD, sh=0, lw=.4)
    for a in range(0, 360, 30):
        p0 = (c[0] + math.cos(math.radians(a)) * rx * .38, c[1] + math.sin(math.radians(a)) * ry * .38)
        p1 = (c[0] + math.cos(math.radians(a)) * rx * .75, c[1] + math.sin(math.radians(a)) * ry * .75)
        cv.stroke([p0, p1], GOLD.base, w=1.4)


def tabard(cv, b, mat=NP, trim=GOLD, hem=14.0):
    cv.shape(b.tw([(-6.0, -31.0), (6.0, -31.0), (8.6, hem), C(4.0, hem + 2.0), (-4.0, hem + 2.0), C(-9.6, hem)], 1.0),
             mat, sh=1.0, lw=.6)
    if trim:
        cv.stroke(b.tw([(-9.0, hem - 1.0), (-4.0, hem + .8), (4.0, hem + .8), (8.0, hem - 1.0)], 1.0), trim.base, w=1.4)
        cv.shape(ell_pts(b.T.p(-1.0, -18.0), 3.0, 3.0, n=8), trim, sh=0, lw=.5)


def pikeman():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(62, 75), ground=128, lean=4, legF=(20, 4), legN=(-8, -8), footF=-2, footN=-10, tilt=2,
             shw=1.2)
    hf, hn = (42.0, 80.0), (62.0, 88.0)
    b.reach('F', hf, bend=1)
    b.reach('N', hn, bend=-1)
    dd = norm(sub(hf, hn))
    tip = add(hf, mul(dd, 34))
    butt = sub(hn, mul(dd, 30))
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=NP2, wraps=None, boot=DLEATHER)
        greave(cv, b, sd, GOLD)
    tunic(cv, b, Mat("#9aa2aa", sh="#6a727c", hl="#d0d6dc", line="#18110c"), hem=13.0)
    mail_rows(cv, b, "#6a727c", y0=-26, y1=8, step=5)
    tabard(cv, b)
    cv.shape(b.arm_pts('F'), NP2, sh=1.0)
    spear(cv, butt, tip, mat=DWOOD, head=STEEL, w=2.2, head_len=12, head_w=4.0)
    cv.shape(b.fist_pts('F'), SKIN, sh=.8, lw=.6)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_DARK, long=0, tache=HAIR_DARK, helmet=lambda cv, b: kettle_helm(cv, b, GOLD, NP2),
           smile=False)
    cv.shape(b.arm_pts('N'), NP2, sh=1.0)
    fist(cv, b, 'N')
    return cv, (12, 10, 108, 130)


def thorned_warrior():
    cv = Canvas()
    ground(cv, tufts=((24, 1.0, False), (98, .9, True)))
    b = Body(pelvis=(60, 75), ground=128, lean=6, legF=(24, 4), legN=(-12, -10), footF=-4, footN=-14, tilt=4,
             shw=1.3, arm_bulk=1.5, leg_bulk=1.4)
    b.reach('F', (40, 30), bend=1)
    cape(cv, b, NP, [(-12, -30), (13, -30), (20, -10), (24, 14), C(22, 22), (8, 18), (-6, 21), C(-15, 22),
                     (-15, 0)])
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=DARKA, wraps=None, boot=DARKA)
        knee = b.kneeF if sd == 'F' else b.kneeN
        cv.shape([add(knee, (-3, -2)), add(knee, (-8, 0)), add(knee, (-3, 2))], SPIKE, sh=0, lw=.5)
    tunic(cv, b, DARKA, hem=12.0, belt=NP, buckle=GOLD)
    for (x, y) in ((-8, -22), (-2, -24), (4, -22), (-6, -12), (2, -12)):
        p = b.T.p(x * b.shw, y)
        cv.shape([add(p, (-1.6, 1)), add(p, (-3.6, -3.6)), add(p, (1.6, 1))], SPIKE, sh=0, lw=.45)
    # morning star on a chain (far arm raised, behind the head)
    h = b.hand_c('F')
    cv.rod(add(h, (3, 4)), add(h, (-3, -6)), 2.6, DWOOD)
    ch = [add(h, (-3, -6)), add(h, (-10, -10)), add(h, (-16, -8))]
    cv.stroke(ch, "#5a5a62", w=1.4)
    cv.stroke(ch, "#a0a0a8", w=.6, detail=True)
    bc = add(h, (-20, -6))
    for a in range(0, 360, 45):
        cv.shape([polar(bc, a - 16, 4.6), polar(bc, a, 9), polar(bc, a + 16, 4.6)], SPIKE, sh=0, lw=.45)
    cv.shape(ell_pts(bc, 5.6, 5.6, n=10), DARKA, sh=.9, lw=.6)
    cv.shape(b.arm_pts('F'), DARKA, sh=1.0)
    cv.shape(b.upper_arm_pts('F', .3, 1.4), DARKA, sh=.6, lw=.6)
    fist(cv, b, 'F', DARKA)
    cv.shape(b.neck_pts(1.2), DARKA, sh=1.0, lw=.6)
    b.head(cv, helmet=closed_helm, nose=0, mouth=False, ear=False)
    # spiked pauldron on the near shoulder
    sp = b.shN
    for a in (-120, -80, -40):
        cv.shape([polar(sp, a - 14, 5), polar(sp, a, 11), polar(sp, a + 14, 5)], SPIKE, sh=0, lw=.45)
    cv.shape(ell_pts(sp, 7, 5.6, n=10), DARKA, sh=.8, lw=.6)
    cv.shape(b.arm_pts('N'), DARKA, sh=1.0)
    fist(cv, b, 'N', DARKA)
    return cv, (12, 10, 104, 130)


def guardsman():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 75), ground=128, lean=2, legF=(14, 2), legN=(-8, -6), footF=-2, footN=-10, shw=1.2)
    b.reach('F', (36, 76), bend=1)
    cape(cv, b, NP2, [(-12, -30), (13, -30), (18, -10), (20, 14), C(17, 22), (8, 19), (-6, 21), C(-15, 22),
                      (-15, 0)])
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=NP, wraps=None, boot=DLEATHER)
        greave(cv, b, sd, GOLD)
    skirt(cv, b, NP, hem=13)
    muscle_cuirass(cv, b, GOLD, under=NP)
    pteruges(cv, b, mat=NP, trim=GOLD)
    sd_ = norm((-.9, -.42))
    sword(cv, b.hand_c('F'), sd_, part="hilt", guard=GOLD)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), NP, sh=.8, lw=.6)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=24, w=3.8, part="blade", guard=GOLD)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.head(cv, tache=HAIR_DARK, tache_size=.6,
           helmet=lambda cv, b: kettle_helm(cv, b, GOLD, Mat("#e8e0f0", sh="#b8a8c8", hl="#ffffff", line="#18110c")),
           smile=False)
    # tall shield
    x0, y0, w, h = 64, 58, 26, 54
    cv.shape([C(x0 - 2.6, y0 + 1.2), C(x0, y0), (x0 - .4, y0 + h / 2), C(x0, y0 + h), C(x0 - 2.6, y0 + h - 1.2)], DWOOD,
             sh=.3, lw=.6)
    pts = [C(x0, y0), (x0 + w / 2, y0 - 4), C(x0 + w, y0), (x0 + w + 1, y0 + h * .6), (x0 + w / 2, y0 + h + 4),
           (x0 - 1, y0 + h * .6)]
    cv.shape(pts, GOLD, sh=.8, lw=.75)
    inner = [C(x0 + 2, y0 + 2), (x0 + w / 2, y0 - 1.6), C(x0 + w - 2, y0 + 2), (x0 + w - 1, y0 + h * .58),
             (x0 + w / 2, y0 + h + .8), (x0 + 1, y0 + h * .58)]
    cv.shape(inner, NP, sh=2.6, lw=.4)
    sun_paint(cv, (x0 + w / 2, y0 + h * .42), 10, 12)
    return cv, (14, 18, 100, 130)


def eagle():
    cv = Canvas()
    cv.ground(60, 128, 26, 4)
    BR = Mat("#8a5a30", sh="#5e3a1c", hl="#b88250", line="#18110c")
    BRD = Mat("#6a4224", sh="#4a2a14", hl="#946238", line="#18110c")
    WH = Mat("#f8f4ea", sh="#cfc6b4", hl="#ffffff", line="#18110c")
    YEL = Mat("#f4c028", sh="#c88a10", hl="#ffe478", line="#18110c")
    # far wing (up and back)
    fw = [(66, 64), (74, 44), (88, 26), (104, 12), (112, 10), C(116, 14), (110, 18), C(116, 22), (106, 26),
          C(112, 32), (100, 34), C(104, 42), (92, 44), C(94, 52), (82, 56)]
    cv.shape(fw, BRD, sh=1.4)
    # tail
    cv.shape([(76, 84), (92, 92), C(98, 104), (90, 104), C(88, 110), (80, 104), C(74, 106), (70, 92)], BR, sh=1.2)
    # body
    body = [(46, 62), (58, 58), (72, 64), (82, 76), (84, 88), (74, 94), (60, 92), (50, 84), (44, 72)]
    cv.shape(body, BR, sh=2.4)
    for (x, y) in ((60, 70), (66, 76), (70, 84), (58, 82)):
        cv.stroke([(x, y), (x + 3, y + 3), (x + 6, y)], BR.sh, w=.7, detail=True)
    # talons
    for x in (56, 66):
        cv.shape(limb([(x, 88), (x - 2, 100)], [3.4, 2.0]), YEL, sh=.4, lw=.6)
        for dx in (-4, -1, 2):
            cv.shape([(x - 2, 99), (x - 2 + dx, 104), C(x - 3 + dx, 106), (x - 3 + dx, 103)], Mat("#2a2a2a", sh="#111",
                                                                                                  hl="#555",
                                                                                                  line="#18110c"),
                     sh=0, lw=.4)
    # near wing (spread forward/up)
    nw = [(60, 66), (56, 50), (50, 34), (40, 20), (30, 12), C(24, 10), (28, 18), C(20, 18), (28, 26),
          C(20, 28), (32, 34), C(26, 38), (38, 42), C(34, 48), (46, 52), (54, 70)]
    cv.shape(nw, BR, sh=1.8)
    for (a, b_) in (((50, 36), (44, 24)), ((52, 46), (40, 36)), ((54, 56), (46, 50))):
        cv.stroke([a, b_], BR.sh, w=.8, detail=True)
    # head
    head = [(38, 50), (44, 42), (54, 40), (60, 46), (60, 56), (54, 62), (44, 62)]
    cv.shape(head, WH, sh=1.4)
    cv.shape([(42, 48), (34, 48), (28, 52), C(27, 58), (32, 56), (38, 56), (42, 55)], YEL, sh=.6, lw=.65)
    cv.stroke([(30, 54.6), (38, 53.6)], "#18110c", w=.6)
    cv.shape(ell_pts((46, 48), 2.4, 2.2, n=8), YEL, sh=0, lw=.45)
    cv.dot((45.4, 48.2), 1.2, "#18110c", detail=False)
    cv.stroke([(41, 44.6), (46, 44.2), (50, 46)], "#18110c", w=1.1)
    return cv, (18, 6, 118, 112)


def axerider():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=BLACKH, mane=Mat("#5a3a7a", sh="#3a2050", hl="#8a6aaa", line="#18110c"),
               legs=BLACKH, stride=1.0)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, NP, trim=GOLD)
    b = seat(A, s=.74, armN=(14, 72))
    b.reach('F', b.T.p(-14, -48), bend=1)
    cape(cv, b, NP2, [(-6, -30), (10, -30), (22, -22), (34, -8), C(40, 4), (26, 2), C(14, 8), (8, -10)])
    trouser_leg(cv, b, 'N', mat=NP, wraps=None, boot=DLEATHER)
    tunic(cv, b, Mat("#9aa2aa", sh="#6a727c", hl="#d0d6dc", line="#18110c"), hem=10)
    tabard(cv, b, hem=10)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    h = b.hand_c('F')
    dd = norm((-.3, -.95))
    cv.rod(sub(h, mul(dd, 8)), add(h, mul(dd, 26)), 2.2, DWOOD)
    axe_head(cv, add(h, mul(dd, 23)), dd, STEEL, size=1.25)
    cv.shape(b.arm_pts('F'), NP2, sh=.8)
    fist(cv, b, 'F')
    b.head(cv, beard=HAIR_DARK, tache=HAIR_DARK, helmet=lambda cv, b: kettle_helm(cv, b, GOLD), angry=True)
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), NP2, sh=.8)
    fist(cv, b, 'N')
    return cv, (4, 4, 116, 130)


def natarian_knight():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=WHITEH, mane=Mat("#e0d8f0", sh="#b0a8c8", hl="#ffffff", line="#18110c"),
               legs=WHITEH, stride=.7)
    A = hz.draw(cv, cloth=lambda cv, h: h.caparison(cv, NP, trim=GOLD, dots=GOLD))
    hz.chanfron(cv, GOLD)
    b = seat(A, s=.74, armN=(10, 60))
    lance_b, lance_t = b.T.p(22, 2), b.T.p(-72, -56)
    b.reach('F', lerp(lance_b, lance_t, .26), bend=1)
    cape(cv, b, NP2, [(-6, -30), (10, -30), (22, -22), (34, -8), C(40, 4), (26, 2), C(14, 8), (8, -10)])
    trouser_leg(cv, b, 'N', mat=STEEL, wraps=None, boot=STEEL)
    muscle_cuirass(cv, b, GOLD, under=NP)
    pteruges(cv, b, mat=NP, trim=GOLD, n=5, length=8)
    cv.shape(b.neck_pts(), DARKA, sh=.6, lw=.5)
    b.head(cv, helmet=lambda cv, b: closed_helm(cv, b, GOLD, spikes=False, plume=NP2), nose=0, mouth=False,
           ear=False)
    spear(cv, lance_b, lance_t, mat=DWOOD, head=STEEL, w=2.0, head_len=10, head_w=3.8)
    pn = lerp(lance_b, lance_t, .84)
    cv.shape([pn, lerp(lance_b, lance_t, .96), add(lerp(lance_b, lance_t, .92), (10, 6)), add(pn, (7, 8))],
             NP2, sh=.5, lw=.55)
    cv.shape(b.arm_pts('F'), STEEL, sh=.8)
    fist(cv, b, 'F', STEEL)
    hz.bridle(cv, DLEATHER, GOLD, hand=None)
    round_shield(cv, b.T.p(8, -4), 10, 13, NP, rim=GOLD, boss=GOLD, paint=sun_paint)
    return cv, (4, 10, 116, 130)


def war_elephant():
    from nature import elephant_body
    cv = Canvas()
    cv.ground(60, 127, 50, 5)
    A = elephant_body(cv, scale=.92, dx=2)
    # howdah (little tower) on the back
    top = A["back"]
    x, y = top
    cv.shape([C(x - 22, y + 6), C(x + 20, y + 6), C(x + 18, y + 20), C(x - 20, y + 20)], NP, sh=1.4, lw=.7)
    cv.stroke([(x - 22, y + 19), (x + 18, y + 19)], GOLD.base, w=1.6)
    for k in range(4):
        cv.dot((x - 14 + k * 10, y + 13), 1.4, GOLD.base, detail=False)
    cv.shape([C(x - 20, y - 14), C(x + 18, y - 14), C(x + 18, y + 6), C(x - 20, y + 6)], WOOD, sh=1.4, lw=.7)
    for xx in range(int(x - 16), int(x + 18), 7):
        cv.stroke([(xx, y - 13), (xx, y + 5)], WOOD.sh, w=.7, detail=True)
    cv.shape([C(x - 24, y - 14), (x - 1, y - 28), C(x + 22, y - 14)], NP2, sh=1.2, lw=.7)
    cv.stroke([(x - 1, y - 28), (x - 1, y - 36)], DWOOD.base, w=1.4)
    cv.shape([(x - 1, y - 36), (x + 9, y - 33), (x - 1, y - 30)], GOLD, sh=0, lw=.5)
    # crenels
    for k in range(5):
        xx = x - 20 + k * 9
        cv.shape([C(xx, y - 14), C(xx + 4, y - 14), C(xx + 4, y - 18), C(xx, y - 18)], WOOD, sh=0, lw=.5)
    return cv, (2, 18, 118, 127)


def ballista():
    from siege import wheel, beam, grain, rope_coil
    cv = Canvas()
    cv.ground(60, 126, 48, 5)
    wheel(cv, (44, 110), 9, far=True)
    wheel(cv, (90, 110), 9, far=True)
    # stand
    beam(cv, (16, 108), (104, 108), 5, far=True)
    beam(cv, (58, 106), (60, 80), 5)
    beam(cv, (46, 106), (58, 84), 3.6)
    beam(cv, (74, 106), (62, 84), 3.6)
    # stock + slider
    beam(cv, (20, 78), (100, 84), 6, DWOOD)
    grain(cv, (24, 78), (96, 84), 1, color=DWOOD.sh)
    # bow arms with torsion frame
    fr = (34, 79)
    cv.shape([C(28, 66), C(40, 66), C(40, 92), C(28, 92)], NP, sh=1.0, lw=.7)
    cv.shape(ell_pts((34, 70), 3, 3, n=8), GOLD, sh=0, lw=.5)
    cv.shape(ell_pts((34, 88), 3, 3, n=8), GOLD, sh=0, lw=.5)
    cv.shape(limb([(36, 68), (48, 56), (60, 50)], [2.6, 2.2, 1.6]), DWOOD, sh=.6, lw=.6)
    cv.shape(limb([(36, 90), (48, 102), (60, 108)], [2.6, 2.2, 1.6]), DWOOD, sh=.6, lw=.6)
    # string drawn back to the trigger
    cv.stroke([(60, 50), (88, 82), (60, 108)], "#f0e6c8", w=1.0)
    # bolt
    cv.rod((14, 80), (88, 81.6), 2.2, WOOD)
    cv.shape([(14, 78), (4, 80.8), (14, 83)], STEEL, sh=0, lw=.55)
    cv.shape([(82, 81), (90, 76), (92, 81.4), (90, 86)], NP2, sh=0, lw=.5)
    # winch
    cv.shape(ell_pts((96, 88), 4.4, 4.4, n=8), WOOD, sh=.5, lw=.6)
    cv.stroke([(96, 88), (102, 94)], DWOOD.base, w=1.8)
    beam(cv, (12, 112), (108, 112), 6)
    grain(cv, (16, 112), (104, 112), 1)
    wheel(cv, (36, 116), 10)
    wheel(cv, (84, 116), 10)
    return cv, (2, 44, 112, 127)


def emperor():
    cv = Canvas()
    ground(cv)
    ERM = Mat("#fbfaf6", sh="#d4d0c6", hl="#ffffff", line="#18110c")
    b = Body(pelvis=(60, 75), ground=128, lean=-4, legF=(6, 2), legN=(-6, -4), footF=-2, footN=-8, shw=1.3,
             tilt=-6, arm_bulk=1.4)
    sc_b, sc_t = (34, 98), (32, 36)
    b.reach('F', lerp(sc_b, sc_t, .5), bend=1)
    b.reach('N', b.T.p(10, -6), bend=-1)
    cape(cv, b, NP, [(-14, -32), (14, -32), (22, -10), (26, 20), (28, 46), C(24, 52), (6, 50), (-8, 52),
                     C(-20, 50), (-20, 20)])
    for sd in 'FN':
        cv.shape(b.foot_pts(sd, "boot"), GOLD, sh=.6, lw=.6)
    long_robe(cv, b, NP2, hem=48, flare=1.1, trim=GOLD, belt=GOLD)
    cv.shape(b.tw([(-3, -20), (3, -20), (5, 46), (-5, 46)], 1.0), GOLD, sh=.6, lw=.5)
    # ermine collar
    cv.shape(b.tw([(-14.0, -30.0), (-6.0, -34.0), (6.0, -34.0), (15.0, -30.0), (14.0, -24.0), (6.0, -27.0),
                   (-6.0, -27.0), (-14.0, -24.0)]), ERM, sh=.8, lw=.6)
    for x in (-10, -4, 2, 8, 12):
        cv.dot(b.T.p(x * b.shw, -29.0), .8, "#18110c")
    # sceptre
    cv.rod(sc_b, sc_t, 2.2, GOLD)
    cv.shape(ell_pts((sc_t[0], sc_t[1] - 3), 3.6, 3.6, n=8), NP2, sh=.6, lw=.6, glow="#e8c8ff")
    cv.shape([(sc_t[0] - 4, sc_t[1] - 1), (sc_t[0] + 4, sc_t[1] - 1), (sc_t[0] + 2, sc_t[1] + 2),
              (sc_t[0] - 2, sc_t[1] + 2)], GOLD, sh=0, lw=.5)
    cv.shape(b.arm_pts('F'), NP2, sh=1.0)
    cv.shape(b.fore_pts('F', .7, .9), ERM, sh=.3, lw=.5)
    fist(cv, b, 'F')
    cv.shape(b.neck_pts(1.2), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_GREY, long=4, tache=HAIR_GREY, nose=1.3, hair=HAIR_GREY, smile=False,
           helmet=crown)
    cv.shape(b.arm_pts('N'), NP2, sh=1.0)
    cv.shape(b.fore_pts('N', .7, .9), ERM, sh=.3, lw=.5)
    fist(cv, b, 'N')
    return cv, (16, 8, 104, 130)


def crown(cv, b):
    H = b.H
    cv.shape(H.pts([C(-7.0, -6.0), C(-8.0, -14.0), (-4.6, -10.0), C(-2.0, -15.0), (.6, -10.6), C(3.6, -15.4),
                    (5.6, -10.4), C(8.8, -14.0), C(8.0, -5.0), (1.0, -6.4)]), GOLD, sh=.8, lw=.6)
    for (x, y, c) in ((-4.0, -8.0, "#d83a3a"), (1.0, -8.4, "#3a8ad8"), (5.6, -7.8, "#3ac86a")):
        cv.dot(H.p(x, y), 1.0 * H.s / 1.45, c)


def settler_n():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 75), ground=128, lean=8, legF=(22, 6), legN=(-14, -12), footF=-4, footN=-16, tilt=-4,
             shw=1.1)
    stick_t, stick_b = (36, 50), (30, 127)
    b.reach('F', lerp(stick_b, stick_t, .7), bend=1)
    sack_on_back(cv, b, Mat("#b89ac8", sh="#8a6aa0", hl="#dcc8ea", line="#18110c"), size=1.1)
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=NP, wraps=WRAP)
    long_robe(cv, b, NP2, hem=20, flare=1.1, belt=DLEATHER)
    cv.rod(stick_b, stick_t, 2.4, WOOD)
    cv.shape(b.arm_pts('F'), NP2, sh=1.0)
    fist(cv, b, 'F')
    cv.shape(b.neck_pts(1.05), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_BROWN, tache=HAIR_BROWN, look=-1.0, helmet=lambda cv, b: hood(cv, b, NP))
    cv.stroke(b.tw([(-9.0, -29.0), (-2.0, -18.0), (8.0, -8.0)]), DLEATHER.base, w=1.8)
    cv.shape(b.arm_pts('N'), NP2, sh=1.0)
    fist(cv, b, 'N')
    return cv, (16, 18, 104, 130)


UNITS = {
    1: pikeman,
    2: thorned_warrior,
    3: guardsman,
    4: eagle,
    5: axerider,
    6: natarian_knight,
    7: war_elephant,
    8: ballista,
    9: emperor,
    10: settler_n,
}
