"""The meadow drop: the indexed sheets, meadow.json and meadow-palette.json in art/companion-48/terrain/meadow/ (the
loader's manifest, checked by prototypes/exploration/tools/atlas-check.mjs --drop), from the tileset candidates in terrain/grass/.

Palette. b1's approved meadow set (mockup/b1/biome-meadow.json): the core 48 at 0-47, unchanged, then the meadow's 48 (8-bit
indexed colour in per-biome sets, design/proposals/technical-architecture.md). meadow-palette.json carries each entry's DARK, LIGHT, DARK2, FOG and FADE index: the core
48 exactly as the page's tables, the meadow entries one step along their own material's ramp (DARK, LIGHT) and by the page's mixLUT
rule (FOG toward bone at .62, FADE toward stone at .5, the 3/4/2 weighted nearest colour over all 96).

Pieces, by the loader's catalogue keys (prototypes/exploration/src/atlas.mjs):
  lawn            6 tiles on b1's lawn ramp at the middle level's tone: b1's own flecks (its lawn less its bands, one 48 px window
                  each), clustered tufts and clover kept 6 px inside the tile, so any tile meets any other
  sand, deep      the pond's bank sand and its body one step down, flat with sparse flecks
  material.rock   48 px of rock from the 1-wide faces' middle rows (fills the middle of a cliff band, between its top and foot rows)
  decal           the tall grass and flowers decals with their greens moved onto b1's ramp by value
  water           tileset/water's quarters, frames 1 and 2, and its macros, lobes, beaches, bend and band (catalogued as other)
  lip             the 28 quarters: the candidate set's edge geometry (pieces/region) drawn by the plateau-edge rule below on b1's
                  ramp (outline, lit rim, two shade steps beyond, a ragged fringe); transparent where the lawn is untouched
  face, cap, side, foot strips, stairs, props: tileset/walls, stairs and props, mapped to the 96 by nearest colour (to_idx);
                  a face's or cap's enclosed key holes filled with the lawn that showed through them
Pieces are `signed` or `candidate` by signed() below. Sheets are 8-bit indexed: PLTE the 96 colours in order, magenta's slot (44, used by no piece) transparent through tRNS, no colour chunks.
usage: python3 -I build-meadow-drop.py OUT_DIR PROOF_DIR"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pal as palmod

HERE = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(HERE, "..", "terrain", "grass"); TS = os.path.join(G, "tileset")
out, proof = sys.argv[1:3]; os.makedirs(out, exist_ok=True); os.makedirs(proof, exist_ok=True)
P48 = palmod.load()
cols = json.load(open(os.path.join(G, "mockup", "b1", "biome-meadow.json")))["colours"]
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
assert len(cols) == 96 and all(cols[i]["hex"] == P48.hexes[i] for i in range(48))
# fog (C5): four neutral greys after b1's set, the fog's targets only (no source maps to them), so meadow fog never reads lavender
FOG_RAMP = ["#6f7a72", "#98a39a", "#c3cbc3", "#e3e8e1"]
cols = cols + [{"index": 96 + k, "hex": h, "set": "meadow", "material": "fog"} for k, h in enumerate(FOG_RAMP)]
PAL = np.array([hx(c["hex"]) for c in cols]); NC = len(PAL); TR = NC          # transparent while building; written as magenta's slot (44)
NSRC = 96                                                          # the colours sources map to (the fog greys are excluded)
CORE_G = ["pine", "forest", "leaf", "grass", "sprout", "lime"]
mat = np.array([c.get("material", "grass" if c.get("name") in CORE_G else "core") for c in cols])
lum = 0.2126 * PAL[:, 0] + 0.7152 * PAL[:, 1] + 0.0722 * PAL[:, 2]

# ---- the palette's tables
def nearest(rgb, among=None):
    s = np.arange(NSRC) if among is None else np.array(among); q = PAL[s]
    d = (q[:, 0] - rgb[0]) ** 2 * 3 + (q[:, 1] - rgb[1]) ** 2 * 4 + (q[:, 2] - rgb[2]) ** 2 * 2
    return int(s[np.argmin(d)])
RAMP = {}
for i in range(48, NC): RAMP.setdefault(mat[i], []).append(i)
for m in RAMP: RAMP[m].sort(key=lambda i: lum[i])
def rstep(i, k):
    r = RAMP[mat[i]]; return r[max(0, min(len(r) - 1, r.index(i) + k))]
import colorsys
hsv = np.array([colorsys.rgb_to_hsv(*(PAL[i] / 255)) for i in range(NC)])
G_ORDER = [i for i in sorted([i for i in range(NC) if mat[i] == "grass"], key=lambda i: lum[i]) if hsv[i, 1] > .35 and .18 < hsv[i, 0] < .40]
def gstep(i, k):
    if i not in G_ORDER:
        if mat[i] != "grass": return i
        i = min(G_ORDER, key=lambda g: abs(lum[g] - lum[i]))
    j = G_ORDER.index(i); return G_ORDER[max(0, min(len(G_ORDER) - 1, j + k))]
# the meadow's greens step along the saturated lawn ramp (gstep), every other material along its own ramp by value
DARK = [P48.dark[i] if i < 48 else gstep(i, -1) if mat[i] == "grass" else rstep(i, -1) for i in range(NC)]
LIGHT = [P48.light[i] if i < 48 else gstep(i, 1) if mat[i] == "grass" else rstep(i, 1) for i in range(NC)]
def mix(target, t, i): tr = PAL[P48.index[target]]; return PAL[i] + (tr - PAL[i]) * t
FOGT = np.array(hx(FOG_RAMP[-1]), float); FOGI = list(range(96, 100))
FOG = [P48.fog[i] if i < 48 else nearest(PAL[i] + (FOGT - PAL[i]) * .62, FOGI + [i, LIGHT[i], LIGHT[LIGHT[i]]]) if i < 96
       else FOGI[min(3, FOGI.index(i) + 1)] for i in range(NC)]   # toward #e3e8e1 at .62, among the fog greys and the entry's own lighter steps
FADE = [P48.fade[i] if i < 48 else nearest(mix("stone", .5, i)) for i in range(NC)]

def to_idx(path_or_img):
    im = Image.open(path_or_img) if isinstance(path_or_img, str) else path_or_img
    a = np.asarray(im.convert("RGBA")); rgb = a[..., :3].reshape(-1, 1, 3).astype(int)
    i = ((rgb - PAL[None, :NSRC]) ** 2).sum(-1).argmin(1).reshape(a.shape[:2])   # nearest colour, plain RGB distance (b1's 96 only)
    return np.where(a[..., 3] > 127, i, TR)

# ---- b1's lawn ramp: its seven commonest lawn tones, dark to light, and the lit tone they centre on
B1 = to_idx(os.path.join(G, "mockup", "b1", "scene-1x.png"))
lawn = mat[B1] == "grass"
vals, cnts = np.unique(B1[lawn], return_counts=True); medl = np.median(lum[B1[lawn]])
BASE = int(max((c_, v_) for v_, c_ in zip(vals, cnts) if lum[v_] > medl)[1])
LRAMP = sorted(vals[np.argsort(-cnts)[:7]], key=lambda i: lum[i]); LB = LRAMP.index(BASE); TOPK = len(LRAMP) - 2
LIX = {t: k for k, t in enumerate(LRAMP)}
def ls(i, k): return LRAMP[max(0, min(len(LRAMP) - 1, LIX[i] + k))] if i in LIX else gstep(i, k)
# the lawn ramp's own steps for the level tone: one tone up or down b1's seven, folding back below the pale top as test map 12 does,
# so a lit plateau keeps its flecks (a generic green step collapsed several lawn tones onto one and yellowed the light ones)
def fold(k): return 2 * TOPK - k if k > TOPK else max(0, k)
assert all(i >= 48 for i in LRAMP), "a core green in the lawn ramp: its tables must stay the page's"
for i in LRAMP: LIGHT[i] = LRAMP[fold(LIX[i] + 1)]; DARK[i] = LRAMP[max(0, LIX[i] - 1)]
DARK2 = [DARK[d] for d in DARK]
NAMES = [cols[i].get("name") or f"{cols[i]['material']}-{i}" for i in range(NC)]
assert len(set(c["hex"] for c in cols)) == NC
with open(os.path.join(out, "meadow-palette.json"), "w") as fh:      # one entry per index, one per line: i, name, hex and the five tables
    fh.write('{ "biome": "meadow", "entries": [\n' + ",\n".join("  " + json.dumps({"i": i, "name": NAMES[i], "hex": cols[i]["hex"],
             "dark": int(DARK[i]), "light": int(LIGHT[i]), "dark2": int(DARK2[i]), "fog": int(FOG[i]), "fade": int(FADE[i]),
             "mat": str(mat[i])}) for i in range(NC)) + " ] }\n")   # mat: "grass" marks the colours the level tone moves (grass only)
OUTL = nearest((24, 52, 30)); BODY, SHAL = nearest((29, 104, 136)), nearest((34, 121, 147))
LAWN0 = LB - 1                                                    # the middle level's tone, one step under b1's lit lawn
def boxavg(a, k):
    p = np.pad(a, k, mode="edge"); cs = p.cumsum(0).cumsum(1); cs = np.pad(cs, ((1, 0), (1, 0)))
    n = 2 * k + 1; return (cs[n:, n:] - cs[:-n, n:] - cs[n:, :-n] + cs[:-n, :-n]) / n ** 2
RI = np.full(B1.shape, np.nan)
for k_, t_ in enumerate(LRAMP): RI[B1 == t_] = k_
inl = ~np.isnan(RI); avg = boxavg(np.where(inl, RI, LB).astype(float), 6)
RES = np.clip(np.round(np.where(inl, RI, LB) - avg), -2, 2).astype(int)
cov = boxavg(inl.astype(float), 24)
def fleck_windows(n, seed):
    cand = sorted(((cov[y, x], y, x) for y in range(24, B1.shape[0] - 24, 12) for x in range(24, B1.shape[1] - 24, 12)), reverse=True)
    got = []
    for cv, y, x in cand:
        if cv < .97 or len(got) == n: break
        if all(abs(y - y2) > 48 or abs(x - x2) > 48 for y2, x2 in got): got.append((y, x))
    return [RES[y - 24:y + 24, x - 24:x + 24] for y, x in got]
def tone(k): k = np.clip(np.where(k > TOPK, 2 * TOPK - k, k), 0, TOPK); return np.array(LRAMP)[k]

BAY = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
def bayer(h, w): return np.tile(BAY, (h // 4 + 1, w // 4 + 1))[:h, :w]
def mottle(seed):
    """three or four greens in loose, irregular patches (owner 00:05: the top is mottled, not one fill): a smoothed noise field split
    at +-0.7 sigma into a step down or up, faded to nothing 6 px from the tile's sides so tiles still meet on flecks alone; edges
    dithered on the 4x4 Bayer"""
    from scipy import ndimage as nd_
    rng = np.random.RandomState(seed + 77); n = nd_.gaussian_filter(rng.normal(0, 1, (48, 48)), 5); n = (n - n.mean()) / n.std()
    yy, xx = np.mgrid[0:48, 0:48]; fade = np.clip(np.minimum(np.minimum(yy, 47 - yy), np.minimum(xx, 47 - xx)) / 6.0, 0, 1)
    n = n * fade; B = bayer(48, 48) / 16.0
    return np.where(n > 0.7 + 0.3 * B, 1, np.where(n < -0.7 - 0.3 * B, -1, 0))
def lawn_tile(f, seed):
    t = tone(LAWN0 + f + mottle(seed)); rng = np.random.RandomState(seed)
    def tuft(cy, cx):
        base = t[cy, cx]
        for b in range(rng.randint(3, 6)):
            x = cx + rng.randint(-3, 4); hgt = rng.randint(2, 5); lean = rng.choice([-1, 0, 0, 1])
            for k in range(hgt):
                y = cy - k; xx = x + (lean if k == hgt - 1 else 0)
                if not (6 <= y < 42 and 6 <= xx < 41): break
                t[y, xx] = ls(base, 2) if k == hgt - 1 else ls(base, -1)
                if k < hgt - 1 and xx + 1 < 42: t[y, xx + 1] = ls(base, -3)
    for _ in range(rng.randint(2, 6)):                            # sites anywhere 8 px inside: no grid between tiles or within one
            cy, cx = rng.randint(8, 40), rng.randint(8, 40)
            r = rng.rand()
            if r < .1: t[cy, cx] = gstep(t[cy, cx], -2); t[cy - 1, cx] = nearest((240, 240, 230) if rng.rand() < .6 else (240, 210, 70))
            elif r < .25:
                base = t[cy, cx]
                for dy, dx in ((0, -1), (0, 1), (-1, 0)): t[cy + dy, cx + dx] = gstep(base, 2)
                t[cy, cx] = gstep(base, -1)
            else:
                for _ in range(rng.randint(2, 4)): tuft(cy + rng.randint(-3, 4), cx + rng.randint(-5, 6))
    return t

PIECES = []                                                      # (name, idx array, fields)
def add(name, a, **f): PIECES.append((name, a, dict(status="candidate", offset=[0, 0], **f)))

# ---- ground
FL = fleck_windows(8, 1)
LIPF = fleck_windows(8, 2)[6:]                                    # the lawn texture for the pieces that carry their own lawn (lip, shore margin, spill, holes)
for k in range(6): add(f"meadow/ground/lawn-{k + 1}", lawn_tile(FL[k], 300 + k), kind="ground", set="lawn", variant=str(k + 1))
# the cast shadow (owner 00:05: "shadows help you add depth"; light from the upper left): drawn on the LOWER lawn tile beside a raised
# edge, by the loader's rule (to be ruled): `e` on the tile east of a plateau or face, `s` on the tile south of a face's foot, `es` both,
# `c` the tile whose only raised neighbour is its north-west. Lawn texture two steps under the lawn, toned by the tile's level like the
# lawn; transparent beyond; a soft edge dithered over 4 px on the 4x4 Bayer.
def shadow_piece(state, seed):
    """a broad band (the owner's reference: about a quarter of the block east, the cliff's own height south, within a tile): two lawn
    steps down in its core, one step down in its outer 6 px dithered on the 4x4 Bayer, then nothing"""
    yy, xx = np.mgrid[0:48, 0:48]; B = bayer(48, 48)
    we = 18 + np.round(1.5 * np.sin(2 * np.pi * yy / 48)); hs = 30 + np.round(2 * np.sin(2 * np.pi * xx / 48))
    de = {"e": we - xx, "s": hs - yy, "es": np.maximum(we - xx, hs - yy), "c": 18 - np.hypot(xx, yy)}[state]
    f = LIPF[seed % 2][yy % 48, xx % 48]
    core = de >= 6; soft = (de > 0) & ~core & (B < de / 6 * 16)
    return np.where(core, tone(LAWN0 - 2 + f), np.where(soft, tone(LAWN0 - 1 + f), TR))
for k, st in enumerate(("e", "s", "es", "c")): add(f"meadow/shadow/cast-{st}", shadow_piece(st, 40 + k), kind="shadow", set="cast", state=st)
WQ = {n: to_idx(os.path.join(TS, "water", n + ".png")) for n in ("q-nw-edgeh-f1", "q-nw-fill-f1")}
bank = WQ["q-nw-edgeh-f1"]; bk = bank[bank != TR]; bk = bk[np.isin(mat[bk], ["earth", "sand"])]; bv, bc = np.unique(bk, return_counts=True)
SAND = sorted(bv[np.argsort(-bc)[:2]], key=lambda i: -lum[i]) if len(bv) else [P48.index["sand"]]
PEB, PEBL = nearest((122, 98, 72)), nearest((214, 196, 160))
def sand_tex(seed):
    """sand with grain (C5: the rock field read flat tan): a smoothed field in two sand tones, a fine grain of the darker, and a few
    pebbles (a dark body, a lit top-left pixel), none within 3 px of the tile's sides so tiles meet on grain alone"""
    from scipy import ndimage as nd_
    rs = np.random.RandomState(seed); n = nd_.gaussian_filter(rs.normal(0, 1, (48, 48)), 4); n = (n - n.mean()) / n.std()
    yy, xx = np.mgrid[0:48, 0:48]; fade = np.clip(np.minimum(np.minimum(yy, 47 - yy), np.minimum(xx, 47 - xx)) / 5.0, 0, 1)
    sd = np.where(n * fade > 0.5 + 0.3 * bayer(48, 48) / 16, SAND[-1], SAND[0])
    g = rs.rand(48, 48) < .07; sd[g] = SAND[-1]
    for _ in range(rs.randint(3, 6)):
        y, x = rs.randint(4, 43), rs.randint(4, 43); w, h = rs.randint(2, 4), rs.randint(1, 3)
        sd[y:y + h, x:x + w] = PEB; sd[y, x] = PEBL
    return sd
