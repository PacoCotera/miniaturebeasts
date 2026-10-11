"""Test map 8 for the meadow tileset: b1's own layout, built from tiles only, beside b1 at the same size (864 x 1152).

The layout is b1's, read off b1's materials (its plateaus, walls, pond, stream, stairs and bridge) and snapped to the 48 px cell
grid that the pieces live on. b1 is a painting and is not consistent in scale: its upper steps are about 60 px, where one level is
two cells (96 px) here, so the plateaus' south rims sit up to a cell from b1's. Any other difference is the tiles.

Pieces used:
  lawn          b1's own lawn ramp: the band layer's step plus a fleck tile (b1's lawn less its bands, -2..+2 steps, one 96 px tile
                mirrored so it has no seams), the basin one step down
  light layer   broad irregular light and shade bands from a smooth field (b1's shares: ~23% lit, ~23% shade), as flat steps
                up or down of the same grass: a layer, not baked into tiles, never cut by the tile grid
  tufts         clustered tufts (3-5 blades: a dark side, a body one step down, a lit tip two steps up) and sparse clover,
                at seeded sites ~30 px apart, none alone
  plateau edges on north, west and east: a rounded outline, a lit rim, a dark line under it, blades over it, two flat shadow steps
  walls         tileset/walls: two cells per level (a two-level drop stacks two), runs packed from pieces 3, 2 and 1 wide, caps at
                open ends; the plateau's turf hangs 6-26 px over the wall's top in lumps and lobes, with hanging blades; moss and
                roots on the faces; a foot
                piece on every cell of a run's bottom edge, and small boulders and ferns along it
  side faces    tileset/walls/side-*: a rock column (32 px west, 20 px east) down each plateau's west and east sides, in the lower cell's
                place, lit on the west, shaded on the east, with rounded top and foot ends
  stairs        tileset/stairs: wide2x1 per level of drop (two stacked for b1's two-level stair), the landing on the row
                above, the foot below
  pond, stream  tileset/water: two flat tones, a continuous foam line with breaks, the wet line, a sand bank; a lobe's outer
                corners are macro pieces (2 x 2 cells, radius 60 or 42); straight shores take 2-cell lobe pieces (a 10 px bulge out or in)
  props         tileset/props (bushes, ferns, boulders, reeds, flowers, the bridge) at b1's places, each with a flat contact
                shadow; b1's island as a macro piece
Writes test-map-1x.png, -3x.png and beside-b1-1x.png.
usage: python3 -I tileset-map.py B1_DIR WALLS_DIR OUT_DIR"""
import json, os, sys, colorsys
import numpy as np
from PIL import Image
b1d, walls_d, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
cols = json.load(open(os.path.join(b1d, "biome-meadow.json")))["colours"]
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
PAL = np.array([hx(c["hex"]) for c in cols]); NC = len(PAL)
CORE_G = ["pine", "forest", "leaf", "grass", "sprout", "lime"]
mat = np.array([c.get("material", "grass" if c.get("name") in CORE_G else "core") for c in cols])
lum = 0.2126 * PAL[:, 0] + 0.7152 * PAL[:, 1] + 0.0722 * PAL[:, 2]
hsv = np.array([colorsys.rgb_to_hsv(*(PAL[i] / 255)) for i in range(NC)])
G_ORDER = sorted([i for i in range(NC) if mat[i] == "grass" and hsv[i, 1] > .35 and .18 < hsv[i, 0] < .40], key=lambda i: lum[i])
def gstep(i, k):
    if i not in G_ORDER:
        if mat[i] != "grass": return i
        i = min(G_ORDER, key=lambda g: abs(lum[g] - lum[i]))
    j = G_ORDER.index(i); return G_ORDER[max(0, min(len(G_ORDER) - 1, j + k))]
GS = {k: np.array([gstep(i, k) for i in range(NC)]) for k in (-3, -2, -1, 1, 2)}
DARK, LIGHT1 = GS[-1], GS[1]
def to_idx(rgba):
    a = np.asarray(rgba.convert("RGBA")); rgb = a[..., :3].reshape(-1, 1, 3).astype(int)
    i = ((rgb - PAL[None]) ** 2).sum(-1).argmin(1).reshape(a.shape[:2])
    return np.where(a[..., 3] > 127, i, -1)
B1 = np.pad(to_idx(Image.open(os.path.join(b1d, "scene-1x.png"))), ((0, 0), (0, 4)), mode="edge")
nearest = lambda rgb: int(((PAL - np.array(rgb)) ** 2).sum(1).argmin())
BODY, SHAL = nearest((29, 104, 136)), nearest((34, 121, 147)); OUTL = nearest((24, 52, 30))
lawn = mat[B1] == "grass"
vals, cnts = np.unique(B1[lawn], return_counts=True); medl = np.median(lum[B1[lawn]])
BASE = int(max((c_, v_) for v_, c_ in zip(vals, cnts) if lum[v_] > medl)[1])          # b1's lit lawn tone
def grow(m, n):
    m = m.copy()
    for _ in range(n): m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m
