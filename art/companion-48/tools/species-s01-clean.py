"""The C0 S01 Companion tokens, hand-cleaned FROM THE BASE'S OWN PIXELS (the art director's round 2): the idle and the mini come from build-species-token.py (adult 144 x 152, --flip) and
are edited in place, never redrawn: the silhouette (the round domed head joined to the round body, the crest rooted on the crown) and the outline stay; what is edited is, by coordinates:
the stone (a 1 px rim along the top-left of the head and back only; the lavender patches to slate or night), every stray orange, white and clay pixel, both eyes (the near 3 x 3, the far 2 x 3:
amber ring, orange iris, a void pupil, a white catch-light top-left), the short cream muzzle with its night mouth line, the cream oval belly (paper, a bone highlight, sand under), the four stubby
legs in charcoal with bone toes on row 30. The seven poses are then drawn from the cleaned idle (body, crest, legs, head and eyes moved or redrawn by coordinates; the drops and the bit placed).
Core 48 only, alpha 0 or 255, ink round the body, pine round the crest, never void (the pupils only). usage: python3 -I species-s01-clean.py BASE_DIR OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PAL = json.load(open(os.path.join(HERE, "..", "palette", "palette.json")))["colours"]
NAME = [c["name"] for c in PAL]; RGB = np.array([c["rgb"] for c in PAL]); IDX = {n: i for i, n in enumerate(NAME)}
CODE = {'I': 'ink', 'N': 'night', 'S': 'slate', 'T': 'stone', 'P': 'paper', 'B': 'bone', 'D': 'sand', 'A': 'amber', 'O': 'orange', 'V': 'void', 'W': 'white', 'e': 'pine', 'f': 'forest', 'l': 'leaf', 'g': 'grass', 'i': 'ice', 'p': 'plumD'}
H = W = 32
def load(path):
    a = np.asarray(Image.open(path).convert("RGBA")); o = np.full(a.shape[:2], -1)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3] >= 128: o[y, x] = int(np.argmin(((RGB - a[y, x, :3]) ** 2).sum(1)))
    return o
def save(a, path):
    rgba = np.zeros(a.shape + (4,), np.uint8)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x] >= 0: rgba[y, x, :3] = RGB[a[y, x]]; rgba[y, x, 3] = 255
    Image.fromarray(rgba, "RGBA").save(path)
def put(a, x, y, c):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]: a[y, x] = IDX[CODE.get(c, c)]
def nm(n): return IDX[n]
def grid(a, spans, c):
    for y, (x0, x1) in spans.items():
        for x in range(x0, x1 + 1):
            if a[y, x] >= 0: put(a, x, y, c)
# ------------------------------------------------------------------ the idle, from the base's pixels
def idle_from(base):
    a = base.copy(); bg = a < 0
    ring = np.zeros_like(bg)                                         # the base's outline: ink cells touching the background
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy: ring |= np.roll(np.roll(bg, dy, 0), dx, 1)
    ring &= ~bg
    CRESTC = {nm(n) for n in ("pine", "forest", "leaf", "grass")}
    # 1. the stone: only a 1 px rim along the top-left of the head and back (a stone pixel whose up or left neighbour is the outline or empty, on the head and back, x <= 22, y 10 to 20); every
    #    other stone patch (the lavender ones) goes to slate where it is lit (left of x 16 or above y 17) and night elsewhere
    for y in range(H):
        for x in range(W):
            if a[y, x] != nm('stone'): continue
            edge = (y == 0 or a[y - 1, x] < 0 or ring[y - 1, x]) or (x == 0 or a[y, x - 1] < 0 or ring[y, x - 1])
            if edge and 10 <= y <= 20 and x <= 22: continue
            a[y, x] = nm('slate') if (x < 16 or y < 17) else nm('night')
    # 2. the strays: every orange, amber, rust, white, bone and clay pixel in the body goes to night (the eyes and the cream are redrawn below); the cream pixels are cleared with them
    for y in range(10, H):
        for x in range(W):
            if a[y, x] in {nm(n) for n in ("orange", "amber", "rust", "white", "bone", "clay", "sand", "paper", "peach")}: a[y, x] = nm('night')
    # 3. the legs: rows 28 to 31 rebuilt as four stubby charcoal legs with bone toes on row 30 (the base's legs are smeared with cream and lavender)
    a[28:32, :] = -1
    legs = [(4, 6), (11, 13), (15, 17), (22, 25)]                    # interiors; the outline is ink one px either side
    for x in range(2, 28):
        if a[27, x] >= 0 and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in legs): put(a, x, 28, 'I')      # the belly's bottom outline between the legs
    for x0, x1 in legs:
        for y in (28, 29):
            put(a, x0 - 1, y, 'I'); put(a, x1 + 1, y, 'I')
            for x in range(x0, x1 + 1): put(a, x, y, 'S' if x == x0 and y == 28 else 'N')
        put(a, x0 - 1, 30, 'I'); put(a, x1 + 1, 30, 'I')
        for x in range(x0, x1 + 1): put(a, x, 30, 'B' if (x - x0) % 2 == 0 else 'N')    # the toes: bone on row 30
        for x in range(x0 - 1, x1 + 2): put(a, x, 31, 'I')
    # 4. the belly: a rounded cream oval (paper, a bone highlight, sand one row under), not a rectangle; the muzzle: short, rounded, paper with a bone top, one night mouth line
    for y, (x0, x1) in {20: (19, 23), 21: (18, 24), 22: (17, 24), 23: (17, 24), 24: (17, 24), 25: (17, 24), 26: (18, 24)}.items():
        for x in range(x0, x1 + 1): put(a, x, y, 'P')
    for x in range(19, 24): put(a, x, 27, 'D')                        # sand: the row under the belly
    for x, y in ((19, 21), (20, 21), (19, 22)): put(a, x, y, 'B')       # the bone highlight, top left
    for y, (x0, x1) in {17: (23, 27), 18: (22, 27)}.items():
        for x in range(x0, x1 + 1): put(a, x, y, 'P')
    for x in range(24, 28): put(a, x, 17, 'B')                         # the bone top of the muzzle
    for x in range(22, 26): put(a, x, 19, 'N')                         # the mouth: one 1 px night line under the snout
    # 5. the eyes, where the base puts them: the near one 3 x 3 (x 15 to 17, y 14 to 16), the far one 2 x 3 (x 26 and 27, y 14 to 16): amber ring, orange iris, a void pupil toward the snout, a white catch-light top-left
    for y in range(13, 17):
        for x in list(range(14, 19)) + list(range(25, 28)):
            if a[y, x] >= 0 and a[y, x] != nm('ink'): a[y, x] = nm('night')
    for j, r in enumerate(["WAA", "AOV", "AAA"]):
        for i, c in enumerate(r): put(a, 15 + i, 14 + j, c)
    for j, r in enumerate(["WA", "OV", "AA"]):
        for i, c in enumerate(r): put(a, 26 + i, 14 + j, c)
    return a
# ------------------------------------------------------------------ the poses, drawn from the cleaned idle
LEGS = [(4, 6), (11, 13), (15, 17), (22, 25)]
def insert_cols(a, at, n):
    o = np.full((a.shape[0], a.shape[1] + n), -1); o[:, :at] = a[:, :at]; o[:, at + n:] = a[:, at:]
    for k in range(n): o[:, at + k] = a[:, at]
    return o
def crest_of(I): c = np.full_like(I, -1); c[:10] = I[:10]; return c
def crest_put(a, c, dy=0, dx=0, tilt=0, extra=0, spread=0):
    """lay the idle's crest (rows 2 to 9) onto a: moved dy/dx, sheared so the tips move `tilt` px (the root stays), one row duplicated `extra` times (taller), the outer leaves pushed `spread` px apart"""
    rows = list(range(0, 10))
    for _ in range(extra): rows.insert(rows.index(6), 6)           # a taller crest: row 6 repeated
    n = len(rows)
    for k, r in enumerate(rows):
        y = 9 - (n - 1 - k) if False else k + (10 - n)
        sh = int(round(tilt * (9 - y) / 7.0)) if False else int(round(tilt * (n - 1 - k) / 7.0))
        for x in range(W):
            if c[r, x] < 0: continue
            xx = x + dx + sh + (-spread if x <= 14 else (spread if x >= 21 else 0))
            if 0 <= xx < W and 0 <= y + dy < H: a[y + dy, xx] = c[r, x]
