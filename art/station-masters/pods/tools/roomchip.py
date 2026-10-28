#!/usr/bin/env python3
"""Room chips (R4b-2, the art director, 0 MXN): each room's signed Idle painting, one light at a time,
cut to its focal crop (aspect 1.4) and reduced to the chip's 56 x 40 (vivarium.json regions.chips.chip:
"the room's own painting cut to 56 x 40"). No new painting: Lanczos reduction, then a light unsharp mask
so the focal reads at 1x. Opaque RGB, as the seated scenes. Writes rooms/chips/room-<id>-chip-<light>-56x40.png
and prints each file's sha256 for the manifest's hashes.

usage: python3 -I tools/roomchip.py         (from art/station-masters/pods; -I because tools/numbers.py shadows the stdlib)
"""
import hashlib, os
from PIL import Image, ImageFilter

W, H = 56, 40
LIGHTS = ["dawn", "day", "dusk", "night"]
# crop [x, y, w, h] in painting coordinates (1024x568), w/h = 1.4: the room's focal, the same in every light
CROPS = {
    "roots":    [140,  90, 392, 280],   # the beech's foot, its roots, the burrow and the bluebells behind
    "reeds":    [120, 170, 448, 320],   # the wet rock in the sedges, the path, the rain haze
    "boulders": [330, 100, 560, 400],   # the maple, the hero stone and its two, the pond's edge
    "ferns":    [300,  90, 504, 360],   # the croziers, the fern fronds, the mossy log and the path
}
UNSHARP = dict(radius=0.8, percent=60, threshold=2)


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, "rooms", "chips"); os.makedirs(out, exist_ok=True)
    for room, (x, y, w, h) in CROPS.items():
        assert abs(w / h - W / H) < 1e-9, room
        for l in LIGHTS:
            im = Image.open(os.path.join(here, "rooms", f"signed-idle-{room}-{l}.png")).convert("RGB")
            c = im.crop((x, y, x + w, y + h)).resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(**UNSHARP))
            f = os.path.join(out, f"room-{room}-chip-{l}-{W}x{H}.png")
            c.save(f, optimize=True)
            print(f"rooms/chips/room-{room}-chip-{l}-{W}x{H}.png", hashlib.sha256(open(f, "rb").read()).hexdigest())

if __name__ == "__main__":
    main()
