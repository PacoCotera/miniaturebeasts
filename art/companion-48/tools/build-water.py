"""Pond water, scripted on the B ramp, two frames, repeating every 48 px. Depth: a periodic depth field read through a
4x4 Bayer matrix (the one dither the Companion allows) between two neighbouring ramp steps, so the colour moves
softly from lighter to deeper water over the tile. Light: short horizontal crests in the lighter step with an ice
glint on their left end. Ripple: two flat elliptical rings that widen by 2 px between the frames, fading from the
lighter step to the base. deep is the same one step down the ramp; shallows is the bank tile.
usage: python3 -I build-water.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
N = 48
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32
CRESTS = [(6, 9, 5), (30, 4, 4), (18, 22, 6), (40, 30, 4), (8, 38, 5), (28, 43, 5)]   # x, y, length
RINGS = [(14, 14, 0), (35, 33, 1)]                                                       # centre and a phase
def field(fr, base, lo, hi, glint):
    pb = PB(N, N); g = np.empty((N, N), dtype=object)
    for y in range(N):
        for x in range(N):
            dep = 0.5 + 0.34 * np.sin(2 * np.pi * (x + 2 * y) / 48 + 0.6) + 0.16 * np.sin(2 * np.pi * (2 * x - y) / 48 + 2.0)
            p = min(1.0, max(0.0, (dep - 0.55) / 0.45)) * 0.75        # a soft gradient: at most three in four pixels deeper
            g[y, x] = lo if p > BAYER[y % 4, x % 4] else base
    for cx, cy, ln in CRESTS:                                  # the crests drift 3 px to the right in frame 2
        sx = cx + 3 * fr
        for i in range(ln): g[cy % N, (sx + i) % N] = hi
        g[cy % N, sx % N] = glint
        for i in range(1, ln - 1): g[(cy + 1) % N, (sx + i + 1) % N] = base if g[(cy + 1) % N, (sx + i + 1) % N] is lo else g[(cy + 1) % N, (sx + i + 1) % N]
    for cx, cy, ph in RINGS:
        rx = 5 + 2 * (fr + ph) % 4 * 1 + 3 * (fr ^ ph); ry = max(2, rx // 3 + 1)
        for a in np.linspace(0, 2 * np.pi, 90, endpoint=False):
            x = int(round(cx + rx * np.cos(a))) % N; y = int(round(cy + ry * np.sin(a))) % N
            g[y, x] = glint if (np.sin(a) < -0.6 and np.cos(a) < 0.2) else hi
    for y in range(N):
        for x in range(N): pb.set(x, y, g[y, x])
    return pb
for fr in (0, 1):
    field(fr, C["river"], C["sea"], C["sky"], C["ice"]).save(os.path.join(out, f"water{fr + 1}.png"))
    field(fr, C["sea"], C["deep"], C["river"], C["sky"]).save(os.path.join(out, f"deep{fr + 1}.png"))
field(0, C["sky"], C["river"], C["ice"], C["white"]).save(os.path.join(out, "shallows.png"))
print("water 2 frames, deep 2 frames, shallows")
