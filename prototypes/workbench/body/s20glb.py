"""Byte-deterministic glb writer for S20 (numpy + json, no Blender): the level-3 mesh with normals, COLOR_0 (the coat, linear), a custom _EMIT (the glow's colour), a per-vertex _PART attribute, a skin (one joint per bone, weights from s20rig),
animations as sampled node TRS (stand, waddle, breathe, idle), and asset.extras.{parts, clips, glow_pulse, blink}. For review only. Reuses gltf_out's buffer helper, quaternion and normal code."""
import json, struct, math
import numpy as np
import gltf_out as GO
import s20coat as CT
import s20rig as RG
import subdiv as SD

FLOAT, USHORT, UINT = GO.FLOAT, GO.USHORT, GO.UINT


def decompose(M):
    S = np.linalg.norm(M[:3, :3], axis=0)
    R = M[:3, :3] / np.maximum(S, 1e-12)
    return M[:3, 3].copy(), GO.quat_from_matrix(R), S


def build(b, rig, prep, path, clips=("stand", "waddle", "breathe", "idle"), extras=None, frames=None):
    """prep: s20render.prepare(...) at the level to write (rest pose). Returns dict(bytes, parts, bones, clips)."""
    ctx = b.ctx
    V, F, attr, part = prep["V0"], prep["F"], prep["attr"], prep["part"]
    parts = {v: k for k, v in b.parts.items()}
    names = [parts[i] for i in range(len(parts))] + ["arm.R", "leg.R"]
    pid = part.astype(np.float32).copy()
    for nm, newid in (("arm.L", len(parts)), ("leg.L", len(parts) + 1)):
        m = (part == b.parts[nm]) & (V[:, 1] < 0)
        pid[m] = newid
    W = rig.weights(V, attr, part)
    J, Wt = GO.top4(W)
    N = GO.vertex_normals(V, F)
    tris = np.array([[f[0], f[1], f[2]] for f in F] + [[f[0], f[2], f[3]] for f in F], np.uint32)
    col_srgb = np.clip(prep["col"], 0, 1).astype(np.float32)          # linear (glTF vertex colours are linear)
    emit = np.clip(prep["emit"], 0, 4).astype(np.float32)
    buf = GO.Buf()
    a_pos = buf.add(V.astype(np.float32), 34962, FLOAT, "VEC3", True)
    a_nor = buf.add(N.astype(np.float32), 34962, FLOAT, "VEC3")
    a_col = buf.add(np.hstack([col_srgb, np.ones((len(V), 1), np.float32)]), 34962, FLOAT, "VEC4")
    a_j = buf.add(J, 34962, USHORT, "VEC4")
    a_w = buf.add(Wt, 34962, FLOAT, "VEC4")
    a_part = buf.add(pid.reshape(-1, 1), 34962, FLOAT, "SCALAR")
    a_emit = buf.add(emit, 34962, FLOAT, "VEC3")
    extra_attr = {}
    for fr, arr in (frames or {}).items():       # the blink's decal frames as extra colour sets (the viewer swaps them)
        extra_attr["_COL" + fr.upper()] = buf.add(np.clip(arr, 0, 1).astype(np.float32), 34962, FLOAT, "VEC3")
    a_idx = buf.add(tris.reshape(-1), 34963, UINT, "SCALAR")
    bn = rig.names
    bidx = {n: i for i, n in enumerate(bn)}
    children = {n: [] for n in bn}
    for n in bn:
        if rig.parent[n]:
            children[rig.parent[n]].append(n)
    nodes = []
    for n in bn:
        h = rig.bones[n][0]
        ph = rig.bones[rig.parent[n]][0] if rig.parent[n] else np.zeros(3)
        nd = dict(name=n, translation=[float(x) for x in (h - ph)])
        if children[n]:
            nd["children"] = [bidx[c] for c in children[n]]
        nodes.append(nd)
    mesh_node = len(nodes)
    nodes.append(dict(name="tuliko", mesh=0, skin=0))
    ibm = np.zeros((len(bn), 4, 4), np.float32)
    for n in bn:
        T = np.eye(4); T[:3, 3] = -rig.bones[n][0]
        ibm[bidx[n]] = T.T.astype(np.float32)
    a_ibm = buf.add(ibm.reshape(-1, 16), None, FLOAT, "MAT4")
    anims = []

    def world(M, n):
        T = np.eye(4); T[:3, 3] = rig.bones[n][0]
        return M[n] @ T

    def sample(poses, period, name):
        times = np.linspace(0, period, len(poses), endpoint=False).astype(np.float32)
        times = np.append(times, np.float32(period)); poses = list(poses) + [poses[0]]
        t_acc = buf.add(times.reshape(-1, 1), None, FLOAT, "SCALAR", True)
        chans, samp = [], []
        for n in bn:
            tr, ro, sc = [], [], []
            for M in poses:
                Wn = world(M, n)
                Lm = np.linalg.inv(world(M, rig.parent[n])) @ Wn if rig.parent[n] else Wn
                t_, q_, s_ = decompose(Lm)
                tr.append(t_); ro.append(q_); sc.append(s_)
            for tgt, arr in (("translation", tr), ("rotation", ro), ("scale", sc)):
                a = buf.add(np.array(arr, np.float32), None, FLOAT, "VEC4" if tgt == "rotation" else "VEC3")
                samp.append(dict(input=t_acc, output=a, interpolation="LINEAR")); chans.append(dict(sampler=len(samp) - 1, target=dict(node=bidx[n], path=tgt)))
        anims.append(dict(name=name, channels=chans, samplers=samp))

    if "stand" in clips:
        sample([rig.stand_pose(), rig.stand_pose()], 1.0, "stand")
    if "waddle" in clips:
        sample([rig.waddle_pose(i / 16)[0] for i in range(16)], 0.9, "waddle")
    if "breathe" in clips:
        sample([rig.pose(breathe=0.02 * math.sin(2 * math.pi * i / 16 - math.pi / 2) * 0.5 + 0.01, tail_yaw=-math.radians(38.0), head_nod=math.radians(-3.0)) for i in range(16)], 3.0, "breathe")
    if "idle" in clips:
        T = 2.2
        poses = []
        for i in range(24):
            ph = i / 24
            poses.append(rig.pose(breathe=0.01 + 0.01 * math.sin(2 * math.pi * ph * (T / 3.0) - 1.57), tail_yaw=-math.radians(38.0), tail_sway=math.radians(8) * math.sin(2 * math.pi * ph),
                                  ear=math.radians(5) * math.sin(2 * math.pi * (ph - 0.07)), head_nod=math.radians(-3.0 + 2.0 * math.sin(2 * math.pi * ph * 0.5)), arm=math.radians(3) * math.sin(2 * math.pi * ph)))
        sample(poses, T, "idle")
    prim = dict(attributes=dict(POSITION=a_pos, NORMAL=a_nor, COLOR_0=a_col, JOINTS_0=a_j, WEIGHTS_0=a_w, _PART=a_part, _EMIT=a_emit, **extra_attr), indices=a_idx, material=0)
    gl = dict(asset=dict(version="2.0", generator="tuliko body build", extras=dict(parts=names, clips=[a["name"] for a in anims] + ["blink (decal frames: open, half, closed, half)"],
                                                                              glow_pulse=dict(period=2.4, range=[0.8, 1.0]), blink=dict(interval=[3.0, 6.0]), **(extras or {}))),
              scene=0, scenes=[dict(nodes=[bidx["root"], mesh_node])], nodes=nodes, skins=[dict(joints=list(range(len(bn))), inverseBindMatrices=a_ibm, skeleton=bidx["root"])],
              meshes=[dict(name="tuliko", primitives=[prim])],
              materials=[dict(name="coat", pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], roughnessFactor=0.66, metallicFactor=0.0))],
              accessors=buf.acc, bufferViews=buf.views, buffers=[dict(byteLength=len(buf.data))], animations=anims)
    js = json.dumps(gl, sort_keys=True, separators=(",", ":")).encode()
    while len(js) % 4:
        js += b" "
    bin_ = bytes(buf.data)
    while len(bin_) % 4:
        bin_ += b"\0"
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(bin_)) + b"BIN\0" + bin_
    open(path, "wb").write(out)
    return dict(bytes=len(out), parts=names, bones=bn, clips=[a["name"] for a in anims])
