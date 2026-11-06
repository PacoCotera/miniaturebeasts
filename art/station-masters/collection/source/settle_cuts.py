#!/usr/bin/env python3
# The settling cut (the collection inventory spec §2): a room that is still settling shows its rail row at x0.55 brightness, precomputed once, as a room not yet bought.
# Derived from the placed 164 x 40 rail cuts (rail_cuts.py) in the four lights: value only, the hue kept (each RGB channel x 0.55, rounded). Writes slices/room-<id>-rail-settling-<light>-164x40.png,
# slices/settling.json (size, source and hash) and slices/settling-status.json, and proof-settling-1x.png: each room, the cut above and its settling cut under it, the four lights across, at 1x.
#   python3 art/station-masters/collection/source/settle_cuts.py
import os, json, hashlib
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
R = os.path.join(REPO, "prototypes/ui/assets/masters/rooms")
ROOMS = ["roots", "reeds", "boulders", "ferns"]; LIGHTS = ["dawn", "day", "dusk", "night"]; K = 0.55
out = os.path.join(ROOT, "slices"); os.makedirs(out, exist_ok=True)
manifest, status = {}, {}
sheet = Image.new("RGB", (4 * (164 + 8) + 8, 4 * (40 * 2 + 4 + 8) + 8 - 0), (0x1d, 0x23, 0x2b))
for r, room in enumerate(ROOMS):
    for c, light in enumerate(LIGHTS):
        base = f"room-{room}-rail-{light}-164x40"; src = Image.open(os.path.join(R, base + ".png")).convert("RGB")
        a = np.asarray(src).astype(np.float64) * K; dim = Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8), "RGB")
        name = f"room-{room}-rail-settling-{light}-164x40"; f = os.path.join(out, name + ".png"); dim.save(f, optimize=True)
        manifest[name] = {"size": [164, 40], "src": "source/settle_cuts.py", "from": base + ".png", "factor": K, "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()}
        status[name] = {"status": "new", "note": "the rail cut at x0.55 brightness, precomputed, for the art director's 1x proof"}
        sheet.paste(src, (8 + c * 172, 8 + r * 92)); sheet.paste(dim, (8 + c * 172, 8 + r * 92 + 44))
json.dump(manifest, open(os.path.join(out, "settling.json"), "w"), indent=1); open(os.path.join(out, "settling.json"), "a").write("\n")
json.dump(status, open(os.path.join(out, "settling-status.json"), "w"), indent=1); open(os.path.join(out, "settling-status.json"), "a").write("\n")
sheet.save(os.path.join(ROOT, "proof-settling-1x.png")); print("ok", len(manifest))
