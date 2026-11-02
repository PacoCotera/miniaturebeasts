"""Byte-deterministic glb writer for S20 (numpy + json, no Blender): the level-3 mesh with normals, COLOR_0 (the coat, linear), a custom _EMIT (the glow's colour), a per-vertex _PART attribute, a skin (one joint per bone, weights from s20rig),
animations as sampled node TRS (stand, waddle, breathe, idle), and asset.extras.{parts, clips, glow_pulse, blink}. For review only. Reuses gltf_out's buffer helper, quaternion and normal code."""
import json, struct, math
import numpy as np
import gltf_out as GO
import s20coat as CT
import s20rig as RG
import subdiv as SD

FLOAT, USHORT, UINT = GO.FLOAT, GO.USHORT, GO.UINT
GLOW_GAIN = 1.5                 # the emissive texture holds the glow colour at most 1; the material's emissive strength lifts it (the viewer and the Blender renders use the same gain)


def decompose(M):
    S = np.linalg.norm(M[:3, :3], axis=0)
    R = M[:3, :3] / np.maximum(S, 1e-12)
    return M[:3, 3].copy(), GO.quat_from_matrix(R), S


def _png_bytes(arr):
    import tempfile, os
    import s20tex as TX
    fd, p = tempfile.mkstemp(suffix=".png", dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
    os.close(fd)
    TX.write_png(p, arr)
    data = open(p, "rb").read()
    os.remove(p)
    return data


def build(b, rig, M, tex, path, clips=("stand", "waddle", "breathe", "idle"), extras=None):
    """M: s20tex.render_mesh(b, level) (the shipped mesh: smooth normals, UVs, split at the seams). tex: dict(col, emit, rough (padded float arrays 0-255, (h,w,3) / (h,w,3) / (h,w)), frames: {name: (rect (x, y, w, h), patch (h,w,3))}).
    Writes the glb: level-L mesh with NORMAL and TEXCOORD_0, a skin, the sampled clips, the baked atlas as three PNGs (baseColor, emissive, roughness in G) and the blink's eye patches as extra images (asset.extras.blink)."""
    ctx = b.ctx
    V, F4 = M["V"], M["F"]
    vid = M["vid"]
    attr_w, part_w = M["attr"], M["part"]
    parts = {v: k for k, v in b.parts.items()}
    names = [parts[i] for i in range(len(parts))] + ["arm.R", "leg.R"]
    pidw = part_w.astype(np.float32).copy()
    Vw = M["Vw"]
    for nm, newid in (("arm.L", len(parts)), ("leg.L", len(parts) + 1)):
        m = (part_w == b.parts[nm]) & (Vw[:, 1] < 0)
        pidw[m] = newid
    # the loft is ONE part; neck, back, seat and tail are named arc-length ranges of its one path (and the lantern is the bulb on its last stretch)
    G = ctx["T"]
    tid = b.parts["torso"]
    rng = list(G.ranges) + (["lantern"] if G.bulb[0] > 0 else [])
    names[tid] = rng[0]
    new_ids = {rng[0]: tid}
    for r_ in rng[1:]:
        names.append(r_); new_ids[r_] = len(names) - 1
    lab = G.label_of(attr_w[:, 1])
    for r_ in rng:
        m = (part_w == tid) & (lab == r_)
        pidw[m] = new_ids[r_]
    Ww = rig.weights(Vw, attr_w, part_w)
    Jw, Wtw = GO.top4(Ww)
    pid = pidw[vid]
    J, Wt = Jw[vid], Wtw[vid]
    N = M["N"]
    tris = np.array([[f[0], f[1], f[2]] for f in F4] + [[f[0], f[2], f[3]] for f in F4], np.uint32)
    buf = GO.Buf()
    a_pos = buf.add(V.astype(np.float32), 34962, FLOAT, "VEC3", True)
    a_nor = buf.add(N.astype(np.float32), 34962, FLOAT, "VEC3")
    a_uv = buf.add(np.asarray(M["UV"], np.float32), 34962, FLOAT, "VEC2")
    a_j = buf.add(J, 34962, USHORT, "VEC4")
    a_w = buf.add(Wt, 34962, FLOAT, "VEC4")
    a_part = buf.add(pid.reshape(-1, 1), 34962, FLOAT, "SCALAR")
    a_idx = buf.add(tris.reshape(-1), 34963, UINT, "SCALAR")
    images = []
    def add_image(arr):
        data = _png_bytes(arr)
        while len(buf.data) % 4:
            buf.data.append(0)
        off = len(buf.data)
        buf.data += data
        buf.views.append(dict(buffer=0, byteOffset=off, byteLength=len(data)))
        images.append(dict(bufferView=len(buf.views) - 1, mimeType="image/png"))
        return len(images) - 1
    i_col = add_image(tex["col"])
    i_emit = add_image(tex["emit"])
    rr = np.zeros(tex["rough"].shape + (3,), np.float32); rr[..., 1] = tex["rough"] * 255.0; rr[..., 0] = 255.0
    i_rough = add_image(rr)
    blink = []
    for fr, (rect, patch) in (tex.get("frames") or {}).items():
        blink.append(dict(name=fr, image=add_image(patch), rect=[int(x) for x in rect]))
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
    # the CAGE (the quad control mesh the surface is the subdivision of), skinned by the same skeleton: edges as degenerate triangles (a, b, b), drawn as lines by the viewer's Cage toggle
    Cv, Cf, c_attr, c_fp, c_cr, c_mir = b.full()
    cpart = np.rint(c_attr[:, 0]).astype(int)
    Wc = rig.weights(Cv, c_attr, cpart)
    Jc, Wtc = GO.top4(Wc)
    ce = sorted({(min(f[k], f[(k + 1) % 4]), max(f[k], f[(k + 1) % 4])) for f in Cf for k in range(4)})
    c_idx = np.array([[a_, b_, b_] for a_, b_ in ce], np.uint32).reshape(-1)
    cage_node = len(nodes)
    nodes.append(dict(name="cage", mesh=1, skin=0))
    ibm = np.zeros((len(bn), 4, 4), np.float32)
    for n in bn:
        T = np.eye(4); T[:3, 3] = -rig.bones[n][0]
        ibm[bidx[n]] = T.T.astype(np.float32)
    a_ibm = buf.add(ibm.reshape(-1, 16), None, FLOAT, "MAT4")
    c_pos = buf.add(Cv.astype(np.float32), 34962, FLOAT, "VEC3", True)
    c_j = buf.add(Jc, 34962, USHORT, "VEC4")
    c_w = buf.add(Wtc, 34962, FLOAT, "VEC4")
    c_i = buf.add(c_idx, 34963, UINT, "SCALAR")
    anims = []

    def world(M, n):
        T = np.eye(4); T[:3, 3] = rig.bones[n][0]
        return M[n] @ T

    # the breath: a morph target (the chest and belly offset along the radial direction), driven by a weights channel
    dVb = rig.breath(Vw, attr_w, part_w)[vid].astype(np.float32)
    a_morph = buf.add(dVb, 34962, FLOAT, "VEC3", True)

    def sample(poses, period, name, weights=None):
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
        if weights is not None:
            w_ = np.append(np.asarray(weights, np.float32), np.float32(weights[0]))
            a_w2 = buf.add(w_.reshape(-1, 1), None, FLOAT, "SCALAR")
            samp.append(dict(input=t_acc, output=a_w2, interpolation="LINEAR")); chans.append(dict(sampler=len(samp) - 1, target=dict(node=mesh_node, path="weights")))
        anims.append(dict(name=name, channels=chans, samplers=samp))

    if "stand" in clips:
        sample([rig.stand_pose(), rig.stand_pose()], 1.0, "stand")
    if "waddle" in clips:
        sample([rig.waddle_pose(i / 16)[0] for i in range(16)], 0.9, "waddle")
    if "breathe" in clips:
        sample([rig.pose(tail_yaw=-math.radians(38.0), head_nod=math.radians(-3.0)) for i in range(16)], 3.3, "breathe", weights=[0.5 - 0.5 * math.cos(2 * math.pi * i / 16) for i in range(16)])          # about 0.3 Hz
    if "idle" in clips:
        T = 2.2
        poses = []
        for i in range(24):
            ph = i / 24
            poses.append(rig.pose(tail_yaw=-math.radians(38.0), tail_sway=math.radians(8) * math.sin(2 * math.pi * ph),
                                  ear=math.radians(5) * math.sin(2 * math.pi * (ph - 0.07)), head_nod=math.radians(-3.0 + 2.0 * math.sin(2 * math.pi * ph * 0.5)), arm=math.radians(3) * math.sin(2 * math.pi * ph)))
        sample(poses, T, "idle", weights=[0.5 - 0.5 * math.cos(2 * math.pi * i / 24 * (T / 3.3)) for i in range(24)])
    prim = dict(attributes=dict(POSITION=a_pos, NORMAL=a_nor, TEXCOORD_0=a_uv, JOINTS_0=a_j, WEIGHTS_0=a_w, _PART=a_part), indices=a_idx, material=0, targets=[dict(POSITION=a_morph)])
    sampler = dict(magFilter=9729, minFilter=9987, wrapS=33071, wrapT=33071)
    gl = dict(asset=dict(version="2.0", generator="tuliko body build", extras=dict(parts=names, clips=[a["name"] for a in anims] + ["blink (eye patches over the atlas: open, half, closed, half)"],
                                                                              glow_pulse=dict(period=2.4, range=[0.8, 1.0]), blink=dict(interval=[3.0, 6.0], patches=blink, base_image=i_col, atlas=int(tex["col"].shape[0])), counts=dict(cage_vertices=int(len(Cv)), render_vertices=int(len(V)), render_triangles=int(len(tris)), level=int((extras or {}).get("level", 0))), **(extras or {}))),
              scene=0, scenes=[dict(nodes=[bidx["root"], mesh_node, cage_node])], nodes=nodes, skins=[dict(joints=list(range(len(bn))), inverseBindMatrices=a_ibm, skeleton=bidx["root"])],
              meshes=[dict(name="tuliko", primitives=[prim], weights=[0.0], extras=dict(targetNames=["breathe"])), dict(name="cage", primitives=[dict(attributes=dict(POSITION=c_pos, JOINTS_0=c_j, WEIGHTS_0=c_w), indices=c_i, material=0)])],
              samplers=[sampler], images=images, textures=[dict(sampler=0, source=k_) for k_ in range(len(images))],
              materials=[dict(name="coat", pbrMetallicRoughness=dict(baseColorTexture=dict(index=i_col), metallicRoughnessTexture=dict(index=i_rough), metallicFactor=0.0, roughnessFactor=1.0),
                              emissiveTexture=dict(index=i_emit), emissiveFactor=[1.0, 1.0, 1.0], extensions={"KHR_materials_emissive_strength": {"emissiveStrength": GLOW_GAIN}})],
              extensionsUsed=["KHR_materials_emissive_strength"],
              accessors=buf.acc, bufferViews=buf.views, buffers=[dict(byteLength=len(buf.data))], animations=anims)
    js = json.dumps(gl, sort_keys=True, separators=(",", ":")).encode()
    while len(js) % 4:
        js += b" "
    bin_ = bytes(buf.data)
    while len(bin_) % 4:
        bin_ += b"\0"
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(bin_)) + b"BIN\0" + bin_
    open(path, "wb").write(out)
    return dict(bytes=len(out), cage_vertices=int(len(Cv)), parts=names, bones=bn, clips=[a["name"] for a in anims], verts=len(V), tris=len(tris), images=len(images))
