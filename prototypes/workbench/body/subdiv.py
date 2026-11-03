"""Catmull-Clark subdivision of a closed quad mesh with semi-sharp creases (integer sharpness, OpenSubdiv's Chaikin-less rule: an edge of sharpness sigma >= 1 is sharp at this level, sigma - 1 at the next),
carrying per-vertex float attributes (new points get the mean of their parents) and a per-face id. Pure numpy/python, float64, deterministic (no sets iterated).
V (n,3), F list of quads, creases {(i,j): sigma}, attr (n,k) or None, fattr (nf,) or None."""
import numpy as np


def subdivide(V, F, creases=None, attr=None, fattr=None, levels=1):
    V = np.asarray(V, float)
    creases = dict(creases or {})
    for _ in range(levels):
        V, F, creases, attr, fattr = _once(V, F, creases, attr, fattr)
    return V, F, creases, attr, fattr


def _once(V, F, creases, attr, fattr):
    """One Catmull-Clark step, in array form. Every sum is built in the order the per-vertex and per-edge loops of the first version met its terms (faces by index, edges by first sight, a vertex's edges by edge index),
    so the points are the same bits; a vertex that no face uses keeps the old per-vertex rule."""
    n, nf = len(V), len(F)
    Fa = np.array(F, int)
    fp = V[Fa].mean(1)                                 # face points
    # edges: numbered by the first face that meets them, in face order
    A = Fa.ravel()
    B = np.roll(Fa, -1, axis=1).ravel()
    lo, hi = np.minimum(A, B), np.maximum(A, B)
    code = lo.astype(np.int64) * n + hi
    uniq, first, inv = np.unique(code, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    order = np.argsort(first, kind="stable")
    rank = np.empty(len(uniq), int)
    rank[order] = np.arange(len(uniq))
    eid = rank[inv]                                    # edge number of (face, side k), side k = from corner k to corner k+1
    ne = len(uniq)
    ea, eb = lo[first[order]], hi[first[order]]
    E = np.stack([ea, eb], 1)
    cnt = np.bincount(eid, minlength=ne)
    pos = np.argsort(eid, kind="stable")               # the (face, side) pairs of each edge, in face order
    st = np.concatenate([[0], np.cumsum(cnt)[:-1]])
    two = cnt >= 2
    f0 = np.zeros(ne, int)
    f1 = np.zeros(ne, int)
    f0[:] = pos[st] // 4
    f1[two] = pos[st[two] + 1] // 4
    sharp = np.zeros(ne)
    if creases:
        ck = np.array([k for k in creases if k[0] < k[1]], int).reshape(-1, 2)
        if len(ck):
            cc = ck[:, 0].astype(np.int64) * n + ck[:, 1]
            at = np.searchsorted(uniq, cc)
            at = np.minimum(at, len(uniq) - 1)
            ok = uniq[at] == cc
            vals = np.array([float(creases[(int(a), int(b))]) for a, b in ck[ok]])
            sharp[rank[at[ok]]] = vals
    Va, Vb = V[ea], V[eb]
    mid = 0.5 * (Va + Vb)
    ep = mid.copy()
    smooth = (cnt == 2) & (sharp < 1)
    sm = 0.25 * (Va + Vb + fp[f0] + fp[f1])
    ep[smooth] = sm[smooth]
    # vertex points
    inc_v = np.concatenate([ea, eb])
    inc_e = np.concatenate([np.arange(ne), np.arange(ne)])
    o = np.lexsort((inc_e, inc_v))
    inc_v, inc_e = inc_v[o], inc_e[o]                  # each vertex's edges by edge number
    k_ = np.bincount(inc_v, minlength=n)
    kst = np.concatenate([[0], np.cumsum(k_)[:-1]])
    fvv = Fa.ravel()
    fo = np.argsort(fvv, kind="stable")
    vf_f = fo // 4                                     # each vertex's faces by face number
    kf_ = np.bincount(fvv, minlength=n)
    fst = np.concatenate([[0], np.cumsum(kf_)[:-1]])
    isharp = (sharp >= 1) | (cnt != 2)
    nsh = np.bincount(inc_v[isharp[inc_e]], minlength=n)
    nv = np.zeros_like(V)
    m3 = nsh >= 3
    nv[m3] = V[m3]
    m2 = (nsh == 2) & (k_ > 0)
    if m2.any():
        vs = np.where(m2)[0]
        sh_idx = np.where(isharp[inc_e])[0]            # positions in the sorted incidence list, vertex by vertex
        at = np.searchsorted(inc_v[sh_idx], vs)
        e1, e2 = inc_e[sh_idx[at]], inc_e[sh_idx[at + 1]]
        oa = np.where(eb[e1] == vs, ea[e1], eb[e1])
        ob = np.where(eb[e2] == vs, ea[e2], eb[e2])
        nv[vs] = 0.125 * V[oa] + 0.125 * V[ob] + 0.75 * V[vs]
    reg = (nsh < 2) & (k_ > 0) & (kf_ > 0)
    for k, kf in sorted(set(zip(k_[reg].tolist(), kf_[reg].tolist()))):
        vs = np.where(reg & (k_ == k) & (kf_ == kf))[0]
        Fs = fp[vf_f[fst[vs][:, None] + np.arange(kf)[None]]]            # (g, kf, 3), faces in order
        Ms = mid[inc_e[kst[vs][:, None] + np.arange(k)[None]]]           # (g, k, 3), edges in order
        F_, R = Fs[:, 0], Ms[:, 0]
        for j in range(1, kf):
            F_ = F_ + Fs[:, j]
        for j in range(1, k):
            R = R + Ms[:, j]
        F_, R = F_ / kf, R / k
        nv[vs] = (F_ + 2 * R + (k - 3) * V[vs]) / k
    for i in np.where(~(m3 | m2 | reg))[0]:            # a vertex that no edge or no face reaches: the first version's rule, warnings and all
        es = inc_e[kst[i]:kst[i] + k_[i]]
        vf_i = vf_f[fst[i]:fst[i] + kf_[i]]
        F_ = fp[vf_i].mean(0)
        R = np.mean([0.5 * (V[ea[e]] + V[eb[e]]) for e in es], axis=0)
        nv[i] = (F_ + 2 * R + (len(es) - 3) * V[i]) / len(es)
    newV = np.vstack([nv, fp, ep])
    ofs_f, ofs_e = n, n + nf
    eid4 = eid.reshape(nf, 4)
    rows = np.stack([Fa, ofs_e + eid4, np.broadcast_to((ofs_f + np.arange(nf))[:, None], (nf, 4)), ofs_e + np.roll(eid4, 1, axis=1)], 2).reshape(-1, 4)
    newF = [tuple(r) for r in rows.tolist()]
    nc = {}
    for ei in np.where(sharp > 1)[0].tolist():
        a, b = int(ea[ei]), int(eb[ei])
        s = creases[(a, b)]
        nc[(min(a, ofs_e + ei), max(a, ofs_e + ei))] = s - 1
        nc[(min(b, ofs_e + ei), max(b, ofs_e + ei))] = s - 1
    nattr = None
    if attr is not None:
        attr = np.asarray(attr, float)
        fa = attr[Fa].mean(1)
        ea_ = 0.5 * (attr[E[:, 0]] + attr[E[:, 1]])
        nattr = np.vstack([attr, fa, ea_])
    return newV, newF, nc, nattr, (np.repeat(np.asarray(fattr), 4) if fattr is not None else None)


def subdivide_body(b, V, F, creases, attr, fattr, levels=1):
    """`subdivide` for a built body: a part that declares `subdiv_offset` -1 (a closed shell on vertices of its own: the species file's whiskers and fangs) is subdivided one level less than the rest. The rest comes first in the result (faces and vertices in their
    old order), then the shells; every face of a level keeps its four children together, so a coarser level's faces refine into a finer one's by repetition. With no such part, or at level 0, it is `subdivide` itself."""
    shallow = {b.parts[n] for n, o in (getattr(b, "subdiv_offset", None) or {}).items() if o < 0 and n in b.parts}
    if not shallow or levels < 1:
        return subdivide(V, F, creases, attr, fattr, levels)
    V = np.asarray(V, float)
    fa = np.asarray(fattr).astype(int)
    sf = np.isin(fa, sorted(shallow))
    if not sf.any():
        return subdivide(V, F, creases, attr, fattr, levels)
    Fa = np.array(F, int)
    sv = np.zeros(len(V), bool)
    sv[np.unique(Fa[sf])] = True
    if (sv[np.unique(Fa[~sf])]).any():
        raise ValueError("a shell with subdiv_offset -1 shares a vertex with the rest of the cage")
    out = []
    for keep_f, keep_v, lv in ((~sf, ~sv, levels), (sf, sv, levels - 1)):
        remap = np.full(len(V), -1, int)
        remap[keep_v] = np.arange(int(keep_v.sum()))
        cr = {(int(remap[a]), int(remap[c])): s for (a, c), s in (creases or {}).items() if keep_v[a] and keep_v[c]}
        cr = {(min(a, c), max(a, c)): s for (a, c), s in cr.items()}
        out.append(subdivide(V[keep_v], remap[Fa[keep_f]], cr, None if attr is None else np.asarray(attr, float)[keep_v], fa[keep_f], lv))
    (V0, F0, c0, a0, f0), (V1, F1, c1, a1, f1) = out
    n0 = len(V0)
    F_ = list(F0) + [tuple(int(x) + n0 for x in f) for f in F1]
    c = dict(c0)
    c.update({(a + n0, b_ + n0): s for (a, b_), s in c1.items()})
    return (np.vstack([V0, V1]), F_, c, None if a0 is None else np.vstack([a0, a1]), np.concatenate([f0, f1]))
