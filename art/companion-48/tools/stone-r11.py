"""The charged stone at its final size (round 11), through the pipeline and not scaled: the stone is Retro Diffusion's own 48 x 64 redraw (img2img from the earlier generated stone,
seed 23 of three, sources/r11/C48-S-r11-stone-s23-rd.png), cleaned here: the cyan and blue specks the service left in the rock taken to the stone's greys, the largest component, despeckled,
no shadow in the piece (the still draws it). The charge is then drawn on it: frame 2 a zigzag bolt across the face and FOUR arcs of unequal length hugging the outline (upper left 50 deg,
right 40 deg, lower left 70 deg and 10 px on into the grass, lower right 35 deg and 8 px into the grass), white core, yellow flank, gold outer pixel; frame 1 only a faint broken vein of
cream and gold on the face. The two frames share one canvas. usage: python3 -I stone-r11.py RD.png OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index
rgba = np.asarray(Image.open(sys.argv[1]).convert("RGBA"))
idx = quant.quantize(rgba, pal.ramp_indices(P, "NK") + [C["tealD"], C["teal"], C["aqua"], C["mint"], C["sky"], C["ice"], C["deep"], C["sea"], C["river"]], alpha_thresh=110)
MAP = {C["tealD"]: C["slate"], C["teal"]: C["stone"], C["aqua"]: C["stone"], C["mint"]: C["mist"], C["sky"]: C["mist"], C["ice"]: C["mist"], C["deep"]: C["night"], C["sea"]: C["slate"], C["river"]: C["stone"]}
idx = np.where(idx >= 0, np.vectorize(lambda v: MAP.get(v, v))(idx), -1)
H, W = idx.shape; lab = np.zeros(idx.shape, int); n = 0
for y, x in zip(*np.where(idx >= 0)):
    if lab[y, x]: continue
    n += 1; st = [(y, x)]; lab[y, x] = n
    while st:
        cy, cx = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and idx[ny, nx] >= 0 and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
idx[lab != np.bincount(lab[lab > 0]).argmax()] = -1
idx = quant.despeckle(idx, 1)
x0, y0, x1, y1 = quant.bbox((idx >= 0) * 255); stone = idx[y0:y1, x0:x1]; h, w = stone.shape
PAD = 14
def build(frame):
    big = np.full((h + 2 * PAD, w + 2 * PAD), -1, dtype=np.int64); big[PAD:PAD + h, PAD:PAD + w] = stone
    sil = big >= 0; foot = PAD + h; cx = PAD + w / 2.0; cy = PAD + h * 0.55; rg = np.random.RandomState(7)
    def put(x, y, c, free=False):
        if 0 <= y < big.shape[0] and 0 <= x < big.shape[1] and y < foot and (not free or big[y, x] < 0): big[y, x] = c
    def seg(pts, core, flank=None, outer=None):
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1):
                x = int(round(xa + (xb - xa) * i / n)); y = int(round(ya + (yb - ya) * i / n))
                if flank:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): put(x + dx, y + dy, flank)
                if outer:
                    for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)): put(x + dx, y + dy, outer, free=True)
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1): put(int(round(xa + (xb - xa) * i / n)), int(round(ya + (yb - ya) * i / n)), core)
    def rad(a):
        r = 0.0
        while True:
            x = int(round(cx + np.cos(a) * r)); y = int(round(cy + np.sin(a) * r))
            if not (0 <= y < big.shape[0] and 0 <= x < big.shape[1]) or not sil[y, x]: return r
            r += .5
    top = PAD + 3
    if frame == 2:
        seg([(int(cx) + 2, top), (int(cx) - 5, top + 11), (int(cx) + 4, top + 22), (int(cx) - 5, top + 33), (int(cx) + 1, foot - 7)], C["white"], C["yellow"], C["gold"])   # the zigzag across the face
        for a0, a1, off, run in ((-170, -120, 2.5, 0), (-62, -22, 3.0, 0), (155, 225, 2.5, -10), (12, 47, 2.5, 8)):
            pts = []; steps = max(4, int((a1 - a0) / 6))
            for k in range(steps + 1):
                a = np.radians(a0 + (a1 - a0) * k / steps); r = rad(a) + off + (1.2 if k % 2 else -0.4)
                pts.append((int(round(cx + np.cos(a) * r)), int(round(cy + np.sin(a) * r))))
            if run:                                                            # on into the grass at the stone's foot, along the ground
                xe, ye = pts[-1]; ye = min(ye, foot - 2); pts.append((xe + (3 if run > 0 else -3), ye - 1)); pts.append((xe + run, ye))
            seg(pts, C["white"], C["yellow"], C["gold"])
    else:
        pts = [(int(cx) + 1, top + 6), (int(cx) - 2, top + 12), (int(cx) + 2, top + 18), (int(cx) - 1, top + 25)]
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1):
                if i % 3 != 2: put(int(round(xa + (xb - xa) * i / n)), int(round(ya + (yb - ya) * i / n)), C["cream"] if i % 2 else C["gold"])
    return quant.outline(big)
fr = {1: build(1), 2: build(2)}
bbs = [quant.bbox((v >= 0) * 255) for v in fr.values()]; X0, Y0, X1, Y1 = min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)
for k, v in fr.items(): quant.save_indexed(v[Y0:Y1, X0:X1], os.path.join(sys.argv[2], f"stone-charged{k}.png"))
print("stone, final size", stone.shape, "canvas", (Y1 - Y0, X1 - X0))
