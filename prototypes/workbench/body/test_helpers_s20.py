"""Measurements shared by the S20 tests and sheets."""
import numpy as np
import s20measure as M, mquality as Q


def rings_full(b):
    V, F, attr, fp = Q.full_topology(b)
    m = b.ctx["remap"]
    n0 = len(b.cage.V)
    extra = [i for i in range(n0) if abs(V[i][1]) > 1e-12]
    mirror = {e: n0 + k for k, e in enumerate(extra)}
    out = []
    for r in b.ctx["info"]["torso"]["rings"]:
        ids = [m[v] for v in r]
        out.append(ids + [mirror[i] for i in ids if i in mirror])
    return V, out


def ring_ratio(b):
    V, rings = rings_full(b)
    return M.ring_ratio_xy(V, rings)


def crown_curv(b, V2):
    zs = b.ctx["spec"]["parts"]["torso"]["rings_z"]
    zt, zp = zs[-1], zs[-2]
    m = np.abs(V2[:, 1]) < 1e-9
    P = V2[m][:, [0, 2]]
    P = P[P[:, 1] > 1.7]
    c = np.array([0, 1.75])
    P = P[np.argsort(np.arctan2(P[:, 1] - c[1], P[:, 0] - c[0]))]
    k = M.curvatures(P)
    Pm = P[1:-1]
    return float(k[Pm[:, 1] >= zt + 0.04].mean()), float(k[(Pm[:, 1] >= zp) & (Pm[:, 1] < zt + 0.04)].mean())
