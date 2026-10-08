"""Lay every meadow tile in a seeded random 6x6 and write the result at 1x and 3x, plus the worst seam step.
usage: python3 -I meadow-check.py WORK_GROUND OUT_PREFIX"""
import sys, random
import numpy as np
from PIL import Image
g, out = sys.argv[1], sys.argv[2]
names = ["grass1","grass2","grass3","grass4","tall1","tall2","flowers1","flowers2"]
t = {n: Image.open(f"{g}/{n}.png").convert("RGB") for n in names}
rnd = random.Random(48); N = 6
W = Image.new("RGB", (48 * N, 48 * N))
for r in range(N):
    for c in range(N): W.paste(t[rnd.choice(names)], (c * 48, r * 48))
W.save(out + "-1x.png"); W.resize((48 * N * 3,) * 2, Image.NEAREST).save(out + "-3x.png")
a = np.asarray(W).astype(int)
# seam step: colour difference across tile joins vs inside tiles
def d(x, y): return np.abs(x - y).sum(-1)
v = [d(a[:, i - 1], a[:, i]).mean() for i in range(48, 48 * N, 48)]; ins = np.mean([d(a[:, i - 1], a[:, i]).mean() for i in range(1, 48 * N) if i % 48])
print("mean step across joins %.1f, inside tiles %.1f" % (np.mean(v), ins))
