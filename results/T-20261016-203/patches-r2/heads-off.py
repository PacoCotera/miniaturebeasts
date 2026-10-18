import os, sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
D = sys.argv[1]
HEADS = {  # head ellipse (cx, cy, rx, ry) in the 304x312 key; marks inside are removed (no patches on the head)
 'adult-air': (95, 110, 80, 75), 'adult-anchor': (105, 115, 82, 75), 'adult-blink': (105, 115, 82, 75),
 'adult-crouch': (85, 225, 75, 60), 'adult-curl': (95, 230, 80, 55), 'adult-stand': (100, 145, 85, 65),
 'juvenile-air': (215, 155, 52, 45), 'juvenile-anchor': (196, 165, 52, 45), 'juvenile-crouch': (212, 203, 52, 45),
 'juvenile-curl': (193, 240, 52, 45), 'juvenile-stand': (205, 172, 52, 45)}
EXTRA = {'adult-air': [(244, 150, 284, 215)]}   # the air key's narrow upright rump patch, a near-crescent
W = Image.new('RGB', (6 * 304, 2 * 312), (60, 70, 50))
for key, (cx, cy, rx, ry) in HEADS.items():
    kind, k = key.split('-')
    lay = Image.open(os.path.join(D, f'raw-{kind}-{k}.png')).convert('RGBA')
    m = Image.new('L', (304, 312), 255); ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=0)
    for ex in EXTRA.get(key, []): ImageDraw.Draw(m).ellipse(ex, fill=0)
    m = m.filter(ImageFilter.GaussianBlur(2))
    a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3].astype(float) * np.asarray(m) / 255).astype(np.uint8)
    out = Image.fromarray(a, 'RGBA'); out.save(os.path.join(D, f'mibi-{kind}-S01-{k}-patches-304x312.png'))
    b = Image.open(os.path.join(D, '..', 'keys', f'mibi-{kind}-S01-base-{k}-304x312.png')).convert('RGBA'); b.alpha_composite(out)
    d = ImageDraw.Draw(b); d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=(255, 0, 0, 160))
    i = ['air', 'anchor', 'blink', 'crouch', 'curl', 'stand'].index(k) if kind == 'adult' else ['air', 'anchor', 'crouch', 'curl', 'stand'].index(k)
    W.paste(b.convert('RGB'), (i * 304, (kind == 'juvenile') * 312), b)
W.save(os.path.join(D, 'heads-contact.png'))
