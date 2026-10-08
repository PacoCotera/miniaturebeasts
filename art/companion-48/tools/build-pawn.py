"""Pawn: the 8x4 painted sheet -> 48 px frames (walk 3, creep 3, react 1 x 4 facings).  usage: python3 -I build-pawn.py SRC OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
a = np.asarray(im)
# key by hue: the pink/magenta background (and the painted purple shadow) has a high blue; the orange pawn has not
ai = a.astype(int)
isbg = (ai[..., 2] > 120) & (ai[..., 0] > 150)
isbg |= (ai[..., 0] > 170) & (ai[..., 2] > 170) & (ai[..., 1] < 140)
rgba = np.dstack([a, np.where(isbg, 0, 255).astype(np.uint8)])
H, W = rgba.shape[:2]
cols, rows = 8, 4
# columns and rows from the sheet's projections
alpha = rgba[..., 3] > 0
colsum = alpha.sum(axis=0); rowsum = alpha.sum(axis=1)
def runs(v, minlen):
    out, start = [], None
    for i, x in enumerate(v > 0):
        if x and start is None: start = i
        if not x and start is not None:
            if i - start >= minlen: out.append((start, i))
            start = None
    if start is not None: out.append((start, len(v)))
    return out
# cells from the projections: a column (row) of figures is a run of x (y) with any opaque pixels, gaps between
def runs2(v, minlen, mingap):
    out, start, gap = [], None, 0
    for i, x in enumerate(v):
        if x > 0:
            if start is None: start = i
            gap = 0
        else:
            if start is not None:
                gap += 1
                if gap >= mingap:
                    if i - gap - start >= minlen: out.append((start, i - gap))
                    start, gap = None, 0
    if start is not None: out.append((start, len(v)))
    return out
crun, rrun = runs2(colsum, 40, 6), runs2(rowsum, 80, 10)
print("columns", len(crun), "rows", len(rrun), crun[:3])
if len(crun) != cols or len(rrun) != rows:
    sys.exit("grid not found: columns %d rows %d" % (len(crun), len(rrun)))
facing_rows = {"down": 0, "left": 2, "right": 3}      # the painted 'up' row shows a face; up is derived from down
frames = ["walk2", "walk1", "walk3", "walk2b", "creep1", "creep2", "creep3", "react"]
allowed = pal.ramp_indices(P, "OWNY")
def frame(r, c, fh=40):
    y0, y1 = rrun[r]; x0, x1 = crun[c]
    cell = rgba[y0:y1, x0:x1]
    bb = quant.bbox(cell[..., 3]); x0b, y0b, x1b, y1b = bb
    crop = np.ascontiguousarray(cell[y0b:y1b, x0b:x1b])
    h, w = crop.shape[:2]; s = fh / h
    small = quant.resize_rgba(crop, (max(1, round(w * s)), fh))
    idx = quant.quantize(small, allowed, alpha_thresh=120)
    idx = quant.despeckle(idx, 1)
    return quant.outline(idx)
def place48(idx):
    h, w = idx.shape; cell = np.full((48, 48), -1, dtype=idx.dtype)
    x = (48 - w) // 2; y = 46 - h
    cell[y:y + h, x:x + w] = idx
    return cell
for facing, r in facing_rows.items():
    for c, fr in enumerate(frames):
        if fr == "walk2b": continue
        f = place48(frame(r, c))
        quant.save_indexed(f, os.path.join(out, f"pawn-{facing}-{fr}.png"))
        if facing == "down":   # up: the same silhouette without the face (eyes become body)
            up = f.copy()
            body = P.index["orange"]
            for y in range(48):
                for x in range(48):
                    if up[y, x] in (P.index["ink"], P.index["void"], P.index["night"], P.index["soil"]) and 8 < y < 30:
                        up[y, x] = body
            quant.save_indexed(up, os.path.join(out, f"pawn-up-{fr}.png"))
print("written", len(os.listdir(out)))
