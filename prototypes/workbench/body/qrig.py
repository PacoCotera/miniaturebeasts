"""The quadruped's rig and clips (chunk 20), Blender-free numpy. A bone for each part of the plan's skeleton (the front block on the chest girdle, the rear block on the pelvis girdle, the head on the neck's base, three tail bones, and three bones to each leg), weights from the cage's own arc lengths, and linear blend skinning.
A pose is a handful of numbers (`Pose`): where the chest and pelvis joints stand (x, z) and how each block is pitched, the head's pitch, the tail's three pitches, and for each foot where its sole stands (x, z) and the toe's pitch. A leg is solved by two-link IK from its root to the sole's target with the paw kept level (so the sole is flat on any
floor contact) and each joint keeping the side its `apex` names. The tail stays in the x-z plane: the midline, in every pose. Rotations are about the lateral axis y.
Clips: `walk` (a four-beat lateral-sequence walk: hind left, fore left, hind right, fore right a quarter of the cycle apart, each foot on the ground for three quarters of it and in the air for one, lifting and landing), `breathe` (the chest and the belly only), `sit`, `curl`. `clip_pose(name, phase)` -> Pose; `skin_pose(rig, pose)` -> the posed vertices.
Units are H; z is up; the half model is y >= 0 and the mesh the mirrored whole."""
import math
from dataclasses import dataclass, field

import numpy as np

import quadruped as Q

KINDS = ("fore", "hind")
SIDES = ("L", "R")
FEET = (("hind", "L"), ("fore", "L"), ("hind", "R"), ("fore", "R"))          # the four-beat order of a lateral-sequence walk
FOLLOW = 0.20                                                                # how far below its first ring a leg keeps following its girdle (H of the leg's arc)
WALK_DUTY = 0.75                                                              # the share of the cycle a foot is on the ground: three feet are down at once, never fewer than two
WALK_HALF_STRIDE = 0.10                                                       # the sole's reach each side of its rest place (H)
WALK_LIFT = 0.08                                                              # the height a foot clears the ground in the middle of its swing (H)
WALK_CROUCH = 0.07                                                            # how far the body lowers for the walk (H)
WALK_TOE = math.radians(8.0)                                                 # the toe's pitch at the middle of a swing (the paw rolls up as the foot leaves and down as it lands)
BREATHE_AMP = 0.035                                                           # the chest's and belly's displacement at full inhale (H)
FRAMES = {"walk": 12, "breathe": 6, "sit": 1, "curl": 1}
PERIOD = {"walk": 1.8, "breathe": 3.0, "sit": 1.0, "curl": 1.0}


def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rot_y(theta, about):
    """4x4 rotation by theta (rad) about +y through `about`: positive theta takes +x toward -z (a nose-up pitch is negative)."""
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.asarray(about, float) - R @ np.asarray(about, float)
    return M


def shift(d):
    M = np.eye(4)
    M[:3, 3] = d
    return M


@dataclass
class Pose:
    """chest, pelvis: (x, z, pitch) of the two girdle joints (rad, positive = the front of the block drops). head: pitch about the neck's base. tail: pitches of the three bones, added to the rest (positive = the tip rises).
    feet: {(kind, side): (x, z, toe)}: where the sole's centre stands in the x-z plane and the paw's pitch; absent = the rest place, flat. breath: 0..1."""
    chest: tuple = None
    pelvis: tuple = None
    head: float = 0.0
    tail: tuple = (0.0, 0.0, 0.0)
    feet: dict = field(default_factory=dict)
    breath: float = 0.0
    name: str = ""


