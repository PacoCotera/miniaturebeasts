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


def _ring_pts(pa, s, L, psi, fam, st0, centre=False):
    pt, Tg, Nn, Bb = pa.at([s])
    pt, Tg, Nn, Bb = pt[0], Tg[0], Nn[0], Bb[0]
    ra, rf = pa.radii([min(max(s, 0.0), L)])[0]
    X = pt + (rf * np.cos(psi))[:, None] * Nn + (ra * np.sin(psi))[:, None] * Bb
    cup = float(fam.get("cup", 0.0))
    if cup > 0 and not centre:
        fr = np.array([1.0, 0.0, 0.0])
        off = X - pt
        wgt = np.maximum(off @ fr / max(np.linalg.norm(off, axis=1).max(), 1e-9), 0.0) ** 2
        t_ = np.clip((s - st0) / max(L - st0, 1e-9), 0, 1)
        fade = np.sin(np.pi * np.clip(t_ * 1.15, 0, 1)) ** 0.8
        X = X - (cup * fade) * wgt[:, None] * (off / np.maximum(np.linalg.norm(off, axis=1, keepdims=True), 1e-9)) * np.maximum(np.linalg.norm(off, axis=1, keepdims=True) / max(np.linalg.norm(off, axis=1).max(), 1e-9), 0.5)
    return X, dict(s=s, centre=pt, N=Nn, B=Bb, T=Tg, ra=float(ra), rf=float(rf))


def grow_hard(body, ctx, name, p, fam):
    """A HARD join (framework rule, 2 Nov): a separate closed shell sunk into the parent. No blending: the loft is not cut, nothing is bridged; the shell has its own rounded base, buried at least BURY H inside the loft, and every vertex is tagged as a crease
    (tag 1: the normal test leaves the clean intersection line out). Same path, rings, cup and rounded tip as the soft tube."""
    G = ctx["T"]
    yaw = float(fam.get("plane", {}).get("yaw", 0.0))
    P = np.array(fam["P"]); R = np.array(fam["R"])
    pa = _path(p, P, R, yaw, False)
    L = pa.length
    bury = float(p["socket"].get("bury", 0.04))
    nR = 8
    psi = np.arange(nR) * (2 * math.pi / nR)
    st = list(pa.stations(p["edge"]))
    k0 = None
    for k, s in enumerate(st):                           # the last ring wholly buried by `bury` (true depth below the skin, G.depth), counting from the path's start
        X, inf = _ring_pts(pa, s, L, psi, fam, st[0])
        if float(G.depth(X).min()) >= bury:
            k0 = k
        elif k0 is not None or k > 0:
            break
    gap = float(p.get("ring_gap", 0.11))
    sink = 0.0
    if k0 is None:
        # no full-width ring is buried (a wide ear on a round head): the shell starts with its own small rounded base, two rings that swell from 0.45 and 0.75 of the section; the first is sunk back along the path (against its direction) until its true depth is `bury` everywhere
        s0 = st[0]
        ss = [s0, s0 + 0.06] + list(np.linspace(s0 + 0.12, L, max(2, int(round((L - s0 - 0.12) / gap))) + 1))
        scl = [0.45, 0.75] + [1.0] * (len(ss) - 2)
        X0, inf0 = _ring_pts(pa, s0, L, psi, fam, s0)
        for sink in np.arange(0.0, 0.40, 0.01):
            Xs = inf0["centre"] - sink * inf0["T"] + (X0 - inf0["centre"]) * 0.45
            if float(G.depth(Xs).min()) >= bury:
                break
    else:
        s0 = st[k0]
        n = max(2, int(round((L - s0) / gap)))
        ss = list(np.linspace(s0, L, n + 1))
        scl = [1.0] * len(ss)
    rings, info = [], []
    for s, sc_ in zip(ss, scl):
        X, inf = _ring_pts(pa, s, L, psi, fam, s0)
        X = inf["centre"] + (X - inf["centre"]) * sc_
        if k0 is None and len(rings) == 0:
            X = X - sink * inf["T"]
        ids = [body.add(X[m], name, s, m / nR, target=X[m]) for m in range(nR)]
        for v in ids:
            body.tag[v] = 1.0
        rings.append(ids); info.append(inf)
    for a, b_ in zip(rings, rings[1:]):
        for m in range(nR):
            body.face(a[m], a[(m + 1) % nR], b_[(m + 1) % nR], b_[m], name)
    # the rounded base (inside the parent) and the rounded tip
    for ring, inf, sgn in ((rings[0], info[0], -1), (rings[-1], info[-1], 1)):
        rt = max(inf["ra"], inf["rf"])
        apex = inf["centre"] + sgn * 0.85 * rt * inf["T"]
        if sgn < 0 and k0 is None:
            apex = apex - sink * inf["T"]
        v = body.add(apex, name, 0.0, 0.0, target=None)
        body.tag[v] = 1.0
        for m in range(0, nR, 2):
            body.face(ring[m], ring[(m + 1) % nR], ring[(m + 2) % nR], v, name)
        if sgn > 0:
            tipv = v
        else:
            basev = v
    return dict(name=name, centre=False, path=pa, first_s=s0, rings_s=ss, rings=rings, ringinfo=info, tip_centre=tipv, base_pole=basev, loop=[], transition=[], join="hard", hard=True, sink=float(sink))


