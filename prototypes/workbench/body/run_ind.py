"""One individual in its own process: python run_ind.py I OUTDIR -> prints sha256 of creature.json, loika glb and the 304 pixels, and the stage timings (json)."""
import sys, os, json, time, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import genes, individuals, rig, subdiv as SD, gltf_out, gates
i, out = int(sys.argv[1]), sys.argv[2]
os.makedirs(out, exist_ok=True)
c = genes.creature(genes.draw(i))
cj = os.path.join(out, f"creature-{i}.json")
open(cj, "w").write(genes.dumps(c))
b, R, o = individuals.render_individual(c, out, f"ind{i}", sizes=(304,))
V, F, attr, fp, cr, mir = b.full()
V2, F2, _, attr2, _ = SD.subdivide(V, F, cr, attr, fp, levels=2)
t0 = time.time()
gp = os.path.join(out, f"loika-{i}.glb")
gltf_out.build_glb(b, R, V2, F2, attr2, gp, extras=dict(digest=o["digest"]))
a = gates.load_rgba(o["files"][304])
print(json.dumps(dict(creature=hashlib.sha256(open(cj, "rb").read()).hexdigest(), glb=hashlib.sha256(open(gp, "rb").read()).hexdigest(), px=hashlib.sha256(a.tobytes()).hexdigest(), t_build=o["t_build"], t_render=o["t_render"][304], t_glb=time.time() - t0)))
