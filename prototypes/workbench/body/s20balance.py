"""Balance (owner rule, 1 Nov): the creature must not fall over. Centre of mass = the volume centroid of the closed level-2 mesh (uniform density; the lantern bulb and every shell count); its ground projection must fall inside the support polygon of the two soles,
at least 15 % of the sole length in front of the heel edge. Under a rest pose or a posed mesh."""
import numpy as np
import subdiv as SD


def centroid(V, F):
    """Volume centroid of a closed quad mesh (each quad split in two triangles), with the signed volume."""
    F = np.asarray(F, int)
    vol = 0.0
    c = np.zeros(3)
    for a, b, d in ((0, 1, 2), (0, 2, 3)):
        A, B, C = V[F[:, a]], V[F[:, b]], V[F[:, d]]
        v = np.einsum("ij,ij->i", A, np.cross(B, C)) / 6.0
        vol += v.sum()
        c += ((A + B + C) / 4.0 * v[:, None]).sum(0)
    return c / vol, float(vol)


def hull(P):
    P = sorted(set(map(tuple, np.round(P, 6))))
    if len(P) < 3:
        return np.array(P)
    def cr(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])


def inside_hull(H, p):
    n = len(H)
    return all((H[(i + 1) % n][0] - H[i][0]) * (p[1] - H[i][1]) - (H[(i + 1) % n][1] - H[i][1]) * (p[0] - H[i][0]) >= -1e-12 for i in range(n))


def measure(b, V2=None, F2=None, part2=None, z_sole=0.03):
    """dict(com, volume, heel_x, toe_x, sole_len, margin (com_x - heel_x) / sole_len, inside (the ground projection lies in the hull of both soles), hull)."""
    if V2 is None:
        Vf, Ff, at, fpp, cr, mir = b.full()
        V2, F2, _, a2, fp2 = SD.subdivide_body(b, Vf, Ff, cr, at, fpp, levels=2)
        F2 = np.array(F2, int)
        cnt = np.zeros((len(V2), len(b.parts) + 1))
        for k in range(4):
            np.add.at(cnt, (F2[:, k], np.asarray(fp2).astype(int)), 1.0)
        part2 = cnt.argmax(1)
    com, vol = centroid(V2, F2)
    leg = (part2 == b.parts["leg.L"]) & (V2[:, 2] < z_sole)
    left = V2[leg & (V2[:, 1] > 0)]
    sole_len = float(left[:, 0].max() - left[:, 0].min())
    P = V2[leg][:, :2]
    H = hull(P)
    heel = float(P[:, 0].min()); toe = float(P[:, 0].max())
    return dict(com=com, volume=vol, heel_x=heel, toe_x=toe, sole_len=sole_len, margin=float((com[0] - heel) / sole_len), inside=bool(inside_hull(H, com[:2])), hull=H)
