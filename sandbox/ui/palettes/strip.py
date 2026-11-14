"""Draw the Station palette as a swatch strip at 1x, from station.json.

Row one: the Companion's 48, the shared core, grouped by ramp.
Row two: the Station's 14, grouped by role.
Each column: the lighter neighbour (top chip), the colour, the darker neighbour (bottom chip).

    python3 prototypes/ui/palettes/strip.py
writes design/proposals/ui-kit/station-palette-1x.png
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
PAL = json.loads((ROOT / "prototypes/ui/palettes/station.json").read_text())
OUT = ROOT / "design/proposals/ui-kit/station-palette-1x.png"

# Groups by name, in file order: ramps of the core, then the Station's roles.
CORE = [9, 5, 6, 5, 4, 4, 5, 6, 2, 2]
STATION = [10, 1, 2, 1]
W, CHIP, GAP, PITCH, GROUP, MARGIN = 16, 4, 1, 18, 8, 8
COL_H = CHIP + GAP + W + GAP + CHIP

hexes = dict(PAL["colours"])
names = [n for n, _ in PAL["colours"]]
assert sum(CORE) == 48 and sum(STATION) == len(names) - 48


def rgb(name):
    h = hexes[name]
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def row_width(groups):
    return sum(groups) * PITCH - 2 + (len(groups) - 1) * GROUP


width = MARGIN * 2 + max(row_width(CORE), row_width(STATION))
height = MARGIN * 3 + COL_H * 2
# Each row sits on a colour that is not in it: the core on the chrome's bar, the Station on stone.
img = Image.new("RGB", (width, height), rgb("bar"))


def fill(x, y, w, h, c):
    for j in range(h):
        for i in range(w):
            img.putpixel((x + i, y + j), c)


def draw_row(start, groups, y):
    x, k = MARGIN, start
    for g in groups:
        for _ in range(g):
            n = names[k]
            fill(x, y, W, CHIP, rgb(PAL["lighter"][n]))
            fill(x, y + CHIP + GAP, W, W, rgb(n))
            fill(x, y + CHIP + GAP + W + GAP, W, CHIP, rgb(PAL["darker"][n]))
            x += PITCH
            k += 1
        x += GROUP


draw_row(0, CORE, MARGIN)
fill(0, MARGIN + COL_H + MARGIN // 2, width, height - (MARGIN + COL_H + MARGIN // 2), rgb("stone"))
draw_row(48, STATION, MARGIN * 2 + COL_H)
img.save(OUT, optimize=True)
print(OUT.relative_to(ROOT), img.size, len(img.getcolors(256)), "colours")
