"""The 10-view turnaround (8 azimuths + above + below), clay and wireframe. Run under the bpy venv."""
import os, sys, math
import numpy as np
import bpyio as B
import bpy
from mathutils import Vector
import subdiv as SD

VIEWS = [(f"az{a:03d}", float(a), 15.0) for a in range(0, 360, 45)] + [("top", 0.0, 89.0), ("bottom", 0.0, -89.0)]


def level_mesh(body, level=2):
    V, F, attr, fp, cr, mirror = body.full()
    V2, F2, cr2, attr2, fp2 = SD.subdivide(V, F, cr, attr, fp, levels=level)
    return dict(V0=V, F0=F, V=V2, F=F2, attr=attr2, fp=fp2, cr=cr2)


def render_views(body, outdir, views=VIEWS, width=380, height=340, level=2, wire=True, tag="", centre=(-0.55, 0, 0.95), samples=32, color=(0.55, 0.52, 0.50), pole_dots=False, pph=95.0):
    os.makedirs(outdir, exist_ok=True)
    M = level_mesh(body, level)
    res = {}
    _, F0_, _, _, _, _ = body.full()
    valence = np.zeros(len(M['V0']), int)
    for f in F0_:
        for i in f:
            valence[i] += 1
    for name, az, el in views:
        sc = B.reset()
        sc.cycles.samples = samples
        B.make_mesh("body", M["V"], M["F"], color=color)
        B.lights(sc, az)
        cam = B.camera(sc, az, el, width, height, centre, ppH=pph)
        p = os.path.join(outdir, f"{tag}clay-{name}.png")
        a = B.render_to_array(p)
        img = B.to_srgb8(a)
        B.write_png(p, img)
        res[name] = p
        if wire:
            V0, F0 = M["V0"], M["F0"]
            P2, depth = B.project(cam, V0)
            ob = bpy.data.objects["body"]
            fwd = cam["fwd"]
            edges = sorted({(min(f[k], f[(k + 1) % 4]), max(f[k], f[(k + 1) % 4])) for f in F0 for k in range(4)})
            NS = 5
            s0, s1, cols = [], [], []
            vis_cache = {}
            def visible(X):
                o = X - fwd * 20.0
                ok, loc, nrm, idx = ob.ray_cast(Vector(o.tolist()), Vector(fwd.tolist()), distance=40.0)[:4] if False else (lambda r: (r[0], r[1], r[2], r[3]))(ob.ray_cast(Vector(o.tolist()), Vector(fwd.tolist()), distance=40.0))
                if not ok:
                    return True
                return (Vector(loc) - Vector(o.tolist())).length >= 20.0 - 0.04
            for (a_, b_) in edges:
                ts = np.linspace(0, 1, NS + 1)
                pts = V0[a_][None] * (1 - ts[:, None]) + V0[b_][None] * ts[:, None]
                vis = [visible(p) for p in pts]
                p2 = P2[a_][None] * (1 - ts[:, None]) + P2[b_][None] * ts[:, None]
                for k in range(NS):
                    if vis[k] and vis[k + 1]:
                        s0.append(p2[k]); s1.append(p2[k + 1])
            s0, s1 = np.array(s0), np.array(s1)
            segs = list(range(len(s0)))
            img2 = np.kron(img, np.ones((2, 2, 1), np.uint8))
            img2 = B.draw_lines(img2, s0 * 2, s1 * 2, [(20, 60, 160)] * len(segs), alpha=0.95)
            if pole_dots:
                sel = [i for i in range(len(V0)) if valence[i] != 4 and visible(V0[i])]
                pts = [P2[i] * 2 for i in sel]
                cols = [(220, 30, 30) if valence[i] == 5 else ((200, 120, 0) if valence[i] == 6 else (30, 160, 60)) for i in sel]
                img2 = B.draw_dots(img2, pts, cols, r=3)
            pw = os.path.join(outdir, f"{tag}wire-{name}.png")
            B.write_png(pw, img2)
            res[name + "_wire"] = pw
    return res
