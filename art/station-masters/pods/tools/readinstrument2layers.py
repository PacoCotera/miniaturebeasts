"""The reading instrument, pass two: the painted plastic housing fitted to the game's layout, and its lamps.
usage: python3 -I tools/readinstrument2layers.py [out_dir]   -> <out>/ground-p2-1x.png, lamp-*.png, ground-p2.json, proof-housing.png
The painting (source/raw/reading-instrument/p2-housing-graphite.jpg) is remapped piece by piece, never squashed where it has a feature:
  * the top, the sides and the bezel round the glass are a nine-slice: corners at one scale, the bands stretched only along their length, the glass stretched to the game's glass rect;
  * the foot lip is rebuilt at one even scale: its left end (screw), the printed label strip, the lamp channel (stretched along its length only), its right end (amber lamp, grille, screw).
The coordinates code needs (glass rect, label rect, channel rect, read lamp) go to ground-p2.json."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/reading-instrument/p2-housing-graphite.jpg")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "source/work/reading-instrument/layers-p2"); os.makedirs(OUT, exist_ok=True)
src = Image.open(RAW).convert("RGB"); SW, SH = src.size                       # 2752 x 1536
# measured on the painting (full size): the glass, the bezel's foot, the lip's features
SX = [0, 276, 2500, SW]; SY = [0, 280, 1232, 1300]                            # glass x 276..2500, y 280..1232; the bezel's foot ends at 1300, the lip below
TX = [0, 18, 1006, 1024]; TY = [36, 54, 516, 522]                             # the game: glass 18,54 .. 1006,516; the bar covers 0..40, the lip 522..562
def piece(sx0, sy0, sx1, sy1, w, h): return src.crop((sx0, sy0, sx1, sy1)).resize((max(1, w), max(1, h)), Image.LANCZOS)
G = Image.new("RGB", (1024, 600), (12, 12, 12))
for i in range(3):
    for j in range(3):
        G.paste(piece(SX[i], SY[j], SX[i + 1], SY[j + 1], TX[i + 1] - TX[i], TY[j + 1] - TY[j]), (TX[i], TY[j]))
# the foot lip, one even scale k. Its painted order is screw, label, lamp channel, amber lamp; the channel is wanted on the left (its lamps sit under the gene tags) and the label on the right,
# so the label and channel run (236..2120) is mirrored left to right (the light comes from above, so a mirror keeps it right) and the channel is stretched along x only
LY0, LY1 = 1300, SH; k = (562 - 522) / (LY1 - LY0); lh = 562 - 522
A = (0, 236); LAB = (236, 980); CHN = (980, 2120); D = (2120, SW)
wa, wb, wd = round((A[1] - A[0]) * k), round((LAB[1] - LAB[0]) * k), round((D[1] - D[0]) * k); wc = 1024 - wa - wb - wd
flip = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)
G.paste(piece(A[0], LY0, A[1], LY1, wa, lh), (0, 522))
G.paste(flip(piece(CHN[0], LY0, CHN[1], LY1, wc, lh)), (wa, 522))
G.paste(flip(piece(LAB[0], LY0, LAB[1], LY1, wb, lh)), (wa + wc, 522))
G.paste(piece(D[0], LY0, D[1], LY1, wd, lh), (wa + wc + wb, 522))
G.save(os.path.join(OUT, "ground-p2-1x.png"))
ty_lip = lambda sy: 522 + (sy - LY0) * k
chan = lambda sx: wa + (CHN[1] - sx) * wc / (CHN[1] - CHN[0])          # source x in the channel -> target (mirrored)
lab = lambda sx: wa + wc + (LAB[1] - sx) * k                             # source x on the label -> target (mirrored)
geo = {"glass": [TX[1], TY[1], TX[2], TY[2]],
       "channel": [round(chan(2105)), round(ty_lip(1342)), round(chan(985)), round(ty_lip(1450))],
       "label": [round(lab(976)), round(ty_lip(1342)), round(lab(240)), round(ty_lip(1450))],
       "readLamp": [round(wa + wc + wb + (2255 - D[0]) * k, 1), round(ty_lip(1395), 1), round(66 * k, 1)],
       "scale": round(k, 4)}
json.dump(geo, open(os.path.join(OUT, "ground-p2.json"), "w"), indent=1); print(geo)
# the lamps: the painted amber lamp in its grommet, and the same lens cleared to a neutral lens for the chapter lamps (code tints it when lit)
R = 72; lamp = src.crop((2255 - R, 1395 - R, 2255 + R, 1395 + R))
for sz, suf in [(26, ""), (52, "@2x")]:
    lamp.resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, f"lamp-amber{suf}.png"))
    a = np.asarray(lamp).astype(float) / 255; lum = a @ [0.3, 0.59, 0.11]
    jj, ii = np.mgrid[0:2 * R, 0:2 * R]; lens = np.clip((40 - np.hypot(ii - R, jj - R)) / 4, 0, 1)   # the lens inside the grommet
    neutral = np.stack([lum * 0.95, lum, lum * 1.02], -1); out = a * (1 - lens[..., None]) + np.clip(neutral * 1.25, 0, 1) * lens[..., None]
    Image.fromarray((out * 255).astype(np.uint8)).resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, f"lamp-clear{suf}.png"))
    m = np.zeros((2 * R, 2 * R, 4), np.uint8); m[..., :3] = 255; m[..., 3] = (lens * 255).astype(np.uint8)
    Image.fromarray(m, "RGBA").resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, f"lamp-lens{suf}.png"))
# proof: the remapped housing at 1x and at 3x on its lip ends
pf = Image.new("RGB", (1024, 600 + 140), (20, 20, 20)); pf.paste(G, (0, 0))
pf.paste(G.crop((0, 510, 170, 562)).resize((510, 156), Image.NEAREST).crop((0, 0, 510, 140)), (0, 600))
pf.paste(G.crop((740, 510, 910, 562)).resize((510, 156), Image.NEAREST).crop((0, 0, 510, 140)), (514, 600))
pf.save(os.path.join(OUT, "proof-housing.png")); print("layers in", OUT)
