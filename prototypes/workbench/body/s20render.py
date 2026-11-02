"""S20 skin render (Blender, Cycles CPU, fixed seed, no denoise): the level-3 mesh with the coat's vertex colours and emission, a velvet material, a shadow-catcher floor and the house light. Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bpyio as B
import subdiv as SD, s20coat as CT, gates, gltf_out

SIZES = gates.SIZES


def prepare(b, genome, level=3, frame="open", pose=None, rig=None):
    ctx = b.ctx
    Vf, Ff, attr, fp, cr, mir = b.full()
    V3, F3, _, attr3, fp3 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F3a = np.array(F3, int)
    npart = len(b.parts) + 1
    cnt = np.zeros((len(V3), npart))
    for k in range(4):
        np.add.at(cnt, (F3a[:, k], fp3.astype(int)), 1.0)
    part = cnt.argmax(1)
    N = gltf_out.vertex_normals(V3, F3)
    out = CT.coat(ctx, V3, attr3, part, N, attr3[:, 3], genome, frame)
    Vp = V3
    if pose is not None:
        W = rig.weights(V3, attr3, part)
        Vp = rig.skin(V3, W, pose)
    return dict(V=Vp, V0=V3, F=F3, attr=attr3, part=part, N=N, **out)


def _material(rough, sheen, grain, emit_strength=1.0):
    m = bpy.data.materials.new("coat")
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes["Principled BSDF"]
    for nm, sock in (("Col", "Base Color"), ("Emit", "Emission Color")):
        at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = nm; at.attribute_type = "GEOMETRY"
        nt.links.new(at.outputs["Color"], bs.inputs[sock])
    bs.inputs["Emission Strength"].default_value = emit_strength
    ar = nt.nodes.new("ShaderNodeAttribute"); ar.attribute_name = "Rough"; ar.attribute_type = "GEOMETRY"
    mr = nt.nodes.new("ShaderNodeMath"); mr.operation = "MULTIPLY"; mr.inputs[1].default_value = rough / 0.66
    nt.links.new(ar.outputs["Fac"], mr.inputs[0])
    nt.links.new(mr.outputs["Value"], bs.inputs["Roughness"])
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = 0.25
    if "Sheen Weight" in bs.inputs:
        bs.inputs["Sheen Weight"].default_value = sheen
        bs.inputs["Sheen Roughness"].default_value = 0.5
    if grain > 0:
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 260.0; nz.inputs["Detail"].default_value = 6.0
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35 * grain; bp.inputs["Distance"].default_value = 0.004
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bs.inputs["Normal"])
    return m


def mesh_obj(prep, genome, glow_scale=1.0):
    V, F = prep["V"], prep["F"]
    me = bpy.data.meshes.new("body")
    me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    n = len(V)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    ca.data.foreach_set("color", np.hstack([prep["col"], np.ones((n, 1))]).ravel())
    ce = me.color_attributes.new("Emit", "FLOAT_COLOR", "POINT")
    ce.data.foreach_set("color", np.hstack([prep["emit"] * glow_scale, np.ones((n, 1))]).ravel())
    cr_ = me.attributes.new("Rough", "FLOAT", "POINT")
    cr_.data.foreach_set("value", np.asarray(prep["rough"], float))
    ob = bpy.data.objects.new("body", me)
    bpy.context.scene.collection.objects.link(ob)
    g = {**CT.COAT_DEFAULT, **genome}
    me.materials.append(_material(0.66, g["sheen"], g["grain"]))
    return ob


def render(prep, genome, path, size, az=57.5, el=10.0, centre=None, samples=48, glow_scale=1.0, wh=None, ppH=None, floor=True):
    w, h, ppH0 = SIZES[size] if wh is None else (wh[0], wh[1], ppH)
    ppH = ppH or ppH0
    sc = B.reset()
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = "RGBA"
    sc.cycles.samples = samples
    sc.cycles.max_bounces = 4
    mesh_obj(prep, genome, glow_scale)
    if floor and el > 0:                 # no floor under the creature when the camera looks up from below
        fl = bpy.data.meshes.new("floor"); fl.from_pydata([(-2.4, -1.6, 0), (1.2, -1.6, 0), (1.2, 1.6, 0), (-2.4, 1.6, 0)], [], [(0, 1, 2, 3)])
        fo = bpy.data.objects.new("floor", fl); sc.collection.objects.link(fo); fo.is_shadow_catcher = True
    ko = B.lights(sc, az)
    ko.data.angle = math.radians(2.5)
    c0 = np.array([-0.35, 0.0, 1.3]) if centre is None else np.array(centre)
    cam = B.camera(sc, az, el, w, h, c0, ppH=ppH)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return gates.load_rgba(path), cam


def to_png(rgba, path, bg=(0.93, 0.92, 0.90)):
    """Composite an RGBA float array over a flat background (sRGB-encoded like Blender's Standard view) and write it."""
    a = rgba[..., 3:4]
    rgb = rgba[..., :3] * a + np.array(bg) * (1 - a)
    B.write_png(path, B.to_srgb8(np.dstack([rgb, np.ones(rgb.shape[:2] + (1,))])))


# ---------------------------------------------------------------------- the textured mesh (pass 2): the render of what the glb ships
def _tex_material(paths, rough_scale, sheen, grain, emit_strength=1.0):
    m = bpy.data.materials.new("coat")
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes["Principled BSDF"]
    def img(path, nonc=False):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path)
        n.image.colorspace_settings.name = "Non-Color" if nonc else "sRGB"
        n.interpolation = "Linear"
        return n
    c = img(paths["col"]); e = img(paths["emit"]); r = img(paths["rough"], True)
    nt.links.new(c.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(e.outputs["Color"], bs.inputs["Emission Color"])
    bs.inputs["Emission Strength"].default_value = emit_strength
    mr = nt.nodes.new("ShaderNodeMath"); mr.operation = "MULTIPLY"; mr.inputs[1].default_value = rough_scale / 0.66
    nt.links.new(r.outputs["Color"], mr.inputs[0])
    nt.links.new(mr.outputs["Value"], bs.inputs["Roughness"])
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = 0.25
    if "Sheen Weight" in bs.inputs:
        bs.inputs["Sheen Weight"].default_value = sheen
        bs.inputs["Sheen Roughness"].default_value = 0.5
    if grain > 0:
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 260.0; nz.inputs["Detail"].default_value = 6.0
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35 * grain; bp.inputs["Distance"].default_value = 0.004
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bs.inputs["Normal"])
    return m