def majority(m, n):
    for _ in range(n):
        p = np.pad(m.astype(int), 1, mode="edge"); s = sum(p[1 + dy:p.shape[0] - 1 + dy, 1 + dx:p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)); m = s >= 5
    return m

# ---- b1's layout on cells (18 x 24): levels 0-3, w water (a face is drawn in the cells under its drop, at the lower level)
HM = ["113333333333331ww0"] * 3 + ["111111112222221ww0"] * 3 + ["1111111122222211ww"] + ["1111111111111111ww"] * 3 + [
      "0000000000011111ww",
      "0000000000011111ww",
      "000000000001111ww0",
      "000000000001111ww0",
      "000000000001111ww0",
      "000000000000000ww0",
      "00wwwwwww000000ww0",
      "00wwwwwww00wwwwww0",
      "00wwwwwwwwwwwwwww0",
      "00wwwwwwwwwwwwwww0",
      "00wwwwwww00wwwwww0",
      "00wwwwwww00wwwwww0",
      "000000000000000000",
      "000000000000000000"]
STAIRS = [(3, 5, 2), (10, 5, 1)]        # (first face row, left cell, levels): b1's two stairs
H = np.array([[0 if ch == "w" else int(ch) for ch in r] for r in HM]); WAT = np.array([[ch == "w" for ch in r] for r in HM]); R, Cn = H.shape
# faces: 2 rows per level of drop under every drop; TOP marks each face's first row (a two-level drop: two stacked faces)
FACE = np.zeros((R, Cn), bool); TOP = np.zeros((R, Cn), bool); FLV = np.zeros((R, Cn), int)      # FLV: the level above the face
for c in range(Cn):
    for r in range(1, R):
        d = H[r - 1, c] - H[r, c]
        if d > 0 and not FACE[r - 1, c] and not WAT[r - 1, c] and not WAT[r, c]:   # never a face into water
            for k in range(2 * d):
                if r + k < R: FACE[r + k, c] = True; FLV[r + k, c] = H[r - 1, c]
            for k in range(d): TOP[r + 2 * k, c] = True
def h(r, c, d): return H[r, c] if 0 <= r < R and 0 <= c < Cn else d
HPX, WPX = R * 48, Cn * 48

# ---- level masks (rounded outlines; a face belongs to the level above it), the ground, the light layer
LVLM = {}
for L_ in (1, 2, 3):
    top = ((H >= L_) | (FLV >= L_)) & ~WAT
    m0 = np.kron(top.astype(float), np.ones((48, 48))); k_ = 20
    pad_ = np.pad(m0, k_, mode="edge"); cs_ = pad_.cumsum(0).cumsum(1)
    bx = ((cs_[2 * k_:, 2 * k_:] - cs_[:-2 * k_, 2 * k_:] - cs_[2 * k_:, :-2 * k_] + cs_[:-2 * k_, :-2 * k_]) / (2 * k_) ** 2)[:HPX, :WPX]
    yy2, xx2 = np.mgrid[0:HPX, 0:WPX]
    wob = .12 * np.sin(xx2 / 29.0 + L_) * np.cos(yy2 / 23.0) + .06 * np.sin((xx2 + yy2) / 41.0)      # slow: an outline that wanders, never a zigzag
    LVLM[L_] = bx > .5 + wob
LV = np.zeros((HPX, WPX), int)
for L_ in (1, 2, 3): LV[LVLM[L_]] = L_
img = np.zeros((HPX, WPX), int)
LTONE = [-1, 0, 0, 0]                                             # b1's levels share one lawn; the basin a step down
vv, cc = np.unique(B1[lawn], return_counts=True)
LRAMP = sorted(vv[np.argsort(-cc)[:7]], key=lambda i: lum[i])     # b1's own lawn ramp: its seven commonest lawn tones, dark to light
LB = LRAMP.index(BASE)
def lt(L_, k): return LRAMP[max(0, min(len(LRAMP) - 1, LB + LTONE[L_] + k))]
for L_ in range(4): img[LV == L_] = lt(L_, 0)
# the light layer: b1's own bands. Lawn lighter than the base by a clear step is lit, darker is shade; smoothed so only broad bands stay
def boxavg(a, k):
    p = np.pad(a, k, mode="edge"); cs = p.cumsum(0).cumsum(1); cs = np.pad(cs, ((1, 0), (1, 0)))
    n = 2 * k + 1; return (cs[n:, n:] - cs[:-n, n:] - cs[n:, :-n] + cs[:-n, :-n]) / n ** 2
