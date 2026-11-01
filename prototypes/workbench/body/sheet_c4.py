"""Chunk 4 picture: 4-walk.png. The stand pose beside the master, 8 walk frames from the side and from below, paws close up, the paw-orientation table. Run (bpy venv): python sheet_c4.py OUTDIR"""
import sys, os, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, rig, gates, subdiv as SD, sheetlib as SL, mquality as Q

OUT = os.path.abspath(sys.argv[1]); os.makedirs(os.path.join(OUT, "c4"), exist_ok=True)
b = build.make_body(upto="base", crown=False)
R = rig.Rig(b.ctx)
M0 = views.level_mesh(b, 2)
W = R.weights(M0["V"], M0["attr"])
def posed(M):
    return dict(M0, V=R.skin(M0["V"], W, M))
# stand pose beside the master (the head turned 29.5 deg, the lead paw, the far fore leg forward)
sv = gates.stand_view(b, os.path.join(OUT, "c4"), "stand", mesh=posed(R.stand_pose()))
cells = []
for i in range(8):
    ph = i / 8
    Mp, st = R.walk_pose(ph)
    mesh = posed(Mp)
    views.render_views(b, os.path.join(OUT, "c4"), views=[(f"w{i}-side", 90.0, 4.0), (f"w{i}-below", 0.0, -89.0)], centre=(-0.5, 0, 0.9), width=380, height=300, wire=False, mesh=mesh, samples=16)
    if i in (0, 2, 4, 6):
        views.render_views(b, os.path.join(OUT, "c4"), views=[(f"w{i}-paw", 60.0, 20.0)], centre=np.array([-0.2, 0.45, 0.2]), width=330, height=260, wire=False, mesh=mesh, pph=220.0, samples=16)
# the paw table: for each of 16 frames the sole tilt and forward yaw of each paw, stance flag
rows = []
worst_tilt = 0.0
for i in range(16):
    ph = i / 16
    Mp, _ = R.walk_pose(ph)
    r = [f"{ph:.3f}"]
    for kind, side, off in (("fore", "L", 0.0), ("hind", "R", 0.0), ("fore", "R", 0.5), ("hind", "L", 0.5)):
        u = (ph + off) % 1
        m = Mp[f"{kind}.paw.{side}"]
        up = m[:3, :3] @ np.array([0, 0, 1.0]); fw = m[:3, :3] @ np.array([1.0, 0, 0])
        tilt = math.degrees(math.acos(np.clip(up[2], -1, 1))); yaw = math.degrees(math.atan2(fw[1], fw[0]))
        if u < 0.6:
            worst_tilt = max(worst_tilt, tilt)
        r.append(f"{'stance' if u < 0.6 else 'swing'} tilt {tilt:4.1f} yaw {yaw:4.1f}")
    rows.append(r)
tbl = SL.table(rows, ["phase", "fore.L", "hind.R", "fore.L diag. partner: fore.R", "hind.L"])
# fold numbers at the 4 key poses
V0 = M0["V"]; F2 = M0["F"]
fold_rows = [("rest", f"{Q.flips(V0, F2)['min_adjacent_normal_dot']:.2f}", "")]
for ph in rig.WALK_KEYS:
    Mp, _ = R.walk_pose(ph); f = Q.flips(R.skin(V0, W, Mp), F2)
    fold_rows.append((f"walk key {ph:.2f}", f"{f['min_adjacent_normal_dot']:.2f}", f"{R.skin(V0, W, Mp)[:, 2].min():+.3f}"))
fold_tbl = SL.table(fold_rows, ["pose", "min adjacent normal dot (spec: > -0.2)", "lowest z"])
def img(p, w): return f"<img src='c4/{p}' width='{w}'>"
walk_side = "<div class='grid' style='grid-template-columns:repeat(4,380px)'>" + "".join(f"<div class='cell'>{img(f'clay-w{i}-side.png', 380)}<div class='cap'>phase {i}/8 side</div></div>" for i in range(8)) + "</div>"
walk_below = "<div class='grid' style='grid-template-columns:repeat(4,380px)'>" + "".join(f"<div class='cell'>{img(f'clay-w{i}-below.png', 380)}<div class='cap'>phase {i}/8 below</div></div>" for i in range(8)) + "</div>"
paws = "<div class='row'>" + "".join(f"<div class='cell'>{img(f'clay-w{i}-paw.png', 330)}<div class='cap'>fore.L paw, phase {i}/8</div></div>" for i in (0, 2, 4, 6)) + "</div>"
cmp_ = ("<div class='row'><div class='cell'><div class='cap'>master 304</div><img src='file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-304x312.png' width='304' style='background:#999'></div>"
        f"<div class='cell'><div class='cap'>this build, stand pose</div><img src='c4/stand-304.png' width='304'></div></div>")
body = ("<h1>Chunk 4: rig, stand pose and walk</h1><p>17 bones (root, pelvis, chest, neck, head, 3 per leg x 4), weights from the arc length (smoothstep within 0.6 r of each joint, the first leg rings follow the trunk 60 %). Skinning is linear blend (dual quaternions not used). "
        "The legs are two-link IK on foot targets: diagonal pairs, duty 0.6, lift 0.08 H, stride +-0.12 H (a larger stride tilts the sole over 10 degrees while the apexes are kept); the elbow, knee and wrist keep their rest bend side in all 32 samples per leg. The stand pose: head yaw 29.5 and roll -5 about the neck base, near fore paw 0.086 H ahead, far fore leg 0.64 H ahead (the house's 0.3 S).</p>"
        "<h2>Stand pose beside the master (form only)</h2>" + cmp_ + "<h2>Walk, 8 frames, side</h2>" + walk_side + "<h2>Walk, 8 frames, from below</h2>" + walk_below + "<h2>Paws close up</h2>" + paws +
        f"<h2>Paw orientation, 16 frames (worst stance tilt {worst_tilt:.1f} deg, limit 10)</h2>" + tbl + "<h2>Folds at the key poses</h2>" + fold_tbl)
p = os.path.join(OUT, "4-walk.html"); open(p, "w").write(SL.page("chunk 4", body)); SL.shoot(p, os.path.join(OUT, "4-walk.png"), 1600)
print("ok")
