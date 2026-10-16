"""Pass 79: three Library look plates redrawn at their target size (art director's verdict on passes 74-78): trait-S01-eyes-between-small-and-large, trait-S01-markings-plain and trait-S09-beak-between at 56x56 and 40x40.
The first cut (guideplates.py) reduced the signed 128x160 pictures with their fades, and the rectangle's straight edges still read at 1x. Here the edge is repainted at the target size: the content is reduced, then a soft superellipse mask (an ellipse, so no side is flat) is laid on it,
fading into `ground` over 3 px at 56 and 2 px at 40; the mask's centre and radii are set per picture on the content box (96x120 of the signed 128x160). markings-plain is cut afresh from the S01 side painting (the signed picture clipped the legs and the cream flank): the cream flank patch,
the grey back above it and both legs, the paper keyed to ground, reduced into the centred 42x42 of 56 (30x30 of 40) and masked the same way, so it reads as a patch of coat. No straight cut edge longer than 6 px is left (measured: the longest stretch of rows or columns over which the outline stays on one pixel, beside the same figure for the plain hard-edged ellipse, which any rounded shape of this size has).
python3 -I tools/guideplates2.py -> slices/trait-S01-eyes-...-56x56|40x40, trait-S01-markings-plain-..., trait-S09-beak-between-..., marks/guide-plates2-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
GROUND = np.array(pal["ground"], float); PAPER = np.array([246.0, 243.0, 236.0]); man = json.load(open("slices/manifest.json"))
def ground_alpha(a):
    d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    g = (d < 10) | ((spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5)); H, W = g.shape; lab = np.zeros_like(g)
    lab[0, :] = g[0, :]; lab[-1, :] = g[-1, :]; lab[:, 0] = g[:, 0]; lab[:, -1] = g[:, -1]
    while True:
        n = lab.copy(); n[1:, :] |= lab[:-1, :]; n[:-1, :] |= lab[1:, :]; n[:, 1:] |= lab[:, :-1]; n[:, :-1] |= lab[:, 1:]; n &= g
        if (n == lab).all(): break
        lab = n
    al = np.where(lab, 0.0, 1.0); k = np.pad(al, 1, mode="edge"); return sum(k[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)) / 9
def mask(w, h, cx, cy, rx, ry, f, n=2.0):
    y, x = np.mgrid[0:h, 0:w] + 0.5; s = (np.abs((x - cx) / rx) ** n + np.abs((y - cy) / ry) ** n) ** (1 / n); d = (1 - s) * min(rx, ry)
    t = np.clip(d / f, 0, 1); return t * t * (3 - 2 * t)
def runs(m):
    """Longest stretch over which the outline stays on one row or column (the straight edge), taken on the four sides of the shape."""
    best = 0
    for arr in (m, m[:, ::-1], m.T, m.T[:, ::-1]):
        first = [int(np.argmax(r)) if r.any() else -1 for r in arr]; run = 1
        for a, b in zip(first, first[1:]):
            run = run + 1 if a == b and a >= 0 else 1; best = max(best, run)
    return best
# (plate, source, box on the source, mask centre and radii in the box's own pixels)
JOBS = {"trait-S01-eyes-between-small-and-large": ("slices/trait-S01-eyes-between-small-and-large-128x160.png", (16, 20, 112, 140), (48, 62, 40, 52)),
        "trait-S09-beak-between": ("slices/trait-S09-beak-between-128x160.png", (16, 20, 112, 140), (50, 60, 44, 56)),
        "trait-S01-markings-plain": ("prototypes/workbench/grow/out/S01/07bef58c9d38d564/station-side-600x620.png", (70, 270, 380, 580), (155, 155, 148, 148))}
rep = {}
for base, (src, box, (cx, cy, rx, ry)) in JOBS.items():
    im = Image.open(src if src.startswith("slices") else os.path.join(REPO, src)).convert("RGB"); a = np.asarray(im).astype(float)
    if not src.startswith("slices"):
        al = ground_alpha(a); a = GROUND + (a - GROUND) * al[..., None]
    crop = Image.fromarray(np.clip(np.rint(a), 0, 255).astype(np.uint8)).crop(box); bw, bh = crop.size
    for s, f in ((56, 3.0), (40, 2.0)):
        avail = (s * 3 // 4, s * 3 // 4) if base == "trait-S01-markings-plain" else (s * 3 // 4 * 4 // 5, s * 3 // 4)       # 96x120 content scales to 34x42 and 24x30; the square flank cut to 42x42 and 30x30
        k = min(avail[0] / bw, avail[1] / bh, 1.0); tw, th = max(1, round(bw * k)), max(1, round(bh * k)); red = np.asarray(crop.resize((tw, th), Image.LANCZOS)).astype(float)
        m = mask(tw, th, cx * k, cy * k, rx * k, ry * k, f)[..., None]; cont = GROUND + (red - GROUND) * m
        out = np.tile(GROUND, (s, s, 1)); ox, oy = (s - tw) // 2, (s - th) // 2; out[oy:oy + th, ox:ox + tw] = cont
        o = Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)); name = f"{base}-{s}x{s}"; o.save(f"slices/{name}.png", optimize=True)
        solid = (np.abs(out - GROUND).max(2) > 24); ideal = mask(tw, th, cx * k, cy * k, rx * k, ry * k, 0.01) > 0.5; rep[name] = {"fade_px": f, "longest run": runs(solid), "same ellipse, hard-edged": runs(ideal)}
        man[name] = {"size": [s, s], "rect": None, "src": src, "made": f"redrawn at {s}x{s} (pass 79): {'the signed picture' if src.startswith('slices') else 'the S01 side painting (the cream flank, the grey back and both legs)'} reduced to {tw}x{th} (never enlarged), then a superellipse mask fading into `ground` over {int(f)} px, so no straight cut edge remains; on the cell tone `ground`",
                     "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep, indent=0))
# proof on `paper` at 1x: all twelve looks, 56 above 40 (the three redone are the last three of the first row)
import glob, re
names = sorted({re.sub(r"-56x56$", "", os.path.basename(f)[:-4]) for f in glob.glob("slices/trait-S??-*-56x56.png")}, key=lambda b: (b not in JOBS, b))
cv = Image.new("RGB", (len(names) * 64 + 8, 56 + 40 + 24), pal["paper"])
for i, b in enumerate(names): cv.paste(Image.open(f"slices/{b}-56x56.png"), (8 + i * 64, 8)); cv.paste(Image.open(f"slices/{b}-40x40.png"), (8 + i * 64, 72))
cv.save("marks/guide-plates2-proof-1x.png"); cv.resize((cv.width * 3, cv.height * 3), Image.NEAREST).save("marks/guide-plates2-proof-3x.png")
