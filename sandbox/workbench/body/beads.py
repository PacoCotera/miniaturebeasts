"""Toe beads (body-spec s2.3): on each foot, three adjacent faces of the band above the support loop around the foot's forward axis (turned 14 deg outward) are inset and extruded 0.06 H,
each with a creased base. Added AFTER the limit fix (they sit on the fitted surface). The two vertices where adjacent beads meet have valence 6 (a deviation from the spec's all-valence-5, logged)."""
import numpy as np

INSET = 0.58
PROUD = 0.06
TURN = 14.0


def _bead_hook(corners, ins, top, out_h):
    def hook(body):
        A = body.cage.arr()
        P = A[corners]
        cc = P.mean(0)
        nrm = np.cross(P[1] - P[0], P[2] - P[0]) + np.cross(P[2] - P[0], P[3] - P[0])
        nrm /= np.linalg.norm(nrm)
        nrm = nrm * np.sign(nrm @ out_h)
        for k in range(4):
            A[ins[k]] = cc + INSET * (P[k] - cc)
            A[top[k]] = cc + INSET * (P[k] - cc) + PROUD * nrm
        body.cage.set_arr(A)
    return hook


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
                body.tag[v] = 1.0
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
            body.hooks.append(_bead_hook(list(f), ins, top, out_h))
        out[name] = beads
    ctx["info"]["beads"] = out
    return out


# ---------------------------------------------------------------------------------------------------- pass 3: the toes as separate hard shells
TOE = dict(a_out=0.072, a_tan=0.056, a_z=0.05, delta=30.0, rim=-0.02, grow=1.16, rings_phi=(50.0, 130.0))


def _toe_geometry(A, lo, centre_v, turn, delta):
    """The three toe frames of one foot from the support ring's current positions: centre (x, y) of the foot, its mean radius at the ground, and for each toe the outward unit vector u, the tangent t. The toes sit on the ground (z), evenly spaced by `delta` degrees about the foot's axis, which is turned `turn` degrees outward: symmetric about it."""
    P = A[lo]
    c = P.mean(0)
    cxy = c[:2]
    r0 = float(np.linalg.norm(P[:, :2] - cxy, axis=1).mean())
    out = []
    for k in (-1, 0, 1):
        th = np.radians(turn + k * delta)
        u = np.array([np.cos(th), np.sin(th), 0.0])
        t = np.array([-np.sin(th), np.cos(th), 0.0])
        out.append((u, t))
    return cxy, r0, out


def _toe_positions(cxy, r0, frames, a_out, a_tan, a_z, grow, phis, rim):
    """Cage vertices of each toe shell: outer apex, ring 1, ring 2, inner apex (8 around the radial axis), in an ellipsoid a_out x a_tan x a_z sitting on the ground (z = a_z) with its centre at the foot's rim radius + rim; the cage is grown by `grow` (a coarse closed shell's limit surface is smaller than its cage)."""
    out = []
    for u, t in frames:
        c = np.array([cxy[0], cxy[1], a_z]) + (r0 + rim) * u
        zz = np.array([0.0, 0.0, 1.0])
        pts = [c + grow * a_out * u]
        for phi in phis:
            ph = np.radians(phi)
            for m in range(8):
                psi = 2 * np.pi * m / 8
                pts.append(c + grow * (a_out * np.cos(ph) * u + np.sin(ph) * (a_tan * np.cos(psi) * t + a_z * np.sin(psi) * zz)))
        pts.append(c - grow * a_out * u)
        out.append(np.array(pts))
    return out


def add_toe_shells(body, ctx, **kw):
    """Three toe beads per foot as separate closed hard shells (framework rule: a hard join is a shell sunk into its parent with a clean intersection line, tagged as a crease). Regular (the same ellipsoid, 8 around, two rings and two apexes, 18 cage vertices),
    evenly spaced (delta degrees apart), symmetric about the foot's axis, resting on the ground. They follow the foot through the later cage passes by a hook. ctx['info']['beads'][limb] lists each toe's `ins` (the buried half) and `top` (the proud half) vertex ids, and ctx['info']['toes'] the frames for the UV and the colour."""
    P_ = {**TOE, **kw}
    cage = body.cage
    m = ctx["remap"]
    A = cage.arr()
    spec_end = {nm: ctx["spec"]["parts"][nm].get("end", {}) for nm in ctx["info"]["limbs"]}
    beads, toes = {}, {}
    for name, rec in ctx["info"]["limbs"].items():
        e = spec_end[name]
        lo = [m[v] for v in rec["rings"][rec["support_ring"]]]
        turn = float(e.get("turn", 10.0)) if e.get("toe_turn") is None else float(e["toe_turn"])
        cxy, r0, frames = _toe_geometry(A, lo, None, turn, P_["delta"])
        pos = _toe_positions(cxy, r0, frames, P_["a_out"], P_["a_tan"], P_["a_z"], P_["grow"], P_["rings_phi"], P_["rim"])
        pid = body.pid(name)
        recs = []
        for ti, pts in enumerate(pos):
            ids = []
            for p in pts:
                v = cage.add(p)
                body.tag[v] = 1.0
                body.part.append(pid); body.s.append(-1.0); body.around.append(0.0); body.target.append(None)
                ids.append(v)
            apex_o, r1, r2, apex_i = ids[0], ids[1:9], ids[9:17], ids[17]
            faces = [(r1[k], r1[(k + 1) % 8], r2[(k + 1) % 8], r2[k]) for k in range(8)]
            faces += [(apex_o, r1[(k + 2) % 8], r1[(k + 1) % 8], r1[k]) for k in range(0, 8, 2)]
            faces += [(apex_i, r2[k], r2[(k + 1) % 8], r2[(k + 2) % 8]) for k in range(0, 8, 2)]
            # orient: the shell's signed volume must be positive
            Vv = cage.arr()
            vol = 0.0
            cen = Vv[ids].mean(0)
            for f in faces:
                a, b_, c_, d_ = (Vv[i] - cen for i in f)
                vol += float(np.dot(a, np.cross(b_, c_)) + np.dot(a, np.cross(c_, d_)))
            if vol < 0:
                faces = [tuple(f[::-1]) for f in faces]
            for f in faces:
                cage.F.append(tuple(int(i) for i in f))
                body.face_part.append(pid)
            recs.append(dict(face=ti, ins=r2 + [apex_i], top=r1 + [apex_o], ids=ids))
        def hook(body, lo=lo, recs=recs, turn=turn, P_=P_):
            A2 = body.cage.arr()
            cxy2, r02, fr2 = _toe_geometry(A2, lo, None, turn, P_["delta"])
            pos2 = _toe_positions(cxy2, r02, fr2, P_["a_out"], P_["a_tan"], P_["a_z"], P_["grow"], P_["rings_phi"], P_["rim"])
            for rc, pp in zip(recs, pos2):
                A2[rc["ids"]] = pp
            body.cage.set_arr(A2)
        body.hooks.append(hook)
        beads[name] = recs
        toes[name] = dict(frames=[(u.tolist(), t.tolist()) for u, t in frames], cxy=[float(x) for x in cxy], r0=r0, a=(P_["a_out"], P_["a_tan"], P_["a_z"]))
    ctx["info"]["beads"] = beads
    ctx["info"]["toes"] = toes
    return beads
