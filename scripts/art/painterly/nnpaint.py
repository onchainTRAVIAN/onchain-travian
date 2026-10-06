"""Painterly drawing kit for the Natar + Nature unit art (natars.py, nature.py).

Drawing model (same look as the painterly Romans):
  * organic shapes are given as outline points and turned into smooth closed
    Catmull-Rom curves (`blob`), limbs are tapered polygons along a smoothed
    centre line with per-joint widths (`limb`);
  * every fill colour becomes a lit->shade gradient (warm light from the top-left),
    metals get specular bands, cloth a satin sheen;
  * parts wrapped in V() get a volume filter: warm lit band inside the top-left
    edge, soft core shadow inside the bottom-right edge;
  * SH/LS are blurred painted shading shapes / strokes, `hair` / `scales` / `feathers`
    give clipped texture strokes; the ground shadow is blurred.

Per output file:  begin("nat3-") ... o = [...] ... return svg(o)
Only svg/g/path/circle/ellipse/polygon/line/defs/gradients/filter(blur/offset/merge/
flood/composite)/clipPath are emitted.  Original art.
"""
import math
import random

OUT = "#3b2a17"
OUTO = ".75"
WARM = "#fff1cf"
DEEP = "#22140e"


# ------------------------------------------------------------------ numbers + colour

