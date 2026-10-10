"""Pass 119: the night repaints cut and graded by hand within the art director's targets (the owner-approved Pro repaints: source/raw/idle-night-repaint.jpg from the signed Idle day, source/raw/glass-night-repaint.jpg from the signed glass day; 2 requests, no retry). No paid call here.
Each picture is centre-cut to its size (1024x568; 640x488) and Lanczos-reduced, then given a final regrade by tools/nightdist.py within the targets: mean L* 24 to 28, background 12 to 18, ground 30 to 36 lit evenly, at most 3 percent of pixels above L* 70, R above B, sat 45 to 65 (the background held near 17, the ground set to 35, the highlights capped by a soft curve; no moon rim is present to scale). home-bed-night is re-cut from the new Idle night by tools/homefix.py (run after this).
python3 -I tools/nightrepaint.py -> slices/idle-vivarium-night-1024x568.png, slices/home-glass-night-640x488.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
def cut(path, w, h):
    im = Image.open(path).convert("RGB"); W, H = im.size; ch = round(W * h / w)
    if ch <= H: y0 = (H - ch) // 2; im = im.crop((0, y0, W, y0 + ch))
    else: cw = round(H * w / h); x0 = (W - cw) // 2; im = im.crop((x0, 0, x0 + cw, H))
    return im.resize((w, h), Image.LANCZOS)
man = json.load(open("slices/manifest.json")); rep = {}
for n, src, w, h, gm, ramp, what in (("idle-vivarium-night-1024x568", "idle-night-repaint", 1024, 568, 330, 90, "Idle's Vivarium by night: a Pro repaint of the signed Idle day under the device's grow lamp dimmed to a low warm glow (the owner-approved repaint of Oct 10; the first night, vivarium-night-r2, is withdrawn)"), ("home-glass-night-640x488", "glass-night-repaint", 640, 488, 268, 88, "Home's glass by night: a Pro repaint of the signed glass day under the dimmed grow lamp (the owner-approved repaint of Oct 10)")):
    im, d = night_dist(cut(f"source/raw/{src}.jpg", w, h), gm, ramp, 0, bg_target=17.0, pool_cap=True, rim_scale=1.0, ground_exact=35.0, bloom=(70.0, 0.0), knee_p=(58.0, 11.5, 8.0)); rep[n] = d
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": [w, h], "rect": None, "src": f"source/raw/{src}.jpg (gemini-3-pro-image)", "made": what + ", centre-cut and reduced with Lanczos, then regraded by hand within the night targets (background about 17, ground 35, at most 3 percent above L* 70) (pass 119)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
