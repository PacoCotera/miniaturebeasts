"""Fix 2: the device-material plate, one kit for every module and panel. A plate is the housing's own construction at module
scale, cut from the signed stage housing (room-bench-stage): a 1 px hairline (#3d434b), a rounded sage bezel in the housing's
sage ramp lit from the top left, and an inset well floored with the stage wall's own paint (its grain, high-passed from a bare
stretch of the signed wall), graded down so the floor's mean luminance matches today's panel (#2b3038, relative luminance
0.029): every text colour placed on the panels keeps its contrast. Inside the well: a soft inner shade on the top and left
walls, a 1 px lit lip on the bottom and right. Matte; no gloss, no glow. Any size; the id is plate-device-<w>x<h>.
The well variant (--well, id plate-well-<w>x<h>) is the same recess with no bezel, for the slots set into a plate (pose
tiles, companion slots): the hairline, the floor 15 % darker, the inner shade and the lit lip.
The shown well (--well --shown, id plate-well-<w>x<h>-shown) is the well one step up: its floor x 1.89 in luminance (measured), the step
today's hairline tile gives over the panel ((61,67,75) over (43,48,56)); never lit, gold or teal.
usage: make-device-plate.py W H OUT.png [--bezel N] [--radius R] [--well [--shown]]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, '..', 'slices', 'room-bench-stage.png')

def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
Y = lambda c: c @ np.array([.2126, .7152, .0722])

def rrect_sd(W, H, x0, y0, x1, y1, r):
    """signed distance (px, positive inside) to a rounded rectangle, at pixel centres"""
    yy, xx = np.mgrid[0:H, 0:W] + .5
    cx = np.clip(xx, x0 + r, x1 - r); cy = np.clip(yy, y0 + r, y1 - r)
    inside_core = (xx >= x0 + r) & (xx <= x1 - r) | (yy >= y0 + r) & (yy <= y1 - r)
    d_edge = np.minimum.reduce([xx - x0, x1 - xx, yy - y0, y1 - yy])
    d_corner = r - np.hypot(xx - cx, yy - cy)
    return np.where(inside_core, d_edge, d_corner)

def plate(W, H, bezel=5, radius=6, well=False, shown=False):
    st = np.asarray(Image.open(STAGE).convert('RGB')).astype(float)
    wall = st[120:184, 650:778]                                     # the flattest bare stretch of the signed wall (low-frequency sd 0.9)
    grain = np.clip(wall - nd.gaussian_filter(wall, (5, 5, 0)), -6, 6)
    gt = np.tile(grain, (H // grain.shape[0] + 2, W // grain.shape[1] + 2, 1))[:H, :W]
    wall_mean = lin(wall.reshape(-1, 3).mean(0))
    floor = wall_mean * (0.029 / Y(wall_mean)) * (0.85 if well else 1) * (1.89 if shown else 1)   # the wall's own hue at today's panel luminance
    if well: bezel = 1
    sage_mid, sage_shade = lin((136, 142, 112)), lin((98, 102, 79))   # the housing's sage ramp, measured on the signed stage
    outer = rrect_sd(W, H, 0, 0, W, H, radius)
    inner = rrect_sd(W, H, bezel, bezel, W - bezel, H - bezel, max(radius - bezel // 2, 2))
    yy, xx = np.mgrid[0:H, 0:W] + .5
    # the bezel: a rounded rail (height sin(pi t) across its width), lambert from the top left, in the housing's sage shade range
    t = np.clip(outer / max(bezel, 1), 0, 1)
    h = np.where(inner > 0, 0, np.sin(np.pi * t) * bezel * 0.8)
    gy, gx = np.gradient(nd.gaussian_filter(h, 0.6))
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    Lv = np.array([-0.55, -0.62, 0.78]); Lv /= np.linalg.norm(Lv)
    k = np.clip((n @ Lv) / Lv[2], 0, 1.35)
    bez = sage_shade * (0.42 + 0.78 * k)[..., None] * 1.12
    bez = bez * (1.04 - 0.08 * (xx / W * .5 + yy / H * .5))[..., None]
    # the well: the floor, an inner shade on the top and left walls, a 1 px lit lip bottom and right
    dist_top = yy - bezel; dist_left = xx - bezel
    shade = 1 - 0.55 * np.exp(-np.clip(np.minimum(dist_top, dist_left), 0, None) / 2.2)
    wellc = floor * shade[..., None] * (1.07 - 0.14 * (xx / W * .5 + yy / H * .5))[..., None]
    lip = (inner > 0) & (inner <= 1.0) & ((xx > W - bezel - 2) | (yy > H - bezel - 2))
    wellc[lip] = sage_mid * 0.55
    rgb = np.where((inner > 0)[..., None], wellc, bez)
    out = srgb(rgb) + gt * np.where((inner > 0), 0.55, 0.35)[..., None]
    hair = (outer > 0) & (outer <= 1.0); out[hair] = (61, 67, 75)
    a = np.clip(outer + 0.5, 0, 1) * 255
    img = np.zeros((H, W, 4)); img[..., :3] = np.clip(np.round(out), 0, 255); img[..., 3] = np.round(a)
    img[img[..., 3] == 0, :3] = 0
    return Image.fromarray(img.astype(np.uint8), 'RGBA')

if __name__ == "__main__":
    W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    bz = int(sys.argv[sys.argv.index('--bezel') + 1]) if '--bezel' in sys.argv else 5
    rd = int(sys.argv[sys.argv.index('--radius') + 1]) if '--radius' in sys.argv else 6
    plate(W, H, bz, rd, '--well' in sys.argv, '--shown' in sys.argv).save(out)
