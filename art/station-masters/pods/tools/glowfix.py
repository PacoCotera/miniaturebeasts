"""0 MXN: S03's glow key, the bulb's halo rebuilt (ad-curl, 2026-10-28). A glow painted on the magenta ground comes back as a pink-red ring however it is asked.
Within 34 px of the bulb (the centroid of the bright yellow core: R > 220, G > 180, B < 170), every reddish pixel (R - G > 50) and the ring's soft line (alpha < 235, 12-40 px out; the stalk is solid) are taken out, then a soft gold glow
(#ffd27a, alpha 150 at the core falling to 0 at 26 px, quadratic) is laid UNDER the figure, so the bulb and its light read warm gold on any room.
usage: python3 -I glowfix.py KEY.png ..."""
import sys, numpy as np
from PIL import Image
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert("RGBA")).astype(float); r, g, b, al = [a[..., i] for i in range(4)]
    core = (r > 220) & (g > 180) & (b < 170) & (al > 200); ys, xs = np.where(core); cy, cx = ys.mean(), xs.mean()
    yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]; d = np.hypot(yy - cy, xx - cx)
    ring = (d < 34) & (r - g > 50) & ~core
    rim = (d > 10) & (d < 36) & ((r + g + b) / 3 < 110) & ~(g > r + 15) & (al < 235)   # the ring's dark rim (the teal stalk keeps g > r)
    warm = (d > 12) & (d < 40) & (al < 235)                                  # the ring's line itself: soft, where the stalk is solid
    ring |= rim | warm; a[ring, 3] = 0
    glow = np.zeros_like(a); glow[..., 0], glow[..., 1], glow[..., 2] = 255, 210, 122; glow[..., 3] = np.clip(1 - d / 26, 0, 1) ** 2 * 150
    out = Image.fromarray(glow.astype(np.uint8), "RGBA"); out.alpha_composite(Image.fromarray(a.astype(np.uint8), "RGBA")); out.save(f)
    print(f, "bulb", round(cx), round(cy), "ring px", int(ring.sum()))
