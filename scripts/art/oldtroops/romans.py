"""Roman units."""
from lib import *
from human import *
from gear import *
from horse import *
from costume import *
import math

TUNIC = RRED
CREST = Mat("#c8392b", sh="#8e2219", hl="#ee7a5a", line="#4e1110")
SANDAL = LEATHER


def galea(cv, b, crest=CREST, crest_kind="long", metal=STEEL, trim=BRONZE, plume=None, cheek=True):
    H = b.H
    if crest_kind == "long":
        cv.shape(H.pts([(-4.4, -10.6), (-4.0, -15.4), (-.6, -18.4), (4.2, -18.6), (8.8, -15.8), (11.0, -11.0),
                        (9.6, -7.8), (6.4, -10.4), (1.4, -12.0)]), crest, sh=1.2, lw=.6)
        for x in (-2.0, 1.2, 4.4, 7.4):
            cv.stroke(H.pts([(x, -12.2), (x + 1.0, -16.6)]), crest.sh, w=.6, detail=True)
    elif crest_kind == "trans":
        cv.shape(H.pts([(-2.0, -11.0), (-7.0, -14.6), (-6.0, -19.0), (.6, -21.0), (6.6, -19.0), (7.6, -14.6),
                        (3.4, -11.0)]), crest, sh=1.2, lw=.6)
    cv.shape(H.pts([C(-7.4, -5.4), (-7.0, -8.4), (-4.0, -11.0), (1.0, -12.0), (6.0, -10.6), (8.6, -6.8),
                    (9.0, -2.6), C(11.8, .4), (11.2, 1.8), C(7.4, 1.0), (6.4, -1.8), (3.0, -4.6)]), metal, sh=1.3,
             lw=.7)
    cv.shape(H.pts([C(-7.8, -5.0), (-4.0, -6.4), (0.0, -6.4), C(3.6, -5.2), C(3.8, -4.0), (0, -4.8), (-4.0, -4.8),
                    C(-7.6, -3.8)]), trim, sh=.3, lw=.45)
    cv.stroke(H.pts([(6.8, -2.6), (8.8, -1.4), (11.2, .8)]), metal.sh, w=.6, detail=True)
    cv.dot(H.p(-2.4, -8.6), .8 * b.H.s / 1.45, metal.hl)
    if cheek:
        cv.shape(H.pts([C(1.8, -4.4), (5.2, -4.0), (5.6, 0.0), (4.4, 4.6), (1.8, 6.2), (.6, 4.2), (1.0, 0.0)]),
                 metal, sh=.8, lw=.6)
        cv.dot(H.p(3.0, 1.0), .6 * b.H.s / 1.45, trim.base)
    if plume:
        cv.shape(H.pts([(6.8, -10.6), (5.0, -16.0), (7.6, -21.6), (9.6, -16.6), (8.8, -11.0)]), plume, sh=.8, lw=.5)


