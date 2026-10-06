"""Old-school repaint of the building pictures (no AI): natural light, roof colour by building type
(classic T3 variety) and a thin soft outline so each building reads on the pale village ground.

Usage:
  ~/art-env/bin/python scripts/art/repaint.py scripts/art/src/buildings src/web/public/img/buildings
  ~/art-env/bin/python scripts/art/repaint.py --walls scripts/art/src/walls src/web/public/img/walls
The source folders keep the un-repainted art (never repaint twice). Walls: scripts/art/src/walls/*.raw.png
(the SVG walls rendered at 1080x896) -> img/walls/<stem>.png (city-1 ... palisade-5, spikes).
Afterwards regenerate the click masks: python3 scripts/gen-masks.py

Steps per picture:
  1. clean_alpha: the cut-out left pale, half-transparent haze (ground shadow / background residue). Near the
     ground it becomes a faint warm shadow (alpha < 100, so the click masks ignore it); elsewhere it is dropped.
     Without this the haze was brightened to pure white and outlined -> white slabs under the buildings.
  2. fix_whites: tiny near-white specks inside the building (cut-out holes, clipped highlights) take the median
     colour of their non-white neighbours; larger pale areas (plaster, stone, smoke, plazas) get a warm stone
     tint and a value cap so nothing reads as a white hole on the ground.
  3. recolour: red roof tiles take the family colour (muted, dark grout lines stay brown, not olive);
     flags and other small red bits keep their colour.
  4. tone: gentle midtone lift + contrast with a highlight roll-off (no clipping), slightly calmer colour.
  5. outline: 1px warm dark-brown ring at partial opacity on the silhouette only (diagonals fainter).
  6. quantize to 64 colours (keeps alpha levels), optimized PNG.
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# Roof colour family per building: (target hue deg, saturation factor, value factor, dark-grout hue deg).
ROOF = {
    'civic': (9, 0.95, 1.08, 14),        # warm light red tiles: main, townhall, residence, palace, embassy, treasury...
    'military': (210, 0.26, 0.98, 210),  # light slate grey-blue
    'craft': (27, 0.88, 1.06, 22),       # orange-brown wooden shingles
    'trade': (30, 1.00, 1.12, 24),       # light orange clay tiles
    'farm': (47, 1.18, 1.14, 36),        # golden-yellow thatch / straw (the classic T3 roof)
    'stone': (36, 0.09, 1.04, 32),       # light grey stone roofs
}
FAMILY = {
    **dict.fromkeys(['main', 'townhall', 'residence', 'palace', 'embassy', 'treasury', 'heromansion', 'academy'], 'civic'),
    **dict.fromkeys(['barracks', 'greatbarracks', 'stable', 'greatstable', 'workshop', 'armoury', 'blacksmith', 'tournament', 'rally'], 'military'),
    **dict.fromkeys(['sawmill', 'brickyard', 'ironfoundry', 'stonemason', 'trapper', 'brewery'], 'craft'),
    **dict.fromkeys(['market', 'tradeoffice'], 'trade'),
    **dict.fromkeys(['granary', 'greatgranary', 'grainmill', 'bakery', 'horsetrough', 'cranny'], 'farm'),
    **dict.fromkeys(['warehouse', 'greatwarehouse', 'wonder'], 'stone'),
}
OUTLINE = (46, 32, 18)       # dark brown, crisp like T3's thin outline
OUTLINE_ALPHA = (205, 95)    # edge neighbours, diagonal-only neighbours
SHADOW = (84, 72, 48)        # contact shadow from the cut-out haze
SHADOW_MAX_ALPHA = 56
CREAM = np.array([0.92, 0.86, 0.70])  # warm light stone hue for pale surfaces
PALE_FROM, PALE_KEEP, CREAM_MIX = 0.66, 0.68, 0.45  # pale (low-sat) values above PALE_FROM compress: 1.0 -> 0.89, beige
SPECK_MAX = 12               # pale components up to this many px inside the building are filled
CONTRAST, GAMMA, SATURATION = 1.04, 0.86, 1.06
OCHRE_HUE, OCHRE_PULL, WARM_SAT, WARM_LIFT = 41, 0.55, 1.1, 1.3  # sunny(): timber/brick -> honey ochre
SUN_HUE, STONE_DESAT = 5, 0.35  # extra hue (deg) on sunlit faces; desaturation of light brick/stone
WALL_TONE = (1.05, 0.88, 1.06)  # walls are smooth SVG renders: a little more light, less contrast
ROLL_START, ROLL_TOP = 0.84, 0.97  # highlights above ROLL_START compress smoothly towards ROLL_TOP


def rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return np.stack([h / 6, s, mx], -1)


def hsv_to_rgb(hsv: np.ndarray) -> np.ndarray:
    h, s, v = hsv[..., 0] % 1, hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    choices = [np.stack(c, -1) for c in ((v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q))]
    out = np.zeros(h.shape + (3,))
    for k in range(6):
        out[i == k] = choices[k][i == k]
    return out


def clean_alpha(rgb: np.ndarray, a: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Opaque body stays; pale half-transparent haze becomes a faint ground shadow (lower part) or goes."""
    a = a.copy()
    a[a >= 230] = 1.0
    hsv = rgb_to_hsv(rgb)
    haze = (a < 0.9) & (a > 0) & (hsv[..., 2] > 0.55) & (hsv[..., 1] < 0.3)
    a[a < 0.04] = 0
    body = a >= 0.9
    rows = np.where(body.any(1))[0]
    if len(rows) == 0:
        return rgb, a
    top, bottom = rows[0], rows[-1]
    ground = np.zeros_like(body)
    ground[int(top + (bottom - top) * 0.55):, :] = True
    shadow = haze & ground
    rgb[shadow] = np.array(SHADOW) / 255
    a[shadow] = np.minimum(a[shadow] * 0.45, SHADOW_MAX_ALPHA / 255)
    a[haze & ~ground] = 0
    return rgb, a


