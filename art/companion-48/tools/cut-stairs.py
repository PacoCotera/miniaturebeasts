"""The meadow's stair pieces, cut from b1's own lower stair and the trodden earth around it, under the phase 1 spec's names
(internal plans/terrain/phase-1-levels-and-ramps.md §6.1; one-level steps only in phase 1).

  wide2x1-<n>      the south-facing stair, 2 x 2 cells (96 px): it replaces the face's two rows. Rebuilt step by step from b1's
                   stair (11 steps on a 12-13 px pitch, each a dark riser and a lit tread): b1's top tread, then 7 of its steps,
                   then its dark base line, at b1's own pitch (b1's face is ~135 px tall; one level here is 96, so it carries 7 of
                   b1's 11 steps). Its stone stringers are b1's, the treads trimmed to fit 96 px across.
  landing-<l|r>    the trodden earth on the upper ground at the stair's head (one cell each, left and right halves), from b1
  foot-<l|r>       the trodden earth on the lower ground at its foot, from b1
  top2x1           the north-facing stair top, 2 x 1 cells, cut into the rim: four treads seen from above, going down away from
                   the camera, a step darker each, no risers (they face away), between the same stringers
  apron-top-<l|r>  the earth inside a north-facing stair top (the landing, turned)
  side2x2-e, -w    the side stairs, 2 x 2 cells: the south stair turned so its head meets the higher side (west for an
                   east-facing drop), mirrored for the other
Every piece is snapped to the meadow palette. Earth pieces keep only b1's earth and wood pixels (the lawn shows through).
Writes tileset/stairs/<name>.png and stairs.json.
usage: python3 -I cut-stairs.py B1_DIR OUT_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
b1d, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
cols = json.load(open(os.path.join(b1d, "biome-meadow.json")))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
mat = np.array([c.get("material", "core") for c in cols]); lum = PAL @ [.2126, .7152, .0722]
a = np.asarray(Image.open(os.path.join(b1d, "scene-1x.png")).convert("RGB")).astype(int)
B1 = ((a.reshape(-1, 1, 3) - PAL[None]) ** 2).sum(-1).argmin(1).reshape(a.shape[:2])
atlas = []
def save(p, name, kind, cells, **kw):
    rgba = np.zeros(p.shape + (4,), np.uint8); m = p >= 0; rgba[m, :3] = PAL[p[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, name + ".png"))
    atlas.append({"name": f"meadow/stair/{name}", "file": name + ".png", "kind": kind, "cells": cells, **kw})
X0, X1, SL = 258, 371, 13                       # b1's stair: its columns, and its stringers' width
RISERS = [505, 518, 532, 544, 558, 570, 582, 595, 608, 619, 633]   # the first row of each dark riser (measured)
def cols96(rows):
    """b1's stair rows trimmed to 96 px: both stringers whole, the treads' middle kept"""
    mid = 96 - 2 * SL; c0 = X0 + SL + ((X1 - X0 - 2 * SL) - mid) // 2
    return np.hstack([rows[:, X0:X0 + SL], rows[:, c0:c0 + mid], rows[:, X1 - SL:X1]])
def wide(pick):
    parts = [B1[489:499]]                                               # the top tread
    for k in pick: parts.append(B1[RISERS[k]:RISERS[k] + 12])           # a riser and its tread, at b1's pitch
    parts.append(B1[633:635]); st = cols96(np.vstack(parts)); return st[:96]
for n, pick in enumerate(([0, 2, 3, 5, 6, 8, 9], [1, 2, 4, 5, 7, 8, 9]), 1):
    save(wide(pick), f"wide2x1-{n}", "stair", [2, 2], facing="S", variant=n)
def earth(y0, y1):
    p = cols96(B1[y0:y1]) if y1 - y0 else None
    p = np.where(np.isin(mat[p], ["earth", "wood"]), p, -1); return p
land = earth(445, 489); land = np.vstack([np.full((48 - land.shape[0], 96), -1), land])
save(land[:, :48], "landing-l", "landing", [1, 1]); save(land[:, 48:], "landing-r", "landing", [1, 1])
foot = earth(637, 685)[:48]; save(foot[:, :48], "foot-l", "foot", [1, 1]); save(foot[:, 48:], "foot-r", "foot", [1, 1])
# the north stair top: b1's treads only, four of them, each a step darker going away (north), with a 1 px dark gap between
ORDER = sorted([i for i in range(len(PAL)) if mat[i] == "rock"], key=lambda i: lum[i])   # the rock ramp only
def darker(p, k):
    q = p.copy()
    for _ in range(k): q = np.array([ORDER[max(0, ORDER.index(i) - 1)] if i in ORDER else i for i in q.ravel()]).reshape(q.shape)
    return q
treads = [cols96(B1[RISERS[k] + 6:RISERS[k] + 12]) for k in (2, 4, 6, 8)]
top = [cols96(B1[489:493])]
for k, t in enumerate(treads):
    gap = cols96(B1[RISERS[0] + 4:RISERS[0] + 5]); top += [darker(gap, k + 1), darker(np.vstack([t, t[2:5]]), k)]
top = np.vstack(top)[:48]; top = np.vstack([top, np.repeat(top[-1:], 48 - top.shape[0], 0)]) if top.shape[0] < 48 else top
save(top, "top2x1", "stair", [2, 1], facing="N")
ap = np.flipud(land); save(ap[:, :48], "apron-top-l", "apron-top", [1, 1]); save(ap[:, 48:], "apron-top-r", "apron-top", [1, 1])
w1 = wide([0, 2, 3, 5, 6, 8, 9])
save(np.rot90(w1, 1), "side2x2-e", "stair", [2, 2], facing="E")      # head (north) turned to the west: the higher side of an east-facing drop
save(np.fliplr(np.rot90(w1, 1)), "side2x2-w", "stair", [2, 2], facing="W")
json.dump({"biome": "meadow", "tile": 48, "source": "b1 scene (lower stair, x 258-371, y 445-685)", "pieces": atlas}, open(os.path.join(out, "stairs.json"), "w"), indent=1)
print(len(atlas), "stair pieces")
