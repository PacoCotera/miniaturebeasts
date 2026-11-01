"""Stop 6: shape keys (breath, blink.L/R), clips (breathe, blink, walk, stand) as NLA tracks, the glb. Level-2 geometry for the glb (design §9).
Run (bpy venv):  python stop6.py OUTDIR"""
import sys, os, json, time, math, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
import finish as FN
from stop5 import build_full
from housefield import sstep


GLB_LEVEL = int(os.environ.get("GLB_LEVEL", 3))      # round 3: the glb is baked at level 3 (round 2: level 2); the smile and the cream edge read smoother, the file is about 3x larger


def _verts(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    P = np.array([v.co[:] for v in me.vertices])
    ev.to_mesh_clear()
    return P


def shape_keys(sc, H):
    """breath: the breathing band moves out along the rest normals by 3 % of the local section radius, a morph target of the baked level-2 mesh. The blink is on the lids (finish.add_lids)."""
    ob = sc.final
    me = ob.data
    P = np.array([v.co[:] for v in me.vertices])
    N = np.array([v.normal[:] for v in me.vertices])
    hid = ob.vertex_groups["head"].index
    head_w = np.array([next((g.weight for g in v.groups if g.group == hid), 0.0) for v in me.vertices])
    pc, cc = H.pelvis["c"], H.chest["c"]
    ob.shape_key_add(name="Basis", from_mix=False)
    # breath: the band is the belly, mid and chest-back stations: weight 1 at mid, 0.5 at the belly and the chest back, 0 elsewhere
    t = (P[:, 0] - pc[0]) / (cc[0] - pc[0])
    w = np.clip(1 - np.abs(t - 0.5) / 0.35, 0, 1) * (head_w < 0.5) * (P[:, 2] < H.kc[2] - 0.2)
    axis = np.column_stack([P[:, 0], np.zeros(len(P)), pc[2] + (cc[2] - pc[2]) * np.clip(t, 0, 1)])
    rloc = np.linalg.norm(P - axis, axis=1)
    kb = ob.shape_key_add(name="breath", from_mix=False)
    for i, p in enumerate(P + N * (0.03 * rloc * w)[:, None]):
        kb.data[i].co = p
    return ob.data.shape_keys


def reset_pose(rig):
    for b in rig.pose.bones:
        b.rotation_mode = "QUATERNION"
        b.location = (0, 0, 0)
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)


def set_world(pb, M):
    """Pose bone to an armature-space matrix M applied to its rest matrix (a rotation about a pivot, or a translation)."""
    pb.matrix = M @ pb.bone.matrix_local
    bpy.context.view_layer.update()


def about(pivot, R3):
    R = np.eye(4); R[:3, :3] = R3
    return Matrix.Translation(Vector(pivot)) @ Matrix(R.tolist()) @ Matrix.Translation(-Vector(pivot))


def key_all(rig, frame):
    for b in rig.pose.bones:
        b.keyframe_insert("location", frame=frame)
        b.keyframe_insert("rotation_quaternion", frame=frame)


