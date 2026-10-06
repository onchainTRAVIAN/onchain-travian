"""Core of the old-school troop art generator.

Drawing code emits a *display list* of parts (closed shapes, strokes, dots) in
the 120x140 picture space.  Two renderers turn the same list into SVG:

* BigRenderer  - soft cel shading: every shape gets its own shade colour, then a
  copy shifted up-left (filled with a highlight->base gradient) is drawn inside a
  clip of the shape, which leaves a hard shade rim on the lower-right side and a
  soft highlight on the upper-left.  Outline = darker tone of the material, thin.
* IconRenderer - 16x16: one dark silhouette pass (all shapes stroked), then flat
  fills on top, small details dropped.

Only svg,g,path,rect,circle,ellipse,polygon,polyline,line,defs,linearGradient,
radialGradient,clipPath (plus gradient stops) are used.
"""
import math

# ---------------------------------------------------------------- numbers ----

def fm(v):
    v = round(v, 1)
    if v == int(v):
        return str(int(v))
    s = f"{v:.1f}"
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def add(a, b): return (a[0] + b[0], a[1] + b[1])
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def mul(a, k): return (a[0] * k, a[1] * k)
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def length(a): return math.hypot(a[0], a[1])
def dist(a, b): return length(sub(a, b))


def norm(a):
    l = length(a) or 1.0
    return (a[0] / l, a[1] / l)


def perp(a):
    """Left-hand normal (for a downward vector it points to image-left)."""
    return (a[1], -a[0])


def rot(p, ang, c=(0, 0)):
    a = math.radians(ang)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


def polar(c, ang, r):
    a = math.radians(ang)
    return (c[0] + math.cos(a) * r, c[1] + math.sin(a) * r)


# ---------------------------------------------------------------- colours ----

def hexrgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgbhex(c):
    return '#' + ''.join(f"{max(0, min(255, int(round(v)))):02x}" for v in c)


def mix(a, b, t):
    A, B = hexrgb(a), hexrgb(b)
    return rgbhex(tuple(A[i] + (B[i] - A[i]) * t for i in range(3)))


def shade(c, t=0.3, toward="#2a1430"):
    """Darker, slightly cooler/purpler tone (painterly shadow)."""
    return mix(c, toward, t)


def light(c, t=0.35, toward="#fff6dc"):
    return mix(c, toward, t)


class Mat:
    """A material: base colour plus derived shade / highlight / outline."""
    _n = 0

    def __init__(self, base, sh=None, hl=None, line=None, metal=False, sh_t=0.32, hl_t=0.38, line_t=0.62):
        self.base = base
        self.sh = sh or shade(base, sh_t)
        self.hl = hl or light(base, hl_t)
        self.line = line or mix(base, "#2b1608", line_t)
        self.metal = metal
        Mat._n += 1
        self.key = Mat._n


# ---------------------------------------------------------------- splines ----

def P(*xy):
    return (xy[0], xy[1])


def C(x, y):
    """A sharp (corner) point."""
    return (x, y, 1)


def spline_d(pts, closed=True, tension=1.0):
    """Catmull-Rom through pts -> compact relative path data. 3-tuples are sharp corners."""
    n = len(pts)
    if n < 2:
        return ""
    xy = [(round(p[0], 1), round(p[1], 1)) for p in pts]
    sharp = [len(p) > 2 and p[2] for p in pts]

    def tan(i):
        if sharp[i]:
            return (0.0, 0.0)
        if closed:
            a, b = xy[(i - 1) % n], xy[(i + 1) % n]
        else:
            a = xy[max(i - 1, 0)]
            b = xy[min(i + 1, n - 1)]
        return mul(sub(b, a), tension / 6.0)

    out = [f"M{fm(xy[0][0])} {fm(xy[0][1])}"]
    segs = n if closed else n - 1
    prev_c2 = None
    last_cmd = None
    for i in range(segs):
        j = (i + 1) % n
        p0, p1 = xy[i], xy[j]
        if closed and j == 0 and sharp[i] and sharp[j]:
            break  # Z closes with a straight line
        t0, t1 = tan(i), tan(j)
        r = lambda q: (round(q[0] - p0[0], 1), round(q[1] - p0[1], 1))
        if t0 == (0.0, 0.0) and t1 == (0.0, 0.0):
            e = r(p1)
            cmd, args = "l", [e]
            prev_c2 = None
        else:
            c1 = add(p0, t0)
            c2 = sub(p1, t1)
            refl = None if prev_c2 is None else sub(mul(p0, 2), prev_c2)
            if refl is not None and abs(refl[0] - c1[0]) < 0.06 and abs(refl[1] - c1[1]) < 0.06:
                cmd, args = "s", [r(c2), r(p1)]
            else:
                cmd, args = "c", [r(c1), r(c2), r(p1)]
            prev_c2 = c2
        body = " ".join(f"{fm(a[0])} {fm(a[1])}" for a in args).replace(" -", "-")
        if cmd == last_cmd:
            out.append(("" if body.startswith("-") else " ") + body)
        else:
            out.append(cmd + body)
        last_cmd = cmd
    d = "".join(out)
    if closed:
        d += "z"
    return d


