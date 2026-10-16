"""Fix 5 Create CA3, by hand, 0 MXN: a shallow worn dish pressed into the relit bench at the pod's place (axis x 160, feet y 408 on
screen; stage y = screen - 40). The dish is an elliptical depression in the bench's own paint (rx 92, ry 26 at the rim, centred
3 px above the feet): a height field (a smooth bowl, 3 px deep, with a 2 px raised worn lip), shaded by the key light from the top
left as a multiplier on the bench paint, so the far inner wall catches light and the near inner wall falls in shade; a faint wear
ring on the lip. Then room-cradle-front is the dish's near lip and near inner wall cut as its own layer (alpha from the near half
of the lip ring, feathered), 224x96 at (48, 344), drawn over the pod's feet.
usage: paint-dish.py STAGE_IN STAGE_OUT FRONT_OUT"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float); H, W = a.shape[:2]
S = 4; yy, xx = (np.mgrid[0:H * S, 0:W * S].astype(np.float32) + .5) / S
CX, CY, RX, RY = 160.0, 405.0 - 40, 92.0, 26.0
r = np.sqrt(((xx - CX) / RX) ** 2 + ((yy - CY) / RY) ** 2)
h = np.where(r < 1, -3.0 * (1 - r ** 2), 0) + 2.0 * np.exp(-((r - 1.0) / 0.07) ** 2)
gy, gx = np.gradient(nd.gaussian_filter(h, 2)); gx *= S; gy *= S * (RX / RY) * 0.35
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Lv = np.array([-0.55, -0.62, 0.78]); Lv /= np.linalg.norm(Lv)
shade = np.clip(n @ Lv, 0, None) / Lv[2]
ao = 1 - 0.18 * np.clip(-h / 3, 0, 1)
mult = (shade * ao).reshape(H, S, W, S).mean((1, 3))
near = ((yy > CY) & (r > 0.80) & (r < 1.18)).astype(np.float32).reshape(H, S, W, S).mean((1, 3))
L = lin(a[..., :3]) * mult[..., None]
o = a.copy(); o[..., :3] = np.round(srgb(L))
Image.fromarray(o.astype(np.uint8), 'RGBA').save(sys.argv[2])
f = np.zeros((96, 224, 4)); f[..., :3] = o[344 - 40:440 - 40, 48:272, :3]
f[..., 3] = np.clip(nd.gaussian_filter(near[304:400, 48:272], 0.8) * 1.3, 0, 1) * 255
f[f[..., 3] < 3] = 0
Image.fromarray(np.round(f).astype(np.uint8), 'RGBA').save(sys.argv[3])
print('changed px', int((np.abs(o - a).sum(-1) > 0).sum()))
