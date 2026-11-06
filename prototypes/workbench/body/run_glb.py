import sys, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, build, rig, subdiv as SD, gltf_out
def make(path, upto="base"):
    b = build.make_body(upto=upto)
    R = rig.Rig(b.ctx)
    V, F, attr, fp, cr, mir = b.full()
    V2, F2, _, attr2, _ = SD.subdivide(V, F, cr, attr, fp, levels=2)
    return gltf_out.build_glb(b, R, V2, F2, attr2, path)
if __name__ == "__main__":
    r = make(sys.argv[1]); print(r["bytes"], hashlib.sha256(open(sys.argv[1], "rb").read()).hexdigest()[:12])
