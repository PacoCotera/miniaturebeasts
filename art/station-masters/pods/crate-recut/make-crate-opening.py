"""Fix 5 AR2 follow-up: crate-opening-432x272 rebuilt from the round-2 sealed crate (crate-sealed-432x272), so the opening frame
carries the sealed crate's clean edges instead of the old hand composite's wing residue and jagged seam. The lid (every row above
the seam, y < 153, the lid lip's lower edge) lifts 6 px; the 6 px gap shows the dark interior where the lid and the body both
stand (a ramp from #282823 at the lid's shadowed underside to #424238, only across the body proper, inset 10 px, so the flared wings lift with no bar under them); the seal tag, which crosses the seam, tears there: its top
rides up with the lid, its lower half stays on the body. Alpha and colour elsewhere are the sealed crate's own.
usage: make-crate-opening.py SLICES_DIR"""
import sys, os, numpy as np
from PIL import Image
sl = sys.argv[1]; SEAM, LIFT = 153, 6
a = np.asarray(Image.open(os.path.join(sl, 'crate-sealed-432x272.png')).convert('RGBA')).astype(float)
H, W = a.shape[:2]; out = np.zeros_like(a)
out[SEAM:] = a[SEAM:]                                   # the body stays
out[:SEAM - LIFT] = a[LIFT:SEAM]                        # the lid lifts
body_x = np.where(a[SEAM + 17, :, 3] > 127)[0]                      # the body proper (row 170: 31-388), not the lid lip's handles (17-403)
span = np.zeros(W, bool); span[body_x.min() + 10:body_x.max() - 9] = True
span &= (a[SEAM - 1, :, 3] > 127) & (a[SEAM, :, 3] > 127)
for i, y in enumerate(range(SEAM - LIFT, SEAM)):
    t = i / (LIFT - 1); c = np.array([40, 40, 35]) * (1 - t) + np.array([66, 66, 56]) * t
    out[y, span, :3] = c; out[y, span, 3] = 255
# the gap's ends: soften one px so the interior does not read as a cut bar
for x in np.where(span)[0][[0, -1]]: out[SEAM - LIFT:SEAM, x, 3] = 160
Image.fromarray(np.round(out).astype(np.uint8), 'RGBA').save(os.path.join(sl, 'crate-opening-432x272.png'))
print('gap span', int(span.sum()), 'px wide')
