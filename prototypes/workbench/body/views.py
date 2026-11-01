"""The 10-view turnaround (8 azimuths + above + below), clay and wireframe. Run under the bpy venv."""
import os, sys, math
import numpy as np
import bpyio as B
import subdiv as SD

VIEWS = [(f"az{a:03d}", float(a), 15.0) for a in range(0, 360, 45)] + [("top", 0.0, 89.0), ("bottom", 0.0, -89.0)]


def level_mesh(body, level=2):
    V, F, attr, fp, cr, mirror = body.full()
    V2, F2, cr2, attr2, fp2 = SD.subdivide(V, F, cr, attr, fp, levels=level)
    return dict(V0=V, F0=F, V=V2, F=F2, attr=attr2, fp=fp2, cr=cr2)


def render_views(body, outdir, views=VIEWS, width=380, height=340, level=2, wire=True, tag="", centre=(-0.55, 0, 0.95), samples=32, color=(0.55, 0.52, 0.50), pole_dots=False):
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
        cam = B.camera(sc, az, el, width, height, centre)
        p = os.path.join(outdir, f"{tag}clay-{name}.png")
        a = B.render_to_array(p)
        img = B.to_srgb8(a)
        B.write_png(p, img)
        res[name] = p
        if wire:
            V0, F0 = M["V0"], M["F0"]
            P2, depth = B.project(cam, V0)
            # cage edges, front faces only (face normal . view < 0)
            nrm = np.array([np.cross(V0[f[1]] - V0[f[0]], V0[f[2]] - V0[f[0]]) + np.cross(V0[f[2]] - V0[f[0]], V0[f[3]] - V0[f[0]]) for f in F0])
            front = (nrm @ cam["fwd"]) < 0
            segs = set()
            for fi, f in enumerate(F0):
                if front[fi]:
                    for k in range(4):
                        a_, b_ = f[k], f[(k + 1) % 4]
                        segs.add((min(a_, b_), max(a_, b_)))
            segs = sorted(segs)
            s0 = np.array([P2[a_] for a_, b_ in segs]); s1 = np.array([P2[b_] for a_, b_ in segs])
            # a bigger render for the wire: draw on a 2x supersample of the clay for crispness
            img2 = np.kron(img, np.ones((2, 2, 1), np.uint8))
            img2 = B.draw_lines(img2, s0 * 2, s1 * 2, [(20, 60, 160)] * len(segs), alpha=0.95)
            if pole_dots:
                pts = [P2[i] * 2 for i in range(len(V0)) if valence[i] != 4 and (True)]
                cols = [(220, 30, 30) if valence[i] == 5 else (30, 160, 60) for i in range(len(V0)) if valence[i] != 4]
                img2 = B.draw_dots(img2, pts, cols, r=3)
            pw = os.path.join(outdir, f"{tag}wire-{name}.png")
            B.write_png(pw, img2)
            res[name + "_wire"] = pw
    return res
