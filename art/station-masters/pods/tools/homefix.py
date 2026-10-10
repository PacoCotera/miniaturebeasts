"""Pass 100: the Station art director's two hand fixes on Home's column (second sheet, 7b37a705; no paid call). Run after tools/homecolumn.py.
1. home-bed-{day,dusk,night}-192x56: cut from the SIGNED idle-vivarium-{day,dusk,night}-1024x568 ground band, a 192x56 moss hollow, edges feathered to clear (a superellipse alpha, 16 px feather). The art director said "the spot where the whole's bed sits": the layout's with-you bed (screen (520, 472), 128x56) maps to painting (560, 484), but there the painting is the pool and its rocks, not moss, so the cut is the clear moss on the right of the ground band, centred on (848, 480), painting rect (752, 452, 192, 56); the choice of spot is the art director's to move. Replaces the bowl.
2. home-chamber-ready-72x72: the chamber's inner light graded by hand, brighter and creamier than the growing one: a soft cream light added inside the window opening (a radial screen, strongest at the top lamp and the middle, nothing on the housing or outside it), so it stays a light inside, never a ring.
python3 -I tools/homefix.py -> slices/home-bed-*.png, slices/home-chamber-ready-72x72.png, marks/home-fix-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
man = json.load(open("slices/manifest.json")); W, H = 192, 56; CX, CY = 848, 480; made = []
yy, xx = np.mgrid[0:H, 0:W]; u = np.abs((xx + 0.5 - W / 2) / (W / 2)); v = np.abs((yy + 0.5 - H / 2) / (H / 2))
sq = (u ** 3.0 + v ** 3.0) ** (1 / 3.0); alpha = np.clip((1.0 - sq) / 0.30, 0, 1); alpha = alpha * alpha * (3 - 2 * alpha)
for k in ("day", "dusk", "night", "dawn"):
    src = Image.open(f"slices/idle-vivarium-{k}-1024x568.png").convert("RGB").crop((CX - W // 2, CY - H // 2, CX + W // 2, CY + H // 2))
    t = np.dstack([np.asarray(src), (alpha * 255).round().astype(np.uint8)]); n = f"home-bed-{k}-{W}x{H}"; Image.fromarray(t, "RGBA").save(f"slices/{n}.png", optimize=True); made.append(n)
    man[n] = {"size": [W, H], "rect": None, "src": f"slices/idle-vivarium-{k}-1024x568.png (signed, gemini-3-pro-image)", "made": f"Home's bed by {k}: the moss hollow cut 192x56 from the signed Vivarium's ground band at (752, 452) on the painting (the clear moss on the right of the ground band), edges feathered to clear (pass 100)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
# the bowl is withdrawn: home-bed-192x56 is replaced by the day version under its own id
Image.open("slices/home-bed-day-192x56.png").save("slices/home-bed-192x56.png", optimize=True)
man["home-bed-192x56"] = {**man["home-bed-day-192x56"], "made": "Home's bed, the id the builder already knows: the day version (the same file as home-bed-day-192x56), replacing the bowl of pass 99 (pass 100)"}
man["home-bed-192x56"]["sha256"] = hashlib.sha256(open("slices/home-bed-192x56.png", "rb").read()).hexdigest()
# the ready chamber, from the cut of homecolumn.py (re-cut there, so this is idempotent)
n = "home-chamber-ready-72x72"; a = np.asarray(Image.open(f"slices/{n}.png").convert("RGBA")).astype(float); h, w = a.shape[:2]
Y, X = np.mgrid[0:h, 0:w]; win = np.clip((1 - np.maximum(np.abs(X - 30.0) / 17.5, np.abs(Y - 43.0) / 12.5) ** 4), 0, 1); win = win * win * (3 - 2 * win)
rad = np.exp(-(((X - 30.0) / 17.0) ** 2 + ((Y - 41.0) / 13.0) ** 2)); cream = np.array([1.0, 0.93, 0.74]); lin = (a[..., :3] / 255.0) ** 2.2
add = (win * (0.22 + 0.42 * rad))[..., None] * cream; out = 1 - (1 - lin) * (1 - add); a[..., :3] = np.clip(out ** (1 / 2.2) * 255, 0, 255)
Image.fromarray(a.astype(np.uint8), "RGBA").save(f"slices/{n}.png", optimize=True)
man[n]["made"] += "; the inner light graded brighter and creamier by hand (pass 100)"; man[n]["sha256"] = hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()
json.dump(man, open("slices/manifest.json", "w"), indent=1)
bg = (19, 26, 38); sheet = Image.new("RGB", (192 * 4 + 40 + 72 * 3 * 2 + 20, 130), bg); x = 8
for k in ("day", "dusk", "night", "dawn"): t = Image.open(f"slices/home-bed-{k}-192x56.png"); sheet.paste(t, (8 + (192 + 8) * ("day", "dusk", "night", "dawn").index(k), 8), t)
for i, c in enumerate(("growing", "ready")): t = Image.open(f"slices/home-chamber-{c}-72x72.png"); sheet.paste(t, (8 + i * 80, 66), t)
sheet.save("marks/home-fix-proof-1x.png"); print("ok", made)
