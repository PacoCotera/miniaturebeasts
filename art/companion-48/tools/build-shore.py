"""The shore corner set: 16 neighbour masks x 2 frames at 48 px, cut from the grass, sand and water tiles.
Mask bits: N=1 E=2 S=4 W=8, set where water lies on that side. Land side: grass; a sand band and a wet band
meet the water at a wavy line; a foam line of bone (frame 1) or white (frame 2) sits on the water side.
usage: python3 -I build-shore.py GROUND_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P; C = P.index
gd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
def load(n):
    im = np.asarray(Image.open(os.path.join(gd, n + ".png")).convert("RGBA")); return quant.quantize(im)
grass, sand = load("grass1"), load("sand"); water = [load("water1"), load("water2")]
N = 48
def wave(t):   # repeats every 48 px so neighbours join
    return round(2.2 * np.sin(2 * np.pi * t / 24) + 1.3 * np.sin(2 * np.pi * t / 16 + 1.1))
for mask in range(16):
    # depth into water, per pixel: the deepest of the water sides' signed distances past a wavy shoreline 12 px in
    depth = np.full((N, N), -99.0)
    for y in range(N):
        for x in range(N):
            d = []
            if mask & 1: d.append((12 + wave(x)) - y)
            if mask & 4: d.append(y - (N - 13 - wave(x)))
            if mask & 8: d.append((12 + wave(y + 7)) - x)
            if mask & 2: d.append(x - (N - 13 - wave(y + 7)))
            if d: depth[y, x] = max(d)
    for fr in (0, 1):
        idx = grass.copy()
        idx = np.where(depth > -7, sand, idx)                          # dry sand band
        idx = np.where(depth > -3, C["clay"], idx)                      # the wet band
        idx = np.where(depth > -1, water[fr], idx)
        foam = (depth > -1) & (depth <= (0.5 if fr == 0 else 1.5)) & (depth > (-0.5 if fr == 0 else 0.5))
        idx = np.where(foam, C["bone"] if fr == 0 else C["white"], idx)
        glint = (depth > 1.5) & (depth <= 2.5) & (((np.arange(N)[None, :] + np.arange(N)[:, None] * 3 + fr * 2) % 7) == 0)
        idx = np.where(glint, C["ice"], idx)
        quant.save_indexed(idx, os.path.join(out, f"shore-{mask:02d}-{fr + 1}.png"))
print("shore 16 x 2")
