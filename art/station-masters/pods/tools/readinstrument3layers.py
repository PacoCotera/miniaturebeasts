"""The reading instrument, pass three, layout T: three moulded plastic modules (the specimen chamber, the gene-tag readout, the chapter in hand) mounted on one chassis plate.
usage: python3 -I tools/readinstrument3layers.py [out_dir]   -> <out>/ground-t-1x.png, ground-t.json, proof-module.png
The one painted module (source/raw/reading-instrument/p3-module-graphite.jpg, 2048 square) is nine-sliced three times at ONE scale k for its corners and bands, so the screws stay round
and the three frames are the same plastic: the corners are copied at k, the bands are stretched only along their length, the glass is stretched to each module's glass rect.
The chassis plate is derived from the painting's plate margin (its mean colour and its grain), with a soft top light. The coordinates code needs go to ground-t.json."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/reading-instrument/p3-module-graphite.jpg")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "source/work/reading-instrument/layers-p3"); os.makedirs(OUT, exist_ok=True)
src = Image.open(RAW).convert("RGB")
SX = [140, 430, 1645, 1910]; SY = [140, 430, 1640, 1910]       # measured: plate margin 140, module edge ~185, gasket to 425, glass 430..1645 (x) and 430..1640 (y), module foot ~1852, shadow to ~1900
K = 0.061                                                      # 15 px from the module's edge to its glass at the sides and top
GLASS = {"chamber": [23, 61, 582, 375], "tags": [23, 411, 582, 543], "chapter": [619, 61, 1002, 543]}
def piece(box, w, h): return src.crop(box).resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
# the chassis plate: the painting's plate grain (a high-pass of its margin), on its mean colour, a soft top light and a darker foot
rng = np.random.default_rng(3)
plate = np.asarray(src.crop((150, 20, 1900, 140)).resize((1024, 70), Image.LANCZOS)).astype(float)
mean = plate.reshape(-1, 3).mean(0) * 0.62                         # the plate sits darker than the modules (the painting's plate is lit; here it is the shadowed chassis)
grain = np.tile(plate - np.asarray(Image.fromarray(plate.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float), (9, 1, 1))[:600]
yy = np.linspace(0, 1, 600)[:, None, None]
G = np.clip(mean * (1.12 - 0.3 * yy) + grain * 0.5 + rng.normal(0, 2.2, (600, 1024, 1)), 0, 255)
G[:40] = 12; G[562:] = 12
G = Image.fromarray(G.astype(np.uint8))
geo = {"k": K, "modules": {}}
for name, (gx0, gy0, gx1, gy1) in GLASS.items():
    TX = [gx0 - (SX[1] - SX[0]) * K, gx0, gx1, gx1 + (SX[3] - SX[2]) * K]
    TY = [gy0 - (SY[1] - SY[0]) * K, gy0, gy1, gy1 + (SY[3] - SY[2]) * K]
    # the module's own soft shadow on the plate (a little more than the painted margin carries)
    sh = Image.new("L", (1024, 600), 0); m = np.zeros((600, 1024), np.uint8); m[int(gy0 - 13):int(gy1 + 16), int(gx0 - 13):int(gx1 + 13)] = 120
    sh = Image.fromarray(m).filter(ImageFilter.GaussianBlur(4)); G = Image.composite(Image.new("RGB", G.size, (6, 6, 6)), G, sh)
    for i in range(3):
        for j in range(3):
            w, h = TX[i + 1] - TX[i], TY[j + 1] - TY[j]
            G.paste(piece((SX[i], SY[j], SX[i + 1], SY[j + 1]), w, h), (round(TX[i]), round(TY[j])))
    geo["modules"][name] = {"glass": [gx0, gy0, gx1, gy1], "outer": [round(gx0 - 245 * K, 1), round(gy0 - 244 * K, 1), round(gx1 + 221 * K, 1), round(gy1 + 212 * K, 1)]}
G.save(os.path.join(OUT, "ground-t-1x.png"))
# the lamps sit centred in a frame band; each module's bottom band centre
for name, md in geo["modules"].items(): md["footY"] = round((md["glass"][3] + md["outer"][3]) / 2, 1)
json.dump(geo, open(os.path.join(OUT, "ground-t.json"), "w"), indent=1); print(json.dumps(geo))
pf = Image.new("RGB", (1024, 600 + 200), (20, 20, 20)); pf.paste(G, (0, 0))
pf.paste(G.crop((0, 340, 200, 440)).resize((400, 200), Image.NEAREST), (0, 600)); pf.paste(G.crop((560, 340, 760, 440)).resize((400, 200), Image.NEAREST), (420, 600))
pf.save(os.path.join(OUT, "proof-module.png")); print("layers in", OUT)
