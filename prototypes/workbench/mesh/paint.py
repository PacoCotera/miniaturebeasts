"""The painted layer on the mesh (design §8), ported from foundation/paint.mjs and head.mjs: the cream fields, the mouth ink, the nose, the eye texture, and
the leaves' cages. numpy only. Everything is evaluated on rest-pose positions and normals, so it rides the rig."""
import math
import numpy as np
from housefield import sstep, find_front
from cage import Cage, grid_faces

mix = lambda a, b, t: a + (b - a) * (np.asarray(t)[..., None] if np.ndim(t) else t)
srgb = lambda c: np.asarray(c, float) / 255.0


CREAM_TUNE = np.array([1.12, 1.12, 1.0])      # round 4: the mesh's cream renders cool (b* 16 against the master's 21.5 under the same albedo and light): its albedo is lifted 12 % in red and green, in the sprites and the glb alike


def cream_edge_raw(H, q):
    """paint.mjs faceCreamAt's edge height zb at each head-local rest position q (N, 3), as fix round 7 has it: the edge is the smile's own curve out to the mouth corner, then carries on the
    smile's slope and eases off it on a parabola down to the side's fall (the near side `fall`, the far side `fall-far`), one curve with no kink and so no dark wedge into the cream."""
    ch = H.cream_head
    hw = H.mouth["w"] / 2
    ay = np.abs(q[:, 1])
    fall = np.where(q[:, 1] * H.near_sign > 0, ch["fall"], ch.get("fall-far", ch["fall"]))
    ze = H.mouth["zAt"](np.minimum(ay, hw))
    d = np.maximum(0.0, ay - hw)
    s0 = float((H.mouth["zAt"](np.array(hw)) - H.mouth["zAt"](np.array(hw - 0.01))) / 0.01)
    Lm = H.rf.get("cream-reach-E", 0) * H.g["E"]
    if Lm > 1e-6 and s0 > 1e-6:
        dS = Lm * (1 + fall / s0)
        ze = ze + np.where(d <= dS, s0 * (d - d * d / (2 * Lm)), s0 * (dS - dS * dS / (2 * Lm)) - fall * (d - dS)) * (d > 0)
    else:
        ze = ze - fall * d
    return ze - ch["below"]


CREAM_EDGE_SMOOTH = 0.07     # [mesh] H: round 4 (the AD: one smooth curve, no scallops). The edge's height over the face's width is the house's (cream_edge_raw), rounded by this Gaussian along y,
                             # so the smile's curl at the mouth corner and the fall's start do not stand as steps on the lobe's curved face. Fix round 9 re-sets the field; this stays the mesh's own


def cream_edge_z(H, q):
    """cream_edge_raw, smoothed along y (see CREAM_EDGE_SMOOTH): the edge height at each head-local rest position."""
    if not CREAM_EDGE_SMOOTH:
        return cream_edge_raw(H, q)
    key = ("edge", id(H))
    if key not in _EDGE_CACHE:
        ys = np.linspace(-1.2, 1.2, 481)
        z = cream_edge_raw(H, np.stack([np.zeros_like(ys), ys, np.zeros_like(ys)], -1))
        k = np.exp(-0.5 * (np.arange(-40, 41) * 0.005 / CREAM_EDGE_SMOOTH) ** 2)
        k /= k.sum()
        zp = np.concatenate([np.full(40, z[0] + (z[0] - z[1]) * np.arange(40, 0, -1)), z, z[-1] + (z[-1] - z[-2]) * np.arange(1, 41)])
        _EDGE_CACHE[key] = (ys, np.convolve(zp, k, mode="valid"))
    ys, zs = _EDGE_CACHE[key]
    return np.interp(q[:, 1], ys, zs)


_EDGE_CACHE = {}


def face_cream(H, q, nl, flank=None):
    """paint.mjs faceCreamAt, q = head-local rest position (N, 3), nl = head-local normal. Gated by the mouth line and the fall only: head and neck are one surface to it."""
    ch = H.cream_head
    zb = cream_edge_z(H, q)
    front = np.maximum(sstep(-0.1, 0.3, q[:, 0] / H.K["a"]), sstep(0.1, 0.5, -nl[:, 2]))
    out = sstep(zb + ch["soft"], zb - ch["soft"], q[:, 2]) * front
    return out if flank is None else out * flank


