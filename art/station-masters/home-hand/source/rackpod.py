# The rack pod, 24×32, as the renderer's 1-bit layers (white = on). The renderer fills each layer with the
# species' palette ramp: body = colour A, accent = colour B, light = A's lighter neighbour, shade = A's darker,
# outline = the darkest of A's ramp (never black); a pattern layer takes B over the body. Hand-placed on the grid.
import sys, os, math
from PIL import Image
W, H = 24, 32
def urn(x, y):
    # the shell: rows 5..31; half-width grows from 7 at the shoulder to 11 at the belly (row 18), back to 7 at the foot
    if not (4 <= y <= 31): return False
    return abs(x + 0.5 - 12) <= hw(y)
def hw(y):
    t = (y + .5 - 18) / 14.0
    return 11 - 4.6 * t * t
def cap(x, y): return 0 <= y <= 6 and ((x + .5 - 12) / 6.8) ** 2 + ((y + .5 - 4.2) / 4.2) ** 2 <= 1
def body(x, y): return urn(x, y) or cap(x, y)
def edge(f, x, y): return f(x, y) and not all(f(x + dx, y + dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
L = {}
L['body'] = lambda x, y: body(x, y)
L['outline'] = lambda x, y: edge(body, x, y)
# two straps that follow the shell's curve, two pixels in from each side, as the small pod's side straps
def strap(x, y): return 8 <= y <= 29 and (abs((x + .5) - (12 - (hw(y) - 3))) < .6 or abs((x + .5) - (12 + (hw(y) - 3))) < .6)
L['accent'] = lambda x, y: (cap(x, y) and not edge(body, x, y)) or (urn(x, y) and not edge(body, x, y) and strap(x, y)) or (y == 7 and urn(x, y) and not edge(body, x, y))
L['light'] = lambda x, y: body(x, y) and not edge(body, x, y) and ((x - 7) ** 2 / 4 + (y - 11) ** 2 / 16 <= 1 or (cap(x, y) and y <= 2 and x <= 10))
L['shade'] = lambda x, y: urn(x, y) and not edge(body, x, y) and (x - 12) + (y - 18) * 0.9 >= 9
inner = lambda x, y: urn(x, y) and not edge(body, x, y) and 8 <= y <= 29
L['pattern-dots'] = lambda x, y: inner(x, y) and (x % 5 == 2) and (y % 5 == 1)
L['pattern-bands'] = lambda x, y: inner(x, y) and y in (12, 17, 22, 27)
L['pattern-stripes'] = lambda x, y: inner(x, y) and x in (8, 15)
L['pattern-ribs'] = lambda x, y: inner(x, y) and x in (4, 8, 15, 19) and y % 2 == 0
L['pattern-segments'] = lambda x, y: inner(x, y) and (y in (13, 20, 26) or (x in (9, 14) and y in range(8, 30)))
L['pattern-plates'] = lambda x, y: inner(x, y) and ((y - 8) % 4 == 0 or ((x + (2 if ((y - 8) // 4) % 2 else 0)) % 5 == 0))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
for name, f in L.items():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            if f(x, y): im.putpixel((x, y), (255, 255, 255, 255))
    im.save(os.path.join(OUT, f'home-rack-pod-{name}-24x32.png'))
print('ok', len(L))
