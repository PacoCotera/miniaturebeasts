"""Pack a group of indexed pieces into one indexed sheet (palette indices 0-47, index 48 transparent) with a
JSON atlas: frame rects, anchor (the sort point: foot for sprites, the top-left for tiles and chrome), size.
usage: python3 -I pack.py NAME KIND OUT_DIR PIECE.png...   (KIND: tile | sprite | chrome)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
name, kind, out, files = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
os.makedirs(out, exist_ok=True)
pieces = []
for f in files:
    im = Image.open(f).convert("RGBA"); idx = quant.quantize(np.asarray(im), alpha_thresh=128)
    pieces.append((os.path.basename(f)[:-4], idx))
PAD = 1
W = 512 if sum(p.shape[1] + PAD for _, p in pieces) > 512 else sum(p.shape[1] + PAD for _, p in pieces) + PAD
# shelf packing, tallest first within the given order groups
x, y, shelf_h = PAD, PAD, 0
frames = {}
for nm, idx in pieces:
    h, w = idx.shape
    if x + w + PAD > W: x, y, shelf_h = PAD, y + shelf_h + PAD, 0
    frames[nm] = {"x": x, "y": y, "w": w, "h": h}; x += w + PAD; shelf_h = max(shelf_h, h)
H = y + shelf_h + PAD
sheet = np.full((H, W), 48, dtype=np.uint8)
for nm, idx in pieces:
    r = frames[nm]; sheet[r["y"]:r["y"] + r["h"], r["x"]:r["x"] + r["w"]] = np.where(idx < 0, 48, idx)
    if kind == "sprite":
        ys, xs = np.where(idx >= 0); r["anchor"] = [int(r["w"] // 2), int(ys.max()) + 1 if len(ys) else r["h"]]
    else: r["anchor"] = [0, 0]
im = Image.fromarray(sheet, "P")
flat = []
for c in P.rgb.tolist(): flat += [int(v) for v in c]
flat += [255, 0, 255] + [0, 0, 0] * (256 - 49)
im.putpalette(flat); im.info["transparency"] = 48
im.save(os.path.join(out, name + ".png"), transparency=48, optimize=True)
atlas = {"schemaVersion": 1, "sheet": name + ".png", "kind": kind, "palette": "../palette/palette.json", "transparentIndex": 48, "size": [W, H], "frames": frames,
         "note": "Indexed PNG: palette indices 0-47 as signed, 48 transparent. anchor: the foot point (sprites) or the top-left (tiles, chrome), in frame pixels."}
json.dump(atlas, open(os.path.join(out, name + ".json"), "w"), indent=1)
print(name, f"{len(pieces)} frames, {W}x{H}")
