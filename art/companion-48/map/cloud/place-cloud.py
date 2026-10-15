"""The cloud placement rule (A1), as a reference for view.mjs's pure function, and the proof composer.
place(seed, seen, cs) -> a list of (piece id, x, y) in draw order, integers only:
  1. fill: every unknown cell, c-cloud-fill-48 tiled on the screen grid (at 72 and 26 the fill tile is taken modulo 48 the same way).
  2. heaps (drawn after the rims and corners, before the laps): for each unknown cell, h = hash(seed, x, y) (any fixed 32-bit integer
     hash); if h % 3 == 0, heap k = 1 + (h >> 2) % 8 is offered with its top-left at the cell's origin plus
     ((h >> 5) % cs - w / 2, (h >> 11) % cs - h_ / 2). It is placed only if none of its opaque pixels lies more than LAP inside seen land
     (Chebyshev distance to the nearest unknown cell's pixels; off the map counts as unknown) and its box does not overlap an already placed heap by more than
     half its own area. Cells are visited in row-major order.
  3. rims: for each unknown cell and each side n/e/s/w whose neighbour is seen: c-cloud-rim-{cs}-{side}-{a|b} (a when hash(seed, x, y, side) is even) at the cell's edge,
     overhanging the seen side by LAP (n: (x*cs, y*cs - LAP); s: (x*cs, y*cs + cs - rh); w: (x*cs - LAP, y*cs); e: (x*cs + cs - rh, y*cs)).
  4. outer corners: where both sides of a corner are seen: c-cloud-rim-{cs}-out-{corner}, its corner point (LAP in from the
     piece's own corner on that side) on the cell's corner.
  5. inner corners: where both sides are cloud but the diagonal is seen: c-cloud-rim-{cs}-in-{corner}, the same anchoring.
  6. laps: for each rim side, h = hash(seed, x, y, side); if h % 2 == 0, lap {a|b} (by (h >> 1) % 2) at offset
     (h >> 2) % (cs - w) along the edge, its outer line LAP over the seen cell.
  Shade (DARK, DARK2) and the beacon sweep stay as spec C.5; lavender is only ever in these pieces.
usage: place-cloud.py PIECES_DIR FILL.png GROUND_TILE.png OUT_PREFIX"""
import sys, os, numpy as np
from PIL import Image
pieces, fillp, groundp, outp = sys.argv[1:5]
def H32(*a):
    h = 2166136261
    for v in a:
        for b in int(v & 0xffffffff).to_bytes(4, 'little'): h = ((h ^ b) * 16777619) & 0xffffffff
    return h
def load(n): return Image.open(os.path.join(pieces, n + '.png')).convert('RGBA')
def place(seed, seen, cs):
    Hc, Wc = seen.shape; LAP = cs // 9; L = []
    unk = lambda x, y: not (0 <= x < Wc and 0 <= y < Hc) or not seen[y, x]
    rh = int(round(LAP + 2 * cs * 0.39 + 0.8 * LAP)) + 2; q = rh; qi = int(round(cs * 0.5)) + LAP
    for y in range(Hc):
        for x in range(Wc):
            if seen[y, x]: continue
            X, Y = x * cs, y * cs
            if not unk(x, y - 1): L.append((f'c-cloud-rim-{cs}-n-{"ab"[H32(seed, x, y, 110) % 2]}', X, Y - LAP))
            if not unk(x, y + 1): L.append((f'c-cloud-rim-{cs}-s-{"ab"[H32(seed, x, y, 115) % 2]}', X, Y + cs - rh + LAP))
            if not unk(x - 1, y): L.append((f'c-cloud-rim-{cs}-w-{"ab"[H32(seed, x, y, 119) % 2]}', X - LAP, Y))
            if not unk(x + 1, y): L.append((f'c-cloud-rim-{cs}-e-{"ab"[H32(seed, x, y, 101) % 2]}', X + cs - rh + LAP, Y))
    for y in range(Hc):
        for x in range(Wc):
            if seen[y, x]: continue
            X, Y = x * cs, y * cs
            for c, (sx, sy) in (('ne', (1, -1)), ('nw', (-1, -1)), ('se', (1, 1)), ('sw', (-1, 1))):
                a, b, d = unk(x + sx, y), unk(x, y + sy), unk(x + sx, y + sy)
                cxp = X + (cs if sx > 0 else 0); cyp = Y + (cs if sy > 0 else 0)
                if not a and not b: s_, kind = q, 'out'
                elif a and b and not d: s_, kind = qi, 'in'
                else: continue
                px = cxp - (s_ - LAP) if sx > 0 else cxp - LAP; py = cyp - LAP if sy < 0 else cyp - (s_ - LAP)
                L.append((f'c-cloud-rim-{cs}-{kind}-{c}', px, py))
    # the heaps
    pm = np.zeros((Hc * cs, Wc * cs), bool)
    from scipy import ndimage as nd
    DEP = nd.distance_transform_cdt(~np.kron(~seen, np.ones((cs, cs), bool)), metric='chessboard')   # px into seen land
    for y in range(Hc):
        for x in range(Wc):
            if seen[y, x]: continue
            h = H32(seed, x, y)
            if h % 3: continue
            k = 1 + (h >> 2) % 8; im = load(f'c-cloud-heap-{cs}-{k}'); w, hh = im.size
            px = x * cs + (h >> 5) % cs - w // 2; py = y * cs + (h >> 11) % cs - hh // 2
            al = np.asarray(im)[..., 3] > 0
            y0, x0 = max(py, 0), max(px, 0); y1, x1 = min(py + hh, DEP.shape[0]), min(px + w, DEP.shape[1])
            if (DEP[y0:y1, x0:x1][al[y0 - py:y1 - py, x0 - px:x1 - px]] > LAP).any(): continue
            y0, y1, x0, x1 = max(py, 0), min(py + hh, pm.shape[0]), max(px, 0), min(px + w, pm.shape[1])
            if pm[y0:y1, x0:x1].sum() > 0.5 * w * hh: continue
            pm[y0:y1, x0:x1] = True; L.append((f'c-cloud-heap-{cs}-{k}', px, py))
    for y in range(Hc):
        for x in range(Wc):
            if seen[y, x]: continue
            X, Y = x * cs, y * cs
            for f, (dx, dy) in (('n', (0, -1)), ('s', (0, 1)), ('w', (-1, 0)), ('e', (1, 0))):
                if unk(x + dx, y + dy): continue
                h = H32(seed, x, y, 'nswe'.index(f) + 17)
                if h % 2: continue
                v = 'ab'[(h >> 1) % 2]; im = load(f'c-cloud-lap-{cs}-{f}-{v}'); w, hh = im.size
                if f in 'ns': o = (h >> 2) % max(cs - w, 1); L.append((f'c-cloud-lap-{cs}-{f}-{v}', X + o, Y - LAP if f == 'n' else Y + cs + LAP - hh))
                else: o = (h >> 2) % max(cs - hh, 1); L.append((f'c-cloud-lap-{cs}-{f}-{v}', X - LAP if f == 'w' else X + cs + LAP - w, Y + o))
    return L
