"""Round 5, the turnaround (a standing deliverable): the creature at rest (the stand pose) from 8 azimuths 45 degrees apart at the sprite's elevation, straight above and straight below, at the 304 sprite's scale,
in Blender (Cycles, the house's light). Azimuth 0 is the front (the creature's +x), 90 its left side, 180 its back, 270 its right side. Also the mesh-quality numbers of the same build.
Run (bpy venv):  python turnaround.py OUTDIR"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stop5 import *
import quality

VIEWS = [(f"az{a:03d}", float(a), None) for a in range(0, 360, 45)] + [("top", 0.0, 89.0), ("bottom", 0.0, -89.0)]

if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    H, sc, rep = build_full(4, os.path.join(OUT, "tex"))
    B0 = sc.basis(); sc.aim_lights(B0)
    ex0 = sc.extents(B0); s304 = MASTER_ALPHA_H / (ex0["b1"] - ex0["b0"])
    sc.last_framing = dict(extents=ex0, s304=s304, B=[b.tolist() for b in B0])
    sc.pose_stand(True)
    res = {"s304": s304}
    W, Ht = 380, 340
    for name, yaw, pit in VIEWS:
        t1 = time.time()
        # top and bottom: the head toward the top of the picture (the front of the creature is +x)
        B = sc.basis(yaw if pit is None else (180.0 if pit > 0 else 0.0), pit)
        sc.aim_lights(B)
        ex = sc.extents(B)
        if pit is None:
            sc.frame(B, W, Ht, s304, cx=(ex["a0"] + ex["a1"]) / 2, bottom=ex["b0"], feet_row=Ht - 22)
        else:
            sc.frame(B, W, Ht, s304, centre_pt=np.array([-0.45, 0.0, 0.8]))
        FN.repaint_ink(sc, H, s304)
        res[name] = dict(sha=FN.render_sprite(sc, os.path.join(OUT, f"ta-{name}.png"), sc.floor, 64), s=time.time() - t1)
    q = quality.quality(sc, H)
    res["quality"] = q
    res["total_s"] = time.time() - t0
    json.dump(res, open(os.path.join(OUT, "turnaround.json"), "w"), indent=1, default=float)
    print("done", res["total_s"])
