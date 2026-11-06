#!/usr/bin/env python3
# The Wall's room ticks (the collection inventory spec §3): 20 x 3, one per room by its place in bought order, drawn from palette tokens, 1:1.
# Rooms 1 to 6 are whole ticks in sky, sprout, sand, lilac, aqua, pink. Rooms 7 to 10 repeat the hues as a broken tick: 9 px, a 2 px gap, 9 px (7 sky, 8 sprout, 9 sand, 10 lilac).
# orange, amber, focus and the reds are never tick colours. Writes slices/tick-room-NN-20x3.png, manifest and status entries (slices/ticks.json, slices/ticks-status.json), and proof-ticks-1x.png: all ten on `ground`.
#   python3 art/station-masters/collection/source/room_ticks.py
import os, json, hashlib
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
PAL = {n: h for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
rgb = lambda n: tuple(int(PAL[n][i:i + 2], 16) for i in (1, 3, 5)) + (255,)
TOKENS = ["sky", "sprout", "sand", "lilac", "aqua", "pink"]
out = os.path.join(ROOT, "slices"); os.makedirs(out, exist_ok=True)
manifest, status, ticks = {}, {}, {}
for room in range(1, 11):
    tok = TOKENS[(room - 1) % 6]; broken = room > 6
    im = Image.new("RGBA", (20, 3), (0, 0, 0, 0))
    for x in range(20):
        if broken and 9 <= x < 11: continue
        for y in range(3): im.putpixel((x, y), rgb(tok))
    name = f"tick-room-{room:02d}-20x3"; f = os.path.join(out, name + ".png"); im.save(f); ticks[room] = im
    manifest[name] = {"size": [20, 3], "src": "source/room_ticks.py", "hue": tok, "broken": broken, "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()}
    status[name] = {"status": "new", "note": "code-drawn from palette tokens, for the art director's 1x proof"}
json.dump(manifest, open(os.path.join(out, "ticks.json"), "w"), indent=1); open(os.path.join(out, "ticks.json"), "a").write("\n")
json.dump(status, open(os.path.join(out, "ticks-status.json"), "w"), indent=1); open(os.path.join(out, "ticks-status.json"), "a").write("\n")
# the proof: rooms 1 to 6 in a row, 7 to 10 under them (each under the same hue's whole tick), a 16 px margin, a 36 px pitch, on `ground`
sheet = Image.new("RGBA", (16 * 2 + 36 * 5 + 20 - 36 + 36, 16 * 2 + 28 + 3), rgb("ground"))
for room, im in ticks.items():
    col = (room - 1) % 6; row = 0 if room <= 6 else 1
    sheet.alpha_composite(im, (16 + col * 36, 16 + row * 28))
sheet.save(os.path.join(ROOT, "proof-ticks-1x.png")); print("ok", len(ticks))
