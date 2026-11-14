"""Crops of sprites on the house ground, side by side: python tools/zoom.py OUT.png ZOOM x0,y0,x1,y1 label=path ...   (cadvenv python)"""
import sys
from PIL import Image, ImageDraw
GROUND = (0xD6, 0xCE, 0xBE, 255)
out, z, box = sys.argv[1], int(sys.argv[2]), tuple(int(v) for v in sys.argv[3].split(","))
ims = []
for kv in sys.argv[4:]:
    k, p = kv.split("=", 1); im = Image.open(p).convert("RGBA"); bg = Image.new("RGBA", im.size, GROUND); bg.alpha_composite(im)
    c = bg.crop(box).resize(((box[2] - box[0]) * z, (box[3] - box[1]) * z), Image.NEAREST); ims.append(c)
W = sum(i.width for i in ims) + 8 * (len(ims) - 1); H = ims[0].height
s = Image.new("RGB", (W, H), (255, 255, 255)); x = 0
for i in ims: s.paste(i.convert("RGB"), (x, 0)); x += i.width + 8
s.save(out)
