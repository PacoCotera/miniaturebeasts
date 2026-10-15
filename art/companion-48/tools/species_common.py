"""Shared helpers for the C0 species token scripts (species-s0N-clean.py): the core 48 palette, loading and saving 8-bit RGBA PNGs on it, putting a pixel by the one-letter codes, shifts,
column insertion (a stretch), the water drops of the shake pose, and the lighting rule (the run of steps to the top-left or bottom-right edge)."""
import json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PAL = json.load(open(os.path.join(HERE, "..", "palette", "palette.json")))["colours"]
NAME = [c["name"] for c in PAL]; RGB = np.array([c["rgb"] for c in PAL]); IDX = {n: i for i, n in enumerate(NAME)}
CODE = {'I': 'ink', 'N': 'night', 'S': 'slate', 'T': 'stone', 'P': 'paper', 'B': 'bone', 'D': 'sand', 'C': 'clay', 'A': 'amber', 'O': 'orange', 'V': 'void', 'W': 'white', 'i': 'ice', 'p': 'plumD',
        's': 'soil', 'b': 'bark', 'd': 'tealD', 't': 'teal', 'q': 'aqua', 'm': 'mint', 'G': 'gold', 'Y': 'yellow', 'c': 'cream', 'e': 'pine', 'f': 'forest', 'l': 'leaf', 'g': 'grass'}
H = W = 32
def nm(n): return IDX[n]
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
def ring_of(a):
    bg = a < 0; r = np.zeros_like(bg)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy: r |= np.roll(np.roll(bg, dy, 0), dx, 1)
    return r & ~bg
def runs(M, y, x, dy, dx):
    n = 0
    while 0 <= y < M.shape[0] and 0 <= x < M.shape[1] and M[y, x]: y += dy; x += dx; n += 1
    return n
def tl(M, y, x): return min(runs(M, y, x, -1, 0), runs(M, y, x, 0, -1), runs(M, y, x, -1, -1))
def br(M, y, x): return min(runs(M, y, x, 1, 0), runs(M, y, x, 0, 1), runs(M, y, x, 1, 1))
def insert_cols(a, at, n):
    o = np.full((a.shape[0], a.shape[1] + n), -1); o[:, :at] = a[:, :at]; o[:, at + n:] = a[:, at:]
    for k in range(n): o[:, at + k] = a[:, at]
    return o
def shifted(a, dx, dy):
    o = np.full_like(a, -1)
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x] >= 0 and 0 <= y + dy < a.shape[0] and 0 <= x + dx < a.shape[1]: o[y + dy, x + dx] = a[y, x]
    return o
def drops(a, k):
    for x, y in ([(3, 18), (29, 18), (7, 9), (24, 9), (1, 26)] if k == 0 else [(2, 14), (28, 13), (4, 25), (27, 24), (15, 6)]):
        put(a, x, y, 'W'); put(a, x, y + 1, 'i')                    # a drop: 1 x 2 ice with a white top pixel
