# Fix 5 Pods P-A3: mibi-halo-empty-128x160 at (400, 232), the empty halo before Identify: the halo's soft mist alone, no silhouette,
# cut by hand from the signed halo set (its own mist colour, from mibi-halo-S01..S16-128x160-mist). One quiet upright oval,
# dimmer than any figure (alpha at most 56, against the figures' 107-115), so it reads as "something will stand here", not a creature.
# usage: python3 -I make-halo-empty.py SLICES_DIR OUT_DIR
import sys, os, glob, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
cols = []
for f in sorted(glob.glob(os.path.join(sl, 'mibi-halo-S*-128x160-mist.png'))):
    a = np.asarray(Image.open(f).convert('RGBA')).astype(float); m = a[..., 3] > 60; cols.append(a[m][:, :3].mean(0))
mist = np.mean(cols, 0)
yy, xx = np.mgrid[0:160, 0:128]
d = np.hypot((xx + .5 - 64) / 46, (yy + .5 - 92) / 62)                    # the oval where a figure stands, its foot near the bottom
alpha = np.clip(1 - d, 0, 1) ** 1.3 * 56
alpha = nd.gaussian_filter(alpha, 3)
rgba = np.zeros((160, 128, 4), np.uint8); rgba[..., :3] = np.round(mist).astype(np.uint8); rgba[..., 3] = np.round(alpha).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'mibi-halo-empty-128x160.png'))
print('mist', mist.round(), 'alpha max', int(alpha.max()))
