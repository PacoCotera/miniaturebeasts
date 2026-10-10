# The Companion's care hearts, hand-placed on the 48 colours (HiBit): the same enamel heart as the
# Vivarium card's, lit from the top left; outline in the red ramp's dark (wine), never black; no alpha but a clear ground.
import sys, os
from PIL import Image
P = dict(coral='#ff5f57', peach='#ffa67c', red='#c93440', wine='#6b1e33', blush='#ffd4bf')
H = lambda n: tuple(int(P[n][i:i+2], 16) for i in (1, 3, 5)) + (255,)
def heart(n, cx, cy, s, hx, hy, rx):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    def inside(x, y):
        u = (x + .5 - cx) / s; v = -(y + .5 - cy) / s
        return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0
    for y in range(n):
        for x in range(n):
            if not inside(x, y): continue
            edge = not all(inside(x + dx, y + dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
            d = ((x - hx) / rx) ** 2 + (y - hy) ** 2
            if edge: c = 'wine'
            elif d <= 2.2: c = 'peach'
            elif x + y > (cx + cy) * 1.15 or y > cy + s * 0.55: c = 'red'
            else: c = 'coral'
            im.putpixel((x, y), H(c))
    return im
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
heart(24, 12, 12.5, 9.2, 7, 7, 1.6).save(os.path.join(OUT, 'c-heart-24.png'))
# The 16 is its own drawing: a rounder heart, a two-pixel light, the shade kept to the lower right.
h16 = heart(16, 8, 8.3, 6.2, -99, -99, 1.0)   # no blob: the light is placed by hand below
for (x, y) in ((5, 4), (4, 5)): h16.putpixel((x, y), H('peach'))
h16.save(os.path.join(OUT, 'c-heart-16.png'))
print('ok')
