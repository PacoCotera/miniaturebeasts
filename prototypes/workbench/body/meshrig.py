"""The armature of a mesh body (chunk 31), Blender-free numpy: the sculpt's bones, its weights and linear blend skinning.
How a locus acts on the mesh: a bone is scaled in the rest pose, along its axis for length and across it for girth (`scales`), the file's `rig.bones` list; a child bone keeps its own size (it inherits no scale: it rides on the parent's moved joint), so the paws and the signature
socket stay round and keep their size when a leg or the head is scaled. Where a bone scale would shear the skin (the torso's girth at the leg roots), a scripted shape key is used instead: an offset along the vertex normals masked by the weights of the bones it names (`KEYS`, the file's `keys` list
holds each key's amount). The feet are put back on the floor after every deformation.
Clips are poses of the same armature: the trotter's four-beat walk (hind left, fore left, hind right, fore right a quarter of the cycle apart). A pose turns a bone about the lateral axis through its joint; the legs' bones turn together so a paw stays level.
Weights: the sculpt's automatic weights are read as they are, then `fix_weights` makes a vertex of a leg follow only its own leg and the girdle above it, and a sole follow its paw alone (rigid), so a strong key no longer pulls a leg across the body.
Units are the sculpt's (H = standing height); z is up and the creature faces +x."""
import math

import numpy as np

import meshsource as MS

AXIS = {"rear": (1, 0, 0), "front": (1, 0, 0), "head": (1, 0, 0)}
LEG_AXIS = (0, 0, -1)
CREST_AXIS = (0, 0, 1)
KEYS = {                                                                      # the scripted shape keys: bones the mask is made of, and the offset along the normal at amount 1 (in H)
    "form.torso-girth": dict(bones=("rear", "front"), reach=0.38),
}
FEET = (("hind", "L"), ("fore", "L"), ("hind", "R"), ("fore", "R"))          # the four-beat order of the walk
WALK = dict(swing=math.radians(20.0), flex=math.radians(26.0), lift_paw=1.0, bob=0.012, sway=0.06, roll=math.radians(2.0), yaw=math.radians(2.0), duty=0.75)
PERIOD = 1.8
FRAMES = 12
_CACHE = {}
SMOOTH = 10


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], float)


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], float)


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)


def is_leg(name):
    return name.split(".")[0] in ("fore", "hind")


def axis_of(name):
    if name in AXIS:
        return np.array(AXIS[name], float)
    if name.startswith("socket."):
        return np.array(CREST_AXIS, float)
    return np.array(LEG_AXIS, float)


def of(mesh):
    """The rig of a sculpt, built once per sha."""
    k = mesh.sha
    if k not in _CACHE:
        _CACHE[k] = MeshRig(mesh)
    return _CACHE[k]


