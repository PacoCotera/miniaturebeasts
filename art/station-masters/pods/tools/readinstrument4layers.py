"""The reading instrument, pass four: TWO moulded plastic frames on one chassis plate (left: the specimen chamber with the gene-tag rail under it, one glass; right: the chapter in hand).
usage: python3 -I tools/readinstrument4layers.py [out_dir]   -> <out>/ground-2f-1x.png, ground-2f.json, proof-corner.png
The pass-three module painting (source/raw/reading-instrument/p3-module-graphite.jpg) is nine-sliced at ONE scale K for corners and bands (screws stay round), K raised from 0.061 to 0.10
so the frames are a little thicker. The glass is no longer the stretched painted glass: its stretched rounded corner (a black gasket wedge and a bright rim arc, about 18 px at 1x) read as a hole.
Each glass is rebuilt from the painting's glass INTERIOR (clear of its corners) on a smooth base, with its own small radius:
  left:  base + 0.67 x (painted - base): the painted diagonal glare at two thirds of its pass-three strength;
  right: the base alone plus the painting's fine grain: no diagonal glare (its words read cleanly), only the thin top edge reflection, drawn in code."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/reading-instrument/p3-module-graphite.jpg")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "source/work/reading-instrument/layers-p4"); os.makedirs(OUT, exist_ok=True)
src = Image.open(RAW).convert("RGB")
SX = [140, 430, 1645, 1910]; SY = [140, 430, 1640, 1910]       # measured in pass three
K = 0.10                                                       # pass three 0.061: the plastic band goes from ~15 to ~24 px
GLASS = {"left": [30, 70, 578, 532], "right": [634, 70, 994, 532]}
RADIUS = 10
GLARE = {"left": 0.67, "right": 0.0}
def piece(box, w, h): return src.crop(box).resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
rng = np.random.default_rng(4)
plate = np.asarray(src.crop((150, 20, 1900, 140)).resize((1024, 70), Image.LANCZOS)).astype(float)
mean = plate.reshape(-1, 3).mean(0) * 0.62
grain = np.tile(plate - np.asarray(Image.fromarray(plate.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float), (9, 1, 1))[:600]
yy = np.linspace(0, 1, 600)[:, None, None]
G = np.clip(mean * (1.12 - 0.3 * yy) + grain * 0.5 + rng.normal(0, 2.2, (600, 1024, 1)), 0, 255)
G[:40] = 12; G[562:] = 12
G = Image.fromarray(G.astype(np.uint8))
# the painted glass interior, clear of its rounded corners and gasket
INNER = src.crop((480, 480, 1595, 1590))
def glass(w, h, glare):
    p = np.asarray(INNER.resize((w, h), Image.LANCZOS)).astype(float)
    y = np.linspace(0, 1, h)[:, None, None]; x = np.linspace(-1, 1, w)[None, :, None]
    base = np.array([6, 24, 30.0]) + np.array([5, 12, 14.0]) * (1 - y) * (1 - 0.35 * x * x)          # deep teal, a little lighter high in the middle
    fine = p - np.asarray(Image.fromarray(p.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
    fine = np.clip(fine, -5, 5)
    g = base + glare * (p - base) if glare else base + fine
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))
geo = {"k": K, "frames": {}}
for name, (gx0, gy0, gx1, gy1) in GLASS.items():
    TX = [gx0 - (SX[1] - SX[0]) * K, gx0, gx1, gx1 + (SX[3] - SX[2]) * K]
    TY = [gy0 - (SY[1] - SY[0]) * K, gy0, gy1, gy1 + (SY[3] - SY[2]) * K]
    m = np.zeros((600, 1024), np.uint8); m[int(gy0 - 22):int(gy1 + 26), int(gx0 - 22):int(gx1 + 22)] = 120
    sh = Image.fromarray(m).filter(ImageFilter.GaussianBlur(5)); G = Image.composite(Image.new("RGB", G.size, (6, 6, 6)), G, sh)
    for i in range(3):
        for j in range(3):
            if i == 1 and j == 1: continue
            w, h = TX[i + 1] - TX[i], TY[j + 1] - TY[j]
            G.paste(piece((SX[i], SY[j], SX[i + 1], SY[j + 1]), w, h), (round(TX[i]), round(TY[j])))
    # the gasket behind the glass corner (the rubber's own black), then the glass with its own radius
    W, H = gx1 - gx0, gy1 - gy0
    G.paste(Image.new("RGB", (W, H), (9, 11, 13)), (gx0, gy0))
    mk = Image.new("L", (W * 4, H * 4), 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, W * 4 - 1, H * 4 - 1), RADIUS * 4, fill=255); mk = mk.resize((W, H), Image.LANCZOS)
    G.paste(glass(W, H, GLARE[name]), (gx0, gy0), mk)
    geo["frames"][name] = {"glass": [gx0, gy0, gx1, gy1], "radius": RADIUS, "outer": [round(gx0 - 245 * K, 1), round(gy0 - 244 * K, 1), round(gx1 + 221 * K, 1), round(gy1 + 212 * K, 1)],
                           "footY": round((gy1 + gy1 + 212 * K) / 2, 1)}
G.save(os.path.join(OUT, "ground-2f-1x.png"))
json.dump(geo, open(os.path.join(OUT, "ground-2f.json"), "w"), indent=1); print(json.dumps(geo))
pf = Image.new("RGB", (840, 220), (20, 20, 20)); pf.paste(G.crop((0, 40, 200, 140)).resize((400, 200), Image.NEAREST), (10, 10)); pf.paste(G.crop((560, 40, 760, 140)).resize((400, 200), Image.NEAREST), (430, 10))
pf.save(os.path.join(OUT, "proof-corner.png")); print("layers in", OUT)
