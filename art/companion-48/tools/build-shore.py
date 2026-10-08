"""The shore set at 48 px, cut from the grass, sand and water tiles, x 2 frames.
Cardinal masks (16): bits N=1 E=2 S=4 W=8, set where water lies on that side; where two adjacent sides are water the
land corner is rounded (a radius of 12 px at the water's edge), not square. Land side: grass; a sand band and a wet
band meet the water at a wavy line; a foam line of bone (frame 1) or white (frame 2) sits on the water side.
Diagonal corners (4, shore-diag-ne/se/sw/nw): for a land tile with no water on the two sides of a corner but water on
that diagonal, a quarter-disc of water (radius 12.5 px) in that corner with its own bands, transparent where it is
plain grass so it lies over any land tile; the pond's corner then closes with the strips of the tiles beside it.
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
grass, sand = load("grass1"), load("sand"); water = [load("water1"), load("water2")]; shallows = load("shallows")
N = 48
def wave(t):   # repeats every 48 px so neighbours join
    return round(0.9 * np.sin(2 * np.pi * t / 24) + 0.5 * np.sin(2 * np.pi * t / 16 + 1.1))   # a pond bank, not a scallop
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
            # a rounded land corner where two adjacent sides are water: both distances past -R, the depth is -R + their hypotenuse
            R = 7.0
            for bit1, bit2, f1, f2 in ((1, 2, (12 + wave(x)) - y, x - (N - 13 - wave(y + 7))), (2, 4, x - (N - 13 - wave(y + 7)), y - (N - 13 - wave(x))),
                                       (4, 8, y - (N - 13 - wave(x)), (12 + wave(y + 7)) - x), (8, 1, (12 + wave(y + 7)) - x, (12 + wave(x)) - y)):
                if mask & bit1 and mask & bit2 and f1 > -R and f2 > -R: depth[y, x] = max(depth[y, x], -R + float(np.hypot(f1 + R, f2 + R)))
    for fr in (0, 1):
        idx = grass.copy()
        idx = np.where(depth > -7, sand, idx)                          # dry sand band
        idx = np.where(depth > -3, C["clay"], idx)                      # the wet band
        idx = np.where(depth > -1, shallows, idx)                      # the bank's shallows
        idx = np.where(depth > 5, water[fr], idx)
        foam = (depth > -1) & (depth <= (0.5 if fr == 0 else 1.5)) & (depth > (-0.5 if fr == 0 else 0.5))
        idx = np.where(foam, C["bone"] if fr == 0 else C["white"], idx)
        quant.save_indexed(idx, os.path.join(out, f"shore-{mask:02d}-{fr + 1}.png"))
def paint(depth, fr, base):
    idx = base.copy()
    idx = np.where(depth > -7, sand, idx); idx = np.where(depth > -3, C["clay"], idx); idx = np.where(depth > -1, shallows, idx)
    idx = np.where(depth > 5, water[fr], idx)
    foam = (depth > -1) & (depth <= (0.5 if fr == 0 else 1.5)) & (depth > (-0.5 if fr == 0 else 0.5))
    return np.where(foam, C["bone"] if fr == 0 else C["white"], idx)
yy, xx = np.mgrid[0:N, 0:N]
for name, (cx, cy) in {"ne": (N, 0), "se": (N, N), "sw": (0, N), "nw": (0, 0)}.items():
    # the shoreline wave of the strips each edge meets: the tile above or below carries a strip along its bottom or top
    # row (wave(y + 7) there), the tile beside one along its left or right column (wave(x) there); blend by the angle
    wv_ = wave((N - 1 if name[0] == "n" else 0) + 7); wh_ = wave(0 if name[1] == "e" else N - 1)
    dx, dy = np.abs(xx + 0.5 - cx), np.abs(yy + 0.5 - cy); wt = dx / (dx + dy + 1e-9)
    depth = 12.5 + wt * wv_ + (1 - wt) * wh_ - np.hypot(dx, dy)
    for fr in (0, 1):
        idx = paint(depth, fr, grass); idx = np.where(idx == grass, -1, idx)   # transparent where it is plain grass
        quant.save_indexed(idx, os.path.join(out, f"shore-diag-{name}-{fr + 1}.png"))
print("shore 16 x 2, diagonal corners 4 x 2")
