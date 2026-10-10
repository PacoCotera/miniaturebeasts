"""The dawn's gold tint by hand (pass 108; the Station art director returned the dawns to new at 1x: the key light went grey). No paid call.
dawn_grade(im, radius): the picture is first set to a mean L* of 40.5 by the least linear gain (as in pass 104), then a radial gold tint in linear light from the top-left corner (0, 0): at the corner R x (1 + 0.06 k) and B x (1 - 0.10 k), fading smoothly to nothing at the radius (700 px for Idle's dawn, about 370 for the near view, the glass in proportion); k is 1 (the art director's 1.06 and 0.90) and is raised in steps of 0.25 only if the key R-B is still under 35; the level is then reset to a mean L* of 40.5. Targets: key R-B 35 or more, mean L* 38 to 42, the mist kept.
Measures, the art director's way: mean L*; the key light = the brightest 20 percent (by L*) of the top-left quarter, its mean RGB and R-B; mean saturation (HSV S x 100).
Returns (image, report)."""
import numpy as np
from PIL import Image
exec(open("tools/nightdist.py").read(), globals())
def measures(a):
    a = np.asarray(a).astype(float); L = lstar(a); H, W = L.shape; q = L[:H // 2, :W // 2]; qa = a[:H // 2, :W // 2]; m = q >= np.percentile(q, 80); key = qa[m].mean(0)
    mx = a.max(2); mn = a.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    return {"mean L*": round(float(L.mean()), 1), "key RGB": [int(round(v)) for v in key], "key R-B": int(round(key[0] - key[2])), "sat": int(round(sat.mean() * 100))}
def _level(lin, target=40.5):
    lo, hi = 0.05, 3.0
    for _ in range(30):
        g = (lo * hi) ** 0.5
        if lstar(to_srgb(lin * g)).mean() < target: lo = g
        else: hi = g
    return lin * (lo * hi) ** 0.5
def dawn_grade(im, radius):
    lin = _level(to_lin(np.asarray(im).astype(float))); H, W, _ = lin.shape; yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot(xx, yy); t = np.clip(1 - r / radius, 0, 1); f = (t * t * (3 - 2 * t))[..., None]
    for k in np.arange(1.0, 4.01, 0.25):
        tl = lin * (1 + np.array([0.06 * k, 0.0, -0.10 * k]) * f); c = to_srgb(_level(tl) if False else tl)
        c = to_srgb(_level(tl)); m = measures(c)
        if m["key R-B"] >= 35: break
    return Image.fromarray(c.astype(np.uint8)), {**m, "k": float(k), "radius": radius}
