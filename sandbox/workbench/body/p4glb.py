"""After every pass 4 step: the final glb and viewer (build stamp in the viewer label and asset.extras.build) and pass4/now-304.png (the house view, plush, the framing of pass 3). Prints the welded vertex count. Under the bpy venv: python p4glb.py"""
import os, sys, subprocess, shutil, time
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import numpy as np
import s20indiv as IN, s20p3 as P3, s20p2 as P2, s20tex as TX
from p4step import PASS4
BUILD = os.path.dirname(PASS4)
t0 = time.time()
r = subprocess.run([sys.executable, os.path.join(here, "run_s20_export.py"), BUILD, "1", "1"], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-500:])
c, b, R = IN.make(1)
os.makedirs(PASS4, exist_ok=True)
sub = os.path.join(here, "out", "p4", "now")
os.makedirs(sub, exist_ok=True)
out, tex, paths = P3.plush_views(b, R, c, sub, sizes=(304,), samples=64)
shutil.copy(out[304], os.path.join(PASS4, "now-304.png"))
print("now-304 written; %.0f s" % (time.time() - t0))
