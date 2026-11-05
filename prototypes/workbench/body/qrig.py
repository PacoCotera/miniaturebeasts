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
FOLLOW = 0.30                                                                # how far below its first ring a leg keeps following its girdle (H of the leg's arc)
WALK_DUTY = 0.75                                                              # the share of the cycle a foot is on the ground: three feet are down at once, never fewer than two
WALK_TRAVEL = 0.09                                                            # each foot's whole travel across the loop (H): the same on the ground (sliding back) as in the air (swinging forward)
WALK_LIFT = 0.08                                                              # the height a foot clears the ground in the middle of its swing (H)
WALK_CROUCH = 0.027                                                           # how far the body lowers for the walk (H), on top of the bob
WALK_BOB = 0.025                                                              # the body's bob, top to bottom, twice a loop, lowest as a foot lands (H)
WALK_ROLL = math.radians(5.0)                                                 # chest and pelvis pitch against each other
WALK_YAW = math.radians(3.0)                                                  # the rear block's yaw about its own vertical axis, with the tail on it
WALK_FLEX = math.radians(30.0)                                                # how far the paw folds at the wrist (fore) or hock (hind) in the middle of a swing
WALK_TOE = math.radians(3.0)                                                  # the sole's roll: it stays level to a few degrees
MAX_BEND = math.radians(48.0)                                                 # the most the elbow or stifle bends: the paw folds further at the wrist or hock rather than let the leg crumple
MAX_FLEX = math.radians(75.0)
FOOT_H = 0.08                                                                 # the foot bone: the lowest 0.08 H of the leg, always level; the paw above it folds
BREATHE_AMP = 0.035                                                           # the chest's and belly's displacement at full inhale (H)
FRAMES = {"walk": 12, "breathe": 6, "sit": 1, "curl": 1}
FRAME_MS = 150                                                                # a walk frame lasts 150 ms
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


