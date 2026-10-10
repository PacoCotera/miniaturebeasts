"""Pass 107: Home's glass, 640x488 in dawn, day, dusk and night (Station art director's brief, Oct 10): the glass of the Home screen at screen (24, 56), where the residents walk (glass rows 244 to 335) and the with-you bed's sprite (home-bed-*-192x56) sits at screen (448, 472), i.e. (424, 416) on the glass.
Day: source/raw/home-glass-day.jpg (one Pro recompose of the signed idle-vivarium-day: the burrow at the left, the pool right of centre, the mister and vent inside the right edge, the feed line at the left, a plain dark soil foot under the moss; the art director kept it, no retry). Dawn, dusk and night: Pro edits of that day (home-glass-{dawn,dusk,night}.jpg), each with the signed Idle light as the light reference. Each 4:3 picture is centre-cut to 640:488 (a few px off each side) and reduced with Lanczos. Dawn is graded by the least linear gain that brings the mean L* to 41 or less (as Idle's dawn); night is regraded by distribution (tools/nightdist.py: a dark umber-olive background, a warm ground band, small glow pools, mean L* of 30 or more, R at or above B); day and dusk are as painted.
python3 -I tools/homeglass.py -> slices/home-glass-*-640x488.png, marks/home-glass-proof-1x.png (the four glasses with the bed sprite composited at its spot)"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
man = json.load(open("slices/manifest.json")); outs = {}; rep = {}
for k in ("dawn", "day", "dusk", "night"):
    im = Image.open(f"source/raw/home-glass-{k}.jpg").convert("RGB"); W, H = im.size; cw = round(H * 640 / 488); x0 = (W - cw) // 2; im = im.crop((x0, 0, x0 + cw, H)).resize((640, 488), Image.LANCZOS)
    if k == "dawn":
        lin = to_lin(np.asarray(im).astype(float))
        for g in np.arange(1.0, 0.3, -0.01):
            cand = to_srgb(lin * g)
            if lstar(cand).mean() <= 41.0: break
        im = Image.fromarray(cand.astype(np.uint8)); rep["dawn gain"] = round(float(g), 2)
    if k == "night": im, nrep = night_dist(im, 268, 88, 70); rep["night detail"] = nrep
    n = f"home-glass-{k}-640x488"; im.save(f"slices/{n}.png", optimize=True); outs[k] = im; rep[k] = round(float(lstar(np.asarray(im).astype(float)).mean()), 1)
    man[n] = {"size": [640, 488], "rect": [24, 56, 640, 488], "src": f"source/raw/home-glass-{k}.jpg (gemini-3-pro-image)", "made": f"Home's glass by {k}: the signed Vivarium's place recomposed for a 640x488 window (burrow left, pool right of centre, the mister and vent inside the right edge, the feed line at the left, the walk band on in-focus moss and soil, a dark soil foot), a Pro " + ("recompose of the signed day picture" if k == "day" else f"edit of the home glass day picture matched to Idle's {k} light") + ", cut to 640:488 and reduced with Lanczos" + (", graded down to a mean L* of 41 or less" if k == "dawn" else ", regraded by distribution (dark background, warm ground band, small glow pools)" if k == "night" else "") + " (pass 107)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (2 * 640 + 12, 2 * 488 + 12), (10, 14, 18))
for i, k in enumerate(("dawn", "day", "dusk", "night")):
    g = outs[k].convert("RGBA"); bed = Image.open(f"slices/home-bed-{k}-192x56.png").convert("RGBA"); g.alpha_composite(bed, (424, 416)); r, c = divmod(i, 2); sheet.paste(g.convert("RGB"), (4 + c * 646, 4 + r * 494))
sheet.save("marks/home-glass-proof-1x.png")
