# The Library spread's clan roundels, 12×12, hand-placed: each signed 24 px clan mark's shape family,
# one clan colour (boards: the clan colour table), a 1 px outline and a 2×2 centre dot. Palette-exact.
import sys, os, math
from PIL import Image
COL = {1:'#0f4c50',2:'#1e5196',3:'#329245',4:'#6f41c6',5:'#7d5435',6:'#3084d8',7:'#173b2d',8:'#c3387e',
       9:'#4b3023',10:'#142650',11:'#23623c',12:'#3c1e6c',13:'#6b1e33',14:'#847fa8',15:'#5d7a5f',16:'#5d5974'}
# Each shape as a filled region on the 12×12 grid (pixel centres); the outline is its 1 px border.
def circle(x, y): return math.hypot(x - 5.5, y - 5.5) <= 5.6
def square(x, y): return 0 <= x <= 11 and 0 <= y <= 11
def rsquare(x, y): return square(x, y) and not ((x in (0, 11)) and (y in (0, 11)))
def diamond(x, y): return abs(x - 5.5) + abs(y - 5.5) <= 6.1
def hexa(x, y): return abs(y - 5.5) <= 4.6 and abs(x - 5.5) + abs(y - 5.5) * 0.62 <= 6.0   # flat top and bottom, points left and right
def hexv(x, y): return abs(x - 5.5) <= 5.0 and abs(y - 5.5) + abs(x - 5.5) * 0.58 <= 6.6
def pent(x, y):
    pts = [(5.5 + 6.2 * math.sin(2 * math.pi * k / 5), 6.2 - 6.2 * math.cos(2 * math.pi * k / 5)) for k in range(5)]
    px, py = x, y; inside = False
    for i in range(5):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % 5]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1: inside = not inside
    return inside
def tall(x, y): return 2 <= x <= 9 and 0 <= y <= 11 and not ((x in (2, 9)) and (y in (0, 11)))
def wide(x, y): return 0 <= x <= 11 and 2 <= y <= 9 and not ((x in (0, 11)) and (y in (2, 9)))
SHAPE = {1: circle, 2: hexa, 3: rsquare, 4: rsquare, 5: rsquare, 6: square, 7: circle, 8: square,
         9: diamond, 10: hexv, 11: circle, 12: pent, 13: circle, 14: tall, 15: wide, 16: pent}
TICKS = {1, 7, 11}   # the ticked circles: a notch at the four compass points, as the 24 px marks
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
for c in range(1, 17):
    f = SHAPE[c]; rgb = tuple(int(COL[c][i:i+2], 16) for i in (1, 3, 5)) + (255,)
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y in range(12):
        for x in range(12):
            p = (x + .5, y + .5)
            if f(x, y) and not all(f(x + dx, y + dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                im.putpixel((x, y), rgb)
    if c == 16:   # its 24 px mark is an irregular pentagon: drawn here point down, apart from C12's point up
        im = im.transpose(Image.FLIP_TOP_BOTTOM)
    if c in TICKS:
        for (x, y) in ((5, 1), (6, 1), (5, 10), (6, 10), (1, 5), (1, 6), (10, 5), (10, 6)): im.putpixel((x, y), rgb)
    for (x, y) in ((5, 5), (6, 5), (5, 6), (6, 6)): im.putpixel((x, y), rgb)
    im.save(os.path.join(OUT, f'clan-roundel-C{c:02d}-12x12.png'))
print('ok')
