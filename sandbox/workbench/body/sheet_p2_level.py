"""Pass 2: the shipped level. Level 1 of the relaxed cage against level 2 and level 3: vertex counts, glb sizes, silhouette IoU at 304 / 96 / 48, and close-ups of the head and belly outlines in the plush render. Under the bpy venv."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, s20tex as TX, s20pipe as PP, s20render as RN, s20glb, s20sil as SL, sheetlib as SL2, subdiv as SD
sub = os.path.join(P2.OUT, "s12-level"); os.makedirs(sub, exist_ok=True)
c, b, R = IN.make(1)
Vf, Ff, attr, fp, cr, mir = b.full()
rows = []
sil = {}; cnt = {}
for L in (1, 2, 3):
    V, F, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=L); cnt[L] = len(V)
    for size in (304, 96, 48):
        sil[(L, size)] = SL.silhouette(V, np.array(F), size)
tex = PP.make_tex(b, c["coat"], frames=("open", "half", "closed"), ship_level=1)
sizes = {}
for L in (1, 2):
    M = TX.render_mesh(b, L)
    r = s20glb.build(b, R, M, tex, os.path.join(sub, f"s20-L{L}.glb"), extras=dict(level=L))
    sizes[L] = (r["bytes"], r["verts"], r["tris"])
rows = [("cage", f"{len(Vf)} vertices (full mirrored cage), {len(b.cage.V)} in the half model", None),
        ("level 1 (shipped)", f"{cnt[1]} welded vertices; the glb has {sizes[1][1]} (split at UV seams), {sizes[1][2]} triangles, {sizes[1][0] / 1e6:.2f} MB, with the 2048 atlas and the clips", sizes[1][1] <= 3500),
        ("level 2", f"{cnt[2]} welded; the glb {sizes[2][1]} vertices, {sizes[2][2]} triangles, {sizes[2][0] / 1e6:.2f} MB", None),
        ("level 3", f"{cnt[3]} (the reference)", None)] + \
       [(f"silhouette IoU against level 3 at {s} px", f"level 1 {SL.iou(sil[(1, s)], sil[(3, s)]):.4f}, level 2 {SL.iou(sil[(2, s)], sil[(3, s)]):.4f} (needs 0.98)", SL.iou(sil[(1, s)], sil[(3, s)]) >= 0.98) for s in (304, 96, 48)]
paths = P2.write_tex(tex, os.path.join(sub, "tex"))
tiles = []
for L in (1, 2):
    M = P2.posed(TX.render_mesh(b, L), b, R, R.stand_pose())
    for nm, cen in (("head", (-0.1, 0.0, 1.7)), ("belly", (0.1, 0.0, 0.9))):
        p = os.path.join(sub, f"L{L}-{nm}.png")
        a, cam = RN.render_tex(M, paths, c["coat"], p, 360, 360, 260.0, az=32.0, el=8.0, centre=cen, samples=128)
        RN.to_png(a, p)
    for size, (w, h, ppH) in ((304, (304, 312, 95.0)),):
        p = os.path.join(sub, f"L{L}-304.png")
        a, cam = RN.render_tex(M, paths, c["coat"], p, w, h, ppH, az=32.0, el=10.0, centre=(-0.35, 0, 1.3))
        RN.to_png(a, p)
cells = "".join(f"<div class='cell'><div class='cap'>level {L}: {nm}</div><img src='s12-level/L{L}-{nm}.png' width='360'></div>" for nm in ("head", "belly") for L in (1, 2))
house = "".join(f"<div class='cell'><div class='cap'>level {L}, 304</div><img src='s12-level/L{L}-304.png' width='304'></div>" for L in (1, 2))
html = ("<h1>S20 Tuliko, pass 2: ship subdivision level 1</h1><p>The owner: 15,000 vertices is too many. The glb ships level 1 of the relaxed cage with smooth vertex normals (the coat is on the texture, so no vertex density is needed to carry it). The cage was trimmed from 882 to 786 vertices (body rings every 0.16 H, tail rings every 0.062 H, the arm and ear bridges unchanged). "
        "Detail the geometry does not need (the toe beads, fine creases, the fuzz) is in the texture and the render material; a normal map baked from level 3 was not made in this pass.</p>" + SL2.table([(a, b_, "" if c_ is None else SL2.status(c_)) for a, b_, c_ in rows], ["Measure", "Value", ""]) +
        "<h2>Close-ups at 3x the house scale (plush render), level 1 against level 2: head and belly outlines</h2><div class='grid' style='grid-template-columns:repeat(4,370px)'>" + cells + "</div><h2>House view at 304</h2><div class='row'>" + house + "</div>")
open(os.path.join(P2.OUT, "s12-level.html"), "w").write(SL2.page("level", html))
SL2.shoot(os.path.join(P2.OUT, "s12-level.html"), os.path.join(P2.OUT, "s12-level.png"), 1600)
print("done", rows)
