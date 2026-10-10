# Home's hand-pixelled art-layer masters, palette-exact (the Station palette after the re-sign).
import sys, os, math
from PIL import Image
P = dict(void='#0c0a12', bone='#f1ebdf', white='#ffffff', mist='#8d8aa6', stone='#5d5974', fog='#c6c4d8',
         sprout='#98d85c', lime='#d4f281', grass='#5cbb4c', leaf='#329245', forest='#23623c',
         sky='#5bb9f3', ice='#a9e6ff', river='#3084d8',
         hairline='#3d434b', bevel='#565c63', bar='#23292f', panel='#2b3038', ground='#1d232b',
         metal='#8a947b', enamel='#a99f8a', deepTeal='#2a2a2d', sage='#84ae78', sageD='#5d7a5f',
         orange='#f2671b', amber='#ffa83f', cream='#fff4a6', rust='#a6420c', sand='#e6c98c', clay='#bf9157', bark='#7d5435',
         coral='#ff5f57', peach='#ffa67c', red='#c93440', wine='#6b1e33', blush='#ffd4bf')
H = lambda n: tuple(int(P[n][i:i+2], 16) for i in (1, 3, 5)) + (255,)
def img(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def disc_mask(w, h, inset=0.0):
    cx, cy = w / 2, h / 2; r = min(w, h) / 2 - inset
    return [[math.hypot(x + .5 - cx, y + .5 - cy) <= r for x in range(w)] for y in range(h)]
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True); made = {}
def save(name, im): im.save(os.path.join(OUT, name + '.png')); made[name] = im

# Lamps 12x12: a void rim, the body, one lit 2x2 at the upper left (the house light).
for col, lit in (('sprout', 'lime'), ('sky', 'ice'), ('hairline', 'bevel'), ('amber', 'cream')):
    im = img(12, 12); outer = disc_mask(12, 12, 0.1); inner = disc_mask(12, 12, 1.1)
    for y in range(12):
        for x in range(12):
            if outer[y][x]: im.putpixel((x, y), H('void') if not inner[y][x] else H(col))
    for (x, y) in ((3, 3), (4, 3), (3, 4)): im.putpixel((x, y), H(lit))
    save(f'home-lamp-{col}-12x12', im)

# Leaf 8x12: full (sage, sageD vein and shade, a sprout lit edge) and empty (a bevel outline).
LEAF = ["...##...", "..####..", ".######.", ".######.", "########", "########",
        "########", ".######.", ".######.", "..####..", "...##...", "...##..."]
