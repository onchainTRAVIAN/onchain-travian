"""Heroes: romans / teutons / gauls x 5 gear stages (1 plain -> 5 legendary)."""
import math
from lib import *
from human import *
from gear import *
from costume import *
from romans import galea, scutum, wreath_paint
from teutons import spangenhelm, HORN, WING, MAIL, blue_paint
from gauls import gaul_helmet, checked_leg, oval_shield, torc, CHECK, CHECK2, TUN, TUN_RED, CLOAK_B

WHITEC = Mat("#f8f6ee", sh="#c8c2b2", hl="#ffffff", line="#18110c")
GLOW = "#fff2a0"


def _pose(stage):
    """Shared heroic stance; stage 5 raises the weapon higher."""
    return Body(pelvis=(60, 75), ground=128, lean=4, legF=(24, 5), legN=(-14, -9), footF=-3, footN=-14,
                tilt=-2, shw=1.25, arm_bulk=1.5, leg_bulk=1.35)


def hero_roman(stage):
    cv = Canvas()
    ground(cv, 60, 34, ((22, 1.0, False), (100, .9, True)))
    b = _pose(stage)
    b.reach('F', (34, 46) if stage < 5 else (38, 30), bend=1)
    cloak = {1: None, 2: None, 3: RRED, 4: RRED, 5: RPURP}[stage]
    if cloak:
        cape(cv, b, cloak, [(-12, -31), (13, -31), (20, -12), (26, 12), C(24, 22), (8, 18), (-6, 21), C(-15, 22),
                            (-15, 0)])
    for sd in 'FN':
        cv.shape(b.leg_pts(sd), SKIN, sh=1.4)
        sandal(cv, b, sd)
        if stage >= 3:
            greave(cv, b, sd, GOLD if stage == 5 else STEEL)
    skirt(cv, b, RRED if stage < 5 else WHITEC, hem=13)
    if stage == 1:
        tunic(cv, b, RRED, hem=12, belt=DLEATHER, buckle=BRONZE)
    elif stage in (2, 3):
        lorica(cv, b)
        belt_apron(cv, b)
    else:
        muscle_cuirass(cv, b, STEEL if stage == 4 else GOLD, under=RRED)
        pteruges(cv, b, trim=GOLD)
    sd_ = norm((-.6, -.8))
    blade_m = GOLD if stage == 5 else STEEL
    sword(cv, b.hand_c('F'), sd_, part="hilt", guard=GOLD if stage > 2 else BRONZE)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), RRED, sh=.8, lw=.6)
    if stage >= 2:
        shoulder_plates(cv, b, 'F', GOLD if stage == 5 else STEEL)
    if stage >= 4:
        cv.shape(b.fore_pts('F', .45, .6), GOLD, sh=.4, lw=.5)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=24 + stage, w=3.6 + stage * .1, part="blade", mat=blade_m,
          guard=GOLD if stage > 2 else BRONZE, glow=GLOW if stage == 5 else None)
    cv.shape(b.neck_pts(1.15), SKIN, sh=1.0, lw=.6)
    if stage == 1:
        helm = lambda cv, b: galea(cv, b, crest_kind=None, metal=BRONZE, trim=BRONZE, cheek=False)
    elif stage == 2:
        helm = lambda cv, b: galea(cv, b)
    elif stage == 3:
        helm = lambda cv, b: galea(cv, b, plume=GOLD)
    elif stage == 4:
        helm = lambda cv, b: galea(cv, b, crest_kind="trans", trim=GOLD)
    else:
        helm = lambda cv, b: galea(cv, b, crest=WHITEC, crest_kind="trans", metal=GOLD, trim=RRED, plume=RRED)
    b.head(cv, helmet=helm, tache=HAIR_BROWN, tache_size=.4 + stage * .1, smile=True, look=-1.0)
    if stage >= 2:
        shoulder_plates(cv, b, 'N', GOLD if stage == 5 else STEEL)
    if stage == 1:
        round_shield(cv, (80, 86), 13, 16, RRED, rim=BRONZE, boss=BRONZE)
    elif stage < 5:
        scutum(cv, 68, 62, 24, 50, emblem=GOLD, rim=BRONZE if stage < 4 else GOLD)
    else:
        scutum(cv, 66, 60, 26, 54, face=RPURP, emblem=GOLD, rim=GOLD)
    return cv, (16, 8, 104, 130)


