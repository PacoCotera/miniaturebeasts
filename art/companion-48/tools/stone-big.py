"""The charged stone, big (round 10): about 1.5 times the pawn's height (the pawn is 40 px; the stone's body is 60), with a big yellow-white crackle. The silhouette is the Retro Diffusion
stone (work/props-rd/stone-charged2-rd.png, its teal specks taken out) scaled by 1.55 with nearest rows and columns, kept in the K ramp. Frame 1 (the charge building): a thin vein of
white on yellow across the face and four short arms; frame 2 (crackling): a thick zigzag bolt across the face and eight long arms off the whole silhouette, each with a branch,
white core, yellow flank, gold tips. No shadow in the piece: the still draws the stone's shadow on the grass. usage: python3 -I stone-big.py WORK_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; work = sys.argv[1]
src = quant.quantize(np.asarray(Image.open(os.path.join(work, "props-rd", "stone-charged2-rd.png")).convert("RGBA")))
src = np.where(np.isin(src, [C["tealD"], C["teal"], C["aqua"], C["mint"], C["white"], C["ice"], C["sky"]]), C["rock"], src)
F = 1.55; H0, W0 = src.shape; H1, W1 = int(round(H0 * F)), int(round(W0 * F))
stone = np.full((H1, W1), -1, dtype=np.int64)
for y in range(H1):
    for x in range(W1): stone[y, x] = src[min(H0 - 1, int(y / F)), min(W0 - 1, int(x / F))]
PAD = 22
def build(frame):
    big = np.full((H1 + 2 * PAD, W1 + 2 * PAD), -1, dtype=np.int64); big[PAD:PAD + H1, PAD:PAD + W1] = stone
    sil = big >= 0; foot = PAD + H1; rg = np.random.RandomState(5 + frame)
    cx = PAD + W1 // 2; cy = PAD + H1 // 2
    def put(x, y, c, free=False):
        if 0 <= y < big.shape[0] and 0 <= x < big.shape[1] and y < foot - 1 and (not free or big[y, x] < 0): big[y, x] = c
    def bolt(pts, width):
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1):
                x = int(round(xa + (xb - xa) * i / n)); y = int(round(ya + (yb - ya) * i / n))
                if width > 1:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): put(x + dx, y + dy, C["yellow"])
                    if width > 2:
                        for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)): put(x + dx, y + dy, C["gold"], free=True)
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1): put(int(round(xa + (xb - xa) * i / n)), int(round(ya + (yb - ya) * i / n)), C["white"])
        x, y = pts[-1]; put(x, y, C["cream"]); put(x + 1, y - 1, C["yellow"], free=True)
    def zig(x, y, ang, length, jit):
        a = np.radians(ang); pts = [(x, y)]; px, py = float(x), float(y); s = 1
        for k in range(length // 3):
            px += np.cos(a) * 3 - np.sin(a) * jit * s; py += np.sin(a) * 3 + np.cos(a) * jit * s; s = -s; pts.append((int(round(px)), int(round(py))))
        return pts
    def edge_point(ang):
        a = np.radians(ang); px, py = float(cx), float(cy)
        while 0 <= int(py) < big.shape[0] and 0 <= int(px) < big.shape[1] and sil[int(py), int(px)]: px += np.cos(a) * .5; py += np.sin(a) * .5
        return int(round(px - np.cos(a))), int(round(py - np.sin(a)))
    top = PAD + 3
    if frame == 2:
        main = [(cx + 2, top), (cx - 5, top + 12), (cx + 4, top + 24), (cx - 6, top + 36), (cx + 1, foot - 8)]; bolt(main, 3)
        for ang, ln in ((-165, 20), (-130, 22), (-95, 18), (-60, 22), (-25, 20), (20, 14), (165, 20), (200, 14)):
            x, y = edge_point(ang)
            if y > foot - 10: continue
            pts = zig(x, y, ang, ln, 2); bolt(pts, 3)
            m = pts[len(pts) // 2]; bolt(zig(m[0], m[1], ang + (38 if rg.rand() < .5 else -38), 8, 2), 2)
    else:
        main = [(cx + 1, top + 4), (cx - 3, top + 14), (cx + 3, top + 26), (cx - 2, foot - 12)]; bolt(main, 2)
        for ang, ln in ((-150, 9), (-100, 8), (-40, 9), (170, 8)):
            x, y = edge_point(ang); bolt(zig(x, y, ang, ln, 1), 1)
    return quant.outline(big)
fr = {1: build(1), 2: build(2)}                                                           # the two frames share one canvas (the union of both), so the stone does not move between them
bbs = [quant.bbox((v >= 0) * 255) for v in fr.values()]; x0, y0, x1, y1 = min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)
for k, v in fr.items(): quant.save_indexed(v[y0:y1, x0:x1], os.path.join(work, "props", f"stone-charged{k}.png"))
print("big charged stone, 2 frames")
