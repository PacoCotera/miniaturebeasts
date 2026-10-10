"""Pass 94: Idle's Vivarium, 1024x568 in day, dusk and night (Station art director's brief, Oct 10; direction: board frame 1's vivarium, the same light and Miniature Lives rendering): idle-vivarium-{day,dusk,night}-1024x568. The id is my proposal: no slice name is written in the layout (it says "Idle's Vivarium 1024x568, a painting per light").
One painting serves three uses: Idle shows it full; the whole Vivarium shows rows 120 to 560; Home's glass is its crop (0, 40, 640, 488). Composed in the prompt: rows 0 to 120 canopy and light only; the ground band (rows 376 to 552) holds the burrow, the water, the stones and the moss at the mibis' scale; the left 640 px work on their own as Home's view; the life-support (a feed line, a mister, a vent) meets the edges; no creature painted in.
Day: source/raw/vivarium-day.jpg (Pro). Dusk and night are Pro edits of the day picture (vivarium-dusk.jpg, vivarium-night-r2.jpg; the first night, vivarium-night.jpg, was too dark and its canopy blue-teal and is not used). Each 1376x768 painting is cropped to 1024:568 (a few rows off the top and bottom) and reduced with Lanczos.
Night is graded: its mean L* was 24.9 against the required 30 or more, so its linear light is raised by the least gain that brings the mean L* to 30.5 or more (a soft knee holds the highlights under 250); nothing else changes.
python3 -I tools/vivarium.py -> slices/idle-vivarium-*.png, marks/vivarium-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
def cut(src):
    im = Image.open(f"source/raw/{src}.jpg").convert("RGB"); W, H = im.size; ch = round(W * 568 / 1024); y0 = (H - ch) // 2; return im.crop((0, y0, W, y0 + ch)).resize((1024, 568), Image.LANCZOS)
SRC = {"day": "vivarium-day", "dusk": "vivarium-dusk", "night": "vivarium-night-r2"}; man = json.load(open("slices/manifest.json")); out = {}; rep = {}
for k, s in SRC.items():
    im = cut(s)
    if k == "night":
        a = np.asarray(im).astype(float) / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
        for g in np.arange(1.0, 3.0, 0.02):
            l2 = lin * g; l2 = np.where(l2 > 0.8, 0.8 + (1 - np.exp(-(l2 - 0.8) / 0.2)) * 0.2, l2); l2 = np.clip(l2, 0, 1)
            sr = np.where(l2 <= 0.0031308, l2 * 12.92, 1.055 * l2 ** (1 / 2.4) - 0.055); cand = np.clip(np.rint(sr * 255), 0, 255)
            if lstar(cand).mean() >= 30.5: break
        im = Image.fromarray(cand.astype(np.uint8)); rep["night gain"] = round(float(g), 2)
    n = f"idle-vivarium-{k}-1024x568"; im.save(f"slices/{n}.png", optimize=True); out[k] = im; rep[k] = {"mean L*": round(float(lstar(np.asarray(im).astype(float)).mean()), 1)}
    man[n] = {"size": [1024, 568], "rect": None, "src": f"source/raw/{s}.jpg (gemini-3-pro-image)", "made": f"Idle's Vivarium by {k}: a Pro painting of the vivarium alone (canopy band on top, ground band with burrow, water, stones and moss, feed line, mister and vent at the edges, no creatures), cropped to 1024:568 and reduced with Lanczos" + (f" (the day picture's edit: dusk is warmer and lower)" if k == "dusk" else f" (an edit of the day picture: warm, low, glow-moss, the moon a cool rim only; graded x{rep.get('night gain')} in linear light to a mean L* of {rep[k]['mean L*']})" if k == "night" else "") + " (pass 94)",
                      "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (1024 + 640 + 24, 3 * 576 + 8), (10, 14, 18))
for i, k in enumerate(("day", "dusk", "night")): sheet.paste(out[k], (4, 4 + i * 576)); sheet.paste(out[k].crop((0, 40, 640, 488)), (1024 + 16, 4 + i * 576 + 60))
sheet.save("marks/vivarium-proof-1x.png")