def ell_pts(c, rx, ry, ang=0, n=8, start=0):
    return [rot((c[0] + rx * math.cos(math.radians(start + i * 360 / n)),
                 c[1] + ry * math.sin(math.radians(start + i * 360 / n))), ang, c) for i in range(n)]


def limb(chain, radii, cap0=True, cap1=True):
    """Outline of a tapered limb along `chain`.

    radii[i] is a number or (a, b): `a` on the left-normal side of the travel
    direction (for a downward limb that is image-left / the front), `b` on the
    other.  Returns closed point list (smooth)."""
    n = len(chain)
    rs = [(r, r) if not isinstance(r, tuple) else r for r in radii]
    dirs = []
    for i in range(n):
        a = chain[max(i - 1, 0)]
        b = chain[min(i + 1, n - 1)]
        dirs.append(norm(sub(b, a)))
    left, right = [], []
    for i in range(n):
        nn = perp(dirs[i])
        left.append(add(chain[i], mul(nn, rs[i][0])))
        right.append(sub(chain[i], mul(nn, rs[i][1])))
    pts = list(left)
    d1 = dirs[-1]
    if cap1:
        r = (rs[-1][0] + rs[-1][1]) / 2
        pts.append(add(chain[-1], mul(d1, r * 0.8)))
    pts += right[::-1]
    if cap0:
        d0 = dirs[0]
        r = (rs[0][0] + rs[0][1]) / 2
        pts.append(sub(chain[0], mul(d0, r * 0.8)))
    return pts


def band(chain, w):
    """Straight-ish band (strap, shaft) of width w along chain, square ends."""
    n = len(chain)
    left, right = [], []
    for i in range(n):
        a = chain[max(i - 1, 0)]
        b = chain[min(i + 1, n - 1)]
        nn = perp(norm(sub(b, a)))
        left.append(add(chain[i], mul(nn, w / 2)))
        right.append(sub(chain[i], mul(nn, w / 2)))
    l = [C(*left[0])] + left[1:-1] + [C(*left[-1])]
    r = [C(*right[-1])] + right[::-1][1:-1] + [C(*right[0])]
    return l + r


# ---------------------------------------------------------------- display ----

class Part:
    __slots__ = ("kind", "pts", "mat", "sh", "lw", "detail", "color", "w", "closed", "op", "icon_w", "noline", "glow")

    def __init__(self, kind, pts, mat=None, sh=1.4, lw=0.75, detail=False, color=None, w=1.0,
                 closed=True, op=1.0, icon_w=None, noline=False, glow=None):
        self.kind, self.pts, self.mat, self.sh, self.lw = kind, pts, mat, sh, lw
        self.detail, self.color, self.w, self.closed, self.op = detail, color, w, closed, op
        self.icon_w, self.noline, self.glow = icon_w, noline, glow


