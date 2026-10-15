"""The meadow drop's proof place, composed by hand like test map 12, from only what the loader draws (lawn, sand, lip quarters, water
quarters and the shore macros, face runs with caps, decals, props), with the level tone (levelTone dark, none, light; grass only:
lawn and decals at their level, lips at level - 1, faces and caps at their upper level, water's lawn margin at its level).
Layout cells: '.' level 0, '1' level 1, 's' sand (level 0, unused: v1 cannot round a sand tile, so the beach is the water's own bank), 'w' water (level 0), 'F' a face hanging from level 1 (two rows tall,
standing on level 0). usage: meadow-drop-place.py DROP OUT_PREFIX"""
import json, sys, os, hashlib
import numpy as np
from PIL import Image
drop, outp = sys.argv[1:3]
man = json.load(open(os.path.join(drop, "meadow.json"))); pal = json.load(open(os.path.join(drop, "meadow-palette.json")))["entries"]
PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in pal]); N = len(PAL)
GR = np.array([c.get("mat") == "grass" for c in pal]); ID = np.arange(N)
TONE = {"none": ID, "light": np.where(GR, [c["light"] for c in pal], ID), "dark": np.where(GR, [c["dark"] for c in pal], ID)}
LEVEL_TONE = ["dark", "none", "light"]
def toned(a, level): t = TONE[LEVEL_TONE[min(2, max(0, level))]]; return np.where(a >= 0, t[np.clip(a, 0, None)], a)
def sheet(f):
    im = Image.open(f); a = np.array(im).astype(int); t = im.info.get("transparency", b"")
    for i in ([t] if isinstance(t, int) else [i for i, al in enumerate(t) if al == 0]): a[a == i] = -1
    return a
SH = {k: sheet(os.path.join(drop, v)) for k, v in man["sheets"].items()}
PC = {p["name"]: (p, SH[p["sheet"]][p["y"]:p["y"] + p["h"], p["x"]:p["x"] + p["w"]]) for p in man["pieces"]}
def by(**kw): return sorted([n for n, (p, _) in PC.items() if all(p.get(k) == v for k, v in kw.items())])
def hsh(*a): return int(hashlib.md5(repr(a).encode()).hexdigest()[:8], 16)
L = ["..................",
     "...1111111........",
     "..111111111....11.",
     "..111111111...111.",
     "..FF1111111...FFF.",
     "..FF1111111...FFF.",
     "....11111FF.......",
     "....FFFFF.........",
     "....FFFFF.....www.",
     "..........wwwwwww.",
     ".....ssss.wwwwwww.",
     ".....ssssswwwwwww."]
R, Cn = len(L), len(L[0]); img = np.full((R * 48, Cn * 48), -1)
at = lambda r, c: L[r][c] if 0 <= r < R and 0 <= c < Cn else None
def level(ch): return 1 if ch == "1" else 0
def put(a, y, x):
    h, w = a.shape; y0, x0 = max(0, y), max(0, x); y1, x1 = min(img.shape[0], y + h), min(img.shape[1], x + w)
    s = a[y0 - y:y1 - y, x0 - x:x1 - x]; img[y0:y1, x0:x1] = np.where(s >= 0, s, img[y0:y1, x0:x1])
lawn = by(kind="ground", set="lawn"); v = {}
for r in range(R):
    for c in range(Cn):
        k = hsh("lawn", r, c) % len(lawn)
        while (c > 0 and k == v[(r, c - 1)]) or (r > 0 and k == v[(r - 1, c)]): k = (k + 1) % len(lawn)
        v[(r, c)] = k
        if L[r][c] == "s":                                               # sand by the sandShore rule: its quarters by its land mask (land = neither sand nor water)
            m = sum(1 << i for i, (dy, dx) in {0: (-1, 0), 1: (-1, 1), 2: (0, 1), 3: (1, 1), 4: (1, 0), 5: (1, -1), 6: (0, -1), 7: (-1, -1)}.items() if at(r + dy, c + dx) not in ("s", "w", None))
            for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "se": (24, 24), "sw": (24, 0)}.items():
                a_ = m >> (0 if q in ("nw", "ne") else 4) & 1; b_ = m >> (6 if q in ("nw", "sw") else 2) & 1; d_ = m >> {"ne": 1, "se": 3, "sw": 5, "nw": 7}[q] & 1
                st_ = "outer" if a_ and b_ else "edgeh" if a_ else "edgev" if b_ else "inner" if d_ else "fill"
                put(toned(PC[f"meadow/shore/sand-{q}-{st_}-f1"][1], 0), r * 48 + y, c * 48 + x)
        else: put(toned(PC[lawn[k]][1], level(L[r][c])), r * 48, c * 48)