def scutum(cv, x0, y0, w, h, face=RRED, emblem=GOLD, rim=BRONZE):
    x1, y1 = x0 + w, y0 + h
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    bow = 3.0
    # thickness strip on the left (front) edge
    cv.shape([C(x0 - 2.6, y0 + 1.2), C(x0, y0), (x0 - .4, cy), C(x0, y1), C(x0 - 2.6, y1 - 1.2),
              (x0 - 3.0, cy)], DWOOD, sh=.4, lw=.6)
    face_pts = [C(x0, y0), (cx, y0 - bow), C(x1, y0 + 1.2), (x1 + 1.2, cy), C(x1, y1 - 1.0), (cx, y1 + bow * .7),
                C(x0, y1), (x0 - .4, cy)]
    cv.shape(face_pts, rim, sh=.8, lw=.75)
    inset = [C(x0 + 1.6, y0 + 1.5), (cx, y0 - bow + 1.6), C(x1 - 1.6, y0 + 2.6), (x1 - .6, cy),
             C(x1 - 1.6, y1 - 2.4), (cx, y1 + bow * .7 - 1.6), C(x0 + 1.6, y1 - 1.5), (x0 + 1.2, cy)]
    cv.shape(inset, face, sh=3.0, lw=.4)
    # emblem: wings + bolts around a boss
    for sgn in (-1, 1):
        cv.shape([(cx + sgn * 3.0, cy - 1.2), (cx + sgn * 7.6, cy - 6.6), (cx + sgn * 10.4, cy - 7.4),
                  (cx + sgn * 8.8, cy - 4.0), (cx + sgn * 10.0, cy - 2.6), (cx + sgn * 6.4, cy - .2),
                  (cx + sgn * 3.0, cy + 1.6)], emblem, sh=.4, lw=.4)
        cv.shape([C(cx - .8, cy + sgn * 5.0), C(cx + 2.4, cy + sgn * 11.4), C(cx + .4, cy + sgn * 11.0),
                  C(cx + 1.6, cy + sgn * 17.6), C(cx - 2.2, cy + sgn * 9.6), C(cx - .2, cy + sgn * 10.0),
                  C(cx - 2.0, cy + sgn * 5.0)], emblem, sh=.3, lw=.4)
    cv.shape(ell_pts((cx, cy), 4.6, 5.4, n=10), rim, sh=1.0, lw=.6)
    cv.dot((cx - 1.3, cy - 1.6), 1.0, rim.hl)
    cv.stroke([(x0 + 1.2, y0 + 4), (x0 + .9, y1 - 4)], face.hl, w=.7, detail=True, op=.6)


def legionnaire():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(58, 74), ground=128, s=1.0, lean=-1, legF=(19, 5), legN=(2, -5), armF=(26, 52), armN=(-2, 22),
             footF=-3, footN=-8, footN_len=.8, tilt=3)
    # far leg + foot
    cv.shape(b.leg_pts('F'), SKIN, sh=1.6)
    sandal(cv, b, 'F')
    cv.shape(b.leg_pts('N'), SKIN, sh=1.6)
    sandal(cv, b, 'N')
    skirt(cv, b)
    lorica(cv, b)
    belt_apron(cv, b)
    # head
    cv.shape(b.neck_pts(), SKIN, sh=1.0, lw=.6)
    b.head(cv, helmet=galea, tache=HAIR_BROWN, tache_size=.3)
    # sword arm (far): sleeve under the shoulder plates
    sd = (-.97, -.12)
    sword(cv, b.hand_c('F'), sd, part="hilt")
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), TUNIC, sh=.8, lw=.6)
    shoulder_plates(cv, b, 'F')
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd, blade=21, w=3.4, part="blade")
    # shield arm (near)
    shoulder_plates(cv, b, 'N')
    scutum(cv, 66, 59, 25, 55)
    return cv, (18, 22, 96, 130)


def wreath_paint(cv, c, rx, ry):
    ring = ell_pts(c, rx * .62, ry * .62, n=12)
    cv.stroke(ring + [ring[0]], GOLD.base, w=1.4)
    for k in range(10):
        a = k * 36
        p = (c[0] + math.cos(math.radians(a)) * rx * .62, c[1] + math.sin(math.radians(a)) * ry * .62)
        cv.shape(ell_pts(p, 1.8, 1.0, ang=a + 90, n=6), GOLD, sh=0, lw=.35, detail=True)
    for a in (0, 90, 180, 270):
        p = (c[0] + math.cos(math.radians(a)) * rx * .4, c[1] + math.sin(math.radians(a)) * ry * .4)
        cv.shape([lerp(c, p, .4), add(p, (0, 0)), lerp(c, p, .4)], GOLD, sh=0, lw=.4, detail=True)


