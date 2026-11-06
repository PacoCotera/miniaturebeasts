"""The built body of a mesh file: the same interface the cage builder gives the render, the export and the checks (`parts`, `ctx`, a proxy mesh dict, a frame for the camera), made from a signed sculpt and the library parts the file names.
`MeshBody(doc)` reads the sculpt and its parts (meshsource.py), places each part at its socket (a fan of the part's own layout: count, size) and holds the welded surface the clay and the face decal are drawn on.
Nothing here builds geometry: a file whose sculpt or part is not the pinned one is refused by `mesh.stamp` before it is built."""
import math

import numpy as np

import meshrig as MR
import meshsource as MS

C_TRIAL = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])      # the leaf's own frame (the sculpt trial's axes: front -y, left +x) to the studio's (front +x, left +y)


def rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], float)


def ry(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], float)


def rz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)


def fan_placements(count, size_of_body, body_h, layout):
    """The placements of `count` units of a fan on a socket: [(R (3x3), offset (3,), scale)] in the studio frame, relative to the socket point. The unit's length is the crest's height over the cosine of the tilt and what is left after the sink; the middle unit is the tallest unless the layout's `centre_scale` (default 1) makes it shorter.
    The layout is the part's own (its sidecar's `layouts.fan`)."""
    n = int(count)
    tilt = math.radians(layout["tilt_back_deg"])
    sink = layout["sink"]
    L = size_of_body * body_h / (math.cos(tilt) * (1 - sink))
    step = math.radians(layout["step_deg"][str(n)]) if n > 1 else 0.0
    out = []
    for i in range(n):
        k = i - (n - 1) / 2
        ang = k * step
        R = rx(-tilt - math.radians(layout["side_back_deg"]) * min(1.0, abs(k))) @ ry(ang) @ rz(math.radians(layout["twist_deg"]) * float(np.sign(k)))
        Lk = L * (float(layout.get("centre_scale", 1.0)) if k == 0 else 1.0)
        off = np.array([math.sin(ang) * layout["base_r"] * L, abs(k) * layout["stagger"] * L, -sink * Lk])
        out.append((C_TRIAL @ R, C_TRIAL @ off, Lk))
    return out


def signature_count(doc, default=3):
    """The signature's count as the file gives it: a number, or a band [lo, hi, type] (the type is the default)."""
    c = (doc.get("signature") or {}).get("count") if isinstance(doc.get("signature"), dict) else None
    if isinstance(c, (int, float)) and not isinstance(c, bool):
        return int(c)
    if isinstance(c, list) and len(c) == 3:
        return int(c[2])
    return default


