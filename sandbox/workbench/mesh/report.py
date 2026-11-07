"""Writes loika/report.json and loika/index.html from the stops' measures. Run with any python 3."""
import json, os, sys, subprocess, hashlib
W, L = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
J = lambda p: json.load(open(os.path.join(W, p)))
s1, s4, s5, s6 = J("s1/measures.json"), J("s4/measures.json"), J("s5/measures.json"), J("s6/rig-report.json")
sha = lambda p: hashlib.sha256(open(os.path.join(L, p), "rb").read()).hexdigest()[:16]
head = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()
rep = dict(house_commit="3f8dfb8fd (build/genome-foundation)", mesh_code_commit=head, blender="5.2.3 LTS (bpy module, Python 3.13)",
           fit_residual_H={k: v for k, v in s1["fit"].items()}, mesh_level2=s1["mesh_rest"], join_AB={k: v["mesh"] for k, v in s4.items()},
           eye_widths=s1["eyes"], chin_overhang_H=s1["chin_overhang"], light_measures=s5["light"], bake=s5["bake"], rig=s6,
           bean_height_H=0.224, clamp_delta="the SDF's two clamps move noseW by -1e-4 and gap by -9e-4 (H); the port does not apply them",
           hashes=dict(sprites={k: v["sha"] for k, v in s5["sprites"].items()}, glb=s6["glb"]["sha256"], pngs={f: sha(f) for f in sorted(os.listdir(L)) if f.endswith(".png")}),
           timings_s=dict(cages_and_fit=0.13, scene_and_checks=0.05, stop5_whole_build_with_6_sprites_and_2_crops=12.6, rig_clips_glb=s6["total_s"], viewer_page_load_ms="about 800 in headless Chromium"),
           deviations=["the design's eye window (+-0.6 R_eye) is smaller than the disc (R_eye): the socket is a dip under the pupil, the disc is a separate conforming mesh",
                       "rows: r0 at 0.44 (not 0.40) because the brow row is at 0.378; r4 is the eye bottom and nose centre, r5 the nose's lower edge (the design's r5 would sit 0.03 H from r6)",
                       "lead-paw (near fore paw 0.075 H ahead) is dropped: the Mirror makes the right fore paw the left's image",
                       "roll sign flipped from the SDF's so the far eye sits higher (design section 9); the SDF has it lower",
                       "eye discs carry a little emission (0.5) and the ring is painted at 0.88 of the house ivory so that the rendered iris and ring land in the house's L* bands",
                       "join B on the fore shoulder only; the jaw's B is not built (the head's collar ring lies inside the chest)",
                       "cream and ink are baked on the level-4 rest surface (sprites) and the level-2 surface (glb), not in a shader; the glb's cream edge has coarser steps",
                       "stops 1 and 2 were committed together; stop 4 was built after 6, in the order of the budget"])
json.dump(rep, open(os.path.join(L, "report.json"), "w"), indent=1, default=float)
rows = [("0-field", "Stop 0", "the house in Python: the field's sections and the house numbers"), ("1-head-torso", "Stop 1", "head and torso in clay in the stand view, beside the master and the SDF; numbers"),
        ("2-whole-clay-A", "Stops 2 and 3", "legs and paws in clay, join A; the kill-rule verdict"), ("4-joins-AB", "Stop 4", "join A beside join B on the near fore shoulder (the jaw's B is not built)"),
        ("5-loika-colour", "Stop 5", "the face and the paint in the house's light, beside the master; sample points for the five measures"), ("6-clips", "Stop 6", "three.js frames of rest, breathe, blink and walk from the glb")]
li = "".join(f"<tr><td>{s}</td><td><a href='{n}.html'>{n}.png</a> (<a href='{n}.png'>image</a>)</td><td>{d}</td></tr>" for n, s, d in rows)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Loika, the mesh</title><style>body{{font-family:'DejaVu Sans',sans-serif;font-size:16px;margin:24px;background:#f4f3f0;color:#222}}td,th{{border:1px solid #ccc;padding:5px 10px;text-align:left}}table{{border-collapse:collapse;background:#fff}}a{{color:#1c5fb8}}h1{{font-size:24px}}</style></head><body>
<h1>Loika whole, in the Blender pipeline</h1><p>The pinned house commit is 3f8dfb8fd; the code is on build/mesh-creature in <code>prototypes/workbench/mesh/</code>. Every sheet is an HTML page with its screenshot beside it.</p>
<p><a href='viewer.html'><b>viewer.html</b></a>: the glb in three.js, orbit controls, buttons for breathe, blink and walk (one self-contained file). <a href='loika.glb'>loika.glb</a> ({os.path.getsize(os.path.join(L, 'loika.glb')) // 1024} KB, 22 bones, level-2 geometry, morph targets breath, blink.L, blink.R). <a href='report.json'>report.json</a>: fits, checks, measures, hashes, timings and the list of deviations from the design.</p>
<table><tr><th>Stop</th><th>Sheet</th><th>What it shows</th></tr>{li}</table></body></html>"""
open(os.path.join(L, "index.html"), "w").write(html)
print("ok")
