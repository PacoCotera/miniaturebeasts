"""Pawn studies G and H: the Retro Diffusion results (48 px, remove_bg) snapped onto the pawn's ramps (orange, wood and fur, ink and white, yellow,
skin, lens blue), despeckled, outlined by the rule and set in the 48 px cell with the foot at y 46 (the drawn studies' ground shadow is not added: the
result carries what it drew). usage: python3 -I pawn-study-snap.py RD_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; rd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "OWNYRB")
for k in "GH":
    for view in ("down", "side"):
        f = os.path.join(rd, f"C48-W-r7-{k}-{view}-rd.png")
        if not os.path.exists(f): continue
        rgba = np.asarray(Image.open(f).convert("RGBA"))
        idx = quant.quantize(rgba, allowed, alpha_thresh=110); idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
        bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; crop = idx[y0:y1, x0:x1]; h, w = crop.shape
        cell = np.full((48, 48), -1, dtype=idx.dtype); cell[max(0, 46 - h):46, (48 - w) // 2:(48 - w) // 2 + w] = crop[-min(h, 46):]
        quant.save_indexed(cell, os.path.join(out, f"pawn-{k}-{view}.png"))
print("pawn studies G, H snapped")
