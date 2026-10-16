# Fix 5 AR4: cargo-rack-992x168 at (16, 384), the device's sage strip under the Cargo bay with six fitted foam wells, cut by hand
# from the signed bay's rim and floor (cargo-bay-992x320) and the signed open crate's fitted foam (crate-open-432x272).
# Light: the key from the top left. No labels, lamps, text or gold.
# usage: python3 -I make-cargo-rack.py SLICES_DIR OUT_DIR
import sys, os, numpy as np
from PIL import Image, ImageFilter
sl, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
bay = np.asarray(Image.open(os.path.join(sl, 'cargo-bay-992x320.png')).convert('RGB')).astype(float)
crate = np.asarray(Image.open(os.path.join(sl, 'crate-open-432x272.png')).convert('RGB')).astype(float)
W, H = 992, 168
rng = np.random.RandomState(5)
# 1. the strip: the bay floor shelf's own painted sage, as its row profile (rows 236-296 of its plain middle, x 300-700) carried to
#    168 rows, with the floor's own fine paint grain (its high-pass, tiled with offsets) and a soft light from the left
mid = bay[236:296, 300:700]
prof = mid.mean(1)                                                          # 60 rows x 3
rows = np.interp(np.linspace(0, 59, H), np.arange(60), np.arange(60))
prof = np.stack([np.interp(rows, np.arange(60), prof[:, c]) for c in range(3)], -1)
a = np.repeat(prof[:, None, :], W, 1) * np.linspace(1.04, 0.86, H)[:, None, None]
hp = mid - np.asarray(Image.fromarray(mid.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float)
for y0 in range(0, H, 60):
    for x0 in range(0, W, 400):
        sx = rng.randint(0, 40); blk = np.roll(hp, sx, 1)[:min(60, H - y0), :min(400, W - x0)]
        a[y0:y0 + blk.shape[0], x0:x0 + blk.shape[1]] += blk * 0.8
a *= np.linspace(1.05, 0.93, W)[None, :, None]                             # the key light from the left
lip = bay[300:304, 0:W]
a[0:4] = lip
a[4:6] = a[4:6] * 0.80                                                    # the lip's shadow line under it
a[H - 6:H - 1] = a[H - 6:H - 1] * np.linspace(0.92, 0.70, 5)[:, None, None]  # the foot, turning away from the light
a[H - 1] = a[H - 1] * 0.55
a[:, 0] = a[:, 0] * 1.10; a[:, -1] = a[:, -1] * 0.70                     # the left end lit, the right end in shade
# 2. the wells: fitted foam cut into the strip, rounded r 14, the crate's foam colour, deeper on the lit-away top-left wall
foam = crate[56:66, 160:260].mean((0, 1))                                 # the open crate's foam tray (about 121, 109, 99)
floor = foam * 0.70                                                        # the well floor, darker than the tray so a grey pod reads
yy, xx = np.mgrid[0:128, 0:96]
def rr(w, h, r, x, y):                                                     # signed distance to a rounded rect (negative inside)
    qx = np.abs(x - (w - 1) / 2) - (w / 2 - r); qy = np.abs(y - (h - 1) / 2) - (h / 2 - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
d = rr(96, 128, 14, xx, yy)
grain = rng.normal(0, 3.0, (128, 96, 1))
for i in range(6):
    x0, y0 = 168 + 112 * i, 24
    reg = a[y0:y0 + 128, x0:x0 + 96]
    inside = d < 0
    # the floor, with a soft shadow from the top and left walls (the light comes from the top left, so those walls shade the floor)
    sh = np.clip(1 - np.minimum(xx, yy * 0.8) / 18.0, 0, 1)[..., None] * 0.30
    f = floor * (1 - sh) + grain
    reg[inside] = f[inside]
    # the inner walls by their facing: a wall whose inward normal points down-right faces the top-left light (lit);
    # one whose normal points up-left is in shade. 3 px wide, graded.
    gy, gx = np.gradient(d); facing = (gx + gy) / (np.hypot(gx, gy) + 1e-6) / np.sqrt(2)    # +1 on the lower-right walls, which face the top-left light
    wall = (d > -4) & inside
    lit = foam * 1.02 * (0.85 + 0.15 * facing[..., None]); shade = floor * (0.55 + 0.10 * (1 + facing[..., None]))
    reg[wall] = np.where(facing[..., None] > 0, lit, shade)[wall]
    # the cut's rim on the strip: 1 px, shaded where it faces away, lit where it faces the light
    rim = (d >= 0) & (d < 1.5)
    reg[rim & (facing < 0)] *= 0.72; reg[rim & (facing >= 0)] *= 1.12
    a[y0:y0 + 128, x0:x0 + 96] = reg
img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.4))
img.save(os.path.join(out, 'cargo-rack-992x168.png'))
print('ok', foam.round(), floor.round())
