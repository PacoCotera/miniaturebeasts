"""Pass 85: the Sitting's backdrops, sitting-backdrop-{plain,meadow,pond,rock,wood,cave}-544x408, cut from the six paintings of the run source/work/sitting-backdrops-jobs.json (gemini-3-pro-image, 6 requests, one retried after a 500).
The spec's horizon (the ground line) is at local y 248 of 408 (60.8 percent); the paintings put it at 66 to 72 percent, so each is cropped (never scaled up) to the 4:3 window, as wide as the painting allows, whose horizon falls on 60.8 percent: the horizon row is found as the strongest change of the centre strip's row means between 50 and 80 percent of the height.
The crop is reduced with Lanczos to 544x408 (a reduction of 0.45 to 0.63). The plain one's painted smudge in the tag area (x 168 to 378, y 362 to the bottom) is refilled row by row by a straight blend between the floor's own colour at its left and right; nothing else is changed. python3 -I tools/sittingbackdrops.py -> slices/sitting-backdrop-*.png, marks/sitting-backdrops-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
man = json.load(open("slices/manifest.json")); out = {}; rep = {}
for n in ("plain", "meadow", "pond", "rock", "wood", "cave"):
    srcn = "wood-r2" if n == "wood" else n      # the wood was repainted in pass 90 (art director, a079009f)
    im = Image.open(f"source/raw/sitting-backdrop-{srcn}.jpg").convert("RGB"); a = np.asarray(im).astype(float); H, W = a.shape[:2]
    c = a[:, int(W * .3):int(W * .7)].mean(1); k = 9; sm = np.stack([np.convolve(c[:, i], np.ones(k) / k, "same") for i in range(3)], 1); d = np.abs(sm[k:] - sm[:-k]).sum(1)
    lo, hi = int(H * .5), int(H * .8); y0 = lo + int(np.argmax(d[lo:hi])) + k // 2; T = 248 / 408
    t = max(0, int(np.ceil((y0 / T - H) / (1 / T - 1)))); Hc = (y0 - t) / T; Wc = Hc / 0.75
    while t + Hc > H or Wc > W: t += 1; Hc = (y0 - t) / T; Wc = Hc / 0.75
    Hc, Wc = int(Hc), int(Wc); x0 = (W - Wc) // 2; crop = im.crop((x0, t, x0 + Wc, t + Hc)).resize((544, 408), Image.LANCZOS)
    if n == "plain":      # the painting left a darker olive smudge in the tag area (x 172 to 374, y 364 to the bottom of the 544x408): each row there is refilled by a straight blend across it between the floor's own colour on its left (x 150 to 166) and right (x 380 to 396)
        c = np.asarray(crop).astype(float)
        for y in range(362, 408):
            l = c[y, 150:166].mean(0); r = c[y, 380:396].mean(0)
            for x in range(168, 378): f = (x - 167) / 210.0; c[y, x] = l * (1 - f) + r * f
        crop = Image.fromarray(np.clip(np.rint(c), 0, 255).astype(np.uint8))
    if n == "plain":      # pass 89 (art director, a079009f): the wall's average within 10 of `forest` #23623c and the floor's within 10 of `clay` #bf9157 (a per-channel gain on each, so the top-left glow stays), local y 248 one `sand` row, `clay` from 249, and the dark row (247) gone
        c = np.asarray(crop).astype(float); wall = c[:246].reshape(-1, 3).mean(0); floor = c[250:].reshape(-1, 3).mean(0)
        gw = np.array(pal["forest"]) / wall; gf = np.array(pal["clay"]) / floor
        c[:247] = np.clip(c[:247] * gw, 0, 255); c[249:] = np.clip(c[249:] * gf, 0, 255)
        c[247] = c[246]; c[248] = pal["sand"]
        for y in range(249, 260): w_ = (y - 249) / 10.0; c[y] = np.array(pal["clay"]) * (1 - w_) + c[y] * w_      # `clay` from row 249, easing into the graded floor over ten rows
        crop = Image.fromarray(np.clip(np.rint(c), 0, 255).astype(np.uint8))
    if n == "meadow":     # pass 89: in the centre box (local 120..424 x 24..336) the 99th percentile of brightness (Rec. 601 grey) under 176 (it was 202): a soft-knee compression of the brights inside the box, feathered 24 px outside it, so the glow and the edge flowers stay
        c = np.asarray(crop).astype(float); lum = c @ np.array([0.299, 0.587, 0.114]); yy, xx = np.mgrid[0:408, 0:544]
        dx = np.maximum(np.maximum(120 - xx, xx - 424), 0); dy = np.maximum(np.maximum(24 - yy, yy - 336), 0); wgt = np.clip(1 - np.hypot(dx, dy) / 24.0, 0, 1)
        box = (xx >= 120) & (xx <= 424) & (yy >= 24) & (yy <= 336)
        for knee in range(170, 100, -2):
            for k in (0.6, 0.45, 0.3, 0.2, 0.1):
                l2 = np.where(lum > knee, knee + (lum - knee) * k, lum); g = (l2 / np.maximum(lum, 1e-6))[..., None]; outc = c * (1 - wgt[..., None] + wgt[..., None] * g)
                if np.percentile((outc @ np.array([0.299, 0.587, 0.114]))[box], 99) < 174: break
            else: continue
            break
        crop = Image.fromarray(np.clip(np.rint(outc), 0, 255).astype(np.uint8)); print("meadow knee", knee, "k", k)
    name = f"sitting-backdrop-{n}-544x408"; crop.save(f"slices/{name}.png", optimize=True); out[n] = crop
    rep[n] = {"horizon_row": y0, "crop": [x0, t, x0 + Wc, t + Hc], "scale": round(544 / Wc, 3)}
    man[name] = {"size": [544, 408], "rect": None, "src": f"source/raw/sitting-backdrop-{srcn}.jpg (gemini-3-pro-image)", "made": f"the Sitting's {n} backdrop: a Pro painting (a soft wash, no creatures, no text), cropped to the 4:3 window whose horizon falls at the spec's local y 248 (crop {rep[n]['crop']}), reduced x{rep[n]['scale']} with Lanczos to 544x408, nothing else changed (pass 85)",
                 "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
# proof at 1x on the surface: each backdrop in the glass (24, 56) behind the gilt frame (16, 48) on the bezel ground, with the quiet zones marked by nothing (the proof shows the picture as the build will)
gilt = Image.open("slices/sitting-gilt-560x424.png").convert("RGBA"); sheet = Image.new("RGB", (3 * 576 + 8, 2 * 440 + 8), pal["ground"])
for i, n in enumerate(out):
    base = Image.new("RGBA", (576, 440), pal["ground"] + (255,)); base.alpha_composite(out[n].convert("RGBA"), (24, 24)); base.alpha_composite(gilt, (8, 8)); sheet.paste(base.convert("RGB"), (4 + (i % 3) * 576, 4 + (i // 3) * 440))
sheet.save("marks/sitting-backdrops-proof-1x.png")
