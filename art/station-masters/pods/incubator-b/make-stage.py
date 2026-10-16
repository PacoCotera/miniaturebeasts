"""T-20261016-27 (Incubator option B, candling; specs/station-incubator-tabs-ruling.md §§1-3, §8): incubator-stage, 1024 x 522 at (0, 40).
By hand in code, no paid call. The device's own stage, as on Pods (the concept's style note: "the wall behind is the device's dark matte slate"):
- The base is Pods' clean overview stage (slices/room-bench-stage-overview, T-20261016-35): the sage bezel pixel for pixel; inside it the case's
  dark matte floor. Pods' own marks are taken off the floor (the dish and its tag, the dust prints: they are Pods' story, not the Incubator's):
  the floor is repainted as its own large-scale tone (a normalised sigma-50 blur of the floor away from every mark, so the case's fall of light
  stays) plus its own fine grain (sigma-2 high-pass, from plain floor), feathered over 10 px into the case's edge shade.
- The ring's track is moulded into that floor: an open arc, centre (512, 248) in the slice (288 on screen), radii 176-200, 264 degrees
  clockwise from 228 to 132 (12 o'clock = 0), so the 96-degree gap at the bottom holds the cradle; rounded end caps. A recess 2 px deep with
  rounded 1.5 px walls, lambert from the top left (the wall nearer the light in shade, the far wall catching it), its floor the slate x0.62,
  its lip a soft 1 px contact shade. Matte; nothing else is painted.
usage: python3 -I make-stage.py SLICES_DIR OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]
a = np.asarray(Image.open(sl + "/room-bench-stage-overview.png").convert("RGBA")).astype(float); rgb = a[..., :3].copy(); H, W = rgb.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
# 1. the floor without Pods' marks. The floor is the interior less a 10 px band along the bezel (the case's own inner shade stays).
FX0, FY0, FX1, FY1 = 84, 30, 942, 498                                     # slice: the interior (71-953 x 59-548 on screen) less its edge shade
floor = (xx >= FX0) & (xx < FX1) & (yy >= FY0) & (yy < FY1)
med = nd.median_filter(rgb, size=(41, 41, 1)); dev = np.linalg.norm(rgb - med, axis=-1)
dish = ((xx - 260) / 100.0) ** 2 + ((yy - 300) / 72.0) ** 2 <= 1.0       # Pods' dish hollow, its grass
tag = (xx >= 212) & (xx < 336) & (yy >= 336) & (yy < 420)                  # and its paper tag (measured: bright ink x 219-328, y 343-413)
marks = nd.binary_dilation((dev > 12) | dish | tag, iterations=6) & floor
# the floor's own large-scale tone (the case's fall of light), from floor pixels away from every mark: a normalised blur
G = lambda img, s_: nd.gaussian_filter(img, (s_, s_, 0) if img.ndim == 3 else s_)
good = (floor & ~marks).astype(float)
tone = G(rgb * good[..., None], 50) / np.maximum(G(good, 50), 1e-3)[..., None]
# its own fine grain (sigma 2 high-pass), each pixel's from plain floor at a random shift
hp = rgb - G(rgb, 2)
plain = floor & ~nd.binary_dilation(marks, iterations=3)
grain = np.zeros_like(rgb); done = ~floor
rng = np.random.default_rng(27)
for _ in range(400):
    dy, dx = rng.integers(-220, 221), rng.integers(-420, 421)
    sy, sx = np.clip(yy + dy, 0, H - 1), np.clip(xx + dx, 0, W - 1)
    ok = ~done & plain[sy, sx]
    grain[ok] = hp[sy[ok], sx[ok]]; done |= ok
    if done.all(): break
w = np.clip(np.minimum.reduce([xx - FX0, FX1 - 1 - xx, yy - FY0, FY1 - 1 - yy]) / 10.0, 0, 1) * floor   # feathered over 10 px into the case's edge shade
rgb = rgb * (1 - w[..., None]) + (tone + grain) * w[..., None]
print("floor repainted", int((w > 0).sum()), "px; marks excluded from the tone", int(marks.sum()), "px; grain unresolved", int((~done).sum()))
# 2. the ring's track, supersampled 4x
S = 4; CX, CY, R0, R1 = 512, 248, 176, 200; A0, SPAN = 228, 264
Y4, X4 = (np.mgrid[0:H * S, 0:W * S] + .5) / S
r = np.hypot(X4 - CX, Y4 - CY); ang = (np.degrees(np.arctan2(X4 - CX, -(Y4 - CY))) % 360)   # clockwise from 12 o'clock
t = ((ang - A0) % 360) / SPAN                                              # 0..1 along the arc where it runs
on = t <= 1.0
RM, HW = (R0 + R1) / 2, (R1 - R0) / 2
cap = lambda deg: (CX + RM * np.sin(np.radians(deg)), CY - RM * np.cos(np.radians(deg)))
d_rad = HW - np.abs(r - RM)                                                # inside the track, distance to its nearer wall
c0, c1 = cap(A0), cap((A0 + SPAN) % 360)
d_cap = np.maximum(HW - np.hypot(X4 - c0[0], Y4 - c0[1]), HW - np.hypot(X4 - c1[0], Y4 - c1[1]))
d = np.where(on, d_rad, d_cap)                                             # > 0 inside the recess
depth = -2.0 * np.clip(d / 1.5, 0, 1)                                      # a 2 px recess with 1.5 px rounded walls
gy, gx = np.gradient(nd.gaussian_filter(depth, S * .4)); gx *= S; gy *= S
nrm = np.dstack([-gx, -gy, np.ones_like(gx)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
lam = np.clip(nrm @ L, 0, 1) / L[2]
inside = (d > 0).astype(np.float32)
dn = lambda img: img.reshape(H, S, W, S, *img.shape[2:]).mean((1, 3))
lam1, ins1 = dn(lam * inside), dn(inside)
shade = np.where(ins1 > 0, lam1 / np.maximum(ins1, 1e-6), 1.0)             # 1 on the recess floor, < 1 on the wall nearer the light, > 1 on the far wall
k = np.where(ins1 > 0, 0.62 * shade, 1.0)
lip = dn(((d <= 0) & (d > -1.2)).astype(np.float32))                        # the lip's soft contact shade just outside the recess
L1 = lin(rgb) * (1 - ins1[..., None] + ins1[..., None] * k[..., None]) * (1 - 0.22 * lip[..., None])
a[..., :3] = np.clip(np.rint(srgb(L1)), 0, 255)
Image.fromarray(a.astype(np.uint8), "RGBA").save(out)
ys, xs = np.nonzero(ins1 > 0.5); print("track ink x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "(slice)")
