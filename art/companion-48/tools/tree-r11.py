"""The tree, round 10 to 11 (through the pipeline): a Gemini painting of a clumped canopy lit from the top left (sources/r11/C48-T-r11-a1), Retro Diffusion img2img at the final size
136 x 152 (seed 12 of three; sources/r11/C48-T-r11-rd-s12-rd.png), then this clean-up: snapped to the G and wood ramps (no black anywhere: the darkest outline is tealD, the gaps
between clumps pine), the service's aqua highlights taken to sprout and lime (the lit top-left edge of each clump), the largest component only, despeckled, trimmed to its bbox.
usage: python3 -I tree-r11.py RD.png OUT.png"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index
rgba = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).copy()
allowed = pal.ramp_indices(P, "GWN") + [C["tealD"], C["teal"], C["aqua"], C["mint"]]
idx = quant.quantize(rgba, allowed, alpha_thresh=110)
MAP = {C["aqua"]: C["lime"], C["mint"]: C["lime"], C["teal"]: C["sprout"], C["ink"]: C["tealD"], C["night"]: C["tealD"], C["void"]: C["tealD"], C["slate"]: C["tealD"], C["stone"]: C["tealD"],
       C["mist"]: C["sprout"], C["fog"]: C["sprout"], C["bone"]: C["lime"], C["white"]: C["lime"], C["paper"]: C["lime"]}
idx = np.where(idx >= 0, np.vectorize(lambda v: MAP.get(v, v))(idx), -1)
# the outline is the only tealD; the dark inside the canopy (the gaps and the underside of the clumps) is pine
bgm = idx < 0; edge = np.zeros(idx.shape, bool); edge[1:] |= bgm[:-1]; edge[:-1] |= bgm[1:]; edge[:, 1:] |= bgm[:, :-1]; edge[:, :-1] |= bgm[:, 1:]
dark = np.isin(idx, [C["tealD"], C["pine"], C["teal"]])
idx[dark & edge & ~bgm] = C["tealD"]; idx[dark & ~edge & ~bgm] = C["pine"]
# the largest component
H, W = idx.shape; lab = np.zeros(idx.shape, int); n = 0
for y, x in zip(*np.where(idx >= 0)):
    if lab[y, x]: continue
    n += 1; st = [(y, x)]; lab[y, x] = n
    while st:
        cy, cx = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and idx[ny, nx] >= 0 and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
idx[lab != np.bincount(lab[lab > 0]).argmax()] = -1
idx = quant.despeckle(idx, 1)
x0, y0, x1, y1 = quant.bbox((idx >= 0) * 255); quant.save_indexed(idx[y0:y1, x0:x1], sys.argv[2]); print("tree", idx[y0:y1, x0:x1].shape)
