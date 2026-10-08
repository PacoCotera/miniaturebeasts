"""Each walk and creep cycle as a strip at 3x (round 10): for the four facings, walk1 walk2 walk3 walk2 (the loop) and creep1 creep2 creep3 creep2, so the stride reads in sequence.
usage: python3 -I pawn-cycles-figure.py PAWN_DIR OUT.png"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1:3]
try: f = ImageFont.load_default(size=12)
except TypeError: f = ImageFont.load_default()
bg = (74, 110, 62); sc = 3; cell = 48 * sc
rows = [(fa, kind, [f"{kind}{i}" for i in ((1, 2, 3, 2))]) for fa in ("down", "right", "left", "up") for kind in ("walk", "creep")]
W = Image.new("RGB", (2 * (4 * cell + 3 * 4) + 3 * 16, 4 * (cell + 22) + 16), (40, 36, 50)); dr = ImageDraw.Draw(W)
for ri, (fa, kind, names) in enumerate(rows):
    bx = 16 + (ri % 2) * (4 * cell + 3 * 4 + 16); by = 8 + (ri // 2) * (cell + 22)
    for k, n in enumerate(names):
        im = Image.open(os.path.join(d, f"pawn-{fa}-{n}.png")).convert("RGBA"); t = Image.new("RGBA", im.size, bg + (255,)); t.alpha_composite(im)
        W.paste(t.convert("RGB").resize((cell, cell), Image.NEAREST), (bx + k * (cell + 4), by))
    dr.text((bx, by + cell + 3), f"{fa} {kind}: 1, 2, 3, 2 (the loop)", fill=(220, 216, 234), font=f)
W.save(out); print("wrote", out, W.size)
