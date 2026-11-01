"""Stage 5-6 on top of build.Scene: bake the level-N surface in the rest pose (paint rides the rig), paint it, eye discs, leaves, shadow, clips, glb."""
import os, math, hashlib, struct, zlib, json
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import paint as PT
from build import lin, strip_png_text


NOSE_ROUGH, NOSE_SPEC, NOSE_COAT = 0.24, 1.0, 0.9     # round 2: the nose is a glossier skin than the rest, so its mound takes one soft highlight from the key
EYE_SINK = 0.09     # the disc sits this far (H) below the skin along the eye's normal, in a socket the size of the disc
EYE_HOLE = 1.04      # the socket's hole, in R_eye
EYE_SPAN = 1.9      # the disc's own radius, in R_eye: wider than the hole, so nothing but the disc is seen through it
EYE_CRESCENT_RHO = (0.1, 0.7)
EYE_CRESCENT_GAIN = 1.7   # the amber crescent's strength over the house's rf.crescent (0.6): the house formula alone renders the crescent at about L* 53 (the SDF's own sprite), the AD's band is 62-70
EYE_GAMMA = 1.0     # the emission is the texture raised to this power (below 1 it lifts the amber crescent more than the ivory ring)
EYE_BASE = 1.0      # the texture's share of the eye's lit base colour (the ring would clip to white under the key at 1.0)


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


def surf_height(H, e, u, v):
    """The head's analytic surface (the house's K field, the same one the cage was fitted to and the sockets are seated on) over the eye's tangent plane, along the eye's
    normal: height of the surface above the plane point (u, v). Smooth, with no dip: the disc is carried on it."""
    from parts import bisect_surface
    P0 = e["c"][None] + u[:, None] * e["lat"][None] + v[:, None] * e["up"][None]
    S = bisect_surface(H.dK, P0, e["n"])
    return (S - P0) @ e["n"]


def skin_height(sc, H, e, u, v, g):
    """Height of the (uncut) skin over the eye's tangent plane at the disc's grid points (a g x g grid in index order): a ray from outside along -n onto the baked skin; a ray that
    finds nothing or another part (the muzzle's ridge) takes its neighbours' value; two passes of a 1-2-1 smoothing, so the disc carries no ray-cast noise."""
    c = H.kc + e["c"]
    n = Vector(e["n"])
    hts = np.full(len(u), np.nan)
    for i in range(len(u)):
        p = Vector(c + u[i] * e["lat"] + v[i] * e["up"])
        hit = sc.eye_bvh.ray_cast(p + n * 0.4, -n, 0.9)
        if hit[0] is not None and Vector(hit[1]).dot(n) > 0.3:
            hts[i] = 0.4 - (Vector(hit[0]) - (p + n * 0.4)).dot(-n)
    hg = hts.reshape(g, g)
    med = np.nanmedian(hg)
    hg[np.abs(hg - med) > 0.25] = np.nan
    for _ in range(8):
        for j in range(g):
            for i in range(g):
                if np.isnan(hg[j, i]):
                    nb = [hg[j + a, i + b] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= j + a < g and 0 <= i + b < g and not np.isnan(hg[j + a, i + b])]
                    if nb:
                        hg[j, i] = np.mean(nb)
    for _ in range(2):
        p_ = np.pad(hg, 1, mode="edge")
        hg = (p_[1:-1, 1:-1] * 4 + p_[:-2, 1:-1] * 2 + p_[2:, 1:-1] * 2 + p_[1:-1, :-2] * 2 + p_[1:-1, 2:] * 2 + p_[:-2, :-2] + p_[:-2, 2:] + p_[2:, :-2] + p_[2:, 2:]) / 16
    return hg.reshape(-1)


def eye_frames_world(H):
    return [(H.kc + e["c"], e["lat"], e["up"], e["n"], e["Reye"]) for e in H.eyes]


