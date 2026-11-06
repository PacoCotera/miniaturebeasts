"""Normal-continuity measurements for the shipped mesh (owner rule, 2 Nov: normals never change abruptly).
Two tests, everywhere except tagged creases (the toe beads, whose vertices carry tag > 0):
  face angle  : the angle between the normals of two faces that share an edge, at subdivision level 2, at most 20 degrees;
  gradient    : the angle between the smooth vertex normals at the two ends of an edge, per 0.1 H of edge length, at most 35 degrees.
`report` returns the maxima, the offender counts and where the worst ones are (part and position), for the tests and the sheets."""
import numpy as np

FACE_MAX = 20.0
GRAD_MAX = 35.0


def face_normals(V, F):
    F = np.asarray(F, int)
    n = np.cross(V[F[:, 2]] - V[F[:, 0]], V[F[:, 3]] - V[F[:, 1]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-14)


def vertex_normals(V, F):
    F = np.asarray(F, int)
    fn = np.cross(V[F[:, 2]] - V[F[:, 0]], V[F[:, 3]] - V[F[:, 1]])
    n = np.zeros_like(V)
    for k in range(4):
        np.add.at(n, F[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-14)


def edges(F):
    """Unique edges and the (up to two) faces of each: arrays E (m,2), FA (m,), FB (m,) (-1 when a boundary)."""
    F = np.asarray(F, int)
    a = np.concatenate([F[:, k] for k in range(4)])
    b = np.concatenate([F[:, (k + 1) % 4] for k in range(4)])
    f = np.tile(np.arange(len(F)), 4)
    lo, hi = np.minimum(a, b), np.maximum(a, b)
    key = lo.astype(np.int64) * (hi.max() + 1) + hi
    order = np.argsort(key, kind="stable")
    key_s, f_s, lo_s, hi_s = key[order], f[order], lo[order], hi[order]
    first = np.r_[True, key_s[1:] != key_s[:-1]]
    idx = np.where(first)[0]
    E = np.stack([lo_s[idx], hi_s[idx]], 1)
    FA = f_s[idx]
    nxt = np.minimum(idx + 1, len(key_s) - 1)
    same = (key_s[nxt] == key_s[idx]) & (nxt != idx)
    FB = np.where(same, f_s[nxt], -1)
    return E, FA, FB


def junction_zone(b, V, radius=0.22):
    """Vertices within `radius` H of a junction: the centre of each socket loop (leg, arm, ear), the point where the tail's range leaves the body (the loft's path at the tail root) and the nose mound. The gradient test reads these."""
    ctx = b.ctx
    m = ctx["remap"]
    Vc = b.cage.arr()
    C = []
    for kind in ("limbs", "tubes"):
        for name, rec in ctx["info"].get(kind, {}).items():
            if len(rec["loop"]):                                  # a hard join has no loop (its intersection line is a tagged crease)
                C.append(Vc[[m[v] for v in rec["loop"] if v in m]].mean(0))
    G = ctx["T"]
    pt = G.path.at([float(G.s_root)])[0][0]
    C.append(pt)
    nz = G.point(np.array([1.52]), np.array([1.0]))[0]
    C.append(nz)
    C = np.array(C)
    C = np.vstack([C, C * np.array([1, -1, 1.0])])
    d = np.linalg.norm(V[:, None, :] - C[None], axis=2).min(1)
    return d < radius


def measure(V, F, tag=None, vn=None, h_unit=1.0, s=None, s_trunk=None):
    """Per-edge arrays: face-normal angle (deg), gradient (deg per 0.1 H), the edge midpoint, a mask of the crease edges."""
    V = np.asarray(V, float)
    E, FA, FB = edges(F)
    fn = face_normals(V, F)
    ok = FB >= 0
    ang = np.zeros(len(E))
    ang[ok] = np.degrees(np.arccos(np.clip((fn[FA[ok]] * fn[FB[ok]]).sum(1), -1, 1)))
    if vn is None:
        vn = vertex_normals(V, F)
    dv = np.degrees(np.arccos(np.clip((vn[E[:, 0]] * vn[E[:, 1]]).sum(1), -1, 1)))
    L = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    grad = dv / np.maximum(L, 1e-9) * 0.1 * h_unit
    mid = 0.5 * (V[E[:, 0]] + V[E[:, 1]])
    crease = np.zeros(len(E), bool)
    if tag is not None:
        crease = (np.asarray(tag)[E[:, 0]] > 0.01) | (np.asarray(tag)[E[:, 1]] > 0.01)
    # which edges the gradient test reads: the rate of the normal along the surface where it changes across a junction, i.e. along the arc length of each part's own path (a thin tube turns its normal round itself at 1 / radius: its own roundness, not a
    # junction; round the tube the face-angle test above still applies). On the trunk (head, neck, back, seat: arc length from the stalk beyond s_trunk) every edge counts.
    along = np.ones(len(E), bool)
    if s is not None and not isinstance(s, tuple):
        s = np.asarray(s, float)
        ds = np.abs(s[E[:, 0]] - s[E[:, 1]])
        along = ds > 0.5 * np.maximum(L, 1e-9)
        if s_trunk is not None:
            along = along | ((s[E[:, 0]] > s_trunk) & (s[E[:, 1]] > s_trunk))
    return dict(E=E, ang=ang, grad=grad, mid=mid, crease=crease, len=L, along=along)


def report(V, F, tag=None, part=None, part_names=None, vn=None, top=8, s=None, s_trunk=None, zone=None):
    m = measure(V, F, tag, vn, s=s, s_trunk=s_trunk)
    keep = ~m["crease"]
    gk = keep & m["along"]
    if zone is not None:
        gk = gk & zone[m["E"][:, 0]] & zone[m["E"][:, 1]]
    out = dict(face_max=float(m["ang"][keep].max()), grad_max=float(m["grad"][gk].max()),
               face_bad=int((m["ang"][keep] > FACE_MAX).sum()), grad_bad=int((m["grad"][gk] > GRAD_MAX).sum()), edges=int(keep.sum()), creases=int(m["crease"].sum()))
    idx = np.where((keep & (m["ang"] > FACE_MAX)) | (gk & (m["grad"] > GRAD_MAX)))[0]
    idx = idx[np.argsort(-m["ang"][idx])]
    worst = []
    for e in idx[:top]:
        w = dict(face=float(m["ang"][e]), grad=float(m["grad"][e]), at=[round(float(x), 3) for x in m["mid"][e]])
        if part is not None:
            w["part"] = part_names[int(part[m["E"][e, 0]])] if part_names else int(part[m["E"][e, 0]])
        worst.append(w)
    out["worst"] = worst
    if part is not None and len(idx):
        c = {}
        for e in idx:
            k = part_names[int(part[m["E"][e, 0]])] if part_names else int(part[m["E"][e, 0]])
            c[k] = c.get(k, 0) + 1
        out["by_part"] = c
    return out, m