def make_clips(sc, H, fps=24):
    rig, pb = sc.rig, sc.rig.pose.bones
    scene = sc.scene
    scene.render.fps = fps
    rig.animation_data_create()
    chest_end = H.chest["c"]
    def stand():
        set_world(pb["head"], about(H.kc, H.Rh))
    def clip(name, frames):
        act = bpy.data.actions.new(name)
        rig.animation_data.action = act
        for f, fn in frames:
            reset_pose(rig)
            bpy.context.view_layer.update()
            fn()
            key_all(rig, f)
        tr = rig.animation_data.nla_tracks.new(); tr.name = name
        tr.strips.new(name, 1, act)
        rig.animation_data.action = None
        return act
    def breathe(s):
        def f():
            set_world(pb["neck"], Matrix.Translation(Vector((0, 0, 0.012 * s))))
            stand()
        return f
    def walk(ph):
        def f():
            for name, o in (("fore_upper.L", 0), ("hind_upper.R", 0), ("fore_upper.R", 0.5), ("hind_upper.L", 0.5)):
                a = -math.radians(20) * math.sin(2 * math.pi * (ph + o))     # forward swing is -Y rotation (a leg hangs down)
                lg = next(l for l in H.legs if l["name"].replace(".", "_upper.") == name or l["name"].split(".")[0] + "_upper." + l["name"].split(".")[1] == name)
                piv = lg["top"]      # round 5: the leg already sits on its own side (the old flip put the right legs' pivots on the left)
                R = Ry_(a)
                set_world(pb[name], about(piv, R))
            set_world(pb["chest"], Matrix.Translation(Vector((0, 0, 0.012 * math.cos(4 * math.pi * ph)))))
            stand()
        return f
    out = {}
    out["stand"] = clip("stand", [(1, stand), (2, stand)])
    out["breathe"] = clip("breathe", [(1, breathe(0)), (37, breathe(1)), (73, breathe(0))])
    out["blink_rig"] = clip("blink", [(1, stand), (5, stand)])
    out["walk"] = clip("walk", [(1 + 3 * i, walk(i / 8)) for i in range(9)])
    # shape-key clips on the mesh's Key, in NLA tracks of the same names
    key = sc.final.data.shape_keys
    key.animation_data_create()
    def kclip(name, keys, key=key):
        key.animation_data_create()
        act = bpy.data.actions.new(f"{name}_key.{len(bpy.data.actions)}")
        key.animation_data.action = act
        for f, vals in keys:
            for k, v in vals.items():
                key.key_blocks[k].value = v
                key.key_blocks[k].keyframe_insert("value", frame=f)
        tr = key.animation_data.nla_tracks.new(); tr.name = name
        tr.strips.new(name, 1, act)
        key.animation_data.action = None
        for kb in key.key_blocks:
            kb.value = 0
    kclip("breathe", [(1, {"breath": 0}), (37, {"breath": 1}), (73, {"breath": 0})])
    for lid, nm in zip(sc.lids, ("blink.L", "blink.R")):
        kclip("blink", [(1, {nm: 0}), (3, {nm: 1}), (5, {nm: 0})], lid.data.shape_keys)
    for t in rig.animation_data.nla_tracks:
        t.mute = True
    reset_pose(rig)
    return out


def Ry_(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def head_extent(sc, frame_action=None):
    """Bounding-box size and corner of the vertices owned by the head bone (> 0.5), in the current pose and shape-key values."""
    ob = sc.final
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    hid = {g.name: g.index for g in ev.vertex_groups}["head"]
    P = np.array([v.co[:] for v in me.vertices])
    hw = np.array([next((g.weight for g in v.groups if g.group == hid), 0.0) for v in me.vertices])
    ev.to_mesh_clear()
    Q = P[hw > 0.5]
    return Q.max(0) - Q.min(0), Q.min(0)


def breath_head_test(sc):
    """The head is still while breathing: its bounding box at the breath peak has the rest pose's size within 1e-4 H, and moves by the neck's 0.012 H."""
    rig = sc.rig
    act = bpy.data.actions["breathe"]
    rig.animation_data.action = act
    key = sc.final.data.shape_keys
    sc.scene.frame_set(1)
    s0, c0 = head_extent(sc)
    sc.scene.frame_set(37)
    key.key_blocks["breath"].value = 1.0
    bpy.context.view_layer.update()
    s1, c1 = head_extent(sc)
    key.key_blocks["breath"].value = 0.0
    rig.animation_data.action = None
    reset_pose(rig)
    return dict(size_delta=float(np.abs(s1 - s0).max()), move=(c1 - c0).tolist())


if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1])
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    H, sc, rep = build_full(GLB_LEVEL, os.path.join(OUT, "tex"))
    sc.pose_stand(False)
    shape_keys(sc, H)
    clips = make_clips(sc, H)
    res = dict(build_s=time.time() - t0)
    res["head_still"] = breath_head_test(sc)
    # a Blender-side look at each clip (Workbench-quick Cycles frames are the sheet's job: three.js frames come from the viewer)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "loika.blend"))
    for o in bpy.context.scene.objects:
        o.select_set(False)
    sc.half.hide_viewport = True; sc.floor.hide_viewport = True
    glb = os.path.join(OUT, "loika.glb")
    t1 = time.time()
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True, export_skins=True, export_morph=True, export_animations=True,
                              export_animation_mode="NLA_TRACKS", export_yup=True, use_visible=True)
    res["glb"] = dict(bytes=os.path.getsize(glb), sha256=hashlib.sha256(open(glb, "rb").read()).hexdigest()[:16], export_s=time.time() - t1)
    res["bones"] = len(sc.rig.data.bones)
    res["total_s"] = time.time() - t0
    json.dump(res, open(os.path.join(OUT, "rig-report.json"), "w"), indent=1, default=float)
    print(json.dumps(res, default=float))
