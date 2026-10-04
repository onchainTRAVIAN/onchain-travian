import math
out=[]
# dorf1 field positions (600x400 scene): outer ring 12 at 0..330, inner ring 6 at 15+60k
pts=[]
for k in range(12):
    a=math.radians(k*30); pts.append((300+230*math.cos(a), 200+145*math.sin(a)))
for k in range(6):
    a=math.radians(15+60*k); pts.append((300+128*math.cos(a), 200+80*math.sin(a)))
out.append('/* dorf1: 18 field plots (generated) */')
for i,(x,y) in enumerate(pts,1):
    out.append(f'.f{i} {{ left: {x/600*100:.2f}%; top: {y/400*100:.2f}%; }}')
# dorf2 spots (600x440 scene)
spots=[(190,120),(250,95),(355,95),(415,120),(470,160),(480,215),(455,270),(400,305),(330,325),(260,325),(195,305),(140,270),(120,215),(135,160),(215,180),(385,180),(390,240),(300,265),(210,240),(300,205)]
slots=[s for s in range(19,39) if s!=26]
mapping={26:(300,150),39:(300,380),40:(70,330)}
for s,p in zip(slots,spots): mapping[s]=p
out.append('/* dorf2: building spots (generated) */')
for s in sorted(mapping):
    x,y=mapping[s]
    out.append(f'.s{s} {{ left: {x/600*100:.2f}%; top: {y/440*100:.2f}%; }}')
out.append('/* bar widths */')
for i in range(0,101,5): out.append(f'.w{i} {{ width: {i}%; }}')
print('\n'.join(out))
