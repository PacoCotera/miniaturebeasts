"""Light calibration on a sphere (design section 10, AD gate item 3): a sphere of a given albedo in the house's world, key and rim, rendered with the build's
shader settings; prints the lit and shade values (linear Y, L*, Lab b*) so the fill can be set before Loika is touched.
Run (bpy venv):  python calib.py OUTDIR [lit] [ratio]"""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
import finish as FN
from housefield import House


def lab(rgb):
    c = np.asarray(rgb, float)
    l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    X = l @ [0.4124, 0.3576, 0.1805]; Y = l @ [0.2126, 0.7152, 0.0722]; Z = l @ [0.0193, 0.1192, 0.9505]
    f = lambda t: np.cbrt(t) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(X / 0.9505), f(Y), f(Z / 1.089)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def sphere_scene(H, albedo255, lit, ratio, out, name):
    sc = Scene.__new__(Scene)
    sc.H = H
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc.scene = bpy.context.scene
    sc.root = bpy.data.objects.new("root", None); sc.root.rotation_euler = (0, 0, -math.pi / 2); sc.scene.collection.objects.link(sc.root)
    sc._world_and_lights()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1.0)
    ob = bpy.context.active_object; ob.parent = sc.root
    bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new("s"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(albedo255), 1)
    b.inputs["Roughness"].default_value = H.light["vinyl"]["roughness"]
    b.inputs["Specular IOR Level"].default_value = SPEC
    b.inputs["Subsurface Weight"].default_value = SSS_W
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.55, 0.35); b.inputs["Subsurface Scale"].default_value = 0.02
    ob.data.materials.append(m)
    fill = os.environ.get("FILL")
    if fill:
        sc.world_bg.inputs["Color"].default_value = (*[float(x) for x in fill.split(",")], 1)
    sc.scene.world.cycles_visibility.glossy = os.environ.get("GLOSSY", "1") == "1"
    sc.set_light_strength(lit, ratio)
    B = sc.basis(); sc.aim_lights(B)
    sc.frame(B, 200, 200, 80.0, centre_pt=np.zeros(3))
    sc.scene.cycles.samples = 64
    p = os.path.join(out, name + ".png"); sc.render(p)
    img = FN.read_png(p)
    right, up, toward = B
    l = sc.light_dir
    def at(nrm, rad=0.08):
        nrm = np.asarray(nrm) / np.linalg.norm(nrm)
        # pixels whose sphere normal is within `rad` of nrm
        ys, xs = np.mgrid[0:200, 0:200]
        a = (xs + 0.5 - 100) / 80.0; bb = -(ys + 0.5 - 100) / 80.0
        r2 = a * a + bb * bb
        ok = r2 < 0.98
        n = right[None, None] * a[..., None] + up[None, None] * bb[..., None] + toward[None, None] * np.sqrt(np.clip(1 - r2, 0, 1))[..., None]
        near = ok & (np.linalg.norm(n - nrm, axis=-1) < rad)
        return np.median(img[near][:, :3], axis=0), int(near.sum())
    return sc, at, l, (right, up, toward)


SSS_W = float(os.environ.get("SSS", 0.06)); SPEC = float(os.environ.get("SPEC", 0.25))
if __name__ == "__main__":
    out = os.path.abspath(sys.argv[1]); os.makedirs(out, exist_ok=True)
    lit = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    ratio = float(sys.argv[3]) if len(sys.argv) > 3 else 0.58
    H = House("S01")
    res = {}
    for nm, alb in (("body", H.look["body"]), ("cream", H.look["cream"])):
        sc, at, l, B = sphere_scene(H, alb, lit, ratio, out, "sphere-" + nm)
        # the shade point: the visible normal most opposite the key (on the sphere's limb), and one at n.l = -0.3 toward the camera side
        shade_n = -l + B[2] * 0.0
        s_lim = np.cross(np.cross(B[2], -l), B[2]); s_lim = s_lim / np.linalg.norm(s_lim)             # in the screen plane, away from the key
        pts = {"lit": l, "shade_ndl-0.3": s_lim * 0.75 + B[2] * 0.66}
        pts["shade_ndl-0.3"] = pts["shade_ndl-0.3"] / np.linalg.norm(pts["shade_ndl-0.3"])
        r = {}
        for k, n in pts.items():
            c, cnt = at(n)
            Lq, a_, b_ = lab(c); Y = float(np.asarray(0.2126 * FN.Lstar(c)[1]) * 0 + FN.Lstar(c)[1])
            r[k] = dict(rgb=[round(float(x), 4) for x in c], Y=round(Y, 5), L=round(float(Lq), 1), a=round(float(a_), 1), b=round(float(b_), 1), n=cnt, ndl=round(float(n @ l), 2))
        ys, xs = np.mgrid[0:200, 0:200]; disc = ((xs + 0.5 - 100) ** 2 + (ys + 0.5 - 100) ** 2) < (0.9 * 80) ** 2
        px = FN.read_png(os.path.join(out, "sphere-" + nm + ".png"))[disc][:, :3]
        Ls = np.array([lab(c) for c in px[::7]]); r["disc_median_L_a_b"] = [round(float(x), 1) for x in np.median(Ls, axis=0)]
        r["shade_over_lit_Y"] = round(r["shade_ndl-0.3"]["Y"] / r["lit"]["Y"], 3)
        res[nm] = r
    print(json.dumps(res, indent=1))
