# The house-style capsule set: code fixes so the four agree with each other (no repaint).
#   open:      the base bar recoloured to the closed painting's mint; the straw-orange moss colour-matched to the
#              closed painting's green moss (mean and spread per channel, inside a moss mask, pod excluded)
#   hatch-now: the warm curtain stripe at the left edge replaced by the closed painting's wall (same camera),
#              feathered; then the signed juvenile is composited over the redrawn one (composite-juvenile.py)
import sys, numpy as np
from PIL import Image, ImageFilter
D = sys.argv[1] if len(sys.argv) > 1 else '.'
ld = lambda n: np.asarray(Image.open(f'{D}/{n}-1024x600.png').convert('RGB')).astype(float)
lum = lambda a: a @ np.array([0.3, 0.59, 0.11])
closed, opn, hatch = ld('closed'), ld('open'), ld('hatch-now')

def moss_mask(a, box):
    x0, y0, x1, y1 = box; r = a[y0:y1, x0:x1]
    mx, mn = r.max(2), r.min(2); sat = (mx - mn) / (mx + 1)
    g = (sat > 0.22) & (r[..., 1] >= r[..., 2] + 8) & (lum(r) > 40)     # greenish-yellow moss, not the slate pod or soil
    g &= ~((r[..., 0] > r[..., 1] + 25))                                 # not the russet dots and ribs
    m = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255
    return m

# open: the straw-orange moss turned back toward the closed painting's green: the hue of moss pixels in the
# yellow-orange range is rotated toward the closed moss's mean hue; lightness is kept
import colorsys
cb, ob = (350, 340, 660, 460), (360, 340, 670, 500)
cm = moss_mask(closed, cb); cr = closed[cb[1]:cb[3], cb[0]:cb[2]][cm > 0.5] / 255
target_h = np.median([colorsys.rgb_to_hsv(*p)[0] for p in cr[::7]])
orr = opn[ob[1]:ob[3], ob[0]:ob[2]] / 255
yy, xx = np.mgrid[ob[1]:ob[3], ob[0]:ob[2]]
pod = ((xx - 510) / 94) ** 2 + ((yy - 330) / 102) ** 2 < 1              # the pod, left untouched
mx, mn = orr.max(2), orr.min(2); sat = (mx - mn) / (mx + 1e-3)
Lo = lum(orr * 255); om = ((sat > 0.2) & (Lo > 75) & (Lo < 200) & (yy > 362) & ~pod).astype(float)   # moss only: not the dark soil, not the cream wall
om = np.asarray(Image.fromarray((om * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255
hsv = np.array(Image.fromarray((orr * 255).astype(np.uint8)).convert('HSV')).astype(float) / 255
hue = hsv[..., 0]; band = ((hue > 0.0) & (hue < target_h)).astype(float) * om
hsv[..., 0] = hue + (target_h - hue) * 0.85 * band
hsv[..., 1] = hsv[..., 1] * (1 - 0.15 * band)
rgb = np.asarray(Image.fromarray((hsv * 255).astype(np.uint8), 'HSV').convert('RGB')).astype(float)
opn[ob[1]:ob[3], ob[0]:ob[2]] = orr * 255 * (1 - band[..., None]) + rgb * band[..., None]

# open: the bar to the closed bar's mint
def mint_of(a, box):
    x0, y0, x1, y1 = box; r = a[y0:y1, x0:x1].reshape(-1, 3); return r[lum(r) > 170].mean(0)
mint = mint_of(closed, (400, 505, 620, 535))
x0, y0, x1, y1 = (400, 515, 630, 565); reg = opn[y0:y1, x0:x1]; L = lum(reg)
w = np.clip((L - 70) / 140, 0, 1)[..., None]
opn[y0:y1, x0:x1] = (1 - w) * reg + w * np.clip(mint * (L / lum(mint))[..., None], 0, 255)

# hatch-now: the curtain stripe at the left replaced by the closed painting's wall, feathered at its right edge
X = 240; ramp = np.clip((X - np.arange(1024)) / 40, 0, 1)[None, :, None]
hatch = hatch * (1 - ramp) + closed * ramp

Image.fromarray(opn.clip(0, 255).astype(np.uint8)).save(f'{D}/open-fixed-1024x600.png')
Image.fromarray(hatch.clip(0, 255).astype(np.uint8)).save(f'{D}/hatch-now-wall-1024x600.png')
print('mint', mint.round(), 'moss target hue', round(float(target_h), 3))
