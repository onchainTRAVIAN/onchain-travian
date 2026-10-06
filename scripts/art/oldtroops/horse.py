"""Horse (also the base for other quadrupeds' legs).

Profile-ish 3/4 view facing left.  Built in withers-height units (H): ground y=0,
withers at (0,-1); +x toward the tail.  The far-side legs are drawn shifted up
and darker.
"""
import math
from lib import *

BAY = Mat("#9a5a2e", sh="#6e3a1c", hl="#c98a52", line="#36190a")
CHEST = Mat("#6e4428", sh="#4c2c18", hl="#946040", line="#2a160a")
BLACKH = Mat("#3a2c26", sh="#241a16", hl="#62504a", line="#120a08")
GREYH = Mat("#bfbcb4", sh="#8f8b84", hl="#ebe8e2", line="#4a4640")
WHITEH = Mat("#ebe6da", sh="#bdb4a4", hl="#ffffff", line="#5e5648")
DUN = Mat("#b99a6c", sh="#8c6f48", hl="#dcc296", line="#463420")
CHESTNUT = Mat("#b4683a", sh="#83461f", hl="#de9a64", line="#401c08")
DAPPLE = Mat("#9aa0a6", sh="#6e737a", hl="#cdd2d6", line="#32363c")
HOOF = Mat("#4a3a30", sh="#2e241e", hl="#76665a", line="#1a120c")


