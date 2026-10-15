"""The map's S2+ pieces, by hand in code on the core 48 (alpha 0/255, never void):
- c-heading-{storm,fog}-16-{n,ne,e,se,s,sw,w,nw}.png: one heading arrow, a bold chevron with a short shaft, for the storm's and the
  fog bank's direction. N is drawn; E/S/W are exact quarter turns; the diagonals are rasterised from the same polygon turned 45 deg
  and kept on whole pixels. Storm: ice face, sky shade side, ink outline. Fog: fog face, mist shade side, slate outline.
- c-rain-48-{a,b}-f{0,1}.png: the rain sheet, a tileable 48x48 streak tile; lean a (1 across per 3 down), lean b (1 per 2, heavier);
  frame 1 is frame 0 moved 4 px down and 2 px along its lean (it tiles, so the loop is seamless); streaks ice with a sky tail.
  c-rain-edge-48x16.png: the sheet's soft edge strip, the same streaks thinning to none across 16 rows (ordered dither).
- c-cloud-fill-48.png: the cloud bank's tileable fill: eleven overlapping dome heaps (radius 10-16, wrapped so the tile repeats),
  over a lower layer (mist), lit from the top left in four bands (stone on the heaps' shaded sides, mist, fog, a lavender lit crest), the band steps
  broken by the 4x4 Bayer so it reads drawn, not blurred.
usage: make-map-pieces.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import pal
P = pal.load(); col = {n: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for n, h in zip(P.names, P.hexes)}
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 + 1 / 32
def save(name, idx, names):
    img = np.zeros(idx.shape + (4,), np.uint8)
    for i, n in enumerate(names):
        m = idx == i + 1; img[m, :3] = col[n]; img[m, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(out, name))
# ---- the heading arrow
ARROW = [(8, 1.5), (14, 8), (10.5, 8), (10.5, 14.5), (5.5, 14.5), (5.5, 8), (2, 8)]     # pointing up, in a 16 box
def raster(poly, ang):
    S = 8; yy, xx = (np.mgrid[0:16 * S, 0:16 * S] + .5) / S
    a = np.radians(ang); c, s = np.cos(a), np.sin(a)
    pts = [(8 + (x - 8) * c - (y - 8) * s, 8 + (x - 8) * s + (y - 8) * c) for x, y in poly]
    inside = np.zeros(xx.shape, bool); n = len(pts)
    for i in range(n):                                              # even-odd fill
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        cond = ((y0 > yy) != (y1 > yy)) & (xx < (x1 - x0) * (yy - y0) / (y1 - y0 + 1e-9) + x0)
        inside ^= cond
    cov = inside.reshape(16, S, 16, S).mean((1, 3)); return cov >= 0.5
def arrow(ang):
    body = raster(ARROW, ang)
    # the shade side: the half away from the top-left light
    yy, xx = np.mgrid[0:16, 0:16]; a = np.radians(ang)
    dirx, diry = np.sin(a), -np.cos(a)                              # the arrow's pointing direction
    perp = (xx - 7.5) * (-diry) + (yy - 7.5) * dirx                 # signed distance across the arrow
    lightside = np.sign((-1) * (-diry) + (-1) * dirx) or 1          # which side faces up-left
    shade = body & (perp * lightside < 0)
    p = np.pad(body, 1); edge = ~body & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
    idx = np.zeros((16, 16), int); idx[body] = 1; idx[shade] = 2; idx[edge] = 3
    return idx
for kind, names in (('storm', ('ice', 'sky', 'ink')), ('fog', ('fog', 'mist', 'slate'))):
    for d, ang in zip(('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'), range(0, 360, 45)):
        save(f'c-heading-{kind}-16-{d}.png', arrow(ang), names)
# ---- the rain sheet
rng = np.random.default_rng(7)
def rain(dx, dy, density, shift):
    idx = np.zeros((48, 48), int)
    for _ in range(density):
        x0, y0 = rng.integers(0, 48, 2); L = int(rng.integers(4, 8))
        for k in range(L):
            x = (x0 + shift[0] - (k * dx) // dy) % 48; y = (y0 + shift[1] + k) % 48
            idx[y, x] = 2 if k == L - 1 else 1                     # the head ice, the tail sky... drawn top to bottom
    return idx
for lean, (dx, dy, dens) in (('a', (1, 3, 26)), ('b', (1, 2, 36))):
    for f in (0, 1):
        rng = np.random.default_rng(11 if lean == 'a' else 13)
        save(f'c-rain-48-{lean}-f{f}.png', rain(dx, dy, dens, (2 * f, 4 * f)), ('sky', 'ice'))
rng = np.random.default_rng(17); e = rain(1, 3, 22, (0, 0))
yy, xx = np.mgrid[0:16, 0:48]; keep = (1 - yy / 16) > BAYER[yy % 4, xx % 4]
edge = np.zeros((16, 48), int); edge[:] = e[:16]; edge[~keep] = 0
save('c-rain-edge-48x16.png', edge, ('sky', 'ice'))
# ---- the cloud fill: overlapping dome heaps on a periodic 48 tile, lit from the top left
r = np.random.default_rng(5); S = 4
yy, xx = (np.mgrid[0:48 * S, 0:48 * S] + .5) / S
h = np.zeros(xx.shape)
for _ in range(11):
    cx, cy = r.uniform(0, 48, 2); rad = r.uniform(10, 16)
    for ox in (-48, 0, 48):
        for oy in (-48, 0, 48):
            d2 = ((xx - cx - ox) ** 2 + (yy - cy - oy) ** 2) / rad ** 2
            h = np.maximum(h, np.sqrt(np.clip(1 - d2, 0, 1)) * rad)
h = np.maximum(h, 2.0)                                              # a lower cloud layer fills the gaps
gy, gx = np.gradient(h); nrm = np.sqrt(gx ** 2 + gy ** 2 + 1)
light = (-gx * -0.6 + -gy * -0.75 + 1 * 0.6) / nrm                 # lambert, light from the top left
crease = h <= 2.0                                                    # where heaps meet: the deep shade between them
v = (light.reshape(48, S, 48, S).mean((1, 3)) - 0.15) / 0.75
yy1, xx1 = np.mgrid[0:48, 0:48]
v = np.clip(v, 0, 1) * 3.999 + (BAYER[yy1 % 4, xx1 % 4] - .5) * 0.7
band = np.clip(np.floor(v), 0, 3).astype(int)
band[crease.reshape(48, S, 48, S).mean((1, 3)) > 0.5] = 1        # the lower layer: mist, the heaps' shade edges stone
save('c-cloud-fill-48.png', band + 1, ('stone', 'mist', 'fog', 'lavender'))
# checks
for f in sorted(os.listdir(out)):
    if f.endswith('.png'):
        im = Image.open(os.path.join(out, f)); a = np.asarray(im.convert('RGBA'))
        assert set(np.unique(a[..., 3])) <= {0, 255}, f; assert P.off_palette(im) == (0, 0), f
print('ok', len([f for f in os.listdir(out) if f.endswith('.png')]))