# the cast shadow on the lower lawn (proposed loader rule): e = the west neighbour is raised (plateau or face), s = the north neighbour
# is a face's foot, es = both, c = only the north-west neighbour is raised; toned by the tile's level like the lawn
raised = lambda r, c: at(r, c) in ("1", "F")
GRID = {f"{r},{c}": {"cell": L[r][c], "lawn": lawn[v[(r, c)]], "shadow": None} for r in range(R) for c in range(Cn)}
for r in range(R):
    for c in range(Cn):
        if L[r][c] not in (".",): continue
        e, s_ = raised(r, c - 1), at(r - 1, c) == "F"
        st = "es" if e and s_ else "e" if e else "s" if s_ else "c" if raised(r - 1, c - 1) else None
        if st: put(toned(PC[f"meadow/shadow/cast-{st}"][1], 0), r * 48, c * 48)
        GRID[f"{r},{c}"] = {"cell": L[r][c], "lawn": lawn[v[(r, c)]], "shadow": st}
OFF = {0: (-1, 0), 1: (-1, 1), 2: (0, 1), 3: (1, 1), 4: (1, 0), 5: (1, -1), 6: (0, -1), 7: (-1, -1)}
def state(m, q):
    a = m >> (0 if q in ("nw", "ne") else 4) & 1; b = m >> (6 if q in ("nw", "sw") else 2) & 1
    d = m >> {"ne": 1, "se": 3, "sw": 5, "nw": 7}[q] & 1
    return "outer" if a and b else "edgeh" if a else "edgev" if b else "inner" if d else "fill"
QXY = {"nw": (0, 0), "ne": (0, 24), "se": (24, 24), "sw": (24, 0)}
W_ = lambda r, c: at(r, c) in ("w", None)
# shore macros: a 2x2 block of water on a convex corner (land on both outer sides of the block), radius by (7y + 3x) & 1
macro_cells = set()
for r in range(R - 1):
    for c in range(Cn - 1):
        blk = [(r, c), (r, c + 1), (r + 1, c), (r + 1, c + 1)]
        if not all(at(*p) == "w" for p in blk): continue
        for q, (side_r, side_c) in {"nw": ((r - 1, c), (r, c - 1)), "ne": ((r - 1, c + 1), (r, c + 2)), "sw": ((r + 2, c), (r + 1, c - 1)), "se": ((r + 2, c + 1), (r + 1, c + 2))}.items():
            ra, rb = {"nw": ((r - 1, c + 1), (r + 1, c - 1)), "ne": ((r - 1, c), (r + 1, c + 2)), "sw": ((r + 2, c + 1), (r, c - 1)), "se": ((r + 2, c), (r, c + 2))}[q]
            if not W_(*side_r) and not W_(*side_c) and not W_(*ra) and not W_(*rb) and not (set(blk) & macro_cells):
                rad = (60, 42)[(7 * r + 3 * c) & 1]; names = by(kind="shore-macro", quad=q, radius=rad, frame=1) or by(kind="shore-macro", quad=q, frame=1)
                if names:
                    sandy = any(at(y_ + dy, x_ + dx) == "s" for (y_, x_) in blk for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)))   # a macro's margin is one ground: sand only if a side meets sand
                    nm = names[0].replace("/water-", "/water-sand-") if sandy else names[0]
                    put(toned(PC[nm][1], 0), r * 48, c * 48); macro_cells |= set(blk)