b1l = boxavg(np.where(lawn, lum[B1], lum[BASE]).astype(float), 6)      # b1's lawn value, averaged over 13 px: its bands, not its flecks
# the bands, laid by their own field (not b1's layout, whose straight cliff edges cut them into rectangles): broad, irregular,
# off the tile grid, at b1's shares of lit and shaded lawn
from scipy import ndimage as nd_
rngb_ = np.random.RandomState(31)
fld_ = sum(w * nd_.gaussian_filter(rngb_.normal(0, 1, (HPX, WPX)), sg, mode="wrap") for sg, w in ((70, 1.0), (32, .45), (12, .12)))
fld_ = (fld_ - fld_.mean()) / fld_.std()
lit = fld_ > 0.75; shd = fld_ < -0.75; shd2 = fld_ < -1.45
# the lawn's fleck tiles: b1's lawn, less its bands. Each pixel's step on b1's ramp minus the 13 px average of those steps, kept to
# -2..+2, from 96 px windows of b1 that are lawn throughout; three variants, one per 96 px block by a seeded rule
RI = np.full(B1.shape, np.nan); 
for k_, t_ in enumerate(LRAMP): RI[B1 == t_] = k_
inl = ~np.isnan(RI); avg = boxavg(np.where(inl, RI, LB).astype(float), 6); RES = np.clip(np.round(np.where(inl, RI, LB) - avg), -2, 2).astype(int)
cov = boxavg(inl.astype(float), 48)
cand = sorted(((cov[y, x], y, x) for y in range(48, B1.shape[0] - 48, 24) for x in range(48, B1.shape[1] - 48, 24)), reverse=True)
FLECK = []
for cv, y, x in cand:
    if cv < .995 or len(FLECK) == 3: break
    if all(abs(y - y2) > 96 or abs(x - x2) > 96 for y2, x2 in [f[1] for f in FLECK]): FLECK.append((RES[y - 48:y + 48, x - 48:x + 48], (y, x)))