for k in range(2): add(f"meadow/ground/sand-{k + 1}", sand_tex(9 + k), kind="ground", set="sand", variant=str(k + 1))
SANDTEX = sand_tex(9)
WFILL = WQ["q-nw-fill-f1"]; wv, wc = np.unique(WFILL, return_counts=True); WB = int(wv[np.argmax(wc)])
for k in range(2):
    rd = np.random.RandomState(20 + k); dp = np.full((48, 48), DARK[WB])
    for _ in range(5):
        y, x, ln = rd.randint(2, 46), rd.randint(0, 36), rd.randint(5, 11); dp[y, x:x + ln] = WB
    add(f"meadow/ground/deep-{k + 1}", dp, kind="ground", set="deep", variant=str(k + 1))

# ---- material rock: 48 px of the 1-wide faces' middle rows
WJ = json.load(open(os.path.join(TS, "walls", "walls.json")))["pieces"]
W1 = [p for p in WJ if p["kind"] == "face" and p.get("cells") == [1, 2]]
for k, p in enumerate(W1[:2]):
    a = to_idx(os.path.join(TS, "walls", p["file"]))
    add(f"meadow/material/rock-{k + 1}", a[24:72].copy(), kind="material", set="rock", variant=str(k + 1))

# ---- decals: their greens onto b1's ramp by value
for f in sorted(os.listdir(os.path.join(G, "decals"))):
    if not f.endswith(".png"): continue
    a = to_idx(os.path.join(G, "decals", f)); a = np.where((a != TR) & (mat[np.minimum(a, NC - 1)] == "grass"), np.vectorize(lambda i: gstep(i, 0))(np.minimum(a, NC - 1)), a)
    st = "tall" if f.startswith("tall") else "flowers" if f.startswith("flowers") else "grass"
    add("meadow/decal/" + f[:-4], a, kind="decal", set=st, variant=f[:-4])

