# Fix 5 AR2, the art director's cut after the studio's fringe pass: the crate slices still carried a piece of the source painting's cast
# shadow on their right (a dark slate block with a ragged edge, a pale halo and stray specks). The crate is symmetric left to right and its
# left side is clean, so each row's right edge is the mirror of its left edge about the crate's axis (the base ink's centre); everything
# beyond it, plus 1 px, is cleared. Then specks under 8 px go, and a 1 px edge pixel more than 35 L lighter than its inner neighbours takes
# their mean (the pale halo). The contact shadow is crate-shadow-*, a separate slice.
# usage: python3 -I recut-crates.py SLICES_DIR
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]
AXIS = {256: 128.0, 432: 213.0}                                          # the base ink spans 8-248 and 7-419
for name in ('crate-sealed-256x176', 'crate-sitting-256x176', 'crate-sealed-432x272', 'crate-opening-432x272', 'crate-open-432x272'):
    p = os.path.join(sl, name + '.png'); a = np.asarray(Image.open(p).convert('RGBA')).copy()
    H, W = a.shape[:2]; c = AXIS[W]; op = a[..., 3] > 0; n0 = int(op.sum())
    for y in range(H):
        xs = np.where(op[y])[0]
        if not len(xs): continue
        left = xs.min(); right = int(np.ceil(2 * c - left)) + 1
        a[y, right + 1:, 3] = 0
    op = a[..., 3] > 0
    lab, n = nd.label(op); sizes = nd.sum(op, lab, range(1, n + 1))
    for i, s_ in enumerate(sizes):
        if s_ < 8: a[lab == i + 1, 3] = 0
    op = a[..., 3] > 0; L = a[..., :3].astype(float) @ [.2126, .7152, .0722]
    edge = op & nd.binary_dilation(~op, iterations=1)
    inner = op & ~edge
    k = np.ones((3, 3)); num = nd.convolve(np.where(inner[..., None], a[..., :3].astype(float), 0), k[..., None]); den = nd.convolve(inner.astype(float), k)
    mean = num / np.maximum(den[..., None], 1); mL = mean @ [.2126, .7152, .0722]
    halo = edge & (den > 0) & (L > mL + 35)
    a[halo, :3] = mean[halo].round().astype(np.uint8)
    Image.fromarray(a, 'RGBA').save(p)
    print(name, 'cleared', n0 - int((a[..., 3] > 0).sum()), 'px; halo', int(halo.sum()))
