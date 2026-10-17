"""T-20261016-146: bench-part-t2-fitted-128 re-cut as a clean cut-out (same id, same size), so on the Fit it card it stands on the panel's
plinth like bench-part-t2-dim-128 on Not now, not inside a dark socket box on a flat beige slab (results/T-20261016-53.md note 2).
The fitted master was the tier 2 part seated in its socket. Inside the part's silhouette its pixels equal bench-part-t2-ready-128's (mean
difference 1.1 / 255; the only larger ones are the slab's rows at the foot), so the painting holds no fitted-only detail. The cut-out keeps
the fitted master's own pixels inside the part's silhouette (the ready master's alpha, its soft edge), takes the ready master's where the
slab covered the foot, and drops the box and the slab. The part's contact shadow is left to the panel (panel-contact-shadow-128x16).
usage: python3 -I bench/t146/recut-fitted.py   (run in art/station-masters/pods)"""
import numpy as np
from PIL import Image
D = "bench/slices/"
f = np.asarray(Image.open(D + "bench-part-t2-fitted-128.png").convert("RGBA")).astype(int)
r = np.asarray(Image.open(D + "bench-part-t2-ready-128.png").convert("RGBA")).astype(int)
diff = np.abs(f[..., :3] - r[..., :3]).max(2)
rgb = np.where((diff > 12)[..., None], r[..., :3], f[..., :3])               # the slab's rows: the part's own pixels from the ready master
out = np.dstack([rgb, r[..., 3]]); out[out[..., 3] == 0] = 0
Image.fromarray(out.astype(np.uint8), "RGBA").save(D + "bench-part-t2-fitted-128.png")
print("pixels taken from ready:", int(((diff > 12) & (r[..., 3] > 0)).sum()), "; alpha px:", int((r[..., 3] > 0).sum()))