# ---- water
for p in json.load(open(os.path.join(TS, "water", "water.json")))["pieces"]:
    f = {k: v for k, v in p.items() if k not in ("name", "file", "px")}
    a = to_idx(os.path.join(TS, "water", p["file"]))
    if p["kind"] != "band":                                               # every water piece (quarters, macros, lobes, beaches, the bend)
        if p["kind"] == "shore": f["set"] = "water"
        # the page draws a water tile's quarters with no ground under them: the land margin beyond the bank is lawn here, never a hole;
        # beside sand the same quarter takes its margin in sand (set water-sand, the loader's choice when the land neighbour is sand)
        yy, xx = np.nonzero(a == TR); b = a.copy()
        a[yy, xx] = tone(LAWN0 + LIPF[1][yy % 48, xx % 48]); b[yy, xx] = SANDTEX[yy % 48, xx % 48]
        add(p["name"].replace("/water-", "/water-sand-"), b, **dict(f, set="water-sand" if p["kind"] == "shore" else "sand-margin"))
    add(p["name"], a, **f)

# ---- sand quarters (for the loader's sandShore rule: the sand's own cell carries its edge, as water's does): the lawn outside a
# wavering edge 10 px inside each side that meets other ground, corners turning inside their quarter (outer r 14, inner r 10), a
# darker rim on the sand, blades of the lawn leaning over it. Kind shore, set sand, frame 1 (sand does not move).
def sand_quarter(quad, state, seed):
    north = quad in ("nw", "ne"); west = quad in ("nw", "sw"); IN = 10
    yy, xx = np.mgrid[0:24, 0:24]; U = np.where(west, xx, 23 - xx); V = np.where(north, yy, 23 - yy)
    wv = lambda t: np.round(1.0 * np.sin(2 * np.pi * t / 24))
    if state == "fill": land = np.zeros((24, 24), bool)
    elif state == "edgeh": land = V < IN + wv(U)
    elif state == "edgev": land = U < IN + wv(V)
    elif state == "outer": land = (V < IN + wv(U)) | (U < IN + wv(V)) | ((U < 24) & (V < 24) & (np.hypot(U - 24, V - 24) > 24 - IN))
    else: land = np.hypot(U, V) < IN
    q = sand_tex(seed)[:24, :24].copy() if quad == "nw" else sand_tex(seed)[(0 if north else 24):(24 if north else 48), (0 if west else 24):(24 if west else 48)].copy()
    from scipy import ndimage as nd_
    rim = ~land & nd_.binary_dilation(land, iterations=1); q[rim] = PEB
    lawn_ = tone(LAWN0 + LIPF[1][:24, :24]); q = np.where(land, lawn_, q)
    rng = np.random.RandomState(seed + 5); edge = land & nd_.binary_dilation(~land, iterations=1)
    for y, x in zip(*np.where(edge)):
        if rng.rand() < .4:
            dy, dx = (1 if north else -1) * int(state in ("edgeh", "outer")), (1 if west else -1) * int(state in ("edgev", "outer"))
            y2, x2 = y + dy, x + dx
            if 0 <= y2 < 24 and 0 <= x2 < 24 and not land[y2, x2]: q[y2, x2] = gstep(LRAMP[LAWN0], 1)
    return q
