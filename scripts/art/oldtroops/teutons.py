"""Teuton units."""
from lib import *
from human import *
from gear import *
from horse import *
from costume import *

TUNIC = TBLUE
TROUS = TBROWN
WRAP = Mat("#cdbb98", sh="#a08c68", hl="#ece0c4", line="#5a4a30")
BOOT = LEATHER


def spangenhelm(cv, b, mat=IRON, band=BRONZE, horns=None, wings=None, nasal=True):
    H = b.H
    if horns:
        for pts in ([(5.0, -9.0), (9.4, -12.0), (11.6, -17.6), C(11.0, -20.6), (8.6, -15.4), (4.4, -11.6)],
                    [(-3.6, -10.0), (-7.0, -13.6), (-8.0, -19.0), C(-7.0, -21.4), (-5.2, -16.2), (-1.6, -12.0)]):
            cv.shape(H.pts(pts), horns, sh=.6, lw=.6)
    if wings:
        for pts in ([(5.6, -9.4), (9.0, -16.0), (14.0, -20.0), (12.6, -15.6), (14.6, -14.0), (11.6, -11.4),
                     (12.6, -9.6), (7.6, -7.0)],):
            cv.shape(H.pts(pts), wings, sh=.6, lw=.6)
    cv.shape(H.pts([C(-7.8, -4.8), (-7.2, -8.6), (-4.4, -12.0), C(.6, -15.0), (5.6, -12.0), (8.6, -8.0),
                    C(9.0, -3.6), (2.0, -4.6)]), mat, sh=1.3, lw=.7)
    cv.stroke(H.pts([(.6, -14.4), (-3.0, -10.0), (-4.2, -5.6)]), band.base, w=1.6)
    cv.stroke(H.pts([(.6, -14.4), (4.2, -10.4), (5.6, -4.8)]), band.base, w=1.6)
    cv.shape(H.pts([C(-8.2, -5.8), (-1.0, -6.8), (4.0, -6.2), C(9.2, -4.4), C(9.2, -2.8), (4.0, -4.0), (-1.0, -4.6),
                    C(-8.2, -4.0)]), band, sh=.3, lw=.5)
    if nasal:
        cv.shape(H.pts([C(-7.6, -4.4), C(-5.8, -4.4), (-6.0, -.4), C(-7.2, .2)]), mat, sh=.2, lw=.5)
    cv.dot(H.p(-2.6, -9.6), .9 * b.H.s / 1.45, mat.hl)


