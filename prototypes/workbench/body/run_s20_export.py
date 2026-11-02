"""Writes the type specimen's s20.glb (level 2, smooth normals, UVs, the baked atlas, glow, blink patches, skin, clips) and viewer.html beside it. Under the bpy venv: python run_s20_export.py [OUTDIR] [INDIVIDUAL] [LEVEL]"""
import sys, os, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20indiv as IN, s20tex as TX, s20pipe as PP, s20glb

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"
IND = int(sys.argv[2]) if len(sys.argv) > 2 else 1
LEVEL = int(sys.argv[3]) if len(sys.argv) > 3 else 1
os.makedirs(OUT, exist_ok=True)
t0 = time.time()
c, b, R = IN.make(IND)
tex = PP.make_tex(b, c["coat"])
M = TX.render_mesh(b, LEVEL)
glb = os.path.join(OUT, "s20.glb")
import datetime, zoneinfo
now = datetime.datetime.now(zoneinfo.ZoneInfo("America/Mexico_City"))
repo = os.path.dirname(os.path.abspath(__file__))
commit = subprocess.run(["git", "-C", repo, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
dirty = subprocess.run(["git", "-C", repo, "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True).stdout.strip() != ""
stamp = f"built {now.strftime('%a')} {now.day} {now.strftime('%b %H:%M')} Mexico City \u00b7 {commit}{'+wip' if dirty else ''}"
r = s20glb.build(b, R, M, tex, glb, extras=dict(digest=GN.digest(c), level=LEVEL, build=stamp))
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "viewer_s20.py"), glb, os.path.join(OUT, "viewer.html")], check=True)
print("glb", r["bytes"], "bytes;", r["verts"], "vertices;", r["tris"], "triangles; clips", r["clips"], "; %.0f s" % (time.time() - t0))
