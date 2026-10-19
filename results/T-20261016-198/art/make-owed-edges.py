"""The owed edge: the unlit frame behind a held one (T-198 addendum).

  berth-portrait-owed-18x24   behind berth-portrait-18x24 at (-3, -3), Home's Bay
  sitting-frame-owed-48x40    behind sitting-frame-held-48x40 at (-4, -4), the Portrait plate

Each is the held frame's own shape with every colour taken one step down its
ramp in the Station palette (its `darker` neighbour), so the strip that shows
past the held frame reads as the same gilt, unlit. The ink outline stays ink,
so the two edges keep one line. No shadow is added. The whole frame is kept,
not just the strip, so the edge still reads if the offset changes.

    python3 make-owed-edges.py <station.json> <berth-portrait-18x24.png> <sitting-frame-held-48x40.png> <out dir>
"""
import json
import sys
from pathlib import Path

from PIL import Image

pal = json.loads(Path(sys.argv[1]).read_text())
hexes = dict(pal["colours"])
rgb = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in hexes.items()}
name_of = {v: n for n, v in rgb.items()}
KEEP = {"ink"}                       # the outline


def unlit(src, out):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            n = name_of[(r, g, b)]   # a held master is palette-exact; anything else is an error
            d = n if n in KEEP else pal["darker"][n]
            px[x, y] = rgb[d] + (a,)
    im.save(out)


out = Path(sys.argv[4])
unlit(sys.argv[2], out / "berth-portrait-owed-18x24.png")
unlit(sys.argv[3], out / "sitting-frame-owed-48x40.png")
