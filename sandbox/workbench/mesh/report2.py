"""Round 2: writes loika/round2/report.json and loika/index.html (round 1's index and viewer are kept as index-round1.html and viewer-round1.html).  python report2.py WORKDIR LOIKA_DIR CODE_COMMIT"""
import json, os, sys, hashlib, shutil
W, L, commit = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3]
R2 = os.path.join(L, "round2"); sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
if not os.path.exists(os.path.join(L, "index-round1.html")):
    t = open(os.path.join(L, "index.html")).read().replace("href='viewer.html'", "href='viewer-round1.html'")
    open(os.path.join(L, "index-round1.html"), "w").write(t); shutil.move(os.path.join(L, "viewer.html"), os.path.join(L, "viewer-round1.html"))
shutil.copy(os.path.join(W, "s6", "viewer.html"), os.path.join(L, "viewer.html")); shutil.copy(os.path.join(W, "s6", "loika.glb"), os.path.join(R2, "loika.glb"))
s5 = json.load(open(os.path.join(W, "s5", "measures.json"))); ma = json.load(open(os.path.join(W, "measures-all.json"))); s6 = json.load(open(os.path.join(W, "s6", "rig-report.json")))
rep = dict(house_commit="3f8dfb8fd (build/genome-foundation), unchanged", mesh_code_commit=commit, blender="5.2.3 LTS (bpy module)", light_measures=s5["light"], sprite_measures=ma,
           rig=s6, hashes=dict(sprites={k: v["sha"] for k, v in s5["sprites"].items()}, glb=sha(os.path.join(R2, "loika.glb")), velvet={f: sha(os.path.join(W, "velvet", f)) for f in ("loika-304.png", "loika-96.png", "loika-48.png")}),
           timings_s=dict(whole_build_6_sprites_3_crops=13.1, velvet_build=19.3, rig_clips_glb=round(s6["total_s"], 2), joins_sheet_build=6.1),
           identical_across_two_runs=True,
           items={"1 roll": "done: the SDF's sign; head front y 157.5 (155-165); eye line -5.8 deg, the SDF's own -5.4 (not tuned)", "3 light": "done: shade over lit 0.57 on the flank; cause was the glossy lobe reflecting the grey fill on the dark body",
                  "4 colour": "done: cream L* 80.4 b* 19.8, body b* +1.1; the fill is the house's warm light-field tint", "5 shadow": "done: composited from a clean mask, no catcher; glb cream and ink as vertex fields thresholded in the viewer (residual zigzag at 3x zoom)",
                  "6 blink": "done: lids of their own raised to shut the socket, a three.js frame at 2x", "7 eyes": "done: far/near ring 0.65, sunk 0.09 H in real sockets, unlit, crescent 68.3 (crescent strength 1.7x the house's), body 19.6, concentric",
                  "8 paws": "done: three round cream beans from the house's toes, no grey band", "11 smile": "done: a line of 2.6 px at 304, 1.7 px at 96, 1 px at 48", "12 nose": "partly: a coat highlight, +0.9 L* over the muzzle (house rule >= -5; master +9.2)",
                  "13 legs": "not done: not changed; join B on all four legs gives the thicker shoulder mass", "join B": "done on all four legs, three graded bridge loops, no gap at +-30 degrees; a faint crease remains at the port's front edge", "velvet": "done on the sprite build only, 7-skin"},
           deviations=["crescent strength 1.7x and radial window (0.1, 0.7) in the eye texture: the house formula alone renders L* about 53 (the SDF's own sprite)", "eye discs are 1.9 R_eye wide with an opaque dark collar so the socket shows nothing but the disc",
                       "the blink is carried by lid meshes with their own morph targets (blink.L, blink.R), not by the skin", "floor shadow reach 0.75 (house 1.1)", "toe beans are separate embedded ellipsoids at the house's toe places",
                       "velvet: one flow direction for the creature, not the lookdev's per-bone field", "light measures are taken on the flank (leg weight < 0.05, x > 150 px), on points the camera sees", "key scale 1.45, fill ratio parameter 0.60"])
json.dump(rep, open(os.path.join(R2, "report.json"), "w"), indent=1, default=float)
rows = [("8-round2", "Round 2", "master, SDF, round 1, round 2 at 304, 96 and 48 (also on dark glass); the numbers; the light measures with their sample points; face, blink, paws and the four joins"),
        ("7-skin", "Round 2, last stop", "the velvet skin (look 1b) beside the flat build at 304, 96 and 48")]
li = "".join(f"<tr><td>{s}</td><td><a href='round2/{n}.html'>{n}</a> (<a href='round2/{n}.png'>image</a>)</td><td>{d}</td></tr>" for n, s, d in rows)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Loika, the mesh, round 2</title><style>body{{font-family:'DejaVu Sans',sans-serif;font-size:16px;margin:24px;background:#f4f3f0;color:#222}}td,th{{border:1px solid #ccc;padding:5px 10px;text-align:left}}table{{border-collapse:collapse;background:#fff}}a{{color:#1c5fb8}}h1{{font-size:24px}}</style></head><body>
<h1>Loika whole, in the Blender pipeline: round 2</h1><p>Round 2 fixes the mesh's own faults named by the art director's gate (the head's shape stays the house's). Pinned house commit 3f8dfb8fd; code on build/mesh-creature in <code>prototypes/workbench/mesh/</code> ({commit}).</p>
<p><a href='viewer.html'><b>viewer.html</b></a>: the round 2 glb in three.js (orbit; breathe, blink, walk). <a href='round2/loika.glb'>round2/loika.glb</a> ({os.path.getsize(os.path.join(R2, 'loika.glb')) // 1024} KB). <a href='round2/report.json'>round2/report.json</a>.</p>
<table><tr><th>Sheet</th><th>Page</th><th>What it shows</th></tr>{li}</table>
<p><b>Round 1 is kept:</b> <a href='index-round1.html'>index-round1.html</a>, <a href='viewer-round1.html'>viewer-round1.html</a>, <a href='loika.glb'>loika.glb</a> and the sheets 0 to 6 in this folder.</p></body></html>"""
open(os.path.join(L, "index.html"), "w").write(html); print("ok")
