"""Pass 86: the Sitting's pose pictures, pose-{S01,S02,S03}-{habit}-96x96 and -48x48 (origin/design-sitting, sitting.json masters): the species' face individual doing the habit, in the standard look, on the plain card ground (`ground` #162a37), no place.
Nine Pro paintings (source/work/sitting-poses-jobs.json, 9 requests) with the species' type-specimen picture as the identity reference (S01: its accepted portrait; S02 and S03: their placeholder renders, so those poses are placeholders of the look). Each painting's flat ground is keyed to the exact `ground` (the border median; a faint contact shadow is kept),
the creature (with its shadow) is fitted into the centred 80x80 of the 96 (8 px clear all round), reduced from the painting and never enlarged. The 48 is downsampled from the finished 96 (Lanczos) with a scripted pass in place of a hand pass: a mild unsharp mask (radius 0.6, 70 percent), every near-ground pixel (within 3 of `ground`) set to the exact ground, and a 4 px clear margin kept.
python3 -I tools/sittingposes.py -> slices/pose-*-96x96.png, -48x48.png, marks/sitting-poses-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
GROUND = np.array(pal["ground"], float); man = json.load(open("slices/manifest.json")); out = {}
SET = {"S01": ("shake-dry", "calm", "sleep-curled"), "S02": ("sniff", "puff", "sleep-curled"), "S03": ("dig", "glow", "sleep-curled")}; rep = {}
for sp, habits in SET.items():
    for h in habits:
        a = np.asarray(Image.open(f"source/raw/pose-{sp}-{h}.jpg").convert("RGB")).astype(float); H, W = a.shape[:2]
        b = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)]); g0 = np.median(b, axis=0)
        dev = np.abs(a - g0).max(2); al = np.clip((dev - 3) / 20.0, 0, 1); col = a * al[..., None] + GROUND * (1 - al[..., None]); keyed = Image.fromarray(np.clip(np.rint(col), 0, 255).astype(np.uint8))
        ys, xs = np.where(al > 0.35); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; obj = keyed.crop((x0, y0, x1, y1)); s = min(80 / obj.width, 80 / obj.height, 1.0)
        nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s)); cell = Image.new("RGB", (96, 96), tuple(int(v) for v in GROUND)); cell.paste(obj.resize((nw, nh), Image.LANCZOS), ((96 - nw) // 2, (96 - nh) // 2))
        name = f"pose-{sp}-{h}-96x96"; cell.save(f"slices/{name}.png", optimize=True); out[(sp, h, 96)] = cell
        sm = cell.resize((48, 48), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.6, percent=70, threshold=0)); c48 = np.asarray(sm).astype(float); near = np.abs(c48 - GROUND).max(2) <= 3; c48[near] = GROUND
        s48 = Image.fromarray(np.clip(np.rint(c48), 0, 255).astype(np.uint8)); n48 = f"pose-{sp}-{h}-48x48"; s48.save(f"slices/{n48}.png", optimize=True); out[(sp, h, 48)] = s48
        mk = np.abs(np.asarray(cell).astype(int) - GROUND.astype(int)).max(2) > 6; yy, xx = np.where(mk); rep[name] = {"scale": round(s, 3), "box": [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)]}
        for nm, im, sz, src in ((name, cell, 96, f"source/raw/pose-{sp}-{h}.jpg (gemini-3-pro-image)"), (n48, s48, 48, f"slices/{name}.png")):
            man[nm] = {"size": [sz, sz], "rect": None, "src": src, "made": (f"the {sp} pose picture, {h}: a Pro painting of the species' individual doing the habit, its ground keyed to `ground`, the creature fitted into the centred 80x80 (8 px clear), x{s:.3f}, never enlarged" if sz == 96 else f"downsampled from the 96 (Lanczos), a mild unsharp mask, near-ground pixels set to the exact ground (the scripted pass in place of a hand pass)") + " (pass 86)",
                       "sha256": hashlib.sha256(open(f"slices/{nm}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (9 * 108 + 8, 100 + 56 + 24), pal["ground"]); d = ImageDraw.Draw(sheet)
for i, (sp, hs) in enumerate((s, h) for s, hh in SET.items() for h in hh):
    x = 8 + i * 108; d.rectangle([x - 2, 6, x + 97, 105], outline=pal["hairline"]); sheet.paste(out[(sp, hs, 96)], (x, 8)); d.rectangle([x - 2, 110, x + 49, 163], outline=pal["hairline"]); sheet.paste(out[(sp, hs, 48)], (x, 112))
sheet.save("marks/sitting-poses-proof-1x.png"); sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save("marks/sitting-poses-proof-2x.png")
