"""The charged stone at its final size (round 11), through the pipeline and not scaled: the stone is Retro Diffusion's own 48 x 64 redraw (img2img from the earlier generated stone,
seed 23 of three, sources/r11/C48-S-r11-stone-s23-rd.png), cleaned here: the cyan and blue specks the service left in the rock taken to the stone's greys, the largest component, despeckled,
no shadow in the piece (the still draws it). The charge is then drawn on it: frame 2 a zigzag across the face and six arcs placed vertex by vertex after the concept's crackle (jagged, two or three forks each, broken into segments, two running on into the grass), a 1 px white core with a 1 px yellow flank, gold only at the forks; frame 1 only a faint broken vein of
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
PADX, PADY, PADB = 28, 14, 6
# The crackle, placed vertex by vertex after the concept's (canvas coordinates; the stone's top left is at (28, 14)): each arc is jagged with two or three forks and BROKEN into segments; a segment is
# a short list of vertices; a 1 px white core with a 1 px yellow flank, gold only at the forks (the vertices listed in FORKS).
ARCS = [
    [[(34, 31), (30, 30), (24, 27), (21, 31), (15, 28)], [(13, 30), (11, 32), (5, 29)], [(21, 31), (19, 36), (14, 38), (11, 43)], [(15, 28), (14, 22), (9, 20)]],            # upper left
    [[(33, 52), (29, 52), (24, 56)], [(26, 60), (19, 64), (15, 69), (8, 70), (3, 74)], [(19, 64), (16, 59), (10, 58)]],                                                     # lower left, on into the grass
    [[(44, 15), (41, 10), (45, 6), (43, 1)], [(41, 10), (36, 8), (33, 3)]],                                                                                       # top left
    [[(58, 15), (62, 10), (60, 6), (65, 3)], [(62, 10), (67, 9), (70, 4)]],                                                                                       # top right
    [[(71, 31), (75, 30), (81, 27), (79, 32), (86, 30)], [(88, 31), (90, 34), (97, 31)], [(79, 32), (83, 38), (80, 42)], [(86, 30), (88, 24), (94, 22)]],                    # upper right
    [[(72, 56), (76, 56), (82, 60), (80, 65)], [(82, 67), (87, 68), (92, 72), (100, 74)], [(87, 68), (85, 74), (90, 77)]],                                                  # lower right, on into the grass
]
FORKS = {(21, 31), (15, 28), (19, 64), (41, 10), (62, 10), (79, 32), (86, 30), (87, 68)}
ZIG = [(53, 17), (46, 28), (55, 40), (46, 52), (52, 71)]                                                                                                              # the zigzag across the face
def build(frame):
    big = np.full((h + PADY + PADB, w + 2 * PADX), -1, dtype=np.int64); big[PADY:PADY + h, PADX:PADX + w] = stone
    foot = PADY + h
    def put(x, y, c, free=False):
        if 0 <= y < big.shape[0] and 0 <= x < big.shape[1] and y < foot + 1 and (not free or big[y, x] < 0): big[y, x] = c
    def line(a_, b_):
        (xa, ya), (xb, yb) = a_, b_; n = max(abs(xb - xa), abs(yb - ya), 1)
        return [(int(round(xa + (xb - xa) * i / n)), int(round(ya + (yb - ya) * i / n))) for i in range(n + 1)]
    def draw(pts, flank=True):
        cells = [c for a_, b_ in zip(pts[:-1], pts[1:]) for c in line(a_, b_)]
        if flank:
            for x, y in cells:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): put(x + dx, y + dy, C["yellow"])
        for x, y in cells: put(x, y, C["white"])
        for v in pts:
            if v in FORKS:
                for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)): put(v[0] + dx, v[1] + dy, C["gold"], free=True)
    if frame == 2:
        draw(ZIG)
        for arc in ARCS:
            for seg in arc: draw(seg)
    else:
        for (xa, ya), (xb, yb) in zip(ZIG[:-1], ZIG[1:]):
            for i, (x, y) in enumerate(line((xa, ya), (xb, yb))[:-1]):
                if 6 <= y - 17 <= 26 and i % 3 != 2: put(x, y, C["cream"] if i % 2 else C["gold"])
    return quant.outline(big)
fr = {1: build(1), 2: build(2)}
bbs = [quant.bbox((v >= 0) * 255) for v in fr.values()]; X0, Y0, X1, Y1 = min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)
for k, v in fr.items(): quant.save_indexed(v[Y0:Y1, X0:X1], os.path.join(sys.argv[2], f"stone-charged{k}.png"))
print("stone, final size", stone.shape, "canvas", (Y1 - Y0, X1 - X0))
