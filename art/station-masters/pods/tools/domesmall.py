"""Pass 115: the small chamber for Create (Station art director: 'the new chamber reduced to 176 wide, only ever reduced, empty, with its floor at region y 192'), by hand, no paid call. dome-small-back-176x224 and dome-small-front-176x224 are the signed Incubator chamber (dome-back-304x272 and dome-front-304x272) scaled uniformly by 176/304 (premultiplied, Lanczos) and set on the 176x224 region with the chamber's foot (its floor) at region y 192; nothing is drawn: it is the signed art, reduced.
python3 -I tools/domesmall.py -> slices/dome-small-*.png, marks/dome-small-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
man = json.load(open("slices/manifest.json")); outs = {}
def reduce_(src):
    im = Image.open(src).convert("RGBA"); s = 176.0 / im.width; nw, nh = 176, round(im.height * s)
    p = np.asarray(im).astype(float); pm = np.dstack([p[..., :3] * p[..., 3:] / 255.0, p[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255.0; col = np.where(al > 0.004, r[..., :3] / np.maximum(al, 0.004), 0); t = Image.new("RGBA", (176, 224), (0, 0, 0, 0))
    t.paste(Image.fromarray(np.dstack([col, r[..., 3:]]).clip(0, 255).astype(np.uint8), "RGBA"), (0, 192 - nh)); return t, s
for part in ("back", "front"):
    t, s = reduce_(f"slices/dome-{part}-304x272.png"); n = f"dome-small-{part}-176x224"; t.save(f"slices/{n}.png", optimize=True); outs[n] = t
    man[n] = {"size": [176, 224], "rect": [776, 104, 176, 224], "src": f"slices/dome-{part}-304x272.png (signed)", "made": f"the small chamber for Create, {part}: the signed Incubator chamber's {part} reduced uniformly to 176 wide (scale {s:.4f}, only ever reduced), set on the 176x224 region with its foot at region y 192, empty (pass 115)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
P = Image.open("slices/room-bench-stage-incubator.png").convert("RGBA"); P.alpha_composite(outs["dome-small-back-176x224"], (776, 64)); P.alpha_composite(outs["dome-small-front-176x224"], (776, 64)); P.convert("RGB").save("marks/dome-small-proof-1x.png"); print("ok")
