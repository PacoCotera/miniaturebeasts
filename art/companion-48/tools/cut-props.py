"""Cut the meadow's props from the props source sheet (sources/meadow-src-props-p1.jpg).

The sheet's flat magenta ground is keyed out (with a 1 px choke against the JPEG's fringe), each separate prop is found as a
connected group, scaled by SCALE to b1's pixel size (the sheet draws about two of its pixels to one of b1's) and snapped to the
meadow palette (nearest in CIE Lab). Props are named by kind from their row on the sheet: bushes, ferns, boulders, reeds,
flowers and the plank bridge (drawn across; turned to run north-south, the way the map crosses water, and scaled to two cells wide).
Writes tileset/props/<name>.png and props.json.
usage: python3 -I cut-props.py SHEET PALETTE_JSON OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
sheet, palj, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    f = c @ M.T / np.array([.95047, 1, 1.08883]); f = np.where(f > .008856, np.cbrt(f), 7.787 * f + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
PL = lab(PAL); SCALE = .5
a = np.asarray(Image.open(sheet).convert("RGB")).astype(int)
fg = ~((a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 120))
fg = fg & np.roll(fg, 1, 0) & np.roll(fg, -1, 0) & np.roll(fg, 1, 1) & np.roll(fg, -1, 1)
lab_ = np.zeros(fg.shape, int); boxes = []
for y0, x0 in zip(*np.where(fg)):
    if lab_[y0, x0]: continue
    n = len(boxes) + 1; st = [(y0, x0)]; lab_[y0, x0] = n; ys = [y0]; xs = [x0]
    while st:
        y, x = st.pop()
        for dy in (-2, -1, 0, 1, 2):                       # 2 px reach: a flower's stem and head stay one prop
            for dx in (-2, -1, 0, 1, 2):
                yy, xx = y + dy, x + dx
                if 0 <= yy < fg.shape[0] and 0 <= xx < fg.shape[1] and fg[yy, xx] and not lab_[yy, xx]:
                    lab_[yy, xx] = n; st.append((yy, xx)); ys.append(yy); xs.append(xx)
    boxes.append((min(ys), min(xs), max(ys) + 1, max(xs) + 1, len(ys)))
props = [(i + 1, b) for i, b in enumerate(boxes) if b[4] > 300]
# merge the flowers' separate heads (the small groups at the sheet's right) into their clusters
merged = []
for i, b in props:
    for m in (merged if b[1] > 840 else []):
        if not (b[2] < m[1][0] - 12 or b[0] > m[1][2] + 12 or b[3] < m[1][1] - 12 or b[1] > m[1][3] + 12):
            m[0].append(i); m[1] = (min(m[1][0], b[0]), min(m[1][1], b[1]), max(m[1][2], b[2]), max(m[1][3], b[3])); break
    else: merged.append([[i], b[:4]])
# kinds by the sheet's rows: bushes (top), ferns, boulders and reeds, the bridge (bottom); flowers are the small ones at the right
def kind(b):
    y0, x0, y1, x1 = b; cy = (y0 + y1) / 2; w = x1 - x0; h = y1 - y0
    if w > 500: return "bridge"
    if x0 > 840 and w < 120: return "flowers"
    if cy < 340: return "bush"
    if cy < 540: return "fern"
    return "reeds" if h > 1.3 * w else "boulder"
atlas = []; count = {}
for ids, (y0, x0, y1, x1) in sorted(merged, key=lambda m: (kind(m[1]), m[1][1])):
    k = kind((y0, x0, y1, x1)); count[k] = count.get(k, 0) + 1; name = f"{k}-{count[k]}"
    rgb = a[y0:y1, x0:x1]; msk = np.isin(lab_[y0:y1, x0:x1], ids)
    sc = 96 / (y1 - y0) if k == "bridge" else SCALE                  # the bridge: two cells wide once turned, as b1's
    w, h = max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))
    rs = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((w, h), Image.BOX)).astype(float)
    ms = np.asarray(Image.fromarray((msk * 255).astype(np.uint8)).resize((w, h), Image.BOX)) > 127
    i = ((lab(rs.reshape(-1, 3))[:, None] - PL[None]) ** 2).sum(-1).argmin(1).reshape(h, w)
    o = np.dstack([PAL[i], np.where(ms, 255, 0)]).astype(np.uint8); im = Image.fromarray(o, "RGBA")
    if k == "bridge": im = im.rotate(90, expand=True)
    im.save(os.path.join(out, name + ".png"))
    atlas.append({"name": f"meadow/prop/{name}", "file": name + ".png", "kind": "prop", "type": k, "px": list(im.size)})
json.dump({"biome": "meadow", "source": os.path.basename(sheet), "scale": SCALE, "pieces": atlas}, open(os.path.join(out, "props.json"), "w"), indent=1)
print(len(atlas), "props:", count)
