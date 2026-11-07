"""8-pass1.png: the AD's ranked pass 1-4 and 6 (ad-gate-body-1.md): the 10 clay views of the bare base, the 3/4 beside the master with the outline numbers, back/side/front. Run (bpy venv): python sheet_c8.py OUTDIR"""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, rig, gates, outline, mquality as Q, subdiv as SD, sheetgen as SG, sheetlib as SL

OUT = os.path.abspath(sys.argv[1]); D = os.path.join(OUT, "c8"); os.makedirs(D, exist_ok=True)
b = build.make_body(upto="base", crown=False)
R = rig.Rig(b.ctx)
names = SG.turnaround(b, OUT, "c8", centre=(-0.8, 0, 1.0), pole_dots=False, pph=88.0, width=380, height=340)
M = views.level_mesh(b, 2)
Mp = dict(M, V=R.skin(M["V"], R.weights(M["V"], M["attr"]), R.stand_pose()))
sv = gates.stand_view(b, D, "stand", mesh=Mp, level=2)
a = sv[304]["alpha"]
right, top, er, et = outline.evaluate(a)
mr, mt = outline.master()
V, F, attr, fp = Q.full_topology(b)
Vf, Ff, _, _, cr, _ = b.full()
V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
cm = (np.abs(V2[:, 1]) < 0.03) & (V2[:, 0] > -1.4) & (V2[:, 0] < -0.5)
belly = float(V2[cm][:, 2].min())
runs = gates.leg_runs_275(a); mruns = gates.leg_runs_275(sv[304]["master_alpha"])
fl = Q.flips(V2, F2)
T = b.ctx["T"]
# the body numbers behind the gates: back peak, haunch and shoulder widths, head above the back from behind, head overhang
ss = np.linspace(T.ends[0] + 0.02, T.ends[1] - 0.02, 200)
top = T.point(ss, np.zeros_like(ss))
peak = float(top[:, 2].max()); peak_x = float(top[np.argmax(top[:, 2]), 0])
half = np.array([np.abs(T.point(np.full(30, s), np.linspace(0.2, 0.8, 30))[:, 1]).max() for s in ss])
hw = float(half.max()); hx = float(top[np.argmax(half), 0])
sh = float(np.abs(T.point(np.full(30, float(T.s_of_x(-0.22))), np.linspace(0.2, 0.8, 30))[:, 1]).max())
hv = V2[(V2[:, 2] > 1.15) & (V2[:, 0] > -0.75) & (V2[:, 0] < 0.65)]       # the head's region
head_w = float(np.abs(hv[:, 1]).max())
head_top = float(V2[:, 2].max())
def ok(v, lo, hi): return lo <= v <= hi
rows = [("back peak (AD 1.80-1.85 H)", f"{peak:.2f} H at x {peak_x:.2f}", ok(peak, 1.78, 1.87)),
        ("haunch width (AD 1.9-2.0 H)", f"{2 * hw:.2f} H at x {hx:.2f}", ok(2 * hw, 1.88, 2.02)),
        ("shoulder width (AD about 1.6 H)", f"{2 * sh:.2f} H", ok(2 * sh, 1.5, 1.7)),
        ("belly clear at the waist (AD 0.47 H)", f"{belly:.3f} H", abs(belly - 0.47) <= 0.04),
        ("head top above the back, from behind (AD <= 0.5 H)", f"{head_top - peak:.2f} H", head_top - peak <= 0.5),
        ("head overhang each side beyond the body (AD <= 0.1 H)", f"{max(0.0, head_w - hw):.2f} H (head half-width {head_w:.2f}, body {hw:.2f})", head_w - hw <= 0.1),
        ("level-2 fold, min adjacent normal dot (AD gate: > -0.2)", f"{fl['min_adjacent_normal_dot']:.2f}", fl["min_adjacent_normal_dot"] > -0.2),
        ("limit error (<= 0.004 H)", f"{b.ctx['log']['limit']['max_err']:.4f}", b.ctx["log"]["limit"]["max_err"] <= 0.004)]
ot = SL.table([("right edge x at y 160/200/240/275 (master 255/272/280/282)", str(right), str(er), SL.status(all(e is not None and abs(e) <= 8 for e in er))),
               ("top of the body y at x 200/220/240/260 (the gate; x 280 shown: master 131/135/145/166/240)", str(top_ := outline.read(a)[1]), str(et), SL.status(all(e is not None and abs(e) <= 8 for e in et[:4]))),
               ("leg runs at y 275 (master " + str(mruns) + ")", str(runs), "", "")], ["gate", "this build", "error px", ""])
tbl = SL.table([(r[0], r[1], SL.status(r[2])) for r in rows], ["body numbers", "measured", ""])
body = ("<h1>Pass 1: trunk, join, legs, face domes (AD gate 1, ranked 1-4 and 6)</h1><p>Bare base, clay, the stand pose. Back peak and the haunch are fitted to the AD's outline gates (a seeded random search over the torso's section numbers, <code>opt_pass.py</code>, against the 3/4 alpha at 304); "
        "the head's join, legs, lobe, nose and chin dome follow the AD's numbers. The stand pose's far fore leg is 0.15 H ahead. Tests that fail stay failing.</p>"
        "<h2>3/4 beside the master (outline numbers)</h2><div class='row'><div class='cell'><div class='cap'>master 304</div><img src='file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-304x312.png' width='304' style='background:#999'></div><div class='cell'><div class='cap'>this build 304 (clay, stand pose)</div><img src='c8/stand-304.png' width='304'></div>" + ot + "</div>"
        "<h2>10 clay views</h2>" + SG.grid("clay", "c8", names) + "<h2>Numbers</h2>" + tbl)
p = os.path.join(OUT, "8-pass1.html"); open(p, "w").write(SL.page("pass 1", body)); SL.shoot(p, os.path.join(OUT, "8-pass1.png"), 1960)
json.dump(dict(right=right, top=outline.read(a)[1], er=er, et=et, runs=runs, belly=belly, peak=peak, haunch=2 * hw, shoulder=2 * sh, folds=fl["min_adjacent_normal_dot"]), open(os.path.join(OUT, "8-pass1.json"), "w"), default=int)
print("ok", right, er, et)