rngl = np.random.RandomState(5)
BAND = np.zeros((HPX, WPX), int); BAND[lit] = 1; BAND[shd] = -2; BAND[shd2] = -4
gm = mat[img] == "grass"
for by in range(0, HPX, 96):
    for bx in range(0, WPX, 96):
        f0 = FLECK[0][0]; f = f0[:, ::-1] if (bx // 96) % 2 else f0; f = f[::-1] if (by // 96) % 2 else f   # one tile, mirrored: no seams
        hh, ww = min(96, HPX - by), min(96, WPX - bx)
        for L_ in range(4):
            m_ = gm[by:by + hh, bx:bx + ww] & (LV[by:by + hh, bx:bx + ww] == L_)
            k_ = np.clip(LB + LTONE[L_] + BAND[by:by + hh, bx:bx + ww] + f[:hh, :ww], 0, len(LRAMP) - 1)
            img[by:by + hh, bx:bx + ww][m_] = np.array(LRAMP)[k_[m_]]

# ---- tufts: clustered, never alone. Sites ~40 px apart; each a cluster of 2-4 tufts within 9 px; clover rarely
rng0 = np.random.RandomState(1944)
FACEPX = np.kron(FACE, np.ones((48, 48), bool)); WATPX = np.kron(WAT, np.ones((48, 48), bool))
okp = ~grow(FACEPX | WATPX, 6)
LIX = {t: k for k, t in enumerate(LRAMP)}
def ls(i, k): return LRAMP[max(0, min(len(LRAMP) - 1, LIX[i] + k))] if i in LIX else gstep(i, k)
def tuft(cy, cx):
    base = img[cy, cx]
    if mat[base] != "grass": return
    for b in range(rng0.randint(3, 6)):
        x = cx + rng0.randint(-3, 4); hgt = rng0.randint(2, 5); lean = rng0.choice([-1, 0, 0, 1])
        for k in range(hgt):
            y = cy - k; xx = x + (lean if k == hgt - 1 else 0)
            if not (0 <= y < HPX and 0 < xx < WPX - 1) or not okp[y, xx]: break
            img[y, xx] = ls(base, 2) if k == hgt - 1 else ls(base, -1)                     # on b1's ramp: a lit tip, a body a step down
            if k < hgt - 1 and okp[y, xx + 1]: img[y, xx + 1] = ls(base, -3)              # and a dark side
for gy in range(0, HPX, 30):
    for gx in range(0, WPX, 30):
        if rng0.rand() > .6: continue
        cy, cx = gy + rng0.randint(30), gx + rng0.randint(30)
        if not (6 <= cy < HPX - 2 and 6 <= cx < WPX - 6) or not okp[cy, cx]: continue
        if rng0.rand() < .08:                                   # a flower: a white or yellow head on a dark stem
            if mat[img[cy, cx]] == "grass":
                img[cy, cx] = GS[-2][img[cy, cx]]; img[cy - 1, cx] = nearest((240, 240, 230) if rng0.rand() < .6 else (240, 210, 70))
            continue
        if rng0.rand() < .15:                                   # clover: three lit leaves round a dark centre
            base = img[cy, cx]
            if mat[base] == "grass":
                for dy, dx in ((0, -1), (0, 1), (-1, 0)): img[cy + dy, cx + dx] = GS[2][base]
                img[cy, cx] = GS[-1][base]
            continue
        for _ in range(rng0.randint(2, 5)): tuft(min(HPX - 2, cy + rng0.randint(-4, 5)), min(WPX - 6, cx + rng0.randint(-9, 10)))

# ---- plateau edges on north, west and east
sf = grow(FACEPX, 3); sf[:4] = True; sf[-4:] = True; sf[:, :4] = True; sf[:, -4:] = True     # no edge drawn along the map's own border
for L_ in (1, 2, 3):
    m = LVLM[L_]
    beyond = grow(m, 12) & ~grow(m, 2) & ~m & ~sf; img[beyond] = DARK[img[beyond]]
    near2 = grow(m, 5) & ~grow(m, 2) & ~m & ~sf; img[near2] = DARK[img[near2]]
    outl = grow(m, 2) & ~m & ~sf; img[outl] = OUTL
    rim = m & ~(np.roll(m, 4, 0) & np.roll(m, 4, 1) & np.roll(m, -4, 1)) & ~sf; img[rim] = GS[2][img[rim]]
    edge1 = m & ~(np.roll(m, 1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)) & ~sf; img[edge1] = LIGHT1[img[edge1]]
    ry, rx = np.where(rim & ~np.roll(m, 1, 0) | rim & ~np.roll(m, 1, 1) | rim & ~np.roll(m, -1, 1))
    rngb = np.random.RandomState(7 + L_)
    for yb, xb in zip(ry, rx):
        if rngb.rand() > .35: continue
        dy = -1 if not m[max(0, yb - 1), xb] else 0; dx = (-1 if not m[yb, max(0, xb - 1)] else (1 if not m[yb, min(WPX - 1, xb + 1)] else 0))
        if dy == 0 and dx == 0: continue
        for t in range(1, rngb.randint(2, 5)):
            y3, x3 = yb + dy * t, xb + dx * t
            if 0 <= y3 < HPX and 0 <= x3 < WPX and not sf[y3, x3]: img[y3, x3] = gstep(BASE, LTONE[L_] + (2 if t > 1 else 1))

# ---- walls
WJ = json.load(open(os.path.join(walls_d, "walls.json")))["pieces"]
WALL = {p["file"][:-4]: (to_idx(Image.open(os.path.join(walls_d, p["file"]))), p) for p in WJ}
FACES = [k for k, (a, p) in WALL.items() if p["kind"] == "face"]; CAPW = [k for k, (a, p) in WALL.items() if p["kind"] == "cap" and p["side"] == "w"]
CAPE = [k for k, (a, p) in WALL.items() if p["kind"] == "cap" and p["side"] == "e"]
STAIRC = set((r + k, c + j) for r, c, n in STAIRS for k in range(2 * n) for j in (0, 1))
rng = np.random.RandomState(48); RUNS = []
for r in range(R):
    c = 0
    while c < Cn:
        if not TOP[r, c] or (r, c) in STAIRC: c += 1; continue
        c0 = c
        while c < Cn and TOP[r, c] and (r, c) not in STAIRC and FLV[r, c] == FLV[r, c0]: c += 1
        n = c - c0; stack = r >= 1 and FACE[r - 1, c0] and FLV[r - 1, c0] == FLV[r, c0]
        closed = lambda cc: not (0 <= cc < Cn) or (r, cc) in STAIRC or h(r, cc, 0) >= FLV[r, c0] or FACE[r, cc]   # the map's edge runs on
        open_w, open_e = not closed(c0 - 1), not closed(c)
        if n < open_w + open_e: open_e = False                    # a one-cell run open both ends: one cap
        seq = []; left = n - open_w - open_e; last = None
        if open_w: seq.append(rng.choice(CAPW))
        while left > 0:
            opts = [f for f in FACES if WALL[f][1]["cells"][0] <= left and f != last]
            f = opts[rng.randint(len(opts))]; seq.append(f); last = f; left -= WALL[f][1]["cells"][0]
        if open_e: seq.append(rng.choice(CAPE))
        x = c0 * 48; Y = r * 48; joins = []
        for f in seq:
            p = WALL[f][0].copy()
            if stack:                                             # a stacked lower face: its turf gives way to the face above, mirrored, so the rock runs on
                above = np.flipud(img[Y - 14:Y, x:x + p.shape[1]]); p[:14] = np.where(mat[np.clip(above, 0, None)] != "grass", above, p[:14])
            hh, ww = p.shape; hh = min(hh, HPX - Y)
            img[Y:Y + hh, x:x + ww] = np.where(p[:hh] >= 0, p[:hh], img[Y:Y + hh, x:x + ww]); x += ww; joins.append(x)
        if stack:                                                 # break the stack's line: columns shift by -2..2 px within 3 px of it
            for xx in range(c0 * 48, c * 48):
                s_ = rng.randint(-2, 3)
                if s_: img[Y - 3:Y + 3, xx] = img[Y - 3 + s_:Y + 3 + s_, xx]
        for jx in joins[:-1]:                                     # break each join: rows shift by -2..2 px within 3 px of it
            for yy in range(Y + 12, min(HPX, Y + 94)):
                s_ = rng.randint(-2, 3)
                if s_: img[yy, jx - 3:jx + 3] = img[yy, jx - 3 + s_:jx + 3 + s_]
        RUNS.append((r, c0, c, stack, FLV[r, c0]))
        Yb = (r + 2) * 48                                         # the cast shadow on the cell under the face: one flat step, 8 px
        if Yb < HPX and not FACE[min(R - 1, r + 2), c0]:
            band = img[Yb:Yb + 8, c0 * 48:c * 48]; img[Yb:Yb + 8, c0 * 48:c * 48] = np.where(mat[band] == "grass", DARK[band], band)
# side faces (tileset/walls/side-*): on every plateau's west and east sides a 20 px rock column in the lower cell's place,
# from under the plateau's north corner down to its south face (or a foot where no face ends it); an east side casts an 8 px
# shadow on the ground beside it
SIDE = {k: to_idx(Image.open(os.path.join(walls_d, f"side-{k}.png"))) for k in
        [f"{s_}-{n}" for s_ in "we" for n in (1, 2, 3)] + [f"{s_}-{e}" for s_ in "we" for e in ("top", "foot")]}
rngs = np.random.RandomState(77)
def blit(p, Y, X):
    h_, w_ = p.shape; y0, y1 = max(0, Y), min(HPX, Y + h_)
    if y1 > y0: img[y0:y1, X:X + w_] = np.where(p[y0 - Y:y1 - Y] >= 0, p[y0 - Y:y1 - Y], img[y0:y1, X:X + w_])
STAIRC_ = set((r + k, c + j) for r, c, n in STAIRS for k in range(-1, 2 * n) for j in (0, 1))
for L_ in (1, 2, 3):
    top = ((H >= L_) | (FLV >= L_)) & ~WAT
    for side, dc in (("w", -1), ("e", 1)):
        for c in range(Cn):
            cn = c + dc
            if not (0 <= cn < Cn): continue
            r = 0
            while r < R:
                if not (top[r, c] and not top[r, cn] and not FACE[r, c] and (r, cn) not in STAIRC_): r += 1; continue
                r0 = r
                while r < R and top[r, c] and not top[r, cn] and not FACE[r, c]: r += 1
                SW = SIDE[f"{side}-1"].shape[1]; X = c * 48 - SW if side == "w" else (c + 1) * 48
                ystart = r0 * 48 + (20 if (r0 == 0 or not top[r0 - 1, c]) else 0)
                yend = r * 48 + (24 if r < R and FACE[r, c] else 0)            # down into the face's turf, where a cap meets it
                y = ystart
                while y < yend:
                    blit(SIDE[f"{side}-{rngs.randint(1, 4)}"][:yend - y], y, X); y += 48
                if ystart > r0 * 48 or r0 == 0: blit(SIDE[f"{side}-top"], ystart, X)
                if not (r < R and FACE[r, c]): blit(SIDE[f"{side}-foot"], yend - 24, X)
                if side == "e":
                    sh_ = img[ystart:yend, X + SW:X + SW + 8]; g_ = mat[sh_] == "grass"; sh_[g_] = DARK[sh_[g_]]
# moss and roots on the faces (b1's walls are about half rock): moss where a slow field runs high, most near the top, as the
# lawn's dark green with a lit upper edge; roots hang from the top every 25-60 px, a dark wavering line 12-40 px long
yy3, xx3 = np.mgrid[0:HPX, 0:WPX]
fld = np.sin(xx3 / 7.0 + 1.3) * np.cos(yy3 / 5.0) + np.sin((xx3 + yy3) / 11.0) + .7 * np.cos((xx3 - 2 * yy3) / 17.0)
ROOT = nearest((70, 46, 30)); rngm = np.random.RandomState(21)
for r, c0, c1, stack, L_ in RUNS:
    Y = r * 48; X0, X1 = c0 * 48, c1 * 48
    sub = img[Y:Y + 96, X0:X1]; rock = mat[np.clip(sub, 0, None)] == "rock"
    depth = np.arange(sub.shape[0])[:, None] / 96.0
    moss = rock & (fld[Y:Y + 96, X0:X1] > 1.1 + 1.1 * depth)
    sub[moss] = LRAMP[1]
    litm = moss & ~np.roll(moss, 1, 0); sub[litm] = LRAMP[3]
    x = X0 + rngm.randint(10, 30)
    while x < X1 - 6:
        xx_, ln = x, rngm.randint(12, 41)
        for k in range(ln):
            y = Y + 8 + k
            if y >= min(HPX, Y + 92): break
            if rngm.rand() < .2: xx_ += rngm.choice([-1, 1])
            if X0 <= xx_ < X1 and mat[img[y, xx_]] == "rock": img[y, xx_] = ROOT
        x += rngm.randint(25, 61)
# the wall's feet: a foot piece (tileset/walls/foot-<n>) on every cell of every run's bottom edge, and props from the props sheet
# along it (small boulders and ferns, seeded, ~one per 1.5 cells), so no wall ends on a ruled line
FEET = [to_idx(Image.open(os.path.join(walls_d, p["file"]))) for p in WJ if p["kind"] == "foot"]
FOOTPROPS = []
rngf = np.random.RandomState(96)
for r, c0, c1, stack, L_ in RUNS:
    if r + 2 < R and FACE[r + 2, c0]: continue                     # an upper face of a stack: its foot is the face below
    Yf = (r + 2) * 48
    for cc in range(c0, c1):
        f = FEET[rngf.randint(len(FEET))]; Y0 = Yf - f.shape[0] + 2
        if Y0 + f.shape[0] <= HPX: img[Y0:Y0 + f.shape[0], cc * 48:cc * 48 + 48] = np.where(f >= 0, f, img[Y0:Y0 + f.shape[0], cc * 48:cc * 48 + 48])
        if rngf.rand() < .65 and Yf + 4 < HPX and not WAT[min(R - 1, r + 2), cc]:
            FOOTPROPS.append((["boulder-1", "boulder-2", "fern-3", "fern-2"][rngf.randint(4)], cc * 48 + rngf.randint(8, 40), Yf + rngf.randint(3, 7)))
# the plateau's rim over each (unstacked) run: the upper lawn hangs 6-10 px over the wall's top, ragged, with a dark lower line
# and blades hanging past it
rngr = np.random.RandomState(11)
for r, c0, c1, stack, L_ in RUNS:
    if stack: continue
    Y = r * 48; up = gstep(BASE, LTONE[L_]); ph = rngr.rand() * 6
    xs = np.arange(c0 * 48, c1 * 48)
    lobe = 22 * np.maximum(0, np.sin(xs / 27.0 + ph)) ** 2 + 8 * np.maximum(0, np.sin(xs / 11.0 + 2 * ph)) ** 2   # lobes of turf, big and small
    dd = np.clip(np.round(12 + lobe + rngr.randint(-1, 2, len(xs))), 10, 40).astype(int)          # the rim spills 10-40 px over the rock
    for x, d in zip(xs, dd):
        # the spill is the lawn itself carried over the edge (its own texture and bands, mirrored down), so no line marks the wall's top
        src = img[max(0, Y - d):Y, x][::-1].copy()
        img[Y:Y + len(src), x] = src
        img[Y + d - 4:Y + d - 1, x] = LIGHT1[img[Y + d - 4:Y + d - 1, x]]      # a lit lip along the lower contour
        img[Y + d - 1, x] = GS[-2][up]; img[Y + d, x] = OUTL                    # its shaded underside and the dark line
        if rngr.rand() < .35:                                                   # blades hanging past it, b1's ragged fringe
            for t in range(1, rngr.randint(2, 7)): img[Y + d + t, x] = GS[-1][up] if t < 3 else OUTL

# ---- water: each water cell's four quarters by its land neighbours (water runs on past the map's edge), frame 1
WD = os.path.join(os.path.dirname(walls_d), "water")
WQ = {(q, s): to_idx(Image.open(os.path.join(WD, f"q-{q}-{s}-f1.png"))) for q in ("nw", "ne", "se", "sw") for s in ("fill", "edgeh", "edgev", "outer", "inner")}
def wstate(r, c, q):
    land = lambda dr, dc: (0 <= r + dr < R and 0 <= c + dc < Cn) and not WAT[r + dr, c + dc]   # water runs on past the map's edge
    vy = -1 if q in ("nw", "ne") else 1; vx = -1 if q in ("nw", "sw") else 1
    a_, b_, d_ = land(vy, 0), land(0, vx), land(vy, vx)
    return "outer" if a_ and b_ else ("edgeh" if a_ else ("edgev" if b_ else ("inner" if d_ else "fill")))
# macro corners: a 2 x 2 block of water whose two outer sides are all land takes one 96 px corner piece in place of its quarters
WM = {(q, rm): to_idx(Image.open(os.path.join(WD, f"macro-{q}-outer-r{rm}-f1.png"))) for q in ("nw", "ne", "se", "sw") for rm in (60, 42)}
isw = lambda r, c: not (0 <= r < R and 0 <= c < Cn) or WAT[r, c]
MAC = []; inmac = set()
for r in range(R - 1):
    for c in range(Cn - 1):
        if not all(isw(r + a, c + b) for a in (0, 1) for b in (0, 1)) or any((r + a, c + b) in inmac for a in (0, 1) for b in (0, 1)): continue
        for q, (dy, dx) in {"nw": (-1, -1), "ne": (-1, 1), "sw": (1, -1), "se": (1, 1)}.items():
            ro, co = (r - 1 if dy < 0 else r + 2), (c - 1 if dx < 0 else c + 2)
            if all(not isw(ro, c + b) for b in (0, 1)) and all(not isw(r + a, co) for a in (0, 1)) and not isw(ro, co):
                MAC.append((r, c, q)); inmac |= {(r + a, c + b) for a in (0, 1) for b in (0, 1)}; break
for r, c, q in MAC:
    pm = WM[(q, (60, 42)[(r * 7 + c * 3) % 2])]; Y, X = r * 48, c * 48; img[Y:Y + 96, X:X + 96] = np.where(pm >= 0, pm, img[Y:Y + 96, X:X + 96])
for r in range(R):
    for c in range(Cn):
        if not WAT[r, c] or (r, c) in inmac: continue
        for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "sw": (24, 0), "se": (24, 24)}.items():
            Y, X = r * 48 + y, c * 48 + x; pq = WQ[(q, wstate(r, c, q))]; img[Y:Y + 24, X:X + 24] = np.where(pq >= 0, pq, img[Y:Y + 24, X:X + 24])

