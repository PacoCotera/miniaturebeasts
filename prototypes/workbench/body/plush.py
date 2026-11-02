"""Plush look for S20 (Blender 5.2, Cycles): the soft-velvet material, the soft studio light, the AgX view and the per-individual colour pass.
Drop into s20render.py:
    mat = plush_material(paths)                       # instead of _tex_material(...)
    plush_light(sc, az)                               # instead of B.lights(sc, az) + the 2.5 deg sun; also sets the view transform
    plush_render(sc)                                  # samples, denoiser, pixel filter; the small sizes are rendered at 3x/4x and box-filtered (see SS)
    PLUSH_MATERIAL["sat"], PLUSH_MATERIAL["val"] = colour_pass(render96)   # render96(mat) = a 96 px, 24 sample render of the individual with those material settings, RGBA floats
Everything is a function of the settings below: no randomness, fixed Cycles seed."""
import math
import numpy as np
import bpy

PLUSH_MATERIAL = dict(
    rough=0.86,              # body roughness (the atlas' glassy eyes and satin nose keep their own, lower values)
    spec=0.22,               # Specular IOR level
    sheen=0.60, sheen_rough=0.40, sheen_tint=(1.0, 0.80, 0.60, 1.0),
    sss=0.14, sss_radius=(1.0, 0.45, 0.30), sss_scale=0.05,
    grain=1.5,               # bump strength multiplier of the fuzz (two octaves, about 3 and 1.5 px at 304)
    grain_scale=52.0, grain_scale2=118.0, mottle=0.07, fleck=0.10,
    edge=0.75, edge_tint=(0.80, 0.78, 0.97), edge_width=0.50,   # layer-weight facing band: cool, a little darker, just inside the edge
    ao=0.55, ao_dist=0.16, glow=1.0, glow_sat=2.5, glow_dim=0.7,   # contact occlusion mixed into the colour
    sat=1.0, val=1.0,        # colour pass on the atlas
)
PLUSH_LIGHT = dict(
    world=(0.70, 0.78, 0.95), world_strength=0.09,
    key_size=4.5, key_energy=850.0, key_color=(1.0, 0.92, 0.80), key_dist=7.5, key_tilt=38.0,
    bounce_energy=70.0, bounce_color=(1.0, 0.70, 0.46), bounce_size=3.5,
    rim_energy=900.0, rim_color=(0.70, 0.80, 1.0), rim_size=3.0,
    view="AgX", look="AgX - Punchy", exposure=0.0, gamma=1.0,
)

SOFT_RENDER = dict(samples=256, denoise=True, filter=1.0, bounces=6)
SS = {304: 1, 96: 3, 48: 4}        # render the small sprites at this multiple and box-filter down premultiplied (the soft floor shadow streaks at native 96 and 48)

def _n(nt, typ, x=0, y=0, **kw):
    n = nt.nodes.new(typ)
    n.location = (x, y)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def _in(node, name, v):
    node.inputs[name].default_value = v


def load_img(path, nonc=False, interp="Linear"):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = "Non-Color" if nonc else "sRGB"
    return im


def baseline_tex_nodes(nt, paths, interp):
    out = {}
    for k, nonc in (("col", False), ("emit", False), ("rough", True)):
        n = _n(nt, "ShaderNodeTexImage")
        n.image = load_img(paths[k], nonc)
        n.interpolation = interp
        out[k] = n
    return out


