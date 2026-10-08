"""Place the real styled genome stamp onto a generated Pods screen's empty stage-plate square.

usage: python3 -I place-stamp.py SCREEN_CANVAS.png STAMP.png OUT_CANVAS.png OUT_1024x600.png [--rect x0,y0,x1,y1]
Without --rect, the pale empty square is detected in the right third of the canvas (the largest
run of near-flat light pixels). The stamp (its quiet margin included) is scaled to fit that square,
pasted, and the centred 1024:600 band is resampled to 1024x600. Nothing in the stamp is redrawn.
"""
import json, sys
import numpy as np
from PIL import Image

a = sys.argv[1:]
screen_p, stamp_p, out_c, out_s = a[:4]
rect = a[a.index("--rect") + 1] if "--rect" in a else None
screen = Image.open(screen_p).convert("RGB")
stamp = Image.open(stamp_p).convert("RGB")
W, H = screen.size
if rect:
    x0, y0, x1, y1 = map(int, rect.split(","))
else:
    arr = np.asarray(screen).astype(int)
    light = (arr.min(axis=2) > 180) & ((arr.max(axis=2) - arr.min(axis=2)) < 45)
    light[:, : W * 55 // 100] = False  # the stage plate is in the right part of the screen
    # largest connected light component (4-neighbour flood fill on a 1/2-scale mask)
    m = light[::2, ::2]
    h, w = m.shape
    seen = np.zeros_like(m, dtype=bool)
    best = None
    for sy in range(h):
        for sx in range(w):
            if not m[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]; seen[sy, sx] = True; pts = []
            while stack:
                y, x = stack.pop(); pts.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
            ys_, xs_ = zip(*pts)
            bw, bh = max(xs_) - min(xs_) + 1, max(ys_) - min(ys_) + 1
            fill = len(pts) / (bw * bh)
            squareness = min(bw, bh) / max(bw, bh)
            if min(bw, bh) * 2 >= 100 and fill > 0.6 and squareness > 0.75 and (best is None or len(pts) > best[0]):
                best = (len(pts), min(xs_) * 2, min(ys_) * 2, max(xs_) * 2 + 2, max(ys_) * 2 + 2)
    if best is None:
        sys.exit("no pale square found; pass --rect")
    _, x0, y0, x1, y1 = best
    # trim a pointer or tail: drop top and bottom rows whose light run is narrower than 90% of the widest
    rows = light[y0:y1, x0:x1].sum(axis=1)
    widest = rows.max()
    keep = np.where(rows >= 0.9 * widest)[0]
    y0, y1 = y0 + int(keep[0]), y0 + int(keep[-1]) + 1
    cols = light[y0:y1, x0:x1].sum(axis=0)
    keepc = np.where(cols >= 0.9 * cols.max())[0]
    x0, x1 = x0 + int(keepc[0]), x0 + int(keepc[-1]) + 1
side = min(x1 - x0, y1 - y0)
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
side = int(side * 0.98)
st = stamp.resize((side, side), Image.LANCZOS)
# match the stamp's flat paper to the square's own tone
core = np.asarray(screen.crop((cx - 10, cy - 10, cx + 10, cy + 10))).reshape(-1, 3).mean(axis=0).astype(int)
sa = np.asarray(st).astype(int)
paper = sa[2, 2]
mask = (np.abs(sa - paper).sum(axis=2) <= 9)
sa[mask] = core
st = Image.fromarray(sa.astype("uint8"))
out = screen.copy()
out.paste(st, (cx - side // 2, cy - side // 2))
out.save(out_c)
band_w = round(H * 1024 / 600); off = (W - band_w) // 2
out.crop((off, 0, off + band_w, H)).resize((1024, 600), Image.LANCZOS).save(out_s)
rec = {"screen": screen_p, "stamp": stamp_p, "detectedSquare": [x0, y0, x1, y1], "pasted": {"x": cx - side // 2, "y": cy - side // 2, "side": side}, "outputs": {"canvas": out_c, "screen": out_s}}
json.dump(rec, open(out_c.rsplit(".", 1)[0] + ".json", "w"), indent=2)
print("placed", side, "px at", (cx - side // 2, cy - side // 2), "square", (x0, y0, x1, y1))