def rot_z(theta, about):
    """4x4 rotation by theta (rad) about the vertical axis through `about`: positive turns +x toward +y."""
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
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
    yaw: the rear block's turn about its own vertical axis through the pelvis joint (the tail turns with it); head_yaw: the head's turn about the vertical axis through the neck's base (positive turns the nose toward +y).
    feet: {(kind, side): (x, z, toe, flex)}: where the sole's centre stands in the x-z plane, the sole's roll and how far the paw folds at the wrist or hock (the sole itself stays level); absent = the rest place, flat, straight. breath: 0..1."""
    chest: tuple = None
    pelvis: tuple = None
    yaw: float = 0.0
    head: float = 0.0
    head_yaw: float = 0.0
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
                paw = P[3] - P[2]
                self.leg[(kind, side)] = dict(P=P, l1=float(np.linalg.norm(P[1] - P[0])), l2=float(np.linalg.norm(P[2] - P[1])), paw=paw, l3=float(np.linalg.norm(paw)) - FOOT_H, apex=apex,
                                              A0=P[3] + np.array([0.0, 0.0, FOOT_H]), fold=1.0 if apex[2] == "fwd" else -1.0)
        self.W, self.bones = self._weights()

    # ------------------------------------------------------------------------------------------------------------------------ weights
    def _bone_names(self):
        return ["front", "rear", "head", "tail1", "tail2", "tail3"] + [f"{k}.{b}.{s}" for k in KINDS for s in SIDES for b in ("upper", "lower", "paw", "foot")]

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
                follow = np.maximum(1 - smooth(first - 0.02, first + FOLLOW, ss), (ss > js[3] + 0.04) * 1.0)                    # the flange the limb's rings make back up the torso (arc length past the sole) belongs to the block                           # the socket and the rings below it move with the girdle's block, and hand over to the leg's own bones further down
                rows = np.where(m)[0]
                blk = "front" if kind == "fore" else "rear"
                W[rows, ix[f"{kind}.upper.{side}"]] = (1 - t1) * (1 - follow)
                W[rows, ix[f"{kind}.lower.{side}"]] = t1 * (1 - t2) * (1 - follow)
                zf = V[m, 2] - self.leg[(kind, side)]["P"][3][2]
                wf = 1.0 - smooth(FOOT_H - 0.03, FOOT_H + 0.06, zf)                                    # the lowest of the paw is the foot, which stays level
                W[rows, ix[f"{kind}.paw.{side}"]] = t2 * (1 - follow) * (1 - wf)
                W[rows, ix[f"{kind}.foot.{side}"]] = t2 * (1 - follow) * wf
                W[rows, ix[blk]] += follow
        sm = W.sum(1)
        sm[sm == 0] = 1.0
        return W / sm[:, None], names

    def doc_limb_r(self, kind):
        lp = Q.limb_parts(self.doc, self.p)[f"{kind}.L"]
        return lp["R"]

    # ------------------------------------------------------------------------------------------------------------------------ the pose's bones
    def ik(self, kind, side, root, target_sole, toe=0.0, flex=0.0):
        """The leg in the x-z plane from its root to a sole on `target_sole`: the foot (the lowest FOOT_H of the leg) level plus `toe`, the paw above it folded back `flex` at the wrist (fore, the knee points forward) or hock (hind, it points back), and two-link IK from the root to the wrist, the elbow or stifle on the side its apex names. Returns the points root, mid, wrist, ankle, sole, and whether the leg reached."""
        L = self.leg[(kind, side)]
        l1, l2, l3 = L["l1"], L["l2"], L["l3"]
        c, s = math.cos(-toe), math.sin(-toe)
        footv = np.array([c * 0.0 - s * -FOOT_H, s * 0.0 + c * -FOOT_H])
        sole = np.asarray(target_sole, float)
        ankle = sole - footv
        R = np.asarray(root, float)
        while True:                                                                                      # the paw folds as far as the leg needs to keep its elbow or stifle open
            wrist = ankle + l3 * np.array([L["fold"] * math.sin(flex), math.cos(flex)])
            dd = float(np.linalg.norm(wrist - R))
            bend = math.pi - math.acos(np.clip((l1 * l1 + l2 * l2 - dd * dd) / (2 * l1 * l2), -1, 1))
            if bend <= MAX_BEND or flex >= MAX_FLEX or sole[1] < 0.004:
                break
            flex = min(flex + 0.03, MAX_FLEX)
        ch = wrist - R
        d0 = float(np.linalg.norm(ch))
        reach = d0 <= l1 + l2 - 1e-3
        d = min(max(d0, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
        base = math.atan2(ch[1], ch[0])
        a = math.acos(np.clip((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
        want = 1.0 if L["apex"][1] == "fwd" else -1.0
        best = None
        for sg in (1.0, -1.0):
            E = R + l1 * np.array([math.cos(base + sg * a), math.sin(base + sg * a)])
            off = (E[0] - R[0]) - ch[0] * np.dot(E - R, ch) / max(np.dot(ch, ch), 1e-9)
            if best is None or off * want > best[1] * want:
                best = (E, off)
        E = best[0]
        w = wrist
        if d0 > l1 + l2 - 1e-3:
            w = R + ch * (d / d0)
            ankle = w - l3 * np.array([L["fold"] * math.sin(flex), math.cos(flex)])
            sole = ankle + footv
        return [R, E, w, ankle, sole], reach

    def block(self, pose):
        """The 4x4 transforms of the front and rear blocks, the head, and the tail's three bones."""
        cx, cz, cp = pose.chest if pose.chest else (self.chest0[0], self.chest0[2], 0.0)
        px, pz, pp = pose.pelvis if pose.pelvis else (self.pelvis0[0], self.pelvis0[2], 0.0)
        front = shift([cx - self.chest0[0], 0, cz - self.chest0[2]]) @ rot_y(cp, self.chest0)
        rear = shift([px - self.pelvis0[0], 0, pz - self.pelvis0[2]]) @ rot_z(pose.yaw, self.pelvis0) @ rot_y(pp, self.pelvis0)
        head = front @ rot_z(pose.head_yaw, self.neck0) @ rot_y(pose.head, self.neck0)
        M = {"front": front, "rear": rear, "head": head}
        T = rear
        for k in range(3):
            T = T @ rot_y(pose.tail[k], self.tail0[k])
            M[f"tail{k + 1}"] = T
        return M

    def bone_matrices(self, pose):
        M = self.block(pose)
        self.reached = {}
        for (kind, side), L in self.leg.items():
            blk = M["front" if kind == "fore" else "rear"]
            P = L["P"]
            root = (blk @ np.r_[P[0], 1.0])[:3]
            fx, fz, toe, flex = (tuple(pose.feet.get((kind, side), (P[3][0], P[3][2], 0.0, 0.0))) + (0.0,))[:4]
            pts, ok = self.ik(kind, side, [root[0], root[2]], [fx, fz], toe, flex)
            self.reached[(kind, side)] = ok
            A = np.array([[q[0], 0.0, q[1]] for q in pts])
            rest = [P[0], P[1], P[2], L["A0"]]
            heads = [A[0], A[1], A[2], A[3]]
            tails = [A[1], A[2], A[3], A[4]]
            Ms = []
            for i in range(3):
                dr = math.atan2(rest[i + 1][2] - rest[i][2], rest[i + 1][0] - rest[i][0])
                dn = math.atan2(A[i + 1][2] - A[i][2], A[i + 1][0] - A[i][0])
                Ms.append(shift([A[i][0] - rest[i][0], 0, A[i][2] - rest[i][2]]) @ rot_y(-(dn - dr), rest[i]))
            Ms.append(shift([A[3][0] - L["A0"][0], 0, A[3][2] - L["A0"][2]]) @ rot_y(toe, L["A0"]))
            M[f"{kind}.upper.{side}"], M[f"{kind}.lower.{side}"], M[f"{kind}.paw.{side}"], M[f"{kind}.foot.{side}"] = Ms
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
    """One frame of the walk. A foot's cycle starts at its own offset (hind left 0, fore left 1/4, hind right 1/2, fore right 3/4): on the ground for WALK_DUTY of it, its sole sliding back WALK_TRAVEL under the body, then in the air for the rest, swinging forward the same distance, rising WALK_LIFT in the middle with the paw folding at the wrist or hock."""
    rf = rest_feet(rig)
    feet = {}
    for i, key in enumerate(FEET):
        u = (phase - 0.25 * i) % 1.0
        if u < WALK_DUTY:
            dx, lf, toe, fl = 0.5 * WALK_TRAVEL - WALK_TRAVEL * u / WALK_DUTY, 0.0, 0.0, 0.0
        else:
            w = (u - WALK_DUTY) / (1 - WALK_DUTY)
            s = math.sin(math.pi * w)
            dx, lf, toe, fl = -0.5 * WALK_TRAVEL + WALK_TRAVEL * (w * w * (3 - 2 * w)), WALK_LIFT * s, WALK_TOE * math.sin(2 * math.pi * w), WALK_FLEX * s
        feet[key] = (rf[key][0] + dx, rf[key][1] + lf, toe, fl)
    s = 2 * math.pi * phase
    bob = -WALK_CROUCH - 0.5 * WALK_BOB * math.cos(4 * math.pi * phase)                                     # lowest as a foot lands (at 0 and 1/2), highest between
    roll = WALK_ROLL * math.sin(s)
    c0, p0 = rig.chest0, rig.pelvis0
    return Pose(chest=(c0[0], c0[2] + bob, roll), pelvis=(p0[0], p0[2] + bob, -roll), yaw=WALK_YAW * math.sin(s + 1.0), head=math.radians(2.0) * math.sin(s + 0.6),
                tail=(math.radians(3.0) * math.sin(s - 0.5), math.radians(5.0) * math.sin(s - 1.0), math.radians(7.0) * math.sin(s - 1.5)), feet=feet, name="walk")


