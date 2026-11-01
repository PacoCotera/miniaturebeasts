#!/usr/bin/env python3
# The room rail's cuts (the mibi collection's inventory page): each room's painting cut 164 x 40 (the rail row) 278 x 30 (the card's band) and 278 x 44 (a Move to row), 1:1, from the placed idle base of each light at the corner the 128 x 32 chip used,
# widened to the rail row's size. A mechanical re-cut of placed masters: no new painting, no recolour. Writes the pictures into prototypes/ui/assets/masters/rooms, their entries into
# the masters index; rooms.json rooms.<id>.rail, .band and .move name them (room-<id>-rail-{light}-164x40, -band-…-278x30, -move-…-278x44).
#   python3 art/station-masters/collection/source/rail_cuts.py
import json, os, hashlib
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
M = os.path.join(ROOT, "prototypes/ui/assets/masters"); R = os.path.join(M, "rooms")
LIGHTS = ["dawn", "day", "dusk", "night"]
CORNERS = {"roots": [330, 320], "reeds": [176, 360], "boulders": [330, 330], "ferns": [176, 330]}   # the chips' corners (rooms_v2.py CHIPS)
CUTS = {"rail": (164, 40), "band": (278, 30), "move": (278, 44)}   # the rail row, the card's room band, and a Move to row
idx = json.load(open(os.path.join(M, "index.json")))
for room, (x, y) in CORNERS.items():
    for kind, (W, H) in CUTS.items():
      for l in LIGHTS:
        base = f"room-{room}-idle-{l}-1024x568"; out = f"room-{room}-{kind}-{l}-{W}x{H}"
        im = Image.open(os.path.join(R, base + ".png")).convert("RGB").crop((x, y, x + W, y + H)); assert im.size == (W, H)
        f = os.path.join(R, out + ".png"); im.save(f, optimize=True)
        idx["masters"][out] = {"file": f"rooms/{out}.png", "w": W, "h": H, "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest(),
                               "signed": f"new (a 1:1 cut of the placed idle base, the {kind}'s size; for the art director's check at 1x), not final", "status": "new", "from": f"{base}.png at [{x}, {y}]"}
open(os.path.join(M, "index.json"), "w").write(json.dumps(idx, indent=1, ensure_ascii=False) + "\n")
print("cut", len(CORNERS) * len(LIGHTS) * len(CUTS), "pictures")
