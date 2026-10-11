"""The meadow's water pieces, on the accepted two-tone pond (owner 20:05; programme lead 20:10).

Water cells carry the whole bank, so the lawn cells beside them stay plain lawn. A water cell is drawn from four 24 px quarters in
five states each (fill, edgeh, edgev, outer, inner: the same 47-blob scheme as the plateau lips), on the same geometry: on every
side that meets land the water's edge sits INSET px inside the cell, outer corners are cut on R_OUT, inner corners on R_IN, and the
straight runs waver by a 24-periodic offset that is 0 at the quarter's ends. Then by distance from that edge:
  land side (the inset margin)   a 10 px sand beach, its outermost 2 px a dark edge where it meets the lawn
  water side                     a 2-3 px wet edge with foam flecks (7 px in 23), no drawn border, a shallow band to 9 px, then the body
Two frames: frame 2 moves the foam along the edge (the foam animates; nothing else does).
Macro outer corners (2 x 2 cells, radius 60 or 42) round a pond's lobes as b1's do; their straight ends join the edge quarters.
Lobe pieces (2 cells along a straight shore) curve the bank out or in by 10 px on a half sine, so a pond's sides are free curves.
Writes water/lobe-<n|s|w|e>-<out|in>-f<n>.png, water/q-<quad>-<state>-f<n>.png, water/macro-<quad>-outer-r<radius>-f<n>.png, water/fill-body.png and water.json.
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
WAVE = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]   # one low 1 px swell per quarter: mirrored quarters can't zigzag

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
                q[y, x] = -1 if d > 12 else (EDGE if d >= 11 else (SAND if d >= 3 else SAND2))   # a 10 px beach, then the lawn shows
            else:
                d = int(np.sqrt(((lp - [gv, gu]) ** 2).sum(1).min()))
                if d <= 2: q[y, x] = FOAM if (gu + gv + 4 * frame) % 23 < 7 and d <= 1 else WET   # a 2 px foam line, broken every 23 px, moving in frame 2
                elif d == 3: q[y, x] = WET
                elif d <= 9: q[y, x] = SHAL
                else: q[y, x] = BODY
    return q

RMS = (60, 42)                                                     # the macro corners' radii: b1's lobes turn on about 40-70 px
def macro(quad, frame, RM):
    """a 2 x 2 cell outer corner (96 px), on the same bank and bands as the quarters, so its straight ends join edge quarters"""
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw")
    U, V = np.meshgrid(np.arange(-16, 112), np.arange(-16, 112)); w = np.array(WAVE)
    cx = cy = INSET + RM
    land = (V < INSET + w[np.mod(U, 24)]) | (U < INSET + w[np.mod(V, 24)]) | ((U < cx) & (V < cy) & ((U - cx) ** 2 + (V - cy) ** 2 > RM ** 2))
    lp = np.argwhere(land); wp = np.argwhere(~land); q = np.full((96, 96), BODY, int)
    for y in range(96):
        for x in range(96):
            u = x if west else 95 - x; v = y if north else 95 - y; gu, gv = u + 16, v + 16
            if land[gv, gu]:
                d = int(np.sqrt(((wp - [gv, gu]) ** 2).sum(1).min()))
                q[y, x] = -1 if d > 12 else (EDGE if d >= 11 else (SAND if d >= 3 else SAND2))
            else:
                d = int(np.sqrt(((lp - [gv, gu]) ** 2).sum(1).min()))
                if d > 10: continue
                if d <= 2: q[y, x] = FOAM if (gu + gv + 4 * frame) % 23 < 7 and d <= 1 else WET
                elif d == 3: q[y, x] = WET
                elif d <= 9: q[y, x] = SHAL
    return q

from scipy import ndimage as nd
def render(land, frame):
    """the bank and bands for any land mask with a 16 px margin round the piece (the quarters' rules, distances by transform)"""
    dw = nd.distance_transform_edt(land); dl = nd.distance_transform_edt(~land)    # land px: distance to water; water px: to land
    hh, ww = land.shape[0] - 32, land.shape[1] - 32; q = np.full((hh, ww), BODY, int)
    yy, xx = np.mgrid[16:16 + hh, 16:16 + ww]
    L = land[16:16 + hh, 16:16 + ww]; d1 = np.floor(dw[16:16 + hh, 16:16 + ww]).astype(int); d2 = np.floor(dl[16:16 + hh, 16:16 + ww]).astype(int)
    q[L] = np.where(d1[L] > 12, -1, np.where(d1[L] >= 11, EDGE, np.where(d1[L] >= 3, SAND, SAND2)))
    W_ = ~L; foam = W_ & (d2 <= 2); q[foam] = np.where(((xx[foam] + yy[foam] + 4 * frame) % 23 < 7) & (d2[foam] <= 1), FOAM, WET)
    q[W_ & (d2 == 3)] = WET; q[W_ & (d2 > 3) & (d2 <= 9)] = SHAL
    return q
AMP = 10                                                            # the lobe's bulge: 10 px at the middle of two cells, 0 at its ends
def edge_macro(side, sign, frame):
    """a straight shore two cells long (96 px) as one curve: the bank bulges out (sign +1) or bays in (-1) on a half sine"""
    U, V = np.meshgrid(np.arange(-16, 112), np.arange(-16, 64)); u = np.clip(U, 0, 96)
    land = V < INSET + sign * AMP * np.sin(np.pi * u / 96)       # the land to the north, normalised
    q = render(land, frame)                                       # 96 x 48, land north
    return {"n": q, "s": np.flipud(q), "w": q.T, "e": np.fliplr(q.T)}[side]

atlas = []
def save(a, name):
    rgba = np.zeros(a.shape + (4,), np.uint8); m = a >= 0; rgba[m, :3] = PAL[a[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, name + ".png"))
for quad in ("nw", "ne", "se", "sw"):
    for st in ("fill", "edgeh", "edgev", "outer", "inner"):
        for f in (1, 2):
            save(quarter(quad, st, f - 1), f"q-{quad}-{st}-f{f}")
            atlas.append({"name": f"meadow/shore/water-{quad}-{st}-f{f}", "file": f"q-{quad}-{st}-f{f}.png", "kind": "shore", "quad": quad, "state": st, "frame": f})
for f_ in os.listdir(out):
    if f_.startswith("macro-"): os.remove(os.path.join(out, f_))
for quad in ("nw", "ne", "se", "sw"):
    for rm in RMS:
        for f in (1, 2):
            nm = f"macro-{quad}-outer-r{rm}-f{f}"; save(macro(quad, f - 1, rm), nm)
            atlas.append({"name": f"meadow/shore/water-{nm}", "file": nm + ".png", "kind": "shore-macro", "cells": [2, 2], "quad": quad, "radius": rm, "frame": f})
for side in "nswe":
    for sign, tag in ((1, "out"), (-1, "in")):
        for f in (1, 2):
            nm = f"lobe-{side}-{tag}-f{f}"; save(edge_macro(side, sign, f - 1), nm)
            atlas.append({"name": f"meadow/shore/water-{nm}", "file": nm + ".png", "kind": "shore-lobe", "cells": [2, 1] if side in "ns" else [1, 2], "side": side, "bulge": tag, "frame": f})
save(np.full((48, 48), BODY, int), "fill-body"); atlas.append({"name": "meadow/band/fill-body", "file": "fill-body.png", "kind": "band", "cells": [1, 1]})
json.dump({"biome": "meadow", "tile": 48, "quarter": 24, "tones": {"body": cols[BODY]["hex"], "shallow": cols[SHAL]["hex"]}, "pieces": atlas},
          open(os.path.join(out, "water.json"), "w"), indent=1)
print(len(atlas), "water pieces")
