"""Assemble the Retro Diffusion pixel pass of a 450x532 screen from its six overlapping 256 px tiles (x 0/194, y 0/138/276).
Each pixel is taken from the tile whose centre it is nearest to, cross-faded with the next tile over a 16 px band at the boundary
(halfway between the two centres), then snapped to the extended palette (nearest in CIE Lab) and cleaned of single stray pixels.
Before blending, each tile's colours are matched (mean and spread per channel) to the painting crop it was made from, so tiles
that came back a shade lighter or darker do not leave a rectangle.
usage: python3 -I px-assemble.py TILE_DIR NAME PALETTE_JSON OUT.png SOURCE_SCREEN.png"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
d, name, palj, out, srcp = sys.argv[1:6]
SRC = np.asarray(Image.open(srcp).convert("RGB")).astype(float)
XS, YS, T, F = (0, 194), (0, 138, 276), 256, 16
acc = np.zeros((532, 450, 3)); wsum = np.zeros((532, 450, 1))
for i, x0 in enumerate(XS):
    for j, y0 in enumerate(YS):
        t = np.asarray(Image.open(os.path.join(d, f"px-{name}-{i}{j}-rd.png")).convert("RGB").resize((T, T), Image.NEAREST)).astype(float)
        ref = SRC[y0:y0 + T, x0:x0 + T]
        if ref.shape[:2] == (T, T):
            t = (t - t.mean((0, 1))) / (t.std((0, 1)) + 1e-6) * ref.std((0, 1)) + ref.mean((0, 1))   # the tile to its source's tone
        yy, xx = np.mgrid[0:T, 0:T]; gx, gy = xx + x0, yy + y0
        w = np.ones((T, T))
        for k, xb in enumerate(XS):                    # fade toward the boundary with each neighbour (halfway between centres)
            if xb == x0: continue
            mid = (x0 + xb + T) / 2; s = 1 if xb > x0 else -1
            w *= np.clip(.5 - s * (gx - mid) / F, 0, 1)
        for k, yb in enumerate(YS):
            if abs(yb - y0) != 138: continue
            mid = (y0 + yb + T) / 2; s = 1 if yb > y0 else -1
            w *= np.clip(.5 - s * (gy - mid) / F, 0, 1)
        sl = (slice(y0, min(532, y0 + T)), slice(x0, min(450, x0 + T)))
        hh, ww = sl[0].stop - y0, sl[1].stop - x0
        acc[sl] += t[:hh, :ww] * w[:hh, :ww, None]; wsum[sl] += w[:hh, :ww, None]
rgb = np.clip(acc / np.maximum(wsum, 1e-6), 0, 255)
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    xyz = c @ np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]).T / np.array([.95047, 1, 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
X = lab(rgb).reshape(-1, 3); PL = lab(PAL)
idx = np.concatenate([((X[s:s + 20000, None] - PL[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(X), 20000)]).reshape(532, 450)
# single stray pixels (no 4-neighbour of the same colour) take their neighbours' majority
src = idx.copy()
for y in range(1, 531):
    for x in range(1, 449):
        nb = [src[y - 1, x], src[y + 1, x], src[y, x - 1], src[y, x + 1]]
        if src[y, x] not in nb: idx[y, x] = max(set(nb), key=nb.count)
Image.fromarray(PAL[idx].astype(np.uint8)).save(out)
print(out, "colours", len(np.unique(idx)))
