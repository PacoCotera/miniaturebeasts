"""Chunk 3 picture: 3-base.png. The bare base: 10-angle clay and wire, the 3/4 stand view beside the master at 304 / 96 / 48, the underside and leg runs at y 275, the front view, the tests. Run (bpy venv): python sheet_c3.py OUTDIR"""
import sys, os, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, sheetgen as SG, sheetlib as SL, gates, mquality as Q, subdiv as SD

OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
b = build.make_body(upto="base", crown=False)
ctx = b.ctx
names = SG.turnaround(b, OUT, "c3", centre=(-0.5, 0, 1.05), pole_dots=True)
views.render_views(b, os.path.join(OUT, "c3"), views=[("front", 0.0, 8.0)], centre=(-0.1, 0, 1.2), width=420, height=380, pph=130.0, wire=True, pole_dots=True)
sv = gates.stand_view(b, os.path.join(OUT, "c3"), "stand")
# leg runs and underside
mine = sv[304]["alpha"]; mast = sv[304]["master_alpha"]
ru_m, ru_b = gates.leg_runs_275(mast), gates.leg_runs_275(mine)
un_m, un_b = gates.underside(mast), gates.underside(mine)
runs_tbl = SL.table([("master", ru_m), ("this build (rest pose, ortho)", ru_b)], ["y 275", "opaque runs (x0, x1)"])
un_tbl = SL.table([(x, un_m[x], un_b[x]) for x in sorted(un_m)], ["x", "master lowest opaque row", "build lowest opaque row"])
V2 = None
V, F, attr, fp = Q.full_topology(b)
Vf, Ff, _, _, cr, _ = b.full()
V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
c = (np.abs(V2[:, 1]) < 0.03) & (V2[:, 0] > -0.95) & (V2[:, 0] < -0.5)
belly = float(V2[c][:, 2].min())
low = (V2[:, 2] < 0.06) & (V2[:, 1] > 0.1)
gap = (ru_b[-1][0] - ru_b[-2][1]) / 95.0 if len(ru_b) >= 2 else 0.0
hz = ctx["info"]["limbs"]["hind.L"]["ringinfo"][0]["centre"][2]
fl = Q.flips(V2, F2)
extra = [("belly clear on the centre line, waist (AD: 0.47 H)", f"{belly:.3f} H", abs(belly - 0.47) <= 0.05),
         ("gap between near fore and hind feet at the ground (AD: about 0.21 H = 20 px)", f"{gap:.3f} H = {gap * 95:.0f} px", abs(gap - 0.21) <= 0.10),
         ("hind column visible under the haunch >= 0.15 H", f"{hz:.2f} H", hz >= 0.15),
         ("level-2 surface: no folds", f"min adjacent normal dot {fl['min_adjacent_normal_dot']:.2f}", fl["min_adjacent_normal_dot"] > -0.2)]
rows = SG.quality_rows(b, extra)
def px(s, z, name):
    return f"<div class='cell'><div class='cap'>{name}</div><img src='c3/{s}' width='{z}' style='image-rendering:pixelated'></div>"
cmp_ = ("<div class='row'>" +
        "<div class='cell'><div class='cap'>master 304</div><img src='file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-304x312.png' width='304' style='background:#999'></div>" +
        px("stand-304.png", 304, "this build 304 (clay, rest pose, ortho)") +
        "<div class='cell'><div class='cap'>master 96 (4x)</div><img src='file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-96x88.png' width='384' style='image-rendering:pixelated;background:#999'></div>" +
        px("stand-96.png", 384, "this build 96 (4x)") +
        "<div class='cell'><div class='cap'>master 48 (6x)</div><img src='file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-48x48.png' width='288' style='image-rendering:pixelated;background:#999'></div>" +
        px("stand-48.png", 288, "this build 48 (6x)") + "</div>")
body = ("<h1>Chunk 3: the bare base (torso, four legs, neck, head, muzzle lobe, nose, eye insets): AD gate 1</h1>"
        "<p>One quad cage, half model + mirror, level-2 Catmull-Clark; clay in the house's light, orthographic (the master is perspective). Rest pose: the stand pose (body yaw 57.5, head yaw 29.5, lead paw, far leg forward) arrives in chunk 4. Colour, eyes, the crown and the bib arrive in chunks 5 and 6, so the comparison is of FORM only.</p>"
        "<h2>3/4 view beside the master at 304 / 96 / 48 (camera yaw 57.5 deg, pitch 8)</h2>" + cmp_ +
        "<h2>Underside rows and leg runs at y 275 (the AD's gate: belly clear about 0.47 H, three masses with a 20 px gap, hind leg about 50 px)</h2><div class='row'>" + runs_tbl + un_tbl + "</div>"
        "<h2>Front view: lobe on the midline (clay, wire)</h2><div class='row'><div class='cell'><img src='c3/clay-front.png' width='420'></div><div class='cell'><img src='c3/wire-front.png' width='420'></div></div>"
        "<h2>Clay, 10 views</h2>" + SG.grid("clay", "c3", names) + "<h2>Wireframe (valence 5 red, 6 orange, 3 green; what the camera sees)</h2>" + SG.grid("wire", "c3", names) +
        "<h2>Mesh quality and the AD's body numbers</h2>" + SG.rows_html(rows))
p = os.path.join(OUT, "3-base.html")
open(p, "w").write(SL.page("chunk 3", body))
SL.shoot(p, os.path.join(OUT, "3-base.png"), 1960)
json.dump(dict(belly=belly, gap=gap, runs_master=ru_m, runs_build=ru_b, underside_master=un_m, underside_build=un_b), open(os.path.join(OUT, "3-gates.json"), "w"), default=int)
print("ok")
