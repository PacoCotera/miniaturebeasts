"""Fix 5 Create CA1: the Create tray relit under the same id, chamber-back-400x320 (at 312, 232), by hand in code, 0 MXN.
(a) One key light from the top left: the tray's back wall gains a soft gradient, x1.20 at its top-left corner to x0.84 at the
    bottom-right, in linear light (the frame untouched).
(b) A floor plane, local rows 248-303 (screen 480-535): the back wall meets it in a soft 2 px crease at row 248; the floor is
    the wall's own paint lifted to a warmer, lighter plane that brightens toward the viewer (x1.10 at the back to x1.28 at the
    front), with the old dark seam band (rows 296-303) folded into it so the near feet (screen 536) stand on floor; a 2 px
    contact shade stays at the very front edge under the rail.
(c) A pool under the founder on that floor: an ellipse centred on local (200, 280), 150 x 26 px half-axes, a warm lift
    (x1.70 at the centre, smoothstep to 1 at the edge), the brightest area of the bench at its size.
Matte; no specular, no glow. usage: relight.py SRC OUT"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float); H, W = a.shape[:2]
L = lin(a[..., :3]); yy, xx = np.mgrid[0:H, 0:W].astype(float)
# the interior: the wall's own flat paint (the frame is the light sand ring)
lum = a[..., :3] @ [.2126, .7152, .0722]
inner = nd.binary_erosion((lum < 120) & (a[..., 3] > 250), iterations=1); inner = nd.binary_fill_holes(inner)
ys, xs = np.where(inner); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
FLOOR0, FLOOR1 = 248, 303
g = np.ones((H, W))
# (a) key light on the wall
t = np.clip(((xx - x0) / (x1 - x0)) * .5 + ((yy - y0) / (FLOOR0 - y0)) * .5, 0, 1)
g = np.where(inner & (yy < FLOOR0), 1.20 - 0.36 * t, g)
# (b) floor plane
wall_ref = L[(yy > 150) & (yy < 240) & inner].mean(0)
floor = inner & (yy >= FLOOR0) & (yy <= FLOOR1)
f = np.clip((yy - FLOOR0) / (FLOOR1 - FLOOR0), 0, 1)
base = wall_ref[None, None, :] * np.array([1.06, 1.0, 0.92])[None, None, :]
grain = L - nd.gaussian_filter(L, (3, 3, 0))
newL = np.where(floor[..., None], base * (1.10 + 0.18 * f)[..., None] + grain * 0.6, L)
crease = inner & (np.abs(yy - FLOOR0) <= 1); newL[crease] *= 0.88
front = inner & (yy >= FLOOR1 - 1) & (yy <= FLOOR1); newL[front] *= 0.80
# (c) the pool
d = np.sqrt(((xx - 200) / 150) ** 2 + ((yy - 280) / 26) ** 2); s = np.clip(1 - d, 0, 1); s = s * s * (3 - 2 * s)
pool = 1 + 0.70 * s
out = newL * np.where(floor, pool, g)[..., None]
o = a.copy(); o[..., :3] = np.where(inner[..., None], np.round(srgb(out)), a[..., :3])
Image.fromarray(o.astype(np.uint8), 'RGBA').save(sys.argv[2])
Y = lin(o[..., :3]) @ [.2126, .7152, .0722]
pm = s > 0.5; print('interior', (x0, y0, x1, y1), 'pool mean Y %.4f, wall mean %.4f, floor back %.4f' % (Y[pm & floor].mean(), Y[inner & (yy < FLOOR0)].mean(), Y[floor & (yy < 256)].mean()))
