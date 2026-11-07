"""Stop 2: the whole creature in clay, join A (shells); the near fore paw and shoulder at 4x. Renders to OUT/s2."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
H = House("S01"); cages, rep = make_cages(H); sc = Scene(H, cages, rep)
sc.pose_stand(True)
res = dict(fit=rep, beans={}, sprites={})
res["sprites"]["clay"] = sc.stand_sprites(OUT, "clay")
s304 = sc.last_framing["s304"]
sc.set_clay((170, 160, 158))
res["sprites"]["clayL"] = sc.stand_sprites(OUT, "clayL", sizes=(304,))
B = sc.basis(); sc.aim_lights(B); sc.scene.cycles.samples = 64
lg = H.legs[0]
for name, pt in (("paw4x", lg["paw_c"] + np.array([0, 0, 0.05])), ("shoulder4x", lg["mass_c"])):
    sc.frame(B, 420, 380, s304 * 4.0, centre_pt=pt)
    res["sprites"][name] = sc.render(os.path.join(OUT, name + ".png"))
for c in cages:
    if c.name.startswith("paw"):
        res["beans"][c.name] = dict(bean_height=c.bean_height, faces=len(c.F))
res["mesh"] = mesh_checks(sc)
json.dump(res, open(os.path.join(OUT, "measures.json"), "w"), indent=1, default=float)
print(res["mesh"], res["beans"])
