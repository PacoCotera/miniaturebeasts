#!/usr/bin/env python3
"""The r4 vivarium pane's day master from the studio's tall painting (masters-pods vivarium-day-tall, sheet b):
rows 200-1200 at the pane's aspect, from the burrow side, reduced (never enlarged) to 384 x 497. Then the same resident
proof as route 1, for comparison.

  python3 -I cut-tall-master.py TALL_B DAY_MASTER KEYS_DIR OUT
"""
import os, sys
from PIL import Image
TALL, DAY, KEYS, OUT = sys.argv[1:5]
PW, PH = 384, 497
src = Image.open(TALL).convert('RGB')
top, bottom = 200, 1200
w = round((bottom - top) * PW / PH)
master = src.crop((0, top, w, bottom)).resize((PW, PH), Image.LANCZOS)
master.save(os.path.join(OUT, 'vivarium-pane-day-384x497.png'))
here = os.path.dirname(os.path.abspath(__file__))
code = open(os.path.join(here, 'make-pane-crop.py')).read()
g = {'__name__': 'lib'}
exec(code[:code.index('sheet = Image.new')].replace("DAY, KEYS, LAY, OUT = sys.argv[1:5]", "DAY, KEYS, LAY, OUT = %r, %r, None, %r" % (DAY, KEYS, OUT)), g)
g['src'] = master.convert('RGBA').resize((PW, 568 if False else PH))
g['src'] = Image.new('RGBA', (PW, 568)); g['src'].paste(master.convert('RGBA'), (0, 568 - PH))
proof_new = g['pane'](0)
g['src'] = Image.open(DAY).convert('RGBA')
proof_old = g['pane'](0)
from PIL import ImageDraw
sheet = Image.new('RGB', (PW * 2 + 48, PH + 60), (12, 10, 18)); d = ImageDraw.Draw(sheet)
for i, (im, lab) in enumerate(((proof_old, 'route 1: crop of the 1024x568 master'), (proof_new, 'route 2: the tall master (studio b, rows 200-1200)'))):
    sheet.paste(im.convert('RGB'), (16 + i * (PW + 16), 44)); d.text((16 + i * (PW + 16), 14), lab, fill=(241, 235, 223))
sheet.save(os.path.join(OUT, 'pane-r4-route1-vs-tall.png'))
print('vivarium-pane-day-384x497.png, pane-r4-route1-vs-tall.png')
