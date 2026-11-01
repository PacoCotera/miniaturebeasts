"""Toe beads (body-spec s2.3): on each foot, three adjacent faces of the band above the support loop around the foot's forward axis (turned 14 deg outward) are inset and extruded 0.06 H,
each with a creased base. Added AFTER the limit fix (they sit on the fitted surface). The two vertices where adjacent beads meet have valence 6 (a deviation from the spec's all-valence-5, logged)."""
import numpy as np

INSET = 0.58
PROUD = 0.06
TURN = 14.0


def add_beads(body, ctx):
    cage = body.cage
    m = ctx["remap"]
    A = cage.arr()
    out = {}
    for name, rec in ctx["info"]["limbs"].items():
        up, lo = rec["rings"][rec["foot_band_ring"]], rec["rings"][rec["support_ring"]]
        up, lo = [m[v] for v in up], [m[v] for v in lo]
        n = len(up)
        centre = A[lo].mean(0)
        # the band's faces: (up[k], up[k+1], lo[k+1], lo[k]); find them in cage.F
        fidx = {}
        for fi, f in enumerate(cage.F):
            for k in range(n):
                if set(f) == {up[k], up[(k + 1) % n], lo[(k + 1) % n], lo[k]}:
                    fidx[k] = fi
        assert len(fidx) == n, (name, len(fidx))
        ang = {}
        for k, fi in fidx.items():
            cc = A[list(cage.F[fi])].mean(0)
            ang[k] = np.degrees(np.arctan2(cc[1] - centre[1], cc[0] - centre[0]))
        axis = TURN
        d = lambda k: abs((ang[k] - axis + 180) % 360 - 180)
        kc = min(ang, key=d)
        sel = [(kc - 1) % n, kc, (kc + 1) % n]
        beads = []
        for k in sel:
            fi = fidx[k]
            f = cage.F[fi]
            P = A[list(f)]
            cc = P.mean(0)
            nrm = np.cross(P[1] - P[0], P[2] - P[0]) + np.cross(P[2] - P[0], P[3] - P[0])
            nrm /= np.linalg.norm(nrm)
            out_h = np.array([cc[0] - centre[0], cc[1] - centre[1], 0.0])
            out_h /= np.linalg.norm(out_h)
            nrm = nrm * np.sign(nrm @ out_h)
            ins = [cage.add(cc + INSET * (p - cc)) for p in P]
            top = [cage.add(cc + INSET * (p - cc) + PROUD * nrm) for p in P]
            for v in ins + top:
                body.part.append(body.pid(name)); body.s.append(body.s[f[0]]); body.around.append(body.around[f[0]]); body.target.append(None)
            fp = body.face_part[fi]
            cage.F[fi] = (f[0], f[1], ins[1], ins[0])
            new = [(f[1], f[2], ins[2], ins[1]), (f[2], f[3], ins[3], ins[2]), (f[3], f[0], ins[0], ins[3])]
            new += [(ins[k], ins[(k + 1) % 4], top[(k + 1) % 4], top[k]) for k in range(4)]
            new += [tuple(top)]
            for q in new:
                cage.F.append(tuple(int(i) for i in q))
                body.face_part.append(fp)
            for k2 in range(4):
                cage.set_crease(ins[k2], ins[(k2 + 1) % 4], 2)
            beads.append(dict(face=k, ins=ins, top=top, centre_ang=float(ang[k])))
        out[name] = beads
    ctx["info"]["beads"] = out
    return out