# lobes: along a straight shore, each pair of water cells whose land side is the same and whose other quarters are open water
# takes one 2-cell lobe piece, bulging out and in by turns, so a pond's sides curve as b1's
LOBE = {(sd, t): to_idx(Image.open(os.path.join(WD, f"lobe-{sd}-{t}-f1.png"))) for sd in "nswe" for t in ("out", "in")}
QS = lambda r, c: {q: wstate(r, c, q) for q in ("nw", "ne", "sw", "se")}
WANT = {"n": {"nw": "edgeh", "ne": "edgeh", "sw": "fill", "se": "fill"}, "s": {"sw": "edgeh", "se": "edgeh", "nw": "fill", "ne": "fill"},
        "w": {"nw": "edgev", "sw": "edgev", "ne": "fill", "se": "fill"}, "e": {"ne": "edgev", "se": "edgev", "nw": "fill", "sw": "fill"}}
used = set(); k_l = 0; BEACHED = []
BEACH = {sd: to_idx(Image.open(os.path.join(WD, f"beach-{sd}-f1.png"))) for sd in "nswe"}
for sd in "nswe":
    for r in range(R):
        for c in range(Cn):
            r2, c2 = (r, c + 1) if sd in "ns" else (r + 1, c)
            if not (r2 < R and c2 < Cn) or (r, c) in used or (r2, c2) in used or (r, c) in inmac or (r2, c2) in inmac: continue
            if not (WAT[r, c] and WAT[r2, c2] and QS(r, c) == WANT[sd] and QS(r2, c2) == WANT[sd]): continue
            beach_here = sd == "s" and not BEACHED and c < Cn // 2 and not WAT[min(R - 1, r + 1), c] and r == max(i for i in range(R) if WAT[i, c])                       # the first south shore from the left takes the beach, as b1's lower-left
            if beach_here:
                pz = BEACH["s"]; Y, X = r * 48, c * 48; hh, ww = pz.shape; BEACHED.append((r, c))
            else:
                pz = LOBE[(sd, ("out", "in")[k_l % 2])]; k_l += 1; Y, X = r * 48, c * 48; hh, ww = pz.shape
            hh = min(hh, HPX - Y); img[Y:Y + hh, X:X + ww] = np.where(pz[:hh] >= 0, pz[:hh], img[Y:Y + hh, X:X + ww]); used |= {(r, c), (r2, c2)}
