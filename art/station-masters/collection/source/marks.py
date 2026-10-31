#!/usr/bin/env python3
# The collection v2 state marks (the collection v2 design §6, the collection v2 art direction "The marks"): 16 x 16 masters, code-drawn pixel work in the Station palette, none painted (at 16 px a painted mark muddies).
# They ride a 20 px disc the build draws (`panel` fill, a 1 px `bevel` rim), and the card's state line uses the same masters with no disc. Told apart by silhouette: heart, stick, moon, handheld, cold mark
# (and the lamp at 12, the placed home-lamp-sky-12x12 as it is). The Incubator capsule comes later, with breeding.
#   mark-heart-16                 bonded: the enamel heart, re-cut at 16 from the signed heart-full-24 (the same shape and the same four colours: coral, peach light, red shade, wine edge)
#   mark-elder-16                 elder: a walking stick, a 2 px shaft and a 4 px hooked head at the top left, `sand` with a `bark` shadow side, its foot on row 15; no notches (they would read as the skill notch)
#   mark-asleep-16                resting after a cross: the placed mark-asleep-24x16 cut at 16 (its moon whole, the trail of dots drawn closer)
#   mark-cold-16                  tucked away: the placed cold mark (mark-species-frost-24x24) cut at 16 (its rim and its speckle, point-sampled)
#   mark-companion-outline-16     away with the Companion: the handheld's outline in `bone` (the top bar's frame-companion-outline-16x24, cut at 16)
#   mark-companion-solid-16       on the Companion, docked: the handheld solid, `bone` with a `fog` shade, its screen `ground` (frame-companion-solid-16x24, cut at 16)
# Writes the PNGs and slices/manifest.json (each size and hash) and slices/status.json (new: for the art director's 1x proof), and the proofs: each mark on its disc over the four rooms in the four lights at 1x,
# and the set at 8x side by side.
#   python3 art/station-masters/collection/source/marks.py
import os, json, math, hashlib
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
MASTERS = os.path.join(REPO, "prototypes/ui/assets/masters")
P = dict(void='#0c0a12', bone='#f1ebdf', mist='#8d8aa6', fog='#c6c4d8', hairline='#3d434b', bevel='#565c63', panel='#2b3038', ground='#1d232b',
         sand='#e6c98c', clay='#bf9157', bark='#7d5435', coral='#ff5f57', peach='#ffa67c', red='#c93440', wine='#6b1e33')
H = lambda n: tuple(int(P[n][i:i + 2], 16) for i in (1, 3, 5)) + (255,)
def img(): return Image.new('RGBA', (16, 16), (0, 0, 0, 0))
made = {}

# the heart: heart-full-24's own shape and colours at 16 (home-hand/source/home_marks.py), the scale 16/24
im = img(); k = 16 / 24
def inheart(x, y):
    u = (x + .5 - 8) / (9.2 * k); v = -(y + .5 - 12.5 * k) / (9.2 * k)
    return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0
