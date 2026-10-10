"""Pass 101: the near Vivarium, 544x408 in day, dusk and night (Station art director's item (d), Oct 10): 'one mibi up close', the glass at screen (24, 56): the SAME place as the signed Idle painting, seen closer and at ground level. Ground band = the bottom 160 rows (screen y 304 to 464), clear moss and soil in the centre for one mibi (box about 304x312, feet near the centre); behind: the burrow's edge, stones, roots; at the right edge the feed line and the mist.
Day: source/raw/vivarium-near-day.jpg (Pro, with idle-vivarium-day as the place reference). Dusk and night: Pro edits of the near day picture (vivarium-near-dusk.jpg, vivarium-near-night.jpg), each with the signed Idle light as the light reference. Each picture is cut to 4:3 (centre) and reduced to 544x408 with Lanczos; no grading (the night's mean L* is 32.7 as painted, the brief asks 30 or more).
python3 -I tools/vivariumnear.py -> slices/vivarium-near-*.png, marks/vivarium-near-proof-1x.png (each light beside Idle's matching light)"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
man = json.load(open("slices/manifest.json")); outs = {}; rep = {}
for k in ("day", "dusk", "night"):
    im = Image.open(f"source/raw/vivarium-near-{k}.jpg").convert("RGB"); W, H = im.size; cw = round(H * 544 / 408)
    if cw <= W: x0 = (W - cw) // 2; im = im.crop((x0, 0, x0 + cw, H))
    else: ch = round(W * 408 / 544); y0 = (H - ch) // 2; im = im.crop((0, y0, W, y0 + ch))
    im = im.resize((544, 408), Image.LANCZOS); n = f"vivarium-near-{k}-544x408"; im.save(f"slices/{n}.png", optimize=True); outs[k] = im
    rep[k] = round(float(lstar(np.asarray(im).astype(float)).mean()), 1)
    man[n] = {"size": [544, 408], "rect": [24, 56, 544, 408], "src": f"source/raw/vivarium-near-{k}.jpg (gemini-3-pro-image)", "made": f"the near Vivarium by {k} ('one mibi up close', the glass at screen (24, 56)): the same place as the signed Idle painting seen closer at ground level, a clear moss and soil band across the bottom 160 rows for one mibi, the burrow's edge, stones and roots behind, the feed line and the mist at the right edge, no creature; a Pro painting" + ("" if k == "day" else f" (an edit of the near day picture, matched to Idle's {k} light)") + ", cut to 4:3 and reduced to 544x408 with Lanczos (pass 101)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (544 + 1024 + 24, 3 * 576 + 8), (10, 14, 18))
for i, k in enumerate(("day", "dusk", "night")): sheet.paste(outs[k], (4, 4 + i * 576)); sheet.paste(Image.open(f"slices/idle-vivarium-{k}-1024x568.png").convert("RGB"), (544 + 16, 4 + i * 576))
sheet.save("marks/vivarium-near-proof-1x.png")
