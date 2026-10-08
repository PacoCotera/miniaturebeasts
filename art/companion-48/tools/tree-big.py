"""The tree at 136 x 160 (round 9: larger, looming over the group) from the painted sheet by build-props.py, with the grey disc under its trunk taken off (the shadow on the
grass is drawn by the still in the ground's own greens). usage: python3 -I tree-big.py IN_TREE.png OUT_TREE.png"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index
idx = quant.quantize(np.asarray(Image.open(sys.argv[1]).convert("RGBA"))); H, W = idx.shape
TR = {C["soil"], C["bark"], C["clay"]}
cnt = np.isin(idx, list(TR)).sum(1); y0 = int(np.where(cnt >= 6)[0].max())
while y0 > 0 and cnt[y0 - 1] >= 6: y0 -= 1            # the trunk's top: the unbroken run of wood rows that ends at its foot
for y in range(y0 + 3, H):
    for x in range(W):
        if idx[y, x] in (C["stone"], C["slate"], C["mist"]): idx[y, x] = -1
lab = np.zeros(idx.shape, int); n = 0
for y, x in zip(*np.where(idx >= 0)):
    if lab[y, x]: continue
    n += 1; st = [(y, x)]; lab[y, x] = n
    while st:
        cy, cx = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and idx[ny, nx] >= 0 and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
big = np.bincount(lab[lab > 0]).argmax(); idx[lab != big] = -1
for y in range(y0 + 3, H):          # the outline pixels left hanging off the removed disc (ink/night with no wood or leaf neighbour) go too
    for x in range(W):
        if idx[y, x] in (C["ink"], C["night"]):
            nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].flatten()
            if not any(v >= 0 and v not in (C["ink"], C["night"]) for v in nb): idx[y, x] = -1
bb = quant.bbox((idx >= 0) * 255); x0, y0_, x1, y1 = bb
quant.save_indexed(idx[y0_:y1, x0:x1], sys.argv[2]); print("tree", idx[y0_:y1, x0:x1].shape)