def axeman():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 74), ground=128, s=1.0, lean=2, legF=(18, 4), legN=(-6, -8), footF=-2, footN=-10, footN_len=.85,
             tilt=4, shw=1.2)
    hf, hn = (45.0, 62.0), (66.0, 77.0)
    b.reach('F', hf, bend=1)
    b.reach('N', hn, bend=-1)
    dd = norm(sub(hf, hn))
    top = add(hf, mul(dd, 24))
    bot = sub(hn, mul(dd, 16))

    def paint(cv, c, rx, ry):
        for a in range(0, 360, 90):
            cv.shape([c, polar(c, a - 18, rx * .95), polar(c, a + 18, rx * .95)], WHITE, sh=.3, lw=.4)
    round_shield_back(cv, b, paint=paint)
    trouser_leg(cv, b, 'F')
    trouser_leg(cv, b, 'N')
    tunic(cv, b, hem=15.0, trim=FURL)
    # hair behind, neck, head
    b.hair_long(cv, HAIR_RED, 6)
    cv.shape(b.neck_pts(1.15), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_RED, long=2.4, tache=HAIR_RED, helmet=spangenhelm, angry=True)
    fur_mantle(cv, b)
    # arms + axe
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .55, .9), TUNIC, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .45, .6), DLEATHER, sh=.5, lw=.5)
    cv.rod(bot, top, 2.4, WOOD)
    axe_head(cv, sub(top, mul(dd, 2.0)), dd, IRON, size=1.5)
    fist(cv, b, 'F')
    cv.shape(b.arm_pts('N'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('N', .55, .9), TUNIC, sh=.8, lw=.6)
    cv.shape(b.fore_pts('N', .45, .6), DLEATHER, sh=.5, lw=.5)
    fist(cv, b, 'N', )
    return cv, (18, 22, 100, 130)


def blue_paint(cv, c, rx, ry):
    for a in range(0, 360, 90):
        cv.shape([c, polar(c, a - 18, rx * .95), polar(c, a + 18, rx * .95)], WHITE, sh=.3, lw=.4)


def cross_paint(cv, c, rx, ry):
    cv.shape([C(c[0] - rx * .9, c[1] - 2.2), C(c[0] + rx * .9, c[1] - 2.2), C(c[0] + rx * .9, c[1] + 2.2),
              C(c[0] - rx * .9, c[1] + 2.2)], GOLD, sh=0, lw=.4)
    cv.shape([C(c[0] - 2.2, c[1] - ry * .9), C(c[0] + 2.2, c[1] - ry * .9), C(c[0] + 2.2, c[1] + ry * .9),
              C(c[0] - 2.2, c[1] + ry * .9)], GOLD, sh=0, lw=.4)


HORN = Mat("#f2e6c8", sh="#c8b48a", hl="#ffffff", line="#18110c")
WING = Mat("#f8f8f4", sh="#c8c8c0", hl="#ffffff", line="#18110c")
MAIL = Mat("#9aa2aa", sh="#6a727c", hl="#d0d6dc", line="#18110c", metal=True)


def clubswinger():
    cv = Canvas()
    ground(cv, tufts=((26, 1.0, False), (96, .9, True)))
    b = Body(pelvis=(58, 75), ground=128, lean=4, legF=(22, 6), legN=(-14, -6), footF=-4, footN=-12,
             tilt=6, shw=1.25, arm_bulk=1.6, leg_bulk=1.4)
    grip = (64.0, 58.0)
    b.reach('N', grip, bend=-1)
    b.reach('F', (40.0, 84.0), bend=1)
    clubtop = (98.0, 20.0)
    for sd in 'FN':
        cv.shape(b.leg_pts(sd), SKIN, sh=1.4)
        fur_boot(cv, b, sd)
    # fur breeches + loincloth
    for sd in 'FN':
        hip, knee = (b.hipF, b.kneeF) if sd == 'F' else (b.hipN, b.kneeN)
        cv.shape(limb([add(hip, (0, -3)), lerp(hip, knee, .5), lerp(hip, knee, .9)], [8.6, 7.6, 6.4], cap0=False),
                 FUR, sh=1.2, lw=.7)
    cv.shape(b.tw([C(-12.0, -4.0), (0, -3.0), C(12.0, -3.6), (13.0, 6.0), C(10.0, 12.0), (6.0, 8.0), (2.0, 13.0),
                   (-2.0, 9.0), (-6.0, 14.0), (-9.0, 9.0), C(-13.6, 12.0)]), FUR, sh=1.4, lw=.7)
    b.hair_long(cv, HAIR_BLOND, 10)
    bare_torso(cv, b, hairy=HAIR_BLOND)
    cv.shape(b.tw([C(-11.6, -5.6), (0, -4.4), C(11.6, -5.2), C(11.6, -2.4), (0, -1.6), C(-11.6, -2.8)]), DLEATHER,
             sh=.3, lw=.55)
    cv.shape(b.neck_pts(1.3), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_BLOND, long=3.0, tache=HAIR_BLOND, hair=HAIR_BLOND, angry=True, nose=1.2)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.fore_pts('F', .5, .8), FUR, sh=.5, lw=.55)
    fist(cv, b, 'F')
    # club
    club = [grip, lerp(grip, clubtop, .3), lerp(grip, clubtop, .7), clubtop]
    cv.shape(limb([sub(grip, mul(norm(sub(clubtop, grip)), 6))] + club, [2.0, 2.2, 3.4, 5.6, 6.4]), WOOD, sh=1.2,
             lw=.75)
    for t, side in ((.45, 1), (.7, -1), (.86, 1)):
        p = lerp(grip, clubtop, t)
        n = perp(norm(sub(clubtop, grip)))
        cv.shape(ell_pts(add(p, mul(n, side * (2.6 + t * 4))), 1.6, 1.3, n=6), WOOD, sh=.3, lw=.5)
    cv.shape(b.arm_pts('N'), SKIN, sh=1.2)
    cv.shape(b.fore_pts('N', .5, .8), FUR, sh=.5, lw=.55)
    fist(cv, b, 'N')
    return cv, (16, 14, 106, 130)


