"""Ground tiles: the 4x4 painted grid -> sixteen 48 px tiles on the ramps.  usage: python3 -I build-ground.py SRC OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.int64)
names = ["grass1", "grass2", "grass3", "grass4", "tall1", "tall2", "flowers1", "flowers2",
         "shade", "sand", "water1", "water2", "deep", "reeds", "shore-wet", "stone-step"]
ramps = {"grass": "GW", "tall": "GW", "flowers": "GWY", "shade": "GTN", "sand": "WN", "water": "BTN", "deep": "BT", "reeds": "BGWT", "shore": "WBN", "stone": "BNKT"}
pitch = 256
crops = {}
for i, name in enumerate(names):
    r, c = divmod(i, 4)
    cell = im[r * pitch:(r + 1) * pitch, c * pitch:(c + 1) * pitch]
    mag = (cell[..., 0] > 170) & (cell[..., 2] > 170) & (cell[..., 1] < 140)
    blk = cell.max(axis=2) < 90
    keep = ~mag                           # the squares sit inside magenta on every side; dark paint is content
    # the painted square: the longest run of rows and columns that are almost all content,
    # then a 10 % trim inside it to lose the soft rim the generator paints against the magenta
    def run(ok):
        best, cur, start = (0, 0), 0, 0
        for i, v in enumerate(list(ok) + [False]):
            if v:
                if cur == 0: start = i
                cur += 1
                if cur > best[1] - best[0]: best = (start, i + 1)
            else: cur = 0
        return best
    by0, by1 = run(keep.mean(axis=1) > 0.7); bx0, bx1 = run(keep[by0:by1].mean(axis=0) > 0.95)
    by0, by1 = run(keep[:, bx0:bx1].mean(axis=1) > 0.95)
    m = int(min(bx1 - bx0, by1 - by0) * 0.10)
    x0, y0, x1, y1 = bx0 + m, by0 + m, bx1 - m, by1 - m
    side = min(x1 - x0, y1 - y0)
    crop = cell[y0:y0 + side, x0:x0 + side].astype(np.uint8)
    rgba = np.dstack([crop, np.full(crop.shape[:2], 255, np.uint8)])
    crops[name] = quant.seamless(rgba, feather=side // 6)
# level-match the meadow set (grass, tall, flowers): each tile's mean brightness moved to the set's mean, so the
# tiles lie as one ground and not as a checkerboard of lighter and darker squares
meadow = [n for n in names if n.rstrip("0123456789") in ("grass", "tall", "flowers")]
lum = {n: (crops[n][..., :3].astype(np.float64) * [.2126, .7152, .0722]).sum(axis=2).mean() for n in meadow}
target = np.mean(list(lum.values()))
for n in meadow:
    f = crops[n].astype(np.float64); f[..., :3] = np.clip(f[..., :3] * (target / lum[n]), 0, 255); crops[n] = f.astype(np.uint8)
for name in names:
    small = quant.resize_rgba(crops[name], (48, 48))
    key = name.rstrip("0123456789").split("-")[0]
    allowed = pal.ramp_indices(P, ramps[key]) + ([P.index["white"], P.index["bone"]] if key == "flowers" else [])
    idx = quant.quantize(small, allowed)
    idx = quant.despeckle(idx, 2)
    quant.save_indexed(idx, os.path.join(out, name + ".png"))
    print(name, "colours", len(set(idx.flatten().tolist())))