for qi, qd in enumerate(("nw", "ne", "se", "sw")):
    for st in ("fill", "edgeh", "edgev", "outer", "inner"):
        add(f"meadow/shore/sand-{qd}-{st}-f1", sand_quarter(qd, st, 60 + qi), kind="shore", set="sand", quad=qd, state=st, frame=1)

# ---- lip quarters: the candidate geometry by the plateau-edge rule (outline, lit rim, two shade steps beyond, a fringe)
def grow(m, n):
    m = m.copy()
    for _ in range(n): m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m
QO = {"nw": (0, 0), "ne": (24, 0), "se": (24, 24), "sw": (0, 24)}
def waver(t): return np.round(1.2 * np.sin(2 * np.pi * t / 24) + 0.6 * np.sin(4 * np.pi * t / 24))   # 0 at every quarter's ends: any quarter joins any other
def plateau(q, s, X, Y):
    """the upper level's region in tile coordinates (0-47) for quarter q in state s: the edge 6 px inside an open north, west or east
    side, waving gently; none on a south side (the face hangs from the cell's edge); at the tile's own side where it meets a face (the
    0 states); outer corners rounded on 12 px; an inner corner a 6 px notch with a rounded inside"""
    a = "N" if q in ("nw", "ne") else "S"; b = "W" if q in ("nw", "sw") else "E"
    open_ = {"edgeh": {a}, "edgev": {b}, "outer": {a, b}, "edgev0": set(), "outer0": {a}, "inner": set(), "fill": set()}[s]
    m = np.ones(X.shape, bool)
    if "N" in open_: m &= Y >= 6 + waver(X)
    if "W" in open_: m &= X >= 6 + waver(Y)
    if "E" in open_: m &= X <= 41 - waver(Y)
    if s.endswith("0"): m &= (X >= 0) if b == "W" else (X <= 47)
    if s == "outer" and a == "N":
        cx = 18 if b == "W" else 29; inc = (X < cx) if b == "W" else (X > cx)
        m &= ~(inc & (Y < 18) & (np.hypot(X - cx, Y - 18) > 12))
    if s == "inner":
        cx, cy = (6 if b == "W" else 41), (6 if a == "N" else 41)
        sx, sy = (X < cx) if b == "W" else (X > cx), (Y < cy) if a == "N" else (Y > cy)
        m &= ~(sx & sy)
        fx, fy = (cx + 4 if b == "W" else cx - 4), (cy + 4 if a == "N" else cy - 4)            # the notch's inside rounded on 4 px
        inb = ((X < fx) if b == "W" else (X > fx)) & ((Y < fy) if a == "N" else (Y > fy))
        m &= ~(inb & (np.hypot(X - fx, Y - fy) > 4))
        if a == "S": m[:] = True                                        # a south diagonal: the face below carries it
    return m
