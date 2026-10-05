"""Shared vector helpers for the unit art generators (teutons.py / gauls.py).

Everything is emitted as plain SVG (path/polygon/ellipse/circle/line) with the
project outline colour.  Coordinates are in the 120x140 unit viewBox.
"""
import math

OUT = "#3a2a14"


def f(v):
    s = f"{v:.1f}"
    return s.rstrip("0").rstrip(".") if "." in s else s


def pts_str(pts):
    return " ".join(f"{f(x)},{f(y)}" for x, y in pts)


def M(pts):
    """Polyline path data through pts."""
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)


def poly(pts, fill, sw=None, stroke=None, extra=""):
    a = f' stroke-width="{sw}"' if sw is not None else ""
    b = f' stroke="{stroke}"' if stroke is not None else ""
    return f'<polygon points="{pts_str(pts)}" fill="{fill}"{b}{a}{extra}/>'


def path(d, fill="none", stroke=None, sw=None, extra=""):
    a = f' stroke-width="{sw}"' if sw is not None else ""
    b = f' stroke="{stroke}"' if stroke is not None else ""
    return f'<path d="{d}" fill="{fill}"{b}{a}{extra}/>'


def ellipse(cx, cy, rx, ry, fill, stroke=None, sw=None, extra=""):
    a = f' stroke-width="{sw}"' if sw is not None else ""
    b = f' stroke="{stroke}"' if stroke is not None else ""
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{b}{a}{extra}/>'


def circle(cx, cy, r, fill, stroke=None, sw=None, extra=""):
    a = f' stroke-width="{sw}"' if sw is not None else ""
    b = f' stroke="{stroke}"' if stroke is not None else ""
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{b}{a}{extra}/>'


def line(x1, y1, x2, y2, stroke, sw):
    return f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="{stroke}" stroke-width="{sw}"/>'


def stroke_line(pts, color, w):
    """Unoutlined soft stroke (shading / highlight)."""
    return f'<path d="{M(pts)}" fill="none" stroke="{color}" stroke-width="{f(w)}"/>'


