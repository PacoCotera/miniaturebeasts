"""Warp the flat Caddy label onto the photographed thermal strip (a perspective paste).

usage: python3 -I composite-strip.py STRIP_PHOTO.png LABEL.png OUT.png x0,y0 x1,y1 x2,y2 x3,y3
The four points are the label's corners on the photo: top-left, top-right, bottom-right, bottom-left.
"""
import sys
import numpy as np
from PIL import Image

photo_p, label_p, out_p = sys.argv[1:4]
dst = [tuple(map(float, s.split(","))) for s in sys.argv[4:8]]
photo = Image.open(photo_p).convert("RGB")
label = Image.open(label_p).convert("L")
w, h = label.size
src = [(0, 0), (w, 0), (w, h), (0, h)]

def coeffs(pa, pb):  # PIL wants the mapping from output (pa) to input (pb)
    A = []
    for (x, y), (X, Y) in zip(pa, pb):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y])
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    B = np.array([c for p in pb for c in p], dtype=float)
    return np.linalg.solve(np.array(A, dtype=float), B)

c = coeffs(dst, src)
# paste the label's ink (dark pixels) with a little paper tint so it reads as printed
rgba = Image.new("RGBA", label.size)
lp, rp = label.load(), rgba.load()
for yy in range(h):
    for xx in range(w):
        v = lp[xx, yy]
        rp[xx, yy] = (30, 28, 26, 255 - v) if v < 128 else (0, 0, 0, 0)
warped = rgba.transform(photo.size, Image.PERSPECTIVE, c, Image.BICUBIC)
out = photo.copy()
out.paste(warped, (0, 0), warped)
out.save(out_p)
print("wrote", out_p)
