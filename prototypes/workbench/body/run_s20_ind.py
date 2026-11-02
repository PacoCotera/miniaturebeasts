"""One individual of the twelve, rendered textured in the stand pose at 304 and 96 and at the house angle 3/4 and back, into OUTDIR/ind<i>/ (own process: python run_s20_ind.py I OUTDIR). Under the bpy venv."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20indiv as IN, s20tex as TX, s20pipe as PP, s20p2 as P2, s20render as RN, s20genes as GN

i = int(sys.argv[1]); out = os.path.abspath(sys.argv[2])
sub = os.path.join(out, f"ind{i:02d}")
os.makedirs(sub, exist_ok=True)
t0 = time.time()
c, b, R = IN.make(i)
tex = PP.make_tex(b, c["coat"], frames=("open",))
paths = P2.write_tex(tex, os.path.join(sub, "tex"))
M = P2.posed(TX.render_mesh(b, 2), b, R, R.stand_pose())
for nm, (w, h, ppH, az, el, cen) in dict(a304=(304, 312, 95.0, 57.5, 10.0, (-0.35, 0, 1.3)), a96=(96, 88, 30.0, 57.5, 10.0, (-0.35, 0, 1.3)), back=(304, 312, 95.0, 160.0, 10.0, (-0.35, 0, 1.3)), front=(304, 312, 95.0, 0.0, 8.0, (-0.35, 0, 1.3))).items():
    a, cam = RN.render_tex(M, paths, c["coat"], os.path.join(sub, nm + ".png"), w, h, ppH, az=az, el=el, centre=cen, samples=48 if w > 100 else 64)
    RN.to_png(a, os.path.join(sub, nm + ".png"))
json.dump(dict(creature=c, digest=GN.digest(c), seconds=time.time() - t0), open(os.path.join(sub, "creature.json"), "w"), sort_keys=True)
print(i, "done", round(time.time() - t0))
