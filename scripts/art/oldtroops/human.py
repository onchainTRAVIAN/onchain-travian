"""Human figure: pose -> joints -> anatomical part outlines.

Figures face image-left in 3/4 view.  'F' = far side (the body's right side,
image-left), 'N' = near side (body's left side, image-right).  Light comes from
the upper left.  Default scale: 100 px from sole to crown, sole at y=128.
"""
import math
from lib import *

# palette shared by all humans
SKIN = Mat("#f6bb8e", sh="#d98a62", hl="#ffe0c2", line="#9a4a2a")
SKIN_TAN = Mat("#cf9065", sh="#a7663f", hl="#eab48a", line="#6a3820")
EYE = "#18110c"
NECK = 3.0  # raise the big comic head a little above the shoulders
MOUTH = Mat("#8a2a20", sh="#6a1a12", hl="#b84a3a", line="#18110c")
EYEW = Mat("#ffffff", sh="#dcdcdc", hl="#ffffff", line="#18110c")


def dvec(a):
    """Unit vector for an angle measured from straight down, + = forward/left."""
    r = math.radians(a)
    return (-math.sin(r), math.cos(r))


class Frame:
    def __init__(self, origin, angle=0.0, s=1.0, flip=False):
        self.o, self.a, self.s, self.flip = origin, angle, s, flip

    def p(self, x, y=None, corner=False):
        if y is None:
            x, y = x[0], x[1]
        if self.flip:
            x = -x
        q = rot((x * self.s, y * self.s), -self.a)
        q = (q[0] + self.o[0], q[1] + self.o[1])
        return q + ((1,) if corner else ())

    def pts(self, lst):
        return [self.p(q[0], q[1], len(q) > 2 and q[2]) for q in lst]


