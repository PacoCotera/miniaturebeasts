"""The place rain tile: 96x96, two leans x two frames, scripted streaks (the page's 4x11 streak, white/ice/mist)
laid by a hash so the tile repeats in both directions. Frame 2 is frame 1 fallen half a tile.
usage: python3 -I build-weather.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
S = 96
def streak(pb, x0, y0, lean):
    for k in range(10):
        col = C["white"] if k < 4 else C["ice"] if k < 7 else C["mist"]
        x = x0 + (3 - k // 3) * lean; pb.set(x % S, (y0 + k) % S, col)
rng = np.random.RandomState(48)
pts = [(int(rng.randint(S)), int(rng.randint(S))) for _ in range(10)]   # sparse: one clean sheet, not a downpour
for lean, nm in ((1, "left"), (-1, "right")):   # "left": the streak falls toward the left (top right, foot left)
    for fr in (1, 2):
        pb = PB(S, S)
        for x, y in pts: streak(pb, x, y + (0 if fr == 1 else S // 2), lean)
        pb.save(os.path.join(out, f"rain-{nm}-{fr}.png"))
print("rain 2 leans x 2 frames")
