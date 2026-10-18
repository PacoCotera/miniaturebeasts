# The capsule's open painting: its base light bar came out warm white; the closed painting's is mint. Recolour the bar
# and its glow to the closed bar's mint, keeping each pixel's lightness. Only pixels in the bar's box that are lighter
# than the dark base are touched.
import sys, numpy as np
from PIL import Image
src, ref, dst = sys.argv[1:4]
BOX = (380, 500, 640, 560)
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
rf = np.asarray(Image.open(ref).convert('RGB')).astype(float)
x0, y0, x1, y1 = BOX
r = rf[y0:y1, x0:x1].reshape(-1, 3); mint = r[r.sum(1) > 500].mean(0)          # the closed bar's colour
lum = lambda a: a @ np.array([0.3, 0.59, 0.11])
reg = im[y0:y1, x0:x1]; L = lum(reg)
w = np.clip((L - 60) / 150, 0, 1)[..., None]
tgt = mint[None, None, :] * (L / lum(mint))[..., None]
im[y0:y1, x0:x1] = (1 - w) * reg + w * np.clip(tgt, 0, 255)
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(dst)
print('mint', mint.round())