def breathe_pose(rig, phase):
    s = 2 * math.pi * phase
    return Pose(breath=0.5 - 0.5 * math.cos(s), name="breathe")


def _tilted(rig, theta, drop):
    """The two girdle joints for the whole body tilted nose-up by `theta` about the chest joint, the chest let down `drop`: (chest, pelvis) as Pose takes them."""
    c0, p0 = rig.chest0, rig.pelvis0
    L = float(c0[0] - p0[0])
    cz = c0[2] - drop
    return (c0[0], cz, -theta), (c0[0] - L * math.cos(theta), cz - L * math.sin(theta), -theta)


def sit_pose(rig, phase=0.0):
    """Sitting: the haunches down, the body tilted nose-up, the forefeet where they stood and straight, the hind legs folded at the stifle and the hock with the soles flat ahead of the hips, the head level, the tail resting low."""
    rf = rest_feet(rig)
    th = math.radians(16.0)
    P0 = rig.leg[("fore", "L")]["P"][0]
    z_root = float((rot_y(-th, rig.chest0) @ np.r_[P0, 1.0])[2])
    chest, pelvis = _tilted(rig, th, z_root - (P0[2] - 0.01))                                                # the chest down until the forelegs' roots are where they stood
    feet = {}
    for side in SIDES:
        feet[("fore", side)] = (rf[("fore", side)][0], 0.0, 0.0, 0.0)
        feet[("hind", side)] = (pelvis[0] + 0.30, 0.0, 0.0, math.radians(24.0))
    return Pose(chest=chest, pelvis=pelvis, head=math.radians(8.0), tail=(math.radians(10.0), math.radians(-8.0), math.radians(-6.0)), feet=feet, name="sit")