for r in range(R):
    for c in range(Cn):
        ch = L[r][c]
        if ch == "w" and (r, c) not in macro_cells:
            m = sum(1 << i for i, (dy, dx) in OFF.items() if not W_(r + dy, c + dx))
            sandy = any(at(r + dy, c + dx) == "s" for dy, dx in OFF.values())   # a land neighbour that is sand: the quarters with a sand margin
            for q, (y, x) in QXY.items(): put(toned(PC[by(kind="shore", set="water-sand" if sandy else "water", quad=q, state=state(m, q), frame=1)[0]][1], 0), r * 48 + y, c * 48 + x)
        if ch == "1":
            m = sum(1 << i for i, (dy, dx) in OFF.items() if at(r + dy, c + dx) not in ("1", None))
            for q, (y, x) in QXY.items():
                s = state(m, q)
                if at(r, c + (1 if q in ("ne", "se") else -1)) == "F" and s in ("outer", "edgev"): s += "0"
                put(toned(PC[f"meadow/lip/lip-{q}-{s}"][1], 0), r * 48 + y, c * 48 + x)
# drop 2: the light patch on the plateau, the deeper centre of the pond with its edge, the ford stones (only when the drop carries them)
LIGHTT = np.array([c["light"] for c in pal]); LUM = PAL @ np.array([.2126, .7152, .0722]); LIMEI = man.get("lightMask", 19)
def apply_light(buf, lit):
    """the light pieces are masks (lime = lit): under each lime pixel a lawn pixel p becomes LIGHT[p], only where LIGHT[p] is lighter than p
    (relative luminance): the patch never darkens, and the ramp's top does not wrap"""
    for (r, c) in sorted(lit):
        m = sum(1 << i for i, (dy, dx) in OFF.items() if (r + dy, c + dx) not in lit)
        for q, (y, x) in QXY.items():
            a_ = PC[f"meadow/light/{q}-{state(m, q)}"][1]; y0, x0 = r * 48 + y, c * 48 + x; sub = buf[y0:y0 + 24, x0:x0 + 24]
            ok = (a_ == LIMEI) & (sub >= 0); ok[ok] = GR[sub[ok]] & (LUM[LIGHTT[sub[ok]]] > LUM[sub[ok]]); sub[ok] = LIGHTT[sub[ok]]
if "meadow/light/nw-fill" in PC:
    inner = {(r, c) for r in range(R) for c in range(Cn) if L[r][c] == "1" and all(at(r + dy, c + dx) == "1" for dy, dx in OFF.values())}
    blk = next((r, c) for r in range(R) for c in range(Cn) if all((r + i, c + j) in inner for i in range(2) for j in range(4)))   # a 4x2 block, the top-left-most, one cell in from every rim
    lit = {(blk[0] + i, blk[1] + j) for i in range(2) for j in range(4)}
    apply_light(img, lit)
    GRID["light"] = sorted(f"{r},{c}" for r, c in lit)
if "meadow/ground/core-1" in PC:
    core = {(r, c) for r in range(R) for c in range(Cn) if L[r][c] == "w" and all(W_(r + dy, c + dx) for dy, dx in OFF.values())}
    for (r, c) in sorted(core):
        put(PC[f"meadow/ground/core-{1 + hsh('core', r, c) % 2}"][1], r * 48, c * 48)
        m = sum(1 << i for i, (dy, dx) in OFF.items() if (r + dy, c + dx) not in core)
        for q, (y, x) in QXY.items():
            if state(m, q) != "fill": put(PC[f"meadow/core-edge/{q}-{state(m, q)}-f1"][1], r * 48 + y, c * 48 + x)
    GRID["core"] = sorted(f"{r},{c}" for r, c in core)
