"""T-20261016-149 (specs/station-fix5-cargo-spec.md, "Amendment (T-20261016-144)"): the picture-led report's masters. By hand, no paid call.
- cargo-crate-64x64: the walk crate, painted at 64 from the bay's crate painting (source/raw/rw-crate-sealed.jpg, the one the sealed and
  opening crates are cut from), not scaled from a slice: its grey studio ground keyed out by a flood from the border, reduced premultiplied
  with Lanczos into the 64 box (never enlarged), feet on the box's foot, centred; a soft contact shade under it on the plate floor.
- icon-map-14x12 (the spec's icon:map:14x12): a folded field map as a mark, in bone and mist: three panels folded zig-zag (the middle in
  shade), a dotted route across them. A mark, not paper.
- cargo-report-plate-560x{136,176,208}: the door's display plates. The plate never carried the label (the label was its own slice, placed
  over it by the build) nor any engraved word, so the three stand byte for byte; re-signed for this layout.
usage: python3 -I cargo-report/t149/make-report-marks.py OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
src = np.asarray(Image.open("source/raw/rw-crate-sealed.jpg").convert("RGB")).astype(float)
bg = np.median(np.concatenate([src[:8].reshape(-1, 3), src[-8:].reshape(-1, 3), src[:, :8].reshape(-1, 3), src[:, -8:].reshape(-1, 3)]), 0)
near = np.abs(src - bg).max(2) < 26
lab, _ = nd.label(near); edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
ground = np.isin(lab, list(edge)); ground = nd.binary_opening(ground, iterations=2)
a = 1 - nd.gaussian_filter(ground.astype(float), 1.2)
ys, xs = np.nonzero(a > 0.5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
crop = src[y0:y1, x0:x1]; ca = a[y0:y1, x0:x1]
k = min(62 / crop.shape[1], 60 / crop.shape[0]); w, h = round(crop.shape[1] * k), round(crop.shape[0] * k)
pm = np.dstack([crop * ca[..., None], ca * 255])
ch = [np.asarray(Image.fromarray(pm[..., c].astype(np.float32), "F").resize((w, h), Image.LANCZOS)) for c in range(4)]
al = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(al, 1e-3)[..., None] * 255
tile = np.zeros((64, 64, 4)); ox, oy = (64 - w) // 2, 64 - 2 - h
yy, xx = np.mgrid[0:64, 0:64] + .5                                          # the contact shade under it, on the plate floor
sh = np.clip(1 - np.hypot((xx - 32) / (w / 2 + 1), (yy - (oy + h)) / 2.4), 0, 1) ** 1.5 * 0.6
tile[..., :3] = [10, 12, 14]; tile[..., 3] = sh * 255
cr = np.zeros((64, 64, 4)); cr[oy:oy + h, ox:ox + w, :3] = np.clip(rgb, 0, 255); cr[oy:oy + h, ox:ox + w, 3] = al
A = cr[..., 3:] / 255; out_a = A + tile[..., 3:] / 255 * (1 - A)
out_c = (cr[..., :3] * A + tile[..., :3] * tile[..., 3:] / 255 * (1 - A)) / np.maximum(out_a, 1e-6)
Image.fromarray(np.clip(np.rint(np.dstack([out_c, out_a * 255])), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, "cargo-crate-64x64.png"))
print("crate", w, "x", h, "at", ox, oy, "from", (x0, y0, x1, y1))
# the map mark, 14 x 12
S = 8; yy, xx = (np.mgrid[0:12 * S, 0:14 * S] + .5) / S
BONE, MIST, SH = np.array([0xf1, 0xeb, 0xdf], float), np.array([0x8d, 0x8a, 0xa6], float), np.array([0xc6, 0xc4, 0xd8], float)
pan = [(0.5, 5.0, 1.5, 0.5), (5.0, 9.5, 0.5, 1.5), (9.5, 13.5, 1.5, 0.5)]   # x from, x to, top offset at the left, at the right (the zig-zag fold)
col = np.zeros(yy.shape + (3,)); A = np.zeros(yy.shape)
for i, (xa, xb, ta, tb) in enumerate(pan):
    t = np.clip((xx - xa) / (xb - xa), 0, 1); top = ta + (tb - ta) * t; bot = 10.5 + (top - 1.0)
    m = (xx >= xa) & (xx < xb) & (yy >= top) & (yy < bot)
    col[m] = (BONE if i != 1 else SH); A[m] = 1
route = np.zeros_like(A)
for cx, cy in ((2.2, 8.2), (4.0, 6.6), (6.2, 6.0), (8.2, 4.6), (10.4, 4.2), (12.2, 3.0)): route = np.maximum(route, (np.hypot(xx - cx, yy - cy) < 0.65))
col[route > 0] = MIST * 0.75
edge = A.astype(bool) & ~nd.binary_erosion(A.astype(bool), iterations=S // 2); col[edge] = MIST
a1 = A.reshape(12, S, 14, S).mean((1, 3)); c1 = (col * A[..., None]).reshape(12, S, 14, S, 3).mean((1, 3)) / np.maximum(a1, 1e-6)[..., None]
Image.fromarray(np.clip(np.rint(np.dstack([c1, a1 * 255])), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, "icon-map-14x12.png"))
print("map made")