def curl_pose(rig, phase=0.0):
    """Curling up: the belly on the floor, the spine level, the legs folded under it with the soles flat, the head turned round to lie against the flank (it cannot lie flush: S22's head is as tall as its body, so it turns as far as its own size lets it), the tail curled up and over the rump on the midline."""
    c0, p0 = rig.chest0, rig.pelvis0
    rf = rest_feet(rig)
    z = c0[2] - (float(rig.V0[rig.part == rig.parts["torso"]][:, 2].min()) - CURL_FLOOR)                  # the lowest of the trunk on the floor
    feet = {}
    for side in SIDES:
        feet[("fore", side)] = (rf[("fore", side)][0] + 0.18, 0.0, 0.0, math.radians(24.0))
        feet[("hind", side)] = (rf[("hind", side)][0] + 0.30, 0.0, 0.0, math.radians(24.0))
    return Pose(chest=(c0[0] + 0.1, z, 0.0), pelvis=(p0[0] + 0.1, z, 0.0), head=math.radians(0.0), head_yaw=math.radians(105.0), tail=(math.radians(38.0), math.radians(52.0), math.radians(52.0)), feet=feet, name="curl")


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


# ---------------------------------------------------------------------------------------------------------------------------------------------- measures
CURL_FLOOR = 0.03                                                             # the curled body's belly on the floor
SOLE_REST_Z = 0.005                  # the vertices of a leg that stand this close to the floor at rest are its sole


def sole_vertices(rig, kind, side):
    m = (rig.part == rig.parts[f"{kind}.L"]) & ((rig.V0[:, 1] >= 0) if side == "L" else (rig.V0[:, 1] < 0)) & (rig.V0[:, 2] < SOLE_REST_Z)
    return np.where(m)[0]


def sole_angle(rig, V, kind, side):
    """The sole's pitch in degrees from level: the slope of the line through its vertices in the x-z plane (positive = the toe down)."""
    ix = sole_vertices(rig, kind, side)
    x, z = V[ix, 0], V[ix, 2]
    return math.degrees(math.atan(-np.polyfit(x, z, 1)[0])) if np.ptp(x) > 1e-6 else 0.0


def walk_numbers(rig, px_per_h, frames=None):
    """For every frame of the walk and each foot: whether it is on the ground, the sole's pitch from level (deg) and, on the ground, how far the sole is from where the loop puts it (px at the strip's scale: the sole's centre in x against its commanded place and its lowest point against the floor)."""
    n = frames or FRAMES["walk"]
    base = {k: float(np.mean(rig.V0[sole_vertices(rig, *k), 0])) - rest_feet(rig)[k][0] for k in FEET}          # where the sole's centre stands against the foot's own place
    rows = []
    for i in range(n):
        pose = clip_pose(rig, "walk", i / n)
        V, _ = rig.skin(pose)
        row = []
        for k in FEET:
            ix = sole_vertices(rig, *k)
            fx, fz = pose.feet[k][0], pose.feet[k][1]
            on = fz - rest_feet(rig)[k][1] < 1e-9
            dx = float(np.mean(V[ix, 0])) - (fx + base[k])
            dz = float(V[ix, 2].min())
            row.append(dict(foot=k, ground=bool(on), angle=round(sole_angle(rig, V, *k), 2), hold=round(max(abs(dx), abs(dz)) * px_per_h, 2) if on else None, dx=round(dx * px_per_h, 2), dz=round(dz * px_per_h, 2)))
        rows.append(row)
    return rows