def n(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else ("0" if s == "-0" else s)


def _rgb(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def _hex(r):
    return "#" + "".join(f"{max(0, min(255, round(v))):02x}" for v in r)


def mix(a, b, t):
    ra, rb = _rgb(a), _rgb(b)
    return _hex([x + (y - x) * t for x, y in zip(ra, rb)])


def lt(c, t):
    return mix(c, WARM, t)


def dk(c, t):
    return mix(c, DEEP, t)


# ------------------------------------------------------------------ per-file state

class _St:
    pfx = "x-"
    defs = {}
    modes = {}
    rnd = random.Random(1)
    n = 0


ST = _St()


def begin(pfx, modes=None, seed=1):
    ST.pfx = pfx
    ST.defs = {}
    ST.modes = dict(modes or {})
    ST.rnd = random.Random(seed)
    ST.n = 0


def nid(tag="c"):
    ST.n += 1
    return f"{ST.pfx}{tag}{ST.n}"


def _isc(c):
    return isinstance(c, str) and c.startswith("#") and len(c) == 7


def paint(c, mode=None):
    """flat colour -> gradient url (mode: lin, rad, metal, satin, vert, flat)"""
    if not _isc(c):
        return c
    mode = mode or ST.modes.get(c, "lin")
    if mode == "flat":
        return c
    key = f"{mode}{c[1:]}"
    gid = ST.pfx + key
    if key not in ST.defs:
        if mode == "rad":
            st = [(0, lt(c, .38)), (.5, c), (1, dk(c, .45))]
            g = f'<radialGradient id="{gid}" cx=".36" cy=".3" r=".8">'
        elif mode == "metal":
            st = [(0, lt(c, .7)), (.22, lt(c, .25)), (.5, dk(c, .3)), (.66, lt(c, .3)), (1, dk(c, .55))]
            g = f'<linearGradient id="{gid}" x1="0" y1="0" x2=".9" y2="1">'
        elif mode == "satin":
            st = [(0, lt(c, .4)), (.3, c), (.6, dk(c, .25)), (.75, lt(c, .08)), (1, dk(c, .5))]
            g = f'<linearGradient id="{gid}" x1=".1" y1="0" x2=".9" y2="1">'
        elif mode == "vert":
            st = [(0, lt(c, .3)), (.5, c), (1, dk(c, .4))]
            g = f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
        else:
            st = [(0, lt(c, .34)), (.42, c), (1, dk(c, .45))]
            g = f'<linearGradient id="{gid}" x1=".15" y1="0" x2=".85" y2="1">'
        g += "".join(f'<stop offset="{o}" stop-color="{s}"/>' for o, s in st)
        g += "</radialGradient>" if mode == "rad" else "</linearGradient>"
        ST.defs[key] = g
    return f"url(#{gid})"


def lgrad(stops, x1=0, y1=0, x2=1, y2=1, user=False):
    """custom linear gradient; stops = [(offset, colour[, opacity])]"""
    gid = nid("l")
    u = ' gradientUnits="userSpaceOnUse"' if user else ""
    s = "".join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{r[0]}"' if r else "") + "/>"
                for o, c, *r in stops)
    ST.defs[gid] = f'<linearGradient id="{gid}"{u} x1="{n(x1)}" y1="{n(y1)}" x2="{n(x2)}" y2="{n(y2)}">{s}</linearGradient>'
    return f"url(#{gid})"


_FILTERS = {
    "soft": '<feGaussianBlur stdDeviation=".8"/>',
    "soft2": '<feGaussianBlur stdDeviation="1.7"/>',
    "shadow": '<feGaussianBlur stdDeviation="2.4"/>',
    "tiny": '<feGaussianBlur stdDeviation=".35"/>',
    "vol": ('<feOffset in="SourceAlpha" dx="1" dy="1" result="a1"/>'
            '<feOffset in="SourceAlpha" dx="2.4" dy="2.4" result="a2"/>'
            '<feComposite in="a1" in2="SourceAlpha" operator="in" result="b1"/>'
            '<feComposite in="b1" in2="a2" operator="out" result="b2"/>'
            '<feGaussianBlur in="b2" stdDeviation=".6" result="b3"/>'
            '<feFlood flood-color="#fff0cc" flood-opacity=".5"/>'
            '<feComposite in2="b3" operator="in" result="lit"/>'
            '<feOffset in="SourceAlpha" dx="-.8" dy="-.8" result="d1"/>'
            '<feOffset in="SourceAlpha" dx="-3.4" dy="-3.4" result="d2"/>'
            '<feComposite in="d1" in2="SourceAlpha" operator="in" result="e1"/>'
            '<feComposite in="e1" in2="d2" operator="out" result="e2"/>'
            '<feGaussianBlur in="e2" stdDeviation="1.3" result="e3"/>'
            '<feFlood flood-color="#24120a" flood-opacity=".38"/>'
            '<feComposite in2="e3" operator="in" result="dk"/>'
            '<feMerge result="m"><feMergeNode in="dk"/><feMergeNode in="lit"/></feMerge>'
            '<feComposite in="m" in2="SourceAlpha" operator="in" result="mc"/>'
            '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="mc"/></feMerge>'),
}


def fx(name):
    key = "f" + name
    if key not in ST.defs:
        ST.defs[key] = (f'<filter id="{ST.pfx}{name}" filterUnits="userSpaceOnUse" x="-40" y="-40" width="200" '
                        f'height="220" color-interpolation-filters="sRGB">{_FILTERS[name]}</filter>')
    return f'filter="url(#{ST.pfx}{name})"'


# ------------------------------------------------------------------ geometry

def _cr(pts, closed, k=.5):
    """Catmull-Rom -> cubic bezier path data through pts."""
    m = len(pts)
    if m < 2:
        return ""
    if m == 2 and not closed:
        return f"M{n(pts[0][0])},{n(pts[0][1])} L{n(pts[1][0])},{n(pts[1][1])}"
    d = f"M{n(pts[0][0])},{n(pts[0][1])}"
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0 = pts[(i - 1) % m] if (closed or i > 0) else pts[0]
        p1, p2 = pts[i], pts[(i + 1) % m]
        p3 = pts[(i + 2) % m] if (closed or i + 2 < m) else pts[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3)
        d += f" C{n(c1[0])},{n(c1[1])} {n(c2[0])},{n(c2[1])} {n(p2[0])},{n(p2[1])}"
    return d + ("Z" if closed else "")


def blob(pts, k=1.0):
    """smooth closed outline through pts (tension k: 1 = round, .5 = tighter)"""
    return _cr(pts, True, k)


def curve(pts, k=1.0):
    return _cr(pts, False, k)


def poly_d(pts):
    return "M" + " L".join(f"{n(x)},{n(y)}" for x, y in pts) + "Z"


def _spline_samples(pts, step=2.2):
    """sample a Catmull-Rom centre line: returns [(x, y, seg, t)]"""
    m = len(pts)
    out = []
    for i in range(m - 1):
        p0 = pts[i - 1] if i > 0 else pts[0]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < m else pts[-1]
        ln = math.dist(p1, p2)
        k = max(2, int(ln / step))
        last = i == m - 2
        for j in range(k + (1 if last else 0)):
            t = j / k
            t2, t3 = t * t, t * t * t
            x = .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                      + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                      + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y, i, t))
    return out