def grad(gid, c1, c2, x1=0, y1=0, x2=0, y2=1):
    return (f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>')


# ---------------------------------------------------------------- geometry

def _unit(dx, dy):
    l = math.hypot(dx, dy) or 1
    return dx / l, dy / l


def _normals(pts):
    segs = []
    for i in range(len(pts) - 1):
        dx, dy = _unit(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        segs.append((-dy, dx))
    ns = []
    for i in range(len(pts)):
        if i == 0:
            ns.append(segs[0])
        elif i == len(pts) - 1:
            ns.append(segs[-1])
        else:
            nx, ny = segs[i - 1][0] + segs[i][0], segs[i - 1][1] + segs[i][1]
            ns.append(_unit(nx, ny))
    return ns


def tube(pts, w, fill, shade=None, hi=None, side=1, sw=None, cap=True):
    """Tapered limb/shaft: polyline with per-point widths.

    side: +1 shade on the normal side (viewer's right for a downward line), -1 the other.
    """
    if isinstance(w, (int, float)):
        w = [w] * len(pts)
    ns = _normals(pts)
    left = [(p[0] + n[0] * wi / 2, p[1] + n[1] * wi / 2) for p, n, wi in zip(pts, ns, w)]
    right = [(p[0] - n[0] * wi / 2, p[1] - n[1] * wi / 2) for p, n, wi in zip(pts, ns, w)]
    outline = left + right[::-1]
    if cap:  # round-ish end caps
        def capv(p, n, wi, d):
            return (p[0] + d[0] * wi * 0.45, p[1] + d[1] * wi * 0.45)
        d0 = _unit(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1])
        d1 = _unit(pts[-1][0] - pts[-2][0], pts[-1][1] - pts[-2][1])
        outline = [capv(pts[0], ns[0], w[0], d0)] + left + [capv(pts[-1], ns[-1], w[-1], d1)] + right[::-1]
    out = [poly(outline, fill, sw=sw)]

    def inner(k):
        q = [(p[0] + n[0] * wi * k * side, p[1] + n[1] * wi * k * side) for p, n, wi in zip(pts, ns, w)]
        # trim ends
        if len(q) >= 2:
            a, b = q[0], q[1]
            dx, dy = _unit(b[0] - a[0], b[1] - a[1])
            q[0] = (a[0] + dx * w[0] * 0.35, a[1] + dy * w[0] * 0.35)
            a, b = q[-1], q[-2]
            dx, dy = _unit(b[0] - a[0], b[1] - a[1])
            q[-1] = (a[0] + dx * w[-1] * 0.35, a[1] + dy * w[-1] * 0.35)
        return q
    if shade:
        out.append(stroke_line(inner(0.27), shade, max(w) * 0.34))
    if hi:
        out.append(stroke_line(inner(-0.3), hi, max(w) * 0.2))
    return "".join(out)


# ---------------------------------------------------------------- body parts

def hand(x, y, skin, r=3.3, sh=None):
    s = circle(x, y, r, skin)
    if sh:
        s += circle(x + r * 0.3, y + r * 0.3, r * 0.45, sh, stroke="none")
    return s


def boot(x, y, color, shade=None, d=-1, w=12, h=7, fur=None):
    """Foot whose sole ends at y, ankle at (x, y-h); toe points in direction d (-1 = left)."""
    def X(v):
        return x + v * d
    p = (f"M{f(X(-3))},{f(y-h)} L{f(X(4))},{f(y-h)} L{f(X(5))},{f(y-1.5)} "
         f"Q{f(X(4.5))},{f(y+0.4)} {f(X(2.5))},{f(y+0.4)} L{f(X(-w+4))},{f(y+0.4)} "
         f"Q{f(X(-w+1))},{f(y)} {f(X(-w+1.5))},{f(y-2.5)} Q{f(X(-w+5))},{f(y-4.5)} {f(X(-3))},{f(y-5.5)} Z")
    s = path(p, color)
    if shade:
        s += stroke_line([(X(-7), y - 1.2), (X(3), y - 1.2)], shade, 1.6)
    if fur:
        s += path(f"M{f(X(-4))},{f(y-h+0.5)} l1.2,-3 1.5,3 1.5,-3 1.5,3 1.5,-3 1.3,3 Z", fur, sw=1)
    return s


def head(cx, cy, r, skin, skin_sh, hair=None, hair_sh=None, beard=None, style="short",
         eyes=True, mouth=True, look=-1, brows=True, tilt=0, mustache=None):
    """3/4 head facing viewer's left (look=-1) or right (look=+1).  Returns (behind, front)
    so long hair / beards can be layered around helmets."""
    def X(v):
        return cx + v * r * look
    def Y(v):
        return cy + v * r
    behind = ""
    if style == "long" and hair:
        behind += path(f"M{f(X(-0.9))},{f(Y(-0.2))} Q{f(X(-1.25))},{f(Y(0.9))} {f(X(-0.7))},{f(Y(1.8))} "
                       f"L{f(X(1.1))},{f(Y(1.9))} Q{f(X(1.35))},{f(Y(0.7))} {f(X(0.95))},{f(Y(-0.3))} Z", hair)
    front = ellipse(cx, cy, r * 0.92, r, skin)
    # shadow on the far cheek (light from upper-left)
    front += path(f"M{f(X(0.35))},{f(Y(-0.85))} Q{f(X(1.0))},{f(Y(0.0))} {f(X(0.25))},{f(Y(0.96))} "
                  f"Q{f(X(0.75))},{f(Y(0.3))} {f(X(0.35))},{f(Y(-0.85))} Z", skin_sh, stroke="none")
    # ear
    front += ellipse(X(0.85), Y(0.08), r * 0.17, r * 0.26, skin, sw=1)
    if eyes:
        ey = Y(-0.02 + tilt)
        front += ellipse(X(-0.5), ey, r * 0.11, r * 0.15, OUT, stroke="none")
        front += ellipse(X(0.12), ey, r * 0.11, r * 0.15, OUT, stroke="none")
        if brows:
            front += stroke_line([(X(-0.66), ey - r * 0.3), (X(-0.33), ey - r * 0.36)], OUT, 1.1)
            front += stroke_line([(X(-0.02), ey - r * 0.36), (X(0.3), ey - r * 0.3)], OUT, 1.1)
    # nose
    front += stroke_line([(X(-0.32), Y(-0.15)), (X(-0.55), Y(0.28)), (X(-0.3), Y(0.32))], skin_sh, 1.1)
    if mouth and not beard:
        front += stroke_line([(X(-0.55), Y(0.58)), (X(-0.2), Y(0.6))], skin_sh, 1.1)
    if beard:
        front += path(f"M{f(X(-0.95))},{f(Y(0.05))} Q{f(X(-0.95))},{f(Y(1.55))} {f(X(-0.1))},{f(Y(1.75))} "
                      f"Q{f(X(0.85))},{f(Y(1.5))} {f(X(0.92))},{f(Y(0.25))} Q{f(X(0.6))},{f(Y(0.95))} {f(X(0.05))},{f(Y(0.92))} "
                      f"Q{f(X(-0.5))},{f(Y(0.9))} {f(X(-0.95))},{f(Y(0.05))} Z", beard)
        front += path(f"M{f(X(-0.7))},{f(Y(0.5))} Q{f(X(-0.45))},{f(Y(0.25))} {f(X(-0.15))},{f(Y(0.5))} "
                      f"Q{f(X(-0.4))},{f(Y(0.62))} {f(X(-0.7))},{f(Y(0.5))} Z", beard, sw=1)
    if mustache and not beard:
        front += path(f"M{f(X(-0.75))},{f(Y(0.62))} Q{f(X(-0.45))},{f(Y(0.3))} {f(X(-0.12))},{f(Y(0.5))} "
                      f"Q{f(X(0.1))},{f(Y(0.35))} {f(X(0.3))},{f(Y(0.6))} Q{f(X(0.1))},{f(Y(0.62))} {f(X(-0.12))},{f(Y(0.56))} "
                      f"Q{f(X(-0.45))},{f(Y(0.9))} {f(X(-0.75))},{f(Y(0.62))} Z", mustache, sw=1)
    if hair and style != "none":
        front += path(f"M{f(X(-0.95))},{f(Y(-0.1))} C{f(X(-1.05))},{f(Y(-1.1))} {f(X(1.0))},{f(Y(-1.3))} {f(X(0.95))},{f(Y(-0.05))} "
                      f"C{f(X(0.75))},{f(Y(-0.5))} {f(X(0.35))},{f(Y(-0.62))} {f(X(-0.05))},{f(Y(-0.58))} "
                      f"C{f(X(-0.45))},{f(Y(-0.55))} {f(X(-0.75))},{f(Y(-0.35))} {f(X(-0.95))},{f(Y(-0.1))} Z", hair)
        if hair_sh:
            front += stroke_line([(X(0.3), Y(-0.95)), (X(0.75), Y(-0.6)), (X(0.85), Y(-0.2))], hair_sh, 1.6)
    return behind, front


def svg(elements, defs="", shadow=(60, 128, 34, 6)):
    body = "".join(elements)
    d = f"<defs>{defs}</defs>" if defs else ""
    sx, sy, rx, ry = shadow
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">{d}'
            f'<ellipse cx="{sx}" cy="{sy}" rx="{rx}" ry="{ry}" fill="#000" fill-opacity=".18"/>'
            f'<g stroke="{OUT}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>')


