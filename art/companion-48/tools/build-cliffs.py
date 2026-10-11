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

# ---------------------------------------------------------------- the grass edge: a tile-periodic ragged line
# depth of the turf's ragged edge at each of 24 positions along a quarter's edge; 0 at both ends so quarters join.
EDGE = [0, 1, 1, 0, 1, 2, 1, 1, 0, 1, 1, 2, 2, 1, 0, 1, 1, 0, 1, 2, 1, 1, 0, 0]

# ---------------------------------------------------------------- lip quarters (overlays on the plateau grass, 24x24)
def rim_north(q):
    """the plateau's north edge across a quarter: drop line, lit rock lip, turf ragged edge."""
    for x in range(24):
        q[0, x] = C["night"]; q[1, x] = C["rockL"]; q[2, x] = C["rockL"]; q[3, x] = C["rock"]; q[4, x] = C["stone"]; q[5, x] = C["forest"]
        for k in range(EDGE[x]): q[6 + k, x] = C["leaf"]
        for k, dens in enumerate(MARGIN): 
            y = 6 + k
            if q[y, x] == T and B4[y % 4, x % 4] < dens: q[y, x] = SH
def rim_south(q):
    """the plateau's south edge (the face starts on the cell below): turf overhang, dark underside."""
    for x in range(24):
        d = EDGE[x]
        q[23, x] = C["forest"]; q[22, x] = C["leaf"]
        for k in range(d): q[21 - k, x] = C["leaf"]
MARGIN = [16, 16, 13, 10, 8, 5, 3, 1]  # the grass inside a shaded (east) ledge one DARK step darker, fading over 8 px (Bayer thresholds of 16)
SHINE = [12, 8, 4]                     # the sunlit (north, west) ledges: the grass at the edge one LIGHT step lighter, fading over 3 px
SIDE = from_rgba(mat("side-rock")) if MAT else None
EW, WW = 11, 8                         # the east side's rock strip is 11 px (in shade), the west's 8 px (lit)
def side_px(y, x, light):
    if SIDE is None: return C["stone"] if not light else C["rockL"]
    v = SIDE[y % 48, x % 16]
    return v if light else P.dark[v]                  # the lit west side shows the rock as it is; the east side one DARK step down
def rim_north(q, y0=0):
    """the plateau's north edge: drop line, lit rock lip, the sunlit grass edge, the turf's ragged line."""
    for x in range(24):
        q[0, x] = C["night"]; q[1, x] = C["rockL"]; q[2, x] = C["rock"]; q[3, x] = C["stone"]; q[4, x] = C["forest"]
        for k in range(EDGE[x]): q[5 + k, x] = C["leaf"]
        for k, dens in enumerate(SHINE):
            y = 5 + EDGE[x] + k
            if q[y, x] == T and B4[y % 4, x % 4] < dens: q[y, x] = LT
def rim_south(q):
    """the plateau's south edge (the face starts on the cell below): turf overhang, dark underside."""
    for x in range(24):
        d = EDGE[x]
        q[23, x] = C["forest"]; q[22, x] = C["leaf"]
        for k in range(d): q[21 - k, x] = C["leaf"]
def rim_west(q, y0=0):
    for y in range(24):
        q[y, 0] = C["night"]
        for i in range(1, WW): q[y, i] = side_px(y0 + y, i, True)
        q[y, WW] = C["forest"]
        for k in range(EDGE[y]): q[y, WW + 1 + k] = C["leaf"]
        for k, dens in enumerate(SHINE):
            x = WW + 1 + EDGE[y] + k
            if q[y, x] == T and B4[y % 4, x % 4] < dens: q[y, x] = LT
def rim_east(q, y0=0):
    for y in range(24):
        q[y, 23] = C["night"]
        for i in range(1, EW): q[y, 23 - i] = side_px(y0 + y, 16 - i, False)
        q[y, 23 - EW] = C["forest"]
        for k in range(EDGE[y]): q[y, 22 - EW - k] = C["leaf"]
        for k, dens in enumerate(MARGIN):
            x = 22 - EW - EDGE[y] - k
            if x >= 0 and q[y, x] == T and B4[y % 4, x % 4] < dens: q[y, x] = SH

