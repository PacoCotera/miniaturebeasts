# Gate batch 1, AR7: label-plate-cream-<w>x<h>, the board's cream label plate (concept board frame 1: the module labels, measured
# mean (229, 220, 203)). Matte cream, a rounded slab r 3: its face flat, a 1 px darker edge all round, the top and left arris
# lit, the bottom and right arris in shade (light from the top left). No gold, no sheen, no text. ink #1a1725 reads on it at 13:1.
# usage: python3 -I make-label-cream.py W H OUT.png
import sys, numpy as np
from PIL import Image
W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
CREAM, EDGE, LIT, SHADE = np.array((229, 220, 203.)), np.array((150, 143, 132.)), np.array((244, 238, 226.)), np.array((198, 189, 172.))
yy, xx = np.mgrid[0:H, 0:W] + .5; r = 3
cx = np.clip(xx, r, W - r); cy = np.clip(yy, r, H - r)
core = ((xx >= r) & (xx <= W - r)) | ((yy >= r) & (yy <= H - r))
d = np.where(core, np.minimum.reduce([xx, W - xx, yy, H - yy]), r - np.hypot(xx - cx, yy - cy))
rng = np.random.RandomState(5)
a = CREAM * (1.015 - 0.03 * (xx / W * .4 + yy / H * .6))[..., None] + rng.normal(0, 0.8, (H, W, 1))
ring2 = (d > 1) & (d <= 2)
tl = (xx - W / 2) / W + (yy - H / 2) / H * 3 < 0                      # the top / left half of the slab's arris
a[ring2] = np.where(tl[ring2][:, None], LIT, SHADE)
a[(d > 0) & (d <= 1)] = EDGE
al = np.clip(d + .5, 0, 1) * 255
img = np.dstack([np.clip(np.round(a), 0, 255), np.round(al)]).astype(np.uint8); img[al == 0, :3] = 0
Image.fromarray(img, 'RGBA').save(out)
lin = lambda c: np.where(c / 255 <= .04045, c / 255 / 12.92, ((c / 255 + .055) / 1.055) ** 2.4)
L = lambda c: lin(np.asarray(c, float)) @ [.2126, .7152, .0722]
print('ink on cream', round(float((L(a[H // 2, W // 4]) + .05) / (L((0x1a, 0x17, 0x25)) + .05)), 2))
