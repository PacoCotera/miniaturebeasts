# The opened pod, neutral: keyed off its magenta ground (alpha from the distance to magenta, edges decontaminated
# from their opaque neighbours), split into its pieces. Kept: the bowl (the lower shell with its broken rim) and the
# tipped cap; the third piece (a vertical half seen from its broken side) is left out, since the bowl and cap tell
# "opened" without it. Each piece is saved as a neutral shade layer at the raw's scale, for the renderer's cut.
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1:3]
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
mag = np.array([255, 0, 255.])
d = np.sqrt(((a - mag) ** 2).sum(2))
alpha = np.clip((d - 60) / 90, 0, 1)
g = a.mean(2)                                                            # neutral: the grey value only
rgb = np.repeat(g[..., None], 3, 2)
known = alpha > 0.98
for _ in range(6):                                                       # edge pixels take their opaque neighbours' grey
    acc = np.zeros_like(g); n = np.zeros_like(g)
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        k = np.roll(known, (dy, dx), (0, 1)); acc += np.roll(g, (dy, dx), (0, 1)) * k; n += k
    grow = ~known & (n > 0) & (alpha > 0); g[grow] = acc[grow] / n[grow]; known |= grow
rgb = np.repeat(g[..., None], 3, 2)
cols = alpha.max(0) > 0.5
runs, start = [], None                                                   # the pieces stand apart: split on empty columns
for x, c in enumerate(list(cols) + [False]):
    if c and start is None: start = x
    if not c and start is not None: runs.append((start, x)); start = None
names = ['bowl', 'cap', 'half']
for (x0, x1), name in zip(runs, names):
    if name == 'half': continue
    rows = np.nonzero(alpha[:, x0:x1].max(1) > 0.5)[0]; y0, y1 = rows.min(), rows.max() + 1
    piece = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255]).astype(np.uint8)
    Image.fromarray(piece, 'RGBA').save(f'{out}/pod-opened-{name}-shade-{x1 - x0}x{y1 - y0}.png')
    print(name, (x0, y0, x1, y1))
