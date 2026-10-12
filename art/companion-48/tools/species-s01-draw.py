"""The C0 S01 Companion tokens, hand-drawn on the core 48 (the art director's brief): the idle, seven poses drawn from it, and the 12 px mini.
Every pixel is placed here by coordinates: the body's silhouette is spans written by hand, its shading is the top-left lighting rule (stone rim on the top-left edge of the back
and head only, slate lit, night mid, ink shade), the cream, the mouth line, the eye, the toes and the three leaves of the crest are drawn pixel by pixel; the poses move
and re-draw parts of the idle (body up, longer, lower, wider; crest taller, spread, swept, flat, tilted; head lowered; drops; the bit). Core 48 only (palette/palette.json),
alpha 0 or 255, the outline ink round the body and pine round the crest, never void (void is the pupil only). usage: python3 -I species-s01-draw.py OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PAL = json.load(open(os.path.join(HERE, "..", "palette", "palette.json")))["colours"]
NAME = [c["name"] for c in PAL]; RGB = np.array([c["rgb"] for c in PAL]); IDX = {n: i for i, n in enumerate(NAME)}
CODE = {'I': 'ink', 'N': 'night', 'S': 'slate', 'T': 'stone', 'P': 'paper', 'B': 'bone', 'D': 'sand', 'A': 'amber', 'O': 'orange', 'V': 'void', 'W': 'white', 'e': 'pine', 'f': 'forest', 'l': 'leaf', 'g': 'grass', 'i': 'ice', 'p': 'plumD'}
H = W = 32
def put(a, x, y, c):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]: a[y, x] = IDX[CODE.get(c, c)]
def save(a, path):
    rgba = np.zeros(a.shape + (4,), np.uint8)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x] >= 0: rgba[y, x, :3] = RGB[a[y, x]]; rgba[y, x, 3] = 255
    Image.fromarray(rgba, "RGBA").save(path)
def shifted(a, dx, dy):
    o = np.full_like(a, -1)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x] >= 0 and 0 <= y + dy < a.shape[0] and 0 <= x + dx < a.shape[1]: o[y + dy, x + dx] = a[y, x]
    return o
# ------------------------------------------------------------------ the body: the silhouette's interior spans (row: x0, x1), facing right; four legs on rows 28 to 30
SIL = {11: (15, 24), 12: (13, 26), 13: (11, 27), 14: (9, 27), 15: (8, 28), 16: (7, 29), 17: (6, 29), 18: (5, 28), 19: (5, 27), 20: (4, 26), 21: (4, 25), 22: (4, 25), 23: (4, 25), 24: (4, 25), 25: (4, 25), 26: (4, 25), 27: (4, 25)}
LEGS = [(4, 8), (10, 13), (15, 19), (21, 25)]          # back near, back far, front far, front near
def body():
    M = np.zeros((H, W), bool)
    for y, (a, b) in SIL.items(): M[y, a:b + 1] = True
    for a, b in LEGS: M[28:31, a:b + 1] = True
    ring = np.zeros_like(M)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy: ring |= np.roll(np.roll(M, dy, 0), dx, 1)
    ring &= ~M
    def run(y, x, dy, dx):
        n = 0
        while 0 <= y < H and 0 <= x < W and M[y, x]: y += dy; x += dx; n += 1
        return n
    o = np.full((H, W), -1)
    for y in range(H):
        for x in range(W):
            if not M[y, x]: continue
            tl = min(run(y, x, -1, 0), run(y, x, 0, -1), run(y, x, -1, -1)); br = min(run(y, x, 1, 0), run(y, x, 0, 1), run(y, x, 1, 1))
            c = 'T' if (tl == 1 and 11 <= y <= 19 and x <= 21) else ('S' if tl <= 3 else 'N')          # stone only as the 1 px rim on the top-left edge of the back and head
            put(o, x, y, c)
    o[ring] = IDX['ink']
    CREAM = {16: (26, 29), 17: (25, 29), 18: (23, 28), 19: (22, 27), 20: (19, 26), 21: (17, 25)}
    for y in range(22, 28): CREAM[y] = (16, 25)
    for y, (a, b) in CREAM.items():
        for x in range(a, b + 1):
            if M[y, x]: put(o, x, y, 'P')                       # paper, lit; no clay anywhere
    for x in range(26, 30): put(o, x, 16, 'B')                   # bone: the top highlight of the muzzle, 4 px
    for x in range(16, 26): put(o, x, 27, 'D')                   # sand: the shade under the belly, 1 row
    for x in range(23, 28): put(o, x, 19, 'N')                   # the mouth: one 1 px night line under the cream snout
    for a, b in LEGS:                                            # legs: night, an ink sole on row 30
        for x in range(a, b + 1): put(o, x, 28, 'N'); put(o, x, 29, 'N'); put(o, x, 30, 'I')
    for x in (16, 18, 22, 24): put(o, x, 30, 'B')                # four cream toes in bone on the two front feet
    return o
EYE_OPEN = ["WAA", "AOV", "AAA"]; EYE_HALF = ["NNN", "AOV", "AAA"]
def eye(a, x0, y0, rows):
    for j, r in enumerate(rows):
        for i, c in enumerate(r): put(a, x0 + i, y0 + j, c)
# ------------------------------------------------------------------ the crest: three leaves, pine outline, forest/leaf body, grass lit on the top-left of each
LEAF = ["..e..", ".ege.", "eglfe", "elffe", ".efe.", "..e.."]
LEAFB = ["..e..", ".ege.", "eglfe", "elffe", "elffe", ".efe.", "..e.."]
def leaf(a, x0, base, rows, tilt=0, extra=0):
    rows = list(rows)
    for _ in range(extra): rows.insert(3, rows[3])              # a taller leaf: one more body row
    n = len(rows)
    for j, r in enumerate(rows):
        s = int(round(tilt * (n - 1 - j) / (n - 1)))              # the tip moves most
        for i, c in enumerate(r):
            if c != '.': put(a, x0 + i + s, base - (n - 1) + j, c)
def crest(a, base, dxs=(0, 0, 0), tilt=0, extra=0):
    leaf(a, 13 + dxs[0], base, LEAF, tilt, extra); leaf(a, 21 + dxs[2], base, LEAF, tilt, extra); leaf(a, 17 + dxs[1], base, LEAFB, tilt, extra)
FLAT = ["..eeee..", "eglffle.", ".eeeee.."]
def crest_flat(a, top):                                        # the crest laid back on the head, tips toward the tail (left)
    for k, x0 in enumerate((12, 15, 18)):
        for j, r in enumerate(FLAT):
            for i, c in enumerate(r):
                if c != '.': put(a, x0 + i + 1, top - 3 + j + (1 if k == 1 else 0), c)
def drops(a, pts):
    for x, y in pts: put(a, x, y, 'W'); put(a, x, y + 1, 'i')
# ------------------------------------------------------------------ the poses
def idle():
    a = body(); eye(a, 20, 13, EYE_OPEN); crest(a, 9); return a
def split(a): return a[:10].copy(), a[10:].copy()
def alert(I):
    a = np.full((H, W), -1)
    for y in range(10, 28): a[y - 1] = I[y]                       # the body up 1 px
    a[27] = I[28]; a[28] = I[28]; a[29] = I[29]; a[30] = I[30]    # the legs one row longer, the feet on row 30
    crest(a, 8, dxs=(-1, 0, 1), extra=1)                           # one row taller, the outer leaves spread 1 px
    eye(a, 20, 12, EYE_OPEN); return a
def insert_cols(a, at, n):
    o = np.full((a.shape[0], a.shape[1] + n), -1)
    o[:, :at] = a[:, :at]; o[:, at + n:] = a[:, at:]
    for k in range(n): o[:, at + k] = a[:, at]
    return o
def flee(I):
    body_ = I[10:28].copy()
    b = insert_cols(body_, 14, 2)[:, 1:33]                         # 2 px longer, the whole thing one column left
    a = np.full((H, W), -1); a[11:11 + b.shape[0], :b.shape[1]] = b[:, :W]      # 1 px lower: the belly's bottom on row 28
    # the legs on rows 29 and 30, slanted: the back feet 2 px back and the front feet 2 px forward of where the body's stretch puts them
    for r, (db, df) in ((29, (-2, 2)), (30, (-3, 3))):
        for (x0, x1, front) in ((4, 8, False), (10, 13, False), (15, 19, True), (21, 25, True)):
            d = (df + 1) if front else db
            for x in range(x0 + d, x1 + d + 1): put(a, x, r, 'N' if r == 29 else 'I')
    for x in (16, 18, 22, 24): put(a, x + 3, 30, 'B')              # the toes go with the front feet
    crest(a, 10, tilt=-2)                                          # swept back: the tips 2 px toward the tail
    eye(a, 21, 14, EYE_OPEN)
    return a
def huddle(I):
    body_ = I[10:28].copy()
    b = insert_cols(body_, 14, 2)[:, 1:33]
    a = np.full((H, W), -1); a[12:12 + b.shape[0], :b.shape[1]] = b[:, :W]
    a[30] = -1
    for x in range(W):                                             # the feet hidden: the belly's bottom row closes with the ink outline on row 30
        if a[29, x] >= 0: a[30, x] = IDX['ink']
    crest_flat(a, 12)
    eye(a, 21, 15, EYE_HALF)                                       # half closed: the top row of the eye in night
    return a
def shake(I, k):
    dx = -1 if k == 0 else 1
    a = shifted(I, dx, 0); a[:10] = -1
    crest(a, 9, dxs=(dx, dx, dx), tilt=-dx * 2)                    # leaves tilted opposite the shift
    eye(a, 20 + dx, 13, EYE_OPEN)
    drops(a, [(3, 18), (29, 18), (7, 9), (24, 9), (1, 26)] if k == 0 else [(2, 14), (28, 13), (4, 25), (27, 24), (15, 6)])
    return a
def eat(I, k):
    a = np.full((H, W), -1)
    a[22:] = I[22:]                                                # the belly and the legs stay
    for x in range(W):                                             # the head lowered 2 px: column by column, 0 behind x 8, 1 for 9 to 13, 2 from 14 on, so the back runs into the head
        dy = 0 if x <= 8 else (1 if x <= 13 else 2)
        for y in range(0, 22):
            if I[y, x] >= 0 and y + dy < H: a[y + dy, x] = I[y, x]
    eye_dy = 2
    if k == 0:
        for x, y in ((30, 21), (31, 21), (30, 22), (31, 22)): put(a, x, y, 'p')      # a plumD bit 2 x 2 at the snout
        for x in range(24, 28): put(a, x, 21, 'N')                                    # the mouth open: the line two rows
    else:
        for x, y in ((30, 22), (31, 22)): put(a, x, y, 'p')                           # the bit 2 x 1, the mouth closed
    return a
# ------------------------------------------------------------------ the mini: head and crest only, 12 x 12
def mini():
    a = np.full((12, 12), -1)
    spans = {6: (2, 9), 7: (1, 10), 8: (1, 10), 9: (1, 10), 10: (2, 9)}
    M = np.zeros((12, 12), bool)
    for y, (x0, x1) in spans.items(): M[y, x0:x1 + 1] = True
    ring = np.zeros_like(M)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy: ring |= np.roll(np.roll(M, dy, 0), dx, 1)
    ring &= ~M
    for y in range(12):
        for x in range(12):
            if M[y, x]: put(a, x, y, 'S' if (x + y <= 8 and (x <= 3 or y <= 6) and x + y <= 8) else 'N')
    for x in range(9, 11): put(a, x, 8, 'P')
    for x in range(8, 11): put(a, x, 9, 'P')
    for x in range(8, 10): put(a, x, 10, 'P')                      # the cream snout, paper
    put(a, 6, 7, 'O'); put(a, 7, 7, 'V')                           # one orange eye, its void pupil toward the snout
    a[ring] = IDX['ink']
    for rows, x0, base in ((['.e.', 'ege', 'efe'], 1, 5), (['.e.', 'ege', 'elf', 'efe'], 4, 5), (['.e.', 'ege', 'efe'], 7, 5)):
        n = len(rows)
        for j, r in enumerate(rows):
            for i, c in enumerate(r):
                if c != '.': put(a, x0 + i, base - n + j + 1 - 1, c)
    return a
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    I = idle(); n = "c-token-S01-%s-32x32.png"
    for name, a in (("idle", I), ("alert", alert(I)), ("flee", flee(I)), ("huddle", huddle(I)), ("shake-f0", shake(I, 0)), ("shake-f1", shake(I, 1)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, n % name))
    save(mini(), os.path.join(out, "c-mini-S01-12x12.png")); print("S01: 8 tokens and the mini")
