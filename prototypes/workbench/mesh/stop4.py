"""Stop 4: join A beside join B on the near fore shoulder (clay, light). Renders to OUT/s4."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
from stop6 import set_world, about, reset_pose, Ry_
OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
res = {}
for join in ("A", "B"):
    H = House("S01"); cages, rep = make_cages(H, join=join); sc = Scene(H, cages, rep, join=join)
    sc.set_clay((170, 160, 158)); sc.pose_stand(True)
    r = dict(fit=rep, sprites=sc.stand_sprites(OUT, f"{join}-clay"))
    r["mesh"] = mesh_checks(sc)
    s304 = sc.last_framing["s304"]; B = sc.basis(); sc.aim_lights(B); sc.scene.cycles.samples = 64
    lg = next(l for l in H.legs if l["name"] == "fore.L")
    pt = lg["top"] + np.array([0.0, 0.0, -0.1])
    sc.frame(B, 420, 380, s304 * 4.0, centre_pt=pt); sc.render(os.path.join(OUT, f"{join}-shoulder4x.png"))
    # the leg swung 20 degrees forward and back: the shoulder must keep its mass and its outline
    for tag, a in (("fwd", -20), ("back", 20)):
        reset_pose(sc.rig); sc.pose_stand(True)
        set_world(sc.rig.pose.bones["fore_upper.L"], about(lg["top"], Ry_(math.radians(a))))
        sc.frame(B, 420, 380, s304 * 4.0, centre_pt=pt); sc.render(os.path.join(OUT, f"{join}-shoulder4x-{tag}.png"))
    reset_pose(sc.rig); sc.pose_stand(True)
    # the shoulder from the side and the front, head square (the join's whole outline)
    sc.pose_stand(False)
    for name, yaw in (("side", 90), ("front", 20)):
        Bv = sc.basis(yaw, 0); sc.aim_lights(Bv)
        sc.frame(Bv, 420, 380, s304 * 3.0, centre_pt=lg["top"] + np.array([0, 0, -0.05]))
        sc.render(os.path.join(OUT, f"{join}-shoulder-{name}.png"))
    sc.pose_stand(True)
    if join == "A":                                  # the jaw and throat (A only: B's jaw is not built), front and three-quarter
        for name, yaw in (("front", 8), ("34", 45)):
            Bv = sc.basis(yaw, 8); sc.aim_lights(Bv)
            sc.frame(Bv, 420, 380, s304 * 3.5, centre_pt=H.kc + H.Rh @ np.array([0.3, 0, -0.45]))
            sc.render(os.path.join(OUT, f"A-jaw-{name}.png"))
    res[join] = r
json.dump(res, open(os.path.join(OUT, "measures.json"), "w"), indent=1, default=float)
print({k: v["mesh"] for k, v in res.items()})