def limb_d(pts, ws, bulge=None, cap0=True, cap1=True):
    """outline of a tapered limb along smoothed pts; ws = width at each point.
    bulge: optional list (one per segment) of extra width at the segment middle (muscle)."""
    sm = _spline_samples(pts)
    rows = []
    for idx, (x, y, i, t) in enumerate(sm):
        a = sm[max(0, idx - 1)]
        b = sm[min(len(sm) - 1, idx + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        ux, uy = dx / ln, dy / ln
        w = ws[i] + (ws[i + 1] - ws[i]) * t
        if bulge:
            w += bulge[i] * math.sin(math.pi * t) ** 1.5
        rows.append((x, y, -uy, ux, w, ux, uy))
    left = [(x + nx * w / 2, y + ny * w / 2) for x, y, nx, ny, w, _, _ in rows]
    right = [(x - nx * w / 2, y - ny * w / 2) for x, y, nx, ny, w, _, _ in rows]

    def cap(r, sign):
        x, y, nx, ny, w, ux, uy = r
        h = w / 2
        return [(x + (nx * math.cos(a) + sign * ux * math.sin(a)) * h, y + (ny * math.cos(a) + sign * uy * math.sin(a)) * h)
                for a in (math.pi * j / 4 for j in range(1, 4))]
    ring = left + (cap(rows[-1], 1) if cap1 else []) + right[::-1]
    if cap0:
        ring += [p for p in cap(rows[0], -1)][::-1]
    return "M" + " L".join(f"{n(x)},{n(y)}" for x, y in ring) + "Z", rows


# ------------------------------------------------------------------ primitives

def P(d, fill, sw=1.0, stroke=OUT, extra=""):
    so = f' stroke-opacity="{OUTO}"' if stroke == OUT else ""
    return f'<path d="{d}" fill="{paint(fill)}" stroke="{stroke}" stroke-width="{n(sw) if sw >= 1 else sw}"{so}{extra}/>'


def S(d, fill, op=None):
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<path d="{d}" fill="{paint(fill, "flat") if _isc(fill) else fill}" stroke="none"{o}/>'


def SG(d, fill, op=None):
    """unoutlined, gradient-filled"""
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<path d="{d}" fill="{paint(fill)}" stroke="none"{o}/>'


def SH(d, fill, op=.55, f="soft"):
    return f'<path d="{d}" fill="{fill}" stroke="none" fill-opacity="{op}" {fx(f)}/>'


def L(d, stroke, w=1.0, op=None):
    o = f' stroke-opacity="{op}"' if op is not None else (f' stroke-opacity="{OUTO}"' if stroke == OUT else "")
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}"{o}/>'


def LS(d, stroke, w=1.0, op=.6, f="soft"):
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}" stroke-opacity="{op}" {fx(f)}/>'


def V(*items):
    body = "".join(i if isinstance(i, str) else "".join(i) for i in items)
    return f'<g {fx("vol")}>{body}</g>'


def circ(cx, cy, r, fill, sw=1.0, stroke=OUT, mode="rad"):
    so = f' stroke-opacity="{OUTO}"' if stroke == OUT else ""
    return (f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{paint(fill, mode) if _isc(fill) else fill}" '
            f'stroke="{stroke}" stroke-width="{n(sw)}"{so}/>')


def ell(cx, cy, rx, ry, fill, sw=1.0, stroke=OUT, rot=0, mode="rad"):
    t = f' transform="rotate({n(rot)} {n(cx)} {n(cy)})"' if rot else ""
    so = f' stroke-opacity="{OUTO}"' if stroke == OUT else ""
    return (f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{paint(fill, mode) if _isc(fill) else fill}" '
            f'stroke="{stroke}" stroke-width="{n(sw)}"{so}{t}/>')


def dot(cx, cy, r, fill, op=None):
    o = f' fill-opacity="{op}"' if op is not None else ""
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{fill}" stroke="none"{o}/>'


def spec(cx, cy, rx, ry, op=.8, rot=0, col="#ffffff"):
    t = f' transform="rotate({n(rot)} {n(cx)} {n(cy)})"' if rot else ""
    return (f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{col}" fill-opacity="{op}" '
            f'stroke="none" {fx("soft")}{t}/>')


def rivet(cx, cy, r=.7, col="#a07420", hi="#fbe9a6"):
    return dot(cx, cy, r, col) + dot(cx - r * .3, cy - r * .3, r * .5, hi)


def clip(d, content):
    cid = nid("c")
    ST.defs[cid] = f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
    return f'<g clip-path="url(#{cid})">{content}</g>'


def limb(pts, ws, fill, bulge=None, lit=None, vol=True, sw=1.0, cap0=True, cap1=True, tex=None, over=None):
    """tapered limb with lit stripe; tex(d, rows) -> extra texture clipped to the limb"""
    d, rows = limb_d(pts, ws, bulge, cap0, cap1)
    s = P(d, fill, sw)
    lc = lit or (lt(fill, .45) if _isc(fill) else None)
    if lc:
        st = [(x - nx * w * .22 if (-nx - ny * .6) < 0 else x + nx * w * .22,
               y - ny * w * .22 if (-nx - ny * .6) < 0 else y + ny * w * .22) for x, y, nx, ny, w, _, _ in rows[2:-2]]
        if len(st) >= 2:
            s += (f'<path d="M{" L".join(f"{n(x)},{n(y)}" for x, y in st)}" fill="none" stroke="{lc}" '
                  f'stroke-width="{n(max(.8, min(r[4] for r in rows) * .28))}" stroke-opacity=".5" {fx("tiny")}/>')
    if tex:
        s += clip(d, tex(d, rows))
    if over:
        s += over(d, rows)
    return V(s) if vol else s


