# Fix 5 AR2, round 2, the art director's cut. The round-1 mirror (recut-crates.py) left the painting's broken side handles: ragged
# per-row steps on both sides, a hole at the left handle, dark slivers on the right. This takes the crate body instead: the opaque
# mask, holes filled, opened with a disk (radius 4 px on the 256 slices, 6 px on the 432) so the thin broken protrusions go, the
# largest piece kept, its edge softened by a 1 px gaussian (alpha ramps over the 0.35-0.65 band). Pixels the new edge takes in that
# had no paint (18 px at most) take the nearest painted pixel. The contact shadow stays crate-shadow-*.
# usage: python3 -I recut-crates-2.py SLICES_DIR
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]
RAD = {256: 4, 432: 6}
for name in ('crate-sealed-256x176', 'crate-sitting-256x176', 'crate-sealed-432x272', 'crate-opening-432x272', 'crate-open-432x272'):
    p = os.path.join(sl, name + '.png'); a = np.asarray(Image.open(p).convert('RGBA')).astype(float); H, W = a.shape[:2]
    rad = RAD[W]; painted = a[..., 3] > 127
    op = nd.binary_fill_holes(painted)
    yy, xx = np.mgrid[-rad:rad + 1, -rad:rad + 1]; disk = xx ** 2 + yy ** 2 <= rad * rad
    body = nd.binary_opening(op, structure=disk)
    lab, n = nd.label(body); sizes = nd.sum(body, lab, range(1, n + 1)); body = nd.binary_fill_holes(lab == (np.argmax(sizes) + 1))
    soft = nd.gaussian_filter(body.astype(float), 1.0); mask = soft > 0.5
    need = mask & ~painted
    idx = nd.distance_transform_edt(~painted, return_distances=False, return_indices=True)
    rgb = a[..., :3].copy(); rgb[need] = a[idx[0][need], idx[1][need], :3]
    alpha = np.clip((soft - 0.35) / 0.3, 0, 1) * 255
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = rgb.round(); out[..., 3] = alpha.round(); out[alpha < 1] = 0
    Image.fromarray(out, 'RGBA').save(p)
    print(name, 'removed', int((painted & ~mask).sum()), 'px; filled', int(need.sum()))
