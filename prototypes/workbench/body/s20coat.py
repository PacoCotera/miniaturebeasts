"""The Tuliko coat (chunk 5): a colour and an emission per surface point from the creature's coat genome. Pure numpy, deterministic, no Blender.
Everything is a function of the point's island coordinates (part, arc along the part, around), its 3D position and normal, and a few seeded fields:
- zones from the file (belly, ear-inner, face mask, points, socks, tail bands, spots, cap), soft-edged, by layout;
- a form-following gradient (countershading: darker on the back, lighter underneath, warm on the rim);
- ember flecks (3D value noise), glowing freckles that thicken and brighten toward the tail, and the lantern's warm bleed down the tail;
- reaction-diffusion (Gray-Scott) spots or labyrinth on the torso island (periodic round the body), Voronoi rosettes, tail and body bands;
- the face as decals on the loft's own coordinates: eyes (open / half / closed frames: a blink changes colour only, never the outline), the mouth, the cheek blush, a brow stripe and a small heart or star mark.
Colours are sRGB 0-255 in data and linear in the returned arrays."""
import math
import numpy as np

COAT_DEFAULT = dict(
    palette="dusk", hue=270.0, glow_hue=80.0, glow_pattern="none", layout="plain", coat_value=1.0, belly_reach=0.0, glow=0.9, grain=0.35, sheen=0.3,
    gradient=0.25, hue_shift=0.0, fleck=0.35, freckle_density=0.35, freckle_glow=0.8, bleed=0.55,
    rd="none", rd_scale=1.0, rd_contrast=0.5, rosette=0.0, bands=5, brow=0.0, mark="none", mark_size=0.10, mark_where="forehead",
    blush=True, eye_size=1.0, eye_height=0.0, eye_spacing=0.0, mouth_width=1.0, mouth_z=0.0, expression="content",
    seed=20, eye_frame="open")


def srgb_to_lin(c):
    c = np.asarray(c, float) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255.0


def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = np.asarray(t, float)
    return a * (1 - t[..., None]) + b * t[..., None]


# ---------------------------------------------------------------- noise
def _hash3(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1274126177) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = (h ^ (h >> 16)) & 0xFFFFFFFF
    return h.astype(np.float64) / 4294967295.0