def limb_hair(rows, cols, ln=2.6, every=2, op=.55, w=.55, seed=0):
    """short hair strokes along a limb (use with limb(..., tex=...))"""
    r = random.Random(seed or len(rows))
    out = {c: "" for c in cols}
    k = 0
    for i in range(0, len(rows), every):
        x, y, nx, ny, wd, ux, uy = rows[i]
        for o in (-.3, 0, .3):
            px, py = x + nx * wd * o + r.uniform(-.4, .4), y + ny * wd * o
            L_ = ln * r.uniform(.7, 1.2)
            out[cols[k % len(cols)]] += f"M{n(px)},{n(py)} l{n(ux * L_ + nx * .3)},{n(uy * L_ + ny * .3)} "
            k += 1
    return "".join(L(d, c, w, op) for c, d in out.items() if d)


def hair(box, ang, count, ln, cols, seed=1, w=.55, op=.5, curl=.12):
    """random short hair strokes inside box, for clip()"""
    r = random.Random(seed)
    x0, y0, x1, y1 = box
    out = {c: "" for c in cols}
    for i in range(count):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        a = math.radians(ang + r.uniform(-10, 10))
        Ln = ln * r.uniform(.7, 1.25)
        ex, ey = x + math.cos(a) * Ln, y + math.sin(a) * Ln
        c = curl * Ln * r.choice((-1, 1))
        mx, my = (x + ex) / 2 - math.sin(a) * c, (y + ey) / 2 + math.cos(a) * c
        out[cols[i % len(cols)]] += f"M{n(x)},{n(y)} Q{n(mx)},{n(my)} {n(ex)},{n(ey)} "
    return "".join(L(d, c, w, op) for c, d in out.items() if d)


def scales(box, step, col, w=.55, op=.6, up=False, rowh=None, hi=None):
    """rows of overlapping arcs; hi = optional highlight colour for each arc top"""
    x0, y0, x1, y1 = box
    rowh = rowh or step * .7
    d, dh = "", ""
    r, y = 0, y0
    sw = 1 if up else 0
    while y < y1:
        x = x0 + (step / 2 if r % 2 else 0)
        while x < x1:
            d += f"M{n(x)},{n(y)} a{n(step / 2)},{n(step / 2.2)} 0 0 {sw} {n(step)},0 "
            if hi:
                dh += f"M{n(x + step * .2)},{n(y + step * .28)} q{n(step * .3)},{n(step * .2)} {n(step * .55)},0 "
            x += step
        y += rowh
        r += 1
    s = L(d, col, w, op)
    if hi:
        s += L(dh, hi, w * .8, op * .8)
    return s


def glint(x, y, s=1.0, op=.85):
    s *= .75
    return (L(f"M{n(x - 2.2 * s)},{n(y)} L{n(x + 2.2 * s)},{n(y)} M{n(x)},{n(y - 2.2 * s)} L{n(x)},{n(y + 2.2 * s)}",
              "#fffbe8", .5 * s, op * .6)
            + f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(1.1 * s)}" fill="#fffbe8" fill-opacity="{op}" stroke="none" {fx("tiny")}/>')


def eye(cx, cy, r, iris="#e8c23a", slit=False, look=-1):
    """animal eye with iris, pupil and catch-light"""
    s = circ(cx, cy, r, iris, .6, OUT)
    if slit:
        s += f'<ellipse cx="{n(cx + look * r * .1)}" cy="{n(cy)}" rx="{n(r * .28)}" ry="{n(r * .85)}" fill="#120a06"/>'
    else:
        s += dot(cx + look * r * .15, cy, r * .55, "#120a06")
    return s + dot(cx - r * .35, cy - r * .38, max(.4, r * .26), "#fffaf0", .95)


def beady(cx, cy, r):
    return (dot(cx, cy, r, "#140c08") + dot(cx - r * .32, cy - r * .35, max(.4, r * .35), "#fff6e6", .95)
            + f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r + .35)}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".5"/>')


def shadow(cx=60, rx=36, ry=6, cy=128, op=.32):
    return (f'<ellipse cx="{n(cx + 3)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="#2b1a0b" fill-opacity="{op}" {fx("shadow")}/>'
            f'<ellipse cx="{n(cx + 1)}" cy="{n(cy)}" rx="{n(rx * .55)}" ry="{n(ry * .5)}" fill="#2b1a0b" '
            f'fill-opacity="{op * .55:.2f}" {fx("soft")}/>')


def svg(body):
    content = "".join(body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><defs>{"".join(ST.defs.values())}</defs>'
            f'<g stroke-linejoin="round" stroke-linecap="round">{content}</g></svg>')
