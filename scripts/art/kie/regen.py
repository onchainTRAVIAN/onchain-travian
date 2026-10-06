"""Regenerate selected images (review fixes). Usage: python3 scripts/art/kie/regen.py <raw_dir>"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kie import generate_many, upload  # noqa: E402
from prompts import STYLE, UNIT, building_prompt, unit_prompt  # noqa: E402

RAW = pathlib.Path(sys.argv[1])
# Stage 5 should stay recognisable: its own stage-3 picture is the reference for identity.
STAGE5 = ['armoury', 'bakery', 'blacksmith', 'brewery', 'brickyard', 'granary', 'greatgranary', 'greatwarehouse', 'greatstable', 'heromansion',
          'ironfoundry', 'grainmill', 'residence', 'sawmill', 'stable', 'stonemason', 'tradeoffice', 'trapper', 'treasury', 'warehouse', 'workshop']
style = upload(RAW / 'anchors' / 'building.png')
jobs = []
for b in STAGE5:
    own = upload(RAW / 'buildings' / f'{b}-3.png')
    jobs.append({'prompt': building_prompt(b, 5) + ' The SECOND reference image is this same building at a smaller size: draw a bigger, richer version of exactly that building.',
                 'out': RAW / 'buildings' / f'{b}-5.png', 'refs': [style, own], 'ratio': '3:4'})
unit_ref = upload(RAW / 'anchors' / 'unit.png')
jobs.append({'prompt': unit_prompt('nature', 1), 'out': RAW / 'units' / 'nature-1.png', 'refs': [unit_ref], 'ratio': '4:5'})
jobs.append({'prompt': unit_prompt('teutons', 8) + ' Fill the whole canvas with the white background, no black bars.', 'out': RAW / 'units' / 'teutons-8.png', 'refs': [unit_ref], 'ratio': '4:5'})
# Roman hero: use the Teuton hero as style reference so it doesn't copy the Roman anchor's gear.
hero_ref = upload(RAW / 'heroes' / 'teutons-3.png')
roman = [
    'Gear level 1 of 5: a young legionary in plain chain mail, short red tunic, simple bronze helmet without crest, plain wooden shield, short sword.',
    'Gear level 2 of 5: segmented iron armour, red cloak to the knees, helmet with a small red crest, red shield with a bronze boss.',
    'Gear level 3 of 5: polished steel muscle cuirass, tall red transverse crest, long red cape, red shield with gold lightning emblem, gleaming sword.',
    'Gear level 4 of 5: ornate silver armour with gold trim and a medallion, white horsehair crest, long crimson cape, decorated sword held high, no shield.',
    'Gear level 5 of 5: legendary general in gilded gold armour with an eagle emblem, golden laurel wreath instead of a helmet, flowing crimson cape with gold hem, sword glowing with golden light, an eagle standard.',
]
for i, g in enumerate(roman, 1):
    jobs.append({'prompt': ('Match only the art style of the reference image, not its subject. ' + STYLE + ' ' + UNIT + 'A heroic Roman commander in a confident heroic stance. ' + g),
                 'out': RAW / 'heroes' / f'romans-{i}.png', 'refs': [hero_ref], 'ratio': '4:5'})
cr = 0
for r in generate_many(jobs, workers=6):
    cr += r.get('credits', 0)
    if 'error' in r:
        print('FAILED', r)
print('regenerated', len(jobs), 'credits', cr)
