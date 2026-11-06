"""Stop 4, round 2: join B on all four legs, in clay (light), at the rest pose and with each leg swung 30 degrees forward and back. Renders to OUT/s4.
Run (bpy venv):  python stop4.py OUTDIR [A]   (A: the round-1 join A on the same legs, for the sheet's comparison)"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
from stop6 import set_world, about, reset_pose, Ry_
OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
joins = ["B"] + (["A"] if "A" in sys.argv[2:] else [])
res = {}
for join in joins:
    H = House("S01"); cages, rep = make_cages(H, join=join); sc = Scene(H, cages, rep, join=join)
    sc.set_clay((170, 160, 158)); sc.pose_stand(True)
    r = dict(fit=rep, mesh=None)
    sc.pose_stand(False); r["mesh"] = mesh_checks(sc); sc.pose_stand(True)
    sc.scene.cycles.samples = 48
    s304 = 110.0
    B = sc.basis(); sc.aim_lights(B)
    for lg in (l for l in H.legs if l["side"] == 1):
        tag = lg["name"].replace(".", "-")
        pt = lg["top"] + np.array([0.0, 0.0, -0.1])
        bone = "fore_upper.L" if lg["fore"] else "hind_upper.L"
        for name, a in (("rest", 0), ("fwd30", -30), ("back30", 30)):
            reset_pose(sc.rig); sc.pose_stand(True)
            if a:
                set_world(sc.rig.pose.bones[bone], about(lg["top"], Ry_(math.radians(a))))
            sc.frame(B, 340, 300, s304 * 3.0, centre_pt=pt); sc.render(os.path.join(OUT, f"{join}-{tag}-{name}.png"))
    reset_pose(sc.rig); sc.pose_stand(True)
    r["sprites"] = sc.stand_sprites(OUT, f"{join}-clay", sizes=(304, 96))
    res[join] = r
json.dump(res, open(os.path.join(OUT, "measures.json"), "w"), indent=1, default=float)
print({k: v["mesh"] for k, v in res.items()})
