"""Neck, head, face (body-spec s2.4, adapted; the deviations are listed in 3-base-notes.md).
- the neck socket: 3 columns x 2 station spans on the torso's top (a 16-loop with its mirror); the torso's top under the head is LOW (the head's bottom is at z 1.14, the spec's shoulder top at 1.53 would be inside the head),
- the head: rings of 9 half vertices (a = k/8 from the nape, over the left side, to the face) cast on the house's own head field d0 (skull + muzzle lobe + jaw, smooth union) along rays in the ring plane,
- the crease: the socket loop pulled 0.06 up and scaled 0.95 (the waist ring), then the first head ring, vertex i <-> i; the crown: a grid cap,
- the nose bulb: a closed dome sitting on the lobe; the eyes: 2 x 2 insets (after the fit, eyes.py)."""
import math
import numpy as np
from housefield import sd_ellipsoid, smin, uround, Ry, from_local
from cage import bisect_ray
from caps import HalfCap

LEVELS = [-0.47, -0.33, -0.18, -0.03, 0.12, 0.26, 0.39]       # head-local z of the rings (mouth, nose, eye rows on them)
WAIST_UP, WAIST_SCALE = 0.06, 0.95
JAW = False
MUZZLE_PULL = 0.12
NOSE_STAND = 0.12
HEAD_START_UP = 0.0
PATH_LEAD = 0.3
BEND_R = 1.0
HEAD_TOP_GAP = 0.40       # the last ring this far (arc) below the path's end
NA = 9


def build_head(body, ctx):
    spec, H, T = ctx["spec"], ctx["H"], ctx["T"]
    import paths as PA
    from housefield import to_local
    cage = body.cage
    tf, tr = ctx["info"]["torso"]["faces"], ctx["info"]["torso"]["rings"]
    for i in (5, 6):
        for c in (0, 1, 2):
            body.kill(tf[(i, c)])
    loop = [tr[5][0], tr[5][1], tr[5][2], tr[5][3], tr[6][3], tr[7][3], tr[7][2], tr[7][1], tr[7][0]]
    V0 = cage.arr()
    pitch = H.pose["pitch"]
    Rfa = Ry(-math.radians(pitch))
    kc = H.kc
    loc = lambda p: to_local(kc, Rfa, p)
    def fld(p):
        q = loc(p)
        d = H.dK(q)
        if getattr(H, "rise", None) is not None:        # the crown's swell (house dRise) rounds the dome
            d = np.where(d > 0.4, d, smin(d, sd_ellipsoid(q - H.rise["c"], H.rise["r"]), H.rise["k"]))
        return uround(d, H.dJ(q), H.rM) if JAW else d            # the skull and the chin; the muzzle lobe and the nose are sitting domes (below)
    full = np.concatenate([V0[loop], V0[loop] * np.array([1, -1, 1])])
    cen = full.mean(0)
    # the neck path: from the socket's centre up through K to the crown root, bent (the loop slopes: high at the nape, low under the chin), filleted at 1.25 x the head radius
    names = spec["parts"]["head"]["path"]["joints"]
    K = np.array([names[1]["at"][0], 0.0, names[1]["at"][1]])
    Cr = np.array([names[2]["at"][0], 0.0, names[2]["at"][1]])
    P1 = np.array([K[0] + 0.0, 0.0, K[2] - 0.04])     # the bend sits at the head centre (house K): the first segment is the sloping neck, the rest rises to the crown
    cen_xz = np.array([cen[0], 0.0, cen[2] + HEAD_START_UP])
    d1 = (P1 - cen_xz) / np.linalg.norm(P1 - cen_xz)
    P0 = cen_xz - PATH_LEAD * d1                      # the path starts inside the torso and the rings begin at the socket: a long straight root, so the bend's radius is wide (the nape's rings must not crowd)
    d2 = (Cr - P1) / np.linalg.norm(Cr - P1)
    P2 = Cr + 0.4 * d2
    pa = PA.Path(["waist", "K", "crown"], [P0, P1, P2], [[BEND_R, BEND_R]] * 3, spec["parts"]["head"]["path"].get("fillet", 1.25), up=[0, 0, 1])
    # N is the direction to the nape: back and up at the bottom; rings are planes normal to the path
    def frame(s):
        pt, Tg, Nn, _ = pa.at([s])
        Tg = Tg[0]
        nape = -np.array([1.0, 0, 0])
        Nn = nape - (nape @ Tg) * Tg
        Nn /= np.linalg.norm(Nn)
        return pt[0], Tg, Nn, np.cross(Nn, Tg)
    # rows that carry the face: the eye, the nose, the mouth (their planes through the house points)
    def s_through(X):
        lo, hi = 0.0, pa.length
        for _ in range(50):
            m = 0.5 * (lo + hi)
            pt, Tg, _, _ = frame(m)
            if (X - pt) @ Tg > 0:
                lo = m
            else:
                hi = m
        return 0.5 * (lo + hi)
    e = H.eyes[0]
    X_eye = from_local(kc, Rfa, np.array([e["c"][0], 0.0, e["c"][2]]))
    X_nose = from_local(kc, Rfa, np.array([H.nose["c"][0], 0.0, H.nose["c"][2]]))
    X_mouth = from_local(kc, Rfa, np.array([H.nose["c"][0] - 0.05, 0.0, H.g["mouthZ"]]))
    s_e, s_n, s_m = s_through(X_eye), s_through(X_nose), s_through(X_mouth)
    forced = [s_e]
    stl = [s_e]
    k = 1
    while s_e - 0.13 * k >= PATH_LEAD + 0.03:
        stl.append(s_e - 0.13 * k); k += 1
    k = 1
    while True:
        s = s_e + 0.12 * k
        if s > pa.length - 0.03 or frame(s)[0][2] > 2.05:
            break
        stl.append(s); k += 1
    stl = sorted(stl)
    NA_ = NA
    a = np.arange(NA_) / (NA_ - 1)
    rings, info = [], []
    for s in stl:
        pt, Tg, Nn, Bb = frame(s)
        dirs = np.cos(np.pi * a)[:, None] * Nn + np.sin(np.pi * a)[:, None] * Bb
        o = np.tile(pt, (NA_, 1))
        if fld(pt[None])[0] > 0:
            raise RuntimeError("ring centre outside the head field at s=%.3f" % s)
        P = bisect_ray(fld, o, dirs, 0.0, 1.8)
        ids = [body.add(P[k], "head", s, a[k], target=P[k], centre=(k in (0, NA_ - 1))) for k in range(NA_)]
        rings.append(ids)
        info.append(dict(s=s, centre=pt, T=Tg, N=Nn))
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(NA_ - 1):
            body.face(r0[k], r0[k + 1], r1[k + 1], r1[k], "head")
    # the crown: a grid cap over the last ring, to the skull's top along the path
    last = info[-1]
    top_pt = bisect_ray(fld, last["centre"][None], last["T"][None], 0.0, 1.0)[0]
    depth = max(float((top_pt - last["centre"]) @ last["T"]), 0.05)
    cap = HalfCap(body, rings[-1], "head", last["centre"], last["T"], last["N"], +1, depth)
    # the crease: loop -> waist -> first head ring
    T0 = info[0]["T"]
    waist = []
    for k, v in enumerate(loop):
        p = 0.5 * (V0[v] + np.array(cage.V[rings[0][k]]))          # the crease ring: halfway between the socket loop and the first head ring (the spec's lifted and shrunk loop zigzags where the head's front is lower than the loop)
        waist.append(body.add(p, "head", -0.1, a[k], target=p, centre=(k in (0, NA_ - 1))))
    for k in range(NA_ - 1):
        body.face(loop[k], loop[k + 1], waist[k + 1], waist[k], "head")
        body.face(waist[k], waist[k + 1], rings[0][k + 1], rings[0][k], "head")
    ctx["info"]["head"] = dict(loop=loop, waist=waist, rings=rings, ringinfo=info, cap=cap, Rfa=Rfa, path=pa, rows=dict(eye=s_e, nose=s_n, mouth=s_m))
    build_nose(body, ctx)


