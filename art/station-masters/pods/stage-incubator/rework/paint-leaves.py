"""T-20261015-01: leaf-full-16x20 and leaf-empty-16x20 repainted as small rendered leaves (were flat hand-pixelled shapes), the same
ids and size and the same silhouette and lean (an ovate pointed leaf, tip upper right, stem lower left). Painted at 8x and reduced:
- full: a domed leaf blade (height = sqrt of the distance inside its outline), lambert-lit from the top left in the leaf ramp
  (forest in shade, #84ae78 sage at mid, a pale sprout on the lit edge), a pressed centre vein (a groove: darker on its lit side,
  a hairline highlight on the far side), the stem in bark-green.
- empty: the same leaf as a shallow recess pressed into the wall (its floor a darkened wall tone, its top-left inner wall in shade
  and its lower-right lip catching the light): the place of a leaf still to grow, not a darker sticker.
usage: python3 -I paint-leaves.py SLICES_DIR [OUT_DIR]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else sl
S = 8; W, H = 16, 20
yy, xx = (np.mgrid[0:H * S, 0:W * S] + .5) / S
# the leaf: an ellipse along an axis leaning 40 degrees clockwise from vertical, pointed at both ends
cx, cy, ang = 8.6, 9.2, np.radians(40)
u = (xx - cx) * np.sin(ang) - (yy - cy) * np.cos(ang)            # along the leaf, + toward the tip (upper right)
v = (xx - cx) * np.cos(ang) + (yy - cy) * np.sin(ang)            # across
Lh, Wh = 9.4, 4.6
half = Wh * np.clip(1 - (u / Lh) ** 2, 0, 1) ** 0.75 * (1 - 0.18 * (u / Lh))
blade = np.abs(v) <= half
d = np.where(blade, half - np.abs(v), 0)
h = np.sqrt(np.clip(d, 0, None)) * 1.4
vein = blade & (np.abs(v) < 0.33) & (u < Lh * 0.85)
h = np.where(vein, h - 0.55, h)
stem = (u < -Lh + 0.4) & (u > -Lh - 3.2) & (np.abs(v + 0.12 * (u + Lh) ** 2) < 0.55)
gy, gx = np.gradient(nd.gaussian_filter(h, 2.0)); n = np.dstack([-gx * S, -gy * S, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Lv = np.array([-0.55, -0.62, 0.56]); Lv /= np.linalg.norm(Lv); lam = np.clip(n @ Lv, 0, 1)
FOREST, SAGE, SPROUT = np.array([58, 92, 62.]), np.array([132, 174, 120.]), np.array([196, 222, 160.])
t = np.clip(lam * 1.25 - 0.1, 0, 1)
col = np.where((t < 0.6)[..., None], FOREST + (SAGE - FOREST) * (t / 0.6)[..., None], SAGE + (SPROUT - SAGE) * ((t - 0.6) / 0.4)[..., None])
col = np.where(vein[..., None], col * 0.8, col)
col = np.where(stem[..., None], np.array([92, 104, 66.]) * (0.7 + 0.5 * lam[..., None]), col)
mask = (blade | stem).astype(float)
def reduce(rgb, a):
    pm = np.dstack([rgb * a[..., None], a]).reshape(H, S, W, S, 4).mean((1, 3))
    al = pm[..., 3]; c = np.where(al[..., None] > 0, pm[..., :3] / np.maximum(al[..., None], 1e-6), 0)
    return np.dstack([c, al * 255])
full = reduce(col, mask)
# empty: a recess in the wall: floor dark wall tone, inner shade top-left, lit lip bottom-right
WALL = np.array([62, 54, 47.])
inside = blade.astype(float); dist_in = nd.distance_transform_edt(blade) / S
dirx, diry = np.gradient(nd.gaussian_filter(inside, 3.0)); face = -(diry * -0.62 + dirx * -0.55)   # +: wall faces the light
ecol = WALL[None, None] * 0.82 + np.zeros((H * S, W * S, 3))
rim = blade & (dist_in < 1.1)
ecol = np.where((rim & (face > 0))[..., None], WALL * 1.45, ecol)
ecol = np.where((rim & (face <= 0))[..., None], WALL * 0.55, ecol)
empty = reduce(ecol, blade.astype(float))
for n_, a in (('leaf-full-16x20', full), ('leaf-empty-16x20', empty)):
    Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, n_ + '.png'))
