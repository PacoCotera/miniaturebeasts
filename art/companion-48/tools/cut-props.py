"""Cut the meadow's props from the props source sheet (sources/meadow-src-props-p1.jpg).

The sheet's flat magenta ground is keyed out (with a 1 px choke against the JPEG's fringe), each separate prop is found as a
connected group, scaled by SCALE to b1's pixel size (the sheet draws about two of its pixels to one of b1's) and snapped to the
meadow palette (nearest in CIE Lab). Props are named by kind from their row on the sheet: bushes, ferns, boulders, reeds,
flowers and the plank bridge (drawn across; turned to run north-south, the way the map crosses water, and scaled to two cells wide;
its side-view logs replaced by b1's upright 3/4 posts, see posts()).
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
WOOD = sorted([i for i, c in enumerate(cols) if c.get("material") in ("wood", "earth")], key=lambda i: PAL[i] @ [.2126, .7152, .0722])
OUTL = int((PAL @ [.2126, .7152, .0722]).argmin())
def posts(im, name):
    """The sheet draws the bridge's posts as logs lying across its ends, seen from the side. Here they become b1's upright posts
    in the same 3/4 top-down view as the deck: the deck runs on under the old logs; four posts stand just off its corners, each
    an oval top cap (lit, with a ring) over a short round front face (lit left, dark right) with a dark outline. Their contact
    shadows go in props/shade/<name>.png (128: the ground one step darker), for the map to lay on whatever ground is there."""
    a = np.asarray(im).copy(); h, w = a.shape[:2]
    on = a[h // 2, :, 3] > 0; dx0, dx1 = np.where(on)[0][[0, -1]]
    rows = [y for y in range(h) if (a[y, :, 3] > 0).sum() == dx1 - dx0 + 1 and not (a[y, :dx0, 3] > 0).any()]
    y0, y1 = rows[0], rows[-1]                                          # the deck's own rows, under no log
    a[:y0] = 0; a[y1 + 1:] = 0
    for y in range(y0 - 1, -1, -1): a[y, dx0:dx1 + 1] = a[y + 24, dx0:dx1 + 1]       # the planks run on to the ends
    for y in range(y1 + 1, h): a[y, dx0:dx1 + 1] = a[y - 24, dx0:dx1 + 1]
    shade = np.zeros((h, w), np.uint8)
    pw, cap, face = 12, 6, 13
    def rgba(i): return np.array(list(PAL[i]) + [255], np.uint8)
    nW = len(WOOD); hi, lit, mid, dk = WOOD[int(nW * .85)], WOOD[int(nW * .65)], WOOD[int(nW * .45)], WOOD[int(nW * .2)]
    for cx in (dx0 - pw // 2 + 2, dx1 + pw // 2 - 2):
        for top in (2, h - cap - face - 4):
            x0 = cx - pw // 2
            for yy in range(cap // 2, cap // 2 + face):                 # the front face: a cylinder, lit left, dark right
                for xx in range(pw):
                    t = xx / (pw - 1); i = lit if t < .3 else (mid if t < .7 else dk)
                    a[top + yy, x0 + xx] = rgba(i)
            for yy in range(cap):                                       # the top cap: an oval, a lit rim and a darker ring inside
                for xx in range(pw):
                    e = ((xx - (pw - 1) / 2) / (pw / 2)) ** 2 + ((yy - (cap - 1) / 2) / (cap / 2)) ** 2
                    if e < 1: a[top + yy, x0 + xx] = rgba(hi if e > .45 or e < .12 else lit)
            m = a[top:top + cap + face, x0:x0 + pw, 3] > 0              # the dark outline round the post's silhouette
            for yy in range(cap + face):
                for xx in range(pw):
                    if m[yy, xx] and (yy in (0, cap + face - 1) or xx in (0, pw - 1) or not m[max(0, yy - 1), xx]) and not (yy < cap and 1 < xx < pw - 2 and yy > 0):
                        a[top + yy, x0 + xx] = rgba(OUTL)
            sy = top + cap // 2 + face                                  # the contact shadow: a flat ellipse to the lower right
            for yy in range(sy - 2, min(h, sy + 3)):
                for xx in range(x0 + 1, min(w, x0 + pw + 5)):
                    if ((xx - x0 - pw / 2 - 2) / (pw * .6)) ** 2 + ((yy - sy) / 2.5) ** 2 < 1 and a[yy, xx, 3] == 0: shade[yy, xx] = 128
    os.makedirs(os.path.join(out, "shade"), exist_ok=True); Image.fromarray(shade).save(os.path.join(out, "shade", name + ".png"))
    return Image.fromarray(a, "RGBA")

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
    if k == "bridge": im = posts(im.rotate(90, expand=True), name)
    im.save(os.path.join(out, name + ".png"))
    atlas.append({"name": f"meadow/prop/{name}", "file": name + ".png", "kind": "prop", "type": k, "px": list(im.size)})
json.dump({"biome": "meadow", "source": os.path.basename(sheet), "scale": SCALE, "pieces": atlas}, open(os.path.join(out, "props.json"), "w"), indent=1)
print(len(atlas), "props:", count)
