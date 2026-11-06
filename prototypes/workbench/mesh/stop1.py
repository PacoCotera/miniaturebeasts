"""Stop 1: head and torso in clay (the legs and paws are in too: they come from stop 2's builders). Renders to OUT/s1 and writes measures.json."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
import measures as M

OUT = os.path.abspath(sys.argv[1])
os.makedirs(OUT, exist_ok=True)
t0 = time.time()
H = House("S01")
cages, rep = make_cages(H)
sc = Scene(H, cages, rep)
res = dict(fit=rep, timings={})
sc.pose_stand(False)
res["mesh_rest"] = mesh_checks(sc)
sc.pose_stand(True)
res["chin_overhang"] = M.chin_overhang(sc)
res["eyes"] = M.eye_widths(sc)
res["sprites"] = {}
res["sprites"]["clay"] = sc.stand_sprites(OUT, "clay")                     # the body colour, no paint
sc.set_clay((170, 160, 158))
res["sprites"]["clayL"] = sc.stand_sprites(OUT, "clayL", sizes=(304,))     # a light clay, to read the form
res["framing"] = sc.last_framing
res["views"] = {}
for name, yaw, pit, w, h in (("side", 90, 0, 420, 330), ("front", 0, 0, 330, 400), ("back34", 215, 20, 420, 400)):
    sc.pose_stand(name == "back34" and False)
    res["views"][name] = view(sc, os.path.join(OUT, f"view-{name}.png"), yaw, pit, w, h)
# the face at 3/4 in the stand pose, 3x: the head only
sc.pose_stand(True)
B = sc.basis(); sc.aim_lights(B)
kc = H.kc
sc.scene.cycles.samples = 64
sc.frame(B, 480, 400, res["framing"]["s304"] * 3.0, centre_pt=kc + H.Rh @ np.array([0.45, 0.12, -0.12]))
res["views"]["face3x"] = sc.render(os.path.join(OUT, "face3x.png"))
res["timings"]["total_s"] = time.time() - t0
json.dump(res, open(os.path.join(OUT, "measures.json"), "w"), indent=1, default=float)
print(json.dumps({k: res[k] for k in ("chin_overhang", "mesh_rest")}, default=float), "eyes ratio", res["eyes"]["ratio"], "total", res["timings"])
