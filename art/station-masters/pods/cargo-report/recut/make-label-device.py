# T-20261016-128 (specs/station-lab-sweep.md §1 row 6): label-plate-cream-216x32 re-cut as a device plate (the id is kept for the build).
# The Station is a lab, and the report's title is part of the machine, not a paper label: a slab of the housing's own sage polymer,
# matte, r 3, its top and left arris lit and its bottom and right in shade (light from the top left), with a recessed field inset 4 x 4
# (its top and left inner walls in shade, its floor a step darker) where the title is engraved. The title stays ink #1a1725, which reads on
# the field at the contrast printed below. No cream, no paper, no gold, no sheen, no text.
# usage: python3 -I make-label-device.py W H OUT.png
import sys, numpy as np
from PIL import Image
W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
SAGE, EDGE, LIT, SHADE = np.array((150, 162, 128.)), np.array((88, 98, 76.)), np.array((182, 192, 158.)), np.array((112, 122, 94.))
FIELD = np.array((136, 148, 116.))
yy, xx = np.mgrid[0:H, 0:W] + .5; r = 3
cx = np.clip(xx, r, W - r); cy = np.clip(yy, r, H - r)
core = ((xx >= r) & (xx <= W - r)) | ((yy >= r) & (yy <= H - r))
d = np.where(core, np.minimum.reduce([xx, W - xx, yy, H - yy]), r - np.hypot(xx - cx, yy - cy))
rng = np.random.RandomState(128)
a = SAGE * (1.02 - 0.04 * (xx / W * .4 + yy / H * .6))[..., None] + rng.normal(0, 0.9, (H, W, 1))
ring2 = (d > 1) & (d <= 2)
tl = (xx - W / 2) / W + (yy - H / 2) / H * 3 < 0
a[ring2] = np.where(tl[ring2][:, None], LIT, SHADE)
a[(d > 0) & (d <= 1)] = EDGE
fi = (xx > 4) & (xx < W - 4) & (yy > 4) & (yy < H - 4)                  # the recessed field
a[fi] = (FIELD * (1.01 - 0.02 * (yy[fi] / H))[..., None] + rng.normal(0, 0.7, (int(fi.sum()), 1)))
a[fi & ((yy < 5.5) | (xx < 5.5))] = SHADE * 0.92                         # its top and left inner walls in shade
a[fi & ((yy > H - 5.5) | (xx > W - 5.5))] = LIT * 0.97                  # its bottom and right inner walls catch the light
al = np.clip(d + .5, 0, 1) * 255
img = np.dstack([np.clip(np.round(a), 0, 255), np.round(al)]).astype(np.uint8); img[al == 0, :3] = 0
Image.fromarray(img, "RGBA").save(out)
lum = lambda c: (lambda l: 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2])(np.where(np.asarray(c) / 255 <= .04045, np.asarray(c) / 255 / 12.92, ((np.asarray(c) / 255 + .055) / 1.055) ** 2.4))
print("ink on the field: %.1f:1" % ((lum(FIELD) + .05) / (lum((0x1a, 0x17, 0x25)) + .05)))
