"""Round 4: writes loika/round4/report.json, copies the glb, and writes loika/index.html and viewer.html for round 4 (rounds 1 to 3 are kept: index-round3.html, viewer-round3.html and the earlier pairs).
python report4.py WORKDIR LOIKA_DIR CODE_COMMIT"""
import json, os, sys, hashlib, shutil, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
from measure import measure
from tjsmeasure import tjs_measure
W, L, commit = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3]
R4 = os.path.join(L, "round4"); sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
if not os.path.exists(os.path.join(L, "index-round3.html")):
    t = open(os.path.join(L, "index.html")).read().replace("href='viewer.html'", "href='viewer-round3.html'")
    open(os.path.join(L, "index-round3.html"), "w").write(t); shutil.move(os.path.join(L, "viewer.html"), os.path.join(L, "viewer-round3.html"))
shutil.copy(os.path.join(W, "s6", "viewer.html"), os.path.join(L, "viewer.html")); shutil.copy(os.path.join(W, "s6", "loika.glb"), os.path.join(R4, "loika.glb"))
s5 = json.load(open(os.path.join(W, "s5", "measures.json"))); s6 = json.load(open(os.path.join(W, "s6", "rig-report.json")))
tm = lambda f: float(re.search(r"([\d.]+) s", open(os.path.join(W, f)).read()).group(1))
rep = dict(house_commit="b3e1e9a3e (build/genome-foundation, fix round 8), merged into build/mesh-creature as 94b03248c with no conflict", mesh_code_commit=commit, blender="5.2.3 LTS (bpy module)",
           light_measures=s5["light"], sprite_measures=measure(os.path.join(W, "s5", "loika-304.png")), threejs_rest=tjs_measure(os.path.join(W, "s6", "tjs-rest.png")), rig=s6,
           hashes=dict(sprites={k: v["sha"] for k, v in s5["sprites"].items()}, glb=sha(os.path.join(R4, "loika.glb"))),
           timings_s=dict(whole_build_3_sprites_3_crops=tm("t-stop5.txt"), rig_clips_glb_level3=tm("t-stop6.txt"), blink_three_states_x_4_views=tm("t-blink.txt")),
           identical_across_two_runs=True, key_scale=2.1, fill_ratio=0.23, cream_tune=[1.12, 1.12, 1.0], shadow_cut=0.14, lid_lift_H=0.009, torso_stations=21)
json.dump(rep, open(os.path.join(R4, "report.json"), "w"), indent=1, default=float)
rows = [("11-round4", "Round 4", "master, SDF fix 8, round 3 and round 4 at 304, 96 and 48; the numbers; the light measures; the glb's match in three.js; the lower face's numbers; the face at 3x of 304 and 96 at 6x"),
        ("12-blink", "Round 4, the blink", "rest, half and shut in Blender and in three.js; the outline difference")]
li = "".join(f"<tr><td>{s}</td><td><a href='round4/{n}.html'>{n}</a> (<a href='round4/{n}.png'>image</a>)</td><td>{d}</td></tr>" for n, s, d in rows)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Loika, the mesh, round 4</title><style>body{{font-family:'DejaVu Sans',sans-serif;font-size:16px;margin:24px;background:#f4f3f0;color:#222}}td,th{{border:1px solid #ccc;padding:5px 10px;text-align:left}}table{{border-collapse:collapse;background:#fff}}a{{color:#1c5fb8}}h1{{font-size:24px}}</style></head><body>
<h1>Loika whole, in the Blender pipeline: round 4</h1><p>Round 4 takes fix 8's lower face, body numbers, far leg and centre leaf from the house (b3e1e9a3e) by name, rebuilds the blink lid as a shell in the socket, and sets the mesh's value and colour against the master. Code on build/mesh-creature in <code>prototypes/workbench/mesh/</code> ({commit}).</p>
<p><a href='viewer.html'><b>viewer.html</b></a>: the round 4 glb in three.js (orbit; breathe, blink, walk). <a href='round4/loika.glb'>round4/loika.glb</a> ({os.path.getsize(os.path.join(R4, 'loika.glb')) // 1024} KB). <a href='round4/report.json'>round4/report.json</a>.</p>
<table><tr><th>Sheet</th><th>Page</th><th>What it shows</th></tr>{li}</table>
<p><b>Rounds 1 to 3 are kept:</b> round 3: <a href='index-round3.html'>index-round3.html</a>, <a href='viewer-round3.html'>viewer-round3.html</a>, <a href='round3/loika.glb'>round3/loika.glb</a>, sheets in <code>round3/</code>. Round 2: <a href='index-round2.html'>index-round2.html</a>, <a href='viewer-round2.html'>viewer-round2.html</a>, <a href='round2/loika.glb'>round2/loika.glb</a>. Round 1: <a href='index-round1.html'>index-round1.html</a>, <a href='viewer-round1.html'>viewer-round1.html</a>, <a href='loika.glb'>loika.glb</a> and the sheets 0 to 6 in this folder.</p></body></html>"""
open(os.path.join(L, "index.html"), "w").write(html); print("ok")
