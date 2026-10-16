"""Gate batch 1 F2-A6: rail-tab-fill-open-full-152x40 recut as the board's cream label plate (AD, 10-15). Same id, size,
slant (16) and alpha as the signed piece (pass 83's opaque right-end bevel kept): only the colours change. The face is the cream of
label-plate-cream (229, 220, 203), with the same quiet fall toward the lower right; the signed 1 px bevel ring becomes the 1 px darker
edge (its anti-aliased steps kept as blends toward it); the ring inside it is lit on the top row and the left slant, in shade on the
bottom row and the right slant. Matte, no gold. ink #1a1725 reads on the face at 13:1.
usage: python3 -I make-tab-open-cream.py SIGNED_OPEN.png OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1:3]
a = np.asarray(Image.open(src).convert('RGBA')).astype(float); H, W = a.shape[:2]
FILL, BEV = np.array((60, 75, 87.)), np.array((90, 102, 114.))
CREAM, EDGE, LIT, SHADE = np.array((229, 220, 203.)), np.array((150, 143, 132.)), np.array((244, 238, 226.)), np.array((198, 189, 172.))
op = a[..., 3] > 0
t = np.clip(((a[..., :3] - FILL) @ (BEV - FILL)) / ((BEV - FILL) @ (BEV - FILL)), 0, 1)   # 0 on the face, 1 on the bevel
face = op & (t < 0.05)
yy, xx = np.mgrid[0:H, 0:W].astype(float)
rng = np.random.RandomState(5)
c = CREAM * (1.015 - 0.03 * (xx / W * .4 + yy / H * .6))[..., None] + rng.normal(0, 0.8, (H, W, 1))
ring = face & ~nd.binary_erosion(face, border_value=0)               # the face's own outer ring, inside the edge
# which side: the top row and the left slant face the light; the bottom row and the right slant do not
mid = W / 2 + (yy - H / 2) * (16 / H)                                 # the slant's centre line at each row
top, bot = yy < 3, yy > H - 4
lit = top | ((xx < mid) & ~bot)
c[ring] = np.where(lit[ring][:, None], LIT, SHADE)
c = np.where((op & ~face)[..., None], c * (1 - t[..., None]) + EDGE * t[..., None], c)
o = np.dstack([np.clip(np.round(c), 0, 255), a[..., 3]]).astype(np.uint8); o[~op, :3] = 0
Image.fromarray(o, 'RGBA').save(out)
lin = lambda v: np.where(v / 255 <= .04045, v / 255 / 12.92, ((v / 255 + .055) / 1.055) ** 2.4)
L = lambda v: lin(np.asarray(v, float)) @ [.2126, .7152, .0722]
print('ink on face', round(float((L(o[face][:, :3].mean(0)) + .05) / (L((0x1a, 0x17, 0x25)) + .05)), 2), 'alpha same', bool((o[..., 3] == a[..., 3]).all()))
