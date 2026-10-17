"""T-20261016-97: the link light repainted as light on the bay floor (results/review-art-2026-10-16c.md §4: the 976 x 8 read as a cream rule).
- cargo-link-light-976x48 at (24, 264): a warm pool lying on the floor along the crates' feet line (y 296, row 32). It is brightest at a soft
  core on that line and falls off over the floor: shorter above (the floor recedes) and longer below, toward the eye. It is strongest at the
  bay's left edge, where the link comes in. It lights only the floor: its alpha follows the open bay's own floor
  (cargo-bay-992x320: floor where green leads red, softened), and it takes the floor's grain, so it is shown by what it lights. It ends at
  y 312, the home band's top. The crates are drawn over it.
- cargo-link-light-976x48-step1, -step2, -step3: the first 244, 488 and 732 px, each with a soft leading edge (24 px), for the spec's 4 cuts
  (step 4 is the full master). The build may instead clip the full master; then each cut's front is a hard edge.
It shows over the open bay only (the arrival's bay state); it is never drawn over the shutter.
usage: python3 -I dock/make-link-light.py SLICES_DIR OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
W, H, X0, Y0, FEET = 976, 48, 24, 264, 32
bay = np.asarray(Image.open(os.path.join(sl, "cargo-bay-992x320.png")).convert("RGB")).astype(float)
under = bay[Y0 - 48:Y0 - 48 + H, X0 - 16:X0 - 16 + W]                       # the bay under the rect (the bay is at (16, 48))
floor = nd.gaussian_filter(((under[..., 1] - under[..., 0]) > 2).astype(float), 1.5)
lum = lin(under) @ np.array([.2126, .7152, .0722]); grain = lum / np.maximum(nd.gaussian_filter(lum, 6), 1e-4)
yy, xx = np.mgrid[0:H, 0:W] + .5
d = yy - FEET; sig = np.where(d < 0, 6.0, 13.0)
pool = 0.36 * np.exp(-0.5 * (d / sig) ** 2) + 0.16 * np.exp(-0.5 * (d / 2.6) ** 2)   # the broad pool and its soft core on the feet line
run = 0.72 + 0.28 * np.exp(-xx / 260)                                         # strongest where the link comes in, at the left
end = np.clip(xx / 10, 0, 1) * np.clip((W - xx) / 40, 0, 1) * np.clip((H - yy) / 4, 0, 1)
a = np.clip(pool * run * floor * end * np.clip(grain, 0.7, 1.3), 0, 1)
col = srgb(lin([255, 216, 156]))
def save(name, alpha):
    Image.fromarray(np.clip(np.rint(np.dstack([np.broadcast_to(col, (H, W, 3)), alpha * 255])), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".png"))
save("cargo-link-light-976x48", a)
for k in (1, 2, 3):
    edge = 244 * k; front = np.clip((edge - xx) / 24, 0, 1); front = front * front * (3 - 2 * front)
    save(f"cargo-link-light-976x48-step{k}", a * front)
print("made: cargo-link-light-976x48, -step1, -step2, -step3; peak alpha", round(float(a.max()), 3))
