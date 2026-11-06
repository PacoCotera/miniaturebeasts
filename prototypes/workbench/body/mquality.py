"""The mesh-quality rows of anatomy-lessons s3.4, measured on the cage (full, mirrored) and on its level-2 subdivision. Every function returns numbers; the tests compare them with the species' thresholds."""
import numpy as np
import subdiv as SD


def full_topology(body):
    V, F, attr, fp, cr, mirror = body.full()
    return V, np.array(F, int), attr, fp


def valence(F, nv):
    v = np.zeros(nv, int)
    for f in F:
        for i in f:
            v[i] += 1
    return v


def edge_faces(F):
    E = {}
    for fi, f in enumerate(F):
        for k in range(4):
            a, b = int(f[k]), int(f[(k + 1) % 4])
            E.setdefault((min(a, b), max(a, b)), []).append(fi)
    return E


def manifold(V, F):
    E = edge_faces(F)
    bad = sum(1 for v in E.values() if len(v) != 2)
    used = np.zeros(len(V), bool)
    used[np.unique(F)] = True
    # directed-edge consistency (each directed edge once): orientable and consistently wound
    d = {}
    for f in F:
        for k in range(4):
            e = (int(f[k]), int(f[(k + 1) % 4]))
            d[e] = d.get(e, 0) + 1
    dup = sum(1 for v in d.values() if v > 1)
    return dict(non_manifold_edges=bad, loose_verts=int((~used).sum()), inconsistent_winding=dup)


def mirror_plane(V, tol=1e-6):
    y = np.abs(V[:, 1])
    on = y < 1e-12
    near = (y > 1e-12) & (y <= tol)
    return dict(on_plane=int(on.sum()), max_abs_y_on_plane=float(y[on].max()) if on.any() else 0.0, near_but_off=int(near.sum()))


def edge_ratio(V, F, fp, part):
    sel = F[fp == part]
    L = []
    for f in sel:
        for k in range(4):
            L.append(np.linalg.norm(V[f[k]] - V[f[(k + 1) % 4]]))
    L = np.array(L)
    return float(L.max() / max(L.min(), 1e-12)) if len(L) else 1.0


def face_areas(V, F):
    a = V[F[:, 1]] - V[F[:, 0]]
    b = V[F[:, 2]] - V[F[:, 0]]
    c = V[F[:, 3]] - V[F[:, 0]]
    return 0.5 * (np.linalg.norm(np.cross(a, b), axis=1) + np.linalg.norm(np.cross(b, c), axis=1))


def area_ratio(V, F, fp=None, part=None):
    A = face_areas(V, F)
    E = edge_faces(F)
    r = 1.0
    for fs in E.values():
        if len(fs) == 2:
            if part is not None and not (fp[fs[0]] == part and fp[fs[1]] == part):
                continue
            a, b = A[fs[0]], A[fs[1]]
            r = max(r, max(a, b) / max(min(a, b), 1e-12))
    return float(r)


def nonplanarity(V, F):
    """4th vertex's distance from the plane of the other three, over the mean edge, worst quad."""
    worst = 0.0
    for f in F:
        a, b, c, d = V[f[0]], V[f[1]], V[f[2]], V[f[3]]
        n = np.cross(b - a, c - a)
        ln = np.linalg.norm(n)
        if ln < 1e-12:
            continue
        dist = abs((d - a) @ n) / ln
        me = np.mean([np.linalg.norm(V[f[k]] - V[f[(k + 1) % 4]]) for k in range(4)])
        worst = max(worst, dist / me)
    return float(worst)


def ring_ratio(V, rings):
    """Adjacent-ring ratio of the half-width and the height of each ring (lists of vertex ids, consecutive)."""
    worst = 1.0
    ext = []
    for r in rings:
        P = V[list(r)]
        ext.append((max(np.abs(P[:, 1]).max(), 1e-9), max(P[:, 2].max() - P[:, 2].min(), 1e-9)))
    for a, b in zip(ext, ext[1:]):
        for k in range(2):
            worst = max(worst, max(a[k] / b[k], b[k] / a[k]))
    return float(worst)


def flips(V2, F2):
    """The subdivided mesh: signed volume > 0 and the smallest dot of adjacent face normals (> -0.2 means no fold sharper than about 100 degrees)."""
    F2 = np.array(F2, int)
    n = np.cross(V2[F2[:, 2]] - V2[F2[:, 0]], V2[F2[:, 3]] - V2[F2[:, 1]])
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    n = n / np.maximum(ln, 1e-300)
    E = edge_faces(F2)
    md = 1.0
    for fs in E.values():
        if len(fs) == 2:
            md = min(md, float(n[fs[0]] @ n[fs[1]]))
    c = V2[F2].mean(1)
    vol = float(np.sum(np.einsum("ij,ij->i", c, n) * 0.5 * ln[:, 0]) / 3.0)
    return dict(min_adjacent_normal_dot=md, volume=vol)