def compose(seed, seen, cs):
    Hc, Wc = seen.shape; img = Image.new('RGBA', (Wc * cs, Hc * cs), (0, 0, 0, 255))
    g = Image.open(groundp).convert('RGBA'); g = g.resize((cs, cs), Image.NEAREST) if g.size != (cs, cs) else g
    fill = Image.open(fillp).convert('RGBA')
    for y in range(Hc):
        for x in range(Wc):
            if seen[y, x]: img.paste(g, (x * cs, y * cs))
            else:
                for oy in range(0, cs, 48):
                    for ox in range(0, cs, 48):
                        sx, sy = (x * cs + ox) % 48, (y * cs + oy) % 48
                        t = Image.new('RGBA', (96, 96)); [t.paste(fill, (a, b)) for a in (0, 48) for b in (0, 48)]
                        img.paste(t.crop((sx, sy, sx + min(48, cs - ox), sy + min(48, cs - oy))), (x * cs + ox, y * cs + oy))
    for n, px, py in place(seed, seen, cs): img.alpha_composite(load(n), (px, py)) if px >= 0 and py >= 0 else img.paste(load(n), (px, py), load(n))
    return img
if __name__ == '__main__':
    rng = np.random.default_rng(4); Hc, Wc = 7, 9
    seen = np.zeros((Hc, Wc), bool)
    for y in range(Hc):                                                # a blobby island
        for x in range(Wc):
            seen[y, x] = ((x - 4.0) / 2.9) ** 2 + ((y - 3.2) / 2.2) ** 2 < 1 + rng.uniform(-0.35, 0.35)
    seen[1, 6] = True; seen[5, 2] = False
    for cs in (72, 48, 26):
        im = compose(7, seen, cs); im.save(f'{outp}-{cs}-1x.png')
def check_lap(seed, seen, cs):
    """spec C.5 / S3 test 3: no cloud piece pixel lies more than LAP inside seen land."""
    from scipy import ndimage as nd
    Hc, Wc = seen.shape; LAP = cs // 9
    cov = np.zeros((Hc * cs, Wc * cs), bool)
    for n, px, py in place(seed, seen, cs):
        a = np.asarray(load(n))[..., 3] > 0; h, w = a.shape
        y0, x0 = max(py, 0), max(px, 0); y1, x1 = min(py + h, cov.shape[0]), min(px + w, cov.shape[1])
        cov[y0:y1, x0:x1] |= a[y0 - py:y1 - py, x0 - px:x1 - px]
    unkpx = np.kron(~seen, np.ones((cs, cs), bool))
    depth = nd.distance_transform_cdt(~unkpx, metric='chessboard')   # px into seen land from the nearest unknown pixel
    worst = int(depth[cov & ~unkpx].max()) if (cov & ~unkpx).any() else 0
    return worst, LAP
if __name__ == '__main__':
    for cs in (72, 48, 26):
        for sd in (1, 2, 7, 35):
            rng = np.random.default_rng(sd); s2 = rng.uniform(size=(9, 11)) < 0.5
            w, L = check_lap(sd, s2, cs); assert w <= L, (cs, sd, w, L)
        print('lap ok at', cs, '(LAP', L, ')')
