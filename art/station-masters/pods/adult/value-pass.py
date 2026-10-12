# S03's value pass (programme lead 00:34, signed by the art director: the mint coat read as a pale cutout, median luminance 0.88 against
# S02's 0.45). Only the coat moves: its pixels (green-cyan hue, low saturation, light) are taken to OKLab, weighted softly at the mask's edges, their lightness mapped
# monotonically from the coat's own percentiles (5, 50, 95) onto TARGET and their chroma lifted by CHROMA (capped), the hue kept, so the
# coat reads as a deeper mint rather than a grey (a plain RGB scale greyed it; scaling the whole picture crushed the teal ears to black).
# The teal, gold and face are the juvenile's and stay. Then the body's lowest 30 % shades a further 0-12 %, graded down, so the animal
# has form in the day light. The shadow (alpha under 255) is untouched.
# usage: python3 -I adult/value-pass.py FILE [FILE ...]   (rewrites in place)
import sys, colorsys, numpy as np
from PIL import Image
TARGET = [0.62, 0.76, 0.88]; CHROMA = 1.9; CMAX = 0.10     # OKLab lightness of the coat's p5, p50, p95; chroma lift and its cap
def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def gam(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)
M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
def to_ok(f): return np.cbrt(lin(f) @ M1.T) @ M2.T
def from_ok(o): return gam((o @ np.linalg.inv(M2).T) ** 3 @ np.linalg.inv(M1).T)
for p in sys.argv[1:]:
    a = np.asarray(Image.open(p).convert("RGBA")).astype(float); op = a[..., 3] == 255; f = a[..., :3] / 255.0
    mx, mn = f.max(-1), f.min(-1); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h = np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b)[0])(f[..., 0], f[..., 1], f[..., 2])
    o = to_ok(f); coat = op & (h > .30) & (h < .60) & (s <= .25) & (o[..., 0] > .80)
    ss = lambda x, e0, e1: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
    w = np.where(op & (h > .25) & (h < .65), ss(s, .40, .22) * ss(o[..., 0], .66, .80), 0)[..., None]   # the coat's weight, soft at its edges so no pale speckle stays
    src = np.percentile(o[..., 0][coat], [5, 50, 95]); Ln = np.interp(o[..., 0], src, TARGET, left=None, right=None)
    Ln = np.where(o[..., 0] < src[0], TARGET[0] - (src[0] - o[..., 0]), Ln)       # below the coat's p5: the same offset, no crush
    C = np.hypot(o[..., 1], o[..., 2]); k = np.where(C > 1e-6, np.minimum(C * CHROMA, CMAX) / np.maximum(C, 1e-6), 1)
    o2 = o.copy(); o2[..., 0] = Ln; o2[..., 1:] = o[..., 1:] * k[..., None]; o2 = o + (o2 - o) * w
    ys = np.where(op.any(1))[0]; top, bot = ys.min(), ys.max(); yy = np.arange(a.shape[0])[:, None] * np.ones(a.shape[1])[None]
    under = np.clip((yy - (bot - 0.3 * (bot - top))) / max(0.3 * (bot - top), 1), 0, 1) * 0.12
    o2[..., 0] = np.where(op, o2[..., 0] * (1 - under), o2[..., 0])
    out = np.clip(from_ok(o2), 0, 1) * 255
    a[..., :3] = np.where(op[..., None], out, a[..., :3])
    Image.fromarray(np.rint(a).astype(np.uint8), "RGBA").save(p)
    Lw = np.array([.2126, .7152, .0722]); L0 = f[coat] @ Lw; L1 = (a[..., :3][coat] / 255) @ Lw
    print(p.split("/")[-1], "coat px", int(coat.sum()), "coat Y p5/50/95 before", np.round(np.percentile(L0, [5, 50, 95]), 2), "after", np.round(np.percentile(L1, [5, 50, 95]), 2))
