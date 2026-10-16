"""Fix 5 Create CA1, the bench: room-bench-stage-create recut under the same id, by hand in code. One key light from the
top left on the stage's dark interior wall: a soft linear-light gradient, x1.22 at the interior's top-left to x0.82 at its
bottom-right, plus a broad falloff pool of light (x1.12 at its centre) on the wall behind the tray. The interior is the stage's
own dark paint (luma under 80, filled); the housing, its frame, screws and handles are untouched. usage: relight-stage.py SRC OUT"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float); H, W = a.shape[:2]
lum = a[..., :3] @ [.2126, .7152, .0722]
lab, n = nd.label(lum < 80); sizes = nd.sum(np.ones_like(lum), lab, range(1, n + 1)); inner = nd.binary_fill_holes(lab == (np.argmax(sizes) + 1))
soft = nd.gaussian_filter(inner.astype(float), 3) * inner
ys, xs = np.where(inner); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
yy, xx = np.mgrid[0:H, 0:W].astype(float)
t = np.clip(((xx - x0) / (x1 - x0)) * .55 + ((yy - y0) / (y1 - y0)) * .45, 0, 1)
g = 1.22 - 0.40 * t
d = np.sqrt(((xx - 512) / 330) ** 2 + ((yy - 300) / 220) ** 2); s = np.clip(1 - d, 0, 1); g *= 1 + 0.12 * s * s * (3 - 2 * s)
g = 1 + (g - 1) * soft
o = a.copy(); o[..., :3] = np.round(srgb(lin(a[..., :3]) * g[..., None]))
Image.fromarray(o.astype(np.uint8), 'RGBA').save(sys.argv[2])
print('interior', (x0, y0, x1, y1), 'changed', int((np.abs(o - a).sum(-1) > 0).sum()))
