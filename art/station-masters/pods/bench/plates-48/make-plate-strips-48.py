"""T-20261016-33 (specs/station-probe-purpose.md §4, work-queue): bench-plate-strip-t1-176x64 (three recesses) and bench-plate-strip-t2-232x64
(four), the PA1 strips (bench/make-plate-strips.py, bench/plate-strip-notes.md) at the new size, built the same way. By hand in code, no paid call.
- Foam: the flat inside of bench-cradle-empty-480x288, crop (106, 122, 232, 61) (Rec.709 luma mean 55.3, std 0.31: the PA1 crop's foam, which
  is too small for 232 x 61); x 0-175 for t1, all of it for t2. Not tiled, mirrored or stretched.
- Recess shape: the alpha of bench-plate-gone-48x48 at 128, at (8 + 56 k, 8).
- As the PA1 notes, in linear light per channel, rounded ties-to-even: body rows 0-60, corner radius 3; row 0 and column 0 x1.30, the last row and
  column x0.60; in each recess the floor x0.60, the 2 px top and left walls x0.35, the 1 px bottom and right lip x1.35 (the shadow band wins where
  they meet); the baked contact shadow in rows 61-63 from x 3, ground #1d232b at 45, 30 and 15 %. Nothing else: matte, no label or texture.
usage: python3 -I make-plate-strips-48.py SLICES_DIR"""
import sys, os
import numpy as np
from PIL import Image
D = sys.argv[1]; ld = lambda n: np.asarray(Image.open(os.path.join(D, n + ".png")).convert("RGBA"))
def to_lin(c): c = c / 255.0; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def to_srgb(l): l = np.clip(l, 0, 1); return np.rint(255 * np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055)).astype(np.uint8)
def mul(px, k): return to_srgb(to_lin(px.astype(float)) * k)
BH, P, PITCH = 61, 48, 56                                                   # body rows, plate size, pitch
foam_all = ld("bench-cradle-empty-480x288")[122:122 + BH, 106:106 + 232, :3]
mask = ld("bench-plate-gone-48x48")[..., 3] >= 128
def shift(m, dy, dx):
    o = np.zeros_like(m)
    o[max(dy, 0):m.shape[0] + min(dy, 0), max(dx, 0):m.shape[1] + min(dx, 0)] = m[max(-dy, 0):m.shape[0] + min(-dy, 0), max(-dx, 0):m.shape[1] + min(-dx, 0)]
    return o
shadow_band = mask & (~shift(mask, 1, 1) | ~shift(mask, 2, 2))
light_band = mask & ~shift(mask, -1, -1)
floor = mask & ~shadow_band & ~light_band
def strip(w, n):
    out = np.zeros((BH + 3, w, 4), np.uint8); out[:BH, :, :3] = foam_all[:, :w]; out[:BH, :, 3] = 255
    rr = np.ones((BH, w), bool)
    for cy, cx, ys, xs in ((3, 3, slice(0, 3), slice(0, 3)), (3, w - 3, slice(0, 3), slice(w - 3, w)),
                           (BH - 3, 3, slice(BH - 3, BH), slice(0, 3)), (BH - 3, w - 3, slice(BH - 3, BH), slice(w - 3, w))):
        yy, xx = np.mgrid[ys, xs]; rr[ys, xs] = np.hypot(xx + .5 - cx, yy + .5 - cy) <= 3
    k = np.ones((BH, w)); k[0, :] *= 1.30; k[:, 0] *= 1.30; k[BH - 1, :] *= 0.60; k[:, w - 1] *= 0.60
    out[:BH, :, :3] = mul(out[:BH, :, :3], k[..., None])
    for i in range(n):
        x0, y0 = 8 + PITCH * i, 8; sub = out[y0:y0 + P, x0:x0 + P, :3]
        for m_, kk in ((floor, .60), (shadow_band, .35), (light_band, 1.35)): sub[m_] = mul(sub[m_], kk)
    out[:BH, :, 3] = np.where(rr, 255, 0); out[:BH, :, :3][~rr] = 0
    for row, pct in ((BH, .45), (BH + 1, .30), (BH + 2, .15)):
        out[row, 3:, :3] = (0x1d, 0x23, 0x2b); out[row, 3:, 3] = int(np.rint(255 * pct))
    return out
for name, w, n in (("bench-plate-strip-t1-176x64", 176, 3), ("bench-plate-strip-t2-232x64", 232, 4)):
    a = strip(w, n); assert a.shape[:2] == (64, w)
    assert set(np.unique(a[:BH, :, 3])) <= {0, 255} and set(np.unique(a[BH:, 3:, 3])) == {115, 76, 38}
    ys, xs = np.nonzero(mask)
    for i in range(n):                                                      # each recess sits exactly where the mask says
        ch = (a[8:8 + P, 8 + PITCH * i:8 + PITCH * i + P, :3] != foam_all[8:8 + P, 8 + PITCH * i:8 + PITCH * i + P]).any(-1)
        y2, x2 = np.nonzero(ch); assert (y2.min(), y2.max(), x2.min(), x2.max()) == (ys.min(), ys.max(), xs.min(), xs.max()), (name, i)
    assert 8 + PITCH * (n - 1) + P + 8 == w, name                          # 8 px margins both sides
    Image.fromarray(a, "RGBA").save(os.path.join(D, name + ".png")); print(name, "ok")
