"""Pond water, scripted on the B ramp, two variants x two frames, 48 px. Depth: a periodic depth field read through a
4x4 Bayer matrix (the one dither the Companion allows) between two neighbouring ramp steps, so the colour moves
softly from lighter to deeper water over the tile. Light: short horizontal crests in the lighter step with an ice
glint on their left end. The ripple rings are not in the tiles (they would repeat on the tile grid): build-ripples.py draws them as sparse
overlay sprites. deep is the same one step down the ramp; shallows is the bank tile.
usage: python3 -I build-water.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
N = 48
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32
# Two variants per frame (a, b), so the page can lay them by a hash and no pool or crest repeats on the tile grid. A variant's pools
# are a few small soft blobs of the deeper step, at most about half-dithered, that fade to nothing over the outer 8 px, so any variant joins any other at the tile edge;
# its crests keep clear of the left and right edges. The frames of a variant share the pools and move the crests 3 px.
VARIANTS = {
    "a": dict(seed=5, crests=[(6, 9, 5), (28, 4, 4), (14, 22, 6), (30, 30, 4), (5, 38, 5), (22, 43, 5)]),
    "b": dict(seed=17, crests=[(20, 6, 6), (4, 15, 4), (26, 20, 5), (9, 30, 5), (24, 36, 4), (12, 44, 6)]),
}
def blobs(seed):
    rng = np.random.RandomState(seed); yy, xx = np.mgrid[0:N, 0:N]; f = np.zeros((N, N))
    for _ in range(4):
        cx, cy = rng.uniform(10, N - 10, 2); rx, ry = rng.uniform(4, 8, 2); th = rng.uniform(0, np.pi)
        u = (xx - cx) * np.cos(th) + (yy - cy) * np.sin(th); v = -(xx - cx) * np.sin(th) + (yy - cy) * np.cos(th)
        f = np.maximum(f, np.exp(-((u / rx) ** 2 + (v / ry) ** 2)))
    d = np.minimum(np.minimum(xx, yy), np.minimum(N - 1 - xx, N - 1 - yy)); return f * np.clip((d - 2) / 8.0, 0, 1)
def field(fr, base, lo, hi, glint, var):
    pb = PB(N, N); g = np.empty((N, N), dtype=object); f = blobs(VARIANTS[var]["seed"])
    for y in range(N):
        for x in range(N): g[y, x] = lo if f[y, x] * 0.5 > BAYER[y % 4, x % 4] * 0.85 + 0.04 else base
    for cx, cy, ln in VARIANTS[var]["crests"]:                  # the crests drift 3 px to the right in frame 2
        sx = cx + 3 * fr
        for i in range(ln): g[cy % N, (sx + i) % N] = hi
        g[cy % N, sx % N] = glint
    for y in range(N):
        for x in range(N): pb.set(x, y, g[y, x])
    return pb
for var, suf in (("a", ""), ("b", "b")):
    for fr in (0, 1):
        field(fr, C["river"], C["sea"], C["sky"], C["ice"], var).save(os.path.join(out, f"water{fr + 1}{suf}.png"))
        field(fr, C["sea"], C["deep"], C["river"], C["sky"], var).save(os.path.join(out, f"deep{fr + 1}{suf}.png"))
field(0, C["sky"], C["river"], C["ice"], C["white"], "a").save(os.path.join(out, "shallows.png"))
print("water 2 variants x 2 frames, deep 2 variants x 2 frames, shallows")
