"""Hand pass on the repaint's snapped scene: the wooden sign the repaint put on the island is painted out. Its brown pixels are
refilled from the island's own greens, sampled at random and then grouped into clumps (each pixel takes the most common colour of
its 3x3 neighbourhood, twice), so the patch reads as island growth. Writes the scene and both screens again, with the teal swap.
usage: python3 -I b1-hand.py B1_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
d = sys.argv[1]
cols = json.load(open(os.path.join(d, "biome-meadow.json")))["colours"]
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
PAL = np.array([hx(c["hex"]) for c in cols]); ALT = np.array([hx(c.get("alt", c["hex"])) for c in cols])
idx = np.load(os.path.join(d, "scene-idx.npy")); H, W = idx.shape
px0, py0 = (W - 450) // 2, H - 532 - 40                       # the pond screen's origin in the scene
x0, y0, x1, y1 = px0 + 8, py0 + 262, px0 + 72, py0 + 336      # the sign's box on the island
rgb = PAL[idx[y0:y1, x0:x1]].astype(float)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
brown = (r_ > g_ * .9) & (r_ > b_ * 1.15) & (r_ > 50)          # the sign's wood (and its posts)
dark = (r_ + g_ + b_ < 170) & ~((g_ > r_ * 1.25) & (g_ > 60))     # its dark outline, which is not a shaded leaf
near = brown.copy()
for _ in range(3): near[1:] |= near[:-1]; near[:-1] |= near[1:]; near[:, 1:] |= near[:, :-1]; near[:, :-1] |= near[:, 1:]
brown = brown | (dark & near)
green = (g_ > r_ * 1.1) & (g_ > b_ * 1.05)
box = idx[y0:y1, x0:x1].copy(); rng = np.random.RandomState(12)
src = box[green]; box[brown] = src[rng.randint(len(src), size=int(brown.sum()))]
for _ in range(2):
    nb = box.copy()
    for y in range(1, box.shape[0] - 1):
        for x in range(1, box.shape[1] - 1):
            if brown[y, x]:
                v, c = np.unique(box[y - 1:y + 2, x - 1:x + 2], return_counts=True); nb[y, x] = v[c.argmax()]
    box = nb
idx[y0:y1, x0:x1] = box
np.save(os.path.join(d, "scene-idx.npy"), idx)
for tag, PALX in (("", PAL), ("-noteal", ALT)):
    full = Image.fromarray(PALX[idx].astype(np.uint8)); full.save(os.path.join(d, f"scene{tag}-1x.png"))
    for nm, (cx, cy) in {"screen-pond": (px0, py0), "screen-cliffs": (20, 60)}.items():
        cr = full.crop((cx, cy, cx + 450, cy + 532)); cr.save(os.path.join(d, f"{nm}{tag}-1x.png")); cr.resize((1350, 1596), Image.NEAREST).save(os.path.join(d, f"{nm}{tag}-3x.png"))
print("sign painted out:", int(brown.sum()), "px")
