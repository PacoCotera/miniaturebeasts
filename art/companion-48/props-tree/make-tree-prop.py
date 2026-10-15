"""A5, the meadow tree prop (AD, 10-15, by hand at 0 MXN): c-canopy-88x76 and c-trunk-32, replacing the code stand-ins at their
own sizes and ids, so the place's anchors are unchanged (trunk at the cell's (8, 16); canopy as an overlay that the code thins to
a checkerboard when a token is beneath). Drawn in the meadow kit's own colours (its props sheet: the bushes' eleven greens, the
bridge's wood, the void outline), not the core 48.
The canopy: six leaf clusters as domes, lit from the top left (lambert on the height field, the gaps between clusters in the
deepest green), the leaf texture taken from the signed bush-3's own pixels (its colour ranks minus their blur, tiled), the rim
notched into leaf points (each cluster's radius modulated round its edge), a 1 px void outline. The trunk: short, sturdy, lit
from the left in the bridge's wood ramp, with a two-root flare and a soft contact shade in the bushes' ground-shadow green.
usage: python3 -I make-tree-prop.py PROPS_SHEET.png OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sheet, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
S = np.asarray(Image.open(sheet).convert('RGBA'))
VOID = (12, 10, 18)
GREENS = [(24, 33, 26), (29, 71, 63), (31, 79, 64), (43, 59, 52), (52, 93, 52), (58, 119, 59), (65, 131, 56), (79, 145, 58),
          (97, 157, 59), (108, 168, 56), (133, 180, 63), (166, 186, 68)]
lum = lambda c: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
GREENS.sort(key=lum); NG = len(GREENS)
# the leaf texture: bush-3's colour ranks minus their blur
b3 = S[0:164, 97:271]; rk = np.full(b3.shape[:2], np.nan)
for i, c in enumerate(GREENS): rk[(b3[..., :3] == c).all(-1) & (b3[..., 3] > 0)] = i
m = ~np.isnan(rk); core = nd.binary_erosion(m, iterations=6)
f = np.where(m, rk, 0); w = nd.gaussian_filter(m.astype(float), 3); sm = nd.gaussian_filter(f, 3) / np.maximum(w, 1e-6)
tex = np.where(core, rk - sm, np.nan)
ys, xs = np.where(core); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
T = tex[y0:y1, x0:x1]; T = np.where(np.isnan(T), 0, T)

W, H = 88, 76
yy, xx = np.mgrid[0:H, 0:W] + .5
# clusters: (cx, cy, rx, ry, lift); the back row higher on screen, the front row lower, the crown up top
CL = [(44, 40, 32, 27, 0.0), (22, 34, 17, 15, 2.0), (66, 34, 17, 15, 1.0), (44, 18, 20, 14, 4.0), (30, 54, 17, 13, -1.0),
      (60, 54, 18, 13, -2.0), (15, 46, 10, 10, -1.0), (73, 47, 10, 10, -2.0)]
rng = np.random.RandomState(52)
Hh = np.full((H, W), -np.inf); who = np.full((H, W), -1)
for k, (cx, cy, rx, ry, lift) in enumerate(CL):
    th = np.arctan2((yy - cy) / ry, (xx - cx) / rx)
    n = max(5, int(np.pi * (rx + ry) / 6.5)); ph = rng.uniform(0, 2 * np.pi)
    amp = 0.07 + 0.06 * (np.sin(2.3 * th + 2 * ph) > 0)                       # irregular: some leaf points stand out further
    wob = 1 + amp * np.sign(np.sin(n * th + ph + 0.6 * np.sin(3 * th))) * np.abs(np.sin(n * th + ph + 0.6 * np.sin(3 * th))) ** 0.5
    d = np.hypot((xx - cx) / (rx * wob), (yy - cy) / (ry * wob))
    h = np.where(d < 1, np.sqrt(np.clip(1 - d * d, 0, 1)) * (rx + ry) * 0.35 + lift, -np.inf)
    better = h > Hh; Hh = np.where(better, h, Hh); who = np.where(better, k, who)
mask = np.isfinite(Hh)
hz = np.where(mask, Hh, 0)
gy, gx = np.gradient(nd.gaussian_filter(hz, 0.8))
nrm = np.dstack([-gx, -gy, np.ones_like(gx)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
Lv = np.array([-0.6, -0.65, 0.65]); Lv /= np.linalg.norm(Lv)
lam = np.clip(nrm @ Lv, 0, 1)
occl = np.zeros((H, W))                                               # where a front cluster stands over a back one: the back
for dy in range(-3, 4):                                               # cluster's pixels just behind its rim fall into shade
    for dx in range(-3, 4):
        if not (dy or dx) or dy * dy + dx * dx > 9: continue
        nb = np.roll(np.roll(Hh, -dy, 0), -dx, 1); nw = np.roll(np.roll(who, -dy, 0), -dx, 1)
        under = mask & (nw != who) & (nw >= 0) & (nb > Hh + 0.5)
        occl = np.maximum(occl, under * (1 - np.hypot(dy, dx) / 3.6))
glob = 1.0 - ((xx / W) * 0.4 + (yy / H) * 0.6)                        # the lower right of the whole canopy is the darkest
val = lam * 0.8 + glob * 0.7 - occl * 1.3
B = S[0:83, 519:608]; br = np.full(B.shape[:2], -1)
for i, c in enumerate(GREENS): br[(B[..., :3] == c).all(-1) & (B[..., 3] > 0)] = i
ref = np.sort(br[br >= 0])                                            # the signed bush's own share of each green
# the leaf patches: flat, leaf-sized cells (about 5.5 px apart, a pointed metric so they read as leaves), each one value
pts = []; 
for _ in range(4000):
    p_ = rng.uniform(0, (W, H))
    if all((p_[0] - q_[0]) ** 2 + (p_[1] - q_[1]) ** 2 > 5.4 ** 2 for q_ in pts): pts.append(p_)
pts = np.array(pts)
dd = (np.abs(xx[..., None] - pts[:, 0]) ** 0.75 + np.abs(yy[..., None] - pts[:, 1]) ** 0.75)
cell = dd.argmin(-1)
cm = nd.mean(val, labels=cell + 1, index=np.arange(1, len(pts) + 1)); cm = np.nan_to_num(cm)
v2 = 0.85 * cm[cell] + 0.15 * val + rng.normal(0, 0.06, len(pts))[cell]
q = np.argsort(np.argsort(v2[mask])) / max(mask.sum() - 1, 1)
r = np.zeros((H, W), int); r[mask] = ref[np.clip((q * (len(ref) - 1)).round().astype(int), 0, len(ref) - 1)]
r[(r <= 1) & (occl < 0.3) & mask] = 2                                  # the two deepest greens only in the tucked seams, never as flat holes
# the outline: 1 px void outside the canopy; the last ring inside on the lower right one rank down
out_ring = nd.binary_dilation(mask) & ~mask
can = np.zeros((H, W, 4), np.uint8)
for i, c in enumerate(GREENS): can[mask & (r == i)] = (*c, 255)
lr_in = mask & ~nd.binary_erosion(mask) & ((xx - 44) / 44 + (yy - 40) / 36 > 0.15)
for i, c in enumerate(GREENS):
    sel = lr_in & (r == i); can[sel] = (*GREENS[max(i - 2, 0)], 255)
can[out_ring] = (*VOID, 255)
ring2 = nd.binary_dilation(mask | out_ring) & ~(mask | out_ring)          # 2 px all round, as the bushes: the lit rim must not melt into the lawn
can[ring2] = (*VOID, 255)
# a few pale flecks on the lit crown, as on the bushes
fl = mask & (r >= NG - 2) & (rng.rand(H, W) < 0.035)
can[fl] = (212, 242, 129, 255)                                        # lime, the meadow palette's fleck
assert out_ring.sum() and not (can[0, :, 3].any() and False)
Image.fromarray(can, 'RGBA').save(os.path.join(out, 'c-canopy-88x76.png'))

# the trunk, 32 x 32: in the cell at (8, 16); the canopy's bottom is cell row 34, so trunk rows 18 on show
WOOD = [(63, 40, 17), (65, 50, 45), (75, 48, 35), (95, 70, 49), (122, 88, 61), (154, 115, 75), (166, 141, 101), (194, 163, 118)]
tr = np.zeros((32, 32, 4), np.uint8)
ty_, tx_ = np.mgrid[0:32, 0:32] + .5
cx = 16.0
half = 5.0 + np.clip((ty_ - 22) / 6, 0, 1) ** 2 * 3.5                  # 10 px wide, flaring at the foot
body = (np.abs(tx_ - cx) < half) & (ty_ < 29)
root = ((np.hypot((tx_ - 8.5) / 4.5, (ty_ - 28) / 2.2) < 1) | (np.hypot((tx_ - 23.5) / 4.5, (ty_ - 28.5) / 2.2) < 1))
tm = body | root
u = (tx_ - cx) / half                                                  # -1 left (lit) .. +1 right (shade)
shade_i = np.clip(np.round(4.2 - u * 2.6 - np.clip((ty_ - 24) / 6, 0, 1) * 0.8), 1, 6).astype(int)
bark_n = rng.rand(32, 32)
streak = (np.sin(tx_ * 2.3 + np.sin(ty_ * 0.35) * 1.5) > 0.75)          # vertical bark grooves
shade_i = np.where(streak & (u > -0.6), shade_i - 1, shade_i)
shade_i = np.clip(shade_i, 1, 7)
for i, c in enumerate(WOOD): tr[tm & (shade_i == i)] = (*c, 255)
tr[root & ~body & (tx_ > cx)] = (*WOOD[2], 255)
# contact shade: the bushes' ground-shadow green, a dithered band under the foot
sh = (np.hypot((tx_ - 17) / 12.5, (ty_ - 29.5) / 2.2) < 1) & ~tm
dith = ((tx_.astype(int) + ty_.astype(int)) % 2 == 0) | (np.hypot((tx_ - 17) / 9, (ty_ - 29.5) / 1.5) < 1)
tr[sh & dith] = (52, 93, 52, 255)
o2 = nd.binary_dilation(tm) & ~tm & ~(sh & dith)
tr[o2] = (*VOID, 255)
tr[:, :, 3] = np.where(tr[:, :, 3] > 0, 255, 0)
Image.fromarray(tr, 'RGBA').save(os.path.join(out, 'c-trunk-32.png'))
print('canopy px', int(mask.sum()), 'trunk px', int(tm.sum()))
