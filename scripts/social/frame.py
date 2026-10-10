"""Frame raw screenshots / art into 1600x900 X post images: blurred painting behind, a short title,
coin + wordmark, the picture on a soft-shadowed card.

~/art-env/bin/python scripts/social/frame.py <shots_dir> <paintings_dir> [name ...]

Specs in POSTS below: output name -> title, background painting (kie raw from gen_social.py),
picture files (from shots_dir, or repo paths), optional crop (top, bottom) as fractions of the height.
Writes branding/social/img/<name>.jpg.
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = pathlib.Path(__file__).resolve().parents[2]
BRAND = REPO / 'branding'
OUT = BRAND / 'social' / 'img'
W, H = 1600, 900
TOP = 120  # title band

POSTS: dict[str, dict] = {
    '02-tribes': {'title': 'Pick your tribe', 'bg': 'what-council', 'shots': ['02-tribes.png']},
    '04-auto': {'title': 'Auto training', 'bg': 'what-empire', 'shots': ['04-auto.png'], 'crop': (0, 0.33)},
    '06-troops': {'title': 'Every unit, drawn by hand', 'bg': 'what-council', 'shots': ['06-troops.png']},
    '07-hero': {'title': 'The hero', 'bg': 'what-hero', 'shots': ['07-hero.png']},
    '09-guide': {'title': 'Game guide and help bubbles', 'bg': 'what-council', 'shots': ['09-guide.png']},
    '11-raider': {'title': 'Oasis raider', 'bg': 'p25-oases', 'shots': ['11-raider.png'], 'crop': (0, 0.255)},
    '12-villages': {'title': 'Villages on the map', 'bg': 'what-empire', 'shots': ['12-villages.png']},
    '13-report': {'title': 'Battle reports', 'bg': 'p10-natars', 'shots': ['13-report.png']},
    '14-phone': {'title': 'On your phone', 'bg': 'what-hero', 'shots': ['14-phone-village.png', '14-phone-map.png', '14-phone-report.png'], 'phone': True},
    '15-week': {'title': 'Weekly medals', 'bg': 'p17-endgame', 'shots': ['15-week.png'], 'crop': (0, 0.42)},
    '16-levels': {'title': 'Every building, every level', 'bg': 'what-empire', 'shots': ['16-levels.png'], 'crop': (0.265, 1)},
    '18-tests': {'title': 'Tested before every release', 'bg': 'p08-loopholes', 'shots': ['18-tests.png']},
    '21-walls': {'title': 'Three walls', 'bg': 'p28-conquest', 'shots': ['21-walls.png']},
    '22-stages': {'title': 'Buildings that grow', 'bg': 'what-empire', 'shots': ['22-stages.png']},
    '24-cranny': {'title': 'The cranny', 'bg': 'p33-traps', 'shots': ['24-cranny.png']},
    '26-artifacts': {'title': 'Artifacts', 'bg': 'p17-endgame', 'shots': ['26-artifacts.png'], 'crop': (0, 0.45)},
    '27-goldmarket': {'title': 'Gold market', 'bg': 'p08-loopholes', 'shots': ['27-goldmarket.png']},
    '29-catapult': {'title': 'Catapult targets', 'bg': 'p28-conquest', 'shots': ['29-catapult.png'], 'crop': (0.4, 0.97)},
    '30-infobox': {'title': 'The Info box', 'bg': 'what-council', 'shots': ['30-infobox.png']},
    '31-croppers': {'title': 'Cropper finder', 'bg': 'p35-fast', 'shots': ['31-croppers.png'], 'crop': (0, 0.6)},
    '32-hero': {'title': 'Hero progress', 'bg': 'what-hero', 'shots': ['32-hero.png']},
    '34-maths': {'title': 'Same fight, same numbers', 'bg': 'p10-natars', 'shots': ['13-report.png', '34-sim.png'], 'crop2': (0.535, 1.0)},
    '36-versions': {'title': 'Three tries at the troops', 'bg': 'what-council', 'shots': ['36-versions.png']},
}


def font(size: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(REPO / 'scripts/art/brand/Cinzel.ttf'), size)
    try:
        f.set_variation_by_name('Bold')  # Cinzel.ttf is a variable font
    except (OSError, ValueError):
        pass
    return f


def backdrop(name: str, paintings: pathlib.Path) -> Image.Image:
    im = Image.open(paintings / f'{name}.png').convert('RGB')
    h = int(im.height * 0.94)
    w = round(h * 16 / 9)
    x = (im.width - w) // 2
    im = im.crop((x, 0, x + w, h)).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(14))
    dark = Image.new('RGB', (W, H), (14, 10, 6))
    return Image.blend(im, dark, 0.45).convert('RGBA')


def shadowed(bg: Image.Image, card: Image.Image, pos: tuple[int, int], radius: int = 10) -> None:
    mask = Image.new('L', card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius, fill=255)
    pad = 40
    sh = Image.new('L', (card.width + 2 * pad, card.height + 2 * pad), 0)
    sh.paste(mask, (pad, pad))
    sh = sh.filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.7))
    bg.paste((0, 0, 0, 255), (pos[0] - pad + 6, pos[1] - pad + 10), sh)
    edge = Image.new('RGBA', (card.width + 4, card.height + 4), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle((0, 0, card.width + 3, card.height + 3), radius + 2, fill=(222, 196, 140, 255))
    bg.alpha_composite(edge, (pos[0] - 2, pos[1] - 2))
    bg.paste(card.convert('RGBA'), pos, mask)


def fit(im: Image.Image, mw: int, mh: int) -> Image.Image:
    s = min(mw / im.width, mh / im.height)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def load(src: str, shots: pathlib.Path, crop: tuple[float, float] | None) -> Image.Image:
    p = shots / src if (shots / src).exists() else REPO / src
    im = Image.open(p).convert('RGB')
    if crop:
        im = im.crop((0, round(im.height * crop[0]), im.width, round(im.height * crop[1])))
    return im


def brand(bg: Image.Image, title: str) -> None:
    d = ImageDraw.Draw(bg)
    f = font(50)
    d.text((62, 64), title, font=f, fill=(0, 0, 0, 150), anchor='lm')
    d.text((60, 61), title, font=f, fill=(246, 230, 190, 255), anchor='lm')
    coin = Image.open(BRAND / 'coin-512.png').convert('RGBA').resize((72, 72), Image.LANCZOS)
    word = Image.open(BRAND / 'wordmark.png').convert('RGBA')
    ww = 270
    word = word.resize((ww, round(word.height * ww / word.width)), Image.LANCZOS)
    x0 = W - 52 - ww - 12 - 72
    bg.alpha_composite(coin, (x0, 24))
    bg.alpha_composite(word, (x0 + 84, 60 - word.height // 2))


def frame(name: str, spec: dict, shots: pathlib.Path, paintings: pathlib.Path) -> None:
    bg = backdrop(spec['bg'], paintings)
    brand(bg, spec['title'])
    area_w, area_h, y0 = W - 120, H - TOP - 44, TOP
    srcs = spec['shots']
    if len(srcs) == 1:
        card = fit(load(srcs[0], shots, spec.get('crop')), area_w, area_h)
        shadowed(bg, card, ((W - card.width) // 2, y0 + (area_h - card.height) // 2))
    else:
        gap = 44
        crops = [spec.get('crop'), spec.get('crop2')] + [None] * len(srcs)
        ims = [load(s, shots, crops[i]) for i, s in enumerate(srcs)]
        # same height for all, then shrink the row to the available width
        h = min(area_h, *(im.height for im in ims))
        ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
        total = sum(im.width for im in ims) + gap * (len(ims) - 1)
        s = min(1, area_w / total)
        ims = [im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) for im in ims]
        total = sum(im.width for im in ims) + gap * (len(ims) - 1)
        x = (W - total) // 2
        for im in ims:
            shadowed(bg, im, (x, y0 + (area_h - im.height) // 2), 22 if spec.get('phone') else 10)
            x += im.width + gap
    bg.convert('RGB').save(OUT / f'{name}.jpg', quality=92)
    print('wrote', OUT / f'{name}.jpg')


if __name__ == '__main__':
    shots, paintings = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    only = sys.argv[3:]
    OUT.mkdir(parents=True, exist_ok=True)
    for n, sp in POSTS.items():
        if not only or n in only:
            frame(n, sp, shots, paintings)