def plush_material(paths, mat=None, interp="Linear", glow=None, toon=None):
    """The matte velvet material: Principled with sheen, a little subsurface, a two-octave fuzz bump, a cool facing band, contact AO."""
    mat = PLUSH_MATERIAL if mat is None else mat
    glow = mat.get("glow", 1.5) if glow is None else glow
    m = bpy.data.materials.new("coat")
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes["Principled BSDF"]
    T = baseline_tex_nodes(nt, paths, interp)
    # colour pass and the facing band
    col = T["col"].outputs["Color"]
    # the glow's mask (emission colour, 0-1): the colour pass and the key light leave the lantern's own colour alone, or AgX bleaches it
    gm = _n(nt, "ShaderNodeSeparateColor")
    nt.links.new(T["emit"].outputs["Color"], gm.inputs["Color"])
    gmx = _n(nt, "ShaderNodeMath", operation="MAXIMUM")
    nt.links.new(gm.outputs["Red"], gmx.inputs[0]); nt.links.new(gm.outputs["Green"], gmx.inputs[1])
    gmask = _n(nt, "ShaderNodeMapRange"); _in(gmask, "From Min", 0.1); _in(gmask, "From Max", 0.6)
    nt.links.new(gmx.outputs["Value"], gmask.inputs["Value"])
    if mat["sat"] != 1.0 or mat["val"] != 1.0:
        hs = _n(nt, "ShaderNodeHueSaturation")
        _in(hs, "Saturation", mat["sat"]); _in(hs, "Value", mat["val"])
        nt.links.new(col, hs.inputs["Color"])
        keep = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MIX")           # the lantern keeps its own colour
        nt.links.new(gmask.outputs["Result"], keep.inputs["Factor"])
        nt.links.new(hs.outputs["Color"], keep.inputs["A"]); nt.links.new(col, keep.inputs["B"])
        col = keep.outputs["Result"]
    # fleck: sparse light dots (the masters' flecks); mottle: a low-frequency value drift
    tc = _n(nt, "ShaderNodeTexCoord")
    if mat["mottle"] > 0 or mat["fleck"] > 0:
        mo = _n(nt, "ShaderNodeTexNoise"); _in(mo, "Scale", 9.0); _in(mo, "Detail", 3.0)
        nt.links.new(tc.outputs["Object"], mo.inputs["Vector"])
        mm = _n(nt, "ShaderNodeMapRange"); _in(mm, "From Min", 0.3); _in(mm, "From Max", 0.7)
        _in(mm, "To Min", 1.0 - mat["mottle"]); _in(mm, "To Max", 1.0 + mat["mottle"])
        nt.links.new(mo.outputs["Fac"], mm.inputs["Value"])
        mx = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); _in(mx, "Factor", 1.0)
        nt.links.new(col, mx.inputs["A"])
        g = _n(nt, "ShaderNodeCombineColor")
        for ch in ("Red", "Green", "Blue"):
            nt.links.new(mm.outputs["Result"], g.inputs[ch])
        nt.links.new(g.outputs["Color"], mx.inputs["B"])
        col = mx.outputs["Result"]
        if mat["fleck"] > 0:
            vo = _n(nt, "ShaderNodeTexVoronoi"); _in(vo, "Scale", 85.0); _in(vo, "Randomness", 1.0)
            nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
            cr = _n(nt, "ShaderNodeMapRange"); _in(cr, "From Min", 0.07); _in(cr, "From Max", 0.02); _in(cr, "To Min", 0.0); _in(cr, "To Max", 1.0)
            nt.links.new(vo.outputs["Distance"], cr.inputs["Value"])
            nz2 = _n(nt, "ShaderNodeTexNoise"); _in(nz2, "Scale", 30.0)
            nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
            gate = _n(nt, "ShaderNodeMath", operation="GREATER_THAN"); _in(gate, 1, 0.62)
            nt.links.new(nz2.outputs["Fac"], gate.inputs[0])
            mul = _n(nt, "ShaderNodeMath", operation="MULTIPLY")
            nt.links.new(cr.outputs["Result"], mul.inputs[0]); nt.links.new(gate.outputs["Value"], mul.inputs[1])
            fl = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="SCREEN")
            nt.links.new(mul.outputs["Value"], fl.inputs["Factor"]); _in(fl, "B", (0.38, 0.34, 0.30, 1))
            nt.links.new(col, fl.inputs["A"])
            # scale the screen strength with the fleck setting
            fs = _n(nt, "ShaderNodeMath", operation="MULTIPLY"); _in(fs, 1, mat["fleck"] / 0.10)
            nt.links.new(mul.outputs["Value"], fs.inputs[0]); nt.links.new(fs.outputs["Value"], fl.inputs["Factor"])
            col = fl.outputs["Result"]
    if mat["edge"] > 0:
        lw = _n(nt, "ShaderNodeLayerWeight"); _in(lw, "Blend", 0.5)
        band = _n(nt, "ShaderNodeMapRange"); _in(band, "From Min", 0.0); _in(band, "From Max", mat["edge_width"])
        _in(band, "To Min", mat["edge"]); _in(band, "To Max", 0.0); band.clamp = True
        nt.links.new(lw.outputs["Facing"], band.inputs["Value"])
        et = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        nt.links.new(band.outputs["Result"], et.inputs["Factor"]); nt.links.new(col, et.inputs["A"])
        _in(et, "B", (*mat["edge_tint"], 1.0))
        col = et.outputs["Result"]
    if mat["ao"] > 0:
        ao = _n(nt, "ShaderNodeAmbientOcclusion", samples=8, only_local=True, inside=False); _in(ao, "Distance", mat["ao_dist"])
        nt.links.new(col, ao.inputs["Color"])
        mixao = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MIX"); _in(mixao, "Factor", mat["ao"])
        nt.links.new(col, mixao.inputs["A"]); nt.links.new(ao.outputs["Color"], mixao.inputs["B"])
        col = mixao.outputs["Result"]
    if mat.get("glow_dim", 1.0) != 1.0:
        gd = _n(nt, "ShaderNodeMapRange"); _in(gd, "To Min", 1.0); _in(gd, "To Max", mat["glow_dim"])
        nt.links.new(gmask.outputs["Result"], gd.inputs["Value"])
        dm = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); _in(dm, "Factor", 1.0)
        nt.links.new(col, dm.inputs["A"])
        gc = _n(nt, "ShaderNodeCombineColor")
        for ch in ("Red", "Green", "Blue"):
            nt.links.new(gd.outputs["Result"], gc.inputs[ch])
        nt.links.new(gc.outputs["Color"], dm.inputs["B"]); col = dm.outputs["Result"]
    nt.links.new(col, bs.inputs["Base Color"])
    em = T["emit"].outputs["Color"]
    if mat.get("glow_sat", 1.0) != 1.0:
        eh = _n(nt, "ShaderNodeHueSaturation"); _in(eh, "Saturation", mat["glow_sat"])
        nt.links.new(em, eh.inputs["Color"]); em = eh.outputs["Color"]
    nt.links.new(em, bs.inputs["Emission Color"])
    _in(bs, "Emission Strength", glow)
    # roughness: body to mat.rough, the glassy parts keep theirs
    rm = _n(nt, "ShaderNodeMapRange"); _in(rm, "From Min", 0.18); _in(rm, "From Max", 0.66); _in(rm, "To Min", 0.18); _in(rm, "To Max", mat["rough"])
    nt.links.new(T["rough"].outputs["Color"], rm.inputs["Value"])  # Color -> float: uses luminance of grey
    nt.links.new(rm.outputs["Result"], bs.inputs["Roughness"])
    _in(bs, "Specular IOR Level", mat["spec"])
    gate = _n(nt, "ShaderNodeMapRange"); _in(gate, "From Min", 0.4); _in(gate, "From Max", 0.62); _in(gate, "To Min", 0.0); _in(gate, "To Max", 1.0)   # 1 on the velvet body, 0 on the glassy eyes
    nt.links.new(T["rough"].outputs["Color"], gate.inputs["Value"])
    sw = _n(nt, "ShaderNodeMath", operation="MULTIPLY"); _in(sw, 1, mat["sheen"])
    nt.links.new(gate.outputs["Result"], sw.inputs[0]); nt.links.new(sw.outputs["Value"], bs.inputs["Sheen Weight"])
    _in(bs, "Sheen Roughness", mat["sheen_rough"]); _in(bs, "Sheen Tint", mat["sheen_tint"])
    if mat["sss"] > 0:
        sw2 = _n(nt, "ShaderNodeMath", operation="MULTIPLY"); _in(sw2, 1, mat["sss"])
        nt.links.new(gate.outputs["Result"], sw2.inputs[0]); nt.links.new(sw2.outputs["Value"], bs.inputs["Subsurface Weight"])
        _in(bs, "Subsurface Radius", mat["sss_radius"]); _in(bs, "Subsurface Scale", mat["sss_scale"])
    if mat["grain"] > 0:
        h = None
        a = _n(nt, "ShaderNodeTexNoise"); _in(a, "Scale", mat["grain_scale"]); _in(a, "Detail", 3.0); _in(a, "Roughness", 0.6)
        b2 = _n(nt, "ShaderNodeTexNoise"); _in(b2, "Scale", mat["grain_scale2"]); _in(b2, "Detail", 2.0)
        nt.links.new(tc.outputs["Object"], a.inputs["Vector"]); nt.links.new(tc.outputs["Object"], b2.inputs["Vector"])
        add = _n(nt, "ShaderNodeMath", operation="ADD")
        nt.links.new(a.outputs["Fac"], add.inputs[0]); nt.links.new(b2.outputs["Fac"], add.inputs[1])
        bp = _n(nt, "ShaderNodeBump"); _in(bp, "Strength", 0.55 * mat["grain"]); _in(bp, "Distance", 0.012)
        nt.links.new(add.outputs["Value"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bs.inputs["Normal"])
    return m


def area(sc, name, pos, target, size, energy, color, shape="SQUARE"):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = shape; d.size = size; d.energy = energy; d.color = color
    d.use_shadow = True
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    o.location = tuple(pos)
    fwd = np.array(target, float) - np.array(pos, float)
    fwd /= np.linalg.norm(fwd)
    from mathutils import Vector
    o.rotation_euler = Vector(tuple(fwd)).to_track_quat("-Z", "Y").to_euler()
    return o


def plush_light(sc, az, L=None):
    L = PLUSH_LIGHT if L is None else L
    soft_lights(sc, az, L); apply_view(sc, L)


def soft_lights(sc, az, L):
    """A big soft key where the house sun is, a warm bounce from low in front, a cool rim from behind the other shoulder."""
    w = bpy.data.worlds.new("w"); w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*L["world"], 1); bg.inputs["Strength"].default_value = L["world_strength"]
    sc.world = w
    c = np.array([-0.35, 0.0, 1.2])
    # the house key: sun rotation (50, 0, az+125) travels along R(-Z); the light sits opposite
    from mathutils import Euler
    trav = np.array(Euler((math.radians(L.get("key_tilt", 50)), 0, math.radians(az + 125)), "XYZ").to_matrix() @ __import__("mathutils").Vector((0, 0, -1)))
    kp = c - trav * L["key_dist"]
    area(sc, "key", kp, c, L["key_size"], L["key_energy"], L["key_color"])
    a = math.radians(az)
    cam_dir = np.array([math.cos(a), math.sin(a), 0.0])
    side = np.array([-math.sin(a), math.cos(a), 0.0])
    # bounce: low, from the camera side and the key side, aimed at the belly and legs
    bp = c + cam_dir * 3.2 + side * -1.2 + np.array([0, 0, -0.9])
    bp[2] = max(bp[2], 0.12)
    area(sc, "bounce", bp, c + np.array([0, 0, -0.2]), L["bounce_size"], L["bounce_energy"], L["bounce_color"])
    rp = c - cam_dir * 3.6 + side * 2.6 + np.array([0, 0, 2.6])
    area(sc, "rim", rp, c, L["rim_size"], L["rim_energy"], L["rim_color"])


