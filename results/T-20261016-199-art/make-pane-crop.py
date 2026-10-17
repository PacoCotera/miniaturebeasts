#!/usr/bin/env python3
"""The r4 vivarium pane (384 x 497 at 1x), route 1: a crop of the existing day master (1024 x 568), no upscaling,
with residents placed per r4 (two adults low centre-left, one adult and a small guest mid-right, a juvenile and a
cocoa resident along the bottom). Two crops: the burrow side and the centre. Shows how much of the pane the floor fills.

  python3 -I make-pane-crop.py DAY_MASTER KEYS_DIR LAYERS_DIR OUT
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
DAY, KEYS, LAY, OUT = sys.argv[1:5]
src = Image.open(DAY).convert('RGBA')
PW, PH = 384, 497


def stand(kind, k, crest=True, h=118):
    b = Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-base-{k}-304x312.png')).convert('RGBA')
    if crest:
        b.alpha_composite(Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-{k}-crest-304x312.png')).convert('RGBA'))
    b = b.crop(b.getbbox())
    return b.resize((round(b.width * h / b.height), h), Image.LANCZOS)


def contact(w, h):
    s = Image.new('L', (w * 2, h * 2), 0); ImageDraw.Draw(s).ellipse((w // 2, h // 2, w * 3 // 2, h * 3 // 2), fill=150)
    o = Image.new('RGBA', s.size, (20, 16, 10, 0)); o.putalpha(s.filter(ImageFilter.GaussianBlur(h / 3))); return o


def pane(x0):
    p = src.crop((x0, 568 - PH, x0 + PW, 568)).copy()
    for kind, k, fx, fy, h, flip in (('adult', 'anchor', .30, .80, 112, False), ('adult', 'stand', .52, .86, 116, False),
                                     ('adult', 'anchor', .78, .70, 96, True), ('juvenile', 'anchor', .62, .68, 56, True),
                                     ('juvenile', 'stand', .22, .97, 64, False), ('adult', 'curl', .82, .98, 80, True)):
        s = stand(kind, k, h=h)
        if flip: s = s.transpose(Image.FLIP_LEFT_RIGHT)
        x, y = int(PW * fx), int(PH * fy)
        cw = int(s.width * .42); p.alpha_composite(contact(cw, 10), (x - cw, y - 12))
        p.alpha_composite(s, (x - s.width // 2, y - s.height))
    m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), 12, fill=255)
    out = Image.new('RGBA', (PW, PH), (29, 35, 43, 255)); out.paste(p, (0, 0), m)
    return out


sheet = Image.new('RGB', (PW * 2 + 48, PH + 60), (12, 10, 18)); d = ImageDraw.Draw(sheet)
for i, (x0, lab) in enumerate(((0, 'burrow side (x 0-383)'), (300, 'centre (x 300-683)'))):
    pn = pane(x0)
    sheet.paste(pn.convert('RGB'), (16 + i * (PW + 16), 44))
    d.text((16 + i * (PW + 16), 14), 'route 1, ' + lab, fill=(241, 235, 223))
    # the floor line: where the ground starts in this crop (~y 330 of the source)
    fl = 330 - (568 - PH)
    d.line((16 + i * (PW + 16), 44 + fl, 16 + i * (PW + 16) + 10, 44 + fl), fill=(255, 168, 63), width=2)
sheet.save(os.path.join(OUT, 'pane-r4-route1-crops.png'))
print('floor starts at', 330 - (568 - PH), 'of', PH, '=', round(1 - (330 - (568 - PH)) / PH, 2), 'of the pane is floor and soil')
