"""Contact sheet of every piece in the review place, grouped, at a scale, with names under each piece.
With a previous round's directory after a second '=', a piece that changed is shown as its previous version
(labelled r5, round 5) beside the current one (r6); unchanged pieces are shown once.
usage: python3 -I contact.py OUT.png SCALE "GROUP=DIR[=PREV_DIR]" ..."""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, scale = sys.argv[1], int(sys.argv[2])
try: font = ImageFont.load_default(size=11); big = ImageFont.load_default(size=14)
except TypeError: font = big = ImageFont.load_default()
def same(a, b):
    return a.size == b.size and np.array_equal(np.asarray(a), np.asarray(b))
groups = []
for g in sys.argv[3:]:
    parts = g.split("="); name, d = parts[0], parts[1]; prev = parts[2] if len(parts) > 2 else None
    items = []
    for f in sorted(glob.glob(os.path.join(d, "*.png"))):
        nm = os.path.basename(f)[:-4]; im = Image.open(f).convert("RGBA")
        pf = os.path.join(prev, nm + ".png") if prev else None
        if pf and os.path.exists(pf):
            pim = Image.open(pf).convert("RGBA")
            if not same(pim, im): items.append((nm + " r5", pim, True)); items.append((nm + " r6", im, False)); continue
        elif prev: nm += " (new)"
        items.append((nm, im, False))
    groups.append((name, items))
W = 1560; y = 8; layout = []
for name, ims in groups:
    layout.append(("title", name, y)); y += 22
    cw = max(im.width for _, im, _ in ims) * scale + 10; ch = max(im.height for _, im, _ in ims) * scale + 18
    per = max(1, (W - 8) // cw); i = 0
    for nm, im, pair_first in ims:
        if pair_first and i % per == per - 1: i += 1          # keep a pair on one row
        r, c = divmod(i, per); layout.append(("im", nm, im, 8 + c * cw, y + r * ch)); i += 1
    y += ((i + per - 1) // per) * ch + 10
sheet = Image.new("RGBA", (W, y), (40, 36, 50, 255)); d = ImageDraw.Draw(sheet)
for it in layout:
    if it[0] == "title": d.text((8, it[2] + 2), it[1], fill=(255, 240, 200, 255), font=big)
    else:
        _, nm, im, x, yy = it; b = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        sheet.alpha_composite(b, (x, yy)); d.text((x, yy + b.height + 1), nm, fill=(200, 196, 214, 255) if not nm.endswith(" r5") else (150, 146, 164, 255), font=font)
sheet.save(out); print("wrote", out, sheet.size)
