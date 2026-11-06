"""The built body of a mesh file: the same interface the cage builder gives the render, the export and the checks (`parts`, `ctx`, a proxy mesh dict, a frame for the camera), made from a signed sculpt and the library parts the file names.
`MeshBody(doc)` reads the sculpt and its parts (meshsource.py), places each part at its socket (a fan of the part's own layout: count, size) and holds the welded surface the clay and the face decal are drawn on.
Nothing here builds geometry: a file whose sculpt or part is not the pinned one is refused by `mesh.stamp` before it is built."""
import math

import numpy as np

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
        self.Vw, self.Fw = MS.weld(self.mesh.V, self.mesh.F)
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
                self.placed.append(dict(name=f"{sc['part']}.{j}", part=k, V=point + off + (Vp * L) @ R.T, F=Fp, socket=pe["socket"]))
            self.parts[sc["part"]] = k
        self.ctx = dict(spec=doc, params=dict(mesh=self.mesh.sc["id"], count=n), body_parts=self.parts, balance=self._balance())

    def _balance(self):
        """The centre of the body over the four feet: the vertices' mean in x and y against the feet's box."""
        feet = np.array([f["point"][:2] for f in self.mesh.stations()["feet"]], float)
        c = self.Vw[:, :2].mean(0)
        inside = bool(feet[:, 0].min() <= c[0] <= feet[:, 0].max() and feet[:, 1].min() <= c[1] <= feet[:, 1].max())
        return dict(inside=inside, centre=[round(float(x), 4) for x in c], feet_box=[[round(float(x), 4) for x in feet.min(0)], [round(float(x), 4) for x in feet.max(0)]])

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
        return h.hexdigest()


def frame(doc, margin=0.10):
    """The camera framing of a sculpt, as the quadruped's frame is: the centre of the figure's extent and a scale on the house's pixels per H (1 at most) so the whole figure fits across a 304 plate with a margin on each side."""
    b = MeshBody(doc)
    T = b.tris()
    x_lo, x_hi = float(T[..., 0].min()) - 0.1, float(T[..., 0].max()) + 0.1
    z_hi = float(T[..., 2].max())
    fit = (304.0 / 95.0) * (1 - 2 * margin) / (x_hi - x_lo)
    return dict(centre=[round(0.5 * (x_lo + x_hi), 4), 0.0, round(0.5 * z_hi + 0.05, 4)], scale=round(min(1.0, fit), 4))
