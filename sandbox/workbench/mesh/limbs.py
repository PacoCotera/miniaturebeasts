"""Round 5, join C: the limbs extruded out of the torso's flank sockets along their paths (anatomy-lessons.md §3.3 and §4.1), one continuous quad surface with the torso.
Each leg: a 2 x 2 socket patch on the torso's lower flank (where the leg's axis leaves the torso) is deleted and its 8-vertex loop pushed out (the mound); a path runs from the socket along the leg's axis
(top, elbow height, ankle) into the paw's centre and down to the sole; rings are cut across the path in a rotation-minimizing frame (double reflection, Wang et al. 2008), vertex m of every ring at the same
angle as vertex m of the socket loop, so a band is never twisted; each ring vertex is cast out of the path to the house's leg-and-paw field (its radii: the mass, the elbow lump, the ankle, the paw dome); the
paw is the last rings of the same tube and ends in a flat 2 x 2 sole cap (no separate paw shell, no pole at a visible end). The far fore leg keeps the bake's forward shift (finish.far_leg_shift).
Path data by the house's names (lg['top'], lg['el_c'], lg['ank'], lg['paw_c'], lg['d_noToes']); the paths are smooth through their joints, not filleted polylines: the house's legs have no sharp bend."""
import math
import numpy as np
from cage import Cage, bisect_ray, ring_cap
from housefield import uround

SOLE_Z = 0.03          # H: the support loop above the floor
PUSH = 0.04            # H: the socket loop pushed out along the flank's normal (the mound)


def rmf(P):
    """Rotation-minimizing frames along the polyline P (double reflection): tangents T and normals N (unit), B = T x N."""
    T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    N = np.zeros_like(P)
    r = np.array([1.0, 0, 0]) - T[0] * T[0][0]; N[0] = r / np.linalg.norm(r)
    for i in range(len(P) - 1):
        v1 = P[i + 1] - P[i]; c1 = v1 @ v1
        rL = N[i] - (2 / c1) * (v1 @ N[i]) * v1; tL = T[i] - (2 / c1) * (v1 @ T[i]) * v1
        v2 = T[i + 1] - tL; c2 = v2 @ v2
        N[i + 1] = rL - (2 / c2) * (v2 @ rL) * v2 if c2 > 1e-14 else rL
        N[i + 1] -= T[i + 1] * (N[i + 1] @ T[i + 1]); N[i + 1] /= np.linalg.norm(N[i + 1])
    return T, N, np.cross(T, N)


def leg_path_z(lg, H):
    """The station heights, top to bottom, and the path point at each: the axis line from the socket to the ankle, then into the paw's centre and down to the sole."""
    top, ank, elz, pc = lg["top"], lg["ank"], lg["el_c"][2], lg["paw_c"]
    a = (ank - top) / np.linalg.norm(ank - top)
    E = bisect_ray(H.dTorso, top[None], a[None], 0, 1.2)[0]       # where the axis leaves the torso
    zs = [z for z in (E[2] - 0.05, elz, (elz + ank[2]) / 2, ank[2]) if z < E[2] - 0.02 and z >= ank[2] - 1e-9]
    zs = sorted(set(round(float(z), 4) for z in zs), reverse=True)
    zs = [z for i, z in enumerate(zs) if i == 0 or zs[i - 1] - z > 0.04]
    pz = lg["paw_R"] if False else None
    zeq = pc[2]
    zs += [ank[2] - 0.5 * (ank[2] - zeq) if ank[2] - zeq > 0.1 else None] if False else []
    zs += [z for z in (0.26, 0.2, 0.12, SOLE_Z) if z < zs[-1] - 0.03]
    def point(z):
        if z >= ank[2]:
            t = (top[2] - z) / (top[2] - ank[2])
            return top + (ank - top) * t
        w = (ank[2] - z) / (ank[2] - SOLE_Z); w = w * w * (3 - 2 * w)
        return np.array([ank[0] + (pc[0] - ank[0]) * w, ank[1] + (pc[1] - ank[1]) * w, z])
    return E, zs, np.array([point(z) for z in zs])