def praetorian():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 74), ground=128, lean=0, legF=(9, 2), legN=(-7, -4), footF=-2, footN=-8, shw=1.2)
    sb, st = (33, 127), (40, 16)
    grip = lerp(sb, st, .55)
    b.reach('F', grip, bend=1)
    cape(cv, b, RPURP, [(-12, -30), (13, -30), (18, -10), (20, 14), C(17, 22), (8, 19), (-6, 21), C(-15, 22),
                        (-15, 0)])
    for sd in 'FN':
        cv.shape(b.leg_pts(sd), SKIN, sh=1.4)
        sandal(cv, b, sd)
        greave(cv, b, sd)
    skirt(cv, b, hem=12.5)
    pteruges(cv, b, trim=GOLD)
    muscle_cuirass(cv, b, BRONZE)
    cv.shape(b.neck_pts(1.1), SKIN, sh=1.0, lw=.6)
    b.head(cv, helmet=lambda cv, b: galea(cv, b, crest_kind="trans", metal=BRONZE, trim=GOLD), smile=False)
    spear(cv, sb, st, mat=DWOOD, head=STEEL, w=2.0, head_len=11, head_w=4.4)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .4, .8), RRED, sh=.8, lw=.6)
    fist(cv, b, 'F')
    round_shield(cv, (77, 88), 15, 25, RRED, rim=GOLD, boss=GOLD, paint=wreath_paint)
    return cv, (18, 14, 100, 130)


def imperian():
    cv = Canvas()
    ground(cv, 62, 36, ((26, 1.0, False), (100, .9, True)))
    b = Body(pelvis=(62, 74), ground=128, lean=8, legF=(34, 8), legN=(-22, -12), footF=-6, footN=-22,
             footN_len=.9, tilt=-6, shw=1.15)
    b.reach('F', (54, 20), bend=1)
    cape(cv, b, RRED, [(2, -31), (12, -30), (24, -24), (36, -12), C(42, -2), (32, -5), (26, 2), C(18, -2),
                       (10, -12)])
    for sd in 'FN':
        cv.shape(b.leg_pts(sd), SKIN, sh=1.4)
        sandal(cv, b, sd)
    skirt(cv, b, hem=13)
    lorica(cv, b)
    belt_apron(cv, b)
    sd_ = norm((.5, -.86))
    sword(cv, b.hand_c('F'), sd_, part="hilt")
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), RRED, sh=.8, lw=.6)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=22, w=3.6, part="blade")
    shoulder_plates(cv, b, 'F')
    cv.shape(b.neck_pts(), SKIN, sh=1.0, lw=.6)
    b.head(cv, helmet=lambda cv, b: galea(cv, b, plume=GOLD), angry=True, open_mouth=True, mouth=False)
    shoulder_plates(cv, b, 'N')
    scutum(cv, 60, 62, 23, 48)
    return cv, (14, 6, 112, 130)