def underside_cream(H, P, N):
    """The head's under-cheek where it meets the chest. In the SDF the head and the chest are one surface joined by a round union (rig union-neck-low), so the cream's falling near edge only ever
    meets the fillet, never the bare underside of the cheek. The mesh's head is its own shell and its lower cheek stands clear of the chest for a hand's breadth: that underside, inside the
    union's reach of the torso, facing down and under the smile, takes the cream, so no dark sliver of the cheek hangs below the edge."""
    u = H.rig["union-neck-low"]
    q = P - H.kc
    return sstep(u, 0.5 * u, H.dTorso(P)) * sstep(0.15, 0.5, -N[:, 2]) * sstep(H.mouth["z"] + 0.12, H.mouth["z"] + 0.02, q[:, 2])


def body_cream(H, wp, n):
    """paint.mjs creamBodyAt on world rest positions and normals."""
    cb = H.look["creamBody"]
    S = H.S
    X, Y, Z = wp[:, 0] / S, wp[:, 1] / S, wp[:, 2] / S
    s = -n[:, 2] * cb["down"] + n[:, 0] * cb["front"]
    xf = sstep(cb["x0"], cb["x1"], X) * (1 - sstep(cb["x2"], cb["x3"], X))
    side = (1 - sstep(cb["n0"], cb["n1"], np.abs(n[:, 1]))) if cb.get("n1") else 1.0
    return sstep(cb["t0"], cb["t1"], s) * xf * sstep(cb["z1"], cb["z0"], Z) * (1 - sstep(cb["y0"], cb["y1"], np.abs(Y))) * side


def mouth_axis(H, ns=14):
    rf = H.rf
    mw, rt, mo = H.mouth["w"], rf["mouth-tube"], rf["mouth-offset"]
    ys = (np.arange(ns + 1) / ns * 2 - 1) * mw / 2
    zs = H.mouth["zAt"](ys)
    xs = find_front(H.d0, ys, zs)
    return np.stack([xs - mo * rt, ys, zs], -1)


def mouth_ink(H, q, px=1 / 30.35, half=None):
    """Distance to the mouth's axis -> ink amount: at least the house's mouth-min-px at 96 (px = one pixel at 96 in H)."""
    ax = mouth_axis(H)
    d = np.full(len(q), 1e9)
    for a, b in zip(ax[:-1], ax[1:]):
        ab = b - a
        h = np.clip(((q - a) @ ab) / (ab @ ab), 0, 1)
        d = np.minimum(d, np.linalg.norm(q - (a + h[:, None] * ab), axis=1))
    wdt = half if half is not None else max(H.rf["mouth-tube"] * H.look["mouthInk"], H.rig and H.house["rig"]["ink"]["mouth-min-px"]["96"] / 2 * px + H.rf["mouth-tube"] * 0.3)
    near = np.hypot(q[:, 0] - ax[7, 0], np.hypot(q[:, 1], q[:, 2] - H.mouth["z"])) < H.mouth["w"] / 2 + 0.2
    return sstep(wdt + px * 0.6, wdt - px * 0.6, d) * near


def nose_weight(H, q):
    nf, nc, nr = H.nose["frame"], H.nose["c"], H.nose["r"]
    from housefield import sd_ellipsoid
    X = q - nc
    loc = np.stack([X @ nf["n"], X @ nf["lat"], X @ nf["up"]], -1)
    dn = sd_ellipsoid(loc, nr)
    return sstep(0.012 + 0.0, -0.004, dn)


def vertex_colours(H, P, N, head_w, toe, nose_attr=None, mouth=True, ink_half=None):
    """The albedo of every vertex of a rest-pose mesh (linear RGB): body, cream (face + chest-and-belly fields, x (1 - legWeight) off the head), the mouth's ink,
    the toe beans. P: (n,3) world rest positions; N: normals; head_w: head weight (0..1); toe: the `toe` attribute (0, 0.75, 1)."""
    look = H.look
    body, cream = srgb(look["body"]), srgb(look["cream"]) * CREAM_TUNE
    q = P - H.kc
    nt = H.chest_normal(P)          # fix round 8: the bib and the head's cream end on the chest's own normal
    flank = np.where(head_w > 0.5, 1.0, H.near_flank(nt))      # round 4: only on the body. On the mesh's head shell the chest's normal is not a flank (it cut the cheek's cream in steps)
    fc = face_cream(H, q, N, flank)
    bc = body_cream(H, P, nt)
    c = np.maximum(np.maximum(fc, bc), underside_cream(H, P, N)) * (1 - H.leg_weight(P))       # fix round 7: the head takes the same leg weight as the body, so no line is left where the head ends and the body begins
    col = mix(body[None], cream[None], c)
    if mouth:
        px = 1 / 30.35 if ink_half is None else ink_half[1]
        ink = mouth_ink(H, q, px=px, half=None if ink_half is None else ink_half[0]) * (head_w > 0.5)
        col = mix(col, srgb(look["mouth"])[None], ink)
    toec = srgb(look["toe"])
    col = np.where((toe >= 0.99)[:, None], toec, col)
    col = np.where(((toe > 0.5) & (toe < 0.99))[:, None], mix(toec[None], body[None], 0.75), col)
    return col, c