class Horse:
    def __init__(self, x=60, y=128, H=56, coat=BAY, mane=BLACKH, legs=None, stride=1.0, head_up=0.0,
                 tail=None, sock=None, hk=1.32, drop=.08):
        self.x, self.y, self.H = x, y, H
        self.coat, self.mane = coat, mane
        self.legs = legs or coat  # lower-leg colour ("points")
        self.tail = tail or mane
        self.stride = stride
        self.head_up = head_up
        self.sock = sock
        # far legs offset (3/4 view)
        self.fo = (-3.2, -2.4)
        self.headmode = False
        self.hk = hk
        self.drop = drop

    def p(self, u, v, off=(0, 0)):
        if self.headmode:
            pu, pv = -.44, -1.3
            u, v = pu + (u - pu) * self.hk, pv + (v - pv) * self.hk
        if v < -.55:
            v += self.drop
        else:
            v *= (.55 - self.drop) / .55
        return (self.x + u * self.H + off[0], self.y + v * self.H + off[1])

    def P(self, lst, off=(0, 0)):
        return [self.p(q[0], q[1], off) + tuple(q[2:]) for q in lst]

    # ------------------------------------------------------------ legs ----
    def fore_leg(self, cv, top, knee, fet, hoof_ang=0.0, far=False):
        """top/knee/fet in H units (with far offset applied by caller)."""
        H = self.H
        o = self.fo if far else (0, 0)
        T, K, F = self.p(*top, o), self.p(*knee, o), self.p(*fet, o)
        coat = Mat(shade(self.coat.base, .28), sh=shade(self.coat.sh, .25), hl=self.coat.base,
                   line=self.coat.line) if far else self.coat
        lg = self.legs
        if far:
            lg = Mat(shade(lg.base, .25), sh=shade(lg.sh, .25), hl=lg.base, line=lg.line)
        # forearm (coat) to knee, cannon (points colour) to fetlock
        ch = [T, lerp(T, K, .45), lerp(T, K, .85), K]
        cv.shape(limb(ch, [(.1 * H, .08 * H), (.078 * H, .062 * H), (.052 * H, .046 * H), (.047 * H, .044 * H)],
                      cap0=False), coat, sh=1.0, lw=.6)
        d = norm(sub(F, K))
        ang = math.degrees(math.atan2(-d[0], d[1]))
        pas = add(F, mul(dvec_(ang + 28 + hoof_ang), .1 * H))
        ch2 = [lerp(K, F, -.08), K, lerp(K, F, .5), F, pas]
        cv.shape(limb(ch2, [(.044 * H, .044 * H), (.048 * H, .046 * H), (.035 * H, .037 * H), (.044 * H, .05 * H),
                            (.033 * H, .035 * H)], cap0=False, cap1=False), lg, sh=.8, lw=.6)
        if self.sock:
            sk = self.sock if not far else Mat(shade(self.sock.base, .2), sh=self.sock.sh, hl=self.sock.base,
                                               line=self.sock.line)
            cv.shape(limb([lerp(F, K, .25), F, pas], [(.034 * H, .035 * H), (.042 * H, .047 * H), (.032 * H, .034 * H)],
                          cap0=False, cap1=False), sk, sh=.5, lw=.5)
        self.hoof(cv, pas, ang + 10 + hoof_ang, far)

    def hind_leg(self, cv, stifle, hock, fet, hoof_ang=0.0, far=False):
        H = self.H
        o = self.fo if far else (0, 0)
        S, Ho, F = self.p(*stifle, o), self.p(*hock, o), self.p(*fet, o)
        coat = Mat(shade(self.coat.base, .28), sh=shade(self.coat.sh, .25), hl=self.coat.base,
                   line=self.coat.line) if far else self.coat
        lg = self.legs
        if far:
            lg = Mat(shade(lg.base, .25), sh=shade(lg.sh, .25), hl=lg.base, line=lg.line)
        # gaskin: thick, tapering to the hock (point of hock sticks out at the back)
        ch = [S, lerp(S, Ho, .4), lerp(S, Ho, .8), Ho]
        cv.shape(limb(ch, [(.11 * H, .13 * H), (.08 * H, .095 * H), (.055 * H, .06 * H), (.048 * H, .065 * H)],
                      cap0=False), coat, sh=1.0, lw=.6)
        d = norm(sub(F, Ho))
        ang = math.degrees(math.atan2(-d[0], d[1]))
        pas = add(F, mul(dvec_(ang + 26 + hoof_ang), .1 * H))
        ch2 = [lerp(Ho, F, -.1), Ho, lerp(Ho, F, .5), F, pas]
        cv.shape(limb(ch2, [(.046 * H, .054 * H), (.044 * H, .054 * H), (.034 * H, .038 * H), (.044 * H, .05 * H),
                            (.033 * H, .035 * H)], cap0=False, cap1=False), lg, sh=.8, lw=.6)
        if self.sock:
            sk = self.sock
            cv.shape(limb([lerp(F, Ho, .25), F, pas], [(.034 * H, .035 * H), (.042 * H, .047 * H), (.032 * H, .034 * H)],
                          cap0=False, cap1=False), sk, sh=.5, lw=.5)
        self.hoof(cv, pas, ang + 8 + hoof_ang, far)

    def hoof(self, cv, at, ang, far):
        H = self.H
        fr_d = dvec_(ang)
        n = perp(fr_d)
        w = .05 * H
        hh = .065 * H
        a = add(at, mul(n, w * .8))
        b = sub(at, mul(n, w * .9))
        c = add(b, add(mul(fr_d, hh), mul(n, -.25 * w)))
        d = add(a, add(mul(fr_d, hh * .9), mul(n, .5 * w)))
        m = HOOF if not far else Mat("#3a2c24", sh="#241a14", hl="#5a4a40", line="#140c08")
        cv.shape([a, b, C(*c), C(*d)], m, sh=.4, lw=.55)

    # ------------------------------------------------------------ body ----
    def draw(self, cv, rider_gap=False, cloth=None, extra_under_neck=None):
        """Draw the whole horse; returns anchors dict."""
        H, st = self.H, self.stride
        A = {}
        # tail behind everything
        self.draw_tail(cv)
        # far legs (walk: far fore planted forward, far hind stepping forward)
        self.hind_leg(cv, (.58, -.62), (.62 - .1 * st, -.3), (.56 - .1 * st, -.09), far=True)
        self.fore_leg(cv, (-.2, -.6), (-.24 - .06 * st, -.3), (-.25 - .06 * st, -.08), far=True)
        # body barrel
        body = [(-.30, -.84), (-.18, -.98), C(-.02, -1.02), (.18, -.95), (.42, -.99), (.62, -1.03),
                (.78, -.96), (.86, -.82), (.84, -.66), (.74, -.54), (.58, -.52), (.38, -.52), (.16, -.5),
                (-.04, -.52), (-.18, -.56), (-.27, -.64), (-.32, -.74)]
        cv.shape(self.P(body), self.coat, sh=2.6, lw=.75)
        # muscle hints: shoulder line, hindquarter round, belly
        cv.stroke(self.P([(-.06, -.95), (-.14, -.8), (-.18, -.66)]), self.coat.sh, w=.7, detail=True, op=.8)
        cv.stroke(self.P([(.56, -.98), (.5, -.84), (.56, -.66), (.66, -.6)]), self.coat.sh, w=.7, detail=True, op=.8)
        cv.stroke(self.P([(.12, -.56), (.36, -.55)]), self.coat.sh, w=.6, detail=True, op=.6)
        cv.flat(self.P([(.6, -.97), (.72, -.94), (.76, -.86), (.68, -.86)]), self.coat.hl, op=.45, detail=True)
        # near legs (walk: near fore lifted, near hind planted back)
        self.hind_leg(cv, (.66, -.62), (.8, -.3), (.79, -.08))
        if st > 0:
            self.fore_leg(cv, (-.18, -.62), (-.1 + .06 * st, -.36), (-.02 + .1 * st, -.2), hoof_ang=-10 - 30 * st)
        else:
            self.fore_leg(cv, (-.18, -.62), (-.15, -.32), (-.14, -.08))
        if cloth:
            cloth(cv, self)
        # neck + head
        hu = self.head_up
        A.update(self.draw_neck_head(cv, hu))
        A["saddle"] = self.p(.08, -1.02)
        A["withers"] = self.p(0, -1.0)
        self.A = A
        return A

    def caparison(self, cv, mat, trim=None, dots=None):
        """Cloth covering the body down to the knees (heavy cavalry)."""
        lo = -.4
        pts = [(-.3, -.86), (-.2, -1.0), C(-.02, -1.04), (.2, -.98), (.44, -1.01), (.64, -1.05), (.8, -.98),
               (.88, -.82), C(.88, lo + .04), (.78, lo), (.68, lo + .06), (.58, lo), (.46, lo + .06), (.34, lo),
               (.22, lo + .06), (.1, lo), (-.02, lo + .06), (-.14, lo), C(-.3, lo + .04), (-.34, -.62)]
        cv.shape(self.P(pts), mat, sh=2.4, lw=.75)
        if trim:
            cv.stroke(self.P([(-.29, lo + .1), (-.14, lo + .06), (-.02, lo + .12), (.1, lo + .06), (.22, lo + .12),
                              (.34, lo + .06), (.46, lo + .12), (.58, lo + .06), (.68, lo + .12), (.78, lo + .06),
                              (.87, lo + .1)]), trim.base, w=1.6)
        for u in (.08, .4, .7):
            cv.stroke(self.P([(u, -.9), (u - .02, lo + .14)]), mat.sh, w=.7, detail=True)
        if dots:
            for u, v in ((.0, -.72), (.3, -.72), (.6, -.75)):
                cv.shape(ell_pts(self.p(u, v), .045 * self.H, .05 * self.H, n=8), dots, sh=.3, lw=.5)

    def chanfron(self, cv, mat):
        """Metal face plate."""
        self.headmode = True
        hy = -self.head_up * .1
        cv.shape(self.P([(-.5, -1.43 + hy), (-.56, -1.41 + hy), (-.64, -1.32 + hy), (-.73, -1.2 + hy),
                         (-.7, -1.16 + hy), (-.64, -1.22 + hy), (-.6, -1.29 + hy), (-.53, -1.39 + hy)]), mat, sh=.4,
                 lw=.55)
        cv.dot(self.p(-.6, -1.33 + hy), .7, mat.hl)
        self.headmode = False


    def draw_tail(self, cv):
        t = [(.8, -.94), (.9, -.9), (.98, -.72), (1.0, -.5), (.98, -.32), C(.94, -.22), (.9, -.36),
             (.88, -.58), (.82, -.78)]
        cv.shape(self.P(t), self.tail, sh=1.2, lw=.6)
        cv.stroke(self.P([(.9, -.84), (.95, -.6), (.94, -.36)]), self.tail.sh, w=.6, detail=True)
        cv.stroke(self.P([(.86, -.8), (.9, -.56)]), self.tail.hl, w=.5, detail=True, op=.6)

    def draw_neck_head(self, cv, hu=0.0):
        """Neck from withers/chest up to the poll, head angled down-forward."""
        A = {}
        dy = -hu * .1
        neck = [(-.02, -1.0), (-.14, -1.08), (-.28, -1.22 + dy * .6), (-.4, -1.36 + dy), (-.47, -1.42 + dy),
                (-.53, -1.34 + dy), (-.5, -1.2 + dy), (-.44, -1.08 + dy * .5), (-.37, -.95), (-.32, -.82),
                (-.28, -.7), (-.1, -.78)]
        cv.shape(self.P(neck), self.coat, sh=1.8, lw=.7)
        # mane along the crest
        mane = [(.04, -.99), (-.08, -1.06), (-.2, -1.16), (-.32, -1.32 + dy), (-.42, -1.45 + dy),
                (-.47, -1.43 + dy), (-.39, -1.34 + dy), (-.27, -1.2), (-.14, -1.08), (-.02, -1.0)]
        cv.shape(self.P(mane), self.mane, sh=.9, lw=.55)
        for u in (-.1, -.2, -.3):
            cv.stroke(self.P([(u + .02, -1.04 - (-u) * .9 + .02), (u + .07, -1.0 - (-u) * .7)]), self.mane.hl, w=.45,
                      detail=True, op=.7)
        # head: poll -> forehead -> nose -> muzzle -> chin -> jaw -> cheek
        hx, hy = 0, dy
        self.headmode = True
        head = [(-.46, -1.44), (-.54, -1.41), (-.62, -1.33), (-.7, -1.23), (-.76, -1.15), (-.785, -1.1),
                (-.78, -1.065), (-.755, -1.045), (-.72, -1.045), (-.69, -1.06), (-.63, -1.09), (-.56, -1.1),
                (-.5, -1.13), (-.46, -1.19), (-.44, -1.28), (-.43, -1.37)]
        head = [(u + hx, v + hy) for u, v in head]
        cv.shape(self.P(head), self.coat, sh=1.2, lw=.7)
        # cheek round
        cv.stroke(self.P([(-.47, -1.3 + hy), (-.53, -1.22 + hy), (-.57, -1.12 + hy)]), self.coat.sh, w=.6,
                  detail=True)
        # muzzle darker
        cv.flat(self.P([(-.72, -1.17 + hy), (-.785, -1.11 + hy), (-.78, -1.06 + hy), (-.72, -1.045 + hy),
                        (-.68, -1.08 + hy), (-.69, -1.13 + hy)]), self.coat.sh, op=.55, detail=True)
        # ears
        for off, sh in ((-.025, True), (0, False)):
            ear = [(-.455 + off, -1.43 + hy), (-.44 + off, -1.54 + hy), C(-.425 + off, -1.58 + hy),
                   (-.405 + off, -1.51 + hy), (-.41 + off, -1.42 + hy)]
            m = self.coat if not sh else Mat(shade(self.coat.base, .3), sh=self.coat.sh, hl=self.coat.base,
                                             line=self.coat.line)
            cv.shape(self.P(ear), m, sh=.4, lw=.55)
        # forelock
        cv.shape(self.P([(-.44, -1.46 + hy), (-.51, -1.43 + hy), (-.57, -1.37 + hy), (-.53, -1.4 + hy),
                         (-.48, -1.39 + hy)]), self.mane, sh=.3, lw=.5)
        # eye + nostril + mouth
        e = self.p(-.555, -1.335 + hy)
        k = self.hk
        cv.shape(ell_pts(e, .046 * self.H * k, .038 * self.H * k, ang=-25, n=8), EYEW_, sh=0, lw=.4)
        cv.dot(add(e, (-1.0, .3)), .02 * self.H * k, "#18110c", detail=False)
        cv.stroke([add(e, (-2.4, -2.4)), add(e, (0, -3.0)), add(e, (2.2, -1.8))], "#18110c", w=.8, detail=True)
        cv.flat(ell_pts(self.p(-.755, -1.135 + hy), .016 * self.H, .01 * self.H, ang=-50, n=6), "#2a1a12",
                detail=True)
        cv.stroke(self.P([(-.765, -1.075 + hy), (-.72, -1.072 + hy)]), self.coat.line, w=.5, detail=True)
        A["mouth"] = self.p(-.72, -1.08 + hy)
        A["poll"] = self.p(-.46, -1.43 + hy)
        A["head_pts"] = head
        self.headmode = False
        return A

    def bridle(self, cv, mat, metal, hand=None):
        hy = -self.head_up * .1
        self.headmode = True
        st = [(-.46, -1.42 + hy), (-.5, -1.28 + hy), (-.6, -1.12 + hy)]
        cv.stroke(self.P(st), mat.base, w=.9)
        cv.stroke(self.P([(-.48, -1.4 + hy), (-.57, -1.37 + hy)]), mat.base, w=.8)  # brow band
        cv.stroke(self.P([(-.7, -1.19 + hy), (-.62, -1.12 + hy), (-.55, -1.13 + hy)]), mat.base, w=.8)  # nose
        bit = self.p(-.66, -1.1 + hy)
        cv.dot(bit, .9, metal.base, detail=False)
        self.headmode = False
        if hand:
            cv.stroke([bit, add(lerp(bit, hand, .5), (0, 1.5)), hand], "#18110c", w=.8)

    def saddle_cloth(self, cv, mat, trim=None, long=True):
        lo = -.62 if long else -.72
        pts = [C(-.1, -1.0), (.1, -.95), C(.32, -.98), (.36, -.8), C(.34, lo), (.12, lo - .02), C(-.12, lo + .04),
               (-.14, -.82)]
        cv.shape(self.P(pts), mat, sh=1.6, lw=.6)
        if trim:
            cv.stroke(self.P([(.34, lo + .04), (.12, lo + .02), (-.11, lo + .07)]), trim.base, w=1.2)
            cv.stroke(self.P([(.335, -.94), (.36, -.8), (.34, lo + .04)]), trim.base, w=1.0)
        # girth strap
        cv.stroke(self.P([(.0, lo + .06), (-.02, -.5)]), DLEATHER_.base, w=1.4)

    def saddle(self, cv, mat):
        pts = [(-.08, -1.06), (-.04, -1.0), (.1, -.99), (.24, -1.02), (.28, -1.08), (.22, -1.04), (.1, -1.03),
               (-.02, -1.04)]
        cv.shape(self.P(pts), mat, sh=.5, lw=.55)


def dvec_(a):
    r = math.radians(a)
    return (-math.sin(r), math.cos(r))


EYEW_ = Mat("#ffffff", sh="#dddddd", hl="#ffffff", line="#18110c")
DLEATHER_ = Mat("#5f3b20", sh="#432611", hl="#8b5f38", line="#26140a")


def seat(A, s=.7, lean=4, **kw):
    """Body of a rider sitting in the saddle."""
    from human import Body
    sp = A["saddle"]
    d = dict(legF=(62, -6), legN=(58, -10), armF=(20, 70), armN=(14, 72), footN=-14, footN_len=.9, tilt=2)
    d.update(kw)
    return Body(pelvis=(sp[0] + 1, sp[1] - 3), s=s, lean=lean, **d)

