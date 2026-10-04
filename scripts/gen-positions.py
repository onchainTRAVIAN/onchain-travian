"""Generates the position classes appended to src/web/public/style.css.

Classic layout measurements: resource-field level markers (rf1..rf18, 300x264 picture),
village-centre building spots (slot = 18 + d, 540x448 picture, 75x100 buildings), and the
7x7 diamond map (74x74 tiles at left = 16 + 37x + 36y, top = 104 + 20x - 20y).
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
out.append('/* map: 7x7 diamond tiles */')
for x in range(7):
    for y in range(7):
        out.append(f'#mapc .t{x}{y} {{ left: {16+37*x+36*y}px; top: {124+20*x-20*y}px; z-index: {10+x-y+7}; }}')
for k in range(7):
    out.append(f'#mapc .mx{k} {{ left: {4+37*k}px; top: {170+20*k}px; }}')
    out.append(f'#mapc .my{k} {{ left: {300+36*k}px; top: {288-20*k}px; }}')
out += ['#mapc .ar-n { left: 404px; top: 46px; }', '#mapc .ar-e { left: 404px; top: 234px; }', '#mapc .ar-s { left: 124px; top: 234px; }', '#mapc .ar-w { left: 124px; top: 46px; }']
print('\n'.join(out))
