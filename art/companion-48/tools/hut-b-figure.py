"""Hut B's making in one picture: the painted hut, the three Retro Diffusion lit candidates (seeds 48 to 50; the pieces use seed 50), and the pieces used (lit, dark, dark2).
usage: python3 -I hut-b-figure.py RD_DIR WORK_DIR OUT.png"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
rd, work, out = sys.argv[1:4]
try: f = ImageFont.load_default(size=12)
except TypeError: f = ImageFont.load_default()
bg = (60, 60, 70)
def raw(p): im = Image.open(p).convert("RGBA"); t = Image.new("RGBA", im.size, bg + (255,)); t.alpha_composite(im); return t.convert("RGB").resize((im.width * 3, im.height * 3), Image.NEAREST)
items = [("painted source", Image.open(os.path.join(rd, "inputs", "hut-B-painted-in.png")).convert("RGB").resize((192, 174)))]
items += [(f"Retro Diffusion, seed {s}", raw(os.path.join(rd, f"C48-H-r7-B-lit-s{s}-rd.png"))) for s in (48, 49, 50)]
for st in ("lit", "dark", "dark2"):
    im = Image.open(os.path.join(work, f"hut-B-{st}.png")).convert("RGBA"); t = Image.new("RGBA", im.size, bg + (255,)); t.alpha_composite(im); items.append((f"piece, 64 px native: {st}", t.convert("RGB").resize((im.width * 3, im.height * 3), Image.NEAREST)))
W = Image.new("RGB", (sum(i.width for _, i in items) + 10 * (len(items) + 1), 200), (40, 36, 50)); d = ImageDraw.Draw(W); x = 10
for lab, im in items: W.paste(im, (x, 8)); d.text((x, 8 + im.height + 4), lab, fill=(220, 216, 234), font=f); x += im.width + 10
W.save(out); print("wrote", out, W.size)