def vnoise(P, seed=0):
    """3D value noise in [0, 1] (trilinear on a hashed lattice, smoothstep weights)."""
    P = np.asarray(P, float)
    i = np.floor(P).astype(np.int64)
    f = P - i
    w = f * f * (3 - 2 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                h = _hash3(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
                out = out + h * ((w[:, 0] if dx else 1 - w[:, 0]) * (w[:, 1] if dy else 1 - w[:, 1]) * (w[:, 2] if dz else 1 - w[:, 2]))
    return out


def fbm(P, seed=0, octaves=3):
    a, tot, out = 0.5, 0.0, 0.0
    for o in range(octaves):
        out = out + a * vnoise(P * (2 ** o), seed + 17 * o)
        tot += a
        a *= 0.5
    return out / tot


def voronoi(P, seed=0):
    """Cellular noise: (distance to the nearest jittered cell point, that cell's hash) on a unit lattice."""
    P = np.asarray(P, float)
    i = np.floor(P).astype(np.int64)
    best = np.full(len(P), 9.0)
    cell = np.zeros(len(P))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx, cy, cz = i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz
                jit = np.stack([_hash3(cx, cy, cz, seed + 1), _hash3(cx, cy, cz, seed + 2), _hash3(cx, cy, cz, seed + 3)], 1)
                d = np.linalg.norm(np.stack([cx, cy, cz], 1) + jit - P, axis=1)
                m = d < best
                best = np.where(m, d, best)
                cell = np.where(m, _hash3(cx, cy, cz, seed + 4), cell)
    return best, cell


def gray_scott(kind, seed, nx=192, ny=128, steps=2600):
    """Reaction-diffusion on a grid periodic in x (round the body) and clamped in y (up the body): returns v in [0, 1] (1 = the activator's spots / stripes)."""
    f, k = {"spots": (0.0367, 0.0649), "labyrinth": (0.0290, 0.0570), "rings": (0.0545, 0.0620)}[kind]
    rng = np.random.default_rng(seed)
    U = np.ones((ny, nx)); V = np.zeros((ny, nx))
    for _ in range(40):
        y, x = rng.integers(8, ny - 8), rng.integers(8, nx - 8)
        V[y - 3:y + 4, x - 3:x + 4] = 0.5 + 0.1 * rng.random()
        U[y - 3:y + 4, x - 3:x + 4] = 0.25
    Du, Dv = 0.16, 0.08
    def lap(Z):
        return (np.roll(Z, 1, 1) + np.roll(Z, -1, 1) + np.vstack([Z[:1], Z[:-1]]) + np.vstack([Z[1:], Z[-1:]]) - 4 * Z)
    for _ in range(steps):
        uvv = U * V * V
        U += Du * lap(U) - uvv + f * (1 - U)
        V += Dv * lap(V) + uvv - (f + k) * V
    v = (V - V.min()) / max(V.max() - V.min(), 1e-9)
    return v


_RD_CACHE = {}


def rd_field(kind, seed):
    key = (kind, seed)
    if key not in _RD_CACHE:
        _RD_CACHE[key] = gray_scott(kind, seed)
    return _RD_CACHE[key]


def sample_grid(G, x, y):
    """Bilinear sample of grid G (ny, nx) at x in [0,1) (periodic) and y in [0,1]."""
    ny, nx = G.shape
    fx = (np.asarray(x) % 1.0) * nx; fy = np.clip(np.asarray(y), 0, 1) * (ny - 1)
    x0 = np.floor(fx).astype(int); y0 = np.minimum(np.floor(fy).astype(int), ny - 2)
    tx, ty = fx - x0, fy - y0
    x1 = (x0 + 1) % nx; x0 = x0 % nx
    return (G[y0, x0] * (1 - tx) * (1 - ty) + G[y0, x1] * tx * (1 - ty) + G[y0 + 1, x0] * (1 - tx) * ty + G[y0 + 1, x1] * tx * ty)


# ---------------------------------------------------------------- signed distance shapes (decal marks)
def sd_heart(x, y):
    """A heart of unit scale (|x|,|y| about 1) as an implicit field, negative inside: (x^2 + y^2 - 1)^3 - x^2 y^3."""
    x = np.asarray(x); y = np.asarray(y)
    return (x * x + y * y - 1) ** 3 - x * x * y ** 3


def sd_star(x, y, n=5, ri=0.45):
    ang = np.arctan2(y, x) + math.pi / 2
    r = np.hypot(x, y)
    seg = 2 * math.pi / n
    a = (ang % seg) - seg / 2
    # polar outline of a star: linear between the outer point (r 1) and the inner vertex (r ri)
    t = np.abs(a) / (seg / 2)
    rout = ri + (1 - ri) * (1 - t)
    return (r - rout)


def disc(u, v, r, soft):
    return 1 - sstep(r - soft, r + soft, np.hypot(u, v))


def band_f(x, lo, hi, soft):
    return sstep(lo - soft, lo + soft, x) * (1 - sstep(hi - soft, hi + soft, x))


def band(x, lo, hi, soft):
    return sstep(lo - soft, lo + soft, x) * (1 - sstep(hi - soft, hi + soft, x))


def surface_frame(G, z, a):
    """Outward normal, 'up' tangent and the viewer-right tangent at the loft point (z, a) on the left half (y >= 0)."""
    e = 1e-3
    P = G.point(np.array([z]), np.array([a]))[0]
    pz = G.point(np.array([z + e]), np.array([a]))[0] - G.point(np.array([z - e]), np.array([a]))[0]
    pa_ = G.point(np.array([z]), np.array([min(a + e, 1.0)]))[0] - G.point(np.array([z]), np.array([max(a - e, 0.0)]))[0]
    n = np.cross(pa_, pz)
    n /= np.linalg.norm(n)
    if n @ np.array([P[0], P[1], 0.0]) < 0:
        n = -n
    up = pz - (pz @ n) * n
    up /= np.linalg.norm(up)
    rgt = np.cross(n, up)                      # for a surface facing +x this is -y: the viewer's right
    return P, n, up, rgt


# ---------------------------------------------------------------- the coat
def _hsv(h, s_, v):
    h = (h % 360.0) / 60.0
    i = int(h) % 6
    f = h - int(h)
    p, q, t = v * (1 - s_), v * (1 - f * s_), v * (1 - (1 - f) * s_)
    return [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]


def _luma(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def color_hl(h, s_, L):
    """An sRGB colour (0-255) of hue h (degrees), saturation s_ and the given Rec.709 luma L (0-1, on the gamma values): the value is found by bisection; where full value is still too dark the saturation drops."""
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = 0.5 * (lo + hi)
        if _luma(_hsv(h, s_, m)) < L:
            lo = m
        else:
            hi = m
    v = hi
    ss = s_
    while _luma(_hsv(h, ss, v)) < L - 0.01 and ss > 0.02:
        ss -= 0.02
    return np.array(_hsv(h, ss, v)) * 255.0


WARM_BELLY = (10.0, 35.0)      # the hue window where a cream belly (with a lit tail) would read as the famous fire-tailed starter: there the belly is dark, darker than the body


def hue_window(h):
    return WARM_BELLY[0] <= (h % 360.0) <= WARM_BELLY[1]


def is_warm(h):
    h = h % 360.0
    return h <= 70.0 or h >= 340.0


def hsv_plush(h, s_, v):
    """An sRGB colour (0-255) from hue (deg), HSV saturation and value: the plush range (saturation 0.35-0.60, value 0.55-0.85) is enforced by the callers' clamps."""
    return np.array(_hsv(h, s_, v)) * 255.0


def palette_from_hue(h, g):
    """The body palette from the hue gene, in a plush range (not hot, not flat): the coat's HSV saturation 0.35-0.60 and value 0.55-0.85 (value lower at hues that read bright: yellow-green, cyan), the belly always at least 15 % lighter than the coat (a pale tint of
    the hue; in the 10-35 degree window a pale COOL belly, never cream, with a rust-ochre coat: the fire-tailed starter's cream belly with a warm coat and a lit tail is the likeness to avoid), ear-inner a lighter contrasting pastel, pad, mark and nose darker, and the
    firefly glow (hue 70-90 on every palette)."""
    h = float(h) % 360.0
    cv = float(g.get("coat_value", 1.0))
    # brighter hues (yellow to cyan) get a lower value so the luma stays level across the wheel
    bright = max(0.0, 1.0 - abs(((h - 105.0 + 180.0) % 360.0) - 180.0) / 75.0)
    v = float(np.clip((0.78 - 0.17 * bright) * cv, 0.55, 0.85))
    hot = max(0.0, 1.0 - abs(((h - 245.0 + 180.0) % 360.0) - 180.0) / 45.0) + max(0.0, 1.0 - abs(((h - 320.0 + 180.0) % 360.0) - 180.0) / 40.0)      # blues and pinks read hot first
    sat = float(np.clip(0.52 - 0.06 * bright - 0.11 * min(hot, 1.0), 0.35, 0.60))
    if hue_window(h):
        sat = float(np.clip(sat, 0.45, 0.58))
    # look-dev (30ad1e70): the soft studio light and AgX Punchy take light off the coat, more at the cool hues. Measured medians of the rendered body at 96 px: violet S 0.33 V 0.60, rust S 0.47 V 0.67, green S 0.43 V 0.53. The palette folds in the gains so the rendered coat
    # lands at about S 0.45-0.55, V 0.65-0.75 (the plush range, in the house light): value x1.0 on the warm hues up to x1.32 on the greens and cool hues, saturation x1.15-1.4 on the cool ones.
    warm_w = max(0.0, 1.0 - min(abs(((h - 30.0 + 180.0) % 360.0) - 180.0), 120.0) / 80.0)
    gv = 1.0 + 0.32 * (1.0 - min(1.0, warm_w * 1.4))
    cool = max(0.0, 1.0 - abs(((h - 250.0 + 180.0) % 360.0) - 180.0) / 110.0)
    gs = 1.12 + 0.28 * cool
    v = float(np.clip(v * gv, 0.55, 0.86)); sat = float(np.clip(sat * gs, 0.35, 0.75))
    coat = hsv_plush(h, sat, v)
    cl = _luma(coat / 255.0)
    bs_ = float(np.clip(0.6 * sat, 0.2, 0.5))                                  # a lighter, slightly warmer tint of the base hue: value +20 %, saturation 0.6 x the base (never neutral grey)
    bv_ = float(min(1.0, v * 1.22 + 0.04))
    if hue_window(h):
        belly = hsv_plush(h + 175.0, bs_ * 0.7, bv_)                           # pale COOL belly on the rust coat
    else:
        warm_shift = ((40.0 - h + 180.0) % 360.0) - 180.0
        belly = hsv_plush(h + 0.12 * warm_shift, bs_, bv_)
    P = dict(coat=coat, belly=belly, **{"ear-inner": hsv_plush(h + 55.0, 0.34, 0.95)}, pad=hsv_plush(h, min(0.6, sat + 0.05), v * 0.72), mark=hsv_plush(h + 8.0, min(0.6, sat + 0.08), v * 0.55), nose=hsv_plush(h, 0.45, 0.2),
             glow=color_hl(float(g.get("glow_hue", 80.0)), 0.78, 0.86))
    return P


def palette_of(spec, g):
    if g.get("hue") is not None:
        pal = palette_from_hue(float(g["hue"]) + 360.0 * float(g.get("hue_shift", 0.0)), g)
        pal = {k: np.array(v, float) for k, v in pal.items()}
        pal["_hue"] = float(g["hue"]) + 360.0 * float(g.get("hue_shift", 0.0))
        acc = spec["palettes"]["accents"]
        for k in acc:
            pal["acc_" + k] = np.array(acc[k], float)
        return pal
    P = spec["palettes"][g["palette"]]
    pal = {k: np.array(P[k], float) for k in P}
    pal["coat"] = np.clip(pal["coat"] * g["coat_value"], 0, 255)
    pal["mark"] = np.clip(pal["mark"] * g["coat_value"], 0, 255)
    if g.get("hue_shift"):
        c = pal["coat"] / 255.0
        h = g["hue_shift"]
        cr, sr = math.cos(h * 2 * math.pi), math.sin(h * 2 * math.pi)
        k = 1 / 3.0; s3 = math.sqrt(1 / 3.0)
        R = np.array([[cr + (1 - cr) * k, k * (1 - cr) - s3 * sr, k * (1 - cr) + s3 * sr],
                      [k * (1 - cr) + s3 * sr, cr + k * (1 - cr), k * (1 - cr) - s3 * sr],
                      [k * (1 - cr) - s3 * sr, k * (1 - cr) + s3 * sr, cr + k * (1 - cr)]])
        pal["coat"] = np.clip(R @ c, 0, 1) * 255.0
    acc = spec["palettes"]["accents"]
    for k in acc:
        pal["acc_" + k] = np.array(acc[k], float)
    return pal


def coat(ctx, V, attr, part, N, tag, genome, frame="open"):
    """V (n,3) level-3 vertices of the full mesh, attr (n,4) (part, s, around, tag), part (n,) int part id per vertex, N (n,3) vertex normals, tag (n,) bead tag.
    Returns dict(col linear (n,3), emit linear (n,3), rough (n,)) and a `fields` dict of the masks (for the pictures and tests)."""
    spec, G = ctx["spec"], ctx["T"]
    g = {**COAT_DEFAULT, **genome}
    pal = palette_of(spec, g)
    pn = {v: k for k, v in ctx["body_parts"].items()}
    isp = lambda name: (part == ctx["body_parts"][name]) if name in ctx["body_parts"] else np.zeros(len(V), bool)
    n = len(V)
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    side = np.where(y >= 0, 1.0, -1.0)
    Vm = V * np.array([1.0, 1.0, 1.0]); Vm = np.stack([x, np.abs(y), z], 1)         # folded to the left half
    Nm = N * np.stack([np.ones(n), side, np.ones(n)], 1)
    torso, leg, ear, arm = (isp(k) for k in ("torso", "leg.L", "ear.L", "arm.L"))
    nose = np.zeros(len(V), bool)
    tip = torso & (attr[:, 1] <= float(ctx["T"].bulb[0]) + 1e-9) & (ctx["T"].bulb[0] > 0)          # the bulb is the last stretch of the one spine
    r_xy = np.hypot(x, y)
    a_geo = np.arctan2(np.abs(y), -x) / np.pi                       # the straight gourd's `around` (0 back line, 1 front line): true on the upper body
    # ONE spine, ONE loft: the tail is the first named range of the loft's arc length (s runs from the lantern stalk; u from the crown). Island coordinates of a loft vertex: the ring's `around` and its arc length.
    G_ = ctx["T"]
    s_loft = attr[:, 1]
    a_geo = np.where(torso, attr[:, 2], a_geo)                      # along the bend and the tail the ring's own `around` (the dorsal line 0, the ventral line 1) is the truth
    Lt = float(G_.s_root)                                            # length of the tail range (stalk to root)
    tail = torso & (s_loft <= Lt)
    zeff = np.where(torso, 2.2 - (G_.L - s_loft), z)                # the height the same arc length would have on a straight spine: the zone bands (belly, brow...) are written in it
    s = np.where(tail, Lt - s_loft, attr[:, 1])                     # along the tail: arc length from its root (as the tail's zones were written)
    # a tube's arc length from the geometry (the bridge band between the loft and the tube carries the loft's attribute at its loop, which is not an arc length along the tube)
    import s20tex as _TX
    for nm_, msk in (("ear.L", ear), ("arm.L", arm)):
        if msk.any() and nm_ in ctx["info"]["tubes"]:
            _, v_, _ = _TX.tube_uv(ctx, nm_, Vm[msk])
            s = np.array(s, float); s[msk] = v_
    seed = int(g["seed"])
    col = srgb_to_lin(np.tile(pal["coat"], (n, 1)))
    emit = np.zeros((n, 3))
    rough = np.full(n, 0.66)
    F = {}
    # ---- position along the creature from the head (0) to the tail tip (1): the freckles and the bleed use it
    t_body = np.clip(0.38 * (1 - (zeff - 0.2) / 1.9) + 0.12 * (1 - a_geo) * (1 - sstep(1.2, 2.2, zeff)), 0, 0.5)
    t_tail = 0.5 + 0.5 * np.clip(s / Lt, 0, 1)
    t = np.where(tail | tip, t_tail, t_body)
    t = np.where(tip, 1.0, t)
    F["t"] = t
    # ---- the form-following gradient: countershading
    top = np.clip(N[:, 2] * 0.5 + 0.5, 0, 1)
    val = 1 + g["gradient"] * (0.5 - top)
    col = col * val[:, None]
    # ember flecks and grain (value noise): soft, tied to the surface
    fl = fbm(V * 26.0, seed, 3)
    col = col * (1 + g["fleck"] * (fl - 0.5) * 0.7)[:, None]
    # ---- reaction-diffusion on the torso (periodic round the body)
    belly_lo = 0.70 - g["belly_reach"]
    zlo, zhi = spec["zones"]["belly"]["z"]
    soft = spec["zones"]["belly"]["soft"]
    soft = soft * 1.5                                                                  # a plush belly fades into the coat over about 0.04 H at its edge
    # the belly patch is a soft teardrop on the surface (not a UV rectangle): widest at the belly, narrowing up the chest to a soft point under the neck and rounding off between the legs; its edge is feathered over about 0.05 H with a little noise
    lat = (1.0 - a_geo) * math.pi * 0.55                                   # arc across the front from the front line, in H
    zt_ = np.clip((zeff - 0.26) / (1.14 - 0.26), 0.0, 1.0)
    wid = (0.46 + 0.6 * g["belly_reach"]) * np.sin(math.pi * zt_ ** 0.8) ** 0.75                  # half width: zero at the hips' round-off and at the chest's soft point
    nz_ = fbm(V * 9.0, seed + 41, 2) - 0.5
    edge_ = 0.05
    belly = (1 - sstep(wid - edge_, wid + edge_, lat + 0.04 * nz_)) * (zt_ > 0.0) * (zt_ < 1.0) * sstep(0.3, 0.5, a_geo)
    belly = np.where(torso & ~tail, belly, 0.0)
    F["belly"] = belly
    mark = srgb_to_lin(pal["mark"])
    if g["rd"] != "none":
        sc = float(g["rd_scale"])
        key = (g["rd"], seed)
        theta = np.where(y >= 0, 1.0 - a_geo, a_geo - 1.0)          # -1 .. 1 round the body from the front line; the back line is +-1
        gx = (theta * 0.5) % 1.0
        gy = (zeff - 0.2) / 2.0
        grid = _rd(g["rd"], seed, sc)
        pat = sample_grid(grid, gx, gy)
        w = torso * (1 - belly) * (1 - sstep(1.95, 2.15, z))
        m = w * sstep(0.46, 0.62, pat) * (0.55 + 0.45 * g["rd_contrast"])
        F["rd"] = m
        col = col * (1 - m[:, None]) + mark * m[:, None] * 1.0
    # ---- zones by layout
    zones = set(spec["layouts"][g["layout"]])
    belly_c = srgb_to_lin(pal["belly"])
    col = col * (1 - belly[:, None]) + belly_c * belly[:, None]
    # ear-inner: the forward face of the ear, soft, inset
    if "ear-inner" in zones and ear.any():
        d = np.array([0.85, -0.35, 0.25]); d /= np.linalg.norm(d)
        recs = ctx["info"]["tubes"].get("ear.L")
        Le = recs["path"].length if recs else 0.6
        m = sstep(0.30, 0.62, Nm @ d) * (1 - sstep(Le - 0.14, Le - 0.03, s)) * sstep(recs["first_s"] - 0.02 if recs else 0.2, recs["first_s"] + 0.12 if recs else 0.3, s)
        m = np.where(ear, m, 0.0)
        F["ear_inner"] = m
        col = col * (1 - m[:, None]) + srgb_to_lin(pal["ear-inner"]) * m[:, None]
    if "face" in zones and torso.any():
        P, nrm, up, rgt = surface_frame(G, 1.48, 1.0)
        d = Vm - P
        u, v = d @ rgt, d @ up
        m = (1 - sstep(0.85, 1.15, np.hypot(u / 0.30, v / 0.16))) * (d @ nrm > -0.15) * torso
        F["face"] = m
        col = col * (1 - m[:, None]) + srgb_to_lin(pal["pad"]) * 0.9 * m[:, None]
    if "points" in zones:
        Le = ctx["info"]["tubes"].get("ear.L", {"path": None})
        pts = np.zeros(n)
        if ear.any() and Le["path"] is not None:
            pts = np.where(ear, sstep(Le["path"].length - 0.18, Le["path"].length - 0.06, s), pts)
        pts = np.where(tail, sstep(Lt - 0.30, Lt - 0.10, s), pts)
        pts = np.where(leg, 1 - sstep(0.12, 0.2, z), pts)
        F["points"] = pts
        col = col * (1 - 0.95 * pts[:, None]) + mark * 0.95 * pts[:, None]
    if "socks" in zones:
        m = np.where(leg, 1 - sstep(0.12, 0.2, z), 0.0)
        F["socks"] = m
        col = col * (1 - m[:, None]) + belly_c * m[:, None]
    if "tail-bands" in zones:
        lam = Lt / max(g["bands"], 2)
        ph = (s / lam) % 1.0
        m = np.where(tail, band(ph, 0.0, 0.35, 0.07) * sstep(0.1, 0.25, s / Lt), 0.0)
        # a few bands carry on over the seat: the body's bands are faint
        F["tail_bands"] = m
        col = col * (1 - m[:, None]) + mark * m[:, None]
    if "spots" in zones and torso.any():
        size = 0.11
        d, cell = voronoi(V * (1.0 / size), seed + 5)
        r = 0.30 + 0.12 * cell
        host = torso * (1 - sstep(0.45, 0.6, a_geo)) * band(zeff, 0.35, 1.95, 0.15) * (1 - belly)
        m = host * (1 - sstep(r - 0.06, r + 0.04, d)) * (cell > (0.35 - 0.3 * 0.0))
        F["spots"] = m
        ring = host * band(d, r - 0.16, r, 0.04) * (cell > 0.35) * g["rosette"]
        col = col * (1 - m[:, None]) + mark * m[:, None]
        col = col * (1 - 0.55 * ring[:, None]) + mark * 0.55 * ring[:, None]
    if "cap" in zones and torso.any():
        m = torso * sstep(1.96 - 0.04 + (fl - 0.5) * 0.1, 1.96 + 0.08, z)
        F["cap"] = m
        col = col * (1 - m[:, None]) + mark * m[:, None]
    # brow stripe (a gene): a band across the brow above the eyes
    if g["brow"] > 0 and torso.any():
        w = 0.022 + 0.02 * g["brow"]
        m = torso * band(z, 1.855 - w, 1.855 + w, 0.012) * sstep(0.55, 0.7, a_geo)
        F["brow"] = m
        col = col * (1 - m[:, None]) + mark * m[:, None]
    # legs: pads and bead toes; arms and the nose
    if leg.any():
        pad = leg * (1 - sstep(0.03, 0.09, z))                  # the paw's colour boundary is a smooth function of height (pass 3: it came from the vertex normals and stepped)
        col = col * (1 - pad[:, None]) + srgb_to_lin(pal["pad"]) * pad[:, None]
        bead = leg * (1 - sstep(-0.9, -0.5, attr[:, 1]))              # the toe shells (arc length -1), not the sole's creased rim
        col = col * (1 - bead[:, None]) + belly_c * bead[:, None]
    if nose.any():
        col[nose] = srgb_to_lin(pal["nose"])
        rough[nose] = 0.35
    if arm.any():
        rec_a = ctx["info"]["tubes"]["arm.L"]
        tt = np.clip((s - rec_a["first_s"]) / max(rec_a["path"].length - rec_a["first_s"], 1e-3), 0, 1)
        m = arm * sstep(0.55, 0.95, tt)
        col = col * (1 - 0.5 * m[:, None]) + mark * 0.5 * m[:, None]
    # ---- the glow: lantern, freckles, the bleed
    glow = srgb_to_lin(pal["glow"])
    gl = float(g["glow"])
    fam = ctx.get("tip_family", "lantern")
    Lb = float(ctx["T"].bulb[0])
    if tip.any():
        sb = np.clip(attr[:, 1], 0, None)                              # arc length from the bulb's end (the bottom) up its neck
        ink = srgb_to_lin(pal["acc_eye"])
        if fam == "lantern":
            # a firefly's abdomen: it glows on its lower 60 % in the glow hue (70-90 degrees, every palette); the upper 40 % is the unlit neck in the body's dark mark colour, set off by two dark bands 0.02 H wide
            lit = (1 - sstep(0.60 * Lb - 0.012, 0.60 * Lb + 0.012, sb)) * tip
            glow_n = glow / max(float(glow.max()), 1e-6)
            core = glow * 0.35 + 0.60 * glow_n * 0.9 + 0.10
            col[tip] = mark[None] * 1.0
            col = col * (1 - lit[:, None]) + np.clip(core, 0, 1.2) * lit[:, None]
            bnd = np.zeros(len(V))
            for c_ in (0.64, 0.80):
                bnd = np.maximum(bnd, band_f(sb, c_ * Lb - 0.011, c_ * Lb + 0.011, 0.004) * tip)
            F["bands"] = bnd
            col = col * (1 - bnd[:, None]) + ink * bnd[:, None]
            emit = emit + glow_n * (lit * (0.9 + 0.7 * gl) * (1 - 0.3 * np.clip(sb / (0.6 * Lb), 0, 1)))[:, None]      # brightest at the bottom
            rough[tip] = 0.3
            F["lit"] = lit
        elif fam == "tuft":
            col[tip] = srgb_to_lin(pal["ear-inner"]) * 1.0           # unlit, in the contrasting pastel of the inner ear: a pompom that tells apart from the lit bulb at 96
        else:
            col[tip] = mark * 0.8 + srgb_to_lin(pal["pad"]) * 0.2        # a plain dome: a visible dark cap
    # keep the freckles and the glowing pattern 0.08 H clear of the eyes and the mouth (they read as crumbs beside the mouth)
    Re_ = spec["face"]["eyes"]["r"] * g["eye_size"]
    Pe_ = surface_frame(G, spec["face"]["eyes"]["station"] + g["eye_height"], spec["face"]["eyes"]["around"] + g["eye_spacing"])[0]
    Pm_ = surface_frame(G, spec["face"]["mouth"]["station"] + g["mouth_z"], 1.0)[0]
    clear = ((np.linalg.norm(Vm - Pe_, axis=1) > Re_ + 0.08) & (np.linalg.norm(Vm - Pm_, axis=1) > 0.5 * spec["face"]["mouth"]["width"] * g["mouth_width"] + 0.08)).astype(float)
    F["clear"] = clear
    # one glowing pattern gene (the night-light species): emissive belly bands, or constellation dots on the back and head
    gp = g.get("glow_pattern", "none")
    glow_n0 = glow / max(float(glow.max()), 1e-6)
    if gp == "belly-bands":
        ph_ = (zeff / 0.15) % 1.0
        bm = belly * band_f(ph_, 0.12, 0.52, 0.08) * clear
        F["glow_pattern"] = bm
        col = col * (1 - 0.7 * bm[:, None]) + (glow * 0.85 + 0.1) * 0.7 * bm[:, None]
        emit = emit + glow_n0 * (bm * (0.55 + 0.45 * gl))[:, None]
    elif gp == "constellation":
        dd, cc = voronoi(V * (1.0 / 0.17), seed + 31)
        host_ = (torso & ~tail) * (1 - belly) * band(zeff, 0.5, 2.05, 0.1) * clear
        dots = host_ * (cc < 0.5) * (1 - sstep(0.07, 0.13, dd))
        F["glow_pattern"] = dots
        col = col * (1 - 0.8 * dots[:, None]) + np.clip(glow * 0.5 + 0.5, 0, 1.2) * 0.8 * dots[:, None]
        emit = emit + glow_n0 * (dots * (0.6 + 0.4 * gl))[:, None]
    # freckles: tiny glowing dots that thicken and brighten toward the tail
    if g["freckle_density"] > 0:
        d, cell = voronoi(V * (1.0 / 0.075), seed + 11)
        dens = g["freckle_density"] * (0.12 + 0.88 * t ** 1.6)
        host = (torso | tail | leg | arm | ear) * (1 - belly * 0.7) * clear
        rad = 0.16 + 0.07 * cell
        m = host * (cell < dens) * (1 - sstep(rad - 0.07, rad + 0.05, d))
        F["freckles"] = m
        warm = 0.25 + 0.75 * t
        col = col * (1 - 0.65 * m[:, None]) + (glow * 0.8 + 0.1) * 0.65 * m[:, None]
        emit = emit + glow * (m * g["freckle_glow"] * gl * warm * 0.85)[:, None]
    # the lantern's warm bleed down the tail: the base warms and a little light spills on the skin
    if fam == "lantern":
        dist = np.where(tail, np.clip(attr[:, 1] - Lb, 0, None), 9.0)             # distance from the bulb's neck down the stalk: the light spills only a hand's breadth
        e = np.exp(-(dist / max(0.12 * g["bleed"], 1e-3)) ** 2) * (tail * 1.0) * (attr[:, 1] > Lb)
        F["bleed"] = e
        if not (pal.get("_hue") is not None and is_warm(pal["_hue"])):          # no colour bleed on the warm hues: the tail stays the body's colour down to the stalk
            col = col * (1 - 0.12 * e[:, None]) + glow * 0.12 * e[:, None]
        emit = emit + (glow / max(float(glow.max()), 1e-6)) * (0.25 * gl * e)[:, None]
    # ---- the face attachment families (appendages.py): colours by family, from the shell's arc fraction attr s
    pnames = {v: k for k, v in ctx["body_parts"].items()}
    for pid_, nm_ in pnames.items():
        fam_ = nm_.split(".")[0]
        if fam_ not in ("whisker", "fang", "horn", "tusk"):
            continue
        sel_ = part == pid_
        if not sel_.any():
            continue
        tt = np.clip(attr[:, 1], 0, 1)
        rec_ = ctx["info"].get("appendages", {}).get(nm_, {})
        if fam_ == "whisker":
            c0 = srgb_to_lin(pal["mark"]) * 0.8
            col[sel_] = c0
            if rec_.get("glow"):
                gm = sel_ * sstep(0.55, 0.9, tt)
                col = col * (1 - gm[:, None]) + (glow * 0.4 + 0.5) * gm[:, None]
                emit = emit + (glow / max(float(glow.max()), 1e-6)) * (gm * (0.7 + 0.3 * gl))[:, None]
        elif fam_ == "fang":
            col[sel_] = srgb_to_lin(np.array([248.0, 244.0, 232.0]))
        else:
            wear = float(rec_.get("wear", 0.0))
            base = srgb_to_lin(pal["mark"]) * (1.0 - 0.45 * wear)
            tipc = srgb_to_lin(np.array([240.0, 232.0, 214.0])) if fam_ == "horn" else srgb_to_lin(np.array([246.0, 240.0, 226.0]))
            mix_ = sstep(0.0, 0.7, tt) if fam_ == "horn" else sstep(0.0, 0.4, tt)
            col[sel_] = (base[None] * (1 - mix_[sel_, None]) + tipc[None] * mix_[sel_, None])
        rough[sel_] = 0.5
    # ---- the face (decals on the loft's own coordinates)
    f_eye = srgb_to_lin(pal["acc_eye"]); f_mouth = srgb_to_lin(pal["acc_mouth"]); f_blush = srgb_to_lin(pal["acc_blush"]); f_catch = srgb_to_lin(pal["acc_catch"])
    head = torso * (z > 1.2)
    ez = spec["face"]["eyes"]["station"] + g["eye_height"]; ea = spec["face"]["eyes"]["around"] + g["eye_spacing"]
    R = spec["face"]["eyes"]["r"] * g["eye_size"]
    P, nrm, up, rgt = surface_frame(G, ez, ea)
    d = Vm - P
    u = (d @ rgt) * side
    v = d @ up
    near = head * (d @ nrm > -0.12) * (np.linalg.norm(d, axis=1) < 3.0 * R)
    rr = np.hypot(u, v) / R
    disc_m = near * (1 - sstep(0.96, 1.04, rr))
    F["eye"] = disc_m
    eye_col = np.tile(f_eye, (n, 1))
    lowrim = sstep(-0.1, 0.85, -v / R) * (1 - sstep(0.55, 1.0, rr))
    eye_col = eye_col * (1 - 0.30 * lowrim[:, None]) + (glow * 0.35 + f_eye * 0.4) * 0.30 * lowrim[:, None]
    for (cu, cv, cr) in ((-0.35, 0.4, 0.3), (0.38, -0.36, 0.12)):
        cm = near * disc(u / R - cu, v / R - cv, cr, 0.05)
        eye_col = eye_col * (1 - cm[:, None]) + f_catch * cm[:, None]
        F["catch"] = F.get("catch", 0) + cm
    if frame == "open":
        m = disc_m
        col = col * (1 - m[:, None]) + eye_col * m[:, None]
        rough = np.where(m > 0.5, 0.18, rough)
    elif frame == "half":
        lid = near * (v / R > -0.08)
        m = disc_m * (1 - lid)
        col = col * (1 - m[:, None]) + eye_col * m[:, None]
        line = near * band(v / R, -0.14, -0.06, 0.03) * (1 - sstep(0.96, 1.04, rr))
        col = col * (1 - line[:, None]) + f_eye * line[:, None]
        rough = np.where(m > 0.5, 0.18, rough)
    else:
        arc = (v / R) - (-0.12 - 0.16 * (1 - np.clip(u / R, -1, 1) ** 2))
        m = near * (1 - sstep(0.04, 0.09, np.abs(arc))) * (np.abs(u / R) < 0.95)
        col = col * (1 - m[:, None]) + f_eye * m[:, None]
    # cheeks
    if g["blush"]:
        cz, ca_ = spec["face"]["cheeks"]["station"], spec["face"]["cheeks"]["around"]
        Pc, nc, upc, rgc = surface_frame(G, cz, ca_)
        dc = Vm - Pc
        rc = np.hypot(dc @ rgc / 1.3, dc @ upc) / spec["face"]["cheeks"]["r"]
        m = head * (dc @ nc > -0.15) * (1 - sstep(0.55, 1.1, rc)) * spec["face"]["cheeks"]["alpha"]
        F["blush"] = m
        col = col * (1 - m[:, None]) + f_blush * m[:, None]
    # mouth on the front line
    mz = spec["face"]["mouth"]["station"] + g["mouth_z"]
    Pm, nm_, upm, rgm = surface_frame(G, mz, 1.0)
    dm = V - Pm
    um, vm = dm @ rgm, dm @ upm
    W = spec["face"]["mouth"]["width"] * g["mouth_width"]
    expr = g["expression"]
    if expr == "content":
        k = (np.abs(um) - W / 4) / (W / 4)
        sdf = vm + 0.04 * (1 - np.clip(k, -1, 1) ** 2) * (np.abs(um) < W / 2)
        sdf = np.where(np.abs(um) < W / 2 + 0.01, sdf, 1.0)
    elif expr == "smile":
        sdf = vm + 0.045 * (1 - np.clip(um / (W * 0.6), -1, 1) ** 2)
        sdf = np.where(np.abs(um) < W * 0.62, sdf, 1.0)
    elif expr == "o":
        sdf = np.abs(np.hypot(um, vm + 0.03) - 0.035) - 0.0
    elif expr == "open":
        sdf = np.full(len(V), 1.0)
    else:
        sdf = np.where(np.abs(um) < W * 0.5, vm, 1.0)
    mm = head * (dm @ nm_ > -0.12) * (1 - sstep(0.02, 0.034, np.abs(sdf)))          # a stroke about 0.05 H wide: it survives at 96 px
    if expr == "open":
        # the open-mouth expression: a dark oval with a pink tongue in its lower half (the plush bunnies have one)
        e_ = np.hypot(um / (W * 0.30), (vm + 0.045) / 0.058)
        mm = head * (dm @ nm_ > -0.12) * (1 - sstep(0.92, 1.04, e_))
        F["mouth"] = mm
        col = col * (1 - mm[:, None]) + f_mouth * 0.6 * mm[:, None]
        tg = mm * (1 - sstep(-0.05, 0.0, (vm + 0.045) / 0.058 + 0.15)) * (1 - sstep(0.4, 0.8, e_))
        col = col * (1 - tg[:, None]) + srgb_to_lin(np.array([235.0, 105.0, 125.0])) * tg[:, None]
    else:
        F["mouth"] = mm
        col = col * (1 - mm[:, None]) + f_mouth * mm[:, None]
    # a small mark: a heart or a star
    if g["mark"] != "none":
        where = g["mark_where"]
        zc, ac = {"forehead": (1.94, 1.0), "cheek": (1.5, 0.64), "belly": (0.85, 1.0)}[where]
        Pk, nk, upk, rgk = surface_frame(G, zc, ac)
        dk = (V if where != "cheek" else np.stack([x, np.abs(y), z], 1)) - Pk
        uk, vk = dk @ rgk, dk @ upk
        S = g["mark_size"]
        if g["mark"] == "heart":
            f_ = sd_heart(uk / (S * 1.15), vk / (S * 1.15) + 0.1)
            inside = 1 - sstep(-0.02, 0.02, f_)
        else:
            f_ = sd_star(uk / S, vk / S)
            inside = 1 - sstep(-0.04, 0.04, f_)
        m = (torso | (arm & (where == "belly"))) * (dk @ nk > -0.1) * inside * (np.linalg.norm(dk, axis=1) < 2.2 * S)
        F["mark"] = m
        mc = f_blush if g["mark"] == "heart" else glow * 0.9 + 0.1
        col = col * (1 - m[:, None]) + mc * m[:, None]
        emit = emit + (glow * (0.35 * gl * m)[:, None] if g["mark"] == "star" else 0)
    return dict(col=np.clip(col, 0, 4), emit=np.clip(emit, 0, 4), rough=rough, fields=F)


def _rd(kind, seed, sc):
    nx = int(round(160 * sc)); ny = int(round(106 * sc))
    key = (kind, seed, nx)
    if key not in _RD_CACHE:
        _RD_CACHE[key] = gray_scott(kind, seed, nx=nx, ny=ny, steps=2400)
    return _RD_CACHE[key]
