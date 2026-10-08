"""Pond water, scripted on the B ramp: two frames; a river base with a soft band of deeper sea, thin wavy crest
lines in sky with ice glints and thin trough lines in sea, drifting between the frames; the deep tile one step
down the ramp; a shallows tile for the bank. Repeats every 48 px. usage: python3 -I build-water.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
N = 48
def field(fr, base, lo, hi, glint, deep_band):
    pb = PB(N, N); ph = fr * 2 * np.pi / 2 / 4   # a quarter of a ripple period between the frames
    for y in range(N):
        for x in range(N):
            rip = np.sin(2 * np.pi * x / 24 + 1.3 * np.sin(2 * np.pi * y / 48) + 2 * np.pi * y / 12 + ph)
            dep = np.sin(2 * np.pi * (x - y) / 48 + 0.7) + 0.5 * np.sin(2 * np.pi * (x + 2 * y) / 48)
            seg = np.sin(2 * np.pi * x / 24 + 0.4 * y + ph)      # breaks the lines into dashes
            seg2 = np.sin(2 * np.pi * (x + y) / 48 - ph)
            col = base
            if dep > 1.42: col = deep_band                       # a rare pool of deeper water
            if rip > 0.86 and seg > 0.1: col = hi                 # short crest dashes
            if rip < -0.92 and seg2 > 0.2: col = lo               # a sparse trough line
            if rip > 0.985 and seg > 0.5 and (x + 2 * y + fr * 3) % 5 == 0: col = glint
            pb.set(x, y, col)
    return pb
for fr in (1, 2):
    field(fr - 1, C["river"], C["sea"], C["sky"], C["ice"], C["sea"]).save(os.path.join(out, f"water{fr}.png"))
    field(fr - 1, C["sea"], C["deep"], C["river"], C["sky"], C["deep"]).save(os.path.join(out, f"deep{fr}.png"))
field(0, C["sky"], C["river"], C["ice"], C["white"], C["river"]).save(os.path.join(out, "shallows.png"))
print("water 2 frames, deep 2 frames, shallows")
