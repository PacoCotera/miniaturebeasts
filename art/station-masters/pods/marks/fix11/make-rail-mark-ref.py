"""Create's rail mark (gate batch 1, fix 11; create spec 'Amendment, gate batch 1'): composed chrome in the face, no master. These two
PNGs are the AD's pixel reference for the builder's test oracle only (never placed): 12 x 12, station palette.
- clash: red #c93440 X, both diagonals corner to corner, the pixels with |x - y| <= 1 (and |x + y - 11| <= 1): a 2 px stroke at 1x.
- changed: bone #f1ebdf diamond, rows 2, 4, 6, 8, 10, 12, 12, 10, 8, 6, 4, 2 wide, centred.
usage: python3 -I make-rail-mark-ref.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
yy, xx = np.mgrid[0:12, 0:12]
x_ = (np.abs(xx - yy) <= 1) | (np.abs(xx + yy - 11) <= 1)
w = np.array([2, 4, 6, 8, 10, 12, 12, 10, 8, 6, 4, 2])
dia = np.abs(xx - 5.5) < (w[yy] / 2)
for n, m, c in (('rail-mark-clash-12x12-ref', x_, (0xc9, 0x34, 0x40)), ('rail-mark-changed-12x12-ref', dia, (0xf1, 0xeb, 0xdf))):
    img = np.zeros((12, 12, 4), np.uint8); img[m, :3] = c; img[m, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(out, n + '.png'))
    print(n); print('\n'.join(''.join('#' if v else '.' for v in row) for row in m))
