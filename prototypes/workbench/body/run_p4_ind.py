"""One individual of the twelve, plush stand pose, pass 4: az 32 at 304 and 96 and 48 px, az 90 and az 180 at 304 (own process: python run_p4_ind.py I OUTDIR). Under the bpy venv."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20indiv as IN, s20tex as TX, s20pipe as PP, s20p2 as P2, s20render as RN, s20genes as GN, s20sil as SL

i = int(sys.argv[1]); out = os.path.abspath(sys.argv[2])
sub = os.path.join(out, f"ind{i:02d}")
os.makedirs(sub, exist_ok=True)
t0 = time.time()
c, b, R = IN.make(i)
tex = PP.make_tex(b, c["coat"], frames=("open",))
paths = P2.write_tex(tex, os.path.join(sub, "tex"))
M = P2.posed(TX.render_mesh(b), b, R, R.stand_pose())
cen = (-0.35, 0, 1.3)
views = dict(a304=(304, 312, 95.0, 32.0, 10.0, cen, 48), a96=(96, 88, 30.0, 32.0, 10.0, cen, 64), a48=(48, 48, 15.0, 32.0, 10.0, (-0.35, 0, 1.25), 64),
             az90=(304, 312, 95.0, 90.0, 8.0, cen, 48), az180=(304, 312, 95.0, 180.0, 8.0, cen, 48))
for nm, (w, h, ppH, az, el, ce, smp) in views.items():
    p = os.path.join(sub, nm + ".png")
    a, cam = RN.render_tex(M, paths, c["coat"], p, w, h, ppH, az=az, el=el, centre=ce, samples=smp)
    RN.to_png(a, p)
import shutil
shutil.rmtree(os.path.join(sub, "tex"), ignore_errors=True)
json.dump(dict(creature=c, digest=GN.digest(c), loud=GN.loud_genes(GN.draw(i)), seconds=time.time() - t0), open(os.path.join(sub, "creature.json"), "w"), sort_keys=True)
print(i, "done", round(time.time() - t0))
