"""T-20261016-35 (specs/station-pods-purpose.md §2 and §4, work-queue): the hose, and on the overview the wall gauge and vent, lifted from
room-bench-stage-overview and room-bench-stage-chapter under the same ids. By hand in code, no paid call; nothing new is painted.
The props are found as clear-heading-band.py finds them: local contrast against a 41 px median (> 22), cool (sage, steel, white) or the
brass tips; the boxes stop short of the sand prints (y 104 over them, 124 where none lies, the gauge and vent's at 112) so no print is taken, opened, kept as components of 60 px or more (not the floor's own scuffs), closed and grown 5 px, plus their cast shadow (within 16 px, darker than the floor's filled tone, as stage-pa2/lift-tools.py); only inside the
hand-set boxes below, which start under the wall joint (y 44) and stop short of the dish, its grass and tag, the shelf and the frame. The lifted area is repainted as the stage's own
floor: its tone a harmonic (Laplace) fill from the paint round the mask (coarse to fine, so it meets the signed paint with no step), its grain
the floor's own high frequency from a nearby plain stretch (a shift chosen per pixel so the source is plain floor: low local contrast, warm, no prop, scuff or print within 6 px), feathered 2 px.
Everything outside the mask stays pixel for pixel.
usage: python3 -I lift-props.py overview|chapter IN.png OUT.png [MASK_DEBUG.png]"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
which, src, out = sys.argv[1:4]
BOXES = {   # slice px (x0, y0, x1, y1): where the props may be found
    "overview": [(80, 44, 712, 104), (80, 44, 470, 124), (80, 44, 160, 290), (700, 44, 950, 112)],   # the hose's top run (deeper where no print lies, x < 470) and its drop down the left wall; the gauge and vent
    "chapter": [(80, 44, 400, 124), (80, 44, 160, 290)],                          # the hose (it ends at x 334 since gate batch 1)
}[which]
a = np.asarray(Image.open(src).convert("RGBA")).astype(float); rgb = a[..., :3].copy(); H, W = rgb.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
box = np.zeros((H, W), bool)
for x0, y0, x1, y1 in BOXES: box |= (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
med = nd.median_filter(rgb, size=(41, 41, 1)); dev = np.linalg.norm(rgb - med, axis=-1)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
cool = (g >= r - 4) | ((r - b) < 12)
brass = (r > b + 45) & (r > 120)                                            # the hose's brass tips
props = nd.binary_opening((dev > 22) | cool | brass, iterations=1) & box
lab, n = nd.label(props); sz = nd.sum(props, lab, range(1, n + 1))
props = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 60])
core = nd.binary_dilation(nd.binary_closing(props, iterations=3), iterations=5) & box
# the tone: harmonic fill of the low-passed paint over a mask, coarse to fine
lp = nd.gaussian_filter(rgb, (2, 2, 0))
def harmonic(img, inside, iters):
    t = img.copy()
    for _ in range(iters):
        avg = (np.roll(t, 1, 0) + np.roll(t, -1, 0) + np.roll(t, 1, 1) + np.roll(t, -1, 1)) / 4
        t[inside] = avg[inside]
    return t
def fill_tone(mask):
    small = np.stack([nd.zoom(lp[..., c], 0.25, order=1) for c in range(3)], -1)
    ms = nd.zoom(mask.astype(float), 0.25, order=1) > 0.05
    small = harmonic(np.where(ms[..., None], small.reshape(-1, 3)[~ms.ravel()].mean(0), small), ms, 3000)
    up = np.stack([nd.zoom(small[..., c], (H / small.shape[0], W / small.shape[1]), order=1) for c in range(3)], -1)
    return harmonic(np.where(mask[..., None], up, lp), mask, 500)
# the props' cast shadow: within 16 px of a prop, darker than the floor's filled tone there (as stage-pa2/lift-tools.py)
near = nd.binary_dilation(core, iterations=16) & box
t1 = fill_tone(near); Yl = lambda c: c @ np.array([.2126, .7152, .0722])
shadow = near & (Yl(nd.gaussian_filter(rgb, (3, 3, 0))) < Yl(t1) - 2.5)
mask = nd.binary_dilation(nd.binary_closing(core | shadow, iterations=2), iterations=2) & box
tone = fill_tone(mask)
# the grain: the floor's own high frequency, from the first of these shifts whose source is clean floor
hp = rgb - nd.gaussian_filter(rgb, (6, 6, 0))
clean = (nd.uniform_filter(dev, 9) < 9) & ~cool & ~nd.binary_dilation(mask | (dev > 22), iterations=6)   # plain floor: no prop, scuff or print near
grain = np.zeros_like(rgb); done = ~mask
for dy, dx in ((90, 0), (0, 160), (-90, 0), (0, -160), (90, 160), (160, 0), (180, 0), (0, 320), (180, 160), (240, 0), (240, 320), (300, 0)):
    sy, sx = np.clip(yy + dy, 0, H - 1), np.clip(xx + dx, 0, W - 1)
    ok = ~done & clean[sy, sx] & (sy > 40) & (sx > 70) & (sx < 950)
    grain[ok] = hp[sy[ok], sx[ok]]; done |= ok
w = np.clip(nd.gaussian_filter(mask.astype(float), 1.0) * 1.6, 0, 1); w[mask] = 1.0
w[~nd.binary_dilation(mask, iterations=3)] = 0.0                         # the feather stays within 3 px of the mask
o = rgb * (1 - w[..., None]) + (tone + grain * 0.8) * w[..., None]
a[..., :3] = np.clip(np.round(o), 0, 255)
Image.fromarray(a.astype(np.uint8), "RGBA").save(out)
ch = (a[..., :3] != rgb).any(-1); ys, xs = np.nonzero(ch)
print(which, "px changed", int(ch.sum()), "bbox x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "grain unresolved", int((~done).sum()))
if len(sys.argv) > 4:
    dbg = rgb.copy(); dbg[mask] = dbg[mask] * 0.4 + np.array([255, 0, 255]) * 0.6
    for x0, y0, x1, y1 in BOXES: dbg[y0, x0:x1] = dbg[y1 - 1, x0:x1] = dbg[y0:y1, x0] = dbg[y0:y1, x1 - 1] = (0, 255, 255)
    Image.fromarray(np.clip(dbg, 0, 255).astype(np.uint8)).save(sys.argv[4])