def fix_whites(rgb: np.ndarray, a: np.ndarray) -> np.ndarray:
    """Fill tiny white specks from their neighbours, then pull every pale low-saturation surface down
    (smoothly, so shading order is kept) and warm it towards light stone."""
    hsv = rgb_to_hsv(rgb)
    body = a >= 0.5
    pale = body & (hsv[..., 2] > 0.84) & (hsv[..., 1] < 0.16)
    out = rgb.copy()
    if pale.any():
        lab, n = ndimage.label(pale, structure=np.ones((3, 3)))
        sizes = ndimage.sum(pale, lab, range(1, n + 1))
        near_edge = ndimage.binary_dilation(~body, structure=np.ones((3, 3)), iterations=2)
        touches = ndimage.maximum(near_edge, lab, range(1, n + 1))
        good = body & ~pale
        H, W = a.shape
        for k in np.where((sizes <= SPECK_MAX) & ~touches.astype(bool))[0]:
            for y, x in zip(*np.where(lab == k + 1)):  # median of non-pale neighbours in a growing window
                for r in (2, 3, 5):
                    y0, y1, x0, x1 = max(0, y - r), min(H, y + r + 1), max(0, x - r), min(W, x + r + 1)
                    m = good[y0:y1, x0:x1]
                    if m.sum() >= 4:
                        out[y, x] = np.median(rgb[y0:y1, x0:x1][m], axis=0)
                        break
    hsv = rgb_to_hsv(out)
    s, v = hsv[..., 1], hsv[..., 2]
    w = np.clip((v - PALE_FROM) / 0.2, 0, 1) * np.clip(1 - s / 0.22, 0, 1)
    vt = PALE_FROM + (v - PALE_FROM) * PALE_KEEP
    toned = out * (vt / np.maximum(v, 1e-6))[..., None]
    toned = toned * (1 - CREAM_MIX) + CREAM * vt[..., None] / CREAM.max() * CREAM_MIX
    return out + (toned - out) * w[..., None]


