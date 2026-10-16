"""Fix 11 (gate batch 1, G1 and G2; AD, 10-15, 0 MXN): the name-line glyphs redrawn so the form carrying the meaning is >= 12 px.
The signed family's colours and construction (pass 60): a bone rim lit at the top left, a fog rim shaded at the bottom right, a frostS
body, the hidden look's ghost in mist on the lower right, a 2 px fog stem; no white, no ink ring (ink on the ground is invisible at 1x)
except the keyline between the pair's two seeds.
- mark-line-seed-12x16 (hides): one seed, ink 12 wide x 16 tall (body 12 x 14 under a 2 px stem).
- mark-line-seed-pair-20x16 (blend): two such seeds overlapping 4 px, the front one right, an ink keyline down the back seed's edge.
- mark-line-only-16x16 (only; new id, top 2): one seed standing on its plinth (the signed plinth's three steps: fog top, mist front,
  stone foot): ink 16 x 14 (rows 2-15), the seed 12 x 10.
usage: python3 -I make-line-glyphs.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
C = {'b': (241, 235, 223), 'f': (198, 196, 216), 'S': (169, 181, 200), 'm': (141, 138, 166), 's': (93, 89, 116), 'k': (26, 23, 37)}
def seed(W, H, cx, cy, rx, ry, stem_top):
    g = np.full((H, W), '', object)
    yy, xx = np.mgrid[0:H, 0:W] + .5
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    body = d <= 1.0
    rim = body & (d > ((rx - 1.15) / rx) ** 2 * 0.98)                 # the 1 px rim (a touch thicker at the ends of the long axis)
    lit = ((xx - cx) / rx + (yy - cy) / ry) < -0.15
    g[body] = 'S'
    ghost = body & ~rim & (((xx - cx) / rx * 0.8 + (yy - cy) / ry) > 0.25) & (((xx - cx) / rx + (yy - cy) / ry * 0.6) > -0.1)
    g[ghost] = 'm'
    diag = body & ~rim & (np.abs((xx - cx) - (yy - cy) * 0.55 - 0.3) < 0.75) & ((yy - cy) < 0)   # the fog diagonal on the lit half
    g[diag] = 'f'
    g[rim & lit] = 'b'; g[rim & ~lit] = 'f'
    top = int(np.floor(cy - ry + 0.5))
    sx = int(round(cx)) - 1
    g[stem_top:top + 1, sx] = 'f'; g[stem_top:top, sx - 0] = 'f'
    return g
def save(name, g):
    H, W = g.shape; img = np.zeros((H, W, 4), np.uint8)
    for k, c in C.items():
        m = g == k; img[m, :3] = c; img[m, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(out, name + '.png'))
    ys, xs = np.where(img[..., 3] > 0); return xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
one = seed(12, 16, 6.0, 9.0, 6.0, 7.0, 0)
print('seed', save('mark-line-seed-12x16', one))
pair = np.full((16, 20), '', object)
pair[:, 0:12] = one
front = seed(12, 16, 6.0, 9.0, 6.0, 7.0, 0)
pm = np.zeros((16, 20), bool); pm[:, 8:20] = front != ''
edge = np.zeros_like(pm); edge[:, :-1] = pm[:, 1:] & ~pm[:, :-1]          # one column left of the front seed's outline
pair[edge & (pair != '')] = 'k'
pair[pm] = front[front != ''] if False else pair[pm]
pair[:, 8:20][front != ''] = front[front != '']
print('pair', save('mark-line-seed-pair-20x16', pair))
only = np.full((16, 16), '', object)
s2 = seed(12, 12, 6.0, 7.0, 5.0, 4.6, 1)
only[1:13, 2:14][s2 != ''] = s2[s2 != '']
only[12, 3:13] = 'f'; only[13:15, 1:15] = 'm'; only[15, 0:16] = 's'
only[0:2, :] = ''                                                         # top 2, like the seeds
print('only', save('mark-line-only-16x16', only))