def spearman():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 75), ground=128, lean=2, legF=(14, 2), legN=(-8, -6), footF=-2, footN=-10, tilt=2,
             shw=1.2)
    sb, st = (20, 124), (40, 6)
    grip = lerp(sb, st, .52)
    b.reach('F', grip, bend=1)
    for sd in 'FN':
        trouser_leg(cv, b, sd)
    tunic(cv, b, TBLUE, hem=15.0, trim=GOLD)
    b.hair_long(cv, HAIR_BROWN, 4)
    cv.shape(b.neck_pts(1.15), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_BROWN, long=0, tache=HAIR_BROWN,
           helmet=lambda cv, b: spangenhelm(cv, b, horns=HORN, nasal=False), look=-1.0)
    spear(cv, sb, st, mat=WOOD, head=IRON, w=2.0, head_len=11, head_w=4.6)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .55, .9), TBLUE, sh=.8, lw=.6)
    fist(cv, b, 'F')
    round_shield(cv, (76, 86), 16, 19, TBLUE2, rim=IRON, boss=IRON, paint=blue_paint)
    return cv, (18, 8, 100, 130)


def scout_t():
    cv = Canvas()
    ground(cv, 58, 36, ((22, 1.0, False), (98, .9, True)), stone=(84, 129, 16, 7))
    CLOAK = Mat("#5a6a3a", sh="#3a4826", hl="#8a9a62", line="#18110c")
    b = Body(pelvis=(60, 88), ground=128, lean=24, legF=(70, -10), legN=(30, -30), footF=-4, footN=-26,
             tilt=-20, shw=1.15)
    b.reach('F', b.H.p(-5.0, -6.6), bend=1)
    b.reach('N', b.T.p(-6, 4), bend=-1)
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=TBROWN, wraps=WRAP)
    cape(cv, b, CLOAK, [(-10, -32), (8, -34), (18, -24), (22, -8), (24, 10), C(22, 18), (10, 14), (0, 18),
                        C(-12, 14), (-14, -6)], sh=2.4)
    tunic(cv, b, TBROWN, hem=10.0)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_DARK, long=0, tache=HAIR_DARK, look=-1.0, smile=False,
           helmet=lambda cv, b: hood(cv, b, CLOAK))
    # dagger in the near hand
    dd = norm((-1, .25))
    sword(cv, b.hand_c('N'), dd, part="hilt", s=.7, guard=IRON)
    cv.shape(b.arm_pts('N'), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('N', .55, .9), CLOAK, sh=.8, lw=.6)
    fist(cv, b, 'N')
    sword(cv, b.hand_c('N'), dd, blade=11, w=2.8, part="blade", s=.7, guard=IRON)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('F', .55, .9), CLOAK, sh=.8, lw=.6)
    open_hand(cv, b, 'F', mirror=True)
    return cv, (14, 28, 104, 130)


def paladin():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=WHITEH, mane=Mat("#d8d0c0", sh="#a8a090", hl="#ffffff", line="#18110c"),
               legs=WHITEH, stride=1.0)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, TBLUE, trim=GOLD)
    b = seat(A, s=.72, armN=(14, 72))
    lance_b, lance_t = b.T.p(22, 2), b.T.p(-74, -58)
    b.reach('F', lerp(lance_b, lance_t, .28), bend=1)
    cape(cv, b, TBLUE2, [(-6, -30), (10, -30), (20, -22), (30, -6), C(34, 6), (22, 4), C(12, 8), (8, -10)])
    trouser_leg(cv, b, 'N', wraps=None)
    tunic(cv, b, MAIL, hem=10, belt=DLEATHER)
    mail_rows(cv, b, MAIL.sh, y0=-26, y1=6, step=5)
    cv.shape(b.tw([(-6, -30), (6, -30), (8, 8), C(4, 12), (-4, 12), C(-8, 8)], 1.0), TBLUE, sh=1.0, lw=.6)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, tache=HAIR_BLOND, tache_size=.8, helmet=spangenhelm, smile=False)
    spear(cv, lance_b, lance_t, mat=WOOD, head=IRON, w=2.0, head_len=10, head_w=3.8)
    pn = lerp(lance_b, lance_t, .84)
    cv.shape([pn, lerp(lance_b, lance_t, .96), add(lerp(lance_b, lance_t, .92), (11, 5)), add(pn, (8, 7))],
             TBLUE2, sh=.5, lw=.55)
    cv.shape(b.arm_pts('F'), MAIL, sh=.8)
    fist(cv, b, 'F')
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), MAIL, sh=.8)
    fist(cv, b, 'N')
    round_shield(cv, b.T.p(8, -4), 10, 13, TBLUE2, rim=IRON, boss=GOLD, paint=cross_paint)
    return cv, (4, 10, 116, 130)