class Body:
    """Joint positions for a standing / acting figure."""

    def __init__(self, pelvis=(60, 77), s=1.0, lean=0.0,
                 legF=(10, 2), legN=(-4, -2), armF=(10, 20), armN=(-6, 10),
                 tilt=0.0, footF=0.0, footN=0.0, footN_len=0.85, footF_len=1.0, twist=0.0,
                 leg_bulk=1.3, arm_bulk=1.4, hand=1.55, hs=1.45, shw=1.15, foot=1.3, leg_len=.86, ground=None):
        if ICON['on']:
            hs *= 1.22
            hand *= 1.1
        if ground is not None:
            tmp = Body(pelvis, s, lean, legF, legN, armF, armN, tilt, footF, footN, footN_len, footF_len, twist,
                       leg_bulk, arm_bulk, hand, hs, shw, foot, leg_len)
            low = max(tmp.ankF[1], tmp.ankN[1]) + 5.3 * s * foot
            pelvis = (pelvis[0], pelvis[1] + ground - low)
        self.s = s
        self.leg_bulk, self.arm_bulk, self.hand, self.hs = leg_bulk, arm_bulk, hand, hs
        self.T = Frame(pelvis, lean, s)
        self.lean = lean
        T = self.T
        self.pelvis = pelvis
        self.hipF = T.p(-4.6, -0.5)
        self.hipN = T.p(4.4, 0.5)
        L1, L2 = 24 * s * leg_len, 23 * s * leg_len
        self.kneeF = add(self.hipF, mul(dvec(legF[0]), L1))
        self.ankF = add(self.kneeF, mul(dvec(legF[1]), L2))
        self.kneeN = add(self.hipN, mul(dvec(legN[0]), L1))
        self.ankN = add(self.kneeN, mul(dvec(legN[1]), L2))
        self.legF, self.legN = legF, legN
        self.footF, self.footN = footF, footN
        self.footF_len, self.footN_len = footF_len, footN_len
        self.shF = T.p((-9.5 + twist) * shw, -27)
        self.shN = T.p((10 - twist * .5) * shw, -26.4)
        self.neck = T.p(0.0, -30.5)
        self.armF, self.armN = armF, armN
        U, F = 16.5 * s, 13.5 * s
        self.elF = add(self.shF, mul(dvec(armF[0] - lean), U))
        self.wrF = add(self.elF, mul(dvec(armF[1] - lean), F))
        self.elN = add(self.shN, mul(dvec(armN[0] - lean), U))
        self.wrN = add(self.elN, mul(dvec(armN[1] - lean), F))
        self.H = Frame(T.p(-2.2, -32.4 - NECK - 7.4 * hs), lean + tilt, s * hs)
        self.shw = shw
        self.foot = foot
        self.tilt = tilt

    def tw(self, pts, k=None):
        """Torso-frame points with x scaled by the shoulder width."""
        k = self.shw if k is None else k
        return self.T.pts([(q[0] * k, q[1]) + tuple(q[2:]) for q in pts])

    def reach(self, side, target, bend=1, fore=None):
        """2-bone IK: put the fist centre at `target`.  bend=+1 elbow drops
        down/back (to the right of the shoulder->hand line), -1 the other way."""
        s = self.s
        U, F = 16.5 * s, 13.5 * s + 2.6 * s * self.hand
        sh = self.shF if side == 'F' else self.shN
        d = dist(sh, target)
        d = min(d, (U + F) * .999)
        dirv = norm(sub(target, sh))
        a = (U * U + d * d - F * F) / (2 * d)
        h = math.sqrt(max(U * U - a * a, 0))
        nn = perp(dirv)
        el = add(add(sh, mul(dirv, a)), mul(nn, -h * bend))
        fdir = norm(sub(target, el))
        wr = add(el, mul(fdir, 13.5 * s))
        if side == 'F':
            self.elF, self.wrF = el, wr
        else:
            self.elN, self.wrN = el, wr

    # ---- grips -------------------------------------------------------------
    def hand_c(self, side):
        el, wr = (self.elF, self.wrF) if side == 'F' else (self.elN, self.wrN)
        return add(wr, mul(norm(sub(wr, el)), 2.6 * self.s * self.hand))

    def fore_dir(self, side):
        el, wr = (self.elF, self.wrF) if side == 'F' else (self.elN, self.wrN)
        return norm(sub(wr, el))

    # ---- parts -------------------------------------------------------------
    def leg_pts(self, side, bulk=1.0, top=0.0):
        s = self.s
        k = bulk * self.leg_bulk
        hip, knee, ank = (self.hipF, self.kneeF, self.ankF) if side == 'F' else (self.hipN, self.kneeN, self.ankN)
        hip = add(hip, (0, -top))
        ch = [hip, lerp(hip, knee, .42), lerp(hip, knee, .84), knee,
              lerp(knee, ank, .14), lerp(knee, ank, .34), lerp(knee, ank, .6), lerp(knee, ank, .86), ank]
        r = [(6.4 * k, 6.9 * k), (6.0 * k, 5.6 * k), (4.5 * k, 4.2 * k), (4.0 * k, 3.6 * k), (3.6 * k, 4.4 * k),
             (3.3 * k, 4.9 * k), (2.9 * k, 3.6 * k), (2.3, 2.6), (2.3, 2.5)]
        return limb(ch, [(a * s, b * s) for a, b in r], cap0=False, cap1=False)

    def shin_pts(self, side, frm=.1, to=1.0, grow=0.5):
        """Outline of the lower leg (for boots, greaves, wraps)."""
        s = self.s
        knee, ank = (self.kneeF, self.ankF) if side == 'F' else (self.kneeN, self.ankN)
        ch = [lerp(knee, ank, frm), lerp(knee, ank, max(frm, .22)), lerp(knee, ank, .55), lerp(knee, ank, .86), ank]
        r = [(3.7, 3.9), (3.6, 4.7), (3.1, 3.9), (2.5, 2.8), (2.3, 2.5)]
        if frm > .22:
            ch, r = ch[1:], r[1:]
            ch[0] = lerp(knee, ank, frm)
        g = grow
        k = self.leg_bulk
        return limb(ch, [((a * k + g) * s, (b * k + g) * s) for a, b in r], cap0=False, cap1=False)

    def foot_pts(self, side, kind="sandal", lift=0.0):
        """Foot pointing left from the ankle; kind sandal|boot|bare."""
        s = self.s
        ank = self.ankF if side == 'F' else self.ankN
        ang = self.footF if side == 'F' else self.footN
        ln = self.footF_len if side == 'F' else self.footN_len
        fr = Frame(ank, ang, s * self.foot)
        if kind == "boot":
            pts = [(-2.8, -3), (-4.6, 1.2), (-8.6 * ln, 2.8), (-10.6 * ln, 4.0), C(-10.5 * ln, 5.3), C(-1.5, 5.6),
                   (2.6, 5.4), (3.6, 2.6), (3.0, -3)]
        else:
            pts = [(-2.2, -.6), (-4.6, 2.0), (-8.8 * ln, 3.4), (-10.6 * ln, 4.2), C(-10.4 * ln, 5.3), C(-1.5, 5.4),
                   (2.3, 5.2), (2.9, 2.6), (2.4, -.6)]
        return fr.pts(pts)

    def arm_pts(self, side, bulk=1.0, frm=0.0):
        s = self.s * bulk * self.arm_bulk
        sh, el, wr = (self.shF, self.elF, self.wrF) if side == 'F' else (self.shN, self.elN, self.wrN)
        ch = [sh, lerp(sh, el, .35), lerp(sh, el, .75), el, lerp(el, wr, .3), lerp(el, wr, .65), wr]
        r = [(4.3, 4.5), (3.9, 3.8), (3.3, 3.2), (2.8, 2.8), (3.3, 3.2), (2.8, 2.6), (2.1, 2.1)]
        return limb(ch, [(a * s, b * s) for a, b in r], cap0=True, cap1=False)

    def upper_arm_pts(self, side, frac=.55, grow=.7):
        s = self.s
        sh, el = (self.shF, self.elF) if side == 'F' else (self.shN, self.elN)
        ch = [sh, lerp(sh, el, .35), lerp(sh, el, frac)]
        k = self.arm_bulk
        r = [(4.3 * k + grow, 4.5 * k + grow), (3.9 * k + grow, 3.8 * k + grow), (3.5 * k + grow, 3.4 * k + grow)]
        return limb(ch, [(a * s, b * s) for a, b in r], cap0=True, cap1=False)

    def fore_pts(self, side, frm=.35, grow=.5):
        """Bracer / sleeve on the forearm."""
        s = self.s
        el, wr = (self.elF, self.wrF) if side == 'F' else (self.elN, self.wrN)
        ch = [lerp(el, wr, frm), lerp(el, wr, .65), wr]
        k = self.arm_bulk
        r = [(3.2 * k + grow, 3.1 * k + grow), (2.8 * k + grow, 2.6 * k + grow), (2.2 * k + grow, 2.2 * k + grow)]
        return limb(ch, [(a * s, b * s) for a, b in r], cap0=False, cap1=False)

    def fist_pts(self, side, mirror=False):
        """A closed hand around the grip point, oriented along the forearm."""
        s = self.s
        el, wr = (self.elF, self.wrF) if side == 'F' else (self.elN, self.wrN)
        d = norm(sub(wr, el))
        ang = math.degrees(math.atan2(d[1], d[0]))
        fr = Frame(wr, -ang, s * self.hand, flip=False)
        m = -1 if mirror else 1
        pts = [(-.6, -2.4 * m), (2.6, -2.9 * m), (4.9, -2.2 * m), (5.6, 0), (5.0, 2.4 * m), (2.4, 3.0 * m),
               (-.4, 2.4 * m)]
        return fr.pts(pts)

    def open_hand_pts(self, side, spread=0.0, mirror=False):
        s = self.s
        el, wr = (self.elF, self.wrF) if side == 'F' else (self.elN, self.wrN)
        d = norm(sub(wr, el))
        ang = math.degrees(math.atan2(d[1], d[0]))
        fr = Frame(wr, -ang, s * self.hand)
        m = -1 if mirror else 1
        pts = [(-.5, -2.2 * m), (3.0, -2.6 * m), (6.6, -2.0 * m), (8.2, -.6 * m), (7.6, 1.0 * m), (4.8, 1.8 * m),
               (5.6, 3.6 * m), (4.4, 4.0 * m), (2.2, 2.6 * m), (-.4, 2.2 * m)]
        return fr.pts(pts)

    def neck_pts(self, w=1.0):
        H, T = self.H, self.T
        return [H.p(-3.6 * w, 4.0), H.p(4.0 * w, 3.0), T.p(4.6 * w, -28.6), T.p(-4.0 * w, -28.8)]

    # caricature head in head-frame units: crown -9.2, chin +7.6
    HEAD = [(1.0, -9.2), (5.6, -7.8), (7.8, -3.6), (7.6, 1.0), (5.6, 5.0), (2.0, 7.4), (-2.6, 7.6), (-5.4, 5.6),
            (-6.6, 2.4), (-6.8, -1.6), (-6.4, -5.4), (-3.6, -8.4)]
    NOSE = [(-5.4, -2.4), (-7.6, -1.2), (-9.8, 1.0), (-10.0, 2.6), (-8.8, 3.8), (-7.0, 3.6), (-5.4, 2.6)]

    def head_pts(self):
        return self.H.pts(self.HEAD)

    def eyes(self, cv, angry=False, look=-1.0, closed=False):
        H, s = self.H, self.H.s
        # far eye (partly hidden by the nose)
        cv.shape(ell_pts(H.p(-6.2, -2.6), 1.05 * s, 1.9 * s, n=8), EYEW, sh=0, lw=.35, detail=True)
        cv.dot(H.p(-6.2 + .45 * look, -2.2), .62 * s, EYE)
        cv.shape(ell_pts(H.p(-3.0, -2.6), 1.75 * s, 2.15 * s, n=8), EYEW, sh=0, lw=.35, detail=True)
        cv.dot(H.p(-3.0 + .75 * look, -2.2), .85 * s, EYE)
        if closed:
            cv.shape(H.pts([(-4.9, -2.8), (-3.0, -4.9), (-1.1, -2.8), (-3.0, -3.2)]), SKIN, sh=0, lw=.35, detail=True)
        if angry:
            cv.stroke(H.pts([(-5.4, -5.8), (-3.2, -5.0), (-1.0, -4.0)]), EYE, w=1.25)
            cv.stroke(H.pts([(-7.6, -4.2), (-6.4, -4.8)]), EYE, w=1.0)
        else:
            cv.stroke(H.pts([(-5.2, -5.0), (-3.2, -5.8), (-1.0, -5.4)]), EYE, w=1.15)
            cv.stroke(H.pts([(-7.6, -4.6), (-6.2, -5.2)]), EYE, w=.95)

    def face(self, cv, mouth=True, ear=True, skin=SKIN, angry=False, look=-1.0, smile=True, closed=False,
             open_mouth=False):
        H = self.H
        if ear:
            cv.shape(H.pts([(3.2, -2.4), (5.4, -3.4), (6.6, -.6), (5.4, 2.6), (3.4, 2.0)]), skin, sh=.5, lw=.5)
            cv.stroke(H.pts([(5.0, -1.6), (4.6, .2), (5.2, 1.2)]), skin.line, w=.5, detail=True)
        cv.flat(ell_pts(H.p(-1.2, 2.2), 2.0 * H.s, 1.3 * H.s, n=6), "#ef7f6a", detail=True, op=.45)
        self.eyes(cv, angry, look, closed)
        if open_mouth:
            cv.shape(H.pts([(-6.4, 5.0), (-4.2, 5.4), (-2.4, 4.8), (-3.4, 7.0), (-5.4, 7.2)]), MOUTH, sh=0, lw=.5)
        elif mouth:
            if smile:
                cv.stroke(H.pts([(-6.0, 5.0), (-4.4, 5.8), (-2.6, 5.0)]), EYE, w=.7)
            else:
                cv.stroke(H.pts([(-6.0, 5.6), (-4.2, 5.2), (-2.6, 5.6)]), EYE, w=.7)

    def nose(self, cv, skin=SKIN, k=1.0):
        H = self.H
        cv.shape(H.pts([((x + 5.4) * k - 5.4, y) for x, y in self.NOSE]), skin, sh=.6, lw=.6)
        cv.dot(H.p(-5.4 - 3.2 * k, 1.2), .5 * H.s, skin.hl)

    def head(self, cv, skin=SKIN, beard=None, long=0.0, tache=None, helmet=None, hair=None, nose=1.0,
             tache_size=1.0, **kw):
        """Order: skull, ear, eyes, mouth, hair, beard, helmet, nose, moustache."""
        cv.shape(self.head_pts(), skin, sh=1.6, lw=.75)
        if beard is not None or tache is not None:
            kw.setdefault("mouth", False)
        self.face(cv, skin=skin, **kw)
        if hair is not None:
            self.hair_short(cv, hair)
        if beard is not None:
            self.beard(cv, beard, long, tache=False)
        if helmet:
            helmet(cv, self)
        if nose:
            self.nose(cv, skin, nose)
        if tache is not None:
            self.moustache(cv, tache, tache_size)

    # hair / beards in head units ------------------------------------------
    def hair_short(self, cv, mat):
        H = self.H
        cv.shape(H.pts([(-5.8, -5.6), (-4.6, -8.8), (.8, -10.2), (5.8, -8.8), (8.6, -4.6), (8.4, .6), (6.6, 3.0),
                        (5.6, 0), C(4.2, -2.6), (3.2, -1.6), C(1.8, -4.4), (.4, -3.4), C(-1.0, -5.6), (-2.4, -4.6),
                        C(-3.8, -6.2)]), mat, sh=1.0, lw=.6)

    def hair_long(self, cv, mat, length=8.0):
        """Long hair behind the head (draw before the head)."""
        H = self.H
        L = length
        cv.shape(H.pts([(-4.0, -8.6), (2.0, -10.4), (7.4, -8.0), (9.4, -2.0), (10.0, 4.0 + L * .5), (9.0, 6.0 + L),
                        C(6.8, 4.0 + L * .8), (5.6, 6.0 + L * .7), C(4.0, 3.0 + L * .5), (2.0, 4.0)]), mat, sh=1.2,
                 lw=.6)

    def moustache(self, cv, mat, big=1.0):
        H = self.H
        k = big
        cv.shape(H.pts([(-6.6, 3.4), (-8.6 - k, 3.8), (-10.4 - k * 1.2, 5.4 + k * .6), (-10.8 - k, 7.2 + k),
                        (-9.0, 6.2), (-7.0, 5.4), (-5.4, 5.6), (-3.4, 6.6 + k * .6), (-1.2, 6.8 + k * .6),
                        (-2.6, 4.8), (-4.8, 3.4)]), mat, sh=.4, lw=.55)

    def beard(self, cv, mat, long=0.0, tache=True):
        H = self.H
        L = long
        cv.shape(H.pts([(4.6, .4), (5.4, 4.6), (3.6, 8.6 + L * .6), (-.6, 11.6 + L), (-4.6, 11.0 + L * .9),
                        (-7.4, 8.6 + L * .5), (-7.4, 5.6), (-5.4, 6.8), (-3.0, 7.2), (-.4, 6.0), (2.4, 3.4)]),
                 mat, sh=1.2, lw=.6)
        cv.stroke(H.pts([(-2.6, 8.6), (-2.2, 10.4 + L * .7)]), mat.sh, w=.6, detail=True)
        cv.stroke(H.pts([(.8, 7.6), (1.4, 9.4 + L * .5)]), mat.sh, w=.6, detail=True)
        if tache:
            self.moustache(cv, mat)
