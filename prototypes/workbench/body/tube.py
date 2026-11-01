"""The `tube` part kind (S20, chunk 3): a path grown from a socket patch on the loft, ending in a dome. Two flavours.
- lateral (ears): a full 8-ring from a 2 x 2 socket patch, like a limb (limbs.grow_limb without the foot): the patch dies, its 8-loop is pushed out and paired with the first ring that lies wholly outside the loft, through `transition` bands; 4 quads close the tip.
- centre (tail): a half 5-ring from a 1 x 2 patch on the mirror line (the spec's tail, s2.5): the patch's half loop of 5 vertices (two on the mirror) pairs with a half ring whose end vertices are on the mirror plane; 2 quads close the tip.
Rings follow the path (paths.Path: filleted, rotation-minimising frame, monotone radii); every vertex targets its own design position. The curl gene is clipped by the room rule (A s3.3 step 1), never the radius: `clip_curl`."""
import math
import numpy as np
import paths as PA

GAP = 0.08


def _path(p, joints_P, R, yaw, centre):
    if centre:
        return PA.Path(["j"] * len(joints_P), joints_P, R, p["fillet"], up=[0.0, 1.0, 0.0])
    h = np.array([math.cos(math.radians(yaw)), math.sin(math.radians(yaw)), 0.0])
    return PA.Path(["j"] * len(joints_P), joints_P, R, p["fillet"], start=h)


def clip_curl(joints, fillet=1.25, max_kr=0.8, step=0.98, plane_yaw=0.0):
    """The room rule: shrink the curl (every bend's pitch change after the first segment) until each fillet fits (tangent length <= room); the radius is never shrunk. Returns (joints', factor, report)."""
    js = [dict(j) for j in joints]
    base = [j["pitch"] for j in js[1:]]
    f = 1.0
    for _ in range(200):
        for k, j in enumerate(js[1:]):
            j["pitch"] = base[0] + (base[k] - base[0]) * f
        P = PA.fk(js[0]["at"], js, plane_yaw=plane_yaw)
        R = [j["r"] for j in js]
        _, rep = PA.fillet_path(P, R, fillet)
        if all(r["ok"] for r in rep):
            return js, f, rep
        f *= step
    return js, f, rep


def _outward(G, X, margin=0.02, step=0.01, n=40):
    """Lift a point out of the loft along the loft's own surface normal until it clears it by `margin` (a straight bridge between a patch on a convex surface and a ring in the air cuts through the surface: a slit)."""
    X = np.array(X, float)
    for _ in range(n):
        if not G.inside(X[None], margin=-margin)[0]:
            break
        e = 1e-3
        f = lambda Y: float((np.hypot(Y[0], Y[1]) - float(G.rho(np.clip(Y[2], G.ends[0], G.ends[1]), np.arccos(np.clip(-Y[0] / max(np.hypot(Y[0], Y[1]), 1e-9), -1, 1)) / np.pi))))
        g = np.array([(f(X + e * np.eye(3)[k]) - f(X - e * np.eye(3)[k])) / (2 * e) for k in range(3)])
        X = X + step * g / max(np.linalg.norm(g), 1e-12)
    return X


