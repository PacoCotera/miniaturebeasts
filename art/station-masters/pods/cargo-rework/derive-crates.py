"""Cargo rework: every crate size and state derived from the two new 432x272 cuts (cut-crates.py), the same ids, sizes and boxes
as the signed set, so no rect, frame list or dirty area moves:
- crate-opening-432x272: the sealed crate with its lid (rows above the seam, y < 176) lifted 6 px, the gap the dark interior (a ramp
  from the lid's shadowed underside #1c1b1e to #34322e, across the body inset 10 px); no tag to tear any more.
- crate-sealed-256x176, home-crate-48x40: the sealed crate reduced uniformly (premultiplied Lanczos, never enlarged) into the signed
  boxes: 235x150 at (10, 13) and 46x29 at (1, 11).
- crate-sitting-256x176, crate-sitting-80x56, crate-sitting-48x40: the sitting crate = the sealed crate whose black label plate
  carries a cream picture-frame glyph (3 px stroke) in place of the egg,
  reduced the same way (80x56: 75x48 at (2, 4)).
usage: python3 -I derive-crates.py IN_DIR OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
sealed = np.asarray(Image.open(os.path.join(src, 'crate-sealed-432x272.png')).convert('RGBA')).astype(float)
H, W = sealed.shape[:2]
def save(a, n): Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, n + '.png'))
# opening
SEAM, LIFT = 180, 6                                     # the seam, after the 4 px drop of the 432 crates
op = np.zeros_like(sealed); op[SEAM:] = sealed[SEAM:]
op[:SEAM - LIFT] = sealed[LIFT:SEAM]
body = sealed[SEAM:SEAM + 1, :, 3] > 200
xs = np.where(body[0])[0]; x0, x1 = xs.min() + 10, xs.max() - 10
for i in range(LIFT):
    t = i / (LIFT - 1)
    c = np.array([28, 27, 30.]) * (1 - t) + np.array([52, 50, 46.]) * t
    row = SEAM - LIFT + i
    op[row, x0:x1 + 1, :3] = c; op[row, x0:x1 + 1, 3] = 255
save(op, 'crate-opening-432x272')
# the sitting plate
sit = sealed.copy()
cy, cx = slice(80, 130), slice(170, 262)
reg = sit[cy, cx]; dark = (reg[..., :3].mean(-1) < 70) & (reg[..., 3] > 200)
lab, k = nd.label(dark); sz = nd.sum(dark, lab, range(1, k + 1)); plate = lab == (np.argmax(sz) + 1)
plate = nd.binary_fill_holes(plate)
ys, xs = np.where(plate); py0, py1, px0, px1 = ys.min(), ys.max(), xs.min(), xs.max()
yy, xx = np.mgrid[0:reg.shape[0], 0:reg.shape[1]]
inner = plate & (yy > py0 + 1) & (yy < py1 - 1) & (xx > px0 + 1) & (xx < px1 - 1)
ink = np.median(reg[..., :3][inner & (reg[..., :3].mean(-1) < 70)], axis=0)       # the plate's own black
col = reg[..., :3].copy(); col[inner] = ink                                         # the egg painted out
CREAM = np.array([241, 235, 223.])
fx0, fx1 = (px0 + px1) // 2 - 9, (px0 + px1) // 2 + 9; fy0, fy1 = (py0 + py1) // 2 - 6, (py0 + py1) // 2 + 6
frame = ((xx >= fx0) & (xx <= fx1) & (yy >= fy0) & (yy <= fy1)) & ~((xx >= fx0 + 3) & (xx <= fx1 - 3) & (yy >= fy0 + 3) & (yy <= fy1 - 3))
col[frame] = CREAM
reg[..., :3] = np.where(plate[..., None], col, reg[..., :3]); sit[cy, cx] = reg
def reduce(a, w, h, x, y, size):
    ys, xs = np.where(a[..., 3] > 0); sub = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255, sub[..., 3:]])
    r = np.asarray(Image.fromarray(np.clip(np.round(pm), 0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255; rgb = np.where(al > 0, r[..., :3] / np.maximum(al, 1e-6), 0)
    o = np.zeros((size[1], size[0], 4)); o[y:y + h, x:x + w] = np.dstack([rgb, r[..., 3:]]); return o
save(reduce(sealed, 235, 150, 10, 13, (256, 176)), 'crate-sealed-256x176')
save(reduce(sit, 235, 150, 10, 13, (256, 176)), 'crate-sitting-256x176')
save(reduce(sit, 75, 48, 2, 4, (80, 56)), 'crate-sitting-80x56')
save(reduce(sit, 46, 29, 1, 11, (48, 40)), 'crate-sitting-48x40')
save(reduce(sealed, 46, 29, 1, 11, (48, 40)), 'home-crate-48x40')
save(sit, 'crate-sitting-432x272-work')
print('plate', (px0 + 170, py0 + 80, px1 + 170, py1 + 80))
