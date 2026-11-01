"""Writes the type specimen's s20.glb (level 3, coat colours, glow, blink frames, skin, clips) and viewer.html beside it. Under the bpy venv: python run_s20_export.py [OUTDIR]"""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20indiv as IN, s20render as RN, s20glb

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"
os.makedirs(OUT, exist_ok=True)
c, b, R = IN.make(1)
g = c["coat"]
P = RN.prepare(b, g, level=3)
Ph, Pc = RN.prepare(b, g, level=3, frame="half"), RN.prepare(b, g, level=3, frame="closed")
glb = os.path.join(OUT, "s20.glb")
r = s20glb.build(b, R, P, glb, frames=dict(half=Ph["col"], closed=Pc["col"]), extras=dict(digest=GN.digest(c)))
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "viewer_s20.py"), glb, os.path.join(OUT, "viewer.html")], check=True)
print("glb", r["bytes"], "bytes; clips", r["clips"])
