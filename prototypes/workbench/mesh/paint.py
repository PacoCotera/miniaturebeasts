"""The painted layer on the mesh (design §8), ported from foundation/paint.mjs and head.mjs: the cream fields, the mouth ink, the nose, the eye texture, and
the leaves' cages. numpy only. Everything is evaluated on rest-pose positions and normals, so it rides the rig."""
import math
import numpy as np
from housefield import sstep, find_front
from cage import Cage, grid_faces

mix = lambda a, b, t: a + (b - a) * (np.asarray(t)[..., None] if np.ndim(t) else t)
srgb = lambda c: np.asarray(c, float) / 255.0


def face_cream(H, q, nl):
    """paint.mjs faceCreamAt, q = head-local rest position (N, 3), nl = head-local normal."""
    ch = H.look["creamHead"]
    hw = H.mouth["w"] / 2
    ay = np.abs(q[:, 1])
    zb = np.where(ay <= hw, H.mouth["zAt"](ay), H.mouth["zAt"](hw) - ch["fall"] * (ay - hw)) - ch["below"]
    front = np.maximum(sstep(-0.1, 0.3, q[:, 0] / H.K["a"]), sstep(0.1, 0.5, -nl[:, 2]))
    reach = sstep(ch["reach"][0], ch["reach"][1], H.d0(q))
    return sstep(zb + ch["soft"], zb - ch["soft"], q[:, 2]) * front * reach


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


def mouth_ink(H, q, px=1 / 30.35):
    """Distance to the mouth's axis -> ink amount: at least the house's mouth-min-px at 96 (px = one pixel at 96 in H)."""
    ax = mouth_axis(H)
    d = np.full(len(q), 1e9)
    for a, b in zip(ax[:-1], ax[1:]):
        ab = b - a
        h = np.clip(((q - a) @ ab) / (ab @ ab), 0, 1)
        d = np.minimum(d, np.linalg.norm(q - (a + h[:, None] * ab), axis=1))
    wdt = max(H.rf["mouth-tube"] * H.look["mouthInk"], H.rig and H.house["rig"]["ink"]["mouth-min-px"]["96"] / 2 * px + H.rf["mouth-tube"] * 0.3)
    near = np.hypot(q[:, 0] - ax[7, 0], np.hypot(q[:, 1], q[:, 2] - H.mouth["z"])) < H.mouth["w"] / 2 + 0.2
    return sstep(wdt + px * 0.6, wdt - px * 0.6, d) * near


def nose_weight(H, q):
    nf, nc, nr = H.nose["frame"], H.nose["c"], H.nose["r"]
    from housefield import sd_ellipsoid
    X = q - nc
    loc = np.stack([X @ nf["n"], X @ nf["lat"], X @ nf["up"]], -1)
    dn = sd_ellipsoid(loc, nr)
    return sstep(0.012 + 0.0, -0.004, dn)


def vertex_colours(H, P, N, head_w, toe, nose_attr=None, mouth=True):
    """The albedo of every vertex of a rest-pose mesh (linear RGB): body, cream (face + chest-and-belly fields, x (1 - legWeight) off the head), the mouth's ink,
    the toe beans. P: (n,3) world rest positions; N: normals; head_w: head weight (0..1); toe: the `toe` attribute (0, 0.75, 1)."""
    look = H.look
    body, cream = srgb(look["body"]), srgb(look["cream"])
    q = P - H.kc
    fc = face_cream(H, q, N)
    bc = body_cream(H, P, N)
    c = np.maximum(fc, bc)
    c = np.where(head_w > 0.5, c, c * (1 - H.leg_weight(P)))
    col = mix(body[None], cream[None], c)
    if mouth:
        ink = mouth_ink(H, q) * (head_w > 0.5)
        col = mix(col, srgb(look["mouth"])[None], ink)
    toec = srgb(look["toe"])
    col = np.where((toe >= 0.99)[:, None], toec, col)
    col = np.where(((toe > 0.5) & (toe < 0.99))[:, None], mix(toec[None], body[None], 0.75), col)
    return col, c


def lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# ---------------------------------------------------------------- the eye, in disc space (paint.mjs eyePaint)
RING_SCALE = 0.88      # the ring's painted brightness: the lit disc plus its emission would clip the house's ivory to white; the RENDERED ring then reads about the cream's L*


def eye_texture(H, eye, toward_local, n=256, span=1.0, crescent_gain=1.0, crescent_rho=(0.3, 0.95)):
    """RGBA float image (n, n, 4), sRGB, u along the eye's `lat`, v along its `up`, spanning +-R_eye. Gaze toward the camera as the SDF does."""
    look, rf = H.look, H.rf
    R, Reye = eye["Riris"], eye["Reye"]
    ys, xs = (np.mgrid[0:n, 0:n] + 0.5) / n * 2 - 1
    u, v = xs * Reye * span, -ys * Reye * span
    fw = Reye * span / n * 1.2
    tl, tu = float(toward_local @ eye["lat"]), float(toward_local @ eye["up"])
    m = math.hypot(tl, tu)
    k = min(1.0, m / math.sin(math.radians(rf["gaze-full-at-deg"]))) * rf["gaze-offset-max"] * eye["E"]
    g = (0.0, 0.0) if m < 1e-9 else (tl / m * k, tu / m * k)
    pu, pv = u - g[0], v - g[1]
    rho = np.hypot(u, v) / R
    outer = Reye / R
    cover = sstep(outer + fw / R, outer - fw / R, rho)
    vn = v / R
    col = np.broadcast_to(srgb(look["iris"]), (n, n, 3)).copy()
    col = mix(col, srgb(look["irisTop"]), rf["iris-top-dark"] * sstep(-0.2, 0.9, vn))
    col = mix(col, srgb(look["irisLow"]), 0.35 * sstep(0.9, 0.0, np.hypot(pu, pv) / R * 1.6))
    col = mix(col, srgb(look["irisLow"]), min(1.0, rf["crescent"] * crescent_gain) * sstep(crescent_rho[0], crescent_rho[1], rho) * sstep(-0.1, 0.75, (u * 0.5 - v * 0.85) / R))
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
def leaf_cages(H, stations=7, around=6):
    """Three separate closed lenses from the crown socket, in head-local coordinates + kc (rest), width by the house's leaf formula."""
    cr = H.rig["crest"]
    cp, tn, bm = cr["tip-power"], cr["tip-narrow"], cr["base-min"]
    out = []
    for li, l in enumerate(H.leaves):
        C = Cage(f"leaf.{li}", mirrored=False)
        ss = -np.cos(np.pi * (np.arange(stations) + 0.5) / stations)        # -1..1, cosine-spaced, no station on a tip
        rings = []
        for s in ss:
            taper = max((max(0.0, 1 - abs(s) ** cp)) ** (1 / cp) * (1 - tn * s), bm)
            hw = l["wid"] / 2 * taper * 1.04
            ht = l["thick"] / 2 * math.sqrt(max(1 - s * s, 0.04)) * 1.5
            c = H.kc + l["base"] + l["ax"] * l["len"] * (s + 1) / 2
            ring = []
            for k in range(around):
                a = 2 * math.pi * k / around
                ring.append(C.add(c + l["aw"] * hw * math.cos(a) + l["an"] * ht * math.sin(a)))
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
