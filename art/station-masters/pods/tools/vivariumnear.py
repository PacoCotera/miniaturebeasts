"""Pass 101: the near Vivarium, 544x408 in day, dusk and night (Station art director's item (d), Oct 10): 'one mibi up close', the glass at screen (24, 56): the SAME place as the signed Idle painting, seen closer and at ground level. Ground band = the bottom 160 rows (screen y 304 to 464), clear moss and soil in the centre for one mibi (box about 304x312, feet near the centre); behind: the burrow's edge, stones, roots; at the right edge the feed line and the mist.
Day: source/raw/vivarium-near-day.jpg (Pro, with idle-vivarium-day as the place reference). Dusk and night: Pro edits of the near day picture (vivarium-near-dusk.jpg, vivarium-near-night.jpg), each with the signed Idle light as the light reference. Each picture is cut to 4:3 (centre) and reduced to 544x408 with Lanczos; no grading for day and dusk; the night (held by the art director, pass 103) has its glow blooms cut and is regraded to a mean L* of about 31.
python3 -I tools/vivariumnear.py -> slices/vivarium-near-*.png, marks/vivarium-near-proof-1x.png (each light beside Idle's matching light)"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
def bloom_fix(im):
    """Pass 103 (the art director's hold on the near night, same hand fix as Idle's night): every pixel above L* 50 cut 50 percent toward a 31 px median, then the linear light scaled by the least reduction that brings the mean L* to 31 or less (the brief asks 30 or more), the mean R kept at or above the mean B."""
    from PIL import ImageFilter
    a = np.asarray(im).astype(float); L = lstar(a)
    med = np.asarray(im.resize((272, 204), Image.LANCZOS).filter(ImageFilter.MedianFilter(15)).resize((544, 408), Image.BICUBIC)).astype(float)
    w = np.asarray(Image.fromarray((np.clip((L - 50.0) / 12.0, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)[..., None] / 255.0
    a = a + 0.5 * w * (med - a); lin = np.where(a / 255 <= 0.04045, a / 255 / 12.92, ((a / 255 + 0.055) / 1.055) ** 2.4)
    for g in np.arange(1.0, 0.5, -0.01):
        l2 = lin * g; cand = np.clip(np.rint(np.where(l2 <= 0.0031308, l2 * 12.92, 1.055 * l2 ** (1 / 2.4) - 0.055) * 255), 0, 255)
        if lstar(cand).mean() <= 31.0: break
    assert lstar(cand).mean() >= 30.0 and cand[..., 0].mean() >= cand[..., 2].mean()
    return Image.fromarray(cand.astype(np.uint8))
man = json.load(open("slices/manifest.json")); outs = {}; rep = {}
for k in ("day", "dusk", "night", "dawn"):
    im = Image.open(f"source/raw/vivarium-near-{k}.jpg").convert("RGB"); W, H = im.size; cw = round(H * 544 / 408)
    if cw <= W: x0 = (W - cw) // 2; im = im.crop((x0, 0, x0 + cw, H))
    else: ch = round(W * 408 / 544); y0 = (H - ch) // 2; im = im.crop((0, y0, W, y0 + ch))
    im = im.resize((544, 408), Image.LANCZOS)
    if k == "dawn":
        a = np.asarray(im).astype(float) / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
        for g in np.arange(1.0, 0.3, -0.01):
            l2 = lin * g; cand = np.clip(np.rint(np.where(l2 <= 0.0031308, l2 * 12.92, 1.055 * l2 ** (1 / 2.4) - 0.055) * 255), 0, 255)
            if lstar(cand).mean() <= 41.0: break
        im = Image.fromarray(cand.astype(np.uint8)); rep["dawn gain"] = round(float(g), 2)
    if k == "night": before = im; im = bloom_fix(im); before.save("/tmp/near-night-before.png")
    n = f"vivarium-near-{k}-544x408"; im.save(f"slices/{n}.png", optimize=True); outs[k] = im
    rep[k] = round(float(lstar(np.asarray(im).astype(float)).mean()), 1)
    man[n] = {"size": [544, 408], "rect": [24, 56, 544, 408], "src": f"source/raw/vivarium-near-{k}.jpg (gemini-3-pro-image)", "made": f"the near Vivarium by {k} ('one mibi up close', the glass at screen (24, 56)): the same place as the signed Idle painting seen closer at ground level, a clear moss and soil band across the bottom 160 rows for one mibi, the burrow's edge, stones and roots behind, the feed line and the mist at the right edge, no creature; a Pro painting" + ("" if k == "day" else f" (an edit of the near day picture, matched to Idle's {k} light)") + ", cut to 4:3 and reduced to 544x408 with Lanczos (pass 101)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
man["vivarium-near-dawn-544x408"]["made"] = "the near Vivarium by dawn (the owner's decision of Oct 10): a Pro edit of the signed near day picture in Idle's dawn light (pale, clean, cool-gold, a soft mist and dew, nothing glowing), the same place, cut to 4:3 and reduced to 544x408, graded by the least linear gain that brings the mean L* to 41 or less (pass 105)"
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (544 + 1024 + 24, 4 * 576 + 8), (10, 14, 18))
for i, k in enumerate(("day", "dusk", "night", "dawn")): sheet.paste(outs[k], (4, 4 + i * 576)); sheet.paste(Image.open(f"slices/idle-vivarium-{k}-1024x568.png").convert("RGB"), (544 + 16, 4 + i * 576))
sheet.save("marks/vivarium-near-proof-1x.png")