def hero_teuton(stage):
    cv = Canvas()
    ground(cv, 60, 34, ((22, 1.0, False), (100, .9, True)))
    b = _pose(stage)
    b.reach('F', (34, 46) if stage < 5 else (40, 28), bend=1)
    cloak = {1: None, 2: None, 3: TBLUE2, 4: TBLUE, 5: FURL}[stage]
    if cloak:
        cape(cv, b, cloak, [(-12, -31), (13, -31), (20, -12), (26, 12), C(24, 22), (8, 18), (-6, 21), C(-15, 22),
                            (-15, 0)])
    for sd in 'FN':
        trouser_leg(cv, b, sd, mat=TBROWN if stage < 4 else DIRON if stage == 4 else STEEL,
                    wraps=WRAP if stage < 4 else None, boot=LEATHER if stage < 4 else IRON if stage == 4 else GOLD)
    if stage == 1:
        tunic(cv, b, TBLUE, hem=14.0, belt=DLEATHER)
    else:
        tunic(cv, b, MAIL if stage < 5 else STEEL, hem=14.0, belt=DLEATHER if stage < 5 else GOLD, buckle=GOLD)
        if stage < 5:
            mail_rows(cv, b, MAIL.sh, y0=-26, y1=10, step=5)
        else:
            for y in (-20, -12, -4):
                cv.stroke(b.tw([(-11, y), (0, y + 1.6), (11, y)]), GOLD.base, w=1.2)
        if stage >= 4:
            cv.shape(b.tw([(-7, -30), (7, -30), (9, 12), C(4, 15), (-4, 15), C(-9, 12)], 1.0),
                     TBLUE, sh=1.0, lw=.6)
    if stage >= 3:
        fur_mantle(cv, b, FUR if stage < 5 else FURL)
    b.hair_long(cv, HAIR_BLOND, 5 + stage)
    cv.shape(b.neck_pts(1.2), SKIN, sh=1.0, lw=.6)
    if stage == 1:
        helm = lambda cv, b: b.hair_short(cv, HAIR_BLOND)
    elif stage == 2:
        helm = lambda cv, b: spangenhelm(cv, b, nasal=True)
    elif stage == 3:
        helm = lambda cv, b: spangenhelm(cv, b, horns=HORN, nasal=False)
    elif stage == 4:
        helm = lambda cv, b: spangenhelm(cv, b, mat=STEEL, wings=WING, nasal=True)
    else:
        helm = lambda cv, b: spangenhelm(cv, b, mat=GOLD, band=STEEL, wings=WING, nasal=False)
    # axe arm (far, raised in front)
    h = b.hand_c('F')
    dd = norm((-.35, -.94))
    hm = IRON if stage < 4 else STEEL if stage == 4 else GOLD
    cv.rod(sub(h, mul(dd, 10)), add(h, mul(dd, 24 + stage)), 2.4, WOOD if stage < 5 else DWOOD)
    axe_head(cv, add(h, mul(dd, 21 + stage)), dd, hm, size=1.0 + stage * .1, beard=stage < 4)
    if stage == 5:
        cv.shape(ell_pts(add(h, mul(dd, 26)), 1, 1, n=6), GOLD, sh=0, lw=.2, glow=GLOW)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), TBLUE if stage < 2 else MAIL, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .45, .6), DLEATHER if stage < 4 else GOLD, sh=.5, lw=.5)
    fist(cv, b, 'F')
    b.head(cv, beard=HAIR_BLOND, long=stage * .8, tache=HAIR_BLOND, helmet=helm, angry=stage >= 3)

    def wolf_paint(cv, c, rx, ry):
        cv.shape([(c[0] - rx * .5, c[1] - ry * .2), (c[0] - rx * .2, c[1] - ry * .6), (c[0] + rx * .1, c[1] - ry * .3),
                  (c[0] + rx * .5, c[1] - ry * .5), (c[0] + rx * .4, c[1] + ry * .1), (c[0], c[1] + ry * .5),
                  (c[0] - rx * .4, c[1] + ry * .1)], WHITE if stage < 5 else GOLD, sh=0, lw=.4)
    face = {1: WOOD, 2: TBLUE2, 3: TBLUE2, 4: TBLUE, 5: TBLUE}[stage]
    paint = None if stage == 1 else blue_paint if stage < 4 else wolf_paint
    round_shield(cv, (80, 86), 15, 18, face, rim=IRON if stage < 5 else GOLD, boss=IRON if stage < 4 else GOLD,
                 paint=paint)
    return cv, (16, 4, 104, 130)


