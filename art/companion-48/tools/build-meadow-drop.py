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
  material.rock   48 px of rock from the 1-wide faces' middle rows (generator 1's cliff band)
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
PAL = np.array([hx(c["hex"]) for c in cols]); NC = len(PAL); TR = NC          # transparent while building; written as magenta's slot (44)
assert NC == 96 and all(cols[i]["hex"] == P48.hexes[i] for i in range(48))
CORE_G = ["pine", "forest", "leaf", "grass", "sprout", "lime"]
mat = np.array([c.get("material", "grass" if c.get("name") in CORE_G else "core") for c in cols])
lum = 0.2126 * PAL[:, 0] + 0.7152 * PAL[:, 1] + 0.0722 * PAL[:, 2]

# ---- the palette's tables
def nearest(rgb, among=None):
    s = np.arange(NC) if among is None else np.array(among); q = PAL[s]
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
FOG = [P48.fog[i] if i < 48 else nearest(mix("bone", .62, i)) for i in range(NC)]
FADE = [P48.fade[i] if i < 48 else nearest(mix("stone", .5, i)) for i in range(NC)]
DARK2 = [DARK[d] for d in DARK]
NAMES = [cols[i].get("name") or f"{cols[i]['material']}-{i}" for i in range(NC)]
assert len(set(c["hex"] for c in cols)) == NC
with open(os.path.join(out, "meadow-palette.json"), "w") as fh:      # one entry per index, one per line: i, name, hex and the five tables
    fh.write('{ "biome": "meadow", "entries": [\n' + ",\n".join("  " + json.dumps({"i": i, "name": NAMES[i], "hex": cols[i]["hex"],
             "dark": int(DARK[i]), "light": int(LIGHT[i]), "dark2": int(DARK2[i]), "fog": int(FOG[i]), "fade": int(FADE[i])}) for i in range(NC)) + " ] }\n")

def to_idx(path_or_img):
    im = Image.open(path_or_img) if isinstance(path_or_img, str) else path_or_img
    a = np.asarray(im.convert("RGBA")); rgb = a[..., :3].reshape(-1, 1, 3).astype(int)
    i = ((rgb - PAL[None]) ** 2).sum(-1).argmin(1).reshape(a.shape[:2])          # nearest colour, plain RGB distance
    return np.where(a[..., 3] > 127, i, TR)

# ---- b1's lawn ramp: its seven commonest lawn tones, dark to light, and the lit tone they centre on
B1 = to_idx(os.path.join(G, "mockup", "b1", "scene-1x.png"))
lawn = mat[B1] == "grass"
vals, cnts = np.unique(B1[lawn], return_counts=True); medl = np.median(lum[B1[lawn]])
BASE = int(max((c_, v_) for v_, c_ in zip(vals, cnts) if lum[v_] > medl)[1])
LRAMP = sorted(vals[np.argsort(-cnts)[:7]], key=lambda i: lum[i]); LB = LRAMP.index(BASE); TOPK = len(LRAMP) - 2
LIX = {t: k for k, t in enumerate(LRAMP)}
def ls(i, k): return LRAMP[max(0, min(len(LRAMP) - 1, LIX[i] + k))] if i in LIX else gstep(i, k)
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

def lawn_tile(f, seed):
    t = tone(LAWN0 + f); rng = np.random.RandomState(seed)
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
for k in range(6): add(f"meadow/ground/lawn-{k + 1}", lawn_tile(FL[k], 300 + k), kind="ground", set="lawn", variant=str(k + 1))
WQ = {n: to_idx(os.path.join(TS, "water", n + ".png")) for n in ("q-nw-edgeh-f1", "q-nw-fill-f1")}
bank = WQ["q-nw-edgeh-f1"]; bk = bank[bank != TR]; bk = bk[np.isin(mat[bk], ["earth", "sand"])]; bv, bc = np.unique(bk, return_counts=True)
SAND = sorted(bv[np.argsort(-bc)[:2]], key=lambda i: -lum[i]) if len(bv) else [P48.index["sand"]]
rs = np.random.RandomState(9); sd = np.full((48, 48), SAND[0])
for _ in range(26): y, x = rs.randint(48), rs.randint(47); sd[y, x] = SAND[-1]; sd[y, x + 1] = SAND[-1] if rs.rand() < .5 else sd[y, x + 1]
add("meadow/ground/sand-1", sd, kind="ground", set="sand", variant="1")
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
    if p["kind"] == "shore": f["set"] = "water"
    add(p["name"], to_idx(os.path.join(TS, "water", p["file"])), **f)

# ---- lip quarters: the candidate geometry by the plateau-edge rule (outline, lit rim, two shade steps beyond, a fringe)
def grow(m, n):
    m = m.copy()
    for _ in range(n): m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m