# the stream's bends: where a 2-wide stream steps one cell sideways between two rows, one S-curve piece (3 x 2 cells) in place
# of the quarters; under its banks the lawn of the level beside it
BEND = to_idx(Image.open(os.path.join(WD, "bend-se-f1.png")))
for r in range(R - 1):
    for c in range(Cn - 2):
        a_ = WAT[r, c] and WAT[r, c + 1] and not WAT[r, c + 2] and not WAT[r + 1, c] and WAT[r + 1, c + 1] and WAT[r + 1, c + 2]
        b_ = WAT[r + 1, c] and WAT[r + 1, c + 1] and not WAT[r + 1, c + 2] and not WAT[r, c] and WAT[r, c + 1] and WAT[r, c + 2]
        if not (a_ or b_): continue
        pz = BEND if a_ else BEND[::-1]; Y, X = r * 48, c * 48
        reg = img[Y:Y + 96, X:X + 144]; under = np.vectorize(lambda L: lt(L, 0))(LV[Y:Y + 96, X:X + 144])
        wat_cells = np.kron(WAT[r:r + 2, c:c + 3], np.ones((48, 48), bool))
        reg[:] = np.where(pz >= 0, pz, np.where(wat_cells, under, reg))
# ---- stairs: the stair pieces (tileset/stairs, tools/cut-stairs.py): a wide2x1 per level of drop, the landing on the row above,
#      the foot on the row below
SD = os.path.join(os.path.dirname(walls_d), "stairs")
SP = {f[:-4]: to_idx(Image.open(os.path.join(SD, f))) for f in os.listdir(SD) if f.endswith(".png")}
def sput(name, Y, X):
    p = SP[name]; h_, w_ = p.shape; h_ = min(h_, HPX - Y)
    if h_ > 0: img[Y:Y + h_, X:X + w_] = np.where(p[:h_] >= 0, p[:h_], img[Y:Y + h_, X:X + w_])
