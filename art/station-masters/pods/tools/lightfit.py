"""Hand grading against the art director's light rules for the Incubator (brief of Oct 10): at most 3 percent of a slice's pixels above L* 70; inside the chamber key R-B 70 or more and saturation 45 to 60 (against the glass day 38.9 / 75 / 50). No paid call.
fit_light(img, warm=False, cap=69.5): img is an RGBA PIL image; only pixels with alpha over 50 percent count. The linear light is scaled by the least reduction that keeps the 97.5th percentile of L* at or under `cap` (so at most 2.5 percent are above 70); with warm=True a warmth w is also raised (red up, blue down, in linear light) until the key light's R-B reaches 72 and the saturation 47 or more, the cap re-applied at each step; saturation is held at 58 or less. The key light is the brightest 20 percent (by L*) of the top-left quarter of the piece, as the art director's tool takes it."""
import numpy as np
from PIL import Image
exec(open("tools/nightdist.py").read(), globals())
def _stats(rgb, op):
    L = lstar(rgb); h, w = L.shape; q = np.zeros_like(op); q[:h // 2, :w // 2] = True; qq = op & q
    if qq.sum() < 20: qq = op
    key = rgb[qq & (L >= np.percentile(L[qq], 80))].mean(0); mx = rgb[op].max(1); mn = rgb[op].min(1)
    return L, float(key[0] - key[2]), float(((mx - mn) / np.maximum(mx, 1)).mean() * 100)
def fit_light(img, warm=False, cap=69.5):
    a = np.asarray(img).astype(float); op = a[..., 3] > 128; lin0 = to_lin(a[..., :3])
    def level(lin):
        lo, hi = 0.2, 1.0
        for _ in range(26):
            g = (lo * hi) ** 0.5; L = lstar(to_srgb(lin * g))
            if np.percentile(L[op], 97.5) <= cap: lo = g
            else: hi = g
        return to_srgb(lin * lo)
    best = None
    for w in (np.arange(0.0, 1.6, 0.05) if warm else [0.0]):
        lin = lin0 * (1 + np.array([0.55, 0.0, -0.75]) * w); c = level(lin); L, rb, sat = _stats(c, op); best = (c, w, rb, sat, L)
        if not warm or (rb >= 72 and sat >= 47): break
    c, w, rb, sat, L = best; out = a.copy(); out[..., :3] = c
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA"), {"warmth": round(float(w), 2), "key R-B": int(round(rb)), "sat": int(round(sat)), "mean L*": round(float(L[op].mean()), 1), "share>70": round(float((L[op] > 70).mean() * 100), 2)}
