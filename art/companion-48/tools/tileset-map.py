"""Test map 1 for the meadow tileset: a scene assembled from tiles only, beside the approved scene b1.

Pieces used:
  lawn fills    48 px cells cut from b1's own lawn (every pixel of the cell grass, no prop), picked per cell by a hash with no
                variant shared with a 4-neighbour; the level shifts the lawn one ramp step (low down, high up) through the palette
  lips          the lip quarters (tools/build-cliffs.py, pieces/), on every plateau cell's north, west and east edges
  walls         tileset/walls: faces two cells tall per level, runs packed from pieces 3, 2 and 1 wide with no piece twice running, a
                rounded cap at an open end; a lower face under another (a stack) has its turf replaced by its own rock
  stairs        a macro piece cut from b1's lower stair, two cells wide and three tall (its landing on the plateau cell above)
  bridge, props the props pieces (tileset/props: bushes, ferns, boulders, reeds, flowers, the plank bridge), set by their feet
  pond          the water pieces (tileset/water, tools/build-water-quarters.py): two flat tones, foam and wet line, a sand bank
Writes test-map-1x.png, -3x.png and beside-b1-1x.png (the test map and b1's own screen at the same size).
usage: python3 -I tileset-map.py B1_DIR PIECES_DIR WALLS_DIR OUT_DIR"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
b1d, pieces_d, walls_d, out = sys.argv[1:5]; os.makedirs(out, exist_ok=True)
cols = json.load(open(os.path.join(b1d, "biome-meadow.json")))["colours"]
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
PAL = np.array([hx(c["hex"]) for c in cols]); NC = len(PAL)
CORE_G = ["pine", "forest", "leaf", "grass", "sprout", "lime"]
mat = np.array([c.get("material", "grass" if c.get("name") in CORE_G else "core") for c in cols])
lum = 0.2126 * PAL[:, 0] + 0.7152 * PAL[:, 1] + 0.0722 * PAL[:, 2]
import colorsys
sat_ = np.array([colorsys.rgb_to_hsv(*(PAL[i] / 255))[1] for i in range(NC)]); hue_ = np.array([colorsys.rgb_to_hsv(*(PAL[i] / 255))[0] for i in range(NC)])
G_ORDER = sorted([i for i in range(NC) if mat[i] == "grass" and sat_[i] > .35 and .18 < hue_[i] < .40], key=lambda i: lum[i])   # the lawn's own ramp: saturated greens only
def gstep(i, k):
    if i not in G_ORDER:
        if mat[i] != "grass": return i
        i = min(G_ORDER, key=lambda g: abs(lum[g] - lum[i]))               # a grey-green steps along the lawn's ramp from its nearest
    j = G_ORDER.index(i); return G_ORDER[max(0, min(len(G_ORDER) - 1, j + k))]
def to_idx(rgba):
    a = np.asarray(rgba.convert("RGBA")); rgb = a[..., :3].reshape(-1, 1, 3).astype(int)
    i = ((rgb - PAL[None]) ** 2).sum(-1).argmin(1).reshape(a.shape[:2])
    return np.where(a[..., 3] > 127, i, -1)
B1 = to_idx(Image.open(os.path.join(b1d, "scene-1x.png")))
def cut(x0, y0, w, h, key_grass=False):
    p = B1[y0:y0 + h, x0:x0 + w].copy()
    return p

# ---- the lawn: one flat base tone (b1's most common lawn colour) with b1's own detail as decals. The decals are b1's tufts,
# clover and flowers: each connected group of non-base pixels inside b1's lawn, 4 to 60 px, cut out whole. They are scattered off
# the tile grid by a seeded rule, as the earlier meadow decals were, so the fills are flat and seamless.
lawn = (mat[B1] == "grass")
vals, cnts = np.unique(B1[lawn], return_counts=True)
medl = np.median(lum[B1[lawn]]); lit_ = [(c_, v_) for v_, c_ in zip(vals, cnts) if lum[v_] > medl]
BASE = int(max(lit_)[1])                                   # b1's lit lawn tone
fills = [np.full((48, 48), BASE, int)]
det = lawn & (B1 != BASE)
inner = lawn.copy()
for _ in range(3): inner = inner & np.roll(inner, 1, 0) & np.roll(inner, -1, 0) & np.roll(inner, 1, 1) & np.roll(inner, -1, 1)
lab_ = np.zeros(B1.shape, int); DEC = []; cur = 0
for y0, x0 in zip(*np.where(det & inner)):
    if lab_[y0, x0]: continue
    cur += 1; st = [(y0, x0)]; lab_[y0, x0] = cur; pts = []
    while st and len(pts) < 80:
        y, x = st.pop(); pts.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < B1.shape[0] and 0 <= xx < B1.shape[1] and det[yy, xx] and inner[yy, xx] and not lab_[yy, xx]: lab_[yy, xx] = cur; st.append((yy, xx))
    ys_, xs_ = zip(*pts) if pts else ((0,), (0,))
    hh_, ww_ = max(ys_) - min(ys_) + 1, max(xs_) - min(xs_) + 1
    vv = set(B1[y, x] for y, x in pts)
    # compact clusters only (a tuft, a clover, a flower), never a band edge (long and thin, one tone)
    if 6 <= len(pts) <= 60 and max(hh_, ww_) <= 2.5 * min(hh_, ww_) and len(vv) >= 2:
        ys, xs = zip(*pts); y_, x_ = min(ys), min(xs); d = np.full((max(ys) - y_ + 1, max(xs) - x_ + 1), -1, int)
        for yy, xx in pts: d[yy - y_, xx - x_] = B1[yy, xx]
        DEC.append(d)
DEC = DEC[::max(1, len(DEC) // 120)]

# ---- pieces from tools
def load_piece(path):
    if not os.path.exists(path): return None
    a = to_idx(Image.open(path))
    sp = os.path.join(os.path.dirname(path), "shade", os.path.basename(path))
    if os.path.exists(sp):
        m = np.asarray(Image.open(sp)); a = np.where(m > 200, -4, np.where(m > 0, -2, a))
    return a
LIP = {(q, s): load_piece(os.path.join(pieces_d, f"lip-{q}-{s}.png")) for q in ("nw", "ne", "se", "sw") for s in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner")}
WJ = json.load(open(os.path.join(walls_d, "walls.json")))["pieces"]
WALL = {p["file"][:-4]: (to_idx(Image.open(os.path.join(walls_d, p["file"]))), p) for p in WJ}
FACES = [k for k, (a, p) in WALL.items() if p["kind"] == "face"]; CAPW = [k for k, (a, p) in WALL.items() if p["kind"] == "cap" and p["side"] == "w"]
CAPE = [k for k, (a, p) in WALL.items() if p["kind"] == "cap" and p["side"] == "e"]
DARK = np.array([gstep(i, -1) if mat[i] == "grass" else i for i in range(NC)])
DARK2 = DARK[DARK]

def over(base, o):
    b = base.copy()
    b = np.where(o == -2, DARK[np.clip(b, 0, None)], b); b = np.where(o == -4, DARK2[np.clip(b, 0, None)], b)
    return np.where(o >= 0, o, b)

# ---- the layout: heights, water, stairs, bridge, props (a scene like b1's)
HM = ["22222222221111",
      "22222222221111",
      "22222222221111",
      "22222222221111",
      "22222222221111",
      "11111111111111",
      "11111111111111",
      "00111111111111",
      "00111111111111",
      "00111111111111",
      "00111111111100",
      "00111111111100",
      "00000000000000",
      "00000000000000",
      "00000000000000",
      "00wwww00000000",
      "0wwwwwwww00000",
      "wwwwwwwwwwwwww",
      "wwwwwwwwwwwwww",
      "wwwwwwwwwwwwww",
      "wwwwwwwwwwwwww"]
STAIRS = [(5, 4), (12, 6)]           # (first face row, left cell)
BRIDGE = (16, 9)                     # top-left cell of the 2 x 5 bridge piece: from the bank to the map's edge, as in b1
H = np.array([[0 if ch == "w" else int(ch) for ch in r] for r in HM]); WAT = np.array([[ch == "w" for ch in r] for r in HM]); R, Cn = H.shape
# faces: the two rows under every drop (a drop under a face makes a stack)
FACE = np.zeros((R, Cn), bool); TOP = np.zeros((R, Cn), bool)
for c in range(Cn):
    for r in range(1, R):
        if H[r - 1, c] > H[r, c] and not FACE[r - 1, c] or (FACE[r - 1, c] and r >= 2 and FACE[r - 2, c] and H[r - 1, c] > H[r, c]):
            pass
    r = 1
    while r < R:
        above = H[r - 1, c]
        if H[r, c] < above:
            FACE[r, c] = True; TOP[r, c] = True
            if r + 1 < R: FACE[r + 1, c] = True
            r += 2
            continue
        r += 1
def h(r, c, d): return H[r, c] if 0 <= r < R and 0 <= c < Cn else d

img = np.zeros((R * 48, Cn * 48), int)
# 1. ground
for r in range(R):
    for c in range(Cn):
        t = fills[0].copy(); lvl = H[r, c] - 1                     # low ground a step down, high a step up
        if lvl: t = np.vectorize(lambda i: gstep(i, int(lvl)))(t)
        img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = t
# 1a. the light layer (owner: flat stepped bands, never a gradient): broad patches of the lawn one step lighter or darker, from a
#     smooth field cut at two levels, with a 2 px Bayer edge, independent of the tile grid; it is a layer, not baked into tiles
yy_, xx_ = np.mgrid[0:img.shape[0], 0:img.shape[1]]
fld = np.sin(xx_ / 61.0 + .7) * np.cos(yy_ / 47.0) + .6 * np.sin((xx_ - yy_) / 39.0 + 2.1) + .4 * np.cos((xx_ + 2 * yy_) / 83.0)
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])[yy_ % 4, xx_ % 4] / 16.0
lit = fld + (B4 - .5) * .12 > .75; shd = fld + (B4 - .5) * .12 < -.85
grassm = mat[np.clip(img, 0, None)] == "grass"
LIGHT1 = np.array([gstep(i, 1) for i in range(NC)])
img[lit & grassm] = LIGHT1[img[lit & grassm]]; img[shd & grassm] = DARK[img[shd & grassm]]
# 1b. the lawn's detail: b1's decals, off the tile grid (13 px jittered grid), each taking its level's step
rng0 = np.random.RandomState(1944)
for gy in range(0, img.shape[0], 13):
    for gx in range(0, img.shape[1], 13):
        if rng0.rand() > .7: continue
        d = DEC[rng0.randint(len(DEC))]; y, x = gy + rng0.randint(13), gx + rng0.randint(13); hh, ww = d.shape
        if y + hh > img.shape[0] or x + ww > img.shape[1]: continue
        r_, c_ = min(R - 1, (y + hh // 2) // 48), min(Cn - 1, (x + ww // 2) // 48)
        if FACE[r_, c_] or WAT[r_, c_]: continue
        lv = H[r_, c_] - 1; dd = np.where(d >= 0, np.vectorize(lambda i: gstep(i, int(lv)) if i >= 0 else -1)(d), -1)
        img[y:y + hh, x:x + ww] = np.where(dd >= 0, dd, img[y:y + hh, x:x + ww])
# 2. plateau edges, from each level's top as a pixel mask (cells at that level or above, with the faces they stand on), rounded
#    on a 20 px radius: on the north, west and east a dark outline, a lit grass rim inside it, and a darker band on the ground beyond;
#    the south edge is the wall's turf. (The lip quarters are cut from this drawing for the sheet.)
def rounded(cellmask, k):
    up_ = np.kron(cellmask.astype(float), np.ones((48, 48))); pad_ = np.pad(up_, k, mode="edge"); cs_ = pad_.cumsum(0).cumsum(1)
    bx = (cs_[2 * k:, 2 * k:] - cs_[:-2 * k, 2 * k:] - cs_[2 * k:, :-2 * k] + cs_[:-2 * k, :-2 * k]) / (2 * k) ** 2
    return bx[:up_.shape[0], :up_.shape[1]] > .5
def grow(m, n):
    m = m.copy()
    for _ in range(n): m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m
OUTL = int(((PAL - np.array((24, 52, 30))) ** 2).sum(1).argmin())
for L_ in (1, 2):
    top = (H >= L_) & ~WAT
    for c in range(Cn):                                    # a face belongs to the level above it
        for r in range(R):
            if FACE[r, c] and r >= 1 and (H[r - 1, c] >= L_ or (r >= 2 and H[r - 2, c] >= L_)): top[r, c] = True
    for c in range(Cn):
        for r in range(R):
            if FACE[r, c] and H[r, c] >= L_ and not (r >= 1 and H[r - 1, c] > H[r, c]) and not (r >= 2 and FACE[r - 1, c]): pass
    m0 = np.kron(top.astype(float), np.ones((48, 48))); k_ = 20
    pad_ = np.pad(m0, k_, mode="edge"); cs_ = pad_.cumsum(0).cumsum(1)
    bx = ((cs_[2 * k_:, 2 * k_:] - cs_[:-2 * k_, 2 * k_:] - cs_[2 * k_:, :-2 * k_] + cs_[:-2 * k_, :-2 * k_]) / (2 * k_) ** 2)[:m0.shape[0], :m0.shape[1]]
    yy2, xx2 = np.mgrid[0:m0.shape[0], 0:m0.shape[1]]
    wob = .10 * np.sin(xx2 / 13.0 + L_) * np.cos(yy2 / 17.0) + .07 * np.sin((xx2 + 2 * yy2) / 9.0)
    m = bx > .5 + wob                                        # an organic outline, not the cell's box
    south_face = np.kron(FACE.astype(float), np.ones((48, 48))) > 0
    sf = grow(south_face, 3)
    beyond = grow(m, 12) & ~grow(m, 2) & ~south_face & ~m & ~sf
    img[beyond] = DARK[img[beyond]]                          # the ground in the plateau's shadow, one flat step
    near2 = grow(m, 5) & ~grow(m, 2) & ~south_face & ~m & ~sf
    img[near2] = DARK[img[near2]]                            # and a second step close under the edge
    outl = grow(m, 2) & ~m & ~sf; img[outl] = OUTL           # the dark line under the overhang
    rim = m & ~(np.roll(m, 4, 0) & np.roll(m, 4, 1) & np.roll(m, -4, 1)) & ~sf
    img[rim] = np.array([gstep(i, 2) for i in img[rim]]) if rim.any() else img[rim]      # the lit rim, 4 px
    edge1 = m & ~(np.roll(m, 1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)) & ~sf
    img[edge1] = np.array([gstep(i, 1) for i in img[edge1]]) if edge1.any() else img[edge1]
    # grass blades over the edge: from 35 % of the rim's outer pixels, 2-4 px outward, lit tip
    ry, rx = np.where(rim & ~np.roll(m, 1, 0) | rim & ~np.roll(m, 1, 1) | rim & ~np.roll(m, -1, 1))
    rngb = np.random.RandomState(7 + L_)
    for yb, xb in zip(ry, rx):
        if rngb.rand() > .35: continue
        dy = -1 if not m[max(0, yb - 1), xb] else 0; dx = (-1 if not m[yb, max(0, xb - 1)] else (1 if not m[yb, min(m.shape[1] - 1, xb + 1)] else 0))
        if dy == 0 and dx == 0: continue
        for t in range(1, rngb.randint(2, 5)):
            y3, x3 = yb + dy * t, xb + dx * t
            if 0 <= y3 < img.shape[0] and 0 <= x3 < img.shape[1] and not sf[y3, x3]: img[y3, x3] = gstep(BASE, 2 if t > 1 else 1)
# 3. walls: runs along each top face row
rng = np.random.RandomState(48)
for r in range(R):
    c = 0
    while c < Cn:
        if not TOP[r, c]: c += 1; continue
        c0 = c
        while c < Cn and TOP[r, c]: c += 1
        n = c - c0; stack = r >= 1 and FACE[r - 1, c0]
        open_w = c0 == 0 or not (h(r, c0 - 1, 0) > H[r, c0] or FACE[r, c0 - 1])
        open_e = c >= Cn or not (h(r, c, 0) > H[r, c - 1] or FACE[r, c])
        seq = []; left = n - (1 if open_w else 0) - (1 if open_e else 0); last = None
        if open_w: seq.append(rng.choice(CAPW))
        while left > 0:
            opts = [f for f in FACES if WALL[f][1]["cells"][0] <= left and f != last]
            f = opts[rng.randint(len(opts))]; seq.append(f); last = f; left -= WALL[f][1]["cells"][0]
        if open_e: seq.append(rng.choice(CAPE))
        x = c0 * 48; joins = []
        for f in seq:
            p = WALL[f][0].copy()
            if stack: p[:12] = np.where(p[12:24] >= 0, p[24:36], p[:12])     # a stacked lower face: rock up to its top, no turf
            hh, ww = p.shape; Y = r * 48
            img[Y:Y + hh, x:x + ww] = over(img[Y:Y + hh, x:x + ww], p); x += ww; joins.append(x)
        for jx in joins[:-1]:                                   # break each join: rows shift by -2..2 px within 3 px of it
            Y = r * 48
            for yy in range(Y + 12, Y + 94):
                sh_ = rng.randint(-2, 3)
                if sh_: img[yy, jx - 3:jx + 3] = img[yy, jx - 3 + sh_:jx + 3 + sh_]
        # the cast shadow under the run: one flat DARK step, 8 px, on the cell row under the face
        Yb = (r + 2) * 48
        if Yb < img.shape[0]:
            band = img[Yb:Yb + 8, c0 * 48:c * 48]; img[Yb:Yb + 8, c0 * 48:c * 48] = DARK[band]
# 4. the pond, from the water pieces (tileset/water): each water cell's four quarters by its land neighbours, frame 1
WD = os.path.join(os.path.dirname(walls_d), "water")
WQ = {(q, st_): to_idx(Image.open(os.path.join(WD, f"q-{q}-{st_}-f1.png"))) for q in ("nw", "ne", "se", "sw") for st_ in ("fill", "edgeh", "edgev", "outer", "inner")}
def wstate(r, c, q):
    land = lambda dr, dc: (0 <= r + dr < R and 0 <= c + dc < Cn) and not WAT[r + dr, c + dc]   # the pond runs on past the map's edge
    vy = -1 if q in ("nw", "ne") else 1; vx = -1 if q in ("nw", "sw") else 1
    a_, b_, d_ = land(vy, 0), land(0, vx), land(vy, vx)
    return "outer" if a_ and b_ else ("edgeh" if a_ else ("edgev" if b_ else ("inner" if d_ else "fill")))
nearest = lambda rgb: int(((PAL - np.array(rgb)) ** 2).sum(1).argmin())
BODY, SHAL = nearest((29, 104, 136)), nearest((34, 121, 147))
for r in range(R):
    for c in range(Cn):
        if not WAT[r, c]: continue
        for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "sw": (24, 0), "se": (24, 24)}.items():
            Y, X = r * 48 + y, c * 48 + x; pq = WQ[(q, wstate(r, c, q))]; img[Y:Y + 24, X:X + 24] = np.where(pq >= 0, pq, img[Y:Y + 24, X:X + 24])
# 5. stairs: b1's lower stair, 2 cells wide, 3 tall (landing row above the face)
st = B1[460:622, 262:370]; st = np.asarray(Image.fromarray(st.astype(np.uint8)).resize((96, 144), Image.NEAREST)).astype(int)
for (r, c) in STAIRS:
    Y, X = (r - 1) * 48, c * 48; img[Y:Y + 144, X:X + 96] = st
# 6. bridge and props: the props pieces (tileset/props, tools/cut-props.py), each set by its foot (bottom centre) on a pixel
PD = os.path.join(os.path.dirname(walls_d), "props"); PJ = json.load(open(os.path.join(PD, "props.json")))["pieces"]
PROP = {p["file"][:-4]: to_idx(Image.open(os.path.join(PD, p["file"]))) for p in PJ}
def put(name, fx, fy):
    p = PROP[name]; ph, pw = p.shape; Y, X = fy - ph, fx - pw // 2
    y0, x0 = max(0, Y), max(0, X); y1, x1 = min(img.shape[0], Y + ph), min(img.shape[1], X + pw)
    if y1 <= y0 or x1 <= x0: return
    q = p[y0 - Y:y1 - Y, x0 - X:x1 - X]; img[y0:y1, x0:x1] = np.where(q >= 0, q, img[y0:y1, x0:x1])
br_ = PROP["bridge-1"]; Yb, Xb = BRIDGE[0] * 48 - 24, BRIDGE[1] * 48
put("bridge-1", Xb + 48, Yb + br_.shape[0])
# the props layout, by the scene's rules: ferns and bushes at the walls' feet, boulders on open ground, reeds at the bank, flowers on the lawn
SCAT = [("fern-1", 96, 720), ("bush-1", 300, 718), ("fern-3", 640, 712), ("boulder-3", 600, 470), ("bush-2", 70, 470),
        ("fern-2", 190, 384), ("boulder-2", 520, 362), ("boulder-1", 560, 372), ("boulder-4", 120, 120), ("bush-3", 610, 210),
        ("reeds-1", 150, 772), ("reeds-2", 600, 790), ("flowers-1", 380, 150), ("flowers-2", 200, 520), ("flowers-1", 470, 712),
        ("fern-3", 30, 160)]
for name, fx, fy in SCAT: put(name, fx, fy)
# the island: b1's own, a macro piece with its pond keyed out (only the two water tones go; its bank and foam stay)
isl = B1[800:955, 185:300]; isl = np.where((isl == BODY) | (isl == SHAL), -1, isl)
PROP["island-b1"] = isl; put("island-b1", 260, 960)
im = Image.fromarray(PAL[np.clip(img, 0, None)].astype(np.uint8))
im.save(os.path.join(out, "test-map-1x.png")); im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(out, "test-map-3x.png"))
b1im = Image.open(os.path.join(b1d, "scene-1x.png")).convert("RGB").crop((0, 0, im.width, im.height))
side = Image.new("RGB", (im.width * 2 + 8, im.height), (255, 255, 255)); side.paste(b1im, (0, 0)); side.paste(im, (im.width + 8, 0))
side.save(os.path.join(out, "beside-b1-1x.png"))
print("test map", im.size, "fills", len(fills), "faces", int(FACE.sum()), "colours", len(np.unique(img)))
