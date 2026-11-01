"""Paths (body-spec s1.2, s2.1; anatomy-lessons s3.1, s3.3): fillet, rotation-minimizing frame, monotone radii, ring stations, FK from len/pitch, the sole on the floor.
Pure numpy, float64, deterministic. Units: H. Ported from anatomy/limbpath.py (the checks reproduce A s3.2: tests/test_paths.py)."""
import math
import numpy as np


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-300)


def fk(root, joints, plane="xz", plane_yaw=0.0):
    """Joint centres from the root and each joint's len and pitch (degrees from +x in the limb plane x-z; -90 = straight down). joints[0] is the root joint (no len).
    plane_yaw (degrees, default 0): the plane is turned about the vertical, so the in-plane horizontal is (cos yaw, sin yaw, 0); yaw 0 is the plane x-z exactly (the old FK, bit for bit)."""
    P = [np.array(root, float)]
    if plane_yaw == 0.0:
        for j in joints[1:]:
            a = math.radians(j["pitch"])
            P.append(P[-1] + j["len"] * np.array([math.cos(a), 0.0, math.sin(a)]))
        return np.array(P)
    cy, sy = math.cos(math.radians(plane_yaw)), math.sin(math.radians(plane_yaw))
    for j in joints[1:]:
        a = math.radians(j["pitch"])
        P.append(P[-1] + j["len"] * np.array([cy * math.cos(a), sy * math.cos(a), math.sin(a)]))
    return np.array(P)


def sole_on_floor(root, joints, tol_deg=10.0):
    """Put the last joint at z = 0: adjust the last pitch within +-tol (bisect); if the segment cannot reach (it is a column, flat in pitch near -90), lower or raise the root by
    the residual instead. Returns (joints', root', log). Never changes lengths."""
    js = [dict(j) for j in joints]
    P = fk(root, js)
    z0 = P[-1][2]
    log = dict(sole_z_before=float(z0), pitch_before=js[-1]["pitch"], dpitch=0.0, root_dz=0.0)
    dz = -float(z0)
    if abs(dz) <= 0.02:
        # a column is flat in pitch near -90: a small residual is taken by moving the root, not by tilting the foot
        root = np.array(root, float) + np.array([0, 0, dz])
        log["root_dz"] = dz
        log["sole_z_after"] = float(fk(root, js)[-1][2])
        return js, root, log
    zw = P[-2][2]
    L = js[-1]["len"]
    p0 = js[-1]["pitch"]
    best = None
    for dp in np.linspace(-tol_deg, tol_deg, 4001):
        z = zw + L * math.sin(math.radians(p0 + dp))
        if best is None or abs(z) < best[0] - 1e-15:
            best = (abs(z), dp)
    js[-1]["pitch"] = p0 + best[1]
    log["dpitch"] = float(best[1])
    P = fk(root, js)
    dz = -float(P[-1][2])
    root = np.array(root, float) + np.array([0, 0, dz])
    log["root_dz"] = dz
    log["sole_z_after"] = float(fk(root, js)[-1][2])
    return js, root, log


def fillet_path(P, R, k, planar_keep=True):
    """Polyline through the joints P (n, 3) with radii R (n, 2); every inner corner becomes a circular-ish arc (quadratic Bezier) of radius rho = k max(R_i).
    Returns the dense points and a per-joint report (bend, rho, tangent length, room, ok)."""
    P = [np.array(p, float) for p in P]
    pts = [P[0]]
    rep = []
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        u = unit(b - a)
        v = unit(c - b)
        th = math.acos(max(-1, min(1, float(u @ v))))
        rho = k * max(R[i])
        t = rho * math.tan(th / 2) if th > 1e-9 else 0.0
        la = np.linalg.norm(b - a) * (1 if i == 1 else 0.5)
        lc = np.linalg.norm(c - b) * (1 if i == len(P) - 2 else 0.5)
        room = float(min(la, lc))
        rep.append(dict(joint=i, bend_deg=round(math.degrees(th), 1), rho=round(rho, 3), tangent=round(t, 3), room=round(room, 3), ok=bool(t <= room)))
        if th < 1e-9:
            continue
        p0, p1 = b - u * t, b + v * t
        n = max(2, int(math.ceil(math.degrees(th) / 5)))
        for j in range(n + 1):
            s = j / n
            pts.append((1 - s) ** 2 * p0 + 2 * (1 - s) * s * b + s * s * p1)
    pts.append(P[-1])
    return np.array(pts), rep