for state in ('full', 'empty'):
    im = img(8, 12)
    for y, r in enumerate(LEAF):
        for x, c in enumerate(r):
            if c != '#': continue
            edge = any(not (0 <= x + dx < 8 and 0 <= y + dy < 12 and LEAF[y + dy][x + dx] == '#') for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
            if state == 'empty':
                if edge: im.putpixel((x, y), H('bevel'))
            else:
                c2 = 'sageD' if (x in (3, 4) and 2 <= y <= 9) or (edge and x >= 4) else 'sage'
                if edge and x <= 2 and y <= 6: c2 = 'sprout'
                im.putpixel((x, y), H(c2))
    for y in (10, 11): im.putpixel((3, y), H('sageD' if state == 'full' else 'bevel')); im.putpixel((4, y), (0, 0, 0, 0)) if y == 11 else None
    save(f'home-leaf-{state}-8x12', im)

# Shield plate 12x24: whole (white plate, fog shade, bevel edge) and lost (a stone outline).
for state in ('whole', 'lost'):
    im = img(12, 24)
    for y in range(24):
        for x in range(12):
            inside = 1 <= x <= 10 and 1 <= y <= 22 and not ((x in (1, 10)) and (y in (1, 22)))
            edge = inside and (x in (1, 10) or y in (1, 22) or (x in (2, 9) and y in (1, 22)) or (y in (2, 21) and x in (1, 10)))
            if not inside: continue
            if state == 'lost':
                if x in (1, 10) or y in (1, 22): im.putpixel((x, y), H('stone'))
            else:
                if x in (1, 10) or y in (1, 22): c = 'bevel'
                elif x >= 8 or y >= 19: c = 'fog'
                else: c = 'white'
                im.putpixel((x, y), H(c))
    if state == 'whole':
        for y in range(4, 19): im.putpixel((5, y), H('fog'))   # the plate's centre seam
    save(f'home-shield-{state}-12x24', im)

# The bed mark 16x24: the Companion's silhouette (a rugged handheld, strap tab, screen), a 1 px mist outline.
im = img(16, 24)
body = lambda x, y: 2 <= x <= 13 and 3 <= y <= 22 and not ((x in (2, 13)) and (y in (3, 22)))
for y in range(24):
    for x in range(16):
        if body(x, y) and not body(x - 1, y) or body(x, y) and not body(x + 1, y) or body(x, y) and not body(x, y - 1) or body(x, y) and not body(x, y + 1):
            im.putpixel((x, y), H('mist'))
for x in range(5, 11):
    im.putpixel((x, 6), H('mist')); im.putpixel((x, 12), H('mist'))
for y in range(6, 13): im.putpixel((5, y), H('mist')); im.putpixel((10, y), H('mist'))
for (x, y) in ((6, 16), (5, 17), (7, 17), (6, 18), (10, 17), (11, 17)): im.putpixel((x, y), H('mist'))
for (x, y) in ((1, 5), (0, 6), (0, 7), (0, 8), (1, 9)): im.putpixel((x, y), H('mist'))   # the strap loop on the left side
save('home-bed-mark-16x24', im)

# The sitting frame 24x32: a matte card frame in the sand housing, the portrait window dark.
im = img(24, 32)
for y in range(32):
    for x in range(24):
        if x in (0, 23) or y in (0, 31): c = 'bark'
        elif x in (1,) or y in (1,): c = 'sand'
        elif x in (22,) or y in (30,): c = 'clay'
        elif 3 <= x <= 20 and 3 <= y <= 24: c = 'ground' if not (x in (3, 20) or y in (3, 24)) else 'bark'
        else: c = 'enamel'
        im.putpixel((x, y), H(c))
for x in range(9, 15): im.putpixel((x, 27), H('bark'))
save('home-sitting-24x32', im)

# The crate 48x40: the one crate look (the signed Home bay crates, the art director's ruling): a sage moulded field case
# (metal), a handle on top, two sand latches (enamel, lit sand, shade clay), dark rubber corners (deepTeal), an orange
# seal tag across the lid seam; lit enamel top edges from the top left, bevel shade lower right, hairline seams.
im = img(48, 40)
def put(x, y, c): im.putpixel((x, y), H(c))
for y in range(0, 6):                                   # the handle
    for x in range(16, 32):
        bar = y <= 1; leg = x in (16, 17, 30, 31)
        if bar or leg: put(x, y, 'enamel' if (y == 0 and not leg) or (x == 16) else ('bevel' if x == 31 or (y == 1 and not leg) else 'metal'))
for y in range(5, 40):                                  # the body and lid
    for x in range(48):
        edge = x in (0, 47) or y in (5, 39)
        corner = (x < 5 or x > 42) and (y < 10 or y > 34)
        if corner: c = 'deepTeal' if not (x in (1,) and y in (6, 36)) else 'bevel'
        elif edge: c = 'hairline'
        elif y == 6 or x == 1: c = 'enamel'
        elif y >= 37 or x >= 45: c = 'bevel'
        elif y == 15: c = 'hairline'                    # the lid seam
        elif y == 16: c = 'enamel'
        elif x in (11, 36) and y > 6: c = 'bevel'       # moulded ribs
        else: c = 'metal'
        put(x, y, c)
for x0 in (7, 37):                                      # the latches
    for y in range(11, 21):
        for x in range(x0, x0 + 5):
            c = 'clay' if (x == x0 + 4 or y == 20) else ('sand' if x == x0 or y == 11 else 'enamel')
            put(x, y, c)
    put(x0 + 2, 15, 'clay'); put(x0 + 2, 16, 'clay')
for y in range(12, 20):                                 # the orange seal tag across the seam
    for x in range(22, 27):
        put(x, y, 'rust' if (x == 26 or y == 19) else 'orange')
put(24, 13, 'rust')
save('home-crate-48x40', im)

# heart-full-24: the enamel heart in the house light; coral body, peach light, red shade, wine edge; no face, no sparkle.
im = img(24, 24)
def inheart(x, y):
    u = (x + .5 - 12) / 9.2; v = -(y + .5 - 12.5) / 9.2
    return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0
for y in range(24):
    for x in range(24):
        if not inheart(x, y): continue
        edge = not all(inheart(x + dx, y + dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
        d = ((x - 7) / 1.6) ** 2 + (y - 7) ** 2
        if edge: c = 'wine'
        elif d <= 2.2: c = 'peach'
        elif x + y > 28 or y > 17: c = 'red'
        else: c = 'coral'
        im.putpixel((x, y), H(c))
save('heart-full-24', im)
print('ok', len(made))