class MeshBody:
    """The body the studio builds from a mesh file. `.mesh` is the sculpt, `.placed` the parts at their sockets, `.parts` the part ids (the body is 0)."""
    mesh_body = True

    def __init__(self, doc, count=None, size=None):
        self.doc = doc
        m = doc["mesh"]
        self.mesh = MS.Mesh(m["source"])
        self.rig = MR.of(self.mesh) if self.mesh.glb.skin() is not None else None                       # a sculpt with no skin (a broken one the checks are shown) is built as it is
        self.keys = {k["id"]: float(k.get("amount", 0.0)) for k in (doc.get("keys") or [])}
        if self.rig is not None:
            self.Vw, self.mats, self.scales, self.dz = self.rig.rest(doc.get("rig"), self.keys)         # the sculpt with the file's bone scales and shape keys, the feet on the floor
            self.Fw = self.rig.F
        else:
            self.Vw, self.Fw = MS.weld(self.mesh.V, self.mesh.F)
            self.mats, self.scales, self.dz = None, {}, 0.0
        self.parts = {"body": 0}
        self.placed = []
        n = signature_count(doc) if count is None else int(count)
        H = float(self.mesh.sc["bands"]["standing_height"])
        for k, pe in enumerate(m.get("parts", []), start=1):
            sc = MS.load_json(pe["part"])
            g = MS.Glb(MS.os.path.join(MS.abspath(MS.os.path.dirname(pe["part"])), sc["glb"]["file"]))
            V, F, _ = g.triangles()
            Vp, Fp = MS.weld(V, F)
            soc = self.mesh.socket(pe["socket"])
            lay = sc["layouts"][soc["layout"]]
            pl = fan_placements(n, float(lay["size_of_body"]) if size is None else float(size), H, lay)
            point = np.array(soc["point"], float)
            for j, (R, off, L) in enumerate(pl):
                V0 = point + off + (Vp * L) @ R.T
                self.placed.append(dict(name=f"{sc['part']}.{j}", part=k, V0=V0, V=self._carry_part(V0, soc["bone"], self.mats, self.dz), F=Fp, socket=pe["socket"], bone=soc["bone"]))
            self.parts[sc["part"]] = k
        self.ctx = dict(spec=doc, params=dict(mesh=self.mesh.sc["id"], count=n), body_parts=self.parts, balance=self._balance())

    def _carry_part(self, V0, bone, mats, dz):
        """A placed part's rest vertices carried with its socket's bone: the bone's joint, rotation and size (a part is rigid on its socket)."""
        if self.rig is None:
            return V0
        b = self.rig.idx(bone)
        hw, A, _ = mats[b]
        return hw + (V0 - self.rig.head[b]) @ A.T + np.array([0.0, 0.0, dz])

    def carry(self, P):
        """Points of the sculpt's rest (a station, a socket) carried to where this body has them."""
        return self.rig.carry(P, self.mats, self.keys, self.dz) if self.rig is not None else np.atleast_2d(np.asarray(P, float))

    def _balance(self):
        """The centre of mass over the soles on the floor (the cage's own numbers: com, hull, margin, inside), and the vertices' mean against the feet's box as the first sculpt chunk kept it."""
        b = self.rig.balance(self.Vw) if self.rig is not None else {}
        feet = np.array([f["point"][:2] for f in self.mesh.stations()["feet"]], float)
        c = self.Vw[:, :2].mean(0)
        b.update(centre=[round(float(x), 4) for x in c], feet_box=[[round(float(x), 4) for x in feet.min(0)], [round(float(x), 4) for x in feet.max(0)]])
        return b

    def posed(self, clip, i):
        """The proxy mesh dict in frame i of a clip of the armature (the walk): the body skinned, the parts carried with their sockets' bones."""
        if clip not in ("walk",):
            raise ValueError(f"clip is one of walk (this body's armature has {MR.FRAMES} frames of it)")
        V, mats, dz = self.rig.walk(i, self.doc.get("rig"), self.keys)
        Vs, Fs, pt = [V], [self.Fw], [np.zeros(len(V), int)]
        off = len(V)
        for p in self.placed:
            Vs.append(self._carry_part(p["V0"], p["bone"], mats, dz))
            Fs.append(p["F"] + off)
            pt.append(np.full(len(p["V0"]), p["part"]))
            off += len(p["V0"])
        return dict(V=np.concatenate(Vs), F=np.concatenate(Fs), part=np.concatenate(pt), names={v: k for k, v in self.parts.items()}), mats, dz

    def tris(self, with_parts=True):
        """(n, 3, 3) triangles of the body and, when asked, the placed parts."""
        T = [self.Vw[self.Fw]] + ([p["V"][p["F"]] for p in self.placed] if with_parts else [])
        return np.concatenate(T)

    def proxy(self, with_parts=True):
        """The proxy mesh dict (V, F as triangles, part, names): the body then each placed part."""
        Vs, Fs, pt = [self.Vw], [self.Fw], [np.zeros(len(self.Vw), int)]
        off = len(self.Vw)
        if with_parts:
            for p in self.placed:
                Vs.append(p["V"])
                Fs.append(p["F"] + off)
                pt.append(np.full(len(p["V"]), p["part"]))
                off += len(p["V"])
        return dict(V=np.concatenate(Vs), F=np.concatenate(Fs), part=np.concatenate(pt), names={v: k for k, v in self.parts.items()})

    def stamp(self):
        """What the export's build stamp adds: the sculpt and each part by id and the first eight of their sha."""
        out = [f"mesh {self.mesh.sc['id']} {self.mesh.sha[:8]}"]
        for pe in self.doc["mesh"].get("parts", []):
            sc = MS.load_json(pe["part"])
            out.append(f"part {sc['id']} {sc['glb']['sha256'][:8]}")
        return " · ".join(out)

    def digest(self):
        import hashlib
        h = hashlib.sha256(self.mesh.sha.encode())
        for pe in self.doc["mesh"].get("parts", []):
            h.update(MS.load_json(pe["part"])["glb"]["sha256"].encode())
        h.update(str(self.ctx["params"]).encode())
        h.update(str(self.doc.get("rig")).encode())
        h.update(str(self.doc.get("keys")).encode())
        return h.hexdigest()


_BODIES = {}


def body_of(doc):
    """The built body of a file, once per sculpt, rig and key setting (the face stations and the frame ask for it as well as the build)."""
    import json
    k = json.dumps([doc["mesh"], doc.get("rig"), doc.get("keys"), doc.get("signature")], sort_keys=True)
    if k not in _BODIES:
        if len(_BODIES) > 24:
            _BODIES.clear()
        _BODIES[k] = MeshBody(doc)
    return _BODIES[k]


def frame(doc, margin=0.10):
    """The camera framing of a sculpt, as the quadruped's frame is: the centre of the figure's extent and a scale on the house's pixels per H (1 at most) so the whole figure fits across a 304 plate with a margin on each side."""
    b = body_of(doc)
    T = b.tris()
    x_lo, x_hi = float(T[..., 0].min()) - 0.1, float(T[..., 0].max()) + 0.1
    z_hi = float(T[..., 2].max())
    fit = (304.0 / 95.0) * (1 - 2 * margin) / (x_hi - x_lo)
    return dict(centre=[round(0.5 * (x_lo + x_hi), 4), 0.0, round(0.5 * z_hi + 0.05, 4)], scale=round(min(1.0, fit), 4))
