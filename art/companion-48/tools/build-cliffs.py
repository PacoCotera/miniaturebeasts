"""Terrain slice 1 (grass): the cliff lip quarters, the cliff faces, the stairs and the bridge, drawn on the signed 48 ramps.

Pieces are index arrays (-1 transparent, -2 shade: the cell underneath goes one DARK step), written as RGBA PNGs with the
shade pixels kept in a separate mask file (shade/<name>.png: 128 one DARK step, 255 two), light pixels in light/<name>.png (one LIGHT step). Nothing here is generated: every pixel is
set by this script from the palette's rock (night slate stone rock rockL), wood (soil bark clay sand) and grass ramps, with
seeded, tile-periodic detail so every piece joins its neighbours.

  lip-<q>-<state>.png   24x24 quarters, q in nw ne se sw, state in fill edgeh edgev outer inner (overlays on the plateau grass)
  face-<l><r>[-v].png   48x48 faces on the cell below a plateau's south edge, l/r in e (open end) c (continues)
  foot-shadow.png       48x48 overlay on the cell under a face (shade only)
  foot-foam-<f>.png     48x48 overlay on a water cell under a face, frames 1 2
  stairs.png, stairs-top.png  the stair in a face cell and its landing on the plateau cell above
  bridge-ew-w|m|e.png, bridge-ns-n|m|s.png   deck overlays on water / bank cells

usage: python3 -I build-cliffs.py OUT_DIR [MATERIALS_DIR]
(with MATERIALS_DIR the faces take the Retro Diffusion rock and the decks the Retro Diffusion planks; without it, both are scripted)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal

P = pal.load(); C = P.index
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
MAT = sys.argv[2] if len(sys.argv) > 2 else None      # terrain-materials.py output: the paid rock and planks, when given
def mat(n): return np.asarray(Image.open(os.path.join(MAT, n + ".png")).convert("RGBA")) if MAT else None
T = -1; SH = -2; LT = -3; SH2 = -4
B4 = np.array(pal.BAYER4)
def from_rgba(a):
    import quant
    return quant.quantize(a)

def rng(seed): return np.random.RandomState(seed)

def save(name, a):
    img = P.to_image(np.where(a >= 0, a, -1)); img.save(os.path.join(out, name + ".png"))
    if (a == LT).any():
        m = np.where(a == LT, 255, 0).astype(np.uint8); os.makedirs(os.path.join(out, "light"), exist_ok=True)
        Image.fromarray(m, "L").save(os.path.join(out, "light", name + ".png"))
    if (a == SH).any() or (a == SH2).any():
        m = np.where(a == SH2, 255, np.where(a == SH, 128, 0)).astype(np.uint8); os.makedirs(os.path.join(out, "shade"), exist_ok=True)
        Image.fromarray(m, "L").save(os.path.join(out, "shade", name + ".png"))

# ---------------------------------------------------------------- lip quarters (overlays on the plateau grass, 24x24)
# Geometry first. A plateau's edge sits INSET px inside its cell on a lower north, west or east side (0 on the south, where the
# face hangs from the cell edge, and 0 on a side that meets a face), so a corner has room to turn:
#   outer corners are cut on a radius of R_OUT, inner corners on a fillet of R_IN, and the straight runs waver by a 24 px periodic
#   offset that is 0 at the quarter's ends (so every quarter joins every other).
# Then light, by side (the light is at the top left): north a lit rock lip, west a lit strip of the rock, east a wider strip in
# shade, south the turf overhang over the face. Grass clumps hang over every lip at uneven intervals; the grass at a lit edge is one
# LIGHT step up, at a shaded edge one DARK step down; the ground beyond a shaded edge takes the cast shadow.
INSET, R_OUT, R_IN = 6, 12, 6
WAVE = [0, 0, 1, 1, 0, -1, -1, 0, 1, 2, 1, 0, 0, -1, 0, 1, 1, 0, -1, -2, -1, 0, 0, 0]       # the edge's waver, 24-periodic, 0 at both ends
TUFT = [0, 2, 3, 1, 0, 0, 2, 3, 3, 1, 0, 1, 0, 0, 3, 2, 0, 1, 2, 3, 2, 0, 0, 0]             # grass hanging over the lip
LIPW = {"n": 4, "w": 4, "e": 9, "s": 0}      # north and west: a lit lip; east: a face in shade
MARGIN = [16, 16, 13, 10, 8, 5, 3, 1]
SHINE = [16, 14, 10, 6, 3]
SIDE = from_rgba(mat("side-rock")) if MAT else None
CAST = [32, 32, 32, 32, 28, 24, 16, 16, 15, 14, 12, 10, 8, 6, 4, 2]   # a broad cast shadow: two DARK steps near the rock, one beyond, dithered off
def cast(y, x, d):
    if d < 0 or d >= len(CAST): return T
    v = CAST[d]
    if v > 16: return SH2 if B4[y % 4, x % 4] < v - 16 else SH
    return SH if B4[y % 4, x % 4] < v else T
def rock_px(y, x, lit):
    if SIDE is None: return C["rock"] if lit else C["stone"]
    v = SIDE[y % 48, x % 16]
    return v if lit else P.dark[v]

def lower_mask(state, hside, vside, dh, dv):
    """True where the quarter (normalised: the tile's corner at u=v=0, extended -16..39) is lower ground."""
    U, V = np.meshgrid(np.arange(-16, 40), np.arange(-16, 40))
    t_u, t_v = np.mod(U, 24), np.mod(V, 24)
    wu, wv = np.array(WAVE)[t_u], np.array(WAVE)[t_v]
    hl = V < dh + (wu if dh else 0)                 # below the horizontal side's edge
    vl = U < dv + (wv if dv else 0)
    if state == "fill": return np.zeros(U.shape, bool)
    if state == "edgeh": return hl
    if state.startswith("edgev"): return vl
    if state.startswith("outer"):
        m = hl | vl
        cx, cy = dv + R_OUT, dh + R_OUT
        corner = (U < cx) & (V < cy) & ((U - cx) ** 2 + (V - cy) ** 2 > R_OUT ** 2)
        return m | corner
    if state == "inner":
        # the two neighbours' lower strips meet in this corner: the lower ground here is the notch where they cross (u < dv and
        # v < dh), its inner corner rounded, so the plateau's edge turns in a curve, not a right angle
        cx, cy = dv - R_IN, dh - R_IN
        m = (U < dv) & (V < dh)
        m &= ~((U > cx) & (V > cy) & ((U - cx) ** 2 + (V - cy) ** 2 > R_IN ** 2))
        # beyond the quarter the strips run on (for the distances): the strip above (u < dv) and the strip beside (v < dh)
        m |= ((V < 0) & (U < dv)) | ((U < 0) & (V < dh))
        return m

def lip(quad, state):
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw")
    hside = "n" if north else "s"; vside = "w" if west else "e"
    dh = INSET if north else 0
    dv = 0 if state.endswith("0") else INSET
    low = lower_mask(state, hside, vside, dh, dv)
    # nearest lower pixel for every pixel of the quarter (search within 16 px on the extended grid)
    q = np.full((24, 24), T, dtype=np.int64)
    if state == "fill": return q
    if state == "inner" and not north: return q     # a south inner corner: the side strip below ends under the turf; nothing to draw here
    pts = np.argwhere(low)
    for y in range(24):
        for x in range(24):
            u = x if west else 23 - x; v = y if north else 23 - y      # normalised
            gu, gv = u + 16, v + 16
            if low[gv, gu]:
                # lower ground under a north or west lip: a darker band 3 px deep, so the edge reads as a step, not a crack
                k = 0
                while k < 4 and gu + k + 1 < low.shape[1] and low[gv, gu + k + 1]: k += 1
                kv = 0
                while kv < 4 and gv + kv + 1 < low.shape[0] and low[gv + kv + 1, gu]: kv += 1
                if vside == "w" and k < 3 and not low[gv, gu + k + 1]: q[y, x] = SH2 if k == 0 else SH; continue
                if hside == "n" and kv < 3 and not low[gv + kv + 1, gu]: q[y, x] = SH2 if kv == 0 else SH; continue
                # lower ground: the cast shadow beyond a shaded (east) side, measured from the plateau's edge
                if vside == "e":
                    k = 0
                    while gu + k + 1 < low.shape[1] and low[gv, gu + k + 1] and k < 20: k += 1
                    if gu + k + 1 < low.shape[1] and not low[gv, gu + k + 1]: q[y, x] = cast(y, x, k)
                continue
            if len(pts) == 0: continue
            d2 = (pts[:, 0] - gv) ** 2 + (pts[:, 1] - gu) ** 2; i = int(np.argmin(d2)); d = int(round(d2[i] ** .5))
            if d > 16: continue
            dvv, duu = pts[i, 0] - gv, pts[i, 1] - gu
            side = vside if abs(duu) >= abs(dvv) else hside
            if side == "s": continue                    # the south edge is drawn below (the turf overhang), not by distance
            t = (y if side in ("w", "e") else x) % 24
            wdt = LIPW[side] + (1 if TUFT[t] > 2 else 0)
            if d == 1: q[y, x] = C["night"]
            elif d <= wdt:
                if side in ("n", "w"): q[y, x] = (C["rockL"], C["rockL"], C["rock"])[min(2, d - 2)]
                else: q[y, x] = rock_px(y + (0 if north else 24), x, False)
                if side == "e" and d >= wdt - TUFT[t] + 1: q[y, x] = C["leaf"] if d < wdt else C["forest"]   # clumps hang over the east face
            elif d == wdt + 1: q[y, x] = C["forest"] if side == "e" else C["lime"]
            elif d <= wdt + 1 + TUFT[t] // 2: q[y, x] = C["leaf"] if side == "e" else C["sprout"]
            else:
                k = d - wdt - 2 - TUFT[t] // 2
                if k < len(SHINE) and B4[y % 4, x % 4] < SHINE[k]: q[y, x] = LT                # the top surface's lit rim, on every side
    # the south edge: the turf hangs over the face below in uneven clumps, a dark underside
    if not north and state in ("edgeh", "outer", "outer0"):
        for x in range(24):
            u = x if west else 23 - x
            if state.startswith("outer") and u < dv: continue
            t = x % 24
            if TUFT[t] >= 2: q[23, x] = C["leaf"]
            if TUFT[t] >= 3: q[22, x] = C["leaf"]
            for k, dens in enumerate(SHINE):                                              # the lit rim above the drop
                y = 21 - (TUFT[t] >= 3) - k
                if q[y, x] == T and B4[y % 4, x % 4] < dens: q[y, x] = LT

    return q

def region(quad, state):
    """the quarter's plateau top (255) and the lower ground inside it (0): for the raised top's lighter grass."""
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw")
    low = lower_mask(state, "n" if north else "s", "w" if west else "e", INSET if north else 0, 0 if state.endswith("0") else INSET)
    m = np.zeros((24, 24), np.uint8)
    for y in range(24):
        for x in range(24):
            u = x if west else 23 - x; v = y if north else 23 - y
            m[y, x] = 0 if (state != "fill" and low[v + 16, u + 16]) else 255
    return m

os.makedirs(os.path.join(out, "region"), exist_ok=True)
for quad in ("nw", "ne", "se", "sw"):
    for st in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner"):
        save(f"lip-{quad}-{st}", lip(quad, st))
        Image.fromarray(region(quad, st), "L").save(os.path.join(out, "region", f"lip-{quad}-{st}.png"))

# ---------------------------------------------------------------- the rock face (48x48, on the cell below the south edge)
# The face: blocky rock chunks in courses, each chunk lit on its top and left edge and shaded at its foot and right edge, the
# whole face lighter at the top (sun) and darker toward the foot (the ground's occlusion). Course boundaries wander by a 48-periodic
# offset that is 0 at both tile edges, so every face joins every other.
COURSES = [(4, 19), (19, 34), (34, 48)]
TONE = ["rock", "rock", "stone"]                                    # top courses lighter, foot darker

def wander(seed):
    r = rng(seed); w = np.zeros(48, dtype=int)
    for x in range(3, 45): w[x] = int(round(3.2 * np.sin((x - 3) / 42 * np.pi * r.choice([1, 2])) * r.choice([-1, 1])))
    return w

def face_body(seed, variant=0):
    r = rng(seed); f = np.zeros((48, 48), dtype=np.int64)
    walls = [np.zeros(48, int)] + [wander(seed * 10 + i) for i in range(1, len(COURSES))]
    cid = np.zeros((48, 48), int)
    for x in range(48):
        for i, (y0, y1) in enumerate(COURSES):
            top = y0 + walls[i][x]; bot = (COURSES[i + 1][0] + walls[i + 1][x]) if i + 1 < len(COURSES) else 48
            cid[top:bot, x] = i
    cid[:4, :] = -1
    joints = []
    for i in range(len(COURSES)):
        xs = [0]; x = r.randint(7, 15)
        while x < 38: xs.append(x); x += r.randint(13, 22)
        xs.append(48); joints.append(xs)
    for y in range(4, 48):
        for x in range(48):
            i = cid[y, x]; base = C[TONE[i]]
            col = np.where(cid[:, x] == i)[0]; t0, t1 = col.min(), col.max()
            sx = x - ((y - t0) // 3) * (1 if (i + variant) % 2 else -1)              # joints lean: rock, not masonry
            xs = joints[i]; sx = min(47, max(0, sx)); a = max(j for j in xs if j <= sx); b = min(j for j in xs if j > sx)
            u = (sx - a) / (b - a)
            v = base
            if y == t0: v = C["rockL"]                                             # the chunk's lit top
            elif y == t1: v = C["night"] if i < len(COURSES) - 1 else C["slate"]   # its shaded underside
            elif y == t1 - 1 and B4[y % 4, x % 4] < 10: v = P.dark[base]
            elif sx == a and a > 0 and 2 < x < 45: v = C["night"]                  # the joint
            elif sx == a + 1 and a > 0 and 2 < x < 45: v = C["rockL"] if y < t1 - 1 else base
            elif sx == b - 1 and y == t0 + 1 and b < 48: v = P.dark[base]          # the chunk's top-right corner rounds off
            elif u > .72 and B4[y % 4, x % 4] < 8: v = P.dark[base]               # fall-off toward the chunk's right
            elif y == t0 + 1 and u < .4: v = C["rockL"] if B4[0, x % 4] < 6 else base
            f[y, x] = v
    # a few cracks and pebbles inside chunks
    for i, (y0, y1) in enumerate(COURSES):
        x = r.randint(6, 42); y = y0 + r.randint(3, 6)
        for k in range(r.randint(2, 4)):
            if 4 <= y + k < 48 and f[y + k, x] not in (C["night"],): f[y + k, x] = C["slate"]
    # occlusion toward the foot
    for y in range(40, 48):
        for x in range(48):
            if B4[y % 4, x % 4] < (y - 39) * 2 and f[y, x] != C["night"]: f[y, x] = P.dark[f[y, x]]
    # the soil under the turf, the turf hanging over it
    f[0:4, :] = C["bark"]; f[3, :] = C["soil"]
    for x in range(48):
        if B4[0, x % 4] < 4: f[1, x] = C["soil"]
        d = [3, 4, 2, 5, 3, 1, 4, 2][(x * 5 + variant * 3) % 8] if 2 <= x <= 45 else 2
        for y in range(d): f[y, x] = C["leaf"] if y < d - 1 else C["forest"]
    return f

def face(left, right, variant=0, top=True, foot=True):
    f = face_body(11 + variant, variant)
    if MAT:
        f = from_rgba(mat("face-rock2" if variant % 2 else "face-rock"))
        if variant > 1:                                                                    # the variant: the same rock (so it joins), its own cracks
            rv = rng(70 + variant)
            for _ in range(3):
                x = rv.randint(5, 42); y0 = rv.randint(12, 30)
                for y in range(y0, y0 + rv.randint(4, 9)):
                    f[y, x] = C["night"]
                    if f[y, x + 1] != C["night"]: f[y, x + 1] = C["rockL"] if (y - y0) % 3 else f[y, x + 1]
                    x += rv.choice([0, 0, 1, -1])
        for y in range(40, 48):                                                       # occlusion toward the foot, as the scripted face
            for x in range(48):
                if B4[y % 4, x % 4] < (y - 39) * 2 and f[y, x] != C["night"]: f[y, x] = P.dark[f[y, x]]
    # the foot is uneven: boulders bulge at the base (0-3 px), 48-periodic and 0 at both edges so faces join
    FOOT = [0, 0, 1, 3, 4, 4, 3, 1, 0, 0, 2, 4, 5, 5, 4, 2, 1, 0, 1, 2, 2, 1, 0, 0, 1, 3, 5, 5, 4, 3, 1, 0, 0, 1, 2, 4, 4, 3, 1, 0, 0, 2, 3, 3, 2, 1, 0, 0]
    fv = [(FOOT[(x + 11 * variant) % 48] if 0 < x < 47 else 0) for x in range(48)]
    if variant: fv[0] = fv[47] = 0
    if not top:                                                                        # a face stacked under another: rock up to its top, no turf
        GRS = (C["leaf"], C["grass"], C["forest"], C["sprout"], C["lime"], C["pine"], C["bark"], C["soil"])
        for x in range(48):
            for y in range(12):
                if f[y, x] in GRS: f[y, x] = f[y + 12, x]
    for x in range(48 if foot else 0):
        for k in range(fv[x]):
            y = 47 - k; f[y, x] = cast(y, x, 0)                                       # below a raised boulder: the ground, in its shadow
        y = 47 - fv[x]; f[y, x] = C["night"]
        if f[y - 1, x] != C["night"]: f[y - 1, x] = P.dark[f[y - 1, x]]
    # open ends: the face starts INSET px in, under the plateau's side strip, and curves round like a cylinder:
    # rounded at the foot (radius 10), the west end lit, the east end in shade, the ground beyond the east end in the cast shadow
    RE = 12
    WOB = [0, 0, 1, 1, 2, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 2, 2, 3, 2, 1, 0, 0, 0, 1, 1, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0]
    def end(west):
        for y in range(48):
            for j in range(48):
                x = j if west else 47 - j
                u = j - INSET - WOB[y]                                                # distance into the face from its (wobbling) end
                if u < 0:
                    f[y, x] = T if west else cast(y, x, -u - 1)
                    continue
                if y > 47 - RE and u < RE and (u - RE) ** 2 + (y - (47 - RE)) ** 2 > RE ** 2:
                    f[y, x] = T if west else cast(y, x, 0); continue
                if u == 0 or (y > 47 - RE and u < RE and (u - RE) ** 2 + (y - (47 - RE)) ** 2 > (RE - 1) ** 2): f[y, x] = C["night"]; continue
                if u < 6 and f[y, x] not in (C["night"],) and y > 3:
                    f[y, x] = (P.light[f[y, x]] if u < 3 else f[y, x]) if west else (P.dark2[f[y, x]] if u < 3 else P.dark[f[y, x]])
    if left == "e": end(True)
    if right == "e": end(False)
    # the turf hangs over the rock top in uneven clumps (1-8 px), with gaps where the rock's lit lip shows; 48-periodic, short at both edges
    HANG = [2, 2, 3, 5, 7, 8, 6, 3, 1, 1, 0, 1, 3, 4, 3, 2, 2, 4, 6, 7, 5, 2, 1, 0, 0, 2, 3, 6, 8, 7, 4, 2, 1, 1, 3, 3, 2, 1, 0, 1, 4, 6, 5, 3, 2, 2, 2, 2]
    for x in range(48 if top else 0):
        if f[0, x] == T: continue
        h = HANG[(x + 13 * variant) % 48] if 3 < x < 44 else 2
        top = 0
        while top < 48 and f[top, x] in (C["leaf"], C["grass"], C["forest"], C["sprout"], C["lime"], C["pine"]): top += 1   # the material's own turf
        for y in range(top, min(47, top + h)):
            if f[y, x] in (T, C["night"]): break
            f[y, x] = C["leaf"] if y < top + h - 1 else C["forest"]
        if h == 0 and top < 47 and f[top, x] not in (T, C["night"]): f[top, x] = C["rockL"]
    return f

for l in ("e", "c"):
    for rr in ("e", "c"):
        save(f"face-{l}{rr}", face(l, rr))
save("face-cc-v", face("c", "c", 1)); save("face-cc-v2", face("c", "c", 2)); save("face-cc-v3", face("c", "c", 3))
# stacked faces (a drop of two levels in one wall): the upper without its foot, the lower without its turf, so the rock runs on
for l in ("e", "c"):
    for rr in ("e", "c"):
        save(f"face-{l}{rr}-nf", face(l, rr, foot=False)); save(f"face-{l}{rr}-nt", face(l, rr, top=False))
for v in (1, 2, 3):
    save(f"face-cc-v{'' if v == 1 else v}-nf", face("c", "c", v, foot=False)); save(f"face-cc-v{'' if v == 1 else v}-nt", face("c", "c", v, top=False))

# the shade under a face: four rows Bayer-dithered (the ground under it one DARK step), denser at the top
sh = np.full((48, 48), T, dtype=np.int64)

for y in range(len(CAST)):
    for x in range(48): sh[y, x] = cast(y, x, y)
save("foot-shadow", sh)

# the shade a plateau's east side (or a face's open east end) casts on the lower cell to its east: the light is at the top left
se = np.full((48, 48), T, dtype=np.int64)
for x in range(len(CAST)):
    for y in range(48): se[y, x] = cast(y, x, x + INSET)
save("side-shadow-e", se)
# where a face's open east end stands, the shadow wraps the corner: the cell diagonal from it gets a quarter of the cast
co = np.full((48, 48), T, dtype=np.int64)
for y in range(len(CAST)):
    for x in range(len(CAST)):
        co[y, x] = cast(y, x, int(round((x * x + y * y) ** .5)))
save("corner-shadow-se", co)

# foam where a face stands in water: a broken white/ice line on the water's top rows, two frames
for fno in (1, 2):
    fo = np.full((48, 48), T, dtype=np.int64)
    off = 0 if fno == 1 else 3
    for x in range(48):
        p = (x + off) % 6
        fo[0, x] = C["white"] if p < 4 else C["ice"]
        if p in (1, 2): fo[1, x] = C["ice"]
        if p == 2 and (x // 6) % 2 == fno - 1: fo[2, x] = C["ice"]
        if B4[0, x % 4] < 6: fo[3, x] = SH
    save(f"foot-foam-{fno}", fo)

# ---------------------------------------------------------------- stairs (in a face cell), the landing above, the bottom step below
# A stair reads by alternating bands: each tread a lit flat strip with a 1 px highlight on its nosing, each riser a darker band with
# the darkest line under the nosing; cheek walls either side (the left lit, the right in shade, casting a little shadow across
# the treads); a landing cut into the lip above; a wider bottom step on the ground with its own shadow.
st = face("c", "c")
X0, X1 = 15, 33                 # the treads
CW = 6                          # the cheeks
STEPS = [(1, 9), (10, 9), (19, 9), (28, 9), (37, 10)]   # (top, height): five steps, the last to the foot
for y in range(48):
    for x in range(X0 - CW, X1 + CW):
        if X0 <= x < X1: continue
        lit = x < X0
        st[y, x] = (C["rock"] if lit else C["stone"]) if y > 1 else C["leaf"]
    st[y, X0 - CW] = C["night"]; st[y, X1 + CW - 1] = C["night"]
    st[y, X0 - CW + 1] = C["rockL"] if y > 1 else st[y, X0 - CW + 1]               # the lit cheek's outer highlight
    st[y, X0 - 1] = C["slate"]; st[y, X1] = C["night"]                              # the cheeks' inner faces
for i, (t, h) in enumerate(STEPS):
    for y in range(t, min(48, t + h)):
        k = y - t
        for x in range(X0, X1):
            if k == 0: v = C["fog"]                                                  # the nosing, catching the light
            elif k < h - 4: v = C["rockL"] if (x + 2 * y + i) % 13 else C["rock"]   # the tread, lit, a little worn
            elif k == h - 4: v = C["slate"]                                          # the shadow under the nosing
            else: v = C["rock"] if k < h - 2 else C["stone"]                        # the riser, a step darker than the tread
            st[y, x] = v
    for y in range(t, min(48, t + h - 4)):                                           # the right cheek's shadow across the tread
        for x in range(X1 - 3, X1):
            if B4[y % 4, x % 4] < (x - (X1 - 4)) * 4: st[y, x] = P.dark[st[y, x]]
save("stairs", st)
top = np.full((48, 48), T, dtype=np.int64)          # the landing: flush with the grass, worn stone running into the turf, no frame
for y in range(36, 48):
    for x in range(X0 - 2, X1 + 2):
        e = min(x - (X0 - 2), (X1 + 1) - x)                                         # distance from the landing's sides
        if y < 40 and e < 3 - (y - 36) // 2: continue                               # the far corners rounded into the grass
        if B4[y % 4, x % 4] < max(0, 40 - y) * 4 and y < 40: continue              # the far edge breaks up into the turf
        top[y, x] = C["rockL"] if (x * 3 + y) % 9 else C["rock"]
    top[y, X0 - 3] = C["forest"] if y > 38 else top[y, X0 - 3]; top[y, X1 + 2] = C["forest"] if y > 38 else top[y, X1 + 2]
save("stairs-top", top)
bot = np.full((48, 48), T, dtype=np.int64)          # the bottom step: a slab on the ground in front of the stair, and its shadow
for y in range(0, 6):
    for x in range(X0 - 3, X1 + 3):
        bot[y, x] = C["rockL"] if y == 0 else (C["rock"] if y < 4 else (C["stone"] if y == 4 else C["night"]))
    bot[y, X0 - 3] = C["night"]; bot[y, X1 + 2] = C["night"]
for y in range(6, 10):
    for x in range(X0 - 2, X1 + 5): bot[y, x] = cast(y, x, y - 4)
save("stairs-foot", bot)

# the wide stair: two face cells, 96 px; treads 60 px between rock cheeks that wrap the face, as tall as the face it climbs
W2 = np.hstack([face("c", "c"), face("c", "c", 1)])
A0, A1, CW2 = 18, 78, 8
for y in range(48):
    for x in range(A0 - CW2, A1 + CW2):
        if A0 <= x < A1: continue
        lit = x < A0
        if y < 3: continue                                                            # the turf runs over the cheeks
        W2[y, x] = rock_px(y, x, lit) if MAT else (C["rock"] if lit else C["stone"])
    W2[y, A0 - CW2] = C["night"] if y > 2 else W2[y, A0 - CW2]; W2[y, A1 + CW2 - 1] = C["night"] if y > 2 else W2[y, A1 + CW2 - 1]
    W2[y, A0 - 1] = C["slate"]; W2[y, A1] = C["night"]
    if y > 2: W2[y, A0 - CW2 + 1] = C["rockL"]
for i, (t, h) in enumerate(STEPS):
    for y in range(t, min(48, t + h)):
        k = y - t
        for x in range(A0, A1):
            if k == 0: v = C["fog"]
            elif k < h - 4: v = C["rockL"] if (x + 2 * y + i) % 13 else C["rock"]
            elif k == h - 4: v = C["slate"]
            else: v = C["rock"] if k < h - 2 else C["stone"]
            W2[y, x] = v
    for y in range(t, min(48, t + h - 4)):
        for x in range(A1 - 4, A1):
            if B4[y % 4, x % 4] < (x - (A1 - 5)) * 3: W2[y, x] = P.dark[W2[y, x]]
save("stairs2-l", W2[:, :48]); save("stairs2-r", W2[:, 48:])
T2 = np.full((48, 96), T, dtype=np.int64)            # the landing: a worn strip of stone, flush, fading into the grass
for y in range(41, 48):
    for x in range(A0, A1):
        if B4[y % 4, x % 4] < (y - 40) * 3 or y >= 46: T2[y, x] = C["rockL"] if (x * 3 + y) % 7 else C["rock"]
save("stairs2-top-l", T2[:, :48]); save("stairs2-top-r", T2[:, 48:])
B2 = np.full((48, 96), T, dtype=np.int64)
for y in range(0, 6):
    for x in range(A0 - 4, A1 + 4):
        B2[y, x] = C["rockL"] if y == 0 else (C["rock"] if y < 4 else (C["stone"] if y == 4 else C["night"]))
    B2[y, A0 - 4] = C["night"]; B2[y, A1 + 3] = C["night"]
for y in range(6, 10):
    for x in range(A0 - 3, A1 + 7): B2[y, x] = cast(y, x, y - 4)
save("stairs2-foot-l", B2[:, :48]); save("stairs2-foot-r", B2[:, 48:])

# ---------------------------------------------------------------- the bridge (plank decks over water, posts at the ends)
PLANKS = from_rgba(mat("planks")) if MAT else None          # planks running left to right
def deck_ew(posts):
    b = np.full((48, 48), T, dtype=np.int64)
    Y0, Y1 = 11, 37
    for x in range(48):
        for y in range(Y0, Y1):
            k = x % 6
            b[y, x] = PLANKS.T[y, x] if MAT else (C["soil"] if k == 5 else (C["clay"] if k in (0, 1) else C["bark"]))
        b[Y0 - 2, x] = C["sand"]; b[Y0 - 1, x] = C["bark"]; b[Y1, x] = C["bark"]; b[Y1 + 1, x] = C["soil"]
        for y in range(Y1 + 2, Y1 + 6):
            if B4[y % 4, x % 4] < (14, 10, 6, 3)[y - Y1 - 2]: b[y, x] = SH
        if x % 6 == 2 and not MAT: b[Y0 + 3, x] = C["soil"]; b[Y1 - 4, x] = C["soil"]          # nail heads
    for px in posts:
        for y0 in (Y0 - 6, Y1 - 4):
            b[y0:y0 + 8, px:px + 5] = C["bark"]; b[y0, px:px + 5] = C["sand"]; b[y0 + 1, px:px + 5] = C["clay"]
            b[y0:y0 + 8, px] = C["clay"]; b[y0:y0 + 8, px + 4] = C["soil"]; b[y0 + 8, px:px + 5] = C["soil"]
            for y in range(y0 + 9, y0 + 11):
                for x in range(px + 2, px + 7):
                    if 0 <= x < 48 and b[y, x] == T: b[y, x] = SH
    return b
def deck_ns(posts):
    b = np.full((48, 48), T, dtype=np.int64)
    X0, X1 = 11, 37
    for y in range(48):
        for x in range(X0, X1):
            k = y % 6
            b[y, x] = PLANKS[y, x] if MAT else (C["soil"] if k == 5 else (C["clay"] if k in (0, 1) else C["bark"]))
        b[y, X0 - 2] = C["sand"]; b[y, X0 - 1] = C["bark"]; b[y, X1] = C["bark"]; b[y, X1 + 1] = C["soil"]
        for x in range(X1 + 2, X1 + 6):
            if B4[y % 4, x % 4] < (14, 10, 6, 3)[x - X1 - 2]: b[y, x] = SH
        if y % 6 == 2 and not MAT: b[y, X0 + 3] = C["soil"]; b[y, X1 - 4] = C["soil"]
    for py in posts:
        for x0 in (X0 - 6, X1 + 1):
            b[py:py + 8, x0:x0 + 5] = C["bark"]; b[py, x0:x0 + 5] = C["sand"]; b[py + 1, x0:x0 + 5] = C["clay"]
            b[py:py + 8, x0] = C["clay"]; b[py:py + 8, x0 + 4] = C["soil"]; b[py + 8, x0:x0 + 5] = C["soil"]
            for y in range(py + 9, min(48, py + 11)):
                for x in range(x0 + 2, min(48, x0 + 7)):
                    if b[y, x] == T: b[y, x] = SH
    return b
save("bridge-ew-w", deck_ew([2])); save("bridge-ew-m", deck_ew([])); save("bridge-ew-e", deck_ew([41]))
save("bridge-ns-n", deck_ns([2])); save("bridge-ns-m", deck_ns([])); save("bridge-ns-s", deck_ns([36]))
print("pieces written to", out)
