"""Byte-deterministic glb writer for the quadruped plan (numpy + json, no Blender), the counterpart of s20glb: the level-1 mesh the render draws, with normals, a per-vertex _PART attribute, a skin (one joint per bone of qrig, weights from qrig),
the breathe as a morph target, the clips (stand, walk, breathe, sit, curl) as sampled node TRS, the cage as a skinned line mesh, and asset.extras.{parts, clips, bones, counts, ...}. The quadruped has no coat yet, so the material is the clay's flat colour
and there are no textures. Nothing here names a species: the parts, the bones and the clips come from the built cage and its rig. For review only."""
import json
import math
import struct

import numpy as np

import gltf_out as GO
import qrig as QR

FLOAT, USHORT, UINT = GO.FLOAT, GO.USHORT, GO.UINT
CLIPS = ("stand", "walk", "breathe", "sit", "curl")
SAMPLES = dict(stand=1, walk=12, breathe=12, sit=1, curl=1)          # how many poses of a loop are written (the walk's twelve are the render's own frames; the breath is sampled finer, as it rides on one weight)
CLAY = [0.62, 0.6, 0.58, 1.0]


def heads(rig):
    """Where each bone's pivot stands at rest."""
    h = {"front": rig.chest0, "rear": rig.pelvis0, "head": rig.neck0, "tail1": rig.tail0[0], "tail2": rig.tail0[1], "tail3": rig.tail0[2]}
    for (kind, side), L in rig.leg.items():
        P = L["P"]
        h[f"{kind}.upper.{side}"], h[f"{kind}.lower.{side}"], h[f"{kind}.paw.{side}"], h[f"{kind}.foot.{side}"] = P[0], P[1], P[2], L["A0"]
    return {k: np.asarray(v, float) for k, v in h.items()}


def part_names(names, V, part):
    """The part names in id order, with a right-hand part (`x.R`) made of the vertices of every `x.L` part that lie on the right; returns (names, the part id of each vertex as float32)."""
    ids = [names[i] for i in sorted(names)]
    pid = np.asarray(part, np.float32).copy()
    for i, nm in enumerate(list(ids)):
        if nm.endswith(".L"):
            ids.append(nm[:-2] + ".R")
            pid[(np.asarray(part) == i) & (np.asarray(V)[:, 1] < 0)] = len(ids) - 1
    return ids, pid


def overlay(rig):
    """The joint-to-joint bones for the viewer's Bones mode: points (name, the bone that carries each, rest position), segments (a, b, the range that colours it), the ranges and the head's pivot."""
    J = rig.J
    pts, segs, idx = [], [], {}

    def P(name, bone, key=None):
        idx[name] = len(pts)
        pts.append(dict(name=name, bone=bone, p=[float(x) for x in J[key or name]]))

    def S(a, b, rng, name):
        segs.append(dict(a=idx[a], b=idx[b], range=rng, name=name))
    P("nose", "head"); P("neck.top", "head"); P("neck.base", "head"); P("chest", "front"); P("pelvis", "rear")
    P("tail.root", "tail1"); P("tail.t1", "tail2"); P("tail.t2", "tail3"); P("tail.t3", "tail3")
    S("nose", "neck.top", "head", "head"); S("neck.top", "neck.base", "neck", "neck"); S("neck.base", "chest", "neck", "neck")
    S("chest", "pelvis", "back", "back"); S("pelvis", "tail.root", "seat", "seat")
    S("tail.root", "tail.t1", "tail", "tail 1"); S("tail.t1", "tail.t2", "tail", "tail 2"); S("tail.t2", "tail.t3", "tail", "tail 3")
    for kind, g in (("fore", "chest"), ("hind", "pelvis")):
        first, second = ("shoulder", "elbow") if kind == "fore" else ("hip", "knee")
        third = "wrist" if kind == "fore" else "hock"
        for side in QR.SIDES:
            keys = [f"{kind}.{n}.{side}" for n in (first, second, third, "sole")]
            for k, b in zip(keys, ("upper", "lower", "paw", "foot")):
                P(k, f"{kind}.{b}.{side}")
            S(g, keys[0], "shoulder" if kind == "fore" else "hip", f"{kind} girdle {side}")
            for a, b in zip(keys, keys[1:]):
                S(a, b, "limb", f"{kind} leg {side}")
    return dict(points=pts, segs=segs, ranges=["head", "neck", "back", "seat", "tail", "limb", "shoulder", "hip"], pivot=idx["neck.base"])


