import sys, os, json
from PIL import Image, ImageDraw
man = json.load(open("slices/manifest.json")); names = sorted(man)
if len(sys.argv) > 2: names = [n for n in names if any(p in n for p in sys.argv[2].split(","))]
bg = (28, 38, 50, 255); pad = 10; W = 1000
x = y = pad; rowh = 0; items = []
for n in names:
    im = Image.open(f"slices/{n}.png")
    if x + im.width + pad > W: x = pad; y += rowh + pad + 12; rowh = 0
    items.append((n, im, x, y)); x += im.width + pad; rowh = max(rowh, im.height)
sheet = Image.new("RGBA", (W, y + rowh + pad + 12), bg); d = ImageDraw.Draw(sheet)
for n, im, xx, yy in items:
    sheet.alpha_composite(im, (xx, yy + 12)); d.text((xx, yy), n.replace("trait-picture-frame", "tpf"), fill=(200, 210, 220, 255))
sheet.convert("RGB").save(sys.argv[1]); print(sheet.size)
