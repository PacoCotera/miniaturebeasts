"""The S20 rig (chunk 6): a bone per path segment, weights from arc length, the stand pose, the waddle and the idle clips. Linear blend skinning in numpy (matrices may carry a scale for the breathe).
Bones: root, body (pivot at the belly), head (pivot at the waist, K above), leg.{upper,lower,foot}.{L,R}, tail.1-6 and tip, ear.{1,2}.{L,R}, arm.{L,R}.
Rotations are about each bone's head joint. Poses are world-space matrices per bone (parent chain applied)."""
import math
import numpy as np

SIDES = ("L", "R")


def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def rot(axis, theta, about):
    a = np.asarray(axis, float); a = a / np.linalg.norm(a)
    c, s = math.cos(theta), math.sin(theta)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    R = np.eye(3) * c + s * K + (1 - c) * np.outer(a, a)
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.asarray(about) - R @ np.asarray(about)
    return M


def trans(d):
    M = np.eye(4); M[:3, 3] = d
    return M


def scale_about(s, about):
    M = np.eye(4); M[:3, :3] *= s
    M[:3, 3] = np.asarray(about) * (1 - s)
    return M


SOCKET_R0, SOCKET_R1 = 0.35, 0.7
TF_A, TF_B = 0.19, 0.07


class Rig:
    def __init__(self, ctx):
        self.ctx = ctx
        spec = ctx["spec"]
        self.spec = spec
        self.bones, self.parent = {}, {}
        B, par = self.bones, self.parent
        def add(name, head, tail, parent):
            B[name] = (np.array(head, float), np.array(tail, float)); par[name] = parent
        zs = spec["parts"]["torso"]["regions"]
        self.waist = np.array([0.0, 0.0, spec["parts"]["torso"]["regions"]["body"][1]])
        self.K = np.array(spec["parts"]["torso"]["regions"]["K"], float)
        self.belly = np.array([0.0, 0.0, 0.62])
        add("root", (0, 0, 0), (0, 0, 0.3), None)
        add("body", self.belly, self.waist, "root")
        add("head", self.waist, self.K, "body")
        leg = np.array(spec["parts"]["leg.L"]["P"])
        self.leg_P = leg
        for side in SIDES:
            sg = 1 if side == "L" else -1
            Q = leg * np.array([1, sg, 1])
            add(f"leg.upper.{side}", Q[0], Q[1], "body")
            add(f"leg.lower.{side}", Q[1], Q[2], f"leg.upper.{side}")
            add(f"leg.foot.{side}", Q[2], Q[3], f"leg.lower.{side}")
        tail = np.array(spec["parts"]["tail"]["P"])
        self.tail_P = tail
        prev = "body"
        for k in range(len(tail) - 1):
            add(f"tail.{k + 1}", tail[k], tail[k + 1], prev)
            prev = f"tail.{k + 1}"
        d = tail[-1] - tail[-2]
        add("tip", tail[-1], tail[-1] + d / np.linalg.norm(d) * 0.2, prev)
        fam = ctx.get("ear_family", spec["parts"]["ear.L"]["default"])
        ef = spec["parts"]["ear.L"]["families"][fam]
        if ef.get("sit"):
            self.ear_P = None
        else:
            P = np.array(ef["P"]); self.ear_P = P
            for side in SIDES:
                sg = 1 if side == "L" else -1
                Q = P * np.array([1, sg, 1])
                add(f"ear.1.{side}", Q[0], Q[1], "head")
                add(f"ear.2.{side}", Q[1], Q[-1], f"ear.1.{side}")
        arm = ctx["info"]["sitting"]["arm.L"]
        for side in SIDES:
            sg = 1 if side == "L" else -1
            hd = arm["P"] * np.array([1, sg, 1]); tl = (np.asarray(arm["c"]) + np.asarray(arm["axis"]) * arm["r"][0]) * np.array([1, sg, 1])
            add(f"arm.{side}", hd, tl, "body")
        self.names = list(B)
        self.tail_pivot = np.array(spec["parts"]["tail"]["P"][0], float)      # the tail turns about its root joint (inside the body); a pivot on the loft swung the lantern too little
        self.curl = float(spec["parts"]["tail"].get("clip", {}).get("applied", 0.0))

    # ------------------------------------------------------------ weights
    def weights(self, V, attr, part):
        ctx = self.ctx
        names = self.names
        idx = {n: i for i, n in enumerate(names)}
        n = len(V)
        W = np.zeros((n, len(names)))
        pb = ctx["body_parts"]
        z = V[:, 2]
        side = np.where(V[:, 1] >= 0, "L", "R")
        s = attr[:, 1]
        sel = lambda nm: (part == pb[nm]) if nm in pb else np.zeros(n, bool)
        torso = sel("torso")
        G = ctx["T"]
        nt = len(self.tail_P)
        s_root = G.s_root                                   # arc length (from the stalk) of the tail root joint: the tail is the first range of the one loft
        t_body = sstep(s_root - 0.05, s_root + 0.35, s)       # 0 along the tail, 1 in the body
        wh = sstep(1.0, 1.4, z) * (s > s_root + 0.3)
        W[torso, idx["head"]] = (t_body * wh)[torso]
        W[torso, idx["body"]] = (t_body * (1 - wh))[torso]
        # the tail range: hat functions between the segments' middles along the arc length
        ja = np.array(G.js[:nt])[::-1]                         # joint arcs, root first
        mids_k = 0.5 * (ja[:-1] + ja[1:])                      # bone k = 1 .. nt - 1 (root to tip); arcs from the stalk, so bone 1 has the largest
        order = np.argsort(mids_k)                             # ascending arc = tip bone first
        mm = mids_k[order]
        sc = np.clip(s, 0, None)
        for r_, k in enumerate(order):
            lo = mm[r_ - 1] if r_ > 0 else -1e9
            hi = mm[r_ + 1] if r_ < len(mm) - 1 else 1e9
            w = np.where(sc < mm[r_], np.clip((sc - lo) / max(mm[r_] - lo, 1e-9), 0, 1) if r_ > 0 else 1.0, np.clip((hi - sc) / max(hi - mm[r_], 1e-9), 0, 1) if r_ < len(mm) - 1 else 1.0)
            W[torso, idx[f"tail.{k + 1}"]] = ((1 - t_body) * w)[torso]
        for nm in ("nose",):
            W[sel(nm), idx["head"]] = 1.0
        # legs
        leg = sel("leg.L")
        rec = ctx["info"]["limbs"]["leg.L"]
        Lleg = rec["path"].length
        tr = np.zeros(len(s))            # the leg part (the band and the column) is carried by the leg bones; the loft round the socket follows the thigh with a falling weight (below)
        tf = sstep(Lleg - TF_A, Lleg - TF_B, s)
        tf = np.maximum(tf, 1 - sstep(0.06, 0.11, z))            # the toe beads carry the first ring's arc length: every vertex on the foot band moves with the foot
        for sd in SIDES:
            m = leg & (side == sd)
            W[m, idx[f"leg.upper.{sd}"]] = ((1 - tr) * (1 - tf))[m]
            W[m, idx[f"leg.foot.{sd}"]] = ((1 - tr) * tf)[m]
            W[m, idx["body"]] += tr[m]
        # the belly skin round each leg's socket follows the upper-leg bone (the visible leg is only the short column under the loop, so a bone that moved it alone folded the band)
        lt = leg & (s <= float(rec["first_s"]) + 1e-6)
        for sd in SIDES:
            sgn = 1 if sd == "L" else -1
            lc = V[lt & (side == sd)].mean(0) if (lt & (side == sd)).any() else None
            if lc is None:
                continue
            d = np.linalg.norm(V - lc, axis=1)
            wl = (1 - sstep(SOCKET_R0, SOCKET_R1, d)) * (side == sd) * torso
            for nm in ("body", "head"):
                W[:, idx[nm]] *= (1 - wl)
            for nm in names:
                if nm.startswith("tail."):
                    W[:, idx[nm]] *= (1 - wl)
            W[:, idx[f"leg.upper.{sd}"]] += wl
        W[sel("tail.tip"), idx["tip"]] = 1.0
        # ears
        ear = sel("ear.L")
        if ear.any() and self.ear_P is not None:
            erec = ctx["info"]["tubes"]["ear.L"]
            ej = erec["path"].js
            t = sstep(ej[1] - 0.05, ej[1] + 0.12, s)
            rbe = 1 - sstep(erec["first_s"] - 0.02, erec["first_s"] + 0.1, s)
            for sd in SIDES:
                m = ear & (side == sd)
                W[m, idx[f"ear.1.{sd}"]] = ((1 - t) * (1 - rbe))[m]
                W[m, idx[f"ear.2.{sd}"]] = t[m] * (1 - rbe[m])
                W[m, idx["head"]] += rbe[m]
        arm = sel("arm.L")
        for sd in SIDES:
            m = arm & (side == sd)
            W[m, idx[f"arm.{sd}"]] = 1.0
        sm = W.sum(1)
        sm[sm == 0] = 1
        return W / sm[:, None]

    # ------------------------------------------------------------ poses
    def pose(self, body_roll=0.0, body_yaw=0.0, body_pitch=0.0, bob=0.0, breathe=0.0, head_nod=0.0, head_yaw=0.0, legs=None, tail_yaw=0.0, tail_sway=0.0, tail_pitch=0.0,
             ear=0.0, arm=0.0):
        B = self.bones
        M = {n: np.eye(4) for n in self.names}
        x = np.array([1.0, 0, 0]); y = np.array([0, 1.0, 0]); zz = np.array([0, 0, 1.0])
        piv = self.belly
        Mb = trans([0, 0, bob]) @ rot(zz, body_yaw, piv) @ rot(x, body_roll, piv) @ rot(y, body_pitch, piv) @ scale_about(1 + breathe, piv)
        M["body"] = Mb
        M["head"] = Mb @ rot(y, head_nod, B["head"][0]) @ rot(zz, head_yaw, B["head"][0])
        legs = legs or {}
        for sd in SIDES:
            dx, lift, pitch = legs.get(sd, (0.0, 0.0, 0.0))
            hip = B[f"leg.upper.{sd}"][0]
            ang = math.atan2(dx, max(hip[2] - 0.05, 0.2))
            Mu = Mb @ rot(y, -ang, hip)
            M[f"leg.upper.{sd}"] = Mu
            M[f"leg.lower.{sd}"] = Mu
            ank = B[f"leg.foot.{sd}"][0]
            # the column swings rigidly about the hip; the foot lifts and stays level in the world: it undoes the body's roll and pitch and the column's swing
            M[f"leg.foot.{sd}"] = trans([0, 0, lift]) @ Mu @ rot(y, ang, ank) @ rot(x, -body_roll, ank) @ rot(y, -pitch, ank)
        prev = Mb
        for k in range(1, len(self.tail_P)):
            hd = B[f"tail.{k}"][0]
            R = rot(zz, tail_yaw if k == 1 else 0.0, self.tail_pivot) @ rot(zz, tail_sway / (len(self.tail_P) - 1), hd) @ rot(y, tail_pitch / (len(self.tail_P) - 1), hd)
            prev = prev @ R
            M[f"tail.{k}"] = prev
        M["tip"] = prev
        for sd in SIDES:
            sg = 1 if sd == "L" else -1
            if f"ear.1.{sd}" in B:
                hd1, hd2 = B[f"ear.1.{sd}"][0], B[f"ear.2.{sd}"][0]
                M[f"ear.1.{sd}"] = M["head"] @ rot(x, sg * ear, hd1)
                M[f"ear.2.{sd}"] = M[f"ear.1.{sd}"] @ rot(x, sg * 0.7 * ear, hd2)
            M[f"arm.{sd}"] = Mb @ rot(y, arm, B[f"arm.{sd}"][0])
        return M

    def skin(self, V, W, M):
        Vh = np.hstack([V, np.ones((len(V), 1))])
        out = np.zeros_like(V)
        for i, n in enumerate(self.names):
            w = W[:, i]
            if w.any():
                out += w[:, None] * (Vh @ M[n].T)[:, :3]
        return out

    def stand_pose(self, toward=-1.0):
        """The tail yawed 44 degrees (plus 40 per turn of extra curl, up to 56; the file's 30 / 45 left the lantern half behind the head in the house view) toward the camera's side (+y is the creature's left: negative yaw about z swings the back-pointing tail toward +y), a 6 degree head tilt."""
        yaw = min(44.0 + 40.0 * max(self.curl, 0.0), 56.0)
        return self.pose(tail_yaw=math.radians(yaw) * toward, head_nod=math.radians(-3.0))

    # ------------------------------------------------------------ the waddle
    def waddle_pose(self, phase, A=0.07, duty=0.55, lift=0.06, roll=7.0, yaw=4.0, sway=6.0, period=0.9):
        """Two legs, diagonal-free: the legs alternate half a cycle apart; stance leads the foot back at constant speed, swing lifts it by `lift`; the body rolls over the stance foot; the tail counter-sways."""
        legs, st = {}, {}
        for sd, off in (("L", 0.0), ("R", 0.5)):
            u = (phase + off) % 1.0
            if u < duty:
                dx = A - 2 * A * u / duty; lf = 0.0; pp = 0.0; st[sd] = True
            else:
                w = (u - duty) / (1 - duty)
                dx = -A + 2 * A * w; lf = lift * math.sin(math.pi * w); pp = math.radians(10) * math.sin(math.pi * w); st[sd] = False
            legs[sd] = (dx, lf, pp)
        c = math.cos(2 * math.pi * phase); s_ = math.sin(2 * math.pi * phase)
        return self.pose(body_roll=-math.radians(roll) * s_, body_yaw=math.radians(yaw) * c, bob=0.012 * abs(s_), legs=legs, tail_yaw=-math.radians(38.0), tail_sway=math.radians(sway) * s_,
                         head_nod=math.radians(-3.0)), st


WALK_KEYS = (0.0, 0.25, 0.5, 0.75)