LIPF = fleck_windows(8, 2)[6:]
for qi, q in enumerate(("nw", "ne", "se", "sw")):
    for s in ("fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner"):
        reg = np.asarray(Image.open(os.path.join(G, "pieces", "region", f"lip-{q}-{s}.png")).convert("L")) > 0
        P_ = 16; m = np.pad(reg, P_, mode="edge")
        if s == "fill": add(f"meadow/lip/lip-{q}-{s}", np.full((24, 24), TR), kind="lip", quad=q, state=s); continue
        if s.endswith("0"):                                        # beside a face: the edge runs at the tile's own side, its shade on the face
            if q in ("nw", "sw"): m[:, :P_] = False
            else: m[:, -P_:] = False
        fy, fx = (0, 0) if q in ("nw",) else (0, 24) if q == "ne" else (24, 24) if q == "se" else (24, 0)
        base = tone(LAWN0 + np.pad(LIPF[qi % 2][fy:fy + 24, fx:fx + 24], P_, mode="wrap"))
        img = np.full(m.shape, -1)
        sf = np.zeros_like(m)                                      # the edge rule on north, west and east; never along a south side
        beyond = grow(m, 12) & ~grow(m, 2) & ~m; img[beyond] = [gstep(v, -1) for v in base[beyond]]
        near2 = grow(m, 5) & ~grow(m, 2) & ~m; img[near2] = [gstep(v, -2) for v in base[near2]]
        outl = grow(m, 2) & ~m; img[outl] = OUTL
        def nb(dy, dx): return np.roll(np.roll(m, dy, 0), dx, 1)
        rim = m & ~(nb(4, 0) & nb(0, 4) & nb(0, -4) & nb(-4, 0)); img[rim] = [ls(v, 2) for v in base[rim]]
        e1 = m & ~(nb(1, 0) & nb(0, 1) & nb(0, -1) & nb(-1, 0)); img[e1] = [gstep(v, 1) for v in np.where(img[e1] >= 0, img[e1], base[e1])]
        rng = np.random.RandomState(1000 + qi * 10 + len(s))
        ry, rx = np.where(e1)
        for yb, xb in zip(ry, rx):
            if rng.rand() > .35: continue
            dy = -1 if not m[max(0, yb - 1), xb] else (1 if not m[min(m.shape[0] - 1, yb + 1), xb] else 0)
            dx = -1 if not m[yb, max(0, xb - 1)] else (1 if not m[yb, min(m.shape[1] - 1, xb + 1)] else 0)
            if dy == 0 and dx == 0: continue
            for t in range(1, rng.randint(2, 5)):
                y3, x3 = yb + dy * t, xb + dx * t
                if 0 <= y3 < m.shape[0] and 0 <= x3 < m.shape[1]: img[y3, x3] = ls(LRAMP[LAWN0], 2 if t > 1 else 1)
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
    up = LRAMP[LAWN0]
    for x, d in zip(xs, dd):
        col = np.where(a[:, x] != TR)[0]
        if not len(col): continue
        y0 = col[0]; d = min(d, h - 8)
        for y in range(y0, y0 + d): a[y, x] = tone(LAWN0 + f[y % 48, x])
        for y in range(y0 + d - 4, y0 + d - 1): a[y, x] = gstep(a[y, x], 1)
        a[y0 + d - 1, x] = gstep(up, -2); a[y0 + d, x] = OUTL
        if rng.rand() < .35:
            for t in range(1, rng.randint(2, 7)): a[y0 + d + t, x] = gstep(up, -1) if t < 3 else OUTL
    return a
for p in WJ:
    a = to_idx(os.path.join(TS, "walls", p["file"])); h, w = a.shape
    if p["kind"] in ("face", "cap"):
        a = spill(a, sum(map(ord, p["name"])))
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
    KEY = [P48.index[n] for n in ("magenta", "wine", "plum")]          # the magenta key's residue: on the rim the outline, inside soil
    tp = np.pad(a == TR, 1, constant_values=True); edge = tp[:-2, 1:-1] | tp[2:, 1:-1] | tp[1:-1, :-2] | tp[1:-1, 2:]
    k_ = np.isin(a, KEY); a[k_ & edge] = P48.index["plumD"]; a[k_ & ~edge] = P48.index["soil"]
    PIECES.append((p["name"], a, dict(status="candidate", offset=[(48 - w) >> 1, 48 - h], **f)))

# ---- the art director's signature: the pieces seen at 1x in a place composed by the loader's tile rules, or
# reviewed on their sheet with a settled v1 role. Still candidate: side columns and stairs (not yet composed), material.rock (its cliff-band
# captures), and every piece v1 does not draw (shore macros, lobes, beaches, bend, band, wall foot strips, bush, fern, bridge).
def signed(n, f):
    k = f["kind"]
    if k in ("ground", "lip", "face", "cap") or (k == "decal"): return True
    if k == "shore" and f.get("set") == "water": return True
    if k == "prop" and f.get("type") in ("boulder", "reeds", "flowers"): return True
    return False
PIECES = [(n, a, dict(f, status="signed") if signed(n, f) else f) for n, a, f in PIECES]

# ---- sheets: shelf-packed by group, at most 1024 wide
GROUPS = [("ground", lambda n: "/ground/" in n or "/material/" in n or "/decal/" in n),
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
