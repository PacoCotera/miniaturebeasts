"""The value-gap check: does the explorer read on this ground in four greys?
The pawn (front walk frame) is set at every 24 px step where the ground under its whole footprint is grass-coloured. For each
placing, its edge pixels (opaque, next to transparent) are compared with the ground pixel just outside them, in the style guide's
four-grey rendering (luminance in four bands). Reported: the share of edge pixels in a different grey band from the ground beside
them (the silhouette that survives in four greys), the worst placing, and the mean luminance step at the edge.
usage: python3 -I value-gap.py PAWN.png SCREEN.png [SCREEN.png ...]"""
import sys
import numpy as np
from PIL import Image
pw = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).astype(float); op = pw[..., 3] > 127
edge = op & ~(np.roll(op, 1, 0) & np.roll(op, -1, 0) & np.roll(op, 1, 1) & np.roll(op, -1, 1))
lum = lambda a: 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
band = lambda l: np.clip((l / 256 * 4).astype(int), 0, 3)
pl = lum(pw); h, w = op.shape
for s in sys.argv[2:]:
    g = np.asarray(Image.open(s).convert("RGB")).astype(float); gl = lum(g)
    grass = (g[..., 1] > g[..., 0] * 1.05) & (g[..., 1] > g[..., 2] * 1.05)
    shares, steps = [], []
    for y in range(0, g.shape[0] - h, 24):
        for x in range(0, g.shape[1] - w, 24):
            if not grass[y:y + h, x:x + w].all(): continue
            # the ground just outside each edge pixel: the pixel 1 to the left/right/up/down that is transparent in the pawn
            diff, st = [], []
            for yy, xx in zip(*np.where(edge)):
                for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                    ny, nx = yy + dy, xx + dx
                    if 0 <= ny < h and 0 <= nx < w and not op[ny, nx]:
                        gv = gl[y + ny, x + nx]; diff.append(band(pl[yy, xx]) != band(gv)); st.append(abs(pl[yy, xx] - gv)); break
            shares.append(np.mean(diff)); steps.append(np.mean(st))
    if shares: print(f"{s}: placings {len(shares)}, edge in another grey band {np.mean(shares):.0%} (worst {np.min(shares):.0%}), mean edge step {np.mean(steps):.0f}")
    else: print(s, "no all-grass placing")
