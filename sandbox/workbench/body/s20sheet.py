"""Sheet helpers for the S20 pictures: inline SVG diagrams from the species numbers (real text, >= 14 px), thin-tube meshes for the skeleton turnaround, shared page pieces. Under the bpy venv."""
import os, sys, math, html
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as PA, sheetlib as SL

BUILD = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"


def tube_mesh(pts, r, n=8, cap=True):
    """A closed quad tube along the polyline pts (radius r, scalar or per-point), with flat quad caps: (V, F)."""
    pts = np.asarray(pts, float)
    r = np.broadcast_to(np.asarray(r, float), (len(pts),))
    T = PA.tangents(pts)
    up = np.array([0.0, 0.0, 1.0])
    V, F = [], []
    for i, (p, t) in enumerate(zip(pts, T)):
        u = np.cross(t, up if abs(t @ up) < 0.95 else np.array([1.0, 0, 0]))
        u /= np.linalg.norm(u)
        w = np.cross(t, u)
        for k in range(n):
            a = 2 * math.pi * k / n
            V.append(p + r[i] * (math.cos(a) * u + math.sin(a) * w))
    for i in range(len(pts) - 1):
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            F.append((a, b, b + n, a + n))
    if cap:
        for i, rev in ((0, True), (len(pts) - 1, False)):
            c = len(V)
            V.append(pts[i])
            ring = [i * n + k for k in range(n)]
            for k in range(0, n, 2):
                q = (ring[k], ring[(k + 1) % n], ring[(k + 2) % n], c)
                F.append(q[::-1] if rev else q)
    return np.array(V), F


def merge(meshes):
    Vs, Fs, off = [], [], 0
    for V, F in meshes:
        Vs.append(V)
        Fs += [tuple(i + off for i in f) for f in F]
        off += len(V)
    return np.vstack(Vs), Fs


def svg_text(x, y, s, size=15, fill="#222", anchor="start", weight="normal"):
    return f"<text x='{x:.1f}' y='{y:.1f}' font-size='{size}' fill='{fill}' text-anchor='{anchor}' font-weight='{weight}' font-family='DejaVu Sans,sans-serif'>{html.escape(s)}</text>"


class Proj:
    """Maps world (a, b) to svg px: scale px per H, origin (ox, oy) is the px of world (0, 0); b is up."""
    def __init__(self, ppH, ox, oy):
        self.k, self.ox, self.oy = ppH, ox, oy

    def __call__(self, a, b):
        return self.ox + a * self.k, self.oy - b * self.k


def poly(P, pr, closed=False, stroke="#222", w=1.5, fill="none", dash=None, op=1.0):
    pts = " ".join(f"{pr(*p)[0]:.1f},{pr(*p)[1]:.1f}" for p in P)
    tag = "polygon" if closed else "polyline"
    d = f" stroke-dasharray='{dash}'" if dash else ""
    return f"<{tag} points='{pts}' fill='{fill}' stroke='{stroke}' stroke-width='{w}' stroke-opacity='{op}'{d}/>"