def teutonic_knight():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=BLACKH, mane=BLACKH, legs=BLACKH, stride=.8)
    A = hz.draw(cv, cloth=lambda cv, h: h.caparison(cv, TBLUE, trim=WHITE, dots=WHITE))
    hz.chanfron(cv, IRON)
    b = seat(A, s=.74, armN=(14, 72))
    b.reach('F', b.T.p(-18, -46), bend=1)
    cape(cv, b, WHITE, [(-6, -30), (10, -30), (22, -22), (34, -8), C(40, 4), (26, 2), C(14, 8), (8, -10)])
    trouser_leg(cv, b, 'N', mat=MAIL, wraps=None, boot=IRON)
    tunic(cv, b, MAIL, hem=10, belt=DLEATHER)
    mail_rows(cv, b, MAIL.sh, y0=-26, y1=6, step=5)
    cv.shape(b.tw([(-7, -30), (7, -30), (9, 10), C(4, 13), (-4, 13), C(-9, 10)], 1.0), WHITE, sh=1.0, lw=.6)
    cv.shape(b.tw([C(-1.4, -24), C(1.4, -24), C(1.4, 2), C(-1.4, 2)], 1.0), TBLUE, sh=0, lw=.4)
    cv.shape(b.tw([C(-6, -14), C(6, -14), C(6, -11), C(-6, -11)], 1.0), TBLUE, sh=0, lw=.4)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    # raised battle axe (far arm behind the head)
    h = b.hand_c('F')
    dd = norm((-.25, -.97))
    cv.rod(sub(h, mul(dd, 8)), add(h, mul(dd, 26)), 2.2, WOOD)
    axe_head(cv, add(h, mul(dd, 23)), dd, IRON, size=1.2)
    cv.shape(b.arm_pts('F'), MAIL, sh=.8)
    fist(cv, b, 'F')
    b.head(cv, beard=HAIR_BLOND, tache=HAIR_BLOND, helmet=lambda cv, b: spangenhelm(cv, b, wings=WING), angry=True)
    hz.bridle(cv, DLEATHER, IRON, hand=b.hand_c('N'))
    cv.shape(b.arm_pts('N'), MAIL, sh=.8)
    fist(cv, b, 'N')
    return cv, (4, 4, 116, 130)


def ram_t():
    from siege import wheel, beam, grain
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    wheel(cv, (42, 111), 10, far=True)
    wheel(cv, (92, 111), 10, far=True)
    # far A-frame
    beam(cv, (40, 104), (58, 58), 4, far=True)
    beam(cv, (78, 104), (60, 58), 4, far=True)
    # log hanging from chains
    log = [(12, 88), (106, 84)]
    cv.shape(limb(log, [6.4, 7.0]), WOOD, sh=1.4, lw=.75)
    grain(cv, (24, 88), (100, 85), 2)
    for x in (40, 80):
        cv.stroke([(x - 2, 60), (x - 1, 82)], "#5a5a62", w=1.6)
    cv.shape(ell_pts((106, 84), 3.2, 7, n=8), Mat("#d8b070", sh="#a88040", hl="#f0d8a0", line="#18110c"), sh=.4,
             lw=.6)
    # iron cap with spikes
    cv.shape([C(20, 79), (12, 78), (5, 82), C(2, 87), (5, 92), (12, 96), C(20, 96)], IRON, sh=1.0, lw=.7)
    for (x, y) in ((8, 79), (4, 86), (8, 94)):
        cv.shape([(x + 2, y - 1), (x - 3, y), (x + 2, y + 1.6)], IRON, sh=0, lw=.5)
    cv.stroke([(16, 79), (16, 96)], IRON.sh, w=.8)
    # near A-frame + chassis
    beam(cv, (56, 60), (64, 60), 3.4)
    beam(cv, (34, 108), (58, 56), 4.6)
    beam(cv, (84, 108), (62, 56), 4.6)
    beam(cv, (16, 108), (110, 108), 5.6)
    grain(cv, (20, 108), (106, 108), 1)
    cv.shape(ell_pts((60, 56), 3, 3, n=6), IRON, sh=.3, lw=.5)
    wheel(cv, (34, 115), 11)
    wheel(cv, (86, 115), 11)
    return cv, (0, 50, 112, 127)


