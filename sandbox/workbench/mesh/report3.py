"""Round 3: writes loika/round3/report.json, copies the glb, and writes loika/index.html and viewer.html for round 3 (round 2's pair is kept as index-round2.html and viewer-round2.html; round 1's stay).
python report3.py WORKDIR LOIKA_DIR CODE_COMMIT"""
import json, os, sys, hashlib, shutil, re
W, L, commit = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3]
R3 = os.path.join(L, "round3"); sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
if not os.path.exists(os.path.join(L, "index-round2.html")):
    t = open(os.path.join(L, "index.html")).read().replace("href='viewer.html'", "href='viewer-round2.html'")
    open(os.path.join(L, "index-round2.html"), "w").write(t); shutil.move(os.path.join(L, "viewer.html"), os.path.join(L, "viewer-round2.html"))
shutil.copy(os.path.join(W, "s6", "viewer.html"), os.path.join(L, "viewer.html")); shutil.copy(os.path.join(W, "s6", "loika.glb"), os.path.join(R3, "loika.glb"))
s5 = json.load(open(os.path.join(W, "s5", "measures.json"))); ma = json.load(open(os.path.join(W, "measures-all.json"))); s6 = json.load(open(os.path.join(W, "s6", "rig-report.json"))); ck = json.load(open(os.path.join(W, "checks.json")))
tm = lambda f: float(re.search(r"([\d.]+) s", open(os.path.join(W, f)).read()).group(1))
rep = dict(house_commit="fc80e5312 (build/genome-foundation), merged into build/mesh-creature as 1c5d88392", mesh_code_commit=commit, blender="5.2.3 LTS (bpy module)",
           light_measures=s5["light"], sprite_measures=ma, checks=ck, rig=s6,
           hashes=dict(sprites={k: v["sha"] for k, v in s5["sprites"].items()}, glb=sha(os.path.join(R3, "loika.glb"))),
           timings_s=dict(whole_build_3_sprites_3_crops=tm("t-stop5.txt"), rig_clips_glb_level3=tm("t-stop6.txt"), head_views_3=tm("t-heads.txt"), glb_export=round(s6["glb"]["export_s"], 2)),
           identical_across_two_runs=True,
           items={"1 rebase, the house head": "done: merge of fc80e5312 (no conflict outside mesh/); housefield.py re-ported (rear exponent, jaw, crown rise, roll sign, nose-fit clamp), equal to the SDF to 1e-9 (frozen dome tests to 1e-6)",
                  "2 visor rim, snout block": "done: gone with the round dome; the muzzle is the house's low lobe on the dome, the far eye on the outline",
                  "3 cheek slab, smile wings": "done as the SDF reads them: cream edge ported from fix 7 (one curve from the corner, near/far fall), the ink a 2.6 px line; a dark sliver where the eye disc's outer annulus came through the cheek is fixed",
                  "4 legs": "done: the evaluated surface lies on the house's leg field (mean +0.002 H, round 2 -0.006); the deepest sags are hidden",
                  "5 leaves": "done: albedo the house's olive, median L* 47.0 against the master's 46.7; shape the SDF's own thin ellipsoid (round 2 drew blunt sausages)",
                  "6 nose": "done: +9.8 L* over the lit muzzle (master +9.2), one soft spot",
                  "7 glb cream edge": "done: level 3 and the gates carried as linear margins; no stair on the belly edge; the cream edge's scallop under the smile is the house's own curve",
                  "open: head's forward-most point": "not done and not the mesh's: the muzzle lobe and chin are the jaw placeholder (fix round 8)"},
           deviations=["the head cage's chin row is 0.05 H under the smile and its collar row 0.05 H under that (the jaw mass hangs the chin lower than round 2's chart allowed)", "cage fitted to the house head with the crown's rise (H.dh), not the SDF's dHead0",
                       "eye discs: the outer annulus past 1.25 R_eye is buried along a ramp (0.5 R_eye per R_eye squared)", "leg cage fitted 0.012 H outside the house's leg field (the limit sag)", "key scale 1.8, fill ratio parameter 0.50 (round 2: 1.45, 0.60)",
                       "nose: skin material, soft clear coat 0.15 (roughness 0.5)", "leaf albedo x0.68, roughness 0.3", "unlit ring warmed (0.98, 0.95, 0.86) so the rendered ring reads the master's L* 86, b* 19", "under-cheek cream where the head's lower cheek stands clear of the chest",
                       "glb baked at level 3 (round 2: level 2), 5.7 MB", "floor shadow reach 0.75 (house 1.1)", "velvet not rerun (sprite build is flat)"])
json.dump(rep, open(os.path.join(R3, "report.json"), "w"), indent=1, default=float)
rows = [("9-round3", "Round 3", "master, SDF fix 7, round 2 and round 3 at 304, 96 and 48 (also on dark glass); the numbers; the light measures with their sample points; the face, the lower face at 96, legs, leaves, nose"),
        ("10-head", "Round 3, the head", "the head three-quarter, front and side; the glb's face at rest and at the blink")]
li = "".join(f"<tr><td>{s}</td><td><a href='round3/{n}.html'>{n}</a> (<a href='round3/{n}.png'>image</a>)</td><td>{d}</td></tr>" for n, s, d in rows)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Loika, the mesh, round 3</title><style>body{{font-family:'DejaVu Sans',sans-serif;font-size:16px;margin:24px;background:#f4f3f0;color:#222}}td,th{{border:1px solid #ccc;padding:5px 10px;text-align:left}}table{{border-collapse:collapse;background:#fff}}a{{color:#1c5fb8}}h1{{font-size:24px}}</style></head><body>
<h1>Loika whole, in the Blender pipeline: round 3</h1><p>Round 3 puts the art director's frozen dome head (fc80e5312) on the mesh and fixes the mesh's own faults. The jaw, chin, muzzle, cream, smile and leaves are that commit's placeholders, read by name from the house file. Code on build/mesh-creature in <code>prototypes/workbench/mesh/</code> ({commit}).</p>
<p><a href='viewer.html'><b>viewer.html</b></a>: the round 3 glb in three.js (orbit; breathe, blink, walk). <a href='round3/loika.glb'>round3/loika.glb</a> ({os.path.getsize(os.path.join(R3, 'loika.glb')) // 1024} KB). <a href='round3/report.json'>round3/report.json</a>.</p>
<table><tr><th>Sheet</th><th>Page</th><th>What it shows</th></tr>{li}</table>
<p><b>Rounds 1 and 2 are kept:</b> round 2: <a href='index-round2.html'>index-round2.html</a>, <a href='viewer-round2.html'>viewer-round2.html</a>, <a href='round2/loika.glb'>round2/loika.glb</a>, sheets in <code>round2/</code>. Round 1: <a href='index-round1.html'>index-round1.html</a>, <a href='viewer-round1.html'>viewer-round1.html</a>, <a href='loika.glb'>loika.glb</a> and the sheets 0 to 6 in this folder.</p></body></html>"""
open(os.path.join(L, "index.html"), "w").write(html); print("ok")