def lip(quad, state):
    q = np.full((24, 24), T, dtype=np.int64)
    y0 = 0 if quad in ("nw", "ne") else 24                  # the side strips' rock continues down the tile
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw")
    n_or_s = rim_north if north else rim_south
    w_or_e = (lambda z: rim_west(z, y0)) if west else (lambda z: rim_east(z, y0))
    if state == "fill": return q
    if state == "edgeh": n_or_s(q); return q
    if state == "edgev": w_or_e(q); return q
    if state == "outer":
        a = np.full((24, 24), T, dtype=np.int64); b = a.copy(); n_or_s(a); w_or_e(b)
        q = np.where(a >= 0, a, b) if north else np.where(b >= 0, b, a)   # north: the lip runs over the strip; south: the strip runs down to the face
        cy = 0 if north else 23; cx = 0 if west else 23
        sy = 1 if cy == 0 else -1; sx = 1 if cx == 0 else -1
        for dy in range(4):
            for dx in range(4):
                if (3 - dy) ** 2 + (3 - dx) ** 2 > 10: q[cy + sy * dy, cx + sx * dx] = T
                elif (3 - dy) ** 2 + (3 - dx) ** 2 > 5: q[cy + sy * dy, cx + sx * dx] = C["night"]
        return q
    if state == "inner":
        # only the diagonal is lower. North: the side strip of the cell above runs down into this cell's top rows and meets the
        # neighbour's north lip; south: the turf overhang turns the corner and the side strip below ends under it.
        if north:
            b = np.full((24, 24), T, dtype=np.int64); w_or_e(b)
            wdt = WW + 1 if west else EW + 1
            for y in range(5):
                for j in range(wdt):
                    x = j if west else 23 - j
                    q[y, x] = C["forest"] if y == 4 else b[y, x]
        else:
            for k in range(2):
                for j in range(4):
                    q[23 - k, j if west else 23 - j] = C["forest"] if k == 0 else C["leaf"]
        return q

for quad in ("nw", "ne", "se", "sw"):
    for st in ("fill", "edgeh", "edgev", "outer", "inner"):
        save(f"lip-{quad}-{st}", lip(quad, st))

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

def face(left, right, variant=0):
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
    if left == "e":     # open west end: lit edge, rounded foot
        for y in range(4, 48): f[y, 0] = C["night"]; f[y, 1] = C["rockL"]; f[y, 2] = C["rock"] if f[y, 2] != C["night"] else f[y, 2]
        for y in range(0, 4): f[y, 0] = C["soil"]
        for d in range(3):
            for e in range(3 - d): f[47 - d, e] = T
        f[45, 0] = C["night"]; f[46, 1] = C["night"]; f[47, 2] = C["night"]
    if right == "e":    # open east end: shaded edge, rounded foot
        for y in range(4, 48): f[y, 47] = C["night"]; f[y, 46] = C["slate"]; f[y, 45] = C["stone"] if f[y, 45] not in (C["night"],) else f[y, 45]
        for y in range(0, 4): f[y, 47] = C["soil"]
        for d in range(3):
            for e in range(3 - d): f[47 - d, 47 - e] = T
        f[45, 47] = C["night"]; f[46, 46] = C["night"]; f[47, 45] = C["night"]
    return f

for l in ("e", "c"):
    for rr in ("e", "c"):
        save(f"face-{l}{rr}", face(l, rr))
save("face-cc-v", face("c", "c", 1)); save("face-cc-v2", face("c", "c", 2)); save("face-cc-v3", face("c", "c", 3))

# the shade under a face: four rows Bayer-dithered (the ground under it one DARK step), denser at the top
sh = np.full((48, 48), T, dtype=np.int64)
CAST = [32, 32, 32, 32, 28, 24, 16, 16, 15, 14, 12, 10, 8, 6, 4, 2]   # a broad cast shadow: two DARK steps near the rock (over 16), one beyond, dithered off
def cast(y, x, d):
    if d >= len(CAST): return T
    v = CAST[d]
    if v > 16: return SH2 if B4[y % 4, x % 4] < v - 16 else SH
    return SH if B4[y % 4, x % 4] < v else T
for y in range(len(CAST)):
    for x in range(48): sh[y, x] = cast(y, x, y)
save("foot-shadow", sh)

# the shade a plateau's east side (or a face's open east end) casts on the lower cell to its east: the light is at the top left
se = np.full((48, 48), T, dtype=np.int64)
for x in range(len(CAST)):
    for y in range(48): se[y, x] = cast(y, x, x)
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

# ---------------------------------------------------------------- stairs (in a face cell) and their landing (on the plateau cell)
st = face("c", "c")
X0, X1 = 12, 36
for y in range(48):
    for x in range(X0, X1):
        st[y, x] = C["stone"]
# side walls: 2 px of lit (left) and shaded (right) rock
for y in range(48):
    st[y, X0 - 2] = C["night"]; st[y, X0 - 1] = C["rockL"]; st[y, X1] = C["slate"]; st[y, X1 + 1] = C["night"]
# six steps of 8 rows: lit tread edge, tread, riser in shade
for s in range(6):
    y = s * 8
    st[y, X0:X1] = C["rockL"]; st[y + 1:y + 5, X0:X1] = C["rock"]; st[y + 5:y + 7, X0:X1] = C["stone"]; st[y + 7, X0:X1] = C["slate"]
    st[y + 1, X0] = C["rockL"]
    for x in range(X0 + 3, X1 - 2, 7): st[y + 2, x] = C["stone"]          # wear marks
save("stairs", st)
top = np.full((48, 48), T, dtype=np.int64)
for y in range(40, 48):
    for x in range(X0 - 2, X1 + 2):
        top[y, x] = C["rock"]
top[40, X0 - 2:X1 + 2] = C["rockL"]; top[47, X0:X1] = C["rockL"]
top[40:48, X0 - 2] = C["night"]; top[40:48, X1 + 1] = C["night"]; top[41:48, X0 - 1] = C["rockL"]; top[41:48, X1] = C["slate"]
save("stairs-top", top)

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
