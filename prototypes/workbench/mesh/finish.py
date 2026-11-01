"""Stage 5-6 on top of build.Scene: bake the level-N surface in the rest pose (paint rides the rig), paint it, eye discs, leaves, shadow, clips, glb."""
import os, math, hashlib, struct, zlib, json
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import paint as PT
from build import lin, strip_png_text


EYE_EMIT = 0.5


def write_png(path, rgba8):
    h, w = rgba8.shape[:2]
    raw = b"".join(b"\x00" + rgba8[y].tobytes() for y in range(h))
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def read_png(path):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = "Non-Color"
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(im)
    return a                      # straight alpha, display-encoded 0..1


def new_leaf_object(sc, H):
    cages = PT.leaf_cages(H)
    objs = []
    for c in cages:
        V = np.array(c.V)
        me = bpy.data.meshes.new(c.name)
        me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in c.F])
        me.update()
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        ob = bpy.data.objects.new(c.name, me)
        ob.parent = sc.root
        sc.scene.collection.objects.link(ob)
        m = ob.modifiers.new("Subsurf", "SUBSURF"); m.levels = 2; m.render_levels = 3
        bone = "leaf." + c.name.split(".")[1]
        vg = ob.vertex_groups.new(name=bone)
        vg.add(list(range(len(V))), 1.0, "REPLACE")
        am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
        mat = bpy.data.materials.new(c.name)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*lin(np.array(H.look["leaf"])), 1)
        b.inputs["Roughness"].default_value = 0.45
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.3 + H.rf["leaf-gloss"] * 0.3
        me.materials.append(mat)
        objs.append(ob)
    return objs


