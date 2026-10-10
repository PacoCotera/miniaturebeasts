# More hand-placed art-layer masters: the skill notch, the out mark, the Library spread's progress seeds.
import sys, os, math
from PIL import Image
P = dict(void='#0c0a12', mist='#8d8aa6', stone='#5d5974', ground='#1d232b', bevel='#565c63', panel='#2b3038',
         sand='#e6c98c', clay='#bf9157', bark='#7d5435', soil='#4b3023', ink='#1a1725', paper='#f5e6c4')
H = lambda n: tuple(int(P[n][i:i+2], 16) for i in (1, 3, 5)) + (255,)
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
def img(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))

# notch-skill-16x24: one notch cut into the card's plate and filled: a tall V-cut, sand fill,
# its upper-left wall in shadow (ground), its lower-right wall catching the light (bevel).
im = img(16, 24)
def inside(x, y):
    if not (2 <= y <= 21): return False
    half = 5 if y <= 15 else 5 - (y - 15)          # straight sides, then a pointed foot
    return 8 - half <= x <= 7 + half and half > 0
for y in range(24):
    for x in range(16):
        if not inside(x, y): continue
        if not inside(x - 1, y) or not inside(x, y - 1): c = 'ground'
        elif not inside(x + 1, y) or not inside(x, y + 1): c = 'bevel'
        else: c = 'sand' if x <= 8 else 'clay'
        im.putpixel((x, y), H(c))
im.save(os.path.join(OUT, 'notch-skill-16x24.png'))

# mark-out-with-companion-64x96: the mibi's place kept for it; the Companion's outline standing on the ground.
im = img(64, 96)
bx0, by0, bx1, by1 = 16, 18, 47, 81                 # the handheld, 32×64, on its foot at y 81
def body(x, y): return bx0 <= x <= bx1 and by0 <= y <= by1 and not ((x in (bx0, bx1)) and (y in (by0, by1)))
for y in range(96):
    for x in range(64):
        if body(x, y) and not all(body(x + dx, y + dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
            im.putpixel((x, y), H('mist'))
for x in range(21, 43): im.putpixel((x, 25), H('mist')); im.putpixel((x, 52), H('mist'))      # the screen
for y in range(25, 53): im.putpixel((21, y), H('mist')); im.putpixel((42, y), H('mist'))
for (x, y) in ((25, 63), (24, 64), (26, 64), (25, 65), (23, 64), (27, 64), (25, 62), (25, 66)): im.putpixel((x, y), H('mist'))   # the pad
for cx in (36, 41):
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)): im.putpixel((cx + dx, 64 + dy), H('mist'))   # the two keys
for (x, y) in ((15, 30), (14, 31), (13, 32), (13, 33), (13, 34), (14, 35), (15, 36)): im.putpixel((x, y), H('mist'))   # the strap loop
for x in range(6, 58):                                # the ground it stands on, kept: a soft soil line, dashes at the ends
    if 10 <= x <= 53 or x % 3: im.putpixel((x, 83), H('stone'))
for x in range(12, 52, 4): im.putpixel((x, 85), H('stone'))
im.save(os.path.join(OUT, 'mark-out-with-companion-64x96.png'))

# spread-progress-full-8x8 / -empty-8x8: a pressed seed on the tome's paper; full is inked with one lit edge, empty a clay outline.
SEED = ["...##...", "..####..", ".######.", ".######.", ".######.", ".######.", "..####..", "...##..."]
for state in ('full', 'empty'):
    im = img(8, 8)
    for y, r in enumerate(SEED):
        for x, ch in enumerate(r):
            if ch != '#': continue
            edge = not all(0 <= x + dx < 8 and 0 <= y + dy < 8 and SEED[y + dy][x + dx] == '#' for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
            if state == 'empty':
                if edge: im.putpixel((x, y), H('clay'))
            else:
                c = 'bark' if edge else 'soil'
                if (x, y) in ((2, 2), (2, 3), (3, 1)): c = 'clay'     # the lit edge, upper left
                im.putpixel((x, y), H(c))
    im.save(os.path.join(OUT, f'spread-progress-{state}-8x8.png'))
print('ok')
