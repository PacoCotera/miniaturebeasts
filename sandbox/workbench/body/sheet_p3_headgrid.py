"""Pass 3 step 1: the head-attachment grid. The spine's end on the head's underside at 0.35 / 0.45 / 0.50 of the head's depth from the back (the pivot a nod turns about) x the head's centre 0 / 0.08 / 0.15 of its depth forward of the spine axis (the head's shape: its back radius shrinks and its front radius grows, fading out over the dome).
Every tile: the clay at az 90 with the spine polyline (red), its end on the head's underside (red dot) and the head centre (blue), the same with a 15 degree nod about that pivot, the house view at 304 in the plush render and 96 (x3). Under the bpy venv."""
import os, sys, math, copy, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20p3 as P3, s20rig, sheetlib as SL, bpyio as B, s20views as SV

OUT = P3.OUT
SUB = os.path.join(OUT, "head-attach-grid")
os.makedirs(SUB, exist_ok=True)
AS = (0.35, 0.45, 0.50)
DS = (0.0, 0.08, 0.15)
NOD = math.radians(15.0)
tiles = {}
for d in DS:
    r = P3.variant(head=dict(d=d))
    c, b, R0 = P3.make(r)
    tex = None
    for a in AS:
        b.ctx["spec"]["parts"]["torso"]["head_attach"]["a"] = a
        R = s20rig.Rig(b.ctx)
        tag = f"a{int(a * 100):02d}-d{int(d * 100):02d}-"
        p_rest = os.path.join(SUB, tag + "clay.png")
        P3.clay_side(b, R, p_rest, az=90.0, centre=(-0.1, 0, 1.45), w=300, h=340, pph=130.0)
        p_nod = os.path.join(SUB, tag + "nod.png")
        P3.clay_side(b, R, p_nod, az=90.0, centre=(-0.1, 0, 1.45), w=300, h=340, pph=130.0, pose=R.pose(head_nod=NOD), spine=False)
        out, tex, paths = P3.plush_views(b, R, c, SUB, tag=tag, sizes=(304, 96), tex=tex)
        n = P3.head_numbers(b)
        g = R.head_geom
        tiles[(a, d)] = dict(tag=tag, n=n, g=g)
        print(tag, n["head_w"], flush=True)
cells = []
for d in DS:
    for a in AS:
        t = tiles[(a, d)]
        n, g = t["n"], t["g"]
        cells.append(f"<div class='cell'><div class='cap'><b>spine end at {a:.2f} of the head's depth from the back &middot; head centre {d:.2f} of its depth forward</b><br>"
                     f"pivot x {g['pivot'][0]:+.3f}, head centre x {g['centre'][0]:+.3f} H; head {n['head_w']:.2f} wide, {n['head_depth']:.2f} deep</div>"
                     f"<div class='row'><img src='head-attach-grid/{t['tag']}clay.png' width='300'><img src='head-attach-grid/{t['tag']}nod.png' width='300'></div>"
                     f"<div class='row' style='justify-content:center'><img src='head-attach-grid/{t['tag']}house-304.png' width='304'><img src='head-attach-grid/{t['tag']}house-96.png' width='288' style='image-rendering:pixelated'></div>"
                     f"<div class='cap'>left: rest, spine polyline; second: nodded 15&deg; about the red dot; below: house view 304 px and 96 px (x3)</div></div>")
body = ("<h1>S20 Tuliko pass 3, step 1: the head attachment grid</h1><p>Rows: the head pushed forward of the spine axis by 0, 0.08, 0.15 of its depth (the face grows forward from the equator up, the back of the skull gives up a quarter of that; pass 3 fix after the owner's note on a flat back). Columns: where the spine's end meets the head's underside, 0.35, 0.45, 0.50 of the head's depth from the back. "
        "The head's shape follows the row (face forward, dome over the neck); the column moves the pivot (a nod swings the face about it).</p>"
        + "<div class='grid' style='grid-template-columns:repeat(3,640px)'>" + "".join(cells) + "</div>")
open(os.path.join(OUT, "head-attach-grid.html"), "w").write(SL.page("head attach grid", body))
SL.shoot(os.path.join(OUT, "head-attach-grid.html"), os.path.join(OUT, "head-attach-grid.png"), 2000)
