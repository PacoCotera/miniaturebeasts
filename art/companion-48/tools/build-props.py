"""Props: the magenta-keyed 4x3 sheet -> sprites on the ramps with the outline rule.  usage: python3 -I build-props.py SRC OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]
rgba = quant.key_background(Image.open(src), (255, 0, 255), tol=110)
pitch = 256
# name, (row, col), fit (w, h), ramps
spec = [
    ("tree", (0, 0), (96, 112), "GWN"), ("bush", (0, 1), (48, 44), "GWN"), ("bush-fruit", (0, 2), (48, 44), "GWNR"), ("bush-shaken", (0, 3), (56, 48), "GWN"),
    ("stone", (1, 0), (32, 40), "NK"), ("stone-warm1", (1, 1), (44, 48), "NKYO"), ("stone-charged1", (1, 2), (44, 48), "NKBTW"), ("outpost-lit", (1, 3), (48, 72), "WYONG"),
    ("stone-plain2", (2, 0), (32, 40), "NK"), ("stone-warm2", (2, 1), (44, 48), "NKYO"), ("stone-charged2", (2, 2), (44, 48), "NKBTW"), ("outpost-dark", (2, 3), (48, 72), "WNG"),
    ("outpost-dark2", (3, 0), (48, 72), "WNG"), ("pod", (3, 1), (32, 36), "NWK"), ("reeds", (3, 2), (48, 48), "GWN"), ("dew-cup", (3, 3), (24, 20), "GBNW"),
]
for name, (r, c), (fw, fh), ramps in spec:
    cell = rgba[r * pitch:(r + 1) * pitch, c * pitch:(c + 1) * pitch]
    bb = quant.bbox(cell[..., 3])
    if not bb:
        print(name, "empty"); continue
    x0, y0, x1, y1 = bb
    crop = cell[y0:y1, x0:x1]
    h, w = crop.shape[:2]
    s = min(fw / w, fh / h)
    size = (max(1, round(w * s)), max(1, round(h * s)))
    small = quant.resize_rgba(np.ascontiguousarray(crop), size)
    # allow white for charged stones' sparks via the N ramp's white
    allowed = pal.ramp_indices(P, ramps.replace("W", "W")) + ([P.index["white"], P.index["ice"]] if "charged" in name else [])
    idx = quant.quantize(small, allowed, alpha_thresh=110)
    idx = quant.despeckle(idx, 1)
    idx = quant.outline(idx)
    quant.save_indexed(idx, os.path.join(out, name + ".png"))
    print(name, size, "colours", len(set(idx.flatten().tolist()) - {-1}))
