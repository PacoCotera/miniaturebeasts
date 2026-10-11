"""The meadow's side faces: the rock seen on a plateau's west or east side in the 3/4 top-down view (the camera looks north,
so a side face shows as a narrow column, as b1 draws at its top left and along its stream).

Each strip is one cell (48 px) tall, 44 px wide on a west side (in the light, as b1's chunky column) and 28 px on an east side, and tiles down a plateau's side. It is cut from the rock of the wall faces
(tileset/walls, their 3-wide pieces, rows clear of the turf), so its stones are the walls' own; it is made seamless top to bottom
by cross-fading its last 10 rows into its first, then snapped to the meadow palette. A west side faces the light (top left) and
is lifted 12 %; an east side is in shade, 22 % down. The outer edge is cut into 2-3 rounded boulders a cell (a 1-8 px profile, 0 at the ends so strips tile) with a dark outline.
End pieces: side-<w|e>-top (the strip's top rounded on 8 px, under the plateau's rim), side-<w|e>-foot (its foot rounded
on 12 px, with a dark base line) and side-<w|e>-tail (the side's last two rows beside a face's outer end, 96 px, ending on
the face's foot line: stone, then a dark base; phase 6 name face/side-e-tail, face/side-w-tail). Three variants per side.
Writes tileset/walls/side-<w|e>-<n>.png, -top.png, -foot.png and adds them to walls.json.
usage: python3 -I build-side-faces.py PALETTE_JSON WALLS_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
palj, wd = sys.argv[1:3]
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    f = c @ M.T / np.array([.95047, 1, 1.08883]); f = np.where(f > .008856, np.cbrt(f), 7.787 * f + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
PL = lab(PAL); OUTL = int((PAL @ [.2126, .7152, .0722]).argmin())
def snap(rgb):
    X = lab(rgb.reshape(-1, 3)); return ((X[:, None] - PL[None]) ** 2).sum(-1).argmin(1).reshape(rgb.shape[:2])
wj = json.load(open(os.path.join(wd, "walls.json"))); wj["pieces"] = [p for p in wj["pieces"] if p.get("kind") not in ("side", "side-end")]
faces = sorted(p["file"] for p in wj["pieces"] if p.get("kind") == "face" and p["cells"][0] == 3)
Hh, FW = 48, 10; WID = {"w": 44, "e": 28}   # chunky pillars, as b1's top-left column (~45 px)
rng = np.random.RandomState(2020)
def save(a, name, kind, side, extra=None):
    rgba = np.zeros(a.shape + (4,), np.uint8); m = a >= 0; rgba[m, :3] = PAL[a[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(wd, name + ".png"))
    wj["pieces"].append({"name": f"meadow/side/{name}", "file": name + ".png", "kind": kind, "side": side, "px": [W, a.shape[0]], **(extra or {})})
def outline(a, side, prof):
    """cut the outer edge (left for a west side, right for an east side) on prof, and outline it"""
    for y in range(a.shape[0]):
        p = prof[y]
        if side == "w": a[y, :p] = -1; a[y, p] = OUTL
        else: a[y, W - p:] = -1; a[y, W - 1 - p] = OUTL
    return a
for side, gain in (("w", 1.12), ("e", .78)):
    W = WID[side]
    for n in range(3):
        f = np.asarray(Image.open(os.path.join(wd, faces[n % len(faces)])).convert("RGBA")).astype(float)
        x0 = 30 + rng.randint(0, f.shape[1] - 80); strip = f[22:22 + Hh + FW, x0:x0 + W, :3]
        for i in range(FW):                                          # seamless: the last 10 rows fade into the first
            t = (i + 1) / (FW + 1); strip[Hh + i - FW] = strip[Hh + i - FW] * (1 - t) + strip[i] * t
        rgb = np.clip(strip[:Hh] * gain, 0, 255); a = snap(rgb)
        yy_ = np.arange(Hh)                                            # boulders: 2-3 rounded bulges a cell, 0 at the ends (tiles)
        k_ = (2, 3, 2)[n]; bump = np.abs(np.sin(np.pi * k_ * yy_ / Hh))
        prof = np.clip(np.round(1 + 7 * (1 - bump) ** 1.5), 1, 8).astype(int)
        save(outline(a, side, prof), f"side-{side}-{n + 1}", "side", side, {"cells": [0, 1], "variant": n + 1})
    base = snap(np.clip(np.asarray(Image.open(os.path.join(wd, faces[0])).convert("RGB")).astype(float)[22:70, 40:40 + W] * gain, 0, 255))
    top = base[:24].copy(); prof = np.full(24, 2)
    for y in range(8): prof[y] = 2 + int(round(8 - np.sqrt(max(0, 64 - (8 - y) ** 2))))     # rounded on 8 px
    top = outline(top, side, prof)
    for y in range(8):                                               # the top's own round: clear the corner away from the plateau
        for x in range(W):
            xx = x if side == "w" else W - 1 - x
            if (xx - 8) ** 2 + (y - 8) ** 2 > 64 and xx < 8: top[y, x] = -1
    save(top, f"side-{side}-top", "side-end", side, {"end": "top"})
    foot = base[24:48].copy(); prof = np.full(24, 2)
    for y in range(12): prof[23 - y] = 2 + int(round(12 - np.sqrt(max(0, 144 - (12 - y) ** 2))))
    foot = outline(foot, side, prof); foot[-1][foot[-1] >= 0] = OUTL
    save(foot, f"side-{side}-foot", "side-end", side, {"end": "foot"})
    # the tail: the side's last two rows beside a face's outer end (an outer corner), 96 px, ending on the face's 2 px foot line
    t1 = np.asarray(Image.open(os.path.join(wd, f"side-{side}-1.png")).convert("RGBA")); t2 = np.asarray(Image.open(os.path.join(wd, f"side-{side}-2.png")).convert("RGBA"))
    tail = np.vstack([t1, t2]); a = np.full(tail.shape[:2], -1, int); m = tail[..., 3] > 0
    a[m] = (((tail[..., :3][m][:, None].astype(int) - PAL[None]) ** 2).sum(-1)).argmin(1)
    stone = int(np.argmin(((PAL - np.array((0x5d, 0x59, 0x74))) ** 2).sum(1)))
    for y in (2 * Hh - 2, 2 * Hh - 1): a[y][a[y] >= 0] = stone
    a[2 * Hh - 1][a[2 * Hh - 1] >= 0] = OUTL
    save(a, f"side-{side}-tail", "side-end", side, {"end": "tail", "cells": [0, 2]})
json.dump(wj, open(os.path.join(wd, "walls.json"), "w"), indent=1); print("side faces: 6 strips, 6 ends")
