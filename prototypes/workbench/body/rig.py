"""The rig (body-spec s5): a bone per path segment, weights from the arc length, the stand pose from the house numbers, the walk by two-link IK on each leg (diagonal pairs, duty 0.6, lift 0.08 H), breathe.
Skinning here is linear blend (numpy, for the tests and the walk key poses); the glb carries the same weights for the viewer. Rotations are about the lateral axis y through each bone's head joint."""
import math
import numpy as np

LIMB_BONES = ("upper", "lower", "paw")
SIDES = ("L", "R")


def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def rot_y(theta, about):
    """4x4: rotation by theta (rad) about +y through the point `about`. Positive theta takes +x toward -z."""
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.asarray(about) - R @ np.asarray(about)
    return M


def rot_x(theta, about):
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.asarray(about) - R @ np.asarray(about)
    return M


def rot_z(theta, about):
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.asarray(about) - R @ np.asarray(about)
    return M


class Rig:
    def __init__(self, ctx):
        spec, H = ctx["spec"], ctx["H"]
        self.ctx = ctx
        self.limb = {}
        for name in ("fore.L", "hind.L"):
            p = spec["parts"][name]
            P = np.array(p["P"])
            pa = ctx["info"]["limbs"][name]["path"]
            self.limb[name.split(".")[0]] = dict(P=P, js=pa.js, L=pa.length, r=np.array(p["R"]), first=ctx["info"]["limbs"][name]["first_s"])
        hd = ctx["info"]["head"]
        self.kc = H.kc
        self.neck_base = np.array(hd["ringinfo"][0]["centre"])
        self.bones = {}
        self.parent = {}
        self._build()

    def _build(self):
        B, par = self.bones, self.parent
        def add(name, head, tail, parent):
            B[name] = (np.array(head, float), np.array(tail, float)); par[name] = parent
        add("root", (-0.6, 0, 0.5), (-0.6, 0, 0.9), None)
        add("spine.pelvis", (-1.5, 0, 0.92), (-0.85, 0, 0.95), "root")
        add("spine.chest", (-0.85, 0, 0.95), (-0.2, 0, 1.0), "spine.chest" if False else "spine.pelvis")
        add("neck", self.neck_base, self.kc, "spine.chest")
        add("head", self.kc, self.kc + np.array([0, 0, 0.5]), "neck")
        for kind, pbone in (("fore", "spine.chest"), ("hind", "spine.pelvis")):
            L = self.limb[kind]
            P = L["P"]
            for side in SIDES:
                sg = 1 if side == "L" else -1
                Q = P * np.array([1, sg, 1])
                add(f"{kind}.upper.{side}", Q[0], Q[1], pbone)
                add(f"{kind}.lower.{side}", Q[1], Q[2], f"{kind}.upper.{side}")
                add(f"{kind}.paw.{side}", Q[2], Q[3], f"{kind}.lower.{side}")

    # ---------------------------------------------------------------- weights on any mesh with attr (part, s, around) and positions
    def weights(self, V, attr):
        """(n, nb) weights, bone order = list(self.bones). part ids come from body.parts (ctx['body_parts'])."""
        names = list(self.bones)
        idx = {n: i for i, n in enumerate(names)}
        n = len(V)
        W = np.zeros((n, len(names)))
        parts = self.ctx["body_parts"]
        pid = np.rint(attr[:, 0]).astype(int)
        s = attr[:, 1]
        x = V[:, 0]
        torso = pid == parts["torso"]
        wp = 1 - smooth(-1.15, -0.55, x)
        W[torso, idx["spine.pelvis"]] = wp[torso]
        W[torso, idx["spine.chest"]] = 1 - wp[torso]
        for pn in ("head", "muzzle", "nose", "chin", "crown"):
            if pn not in parts:
                continue
            m = pid == parts[pn]
            if pn == "head":
                wh = smooth(-0.1, 0.45, s[m])
                W[m, idx["head"]] = wh
                W[m, idx["neck"]] = 0.0
                W[m, idx["spine.chest"]] = 1 - wh
            else:
                W[m, idx["head"]] = 1.0
        for kind in ("fore", "hind"):
            m0 = pid == parts[f"{kind}.L"]
            L = self.limb[kind]
            js, r = L["js"], L["r"]
            for side in SIDES:
                m = m0 & ((V[:, 1] >= 0) if side == "L" else (V[:, 1] < 0))
                ss = s[m]
                # blend: between upper/lower at the knee (joint 1), lower/paw at the ankle (joint 2); the first rings blend from the trunk
                half1, half2 = 0.6 * max(r[1]), 0.6 * max(r[2])
                t1 = smooth(js[1] - half1, js[1] + half1, ss)
                t2 = smooth(js[2] - half2, js[2] + half2, ss)
                wu, wl, wpw = (1 - t1), t1 * (1 - t2), t2
                tr = 1 - smooth(L["first"] - 0.15, L["first"] + 0.10, ss)        # the socket and the first rings follow the trunk partly
                pb = "spine.chest" if kind == "fore" else "spine.pelvis"
                W[np.where(m)[0], idx[f"{kind}.upper.{side}"]] = wu * (1 - 0.6 * tr)
                W[np.where(m)[0], idx[f"{kind}.lower.{side}"]] = wl
                W[np.where(m)[0], idx[f"{kind}.paw.{side}"]] = wpw
                W[np.where(m)[0], idx[pb]] += wu * 0.6 * tr
        sm = W.sum(1)
        sm[sm == 0] = 1
        return W / sm[:, None]

    # ---------------------------------------------------------------- poses
    def rest_dirs(self, kind):
        P = self.limb[kind]["P"]
        return [math.atan2(P[i + 1][2] - P[i][2], P[i + 1][0] - P[i][0]) for i in range(3)]

    def ik_leg(self, kind, dx, lift, paw_pitch=0.0):
        """Two-link IK for the chain root -> elbow(knee) -> wrist(hock) with the sole at its rest position + (dx, lift), the paw level (plus paw_pitch rad). Returns absolute direction angles of upper, lower, paw
        (planar, from +x), keeping the rest bend side of each joint."""
        L = self.limb[kind]
        P = L["P"]
        R = P[0][[0, 2]]
        W0 = P[2][[0, 2]]
        S0 = P[3][[0, 2]]
        Wt = W0 + np.array([dx, lift])
        l1 = np.linalg.norm(P[1] - P[0]); l2 = np.linalg.norm(P[2] - P[1])
        d = np.linalg.norm(Wt - R)
        d = np.clip(d, abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3)
        base = math.atan2(Wt[1] - R[1], Wt[0] - R[0])
        ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
        a = math.acos(np.clip(ca, -1, 1))
        rest = self.rest_dirs(kind)
        bend_sign = np.sign(math.sin(rest[1] - rest[0]))
        # for a positive rest bend (the lower link turns CCW from the upper) the elbow lies to the right of the chord root -> wrist
        a1 = base - (a if bend_sign > 0 else -a)
        E = R + l1 * np.array([math.cos(a1), math.sin(a1)])
        a2 = math.atan2(Wt[1] - E[1], Wt[0] - E[0])
        sw = np.sign(math.sin(rest[2] - rest[1]))
        pa = rest[2] + paw_pitch
        if sw * math.sin(pa - a2) < math.sin(math.radians(3)):      # the wrist's apex keeps its side (at least 3 degrees of bend): the paw yields a few degrees to the shin
            pa = a2 + sw * math.radians(3)
        return [a1, a2, pa]

    def pose(self, legs, head_yaw=0.0, head_roll=0.0, spine=(0.0, 0.0)):
        """legs: {('fore','L'): (dx, lift, paw_pitch)...}. Returns {bone: 4x4 world-space bone transform}."""
        M = {n: np.eye(4) for n in self.bones}
        M["spine.pelvis"] = rot_y(spine[0], self.bones["spine.pelvis"][0])
        M["spine.chest"] = M["spine.pelvis"] @ rot_y(spine[1], self.bones["spine.chest"][0])
        M["neck"] = M["spine.chest"]
        h = self.bones["head"][0]
        M["head"] = M["neck"] @ rot_z(head_yaw, self.neck_base) @ rot_x(head_roll, h)
        for kind in ("fore", "hind"):
            rest = self.rest_dirs(kind)
            for side in SIDES:
                dx, lift, pp = legs.get((kind, side), (0.0, 0.0, 0.0))
                a = self.ik_leg(kind, dx, lift, pp)
                P = self.limb[kind]["P"] * np.array([1, 1 if side == "L" else -1, 1])
                par = "spine.chest" if kind == "fore" else "spine.pelvis"
                th = [-(a[i] - rest[i]) for i in range(3)]
                Mu = M[par] @ rot_y(th[0], P[0])
                Ml = Mu @ rot_y(th[1] - th[0], P[1])
                Mp = Ml @ rot_y(th[2] - th[1], P[2])
                M[f"{kind}.upper.{side}"], M[f"{kind}.lower.{side}"], M[f"{kind}.paw.{side}"] = Mu, Ml, Mp
        return M

    def skin(self, V, W, M):
        names = list(self.bones)
        Vh = np.hstack([V, np.ones((len(V), 1))])
        out = np.zeros_like(V)
        for i, n in enumerate(names):
            w = W[:, i]
            if not w.any():
                continue
            out += w[:, None] * (Vh @ M[n].T)[:, :3]
        return out

    # ---------------------------------------------------------------- the stand pose (house numbers) and the walk
    def stand_pose(self):
        H = self.ctx["H"]
        S = H.S
        far = min(H.rig["fore"]["far-forward"] * S, 0.15)      # the house's 0.3 S (0.64 H) leaves a dark slab far ahead of the body in this cage: capped at 0.36 H (logged)
        lean = H.rig["fore"]["far-lean"] * S
        lead = H.rig["lead-paw"] * S
        legs = {("fore", "L"): (lead, 0.0, 0.0), ("fore", "R"): (far - lean * 0.0, 0.0, 0.0)}
        return self.pose(legs, head_yaw=math.radians(H.pose["headYawSigned"]), head_roll=math.radians(H.pose["rollSigned"]))

    def walk_pose(self, phase, A=0.12, duty=0.6, lift=0.08):
        legs = {}
        offs = {("fore", "L"): 0.0, ("hind", "R"): 0.0, ("fore", "R"): 0.5, ("hind", "L"): 0.5}
        info = {}
        for key, off in offs.items():
            u = (phase + off) % 1.0
            if u < duty:
                dx = A - 2 * A * u / duty; lf = 0.0; pp = 0.0; stance = True
            else:
                w = (u - duty) / (1 - duty)
                dx = -A + 2 * A * w; lf = lift * math.sin(math.pi * w); pp = math.radians(14) * math.sin(math.pi * w); stance = False
            legs[key] = (dx, lf, pp)
            info[key] = stance
        sp = 0.03 * math.sin(2 * math.pi * phase)
        return self.pose(legs, spine=(sp, -sp)), info


WALK_KEYS = (0.0, 0.25, 0.5, 0.75)