class Canvas:
    """Collects parts.  Coordinates pass through the current affine transform."""

    def __init__(self):
        self.parts = []
        self.T = [(1, 0, 0, 1, 0, 0)]
        self.shadow = None  # (cx, cy, rx, ry)
        self.cull = 0.0     # drop detail parts smaller than this (w+h, picture px)

    def _keep(self, pts, detail):
        if not detail or not self.cull:
            return True
        q = [self.tp(p) for p in pts]
        xs = [a[0] for a in q]; ys = [a[1] for a in q]
        return (max(xs) - min(xs)) + (max(ys) - min(ys)) >= self.cull

    # transforms ------------------------------------------------------
    def push(self, sx=1.0, sy=None, tx=0.0, ty=0.0, flip=False):
        sy = sx if sy is None else sy
        a, b, c, d, e, f = self.T[-1]
        # new = current o (scale then translate)
        if flip:
            sx = -sx
        na, nb, nc, nd = a * sx, b * sx, c * sy, d * sy
        ne = a * tx + c * ty + e
        nf = b * tx + d * ty + f
        self.T.append((na, nb, nc, nd, ne, nf))

    def pop(self):
        self.T.pop()

    def tp(self, p):
        a, b, c, d, e, f = self.T[-1]
        q = (a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + f)
        return q + ((1,) if len(p) > 2 and p[2] else ())

    def scale(self):
        a, b, c, d, e, f = self.T[-1]
        return math.sqrt(abs(a * d - b * c))

    # parts -------------------------------------------------------------
    def shape(self, pts, mat, sh=1.4, lw=0.75, detail=False, op=1.0, noline=False, glow=None):
        if not self._keep(pts, detail):
            return
        s = self.scale()
        self.parts.append(Part("shape", [self.tp(p) for p in pts], mat, sh * s ** 0.5, lw, detail, op=op,
                               noline=noline, glow=glow))

    def flat(self, pts, color, detail=False, op=1.0, closed=True, line=None, lw=0.6):
        if not self._keep(pts, detail):
            return
        self.parts.append(Part("flat", [self.tp(p) for p in pts], line, 0, lw, detail, color=color, op=op,
                               closed=closed))

    def stroke(self, pts, color, w=0.8, detail=False, op=1.0, icon_w=None, closed=False):
        if not self._keep(pts, detail):
            return
        s = self.scale()
        self.parts.append(Part("stroke", [self.tp(p) for p in pts], None, 0, 0, detail, color=color,
                               w=w * s ** 0.6, op=op, icon_w=icon_w, closed=closed))

    def rod(self, a, b, w, mat, detail=False, sh=0.7):
        """Shaft / pole as a slim outlined band."""
        if ICON['on']:
            w *= 1.7
        self.shape(band([a, b], w), mat, sh=sh, lw=0.6, detail=detail)

    def dot(self, c, r, color, detail=True, op=1.0):
        self.flat(ell_pts(c, r, r, n=6), color, detail=detail, op=op)

    def ground(self, cx, cy, rx, ry):
        p = self.tp((cx, cy))
        s = self.scale()
        self.shadow = (p[0], p[1], rx * s, ry * s)


# ---------------------------------------------------------------- render -----

class IdGen:
    def __init__(self, prefix):
        self.prefix = prefix
        self.n = 0

    def __call__(self):
        s, n = "", self.n
        self.n += 1
        al = "abcdefghijklmnopqrstuvwxyz"
        while True:
            s = al[n % 26] + s
            n //= 26
            if n == 0:
                break
        return self.prefix + s


def _poly_d(pts, closed):
    return spline_d(pts, closed=closed)


ICON = {'on': False}   # set while building the 16px variant
SMALL_SH = 1.35
BIG_EPS = .3  # path simplification tolerance (px) for the big pictures
INK = "#18110c"
LWK = 1.9   # comic outline weight factor
SHK = 1.25  # shade offset factor  # parts with a smaller shade offset use a hard-stop gradient instead of a clip


