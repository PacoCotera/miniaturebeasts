"""T-20261016-128 (specs/station-lab-sweep.md §1 row 4): the painted paper tag and its string cut from Pods' two stages
(room-bench-stage-overview, room-bench-stage-chapter). The Station is a lab; paper belongs only in the Library, and the pod's name is on
its device name plate. The tag is masked by its brightness (the paper and the string, both far above the ground and the dish's rim), dilated 3 px to take
its edge and drop shadow, and the hole is
filled by the house rule: a harmonic fill from its border (so the dish's rim and the ground's tone run on through it), plus the ground's own
grain from an empty patch beside it. Nothing else on either stage changes.
usage: python3 -I stage-recut/t128/cut-tag.py SLICES_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]
JOBS = {"room-bench-stage-overview": ((205, 362, 290, 424), 70), "room-bench-stage-chapter": ((165, 362, 250, 424), 70)}   # box (slice px), donor shift
for name, ((x0, y0, x1, y1), dxs) in JOBS.items():
    p = os.path.join(sl, name + ".png"); im = np.asarray(Image.open(p).convert("RGBA")).astype(float); a = im[..., :3]
    lum = a @ np.array([.299, .587, .114])
    box = np.zeros(lum.shape, bool); box[y0:y1, x0:x1] = True
    paper = box & (lum > 112)                                              # the paper and the string (paper ~192, string ~130-170; the
    m = nd.binary_dilation(paper, iterations=3) & box                      # dish rim stays under 100, the ground ~66); dilated for the shadow
    ref = nd.median_filter(lum, 15)
    near = nd.binary_dilation(paper, iterations=7) & box
    shadow = near & (lum < ref - 10)                                        # the tag's drop shadow, beyond the dilation
    sbox = np.zeros_like(box); sbox[y0 + 6:y0 + 34, x0:x0 + 40] = True
    string = sbox & (lum - ref > 8)                                        # the string's faint run up to the rim
    m = m | nd.binary_dilation(shadow | string, iterations=1)
    fill = a.copy()
    for c in range(3):                                                      # the harmonic fill (Jacobi), seeded with the box's mean
        ch = fill[..., c]; ch[m] = np.nanmean(np.where(box & ~m, ch, np.nan))
        for _ in range(1500):
            avg = (np.roll(ch, 1, 0) + np.roll(ch, -1, 0) + np.roll(ch, 1, 1) + np.roll(ch, -1, 1)) / 4
            ch[m] = avg[m]
        fill[..., c] = ch
    donor = np.roll(a, -dxs, axis=1); grain = donor - nd.gaussian_filter(donor, (3, 3, 0))    # the ground's own grain, from beside it
    fill[m] = fill[m] + grain[m]
    out = im.copy(); out[..., :3] = np.where(m[..., None], fill, a)
    Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8), "RGBA").save(p)
    ys, xs = np.nonzero(m); print(name, "px replaced", int(m.sum()), "box", (xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1))