for qi, q in enumerate(("nw", "ne", "se", "sw")):
    for s in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner"):
        P_ = 16; ox, oy = QO[q]
        Y, X = np.mgrid[oy - P_:oy + 24 + P_, ox - P_:ox + 24 + P_]
        m = plateau(q, s, X, Y)
        if m.all():                                                     # no edge anywhere near: the plateau's own lawn shows
            add(f"meadow/lip/lip-{q}-{s}", np.full((24, 24), TR), kind="lip", quad=q, state=s); continue
        f = np.pad(LIPF[qi % 2][oy:oy + 24, ox:ox + 24], P_, mode="wrap")
        low, up = tone(LAWN0 + f), tone(LAWN0 + 1 + f)                # the ground below, and the plateau one step up the ramp (the page draws its lawn through LIGHT)
        img = np.where(~m, low, -1)                                     # outside the edge: the lower lawn, opaque, so the plateau tile shows the level change
        beyond = grow(m, 12) & ~grow(m, 1) & ~m; img[beyond] = [gstep(v, -1) for v in low[beyond]]
        near2 = grow(m, 5) & ~grow(m, 1) & ~m; img[near2] = [gstep(v, -2) for v in low[near2]]
        outl = grow(m, 1) & ~m; img[outl] = OUTL                          # a 1 px line under the turf (the owner's reference has no hard rim)
        def nb(dy, dx): return np.roll(np.roll(m, dy, 0), dx, 1)
        rim = m & ~(nb(4, 0) & nb(0, 4) & nb(0, -4) & nb(-4, 0)); img[rim] = [gstep(v, 2) for v in up[rim]]
        e1 = m & ~(nb(1, 0) & nb(0, 1) & nb(0, -1) & nb(-1, 0)); img[e1] = [gstep(v, 1) for v in img[e1]]
        rng = np.random.RandomState(1000 + qi * 10 + len(s))
        ry, rx = np.where(e1)
        for yb, xb in zip(ry, rx):
            if rng.rand() > .6: continue                                # the turf hangs over its edge in a ragged fringe of blades
            dy = -1 if not m[max(0, yb - 1), xb] else (1 if not m[min(m.shape[0] - 1, yb + 1), xb] else 0)
            dx = -1 if not m[yb, max(0, xb - 1)] else (1 if not m[yb, min(m.shape[1] - 1, xb + 1)] else 0)
            if dy == 0 and dx == 0: continue
            for t in range(1, rng.randint(2, 5)):
                y3, x3 = yb + dy * t, xb + dx * t
                if 0 <= y3 < m.shape[0] and 0 <= x3 < m.shape[1]: img[y3, x3] = gstep(up[y3, x3], 2 if t > 1 else 1)
        img = img[P_:P_ + 24, P_:P_ + 24]
        add(f"meadow/lip/lip-{q}-{s}", np.where(img >= 0, img, TR), kind="lip", quad=q, state=s)

