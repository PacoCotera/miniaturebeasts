import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, build, rig, render_skin as RS, skin as SK, measure_skin as MS
b = build.make_body(upto="base"); R = rig.Rig(b.ctx); Mp = R.stand_pose(); c = RS.aligned_centre(b, R, Mp, 304)
tgt = np.array([223, 196, 157.0]) / 255.0
for it in range(4):
    a, cam = RS.render_skin(b, R, Mp, "out/skin/tune.png", 304, centre=c, samples=24)
    m = MS.measure(a); cr = np.array(m.get("cream_rgb", [0, 0, 0])) / 255
    print(it, SK.CREAM_GAIN.round(3), SK.COAT_GAIN, m)
    # linear-light gain per channel
    f = lambda x: np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    SK.CREAM_GAIN = SK.CREAM_GAIN * (f(tgt) / f(cr))
    pass
print("final", SK.CREAM_GAIN.tolist(), SK.COAT_GAIN)
