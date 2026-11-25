#!/usr/bin/env python3
# paths-gen-build-2 stills (a DIAGRAM, rule 18: code draws ground classes and boxes, never art): the generator's place, before (main) and after (the branch), side by side at 16 px a tile.
# usage: stills.py <before.json> <after.json> <out.png>
# Ground colours are the signed fills (grass 116,166,93; sand 210,176,111); every other class is a flat diagram colour. A keepers' place is a named EMPTY SLOT: its box outlined, its blocked tiles hatched, its yard dotted.
import json, sys
from PIL import Image, ImageDraw
TILE = 16
COL = {1: (40, 80, 150), 2: (80, 140, 200), 3: (232, 214, 150), 5: (210, 176, 111), 6: (116, 166, 93), 7: (150, 120, 80), 8: (140, 140, 140), 9: (50, 100, 60), 10: (100, 150, 90), 11: (130, 150, 90), 12: (150, 160, 100), 13: (110, 160, 100), 14: (170, 170, 160), 19: (210, 176, 111), 20: (150, 190, 200), 21: (120, 90, 60)}
def draw(d, label):
    rows = d['rows']; h = len(rows); w = len(rows[0]); im = Image.new('RGB', (w * TILE, h * TILE + 18), (30, 30, 30)); g = ImageDraw.Draw(im)
    for y, r in enumerate(rows):
        for x, t in enumerate(r): g.rectangle([x * TILE, y * TILE + 18, x * TILE + TILE - 1, y * TILE + TILE - 1 + 18], fill=COL.get(t, (200, 0, 200)))
    k = d.get('keepers')
    if k:
        ox, oy = -1, -1  # the plan's frame has the apron: tile (x, y) of the frame is inner (x-1, y-1)
        for bx, by, bw, bh in k['block']:
            for yy in range(by, by + bh):
                for xx in range(bx, bx + bw): g.rectangle([(xx + ox) * TILE, (yy + oy) * TILE + 18, (xx + ox) * TILE + TILE - 1, (yy + oy) * TILE + TILE - 1 + 18], fill=(70, 50, 40))
        y0 = k['yard']; g.rectangle([(y0['x'] + ox) * TILE, (y0['y'] + oy) * TILE + 18, (y0['x'] + y0['w'] + ox) * TILE - 1, (y0['y'] + y0['h'] + oy) * TILE + 17], outline=(255, 255, 255))
        g.rectangle([(k['x'] + ox) * TILE, (k['y'] + oy) * TILE + 18, (k['x'] + k['w'] + ox) * TILE - 1, (k['y'] + k['h'] + oy) * TILE + 17], outline=(255, 60, 60), width=2)
        g.text(((k['x'] + ox) * TILE + 2, (k['y'] + oy) * TILE + 20), '[' + (k['piece'] or 'slot: ' + k['kind']) + ']', fill=(255, 255, 255))
    g.text((2, 3), label, fill=(255, 255, 255)); return im
b, a, out = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3]
L = draw(b, 'before (main): seed %d place %d,%d' % (b['seed'], b['lx'], b['ly'])); R = draw(a, 'after: %s' % (a['kind'] or 'no keepers\' place'))
im = Image.new('RGB', (L.width + R.width + 8, L.height), (0, 0, 0)); im.paste(L, (0, 0)); im.paste(R, (L.width + 8, 0)); im.save(out)
