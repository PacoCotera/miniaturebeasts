# The capsule masters at authority scale (1024 x 600, closed's frame), cut from the house-style stills.
#   room-day      closed with the capsule painted out (the wall and table carried across row by row)
#   shell         the slate body, roof-lamp housing and base, window transparent, bar slot dark
#   interior-day  the studio's empty interior, inside the window only
#   bar-lit       the mint bar and glow (alpha), from closed
#   door-open     the swung glass door (alpha), from open after a dy -19 translate
# The dusk grades and the seal ring are separate (dusk.py), from these.
import sys, numpy as np
from PIL import Image, ImageFilter, ImageChops
C, O, E, OUT = sys.argv[1:5]                       # closed, open, empty interior (day), out dir
cl = np.asarray(Image.open(C).convert('RGB')).astype(float)
em = np.asarray(Image.open(E).convert('RGB')).astype(float)
op_img = Image.open(O).convert('RGB').transform((1024, 600), Image.AFFINE, (1, 0, 0, 0, 1, 19), Image.BICUBIC)
op = np.asarray(op_img).astype(float)
def shell_of(a):                                   # the blue-grey slate: blue at least green, low chroma, not light
    R, G, B = a[..., 0], a[..., 1], a[..., 2]; L = (R * 3 + G * 6 + B) / 10
    m = (B >= G - 6) & (B >= R - 14) & (L < 150) & ((a.max(2) - a.min(2)) < 60)
    m[:, :300] = False; m[:, 720:] = False
    return m
def blur(m, r): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def grow(m, k): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(k))) > 127
def shrink(m, k): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(k))) > 127
base = em                                          # the studio's empty interior is closed's frame (0, -1) with no pod: cut from it
sh = shell_of(base)
sh = shrink(grow(sh, 5), 5)                        # close pinholes in the slate
# the silhouette: per row, from the shell's left wall to its right wall (window and bar included)
sil = np.zeros(sh.shape, bool)
for y in range(600):
    c = np.nonzero(sh[y, 300:740])[0]
    if len(c) > 1: sil[y, 300 + c.min():300 + c.max() + 1] = True
sil = shrink(grow(sil, 7), 7)
# the window: a clean arch-topped rounded rectangle fitted to the painted opening (x 351-666, y 20-468), so the
# interior, the drawn glass and the seal ring all follow one smooth outline
from PIL import ImageDraw
X0, X1, Y0, Y1, RB = 351, 666, 20, 468, 55
wm = Image.new('L', (1024, 600), 0); d = ImageDraw.Draw(wm)
d.rectangle((X0, Y0 + 150, X1, Y1 - RB), fill=255)
d.rounded_rectangle((X0, Y1 - 3 * RB, X1, Y1), RB, fill=255)
d.ellipse((X0, Y0, X1, Y0 + 300), fill=255)
win = np.asarray(wm) > 127
for y in range(600):                               # the window ends above the base: drop rows below its lowest moss
    pass
yy, xx = np.mgrid[0:600, 0:1024]
win &= yy < 478
# bar: the mint glow in the base
bar = (base[..., 1] > base[..., 0] + 25) & (base[..., 1] > 130) & (yy > 490) & (yy < 560)
bar_a = np.clip(blur(grow(bar, 9), 3) * 1.0, 0, 1)
# 1. room-day: paint the capsule out, carrying the wall and table across each row
hole = grow(sil, 15) | grow(bar, 9)
room = base.copy()
for y in range(600):
    xs = np.nonzero(hole[y])[0]
    if not len(xs): continue
    x0, x1 = xs.min() - 1, xs.max() + 1
    l = base[y, max(0, x0 - 6):x0].mean(0); r = base[y, x1:min(1024, x1 + 6)].mean(0)
    t = np.linspace(0, 1, x1 - x0 + 1)[:, None]
    room[y, x0:x1 + 1] = l * (1 - t) + r * t
fill = np.asarray(Image.fromarray(room.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(float)
hb = blur(hole, 2)[..., None]
room = base * (1 - hb) + fill * hb
Image.fromarray(room.clip(0, 255).astype(np.uint8)).save(f'{OUT}/capsule-room-day-1024x600.png')
# 2. shell: the slate, window transparent; the bar slot keeps the shell's own dark (the lit bar is its own layer)
shell_rgb = base.copy()
slot = grow(bar, 5)
base_dark = base[sh & ~slot & (yy > 480)].mean(0)
shell_rgb[slot] = base_dark * 0.8
shell_a = (sil & ~win).astype(float)
shell_a = np.clip(blur(shell_a, 0.8), 0, 1)
Image.fromarray(np.dstack([shell_rgb, shell_a * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(f'{OUT}/capsule-shell-1024x600.png')
# 3. interior-day: the empty interior inside the window
wa = blur(win, 1.0)
Image.fromarray(np.dstack([em, wa * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(f'{OUT}/capsule-interior-day-1024x600.png')
# 4. bar-lit: the mint bar and its glow over the dark slot
Image.fromarray(np.dstack([base, bar_a * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(f'{OUT}/capsule-bar-lit-1024x600.png')
# 5. door-open: in the registered open, what is not the closed capsule and not the room: the door to the right
diff = np.abs(op - base).sum(2) > 45
door = diff & (xx > 703) & (xx < 1000) & (yy > 10) & (yy < 578) & ~sil   # 578: below it the translate left no data
door = shrink(grow(door, 7), 5)
# keep only the door's own outline region: rows' extent of the strong frame (the dark rim) filled across
rim = door & (op.max(2) < 110)
dr = np.zeros(door.shape, bool)
for y in range(600):
    c = np.nonzero(rim[y])[0]
    if len(c) > 1: dr[y, c.min():c.max() + 1] = True
door = grow(dr, 5)
cols = np.nonzero(door.any(0))[0]; rows = np.nonzero(door.any(1))[0]
# the door's glass: keep its frame and reflections; the room behind is transparent by lightness difference
da = np.clip(np.abs(op - room).sum(2) / 120, 0, 1) * door
da = blur(da > 0, 1.0) * np.clip(np.abs(op - room).sum(2) / 60, 0, 1)
Image.fromarray(np.dstack([op, da * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(f'{OUT}/capsule-door-open-1024x600.png')
Image.fromarray((win * 255).astype(np.uint8)).save(f'{OUT}/window-mask-1024x600.png')
print('shell box', np.nonzero(sil.any(0))[0][[0, -1]], np.nonzero(sil.any(1))[0][[0, -1]], 'door box', cols[[0, -1]] if len(cols) else None, rows[[0, -1]] if len(rows) else None)