def icon(elements, defs=""):
    body = "".join(elements)
    d = f"<defs>{defs}</defs>" if defs else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">{d}'
            f'<g stroke="{OUT}" stroke-width=".6" stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>')


# ---------------------------------------------------------------- horse

def horse(x0=0, y0=0, body="#8a5a2b", shade="#5a3a1a", hi="#a8783f", mane="#3a2a14",
          pose="gallop", hoof="#3a2a14", eye=True, scale=1.0):
    """Horse facing viewer's left, 3/4 view.  Returns dict of layers:
    far (far legs + tail), body, near (near legs), head (neck + head + mane).
    Rider goes between body and head/near so the neck overlaps the reins hand.
    Base pose occupies roughly x 2..118, y 30..126 at scale 1."""
    def T(px, py):
        return (x0 + px * scale, y0 + py * scale)
    def pts(*ps):
        return [T(a, b) for a, b in ps]
    W = lambda w: w * scale

    # leg joint sets: (top, knee/hock, fetlock, hoof-dir) ; dir -1 toe left
    poses = {
        "gallop": dict(
            far_front=[(38, 82), (24, 92), (10, 96)], near_front=[(44, 84), (36, 100), (24, 112)],
            far_hind=[(90, 82), (104, 92), (116, 96)], near_hind=[(86, 86), (94, 104), (104, 118)],
            body_tilt=0),
        "canter": dict(
            far_front=[(38, 82), (30, 100), (22, 118)], near_front=[(44, 84), (40, 94), (30, 102)],
            far_hind=[(90, 82), (100, 98), (104, 118)], near_hind=[(86, 86), (92, 104), (90, 122)],
            body_tilt=0),
        "trot": dict(
            far_front=[(38, 82), (34, 100), (30, 120)], near_front=[(44, 84), (40, 98), (28, 106)],
            far_hind=[(90, 82), (100, 100), (108, 118)], near_hind=[(86, 86), (90, 104), (84, 122)],
            body_tilt=0),
        "stand": dict(
            far_front=[(38, 82), (36, 100), (34, 120)], near_front=[(44, 84), (44, 102), (44, 122)],
            far_hind=[(90, 82), (96, 100), (98, 120)], near_hind=[(86, 86), (90, 104), (92, 122)],
            body_tilt=0),
    }
    P = poses[pose]

    def leg(j, col, sh, near):
        a, b, c = j
        w = [W(9 if near else 8), W(6.5), W(5)]
        s = tube(pts(a, b, c), w, col, sh if near else None, side=1)
        # hoof
        hx, hy = T(*c)
        dx, dy = c[0] - b[0], c[1] - b[1]
        ang = math.atan2(dy, dx)
        hw, hh = W(6), W(5)
        ux, uy = math.cos(ang), math.sin(ang)
        px, py = -uy, ux
        hp = [(hx + px * hw / 2 - ux * 1, hy + py * hw / 2 - uy * 1), (hx - px * hw / 2 - ux * 1, hy - py * hw / 2 - uy * 1),
              (hx - px * hw / 2 + ux * hh, hy - py * hw / 2 + uy * hh), (hx + px * hw / 2 + ux * hh, hy + py * hw / 2 + uy * hh)]
        s += poly(hp, hoof)
        return s

    far = leg(P["far_front"], shade, None, False) + leg(P["far_hind"], shade, None, False)
    # tail
    far += path(f"M{f(T(104,62)[0])},{f(T(104,62)[1])} C{f(T(118,66)[0])},{f(T(118,66)[1])} {f(T(119,84)[0])},{f(T(119,84)[1])} {f(T(112,96)[0])},{f(T(112,96)[1])} "
                f"C{f(T(114,84)[0])},{f(T(114,84)[1])} {f(T(110,74)[0])},{f(T(110,74)[1])} {f(T(100,70)[0])},{f(T(100,70)[1])} Z", mane)

    # barrel
    bd = (f"M{f(T(40,58)[0])},{f(T(40,58)[1])} C{f(T(52,52)[0])},{f(T(52,52)[1])} {f(T(86,50)[0])},{f(T(86,50)[1])} {f(T(102,60)[0])},{f(T(102,60)[1])} "
          f"C{f(T(110,66)[0])},{f(T(110,66)[1])} {f(T(106,84)[0])},{f(T(106,84)[1])} {f(T(92,88)[0])},{f(T(92,88)[1])} "
          f"C{f(T(80,94)[0])},{f(T(80,94)[1])} {f(T(54,94)[0])},{f(T(54,94)[1])} {f(T(42,88)[0])},{f(T(42,88)[1])} "
          f"C{f(T(32,82)[0])},{f(T(32,82)[1])} {f(T(32,64)[0])},{f(T(32,64)[1])} {f(T(40,58)[0])},{f(T(40,58)[1])} Z")
    bodyl = path(bd, body)
    bodyl += stroke_line(pts((50, 86), (70, 90), (92, 86)), shade, W(5))
    bodyl += stroke_line(pts((52, 58), (72, 55), (92, 58)), hi, W(3))

    near = leg(P["near_front"], body, shade, True) + leg(P["near_hind"], body, shade, True)

    # neck + head
    nk = (f"M{f(T(34,66)[0])},{f(T(34,66)[1])} C{f(T(30,56)[0])},{f(T(30,56)[1])} {f(T(22,42)[0])},{f(T(22,42)[1])} {f(T(18,34)[0])},{f(T(18,34)[1])} "
          f"L{f(T(34,30)[0])},{f(T(34,30)[1])} C{f(T(42,42)[0])},{f(T(42,42)[1])} {f(T(48,52)[0])},{f(T(48,52)[1])} {f(T(50,60)[0])},{f(T(50,60)[1])} Z")
    headl = path(nk, body)
    headl += stroke_line(pts((40, 40), (46, 56)), shade, W(4))
    # head: from poll (20,32) to muzzle (4,52)
    hd = (f"M{f(T(18,30)[0])},{f(T(18,30)[1])} L{f(T(32,30)[0])},{f(T(32,30)[1])} C{f(T(30,40)[0])},{f(T(30,40)[1])} {f(T(20,48)[0])},{f(T(20,48)[1])} {f(T(12,56)[0])},{f(T(12,56)[1])} "
          f"C{f(T(6,58)[0])},{f(T(6,58)[1])} {f(T(2,52)[0])},{f(T(2,52)[1])} {f(T(4,48)[0])},{f(T(4,48)[1])} "
          f"C{f(T(8,42)[0])},{f(T(8,42)[1])} {f(T(14,36)[0])},{f(T(14,36)[1])} {f(T(18,30)[0])},{f(T(18,30)[1])} Z")
    headl += path(hd, body)
    headl += stroke_line(pts((20, 42), (12, 52)), shade, W(3))
    # ears
    headl += poly(pts((20, 31), (17, 22), (24, 28)), body, sw=1.1)
    headl += poly(pts((28, 30), (29, 21), (33, 29)), body, sw=1.1)
    # nostril + mouth
    headl += circle(*T(6, 50), W(1.1), OUT, stroke="none")
    headl += stroke_line(pts((5, 54), (10, 55)), OUT, 1)
    if eye:
        headl += ellipse(*T(20, 37), W(1.6), W(1.9), OUT, stroke="none")
    # mane
    headl += path(f"M{f(T(33,30)[0])},{f(T(33,30)[1])} C{f(T(40,28)[0])},{f(T(40,28)[1])} {f(T(46,40)[0])},{f(T(46,40)[1])} {f(T(52,56)[0])},{f(T(52,56)[1])} "
                  f"L{f(T(46,54)[0])},{f(T(46,54)[1])} C{f(T(44,46)[0])},{f(T(44,46)[1])} {f(T(40,38)[0])},{f(T(40,38)[1])} {f(T(32,34)[0])},{f(T(32,34)[1])} Z", mane)
    headl += poly(pts((18, 30), (24, 26), (30, 30), (26, 32)), mane, sw=1)  # forelock
    return dict(far=far, body=bodyl, near=near, head=headl, T=T)


