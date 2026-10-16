"""T-20261016-35 (specs/station-pods-purpose.md §1 and §4, work-queue): place-{meadow,pond,rock,wood,cave}-32x32, the collection well's place
badge, painted from the same painting as the 64s at 32: tools/build.py places()'s own recipe (the painting cut square, reduced with Lanczos,
saturation x0.85, mean grey graded to 86 (wood 60, cave 80), highlights above 140 compressed x0.30), run at 32. Never scaled from the 48 or 64.
Before writing, it rebuilds the signed 48s and 64s with the same code and checks them byte for byte against slices/, so the paintings and the
recipe are the signed ones.
usage: python3 -I places/t35/make-places-32.py   (run in art/station-masters/pods)"""
import numpy as np
from PIL import Image
RAW = "source/raw/"
def picture(k, sz):
    im0 = Image.open(RAW + (f"place-{k}.jpg" if k in ("meadow", "pond") else f"place2-{k}.jpg")).convert("RGB")
    if k == "wood":
        a0 = np.asarray(im0).astype(float); dark = ((a0 @ np.array([0.299, 0.587, 0.114])) < 120); ys, xs = np.where(dark); im0 = im0.crop((xs.min() + 3, ys.min() + 3, xs.max() - 3, ys.max() - 3))
    side = min(im0.size); sq = im0.crop(((im0.width - side) // 2, (im0.height - side) // 2, (im0.width - side) // 2 + side, (im0.height - side) // 2 + side))
    im = sq.resize((sz, sz), Image.LANCZOS)
    a = np.asarray(im).astype(float); lum = a @ np.array([0.299, 0.587, 0.114]); g = lum[..., None]; a = g + (a - g) * 0.85
    lum = a @ np.array([0.299, 0.587, 0.114]); a = a * (({'wood': 60.0, 'cave': 80.0}.get(k, 86.0)) / lum.mean()); lum = a @ np.array([0.299, 0.587, 0.114])
    l2 = np.where(lum > 140, 140 + (lum - 140) * 0.30, lum); a = a * (l2 / np.maximum(lum, 1e-6))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
for k in ("meadow", "pond", "rock", "wood", "cave"):
    for sz in (48, 64):
        mine = np.asarray(picture(k, sz)); signed = np.asarray(Image.open(f"slices/place-{k}-{sz}x{sz}.png").convert("RGB"))
        assert (mine == signed).all(), f"place-{k}-{sz}: the recipe does not rebuild the signed slice"
    picture(k, 32).save(f"slices/place-{k}-32x32.png"); print(f"place-{k}-32x32 written (48 and 64 rebuilt byte for byte)")