def equites_legati():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((14, .9, False), (106, .8, True)))
    hz = Horse(x=52, y=128, H=58, coat=CHESTNUT, mane=Mat("#e8c890", sh="#b89458", hl="#fff0c8", line="#18110c"),
               stride=0.0, sock=WHITEH)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, Mat("#e8d8a8", sh="#bca870", hl="#fff8dc", line="#18110c"), trim=RRED)
    b = seat(A, s=.72, lean=-2, armF=(30, 80), tilt=-4)
    b.reach('N', b.H.p(-4.4, -5.4), bend=1)
    cape(cv, b, RRED, [(-6, -31), (10, -31), (20, -22), (26, -6), C(30, 6), (20, 2), C(12, 8), (8, -10)])
    skirt(cv, b, LINEN, hem=10)
    cv.shape(b.leg_pts('N'), SKIN, sh=1.0)
    sandal(cv, b, 'N')
    tunic(cv, b, LINEN, hem=6, belt=DLEATHER, buckle=GOLD)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, helmet=lambda cv, b: petasos(cv, b, LEATHER, RRED), look=-1.0, smile=False)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    fist(cv, b, 'F')
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('F'))
    cv.shape(b.arm_pts('N'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('N', .4, .6), LINEN, sh=.6, lw=.5)
    open_hand(cv, b, 'N', mirror=True)
    return cv, (4, 14, 116, 130)


def equites_imperatoris():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((14, .9, False), (106, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=BAY, mane=BLACKH, legs=BLACKH, stride=1.0)
    A = hz.draw(cv)
    hz.saddle_cloth(cv, RRED, trim=GOLD)
    b = seat(A, s=.72, armF=(100, 128), armN=(14, 72))
    cape(cv, b, RRED, [(-6, -30), (10, -30), (20, -24), (34, -8), (46, 4), C(48, 10), (36, 8), (26, 6),
                       C(18, 9), (12, 0), (8, -12)])
    skirt(cv, b, hem=10)
    cv.shape(b.leg_pts('N'), SKIN, sh=1.0)
    sandal(cv, b, 'N')
    lorica(cv, b)
    belt_apron(cv, b, straps=3)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, helmet=galea, smile=True)
    cv.shape(b.arm_pts('N'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('N', .45, .6), RRED, sh=.6, lw=.5)
    shoulder_plates(cv, b, 'N')
    fist(cv, b, 'N')
    hz.bridle(cv, DLEATHER, GOLD, hand=b.hand_c('N'))
    sd = norm((-.5, -.86))
    sword(cv, b.hand_c('F'), sd, part="hilt", s=.8)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    cv.shape(b.upper_arm_pts('F', .45, .6), RRED, sh=.6, lw=.5)
    shoulder_plates(cv, b, 'F')
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd, blade=26, w=3.2, part="blade", s=.8)
    return cv, (6, 18, 116, 130)


def equites_caesaris():
    cv = Canvas()
    cv.cull = 3.4
    ground(cv, 58, 44, ((12, .9, False), (108, .8, True)))
    hz = Horse(x=54, y=128, H=56, coat=DAPPLE, mane=Mat("#e8e8e8", sh="#b8b8b8", hl="#ffffff", line="#18110c"),
               legs=DAPPLE, stride=.7)
    A = hz.draw(cv, cloth=lambda cv, h: h.caparison(cv, RRED, trim=GOLD, dots=GOLD))
    hz.chanfron(cv, STEEL)
    b = seat(A, s=.72, armF=(40, 92), armN=(10, 60))
    lance_b, lance_t = b.T.p(24, 2), b.T.p(-58, -74)
    grip = lerp(lance_b, lance_t, .26)
    b.reach('F', grip, bend=1)
    cape(cv, b, RPURP, [(-6, -30), (10, -30), (20, -24), (32, -10), (40, 2), C(42, 8), (30, 6), C(18, 8), (10, -10)])
    skirt(cv, b, hem=10)
    cv.shape(b.leg_pts('N'), SKIN, sh=1.0)
    sandal(cv, b, 'N')
    greave(cv, b, 'N', STEEL)
    lorica(cv, b, metal=STEEL)
    pteruges(cv, b, trim=GOLD, n=5, length=8)
    cv.shape(b.neck_pts(), SKIN, sh=.6, lw=.5)
    b.head(cv, helmet=lambda cv, b: galea(cv, b, crest=Mat("#f4f0e0", sh="#c8c0a8", hl="#ffffff", line="#18110c"),
                                          metal=GOLD, trim=RRED, plume=RRED), smile=False, tache=HAIR_DARK,
           tache_size=.3)
    # lance with pennant
    spear(cv, lance_b, lance_t, mat=WOOD, head=STEEL, w=2.0, head_len=10, head_w=3.6)
    pn = lerp(lance_b, lance_t, .86)
    cv.shape([pn, lerp(lance_b, lance_t, .97), add(lerp(lance_b, lance_t, .93), (9, 4)), add(pn, (12, 2)),
              add(pn, (6, 6))], RRED, sh=.5, lw=.55)
    cv.shape(b.arm_pts('F'), SKIN, sh=.8)
    shoulder_plates(cv, b, 'F')
    fist(cv, b, 'F')
    shoulder_plates(cv, b, 'N')
    hz.bridle(cv, DLEATHER, GOLD, hand=None)
    round_shield(cv, b.T.p(4, -6), 9.5, 12.5, RRED, rim=GOLD, boss=GOLD, paint=wreath_paint)
    return cv, (4, 10, 116, 130)


def battering_ram():
    from siege import wheel, beam, grain, HIDE, rope_coil
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    # far wheels
    wheel(cv, (44, 110), 11, far=True)
    wheel(cv, (96, 110), 11, far=True)
    # back posts (far)
    beam(cv, (34, 108), (38, 66), 4.4, far=True)
    beam(cv, (96, 108), (92, 66), 4.4, far=True)
    # ram log hanging
    log = [(10, 92), (100, 92)]
    cv.shape(limb(log, [5.4, 5.4]), DWOOD, sh=1.2, lw=.75)
    grain(cv, (20, 92), (96, 92), 2, color=DWOOD.sh)
    for x in (40, 76):
        cv.stroke([(x, 64), (x, 88)], ROPE.base, w=1.6)
        cv.stroke([(x - 2, 64), (x - 2, 88)], ROPE.sh, w=.6, detail=True)
    # bronze ram head
    cv.shape([(20, 84), (12, 82), (5, 85), (1.4, 89), C(.6, 93), (3, 98), (9, 100.5), (20, 100)], BRONZE, sh=1.2,
             lw=.75)
    # curled horn
    cv.shape([(14, 84), (13, 77), (18, 73), (24, 75), (25, 81), (22, 86), (18, 86), (17, 82), (20, 80), (19, 78),
              (16, 79), (17, 85)], GOLD, sh=.8, lw=.65)
    cv.shape(ell_pts((7.6, 88.6), 1.7, 1.4, n=6), Mat("#ffffff", sh="#ddd", hl="#fff", line="#18110c"), sh=0, lw=.4)
    cv.dot((7.0, 88.8), .8, "#18110c")
    cv.stroke([(2.4, 95.4), (6.0, 96.0)], "#18110c", w=.8)
    cv.dot((2.4, 92.0), .7, "#18110c")
    # roof with hides
    roof = [C(24, 70), (36, 44), C(40, 38), (64, 34), (88, 38), C(92, 44), (104, 70)]
    cv.shape(roof, HIDE, sh=2.4, lw=.8)
    for x0, x1 in ((48, 42), (64, 64), (80, 86)):
        cv.stroke([(x0, 42), (x1, 68)], HIDE.sh, w=.9)
    for x, y in ((44, 52), (60, 50), (76, 56), (88, 50), (52, 62), (70, 62)):
        cv.stroke([(x - 3, y), (x + 3, y)], "#f0d8b0", w=.7, detail=True)
        cv.stroke([(x - 2, y - 1.4), (x - 2, y + 1.4), ], "#f0d8b0", w=.5, detail=True)
    beam(cv, (22, 70), (106, 70), 4.0, WOOD)
    beam(cv, (38, 39), (64, 35), 3.2, WOOD)
    beam(cv, (64, 35), (90, 39), 3.2, WOOD)
    # near posts + chassis
    beam(cv, (28, 108), (30, 70), 4.8)
    beam(cv, (100, 108), (98, 70), 4.8)
    beam(cv, (18, 106), (110, 106), 5.6)
    grain(cv, (22, 106), (106, 106), 1)
    beam(cv, (28, 88), (100, 88), 2.4, DWOOD)
    wheel(cv, (36, 114), 12)
    wheel(cv, (92, 114), 12)
    return cv, (0, 36, 112, 127)


def fire_catapult():
    from siege import wheel, beam, grain, flame, rope_coil
    cv = Canvas()
    cv.ground(60, 126, 50, 5)
    wheel(cv, (36, 112), 9.5, far=True)
    wheel(cv, (90, 112), 9.5, far=True)
    beam(cv, (16, 108), (104, 108), 5, far=True)
    beam(cv, (36, 106), (36, 62), 4.4, far=True)
    # stop frame at the front with a straw pad
    beam(cv, (26, 106), (32, 60), 4.8)
    beam(cv, (46, 106), (34, 66), 3.6)
    cv.shape([(26, 56), (42, 56), (43, 64), (26, 64)], Mat("#e8c878", sh="#b8944a", hl="#fff0b8", line="#18110c"),
             sh=.8, lw=.7)
    for x in (30, 34, 38):
        cv.stroke([(x, 57), (x + 1, 63)], "#b8944a", w=.6, detail=True)
    # throwing arm, cocked back, pivoting at the torsion bundle
    piv = (56, 102)
    top = (98, 64)
    beam(cv, piv, top, 4.6, DWOOD)
    grain(cv, piv, top, 1, color=DWOOD.sh)
    cv.shape([(90, 58), (104, 56), C(106, 61), (101, 67), (92, 68), C(88, 63)], DWOOD, sh=.8, lw=.7)
    cv.shape(ell_pts((97, 54), 7, 6.4, n=10), Mat("#4a3020", sh="#2a1a10", hl="#7a5a40", line="#18110c"), sh=1.2,
             lw=.7)
    flame(cv, (97, 47), 1.5)
    # base + torsion bundle + winch
    beam(cv, (12, 112), (108, 112), 6)
    grain(cv, (16, 112), (104, 112), 1)
    cv.shape(ell_pts(piv, 6.4, 9, n=10), Mat("#c9a96a", sh="#9a7a44", hl="#ead39b", line="#18110c"), sh=1.4, lw=.7)
    for k in range(4):
        y = piv[1] - 6 + k * 4
        cv.stroke([(piv[0] - 6, y), (piv[0] + 6, y + 1.5)], "#8a6a34", w=.8, detail=True)
    beam(cv, (84, 112), (86, 96), 4)
    cv.shape(ell_pts((86, 95), 4.4, 4.4, n=8), WOOD, sh=.6, lw=.6)
    cv.stroke([(86, 95), (92, 90)], DWOOD.base, w=1.8)
    cv.stroke([(86, 95), (93, 75)], ROPE.base, w=1.2)
    wheel(cv, (30, 117), 10)
    wheel(cv, (84, 117), 10)
    return cv, (8, 26, 112, 127)


def senator():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 74), ground=128, lean=-3, legF=(6, 2), legN=(-5, -3), footF=-2, footN=-8, shw=1.15,
             tilt=-6)
    b.reach('F', (34, 34), bend=-1)
    b.reach('N', (66, 80), bend=-1)
    for sd in 'FN':
        cv.shape(b.foot_pts(sd, "sandal"), SKIN, sh=.6, lw=.6)
        sandal(cv, b, sd)
    long_robe(cv, b, WHITE, hem=48, flare=1.05, trim=RPURP)
    # toga drape over the near shoulder and across the chest
    cv.shape(b.tw([(-12.6, -24.0), (-6.0, -30.6), (2.0, -31.0), (12.6, -27.0), (14.0, -16.0), (13.0, 2.0),
                   (16.0, 22.0), C(10.0, 26.0), (6.0, 12.0), (2.0, -4.0), (-4.0, -12.0), (-10.0, -16.0)]),
             WHITE, sh=1.8, lw=.7)
    cv.stroke(b.tw([(-11.0, -22.0), (-2.0, -14.0), (6.0, -8.0), (10.0, 10.0), (12.0, 22.0)]), RPURP.base, w=2.2)
    for k in range(3):
        cv.stroke(b.tw([(-8.0 + k * 4, -22.0 + k * 2), (0.0 + k * 3, -12.0 + k * 3)]), WHITE.sh, w=.7, detail=True)
    cv.shape(b.neck_pts(1.05), SKIN, sh=1.0, lw=.6)
    b.head(cv, hair=None, open_mouth=True, mouth=False, look=-1.0, nose=1.15,
           helmet=lambda cv, b: (b.hair_short(cv, HAIR_GREY) if False else None, laurel(cv, b)))
    # grey fringe at the back
    H = b.H
    cv.shape(H.pts([(2.0, -4.4), (6.4, -6.0), (8.6, -2.0), (7.6, 2.6), (5.6, 1.0), (4.6, -2.0)]), HAIR_GREY, sh=.6,
             lw=.55)
    # raised hand (orating)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('F', .5, 1.0), WHITE, sh=.8, lw=.6)
    open_hand(cv, b, 'F')
    # scroll in the near hand
    sc = b.hand_c('N')
    cv.shape(band([add(sc, (-3, -9)), add(sc, (2, 7))], 4.4), Mat("#f2e2b0", sh="#c8b07a", hl="#fff8e0",
                                                                    line="#18110c"), sh=.6, lw=.6)
    cv.shape(b.arm_pts('N'), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('N', .5, 1.0), WHITE, sh=.8, lw=.6)
    fist(cv, b, 'N')
    return cv, (18, 20, 100, 130)


