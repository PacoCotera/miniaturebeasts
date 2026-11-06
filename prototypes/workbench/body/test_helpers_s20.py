"""Measurements shared by the S20 tests and sheets."""
import numpy as np
import s20measure as M, mquality as Q, spine as SP


def rings_full(b):
    V, F, attr, fp = Q.full_topology(b)
    m = b.ctx["remap"]
    n0 = len(b.cage.V)
    extra = [i for i in range(n0) if abs(V[i][1]) > 1e-12]
    mirror = {e: n0 + k for k, e in enumerate(extra)}
    out = []
    for r in b.ctx["info"]["torso"]["rings"]:
        ids = [m[v] for v in r if v in m]
        out.append(ids + [mirror[i] for i in ids if i in mirror])
    return V, out


def ring_ratio(b):
    V, rings = rings_full(b)
    return M.ring_ratio_frames(V, rings, b.ctx["info"]["torso"]["ring_info"])


def crown_curv(b, V2):
    zs = b.ctx["spec"]["parts"]["torso"]["rings_z"]
    zt, zp = zs[-1], zs[-2]
    m = np.abs(V2[:, 1]) < 1e-9
    P = V2[m][:, [0, 2]]
    P = P[P[:, 1] > 1.7]
    c = np.array([0, 1.75])
    P = P[np.argsort(np.arctan2(P[:, 1] - c[1], P[:, 0] - c[0]))]
    k = M.curvatures(P)
    Pm = P[1:-1]
    return float(k[Pm[:, 1] >= zt + 0.04].mean()), float(k[(Pm[:, 1] >= zp) & (Pm[:, 1] < zt + 0.04)].mean())


def stalk_band_poles(b):
    """The poles of the stalk band (V5, on since V8): {half-mesh id: (kind, valence)} for the vertices that turn 16 columns into 8, at each end of the stalk. A ring of 5 half columns sits next to a ring of 9 with an all-quad band of three quads to each 4 columns; its poles are the big ring's column 2 and 6 (valence 3) and the small ring's column 1 and 3 (valence 5), 4 per band per half, 16 on the whole body with the two bands the type has.
    Strict on what may be a band: the 5-column rings are exactly the rings the species file's thin rule picks (`spine.thin_rings`), every one lies in the tail range (not past the root), each differs from its neighbours only by a band to a ring of 9. Nothing else in the loft may have fewer than 9 columns."""
    ctx = b.ctx
    info = ctx["info"]["torso"]
    G = ctx["T"]
    m = ctx["remap"]
    rings = info["rings"]
    flags = SP.thin_rings(G, info["ring_s"])
    assert [len(r) == 5 for r in rings] == list(flags), "the 5-column rings are not the rings the thin rule picks"
    assert all(len(r) in (5, 9) for r in rings)
    assert all(info["ring_s"][i] <= G.s_root for i, r in enumerate(rings) if len(r) == 5), "a 5-column ring past the tail's root"
    poles = {}
    for i in range(len(rings) - 1):
        lo, hi = rings[i], rings[i + 1]
        if len(lo) == len(hi):
            continue
        big, small = (lo, hi) if len(lo) == 9 else (hi, lo)
        for c in (2, 6):
            poles[m[big[c]]] = ("band-big", 3)
        for c in (1, 3):
            poles[m[small[c]]] = ("band-small", 5)
    return poles


def classify_poles(b, V, F):
    """Name every vertex of valence != 4 (full mesh). Returns {vertex: kind} and the set of unlisted ones. The stalk band's poles are listed only at their own valence (3 on the big ring, 5 on the small one)."""
    ctx = b.ctx
    m = ctx["remap"]
    n0 = len(b.cage.V)
    val = Q.valence(F, len(V))
    listed = {}
    cage = b.cage
    for cp in b.caps:
        for k, v in cp.G.items():
            if k in ((cp.na, 0), (cp.na, cp.nb)):
                listed[v] = "cap-corner"
    for name, rec in ctx["info"]["limbs"].items():
        for v in rec["loop"]:
            listed[m[v]] = "socket"
        last = rec["rings"][-1]
        for k in range(0, 8, 2):
            listed[m[last[k]]] = "sole-corner"
    for rec in ctx["info"].get("tubes", {}).values():             # pass 3: a hard-join shell (the ears, the arms) is a closed shell: its rings and two poles are its own corners
        if rec.get("hard"):
            for ring in rec["rings"]:
                for v in ring:
                    if v in m:
                        listed[m[v]] = "hard-shell"
            for k_ in ("tip_centre", "base_pole"):
                if rec.get(k_) in m:
                    listed[m[rec[k_]]] = "hard-shell pole"
    bead_ids = set()
    for name, bl in ctx["info"].get("beads", {}).items():
        for bd in bl:
            bead_ids.update(bd["ins"] + bd["top"])
            for v in bd["ins"]:
                listed[v] = "bead-base"
            for v in bd["top"]:
                listed[v] = "bead-top"
    # the original corners of the beaded faces (valence 5 or 6)
    for name, rec in ctx["info"]["limbs"].items():
        up, lo = rec["rings"][rec["foot_band_ring"]], rec["rings"][rec["support_ring"]]
        for v in up + lo:
            listed[m[v]] = listed.get(m[v], "bead-corner")
    band = stalk_band_poles(b)
    unl = set()
    for v in range(len(V)):
        if val[v] != 4:
            half = v if v < n0 else None
            # mirrored copies: map back through the mirror order (copies appended in the same order as the non-centre half vertices)
            base = v
            if v >= n0:
                extra = [i for i in range(n0) if abs(V[i][1]) > 1e-12]
                base = extra[v - n0]
            if base not in listed:
                if not (base in band and val[v] == band[base][1]):            # each copy is checked at its own valence
                    unl.add(v)
    return val, listed, unl