def margin(a, b, x):
    """The linear margin m of x across a smoothstep's edges: sstep(a, b, x) = smoothstep(-1, 1, m) with m = 2 (x - a) / (b - a) - 1, for either order of a and b. Margins of factors combine by min (and) and
    max (or), stay linear in the quantity they come from, and so interpolate across a triangle without the narrow smoothsteps' stairs."""
    return 2 * (np.asarray(x, float) - a) / (b - a) - 1


def body_cream_margin(H, wp, n):
    """creamBodyAt as one margin: the min of its factors' margins (a product of smoothsteps, to within where two edges meet)."""
    cb = H.look["creamBody"]
    S = H.S
    X, Y, Z = wp[:, 0] / S, wp[:, 1] / S, wp[:, 2] / S
    s = -n[:, 2] * cb["down"] + n[:, 0] * cb["front"]
    ms = [margin(cb["t0"], cb["t1"], s), margin(cb["x0"], cb["x1"], X), margin(cb["x3"], cb["x2"], X), margin(cb["z1"], cb["z0"], Z), margin(cb["y1"], cb["y0"], np.abs(Y))]
    if cb.get("n1"):
        ms.append(margin(cb["n1"], cb["n0"], np.abs(n[:, 1])))
    return np.minimum.reduce(ms)


def underside_margin(H, P, N):
    u = H.rig["union-neck-low"]
    q = P - H.kc
    return np.minimum.reduce([margin(u, 0.5 * u, H.dTorso(P)), margin(0.15, 0.5, -N[:, 2]), margin(H.mouth["z"] + 0.12, H.mouth["z"] + 0.02, q[:, 2])])


def leg_margin(H, P):
    """1 - legWeight as a margin."""
    x, a, b = H.leg_x(P)
    return np.where(P[:, 2] > 0.75 * H.S, 1.0, margin(b, a, x))


def paint_fields(H, P, N, head_w, half, px):
    """The glb's paint as smooth per-vertex fields, thresholded in the shader (AD item 5, design 8.3's fallback): the vertices carry values that interpolate linearly across a triangle, and the
    viewer applies a smoothstep to them, so the cream's edge and the ink are not stepped at the mesh's resolution. Round 3: the gates are carried as linear margins (see `margin`), not as already
    thresholded values: round 2's body cream was a product of narrow smoothsteps taken at the vertices, which left streaks and a stair on the glb's belly edge.
    Returns (n, 4): A = face cream's gate (front x leg factor) as a margin, B = body and under-cheek cream x leg factor as a margin, F = zb - z (the face cream's edge, signed), D = ink half-width
    minus the distance to the smile's axis (-1 outside the ink's reach). The exporter clamps colour attributes to 0..1, so A and B are carried as (m + 1) / 2, F as (F + 0.1) / 0.2 and D as
    (D + 0.05) / 0.1.  Shader: cream = max(smoothstep(-soft, soft, F) * smoothstep(0, 1, A), smoothstep(0, 1, B)); ink = smoothstep(-0.6 px, 0.6 px, D)."""
    q = P - H.kc
    zb = cream_edge_z(H, q)
    lm = leg_margin(H, P)
    nt = H.chest_normal(P)
    cb = H.look["creamBody"]
    mA = np.minimum(np.maximum(margin(-0.1, 0.3, q[:, 0] / H.K["a"]), margin(0.1, 0.5, -N[:, 2])), lm)
    if cb.get("n1"):
        mA = np.where(head_w > 0.5, mA, np.minimum(mA, margin(cb["n1"], cb["n0"], nt[:, 1] * H.near_sign)))
    mB = np.minimum(np.maximum(body_cream_margin(H, P, nt), underside_margin(H, P, N)), lm)
    ax = mouth_axis(H)
    d = np.full(len(q), 1e9)
    for a, b in zip(ax[:-1], ax[1:]):
        ab = b - a
        h = np.clip(((q - a) @ ab) / (ab @ ab), 0, 1)
        d = np.minimum(d, np.linalg.norm(q - (a + h[:, None] * ab), axis=1))
    near = np.hypot(q[:, 0] - ax[7, 0], np.hypot(q[:, 1], q[:, 2] - H.mouth["z"])) < H.mouth["w"] / 2 + 0.2
    D = np.where(near & (head_w > 0.5), half - d, -1.0)
    enc = lambda m: (np.clip(m, -1, 1) + 1) / 2
    return np.column_stack([enc(mA), enc(mB), np.clip((zb - q[:, 2] + 0.1) / 0.2, 0, 1), np.clip((D + 0.05) / 0.1, 0, 1)])


def lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# ---------------------------------------------------------------- the eye, in disc space (paint.mjs eyePaint)
RING_SCALE = np.array([0.98, 0.95, 0.86])      # the ring's painted brightness and warmth: the disc is unlit, so the house's ivory (240, 228, 214) would render as L* 78, b* 8 against the master's 86, b* 19 (the SDF's lit ring: 88, b* 16); round 2 had 0.88 flat


def eye_texture(H, eye, toward_local, n=256, span=1.0, crescent_gain=1.0, crescent_rho=None):
    """RGBA float image (n, n, 4), sRGB, u along the eye's `lat`, v along its `up`, spanning +-R_eye. Gaze toward the camera as the SDF does."""
    look, rf = H.look, H.rf
    crescent_rho = crescent_rho or (rf["crescent-from"], 0.95)        # the house's own window (fix round 7)
    R, Reye = eye["Riris"], eye["Reye"]
    ys, xs = (np.mgrid[0:n, 0:n] + 0.5) / n * 2 - 1
    u, v = xs * Reye * span, -ys * Reye * span
    fw = Reye * span / n * 1.2
    tl, tu = float(toward_local @ eye["lat"]), float(toward_local @ eye["up"])
    m = math.hypot(tl, tu)
    k = min(1.0, m / math.sin(math.radians(rf["gaze-full-at-deg"]))) * rf["gaze-offset-max"] * eye["E"]
    # fix round 7 (content, not startled): the pupil also sits `gaze-bias` forward and up in the eye (E units), the head's x and z axes taken in the eye's plane
    def dir_in(a):
        l_, u_ = float(np.asarray(a) @ eye["lat"]), float(np.asarray(a) @ eye["up"])
        nn = math.hypot(l_, u_) or 1.0
        return l_ / nn, u_ / nn
    bf = rf.get("gaze-bias", [0, 0])
    fw_, up_ = dir_in([1, 0, 0]), dir_in([0, 0, 1])
    ox = (fw_[0] * bf[0] + up_[0] * bf[1]) * eye["E"]
    oy = (fw_[1] * bf[0] + up_[1] * bf[1]) * eye["E"]
    g = (ox, oy) if m < 1e-9 else (tl / m * k + ox, tu / m * k + oy)
    pu, pv = u - g[0], v - g[1]
    rho = np.hypot(u, v) / R
    outer = Reye / R
    cover = sstep(outer + fw / R, outer - fw / R, rho)
    vn = v / R
    col = np.broadcast_to(srgb(look["iris"]), (n, n, 3)).copy()
    col = mix(col, srgb(look["irisTop"]), rf["iris-top-dark"] * sstep(-0.2, 0.9, vn))
    col = mix(col, srgb(look["irisLow"]), rf["iris-glow"] * sstep(0.9, 0.0, np.hypot(pu, pv) / R * 1.6))
    col = mix(col, srgb(look["irisLow"]), rf.get("iris-lower-glow", 0) * sstep(0.05, -0.65, vn) * sstep(1.0, 0.25, rho))     # fix round 7: a warm glow in the iris's lower half
    col = mix(col, srgb(look["irisLow"]), min(1.0, rf["crescent"] * crescent_gain) * sstep(crescent_rho[0], crescent_rho[1], rho) * sstep(rf["crescent-dir"][0], rf["crescent-dir"][1], (u * 0.5 - v * 0.85) / R))
    col = mix(col, srgb(look["iris"]) * 0.7, 0.8 * sstep(0.84, 0.99, rho))
    pr = np.hypot(pu, pv)
    pa = sstep(eye["pupilR"] + fw * 0.7, eye["pupilR"] - fw * 0.7, pr)
    col = mix(col, srgb(look["pupil"]), pa)
    ia = sstep(1 + fw / R * 0.7, 1 - fw / R * 0.7, rho)
    col = mix(np.broadcast_to(srgb(look["ring"]) * RING_SCALE, col.shape), col, ia)
    co = rf["catch-offset"]
    cr = rf["catch-radius"] * R
    cy = min(-co[1] * R, 0.98 * R - cr - 0.04 * R)
    ca = np.hypot(u - co[0] * R, v - cy)
    col = mix(col, srgb(look["catchLight"]), sstep(cr + fw * 0.6, cr - fw * 0.6, ca) * ia)
    col = col * (1 - rf["brow-shadow"] * sstep(0.35, 1.0, v / Reye))[..., None]
    # the disc sits sunk in the socket, wider than the eye: beyond the eye's edge it is the socket's own dark (the body's albedo), opaque
    col = mix(np.broadcast_to(srgb(look["body"]) * 0.85, col.shape), col, cover)
    return np.dstack([np.clip(col, 0, 1), np.ones_like(cover)]).astype(np.float32)