def catapult_t():
    from siege import wheel, beam, grain, boulder
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    # far frame
    beam(cv, (50, 108), (56, 46), 4.4, far=True)
    beam(cv, (16, 108), (104, 108), 5, far=True)
    # arm with spoon (resting forward/up) and counter rope
    piv = (58, 92)
    tip = (100, 58)
    beam(cv, (34, 104), tip, 4.6, DWOOD)
    cv.shape([(92, 52), (108, 50), C(110, 56), (104, 63), (94, 63), C(90, 58)], DWOOD, sh=.8, lw=.7)
    boulder(cv, (100, 50), 7.5)
    # tall A-frame front with crossbar
    beam(cv, (30, 110), (44, 44), 5)
    beam(cv, (70, 110), (48, 44), 5)
    beam(cv, (36, 46), (62, 46), 4.4)
    cv.shape([(38, 40), (56, 40), (58, 46), (36, 46)], Mat("#e8c878", sh="#b8944a", hl="#fff0b8", line="#18110c"),
             sh=.6, lw=.6)
    beam(cv, (10, 112), (110, 112), 6)
    grain(cv, (14, 112), (106, 112), 1)
    # winch
    cv.shape(ell_pts((86, 104), 5, 5, n=8), WOOD, sh=.6, lw=.6)
    cv.stroke([(86, 104), (93, 98)], DWOOD.base, w=1.8)
    cv.stroke([(86, 104), (72, 84)], ROPE.base, w=1.3)
    for x in (22, 98):
        cv.shape(ell_pts((x, 116), 6, 6, n=8), WOOD, sh=.6, lw=.6)
        cv.shape(ell_pts((x, 116), 2, 2, n=6), IRON, sh=0, lw=.4)
    return cv, (6, 40, 114, 126)