def cut_eye_sockets(sc, H, me):
    """Round 2 (AD item 7): a socket as big as the disc. On the baked head (rest pose) each eye's disc area is cut out of the skin: the faces inside R_eye * EYE_HOLE are
    deleted, the hole's rim (set on a true circle, seated on the skin) is walled down EYE_SINK + 0.004 along the eye's normal; the wall's foot is hidden under the disc. The uncut skin's
    BVH goes to sc.eye_bvh, for the disc's heights."""
    import bmesh
    n = len(me.vertices)
    P = np.empty(n * 3); me.vertices.foreach_get("co", P); P = P.reshape(-1, 3)
    NN = np.empty(n * 3); me.vertices.foreach_get("normal", NN); NN = NN.reshape(-1, 3)
    sc.eye_fit = []
    cut_faces = set()
    for e, (c, lat, up, nrm, R) in zip(H.eyes, eye_frames_world(H)):
        d = P - c
        u, v, h = d @ lat, d @ up, d @ nrm
        r = np.hypot(u, v)
        inside = (r < R * EYE_HOLE) & (h > -0.3) & (h < 0.4) & (NN @ nrm > 0.0)
        near = np.where((r < 1.3 * R) & (r > 0.8 * R) & (np.abs(h) < 0.3) & (NN @ nrm > 0.3))[0]
        dev = h[near] - surf_height(H, e, u[near], v[near])
        sc.eye_fit.append(dict(inside=inside, surface_dev_max=float(np.abs(dev).max()), surface_dev_median=float(np.median(np.abs(dev)))))
    inside_any = np.zeros(n, bool)
    for f in sc.eye_fit:
        inside_any |= f["inside"]
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    sc.eye_bvh = BVHTree.FromPolygons([tuple(v.co) for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces])     # the uncut skin: the discs are seated on it
    dl = bm.verts.layers.deform.active
    kill = [f for f in bm.faces if all(inside_any[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.verts.index_update(); bm.verts.ensure_lookup_table()
    # the rim loops, one per eye
    rim = [e for e in bm.edges if e.is_boundary]
    for (c, lat, up, nrm, R), fit in zip(eye_frames_world(H), sc.eye_fit):
        mine = [e for e in rim if np.linalg.norm(((e.verts[0].co + e.verts[1].co) / 2 - Vector(c))[:]) < R * 1.6]
        adj = {}
        for e in mine:
            a, b = e.verts
            adj.setdefault(a.index, []).append(b.index); adj.setdefault(b.index, []).append(a.index)
        start = min(adj)                                  # deterministic: the lowest vertex index, walked toward its lower neighbour
        loop, prev, cur = [start], None, start
        while True:
            nx = sorted(adj[cur])
            nxt = nx[0] if prev is None else (nx[0] if nx[0] != prev else nx[1])
            if nxt == start:
                break
            loop.append(nxt); prev, cur = cur, nxt
            if len(loop) > len(adj) + 2:
                raise RuntimeError("eye rim is not a single loop")
        fit['loop'] = (len(loop), len(adj), len(rim))
        assert len(loop) == len(adj), f"eye rim: {len(loop)} walked, {len(adj)} boundary vertices"
        bm.verts.ensure_lookup_table()
        top = [bm.verts[i] for i in loop]
        # the rim on a true circle in the eye's plane (the deleted faces left a staircase one quad deep), seated back on the uncut skin
        nn = Vector(nrm)
        for bv in top:
            dd = bv.co - Vector(c)
            uu, vv = dd.dot(Vector(lat)), dd.dot(Vector(up))
            rr = math.hypot(uu, vv)
            p = Vector(c) + (Vector(lat) * uu + Vector(up) * vv) * (R * EYE_HOLE / rr)
            hit = sc.eye_bvh.ray_cast(p + nn * 0.4, -nn, 0.9)
            if hit[0] is not None:
                bv.co = Vector(hit[0])
        bot = []
        for bv in top:
            nv = bm.verts.new(bv.co - Vector(nrm) * (EYE_SINK + 0.004))
            if dl:
                nv[dl] = bv[dl]
            bot.append(nv)
        cen = Vector(c)
        k = len(loop)
        for i in range(k):
            a, b, a2, b2 = top[i], top[(i + 1) % k], bot[i], bot[(i + 1) % k]
            fc = bm.faces.new((a, b, b2, a2))
            mid = (a.co + b.co + a2.co + b2.co) / 4
            if fc.normal.dot(cen - mid) < 0:          # the wall faces the hole's axis
                fc.normal_flip()
            fc.smooth = True
        fit["rim_verts"] = k
    bm.to_mesh(me)
    bm.free()
    me.update()


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
    cut_eye_sockets(sc, H, me)
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
    sc.paint_ctx = (P, N, head_w, toe, me)
    nose = PT.nose_weight(H, P - H.kc) * (head_w > 0.5)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    ca.data.foreach_set("color", np.column_stack([PT.lin(col), np.ones(len(P))]).ravel())
    if level <= 2:      # the glb: smooth fields for the viewer's shader (the sprites bake the paint into the colours at level 4)
        pf = me.attributes.new("_paint", "FLOAT_COLOR", "POINT")
        pf.data.foreach_set("color", PT.paint_fields(H, P, N, head_w, 0.5 * INK_PX[304] / 110.0, 1 / 110.0).ravel())
    rp = me.attributes.new("rest_p", "FLOAT_VECTOR", "POINT"); rp.data.foreach_set("vector", P.ravel())      # rest positions: the skin's grain rides the rig (lookdev 1b)
    fl = np.array([-1.0, 0.0, -0.25])[None] - N * ((N @ np.array([-1.0, 0.0, -0.25]))[:, None])           # the fur flow: head to tail with a little gravity, projected on the surface
    fl /= np.maximum(np.linalg.norm(fl, axis=1, keepdims=True), 1e-9)
    fa = me.attributes.new("flow", "FLOAT_VECTOR", "POINT"); fa.data.foreach_set("vector", fl.ravel())
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
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = H.light["vinyl"]["roughness"]; mr.inputs["To Max"].default_value = NOSE_ROUGH
    nt.links.new(an.outputs["Fac"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 0.25
        ms = nt.nodes.new("ShaderNodeMapRange"); ms.inputs["To Min"].default_value = 0.25; ms.inputs["To Max"].default_value = NOSE_SPEC      # the nose: one soft highlight on the mound
        nt.links.new(an.outputs["Fac"], ms.inputs["Value"]); nt.links.new(ms.outputs["Result"], b.inputs["Specular IOR Level"])
    if "Coat Weight" in b.inputs:        # the nose's soft highlight: a broad clear coat that only the nose carries
        mc = nt.nodes.new("ShaderNodeMapRange"); mc.inputs["To Min"].default_value = 0.0; mc.inputs["To Max"].default_value = NOSE_COAT
        nt.links.new(an.outputs["Fac"], mc.inputs["Value"]); nt.links.new(mc.outputs["Result"], b.inputs["Coat Weight"])
        b.inputs["Coat Roughness"].default_value = 0.42
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


INK_PX = {304: 2.6, 96: 1.7, 48: 1.0}      # the smile's width in pixels of the sprite it is drawn for: a line of 2-3 px at 304, the house's 1.7 px at 96, one pixel at 48


def repaint_ink(sc, H, px_per_H):
    """Round 2 (AD item 11): the smile is a line of a width set in screen pixels, not the round-1 band (0.07 H, 6-7 px at 304). Re-evaluates the baked vertex colours with the ink
    half-width for the sprite about to be rendered (px_per_H pixels to one H)."""
    P, N, head_w, toe, me = sc.paint_ctx
    size = 304 if px_per_H > 60 else (96 if px_per_H > 20 else 48)
    half = 0.5 * INK_PX[size] / px_per_H
    col, _ = PT.vertex_colours(H, P, N, head_w, toe, ink_half=(half, 1.0 / px_per_H))
    me.color_attributes["Col"].data.foreach_set("color", np.column_stack([PT.lin(col), np.ones(len(P))]).ravel())
    me.update()
    return half


def velvet(sc, H, seed=7.31, grain_scale=37.0, fur_length=0.35):
    """The last stop (lookdev-skin-fur.md, look 1b, "velvet along the fur flow"), on the sprite build only: grain (4D noise, 3 px at 304, stretched along the flow by s = 2.5 + 5 L),
    mottle at 1/8 the frequency, sparse light flecks (Voronoi), the grain as a micro bump, a warm sheen, and a cool fuzz rim off the cream. The cream is cut to 30 % grain with no flecks
    and no rim. One flow direction for the whole creature (the lookdev's per-bone field is not built)."""
    mat = sc.final.data.materials[0]
    nt = mat.node_tree
    N = nt.nodes; Lk = nt.links
    b = N["Principled BSDF"]
    vc = next(n for n in N if n.type == "VERTEX_COLOR")
    new = lambda t, **kw: N.new(t, **kw)
    rp = new("ShaderNodeAttribute"); rp.attribute_name = "rest_p"
    fl = new("ShaderNodeAttribute"); fl.attribute_name = "flow"
    s = 2.5 + 5 * fur_length
    dot = new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"; Lk.new(rp.outputs["Vector"], dot.inputs[0]); Lk.new(fl.outputs["Vector"], dot.inputs[1])
    stretch = new("ShaderNodeVectorMath"); stretch.operation = "SCALE"; Lk.new(fl.outputs["Vector"], stretch.inputs[0]); Lk.new(dot.outputs["Value"], stretch.inputs["Scale"])
    k = new("ShaderNodeVectorMath"); k.operation = "SCALE"; Lk.new(stretch.outputs["Vector"], k.inputs[0]); k.inputs["Scale"].default_value = 1 - 1 / s
    p2 = new("ShaderNodeVectorMath"); p2.operation = "SUBTRACT"; Lk.new(rp.outputs["Vector"], p2.inputs[0]); Lk.new(k.outputs["Vector"], p2.inputs[1])
    def noise(scale, w, detail=3, rough=0.6):
        n = new("ShaderNodeTexNoise"); n.noise_dimensions = "4D"; n.inputs["Scale"].default_value = scale; n.inputs["W"].default_value = w
        n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
        Lk.new(p2.outputs["Vector"], n.inputs["Vector"]); return n
    grain = noise(grain_scale, seed)
    gm = new("ShaderNodeMapRange"); gm.inputs["From Min"].default_value = 0.3; gm.inputs["From Max"].default_value = 0.7; Lk.new(grain.outputs["Fac"], gm.inputs["Value"])
    mot = noise(grain_scale / 8, seed + 1.7)
    vor = new("ShaderNodeTexVoronoi"); vor.voronoi_dimensions = "4D"; vor.feature = "F1"; vor.inputs["Scale"].default_value = grain_scale * 0.8; vor.inputs["W"].default_value = seed + 3.1
    Lk.new(p2.outputs["Vector"], vor.inputs["Vector"])
    fm = new("ShaderNodeMapRange"); fm.inputs["From Min"].default_value = 0.28; fm.inputs["From Max"].default_value = 0.08; Lk.new(vor.outputs["Distance"], fm.inputs["Value"])
    # the cream mask from the baked albedo's lightness
    sep = new("ShaderNodeSeparateColor"); Lk.new(vc.outputs["Color"], sep.inputs["Color"])
    cm = new("ShaderNodeMapRange"); cm.inputs["From Min"].default_value = 0.12; cm.inputs["From Max"].default_value = 0.45; Lk.new(sep.outputs["Red"], cm.inputs["Value"])   # linear red: body 0.04, cream 0.87
    M = lambda op, a=None, b_=None: (lambda n: (setattr(n, "operation", op), n)[1])(new("ShaderNodeMath"))
    def mathn(op, a, bb):
        n = new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, bb)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: Lk.new(v, n.inputs[i])
        return n
    nocream = mathn("SUBTRACT", 1.0, cm.outputs["Result"])
    amp = mathn("MULTIPLY", mathn("SUBTRACT", 1.0, mathn("MULTIPLY", cm.outputs["Result"], 0.7).outputs["Value"]).outputs["Value"], 0.42)
    gdev = mathn("MULTIPLY", mathn("SUBTRACT", gm.outputs["Result"], 0.5).outputs["Value"], 2.0)
    gain = mathn("ADD", 1.0, mathn("MULTIPLY", gdev.outputs["Value"], amp.outputs["Value"]).outputs["Value"])
    mt = mathn("ADD", 0.92, mathn("MULTIPLY", mot.outputs["Fac"], 0.16).outputs["Value"])
    fleck = mathn("MULTIPLY", mathn("MULTIPLY", fm.outputs["Result"], 2.0).outputs["Value"], nocream.outputs["Value"])
    tot = mathn("MULTIPLY", gain.outputs["Value"], mt.outputs["Value"])
    # flecks lighten the body toward a warm grey; the grain and mottle scale the albedo
    mul = new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    Lk.new(vc.outputs["Color"], mul.inputs["A"])
    comb = new("ShaderNodeCombineColor"); [Lk.new(tot.outputs["Value"], comb.inputs[i]) for i in range(3)]
    Lk.new(comb.outputs["Color"], mul.inputs["B"])
    fk = new("ShaderNodeMix"); fk.data_type = "RGBA"; fk.inputs["B"].default_value = (*lin(np.array([120, 108, 104])), 1)
    Lk.new(mul.outputs["Result"], fk.inputs["A"]); Lk.new(mathn("MULTIPLY", fleck.outputs["Value"], 0.35).outputs["Value"], fk.inputs["Factor"])
    # the fuzz rim: facing^2.5 x 0.55 toward the cool rim colour, off the cream
    lw = new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    rim = mathn("MULTIPLY", mathn("MULTIPLY", mathn("POWER", lw.outputs["Facing"], 2.5).outputs["Value"], 0.55).outputs["Value"], nocream.outputs["Value"])
    rm = new("ShaderNodeMix"); rm.data_type = "RGBA"; rm.inputs["B"].default_value = (*lin(np.array(H.light["rim"]["tint"]) * 255 * 0.55), 1)
    Lk.new(fk.outputs["Result"], rm.inputs["A"]); Lk.new(rim.outputs["Value"], rm.inputs["Factor"])
    Lk.new(rm.outputs["Result"], b.inputs["Base Color"])
    bump = new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25 + 0.2 * fur_length; bump.inputs["Distance"].default_value = 0.002
    Lk.new(gm.outputs["Result"], bump.inputs["Height"]); Lk.new(bump.outputs["Normal"], b.inputs["Normal"])
    if "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = 0.3 + 0.2 * fur_length; b.inputs["Sheen Roughness"].default_value = 0.35
        b.inputs["Sheen Tint"].default_value = (1.0, 0.88, 0.7, 1)
    b.inputs["Roughness"].default_value = 0.62
    sc.scene.cycles.filter_width = 1.0


def add_eyes(sc, H, level_obj, offset=0.005):
    """Two eye discs, each carried on the (smoothed) height of the uncut skin round its socket (rest pose), sunk EYE_SINK below it, wider than the socket's hole; textured from the house's
    eye formula (unlit: the texture is the eye's own value), bound to the head bone."""
    B = sc.basis()
    towardL = H.Rh.T @ B[2]
    objs = []
    for eye, fit in zip(H.eyes, sc.eye_fit):
        C = PT.disc_cage(H, eye, grid=20, span=EYE_SPAN)
        V = np.array(C.V)
        d = V - eye["c"]
        u, v = d @ eye["lat"], d @ eye["up"]
        h = skin_height(sc, H, eye, u, v, g=21)
        P = [H.kc + eye["c"] + uu * eye["lat"] + vv * eye["up"] + eye["n"] * (hh - EYE_SINK) for uu, vv, hh in zip(u, v, h)]
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
        tex = PT.eye_texture(H, eye, towardL, span=EYE_SPAN, crescent_gain=EYE_CRESCENT_GAIN, crescent_rho=EYE_CRESCENT_RHO)
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
        # unlit: base black, no specular, the texture as the emission (strength 1): the render shows the texture's own values (design 8.2)
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Roughness"].default_value = 1.0
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.0
        nt.links.new(tn.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
        me.materials.append(mat)
        vg = ob.vertex_groups.new(name="head")
        vg.add(list(range(len(P))), 1.0, "REPLACE")
        am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
        objs.append(ob)
    return objs


def add_lids(sc, H):
    """Round 2 (AD item 6): each eye has a lid of its own, a dark disc lying in the socket just below the eye's disc (hidden by it at rest). Its `blink.L`/`blink.R` morph target raises
    it to the skin (4 mm under it, with a small swell), so at the peak the socket is shut by a lid in front of the disc, whatever angle it is seen from. The skin itself does not move."""
    objs = []
    for eye, name in zip(H.eyes, ("L", "R")):
        C = PT.disc_cage(H, eye, grid=14, span=1.45)
        V = np.array(C.V)
        d = V - eye["c"]
        u, v = d @ eye["lat"], d @ eye["up"]
        h = skin_height(sc, H, eye, u, v, g=15)
        rr = np.hypot(u, v) / (eye["Reye"] * 1.45)
        base = [H.kc + eye["c"] + uu * eye["lat"] + vv * eye["up"] + eye["n"] * (hh - EYE_SINK - 0.014) for uu, vv, hh in zip(u, v, h)]
        shut = [H.kc + eye["c"] + uu * eye["lat"] + vv * eye["up"] + eye["n"] * (hh - 0.004 + 0.007 * (1 - r * r)) for uu, vv, hh, r in zip(u, v, h, rr)]
        me = bpy.data.meshes.new("lid." + name)
        me.from_pydata([tuple(x) for x in base], [], [tuple(f) for f in C.F])
        me.update()
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        ob = bpy.data.objects.new("lid." + name, me)
        ob.parent = sc.root
        sc.scene.collection.objects.link(ob)
        ob.shape_key_add(name="Basis", from_mix=False)
        kb = ob.shape_key_add(name="blink." + name, from_mix=False)
        kb.value = 0.0            # a new key comes in at 1.0
        for i, p in enumerate(shut):
            kb.data[i].co = tuple(p)
        mat = bpy.data.materials.new("lid." + name)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*lin(H.look["body"]), 1)
        b.inputs["Roughness"].default_value = H.light["vinyl"]["roughness"]
        b.inputs["Specular IOR Level"].default_value = 0.25
        me.materials.append(mat)
        vg = ob.vertex_groups.new(name="head")
        vg.add(list(range(len(base))), 1.0, "REPLACE")
        am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
        objs.append(ob)
    return objs


def cube_sphere(g):
    """A quad ellipsoid base: a cube's faces gridded g x g and pushed to the unit sphere (no poles). Returns (verts (n,3), quads), deterministic."""
    idx, V, F = {}, [], []
    def vid(p):
        k = tuple(np.round(p, 9))
        if k not in idx:
            idx[k] = len(V); V.append(np.array(p) / np.linalg.norm(p))
        return idx[k]
    for axis in range(3):
        for sgn in (1, -1):
            for j in range(g):
                for i in range(g):
                    q = []
                    for (a, b) in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)):
                        u, v = a / g * 2 - 1, b / g * 2 - 1
                        p = [0, 0, 0]; p[axis] = sgn; p[(axis + 1) % 3] = u; p[(axis + 2) % 3] = v
                        q.append(vid(p))
                    F.append(q if sgn > 0 else q[::-1])
    return np.array(V), F


def add_beans(sc, H, g=10):
    """Round 2 (AD item 8): the paws' toes are three round beans each, embedded ellipsoids of the house's own toe radii and places (housefield toes), one cream mesh bound to the
    paw bones, in place of the cage's pointed wedges and the toe paint that spread a grey band over the dome. The right legs are the left legs' images (the Mirror's)."""
    V0, F0 = cube_sphere(g)
    P, F, W, tags = [], [], [], []
    for lg in H.legs:
        if lg["side"] != 1:
            continue
        for side in (1, -1):
            m = np.array([1, side, 1.0])
            tag = lg["name"].split(".")[0] + "_paw." + ("L" if side == 1 else "R")
            for t in lg["toes"]:
                R = np.asarray(t["R"]); c = np.asarray(t["c"])
                loc = (V0 * np.asarray(t["r"])) @ R.T + c
                n0 = len(P)
                P += [tuple(p * m) for p in loc]
                F += [tuple(i + n0 for i in (q if side == 1 else q[::-1])) for q in F0]
                W += [tag] * len(loc)
    me = bpy.data.meshes.new("beans")
    me.from_pydata(P, [], F)
    me.update()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    ob = bpy.data.objects.new("beans", me)
    ob.parent = sc.root
    sc.scene.collection.objects.link(ob)
    for tag in sorted(set(W)):
        vg = ob.vertex_groups.new(name=tag)
        vg.add([i for i, w in enumerate(W) if w == tag], 1.0, "REPLACE")
    am = ob.modifiers.new("Armature", "ARMATURE"); am.object = sc.rig
    mat = bpy.data.materials.new("beans")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(np.array(H.look["toe"])), 1)
    b.inputs["Roughness"].default_value = H.light["vinyl"]["roughness"]
    b.inputs["Specular IOR Level"].default_value = 0.25
    me.materials.append(mat)
    return ob


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


def blur(img, sigma):
    """Separable Gaussian by FFT on a zero-padded copy (numpy only, deterministic; no wrap-around)."""
    if sigma < 0.3:
        return img
    pad = int(4 * sigma) + 2
    out = np.pad(img, pad)
    for ax in (0, 1):
        n = out.shape[ax]
        k = np.fft.rfftfreq(n)
        out = np.fft.irfft(np.fft.rfft(out, axis=ax) * np.exp(-2 * (np.pi * sigma) ** 2 * (k ** 2)).reshape([-1 if i == ax else 1 for i in range(2)]), n=n, axis=ax)
    return out[pad:-pad, pad:-pad]


def posed_points(sc):
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for ob in [sc.final] + list(sc.leaves):
        me = ob.evaluated_get(dg).to_mesh()
        a = np.empty(len(me.vertices) * 3, np.float64); me.vertices.foreach_get("co", a)
        out.append(a.reshape(-1, 3))
        ob.evaluated_get(dg).to_mesh_clear()
    return np.vstack(out)


FLOOR_REACH = 1.1          # house light.floor.reach (scene units)


def floor_shadow(sc, w, h, SS=2):
    """The house's floor shadow from a clean mask, not a shadow catcher (a render's own noise left a haze across the whole frame): the posed surface points are carried along the key
    to the floor, binned by the length of their light ray t, each bin covered, blurred by a penumbra that grows with t, weighted by the house's fade (contact 170/110 under the soles,
    falling to 1 by t 0.26, then fading toward 0 at `reach`) and combined by max. Returns alpha 0..1 at 110/255 scale (contact up to 170/255), shape (h, w)."""
    P = posed_points(sc)
    l = np.asarray(sc.light_dir)
    t = np.clip(P[:, 2], 0, None) / l[2]
    F = P - l[None] * t[:, None]
    M = np.array(sc.cam.matrix_local)
    right, up, org = M[:3, 0], M[:3, 1], M[:3, 3]
    ps = max(w, h) / sc.cam_d.ortho_scale * SS
    X = w * SS / 2 + ((F - org) @ right) * ps
    Y = h * SS / 2 - ((F - org) @ up) * ps
    edges = np.array([0, 0.08, 0.16, 0.26, 0.4, 0.6, 0.85, FLOOR_REACH])
    sh = np.zeros((h * SS, w * SS))
    for i in range(len(edges) - 1):
        m = (t >= edges[i]) & (t < edges[i + 1] + (1e-9 if i == len(edges) - 2 else 0))
        if m.sum() < 20:
            continue
        tc = 0.5 * (edges[i] + edges[i + 1])
        wt = np.clip(1.55 - (tc - 0.08) * 5, 1.0, 1.55) if tc < 0.26 else max(0.0, 1 - 0.9 * (tc - 0.26) / (FLOOR_REACH - 0.26))
        H2, _, _ = np.histogram2d(Y[m], X[m], bins=[h * SS, w * SS], range=[[0, h * SS], [0, w * SS]])
        cov = 1 - np.exp(-blur(H2, 0.9 * SS) * 0.7)
        cov = np.clip(blur(cov, (0.035 + 0.07 * tc) * ps), 0, 1)
        sh = np.maximum(sh, cov * wt * (110 / 255) * (1.0))
    sh = sh.reshape(h, SS, w, SS).mean(axis=(1, 3))
    return np.clip(sh, 0, 170 / 255)


def render_sprite(sc, path, floor_obj, samples):
    """The sprite (transparent film) with the house's floor shadow (tinted (30, 26, 34), alpha 110, contact 170) composited under it."""
    sc.scene.cycles.samples = samples
    floor_obj.hide_render = True
    pa = path[:-4] + "._a.png"
    sc.render(pa, strip=False)
    A = read_png(pa)
    os.remove(pa)
    sa = floor_shadow(sc, A.shape[1], A.shape[0])
    sa[sa < 0.004] = 0.0
    sc_col = np.array([30, 26, 34]) / 255
    a = A[..., 3] + sa * (1 - A[..., 3])
    rgb = np.where(a[..., None] > 1e-6, (A[..., :3] * A[..., 3:4] + sc_col * (sa * (1 - A[..., 3]))[..., None]) / np.maximum(a[..., None], 1e-6), 0)
    out = np.dstack([np.clip(rgb, 0, 1), a])
    write_png(path, np.round(out * 255).astype(np.uint8))
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
    bvh = BVHTree.FromObject(ev, dg)
    ev.to_mesh_clear()
    B = [np.array(b) for b in sc.last_framing["B"]]
    toward, l = B[2], sc.light_dir
    px = project(sc, P)
    ok = (px[:, 0] > 2) & (px[:, 0] < 301) & (px[:, 1] > 2) & (px[:, 1] < 309)
    # round 2: only points the camera sees (a ray toward the camera from just off the surface leaves the creature): round 1 sampled hidden points, which is how the lit
    # median could land on a point inside the shade
    cand = np.where(ok & (N @ toward > 0.3))[0]
    seen = np.array([bvh.ray_cast(Vector(P[i] + N[i] * 0.004), Vector(toward), 10.0)[0] is None for i in cand], bool)
    vis = np.zeros(len(P), bool); vis[cand[seen]] = True
    ok &= vis
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
    # the body's flank, not the legs' roots or the creases between them: leg weight under 0.05 (AD gate: sample the shade on the body's side away from the key, not on the legs)
    flank = torso.copy(); idx_t = np.where(torso & ok)[0]; flank[idx_t] = (H.leg_weight(P[idx_t]) < 0.05) & (px[idx_t, 0] > 150)       # right of the head and neck: the back and flank
    lit = pick(flank & body & facing, -nl, 0.03, "lit")
    shd = pick(flank & body & facing, nl, 0.03, "shade")
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
    uu, vv = (vu[:, 0] * 2 - 1) * R * EYE_SPAN, (vu[:, 1] * 2 - 1) * R * EYE_SPAN
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
    cres, xcr = esample((r > Ri * 0.5) & (r < Ri * 0.85) & ((uu * 0.5 - vv * 0.85) / R > 0.55 * Ri / R * 1.0) & (vv < -0.2 * Ri))
    ibody, xib = esample((r > e0["pupilR"] * 1.2) & (r < Ri * 0.85) & (vv > 0.25 * Ri))
    out["iris_crescent_L"], out["iris_body_L"] = cres, ibody
    pts["ring top"], pts["ring bottom"], pts["iris crescent"], pts["iris body"] = xt[:4], xb[:4], xcr[:4], xib[:4]
    return out, {k: np.asarray(v).tolist() for k, v in pts.items()}