def disc_cage(H, eye, grid=12, span=1.0):
    """A flat disc (the eye's inset lens) as a quad cage: a subdivided square pushed to a circle of radius R_eye, in the eye frame (deterministic: no UV sphere).
    Returns (cage, uv) with u, v in 0..1 per vertex."""
    C = Cage("eye" + ("L" if eye["side"] > 0 else "R"), mirrored=False)
    ids = {}
    uv = []
    for j in range(grid + 1):
        for i in range(grid + 1):
            a, b = i / grid * 2 - 1, j / grid * 2 - 1
            # square to disc (the elliptical grid mapping keeps the quads even)
            x, y = a * math.sqrt(1 - b * b / 2), b * math.sqrt(1 - a * a / 2)
            p = eye["c"] + eye["Reye"] * span * (x * eye["lat"] + y * eye["up"])
            ids[(i, j)] = C.add(p)
            uv.append(((x + 1) / 2, (y + 1) / 2))
    for j in range(grid):
        for i in range(grid):
            C.face(ids[(i, j)], ids[(i + 1, j)], ids[(i + 1, j + 1)], ids[(i, j + 1)])
    C.uv = np.array(uv)
    C.grid = grid
    return C


# ---------------------------------------------------------------- leaves (design §6)
def leaf_cages(H, stations=9, around=6):
    """Three separate closed lenses from the crown socket, in head-local coordinates + kc (rest), width by the house's leaf formula."""
    cr = H.rig["crest"]
    cp, tn, bm = cr["tip-power"], cr["tip-narrow"], cr["base-min"]
    cam = cr.get("camber", 0)
    out = []
    for li, l in enumerate(H.leaves):
        C = Cage(f"leaf.{li}", mirrored=False)
        ss = -np.cos(np.pi * (np.arange(stations) + 0.5) / stations)        # -1..1, cosine-spaced, no station on a tip
        rings = []
        for s in ss:
            taper = max((max(0.0, 1 - abs(s) ** cp)) ** (1 / cp) * (1 - tn * s), bm)
            hw = l["wid"] / 2 * taper * math.sqrt(max(1 - s * s, 0.0)) * 1.04      # round 3: the SDF's leaf is a thin ellipsoid (the sqrt) whose width is further tapered by the house's formula; round 2 drew the taper alone, a blunt sausage
            ht = l["thick"] / 2 * math.sqrt(max(1 - s * s, 0.04)) * 1.5
            c = H.kc + l["base"] + l["ax"] * l["len"] * (s + 1) / 2
            ring = []
            for k in range(around):
                a = 2 * math.pi * k / around
                cup = cam * l["thick"] * (hw * math.cos(a) / (l["wid"] / 2)) ** 2      # fix round 8: the leaf is cupped across (camber, in leaf thicknesses)
                ring.append(C.add(c + l["aw"] * hw * math.cos(a) + l["an"] * (ht * math.sin(a) + cup)))
            rings.append(ring)
        grid_faces(C, rings, closed=True)
        for ring, sgn in ((rings[0], -1), (rings[-1], 1)):
            c = np.mean([C.V[i] for i in ring], axis=0)
            tip = c + l["ax"] * (sgn * 0.02)
            cen = C.add(tip)
            for k in range(0, around, 2):
                C.face(ring[k], ring[(k + 1) % around], ring[(k + 2) % around], cen)
        C.fix_winding()
        # a midrib: the centre column on the face side, raised and creased
        C.rings = {"rings": rings}
        for r in rings[1:-1]:
            C.set_crease(r[1], r[2], 0.0)
        out.append(C)
    return out
