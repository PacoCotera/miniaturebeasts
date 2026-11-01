"""Join option B on the near fore shoulder (design §7): one cage. The torso's fore port (2 x 2 faces on the flank) is deleted; its 8-vertex ring is the leg's first ring;
two level, evenly spaced bridge loops run from it to the leg's mass ring; the whole is fitted to the union field uRound(torso, leg column, union-body).
(The jaw's option B is not built: see report.)"""
import math
import numpy as np
from cage import Cage, fit, bisect_ray
from housefield import uround

LEG_SAG = 0.012      # [mesh] H: measured on the evaluated surface of round 2's cage, mean -0.006 and as far as -0.03 H at the elbow and the ankle (report.json, leg_field)


def port_ring(T, H, lg, st_k_target=None):
    """The 2 x 2 face port nearest the fore leg's top on the flank: returns (centre station i, column k, the 8 boundary vertices in loop order, the 4 faces)."""
    target = np.array([lg["top"][0], lg["top"][1], lg["top"][2] - 0.05])
    best = None
    for i in range(1, len(T.rings) - 1):
        ring = T.rings[f"st{i}"]
        for k in range(2, 7):
            d = np.linalg.norm(np.array(T.V[ring[k]]) - target)
            if best is None or d < best[0]:
                best = (d, i, k)
    _, i0, k0 = best
    g = lambda i, k: T.rings[f"st{i}"][k]
    loop = [g(i0 - 1, k0 - 1), g(i0 - 1, k0), g(i0 - 1, k0 + 1), g(i0, k0 + 1), g(i0 + 1, k0 + 1), g(i0 + 1, k0), g(i0 + 1, k0 - 1), g(i0, k0 - 1)]
    inside = {g(a, b) for a in (i0 - 1, i0, i0 + 1) for b in (k0 - 1, k0, k0 + 1)}
    faces = [fi for fi, f in enumerate(T.F) if set(f) <= inside]
    assert len(faces) == 4, len(faces)
    return i0, k0, loop, faces, g(i0, k0)


def _attach(C, T, H, L, lg, bridges):
    """Cut the leg's port out of C (which holds T's vertices first), bring in the leg cage L and bridge the port ring to the leg's first ring. Returns the bridge loops."""
    i0, k0, loop, rm, centre = port_ring(T, H, lg)
    rmset = {tuple(T.F[fi]) for fi in rm}
    C.F = [f for f in C.F if tuple(f) not in rmset]
    off = len(C.V)
    C.V += [list(v) for v in L.V]
    l0, top_cap = set(L.rings["L0"]), set(L.cap_top.values()) - set(L.rings["L0"])
    for f in L.F:
        if set(f) & (l0 | top_cap):
            continue
        C.F.append(tuple(i + off for i in f))
    L1 = [i + off for i in L.rings["L1"]]
    # order both rings by azimuth about the leg's axis, then align cyclically
    c1 = np.mean([C.V[i] for i in L1], axis=0)
    # the port ring lies on the flank (a vertical plane): its angle is taken in the (x, z) plane, front 0, top +90; the leg's L1 ring lies in a horizontal plane:
    # its azimuth about the leg axis is front 0, outer (+y) +90. The port's top is the leg's inner side and its bottom the leg's outer side, so phi = -theta
    pcen = np.mean([C.V[i] for i in loop], axis=0)
    th = lambda v: math.atan2(v[2] - pcen[2], v[0] - pcen[0])
    az = lambda v: -math.atan2(v[1] - c1[1], v[0] - c1[0])
    pl = sorted(loop, key=lambda i: th(C.V[i]))
    ll = sorted(L1, key=lambda i: az(C.V[i]))
    # the bridge is the shortest one: try every cyclic shift of the leg ring, both ways round, and keep the least total squared length
    cands = []
    for rev in (False, True):
        base = ll[::-1] if rev else ll
        for sft in range(8):
            cand = [base[(k + sft) % 8] for k in range(8)]
            cands.append((sum(float(np.sum((np.array(C.V[pl[k]]) - np.array(C.V[cand[k]])) ** 2)) for k in range(8)), cand))
    ll = min(cands, key=lambda c: c[0])[1]
    rings = [pl]
    for b in range(1, bridges + 1):
        t = b / (bridges + 1)
        rings.append([C.add(np.array(C.V[pl[k]]) * (1 - t) + np.array(C.V[ll[k]]) * t) for k in range(8)])
    rings.append(ll)
    for a, b in zip(rings, rings[1:]):
        for k in range(8):
            C.face(a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k])
    # weights: the leg rings as in join A; the bridge loops graded from the trunk bone (chest, or pelvis for a hind leg) out to the upper leg, evenly (round 2: the round-1 loops
    # were 0.5 / 0.5 each, which left a crack at the port's front edge when the leg swings)
    tag, side = lg["name"].split(".")
    up, lo = f"{tag}_upper.{side}", f"{tag}_lower.{side}"
    trunk = "chest" if lg["fore"] else "pelvis"
    ring_w = {"L1": (1, 0), "L2": (0.85, 0.15), "L3": (0.5, 0.5), "L4": (0, 1), "L5": (0, 1)}
    for rn, ids in L.rings.items():
        if rn in ring_w:
            for i in ids:
                C.wover[i + off] = {up: ring_w[rn][0], lo: ring_w[rn][1]}
    for i in L.cap_bottom.values():
        C.wover.setdefault(i + off, {lo: 1.0})
    n = len(rings) - 1
    for r, wt in zip(rings[:-1], [0.1 + 0.8 * (b / n) for b in range(n)]):     # 0.1 at the port, 0.9 just before the leg's first ring: evenly up the bridge
        for v in r:
            C.wover[v] = {trunk: 1 - wt, up: wt}
    return rings


def shoulders_b(H, T, legs, bridges=3):
    """Returns a combined Cage (torso + the given legs, one shell), fitted by the caller to the returned field. T is the unfitted torso, `legs` a list of (leg cage, lg)."""
    C = Cage("torso")
    C.V = [list(v) for v in T.V]
    C.F = list(T.F)
    C.rings = T.rings
    C.wover = {}
    C.bridges = []
    names = ["torso"] * len(T.V)      # round 5: which cage part each vertex came from (the _PART attribute of the glb)
    for L, lg in legs:
        a = len(C.V)
        C.bridges.append(_attach(C, T, H, L, lg, bridges))
        names += ["leg." + lg["name"]] * len(L.V) + ["bridge." + lg["name"]] * (len(C.V) - a - len(L.V))
    C.compact_map = C.compact()
    C.partnames = [None] * len(C.V)
    for o, n in C.compact_map.items():
        C.partnames[n] = names[o]
    C.fix_winding()
    flds = [lg["d_column"] for _, lg in legs]
    infl = LEG_SAG      # round 3 (AD item 13, legs): the 8-point rings' limit surface sags inside the field between its vertices; the legs are fitted this far outside it so the surface lies on it
    def fld(p):
        d = H.dTorso(p)
        for f in flds:
            d = uround(d, f(p) - infl, H.uB)
        return d
    return C, fld


def shoulder_b(H, T, L, lg, bridges=3):
    return shoulders_b(H, T, [(L, lg)], bridges)