def tex_obj(M, paths, genome, glow_scale=1.5):
    V, F = M["V"], M["F"]
    me = bpy.data.meshes.new("body")
    me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    uv = me.uv_layers.new(name="UVMap")
    UV = np.asarray(M["UV"], float)
    loops = np.array([v for f in F for v in f])
    uvl = np.stack([UV[loops, 0], 1.0 - UV[loops, 1]], 1)               # Blender's v runs up the image
    uv.data.foreach_set("uv", uvl.ravel())
    try:
        me.normals_split_custom_set_from_vertices([tuple(n) for n in M["N"]])
    except Exception:
        pass
    ob = bpy.data.objects.new("body", me)
    bpy.context.scene.collection.objects.link(ob)
    g = {**CT.COAT_DEFAULT, **genome}
    me.materials.append(_tex_material(paths, 0.66, g["sheen"], g["grain"], glow_scale))
    return ob


def render_tex(M, paths, genome, path, w, h, ppH, az=57.5, el=10.0, centre=(-0.35, 0, 1.3), samples=None, glow_scale=1.5, floor=True):
    """The plush look (look-dev 30ad1e70, plush.py): the velvet material, the soft studio light, AgX Punchy, 256 samples with the denoiser; 96 px frames are rendered at 3x and 48 px at 4x and box-filtered down (native small renders streak). Returns the RGBA float array and the camera."""
    import plush as PL
    ss = PL.SS.get(int(w), 1)
    sc = B.reset()
    PL.plush_render(sc)
    sc.render.image_settings.color_mode = "RGBA"
    if samples is not None and samples < 100:
        sc.cycles.samples = min(PL.SOFT_RENDER["samples"], max(samples, 64))               # a quick render for the close-ups: fewer samples, same look
    mat = PL.plush_material(paths)
    V, F = M["V"], M["F"]
    me = bpy.data.meshes.new("body")
    me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
    me.update()
    for p_ in me.polygons:
        p_.use_smooth = True
    uv = me.uv_layers.new(name="UVMap")
    UV = np.asarray(M["UV"], float)
    loops = np.array([v for f in F for v in f])
    uv.data.foreach_set("uv", np.stack([UV[loops, 0], 1.0 - UV[loops, 1]], 1).ravel())
    try:
        me.normals_split_custom_set_from_vertices([tuple(n) for n in M["N"]])
    except Exception:
        pass
    ob = bpy.data.objects.new("body", me)
    sc.collection.objects.link(ob)
    me.materials.append(mat)
    if floor and el > 0:
        fl = bpy.data.meshes.new("floor"); fl.from_pydata([(-7, -5, 0), (5, -5, 0), (5, 5, 0), (-7, 5, 0)], [], [(0, 1, 2, 3)])
        fo = bpy.data.objects.new("floor", fl); sc.collection.objects.link(fo); fo.is_shadow_catcher = True
    PL.plush_light(sc, az)
    cam = B.camera(sc, az, el, w * ss, h * ss, np.array(centre, float), ppH=ppH * ss)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    a = gates.load_rgba(path)
    if ss > 1:                                    # box filter, premultiplied
        pre = a.copy(); pre[..., :3] *= pre[..., 3:4]
        pre = pre.reshape(h, ss, w, ss, 4).mean((1, 3))
        al = pre[..., 3:4]
        a = np.concatenate([np.where(al > 1e-6, pre[..., :3] / np.maximum(al, 1e-6), 0), al], 2)
    return a, cam
