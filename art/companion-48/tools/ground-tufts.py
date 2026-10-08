"""Tufts on the four grass tiles of the lime ground, drawn DARKER than the ground and GROUPED into darker patches (round 10: an even speckle read as noise; the concept's
ground has patches of deep green with tufts in them). Per tile: three patch centres at hashed positions (kept away from the tile's outer 12 px so the tiles still join),
each a darker patch (an ellipse of the body colour turned to leaf on about 55 % of its pixels, by a hash) with three to five tufts in it, a root in forest and the blades in leaf
(three blades and a tip). Source: the tiles before the tufts (round 8's, frozen), written over work/ground. usage: python3 -I ground-tufts.py SRC_DIR GROUND_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; src, gd = sys.argv[1:3]
for n in ["grass1", "grass2", "grass3", "grass4"]:
    idx = quant.quantize(np.asarray(Image.open(os.path.join(src, n + ".png")).convert("RGBA")))
    body = np.bincount(idx[idx >= 0]).argmax()
    rg = np.random.RandomState(sum(map(ord, n)) * 7); cs = []
    for _ in range(400):
        x, y = int(rg.randint(13, 35)), int(rg.randint(13, 35))
        if all(abs(x - px) + abs(y - py) > 16 for px, py in cs): cs.append((x, y))
        if len(cs) == 3: break
    yy, xx = np.mgrid[0:48, 0:48]
    for cx, cy in cs:
        m = (((xx - cx) / 9.0) ** 2 + ((yy - cy) / 6.0) ** 2 <= 1) & (idx == body) & (rg.rand(48, 48) < 0.55); idx[m] = C["leaf"]
        for _ in range(int(rg.randint(3, 6))):
            tx, ty = cx + int(rg.randint(-6, 7)), cy + int(rg.randint(-4, 5))
            for dx, dy, c in ((0, 0, "forest"), (-1, -1, "leaf"), (0, -1, "leaf"), (1, -1, "leaf"), (0, -2, "leaf")):
                idx[ty + dy, tx + dx] = C[c]
    quant.save_indexed(idx, os.path.join(gd, n + ".png"))
print("grouped tufts on 4 grass tiles")
