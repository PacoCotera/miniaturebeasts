"""Pass 77: the Library field guide's faces, guide-face-<SNN>-128x112, S01 to S16 (origin/design-field-guide 2353443f, library.json masters): the species' head and shoulders cut from its type-specimen picture, on the cell tone `ground`, content inside the centred 75 percent (96x84 of 128x112), reduced and never enlarged.
Sources: S09 prototypes/workbench/grow/species/S09/portrait-600x620.png, S12 grow/out/S12/2af58fb73ac5cbbd/station-portrait-600x620.png (both painted), S01 grow/out/S01/07bef58c9d38d564/station-portrait-600x620.png (the accepted type specimen, a low-poly render);
every other species has only its placeholder render, plain/renders/<SNN>/<SNN>/portrait-300x310.png, so its face is recorded `placeholder` until its painting exists. Each crop box is hand-placed on the head and shoulders and grown to the 8:7 of the 96x84 content box,
so the reduced crop fills the box and a side where the picture continues past the box is a cut edge: the paper ground is keyed to `ground` (the flood from the picture's border, feathered 1 px), then cutfade.py's keyed fade runs along every cut edge. No text.
python3 -I tools/guidefaces.py -> slices/guide-face-S*-128x112.png, marks/guide-faces-proof-1x.png and -3x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
exec(open("tools/cutfade.py").read())
WB = os.path.join(REPO, "prototypes/workbench"); pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
GROUND = pal["ground"]; PAPER = np.array([246.0, 243.0, 236.0])
P = {"S01": ("grow/out/S01/07bef58c9d38d564/station-portrait-600x620.png", (90, 35, 420, 400)), "S09": ("grow/species/S09/portrait-600x620.png", (85, 35, 335, 335)), "S12": ("grow/out/S12/2af58fb73ac5cbbd/station-portrait-600x620.png", (80, 290, 420, 560))}
PL = {"S02": (20, 60, 250, 260), "S03": (25, 100, 215, 260), "S04": (30, 55, 210, 200), "S05": (20, 60, 180, 200), "S06": (25, 70, 200, 235), "S07": (25, 25, 210, 220), "S08": (70, 25, 200, 200), "S10": (15, 110, 215, 260),
      "S11": (25, 90, 205, 215), "S13": (20, 125, 200, 250), "S14": (30, 110, 230, 260), "S15": (50, 30, 270, 250), "S16": (85, 25, 195, 150)}
for k, b in PL.items(): P[k] = (f"plain/renders/{k}/{k}/portrait-300x310.png", b)
def ground_alpha(a):
    d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    g = (d < 10) | ((spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5)); H, W = g.shape; lab = np.zeros_like(g)
    lab[0, :] = g[0, :]; lab[-1, :] = g[-1, :]; lab[:, 0] = g[:, 0]; lab[:, -1] = g[:, -1]
    while True:
        n = lab.copy(); n[1:, :] |= lab[:-1, :]; n[:-1, :] |= lab[1:, :]; n[:, 1:] |= lab[:, :-1]; n[:, :-1] |= lab[:, 1:]; n &= g
        if (n == lab).all(): break
        lab = n
    al = np.where(lab, 0.0, 1.0); k = np.pad(al, 1, mode="edge"); return sum(k[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)) / 9      # feathered 1 px
def fit(box, W, H):
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    if w / h < 8 / 7: nw = h * 8 / 7; x0 -= (nw - w) / 2; x1 = x0 + nw
    else: nh = w * 7 / 8; y0 -= (nh - h) / 2; y1 = y0 + nh
    sh = lambda lo, hi, m: (lo, hi) if lo >= 0 and hi <= m else ((0, hi - lo) if lo < 0 else (m - (hi - lo), m))
    x0, x1 = sh(x0, x1, W); y0, y1 = sh(y0, y1, H); return tuple(int(round(v)) for v in (x0, y0, x1, y1))
man = json.load(open("slices/manifest.json")); out = {}; rep = {}
for sp, (path, box) in P.items():
    src = Image.open(os.path.join(WB, path)).convert("RGB"); W, H = src.size; a = np.asarray(src).astype(float); al = ground_alpha(a)
    bx = fit(box, W, H); crop = a[bx[1]:bx[3], bx[0]:bx[2]]; ca = al[bx[1]:bx[3], bx[0]:bx[2]]; g = np.array(GROUND, float)
    comp = Image.fromarray(np.clip(np.rint(g + (crop - g) * ca[..., None]), 0, 255).astype(np.uint8))
    s = min(1.0, 96 / comp.width, 84 / comp.height); size = (max(1, round(comp.width * s)), max(1, round(comp.height * s)))
    cont = Image.new("RGB", (96, 84), GROUND); cont.paste(comp.resize(size, Image.LANCZOS), ((96 - size[0]) // 2, (84 - size[1]) // 2))
    cont, edges = fade_cut(cont, GROUND); im = Image.new("RGB", (128, 112), GROUND); im.paste(cont, (16, 14)); out[sp] = im; rep[sp] = {"box": bx, "scale": round(s, 3), "cuts": [e["edge"] for e in edges]}
    name = f"guide-face-{sp}-128x112"; im.save(f"slices/{name}.png", optimize=True)
    what = "the type specimen's" if sp in ("S01", "S09", "S12") else "its PLACEHOLDER render's (no painting yet)"
    man[name] = {"size": [128, 112], "rect": None, "src": path, "made": f"{what} head and shoulders (source box {bx}), the paper keyed to `ground`, reduced x{s:.3f} (never enlarged) into the centred 96x84 of 128x112, the keyed fade along the cut edges {[e['edge'] for e in edges]} (pass 77)", "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12); cv = Image.new("RGB", (4 * 136 + 8, 4 * 132 + 8), (10, 20, 26)); d = ImageDraw.Draw(cv)
for i, sp in enumerate(sorted(out)):
    x, y = 8 + i % 4 * 136, 8 + i // 4 * 132; cv.paste(out[sp], (x, y)); d.text((x + 2, y + 114), sp + ("" if sp in ("S01", "S09", "S12") else " placeholder"), font=f12, fill=pal["bone"])
cv.save("marks/guide-faces-proof-1x.png"); cv.resize((cv.width * 2, cv.height * 2), Image.NEAREST).save("marks/guide-faces-proof-2x.png")