def grow_tube(body, ctx, name, p, fam, i, c, centre):
    """Grow one tube. p: the part; fam: the family dict (P, R, plane); (i, c): the loft ring index and column of the socket centre (lateral: the 2 x 2 patch around vertex (i, c); centre: rings i-1..i+1, columns 0..1)."""
    if p["socket"].get("join") == "hard" and not centre:
        return grow_hard(body, ctx, name, p, fam)
    G = ctx["T"]
    cage = body.cage
    tf = ctx["info"]["torso"]["faces"]
    tr = ctx["info"]["torso"]["rings"]
    rec = dict(name=name, centre=centre, join="soft")
    nc = int(p["socket"].get("cols", [0, 1])[1]) if centre else 0          # centre tube: the patch covers columns 0 .. nc on the mirror
    kr = int(p["socket"].get("rows", 1)) if centre else 1                  # and rings i - kr .. i + kr (kr = 1: the first design's patch; 2: a tall root the size of the tail's first ring)
    nR = (2 * nc + 2 * kr + 1) if centre else 8
    if centre:
        for ci in range(nc):
            for ri in range(i - kr, i + kr):
                body.kill(tf[(ri, ci)])
        loop = [tr[i - kr][ci] for ci in range(nc + 1)] + [tr[ri][nc] for ri in range(i - kr + 1, i + kr + 1)] + [tr[i + kr][ci] for ci in range(nc - 1, -1, -1)]
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
    for frac_, gap_ in ((float(p["socket"].get("inside_frac", 0.0)), float(p["socket"].get("gap", GAP))), (0.25, 0.0), (0.5, 0.0)):     # relax the clearance in steps for an individual whose loft is a little rounder (the arm of a wider trunk)
        for k, s in enumerate(st):
            pt, Tg, Nn, Bb = pa.at([s])
            ra, rf = pa.radii([s])[0]
            X = pt[0] + (rf * np.cos(ps))[:, None] * Nn[0] + (ra * np.sin(ps))[:, None] * Bb[0]
            if centre:
                X = X.copy(); X[:, 1] = np.abs(X[:, 1])
            below = (pt[0] - loopc) @ Tg[0] - ((V0[loop] - loopc) @ Tg[0]).max()
            if float(G.inside(X, margin=-0.01).mean()) <= frac_ and below >= gap_:
                first = k
                break
        if first is not None:
            break
    if first is None:
        first = len(st) - 1
    st = st[first:]
    # uniform ring spacing from the first ring to the tip (target `ring_gap`, default 0.11 H): rings bunched at joints and at the tip made edge ratios of 30+ and a collapsed tip
    gap = float(p.get("ring_gap", 0.11))
    n = max(2, int(round((L - st[0]) / gap)))
    st = list(np.linspace(st[0], L, n + 1))
    rec["first_s"], rec["rings_s"] = st[0], st
    # rings
    rings, info = [], []
    psi = (np.radians(np.linspace(90, -90, nR)) if centre else np.arange(8) * (2 * math.pi / 8))
    def ring_at(s, scale=1.0, shift=0.0):
        pt, Tg, Nn, Bb = pa.at([s])
        pt, Tg, Nn, Bb = pt[0], Tg[0], Nn[0], Bb[0]
        ra, rf = pa.radii([min(max(s, 0.0), L)])[0]
        X = pt + shift * Tg + (rf * scale * np.cos(psi))[:, None] * Nn + (ra * scale * np.sin(psi))[:, None] * Bb
        cup = float(fam.get("cup", 0.0))
        if cup > 0 and not centre:
            # a cupped tube (the ear): the face toward the front is pressed in by `cup` H (at its deepest, in the middle of the tube, fading to nothing at the root and the tip), so the section is a crescent with a hollow inner face
            fr = np.array([1.0, 0.0, 0.0])
            off = X - (pt + shift * Tg)
            wgt = np.maximum(off @ fr / max(np.linalg.norm(off, axis=1).max(), 1e-9), 0.0) ** 2
            t_ = np.clip((s - st[0]) / max(L - st[0], 1e-9), 0, 1)
            fade = np.sin(np.pi * np.clip(t_ * 1.15, 0, 1)) ** 0.8
            X = X - (cup * fade) * wgt[:, None] * (off / np.maximum(np.linalg.norm(off, axis=1, keepdims=True), 1e-9)) * np.maximum(np.linalg.norm(off, axis=1, keepdims=True) / max(np.linalg.norm(off, axis=1).max(), 1e-9), 0.5)
        if centre:
            X[0, 1] = 0.0; X[-1, 1] = 0.0
        return X, dict(s=s, centre=pt + shift * Tg, N=Nn, B=Bb, T=Tg, ra=float(ra * scale), rf=float(rf * scale))
    for s in st:
        X, inf = ring_at(s)
        ids = [body.add(X[m], name, s, m / (nR - 1 if centre else nR), target=X[m], centre=(centre and m in (0, nR - 1))) for m in range(nR)]
        rings.append(ids); info.append(inf)
    # the tip: the last ring closed by 4 quads (2 on the half ring) round a centre vertex 0.85 of the tip radius beyond it; subdivision rounds it into the dome
    rt = max(info[-1]["ra"], info[-1]["rf"])
    trs = float(p.get("end", {}).get("tip_ring_rows", 0.0))
    if trs > 0 and not centre:
        # a rounder dome (pass 2): one more ring, shrunk to `tip_ring` of the radius and set 0.6 of it beyond the last, before the 4-quad cap (the 4-quad cap alone turns the normal 25-30 degrees across one face at level 2)
        tr_ = float(p["end"].get("tip_ring", 0.6))
        X2, inf2 = ring_at(L, scale=tr_, shift=0.55 * rt)
        ids2 = [body.add(X2[m], name, L + 0.55 * rt, m / nR, target=X2[m]) for m in range(nR)]
        rings.append(ids2); info.append(inf2)
        rt = max(inf2["ra"], inf2["rf"])
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
        raw = np.array([(1 - t) * Vn[a] + t * Vn[b] for a, b in zip(loop, rings[0])])
        flare = float(p["socket"].get("flare", 0.0))
        if flare > 0:
            # a fillet, not a plug: the transition rings flare wider than the straight blend (most at the loft, none at the first ring), so the band leaves the loft along its surface and turns into the tube
            cl = 0.5 * (Vn[loop[0]] + Vn[loop[-1]]) if centre else Vn[loop].mean(0)
            c0 = np.array(info[0]["centre"])
            cu = (1 - t) * cl + t * c0
            raw = cu + (raw - cu) * (1 + flare * (1 - t) ** 2)
        pos = [_outward(G, raw[m]) for m in range(len(raw))]
        if centre:
            pos[0][1] = 0.0; pos[-1][1] = 0.0
        mid = [body.add(pos[m], name, st[0] - 0.04 * (kk), m / (nR - 1 if centre else nR), target=pos[m], centre=(centre and m in (0, nR - 1))) for m in range(nR)]
        mids.append(mid)
        _quads(body, prev, mid, name, centre)
        prev = mid
    rec["transition"] = mids
    _quads(body, prev, rings[0], name, centre)
    for a, b in zip(rings, rings[1:]):
        _quads(body, a, b, name, centre)
    last = rings[-1]
    if centre:
        for k0 in range(0, nR - 2, 2):
            body.face(last[k0], last[k0 + 1], last[k0 + 2], cv, name)
    else:
        for m in range(0, 8, 2):
            body.face(last[m], last[m + 1], last[(m + 2) % 8], cv, name)
    return rec


def _quads(body, a, b, name, centre):
    n = len(a)
    for m in range(n - 1 if centre else n):
        body.face(a[m], a[(m + 1) % n], b[(m + 1) % n], b[m], name)
