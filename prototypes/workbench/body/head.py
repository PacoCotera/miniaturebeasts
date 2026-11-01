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
LOBE_R = (0.24, 0.36, 0.26)
LOBE_DZ = 0.02
LOBE_PROUD = 0.07
NOSE_TIP = 0.03
NOSE_DZ = -0.02
CHIN_R = (0.20, 0.45, 0.175)
THROAT_X = 0.10
CHIN_OVER = 0.26
MUZZLE_PULL = 0.12
NOSE_STAND = 0.12
HEAD_START_UP = 0.0
PATH_LEAD = 0.45
BEND_R = 1.2
HEAD_TOP_GAP = 0.40       # the last ring this far (arc) below the path's end
NA = 9


BALL_C = np.array([0.0, 0.0, 2.05])
BALL_R = np.array([0.85, 0.85, 0.85])
BALL_N = 2.0


def build_head(body, ctx):
    """CHIBI pass (lead, 1 Nov): the head is a big round ball (diameter 1.7 H, a sphere: exponent 2, no flat top or front), sitting on the soft pear trunk; rings are cast on the ball along a bent path from the neck socket;
    the muzzle is a small round dome low on the front of the ball, the eyes sit on its front-sides (column 6, 45 deg off the front)."""
    spec, H, T = ctx["spec"], ctx["H"], ctx["T"]
    import paths as PA
    cage = body.cage
    tf, tr = ctx["info"]["torso"]["faces"], ctx["info"]["torso"]["rings"]
    for i in (6, 7):
        for c in (0, 1, 2):
            body.kill(tf[(i, c)])
    loop = [tr[6][0], tr[6][1], tr[6][2], tr[6][3], tr[7][3], tr[8][3], tr[8][2], tr[8][1], tr[8][0]]
    V0 = cage.arr()
    Rfa = np.eye(3)
    kc = np.zeros(3)
    ctx["head_kc"] = kc
    C, Rr = BALL_C, BALL_R
    fld = lambda p: (np.sum(np.abs((np.asarray(p) - C) / Rr) ** BALL_N, axis=-1)) ** (1.0 / BALL_N) - 1.0
    full = np.concatenate([V0[loop], V0[loop] * np.array([1, -1, 1])])
    cen = full.mean(0)
    K = C.copy()
    P1 = K - np.array([0.0, 0.0, 0.05])
    cen_xz = np.array([cen[0], 0.0, cen[2]])
    d1 = (P1 - cen_xz) / np.linalg.norm(P1 - cen_xz)
    P0 = cen_xz - PATH_LEAD * d1
    Cr = C + np.array([-0.05, 0.0, 0.85])
    d2 = (Cr - P1) / np.linalg.norm(Cr - P1)
    P2 = Cr + 0.4 * d2
    pa = PA.Path(["waist", "K", "crown"], [P0, P1, P2], [[BEND_R, BEND_R]] * 3, 1.25, up=[0, 0, 1])
    def frame(s):
        pt, Tg, Nn, _ = pa.at([s])
        Tg = Tg[0]
        nape = -np.array([1.0, 0, 0])
        Nn = nape - (nape @ Tg) * Tg
        Nn /= np.linalg.norm(Nn)
        return pt[0], Tg, Nn, np.cross(Nn, Tg)
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
    s_e = s_through(C + np.array([0.0, 0.0, 0.05]))
    stl = [s_e]
    k = 1
    while s_e - 0.14 * k >= PATH_LEAD + 0.03:
        stl.append(s_e - 0.14 * k); k += 1
    k = 1
    while True:
        s = s_e + 0.14 * k
        if s > pa.length - 0.03 or frame(s)[0][2] > C[2] + Rr[2] - 0.12:
            break
        stl.append(s); k += 1
    stl = sorted(stl)
    a = np.arange(NA) / (NA - 1)
    rings, info = [], []
    for s in stl:
        pt, Tg, Nn, Bb = frame(s)
        dirs = np.cos(np.pi * a)[:, None] * Nn + np.sin(np.pi * a)[:, None] * Bb
        if fld(pt[None])[0] > 0:
            raise RuntimeError("ring centre outside the head ball at s=%.3f" % s)
        P = bisect_ray(fld, np.tile(pt, (NA, 1)), dirs, 0.0, 2.5)
        ids = [body.add(P[k], "head", s, a[k], target=P[k], centre=(k in (0, NA - 1))) for k in range(NA)]
        rings.append(ids)
        info.append(dict(s=s, centre=pt, T=Tg, N=Nn))
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(NA - 1):
            body.face(r0[k], r0[k + 1], r1[k + 1], r1[k], "head")
    last = info[-1]
    top_pt = bisect_ray(fld, last["centre"][None], last["T"][None], 0.0, 2.0)[0]
    depth = max(float((top_pt - last["centre"]) @ last["T"]), 0.05)
    cap = HalfCap(body, rings[-1], "head", last["centre"], last["T"], last["N"], +1, depth)
    waist = []
    for k, v in enumerate(loop):
        p = 0.5 * (V0[v] + np.array(cage.V[rings[0][k]]))
        waist.append(body.add(p, "head", -0.1, a[k], target=p, centre=(k in (0, NA - 1))))
    for k in range(NA - 1):
        body.face(loop[k], loop[k + 1], waist[k + 1], waist[k], "head")
        body.face(waist[k], waist[k + 1], rings[0][k + 1], rings[0][k], "head")
    ctx["info"]["head"] = dict(loop=loop, waist=waist, rings=rings, ringinfo=info, cap=cap, Rfa=Rfa, path=pa, rows=dict(eye=s_e, nose=s_e, mouth=s_e), fld=fld)
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
    """A small round muzzle dome low on the ball, the nose bulb making its tip."""
    H = ctx["H"]
    fld = ctx["info"]["head"]["fld"]
    body._from_local = lambda p: np.asarray(p, float)
    lat = np.array([0, 1.0, 0])
    tl = math.radians(12.0)
    ax = np.array([math.cos(tl), 0, math.sin(tl)]); up = np.array([-math.sin(tl), 0, math.cos(tl)])
    rx, ry, rz = LOBE_R
    zc = float(BALL_C[2]) - 0.34
    xs = float(bisect_ray(fld, np.array([[BALL_C[0], 0.0, zc]]), np.array([[1.0, 0, 0]]), 0.0, 2.5)[0][0])
    cM = np.array([xs + LOBE_PROUD - rx * 0.92, 0.0, zc])
    ctx["info"]["muzzle"] = dict(rings=sitting_dome(body, "muzzle", cM, ax, up, lat, rx, ry, rz, us=(-0.9, -0.55, -0.15, 0.2, 0.6, 0.9), kx=2.0), r=(rx, ry, rz), c=cM)
    n = H.nose
    nrx, nry, nrz = [x * 1.15 for x in n["r"]]
    front = cM[0] + rx * 0.92
    cN = np.array([front + NOSE_TIP - nrx, 0.0, zc + 0.09])
    ctx["info"]["nose"] = dict(rings=sitting_dome(body, "nose", cN, np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), lat, nrx, nry, nrz * 1.5), c=cN)
    ctx["face"] = dict(lobe_c=cM, lobe_r=LOBE_R, nose_c=cN, smile_z=float(zc - 0.02), front_x=float(front + NOSE_TIP))


