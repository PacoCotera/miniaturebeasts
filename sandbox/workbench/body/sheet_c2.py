"""Chunk 2 picture: 2-legs.png. Run (bpy venv): python sheet_c2.py OUTDIR"""
import sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, sheetgen as SG, sheetlib as SL

OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
b = build.make_body(upto="legs")
names = SG.turnaround(b, OUT, "c2", centre=(-0.6, 0, 0.75), pole_dots=True)
# the owner's three wire views: side (a level eye), below, the paw close up at 3x
V = views
owner = [("side", 90.0, 0.0), ("below", 0.0, -89.0)]
views.render_views(b, os.path.join(OUT, "c2"), views=[("o-side", 90.0, 0.0), ("o-below", 0.0, -89.0)], centre=(-0.6, 0, 0.75), pole_dots=True)
pawc = np.array([-0.25, 0.55, 0.15])
views.render_views(b, os.path.join(OUT, "c2"), views=[("o-paw", 60.0, 25.0)], centre=pawc, width=380, height=340, pph=300.0, pole_dots=True)
rows = SG.quality_rows(b)
info = b.ctx["info"]["limbs"]
lt = SL.table([(n, len(r["rings"]), ", ".join(f"{s:.2f}" for s in r["rings_s"]), f"{r['perimeter_ratio']:.2f}", f"{r['roll_total_deg']:.1f} deg", f"{r['first_s']:.2f} of {r['path'].length:.2f}") for n, r in info.items()],
              ["limb", "rings", "ring s", "loop/ring perimeter", "end roll", "first ring s of length"])
body = ("<h1>Chunk 2: limbs grown from sockets (torso + 4 legs, no head yet)</h1><p>Each leg leaves a 2 x 2 socket patch on the torso's lower flank (fore: shoulder mass, hind: haunch); the 8-loop is pushed 0.02 H and bridged vertex i to vertex i to the first ring that is wholly outside the torso's analytic section and 0.10 H below the loop. "
        "The foot is the column's end: a support loop 0.03 H over the floor (radius 0.86 in the design so the sole's edge is a bevel the cage can carry) and a flat 2 x 2 sole cap; three toe beads on the front rim are inset and extruded 0.06 H after the limit fit.</p>"
        "<h2>The owner's three wire views: side, below, a paw</h2><div class='row'>" + "".join(f"<div class='cell'><img src='c2/wire-o-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n, w in (("side", 560), ("below", 560), ("paw", 560))) + "</div>"
        "<h2>Clay, 10 views</h2>" + SG.grid("clay", "c2", names) + "<h2>Wireframe (valence 5 red, 6 orange, 3 green; only what the camera sees)</h2>" + SG.grid("wire", "c2", names) +
        "<h2>Limb paths</h2>" + lt + "<h2>Mesh quality</h2>" + SG.rows_html(rows))
p = os.path.join(OUT, "2-legs.html")
open(p, "w").write(SL.page("chunk 2", body))
SL.shoot(p, os.path.join(OUT, "2-legs.png"), 1960)
