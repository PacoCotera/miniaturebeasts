"""PA2 step 2: the tools laid in the tools zone (screen 368, 96, 208 x 352 = slice x 368-575, y 56-407), with the dock's cable.
- gauge, wrench, screwdriver: the lifted painted objects, placed 1:1 (no rescale, no rotation), each with a contact shadow drawn
  from its own alpha: offset (+3, +4) (light from the top left), blurred 2 px, the floor multiplied by 0.55 at the core.
- the dock cable: a dark rubber cable (radius 4 px, lambert-shaded from the top left on its round section, a 1 px darker rim), its
  own shadow (+3, +4, blur 2.5, x0.6); from under the cradle's back plate (screen 200, 165) to the zone, a loose slack S through the
  zone between the tools, ending in a plug lying on the floor (a dark rubber block 22 x 12 with two brass pins).
- then the zone is checked: no empty square of 96 x 96 or more (alpha < 20 of everything laid), every piece inside the zone except
  the cable's run to the cradle.
usage: python3 -I compose-zone.py CLEAN.png TOOLS_DIR OUT.png"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
clean, td, out = sys.argv[1:4]
st = np.asarray(Image.open(clean).convert('RGB')).astype(float); H, W = st.shape[:2]
ZX0, ZY0, ZX1, ZY1 = 368, 56, 576, 408
PL = {'gauge': (392, 70), 'wrench': (420, 190), 'screwdriver': (370, 330)}       # slice top-lefts
layers = []                                                                      # (rgb, alpha) full-size
for n, (x, y) in PL.items():
    t = np.asarray(Image.open(os.path.join(td, f'tool-{n}.png'))).astype(float); h, w = t.shape[:2]
    rgb = np.zeros((H, W, 3)); al = np.zeros((H, W)); rgb[y:y + h, x:x + w] = t[..., :3]; al[y:y + h, x:x + w] = t[..., 3] / 255
    layers.append((n, rgb, al))
# the cable path (slice coords): Catmull-Rom through these points
P = np.array([(160, 125), (240, 120), (330, 118), (380, 128), (430, 150), (520, 160), (555, 200), (530, 245), (470, 262),
              (400, 280), (385, 305), (420, 380), (480, 392), (520, 388)], float)
def catmull(P, n=40):
    pts = []
    Q = np.vstack([P[0], P, P[-1]])
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            pts.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    pts.append(P[-1]); return np.array(pts)
C = catmull(P, 60); R = 4.2
yy, xx = np.mgrid[0:H, 0:W]
# distance to the polyline (on a sub-window for speed)
dist = np.full((H, W), 99.0); along = np.zeros((H, W))
X0, X1, Y0, Y1 = int(C[:, 0].min() - 10), int(C[:, 0].max() + 10), int(C[:, 1].min() - 10), int(C[:, 1].max() + 10)
sx, sy = xx[Y0:Y1, X0:X1] + .5, yy[Y0:Y1, X0:X1] + .5
dsub = np.full(sx.shape, 99.0); nx = np.zeros(sx.shape); ny = np.zeros(sx.shape)
for a, b in zip(C[:-1], C[1:]):
    ab = b - a; L2 = ab @ ab + 1e-9
    t = np.clip(((sx - a[0]) * ab[0] + (sy - a[1]) * ab[1]) / L2, 0, 1)
    px, py = a[0] + t * ab[0], a[1] + t * ab[1]; d = np.hypot(sx - px, sy - py)
    m = d < dsub; dsub = np.where(m, d, dsub); nx = np.where(m, (sx - px), nx); ny = np.where(m, (sy - py), ny)
dist[Y0:Y1, X0:X1] = dsub
NX = np.zeros((H, W)); NY = np.zeros((H, W)); NX[Y0:Y1, X0:X1] = nx; NY[Y0:Y1, X0:X1] = ny
cab_a = np.clip(R + 0.5 - dist, 0, 1)
r = np.clip(dist / R, 0, 1); nz = np.sqrt(np.clip(1 - r * r, 0, 1))
nxu = np.where(dist > 0, NX / np.maximum(dist, 1e-6), 0) * r; nyu = np.where(dist > 0, NY / np.maximum(dist, 1e-6), 0) * r
Lv = np.array([-0.55, -0.62, 0.56]); Lv /= np.linalg.norm(Lv)
lam = np.clip(nxu * Lv[0] + nyu * Lv[1] + nz * Lv[2], 0, 1)
RUB = np.array([46, 45, 48.])
cab_rgb = RUB[None, None] * (0.45 + 0.9 * lam[..., None])
cab_rgb = np.where((dist > R - 1.0)[..., None], cab_rgb * 0.7, cab_rgb)
# the plug at the cable's end
ex, ey = C[-1]; plug = (np.abs(xx + .5 - (ex + 10)) <= 11) & (np.abs(yy + .5 - ey) <= 6)
pl = np.zeros((H, W, 3)) + np.array([38, 37, 40.])
pl[(yy == int(ey) - 6) & plug] = (72, 70, 74); pl[(yy == int(ey) + 6) & plug] = (24, 23, 26)
pins = ((np.abs(yy + .5 - (ey - 3)) <= 1) | (np.abs(yy + .5 - (ey + 3)) <= 1)) & (xx + .5 > ex + 21) & (xx + .5 < ex + 28)
BR = np.array([216, 155, 20.]) * 0.85
layers.append(('cable', cab_rgb, cab_a))
pa = plug.astype(float); layers.append(('plug', pl, pa)); pr = np.zeros((H, W, 3)) + BR; pr[(yy == np.floor(ey - 4)) | (yy == np.floor(ey + 2))] = BR * 1.25
layers.append(('pins', pr, pins.astype(float)))
# shadows first
img = st.copy()
for n, rgb, al in layers:
    sh = nd.shift(al, (4, 3), order=1); sh = nd.gaussian_filter(sh, 2.5 if n in ('cable', 'plug', 'pins') else 2.0)
    k = 0.6 if n in ('cable', 'plug', 'pins') else 0.55
    img = img * (1 - (1 - k) * sh[..., None])
order = [l for l in layers if l[0] in ('cable', 'plug', 'pins')] + [l for l in layers if l[0] not in ('cable', 'plug', 'pins')]
for n, rgb, al in order:                                                         # the cable lies under the tools
    img = img * (1 - al[..., None]) + rgb * al[..., None]
Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8)).save(out)
# the zone check
occ = np.zeros((H, W), bool)
for n, rgb, al in layers: occ |= al > 0.08
z = ~occ[ZY0:ZY1, ZX0:ZX1]
dp = np.zeros(z.shape, int)
for i in range(z.shape[0]):
    for j in range(z.shape[1]):
        if z[i, j]: dp[i, j] = 1 + (min(dp[i - 1, j], dp[i, j - 1], dp[i - 1, j - 1]) if i and j else 0)
best = dp.max(); i, j = np.unravel_index(dp.argmax(), dp.shape)
print('largest empty square in the zone', best, 'at slice', (ZX0 + j - best + 1, ZY0 + i - best + 1))
for n, rgb, al in layers:
    if n in ('cable',): continue
    ys, xs = np.where(al > 0.08); print(n, 'inside zone', xs.min() >= ZX0 and xs.max() < ZX1 and ys.min() >= ZY0 and ys.max() < ZY1)
