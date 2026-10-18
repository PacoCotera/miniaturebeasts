import os, sys, json, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(sys.argv[4]).read().split('os.makedirs(OUT')[0]
sys.argv = [sys.argv[0]] + sys.argv[1:4]
exec(src)
OUTD = OUT; os.makedirs(OUTD, exist_ok=True)
sheets = {'M1': Image.open(os.path.join(SHEETS, 'M1-r2-loika-v4-adult-patches-1264x848.jpg')).convert('RGB'),
          'M3': Image.open(os.path.join(SHEETS, 'M3-r2-loika-v4-juvenile-patches-1264x848.jpg')).convert('RGB')}
sheet = Image.new('RGB', (6 * 304, 2 * 312), (60, 70, 50))
for row, (kind, keys, sh) in enumerate((('adult', ADULT, 'M1'), ('juvenile', JUV, 'M3'))):
    for i, k in enumerate(keys):
        b = base(kind, k); m = fur_mask(b); box, rect = placement(b, SC[kind], i)
        lay = mark_layer(back_to_key(sheets[sh], box, rect), b, m)
        lay.save(os.path.join(OUTD, f'raw-{kind}-{k}.png'))
        c = b.copy(); c.alpha_composite(lay); d = ImageDraw.Draw(c)
        for g in range(0, 304, 50): d.line((g, 0, g, 311), fill=(255, 255, 0, 90))
        for g in range(0, 312, 50): d.line((0, g, 303, g), fill=(255, 255, 0, 90))
        sheet.paste(c.convert('RGB'), (i * 304, row * 312), c)
sheet.save(os.path.join(OUTD, 'raw-contact.png'))
