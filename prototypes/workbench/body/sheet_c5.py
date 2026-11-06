"""Chunk 5 picture: 5-crown.png. bare / fan / sprout / bud / vine on one Loika, 4 angles each, plus the attachment numbers. Run (bpy venv): python sheet_c5.py OUTDIR"""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, sheetlib as SL, mquality as Q, subdiv as SD, collections, crown as CR

OUT = os.path.abspath(sys.argv[1]); os.makedirs(os.path.join(OUT, "c5"), exist_ok=True)
fams = [("bare", None), ("fan", dict(family="fan", count=3)), ("fan5", dict(family="fan", count=5, length=1.15, spread=10)), ("sprout", dict(family="sprout", length=1.0, curl=0.35)), ("bud", dict(family="bud"))]
ang = [("front", 0.0, 10.0), ("3/4", 40.0, 14.0), ("side", 90.0, 8.0), ("back", 180.0, 14.0)]
rows, info = [], []
for tag, cr in fams:
    b = build.make_body(upto="base", crown=cr if cr else False)
    views.render_views(b, os.path.join(OUT, "c5"), views=[(f"{tag}-{n.replace('/', '')}", az, el) for n, az, el in ang], centre=(-0.1, 0, 1.75), width=300, height=300, pph=120.0, wire=False, samples=24)
    V, F, _, fp = Q.full_topology(b)
    cv = collections.Counter(Q.valence(F, len(V)).tolist())
    man = Q.manifold(V, F)
    info.append((tag, f"{b.ctx['info'].get('crown', {}).get('n', 0)}", dict(sorted(cv.items())), man["non_manifold_edges"], f"{b.ctx['log']['limit']['max_err']:.4f}"))
grid = "<div class='grid' style='grid-template-columns:120px repeat(4,300px)'>"
for tag, cr in fams:
    grid += f"<div class='cap' style='align-self:center'><b>{tag}</b><br>{'' if not cr else ', '.join(f'{k} {v}' for k, v in cr.items())}</div>" + "".join(f"<div class='cell'><img src='c5/clay-{tag}-{n.replace('/', '')}.png' width='300'><div class='cap'>{n}</div></div>" for n, az, el in ang)
grid += "</div>"
t = SL.table(info, ["family", "items", "valence census", "non-manifold edges", "limit err"])
body = ("<h1>Chunk 5: the crown, by family</h1><p>Every Loika has a crown (owner ruling): bare is the template and test body only. Each leaf, stem and bud is a closed shape swept along a path written by a small turtle (the grammar of s3.3), "
        "with its own rings and end caps, sunk into the head, jittered from a seeded PCG64 (+-5 % length). The fan is symmetric about the mirror plane (the master's -62/8/66 roll is hand-drawn asymmetry); the centre leaf lies in the plane and is a half shape, the pairs are full shapes off the plane. "
        "Same limit fit as the body: all families shown converge to 0.004 H or less. The vine family (a curling stem with leaflets) is cut: its leaflets do not converge (0.099 H).</p>" + grid + "<h2>Cage numbers</h2>" + t)
p = os.path.join(OUT, "5-crown.html"); open(p, "w").write(SL.page("chunk 5", body)); SL.shoot(p, os.path.join(OUT, "5-crown.png"), 1560)
print("ok")
