"""Painterly building art, set D: iron foundry, grain mill, bakery, World Wonder (5 stages each),
plus the building site, the empty plot and the three wall icons.

Original art (never copied). usage: python3 scripts/art/painterly/buildings_d.py [ids...]
Writes src/web/public/img/buildings/<id>.svg and <id>-2..5.svg (viewBox 0 0 75 100).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plib_d import (Art, OUT, ROOT, n, pt, poly_d, lerp, mix, dep, DX, DY, face_lg, ground, shadow, tufts, pebbles,  # noqa: E402
                    box, roof_x, roof_d, roof_texture, cyl, cone, smoke, glow, window, door, stone_courses,
                    side_courses, planks, side_planks, sack, logpile, flag, save,
                    STONE, STONE_G, MARBLE, PLASTER, WOOD, WOOD_D, BRICK, CLAY, TILE, SLATE, THATCH, GOLD, IRON,
                    ORE, LEAF)

BLD = os.path.join(ROOT, 'buildings')
LIMIT = 40 * 1024


def fname(bid, stage):
    return os.path.join(BLD, f'{bid}.svg' if stage == 1 else f'{bid}-{stage}.svg')


# =============================================================================================
# shared props
# =============================================================================================
def ore_pile(a, cx, y, s=1.0, seed=1):
    r = random.Random(seed)
    w, h = 7 * s, 4.2 * s
    d = f'M{pt(cx - w, y)}C{pt(cx - w * .7, y - h * .7)} {pt(cx - w * .3, y - h)} {pt(cx, y - h)}C{pt(cx + w * .35, y - h)} {pt(cx + w * .75, y - h * .6)} {pt(cx + w, y)}Z'
    a.path(d, a.lg([(0, ORE[1]), (.5, ORE[2]), (1, ORE[3])], 0, 0, 1, 1))
    for _ in range(int(9 * s)):
        t = r.uniform(-.8, .8)
        lx = cx + t * w * .85
        top = y - h * (1 - abs(t) ** 1.6) * r.uniform(.25, .95)
        rr = r.uniform(.7, 1.2) * s
        a.ell(lx, top, rr * 1.2, rr * .85, a.rg([(0, '#c08a64'), (.5, ORE[1]), (1, ORE[3])], .35, .3, .7), True, .4)
    # rusty glints
    a.line(f'M{pt(cx - w * .35, y - h * .7)}l.8,-.3M{pt(cx + w * .1, y - h * .9)}l.7,-.2', '#e0a070', .5, .9)


def ingots(a, x, y, rows=2, cols=3, s=1.0):
    """stack of iron bars, (x, y) = front-left foot"""
    bw, bh, bd = 3.2 * s, 1.2 * s, 2.2 * s
    for j in range(rows):
        for i in range(cols - j):
            bx = x + i * (bw + .3) + j * bw * .5
            by = y - j * bh
            top = [(bx + .4, by - bh), (bx + bw - .4, by - bh), dep((bx + bw - .4, by - bh), bd), dep((bx + .4, by - bh), bd)]
            a.poly(top, a.lg([(0, IRON[0]), (1, IRON[1])], 0, 0, 1, 1), True, .4)
            a.poly([(bx, by), (bx + bw, by), (bx + bw - .4, by - bh), (bx + .4, by - bh)], a.lg([(0, IRON[1]), (1, IRON[2])]), True, .4)
            a.poly([(bx + bw, by), dep((bx + bw, by), bd), dep((bx + bw - .4, by - bh), bd), (bx + bw - .4, by - bh)], IRON[3], True, .4)


def furnace(a, cx, y, r, h, c=STONE_G, hoops=0, fire=1.0, top_r=None, mouth=True, seed=2):
    """tapered stone blast furnace with a glowing mouth at the foot and fire at the throat"""
    tr = top_r or r * .62
    cyl(a, cx, y, r, h, c, tr, top=False)
    # courses on the round body
    dd = ''
    k = 2.6
    while k < h - 1:
        t = k / h
        rr = r + (tr - r) * t
        dd += f'M{pt(cx - rr + .2, y - k)}A{n(rr)},{n(rr * .38)} 0 0 0 {pt(cx + rr - .2, y - k)}'
        k += 2.6
    a.line(dd, c[3], .35, .5)
    rnd = random.Random(seed)
    dj = ''
    k = 2.6
    row = 0
    while k < h - 1:
        t = k / h
        rr = r + (tr - r) * t
        for j in range(-2, 3):
            u = (j + (.5 if row % 2 else 0)) / 3.2 + rnd.uniform(-.05, .05)
            if abs(u) > .9:
                continue
            xx = cx + u * rr
            dj += f'M{pt(xx, y - k + .1 + rr * .38 * math.sqrt(max(0, 1 - u * u)))}v-2.4'
        k += 2.6
        row += 1
    a.line(dj, c[3], .3, .4)
    for i in range(hoops):
        t = (i + 1) / (hoops + 1)
        rr = r + (tr - r) * t
        yy = y - h * t
        a.path(f'M{pt(cx - rr, yy)}A{n(rr)},{n(rr * .38)} 0 0 0 {pt(cx + rr, yy)}', 'none', IRON[3], 1.1)
        a.path(f'M{pt(cx - rr * .8, yy + rr * .2)}A{n(rr)},{n(rr * .38)} 0 0 0 {pt(cx - rr * .1, yy + rr * .38)}', 'none', IRON[0], .4, .8)
    # throat: rim + fire
    ty = y - h
    a.ell(cx, ty, tr, tr * .38, a.lg([(0, c[1]), (1, c[2])]))
    a.ell(cx, ty + .1, tr * .7, tr * .26, a.rg([(0, '#fff2b0'), (.45, '#ffb040'), (1, '#c4441a')]), True, .4)
    if fire > 0:
        fl = tr * 1.6 * fire
        a.path(f'M{pt(cx - tr * .55, ty)}Q{pt(cx - tr * .5, ty - fl * .6)} {pt(cx - tr * .1, ty - fl)}Q{pt(cx + tr * .05, ty - fl * .55)} {pt(cx + tr * .25, ty - fl * .8)}'
               f'Q{pt(cx + tr * .55, ty - fl * .4)} {pt(cx + tr * .55, ty)}Z', a.lg([(0, '#fff6c4'), (.5, '#ffc04a'), (1, '#f07a22')]), None, None, .95)
        glow(a, cx, ty - fl * .3, tr * 2.2, tr * 1.6, .55 * fire)
    if mouth:
        mw, mh = r * .7, r * .75
        d = f'M{pt(cx - mw / 2, y + r * .3)}V{n(y + r * .3 - mh + mw / 2)}A{n(mw / 2)},{n(mw / 2)} 0 0 1 {pt(cx + mw / 2, y + r * .3 - mh + mw / 2)}V{n(y + r * .3)}Z'
        a.path(d, a.rg([(0, '#fff3b0'), (.4, '#ffae3c'), (1, '#9a3612')], .5, .8, .75), True, .6)
        glow(a, cx, y + r * .3 + .5, r * 1.1, r * .45, .9)


def chimney(a, x, y, w, h, d, c=BRICK, smoke_s=1.0, seed=1, bands=True):
    """square brick stack; (x, y) = front-left foot"""
    b = box(a, x, y, w, h, d, c)
    dd = ''
    k = 1.6
    while k < h - .5:
        dd += f'M{pt(x + .2, y - k)}H{n(x + w - .2)}'
        k += 1.6
    a.line(dd, c[3], .3, .45)
    side_courses(a, b['S'], 1.6, c, .35)
    # cap
    cap = box(a, x - .6, y - h + 1.2, w + 1.2, 1.6, d + .6, STONE_G, top=True, sw=.6)
    tx, ty = dep((x + w / 2, y - h - .4), d / 2)
    a.ell(tx, ty, w * .38, w * .2, '#2c211a', None)
    if smoke_s > 0:
        smoke(a, tx, ty - 2, smoke_s, 5, 1.0, seed)
    return (tx, ty)


def anvil(a, x, y, s=1.0):
    a.poly([(x - 1.5 * s, y), (x + 1.5 * s, y), (x + 1 * s, y - 1.6 * s), (x - 1 * s, y - 1.6 * s)], WOOD_D[2], True, .4)
    a.path(f'M{pt(x - 2.8 * s, y - 1.6 * s)}h{n(5 * s)}l{n(1.2 * s)},{n(-.8 * s)}h{n(-1.4 * s)}v{n(-.9 * s)}h{n(-4.8 * s)}Z',
           a.lg([(0, IRON[0]), (1, IRON[2])]), True, .4)


def cart(a, x, y, s=1.0, load=ORE, c=WOOD):
    w, h = 7 * s, 3 * s
    a.poly([(x, y - 1.2 * s), (x + w, y - 1.2 * s), (x + w + 1 * s, y - h - 1.2 * s), (x - 1 * s, y - h - 1.2 * s)], face_lg(a, c, 'front'), True, .5)
    planks(a, [(x, y - 1.2 * s), (x + w, y - 1.2 * s), (x + w, y - h - 1.2 * s), (x, y - h - 1.2 * s)], 1.2 * s, c, False, .5)
    for k in range(4):
        a.circ(x + 1.2 * s + k * 1.5 * s, y - h - 1.6 * s, .9 * s, a.rg([(0, mix(load[0], '#ffffff', .2)), (1, load[2])], .35, .3, .7), True, .35)
    for wx in (x + 1.4 * s, x + w - 1.4 * s):
        a.circ(wx, y - .4 * s, 1.5 * s, a.rg([(0, c[1]), (.7, c[2]), (1, c[3])]), True, .5)
        a.circ(wx, y - .4 * s, .45 * s, c[3], None)
    a.line(f'M{pt(x + w + .8 * s, y - 2.2 * s)}l{n(3 * s)},{n(1.3 * s)}', c[3], .8)


# =============================================================================================
# iron foundry
# =============================================================================================
def ironfoundry(stage):
    a = Art(f'if{stage}')
    s = stage
    ground(a, dirt=True)
    shadow(a, 42, 90, 28 + s, 7.5, .32)
    roofc = {'roof': SLATE if s < 3 else TILE, 'gable': STONE}
    hw = {1: 23, 2: 25, 3: 27, 4: 29, 5: 30}[s]
    hh = {1: 14, 2: 15.5, 3: 17, 4: 18.5, 5: 20}[s]
    hd = {1: 13, 2: 14, 3: 15, 4: 16, 5: 16}[s]
    hx, hy = {1: 27, 2: 27, 3: 26, 4: 25, 5: 25}[s], 88
    rise = {1: 8, 2: 8.5, 3: 9.5, 4: 10, 5: 11}[s]
    # chimneys behind the hall (drawn first: further back)
    ch = {1: 27, 2: 32, 3: 37, 4: 41, 5: 45}[s]
    cw = {1: 4.6, 2: 5, 3: 5.4, 4: 5.6, 5: 6}[s]
    chimney(a, hx + hw - cw - 2, hy - hd * .36 * .8, cw, ch, 4.5, BRICK if s > 2 else STONE_G, .9 + s * .08, s)
    if s >= 4:
        chimney(a, hx + 4, hy - hd * .36 * .95, cw - .8, ch - 9, 4, BRICK, .8, s + 7)
    # the smelting hall
    b = box(a, hx, hy, hw, hh, hd, STONE)
    stone_courses(a, b['F'], 2.7, STONE, s)
    side_courses(a, b['S'], 2.7, STONE)
    if s >= 3:
        for px in (hx, hx + hw - 2.2):
            box(a, px, hy, 2.2, hh, 1, STONE_G, sw=.5)
    dw = 6.5 + s * .5
    dh = 9 + s * .7
    door(a, hx + hw * .5 - dw / 2, hy, dw, dh, open_glow=True)
    glow(a, hx + hw * .5, hy + .6, dw * 1.1, 2.4, .8)
    a.line(f'M{pt(hx + hw * .5 - dw / 2 - .3, hy - dh + dw / 2)}A{n(dw / 2 + .3)},{n(dw / 2 + .3)} 0 0 1 {pt(hx + hw * .5 + dw / 2 + .3, hy - dh + dw / 2)}', STONE[3], 1.0, .9)
    if s >= 2:
        window(a, hx + 2.8 + (s >= 3), hy - 6.5, 2.6, 4, lit=True, arch=True)
        window(a, hx + hw - 5.6 - (s >= 3), hy - 6.5, 2.6, 4, lit=True, arch=True)
    sx, sy = dep((hx + hw, hy - hh * .45), hd * .5)
    a.path(f'M{pt(sx - 1, sy + 1.2)}l0,-3l2.2,-1.6l0,3Z', a.lg([(0, '#ffcc66'), (1, '#e0702a')]), True, .4)
    roof_x(a, hx, hy - hh, hw, hd, rise, roofc, kind='slate' if s < 3 else 'tile')
    if s >= 3:
        lx, ly = dep((hx + hw * .55, hy - hh - rise), hd / 2)
        box(a, lx - 3, ly + 1.4, 6, 3.4, 3, STONE_G, sw=.5)
        a.line(f'M{pt(lx - 2, ly - .3)}h4', '#ffb347', .9, .9)
        roof_x(a, lx - 3, ly - 2, 6, 3, 2.2, {'roof': roofc['roof'], 'gable': STONE_G}, .8, 'slate', False)
        smoke(a, lx + 1, ly - 6, .7, 3, 1.2, 9, .55)
    # the blast furnace on the left
    fr = {1: 6.4, 2: 6.9, 3: 7.4, 4: 7.9, 5: 8.4}[s]
    fh = {1: 16, 2: 19, 3: 24, 4: 28, 5: 32}[s]
    fx = hx - 8 - (s > 3) * .5
    furnace(a, fx, hy + 2.5, fr, fh, STONE_G if s < 5 else STONE, hoops=(s >= 2) + (s >= 4), fire=.6 + s * .12, seed=s)
    if s >= 2:
        bx, by = fx + fr - .5, hy + 5.5
        a.path(f'M{pt(bx, by)}l4.6,-1.4l1.8,-3.2l-1.3,-.9l-5.1,1.9Z', a.lg([(0, '#a8784a'), (1, '#6e4a2c')]), True, .5)
        a.line(f'M{pt(bx + .6, by - .9)}l3.7,-1.2M{pt(bx + .9, by - 1.9)}l3.5,-1.2', '#4e341f', .35, .7)
    ore_pile(a, 62, 94, .7 + s * .08, s)
    if s >= 2:
        ingots(a, 47, 97.5, 2 if s < 4 else 3, 3 if s < 4 else 4, .85)
    if s >= 3:
        anvil(a, 8, 95.5, 1)
    if s >= 4:
        cart(a, 61, 87, .65)
    if s == 5:
        a.path(f'M{pt(fx + 2, hy + 6)}Q{pt(fx + 6, hy + 9)} {pt(fx + 12, hy + 8.4)}', 'none', '#7a2a12', 2.4)
        a.path(f'M{pt(fx + 2, hy + 6)}Q{pt(fx + 6, hy + 9)} {pt(fx + 12, hy + 8.4)}', 'none', '#ffc45a', 1.2, None, ' stroke-opacity="1"')
        glow(a, fx + 7, hy + 8, 6.5, 2.6, .8)
        flag(a, hx + hw + hd * DX + 1.4, hy + hd * DY - hh + 1, 14, '#5a6e8c', '#e6bb4c')
        r2 = dep((hx + hw + .9, hy - hh - rise), hd / 2)
        a.circ(r2[0], r2[1] - .8, 1, GOLD[1], True, .4)
        r1 = dep((hx - .9, hy - hh - rise), hd / 2)
        a.circ(r1[0], r1[1] - .8, 1, GOLD[1], True, .4)
    tufts(a, [(6, 88), (68, 85), (22, 97.5), (40, 98)])
    return a


# =============================================================================================
# grain mill (tower windmill)
# =============================================================================================
def sail(a, hx, hy, ang, R, cloth, s=1.0):
    """one windmill sail: stock + lattice frame (+ cloth); ang in radians (screen)"""
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux                       # trailing side
    w = R * .24
    r0 = R * .2
    p1 = (hx + ux * r0, hy + uy * r0)
    p2 = (hx + ux * R, hy + uy * R)
    q1 = (p1[0] + vx * w, p1[1] + vy * w)
    q2 = (p2[0] + vx * w, p2[1] + vy * w)
    if cloth:
        a.poly([p1, p2, q2, q1], a.lg([(0, '#fbf3df'), (.6, '#efe2c2'), (1, '#cdbb92')], 0, 0, 1, 1), True, .5, .95)
        # cloth folds
        d = ''
        for t in (.33, .66):
            aa, bb = lerp(p1, q1, t), lerp(p2, q2, t)
            d += f'M{pt(*aa)}L{pt(*bb)}'
        a.line(d, '#bba878', .35, .7)
    else:
        a.poly([p1, p2, q2, q1], '#2b2016', True, .45, .12)
    # lattice: bars across + outer rail
    d = ''
    k = 5 + int(R / 4)
    for i in range(k + 1):
        t = i / k
        aa = lerp(p1, p2, t)
        bb = lerp(q1, q2, t)
        d += f'M{pt(*aa)}L{pt(*bb)}'
    d += f'M{pt(*q1)}L{pt(*q2)}'
    a.line(d, WOOD[3], .55 * s, .9)
    a.line(f'M{pt(*q1)}L{pt(*q2)}', WOOD[1], .3, .8)
    # stock (the main spar)
    a.line(f'M{pt(hx, hy)}L{pt(*p2)}', WOOD[3], 1.5 * s, 1)
    a.line(f'M{pt(hx + vx * -.2, hy + vy * -.2)}L{pt(p2[0] - vx * .2, p2[1] - vy * .2)}', WOOD[0], .5 * s, .9)


def grainmill(stage):
    a = Art(f'gm{stage}')
    s = stage
    ground(a)
    cx, y = 37, 88
    r1 = {1: 7.5, 2: 8.2, 3: 9, 4: 9.6, 5: 10.2}[s]
    h = {1: 25, 2: 29, 3: 33, 4: 36, 5: 39}[s]
    r2 = r1 * .7
    R = {1: 18, 2: 20, 3: 22, 4: 23.5, 5: 25}[s]
    shadow(a, cx + 7, y + 2, r1 + 9 + s, 5.5, .32)
    # granary shed on the right (stage 3+), behind the tower
    if s >= 2:
        sw = {2: 10, 3: 14, 4: 17, 5: 19}[s]
        sh = {2: 6.5, 3: 8, 4: 9, 5: 10}[s]
        sx = 47 if s == 2 else 46 + (s - 3) * .5
        b = box(a, sx, y + 3, sw, sh, 9, WOOD)
        planks(a, b['F'], 1.8, WOOD, True)
        side_planks(a, b['S'], 1.8, WOOD)
        door(a, sx + sw * .5 - 2.2, y + 3, 4.4, 6, arch=False)
        roof_x(a, sx, y + 3 - sh, sw, 9, 5, {'roof': THATCH if s < 5 else TILE, 'gable': WOOD}, 1.2, 'thatch' if s < 5 else 'tile')
    # fence bits (stage 4+)
    if s >= 4:
        d = ''
        for i in range(5):
            x = 6 + i * 3.2
            d += f'M{pt(x, y + 6 - i * .5)}v-4'
        a.line(d, WOOD[3], .9, .9)
        a.line(f'M{pt(5.5, y + 3.6)}L{pt(19.5, y + 1.6)}M{pt(5.5, y + 5.2)}L{pt(19.5, y + 3.2)}', WOOD[2], .8, .9)
    # tower body: stone plinth, gallery (stage 3+), plastered upper body
    gt = .42
    gy = y - h * gt
    rg_ = r1 + (r2 - r1) * gt

    def body(y0, y1):
        ra = r1 + (r2 - r1) * (y - y0) / h
        rb = r1 + (r2 - r1) * (y - y1) / h
        cyl(a, cx, y0, ra, y0 - y1, PLASTER, rb, top=False)

    def plinth(top):
        rs = r1 + (r2 - r1) * (y - top) / h
        cyl(a, cx, y, r1 + .3, y - top, STONE, rs + .3, top=False)
        dd = ''
        k = 2.4
        while k < y - top - .5:
            rr = r1 + .3 + (r2 - r1) * k / h
            dd += f'M{pt(cx - rr + .2, y - k)}A{n(rr)},{n(rr * .38)} 0 0 0 {pt(cx + rr - .2, y - k)}'
            k += 2.4
        a.line(dd, STONE[3], .35, .55)

    if s < 3:
        body(y, y - h)
    else:
        plinth(gy)
    door(a, cx - 2.6, y + r1 * .36, 5.2, 7.5)
    if s < 3:
        for k, t in enumerate((.48, .72)):
            if k == 1 and s < 2:
                continue
            window(a, cx - 1.1 - (k % 2) * 1.5, y - h * t + 2, 2.2, 3, arch=True)
    else:
        window(a, cx - 4.5, y - h * .25, 2, 2.6, arch=True)
        gr = rg_ + 3
        a.path(f'M{pt(cx - gr, gy)}A{n(gr)},{n(gr * .36)} 0 0 0 {pt(cx + gr, gy)}l0,1.2A{n(gr)},{n(gr * .36)} 0 0 1 {pt(cx - gr, gy + 1.2)}Z', WOOD[2], True, .5)
        a.ell(cx, gy, gr, gr * .36, a.lg([(0, WOOD[0]), (1, WOOD[2])]), True, .6)
        a.line(f'M{pt(cx - gr + 1, gy + 1.2)}L{pt(cx - rg_ - .2, gy + 4.5)}M{pt(cx + gr - 1, gy + 1.2)}L{pt(cx + rg_ + .2, gy + 4.5)}', WOOD[3], .7)
        d = ''
        for i in range(9):
            t = math.pi * i / 8
            px, py = cx - math.cos(t) * gr, gy - math.sin(t) * gr * .36
            d += f'M{pt(px, py)}v-2.6'
        d += f'M{pt(cx - gr, gy - 2.6)}A{n(gr)},{n(gr * .36)} 0 0 1 {pt(cx + gr, gy - 2.6)}'
        a.line(d, WOOD[3], .5, .7)
        body(gy, y - h)
        window(a, cx - 1.1, y - h * .7 + 2, 2.2, 3, arch=True)
        a.path(f'M{pt(cx - 1.4, gy)}V{n(gy - 5)}A1.4,1.4 0 0 1 {pt(cx + 1.4, gy - 5)}V{n(gy)}Z', a.lg([(0, '#4a3a2e'), (1, '#2b2119')]), True, .5)
        d = ''
        for i in range(9):
            t = math.pi * i / 8
            px, py = cx - math.cos(t) * gr, gy + math.sin(t) * gr * .36
            d += f'M{pt(px, py)}v-2.6'
        d += f'M{pt(cx - gr, gy - 2.6)}A{n(gr)},{n(gr * .36)} 0 0 0 {pt(cx + gr, gy - 2.6)}'
        a.line(d, WOOD[3], .6, .95)
        a.line(f'M{pt(cx - gr, gy - 2.9)}A{n(gr)},{n(gr * .36)} 0 0 0 {pt(cx + gr, gy - 2.9)}', WOOD[0], .3, .8)
    # cap
    ty = y - h
    capc = THATCH if s < 3 else TILE
    capH = {1: 9, 2: 10, 3: 11, 4: 12, 5: 13}[s]
    a.path(f'M{pt(cx - r2 - .6, ty + .3)}A{n(r2 + .6)},{n((r2 + .6) * .38)} 0 0 0 {pt(cx + r2 + .6, ty + .3)}l0,-1.2A{n(r2 + .6)},{n((r2 + .6) * .38)} 0 0 1 {pt(cx - r2 - .6, ty - .9)}Z', WOOD[2], True, .5)
    cr = r2 + 1.6
    if s < 3:
        cone(a, cx, ty - .6, cr, capH, capc, kind='thatch')
    else:
        # boat-shaped tiled cap
        d = (f'M{pt(cx - cr, ty - .6)}C{pt(cx - cr, ty - capH * .7)} {pt(cx - cr * .45, ty - capH)} {pt(cx, ty - capH)}'
             f'C{pt(cx + cr * .45, ty - capH)} {pt(cx + cr, ty - capH * .7)} {pt(cx + cr, ty - .6)}A{n(cr)},{n(cr * .38)} 0 0 1 {pt(cx - cr, ty - .6)}Z')
        a.path(d, face_lg(a, capc, 'cyl'))
        dd = ''
        for k in range(1, 4):
            yy = ty - .6 - capH * k / 4.2
            ww = cr * math.cos(math.asin(min(.98, k / 4.2))) * .98
            dd += f'M{pt(cx - ww, yy)}Q{pt(cx, yy + cr * .3)} {pt(cx + ww, yy)}'
        a.line(dd, capc[3], .4, .55)
        a.line(f'M{pt(cx - cr * .55, ty - capH * .45)}Q{pt(cx - cr * .45, ty - capH * .85)} {pt(cx - cr * .1, ty - capH * .95)}', '#ffffff', .6, .35)
    if s == 5:
        a.line(f'M{pt(cx, ty - capH)}v-3', OUT, .7)
        a.circ(cx, ty - capH - 3.3, 1.2, a.rg([(0, GOLD[0]), (1, GOLD[2])], .35, .3, .7), True, .4)
        flag(a, cx + 1.8, ty - capH + 1, 8, '#4f7a3a', '#e6bb4c', 5.5)
    # windshaft + sails (front plane), slightly turned
    hx, hy = cx + .6, ty - capH * .32
    base_ang = math.radians({1: -60, 2: -55, 3: -52, 4: -50, 5: -48}[s])
    for k in range(4):
        sail(a, hx, hy, base_ang + k * math.pi / 2, R, cloth=(k % 2 == 0) if s < 3 else (s >= 4 or k % 2 == 0))
    a.circ(hx, hy, 1.9, a.rg([(0, WOOD[0]), (1, WOOD[3])], .35, .3, .7), True, .6)
    a.circ(hx, hy, .7, IRON[2], None)
    # sacks
    sk = {1: [(24, 92)], 2: [(23, 92.5), (26.5, 94)], 3: [(23, 92.5), (26.5, 94), (51, 94)],
          4: [(22, 92.5), (25.5, 94), (51, 94.5), (54.5, 95.5)],
          5: [(21.5, 92.5), (25, 94), (28.5, 95.5), (51, 94.5), (54.5, 95.5), (58, 96)]}[s]
    for x, yy in sk:
        sack(a, x, yy, 1.35 + s * .04)
    if s >= 4:
        cart(a, 59, 98, .6, load=('#f1e4c2', '#ddc999', '#b8a070', '#8a7650'))
    tufts(a, [(8, 86), (66, 84), (16, 95), (44, 98)])
    return a


# =============================================================================================
# bakery
# =============================================================================================
def timber_frame(a, F, c=WOOD_D, cross=True, posts=3):
    """half-timbering on a front face: frame, posts, rail and braces"""
    (x0, y0), (x1, _), (_, y1), _ = F
    w, h = x1 - x0, y0 - y1
    d = f'M{pt(x0 + .5, y0 - .4)}V{n(y1 + .5)}H{n(x1 - .5)}V{n(y0 - .4)}'
    ym = y1 + h * .5
    d += f'M{pt(x0 + .5, ym)}H{n(x1 - .5)}'
    for i in range(1, posts):
        x = x0 + w * i / posts
        d += f'M{pt(x, y0 - .4)}V{n(y1 + .5)}'
    if cross:
        d += f'M{pt(x0 + .6, ym)}L{pt(x0 + w / posts - .4, y1 + .6)}M{pt(x1 - .6, ym)}L{pt(x1 - w / posts + .4, y1 + .6)}'
    a.line(d, c[2], 1.1, .95)
    a.line(d, c[0], .3, .5, ' transform="translate(-.3 -.3)"')


def side_frame(a, S, c=WOOD_D):
    (fx, fy), (bx, by), (_, bty), (_, fty) = S
    h = fy - fty
    d = f'M{pt(fx + .4, fy - h * .5)}L{pt(bx - .3, by - h * .5)}M{pt((fx + bx) / 2, (fy + by) / 2)}l0,{n(-h)}'
    a.line(d, c[3], 1.0, .9)


def loaf(a, x, y, s=1.0, kind=0):
    w, h = 2.6 * s, 1.5 * s
    if kind == 1:   # round loaf
        w, h = 2 * s, 1.6 * s
    a.path(f'M{pt(x - w, y)}C{pt(x - w, y - h * 1.3)} {pt(x + w, y - h * 1.3)} {pt(x + w, y)}Z',
           a.rg([(0, '#f6cf86'), (.55, '#d89a4c'), (1, '#9a5a26')], .4, .3, .8), True, .45)
    if kind == 0:
        a.line(f'M{pt(x - w * .5, y - h * .5)}l{n(.7 * s)},{n(-.6 * s)}M{pt(x, y - h * .65)}l{n(.7 * s)},{n(-.6 * s)}M{pt(x + w * .45, y - h * .5)}l{n(.6 * s)},{n(-.5 * s)}', '#8a4e20', .35, .8)
    else:
        a.line(f'M{pt(x - w * .4, y - h * .7)}l{n(w * .8)},0', '#8a4e20', .35, .8)


def bread_oven(a, cx, y, r, c=CLAY, fire=1.0):
    """domed bread oven; (cx, y) = front foot centre"""
    h = r * 1.05
    base = r * .38
    # plinth
    a.path(f'M{pt(cx - r - 1, y)}v-2A{n(r + 1)},{n((r + 1) * .38)} 0 0 1 {pt(cx + r + 1, y - 2)}v2A{n(r + 1)},{n((r + 1) * .38)} 0 0 1 {pt(cx - r - 1, y)}Z',
           face_lg(a, STONE, 'front'), True, .6)
    yb = y - 2
    d = f'M{pt(cx - r, yb)}C{pt(cx - r, yb - h * 1.1)} {pt(cx + r, yb - h * 1.1)} {pt(cx + r, yb)}A{n(r)},{n(base)} 0 0 1 {pt(cx - r, yb)}Z'
    a.path(d, a.rg([(0, mix(c[0], '#ffffff', .2)), (.45, c[1]), (.85, c[2]), (1, c[3])], .35, .25, .85))
    dd = ''
    for k in (1, 2, 3):
        t = k / 4
        dd += f'M{pt(cx - r * (1 - t * t * .7), yb - h * t * .78)}Q{pt(cx, yb - h * t * .78 + r * .25)} {pt(cx + r * (1 - t * t * .7), yb - h * t * .78)}'
    a.line(dd, c[3], .35, .5)
    # mouth
    mw, mh = r * .9, r * .8
    a.path(f'M{pt(cx - mw / 2, yb + base * .8)}V{n(yb + base * .8 - mh + mw / 2)}A{n(mw / 2)},{n(mw / 2)} 0 0 1 {pt(cx + mw / 2, yb + base * .8 - mh + mw / 2)}V{n(yb + base * .8)}Z',
           a.rg([(0, '#fff0a8'), (.45, '#ffa83a'), (1, '#8a3410')], .5, .85, .8) if fire else '#2c211a', True, .6)
    a.path(f'M{pt(cx - mw / 2 - .8, yb + base * .8)}V{n(yb + base * .8 - mh + mw / 2)}A{n(mw / 2 + .8)},{n(mw / 2 + .8)} 0 0 1 {pt(cx + mw / 2 + .8, yb + base * .8 - mh + mw / 2)}V{n(yb + base * .8)}',
           'none', BRICK[2], .9)
    if fire:
        glow(a, cx, yb + base, r * 1.2, r * .5, .9 * fire)
    # flue
    fx = cx + r * .25
    fy = yb - h * .78
    a.poly([(fx - 1, fy + .8), (fx + 1, fy + .8), (fx + .8, fy - 2.4), (fx - .8, fy - 2.4)], face_lg(a, BRICK, 'cyl'), True, .5)
    return (fx, fy - 2.4)


def bakery(stage):
    a = Art(f'bk{stage}')
    s = stage
    ground(a)
    shadow(a, 41, 90, 27 + s, 7.5, .32)
    hx, hy = {1: 27, 2: 26, 3: 25, 4: 23, 5: 23}[s], 88
    hw = {1: 22, 2: 24, 3: 24, 4: 25, 5: 27}[s]
    hh = {1: 11, 2: 12, 3: 20, 4: 21, 5: 22}[s]
    hd = {1: 13, 2: 14, 3: 14, 4: 15, 5: 16}[s]
    rise = {1: 9, 2: 9.5, 3: 9.5, 4: 10, 5: 10.5}[s]
    roofc = {'roof': THATCH if s < 2 else TILE, 'gable': PLASTER}
    # side wing (stage 4+) behind on the right
    if s >= 4:
        wx = hx + hw - 2
        wb = box(a, wx, hy - hd * .36 * .5 - .5, 12, 11, 10, PLASTER)
        timber_frame(a, wb['F'], posts=2, cross=False)
        window(a, wx + 3.5, hy - 12, 2.6, 3.2)
        roof_x(a, wx, hy - hd * .36 * .5 - 11.5, 12, 10, 6, roofc, 1, 'tile')
    # chimney behind (stage 3+)
    if s >= 3:
        cx_, cy_ = dep((hx + hw * .72, hy - hh), hd * .55)
        chimney(a, cx_ - 2, cy_ + 4, 4, rise + 8, 3.5, STONE_G, .9, 4 + s)
    # house
    if s >= 5:
        # stone ground floor + timbered upper floor
        b0 = box(a, hx, hy, hw, 9, hd, STONE)
        stone_courses(a, b0['F'], 2.6, STONE, 5)
        side_courses(a, b0['S'], 2.6, STONE)
        b = box(a, hx - .4, hy - 9, hw + .8, hh - 9, hd, PLASTER)
        timber_frame(a, b['F'], posts=4)
        side_frame(a, b['S'])
    else:
        b = box(a, hx, hy, hw, hh, hd, PLASTER)
        timber_frame(a, b['F'], posts=3 if s < 3 else 4, cross=s >= 2)
        side_frame(a, b['S'])
    roof_x(a, hx, hy - hh, hw, hd, rise, roofc, kind='thatch' if s < 2 else 'tile')
    if s >= 3:
        # dormer
        dx_, dy_ = dep((hx + hw * .5 - 3, hy - hh - rise * .2), hd * .12)
        db = box(a, dx_, dy_, 6, 4.5, 3, PLASTER, sw=.5)
        window(a, dx_ + 1.8, dy_ - .8, 2.4, 2.8)
        roof_d(a, dx_, dy_ - 4.5, 6, 3.5, 3.2, {'roof': TILE, 'gable': PLASTER}, .6)
    # door + windows (ground floor)
    door(a, hx + 3, hy, 4.4, 7.4, arch=False)
    window(a, hx + hw - 9, hy - 3.5, 3.4, 3.4, lit=True)
    if s >= 3:
        for wx in (hx + 3.4, hx + hw * .5 - 1.4, hx + hw - 6.4):
            window(a, wx, hy - 13 - (s >= 5) * 1, 2.8, 3.4)
    # awning over the shop window (stage 2+)
    if s >= 2:
        ax0, ax1 = hx + hw - 11, hx + hw - 2
        ay = hy - 8
        a.poly([(ax0, ay), (ax1, ay), (ax1 + 1.2, ay + 3.2), (ax0 - 1.2, ay + 3.2)], a.lg([(0, '#e9d6a8'), (1, '#c9b07a')]), True, .5)
        d = ''
        for i in range(4):
            u0, u1 = i / 4, (i + .5) / 4
            d += poly_d([(ax0 + (ax1 - ax0) * u0, ay), (ax0 + (ax1 - ax0) * u1, ay), (ax0 - 1.2 + (ax1 - ax0 + 2.4) * u1, ay + 3.2), (ax0 - 1.2 + (ax1 - ax0 + 2.4) * u0, ay + 3.2)])
        a.path(d, '#b5543a', None, None, .9)
        # counter with loaves
        a.poly([(ax0 - .5, hy), (ax1 + .5, hy), (ax1 + .5, hy - 2.4), (ax0 - .5, hy - 2.4)], face_lg(a, WOOD, 'front'), True, .5)
        for i in range(3):
            loaf(a, ax0 + 1.6 + i * 2.8, hy - 2.4, .8, i % 2)
    # hanging sign (stage 4+): golden pretzel
    if s >= 4:
        sx, sy = hx - .5, hy - hh + 3.5
        a.line(f'M{pt(sx, sy)}h-4.4', IRON[3], .8)
        a.line(f'M{pt(sx - 1, sy)}l-1.8,1.6', IRON[3], .5)
        px, py = sx - 3.4, sy + 3.4
        col = GOLD[1] if s == 5 else '#c98a3e'
        a.path(f'M{pt(px - 2.2, py + .8)}C{pt(px - 3, py - 2.6)} {pt(px + .8, py - 2.6)} {pt(px, py + .2)}C{pt(px - .8, py - 2.6)} {pt(px + 3, py - 2.6)} {pt(px + 2.2, py + .8)}'
               f'C{pt(px + 1, py + 2.4)} {pt(px - 1, py + 2.4)} {pt(px - 2.2, py + .8)}', 'none', col, 1.1, None, ' stroke-opacity="1"')
        a.line(f'M{pt(sx - 3.4, sy)}v1', IRON[3], .4)
    # the bread oven on the left
    orr = {1: 6, 2: 6.6, 3: 7, 4: 7.4, 5: 7.8}[s]
    fl = bread_oven(a, hx - orr + .5, hy + 4, orr, CLAY if s < 4 else BRICK, 1)
    smoke(a, fl[0], fl[1] - 2, .7, 3, 1, 3 + s, .6)
    if s >= 5:
        bread_oven(a, hx + hw + 6, hy + 3.5, 4.6, BRICK, 1)
    # woodpile + bread baskets
    logpile(a, hx + hw - 1 if s < 4 else (56 if s == 4 else 52), 95.5 if s < 4 else (97 if s == 4 else 99), 3 if s < 3 else 4, 2 if s < 3 else 3, 1.1)
    if s >= 2:
        bx_ = hx + 11.5
        a.ell(bx_, 96.5, 3.4, 1.4, a.lg([(0, '#c99a5a'), (1, '#8a6034')]), True, .5)
        for i in range(3):
            loaf(a, bx_ - 2 + i * 2.1, 96.1, .6, (i + 1) % 2)
    if s == 5:
        flag(a, hx + hw + hd * DX + .8, hy + hd * DY - hh - 1, 12, '#b5543a', '#e6bb4c')
    tufts(a, [(7, 88), (67, 86), (30, 98)])
    return a


# =============================================================================================
# World Wonder (stepped marble monument with a temple crown; scaffolding while it is built)
# =============================================================================================
def scaffold(a, x0, x1, yb, yt, step=5.0, planks_at=(), c=WOOD, op=1.0):
    """timber scaffolding in front of a face: poles, ledgers, braces and plank decks"""
    d = ''
    xs = []
    x = x0
    while x <= x1 + .01:
        xs.append(x)
        x += step
    for x in xs:
        d += f'M{pt(x, yb)}V{n(yt - 1.5)}'
    y = yb - 4
    ledgers = []
    while y > yt:
        d += f'M{pt(x0 - .8, y)}H{n(xs[-1] + .8)}'
        ledgers.append(y)
        y -= 4.2
    for i in range(len(xs) - 1):
        if i % 2 == 0:
            d += f'M{pt(xs[i], yb - .5)}L{pt(xs[i + 1], max(yt, yb - 8))}'
    a.line(d, c[3], .9, .95 * op)
    a.line(d, c[1], .35, .8 * op, ' transform="translate(-.25 -.2)"')
    for yy in planks_at:
        a.poly([(x0 - .5, yy), (xs[-1] + .5, yy), (xs[-1] + 1.3, yy - .9), (x0 + .3, yy - .9)], c[0], True, .45)


def crane(a, x, y, h, boom, load=True, c=WOOD):
    """timber jib crane: mast with a treadwheel at its foot, boom, rope and a hanging block"""
    top = (x, y - h)
    tip = (x + boom, y - h - 4)
    a.line(f'M{pt(x - 2.5, y)}L{pt(*top)}L{pt(x + 2.5, y)}', c[3], 1.3)
    a.line(f'M{pt(x - 2.5, y)}L{pt(*top)}', c[1], .45)
    a.line(f'M{pt(x - 4, top[1] + 1.5)}L{pt(*tip)}', c[3], 1.2)
    a.line(f'M{pt(x - 4, top[1] + 1.2)}L{pt(*tip)}', c[0], .4)
    a.line(f'M{pt(*top)}L{pt(tip[0] - boom * .4, tip[1] + 1.5)}', c[3], .4)
    # treadwheel
    a.circ(x - 4.2, y - 3.5, 3.4, 'none', c[2], 1.1)
    a.line(f'M{pt(x - 7.6, y - 3.5)}h6.8M{pt(x - 4.2, y - 6.9)}v6.8M{pt(x - 6.6, y - 5.9)}l4.8,4.8M{pt(x - 6.6, y - 1.1)}l4.8,-4.8', c[2], .45)
    if load:
        ry = tip[1] + h * .55
        a.line(f'M{pt(*tip)}V{n(ry - 2.4)}', '#5a4630', .45, 1)
        block(a, tip[0] - 1.8, ry, 3.6, 2.4, 2.4)


def block(a, x, y, w, h, d, c=MARBLE):
    b = box(a, x, y, w, h, d, c, top=True, sw=.5)
    return b


def tier(a, cx, y0, w, d, inset, z, h, c=MARBLE, top=True, gold=False, seed=0):
    """one stepped tier of the monument, inset (x inset, depth inset) from the base footprint"""
    ix, idp = inset
    x = cx - w / 2 + ix
    fx, fy = dep((x, y0 - z), idp)
    ww, dd = w - 2 * ix, d - 2 * idp
    if ix > 0:
        a.poly([(fx - 1.2, fy + .9), (fx + ww + 1.2, fy + .9), dep((fx + ww + 1.2, fy + .9), dd), (fx + ww, fy - 1)], '#5a4630', None, None, .22,
               f' filter="{a.blur(.7)}"')
    b = box(a, fx, fy, ww, h, dd, c, top=top)
    # block courses
    stone_courses(a, b['F'], 2.6 if h > 5 else h / 2, c, seed, True, .4)
    side_courses(a, b['S'], 2.6 if h > 5 else h / 2, c, .4)
    # lit top edge + gold band
    a.line(f'M{pt(fx + .4, fy - h + .5)}H{n(fx + ww - .4)}', c[0], .6, .9)
    if gold:
        a.line(f'M{pt(fx + .3, fy - h + 1.3)}H{n(fx + ww - .3)}L{pt(*dep((fx + ww - .3, fy - h + 1.3), dd))}', GOLD[1], .9, 1, ' stroke-opacity="1"')
    return {'x': fx, 'y': fy, 'w': ww, 'd': dd, 'h': h, 'top': fy - h}


def stairs(a, cx, y0, z_top, depth_top, w_bot, w_top, c=MARBLE):
    """grand stair rising straight back from the front edge to the top terrace"""
    b1, b2 = (cx - w_bot / 2, y0 + .2), (cx + w_bot / 2, y0 + .2)
    t1, t2 = dep((cx - w_top / 2, y0 - z_top), depth_top), dep((cx + w_top / 2, y0 - z_top), depth_top)
    a.poly([b1, b2, t2, t1], a.lg([(0, c[0]), (1, c[2])], 0, 0, 0, 1), True, .6)
    steps = int((b1[1] - t1[1]) / 1.15)
    d = ''
    for k in range(1, steps):
        t = k / steps
        p1, p2 = lerp(b1, t1, t), lerp(b2, t2, t)
        d += f'M{pt(*p1)}L{pt(*p2)}'
    a.line(d, c[3], .35, .55)
    # balustrades
    for s_ in (-1, 1):
        p1 = (cx + s_ * (w_bot / 2 + .9), y0 + .2)
        p2 = dep((cx + s_ * (w_top / 2 + .9), y0 - z_top), depth_top)
        a.line(f'M{pt(*p1)}L{pt(*p2)}', c[2], 2.0)
        a.line(f'M{pt(p1[0] - .3, p1[1] - .3)}L{pt(p2[0] - .3, p2[1] - .3)}', c[0], .6)


def column(a, x, y, h, r=1.1, c=MARBLE, cap=GOLD):
    a.path(poly_d([(x - r, y), (x + r, y), (x + r * .9, y - h), (x - r * .9, y - h)]), face_lg(a, c, 'cyl'), True, .45)
    a.line(f'M{pt(x - r * .3, y - .5)}V{n(y - h + .5)}M{pt(x + r * .35, y - .5)}V{n(y - h + .5)}', c[2], .25, .6)
    a.poly([(x - r - .5, y - h), (x + r + .5, y - h), (x + r + .5, y - h - .9), (x - r - .5, y - h - .9)], cap[1], True, .4)
    a.poly([(x - r - .4, y + .1), (x + r + .4, y + .1), (x + r + .4, y - .7), (x - r - .4, y - .7)], c[1], True, .4)


def wonder(stage):
    a = Art(f'ww{stage}')
    s = stage
    cx, y0 = 33.5, 93
    W, D = 50, 24
    ground(a, 37, 88, 35, 11, dirt=s < 5)
    shadow(a, 42, 91, 32, 8, .3, 2)
    tiers_h = [10, 9, 8, 7]
    insets = [(0, 0), (5, 2.5), (10, 5), (15, 7.5)]
    nt = {1: 1, 2: 2, 3: 3, 4: 4, 5: 4}[s]
    built_h = {1: [5], 2: [10, 6], 3: [10, 9, 5], 4: tiers_h, 5: tiers_h}[s]
    # crane behind (stages 1-4)
    if s < 5:
        cx_c = {1: 62, 2: 64, 3: 64, 4: 60}[s]
        cy_c = {1: 84, 2: 82, 3: 81, 4: 80}[s]
        crane(a, cx_c, cy_c, {1: 26, 2: 34, 3: 40, 4: 46}[s], -14 if s < 4 else -12)
    z = 0
    info = []
    for i in range(nt):
        h = built_h[i]
        unfinished = i == nt - 1 and s < 4
        tinfo = tier(a, cx, y0, W, D, insets[i], z, h, gold=(s == 5), seed=i + s)
        info.append(tinfo)
        if unfinished:
            # half-laid courses of blocks on the top terrace
            r = random.Random(7 + s)
            bx = tinfo['x'] + 2
            while bx < tinfo['x'] + tinfo['w'] - 6:
                if r.random() < .55:
                    dd_ = r.uniform(1, tinfo['d'] * .6)
                    px, py = dep((bx, tinfo['top']), dd_)
                    block(a, px, py, r.uniform(3, 5), 2.2, 2.4)
                bx += r.uniform(4, 7)
        z += h
    top = info[-1]
    # front stair (stage 3+)
    if s >= 3:
        zt = sum(built_h[:nt])
        stairs(a, cx + 1.5, y0, zt, insets[nt - 1][1], 9, 6.5)
    # scaffolding on the face being built
    if s < 5:
        t = info[-1]
        scaffold(a, t['x'] - 1, t['x'] + t['w'] + 1, t['y'] + .8, t['top'] - 3, 5.5 if s > 1 else 6,
                 planks_at=(t['y'] - t['h'] * .5,))
    # temple crown on the top terrace (stage 4 frame, stage 5 finished)
    if s >= 4:
        tx, ty = dep((top['x'] + 2, top['top']), 1.5)
        tw, td = top['w'] - 4, top['d'] - 2.5
        pod = box(a, tx, ty, tw, 2.2, td, MARBLE, top=True, sw=.6)
        cella_x, cella_y = dep((tx + 3, ty - 2.2), 3.5)
        ch = 13
        cb = box(a, cella_x, cella_y, tw - 6, ch, max(3, td - 5), MARBLE)
        door(a, cella_x + (tw - 6) / 2 - 2, cella_y, 4, 7.5, GOLD if s == 5 else WOOD_D)
        if s == 5:
            glow(a, cella_x + (tw - 6) / 2, cella_y - 3, 5, 4, .7)
        # front colonnade
        cols = 6
        for k in range(cols):
            column(a, tx + 1.8 + k * (tw - 3.6) / (cols - 1), ty - 2.2, ch + 1.5, 1.05, MARBLE, GOLD if s == 5 else MARBLE)
        ent_y = ty - 2.2 - ch - 1.5
        if s == 5:
            ent = box(a, tx - .6, ent_y, tw + 1.2, 2.6, td - 1, MARBLE, sw=.6)
            a.line(f'M{pt(tx, ent_y - 1.3)}H{n(tx + tw)}', GOLD[1], .9, 1)
            rf = roof_d(a, tx - .6, ent_y - 2.6, tw + 1.2, td - 1, 6, {'roof': GOLD, 'gable': MARBLE}, 1.0, 'tile',
                        gable_fill=a.lg([(0, MARBLE[0]), (1, MARBLE[2])]))
            # pediment relief + acroteria
            ap = rf['A']
            a.circ(ap[0], ap[1] - 1.2, 1.3, a.rg([(0, GOLD[0]), (1, GOLD[2])], .35, .3, .7), True, .4)
            a.circ(ap[0], ent_y - 2.6 - 3.2, 1.3, GOLD[1], True, .4)
            # beacon of light above the crown
            glow(a, ap[0], ap[1] - 3, 9, 7, .55)
            a.path(f'M{pt(ap[0] - 1.4, ap[1] - 2)}L{pt(ap[0], ap[1] - 9)}L{pt(ap[0] + 1.4, ap[1] - 2)}Z', a.lg([(0, GOLD[0]), (1, GOLD[2])]), True, .45)
            # banners on the corners of the first terrace
            for fx_ in (info[0]['x'] + 2.5, info[0]['x'] + info[0]['w'] - 2.5):
                flag(a, fx_, info[0]['top'] + .6, 11, '#7a2f5a', '#e6bb4c', 5.5)
            # braziers by the stair foot
            for bx_ in (cx - 6.5, cx + 9.5):
                a.poly([(bx_ - 1.2, y0 + 1), (bx_ + 1.2, y0 + 1), (bx_ + 1.8, y0 - 2), (bx_ - 1.8, y0 - 2)], a.lg([(0, GOLD[1]), (1, GOLD[3])]), True, .45)
                a.path(f'M{pt(bx_ - 1.3, y0 - 2)}Q{pt(bx_ - 1, y0 - 5)} {pt(bx_, y0 - 6.2)}Q{pt(bx_ + 1, y0 - 4.5)} {pt(bx_ + 1.3, y0 - 2)}Z', a.lg([(0, '#fff3b8'), (1, '#f28a28')]), None)
                glow(a, bx_, y0 - 3.5, 3.4, 2.6, .7)
        else:
            # roof timbers going up + scaffolding round the columns
            a.line(f'M{pt(tx - .5, ent_y)}H{n(tx + tw + .5)}M{pt(tx - .5, ent_y)}L{pt(tx + tw / 2, ent_y - 7)}L{pt(tx + tw + .5, ent_y)}'
                   f'M{pt(tx + tw / 2, ent_y - 7)}V{n(ent_y)}', WOOD[3], 1.1)
            scaffold(a, tx - 2, tx + tw + 2, ty - 2, ent_y - 4, 6.5, planks_at=(ty - 8,), op=.95)
    # stone blocks and timber on the ground while building
    if s < 5:
        block(a, 6, 97, 4.4, 2.8, 3)
        block(a, 10.5, 98.5, 4.4, 2.8, 3)
        if s >= 2:
            block(a, 8, 95, 4, 2.6, 3)
        a.poly([(55, 98.5), (66, 97), (66.6, 98.2), (55.6, 99.7)], face_lg(a, WOOD, 'front'), True, .5)
        a.poly([(56, 97.1), (67, 95.6), (67.6, 96.8), (56.6, 98.3)], face_lg(a, WOOD, 'front'), True, .5)
    else:
        tufts(a, [(5, 89), (70, 87)])
    return a


# =============================================================================================
# building site, empty plot, wall icons
# =============================================================================================
def construction():
    a = Art('cs')
    ground(a, dirt=True)
    shadow(a, 41, 90, 27, 6.5, .25)
    x, y, w, h, d = 18, 90, 34, 3.2, 18
    # foundation course
    f = box(a, x, y, w, h, d, STONE, top=True)
    stone_courses(a, f['F'], 1.6, STONE, 2)
    # inner floor (dug earth)
    a.poly([dep((x + 2, y - h), 1.5), dep((x + w - 2, y - h), 1.5), dep((x + w - 2, y - h), d - 1.5), dep((x + 2, y - h), d - 1.5)],
           a.lg([(0, '#cbb486'), (1, '#a88f62')]), True, .5)
    # timber frame: corner posts, top plates, a roof truss
    ph = 20
    corners = [dep((x + 1.5, y - h), d - 2), dep((x + w - 1.5, y - h), d - 2), (x + 1.5, y - h), (x + w - 1.5, y - h)]
    back = corners[:2]
    front = corners[2:]
    dpost = ''
    for px, py in back:
        dpost += f'M{pt(px, py)}V{n(py - ph)}'
    a.line(dpost, WOOD[3], 1.6)
    a.line(dpost, WOOD[1], .6, .9, ' transform="translate(-.3 0)"')
    tp = f'M{pt(back[0][0], back[0][1] - ph)}L{pt(back[1][0], back[1][1] - ph)}'
    tp += f'M{pt(front[0][0], front[0][1] - ph)}L{pt(back[0][0], back[0][1] - ph)}M{pt(front[1][0], front[1][1] - ph)}L{pt(back[1][0], back[1][1] - ph)}'
    a.line(tp, WOOD[3], 1.4)
    # truss on the right end
    rt = dep((x + w - 1.5, y - h - ph - 8), (d - 2) / 2)
    a.line(f'M{pt(front[1][0], front[1][1] - ph)}L{pt(*rt)}L{pt(back[1][0], back[1][1] - ph)}', WOOD[3], 1.3)
    rt2 = dep((x + 1.5, y - h - ph - 8), (d - 2) / 2)
    a.line(f'M{pt(*rt2)}L{pt(*rt)}', WOOD[3], 1.1, .9)
    a.line(f'M{pt(front[0][0], front[0][1] - ph)}L{pt(*rt2)}', WOOD[3], 1.1, .9)
    dpost = ''
    for px, py in front:
        dpost += f'M{pt(px, py)}V{n(py - ph)}'
    a.line(dpost, WOOD[3], 1.7)
    a.line(dpost, WOOD[0], .6, .9, ' transform="translate(-.35 0)"')
    a.line(f'M{pt(front[0][0], front[0][1] - ph)}L{pt(front[1][0], front[1][1] - ph)}', WOOD[3], 1.5)
    a.line(f'M{pt(front[0][0], front[0][1] - ph - .4)}L{pt(front[1][0], front[1][1] - ph - .4)}', WOOD[0], .45)
    # braces
    a.line(f'M{pt(front[0][0], front[0][1] - 4)}L{pt(front[0][0] + 5, front[0][1] - ph)}M{pt(front[1][0], front[1][1] - 4)}L{pt(front[1][0] - 5, front[1][1] - ph)}', WOOD[2], .9)
    # ladder leaning on the front plate
    lx0, ly0, lx1, ly1 = x + 9, y + 2, x + 12.5, y - h - ph + 1
    d1 = f'M{pt(lx0, ly0)}L{pt(lx1, ly1)}M{pt(lx0 + 3, ly0)}L{pt(lx1 + 3, ly1)}'
    for k in range(1, 8):
        t = k / 8
        p1 = lerp((lx0, ly0), (lx1, ly1), t)
        d1 += f'M{pt(*p1)}h3'
    a.line(d1, WOOD[2], .8)
    # timber stack, stones, sand
    for k in range(3):
        a.poly([(48 + k * .6, 97 - k * 1.3), (62 + k * .6, 95.5 - k * 1.3), (62.6 + k * .6, 96.7 - k * 1.3), (48.6 + k * .6, 98.2 - k * 1.3)], face_lg(a, WOOD, 'front'), True, .5)
    block(a, 8, 95, 4.4, 3, 3, STONE)
    block(a, 12.6, 96.5, 4.4, 3, 3, STONE)
    block(a, 9.6, 92, 4.2, 2.8, 3, STONE)
    a.path('M18,98.5C19,95.6 23,94.6 25.5,95.2C28,95.8 29.5,97.4 30.5,98.6Z', a.lg([(0, '#efd9a6'), (1, '#c9a868')]), True, .5)
    # a bucket and a mallet
    a.path('M64,90.5l2.6,0l-.4,-2.8l-1.8,0Z', a.lg([(0, WOOD[1]), (1, WOOD[3])]), True, .4)
    tufts(a, [(6, 87), (69, 86)])
    return a


def empty():
    a = Art('ep')
    cx, cy = 37, 87
    a.ell(cx, cy, 31, 9.6, a.rg([(0, '#e6eecb'), (.75, '#dbe7bb', .9), (1, '#cfe0a8', 0)], .45, .4, .55), None)
    a.ell(cx, cy, 24, 7, 'none', '#c5d79a', .6, .7, ' stroke-dasharray="1.6 2.2"')
    pebbles(a, [(22, 88.5, 1.6), (25.5, 90.6, 1.0), (51, 83.5, 1.4), (47.5, 91, 1.1), (34, 82.6, .9)])
    tufts(a, [(14, 85.5), (59, 88), (40, 93)], '#9fbe6a', .9)
    return a


def wall_icon(kind):
    a = Art(f'wi{kind[0]}')
    ground(a)
    shadow(a, 41, 90, 28, 6.5, .3)
    if kind == 'city':
        # curtain wall receding to the right
        x, y = 8, 92
        b = box(a, x, y, 30, 14, 6, STONE)
        stone_courses(a, b['F'], 2.6, STONE, 4)
        side_courses(a, b['S'], 2.6, STONE)
        # walkway + merlons
        a.poly([(x, y - 14), (x + 30, y - 14), dep((x + 30, y - 14), 6), dep((x, y - 14), 6)], face_lg(a, STONE, 'top'), True, .6)
        for k in range(6):
            mx = x + .5 + k * 5.2
            box(a, mx, y - 14, 3, 3, 1.4, STONE, top=True, sw=.5)
        # gate tower: round with a cone roof
        tx, ty = 47, 93
        cyl(a, tx, ty, 9, 30, STONE, 8.4, top=False)
        dd = ''
        k = 2.7
        while k < 29:
            rr = 9 - .6 * k / 30
            dd += f'M{pt(tx - rr + .2, ty - k)}A{n(rr)},{n(rr * .38)} 0 0 0 {pt(tx + rr - .2, ty - k)}'
            k += 2.7
        a.line(dd, STONE[3], .35, .5)
        door(a, tx - 3.2, ty + 3, 6.4, 10)
        window(a, tx - 1, ty - 16, 2, 4, arch=True)
        # corbel ring and merlons
        a.ell(tx, ty - 30, 9.6, 3.6, face_lg(a, STONE, 'top'))
        for k in range(7):
            ang = math.pi * k / 6
            mx = tx - math.cos(ang) * 8.4
            my = ty - 30 + math.sin(ang) * 3.2
            box(a, mx - 1.3, my, 2.6, 3, 1, STONE, sw=.45)
        cone(a, tx, ty - 32.5, 8.6, 13, TILE)
        flag(a, tx, ty - 45, 8, '#b5402e', '#e6bb4c', 6)
    elif kind == 'earth':
        # earthen rampart with a stake crest and a timber watchtower
        d = 'M3,93C9,80 23,73.5 38,73.5C53,73.5 65,79.5 71,90.5C59,97 15,97.5 3,93Z'
        a.path(d, a.lg([(0, '#c8d98a'), (.28, '#a9b86a'), (.45, '#b39a64'), (1, '#7f6642')], 0, 0, .15, 1))
        a.path('M6,88C14,77 26,73.5 38,73.5C50,73.5 61,78 68,87', 'none', '#e4ecb4', 1.6, .8)
        a.path('M10,93C20,90 30,92 40,90.5C50,89.5 60,92 68,90', 'none', '#7a6040', .5, .5)
        tufts(a, [(14, 82), (26, 76), (52, 77), (60, 82)], '#7f9e48')
        # stakes along the crest
        r = random.Random(4)
        for k in range(14):
            t = k / 13
            px = 8 + t * 58
            py = 87 - math.sin(t * math.pi) * 14 + r.uniform(-.4, .4)
            hh = 6 + r.uniform(-.8, .8)
            lean = (t - .5) * 1.5
            a.path(f'M{pt(px - 1, py)}L{pt(px - 1 + lean, py - hh)}L{pt(px + lean, py - hh - 2)}L{pt(px + 1 + lean, py - hh)}L{pt(px + 1, py)}Z',
                   a.lg([(0, WOOD[0]), (.6, WOOD[1]), (1, WOOD[2])], 0, 0, 1, 0), True, .5)
        a.path('M7,84C18,73 28,69 38,69C50,69 60,73 67,82', 'none', WOOD[3], .7, .8)
        # watchtower
        tx, ty = 46, 80
        a.line(f'M{pt(tx - 5, ty)}L{pt(tx - 4, ty - 18)}M{pt(tx + 5, ty)}L{pt(tx + 4, ty - 18)}M{pt(tx - 5, ty - 1)}L{pt(tx + 4, ty - 16)}M{pt(tx + 5, ty - 1)}L{pt(tx - 4, ty - 16)}', WOOD[3], 1.2)
        b = box(a, tx - 6, ty - 17, 12, 7, 6, WOOD)
        planks(a, b['F'], 1.7, WOOD, False)
        roof_d(a, tx - 6, ty - 24, 12, 6, 7, {'roof': THATCH, 'gable': WOOD}, 1.4, 'thatch')
        a.line(f'M{pt(tx - 5, ty - 17)}V{n(ty - 24)}M{pt(tx + 5, ty - 17)}V{n(ty - 24)}', WOOD[3], .9)
        flag(a, tx, ty - 31.5, 6, '#4f6e8c', '#e6bb4c', 5)
    else:
        # palisade of sharpened logs with a thatched gate tower
        r = random.Random(9)
        x0 = 4
        for k in range(17):
            px = x0 + k * 3.9
            if 27 < px < 47:
                continue
            py = 92 - k * .35
            hh = 17 + r.uniform(-1.2, 1.2)
            a.path(f'M{pt(px - 1.9, py)}V{n(py - hh)}L{pt(px, py - hh - 3)}L{pt(px + 1.9, py - hh)}V{n(py)}Z',
                   a.lg([(0, WOOD[0]), (.35, WOOD[1]), (1, WOOD[3])], 0, 0, 1, 0), True, .6)
            a.line(f'M{pt(px - .9, py - .6)}V{n(py - hh + .4)}', '#e8c48e', .45, .6)
        a.line('M2,83.5L28,82.5M46,81.6L72,80.6', WOOD[3], 1.5)
        a.line('M2,83L28,82M46,81.1L72,80.1', WOOD[0], .45)
        # gate tower
        tx, ty = 37, 91
        for px in (tx - 8, tx + 8):
            a.path(f'M{pt(px - 2, ty)}V{n(ty - 30)}H{n(px + 2)}V{n(ty)}Z', a.lg([(0, WOOD[0]), (.4, WOOD[1]), (1, WOOD[3])], 0, 0, 1, 0), True, .6)
        door(a, tx - 6, ty, 12, 13, WOOD_D, arch=False)
        a.line(f'M{pt(tx - 6, ty - 10)}H{n(tx + 6)}M{pt(tx - 6, ty - 3)}H{n(tx + 6)}M{pt(tx - 6, ty - 3)}L{pt(tx + 6, ty - 10)}', WOOD_D[3], .9)
        b = box(a, tx - 10, ty - 22, 20, 8, 7, WOOD)
        planks(a, b['F'], 1.7, WOOD, False)
        a.poly([(tx - 11.5, ty - 21), (tx + 11.5, ty - 21), (tx + 11.5, ty - 23), (tx - 11.5, ty - 23)], WOOD[2], True, .5)
        roof_x(a, tx - 10, ty - 30, 20, 7, 9, {'roof': THATCH, 'gable': WOOD}, 1.6, 'thatch')
        flag(a, tx + 3, ty - 38, 7, '#3f7a3a', '#e6bb4c', 5.5)
    tufts(a, [(6, 88), (69, 86)])
    return a


# =============================================================================================
# driver
# =============================================================================================
BUILDERS = {'ironfoundry': ironfoundry, 'grainmill': grainmill, 'bakery': bakery, 'wonder': wonder}


SINGLES = {'construction': construction, 'empty': empty, 'wall-city': lambda: wall_icon('city'),
           'wall-earth': lambda: wall_icon('earth'), 'wall-palisade': lambda: wall_icon('palisade')}


def main(ids):
    for bid in ids:
        if bid in SINGLES:
            sz = save(SINGLES[bid](), os.path.join(BLD, f'{bid}.svg'), LIMIT)
            print(f'{bid}: {sz} bytes')
            continue
        for stage in range(1, 6):
            a = BUILDERS[bid](stage)
            sz = save(a, fname(bid, stage), LIMIT)
            print(f'{bid} stage {stage}: {sz} bytes')


if __name__ == '__main__':
    main(sys.argv[1:] or list(BUILDERS) + list(SINGLES))
