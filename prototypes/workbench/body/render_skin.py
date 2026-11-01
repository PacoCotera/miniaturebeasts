"""Skin render (Blender, Cycles CPU, fixed seed, no denoise): the level-3 cage in the stand pose with zone vertex colours, a velvet material (rough 0.66, rim sheen, grain bump), the face decals laid on the surface by ray casting (eyes: open / half / closed;
mouth `content`), a shadow-catcher floor and the house's key light. Returns the RGBA arrays. Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import bpyio as B
import views, rig as RG, subdiv as SD, skin as SK, gates
from housefield import from_local, to_local

SIZES = gates.SIZES


def _material(name, rough, sheen=0.0, bump=0.0, spec=0.25):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "Col"; at.attribute_type = "GEOMETRY"
    nt.links.new(at.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    for k in ("Specular IOR Level",):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = spec
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = sheen
        bsdf.inputs["Sheen Roughness"].default_value = 0.5
    if bump > 0:
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 260.0; nz.inputs["Detail"].default_value = 6.0
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.004
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def mesh_obj(name, V, F, col, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    arr = np.hstack([np.asarray(col, float), np.ones((len(V), 1))])
    ca.data.foreach_set("color", arr.ravel())
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def cast(ob, p, d, dist=2.0):
    hit, loc, nrm, idx = ob.ray_cast(Vector(p.tolist()), Vector(d.tolist()), distance=dist)
    return (np.array(loc), np.array(nrm)) if hit else (None, None)


def eye_frame_data(b):
    ctx = b.ctx
    ey = ctx["info"]["eye"]
    V0 = b.cage.arr()
    L, _ = b.cage.limit_points()
    c0 = L[ey["centre"]]
    nb = V0[ey["loop"]]
    n = np.cross(nb[2] - nb[6], nb[4] - nb[0]); n /= np.linalg.norm(n)
    if n @ (c0 - ctx["H"].kc) < 0:
        n = -n
    up = np.array([0, 0, 1.0]) - n[2] * n; up /= np.linalg.norm(up)
    lat = np.cross(up, n)
    return c0, n, up, lat


def decals(b, rest_obj, eye_frames=("open", "open"), mouth="content", palette="charcoal", face=None):
    """Decal meshes (verts, faces, sRGB colours or -1 for the coat) from ray casts onto the rest mesh. Eyes: [near, far] frames. Returns a list of dict."""
    ctx = b.ctx; H = ctx["H"]
    c0, n, up, lat = eye_frame_data(b)
    E = H.eyes[0]
    face = face or {}
    Riris = E["Riris"] * 1.3 * face.get("eye_size", 1.0)               # AD gate 1: the iris grows (orange >= 95 rows at 304), the ring stays thin and warm
    Reye = Riris + 0.055 * face.get("eye_size", 1.0)
    c0 = c0 + up * face.get("eye_height", 0.0)
    out = []
    for side, fr in ((1, eye_frames[0]), (-1, eye_frames[1])):
        pts2, cols, faces = SK.eye_disc(fr, Riris, Reye)
        V, good = [], []
        for (u, v) in pts2:
            p = c0 + u * lat + v * up + n * 0.3
            hit, nr = cast(rest_obj, p, -n, 1.0)
            V.append((hit + nr * 0.003) if hit is not None else (c0 + u * lat + v * up))
            good.append(hit is not None)
        V = np.array(V)
        # a decal never leaves the surface: faces with a vertex that found no surface (past the head's outline) are dropped
        F = [tuple(f) for f in faces if all(good[i] for i in f)]
        if side < 0:
            V = V * np.array([1, -1, 1]); F = [tuple(reversed(f)) for f in F]
        out.append(dict(V=V, F=F, col=cols, name=f"eye{'L' if side > 0 else 'R'}-{fr}"))
        if fr == "closed":
            tt = np.linspace(-0.85, 0.85, 24)
            line = []
            for t in tt:
                u = t * Reye; v = 0.10 * Reye * (1 - t * t) - 0.02
                p = c0 + u * lat + v * up + n * 0.3
                hit, nr = cast(rest_obj, p, -n, 1.0)
                line.append((hit + nr * 0.006, nr) if hit is not None else (c0 + u * lat + v * up, n))
            V2, F2 = ribbon([l[0] for l in line], [l[1] for l in line], 0.022)
            if side < 0:
                V2 = V2 * np.array([1, -1, 1]); F2 = [tuple(reversed(f)) for f in F2]
            out.append(dict(V=V2, F=F2, col=np.tile(np.array(SK.EYE["ink"], float), (len(V2), 1)), name=f"lid{side}"))
    if mouth == "content":
        mw = H.mouth["w"] * face.get("mouth_width", 1.0)
        # a smile along the nose's underside: 0.9 of the house's width, curling up at the corners
        ys = np.linspace(-0.5 * mw * 1.7, 0.5 * mw * 1.7, 40)
        Rfa = ctx["info"]["head"]["Rfa"]
        pts, nrm = [], []
        for y in ys:
            s = abs(y) / (0.5 * mw * 1.7)
            zloc = SK.SMILE_Z + 0.015 + face.get("mouth_z", 0.0) + 0.07 * s ** 2 + 0.05 * max(0, s - 0.6) ** 2
            origin = from_local(H.kc, Rfa, np.array([1.3, y, zloc]))
            hit, nr = cast(rest_obj, origin, Rfa @ np.array([-1.0, 0, 0]), 3.0)
            if hit is None:
                continue
            pts.append(hit + nr * 0.005); nrm.append(nr)
        V2, F2 = ribbon(pts, nrm, 0.03)
        out.append(dict(V=V2, F=F2, col=np.tile(np.array(SK.EYE["ink"], float), (len(V2), 1)), name="mouth"))
    return out


def ribbon(pts, nrm, w):
    pts = np.array(pts); n = len(pts)
    V = []
    for i in range(n):
        t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]; t /= np.linalg.norm(t)
        s = np.cross(nrm[i], t); s /= np.linalg.norm(s)
        V += [pts[i] - s * w / 2, pts[i] + s * w / 2]
    F = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(n - 1)]
    return np.array(V), F


def render_skin(b, Rg, Mpose, outpath, size, az=57.5, el=8.0, palette="charcoal", eye_frames=("open", "open"), mouth="content", level=3, samples=48, centre=None, alpha_only=False, align=None, zones=None, material=None, face=None):
    ctx = b.ctx
    Vf, Ff, attr, fp, cr, mir = b.full()
    V3, F3, _, attr3, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    colors = SK.vertex_colors(ctx, V3, attr3, palette, zones)
    W = Rg.weights(V3, attr3)
    Vp = Rg.skin(V3, W, Mpose)
    w, h, ppH = SIZES[size]
    sc = B.reset()
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = "RGBA"
    sc.cycles.samples = samples
    sc.cycles.max_bounces = 4
    vm = {**SK.VELVET, **(material or {})}
    mat_body = _material("velvet", vm["roughness"], vm["sheen"], bump=0.35 * vm["grain"])
    mat_dec = _material("decal", 0.45, 0.0, 0.0, spec=0.35)
    decs = []
    if not alpha_only:
        rest = mesh_obj("rest", V3, F3, colors, mat_body)
        decs = decals(b, rest, eye_frames, mouth, palette, face)
        bpy.data.objects.remove(rest)
    # the head decals follow the head bone rigidly
    Mh = Mpose["head"]
    body_ob = mesh_obj("body", Vp, F3, colors, mat_body)
    coat = SK.srgb_to_lin((SK.PALETTES[palette] if isinstance(palette, str) else palette)["coat"])
    for d in decs:
        Vd = np.hstack([d["V"], np.ones((len(d["V"]), 1))]) @ Mh.T
        c = np.array(d["col"], float)
        lin = np.where(c[:, :1] < 0, coat[None, :], SK.srgb_to_lin(np.clip(c, 0, 255)))
        mesh_obj(d["name"], Vd[:, :3], d["F"], lin, mat_dec)
    # leaves are a flat colour already; the floor catches the shadow
    fl = bpy.data.meshes.new("floor"); fl.from_pydata([(-1.0, -1.0, 0), (0.6, -1.0, 0), (0.6, 1.0, 0), (-1.0, 1.0, 0)] if False else [(-2.2, -1.5, 0), (0.9, -1.5, 0), (0.9, 1.5, 0), (-2.2, 1.5, 0)], [], [(0, 1, 2, 3)])
    fo = bpy.data.objects.new("floor", fl); sc.collection.objects.link(fo); fo.is_shadow_catcher = True
    ko = B.lights(sc, az)
    ko.data.angle = math.radians(2.5)
    c0 = np.array([-0.45, 0.0, 1.1]) if centre is None else np.array(centre)
    cam = B.camera(sc, az, el, w, h, c0, ppH=ppH)
    sc.render.filepath = outpath
    bpy.ops.render.render(write_still=True)
    return gates.load_rgba(outpath), cam


def aligned_centre(b, Rg, Mpose, size, az=57.5, el=8.0):
    """Camera centre that puts the creature's lowest row and left edge where the master's are (a cheap alpha render of the posed clay)."""
    M = views.level_mesh(b, 2)
    Mp = dict(M, V=Rg.skin(M["V"], Rg.weights(M["V"], M["attr"]), Mpose))
    w, h, ppH = SIZES[size]
    name = {304: "304x312", 96: "96x88", 48: "48x48"}[size]
    m = gates.load_rgba(gates.MASTER % name)
    mb = gates.bbox(m[..., 3])
    c0 = np.array([-0.45, 0.0, 1.1])
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "_align.png")
    a, cam = gates.render_rgba(Mp, out, az, el, w, h, c0, ppH, samples=1)
    xb = gates.bbox(a[..., 3])
    return c0 - cam["right"] * (mb[0] - xb[0]) / ppH + cam["up"] * (mb[3] - xb[3]) / ppH
