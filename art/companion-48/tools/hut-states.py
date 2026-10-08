"""Huts A and B from the Retro Diffusion results (lit): the 64 px result is brought down to 48 px wide (area average of the RGBA, then
quantised onto the ramps, despeckled, outlined by the rule), then the other states are derived: dark = the warm light taken out (cream,
yellow, amber, gold and orange pixels, which in these pieces are the window, the lantern and the lamp, go to slate, night, bark, soil),
dark2 = dark one DARK step down. usage: python3 -I hut-states.py RD_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; rd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
allowed = quant.pal.ramp_indices(P, "WYONGKB") if hasattr(quant, "pal") else None
import pal
allowed = pal.ramp_indices(P, "WYONK"); allowed_g = pal.ramp_indices(P, "WYONKG")   # the roof and walls on the warm and grey ramps; the greens only down at the ground
ROOF = {"A": 0.52, "B": 0.52}
WARM = {C["cream"]: C["slate"], C["yellow"]: C["night"], C["amber"]: C["bark"], C["gold"]: C["soil"], C["orange"]: C["soil"], C["peach"]: C["clay"], C["coral"]: C["bark"]}
for nm in "AB":
    rgba = np.asarray(Image.open(os.path.join(rd, f"C48-H-r6-{nm}-rd.png")).convert("RGBA")); h, w = rgba.shape[:2]
    small = quant.resize_rgba(np.ascontiguousarray(rgba), (48, max(1, round(h * 48 / w))))
    idx = quant.quantize(small, allowed, alpha_thresh=110); gi = quant.quantize(small, allowed_g, alpha_thresh=110)
    cut = int(idx.shape[0] * 0.80); idx[cut:] = gi[cut:]                                                       # the grass patch from the greens
    # the roof is recoloured by role: the result's palette snap made the thatch green and teal, so the roof (the upper half) takes its value
    # structure (the bands, the strands) from the result's own luminance, cut in four steps of the thatch ramp
    rf = int(idx.shape[0] * ROOF[nm]); lum = (0.2126 * small[..., 0] + 0.7152 * small[..., 1] + 0.0722 * small[..., 2]); roofm = (idx >= 0) & (np.arange(idx.shape[0])[:, None] < rf)
    q = np.quantile(lum[roofm], [0.2, 0.5, 0.8]); ramp = [C["bark"], C["clay"], C["sand"], C["paper"]]
    for y, x in zip(*np.where(roofm)): idx[y, x] = ramp[int(np.searchsorted(q, lum[y, x]))]
    idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
    bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; lit = idx[y0:y1, x0:x1]
    dark = np.vectorize(lambda v: WARM.get(v, v))(lit); dark2 = np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark])
    for st, a in (("lit", lit), ("dark", dark), ("dark2", dark2)): quant.save_indexed(a, os.path.join(out, f"hut-{nm}-{st}.png"))
print("huts A and B, 3 states")
