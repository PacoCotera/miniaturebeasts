"""Composite single-region edits onto a base canvas by rectangle.

usage: python3 -I composite-regions.py BASE_CANVAS OUT_CANVAS OUT_1024x600 SRC_CANVAS x0,y0,x1,y1 [SRC_CANVAS x0,y0,x1,y1 ...]
Rectangles are in 1024x600 screen coordinates; the screen is the centred 1024:600 band of the 16:9 canvas.
Every canvas must share the base's size. Writes a JSON record next to OUT_CANVAS describing each paste.
Each pasted rectangle is taken from one edit whose only change lies inside it, so the result is still the
generator's pixels; nothing is drawn.
"""
import json, os, sys
from PIL import Image

base_p, out_c, out_s = sys.argv[1:4]
pairs = sys.argv[4:]
base = Image.open(base_p).convert("RGB")
W, H = base.size
BAND_W = round(H * 1024 / 600)
OFF_X = (W - BAND_W) // 2
SCALE = H / 600

def rect(x0, y0, x1, y1):
    return (round(OFF_X + x0 * SCALE), round(y0 * SCALE), round(OFF_X + x1 * SCALE), round(y1 * SCALE))

out = base.copy()
rec = {"base": base_p, "pastes": []}
for src_p, r in zip(pairs[0::2], pairs[1::2]):
    src = Image.open(src_p).convert("RGB")
    assert src.size == base.size, (src_p, src.size, base.size)
    sr = rect(*map(int, r.split(",")))
    out.paste(src.crop(sr), (sr[0], sr[1]))
    rec["pastes"].append({"source": src_p, "screenRect": [int(v) for v in r.split(",")], "canvasRect": list(sr)})
out.save(out_c)
out.crop((OFF_X, 0, OFF_X + BAND_W, H)).resize((1024, 600), Image.LANCZOS).save(out_s)
rec["outputs"] = {"canvas": out_c, "screen": out_s, "bandRect": [OFF_X, 0, OFF_X + BAND_W, H]}
json.dump(rec, open(os.path.splitext(out_c)[0] + ".json", "w"), indent=2)
print("wrote", out_c, out_s, [p["screenRect"] for p in rec["pastes"]])
