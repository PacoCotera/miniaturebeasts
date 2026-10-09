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
MAP = {C["aqua"]: C["sprout"], C["mint"]: C["lime"], C["teal"]: C["grass"], C["ink"]: C["tealD"], C["night"]: C["tealD"], C["void"]: C["tealD"], C["slate"]: C["tealD"], C["stone"]: C["tealD"],
       C["mist"]: C["sprout"], C["fog"]: C["sprout"], C["bone"]: C["lime"], C["white"]: C["lime"], C["paper"]: C["lime"]}
idx = np.where(idx >= 0, np.vectorize(lambda v: MAP.get(v, v))(idx), -1)
yy_ = np.mgrid[0:idx.shape[0], 0:idx.shape[1]][0]; low = yy_ >= int(idx.shape[0] * 0.72)               # the trunk: the service's pale bark to the bark ramp
for a_, b_ in ((C['sand'], C['clay']), (C['clay'], C['bark']), (C['peach'], C['clay']), (C['paper'], C['sand']), (C['cream'], C['sand'])): idx[low & (idx == a_)] = b_
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
# the service left a straight vertical light/dark seam with a light wedge down the top of the canopy (about 60 px). The boundary is moved onto leaf-sized blobs: in a band round the seam each pixel is
# lifted a ramp step (dark side) or lowered a step (light side) where a blob field (random 5 px cells, blurred, thresholded) says so, the share of the pixels changed falling off with the distance from the
# seam, so the light and the dark meet along the outlines of blobs of the canopy's own leaf size and not along a straight line (no vertical run of the boundary is longer than a blob).
GR = [C["forest"], C["leaf"], C["grass"], C["sprout"], C["lime"]]
lum_ = np.where(idx >= 0, 0.2126 * P.rgb[np.maximum(idx, 0)][..., 0] + 0.7152 * P.rgb[np.maximum(idx, 0)][..., 1] + 0.0722 * P.rgb[np.maximum(idx, 0)][..., 2], -1)
cnt = [(int(((np.abs(lum_[:80, x] - lum_[:80, x - 1]) > 30) & (lum_[:80, x] >= 0) & (lum_[:80, x - 1] >= 0)).sum()), x) for x in range(1, idx.shape[1])]
c_, sx = max(cnt)
if c_ > 15:
    rg = np.random.RandomState(11); cell = rg.rand(idx.shape[0] // 5 + 2, idx.shape[1] // 5 + 2)
    field = np.kron(cell, np.ones((5, 5)))[:idx.shape[0], :idx.shape[1]]
    for _ in range(2):
        f2 = field.copy(); f2[1:-1, 1:-1] = (field[1:-1, 1:-1] * 4 + field[:-2, 1:-1] + field[2:, 1:-1] + field[1:-1, :-2] + field[1:-1, 2:]) / 8; field = f2
    field = (field - field.min()) / (field.max() - field.min())
    new = idx.copy()
    for y in range(0, 90):
        for x in range(max(0, sx - 22), min(idx.shape[1], sx + 30)):
            v = idx[y, x]
            if v not in GR: continue
            dist = (x - sx) / 22.0 if x >= sx else (sx - x) / 22.0
            share = max(0.0, 1.0 - dist)                              # 1 at the seam, 0 at the band's edge
            i = GR.index(v)
            if field[y, x] < share * 0.85:
                new[y, x] = GR[min(4, i + 1)] if x >= sx else GR[max(0, i - 1)]
    for y in range(0, 90):                                   # the seam's own column and its neighbours: each pixel takes the value 4 px to its left or to its right (by the blob field), so no 1 px line is left
        for x in range(sx - 3, sx + 4):
            l_, r_ = new[y, x - 4], new[y, x + 4]
            if new[y, x] in GR and l_ in GR and r_ in GR: new[y, x] = l_ if field[y, x] < 0.5 else r_
    idx = new; print("seam softened at", sx, "rows", c_)
# the ground shadow the service drew under the trunk (dark blue-violet, outside the trunk's own colours) is taken off: below the trunk's top, only wood and the outline stay
TR = [C["soil"], C["bark"], C["clay"], C["sand"], C["tealD"]]
cnt = np.isin(idx, [C["soil"], C["bark"], C["clay"]]).sum(1); ty = int(np.where(cnt >= 6)[0].max())
while ty > 0 and cnt[ty - 1] >= 6: ty -= 1
for y in range(ty + 2, idx.shape[0]):
    for x in range(idx.shape[1]):
        if idx[y, x] >= 0 and idx[y, x] not in TR: idx[y, x] = -1
idx = quant.despeckle(idx, 1)
x0, y0, x1, y1 = quant.bbox((idx >= 0) * 255); quant.save_indexed(idx[y0:y1, x0:x1], sys.argv[2]); print("tree", idx[y0:y1, x0:x1].shape)