# ---------------------------------------------------------------- 16px icon parts

def ishoulders(col, y=10.5):
    return path(f"M1.5,16 C1.5,{f(y)} 5,{f(y-0.5)} 8,{f(y-0.5)} C11,{f(y-0.5)} 14.5,{f(y)} 14.5,16 Z", col)


def ihead(cx, cy, r, skin, hair=None, beard=None, eyes=True):
    s = circle(cx, cy, r, skin)
    if beard:
        s += path(f"M{f(cx-r)},{f(cy+r*0.15)} Q{f(cx-r*0.9)},{f(cy+r*1.5)} {f(cx)},{f(cy+r*1.6)} "
                  f"Q{f(cx+r*0.9)},{f(cy+r*1.5)} {f(cx+r)},{f(cy+r*0.15)} Q{f(cx)},{f(cy+r*0.75)} {f(cx-r)},{f(cy+r*0.15)} Z", beard, sw=0.5)
    if hair:
        s += path(f"M{f(cx-r)},{f(cy-r*0.05)} C{f(cx-r*1.05)},{f(cy-r*1.5)} {f(cx+r*1.05)},{f(cy-r*1.5)} {f(cx+r)},{f(cy-r*0.05)} "
                  f"Q{f(cx)},{f(cy-r*0.5)} {f(cx-r)},{f(cy-r*0.05)} Z", hair, sw=0.5)
    if eyes:
        s += circle(cx - r * 0.4, cy, r * 0.16, OUT, stroke="none") + circle(cx + r * 0.3, cy, r * 0.16, OUT, stroke="none")
    return s


