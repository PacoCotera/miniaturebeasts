#!/usr/bin/env python3
"""Copies the art desk's signed stands for the care moments into art/moment/ once (rule 15: nothing reads mibi-art at run time).
Each source stand is scaled down with an area filter to fit 280x300, keeping its aspect, and written as a 280x300 canvas with
the figure centred across and its bottom at the canvas bottom (the foot anchor: the game aligns the figure's lowest row to the
token's). Alpha is cut to 0 or 255 after the scale so the figure adds only opaque colours to the screen.
Usage: build-moment-stands.py <out dir> <S01 src> <S02 src> <S03 src>   (a source of "-" is skipped)"""
import sys
from PIL import Image

W, H = 280, 300
out = sys.argv[1]
for sid, src in zip(("S01", "S02", "S03"), sys.argv[2:5]):
    if src == "-":
        continue
    im = Image.open(src).convert("RGBA")
    k = min(W / im.width, H / im.height)
    if k > 1:
        raise SystemExit(sid + ": source " + str(im.size) + " is smaller than the box: not an area-filter case")
    nw, nh = round(im.width * k), round(im.height * k)
    # premultiply so transparent pixels do not bleed into the average
    r, g, b, a = im.split()
    pm = Image.merge("RGBA", (Image.composite(r, Image.new("L", im.size, 0), a), Image.composite(g, Image.new("L", im.size, 0), a), Image.composite(b, Image.new("L", im.size, 0), a), a))
    sm = pm.resize((nw, nh), Image.BOX)
    px = sm.load()
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cp = canvas.load()
    ox, oy = (W - nw) // 2, H - nh
    for y in range(nh):
        for x in range(nw):
            r2, g2, b2, a2 = px[x, y]
            if a2 >= 128:
                s = 255.0 / a2
                cp[ox + x, oy + y] = (min(255, round(r2 * s)), min(255, round(g2 * s)), min(255, round(b2 * s)), 255)
    canvas.save(out + "/stand-" + sid + "-280x300.png")
    print(sid, im.size, "->", (nw, nh), "at", (ox, oy), "colours", len(set(canvas.getdata())))
