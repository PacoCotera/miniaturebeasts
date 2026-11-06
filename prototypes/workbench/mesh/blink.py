"""The blink in Blender (Cycles), at rest, half and shut, the face at 3x in the stand pose: the lids are morph targets of the lid meshes.  python blink.py OUTDIR (bpy venv)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stop5 import *
import stop6
OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
H, sc, rep = build_full(2, os.path.join(OUT, "tex"))
sc.pose_stand(False)
stop6.shape_keys(sc, H)
sc.pose_stand(True)
B = sc.basis(); sc.aim_lights(B)
ex = sc.extents(B)
s304 = 288 / (ex["b1"] - ex["b0"])
face_pt = H.kc + H.Rh @ np.array([0.45, 0.12, -0.12])
sc.scene.cycles.samples = 64
for name, val in (("rest", 0), ("half", 0.5), ("shut", 1)):
    for lid, k in zip(sc.lids, ("blink.L", "blink.R")):
        lid.data.shape_keys.key_blocks[k].value = val
    sc.frame(B, 480, 400, s304 * 3.0, centre_pt=face_pt)
    sc.render(os.path.join(OUT, f"blink-{name}.png"))
