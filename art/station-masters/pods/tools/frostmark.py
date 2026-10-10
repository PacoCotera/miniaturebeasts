"""Pass 88: mark-species-frost-24x24 (the unknown-species glyph) remapped for the overview stage (art director's ruling, Oct 9: it stays art, its alpha drifted): the three translucent values become the stage's own opaque roles and every visible pixel goes to alpha 255, everything else stays 0; the geometry and the stipple do not change.
  frostS rgb(169,181,200) at alpha 56 (199 px)  ->  `bar`      #34383f
  frostD rgb(203,213,226) at alpha 81 (136 px, the stipple)  ->  `hairline` #3c4b57
  frostD rgb(203,213,226) at alpha 89 (49 px, the upper-left rim)  ->  `bevel`    #5a6672
Idempotent: a slice already remapped is left as it is. python3 -I tools/frostmark.py -> slices/mark-species-frost-24x24.png, marks/frost-mark-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
a = np.asarray(Image.open("slices/mark-species-frost-24x24.png").convert("RGBA")).copy(); before = {"visible": int((a[..., 3] > 0).sum())}
MAP = [((169, 181, 200, 56), pal["bar"], 199), ((203, 213, 226, 81), pal["hairline"], 136), ((203, 213, 226, 89), pal["bevel"], 49)]
if (a[..., 3] > 0).sum() and not ((a[..., 3] == 255) | (a[..., 3] == 0)).all():
    for src, dst, n in MAP:
        m = (a == np.array(src, np.uint8)).all(2); assert m.sum() == n, (src, int(m.sum()), n); a[m] = dst + (255,)
assert set(np.unique(a[..., 3])) == {0, 255} and int((a[..., 3] > 0).sum()) == before["visible"]
Image.fromarray(a, "RGBA").save("slices/mark-species-frost-24x24.png", optimize=True)
man = json.load(open("slices/manifest.json")); n = "mark-species-frost-24x24"
man[n]["made"] = "a 22 px disc in `bar` with a `hairline` stipple and a `bevel` rim upper left, all opaque"
man[n]["sha256"] = hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest(); json.dump(man, open("slices/manifest.json", "w"), indent=1)
stage = Image.open("slices/room-bench-stage-overview.png").convert("RGBA") if os.path.exists("slices/room-bench-stage-overview.png") else Image.new("RGBA", (200, 100), pal["ground"] + (255,))
cv = stage.crop((0, 0, min(stage.width, 200), min(stage.height, 100))).copy(); mk = Image.fromarray(a, "RGBA"); cv.alpha_composite(mk, (40, 30)); cv.alpha_composite(mk, (120, 30))
cv.convert("RGB").save("marks/frost-mark-proof-1x.png"); cv.convert("RGB").resize((cv.width * 4, cv.height * 4), Image.NEAREST).save("marks/frost-mark-proof-4x.png"); print("ok", int((a[..., 3] > 0).sum()), "visible px")
