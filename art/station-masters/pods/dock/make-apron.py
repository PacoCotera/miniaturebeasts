"""T-20261016-120 (specs/station-dock-arrival-spec.md, Amendment T-20261016-112): cargo-bay-apron-992x180 at (16, 368), the bay's floor
carried forward toward the viewer for the arrival show, the floor the mibis coming home stand on (feet y 528). Calm: no marks, no wells.
Built from the open bay's own painting (cargo-bay-992x320), so it is its material, grain and light:
- the floor tone: the bay floor's near part (rows 260-290, columns 120-880 of the slice, clear of its front lip and slanted ends), lifted
  a little more toward the viewer
  as the bay's floor lifts toward its front, and darkened toward both sides and the bottom (the key from the top left, a soft vignette);
- the grain: the bay floor's own high-pass texture, mirrored across and down the apron so it never repeats with a seam;
- the join: the first 8 rows blend from the bay's last row (y 367) into the apron, so the two meet with no seam;
- the sides: the bay's side bezels (its first and last 8 columns) carried down;
- the front edge: a moulded lip at y 540-548, lit on its top, as the bay's own front lip.
usage: python3 -I dock/make-apron.py SLICES_DIR OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
bay = np.asarray(Image.open(os.path.join(sl, "cargo-bay-992x320.png")).convert("RGB")).astype(float)
W, H = 992, 180
fl = lin(bay[205:250, 120:880])                                                            # the floor's surface, clear of its slanted ends
tone = np.broadcast_to(lin(bay[260:290, 120:880]).mean((0, 1)), (W, 3))                   # the tone of its near part (it lifts toward the front)
g0 = fl - nd.gaussian_filter(fl, (6, 6, 0))                                                # its own grain, mirrored out to the full width
grain = np.concatenate([g0[:, ::-1], g0, g0[:, ::-1]], 1)[:, 760 - 116:760 - 116 + W]
rows = np.concatenate([grain, grain[::-1]] * 5)[:H]                                       # mirrored down: no repeat seam
y = np.arange(H)[:, None] + .5; x = np.arange(W)[None, :] + .5
lift = 1.0 + 0.04 * np.clip(y / 90, 0, 1) - 0.10 * np.clip((y - 120) / 60, 0, 1)        # lifts toward the viewer, falls off at the front
side = 1 - 0.16 * np.exp(-x / 60) - 0.20 * np.exp(-(W - x) / 60)                         # the key from the left: the right side darker
col = tone[None] * (lift * side)[..., None] + rows * 0.9
for c0, c1 in ((0, 8), (984, 992)):                                                         # the bay's side bezels carried down
    bz = lin(bay[250:300, c0:c1]).mean(0); col[:, c0:c1] = bz[None] * (1 - 0.08 * np.clip(y / H, 0, 1))[..., None]
lipy = (y >= 172) & (y < 180)                                                               # the front lip: lit on its top, shade under
lip_k = np.where(y < 174, 1.25, np.where(y < 177, 1.0, 0.55))
col = np.where(lipy[..., None], col * lip_k[..., None], col)
seamrow = lin(bay[319])[None]                                                               # the join: from the bay's last row
t = np.clip(y / 8, 0, 1)[..., None]; t = t * t * (3 - 2 * t)
col = seamrow * (1 - t) + col * t
img = np.clip(np.rint(srgb(col)), 0, 255).astype(np.uint8)
Image.fromarray(np.dstack([img, np.full((H, W), 255, np.uint8)]), "RGBA").save(os.path.join(out, "cargo-bay-apron-992x180.png"))
print("made: cargo-bay-apron-992x180")
