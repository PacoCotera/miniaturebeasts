"""Limit compensation (body-spec s2.6): after the cage is complete, 8 Jacobi steps v <- v + omega (target(v) - limit(v)) (omega 1.5: plain Jacobi, omega 1, contracts the high-frequency error by only 0.67 a step and leaves 0.006 after 8) on every vertex that has a design target. The limit is the Catmull-Clark
limit stencil of cage.py (the mirrored mesh, so the stencils see both halves). Stops at max error < tol or after `steps` (reported). The cage vertex is kept within cmax of its target: a target whose curvature the grid cannot carry would otherwise make the vertex run away (spikes); then the residual stays above tol and is REPORTED, never hidden."""
import numpy as np


def limit_fix(body, steps=8, tol=0.004, only=None, omega=1.5, cmax=0.30):
    c = body.cage
    n = len(c.V)
    has = np.array([t is not None for t in body.target])
    # cap interiors are re-placed from their ring each step, never targeted
    free = np.zeros(n, bool)
    for cp in getattr(body, 'caps', []):
        free[cp.ids] = True
    for cp in getattr(body, 'caps', []):
        cp.replace(body)
    has = has & ~free
    mask = has.copy()
    if only is not None:
        mask &= np.array(only, bool)
    hold = np.zeros(n, bool)
    hold[list(body.hold)] = True
    mask &= ~hold
    T = np.array([t if t is not None else (0, 0, 0) for t in body.target], float)
    cm = c.centre_mask()
    hist = []
    for it in range(steps + 1):
        L, _ = c.limit_points()
        err = T - L
        err[~mask] = 0
        err[cm, 1] = 0
        e = np.linalg.norm(err, axis=1)
        hist.append(float(e.max()))
        if e.max() < tol or it == steps:
            break
        A = c.arr() + omega * err
        A[cm, 1] = 0.0
        dv = A - T
        nd = np.linalg.norm(dv, axis=1)
        k = np.where(mask & (nd > cmax), cmax / np.maximum(nd, 1e-12), 1.0)
        A = np.where(mask[:, None], T + dv * k[:, None], A)
        c.set_arr(A)
        for cp in getattr(body, 'caps', []):
            cp.replace(body)
    return dict(steps=it, max_err=hist[-1], hist=hist, converged=bool(hist[-1] < tol), n=int(mask.sum()))