# ---- walls, stairs, props
def spill(a, seed):
    """the plateau's turf over a wall's top: the lawn carried 9-24 px down in lobes, a lit lip, its shaded underside, the dark line
    and hanging blades. The lobes fall to 10 px within 8 px of each side, so any face meets any other."""
    h, w = a.shape; rng = np.random.RandomState(seed); xs = np.arange(w); lobe = np.zeros(w)
    for _ in range(max(1, w // 30)):
        c0, wd, ht = rng.uniform(10, w - 10), rng.uniform(18, 32), rng.uniform(3, 11)
        lobe += ht * np.clip(np.cos((xs - c0) / wd * np.pi / 2), 0, None) ** 2
    lobe *= np.clip(np.minimum(xs, w - 1 - xs) / 8.0, 0, 1)
    dd = np.clip(np.round(10 + lobe + rng.randint(-1, 2, w)), 9, 24).astype(int)
    f = LIPF[seed % 2]; f = np.concatenate([f, f[:, ::-1]] * (w // 96 + 1), 1)
    up = LRAMP[LAWN0]                                               # the plateau's lawn, untoned: the page tones a face by its upper level (grass only)
    for x, d in zip(xs, dd):
        col = np.where(a[:, x] != TR)[0]
        if not len(col): continue
        y0 = col[0]; d = min(d, h - 8)
        for y in range(y0, y0 + d): a[y, x] = tone(LAWN0 + f[y % 48, x])
        for y in range(y0 + d - 4, y0 + d - 1): a[y, x] = gstep(a[y, x], 1)
        a[y0 + d - 1, x] = gstep(up, -2); a[y0 + d, x] = OUTL
        if rng.rand() < .35:
            for t in range(1, rng.randint(2, 7)): a[y0 + d + t, x] = gstep(up, -1) if t < 3 else OUTL
    ROOT, ROOTL = nearest((86, 60, 40)), nearest((128, 92, 60))         # roots trailing from the turf down the stone (owner's reference)
    for _ in range(max(1, w // 24)):
        x = int(rng.uniform(4, w - 4)); col = np.where(a[:, x] != TR)[0]
        if not len(col): continue
        y = col[0] + dd[x] + 1; L_ = rng.randint(8, 22)
        for t in range(L_):
            if not (0 <= y < h - 10 and 1 <= x < w - 1) or a[y, x] == TR: break
            if np.isin(a[y, x], ROCKI) or mat[a[y, x]] != "grass": a[y, x] = ROOT; a[y, x - 1] = ROOTL if np.isin(a[y, x - 1], ROCKI) else a[y, x - 1]
            y += 1; x += int(rng.choice([-1, 0, 0, 0, 1]))
    return a
def flatten(a):
    """the rock at the lawn's scale: a pixel takes its 3x3 majority colour when that colour holds 5 of the 9 and is the same material
    (b1's own rule against soft gradients); cracks, moss and roots, which are runs, stay"""
    h, w = a.shape; p_ = np.pad(a, 1, mode="edge"); out = a.copy()
    st = np.stack([p_[1 + dy:h + 1 + dy, 1 + dx:w + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)], -1)
    for y in range(h):
        for x in range(w):
            v = a[y, x]
            if v == TR: continue
            u, c = np.unique(st[y, x], return_counts=True); k = u[np.argmax(c)]
            if c.max() >= 5 and k != TR and k != v and mat[k] == mat[v]: out[y, x] = k
    return out
FEET = [to_idx(os.path.join(TS, "walls", p["file"])) for p in WJ if p["kind"] == "foot"]
ROCKI = [i for i in range(NC) if mat[i] == "rock" or (i < 48 and P48.names[i] in ("void", "ink", "night", "slate", "stone", "mist", "fog", "rock", "rockL"))]
def soften(a, k=0.55):
    """the rock at the lawn's value: every rock pixel pulled 45 % toward the face's mean rock colour, then the nearest rock or grey; then
    the darkest quarter of the rock lifted one step on its own ramp, so the cliff is never the darkest, loudest thing in the place"""
    r = np.isin(a, ROCKI)
    if not r.any(): return a
    mu = PAL[a[r]].mean(0); v = mu + k * (PAL[a[r]] - mu)
    a = a.copy(); a[r] = [nearest(c, ROCKI) for c in v]
    L_ = lum[np.minimum(a, NC - 1)]; lo = r & (L_ <= np.percentile(L_[r], 25)); a[lo] = [P48.light[i] if i < 48 else rstep(i, 1) for i in a[lo]]
    return a
def base(a, seed):
    """the face stands in the ground: grass grows 4-12 px up its base in smooth lobes with blade tips, in the lower lawn's tone (it
    covers the bottom outline and squares a cap's rounded foot), and the rock above it darkens a step"""
    h, w = a.shape; rng = np.random.RandomState(seed + 7); xs = np.arange(w); g = np.zeros(w)
    for _ in range(max(2, w // 20)):
        c0, wd, ht = rng.uniform(0, w), rng.uniform(8, 20), rng.uniform(2, 8)
        g += ht * np.clip(np.cos((xs - c0) / wd * np.pi / 2), 0, None) ** 2
    g = np.clip(np.round(4 + g + rng.randint(0, 2, w)), 4, 12).astype(int)
    f = LIPF[(seed + 1) % 2]
    for x in xs:
        top = h - g[x]
        for y in range(max(0, top - 3), top):                          # the rock's foot in the grass's shade
            if np.isin(a[y, x], ROCKI): a[y, x] = DARK[a[y, x]]
        for y in range(top, h): a[y, x] = tone(LAWN0 - 1 + f[y % 48, x % 48])      # the ground below: one step under the plateau, before the face's tone
        if rng.rand() < .45:                                             # blades over the rock's foot
            for t in range(1, rng.randint(2, 6)):
                if top - t >= 0: a[top - t, x] = gstep(LRAMP[LAWN0 - 1], 1 if t < 3 else 2)
        a[top, x] = gstep(LRAMP[LAWN0 - 1], 1)
        for y in range(h - 2 - int(rng.rand() < .5), h): a[y, x] = tone(LAWN0 - 3 + f[y % 48, x % 48])   # the cliff's cast shadow on the lower lawn: two steps down, 2-3 rows
    return a
def foot(a, seed):
    """a wall's foot baked into the face's bottom rows: a foot strip (grass clumps and pebbles over the rock's base) on every 48 px
    column, as test map 12 lays one on every cell of a run's bottom edge; v1 draws no foot strips of its own"""
    h, w = a.shape
    for k in range(0, w, 48):
        s_ = FEET[(seed + k // 48) % len(FEET)][:14]; ww = min(48, w - k); seg = a[h - 14:h, k:k + ww]
        a[h - 14:h, k:k + ww] = np.where(s_[:, :ww] != TR, s_[:, :ww], seg)
    return a
for p in WJ:
    a = to_idx(os.path.join(TS, "walls", p["file"])); h, w = a.shape
    if p["kind"] in ("face", "cap"):
        a = soften(flatten(a))
        a = spill(a, sum(map(ord, p["name"])))
        a = base(a, sum(map(ord, p["name"])))
        # the key's holes inside a face (moss and vines keyed out): filled with lawn texture,
        # so a face over any ground reads the same
        from scipy import ndimage as nd_
        lab, n = nd_.label(a == TR); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
        hole = np.isin(lab, [i for i in range(1, n + 1) if i not in edge])
        f = LIPF[0]; yy, xx = np.nonzero(hole); a[yy, xx] = tone(LAWN0 + f[yy % 48, xx % 48])
    f = {k: v for k, v in p.items() if k not in ("name", "file", "px")}
    if p["kind"] == "side-end": f["kind"] = "side"
    if f["kind"] == "side":
        end = p.get("end"); ox = 48 - w if p["side"] == "w" else 0
        f["offset"] = [ox, 24 if end == "foot" else 0]; f["end"] = end or "none"; f.pop("cells", None) if end != "tail" else None
    elif p["kind"] == "foot": f["offset"] = [0, 48 - h + 2]                    # the strip breaks the wall's bottom edge, 2 px under it
    f["variant"] = str(p.get("variant", ""))
    PIECES.append((p["name"], a, dict(status="candidate", offset=f.pop("offset", [0, 0]), **f)))
for p in json.load(open(os.path.join(TS, "stairs", "stairs.json")))["pieces"]:
    a = to_idx(os.path.join(TS, "stairs", p["file"])); f = {k: v for k, v in p.items() if k not in ("name", "file", "px")}
    if p["kind"] in ("landing", "foot", "apron-top"): f["part"] = 0 if p["file"].endswith("-l.png") else 1
    if "variant" in f: f["variant"] = str(f["variant"])
    add(p["name"], a, **f)
for p in json.load(open(os.path.join(TS, "props", "props.json")))["pieces"]:
    a = to_idx(os.path.join(TS, "props", p["file"])); h, w = a.shape; f = {k: v for k, v in p.items() if k not in ("name", "file", "px")}
    if p.get("type") in ("boulder", "reeds", "flowers", "bush", "fern"):        # a contact shadow on the lawn under it, down and right (the light is upper left)
        a = np.vstack([a, np.full((4, w), TR)]); h += 4; yy, xx = np.mgrid[0:h, 0:w]; B = bayer(h, w)
        foot = np.where((a[:-4] != TR).any(1))[0].max(); cols = np.where(a[foot] != TR)[0]; cx = (cols.min() + cols.max()) / 2 + 3
        d = np.hypot((xx - cx) / max(4, 0.42 * w), (yy - foot - 1) / 3.2); sh = ((d < 0.8) | ((d < 1) & (B < (1 - d) / 0.2 * 16))) & (a == TR)
        a[sh] = tone(LAWN0 - 2 + LIPF[0][yy[sh] % 48, xx[sh] % 48])
    KEY = [P48.index[n] for n in ("magenta", "wine", "plum")]          # the magenta key's residue: on the rim the outline, inside soil
    tp = np.pad(a == TR, 1, constant_values=True); edge = tp[:-2, 1:-1] | tp[2:, 1:-1] | tp[1:-1, :-2] | tp[1:-1, 2:]
    k_ = np.isin(a, KEY); a[k_ & edge] = P48.index["plumD"]; a[k_ & ~edge] = P48.index["soil"]
    PIECES.append((p["name"], a, dict(status="candidate", offset=[(48 - w) >> 1, 48 - h], **f)))

# ---- the art director's signature: the pieces seen at 1x in a place composed by the loader's tile rules, or
# reviewed on their sheet with a settled v1 role. Still candidate: side columns and stairs (not yet composed), material.rock (its cliff-band
# captures), and every piece v1 does not draw (shore macros, lobes, beaches, bend, band, wall foot strips, bush, fern, bridge).
def signed(n, f):
    k = f["kind"]
    if k in ("ground",) or (k == "decal"): return True                # the lip, faces, caps and water quarters were redrawn (level tone, the
    # foot, the rock's contrast, round shores): candidate until they are signed in the new proof
    if k == "prop" and f.get("type") in ("boulder", "reeds", "flowers"): return True
    return False
PIECES = [(n, a, dict(f, status="signed") if signed(n, f) else f) for n, a, f in PIECES]

# ---- sheets: shelf-packed by group, at most 1024 wide
GROUPS = [("ground", lambda n: "/ground/" in n or "/material/" in n or "/decal/" in n or "/shadow/" in n),
          ("quarters", lambda n: "/lip/" in n or ("/shore/" in n and "water-" in n)),
          ("shore", lambda n: "/shore" in n or "/band/" in n), ("walls", lambda n: any(k in n for k in ("/face/", "/cap/", "/side/", "/foot/"))),
          ("stairs", lambda n: "/stair/" in n), ("props", lambda n: "/prop/" in n)]
man = {"biome": "meadow", "tile": 48, "quarter": 24, "palette": "meadow", "paletteFile": "meadow-palette.json",
       "note": "The meadow drop: signed where the art director has signed, else candidate. Sheets are 8-bit indexed on meadow-palette.json; index 44 (magenta, used by no piece) is transparent. "
               "Built by art/companion-48/tools/build-meadow-drop.py from its inputs in art/companion-48/terrain/grass/.", "sheets": {}, "pieces": []}
done = set()
for g, pick in GROUPS:
    items = [(n, a, f) for n, a, f in PIECES if n not in done and pick(n)]
    if not items: continue
    items.sort(key=lambda t: (-t[1].shape[0], t[0]))
    W = 1024; x = y = sh = 0; pos = []
    for n, a, f in items:
        h, w = a.shape
        if x + w > W: x = 0; y += sh + 1; sh = 0
        pos.append((x, y)); x += w + 1; sh = max(sh, h)
    H = y + sh; assert H <= 1024, (g, H)
    sheet = np.full((H, max(x2 + a.shape[1] for (x2, _), (_, a, _) in zip(pos, items))), TR, dtype=np.uint8)
    for (px, py), (n, a, f) in zip(pos, items):
        sheet[py:py + a.shape[0], px:px + a.shape[1]] = a; done.add(n)
        man["pieces"].append({"name": n, **f, "sheet": g, "x": px, "y": py, "w": int(a.shape[1]), "h": int(a.shape[0])})
    KEYI = P48.index["magenta"]; assert not (sheet == KEYI).any()      # transparent is magenta's slot, unused by every piece (every PLTE entry is in the table)
    sheet[sheet == TR] = KEYI
    im = Image.fromarray(sheet, "P"); im.putpalette([v for c in PAL for v in c])
    im.save(os.path.join(out, f"meadow-{g}.png"), transparency=bytes([255] * KEYI + [0] + [255] * (NC - KEYI - 1)))
    man["sheets"][g] = f"meadow-{g}.png"
left = [n for n, _, _ in PIECES if n not in done]; assert not left, left
json.dump(man, open(os.path.join(out, "meadow.json"), "w"), indent=1)
print(len(man["pieces"]), "pieces on", len(man["sheets"]), "sheets;", "sand", SAND, "water body", WB, "lawn base", LRAMP[LAWN0])
np.save(os.path.join(proof, "pieces.npy"), np.array([(n, a) for n, a, _ in PIECES], dtype=object), allow_pickle=True)