def render_big(cv, prefix, size=(120, 140)):
    uid = IdGen(prefix)
    defs, body = [], []   # body items: ("p", attrs, d) mergeable path, or raw string
    grads = {}

    def grad(mat):
        if mat.key in grads:
            return grads[mat.key]
        g = uid()
        if mat.metal:
            stops = [(0, mat.hl), (.3, light(mat.hl, .35)), (.55, mat.base)]
        else:
            stops = [(0, mat.hl), (.5, mat.base)]
        st = "".join(f'<stop offset="{fm2(o)}" stop-color="{c}"/>' for o, c in stops)
        defs.append(f'<linearGradient id="{g}" x1="0" y1="0" x2=".75" y2="1">{st}</linearGradient>')
        grads[mat.key] = g
        return g

    def hard(mat, horiz):
        k = (mat.key, horiz)
        if k in grads:
            return grads[k]
        g = uid()
        if mat.metal:
            stops = [(0, mat.hl), (.25, light(mat.hl, .35)), (.5, mat.base), (.72, mat.base), (.72, mat.sh)]
        else:
            stops = [(0, mat.hl), (.42, mat.base), (.7, mat.base), (.7, mat.sh)]
        st = "".join(f'<stop offset="{fm2(o)}" stop-color="{c}"/>' for o, c in stops)
        xy = 'x2=".3" y2="1"' if horiz else 'x2="1" y2=".45"'
        defs.append(f'<linearGradient id="{g}" x1="0" y1="0" {xy}>{st}</linearGradient>')
        grads[k] = g
        return g

    if cv.shadow:
        cx, cy, rx, ry = cv.shadow
        g = uid()
        defs.append(f'<radialGradient id="{g}"><stop offset="0" stop-color="#3a2410" stop-opacity=".42"/>'
                    f'<stop offset=".6" stop-color="#3a2410" stop-opacity=".2"/>'
                    f'<stop offset="1" stop-color="#3a2410" stop-opacity="0"/></radialGradient>')
        body.append(f'<ellipse cx="{fm(cx)}" cy="{fm(cy)}" rx="{fm(rx)}" ry="{fm(ry)}" fill="url(#{g})" stroke="none"/>')

    def sw(w):
        w = round(w, 1)
        return "" if abs(w - 1.3) < .04 else f' stroke-width="{fm(w)}"'

    for p in cv.parts:
        opa = f' opacity="{fm2(p.op)}"' if p.op < 1 else ""
        if BIG_EPS and len(p.pts) > 5:
            p.pts = simplify(p.pts, BIG_EPS, p.kind != "stroke" and p.closed)
        if p.kind == "shape":
            m = p.mat
            d = _poly_d(p.pts, True)
            xs = [q[0] for q in p.pts]; ys = [q[1] for q in p.pts]
            if p.glow:
                gg = uid()
                defs.append(f'<radialGradient id="{gg}"><stop offset="0" stop-color="{p.glow}" stop-opacity=".7"/>'
                            f'<stop offset="1" stop-color="{p.glow}" stop-opacity="0"/></radialGradient>')
                cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
                r = max(max(xs) - min(xs), max(ys) - min(ys)) * 0.62 + 5
                body.append(f'<circle cx="{fm(cx)}" cy="{fm(cy)}" r="{fm(r)}" fill="url(#{gg})" stroke="none"/>')
            stroke = ' stroke="none"' if p.noline else sw(p.lw * LWK)
            base_fill = f'url(#{grad(m)})' if m.metal else m.base
            if p.sh < SMALL_SH:
                if m.metal and p.sh >= .25:
                    horiz = (max(xs) - min(xs)) > 1.7 * (max(ys) - min(ys))
                    base_fill = f'url(#{hard(m, horiz)})'
                body.append(("p", f' fill="{base_fill}"{stroke}{opa}', d))
                continue
            cid = uid()
            defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
            dx, dy = -p.sh * SHK, -p.sh * SHK * 0.8
            d2 = _poly_d([(q[0] + dx, q[1] + dy) + tuple(q[2:]) for q in p.pts], True)
            g_open = f'<g{opa}>' if opa else ""
            g_close = "</g>" if opa else ""
            body.append(f'{g_open}<path d="{d}" fill="{m.sh}"{stroke}/>'
                        f'<path d="{d2}" fill="{base_fill}" stroke="none" clip-path="url(#{cid})"/>{g_close}')
        elif p.kind == "flat":
            d = _poly_d(p.pts, p.closed)
            if p.closed:
                st = sw(p.lw * LWK) if p.mat else ' stroke="none"'
                body.append(("p", f' fill="{p.color}"{st}{opa}', d))
            else:
                body.append(("p", f' fill="none" stroke="{p.color}"{opa}', d))
        elif p.kind == "stroke":
            d = _poly_d(p.pts, p.closed)
            body.append(("p", f' fill="none" stroke="{p.color}"{sw(p.w)}{opa}', d))
    # merge consecutive paths with identical attributes (no stroke overlap issues
    # for fills without outline / for plain strokes)
    out = []
    for it in body:
        if isinstance(it, tuple) and out and isinstance(out[-1], list) and out[-1][0] == it[1] \
                and ('fill="none"' in it[1] or ('stroke="none"' in it[1] and "opacity" not in it[1])):
            out[-1][1] += it[2]
        elif isinstance(it, tuple):
            out.append([it[1], it[2]])
        else:
            out.append(it)
    html = "".join(f'<path d="{o[1]}"{o[0]}/>' if isinstance(o, list) else o for o in out)
    w, h = size
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'stroke="{INK}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">'
            f'<defs>{"".join(defs)}</defs>{html}</svg>')


def _rdp(pts, eps):
    if len(pts) < 4:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-9
    best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        dd = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L if L > 1e-6 else math.hypot(p[0] - a[0], p[1] - a[1])
        if len(p) > 2 and p[2]:
            dd = 1e9
        if dd > best:
            best, bi = dd, i
    if best > eps:
        return _rdp(pts[:bi + 1], eps)[:-1] + _rdp(pts[bi:], eps)
    return [a, b]


def simplify(pts, eps=.14, closed=True):
    if len(pts) <= 4:
        return pts
    if closed:
        # split at the point farthest from the first so both halves are open chains
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        a = _rdp(pts[:far + 1], eps)
        b = _rdp(pts[far:] + [pts[0]], eps)
        out = a[:-1] + b[:-1]
        return out if len(out) >= 3 else pts
    return _rdp(pts, eps)


