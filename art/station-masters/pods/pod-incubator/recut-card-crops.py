"""T-20261016-68: eleven of the card's 160 x 128 crops re-cut clean (results/review-art-2026-10-16b.md §2).
What made them dirty: traitcut's rectangular 12 px fade; its white key (meant for the crown sheet's white margin), which took the cream highlights
and the claw tips to ground and left grey specks; and windows that crossed a panel edge (the eyes) or cut the creature (S02's side bulb).
Here, per crop:
- a small enclosed key gap (under 400 px at the sheet's size) is filled from its surround, not shown as ground;
- a window inside its panel, aspect 5:4, reduced (never enlarged) into the owner's 75 percent box, 120 x 96 centred in the cell;
- the sheet's magenta keyed to the cell ground #162a37 at the sheet's size, magenta only; each fringe pixel takes the colour of the nearest
  solid one, so no cast is left; reduced premultiplied with Lanczos;
- where the window still cuts the creature (the eyes, the flanks, the legs' tops), a superellipse mask fading into ground (pass 79's fix for
  the same verdict, tools/guideplates2.py's mask), so no straight cut edge remains. S02's three hold the whole creature and need none.
usage: python3 -I pod-incubator/recut-card-crops.py   (run in art/station-masters/pods)"""
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
GROUND = np.array([0x16, 0x2a, 0x37], float); W, H, BW, BH = 160, 128, 120, 96
def mask(w, h, cx, cy, rx, ry, f, n=2.0):                                  # tools/guideplates2.py's
    y, x = np.mgrid[0:h, 0:w] + 0.5; s = (np.abs((x - cx) / rx) ** n + np.abs((y - cy) / ry) ** n) ** (1 / n); d = (1 - s) * min(rx, ry)
    t = np.clip(d / f, 0, 1); return t * t * (3 - 2 * t)
# id: (sheet, window x0, y0, width (height = width * 4 / 5), mask in the 120 x 96 box (cx, cy, rx, ry, fade, n) or None)
FEET = (58, 70, 66, 72, 10, 2.0); FLANK = (60, 48, 62, 50, 8, 2.6)
JOBS = {
 "trait-S03-claws-round-feet": ("trait-S03-claws-scales-a", 20, 52, 380, FEET),
 "trait-S03-claws-pads": ("trait-S03-claws-scales-a", 441, 52, 380, FEET),
 "trait-S03-claws-digging-wedges": ("trait-S03-claws-scales-a", 848, 52, 380, FEET),
 "trait-S03-scales-few-fine": ("trait-S03-claws-scales-a", 60, 430, 340, FLANK),
 "trait-S03-scales-between": ("trait-S03-claws-scales-a", 481, 430, 340, FLANK),
 "trait-S03-scales-many-coarse": ("trait-S03-claws-scales-a", 902, 430, 340, FLANK),
 "trait-S02-spots-bands": ("trait-S02-spots-a", 631, 6, 540, None),
 "trait-S02-spots-spots": ("trait-S02-spots-a", 31, 451, 540, None),
 "trait-S02-spots-bands-and-spots": ("trait-S02-spots-a", 631, 451, 540, None),
 "trait-S01-eyes-thin-rings": ("trait-S01-eyes-a", 100, 108, 480, (60, 48, 45, 45, 6, 2.0)),
 "trait-S01-eyes-wide-pale-rings": ("trait-S01-eyes-a", 1104, 108, 480, (64, 48, 45, 45, 6, 2.0)),
}
made = []
for name, (sh, x0, y0, ww, m) in JOBS.items():
    a = np.asarray(Image.open(f"source/raw/{sh}.jpg").convert("RGB")).astype(float)
    wh = ww * 4 // 5; assert x0 >= 0 and y0 >= 0 and x0 + ww <= a.shape[1] and y0 + wh <= a.shape[0] and ww >= BW and wh >= BH, (name, "inside the sheet, never enlarged")
    a = a[y0:y0 + wh, x0:x0 + ww]; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = np.maximum(np.clip((np.minimum(r, b) - g - 60) / 40, 0, 1), np.clip((np.minimum(r, b) - g - 25) / 35, 0, 1) * (np.abs(r - b) < 70))
    al = 1 - k; solid = al > 0.98
    lab, n = nd.label(al < 0.5); edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))   # a small key gap enclosed by the
    for i in range(1, n + 1):                                                                          # creature is a speck, not ground:
        if i not in edge and (lab == i).sum() < 400: al[nd.binary_dilation(lab == i, iterations=2)] = 1  # it is filled from its surround
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True); col = a[iy, ix]          # the fringe takes the nearest solid colour
    pm = np.dstack([col * al[..., None], al * 255])
    red = np.stack([np.asarray(Image.fromarray(pm[..., c].astype(np.float32), "F").resize((BW, BH), Image.LANCZOS)) for c in range(4)], -1)
    ra = np.clip(red[..., 3] / 255, 0, 1); rc = np.where(ra[..., None] > 1e-3, red[..., :3] / np.maximum(ra, 1e-3)[..., None], GROUND)
    if m: ra = ra * mask(BW, BH, *m)
    box = GROUND + (np.clip(rc, 0, 255) - GROUND) * ra[..., None]
    cell = np.tile(GROUND, (H, W, 1)); cell[(H - BH) // 2:(H - BH) // 2 + BH, (W - BW) // 2:(W - BW) // 2 + BW] = box
    Image.fromarray(np.clip(np.rint(cell), 0, 255).astype(np.uint8)).save(f"slices/{name}-160x128.png", optimize=True)
    made.append([f"{name}-160x128", sh, [x0, y0, x0 + ww, y0 + wh], "recut T-20261016-68"])
cc = json.load(open("pod-incubator/card-crops.json")); ix = {r[0]: i for i, r in enumerate(cc)}
for r in made: cc[ix[r[0]]] = r
json.dump(cc, open("pod-incubator/card-crops.json", "w"), indent=1)
print(len(made), "re-cut")
