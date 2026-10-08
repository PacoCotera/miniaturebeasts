"""Mibi tokens derived from Pip's accepted HiBit painting: 48 px idle 2 and walk 3, plus the wild Loika token
(the species token, the same derivation) and labelled grey placeholders for other species.
usage: python3 -I build-tokens.py OUT_DIR
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant, font
P = quant.P
out = sys.argv[1]
src = os.path.join(pal.ROOT, "art", "miniature-lives", "assets", "hibit-plain-280x300.png")
im = Image.open(src).convert("RGBA")
a = np.asarray(im)
bb = quant.bbox(a[..., 3]); x0, y0, x1, y1 = bb
crop = np.ascontiguousarray(a[y0:y1, x0:x1])
h, w = crop.shape[:2]; fh = 40; s = fh / h
small = quant.resize_rgba(crop, (max(1, round(w * s)), fh))
allowed = pal.ramp_indices(P, "NWGOYK") + [P.index["bone"], P.index["white"]]
base = quant.quantize(small, allowed, alpha_thresh=120)
base = quant.despeckle(base, 1)
base = quant.outline(base)
def cell(idx, dy=0, dx=0):
    hh, ww = idx.shape; c = np.full((48, 48), -1, dtype=idx.dtype)
    x = (48 - ww) // 2 + dx; y = 46 - hh + dy
    c[max(0, y):max(0, y) + hh, x:x + ww] = idx[:hh - max(0, -y) if y < 0 else hh]
    return c
def squash(idx):
    """one-pixel breath: the top row of the body merges down (the crest dips)."""
    hh, ww = idx.shape; o = np.full_like(idx, -1); o[1:] = idx[:-1]; o[0] = -1
    return o
def legs_shift(idx, dx):
    """walk: the bottom quarter (legs) shifts sideways one pixel."""
    hh, ww = idx.shape; o = idx.copy(); legs = idx[int(hh * 0.78):]
    sh = np.full_like(legs, -1)
    if dx > 0: sh[:, dx:] = legs[:, :-dx]
    else: sh[:, :dx] = legs[:, -dx:]
    o[int(hh * 0.78):] = sh
    return o
frames = {"idle1": cell(base), "idle2": cell(squash(base)), "walk1": cell(legs_shift(base, 1), -1), "walk2": cell(base), "walk3": cell(legs_shift(base, -1), -1)}
for name, f in frames.items():
    quant.save_indexed(f, os.path.join(out, f"pip-{name}.png"))
    quant.save_indexed(f, os.path.join(out, f"loika-{name}.png"))   # the species token: the same derivation
# labelled grey placeholders for the species whose pieces do not exist yet
for code in ("S02", "S03", "S04"):
    c = np.full((48, 48), -1, dtype=np.int64)
    for y in range(10, 44):
        for x in range(8, 40):
            dx, dy = (x - 24) / 16, (y - 27) / 17
            if dx * dx + dy * dy <= 1: c[y, x] = P.index["stone"]
    c = quant.outline(c)
    font.draw(c, code, 24 - font.width(code, 1) // 2, 23, P.index["bone"], 1)
    quant.save_indexed(c, os.path.join(out, f"placeholder-{code}.png"))
print("tokens written:", sorted(os.listdir(out)))