def render_icon(cv, prefix, box, outline="#2a170c"):
    """box = (x0, y0, x1, y1) region of the 120x140 picture that maps into the
    16x16 icon (aspect kept, centred horizontally, bottom-aligned)."""
    x0, y0, x1, y1 = box
    s = min(15.4 / (x1 - x0), 15.2 / (y1 - y0))
    tx = 8 - (x0 + x1) / 2 * s
    ty = 15.6 - y1 * s
    T = lambda p: (p[0] * s + tx, p[1] * s + ty) + ((1,) if len(p) > 2 and p[2] else ())
    uid = IdGen(prefix)
    defs, under, over = [], [], []
    grads = {}

    def fill_of(m, big):
        if not big:
            return mix(m.base, m.hl, .2)
        if m.key not in grads:
            g = uid()
            grads[m.key] = g
            defs.append(f'<linearGradient id="{g}" x1="0" y1="0" x2="1" y2=".5"><stop offset=".62" '
                        f'stop-color="{mix(m.base, m.hl, .2)}"/><stop offset=".62" stop-color="{m.sh}"/>'
                        f'</linearGradient>')
        return f"url(#{grads[m.key]})"

    for p in cv.parts:
        if p.detail:
            continue
        pts = simplify([T(q) for q in p.pts], .3, p.kind != "stroke" and p.closed)
        xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
        size = (max(xs) - min(xs)) + (max(ys) - min(ys))
        if p.kind == "shape":
            if size < 1.3:
                continue
            d = _poly_d(pts, True)
            under.append(d)
            big = (max(xs) - min(xs)) > 3.2 and (max(ys) - min(ys)) > 3.2
            over.append((fill_of(p.mat, big), d))
        elif p.kind == "flat" and p.closed:
            if size < 1.3:
                continue
            over.append((p.color, _poly_d(pts, True)))
        elif p.kind == "stroke":
            if size < .9:
                continue
            w = p.icon_w if p.icon_w else max(p.w * s, 0.5)
            over.append(f'<path d="{_poly_d(pts, p.closed)}" fill="none" stroke="{p.color}" stroke-width="{fm2(w)}" '
                        f'stroke-linecap="round"/>')
    merged = []
    for it in over:
        if isinstance(it, tuple) and merged and isinstance(merged[-1], list) and merged[-1][0] == it[0]:
            merged[-1][1] += it[1]
        elif isinstance(it, tuple):
            merged.append([it[0], it[1]])
        else:
            merged.append(it)
    over = [f'<path d="{m[1]}" fill="{m[0]}"/>' if isinstance(m, list) else m for m in merged]
    outline = "#1c1009"
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">'
            + (f'<defs>{"".join(defs)}</defs>' if defs else "")
            + f'<path d="{"".join(under)}" fill="{outline}" stroke="{outline}" stroke-width="1.2" '
              f'stroke-linejoin="round"/>' + "".join(over) + "</svg>")


def fm2(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    if s.startswith("0."):
        s = s[1:]
    return s or "0"


GRASS = Mat("#6cb83a", sh="#3f8a22", hl="#a6e070", line="#18110c")
ROCK = Mat("#b8b4ac", sh="#8a857c", hl="#e2dfd8", line="#18110c")


def tuft(cv, x, y, s=1.0, flip=False):
    """Little comic grass tuft standing on the ground line y."""
    k = -1 if flip else 1
    pts = [C(x - 4 * s * k, y), (x - 3.2 * s * k, y - 2.4 * s), C(x - 4.6 * s * k, y - 6 * s), (x - 1.6 * s * k, y - 3 * s),
           C(x - .6 * s * k, y - 7.4 * s), (x + .6 * s * k, y - 3.2 * s), C(x + 3.6 * s * k, y - 5.6 * s),
           (x + 2.6 * s * k, y - 2 * s), C(x + 4 * s * k, y)]
    cv.shape(pts, GRASS, sh=0, lw=.5, detail=True)


def rock(cv, x, y, w=14, h=7):
    pts = [C(x - w / 2, y), (x - w * .42, y - h * .55), (x - w * .2, y - h), (x + w * .15, y - h * .9),
           (x + w * .42, y - h * .5), C(x + w / 2, y)]
    cv.shape(pts, ROCK, sh=1.0, lw=.6, detail=True)
    cv.stroke([(x - w * .1, y - h * .7), (x + w * .05, y - h * .3)], ROCK.sh, w=.6, detail=True)
