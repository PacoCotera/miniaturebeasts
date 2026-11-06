"""Byte-deterministic glb writer (numpy + json, no Blender): the level-2 mesh with normals, a per-vertex _PART attribute, a skin (one joint per bone, weights from rig.py), a breathe morph target,
animations (stand, walk, breathe) as sampled node TRS, and asset.extras.{parts, clips}. The glb is for review only (body-spec s0.11)."""
import json, struct, math
import numpy as np
import rig as RG


def quat_from_matrix(R):
    t = np.trace(R)
    if t > 0:
        s = math.sqrt(t + 1) * 2
        q = [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, 0.25 * s]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = math.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        q = [0.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s, (R[2, 1] - R[1, 2]) / s]
    elif R[1, 1] > R[2, 2]:
        s = math.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        q = [(R[0, 1] + R[1, 0]) / s, 0.25 * s, (R[1, 2] + R[2, 1]) / s, (R[0, 2] - R[2, 0]) / s]
    else:
        s = math.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        q = [(R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, 0.25 * s, (R[1, 0] - R[0, 1]) / s]
    q = np.array(q)
    q /= np.linalg.norm(q)
    return q if q[3] >= 0 else -q


def vertex_normals(V, F):
    F = np.array(F, int)
    n = np.zeros_like(V)
    for a, b, c in (((0, 1, 2), (0, 2, 3)) if F.shape[1] == 4 else ((0, 1, 2),)):          # quads, or triangles (a sculpt)
        fn = np.cross(V[F[:, b]] - V[F[:, a]], V[F[:, c]] - V[F[:, a]])
        for k in (a, b, c):
            np.add.at(n, F[:, k], fn)
    l = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(l, 1e-12)


def top4(W):
    idx = np.argsort(-W, axis=1, kind="stable")[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
    return idx.astype(np.uint16), w.astype(np.float32)


class Buf:
    def __init__(self):
        self.data = bytearray(); self.views = []; self.acc = []

    def add(self, arr, target=None, ctype=None, atype=None, minmax=False):
        arr = np.ascontiguousarray(arr)
        while len(self.data) % 4:
            self.data.append(0)
        off = len(self.data)
        self.data += arr.tobytes()
        self.views.append(dict(buffer=0, byteOffset=off, byteLength=arr.nbytes, **({"target": target} if target else {})))
        a = dict(bufferView=len(self.views) - 1, componentType=ctype, count=int(arr.shape[0]), type=atype)
        if minmax:
            a["min"] = [float(x) for x in arr.min(0)]; a["max"] = [float(x) for x in arr.max(0)]
        self.acc.append(a)
        return len(self.acc) - 1


FLOAT, USHORT, UINT = 5126, 5123, 5125


def build_glb(body, R, V2, F2, attr2, path, level=2, clips=("stand", "walk", "breathe"), extras=None, material=None):
    parts = dict(body.parts)
    names = [None] * len(parts)
    for k, v in parts.items():
        names[v] = k
    names = names + ["fore.R", "hind.R"]
    pid = np.rint(attr2[:, 0]).astype(int)
    part_f = pid.astype(np.float32).copy()
    for kind in ("fore", "hind"):
        m = (pid == parts[f"{kind}.L"]) & (V2[:, 1] < 0)
        part_f[m] = len(parts) + (0 if kind == "fore" else 1)
    W = R.weights(V2, attr2)
    J, Wt = top4(W)
    bn = list(R.bones)
    N = vertex_normals(V2, F2)
    tris = np.array([[f[0], f[1], f[2]] for f in F2] + [[f[0], f[2], f[3]] for f in F2], np.uint32)
    # the breathe morph: 1.5 % radial offset on the chest band
    xs = V2[:, 0]
    band = RG.smooth(-1.05, -0.8, xs) * (1 - RG.smooth(-0.35, -0.1, xs)) * (pid == parts["torso"])
    ax = np.stack([np.zeros(len(V2)), np.zeros(len(V2)), np.full(len(V2), 0.95)], 1)
    rad = V2 - ax; rad[:, 0] = 0
    delta = (0.015 * band[:, None] * rad).astype(np.float32)
    buf = Buf()
    a_pos = buf.add(V2.astype(np.float32), 34962, FLOAT, "VEC3", True)
    a_nor = buf.add(N.astype(np.float32), 34962, FLOAT, "VEC3")
    a_j = buf.add(J, 34962, USHORT, "VEC4")
    a_w = buf.add(Wt, 34962, FLOAT, "VEC4")
    a_part = buf.add(part_f.reshape(-1, 1), 34962, FLOAT, "SCALAR")
    a_idx = buf.add(tris.reshape(-1), 34963, UINT, "SCALAR")
    a_d = buf.add(delta, 34962, FLOAT, "VEC3", True)
    nodes = []
    bidx = {n: i for i, n in enumerate(bn)}
    children = {n: [] for n in bn}
    for n in bn:
        if R.parent[n]:
            children[R.parent[n]].append(n)
    for n in bn:
        h = R.bones[n][0]
        ph = R.bones[R.parent[n]][0] if R.parent[n] else np.zeros(3)
        nd = dict(name=n, translation=[float(x) for x in (h - ph)])
        if children[n]:
            nd["children"] = [bidx[c] for c in children[n]]
        nodes.append(nd)
    mesh_node = len(nodes)
    nodes.append(dict(name="loika", mesh=0, skin=0))
    root_node = bidx["root"]
    ibm = np.stack([np.eye(4) for _ in bn]).astype(np.float32)
    for n in bn:
        T = np.eye(4); T[:3, 3] = -R.bones[n][0]
        ibm[bidx[n]] = T.T.astype(np.float32)
    a_ibm = buf.add(ibm.reshape(-1, 16), None, FLOAT, "MAT4")
    anims = []
    def sample(poses, period, name):
        times = np.linspace(0, period, len(poses), endpoint=False).astype(np.float32)
        times = np.append(times, np.float32(period)); poses = poses + [poses[0]]
        t_acc = buf.add(times.reshape(-1, 1), None, FLOAT, "SCALAR", True)
        chans, samp = [], []
        for n in bn:
            tr, ro = [], []
            for M in poses:
                Tn = np.eye(4); Tn[:3, 3] = R.bones[n][0]
                Wn = M[n] @ Tn
                if R.parent[n]:
                    Tp = np.eye(4); Tp[:3, 3] = R.bones[R.parent[n]][0]
                    Lm = np.linalg.inv(poses[0][R.parent[n]] @ Tp * 0 + (M[R.parent[n]] @ Tp)) @ Wn
                else:
                    Lm = Wn
                tr.append(Lm[:3, 3]); ro.append(quat_from_matrix(Lm[:3, :3]))
            a_t = buf.add(np.array(tr, np.float32), None, FLOAT, "VEC3")
            a_r = buf.add(np.array(ro, np.float32), None, FLOAT, "VEC4")
            for tgt, a in (("translation", a_t), ("rotation", a_r)):
                samp.append(dict(input=t_acc, output=a, interpolation="LINEAR")); chans.append(dict(sampler=len(samp) - 1, target=dict(node=bidx[n], path=tgt)))
        return chans, samp
    ident = {n: np.eye(4) for n in bn}
    if "stand" in clips:
        c, s = sample([R.stand_pose(), R.stand_pose()], 1.0, "stand"); anims.append(dict(name="stand", channels=c, samplers=s))
    if "walk" in clips:
        poses = [R.walk_pose(i / 16)[0] for i in range(16)]
        c, s = sample(poses, 1.0, "walk"); anims.append(dict(name="walk", channels=c, samplers=s))
    if "breathe" in clips:
        T = 3.2
        times = np.append(np.linspace(0, T, 16, endpoint=False), T).astype(np.float32)
        t_acc = buf.add(times.reshape(-1, 1), None, FLOAT, "SCALAR", True)
        wv = (0.5 - 0.5 * np.cos(2 * np.pi * times / T)).astype(np.float32)
        a_w2 = buf.add(wv.reshape(-1, 1), None, FLOAT, "SCALAR")
        anims.append(dict(name="breathe", channels=[dict(sampler=0, target=dict(node=mesh_node, path="weights"))], samplers=[dict(input=t_acc, output=a_w2, interpolation="LINEAR")]))
    prim = dict(attributes=dict(POSITION=a_pos, NORMAL=a_nor, JOINTS_0=a_j, WEIGHTS_0=a_w, _PART=a_part), indices=a_idx, targets=[dict(POSITION=a_d)], material=0)
    gl = dict(asset=dict(version="2.0", generator="loika body build", extras=dict(parts=names, clips=[a["name"] for a in anims] + ["blink (decal frames)"], level=level, **(extras or {}))),
              scene=0, scenes=[dict(nodes=[root_node, mesh_node])], nodes=nodes, skins=[dict(joints=list(range(len(bn))), inverseBindMatrices=a_ibm, skeleton=root_node)],
              meshes=[dict(name="loika", primitives=[prim], weights=[0.0], extras=dict(targetNames=["breathe"]))],
              materials=[material or dict(name="clay", pbrMetallicRoughness=dict(baseColorFactor=[0.62, 0.6, 0.58, 1], roughnessFactor=0.85, metallicFactor=0.0))],
              accessors=buf.acc, bufferViews=buf.views, buffers=[dict(byteLength=len(buf.data))], animations=anims)
    js = json.dumps(gl, sort_keys=True, separators=(",", ":")).encode()
    while len(js) % 4:
        js += b" "
    bin_ = bytes(buf.data)
    while len(bin_) % 4:
        bin_ += b"\0"
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(bin_)) + b"BIN\0" + bin_
    open(path, "wb").write(out)
    return dict(bytes=len(out), parts=names, bones=bn)