def ihorsehead(x, y, col, mane, sh=None, big=False):
    """Small horse head pointing left, poll at (x, y)."""
    if big:
        s = path(f"M{f(x)},{f(y)} L{f(x+6)},{f(y+0.5)} C{f(x+7)},{f(y+5)} {f(x+4)},{f(y+7)} {f(x+1)},{f(y+10)} "
                 f"C{f(x-1.5)},{f(y+10.5)} {f(x-2.5)},{f(y+8)} {f(x-1.5)},{f(y+6)} Z", col)
        s += poly([(x + 1, y + 0.2), (x + 1.5, y - 2.8), (x + 3.5, y + 0.3)], col, sw=0.5)
        s += path(f"M{f(x+5.5)},{f(y+0.5)} C{f(x+8)},{f(y+2)} {f(x+8.5)},{f(y+5)} {f(x+8.5)},{f(y+9)} L{f(x+6.5)},{f(y+9)} C{f(x+6.5)},{f(y+6)} {f(x+6)},{f(y+3)} {f(x+4.5)},{f(y+1.5)} Z", mane, sw=0.5)
        s += circle(x + 1.5, y + 3, 0.7, OUT, stroke="none")
        return s
    s = path(f"M{f(x)},{f(y)} L{f(x+4)},{f(y+0.5)} C{f(x+4.5)},{f(y+4)} {f(x+2)},{f(y+6)} {f(x-1)},{f(y+8)} "
             f"C{f(x-3)},{f(y+8.5)} {f(x-3.5)},{f(y+6.5)} {f(x-2.5)},{f(y+5)} Z", col)
    s += poly([(x + 0.5, y + 0.2), (x + 1, y - 2.2), (x + 2.5, y + 0.3)], col, sw=0.5)
    s += path(f"M{f(x+3.5)},{f(y+0.5)} C{f(x+6)},{f(y+1.5)} {f(x+7)},{f(y+4)} {f(x+7.5)},{f(y+7)} L{f(x+5)},{f(y+7)} C{f(x+5)},{f(y+4)} {f(x+4)},{f(y+2)} {f(x+3)},{f(y+1.5)} Z", mane, sw=0.5)
    s += circle(x + 0.8, y + 2.6, 0.55, OUT, stroke="none")
    return s


