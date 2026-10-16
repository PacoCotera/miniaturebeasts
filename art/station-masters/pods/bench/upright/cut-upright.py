"""Probe rework (AD, 10-15): the upright Probe in its vertical cradle, three pictures cut with ONE transform so they stay aligned:
bench-probe-upright-t1-288x432 (rw-probe-t1-cradle), -t2- (compose-t2.py), bench-cradle-upright-empty-288x432 (rw-probe-cradle-empty).
Ground: the grey wall and the painted wooden desk, each flooded from the picture's border on its own (grey: within 7 of the wall's own colour,
so the near-white plates stay; wood: orange-brown, R - G > 0.7 (G - B), which the device's sand plates are not), so the brass contacts stay. The desk's painted shadow goes with the desk; a contact shadow
is drawn in the bench's shadow ink #1e1a22 under the base (an ellipse 92 % of the base's width, core alpha 120, falling off), so
the cradle sits on the stage's own floor. The union of the three subjects' boxes is scaled to fit 284 x 420 and set bottom-centred
with its base on row 424; rows 0-3 stay empty (the bench's inkTop rule).
Small gaps between plates, arms and body are closed and painted as a shadowed recess (40, 40, 38), not left as holes.
usage: python3 -I cut-upright.py T1.jpg T2.png EMPTY.jpg OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
t1, t2, em, out = sys.argv[1:5]; os.makedirs(out, exist_ok=True)
def mask(path):
    r = np.asarray(Image.open(path).convert('RGB')).astype(float); R, G, B = r[..., 0], r[..., 1], r[..., 2]
    wall = np.median(r[:30].reshape(-1, 3), axis=0)
    grey = np.linalg.norm(r - wall, axis=-1) <= 7                     # the wall's flat paint only: the near-white plates (164, 164, 160) are not it
    wood = ((R - B) > 35) & ((R - G) > 16) & ((G - B) > 6) & (R < 178) & ((R - G) > 0.7 * (G - B))
    bg = np.zeros(grey.shape, bool)
    for cand in (grey, wood):                                   # each flooded from the border on its own
        lab, k = nd.label(cand); border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg |= np.isin(lab, list(border))
    # the wall-desk seam line and the desk's darkest shade, between the two grounds
    seam = nd.binary_dilation(bg, iterations=2) & ~bg & (r.mean(-1) < 140) & ((R - B) > 15)
    bg |= seam
    bg = nd.binary_closing(bg, iterations=1)
    fg = ~bg; fg = nd.binary_opening(fg, iterations=2)
    band = np.zeros(fg.shape, bool); band[760:910] = True                  # the wall-desk seam behind the base: thin horizontal slivers go
    fg = np.where(band, nd.binary_opening(fg, structure=np.ones((7, 1))), fg)
    l2, k2 = nd.label(fg); sz = nd.sum(fg, l2, range(1, k2 + 1)); fg = nd.binary_fill_holes(l2 == (np.argmax(sz) + 1))
    # small gaps between the plates, the arms and the body (wall paint seen through them) read as torn holes: they are closed
    # (closing 6 px, only where the closed mask is inside the body's hull rows) and painted as a shadowed recess
    closed = nd.binary_closing(fg, iterations=6) & ~fg
    gaps = closed & nd.binary_erosion(nd.binary_fill_holes(nd.binary_closing(fg, iterations=14)), iterations=8)
    r = r.copy(); r[gaps] = (40, 40, 38); fg = fg | gaps
    return r, fg
items = [(t1, 'bench-probe-upright-t1-288x432'), (t2, 'bench-probe-upright-t2-288x432'), (em, 'bench-cradle-upright-empty-288x432')]
data = [(mask(p), n) for p, n in items]
x0 = min(np.where(m)[1].min() for (r, m), n in data); x1 = max(np.where(m)[1].max() for (r, m), n in data) + 1
y0 = min(np.where(m)[0].min() for (r, m), n in data); y1 = max(np.where(m)[0].max() for (r, m), n in data) + 1
sc = min(284 / (x1 - x0), 420 / (y1 - y0)); W, H = round((x1 - x0) * sc), round((y1 - y0) * sc)
ox, oy = (288 - W) // 2, 424 - H
for (r, m), n in data:
    soft = nd.gaussian_filter(m.astype(float), 1.0)
    sub = np.dstack([r, soft * 255])[y0:y1, x0:x1]
    pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255, sub[..., 3:]])
    rr = np.asarray(Image.fromarray(np.clip(np.round(pm), 0, 255).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)).astype(float)
    al = rr[..., 3:] / 255; rgb = np.where(al > 0, rr[..., :3] / np.maximum(al, 1e-6), 0)
    o = np.zeros((432, 288, 4))
    # the contact shadow under the base: find the base's bottom row width in the placed subject
    placed_a = np.zeros((432, 288)); placed_a[oy:oy + H, ox:ox + W] = al[..., 0]
    rows = np.where(placed_a.max(1) > 0.5)[0]; by = rows.max(); xs = np.where(placed_a[by - 6] > 0.5)[0]
    cx, hw = (xs.min() + xs.max()) / 2 + 4, (xs.max() - xs.min()) * 0.46 + 2
    yy, xx = np.mgrid[0:432, 0:288] + .5
    d = np.hypot((xx - cx) / hw, (yy - (by - 1)) / 7.5)
    sha = np.clip(1 - d, 0, 1) ** 1.5 * 120
    o[..., :3] = (30, 26, 34); o[..., 3] = sha
    fa = placed_a[..., None]; frgb = np.zeros((432, 288, 3)); frgb[oy:oy + H, ox:ox + W] = rgb
    out_a = fa[..., 0] * 255 + o[..., 3] * (1 - fa[..., 0])
    out_rgb = (frgb * fa * 255 + o[..., :3] * o[..., 3:] * (1 - fa)) / np.maximum(out_a[..., None], 1e-6)
    res = np.dstack([out_rgb, out_a]); res[:4] = 0; res[res[..., 3] < 2] = 0
    solid = res[..., 3] > 128; lab, k = nd.label(solid); sz = nd.sum(solid, lab, range(1, k + 1))
    stray = solid & ~np.isin(lab, [int(np.argmax(sz)) + 1]); res[stray] = 0          # specks of desk the key left, apart from the cradle
    Rr, Gg, Bb = res[..., 0], res[..., 1], res[..., 2]
    woodp = (res[..., 3] > 0) & ((Rr - Bb) > 30) & ((Rr - Gg) > 12) & ((Rr - Gg) > 0.7 * (Gg - Bb)) & (Rr < 175)
    outside = nd.binary_dilation(res[..., 3] < 8, iterations=1)
    lw, kw = nd.label(woodp); touch = set(np.unique(lw[outside & woodp])) - {0}
    res[np.isin(lw, list(touch))] = 0                                               # desk wood joined to the outside (never the eggs inside)
    Image.fromarray(np.clip(np.round(res), 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, n + '.png'))
print('box', (x0, y0, x1, y1), 'scale', round(sc, 4), 'placed', (ox, oy, W, H))