for r, c, n in STAIRS:
    X = c * 48
    for k in range(n): sput(f"wide2x1-{1 + (r + k) % 2}", (r + 2 * k) * 48, X)
    sput("landing-l", (r - 1) * 48, X); sput("landing-r", (r - 1) * 48, X + 48)
    sput("foot-l", (r + 2 * n) * 48, X); sput("foot-r", (r + 2 * n) * 48, X + 48)

# ---- props at b1's places, each on a flat contact shadow
PD = os.path.join(os.path.dirname(walls_d), "props"); PJ = json.load(open(os.path.join(PD, "props.json")))["pieces"]
PROP = {p["file"][:-4]: to_idx(Image.open(os.path.join(PD, p["file"]))) for p in PJ}
SHADE = {n: np.asarray(Image.open(os.path.join(PD, "shade", n + ".png"))) > 0 for n in PROP if os.path.exists(os.path.join(PD, "shade", n + ".png"))}
isl = B1[800:955, 185:300]; PROP["island-b1"] = np.where((isl == BODY) | (isl == SHAL), -1, isl)
def put(name, fx, fy, shadow=True):
    p = PROP[name]; ph, pw = p.shape; Y, X = fy - ph, fx - pw // 2
    if shadow:                                                    # a flat one-step ellipse under the foot, on grass only
        yy, xx = np.mgrid[fy - 6:fy + 3, X - 2:X + pw + 4]; e = ((xx - fx - 3) / (pw * .55)) ** 2 + ((yy - fy + 2) / 4.5) ** 2 < 1
        yy, xx = yy[e], xx[e]; k = (yy >= 0) & (yy < HPX) & (xx >= 0) & (xx < WPX); yy, xx = yy[k], xx[k]
        g = mat[img[yy, xx]] == "grass"; img[yy[g], xx[g]] = DARK[img[yy[g], xx[g]]]
    y0, x0 = max(0, Y), max(0, X); y1, x1 = min(HPX, Y + ph), min(WPX, X + pw)
    if name in SHADE:                                             # the piece's own shade mask: the ground under it one step darker
        sm = SHADE[name][y0 - Y:y1 - Y, x0 - X:x1 - X]; g = img[y0:y1, x0:x1]
        g[sm & (mat[g] == "grass")] = DARK[g[sm & (mat[g] == "grass")]]; g[sm & (g == SHAL)] = BODY
    q = p[y0 - Y:y1 - Y, x0 - X:x1 - X]; img[y0:y1, x0:x1] = np.where(q >= 0, q, img[y0:y1, x0:x1])
