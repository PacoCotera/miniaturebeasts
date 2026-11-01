"""Loika whole, in Blender (5.2.3, bpy module or binary): cages from parts.py -> one half cage -> Mirror (local Y, Bisect, Merge) -> Subdivision Surface
-> Armature (construction weights) -> Cycles sprites in the house's light and camera.  House axes under one root rotated -90 degrees about Z.
Run:  python build.py OUTDIR [--views=stand,side,front]  (venv with bpy)   or   blender -b --factory-startup --python build.py -- OUTDIR ..."""
import sys, os, math, json, time, hashlib, struct, zlib
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from housefield import House, Rz, Ry, Rx, sstep, find_front
from parts import build_head, head_features, build_torso, build_leg, build_paw, paw_beans, CAGE_A
from cage import fit

LIT, SHADE_RATIO = 1.1, 0.60      # the key scale and the fill ratio parameter: calibrated on a sphere (calib.py), then on Loika
MASTER_ALPHA_H = 288      # px, the S01 master's alpha height at 304 (tools/master-height.mjs): framing reference


def lin(c):   # an sRGB 0..255 colour to linear
    c = np.asarray(c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# ============================================================================================== cages
def make_cages(H, join="A", beans=True, log=None):
    """All parts, fitted. Returns an ordered list of Cage. Head in world rest coordinates (K centre kc)."""
    rep = {}
    cages = []
    head = build_head(H); head.fix_winding()
    rep["head"] = fit(head, H.d0)
    feat = head_features(H, head)
    head.fix_winding()
    # to world rest coordinates (the head's origin is kc)
    head.set_arr(head.arr() + H.kc)
    head.feat = feat
    torso = build_torso(H); torso.fix_winding()
    rep["torso"] = fit(torso, H.dTorso)
    cages += [head, torso]
    if join == "B":
        import join_b
    b_legs = []
    for lg in H.legs:
        if lg["side"] != 1:
            continue           # the left legs only: the Mirror makes the right (the near fore paw's lead-paw is dropped by that: see report)
        leg = build_leg(H, lg); leg.fix_winding()
        if join == "B":
            b_legs.append((build_leg(H, lg), lg))          # joined to the torso below, all four legs in one cage (round 2: B on every leg)
            leg = None
        else:
            rep["leg." + lg["name"]] = fit(leg, lg["d_column"])
        paw = build_paw(H, lg); paw.fix_winding()
        rep["paw." + lg["name"]] = fit(paw, lg["d_paw"])
        if beans:
            paw_beans(H, lg, paw, lg["d_paw"])
            paw.fix_winding()
            rim = paw.rings["P0"]
            for i in range(len(rim)):
                paw.set_crease(rim[i], rim[(i + 1) % len(rim)], 0.5)     # the sole's rim: a flat sole with a tight edge
        paw.lg = lg
        if leg is not None:
            leg.lg = lg
            cages.append(leg)
        cages.append(paw)
    if join == "B":
        tcage = build_torso(H)                                  # unfitted: the ports are cut before the fit
        comb, fld = join_b.shoulders_b(H, tcage, b_legs)
        rep["torso+legs (B)"] = fit(comb, fld)
        cages[1] = comb
    return cages, rep


def merge(cages):
    V, F, part, off = [], [], [], {}
    creases, tags = {}, {}
    n = 0
    for c in cages:
        off[c.name] = n
        V += c.V
        F += [tuple(i + n for i in f) for f in c.F]
        part += [c.name] * len(c.V)
        for (a, b), s in c.crease.items():
            creases[(a + n, b + n)] = s
        for name, d in c.tags.items():
            t = tags.setdefault(name, {})
            for i, v in d.items():
                t[i + n] = v
        n += len(c.V)
    return np.array(V, float), F, np.array(part), off, creases, tags


# ============================================================================================== weights (construction: each part, each ring owned by its bones)
def vertex_weights(H, cages, V, part, off):
    W = [dict() for _ in range(len(V))]
    pc, cc = H.pelvis["c"], H.chest["c"]
    for c in cages:
        o = off[c.name]
        if c.name == "head":
            for i in range(len(c.V)):
                W[o + i] = {"head": 1.0}
        elif c.name == "torso":
            wov = getattr(c, "wover", {})
            for i in range(len(c.V)):
                if i in wov:
                    W[o + i] = dict(wov[i]); continue
                t = float(np.clip((V[o + i][0] - pc[0]) / (cc[0] - pc[0]), 0, 1))
                wc, wp = sstep(0.35, 0.85, t), 1 - sstep(0.15, 0.65, t)
                W[o + i] = {"chest": wc, "pelvis": wp, "spine": max(0.0, 1 - wc - wp)}
        elif c.name.startswith("leg"):
            tag = c.lg["name"]
            ring_w = {"L0": (1, 0), "L1": (1, 0), "L2": (0.85, 0.15), "L3": (0.5, 0.5), "L4": (0, 1), "L5": (0, 1)}
            vw = {}
            for rn, ids in c.rings.items():
                for i in ids:
                    vw[i] = ring_w[rn]
            for i in range(len(c.V)):
                u, l = vw.get(i, (None, None)) if i in vw else (None, None)
                if u is None:      # cap interiors take their ring's weights
                    ring = "L0" if c.V[i][2] > np.mean([c.V[j][2] for j in c.rings["L0"]]) - 1e-9 else "L5"
                    u, l = ring_w[ring]
                W[o + i] = {f"{tag.split('.')[0]}_upper.{tag.split('.')[1]}": u, f"{tag.split('.')[0]}_lower.{tag.split('.')[1]}": l}
        elif c.name.startswith("paw"):
            tag = c.lg["name"]
            for i in range(len(c.V)):
                W[o + i] = {f"{tag.split('.')[0]}_paw.{tag.split('.')[1]}": 1.0}
    return W


# ============================================================================================== the scene
class Scene:
    def __init__(self, H, cages, rep, join="A", clay=True, name="loika"):
        self.H, self.cages, self.rep, self.join = H, cages, rep, join
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.root = bpy.data.objects.new("root", None)
        self.root.rotation_euler = (0, 0, -math.pi / 2)
        self.scene.collection.objects.link(self.root)
        V, F, part, off, creases, tags = merge(cages)
        self.V, self.F, self.part, self.off, self.creases, self.tags = V, F, part, off, creases, tags
        me = bpy.data.meshes.new("loika_half")
        me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
        me.update()
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        ek = {tuple(sorted(e.vertices)): e.index for e in me.edges}
        cr = me.attributes.new("crease_edge", "FLOAT", "EDGE")
        for (a, b), s in creases.items():
            cr.data[ek[(min(a, b), max(a, b))]].value = s
        for nm, d in tags.items():
            at = me.attributes.new(nm, "FLOAT", "POINT")
            for i, v in d.items():
                at.data[i].value = v
        self.half = bpy.data.objects.new("loika", me)
        self.half.parent = self.root
        self.scene.collection.objects.link(self.half)
        mir = self.half.modifiers.new("Mirror", "MIRROR")
        mir.use_axis = (False, True, False)
        mir.use_bisect_axis = (False, True, False)
        mir.use_clip = True
        mir.use_mirror_merge = True
        mir.merge_threshold = 1e-5
        sub = self.half.modifiers.new("Subsurf", "SUBSURF")
        sub.levels = 2
        sub.render_levels = 3
        sub.use_limit_surface = True
        self.sub = sub
        self.weights = vertex_weights(H, cages, V, part, off)
        self._rig()
        self._material(clay)
        self._world_and_lights()

    # ---- armature from the same joints
    def _rig(self):
        H = self.H
        arm = bpy.data.armatures.new("loika_rig")
        rig = bpy.data.objects.new("loika_rig", arm)
        rig.parent = self.root
        self.scene.collection.objects.link(rig)
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode="EDIT")
        pc, cc, kc = H.pelvis["c"], H.chest["c"], H.kc
        def bone(name, a, b, parent=None, deform=True):
            e = arm.edit_bones.new(name)
            e.head, e.tail = Vector(a), Vector(b)
            e.use_deform = deform
            if parent:
                e.parent = arm.edit_bones[parent]
                e.use_connect = False
            return name
        def at(t):
            return np.array([pc[0] + (cc[0] - pc[0]) * t, 0, pc[2] + (cc[2] - pc[2]) * t])
        bone("root", (0, 0, 0), (0, 0, 0.1), deform=False)
        bone("pelvis", pc, at(0.4), "root")
        bone("spine", at(0.4), at(0.7), "pelvis")
        bone("chest", at(0.7), cc, "spine")
        top = np.array([cc[0] + H.chest["r"][0] * 0.55, 0, cc[2] + H.chest["r"][2] * 0.75])
        bone("neck", top, kc - np.array([0, 0, 0.4]), "chest")
        bone("head", kc, kc + np.array([0, 0, 0.5]), "neck")
        for lg in H.legs:
            tag, side = lg["name"].split(".")
            m = np.array([1, 1, 1.0]) if side == "L" else np.array([1, -1, 1.0])
            par = "chest" if tag == "fore" else "pelvis"
            top_, el, ank = lg["top"] * m, lg["el_c"] * m, lg["ank"] * m
            toe = lg["paw_c"] * m + np.array([0.12, 0, -H.pawR[2] * 0.6])
            bone(f"{tag}_upper.{side}", top_, el, par)
            bone(f"{tag}_lower.{side}", el, ank, f"{tag}_upper.{side}")
            bone(f"{tag}_paw.{side}", ank, toe, f"{tag}_lower.{side}")
        bpy.ops.object.mode_set(mode="OBJECT")
        self.rig = rig
        # vertex groups (the half cage; the Mirror swaps .L/.R names for the mirrored half)
        groups = {}
        for i, w in enumerate(self.weights):
            for b, v in w.items():
                if v > 1e-6:
                    groups.setdefault(b, []).append((i, v))
        for b, lst in groups.items():
            vg = self.half.vertex_groups.new(name=b)
            for i, v in lst:
                vg.add([i], v, "REPLACE")
        am = self.half.modifiers.new("Armature", "ARMATURE")
        am.object = rig
        self.rig.data.pose_position = "POSE"

    def pose_stand(self, on=True, Rh=None):
        """The stand pose (house: yaw-head, roll, chin up): the head bone rotated about K's centre. Not a clip: the pose every sprite uses."""
        H = self.H
        pb = self.rig.pose.bones["head"]
        for b in self.rig.pose.bones:
            b.rotation_mode = "QUATERNION"
        if on:
            R = np.eye(4)
            R[:3, :3] = H.Rh if Rh is None else Rh
            M = Matrix.Translation(Vector(H.kc)) @ Matrix(R.tolist()) @ Matrix.Translation(-Vector(H.kc))
            pb.matrix = M @ pb.bone.matrix_local
        else:
            pb.rotation_quaternion = (1, 0, 0, 0)
        bpy.context.view_layer.update()

    # ---- materials: one body material (clay = the body colour, no paint)
    def _material(self, clay=True):
        look = self.H.look
        m = bpy.data.materials.new("body")
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        col = (*lin(look["body"]), 1)
        b.inputs["Base Color"].default_value = col
        b.inputs["Roughness"].default_value = self.H.light["vinyl"]["roughness"]
        for nm in ("Specular IOR Level",):
            if nm in b.inputs:
                b.inputs[nm].default_value = 0.25
        self.half.data.materials.append(m)
        self.mat = m

    def set_clay(self, rgb255):
        self.mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(rgb255), 1)

    def _world_and_lights(self):
        sc = self.scene
        L = self.H.light
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
        sc.display_settings.display_device = "sRGB"
        w = bpy.data.worlds.new("w")
        sc.world = w
        w.use_nodes = True
        self.world_bg = w.node_tree.nodes["Background"]
        # round 2: the fill carries the house's warm light-field tint (R14: on light fields the shade stays warm), not the cool core tint, and it is not reflected by
        # the glossy lobe: a dark albedo under a reflecting grey fill is what flattened the round-1 body (shade over lit 0.94 against 0.58 on a diffuse sphere)
        tint = np.array(L["shade"]["light-tint"])
        self.world_bg.inputs["Color"].default_value = (*tint, 1)
        w.cycles_visibility.glossy = False
        self.key = bpy.data.lights.new("key", "SUN")
        self.key.angle = math.radians(12)
        self.key.color = L["key"]["color"]
        self.rim = bpy.data.lights.new("rim", "SUN")
        self.rim.angle = math.radians(20)
        self.rim.color = L["rim"]["tint"]
        self.key_o = bpy.data.objects.new("key", self.key)
        self.rim_o = bpy.data.objects.new("rim", self.rim)
        for o in (self.key_o, self.rim_o):
            o.parent = self.root
            sc.collection.objects.link(o)
        self.set_light_strength(LIT, SHADE_RATIO)
        sc.render.film_transparent = True
        for a in dir(sc.render):
            if a.startswith("use_stamp"):
                setattr(sc.render, a, False)
        sc.render.image_settings.file_format = "PNG"
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.engine = "CYCLES"
        sc.cycles.device = "CPU"
        sc.cycles.samples = 64
        sc.cycles.use_denoising = True
        sc.cycles.seed = 0
        sc.cycles.max_bounces = 4
        cam = bpy.data.cameras.new("cam")
        cam.type = "ORTHO"
        self.cam_d = cam
        self.cam = bpy.data.objects.new("cam", cam)
        self.cam.parent = self.root
        sc.collection.objects.link(self.cam)
        sc.camera = self.cam

    def set_light_strength(self, lit, shade_ratio):
        """lit: the key sun's strength scale; the world carries the cool shade so a point facing away from the key is `shade_ratio` of one facing it.
        A diffuse point: facing the key  rho (E/pi + B);  facing away  rho B.  B = ratio E / (pi (1 - ratio)), and the pair is scaled so lit = `lit`."""
        E = lit * math.pi / (1 + shade_ratio / (1 - shade_ratio))
        B = shade_ratio * E / (math.pi * (1 - shade_ratio))
        self.key.energy = E
        self.world_bg.inputs["Strength"].default_value = B
        self.rim.energy = E * self.H.light["rim"]["strength"]

    # ---- camera and light, in house axes (children of the root)
    def basis(self, yaw_deg=None, pitch_deg=None):
        H = self.H
        yaw = math.radians(H.pose["yawBody"] if yaw_deg is None else yaw_deg)
        pit = math.radians(H.solver["camera"]["pitch-deg"] if pitch_deg is None else pitch_deg)
        toward = np.array([math.cos(yaw) * math.cos(pit), math.sin(yaw) * math.cos(pit), math.sin(pit)])
        up = np.array([0, 0, 1.0]) - toward[2] * toward
        up /= np.linalg.norm(up)
        right = np.cross(up, toward)
        return right, up, toward

    def aim_lights(self, B):
        right, up, toward = B
        k = self.H.light["key"]
        az, el = math.radians(k["azimuth-deg"]), math.radians(k["elevation-deg"])
        l = right * math.sin(az) * math.cos(el) + up * math.sin(el) + toward * math.cos(el) * (k["toward-camera"] + 0.4)
        l /= np.linalg.norm(l)
        for o, d in ((self.key_o, l), (self.rim_o, np.array([-l[0], -l[1], 0.55]) / np.linalg.norm([l[0], l[1], 0.55]))):
            o.rotation_mode = "QUATERNION"
            o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(d))
        self.light_dir = l

    def evaluated_points(self, level=None):
        dg = bpy.context.evaluated_depsgraph_get()
        ev = self.half.evaluated_get(dg)
        me = ev.to_mesh()
        P = np.array([v.co[:] for v in me.vertices])
        ev.to_mesh_clear()
        return P

    def leaf_points(self):
        H = self.H
        pts = []
        for l in H.leaves:
            for t in (0, 0.5, 1):
                for s in (-1, 0, 1):
                    pts.append(H.kc + H.Rh @ (l["base"] + l["ax"] * l["len"] * t + l["aw"] * s * l["wid"] * 0.5 * (1 - abs(t - 0.5))))
        return np.array(pts)

    def extents(self, B, with_leaves=True):
        right, up, _ = B
        P = self.evaluated_points()
        if with_leaves:
            P = np.vstack([P, self.leaf_points()])
        a, b = P @ right, P @ up
        return dict(a0=a.min(), a1=a.max(), b0=b.min(), b1=b.max())

    def frame(self, B, w, h, scale, centre_pt=None, feet_row=None, cx=None, bottom=None):
        """Orthographic camera: `scale` px per world unit; either `centre_pt` (a house point) in the middle of the image, or the stand framing:
        screen-a `cx` in the middle, screen-b `bottom` on pixel row `feet_row` (the feet's bottom row)."""
        right, up, toward = B
        cam = self.cam
        R = np.column_stack([right, up, toward])
        M = np.eye(4)
        M[:3, :3] = R
        cam.matrix_local = Matrix(M.tolist())
        sc = self.scene
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
        self.cam_d.ortho_scale = max(w, h) / scale
        self.cam_d.clip_start, self.cam_d.clip_end = 0.1, 40
        big = max(w, h)
        if centre_pt is not None:
            ca, cb = float(np.dot(centre_pt, right)), float(np.dot(centre_pt, up))
        else:
            ca = cx
            cb = bottom + ((feet_row + 1) - h / 2) / scale
        # camera origin in the screen plane: the point (ca, cb) is the image centre; put the camera along `toward` away from the creature
        origin = right * ca + up * cb + toward * 10.0
        M[:3, 3] = origin
        cam.matrix_local = Matrix(M.tolist())
        self.cam_d.shift_x = self.cam_d.shift_y = 0
        bpy.context.view_layer.update()

    def render(self, path, strip=True):
        self.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        if strip:
            strip_png_text(path)
        return hashlib.sha256(open(path, "rb").read()).hexdigest()[:16]

    def stand_sprites(self, outdir, tag, sizes=(304, 96, 48), samples=None, renderer=None):
        """The three stand sprites, framed as the house does: 304 x 312 at the master's alpha height, feet on row 305; 96 x 88 at 0.276 of that, feet on 85;
        48 x 48 fitted in 44 px, feet on row 44."""
        B = self.basis()
        self.aim_lights(B)
        ex = self.extents(B)
        hgt, wid = ex["b1"] - ex["b0"], ex["a1"] - ex["a0"]
        s304 = MASTER_ALPHA_H / hgt
        out = {}
        for sz in sizes:
            w, h, scale, feet = {304: (304, 312, s304, 305), 96: (96, 88, s304 * 0.276, 85), 48: (48, 48, min(44 / hgt, 44 / wid), 44)}[sz]
            self.scene.cycles.samples = samples or (64 if sz == 304 else 48)
            self.cur_scale = scale
            self.frame(B, w, h, scale, cx=(ex["a0"] + ex["a1"]) / 2, bottom=ex["b0"], feet_row=feet)
            p = os.path.join(outdir, f"{tag}-{sz}.png")
            out[sz] = dict(file=os.path.basename(p), sha=(renderer(p, self.scene.cycles.samples) if renderer else self.render(p)), scale=scale)
        self.last_framing = dict(extents=ex, s304=s304, B=[b.tolist() for b in B])
        return out