def arclen(pts):
    return np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]


def tangents(pts):
    return unit(np.gradient(pts, axis=0))


def rmf(pts, start=None, up=None):
    """Double reflection (Wang, Juttler, Zheng, Liu 2008). start: the vector the first normal is projected from (default +x). up: if given, the frame is LOCKED (a centre-line path):
    N = up projected on the plane normal to T. Returns T (n,3), N (n,3) with N the 'dorsal' direction, B = T x N."""
    T = tangents(pts)
    if up is not None:
        up = np.asarray(up, float)
        N = unit(up - (T @ up)[:, None] * T)
        return T, N
    s0 = np.array([1.0, 0, 0]) if start is None else np.asarray(start, float)
    r = unit(s0 - (s0 @ T[0]) * T[0])
    F = [r]
    for i in range(len(pts) - 1):
        v1 = pts[i + 1] - pts[i]
        c1 = v1 @ v1
        if c1 < 1e-18:
            F.append(F[-1])
            continue
        rL = F[-1] - (2 / c1) * (v1 @ F[-1]) * v1
        tL = T[i] - (2 / c1) * (v1 @ T[i]) * v1
        v2 = T[i + 1] - tL
        c2 = v2 @ v2
        rn = rL - (2 / c2) * (v2 @ rL) * v2 if c2 > 1e-12 else rL
        F.append(unit(rn))
    return T, np.array(F)


def place_rings(pts, s, R, js, edge=0.2, max_turn=20.0, merge=0.04):
    """Ring stations: every `edge` of arc length, wherever the tangent has turned max_turn, and three at every joint (s_j, s_j +- 0.5 r_j); stations closer than `merge` merge."""
    T = tangents(pts)
    st = [0.0]
    acc = 0.0
    for i in range(1, len(pts)):
        acc += math.degrees(math.acos(max(-1, min(1, float(T[i] @ T[i - 1])))))
        if s[i] - st[-1] >= edge or acc >= max_turn:
            st.append(float(s[i]))
            acc = 0.0
    for x, r in zip(js, R):
        st.append(x)
        for d in (-0.5 * max(r), 0.5 * max(r)):
            if 0 < x + d < s[-1]:
                st.append(x + d)
    st.append(float(s[-1]))
    st = sorted(set(round(x, 4) for x in st))
    out = [st[0]]
    for x in st[1:]:
        if x - out[-1] > merge:
            out.append(x)
    if abs(out[-1] - s[-1]) > 1e-9:
        if s[-1] - out[-1] < merge and len(out) > 1:
            out[-1] = float(s[-1])
        else:
            out.append(float(s[-1]))
    return np.array(out)


