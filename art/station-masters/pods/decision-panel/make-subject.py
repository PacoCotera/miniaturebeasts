"""T-20261016-70: the Grow it card's outcome at a size that stands in the tile. The spec's 104 x 112 juvenile is 69 px tall (under half the
160 px picture slot), so the panel gets the same picture reduced from the 304 x 312 painting (never enlarged): its empty top rows cut away,
k = 176 / 304, the figure 108 px tall, the ground row kept on the box's foot (row 124 of 128).
usage: python3 -I decision-panel/make-subject.py SLICES_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image
sl = sys.argv[1]
for sp in ("S01",):
    im = Image.open(os.path.join(sl, f"mibi-juvenile-{sp}-304x312.png")).convert("RGBA")
    a = np.asarray(im).astype(float); pm = a.copy(); pm[..., :3] *= a[..., 3:] / 255         # reduced premultiplied, so no dark fringe
    crop = pm[96:312]; k = 176 / 304; h = round(crop.shape[0] * k)
    ch = [np.asarray(Image.fromarray(crop[..., c].astype(np.float32), "F").resize((176, h), Image.LANCZOS)) for c in range(4)]
    al = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(al, 1e-3)[..., None] * 255
    out = np.zeros((128, 176, 4)); out[128 - h:, :, :3] = np.clip(rgb, 0, 255); out[128 - h:, :, 3] = al; out[out[..., 3] < 1] = 0
    Image.fromarray(np.rint(out).astype(np.uint8), "RGBA").save(os.path.join(sl, f"mibi-juvenile-{sp}-176x128.png"))
    r = np.nonzero((out[..., 3] >= 128).any(1))[0]; print(f"mibi-juvenile-{sp}-176x128: figure rows {r.min()}-{r.max()} ({r.max() - r.min() + 1} px tall)")
