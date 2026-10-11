"""The painted scene mockup on the 48 colours at 1x: the Gemini painting area-averaged so a 48 px tile of the scene is 48 px
(the painting's wide stair, two tiles, is about 100 px wide, so the scale is 0.96), snapped to the palette's nearest colour with the
page's weighted distance, single stray pixels removed. Also two 450x532 crops (the pond, the cliffs) at a game screen's size, and both at 3x.
usage: python3 -I mockup-snap.py PAINTING OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
im = Image.open(src).convert("RGB"); s = .96
im = im.resize((int(im.width * s), int(im.height * s)), Image.BOX)
a = np.dstack([np.asarray(im), np.full((im.height, im.width), 255, np.uint8)])
idx = quant.despeckle(quant.quantize(a), 1)
full = P.to_image(idx); full.save(os.path.join(out, "scene-1x.png"))
full.resize((full.width * 3, full.height * 3), Image.NEAREST).save(os.path.join(out, "scene-3x.png"))
for name, (x0, y0) in {"screen-pond": ((full.width - 450) // 2, full.height - 532 - 40), "screen-cliffs": (20, 60)}.items():
    cr = full.crop((x0, y0, x0 + 450, y0 + 532)); cr.save(os.path.join(out, name + "-1x.png"))
    cr.resize((1350, 1596), Image.NEAREST).save(os.path.join(out, name + "-3x.png"))
print(full.size, "colours used", len(np.unique(idx)))
