"""PA3 (UI/UX probe-upright spec §8; AD, 10-15): the three upright pictures cleaned and their base unified.
1. Every opaque or faint pixel not joined (8-connected, alpha > 0) to the picture's main body goes (the key's specks; t1/t2 had 270
   tiny pieces, the spec counted the 17 opaque ones at x 12-41, rows 353-386).
   Desk wood left on the outline below row 300 (warm brown, R - B > 22, R > G + 8) is peeled in three passes.
2. The empty cradle's base becomes t1's own pixels in rows 336-431 wherever the two show the same cradle surface (colour within 24,
   both opaque): the base, the arms' feet and the rim are then the same pixels in all three, so the Dock cut changes only the device
   and the cup. Where they differ (the open cup and its contacts against the device's foot), the empty cradle keeps its own.
usage: python3 -I fix-pa3.py SLICES_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]
names = ['bench-probe-upright-t1-288x432', 'bench-probe-upright-t2-288x432', 'bench-cradle-upright-empty-288x432']
A = {}
for n in names:
    a = np.asarray(Image.open(os.path.join(sl, n + '.png'))).copy()
    lab, k = nd.label(a[..., 3] > 0, structure=np.ones((3, 3)))
    sz = nd.sum(a[..., 3] > 0, lab, range(1, k + 1)); keep = lab == (int(np.argmax(sz)) + 1)
    print(n, 'removed', int(((a[..., 3] > 0) & ~keep).sum()), 'px in', k - 1, 'pieces')
    a[~keep] = 0
    # desk wood left on the outline (warm brown, joined to the body): the sage cradle is never warm, so peel it, 3 passes
    for _ in range(3):
        R, G, B = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        edge = (a[..., 3] > 0) & nd.binary_dilation(a[..., 3] == 0, structure=np.ones((3, 3)))
        warm = edge & ((R - B) > 22) & (R > G + 8) & (np.arange(a.shape[0])[:, None] > 300)
        a[warm] = 0
    A[n] = a
t1, em = A[names[0]].astype(int), A[names[2]].astype(int)
rows = slice(336, 432)
same = (np.abs(t1[rows, :, :3] - em[rows, :, :3]).max(-1) <= 24) & (t1[rows, :, 3] > 250) & (em[rows, :, 3] > 250)
e = em.copy(); sub = e[rows]; sub[same] = t1[rows][same]; e[rows] = sub
# the shadow and edge rows (alpha < 250) too: where both have alpha there, take t1's
soft = (t1[rows, :, 3] > 0) & (em[rows, :, 3] > 0) & ~((t1[rows, :, 3] > 250) & (em[rows, :, 3] > 250))
sub = e[rows]; sub[soft] = t1[rows][soft]; e[rows] = sub
A[names[2]] = e.astype(np.uint8)
print('base pixels unified', int(same.sum()), 'soft', int(soft.sum()))
for n in names: Image.fromarray(A[n], 'RGBA').save(os.path.join(sl, n + '.png'))
