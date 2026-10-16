# Gate batch 1, AR6: cargo-bay-shut-report-976x304, the shut door for the report state, cut by hand from the signed door
# (slices/cargo-bay-shut-976x304.png). Between slice x 200 and 776 (screen 224-800) the slats give way to one plain sage
# panel: the panel is the slats' own face tone with the grooves taken out (a 31 px vertical median, then a soft blur), so the
# door's light (warm top left, cooler lower right) runs on across it. An 8 px moulded frame stands round the panel (stiles at
# x 192-200 and 776-784, rails at y 29-37 and 275-283): a rounded rail lit from the top left, casting a 3 px shade into the
# panel below its top rail and right of its left stile. The roll box above y 29 and the sill below y 283 are untouched. No text.
# usage: python3 -I make-report-door.py SLICES_DIR OUT.png
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]
door = np.asarray(Image.open(sl + '/cargo-bay-shut-976x304.png').convert('RGB')).astype(float)
H, W = door.shape[:2]
X0, X1, Y0, Y1, F = 200, 776, 29, 283, 8                    # the panel (x0..x1, y0..y1) and the frame width outside it
face = nd.median_filter(door, size=(31, 1, 1))               # each column's slat face, the grooves gone
face = nd.gaussian_filter(face, (4, 4, 0))
rng = np.random.RandomState(11)
grain = nd.gaussian_filter(rng.normal(0, 1, (H, W)), 0.7) * 1.4
yy, xx = np.mgrid[0:H, 0:W].astype(float)
a = door.copy()
# the frame: a rounded rail of height h, outside the panel's edge, lambert from the top left
fx0, fx1, fy0, fy1 = X0 - F, X1 + F, Y0, Y1                  # outer edge of the frame (rails sit inside y0..y1, stiles outside x0..x1)
inX = (xx >= fx0) & (xx < fx1); inY = (yy >= fy0) & (yy < fy1)
dl, dr = xx - fx0 + .5, fx1 - xx - .5                        # distance from the frame's outer left / right edge
dt, db = yy - fy0 + .5, fy1 - yy - .5
# the panel's inner edge: x in [X0, X1), y in [Y0 + F, Y1 - F)
pin = (xx >= X0) & (xx < X1) & (yy >= Y0 + F) & (yy < Y1 - F)
frame = inX & inY & ~pin
d_in = np.minimum.reduce([np.where(xx < X0, dl, 99), np.where(xx >= X1, dr, 99), np.where(yy < Y0 + F, dt, 99), np.where(yy >= Y1 - F, db, 99)])
t = np.clip(d_in / F, 0, 1)
h = np.where(frame, np.sin(np.pi * t) * 3.0, 0)
h = nd.gaussian_filter(h, 0.5)
gy, gx = np.gradient(h)
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Lv = np.array([-0.55, -0.62, 0.78]); Lv /= np.linalg.norm(Lv)
k = (n @ Lv) / Lv[2]
base = face
a[frame] = (base * np.clip(k, 0.45, 1.45)[..., None] * 0.98)[frame]
# 1 px dark joint where the slats butt into the stiles (the frame's outer edge)
joint = inY & (((xx == fx0) | (xx == fx1 - 1)) | ((yy == fy0) & inX) | ((yy == fy1 - 1) & inX))
a[joint] = face[joint] * 0.42
# the panel: plain face tone, quiet grain, the frame's shade on its top and left
pd = np.minimum(np.where(pin, xx - X0 + .5, 99), np.where(pin, yy - (Y0 + F) + .5, 99))
sh = 1 - 0.20 * np.exp(-np.clip(pd, 0, None) / 1.6)
a[pin] = (face * sh[..., None] + grain[..., None])[pin]
Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGB').convert('RGBA').save(out)
p = a[Y0 + F:Y1 - F, X0:X1].reshape(-1, 3).mean(0); print('panel mean', p.round(1))
