"""Place an accepted creature asset (RGBA) into an empty box on a generated screen.

usage: python3 -I place-asset.py SCREEN_CANVAS.png ASSET.png OUT_CANVAS.png OUT_1024x600.png --search x0,y0,x1,y1 [--pad 0.08]
The search rectangle is in 1024x600 screen coordinates; inside it the largest flat pale region (the empty
card the generator left) is detected, and the asset is scaled to fit it with a margin and alpha-composited,
keeping its own drawing untouched (Pip is placed, never redrawn). Writes a JSON record next to OUT_CANVAS.
"""
import json, sys
import numpy as np
from PIL import Image

a = sys.argv[1:]
screen_p, asset_p, out_c, out_s = a[:4]
sx0, sy0, sx1, sy1 = map(int, a[a.index("--search") + 1].split(","))
pad = float(a[a.index("--pad") + 1]) if "--pad" in a else 0.08
screen = Image.open(screen_p).convert("RGB")
asset = Image.open(asset_p).convert("RGBA")
W, H = screen.size
BAND_W = round(H * 1024 / 600); OFF_X = (W - BAND_W) // 2; SC = H / 600
cx0, cy0, cx1, cy1 = round(OFF_X + sx0 * SC), round(sy0 * SC), round(OFF_X + sx1 * SC), round(sy1 * SC)
arr = np.asarray(screen).astype(int)[cy0:cy1, cx0:cx1]
light = (arr.min(axis=2) > 190) & ((arr.max(axis=2) - arr.min(axis=2)) < 40)
rows = np.where(light.sum(axis=1) > 0.5 * light.shape[1])[0]
cols = np.where(light.sum(axis=0) > 0.5 * light.shape[0])[0]
if len(rows) == 0 or len(cols) == 0:
    sys.exit("no pale card found in the search rectangle")
x0, y0, x1, y1 = cx0 + cols[0], cy0 + rows[0], cx0 + cols[-1] + 1, cy0 + rows[-1] + 1
bw, bh = x1 - x0, y1 - y0
m = int(min(bw, bh) * pad)
fit_w, fit_h = bw - 2 * m, bh - 2 * m
s = min(fit_w / asset.width, fit_h / asset.height)
aw, ah = max(1, round(asset.width * s)), max(1, round(asset.height * s))
ast = asset.resize((aw, ah), Image.LANCZOS)
px, py = x0 + (bw - aw) // 2, y1 - m - ah  # stand on the card's floor
out = screen.copy()
out.paste(ast, (px, py), ast)
out.save(out_c)
out.crop((OFF_X, 0, OFF_X + BAND_W, H)).resize((1024, 600), Image.LANCZOS).save(out_s)
rec = {"screen": screen_p, "asset": asset_p, "detectedCard": [int(v) for v in (x0, y0, x1, y1)], "pasted": {"x": int(px), "y": int(py), "w": int(aw), "h": int(ah)}, "outputs": {"canvas": out_c, "screen": out_s}}
json.dump(rec, open(out_c.rsplit(".", 1)[0] + ".json", "w"), indent=2)
print("placed", (aw, ah), "at", (px, py), "card", (x0, y0, x1, y1))
