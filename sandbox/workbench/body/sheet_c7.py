"""Chunk 7 picture: 7-variety.png. 12 seeded Loikas at 96 (as the game shows them) and at 304, genes printed under each; checks per individual; silhouette IoU. Run (bpy venv): python sheet_c7.py OUTDIR"""
import sys, os, json, time, math, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genes, individuals, gates, mquality as Q, subdiv as SD, sheetlib as SL
from tests.test_base import pole_kinds

OUT = os.path.abspath(sys.argv[1]); D = os.path.join(OUT, "c7"); os.makedirs(D, exist_ok=True)
rows, cells, masks, creatures = [], [], [], []
for i in range(1, 13):
    c = genes.creature(genes.draw(i)); creatures.append(c)
    t0 = time.time()
    b, R, o = individuals.render_individual(c, D, f"ind{i}", sizes=(304, 96))
    V, F, attr, fp = Q.full_topology(b)
    man = Q.manifold(V, F)
    unl, kinds = pole_kinds(b, V, F)
    Vf, Ff, _, _, cr, _ = b.full()
    V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
    cm = (np.abs(V2[:, 1]) < 0.03) & (V2[:, 0] > -0.95) & (V2[:, 0] < -0.5)
    belly = float(V2[cm][:, 2].min())
    fl = Q.flips(V2, F2)
    lim = b.ctx["log"]["limit"]["max_err"]
    a = gates.load_rgba(o["files"][304]); masks.append(a[..., 3] > 0.5)
    ok = dict(manifold=man["non_manifold_edges"] == 0 and man["inconsistent_winding"] == 0, poles=len(unl) == 0, limit=lim <= 0.004, belly=abs(belly - 0.47) <= 0.05, sink=float(V2[:, 2].min()) >= -0.03, folds=fl["min_adjacent_normal_dot"] > -0.2)
    rows.append((i, c["palette"], f"{c['crown']['family']} {c['crown']['count']}", o, ok, lim, belly))
# silhouette IoU at the stand camera (pairwise; the camera centre differs per individual so the masks are aligned by the feet row and left edge, as the master is)
iou = np.zeros((12, 12))
for i in range(12):
    for j in range(12):
        inter = (masks[i] & masks[j]).sum(); uni = (masks[i] | masks[j]).sum()
        iou[i, j] = inter / uni if uni else 1.0
mx = max(iou[i, j] for i in range(12) for j in range(12) if i != j)
def label(c):
    cr, bd, fc = c["crown"], c["body"], c["face"]
    return (f"<b>#{c['_i']}</b> {c['palette']} x{c['coat_value']:.2f} grain {c['material']['grain']:.2f} sheen {c['material']['sheen']:.2f}<br>crown {cr['family']} {cr['count']} len {cr['length']:.2f} wid {cr['width']:.2f} spread {cr['spread']:+.0f} curl {cr['curl']:.2f} lean {math.degrees(cr['lean']/0.9):+.0f}<br>"
            f"bib {c['zones']['bib_reach']:+.2f} socks {c['zones']['socks']:.2f}<br>body limb {bd['limb_length']:.3f}/{bd['limb_girth']:.3f} torso {bd['torso_length']:.3f}/{bd['torso_girth']:.3f}<br>face eye {fc['eye_size']:.3f} {fc['eye_height']:+.3f} mouth {fc['mouth_width']:.3f} {fc['mouth_z']:+.3f}; speed {c['motion']['speed']:.2f}")
for i, c in enumerate(creatures):
    c["_i"] = i + 1
g96 = "<div class='grid' style='grid-template-columns:repeat(6,420px)'>" + "".join(f"<div class='cell'><img src='c7/ind{i+1}-96.png' width='96' style='image-rendering:pixelated'> <img src='c7/ind{i+1}-96.png' width='288' style='image-rendering:pixelated'><div class='cap' style='text-align:left'>{label(creatures[i])}</div></div>" for i in range(12)) + "</div>"
g304 = "<div class='grid' style='grid-template-columns:repeat(4,400px)'>" + "".join(f"<div class='cell'><img src='c7/ind{i+1}-304.png' width='304'><div class='cap' style='text-align:left'>{label(creatures[i])}</div></div>" for i in range(12)) + "</div>"
tr = [(r[0], r[1], r[2], *[SL.status(v) for v in r[4].values()], f"{r[5]:.4f}", f"{r[6]:.3f}", f"{r[3]['t_build']:.2f}", f"{r[3]['t_render'][304]:.2f}", f"{r[3]['t_render'][96]:.2f}") for r in rows]
tt = SL.table(tr, ["#", "coat", "crown", *[k for k in rows[0][4]], "limit err", "belly", "cage+rig s", "304 sprite s", "96 sprite s"])
body = (f"<h1>Chunk 7: genes and the variety sheet</h1><p>12 individuals, seeded (PCG64 [2026, i]); #1 is the type specimen (every t = 0.5: m = 1, o = 0). Following the owner's note the COAT (palette, coat value, bib reach, socks, grain, sheen) and the CROWN (family, count, length, width, spread, curl, lean) are wide loci; body and face loci are tight bands, drawn in a tight sub-range. "
        f"Every creature is built from its own creature.json (canonical JSON, sorted keys, 1e-6), rig and render in the same code path. Pairwise silhouette IoU (feet row and left edge aligned like the master): the largest between two different individuals is <b>{mx:.3f}</b> (the spec asks for under 0.97). The head-size gene is not built (the head comes from the house field).</p>"
        "<h2>At 96 (1x and 3x)</h2>" + g96 + "<h2>At 304</h2>" + g304 + "<h2>Per individual checks and timing</h2>" + tt)
p = os.path.join(OUT, "7-variety.html"); open(p, "w").write(SL.page("chunk 7", body)); SL.shoot(p, os.path.join(OUT, "7-variety.png"), 1720)
json.dump(dict(max_iou=mx, rows=[(r[0], r[1], r[2], r[4], r[5], r[6]) for r in rows]), open(os.path.join(OUT, "7-variety.json"), "w"), default=str, indent=1)
print("ok max iou", round(mx, 3))
