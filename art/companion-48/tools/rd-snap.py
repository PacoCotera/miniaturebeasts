"""Snap the Retro Diffusion sprite candidates to the palette and the rules: quantise onto each piece's ramps,
despeckle, the outline rule, placed in the piece's cell (the pawn at foot y 46 in 48x48).
usage: python3 -I rd-snap.py RD_DIR OUT_PROPS OUT_PAWN"""
import glob, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
rd, outp, outw = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(outp, exist_ok=True); os.makedirs(outw, exist_ok=True)
ramps = {"tree": "GWN", "bush": "GWN", "bush-fruit": "GWNR", "stone": "NK", "stone-warm1": "NKYO", "stone-charged1": "NKBTW", "outpost-lit": "WYONG", "pod": "NWK"}
for f in sorted(glob.glob(os.path.join(rd, "C48-S-r2-*-rd.png"))):
    name = os.path.basename(f)[len("C48-S-r2-"):-len("-rd.png")]
    rgba = np.asarray(Image.open(f).convert("RGBA"))
    if name.startswith("pawn-"):
        allowed = pal.ramp_indices(P, "OWNY")
        idx = quant.quantize(rgba, allowed, alpha_thresh=110); idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
        bb = quant.bbox(idx >= 0); 
        if bb:
            x0, y0, x1, y1 = bb; crop = idx[y0:y1, x0:x1]; h, w = crop.shape
            cell = np.full((48, 48), -1, dtype=idx.dtype); cell[max(0, 46 - h):46, (48 - w) // 2:(48 - w) // 2 + w] = crop[-min(h, 46):]
            quant.save_indexed(cell, os.path.join(outw, f"pawn-{name[5:]}-walk2-rd.png"))
    else:
        allowed = pal.ramp_indices(P, ramps[name]) + ([P.index["white"], P.index["ice"]] if "charged" in name else [])
        idx = quant.quantize(rgba, allowed, alpha_thresh=110); idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
        bb = quant.bbox(idx >= 0)
        if bb: x0, y0, x1, y1 = bb; idx = idx[y0:y1, x0:x1]
        quant.save_indexed(idx, os.path.join(outp, name + "-rd.png"))
    print(name, idx.shape, "colours", len(set(idx.flatten().tolist()) - {-1}))
