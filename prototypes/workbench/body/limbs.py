"""Limbs grown out of the torso (body-spec s2.3): a 2 x 2 socket patch at the lower edge of the mass is deleted, its 8-loop pushed out by `push` and bridged vertex i <-> i to the first ring
that lies wholly outside the torso's own section. Rings follow the path in a rotation-minimizing frame; the radii are the joints' (monotone cubic); the foot is a column with a
support loop 0.03 H over the floor and a flat 2 x 2 sole cap; the three toe beads are added after the limit fix (beads.py). Nothing is fitted to a field."""
import math
import numpy as np
import paths as PA

SOCKETS = {"fore.L": (6, 5), "hind.L": (1, 5)}      # (torso ring index, column) of the patch centre, from the column keys of torso.py
SUPPORT = 0.03
FOOT_BAND = 0.17      # height of the band above the support loop where the toe beads sit
GAP = 0.10
SUPPORT_R = 0.86
ROLL_FOOT = 8.5       # degrees of end roll that put a face centre on the foot's forward axis (turned 14 deg outward): logged, <= 15


def sm(a, b, x):
    t = min(max((x - a) / max(b - a, 1e-9), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def ring_points(P, N, B, ra, rf, psi):
    """Ring vertices: P + rf cos(psi) N + ra sin(psi) B, psi (n,) radians."""
    return P + (rf * np.cos(psi))[:, None] * N + (ra * np.sin(psi))[:, None] * B


def build_limbs(body, ctx):
    spec, T = ctx["spec"], ctx["T"]
    tf = ctx["info"]["torso"]["faces"]
    tr = ctx["info"]["torso"]["rings"]
    info = {}
    for name, (i, c) in SOCKETS.items():
        p = spec["parts"][name]
        info[name] = grow_limb(body, ctx, name, p, i, c, tf, tr)
    ctx["info"]["limbs"] = info


def grow_limb(body, ctx, name, p, i, c, tf, tr):
    T = ctx["T"]
    cage = body.cage
    rec = {}
    # ---- the socket: the 2 x 2 patch around torso vertex (i, c): its faces die, its 8-loop remains
    for key in ((i - 1, c - 1), (i - 1, c), (i, c - 1), (i, c)):
        body.kill(tf[key])
    loop = [tr[i - 1][c - 1], tr[i - 1][c], tr[i - 1][c + 1], tr[i][c + 1], tr[i + 1][c + 1], tr[i + 1][c], tr[i + 1][c - 1], tr[i][c - 1]]
    V0 = cage.arr()
    centre = V0[loop].mean(0)
    # push: outward along the torso's radial direction (the mass is already in the torso: 0.02 H)
    push = p["socket"].get("push", 0.02)
    for v in loop:
        sv = body.s[v]
        pt, _, _, _ = T.path.at([sv])
        d = V0[v] - pt[0]
        d /= np.linalg.norm(d)
        cage.V[v] = (V0[v] + push * d).tolist()
        if body.target[v] is not None:
            body.target[v] = body.target[v] + push * d
    rec["loop"] = loop
    # ---- the path
    P = np.array(p["P"]); R = np.array(p["R"])
    pa = PA.Path([j["name"] for j in p["joints"]], P, R, p["fillet"], start=[1.0, 0.0, 0.0])
    rec["path"] = pa
    L = pa.length
    st = list(pa.stations(p["edge"]))
    height = p["end"]["height"]
    FOOT_BAND = p["end"].get("band", globals()["FOOT_BAND"])      # S20's feet are 0.12 H (the file's end.band); Loika's 0.17
    forced = [L - SUPPORT, L - FOOT_BAND]
    st = [s for s in st if all(abs(s - f) > 0.05 for f in forced) and s < L - FOOT_BAND - 0.001 or False]
    st = sorted(set(st + forced))
    # the first ring wholly outside the torso: test 24 points round each ring
    first = None
    for k, s in enumerate(st):
        pt, Tg, Nn, Bb = pa.at([s])
        ra, rf = pa.radii([s])[0]
        ps = np.linspace(0, 2 * math.pi, 24, endpoint=False)
        X = ring_points(pt[0], Nn[0], Bb[0], ra, rf, ps)
        # wholly outside the torso AND below the loop by a gap (the band must have a height, or its quads are slivers)
        below = (pt[0] - centre) @ Tg[0] - ((V0[loop] - centre) @ Tg[0]).max()
        if not T.inside(X, margin=-0.01).any() and below >= p["socket"].get("gap", GAP):
            first = k
            break
    assert first is not None, f"{name}: no ring clears the torso"
    st = st[first:]
    rec["first_s"] = st[0]
    rec["rings_s"] = st
    # ---- the loop's angles in the first ring's frame; pair vertex i <-> i
    pt0, Tg0, N0, B0 = pa.at([st[0]])
    pt0, Tg0, N0, B0 = pt0[0], Tg0[0], N0[0], B0[0]
    rel = V0[loop] - centre
    rel = rel - np.outer(rel @ Tg0, Tg0)
    ang = np.arctan2(rel @ B0, rel @ N0)
    order = list(np.argsort(ang))
    k0 = int(np.argmin(np.abs(ang[order])))
    order = order[k0:] + order[:k0]
    if p["socket"].get("match") == "distance":
        order = list(range(len(loop)))          # S20: the loop keeps its own cyclic order on the loft (on a tilted ring its angles in the leg's frame are not a polygon); the nearest pairing below chooses the shift and direction
    loop = [loop[o] for o in order]
    rec["loop"] = loop
    rec["loop_psi"] = [float(ang[o]) for o in order]
    # ---- rings
    nR = 8
    rings, ringinfo = [], []
    s_first, s_foot = st[0], L - FOOT_BAND
    psi_off_end = math.radians(ROLL_FOOT)
    roll_log = []
    for k, s in enumerate(st):
        pt, Tg, Nn, Bb = pa.at([s])
        pt, Nn, Bb = pt[0], Nn[0], Bb[0]
        if s >= s_foot - 1e-9:
            Nn, Bb = np.array([1.0, 0, 0]), np.array([0, -1.0, 0])       # the foot's rings are level: a flat sole
        ra, rf = pa.radii([s])[0]
        if abs(s - (L - SUPPORT)) < 1e-6:
            ra, rf = ra * SUPPORT_R, rf * SUPPORT_R      # the sole's edge is rounded in the design surface (a sharp 90 degree corner cannot be carried by the cage)
        off = psi_off_end * sm(s_first, s_foot, s)
        psi = off + np.arange(nR) * (2 * math.pi / nR)
        X = ring_points(pt, Nn, Bb, ra, rf, psi)
        ids = [body.add(X[m], name, s, m / nR, target=X[m]) for m in range(nR)]
        rings.append(ids)
        ringinfo.append(dict(s=s, centre=pt, N=Nn, B=Bb, ra=float(ra), rf=float(rf), off=float(off)))
    rec["rings"], rec["ringinfo"] = rings, ringinfo
    rec["roll_total_deg"] = ROLL_FOOT
    match = p["socket"].get("match", "angle")
    # ---- the bridge: loop -> (transition) -> ring 0
    Vn = cage.arr()
    perim = lambda ids: sum(np.linalg.norm(Vn[ids[m]] - Vn[ids[(m + 1) % nR]]) for m in range(nR))
    ratio = perim(rings[0]) / perim(loop)
    rec["perimeter_ratio"] = float(ratio)
    prev = loop
    ntrans = int(p["socket"].get("transition", 0))
    if match == "distance":
        # S20: the loop sits on a near-vertical wall while the column leaves downward, so the loop's angles in the ring's frame are not a ring; pair each loop vertex with the ring vertex that keeps the cyclic order and the total distance least (shift and direction)
        best = None
        for d in (1, -1):
            for sh in range(nR):
                cand = [loop[(d * m + sh) % nR] for m in range(nR)]
                cost = sum(float(np.sum((Vn[cand[m]] - Vn[rings[0][m]]) ** 2)) for m in range(nR))
                if best is None or cost < best[0]:
                    best = (cost, cand)
        loop = best[1]
        rec["loop"] = loop
        prev = loop
    if ntrans or max(ratio, 1 / ratio) > 1.3:
        mids = []
        circle = p["socket"].get("profile") == "circle"
        if circle:
            cl, c0 = Vn[loop].mean(0), Vn[rings[0]].mean(0)
        for kk in range(1, max(ntrans, 1) + 1):
            t = kk / (max(ntrans, 1) + 1)
            if p["socket"].get("profile") == "extrude":
                # S20: the band first leaves the loft along its own outward normal (a collar of height `extrude`), then runs to the column's first ring: the loft faces round the loop and the first band no longer overlap
                ex = float(p["socket"].get("extrude", 0.1))
                if kk == 1:
                    nrm = []
                    for a in loop:
                        g = np.array([(float(T.d((Vn[a] + e)[None])[0]) - float(T.d((Vn[a] - e)[None])[0])) / 0.02 for e in 0.01 * np.eye(3)])
                        nrm.append(g / max(np.linalg.norm(g), 1e-9))
                    first = [Vn[a] + ex * nrm[i] for i, a in enumerate(loop)]
                    pos = first
                else:
                    u_ = (kk - 1) / max(ntrans, 1)
                    pos = [(1 - u_) * first[i] + u_ * Vn[b] for i, (a, b) in enumerate(zip(loop, rings[0]))]
            elif circle:
                # a fillet, not a straight blend: the band leaves the loft along its surface and turns into the column on a quarter circle (distance 1 - cos, size 1 - sin)
                ph = 0.5 * math.pi * t
                cu = cl + (c0 - cl) * (1 - math.cos(ph))
                pos = [cu + (Vn[b] - c0) + ((Vn[a] - cl) - (Vn[b] - c0)) * (1 - math.sin(ph)) for a, b in zip(loop, rings[0])]
            else:
                pos = [(1 - t) * Vn[a] + t * Vn[b] for a, b in zip(loop, rings[0])]
            if p["socket"].get("lift"):
                import tube as _tube
                pos = [_tube._outward(T, x, margin=float(p["socket"]["lift"])) for x in pos]       # S20: a transition vertex under the loft's skin makes the band fold back over it: lift it out along the loft's normal
            mids.append([body.add(pos[m], name, st[0], m / nR, target=pos[m]) for m in range(nR)])
        rec["transition"] = mids[0] if len(mids) == 1 else mids
        for mid in mids:
            for m in range(nR):
                body.face(prev[m], prev[(m + 1) % nR], mid[(m + 1) % nR], mid[m], name)
            prev = mid
    for m in range(nR):
        body.face(prev[m], prev[(m + 1) % nR], rings[0][(m + 1) % nR], rings[0][m], name)
    for a, b in zip(rings, rings[1:]):
        for m in range(nR):
            body.face(a[m], a[(m + 1) % nR], b[(m + 1) % nR], b[m], name)
    # ---- the flat sole: a centre vertex at z = 0 and 4 quads
    last = rings[-1]
    Vn = cage.arr()
    cen = Vn[last].mean(0)
    cen[2] = 0.0
    cv = body.add(cen, name, L, 1.0, target=cen)
    for m in range(0, nR, 2):
        body.face(last[m], last[(m + 1) % nR], last[(m + 2) % nR], cv, name)
    rec["sole_centre"] = cv
    rec["support_ring"] = len(rings) - 1
    rec["foot_band_ring"] = len(rings) - 2
    return rec