def add_crest_bones(sc, H):
    arm = sc.rig.data
    bpy.context.view_layer.objects.active = sc.rig
    bpy.ops.object.mode_set(mode="EDIT")
    root = H.kc + np.array(H.rig["crest"]["root"])
    e = arm.edit_bones.new("crest"); e.head, e.tail = Vector(root), Vector(root + np.array([0, 0, 0.1])); e.parent = arm.edit_bones["head"]; e.use_deform = False
    for i, l in enumerate(H.leaves):
        b = arm.edit_bones.new(f"leaf.{i}")
        b.head = Vector(H.kc + l["base"]); b.tail = Vector(H.kc + l["base"] + l["ax"] * l["len"]); b.parent = e
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(sc, H, level=3, name="loika_L"):
    """Evaluate Mirror + Subsurf at `level` in the REST pose into a static mesh that keeps its vertex weights, then paint it (vertex colours) and rig it."""
    sc.pose_stand(False)
    tmp = bpy.data.objects.new("tmp", sc.half.data)
    tmp.parent = sc.root
    sc.scene.collection.objects.link(tmp)
    for src in sc.half.modifiers:
        if src.type in ("MIRROR", "SUBSURF"):
            m = tmp.modifiers.new(src.name, src.type)
            if src.type == "MIRROR":
                m.use_axis = src.use_axis; m.use_bisect_axis = src.use_bisect_axis; m.use_clip = src.use_clip; m.use_mirror_merge = src.use_mirror_merge; m.merge_threshold = src.merge_threshold
            else:
                m.levels = m.render_levels = level; m.use_limit_surface = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    me.name = name
    P = np.array([v.co[:] for v in me.vertices])
    N = np.array([v.normal[:] for v in me.vertices])
    ob = bpy.data.objects.new(name, me)
    ob.parent = sc.root
    sc.scene.collection.objects.link(ob)
    names = [g.name for g in sc.half.vertex_groups]
    if len(ob.vertex_groups) != len(names):      # vertex group names live on the mesh in 5.x: the copy may already carry them
        for n in names:
            if n not in ob.vertex_groups:
                ob.vertex_groups.new(name=n)
    hid = ob.vertex_groups["head"].index
    head_w = np.array([next((g.weight for g in v.groups if g.group == hid), 0.0) for v in me.vertices])
    toe = np.zeros(len(P))
    if "toe" in me.attributes:
        toe = np.array([d.value for d in me.attributes["toe"].data])
    col, cream = PT.vertex_colours(H, P, N, head_w, toe)
    nose = PT.nose_weight(H, P - H.kc) * (head_w > 0.5)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    ca.data.foreach_set("color", np.column_stack([PT.lin(col), np.ones(len(P))]).ravel())
    na = me.attributes.new("nose", "FLOAT", "POINT")
    na.data.foreach_set("value", nose)
    am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
    # material: vertex colour -> Principled, a little subsurface (the warm turn), a glossier nose
    mat = bpy.data.materials.new("skin")
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    cn = nt.nodes.new("ShaderNodeVertexColor"); cn.layer_name = "Col"
    nt.links.new(cn.outputs["Color"], b.inputs["Base Color"])
    an = nt.nodes.new("ShaderNodeAttribute"); an.attribute_name = "nose"
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = H.light["vinyl"]["roughness"]; mr.inputs["To Max"].default_value = 0.35
    nt.links.new(an.outputs["Fac"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 0.25
    if "Subsurface Weight" in b.inputs:
        b.inputs["Subsurface Weight"].default_value = 0.06
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.55, 0.35)
        b.inputs["Subsurface Scale"].default_value = 0.02
    me.materials.clear()
    me.materials.append(mat)
    sc.half.hide_render = True
    sc.half.hide_viewport = True
    sc.final = ob
    sc.bake_info = dict(level=level, verts=len(P), faces=len(me.polygons), cream_mean=float(cream.mean()))
    return ob


def add_eyes(sc, H, level_obj, offset=0.005):
    """Two eye discs conforming to the head surface (rest pose; ray cast onto the baked mesh), textured from the house's eye formula, bound to the head bone."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = level_obj.evaluated_get(dg)
    bvh = BVHTree.FromObject(ev, dg)
    B = sc.basis()
    towardL = H.Rh.T @ B[2]
    objs = []
    for eye in H.eyes:
        C = PT.disc_cage(H, eye)
        V = np.array(C.V) + H.kc
        n = eye["n"]
        P = []
        for p in V:
            hit = bvh.ray_cast(Vector(p + n * 0.35), Vector(-n), 0.7)
            loc, nrm = (hit[0], hit[1]) if hit[0] is not None else (None, None)
            if loc is None:
                nl = bvh.find_nearest(Vector(p), 0.5)
                P.append(np.array(nl[0]) + np.array(nl[1]) * offset if nl[0] is not None else p)
            else:
                P.append(np.array(loc) + np.array(nrm) * offset)
        me = bpy.data.meshes.new(C.name)
        me.from_pydata([tuple(v) for v in P], [], [tuple(f) for f in C.F])
        me.update()
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        uvl = me.uv_layers.new(name="UVMap")
        for loop in me.loops:
            uvl.data[loop.index].uv = tuple(C.uv[loop.vertex_index])
        ob = bpy.data.objects.new(C.name, me)
        ob.parent = sc.root
        sc.scene.collection.objects.link(ob)
        tex = PT.eye_texture(H, eye, towardL)
        # the texture is a PNG written by us (sRGB bytes), loaded as sRGB: the same file goes into the glb
        os.makedirs(sc.tex_dir, exist_ok=True)
        tp = os.path.join(sc.tex_dir, C.name + ".png")
        write_png(tp, np.round(tex * 255).astype(np.uint8))
        img = bpy.data.images.load(tp)
        img.alpha_mode = "STRAIGHT"
        mat = bpy.data.materials.new(C.name)
        mat.use_nodes = True
        nt = mat.node_tree
        b = nt.nodes["Principled BSDF"]
        tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; tn.extension = "CLIP"
        nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
        nt.links.new(tn.outputs["Alpha"], b.inputs["Alpha"])
        b.inputs["Roughness"].default_value = 1.0
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.0
        # the eye is painted, not a lit ball (design 8.2: emission off) but the house wants the crescent at L* 62-70 under the house light, which the lit disc
        # does not reach: a little emission from the same texture (strength EYE_EMIT), reported on the sheet
        if "Emission Color" in b.inputs:
            nt.links.new(tn.outputs["Color"], b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = EYE_EMIT
        me.materials.append(mat)
        vg = ob.vertex_groups.new(name="head")
        vg.add(list(range(len(P))), 1.0, "REPLACE")
        am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
        objs.append(ob)
    return objs


def shadow_plane(sc, H):
    me = bpy.data.meshes.new("floor")
    r = 6.0
    me.from_pydata([(-r, -r, 0), (r, -r, 0), (r, r, 0), (-r, r, 0)], [], [(0, 1, 2, 3)])
    ob = bpy.data.objects.new("floor", me)
    ob.parent = sc.root
    sc.scene.collection.objects.link(ob)
    ob.is_shadow_catcher = True
    ob.hide_render = True
    return ob


def render_sprite(sc, path, floor_obj, samples):
    """The sprite and its floor shadow: two renders (without and with a shadow-catcher floor); the shadow is tinted (30, 26, 34) at alpha 110 and goes under the creature."""
    sc.scene.cycles.samples = samples
    floor_obj.hide_render = True
    pa = path[:-4] + "._a.png"; pb = path[:-4] + "._b.png"
    sc.render(pa, strip=False)
    floor_obj.hide_render = False
    sc.render(pb, strip=False)
    floor_obj.hide_render = True
    A, B = read_png(pa), read_png(pb)
    diff = np.clip(B[..., 3] - A[..., 3], 0, 1)
    bg = diff[(A[..., 3] < 0.01) & (diff > 0.003)]
    base = np.percentile(bg, 5) if len(bg) else 0.0                            # the catcher's own unshadowed floor level
    top = max(np.percentile(bg, 99.5) if len(bg) else 1.0, base + 1e-3)
    sa = np.clip((diff - base) / (top - base), 0, 1) * (110 / 255)
    sc_col = np.array([30, 26, 34]) / 255
    a = A[..., 3] + sa * (1 - A[..., 3])
    rgb = np.where(a[..., None] > 1e-6, (A[..., :3] * A[..., 3:4] + sc_col * (sa * (1 - A[..., 3]))[..., None]) / np.maximum(a[..., None], 1e-6), 0)
    out = np.dstack([np.clip(rgb, 0, 1), a])
    write_png(path, np.round(out * 255).astype(np.uint8))
    os.remove(pa); os.remove(pb)
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:16]


# ---------------------------------------------------------------- the five light measures (design §10), on the stand sprite
def Lstar(rgb):
    c = np.asarray(rgb, float)
    l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    Y = 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
    return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y), Y


def project(sc, P, w=304, h=312, feet=305):
    fr = sc.last_framing
    ex, s = fr["extents"], fr["s304"]
    right, up, _ = [np.array(b) for b in fr["B"]]
    cx = (ex["a0"] + ex["a1"]) / 2
    cb = ex["b0"] + ((feet + 1) - h / 2) / s
    return np.column_stack([(P @ right - cx) * s + w / 2, h / 2 - (P @ up - cb) * s])


def light_measures(sc, H, png, ob_final, eyes):
    """Sample points picked on the mesh (posed): the lit and the shade body, the cream in shade, the nose against the muzzle, the ring top against its bottom, the iris."""
    img = read_png(png)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob_final.evaluated_get(dg)
    me = ev.to_mesh()
    P = np.array([v.co[:] for v in me.vertices]); N = np.array([v.normal[:] for v in me.vertices])
    col = np.array([d.color[:3] for d in me.color_attributes["Col"].data])
    nose = np.array([d.value for d in me.attributes["nose"].data])
    names = {g.index: g.name for g in ev.vertex_groups}
    torso = np.array([any(names[g.group] in ("chest", "spine", "pelvis") and g.weight > 0.5 for g in v.groups) for v in me.vertices])
    head = np.array([any(names[g.group] == "head" and g.weight > 0.5 for g in v.groups) for v in me.vertices])
    ev.to_mesh_clear()
    B = [np.array(b) for b in sc.last_framing["B"]]
    toward, l = B[2], sc.light_dir
    px = project(sc, P)
    ok = (px[:, 0] > 2) & (px[:, 0] < 301) & (px[:, 1] > 2) & (px[:, 1] < 309)
    def sample(idx, k=1):
        idx = idx[ok[idx]]
        if len(idx) == 0:
            return None, []
        xy = px[idx]
        vals = np.array([img[int(round(y)), int(round(x)), :3] for x, y in xy])
        return Lstar(vals), xy
    facing = N @ toward > 0.5
    nl = N @ l
    body = (col[:, 0] < 0.06) & (nose < 0.05)
    out, pts = {}, {}
    def pick(mask, order, frac, name):
        idx = np.where(mask & ok)[0]
        idx = idx[np.argsort(order[idx])]
        n = max(3, int(len(idx) * frac))
        sel = idx[:n] if frac > 0 else idx
        return sel
    lit = pick(torso & body & facing, -nl, 0.03, "lit")
    shd = pick(torso & body & facing, nl, 0.03, "shade")
    (Ll, Yl), xl = sample(lit); (Ls, Ys), xs = sample(shd)
    out["lit_Y"], out["shade_Y"] = float(np.median(Yl)), float(np.median(Ys))
    out["shade_over_lit"] = out["shade_Y"] / max(out["lit_Y"], 1e-9)
    pts["lit body"], pts["shade body"] = xl[:6], xs[:6]
    cs = pick(torso & (col[:, 0] > 0.7) & facing, nl, 0.15, "cs")                # cream in shade
    (Lc, _), xc = sample(cs)
    out["cream_shade_L"] = float(np.median(Lc)); pts["cream in shade"] = xc[:6]
    nz = np.where((nose > 0.9) & head & facing)[0]
    mz = np.where(head & body & (np.linalg.norm(P - (H.kc + H.Rh @ H.nose["c"]), axis=1) < 0.35) & (nose < 0.05) & facing)[0]
    mz = mz[np.argsort(-nl[mz])][: max(3, len(mz) // 10)]
    (Ln, _), xn = sample(nz); (Lm, _), xm = sample(mz)
    out["nose_L"], out["muzzle_lit_L"] = float(np.median(Ln)), float(np.median(Lm))
    out["nose_minus_muzzle"] = out["nose_L"] - out["muzzle_lit_L"]; pts["nose"], pts["muzzle lit"] = xn[:6], xm[:6]
    # the eyes (the near one): disc vertices by their disc coordinates
    near = max(eyes, key=lambda o: float(np.dot(np.array(o.evaluated_get(dg).to_mesh().vertices[len(o.data.vertices) // 2].co[:]), toward)))
    de = near.evaluated_get(dg); dm = de.to_mesh()
    EP = np.array([v.co[:] for v in dm.vertices]); uv = np.array([dm.uv_layers[0].data[l_.index].uv[:] for l_ in dm.loops])
    vu = np.zeros((len(EP), 2)); [vu.__setitem__(l_.vertex_index, uv[l_.index]) for l_ in dm.loops]
    de.to_mesh_clear()
    e0 = H.eyes[0]; R, Ri = e0["Reye"], e0["Riris"]
    uu, vv = (vu[:, 0] * 2 - 1) * R, (vu[:, 1] * 2 - 1) * R
    r = np.hypot(uu, vv)
    epx = project(sc, EP)
    def esample(mask):
        idx = np.where(mask)[0]
        if len(idx) == 0:
            return float("nan"), np.zeros((0, 2))
        vals = np.array([img[int(round(epx[i, 1])), int(round(epx[i, 0])), :3] for i in idx])
        return float(np.median(Lstar(vals)[0])), epx[idx]
    ring = (r > Ri * 1.2) & (r < R * 0.92)
    top, xt = esample(ring & (vv > 0.6 * R)); bot, xb = esample(ring & (vv < -0.6 * R))
    out["ring_top_L"], out["ring_bottom_L"], out["ring_top_minus_bottom"] = top, bot, top - bot
    cres, xcr = esample((r > Ri * 0.55) & (r < Ri * 0.9) & (vv < -0.35 * Ri) & (np.abs(uu) < 0.7 * Ri))
    ibody, xib = esample((r > e0["pupilR"] * 1.2) & (r < Ri * 0.85) & (vv > 0.25 * Ri))
    out["iris_crescent_L"], out["iris_body_L"] = cres, ibody
    pts["ring top"], pts["ring bottom"], pts["iris crescent"], pts["iris body"] = xt[:4], xb[:4], xcr[:4], xib[:4]
    return out, {k: np.asarray(v).tolist() for k, v in pts.items()}