def legs_draw(a, shifts, rows=(28, 29, 30), wide=0):
    for (x0, x1), d in zip(LEGS, shifts):
        top, mid, bot = rows
        for y in (top, mid) if bot - top > 1 else (top,):
            put(a, x0 - 1 + d - wide, y, 'I'); put(a, x1 + 1 + d + wide, y, 'I')
            for x in range(x0 + d - wide, x1 + d + wide + 1): put(a, x, y, 'S' if (x == x0 + d - wide and y == top) else 'N')
        put(a, x0 - 1 + d - wide, bot, 'I'); put(a, x1 + 1 + d + wide, bot, 'I')
        for x in range(x0 + d - wide, x1 + d + wide + 1): put(a, x, bot, 'B' if (x - (x0 + d - wide)) % 2 == 0 else 'N')
        for x in range(x0 - 1 + d - wide, x1 + 2 + d + wide): put(a, x, bot + 1, 'I')
def between_legs_outline(a, y, spans):
    for x in range(W):
        if a[y - 1, x] >= 0 and a[y, x] < 0 and not any(x0 - 1 <= x <= x1 + 1 for x0, x1 in spans): a[y, x] = IDX['ink']
def alert(I):
    a = np.full((H, W), -1)
    for y in range(10, 28): a[y - 1] = I[y]                       # the body up 1 px
    a[27] = I[28]; a[28] = I[29]; a[29] = I[29]; a[30] = I[30]; a[31] = I[31]   # the legs a row longer, the feet on row 30
    crest_put(a, crest_of(I), dy=-1, extra=1, spread=1)           # one row taller, the outer leaves spread 1 px
    return a