# ---------------------------------------------------------------- palette + shared parts

SKIN, SKIN_SH, SKIN_HI = "#e8b98a", "#c48f62", "#f3d2ad"
IRON, IRON_SH, IRON_HI = "#9aa2aa", "#5f666d", "#c9ced3"
LEATH, LEATH_SH, LEATH_HI = "#8a5a2b", "#5a3a1a", "#a8783f"
BLUE, BLUE_SH, BLUE_HI = "#2f4f7a", "#1f3350", "#45689a"
FUR, FUR_SH, FUR_HI = "#7a5230", "#4e3218", "#9a7048"
BLOND, BLOND_SH = "#d9a74a", "#a5782a"
RED, RED_SH = "#b84a22", "#7e2e12"
GREY, GREY_SH = "#d8d2c4", "#a39c8c"
WOOD, WOOD_SH, WOOD_HI = "#8a5a2b", "#5a3a1a", "#b07a44"
WHITE, WHITE_SH = "#f0ece2", "#c4bdaa"
BLACK, BLACK_SH, BLACK_HI = "#3a3d42", "#22252a", "#5c6168"


def arm(sh, el, wr, col, shade=None, hi=None, w=(7.5, 6.5, 5.5), side=1):
    return tube([sh, el, wr], list(w), col, shade, hi, side=side)


def leg(hip, kn, an, col, shade=None, hi=None, w=(10.5, 8.5, 7), side=1):
    return tube([hip, kn, an], list(w), col, shade, hi, side=side)


def rings(x0, y0, x1, y1, rows, col="#c9ced3", step=4):
    """Mail texture: little arcs inside a box."""
    s = ""
    y = y0
    r = 0
    while y < y1:
        x = x0 + (step / 2 if r % 2 else 0)
        d = ""
        while x < x1:
            d += f"M{f(x)},{f(y)} a{step/2:.1f},{step/2.4:.1f} 0 0 0 {step:.0f},0 "
            x += step
        s += f'<path d="{d}" fill="none" stroke="{col}" stroke-width=".8"/>'
        y += step * 0.75
        r += 1
    return s


def spear(a, b, wood=WOOD, tip=IRON, tip_sh=IRON_SH, w=2.6, tiplen=14, tipw=5):
    """Shaft from a (butt) to b (point)."""
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L = (dx * dx + dy * dy) ** 0.5
    ux, uy = dx / L, dy / L
    px, py = -uy, ux
    sx, sy = bx - ux * tiplen, by - uy * tiplen
    s = tube([a, (sx, sy)], w, wood, cap=False)
    s += poly([(bx, by), (sx + px * tipw / 2 + ux * tiplen * 0.3, sy + py * tipw / 2 + uy * tiplen * 0.3),
               (sx, sy), (sx - px * tipw / 2 + ux * tiplen * 0.3, sy - py * tipw / 2 + uy * tiplen * 0.3)], tip, sw=1.1)
    s += stroke_line([(sx + ux * 3, sy + uy * 3), (bx - ux * 3, by - uy * 3)], tip_sh, 0.9)
    return s


