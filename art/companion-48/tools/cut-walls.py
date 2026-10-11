"""Cut the meadow's wall pieces from source sheet 1 (sources/meadow-src-walls-a1.jpg), by hand-set boxes.

Each wall run on the sheet is cropped from 10 px above its rock band (the turf that hangs over the top) to 2 px under it, and scaled
so that crop is two 48 px cells tall (FACE_H = 96: one level, at the approved scene b1's own scale, where a face stands
about two cells tall and its stones match). The sheet's flat ground green and its flat shadow green are keyed out (the
shadow is the foot-shadow piece's job on the cell below), and what is left is snapped to the meadow palette (nearest in CIE Lab).
A run's rounded left and right ends become the end caps (`cap-w`, `cap-e`); its middle is cut into pieces 3, 2 and 1 cells wide.
Every piece's left and right 16 px are cross-faded to one join strip taken from the sheet (32 px where the rock has the least vertical
edge: its left half for every piece's right edge, its right half for every left edge), so any piece joins any other as the strip's own two halves do.
Writes tileset/walls/<name>.png, walls.json (name, kind, cells, variant) and walls-runs-1x.png (random runs assembled, for the eye).
Runs come from several source sheets (a1, a2, a3); each sheet's ground and shadow greens are its own two most common greens.
Runs with rounded ends give caps; runs cut square at the sheet's edge give only faces.
usage: python3 -I cut-walls.py SOURCES_DIR PALETTE_JSON OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
srcdir, palj, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith(".png"): os.remove(os.path.join(out, f))
SHEETS = {k: np.asarray(Image.open(os.path.join(srcdir, f"meadow-src-walls-{k}.jpg")).convert("RGB")).astype(float) for k in ("a1", "a2", "a3")}
def greens(a):
    q = (a.reshape(-1, 3) // 4 * 4).astype(int); v, c = np.unique(q, axis=0, return_counts=True); o = np.argsort(-c)
    gr = [v[i] for i in o if v[i][1] > v[i][0] + 20 and v[i][1] > v[i][2] + 20][:6]
    gr = sorted(gr[:2], key=lambda x: -x.sum()) if len(gr) >= 2 else gr
    bg = gr[0]; sh = [x for x in [v[i] for i in o[:40]] if x[1] > x[0] + 20 and x.sum() < bg.sum() - 120]
    return bg, (sh[0] if sh else bg)
KEYS = {k: greens(v) for k, v in SHEETS.items()}
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    f = c @ M.T / np.array([.95047, 1, 1.08883]); f = np.where(f > .008856, np.cbrt(f), 7.787 * f + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
PL = lab(PAL)
# the runs: sheet, x range of the whole run, the rock band's rows (measured on the sheet), and whether its ends are rounded caps
RUNS = {"a": ("a1", 258, 766, 106, 209, True), "b": ("a1", 205, 798, 357, 457, True), "c": ("a1", 205, 816, 591, 725, True),
        "d": ("a2", 45, 980, 107, 211, True),
        "e": ("a3", 0, 1024, 60, 157, False), "f": ("a3", 105, 920, 262, 359, False), "g": ("a3", 105, 920, 468, 565, False),
        "h": ("a3", 105, 920, 672, 766, False), "i": ("a3", 105, 920, 877, 970, False)}
JOIN = ("f", 500)                                  # the join strip: run f, 16 px from x = 500

FACE_H = 96
def crop_run(sh, x0, x1, rt, rb, caps=True):
    S = SHEETS[sh]; BG, SHADOW = KEYS[sh]
    y0, y1 = rt - 10, rb + 2; s = FACE_H / (y1 - y0)
    im = Image.fromarray(S[y0:y1, x0:x1].astype(np.uint8)).resize((max(1, round((x1 - x0) * s)), FACE_H), Image.BOX)
    a = np.asarray(im).astype(float)
    key = (np.abs(a - BG).sum(-1) < 40) | (np.abs(a - SHADOW).sum(-1) < 36)
    return a, key, s

def snap(rgb, key):
    X = lab(rgb.reshape(-1, 3)); i = ((X[:, None] - PL[None]) ** 2).sum(-1).argmin(1).reshape(rgb.shape[:2])
    out_ = np.dstack([PAL[i], np.where(key, 0, 255)]).astype(np.uint8)
    return Image.fromarray(out_, "RGBA")

FW = 16                                            # the fade: 16 px at each edge (a third of a cell, stones are up to ~20 px)
jr = RUNS[JOIN[0]]; ja, jk, js = crop_run(*jr)
# the join strip: the 32 px of that run with the least vertical edge (so the strip itself carries no seam-like line)
L = 0.2126 * ja[..., 0] + 0.7152 * ja[..., 1] + 0.0722 * ja[..., 2]; ev = np.abs(np.diff(L, axis=1)).sum(0)
best = min(range(60, ja.shape[1] - 92), key=lambda x: ev[x:x + 31].sum()); J = ja[:, best:best + 2 * FW]
def fade(a, left, right):
    a = a.copy(); w = a.shape[1]
    for i in range(FW):
        t = 1 - i / FW
        if left: a[:, i] = J[:, FW + i] * t + a[:, i] * (1 - t)
        if right: a[:, w - 1 - i] = J[:, FW - 1 - i] * t + a[:, w - 1 - i] * (1 - t)
    return a

atlas = []; pieces = {}
for rn, (sh, x0, x1, rt, rb, caps) in RUNS.items():
    a, key, s = crop_run(sh, x0, x1, rt, rb); W = a.shape[1]
    if not caps: a, key = a[:, 6:W - 6], key[:, 6:W - 6]; W = a.shape[1]; a = np.hstack([a[:, :48], a, a[:, -48:]]); key = np.hstack([key[:, :48], key, key[:, -48:]]); W = a.shape[1]
    # the caps: the run's own rounded ends, 48 px each; their inner edge joins the walls (runs cut square give none)
    for nm, sl, l, r in ((("cap-w", slice(0, 48), False, True), ("cap-e", slice(W - 48, W), True, False)) if caps else ()):
        p = fade(a[:, sl], l, r); k = key[:, sl].copy()
        if l: k[:, :FW] = False
        if r: k[:, -FW:] = False
        name = f"wall-{nm}-{rn}"; snap(p, k).save(os.path.join(out, name + ".png")); pieces[name] = (p, k)
        atlas.append({"name": f"meadow/{'cap'}/{name}", "file": name + ".png", "kind": "cap", "cells": [1, FACE_H // 48], "side": nm[-1], "variant": rn})
    mid = a[:, 48:W - 48]; mk = key[:, 48:W - 48]; n = mid.shape[1] // 48; x = 0
    left = n; plan = []
    while left > 0:                                        # pack the middle: pieces 3, 2 and 1 wide, the widest that fits first
        w_ = 3 if left >= 3 and len(plan) % 3 != 2 else (2 if left >= 2 else 1); plan.append(w_); left -= w_
    for wcell in plan:
        p = fade(mid[:, x:x + wcell * 48], True, True); k = mk[:, x:x + wcell * 48].copy(); k[:, :FW] = False; k[:, -FW:] = False
        name = f"wall-{wcell}x{FACE_H // 48}-{rn}{x // 48}"; snap(p, k).save(os.path.join(out, name + ".png")); pieces[name] = (p, k)
        atlas.append({"name": f"meadow/face/{name}", "file": name + ".png", "kind": "face", "cells": [wcell, FACE_H // 48], "variant": f"{rn}{x // 48}"})
        x += wcell * 48
json.dump({"biome": "meadow", "tile": 48, "sources": [f"meadow-src-walls-{k}.jpg" for k in SHEETS], "pieces": atlas}, open(os.path.join(out, "walls.json"), "w"), indent=1)

# runs assembled from random pieces (cap, faces to length, cap), on the ground green, for the eye and the seam check
rng = np.random.RandomState(3); faces = [n for n in pieces if "cap" not in n]
rows = []; seams = []
for _ in range(4):
    names = [rng.choice([n for n in pieces if "cap-w" in n])]
    cells = 0
    while cells < 14:
        f = rng.choice(faces)
        if names[-1] == f: continue
        names.append(f); cells += int(f.split("-")[1][0])
    names.append(rng.choice([n for n in pieces if "cap-e" in n]))
    row = np.hstack([pieces[n][0] for n in names]); k = np.hstack([pieces[n][1] for n in names])
    # seam step: luminance across each join against inside
    L = 0.2126 * row[..., 0] + 0.7152 * row[..., 1] + 0.0722 * row[..., 2]; d = np.abs(np.diff(L, axis=1)); xs = np.cumsum([pieces[n][0].shape[1] for n in names])[:-1] - 1
    seams.append(float(d[:, xs].mean() / np.delete(d, xs, axis=1).mean()))
    img = snap(row, k); bg = Image.new("RGBA", img.size, (106, 168, 60, 255)); bg.alpha_composite(img); rows.append(bg)
W = max(r.width for r in rows); sheet_img = Image.new("RGBA", (W, len(rows) * (FACE_H + 8)), (30, 30, 40, 255))
for i, r in enumerate(rows): sheet_img.alpha_composite(r, (0, i * (FACE_H + 8)))
sheet_img.save(os.path.join(out, "walls-runs-1x.png")); sheet_img.resize((W * 3, sheet_img.height * 3), Image.NEAREST).save(os.path.join(out, "walls-runs-3x.png"))
print(len(atlas), "pieces; seam step (join / inside) per run:", [round(x, 2) for x in seams])
