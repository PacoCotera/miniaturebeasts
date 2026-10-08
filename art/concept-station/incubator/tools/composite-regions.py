"""Composite single-region edits onto a base canvas by rectangle.

usage: python3 -I composite-regions.py [--feather N] BASE_CANVAS OUT_CANVAS OUT_1024x600 SRC_CANVAS x0,y0,x1,y1[:fN] [SRC_CANVAS x0,y0,x1,y1[:fN] ...]
Rectangles are in 1024x600 screen coordinates; the screen is the centred 1024:600 band of the 16:9 canvas.
Every canvas must share the base's size. Writes a JSON record next to OUT_CANVAS describing each paste.
Each pasted rectangle is taken from one edit whose only change lies inside it, so the result is still the
generator's pixels; nothing is drawn.
"""
import json, os, sys
from PIL import Image

args = sys.argv[1:]
feather = 0
if "--feather" in args:  # blend each paste's edges over N canvas pixels so seams vanish in flat glass
    i = args.index("--feather"); feather = int(args[i + 1]); del args[i:i + 2]
base_p, out_c, out_s = args[:3]
pairs = args[3:]
base = Image.open(base_p).convert("RGB")
W, H = base.size
BAND_W = round(H * 1024 / 600)
OFF_X = (W - BAND_W) // 2
SCALE = H / 600

def rect(x0, y0, x1, y1):
    return (round(OFF_X + x0 * SCALE), round(y0 * SCALE), round(OFF_X + x1 * SCALE), round(y1 * SCALE))

out = base.copy()
rec = {"base": base_p, "feather": feather, "pastes": []}
for src_p, r in zip(pairs[0::2], pairs[1::2]):
    src = Image.open(src_p).convert("RGB")
    assert src.size == base.size, (src_p, src.size, base.size)
    f = feather
    if ":f" in r:  # per-paste feather, e.g. 0,558,1024,600:f0 for a hard edge on the bottom line
        r, f = r.split(":f"); f = int(f)
    sr = rect(*map(int, r.split(",")))
    if f:
        w, h = sr[2] - sr[0], sr[3] - sr[1]
        mask = Image.new("L", (w, h), 255)
        px = mask.load()
        for y in range(h):
            for x in range(w):
                d = min(x, y, w - 1 - x, h - 1 - y)
                if d < f:
                    px[x, y] = int(255 * (d + 1) / (f + 1))
        out.paste(src.crop(sr), (sr[0], sr[1]), mask)
    else:
        out.paste(src.crop(sr), (sr[0], sr[1]))
    rec["pastes"].append({"source": src_p, "screenRect": [int(v) for v in r.split(",")], "canvasRect": list(sr), "feather": f})
out.save(out_c)
out.crop((OFF_X, 0, OFF_X + BAND_W, H)).resize((1024, 600), Image.LANCZOS).save(out_s)
rec["outputs"] = {"canvas": out_c, "screen": out_s, "bandRect": [OFF_X, 0, OFF_X + BAND_W, H]}
json.dump(rec, open(os.path.splitext(out_c)[0] + ".json", "w"), indent=2)
print("wrote", out_c, out_s, [p["screenRect"] for p in rec["pastes"]])
