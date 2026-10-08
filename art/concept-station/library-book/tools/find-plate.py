"""Find the flat pale plate the generator left for the stamp, by flooding from a seed point.

usage: python3 -I find-plate.py CANVAS.png seed_x,seed_y [--tol 24] [--side N]
Seed is in 1024x600 screen coordinates. Prints x0,y0,x1,y1 in canvas pixels for place-stamp.py --rect:
the plate's own extent, or, with --side N, an N-px (screen) square centred on the plate.
Needed on cream paper, where the whole page is pale and the generic detector would take the page.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

p, seed = sys.argv[1], sys.argv[2]
tol = int(sys.argv[sys.argv.index("--tol") + 1]) if "--tol" in sys.argv else 24
side = int(sys.argv[sys.argv.index("--side") + 1]) if "--side" in sys.argv else 0
im = np.asarray(Image.open(p).convert("RGB")).astype(int)
H, W, _ = im.shape
band = round(H * 1024 / 600); off = (W - band) // 2; sc = H / 600
sx, sy = map(int, seed.split(","))
cx, cy = round(off + sx * sc), round(sy * sc)
col = im[cy - 3:cy + 4, cx - 3:cx + 4].reshape(-1, 3).mean(axis=0)
sim = np.abs(im - col).sum(axis=2) < tol
seen = np.zeros((H, W), dtype=bool); q = deque([(cy, cx)]); seen[cy, cx] = True
xs, ys = [cx], [cy]
while q:
    y, x = q.popleft()
    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= ny < H and 0 <= nx < W and sim[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True; q.append((ny, nx)); xs.append(nx); ys.append(ny)
x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
if side:
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2; h = round(side * sc / 2)
    x0, y0, x1, y1 = mx - h, my - h, mx + h, my + h
print(f"{x0},{y0},{x1},{y1}", file=sys.stdout)
print(f"plate {round((x1-x0)/sc)}x{round((y1-y0)/sc)} screen px, colour {col.round().astype(int).tolist()}", file=sys.stderr)