def attach_leg(C, T, H, lg, names, wover, pn_leg, pn_paw):
    """Cut the socket out of C (which holds T's vertices first), extrude the leg. Returns the list of rings (lists of vertex ids, the socket loop first)."""
    from join_b import port_ring
    E, zs, PZ = leg_path_z(lg, H)
    i0, k0, loop, rm, centre = port_ring(T, H, lg, st_k_target=E)
    rmset = {tuple(T.F[fi]) for fi in rm}
    C.F = [f for f in C.F if tuple(f) not in rmset]
    c0 = np.mean([C.V[i] for i in loop], axis=0)
    Pl = np.array([C.V[i] for i in loop])
    nrm = np.cross(Pl[2] - Pl[0], Pl[4] - Pl[2]); nrm /= np.linalg.norm(nrm)
    if nrm @ (c0 - np.array([c0[0], 0, c0[2]])) < 0:
        nrm = -nrm                                             # outward: away from the mirror plane
    for i in loop:
        C.V[i] = list(np.array(C.V[i]) + PUSH * nrm)          # the mound
    c0 = c0 + PUSH * nrm
    path = np.vstack([c0[None], PZ])
    Tn, Nn, Bn = rmf(path)
    # angles of the socket loop in the first frame; uniform 45 degree steps from the first vertex, in the loop's own sense
    q = np.array([C.V[i] for i in loop]) - c0
    th = np.arctan2(q @ Bn[0], q @ Nn[0])
    sense = np.sign(sum(math.sin(th[(m + 1) % 8] - th[m]) for m in range(8))) or 1.0
    ang = th[0] + sense * np.arange(8) * math.pi / 4
    rings = [list(loop)]
    off = len(C.V)
    fld = lg["d_noToes"]
    for j in range(1, len(path)):
        D = np.array([math.cos(a) * Nn[j] + math.sin(a) * Bn[j] for a in ang])
        P = bisect_ray(fld, np.tile(path[j], (8, 1)), D, 0, 0.9)
        rings.append([C.add(p) for p in P])
    for a, b in zip(rings, rings[1:]):
        for k in range(8):
            C.face(a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k])
    sole = rings[-1]
    for k in range(8):
        C.set_crease(sole[k], sole[(k + 1) % 8], 0.5)
    cap = ring_cap(C, sole[::-1], 2, lambda uv, P: uv)
    n_ank = sum(1 for z in zs if z >= lg["ank"][2] - 1e-9)       # rings 1..n_ank are the leg, the rest the paw
    for j, r in enumerate(rings[1:], 1):
        for v in r:
            names[v] = pn_leg if j <= n_ank else pn_paw
    for v in cap.values():
        if v >= off:
            names[v] = pn_paw
    # weights: the socket loop and the first rings graded from the trunk to the leg; the upper bone to the elbow's height, the lower below it, the paw bone from the ankle down
    tag, side = lg["name"].split("."); up, lo, pw = f"{tag}_upper.{side}", f"{tag}_lower.{side}", f"{tag}_paw.{side}"
    trunk = "chest" if lg["fore"] else "pelvis"
    elz = lg["el_c"][2]
    for j, r in enumerate(rings):
        z = path[j][2] if j else E[2]
        for v in r:
            if j == 0:
                wover[v] = {trunk: 0.9, up: 0.1}
            elif j == 1:
                wover[v] = {trunk: 0.5, up: 0.5}
            elif z < lg["ank"][2] - 1e-9:
                wover[v] = {pw: 1.0}
            else:
                u = float(np.clip((z - (elz - 0.08)) / 0.16, 0, 1)); u = u * u * (3 - 2 * u)
                wover[v] = {up: u, lo: 1 - u} if z > lg["ank"][2] + 1e-9 else {lo: 1.0}
    for v in cap.values():
        if v >= off:
            wover[v] = {pw: 1.0}
    return rings


def limbs_c(H, T, legs):
    """The torso T (unfitted) and the left legs joined into one cage 'torso' with every limb extruded from its socket. Returns (cage, field)."""
    C = Cage("torso")
    C.V = [list(v) for v in T.V]; C.F = list(T.F); C.rings = T.rings; C.wover = {}
    names = {i: "torso" for i in range(len(T.V))}
    C.legrings = {}
    for lg in legs:
        tag, side = lg["name"].split(".")
        C.legrings[lg["name"]] = attach_leg(C, T, H, lg, names, C.wover, "leg." + lg["name"], "paw." + lg["name"])
    m = C.compact()
    C.compact_map = m
    C.partnames = [None] * len(C.V)
    for o, n in m.items():
        C.partnames[n] = names.get(o, "torso")
    C.legrings = {k: [[m[i] for i in r] for r in v] for k, v in C.legrings.items()}
    C.fix_winding()
    flds = [lg["d_noToes"] for lg in legs]
    def fld(p):
        d = H.dTorso(p)
        for f in flds:
            d = uround(d, f(p), H.uB)
        return d
    return C, fld