if "meadow/prop/ford-1" in PC:
    for k in range(3):                                                    # three in a line across the pond's top-right arm (row 8), their edges about 14 px apart, centred on the arm
        p_, a_ = PC[f"meadow/prop/ford-{k + 1}"]; span = 3 * p_["w"] + 2 * 14
        put(a_, 8 * 48 + 22, 15 * 48 + 24 - span // 2 + k * (p_["w"] + 14))
caps_w, caps_e = by(kind="cap", side="w"), by(kind="cap", side="e"); w3, w2, w1 = by(kind="face", cells=[3, 2]), by(kind="face", cells=[2, 2]), by(kind="face", cells=[1, 2])
for r in range(R):
    if "F" not in L[r]: continue
    c = 0
    while c < Cn:
        if L[r][c] != "F" or (r > 0 and at(r - 1, c) == "F"): c += 1; continue
        a = c
        while c < Cn and L[r][c] == "F" and not (r > 0 and at(r - 1, c) == "F"): c += 1
        b = c - 1
        if at(r, a - 1) != "1": put(toned(PC[caps_w[hsh("fc", a) % len(caps_w)]][1], 1), r * 48, a * 48); a += 1
        if b >= a and at(r, b + 1) != "1": put(toned(PC[caps_e[hsh("fc", b) % len(caps_e)]][1], 1), r * 48, b * 48); b -= 1
        x = a; prev = None
        while x <= b:
            rem = b - x + 1; W = (3 if hsh("fw", x) & 1 else 2) if rem >= 5 else 2 if rem == 4 else rem
            lst = {3: w3, 2: w2, 1: w1}[W]; k = hsh("fv", x) % len(lst)
            if lst[k] == prev: k = (k + 1) % len(lst)
            put(toned(PC[lst[k]][1], 1), r * 48, x * 48); prev = lst[k]; x += W
tall = by(kind="decal", set="tall")
for (r, c) in ((0, 1), (1, 12), (6, 1), (9, 2), (7, 11), (5, 7), (2, 5), (11, 1), (0, 14)):
    for k in range(2):
        p, a_ = PC[tall[hsh("td", r, c, k) % len(tall)]]; put(toned(a_, level(L[r][c])), r * 48 + hsh("ty", r, c, k) % (49 - p["h"]), c * 48 + hsh("tx", r, c, k) % (49 - p["w"]))
for nm, (r, c) in (("meadow/prop/boulder-2", (8, 2)), ("meadow/prop/boulder-1", (7, 13)), ("meadow/prop/flowers-1", (1, 15)), ("meadow/prop/flowers-2", (3, 6)), ("meadow/prop/reeds-1", (8, 13)), ("meadow/prop/reeds-2", (11, 8))):
    p, a_ = PC[nm]; put(a_, r * 48 + p["offset"][1], c * 48 + p["offset"][0])
rgb = PAL[np.clip(img, 0, None)].astype(np.uint8); rgb[img < 0] = (0, 0, 0)
im = Image.fromarray(rgb, "RGB"); im.save(outp + "-1x.png"); im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(outp + "-3x.png")
if "meadow/light/nw-fill" in PC:                                          # the patch on a level-1 and a level-2 lawn (the place has no level-2 plateau): two 6x4-cell swatches
    sw = []
    for lv in (1, 2):
        buf = np.full((4 * 48, 6 * 48), -1)
        for r in range(4):
            for c in range(6):
                k = hsh("sw", lv, r, c) % len(lawn); buf[r * 48:r * 48 + 48, c * 48:c * 48 + 48] = toned(PC[lawn[k]][1], lv)
        apply_light(buf, {(r, c) for r in (1, 2) for c in (1, 2, 3, 4)}); sw.append(PAL[buf].astype(np.uint8))
    sheet2 = np.concatenate([sw[0], np.full((sw[0].shape[0], 16, 3), (0x2b, 0x30, 0x38), np.uint8), sw[1]], 1)
    im2 = Image.fromarray(sheet2, "RGB"); im2.save(outp + "-levels-1x.png"); im2.resize((im2.width * 3, im2.height * 3), Image.NEAREST).save(outp + "-levels-3x.png")
json.dump({"layout": L, "levelTone": LEVEL_TONE, "cells": GRID, "macros": sorted(f"{r},{c}" for r, c in macro_cells)}, open(outp + "-grid.json", "w"), indent=1)
print("macros", len(macro_cells) // 4)
