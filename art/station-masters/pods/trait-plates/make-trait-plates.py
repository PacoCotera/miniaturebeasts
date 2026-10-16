# Fix 5 Pods P-A4: the doing-trait plates for the chapter page, 128x160, cut by hand at 0 MXN from Pip's painted motion keys
# (concepts/mibi-motion-proof/keys): Drive = pip-air (mid-hop, with its own air shadow), Efficiency = pip-curl (curled to sleep).
# One scale for both (the hop's span to 120 px), so the two plates show one animal at one size; the ground (the keys' row 306) on
# plate row 152; centred on x 64. Reduced once with premultiplied alpha. Transparent outside the animal and its shadow.
# usage: python3 -I make-trait-plates.py KEYS_DIR OUT_DIR
import sys, os, numpy as np
from PIL import Image
kd, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
S = 120 / 281.0
def plate(key, name):
    a = np.asarray(Image.open(os.path.join(kd, key + '.png')).convert('RGBA')).astype(float)
    pm = a.copy(); pm[..., :3] *= pm[..., 3:] / 255
    w, h = round(304 * S), round(312 * S)
    r = np.asarray(Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    al = r[..., 3:]; rgb = np.where(al > 0, r[..., :3] * 255 / np.maximum(al, 1), 0)
    small = np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)
    ys, xs = np.where(small[..., 3] > 8); cx = (xs.min() + xs.max()) / 2
    o = Image.new('RGBA', (128, 160), (0, 0, 0, 0)); ox = round(64 - cx); oy = 152 - round(306 * S)
    o.paste(Image.fromarray(small, 'RGBA'), (ox, oy))
    o.save(os.path.join(out, name + '.png'))
plate('pip-air-304x312', 'trait-S01-drive-128x160')
plate('pip-curl-304x312', 'trait-S01-efficiency-128x160')
print('ok')
