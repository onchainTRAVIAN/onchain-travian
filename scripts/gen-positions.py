"""Generates the position classes appended to src/web/public/style.css.

Classic layout measurements: resource-field level markers (rf1..rf18, 300x264 picture),
village-centre building spots (slot = 18 + d, 540x448 picture, 75x100 buildings).
(The map is an inline SVG with computed positions; see src/web/views/map.ts.)
Usage: python3 scripts/gen-positions.py > /tmp/pos.css  (then replace the block in style.css)
"""
rf = [(93,27),(156,26),(216,41),(38,59),(130,67),(195,87),(253,81),(23,111),(74,104),(205,136),(260,139),(33,165),(84,158),(151,178),(230,192),(79,211),(132,223),(182,227)]
d = [(115,52),(198,27),(258,17),(332,32),(388,81),(80,91),(161,98),(247,81),(395,122),(66,161),(192,126),(155,152),(402,180),(84,200),(227,196),(354,213),(158,236),(286,247),(144,267),(262,276)]
out = ['/* dorf1 level markers (top-left of 17x12 badge) and click areas */']
for i, (x, y) in enumerate(rf, 1):
    out.append(f'#vmap1 .rf{i} {{ left: {x}px; top: {y}px; }}')
    out.append(f'#vmap1 .ra{i} {{ left: {x-14}px; top: {y-24}px; }}')
out.append('/* dorf2 building spots: slot = 18 + d (top-left of 75x100 image); z-index increases downwards */')
for i, (x, y) in enumerate(d, 1):
    s = 18 + i
    out.append(f'#vmap2 .b{s} {{ left: {x}px; top: {y}px; z-index: {5+i}; }}')
    out.append(f'#vmap2 .l{s} {{ left: {x+29}px; top: {y+74}px; }}')
out += ['#vmap2 .b39 { left: 316px; top: 161px; z-index: 30; }', '#vmap2 .l39 { left: 342px; top: 262px; }', '#vmap2 .l40 { left: 240px; top: 350px; }']
print('\n'.join(out))
