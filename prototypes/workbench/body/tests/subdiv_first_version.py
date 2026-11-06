"""The first version of subdiv._once (per-vertex and per-edge loops), kept as the reference the array form is tested against. Do not edit."""
import numpy as np

def subdivide_ref(V, F, creases=None, attr=None, fattr=None, levels=1):
    V = np.asarray(V, float)
    creases = dict(creases or {})
    for _ in range(levels):
        V, F, creases, attr, fattr = _once_ref(V, F, creases, attr, fattr)
    return V, F, creases, attr, fattr


def _once_ref(V, F, creases, attr, fattr):
    n, nf = len(V), len(F)
    Fa = np.array(F, int)
    fp = V[Fa].mean(1)                                 # face points
    # edges
    emap, elist, efaces = {}, [], []
    for fi in range(nf):
        f = Fa[fi]
        for k in range(4):
            a, b = int(f[k]), int(f[(k + 1) % 4])
            key = (a, b) if a < b else (b, a)
            if key not in emap:
                emap[key] = len(elist)
                elist.append(key)
                efaces.append([])
            efaces[emap[key]].append(fi)
    ne = len(elist)
    E = np.array(elist, int)
    sharp = np.array([creases.get(k, 0) for k in elist], float)
    ep = np.zeros((ne, 3))
    for ei, (a, b) in enumerate(elist):
        fs = efaces[ei]
        mid = 0.5 * (V[a] + V[b])
        if len(fs) == 2 and sharp[ei] < 1:
            sm = 0.25 * (V[a] + V[b] + fp[fs[0]] + fp[fs[1]])
            ep[ei] = sm
        else:
            ep[ei] = mid
    # vertex points
    vf = [[] for _ in range(n)]
    ve = [[] for _ in range(n)]
    for fi in range(nf):
        for i in Fa[fi]:
            vf[int(i)].append(fi)
    for ei, (a, b) in enumerate(elist):
        ve[a].append(ei)
        ve[b].append(ei)
    nv = np.zeros_like(V)
    for i in range(n):
        es = ve[i]
        sh = [e for e in es if sharp[e] >= 1 or len(efaces[e]) != 2]
        k = len(es)
        if len(sh) >= 3:
            nv[i] = V[i]
        elif len(sh) == 2:
            a, b = elist[sh[0]], elist[sh[1]]
            oa = a[0] if a[1] == i else a[1]
            ob = b[0] if b[1] == i else b[1]
            nv[i] = 0.125 * V[oa] + 0.125 * V[ob] + 0.75 * V[i]
        else:
            F_ = fp[vf[i]].mean(0)
            R = np.mean([0.5 * (V[elist[e][0]] + V[elist[e][1]]) for e in es], axis=0)
            nv[i] = (F_ + 2 * R + (k - 3) * V[i]) / k
    newV = np.vstack([nv, fp, ep])
    ofs_f, ofs_e = n, n + nf
    newF, newfa = [], []
    for fi in range(nf):
        f = Fa[fi]
        for k in range(4):
            a, b, d = int(f[k]), int(f[(k + 1) % 4]), int(f[(k - 1) % 4])
            e_ab = emap[(a, b) if a < b else (b, a)]
            e_da = emap[(d, a) if d < a else (a, d)]
            newF.append((a, ofs_e + e_ab, ofs_f + fi, ofs_e + e_da))
            if fattr is not None:
                newfa.append(fattr[fi])
    nc = {}
    for ei, (a, b) in enumerate(elist):
        s = creases.get((a, b), 0)
        if s >= 1 and s - 1 > 0:
            nc[(min(a, ofs_e + ei), max(a, ofs_e + ei))] = s - 1
            nc[(min(b, ofs_e + ei), max(b, ofs_e + ei))] = s - 1
        elif s >= 1 and s - 1 <= 0:
            pass
    nattr = None
    if attr is not None:
        attr = np.asarray(attr, float)
        fa = attr[Fa].mean(1)
        ea = 0.5 * (attr[E[:, 0]] + attr[E[:, 1]])
        nattr = np.vstack([attr, fa, ea])
    return newV, newF, nc, nattr, (np.array(newfa) if fattr is not None else None)
