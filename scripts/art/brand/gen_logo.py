"""onchainTRAVIAN coin logo concepts via kie.ai (Nano Banana). Resumable.

python3 scripts/art/brand/gen_logo.py <out_dir> [--only id1,id2]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'kie'))
from kie import generate_many  # noqa: E402

OUT = pathlib.Path(sys.argv[1])
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None

STYLE = (
    'Premium crypto token logo for a cosy medieval / ancient Roman browser strategy game (village building, armies, tribes). '
    'Hand-painted 2D game icon, rich painterly rendering like a polished mobile strategy game app icon: bold readable silhouette, '
    'thick clean dark outline, warm sunlight from the top-left, glossy highlights, vibrant warm colours. '
    'A single round coin seen straight from the front, perfectly centred, filling about 90% of the frame, '
    'on a plain pure white background (#ffffff). No text, no letters, no numbers, no runes, no watermark, no other objects. '
    'It must stay recognisable when shrunk to 32 pixels. Original artwork. '
)

CONCEPTS = {
    'helmet': 'Thick shiny gold coin with a raised beaded rim. In the centre a polished steel Roman legionary helmet in side view with a big red horsehair crest, framed by a green laurel wreath; the wreath is tied at the bottom by three small silver chain links.',
    'castle': 'Thick shiny gold coin with a raised rim. In the centre an embossed fortified hilltop village: a stone keep with red roofs, palisade walls and a waving red banner, small fields in front.',
    'shield': 'Thick shiny gold coin with a raised rim made of interlocking chain links. In the centre a red Roman scutum shield with a gold boss, crossed with a sword and a spear behind it.',
    'tribes': 'Thick shiny gold coin with a raised beaded rim. In the centre three small heraldic shields side by side (red Roman, blue Teuton, green Gaul) under a golden crown, with a laurel wreath around them.',
    'tower': 'Thick shiny gold coin. In the centre a sturdy medieval watchtower with a red cone roof and a flag, built from stone blocks that subtly look like stacked cubes (a blockchain hint), green hills behind it.',
    'hero': 'Thick shiny gold coin with a raised beaded rim. In the centre a heroic rider on a rearing horse holding a raised sword, red cape flowing, embossed in gold with coloured enamel accents.',
    'front': 'Thick shiny gold coin with a raised rim. In the centre a front-facing bronze-and-steel Roman centurion helmet with a tall transverse red crest and cheek guards, two crossed swords behind it, glowing.',
    'wonder': 'Thick shiny gold coin with a raised rim. In the centre a stepped golden temple monument (a world wonder) with a glowing beacon on top, surrounded by a ring of small chain links.',
}

if __name__ == '__main__':
    jobs = [{'prompt': STYLE + d, 'out': OUT / f'{k}.png'} for k, d in CONCEPTS.items()
            if (ONLY is None or k in ONLY) and not (OUT / f'{k}.png').exists()]
    print(len(jobs), 'to generate', flush=True)
    credits = 0
    for r in generate_many(jobs, workers=8):
        credits += r.get('credits', 0)
        print(r, flush=True)
    print('credits', credits)


# Round 2 (2026-10-08): variations of the chosen 'helmet' concept, using it as reference.
KEEP = ('The reference image is the chosen logo: keep its subject, composition, style and colours '
        '(gold coin, steel Roman helmet in side view with a big red crest, green laurel wreath, chain at the bottom). ')
VARIANTS = {
    'helmet-a': 'Polish it: crisper outlines, richer gold with stronger rim highlights, helmet slightly larger, the three silver chain links at the bottom clearly visible and bolder.',
    'helmet-b': 'Same design but the raised outer rim of the coin is made of interlocking gold chain links all the way around (blockchain hint); the wreath ends tied with a small silver chain.',
    'helmet-c': 'Same design, bolder icon version: thicker dark outlines, simpler shapes, helmet and crest bigger and filling more of the coin, fewer but larger laurel leaves, so it reads well at 32 px.',
    'helmet-d': 'Same design with a raised beaded rim like an ancient Roman aureus, deeper embossed relief, warm glints, and a small gold hexagon gem set where the wreath is tied at the bottom.',
}


def variants(out: pathlib.Path, ref_png: pathlib.Path) -> None:
    from kie import upload
    ref = upload(ref_png)
    jobs = [{'prompt': STYLE + KEEP + d, 'out': out / f'{k}.png', 'refs': [ref]}
            for k, d in VARIANTS.items() if not (out / f'{k}.png').exists()]
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)


# Twitter banner backgrounds (2026-10-09): wide painted scenes, logo composited later by social.py.
BANNER_STYLE = (
    'Ultra-wide panoramic key art for a cosy classic medieval / ancient Roman browser strategy game (villages, fields, armies, tribes). '
    'Hand-painted 2D game illustration, rich painterly style like a polished strategy game loading screen, warm golden-hour light, '
    'vibrant natural colours, atmospheric depth. Keep the centre and right half calmer and slightly darker (open sky / soft distance) '
    'so a logo can be placed over it; put the busiest detail on the left third and lower edge. '
    'No text, no letters, no logo, no watermark, no frame, no UI. Original artwork. '
)
BANNERS = {
    'banner-village': 'A green valley at sunset: a thriving village with half-timbered houses and red roofs on a hill, a stone watchtower with a red banner, golden wheat fields, a winding river, woods and distant blue mountains under a glowing orange sky.',
    'banner-legion': 'A Roman legion with red shields and crested helmets marching over rolling hills toward a walled hilltop town, banners waving, long shadows, dramatic sunset sky with golden clouds.',
    'banner-map': 'A bird\'s-eye painted world map of the game seen at a low angle: patchwork of villages, wheat and clay fields, forests, lakes, oases and mountains fading into golden mist, a few tiny marching armies.',
    'banner-camp': 'Dusk at a Roman army camp on a hill: tents, torches, a banner pole, an open treasure chest overflowing with glowing gold coins in the foreground left, a fortified town and purple-orange sky in the distance.',
}


def banners(out: pathlib.Path) -> None:
    jobs = [{'prompt': BANNER_STYLE + d, 'out': out / f'{k}.png', 'ratio': '21:9'}
            for k, d in BANNERS.items() if not (out / f'{k}.png').exists()]
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)


# Emerald clasp redesign (2026-10-09): the chains around the gem looked odd; edit only the bottom ornament.
CLASP_KEEP = ('Edit the reference image. Keep EVERYTHING identical (same coin, rim, helmet, crest, laurel branches, colours, '
              'composition, white background) except the small ornament at the bottom where the two laurel branches meet. ')
CLASPS = {
    'clasp-bezel': 'Replace the chains there with an ornate gold bezel setting holding the green emerald: a small hexagonal gold mount with tiny prongs and filigree curls on both sides that wrap around the ends of the laurel stems, like jewellery.',
    'clasp-ribbon': 'Replace the chains there with a red silk ribbon tied in a neat bow that binds the two laurel stems together, with the green emerald set in a small round gold mount at the centre of the bow.',
    'clasp-crest': 'Replace the chains there with a small gold Roman shield-shaped medallion that binds the two laurel stems together, with the green hexagonal emerald set in its centre.',
    'clasp-leaves': 'Remove the chains there; the two laurel stems cross and are bound by a thin gold band, and the green hexagonal emerald sits in a gold setting on top of the crossing, flanked by two small gold leaves.',
}


def clasps(out: pathlib.Path, ref_png: pathlib.Path) -> None:
    from kie import upload
    ref = upload(ref_png)
    jobs = [{'prompt': CLASP_KEEP + d, 'out': out / f'{k}.png', 'refs': [ref]}
            for k, d in CLASPS.items() if not (out / f'{k}.png').exists()]
    for r in generate_many(jobs, workers=4):
        print(r, flush=True)
