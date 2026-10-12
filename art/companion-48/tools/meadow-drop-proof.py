"""The meadow drop's proof: a place composed from the drop the way c2a-48px-spec §4.3 composes it (lawn non-repeat, lip and shore states by the shared
rule, face runs with caps, tall grass decals), indexed on meadow-palette.json. usage: compose.py DROP OUT_PREFIX"""
import json, sys, os, hashlib
import numpy as np
from PIL import Image
drop, outp = sys.argv[1:3]
man = json.load(open(os.path.join(drop, "meadow.json"))); pal = json.load(open(os.path.join(drop, "meadow-palette.json")))
PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in pal["entries"]])
def sheet(f):
    im = Image.open(f); a = np.array(im).astype(int); t = im.info.get("transparency", b"")
    for i in ([t] if isinstance(t, int) else [i for i, al in enumerate(t) if al == 0]): a[a == i] = TR
    return a
TR = -1
SH = {k: sheet(os.path.join(drop, v)) for k, v in man["sheets"].items()}
PC = {p["name"]: (p, SH[p["sheet"]][p["y"]:p["y"] + p["h"], p["x"]:p["x"] + p["w"]]) for p in man["pieces"]}
def by(**kw): return sorted([n for n, (p, _) in PC.items() if all(p.get(k) == v for k, v in kw.items())])
def hsh(*a): return int(hashlib.md5(repr(a).encode()).hexdigest()[:8], 16)
L = ["..............",
     "..1111111.....",
     "..1111111.....",
     "..1111111..1..",
     "..FFFFFFF.....",
     "..FFFFFFF.....",
     "..............",
     ".....wwwww....",
     "....wwwwwww...",
     "....wwwwwww...",
     ".....www......"]
R, Cn = len(L), len(L[0]); img = np.full((R * 48, Cn * 48), TR)
def put(a, y, x):
    h, w = a.shape; y0, x0 = max(0, y), max(0, x); y1, x1 = min(img.shape[0], y + h), min(img.shape[1], x + w)
    s = a[y0 - y:y1 - y, x0 - x:x1 - x]; img[y0:y1, x0:x1] = np.where(s != TR, s, img[y0:y1, x0:x1])
at = lambda r, c: L[r][c] if 0 <= r < R and 0 <= c < Cn else None
lawn = by(kind="ground", set="lawn"); n = len(lawn); v = {}
for r in range(R):
    for c in range(Cn):
        k = hsh("lawn", r, c) % n
        while (c > 0 and k == v[(r, c - 1)]) or (r > 0 and k == v[(r - 1, c)]): k = (k + 1) % n
        v[(r, c)] = k; put(PC[lawn[k]][1], r * 48, c * 48)
OFF = {0: (-1, 0), 1: (-1, 1), 2: (0, 1), 3: (1, 1), 4: (1, 0), 5: (1, -1), 6: (0, -1), 7: (-1, -1)}
def state(m, q):
    a = m >> (0 if q in ("nw", "ne") else 4) & 1; b = m >> (6 if q in ("nw", "sw") else 2) & 1
    d = m >> {"ne": 1, "se": 3, "sw": 5, "nw": 7}[q] & 1
    return "outer" if a and b else "edgeh" if a else "edgev" if b else "inner" if d else "fill"
QXY = {"nw": (0, 0), "ne": (0, 24), "se": (24, 24), "sw": (24, 0)}
for r in range(R):
    for c in range(Cn):
        ch = L[r][c]
        if ch == "w":
            m = sum(1 << i for i, (dy, dx) in OFF.items() if at(r + dy, c + dx) not in ("w", None))
            for q, (y, x) in QXY.items():
                s = state(m, q); put(PC[by(kind="shore", set="water", quad=q, state=s, frame=1)[0]][1], r * 48 + y, c * 48 + x)
        if ch == "1":
            m = sum(1 << i for i, (dy, dx) in OFF.items() if at(r + dy, c + dx) not in ("1", None))
            for q, (y, x) in QXY.items():
                s = state(m, q); zero = at(r, c + (1 if q in ("ne", "se") else -1)) == "F"
                if zero and s in ("outer", "edgev"): s += "0"
                put(PC[f"meadow/lip/lip-{q}-{s}"][1], r * 48 + y, c * 48 + x)
# face run on rows 4-5, cols 2..8: caps at both ends, then 3/2 widths
caps_w, caps_e = by(kind="cap", side="w"), by(kind="cap", side="e"); w3, w2, w1 = by(kind="face", cells=[3, 2]), by(kind="face", cells=[2, 2]), by(kind="face", cells=[1, 2])
a, b = 2, 8
put(PC[caps_w[0]][1], 4 * 48, a * 48); put(PC[caps_e[0]][1], 4 * 48, b * 48); a += 1; b -= 1
x = a; prev = None
while x <= b:
    rem = b - x + 1; W = (3 if hsh("fw", x) & 1 else 2) if rem >= 5 else 2 if rem == 4 else rem
    lst = {3: w3, 2: w2, 1: w1}[W]; k = hsh("fv", x) % len(lst)
    if lst[k] == prev: k = (k + 1) % len(lst)
    put(PC[lst[k]][1], 4 * 48, x * 48); prev = lst[k]; x += W
# tall grass on a few plain lawn tiles, a boulder, flowers
tall = by(kind="decal", set="tall")
for (r, c) in ((1, 10), (6, 2), (7, 11), (9, 1), (2, 12)):
    for k in range(2):
        p, a_ = PC[tall[hsh("td", r, c, k) % len(tall)]]; put(a_, r * 48 + hsh("ty", r, c, k) % (49 - p["h"]), c * 48 + hsh("tx", r, c, k) % (49 - p["w"]))
for nm, (r, c) in (("meadow/prop/boulder-2", (6, 9)), ("meadow/prop/flowers-1", (1, 12)), ("meadow/prop/reeds-1", (8, 11))):
    p, a_ = PC[nm]; put(a_, r * 48 + p["offset"][1], c * 48 + p["offset"][0])
rgb = PAL[img].astype(np.uint8); im = Image.fromarray(rgb, "RGB"); im.save(outp + "-1x.png")
im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(outp + "-3x.png")