def view(sc, path, yaw, pitch, w=420, h=420, margin=0.9, samples=24):
    """A review view (side, front, back, top...), orthographic, fitted to the creature with a margin: not a sprite."""
    B = sc.basis(yaw, pitch)
    sc.aim_lights(B)
    ex = sc.extents(B)
    scale = margin * min(w / (ex["a1"] - ex["a0"]), h / (ex["b1"] - ex["b0"]))
    sc.scene.cycles.samples = samples
    mid_b = (ex["b0"] + ex["b1"]) / 2
    sc.frame(B, w, h, scale, cx=(ex["a0"] + ex["a1"]) / 2, bottom=mid_b - (h / 2) / scale, feet_row=h - 1)
    return sc.render(path)


def strip_png_text(path):
    b = open(path, "rb").read()
    out = [b[:8]]
    i = 8
    while i < len(b):
        n = struct.unpack(">I", b[i:i + 4])[0]
        if b[i + 4:i + 8] not in (b"tEXt", b"zTXt", b"iTXt"):
            out.append(b[i:i + 12 + n])
        i += 12 + n
    open(path, "wb").write(b"".join(out))


def mesh_checks(sc):
    """quads only, shells, non-manifold edges, mirror error (on the level-0 mirrored cage, then the evaluated level-2 mesh)."""
    ob = sc.half
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    bm = bmesh.new()
    bm.from_mesh(me)
    seen, shells = set(), 0
    for f in bm.faces:
        if f.index in seen:
            continue
        shells += 1
        stack = [f]
        seen.add(f.index)
        while stack:
            g = stack.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
    nonman = sum(1 for e in bm.edges if not e.is_manifold)
    quads = sum(1 for f in bm.faces if len(f.verts) == 4)
    from mathutils.kdtree import KDTree
    kd = KDTree(len(me.vertices))
    for i, v in enumerate(me.vertices):
        kd.insert(v.co, i)
    kd.balance()
    asym = max(kd.find(Vector((v.co.x, -v.co.y, v.co.z)))[2] for v in me.vertices)
    out = dict(verts=len(me.vertices), faces=len(bm.faces), quads=quads, shells=shells, nonmanifold_edges=nonman, mirror_error=asym)
    bm.free()
    bpy.data.meshes.remove(me)
    return out
