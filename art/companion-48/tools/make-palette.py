"""Write the signed palette file from the page's PALETTE: palette.json, palette.png (48x1 indexed), palette-tables.png.

usage: python3 -I make-palette.py
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pal

names, hexes, dark_of, light_of = pal.parse_page()
P = pal.Palette(names, hexes, dark_of, light_of)
out = os.path.join(pal.HERE, "..", "palette")
doc = {
    "source": "prototypes/exploration/index.html, const PALETTE, DARK_OF, LIGHT_OF; FOG and FADE by the page's mixLUT (bone .62, stone .5) with its 3/4/2 weighted nearest colour",
    "count": len(names),
    "colours": [{"index": i, "name": n, "hex": h, "rgb": pal.hex_rgb(h)} for i, (n, h) in enumerate(zip(names, hexes))],
    "darkOf": dark_of, "lightOf": light_of,
    "tables": {"DARK": P.dark, "LIGHT": P.light, "DARK2": P.dark2, "FOG": P.fog, "FADE": P.fade},
    "bayer4": pal.BAYER4,
    "rules": {
        "outline": "1 px in the darkest step of the part's own ramp (DARK of the part's colour), never void; one step lighter on the lit side",
        "blend": "no alpha, no anti-aliasing, no gradients; a table lookup (DARK, LIGHT, FOG, FADE) or the 4x4 Bayer matrix only",
        "characters": "the pawn and mibis never pass through a table",
    },
}
json.dump(doc, open(os.path.join(out, "palette.json"), "w"), indent=1)
# 48x1 indexed strip (the input_palette for Retro Diffusion and the atlas's palette)
strip = Image.new("P", (len(names), 1))
flat = []
for h in hexes: flat += pal.hex_rgb(h)
strip.putpalette(flat + [0, 0, 0] * (256 - len(names)))
strip.putdata(list(range(len(names))))
strip.save(os.path.join(out, "palette.png"))
# preview with names and the tables at 4x
cell, rows = 36, 5
W, H = 24 + len(names) * cell // 2, 24 + rows * 44 + 20
im = Image.new("RGB", (W, H), (30, 28, 40)); d = ImageDraw.Draw(im)
try: font = ImageFont.load_default(size=10)
except TypeError: font = ImageFont.load_default()
labels = ["colour", "DARK", "LIGHT", "FOG", "FADE"]
tables = [list(range(len(names))), P.dark, P.light, P.fog, P.fade]
for r, (lab, t) in enumerate(zip(labels, tables)):
    y = 24 + r * 44
    d.text((2, y + 4), lab, fill=(220, 216, 234), font=font)
    for i, j in enumerate(t):
        x = 24 + i * cell // 2
        d.rectangle([x, y, x + cell // 2 - 2, y + 16], fill=tuple(P.rgb[j]))
        if r == 0: d.text((x, y + 18), names[i][:5], fill=(180, 176, 200), font=font)
im.save(os.path.join(out, "palette-tables.png"))
print(len(names), "colours;", "DARK", P.dark[:6], "...; FOG", P.fog[:6], "...")
