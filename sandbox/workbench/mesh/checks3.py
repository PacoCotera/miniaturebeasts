"""Round 3 checks on the mesh (bpy venv): fit residuals, quads / shells / manifold / mirror, eye widths on the stand pose, chin overhang, the leg field, the frozen-dome equality to the SDF, and the
head's measures on the sprite. python checks3.py OUT.json"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests"))
from build import *
import measures as MS
from test_blender import subsurf_eval
from housefield import uround

if __name__ == "__main__":
    t0 = time.time()
    H = House("S01")
    cages, rep = make_cages(H, join="B", beans=False)
    sc = Scene(H, cages, rep, join="B")
    sc.pose_stand(False)
    chk = mesh_checks(sc)                      # at rest: the stand pose turns and rolls the head, which is not a mirror error
    sc.pose_stand(True)
    out = dict(fit_residual_H=rep, mesh_level2=chk, eye_widths=MS.eye_widths(sc), chin_overhang_H=MS.chin_overhang(sc))
    V, faces, _ = cages[1].full()
    P = subsurf_eval(V, faces, 3, limit=True)
    d = H.dTorso(P)
    for lg in H.legs:
        d = uround(d, lg["d_column"](P), H.uB)
    legs = {}
    for lg in H.legs:
        m = (np.hypot(P[:, 0] - lg["cx"], P[:, 1] - lg["y"]) < 0.3) & (P[:, 2] < lg["top"][2] - 0.1) & (P[:, 2] > 0.1)
        legs[lg["name"]] = dict(points=int(m.sum()), mean_signed_H=float(d[m].mean()), share_deeper_than_0_04=float((d[m] < -0.04).mean()), min_H=float(d[m].min()))
    out["leg_field"] = legs
    out["head_dome"] = dict(W=H.W, D=H.D, K=H.K, rear_exponent=H.house["kinds"]["head"][H.kinds["head"]]["rear-exponent"], eye_centres_apart_H=2 * H.g["yE"], roll_sign=H.solver["roll-sign"], rollSigned=H.pose["rollSigned"],
                            S=H.S, hs=H.fp["hs"], jaw=dict(c=H.J["c"].tolist(), r=list(H.J["r"])))
    out["s"] = time.time() - t0
    json.dump(out, open(sys.argv[1], "w"), indent=1, default=float)
    print(json.dumps({k: out[k] for k in ("mesh_level2", "eye_widths", "chin_overhang_H")}, default=float))