def flee(I):
    a = np.full((H, W), -1)
    body = insert_cols(I[10:28], 13, 2)[:, :W]                     # 2 px longer
    a[11:11 + body.shape[0]] = body
    legs_draw(a, (-2, -2, 2, 2), rows=(29, 30, 30), wide=0)        # the back feet 2 px back, the front feet 2 px forward (the stretch moved them), the legs stubby
    between_legs_outline(a, 29, [(x0 + d, x1 + d) for (x0, x1), d in zip(LEGS, (-2, -2, 2, 2))])
    crest_put(a, crest_of(I), dy=1, dx=1, tilt=-2)                  # swept back: the tips 2 px toward the tail
    return a
def huddle(I):
    a = np.full((H, W), -1)
    body = insert_cols(I[10:28], 13, 2)[:, :W]                     # 2 px wider
    a[12:12 + body.shape[0]] = body                                # 2 px lower
    for x in range(W):                                             # the feet hidden: the belly closes with the ink outline on row 30
        if a[29, x] >= 0: a[30, x] = IDX['ink']
    FLAT = ["..eeeee.", "eglffle.", ".eeeee.."]
    for k, x0 in enumerate((13, 16, 19)):                          # three leaves laid back on the crown, rooted, tips toward the tail
        for j, r in enumerate(FLAT):
            for i, c in enumerate(r):
                if c != '.': put(a, x0 + i, 10 + j + (1 if k == 1 else 0) + (0 if k < 2 else 0), c)
    for x0, y0, w in ((17, 16, 3), (28, 16, 2)):                   # half closed: the top row of each eye in night
        for x in range(x0, x0 + w): put(a, x, y0, 'N')
    return a
def shake(I, k):
    dx = -1 if k == 0 else 1; a = np.full((H, W), -1)
    for y in range(10, H):
        for x in range(W):
            if I[y, x] >= 0 and 0 <= x + dx < W: a[y, x + dx] = I[y, x]
    crest_put(a, crest_of(I), dx=dx, tilt=-dx * 2)                  # the leaves tilted opposite the shift
    for x, y in ([(3, 18), (29, 18), (7, 9), (24, 9), (1, 26)] if k == 0 else [(2, 14), (28, 13), (4, 25), (27, 24), (15, 6)]):
        put(a, x, y, 'W'); put(a, x, y + 1, 'i')                    # a drop: 1 x 2 ice with a white top pixel
    return a
def eat(I, k):
    a = np.full((H, W), -1); a[22:] = I[22:]
    for x in range(W):                                             # the head and crest lowered 2 px: 0 behind x 8, 1 for x 9 to 11, 2 from x 12 on
        dy = 0 if x <= 8 else (1 if x <= 11 else 2)
        for y in range(0, 22):
            if I[y, x] >= 0 and y + dy < H: a[y + dy, x] = I[y, x]
    if k == 0:
        for x in range(23, 26): put(a, x, 22, 'N')                  # the mouth open
        for x, y in ((29, 21), (30, 21), (29, 22), (30, 22)): put(a, x, y, 'p')   # a plumD bit 2 x 2 at the snout
    else:
        for x, y in ((29, 22), (30, 22)): put(a, x, y, 'p')         # the bit 2 x 1, the mouth closed
    return a
def mini_from(base):
    a = base.copy()
    ring = np.zeros(a.shape, bool); bg = a < 0
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy: ring |= np.roll(np.roll(bg, dy, 0), dx, 1)
    for y in range(12):
        for x in range(12):
            v = a[y, x]
            if v < 0 or ring[y, x] and v == nm('ink'): continue
            if v == nm('stone'):
                edge = y == 0 or a[y - 1, x] < 0 or (ring[y - 1, x] and a[y - 1, x] == nm('ink')) or a[y, x - 1] < 0
                a[y, x] = nm('stone') if (edge and x <= 6) else nm('slate')                 # a 1 px rim top-left only
            elif v in {nm(n) for n in ("clay", "sand", "bone", "paper", "peach")}:
                a[y, x] = nm('paper') if (x >= 8 and y >= 7) else (nm('slate') if x + y <= 9 else nm('night'))   # the snout is paper; no clay elsewhere
            elif v in {nm(n) for n in ("orange", "amber", "rust", "white")}: a[y, x] = nm('night')
    for x, y in ((6, 6), (7, 6)): a[y, x] = nm('night')
    put(a, 6, 6, 'O'); put(a, 7, 6, 'V')                          # one 1 px orange eye and its void pupil toward the snout
    return a
if __name__ == "__main__":
    base_dir, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
    I = idle_from(load(os.path.join(base_dir, "c-token-S01-idle-32x32.png")))
    for name, a in (("idle", I), ("alert", alert(I)), ("flee", flee(I)), ("huddle", huddle(I)), ("shake-f0", shake(I, 0)), ("shake-f1", shake(I, 1)), ("eat-f0", eat(I, 0)), ("eat-f1", eat(I, 1))):
        save(a, os.path.join(out, "c-token-S01-%s-32x32.png" % name))
    save(mini_from(load(os.path.join(base_dir, "c-mini-S01-12x12.png"))), os.path.join(out, "c-mini-S01-12x12.png"))
    print("S01: the idle from the base's pixels, seven poses from it, the mini")
