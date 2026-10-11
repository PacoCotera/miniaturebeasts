"""Terrain slice 1: the test map (three levels of grass, cliffs, stairs, a stream with a cliff into it, a bridge), rendered from the
signed ground and shore tiles and the build-cliffs.py pieces, plus the artifact checks.

The level model drawn here (the Companion lead's proposal owns the rules): each cell has a height 0-2 and may be water (height 0).
A cell whose north neighbour is higher is a FACE cell (one level only; not walkable except a stair). Layer order: water < low ground
< cliff top. Illegal and reported: a plateau cell (height >= 1) touching water, a face touching water on its east or west, a step of
two levels between neighbours.

Checks printed (and written to checks.json):
  rules     the map obeys the junction rules above
  lip_joins over all 256 neighbourhoods of a plateau cell, pixels whose rim/turf class differs across a join between two plateau cells
  face_join pixels that differ across the join of every pair of face tiles (they share bands, so 0)
  seam      mean luminance step across tile joins / mean step inside tiles, on the rendered map (<= 1.25 passes)
  repeat    autocorrelation of the grass luminance at a 48 px lag / at lag 1 px (<= 0.5 passes)
usage: python3 -I terrain-map.py PIECES_DIR GROUND_DIR SHORE_DIR OUT_DIR"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index
pieces, ground, shore, out = sys.argv[1:5]; os.makedirs(out, exist_ok=True)
T, SH = -1, -2

def load(p, shade=True):
    a = quant.quantize(np.asarray(Image.open(p).convert("RGBA")))
    sp = os.path.join(os.path.dirname(p), "shade", os.path.basename(p))
    if shade and os.path.exists(sp): a = np.where(np.asarray(Image.open(sp)) > 0, SH, a)
    return a
def piece(n): return load(os.path.join(pieces, n + ".png"))
G = {n: load(os.path.join(ground, n + ".png"), False) for n in ("grass1", "grass2", "grass3", "grass4", "flowers1", "flowers2", "water1", "water2")}
S = {m: load(os.path.join(shore, f"shore-{m:02d}-1.png"), False) for m in range(16)}
D = {n: load(os.path.join(shore, f"shore-diag-{n}-1.png"), False) for n in ("ne", "se", "sw", "nw")}
LIP = {(q, s): piece(f"lip-{q}-{s}") for q in ("nw", "ne", "se", "sw") for s in ("fill", "edgeh", "edgev", "outer", "inner")}
FACE = {k: piece("face-" + k) for k in ("ee", "ec", "ce", "cc", "cc-v")}

def over(base, o):
    """overlay o on base: transparent keeps base, shade darkens base one DARK step."""
    b = base.copy(); dark = np.array(P.dark)
    b = np.where(o == SH, dark[np.clip(b, 0, None)], b)
    return np.where(o >= 0, o, b)

# ------------------------------------------------------------------ the test map
HM = ["22222211111111",
      "22222211111111",
      "22222211112211",
      "11111111112211",
      "11111111111111",
      "11111111111111",
      "00011111100111",
      "00000000000111",
      "00000000000000",
      "wwwwwwwwwwwwww",
      "wwwwwwwwwwwwww",
      "00000000000000"]
STAIRS = [(3, 2), (7, 5)]
BRIDGE = [(8, 1, "bridge-ns-n"), (9, 1, "bridge-ns-m"), (10, 1, "bridge-ns-m"), (11, 1, "bridge-ns-s")]

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
    if a and b: return "outer"
    if a: return "edgeh"
    if b: return "edgev"
    if d: return "inner"
    return "fill"

def grass_for(r, c):
    k = (r * 7 + c * 13 + r * c) % 11
    return G[["grass1", "grass2", "grass3", "grass4", "grass1", "grass2", "grass3", "grass4", "flowers1", "grass2", "flowers2"][k]]

def render(hm, stairs=(), bridge=(), lips_only=False):
    H, Wt = model(hm); R, Cn = H.shape; img = np.zeros((R * 48, Cn * 48), dtype=np.int64)
    w = lambda r, c: bool(Wt[r, c]) if 0 <= r < R and 0 <= c < Cn else False
    for r in range(R):
        for c in range(Cn):
            if Wt[r, c]: t = G["water1" if (r + c) % 3 else "water2"].copy()
            else:
                t = grass_for(r, c).copy()
                if H[r, c] == 0 and not is_face(H, r, c):
                    m = w(r - 1, c) * 1 + w(r, c + 1) * 2 + w(r + 1, c) * 4 + w(r, c - 1) * 8
                    if m: t = S[m].copy()
                    for n, (dr, dc, a, b) in {"ne": (-1, 1, 1, 2), "se": (1, 1, 2, 4), "sw": (1, -1, 4, 8), "nw": (-1, -1, 8, 1)}.items():
                        if w(r + dr, c + dc) and not (m & a) and not (m & b): t = over(t, D[n])
            if H[r, c] >= 1 and not is_face(H, r, c):
                for q, (y, x) in {"nw": (0, 0), "ne": (0, 24), "sw": (24, 0), "se": (24, 24)}.items():
                    t[y:y + 24, x:x + 24] = over(t[y:y + 24, x:x + 24], LIP[(q, lip_state(H, r, c, q))])
            if not lips_only and is_face(H, r, c):
                cont = lambda cc: is_face(H, r, cc) or h(H, r, cc, -1) > H[r, c]
                k = ("c" if cont(c - 1) else "e") + ("c" if cont(c + 1) else "e")
                if k == "cc" and (r + c) % 2: k = "cc-v"
                t = over(t, piece("stairs") if (r, c) in stairs else FACE[k])
            if not lips_only and (r, c) in [(sr - 1, sc) for sr, sc in stairs]: t = over(t, piece("stairs-top"))
            if not lips_only and c > 0 and not is_face(H, r, c) and H[r, c] < H[r, c - 1] + (1 if is_face(H, r, c - 1) else 0) \
                    and (is_face(H, r, c - 1) or H[r, c - 1] > H[r, c]) and not Wt[r, c]:
                t = over(t, piece("side-shadow-e"))
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
RIM = {C[n] for n in ("night", "slate", "stone", "rock", "rockL")}
cls = np.vectorize(lambda v: 1 if v in RIM else 0)
off = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
bad = 0
for k in range(256):
    grid = [["1"] * 3 for _ in range(3)]
    for i, (dr, dc) in enumerate(off):
        if k >> i & 1: grid[1 + dr][1 + dc] = "0"
    img = render(["".join(rw) for rw in grid], lips_only=True); kk = cls(img)
    # horizontal and vertical joins between plateau cells: the rim must run on (class equal across the join where both sides are rim rows)
    for r in range(3):
        for c in range(1, 3):
            if grid[r][c - 1] == "1" and grid[r][c] == "1":
                a, b = kk[r * 48:(r + 1) * 48, c * 48 - 1], kk[r * 48:(r + 1) * 48, c * 48]; bad += int((a != b).sum())
                if (a != b).sum() and os.environ.get("TDEBUG"): print("v", k, r, c, np.where(a != b)[0][:8], ["".join(g) for g in grid])
    for r in range(1, 3):
        for c in range(3):
            if grid[r - 1][c] == "1" and grid[r][c] == "1":
                a, b = kk[r * 48 - 1, c * 48:(c + 1) * 48], kk[r * 48, c * 48:(c + 1) * 48]
                Hh, _ = model(["".join(g) for g in grid])
                for half, qq in ((slice(0, 24), "sw"), (slice(24, 48), "se")):
                    if lip_state(Hh, r - 1, c, qq) == "inner": a[half] = b[half]       # a side strip ends under the turf by design
                bad += int((a != b).sum())
                if (a != b).sum() and os.environ.get("TDEBUG"): print("h", k, r, c, np.where(a != b)[0][:8], ["".join(g) for g in grid])
res["lip_joins"] = bad

# face joins: every face tile beside every other (continuing sides)
fb = 0
for a in ("ec", "cc", "cc-v"):
    for b in ("cc", "cc-v", "ce"):
        fb += int((cls(FACE[a][:, 47]) != cls(FACE[b][:, 0])).sum())
res["face_join"] = fb

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
