"""Painterly village-wall overlays (540x448) drawn round the village centre, plus the early spikes.

Original art. Same ring as the village background (scene/dorf2.svg): centre 270,222, radii 250x196
with a gentle wobble, gate gap at the bottom. Light from the top-left; the wall casts a soft shadow
to the bottom-right. Files: walls/{spikes, city, city-2..5, earth, earth-2..5, palisade, palisade-2..5}.svg
usage: python3 scripts/art/painterly/walls.py [names...]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plib_d import (Art, ROOT, n, pt, poly_d, lerp, mix, box, roof_x, roof_d, cone, face_lg, flag, save,  # noqa: E402
                    STONE, WOOD, WOOD_D, THATCH, TILE, GOLD, PLASTER, SLATE)

OUTDIR = os.path.join(ROOT, 'walls')
LIMIT = 80 * 1024

CX, CY, RX, RY = 270, 222, 250, 196          # same ring as the village background
SQ = RY / RX                                  # ground-plane squash
GATE_A = math.atan2((420 - 222) / 196, (300 - 270) / 250)
LG = (-.75, .66)                              # light direction in the ground plane (from the front-left)
FULL = (0, 0, 540, 448)


def kmod(a):
    return 1 + .018 * math.sin(3 * a + .7) + .012 * math.sin(5 * a + 2.1)


def ring(a, dr=0.0, z=0.0):
    """point on the wall line at angle a, pushed dr px outward (ground plane) and raised z px"""
    k = kmod(a)
    return (CX + math.cos(a) * (RX * k + dr), CY + math.sin(a) * (RY * k + dr * SQ) - z)


def adiff(a, b):
    return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def arc_angles(step, g, dr=0.0, a0=None, a1=None):
    """angles every `step` px along the ring from the left gate post round to the right one"""
    a0 = GATE_A + g if a0 is None else a0
    a1 = GATE_A + 2 * math.pi - g if a1 is None else a1
    out = []
    a = a0
    while a < a1:
        out.append(a)
        x1, y1 = ring(a, dr)
        x2, y2 = ring(a + .001, dr)
        a += step / (math.hypot(x2 - x1, y2 - y1) / .001)
    out.append(a1)
    return out


def runs(g, step=7.0):
    """the wall split into its three visible runs: front-left, back, front-right.
    Returns [(angles, front?)] with the shared end angles repeated so the runs join."""
    angs = arc_angles(step, g)
    fl = [a for a in angs if a <= math.pi] + [math.pi]
    bk = [math.pi] + [a for a in angs if math.pi < a < 2 * math.pi] + [2 * math.pi]
    fr = [2 * math.pi] + [a for a in angs if a >= 2 * math.pi]
    return [(fl, True), (bk, False), (fr, True)]


def light(a, front):
    nx, ny = (math.cos(a), math.sin(a)) if front else (-math.cos(a), -math.sin(a))
    return nx * LG[0] + ny * LG[1]          # -1 .. 1


def tower_angles(count, offset, clear, g):
    out = []
    for k in range(count):
        a = (GATE_A + offset + k / count * 2 * math.pi) % (2 * math.pi)
        if adiff(a, GATE_A) < clear:
            continue
        out.append(a)
    return out


def ring_towers(nb, nf, clear):
    """tower angles: nb spread over the back half including both ends (which hides the joins),
    nf on each front quarter between the end and the gate"""
    out = [math.pi + math.pi * i / (nb - 1) for i in range(nb)]
    for k in range(nf):
        t = (k + 1) / (nf + 1)
        out.append(math.pi - (math.pi - GATE_A - clear) * t)       # front-left
        out.append(GATE_A - clear - (GATE_A - clear) * (1 - t))    # front-right
    return [a % (2 * math.pi) for a in out]


def top_room(y, need):
    """scale factor so a structure `need` px tall standing at y stays inside the picture"""
    return max(.5, min(1.0, (y - 4) / need))


def _r(v):
    return round(v * 10)


def _seq(vals):
    """numbers (in tenths) joined compactly: no separator before a minus sign"""
    o = ''
    for v in vals:
        t = n(v / 10)
        o += t if (not o or t.startswith('-')) else ' ' + t
    return o


def pts_d(pts, close=True):
    """compact relative path through pts"""
    r = [(_r(x), _r(y)) for x, y in pts]
    d = f'M{_seq(r[0])}'
    if len(r) > 1:
        vals = []
        for (x1, y1), (x2, y2) in zip(r, r[1:]):
            vals += [x2 - x1, y2 - y1]
        d += 'l' + _seq(vals)
    return d + ('z' if close else '')


def band(angs, dr, z0, z1, dz=None):
    """face polygon along angs at offset dr from height z0 up to z1 (dz(a) optional extra)"""
    lo = [ring(a, dr, z0) for a in angs]
    hi = [ring(a, dr, z1 + (dz(a) if dz else 0)) for a in reversed(angs)]
    return lo + hi


def flat(angs, dr0, dr1, z):
    return [ring(a, dr0, z) for a in angs] + [ring(a, dr1, z) for a in reversed(angs)]


def wpoly(art, pts, fill, stroke=True, sw=None, op=None, extra=''):
    art.path(pts_d(pts), fill, stroke, sw, op, extra)


def polyline(angs, dr, z):
    return pts_d([ring(a, dr, z) for a in angs], False)


def grad_h(art, front, lit, sh, mid=None):
    """horizontal user-space gradient: front runs lit on the left, back runs lit on the right"""
    mid = mid or mix(lit, sh, .45)
    stops = [(0, lit), (.5, mid), (1, sh)] if front else [(0, sh), (.5, mid), (1, lit)]
    return art.lg(stops, 20, 0, 520, 0, user=True)


def face_grad(art, outer, front, lit, sh):
    """lighting across one run for the outer or inner face/slope; continuous where the runs meet"""
    if outer:
        vals = (.75, .66 if front else -.66, -.75)
    else:
        vals = (-.75, -.66 if front else .66, .75)
    stops = [(i / 2, mix(sh, lit, (v + 1) / 2)) for i, v in enumerate(vals)]
    return art.lg(stops, 20, 0, 520, 0, user=True)


def top_grad(art, lit, sh):
    """surfaces facing up: the same light on every run"""
    return art.lg([(0, lit), (1, sh)], 20, 0, 520, 448, user=True)


def ground_shadow(art, g, dr, width, op=.3, dx=3.0, dy=2.6, sd=2.2):
    d = ''
    for angs, _ in runs(g, 9):
        d += polyline(angs, dr, 0)
    art.path(d, 'none', '#2a1d0e', width, op, f' filter="{art.blur(sd, FULL)}" transform="translate({dx} {dy})" stroke-opacity="1"')


def ao_line(art, angs, dr, op=.35, w=1.6):
    art.path(polyline(angs, dr, 0), 'none', '#3a2a14', w, op, f' filter="{art.blur(.8, FULL)}" stroke-opacity="1"')


# =============================================================================================
# glyphs: stakes / logs
# =============================================================================================
def stake_grad(art, tier, wood):
    lit, mid, sh, dk = wood
    t = tier / 9                        # 0 shade .. 1 lit
    hi = mix(mix(mid, sh, .35), lit, t)
    return art.lg([(0, mix(hi, sh, .25)), (.3, hi), (.62, mix(mid, sh, .4 - .3 * t)), (1, mix(sh, dk, .6 - .3 * t))], 0, 0, 1, 0)


def stake_path(x, y, w, h, tip, lean=0.0, round_top=False):
    hw = w / 2
    return pts_d([(x - hw, y), (x - hw + lean, y - h), (x + lean, y - h - tip), (x + hw + lean, y - h), (x + hw, y)])


def stakes(art, g, dr, z, step, w, h, tip, wood, seed, lean_out=0.0, jit=.6, skip=0.0, hv=.12, round_top=False,
           only=None, sw=.55):
    """sharpened stakes along the ring, y-sorted per half, shaded by which way they face"""
    r = random.Random(seed)
    angs = arc_angles(step, g, dr)
    items = []
    for a in angs:
        if skip and r.random() < skip:
            continue
        if only and not only(a):
            continue
        front = math.sin(a) >= 0
        x, y = ring(a, dr + r.uniform(-jit, jit), z)
        hh = h * (1 + r.uniform(-hv, hv))
        # lean outward on the screen: front stakes lean down/out a little, sides lean sideways
        lean = lean_out * math.cos(a) + r.uniform(-.35, .35)
        tier = max(0, min(9, round(9.4 - (x - 20) / 500 * 8.4 - (0 if front else 1.2))))
        items.append((y, x, hh, lean, tier, front))
    # y-sort inside each quadrant (left/right of centre never overlap), then group runs of one shade
    out = {False: [], True: []}
    for front in (False, True):
        for left in (True, False):
            q = sorted(it for it in items if it[5] == front and (it[1] < CX) == left)
            cur, buf = None, []
            for y, x, hh, lean, tier, _f in q + [(0, 0, 0, 0, None, front)]:
                if tier != cur and buf:
                    out[front].append(f'<g fill="{stake_grad(art, cur, wood)}"><path d="{"".join(buf)}"/></g>' if False else
                                      f'<path d="{"".join(buf)}" fill="{stake_grad(art, cur, wood)}"/>')
                    buf = []
                cur = tier
                if tier is not None:
                    buf.append(stake_path(x, y, w, hh, tip, lean, round_top))
    return out


def emit_group(art, items, sw):
    if items:
        art.out.append(f'<g stroke-width="{sw}">')
        art.out.extend(items)
        art.out.append('</g>')


# =============================================================================================
# towers
# =============================================================================================
def round_tower(art, x, y, r, h, stone=STONE, roof=None, flag_c=None, slit=True, merlons=True, k=1.0, courses=True,
                gold=False):
    lit, mid, sh, dk = stone
    e = .4
    # shadow
    art.ell(x + r * .9, y + 2, r * 1.5, r * .55, '#2a1d0e', None, None, .28, f' filter="{art.blur(1.4)}"')
    d = f'M{pt(x - r, y)}V{n(y - h)}A{n(r)},{n(r * e)} 0 0 1 {pt(x + r, y - h)}V{n(y)}A{n(r)},{n(r * e)} 0 0 1 {pt(x - r, y)}Z'
    art.path(d, face_lg(art, stone, 'cyl'), True, .8)
    if courses:
        dd = ''
        kk = 3.0
        while kk < h - 1.5:
            dd += f'M{pt(x - r + .3, y - kk)}A{n(r)},{n(r * e)} 0 0 0 {pt(x + r - .3, y - kk)}'
            kk += 3.0
        art.line(dd, dk, .45, .45)
        # staggered joints
        dj = ''
        kk, row = 3.0, 0
        while kk < h - 1.5:
            for u in ((-.55, .05, .6) if row % 2 else (-.25, .35)):
                dj += f'M{pt(x + u * r, y - kk + r * e * math.sqrt(1 - u * u) - .1)}v-2.8'
            kk += 3.0
            row += 1
        art.line(dj, dk, .4, .35)
    # base plinth band
    art.path(f'M{pt(x - r - .6, y + .2)}A{n(r + .6)},{n((r + .6) * e)} 0 0 0 {pt(x + r + .6, y + .2)}V{n(y - 1.6)}A{n(r + .6)},{n((r + .6) * e)} 0 0 1 {pt(x - r - .6, y - 1.6)}Z',
             face_lg(art, stone, 'cyl'), True, .6)
    if slit:
        sy = y - h * .55
        art.path(f'M{pt(x - .9 * k, sy)}v{n(-3.4 * k)}a{n(.9 * k)},{n(.9 * k)} 0 0 1 {n(1.8 * k)},0v{n(3.4 * k)}Z', '#3b2a1c', True, .4)
    top = y - h
    if merlons or roof:
        # corbelled parapet
        R = r + 1.0
        art.path(f'M{pt(x - R, top + 2.2)}A{n(R)},{n(R * e)} 0 0 0 {pt(x + R, top + 2.2)}V{n(top)}A{n(R)},{n(R * e)} 0 0 1 {pt(x - R, top)}Z',
                 face_lg(art, stone, 'cyl'), True, .7)
        art.line(f'M{pt(x - R + .4, top + 2.6)}A{n(R)},{n(R * e)} 0 0 0 {pt(x + R - .4, top + 2.6)}', dk, .6, .5)
        if gold:
            art.line(f'M{pt(x - R, top + 1)}A{n(R)},{n(R * e)} 0 0 0 {pt(x + R, top + 1)}', GOLD[1], .9, 1)
    if roof:
        rc = roof
        rh = r * 2.1 + 2
        R = r + 2
        cone(art, x, top + .3, R, rh, rc, .4, 'tile')
        tip = top + .3 - rh
        if flag_c:
            flag(art, x, tip + .5, 7 * k, flag_c, GOLD[1], 7 * k)
        else:
            art.circ(x, tip - .4, 1, GOLD[1], True, .4)
    else:
        R = r + 1.0
        art.ell(x, top, R, R * e, art.lg([(0, lit), (1, mid)], 0, 0, 1, 1), True, .7)
        art.ell(x, top + .3, R * .72, R * e * .65, art.lg([(0, mix(sh, dk, .3)), (1, mid)]), None)
        if merlons:
            dd = ''
            for i in range(9):
                t = math.pi * i / 8
                mx, my = x - math.cos(t) * R * .9, top + math.sin(t) * R * e * .9
                dd += f'M{pt(mx - 1.1, my + .6)}v-2.8h2.2v2.8Z'
            art.path(dd, art.lg([(0, lit), (1, sh)], 0, 0, 1, 0), True, .5)
            # back merlons (lower contrast)
        if flag_c:
            art.line(f'M{pt(x, top)}v{n(-11 * k)}', '#5b4127', 1)
            flag(art, x, top - 11 * k + 5, 5, flag_c, GOLD[1], 7 * k)


def timber_tower(art, x, y, w, h, roofc=THATCH, roof='pyr', flag_c=None, legs=False, wood=WOOD, k=1.0, shield=None):
    """square timber watchtower centred on x, foot at y"""
    art.ell(x + w * .7, y + 1.5, w * 1.1, w * .4, '#2a1d0e', None, None, .28, f' filter="{art.blur(1.4)}"')
    d = w * .9
    x0 = x - w / 2
    if legs:
        lh = h * .45
        dd = (f'M{pt(x0 + .8, y)}L{pt(x0 + 1.2, y - lh)}M{pt(x0 + w - .8, y)}L{pt(x0 + w - 1.2, y - lh)}'
              f'M{pt(x0 + .8, y - 1)}L{pt(x0 + w - 1.2, y - lh)}M{pt(x0 + w - .8, y - 1)}L{pt(x0 + 1.2, y - lh)}')
        art.line(dd, wood[3], 1.5)
        art.line(dd, wood[1], .5, .8, ' transform="translate(-.3 0)"')
        b = box(art, x0, y - lh, w, h - lh, d, wood)
        body_y, body_h = y - lh, h - lh
    else:
        b = box(art, x0, y, w, h, d, wood)
        body_y, body_h = y, h
    # log courses
    dd = ''
    kk = 2.2
    while kk < body_h - .6:
        dd += f'M{pt(x0 + .4, body_y - kk)}h{n(w - .8)}'
        kk += 2.2
    art.line(dd, wood[3], .45, .6)
    (fx, fy), (bx, by), _, _ = b['S']
    dd = ''
    kk = 2.2
    while kk < body_h - .6:
        dd += f'M{pt(fx + .3, fy - kk)}L{pt(bx - .3, by - kk)}'
        kk += 2.2
    art.line(dd, wood[3], .4, .5)
    art.path(f'M{pt(x - .9, body_y - body_h + 3.4)}v3h1.8v-3Z', '#3b2c1c', True, .4)
    if shield:
        art.ell(x, body_y - body_h * .4, 2.4 * k, 2.6 * k, shield[0], True, .5)
        art.path(f'M{pt(x, body_y - body_h * .4 - 2.6 * k)}A{n(2.4 * k)},{n(2.6 * k)} 0 0 1 {pt(x, body_y - body_h * .4 + 2.6 * k)}Z', shield[1], None)
        art.circ(x, body_y - body_h * .4, .8 * k, GOLD[1], True, .4)
    top = y - h
    # overhanging fighting platform with a railing
    po = 1.4
    wpoly(art, [(x0 - po, top + 1.6), (x0 + w + po, top + 1.6), (x0 + w + po, top), (x0 - po, top)], face_lg(art, wood, 'front'), True, .6)
    art.line(f'M{pt(x0 - po + .4, top)}v-3.4M{pt(x, top)}v-3.4M{pt(x0 + w + po - .4, top)}v-3.4M{pt(x0 - po, top - 3.2)}h{n(w + 2 * po)}', wood[3], 1.0)
    top -= 3.4
    if roof == 'pyr':
        R = w / 2 + 2.4
        ax, ay = x + d * .25, top - w * 1.05
        wpoly(art, [(x + R, top), (x + R + d * .5, top - d * .36), (ax, ay)], face_lg(art, roofc, 'roofside'), True, .7)
        wpoly(art, [(x - R, top + .4), (x + R, top), (ax, ay)], face_lg(art, roofc, 'roof'), True, .7)
        dd = ''
        for i in range(-3, 4):
            dd += f'M{pt(x + i * R / 3.6, top + .2)}L{pt(ax + i * .25, ay + 1.4)}'
        art.line(dd, roofc[2], .4, .6)
        tip = (ax, ay)
    elif roof == 'gable':
        rf = roof_x(art, x0 - 1, top + 1, w + 2, d, w * .55, {'roof': roofc, 'gable': wood}, 1.0, 'thatch' if roofc == THATCH else 'shingle')
        tip = rf['R2']
    else:
        tip = (x, top)
    if flag_c:
        art.line(f'M{pt(*tip)}v-4', '#5b4127', .9)
        flag(art, tip[0], tip[1] - 4 + 4, 4, flag_c, GOLD[1], 6.5 * k)


# =============================================================================================
# spikes (levels 1-4, every tribe)
# =============================================================================================
def spikes():
    art = Art('sp', 540, 448, .8, .7)
    g = .062
    ground_shadow(art, g, 0, 4, .22, 2, 1.8, 1.6)
    for angs, front in runs(g, 9):
        art.path(polyline(angs, 0, 0), 'none', '#8a7550', 4.2, .35, ' stroke-opacity="1"')
    old = ('#cfae80', '#ae8a5e', '#86663f', '#5e462a')
    st = stakes(art, g, 0, 0, 4.6, 2.4, 7.4, 2.4, old, 11, lean_out=.9, jit=.9, skip=.04, hv=.18)
    emit_group(art, st[False], .55)
    for angs, front in runs(g, 9):
        if not front:
            art.line(polyline(angs, 0, 3.6), '#6d5232', .7, .85)
    emit_group(art, st[True], .55)
    for angs, front in runs(g, 9):
        if front:
            art.line(polyline(angs, 0, 3.6), '#6d5232', .7, .85)
    # gate: two rough posts with a crossbar
    L, R = ring(GATE_A + g), ring(GATE_A - g)
    for x, y in (L, R):
        art.path(f'M{pt(x - 1.8, y + .5)}V{n(y - 11)}Q{pt(x, y - 12.8)} {pt(x + 1.8, y - 11)}V{n(y + .5)}Z', stake_grad(art, 6, WOOD), True, .6)
    art.line(f'M{pt(L[0], L[1] - 9.5)}L{pt(R[0], R[1] - 9.5)}', WOOD[3], 1.3)
    art.line(f'M{pt(L[0], L[1] - 10)}L{pt(R[0], R[1] - 10)}', WOOD[0], .45)
    return art


# =============================================================================================
# palisade (Gauls)
# =============================================================================================
def palisade(stage):
    art = Art(f'pl{stage}', 540, 448, .8, .7)
    s = stage
    g = {1: .066, 2: .07, 3: .072, 4: .074, 5: .076}[s]
    h = {1: 8, 2: 11, 3: 12.5, 4: 14, 5: 15.5}[s]
    lw = {1: 3.0, 2: 3.2, 3: 3.4, 4: 3.5, 5: 3.6}[s]
    ground_shadow(art, g, 0, 5, .3)
    for angs, front in runs(g, 9):
        art.path(polyline(angs, 0, 0), 'none', '#9b8158', 5.5, .35, ' stroke-opacity="1"')
    st = stakes(art, g, 0, 0, lw * .86, lw, h, lw * .9, WOOD, 20 + s, lean_out=.2, jit=.25, hv=.07)
    rail = h * .62

    def rails(front):
        for angs, f in runs(g, 8):
            if f == front:
                if s >= 2:
                    art.line(polyline(angs, 0, rail), WOOD[3], 1.5, .9)
                    art.line(polyline(angs, 0, rail + .5), WOOD[0], .45, .8)
                if s >= 4:
                    art.line(polyline(angs, 0, h * .25), WOOD[3], 1.3, .85)
    emit_group(art, st[False], .55)
    rails(False)
    towers = []
    if s >= 3:
        th = {3: 22, 4: 25, 5: 28}[s]
        tw = {3: 9, 4: 10, 5: 11}[s]
        for a in ring_towers(4, {3: 0, 4: 1, 5: 2}[s], .5):
            x, y = ring(a)
            kk = top_room(y, th + tw * 1.2 + 6)
            towers.append((y, x, a, kk))
        towers.sort()
        for y, x, a, kk in towers:
            if math.sin(a) < 0:
                timber_tower(art, x, y + 1, tw * kk, th * kk, THATCH, 'pyr', ('#3f7a3a' if s >= 4 else None), k=kk,
                             shield=(('#3f7a3a', '#2c5a2a') if s == 5 else None))
    emit_group(art, st[True], .55)
    rails(True)
    for y, x, a, kk in towers:
        if math.sin(a) >= 0:
            timber_tower(art, x, y + 1, tw * kk, th * kk, THATCH, 'pyr', ('#3f7a3a' if s >= 4 else None), k=kk,
                         shield=(('#3f7a3a', '#2c5a2a') if s == 5 else None))
    gate_wood(art, g, h, s, THATCH, '#3f7a3a')
    return art


def gate_wood(art, g, h, s, roofc, flag_c):
    """timber gate: posts (stage 1-2) or two gate towers with a bridge (stage 3+)"""
    L, R = ring(GATE_A + g), ring(GATE_A - g)
    mid = lerp(L, R, .5)
    # doors
    gh = h * .95
    for (p1, p2, c) in ((L, mid, WOOD_D[1]), (mid, R, WOOD_D[0])):
        wpoly(art, [p1, p2, (p2[0], p2[1] - gh), (p1[0], p1[1] - gh)], art.lg([(0, c), (1, WOOD_D[2])], 0, 0, 1, 1), True, .6)
        dd = ''
        for t in (.25, .5, .75):
            q = lerp(p1, p2, t)
            dd += f'M{pt(q[0], q[1] - .4)}V{n(q[1] - gh + .4)}'
        art.line(dd, WOOD_D[3], .45, .7)
        art.line(f'M{pt(p1[0], p1[1] - gh * .25)}L{pt(p2[0], p2[1] - gh * .25)}M{pt(p1[0], p1[1] - gh * .75)}L{pt(p2[0], p2[1] - gh * .75)}', WOOD_D[3], .9)
    if s < 3:
        for x, y in (L, R):
            art.path(f'M{pt(x - 2.2, y + .5)}V{n(y - h - 5)}Q{pt(x, y - h - 7)} {pt(x + 2.2, y - h - 5)}V{n(y + .5)}Z', stake_grad(art, 6, WOOD), True, .6)
        if s == 2:
            art.line(f'M{pt(L[0] - 1, L[1] - h - 3)}L{pt(R[0] + 1, R[1] - h - 3)}', WOOD[3], 1.6)
            art.line(f'M{pt(L[0] - 1, L[1] - h - 3.5)}L{pt(R[0] + 1, R[1] - h - 3.5)}', WOOD[0], .5)
        return
    th = {3: 24, 4: 27, 5: 30}[s]
    tw = {3: 10, 4: 11, 5: 12}[s]
    # bridge between the towers
    by = h + 6
    wpoly(art, [(L[0], L[1] - by), (R[0], R[1] - by), (R[0], R[1] - by - 4), (L[0], L[1] - by - 4)], face_lg(art, WOOD, 'front'), True, .6)
    art.line(f'M{pt(L[0], L[1] - by - 2)}L{pt(R[0], R[1] - by - 2)}', WOOD[3], .5, .7)
    if s >= 4:
        roof_x(art, L[0] - 1, L[1] - by - 4, R[0] - L[0] + 2, 8, 6, {'roof': roofc, 'gable': WOOD}, 1.2, 'thatch' if roofc == THATCH else 'shingle')
    for x, y in (L, R):
        timber_tower(art, x, y + 2, tw, th, roofc, 'pyr', flag_c if s >= 4 else None,
                     shield=((flag_c, mix(flag_c, '#000000', .3)) if s == 5 else None))


# =============================================================================================
# earth wall (Teutons)
# =============================================================================================
EARTH = ('#c9b07e', '#a98c5c', '#86683f', '#634a2c')
GRASS = ('#d5e3a0', '#b7cb7c', '#95ad5c', '#6f8a40')


def earth(stage):
    art = Art(f'ea{stage}', 540, 448, .8, .7)
    s = stage
    g = {1: .062, 2: .066, 3: .07, 4: .072, 5: .076}[s]
    w = {1: 7, 2: 10, 3: 12, 4: 14, 5: 16}[s]           # rampart width (ground plane)
    hc = {1: 3.2, 2: 5, 3: 6.5, 4: 8, 5: 9.5}[s]         # crest height
    cw = w * .16
    ground_shadow(art, g, 0, w * .9, .28, 3.2, 2.8, 2.6)
    blur = art.blur(.9, FULL)
    towers = []
    if s >= 3:
        th = {3: 20, 4: 23, 5: 26}[s]
        tw = {3: 8.5, 4: 9.5, 5: 10.5}[s]
        for a in ring_towers(4, {3: 0, 4: 1, 5: 2}[s], .5):
            x, y = ring(a, 0, hc)
            kk = top_room(y, th + tw * 1.2 + 6)
            towers.append((y, x, a, kk))
        towers.sort()
    st = None
    if s >= 2:
        step = {2: 6.5, 3: 4.6, 4: 3.8, 5: 3.4}[s]
        sh_ = {2: 6, 3: 7, 4: 8, 5: 9}[s]
        st = stakes(art, g, 0, hc, step, 2.4 if s < 4 else 2.7, sh_, 2.4, WOOD, 40 + s, lean_out=1.2, jit=.3,
                    skip=.05 if s == 2 else 0, hv=.12)
    for half_front in (False, True):
        for angs, front in runs(g, 12):
            if front != half_front:
                continue
            near = w / 2 if front else -w / 2
            far = -near
            cn = cw if front else -cw
            # both slopes (the far one first) in soft bands: grass near the crest, bare earth at the foot;
            # blurred together so they read as smooth gradients, then lit per slope (outer/inner)
            bands = []
            washes = []
            for foot, crest_e, outer in ((far, -cn, not front), (near, cn, front)):
                for t0, t1, col in ((0, .5, GRASS[1]), (.45, 1.0, mix(EARTH[1], GRASS[2], .25))):
                    d0 = crest_e + (foot - crest_e) * t0
                    d1 = crest_e + (foot - crest_e) * t1
                    pts = [ring(a, d0, hc * (1 - t0 ** 1.4)) for a in angs] + [ring(a, d1, hc * (1 - t1 ** 1.4)) for a in reversed(angs)]
                    bands.append(f'<path d="{pts_d(pts)}" fill="{col}" stroke="none"/>')
                pts = [ring(a, crest_e, hc) for a in angs] + [ring(a, foot, 0) for a in reversed(angs)]
                washes.append((pts, outer))
            art.out.append(f'<g filter="{blur}">')
            art.out.extend(bands)
            art.out.append('</g>')
            for pts, outer in washes:
                wpoly(art, pts, face_grad(art, outer, front, '#fff6d8', '#2e2010'), None, None, .34)
            art.line(polyline(angs, far, 0), EARTH[3], .6, .4)
            # crest (walk) band
            wpoly(art, flat(angs, -cn, cn, hc), top_grad(art, GRASS[0], GRASS[1]), True, .6)
            # foot edge + grass texture
            art.line(polyline(angs, near, 0), EARTH[3], .8, .7)
            art.line(polyline(angs, cn * .2, hc + .1), '#eef5c8', .6, .6)
            ao_line(art, angs, near + (1.2 if front else -1.2), .25, 1.8)
            r = random.Random(len(angs) + s)
            dd = ''
            for a in angs:
                if r.random() < .5:
                    t = r.uniform(.15, .55)
                    x, y = ring(a, cn + (near - cn) * t, hc * (1 - t))
                    dd += f'M{pt(x - 1, y)}l.5,-1.4l.5,1.4l.5,-1.7l.5,1.7'
            art.line(dd, GRASS[3], .45, .8)
            if s >= 4:
                # stone revetment at the foot of the rampart
                wpoly(art, band(angs, near, 0, 2.2), face_grad(art, front, front, STONE[0], STONE[3]), True, .6)
                dd = ''
                for a in angs[::1]:
                    x, y = ring(a, near, 0)
                    dd += f'M{pt(x, y)}v-2.2'
                art.line(dd, STONE[3], .4, .5)
        # stakes and towers of this half
        if st:
            emit_group(art, st[half_front], .55)
            if s >= 4:
                for angs, front in runs(g, 8):
                    if front == half_front:
                        art.line(polyline(angs, 0, hc + 4), WOOD[3], 1.2, .85)
                        art.line(polyline(angs, 0, hc + 4.4), WOOD[0], .4, .8)
        for y, x, a, kk in towers:
            if (math.sin(a) >= 0) == half_front:
                timber_tower(art, x, y + 1, tw * kk, th * kk, THATCH if s < 5 else ('#9c7a52', '#7d5e3c', '#5e4429', '#45311d'),
                             'pyr', '#4f6e8c' if s >= 4 else None, legs=True, k=kk,
                             shield=(('#4f6e8c', '#2f4b66') if s == 5 else None))
    # gate cut through the rampart: timber-lined gate
    L, R = ring(GATE_A + g), ring(GATE_A - g)
    for (x, y), sgn in ((L, -1), (R, 1)):
        wpoly(art, [(x - 2.6, y + 1), (x + 2.6, y + 1), (x + 2.6, y - hc - 3), (x - 2.6, y - hc - 3)], face_lg(art, WOOD, 'front'), True, .6)
        art.line(f'M{pt(x - 2.4, y - 1)}h4.8M{pt(x - 2.4, y - 3.4)}h4.8M{pt(x - 2.4, y - 5.8)}h4.8', WOOD[3], .45, .7)
    if s >= 2:
        th = {2: 16, 3: 20, 4: 23, 5: 26}[s]
        tw = {2: 8, 3: 9, 4: 10, 5: 11}[s]
        mid = lerp(L, R, .5)
        wpoly(art, [(L[0], L[1] - th * .7), (R[0], R[1] - th * .7), (R[0], R[1] - th * .7 - 3.6), (L[0], L[1] - th * .7 - 3.6)], face_lg(art, WOOD, 'front'), True, .6)
        for (p1, p2) in ((L, mid), (mid, R)):
            wpoly(art, [p1, p2, (p2[0], p2[1] - hc - 4), (p1[0], p1[1] - hc - 4)], art.lg([(0, WOOD_D[0]), (1, WOOD_D[2])], 0, 0, 1, 1), True, .6)
        for x, y in (L, R):
            timber_tower(art, x, y + 2, tw, th, THATCH if s < 5 else ('#9c7a52', '#7d5e3c', '#5e4429', '#45311d'), 'pyr',
                         '#4f6e8c' if s >= 3 else None, legs=s >= 3,
                         shield=(('#4f6e8c', '#2f4b66') if s >= 4 else None))
    return art


# =============================================================================================
# city wall (Romans)
# =============================================================================================
def city(stage):
    art = Art(f'cw{stage}', 540, 448, .8, .7)
    s = stage
    g = {1: .058, 2: .06, 3: .07, 4: .072, 5: .074}[s]
    h = {1: 5, 2: 7, 3: 9, 4: 11, 5: 12.5}[s]
    t = {1: 3.6, 2: 4.2, 3: 4.8, 4: 5.4, 5: 6}[s]          # wall thickness
    mh = 2.6 if s < 4 else 3.0                             # merlon height
    st = STONE if s < 5 else ('#f6efdf', '#e2d6bb', '#b9a988', '#8a7a5e')
    lit, mid, sh, dk = st
    ground_shadow(art, g, t / 2, t + h * .5, .3, 3 + h * .25, 2.6 + h * .2, 2.4)
    towers = []
    if s >= 2:
        nb, nf = {2: (4, 0), 3: (4, 1), 4: (4, 2), 5: (5, 2)}[s]
        tr = {2: 6, 3: 7, 4: 8, 5: 8.5}[s]
        th = h + {2: 7, 3: 9, 4: 11, 5: 11}[s]
        for a in ring_towers(nb, nf, .42):
            x, y = ring(a, t / 2 - .5)
            need = th + (tr * 2.1 + 10 if s == 5 else 4)
            kk = top_room(y, need)
            towers.append((y, x, a, kk))
        towers.sort()
    for half_front in (False, True):
        for angs, front in runs(g, 10):
            if front != half_front:
                continue
            near = t / 2 if front else -t / 2
            far = -near
            ao_line(art, angs, near + (1 if front else -1), .3, 2)
            face = band(angs, near, 0, h)
            wpoly(art, face, face_grad(art, front, front, lit, mix(sh, dk, .35)), True, .8)
            # plinth / batter at the foot
            wpoly(art, band(angs, near + (.8 if front else -.8), 0, 1.6), face_grad(art, front, front, mid, dk), True, .6)
            # courses + staggered joints
            ch = 2.6
            dd = ''
            kk = 1.6 + ch
            while kk < h - .8:
                dd += polyline(angs[::2] + [angs[-1]], near, kk)
                kk += ch
            art.line(dd, dk, .45, .45)
            r = random.Random(s * 7 + len(angs))
            dense = arc_angles(5.5, g, near, angs[0], angs[-1])
            dj = ''
            kk, row = 1.6, 0
            while kk < h - 1.2:
                for i, a in enumerate(dense):
                    if (i + row) % 2 == 0 and r.random() < .85:
                        x, y = ring(a, near, kk)
                        dj += f'M{pt(x, y)}v{n(-min(ch, h - kk - .4))}'
                kk += ch
                row += 1
            art.line(dj, dk, .4, .35)
            # light catching the top edge
            art.line(polyline(angs, near, h - .5), lit, .7, .7)
            # walkway on top
            wpoly(art, flat(angs, -t / 2, t / 2, h), top_grad(art, mix(lit, mid, .2), mix(mid, sh, .5)), True, .7)
            if s >= 5:
                art.line(polyline(angs, near, h - 1.6), GOLD[1], .8, .9)
            # merlons on the outer edge
            if s >= 2:
                mf, mt = '', ''
                ma = arc_angles(5.2 if s < 4 else 4.6, g, t / 2, angs[0], angs[-1])
                md = 1.6
                for i in range(len(ma) - 1):
                    a0 = ma[i]
                    a1 = a0 + (ma[i + 1] - a0) * .55
                    o0, o1 = t / 2, t / 2 - md
                    nr = o0 if front else o1
                    pts = [ring(a0, nr, h), ring(a1, nr, h), ring(a1, nr, h + mh), ring(a0, nr, h + mh)]
                    mf += pts_d(pts)
                    tp = [ring(a0, o1, h + mh), ring(a1, o1, h + mh), ring(a1, o0, h + mh), ring(a0, o0, h + mh)]
                    mt += pts_d(tp)
                art.path(mf, face_grad(art, front, front, lit, mix(sh, dk, .35)), True, .6)
                art.path(mt, top_grad(art, '#fbf6ea', mid), True, .5)
        for y, x, a, kk in towers:
            if (math.sin(a) >= 0) == half_front:
                tr_ = tr * kk
                th_ = th * kk
                round_tower(art, x, y + 1.5, tr_, th_, st, roof=TILE if s == 5 else None, flag_c=('#b5402e' if s >= 4 else None),
                            merlons=True, k=kk, gold=s == 5)
    city_gate(art, g, h, t, s, st)
    return art


def city_gate(art, g, h, t, s, st):
    lit, mid, sh, dk = st
    L, R = ring(GATE_A + g, t / 2), ring(GATE_A - g, t / 2)
    if s == 1:
        for x, y in (L, R):
            wpoly(art, [(x - 2.4, y + .6), (x + 2.4, y + .6), (x + 2.4, y - h - 2), (x - 2.4, y - h - 2)], face_lg(art, st, 'front'), True, .6)
        return
    hg = {2: h + 4, 3: h + 9, 4: h + 11, 5: h + 13}[s]
    gw = R[0] - L[0]
    # gate block between the towers with an arched passage
    blk = [L, R, (R[0], R[1] - hg), (L[0], L[1] - hg)]
    wpoly(art, blk, face_lg(art, st, 'front'), True, .8)
    dd = ''
    kk = 2.6
    while kk < hg - .5:
        dd += f'M{pt(L[0] + .3, L[1] - kk)}L{pt(R[0] - .3, R[1] - kk)}'
        kk += 2.6
    art.line(dd, dk, .4, .45)
    aw = min(gw * .62, 14)
    ah = min(hg * .72, aw * .95 + 3)
    mx, my = (L[0] + R[0]) / 2, (L[1] + R[1]) / 2
    arch = f'M{pt(mx - aw / 2, my + .3)}V{n(my - ah + aw / 2)}A{n(aw / 2)},{n(aw / 2)} 0 0 1 {pt(mx + aw / 2, my - ah + aw / 2)}V{n(my + .3)}Z'
    art.path(arch, art.lg([(0, '#4a3a2c'), (1, '#1f1710')], 0, 0, 0, 1), True, .7)
    # doors ajar + portcullis
    art.path(f'M{pt(mx - aw / 2 + .5, my + .3)}V{n(my - ah + aw / 2 + .5)}l{n(aw * .28)},{n(aw * .1)}V{n(my + 1.2)}Z', art.lg([(0, WOOD_D[0]), (1, WOOD_D[2])]), True, .5)
    art.path(f'M{pt(mx + aw / 2 - .5, my + .3)}V{n(my - ah + aw / 2 + .5)}l{n(-aw * .28)},{n(aw * .1)}V{n(my + 1.2)}Z', art.lg([(0, WOOD_D[1]), (1, WOOD_D[3])]), True, .5)
    dd = ''
    for i in range(1, 6):
        x = mx - aw / 2 + aw * i / 6
        dd += f'M{pt(x, my - ah + aw / 2 - 1.5)}v{n(min(5, ah * .35))}'
    art.line(dd, '#2a2420', .6, .8)
    art.path(f'M{pt(mx - aw / 2 - 1.2, my - ah + aw / 2)}A{n(aw / 2 + 1.2)},{n(aw / 2 + 1.2)} 0 0 1 {pt(mx + aw / 2 + 1.2, my - ah + aw / 2)}', 'none', sh, 1.4)
    art.circ(mx, my - ah - .9, 1.1, GOLD[1] if s == 5 else mid, True, .4)
    # parapet merlons on the gate block
    dd = ''
    for i in range(int(gw / 4.4)):
        p = lerp((L[0], L[1] - hg), (R[0], R[1] - hg), (i + .5) / int(gw / 4.4))
        dd += f'M{pt(p[0] - 1.3, p[1] + .3)}v-3h2.6v3Z'
    art.path(dd, art.lg([(0, lit), (1, sh)], 0, 0, 1, 0), True, .5)
    if s >= 5:
        art.line(f'M{pt(L[0] + .5, L[1] - hg + 2)}L{pt(R[0] - .5, R[1] - hg + 2)}', GOLD[1], .9, 1)
        # banners hanging on the gate
        for u in (.2, .8):
            p = lerp((L[0], L[1] - hg + 1.5), (R[0], R[1] - hg + 1.5), u)
            art.path(f'M{pt(p[0] - 1.8, p[1])}v8l1.8,1.8l1.8,-1.8v-8Z', art.lg([(0, '#c4523c'), (1, '#8a2e22')]), True, .5)
            art.line(f'M{pt(p[0], p[1] + 3)}v2.5', GOLD[1], .8, .9)
    # flanking gate towers
    tr = {2: 6.5, 3: 8, 4: 9, 5: 9.5}[s]
    th = hg + {2: 3, 3: 4, 4: 6, 5: 6}[s]
    for x, y in (L, R):
        round_tower(art, x, y + 2, tr, th, st, roof=TILE if s == 5 else None, flag_c=('#b5402e' if s >= 3 else None), gold=s == 5)


# =============================================================================================
FILES = {'spikes': spikes}
for _s in range(1, 6):
    FILES['city' if _s == 1 else f'city-{_s}'] = (lambda s: lambda: city(s))(_s)
    FILES['earth' if _s == 1 else f'earth-{_s}'] = (lambda s: lambda: earth(s))(_s)
    FILES['palisade' if _s == 1 else f'palisade-{_s}'] = (lambda s: lambda: palisade(s))(_s)


def main(names):
    for nm in names:
        art = FILES[nm]()
        sz = save(art, os.path.join(OUTDIR, f'{nm}.svg'), LIMIT)
        print(f'{nm}: {sz} bytes')


if __name__ == '__main__':
    main(sys.argv[1:] or list(FILES))