def recolour(rgb: np.ndarray, a: np.ndarray, fam: str) -> np.ndarray:
    hue, sf, vf, grout = ROOF[fam]
    hsv = rgb_to_hsv(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    body = a >= 0.5
    red = body & ((h < 0.048) | (h > 0.97)) & (s > 0.45) & (v > 0.2)  # brick walls are orange-brown, 20-35 deg
    # roof pixels the red test just misses (darker/oranger tile shading) -> no speckles in recoloured roofs
    near = ndimage.uniform_filter(red.astype(float), 5)
    red |= body & ((h < 0.075) | (h > 0.95)) & (s > 0.3) & (near > 0.5)
    lab, n = ndimage.label(red, structure=np.ones((3, 3)))
    sizes = ndimage.sum(red, lab, range(1, n + 1))
    big = np.isin(lab, np.where(sizes >= 40)[0] + 1)
    # roof pieces cut off by a sail/chimney sit right next to a big roof; flags and fruit keep their colour
    touched = np.unique(lab[ndimage.binary_dilation(big, iterations=3) & red])
    roof = np.isin(lab, touched[touched > 0])
    dark = np.clip((0.65 - v) / 0.35, 0, 1)  # grout lines: darker -> warm brown hue, less saturation
    nh = (hue + (grout - hue) * dark) / 360
    ns = np.clip(s * sf * (1 - 0.25 * dark), 0, 1)
    nv = np.clip(v * vf, 0, 1)
    new = hsv_to_rgb(np.stack([nh, ns, nv], -1))
    out = rgb.copy()
    out[roof] = new[roof]
    return out, roof


def sunny(rgb: np.ndarray, a: np.ndarray, roof: np.ndarray) -> np.ndarray:
    """Classic T3 look: timber and brick move from reddish brown towards light honey/ochre, warm colours get
    lighter and a little more saturated. Dark lines stay brown (capped hue, so they never turn olive)."""
    hsv = rgb_to_hsv(rgb)
    h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    warm = (a >= 0.5) & ~roof & (s > 0.18) & (h >= 4) & (h <= 46)
    ramp = np.clip((h - 4) / 8, 0, 1)  # deep reds (flags, fruit) barely move
    nh = h + (OCHRE_HUE - h) * OCHRE_PULL * ramp
    lit = np.clip((v - 0.6) / 0.3, 0, 1)  # sunlit faces lean further to golden yellow
    nh = nh + SUN_HUE * lit * ramp
    nh = np.where(v < 0.35, np.minimum(nh, 34), nh)
    ns = np.clip(s * WARM_SAT * (1 + 0.1 * lit), 0, 1)
    stone = np.clip((0.42 - s) / 0.2, 0, 1) * np.clip((v - 0.6) / 0.2, 0, 1)  # light brick/stone -> beige
    ns = ns * (1 - STONE_DESAT * stone)
    nv = 1 - (1 - v) ** WARM_LIFT
    new = hsv_to_rgb(np.stack([nh / 360, ns, nv], -1))
    out = rgb.copy()
    out[warm] = new[warm]
    return out


def tone(rgb: np.ndarray, params: tuple[float, float, float] = (CONTRAST, GAMMA, SATURATION)) -> np.ndarray:
    contrast, gamma, saturation = params
    x = np.clip(rgb, 0, 1) ** gamma
    x = 0.5 + (x - 0.5) * contrast
    span = ROLL_TOP - ROLL_START
    x = np.where(x > ROLL_START, ROLL_START + span * np.tanh((x - ROLL_START) / span), x)
    lum = (x * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)
    x = lum + (x - lum) * saturation
    return np.clip(x, 0, 1)


def outline(rgb: np.ndarray, a: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    body = a >= 0.5
    cross = ndimage.binary_dilation(body, structure=ndimage.generate_binary_structure(2, 1)) & ~body
    diag = ndimage.binary_dilation(body, structure=np.ones((3, 3), bool)) & ~body & ~cross
    rgb, a = rgb.copy(), a.copy()
    col = np.array(OUTLINE) / 255
    for ring, al in ((cross, OUTLINE_ALPHA[0] / 255), (diag, OUTLINE_ALPHA[1] / 255)):
        under = a[ring]  # whatever was there (shadow, anti-aliasing): outline composited over it
        out_a = al + under * (1 - al)
        rgb[ring] = (col * al + rgb[ring] * (under * (1 - al))[:, None]) / np.maximum(out_a, 1e-6)[:, None]
        a[ring] = out_a
    return rgb, a


def process(img: Image.Image, fam: str | None) -> Image.Image:
    """fam = roof family for a building, None for a wall."""
    arr = np.asarray(img.convert('RGBA')).astype(float) / 255
    rgb, a = arr[..., :3].copy(), arr[..., 3].copy()
    a[a >= 230 / 255] = 1.0
    rgb, a = clean_alpha(rgb, a)
    rgb = fix_whites(rgb, a)
    if fam:
        rgb, roof = recolour(rgb, a, fam)
        rgb = sunny(rgb, a, roof)
    rgb = tone(rgb) if fam else tone(rgb, WALL_TONE)
    rgb, a = outline(rgb, a)
    rgb[a == 0] = 0
    out = np.dstack([rgb, a[..., None]])
    im = Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGBA')
    return im.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)


def repaint(src: pathlib.Path, dst: pathlib.Path) -> None:
    bid = src.stem.rsplit('-', 1)[0]
    process(Image.open(src), FAMILY.get(bid, 'civic')).save(dst, optimize=True)


def repaint_wall(src: pathlib.Path, dst: pathlib.Path) -> None:
    process(Image.open(src), None).save(dst, optimize=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    walls = args[:1] == ['--walls']
    src, out = pathlib.Path(args[-2]), pathlib.Path(args[-1])
    out.mkdir(parents=True, exist_ok=True)
    if walls:
        files = sorted(src.glob('*.raw.png'))
        for f in files:
            repaint_wall(f, out / (f.name.removesuffix('.raw.png') + '.png'))
    else:
        files = sorted(src.glob('*-[1-5].png'))
        for f in files:
            repaint(f, out / f.name)
    print('repainted', len(files))
