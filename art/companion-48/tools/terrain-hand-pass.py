"""The hand pass on a mockup screen, on the extended palette: the painting is the base, the pixel pass keeps only what it did
better, and grass, water and shore get drawn detail.

  base     the approved painting on the 77 (the re-quantise): its roots, posts, lawn and shoreline as painted
  rock     where both the pass and the painting are rock, the pass's pixel (its shading, borders and lit edges)
  wood     where both are wood or earth inside the bridge's box, the pass's planks
  restore  named boxes where the painting stays whatever the pass did (a broken post, say)
  grass    tuft clusters on whole grass (every pixel within 3 px is grass): three to six blades, each a dark outline, a body one
           step under the ground it stands on and a tip two steps over it; seeded on a 13 px jittered grid, no tile period
  water    a bank shadow (two steps darker) on the 1-3 px of water under every bank; ripple highlights (a 3-6 px dash two
           steps lighter with one brighter pixel) on open water 7 px or more from any bank, seeded on a 19 px grid
  shore    on sand and grass within 4 px of the water: a light wet line at the water, a mid sand band, a dark edge where it meets
           the grass; never on rock, wood or the bridge
usage: python3 -I terrain-hand-pass.py PASS.png PAINTING_EXT.png PALETTE_JSON OUT.png --bridge x0,y0,x1,y1 [--restore x0,y0,x1,y1 ...]"""
import json, sys
import numpy as np
from PIL import Image
args = sys.argv[1:]
pas, pnt, palj, out = args[:4]
def opt_boxes(k): return [tuple(map(int, args[i + 1].split(","))) for i, a in enumerate(args) if a == k]
bridge = opt_boxes("--bridge"); restore = opt_boxes("--restore")
cols = json.load(open(palj))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
RAMP = {"G": "grass", "grass": "grass", "N": "rock", "K": "rock", "rock": "rock", "B": "water", "water": "water", "W": "earth", "earth": "earth"}
ramp_of = np.array([RAMP.get(c["ramp"], "other") for c in cols])
lum = 0.2126 * PAL[:, 0] + 0.7152 * PAL[:, 1] + 0.0722 * PAL[:, 2]
ORDER = {m: sorted(np.where(ramp_of == m)[0], key=lambda i: lum[i]) for m in ("grass", "rock", "water", "earth")}
def step(i, k):
    m = ramp_of[i]
    if m not in ORDER: return i
    o = ORDER[m]; j = o.index(i); return o[max(0, min(len(o) - 1, j + k))]
STEP = np.vectorize(step)
def to_idx(p):
    a = np.asarray(Image.open(p).convert("RGB")).astype(int)
    return (((a.reshape(-1, 1, 3) - PAL[None]) ** 2).sum(-1)).argmin(1).reshape(a.shape[:2])
A, B = to_idx(pas), to_idx(pnt); H, W = B.shape
rA, rB = ramp_of[A], ramp_of[B]
img = B.copy()
img = np.where((rA == "rock") & (rB == "rock"), A, img)                                   # the pass's rock
inbr = np.zeros((H, W), bool)
for x0, y0, x1, y1 in bridge: inbr[y0:y1, x0:x1] = True
img = np.where(inbr & (rA == "earth") & (rB == "earth"), A, img)                          # the pass's planks
for x0, y0, x1, y1 in restore: img[y0:y1, x0:x1] = B[y0:y1, x0:x1]
R = ramp_of[img]

def grow(m, n):
    m = m.copy()
    for _ in range(n):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; m = g
    return m
def dist(m, n):
    """distance (4-connected, up to n) from the mask m; n+1 beyond"""
    d = np.full(m.shape, n + 1); cur = m.copy(); d[cur] = 0
    for k in range(1, n + 1):
        nxt = grow(cur, 1); d[nxt & ~cur] = k; cur = nxt
    return d
water = R == "water"
dw = dist(water, 8)          # land pixels' distance from the water
dl = dist(~water, 8)         # water pixels' distance from the land
# the water: a bank shadow under every bank
bank = water & (dl <= 3) & ~inbr
img[bank] = STEP(STEP(img[bank], -1), -1) if bank.any() else img[bank]
# the shore: wet line, sand, dark edge, on sand or grass only
shoreable = ~water & np.isin(R, ["earth", "grass"]) & ~grow(inbr, 2)
sand = [i for i in ORDER["earth"] if lum[i] > 150]; sand_mid, sand_hi = sand[len(sand) // 3], sand[-1]
edge = ORDER["earth"][1]
img[shoreable & (dw == 1)] = sand_hi
img[shoreable & ((dw == 2) | (dw == 3))] = sand_mid
img[shoreable & (dw == 4)] = edge
R = ramp_of[img]
# ripple highlights on open water
rng = np.random.RandomState(1907)
for gy in range(0, H, 19):
    for gx in range(0, W, 19):
        if rng.rand() > .55: continue
        y, x, ln = gy + rng.randint(19), gx + rng.randint(19), rng.randint(3, 7)
        if y >= H or x + ln >= W or not (water[y, x:x + ln].all() and (dl[y, x:x + ln] >= 7).all()) or inbr[y, x:x + ln].any(): continue
        for k in range(ln): img[y, x + k] = step(step(img[y, x + k], 1), 1)
        img[y, x + ln // 2] = step(img[y, x + ln // 2], 2)
# tuft clusters on whole grass
whole = R == "grass"
for _ in range(3): whole = whole & np.roll(whole, 1, 0) & np.roll(whole, -1, 0) & np.roll(whole, 1, 1) & np.roll(whole, -1, 1)
for gy in range(0, H, 13):
    for gx in range(0, W, 13):
        if rng.rand() > .6: continue
        cy, cx = gy + rng.randint(13), gx + rng.randint(13)
        if cy + 1 >= H or cx + 4 >= W or cy < 6 or not whole[cy, cx]: continue
        base = img[cy, cx]
        for b in range(rng.randint(3, 7)):
            x = cx + rng.randint(-3, 4); h = rng.randint(2, 5); lean = rng.choice([-1, 0, 0, 1])
            if not (0 < x < W - 1) or not whole[cy, x]: continue
            for k in range(h):
                y = cy - k; xx = x + (lean if k == h - 1 else 0)
                if not (0 <= xx < W) or not whole[y, xx]: break
                img[y, xx] = step(base, 2) if k == h - 1 else step(base, -1)              # the lit tip over the body
                if xx + 1 < W and whole[y, xx + 1] and k < h - 1: img[y, xx + 1] = step(base, -3)   # the dark outline on the shaded side
            img[cy + 1, x] = step(base, -3)                                                # the root's shadow
Image.fromarray(PAL[img].astype(np.uint8)).save(out); print(out, "colours", len(np.unique(img)))