def sword(hx, hy, ang, length=36, col=IRON, sh=IRON_SH, hilt="#c48a3a", bw=5):
    import math
    ux, uy = math.cos(ang), math.sin(ang)
    px, py = -uy, ux
    gx, gy = hx - ux * 7, hy - uy * 7      # pommel
    cx, cy = hx + ux * 2, hy + uy * 2      # cross guard
    tx, ty = hx + ux * length, hy + uy * length
    s = tube([(gx, gy), (hx, hy)], 3.4, LEATH_SH, cap=False)
    s += poly([(cx + px * bw / 2, cy + py * bw / 2), (tx, ty), (cx - px * bw / 2, cy - py * bw / 2)], col, sw=1.2)
    s += stroke_line([(cx + ux * 3, cy + uy * 3), (tx - ux * 4, ty - uy * 4)], sh, 1)
    s += tube([(cx + px * 5, cy + py * 5), (cx - px * 5, cy - py * 5)], 3, hilt, cap=False, sw=1)
    s += circle(gx, gy, 2.2, hilt, sw=1)
    return s


def round_shield(cx, cy, r, base, rim, boss="#9aa2aa", stripes=None, sh=None):
    s = circle(cx, cy, r, base)
    if sh:
        s += path(f"M{f(cx+r*0.1)},{f(cy-r*0.92)} A{f(r*0.92)},{f(r*0.92)} 0 0 1 {f(cx+r*0.1)},{f(cy+r*0.92)} "
                  f"A{f(r*0.6)},{f(r*0.92)} 0 0 0 {f(cx+r*0.1)},{f(cy-r*0.92)} Z", sh, stroke="none")
    if stripes:
        for a in (0, 1, 2, 3):
            import math
            ang = a * math.pi / 2 + math.pi / 4
            s += stroke_line([(cx + math.cos(ang) * r * 0.25, cy + math.sin(ang) * r * 0.25),
                              (cx + math.cos(ang) * r * 0.88, cy + math.sin(ang) * r * 0.88)], stripes, 2.4)
    s += circle(cx, cy, r, "none", stroke=rim, sw=2.6)
    s += circle(cx, cy, r, "none")
    s += circle(cx, cy, r * 0.3, boss)
    s += circle(cx - r * 0.08, cy - r * 0.1, r * 0.12, IRON_HI, stroke="none")
    return s


def belt(x0, y, x1, col=LEATH_SH, buckle="#c48a3a", h=4):
    s = poly([(x0, y - h / 2), (x1, y - h / 2 + 1), (x1, y + h / 2 + 1), (x0, y + h / 2)], col, sw=1)
    s += poly([(x0 + 9, y - h / 2 - 0.5), (x0 + 14, y - h / 2 - 0.3), (x0 + 14, y + h / 2 + 0.8), (x0 + 9, y + h / 2 + 0.5)], buckle, sw=1)
    return s



def great_helm(cx, cy, w=16, h=18, col=BLACK, sh=BLACK_SH, hi=BLACK_HI, cross=WHITE):
    s = path(f"M{f(cx-w/2)},{f(cy-h/2+3)} Q{f(cx)},{f(cy-h/2-5)} {f(cx+w/2)},{f(cy-h/2+3)} L{f(cx+w/2-1)},{f(cy+h/2)} L{f(cx-w/2+1)},{f(cy+h/2)} Z", col)
    s += stroke_line([(cx - w / 2 + 4, cy - h / 2 + 3), (cx - w / 2 + 3, cy + h / 2 - 3)], hi, 2)
    s += stroke_line([(cx + w / 2 - 4, cy - h / 2 + 2), (cx + w / 2 - 3, cy + h / 2 - 2)], sh, 2.4)
    s += stroke_line([(cx - w / 2 + 2, cy - 1), (cx + w / 2 - 2, cy - 1)], cross, 2.2)  # eye slit bar
    s += stroke_line([(cx - 2, cy - 5), (cx - 2, cy + 6)], cross, 1.6)
    s += stroke_line([(cx - w / 2 + 2, cy - 1.5), (cx + w / 2 - 2, cy - 1.5)], OUT, 1)
    return s



