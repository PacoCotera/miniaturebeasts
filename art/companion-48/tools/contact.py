"""Contact sheet of every piece in the review place, grouped, at a scale, with names under each piece.
usage: python3 -I contact.py OUT.png SCALE GROUP=DIR[:glob] ..."""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont
out, scale = sys.argv[1], int(sys.argv[2])
try: font = ImageFont.load_default(size=11); big = ImageFont.load_default(size=14)
except TypeError: font = big = ImageFont.load_default()
groups = []
for g in sys.argv[3:]:
    name, spec = g.split("=", 1); d, _, pat = spec.partition(":")
    files = sorted(glob.glob(os.path.join(d, pat or "*.png")))
    groups.append((name, [(os.path.basename(f)[:-4], Image.open(f).convert("RGBA")) for f in files]))
W = 1560; rows = []; y = 8
layout = []
for name, ims in groups:
    layout.append(("title", name, y)); y += 22
    cw = max(im.width for _, im in ims) * scale + 10; ch = max(im.height for _, im in ims) * scale + 18
    per = max(1, (W - 8) // cw)
    for i, (nm, im) in enumerate(ims):
        r, c = divmod(i, per); layout.append(("im", nm, im, 8 + c * cw, y + r * ch))
    y += ((len(ims) + per - 1) // per) * ch + 10
sheet = Image.new("RGBA", (W, y), (40, 36, 50, 255)); d = ImageDraw.Draw(sheet)
for it in layout:
    if it[0] == "title": d.text((8, it[2] + 2), it[1], fill=(255, 240, 200, 255), font=big)
    else:
        _, nm, im, x, yy = it; b = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        sheet.alpha_composite(b, (x, yy)); d.text((x, yy + b.height + 1), nm, fill=(200, 196, 214, 255), font=font)
sheet.save(out); print("wrote", out, sheet.size)
