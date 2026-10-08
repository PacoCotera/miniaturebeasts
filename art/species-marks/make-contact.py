"""Builds contact-1x-3x-6x.png: for each of the 16 species, the retired glyph beside the new mark at 1x, 3x and 6x.

usage:  python3 -I make-contact.py        (from anywhere)

Reads old-glyphs.txt (the retired glyphs, as they were on main on 2026-10-08) and the new marks from the workbench frames
(prototypes/workbench/frames/species-S*.json). Standard library plus Pillow for the labels only (text drawn without
anti-aliasing); every pixel is one of the Station's 62 colours (prototypes/ui/palettes/station.json): the pod cap's slate with
the glyph in cream, as the pod placeholder shows it. Prints the count of off-palette pixels, which must be 0.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
pal = dict(json.load(open(os.path.join(ROOT, "prototypes/ui/palettes/station.json")))["colours"])
rgb = lambda n: tuple(int(pal[n][i:i + 2], 16) for i in (1, 3, 5))
GROUND, TILE, LIT, LABEL, DIM, RULE = rgb("night"), rgb("slate"), rgb("cream"), rgb("bone"), rgb("mist"), rgb("stone")

def parse(path):
    out, cur = {}, None
    for line in open(path):
        line = line.rstrip("\n")
        if not line or line.startswith(";"): continue
        if line[0] == "S" and " " in line: cur = line.split()[0]; out[cur] = []
        else: out[cur].append(line)
    return out

old = parse(os.path.join(HERE, "old-glyphs.txt"))
new, names = {}, {}
for i in range(1, 17):
    f = json.load(open(os.path.join(ROOT, "prototypes/workbench/frames/species-S%02d.json" % i)))
    new[f["species"]["id"]] = f["glyph"]; names[f["species"]["id"]] = f["species"]["name"]

SC, PAD, GAP = (1, 3, 6), 3, 3
tile_w = [5 * s + 2 * PAD for s in SC]; TH = 5 * 6 + 2 * PAD
block_w = sum(tile_w) + GAP * 2
CELL_W, CELL_H, COLS, M = 2 * block_w + 12 + 10, TH + 22, 4, 8
W, H = COLS * CELL_W + 2 * M, 4 * CELL_H + 2 * M + 22
im = Image.new("RGB", (W, H), GROUND); d = ImageDraw.Draw(im); d.fontmode = "1"
font = ImageFont.load_default(8)
d.text((M, M - 2), "old", font=font, fill=DIM); d.text((M + 28, M - 2), "new", font=font, fill=LABEL)
d.text((M + 60, M - 2), "each at 1x, 3x, 6x (1 cell = 1, 3, 6 px) on the pod cap's slate", font=font, fill=DIM)

def put(g, x, y):
    for s, tw in zip(SC, tile_w):
        d.rectangle([x, y, x + tw - 1, y + TH - 1], fill=TILE)
        oy = y + (TH - 5 * s) // 2
        for r, row in enumerate(g):
            for c, ch in enumerate(row):
                if ch == "#": d.rectangle([x + PAD + c * s, oy + r * s, x + PAD + c * s + s - 1, oy + r * s + s - 1], fill=LIT)
        x += tw + GAP

for n in range(16):
    sid = "S%02d" % (n + 1); cx = M + (n % COLS) * CELL_W; cy = M + 14 + (n // COLS) * CELL_H
    d.text((cx, cy), "%s %s" % (sid, names[sid]), font=font, fill=LABEL)
    put(old[sid], cx, cy + 10); put(new[sid], cx + block_w + 12, cy + 10)
    d.line([cx + block_w + 5, cy + 10, cx + block_w + 5, cy + 10 + TH - 1], fill=RULE)

im.save(os.path.join(HERE, "contact-1x-3x-6x.png"), optimize=True)
want = set(rgb(n) for n in pal); bad = sum(1 for p in im.get_flattened_data() if p not in want)
print("contact-1x-3x-6x.png %dx%d, off-palette pixels: %d" % (W, H, bad))