def crewman(x, y, s, tunic, tunic_sh, hair, lean=0.0, arms="push", beard=None, trousers=BLUE):
    """Small siege crew figure, scale s, feet at y, facing left, leaning forward (pushing)."""
    def P(a, b):
        return (x + a * s, y + b * s)
    e = []
    hb, hf = head(*P(-4 - lean * 20, -52), 7 * s, SKIN, SKIN_SH, hair, None, beard=beard)
    e.append(leg(P(4, -26), P(14, -12), P(16, 0), trousers, BLUE_SH, w=(7.5 * s, 6.5 * s, 5.5 * s)))
    e.append(boot(*P(16, 0), LEATH, LEATH_SH, w=9 * s, h=5 * s))
    e.append(leg(P(-2, -26), P(-8, -14), P(-6, 0), trousers, BLUE_SH, w=(7.5 * s, 6.5 * s, 5.5 * s)))
    e.append(boot(*P(-6, 0), LEATH, LEATH_SH, w=9 * s, h=5 * s))
    e.append(path(f"M{f(P(-10 - lean*20, -44)[0])},{f(P(-10 - lean*20, -44)[1])} L{f(P(4 - lean*20, -46)[0])},{f(P(4 - lean*20, -46)[1])} "
                  f"L{f(P(10, -26)[0])},{f(P(10, -26)[1])} L{f(P(-6, -24)[0])},{f(P(-6, -24)[1])} Z", tunic))
    e.append(belt(P(-6, -26)[0], P(0, -26)[1], P(10, -26)[0], LEATH_SH, IRON_SH, h=3 * s))
    if arms == "push":
        e.append(arm(P(-6 - lean * 20, -42), P(-18 - lean * 20, -40), P(-28 - lean * 20, -44), tunic, tunic_sh, w=(6 * s, 5.5 * s, 4.5 * s)))
        e.append(hand(*P(-29 - lean * 20, -45), SKIN, 2.6 * s))
    e.append(hb + hf)
    return "".join(e)




def tube_checks(pts, w, col, step=5, sw=0.9):
    """Check pattern on a limb: cross lines every `step` plus one long line."""
    if isinstance(w, (int, float)):
        w = [w] * len(pts)
    ns = _normals(pts)
    d = ""
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        seg = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(seg // step))
        for k in range(1, n + 1):
            t = k / (n + 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            wi = (w[i] + (w[i + 1] - w[i]) * t) * 0.36
            nx, ny = ns[i][0] * (1 - t) + ns[i + 1][0] * t, ns[i][1] * (1 - t) + ns[i + 1][1] * t
            d += f"M{f(x+nx*wi)},{f(y+ny*wi)} L{f(x-nx*wi)},{f(y-ny*wi)} "
    long = [(p[0] + n[0] * wi * 0.12, p[1] + n[1] * wi * 0.12) for p, n, wi in zip(pts, ns, w)]
    d += M(long)[0:]  # noqa
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}"/>'


def grid(x0, y0, x1, y1, col, step=6, sw=0.9, skew=0.0):
    """Check pattern over a box (for tunics): vertical + horizontal lines."""
    d = ""
    x = x0 + step / 2
    while x < x1:
        d += f"M{f(x)},{f(y0)} L{f(x+skew)},{f(y1)} "
        x += step
    y = y0 + step / 2
    while y < y1:
        d += f"M{f(x0)},{f(y)} L{f(x1)},{f(y)} "
        y += step
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}"/>'


def oval_shield(cx, cy, rx, ry, base, rim, boss="#c48a3a", sh=None, spine=True):
    s = ellipse(cx, cy, rx, ry, base)
    if sh:
        s += path(f"M{f(cx+rx*0.15)},{f(cy-ry*0.93)} A{f(rx*0.85)},{f(ry*0.93)} 0 0 1 {f(cx+rx*0.15)},{f(cy+ry*0.93)} "
                  f"A{f(rx*0.55)},{f(ry*0.93)} 0 0 0 {f(cx+rx*0.15)},{f(cy-ry*0.93)} Z", sh, stroke="none")
    if spine:
        s += path(f"M{f(cx-2)},{f(cy-ry*0.85)} L{f(cx+2)},{f(cy-ry*0.85)} L{f(cx+2)},{f(cy+ry*0.85)} L{f(cx-2)},{f(cy+ry*0.85)} Z", boss, sw=1)
    s += ellipse(cx, cy, rx, ry, "none", stroke=rim, sw=2.6)
    s += ellipse(cx, cy, rx, ry, "none")
    s += ellipse(cx, cy, rx * 0.32, ry * 0.22, boss)
    s += circle(cx - rx * 0.1, cy - ry * 0.06, rx * 0.1, "#e2b060", stroke="none")
    return s