for name, fx, fy in FOOTPROPS: put(name, fx, fy)
land = B1[1028:1078, 410:530]; land = np.where(np.isin(mat[land], ["earth", "wood"]) | ((mat[land] == "core") & (lum[land] < 160) & (lum[land] > 60)), land, -1)
PROP["landing-b1"] = land; PROP["landing-b1-n"] = np.flipud(land)
put("landing-b1-n", 471, 800, shadow=False); put("landing-b1", 471, 1078, shadow=False)
put("bridge-1", 471, 1062, shadow=False)
put("island-b1", 245, 955, shadow=False)
for name, fx, fy in [("boulder-4", 70, 372), ("bush-1", 45, 660), ("boulder-1", 22, 682), ("fern-1", 160, 640), ("fern-3", 225, 640),
                     ("bush-2", 445, 625), ("boulder-3", 495, 668), ("fern-2", 520, 462), ("boulder-3", 470, 470), ("boulder-1", 545, 470),
                     ("boulder-4", 630, 332), ("fern-2", 565, 330), ("bush-1", 185, 380), ("reeds-1", 190, 780), ("reeds-2", 675, 1035),
                     ("fern-3", 760, 1085), ("flowers-1", 600, 545), ("flowers-2", 115, 400), ("flowers-1", 400, 1000), ("boulder-2", 830, 1145)]:
    put(name, fx, fy)

im = Image.fromarray(PAL[np.clip(img, 0, None)].astype(np.uint8))
im.save(os.path.join(out, "test-map-1x.png")); im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(out, "test-map-3x.png"))
b1im = Image.open(os.path.join(b1d, "scene-1x.png")).convert("RGB")
side = Image.new("RGB", (im.width * 2 + 8, im.height), (255, 255, 255)); side.paste(b1im, (0, 0)); side.paste(im, (im.width + 8, 0))
side.save(os.path.join(out, "beside-b1-1x.png"))
print("test map", im.size, "faces", int(FACE.sum()), "runs", len(RUNS), "colours", len(np.unique(img)))
