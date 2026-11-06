"""Pass 2 step 11: whiskers and fangs on Tuliko, and the horn (ages 0, 0.33, 0.66, 1.0) and tusk framework tests on the bare base. Under the bpy venv."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, s20build, s20tex as TX, s20pipe as PP, s20render as RN, appendages as AP, sheetlib as SL, subdiv as SD, s20normals as NM, nview, bpyio as B, views, bpy
sub = os.path.join(P2.OUT, "s11-appendages"); os.makedirs(sub, exist_ok=True)
c, b, R = IN.make(1)
def face_close(name, body, coat, R_, pose=True, az=(0, 32, 90), ppH=330.0):
    tex = PP.make_tex(body, coat, frames=("open",)); paths = P2.write_tex(tex, os.path.join(sub, "tex-" + name))
    M = TX.render_mesh(body, 2)
    outs = []
    for a in az:
        p = os.path.join(sub, f"{name}-az{a}.png")
        arr, cam = RN.render_tex(M, paths, coat, p, 360, 340, ppH, az=float(a), el=6.0, centre=(0.35, 0.0, 1.5), samples=48)
        RN.to_png(arr, p); outs.append(os.path.basename(p))
    return outs
cells = []
variants = [("whiskers3", dict(whiskers=dict(count=3, length=0.38, droop=0.3, curl=0.3), fangs=0), dict(), "3 whiskers a side, length 0.38 H, droop 0.3, curl 0.3"),
            ("whiskers-glow", dict(whiskers=dict(count=2, length=0.32, droop=0.4, curl=0.5, glow=True), fangs=0), dict(), "2 a side, glowing tips (the rare variant)"),
            ("fangs-closed", dict(whiskers=dict(count=0), fangs=2), dict(), "two tiny fangs, mouth closed (content)"),
            ("fangs-open", dict(whiskers=dict(count=2, length=0.28, droop=0.25, curl=0.2), fangs=2), dict(expression="open"), "two tiny fangs and 2 whiskers, open-mouth expression")]
for name, ap, gx, label in variants:
    bb = s20build.make_s20(upto="base", appendages=ap)
    imgs = face_close(name, bb, {**c["coat"], **gx}, R)
    cells.append(f"<div class='cell'><div class='cap'>{label}</div>" + "".join(f"<img src='s11-appendages/{i}' width='300'>" for i in imgs) + "</div>")
# whiskers as tubes at 304 and 96 (the house view)
bb = s20build.make_s20(upto="base", appendages=dict(whiskers=dict(count=3, length=0.38, droop=0.3, curl=0.3), fangs=0))
import s20rig
Rr = s20rig.Rig(bb.ctx)
tex = PP.make_tex(bb, c["coat"], frames=("open",)); paths = P2.write_tex(tex, os.path.join(sub, "tex-house"))
M = P2.posed(TX.render_mesh(bb), bb, Rr, Rr.stand_pose())
hs = []
for size, (w, h, ppH) in ((304, (304, 312, 95.0)), (96, (96, 88, 30.0))):
    p = os.path.join(sub, f"house-{size}.png")
    arr, cam = RN.render_tex(M, paths, c["coat"], p, w, h, ppH, az=32.0, el=10.0, centre=(-0.35, 0, 1.3), samples=48); RN.to_png(arr, p); hs.append(os.path.basename(p))
# the framework test: the bare base with a horn at four ages and a tusk
fw = []
for label, ap in [("horn age 0", dict(horn=dict(age=0.0))), ("horn age 0.33", dict(horn=dict(age=0.33))), ("horn age 0.66", dict(horn=dict(age=0.66))), ("horn age 1.0", dict(horn=dict(age=1.0))), ("tusk age 1.0", dict(tusk=dict(age=1.0)))]:
    bb2 = s20build.make_s20(upto="base", appendages=ap)
    Vf, Ff, attr, fp, cr, mir = bb2.full(); V2, F2, _, at2, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
    vn = NM.vertex_normals(V2, F2)
    key = label.replace(" ", "_")
    cen = (0.2, 0.2, 2.1) if label.startswith("horn") else (0.45, 0.2, 1.4)
    for az in (60.0, 0.0):
        v = views.render_views(bb2, sub, views=[(f"{key}-a{int(az)}", az, 12.0)], tag="fw-", width=300, height=320, pph=250.0, centre=cen, wire=False, samples=24)
        img = nview.render(V2, F2, vn, az, 12.0, cen, 250.0, 300, 320)[0]
        B.write_png(os.path.join(sub, f"fwn-{key}-a{int(az)}.png"), img)
    lg = bb2.ctx["log"]["appendages"]
    fw.append(f"<div class='cell'><div class='cap'>{label}: " + (f"length {lg['horn']['length']:.3f} H, {lg['horn']['ridges']} ridges, wear {lg['horn']['wear']:.2f}" if 'horn' in lg else f"length {lg['tusk']['length']:.3f} H") + "</div>"
              + f"<img src='s11-appendages/fw-clay-{key}-a60.png' width='280'><img src='s11-appendages/fw-clay-{key}-a0.png' width='280'><br><img src='s11-appendages/fwn-{key}-a60.png' width='280'><img src='s11-appendages/fwn-{key}-a0.png' width='280'></div>")
rows = [("whiskers", "2-3 a side from the muzzle as thin tapered tubes (radius 0.011 H = 2.1 px at 304 px, tapering to 0.004), length 0.2-0.45 H, droop and curl genes; rare glowing tips (the night-light species)", None),
        ("decal or tubes", "see the read below: at 304 the tube whiskers read as hair-thin lines and leave the silhouette; at 96 they are 0.7 px and read only as a faint shading; decal strokes on the cheek would stay inside the face and would not break the outline", None),
        ("fangs", "one or two tiny cones (0.06 H) under the lip at the mouth corners, a rare gene (about 1 in 4: 3 of the twelve), shown closed and open below", None),
        ("horn and tusk", "family code, schema and tests in place (appendages.py; tests/test_s20_p2_appendages.py): length, curl, girth and ridge count never decrease with age; blunt nub to point; wear and a darker base past age 0.85. Not on Tuliko", None)]
notes = ("<p><b>Framework test, not Tuliko</b> labels the horn and tusk tiles: they sit on Tuliko's bare base only to show the family code. The attachment shells sit on the surface, so their bases are tagged sharp creases like the toes (vertex tag 1, left out of the normal test).</p>")
body = (f"<h1>S20 Tuliko, pass 2, step 11: whiskers, fangs, and the horn and tusk families</h1>" + notes + SL.table(rows, ["Item", "What"]) +
        "<h2>Tuliko: whiskers and fangs, three angles (az 0, 32, 90)</h2><div class='grid' style='grid-template-columns:repeat(2,950px)'>" + "".join(cells) + "</div>" +
        "<h2>Whiskers as tubes in the house view at 304 and 96 (the 96 px render at 3x)</h2><div class='row'><div class='cell'><img src='s11-appendages/house-304.png' width='304'></div><div class='cell'><img src='s11-appendages/house-96.png' width='288' style='image-rendering:pixelated'></div></div>" +
        "<h2>Framework test, not Tuliko: a horn at ages 0, 0.33, 0.66, 1.0 and a tusk on the bare base (clay above, Normal view below; az 60 and 0)</h2><div class='grid' style='grid-template-columns:repeat(3,600px)'>" + "".join(fw) + "</div>")
open(os.path.join(P2.OUT, "s11-appendages.html"), "w").write(SL.page("S20 pass 2 step 11", body))
SL.shoot(os.path.join(P2.OUT, "s11-appendages.html"), os.path.join(P2.OUT, "s11-appendages.png"), 1960)
print("done")