def settler_roman():
    cv = Canvas()
    ground(cv)
    b = Body(pelvis=(60, 75), ground=128, lean=10, legF=(26, 6), legN=(-16, -12), footF=-6, footN=-18, tilt=-8,
             shw=1.1)
    stick_t, stick_b = (34, 52), (28, 127)
    b.reach('F', lerp(stick_b, stick_t, .72), bend=1)
    sack_on_back(cv, b, size=1.15)
    for sd in 'FN':
        cv.shape(b.leg_pts(sd), SKIN, sh=1.3)
        sandal(cv, b, sd)
    tunic(cv, b, Mat("#c08a52", sh="#8e5e30", hl="#e6b682", line="#18110c"), hem=13, belt=DLEATHER, buckle=BRONZE)
    cv.shape(b.neck_pts(), SKIN, sh=1.0, lw=.6)
    straw = Mat("#f0cc6a", sh="#c49a3a", hl="#fff0b0", line="#18110c")
    b.head(cv, helmet=lambda cv, b: petasos(cv, b, straw, RRED), tache=HAIR_BROWN, tache_size=.5, look=-1.0)
    # pot hanging from the sack
    pc = b.T.p(24, -6)
    cv.shape(ell_pts(pc, 5, 4.4, n=8), BRONZE, sh=1.0, lw=.6)
    cv.stroke([add(pc, (-4, -3)), add(pc, (0, -7)), add(pc, (4, -3))], "#18110c", w=.7)
    beam_ = (stick_b, stick_t)
    cv.rod(stick_b, stick_t, 2.4, WOOD)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.0)
    cv.shape(b.upper_arm_pts('F', .45, .8), Mat("#c08a52", sh="#8e5e30", hl="#e6b682", line="#18110c"), sh=.6,
             lw=.5)
    fist(cv, b, 'F')
    cv.stroke(b.tw([(-9.0, -29.0), (-2.0, -18.0), (8.0, -8.0)]), DLEATHER.base, w=1.8)
    cv.shape(b.arm_pts('N'), SKIN, sh=1.0)
    fist(cv, b, 'N')
    return cv, (16, 20, 104, 130)


UNITS = {
    1: legionnaire,
    2: praetorian,
    3: imperian,
    4: equites_legati,
    5: equites_imperatoris,
    6: equites_caesaris,
    7: battering_ram,
    8: fire_catapult,
    9: senator,
    10: settler_roman,
}