def hero_gaul(stage):
    cv = Canvas()
    ground(cv, 60, 34, ((22, 1.0, False), (100, .9, True)))
    b = _pose(stage)
    b.reach('F', (34, 46) if stage < 5 else (38, 30), bend=1)
    cloak = {1: None, 2: None, 3: CLOAK_B, 4: CLOAK_B, 5: GGREEN}[stage]
    if cloak:
        cape(cv, b, cloak, [(-12, -31), (13, -31), (20, -12), (26, 12), C(24, 22), (8, 18), (-6, 21), C(-15, 22),
                            (-15, 0)])
    for sd in 'FN':
        checked_leg(cv, b, sd, CHECK2 if stage % 2 else CHECK)
        if stage >= 4:
            greave(cv, b, sd, BRONZE if stage == 4 else GOLD)
    if stage == 1:
        tunic(cv, b, TUN, hem=13.0, buckle=BRONZE)
    elif stage in (2, 3):
        tunic(cv, b, MAIL, hem=13.0, buckle=GOLD)
        mail_rows(cv, b, MAIL.sh, y0=-26, y1=8, step=5)
        cv.shape(b.tw([(-7, -30), (7, -30), (8, 12), C(4, 15), (-4, 15), C(-8, 12)], 1.0), TUN, sh=1.0, lw=.6)
    else:
        skirt(cv, b, TUN, hem=13)
        muscle_cuirass(cv, b, BRONZE if stage == 4 else GOLD, under=TUN)
        pteruges(cv, b, mat=TUN, trim=GOLD)
    torc(cv, b)
    b.hair_long(cv, HAIR_RED, 4 + stage)
    cv.shape(b.neck_pts(1.15), SKIN, sh=1.0, lw=.6)
    sd_ = norm((-.6, -.8))
    blade_m = GOLD if stage == 5 else STEEL
    sword(cv, b.hand_c('F'), sd_, part="hilt", guard=BRONZE if stage < 5 else GOLD)
    cv.shape(b.arm_pts('F'), SKIN, sh=1.2)
    cv.shape(b.upper_arm_pts('F', .45, .8), TUN if stage < 2 else MAIL if stage < 4 else TUN, sh=.8, lw=.6)
    cv.shape(b.fore_pts('F', .45, .6), BRONZE if stage < 5 else GOLD, sh=.4, lw=.5)
    fist(cv, b, 'F')
    sword(cv, b.hand_c('F'), sd_, blade=25 + stage, w=3.6, part="blade", mat=blade_m,
          guard=BRONZE if stage < 5 else GOLD, glow=GLOW if stage == 5 else None)
    if stage == 1:
        helm = lambda cv, b: b.hair_short(cv, HAIR_RED)
    elif stage == 2:
        helm = lambda cv, b: gaul_helmet(cv, b, BRONZE)
    elif stage == 3:
        helm = lambda cv, b: gaul_helmet(cv, b, IRON, wings=WING)
    elif stage == 4:
        helm = lambda cv, b: gaul_helmet(cv, b, BRONZE, plume=TUN_RED, knob=False)
    else:
        helm = lambda cv, b: gaul_helmet(cv, b, GOLD, wings=WING)
    b.head(cv, tache=HAIR_RED, tache_size=1.2 + stage * .15, helmet=helm, look=-1.0)
    face = {1: WOOD, 2: GGREEN, 3: GGREEN, 4: TUN_RED, 5: GGREEN}[stage]
    oval_shield(cv, (80, 86), 13, 24, face=face, rim=BRONZE if stage < 5 else GOLD, deco=GOLD)
    return cv, (16, 4, 104, 130)


HEROES = {}
for _st in range(1, 6):
    HEROES[f"romans-{_st}"] = (lambda st: lambda: hero_roman(st))(_st)
    HEROES[f"teutons-{_st}"] = (lambda st: lambda: hero_teuton(st))(_st)
    HEROES[f"gauls-{_st}"] = (lambda st: lambda: hero_gaul(st))(_st)