def apply_view(sc, L):
    vs = sc.view_settings
    vs.view_transform = L["view"]
    try:
        vs.look = L["look"]
    except Exception:
        pass
    vs.exposure = L["exposure"]; vs.gamma = L["gamma"]


def body_stats(a):
    """Median HSV saturation and value of the opaque body pixels (alpha > 0.99) of an RGBA render (display colour)."""
    m = a[..., 3] > 0.99
    p = a[..., :3][m]
    mx, mn = p.max(1), p.min(1)
    return float(np.median(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0))), float(np.median(mx))


def colour_pass(render96, mat=None, target=(0.48, 0.72), iters=5):
    """The colour pass. render96(mat) renders the individual at 96 px, 24 samples, no denoiser, with the given material settings and returns RGBA floats.
    The Hue/Saturation gains are nudged (damped) and the best try is kept, so the body lands in the plush range (S 0.35-0.60, V 0.55-0.85). Returns (sat, val)."""
    mat = dict(PLUSH_MATERIAL) if mat is None else dict(mat)
    sat, val, best = 1.0, 1.0, None
    for _ in range(iters):
        mat["sat"], mat["val"] = sat, val
        S, V = body_stats(render96(mat))
        err = abs(S - target[0]) / 0.1 + abs(V - target[1]) / 0.1
        if best is None or err < best[0]:
            best = (err, sat, val)
        sat = float(np.clip(sat * (target[0] / S) ** 0.7, 0.5, 2.0)); val = float(np.clip(val * (target[1] / V) ** 1.4, 0.7, 3.0))
    return best[1], best[2]


def plush_render(sc):
    """Render settings: 256 samples, OIDN, pixel filter 1.0 (1.5 blurs the grain away), film transparent for the shadow catcher."""
    R = SOFT_RENDER
    sc.render.film_transparent = True
    sc.cycles.samples = R["samples"]; sc.cycles.max_bounces = R["bounces"]; sc.cycles.filter_width = R["filter"]
    sc.cycles.use_denoising = R["denoise"]; sc.cycles.denoiser = "OPENIMAGEDENOISE"
