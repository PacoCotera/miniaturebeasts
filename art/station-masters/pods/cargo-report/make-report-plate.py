# Fix 5 AR5: cargo-report-plate-560x288, the master, cut by hand at 0 MXN: the stamp case's construction (room-stamp-case-152x152,
# 001bcd51) at 560 wide, moulded into the shut sage door (cargo-bay-shut-976x304): a dim well, a lit top-left moulded rim, a shaded
# lower-right, dark rubber corners, no glass, no sheen, no text. The floor is ground #1d232b (relative luminance 0.0164), so bone
# reads at 13:1 and mist at 4.8:1 (the spec asks 7 and 4.5). Corners rounded r 10, transparent outside, so the door shows round them.
# usage: python3 -I make-report-plate.py SLICES_DIR OUT_DIR
import sys, os, numpy as np
from PIL import Image
sl, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
H_ = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
GROUND, BAR, HAIR, DEEP = H_('#1d232b'), H_('#23292f'), H_('#3d434b'), H_('#2a2a2d')
door = np.asarray(Image.open(os.path.join(sl, 'cargo-bay-shut-976x304.png')).convert('RGB')).astype(float)
W, H = 560, 288
sage = door[8:296, 208:768].reshape(-1, 3).mean(0)                      # the door's own sage under the plate (screen 232..792, 64..352)
LIT, SHADE = np.minimum(sage * 1.22, 255), sage * 0.62
yy, xx = np.mgrid[0:H, 0:W]
def rr(w, h, r, x, y):
    qx = np.abs(x - (w - 1) / 2) - (w / 2 - r); qy = np.abs(y - (h - 1) / 2) - (h / 2 - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
d_out = rr(W, H, 10, xx, yy)                                            # the plate's outline
d_in = rr(W - 16, H - 16, 6, xx - 8, yy - 8)                            # the well, 8 px in
a = np.zeros((H, W, 3)) + sage
gy, gx = np.gradient(d_out); face = -(gx + gy) / (np.hypot(gx, gy) + 1e-6) / np.sqrt(2)   # +1 on the top-left outer edge (faces the light)
mould = (d_out <= 0) & (d_in >= 0)                                        # the 8 px moulding between the plate's edge and the well
t = np.clip(-d_out / 8.0, 0, 1)                                         # 0 at the outer edge, 1 at the well
bev = (1 - t) * 0.30 + 0.06                                             # a rounded bevel: strongest at the outer edge
a[mould] = (sage * (1 + bev * face)[..., None])[mould]                  # lit where it faces the top-left light, shaded where it faces away
rimz = (d_out > -1.5) & (d_out <= 0)
a[rimz] = np.where(face[rimz][:, None] > 0, LIT, SHADE)                  # the outer arris
inside = d_in < 0
rng = np.random.RandomState(7)
a[inside] = GROUND + rng.normal(0, 1.2, (inside.sum(), 1))               # the well floor, quiet
gy2, gx2 = np.gradient(d_in); f2 = (gx2 + gy2) / (np.hypot(gx2, gy2) + 1e-6) / np.sqrt(2)   # +1 on the lower-right inner wall
for k in range(4):                                                      # the inner walls, 4 px: top-left in shade, lower-right catching light
    band = (d_in > -(k + 1)) & (d_in <= -k)
    a[band] = np.where(f2[band][:, None] > 0, HAIR * (1 - k * .12) + GROUND * (k * .12), BAR * 0.8 * (1 - k * .15) + GROUND * (k * .15))
lip = (d_in >= 0) & (d_in < 1.5); a[lip] = np.where(f2[lip][:, None] < 0, SHADE * 0.8, LIT * 0.95)   # the well's lip on the moulding
for (y, x) in ((0, 0), (0, W - 9), (H - 9, 0), (H - 9, W - 9)):          # dark rubber corners, as on the stamp case and the crates
    a[y:y + 9, x:x + 9] = DEEP
alpha = np.clip(0.5 - d_out, 0, 1) * 255                                # rounded outer corners, 1 px anti-aliased
rgba = np.dstack([np.clip(a, 0, 255), alpha]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'cargo-report-plate-560x288.png'))
lin = lambda c: np.where(c / 255 <= .04045, c / 255 / 12.92, ((c / 255 + .055) / 1.055) ** 2.4)
L = lambda c: lin(np.asarray(c, float)) @ [.2126, .7152, .0722]
fl = L(a[inside].mean(0)); print('floor L', round(float(fl), 4), 'bone', round(float((L(H_('#f1ebdf')) + .05) / (fl + .05)), 2), 'mist', round(float((L(H_('#8d8aa6')) + .05) / (fl + .05)), 2))
