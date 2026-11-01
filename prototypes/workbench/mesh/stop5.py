"""Stop 5: the face and the paint: eye discs, smile ink, nose, cream (baked at level 3 on the rest pose), beans, leaves, the house's light, floor shadow. Renders to OUT/s5."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
import finish as FN

def build_full(level=3, tex_dir=None):
    H = House("S01"); cages, rep = make_cages(H); sc = Scene(H, cages, rep)
    sc.tex_dir = tex_dir
    FN.add_crest_bones(sc, H)
    sc.leaves = FN.new_leaf_object(sc, H)
    sc.final = FN.bake(sc, H, level)
    sc.eyes = FN.add_eyes(sc, H, sc.final)
    sc.floor = FN.shadow_plane(sc, H)
    return H, sc, rep

if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    H, sc, rep = build_full(4, os.path.join(OUT, "tex"))
    res = dict(bake=sc.bake_info, build_s=time.time() - t0)
    sc.pose_stand(True)
    sc.set_light_strength(1.1, 0.58)    # the house's shade ratio; lit 1.1 keeps the cream from clipping: see the sheet for the five measures
    rend = lambda p, smp: FN.render_sprite(sc, p, sc.floor, smp)
    res["sprites"] = sc.stand_sprites(OUT, "loika", renderer=rend)
    s304 = sc.last_framing["s304"]
    B = sc.basis(); sc.aim_lights(B)
    res["framing"] = sc.last_framing
    face_pt = H.kc + H.Rh @ np.array([0.45, 0.12, -0.12])
    for name, pt, z, (w, h) in (("face3x", face_pt, 3.0, (480, 400)), ("cream4x", H.kc + H.Rh @ np.array([0.5, 0.0, -0.35]) + np.array([0, 0, -0.1]), 4.0, (420, 380))):
        sc.frame(B, w, h, s304 * z, centre_pt=pt)
        res[name] = FN.render_sprite(sc, os.path.join(OUT, name + ".png"), sc.floor, 64)
    res["light"], res["points"] = FN.light_measures(sc, H, os.path.join(OUT, "loika-304.png"), sc.final, sc.eyes)
    json.dump(res, open(os.path.join(OUT, "measures.json"), "w"), indent=1, default=float)
    print("done", time.time() - t0, res["bake"]); print(json.dumps(res["light"], default=float))
