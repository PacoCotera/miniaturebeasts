"""Measurements on the level-2 mesh of an S20 body: widths, the side profile, curvature along the mirror line."""
import numpy as np


def width_at(V2, z, dz=0.02, part=None, attr=None, pid=None):
    m = np.abs(V2[:, 2] - z) < dz
    if part is not None:
        m &= np.rint(attr[:, 0]).astype(int) == pid
    return 2 * float(np.abs(V2[m, 1]).max()) if m.any() else 0.0


def widths(V2):
    zs = np.arange(0.2, 2.2, 0.02)
    w = np.array([width_at(V2, z) for z in zs])
    return zs, w


def centre_curve(V2, z_lo, z_hi=None, tol=1e-9, cx=0.0):
    """The level-2 vertices on the mirror plane in the z window, ordered by the angle about the axis, as (x, z) points (front line up over the top to the back line for the crown)."""
    m = np.abs(V2[:, 1]) < tol
    P = V2[m][:, [0, 2]]
    P = P[(P[:, 1] >= z_lo) & ((P[:, 1] <= z_hi) if z_hi is not None else True)]
    return P


def curvatures(P):
    """Discrete curvature (1/H) at the interior points of an ordered polyline (turning angle over mean segment length)."""
    a, b, c = P[:-2], P[1:-1], P[2:]
    u, v = b - a, c - b
    lu, lv = np.linalg.norm(u, axis=1), np.linalg.norm(v, axis=1)
    cr = u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0]
    ang = np.arctan2(cr, (u * v).sum(1))
    return np.abs(ang) / (0.5 * (lu + lv))


def ring_ratio_xy(V, rings):
    """Adjacent-ring ratio of a horizontal ring's half-width (max |y|) and its depth (x range), the worst over the loft."""
    ext = []
    for r in rings:
        P = V[list(r)]
        ext.append((max(np.abs(P[:, 1]).max(), 1e-9), max(P[:, 0].max() - P[:, 0].min(), 1e-9)))
    worst = 1.0
    for a, b in zip(ext, ext[1:]):
        for k in range(2):
            worst = max(worst, a[k] / b[k], b[k] / a[k])
    return float(worst)