for y in range(16):
    for x in range(16):
        if not inheart(x, y): continue
        edge = not all(inheart(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        d = ((x - 7 * k) / (1.6 * k)) ** 2 + ((y - 7 * k) / k) ** 2
        c = 'wine' if edge else 'peach' if d <= 2.2 else 'red' if (x + y > 28 * k or y > 17 * k) else 'coral'
        im.putpixel((x, y), H(c))
made['mark-heart-16'] = im

# the walking stick: the shaft 2 px wide (x 9 lit, x 10 its shadow side) from row 3 to its foot on row 15; the hooked head over rows 1 to 4 at the top left, curling down to its tip
im = img()
for y in range(3, 16): im.putpixel((9, y), H('sand')); im.putpixel((10, y), H('bark'))
for x in range(5, 10): im.putpixel((x, 1), H('sand'))            # the crook's top
im.putpixel((10, 1), H('bark')); im.putpixel((10, 2), H('bark')); im.putpixel((9, 2), H('sand'))
for (x, y) in ((4, 2), (4, 3)): im.putpixel((x, y), H('sand'))   # the crook's fall
for (x, y) in ((5, 2), (5, 3), (4, 4)): im.putpixel((x, y), H('bark'))   # its inner side and tip in shadow
made['mark-elder-16'] = im

# the asleep mark cut at 16: the moon whole (columns 0 to 12 of the 24 x 16), the trail of dots drawn closer
src = Image.open(os.path.join(MASTERS, 'pods/mark-asleep-24x16.png')).convert('RGBA'); im = img()
for y in range(16):
    for x in range(13): im.putpixel((x, y), src.getpixel((x, y)))
dot = src.getpixel((17, 10))
for (x, y) in ((12, 10), (13, 10), (12, 11), (13, 11), (14, 6), (15, 6), (14, 7), (15, 7)): im.putpixel((x, y), dot)
made['mark-asleep-16'] = im

# the cold mark cut at 16: a disc with the 24's rim colour, its speckle point-sampled (x 1.5)
src = Image.open(os.path.join(MASTERS, 'pods/mark-species-frost-24x24.png')).convert('RGBA'); im = img(); rim = src.getpixel((9, 1))
for y in range(16):
    for x in range(16):
        r = math.hypot(x + .5 - 8, y + .5 - 8)
        if r > 7.6: continue
        s = src.getpixel((min(23, int((x + .5) * 1.5)), min(23, int((y + .5) * 1.5))))
        im.putpixel((x, y), rim if r > 6.6 or s[3] == 0 else s)
made['mark-cold-16'] = im

# the Companion at 16: the handheld 10 x 15 (x 3 to 12, rows 1 to 15), its screen x 5 to 10, rows 3 to 8, two keys on row 11
def body(x, y): return 3 <= x <= 12 and 1 <= y <= 15 and not (x in (3, 12) and y in (1, 15))
def screen(x, y): return 5 <= x <= 10 and 3 <= y <= 8
KEYS = ((5, 11), (6, 11), (9, 11), (10, 11), (5, 12), (6, 12), (9, 12), (10, 12))
im = img()   # outline: the body's edge, the screen's edge and the keys, in bone
for y in range(16):
    for x in range(16):
        if body(x, y) and not all(body(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): im.putpixel((x, y), H('bone'))
        elif screen(x, y) and not all(screen(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): im.putpixel((x, y), H('bone'))
for (x, y) in ((5, 11), (6, 11), (9, 11), (10, 11)): im.putpixel((x, y), H('bone'))
made['mark-companion-outline-16'] = im
im = img()   # solid: bone, the right and bottom edges fog (the house light from the upper left), the screen ground, the keys bevel
for y in range(16):
    for x in range(16):
        if not body(x, y): continue
        c = 'fog' if (x == 12 or y == 15 or (x == 11 and y == 14)) else 'bone'
        if screen(x, y): c = 'ground'
        im.putpixel((x, y), H(c))
for (x, y) in KEYS: im.putpixel((x, y), H('bevel'))
made['mark-companion-solid-16'] = im

out = os.path.join(ROOT, 'slices'); os.makedirs(out, exist_ok=True)
manifest, status = {}, {}
for name, m in sorted(made.items()):
    f = os.path.join(out, name + '.png'); m.save(f)
    manifest[name] = {"size": [16, 16], "src": "source/marks.py", "sha256": hashlib.sha256(open(f, 'rb').read()).hexdigest()}
    status[name] = {"status": "new", "note": "code-drawn by the builder (collection v2 art job 5), for the art director's 1x proof"}
open(os.path.join(out, 'manifest.json'), 'w').write(json.dumps(manifest, indent=1) + "\n")
open(os.path.join(out, 'status.json'), 'w').write(json.dumps(status, indent=1) + "\n")

# ---- the proofs ----
order = ['mark-companion-outline-16', 'mark-companion-solid-16', 'lamp', 'mark-asleep-16', 'mark-heart-16', 'mark-elder-16', 'mark-cold-16']
lamp = Image.open(os.path.join(MASTERS, 'pods/home-lamp-sky-12x12.png')).convert('RGBA')
def disc():   # the 20 px disc the build draws: panel fill, a 1 px bevel rim
    d = Image.new('RGBA', (20, 20), (0, 0, 0, 0)); dr = ImageDraw.Draw(d); dr.ellipse([0, 0, 19, 19], fill=H('panel'), outline=H('bevel')); return d
def on_disc(name):
    d = disc(); m = lamp if name == 'lamp' else made[name]; d.alpha_composite(m, ((20 - m.width) // 2, (20 - m.height) // 2)); return d
ROOMS = ['roots', 'reeds', 'boulders', 'ferns']; LIGHTS = ['dawn', 'day', 'dusk', 'night']
CROP = {'roots': (40, 140), 'reeds': (240, 140), 'boulders': (230, 140), 'ferns': (200, 140)}   # a patch of each room's window, its sky and back (where a disc rides a figure's top)
cell = (len(order) * 24 + 8, 32)
sheet = Image.new('RGBA', (cell[0] * 4, cell[1] * 4), H('ground'))
for r, room in enumerate(ROOMS):
    for c, light in enumerate(LIGHTS):
        base = Image.open(os.path.join(MASTERS, f'rooms/room-{room}-idle-{light}-1024x568.png')).convert('RGBA'); x0, y0 = CROP[room]
        patch = base.crop((x0, y0, x0 + cell[0], y0 + cell[1]))
        for i, name in enumerate(order): patch.alpha_composite(on_disc(name), (6 + i * 24, 6))
        sheet.alpha_composite(patch, (c * cell[0], r * cell[1]))
sheet.save(os.path.join(ROOT, 'proof-marks-1x.png'))
big = Image.new('RGBA', ((len(order) * 24 + 4) * 8, 28 * 8), H('panel'))
for i, name in enumerate(order): big.alpha_composite(on_disc(name).resize((160, 160), Image.NEAREST), (16 + i * 24 * 8, 32))
big.save(os.path.join(ROOT, 'proof-marks-8x.png'))
print('ok', len(made))
