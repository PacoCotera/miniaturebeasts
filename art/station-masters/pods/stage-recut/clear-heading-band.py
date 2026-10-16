"""Gate batch 1 (AD, 10-15, 0 MXN): room-bench-stage-chapter cleared for the two-row chapter page's heading band (screen
360-952 x 88-136, slice y 48-96). In x 340-960, from the floor's top edge (slice y 34) to y 116, the floor is repainted: its tone a
harmonic (Laplace) fill from the band's four edges (the wall joint above, the floor below, left and right; the hose's crossing
of the left edge interpolated), its grain from 90 rows lower, mirrored within the floor, no wrap (so no scuff repeats above itself and no wall line is copied), feathered 4 px.
That takes out the hose's top run and nozzle, the gauge and the vent (found by local contrast, used only to move the nozzle and
to mend the left edge). The hose now ends at x 334 in its own brass fitting (the signed nozzle, moved).
usage: python3 -I clear-heading-band.py IN.png OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1:3]
a = np.asarray(Image.open(src).convert('RGBA')).astype(float); rgb = a[..., :3].copy(); H, W = rgb.shape[:2]
X0, X1, Y0, Y1, SH = 340, 960, 34, 116, 90
yy, xx = np.mgrid[0:H, 0:W]
box = (xx >= X0) & (xx < X1) & (yy >= Y0) & (yy < Y1)
med = nd.median_filter(rgb, size=(41, 41, 1))
dev = np.linalg.norm(rgb - med, axis=-1)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
cool = (g >= r - 4) | ((r - b) < 12)                                 # sage, steel, white: never the warm floor
props = (dev > 22) | cool
props = nd.binary_opening(props, iterations=1)
lab, n = nd.label(props & box); sz = nd.sum(props & box, lab, range(1, n + 1))
props = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 60])  # the props, not the floor's own scuffs
mask = nd.binary_dilation(nd.binary_closing(props, iterations=3), iterations=5) & box
# the nozzle to move, from the signed paint
NB = (slice(56, 92), slice(618, 700)); nb = rgb[NB]
noz = props[NB] & (xx[NB] >= 618)
lab2, n2 = nd.label(noz); s2 = nd.sum(noz, lab2, range(1, n2 + 1))
# the fitting: the components right of the hose's last bend (x >= 630)
noz = (lab2 == (int(np.argmax(s2)) + 1)) & (xx[NB] >= 630)                 # the fitting: the largest piece right of the bend
noz = nd.binary_closing(noz, iterations=1)
ys, xs = np.where(noz); patch = nb[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; pm = noz[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
# the band's tone: a harmonic (Laplace) fill of the low-passed paint, its boundary the signed paint just outside the band (the
# wall joint above, the floor below, left and right); where the hose crosses the left edge, the edge is interpolated from the rows
# above and below. Solved coarse to fine, so the fill meets every edge with no step.
lp = nd.gaussian_filter(rgb, (2, 2, 0))
hoseL = props[Y0:Y1, X0 - 12:X0 + 4].any(1)
if hoseL.any():
    idx = np.arange(Y1 - Y0); good = ~nd.binary_dilation(hoseL, iterations=4)
    for c in range(3): lp[Y0:Y1, X0 - 1, c] = np.interp(idx, idx[good], lp[Y0:Y1, X0 - 1, c][good])
inside = box.copy()
def harmonic(img, inside, iters):
    t = img.copy()
    for _ in range(iters):
        avg = (np.roll(t, 1, 0) + np.roll(t, -1, 0) + np.roll(t, 1, 1) + np.roll(t, -1, 1)) / 4
        t[inside] = avg[inside]
    return t
sub = lp[Y0 - 4:Y1 + 4, X0 - 4:X1 + 4]; ins = inside[Y0 - 4:Y1 + 4, X0 - 4:X1 + 4]
small = np.stack([nd.zoom(sub[..., c], 0.25, order=1) for c in range(3)], -1); ins_s = nd.zoom(ins.astype(float), 0.25, order=0) > 0.5
small = harmonic(small, ins_s, 3000)
up = np.stack([nd.zoom(small[..., c], (sub.shape[0] / small.shape[0], sub.shape[1] / small.shape[1]), order=1) for c in range(3)], -1)
init = np.where(ins[..., None], up, sub)
sol = harmonic(init, ins, 400)
tone = rgb.copy(); tone[Y0 - 4:Y1 + 4, X0 - 4:X1 + 4] = sol
GA, GB = X0 + 8, X1 - 16                                               # the grain's source stays on the floor, off both walls
sx = np.round(GB - 1 - (np.clip(xx, X0, X1 - 1) - X0) * (GB - 1 - GA) / (X1 - 1 - X0)).astype(int)   # mirrored, stretched onto the floor, no wrap
mir = rgb[np.clip(yy + SH, 0, H - 1), sx]
grain = mir - nd.gaussian_filter(mir, (6, 6, 0))
fill = tone + grain * 0.8
wx = np.clip(np.minimum((xx - X0) / 4, (X1 - 1 - xx) / 4), 0, 1); wy = np.clip((Y1 - 1 - yy) / 4, 0, 1)
w = np.where(box, np.minimum(wx, wy), 0.0); w = w * w * (3 - 2 * w)
o = rgb * (1 - w[..., None]) + fill * w[..., None]
# the fitting, cut by hand from the signed nozzle: steel collar 630-655 x 63-83, second collar 655-668 x 65-81, pin 668-681 x 69-78,
# brass tip 681-686 x 71-76 (slice px); set at the hose's new end (its left edge on x 330, centred on the hose there), with a soft
# contact shade below it as the original's
parts = [(630, 655, 63, 84), (655, 668, 65, 82), (668, 681, 69, 79), (681, 687, 71, 77)]
pm = np.zeros((22, 57), bool)
for x0_, x1_, y0_, y1_ in parts: pm[y0_ - 62:y1_ - 62, x0_ - 630:x1_ - 630] = True
patch = rgb[62:84, 630:687]
hc = 92                                                      # the hose at x 330: its lit top near y 84, its underside near y 100 (measured)
ty, tx = hc - 12, 330
shade = nd.gaussian_filter(np.pad(pm, 4).astype(float), 2.0)[4:-4, 4:-4]
sh = np.zeros((H, W)); sh[ty + 4:ty + 4 + 22, tx + 3:tx + 3 + 57] = shade
o = o * (1 - 0.35 * sh[..., None])
sub = o[ty:ty + 22, tx:tx + 57]; sub[pm] = patch[pm]; o[ty:ty + 22, tx:tx + 57] = sub
a[..., :3] = np.clip(np.round(o), 0, 255)
Image.fromarray(a.astype(np.uint8), 'RGBA').save(out)
print('fitting at', (tx, ty), 'hose centre', hc)
