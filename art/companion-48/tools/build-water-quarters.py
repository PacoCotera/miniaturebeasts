"""The meadow's water pieces, on the accepted two-tone pond (owner 20:05; programme lead 20:10).

Water cells carry the whole bank, so the lawn cells beside them stay plain lawn. A water cell is drawn from four 24 px quarters in
five states each (fill, edgeh, edgev, outer, inner: the same 47-blob scheme as the plateau lips), on the same geometry: on every
side that meets land the water's edge sits INSET px inside the cell, outer corners are cut on R_OUT, inner corners on R_IN, and the
straight runs waver by a 24-periodic offset that is 0 at the quarter's ends. Then by distance from that edge:
  land side (the inset margin)   a sand bank, its outermost pixel a dark edge where it meets the lawn
  water side                     1 px foam, 1 px wet line, a shallow band to 7 px, then the body
Two frames: frame 2 moves the foam along the edge (the foam animates; nothing else does).
Writes water/q-<quad>-<state>-f<n>.png, water/fill-body.png and water.json.
usage: python3 -I build-water-quarters.py PALETTE_JSON OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
palj, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
near = lambda rgb: int(((PAL - np.array(rgb)) ** 2).sum(1).argmin())
BODY, SHAL, FOAM, WET = near((29, 104, 136)), near((34, 121, 147)), near((255, 255, 255)), near((219, 238, 229))
SAND, SAND2, EDGE = near((196, 170, 110)), near((166, 140, 90)), near((60, 48, 36))
INSET, R_OUT, R_IN = 18, 26, 18
WAVE = [0, 1, 2, 2, 1, -1, -2, -2, 0, 2, 3, 2, 0, -2, -3, -1, 1, 3, 2, 0, -2, -2, -1, 0]

def land_mask(state):
    """normalised quarter (corner of the cell at u=v=0, extended -16..39): True where it is land (the bank's side)"""
    U, V = np.meshgrid(np.arange(-16, 40), np.arange(-16, 40)); w = np.array(WAVE)
    hl = V < INSET + w[np.mod(U, 24)]; vl = U < INSET + w[np.mod(V, 24)]
    if state == "fill": return np.zeros(U.shape, bool)
    if state == "edgeh": return hl
    if state == "edgev": return vl
    if state == "outer":
        cx, cy = INSET + R_OUT, INSET + R_OUT
        return hl | vl | ((U < cx) & (V < cy) & ((U - cx) ** 2 + (V - cy) ** 2 > R_OUT ** 2))
    if state == "inner":
        cx, cy = INSET - R_IN, INSET - R_IN
        m = (U < INSET) & (V < INSET) & ~((U > cx) & (V > cy) & ((U - cx) ** 2 + (V - cy) ** 2 > R_IN ** 2))
        return m | ((V < 0) & (U < INSET)) | ((U < 0) & (V < INSET))

def quarter(quad, state, frame):
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw")
    land = land_mask(state); q = np.full((24, 24), BODY, int)
    if state == "fill": return q
    lp = np.argwhere(land); wp = np.argwhere(~land)
    for y in range(24):
        for x in range(24):
            u = x if west else 23 - x; v = y if north else 23 - y; gu, gv = u + 16, v + 16
            if land[gv, gu]:
                d = int(np.sqrt(((wp - [gv, gu]) ** 2).sum(1).min()))     # distance to the water
                q[y, x] = -1 if d > 8 else (EDGE if d >= 7 else (SAND if d >= 3 else SAND2))   # a 6 px bank, then the lawn shows
            else:
                d = int(np.sqrt(((lp - [gv, gu]) ** 2).sum(1).min()))
                if d <= 1: q[y, x] = FOAM if ((x + y) // 3 + frame) % 5 else WET   # a continuous foam line with small breaks, moving in frame 2
                elif d == 2: q[y, x] = WET
                elif d <= 7: q[y, x] = SHAL
                else: q[y, x] = BODY
    return q

atlas = []
def save(a, name):
    rgba = np.zeros(a.shape + (4,), np.uint8); m = a >= 0; rgba[m, :3] = PAL[a[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, name + ".png"))
for quad in ("nw", "ne", "se", "sw"):
    for st in ("fill", "edgeh", "edgev", "outer", "inner"):
        for f in (1, 2):
            save(quarter(quad, st, f - 1), f"q-{quad}-{st}-f{f}")
            atlas.append({"name": f"meadow/shore/water-{quad}-{st}-f{f}", "file": f"q-{quad}-{st}-f{f}.png", "kind": "shore", "quad": quad, "state": st, "frame": f})
save(np.full((48, 48), BODY, int), "fill-body"); atlas.append({"name": "meadow/band/fill-body", "file": "fill-body.png", "kind": "band", "cells": [1, 1]})
json.dump({"biome": "meadow", "tile": 48, "quarter": 24, "tones": {"body": cols[BODY]["hex"], "shallow": cols[SHAL]["hex"]}, "pieces": atlas},
          open(os.path.join(out, "water.json"), "w"), indent=1)
print(len(atlas), "water pieces")
