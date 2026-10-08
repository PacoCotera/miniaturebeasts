"""Huts A to D from the Retro Diffusion results: every state's own result is processed (OUT-rdstates, raw candidates), the pieces used take the lit result and derive the dark states from it: the 64 px result is brought down to
48 px wide (area average of the RGBA, quantised onto the warm and grey ramps, the greens only at the ground), the roof recoloured by role
(the palette snap made the thatch green and teal: the roof takes the result's own luminance structure, cut in four steps of the thatch ramp;
dark2's ramp one step down), outlined by the rule; in the dark states any warm light left in a result (cream, yellow, amber, gold, orange)
is taken out, and dark2 goes one DARK step down. The pieces are written to PRE_DIR for the Aseprite assembly (aseprite-huts.lua).
usage: python3 -I hut-states.py RD_DIR PRE_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index; rd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "WYONK"); allowed_g = pal.ramp_indices(P, "WYONKG")
ROOF = {"A": 0.52, "B": 0.52, "C": 0.52, "D": 0.52}
WARM = {C["cream"]: C["slate"], C["yellow"]: C["night"], C["amber"]: C["bark"], C["gold"]: C["soil"], C["orange"]: C["soil"], C["peach"]: C["clay"], C["coral"]: C["bark"]}
THATCH = {"lit": ["bark", "clay", "sand", "paper"], "dark": ["bark", "clay", "sand", "paper"], "dark2": ["soil", "bark", "clay", "sand"]}
os.makedirs(out + "-rdstates", exist_ok=True)
for nm in "ABCD":
    for st in ("lit", "dark", "dark2"):
        f = os.path.join(rd, f"C48-H-r6-{nm}-rd.png" if st == "lit" else f"C48-H-r6-{nm}-{st}-rd.png")
        if not os.path.exists(f): continue
        rgba = np.asarray(Image.open(f).convert("RGBA")); h, w = rgba.shape[:2]
        small = quant.resize_rgba(np.ascontiguousarray(rgba), (48, max(1, round(h * 48 / w))))
        idx = quant.quantize(small, allowed, alpha_thresh=110); gi = quant.quantize(small, allowed_g, alpha_thresh=110)
        cut = int(idx.shape[0] * 0.80); idx[cut:] = gi[cut:]
        rf = int(idx.shape[0] * ROOF[nm]); lum = (0.2126 * small[..., 0] + 0.7152 * small[..., 1] + 0.0722 * small[..., 2]); roofm = (idx >= 0) & (np.arange(idx.shape[0])[:, None] < rf)
        q = np.quantile(lum[roofm], [0.2, 0.5, 0.8]); ramp = [C[n] for n in THATCH[st]]
        for y, x in zip(*np.where(roofm)): idx[y, x] = ramp[int(np.searchsorted(q, lum[y, x]))]
        idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
        if st != "lit": idx = np.vectorize(lambda v: WARM.get(v, v))(idx)
        if st == "dark2": idx = np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in idx])
        bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; piece = idx[y0:y1, x0:x1]
        # every state comes from its own result, kept in OUT-rdstates as raw candidates; the pieces used (OUT) take the dark states from the
        # lit hut instead (the warm light taken out, dark2 one DARK step down), because the separate results are different drawings of the hut
        quant.save_indexed(piece, os.path.join(out + "-rdstates", f"hut-{nm}-{st}.png"))
        if st == "lit":
            quant.save_indexed(piece, os.path.join(out, f"hut-{nm}-lit.png"))
            dk = np.vectorize(lambda v: WARM.get(v, v))(piece); quant.save_indexed(dk, os.path.join(out, f"hut-{nm}-dark.png"))
            quant.save_indexed(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dk]), os.path.join(out, f"hut-{nm}-dark2.png"))
print("huts A to D from their Retro Diffusion results")