def chief_t():
    cv = Canvas()
    ground(cv, tufts=((24, 1.0, False), (98, .9, True)))
    b = Body(pelvis=(60, 75), ground=128, lean=-2, legF=(12, 2), legN=(-10, -6), footF=-2, footN=-10, tilt=-4,
             shw=1.3, arm_bulk=1.5)
    pole_b, pole_t = (32, 126), (36, 4)
    b.reach('F', lerp(pole_b, pole_t, .5), bend=1)
    b.reach('N', b.T.p(9, -2), bend=-1)
    cape(cv, b, FUR, [(-14, -32), (14, -32), (20, -10), (22, 14), C(20, 22), (6, 20), (-8, 22), C(-18, 22),
                      (-18, 0)])
    for sd in 'FN':
        trouser_leg(cv, b, sd, wraps=WRAP)
    tunic(cv, b, TBLUE, hem=15.0, trim=GOLD, buckle=GOLD)
    cv.shape(b.neck_pts(1.3), SKIN, sh=1.0, lw=.6)
    b.head(cv, beard=HAIR_GREY, long=5, tache=HAIR_GREY, nose=1.25,
           helmet=lambda cv, b: spangenhelm(cv, b, mat=STEEL, band=GOLD, wings=WING, nasal=False))
    fur_mantle(cv, b, FUR)
    cv.stroke(b.tw([(-6.0, -31.0), (-1.0, -28.6), (4.0, -31.0)]), GOLD.base, w=1.8)
    # banner pole with a blue flag
    cv.rod(pole_b, pole_t, 2.2, DWOOD)
    cv.shape([pole_t, (pole_t[0] + 3, pole_t[1] - 1.4), (pole_t[0] + 6, pole_t[1] + 1.6)], GOLD, sh=0, lw=.5)
    fl = [(35, 8), (10, 10), (14, 20), (8, 30), C(35, 30)]
    cv.shape(fl, TBLUE, sh=1.0, lw=.7)
    cv.shape([(18, 14), (24, 13), (28, 16), (26, 24), (20, 25), (17, 20)], WHITE, sh=0, lw=.5)
    cv.shape([(17, 14), (14, 10), (18, 12)], HORN, sh=0, lw=.4)
    cv.shape([(27, 15), (31, 11), (28, 14)], HORN, sh=0, lw=.4)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .55, .9), TBLUE, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .5, .6), GOLD, sh=.4, lw=.5)
    fist(cv, b, 'F')
    cv.shape(b.arm_pts('N'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('N', .55, .9), TBLUE, sh=.8, lw=.6)
    cv.shape(b.fore_pts('N', .5, .6), GOLD, sh=.4, lw=.5)
    fist(cv, b, 'N')
    return cv, (16, 4, 104, 130)


def settler_t():
    cv = Canvas()
    ground(cv)
    DRESS = Mat("#5f86c4", sh="#3e5f98", hl="#94b6e6", line="#18110c")
    APRON = Mat("#f0e6cc", sh="#c8b890", hl="#ffffff", line="#18110c")
    b = Body(pelvis=(60, 75), ground=128, lean=6, legF=(20, 4), legN=(-12, -10), footF=-4, footN=-14, tilt=-6,
             shw=1.05, arm_bulk=1.2)
    stick_a = b.T.p(30, -36)
    b.reach('F', b.T.p(-12, -22), bend=1)
    for sd in 'FN':
        cv.shape(b.leg_pts(sd, .8), SKIN, sh=1.2)
        cv.shape(b.foot_pts(sd, "boot"), LEATHER, sh=.8, lw=.6)
    # bundle on a stick over the shoulder
    bc = add(stick_a, (2, 8))
    cv.shape([add(bc, (-8, -6)), add(bc, (0, -11)), add(bc, (9, -6)), add(bc, (10, 5)), add(bc, (0, 10)),
              add(bc, (-9, 5))], Mat("#d8c08a", sh="#a88e5a", hl="#f0dcae", line="#18110c"), sh=2.0, lw=.7)
    for dx in (-5, 0, 5):
        cv.stroke([add(bc, (dx, -8)), add(bc, (dx + 1, 8))], "#5f86c4", w=1.4, detail=True)
    cv.shape([add(bc, (-2, -11)), add(bc, (-5, -15)), add(bc, (0, -13)), add(bc, (4, -16)), add(bc, (2, -10))],
             Mat("#d8c08a", sh="#a88e5a", hl="#f0dcae", line="#18110c"), sh=.3, lw=.5)
    long_robe(cv, b, DRESS, hem=44, flare=1.1, belt=APRON)
    cv.shape(b.tw([(-9, -4), (8, -4), (10, 30), C(4, 36), (-6, 36), C(-11, 30)], 1.0), APRON, sh=1.2, lw=.6)
    b.hair_long(cv, HAIR_BLOND, 2)
    cv.shape(b.neck_pts(.95), SKIN, sh=1.0, lw=.6)
    cv.rod(b.T.p(-16, -21), stick_a, 2.0, WOOD)
    b.head(cv, hair=HAIR_BLOND, smile=True, nose=.75, look=-1.0)
    lashes(cv, b)
    braid(cv, b, HAIR_BLOND, 1, 14)
    cv.shape(b.H.pts([(-6.6, -6.0), (-2.0, -9.6), (4.0, -10.2), (8.6, -7.0), (9.0, -4.0), (4.0, -6.6),
                      (-2.0, -6.6)]), Mat("#e85a4a", sh="#b03a2c", hl="#ff9a88", line="#18110c"), sh=.6, lw=.6)
    cv.shape(b.arm_pts('F', .85), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('F', .6, .9), DRESS, sh=.8, lw=.6)
    fist(cv, b, 'F')
    cv.shape(b.arm_pts('N', .85), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('N', .6, .9), DRESS, sh=.8, lw=.6)
    fist(cv, b, 'N')
    return cv, (16, 16, 104, 130)


UNITS = {
    1: clubswinger,
    2: spearman,
    3: axeman,
    4: scout_t,
    5: paladin,
    6: teutonic_knight,
    7: ram_t,
    8: catapult_t,
    9: chief_t,
    10: settler_t,
}
