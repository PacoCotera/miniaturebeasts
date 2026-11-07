"""Round 4: the blink at rest, half and shut in Blender: the whole creature at 304/96/48 and the face at 3x, and the outline difference between rest and shut (alpha at 304 and 96).
Run (bpy venv, from prototypes/workbench):  python mesh/blink4.py OUTDIR"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stop5 import *

if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    H, sc, rep = build_full(4, os.path.join(OUT, "tex"))
    sc.pose_stand(True)
    res = {}
    def setv(v):
        for lid, nm in zip(sc.lids, ("blink.L", "blink.R")):
            lid.data.shape_keys.key_blocks[nm].value = v
        bpy.context.view_layer.update()
    def rend(p, smp):
        FN.repaint_ink(sc, H, sc.cur_scale)
        return FN.render_sprite(sc, p, sc.floor, smp)
    for tag, v in (("rest", 0.0), ("half", 0.5), ("shut", 1.0)):
        setv(v)
        if tag == "rest":
            res["sprites"] = sc.stand_sprites(OUT, "blink-" + tag, renderer=rend)
            s304 = sc.last_framing["s304"]; fr = sc.last_framing
        else:
            sc.stand_sprites(OUT, "blink-" + tag, renderer=rend)        # same framing (the extents are of the rest mesh, the lids move inside the socket)
        B = sc.basis(); sc.aim_lights(B)
        face_pt = H.kc + H.Rh @ np.array([0.45, 0.12, -0.12])
        sc.frame(B, 480, 400, s304 * 3.0, centre_pt=face_pt)
        FN.repaint_ink(sc, H, s304 * 3.0)
        FN.render_sprite(sc, os.path.join(OUT, f"blink-{tag}-face3x.png"), sc.floor, 64)
    res["s"] = time.time() - t0
    json.dump(res, open(os.path.join(OUT, "blink.json"), "w"), indent=1, default=float)
    print("done", res["s"])
