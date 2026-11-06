"""The face on the clay: the eyes and the mouth as flat dark shapes lying on the head, from the face decal's placement in the file (face.eyes, face.mouth) and the creature's eye and mouth genes.
Shape only, no coat: round eyes and a gently curved mouth stroke, each a few mm proud of the surface. Returns (V, F) as lists of polygons for the proxy renderer's clay mode. Needs the loft (`G`), the internal spec and the coat values."""
import numpy as np

LIFT = 0.004
_TRI = {}


def _tris(mesh):
    k = id(mesh["V"])
    if k not in _TRI:
        V, F = np.asarray(mesh["V"], float), np.asarray(mesh["F"], int)
        T = np.vstack([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
        _TRI.clear()
        _TRI[k] = (V[T[:, 0]], V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    return _TRI[k]


def snap(mesh, Q, n):
    """Q moved onto the proxy surface along the normal n (the design surface the decal is placed on sits a little under the shipped mesh): the nearest hit of a ray from 0.3 H outside, then LIFT outward."""
    A, E1, E2 = _tris(mesh)
    O = Q + 0.3 * n
    d = -n
    h = np.cross(d, E2)
    det = np.einsum("ij,ij->i", E1, h)
    ok = np.abs(det) > 1e-12
    f = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
    sv = O - A
    u = f * np.einsum("ij,ij->i", sv, h)
    q = np.cross(sv, E1)
    v = f * (q @ d)
    t = f * np.einsum("ij,ij->i", E2, q)
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)
    if not hit.any():
        return Q + LIFT * n
    return O + d * t[hit].min() + LIFT * n


def _frame(G, z, a):
    import s20coat as C
    return C.surface_frame(G, z, a)


def _poly(G, z, a, pts, mirror, mesh=None):
    """pts: (dx, dz) in viewer-right and up on the head's left half (mirror=False) or right half (mirror=True): placed on the loft by height and angle (an angle past the front centreline reflects to the other side), lifted along the normal."""
    P, n, up, rgt = _frame(G, z, a)
    e = 1e-3
    a0, a1 = max(a - e, 0.0), min(a + e, 1.0)
    dPda = (G.point(np.array([z]), np.array([a1]))[0] - G.point(np.array([z]), np.array([a0]))[0]) / (a1 - a0)
    La = float(np.linalg.norm(dPda))
    s = 1.0 if float(dPda @ rgt) > 0 else -1.0
    out = []
    for dx, dz in pts:
        ar = a + s * dx / La * (-1.0 if mirror else 1.0)
        side = 1.0 if ar <= 1.0 else -1.0
        aa = ar if ar <= 1.0 else 2.0 - ar
        side = -side if mirror else side
        Q = G.point(np.array([z + dz]), np.array([float(np.clip(aa, 0.0, 1.0))]))[0].copy()
        Q[1] = abs(Q[1]) * side
        nn = np.array([n[0], abs(n[1]) * side, n[2]])
        out.append(snap(mesh, Q, nn) if mesh is not None else Q + LIFT * nn)
    return out


def face_mesh(G, spec, g, mesh=None):
    f = spec["face"]
    eyes, mouth = f["eyes"], f["mouth"]
    R = float(eyes["r"]) * float(g.get("eye_size", 1.0))
    ez = float(eyes["station"]) + float(g.get("eye_height", 0.0))
    ea = float(eyes["around"]) + float(g.get("eye_spacing", 0.0))
    V, F = [], []

    def add(poly, flip):
        i = len(V)
        V.extend(poly)
        ids = list(range(i, i + len(poly)))
        F.append(ids[::-1] if flip else ids)

    NR, NA = 5, 28                     # rings and spokes: every point of the disc is put on the surface, so it does not sink under the head's bulge between rim points
    pts = [(0.0, 0.0)] + [(R * k / NR * np.cos(t), R * k / NR * np.sin(t)) for k in range(1, NR + 1) for t in np.linspace(0, 2 * np.pi, NA, endpoint=False)]
    for mirror in (False, True):
        P_ = _poly(G, ez, ea, pts, mirror, mesh)
        i = len(V)
        V.extend(P_)
        idx = lambda k, j: i + 1 + (k - 1) * NA + (j % NA)
        for j in range(NA):
            F.append([i, idx(1, j), idx(1, j + 1)] if not mirror else [i, idx(1, j + 1), idx(1, j)])
            for k in range(1, NR):
                q = [idx(k, j), idx(k + 1, j), idx(k + 1, j + 1), idx(k, j + 1)]
                F.append(q if not mirror else q[::-1])
    W = float(mouth["width"]) * float(g.get("mouth_width", 1.0))
    mz = float(mouth["station"]) + float(g.get("mouth_z", 0.0))
    xs = np.linspace(-W / 2, W / 2, 21)
    centre = lambda x: 0.022 * (x / (W / 2)) ** 2 - 0.011      # a gentle smile: the ends sit higher than the middle
    top, bot = [(x, centre(x) + 0.016) for x in xs], [(x, centre(x) - 0.016) for x in xs]
    P_ = _poly(G, mz, 1.0, top + bot, False, mesh)
    i = len(V)
    V.extend(P_)
    n_ = len(xs)
    for j in range(n_ - 1):
        F.append([i + j, i + j + 1, i + n_ + j + 1, i + n_ + j])
    return np.array(V, float), F
