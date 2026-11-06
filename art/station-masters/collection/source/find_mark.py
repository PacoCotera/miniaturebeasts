#!/usr/bin/env python3
# The find mark on the rail (the collection inventory spec §2, the Add a room row's line 2): 16 x 16, from the existing glint-star-12x12 master.
#   mark-find-lit-16      the glint master placed 1:1 and centred on the 16 px canvas (offset 2, 2): lit, when a find is home
#   mark-find-outline-16  its outline, derived: a 1 px `fog` line round the glint's shape (its pixels of alpha 0x20 and over, grown by one pixel in the four directions, the shape itself left empty): when none is
# Writes both, slices/find.json and slices/find-status.json, and proof-find-1x.png: both on `ground` at the Add a room row's line 2 position ([+8, +32] of a 164 x 56 row), at 1x.
#   python3 art/station-masters/collection/source/find_mark.py
import os, json, hashlib
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
PAL = {n: h for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
rgb = lambda n: tuple(int(PAL[n][i:i + 2], 16) for i in (1, 3, 5)) + (255,)
glint = Image.open(os.path.join(REPO, "prototypes/ui/assets/masters/pods/glint-star-12x12.png")).convert("RGBA")
lit = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); lit.alpha_composite(glint, (2, 2))
a = np.asarray(lit)[..., 3]; shape = a >= 0x20
grown = shape.copy(); grown[1:, :] |= shape[:-1, :]; grown[:-1, :] |= shape[1:, :]; grown[:, 1:] |= shape[:, :-1]; grown[:, :-1] |= shape[:, 1:]
outline = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
for y in range(16):
    for x in range(16):
        if grown[y, x] and not shape[y, x]: outline.putpixel((x, y), rgb("fog"))
made = {"mark-find-lit-16": lit, "mark-find-outline-16": outline}
out = os.path.join(ROOT, "slices"); manifest, status = {}, {}
for name, m in made.items():
    f = os.path.join(out, name + ".png"); m.save(f)
    manifest[name] = {"size": [16, 16], "src": "source/find_mark.py", "from": "glint-star-12x12", "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()}
    status[name] = {"status": "new", "note": "the glint-star-12 master placed (lit) and its outline derived, for the art director's 1x proof"}
json.dump(manifest, open(os.path.join(out, "find.json"), "w"), indent=1); open(os.path.join(out, "find.json"), "a").write("\n")
json.dump(status, open(os.path.join(out, "find-status.json"), "w"), indent=1); open(os.path.join(out, "find-status.json"), "a").write("\n")
sheet = Image.new("RGBA", (16 + 164 * 2 + 16, 56 + 32), rgb("ground"))                    # two Add a room rows (164 x 56) side by side: a find home, none home
for i, name in enumerate(("mark-find-lit-16", "mark-find-outline-16")):
    x = 16 + i * 164; sheet.alpha_composite(made[name], (x + 8, 16 + 32))                      # the row's line 2 position: [+8, +32]
sheet.convert("RGB").save(os.path.join(ROOT, "proof-find-1x.png")); print("ok")
