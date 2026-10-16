# Fix 1a follow-up (the CD's check, 10-15): regrade-S01.py moved only the iris pixels under luma 0.75 onto Pip's amber; the
# juvenile's outer iris, a near-white mint sheen (about 232, 248, 235) with olive-grey flecks, stayed cool, so the Station's young
# Loika read pale-eyed against Pip's amber. This moves that band too: mint and olive-grey pixels (hue 0.20-0.55, saturation
# under 0.30, luma 0.38-0.98) within reach of the eye's amber ring (6 px at 304x312, scaled), mapped from their own luma range
# on the 304 master onto Pip's amber iris range and hue. The pupil, the warm-white catch-light (hue under 0.20), the cream ring
# and everything else stay.
# At 48x48 the eye has no amber ring left to reach from, so the two eye boxes are taken by hand (near x 28-35, y 12-17; far
# x 40-43, y 12-16) and their grey-green pixels (green at or above red - 4, saturation under 0.25, luma 0.30-0.85) move the same way.
# usage: python3 -I regrade-S01-iris.py PODS_ROOT   (rewrites slices/mibi-juvenile-S01-{304x312,104x112,96x88,48x48}.png)
import sys, colorsys, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; Lw = np.array([.2126, .7152, .0722])
def hsv(f): return np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b))(f[..., 0], f[..., 1], f[..., 2])
pip = np.asarray(Image.open(f"{P}/slices/mibi-adult-S01-304x312.png").convert("RGBA")).astype(float); pop = pip[..., 3] == 255
pf = pip[..., :3] / 255; pL = pf @ Lw; H, S_, V = hsv(pf)
amber = pop & (H < 0.13) & (S_ > 0.35) & (V > 0.35) & (pL < 0.6); col = pf[amber].mean(0); tp = np.percentile(pL[amber], [5, 50, 95])
def band(a, scale):
    f = a[..., :3] / 255; L = f @ Lw; h, s, v = hsv(f); op = a[..., 3] > 0
    ring = op & (h < 0.11) & (s > 0.35) & (v > 0.25)                    # the eye's amber ring (already Pip's)
    near = nd.binary_dilation(ring, iterations=max(1, round(6 * scale)))
    return op & near & (h > 0.20) & (h < 0.55) & (s < 0.30) & (L > 0.38) & (L < 0.98), L
m304 = np.asarray(Image.open(f"{P}/slices/mibi-juvenile-S01-304x312.png").convert("RGBA")).astype(float)
B, L = band(m304, 1.0)
sp = np.percentile(L[B], [5, 50, 95])
for size, scale in (("304x312", 1.0), ("104x112", 104 / 304), ("96x88", 96 / 304), ("48x48", 48 / 304)):
    f = f"{P}/slices/mibi-juvenile-S01-{size}.png"; a = np.asarray(Image.open(f).convert("RGBA")).astype(float)
    m, Ls = band(a, scale); out = a.copy()
    if size == "48x48":
        f_ = a[..., :3] / 255; Ls = f_ @ Lw; hh, ss, vv = hsv(f_); box = np.zeros(Ls.shape, bool); box[12:18, 28:36] = True; box[12:17, 40:44] = True
        m = box & (a[..., 3] > 0) & (a[..., 1] >= a[..., 0] - 4) & (ss < 0.25) & (Ls > 0.30) & (Ls < 0.85)
    Ln = np.interp(Ls[m], sp, tp); out[..., :3][m] = np.clip(col[None] * (Ln / (col @ Lw))[:, None] * 255, 0, 255)
    Image.fromarray(np.rint(out).astype(np.uint8), "RGBA").save(f); print(size, int(m.sum()))
