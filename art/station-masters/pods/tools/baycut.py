"""Cargo bay, open: fit source/raw/cargo-bay-open-a.jpg (1584x672) to cargo-bay-992x320.
The painted standing pads are taken out (they never lined up with cargo.json's crate places, bay x 48, 368, 688),
a band of plain back wall is taken out (feathered), then the picture is reduced to 992x320."""
import sys, numpy as np
from PIL import Image
ROOT = sys.argv[1]
a = np.asarray(Image.open(f'{ROOT}/source/raw/cargo-bay-open-a.jpg').convert('RGB')).astype(float)
H, W = a.shape[:2]; S = 992 / W; CUT0, CUT1 = 150, 311          # back-wall rows taken out (161 rows = 672 - 320/S)
def shift(a, x0, x1, dx, y0, y1, f=24):
    out = a.copy(); src = a[y0:y1, x0 + dx:x1 + dx] if dx > 0 else a[y0:y1, x0 + dx:x1 + dx]
    w = np.ones(x1 - x0); r = np.linspace(0, 1, f); w[:f] = r; w[-f:] = r[::-1]
    out[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - w[None, :, None]) + src * w[None, :, None]
    return out
d = round((219 - 176) / S)                                       # 43 bay px outward
# the painted pads are taken out: the floor rows get their own bright baseline (80th percentile over 501 px), feathered in
from scipy import ndimage as nd
y0, y1, x0, x1 = 470, 624, 70, 1515
fl = a[y0:y1, x0:x1]
base = np.stack([nd.percentile_filter(fl[..., c], 80, size=(9, 501), mode='nearest') for c in range(3)], -1)
base = nd.gaussian_filter(base, (2, 20, 0))
grain = fl - nd.gaussian_filter(fl, (2, 2, 0)); grain = np.clip(grain, -6, 6)
wy = np.ones(y1 - y0); r = np.linspace(0, 1, 8); wy[:8] = r; wy[-8:] = r[::-1]
wx = np.ones(x1 - x0); r = np.linspace(0, 1, 30); wx[:30] = r; wx[-30:] = r[::-1]
w = (wy[:, None] * wx[None, :])[..., None]
a[y0:y1, x0:x1] = fl * (1 - w) + (base + grain * 0.6) * w
f = 30; top = a[:CUT0 + f]; bot = a[CUT1:]
r = np.linspace(0, 1, f)[:, None, None]
blend = top[-f:] * (1 - r) + bot[:f] * r
b = np.concatenate([top[:-f], blend, bot[f:]], 0)
im = Image.fromarray(np.clip(b, 0, 255).astype(np.uint8)).resize((992, 320), Image.LANCZOS)
im.save(f'{ROOT}/concepts/cargo-bay/cargo-bay-992x320.png'); print(b.shape)

# Cargo bay, shut: source/raw/cargo-bay-shut-a.jpg (a Pro edit of the open picture), the same reduction,
# but the rows taken out are a whole number of door slats (measured period), so the slats stay even; then the
# inside rect (cargo.json bay.inside, 8 px in) is cut: cargo-bay-shut-976x304.
s = np.asarray(Image.open(f'{ROOT}/source/raw/cargo-bay-shut-a.jpg').convert('RGB')).astype(float)
prof = s[60:600, 300:1300].mean((1, 2)); prof -= prof.mean()
ac = np.correlate(prof, prof, 'full')[len(prof) - 1:]; per = 20 + np.argmax(ac[20:60])
n = round((CUT1 - CUT0) / per); c0 = 150; c1 = c0 + n * per
b = np.concatenate([s[:c0], s[c1:]], 0)
im = Image.fromarray(np.clip(b, 0, 255).astype(np.uint8)).resize((992, 320), Image.LANCZOS)
im.crop((8, 8, 984, 312)).save(f'{ROOT}/concepts/cargo-bay/cargo-bay-shut-976x304.png'); print('slat period', per, 'cut', n * per)
