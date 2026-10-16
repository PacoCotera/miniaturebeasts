"""T-20261016-33 (specs/station-probe-purpose.md §4, work-queue): bench-plate-whole-48x48 and bench-plate-gone-48x48, the signed 32 px plates
redrawn at 48, not scaled up. By hand in code, no paid call.
- The silhouette: the 32's alpha, smoothed (bicubic to 12x, a 0.35 px blur at 32, threshold 0.4 (the 32's ink at alpha >= 128)), so each outline is a clean curve; drawn on an 8x
  supersampled 48 grid and box-reduced, so the edge is anti-aliased at 48's own pixel, not a resampled 32 pixel. The ink grows 1.5x (whole 30x32 ->
  45x48 in the 48 box), centred as in the 32.
- The tones are the 32's own, measured (median over each region): whole body (185, 186, 180), its lit top-right edge (216, 217, 210), its shaded
  left and bottom edges (150, 151, 145) to (96, 97, 92), a soft shade outside down-right (the 32's translucent ring, ground (24, 25, 24) at <= 40 %);
  gone floor (88, 90, 76), its top and left walls in shade (34, 36, 31), its bottom and right lip lit (122, 124, 104), a dark outline outside
  (12, 12, 12) at 50 %, the screw hole (46, 48, 48) with a lit lip below right.
- Rims are drawn at 48's own widths (the whole plate's bevel 1.5 px, the seat's walls 2 px and lip 1 px): crisp, not 1.5x-blurred.
- Light from the top left, matte (the whole plate's edges keep the 32 painting's own measured edge light, see whole()); nothing added (no screws, marks or gloss the 32s do not have).
usage: python3 -I make-plates-48.py SLICES_DIR   (reads the two 32s, writes the two 48s into SLICES_DIR)"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
D = sys.argv[1]; N, SS = 48, 8; G = N * SS                                   # 48 px, 8x supersampled
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
def silhouette(name):
    """the 32's alpha as a smooth curve on the 384 grid (the 48 at 8x): the ink scales 1.5x about the box centre"""
    a = np.asarray(Image.open(os.path.join(D, name + ".png")).convert("RGBA"))[..., 3].astype(float) / 255
    a = nd.gaussian_filter(a, 0.35)
    yy, xx = (np.mgrid[0:G, 0:G] + .5) / G * 32 - .5                     # each 384-grid point in 32-px coordinates
    return nd.map_coordinates(a, [yy, xx], order=3, mode="constant") > 0.4
dn = lambda img: img.reshape(N, SS, N, SS, *img.shape[2:]).mean((1, 3))
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)

def whole():
    m = silhouette("bench-plate-whole-32x32")
    d = nd.distance_transform_edt(m) / SS                                   # px at 48, inside
    h = np.clip(d / 1.5, 0, 1); h = np.sin(h * np.pi / 2)                  # the plate's 1.5 px rounded bevel
    gy, gx = np.gradient(nd.gaussian_filter(h, SS * .3)); gx *= SS; gy *= SS
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    LW = np.array([-0.1, -0.8, 0.6]); LW /= np.linalg.norm(LW)               # the 32's own edge light, measured: top and top-right edges lit (213-221),
    lam = np.clip(n @ LW, 0, 1) / LW[2]                                     # the left edge half (144-178), the bottom dark (86-150); 1 on the flat face
    body = lin([185, 186, 180]); lit = lin([216, 217, 210]); dark = lin([96, 97, 92])
    col = np.where((lam >= 1)[..., None], body + (lit - body) * np.clip((lam - 1) / 0.2, 0, 1)[..., None],
                   dark + (body - dark) * np.clip(lam, 0, 1)[..., None])
    a = dn(m.astype(float)); c = dn(col * m[..., None]) / np.maximum(a, 1e-6)[..., None]
    sh = nd.gaussian_filter(nd.shift(m.astype(float), (1.5 * SS, 1.0 * SS), order=0), SS * 0.9)   # the soft shade down-right
    sa = dn(sh) * 0.40 * (1 - a)
    return compose(c, a, lin([24, 25, 24]), sa)

def gone():
    m = silhouette("bench-plate-gone-32x32")
    yy, xx = (np.mgrid[0:G, 0:G] + .5) / SS
    def sh(dy, dx): return nd.shift(m, (dy * SS, dx * SS), order=0, cval=False)
    top_left_wall = m & ~(sh(1, 1) & sh(2, 2))                              # 2 px: the mask minus itself shifted down-right by 1 and 2
    lip = m & ~sh(-1, -1)                                                   # 1 px: minus itself shifted up-left by 1
    floor, wall, lipc = lin([88, 90, 76]), lin([34, 36, 31]), lin([122, 124, 104])
    col = np.broadcast_to(floor, (G, G, 3)).copy()
    col[lip] = lipc; col[top_left_wall] = wall                              # where they meet, the shadow wins (as the strips' notes)
    hx, hy = 23.25, 25.5                                                    # the screw hole: the 32's (15.5, 17) x 1.5
    r = np.hypot(xx - hx, yy - hy)
    hole_lip = (r <= 2.6) & (r > 1.9) & ((xx - hx) + (yy - hy) > 0.8)
    col[(r <= 2.0) & m] = lin([46, 48, 48]); col[hole_lip & m] = lin([98, 100, 85])
    a = dn(m.astype(float)); c = dn(col * m[..., None]) / np.maximum(a, 1e-6)[..., None]
    ring = nd.binary_dilation(m, iterations=SS) & ~m                         # the dark outline outside, 1 px
    oa = dn(ring.astype(float)) * 0.50 * (1 - a)
    return compose(c, a, lin([12, 12, 12]), oa)

def compose(c, a, under, ua):
    """the plate (premultiplied colour c, coverage a) over its shade or outline (colour under, alpha ua), into straight RGBA"""
    A = a + ua * (1 - a); C = (c * a[..., None] + under * (ua * (1 - a))[..., None]) / np.maximum(A, 1e-6)[..., None]
    out = np.dstack([srgb(C), A * 255]); out[A <= 0] = 0
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)

for name, f in (("bench-plate-whole-48x48", whole), ("bench-plate-gone-48x48", gone)):
    img = f(); Image.fromarray(img, "RGBA").save(os.path.join(D, name + ".png"))
    op = img[..., 3] >= 128; ys, xs = np.nonzero(op)
    print(name, "ink", xs.max() - xs.min() + 1, "x", ys.max() - ys.min() + 1, "at", (xs.min(), ys.min()))
