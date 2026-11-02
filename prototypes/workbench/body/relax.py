"""Cage relaxation (S20 pass 2). Two passes, both on the mirrored cage so the result is symmetric, both leaving the half model's mirror-plane vertices on y = 0:
  smooth_junctions : a weighted Taubin (lambda | mu) smoothing of the vertices round every socket loop (leg, arm, ear): the loop and the bands of the transition lie on a cone cut straight from the trunk; smoothing them rounds the cone into a filleted
                     band of several loops (the socket loop is relaxed into the trunk). The weight falls with the number of edges from the loop, so the rest of the cage is not touched.
  tangential_relax : move every free vertex along the surface (the Laplacian step with its normal part removed) toward the mean of its neighbours, then bring it back to the reference surface (the limit surface of the cage before the pass, sampled
                     finely): the edge lengths even out, the ring bunching goes, the shape stays within `tol`. The reference is a point cloud of the level-4 limit surface with normals; the nearest-point projection is a brute-force chunked search (no scipy here)."""
import numpy as np


def full_adjacency(F, n):
    nb = [set() for _ in range(n)]
    for f in F:
        for k in range(4):
            a, b = int(f[k]), int(f[(k + 1) % 4])
            nb[a].add(b); nb[b].add(a)
    return [np.array(sorted(s), int) for s in nb]


def hops_from(nbr, seeds, maxh=8):
    d = np.full(len(nbr), maxh + 1)
    fr = list(seeds)
    for s in fr:
        d[s] = 0
    h = 0
    while fr and h < maxh:
        h += 1
        nxt = []
        for v in fr:
            for u in nbr[v]:
                if d[u] > h:
                    d[u] = h
                    nxt.append(int(u))
        fr = nxt
    return d


def junction_loops(body, ctx):
    """Cage vertex ids (half model, after the remap) of every socket loop, with the number of transition bands of its part."""
    m = ctx["remap"]
    out = []
    for kind in ("limbs", "tubes"):
        for name, rec in ctx["info"].get(kind, {}).items():
            loop = [m[v] for v in rec["loop"] if v in m]
            tr = rec.get("transition")
            nt = 0 if tr is None else (len(tr) if (len(tr) and isinstance(tr[0], (list, tuple))) else 1)
            out.append((name, loop, nt))
    return out


def smooth_junctions(body, ctx, iters=60, hops=8, lam=0.5, mu=-0.53, protect=None, only=None):
    cage = body.cage
    V, F, mirror = cage.full()
    n = len(cage.V)
    nbr = full_adjacency(F, len(V))
    seeds = []
    for name, loop, nt in junction_loops(body, ctx):
        if only is not None and name not in only:
            continue
        for v in loop:
            seeds.append(v)
            if mirror[v] != v:
                seeds.append(int(mirror[v]))
    d = hops_from(nbr, seeds, hops)
    w = np.clip(1.0 - d / float(hops + 1), 0, 1) ** 1.0
    fixed = np.zeros(len(V), bool)
    for v in (protect or []):
        fixed[v] = True
        if mirror[v] != v:
            fixed[mirror[v]] = True
    w[fixed] = 0.0
    for cp in getattr(body, "caps", []):
        w[cp.ids] = 0.0
    for k, v in body.tag.items():            # toe beads are added later; tag vertices are never touched
        w[k] = 0.0
    cm = np.abs(V[:, 1]) < 1e-12
    A = V.copy()
    for it in range(iters):
        for f in (lam, mu):
            M = np.array([A[nb].mean(0) if len(nb) else A[i] for i, nb in enumerate(nbr)])
            A = A + f * w[:, None] * (M - A)
            A[cm, 1] = 0.0
    cage.set_arr(A[:n])
    return dict(moved=int((w > 0).sum()), max_move=float(np.abs(A[:n] - V[:n]).max()))


def _nearest(P, R, chunk=1500):
    out = np.zeros(len(P), int)
    r2 = (R * R).sum(1)
    for i in range(0, len(P), chunk):
        X = P[i:i + chunk]
        d = (X * X).sum(1)[:, None] - 2 * X @ R.T + r2[None]
        out[i:i + chunk] = d.argmin(1)
    return out


def tangential_relax(body, ctx, iters=6, step=0.5, region="torso", skip_hops=2):
    """Even the edge lengths of the loft (the ring bunching at the seat-to-tail step): move each free vertex of `region` along the surface toward the mean of its neighbours, then pull it back onto the limit surface of the cage as it was before the pass
    (nearest point of its level-2 subdivision, along that point's normal). Caps, socket loops (and the vertices within `skip_hops` edges of them) and the mirror-plane's y = 0 stay put in y. Returns the edge-length ratio before and after and the largest shape change."""
    import subdiv as SD, gltf_out
    cage = body.cage
    V, F, mirror = cage.full()
    n = len(cage.V)
    Vf, Ff, attr, fp, cr, mir = body.full()
    Vr, Fr, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
    Nr = gltf_out.vertex_normals(Vr, np.array(Fr, int))
    nbr = full_adjacency(F, len(V))
    seeds = []
    for name, loop, nt in junction_loops(body, ctx):
        for v in loop:
            seeds.append(v)
            if mirror[v] != v:
                seeds.append(int(mirror[v]))
    d = hops_from(nbr, seeds, skip_hops + 1)
    pid = np.array(list(body.part) + list(np.array(body.part)[np.where(mirror[:n] != np.arange(n))[0]]), int)
    free = (pid == body.parts[region]) & (d > skip_hops)
    for cp in getattr(body, "caps", []):
        free[cp.ids] = False
        free[cp.ring] = False
    for k, v in body.tag.items():
        free[k] = False
    cm = np.abs(V[:, 1]) < 1e-12
    nf = np.array(F, int)
    def edge_ratio(A):
        e = np.concatenate([np.linalg.norm(A[nf[:, k]] - A[nf[:, (k + 1) % 4]], axis=1) for k in range(4)])
        pa = pid[nf[:, 0]] == body.parts[region]
        e = np.concatenate([np.linalg.norm(A[nf[pa][:, k]] - A[nf[pa][:, (k + 1) % 4]], axis=1) for k in range(4)])
        return float(np.quantile(e, 0.99) / np.quantile(e, 0.01))
    r0 = edge_ratio(V)
    A = V.copy()
    for it in range(iters):
        fn = gltf_out.vertex_normals(A, nf)
        M = np.array([A[nb].mean(0) for nb in nbr])
        dl = M - A
        dl = dl - (dl * fn).sum(1, keepdims=True) * fn
        A = A + step * free[:, None] * dl
        A[cm, 1] = 0.0
        # keep the cage's limit surface on the old one: the limit points of the moved cage against the reference
        for _ in range(2):
            from cage import Cage
            tmp = Cage("t", mirrored=False)
            tmp.V = A.tolist(); tmp.F = list(nf)
            L, _ = tmp.limit_points()
            q = _nearest(L[free], Vr)
            dn = ((L[free] - Vr[q]) * Nr[q]).sum(1)
            A[np.where(free)[0]] -= (dn[:, None] * Nr[q])
            A[cm, 1] = 0.0
    cage.set_arr(A[:n])
    r1 = edge_ratio(A)
    return dict(edge_ratio_before=r0, edge_ratio_after=r1, max_move=float(np.abs(A[:n] - V[:n]).max()), free=int(free.sum()))
