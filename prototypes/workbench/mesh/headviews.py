"""Round 3: the head from the front, the side and the three-quarter (the stand view), Cycles, flat paint, on a transparent film with the house's light. The front and the side are the head square
to the body (no yaw, roll or chin-up), seen along and across the creature; the three-quarter is the stand pose and camera. Eyes keep their stand-view gaze.
Run (bpy venv):  python headviews.py OUTDIR"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stop5 import *

if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    H, sc, rep = build_full(4, os.path.join(OUT, "tex"))
    B0 = sc.basis(); sc.aim_lights(B0)
    ex = sc.extents(B0); s304 = MASTER_ALPHA_H / (ex["b1"] - ex["b0"])
    sc.last_framing = dict(extents=ex, s304=s304, B=[b.tolist() for b in B0])
    centre = H.kc + np.array([0.12, 0.0, 0.18])
    res = {}
    def shot(name, yaw, pitch, posed):
        sc.pose_stand(posed)
        B = sc.basis(yaw, pitch); sc.aim_lights(B)
        sc.frame(B, 480, 420, s304 * 2.0, centre_pt=centre if posed else H.kc + np.array([0.12, 0.0, 0.12]))
        FN.repaint_ink(sc, H, s304 * 2.0)
        res[name] = FN.render_sprite(sc, os.path.join(OUT, name + ".png"), sc.floor, 64)
    shot("head-3q", H.pose["yawBody"], None, True)
    shot("head-front", 0.0, 0.0, False)
    shot("head-side", 90.0, 0.0, False)
    json.dump(dict(res, s=time.time() - t0), open(os.path.join(OUT, "headviews.json"), "w"))
    print("done", time.time() - t0)
