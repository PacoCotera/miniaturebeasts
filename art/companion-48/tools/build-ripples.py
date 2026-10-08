"""Ripple overlay sprites for the water: flat elliptical rings, three sizes x two frames (a ring widens by 2 px between
the frames), in the lighter ramp step with an ice glint on the upper left arc. Placed over the water by the compose
script (a seeded hash, at most one per 3x3 tiles, never twice on the same spot), never part of a tile.
usage: python3 -I build-ripples.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for size, rx0 in ((1, 5), (2, 8), (3, 11)):
    for fr in (0, 1):
        rx = rx0 + 2 * fr; ry = max(2, rx // 3 + 1); w, h = 2 * rx + 3, 2 * ry + 3
        pb = PB(w, h)
        for k, a in enumerate(np.linspace(0, 2 * np.pi, 160, endpoint=False)):
            if (k // 9 + fr) % 3 == 2: continue                       # a broken ring, the gaps move between the frames: soft, not a drawn outline
            x = int(round(rx + 1 + rx * np.cos(a))); y = int(round(ry + 1 + ry * np.sin(a)))
            pb.set(x, y, C["ice"] if (np.sin(a) < -0.55 and np.cos(a) < 0.3) else C["sky"])
        pb.save(os.path.join(out, f"ripple-{size}-{fr + 1}.png"))
print("ripples 3 sizes x 2 frames")
