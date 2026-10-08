"""Huts Ch and Dh, hand-pixelled (the earlier C and D): two small round shelters, planted on the ground (a patch of grass, a base course that meets it, a
shadow to the right), each in three states (lit, dark, dark2), drawn from the painted hut sheet's designs (C48-H-r6-a1: bottom left and
bottom right) as masks and pixel sets with the rim-rule shading of the pawn; the roof is a low cone of three thatch bands, no cap, no knob;
the charm is in the walls (a door with a step, a window, a lantern, a bundle). dark2 is dark one DARK step down.
usage: python3 -I hut-draw.py OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import quant
P = quant.P; C = P.index
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
N = 64; CXH = 32; GYH = 59
RAMPS = {"roof": ("paper", "sand", "clay", "bark"), "plank": ("clay", "bark", "bark", "soil"), "stone": ("rockL", "rock", "stone", "slate"), "plaster": ("paper", "sand", "sand", "clay"),
         "grass": ("sprout", "grass", "leaf", "forest"), "door": ("clay", "bark", "soil", "ink"), "hay": ("cream", "paper", "sand", "clay")}
def mask(fn):
    im = Image.new("L", (N, N), 0); d = ImageDraw.Draw(im); fn(d); return np.asarray(im) > 0
def rect(x0, y0, x1, y1): return mask(lambda d: d.rectangle([x0, y0, x1, y1], fill=255))
def ell(x0, y0, x1, y1): return mask(lambda d: d.ellipse([x0, y0, x1, y1], fill=255))
def poly(pts): return mask(lambda d: d.polygon(pts, fill=255))
def sh(m, dx, dy):
    o = np.zeros_like(m); ys, xs = np.where(m); ys2, xs2 = ys + dy, xs + dx; ok = (ys2 >= 0) & (ys2 < N) & (xs2 >= 0) & (xs2 < N); o[ys2[ok], xs2[ok]] = True; return o
class Cv:
    def __init__(self): self.idx = np.full((N, N), -1, dtype=np.int64)
    def part(self, m, ramp, flat=False, wide=1):
        lit, base, shade, deep = (C[n] for n in RAMPS[ramp]); self.idx[m] = base
        if flat: return
        top = m & ~sh(m, 0, 1); left = m & ~sh(m, 1, 0); bot = m & ~sh(m, 0, -1); right = m & ~sh(m, -1, 0)
        for k in range(2, wide + 1): right = right | (m & ~sh(m, -k, 0))
        self.idx[(top | left) & ~(bot | right)] = lit; self.idx[(bot | right) & ~(top | left)] = shade; self.idx[bot & right] = deep
    def put(self, pts, col, over=True):
        for x, y in pts:
            if 0 <= x < N and 0 <= y < N and (over or self.idx[y, x] >= 0): self.idx[y, x] = C[col]
    def fill(self, m, col): self.idx[m] = C[col]
def roof(cv, rx=24, apex=17, eave=36, bands=(24, 30)):
    cone = poly([(CXH - rx, eave), (CXH, apex), (CXH + rx, eave)]) | ell(CXH - rx, eave - 6, CXH + rx, eave + 6) & rect(0, eave, N, N)
    cone = cone | (ell(CXH - rx, eave - 6, CXH + rx, eave + 6) & ~rect(0, 0, N, eave - 1))
    cv.part(cone, "roof", wide=3)
    ys, xs = np.where(cone)
    for k, yb in enumerate(bands):   # two dark lines bowed with the cone (three bands), a ragged fringe along the eaves
        for x in range(CXH - rx, CXH + rx + 1):
            dx = (x - CXH) / rx; y = int(round(yb + 5 * (1 - dx * dx) * (0.5 + 0.5 * k)))
            if 0 <= y < N and cone[y, x] and abs(dx) < 1 - 0.02 * (1 + k): cv.put([(x, y)], "bark")
    for x in range(CXH - rx + 1, CXH + rx):
        dx = (x - CXH) / rx; y = int(round(eave + 5.5 * np.sqrt(max(0, 1 - dx * dx))))
        for yy in range(y - 1, y + 1):
            if cone[yy, x] if yy < N else False: cv.put([(x, yy)], "bark" if (x % 3) else "soil")
        if x % 2 == 0 and y + 1 < N and cv.idx[y + 1, x] < 0: cv.put([(x, y + 1)], "bark")
def ground(cv):
    # the patch of grass the hut stands on, and the shadow it casts to the right
    cv.part(ell(CXH - 28, GYH - 6, CXH + 28, GYH + 2), "grass", flat=True)
    cv.fill(ell(CXH - 28, GYH - 6, CXH + 28, GYH + 2) & ~sh(ell(CXH - 28, GYH - 6, CXH + 28, GYH + 2), 0, 1) & (np.mgrid[0:N, 0:N][1] > CXH), "leaf")
    cv.put([(CXH + 14 + i, GYH - 1 - (i % 2)) for i in range(0, 14, 1) if i % 3 != 2], "leaf")                        # the shadow side of the patch, darker
def line(a, b):
    (x0, y0), (x1, y1) = a, b; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
def sheaf(cv, x0, yb):
    # a sheaf of hay bound with a cord: a bulging bundle of sand stalks, a paper edge on the left, a clay one on the right, a dark rim
    m = poly([(x0, yb), (x0 + 7, yb), (x0 + 8, yb - 6), (x0 + 6, yb - 12), (x0 + 1, yb - 12), (x0 - 1, yb - 6)]); cv.part(m, "hay", wide=2)
    ys, xs = np.where(m & ~sh(m, 1, 0) | m & ~sh(m, -1, 0) | m & ~sh(m, 0, 1) | m & ~sh(m, 0, -1)); cv.put(list(zip(xs, ys)), "bark")
    cv.put([(x0 - 1 + i, yb - 6) for i in range(10)], "soil"); cv.put([(x0 + 1 + i, yb - 5) for i in range(6)], "bark")
    cv.put([(x0 + 2, yb - 9), (x0 + 4, yb - 8), (x0 + 3, yb - 3), (x0 + 5, yb - 2)], "clay")
def sticks(cv, x0, yb):
    # a bundle of sticks leaning on the wall: four straight sticks with a lit edge, tied with a cord
    for k in range(4):
        for (x, y) in line((x0 + k * 2, yb), (x0 + 4 + k, yb - 15)): cv.put([(x, y)], "bark" if k % 2 else "soil"); cv.put([(x - 1, y)], "clay") if k == 0 else None
    cv.put([(x0 + 2 + i, yb - 6) for i in range(8)], "paper"); cv.put([(x0 + 2 + i, yb - 5) for i in range(8)], "sand")
def tufts(cv, xs, y=GYH - 5):
    for x in xs: cv.put([(x, y), (x, y - 1), (x + 1, y), (x - 1, y - 1)], "sprout"); cv.put([(x + 1, y + 1)], "forest")
def lamp(cv, x, y, lit):
    cv.put([(x, y - 2), (x, y - 1)], "soil"); cv.put([(x - 1, y), (x, y), (x + 1, y), (x - 1, y + 1), (x + 1, y + 1), (x - 1, y + 2), (x, y + 2), (x + 1, y + 2)], "ink")
    cv.put([(x, y + 1)], "yellow" if lit else "bark")
    if lit: cv.put([(x, y + 1)], "cream"); cv.put([(x - 2, y + 1), (x + 2, y + 1)], "amber")
def window(cv, x, y, w, h, lit, shutters):
    cv.put([(xx, yy) for xx in range(x - 1, x + w + 1) for yy in range(y - 1, y + h + 1)], "soil")
    cv.put([(xx, yy) for xx in range(x, x + w) for yy in range(y, y + h)], "yellow" if lit else "night")
    if lit: cv.put([(x, y), (x + 1, y)], "cream"); cv.put([(xx, y + h - 1) for xx in range(x, x + w)], "amber")
    cv.put([(x + w // 2, yy) for yy in range(y, y + h)], "soil"); cv.put([(xx, y + h // 2) for xx in range(x, x + w)], "soil")
    if shutters:
        for sx in (x - 4, x + w + 2): cv.put([(sx + i, yy) for i in range(2) for yy in range(y - 1, y + h + 1)], "bark")
def finish(cv, state):
    o = cv.idx.copy()
    if state == "dark2": o = np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in o])
    return o
def hut(kind, state):
    cv = Cv(); lit = state == "lit"; ground(cv)
    late = []
    if kind == "C":   # stone base, plank upper wall, shuttered window, a sheaf of hay
        wall = rect(CXH - 17, 34, CXH + 17, 53) | ell(CXH - 17, 49, CXH + 17, 59) & rect(0, 49, N, N)
        cv.part(wall, "plank", wide=3)
        for x in range(CXH - 17 + 4, CXH + 17, 4): cv.put([(x, yy) for yy in range(36, 52) if wall[yy, x]], "soil")
        base = wall & (np.mgrid[0:N, 0:N][0] >= 52); cv.part(base, "stone", wide=2)
        for y in range(53, 60):
            for x in range(CXH - 17, CXH + 18):
                if base[y, x] and ((x + (3 if (y // 2) % 2 else 0)) % 6 == 0 or y % 3 == 0 and y > 51): cv.put([(x, y)], "slate")
        roof(cv, rx=24, apex=18, eave=34, bands=(24, 29))
        window(cv, 19, 42, 5, 6, lit, shutters=True)
        cv.part(rect(35, 41, 41, 56), "door", wide=2); cv.put([(35 + i, 41) for i in range(7)], "soil"); cv.put([(36 + i, 48) for i in range(5)], "soil"); cv.put([(40, 49)], "gold")
        cv.part(rect(33, 56, 43, 58), "stone", wide=1)                                           # the step
        lamp(cv, 46, 42, lit)
        late = [(sheaf, (48, 57))]
        tufts(cv, [12, 17, 51, 54, 29])
    else:             # D: vertical-plank walls to the ground, a cross-braced door, a lantern on a post, a bundle of sticks
        wall = rect(CXH - 17, 34, CXH + 17, 54) | ell(CXH - 17, 50, CXH + 17, 60) & rect(0, 50, N, N)
        cv.part(wall, "plank", wide=3)
        for x in range(CXH - 17 + 3, CXH + 17, 3): cv.put([(x, yy) for yy in range(36, 59) if wall[yy, x]], "soil")
        cv.part(wall & (np.mgrid[0:N, 0:N][0] >= 56), "stone", wide=1)                        # a low course of stones where the planks meet the grass
        roof(cv, rx=25, apex=17, eave=34, bands=(23, 29))
        window(cv, 18, 42, 5, 6, lit, shutters=False); cv.part(rect(16, 49, 25, 50), "plank", flat=True)    # a sill
        cv.part(rect(34, 42, 41, 57), "door", wide=2)
        for i in range(8): cv.put([(34 + i, 43 + i * 13 // 8)], "soil"); cv.put([(41 - i, 43 + i * 13 // 8)], "soil")   # the cross brace
        cv.part(rect(32, 57, 43, 59), "plank", wide=1)                                           # the step plank
        cv.part(rect(46, 39, 47, 58), "plank", flat=True); lamp(cv, 47, 42, lit)                  # the post and its lantern
        late = [(sticks, (6, 58))]
        tufts(cv, [9, 53, 57, 26, 44])
    cv.idx = quant.outline(cv.idx)   # the outline rule also rims the patch, which reads as its edge
    for fn, args in late: fn(cv, *args)   # the small props are drawn over the outline, with their own rims
    return finish(cv, state)
for kind in ("C", "D"):
    for state in ("lit", "dark", "dark2"):
        idx = hut(kind, state); bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb
        quant.save_indexed(idx[y0:y1, x0:x1], os.path.join(out, f"hut-{kind}h-{state}.png"))   # Ch and Dh: the hand-pixelled ones
print("huts Ch and Dh, 3 states")
