import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, build, rig, render_skin as RS
b = build.make_body(upto="base")
R = rig.Rig(b.ctx)
Mp = R.stand_pose()
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for size in (304,):
    c = RS.aligned_centre(b, R, Mp, size)
    a, cam = RS.render_skin(b, R, Mp, os.path.join(out, f"skin-{size}.png"), size, centre=c, samples=32)
print("done")