def sitting_dome(body, part, c, axis, up, lat, rx, ry, rz, us=(-0.8, -0.27, 0.27, 0.8), kx=2.0):
    """A closed half shape (y >= 0, mirrored later): an ellipsoid-like dome along `axis`, an 8-ring (5 half vertices) at each u in us, caps with one centre vertex each. kx > 2 squares the plan."""
    from_l = body._from_local
    rings = []
    for u in us:
        k = math.sqrt(1 - u * u)
        ids = []
        for m in range(5):
            ph = 2 * math.pi * m / 8
            sn, cs = math.sin(ph), math.cos(ph)
            y = np.sign(sn) * abs(sn) ** (2 / kx) if abs(sn) > 1e-12 else 0.0
            p = c + axis * rx * u + lat * ry * k * y + up * rz * k * cs
            w = from_l(p)
            ids.append(body.add(w, part, u, m / 8, target=w, centre=(m in (0, 4))))
        rings.append(ids)
    for a_, b_ in zip(rings, rings[1:]):
        for m in range(4):
            body.face(a_[m], a_[m + 1], b_[m + 1], b_[m], part)
    for ring, sgn in ((rings[0], -1), (rings[-1], 1)):
        p = from_l(c + axis * rx * sgn)
        cv = body.add(p, part, sgn, 0.0, target=p, centre=True)
        for m in (0, 2):
            body.face(ring[m], ring[m + 1], ring[m + 2], cv, part)
    return rings


def build_nose(body, ctx):
    """The muzzle lobe (house M, 20 deg nose up, 1.0 H wide: ruling 2) and the nose bulb (house nose numbers, a little taller): closed domes sunk into the head and standing proud of it."""
    H = ctx["H"]
    kc = H.kc
    Rfa = ctx["info"]["head"]["Rfa"]
    body._from_local = lambda p: from_local(kc, Rfa, p)
    lat = np.array([0, 1.0, 0])
    tl = math.radians(20.0)
    ax = np.array([math.cos(tl), 0, math.sin(tl)]); up = np.array([-math.sin(tl), 0, math.cos(tl)])
    rx, ry, rz = H.M["r"]
    ry, rz = 0.48, 0.21
    cM = np.array(H.M["c"]) - np.array([MUZZLE_PULL, 0, 0])     # ruling 3: the lobe stands 0.08 H proud of the skull (the house number is 0.25)
    ctx["info"]["muzzle"] = dict(rings=sitting_dome(body, "muzzle", cM, ax, up, lat, rx, ry, rz, kx=2.2), r=(rx, ry, rz), c=cM)
    n = H.nose
    tilt = math.radians(H.rf["nose-tilt-deg"])
    axn = np.array([math.cos(tilt), 0, math.sin(tilt)]); upn = np.array([-math.sin(tilt), 0, math.cos(tilt)])
    nrx, nry, nrz = n["r"]
    cN = np.array(n["c"]); cN[0] = cM[0] + rx - 0.0 + NOSE_STAND - nrx * 0.85
    ctx["info"]["nose"] = dict(rings=sitting_dome(body, "nose", cN, axn, upn, lat, nrx, nry, nrz * 1.45), c=cN)
