"""The mesh body source (numpy and json only, no Blender): a kind's body as a signed file, and the library parts that sit on it.
A sculpt is `species_v1/meshes/<kind>/<kind>-m<n>.glb` with its sidecar `<kind>-m<n>.json` (schema `mb-mesh/1`): the GLB's sha256 and size, the family and its armature, the stations (eyes, mouth, sockets, feet), the measured bands,
the silhouette match against the stand and the provenance. A part is `species_v1/parts/<P id>/<P id>-p<n>.glb` with a sidecar of schema `mb-part/1`. Versions are append-only; the species file pins each GLB's sha256.
The GLB holds one watertight body piece with its armature and skin and no colour or normal texture. Its zone map is an index image kept in the file's `asset.extras.zonemap` (a PNG in an image no material uses).
`load(sidecar)` reads a sculpt back into arrays; the checks (checks/mesh.py) and the built body (meshbody.py) read it through here. The import from a cleaned sculpt is in meshimport.py (Blender)."""
import hashlib
import json
import os
import struct

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SPECIES_DIR = os.path.join(HERE, "species_v1")
SCHEMA_MESH = "mb-mesh/1"
SCHEMA_PART = "mb-part/1"
MAX_BYTES = 3 * 1024 * 1024               # a body GLB
MAX_PART_BYTES = 1024 * 1024              # a part GLB
BUDGET = (12000, 20000)                   # triangles in a body
PART_BUDGET = (1000, 12000)
COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
SOCKET_LAYOUTS = ("fan", "row", "pair", "single")

# The family armatures a sculpt is fitted with: the bone names are the quadruped family's (qrig.py): spine (front, rear, head), the tail (only on a sculpt that has one), four legs of three bones.
ARMATURES = {"trotter": dict(version=1, spine=["rear", "front", "head"], tail=["tail1", "tail2", "tail3"], legs=[f"{k}.{b}.{s}" for k in ("fore", "hind") for s in ("L", "R") for b in ("upper", "lower", "paw")])}


def armature_bones(family, tail=False, sockets=()):
    a = ARMATURES[family]
    return list(a["spine"]) + (list(a["tail"]) if tail else []) + list(a["legs"]) + [f"socket.{s}" for s in sockets]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def abspath(rel):
    """A path in a species file or sidecar (relative to species_v1) as a file path."""
    return rel if os.path.isabs(rel) else os.path.join(SPECIES_DIR, rel)


# ------------------------------------------------------------------------------------------------------------------------------------------------------ the GLB
def zup(P):
    """glTF is Y up; the studio is Z up with the creature facing +x: (x, y, z) of the file is (x, -z, y) here."""
    P = np.asarray(P, float)
    return np.stack([P[..., 0], -P[..., 2], P[..., 1]], -1)


