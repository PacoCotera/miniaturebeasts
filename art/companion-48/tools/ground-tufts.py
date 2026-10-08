"""Tufts on the four grass tiles of the lime ground, drawn DARKER than the ground (a root in forest, blades in leaf over the grass body), at hashed positions kept
away from the outer 4 px so the tiles still join. Run once on work/ground (it edits the four tiles in place; running it twice draws the same tufts over themselves).
usage: python3 -I ground-tufts.py GROUND_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; gd = sys.argv[1]
for n in ["grass1", "grass2", "grass3", "grass4"]:
    idx = quant.quantize(np.asarray(Image.open(os.path.join(gd, n + ".png")).convert("RGBA")))
    rg = np.random.RandomState(sum(map(ord, n))); pts = []
    for _ in range(300):
        x, y = int(rg.randint(5, 42)), int(rg.randint(6, 43))
        if all(abs(x - px) + abs(y - py) > 9 for px, py in pts): pts.append((x, y))
        if len(pts) == 7: break
    for x, y in pts:
        for dx, dy, c in ((0, 0, "forest"), (-1, -1, "leaf"), (0, -1, "leaf"), (1, -1, "leaf"), (-1, -2, "leaf"), (1, -2, "leaf"), (0, -2, "leaf")):
            idx[y + dy, x + dx] = C[c]
    quant.save_indexed(idx, os.path.join(gd, n + ".png"))
print("tufts on 4 grass tiles")
