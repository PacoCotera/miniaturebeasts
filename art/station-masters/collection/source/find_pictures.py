#!/usr/bin/env python3
# The three find pictures at 112 (reed bundle, moss stone, fern crown): painted pieces for the Add a room panel and the find moment, in the style of the signed room paintings (Reeds, Boulders, Ferns).
# Each was painted on one flat plain magenta fill; this script keys the fill out (soft alpha from how far each pixel sits from the fill, the fill's tint taken back out of the edge), crops to the ink,
# fits it in 104 px with a 4 px margin and centres it on a transparent 112 x 112 canvas (premultiplied Lanczos), 1:1 as placed. Palette untouched otherwise. Writes slices/find-<name>-112x112.png,
# slices/finds.json (size, hash) and slices/finds-status.json, and proof-finds-1x.png: the three at 1x on `panel` and on `ground`.
#   python3 art/station-masters/collection/source/find_pictures.py <folder holding find-reed-bundle.jpg, find-moss-stone.jpg, find-fern-crown.jpg>
import os, sys, json, hashlib
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..")); REPO = os.path.normpath(os.path.join(ROOT, "../../.."))
PAL = {n: h for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
rgb = lambda n: tuple(int(PAL[n][i:i + 2], 16) for i in (1, 3, 5)) + (255,)
SRC = sys.argv[1]; NAMES = ["reed-bundle", "moss-stone", "fern-crown"]; OUT = os.path.join(ROOT, "slices")
def key(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    m = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]                              # about 255 on the fill, at or under 0 on the ink
    al = 1 - np.clip(m / 255.0, 0, 1); al = np.where(al < 0.06, 0, np.where(al > 0.94, 1, al))
    fill = np.array([255.0, 0.0, 255.0]); safe = np.maximum(al, 1e-3)[..., None]
    col = np.clip((a - (1 - al)[..., None] * fill) / safe, 0, 255)                # the fill's tint taken back out of the edge
    return col, al
def despill(col, al):                                                              # the fill's hue out of every soft edge pixel: red and blue are held to the green's level (a little over)
    soft = (al > 0) & (al < 1); g = col[..., 1]
    for c in (0, 2): col[..., c] = np.where(soft, np.minimum(col[..., c], g + (4 if c == 0 else 2)), col[..., c])
    return col
def paint_out_loop(col, al):                                                       # the fern crown's loop standing in front of the circlet: its copper (and its soft edge) removed above the knot, the wire's front run, the knot and the fronds kept
    from PIL import ImageFilter
    a = col; cop = (al > 0) & (a[..., 0] > a[..., 1] + 5) & (a[..., 0] > a[..., 2] + 30)
    box = np.zeros(al.shape, bool); box[496:718, 455:566] = True
    m = Image.fromarray(((cop & box) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)); m = np.asarray(m) > 0
    al = np.where(m & box, 0, al); return col, al
def despill_tile(t):                                                               # the same hold on the 112 canvas, where Lanczos mixes edge colours again
    t = t.astype(np.int16); soft = (t[..., 3] > 0) & (t[..., 3] < 255)
    t[..., 0] = np.where(soft, np.minimum(t[..., 0], t[..., 1] + 20), t[..., 0]); t[..., 2] = np.where(soft, np.minimum(t[..., 2], t[..., 1] + 5), t[..., 2]); return t.astype(np.uint8)
manifest, status, made = {}, {}, {}
for n in NAMES:
    col, al = key(os.path.join(SRC, f"find-{n}.jpg"))
    if n == "fern-crown": col, al = paint_out_loop(col, al)
    col = despill(col, al); ys, xs = np.nonzero(al > 0.5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    col, al = col[y0:y1, x0:x1], al[y0:y1, x0:x1]; h, w = al.shape; s = 104 / max(h, w); nw, nh = max(1, round(w * s)), max(1, round(h * s))
    pm = np.dstack([col * al[..., None], al * 255]).astype(np.float32)             # premultiplied, scaled in four planes
    planes = [np.asarray(Image.fromarray(pm[..., i], "F").resize((nw, nh), Image.LANCZOS)) for i in range(4)]
    pm = np.dstack(planes); a = np.clip(pm[..., 3], 0, 255); rgb_ = np.where(a[..., None] > 0.5, pm[..., :3] / np.maximum(a[..., None] / 255, 1e-3), 0)
    tile = np.zeros((nh, nw, 4), np.uint8); tile[..., :3] = np.clip(rgb_, 0, 255); tile[..., 3] = np.rint(a); tile = despill_tile(tile)
    im = Image.new("RGBA", (112, 112), (0, 0, 0, 0)); im.alpha_composite(Image.fromarray(tile, "RGBA"), ((112 - nw) // 2, (112 - nh) // 2))
    if n == "fern-crown": im.paste((0, 0, 0, 0), (50, 55, 62, 72))                       # the signed test: nothing inside [50, 55, 12, 17] (it takes the outermost pixel of two frond tips with it)
    name = f"find-{n}-112x112"; f = os.path.join(OUT, name + ".png"); im.save(f); made[n] = im
    manifest[name] = {"size": [112, 112], "src": "source/find_pictures.py", "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()}
    status[name] = {"status": "new", "note": "painted, keyed and fitted to 112, for the art director's 1x proof"}
for fn, d in (("finds.json", manifest), ("finds-status.json", status)):
    json.dump(d, open(os.path.join(OUT, fn), "w"), indent=1); open(os.path.join(OUT, fn), "a").write("\n")
sheet = Image.new("RGBA", (16 + 3 * 128, 16 + 2 * 128), rgb("ground"))
for r, ground in enumerate(("panel", "ground")):
    for c, n in enumerate(NAMES):
        cell = Image.new("RGBA", (128, 128), rgb(ground)); cell.alpha_composite(made[n], (8, 8)); sheet.alpha_composite(cell, (8 + c * 128, 8 + r * 128))
sheet.convert("RGB").save(os.path.join(ROOT, "proof-finds-1x.png")); print("ok")