def grow_tube(body, ctx, name, p, fam, i, c, centre):
    """Grow one tube. p: the part; fam: the family dict (P, R, plane); (i, c): the loft ring index and column of the socket centre (lateral: the 2 x 2 patch around vertex (i, c); centre: rings i-1..i+1, columns 0..1)."""
    G = ctx["T"]
    cage = body.cage
    tf = ctx["info"]["torso"]["faces"]
    tr = ctx["info"]["torso"]["rings"]
    rec = dict(name=name, centre=centre)
    nR = 5 if centre else 8
    if centre:
        for key in ((i - 1, 0), (i, 0)):
            body.kill(tf[key])
        loop = [tr[i - 1][0], tr[i - 1][1], tr[i][1], tr[i + 1][1], tr[i + 1][0]]
    else:
        for key in ((i - 1, c - 1), (i - 1, c), (i, c - 1), (i, c)):
            body.kill(tf[key])
        loop = [tr[i - 1][c - 1], tr[i - 1][c], tr[i - 1][c + 1], tr[i][c + 1], tr[i + 1][c + 1], tr[i + 1][c], tr[i + 1][c - 1], tr[i][c - 1]]
    V0 = cage.arr()
    push = p["socket"].get("push", 0.02)
    for v in loop:
        pt, _, _, _ = G.path.at([body.s[v]])
        d = V0[v] - pt[0]
        d /= np.linalg.norm(d)
        cage.V[v] = (V0[v] + push * d).tolist()
        if body.target[v] is not None:
            body.target[v] = body.target[v] + push * d
    V0 = cage.arr()
    loopc = V0[loop].mean(0)
    P = np.array(fam["P"]); R = np.array(fam["R"])
    yaw = float(fam.get("plane", {}).get("yaw", 0.0)) if not centre else 0.0
    pa = _path(p, P, R, yaw, centre)
    rec["path"] = pa
    L = pa.length
    st = list(pa.stations(p["edge"]))
    # the first ring wholly outside the loft and clear of the loop by GAP along the path
    first = None
    ps = np.linspace(0, 2 * math.pi, 24, endpoint=False)
    for k, s in enumerate(st):
        pt, Tg, Nn, Bb = pa.at([s])
        ra, rf = pa.radii([s])[0]
        X = pt[0] + (rf * np.cos(ps))[:, None] * Nn[0] + (ra * np.sin(ps))[:, None] * Bb[0]
        if centre:
            X = X.copy(); X[:, 1] = np.abs(X[:, 1])
        below = (pt[0] - loopc) @ Tg[0] - ((V0[loop] - loopc) @ Tg[0]).max()
        if not G.inside(X, margin=-0.01).any() and below >= GAP:
            first = k
            break
    assert first is not None, f"{name}: no ring clears the loft"
    st = st[first:]
    # uniform ring spacing from the first ring to the tip (target `ring_gap`, default 0.11 H): rings bunched at joints and at the tip made edge ratios of 30+ and a collapsed tip
    gap = float(p.get("ring_gap", 0.11))
    n = max(2, int(round((L - st[0]) / gap)))
    st = list(np.linspace(st[0], L, n + 1))
    rec["first_s"], rec["rings_s"] = st[0], st
    # rings
    rings, info = [], []
    psi = (np.radians([90, 45, 0, -45, -90]) if centre else np.arange(8) * (2 * math.pi / 8))
    def ring_at(s, scale=1.0, shift=0.0):
        pt, Tg, Nn, Bb = pa.at([s])
        pt, Tg, Nn, Bb = pt[0], Tg[0], Nn[0], Bb[0]
        ra, rf = pa.radii([min(max(s, 0.0), L)])[0]
        X = pt + shift * Tg + (rf * scale * np.cos(psi))[:, None] * Nn + (ra * scale * np.sin(psi))[:, None] * Bb
        if centre:
            X[0, 1] = 0.0; X[-1, 1] = 0.0
        return X, dict(s=s, centre=pt + shift * Tg, N=Nn, B=Bb, T=Tg, ra=float(ra * scale), rf=float(rf * scale))
    for s in st:
        X, inf = ring_at(s)
        ids = [body.add(X[m], name, s, m / (nR - 1 if centre else nR), target=X[m], centre=(centre and m in (0, nR - 1))) for m in range(nR)]
        rings.append(ids); info.append(inf)
    # the tip: the last ring closed by 4 quads (2 on the half ring) round a centre vertex 0.85 of the tip radius beyond it; subdivision rounds it into the dome
    rt = max(info[-1]["ra"], info[-1]["rf"])
    Tg = info[-1]["T"]
    cvp = info[-1]["centre"] + (0.85 * rt) * Tg
    cv = body.add(cvp, name, L + rt, 0.0, target=None, centre=centre)      # no target: the limit surface of a 4-quad cap is a rounder, lower dome than its centre vertex, and a target would run the vertex out into a spike
    rec["rings"], rec["ringinfo"], rec["tip_centre"] = rings, info, cv
    # pair the loop with ring 0: the nearest cyclic pairing (lateral) or the nearest of the two orders (centre: the half ring's two mirror ends)
    Vn = cage.arr()
    best = None
    if centre:
        for d in (1, -1):
            cand = loop[::d]
            cost = sum(float(np.sum((Vn[cand[m]] - Vn[rings[0][m]]) ** 2)) for m in range(nR))
            if best is None or cost < best[0]:
                best = (cost, cand)
    else:
        for d in (1, -1):
            for sh in range(nR):
                cand = [loop[(d * m + sh) % nR] for m in range(nR)]
                cost = sum(float(np.sum((Vn[cand[m]] - Vn[rings[0][m]]) ** 2)) for m in range(nR))
                if best is None or cost < best[0]:
                    best = (cost, cand)
    loop = best[1]
    rec["loop"] = loop
    perim = lambda ids: sum(np.linalg.norm(Vn[ids[m]] - Vn[ids[(m + 1) % nR]]) for m in range(nR - (1 if centre else 0)))
    rec["perimeter_ratio"] = float(perim(rings[0]) / perim(loop))
    ntrans = int(p["socket"].get("transition", 0))
    prev, mids = loop, []
    for kk in range(1, ntrans + 1):
        t = kk / (ntrans + 1)
        pos = [_outward(G, (1 - t) * Vn[a] + t * Vn[b]) for a, b in zip(loop, rings[0])]
        if centre:
            pos[0][1] = 0.0; pos[-1][1] = 0.0
        mid = [body.add(pos[m], name, st[0], m / (nR - 1 if centre else nR), target=pos[m], centre=(centre and m in (0, nR - 1))) for m in range(nR)]
        mids.append(mid)
        _quads(body, prev, mid, name, centre)
        prev = mid
    rec["transition"] = mids
    _quads(body, prev, rings[0], name, centre)
    for a, b in zip(rings, rings[1:]):
        _quads(body, a, b, name, centre)
    last = rings[-1]
    if centre:
        body.face(last[0], last[1], last[2], cv, name)
        body.face(last[2], last[3], last[4], cv, name)
    else:
        for m in range(0, 8, 2):
            body.face(last[m], last[m + 1], last[(m + 2) % 8], cv, name)
    return rec


def _quads(body, a, b, name, centre):
    n = len(a)
    for m in range(n - 1 if centre else n):
        body.face(a[m], a[(m + 1) % n], b[(m + 1) % n], b[m], name)
