"""Fix 11 (gate batch 1; AD, 10-15): mark-asleep-24x16 redrawn (same id and size, top 2). The pass 38 glyph was a slim
crescent (2-4 px) with an ink keyline over four dots: at 1x it read as a pointer, and its meaning sat under 12 px. Now, in the name-
line family's colours (no ink, no white): a full crescent moon 12 wide x 14 tall (bone rim lit at the top left, fog face, a mist
shade on the inner curve), and three sleep dots rising to its right (fog, 2 x 2, the last one smaller). No Z's, no face.
usage: python3 -I make-asleep-glyph.py OUT.png"""
import sys, numpy as np
from PIL import Image
C = {'b': (241, 235, 223), 'f': (198, 196, 216), 'S': (169, 181, 200), 'm': (141, 138, 166)}
W, H = 24, 16
yy, xx = np.mgrid[0:H, 0:W] + .5
cx, cy, R = 8.0, 8.0, 7.0                                   # the moon's disc: x 1-15, y 1-15 (14 tall)
disc = np.hypot(xx - cx, yy - cy) <= R
bite = np.hypot(xx - (cx + 4.6), yy - (cy - 2.6)) <= R * 0.86  # the bite to the upper right
moon = disc & ~bite
g = np.full((H, W), '', object)
g[moon] = 'f'
inner = moon & (np.hypot(xx - (cx + 4.6), yy - (cy - 2.6)) <= R * 0.86 + 1.6)     # the inner curve, in shade
g[inner] = 'm'
outer = moon & (np.hypot(xx - cx, yy - cy) > R - 1.2)
lit = (xx - cx) + (yy - cy) < 2
g[outer & lit] = 'b'; g[outer & ~lit] = 'S'
for (x, y, s) in ((17, 10, 2), (19, 6, 2), (21, 3, 1)):    # the sleep dots, rising
    g[y:y + s, x:x + s] = 'f'
g[0:2, :] = ''; g[:, :] = np.where(np.arange(W)[None, :] < 1, '', g)
img = np.zeros((H, W, 4), np.uint8)
for k, c in C.items():
    m = g == k; img[m, :3] = c; img[m, 3] = 255
Image.fromarray(img, 'RGBA').save(sys.argv[1])
ys, xs = np.where(img[..., 3] > 0); mys, mxs = np.where(moon[2:, 1:]); print('ink', xs.max() - xs.min() + 1, 'x', ys.max() - ys.min() + 1, 'moon', mxs.max() - mxs.min() + 1, 'x', mys.max() - mys.min() + 1)