def _quat(M):
    return GO.quat_from_matrix(np.asarray(M)[:3, :3])


def build(body, rig, mesh, path, extras=None, level=1):
    """body: the built cage (quadruped.build); rig, mesh: qrig.rig_of(body, level) (the render's own mesh and rig). Writes the glb; returns dict(bytes, parts, bones, clips, verts, tris, cage_vertices)."""
    V = np.asarray(mesh["V"], float)
    F4 = np.asarray(mesh["F"], int)
    names, pid = part_names(mesh["names"], V, mesh["part"])
    J, Wt = GO.top4(rig.W)
    N = GO.vertex_normals(V, F4)
    tris = np.array([[f[0], f[1], f[2]] for f in F4] + [[f[0], f[2], f[3]] for f in F4], np.uint32)
    bn = list(rig.bones)
    hd = heads(rig)
    nodes = [dict(name="root", children=[1 + i for i in range(len(bn))])] + [dict(name=n, translation=[float(x) for x in hd[n]]) for n in bn]
    bidx = {n: 1 + i for i, n in enumerate(bn)}
    mesh_node = len(nodes)
    nodes.append(dict(name="model", mesh=0, skin=0))
    # the cage (the control mesh the surface is the subdivision of), skinned by the same skeleton: edges as degenerate triangles, drawn as lines by the viewer's Cage toggle
    rig0, mesh0 = QR.rig_of(body, 0)
    Cv, Cf = np.asarray(mesh0["V"], float), np.asarray(mesh0["F"], int)
    Jc, Wtc = GO.top4(rig0.W)
    ce = sorted({(min(f[k], f[(k + 1) % 4]), max(f[k], f[(k + 1) % 4])) for f in Cf for k in range(4)})
    c_idx = np.array([[a_, b_, b_] for a_, b_ in ce], np.uint32).reshape(-1)
    cage_node = len(nodes)
    nodes.append(dict(name="cage", mesh=1, skin=0))
    buf = GO.Buf()
    a_pos = buf.add(V.astype(np.float32), 34962, FLOAT, "VEC3", True)
    a_nor = buf.add(N.astype(np.float32), 34962, FLOAT, "VEC3")
    a_j = buf.add(J, 34962, USHORT, "VEC4")
    a_w = buf.add(Wt, 34962, FLOAT, "VEC4")
    a_part = buf.add(pid.reshape(-1, 1), 34962, FLOAT, "SCALAR")
    a_idx = buf.add(tris.reshape(-1), 34963, UINT, "SCALAR")
    ibm =np.zeros((len(bn), 4, 4), np.float32)
    for n in bn:
        T = np.eye(4)
        T[:3, 3] = -hd[n]
        ibm[bn.index(n)] = T.T.astype(np.float32)
    a_ibm = buf.add(ibm.reshape(-1, 16), None, FLOAT, "MAT4")
    c_pos = buf.add(Cv.astype(np.float32), 34962, FLOAT, "VEC3", True)
    c_j = buf.add(Jc, 34962, USHORT, "VEC4")
    c_w = buf.add(Wtc, 34962, FLOAT, "VEC4")
    c_i = buf.add(c_idx, 34963, UINT, "SCALAR")
    a_morph = buf.add(rig.breath_displacement(1.0).astype(np.float32), 34962, FLOAT, "VEC3", True)       # the breath: the chest and belly offset at full inhale, driven by a weights channel
    anims = []

    def pose_of(clip, i, n):
        return QR.Pose() if clip == "stand" else QR.clip_pose(rig, clip, i / n)

    def sample(clip):
        n = SAMPLES[clip]
        period = 1.0 if n == 1 else float(QR.PERIOD[clip])
        poses = [rig.bone_matrices(pose_of(clip, i, n)) for i in range(n)]
        if n == 1:
            poses = poses * 2
        times = np.linspace(0, period, len(poses), endpoint=False).astype(np.float32) if n > 1 else np.array([0.0], np.float32)
        times = np.append(times, np.float32(period))
        poses = poses + [poses[0]] if n > 1 else poses
        t_acc = buf.add(times.reshape(-1, 1), None, FLOAT, "SCALAR", True)
        chans, samp = [], []
        for nm in bn:
            tr, ro = [], []
            for M in poses:
                T = np.eye(4)
                T[:3, 3] = hd[nm]
                W = M[nm] @ T
                tr.append(W[:3, 3].copy())
                ro.append(_quat(W))
            for tgt, arr in (("translation", tr), ("rotation", ro)):
                a = buf.add(np.array(arr, np.float32), None, FLOAT, "VEC4" if tgt == "rotation" else "VEC3")
                samp.append(dict(input=t_acc, output=a, interpolation="LINEAR"))
                chans.append(dict(sampler=len(samp) - 1, target=dict(node=bidx[nm], path=tgt)))
        if clip == "breathe":
            w_ = np.array([0.5 - 0.5 * math.cos(2 * math.pi * i / n) for i in range(n)] + [0.0], np.float32)
            a_w2 = buf.add(w_.reshape(-1, 1), None, FLOAT, "SCALAR")
            samp.append(dict(input=t_acc, output=a_w2, interpolation="LINEAR"))
            chans.append(dict(sampler=len(samp) - 1, target=dict(node=mesh_node, path="weights")))
        anims.append(dict(name=clip, channels=chans, samplers=samp))

    for clip in CLIPS:
        sample(clip)
    prim = dict(attributes=dict(POSITION=a_pos, NORMAL=a_nor, JOINTS_0=a_j, WEIGHTS_0=a_w, _PART=a_part), indices=a_idx, material=0, targets=[dict(POSITION=a_morph)])
    gl = dict(asset=dict(version="2.0", generator="quadruped body build", extras=dict(bones=overlay(rig), parts=names, clips=[a["name"] for a in anims],
                                                                                 counts=dict(cage_vertices=int(len(Cv)), render_vertices=int(len(V)), render_triangles=int(len(tris)), level=int(level)), **(extras or {}))),
              scene=0, scenes=[dict(nodes=[0, mesh_node, cage_node])], nodes=nodes, skins=[dict(joints=[bidx[n] for n in bn], inverseBindMatrices=a_ibm, skeleton=0)],
              meshes=[dict(name="model", primitives=[prim], weights=[0.0], extras=dict(targetNames=["breathe"])), dict(name="cage", primitives=[dict(attributes=dict(POSITION=c_pos, JOINTS_0=c_j, WEIGHTS_0=c_w), indices=c_i, material=0)])],
              materials=[dict(name="clay", pbrMetallicRoughness=dict(baseColorFactor=CLAY, roughnessFactor=0.85, metallicFactor=0.0))],
              accessors=buf.acc, bufferViews=buf.views, buffers=[dict(byteLength=len(buf.data))], animations=anims)
    js = json.dumps(gl, sort_keys=True, separators=(",", ":")).encode()
    while len(js) % 4:
        js += b" "
    bin_ = bytes(buf.data)
    while len(bin_) % 4:
        bin_ += b"\0"
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(bin_)) + b"BIN\0" + bin_
    with open(path, "wb") as fh:
        fh.write(out)
    return dict(bytes=len(out), cage_vertices=int(len(Cv)), parts=names, bones=bn, clips=[a["name"] for a in anims], verts=len(V), tris=len(tris), images=0)
