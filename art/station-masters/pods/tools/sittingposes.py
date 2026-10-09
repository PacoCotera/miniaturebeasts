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

LIDS = [(379, 546, 440, 632), (518, 474, 570, 556)]       # the sleep-curled eyes on the 1024 painting (as tools/sittinglids.py)
def hand48(sp, h, im, sc, off, org):
    """The hand pass on a 48 (art director, a079009f), scripted pixel by pixel: (1) the contact shadow is clamped to 2 px: below each column's lowest creature pixel (more than 40 from `ground`) any shadow tail (4 to 40 from `ground`) beyond 2 px is the exact ground; (2) the creature is shifted by whole pixels so that 4 px stay clear on every side where it can;
    (3) the closed eyes of the sleeping pose are drawn as 1 px curved lids in the body's dark grey, since a lid 7 px wide on the painting is gone at 48; (4) one eye highlight: of the bright low-saturation pixels in an eye's 3x3 only the brightest stays white (the pictures already have exactly one per open eye: measured)."""
    a0 = np.asarray(im).astype(int).copy(); G = GROUND.astype(int); dev = np.abs(a0 - G).max(2); solid = dev > 40
    for allow in (2, 1, 0):                                                                               # the shadow tail kept: 2 px, or fewer where 4 px would not stay clear below it
        a = a0.copy()
        for x in range(48):
            ys = np.where(solid[:, x])[0]
            if len(ys):
                for y in range(ys.max() + 1 + allow, 48):
                    if 3 < dev[y, x] <= 40: a[y, x] = G
        mk0 = np.abs(a - G).max(2) > 6; ys0 = np.where(mk0.any(1))[0]
        if 47 - ys0.max() >= 4: break
    if sp != "S01": return im
    if h == "sleep-curled":
        dark = (46, 54, 60)
        for (ex0, ey0, ex1, ey1) in LIDS:
            cx48 = (((ex0 + ex1) / 2 - org[0]) * sc + off[0]) / 2; cy48 = (((ey0 + ey1) / 2 - org[1]) * sc + off[1]) / 2
            for t_, dyy in ((-2, 0), (-1, 1), (0, 1), (1, 1), (2, 0)):                     # a smile-shaped lid, 5 px wide: its ends one pixel higher than its middle
                a[int(round(cy48)) + dyy, int(round(cx48)) + t_] = dark
    mk = np.abs(a - G).max(2) > 6; ys, xs = np.where(mk); t, b, l, r = ys.min(), 47 - ys.max(), xs.min(), 47 - xs.max()
    dy = (min(4 - t, b - 4) if (t < 4 and b > 4) else -min(4 - b, t - 4) if (b < 4 and t > 4) else 0); dx = (min(4 - l, r - 4) if (l < 4 and r > 4) else -min(4 - r, l - 4) if (r < 4 and l > 4) else 0)
    if dy or dx:
        a = np.roll(np.roll(a, dy, 0), dx, 1)
        if dy > 0: a[:dy] = G
        if dy < 0: a[dy:] = G
        if dx > 0: a[:, :dx] = G
        if dx < 0: a[:, dx:] = G
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
for sp, habits in SET.items():
    for h in habits:
        srcp = f"pose-{sp}-{h}-r2" if (sp, h) in (("S01", "calm"), ("S01", "sleep-curled")) else f"pose-{sp}-{h}"      # the calm pose was repainted in pass 90 (art director, a079009f)
        srcf = f"source/raw/{srcp}.png" if os.path.exists(f"source/raw/{srcp}.png") else f"source/raw/{srcp}.jpg"
        a = np.asarray(Image.open(srcf).convert("RGB")).astype(float); H, W = a.shape[:2]
        b = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)]); g0 = np.median(b, axis=0)
        dev = np.abs(a - g0).max(2); al = np.clip((dev - 3) / 20.0, 0, 1); col = a * al[..., None] + GROUND * (1 - al[..., None]); keyed = Image.fromarray(np.clip(np.rint(col), 0, 255).astype(np.uint8))
        ys, xs = np.where(al > 0.35); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; obj = keyed.crop((x0, y0, x1, y1)); s = min(80 / obj.width, 80 / obj.height, 1.0)
        nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s)); cell = Image.new("RGB", (96, 96), tuple(int(v) for v in GROUND)); cell.paste(obj.resize((nw, nh), Image.LANCZOS), ((96 - nw) // 2, (96 - nh) // 2))
        name = f"pose-{sp}-{h}-96x96"; cell.save(f"slices/{name}.png", optimize=True); out[(sp, h, 96)] = cell
        sm = cell.resize((48, 48), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.6, percent=70, threshold=0)); c48 = np.asarray(sm).astype(float); near = np.abs(c48 - GROUND).max(2) <= 3; c48[near] = GROUND
        s48 = hand48(sp, h, Image.fromarray(np.clip(np.rint(c48), 0, 255).astype(np.uint8)), s, ((96 - nw) // 2, (96 - nh) // 2), (x0, y0)); n48 = f"pose-{sp}-{h}-48x48"; s48.save(f"slices/{n48}.png", optimize=True); out[(sp, h, 48)] = s48
        mk = np.abs(np.asarray(cell).astype(int) - GROUND.astype(int)).max(2) > 6; yy, xx = np.where(mk); rep[name] = {"scale": round(s, 3), "box": [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)]}
        for nm, im, sz, src in ((name, cell, 96, f"{srcf} (gemini-3-pro-image{', then the eyes closed by hand (tools/sittinglids.py)' if srcp.endswith('sleep-curled-r2') else ''})"), (n48, s48, 48, f"slices/{name}.png")):
            man[nm] = {"size": [sz, sz], "rect": None, "src": src, "made": (f"the {sp} pose picture, {h}: a Pro painting of the species' individual doing the habit, its ground keyed to `ground`, the creature fitted into the centred 80x80 (8 px clear), x{s:.3f}, never enlarged" if sz == 96 else f"downsampled from the 96 (Lanczos), a mild unsharp mask, near-ground pixels set to the exact ground (the scripted pass in place of a hand pass)") + " (pass 86)",
                       "sha256": hashlib.sha256(open(f"slices/{nm}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (9 * 108 + 8, 100 + 56 + 24), pal["ground"]); d = ImageDraw.Draw(sheet)
for i, (sp, hs) in enumerate((s, h) for s, hh in SET.items() for h in hh):
    x = 8 + i * 108; d.rectangle([x - 2, 6, x + 97, 105], outline=pal["hairline"]); sheet.paste(out[(sp, hs, 96)], (x, 8)); d.rectangle([x - 2, 110, x + 49, 163], outline=pal["hairline"]); sheet.paste(out[(sp, hs, 48)], (x, 112))
sheet.save("marks/sitting-poses-proof-1x.png"); sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save("marks/sitting-poses-proof-2x.png")
