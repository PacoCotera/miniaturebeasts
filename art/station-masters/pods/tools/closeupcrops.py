"""The close-up's picture (ux-closeup.md section 3, [16, 48, 576, 424]): one crop per room from its full-size master, picked by the art director
(ad-bay-closeup.md 2.10), at no cost. The full-size masters are the rooms' painted raws, 1376x768 (source/raw/idle-vivarium-<room>-day-<t>.jpg, the
signed day's own painting): 576x424 of the raw is taken 1:1 (never enlarged), which is the signed painting at x 1.344, where the burrow mouth (80 px
on the painting) is about 108 px and the close-up's adult (the 144 master, about 140 px) is 1.3x it. The signed day's grade (its ground-band gain and
hand fixes) is carried over as a smooth ratio field (signed / the raw reduced to the signed's size, blurred 6 px), so the crop is the signed room.
The ground plane falls on the picture's y 352-412 (screen 400-460), so the name tag at screen y 432 is on the ground; in Roots the burrow is in the
left third. usage: python3 -I tools/closeupcrops.py RAWDIR   (RAWDIR holds the four raws, e.g. from `git show`; writes closeup/room-*.png)"""
import os, sys, json, hashlib
import numpy as np
from PIL import Image, ImageFilter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f"{R}/closeup"; os.makedirs(OUT, exist_ok=True); RAWDIR = sys.argv[1]
RAWS = {"roots": "idle-vivarium-roots-day-ub", "boulders": "idle-vivarium-boulders-day-ta", "reeds": "idle-vivarium-reeds-day-ta", "ferns": "idle-vivarium-ferns-day-ta"}
# the crop's top-left on the raw (1376x768), the AD's pick: what leads in each room, and where the mibi stands (its feet at picture y ~ 352-400)
PICK = {"roots": (402, 182, "the burrow under the great root in the left third, the moss path in front, the bluebells behind"),
        "boulders": (700, 300, "the mossy island, the maple and the upright hero stone in the right half, the lawn in front"),
        "reeds": (220, 230, "the rock left of centre among the sedges, the damp path in front"),
        "ferns": (330, 205, "the croziers and the mossy log in the upper half, the peat path in front")}
W, H = 576, 424
rec = {}
for room, raw in RAWS.items():
    a = Image.open(f"{RAWDIR}/{raw}.jpg").convert("RGB"); sg = Image.open(f"{R}/rooms/signed-idle-{room}-day.png").convert("RGB")
    d = a.resize((1024, 572), Image.LANCZOS).crop((0, 2, 1024, 570))                                   # the raw at the signed's size and registration (rows 2-569)
    blur = lambda im: np.asarray(im.filter(ImageFilter.GaussianBlur(6)), np.float32) + 1
    ratio = Image.fromarray(np.clip(blur(sg) / blur(d) * 128, 0, 255).astype(np.uint8))
    big = np.asarray(ratio.resize((1376, round(568 * 1376 / 1024)), Image.BICUBIC), np.float32) / 128   # the smooth grade field on the raw's grid
    full = np.zeros((768, 1376, 3), np.float32) + 1; o = round(2 * 1376 / 1024); full[o:o + big.shape[0]] = big[: 768 - o]
    graded = np.clip(np.asarray(a, np.float32) * full, 0, 255)
    x0, y0, why = PICK[room]; crop = Image.fromarray((graded[y0:y0 + H, x0:x0 + W] + 0.5).astype(np.uint8))
    n = f"closeup-room-{room}-576x424"; crop.save(f"{OUT}/{n}.png", optimize=True)
    rec[n] = {"size": [W, H], "rect": [16, 48, 576, 424], "src": f"source/raw/{raw}.jpg [{x0}, {y0}, {W}, {H}] 1:1, graded to rooms/signed-idle-{room}-day.png", "pick": why, "painting_rect": [round(x0 / 1.34375), round(y0 / 1.34375 - 2), round(W / 1.34375), round(H / 1.34375)],
              "sha256": hashlib.sha256(open(f"{OUT}/{n}.png", "rb").read()).hexdigest()}
json.dump(rec, open(f"{OUT}/crops.json", "w"), indent=1); print(json.dumps({k: v["painting_rect"] for k, v in rec.items()}))
