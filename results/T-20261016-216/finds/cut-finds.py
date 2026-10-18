# The three finds at 112 were placed as opaque squares on the studio's navy ground (22, 42, 55). Recut with alpha:
# the ground is keyed by colour distance from the border's own median (soft ramp, so painted edges keep their
# antialiasing), the largest connected object is kept, and edge pixels take their opaque neighbours' colour.
import sys, numpy as np
from PIL import Image, ImageFilter
for src in sys.argv[1:]:
    a = np.asarray(Image.open(src).convert('RGB')).astype(float)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(border, 0)
    d = np.sqrt(((a - bg) ** 2).sum(2))
    alpha = np.clip((d - 8) / 40, 0, 1)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))).astype(float) / 255
    rgb = a.copy()
    semi = (alpha > 0.02) & (alpha < 0.98)                              # un-mix the navy from the soft edge and glow
    rgb[semi] = np.clip((a[semi] - (1 - alpha[semi, None]) * bg) / alpha[semi, None], 0, 255)
    known = alpha > 0.98
    for _ in range(4):
        acc = np.zeros_like(rgb); n = np.zeros(known.shape)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            k = np.roll(known, (dy, dx), (0, 1)); acc += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]; n += k
        grow = ~known & (n > 0) & (alpha > 0); rgb[grow] = acc[grow] / n[grow][:, None]; known |= grow
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(src.replace('.png', '-alpha.png'))
    print(src.split('/')[-1], 'ground', bg.round(), 'opaque %', round((alpha > 0.5).mean() * 100, 1))
