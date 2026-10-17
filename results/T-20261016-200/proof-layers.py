#!/usr/bin/env python3
"""Proof of the cut layers: every key as base, base + patches, base + stripes, and the anchor recoloured by the
calibrated ramps beside M5's painted anchor. 1x on the station ground.

  python3 -I proof-layers.py KEYS_DIR SHEETS_DIR LAYERS_DIR OUT
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
KEYS, SHEETS, LAY, OUT = sys.argv[1:5]
ADULT = ['air', 'anchor', 'blink', 'crouch', 'curl', 'stand']; JUV = ['air', 'anchor', 'crouch', 'curl', 'stand']
G = (29, 35, 43)
F = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(LAY)), '..', 'Inter-Regular.ttf'), 13) if False else ImageFont.load_default()
ramps = json.load(open(os.path.join(LAY, 'ramps.json')))['ramps']


def ld(n):
    return Image.open(os.path.join(LAY, n))


def key(kind, k):
    return Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-base-{k}-304x312.png')).convert('RGBA')


def recolour(b, m, ramp, ref):
    a = np.asarray(b, dtype=float).copy(); rr = np.array(ref, float); s, md, h = [np.array(c, float) for c in ramp]
    lum = a[..., :3].mean(2); v = lum[m]; lo, hi = np.percentile(v, 5), np.percentile(v, 97)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
    col = np.where((t < .5)[..., None], s + (md - s) * (t / .5)[..., None], md + (h - md) * ((t - .5) / .5)[..., None])
    a[m, :3] = col[m]
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')


rows = [('adult', k) for k in ADULT] + [('juvenile', k) for k in JUV]
CW = 160
sheet = Image.new('RGB', (CW * 3 + 120, 40 + len(rows) * 168), G); d = ImageDraw.Draw(sheet)
d.text((10, 10), 'cut layers: base | + patches | + stripes (0 px outside the coat)', fill=(241, 235, 223))
for r, (kind, k) in enumerate(rows):
    b = key(kind, k); y = 40 + r * 168
    d.text((10, y + 70), f'{kind[:3]} {k}', fill=(198, 196, 216))
    for c, look in enumerate((None, 'patches', 'stripes')):
        im = b.copy()
        if look:
            im.alpha_composite(ld(f'mibi-{kind}-S01-{k}-{look}-304x312.png'))
        im = im.resize((152, 156), Image.LANCZOS)
        sheet.paste(Image.new('RGB', im.size, G), (120 + c * CW, y)); sheet.paste(im, (120 + c * CW, y), im)
sheet.save(os.path.join(OUT, 'proof-cut-layers.png'))
# the ramps against M5
m5 = Image.open(os.path.join(SHEETS, 'M5-loika-v4-pigments-1264x848.jpg')).convert('RGB').resize((632, 424))
s2 = Image.new('RGB', (632 + 16 + 632, 424 + 30), G); d2 = ImageDraw.Draw(s2)
d2.text((10, 8), "M5 (painted)  |  the ramps on the base anchor (coded)", fill=(241, 235, 223))
s2.paste(m5, (0, 30))
cell = Image.new('RGB', (632, 424), (255, 0, 255))
for row, pig in ((0, 'russet'), (1, 'ash')):
    for col, kind in ((0, 'adult'), (1, 'juvenile')):
        b = key(kind, 'anchor'); m = np.asarray(ld(f'mibi-{kind}-S01-anchor-fur-mask-304x312.png')) > 127
        im = recolour(b, m, ramps[pig][kind], None).resize((200, 205), Image.LANCZOS)
        cell.paste(im, (col * 316 + 58, row * 212 + 4), im)
s2.paste(cell, (648, 30))
s2.save(os.path.join(OUT, 'proof-ramps-vs-m5.png'))
print('proof-cut-layers.png proof-ramps-vs-m5.png')
