"""T-20261016-27 (Incubator option B; specs/station-incubator-tabs-ruling.md §3, §8): incubator-ring-fill and incubator-ring-closed, 400 x 400
at (312, 88). By hand in code, no paid call. The ring of time: how close the meeting is.
- The fill: a moulded inlay in the track (the arc of incubator-stage: centre (200, 200) here, radii 176-200, 264 degrees clockwise from 228,
  12 o'clock = 0): the kit's sand polymer, matte, rounded across its width (lambert from the top left), inset 3 px from the track's walls (radii
  179-197), with rounded ends. Held dark (the sand x0.50) so the pod stays the brightest object (brightness rule, ruling §6).
- The form the build steps: the full arc is one picture; the build shows the part from 228 degrees clockwise to 228 + 264 f (whole degrees),
  clipping the picture to that wedge. The leading end is the wedge's straight edge, the trailing end the picture's rounded cap.
- incubator-ring-closed (ready): the full fill with both end caps warmed where they meet the candling light under the nest (the cradle's lens
  colour, falling to zero 12 degrees from each end; T-20261016-124: equal to the fill everywhere else).
usage: python3 -I make-ring.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
out = sys.argv[1]
N, S = 400, 4
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
yy, xx = (np.mgrid[0:N * S, 0:N * S] + .5) / S
C, R0, R1, A0, SPAN = 200, 179, 197, 228, 264
r = np.hypot(xx - C, yy - C); ang = np.degrees(np.arctan2(xx - C, -(yy - C))) % 360
t = ((ang - A0) % 360) / SPAN
RM, HW = (R0 + R1) / 2, (R1 - R0) / 2
cap = lambda deg: (C + RM * np.sin(np.radians(deg)), C - RM * np.cos(np.radians(deg)))
c0, c1 = cap(A0), cap((A0 + SPAN) % 360)
d = np.where(t <= 1, HW - np.abs(r - RM), np.maximum(HW - np.hypot(xx - c0[0], yy - c0[1]), HW - np.hypot(xx - c1[0], yy - c1[1])))
m = d > 0
h = np.sqrt(np.clip(d / HW, 0, 1)) * 3                                      # rounded across its width
gy, gx = np.gradient(nd.gaussian_filter(h, S * .4)); gx *= S; gy *= S
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
lam = 0.45 + 0.55 * np.clip(n @ L, 0, 1) / L[2]
SAND = lin([196, 178, 140]) * 0.50
col = SAND * lam[..., None]
dn = lambda img: img.reshape(N, S, N, S, *img.shape[2:]).mean((1, 3))
def save(name, c):
    a = dn(m.astype(np.float32)); cc = dn(c * m[..., None]) / np.maximum(a, 1e-6)[..., None]
    img = np.dstack([srgb(cc), a * 255]); img[a <= 0] = 0; img = np.clip(np.rint(img), 0, 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(os.path.join(out, name + ".png"))
    Y = lin(img[..., :3]) @ [.2126, .7152, .0722]; op = img[..., 3] > 128
    print(name, "px", int(op.sum()), "rel. lum p95 %.3f" % np.percentile(Y[op], 95))
save("incubator-ring-fill", col)
# T-20261016-124: the warmth is held to the ends, exactly zero past 12 degrees from the nearer end (it was an exponential that never
# reached zero, so the closed picture differed from the fill all round the ring). Everywhere else the closed ring is the fill, pixel for pixel,
# so the face's ready redraw is only the gap where the ends meet the light.
de = np.minimum((132 - ang) % 360, (ang - 228) % 360)                         # the degrees from the nearer end (0 in the gap and the caps)
wk = np.clip(1 - de / 12.0, 0, 1); warm = wk * wk * (3 - 2 * wk)
save("incubator-ring-closed", col + lin([214, 150, 62])[None, None] * 0.35 * warm[..., None])
