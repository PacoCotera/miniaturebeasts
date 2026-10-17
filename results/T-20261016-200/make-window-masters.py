#!/usr/bin/env python3
"""T-20261016-200: Home's window with the four real version 4 pods, drawn from the cut master layers: the bare base
key, its coat recoloured by the calibrated ramp (or the two-tone through the zone mask), the mark layer(s), then
the crest overlay when the crown is read as crest. Eye rings stay the base's "between": the ring overlays are owed.

  python3 -I make-window-masters.py KEYS_DIR LAYERS_DIR GLASS_PNG OUT
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
KEYS, LAY, GLASS, OUT = sys.argv[1:5]
ramps = json.load(open(os.path.join(LAY, 'ramps.json')))['ramps']
PODS = [(165, 'charcoal', 'patches', 'crest'), (168, 'russet', 'stripes', 'crest'),
        (10, 'charcoal and ash', 'stripes and patches', 'bare'), (116, 'ash', 'patches', 'crest')]
SPOTS = [(140, 326, 150), (500, 270, 118), (420, 384, 140), (250, 436, 128)]   # T-190's ground rows


def ramp_paint(a, m, ramp):
    lum = a[..., :3].mean(2); v = lum[m]; lo, hi = np.percentile(v, 5), np.percentile(v, 97)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1); s, md, h = [np.array(c, float) for c in ramp]
    col = np.where((t < .5)[..., None], s + (md - s) * (t / .5)[..., None], md + (h - md) * ((t - .5) / .5)[..., None])
    return col + (lum - np.asarray(Image.fromarray(lum.astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), float))[..., None] * .9


def stand(kind, key, colour, marks, crown):
    b = Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-base-{key}-304x312.png')).convert('RGBA')
    a = np.asarray(b, dtype=float).copy()
    m = np.asarray(Image.open(os.path.join(LAY, f'mibi-{kind}-S01-{key}-fur-mask-304x312.png'))) > 127
    soft = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.7)), float)[..., None] / 255
    pig = colour.split(' and ')
    if pig != ['charcoal']:
        cols = [a[..., :3] if p == 'charcoal' else ramp_paint(a, m, ramps[p][kind]) for p in pig]
        if len(cols) == 2:
            z = np.asarray(Image.open(os.path.join(LAY, f'mibi-{kind}-S01-{key}-zone-mask-304x312.png')), float)[..., None] / 255
            col = cols[0] * (1 - z) + cols[1] * z
        else:
            col = cols[0]
        a[..., :3] = a[..., :3] * (1 - soft) + col * soft
    img = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    for look in ('patches', 'stripes'):
        if look in marks:
            img.alpha_composite(Image.open(os.path.join(LAY, f'mibi-{kind}-S01-{key}-{look}-304x312.png')))
    if crown == 'crest':
        img.alpha_composite(Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-{key}-crest-304x312.png')).convert('RGBA'))
    return img.crop(img.getbbox())


def contact(w, h, alpha):
    s = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=int(255 * alpha))
    o = Image.new('RGBA', s.size, (20, 16, 10, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3)))
    return o


win = Image.open(GLASS).convert('RGBA')
base_h = stand('adult', 'anchor', 'charcoal', '', 'bare').height
for i in sorted(range(4), key=lambda i: SPOTS[i][1]):
    gs, col, marks, crown = PODS[i]
    s = stand('adult', 'anchor' if i != 1 else 'stand', col, marks, crown)
    x, y, h = SPOTS[i]
    s = s.resize((round(s.width * h / base_h), round(s.height * h / base_h)), Image.LANCZOS)
    if i in (1, 2):
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    cw = int(s.width * 0.42)
    win.alpha_composite(contact(cw, 12, 0.62), (x - cw, y - 14))
    win.alpha_composite(s, (x - s.width // 2, y - s.height))
win = win.crop((0, 0, 640, 488))
win.convert('RGB').save(os.path.join(OUT, 'home-window-four-v4-masters.png'), optimize=True)
wa = np.asarray(win.convert('RGB'), float); lum = wa @ np.array([.299, .587, .114])
q = np.choose(np.digitize(lum, [64, 128, 192]), [30, 100, 170, 240]).astype('uint8')
Image.fromarray(q, 'L').save(os.path.join(OUT, 'home-window-four-v4-masters-four-grey.png'))
print('home-window-four-v4-masters.png and its four-grey')
