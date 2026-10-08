"""Hut B, the outpost: the three Retro Diffusion results (lit, dark, dark2; rd-hut-b.py) taken to the pieces. The down-render is 64 -> 56 px wide
(area average, quantised onto the warm and grey ramps, the greens only at the ground), and the hand pass fixes only what the palette snap spoiled:
the roof's colours by role (the thatch took green and teal: it takes the result's own luminance structure cut in four thatch steps; dark2 one step
down), the porch roof (teal) and any stray hue outside the roof (teal, blue, violet, red go to the nearest wood tone by luminance), and the base
meeting the grass (the grass patch kept from the greens ramp at the ground, any stray warm pixel in it made grass). The porch and the log walls are
the result's own. usage: python3 -I hut-b.py RD_DIR SEED OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index; rd, seed, out = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "WYONKTBV"); allowed_g = pal.ramp_indices(P, "WYONKG")
LIFT = 1.35
WOOD = [C["soil"], C["bark"], C["clay"], C["sand"]]
THATCH = {"lit": ["bark", "clay", "sand", "paper"], "dark": ["bark", "clay", "sand", "paper"]}
STRAY = {C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "lavender", "wine", "red", "coral", "magenta", "pink")}
WARM = {C["cream"]: C["slate"], C["yellow"]: C["night"], C["amber"]: C["bark"], C["gold"]: C["soil"], C["orange"]: C["soil"], C["peach"]: C["clay"]}
dark_piece = None
for st, f in (("lit", f"C48-H-r7-B-lit-s{seed}-rd.png"), ("dark", f"C48-H-r7-B-dark-s{seed}-rd.png")):
    rgba = np.asarray(Image.open(os.path.join(rd, f)).convert("RGBA")); h, w = rgba.shape[:2]
    small = quant.resize_rgba(np.ascontiguousarray(rgba), (56, max(1, round(h * 56 / w))))
    small = small.copy(); small[..., :3] = np.clip(small[..., :3].astype(float) * LIFT, 0, 255).astype(np.uint8)   # the same lift as the painted pieces: the walls came back dark
    lum = 0.2126 * small[..., 0] + 0.7152 * small[..., 1] + 0.0722 * small[..., 2]
    idx = quant.quantize(small, allowed, alpha_thresh=110); gi = quant.quantize(small, allowed_g, alpha_thresh=110)
    H = idx.shape[0]; cut = int(H * 0.82); idx[cut:] = gi[cut:]                                                  # the grass patch at the ground
    rows = np.arange(H)[:, None]; roofm = (idx >= 0) & (rows < int(H * 0.50))
    q = np.quantile(lum[roofm], [0.2, 0.5, 0.8]); ramp = [C[n] for n in THATCH[st]]
    for y, x in zip(*np.where(roofm)): idx[y, x] = ramp[int(np.searchsorted(q, lum[y, x]))]
    # a stray hue outside the roof (the porch roof, a teal rim) goes to the wood tone of the same luminance
    for y, x in zip(*np.where(np.isin(idx, list(STRAY)) & (rows < cut))): idx[y, x] = WOOD[int(np.clip(lum[y, x] / 64, 0, 3))]
    for y, x in zip(*np.where(np.isin(idx, [C["rock"], C["rockL"]]) & (rows < int(H * 0.72)))): idx[y, x] = WOOD[int(np.clip(lum[y, x] / 64, 0, 3))]   # the porch roof came back stone grey
    idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
    if st != "lit": idx = np.vectorize(lambda v: WARM.get(v, v))(idx)
    bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; piece = idx[y0:y1, x0:x1]; quant.save_indexed(piece, os.path.join(out, f"hut-B-{st}.png"))
    if st == "dark": quant.save_indexed(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in piece]), os.path.join(out, "hut-B-dark2.png"))   # the night state: the dark piece one DARK step down (the service's own dark2 result is a different drawing)
print("hut B, 3 states, 56 px wide")
