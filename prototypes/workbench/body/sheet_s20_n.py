"""S20 chunk sheets 2-4: the 10-angle turnaround (clay and wire), optional close wire views, the mesh-quality rows and the chunk's own rows.
Run (bpy venv): python sheet_s20_n.py STAGE OUTDIR   (STAGE: legs | tubes | base)"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, sheetgen as SG, sheetlib as SL, s20sheet as SS, s20views as SV, mquality as Q, subdiv as SD, s20measure as M, views
import test_helpers_s20 as TH

STAGE = sys.argv[1]
OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else SS.BUILD
os.makedirs(OUT, exist_ok=True)
NUM = {"legs": 2, "tubes": 3, "base": 4}[STAGE]
TITLE = {"legs": "chunk 2: the legs", "tubes": "chunk 3: the tail and the ears (the tube kind)", "base": "chunk 4: the bare base (AD gate)"}[STAGE]
TAG = f"c{NUM}"
b = s20build.make_s20(upto=STAGE)
spec = b.ctx["spec"]
mesh = views.level_mesh(b, 2)
names = SV.turnaround(b, os.path.join(OUT, TAG), centre=(-0.1 if STAGE != "legs" else 0.0, 0, 1.1), width=480, height=520, pph=125.0, mesh=mesh, pole_dots=True)
SL_grid = lambda prefix, sub, names, w=480, cols=4: f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
V2 = mesh["V"]
extra, close_html = [], ""
if STAGE == "legs":
    cl = views.render_views(b, os.path.join(OUT, TAG), views=[("owner-side", 90.0, 0.0), ("owner-below", 0.0, -89.0), ("owner-foot", 35.0, 8.0)], tag="own-", width=620, height=420, pph=330.0, centre=(0.0, 0, 0.35), mesh=mesh, pole_dots=True)
    close_html = ("<h2>The owner's three wire views: side, from below, a foot (close)</h2><div class='row'>" +
                  "".join(f"<div class='cell'><div class='cap'>{k}</div><img src='{TAG}/own-wire-{k}.png' width='620'></div>" for k in ("owner-side", "owner-below", "owner-foot")) + "</div>")
    low = V2[:, 2] < 0.04
    gap = 2 * float(np.abs(V2[low, 1]).min())
    extra.append(("inner foot gap at the floor >= 0.10 H (no crotch fold)", f"{gap:.3f} H", gap >= 0.10))
    extra.append(("sole on the floor: lowest level-2 point", f"{V2[:, 2].min():.3f} H", V2[:, 2].min() > -0.03))
rr = TH.ring_ratio(b)
extra.append(("loft ring ratio (adjacent half-widths and depths) <= 1.5", f"{rr:.3f}", rr <= 1.5))
rows = SG.quality_rows(b, extra)
notes = {"legs": "Leg socket: station 0.42, column 5 (the file's column key), one transition ring, loop-to-ring pairing by least distance (the loop sits on a near-vertical wall, so Loika's pairing by angle crossed). Toe beads and flat soles as Loika's.",
         "tubes": "", "base": ""}[STAGE]
body = (f"<h1>S20 Tuliko, {TITLE}</h1><p>{notes}</p>" + close_html +
        "<h2>Clay, 10 views</h2>" + SL_grid("clay", TAG, names) +
        "<h2>Wireframe (valence 5 red, 6 orange, 3 green)</h2>" + SL_grid("wire", TAG, names) +
        "<h2>Mesh quality (the file's thresholds; failing rows stay failing)</h2>" + SG.rows_html(rows))
p = os.path.join(OUT, f"{NUM}-{STAGE}.html")
open(p, "w").write(SL.page(f"S20 {TITLE}", body))
SL.shoot(p, os.path.join(OUT, f"{NUM}-{STAGE}.png"), 1960)
print("ok")