class QRig:
    def __init__(self, body, V, attr, part):
        """body: the built cage (quadruped.build); V, attr: the mesh to pose (level 1 or 2 of the whole body: vertex positions and (part, s, around, tag))."""
        self.body = body
        ctx = body.ctx
        self.doc, self.p = ctx["spec"], ctx["params"]
        self.sk = Q.skeleton(self.doc, self.p)
        J = self.sk["joints"]
        self.J = J
        self.V0 = np.asarray(V, float)
        self.attr = np.asarray(attr, float)
        self.part = np.asarray(part, int)                         # the part of each vertex: the one most of its faces belong to (the subdivision averages part ids on a vertex between two parts)
        self.parts = ctx["body_parts"]
        self.limbs = ctx["info"]["limbs"]
        self.chest0, self.pelvis0 = J["chest"].copy(), J["pelvis"].copy()
        self.neck0 = J["neck.base"].copy()
        self.tail0 = [J["tail.root"].copy()] + [J[f"tail.{s['name']}"].copy() for s in self.doc["spine"]["tail"]["segments"]]
        self.leg = {}
        for kind in KINDS:
            for side in SIDES:
                sg = 1.0 if side == "L" else -1.0
                P = np.array(self.limbs[f"{kind}.L"]["P"], float) * np.array([1.0, sg, 1.0])
                apex = [j.get("apex") for j in Q.limb_parts(self.doc, self.p)[f"{kind}.L"]["joints"]]
                self.leg[(kind, side)] = dict(P=P, l1=float(np.linalg.norm(P[1] - P[0])), l2=float(np.linalg.norm(P[2] - P[1])), paw=P[3] - P[2], apex=apex)
        self.W, self.bones = self._weights()

    # ------------------------------------------------------------------------------------------------------------------------ weights
    def _bone_names(self):
        return ["front", "rear", "head", "tail1", "tail2", "tail3"] + [f"{k}.{b}.{s}" for k in KINDS for s in SIDES for b in ("upper", "lower", "paw")]

    def _weights(self):
        names = self._bone_names()
        ix = {n: i for i, n in enumerate(names)}
        V, at, p = self.V0, self.attr, self.p
        n = len(V)
        W = np.zeros((n, len(names)))
        pid = self.part
        u = at[:, 1]
        tor = pid == self.parts["torso"]
        gu = Q.girdle_joints(self.doc, p)["u"]
        # the torso: the head, the front block, the rear block and the tail, by arc length along the spine
        wh = 1.0 - smooth(p["head"] - 0.05, p["head"] + p["neck"], u)                      # the head's ball keeps the head; the neck band hands over to the chest
        wr = smooth(gu["chest"], gu["pelvis"], u)                                          # the back hands over from the front block to the rear block between the girdles
        segs = self.doc["spine"]["tail"]["segments"]
        cum = np.cumsum([s["share"] for s in segs])
        cum = cum / cum[-1]
        lt = p["total"] - p["u_e"]
        edges = [p["u_e"]] + [p["u_e"] + c * lt for c in cum]
        wt = [smooth(edges[k] - 0.14, edges[k] + 0.14, u) for k in range(len(segs))]       # tail bone k takes over from the one before it around the k-th joint of the tail
        wt = np.array(wt)
        tail_in = smooth(p["u_e"] - 0.14, p["u_e"] + 0.14, u)
        W[tor, ix["head"]] = wh[tor]
        for k in range(3):
            lo = wt[k] * (1 - (wt[k + 1] if k + 1 < len(wt) else 0.0))
            W[tor, ix[f"tail{k + 1}"]] = ((1 - wh) * tail_in * lo)[tor]
        rest = (1 - wh) * (1 - tail_in)
        W[tor, ix["front"]] = (rest * (1 - wr))[tor]
        W[tor, ix["rear"]] = (rest * wr)[tor]
        # the legs: the limb's arc length s against its joints, a share of the first rings following the girdle's block
        for kind in KINDS:
            m0 = pid == self.parts[f"{kind}.L"]
            rec = self.limbs[f"{kind}.L"]
            js, first = rec["path"].js, float(rec["first_s"])
            r = np.array(self.doc_limb_r(kind))
            for side in SIDES:
                m = m0 & ((V[:, 1] >= 0) if side == "L" else (V[:, 1] < 0))
                ss = u[m]
                h1, h2 = 0.6 * max(r[1]), 0.6 * max(r[2])
                t1, t2 = smooth(js[1] - h1, js[1] + h1, ss), smooth(js[2] - h2, js[2] + h2, ss)
                follow = 1 - smooth(first - 0.10, first + FOLLOW, ss)                           # the socket and the rings below it move with the girdle's block, and hand over to the leg's own bones further down
                rows = np.where(m)[0]
                blk = "front" if kind == "fore" else "rear"
                W[rows, ix[f"{kind}.upper.{side}"]] = (1 - t1) * (1 - follow)
                W[rows, ix[f"{kind}.lower.{side}"]] = t1 * (1 - t2) * (1 - follow)
                W[rows, ix[f"{kind}.paw.{side}"]] = t2 * (1 - follow)
                W[rows, ix[blk]] += follow
        sm = W.sum(1)
        sm[sm == 0] = 1.0
        return W / sm[:, None], names

    def doc_limb_r(self, kind):
        lp = Q.limb_parts(self.doc, self.p)[f"{kind}.L"]
        return lp["R"]

    # ------------------------------------------------------------------------------------------------------------------------ the pose's bones
    def ik(self, kind, side, root, target_sole, toe=0.0):
        """Two-link IK in the x-z plane from the leg's root to the wrist that puts the sole on `target_sole` with the paw level (plus `toe`); each joint keeps the side its apex names. Returns the joint positions (root, mid, wrist, sole) in the plane, and the paw's angle."""
        L = self.leg[(kind, side)]
        l1, l2 = L["l1"], L["l2"]
        pawv = np.array([L["paw"][0], L["paw"][2]])
        c, s = math.cos(-toe), math.sin(-toe)
        pawv = np.array([c * pawv[0] - s * pawv[1], s * pawv[0] + c * pawv[1]])
        sole = np.asarray(target_sole, float)
        wrist = sole - pawv
        R = np.asarray(root, float)
        d = float(np.linalg.norm(wrist - R))
        d = min(max(d, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
        base = math.atan2(wrist[1] - R[1], wrist[0] - R[0])
        a = math.acos(np.clip((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
        out = None
        for sg in (1.0, -1.0):
            ang = base + sg * a
            E = R + l1 * np.array([math.cos(ang), math.sin(ang)])
            # the side of the chord the joint lies on: +x of it for a joint whose apex is forward, -x for back
            ch = wrist - R
            off = (E[0] - R[0]) - ch[0] * np.dot(E - R, ch) / max(np.dot(ch, ch), 1e-9)
            want = 1.0 if L["apex"][1] == "fwd" else -1.0
            if out is None or off * want > out[1] * want:
                out = (E, off)
        E = out[0]
        w = R + (wrist - R) * min(1.0, (l1 + l2) / max(float(np.linalg.norm(wrist - R)), 1e-9)) if np.linalg.norm(wrist - R) > l1 + l2 else wrist
        return [R, E, w, w + pawv]

    def block(self, pose):
        """The 4x4 transforms of the front and rear blocks, the head, and the tail's three bones."""
        cx, cz, cp = pose.chest if pose.chest else (self.chest0[0], self.chest0[2], 0.0)
        px, pz, pp = pose.pelvis if pose.pelvis else (self.pelvis0[0], self.pelvis0[2], 0.0)
        front = shift([cx - self.chest0[0], 0, cz - self.chest0[2]]) @ rot_y(cp, self.chest0)
        rear = shift([px - self.pelvis0[0], 0, pz - self.pelvis0[2]]) @ rot_y(pp, self.pelvis0)
        head = front @ rot_y(pose.head, self.neck0)
        M = {"front": front, "rear": rear, "head": head}
        T = rear
        for k in range(3):
            T = T @ rot_y(pose.tail[k], self.tail0[k])
            M[f"tail{k + 1}"] = T
        return M

    def bone_matrices(self, pose):
        M = self.block(pose)
        for (kind, side), L in self.leg.items():
            blk = M["front" if kind == "fore" else "rear"]
            P = L["P"]
            root = (blk @ np.r_[P[0], 1.0])[:3]
            fx, fz, toe = pose.feet.get((kind, side), (P[3][0], P[3][2], 0.0))
            # a foot's place is given for the half model: the sole's x and height; the leg's lateral place is the rest's
            pts = self.ik(kind, side, [root[0], root[2]], [fx, fz], toe)
            A = np.array([[q[0], 0.0, q[1]] for q in pts])
            rest = [P[0], P[1], P[2], P[3]]
            # the bone's rotation about y from its rest direction to the solved one, about its own head joint
            Mu = None
            prev = blk
            Ms = []
            for i in range(3):
                dr = math.atan2(rest[i + 1][2] - rest[i][2], rest[i + 1][0] - rest[i][0])
                dn = math.atan2(A[i + 1][2] - A[i][2], A[i + 1][0] - A[i][0])
                th = -(dn - dr)
                # the transform that takes the rest bone to the solved one: rotate about its rest head, then move the head to the solved head
                Mi = shift([A[i][0] - rest[i][0], 0, A[i][2] - rest[i][2]]) @ rot_y(th, rest[i])
                Ms.append(Mi)
            M[f"{kind}.upper.{side}"], M[f"{kind}.lower.{side}"], M[f"{kind}.paw.{side}"] = Ms
            M[f"{kind}.ik.{side}"] = A
        return M

    def skin(self, pose):
        M = self.bone_matrices(pose)
        V = self.V0
        Vh = np.hstack([V, np.ones((len(V), 1))])
        out = np.zeros_like(V)
        for i, nme in enumerate(self.bones):
            w = self.W[:, i]
            if not w.any():
                continue
            out += w[:, None] * (Vh @ M[nme].T)[:, :3]
        if pose.breath:
            out = out + self.breath_displacement(pose.breath)
        return out, M

    def breath_displacement(self, amount):
        """The chest and belly swell: along the radial direction from the spine axis, by a bump in arc length over the chest and belly (from the neck band to the seat) and a share that is 1 on the belly and 0.35 on the back; zero everywhere else, the legs, the head, the seat and the tail not moving at all."""
        V, at, p = self.V0, self.attr, self.p
        pid = self.part
        u = at[:, 1]
        tor = pid == self.parts["torso"]
        lo, hi = p["head"] + p["neck"], p["head"] + p["neck"] + p["back"]
        w = smooth(lo, lo + 0.25, u) * (1 - smooth(hi - 0.1, hi + 0.12, u))
        rad = V - np.array([V[:, 0], 0 * V[:, 1], 0 * V[:, 2]]).T * 0 - np.stack([V[:, 0], np.zeros(len(V)), np.full(len(V), p["axis_z"])], 1)
        rad[:, 0] = 0.0
        nrm = np.linalg.norm(rad, axis=1, keepdims=True)
        rad = rad / np.maximum(nrm, 1e-9)
        belly = 0.35 + 0.65 * smooth(-0.3, 0.6, -rad[:, 2])
        d = (BREATHE_AMP * amount * w * belly * tor)[:, None] * rad
        return d


# ---------------------------------------------------------------------------------------------------------------------------------------------- clips
def rest_feet(rig):
    return {k: (L["P"][3][0], L["P"][3][2]) for k, L in rig.leg.items()}


def walk_pose(rig, phase):
    """One frame of the walk. A foot's cycle starts at its own offset (hind left 0, fore left 1/4, hind right 1/2, fore right 3/4): on the ground for WALK_DUTY of it, its sole sliding back from +A to -A under the body, then in the air for the rest, swinging forward from -A to +A and rising to WALK_LIFT in the middle."""
    rf = rest_feet(rig)
    feet = {}
    for i, key in enumerate(FEET):
        u = (phase - 0.25 * i) % 1.0
        if u < WALK_DUTY:
            dx, lf, toe = WALK_HALF_STRIDE - 2 * WALK_HALF_STRIDE * u / WALK_DUTY, 0.0, 0.0
        else:
            w = (u - WALK_DUTY) / (1 - WALK_DUTY)
            s = math.sin(math.pi * w)
            dx, lf, toe = -WALK_HALF_STRIDE + 2 * WALK_HALF_STRIDE * (w * w * (3 - 2 * w)), WALK_LIFT * s, WALK_TOE * math.sin(2 * math.pi * w) * 0.0 + WALK_TOE * s
        feet[key] = (rf[key][0] + dx, rf[key][1] + lf, toe)
    s = 2 * math.pi * phase
    bob = -WALK_CROUCH + 0.0125 * math.cos(4 * math.pi * phase)                                             # the body walks a little lower than it stands (the legs stand straight, so a stride's reach needs them bent), with two bobs a cycle
    roll = math.radians(5.0) * math.sin(s)
    c0, p0 = rig.chest0, rig.pelvis0
    return Pose(chest=(c0[0], c0[2] + bob, roll), pelvis=(p0[0], p0[2] + bob, -roll), head=math.radians(2.0) * math.sin(s + 0.6), tail=(math.radians(3.0) * math.sin(s - 0.5), math.radians(5.0) * math.sin(s - 1.0), math.radians(7.0) * math.sin(s - 1.5)), feet=feet, name="walk")


def breathe_pose(rig, phase):
    s = 2 * math.pi * phase
    return Pose(breath=0.5 - 0.5 * math.cos(s), name="breathe")


def sit_pose(rig, phase=0.0):
    """Sitting: the haunches down and forward, the front up (the spine slopes back), the forefeet where they stood, the hind feet flat under the hips; the tail rests along the floor."""
    c0, p0 = rig.chest0, rig.pelvis0
    rf = rest_feet(rig)
    pz, px = 0.70, p0[0] + 0.20
    feet = {("hind", "L"): (rf[("hind", "L")][0] + 0.26, 0.0, 0.0), ("hind", "R"): (rf[("hind", "R")][0] + 0.26, 0.0, 0.0)}
    feet[("fore", "L")] = (rf[("fore", "L")][0], 0.0, 0.0)
    feet[("fore", "R")] = (rf[("fore", "R")][0], 0.0, 0.0)
    return Pose(chest=(c0[0], c0[2], 0.0), pelvis=(px, pz, 0.0), head=0.0, tail=(math.radians(-8.0), math.radians(-18.0), math.radians(-14.0)), feet=feet, name="sit")


def curl_pose(rig, phase=0.0):
    """Curling up: the belly on the floor, the spine low and level, all four feet flat under it, the tail curled up and over the rump: every bone of it in the x-z plane, on the midline."""
    c0, p0 = rig.chest0, rig.pelvis0
    rf = rest_feet(rig)
    z = 0.66
    feet = {("fore", "L"): (rf[("fore", "L")][0] + 0.18, 0.0, 0.0), ("fore", "R"): (rf[("fore", "R")][0] + 0.18, 0.0, 0.0), ("hind", "L"): (rf[("hind", "L")][0] + 0.22, 0.0, 0.0), ("hind", "R"): (rf[("hind", "R")][0] + 0.22, 0.0, 0.0)}
    return Pose(chest=(c0[0] + 0.1, z, 0.0), pelvis=(p0[0] + 0.1, z, 0.0), head=math.radians(0.0), tail=(math.radians(38.0), math.radians(52.0), math.radians(52.0)), feet=feet, name="curl")


def clip_pose(rig, name, phase=0.0):
    return dict(walk=walk_pose, breathe=breathe_pose, sit=sit_pose, curl=curl_pose)[name](rig, phase)


def clip_frames(name):
    if name not in FRAMES:
        raise ValueError(f"clip is one of {', '.join(FRAMES)}")
    return FRAMES[name]


def build_rig(doc, level=1):
    """Build the cage of a quadruped file and its rig on the level-`level` whole-body mesh: (rig, mesh dict with V, F, part, names)."""
    import subdiv as SD
    from wb import facade as F
    body = Q.build(F.internal(doc))
    Vf, Ff, attr, fp, cr, mir = body.full()
    V, Fq, _, at, fpp = SD.subdivide_body(body, Vf, Ff, cr, attr, fp, levels=level)
    at = np.asarray(at, float)
    Fq = np.array(Fq, int)
    cnt = np.zeros((len(V), len(body.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (Fq[:, k], np.asarray(fpp).astype(int)), 1.0)
    part = cnt.argmax(1)
    rig = QRig(body, V, at, part)
    mesh = dict(V=np.asarray(V, float), F=np.array(Fq, int), part=part, names={int(v): k for k, v in body.parts.items()})
    return rig, mesh
