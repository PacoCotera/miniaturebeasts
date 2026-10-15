"""A1, the cloud set (AD, 10-15, 0 MXN), by hand in code on the core 48 (alpha 0/255), in the fill's own language (c-cloud-fill-48:
dome heaps lit in four bands, stone / mist / fog / lavender, the steps broken by the 4x4 Bayer), with a 1 px slate line where a
cloud edge meets anything that is not cloud. Lavender is cloud only. Every piece is made at the three map scales cs = 72, 48, 26.
Pieces (cs is the cell; LAP = cs // 9, so 8 px at 72, 5 at 48, 2 at 26: never more than 8 px over a seen cell, spec C.5):
- c-cloud-heap-{cs}-{1..8}: free heaps, lit from the top left, each with its own soft cast shade (stone, checkered) to its lower
  right on the fill. Sizes at 48: 48x32, 56x36, 64x40, 72x48, 88x56, 96x56, 112x64, 128x72; at 72 the same (the spec's range);
  at 26 half of them, rounded to even.
- c-cloud-rim-{cs}-{n,e,s,w}-{a,b}: two variants per facing, the edge band of an unknown cell whose n/e/s/w neighbour is seen: a row of heaps lit toward the
  island (the island direction blended with the top-left light), its crest lavender on the island side, its outer edge a slate
  line that laps LAP px over the seen cell. Size cs x (cs * 0.6 + LAP) (n/s), rotated for e/w; drawn at the cell's edge minus LAP.
- c-cloud-rim-{cs}-out-{ne,nw,se,sw}: the outer corner, where the cell has seen land on both sides: the rim turned round the
  corner, (cs * 0.62 + LAP) square, drawn at the corner minus LAP on both axes.
- c-cloud-rim-{cs}-in-{ne,nw,se,sw}: the inner corner, where the cell's two neighbours on those sides are cloud but the diagonal
  is seen: three heaps closing the notch, (cs * 0.42 + LAP) square, lapping LAP into the seen diagonal.
- c-cloud-lap-{cs}-{n,e,s,w}-{a,b}: the lapping-edge pieces, two per facing: a short run of heaps that sits on a rim and overhangs
  the seen cell by LAP more, so the island's edge is uneven. Width cs*0.6 (a) or cs*0.4 (b), height LAP*2 + cs/4.
usage: make-cloud-set.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
import pal
P = pal.load(); col = {n: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for n, h in zip(P.names, P.hexes)}
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 + 1 / 32
NAMES = ('stone', 'mist', 'fog', 'lavender', 'slate')
SS = 4
def render(W, H, domes, light, line_side='all', shade_drop=None, crease=1.6, flat=1.0):
    """domes: (cx, cy, r) in px. light: (lx, ly) on screen, pointing from the surface toward the light. Returns an index image
    (0 clear, 1..4 bands, 5 slate)."""
    yy, xx = (np.mgrid[0:H * SS, 0:W * SS] + .5) / SS
    h = np.full(xx.shape, -1.0)
    for cx, cy, r in domes:
        d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / r ** 2
        h = np.maximum(h, np.where(d2 < 1, np.sqrt(np.clip(1 - d2, 0, 1)) * r * flat, -1))
    inside = h >= 0
    hh = np.where(inside, h, 0)
    gy, gx = np.gradient(hh); nrm = np.sqrt(gx ** 2 + gy ** 2 + 1)
    lx, ly = light; ln = np.hypot(lx, ly)
    lam = ((-gx) * lx / ln * 0.8 + (-gy) * ly / ln * 0.8 + 0.55) / nrm
    v = lam.reshape(H, SS, W, SS).mean((1, 3)); ins = inside.reshape(H, SS, W, SS).mean((1, 3)) >= 0.5
    y1, x1 = np.mgrid[0:H, 0:W]
    v = np.clip((v - 0.15) / 0.75, 0, 1) * 3.999 + (BAYER[y1 % 4, x1 % 4] - .5) * 0.7
    band = np.clip(np.floor(v), 0, 3).astype(int) + 1
    # creases: a pixel lower than a neighbour heap by a step reads as the shade between heaps
    hs = hh.reshape(H, SS, W, SS).max((1, 3))
    lo = (nd.maximum_filter(hs, size=3) - hs) > crease
    band[lo & ins] = np.minimum(band[lo & ins], 1)
    idx = np.where(ins, band, 0)
    edge = ins & ~nd.binary_erosion(ins, border_value=1)          # a dome cut by the canvas runs on into cloud: no line there
    if line_side == 'all': idx[edge] = 5
    elif line_side is not None:
        sl = edge & line_side(y1, x1); idx[sl] = 5; idx[edge & ~sl] = 1      # the island side slate, the cloud side a stone crease
    if shade_drop:
        dx, dy = shade_drop
        sh = np.roll(np.roll(ins, dy, 0), dx, 1); sh[:dy, :] = False; sh[:, :dx] = False
        cast = sh & ~ins & ((x1 + y1) % 2 == 0)
        idx[cast] = 1
    return idx
def save(name, idx):
    img = np.zeros(idx.shape + (4,), np.uint8)
    for i, n in enumerate(NAMES):
        m = idx == i + 1; img[m, :3] = col[n]; img[m, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(out, name + '.png'))
TL = (-0.6, -0.75)
ROT = {'n': 0, 'w': 1, 's': 2, 'e': 3}                              # np.rot90 counter-clockwise turns from the n piece
TOWARD = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
for cs in (72, 48, 26):
    LAP = cs // 9; rng = np.random.default_rng(cs)
    # ---- heaps
    sizes = [(48, 32), (56, 36), (64, 40), (72, 48), (88, 56), (96, 56), (112, 64), (128, 72)]
    if cs == 26: sizes = [(w // 2 + (w // 2) % 2, h // 2 + (h // 2) % 2) for w, h in sizes]
    for k, (w, h) in enumerate(sizes):
        m = 3 if cs != 26 else 2                                  # room for the cast shade
        n = 3 + k // 2; domes = []
        for j in range(n):                                        # a back row higher, a front row lower and wider
            t = (j + .5) / n; r = rng.uniform(0.26, 0.36) * h
            cx = m + r * 0.9 + t * (w - 2 * m - 1.8 * r) + rng.uniform(-1, 1) * 2
            cy = h * 0.42 + rng.uniform(-1, 1) * h * 0.08
            domes.append((cx, min(cy, h - m - r), r))
        for j in range(max(2, n - 1)):
            t = (j + .5) / max(2, n - 1); r = rng.uniform(0.3, 0.4) * h
            domes.append((m + r + t * (w - 2 * m - 2 * r), h - m - r - 0.5, r))
        domes.append((w * 0.5 + rng.uniform(-1, 1) * w * 0.1, h * 0.36, 0.42 * h))
        domes = [(cx, max(cy, r + 1), r) for cx, cy, r in domes]
        save(f'c-cloud-heap-{cs}-{k + 1}', render(w, h, domes, TL, 'all', (2 if cs != 26 else 1, 2 if cs != 26 else 1)))
    # ---- rims: made as the n piece, turned for the others. One row of big heaps whose tops reach the lap's outer line unevenly,
    # every heap inside the band (so no edge is cut), and a joint heap centred on each of the cell's two corners, the same in every
    # variant, so neighbouring rims meet as one heap. The light: the island side blended with the top-left light.
    RJ = cs * 0.2                                                     # the joint heap, low, so the run's tops vary
    def billow(cx, cy, r):                                            # a heap of three, its top where a dome of r would reach
        return [(cx, cy - 0.2 * r, 0.8 * r), (cx - 0.5 * r, cy + 0.0 * r, 0.56 * r), (cx + 0.52 * r, cy - 0.05 * r, 0.6 * r)]
    def rim_domes(W, rng):
        ds = [(0, LAP * 0.5 + RJ, RJ), (W, LAP * 0.5 + RJ, RJ)]
        big = rng.uniform(0.34, 0.39) * cs; small = rng.uniform(0.18, 0.24) * cs
        rs = [big, small] if rng.uniform() < 0.5 else [small, big]
        xs = [W * rng.uniform(0.28, 0.36), W * rng.uniform(0.66, 0.74)]
        for cx, r in zip(xs, rs): ds += billow(cx, r + rng.uniform(0, 0.8) * LAP, r)
        rb = cs * 0.13; nb = int(np.ceil(W / (rb * 1.2))) + 1               # a low ridge under them all: the edge is always covered
        ds = [(j * W / (nb - 1), LAP * 0.6 + rb, rb) for j in range(nb)] + ds
        return ds
    rh = int(round(LAP + 2 * cs * 0.39 + 0.8 * LAP)) + 2
    def turned(light, k):
        a = -k * np.pi / 2; return (light[0] * np.cos(a) - light[1] * np.sin(a), light[0] * np.sin(a) + light[1] * np.cos(a))
    for f, v in [(f, v) for f in 'nesw' for v in 'ab']:
        ds = rim_domes(cs, np.random.default_rng(cs * 10 + 'nesw'.index(f) + (40 if v == 'b' else 0)))
        tw = TOWARD[f]; light = (tw[0] * 0.5 + TL[0] * 0.7, tw[1] * 0.5 + TL[1] * 0.7); k = ROT[f]
        idx = render(cs, rh, ds, turned(light, k), lambda y, x: y < LAP + cs * 0.22, crease=2.6 * cs / 48 * 0.6, flat=0.6)
        assert (idx[LAP] > 0).all(), ('the rim must cover the cell edge', cs, f, v)
        save(f'c-cloud-rim-{cs}-{f}-{v}', np.rot90(idx, k))
    # ---- outer corners (made as ne: seen land to the n and to the e; the cell's corner at (q - LAP, LAP)): one corner heap
    # and the two joint heaps of the rims it meets, all inside the box on the cloud side
    q = int(round(LAP + 2 * cs * 0.39 + 0.8 * LAP)) + 2
    for c, k in (('ne', 0), ('nw', 1), ('sw', 2), ('se', 3)):
        rr = np.random.default_rng(cs * 100 + k); R = cs * 0.33
        ds = billow(q - LAP - R * 0.95, LAP + R * 0.95, R) + [(q - LAP - 2.0 * R, LAP * 0.5 + RJ, RJ), (q - LAP - LAP * 0.5 - RJ, LAP + 2.0 * R, RJ)]
        light = (0.5 + TL[0] * 0.7, -0.5 + TL[1] * 0.7)
        idx = render(q, q, ds, turned(light, k), lambda y, x: (y < LAP + cs * 0.22) | (x > q - LAP - cs * 0.22 - 1), crease=2.6 * cs / 48 * 0.6, flat=0.6)
        save(f'c-cloud-rim-{cs}-out-{c}', np.rot90(idx, k))
    # ---- inner corners (made as ne: the diagonal to the ne is seen; the cell's corner at (qi - LAP, LAP)): one heap on the corner
    # point, lapping LAP into the diagonal, joining the two rims that end there
    qi = int(round(cs * 0.5)) + LAP
    for c, k in (('ne', 0), ('nw', 1), ('sw', 2), ('se', 3)):
        R = cs * 0.24; ds = [(qi - LAP - R + LAP, LAP + R - LAP, R)]
        ds = [(min(cx, qi - r - 0.5), max(cy, r + 0.5), r) for cx, cy, r in ds] + [(qi - LAP - R * 1.6, LAP + R * 1.4, R * 0.8)]
        light = (0.5 + TL[0] * 0.7, -0.5 + TL[1] * 0.7)
        idx = render(qi, qi, ds, turned(light, k), lambda y, x: (y < LAP + cs * 0.14) | (x > qi - LAP - cs * 0.14 - 1))
        save(f'c-cloud-rim-{cs}-in-{c}', np.rot90(idx, k))
    # ---- laps: short runs that overhang a rim's edge by LAP more (made as n)
    lh = LAP * 2 + cs // 4
    for f in 'nesw':
        for v, frac in (('a', 0.6), ('b', 0.4)):
            W = int(cs * frac); rr = np.random.default_rng(cs * 7 + 'nesw'.index(f) * 2 + (v == 'b'))
            n = max(2, int(round(W / (cs * 0.28)))); ds = []
            for j in range(n):
                r = cs * rr.uniform(0.16, 0.2) * (0.8 if j in (0, n - 1) else 1)
                ds.append(((j + .5) * W / n, max(r, LAP + r * 0.4 + rr.uniform(0, 0.3) * LAP), r))
            ds = [(cx, min(cy, lh - r), r) if cy + r > lh else (cx, cy, r) for cx, cy, r in ds]
            tw = TOWARD[f]; light = (tw[0] * 0.5 + TL[0] * 0.7, tw[1] * 0.5 + TL[1] * 0.7); k = ROT[f]
            idx = render(W, lh, ds, turned(light, k), lambda y, x: y < lh * 0.6, crease=2.6 * cs / 48 * 0.6, flat=0.6)
            save(f'c-cloud-lap-{cs}-{f}-{v}', np.rot90(idx, k))
fs = [f for f in os.listdir(out) if f.startswith('c-cloud-') and f.endswith('.png') and 'fill' not in f]
for f in fs:
    im = Image.open(os.path.join(out, f)); a = np.asarray(im.convert('RGBA'))
    assert set(np.unique(a[..., 3])) <= {0, 255}, f; assert P.off_palette(im) == (0, 0), f
print('ok', len(fs))
