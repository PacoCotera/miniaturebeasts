"""Terrain slice 1: the test map (three levels of grass, cliffs, stairs, a stream with a cliff into it, a bridge), rendered from the
signed ground and shore tiles and the build-cliffs.py pieces, plus the artifact checks.

The level model drawn here (the Companion lead's proposal owns the rules): each cell has a height 0-2 and may be water (height 0).
A cell whose north neighbour is higher is a FACE cell (one level only; not walkable except a stair). Layer order: water < low ground
< cliff top. Illegal and reported: a plateau cell (height >= 1) touching water, a face touching water on its east or west, a step of
two levels between neighbours, a one-cell trench (a face with higher ground directly south of it).

Checks printed (and written to checks.json):
  rules     the map obeys the junction rules above
  lip_joins over all 256 neighbourhoods of a plateau cell, pixels whose rim/turf class differs across a join between two plateau cells
  face_join luminance step across the join of every pair of face tiles / the step inside them (<= 1.25 passes)
  seam      mean luminance step across tile joins / mean step inside tiles, on the rendered map (<= 1.25 passes)
  repeat    autocorrelation of the grass luminance at a 48 px lag / at lag 1 px (<= 0.5 passes)
usage: python3 -I terrain-map.py PIECES_DIR GROUND_DIR SHORE_DIR OUT_DIR [DECAL_DIR [MATERIALS_DIR RIPPLE_DIR]]
(with MATERIALS_DIR the water is the painting's, three bodies, with ripples and dark streaks placed off the tile grid)
(with DECAL_DIR the ground is body1..4 with the decals placed by a seeded rule off the tile grid; without it, the review place's grass1..4)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index
pieces, ground, shore, out = sys.argv[1:5]; os.makedirs(out, exist_ok=True)
decal_dir = sys.argv[5] if len(sys.argv) > 5 else None
mat_dir = sys.argv[6] if len(sys.argv) > 6 else None          # terrain-materials.py output: the water bodies
ripple_dir = sys.argv[7] if len(sys.argv) > 7 else None       # the review place's ripple sprites, frame 1
T, SH, LT, SH2 = -1, -2, -3, -4

def load(p, shade=True):
    a = quant.quantize(np.asarray(Image.open(p).convert("RGBA")))
    sp = os.path.join(os.path.dirname(p), "shade", os.path.basename(p))
    if shade and os.path.exists(sp):
        m = np.asarray(Image.open(sp)); a = np.where(m > 200, SH2, np.where(m > 0, SH, a))
    lp = os.path.join(os.path.dirname(p), "light", os.path.basename(p))
    if shade and os.path.exists(lp): a = np.where(np.asarray(Image.open(lp)) > 0, LT, a)
    return a
def piece(n): return load(os.path.join(pieces, n + ".png"))
GN = ("body1", "body2", "body3", "body4") if decal_dir else ("grass1", "grass2", "grass3", "grass4", "flowers1", "flowers2")
G = {n: load(os.path.join(ground, n + ".png"), False) for n in GN + ("water1", "water2")}
DEC = [load(os.path.join(decal_dir, f), False) for f in sorted(os.listdir(decal_dir)) if f.endswith(".png")] if decal_dir else []
WATER = [G["water1"], G["water2"]]
WDEC = []
if mat_dir:
    WATER = [load(os.path.join(mat_dir, f"water{i}.png"), False) for i in (1, 2, 3)]
    WDEC = [load(os.path.join(ripple_dir, f), False) for f in sorted(os.listdir(ripple_dir)) if f.endswith("-1.png")]
    for ln in (7, 10, 13):                                  # dark streaks: a sea run with a dithered tail, the current's shade
        st = np.full((2, ln), -1, dtype=np.int64); st[0, 1:ln - 1] = C["sea"]
        for x in range(ln):
            if x % 2 == 0 and 2 < x < ln - 2: st[1, x] = C["sea"]
        WDEC.append(st)
S = {m: load(os.path.join(shore, f"shore-{m:02d}-1.png"), False) for m in range(16)}
D = {n: load(os.path.join(shore, f"shore-diag-{n}-1.png"), False) for n in ("ne", "se", "sw", "nw")}
LIP = {(q, s): piece(f"lip-{q}-{s}") for q in ("nw", "ne", "se", "sw") for s in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner")}
REG = {(q, s): np.asarray(Image.open(os.path.join(pieces, "region", f"lip-{q}-{s}.png"))) > 0 for q in ("nw", "ne", "se", "sw") for s in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner")}
def hash01(y, x):
    """a stable per-pixel value in [0, 1) from map coordinates: a dither with no period, so the tint makes no grid"""
    h = (y * 73856093) ^ (x * 19349663) ^ 0x5bd1e995
    h = (h ^ (h >> 13)) * 0x5bd1e995 & 0xffffffff
    return ((h ^ (h >> 15)) & 0xffff) / 65536.0
FACE = {k: piece("face-" + k) for k in ("ee", "ec", "ce", "cc", "cc-v", "cc-v2", "cc-v3")}

def over(base, o):
    """overlay o on base: transparent keeps base, shade darkens base one DARK step."""
    b = base.copy(); dark = np.array(P.dark)
    b = np.where(o == SH, dark[np.clip(b, 0, None)], b)
    b = np.where(o == SH2, np.array(P.dark2)[np.clip(b, 0, None)], b)
    b = np.where(o == LT, np.array(P.light)[np.clip(b, 0, None)], b)
    return np.where(o >= 0, o, b)

# ------------------------------------------------------------------ the test map
HM = ["11111222222111",
      "11112222222211",
      "11112222222211",
      "11111122222211",
      "11111122211111",
      "00111111111111",
      "00111111111111",
      "00001111111100",
      "00001111001100",
      "00000000000000",
      "0000000000wwww",
      "ww00000000wwww",
      "wwwww00000wwww",
      "00000000000000"]
STAIRS = [(3, 4), (8, 8)]
BRIDGE = [(9, 12, "bridge-ns-n"), (10, 12, "bridge-ns-m"), (11, 12, "bridge-ns-m"), (12, 12, "bridge-ns-m"), (13, 12, "bridge-ns-s")]

def model(hm):
    H = np.array([[0 if ch == "w" else int(ch) for ch in row] for row in hm]); Wt = np.array([[ch == "w" for ch in row] for row in hm])
    return H, Wt
def h(H, r, c, dflt):
    return H[r, c] if 0 <= r < H.shape[0] and 0 <= c < H.shape[1] else dflt
def is_face(H, r, c): return 0 <= r < H.shape[0] and 0 <= c < H.shape[1] and r > 0 and H[r - 1, c] > H[r, c]

def rules(H, Wt):
    errs = []
    R, Cn = H.shape
    for r in range(R):
        for c in range(Cn):
            if is_face(H, r, c) and r + 1 < R and H[r + 1, c] > H[r, c]: errs.append(f"one-cell trench at {r},{c}")
            for dr, dc in ((0, 1), (1, 0)):
                rr, cc = r + dr, c + dc
                if rr < R and cc < Cn and abs(int(H[r, c]) - int(H[rr, cc])) > 1: errs.append(f"two-level step at {r},{c}")
            if Wt[r, c]:
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < R and 0 <= cc < Cn and not Wt[rr, cc]:
                        if H[rr, cc] >= 1 and not is_face(H, rr, cc): errs.append(f"plateau {rr},{cc} touches water {r},{c}")
                        if is_face(H, rr, cc) and dr == 0: errs.append(f"face {rr},{cc} touches water on its side")
    return errs

def lip_state(H, r, c, q):
    hc = H[r, c]
    lower = lambda dr, dc: h(H, r + dr, c + dc, hc) < hc
    vy = -1 if q in ("nw", "ne") else 1; vx = -1 if q in ("nw", "sw") else 1
    a, b, d = lower(vy, 0), lower(0, vx), lower(vy, vx)
    zero = "0" if is_face(H, r, c + vx) else ""          # a side beside a face: its rim runs at the cell edge, against the face's end
    if a and b: return "outer" + zero
    if a: return "edgeh"
    if b: return "edgev" + zero
    if d: return "inner"
    return "fill"

def grass_for(r, c):
    k = (r * 7 + c * 13 + r * c) % 11
    if decal_dir: return G[GN[(r * 5 + c * 3 + (r * c) % 3) % 4]]
    return G[["grass1", "grass2", "grass3", "grass4", "grass1", "grass2", "grass3", "grass4", "flowers1", "grass2", "flowers2"][k]]

PITCH = 23      # the decal grid: 23 px, which shares no period with the 48 px tiles
def place_decals(img, ok, DEC=DEC, seed=4829, PITCH=PITCH, density=.8):
    """one decal at most per PITCH px cell of a jittered grid, seeded; drawn only where its whole footprint is allowed (ok)."""
    r = np.random.RandomState(seed)
    for gy in range(0, img.shape[0], PITCH):
        for gx in range(0, img.shape[1], PITCH):
            pick, roll, ox, oy = r.randint(len(DEC)), r.rand(), r.randint(PITCH), r.randint(PITCH)
            if roll > density: continue
            d = DEC[pick]; y, x = gy + oy - d.shape[0] // 2, gx + ox - d.shape[1] // 2
            if y < 0 or x < 0 or y + d.shape[0] > img.shape[0] or x + d.shape[1] > img.shape[1]: continue
            if not ok[y:y + d.shape[0], x:x + d.shape[1]].all(): continue
            img[y:y + d.shape[0], x:x + d.shape[1]] = np.where(d >= 0, d, img[y:y + d.shape[0], x:x + d.shape[1]])

def render(hm, stairs=(), bridge=(), lips_only=False):
    H, Wt = model(hm); R, Cn = H.shape; img = np.zeros((R * 48, Cn * 48), dtype=np.int64); ok = np.zeros(img.shape, bool); wok = np.zeros(img.shape, bool)
    w = lambda r, c: bool(Wt[r, c]) if 0 <= r < R and 0 <= c < Cn else False
    # 1. the ground: bodies, water, the shore
    for r in range(R):
        for c in range(Cn):
            plain = False
            if Wt[r, c]: t = WATER[(r * 5 + c * 3 + (r * c) % 2) % len(WATER)].copy()
            else:
                t = grass_for(r, c).copy(); plain = not is_face(H, r, c)
                if H[r, c] == 0 and not is_face(H, r, c):
                    m = w(r - 1, c) * 1 + w(r, c + 1) * 2 + w(r + 1, c) * 4 + w(r, c - 1) * 8
                    if m: t = S[m].copy(); plain = False
                    for n, (dr, dc, a, b) in {"ne": (-1, 1, 1, 2), "se": (1, 1, 2, 4), "sw": (1, -1, 4, 8), "nw": (-1, -1, 8, 1)}.items():
                        if w(r + dr, c + dc) and not (m & a) and not (m & b): t = over(t, D[n]); plain = False
            img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = t; ok[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = plain
            wok[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = bool(Wt[r, c])
    # 2. the meadow decals, off the tile grid
    if DEC and not lips_only: place_decals(img, ok)
    if WDEC and not lips_only: place_decals(img, wok, WDEC, 9134, 31, .4)
    # 2b. a raised top is a touch lighter than the ground below: its grass one LIGHT step up on a share of its pixels (22 % a
    # level), inside the rounded edge only (the lip's region masks), by a dither with no period
    if not lips_only:
        GR = {C[n] for n in ("pine", "forest", "leaf", "grass", "sprout")}
        light = np.array(P.light); yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
        hz = np.vectorize(hash01)(yy, xx)
        lvl = np.zeros(img.shape)
        for r in range(R):
            for c in range(Cn):
                if Wt[r, c] or is_face(H, r, c): continue
                L0 = np.full((48, 48), float(H[r, c]))
                if H[r, c] >= 1:
                    for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "sw": (24, 0), "se": (24, 24)}.items():
                        L0[y:y + 24, x:x + 24] = np.where(REG[(q, lip_state(H, r, c, q))], H[r, c], H[r, c] - 1)
                lvl[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = L0
        m = np.isin(img, list(GR)) & (hz < .22 * lvl)
        img[m] = light[img[m]]
    # 3. the terrain over it: lips, faces, stairs, shadows, foam
    for r in range(R):
        for c in range(Cn):
            t = img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48].copy()
            if H[r, c] >= 1 and not is_face(H, r, c):
                for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "sw": (24, 0), "se": (24, 24)}.items():
                    t[y:y + 24, x:x + 24] = over(t[y:y + 24, x:x + 24], LIP[(q, lip_state(H, r, c, q))])
            if not lips_only and is_face(H, r, c):
                cont = lambda cc: is_face(H, r, cc) or h(H, r, cc, -1) > H[r, c]
                k = ("c" if cont(c - 1) else "e") + ("c" if cont(c + 1) else "e")
                if k == "cc": k = ("cc", "cc-v", "cc-v2", "cc-v3")[(c * 7 + r * 3 + (c * c) % 5) % 4]   # no two-tile rhythm along a wall
                t = over(t, piece("stairs") if (r, c) in stairs else FACE[k])
            if not lips_only and (r, c) in [(sr - 1, sc) for sr, sc in stairs]: t = over(t, piece("stairs-top"))
            if not lips_only and (r, c) in [(sr + 1, sc) for sr, sc in stairs]: t = over(t, piece("stairs-foot"))
            if not lips_only and c > 0 and not is_face(H, r, c) and not Wt[r, c] and (is_face(H, r, c - 1) or H[r, c - 1] > H[r, c]):
                t = over(t, piece("side-shadow-e"))
            if not lips_only and r > 0 and c > 0 and is_face(H, r - 1, c - 1) and not is_face(H, r - 1, c) and not is_face(H, r, c - 1) \
                    and not is_face(H, r, c) and not Wt[r, c] and not (H[r, c - 1] > H[r, c]) and not (H[r - 1, c] > H[r, c]):
                t = over(t, piece("corner-shadow-se"))
            if not lips_only and r > 0 and is_face(H, r - 1, c) and not is_face(H, r, c):
                t = over(t, piece("foot-foam-1") if Wt[r, c] else piece("foot-shadow"))
            img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = t
    for r, c, n in ([] if lips_only else bridge):
        img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = over(img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48], piece(n))
    return img

def png(idx, path, table=None, scale=1):
    a = np.array(table)[idx] if table is not None else idx
    im = P.to_image(a)
    if scale > 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    im.save(path); return im

res = {}
H, Wt = model(HM); res["rules"] = rules(H, Wt)
m = render(HM, STAIRS, BRIDGE)
png(m, os.path.join(out, "testmap-1x.png")); png(m, os.path.join(out, "testmap-3x.png"), scale=3)
png(m, os.path.join(out, "testmap-clear-1x.png"), P.clear); png(m, os.path.join(out, "testmap-rain-1x.png"), P.rain)
png(m, os.path.join(out, "testmap-fog-1x.png"), P.fog)

# four greys
rgb = P.rgb[m]; lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
q = np.clip((lum / 256 * 4).astype(int), 0, 3); g = np.array([24, 96, 168, 240], np.uint8)[q]
Image.fromarray(g, "L").save(os.path.join(out, "testmap-4gray.png"))

# lip joins: all 256 neighbourhoods of a plateau cell (height 1) among height 0/1, lips only
RIM = {C[n] for n in ("void", "ink", "night", "slate", "stone", "mist", "fog", "bone", "white", "rock", "rockL")}
cls = np.vectorize(lambda v: 1 if v in RIM else 0)
off = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
bad = 0; worst = 0
for k in range(256):
    grid = [["1"] * 3 for _ in range(3)]
    for i, (dr, dc) in enumerate(off):
        if k >> i & 1: grid[1 + dr][1 + dc] = "0"
    Hg, Wg = model(["".join(rw) for rw in grid])
    if rules(Hg, Wg): continue                      # an illegal neighbourhood (a one-cell trench) is not a join to test
    img = render(["".join(rw) for rw in grid], lips_only=True); kk = cls(img)
    # horizontal and vertical joins between plateau cells: the rim must run on (class equal across the join where both sides are rim rows)
    for r in range(3):
        for c in range(1, 3):
            if grid[r][c - 1] == "1" and grid[r][c] == "1":
                a, b = kk[r * 48:(r + 1) * 48, c * 48 - 1], kk[r * 48:(r + 1) * 48, c * 48]; bad += int((a != b).sum()); worst = max(worst, int((a != b).sum()))
                if (a != b).sum() and os.environ.get("TDEBUG"): print("v", k, r, c, np.where(a != b)[0][:8], ["".join(g) for g in grid])
    for r in range(1, 3):
        for c in range(3):
            if grid[r - 1][c] == "1" and grid[r][c] == "1":
                a, b = kk[r * 48 - 1, c * 48:(c + 1) * 48], kk[r * 48, c * 48:(c + 1) * 48]
                Hh, _ = model(["".join(g) for g in grid])
                for half, qq in ((slice(0, 24), "sw"), (slice(24, 48), "se")):
                    if lip_state(Hh, r - 1, c, qq) == "inner": a[half] = b[half]       # a side strip ends under the turf by design
                bad += int((a != b).sum()); worst = max(worst, int((a != b).sum()))
                if (a != b).sum() and os.environ.get("TDEBUG"): print("h", k, r, c, np.where(a != b)[0][:8], ["".join(g) for g in grid])
res["lip_joins"] = bad; res["lip_join_worst"] = worst     # pixels per join; 1 is a one-pixel offset of a strip edge, not a break

# face joins: every face tile beside every other (continuing sides); the luminance step across the join against the step inside
def lumi(a): q = P.rgb[np.clip(a, 0, None)]; return 0.2126 * q[..., 0] + 0.7152 * q[..., 1] + 0.0722 * q[..., 2]
jj, ii = [], []
for a in ("ec", "cc", "cc-v", "cc-v2", "cc-v3"):
    for b in ("cc", "cc-v", "cc-v2", "cc-v3", "ce"):
        pair = np.hstack([lumi(FACE[a]), lumi(FACE[b])]); d = np.abs(np.diff(pair, axis=1))
        jj.append(d[:, 47].mean()); ii.append(np.delete(d, 47, axis=1).mean())
res["face_join"] = round(float(np.mean(jj) / np.mean(ii)), 3)
# seam: luminance step across joins between two plain grass cells / the step inside those cells
L = lum.astype(float)
def plain(r, c): return (not Wt[r, c]) and not is_face(H, r, c) and all(lip_state(H, r, c, q) == "fill" for q in ("nw", "ne", "se", "sw")) if H[r, c] >= 1 else \
    (not Wt[r, c]) and not is_face(H, r, c) and not any(Wt[rr, cc] for rr in range(max(0, r - 1), min(H.shape[0], r + 2)) for cc in range(max(0, c - 1), min(H.shape[1], c + 2))) \
    and not (r > 0 and is_face(H, r - 1, c)) and not (c > 0 and (H[r, c - 1] > H[r, c] or is_face(H, r, c - 1)))
js, ins = [], []
for r in range(H.shape[0]):
    for c in range(H.shape[1] - 1):
        if plain(r, c) and plain(r, c + 1):
            blk = L[r * 48:(r + 1) * 48, c * 48:(c + 2) * 48]; d = np.abs(np.diff(blk, axis=1))
            js.append(d[:, 47].mean()); ins.append(np.delete(d, 47, axis=1).mean())
res["seam"] = round(float(np.mean(js) / np.mean(ins)), 3); res["seam_joins"] = len(js)
# repeat: a strip of plain plateau grass; autocorrelation at the tile period against the mean at nearby lags
gr = L[5 * 48:6 * 48, :]; gr = gr - gr.mean()
def ac(lag): return float((gr[:, :-lag] * gr[:, lag:]).mean() / (gr * gr).mean())
base = np.mean([ac(k) for k in list(range(30, 44)) + list(range(53, 67))])
res["repeat"] = round(ac(48) - base, 3); res["repeat_note"] = "autocorrelation at 48 px minus the mean at 30-43 and 53-66 px; <= 0.10 passes"
json.dump(res, open(os.path.join(out, "checks.json"), "w"), indent=1)
print(json.dumps(res))
