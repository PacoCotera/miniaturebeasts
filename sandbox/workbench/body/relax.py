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


def neighbour_mean(nbr):
    """-> f(A): row i is A[nbr[i]].mean(0), for every vertex at once. The vertices are grouped by valence and each group's neighbours are added one column at a time, in the order of the list: the same additions in the same order
    as the mean of each list (one numpy call per vertex, a million of them in a build), so the same bits. A vertex with no neighbour is nan, as the mean of nothing is."""
    n = len(nbr)
    deg = np.array([len(x) for x in nbr], int)
    groups = []
    for dg in np.unique(deg):
        ids = np.where(deg == dg)[0]
        idx = np.array([nbr[i] for i in ids], int).reshape(len(ids), int(dg))
        groups.append((ids, idx, int(dg)))

    def f(A):
        M = np.empty((n, A.shape[1]))
        for ids, idx, dg in groups:
            if dg == 0:
                M[ids] = np.nan
                continue
            acc = A[idx[:, 0]]
            for j in range(1, dg):
                acc = acc + A[idx[:, j]]
            M[ids] = acc / dg
        return M
    return f


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


def smooth_junctions(body, ctx, iters=60, hops=8, lam=0.5, mu=-0.53, protect=None, only=None, keep_above=None, radius=None, extra_seeds=None):
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
    for v in (extra_seeds or []):
        seeds.append(int(v))
        if mirror[v] != v:
            seeds.append(int(mirror[v]))
    d = hops_from(nbr, seeds, hops)
    w = np.clip(1.0 - d / float(hops + 1), 0, 1) ** 1.0
    if radius is not None and len(seeds):            # pass 3: the reach is a distance in H, not a count of cage edges (a coarse cage's 8 hops reached the neck and fattened it from 0.40 to 0.50 H)
        S = V[np.array(seeds, int)]
        dd = np.sqrt(((V[:, None, :] - S[None]) ** 2).sum(2).min(1))
        w = np.minimum(w, np.clip(1.0 - dd / float(radius), 0, 1))
    fixed = np.zeros(len(V), bool)
    for v in (protect or []):
        fixed[v] = True
        if mirror[v] != v:
            fixed[mirror[v]] = True
    w[fixed] = 0.0
    if keep_above is not None:               # the head is shaped on purpose: the smoothing of an arm or leg junction never reaches into it (pass 3: it swelled the head from 1.28 H to 1.41 H wide)
        w[V[:, 2] > keep_above] = 0.0
    for cp in getattr(body, "caps", []):
        w[cp.ids] = 0.0
    for k, v in body.tag.items():            # toe beads are added later; tag vertices are never touched
        w[k] = 0.0
    cm = np.abs(V[:, 1]) < 1e-12
    A = V.copy()
    nmean = neighbour_mean(nbr)
    lonely = np.array([len(nb) == 0 for nb in nbr])
    for it in range(iters):
        for f in (lam, mu):
            M = nmean(A)
            if lonely.any():
                M[lonely] = A[lonely]
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


def tangential_relax(body, ctx, iters=6, step=0.5, region="torso", skip_hops=2, back_step=None):
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
    stepv = np.full(len(V), float(step))
    if back_step is not None:                                # the back's rings are long in the tail's direction and short round: the smoothing evens the edge lengths along the loft but widens the ratio round the ring (the spread of the circle's edges), so the back range takes a gentler step
        Gb = ctx["T"]
        lo_b, hi_b = Gb.ranges["back"]
        u_b = Gb.L - np.clip(attr[:, 1], 0, Gb.L)
        stepv[(u_b >= lo_b) & (u_b <= hi_b)] = float(back_step)
    cm = np.abs(V[:, 1]) < 1e-12
    nf = np.array(F, int)
    def edge_ratio(A):
        e = np.concatenate([np.linalg.norm(A[nf[:, k]] - A[nf[:, (k + 1) % 4]], axis=1) for k in range(4)])
        pa = pid[nf[:, 0]] == body.parts[region]
        e = np.concatenate([np.linalg.norm(A[nf[pa][:, k]] - A[nf[pa][:, (k + 1) % 4]], axis=1) for k in range(4)])
        return float(np.quantile(e, 0.99) / np.quantile(e, 0.01))
    r0 = edge_ratio(V)
    A = V.copy()
    nmean = neighbour_mean(nbr)
    for it in range(iters):
        fn = gltf_out.vertex_normals(A, nf)
        M = nmean(A)
        dl = M - A
        dl = dl - (dl * fn).sum(1, keepdims=True) * fn
        A = A + stepv[:, None] * free[:, None] * dl
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
