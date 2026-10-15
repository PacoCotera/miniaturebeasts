"""c-partner-none-32x32: the Mibis card's "No partner" picture (fix 6), in place of the dotted placeholder ring. The empty leaf-bed
a partner would curl in: a small round moss cushion with a soft hollow, seen from the front at the partner portraits' angle, on
the core 48 (pine/forest/leaf/grass, the hollow forest/pine), one ink outline (never void), lit from the top left; centred, drawn at 2x like the 32 px
species tokens in the card's 64x64 box; its lowest opaque row 31 like the tokens' feet. Alpha 0/255. usage: make-partner-none.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import pal
P = pal.load()
def C(n): return tuple(P.rgb(n)) if hasattr(P, 'rgb') and callable(P.rgb) else None
names = P.names if isinstance(P.names, (list, tuple)) else list(P.names)
hexes = P.hexes if isinstance(P.hexes, (list, tuple)) else list(P.hexes)
col = {n: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for n, h in zip(names, hexes)}
W = H = 32; img = np.zeros((H, W, 4), np.uint8)
yy, xx = np.mgrid[0:H, 0:W] + .5
cx, cy, rx, ry = 16, 25, 12, 5.8                     # the cushion
cush = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
hol = ((xx - cx) / 7.2) ** 2 + ((yy - (cy - 1.6)) / 2.8) ** 2 <= 1      # the hollow, toward the back
def put(m, n): img[m, :3] = col[n]; img[m, 3] = 255
put(cush, 'leaf')
lit = cush & (((xx - (cx - 6)) / rx) ** 2 + ((yy - (cy - 4)) / ry) ** 2 <= 0.55); put(lit & ~hol, 'grass')
shade = cush & ((xx - cx) / rx + (yy - cy) / ry > 0.75); put(shade, 'forest')
put(hol, 'forest'); put(hol & ((yy - (cy - 1.6)) < -1.0), 'pine')         # the hollow's back wall in shade
# moss tufts on the rim, a few pixels
for x, y in ((8, 22), (12, 20), (20, 20), (24, 22)): img[y, x, :3] = col['grass']; img[y, x, 3] = 255
# outline
a = img[..., 3] > 0; p = np.pad(a, 1)
edge = ~a & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
img[edge, :3] = col['ink']; img[edge, 3] = 255
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
Image.fromarray(img, 'RGBA').save(os.path.join(out, 'c-partner-none-32x32.png'))
ys = np.where(img[..., 3].any(1))[0]; print('rows', ys.min(), ys.max(), 'off palette', P.off_palette(Image.fromarray(img, 'RGBA')))
