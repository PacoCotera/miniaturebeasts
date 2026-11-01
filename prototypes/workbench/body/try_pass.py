import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, build, rig, gates, views, outline, mquality as Q, subdiv as SD
b = build.make_body(upto="base", crown=False)
R = rig.Rig(b.ctx)
M = views.level_mesh(b, 2)
Mp = dict(M, V=R.skin(M["V"], R.weights(M["V"], M["attr"]), R.stand_pose()))
sv = gates.stand_view(b, "out/pass", "p", mesh=Mp, level=2)
right, top, er, et = outline.evaluate(sv[304]["alpha"])
print("master", outline.master())
print("right", right, er); print("top", top, et)
V, F, _, fp = Q.full_topology(b)
Vf, Ff, attr, fpp, cr, _ = b.full(); V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fpp, levels=2)
cm = (np.abs(V2[:, 1]) < 0.03) & (V2[:, 0] > -0.95) & (V2[:, 0] < -0.5)
low = (V2[:, 2] < 0.06) & (V2[:, 1] > 0.1)
print("limit", round(b.ctx["log"]["limit"]["max_err"], 4), "belly", round(float(V2[cm][:, 2].min()), 3), "gap", round(float(V2[low & (V2[:, 0] > -0.7)][:, 0].min() - V2[low & (V2[:, 0] < -0.7)][:, 0].max()), 3), "folds", round(Q.flips(V2, F2)["min_adjacent_normal_dot"], 2))
print("runs275 mine", gates.leg_runs_275(sv[304]["alpha"]), "master", gates.leg_runs_275(sv[304]["master_alpha"]))
import json
print("bbox mine", gates.bbox(sv[304]["alpha"]), "master", gates.bbox(sv[304]["master_alpha"]))
