"""The meadow's wall feet: overlays that break a wall's straight bottom edge, where the lawn meets the rock.

Each foot is one cell wide (48 px) and 16 px tall, set with its bottom on the face's bottom edge. Grass rises 1-6 px over the
rock in blades and clumps (a dark side, the lawn's body tone and a lit tip on the tallest), with a dark root line under the clumps.
Pebbles (2-4 px, the rock ramp's mid tones with a dark rim) sit in a few. Four variants, seeded; each is 0 at its left and right
2 px, so any foot joins any other.
Writes tileset/walls/foot-<n>.png and adds them to walls.json.
usage: python3 -I build-wall-feet.py PALETTE_JSON WALLS_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
palj, wd = sys.argv[1:3]
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
near = lambda rgb: int(((PAL - np.array(rgb)) ** 2).sum(1).argmin())
BODY, TIP, SIDE, ROOT = near((0x6c, 0xa8, 0x38)), near((0xa6, 0xba, 0x44)), near((0x4f, 0x91, 0x3a)), near((0x24, 0x3e, 0x23))
PEB, PEBL, PEBD = near((120, 112, 130)), near((160, 152, 165)), near((50, 44, 60))
rng = np.random.RandomState(4848); W, Hh = 48, 16
wj = json.load(open(os.path.join(wd, "walls.json"))); wj["pieces"] = [p for p in wj["pieces"] if p.get("kind") != "foot"]
for n in range(1, 5):
    a = np.full((Hh, W), -1, int); x = 2
    while x < W - 2:
        w = rng.randint(3, 9); h = rng.randint(2, 7)                       # a clump: w px wide, h px tall at its middle
        for i in range(w):
            if x + i >= W - 2: break
            t = int(round(h * (1 - abs(i - (w - 1) / 2) / (w / 2 + .5)))) + rng.randint(0, 2)
            for k in range(t): a[Hh - 1 - k, x + i] = TIP if k == t - 1 and t >= 4 else (SIDE if i == w - 1 else BODY)
            if t: a[Hh - 1, x + i] = ROOT if rng.rand() < .4 else a[Hh - 1, x + i]
        x += w + rng.randint(0, 4)
    for _ in range(rng.randint(0, 3)):                                     # pebbles
        px, s = rng.randint(4, W - 8), rng.randint(2, 5)
        for yy in range(s):
            for xx in range(s + 1):
                a[Hh - 1 - yy, px + xx] = PEBD if yy in (0, s - 1) or xx in (0, s) else (PEBL if yy == s - 2 and xx == 1 else PEB)
    a[:, :2] = -1; a[:, -2:] = -1
    rgba = np.zeros((Hh, W, 4), np.uint8); m = a >= 0; rgba[m, :3] = PAL[a[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(wd, f"foot-{n}.png"))
    wj["pieces"].append({"name": f"meadow/foot/foot-{n}", "file": f"foot-{n}.png", "kind": "foot", "cells": [1, 0], "px": [W, Hh], "variant": n})
json.dump(wj, open(os.path.join(wd, "walls.json"), "w"), indent=1); print("4 feet")