class MeshRig:
    def __init__(self, mesh):
        g = mesh.glb
        names, J, W = g.skin()
        V, F, UV = g.triangles()
        key = np.round(np.asarray(V, float) / 1e-6).astype(np.int64)
        _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        inv = inv.reshape(-1)
        self.names = list(names)
        nb = len(names)
        dense = np.zeros((len(V), nb))
        for k in range(4):
            np.add.at(dense, (np.arange(len(V)), J[:, k]), W[:, k])
        self.V = np.asarray(V, float)[first]
        self.UV = None if UV is None else np.asarray(UV, float)[first]
        self.zone_png = g.zone_map()
        self.F = inv[np.asarray(F, int)]
        self.W0 = dense[first]
        jw = g.joint_world()
        self.head = np.array([jw[n][0] for n in names], float)
        self.parent = [self.names.index(jw[n][1]) if jw[n][1] in self.names else None for n in names]
        self.axis = np.array([axis_of(n) for n in names], float)
        self.W = self.fix_weights(self.W0.copy())
        self.N = MS.vertex_normals(self.V, self.F)
        self.H = float(mesh.sc["bands"]["standing_height"])
        self.floor = float(self.V[:, 2].min())

    # ------------------------------------------------------------------------------------------------------------------------------------------------ weights
    def idx(self, name):
        return self.names.index(name)

    def fix_weights(self, W):
        """A vertex whose strongest bone is a leg bone belongs to that leg: its weights move to its own leg's bones and its girdle (nothing from the other legs, the other girdle or the head); a vertex of a paw below the paw joint follows the paw alone (a rigid sole)."""
        V = self.V
        leg_of = {n: ".".join(n.split(".")[::2]) for n in self.names if is_leg(n)}           # fore.upper.L -> fore.L
        girdle = {"fore": "front", "hind": "rear"}
        top = np.argmax(W, axis=1)
        sole = np.zeros(len(W), bool)                                                    # the vertices of a rigid sole, kept as they are through the smoothing
        for v in range(len(W)):
            n = self.names[top[v]]
            if not is_leg(n):
                # a body vertex keeps no weight on a leg that is far from it: a leg's weight beyond 0.35 H away is the leak that splays a leg under a strong key
                for b, bn in enumerate(self.names):
                    if is_leg(bn) and W[v, b] > 0:
                        hx = self.head[b]
                        if np.hypot(V[v, 0] - hx[0], V[v, 1] - hx[1]) > 0.25 * 2.22:
                            W[v, self.idx("rear" if bn.startswith("hind") else "front")] += W[v, b]
                            W[v, b] = 0.0
                continue
            mine = leg_of[n]
            kind = n.split(".")[0]
            for b, bn in enumerate(self.names):
                if W[v, b] <= 0:
                    continue
                if is_leg(bn) and leg_of[bn] != mine:
                    W[v, self.idx(girdle[kind])] += W[v, b]
                    W[v, b] = 0.0
                elif not is_leg(bn) and bn != girdle[kind]:
                    W[v, self.idx(girdle[kind])] += W[v, b]
                    W[v, b] = 0.0
            paw = self.idx(f"{mine.split('.')[0]}.paw.{mine.split('.')[1]}")
            if V[v, 2] < self.head[paw][2] - 0.02:
                W[v] = 0.0
                W[v, paw] = 1.0
                sole[v] = True
        W = W / np.maximum(W.sum(1, keepdims=True), 1e-12)

        E = MS.adjacency(self.F, len(V))
        deg = np.bincount(E.ravel(), minlength=len(V)).astype(float)
        for _ in range(SMOOTH):                                                           # the weights are smoothed over the surface so a bone scale or a key never tears a seam between two bones' skins
            nb = np.zeros_like(W)
            np.add.at(nb, E[:, 0], W[E[:, 1]])
            np.add.at(nb, E[:, 1], W[E[:, 0]])
            Wn = 0.5 * W + 0.5 * nb / np.maximum(deg, 1.0)[:, None]
            W = np.where(sole[:, None], W, Wn)
        return W / np.maximum(W.sum(1, keepdims=True), 1e-12)

    def zones(self):
        """The zone map's class of every vertex (0 coat, 1 cream, 2 toe pad, 3 eye ring, 4 eye disc), read at its UV; None when the sculpt has no zone map."""
        if self.zone_png is None or self.UV is None:
            return None
        import os
        import tempfile
        from wb import pngio
        png, _ = self.zone_png
        d = tempfile.mkdtemp()
        try:
            pth = os.path.join(d, "z.png")
            with open(pth, "wb") as fh:
                fh.write(png)
            Z = pngio.read(pth)[..., 0]
        finally:
            import shutil
            shutil.rmtree(d, ignore_errors=True)
        n = Z.shape[0]
        x = np.clip((self.UV[:, 0] * n).astype(int), 0, n - 1)
        y = np.clip((self.UV[:, 1] * n).astype(int), 0, n - 1)
        return Z[y, x].astype(int)

    # ------------------------------------------------------------------------------------------------------------------------------------------------ the pose
    def matrices(self, scales=None, rots=None, shifts=None):
        """[(hw, A)] per bone: the posed joint and the 3x3 that takes a rest offset from the joint to its place (rotation of the bone and its parents, then its own scale).
        scales: bone -> (len, girth); rots: bone -> (rx, ry, rz) in radians about the axes through its joint; shifts: bone -> (dx, dy, dz) of its joint."""
        scales, rots, shifts = scales or {}, rots or {}, shifts or {}
        out, Rw = [], []
        for b, n in enumerate(self.names):
            p = self.parent[b]
            rx, ry, rz = rots.get(n, (0.0, 0.0, 0.0))
            Rl = rot_z(rz) @ rot_y(ry) @ rot_x(rx)
            R = Rl if p is None else Rw[p] @ Rl
            ln, gi = scales.get(n, (1.0, 1.0))
            a = self.axis[b]
            S = gi * np.eye(3) + (ln - gi) * np.outer(a, a)
            hw = self.head[b] if p is None else out[p][0] + out[p][1] @ (self.head[b] - self.head[p])
            hw = hw + np.asarray(shifts.get(n, (0.0, 0.0, 0.0)), float)
            Rw.append(R)
            out.append((hw, R @ S, R))
        return out

    def skin(self, mats, V=None):
        V = self.V if V is None else V
        out = np.zeros_like(V)
        for b in range(len(self.names)):
            w = self.W[:, b]
            if not w.any():
                continue
            hw, A, _ = mats[b]
            out += w[:, None] * (hw + (V - self.head[b]) @ A.T)
        return out

    def key_offset(self, amounts):
        """The offset of the scripted keys at `amounts` (key id -> amount): along the vertex normals, masked by the weights of the key's bones."""
        d = np.zeros_like(self.V)
        for k, a in (amounts or {}).items():
            spec = KEYS.get(k.replace("key.", "", 1) if k.startswith("key.") else k)
            if spec is None or not a:
                continue
            mask = self.W[:, [self.idx(b) for b in spec["bones"]]].sum(1)
            d += float(a) * spec["reach"] * self.H * mask[:, None] * self.N
        return d

    def rest(self, doc_rig=None, keys=None):
        """The body at its stand: the file's bone scales and key amounts applied, the feet on the floor. Returns (V posed, mats)."""
        scales = {b["id"]: (float(b.get("len", 1.0)), float(b.get("girth", 1.0))) for b in ((doc_rig or {}).get("bones") or [])}
        mats = self.matrices(scales)
        V = self.skin(mats, self.V + self.key_offset(keys))
        dz = self.floor - float(V[:, 2].min())
        V = V.copy()
        V[:, 2] += dz
        return V, mats, scales, dz

    # ------------------------------------------------------------------------------------------------------------------------------------------------ the walk
    def walk_pose(self, phase, scales=None):
        """(rots, shifts) of the four-beat walk at `phase` in [0, 1): each foot is on the ground for 0.75 of the cycle and swings forward for 0.25. A leg's upper bone swings about y, its lower bone folds in the swing, the paw is turned back so the sole stays level."""
        w = WALK
        rots, shifts, sway = {}, {}, 0.0
        for k, (kind, side) in enumerate(FEET):
            ph = (phase - 0.25 * k) % 1.0
            if ph < w["duty"]:                                                                # stance: the leg goes back from forward over the ground
                t = ph / w["duty"]
                up = w["swing"] * (1.0 - 2.0 * t)
                fl = 0.0
            else:                                                                             # swing: forward again, the lower leg folds
                t = (ph - w["duty"]) / (1.0 - w["duty"])
                up = w["swing"] * (-1.0 + 2.0 * t)
                fl = w["flex"] * math.sin(math.pi * t)
            lam = max(0.0, math.cos(math.pi * (((ph - 0.875 + 0.5) % 1.0) - 0.5) / 0.5))                 # the body leans away from a foot about to leave the ground, a little before and after the swing
            sway -= (1.0 if side == "L" else -1.0) * lam
            sgn = 1.0 if kind == "fore" else -1.0                                             # a hind leg's lower bone folds the other way
            ru = f"{kind}.upper.{side}"
            rl = f"{kind}.lower.{side}"
            rp = f"{kind}.paw.{side}"
            rots[ru] = (0.0, up, 0.0)
            rots[rl] = (0.0, sgn * fl, 0.0)
            rots[rp] = (0.0, -(up + sgn * fl), 0.0)
        a = 2 * math.pi * phase
        rots["front"] = (w["roll"] * math.sin(a), 0.0, 0.0)
        rots["rear"] = (-w["roll"] * math.sin(a), 0.0, w["yaw"] * math.sin(a))
        d = w["sway"] * self.H * sway
        shifts["rear"] = (0.0, d, -w["bob"] * self.H * 0.5 * (1 - math.cos(2 * a)) * 0.5)
        for kind, side in FEET:                                                               # the body slides over the planted feet: each hip joint stays where its foot is
            shifts[f"{kind}.upper.{side}"] = (0.0, -d, 0.0)
        return rots, shifts

    def walk(self, i, doc_rig=None, keys=None):
        """Frame i of the walk of this body (the file's scales and keys at the stand): (V, mats, dz). The lowest vertex stays on the floor."""
        scales = {b["id"]: (float(b.get("len", 1.0)), float(b.get("girth", 1.0))) for b in ((doc_rig or {}).get("bones") or [])}
        rots, shifts = self.walk_pose((i % FRAMES) / FRAMES, scales)
        mats = self.matrices(scales, rots, shifts)
        V = self.skin(mats, self.V + self.key_offset(keys))
        dz = self.floor - float(V[:, 2].min())
        V = V.copy()
        V[:, 2] += dz
        return V, mats, dz

    def carry(self, P, mats, keys=None, dz=0.0):
        """Points of the rest body (a station, a socket) carried where the nearest vertex goes: its bones' matrices and the keys' offset there."""
        P = np.atleast_2d(np.asarray(P, float))
        off = self.key_offset(keys)
        out = []
        for p in P:
            v = int(np.argmin(((self.V - p) ** 2).sum(1)))
            q = np.zeros(3)
            for b in np.nonzero(self.W[v])[0]:
                hw, A, _ = mats[b]
                q += self.W[v, b] * (hw + A @ (p + off[v] - self.head[b]))
            q[2] += dz
            out.append(q)
        return np.array(out)
        return V, mats

    # ------------------------------------------------------------------------------------------------------------------------------------------------ measures
    def feet(self, V):
        """{ 'hind.L': centroid of the paw's sole vertices, ... } of a posed mesh, the sole being the vertices that follow the paw alone."""
        out = {}
        for kind, side in FEET:
            b = self.idx(f"{kind}.paw.{side}")
            sel = self.W[:, b] > 0.99
            out[f"{kind}.{side}"] = V[sel].mean(0)
        return out

    def hips(self, mats):
        """{ 'hind.L': the upper leg's joint, ... } of a posed rig."""
        return {f"{k}.{s}": np.array(mats[self.idx(f"{k}.upper.{s}")][0]) for k, s in FEET}

    def splay(self, V, mats):
        """How far the feet have left the line under their hips, sideways, in H: the most any foot's lateral offset from its hip changed from the stand's."""
        stand_mats = self.matrices()
        Vs = self.skin(stand_mats)
        f0, h0 = self.feet(Vs), self.hips(stand_mats)
        f1, h1 = self.feet(V), self.hips(mats)
        worst = 0.0
        for k in f0:
            d = abs((f1[k][1] - h1[k][1]) - (f0[k][1] - h0[k][1]))
            worst = max(worst, d)
        return worst / self.H

    def centre_of_mass(self, V):
        """The volume centroid of the closed triangle mesh and its volume."""
        A, B, C = V[self.F[:, 0]], V[self.F[:, 1]], V[self.F[:, 2]]
        v = np.einsum("ij,ij->i", A, np.cross(B, C)) / 6.0
        return ((A + B + C) / 4.0 * v[:, None]).sum(0) / v.sum(), float(v.sum())

    def balance(self, V, ground=0.03):
        """The centre of mass over the soles on the ground (the paws' vertices below `ground` H over the floor): the same dict as the cage's balance."""
        import quadruped as Q
        import s20balance as SB
        com, vol = self.centre_of_mass(V)
        z0 = float(V[:, 2].min())
        soles = {}
        for kind, side in FEET:
            b = self.idx(f"{kind}.paw.{side}")
            sel = (self.W[:, b] > 0.5) & (V[:, 2] < z0 + ground * self.H)
            if sel.any():
                soles[f"{kind}.{side}"] = V[sel][:, :2]
        if len(soles) < 2:
            return dict(com=com, volume=vol, hull=np.zeros((0, 2)), soles={}, length=0.0, width=0.0, margin_H=-1.0, margin=-1.0, inside=False, down=len(soles))
        P = np.vstack(list(soles.values()))
        Hh = SB.hull(P)
        ext = (float(P[:, 0].max() - P[:, 0].min()), float(P[:, 1].max() - P[:, 1].min()))
        m = Q.hull_margin(Hh, com[:2]) if len(Hh) >= 3 else -1.0
        return dict(com=com, volume=vol, hull=Hh, soles={k: dict(centre=v.mean(0), n=int(len(v))) for k, v in soles.items()}, length=ext[0], width=ext[1], margin_H=float(m / self.H),
                    margin=float(m / max(min(ext), 1e-9)), inside=bool(m > 0), down=len(soles))

    def head_share(self, V):
        """The head's share of the standing height: the height of the vertices the head and the crown bone hold (weight over half) over the standing height."""
        w = self.W[:, [self.idx("head"), self.idx("socket.crest")]].sum(1)
        sel = w > 0.5
        z = V[sel][:, 2]
        return float((z.max() - z.min()) / (V[:, 2].max() - V[:, 2].min()))

    def leg_share(self, V):
        """The legs' share of the standing height: the underside of the torso (the lowest vertex the girdles hold) over the standing height."""
        w = self.W[:, [self.idx("rear"), self.idx("front")]].sum(1)
        sel = w > 0.5
        return float((V[sel][:, 2].min() - V[:, 2].min()) / (V[:, 2].max() - V[:, 2].min()))

    def twist_deg(self, mats):
        """The roll of the front block against the rear block, in degrees: the angle their side axes (y) make about the spine axis."""
        r, f = mats[self.idx("rear")][1], mats[self.idx("front")][1]
        def roll(A):
            y = A @ np.array([0.0, 1.0, 0.0])
            return math.degrees(math.atan2(y[2], y[1]))
        return abs(roll(f) - roll(r))
