# Fix 5 P-A1 follow-up: the hose paint-out left a cool, near-black low-frequency residue along the right wall and in the bottom-right
# corner of room-bench-stage-chapter (x 790-948, y 225-508; e.g. (23, 24, 25) against the wall's (57, 49, 46)). Where the slice's
# 18 px blur is more than 8 % darker than the clean wall at the same row, its low frequency is replaced, per channel in linear light,
# by the clean wall's (the per-row median of the blur over x 600-760, x 0.94 for the fall-off toward the frame); the high frequency
# (grain, strokes, the dust prints) stays. A 6 px feathered mask; nothing outside the region changes.
# usage: python3 -I lift-hose-ghost.py IN OUT
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
L = lin(a[..., :3]); H, W = L.shape[:2]
low = nd.gaussian_filter(L, (18, 18, 0))
tgt = np.stack([np.median(low[y, 600:760], 0) for y in range(H)]) * 0.94
target = np.repeat(tgt[:, None, :], W, 1)
Y = lambda c: c @ [.2126, .7152, .0722]
reg = np.zeros((H, W), bool); reg[225:508, 790:951] = True
xs, ys = np.arange(W), np.arange(H)                                   # the region feathered inward over 24 px on the left, top and bottom; full to the frame
soft = np.outer(np.clip(np.minimum(ys - 225, 508 - ys) / 24, 0, 1), np.clip((xs - 790) / 24, 0, 1)) * reg
need = reg & (Y(low) < Y(target) * 0.92)
mask = (nd.gaussian_filter(nd.binary_dilation(need, iterations=6).astype(float), 6) * soft)[..., None]
new = np.clip(target + (L - low), 0, 1)
out = a.copy(); out[..., :3] = np.round(srgb(L * (1 - mask) + new * mask))
Image.fromarray(out.astype(np.uint8), 'RGBA').save(sys.argv[2])
print('px changed', int((np.abs(out - a).sum(-1) > 0).sum()))