class Glb:
    """A GLB as numpy reads it: the JSON, the binary chunk and accessors."""
    def __init__(self, path):
        with open(path, "rb") as fh:
            b = fh.read()
        self.bytes = len(b)
        if b[:4] != b"glTF":
            raise ValueError(f"{os.path.basename(path)}: not a glb")
        n = struct.unpack("<I", b[12:16])[0]
        self.json = json.loads(b[20:20 + n])
        m = struct.unpack("<I", b[20 + n:24 + n])[0]
        self.bin = b[28 + n:28 + n + m]

    def accessor(self, i):
        a = self.json["accessors"][i]
        bv = self.json["bufferViews"][a["bufferView"]]
        dt, k = COMP[a["componentType"]], NCOMP[a["type"]]
        off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        arr = np.frombuffer(self.bin, dt, a["count"] * k, off).reshape(a["count"], k)
        return arr[:, 0] if k == 1 else arr

    def view(self, i):
        bv = self.json["bufferViews"][i]
        off = bv.get("byteOffset", 0)
        return self.bin[off:off + bv["byteLength"]]

    def primitives(self):
        return [p for m in self.json.get("meshes", []) for p in m["primitives"]]

    def triangles(self):
        """(V, F, UV) of the first mesh: positions, triangles, and UV or None."""
        p = self.primitives()[0]
        at = p["attributes"]
        V = zup(self.accessor(at["POSITION"]).astype(float))
        F = self.accessor(p["indices"]).reshape(-1, 3).astype(int)
        UV = self.accessor(at["TEXCOORD_0"]).astype(float) if "TEXCOORD_0" in at else None
        return V, F, UV

    def skin(self):
        """(joint names, J (n,4), W (n,4)) or None."""
        p = self.primitives()[0]
        at = p["attributes"]
        if not self.json.get("skins") or "JOINTS_0" not in at:
            return None
        names = [self.json["nodes"][j].get("name") for j in self.json["skins"][0]["joints"]]
        return names, self.accessor(at["JOINTS_0"]).astype(int), self.accessor(at["WEIGHTS_0"]).astype(float)

    def joint_world(self):
        """{joint name: (head position, parent name)} in the bind pose: world positions of the skin's joints."""
        nodes = self.json["nodes"]
        parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
        loc = {}
        for i, n in enumerate(nodes):
            M = np.eye(4)
            x, y, z, w = n.get("rotation", [0, 0, 0, 1])
            R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
            M[:3, :3] = R * np.array(n.get("scale", [1, 1, 1]))
            M[:3, 3] = n.get("translation", [0, 0, 0])
            loc[i] = M
        world = {}

        def w_(i):
            if i not in world:
                world[i] = loc[i] if i not in parent else w_(parent[i]) @ loc[i]
            return world[i]
        out = {}
        for j in self.json["skins"][0]["joints"]:
            out[nodes[j].get("name")] = (zup(w_(j)[:3, 3]), nodes[parent[j]].get("name") if j in parent else None)
        return out

    def zone_map(self):
        """(PNG bytes, meta) of the zone map declared in asset.extras.zonemap, or None."""
        z = ((self.json.get("asset") or {}).get("extras") or {}).get("zonemap")
        if not z:
            return None
        return self.view(self.json["images"][z["image"]]["bufferView"]), z

    def flat_faults(self):
        """What makes the file not flat: a colour, normal, emissive, occlusion or metal-rough texture on any material, or an image no zone map declares."""
        bad = []
        zi = (((self.json.get("asset") or {}).get("extras") or {}).get("zonemap") or {}).get("image")
        for m in self.json.get("materials", []):
            pbr = m.get("pbrMetallicRoughness", {})
            for k in ("baseColorTexture", "metallicRoughnessTexture"):
                if k in pbr:
                    bad.append(f"{m.get('name', 'material')}: {k}")
            for k in ("normalTexture", "emissiveTexture", "occlusionTexture"):
                if k in m:
                    bad.append(f"{m.get('name', 'material')}: {k}")
        for i, im in enumerate(self.json.get("images", [])):
            if i != zi:
                bad.append(f"image {i} ({im.get('name', 'unnamed')}) is not the zone map")
        return bad


def add_zone_map(path, png_bytes, meta):
    """Write the zone map into the GLB at `path` as an image no material uses, declared in asset.extras.zonemap. Rewrites the file."""
    with open(path, "rb") as fh:
        b = fh.read()
    n = struct.unpack("<I", b[12:16])[0]
    js = json.loads(b[20:20 + n])
    m = struct.unpack("<I", b[20 + n:24 + n])[0]
    bin_ = bytearray(b[28 + n:28 + n + m])
    while len(bin_) % 4:
        bin_.append(0)
    off = len(bin_)
    bin_ += png_bytes
    js.setdefault("bufferViews", []).append(dict(buffer=0, byteOffset=off, byteLength=len(png_bytes)))
    js.setdefault("images", []).append(dict(mimeType="image/png", bufferView=len(js["bufferViews"]) - 1, name="zonemap"))
    js.setdefault("asset", {}).setdefault("extras", {})["zonemap"] = dict(meta, image=len(js["images"]) - 1)
    write_glb(path, js, bytes(bin_))


def write_glb(path, js, bin_):
    j = json.dumps(js, separators=(",", ":")).encode()
    while len(j) % 4:
        j += b" "
    bin_ = bytes(bin_) + b"\0" * (-len(bin_) % 4)
    js["buffers"] = [dict(byteLength=len(bin_))]
    j = json.dumps(js, separators=(",", ":")).encode()
    while len(j) % 4:
        j += b" "
    with open(path, "wb") as fh:
        fh.write(b"glTF" + struct.pack("<II", 2, 12 + 8 + len(j) + 8 + len(bin_)) + struct.pack("<I4s", len(j), b"JSON") + j + struct.pack("<I4s", len(bin_), b"BIN\0") + bin_)


def set_extras(path, **kv):
    """Merge keys into the GLB's asset.extras (the export's build stamp), keeping everything else."""
    with open(path, "rb") as fh:
        b = fh.read()
    n = struct.unpack("<I", b[12:16])[0]
    js = json.loads(b[20:20 + n])
    m = struct.unpack("<I", b[20 + n:24 + n])[0]
    js.setdefault("asset", {}).setdefault("extras", {}).update(kv)
    write_glb(path, js, b[28 + n:28 + n + m])


