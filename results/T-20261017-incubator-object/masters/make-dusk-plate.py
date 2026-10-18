# The empty dusk interior, by code (the studio's dusk edit came out near-day and lost the seal ring):
# the incubate still is registered into the day frame (it is drawn about 2.5% larger and offset), then its window,
# pod and all, is replaced by the empty day interior graded to the incubate still's dusk colour. The mint seal ring
# on the window's rim and everything outside the window stay as incubate painted them.
import sys, numpy as np
from PIL import Image, ImageFilter
day_p, inc_p, out_p = sys.argv[1:4]
day = Image.open(day_p).convert('RGB'); inc = Image.open(inc_p).convert('RGB')
# registration from the shell's box: day x 341-698, y 0-591; incubate x 320-686, y 0-599
s = (686 - 320) / (698 - 341)
ax, ay = 320 - 341 * s, 599 - 591 * s                                   # incubate = s * day + (ax, ay)
reg = inc.transform(day.size, Image.AFFINE, (s, 0, ax, 0, s, ay), Image.BICUBIC)
valid = inc.convert('L').point(lambda v: 255).transform(day.size, Image.AFFINE, (s, 0, ax, 0, s, ay), Image.NEAREST)
D, R = np.asarray(day).astype(float), np.asarray(reg).astype(float)
mx, mn = D.max(2), D.min(2)
shell = (mx < 95) & (mx - mn < 45) & (D[..., 2] >= D[..., 0])
yy, xx = np.mgrid[0:600, 0:1024]
win = np.zeros(shell.shape, bool)                                          # the window: per row, between the shell's
for y in range(14, 488):                                                   # outer walls, and not the shell itself
    c = np.nonzero(shell[y, 330:712])[0]
    if len(c) > 1:
        win[y, 330 + c.min():330 + c.max()] = True
win &= ~shell
win = np.asarray(Image.fromarray((win * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))
                 .filter(ImageFilter.GaussianBlur(3))).astype(float) / 255          # inset, so the rim's ring stays
mint = (R[..., 1] > R[..., 0] + 30) & (R[..., 1] > 150)
ring = np.asarray(Image.fromarray((mint * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
                  .filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
win = win * (1 - ring)                                                   # the seal ring is never painted over
rx, rn = R.max(2), R.min(2)
shellR = (rx < 95) & (rx - rn < 45) & (R[..., 2] >= R[..., 0])           # incubate's own shell, never painted over
shellR = np.asarray(Image.fromarray((shellR * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
                    .filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
core = np.asarray(Image.fromarray(((win > 0.5) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(41))) > 127
shellR = shellR * ~core                                                  # only at the rim (the pod's slate is not the shell)
win = win * (1 - shellR)
pod = ((xx - 512) / 100) ** 2 + ((yy - 330) / 110) ** 2 < 1
ref = (win > 0.9) & ~mint & ~pod
src = (win > 0.9)
mu_s, sd_s = D[src].mean(0), D[src].std(0) + 1e-3
mu_t, sd_t = R[ref].mean(0), R[ref].std(0)
graded = np.clip((D - mu_s) / sd_s * sd_t + mu_t, 0, 255)
out = R * (1 - win[..., None]) + graded * win[..., None]
# outside the registered still (a thin border at the top and left): extend the nearest registered pixel
v = np.asarray(valid) > 127
ys, xs = np.nonzero(v); top, left = ys.min(), xs.min()
out[:top] = out[top][None]
out[:, :left] = out[:, left][:, None]
Image.fromarray(out.astype(np.uint8)).save(out_p)
print('scale', round(s, 4), 'offset', round(ax, 1), round(ay, 1))
