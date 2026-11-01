"""Join option B on the near fore shoulder (design §7): one cage. The torso's fore port (2 x 2 faces on the flank) is deleted; its 8-vertex ring is the leg's first ring;
two level, evenly spaced bridge loops run from it to the leg's mass ring; the whole is fitted to the union field uRound(torso, leg column, union-body).
(The jaw's option B is not built: see report.)"""
import math
import numpy as np
from cage import Cage, fit, bisect_ray
from housefield import uround


def port_ring(T, H, lg, st_k_target=None):
    """The 2 x 2 face port nearest the fore leg's top on the flank: returns (centre station i, column k, the 8 boundary vertices in loop order, the 4 faces)."""
    target = np.array([lg["top"][0], lg["top"][1], lg["top"][2] - 0.05])
    best = None
    for i in range(1, 8):
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


def shoulder_b(H, T, L, lg, bridges=2):
    """Returns a combined Cage (torso + near fore leg, one shell), fitted. T is the (unfitted or fitted) torso, L the leg cage (rings L0..L5, caps)."""
    i0, k0, loop, rm, centre = port_ring(T, H, lg)
    C = Cage("torso")
    C.V = [list(v) for v in T.V]
    C.F = [f for fi, f in enumerate(T.F) if fi not in set(rm)]
    C.rings = T.rings
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
    C.bridge = rings
    # weights: the leg rings as in join A; the bridges half chest, half upper leg; the torso by x
    tag, side = lg["name"].split(".")
    up, lo = f"{tag}_upper.{side}", f"{tag}_lower.{side}"
    ring_w = {"L1": (1, 0), "L2": (0.85, 0.15), "L3": (0.5, 0.5), "L4": (0, 1), "L5": (0, 1)}
    C.wover = {}
    for rn, ids in L.rings.items():
        if rn in ring_w:
            for i in ids:
                C.wover[i + off] = {up: ring_w[rn][0], lo: ring_w[rn][1]}
    for i in L.cap_bottom.values():
        C.wover.setdefault(i + off, {lo: 1.0})
    for r in rings[1:-1]:
        for v in r:
            C.wover[v] = {"chest": 0.5, up: 0.5}
    for v in pl:
        C.wover[v] = {"chest": 0.5, up: 0.5}
    C.compact_map = C.compact()
    C.fix_winding()
    fld = lambda p: uround(H.dTorso(p), lg["d_column"](p), H.uB)
    return C, fld