# ------------------------------------------------------------------------------------------------------------------------------------------------------ the mesh as numbers
def weld(V, F, tol=1e-6):
    """(Vw, Fw): vertices merged by position (a UV seam splits a vertex in the file; the surface does not)."""
    key = np.round(np.asarray(V, float) / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    return np.asarray(V, float)[first], inv[np.asarray(F, int)]


def topology(F, nv):
    """(boundary edges, non-manifold edges, pieces) of a welded triangle mesh."""
    E = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    u, cnt = np.unique(E, axis=0, return_counts=True)
    boundary, nonman = int((cnt == 1).sum()), int((cnt > 2).sum())
    par = np.arange(nv)

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for a, b in u:
        ra, rb = find(a), find(b)
        if ra != rb:
            par[ra] = rb
    used = np.unique(F)
    pieces = len({find(int(a)) for a in used})
    return boundary, nonman, pieces


def vertex_normals(V, F):
    n = np.zeros_like(V)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3):
        np.add.at(n, F[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def adjacency(F, nv):
    E = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    E = np.unique(E, axis=0)
    return E


def smooth(V, F, iters=12, lam=0.5, mu=-0.53):
    """Taubin smoothing: the surface without its fine relief, the same size."""
    E = adjacency(F, len(V))
    deg = np.bincount(np.r_[E[:, 0], E[:, 1]], minlength=len(V)).astype(float)
    P = V.copy()
    for _ in range(iters):
        for k in (lam, mu):
            S = np.zeros_like(P)
            np.add.at(S, E[:, 0], P[E[:, 1]])
            np.add.at(S, E[:, 1], P[E[:, 0]])
            P = P + k * (S / np.maximum(deg, 1)[:, None] - P)
    return P


def relief(V, F, iters=12):
    """The sculpt's relief: how far each vertex stands off a smoothed copy of itself along the normal, in H. Returns (offsets, the 99.8th percentile of their magnitude)."""
    Vw, Fw = weld(V, F)
    S = smooth(Vw, Fw, iters)
    d = np.einsum("ij,ij->i", Vw - S, vertex_normals(S, Fw))
    return d, float(np.percentile(np.abs(d), 99.8))


RELIEF_THR = 0.005         # a vertex stands off the smoothed copy by more than this (H) to count as relief
LINE_MIN, LINE_ASPECT = 0.6, 5.0          # a run of relief this long (H) and this much longer than wide is a groove or a ridge


def relief_features(V, F, thr=RELIEF_THR, iters=6):
    """Grooves, ridges and raised rings: clusters of connected vertices standing off the smoothed copy, kept when they run long and thin (a stripe) or round a hollow (a ring). The ears, toes and nose of a smooth sculpt are compact blobs and pass.
    Returns [dict(kind, length, width, vertices, centre)] longest first."""
    Vw, Fw = weld(V, F)
    S = smooth(Vw, Fw, iters)
    d = np.einsum("ij,ij->i", Vw - S, vertex_normals(S, Fw))
    on = np.abs(d) > thr
    E = adjacency(Fw, len(Vw))
    E = E[on[E[:, 0]] & on[E[:, 1]]]
    par = np.arange(len(Vw))

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for a, b in E:
        ra, rb = find(a), find(b)
        if ra != rb:
            par[ra] = rb
    groups = {}
    for i in np.where(on)[0]:
        groups.setdefault(find(int(i)), []).append(int(i))
    out = []
    for v in groups.values():
        if len(v) < 6:
            continue
        P = Vw[v]
        c = P.mean(0)
        ev = np.linalg.eigvalsh(np.cov((P - c).T))
        length, width = float(np.sqrt(ev[-1]) * 3.46), float(np.sqrt(max(ev[-2], 1e-12)) * 3.46)
        r = float(np.sqrt(ev[-1] + ev[-2]) * 1.4)
        hollow = float(np.linalg.norm(P - c, axis=1).min())
        kind = "stripe" if (length >= LINE_MIN and length / max(width, 1e-6) >= LINE_ASPECT) else ("ring" if (length >= 0.2 and width >= 0.8 * length and hollow > 0.6 * r) else None)
        if kind:
            out.append(dict(kind=kind, length=round(length, 4), width=round(width, 4), vertices=len(v), centre=[float(x) for x in c]))
    return sorted(out, key=lambda r: -r["length"])


def height(V):
    return float(V[:, 2].max() - V[:, 2].min())


# ------------------------------------------------------------------------------------------------------------------------------------------------------ rasterising a silhouette
def silhouette(T, az, el, size, ppH, centre):
    """A boolean mask (h, w) of triangles T (n,3,3) seen from azimuth az (degrees from +x toward +y) and elevation el, orthographic, ppH pixels per H, `centre` at the picture's centre."""
    w, h = size
    a, e = np.radians(az), np.radians(el)
    p = np.array([np.cos(a) * np.cos(e), np.sin(a) * np.cos(e), np.sin(e)])
    f = -p
    r = np.cross(f, [0, 0, 1.0])
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    c = np.asarray(centre, float)
    X = (T @ r - c @ r) * ppH + w / 2.0
    Y = h / 2.0 - (T @ u - c @ u) * ppH
    m = np.zeros((h, w), bool)
    for tx, ty in zip(X, Y):
        x0, x1 = int(max(np.floor(tx.min()), 0)), int(min(np.ceil(tx.max()), w - 1))
        y0, y1 = int(max(np.floor(ty.min()), 0)), int(min(np.ceil(ty.max()), h - 1))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (ty[1] - ty[2]) * (tx[0] - tx[2]) + (tx[2] - tx[1]) * (ty[0] - ty[2])
        if abs(d) < 1e-12:
            continue
        l1 = ((ty[1] - ty[2]) * (gx - tx[2]) + (tx[2] - tx[1]) * (gy - ty[2])) / d
        l2 = ((ty[2] - ty[0]) * (gx - tx[2]) + (tx[0] - tx[2]) * (gy - ty[2])) / d
        inside = (l1 >= -1e-9) & (l2 >= -1e-9) & (1 - l1 - l2 >= -1e-9)
        m[y0:y1 + 1, x0:x1 + 1] |= inside
    return m


def bbox_norm(m, n=160):
    """The mask cut to its bounding box and fitted into an n by n square (the shape, not the size or place)."""
    ys, xs = np.where(m)
    if not len(ys):
        return np.zeros((n, n), bool)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    s = n / max(h, w)
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    yy = np.minimum((np.arange(nh) / s).astype(int), h - 1)
    xx = np.minimum((np.arange(nw) / s).astype(int), w - 1)
    out = np.zeros((n, n), bool)
    y0, x0 = (n - nh) // 2, (n - nw) // 2
    out[y0:y0 + nh, x0:x0 + nw] = m[np.ix_(yy, xx)]
    return out


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ the sidecars
def load_json(path):
    with open(abspath(path)) as fh:
        return json.load(fh)


def write_json(path, doc):
    with open(path, "w") as fh:
        json.dump(doc, fh, indent=1, sort_keys=False)
        fh.write("\n")


def sidecar_problems(sc, kind="mesh"):
    """The faults of a sidecar's own shape, one line each."""
    out = []
    want = SCHEMA_MESH if kind == "mesh" else SCHEMA_PART
    if sc.get("schema") != want:
        out.append(f"schema is {sc.get('schema')!r}, not {want}")
    keys = ("id", "glb", "family", "armature", "stations", "bands", "read", "provenance") if kind == "mesh" else ("id", "glb", "type", "motion", "sockets", "pile", "provenance", "approved")
    for k in keys:
        if k not in sc:
            out.append(f"{k} is missing")
    return out


class Mesh:
    """A sculpt read back: the sidecar, the GLB, its welded surface and its skin."""
    def __init__(self, sidecar_rel):
        self.rel = sidecar_rel
        self.path = abspath(sidecar_rel)
        self.dir = os.path.dirname(self.path)
        self.sc = load_json(self.path)
        self.glb_path = os.path.join(self.dir, self.sc["glb"]["file"])
        self.glb = Glb(self.glb_path)
        self.V, self.F, self.UV = self.glb.triangles()

    @property
    def sha(self):
        return sha256_file(self.glb_path)

    def stations(self):
        return self.sc["stations"]

    def socket(self, sid):
        return next((s for s in self.sc["stations"].get("sockets", []) if s["id"] == sid), None)

    def triangles(self):
        return self.V[self.F]


def mesh_dir_of(species_id):
    return os.path.join(SPECIES_DIR, "meshes", species_id)


def part_dir_of(part_id):
    return os.path.join(SPECIES_DIR, "parts", part_id)


def list_meshes(species_id):
    d = mesh_dir_of(species_id)
    return sorted(f for f in os.listdir(d) if f.endswith(".json")) if os.path.isdir(d) else []