def mono_cubic(x, y, q):
    """Fritsch-Carlson monotone cubic through (x, y), evaluated at q (clamped to the ends)."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    h = np.diff(x)
    d = np.diff(y) / h
    if len(x) == 2:
        m = np.array([d[0], d[0]])
    else:
        m = np.r_[d[0], [(0 if d[i - 1] * d[i] <= 0 else 2 / (1 / d[i - 1] + 1 / d[i])) for i in range(1, len(d))], d[-1]]
    q = np.clip(np.asarray(q, float), x[0], x[-1])
    i = np.clip(np.searchsorted(x, q) - 1, 0, len(h) - 1)
    t = (q - x[i]) / h[i]
    h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
    return h00 * y[i] + h10 * h[i] * m[i] + h01 * y[i + 1] + h11 * h[i] * m[i + 1]


def radius_at(s_q, js, R):
    R = np.asarray(R, float)
    return np.stack([mono_cubic(js, R[:, a], s_q) for a in range(R.shape[1])], axis=1)


class Path:
    """A filleted path through named joints with radii: dense points, arc length, joint arc lengths, tangent/normal frame."""

    def __init__(self, names, P, R, fillet=1.25, up=None, start=None):
        self.names, self.R = list(names), np.asarray(R, float)
        self.P = np.asarray(P, float)
        self.pts, self.fillets = fillet_path(self.P, self.R, fillet)
        self.s = arclen(self.pts)
        js = [float(self.s[np.argmin(np.linalg.norm(self.pts - p, axis=1))]) for p in self.P]
        js[0], js[-1] = 0.0, float(self.s[-1])
        self.js = js
        self.T, self.N = rmf(self.pts, start=start, up=up)
        self.B = np.cross(self.T, self.N)
        self.length = float(self.s[-1])

    def at(self, sq):
        sq = np.atleast_1d(np.asarray(sq, float))
        pt = np.stack([np.interp(sq, self.s, self.pts[:, k]) for k in range(3)], -1)
        T = unit(np.stack([np.interp(sq, self.s, self.T[:, k]) for k in range(3)], -1))
        N = np.stack([np.interp(sq, self.s, self.N[:, k]) for k in range(3)], -1)
        N = unit(N - (N * T).sum(-1, keepdims=True) * T)
        return pt, T, N, np.cross(T, N)

    def radii(self, sq):
        return radius_at(sq, self.js, self.R)

    def stations(self, edge=0.2, **kw):
        return place_rings(self.pts, self.s, self.R, self.js, edge=edge, **kw)


def check_path(name, joint_names, P, R, fillet=1.25, edge=0.2, exact=False):
    """limbpath.py's check, on a Path: the fold-free numbers (the A s3.4 rows for a path). exact=False reproduces limbpath.py (frames read at the nearest dense sample, which can
    put two close stations on one sample and read a gap of 0); exact=True reads the tangent and frame at each station's own arc length (what the cage uses)."""
    pa = Path(joint_names, P, R, fillet)
    rs = pa.stations(edge)
    rr = pa.radii(rs)
    if exact:
        _, T, F, _ = pa.at(rs)
        s = rs
        idx = list(range(len(rs)))
    else:
        s = pa.s
        idx = [int(np.argmin(abs(s - q))) for q in rs]
        T, F = pa.T, pa.N
    kr = []
    for a, b, c in zip(idx, idx[1:], idx[2:]):
        ang = math.acos(max(-1, min(1, float(T[a] @ T[c]))))
        ds = s[c] - s[a]
        kr.append((ang / ds) * max(rr[idx.index(b)]) if ds > 0 else 0)
    ratio = [max(rr[i + 1][k] / rr[i][k], rr[i][k] / rr[i + 1][k]) for i in range(len(rr) - 1) for k in range(2)]
    inner = []
    for i in range(len(idx) - 1):
        a, b = idx[i], idx[i + 1]
        ang = math.acos(max(-1, min(1, float(T[a] @ T[b]))))
        inner.append((s[b] - s[a]) - max(max(rr[i]), max(rr[i + 1])) * ang)
    tw = []
    for i in range(len(F) - 1):
        f = F[i] - (F[i] @ T[i + 1]) * T[i + 1]
        f /= np.linalg.norm(f)
        g = np.cross(T[i + 1], f)
        tw.append(abs(math.degrees(math.atan2(F[i + 1] @ g, F[i + 1] @ f))))
    return dict(limb=name, joints=list(joint_names), length_H=round(pa.length, 3), joint_s=[round(x, 3) for x in pa.js], fillets=pa.fillets, rings=len(rs),
                ring_s=[round(float(x), 3) for x in rs], max_ring_ratio=round(max(ratio), 3), max_kappa_r=round(max(kr), 3) if kr else 0.0,
                min_inner_gap_H=round(min(inner), 3), max_twist_deg_per_ring=round(max(tw), 4))
