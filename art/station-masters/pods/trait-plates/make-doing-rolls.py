"""Create's doing rolls (UI/UX ruling 10-15): roll-S01-drive-128x72 and roll-S01-efficiency-128x72, no look suffix, one picture for
every value as the Pods doing plates (P7). Each is the signed trait-S01-drive / -efficiency 128x160 plate's figure (its opaque bbox,
shadow included) reduced by area, never enlarged, into the roll's centred 75 percent (96x54), set on the roll's cell tone #162a37
as the signed look rolls are. usage: make-doing-rolls.py SLICES_DIR"""
import sys, os, numpy as np
from PIL import Image
sl = sys.argv[1]; GROUND = (0x16, 0x2a, 0x37, 255)
for t in ('drive', 'efficiency'):
    p = Image.open(os.path.join(sl, f'trait-S01-{t}-128x160.png')).convert('RGBA'); a = np.asarray(p)
    ys, xs = np.where(a[..., 3] > 8); crop = p.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    sc = min(96 / crop.width, 54 / crop.height, 1.0); w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
    pm = np.asarray(crop).astype(float); pm[..., :3] *= pm[..., 3:] / 255
    r = np.asarray(Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)).astype(float)
    al = r[..., 3:] / 255; r[..., :3] = np.where(al > 0, r[..., :3] / np.maximum(al, 1e-6), 0)
    fig = Image.fromarray(np.clip(np.round(r), 0, 255).astype(np.uint8), 'RGBA')
    out = Image.new('RGBA', (128, 72), GROUND); out.alpha_composite(fig, ((128 - w) // 2, (72 - h) // 2))
    out.save(os.path.join(sl, f'roll-S01-{t}-128x72.png')); print(t, 'scale', round(sc, 3), (w, h))
