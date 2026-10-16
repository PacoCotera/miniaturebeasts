"""Cargo rework (AD, 10-15): pod-{collection,large,medium,small,well}-unknown repainted, the same ids and sizes. The flat grey
(#6e6e72) read at 1x as a placeholder, not as a thing found in the field. The pod before its species is known is now a found field
egg, as the eggs in the Probe's own window (station-probe-merge): a warm sand shell (#be9c72 in the light, through the pod's own shade
layer) freckled with irregular bark-brown speckles (seeded, sized to the class, denser toward the lower right), a cream cap and ribs
(#e6dcc6), a little earth dust on the foot; the sealing band on; no pattern layer. Still never a species colour pair: no species pod
is sand and speckled. The speckle grain is fixed per class (seed by class), so every unknown pod of a class is the same picture.
usage: python3 -I paint-unknown-pod.py SLICES_DIR [OUT_DIR]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else sl
SHELL, CREAM, SPECK, DUST = np.array([190, 156, 114.]), np.array([230, 220, 198.]), np.array([110, 72, 46.]), np.array([120, 96, 70.])
for i, cls in enumerate(("collection", "large", "medium", "small", "well")):
    L = lambda n: np.asarray(Image.open(os.path.join(sl, f"pod-{cls}-{n}.png")).convert("RGBA")).astype(float) / 255
    shade = L("shade"); sh = shade[..., 0:1]; body = L("mask-body")[..., 3]; acc = np.clip(L("mask-accent")[..., 3], 0, 1)
    H, W = body.shape; rng = np.random.RandomState(31 + i)
    yy, xx = np.mgrid[0:H, 0:W]
    # speckles: irregular blots of 1-3 px at this size, denser toward the lower right
    sp = np.zeros((H, W))
    n = int(W * H / 34)
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        if rng.uniform() > 0.45 + 0.5 * ((x / W + y / H) / 2): continue
        r = rng.choice([0.6, 0.8, 1.0, 1.5, 2.1], p=[.3, .3, .2, .13, .07]) * max(1.0, W / 72)
        sp = np.maximum(sp, np.clip(1.2 - np.hypot((xx + .5 - x) / r, (yy + .5 - y) / (r * rng.uniform(0.7, 1.2))), 0, 1))
    sp = nd.gaussian_filter(sp, 0.35) * rng.uniform(0.75, 1.0)
    shell = SHELL * (1 - 0.75 * sp[..., None]) + SPECK * 0.75 * sp[..., None]
    # dust on the foot: the bottom 14 % of the body
    rows = np.where(body.max(1) > 0.5)[0]; foot = (yy > rows.max() - (rows.max() - rows.min()) * 0.14)
    dust = foot * np.clip(nd.gaussian_filter(rng.uniform(size=(H, W)), 1.2) * 3 - 1.1, 0, 0.5)
    shell = shell * (1 - dust[..., None]) + DUST * dust[..., None]
    col = shell * (1 - acc[..., None]) + CREAM * acc[..., None]
    col = np.clip(col / 255 * np.clip(sh * 2, 0, 1), 0, 1) * body[..., None] + np.clip(col / 255 * np.clip(sh * 2, 0, 1), 0, 1) * (1 - body[..., None])
    im = Image.fromarray((np.concatenate([col, shade[..., 3:4]], 2) * 255).astype(np.uint8), "RGBA")
    im.alpha_composite(Image.open(os.path.join(sl, f"pod-{cls}-band.png")).convert("RGBA"))
    im.save(os.path.join(out, f"pod-{cls}-unknown.png")); print(cls, (W, H))
